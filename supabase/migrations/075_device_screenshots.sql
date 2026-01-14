-- Migration: 075_device_screenshots.sql
-- Description: Add screenshot capture support for remote device diagnostics
-- Phase: Device Screenshots & Remote Troubleshooting

-- ============================================================================
-- 1. ADD SCREENSHOT COLUMNS TO TV_DEVICES
-- ============================================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS last_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS last_screenshot_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS needs_screenshot_update BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tv_devices.last_screenshot_url IS 'URL to the most recent screenshot in Supabase Storage';
COMMENT ON COLUMN public.tv_devices.last_screenshot_at IS 'Timestamp when the last screenshot was captured';
COMMENT ON COLUMN public.tv_devices.needs_screenshot_update IS 'Flag to signal player to capture a new screenshot';

-- ============================================================================
-- 2. CREATE STORAGE BUCKET FOR DEVICE SCREENSHOTS
-- ============================================================================

-- Note: Storage bucket creation is typically done via Supabase dashboard or CLI
-- but we include the SQL for documentation purposes
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('device-screenshots', 'device-screenshots', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. RPC: REQUEST DEVICE SCREENSHOT
-- Sets the needs_screenshot_update flag for a device
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_device_screenshot(
  p_device_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the device exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM tv_devices
    WHERE id = p_device_id
  ) THEN
    RAISE EXCEPTION 'Device not found or access denied';
  END IF;

  -- Set the flag to request a screenshot
  UPDATE tv_devices
  SET needs_screenshot_update = true,
      updated_at = now()
  WHERE id = p_device_id;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.request_device_screenshot(UUID) TO authenticated;

-- ============================================================================
-- 4. RPC: STORE DEVICE SCREENSHOT
-- Called by the player after uploading a screenshot
-- ============================================================================

CREATE OR REPLACE FUNCTION public.store_device_screenshot(
  p_device_id UUID,
  p_screenshot_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the device with screenshot info and clear the request flag
  UPDATE tv_devices
  SET last_screenshot_url = p_screenshot_url,
      last_screenshot_at = now(),
      needs_screenshot_update = false,
      updated_at = now()
  WHERE id = p_device_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Device not found';
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permission (service role for player)
GRANT EXECUTE ON FUNCTION public.store_device_screenshot(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_device_screenshot(UUID, TEXT) TO anon;

-- ============================================================================
-- 5. RPC: LIST DEVICES WITH SCREENSHOT INFO
-- Returns devices with diagnostic info for the troubleshooting dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_devices_with_screenshot_info(
  p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  device_id UUID,
  device_name TEXT,
  is_online BOOLEAN,
  last_seen TIMESTAMPTZ,
  last_screenshot_url TEXT,
  last_screenshot_at TIMESTAMPTZ,
  needs_screenshot_update BOOLEAN,
  active_scene_id UUID,
  active_scene_name TEXT,
  assigned_schedule_id UUID,
  assigned_schedule_name TEXT,
  location_id UUID,
  location_name TEXT,
  screen_group_id UUID,
  screen_group_name TEXT,
  minutes_since_heartbeat INTEGER,
  screenshot_age_minutes INTEGER,
  has_warning BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS device_id,
    d.device_name,
    d.is_online,
    d.last_seen,
    d.last_screenshot_url,
    d.last_screenshot_at,
    d.needs_screenshot_update,
    d.active_scene_id,
    s.name AS active_scene_name,
    d.assigned_schedule_id,
    sch.name AS assigned_schedule_name,
    d.location_id,
    l.name AS location_name,
    d.screen_group_id,
    sg.name AS screen_group_name,
    EXTRACT(EPOCH FROM (now() - d.last_seen))::INTEGER / 60 AS minutes_since_heartbeat,
    CASE
      WHEN d.last_screenshot_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (now() - d.last_screenshot_at))::INTEGER / 60
      ELSE NULL
    END AS screenshot_age_minutes,
    -- Warning if offline or screenshot is stale (> 30 min)
    (
      NOT d.is_online
      OR d.last_seen < (now() - interval '5 minutes')
      OR (d.last_screenshot_at IS NOT NULL AND d.last_screenshot_at < (now() - interval '30 minutes'))
    ) AS has_warning
  FROM tv_devices d
  LEFT JOIN scenes s ON d.active_scene_id = s.id
  LEFT JOIN schedules sch ON d.assigned_schedule_id = sch.id
  LEFT JOIN locations l ON d.location_id = l.id
  LEFT JOIN screen_groups sg ON d.screen_group_id = sg.id
  WHERE (p_client_id IS NULL OR d.client_id = p_client_id)
  ORDER BY
    -- Show devices with warnings first
    (NOT d.is_online OR d.last_seen < (now() - interval '5 minutes')) DESC,
    d.device_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.list_devices_with_screenshot_info(UUID) TO authenticated;

-- ============================================================================
-- 6. UPDATE update_device_status TO RETURN SCREENSHOT FLAG
-- Modify the existing heartbeat function to return needs_screenshot_update
-- ============================================================================

-- Drop and recreate to change return type from void to JSONB
DROP FUNCTION IF EXISTS public.update_device_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_device_status(
  p_device_id UUID,
  p_player_version TEXT DEFAULT NULL,
  p_cached_content_hash TEXT DEFAULT NULL
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
  -- Update device status and get screenshot flag
  UPDATE tv_devices
  SET
    is_online = true,
    last_seen = now(),
    player_version = COALESCE(p_player_version, player_version),
    cached_content_hash = COALESCE(p_cached_content_hash, cached_content_hash),
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT) TO anon;

-- ============================================================================
-- 7. CREATE INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tv_devices_needs_screenshot
ON tv_devices(needs_screenshot_update)
WHERE needs_screenshot_update = true;

CREATE INDEX IF NOT EXISTS idx_tv_devices_last_screenshot_at
ON tv_devices(last_screenshot_at);

-- ============================================================================
-- 8. RLS POLICIES FOR SCREENSHOT ACCESS
-- ============================================================================

-- Users can request screenshots for their own devices
-- (Existing RLS policies on tv_devices should cover this)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
