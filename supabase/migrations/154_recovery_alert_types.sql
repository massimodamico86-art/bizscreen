-- ============================================================================
-- Migration: 154_recovery_alert_types.sql
-- Phase 68: Alert Wiring & Notifications
-- Plan 01: Recovery alert types, heartbeat detection, notification trigger
--
-- Provides:
-- 1. Expanded alerts CHECK constraint with device_recovery, device_recovery_exhausted
-- 2. Extended update_device_status with recovery metric detection and auto-resolve
-- 3. Postgres trigger for auto-creating in-app notifications on alert insert
-- 4. Unique constraint on notifications to prevent duplicates
-- ============================================================================

-- ============================================================================
-- PART 1: EXPAND ALERTS CHECK CONSTRAINT
-- ============================================================================
-- Add device_recovery and device_recovery_exhausted to the valid alert types.

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;

ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN (
  'device_offline',
  'device_screenshot_failed',
  'device_cache_stale',
  'device_error',
  'device_recovery',
  'device_recovery_exhausted',
  'schedule_missing_scene',
  'schedule_conflict',
  'data_source_sync_failed',
  'social_feed_sync_failed',
  'content_expired',
  'storage_quota_warning',
  'api_rate_limit'
));

-- ============================================================================
-- PART 2: EXTEND update_device_status WITH RECOVERY ALERT DETECTION
-- ============================================================================
-- Copies the full function body from migration 153 (content verification),
-- adds recovery alert detection after the content verification section,
-- and auto-resolves recovery alerts when device metrics show no recovery state.
--
-- Recovery detection happens at the SQL level because the player may be in
-- a recovery loop doing hard reloads and cannot reliably make separate RPC calls.

