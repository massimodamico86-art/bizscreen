-- Migration: 079_playback_analytics.sql
-- Phase 19: Playback Analytics + Content Performance Dashboard
-- Extends existing playback_events with scene tracking, player status events, and aggregation views

-- ============================================================================
-- 1. ADD SCENE AND GROUP COLUMNS TO PLAYBACK_EVENTS
-- ============================================================================

-- Add scene_id column (nullable, FK to scenes)
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL;

-- Add group_id column (nullable, FK to screen_groups)
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.screen_groups(id) ON DELETE SET NULL;

-- Add schedule_id column for tracking scheduled content
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS schedule_id UUID;

-- Add event_type column for different types of events
-- Note: existing records will have NULL event_type (media playback)
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS event_type TEXT;

-- Add constraint for valid event types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'playback_events_event_type_check'
    ) THEN
        ALTER TABLE public.playback_events
        ADD CONSTRAINT playback_events_event_type_check
        CHECK (event_type IS NULL OR event_type IN ('scene_start', 'scene_end', 'player_online', 'player_offline', 'media_play'));
    END IF;
END $$;

-- Make started_at and ended_at optional for some event types
ALTER TABLE public.playback_events
ALTER COLUMN ended_at DROP NOT NULL;

ALTER TABLE public.playback_events
ALTER COLUMN duration_seconds DROP NOT NULL;

-- Add indexes for scene and group queries
CREATE INDEX IF NOT EXISTS idx_playback_events_scene_started
  ON public.playback_events(scene_id, started_at)
  WHERE scene_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_playback_events_group_started
  ON public.playback_events(group_id, started_at)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_playback_events_event_type
  ON public.playback_events(event_type, started_at)
  WHERE event_type IS NOT NULL;

-- Composite index for tenant + event_type queries
CREATE INDEX IF NOT EXISTS idx_playback_events_tenant_event_type
  ON public.playback_events(tenant_id, event_type, started_at);

-- ============================================================================
-- 2. SCENE PLAYBACK SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_scene_playback_summary AS
SELECT
  pe.scene_id,
  s.name as scene_name,
  s.tenant_id,
  SUM(COALESCE(pe.duration_seconds, 0))::BIGINT as total_duration_seconds,
  MAX(pe.started_at) as last_played_at,
  COUNT(DISTINCT pe.screen_id)::INT as device_count,
  COUNT(DISTINCT pe.group_id)::INT as group_count,
  COUNT(pe.id)::BIGINT as play_count
FROM public.playback_events pe
JOIN public.scenes s ON s.id = pe.scene_id
WHERE pe.scene_id IS NOT NULL
  AND pe.event_type IN ('scene_start', 'scene_end')
GROUP BY pe.scene_id, s.name, s.tenant_id;

COMMENT ON VIEW public.v_scene_playback_summary IS
'Aggregated scene playback statistics including total duration, device count, and group count';

-- Grant select on the view
GRANT SELECT ON public.v_scene_playback_summary TO authenticated;

