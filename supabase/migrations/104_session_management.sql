-- Migration: Session Management and Login History
-- Created: 2026-01-21
-- Description: Adds tables for session tracking and login history

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  ip_address INET,
  location TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Login History Table
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address INET,
  location TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  user_agent TEXT,
  mfa_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for login_history
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(user_id, success);

-- RLS Policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for login_history
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert login history (for tracking failed attempts)
CREATE POLICY "Service can insert login history"
  ON login_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert their own login history
CREATE POLICY "Users can insert own login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to record login history
CREATE OR REPLACE FUNCTION record_login_history(
  p_user_id UUID,
  p_email TEXT,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::JSONB,
  p_mfa_used BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO login_history (
    user_id,
    email,
    success,
    failure_reason,
    ip_address,
    device_type,
    browser,
    os,
    user_agent,
    mfa_used
  ) VALUES (
    p_user_id,
    p_email,
    p_success,
    p_failure_reason,
    p_ip_address,
    p_device_info->>'device_type',
    p_device_info->>'browser',
    p_device_info->>'os',
    p_device_info->>'user_agent',
    p_mfa_used
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

-- Function to clean up old sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark sessions inactive if no activity in 30 days
  UPDATE user_sessions
  SET is_active = false,
      ended_at = NOW()
  WHERE is_active = true
    AND last_activity < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Delete sessions older than 90 days
  DELETE FROM user_sessions
  WHERE created_at < NOW() - INTERVAL '90 days';

  RETURN v_count;
END;
$$;

-- Function to clean up old login history (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_login_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Keep login history for 1 year
  DELETE FROM login_history
  WHERE created_at < NOW() - INTERVAL '365 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION record_login_history TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sessions TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_login_history TO service_role;

-- Comments
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions across devices';
COMMENT ON TABLE login_history IS 'Audit log of login attempts (successful and failed)';
COMMENT ON FUNCTION record_login_history IS 'Records a login attempt in the history';
COMMENT ON FUNCTION cleanup_old_sessions IS 'Cleanup job for expired sessions';
COMMENT ON FUNCTION cleanup_old_login_history IS 'Cleanup job for old login history';