DROP FUNCTION IF EXISTS public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.update_device_status(
  p_device_id UUID,
  p_player_version TEXT DEFAULT NULL,
  p_cached_content_hash TEXT DEFAULT NULL,
  p_metrics JSONB DEFAULT NULL,
  p_content_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_needs_screenshot BOOLEAN;
  v_needs_refresh BOOLEAN;
  v_expected_version TEXT;
  v_is_mismatch BOOLEAN;
  v_crash_count INTEGER := 0;
  v_recovery_phase TEXT;
  v_tenant_id UUID;
  v_device_name TEXT;
  v_result JSONB;
BEGIN
  -- Update device status, store metrics, and get screenshot/refresh flags
  UPDATE tv_devices
  SET
    is_online = true,
    last_seen = now(),
    player_version = COALESCE(p_player_version, player_version),
    cached_content_hash = COALESCE(p_cached_content_hash, cached_content_hash),
    device_metrics = COALESCE(p_metrics, device_metrics),
    metrics_updated_at = CASE WHEN p_metrics IS NOT NULL THEN now() ELSE metrics_updated_at END,
    updated_at = now()
  WHERE id = p_device_id
  RETURNING needs_screenshot_update, needs_refresh
  INTO v_needs_screenshot, v_needs_refresh;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- ========================================================================
  -- CONTENT VERSION COMPARISON (from migration 153)
  -- ========================================================================
  -- Compute expected content version using the content resolution priority chain.
  -- This mirrors get_resolved_player_content resolution order:
  --   Emergency > Campaign > Device Scene > Group Scene > Layout > Playlist
  -- IMPORTANT: Scene resolution produces the underlying content type (layout/playlist)
  -- with the scene's source (device_override/group_override), matching what the player
  -- receives from get_resolved_player_content.

  SELECT
    CASE
      -- Emergency override (highest priority)
      WHEN p.emergency_content_id IS NOT NULL
        AND (p.emergency_duration_minutes IS NULL
          OR p.emergency_started_at + (p.emergency_duration_minutes || ' minutes')::interval > NOW())
      THEN p.emergency_content_type || ':emergency:' || p.emergency_content_id

      -- Active campaign (via get_active_campaign_for_screen)
      WHEN ac.campaign_id IS NOT NULL
      THEN ac.content_type || ':campaign:' || ac.content_id || ':c' || ac.campaign_id

      -- Device scene override (resolves to layout or playlist via scene)
      WHEN d.active_scene_id IS NOT NULL AND ds.layout_id IS NOT NULL
      THEN 'layout:device_override:' || ds.layout_id
      WHEN d.active_scene_id IS NOT NULL AND ds.primary_playlist_id IS NOT NULL
      THEN 'playlist:device_override:' || ds.primary_playlist_id

      -- Group scene override (resolves to layout or playlist via scene)
      WHEN sg.active_scene_id IS NOT NULL AND gs.layout_id IS NOT NULL
      THEN 'layout:group_override:' || gs.layout_id
      WHEN sg.active_scene_id IS NOT NULL AND gs.primary_playlist_id IS NOT NULL
      THEN 'playlist:group_override:' || gs.primary_playlist_id

      -- Assigned layout
      WHEN d.assigned_layout_id IS NOT NULL
      THEN 'layout:assigned_layout:' || d.assigned_layout_id

      -- Assigned playlist
      WHEN d.assigned_playlist_id IS NOT NULL
      THEN 'playlist:assigned_playlist:' || d.assigned_playlist_id

      -- No content assigned
      ELSE NULL
    END
  INTO v_expected_version
  FROM tv_devices d
  LEFT JOIN profiles p ON p.id = d.tenant_id
  LEFT JOIN screen_groups sg ON sg.id = d.screen_group_id
  LEFT JOIN scenes ds ON ds.id = d.active_scene_id AND ds.is_active = true
  LEFT JOIN scenes gs ON gs.id = sg.active_scene_id AND gs.is_active = true
  LEFT JOIN LATERAL get_active_campaign_for_screen(d.id, NOW()) ac ON true
  WHERE d.id = p_device_id;

  -- Determine mismatch status
  v_is_mismatch := (
    p_content_version IS NOT NULL
    AND v_expected_version IS NOT NULL
    AND p_content_version != v_expected_version
  );

  -- Store verification state on the device row
  UPDATE tv_devices
  SET
    content_version_status = CASE
      -- Suppress mismatch during refresh window (needs_refresh = true means reload is queued)
      WHEN COALESCE(v_needs_refresh, false) THEN 'pending'
      -- Mismatch detected
      WHEN v_is_mismatch THEN 'mismatched'
      -- Versions match
      WHEN p_content_version IS NOT NULL AND v_expected_version IS NOT NULL THEN 'verified'
      -- No version reported by player
      ELSE 'unknown'
    END,
    content_verified_at = CASE
      WHEN NOT COALESCE(v_is_mismatch, true)
        AND p_content_version IS NOT NULL
        AND NOT COALESCE(v_needs_refresh, false)
      THEN NOW()
      ELSE content_verified_at
    END,
    content_mismatch_since = CASE
      WHEN v_is_mismatch AND NOT COALESCE(v_needs_refresh, false)
      THEN COALESCE(content_mismatch_since, NOW())
      WHEN NOT COALESCE(v_is_mismatch, true) THEN NULL
      ELSE content_mismatch_since
    END,
    expected_content_version = v_expected_version,
    reported_content_version = p_content_version
  WHERE id = p_device_id;

  -- =====================================================================
  -- AUTO-RESOLVE: Instantly resolve any open device_offline alerts
  -- for this device on heartbeat resume. This is the fast path --
  -- the cron sweep (evaluate_and_alert_offline_devices) is the fallback.
  -- Cheap operation: indexed lookup by device_id + type + status.
  -- (preserved from migration 150)
  -- =====================================================================
  UPDATE alerts
  SET status = 'resolved',
      resolved_at = NOW(),
      resolution_notes = 'Auto-resolved: device resumed heartbeats',
      updated_at = NOW()
  WHERE device_id = p_device_id
    AND type = 'device_offline'
    AND status IN ('open', 'acknowledged');

  -- =====================================================================
  -- RECOVERY ALERT DETECTION
  -- =====================================================================
  -- Detect recovery state from heartbeat metrics. Player reports
  -- recovery_crash_count > 0 when in active recovery (Phase 66).
  -- Detection happens at SQL level because player may be in a recovery
  -- loop doing hard reloads and cannot reliably make separate RPC calls.

  -- Get tenant_id and device_name for alert context
  SELECT tenant_id, name INTO v_tenant_id, v_device_name
  FROM tv_devices WHERE id = p_device_id;

  IF p_metrics IS NOT NULL
     AND (p_metrics->>'recovery_crash_count') IS NOT NULL
     AND (p_metrics->>'recovery_crash_count')::INTEGER > 0
  THEN
    v_crash_count := (p_metrics->>'recovery_crash_count')::INTEGER;
    v_recovery_phase := COALESCE(p_metrics->>'recovery_phase', 'unknown');

    IF v_crash_count >= 6 THEN
      -- Recovery exhausted: critical alert
      -- First resolve any open device_recovery alert (escalating to exhausted)
      UPDATE alerts
      SET status = 'resolved',
          resolved_at = NOW(),
          resolution_notes = 'Escalated to device_recovery_exhausted',
          updated_at = NOW()
      WHERE device_id = p_device_id
        AND type = 'device_recovery'
        AND status IN ('open', 'acknowledged');

      -- Raise device_recovery_exhausted (critical)
      INSERT INTO alerts (tenant_id, type, severity, title, message, device_id, meta)
      VALUES (
        v_tenant_id, 'device_recovery_exhausted', 'critical',
        'Device "' || COALESCE(v_device_name, 'Unknown') || '" recovery exhausted',
        'All 6 recovery attempts failed. Device showing static fallback.',
        p_device_id,
        jsonb_build_object(
          'device_name', COALESCE(v_device_name, 'Unknown'),
          'crash_count', v_crash_count,
          'recovery_phase', v_recovery_phase,
          'last_recovery_at', COALESCE(p_metrics->>'recovery_last_at', NOW()::TEXT)
        )
      )
      ON CONFLICT ON CONSTRAINT idx_alerts_coalesce
      DO UPDATE SET
        occurrences = alerts.occurrences + 1,
        last_occurred_at = NOW(),
        meta = alerts.meta || EXCLUDED.meta;
    ELSE
      -- Active recovery: severity based on crash count
      -- Count 1-2: info (soft reload, usually self-corrects)
      -- Count 3-5: warning (multiple reloads, real problem)
      INSERT INTO alerts (tenant_id, type, severity, title, message, device_id, meta)
      VALUES (
        v_tenant_id, 'device_recovery',
        CASE WHEN v_crash_count >= 3 THEN 'warning' ELSE 'info' END,
        'Device "' || COALESCE(v_device_name, 'Unknown') || '" is in recovery',
        'Recovery attempt ' || v_crash_count || '/6 (' || v_recovery_phase || ')',
        p_device_id,
        jsonb_build_object(
          'device_name', COALESCE(v_device_name, 'Unknown'),
          'crash_count', v_crash_count,
          'recovery_phase', v_recovery_phase,
          'last_recovery_at', COALESCE(p_metrics->>'recovery_last_at', NOW()::TEXT)
        )
      )
      ON CONFLICT ON CONSTRAINT idx_alerts_coalesce
      DO UPDATE SET
        occurrences = alerts.occurrences + 1,
        last_occurred_at = NOW(),
        severity = CASE WHEN (EXCLUDED.meta->>'crash_count')::INTEGER >= 3 THEN 'warning' ELSE alerts.severity END,
        meta = alerts.meta || EXCLUDED.meta;
    END IF;
  ELSE
    -- No recovery metrics (healthy device) -> auto-resolve any open recovery alerts
    -- IMPORTANT: Recovery metrics are ABSENT (not zero) when device is healthy.
    -- Phase 66 decision: "Recovery metrics only in heartbeat when crashCount > 0"
    UPDATE alerts
    SET status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = 'Auto-resolved: device recovered successfully',
        updated_at = NOW()
    WHERE device_id = p_device_id
      AND type IN ('device_recovery', 'device_recovery_exhausted')
      AND status IN ('open', 'acknowledged');
  END IF;

  -- Build response with all existing fields PLUS content verification and recovery fields
  v_result := jsonb_build_object(
    'success', true,
    'timestamp', now(),
    'needs_screenshot_update', COALESCE(v_needs_screenshot, false),
    'content_mismatch', CASE
      WHEN COALESCE(v_needs_refresh, false) THEN false
      ELSE COALESCE(v_is_mismatch, false)
    END,
    'expected_content_version', v_expected_version,
    'recovery_alert_raised', CASE WHEN v_crash_count > 0 THEN true ELSE false END
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission (updated signature)
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT) TO anon;

COMMENT ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT) IS
  'Called by player on heartbeat to update online status, cached content hash, device telemetry metrics, content version verification, and recovery alert detection. Returns content_mismatch flag, recovery_alert_raised flag. Auto-resolves device_offline and recovery alerts on condition clear.';

