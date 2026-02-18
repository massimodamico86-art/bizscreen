-- ============================================
-- Migration 147: Portrait Mode Support
-- ============================================
-- Adds portrait orientation support to the platform:
-- 1. orientation column on tv_devices (landscape/portrait)
-- 2. get_layout_content returns aspect_ratio
-- 3. get_resolved_player_content returns orientation in device object
-- 4. Seeds 3 portrait layout templates
--
-- Requirements: PORT-01, PORT-04
-- ============================================

-- ============================================
-- Section 1: Add orientation column to tv_devices
-- ============================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS orientation TEXT DEFAULT 'landscape'
CHECK (orientation IN ('landscape', 'portrait'));

COMMENT ON COLUMN public.tv_devices.orientation IS 'Physical mounting orientation of the screen';

-- ============================================
-- Section 2: Update get_layout_content to include aspect_ratio
-- ============================================

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
    'aspect_ratio', COALESCE(v_layout.aspect_ratio, '16:9'),
    'zones', v_zones
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_layout_content(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_layout_content(UUID) TO authenticated;

-- ============================================
-- Section 3: Update get_resolved_player_content
-- to include orientation in every device object
-- ============================================

CREATE OR REPLACE FUNCTION public.get_resolved_player_content(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_scene scenes%ROWTYPE;
  v_group_scene_id uuid;
  v_scheduled_scene RECORD;
  v_schedule_entry RECORD;
  v_playlist_id UUID;
  v_layout_id UUID;
  v_playlist playlists%ROWTYPE;
  v_items JSONB;
  v_layout_content JSONB;
  v_result JSONB;
  v_mode TEXT;
  v_source TEXT;
  -- Language resolution
  v_resolved_scene_id UUID;
  v_device_language TEXT;
  -- Emergency variables
  v_emergency_content_id UUID;
  v_emergency_content_type TEXT;
  v_emergency_started_at TIMESTAMPTZ;
  v_emergency_duration_minutes INTEGER;
  v_emergency_expires_at TIMESTAMPTZ;
  -- Campaign variables
  v_campaign RECORD;
  v_campaign_content JSONB;
BEGIN
  -- Find the TV device
  SELECT * INTO v_device
  FROM public.tv_devices
  WHERE id = p_screen_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Screen not found';
  END IF;

  -- Language resolution order:
  -- 1. Device-level display_language (if set)
  -- 2. Group-level display_language (if device is in a group with language set)
  -- 3. Default 'en'
  v_device_language := COALESCE(
    v_device.display_language,
    (SELECT sg.display_language FROM screen_groups sg WHERE sg.id = v_device.screen_group_id),
    'en'
  );

  -- Update heartbeat
  UPDATE public.tv_devices
  SET last_seen = NOW(),
      is_online = true
  WHERE id = v_device.id;

  -- =====================================================
  -- EMERGENCY CHECK (Highest priority = 999)
  -- Emergency content has highest priority, overrides all schedules and campaigns
  -- NOTE: Emergency bypasses language resolution - it's the same for all devices
  -- =====================================================
  SELECT
    emergency_content_id,
    emergency_content_type,
    emergency_started_at,
    emergency_duration_minutes
  INTO
    v_emergency_content_id,
    v_emergency_content_type,
    v_emergency_started_at,
    v_emergency_duration_minutes
  FROM public.profiles
  WHERE id = v_device.tenant_id;

  -- Check if emergency is active
  IF v_emergency_content_id IS NOT NULL THEN
    -- Calculate expiry (NULL duration = indefinite)
    IF v_emergency_duration_minutes IS NOT NULL THEN
      v_emergency_expires_at := v_emergency_started_at + (v_emergency_duration_minutes || ' minutes')::interval;
    ELSE
      v_emergency_expires_at := NULL; -- Indefinite
    END IF;

    -- Check if emergency is still active (not expired)
    IF v_emergency_expires_at IS NULL OR v_emergency_expires_at > NOW() THEN
      -- Return emergency content (bypasses all other resolution including language)
      RETURN jsonb_build_object(
        'mode', v_emergency_content_type,
        'device', jsonb_build_object(
          'id', v_device.id,
          'name', v_device.device_name,
          'timezone', COALESCE(v_device.timezone, 'UTC'),
          'display_language', v_device_language,
          'orientation', COALESCE(v_device.orientation, 'landscape')
        ),
        'source', 'emergency',
        'priority', 999,
        'content_type', v_emergency_content_type,
        'content_id', v_emergency_content_id,
        'emergency', jsonb_build_object(
          'started_at', v_emergency_started_at,
          'duration_minutes', v_emergency_duration_minutes,
          'expires_at', v_emergency_expires_at
        )
      );
    ELSE
      -- Emergency expired, clear it (auto-cleanup)
      UPDATE public.profiles
      SET emergency_content_id = NULL,
          emergency_content_type = NULL,
          emergency_started_at = NULL,
          emergency_duration_minutes = NULL
      WHERE id = v_device.tenant_id;
    END IF;
  END IF;

  -- =====================================================
  -- CAMPAIGN CHECK (Priority between Emergency and Device Scene)
  -- Uses weighted random selection for content rotation
  -- =====================================================
  SELECT * INTO v_campaign
  FROM public.get_active_campaign_for_screen(p_screen_id, NOW());

  IF v_campaign.campaign_id IS NOT NULL THEN
    -- Resolve campaign content based on content_type
    IF v_campaign.content_type = 'playlist' THEN
      -- Get playlist content
      SELECT * INTO v_playlist
      FROM public.playlists
      WHERE id = v_campaign.content_id;

      IF v_playlist.id IS NOT NULL THEN
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
        WHERE pi.playlist_id = v_playlist.id;

        RETURN jsonb_build_object(
          'mode', 'playlist',
          'source', 'campaign',
          'device', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.device_name,
            'timezone', COALESCE(v_device.timezone, 'UTC'),
            'display_language', v_device_language,
            'orientation', COALESCE(v_device.orientation, 'landscape')
          ),
          'campaign', jsonb_build_object(
            'id', v_campaign.campaign_id,
            'name', v_campaign.campaign_name,
            'priority', v_campaign.priority,
            'target', v_campaign.effective_target
          ),
          'playlist', jsonb_build_object(
            'id', v_playlist.id,
            'name', v_playlist.name,
            'defaultDuration', COALESCE(v_playlist.default_duration, 10),
            'transitionEffect', COALESCE(v_playlist.transition_effect, 'fade'),
            'shuffle', COALESCE(v_playlist.shuffle, false)
          ),
          'items', v_items
        );
      END IF;

    ELSIF v_campaign.content_type = 'layout' THEN
      -- Get layout content
      SELECT public.get_layout_content(v_campaign.content_id) INTO v_layout_content;

      IF v_layout_content IS NOT NULL THEN
        RETURN jsonb_build_object(
          'mode', 'layout',
          'source', 'campaign',
          'device', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.device_name,
            'timezone', COALESCE(v_device.timezone, 'UTC'),
            'display_language', v_device_language,
            'orientation', COALESCE(v_device.orientation, 'landscape')
          ),
          'campaign', jsonb_build_object(
            'id', v_campaign.campaign_id,
            'name', v_campaign.campaign_name,
            'priority', v_campaign.priority,
            'target', v_campaign.effective_target
          ),
          'layout', v_layout_content
        );
      END IF;

    ELSIF v_campaign.content_type = 'media' THEN
      -- Single media item - wrap in playlist-like response
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
      ) INTO v_campaign_content
      FROM public.media_assets ma
      WHERE ma.id = v_campaign.content_id;

      IF v_campaign_content IS NOT NULL THEN
        RETURN jsonb_build_object(
          'mode', 'playlist',
          'source', 'campaign',
          'device', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.device_name,
            'timezone', COALESCE(v_device.timezone, 'UTC'),
            'display_language', v_device_language,
            'orientation', COALESCE(v_device.orientation, 'landscape')
          ),
          'campaign', jsonb_build_object(
            'id', v_campaign.campaign_id,
            'name', v_campaign.campaign_name,
            'priority', v_campaign.priority,
            'target', v_campaign.effective_target
          ),
          'playlist', NULL,
          'items', jsonb_build_array(v_campaign_content)
        );
      END IF;
    END IF;
  END IF;

  -- =====================================================
  -- NORMAL RESOLUTION (if no active emergency or campaign)
  -- =====================================================

  -- Initialize
  v_playlist_id := NULL;
  v_layout_id := NULL;
  v_mode := 'playlist';
  v_source := NULL;

  -- =========================================================================
  -- Step 0: Check for device active scene (highest priority - manual override)
  -- =========================================================================
  IF v_device.active_scene_id IS NOT NULL THEN
    -- Apply language resolution to get the correct variant
    v_resolved_scene_id := public.get_scene_for_device_language(
      v_device.active_scene_id,
      v_device_language
    );

    IF v_resolved_scene_id IS NOT NULL THEN
      SELECT * INTO v_scene
      FROM public.scenes
      WHERE id = v_resolved_scene_id AND is_active = true;

      IF v_scene.id IS NOT NULL THEN
        v_source := 'device_override';
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
  -- Step 1: Check group's active scene (if no device override)
  -- =========================================================================
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.screen_group_id IS NOT NULL THEN
    SELECT sg.active_scene_id INTO v_group_scene_id
    FROM public.screen_groups sg
    WHERE sg.id = v_device.screen_group_id;

    IF v_group_scene_id IS NOT NULL THEN
      -- Apply language resolution to get the correct variant
      v_resolved_scene_id := public.get_scene_for_device_language(
        v_group_scene_id,
        v_device_language
      );

      IF v_resolved_scene_id IS NOT NULL THEN
        SELECT * INTO v_scene
        FROM public.scenes
        WHERE id = v_resolved_scene_id AND is_active = true;

        IF v_scene.id IS NOT NULL THEN
          v_source := 'group_override';
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
  END IF;

  -- =========================================================================
  -- Step 2: Check scheduled scene (if no manual override)
  -- =========================================================================
  IF v_layout_id IS NULL AND v_playlist_id IS NULL THEN
    SELECT * INTO v_scheduled_scene
    FROM public.resolve_scene_schedule(p_screen_id, COALESCE(v_device.timezone, 'UTC'))
    LIMIT 1;

    IF v_scheduled_scene.scene_id IS NOT NULL THEN
      -- Apply language resolution to get the correct variant
      v_resolved_scene_id := public.get_scene_for_device_language(
        v_scheduled_scene.scene_id,
        v_device_language
      );

      IF v_resolved_scene_id IS NOT NULL THEN
        SELECT * INTO v_scene
        FROM public.scenes
        WHERE id = v_resolved_scene_id AND is_active = true;

        IF v_scene.id IS NOT NULL THEN
          v_source := 'schedule';
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
  END IF;

  -- =========================================================================
  -- Step 3: Check legacy schedule entries (playlist/layout/media)
  -- NOTE: These don't use language resolution - they're direct content references
  -- =========================================================================
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.assigned_schedule_id IS NOT NULL THEN
    SELECT * INTO v_schedule_entry
    FROM public.resolve_schedule_entry(
      v_device.assigned_schedule_id,
      COALESCE(v_device.timezone, 'UTC')
    );

    IF v_schedule_entry IS NOT NULL AND v_schedule_entry.target_id IS NOT NULL THEN
      v_source := 'legacy_schedule';
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
          'source', v_source,
          'device', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.device_name,
            'timezone', COALESCE(v_device.timezone, 'UTC'),
            'display_language', v_device_language,
            'orientation', COALESCE(v_device.orientation, 'landscape')
          ),
          'playlist', NULL,
          'items', v_items,
          'scene', NULL
        );
      END IF;
    END IF;
  END IF;

  -- Step 4: Fallback to assigned layout
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.assigned_layout_id IS NOT NULL THEN
    v_layout_id := v_device.assigned_layout_id;
    v_mode := 'layout';
    v_source := 'assigned_layout';
  END IF;

  -- Step 5: Fallback to assigned playlist
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.assigned_playlist_id IS NOT NULL THEN
    v_playlist_id := v_device.assigned_playlist_id;
    v_mode := 'playlist';
    v_source := 'assigned_playlist';
  END IF;

  -- Build response based on mode
  IF v_mode = 'layout' AND v_layout_id IS NOT NULL THEN
    -- Get layout content
    SELECT public.get_layout_content(v_layout_id) INTO v_layout_content;

    v_result := jsonb_build_object(
      'mode', 'layout',
      'source', v_source,
      'device', jsonb_build_object(
        'id', v_device.id,
        'name', v_device.device_name,
        'timezone', COALESCE(v_device.timezone, 'UTC'),
        'display_language', v_device_language,
        'orientation', COALESCE(v_device.orientation, 'landscape')
      ),
      'layout', v_layout_content,
      'scene', CASE WHEN v_scene.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_scene.id,
          'name', v_scene.name,
          'businessType', v_scene.business_type,
          'languageCode', v_scene.language_code
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
      'source', v_source,
      'device', jsonb_build_object(
        'id', v_device.id,
        'name', v_device.device_name,
        'timezone', COALESCE(v_device.timezone, 'UTC'),
        'display_language', v_device_language,
        'orientation', COALESCE(v_device.orientation, 'landscape')
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
          'businessType', v_scene.business_type,
          'languageCode', v_scene.language_code
        )
      ELSE NULL END
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION public.get_resolved_player_content(UUID) IS
  'Resolves and returns player content based on priority: Emergency (999) > Campaign (weighted content selection) > Device Scene > Group Scene > Schedule > Legacy Schedule > Assigned Layout > Assigned Playlist. Device object includes orientation field for portrait mode support.';

-- ============================================
-- Section 4: Seed 3 portrait layout templates
-- ============================================

INSERT INTO public.layout_templates (
  tenant_id, name, description, category, orientation,
  thumbnail_url, background_color, data,
  width, height, is_featured, is_active
) VALUES
-- 1. Portrait Info Board
(
  NULL,
  'Portrait Info Board',
  'Full-screen portrait layout for announcements and information displays.',
  'Information',
  '9_16',
  NULL,
  '#ffffff',
  '{"elements": [{"id": "zone-1", "type": "zone", "x": 0, "y": 0, "width": 100, "height": 100, "name": "Main Content"}]}'::jsonb,
  1080,
  1920,
  true,
  true
),
-- 2. Portrait Menu Strip
(
  NULL,
  'Portrait Menu Strip',
  'Vertical split layout ideal for menu items on top with promotions below.',
  'Restaurant',
  '9_16',
  NULL,
  '#1a1a2e',
  '{"elements": [{"id": "zone-1", "type": "zone", "x": 0, "y": 0, "width": 100, "height": 60, "name": "Menu Items"}, {"id": "zone-2", "type": "zone", "x": 0, "y": 60, "width": 100, "height": 40, "name": "Promotions"}]}'::jsonb,
  1080,
  1920,
  true,
  true
),
-- 3. Portrait Social Wall
(
  NULL,
  'Portrait Social Wall',
  'Triple-zone portrait layout for social feeds, news tickers, or multi-content displays.',
  'Social Media',
  '9_16',
  NULL,
  '#0f172a',
  '{"elements": [{"id": "zone-1", "type": "zone", "x": 0, "y": 0, "width": 100, "height": 33.33, "name": "Top Feed"}, {"id": "zone-2", "type": "zone", "x": 0, "y": 33.33, "width": 100, "height": 33.34, "name": "Middle Feed"}, {"id": "zone-3", "type": "zone", "x": 0, "y": 66.67, "width": 100, "height": 33.33, "name": "Bottom Feed"}]}'::jsonb,
  1080,
  1920,
  true,
  true
);

-- ============================================
-- Done
-- ============================================

DO $$ BEGIN
  RAISE NOTICE 'Migration 147 completed: Portrait mode support with orientation column, RPC updates, and portrait template seeds';
END $$;
