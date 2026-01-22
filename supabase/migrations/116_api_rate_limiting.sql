-- ============================================
-- API Rate Limiting
-- ============================================
-- Tracks API request counts per identifier (user_id or IP)
-- and action type. Enforces rate limits with fixed 15-minute windows.
-- ============================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,        -- user_id or IP address
  action text NOT NULL,            -- 'media_upload', 'scene_create', etc.
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups during rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON api_rate_limits (identifier, action, created_at DESC);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_rate_limits_time
  ON api_rate_limits (created_at);

-- Enable RLS
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow insert from authenticated users
CREATE POLICY "Authenticated users can insert rate limit records"
  ON api_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role can read for monitoring
CREATE POLICY "Service role can read rate limits"
  ON api_rate_limits FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- Function: Check and record rate limit
-- ============================================
-- Atomically checks if identifier has exceeded rate limit
-- and records the current request if allowed.
-- Returns: { allowed: boolean, current_count: int, retry_after_seconds: int }
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_requests integer,
  p_window_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz := now() - (p_window_minutes || ' minutes')::interval;
  v_oldest_in_window timestamptz;
  v_retry_seconds integer;
BEGIN
  -- Lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_identifier || p_action));

  -- Count requests in current window
  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_oldest_in_window
  FROM api_rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > v_window_start;

  -- Check if limit exceeded
  IF v_count >= p_max_requests THEN
    -- Calculate seconds until oldest request expires
    v_retry_seconds := GREATEST(1, EXTRACT(EPOCH FROM (
      v_oldest_in_window + (p_window_minutes || ' minutes')::interval - now()
    ))::integer);

    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'retry_after_seconds', v_retry_seconds,
      'limit', p_max_requests
    );
  END IF;

  -- Record this request
  INSERT INTO api_rate_limits (identifier, action)
  VALUES (p_identifier, p_action);

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'remaining', p_max_requests - v_count - 1,
    'limit', p_max_requests
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO authenticated;

-- ============================================
-- Cleanup job: Remove old rate limit records
-- ============================================
-- Records older than 1 day are no longer needed for rate limiting
-- Call from cron or scheduled job
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM api_rate_limits
  WHERE created_at < now() - interval '1 day';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Only service role can run cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE api_rate_limits IS 'Tracks API requests for rate limiting enforcement';
COMMENT ON FUNCTION public.check_rate_limit IS 'Atomically check and record rate limit, returns allowed status with retry info';
COMMENT ON FUNCTION public.cleanup_rate_limits IS 'Remove rate limit records older than 1 day';
