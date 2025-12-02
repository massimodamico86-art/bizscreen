-- =====================================================
-- BIZSCREEN: PLAYER API FUNCTIONS
-- =====================================================
-- Provides SECURITY DEFINER functions for anonymous TV players
-- to fetch playlist content without requiring authentication.
--
-- Similar to get_device_config() but for playlist-based playback.
-- =====================================================

-- =====================================================
-- PLAYER HEARTBEAT FUNCTION
-- =====================================================
-- Updates last_seen timestamp for a screen

CREATE OR REPLACE FUNCTION public.player_heartbeat(p_screen_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tv_devices
  SET last_seen = NOW(),
      is_online = true
  WHERE id = p_screen_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.player_heartbeat(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.player_heartbeat(UUID) TO authenticated;

COMMENT ON FUNCTION public.player_heartbeat(UUID) IS 'Updates last_seen for a TV screen - called periodically by player';

-- =====================================================
-- GET PLAYER CONTENT BY OTP
-- =====================================================
-- Initial pairing: fetch content using OTP code, returns screenId

CREATE OR REPLACE FUNCTION public.get_player_content_by_otp(p_otp TEXT)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_playlist playlists%ROWTYPE;
  v_items JSONB;
  v_result JSONB;
BEGIN
  -- Find the TV device by OTP code
  SELECT * INTO v_device
  FROM public.tv_devices
  WHERE otp_code = UPPER(TRIM(p_otp))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid pairing code';
  END IF;

  -- Update heartbeat
  UPDATE public.tv_devices
  SET last_seen = NOW(),
      is_online = true
  WHERE id = v_device.id;

  -- Get assigned playlist if any
  IF v_device.assigned_playlist_id IS NOT NULL THEN
    SELECT * INTO v_playlist
    FROM public.playlists
    WHERE id = v_device.assigned_playlist_id;
  END IF;

  -- Get playlist items with media (including config for apps)
  IF v_device.assigned_playlist_id IS NOT NULL THEN
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
    WHERE pi.playlist_id = v_device.assigned_playlist_id;
  ELSE
    v_items := '[]'::jsonb;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'screenId', v_device.id,
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

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_player_content_by_otp(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_content_by_otp(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_player_content_by_otp(TEXT) IS 'Fetches player content for a TV screen using OTP pairing code';

-- =====================================================
-- GET PLAYER CONTENT BY SCREEN ID
-- =====================================================
-- Subsequent fetches: use stored screen ID

CREATE OR REPLACE FUNCTION public.get_player_content(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_playlist playlists%ROWTYPE;
  v_items JSONB;
  v_result JSONB;
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

  -- Get assigned playlist if any
  IF v_device.assigned_playlist_id IS NOT NULL THEN
    SELECT * INTO v_playlist
    FROM public.playlists
    WHERE id = v_device.assigned_playlist_id;
  END IF;

  -- Get playlist items with media (including config for apps)
  IF v_device.assigned_playlist_id IS NOT NULL THEN
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
    WHERE pi.playlist_id = v_device.assigned_playlist_id;
  ELSE
    v_items := '[]'::jsonb;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
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

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_player_content(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_content(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_player_content(UUID) IS 'Fetches player content for a TV screen by screen ID';

-- =====================================================
-- CHECK FOR PLAYER UPDATES
-- =====================================================
-- Lightweight check to see if playlist has changed

CREATE OR REPLACE FUNCTION public.check_player_updates(p_screen_id UUID, p_last_playlist_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_current_playlist_id UUID;
  v_content JSONB;
BEGIN
  -- Update heartbeat
  UPDATE public.tv_devices
  SET last_seen = NOW(),
      is_online = true
  WHERE id = p_screen_id;

  -- Get current playlist assignment
  SELECT assigned_playlist_id INTO v_current_playlist_id
  FROM public.tv_devices
  WHERE id = p_screen_id;

  -- If playlist hasn't changed, return no changes
  IF v_current_playlist_id IS NOT DISTINCT FROM p_last_playlist_id THEN
    RETURN jsonb_build_object('hasChanges', false);
  END IF;

  -- Playlist changed, fetch full content
  SELECT public.get_player_content(p_screen_id) INTO v_content;

  RETURN jsonb_build_object(
    'hasChanges', true,
    'content', v_content
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_player_updates(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_player_updates(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.check_player_updates(UUID, UUID) IS 'Checks if player content has changed since last fetch';

-- =====================================================
-- END OF PLAYER API FUNCTIONS
-- =====================================================
