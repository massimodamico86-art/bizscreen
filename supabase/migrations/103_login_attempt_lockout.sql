-- ============================================
-- Login Attempt Tracking & Account Lockout
-- ============================================
-- Tracks failed login attempts per email and enforces
-- account lockout after 5 failures (15 minute cooldown).
-- ============================================

-- Table to track login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  attempted_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,

  -- Index for fast lookups
  CONSTRAINT login_attempts_email_idx UNIQUE (id)
);

-- Create index on email and timestamp for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, attempted_at DESC);

-- Create index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_login_attempts_time
  ON login_attempts (attempted_at);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow insert from authenticated or anon users (for login tracking)
CREATE POLICY "Anyone can insert login attempts"
  ON login_attempts FOR INSERT
  WITH CHECK (true);

-- Only service role can read (for security)
CREATE POLICY "Service role can read login attempts"
  ON login_attempts FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- Function: Check if email is locked out
-- ============================================
-- Returns lockout status without requiring authentication
-- Called before attempting login
-- ============================================
CREATE OR REPLACE FUNCTION public.check_login_lockout(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_count int;
  v_lockout_until timestamptz;
  v_lockout_minutes int := 15;
  v_max_attempts int := 5;
  v_window_minutes int := 15;
BEGIN
  -- Count failed attempts in the last window
  SELECT COUNT(*)
  INTO v_failed_count
  FROM login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND attempted_at > now() - (v_window_minutes || ' minutes')::interval;

  -- Check if locked out
  IF v_failed_count >= v_max_attempts THEN
    -- Get the time of the last failed attempt
    SELECT attempted_at + (v_lockout_minutes || ' minutes')::interval
    INTO v_lockout_until
    FROM login_attempts
    WHERE email = lower(p_email)
      AND success = false
    ORDER BY attempted_at DESC
    LIMIT 1;

    -- If still locked out
    IF v_lockout_until > now() THEN
      RETURN jsonb_build_object(
        'locked', true,
        'attempts', v_failed_count,
        'lockout_until', v_lockout_until,
        'minutes_remaining', EXTRACT(EPOCH FROM (v_lockout_until - now())) / 60
      );
    END IF;
  END IF;

  -- Not locked out
  RETURN jsonb_build_object(
    'locked', false,
    'attempts', v_failed_count,
    'remaining_attempts', v_max_attempts - v_failed_count
  );
END;
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.check_login_lockout(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_login_lockout(text) TO authenticated;

-- ============================================
-- Function: Record login attempt
-- ============================================
-- Records a login attempt (success or failure)
-- Called after attempting login
-- ============================================
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record the attempt
  INSERT INTO login_attempts (email, success, ip_address, user_agent)
  VALUES (lower(p_email), p_success, p_ip_address, p_user_agent);

  -- If successful, optionally clear old failed attempts for this email
  -- This resets the lockout counter on successful login
  IF p_success THEN
    DELETE FROM login_attempts
    WHERE email = lower(p_email)
      AND success = false
      AND attempted_at < now() - interval '1 hour';
  END IF;
END;
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text, text) TO authenticated;

-- ============================================
-- Cleanup job: Remove old login attempts
-- ============================================
-- This function can be called by a cron job to clean up old records
-- Keeps last 30 days of login attempts for audit purposes
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM login_attempts
  WHERE attempted_at < now() - interval '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Only service role can run cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO service_role;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE login_attempts IS 'Tracks login attempts for account lockout and security auditing';
COMMENT ON FUNCTION public.check_login_lockout IS 'Check if an email is locked out due to too many failed attempts';
COMMENT ON FUNCTION public.record_login_attempt IS 'Record a login attempt (success or failure)';
COMMENT ON FUNCTION public.cleanup_old_login_attempts IS 'Remove login attempts older than 30 days';
