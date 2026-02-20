-- Migration: 153_content_verification.sql
-- Phase 67: Content Verification Pipeline
-- Plan 01: Content version reporting and server-side mismatch detection
--
-- Adds content verification columns to tv_devices, extends update_device_status
-- to compute expected content version and detect mismatches, extends
-- get_screen_diagnostics to expose verification status fields.

-- ============================================================================
-- 1. ADD CONTENT VERIFICATION COLUMNS TO TV_DEVICES
-- ============================================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS content_version_status TEXT DEFAULT 'unknown'
  CHECK (content_version_status IN ('unknown', 'verified', 'mismatched', 'pending')),
ADD COLUMN IF NOT EXISTS content_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS content_mismatch_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_content_version TEXT,
ADD COLUMN IF NOT EXISTS reported_content_version TEXT;

COMMENT ON COLUMN public.tv_devices.content_version_status IS
  'Content verification state: unknown (no report), verified (match), mismatched (differs), pending (refresh queued)';
COMMENT ON COLUMN public.tv_devices.content_verified_at IS
  'Timestamp when content was last verified as matching expected version';
COMMENT ON COLUMN public.tv_devices.content_mismatch_since IS
  'Timestamp when content mismatch was first detected (not overwritten on subsequent heartbeats)';
COMMENT ON COLUMN public.tv_devices.expected_content_version IS
  'Server-computed expected content version string for diagnostic visibility';
COMMENT ON COLUMN public.tv_devices.reported_content_version IS
  'Player-reported content version string for diagnostic visibility';

-- ============================================================================
-- 2. INDEX FOR QUERYING MISMATCHED DEVICES (Phase 68 alert queries)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tv_devices_content_mismatch
ON tv_devices(content_version_status, content_mismatch_since)
WHERE content_version_status = 'mismatched';

-- ============================================================================
-- 3. EXTEND update_device_status RPC WITH CONTENT VERSION PARAMETER
-- ============================================================================
-- Adds p_content_version TEXT DEFAULT NULL parameter. Backward compatible.
-- Must DROP old signature first (same pattern as 149_telemetry_metrics.sql).

DROP FUNCTION IF EXISTS public.update_device_status(UUID, TEXT, TEXT, JSONB);

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
  -- CONTENT VERSION COMPARISON
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

  -- Build response with all existing fields PLUS content verification fields
  v_result := jsonb_build_object(
    'success', true,
    'timestamp', now(),
    'needs_screenshot_update', COALESCE(v_needs_screenshot, false),
    'content_mismatch', CASE
      WHEN COALESCE(v_needs_refresh, false) THEN false
      ELSE COALESCE(v_is_mismatch, false)
    END,
    'expected_content_version', v_expected_version
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission (updated signature)
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT) TO anon;

COMMENT ON FUNCTION public.update_device_status(UUID, TEXT, TEXT, JSONB, TEXT) IS
  'Called by player on heartbeat to update online status, cached content hash, device telemetry metrics, and content version verification. Returns content_mismatch flag when player-reported version differs from server-computed expected version.';

