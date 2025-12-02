-- ============================================================================
-- Migration 043: High Priority Fixes (H5, H6, H9, H10)
-- ============================================================================
-- This migration addresses:
-- H5: Campaign content weights - implement weighted rotation
-- H6: Campaign scheduling timezone-awareness
-- H9: RLS DELETE policy for review_comments
-- H10: Approval workflow notifications
-- ============================================================================

-- ============================================================================
-- H9: Add DELETE policy for review_comments
-- ============================================================================

-- Allow deletion by comment author or tenant admin
CREATE POLICY "review_comments_delete_policy"
  ON review_comments FOR DELETE
  TO authenticated
  USING (
    -- Author can delete their own comments
    author_id = auth.uid()
    OR
    -- Tenant admin/owner can delete comments in their reviews
    EXISTS (
      SELECT 1 FROM review_requests rr
      INNER JOIN profiles p ON p.id = auth.uid()
      WHERE rr.id = review_comments.review_id
        AND (rr.tenant_id = p.id OR rr.tenant_id IN (SELECT id FROM profiles WHERE managed_by = p.id))
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- H5 & H6: Update campaign content resolution with weighted selection and timezone
-- ============================================================================

-- Helper function for weighted random selection
CREATE OR REPLACE FUNCTION public.select_weighted_content(p_campaign_id UUID)
RETURNS TABLE (content_type TEXT, content_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_weight INTEGER;
    v_random INTEGER;
    v_running_weight INTEGER := 0;
    v_content RECORD;
BEGIN
    -- Get total weight
    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.campaign_contents
    WHERE campaign_id = p_campaign_id;

    -- If no content or zero weight, return first item
    IF v_total_weight = 0 THEN
        RETURN QUERY
        SELECT cc.content_type, cc.content_id
        FROM public.campaign_contents cc
        WHERE cc.campaign_id = p_campaign_id
        ORDER BY cc.position ASC
        LIMIT 1;
        RETURN;
    END IF;

    -- Generate random number between 1 and total weight
    v_random := floor(random() * v_total_weight) + 1;

    -- Iterate through contents and select based on cumulative weight
    FOR v_content IN
        SELECT cc.content_type, cc.content_id, cc.weight
        FROM public.campaign_contents cc
        WHERE cc.campaign_id = p_campaign_id
        ORDER BY cc.position ASC
    LOOP
        v_running_weight := v_running_weight + COALESCE(v_content.weight, 1);
        IF v_random <= v_running_weight THEN
            content_type := v_content.content_type;
            content_id := v_content.content_id;
            RETURN NEXT;
            RETURN;
        END IF;
    END LOOP;

    -- Fallback to first content
    RETURN QUERY
    SELECT cc.content_type, cc.content_id
    FROM public.campaign_contents cc
    WHERE cc.campaign_id = p_campaign_id
    ORDER BY cc.position ASC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.select_weighted_content IS
  'Selects campaign content using weighted random selection based on content weights';

-- Update get_active_campaign_for_screen with timezone-aware scheduling and weighted content
CREATE OR REPLACE FUNCTION public.get_active_campaign_for_screen(
    p_screen_id UUID,
    p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name TEXT,
    priority INTEGER,
    effective_target TEXT,
    content_type TEXT,
    content_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_screen RECORD;
    v_screen_tz TEXT;
    v_local_now TIMESTAMPTZ;
BEGIN
    -- Get screen details including timezone
    SELECT
        d.id,
        d.tenant_id,
        d.screen_group_id,
        d.location_id,
        COALESCE(d.timezone, 'UTC') AS timezone
    INTO v_screen
    FROM public.tv_devices d
    WHERE d.id = p_screen_id;

    IF v_screen IS NULL THEN
        RETURN;
    END IF;

    -- Use screen timezone for local time comparison (H6)
    v_screen_tz := v_screen.timezone;

    -- Find active campaigns targeting this screen
    -- Priority order: direct screen > screen_group > location > all
    -- Then by campaign priority (higher first)
    -- Uses weighted content selection (H5)
    RETURN QUERY
    WITH matched_campaigns AS (
        SELECT DISTINCT ON (c.id)
            c.id AS campaign_id,
            c.name AS campaign_name,
            c.priority,
            ct.target_type AS effective_target,
            CASE ct.target_type
                WHEN 'screen' THEN 1
                WHEN 'screen_group' THEN 2
                WHEN 'location' THEN 3
                WHEN 'all' THEN 4
            END AS target_specificity
        FROM public.campaigns c
        INNER JOIN public.campaign_targets ct ON ct.campaign_id = c.id
        WHERE c.tenant_id = v_screen.tenant_id
          AND c.status IN ('active', 'scheduled')
          -- H6: Convert campaign times to screen timezone for comparison
          AND (c.start_at IS NULL OR (c.start_at AT TIME ZONE v_screen_tz) <= (p_now AT TIME ZONE v_screen_tz))
          AND (c.end_at IS NULL OR (c.end_at AT TIME ZONE v_screen_tz) > (p_now AT TIME ZONE v_screen_tz))
          AND (
              -- Target: specific screen
              (ct.target_type = 'screen' AND ct.target_id = p_screen_id)
              -- Target: screen's group
              OR (ct.target_type = 'screen_group' AND ct.target_id = v_screen.screen_group_id AND v_screen.screen_group_id IS NOT NULL)
              -- Target: screen's location
              OR (ct.target_type = 'location' AND ct.target_id = v_screen.location_id AND v_screen.location_id IS NOT NULL)
              -- Target: all screens
              OR (ct.target_type = 'all')
          )
        ORDER BY c.id, target_specificity ASC
    ),
    best_campaign AS (
        SELECT mc.*
        FROM matched_campaigns mc
        ORDER BY mc.target_specificity ASC, mc.priority DESC
        LIMIT 1
    )
    -- H5: Use weighted content selection instead of just taking first item
    SELECT
        bc.campaign_id,
        bc.campaign_name,
        bc.priority,
        bc.effective_target,
        wc.content_type,
        wc.content_id
    FROM best_campaign bc
    CROSS JOIN LATERAL public.select_weighted_content(bc.campaign_id) wc;
END;
$$;

COMMENT ON FUNCTION public.get_active_campaign_for_screen IS
  'Returns the highest priority active campaign targeting a screen with timezone-aware scheduling and weighted content selection';

-- ============================================================================
-- H10: Approval workflow notifications
-- ============================================================================

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'review_requested', 'review_approved', 'review_rejected', 'review_comment'
    title TEXT NOT NULL,
    message TEXT,
    resource_type TEXT,
    resource_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
CREATE POLICY "notifications_select_policy"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin()
    OR (is_admin() AND notifications.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
  );

DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create approval notifications
CREATE OR REPLACE FUNCTION public.notify_approval_event(
    p_tenant_id UUID,
    p_event_type TEXT,  -- 'requested', 'approved', 'rejected'
    p_resource_type TEXT,
    p_resource_id UUID,
    p_resource_name TEXT,
    p_actor_name TEXT DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Build notification title and message based on event type
    CASE p_event_type
        WHEN 'requested' THEN
            v_title := 'Review Requested';
            v_message := format('A review has been requested for %s: %s', p_resource_type, p_resource_name);
        WHEN 'approved' THEN
            v_title := 'Content Approved';
            v_message := format('Your %s "%s" has been approved%s', p_resource_type, p_resource_name,
                CASE WHEN p_actor_name IS NOT NULL THEN format(' by %s', p_actor_name) ELSE '' END);
        WHEN 'rejected' THEN
            v_title := 'Changes Requested';
            v_message := format('Changes have been requested for your %s: %s', p_resource_type, p_resource_name);
        ELSE
            v_title := 'Review Update';
            v_message := format('Update on %s: %s', p_resource_type, p_resource_name);
    END CASE;

    -- Insert notification
    INSERT INTO notifications (
        tenant_id,
        user_id,
        type,
        title,
        message,
        resource_type,
        resource_id
    ) VALUES (
        p_tenant_id,
        p_target_user_id,
        'review_' || p_event_type,
        v_title,
        v_message,
        p_resource_type,
        p_resource_id
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION public.notify_approval_event IS
  'Creates a notification for approval workflow events (requested, approved, rejected)';

-- ============================================================================
-- H4: Impersonation validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_impersonation(
    p_impersonated_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_valid BOOLEAN := false;
    v_reason TEXT := 'unknown';
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'not_authenticated');
    END IF;

    -- Get user's role
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = v_user_id;

    -- Super admins can impersonate anyone
    IF v_user_role = 'super_admin' THEN
        v_valid := true;
        v_reason := 'super_admin';
    -- Resellers can impersonate their managed clients
    ELSIF v_user_role = 'reseller' THEN
        SELECT EXISTS (
            SELECT 1 FROM profiles
            WHERE id = p_impersonated_tenant_id
              AND reseller_id = v_user_id
        ) INTO v_valid;
        v_reason := CASE WHEN v_valid THEN 'reseller_client' ELSE 'not_your_client' END;
    ELSE
        v_reason := 'insufficient_permissions';
    END IF;

    RETURN jsonb_build_object(
        'valid', v_valid,
        'reason', v_reason,
        'userId', v_user_id,
        'role', v_user_role,
        'tenantId', p_impersonated_tenant_id
    );
END;
$$;

COMMENT ON FUNCTION public.validate_impersonation IS
  'Validates if the current user can impersonate the specified tenant';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_impersonation TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_approval_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_weighted_content TO authenticated;
