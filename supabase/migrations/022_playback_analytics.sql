-- Migration: 022_playback_analytics.sql
-- Phase 10: Analytics & Reporting
-- Creates playback_events table, aggregation RPCs, and report_subscriptions

-- =====================================================
-- 1. PLAYBACK EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.playback_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  screen_id UUID REFERENCES public.tv_devices(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  layout_id UUID REFERENCES public.layouts(id) ON DELETE SET NULL,
  zone_id UUID,  -- Reference to layout zone if applicable
  media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  app_id UUID,   -- For app content (can be same as media_id for app types)
  item_type TEXT NOT NULL CHECK (item_type IN ('media', 'app', 'layout', 'playlist')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  player_session_id TEXT,  -- Correlate events from same playback session
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient analytics queries
CREATE INDEX IF NOT EXISTS idx_playback_events_tenant_started
  ON public.playback_events(tenant_id, started_at);

CREATE INDEX IF NOT EXISTS idx_playback_events_screen_started
  ON public.playback_events(screen_id, started_at);

CREATE INDEX IF NOT EXISTS idx_playback_events_media_started
  ON public.playback_events(media_id, started_at)
  WHERE media_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_playback_events_playlist_started
  ON public.playback_events(playlist_id, started_at)
  WHERE playlist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_playback_events_location_started
  ON public.playback_events(location_id, started_at)
  WHERE location_id IS NOT NULL;

-- =====================================================
-- 2. REPORT SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.report_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  send_to_email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, frequency)
);

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_tenant
  ON public.report_subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_enabled_frequency
  ON public.report_subscriptions(enabled, frequency)
  WHERE enabled = true;

-- =====================================================
-- 3. RLS POLICIES FOR PLAYBACK_EVENTS
-- =====================================================

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
  WITH CHECK (true);  -- We validate tenant_id in the API

-- =====================================================
-- 4. RLS POLICIES FOR REPORT_SUBSCRIPTIONS
-- =====================================================

ALTER TABLE public.report_subscriptions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all
CREATE POLICY "Super admins can manage all report subscriptions"
  ON public.report_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- Admins can manage subscriptions for clients they manage
CREATE POLICY "Admins can manage client report subscriptions"
  ON public.report_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      JOIN public.profiles client_profile ON client_profile.managed_by = admin_profile.id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND client_profile.id = report_subscriptions.tenant_id
    )
  );

-- Tenant owners/managers can manage their subscriptions
CREATE POLICY "Tenant owners and managers can manage report subscriptions"
  ON public.report_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = report_subscriptions.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  );

-- Tenant members (editors/viewers) can view subscriptions
CREATE POLICY "Tenant members can view report subscriptions"
  ON public.report_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT get_my_tenant_ids())
  );

-- =====================================================
-- 5. AGGREGATION FUNCTIONS / RPCs
-- =====================================================

