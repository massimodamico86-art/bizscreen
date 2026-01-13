-- ============================================================================
-- Migration: 078_realtime_data_feeds.sql
-- Feature: Real-Time Data Feeds for External Spreadsheets
-- Description: Adds support for syncing data sources with Google Sheets and
--              other external data sources with automatic updates
-- ============================================================================

-- ============================================================================
-- UPDATE DATA_SOURCES TABLE
-- Add integration columns for external data feeds
-- ============================================================================

-- Add integration columns to data_sources
ALTER TABLE data_sources
ADD COLUMN IF NOT EXISTS integration_type TEXT DEFAULT 'none'
  CHECK (integration_type IN ('none', 'google_sheets')),
ADD COLUMN IF NOT EXISTS integration_config JSONB,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT
  CHECK (last_sync_status IS NULL OR last_sync_status IN ('ok', 'error', 'no_change', 'pending')),
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

COMMENT ON COLUMN data_sources.integration_type IS 'Type of external integration: none (internal), google_sheets';
COMMENT ON COLUMN data_sources.integration_config IS 'Integration-specific config: {sheetId, range, pollIntervalMinutes}';
COMMENT ON COLUMN data_sources.last_sync_at IS 'Timestamp of last sync attempt';
COMMENT ON COLUMN data_sources.last_sync_status IS 'Status of last sync: ok, error, no_change, pending';
COMMENT ON COLUMN data_sources.last_sync_error IS 'Error message from last failed sync';

-- Update type constraint to include google_sheets
ALTER TABLE data_sources DROP CONSTRAINT IF EXISTS data_sources_type_check;
ALTER TABLE data_sources ADD CONSTRAINT data_sources_type_check
  CHECK (type IN ('internal_table', 'csv_import', 'google_sheets'));

-- Index for finding data sources due for sync
CREATE INDEX IF NOT EXISTS idx_data_sources_integration
  ON data_sources(integration_type, last_sync_at)
  WHERE integration_type != 'none';

-- ============================================================================
-- DATA SOURCE SYNC LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_source_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'no_change')),
  message TEXT,
  changed_rows INTEGER DEFAULT 0,
  added_rows INTEGER DEFAULT 0,
  removed_rows INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_source_sync_logs IS 'Log of sync operations for external data source integrations';
COMMENT ON COLUMN data_source_sync_logs.status IS 'Sync result: ok (changes applied), error (failed), no_change (no updates needed)';
COMMENT ON COLUMN data_source_sync_logs.changed_rows IS 'Total number of rows affected';
COMMENT ON COLUMN data_source_sync_logs.sync_duration_ms IS 'Duration of sync operation in milliseconds';

-- Indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_source_id ON data_source_sync_logs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON data_source_sync_logs(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON data_source_sync_logs(data_source_id, status);

-- ============================================================================
-- RLS POLICIES FOR SYNC LOGS
-- ============================================================================

ALTER TABLE data_source_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs_select"
  ON data_source_sync_logs FOR SELECT
  USING (
    data_source_id IN (
      SELECT id FROM data_sources WHERE tenant_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "sync_logs_insert"
  ON data_source_sync_logs FOR INSERT
  WITH CHECK (
    data_source_id IN (
      SELECT id FROM data_sources WHERE tenant_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "sync_logs_delete"
  ON data_source_sync_logs FOR DELETE
  USING (
    data_source_id IN (
      SELECT id FROM data_sources WHERE tenant_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Superadmin policy
CREATE POLICY "sync_logs_superadmin_all"
  ON data_source_sync_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update sync status and create log entry
CREATE OR REPLACE FUNCTION update_data_source_sync_status(
  p_data_source_id UUID,
  p_status TEXT,
  p_message TEXT DEFAULT NULL,
  p_changed_rows INTEGER DEFAULT 0,
  p_added_rows INTEGER DEFAULT 0,
  p_removed_rows INTEGER DEFAULT 0,
  p_updated_rows INTEGER DEFAULT 0,
  p_sync_duration_ms INTEGER DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Data source not found';
  END IF;

  -- Check user has access
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update data source sync status
  UPDATE data_sources
  SET
    last_sync_at = now(),
    last_sync_status = p_status,
    last_sync_error = CASE WHEN p_status = 'error' THEN p_error ELSE NULL END,
    updated_at = now()
  WHERE id = p_data_source_id;

  -- Create sync log entry
  INSERT INTO data_source_sync_logs (
    data_source_id,
    status,
    message,
    changed_rows,
    added_rows,
    removed_rows,
    updated_rows,
    sync_duration_ms
  ) VALUES (
    p_data_source_id,
    p_status,
    p_message,
    p_changed_rows,
    p_added_rows,
    p_removed_rows,
    p_updated_rows,
    p_sync_duration_ms
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION update_data_source_sync_status IS 'Update sync status and create a sync log entry';

-- Function to list data sources that need syncing
CREATE OR REPLACE FUNCTION list_data_sources_needing_sync()
RETURNS TABLE (
  id UUID,
  name TEXT,
  integration_type TEXT,
  integration_config JSONB,
  last_sync_at TIMESTAMPTZ,
  poll_interval_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.name,
    ds.integration_type,
    ds.integration_config,
    ds.last_sync_at,
    COALESCE((ds.integration_config->>'pollIntervalMinutes')::INTEGER, 5) as poll_interval_minutes
  FROM data_sources ds
  WHERE ds.integration_type != 'none'
    AND ds.integration_config IS NOT NULL
    AND (
      ds.last_sync_at IS NULL
      OR ds.last_sync_at + (
        COALESCE((ds.integration_config->>'pollIntervalMinutes')::INTEGER, 5) * INTERVAL '1 minute'
      ) < now()
    )
    AND ds.tenant_id IN (
      SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()
    )
  ORDER BY ds.last_sync_at NULLS FIRST;
END;
$$;

COMMENT ON FUNCTION list_data_sources_needing_sync IS 'List data sources with external integrations that are due for sync';

-- Function to get sync history for a data source
CREATE OR REPLACE FUNCTION get_data_source_sync_history(
  p_data_source_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  message TEXT,
  changed_rows INTEGER,
  added_rows INTEGER,
  removed_rows INTEGER,
  updated_rows INTEGER,
  sync_duration_ms INTEGER,
  synced_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Check user has access
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sl.id,
    sl.status,
    sl.message,
    sl.changed_rows,
    sl.added_rows,
    sl.removed_rows,
    sl.updated_rows,
    sl.sync_duration_ms,
    sl.synced_at
  FROM data_source_sync_logs sl
  WHERE sl.data_source_id = p_data_source_id
  ORDER BY sl.synced_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_data_source_sync_history IS 'Get sync history for a data source';

-- Function to link a data source to Google Sheets
CREATE OR REPLACE FUNCTION link_data_source_to_google_sheets(
  p_data_source_id UUID,
  p_sheet_id TEXT,
  p_range TEXT DEFAULT 'A1:Z1000',
  p_poll_interval_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Data source not found';
  END IF;

  -- Check user has access
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update data source with integration config
  UPDATE data_sources
  SET
    type = 'google_sheets',
    integration_type = 'google_sheets',
    integration_config = jsonb_build_object(
      'sheetId', p_sheet_id,
      'range', p_range,
      'pollIntervalMinutes', p_poll_interval_minutes
    ),
    last_sync_status = 'pending',
    updated_at = now()
  WHERE id = p_data_source_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION link_data_source_to_google_sheets IS 'Link a data source to a Google Sheet for automatic syncing';

-- Function to unlink external integration
CREATE OR REPLACE FUNCTION unlink_data_source_integration(p_data_source_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Data source not found';
  END IF;

  -- Check user has access
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Clear integration config
  UPDATE data_sources
  SET
    type = 'internal_table',
    integration_type = 'none',
    integration_config = NULL,
    last_sync_at = NULL,
    last_sync_status = NULL,
    last_sync_error = NULL,
    updated_at = now()
  WHERE id = p_data_source_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION unlink_data_source_integration IS 'Remove external integration from a data source';

-- Function to sync rows from external source (called after fetch)
CREATE OR REPLACE FUNCTION sync_data_source_rows(
  p_data_source_id UUID,
  p_new_rows JSONB,
  p_field_definitions JSONB DEFAULT NULL
)
RETURNS TABLE (
  added_count INTEGER,
  updated_count INTEGER,
  removed_count INTEGER,
  total_changed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_tenant_id UUID;
  v_old_row RECORD;
  v_new_row JSONB;
  v_added INTEGER := 0;
  v_updated INTEGER := 0;
  v_removed INTEGER := 0;
  v_order_index INTEGER := 0;
  v_field JSONB;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Data source not found';
  END IF;

  -- Check user has access
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update field definitions if provided
  IF p_field_definitions IS NOT NULL THEN
    -- Delete existing fields
    DELETE FROM data_source_fields WHERE data_source_id = p_data_source_id;

    -- Insert new fields
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_field_definitions)
    LOOP
      INSERT INTO data_source_fields (
        data_source_id,
        name,
        label,
        data_type,
        order_index
      ) VALUES (
        p_data_source_id,
        v_field->>'name',
        COALESCE(v_field->>'label', v_field->>'name'),
        COALESCE(v_field->>'dataType', 'text'),
        v_order_index
      );
      v_order_index := v_order_index + 1;
    END LOOP;
  END IF;

  -- Delete existing rows and insert new ones
  -- (For simplicity, we replace all rows on sync)
  SELECT COUNT(*) INTO v_removed
  FROM data_source_rows
  WHERE data_source_id = p_data_source_id;

  DELETE FROM data_source_rows WHERE data_source_id = p_data_source_id;

  -- Insert new rows
  v_order_index := 0;
  FOR v_new_row IN SELECT * FROM jsonb_array_elements(p_new_rows)
  LOOP
    INSERT INTO data_source_rows (
      data_source_id,
      values,
      order_index,
      is_active
    ) VALUES (
      p_data_source_id,
      COALESCE(v_new_row->'values', v_new_row),
      v_order_index,
      true
    );
    v_added := v_added + 1;
    v_order_index := v_order_index + 1;
  END LOOP;

  -- Update data source timestamp
  UPDATE data_sources
  SET updated_at = now()
  WHERE id = p_data_source_id;

  RETURN QUERY SELECT v_added, v_updated, v_removed, (v_added + v_updated + v_removed);
END;
$$;

COMMENT ON FUNCTION sync_data_source_rows IS 'Replace all rows in a data source with new data from external sync';

-- Update list_data_sources to include integration info
DROP FUNCTION IF EXISTS list_data_sources();
CREATE OR REPLACE FUNCTION list_data_sources()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  type TEXT,
  integration_type TEXT,
  integration_config JSONB,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  field_count BIGINT,
  row_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.name,
    ds.description,
    ds.type,
    ds.integration_type,
    ds.integration_config,
    ds.last_sync_at,
    ds.last_sync_status,
    (SELECT COUNT(*) FROM data_source_fields f WHERE f.data_source_id = ds.id) AS field_count,
    (SELECT COUNT(*) FROM data_source_rows r WHERE r.data_source_id = ds.id AND r.is_active = true) AS row_count,
    ds.created_at,
    ds.updated_at
  FROM data_sources ds
  WHERE ds.tenant_id IN (
    SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superadmin'
  )
  ORDER BY ds.name;
END;
$$;

-- Update get_data_source_with_data to include integration info
DROP FUNCTION IF EXISTS get_data_source_with_data(UUID);
CREATE OR REPLACE FUNCTION get_data_source_with_data(p_data_source_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check user has access
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RETURN NULL;
  END IF;

  -- Build the result
  SELECT jsonb_build_object(
    'id', ds.id,
    'name', ds.name,
    'description', ds.description,
    'type', ds.type,
    'integrationString', ds.integration_type,
    'integrationConfig', ds.integration_config,
    'lastSyncAt', ds.last_sync_at,
    'lastSyncStatus', ds.last_sync_status,
    'lastSyncError', ds.last_sync_error,
    'fields', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'label', f.label,
          'dataType', f.data_type,
          'orderIndex', f.order_index,
          'defaultValue', f.default_value,
          'formatOptions', f.format_options
        ) ORDER BY f.order_index
      )
      FROM data_source_fields f
      WHERE f.data_source_id = ds.id
    ), '[]'::jsonb),
    'rows', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'values', r.values,
          'orderIndex', r.order_index,
          'isActive', r.is_active
        ) ORDER BY r.order_index
      )
      FROM data_source_rows r
      WHERE r.data_source_id = ds.id AND r.is_active = true
    ), '[]'::jsonb),
    'createdAt', ds.created_at,
    'updatedAt', ds.updated_at
  ) INTO v_result
  FROM data_sources ds
  WHERE ds.id = p_data_source_id;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- REALTIME BROADCAST FUNCTION
-- ============================================================================

-- Function to notify clients of data source updates
CREATE OR REPLACE FUNCTION broadcast_data_source_update(p_data_source_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_data_source_name TEXT;
BEGIN
  -- Get data source info
  SELECT tenant_id, name INTO v_tenant_id, v_data_source_name
  FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Use pg_notify to broadcast the update
  -- Clients can subscribe to this channel via Supabase Realtime
  PERFORM pg_notify(
    'data_source_updates',
    json_build_object(
      'sourceId', p_data_source_id,
      'clientId', v_tenant_id,
      'name', v_data_source_name,
      'updatedAt', now()
    )::text
  );
END;
$$;

COMMENT ON FUNCTION broadcast_data_source_update IS 'Broadcast a data source update notification to subscribed clients';

-- Trigger to automatically broadcast updates when rows change
CREATE OR REPLACE FUNCTION trigger_data_source_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast update for the affected data source
  IF TG_OP = 'DELETE' THEN
    PERFORM broadcast_data_source_update(OLD.data_source_id);
    RETURN OLD;
  ELSE
    PERFORM broadcast_data_source_update(NEW.data_source_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on data_source_rows for automatic broadcasts
DROP TRIGGER IF EXISTS data_source_rows_change_trigger ON data_source_rows;
CREATE TRIGGER data_source_rows_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON data_source_rows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_data_source_row_change();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON data_source_sync_logs TO authenticated;

GRANT EXECUTE ON FUNCTION update_data_source_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION list_data_sources_needing_sync TO authenticated;
GRANT EXECUTE ON FUNCTION get_data_source_sync_history TO authenticated;
GRANT EXECUTE ON FUNCTION link_data_source_to_google_sheets TO authenticated;
GRANT EXECUTE ON FUNCTION unlink_data_source_integration TO authenticated;
GRANT EXECUTE ON FUNCTION sync_data_source_rows TO authenticated;
GRANT EXECUTE ON FUNCTION broadcast_data_source_update TO authenticated;

-- ============================================================================
-- CLEANUP OLD SYNC LOGS (optional maintenance)
-- ============================================================================

-- Function to clean up old sync logs (keep last 100 per data source)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  WITH ranked_logs AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY data_source_id ORDER BY synced_at DESC) as rn
    FROM data_source_sync_logs
  ),
  old_logs AS (
    SELECT id FROM ranked_logs WHERE rn > 100
  )
  DELETE FROM data_source_sync_logs
  WHERE id IN (SELECT id FROM old_logs);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_sync_logs IS 'Clean up old sync logs, keeping only the last 100 per data source';
