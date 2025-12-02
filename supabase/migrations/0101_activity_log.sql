-- ============================================
-- Migration: 020_activity_log.sql
-- Description: Activity logging for audit trail and operational visibility
-- ============================================

-- ============================================
-- 1. Activity Log Table
-- Tracks all user actions for audit and visibility
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_log_owner_id ON public.activity_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON public.activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource_type ON public.activity_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource_id ON public.activity_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_owner_created
ON public.activity_log(owner_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_log
CREATE POLICY "activity_log_select_policy"
ON public.activity_log FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- Only allow inserts via the SECURITY DEFINER function
CREATE POLICY "activity_log_insert_policy"
ON public.activity_log FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

COMMENT ON TABLE public.activity_log IS 'Audit trail of user actions for operational visibility';
COMMENT ON COLUMN public.activity_log.actor_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN public.activity_log.action IS 'Action code like screen.created, playlist.updated';
COMMENT ON COLUMN public.activity_log.resource_type IS 'Type of resource: screen, playlist, layout, schedule, branding, media';
COMMENT ON COLUMN public.activity_log.resource_id IS 'UUID of the affected resource';
COMMENT ON COLUMN public.activity_log.resource_name IS 'Human-readable name of the resource at time of action';
COMMENT ON COLUMN public.activity_log.metadata IS 'Additional context about the action';

-- ============================================
-- 2. Log Activity RPC
-- SECURITY DEFINER function for logging activities
-- ============================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_actor_id UUID,
  p_owner_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_log (
    owner_id,
    actor_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    metadata
  ) VALUES (
    p_owner_id,
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    COALESCE(p_metadata, '{}')
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_activity IS 'Logs an activity event for audit trail';

-- ============================================
-- 3. Get Activity Log RPC
-- Fetches activity logs with filtering
-- ============================================

CREATE OR REPLACE FUNCTION public.get_activity_log(
  p_owner_id UUID,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  actor_id UUID,
  actor_name TEXT,
  actor_email TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    al.id,
    al.actor_id,
    COALESCE(p.full_name, 'System') AS actor_name,
    p.email AS actor_email,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.metadata,
    al.created_at
  FROM activity_log al
  LEFT JOIN profiles p ON p.id = al.actor_id
  WHERE al.owner_id = p_owner_id
    AND al.created_at >= (NOW() - (p_days || ' days')::INTERVAL)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_resource_id IS NULL OR al.resource_id = p_resource_id)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.get_activity_log IS 'Retrieves activity log entries with optional filtering';

-- ============================================
-- 4. Get Activity Log Count RPC
-- Returns count for pagination
-- ============================================

CREATE OR REPLACE FUNCTION public.get_activity_log_count(
  p_owner_id UUID,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM activity_log al
  WHERE al.owner_id = p_owner_id
    AND al.created_at >= (NOW() - (p_days || ' days')::INTERVAL)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_resource_id IS NULL OR al.resource_id = p_resource_id);
$$;

COMMENT ON FUNCTION public.get_activity_log_count IS 'Returns count of activity log entries for pagination';

-- ============================================
-- 5. Action Labels View (for reference)
-- Provides human-readable labels for action codes
-- ============================================

CREATE OR REPLACE VIEW public.activity_action_labels AS
SELECT action_code, label, description FROM (VALUES
  ('screen.created', 'Screen Created', 'A new screen was added'),
  ('screen.updated', 'Screen Updated', 'Screen settings were modified'),
  ('screen.deleted', 'Screen Deleted', 'A screen was removed'),
  ('screen.assignment_updated', 'Screen Assignment Changed', 'Content assignments were updated'),
  ('playlist.created', 'Playlist Created', 'A new playlist was created'),
  ('playlist.updated', 'Playlist Updated', 'Playlist was modified'),
  ('playlist.deleted', 'Playlist Deleted', 'A playlist was removed'),
  ('layout.created', 'Layout Created', 'A new layout was created'),
  ('layout.updated', 'Layout Updated', 'Layout was modified'),
  ('layout.deleted', 'Layout Deleted', 'A layout was removed'),
  ('schedule.created', 'Schedule Created', 'A new schedule was created'),
  ('schedule.updated', 'Schedule Updated', 'Schedule was modified'),
  ('schedule.deleted', 'Schedule Deleted', 'A schedule was removed'),
  ('media.created', 'Media Uploaded', 'New media was uploaded'),
  ('media.updated', 'Media Updated', 'Media was modified'),
  ('media.deleted', 'Media Deleted', 'Media was removed'),
  ('branding.updated', 'Branding Updated', 'Branding settings were changed'),
  ('user.login', 'User Login', 'User logged in'),
  ('user.logout', 'User Logout', 'User logged out'),
  ('alert_rule.created', 'Alert Rule Created', 'A new alert rule was created'),
  ('alert_rule.updated', 'Alert Rule Updated', 'Alert rule was modified'),
  ('alert_rule.deleted', 'Alert Rule Deleted', 'An alert rule was removed')
) AS t(action_code, label, description);

COMMENT ON VIEW public.activity_action_labels IS 'Reference view for activity action labels';

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.log_activity(UUID, UUID, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_log(UUID, TEXT, UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_log_count(UUID, TEXT, UUID, INTEGER) TO authenticated;
GRANT SELECT ON public.activity_action_labels TO authenticated;
