-- Migration: 052_fix_announcements_function.sql
-- Purpose: Create the missing get_active_announcements_for_tenant function
--          that the frontend calls for fetching announcements
--
-- The frontend calls: get_active_announcements_for_tenant(p_tenant_id, p_plan)
-- But only get_active_announcements(p_tenant_id, p_user_id, p_plan) exists

-- ============================================================================
-- CREATE WRAPPER FUNCTION WITH CORRECT SIGNATURE
-- ============================================================================

-- Drop the function if it exists with any signature
DROP FUNCTION IF EXISTS get_active_announcements_for_tenant(UUID, TEXT);

-- Create the function that the frontend expects
-- This wraps get_active_announcements but uses auth.uid() for the user_id
CREATE OR REPLACE FUNCTION get_active_announcements_for_tenant(
  p_tenant_id UUID DEFAULT NULL,
  p_plan TEXT DEFAULT 'free'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  cta_text TEXT,
  cta_url TEXT,
  dismissible BOOLEAN,
  priority BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- If no user is authenticated, return empty
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Return announcements with the column names the frontend expects
  -- The frontend expects: id, title, message, type, cta_text, cta_url, dismissible, priority
  -- The existing function returns: id, title, body, category, priority, display_type, action_url, action_label, icon, is_dismissible, starts_at
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.body AS message,
    a.category AS type,
    a.action_label AS cta_text,
    a.action_url AS cta_url,
    a.is_dismissible AS dismissible,
    (a.priority >= 100) AS priority  -- High priority = priority >= 100
  FROM in_app_announcements a
  WHERE
    a.starts_at <= now()
    AND (a.ends_at IS NULL OR a.ends_at > now())
    AND (
      a.audience = 'all'
      OR (a.audience = 'by_plan' AND p_plan = ANY(a.target_plans))
      OR (a.audience = 'by_tenant' AND p_tenant_id = ANY(a.target_tenant_ids))
    )
    AND NOT EXISTS (
      SELECT 1 FROM announcement_dismissals ad
      WHERE ad.announcement_id = a.id AND ad.user_id = v_user_id
    )
  ORDER BY a.priority DESC, a.starts_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_announcements_for_tenant(UUID, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_active_announcements_for_tenant(UUID, TEXT) IS
'Get active announcements for the current user, optionally filtered by tenant and plan.
Returns announcements in the format expected by the frontend (feedbackService.js).';
