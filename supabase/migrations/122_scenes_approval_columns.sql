-- Migration 122: Add approval columns to scenes table
-- Extends content approval system to include scenes
-- Following the pattern established in migration 027 for playlists/layouts/campaigns

-- ============================================================================
-- 1. Add approval columns to scenes (matching playlists/layouts/campaigns pattern)
-- ============================================================================

ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'in_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_comment TEXT;

-- ============================================================================
-- 2. Create index for approval queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scenes_approval_status ON scenes(tenant_id, approval_status);

-- ============================================================================
-- 3. Update review_requests resource_type check to include 'scene'
-- ============================================================================

ALTER TABLE review_requests
DROP CONSTRAINT IF EXISTS review_requests_resource_type_check;

ALTER TABLE review_requests
ADD CONSTRAINT review_requests_resource_type_check
CHECK (resource_type IN ('playlist', 'layout', 'campaign', 'scene'));

-- ============================================================================
-- 4. Update preview_links resource_type check to include 'scene'
-- ============================================================================

ALTER TABLE preview_links
DROP CONSTRAINT IF EXISTS preview_links_resource_type_check;

ALTER TABLE preview_links
ADD CONSTRAINT preview_links_resource_type_check
CHECK (resource_type IN ('playlist', 'layout', 'campaign', 'scene'));

-- ============================================================================
-- 5. Update the v_review_requests_with_details view to include scenes
-- ============================================================================

CREATE OR REPLACE VIEW v_review_requests_with_details AS
SELECT
  rr.*,
  CASE rr.resource_type
    WHEN 'playlist' THEN (SELECT name FROM playlists WHERE id = rr.resource_id)
    WHEN 'layout' THEN (SELECT name FROM layouts WHERE id = rr.resource_id)
    WHEN 'campaign' THEN (SELECT name FROM campaigns WHERE id = rr.resource_id)
    WHEN 'scene' THEN (SELECT name FROM scenes WHERE id = rr.resource_id)
  END AS resource_name,
  (SELECT full_name FROM profiles WHERE id = rr.requested_by) AS requested_by_name,
  (SELECT full_name FROM profiles WHERE id = rr.decided_by) AS decided_by_name,
  (SELECT COUNT(*) FROM review_comments WHERE review_id = rr.id) AS comment_count
FROM review_requests rr;

-- Grant select on view (re-grant in case view was replaced)
GRANT SELECT ON v_review_requests_with_details TO authenticated;

-- ============================================================================
-- 6. Comments
-- ============================================================================

COMMENT ON COLUMN scenes.approval_status IS 'Content approval status: draft, in_review, approved, rejected';
COMMENT ON COLUMN scenes.approval_requested_by IS 'User who requested approval review';
COMMENT ON COLUMN scenes.approval_decided_by IS 'User who approved or rejected the content';
COMMENT ON COLUMN scenes.approval_requested_at IS 'When approval was requested';
COMMENT ON COLUMN scenes.approval_decided_at IS 'When approval decision was made';
COMMENT ON COLUMN scenes.approval_comment IS 'Comment from approver (especially for rejections)';

DO $$ BEGIN RAISE NOTICE 'Migration 122 completed: scenes approval columns and constraint updates added'; END $$;
