-- =====================================================
-- BIZSCREEN: PLAYER CONTENT RESOLUTION
-- =====================================================
-- Enhanced player API that resolves content based on:
-- 1. Active schedule entries (highest priority first)
-- 2. Fallback to assigned_layout_id
-- 3. Fallback to assigned_playlist_id
--
-- Returns content in two modes:
-- - 'playlist': Single playlist with items
-- - 'layout': Multi-zone layout with zone content
-- =====================================================

-- =====================================================
-- RESOLVE ACTIVE SCHEDULE ENTRY
-- =====================================================
-- Gets the currently active schedule entry for a screen
-- based on assigned_schedule_id, current time, and day of week

CREATE OR REPLACE FUNCTION public.resolve_schedule_entry(
  p_schedule_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE(
  target_type TEXT,
  target_id UUID,
  priority INTEGER
) AS $$
DECLARE
  v_current_day INTEGER;
  v_current_time TIME;
BEGIN
  -- Get current time in device timezone
  v_current_time := (NOW() AT TIME ZONE p_timezone)::TIME;
  v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE p_timezone)::INTEGER;

  RETURN QUERY
  SELECT
    se.target_type,
    se.target_id,
    se.priority
  FROM public.schedule_entries se
  JOIN public.schedules s ON se.schedule_id = s.id
  WHERE se.schedule_id = p_schedule_id
    AND s.is_active = true
    AND se.is_active = true
    AND v_current_day = ANY(se.days_of_week)
    AND (se.start_time IS NULL OR v_current_time >= se.start_time)
    AND (se.end_time IS NULL OR v_current_time <= se.end_time)
  ORDER BY se.priority DESC, se.start_time ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_schedule_entry(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_schedule_entry(UUID, TEXT) TO authenticated;

-- =====================================================
-- GET LAYOUT WITH ZONES CONTENT
-- =====================================================
-- Fetches a layout with all its zones and their content

CREATE OR REPLACE FUNCTION public.get_layout_content(p_layout_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_layout layouts%ROWTYPE;
  v_zones JSONB;
BEGIN
  -- Get layout
  SELECT * INTO v_layout
  FROM public.layouts
  WHERE id = p_layout_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get zones with their content
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', lz.id,
      'zone_name', lz.zone_name,
      'x_percent', lz.x_percent,
      'y_percent', lz.y_percent,
      'width_percent', lz.width_percent,
      'height_percent', lz.height_percent,
      'z_index', lz.z_index,
      'content', CASE
        WHEN lz.assigned_playlist_id IS NOT NULL THEN
          jsonb_build_object(
            'type', 'playlist',
            'playlist', (
              SELECT jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'defaultDuration', COALESCE(p.default_duration, 10),
                'transitionEffect', COALESCE(p.transition_effect, 'fade'),
                'shuffle', COALESCE(p.shuffle, false)
              )
              FROM public.playlists p
              WHERE p.id = lz.assigned_playlist_id
            ),
            'items', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', pi.id,
                  'position', pi.position,
                  'type', pi.item_type,
                  'mediaType', COALESCE(ma.type, 'unknown'),
                  'url', COALESCE(ma.url, ''),
                  'thumbnailUrl', COALESCE(ma.thumbnail_url, ''),
                  'name', COALESCE(ma.name, ''),
                  'duration', COALESCE(pi.duration, ma.duration, 10),
                  'width', ma.width,
                  'height', ma.height,
                  'config', ma.config_json
                )
                ORDER BY pi.position
              ), '[]'::jsonb)
              FROM public.playlist_items pi
              LEFT JOIN public.media_assets ma ON pi.item_id = ma.id
              WHERE pi.playlist_id = lz.assigned_playlist_id
            )
          )
        WHEN lz.assigned_media_id IS NOT NULL THEN
          jsonb_build_object(
            'type', 'media',
            'item', (
              SELECT jsonb_build_object(
                'id', ma.id,
                'mediaType', ma.type,
                'url', ma.url,
                'thumbnailUrl', ma.thumbnail_url,
                'name', ma.name,
                'duration', COALESCE(ma.duration, 10),
                'width', ma.width,
                'height', ma.height,
                'config', ma.config_json
              )
              FROM public.media_assets ma
              WHERE ma.id = lz.assigned_media_id
            )
          )
        ELSE NULL
      END
    )
    ORDER BY lz.z_index
  ), '[]'::jsonb) INTO v_zones
  FROM public.layout_zones lz
  WHERE lz.layout_id = p_layout_id;

  RETURN jsonb_build_object(
    'id', v_layout.id,
    'name', v_layout.name,
    'zones', v_zones
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_layout_content(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_layout_content(UUID) TO authenticated;

-- =====================================================
-- GET RESOLVED PLAYER CONTENT
-- =====================================================
-- Main function that resolves what content to show:
-- Schedule -> Layout -> Playlist

CREATE OR REPLACE FUNCTION public.get_resolved_player_content(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
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

  -- Step 1: Check for active schedule entry
  IF v_device.assigned_schedule_id IS NOT NULL THEN
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
          'items', v_items
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
      'layout', v_layout_content
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
      'items', v_items
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_resolved_player_content(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resolved_player_content(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_resolved_player_content(UUID) IS 'Resolves and returns player content based on schedule, layout, or playlist assignments';

-- =====================================================
-- GET RESOLVED PLAYER CONTENT BY OTP
-- =====================================================
-- Initial pairing version that also returns screenId

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

  -- Get resolved content
  SELECT public.get_resolved_player_content(v_device.id) INTO v_content;

  -- Add screenId for pairing
  v_content := v_content || jsonb_build_object('screenId', v_device.id);

  RETURN v_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_resolved_player_content_by_otp(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resolved_player_content_by_otp(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_resolved_player_content_by_otp(TEXT) IS 'Resolves player content by OTP code for initial pairing';

-- =====================================================
-- END OF PLAYER CONTENT RESOLUTION
-- =====================================================
