-- Migration: API Hardening
-- Created: 2026-01-21
-- Description: Enhancements for API versioning, token lifecycle, and webhook reliability

-- ============================================
-- 1. API REQUEST LOGS TABLE
-- ============================================
-- Tracks API usage for analytics and rate limiting

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES api_tokens(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  api_version TEXT DEFAULT 'v1',
  status_code INT,
  latency_ms INT,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_request_logs
CREATE INDEX IF NOT EXISTS idx_api_request_logs_token_id ON api_request_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON api_request_logs(endpoint, method);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_version ON api_request_logs(api_version);

-- Partition by month for performance (optional, depends on scale)
-- CREATE INDEX IF NOT EXISTS idx_api_request_logs_month ON api_request_logs((DATE_TRUNC('month', created_at)));

-- ============================================
-- 2. ENHANCED API TOKENS
-- ============================================
-- Add columns for better lifecycle management

-- Add rotation tracking
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS rotated_from UUID REFERENCES api_tokens(id);
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS rotation_reason TEXT;

-- Add usage tracking
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS total_requests BIGINT DEFAULT 0;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_request_ip INET;

-- ============================================
-- 3. WEBHOOK ENHANCEMENTS
-- ============================================

-- Add delivery tracking columns
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS delivery_latency_ms INT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS response_body TEXT;

-- Add webhook endpoint health tracking
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0;
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS is_disabled_auto BOOLEAN DEFAULT false;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert logs
CREATE POLICY "Service can insert api logs"
  ON api_request_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Token owners can view their logs
CREATE POLICY "Token owners can view api logs"
  ON api_request_logs FOR SELECT
  TO authenticated
  USING (
    token_id IN (
      SELECT id FROM api_tokens
      WHERE owner_id = auth.uid()
    )
  );

-- Super admins can view all logs
CREATE POLICY "Super admins can view all api logs"
  ON api_request_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Get token usage statistics
CREATE OR REPLACE FUNCTION get_token_usage_stats(p_token_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'successful_requests', COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300),
    'failed_requests', COUNT(*) FILTER (WHERE status_code >= 400),
    'avg_latency_ms', ROUND(AVG(latency_ms)),
    'endpoints_used', jsonb_agg(DISTINCT jsonb_build_object(
      'endpoint', endpoint,
      'method', method,
      'count', 1
    )),
    'requests_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'requests_this_week', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)),
    'requests_this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    'last_request_at', MAX(created_at)
  ) INTO v_stats
  FROM api_request_logs
  WHERE token_id = p_token_id;

  RETURN v_stats;
END;
$$;

-- Get webhook endpoint statistics
CREATE OR REPLACE FUNCTION get_webhook_endpoint_stats(p_endpoint_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'delivered', COUNT(*) FILTER (WHERE status = 'delivered'),
    'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'failed')),
    'exhausted', COUNT(*) FILTER (WHERE status = 'exhausted'),
    'success_rate', CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('delivered', 'exhausted')) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC /
         COUNT(*) FILTER (WHERE status IN ('delivered', 'exhausted'))::NUMERIC) * 100
      )
      ELSE 100
    END,
    'avg_latency_ms', ROUND(AVG(delivery_latency_ms) FILTER (WHERE delivery_latency_ms IS NOT NULL)),
    'events_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'events_this_week', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)),
    'last_delivery_at', MAX(last_attempt_at) FILTER (WHERE status = 'delivered')
  ) INTO v_stats
  FROM webhook_events
  WHERE endpoint_id = p_endpoint_id;

  RETURN v_stats;
END;
$$;

-- Auto-disable webhook endpoint after consecutive failures
CREATE OR REPLACE FUNCTION check_webhook_endpoint_health()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If event exhausted, increment failure counter
  IF NEW.status = 'exhausted' AND OLD.status != 'exhausted' THEN
    UPDATE webhook_endpoints
    SET
      consecutive_failures = consecutive_failures + 1,
      last_failure_at = NOW(),
      -- Auto-disable after 10 consecutive failures
      is_disabled_auto = CASE
        WHEN consecutive_failures + 1 >= 10 THEN true
        ELSE is_disabled_auto
      END
    WHERE id = NEW.endpoint_id;

  -- If event delivered, reset failure counter
  ELSIF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE webhook_endpoints
    SET
      consecutive_failures = 0,
      last_success_at = NOW(),
      is_disabled_auto = false
    WHERE id = NEW.endpoint_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for webhook health tracking
DROP TRIGGER IF EXISTS trigger_webhook_health_check ON webhook_events;
CREATE TRIGGER trigger_webhook_health_check
  AFTER UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION check_webhook_endpoint_health();

-- Cleanup old API request logs (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_request_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM api_request_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_token_usage_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_endpoint_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_api_request_logs() TO service_role;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE api_request_logs IS 'Tracks API requests for analytics, rate limiting, and debugging';
COMMENT ON FUNCTION get_token_usage_stats IS 'Returns usage statistics for an API token';
COMMENT ON FUNCTION get_webhook_endpoint_stats IS 'Returns delivery statistics for a webhook endpoint';
COMMENT ON FUNCTION check_webhook_endpoint_health IS 'Auto-disables webhooks after consecutive failures';
