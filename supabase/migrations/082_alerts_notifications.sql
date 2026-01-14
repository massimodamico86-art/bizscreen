-- ============================================================================
-- Phase 19: Alerts & Notifications System
-- ============================================================================
-- Provides:
-- 1. alerts table for tracking device/content issues
-- 2. notification_preferences table for user notification settings
-- 3. notifications table for in-app and email notifications
-- 4. Functions for alert management (raise, resolve, acknowledge)
-- ============================================================================

-- ============================================================================
-- ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    device_id UUID REFERENCES tv_devices(id) ON DELETE SET NULL,
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,

    -- Alert classification
    type TEXT NOT NULL CHECK (type IN (
        'device_offline',
        'device_screenshot_failed',
        'device_cache_stale',
        'device_error',
        'schedule_missing_scene',
        'schedule_conflict',
        'data_source_sync_failed',
        'social_feed_sync_failed',
        'content_expired',
        'storage_quota_warning',
        'api_rate_limit'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'warning',

    -- Alert content
    title TEXT NOT NULL,
    message TEXT,
    meta JSONB DEFAULT '{}'::jsonb,

    -- Occurrence tracking (for coalescing)
    first_occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurrences INTEGER NOT NULL DEFAULT 1,

    -- Status management
    status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')) DEFAULT 'open',
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status ON alerts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_severity ON alerts(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_type ON alerts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_scene ON alerts(scene_id) WHERE scene_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_last_occurred ON alerts(last_occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_open_by_tenant ON alerts(tenant_id, last_occurred_at DESC) WHERE status = 'open';

-- Composite index for finding duplicate alerts to coalesce
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_coalesce
ON alerts(tenant_id, type, COALESCE(device_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(scene_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(schedule_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(data_source_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE status = 'open';

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID,

    -- Channel preferences
    channel_email BOOLEAN NOT NULL DEFAULT true,
    channel_in_app BOOLEAN NOT NULL DEFAULT true,

    -- Severity filter
    min_severity TEXT NOT NULL CHECK (min_severity IN ('info', 'warning', 'critical')) DEFAULT 'warning',

    -- Type filters (null = all types)
    types_whitelist TEXT[],  -- If set, only these types
    types_blacklist TEXT[],  -- If set, exclude these types

    -- Quiet hours (optional)
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone TEXT DEFAULT 'UTC',

    -- Email digest preference
    email_digest_enabled BOOLEAN DEFAULT false,
    email_digest_frequency TEXT CHECK (email_digest_frequency IN ('daily', 'weekly')) DEFAULT 'daily',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant ON notification_preferences(tenant_id);

-- ============================================================================
-- NOTIFICATIONS TABLE (In-app and email tracking)
-- ============================================================================

-- Add missing columns to existing notifications table from migration 043
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT CHECK (channel IN ('in_app', 'email'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('info', 'warning', 'critical'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS alert_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_delivered_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_failed_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_error TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Set default for channel
UPDATE notifications SET channel = 'in_app' WHERE channel IS NULL;

-- Note: notifications table already exists from migration 043, columns added above

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_channel ON notifications(user_id, channel);
CREATE INDEX IF NOT EXISTS idx_notifications_alert ON notifications(alert_id) WHERE alert_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Alerts: Tenant-scoped access
CREATE POLICY "alerts_tenant_select" ON alerts
    FOR SELECT USING (true);

CREATE POLICY "alerts_tenant_insert" ON alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "alerts_tenant_update" ON alerts
    FOR UPDATE USING (true);

CREATE POLICY "alerts_service_role" ON alerts
    FOR ALL USING (true);

-- Notification preferences: User owns their preferences
CREATE POLICY "notification_prefs_user_select" ON notification_preferences
    FOR SELECT USING (true);

CREATE POLICY "notification_prefs_user_insert" ON notification_preferences
    FOR INSERT WITH CHECK (true);

CREATE POLICY "notification_prefs_user_update" ON notification_preferences
    FOR UPDATE USING (true);

CREATE POLICY "notification_prefs_user_delete" ON notification_preferences
    FOR DELETE USING (true);

-- Notifications: User owns their notifications
CREATE POLICY "notifications_user_select" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "notifications_user_update" ON notifications
    FOR UPDATE USING (true);

CREATE POLICY "notifications_service_insert" ON notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to raise or coalesce an alert
CREATE OR REPLACE FUNCTION raise_alert(
    p_tenant_id UUID,
    p_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT DEFAULT NULL,
    p_device_id UUID DEFAULT NULL,
    p_scene_id UUID DEFAULT NULL,
    p_schedule_id UUID DEFAULT NULL,
    p_data_source_id UUID DEFAULT NULL,
    p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert_id UUID;
    v_existing_id UUID;
BEGIN
    -- Check for existing open alert of same type and context
    SELECT id INTO v_existing_id
    FROM alerts
    WHERE tenant_id = p_tenant_id
      AND type = p_type
      AND status = 'open'
      AND COALESCE(device_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_device_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(scene_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_scene_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(schedule_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_schedule_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(data_source_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_data_source_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Coalesce: increment occurrences and update
        UPDATE alerts
        SET occurrences = occurrences + 1,
            last_occurred_at = NOW(),
            severity = CASE
                WHEN p_severity = 'critical' THEN 'critical'
                WHEN severity = 'critical' THEN 'critical'
                WHEN p_severity = 'warning' THEN 'warning'
                ELSE severity
            END,
            meta = meta || p_meta,
            message = COALESCE(p_message, message),
            updated_at = NOW()
        WHERE id = v_existing_id
        RETURNING id INTO v_alert_id;
    ELSE
        -- Create new alert
        INSERT INTO alerts (
            tenant_id, type, severity, title, message,
            device_id, scene_id, schedule_id, data_source_id, meta
        )
        VALUES (
            p_tenant_id, p_type, p_severity, p_title, p_message,
            p_device_id, p_scene_id, p_schedule_id, p_data_source_id, p_meta
        )
        RETURNING id INTO v_alert_id;
    END IF;

    RETURN v_alert_id;
END;
$$;

-- Function to acknowledge an alert
CREATE OR REPLACE FUNCTION acknowledge_alert(
    p_alert_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE alerts
    SET status = 'acknowledged',
        acknowledged_by = COALESCE(p_user_id, auth.uid()),
        acknowledged_at = NOW(),
        updated_at = NOW()
    WHERE id = p_alert_id
      AND status = 'open';

    RETURN FOUND;
END;
$$;

-- Function to resolve an alert
CREATE OR REPLACE FUNCTION resolve_alert(
    p_alert_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE alerts
    SET status = 'resolved',
        resolved_by = COALESCE(p_user_id, auth.uid()),
        resolved_at = NOW(),
        resolution_notes = p_resolution_notes,
        updated_at = NOW()
    WHERE id = p_alert_id
      AND status IN ('open', 'acknowledged');

    RETURN FOUND;
END;
$$;

-- Function to auto-resolve alerts when condition clears
CREATE OR REPLACE FUNCTION auto_resolve_alert(
    p_tenant_id UUID,
    p_type TEXT,
    p_device_id UUID DEFAULT NULL,
    p_scene_id UUID DEFAULT NULL,
    p_schedule_id UUID DEFAULT NULL,
    p_data_source_id UUID DEFAULT NULL,
    p_resolution_notes TEXT DEFAULT 'Auto-resolved: condition cleared'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE alerts
    SET status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = p_resolution_notes,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND type = p_type
      AND status IN ('open', 'acknowledged')
      AND COALESCE(device_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_device_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(scene_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_scene_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(schedule_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_schedule_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(data_source_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(p_data_source_id, '00000000-0000-0000-0000-000000000000'::uuid);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM notifications
    WHERE user_id = v_user_id
      AND channel = 'in_app'
      AND read_at IS NULL;

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_notification_ids UUID[] DEFAULT NULL,
    p_mark_all BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_mark_all THEN
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = auth.uid()
          AND channel = 'in_app'
          AND read_at IS NULL;
    ELSIF p_notification_ids IS NOT NULL THEN
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = auth.uid()
          AND id = ANY(p_notification_ids)
          AND read_at IS NULL;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to get users to notify for an alert
CREATE OR REPLACE FUNCTION get_users_to_notify(
    p_alert_id UUID
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    channel_email BOOLEAN,
    channel_in_app BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_alert_type TEXT;
    v_severity TEXT;
BEGIN
    -- Get alert details
    SELECT a.tenant_id, a.type, a.severity
    INTO v_tenant_id, v_alert_type, v_severity
    FROM alerts a
    WHERE a.id = p_alert_id;

    IF v_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- Return users with matching preferences
    RETURN QUERY
    SELECT
        p.id AS user_id,
        u.email,
        COALESCE(np.channel_email, true) AS channel_email,
        COALESCE(np.channel_in_app, true) AS channel_in_app
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN notification_preferences np ON np.user_id = p.id AND np.tenant_id = v_tenant_id
    WHERE p.tenant_id = v_tenant_id
      AND p.role IN ('owner', 'admin', 'editor')
      -- Check severity threshold
      AND (
          np.min_severity IS NULL
          OR CASE np.min_severity
              WHEN 'info' THEN TRUE
              WHEN 'warning' THEN v_severity IN ('warning', 'critical')
              WHEN 'critical' THEN v_severity = 'critical'
              ELSE TRUE
          END
      )
      -- Check whitelist
      AND (
          np.types_whitelist IS NULL
          OR v_alert_type = ANY(np.types_whitelist)
      )
      -- Check blacklist
      AND (
          np.types_blacklist IS NULL
          OR NOT (v_alert_type = ANY(np.types_blacklist))
      );
END;
$$;

-- Function to create in-app notification
CREATE OR REPLACE FUNCTION create_in_app_notification(
    p_user_id UUID,
    p_alert_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_alert RECORD;
BEGIN
    -- Get alert details
    SELECT * INTO v_alert FROM alerts WHERE id = p_alert_id;

    IF v_alert.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Create notification
    INSERT INTO notifications (
        user_id, tenant_id, alert_id, channel,
        title, message, severity, alert_type, action_url
    )
    VALUES (
        p_user_id, v_alert.tenant_id, p_alert_id, 'in_app',
        v_alert.title, v_alert.message, v_alert.severity, v_alert.type,
        CASE
            WHEN v_alert.device_id IS NOT NULL THEN '/screens?highlight=' || v_alert.device_id::text
            WHEN v_alert.scene_id IS NOT NULL THEN '/scenes/' || v_alert.scene_id::text
            WHEN v_alert.schedule_id IS NOT NULL THEN '/schedules/' || v_alert.schedule_id::text
            ELSE '/alerts'
        END
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_alerts_timestamp();

CREATE OR REPLACE FUNCTION update_notification_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_prefs_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_prefs_timestamp();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for alert summary by tenant
CREATE OR REPLACE VIEW alert_summary AS
SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical') AS critical_count,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'warning') AS warning_count,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'info') AS info_count,
    COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged_count,
    COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at > NOW() - INTERVAL '24 hours') AS resolved_24h_count,
    MAX(last_occurred_at) FILTER (WHERE status = 'open') AS latest_alert_at
FROM alerts
GROUP BY tenant_id;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT INSERT ON notifications TO service_role;

GRANT EXECUTE ON FUNCTION raise_alert TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION acknowledge_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_alert TO authenticated;
GRANT EXECUTE ON FUNCTION auto_resolve_alert TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_to_notify TO service_role;
GRANT EXECUTE ON FUNCTION create_in_app_notification TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE alerts IS 'System alerts for device, content, and sync issues';
COMMENT ON TABLE notification_preferences IS 'User preferences for alert notifications';
COMMENT ON TABLE notifications IS 'In-app and email notification tracking';
COMMENT ON FUNCTION raise_alert IS 'Raises a new alert or coalesces with existing open alert';
COMMENT ON FUNCTION acknowledge_alert IS 'Marks an alert as acknowledged';
COMMENT ON FUNCTION resolve_alert IS 'Marks an alert as resolved';
COMMENT ON FUNCTION auto_resolve_alert IS 'Auto-resolves alerts when condition clears';
