-- Migration 068: Add active_scene_id to tv_devices for Scene publishing
--
-- This migration:
-- 1. Adds active_scene_id column to tv_devices
-- 2. Updates get_resolved_player_content to check scene first
-- 3. Backwards compatible - existing behavior unchanged when active_scene_id is NULL

-- ============================================================================
-- 1. Add active_scene_id column to tv_devices
-- ============================================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS active_scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL;

-- Add index for scene lookups
CREATE INDEX IF NOT EXISTS idx_tv_devices_active_scene_id ON tv_devices(active_scene_id);

-- ============================================================================
-- 2. Update get_resolved_player_content to support scenes
-- ============================================================================
-- Priority order:
-- 1. active_scene_id (if set, use scene's layout + playlist)
-- 2. Schedule entries (existing)
-- 3. assigned_layout_id (existing)
-- 4. assigned_playlist_id (existing)

CREATE OR REPLACE FUNCTION public.get_resolved_player_content(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_scene scenes%ROWTYPE;
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
  -- NEW: Step 0 - Check for active scene (highest priority)
  -- =========================================================================
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
-- 3. Also update get_resolved_player_content_by_otp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_resolved_player_content_by_otp(p_otp TEXT)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_content JSONB;
BEGIN
  -- Find the TV device by OTP code
  SELECT * INTO v_device
  FROM public.tv_devices
  WHERE otp_code = UPPER(TRIM(p_otp))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid pairing code';
  END IF;

  -- Get resolved content (now includes scene support)
  SELECT public.get_resolved_player_content(v_device.id) INTO v_content;

  -- Add screenId for pairing
  v_content := v_content || jsonb_build_object('screenId', v_device.id);

  RETURN v_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Helper function to count devices using a scene
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_devices_by_scene(p_scene_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.tv_devices
  WHERE active_scene_id = p_scene_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.count_devices_by_scene(UUID) TO authenticated;

-- ============================================================================
-- 5. Comments
-- ============================================================================

COMMENT ON COLUMN tv_devices.active_scene_id IS 'Currently published scene - takes priority over all other assignments';
COMMENT ON FUNCTION count_devices_by_scene(UUID) IS 'Returns count of devices with a specific scene published';

DO $$ BEGIN RAISE NOTICE 'Migration 068 completed: active_scene_id added to tv_devices with scene-based player resolution'; END $$;