-- ============================================================================
-- PART 3: POSTGRES TRIGGER FOR AUTO-CREATING IN-APP NOTIFICATIONS
-- ============================================================================
-- This trigger fires on every new alert insertion and creates in-app
-- notifications for all eligible users in the tenant. This ensures that
-- ALL alerts (SQL cron, SQL heartbeat, JS raiseAlert) generate in-app
-- notifications without requiring the JS caller to explicitly dispatch.

CREATE OR REPLACE FUNCTION auto_create_alert_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_action_url TEXT;
BEGIN
  -- Determine action URL based on alert's related entity
  v_action_url := CASE
    WHEN NEW.device_id IS NOT NULL THEN '/screens?highlight=' || NEW.device_id::TEXT
    WHEN NEW.scene_id IS NOT NULL THEN '/scenes/' || NEW.scene_id::TEXT
    WHEN NEW.schedule_id IS NOT NULL THEN '/schedules/' || NEW.schedule_id::TEXT
    WHEN NEW.data_source_id IS NOT NULL THEN '/data-sources?highlight=' || NEW.data_source_id::TEXT
    ELSE '/alerts'
  END;

  -- Create in-app notification for each eligible user in the tenant
  FOR v_user IN
    SELECT p.id AS user_id
    FROM profiles p
    LEFT JOIN notification_preferences np
      ON np.user_id = p.id AND np.tenant_id = NEW.tenant_id
    WHERE p.tenant_id = NEW.tenant_id
      AND p.role IN ('owner', 'admin', 'editor')
      AND COALESCE(np.channel_in_app, true) = true
      AND (
        np.min_severity IS NULL
        OR CASE np.min_severity
            WHEN 'info' THEN TRUE
            WHEN 'warning' THEN NEW.severity IN ('warning', 'critical')
            WHEN 'critical' THEN NEW.severity = 'critical'
            ELSE TRUE
        END
      )
  LOOP
    INSERT INTO notifications (
      user_id, tenant_id, alert_id, channel,
      title, message, severity, alert_type, action_url
    )
    VALUES (
      v_user.user_id,
      NEW.tenant_id,
      NEW.id,
      'in_app',
      NEW.title,
      NEW.message,
      NEW.severity,
      NEW.type,
      v_action_url
    )
    ON CONFLICT ON CONSTRAINT notifications_unique_per_user_alert_channel
    DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_alert_notifications() IS
  'Trigger function: auto-creates in-app notifications for eligible tenant users when an alert is inserted. Respects notification_preferences for channel_in_app and min_severity filtering.';

CREATE TRIGGER trg_alert_auto_notify
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_alert_notifications();

-- ============================================================================
-- PART 4: UNIQUE CONSTRAINT TO PREVENT DUPLICATE NOTIFICATIONS
-- ============================================================================
-- Prevents duplicates when both the Postgres trigger and JS dispatch create
-- notifications. The JS path will harmlessly conflict (ON CONFLICT DO NOTHING
-- in the trigger, and error code 23505 handling in JS), and the trigger path
-- always succeeds first (runs synchronously on INSERT).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_unique_per_user_alert_channel'
  ) THEN
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_unique_per_user_alert_channel
    UNIQUE (user_id, alert_id, channel);
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Migration 154 completed: Recovery alert types, heartbeat recovery detection, notification trigger, unique constraint'; END $$;
