-- Migration: 039_observability_and_metrics.sql
-- Phase 30: Observability, SLAs, and Multi-tenant Production Monitoring
-- Creates tables and functions for distributed tracing, metrics, and SLA monitoring

-- =====================================================
-- 1. METRIC EVENTS TABLE
-- High-volume events for detailed analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.metric_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trace_id TEXT,
  span_id TEXT,
  parent_span_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request', 'response', 'error', 'heartbeat', 'webhook',
    'billing', 'player_connect', 'player_disconnect', 'cron', 'api_call'
  )),
  event_name TEXT NOT NULL,
  duration_ms INTEGER,
  status_code INTEGER,
  error_class TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition-ready index for time-based queries
CREATE INDEX IF NOT EXISTS idx_metric_events_tenant_time
  ON public.metric_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metric_events_type_time
  ON public.metric_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metric_events_trace
  ON public.metric_events(trace_id)
  WHERE trace_id IS NOT NULL;

-- Partial index for errors only
CREATE INDEX IF NOT EXISTS idx_metric_events_errors
  ON public.metric_events(tenant_id, error_class, created_at DESC)
  WHERE error_class IS NOT NULL;

-- =====================================================
-- 2. TENANT SLA SNAPSHOTS
-- Hourly/daily SLA metric aggregations per tenant
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenant_sla_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Uptime metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  uptime_percent NUMERIC(5, 2) DEFAULT 100.00,

  -- Latency metrics
  avg_response_ms NUMERIC(10, 2),
  p50_response_ms NUMERIC(10, 2),
  p95_response_ms NUMERIC(10, 2),
  p99_response_ms NUMERIC(10, 2),
  max_response_ms NUMERIC(10, 2),

  -- Device metrics
  total_devices INTEGER DEFAULT 0,
  online_devices INTEGER DEFAULT 0,
  offline_devices INTEGER DEFAULT 0,
  device_uptime_percent NUMERIC(5, 2) DEFAULT 100.00,

  -- Webhook metrics
  total_webhooks INTEGER DEFAULT 0,
  successful_webhooks INTEGER DEFAULT 0,
  failed_webhooks INTEGER DEFAULT 0,
  webhook_success_percent NUMERIC(5, 2) DEFAULT 100.00,

  -- Billing metrics
  billing_events INTEGER DEFAULT 0,
  billing_failures INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, snapshot_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_sla_snapshots_tenant_period
  ON public.tenant_sla_snapshots(tenant_id, snapshot_type, period_start DESC);

-- =====================================================
-- 3. PLAYER NETWORK METRICS
-- Network quality metrics from player devices
-- =====================================================

