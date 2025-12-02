-- ============================================
-- Migration: 019_screen_monitoring.sql
-- Description: Screen health monitoring, alert rules, and offline detection
-- ============================================

-- ============================================
-- 1. Screen Health Events Table
-- Tracks online/offline state changes for screens
-- ============================================

CREATE TABLE IF NOT EXISTS public.screen_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('online', 'offline', 'flapping')),
  reason TEXT,
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_screen_health_events_screen_id ON public.screen_health_events(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_health_events_owner_id ON public.screen_health_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_screen_health_events_created_at ON public.screen_health_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_health_events_type ON public.screen_health_events(event_type);

-- Enable RLS
ALTER TABLE public.screen_health_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screen_health_events
CREATE POLICY "screen_health_events_select_policy"
ON public.screen_health_events FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_health_events_insert_policy"
ON public.screen_health_events FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- System can update alert_sent status
CREATE POLICY "screen_health_events_update_policy"
ON public.screen_health_events FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

COMMENT ON TABLE public.screen_health_events IS 'Tracks screen online/offline state changes for monitoring';
COMMENT ON COLUMN public.screen_health_events.event_type IS 'Type of health event: online, offline, or flapping (rapid state changes)';
COMMENT ON COLUMN public.screen_health_events.reason IS 'Human-readable reason for the event';
COMMENT ON COLUMN public.screen_health_events.alert_sent IS 'Whether an alert notification has been sent for this event';

-- ============================================
-- 2. Screen Alert Rules Table
-- Configurable alerting rules for screen monitoring
-- ============================================

CREATE TABLE IF NOT EXISTS public.screen_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'offline' CHECK (type IN ('offline')),
  threshold_minutes INTEGER NOT NULL DEFAULT 10,
  notify_email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_screen_alert_rules_owner_id ON public.screen_alert_rules(owner_id);
CREATE INDEX IF NOT EXISTS idx_screen_alert_rules_screen_id ON public.screen_alert_rules(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_alert_rules_enabled ON public.screen_alert_rules(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.screen_alert_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screen_alert_rules
CREATE POLICY "screen_alert_rules_select_policy"
ON public.screen_alert_rules FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_alert_rules_insert_policy"
ON public.screen_alert_rules FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_alert_rules_update_policy"
ON public.screen_alert_rules FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_alert_rules_delete_policy"
ON public.screen_alert_rules FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

COMMENT ON TABLE public.screen_alert_rules IS 'Configurable alert rules for screen monitoring';
COMMENT ON COLUMN public.screen_alert_rules.threshold_minutes IS 'Minutes of offline time before triggering alert';
COMMENT ON COLUMN public.screen_alert_rules.notify_email IS 'Email address to send alerts to';

-- ============================================
-- 3. Enhanced Player Heartbeat RPC
-- Updates last_seen and logs online events when screen comes back
-- ============================================

CREATE OR REPLACE FUNCTION public.player_heartbeat_with_events(p_screen_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
  v_owner_id UUID;
  v_was_offline BOOLEAN;
  v_offline_threshold INTERVAL := INTERVAL '5 minutes';
  v_result JSON;
BEGIN
  -- Get current screen state
  SELECT id, owner_id, last_seen, status
  INTO v_screen
  FROM tv_devices
  WHERE id = p_screen_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Screen not found');
  END IF;

  v_owner_id := v_screen.owner_id;

  -- Check if screen was offline (last_seen is NULL or older than threshold)
  v_was_offline := (
    v_screen.last_seen IS NULL
    OR v_screen.last_seen < (NOW() - v_offline_threshold)
    OR v_screen.status = 'offline'
  );

  -- Update last_seen and status
  UPDATE tv_devices
  SET
    last_seen = NOW(),
    status = 'online',
    updated_at = NOW()
  WHERE id = p_screen_id;

  -- If screen was offline and is now online, log an online event
  IF v_was_offline THEN
    INSERT INTO screen_health_events (screen_id, owner_id, event_type, reason)
    VALUES (
      p_screen_id,
      v_owner_id,
      'online',
      CASE
        WHEN v_screen.last_seen IS NULL THEN 'Screen connected for the first time'
        ELSE 'Screen reconnected after being offline for ' ||
             EXTRACT(EPOCH FROM (NOW() - v_screen.last_seen))::INTEGER / 60 || ' minutes'
      END
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'was_offline', v_was_offline,
    'screen_id', p_screen_id
  );
END;
$$;

COMMENT ON FUNCTION public.player_heartbeat_with_events IS 'Player heartbeat that also tracks online/offline state changes';

-- ============================================
-- 4. Evaluate Screen Offline RPC
-- Checks if a screen should be marked offline and logs the event
-- ============================================

CREATE OR REPLACE FUNCTION public.evaluate_screen_offline(
  p_screen_id UUID,
  p_threshold_minutes INTEGER DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
  v_last_event RECORD;
  v_threshold INTERVAL;
  v_is_offline BOOLEAN;
BEGIN
  v_threshold := (p_threshold_minutes || ' minutes')::INTERVAL;

  -- Get screen info
  SELECT id, owner_id, last_seen, status, device_name
  INTO v_screen
  FROM tv_devices
  WHERE id = p_screen_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Screen not found');
  END IF;

  -- Check if screen is offline based on last_seen
  v_is_offline := (
    v_screen.last_seen IS NULL
    OR v_screen.last_seen < (NOW() - v_threshold)
  );

  IF NOT v_is_offline THEN
    RETURN json_build_object(
      'success', true,
      'action', 'none',
      'reason', 'Screen is online'
    );
  END IF;

  -- Check if we already logged an offline event (most recent event)
  SELECT event_type
  INTO v_last_event
  FROM screen_health_events
  WHERE screen_id = p_screen_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If last event was already offline, don't log again
  IF v_last_event.event_type = 'offline' THEN
    RETURN json_build_object(
      'success', true,
      'action', 'none',
      'reason', 'Already marked offline'
    );
  END IF;

  -- Log offline event
  INSERT INTO screen_health_events (screen_id, owner_id, event_type, reason)
  VALUES (
    p_screen_id,
    v_screen.owner_id,
    'offline',
    'No heartbeat for ' || p_threshold_minutes || ' minutes'
  );

  -- Update screen status
  UPDATE tv_devices
  SET status = 'offline', updated_at = NOW()
  WHERE id = p_screen_id;

  RETURN json_build_object(
    'success', true,
    'action', 'marked_offline',
    'screen_name', v_screen.device_name,
    'last_seen', v_screen.last_seen
  );
END;
$$;

COMMENT ON FUNCTION public.evaluate_screen_offline IS 'Evaluates if a screen should be marked offline and logs the event';

-- ============================================
-- 5. Evaluate All Screens Offline
-- Batch function to check all screens for offline status
-- ============================================

CREATE OR REPLACE FUNCTION public.evaluate_all_screens_offline(
  p_threshold_minutes INTEGER DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
  v_threshold INTERVAL;
  v_offline_count INTEGER := 0;
BEGIN
  v_threshold := (p_threshold_minutes || ' minutes')::INTERVAL;

  -- Find all screens that are potentially offline
  FOR v_screen IN
    SELECT id
    FROM tv_devices
    WHERE (last_seen IS NULL OR last_seen < (NOW() - v_threshold))
      AND status != 'offline'
  LOOP
    PERFORM evaluate_screen_offline(v_screen.id, p_threshold_minutes);
    v_offline_count := v_offline_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'screens_evaluated', v_offline_count
  );
END;
$$;

COMMENT ON FUNCTION public.evaluate_all_screens_offline IS 'Batch evaluates all screens for offline status';

-- ============================================
-- 6. Get Due Offline Alerts RPC
-- Returns alert rules that should fire, marks them as sent
-- ============================================

CREATE OR REPLACE FUNCTION public.get_due_offline_alerts()
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  notify_email TEXT,
  screen_id UUID,
  screen_name TEXT,
  owner_id UUID,
  last_seen TIMESTAMPTZ,
  threshold_minutes INTEGER,
  offline_event_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH latest_offline_events AS (
    -- Get the most recent offline event for each screen that hasn't been alerted
    SELECT DISTINCT ON (she.screen_id)
      she.id AS event_id,
      she.screen_id,
      she.owner_id,
      she.created_at AS offline_since
    FROM screen_health_events she
    WHERE she.event_type = 'offline'
      AND she.alert_sent = false
    ORDER BY she.screen_id, she.created_at DESC
  )
  SELECT
    sar.id AS rule_id,
    sar.name AS rule_name,
    sar.notify_email,
    td.id AS screen_id,
    td.device_name AS screen_name,
    td.owner_id,
    td.last_seen,
    sar.threshold_minutes,
    loe.event_id AS offline_event_id
  FROM screen_alert_rules sar
  JOIN tv_devices td ON td.id = sar.screen_id
  JOIN latest_offline_events loe ON loe.screen_id = sar.screen_id
  WHERE sar.enabled = true
    AND sar.type = 'offline'
    AND td.status = 'offline'
    AND (
      td.last_seen IS NULL
      OR td.last_seen < (NOW() - (sar.threshold_minutes || ' minutes')::INTERVAL)
    );
END;
$$;

COMMENT ON FUNCTION public.get_due_offline_alerts IS 'Returns offline alert rules that should be triggered';

-- ============================================
-- 7. Mark Alert as Sent RPC
-- Marks an offline event as having sent an alert
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_alert_sent(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE screen_health_events
  SET alert_sent = true
  WHERE id = p_event_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.mark_alert_sent IS 'Marks a health event as having sent an alert notification';

-- ============================================
-- 8. Get Screen Health Events RPC
-- Returns health events for a specific screen
-- ============================================

CREATE OR REPLACE FUNCTION public.get_screen_health_events(
  p_screen_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    she.id,
    she.event_type,
    she.reason,
    she.created_at
  FROM screen_health_events she
  WHERE she.screen_id = p_screen_id
  ORDER BY she.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_screen_health_events IS 'Returns recent health events for a screen';

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.player_heartbeat_with_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_screen_offline(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_all_screens_offline(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_offline_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_alert_sent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_screen_health_events(UUID, INTEGER) TO authenticated;
