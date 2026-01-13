-- Migration 074: Scene Scheduling
--
-- This migration extends the scheduling system to support Scenes as content targets.
-- Users can now schedule which Scene plays at what time across devices and groups.
--
-- Changes:
-- 1. Add 'scene' to schedule_entries target_type constraint
-- 2. Add timezone column to schedules table
-- 3. Add schedule assignment to screen_groups
-- 4. Create get_scheduled_scene_for_device function
-- 5. Update player content resolution to check schedules

-- ============================================================================
-- 1. Add 'scene' to target_type constraint in schedule_entries
-- ============================================================================

-- Drop the existing constraint and add a new one with 'scene'
ALTER TABLE public.schedule_entries
DROP CONSTRAINT IF EXISTS schedule_entries_target_type_check;

-- Update any invalid target_type values to 'playlist' (safe default)
UPDATE public.schedule_entries
SET target_type = 'playlist'
WHERE target_type IS NULL OR target_type NOT IN ('playlist', 'layout', 'media', 'scene');

ALTER TABLE public.schedule_entries
ADD CONSTRAINT schedule_entries_target_type_check
CHECK (target_type IN ('playlist', 'layout', 'media', 'scene'));

COMMENT ON COLUMN public.schedule_entries.target_type IS
  'Type of content to show: playlist, layout, media, or scene';

-- ============================================================================
-- 2. Add timezone column to schedules table
-- ============================================================================

ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

COMMENT ON COLUMN public.schedules.timezone IS
  'Timezone for schedule time calculations (e.g., America/New_York)';

-- ============================================================================
-- 3. Add assigned_schedule_id to screen_groups
-- ============================================================================

ALTER TABLE public.screen_groups
ADD COLUMN IF NOT EXISTS assigned_schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_screen_groups_assigned_schedule_id
ON public.screen_groups(assigned_schedule_id);

COMMENT ON COLUMN public.screen_groups.assigned_schedule_id IS
  'Schedule assigned to all devices in this group';

-- ============================================================================
-- 4. RPC: resolve_scene_schedule(device_id, timezone)
-- ============================================================================
-- Returns the currently active scene from schedule for a device
-- Checks both device schedule and group schedule

CREATE OR REPLACE FUNCTION public.resolve_scene_schedule(
  p_device_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
  schedule_id UUID,
  entry_id UUID,
  scene_id UUID,
  scene_name TEXT,
  priority INTEGER
) AS $$
DECLARE
  v_device RECORD;
  v_schedule_id UUID;
  v_current_time TIME;
  v_current_dow INTEGER;
