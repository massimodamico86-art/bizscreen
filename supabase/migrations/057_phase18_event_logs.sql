-- ============================================================================
-- Phase 18: Audit Logs, Event Stream, & System Activity Timeline
-- ============================================================================
--
-- TENANT MODEL: profiles-as-tenant
-- tenant_id references profiles(id) - the profile IS the tenant/owner.
-- This aligns with organization_members, locations, and usage_events.
-- ============================================================================

-- ============================================================================
-- A. AUDIT_LOGS TABLE
-- Tracks all sensitive actions per tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- tenant_id = profile ID of the business owner (profiles-as-tenant pattern)
  -- Can be NULL for system-level events not tied to a specific tenant
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs(user_id);

-- ============================================================================
-- B. SYSTEM_EVENTS TABLE
-- Tracks backend and internal operations (super_admin only)
-- No tenant_id - these are platform-wide system events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('api', 'scheduler', 'system', 'admin', 'worker')),
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_events_created
  ON system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_source
  ON system_events(source);
CREATE INDEX IF NOT EXISTS idx_system_events_type
  ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity
  ON system_events(severity);

-- ============================================================================
-- C. RLS POLICIES
-- ============================================================================
-- Uses profiles-as-tenant pattern:
-- - tenant_id = profile ID of the business owner
-- - User can access if: they ARE the tenant, OR are a team member, OR are super_admin
-- - Leverages helper functions from migration 021: is_tenant_member(), is_super_admin()
-- ============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Audit logs: SELECT allowed for tenant owner, team members, and super_admins
CREATE POLICY audit_logs_select_tenant ON public.audit_logs
  FOR SELECT
  USING (
    -- User IS the tenant owner
    tenant_id = auth.uid()
    -- OR user is a team member of this tenant
    OR is_tenant_member(tenant_id)
    -- OR user is super_admin (can see all)
    OR is_super_admin()
  );

-- Audit logs: INSERT allowed via RPC (SECURITY DEFINER functions handle this)
-- Direct insert is restricted to super_admin for manual entries
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT
  WITH CHECK (is_super_admin());

-- System events: SELECT allowed for super_admin only
CREATE POLICY system_events_select_super_admin ON public.system_events
  FOR SELECT
  USING (is_super_admin());

-- System events: INSERT allowed via RPC (SECURITY DEFINER functions handle this)
-- Direct insert restricted to super_admin
CREATE POLICY system_events_insert_policy ON public.system_events
  FOR INSERT
  WITH CHECK (is_super_admin());

-- ============================================================================
-- D. RPC FUNCTIONS FOR RECORDING EVENTS
-- These allow service-level inserts without direct table access
-- ============================================================================

-- Record an audit event
CREATE OR REPLACE FUNCTION record_audit_event(
  p_tenant_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    event_type,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Record a system event
CREATE OR REPLACE FUNCTION record_system_event(
  p_source TEXT,
  p_event_type TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO system_events (
    source,
    event_type,
    severity,
    details
  ) VALUES (
    p_source,
    p_event_type,
    p_severity,
    p_details
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================================
-- E. HELPER FUNCTIONS FOR QUERYING
-- ============================================================================

-- Get audit logs for a tenant with pagination
CREATE OR REPLACE FUNCTION get_tenant_audit_logs(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_event_type TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  user_id UUID,
  event_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.tenant_id,
    al.user_id,
    al.event_type,
    al.entity_type,
    al.entity_id,
    al.metadata,
    al.ip_address,
    al.user_agent,
    al.created_at,
    p.email AS user_email,
    p.full_name AS user_name
  FROM audit_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE al.tenant_id = p_tenant_id
    AND (p_event_type IS NULL OR al.event_type = p_event_type)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Count audit logs for pagination
CREATE OR REPLACE FUNCTION count_tenant_audit_logs(
  p_tenant_id UUID,
  p_event_type TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM audit_logs al
  WHERE al.tenant_id = p_tenant_id
    AND (p_event_type IS NULL OR al.event_type = p_event_type)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date);

  RETURN v_count;
END;
$$;

-- Get system events (super admin only) with pagination
CREATE OR REPLACE FUNCTION get_system_events(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_source TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  event_type TEXT,
  severity TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    se.id,
    se.source,
    se.event_type,
    se.severity,
    se.details,
    se.created_at
  FROM system_events se
  WHERE (p_source IS NULL OR se.source = p_source)
    AND (p_event_type IS NULL OR se.event_type = p_event_type)
    AND (p_severity IS NULL OR se.severity = p_severity)
    AND (p_start_date IS NULL OR se.created_at >= p_start_date)
    AND (p_end_date IS NULL OR se.created_at <= p_end_date)
  ORDER BY se.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get distinct event types for filtering
CREATE OR REPLACE FUNCTION get_audit_event_types(p_tenant_id UUID)
RETURNS TABLE (event_type TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT al.event_type, COUNT(*) as count
  FROM audit_logs al
  WHERE al.tenant_id = p_tenant_id
  GROUP BY al.event_type
  ORDER BY count DESC;
END;
$$;

-- Get distinct entity types for filtering
CREATE OR REPLACE FUNCTION get_audit_entity_types(p_tenant_id UUID)
RETURNS TABLE (entity_type TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT al.entity_type, COUNT(*) as count
  FROM audit_logs al
  WHERE al.tenant_id = p_tenant_id
    AND al.entity_type IS NOT NULL
  GROUP BY al.entity_type
  ORDER BY count DESC;
END;
$$;

-- ============================================================================
-- F. CLEANUP POLICY - Automatic cleanup of old events
-- ============================================================================

-- Function to clean up old audit logs (keep last 90 days by default)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Log the cleanup as a system event
  PERFORM record_system_event(
    'scheduler',
    'audit_logs.cleanup',
    jsonb_build_object('deleted_count', v_deleted, 'days_kept', p_days_to_keep)
  );

  RETURN v_deleted;
END;
$$;

-- Function to clean up old system events (keep last 30 days by default)
CREATE OR REPLACE FUNCTION cleanup_old_system_events(p_days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM system_events
  WHERE created_at < now() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- G. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION record_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION record_system_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION count_tenant_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_event_types TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_entity_types TO authenticated;

-- Service role permissions for cleanup
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_system_events TO service_role;
