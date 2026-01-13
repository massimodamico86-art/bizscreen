-- Migration 073: Screen Group Scene Publishing
--
-- This migration adds the ability to publish scenes to screen groups
-- When a scene is published to a group, all devices in that group show the scene
-- unless they have an individual scene override.
--
-- Priority order for scene resolution:
-- 1. device.active_scene_id (individual override - highest priority)
-- 2. screen_group.active_scene_id (group default)
-- 3. Existing fallbacks (schedules, layouts, playlists)

-- ============================================================================
-- 1. Add active_scene_id column to screen_groups
-- ============================================================================

ALTER TABLE public.screen_groups
ADD COLUMN IF NOT EXISTS active_scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL;

-- Add index for scene lookups
CREATE INDEX IF NOT EXISTS idx_screen_groups_active_scene_id
ON public.screen_groups(active_scene_id);

COMMENT ON COLUMN public.screen_groups.active_scene_id IS
  'Currently published scene for this group - all devices in group will show this unless individually overridden';

-- ============================================================================
-- 2. RPC: publish_scene_to_group(group_id, scene_id)
-- ============================================================================
-- Sets the scene on the group and optionally on all member devices
-- Returns the number of devices affected

CREATE OR REPLACE FUNCTION public.publish_scene_to_group(
  p_group_id uuid,
  p_scene_id uuid,
  p_update_devices boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
  v_tenant_id uuid;
  v_group_name text;
  v_device_count integer;
BEGIN
  -- Verify the group exists and get tenant_id
  SELECT tenant_id, name INTO v_tenant_id, v_group_name
  FROM public.screen_groups
  WHERE id = p_group_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Screen group not found: %', p_group_id;
  END IF;

  -- Verify the scene exists and belongs to same tenant (if scene_id provided)
  IF p_scene_id IS NOT NULL THEN
    PERFORM 1 FROM public.scenes
    WHERE id = p_scene_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Scene not found or access denied: %', p_scene_id;
    END IF;
  END IF;

  -- Update the screen group's active scene
  UPDATE public.screen_groups
  SET active_scene_id = p_scene_id,
      updated_at = NOW()
  WHERE id = p_group_id;

  -- Optionally update all devices in the group
  IF p_update_devices THEN
    UPDATE public.tv_devices
    SET active_scene_id = p_scene_id,
        needs_refresh = true,
        updated_at = NOW()
    WHERE screen_group_id = p_group_id;

    GET DIAGNOSTICS v_device_count = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_device_count
    FROM public.tv_devices
    WHERE screen_group_id = p_group_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'groupId', p_group_id,
    'groupName', v_group_name,
    'sceneId', p_scene_id,
    'devicesUpdated', CASE WHEN p_update_devices THEN v_device_count ELSE 0 END,
    'totalDevices', v_device_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.publish_scene_to_group(uuid, uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.publish_scene_to_group IS
  'Publish a scene to all devices in a screen group. Set p_update_devices=false to only update the group default.';

-- ============================================================================
-- 3. RPC: unpublish_scene_from_group(group_id)
-- ============================================================================
-- Clears the active scene from a group and optionally from all member devices

CREATE OR REPLACE FUNCTION public.unpublish_scene_from_group(
  p_group_id uuid,
  p_clear_devices boolean DEFAULT true
)
RETURNS jsonb AS $$
BEGIN
  RETURN public.publish_scene_to_group(p_group_id, NULL, p_clear_devices);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.unpublish_scene_from_group(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.unpublish_scene_from_group IS
  'Clear the published scene from a screen group';

-- ============================================================================
-- 4. RPC: get_screen_groups_with_scenes()
-- ============================================================================
-- Returns screen groups with device counts and active scene info

CREATE OR REPLACE FUNCTION public.get_screen_groups_with_scenes(p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  name text,
  description text,
  location_id uuid,
  location_name text,
  tags text[],
  active_scene_id uuid,
  active_scene_name text,
  device_count bigint,
  online_count bigint,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sg.id,
    sg.tenant_id,
    sg.name,
    sg.description,
    sg.location_id,
    l.name AS location_name,
    sg.tags,
    sg.active_scene_id,
    s.name AS active_scene_name,
    COUNT(td.id) AS device_count,
    COUNT(CASE WHEN td.is_online = true THEN 1 END) AS online_count,
    sg.created_at,
    sg.updated_at
  FROM public.screen_groups sg
  LEFT JOIN public.locations l ON sg.location_id = l.id
  LEFT JOIN public.scenes s ON sg.active_scene_id = s.id
  LEFT JOIN public.tv_devices td ON td.screen_group_id = sg.id
  WHERE (p_tenant_id IS NULL OR sg.tenant_id = p_tenant_id)
  GROUP BY sg.id, sg.tenant_id, sg.name, sg.description, sg.location_id, l.name,
           sg.tags, sg.active_scene_id, s.name, sg.created_at, sg.updated_at
  ORDER BY sg.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_screen_groups_with_scenes(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_screen_groups_with_scenes IS
  'Get all screen groups with device counts and active scene info for a tenant';

-- ============================================================================
-- 5. Update get_resolved_player_content to check group scene
-- ============================================================================
-- Priority: device.active_scene_id > group.active_scene_id > schedule > layout > playlist

CREATE OR REPLACE FUNCTION public.get_resolved_player_content(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_scene scenes%ROWTYPE;
  v_group_scene_id uuid;
  v_schedule_entry RECORD;
  v_playlist_id UUID;
  v_layout_id UUID;
  v_playlist playlists%ROWTYPE;
  v_items JSONB;
  v_layout_content JSONB;
  v_result JSONB;
  v_mode TEXT;
BEGIN
  -- Find the TV device
  SELECT * INTO v_device
  FROM public.tv_devices
  WHERE id = p_screen_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Screen not found';
  END IF;

  -- Update heartbeat
  UPDATE public.tv_devices
  SET last_seen = NOW(),
      is_online = true
  WHERE id = v_device.id;

  -- Initialize
  v_playlist_id := NULL;
  v_layout_id := NULL;
  v_mode := 'playlist';

  -- =========================================================================
  -- Step 0 - Check for active scene (highest priority)
  -- Priority: device.active_scene_id > group.active_scene_id
  -- =========================================================================

  -- First check device's own active_scene_id
  IF v_device.active_scene_id IS NOT NULL THEN
    SELECT * INTO v_scene
    FROM public.scenes
    WHERE id = v_device.active_scene_id AND is_active = true;

    IF v_scene.id IS NOT NULL THEN
      -- Scene found - use its layout and playlist
      IF v_scene.layout_id IS NOT NULL THEN
        v_layout_id := v_scene.layout_id;
        v_mode := 'layout';
      ELSIF v_scene.primary_playlist_id IS NOT NULL THEN
        v_playlist_id := v_scene.primary_playlist_id;
        v_mode := 'playlist';
      END IF;
    END IF;
  END IF;

  -- If no device scene, check group's active_scene_id
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.screen_group_id IS NOT NULL THEN
    SELECT sg.active_scene_id INTO v_group_scene_id
    FROM public.screen_groups sg
    WHERE sg.id = v_device.screen_group_id;

    IF v_group_scene_id IS NOT NULL THEN
      SELECT * INTO v_scene
      FROM public.scenes
      WHERE id = v_group_scene_id AND is_active = true;

      IF v_scene.id IS NOT NULL THEN
        IF v_scene.layout_id IS NOT NULL THEN
          v_layout_id := v_scene.layout_id;
          v_mode := 'layout';
        ELSIF v_scene.primary_playlist_id IS NOT NULL THEN
          v_playlist_id := v_scene.primary_playlist_id;
          v_mode := 'playlist';
        END IF;
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- Step 1: Check for active schedule entry (if no scene override)
  -- =========================================================================
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.assigned_schedule_id IS NOT NULL THEN
    SELECT * INTO v_schedule_entry
    FROM public.resolve_schedule_entry(
      v_device.assigned_schedule_id,
      COALESCE(v_device.timezone, 'UTC')
    );

    IF v_schedule_entry IS NOT NULL AND v_schedule_entry.target_id IS NOT NULL THEN
      IF v_schedule_entry.target_type = 'playlist' THEN
        v_playlist_id := v_schedule_entry.target_id;
        v_mode := 'playlist';
      ELSIF v_schedule_entry.target_type = 'layout' THEN
        v_layout_id := v_schedule_entry.target_id;
        v_mode := 'layout';
      ELSIF v_schedule_entry.target_type = 'media' THEN
        -- Single media - wrap in playlist-like response
        v_mode := 'playlist';
        SELECT jsonb_build_object(
          'id', ma.id,
          'position', 0,
          'type', 'media',
          'mediaType', ma.type,
          'url', ma.url,
          'thumbnailUrl', ma.thumbnail_url,
          'name', ma.name,
          'duration', COALESCE(ma.duration, 10),
          'width', ma.width,
          'height', ma.height,
          'config', ma.config_json
        ) INTO v_items
        FROM public.media_assets ma
        WHERE ma.id = v_schedule_entry.target_id;

        IF v_items IS NOT NULL THEN
          v_items := jsonb_build_array(v_items);
        ELSE
          v_items := '[]'::jsonb;
        END IF;

        RETURN jsonb_build_object(
          'mode', 'playlist',
          'device', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.device_name,
            'timezone', COALESCE(v_device.timezone, 'UTC')
          ),
          'playlist', NULL,
          'items', v_items,
          'scene', CASE WHEN v_scene.id IS NOT NULL THEN
            jsonb_build_object(
              'id', v_scene.id,
              'name', v_scene.name,
              'businessType', v_scene.business_type
            )
          ELSE NULL END
        );
      END IF;
    END IF;
  END IF;

  -- Step 2: Fallback to assigned layout
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.assigned_layout_id IS NOT NULL THEN
    v_layout_id := v_device.assigned_layout_id;
    v_mode := 'layout';
  END IF;

  -- Step 3: Fallback to assigned playlist
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.assigned_playlist_id IS NOT NULL THEN
    v_playlist_id := v_device.assigned_playlist_id;
    v_mode := 'playlist';
  END IF;

  -- Build response based on mode
  IF v_mode = 'layout' AND v_layout_id IS NOT NULL THEN
    -- Get layout content
    SELECT public.get_layout_content(v_layout_id) INTO v_layout_content;

    v_result := jsonb_build_object(
      'mode', 'layout',
      'device', jsonb_build_object(
        'id', v_device.id,
        'name', v_device.device_name,
        'timezone', COALESCE(v_device.timezone, 'UTC')
      ),
      'layout', v_layout_content,
      'scene', CASE WHEN v_scene.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_scene.id,
          'name', v_scene.name,
          'businessType', v_scene.business_type
        )
      ELSE NULL END
    );
  ELSE
    -- Playlist mode (default)
    IF v_playlist_id IS NOT NULL THEN
      SELECT * INTO v_playlist
      FROM public.playlists
      WHERE id = v_playlist_id;

      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'position', pi.position,
          'type', pi.item_type,
          'mediaType', COALESCE(ma.type, 'unknown'),
          'url', COALESCE(ma.url, ''),
          'thumbnailUrl', COALESCE(ma.thumbnail_url, ''),
          'name', COALESCE(ma.name, ''),
          'duration', COALESCE(pi.duration, ma.duration, COALESCE(v_playlist.default_duration, 10)),
          'width', ma.width,
          'height', ma.height,
          'config', ma.config_json
        )
        ORDER BY pi.position
      ), '[]'::jsonb) INTO v_items
      FROM public.playlist_items pi
      LEFT JOIN public.media_assets ma ON pi.item_id = ma.id
      WHERE pi.playlist_id = v_playlist_id;
    ELSE
      v_items := '[]'::jsonb;
    END IF;

    v_result := jsonb_build_object(
      'mode', 'playlist',
      'device', jsonb_build_object(
        'id', v_device.id,
        'name', v_device.device_name,
        'timezone', COALESCE(v_device.timezone, 'UTC')
      ),
      'playlist', CASE
        WHEN v_playlist.id IS NOT NULL THEN
          jsonb_build_object(
            'id', v_playlist.id,
            'name', v_playlist.name,
            'defaultDuration', COALESCE(v_playlist.default_duration, 10),
            'transitionEffect', COALESCE(v_playlist.transition_effect, 'fade'),
            'shuffle', COALESCE(v_playlist.shuffle, false)
          )
        ELSE NULL
      END,
      'items', v_items,
      'scene', CASE WHEN v_scene.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_scene.id,
          'name', v_scene.name,
          'businessType', v_scene.business_type
        )
      ELSE NULL END
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Helper: Count devices by group scene
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_devices_by_group_scene(p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.tv_devices
  WHERE screen_group_id = p_group_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.count_devices_by_group_scene(UUID) TO authenticated;

-- ============================================================================
-- 7. RPC: publish_scene_to_multiple_groups
-- ============================================================================
-- Publish a scene to multiple groups at once

CREATE OR REPLACE FUNCTION public.publish_scene_to_multiple_groups(
  p_group_ids uuid[],
  p_scene_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_group_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_total_devices integer := 0;
BEGIN
  FOREACH v_group_id IN ARRAY p_group_ids
  LOOP
    SELECT public.publish_scene_to_group(v_group_id, p_scene_id, true) INTO v_result;
    v_results := v_results || jsonb_build_array(v_result);
    v_total_devices := v_total_devices + COALESCE((v_result->>'devicesUpdated')::integer, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'groupsUpdated', array_length(p_group_ids, 1),
    'totalDevicesUpdated', v_total_devices,
    'details', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.publish_scene_to_multiple_groups(uuid[], uuid) TO authenticated;

COMMENT ON FUNCTION public.publish_scene_to_multiple_groups IS
  'Publish a scene to multiple screen groups at once';

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON COLUMN public.screen_groups.active_scene_id IS
  'Default scene for all devices in this group (can be overridden per-device)';

DO $$ BEGIN
  RAISE NOTICE 'Migration 073 completed: Screen group scene publishing with group-based content resolution';
END $$;
