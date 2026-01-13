-- Migration: 099_enhanced_playback_analytics.sql
-- Enhanced playback analytics with segment progress, load latency, errors, and network quality

-- ============================================================================
-- 1. ADD NEW COLUMNS TO PLAYBACK_EVENTS
-- ============================================================================

-- Segment progress tracking (quartile completion)
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS segment_progress JSONB;

-- Media load latency in milliseconds
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS load_latency_ms INTEGER;

-- Error details for failed loads
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Network quality at time of event
ALTER TABLE public.playback_events
ADD COLUMN IF NOT EXISTS network_quality TEXT;

-- ============================================================================
-- 2. UPDATE EVENT_TYPE CONSTRAINT
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.playback_events
DROP CONSTRAINT IF EXISTS playback_events_event_type_check;

-- Add updated constraint with new event types
ALTER TABLE public.playback_events
ADD CONSTRAINT playback_events_event_type_check
CHECK (event_type IS NULL OR event_type IN (
  'scene_start',
  'scene_end',
  'player_online',
  'player_offline',
  'media_play',
  -- Enhanced event types
  'segment_progress',
  'media_load',
  'media_error',
  'interaction',
  'network_change',
  'frame_drop'
));

-- ============================================================================
-- 3. ADD INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Index for segment progress queries
CREATE INDEX IF NOT EXISTS idx_playback_events_segment_progress
  ON public.playback_events(scene_id, event_type)
  WHERE event_type = 'segment_progress' AND segment_progress IS NOT NULL;

-- Index for media load latency analysis
CREATE INDEX IF NOT EXISTS idx_playback_events_load_latency
  ON public.playback_events(tenant_id, event_type, load_latency_ms)
  WHERE event_type = 'media_load' AND load_latency_ms IS NOT NULL;

-- Index for error analysis
CREATE INDEX IF NOT EXISTS idx_playback_events_errors
  ON public.playback_events(tenant_id, event_type, started_at)
  WHERE event_type = 'media_error';

-- Index for network quality analysis
CREATE INDEX IF NOT EXISTS idx_playback_events_network
  ON public.playback_events(tenant_id, network_quality, started_at)
  WHERE network_quality IS NOT NULL;

-- ============================================================================
-- 4. UPDATE INSERT_PLAYBACK_EVENTS FUNCTION
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
        player_session_id,
        -- Enhanced columns
        segment_progress,
        load_latency_ms,
        error_details,
        network_quality
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
        event_record->>'playerSessionId',
        -- Enhanced columns
        event_record->'segmentProgress',
        (event_record->>'loadLatencyMs')::INT,
        COALESCE(event_record->'errorDetails', event_record->'mediaLoadDetails', event_record->'interactionDetails', event_record->'frameDropDetails', event_record->'networkDetails'),
        event_record->>'networkQuality'
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