CREATE TABLE IF NOT EXISTS public.player_network_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Network quality
  latency_ms INTEGER,
  latency_bucket TEXT CHECK (latency_bucket IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  jitter_ms INTEGER,
  packet_loss_percent NUMERIC(5, 2),

  -- Connection health
  connection_type TEXT, -- wifi, ethernet, cellular
  signal_strength INTEGER, -- dBm for wifi
  bandwidth_estimate_kbps INTEGER,

  -- Retry/reconnect stats
  retry_count INTEGER DEFAULT 0,
  reconnect_count INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,

  -- Content loading
  content_load_time_ms INTEGER,
  media_buffer_underruns INTEGER DEFAULT 0,

  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_network_device_time
  ON public.player_network_metrics(device_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_network_tenant_time
  ON public.player_network_metrics(tenant_id, measured_at DESC);

-- Partial index for poor connections
CREATE INDEX IF NOT EXISTS idx_player_network_poor
  ON public.player_network_metrics(tenant_id, device_id, measured_at DESC)
  WHERE latency_bucket IN ('poor', 'critical');

-- =====================================================
-- 4. RESPONSE TIME HISTOGRAMS
-- Pre-aggregated latency distributions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.response_time_histograms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint_name TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_end TIMESTAMPTZ NOT NULL,

  -- Histogram buckets (count of requests in each latency range)
  bucket_0_50ms INTEGER DEFAULT 0,      -- 0-50ms
  bucket_50_100ms INTEGER DEFAULT 0,    -- 50-100ms
  bucket_100_250ms INTEGER DEFAULT 0,   -- 100-250ms
  bucket_250_500ms INTEGER DEFAULT 0,   -- 250-500ms
  bucket_500_1000ms INTEGER DEFAULT 0,  -- 500-1000ms
  bucket_1000_2500ms INTEGER DEFAULT 0, -- 1-2.5s
  bucket_2500_5000ms INTEGER DEFAULT 0, -- 2.5-5s
  bucket_5000_plus_ms INTEGER DEFAULT 0, -- 5s+

  total_requests INTEGER DEFAULT 0,
  total_duration_ms BIGINT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, endpoint_name, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_histograms_tenant_endpoint
  ON public.response_time_histograms(tenant_id, endpoint_name, bucket_start DESC);

-- =====================================================
-- 5. API USAGE COUNTERS
-- Rolling usage counters for rate limiting and billing
-- =====================================================

CREATE TABLE IF NOT EXISTS public.api_usage_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  counter_type TEXT NOT NULL CHECK (counter_type IN (
    'api_calls', 'media_uploads', 'storage_bytes', 'ai_requests',
    'webhook_calls', 'player_connections', 'analytics_queries'
  )),
  period_type TEXT NOT NULL CHECK (period_type IN ('hourly', 'daily', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,

  counter_value BIGINT DEFAULT 0,
  limit_value BIGINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, counter_type, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_tenant_period
  ON public.api_usage_counters(tenant_id, period_type, period_start DESC);

-- =====================================================
-- 6. CRON LATENCY TABLE
-- Track scheduled job execution times
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cron_latency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  status TEXT NOT NULL CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'timeout')),
  duration_ms INTEGER,
  delay_ms INTEGER, -- How late the job started vs scheduled

  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  error_message TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_latency_job_time
  ON public.cron_latency(job_name, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_latency_status
  ON public.cron_latency(status, scheduled_at DESC)
  WHERE status IN ('failed', 'timeout');

-- =====================================================
-- 7. ALERT RULES TABLE
-- Configurable alerting thresholds
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = global rule

  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'error_rate', 'latency', 'uptime', 'device_offline',
    'webhook_failure', 'payment_failure', 'usage_limit', 'custom'
  )),

  -- Thresholds
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,

  -- Evaluation
  evaluation_window_minutes INTEGER DEFAULT 5,
  min_samples INTEGER DEFAULT 10,

  -- Actions
  notify_email BOOLEAN DEFAULT true,
  notify_webhook BOOLEAN DEFAULT false,
  webhook_url TEXT,

  is_enabled BOOLEAN DEFAULT true,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant
  ON public.alert_rules(tenant_id, is_enabled)
  WHERE is_enabled = true;

-- =====================================================
-- 8. ALERT EVENTS TABLE
-- Triggered alerts history
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alert_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,

  current_value NUMERIC,
  threshold_value NUMERIC,

  status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_tenant_status
  ON public.alert_events(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_events_open
  ON public.alert_events(tenant_id, severity, created_at DESC)
  WHERE status = 'open';

-- =====================================================
-- 9. RPC FUNCTIONS
-- =====================================================

-- Record a metric event with tracing context
CREATE OR REPLACE FUNCTION record_metric_event(
  p_tenant_id UUID,
  p_trace_id TEXT,
  p_span_id TEXT,
  p_event_type TEXT,
  p_event_name TEXT,
  p_duration_ms INTEGER DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_error_class TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.metric_events (
    tenant_id, trace_id, span_id, event_type, event_name,
    duration_ms, status_code, error_class, error_message, metadata
  )
  VALUES (
    p_tenant_id, p_trace_id, p_span_id, p_event_type, p_event_name,
    p_duration_ms, p_status_code, p_error_class, p_error_message, p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
EXCEPTION WHEN OTHERS THEN
  -- Silently fail - metrics shouldn't break the app
  RETURN NULL;
END;
$$;

-- Get SLA breakdown for a tenant
CREATE OR REPLACE FUNCTION get_sla_breakdown(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  period_date DATE,
  uptime_percent NUMERIC,
  avg_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  device_uptime_percent NUMERIC,
  webhook_success_percent NUMERIC,
  total_requests BIGINT,
  total_errors BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(s.period_start) as period_date,
    COALESCE(s.uptime_percent, 100.00) as uptime_percent,
    COALESCE(s.avg_response_ms, 0) as avg_latency_ms,
    COALESCE(s.p95_response_ms, 0) as p95_latency_ms,
    COALESCE(s.device_uptime_percent, 100.00) as device_uptime_percent,
    COALESCE(s.webhook_success_percent, 100.00) as webhook_success_percent,
    COALESCE(s.total_requests::BIGINT, 0) as total_requests,
    COALESCE(s.failed_requests::BIGINT, 0) as total_errors
  FROM public.tenant_sla_snapshots s
  WHERE s.tenant_id = p_tenant_id
    AND s.snapshot_type = 'daily'
    AND s.period_start >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY s.period_start DESC;
END;
$$;

-- Get critical alerts across all tenants or for specific tenant
CREATE OR REPLACE FUNCTION get_critical_alerts(
  p_tenant_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  alert_type TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  current_value NUMERIC,
  threshold_value NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.tenant_id,
    p.company_name as tenant_name,
    a.alert_type,
    a.severity,
    a.title,
    a.description,
    a.current_value,
    a.threshold_value,
    a.status,
    a.created_at
  FROM public.alert_events a
  LEFT JOIN public.profiles p ON p.id = a.tenant_id
  WHERE (p_tenant_id IS NULL OR a.tenant_id = p_tenant_id)
    AND a.status = 'open'
  ORDER BY
    CASE a.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
    a.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Get metrics dashboard data
CREATE OR REPLACE FUNCTION get_metrics_dashboard(
  p_tenant_id UUID DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  metric_type TEXT,
  metric_name TEXT,
  total_count BIGINT,
  error_count BIGINT,
  avg_duration_ms NUMERIC,
  p95_duration_ms NUMERIC,
  error_rate_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.event_type as metric_type,
    me.event_name as metric_name,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE me.error_class IS NOT NULL)::BIGINT as error_count,
    ROUND(AVG(me.duration_ms)::NUMERIC, 2) as avg_duration_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY me.duration_ms)::NUMERIC, 2) as p95_duration_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE me.error_class IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0) * 100), 2
    ) as error_rate_percent
  FROM public.metric_events me
  WHERE (p_tenant_id IS NULL OR me.tenant_id = p_tenant_id)
    AND me.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY me.event_type, me.event_name
  ORDER BY total_count DESC;
END;
$$;

-- Record player network metrics
CREATE OR REPLACE FUNCTION record_player_network_metrics(
  p_device_id UUID,
  p_latency_ms INTEGER,
  p_jitter_ms INTEGER DEFAULT NULL,
  p_packet_loss_percent NUMERIC DEFAULT NULL,
  p_connection_type TEXT DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0,
  p_reconnect_count INTEGER DEFAULT 0,
  p_content_load_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_latency_bucket TEXT;
  v_metric_id UUID;
BEGIN
  -- Get tenant ID from device
  SELECT tenant_id INTO v_tenant_id
  FROM public.tv_devices
  WHERE id = p_device_id;

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Determine latency bucket
  v_latency_bucket := CASE
    WHEN p_latency_ms <= 50 THEN 'excellent'
    WHEN p_latency_ms <= 100 THEN 'good'
    WHEN p_latency_ms <= 250 THEN 'fair'
    WHEN p_latency_ms <= 500 THEN 'poor'
    ELSE 'critical'
  END;

  INSERT INTO public.player_network_metrics (
    device_id, tenant_id, latency_ms, latency_bucket, jitter_ms,
    packet_loss_percent, connection_type, retry_count, reconnect_count,
    content_load_time_ms, measured_at
  )
  VALUES (
    p_device_id, v_tenant_id, p_latency_ms, v_latency_bucket, p_jitter_ms,
    p_packet_loss_percent, p_connection_type, p_retry_count, p_reconnect_count,
    p_content_load_time_ms, NOW()
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Increment API usage counter
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_tenant_id UUID,
  p_counter_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_new_value BIGINT;
BEGIN
  -- Get current hour start for hourly counters
  v_period_start := date_trunc('hour', NOW());

  INSERT INTO public.api_usage_counters (
    tenant_id, counter_type, period_type, period_start, counter_value
  )
  VALUES (
    p_tenant_id, p_counter_type, 'hourly', v_period_start, p_amount
  )
  ON CONFLICT (tenant_id, counter_type, period_type, period_start)
  DO UPDATE SET
    counter_value = api_usage_counters.counter_value + p_amount,
    updated_at = NOW()
  RETURNING counter_value INTO v_new_value;

  RETURN v_new_value;
EXCEPTION WHEN OTHERS THEN
  RETURN -1;
END;
$$;

-- Create SLA snapshot for a tenant
CREATE OR REPLACE FUNCTION create_sla_snapshot(
  p_tenant_id UUID,
  p_snapshot_type TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_total_requests INTEGER;
  v_successful_requests INTEGER;
  v_failed_requests INTEGER;
  v_avg_response NUMERIC;
  v_p50_response NUMERIC;
  v_p95_response NUMERIC;
  v_p99_response NUMERIC;
  v_max_response NUMERIC;
  v_total_devices INTEGER;
  v_online_devices INTEGER;
  v_total_webhooks INTEGER;
  v_successful_webhooks INTEGER;
BEGIN
  -- Calculate request metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE error_class IS NULL),
    COUNT(*) FILTER (WHERE error_class IS NOT NULL),
    AVG(duration_ms),
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms),
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms),
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms),
    MAX(duration_ms)
  INTO
    v_total_requests, v_successful_requests, v_failed_requests,
    v_avg_response, v_p50_response, v_p95_response, v_p99_response, v_max_response
  FROM public.metric_events
  WHERE tenant_id = p_tenant_id
    AND event_type IN ('request', 'api_call')
    AND created_at BETWEEN p_period_start AND p_period_end;

  -- Calculate device metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_online = true)
  INTO v_total_devices, v_online_devices
  FROM public.tv_devices
  WHERE tenant_id = p_tenant_id;

  -- Calculate webhook metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered')
  INTO v_total_webhooks, v_successful_webhooks
  FROM public.webhook_events
  WHERE tenant_id = p_tenant_id
    AND created_at BETWEEN p_period_start AND p_period_end;

  -- Insert snapshot
  INSERT INTO public.tenant_sla_snapshots (
    tenant_id, snapshot_type, period_start, period_end,
    total_requests, successful_requests, failed_requests,
    uptime_percent, avg_response_ms, p50_response_ms, p95_response_ms,
    p99_response_ms, max_response_ms, total_devices, online_devices,
    offline_devices, device_uptime_percent, total_webhooks,
    successful_webhooks, failed_webhooks, webhook_success_percent
  )
  VALUES (
    p_tenant_id, p_snapshot_type, p_period_start, p_period_end,
    COALESCE(v_total_requests, 0),
    COALESCE(v_successful_requests, 0),
    COALESCE(v_failed_requests, 0),
    CASE WHEN COALESCE(v_total_requests, 0) > 0
         THEN ROUND((v_successful_requests::NUMERIC / v_total_requests * 100), 2)
         ELSE 100.00 END,
    v_avg_response, v_p50_response, v_p95_response, v_p99_response, v_max_response,
    COALESCE(v_total_devices, 0),
    COALESCE(v_online_devices, 0),
    COALESCE(v_total_devices - v_online_devices, 0),
    CASE WHEN COALESCE(v_total_devices, 0) > 0
         THEN ROUND((v_online_devices::NUMERIC / v_total_devices * 100), 2)
         ELSE 100.00 END,
    COALESCE(v_total_webhooks, 0),
    COALESCE(v_successful_webhooks, 0),
    COALESCE(v_total_webhooks - v_successful_webhooks, 0),
    CASE WHEN COALESCE(v_total_webhooks, 0) > 0
         THEN ROUND((v_successful_webhooks::NUMERIC / v_total_webhooks * 100), 2)
         ELSE 100.00 END
  )
  ON CONFLICT (tenant_id, snapshot_type, period_start)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    uptime_percent = EXCLUDED.uptime_percent,
    avg_response_ms = EXCLUDED.avg_response_ms,
    p50_response_ms = EXCLUDED.p50_response_ms,
    p95_response_ms = EXCLUDED.p95_response_ms,
    p99_response_ms = EXCLUDED.p99_response_ms,
    max_response_ms = EXCLUDED.max_response_ms,
    total_devices = EXCLUDED.total_devices,
    online_devices = EXCLUDED.online_devices,
    offline_devices = EXCLUDED.offline_devices,
    device_uptime_percent = EXCLUDED.device_uptime_percent,
    total_webhooks = EXCLUDED.total_webhooks,
    successful_webhooks = EXCLUDED.successful_webhooks,
    failed_webhooks = EXCLUDED.failed_webhooks,
    webhook_success_percent = EXCLUDED.webhook_success_percent
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

