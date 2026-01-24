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
