-- ============================================================================
-- Migration 036: Enterprise SSO, SCIM, and Compliance Features
-- ============================================================================
-- This migration adds:
-- 1. SSO provider configuration per tenant
-- 2. SCIM-related fields and tracking
-- 3. Data export and deletion RPCs for compliance
-- ============================================================================

-- ============================================================================
-- 1. SSO PROVIDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('oidc', 'saml')),
  name TEXT NOT NULL,  -- e.g., "Okta", "Azure AD", "Google Workspace"

  -- OIDC configuration
  issuer TEXT,
  client_id TEXT,
  client_secret TEXT,  -- encrypted in practice
  authorization_endpoint TEXT,
  token_endpoint TEXT,
  userinfo_endpoint TEXT,

  -- SAML configuration
  metadata_url TEXT,
  metadata_xml TEXT,
  entity_id TEXT,
  sso_url TEXT,
  certificate TEXT,

  -- Common settings
  default_role TEXT DEFAULT 'viewer' CHECK (default_role IN ('viewer', 'editor', 'admin')),
  auto_create_users BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT false,
  enforce_sso BOOLEAN DEFAULT false,  -- Disable local password login

  -- Attribute mappings
  attribute_mapping JSONB DEFAULT '{
    "email": "email",
    "name": "name",
    "given_name": "given_name",
    "family_name": "family_name"
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_sso_providers_tenant ON sso_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_enabled ON sso_providers(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant owners can manage their SSO providers"
  ON sso_providers FOR ALL
  USING (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 2. SSO SESSIONS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES sso_providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,  -- External session ID from IdP
  state TEXT,  -- OIDC state parameter for CSRF protection
  nonce TEXT,  -- OIDC nonce for replay protection
  redirect_uri TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_state ON sso_sessions(state);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user ON sso_sessions(user_id);

ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SSO sessions"
  ON sso_sessions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. SCIM-RELATED FIELDS
-- ============================================================================

-- Add SCIM tracking fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scim_external_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scim_provisioned BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scim_last_sync_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index for SCIM lookups
CREATE INDEX IF NOT EXISTS idx_profiles_scim_external_id ON profiles(scim_external_id) WHERE scim_external_id IS NOT NULL;

-- ============================================================================
-- 4. API TOKEN SCOPES FOR SCIM
-- ============================================================================

-- Add SCIM scopes to available scopes
-- (Assuming api_tokens table already has a scopes column)
-- We'll handle this in the application layer

-- ============================================================================
-- 5. DATA EXPORT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  export_type TEXT DEFAULT 'full' CHECK (export_type IN ('full', 'partial')),
  include_media BOOLEAN DEFAULT false,
  file_url TEXT,
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_tenant ON data_export_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can view their export requests"
  ON data_export_requests FOR SELECT
  USING (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Tenant owners can create export requests"
  ON data_export_requests FOR INSERT
  WITH CHECK (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 6. DATA DELETION AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,  -- No FK since tenant will be deleted
  tenant_email TEXT NOT NULL,
  tenant_name TEXT,
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  deleted_by_email TEXT,
  deletion_type TEXT DEFAULT 'full' CHECK (deletion_type IN ('full', 'partial')),
  items_deleted JSONB,  -- Summary of what was deleted
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Super admin only
ALTER TABLE data_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super_admin can view deletion log"
  ON data_deletion_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 7. SSO MANAGEMENT FUNCTIONS
-- ============================================================================

-- Get SSO provider for a tenant
CREATE OR REPLACE FUNCTION get_sso_provider(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  type TEXT,
  name TEXT,
  issuer TEXT,
  client_id TEXT,
  authorization_endpoint TEXT,
  token_endpoint TEXT,
  userinfo_endpoint TEXT,
  metadata_url TEXT,
  entity_id TEXT,
  sso_url TEXT,
  default_role TEXT,
  auto_create_users BOOLEAN,
  is_enabled BOOLEAN,
  enforce_sso BOOLEAN,
  attribute_mapping JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.type,
    sp.name,
    sp.issuer,
    sp.client_id,
    sp.authorization_endpoint,
    sp.token_endpoint,
    sp.userinfo_endpoint,
    sp.metadata_url,
    sp.entity_id,
    sp.sso_url,
    sp.default_role,
    sp.auto_create_users,
    sp.is_enabled,
    sp.enforce_sso,
    sp.attribute_mapping
  FROM sso_providers sp
  WHERE sp.tenant_id = p_tenant_id
    AND sp.is_enabled = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if SSO is enforced for a tenant
CREATE OR REPLACE FUNCTION is_sso_enforced(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_enforced BOOLEAN;
BEGIN
  SELECT enforce_sso INTO v_enforced
  FROM sso_providers
  WHERE tenant_id = p_tenant_id
    AND is_enabled = true
  LIMIT 1;

  RETURN COALESCE(v_enforced, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. SCIM USER PROVISIONING FUNCTIONS
-- ============================================================================

-- Create or update user via SCIM
CREATE OR REPLACE FUNCTION scim_upsert_user(
  p_tenant_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'viewer',
  p_active BOOLEAN DEFAULT true,
  p_external_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  created BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_created BOOLEAN := false;
  v_auth_user RECORD;
BEGIN
  -- Check caller is authorized (super_admin or has SCIM token for this tenant)
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: SCIM operations require super_admin or valid SCIM token';
  END IF;

  -- Check if user exists by email
  SELECT au.id INTO v_user_id
  FROM auth.users au
  JOIN profiles p ON p.id = au.id
  WHERE au.email = p_email
    AND (p.managed_by = p_tenant_id OR p.id = p_tenant_id);

  IF v_user_id IS NOT NULL THEN
    -- Update existing user
    UPDATE profiles SET
      full_name = COALESCE(p_name, full_name),
      role = CASE WHEN p_role IN ('viewer', 'editor', 'admin', 'client') THEN p_role ELSE role END,
      is_active = p_active,
      scim_external_id = COALESCE(p_external_id, scim_external_id),
      scim_provisioned = true,
      scim_last_sync_at = now(),
      updated_at = now()
    WHERE id = v_user_id;

    RETURN QUERY SELECT v_user_id, false, 'User updated'::TEXT;
  ELSE
    -- Create new user (would need to be done via Supabase Auth API)
    -- Return indication that user needs to be created
    RETURN QUERY SELECT NULL::UUID, true, 'User needs to be created via Auth API'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deactivate user via SCIM
CREATE OR REPLACE FUNCTION scim_deactivate_user(
  p_tenant_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check caller is authorized
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Deactivate user
  UPDATE profiles SET
    is_active = false,
    scim_last_sync_at = now(),
    updated_at = now()
  WHERE id = p_user_id
    AND (managed_by = p_tenant_id OR id = p_tenant_id);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- List users for SCIM
CREATE OR REPLACE FUNCTION scim_list_users(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  scim_external_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check caller is authorized
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    au.email,
    p.full_name,
    p.role,
    p.is_active,
    p.scim_external_id,
    p.created_at,
    p.updated_at
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.managed_by = p_tenant_id OR p.id = p_tenant_id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. DATA EXPORT FUNCTION
-- ============================================================================

-- Export all tenant data as JSON
CREATE OR REPLACE FUNCTION export_tenant_data(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_profile RECORD;
BEGIN
  -- Check authorization
  IF auth.uid() != p_tenant_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Can only export your own data';
  END IF;

  -- Get profile info
  SELECT * INTO v_profile FROM profiles WHERE id = p_tenant_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Build comprehensive export
  SELECT jsonb_build_object(
    'export_info', jsonb_build_object(
      'tenant_id', p_tenant_id,
      'exported_at', now(),
      'export_version', '1.0'
    ),
    'profile', (
      SELECT to_jsonb(p.*) - 'demo_protected_assets'
      FROM profiles p WHERE p.id = p_tenant_id
    ),
    'team_members', (
      SELECT COALESCE(jsonb_agg(to_jsonb(tm.*)), '[]'::jsonb)
      FROM (
        SELECT p.id, au.email, p.full_name, p.role, p.created_at
        FROM profiles p
        JOIN auth.users au ON au.id = p.id
        WHERE p.managed_by = p_tenant_id
      ) tm
    ),
    'screens', (
      SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb)
      FROM tv_devices s WHERE s.owner_id = p_tenant_id
    ),
    'screen_groups', (
      SELECT COALESCE(jsonb_agg(to_jsonb(sg.*)), '[]'::jsonb)
      FROM screen_groups sg WHERE sg.owner_id = p_tenant_id
    ),
    'playlists', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pl.*)), '[]'::jsonb)
      FROM playlists pl WHERE pl.owner_id = p_tenant_id
    ),
    'layouts', (
      SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb)
      FROM layouts l WHERE l.owner_id = p_tenant_id
    ),
    'schedules', (
      SELECT COALESCE(jsonb_agg(to_jsonb(sc.*)), '[]'::jsonb)
      FROM schedules sc WHERE sc.owner_id = p_tenant_id
    ),
    'campaigns', (
      SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
      FROM campaigns c WHERE c.owner_id = p_tenant_id
    ),
    'media_assets', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ma.id,
          'name', ma.name,
          'type', ma.type,
          'url', ma.url,
          'thumbnail_url', ma.thumbnail_url,
          'file_size', ma.file_size,
          'duration', ma.duration,
          'created_at', ma.created_at
        )
      ), '[]'::jsonb)
      FROM media_assets ma WHERE ma.owner_id = p_tenant_id
    ),
    'locations', (
      SELECT COALESCE(jsonb_agg(to_jsonb(loc.*)), '[]'::jsonb)
      FROM locations loc WHERE loc.owner_id = p_tenant_id
    ),
    'activity_log', (
      SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
      FROM activity_log al WHERE al.user_id = p_tenant_id
      ORDER BY al.created_at DESC
      LIMIT 1000
    ),
    'api_tokens', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', at.id,
          'name', at.name,
          'scopes', at.scopes,
          'last_used_at', at.last_used_at,
          'created_at', at.created_at
        )
      ), '[]'::jsonb)
      FROM api_tokens at WHERE at.owner_id = p_tenant_id
    ),
    'webhooks', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', wh.id,
          'name', wh.name,
          'url', wh.url,
          'events', wh.events,
          'is_active', wh.is_active,
          'created_at', wh.created_at
        )
      ), '[]'::jsonb)
      FROM webhooks wh WHERE wh.owner_id = p_tenant_id
    ),
    'sso_config', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', sp.id,
          'type', sp.type,
          'name', sp.name,
          'is_enabled', sp.is_enabled,
          'enforce_sso', sp.enforce_sso,
          'created_at', sp.created_at
        )
      ), '[]'::jsonb)
      FROM sso_providers sp WHERE sp.tenant_id = p_tenant_id
    ),
    'billing_info', (
      SELECT jsonb_build_object(
        'subscription_tier', v_profile.subscription_tier,
        'subscription_status', v_profile.subscription_status,
        'stripe_customer_id', v_profile.stripe_customer_id
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. DATA DELETION FUNCTION
-- ============================================================================

-- Delete all tenant data (super_admin only)
CREATE OR REPLACE FUNCTION delete_tenant_data(
  p_tenant_id UUID,
  p_confirmation_email TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant RECORD;
  v_deleted_counts JSONB;
  v_count INTEGER;
BEGIN
  -- Only super_admin can delete tenant data
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super_admin can delete tenant data';
  END IF;

  -- Get tenant info
  SELECT p.*, au.email INTO v_tenant
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.id = p_tenant_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Verify confirmation email matches
  IF v_tenant.email != p_confirmation_email THEN
    RAISE EXCEPTION 'Confirmation email does not match tenant email';
  END IF;

  -- Initialize counts
  v_deleted_counts := '{}'::jsonb;

  -- Delete in dependency order (children first)

  -- 1. Delete activity log
  DELETE FROM activity_log WHERE user_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('activity_log', v_count);

  -- 2. Delete SSO sessions and providers
  DELETE FROM sso_sessions WHERE provider_id IN (
    SELECT id FROM sso_providers WHERE tenant_id = p_tenant_id
  );
  DELETE FROM sso_providers WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('sso_providers', v_count);

  -- 3. Delete webhooks and webhook logs
  DELETE FROM webhook_delivery_log WHERE webhook_id IN (
    SELECT id FROM webhooks WHERE owner_id = p_tenant_id
  );
  DELETE FROM webhooks WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('webhooks', v_count);

  -- 4. Delete API tokens
  DELETE FROM api_tokens WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('api_tokens', v_count);

  -- 5. Delete campaigns
  DELETE FROM campaigns WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('campaigns', v_count);

  -- 6. Delete schedules
  DELETE FROM schedules WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('schedules', v_count);

  -- 7. Delete playlists
  DELETE FROM playlists WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('playlists', v_count);

  -- 8. Delete layouts
  DELETE FROM layouts WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('layouts', v_count);

  -- 9. Delete screen groups and memberships
  DELETE FROM screen_group_members WHERE screen_group_id IN (
    SELECT id FROM screen_groups WHERE owner_id = p_tenant_id
  );
  DELETE FROM screen_groups WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('screen_groups', v_count);

  -- 10. Delete TV devices
  DELETE FROM tv_devices WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('tv_devices', v_count);

  -- 11. Delete media assets
  DELETE FROM media_assets WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('media_assets', v_count);

  -- 12. Delete locations
  DELETE FROM locations WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('locations', v_count);

  -- 13. Delete listings
  DELETE FROM listings WHERE owner_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('listings', v_count);

  -- 14. Delete data export requests
  DELETE FROM data_export_requests WHERE tenant_id = p_tenant_id;

  -- 15. Delete team member profiles (users managed by this tenant)
  DELETE FROM profiles WHERE managed_by = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('team_members', v_count);

  -- 16. Delete the tenant profile itself
  DELETE FROM profiles WHERE id = p_tenant_id;

  -- Note: The auth.users record should be deleted via Supabase Auth Admin API
  -- We can't delete from auth.users directly

  -- Log the deletion
  INSERT INTO data_deletion_log (
    tenant_id,
    tenant_email,
    tenant_name,
    deleted_by,
    deleted_by_email,
    deletion_type,
    items_deleted,
    reason
  ) VALUES (
    p_tenant_id,
    v_tenant.email,
    v_tenant.full_name,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'full',
    v_deleted_counts,
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'tenant_email', v_tenant.email,
    'deleted_at', now(),
    'items_deleted', v_deleted_counts,
    'note', 'Auth user record must be deleted separately via Supabase Admin API'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. ENTERPRISE PLAN CHECK
-- ============================================================================

-- Check if tenant has enterprise features enabled
CREATE OR REPLACE FUNCTION has_enterprise_features(p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id UUID;
  v_tier TEXT;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, auth.uid());

  SELECT subscription_tier INTO v_tier
  FROM profiles
  WHERE id = v_tenant_id;

  -- Enterprise features available for pro tier and above
  RETURN v_tier IN ('pro', 'enterprise');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. UPDATED_AT TRIGGER FOR SSO_PROVIDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sso_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sso_providers_updated_at ON sso_providers;
CREATE TRIGGER sso_providers_updated_at
  BEFORE UPDATE ON sso_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_sso_providers_updated_at();
