-- Migration: 030_screen_diagnostics.sql
-- Phase 18: Screen Diagnostics & Live Preview
-- Provides detailed diagnostics for a single screen

-- ============================================
-- 1. GET SCREEN DIAGNOSTICS RPC
-- ============================================
-- Returns comprehensive diagnostics for a screen including:
-- - Screen info (id, name, location, group, online status)
-- - Content source (campaign, schedule, layout, playlist assignments)
-- - Resolved content (what's currently playing)
-- - Recent playback analytics

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
  v_campaign RECORD;
  v_schedule RECORD;
  v_layout RECORD;
  v_playlist RECORD;
  v_resolved_content JSONB;
  v_last_playback RECORD;
  v_top_items JSONB;
  v_uptime_percent NUMERIC;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();

  -- ============================================
  -- STEP 1: Get screen info and verify access
  -- ============================================
  SELECT
    d.id,
    d.name,
    d.tenant_id,
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
    d.created_at
  INTO v_screen
  FROM public.tv_devices d
  WHERE d.id = p_screen_id;

  IF v_screen.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Screen not found');
  END IF;

  -- Verify tenant access (RBAC)
  IF NOT (
    v_screen.owner_id = v_user_id OR
    v_screen.tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    v_screen.tenant_id IN (SELECT get_my_tenant_ids())
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- ============================================
  -- STEP 2: Get location info
  -- ============================================
  SELECT l.id, l.name, l.timezone
  INTO v_location
  FROM public.locations l
  WHERE l.id = v_screen.location_id;

  -- ============================================
  -- STEP 3: Get screen group info
  -- ============================================
  SELECT sg.id, sg.name
  INTO v_group
  FROM public.screen_groups sg
  WHERE sg.id = v_screen.screen_group_id;

  -- ============================================
  -- STEP 4: Get active campaign (if any)
  -- ============================================
  SELECT
    c.id,
    c.name,
    c.start_date,
    c.end_date,
    c.priority
  INTO v_campaign
  FROM public.campaigns c
  JOIN public.campaign_targets ct ON ct.campaign_id = c.id
  WHERE c.tenant_id = v_screen.tenant_id
    AND c.is_active = true
    AND NOW() >= c.start_date
    AND NOW() <= c.end_date
    AND (
      (ct.target_type = 'screen' AND ct.target_id = p_screen_id)
      OR (ct.target_type = 'screen_group' AND ct.target_id = v_screen.screen_group_id AND v_screen.screen_group_id IS NOT NULL)
      OR (ct.target_type = 'location' AND ct.target_id = v_screen.location_id AND v_screen.location_id IS NOT NULL)
      OR (ct.target_type = 'all')
    )
  ORDER BY c.priority DESC, c.created_at DESC
  LIMIT 1;

  -- ============================================
  -- STEP 5: Get active schedule entry (if any)
  -- ============================================
  SELECT
    s.id,
    s.name,
    se.id as entry_id,
    se.layout_id,
    se.playlist_id,
    se.start_time,
    se.end_time,
    se.days_of_week
  INTO v_schedule
  FROM public.schedule_entries se
  JOIN public.schedules s ON s.id = se.schedule_id
  WHERE s.tenant_id = v_screen.tenant_id
    AND s.is_active = true
    AND (
      (se.target_type = 'screen' AND se.target_id = p_screen_id)
      OR (se.target_type = 'screen_group' AND se.target_id = v_screen.screen_group_id AND v_screen.screen_group_id IS NOT NULL)
      OR (se.target_type = 'all')
    )
    AND EXTRACT(DOW FROM NOW()) = ANY(se.days_of_week)
    AND (NOW()::time >= se.start_time AND NOW()::time < se.end_time)
  ORDER BY s.priority DESC, se.created_at DESC
  LIMIT 1;

  -- ============================================
  -- STEP 6: Get assigned layout info
  -- ============================================
  SELECT l.id, l.name, l.orientation, l.template_type
  INTO v_layout
  FROM public.layouts l
  WHERE l.id = v_screen.assigned_layout_id;

  -- ============================================
  -- STEP 7: Get assigned playlist info
  -- ============================================
  SELECT p.id, p.name, p.orientation
  INTO v_playlist
  FROM public.playlists p
  WHERE p.id = v_screen.assigned_playlist_id;

  -- ============================================
  -- STEP 8: Get resolved content using existing function
  -- ============================================
  SELECT get_resolved_player_content(p_screen_id) INTO v_resolved_content;

  -- ============================================
  -- STEP 9: Get last playback event
  -- ============================================
  SELECT
    pe.started_at,
    pe.ended_at,
    pe.item_type,
    ma.name as media_name,
    pl.name as playlist_name
  INTO v_last_playback
  FROM public.playback_events pe
  LEFT JOIN public.media_assets ma ON ma.id = pe.media_id
  LEFT JOIN public.playlists pl ON pl.id = pe.playlist_id
  WHERE pe.screen_id = p_screen_id
  ORDER BY pe.started_at DESC
  LIMIT 1;

  -- ============================================
  -- STEP 10: Get top played items (last 24h)
  -- ============================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'media_id', ti.media_id,
      'media_name', ti.media_name,
      'play_count', ti.play_count,
      'total_seconds', ti.total_seconds
    )
  ), '[]'::jsonb) INTO v_top_items
  FROM (
    SELECT
      pe.media_id,
      ma.name as media_name,
      COUNT(*) as play_count,
      SUM(pe.duration_seconds) as total_seconds
    FROM public.playback_events pe
    JOIN public.media_assets ma ON ma.id = pe.media_id
    WHERE pe.screen_id = p_screen_id
      AND pe.started_at >= NOW() - INTERVAL '24 hours'
      AND pe.media_id IS NOT NULL
    GROUP BY pe.media_id, ma.name
    ORDER BY play_count DESC
    LIMIT 5
  ) ti;

  -- ============================================
  -- STEP 11: Calculate 24h uptime percentage
  -- ============================================
  -- Simple calculation based on last_seen_at
  -- If seen within 5 minutes, count as online
  IF v_screen.last_seen_at IS NOT NULL AND v_screen.last_seen_at >= NOW() - INTERVAL '5 minutes' THEN
    -- Use playback events to estimate uptime
    SELECT
      ROUND(
        (COALESCE(SUM(pe.duration_seconds), 0)::NUMERIC / 86400) * 100,
        1
      )
    INTO v_uptime_percent
    FROM public.playback_events pe
    WHERE pe.screen_id = p_screen_id
      AND pe.started_at >= NOW() - INTERVAL '24 hours';

    -- Cap at 100% and ensure minimum of 1% if currently online
    v_uptime_percent := LEAST(GREATEST(v_uptime_percent, 1), 100);
  ELSE
    v_uptime_percent := 0;
  END IF;

  -- ============================================
  -- BUILD RESULT
  -- ============================================
  v_result := jsonb_build_object(
    'screen', jsonb_build_object(
      'id', v_screen.id,
      'name', v_screen.name,
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
      'created_at', v_screen.created_at
    ),
    'content_source', jsonb_build_object(
      'active_campaign', CASE WHEN v_campaign.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_campaign.id,
          'name', v_campaign.name,
          'start_date', v_campaign.start_date,
          'end_date', v_campaign.end_date,
          'priority', v_campaign.priority
        )
      ELSE NULL END,
      'active_schedule', CASE WHEN v_schedule.id IS NOT NULL THEN
        jsonb_build_object(
          'schedule_id', v_schedule.id,
          'schedule_name', v_schedule.name,
          'entry_id', v_schedule.entry_id,
          'layout_id', v_schedule.layout_id,
          'playlist_id', v_schedule.playlist_id,
          'start_time', v_schedule.start_time,
          'end_time', v_schedule.end_time,
          'days_of_week', v_schedule.days_of_week
        )
      ELSE NULL END,
      'assigned_layout', CASE WHEN v_layout.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_layout.id,
          'name', v_layout.name,
          'orientation', v_layout.orientation,
          'template_type', v_layout.template_type
        )
      ELSE NULL END,
      'assigned_playlist', CASE WHEN v_playlist.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_playlist.id,
          'name', v_playlist.name,
          'orientation', v_playlist.orientation
        )
      ELSE NULL END,
      'resolution_path', CASE
        WHEN v_campaign.id IS NOT NULL THEN 'campaign'
        WHEN v_schedule.id IS NOT NULL THEN 'schedule'
        WHEN v_layout.id IS NOT NULL THEN 'layout'
        WHEN v_playlist.id IS NOT NULL THEN 'playlist'
        ELSE 'none'
      END
    ),
    'resolved_content', v_resolved_content,
    'recent_playback', jsonb_build_object(
      'last_event_at', v_last_playback.started_at,
      'last_item_type', v_last_playback.item_type,
      'last_media_name', v_last_playback.media_name,
      'last_playlist_name', v_last_playback.playlist_name,
      'uptime_24h_percent', v_uptime_percent,
      'top_items', v_top_items
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 2. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_screen_diagnostics(UUID) TO authenticated;

-- ============================================
-- 3. COMMENTS
-- ============================================

COMMENT ON FUNCTION get_screen_diagnostics(UUID) IS
'Returns comprehensive diagnostics for a screen including:
- Screen info (id, name, location, group, online status)
- Content source (active campaign, schedule, layout, playlist)
- Resolved content (what the player should show)
- Recent playback analytics (last event, uptime, top items)
Used by the Screen Detail Drawer in the admin UI.';
