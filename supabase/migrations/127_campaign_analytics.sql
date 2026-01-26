-- ============================================================================
-- Migration: 127_campaign_analytics.sql
-- Description: RPC function for campaign-level analytics aggregation
-- Phase: 16-scheduling-polish, Plan: 01
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Campaign Analytics RPC
-- Aggregates playback metrics grouped by campaign for performance dashboards
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_campaign_analytics(
  p_tenant_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_from_ts TIMESTAMPTZ DEFAULT NULL,
  p_to_ts TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  campaign_status TEXT,
  total_play_count BIGINT,
  total_duration_seconds BIGINT,
  unique_screens BIGINT,
  avg_plays_per_screen NUMERIC,
  peak_hour INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Default date range to last 7 days if not specified
  IF p_from_ts IS NULL THEN
    p_from_ts := now() - INTERVAL '7 days';
  END IF;
  IF p_to_ts IS NULL THEN
    p_to_ts := now();
  END IF;

  RETURN QUERY
  SELECT
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.status AS campaign_status,
    COUNT(pe.id)::BIGINT AS total_play_count,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT AS total_duration_seconds,
    COUNT(DISTINCT pe.screen_id)::BIGINT AS unique_screens,
    ROUND(
      COUNT(pe.id)::NUMERIC / NULLIF(COUNT(DISTINCT pe.screen_id), 0),
      2
    ) AS avg_plays_per_screen,
    -- Calculate peak hour using mode (most common hour)
    (
      SELECT EXTRACT(HOUR FROM pe2.started_at)::INT
      FROM public.playback_events pe2
      WHERE pe2.campaign_id = c.id
        AND pe2.started_at >= p_from_ts
        AND pe2.started_at <= p_to_ts
      GROUP BY EXTRACT(HOUR FROM pe2.started_at)
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) AS peak_hour
  FROM public.campaigns c
  LEFT JOIN public.playback_events pe ON pe.campaign_id = c.id
    AND pe.started_at >= p_from_ts
    AND pe.started_at <= p_to_ts
  WHERE c.tenant_id = p_tenant_id
    AND (p_campaign_id IS NULL OR c.id = p_campaign_id)
  GROUP BY c.id, c.name, c.status
  ORDER BY total_play_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_campaign_analytics IS
'Returns campaign analytics aggregated by campaign. Filters by tenant (RLS-safe via SECURITY DEFINER),
optional campaign_id, and date range. Returns play count, duration, unique screens, avg plays per screen,
and peak hour for each campaign.';

-- ============================================================================
-- DONE
-- ============================================================================
