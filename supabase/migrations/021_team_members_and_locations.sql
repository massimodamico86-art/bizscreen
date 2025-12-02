-- =====================================================
-- BIZSCREEN PHASE 9: TEAMS & LOCATIONS
-- =====================================================
-- Adds team membership (organization_members) and locations
-- for multi-user tenant access and screen grouping.
--
-- Key concepts:
-- - tenant_id = the profile ID of the business owner (existing owner_id pattern)
-- - organization_members links users to tenants with roles
-- - locations group screens within a tenant
-- =====================================================

-- =====================================================
-- ORGANIZATION MEMBERS TABLE (Team per tenant)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The tenant (business) this membership belongs to
  -- This is the profile ID of the business owner
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- The user who is a member (may be NULL for pending invites)
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Role within the organization
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'editor', 'viewer')) DEFAULT 'viewer',

  -- For pending invites where user doesn't exist yet
  invited_email TEXT,

  -- Membership status
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'revoked')) DEFAULT 'invited',

  -- Invite token for accepting invitations
  invite_token TEXT,
  invite_token_expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  -- Ensure either user_id or invited_email is provided
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL),

  -- Unique membership per user per tenant
  CONSTRAINT unique_user_per_tenant UNIQUE (tenant_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_org_members_tenant_id ON public.organization_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_invited_email ON public.organization_members(invited_email);
CREATE INDEX IF NOT EXISTS idx_org_members_invite_token ON public.organization_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON public.organization_members(status);

COMMENT ON TABLE public.organization_members IS 'Team membership within a tenant/organization. tenant_id is the business owner profile ID.';

-- NOTE: There should always be at least one owner per tenant.
-- This is enforced at the application layer, not DB constraint,
-- to allow flexibility during data migrations and edge cases.

-- =====================================================
-- LOCATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The tenant this location belongs to
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Location info
  name TEXT NOT NULL,
  slug TEXT, -- Optional URL-friendly identifier

  -- Address details
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,

  -- Optional timezone (defaults to tenant's or screen's)
  timezone TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON public.locations(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_slug_per_tenant ON public.locations(tenant_id, slug) WHERE slug IS NOT NULL;

COMMENT ON TABLE public.locations IS 'Physical locations/branches within a tenant for grouping screens';

-- =====================================================
-- UPDATE TV_DEVICES WITH LOCATION_ID
-- =====================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tv_devices_location_id ON public.tv_devices(location_id);

COMMENT ON COLUMN public.tv_devices.location_id IS 'Optional location grouping for the screen';

-- =====================================================
-- HELPER FUNCTION: Get user's tenant membership role
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_tenant_role(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.organization_members
  WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_tenant_role IS 'Returns the current user role for a specific tenant, or NULL if not a member';

-- =====================================================
-- HELPER FUNCTION: Check if user is tenant member
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_tenant_member IS 'Returns true if current user is an active member of the tenant';

-- =====================================================
-- HELPER FUNCTION: Get tenants where user is a member
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS TABLE(tenant_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT om.tenant_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.status = 'active';
$$;

COMMENT ON FUNCTION public.get_my_tenant_ids IS 'Returns all tenant IDs where the current user is an active member';

-- =====================================================
-- HELPER FUNCTION: Check if user can manage team
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_team(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'manager')
  );
$$;

COMMENT ON FUNCTION public.can_manage_team IS 'Returns true if current user can manage team members for the tenant';

-- =====================================================
-- TIMESTAMP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATION_MEMBERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "org_members_select_policy" ON public.organization_members;
CREATE POLICY "org_members_select_policy"
ON public.organization_members FOR SELECT
USING (
  -- Super admins see all
  is_super_admin()
  -- Users see their own membership records
  OR user_id = auth.uid()
  -- Active members with owner/manager role can see all members of their tenant
  OR (tenant_id IN (
    SELECT om.tenant_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'manager')
  ))
  -- Admins can see members of their managed clients
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "org_members_insert_policy" ON public.organization_members;
CREATE POLICY "org_members_insert_policy"
ON public.organization_members FOR INSERT
WITH CHECK (
  is_super_admin()
  -- Owners and managers can invite new members to their tenant
  OR can_manage_team(tenant_id)
  -- Users can create their own initial owner membership (self-serve signup)
  OR (tenant_id = auth.uid() AND user_id = auth.uid() AND role = 'owner')
  -- Admins can manage their clients' teams
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "org_members_update_policy" ON public.organization_members;
CREATE POLICY "org_members_update_policy"
ON public.organization_members FOR UPDATE
USING (
  is_super_admin()
  -- Owners and managers can update members of their tenant
  OR can_manage_team(tenant_id)
  -- Users can update their own record (e.g., accept invite)
  OR user_id = auth.uid()
  -- Admins can manage their clients' teams
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "org_members_delete_policy" ON public.organization_members;
CREATE POLICY "org_members_delete_policy"
ON public.organization_members FOR DELETE
USING (
  is_super_admin()
  -- Only owners can delete members (not themselves if last owner)
  OR (
    can_manage_team(tenant_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.tenant_id = organization_members.tenant_id
        AND om.role = 'owner'
        AND om.status = 'active'
        AND om.user_id = auth.uid()
    )
  )
  -- Admins can manage their clients' teams
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- =====================================================
-- LOCATIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
CREATE POLICY "locations_select_policy"
ON public.locations FOR SELECT
USING (
  is_super_admin()
  -- Owner of the tenant can see locations
  OR tenant_id = auth.uid()
  -- Active team members can see locations
  OR is_tenant_member(tenant_id)
  -- Admins can see their managed clients' locations
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
CREATE POLICY "locations_insert_policy"
ON public.locations FOR INSERT
WITH CHECK (
  is_super_admin()
  -- Owner of the tenant can create locations
  OR tenant_id = auth.uid()
  -- Owners and managers can create locations
  OR (is_tenant_member(tenant_id) AND get_my_tenant_role(tenant_id) IN ('owner', 'manager'))
  -- Admins can manage their clients' locations
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
CREATE POLICY "locations_update_policy"
ON public.locations FOR UPDATE
USING (
  is_super_admin()
  -- Owner of the tenant can update locations
  OR tenant_id = auth.uid()
  -- Owners and managers can update locations
  OR (is_tenant_member(tenant_id) AND get_my_tenant_role(tenant_id) IN ('owner', 'manager'))
  -- Admins can manage their clients' locations
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;
CREATE POLICY "locations_delete_policy"
ON public.locations FOR DELETE
USING (
  is_super_admin()
  -- Owner of the tenant can delete locations
  OR tenant_id = auth.uid()
  -- Owners and managers can delete locations
  OR (is_tenant_member(tenant_id) AND get_my_tenant_role(tenant_id) IN ('owner', 'manager'))
  -- Admins can manage their clients' locations
  OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.locations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team TO authenticated;

-- =====================================================
-- FUNCTION: Bootstrap owner membership on signup
-- =====================================================
-- This should be called when a new client signs up to create
-- their initial owner membership record.

CREATE OR REPLACE FUNCTION public.bootstrap_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only for client role profiles
  IF NEW.role = 'client' THEN
    INSERT INTO public.organization_members (tenant_id, user_id, role, status)
    VALUES (NEW.id, NEW.id, 'owner', 'active')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create owner membership on profile creation
DROP TRIGGER IF EXISTS auto_create_owner_membership ON public.profiles;
CREATE TRIGGER auto_create_owner_membership
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.bootstrap_owner_membership();

COMMENT ON FUNCTION public.bootstrap_owner_membership IS 'Automatically creates owner membership when a client profile is created';

-- =====================================================
-- BACKFILL: Create owner memberships for existing clients
-- =====================================================

INSERT INTO public.organization_members (tenant_id, user_id, role, status, created_at)
SELECT id, id, 'owner', 'active', NOW()
FROM public.profiles
WHERE role = 'client'
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.tenant_id = profiles.id AND om.user_id = profiles.id
  )
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- =====================================================
-- POLICY COMMENTS
-- =====================================================

COMMENT ON POLICY "org_members_select_policy" ON public.organization_members IS 'RBAC: Members see own + tenant members (if owner/manager), super_admins see all';
COMMENT ON POLICY "org_members_insert_policy" ON public.organization_members IS 'RBAC: Owners/managers can invite, users can self-register as owner';
COMMENT ON POLICY "org_members_update_policy" ON public.organization_members IS 'RBAC: Owners/managers can update members, users can update own record';
COMMENT ON POLICY "org_members_delete_policy" ON public.organization_members IS 'RBAC: Only owners can delete members';

COMMENT ON POLICY "locations_select_policy" ON public.locations IS 'RBAC: Tenant members can view locations';
COMMENT ON POLICY "locations_insert_policy" ON public.locations IS 'RBAC: Owners/managers can create locations';
COMMENT ON POLICY "locations_update_policy" ON public.locations IS 'RBAC: Owners/managers can update locations';
COMMENT ON POLICY "locations_delete_policy" ON public.locations IS 'RBAC: Owners/managers can delete locations';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- New tables: 2
--   - organization_members (4 policies)
--   - locations (4 policies)
--
-- Altered tables: 1
--   - tv_devices (added location_id column + index)
--
-- New functions: 4
--   - get_my_tenant_role(p_tenant_id)
--   - is_tenant_member(p_tenant_id)
--   - get_my_tenant_ids()
--   - can_manage_team(p_tenant_id)
--   - bootstrap_owner_membership() (trigger function)
--
-- Total new policies: 8
-- =====================================================