-- Get screen uptime based on health events and playback events
CREATE OR REPLACE FUNCTION get_screen_uptime(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  screen_id UUID,
  screen_name TEXT,
  location_name TEXT,
  total_seconds BIGINT,
  online_seconds BIGINT,
  offline_seconds BIGINT,
  uptime_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_period_seconds BIGINT;
BEGIN
  -- Calculate total period in seconds
  total_period_seconds := EXTRACT(EPOCH FROM (p_to_ts - p_from_ts))::BIGINT;

  RETURN QUERY
  WITH screen_events AS (
    -- Get all health events for the period
    SELECT
      she.screen_id,
      she.event_type,
      she.created_at as event_time,
      LEAD(she.created_at) OVER (PARTITION BY she.screen_id ORDER BY she.created_at) as next_event_time
    FROM public.screen_health_events she
    JOIN public.tv_devices td ON td.id = she.screen_id
    WHERE td.tenant_id = p_tenant_id
      AND she.created_at >= p_from_ts
      AND she.created_at <= p_to_ts
      AND (p_location_id IS NULL OR td.location_id = p_location_id)
  ),
  online_time AS (
    -- Calculate online time from 'online' events to next event (or end of period)
    SELECT
      se.screen_id,
      SUM(
        EXTRACT(EPOCH FROM (
          COALESCE(se.next_event_time, p_to_ts) - se.event_time
        ))
      )::BIGINT as online_secs
    FROM screen_events se
    WHERE se.event_type = 'online'
    GROUP BY se.screen_id
  ),
  playback_activity AS (
    -- Also count screens with playback activity as online time
    SELECT
      pe.screen_id,
      SUM(pe.duration_seconds)::BIGINT as playback_secs
    FROM public.playback_events pe
    JOIN public.tv_devices td ON td.id = pe.screen_id
    WHERE pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.ended_at <= p_to_ts
      AND (p_location_id IS NULL OR td.location_id = p_location_id)
    GROUP BY pe.screen_id
  )
  SELECT
    td.id as screen_id,
    td.name as screen_name,
    l.name as location_name,
    total_period_seconds as total_seconds,
    COALESCE(GREATEST(ot.online_secs, pa.playback_secs), 0)::BIGINT as online_seconds,
    (total_period_seconds - COALESCE(GREATEST(ot.online_secs, pa.playback_secs), 0))::BIGINT as offline_seconds,
    ROUND(
      (COALESCE(GREATEST(ot.online_secs, pa.playback_secs), 0)::NUMERIC /
       NULLIF(total_period_seconds, 0)::NUMERIC) * 100,
      2
    ) as uptime_percent
  FROM public.tv_devices td
  LEFT JOIN public.locations l ON l.id = td.location_id
  LEFT JOIN online_time ot ON ot.screen_id = td.id
  LEFT JOIN playback_activity pa ON pa.screen_id = td.id
  WHERE td.tenant_id = p_tenant_id
    AND (p_location_id IS NULL OR td.location_id = p_location_id)
  ORDER BY uptime_percent DESC NULLS LAST;
END;
$$;

-- Get playback summary by screen
CREATE OR REPLACE FUNCTION get_playback_summary_by_screen(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_location_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL
)
RETURNS TABLE (
  screen_id UUID,
  screen_name TEXT,
  location_name TEXT,
  total_playback_seconds BIGINT,
  total_events BIGINT,
  distinct_playlists BIGINT,
  distinct_media_items BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.id as screen_id,
    td.name as screen_name,
    l.name as location_name,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_playback_seconds,
    COUNT(pe.id)::BIGINT as total_events,
    COUNT(DISTINCT pe.playlist_id)::BIGINT as distinct_playlists,
    COUNT(DISTINCT pe.media_id)::BIGINT as distinct_media_items
  FROM public.tv_devices td
  LEFT JOIN public.locations l ON l.id = td.location_id
  LEFT JOIN public.playback_events pe ON pe.screen_id = td.id
    AND pe.started_at >= p_from_ts
    AND pe.ended_at <= p_to_ts
  WHERE td.tenant_id = p_tenant_id
    AND (p_location_id IS NULL OR td.location_id = p_location_id)
    AND (p_screen_id IS NULL OR td.id = p_screen_id)
  GROUP BY td.id, td.name, l.name
  ORDER BY total_playback_seconds DESC;
END;
$$;

-- Get playback summary by playlist
CREATE OR REPLACE FUNCTION get_playback_summary_by_playlist(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  playlist_id UUID,
  playlist_name TEXT,
  total_playback_seconds BIGINT,
  number_of_plays BIGINT,
  screens_count BIGINT,
  locations_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as playlist_id,
    p.name as playlist_name,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_playback_seconds,
    COUNT(pe.id)::BIGINT as number_of_plays,
    COUNT(DISTINCT pe.screen_id)::BIGINT as screens_count,
    COUNT(DISTINCT pe.location_id)::BIGINT as locations_count
  FROM public.playlists p
  LEFT JOIN public.playback_events pe ON pe.playlist_id = p.id
    AND pe.started_at >= p_from_ts
    AND pe.ended_at <= p_to_ts
    AND (p_location_id IS NULL OR pe.location_id = p_location_id)
  WHERE p.tenant_id = p_tenant_id
  GROUP BY p.id, p.name
  HAVING COUNT(pe.id) > 0
  ORDER BY total_playback_seconds DESC;
END;
$$;

-- Get playback summary by media
CREATE OR REPLACE FUNCTION get_playback_summary_by_media(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_location_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL
)
RETURNS TABLE (
  media_id UUID,
  media_name TEXT,
  media_type TEXT,
  total_playback_seconds BIGINT,
  number_of_plays BIGINT,
  screens_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as media_id,
    m.name as media_name,
    m.type as media_type,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as total_playback_seconds,
    COUNT(pe.id)::BIGINT as number_of_plays,
    COUNT(DISTINCT pe.screen_id)::BIGINT as screens_count
  FROM public.media_assets m
  LEFT JOIN public.playback_events pe ON pe.media_id = m.id
    AND pe.started_at >= p_from_ts
    AND pe.ended_at <= p_to_ts
    AND (p_location_id IS NULL OR pe.location_id = p_location_id)
    AND (p_screen_id IS NULL OR pe.screen_id = p_screen_id)
  WHERE m.tenant_id = p_tenant_id
  GROUP BY m.id, m.name, m.type
  HAVING COUNT(pe.id) > 0
  ORDER BY total_playback_seconds DESC;
END;
$$;

-- Get daily activity for a screen (for sparklines)
CREATE OR REPLACE FUNCTION get_screen_daily_activity(
  p_tenant_id UUID,
  p_screen_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  day DATE,
  playback_seconds BIGINT,
  event_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(pe.started_at) as day,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as playback_seconds,
    COUNT(pe.id)::BIGINT as event_count
  FROM public.playback_events pe
  WHERE pe.tenant_id = p_tenant_id
    AND pe.screen_id = p_screen_id
    AND pe.started_at >= p_from_ts
    AND pe.ended_at <= p_to_ts
  GROUP BY DATE(pe.started_at)
  ORDER BY day;
END;
$$;

-- Get overall analytics summary for tenant
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_screens BIGINT,
  active_screens BIGINT,
  total_playback_hours NUMERIC,
  total_events BIGINT,
  avg_uptime_percent NUMERIC,
  distinct_playlists BIGINT,
  distinct_media BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH screen_stats AS (
    SELECT
      td.id,
      CASE WHEN pe.screen_id IS NOT NULL THEN 1 ELSE 0 END as is_active
    FROM public.tv_devices td
    LEFT JOIN public.playback_events pe ON pe.screen_id = td.id
      AND pe.started_at >= p_from_ts
      AND pe.ended_at <= p_to_ts
    WHERE td.tenant_id = p_tenant_id
      AND (p_location_id IS NULL OR td.location_id = p_location_id)
    GROUP BY td.id, pe.screen_id
  ),
  playback_stats AS (
    SELECT
      COUNT(DISTINCT pe.screen_id) as active_screens,
      COALESCE(SUM(pe.duration_seconds), 0) as total_seconds,
      COUNT(pe.id) as total_events,
      COUNT(DISTINCT pe.playlist_id) as distinct_playlists,
      COUNT(DISTINCT pe.media_id) as distinct_media
    FROM public.playback_events pe
    JOIN public.tv_devices td ON td.id = pe.screen_id
    WHERE pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.ended_at <= p_to_ts
      AND (p_location_id IS NULL OR td.location_id = p_location_id)
  ),
  uptime_stats AS (
    SELECT AVG(uptime_percent) as avg_uptime
    FROM get_screen_uptime(p_tenant_id, p_from_ts, p_to_ts, p_location_id)
  )
  SELECT
    (SELECT COUNT(*) FROM screen_stats)::BIGINT as total_screens,
    ps.active_screens::BIGINT,
    ROUND(ps.total_seconds::NUMERIC / 3600, 2) as total_playback_hours,
    ps.total_events::BIGINT,
    COALESCE(us.avg_uptime, 0)::NUMERIC as avg_uptime_percent,
    ps.distinct_playlists::BIGINT,
    ps.distinct_media::BIGINT
  FROM playback_stats ps
  CROSS JOIN uptime_stats us;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_screen_uptime TO authenticated;
GRANT EXECUTE ON FUNCTION get_playback_summary_by_screen TO authenticated;
GRANT EXECUTE ON FUNCTION get_playback_summary_by_playlist TO authenticated;
GRANT EXECUTE ON FUNCTION get_playback_summary_by_media TO authenticated;
GRANT EXECUTE ON FUNCTION get_screen_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary TO authenticated;

-- =====================================================
-- 6. TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_report_subscriptions_updated_at
  BEFORE UPDATE ON public.report_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
