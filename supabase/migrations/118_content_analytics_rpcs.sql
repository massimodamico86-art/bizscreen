-- Migration: 118_content_analytics_rpcs.sql
-- Phase 10: Content Analytics
-- Creates RPC functions for content-specific analytics: view duration, completion rate, performance ranking, and viewing patterns heatmap.

-- ============================================================================
-- 1. RPC: GET CONTENT METRICS
-- ============================================================================
-- Returns metrics for a specific content item (scene, media, or playlist)

CREATE OR REPLACE FUNCTION public.get_content_metrics(
  p_tenant_id UUID,
  p_content_id UUID,
  p_content_type TEXT,  -- 'scene', 'media', 'playlist'
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  avg_view_duration_seconds NUMERIC,
  completion_rate NUMERIC,
  total_views BIGINT,
  last_viewed_at TIMESTAMPTZ,
  total_view_time_seconds BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scheduled_duration NUMERIC;
BEGIN
  -- Get scheduled duration based on content type
  IF p_content_type = 'scene' THEN
    -- For scenes, use a reasonable default (30 seconds) since scenes don't have explicit duration
    SELECT COALESCE(
      (s.settings->>'default_duration')::NUMERIC,
      30
    ) INTO v_scheduled_duration
    FROM public.scenes s
    WHERE s.id = p_content_id
      AND s.tenant_id = p_tenant_id;
  ELSIF p_content_type = 'media' THEN
    -- For media, use the media asset's duration
    SELECT COALESCE(ma.duration, 30)::NUMERIC INTO v_scheduled_duration
    FROM public.media_assets ma
    WHERE ma.id = p_content_id
      AND ma.owner_id = p_tenant_id;
  ELSIF p_content_type = 'playlist' THEN
    -- For playlist, calculate sum of item durations
    SELECT COALESCE(
      SUM(COALESCE(pi.duration, p.default_duration, 10)),
      60
    )::NUMERIC INTO v_scheduled_duration
    FROM public.playlists p
    LEFT JOIN public.playlist_items pi ON pi.playlist_id = p.id
    WHERE p.id = p_content_id
      AND p.owner_id = p_tenant_id;
  ELSE
    v_scheduled_duration := 30; -- Default fallback
  END IF;

  -- Ensure we have a non-zero scheduled duration
  IF v_scheduled_duration IS NULL OR v_scheduled_duration = 0 THEN
    v_scheduled_duration := 30;
  END IF;

  RETURN QUERY
  WITH content_events AS (
    SELECT
      pe.duration_seconds,
      pe.started_at
    FROM public.playback_events pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND pe.duration_seconds > 0
      AND (
        (p_content_type = 'scene' AND pe.scene_id = p_content_id)
        OR (p_content_type = 'media' AND pe.media_id = p_content_id)
        OR (p_content_type = 'playlist' AND pe.playlist_id = p_content_id)
      )
  )
  SELECT
    COALESCE(ROUND(AVG(ce.duration_seconds), 2), 0)::NUMERIC as avg_view_duration_seconds,
    CASE
      WHEN COUNT(ce.duration_seconds) > 0 THEN
        ROUND(
          LEAST(
            (COALESCE(AVG(ce.duration_seconds), 0) / v_scheduled_duration) * 100,
            100
          ),
          2
        )
      ELSE 0
    END::NUMERIC as completion_rate,
    COUNT(*)::BIGINT as total_views,
    MAX(ce.started_at) as last_viewed_at,
    COALESCE(SUM(ce.duration_seconds), 0)::BIGINT as total_view_time_seconds
  FROM content_events ce;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_metrics TO authenticated;

COMMENT ON FUNCTION public.get_content_metrics IS
'Get metrics for a specific content item (scene, media, or playlist) including avg duration, completion rate, total views, and total view time.';

-- ============================================================================
-- 2. RPC: GET CONTENT PERFORMANCE LIST
-- ============================================================================
-- Returns content items sorted by total view time

CREATE OR REPLACE FUNCTION public.get_content_performance_list(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  content_id UUID,
  content_type TEXT,
  content_name TEXT,
  total_view_time_seconds BIGINT,
  avg_view_duration_seconds NUMERIC,
  total_views BIGINT,
  completion_rate NUMERIC,
  device_count BIGINT,
  last_viewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH scene_stats AS (
    -- Aggregate scene playback stats
    SELECT
      s.id as content_id,
      'scene'::TEXT as content_type,
      s.name as content_name,
      COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_view_time_seconds,
      COALESCE(ROUND(AVG(pe.duration_seconds), 2), 0)::NUMERIC as avg_view_duration_seconds,
      COUNT(pe.id)::BIGINT as total_views,
      CASE
        WHEN COUNT(pe.id) > 0 THEN
          ROUND(
            LEAST(
              (COALESCE(AVG(pe.duration_seconds), 0) / COALESCE((s.settings->>'default_duration')::NUMERIC, 30)) * 100,
              100
            ),
            2
          )
        ELSE 0
      END::NUMERIC as completion_rate,
      COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
      MAX(pe.started_at) as last_viewed_at
    FROM public.scenes s
    LEFT JOIN public.playback_events pe ON pe.scene_id = s.id
      AND pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND pe.duration_seconds > 0
    WHERE s.tenant_id = p_tenant_id
    GROUP BY s.id, s.name, s.settings
    HAVING COUNT(pe.id) > 0
  ),
  media_stats AS (
    -- Aggregate media playback stats
    SELECT
      ma.id as content_id,
      'media'::TEXT as content_type,
      ma.name as content_name,
      COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_view_time_seconds,
      COALESCE(ROUND(AVG(pe.duration_seconds), 2), 0)::NUMERIC as avg_view_duration_seconds,
      COUNT(pe.id)::BIGINT as total_views,
      CASE
        WHEN COUNT(pe.id) > 0 AND COALESCE(ma.duration, 30) > 0 THEN
          ROUND(
            LEAST(
              (COALESCE(AVG(pe.duration_seconds), 0) / COALESCE(ma.duration, 30)) * 100,
              100
            ),
            2
          )
        ELSE 0
      END::NUMERIC as completion_rate,
      COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
      MAX(pe.started_at) as last_viewed_at
    FROM public.media_assets ma
    LEFT JOIN public.playback_events pe ON pe.media_id = ma.id
      AND pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND pe.duration_seconds > 0
    WHERE ma.owner_id = p_tenant_id
    GROUP BY ma.id, ma.name, ma.duration
    HAVING COUNT(pe.id) > 0
  ),
  playlist_stats AS (
    -- Aggregate playlist playback stats
    SELECT
      p.id as content_id,
      'playlist'::TEXT as content_type,
      p.name as content_name,
      COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_view_time_seconds,
      COALESCE(ROUND(AVG(pe.duration_seconds), 2), 0)::NUMERIC as avg_view_duration_seconds,
      COUNT(pe.id)::BIGINT as total_views,
      -- For playlists, estimate scheduled duration from items
      CASE
        WHEN COUNT(pe.id) > 0 THEN
          ROUND(
            LEAST(
              (COALESCE(AVG(pe.duration_seconds), 0) / GREATEST(
                COALESCE((
                  SELECT SUM(COALESCE(pi.duration, p.default_duration, 10))
                  FROM public.playlist_items pi
                  WHERE pi.playlist_id = p.id
                ), 60),
                1
              )) * 100,
              100
            ),
            2
          )
        ELSE 0
      END::NUMERIC as completion_rate,
      COUNT(DISTINCT pe.screen_id)::BIGINT as device_count,
      MAX(pe.started_at) as last_viewed_at
    FROM public.playlists p
    LEFT JOIN public.playback_events pe ON pe.playlist_id = p.id
      AND pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND pe.duration_seconds > 0
    WHERE p.owner_id = p_tenant_id
    GROUP BY p.id, p.name, p.default_duration
    HAVING COUNT(pe.id) > 0
  ),
  combined_stats AS (
    SELECT * FROM scene_stats
    UNION ALL
    SELECT * FROM media_stats
    UNION ALL
    SELECT * FROM playlist_stats
  )
  SELECT
    cs.content_id,
    cs.content_type,
    cs.content_name,
    cs.total_view_time_seconds,
    cs.avg_view_duration_seconds,
    cs.total_views,
    cs.completion_rate,
    cs.device_count,
    cs.last_viewed_at
  FROM combined_stats cs
  ORDER BY cs.total_view_time_seconds DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_performance_list TO authenticated;

COMMENT ON FUNCTION public.get_content_performance_list IS
'Get a list of content items (scenes, media, playlists) sorted by total view time, with aggregated metrics.';

-- ============================================================================
-- 3. RPC: GET VIEWING HEATMAP
-- ============================================================================
-- Returns viewing patterns as a 7x24 grid (day of week x hour of day)

CREATE OR REPLACE FUNCTION public.get_viewing_heatmap(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
  day_of_week INT,        -- 0=Sunday, 6=Saturday
  hour_of_day INT,        -- 0-23
  view_count BIGINT,
  total_duration_seconds BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH hourly_stats AS (
    SELECT
      EXTRACT(DOW FROM pe.started_at AT TIME ZONE p_timezone)::INT as dow,
      EXTRACT(HOUR FROM pe.started_at AT TIME ZONE p_timezone)::INT as hour,
      COUNT(*)::BIGINT as views,
      COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as duration
    FROM public.playback_events pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND pe.duration_seconds > 0
    GROUP BY dow, hour
  )
  -- Generate full 7x24 grid and left join to fill gaps with zeros
  SELECT
    d.dow as day_of_week,
    h.hour as hour_of_day,
    COALESCE(hs.views, 0)::BIGINT as view_count,
    COALESCE(hs.duration, 0)::BIGINT as total_duration_seconds
  FROM generate_series(0, 6) d(dow)
  CROSS JOIN generate_series(0, 23) h(hour)
  LEFT JOIN hourly_stats hs ON hs.dow = d.dow AND hs.hour = h.hour
  ORDER BY d.dow, h.hour;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_viewing_heatmap TO authenticated;

COMMENT ON FUNCTION public.get_viewing_heatmap IS
'Get viewing patterns as a 7x24 grid (day of week x hour of day). Returns all 168 cells including zeros for empty periods. Use p_timezone to convert timestamps to local time.';

-- ============================================================================
-- 4. MIGRATION NOTICE
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Migration 118 completed: Content analytics RPCs (get_content_metrics, get_content_performance_list, get_viewing_heatmap) created'; END $$;
