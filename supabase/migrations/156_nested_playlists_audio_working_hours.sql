-- ============================================
-- Migration 156: Nested Playlists, Background Audio, Working Hours
-- ============================================
-- Extends the content model with three orthogonal features:
-- 1. Nested playlists with circular reference prevention (NEST-03, NEST-04)
-- 2. Background audio on playlists (AUDIO-04)
-- 3. Working hours schedule on screens (POWER-01)
-- 4. Validation RPC for service-layer pre-check
-- 5. Helper function for flattening nested playlists
-- 6. Updated get_resolved_player_content with all new data
--
-- Requirements: NEST-03, NEST-04, AUDIO-04
-- ============================================

-- ============================================
-- Section 1: Extend playlist_items item_type CHECK constraint
-- ============================================
-- Add 'playlist' as a valid item_type to support nested playlists

ALTER TABLE public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_item_type_check;
ALTER TABLE public.playlist_items ADD CONSTRAINT playlist_items_item_type_check
  CHECK (item_type IN ('media', 'app', 'layout', 'web_page', 'playlist'));

-- ============================================
-- Section 2: Circular reference prevention trigger
-- ============================================
-- BEFORE INSERT/UPDATE trigger on playlist_items that:
-- 1. Rejects direct self-references (A -> A)
-- 2. Detects multi-step cycles via ancestry walk (A -> B -> C -> A)
-- 3. Enforces max nesting depth of 5 levels
-- Safety brake: depth < 6 in both CTEs to prevent runaway recursion

CREATE OR REPLACE FUNCTION public.check_playlist_nesting()
RETURNS TRIGGER AS $$
DECLARE
  v_has_cycle BOOLEAN;
  v_ancestor_depth INTEGER;
  v_descendant_depth INTEGER;
  v_total_depth INTEGER;
BEGIN
  -- Only check when item_type is 'playlist'
  IF NEW.item_type != 'playlist' THEN
    RETURN NEW;
  END IF;

  -- Fast path: reject direct self-reference
  IF NEW.item_id = NEW.playlist_id THEN
    RAISE EXCEPTION 'Cannot add a playlist to itself'
      USING ERRCODE = 'P0001';
  END IF;

  -- Walk UP: find all ancestor playlists of the playlist we are inserting INTO
  -- If the child playlist (NEW.item_id) appears as an ancestor, we have a cycle
  WITH RECURSIVE ancestry AS (
    -- Start: the playlist we are inserting into
    SELECT NEW.playlist_id AS pid, 1 AS depth
    UNION ALL
    -- Walk up: find parent playlists that contain ancestry.pid as a nested playlist
    SELECT pi.playlist_id, a.depth + 1
    FROM public.playlist_items pi
    JOIN ancestry a ON pi.item_id = a.pid
    WHERE pi.item_type = 'playlist'
      AND a.depth < 6  -- safety brake
  )
  SELECT
    EXISTS(SELECT 1 FROM ancestry WHERE pid = NEW.item_id),
    COALESCE(MAX(depth), 1)
  INTO v_has_cycle, v_ancestor_depth
  FROM ancestry;

  IF v_has_cycle THEN
    RAISE EXCEPTION 'Circular playlist reference detected'
      USING ERRCODE = 'P0001';
  END IF;

  -- Walk DOWN: find all descendant playlists of the child playlist (NEW.item_id)
  -- This determines how deep the subtree goes below the insertion point
  WITH RECURSIVE descendants AS (
    -- Start: the playlist we are inserting (the child)
    SELECT NEW.item_id AS pid, 1 AS depth
    UNION ALL
    -- Walk down: find playlists nested inside descendants
    SELECT pi.item_id, d.depth + 1
    FROM public.playlist_items pi
    JOIN descendants d ON pi.playlist_id = d.pid
    WHERE pi.item_type = 'playlist'
      AND d.depth < 6  -- safety brake
  )
  SELECT COALESCE(MAX(depth), 1)
  INTO v_descendant_depth
  FROM descendants;

  -- Total depth = how far up the ancestry goes + how far down the descendants go
  v_total_depth := v_ancestor_depth + v_descendant_depth;

  IF v_total_depth > 5 THEN
    RAISE EXCEPTION 'Playlist nesting depth exceeds maximum of 5 levels'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_playlist_nesting_trigger
  BEFORE INSERT OR UPDATE ON public.playlist_items
  FOR EACH ROW EXECUTE FUNCTION public.check_playlist_nesting();

-- Partial index for fast nesting lookups
CREATE INDEX IF NOT EXISTS idx_playlist_items_nesting
  ON public.playlist_items(playlist_id, item_type)
  WHERE item_type = 'playlist';

-- ============================================
-- Section 3: Background audio columns on playlists
-- ============================================
-- Allows assigning an audio media asset as background music for a playlist

