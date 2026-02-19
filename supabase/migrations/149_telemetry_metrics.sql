-- Migration: 149_telemetry_metrics.sql
-- Phase 64: Telemetry Pipeline & Offline Detection
-- Plan 01: Device metrics collection via heartbeat
--
-- Adds device_metrics JSONB column and metrics_updated_at to tv_devices,
-- extends update_device_status RPC to accept and store metrics payload.

-- ============================================================================
-- 1. ADD TELEMETRY COLUMNS TO TV_DEVICES
-- ============================================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS device_metrics JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tv_devices.device_metrics IS
  'Latest device telemetry snapshot (memory, storage, network) sent by player on each heartbeat';

COMMENT ON COLUMN public.tv_devices.metrics_updated_at IS
  'Timestamp when device_metrics was last updated by a heartbeat with metrics';

-- ============================================================================
-- 2. EXTEND update_device_status RPC WITH METRICS PARAMETER
-- ============================================================================
-- Adds p_metrics JSONB DEFAULT NULL parameter. Backward compatible: existing
-- callers that pass only (UUID, TEXT, TEXT) continue to work because the new
-- parameter has a default value.
--
-- Must DROP old signature first because adding a parameter with a default
-- creates a new overload that conflicts with the existing 3-arg version.

DROP FUNCTION IF EXISTS public.update_device_status(UUID, TEXT, TEXT);

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

  -- Build response with screenshot request if needed
  v_result := jsonb_build_object(
    'success', true,
    'timestamp', now(),
    'needs_screenshot_update', COALESCE(v_needs_screenshot, false)
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission (same grants as migration 075)
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB) TO anon;

-- ============================================================================
-- 3. INDEX FOR METRICS FRESHNESS QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tv_devices_metrics_updated
ON tv_devices(metrics_updated_at DESC NULLS LAST)
WHERE metrics_updated_at IS NOT NULL;

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB) IS
  'Called by player on heartbeat to update online status, cached content hash, and device telemetry metrics';

DO $$ BEGIN RAISE NOTICE 'Migration 149 completed: Device telemetry metrics column and extended update_device_status RPC'; END $$;
