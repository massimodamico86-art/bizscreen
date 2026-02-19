-- ============================================================================
-- Migration: 150_offline_detection_cron.sql
-- Phase 64: Telemetry Pipeline & Offline Detection
-- Plan 02: Automated offline detection and alert lifecycle
--
-- Provides:
-- 1. pg_cron extension for scheduled jobs
-- 2. evaluate_and_alert_offline_devices() -- cron-driven offline detector
-- 3. Extended update_device_status() with instant auto-resolve on heartbeat
-- 4. Cron schedule: every 2 minutes, 5-minute offline threshold
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE PG_CRON EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- PART 2: EVALUATE AND ALERT OFFLINE DEVICES FUNCTION
-- ============================================================================
-- Runs from pg_cron without auth context. SECURITY DEFINER with explicit
-- search_path. No auth.uid() references anywhere.
--
-- Two responsibilities:
--   (a) Detect stale devices -> mark offline -> raise/coalesce alerts
--   (b) Auto-resolve alerts for devices that have recovered
-- ============================================================================

CREATE OR REPLACE FUNCTION evaluate_and_alert_offline_devices(
  p_threshold_minutes INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_threshold INTERVAL;
  v_minutes_offline INTEGER;
  v_severity TEXT;
  v_raised INTEGER := 0;
  v_resolved INTEGER := 0;
BEGIN
  v_threshold := (p_threshold_minutes || ' minutes')::INTERVAL;

  -- -----------------------------------------------------------------------
  -- 2a. Detect and alert offline devices
  -- -----------------------------------------------------------------------
  -- Find devices currently marked online but with stale last_seen
  FOR v_device IN
    SELECT
      id,
      device_name,
      tenant_id,
      last_seen,
      EXTRACT(EPOCH FROM (NOW() - last_seen))::INTEGER / 60 AS mins_offline
    FROM tv_devices
    WHERE is_online = true
      AND last_seen < NOW() - v_threshold
  LOOP
    v_minutes_offline := v_device.mins_offline;

    -- Mark device offline
    UPDATE tv_devices
    SET is_online = false,
        updated_at = NOW()
    WHERE id = v_device.id;

    -- Determine severity based on offline duration
    -- info: < 15 min, warning: 15-59 min, critical: >= 60 min
    IF v_minutes_offline >= 60 THEN
      v_severity := 'critical';
    ELSIF v_minutes_offline >= 15 THEN
      v_severity := 'warning';
    ELSE
      v_severity := 'info';
    END IF;

    -- Insert alert with ON CONFLICT for deduplication/coalescing
    -- The idx_alerts_coalesce unique partial index covers:
    --   (tenant_id, type, COALESCE(device_id, nil_uuid), COALESCE(scene_id, nil_uuid),
    --    COALESCE(schedule_id, nil_uuid), COALESCE(data_source_id, nil_uuid))
    --   WHERE status = 'open'
    INSERT INTO alerts (
      tenant_id,
      type,
      severity,
      title,
      message,
      device_id,
      scene_id,
      schedule_id,
      data_source_id,
      meta
    ) VALUES (
      v_device.tenant_id,
      'device_offline',
      v_severity,
      'Device "' || COALESCE(v_device.device_name, 'Unknown') || '" is offline',
      'No heartbeat for ' || v_minutes_offline || ' minutes',
      v_device.id,
      NULL,
      NULL,
      NULL,
      jsonb_build_object(
        'device_name', COALESCE(v_device.device_name, 'Unknown'),
        'minutes_offline', v_minutes_offline,
        'last_heartbeat', v_device.last_seen,
        'detected_at', NOW()
      )
    )
    ON CONFLICT ON CONSTRAINT idx_alerts_coalesce
    DO UPDATE SET
      occurrences = alerts.occurrences + 1,
      last_occurred_at = NOW(),
      -- Escalate severity: keep whichever is higher (current or new)
      severity = CASE
        WHEN EXCLUDED.severity = 'critical' THEN 'critical'
        WHEN alerts.severity = 'critical' THEN 'critical'
        WHEN EXCLUDED.severity = 'warning' THEN 'warning'
        WHEN alerts.severity = 'warning' THEN 'warning'
        ELSE alerts.severity
      END,
      message = EXCLUDED.message,
      meta = alerts.meta || EXCLUDED.meta,
      updated_at = NOW();

    v_raised := v_raised + 1;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 2b. Auto-resolve alerts for recovered devices
  -- -----------------------------------------------------------------------
  -- Devices that are online and have fresh heartbeats should have their
  -- open/acknowledged device_offline alerts resolved.
  UPDATE alerts
  SET status = 'resolved',
      resolved_at = NOW(),
      resolution_notes = 'Auto-resolved: device resumed heartbeats',
      updated_at = NOW()
  WHERE type = 'device_offline'
    AND status IN ('open', 'acknowledged')
    AND device_id IN (
      SELECT id FROM tv_devices
      WHERE is_online = true
        AND last_seen >= NOW() - v_threshold
    );

  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  -- Return summary
  RETURN jsonb_build_object(
    'raised', v_raised,
    'resolved', v_resolved,
    'evaluated_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION evaluate_and_alert_offline_devices IS
  'Cron-driven function: detects stale devices, raises device_offline alerts with severity escalation, and auto-resolves alerts for recovered devices. Runs without auth context.';

-- Grant to service_role for direct invocation and pg_cron execution
GRANT EXECUTE ON FUNCTION evaluate_and_alert_offline_devices(INTEGER) TO service_role;

-- ============================================================================
-- PART 3: EXTEND update_device_status WITH INSTANT AUTO-RESOLVE
-- ============================================================================
-- Copies the full function body from migration 149 and adds auto-resolve
-- logic after the UPDATE tv_devices statement. This gives dual-path
-- resolution: instant on heartbeat (here) + periodic sweep (cron).
-- ============================================================================

-- Must DROP the existing signature before CREATE OR REPLACE to avoid
-- PostgreSQL overload conflict (same pattern as migration 149).
DROP FUNCTION IF EXISTS public.update_device_status(UUID, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.update_device_status(
  p_device_id UUID,
  p_player_version TEXT DEFAULT NULL,
  p_cached_content_hash TEXT DEFAULT NULL,
  p_metrics JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_needs_screenshot BOOLEAN;
  v_result JSONB;
BEGIN
  -- Update device status, store metrics, and get screenshot flag
  -- (preserved from migration 149)
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
  RETURNING needs_screenshot_update INTO v_needs_screenshot;

  IF NOT FOUND THEN
    -- Device doesn't exist, return null
    RETURN NULL;
  END IF;

  -- =====================================================================
  -- AUTO-RESOLVE: Instantly resolve any open device_offline alerts
  -- for this device on heartbeat resume. This is the fast path --
  -- the cron sweep (evaluate_and_alert_offline_devices) is the fallback.
  -- Cheap operation: indexed lookup by device_id + type + status.
  -- =====================================================================
  UPDATE alerts
  SET status = 'resolved',
      resolved_at = NOW(),
      resolution_notes = 'Auto-resolved: device resumed heartbeats',
      updated_at = NOW()
  WHERE device_id = p_device_id
    AND type = 'device_offline'
    AND status IN ('open', 'acknowledged');

  -- Build response with screenshot request if needed
  -- (preserved from migration 149)
  v_result := jsonb_build_object(
    'success', true,
    'timestamp', now(),
    'needs_screenshot_update', COALESCE(v_needs_screenshot, false)
  );

  RETURN v_result;
END;
$$;

-- Restore grants (same as migration 149)
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB) TO anon;

COMMENT ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB) IS
  'Called by player on heartbeat to update online status, cached content hash, device telemetry metrics, and auto-resolve any open device_offline alerts';

-- ============================================================================
-- PART 4: SCHEDULE THE CRON JOB
-- ============================================================================
-- Every 2 minutes, evaluate all devices with a 5-minute offline threshold.
-- Worst-case detection time: ~7 minutes. Typical: 5-6 minutes.
-- ============================================================================

SELECT cron.schedule(
  'evaluate-offline-devices',
  '*/2 * * * *',
  $$ SELECT evaluate_and_alert_offline_devices(5); $$
);

-- ============================================================================
-- DONE
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Migration 150 completed: Offline detection cron with dual-path alert resolution'; END $$;
