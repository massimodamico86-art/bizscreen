-- Migration: 162_proof_of_play_partitioning.sql
-- Phase 110: Enterprise Platform - Proof of Play
-- Converts playback_events to a monthly-partitioned table, adds auto-partition
-- cron job, and creates proof-of-play reporting RPCs.

-- ============================================================================
-- 1. CREATE NEW PARTITIONED TABLE
-- ============================================================================

-- PostgreSQL cannot add partitioning to an existing table.
-- Strategy: create new partitioned table, copy data, swap names.

CREATE TABLE public.playback_events_new (
  LIKE public.playback_events INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (created_at);

-- ============================================================================
-- 2. CREATE MONTHLY PARTITIONS (2026-01 through 2027-03)
-- ============================================================================

DO $$
DECLARE
  start_date DATE := '2026-01-01';
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..14 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'playback_events_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.playback_events_new FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    start_date := end_date;
  END LOOP;
END $$;

-- Default partition for data outside defined ranges
CREATE TABLE public.playback_events_default
  PARTITION OF public.playback_events_new DEFAULT;

-- ============================================================================
-- 3. COPY EXISTING DATA
-- ============================================================================

INSERT INTO public.playback_events_new SELECT * FROM public.playback_events;

-- ============================================================================
-- 4. SWAP TABLES
-- ============================================================================

ALTER TABLE public.playback_events RENAME TO playback_events_old;
ALTER TABLE public.playback_events_new RENAME TO playback_events;

-- ============================================================================
-- 5. RECREATE INDEXES ON PARTITIONED TABLE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pe_tenant_started
  ON public.playback_events(tenant_id, started_at);

CREATE INDEX IF NOT EXISTS idx_pe_screen_started
  ON public.playback_events(screen_id, started_at);

CREATE INDEX IF NOT EXISTS idx_pe_created_at
  ON public.playback_events(created_at);

CREATE INDEX IF NOT EXISTS idx_pe_media_started
  ON public.playback_events(media_id, started_at)
  WHERE media_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pe_playlist_started
  ON public.playback_events(playlist_id, started_at)
  WHERE playlist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pe_event_type
  ON public.playback_events(tenant_id, event_type, started_at)
  WHERE event_type IS NOT NULL;

-- ============================================================================
-- 6. RECREATE RLS ON PARTITIONED TABLE
-- ============================================================================

ALTER TABLE public.playback_events ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins can view all playback events"
  ON public.playback_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- Admins can view events for clients they manage
CREATE POLICY "Admins can view managed client playback events"
  ON public.playback_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      JOIN public.profiles client_profile ON client_profile.managed_by = admin_profile.id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND client_profile.id = playback_events.tenant_id
    )
  );

-- Tenant members can view their own events
CREATE POLICY "Tenant members can view own playback events"
  ON public.playback_events FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT get_my_tenant_ids())
  );

-- Insert policy - service role or authenticated with valid tenant
CREATE POLICY "Service can insert playback events"
  ON public.playback_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 7. DROP OLD TABLE
-- ============================================================================

DROP TABLE public.playback_events_old;

-- ============================================================================
-- 8. AUTO-PARTITION FUNCTION (pg_cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_next_playback_partition()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_month DATE := date_trunc('month', now()) + INTERVAL '2 months';
  partition_name TEXT := 'playback_events_y' || to_char(next_month, 'YYYY') || 'm' || to_char(next_month, 'MM');
  end_date DATE := next_month + INTERVAL '1 month';
BEGIN
  -- Only create if partition does not already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE public.%I PARTITION OF public.playback_events FOR VALUES FROM (%L) TO (%L)',
      partition_name, next_month, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$;

-- Schedule auto-partition on the 25th of each month at midnight
SELECT cron.schedule(
  'create_monthly_playback_partition',
  '0 0 25 * *',
  $$ SELECT public.create_next_playback_partition(); $$
);

-- ============================================================================
-- 9. PROOF OF PLAY REPORT AGGREGATION RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_proof_of_play_report(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_screen_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  screen_name TEXT,
  content_name TEXT,
  content_type TEXT,
  total_plays BIGINT,
  total_duration_seconds BIGINT,
  first_played TIMESTAMPTZ,
  last_played TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.name AS screen_name,
    COALESCE(ma.name, sc.name, pl.name, 'Unknown') AS content_name,
    pe.item_type AS content_type,
    COUNT(pe.id)::BIGINT AS total_plays,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT AS total_duration_seconds,
    MIN(pe.started_at) AS first_played,
    MAX(pe.started_at) AS last_played
  FROM public.playback_events pe
  JOIN public.tv_devices td ON td.id = pe.screen_id
  LEFT JOIN public.media_assets ma ON ma.id = pe.media_id
  LEFT JOIN public.scenes sc ON sc.id = pe.scene_id
  LEFT JOIN public.playlists pl ON pl.id = pe.playlist_id
  WHERE pe.tenant_id = p_tenant_id
    AND pe.started_at >= p_start_date
    AND pe.started_at <= p_end_date
    AND pe.event_type IN ('media_play', 'scene_end')
    AND pe.duration_seconds IS NOT NULL
    AND (p_screen_ids IS NULL OR pe.screen_id = ANY(p_screen_ids))
  GROUP BY td.name, COALESCE(ma.name, sc.name, pl.name, 'Unknown'), pe.item_type
  ORDER BY total_plays DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_proof_of_play_report TO authenticated;

-- ============================================================================
-- 10. PLAYBACK SUMMARY RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_playback_summary(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_plays', COUNT(pe.id),
    'total_hours', ROUND(COALESCE(SUM(pe.duration_seconds), 0)::NUMERIC / 3600, 2),
    'unique_content', COUNT(DISTINCT COALESCE(pe.media_id, pe.scene_id, pe.playlist_id)),
    'active_screens', COUNT(DISTINCT pe.screen_id)
  )
  INTO result
  FROM public.playback_events pe
  WHERE pe.tenant_id = p_tenant_id
    AND pe.started_at >= p_start_date
    AND pe.started_at <= p_end_date
    AND pe.event_type IN ('media_play', 'scene_end')
    AND pe.duration_seconds IS NOT NULL;

  RETURN COALESCE(result, '{"total_plays": 0, "total_hours": 0, "unique_content": 0, "active_screens": 0}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_playback_summary TO authenticated;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.create_next_playback_partition IS 'Auto-creates next month partition for playback_events. Scheduled via pg_cron on the 25th.';
COMMENT ON FUNCTION public.get_proof_of_play_report IS 'Aggregates playback events by screen and content for proof-of-play compliance reports.';
COMMENT ON FUNCTION public.get_playback_summary IS 'Returns summary stats (total plays, hours, unique content, active screens) for a tenant and date range.';

DO $$ BEGIN RAISE NOTICE 'Migration 162 completed: playback_events partitioned by month, auto-partition cron, proof-of-play RPCs'; END $$;
