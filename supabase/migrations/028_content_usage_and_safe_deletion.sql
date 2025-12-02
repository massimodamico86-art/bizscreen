-- Migration: Content Usage & Safe Deletion
-- Phase 16: Prevent accidental deletion of in-use content
-- Provides functions to check where content is used and enable safe deletion

-- ============================================
-- 1. GET MEDIA USAGE FUNCTION
-- ============================================
-- Returns JSON showing where a media asset is used

CREATE OR REPLACE FUNCTION get_media_usage(p_media_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_playlist_items JSONB;
  v_layout_zones JSONB;
  v_result JSONB;
BEGIN
  -- Get the owner_id to verify tenant access
  SELECT owner_id INTO v_owner_id
  FROM media_assets
  WHERE id = p_media_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Media not found');
  END IF;

  -- Check tenant access (user must be owner, admin, or super_admin)
  IF NOT (
    v_owner_id = auth.uid() OR
    is_super_admin() OR
    is_admin()
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Get playlist items that use this media
  SELECT jsonb_build_object(
    'count', COUNT(*)::int,
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'playlist_id', pi.playlist_id,
        'playlist_name', p.name,
        'position', pi.position
      )
    ) FILTER (WHERE pi.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_playlist_items
  FROM playlist_items pi
  JOIN playlists p ON p.id = pi.playlist_id
  WHERE pi.item_id = p_media_id
    AND pi.item_type = 'media';

  -- Get layout zones that use this media
  SELECT jsonb_build_object(
    'count', COUNT(*)::int,
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'zone_id', lz.id,
        'zone_name', lz.name,
        'layout_id', lz.layout_id,
        'layout_name', l.name
      )
    ) FILTER (WHERE lz.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_layout_zones
  FROM layout_zones lz
  JOIN layouts l ON l.id = lz.layout_id
  WHERE lz.content_id = p_media_id
    AND lz.content_type = 'media';

  -- Build result
  v_result := jsonb_build_object(
    'media_id', p_media_id,
    'playlist_items', v_playlist_items,
    'layout_zones', v_layout_zones,
    'is_in_use', (
      (v_playlist_items->>'count')::int > 0 OR
      (v_layout_zones->>'count')::int > 0
    ),
    'total_usage_count', (
      (v_playlist_items->>'count')::int +
      (v_layout_zones->>'count')::int
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 2. GET PLAYLIST USAGE FUNCTION
-- ============================================
-- Returns JSON showing where a playlist is used

CREATE OR REPLACE FUNCTION get_playlist_usage(p_playlist_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_screens JSONB;
  v_layout_zones JSONB;
  v_schedules JSONB;
  v_campaigns JSONB;
  v_result JSONB;
BEGIN
  -- Get the owner_id to verify tenant access
  SELECT owner_id INTO v_owner_id
  FROM playlists
  WHERE id = p_playlist_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Playlist not found');
  END IF;

  -- Check tenant access (user must be owner, admin, or super_admin)
  IF NOT (
    v_owner_id = auth.uid() OR
    is_super_admin() OR
    is_admin()
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Get screens (tv_devices) that have this playlist assigned
  SELECT jsonb_build_object(
    'count', COUNT(*)::int,
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'screen_id', td.id,
        'screen_name', td.device_name
      )
    ) FILTER (WHERE td.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_screens
  FROM tv_devices td
  WHERE td.assigned_playlist_id = p_playlist_id;

  -- Get layout zones that use this playlist
  SELECT jsonb_build_object(
    'count', COUNT(*)::int,
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'zone_id', lz.id,
        'zone_name', lz.name,
        'layout_id', lz.layout_id,
        'layout_name', l.name
      )
    ) FILTER (WHERE lz.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_layout_zones
  FROM layout_zones lz
  JOIN layouts l ON l.id = lz.layout_id
  WHERE lz.content_id = p_playlist_id
    AND lz.content_type = 'playlist';

  -- Get schedules that use this playlist
  SELECT jsonb_build_object(
    'count', COUNT(DISTINCT se.schedule_id)::int,
    'items', COALESCE(jsonb_agg(DISTINCT
      jsonb_build_object(
        'schedule_id', s.id,
        'schedule_name', s.name
      )
    ) FILTER (WHERE se.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_schedules
  FROM schedule_entries se
  JOIN schedules s ON s.id = se.schedule_id
  WHERE se.content_id = p_playlist_id
    AND se.content_type = 'playlist';

  -- Get campaigns that use this playlist
  SELECT jsonb_build_object(
    'count', COUNT(DISTINCT cc.campaign_id)::int,
    'items', COALESCE(jsonb_agg(DISTINCT
      jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.name
      )
    ) FILTER (WHERE cc.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_campaigns
  FROM campaign_contents cc
  JOIN campaigns c ON c.id = cc.campaign_id
  WHERE cc.content_id = p_playlist_id
    AND cc.content_type = 'playlist';

  -- Build result
  v_result := jsonb_build_object(
    'playlist_id', p_playlist_id,
    'screens', v_screens,
    'layout_zones', v_layout_zones,
    'schedules', v_schedules,
    'campaigns', v_campaigns,
    'is_in_use', (
      (v_screens->>'count')::int > 0 OR
      (v_layout_zones->>'count')::int > 0 OR
      (v_schedules->>'count')::int > 0 OR
      (v_campaigns->>'count')::int > 0
    ),
    'total_usage_count', (
      (v_screens->>'count')::int +
      (v_layout_zones->>'count')::int +
      (v_schedules->>'count')::int +
      (v_campaigns->>'count')::int
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 3. GET LAYOUT USAGE FUNCTION
-- ============================================
-- Returns JSON showing where a layout is used

CREATE OR REPLACE FUNCTION get_layout_usage(p_layout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_screens JSONB;
  v_schedules JSONB;
  v_campaigns JSONB;
  v_result JSONB;
BEGIN
  -- Get the owner_id to verify tenant access
  SELECT owner_id INTO v_owner_id
  FROM layouts
  WHERE id = p_layout_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Layout not found');
  END IF;

  -- Check tenant access (user must be owner, admin, or super_admin)
  IF NOT (
    v_owner_id = auth.uid() OR
    is_super_admin() OR
    is_admin()
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Get screens (tv_devices) that have this layout assigned
  SELECT jsonb_build_object(
    'count', COUNT(*)::int,
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'screen_id', td.id,
        'screen_name', td.device_name
      )
    ) FILTER (WHERE td.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_screens
  FROM tv_devices td
  WHERE td.assigned_layout_id = p_layout_id;

  -- Get schedules that use this layout
  SELECT jsonb_build_object(
    'count', COUNT(DISTINCT se.schedule_id)::int,
    'items', COALESCE(jsonb_agg(DISTINCT
      jsonb_build_object(
        'schedule_id', s.id,
        'schedule_name', s.name
      )
    ) FILTER (WHERE se.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_schedules
  FROM schedule_entries se
  JOIN schedules s ON s.id = se.schedule_id
  WHERE se.content_id = p_layout_id
    AND se.content_type = 'layout';

  -- Get campaigns that use this layout
  SELECT jsonb_build_object(
    'count', COUNT(DISTINCT cc.campaign_id)::int,
    'items', COALESCE(jsonb_agg(DISTINCT
      jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.name
      )
    ) FILTER (WHERE cc.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_campaigns
  FROM campaign_contents cc
  JOIN campaigns c ON c.id = cc.campaign_id
  WHERE cc.content_id = p_layout_id
    AND cc.content_type = 'layout';

  -- Build result
  v_result := jsonb_build_object(
    'layout_id', p_layout_id,
    'screens', v_screens,
    'schedules', v_schedules,
    'campaigns', v_campaigns,
    'is_in_use', (
      (v_screens->>'count')::int > 0 OR
      (v_schedules->>'count')::int > 0 OR
      (v_campaigns->>'count')::int > 0
    ),
    'total_usage_count', (
      (v_screens->>'count')::int +
      (v_schedules->>'count')::int +
      (v_campaigns->>'count')::int
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. BOOLEAN HELPER FUNCTIONS
-- ============================================

-- Check if media is in use (quick boolean check)
CREATE OR REPLACE FUNCTION is_media_in_use(p_media_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM playlist_items
    WHERE item_id = p_media_id AND item_type = 'media'
  ) OR EXISTS (
    SELECT 1 FROM layout_zones
    WHERE content_id = p_media_id AND content_type = 'media'
  );
END;
$$;

-- Check if playlist is in use (quick boolean check)
CREATE OR REPLACE FUNCTION is_playlist_in_use(p_playlist_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tv_devices
    WHERE assigned_playlist_id = p_playlist_id
  ) OR EXISTS (
    SELECT 1 FROM layout_zones
    WHERE content_id = p_playlist_id AND content_type = 'playlist'
  ) OR EXISTS (
    SELECT 1 FROM schedule_entries
    WHERE content_id = p_playlist_id AND content_type = 'playlist'
  ) OR EXISTS (
    SELECT 1 FROM campaign_contents
    WHERE content_id = p_playlist_id AND content_type = 'playlist'
  );
END;
$$;

-- Check if layout is in use (quick boolean check)
CREATE OR REPLACE FUNCTION is_layout_in_use(p_layout_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tv_devices
    WHERE assigned_layout_id = p_layout_id
  ) OR EXISTS (
    SELECT 1 FROM schedule_entries
    WHERE content_id = p_layout_id AND content_type = 'layout'
  ) OR EXISTS (
    SELECT 1 FROM campaign_contents
    WHERE content_id = p_layout_id AND content_type = 'layout'
  );
END;
$$;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_media_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_playlist_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_layout_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_media_in_use(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_playlist_in_use(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_layout_in_use(UUID) TO authenticated;

-- ============================================
-- 6. COMMENTS
-- ============================================

COMMENT ON FUNCTION get_media_usage(UUID) IS
'Returns detailed JSON showing where a media asset is used (playlists, layout zones)';

COMMENT ON FUNCTION get_playlist_usage(UUID) IS
'Returns detailed JSON showing where a playlist is used (screens, layouts, schedules, campaigns)';

COMMENT ON FUNCTION get_layout_usage(UUID) IS
'Returns detailed JSON showing where a layout is used (screens, schedules, campaigns)';

COMMENT ON FUNCTION is_media_in_use(UUID) IS
'Quick boolean check if a media asset is used anywhere';

COMMENT ON FUNCTION is_playlist_in_use(UUID) IS
'Quick boolean check if a playlist is used anywhere';

COMMENT ON FUNCTION is_layout_in_use(UUID) IS
'Quick boolean check if a layout is used anywhere';
