-- Migration: 152_diagnostics_screenshots.sql
-- Phase 65 Plan 02: Extend get_screen_diagnostics with screenshot fields

-- Ensure device-screenshots bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-screenshots', 'device-screenshots', true)
ON CONFLICT (id) DO NOTHING;

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

  -- Get screen info (includes device_metrics from 151, screenshot fields from 075)
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
    d.needs_screenshot_update
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

  -- Build result (extended with device_metrics, metrics_updated_at, and screenshot fields)
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
      'needs_screenshot_update', COALESCE(v_screen.needs_screenshot_update, false)
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

-- Grant permissions (same signature, just refreshing)
GRANT EXECUTE ON FUNCTION get_screen_diagnostics(UUID) TO authenticated;

COMMENT ON FUNCTION get_screen_diagnostics(UUID) IS
'Returns diagnostics for a screen including device_metrics and screenshot data.
Extended in migration 152 to include last_screenshot_url, last_screenshot_at, and needs_screenshot_update.';
