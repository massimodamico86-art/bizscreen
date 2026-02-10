-- Migration 143: Create Unsplash rate limit tracking table and check function
-- Purpose: Enforces per-tenant hourly rate limits for Unsplash API proxy requests.
-- The check_unsplash_rate_limit function atomically increments the request counter
-- and returns whether the request is allowed, using an ON CONFLICT upsert to handle
-- concurrent requests safely.
--
-- This table is internal infrastructure -- accessed only by the unsplash-proxy Edge Function
-- using the service role key. No RLS policies are needed.

CREATE TABLE IF NOT EXISTS unsplash_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tenant_id, window_start)
);

-- Fast lookups by tenant and window
CREATE INDEX idx_unsplash_rate_tenant ON unsplash_rate_limits(tenant_id, window_start);

COMMENT ON TABLE unsplash_rate_limits IS
  'Tracks per-tenant hourly request counts for Unsplash proxy rate limiting. '
  'Internal infrastructure table -- accessed only by the unsplash-proxy Edge Function via service role key. No RLS needed.';

-- Atomic rate limit check-and-increment function.
-- Upserts the request counter for the current hour window and returns
-- whether the request is allowed based on the configured maximum.
CREATE OR REPLACE FUNCTION check_unsplash_rate_limit(
  p_tenant_id UUID,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_allowed INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Truncate to current hour boundary for the rate limit window
  v_window_start := date_trunc('hour', now());

  -- Atomically insert or increment the counter for this tenant+window
  INSERT INTO unsplash_rate_limits (tenant_id, window_start, request_count)
  VALUES (p_tenant_id, v_window_start, 1)
  ON CONFLICT (tenant_id, window_start)
  DO UPDATE SET request_count = unsplash_rate_limits.request_count + 1
  RETURNING unsplash_rate_limits.request_count INTO v_count;

  -- Return the rate limit check result
  RETURN QUERY SELECT
    v_count <= p_max_requests,
    v_count,
    p_max_requests,
    EXTRACT(EPOCH FROM (v_window_start + interval '1 hour' - now()))::INTEGER;
END;
$$;

COMMENT ON FUNCTION check_unsplash_rate_limit IS
  'Atomically checks and increments the per-tenant hourly rate limit counter for Unsplash proxy requests. '
  'Returns whether the request is allowed, the current count, maximum allowed, and seconds until window reset.';
