-- Migration: Sanitization Events Table
-- Purpose: Track DOMPurify sanitization events for security monitoring
-- Part of: Phase 02 XSS Prevention

-- Create sanitization_events table
CREATE TABLE IF NOT EXISTS sanitization_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_summary JSONB NOT NULL DEFAULT '{}',
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment on table and columns
COMMENT ON TABLE sanitization_events IS 'Tracks sanitization events when DOMPurify removes potentially malicious content';
COMMENT ON COLUMN sanitization_events.user_id IS 'User who submitted content that was sanitized (nullable for anonymous)';
COMMENT ON COLUMN sanitization_events.removed_summary IS 'Summary of removed elements (e.g., {scripts: 2, handlers: 1}), NOT the actual content';
COMMENT ON COLUMN sanitization_events.context IS 'Where sanitization occurred (e.g., playlist-description, template-content)';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sanitization_events_user_id ON sanitization_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sanitization_events_created_at ON sanitization_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE sanitization_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view sanitization events
CREATE POLICY "Admins can view sanitization events"
  ON sanitization_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: System can insert sanitization events (any authenticated user)
-- This allows logging events even for non-admin users
CREATE POLICY "System can insert sanitization events"
  ON sanitization_events FOR INSERT
  WITH CHECK (true);

-- Create RPC function to get flagged users with threshold
CREATE OR REPLACE FUNCTION get_flagged_sanitization_users(p_threshold INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  event_count BIGINT,
  last_event TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    se.user_id,
    p.email,
    p.full_name,
    COUNT(se.id) AS event_count,
    MAX(se.created_at) AS last_event
  FROM sanitization_events se
  LEFT JOIN profiles p ON se.user_id = p.id
  WHERE se.user_id IS NOT NULL
  GROUP BY se.user_id, p.email, p.full_name
  HAVING COUNT(se.id) >= p_threshold
  ORDER BY event_count DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_flagged_sanitization_users TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION get_flagged_sanitization_users IS 'Returns users with sanitization event count >= threshold (admin only)';
