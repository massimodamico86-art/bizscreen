-- Migration: GDPR Deletion Execution Functions
-- Created: 2026-01-24
-- Description: RPC functions for executing scheduled account deletions
-- GDPR Article 17: Right to erasure - handles staged deletion process

-- ============================================
-- MEDIA URL COLLECTION FUNCTION
-- ============================================
-- CRITICAL: Must be called BEFORE database deletion
-- CASCADE delete on profiles will remove media_assets records,
-- so we capture URLs first for S3/Cloudinary cleanup

CREATE OR REPLACE FUNCTION get_media_urls_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'id', id,
      'url', url,
      'thumbnailUrl', thumbnail_url,
      'type', type
    )),
    '[]'::jsonb
  )
  FROM media_assets
  WHERE owner_id = p_user_id;
$$;

-- Only service_role can collect URLs for deletion
GRANT EXECUTE ON FUNCTION get_media_urls_for_user TO service_role;
REVOKE EXECUTE ON FUNCTION get_media_urls_for_user FROM PUBLIC;

COMMENT ON FUNCTION get_media_urls_for_user IS
  'Collects all media URLs for a user before deletion. Must be called before database cascade delete.';

-- ============================================
-- PENDING DELETIONS QUERY FUNCTION
-- ============================================
-- Returns deletion requests that are past grace period and ready for execution

CREATE OR REPLACE FUNCTION get_pending_deletions()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  scheduled_deletion_at TIMESTAMPTZ,
  reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    adr.id,
    adr.user_id,
    adr.email,
    adr.scheduled_deletion_at,
    adr.reason
  FROM account_deletion_requests adr
  WHERE adr.status = 'scheduled'
    AND adr.scheduled_deletion_at <= NOW()
  ORDER BY adr.scheduled_deletion_at ASC
  LIMIT 10;
$$;

-- Only service_role can query pending deletions
GRANT EXECUTE ON FUNCTION get_pending_deletions TO service_role;
REVOKE EXECUTE ON FUNCTION get_pending_deletions FROM PUBLIC;

COMMENT ON FUNCTION get_pending_deletions IS
  'Returns up to 10 deletion requests past their 30-day grace period, ready for execution.';

-- ============================================
-- ACCOUNT DELETION EXECUTION FUNCTION
-- ============================================
-- Handles the database-side deletion with proper staging
-- Note: External deletions (S3/Cloudinary) must be handled by calling code BEFORE this

CREATE OR REPLACE FUNCTION execute_account_deletion(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_result JSONB;
BEGIN
  -- Lock the request row to prevent concurrent execution
  SELECT id, user_id, email, status, scheduled_deletion_at
  INTO v_request
  FROM account_deletion_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;

  -- Validate request exists
  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found',
      'request_id', p_request_id
    );
  END IF;

  -- Validate status is 'scheduled'
  IF v_request.status != 'scheduled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request is not in scheduled status',
      'request_id', p_request_id,
      'current_status', v_request.status
    );
  END IF;

  -- Validate grace period has passed
  IF v_request.scheduled_deletion_at > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Grace period has not ended',
      'request_id', p_request_id,
      'scheduled_at', v_request.scheduled_deletion_at
    );
  END IF;

  -- Update status to 'processing'
  UPDATE account_deletion_requests
  SET status = 'processing'
  WHERE id = p_request_id;

  -- Delete user from auth.users (cascades to profiles and all owned data)
  -- This also invalidates all sessions
  DELETE FROM auth.users WHERE id = v_request.user_id;

  -- Update request status to 'completed'
  -- Note: The request survives because it's not linked to auth.users via CASCADE
  UPDATE account_deletion_requests
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_request_id;

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'user_id', v_request.user_id,
    'email', v_request.email,
    'completed_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request is being processed by another worker',
      'request_id', p_request_id
    );
  WHEN OTHERS THEN
    -- Attempt to mark as failed (may fail if in bad state)
    BEGIN
      UPDATE account_deletion_requests
      SET status = 'scheduled' -- Revert to scheduled so it can be retried
      WHERE id = p_request_id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignore errors in error handler
    END;

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'request_id', p_request_id
    );
END;
$$;

-- Only service_role can execute deletions
GRANT EXECUTE ON FUNCTION execute_account_deletion TO service_role;
REVOKE EXECUTE ON FUNCTION execute_account_deletion FROM PUBLIC;

COMMENT ON FUNCTION execute_account_deletion IS
  'Executes account deletion after grace period. Must call get_media_urls_for_user BEFORE this to capture external URLs.';

-- ============================================
-- GDPR AUDIT LOG TABLE
-- ============================================
-- Required for GDPR Article 5(2) accountability
-- Tracks all deletion events for compliance verification

CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'deletion_started',
      'external_deleted',
      'db_deleted',
      'deletion_completed',
      'deletion_failed'
    )
  ),
  user_id UUID, -- May be null after deletion completes
  email TEXT NOT NULL, -- Preserved for audit (required for compliance)
  request_id UUID REFERENCES account_deletion_requests(id) ON DELETE SET NULL,
  details JSONB, -- Additional event-specific information
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_email ON gdpr_audit_log(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_created ON gdpr_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_event_type ON gdpr_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_request ON gdpr_audit_log(request_id);

-- Retention comment for compliance
COMMENT ON TABLE gdpr_audit_log IS
  'GDPR Article 5(2) accountability - deletion audit trail retained 1 year for compliance verification.';

-- No RLS - only service_role accesses this table
ALTER TABLE gdpr_audit_log ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon - only service_role can access
-- Service role bypasses RLS by default

-- ============================================
-- GDPR AUDIT LOGGING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_gdpr_event(
  p_event_type TEXT,
  p_user_id UUID,
  p_email TEXT,
  p_request_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO gdpr_audit_log (event_type, user_id, email, request_id, details)
  VALUES (p_event_type, p_user_id, p_email, p_request_id, p_details)
  RETURNING id;
$$;

-- Only service_role can log events
GRANT EXECUTE ON FUNCTION log_gdpr_event TO service_role;
REVOKE EXECUTE ON FUNCTION log_gdpr_event FROM PUBLIC;

COMMENT ON FUNCTION log_gdpr_event IS
  'Logs GDPR deletion events for compliance audit trail. Call at each stage of deletion process.';