BEGIN
  -- Get device info
  SELECT td.id, td.assigned_schedule_id, td.screen_group_id, COALESCE(td.timezone, p_timezone) as tz
  INTO v_device
  FROM public.tv_devices td
  WHERE td.id = p_device_id;

  IF v_device.id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate current time and day of week in the device's timezone
  v_current_time := (NOW() AT TIME ZONE v_device.tz)::TIME;
  v_current_dow := EXTRACT(DOW FROM NOW() AT TIME ZONE v_device.tz)::INTEGER;

  -- First, check device's own schedule
  v_schedule_id := v_device.assigned_schedule_id;

  -- If no device schedule, check group schedule
  IF v_schedule_id IS NULL AND v_device.screen_group_id IS NOT NULL THEN
    SELECT sg.assigned_schedule_id INTO v_schedule_id
    FROM public.screen_groups sg
    WHERE sg.id = v_device.screen_group_id;
  END IF;

  -- If no schedule, return empty
  IF v_schedule_id IS NULL THEN
    RETURN;
  END IF;

  -- Find matching schedule entries for scenes
  RETURN QUERY
  SELECT
    se.schedule_id,
    se.id AS entry_id,
    se.target_id AS scene_id,
    s.name AS scene_name,
    se.priority
  FROM public.schedule_entries se
  JOIN public.scenes s ON se.target_id = s.id AND s.is_active = true
  WHERE se.schedule_id = v_schedule_id
    AND se.target_type = 'scene'
    AND se.is_active = true
    AND (se.days_of_week IS NULL OR v_current_dow = ANY(se.days_of_week))
    AND (
      (se.start_time IS NULL AND se.end_time IS NULL)
      OR (se.start_time <= v_current_time AND se.end_time > v_current_time)
      OR (se.start_time <= v_current_time AND se.end_time <= se.start_time) -- overnight schedules
      OR (se.end_time > v_current_time AND se.end_time <= se.start_time) -- overnight schedules
    )
  ORDER BY se.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_scene_schedule(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_scene_schedule(UUID, TEXT) TO anon;

COMMENT ON FUNCTION public.resolve_scene_schedule IS
  'Get the currently scheduled scene for a device based on time and day of week';

-- ============================================================================
-- 5. Update get_resolved_player_content to include schedule-based scenes
-- ============================================================================
-- Priority order:
-- 1. device.active_scene_id (manual override - highest priority)
-- 2. group.active_scene_id (group override)
-- 3. Schedule-based scene (from resolve_scene_schedule)
-- 4. Legacy schedule entries (playlist/layout/media)
-- 5. assigned_layout_id fallback
-- 6. assigned_playlist_id fallback

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
  v_source := NULL;

  -- =========================================================================
  -- Step 0: Check for active scene (highest priority - manual override)
  -- =========================================================================
  IF v_device.active_scene_id IS NOT NULL THEN
    SELECT * INTO v_scene
    FROM public.scenes
    WHERE id = v_device.active_scene_id AND is_active = true;

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

  -- =========================================================================
  -- Step 1: Check group's active scene (if no device override)
  -- =========================================================================
  IF v_layout_id IS NULL AND v_playlist_id IS NULL AND v_device.screen_group_id IS NOT NULL THEN
    SELECT sg.active_scene_id INTO v_group_scene_id
    FROM public.screen_groups sg
    WHERE sg.id = v_device.screen_group_id;

    IF v_group_scene_id IS NOT NULL THEN
      SELECT * INTO v_scene
      FROM public.scenes
      WHERE id = v_group_scene_id AND is_active = true;

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

  -- =========================================================================
  -- Step 2: Check scheduled scene (if no manual override)
  -- =========================================================================
  IF v_layout_id IS NULL AND v_playlist_id IS NULL THEN
    SELECT * INTO v_scheduled_scene
    FROM public.resolve_scene_schedule(p_screen_id, COALESCE(v_device.timezone, 'UTC'))
    LIMIT 1;

    IF v_scheduled_scene.scene_id IS NOT NULL THEN
      SELECT * INTO v_scene
      FROM public.scenes
      WHERE id = v_scheduled_scene.scene_id AND is_active = true;

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

  -- =========================================================================
  -- Step 3: Check legacy schedule entries (playlist/layout/media)
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
            'timezone', COALESCE(v_device.timezone, 'UTC')
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
      'source', v_source,
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
-- 6. RPC: assign_schedule_to_device(device_id, schedule_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_schedule_to_device(
  p_device_id UUID,
  p_schedule_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_device_name TEXT;
BEGIN
  -- Verify device exists
  SELECT device_name INTO v_device_name
  FROM public.tv_devices
  WHERE id = p_device_id;

  IF v_device_name IS NULL THEN
    RAISE EXCEPTION 'Device not found: %', p_device_id;
  END IF;

  -- Verify schedule exists (if provided)
  IF p_schedule_id IS NOT NULL THEN
    PERFORM 1 FROM public.schedules WHERE id = p_schedule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Schedule not found: %', p_schedule_id;
    END IF;
  END IF;

  -- Update device
  UPDATE public.tv_devices
  SET assigned_schedule_id = p_schedule_id,
      needs_refresh = true,
      updated_at = NOW()
  WHERE id = p_device_id;

  RETURN jsonb_build_object(
    'success', true,
    'deviceId', p_device_id,
    'deviceName', v_device_name,
    'scheduleId', p_schedule_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_schedule_to_device(UUID, UUID) TO authenticated;

-- ============================================================================
-- 7. RPC: assign_schedule_to_group(group_id, schedule_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_schedule_to_group(
  p_group_id UUID,
  p_schedule_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_group_name TEXT;
  v_device_count INTEGER;
BEGIN
  -- Verify group exists
  SELECT name INTO v_group_name
  FROM public.screen_groups
  WHERE id = p_group_id;

  IF v_group_name IS NULL THEN
    RAISE EXCEPTION 'Screen group not found: %', p_group_id;
  END IF;

  -- Verify schedule exists (if provided)
  IF p_schedule_id IS NOT NULL THEN
    PERFORM 1 FROM public.schedules WHERE id = p_schedule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Schedule not found: %', p_schedule_id;
    END IF;
  END IF;

  -- Update group
  UPDATE public.screen_groups
  SET assigned_schedule_id = p_schedule_id,
      updated_at = NOW()
  WHERE id = p_group_id;

  -- Mark all devices in group for refresh
  UPDATE public.tv_devices
  SET needs_refresh = true
  WHERE screen_group_id = p_group_id;

  GET DIAGNOSTICS v_device_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'groupId', p_group_id,
    'groupName', v_group_name,
    'scheduleId', p_schedule_id,
    'devicesRefreshed', v_device_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_schedule_to_group(UUID, UUID) TO authenticated;

-- ============================================================================
-- 8. View: v_schedules_with_usage
-- ============================================================================
-- Shows schedules with count of devices and groups using them

CREATE OR REPLACE VIEW public.v_schedules_with_usage AS
SELECT
  s.*,
  COALESCE(d.device_count, 0) AS device_count,
  COALESCE(g.group_count, 0) AS group_count,
  COALESCE(e.entry_count, 0) AS entry_count
FROM public.schedules s
LEFT JOIN (
  SELECT assigned_schedule_id, COUNT(*) AS device_count
  FROM public.tv_devices
  WHERE assigned_schedule_id IS NOT NULL
  GROUP BY assigned_schedule_id
) d ON s.id = d.assigned_schedule_id
LEFT JOIN (
  SELECT assigned_schedule_id, COUNT(*) AS group_count
  FROM public.screen_groups
  WHERE assigned_schedule_id IS NOT NULL
  GROUP BY assigned_schedule_id
) g ON s.id = g.assigned_schedule_id
LEFT JOIN (
  SELECT schedule_id, COUNT(*) AS entry_count
  FROM public.schedule_entries
  GROUP BY schedule_id
) e ON s.id = e.schedule_id;

GRANT SELECT ON public.v_schedules_with_usage TO authenticated;

-- ============================================================================
-- 9. RPC: get_schedule_preview(schedule_id, timezone, date)
-- ============================================================================
-- Returns what content would play at each hour of a given date

CREATE OR REPLACE FUNCTION public.get_schedule_preview(
  p_schedule_id UUID,
  p_timezone TEXT DEFAULT 'UTC',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hour INTEGER,
  entry_id UUID,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  priority INTEGER
) AS $$
DECLARE
  v_dow INTEGER;
  v_hour INTEGER;
  v_time TIME;
BEGIN
  -- Get day of week for the date
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

  -- For each hour, find active entry
  FOR v_hour IN 0..23 LOOP
    v_time := (v_hour || ':30')::TIME; -- Use middle of hour for matching

    RETURN QUERY
    SELECT
      v_hour AS hour,
      se.id AS entry_id,
      se.target_type,
      se.target_id,
      COALESCE(
        sc.name,  -- scene
        pl.name,  -- playlist
        ly.name,  -- layout
        ma.name   -- media
      ) AS target_name,
      se.priority
    FROM public.schedule_entries se
    LEFT JOIN public.scenes sc ON se.target_type = 'scene' AND se.target_id = sc.id
    LEFT JOIN public.playlists pl ON se.target_type = 'playlist' AND se.target_id = pl.id
    LEFT JOIN public.layouts ly ON se.target_type = 'layout' AND se.target_id = ly.id
    LEFT JOIN public.media_assets ma ON se.target_type = 'media' AND se.target_id = ma.id
    WHERE se.schedule_id = p_schedule_id
      AND se.is_active = true
      AND (se.days_of_week IS NULL OR v_dow = ANY(se.days_of_week))
      AND (
        (se.start_time IS NULL AND se.end_time IS NULL)
        OR (se.start_time <= v_time AND se.end_time > v_time)
        OR (se.start_time <= v_time AND se.end_time <= se.start_time) -- overnight
        OR (se.end_time > v_time AND se.end_time <= se.start_time) -- overnight
      )
    ORDER BY se.priority DESC
    LIMIT 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_schedule_preview(UUID, TEXT, DATE) TO authenticated;

COMMENT ON FUNCTION public.get_schedule_preview IS
  'Preview what content plays at each hour for a schedule on a given date';

-- ============================================================================
-- 10. Comments
-- ============================================================================

COMMENT ON FUNCTION public.assign_schedule_to_device IS
  'Assign a schedule to a device (or null to clear)';

COMMENT ON FUNCTION public.assign_schedule_to_group IS
  'Assign a schedule to all devices in a screen group';

DO $$ BEGIN
  RAISE NOTICE 'Migration 074 completed: Scene scheduling with time-based content switching';
END $$;