-- ============================================================================
-- 4. EXTEND get_screen_diagnostics WITH VERIFICATION FIELDS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_screen_diagnostics(p_screen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_screen RECORD;
  v_location RECORD;
  v_group RECORD;
  v_layout RECORD;
  v_playlist RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get screen info (includes device_metrics from 151, screenshot from 152, verification from 153)
  SELECT
    d.id,
    d.device_name,
    d.owner_id,
    d.location_id,
    d.screen_group_id,
    d.assigned_layout_id,
    d.assigned_playlist_id,
    d.last_seen_at,
    d.is_online,
    d.player_version,
    d.kiosk_mode_enabled,
    d.cached_content_hash,
    d.timezone,
    d.created_at,
    d.device_metrics,
    d.metrics_updated_at,
    d.last_screenshot_url,
    d.last_screenshot_at,
    d.needs_screenshot_update,
    d.content_version_status,
    d.content_verified_at,
    d.content_mismatch_since,
    d.expected_content_version,
    d.reported_content_version
  INTO v_screen
  FROM public.tv_devices d
  WHERE d.id = p_screen_id;

  IF v_screen.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Screen not found');
  END IF;

  -- Verify access
  IF NOT (
    v_screen.owner_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    v_screen.owner_id IN (SELECT get_my_tenant_ids())
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Get location info
  SELECT l.id, l.name, l.timezone
  INTO v_location
  FROM public.locations l
  WHERE l.id = v_screen.location_id;

  -- Get screen group info
  SELECT sg.id, sg.name
  INTO v_group
  FROM public.screen_groups sg
  WHERE sg.id = v_screen.screen_group_id;

  -- Get assigned layout info
  SELECT l.id, l.name
  INTO v_layout
  FROM public.layouts l
  WHERE l.id = v_screen.assigned_layout_id;

  -- Get assigned playlist info
  SELECT p.id, p.name
  INTO v_playlist
  FROM public.playlists p
  WHERE p.id = v_screen.assigned_playlist_id;

  -- Build result (extended with device_metrics, screenshots, and content verification fields)
  v_result := jsonb_build_object(
    'screen', jsonb_build_object(
      'id', v_screen.id,
      'name', v_screen.device_name,
      'location_id', v_screen.location_id,
      'location_name', v_location.name,
      'group_id', v_screen.screen_group_id,
      'group_name', v_group.name,
      'last_seen_at', v_screen.last_seen_at,
      'timezone', COALESCE(v_screen.timezone, v_location.timezone, 'UTC'),
      'is_online', COALESCE(v_screen.is_online, false),
      'player_version', v_screen.player_version,
      'kiosk_mode_enabled', COALESCE(v_screen.kiosk_mode_enabled, false),
      'cached_content_hash', v_screen.cached_content_hash,
      'created_at', v_screen.created_at,
      'device_metrics', v_screen.device_metrics,
      'metrics_updated_at', v_screen.metrics_updated_at,
      'last_screenshot_url', v_screen.last_screenshot_url,
      'last_screenshot_at', v_screen.last_screenshot_at,
      'needs_screenshot_update', COALESCE(v_screen.needs_screenshot_update, false),
      'content_version_status', COALESCE(v_screen.content_version_status, 'unknown'),
      'content_verified_at', v_screen.content_verified_at,
      'content_mismatch_since', v_screen.content_mismatch_since,
      'expected_content_version', v_screen.expected_content_version,
      'reported_content_version', v_screen.reported_content_version
    ),
    'content_source', jsonb_build_object(
      'active_campaign', NULL,
      'active_schedule', NULL,
      'assigned_layout', CASE WHEN v_layout.id IS NOT NULL THEN
        jsonb_build_object('id', v_layout.id, 'name', v_layout.name)
      ELSE NULL END,
      'assigned_playlist', CASE WHEN v_playlist.id IS NOT NULL THEN
        jsonb_build_object('id', v_playlist.id, 'name', v_playlist.name)
      ELSE NULL END,
      'resolution_path', CASE
        WHEN v_layout.id IS NOT NULL THEN 'layout'
        WHEN v_playlist.id IS NOT NULL THEN 'playlist'
        ELSE 'none'
      END
    ),
    'resolved_content', '{}'::jsonb,
    'recent_playback', jsonb_build_object(
      'last_event_at', NULL,
      'uptime_24h_percent', 0,
      'top_items', '[]'::jsonb
    )
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_screen_diagnostics(UUID) TO authenticated;

COMMENT ON FUNCTION get_screen_diagnostics(UUID) IS
'Returns diagnostics for a screen including device_metrics, screenshot data, and content verification status.
Extended in migration 153 to include content_version_status, content_verified_at, content_mismatch_since,
expected_content_version, and reported_content_version.';

-- ============================================================================
-- 5. DONE
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Migration 153 completed: Content verification columns, extended update_device_status with version comparison, extended get_screen_diagnostics with verification fields'; END $$;
