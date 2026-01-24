-- Migration: GDPR Export Processing
-- Created: 2026-01-24
-- Description: RPC functions to process pending data export requests and complete the
--              GDPR Article 20 data portability flow
--
-- This migration adds:
--   1. export_data JSONB column to data_export_requests table
--   2. process_data_export(p_request_id) - processes a pending export request
--   3. get_pending_exports() - returns pending export requests for batch processing
--
-- Depends on:
--   - 106_gdpr_compliance.sql (data_export_requests table)
--   - 119_gdpr_export_data_collection.sql (collect_user_export_data function)

-- ============================================================================
-- SCHEMA UPDATES
-- ============================================================================

-- Add export_data column to store the generated JSON export
-- This allows completed exports to be stored in the database for later download
ALTER TABLE data_export_requests
ADD COLUMN IF NOT EXISTS export_data JSONB;

COMMENT ON COLUMN data_export_requests.export_data IS 'JSONB storage for completed export data, allows direct download without S3';

-- ============================================================================
-- EXPORT PROCESSING FUNCTION
-- ============================================================================

-- process_data_export: Processes a pending export request
--
-- This function:
-- 1. Validates the request exists and is in pending/processing state
-- 2. Marks the request as processing
-- 3. Calls collect_user_export_data to gather all user data
-- 4. Stores the export data in the database
-- 5. Updates status to completed with 7-day expiration
--
-- Returns JSONB with success status and export data or error message
CREATE OR REPLACE FUNCTION process_data_export(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_export_data JSONB;
BEGIN
  -- Get and lock the request to prevent concurrent processing
  SELECT * INTO v_request
  FROM data_export_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Validate request exists
  IF v_request IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;

  -- Validate request is in a processable state
  -- Allow both 'pending' (new request) and 'processing' (retry after failure)
  IF v_request.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request already processed or cancelled',
      'currentStatus', v_request.status
    );
  END IF;

  -- Mark as processing with timestamp
  UPDATE data_export_requests
  SET status = 'processing',
      started_at = NOW()
  WHERE id = p_request_id;

  -- Collect all user data using the comprehensive collection function from 11-01
  -- This function returns a complete JSONB structure with all user data
  SELECT collect_user_export_data(v_request.user_id) INTO v_export_data;

  -- Check if data collection succeeded
  IF v_export_data ? 'error' AND NOT (v_export_data ? 'profile') THEN
    -- Collection failed, mark as failed
    UPDATE data_export_requests
    SET status = 'failed',
        completed_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Data collection failed',
      'details', v_export_data->>'error'
    );
  END IF;

  -- Store export data and mark as completed
  -- Set 7-day expiration per GDPR Article 20 reasonable retention
  UPDATE data_export_requests
  SET status = 'completed',
      export_data = v_export_data,
      completed_at = NOW(),
      expires_at = NOW() + INTERVAL '7 days',
      file_size_bytes = octet_length(v_export_data::text)
  WHERE id = p_request_id;

  -- Return success response with export data
  -- The caller (Edge Function or job) can use this to provide download
  RETURN jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'userId', v_request.user_id,
    'exportData', v_export_data,
    'expiresAt', (NOW() + INTERVAL '7 days')::text,
    'fileSizeBytes', octet_length(v_export_data::text)
  );
END;
$$;

COMMENT ON FUNCTION process_data_export IS 'GDPR Article 20: Processes a pending export request by collecting user data and storing it for download. Returns success/error status with export data.';

-- ============================================================================
-- PENDING EXPORTS RETRIEVAL FUNCTION
-- ============================================================================

-- get_pending_exports: Returns pending export requests for batch processing
--
-- Used by scheduled jobs/Edge Functions to find requests that need processing
-- Returns oldest requests first (FIFO), limited to 10 per batch
-- STABLE because it only reads data
CREATE OR REPLACE FUNCTION get_pending_exports()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  format TEXT,
  requested_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    der.id,
    der.user_id,
    der.format,
    der.requested_at
  FROM data_export_requests der
  WHERE der.status = 'pending'
  ORDER BY der.requested_at ASC
  LIMIT 10;
$$;

COMMENT ON FUNCTION get_pending_exports IS 'Returns up to 10 pending export requests for batch processing, ordered by request time (FIFO)';

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant EXECUTE to service_role only
-- These functions are for background job processing, not direct user access
-- Users request exports via request_data_export() which is already granted
REVOKE ALL ON FUNCTION process_data_export FROM PUBLIC;
REVOKE ALL ON FUNCTION process_data_export FROM authenticated;
GRANT EXECUTE ON FUNCTION process_data_export TO service_role;

REVOKE ALL ON FUNCTION get_pending_exports FROM PUBLIC;
REVOKE ALL ON FUNCTION get_pending_exports FROM authenticated;
GRANT EXECUTE ON FUNCTION get_pending_exports TO service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Created functions:
--   - process_data_export(p_request_id UUID) -> JSONB
--   - get_pending_exports() -> TABLE(id, user_id, format, requested_at)
--
-- Schema changes:
--   - Added export_data JSONB column to data_export_requests
--
-- Status flow:
--   pending -> processing -> completed (with 7-day expiration)
--   pending -> processing -> failed (if data collection fails)
-- ============================================================================
