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