-- ============================================================================
-- 3. RPC: INSERT PLAYBACK EVENTS (BATCH)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_playback_events(events JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_record JSONB;
  inserted_count INT := 0;
  error_count INT := 0;
BEGIN
  -- Iterate through the events array
  FOR event_record IN SELECT * FROM jsonb_array_elements(events)
  LOOP
    BEGIN
      INSERT INTO public.playback_events (
        tenant_id,
        screen_id,
        scene_id,
        group_id,
        location_id,
        playlist_id,
        layout_id,
        zone_id,
        media_id,
        app_id,
        schedule_id,
        item_type,
        event_type,
        started_at,
        ended_at,
        duration_seconds,
        player_session_id
      ) VALUES (
        (event_record->>'tenantId')::UUID,
        (event_record->>'screenId')::UUID,
        (event_record->>'sceneId')::UUID,
        (event_record->>'groupId')::UUID,
        (event_record->>'locationId')::UUID,
        (event_record->>'playlistId')::UUID,
        (event_record->>'layoutId')::UUID,
        (event_record->>'zoneId')::UUID,
        (event_record->>'mediaId')::UUID,
        (event_record->>'appId')::UUID,
        (event_record->>'scheduleId')::UUID,
        event_record->>'itemType',
        event_record->>'eventType',
        (event_record->>'startedAt')::TIMESTAMPTZ,
        (event_record->>'endedAt')::TIMESTAMPTZ,
        (event_record->>'durationSeconds')::INT,
        event_record->>'playerSessionId'
      );
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Failed to insert event: %', SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'errors', error_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_playback_events TO authenticated;

COMMENT ON FUNCTION public.insert_playback_events IS
'Batch insert playback events from the Player. Accepts JSON array of events.';

-- ============================================================================
-- 4. RPC: GET SCENE PLAYBACK SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_playback_summary(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_group_id UUID DEFAULT NULL,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
  scene_id UUID,
  scene_name TEXT,
  total_duration_seconds BIGINT,
  last_played_at TIMESTAMPTZ,
  device_count BIGINT,
  group_count BIGINT,
  play_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.scene_id,
    s.name as scene_name,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_duration_seconds,
    MAX(pe.started_at) as last_played_at,
    COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
    COUNT(DISTINCT pe.group_id)::BIGINT as group_count,
    COUNT(pe.id)::BIGINT as play_count
  FROM public.playback_events pe
  JOIN public.scenes s ON s.id = pe.scene_id
  WHERE pe.tenant_id = p_tenant_id
    AND pe.scene_id IS NOT NULL
    AND pe.started_at >= p_from_ts
    AND pe.started_at <= p_to_ts
    AND (p_group_id IS NULL OR pe.group_id = p_group_id)
    AND (p_device_id IS NULL OR pe.screen_id = p_device_id)
  GROUP BY pe.scene_id, s.name
  ORDER BY total_duration_seconds DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scene_playback_summary TO authenticated;

-- ============================================================================
-- 5. RPC: GET DEVICE UPTIME SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_device_uptime_summary(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
  device_id UUID,
  device_name TEXT,
  group_id UUID,
  group_name TEXT,
  total_online_seconds BIGINT,
  total_offline_seconds BIGINT,
  offline_events_count BIGINT,
  uptime_percent NUMERIC,
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_seconds BIGINT;
BEGIN
  period_seconds := EXTRACT(EPOCH FROM (p_to_ts - p_from_ts))::BIGINT;

  RETURN QUERY
  WITH online_periods AS (
    -- Calculate online duration from player_online/player_offline event pairs
    SELECT
      pe.screen_id,
      SUM(
        CASE
          WHEN pe.event_type = 'player_online' AND pe.duration_seconds IS NOT NULL THEN pe.duration_seconds
          WHEN pe.event_type = 'scene_start' AND pe.duration_seconds IS NOT NULL THEN pe.duration_seconds
          ELSE 0
        END
      )::BIGINT as online_secs
    FROM public.playback_events pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
    GROUP BY pe.screen_id
  ),
  offline_events AS (
    -- Count offline events
    SELECT
      pe.screen_id,
      COUNT(*)::BIGINT as offline_count
    FROM public.playback_events pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.event_type = 'player_offline'
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
    GROUP BY pe.screen_id
  )
  SELECT
    td.id as device_id,
    td.name as device_name,
    td.screen_group_id as group_id,
    sg.name as group_name,
    COALESCE(op.online_secs, 0)::BIGINT as total_online_seconds,
    (period_seconds - COALESCE(op.online_secs, 0))::BIGINT as total_offline_seconds,
    COALESCE(oe.offline_count, 0)::BIGINT as offline_events_count,
    ROUND(
      (COALESCE(op.online_secs, 0)::NUMERIC / NULLIF(period_seconds, 0)) * 100,
      2
    ) as uptime_percent,
    td.last_seen
  FROM public.tv_devices td
  LEFT JOIN public.screen_groups sg ON sg.id = td.screen_group_id
  LEFT JOIN online_periods op ON op.screen_id = td.id
  LEFT JOIN offline_events oe ON oe.screen_id = td.id
  WHERE td.tenant_id = p_tenant_id
    AND (p_group_id IS NULL OR td.screen_group_id = p_group_id)
  ORDER BY uptime_percent DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_device_uptime_summary TO authenticated;

-- ============================================================================
-- 6. RPC: GET SCENE TIMELINE (TIME-BUCKETED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_timeline(
  p_tenant_id UUID,
  p_scene_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_bucket_interval TEXT DEFAULT 'hour' -- 'hour' or 'day'
)
RETURNS TABLE (
  bucket_start TIMESTAMPTZ,
  total_duration_seconds BIGINT,
  device_count BIGINT,
  play_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_bucket_interval = 'day' THEN date_trunc('day', pe.started_at)
      ELSE date_trunc('hour', pe.started_at)
    END as bucket_start,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_duration_seconds,
    COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
    COUNT(pe.id)::BIGINT as play_count
  FROM public.playback_events pe
  WHERE pe.tenant_id = p_tenant_id
    AND pe.scene_id = p_scene_id
    AND pe.started_at >= p_from_ts
    AND pe.started_at <= p_to_ts
  GROUP BY bucket_start
  ORDER BY bucket_start;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scene_timeline TO authenticated;

-- ============================================================================
-- 7. RPC: GET TOP SCENES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_scenes(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  scene_id UUID,
  scene_name TEXT,
  total_duration_seconds BIGINT,
  device_count BIGINT,
  play_count BIGINT,
  avg_duration_per_play BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.scene_id,
    s.name as scene_name,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_duration_seconds,
    COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
    COUNT(pe.id)::BIGINT as play_count,
    (COALESCE(SUM(pe.duration_seconds), 0) / NULLIF(COUNT(pe.id), 0))::BIGINT as avg_duration_per_play
  FROM public.playback_events pe
  JOIN public.scenes s ON s.id = pe.scene_id
  WHERE pe.tenant_id = p_tenant_id
    AND pe.scene_id IS NOT NULL
    AND pe.started_at >= p_from_ts
    AND pe.started_at <= p_to_ts
  GROUP BY pe.scene_id, s.name
  ORDER BY total_duration_seconds DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_scenes TO authenticated;

-- ============================================================================
-- 8. RPC: GET CONTENT ANALYTICS SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_content_analytics_summary(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_group_id UUID DEFAULT NULL,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_devices BIGINT,
  active_devices BIGINT,
  total_scenes BIGINT,
  active_scenes BIGINT,
  total_playback_hours NUMERIC,
  avg_uptime_percent NUMERIC,
  scenes_live_now BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH device_stats AS (
    SELECT
      COUNT(DISTINCT td.id)::BIGINT as total,
      COUNT(DISTINCT CASE WHEN pe.screen_id IS NOT NULL THEN td.id END)::BIGINT as active
    FROM public.tv_devices td
    LEFT JOIN public.playback_events pe ON pe.screen_id = td.id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
    WHERE td.tenant_id = p_tenant_id
      AND (p_group_id IS NULL OR td.screen_group_id = p_group_id)
      AND (p_device_id IS NULL OR td.id = p_device_id)
  ),
  scene_stats AS (
    SELECT
      COUNT(DISTINCT s.id)::BIGINT as total,
      COUNT(DISTINCT pe.scene_id)::BIGINT as active,
      COALESCE(SUM(pe.duration_seconds), 0)::NUMERIC / 3600 as playback_hours
    FROM public.scenes s
    LEFT JOIN public.playback_events pe ON pe.scene_id = s.id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND (p_group_id IS NULL OR pe.group_id = p_group_id)
      AND (p_device_id IS NULL OR pe.screen_id = p_device_id)
    WHERE s.tenant_id = p_tenant_id
  ),
  uptime_stats AS (
    SELECT COALESCE(AVG(uptime_percent), 0) as avg_uptime
    FROM get_device_uptime_summary(p_tenant_id, p_from_ts, p_to_ts, p_group_id)
  ),
  live_now AS (
    -- Count scenes currently active (had activity in last 5 minutes)
    SELECT COUNT(DISTINCT pe.scene_id)::BIGINT as live_count
    FROM public.playback_events pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.scene_id IS NOT NULL
      AND pe.started_at >= NOW() - INTERVAL '5 minutes'
      AND (p_group_id IS NULL OR pe.group_id = p_group_id)
      AND (p_device_id IS NULL OR pe.screen_id = p_device_id)
  )
  SELECT
    ds.total as total_devices,
    ds.active as active_devices,
    ss.total as total_scenes,
    ss.active as active_scenes,
    ROUND(ss.playback_hours, 2) as total_playback_hours,
    ROUND(us.avg_uptime, 2) as avg_uptime_percent,
    ln.live_count as scenes_live_now
  FROM device_stats ds
  CROSS JOIN scene_stats ss
  CROSS JOIN uptime_stats us
  CROSS JOIN live_now ln;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_analytics_summary TO authenticated;

-- ============================================================================
-- 9. RPC: GET SCENE DETAILS WITH ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_analytics_detail(
  p_tenant_id UUID,
  p_scene_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  scene_id UUID,
  scene_name TEXT,
  total_duration_seconds BIGINT,
  device_count BIGINT,
  group_count BIGINT,
  play_count BIGINT,
  avg_duration_per_session BIGINT,
  first_played_at TIMESTAMPTZ,
  last_played_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as scene_id,
    s.name as scene_name,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_duration_seconds,
    COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
    COUNT(DISTINCT pe.group_id)::BIGINT as group_count,
    COUNT(pe.id)::BIGINT as play_count,
    (COALESCE(SUM(pe.duration_seconds), 0) / NULLIF(COUNT(pe.id), 0))::BIGINT as avg_duration_per_session,
    MIN(pe.started_at) as first_played_at,
    MAX(pe.started_at) as last_played_at
  FROM public.scenes s
  LEFT JOIN public.playback_events pe ON pe.scene_id = s.id
    AND pe.started_at >= p_from_ts
    AND pe.started_at <= p_to_ts
  WHERE s.tenant_id = p_tenant_id
    AND s.id = p_scene_id
  GROUP BY s.id, s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scene_analytics_detail TO authenticated;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.playback_events.scene_id IS 'Scene being played (if applicable)';
COMMENT ON COLUMN public.playback_events.group_id IS 'Screen group the device belongs to';
COMMENT ON COLUMN public.playback_events.schedule_id IS 'Schedule that triggered this playback';
COMMENT ON COLUMN public.playback_events.event_type IS 'Type of event: scene_start, scene_end, player_online, player_offline, media_play';

DO $$ BEGIN RAISE NOTICE 'Migration 079 completed: Playback analytics extended with scene tracking'; END $$;
