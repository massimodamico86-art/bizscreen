-- ============================================
-- Migration 138: Campaign Rotation Weights
-- ============================================
-- Implements weighted random selection for campaign content rotation.
-- Integrates campaign resolution into get_resolved_player_content.
--
-- ANLY-02: Campaign rotation weights enforced in player content resolution
--
-- Key changes:
-- 1. select_weighted_campaign_content - Weighted random selection with single-item optimization
-- 2. get_active_campaign_for_screen - Uses weighted selection instead of LIMIT 1
-- 3. get_resolved_player_content - Campaign resolution in priority chain
--
-- Priority order: Emergency (999) > Campaign > Device Scene > Group Scene > Schedule > etc.
-- ============================================

-- ============================================
-- 1. Weighted content selection helper
-- ============================================

CREATE OR REPLACE FUNCTION public.select_weighted_campaign_content(p_campaign_id UUID)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID
)
LANGUAGE plpgsql
VOLATILE  -- Must be VOLATILE because random() is involved
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count items with positive weight
  SELECT COUNT(*)
  INTO v_count
  FROM public.campaign_contents cc
  WHERE cc.campaign_id = p_campaign_id
    AND COALESCE(cc.weight, 1) > 0;

  -- Single-item optimization: return directly without random overhead
  IF v_count = 1 THEN
    RETURN QUERY
    SELECT cc.content_type, cc.content_id
    FROM public.campaign_contents cc
    WHERE cc.campaign_id = p_campaign_id
      AND COALESCE(cc.weight, 1) > 0
    LIMIT 1;
    RETURN;
  END IF;

  -- No items found
  IF v_count = 0 THEN
    RETURN;
  END IF;

  -- Multiple items: weighted random selection using cumulative weights
  RETURN QUERY
  WITH weighted AS (
    SELECT
      cc.content_type,
      cc.content_id,
      COALESCE(cc.weight, 1) as weight,
      SUM(COALESCE(cc.weight, 1)) OVER (ORDER BY cc.position) as cumulative,
      SUM(COALESCE(cc.weight, 1)) OVER () as total
    FROM public.campaign_contents cc
    WHERE cc.campaign_id = p_campaign_id
      AND COALESCE(cc.weight, 1) > 0
  ),
  rnd AS (
    SELECT random() * (SELECT MAX(total) FROM weighted) as point
  )
  SELECT w.content_type, w.content_id
  FROM weighted w, rnd r
  WHERE w.cumulative > r.point
  ORDER BY w.cumulative
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.select_weighted_campaign_content(UUID) IS
'Selects campaign content using weighted random selection. Single-item campaigns return directly without random overhead. Null/zero weights are treated as weight=1.';

-- ============================================
-- 2. Update get_active_campaign_for_screen
-- ============================================

CREATE OR REPLACE FUNCTION public.get_active_campaign_for_screen(
    p_screen_id UUID,
    p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name TEXT,
    priority INTEGER,
    effective_target TEXT,
    content_type TEXT,
    content_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_screen RECORD;
    v_campaign RECORD;
    v_content RECORD;
BEGIN
    -- Get screen details
    SELECT
        d.id,
        d.tenant_id,
        d.screen_group_id,
        d.location_id
    INTO v_screen
    FROM public.tv_devices d
    WHERE d.id = p_screen_id;

    IF v_screen IS NULL THEN
        RETURN;
    END IF;

    -- Find the best active campaign targeting this screen
    -- Priority order: direct screen > screen_group > location > all
    -- Then by campaign priority (higher first)
    SELECT
        c.id AS campaign_id,
        c.name AS campaign_name,
        c.priority,
        ct.target_type AS effective_target,
        CASE ct.target_type
            WHEN 'screen' THEN 1
            WHEN 'screen_group' THEN 2
            WHEN 'location' THEN 3
            WHEN 'all' THEN 4
        END AS target_specificity
    INTO v_campaign
    FROM public.campaigns c
    INNER JOIN public.campaign_targets ct ON ct.campaign_id = c.id
    WHERE c.tenant_id = v_screen.tenant_id
      AND c.status IN ('active', 'scheduled')
      AND (c.start_at IS NULL OR c.start_at <= p_now)
      AND (c.end_at IS NULL OR c.end_at > p_now)
      AND (
          -- Target: specific screen
          (ct.target_type = 'screen' AND ct.target_id = p_screen_id)
          -- Target: screen's group
          OR (ct.target_type = 'screen_group' AND ct.target_id = v_screen.screen_group_id AND v_screen.screen_group_id IS NOT NULL)
          -- Target: screen's location
          OR (ct.target_type = 'location' AND ct.target_id = v_screen.location_id AND v_screen.location_id IS NOT NULL)
          -- Target: all screens
          OR (ct.target_type = 'all')
      )
    ORDER BY target_specificity ASC, c.priority DESC
    LIMIT 1;

    -- No campaign found
    IF v_campaign IS NULL THEN
        RETURN;
    END IF;

    -- Get weighted content selection for the campaign
    SELECT wc.content_type, wc.content_id
    INTO v_content
    FROM public.select_weighted_campaign_content(v_campaign.campaign_id) wc;

    -- No content in campaign
    IF v_content IS NULL THEN
        RETURN;
    END IF;

    -- Return result
    RETURN QUERY
    SELECT
        v_campaign.campaign_id,
        v_campaign.campaign_name,
        v_campaign.priority,
        v_campaign.effective_target,
        v_content.content_type,
        v_content.content_id;
END;
$$;

COMMENT ON FUNCTION public.get_active_campaign_for_screen IS
'Returns the highest priority active campaign targeting a screen with weighted content selection';

-- ============================================
-- 3. Update get_resolved_player_content
-- ============================================
-- Adds campaign resolution between Emergency and Device Scene checks
-- Priority: Emergency (999) > Campaign > Device Scene > Group Scene > Schedule > etc.

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
          'display_language', v_device_language
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
            'display_language', v_device_language
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
            'display_language', v_device_language
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
            'display_language', v_device_language
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
            'display_language', v_device_language
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
        'display_language', v_device_language
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
        'display_language', v_device_language
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
  'Resolves and returns player content based on priority: Emergency (999) > Campaign (weighted content selection) > Device Scene > Group Scene > Schedule > Legacy Schedule > Assigned Layout > Assigned Playlist. Emergency content bypasses language resolution. Campaign content uses weighted random selection when multiple items exist.';

-- ============================================
-- Done
-- ============================================

DO $$ BEGIN
  RAISE NOTICE 'Migration 138 completed: Campaign rotation weights with weighted random selection';
END $$;