-- ============================================================================
-- 5. RPC: GET SCENE SEGMENT HEATMAP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_segment_heatmap(
  p_tenant_id UUID,
  p_scene_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  slide_id TEXT,
  quartile INT,
  view_count BIGINT,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH quartile_views AS (
    SELECT
      segment_progress->>'slideId' as slide_id,
      (segment_progress->>'quartile')::INT as quartile,
      COUNT(*) as views
    FROM public.playback_events
    WHERE tenant_id = p_tenant_id
      AND scene_id = p_scene_id
      AND event_type = 'segment_progress'
      AND segment_progress IS NOT NULL
      AND started_at >= p_from_ts
      AND started_at <= p_to_ts
    GROUP BY segment_progress->>'slideId', (segment_progress->>'quartile')::INT
  ),
  total_starts AS (
    SELECT
      segment_progress->>'slideId' as slide_id,
      COUNT(*) as total
    FROM public.playback_events
    WHERE tenant_id = p_tenant_id
      AND scene_id = p_scene_id
      AND event_type = 'segment_progress'
      AND segment_progress IS NOT NULL
      AND (segment_progress->>'quartile')::INT = 1
      AND started_at >= p_from_ts
      AND started_at <= p_to_ts
    GROUP BY segment_progress->>'slideId'
  )
  SELECT
    qv.slide_id,
    qv.quartile,
    qv.views as view_count,
    ROUND((qv.views::NUMERIC / NULLIF(ts.total, 0)) * 100, 2) as completion_rate
  FROM quartile_views qv
  LEFT JOIN total_starts ts ON ts.slide_id = qv.slide_id
  ORDER BY qv.slide_id, qv.quartile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scene_segment_heatmap TO authenticated;

-- ============================================================================
-- 6. RPC: GET MEDIA LOAD PERFORMANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_media_load_performance(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
  avg_latency_ms NUMERIC,
  p50_latency_ms BIGINT,
  p95_latency_ms BIGINT,
  p99_latency_ms BIGINT,
  total_loads BIGINT,
  cached_loads BIGINT,
  cache_hit_rate NUMERIC,
  error_count BIGINT,
  error_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH load_events AS (
    SELECT
      load_latency_ms,
      COALESCE((error_details->>'cached')::BOOLEAN, FALSE) as cached
    FROM public.playback_events
    WHERE tenant_id = p_tenant_id
      AND event_type = 'media_load'
      AND load_latency_ms IS NOT NULL
      AND started_at >= p_from_ts
      AND started_at <= p_to_ts
      AND (p_device_id IS NULL OR screen_id = p_device_id)
  ),
  error_events AS (
    SELECT COUNT(*) as errors
    FROM public.playback_events
    WHERE tenant_id = p_tenant_id
      AND event_type = 'media_error'
      AND started_at >= p_from_ts
      AND started_at <= p_to_ts
      AND (p_device_id IS NULL OR screen_id = p_device_id)
  ),
  latency_percentiles AS (
    SELECT
      ROUND(AVG(load_latency_ms), 2) as avg,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY load_latency_ms)::BIGINT as p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load_latency_ms)::BIGINT as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY load_latency_ms)::BIGINT as p99,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE cached) as cached_count
    FROM load_events
  )
  SELECT
    lp.avg as avg_latency_ms,
    lp.p50 as p50_latency_ms,
    lp.p95 as p95_latency_ms,
    lp.p99 as p99_latency_ms,
    lp.total as total_loads,
    lp.cached_count as cached_loads,
    ROUND((lp.cached_count::NUMERIC / NULLIF(lp.total, 0)) * 100, 2) as cache_hit_rate,
    ee.errors as error_count,
    ROUND((ee.errors::NUMERIC / NULLIF(lp.total + ee.errors, 0)) * 100, 2) as error_rate
  FROM latency_percentiles lp
  CROSS JOIN error_events ee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_media_load_performance TO authenticated;

-- ============================================================================
-- 7. RPC: GET NETWORK QUALITY DISTRIBUTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_network_quality_distribution(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
  network_quality TEXT,
  event_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH quality_counts AS (
    SELECT
      network_quality as quality,
      COUNT(*) as cnt
    FROM public.playback_events
    WHERE tenant_id = p_tenant_id
      AND event_type = 'network_change'
      AND network_quality IS NOT NULL
      AND started_at >= p_from_ts
      AND started_at <= p_to_ts
      AND (p_device_id IS NULL OR screen_id = p_device_id)
    GROUP BY network_quality
  ),
  total AS (
    SELECT COALESCE(SUM(cnt), 0) as total FROM quality_counts
  )
  SELECT
    qc.quality as network_quality,
    qc.cnt as event_count,
    ROUND((qc.cnt::NUMERIC / NULLIF(t.total, 0)) * 100, 2) as percentage
  FROM quality_counts qc
  CROSS JOIN total t
  ORDER BY qc.cnt DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_network_quality_distribution TO authenticated;

-- ============================================================================
-- 8. RPC: GET ERROR SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_playback_error_summary(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  error_type TEXT,
  media_type TEXT,
  error_count BIGINT,
  affected_devices BIGINT,
  last_occurrence TIMESTAMPTZ,
  sample_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(error_details->>'error', 'Unknown') as error_type,
    COALESCE(error_details->>'mediaType', 'unknown') as media_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT screen_id) as affected_devices,
    MAX(started_at) as last_occurrence,
    (array_agg(error_details->>'url' ORDER BY started_at DESC))[1] as sample_url
  FROM public.playback_events
  WHERE tenant_id = p_tenant_id
    AND event_type = 'media_error'
    AND error_details IS NOT NULL
    AND started_at >= p_from_ts
    AND started_at <= p_to_ts
  GROUP BY error_details->>'error', error_details->>'mediaType'
  ORDER BY error_count DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_playback_error_summary TO authenticated;

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.playback_events.segment_progress IS 'Segment progress data (slideId, progress %, quartile)';
COMMENT ON COLUMN public.playback_events.load_latency_ms IS 'Media load latency in milliseconds';
COMMENT ON COLUMN public.playback_events.error_details IS 'Error details including URL, type, and message';
COMMENT ON COLUMN public.playback_events.network_quality IS 'Network quality level at time of event';

DO $$ BEGIN RAISE NOTICE 'Migration 099 completed: Enhanced playback analytics with segment tracking, latency, and error monitoring'; END $$;