ALTER TABLE public.playlists
ADD COLUMN IF NOT EXISTS background_audio_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE public.playlists
ADD COLUMN IF NOT EXISTS background_audio_volume INTEGER DEFAULT 100
  CHECK (background_audio_volume >= 0 AND background_audio_volume <= 100);

CREATE INDEX IF NOT EXISTS idx_playlists_background_audio
  ON public.playlists(background_audio_id)
  WHERE background_audio_id IS NOT NULL;

-- ============================================
-- Section 4: Working hours JSONB on tv_devices
-- ============================================
-- Per-screen on/off schedule. NULL = always on (default behavior).

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT NULL;

COMMENT ON COLUMN public.tv_devices.working_hours IS
  'Per-day working hours schedule. Shape: {"0":{"enabled":true,"start":"08:00","end":"18:00"},...,"6":{...}} where keys are DOW (0=Sun..6=Sat). NULL = always on.';

-- ============================================
-- Section 5: Validation RPC for service-layer pre-check
-- ============================================
-- Returns false instead of raising an exception, giving the service layer
-- a fast pre-check before attempting the insert.

CREATE OR REPLACE FUNCTION public.check_playlist_nesting_valid(
  p_parent_id UUID,
  p_child_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_cycle BOOLEAN;
  v_ancestor_depth INTEGER;
  v_descendant_depth INTEGER;
  v_total_depth INTEGER;
BEGIN
  -- Self-reference check
  IF p_parent_id = p_child_id THEN
    RETURN FALSE;
  END IF;

  -- Walk UP: ancestors of the parent
  WITH RECURSIVE ancestry AS (
    SELECT p_parent_id AS pid, 1 AS depth
    UNION ALL
    SELECT pi.playlist_id, a.depth + 1
    FROM public.playlist_items pi
    JOIN ancestry a ON pi.item_id = a.pid
    WHERE pi.item_type = 'playlist'
      AND a.depth < 6
  )
  SELECT
    EXISTS(SELECT 1 FROM ancestry WHERE pid = p_child_id),
    COALESCE(MAX(depth), 1)
  INTO v_has_cycle, v_ancestor_depth
  FROM ancestry;

  IF v_has_cycle THEN
    RETURN FALSE;
  END IF;

  -- Walk DOWN: descendants of the child
  WITH RECURSIVE descendants AS (
    SELECT p_child_id AS pid, 1 AS depth
    UNION ALL
    SELECT pi.item_id, d.depth + 1
    FROM public.playlist_items pi
    JOIN descendants d ON pi.playlist_id = d.pid
    WHERE pi.item_type = 'playlist'
      AND d.depth < 6
  )
  SELECT COALESCE(MAX(depth), 1)
  INTO v_descendant_depth
  FROM descendants;

  v_total_depth := v_ancestor_depth + v_descendant_depth;

  IF v_total_depth > 5 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_playlist_nesting_valid(UUID, UUID) TO authenticated;

-- ============================================
-- Section 6: Helper function to flatten nested playlists
-- ============================================
-- Recursively expands nested playlists into a flat list of leaf content items.
-- Only returns non-playlist items (media, app, layout, web_page).
-- Respects max depth of 5 levels. Orders by depth then position.

CREATE OR REPLACE FUNCTION public.flatten_playlist_items(p_playlist_id UUID)
RETURNS TABLE(
  item_id UUID,
  item_type TEXT,
  position INTEGER,
  duration INTEGER,
  depth INTEGER,
  source_playlist_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE playlist_tree AS (
    -- Base: the root playlist itself at depth 0
    SELECT p_playlist_id AS playlist_id, 0 AS depth

    UNION ALL

    -- Recursive: find nested playlists referenced as items
    SELECT pi.item_id AS playlist_id, pt.depth + 1
    FROM playlist_tree pt
    JOIN public.playlist_items pi ON pi.playlist_id = pt.playlist_id
    WHERE pi.item_type = 'playlist'
      AND pt.depth < 5  -- safety brake: max 5 levels of nesting
  )
  -- Now select all non-playlist items from every playlist in the tree
  SELECT
    pi.item_id,
    pi.item_type,
    pi.position,
    pi.duration,
    pt.depth + 1 AS depth,  -- depth 1 = direct items of root
    pi.playlist_id AS source_playlist_id
  FROM playlist_tree pt
  JOIN public.playlist_items pi ON pi.playlist_id = pt.playlist_id
  WHERE pi.item_type != 'playlist'
  ORDER BY pt.depth, pi.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.flatten_playlist_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flatten_playlist_items(UUID) TO anon;

-- ============================================
-- Section 7: Updated get_resolved_player_content
-- ============================================
-- Modifications from migration 147:
-- 1. working_hours added to device object in ALL return paths
-- 2. backgroundAudioUrl and backgroundAudioVolume in playlist responses
-- 3. Nested playlists flattened via flatten_playlist_items helper

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
  -- Background audio (new in migration 156)
  v_audio_url TEXT;
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
          'orientation', COALESCE(v_device.orientation, 'landscape'),
          'working_hours', v_device.working_hours
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
        -- Resolve background audio URL from media_assets
        v_audio_url := NULL;
        IF v_playlist.background_audio_id IS NOT NULL THEN
          SELECT url INTO v_audio_url FROM public.media_assets WHERE id = v_playlist.background_audio_id;
        END IF;

        -- Use flatten_playlist_items to expand nested playlists
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', fi.item_id,
            'position', fi.position,
            'type', fi.item_type,
            'mediaType', COALESCE(ma.type, 'unknown'),
            'url', COALESCE(ma.url, ''),
            'thumbnailUrl', COALESCE(ma.thumbnail_url, ''),
            'name', COALESCE(ma.name, ''),
            'duration', COALESCE(fi.duration, ma.duration, COALESCE(v_playlist.default_duration, 10)),
            'width', ma.width,
            'height', ma.height,
            'config', ma.config_json
          )
          ORDER BY fi.depth, fi.position
        ), '[]'::jsonb) INTO v_items
        FROM public.flatten_playlist_items(v_playlist.id) fi
        LEFT JOIN public.media_assets ma ON fi.item_id = ma.id;

        RETURN jsonb_build_object(
          'mode', 'playlist',
          'source', 'campaign',
          'device', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.device_name,
            'timezone', COALESCE(v_device.timezone, 'UTC'),
            'display_language', v_device_language,
            'orientation', COALESCE(v_device.orientation, 'landscape'),
            'working_hours', v_device.working_hours
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
            'shuffle', COALESCE(v_playlist.shuffle, false),
            'backgroundAudioUrl', v_audio_url,
            'backgroundAudioVolume', COALESCE(v_playlist.background_audio_volume, 100)
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
            'orientation', COALESCE(v_device.orientation, 'landscape'),
            'working_hours', v_device.working_hours
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
            'orientation', COALESCE(v_device.orientation, 'landscape'),
            'working_hours', v_device.working_hours
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
            'orientation', COALESCE(v_device.orientation, 'landscape'),
            'working_hours', v_device.working_hours
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
        'orientation', COALESCE(v_device.orientation, 'landscape'),
        'working_hours', v_device.working_hours
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

      -- Resolve background audio URL
      v_audio_url := NULL;
      IF v_playlist.background_audio_id IS NOT NULL THEN
        SELECT file_url INTO v_audio_url FROM public.media_assets WHERE id = v_playlist.background_audio_id;
        -- Fallback to url column if file_url is NULL
        IF v_audio_url IS NULL THEN
          SELECT url INTO v_audio_url FROM public.media_assets WHERE id = v_playlist.background_audio_id;
        END IF;
      END IF;

      -- Use flatten_playlist_items to expand nested playlists
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', fi.item_id,
          'position', fi.position,
          'type', fi.item_type,
          'mediaType', COALESCE(ma.type, 'unknown'),
          'url', COALESCE(ma.url, ''),
          'thumbnailUrl', COALESCE(ma.thumbnail_url, ''),
          'name', COALESCE(ma.name, ''),
          'duration', COALESCE(fi.duration, ma.duration, COALESCE(v_playlist.default_duration, 10)),
          'width', ma.width,
          'height', ma.height,
          'config', ma.config_json
        )
        ORDER BY fi.depth, fi.position
      ), '[]'::jsonb) INTO v_items
      FROM public.flatten_playlist_items(v_playlist_id) fi
      LEFT JOIN public.media_assets ma ON fi.item_id = ma.id;
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
        'orientation', COALESCE(v_device.orientation, 'landscape'),
        'working_hours', v_device.working_hours
      ),
      'playlist', CASE
        WHEN v_playlist.id IS NOT NULL THEN
          jsonb_build_object(
            'id', v_playlist.id,
            'name', v_playlist.name,
            'defaultDuration', COALESCE(v_playlist.default_duration, 10),
            'transitionEffect', COALESCE(v_playlist.transition_effect, 'fade'),
            'shuffle', COALESCE(v_playlist.shuffle, false),
            'backgroundAudioUrl', v_audio_url,
            'backgroundAudioVolume', COALESCE(v_playlist.background_audio_volume, 100)
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
  'Resolves and returns player content based on priority: Emergency (999) > Campaign > Device Scene > Group Scene > Schedule > Legacy Schedule > Assigned Layout > Assigned Playlist. Device object includes orientation and working_hours. Playlist object includes backgroundAudioUrl and backgroundAudioVolume. Nested playlists are flattened via flatten_playlist_items helper.';

-- ============================================
-- Done
-- ============================================

DO $$ BEGIN
  RAISE NOTICE 'Migration 156 completed: Nested playlists (circular ref trigger + depth limit), background audio columns, working hours, flatten helper, and updated player content RPC';
END $$;