ALTER TABLE public.metric_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_sla_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_network_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_time_histograms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_latency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- Metric events: tenant can view own, super_admin can view all
CREATE POLICY "Tenants can view own metric events"
  ON public.metric_events FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- SLA snapshots: tenant can view own, admins can view all
CREATE POLICY "Tenants can view own SLA snapshots"
  ON public.tenant_sla_snapshots FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Player network metrics: tenant can view own
CREATE POLICY "Tenants can view own player network metrics"
  ON public.player_network_metrics FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Histograms: tenant can view own
CREATE POLICY "Tenants can view own histograms"
  ON public.response_time_histograms FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    tenant_id IS NULL OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Usage counters: tenant can view own
CREATE POLICY "Tenants can view own usage counters"
  ON public.api_usage_counters FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Cron latency: super_admin only
CREATE POLICY "Super admins can manage cron latency"
  ON public.cron_latency FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Alert rules: tenant can manage own
CREATE POLICY "Tenants can manage own alert rules"
  ON public.alert_rules FOR ALL
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    tenant_id IS NULL OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Alert events: tenant can view own
CREATE POLICY "Tenants can view own alert events"
  ON public.alert_events FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Tenants can update own alert events"
  ON public.alert_events FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- =====================================================
-- 11. CLEANUP FUNCTIONS
-- =====================================================

-- Cleanup old metric events (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_metric_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.metric_events
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Cleanup old player network metrics (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_player_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.player_network_metrics
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- =====================================================
-- 12. DEFAULT ALERT RULES
-- =====================================================

INSERT INTO public.alert_rules (rule_name, rule_type, warning_threshold, critical_threshold, evaluation_window_minutes, min_samples)
VALUES
  ('High Error Rate', 'error_rate', 5, 10, 5, 100),
  ('High Latency', 'latency', 500, 1000, 5, 50),
  ('Low Uptime', 'uptime', 99.5, 99, 60, 1000),
  ('Device Offline Spike', 'device_offline', 10, 25, 15, 5),
  ('Webhook Failures', 'webhook_failure', 5, 15, 10, 20),
  ('Payment Failures', 'payment_failure', 1, 3, 60, 1)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION record_metric_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_sla_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_critical_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION record_player_network_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage_counter TO authenticated;
GRANT EXECUTE ON FUNCTION create_sla_snapshot TO authenticated;
