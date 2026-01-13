-- ============================================================================
-- Migration: 077_dynamic_data_sources.sql
-- Feature: Dynamic Data Sources + Menu / List Builder
-- Description: Adds tables for data sources, fields, and rows that can be
--              bound to text blocks in slides for dynamic content
-- ============================================================================

-- ============================================================================
-- DATA SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'internal_table' CHECK (type IN ('internal_table', 'csv_import')),
  csv_import_metadata JSONB, -- For CSV imports: original filename, import date, row count
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_sources IS 'Client-defined data sources for dynamic content binding (menus, price lists, schedules)';
COMMENT ON COLUMN data_sources.type IS 'Source type: internal_table (manually managed) or csv_import (uploaded CSV)';
COMMENT ON COLUMN data_sources.csv_import_metadata IS 'Metadata for CSV imports: {filename, importedAt, rowCount, columnMapping}';

-- Index for client lookups
CREATE INDEX IF NOT EXISTS idx_data_sources_tenant_id ON data_sources(tenant_id);

-- ============================================================================
-- DATA SOURCE FIELDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_source_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'currency', 'image_url', 'boolean', 'date')),
  order_index INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  format_options JSONB, -- For formatting: {currency: 'USD', decimals: 2, dateFormat: 'MM/DD/YYYY'}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data_source_id, name)
);

COMMENT ON TABLE data_source_fields IS 'Field definitions for data sources (columns)';
COMMENT ON COLUMN data_source_fields.name IS 'Machine-readable field name (used in bindings)';
COMMENT ON COLUMN data_source_fields.label IS 'Human-readable label for the UI';
COMMENT ON COLUMN data_source_fields.data_type IS 'Field type for rendering and formatting';
COMMENT ON COLUMN data_source_fields.format_options IS 'Type-specific formatting options';

-- Index for data source lookups
CREATE INDEX IF NOT EXISTS idx_data_source_fields_source_id ON data_source_fields(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_source_fields_order ON data_source_fields(data_source_id, order_index);

-- ============================================================================
-- DATA SOURCE ROWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_source_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  values JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_source_rows IS 'Row data for data sources';
COMMENT ON COLUMN data_source_rows.values IS 'Key-value pairs mapping field names to values';
COMMENT ON COLUMN data_source_rows.is_active IS 'Whether the row is active (for soft delete or toggling visibility)';

-- Indexes for data source lookups
CREATE INDEX IF NOT EXISTS idx_data_source_rows_source_id ON data_source_rows(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_source_rows_active ON data_source_rows(data_source_id, is_active);
CREATE INDEX IF NOT EXISTS idx_data_source_rows_order ON data_source_rows(data_source_id, order_index);

-- ============================================================================
-- RLS POLICIES (simplified to allow authenticated users)
-- ============================================================================

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_rows ENABLE ROW LEVEL SECURITY;

-- Data Sources Policies
CREATE POLICY "data_sources_select" ON data_sources FOR SELECT USING (true);
CREATE POLICY "data_sources_insert" ON data_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "data_sources_update" ON data_sources FOR UPDATE USING (true);
CREATE POLICY "data_sources_delete" ON data_sources FOR DELETE USING (true);

-- Data Source Fields Policies
CREATE POLICY "data_source_fields_select" ON data_source_fields FOR SELECT USING (true);
CREATE POLICY "data_source_fields_insert" ON data_source_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "data_source_fields_update" ON data_source_fields FOR UPDATE USING (true);
CREATE POLICY "data_source_fields_delete" ON data_source_fields FOR DELETE USING (true);

-- Data Source Rows Policies
CREATE POLICY "data_source_rows_select" ON data_source_rows FOR SELECT USING (true);
CREATE POLICY "data_source_rows_insert" ON data_source_rows FOR INSERT WITH CHECK (true);
CREATE POLICY "data_source_rows_update" ON data_source_rows FOR UPDATE USING (true);
CREATE POLICY "data_source_rows_delete" ON data_source_rows FOR DELETE USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get data source with fields and rows
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
  SELECT id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

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

COMMENT ON FUNCTION get_data_source_with_data IS 'Fetch a data source with its fields and active rows in a single call';

-- Function to resolve a data binding value
CREATE OR REPLACE FUNCTION resolve_data_binding(
  p_data_source_id UUID,
  p_field_name TEXT,
  p_row_index INTEGER DEFAULT 0
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result TEXT;
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check user has access
  SELECT id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RETURN NULL;
  END IF;

  -- Get the value from the specified row
  SELECT r.values->>p_field_name INTO v_result
  FROM data_source_rows r
  WHERE r.data_source_id = p_data_source_id
    AND r.is_active = true
  ORDER BY r.order_index
  LIMIT 1
  OFFSET p_row_index;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION resolve_data_binding IS 'Resolve a single data binding to its value';

-- Function to list data sources for current user's client
CREATE OR REPLACE FUNCTION list_data_sources()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  type TEXT,
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

COMMENT ON FUNCTION list_data_sources IS 'List all data sources accessible to the current user';

-- Function to import CSV data into a data source
CREATE OR REPLACE FUNCTION import_csv_to_data_source(
  p_data_source_id UUID,
  p_rows JSONB, -- Array of {values: {...}} objects
  p_replace_existing BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row JSONB;
  v_order_index INTEGER := 0;
  v_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  -- Get the data source's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM data_sources WHERE id = p_data_source_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Data source not found';
  END IF;

  -- Check user has access
  SELECT id INTO v_user_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_user_tenant_id != v_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- If replace, delete existing rows
  IF p_replace_existing THEN
    DELETE FROM data_source_rows WHERE data_source_id = p_data_source_id;
    v_order_index := 0;
  ELSE
    -- Get max order_index
    SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_index
    FROM data_source_rows
    WHERE data_source_id = p_data_source_id;
  END IF;

  -- Insert new rows
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO data_source_rows (data_source_id, values, order_index)
    VALUES (p_data_source_id, v_row->'values', v_order_index);

    v_order_index := v_order_index + 1;
    v_count := v_count + 1;
  END LOOP;

  -- Update data source metadata
  UPDATE data_sources
  SET
    updated_at = now(),
    csv_import_metadata = COALESCE(csv_import_metadata, '{}'::jsonb) || jsonb_build_object(
      'lastImportAt', now(),
      'lastImportRowCount', v_count
    )
  WHERE id = p_data_source_id;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION import_csv_to_data_source IS 'Bulk import rows into a data source from parsed CSV data';

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_data_source_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_data_sources_timestamp
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_data_source_timestamp();

CREATE TRIGGER update_data_source_fields_timestamp
  BEFORE UPDATE ON data_source_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_data_source_timestamp();

CREATE TRIGGER update_data_source_rows_timestamp
  BEFORE UPDATE ON data_source_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_data_source_timestamp();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON data_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_source_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_source_rows TO authenticated;

GRANT EXECUTE ON FUNCTION get_data_source_with_data TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_data_binding TO authenticated;
GRANT EXECUTE ON FUNCTION list_data_sources TO authenticated;
GRANT EXECUTE ON FUNCTION import_csv_to_data_source TO authenticated;
