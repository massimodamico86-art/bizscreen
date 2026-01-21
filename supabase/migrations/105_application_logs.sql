-- Migration: Application Logs Table
-- Created: 2026-01-21
-- Description: Stores critical application logs for monitoring and debugging

-- Application Logs Table (for critical errors and important events)
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  correlation_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  url TEXT,
  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for application_logs
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_tenant_id ON application_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_correlation_id ON application_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_created_at ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_level_created ON application_logs(level, created_at DESC);

-- RLS Policies
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all logs"
  ON application_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Admins can view their tenant's logs
CREATE POLICY "Admins can view tenant logs"
  ON application_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants
      WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Service role can insert logs
CREATE POLICY "Service can insert logs"
  ON application_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own logs"
  ON application_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Function to clean up old logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_application_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Keep logs for different retention periods based on level
  -- Fatal/Error: 90 days
  -- Warn: 30 days
  -- Info and below: 7 days

  DELETE FROM application_logs
  WHERE (level IN ('fatal', 'error') AND created_at < NOW() - INTERVAL '90 days')
     OR (level = 'warn' AND created_at < NOW() - INTERVAL '30 days')
     OR (level IN ('trace', 'debug', 'info') AND created_at < NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to get log statistics
CREATE OR REPLACE FUNCTION get_log_statistics(
  p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  level TEXT,
  count BIGINT,
  first_occurrence TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.level,
    COUNT(*)::BIGINT as count,
    MIN(al.created_at) as first_occurrence,
    MAX(al.created_at) as last_occurrence
  FROM application_logs al
  WHERE al.created_at BETWEEN p_start_time AND p_end_time
  GROUP BY al.level
  ORDER BY
    CASE al.level
      WHEN 'fatal' THEN 1
      WHEN 'error' THEN 2
      WHEN 'warn' THEN 3
      WHEN 'info' THEN 4
      WHEN 'debug' THEN 5
      WHEN 'trace' THEN 6
    END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_application_logs TO service_role;
GRANT EXECUTE ON FUNCTION get_log_statistics TO authenticated;

-- Comments
COMMENT ON TABLE application_logs IS 'Stores critical application logs for monitoring and debugging';
COMMENT ON FUNCTION cleanup_old_application_logs IS 'Cleanup job for old logs with level-based retention';
COMMENT ON FUNCTION get_log_statistics IS 'Get aggregated log statistics for a time range';
