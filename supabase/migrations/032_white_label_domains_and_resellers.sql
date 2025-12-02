-- Migration: 032_white_label_domains_and_resellers.sql
-- Phase 20: Full White-Labeling & Reseller Mode
-- Enables custom domain support, enhanced branding, and reseller capabilities

-- ============================================
-- 1. CUSTOM DOMAINS TABLE
-- ============================================
-- Stores custom domain mappings for white-label tenants

CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validate domain format (basic check)
  CONSTRAINT domain_format CHECK (domain_name ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domains_tenant_id ON public.domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON public.domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_domains_verified ON public.domains(is_verified) WHERE is_verified = true;

-- ============================================
-- 2. ENHANCED WHITE-LABEL FIELDS ON PROFILES
-- ============================================

-- Add additional white-label settings to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_powered_by BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS login_page_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_page_background_url TEXT,
ADD COLUMN IF NOT EXISTS login_page_title TEXT,
ADD COLUMN IF NOT EXISTS login_page_subtitle TEXT,
ADD COLUMN IF NOT EXISTS email_logo_url TEXT,
ADD COLUMN IF NOT EXISTS email_from_name TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT,
ADD COLUMN IF NOT EXISTS support_url TEXT,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reseller_parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Comments
COMMENT ON COLUMN public.profiles.white_label_enabled IS 'Whether white-label features are enabled for this tenant';
COMMENT ON COLUMN public.profiles.hide_powered_by IS 'Hide "Powered by BizScreen" branding';
COMMENT ON COLUMN public.profiles.login_page_logo_url IS 'Custom logo for login page';
COMMENT ON COLUMN public.profiles.login_page_background_url IS 'Custom background image for login page';
COMMENT ON COLUMN public.profiles.login_page_title IS 'Custom title for login page';
COMMENT ON COLUMN public.profiles.login_page_subtitle IS 'Custom subtitle for login page';
COMMENT ON COLUMN public.profiles.email_logo_url IS 'Logo URL for transactional emails';
COMMENT ON COLUMN public.profiles.email_from_name IS 'Custom sender name for emails';
COMMENT ON COLUMN public.profiles.support_email IS 'Custom support email address';
COMMENT ON COLUMN public.profiles.support_url IS 'Custom support URL or help desk';
COMMENT ON COLUMN public.profiles.custom_css IS 'Custom CSS overrides (advanced)';
COMMENT ON COLUMN public.profiles.is_reseller IS 'Whether this tenant can create sub-tenants';
COMMENT ON COLUMN public.profiles.reseller_parent_id IS 'Parent reseller tenant ID for sub-tenants';

-- Index for reseller hierarchy
CREATE INDEX IF NOT EXISTS idx_profiles_reseller_parent ON public.profiles(reseller_parent_id)
  WHERE reseller_parent_id IS NOT NULL;

-- ============================================
-- 3. RLS POLICIES FOR DOMAINS
-- ============================================

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all domains
CREATE POLICY "Super admins can manage all domains"
  ON public.domains FOR ALL
  TO authenticated
  USING (is_super_admin());

-- Admins can manage domains for their clients
CREATE POLICY "Admins can manage client domains"
  ON public.domains FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      JOIN public.profiles client_profile ON client_profile.managed_by = admin_profile.id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND client_profile.id = domains.tenant_id
    )
  );

-- Tenant owners can manage their own domains
CREATE POLICY "Tenant owners can manage own domains"
  ON public.domains FOR ALL
  TO authenticated
  USING (tenant_id = auth.uid());

-- Tenant managers can manage domains
CREATE POLICY "Tenant managers can manage domains"
  ON public.domains FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = domains.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  );

-- Public read for domain resolution (for unauth requests)
CREATE POLICY "Anyone can read verified domains"
  ON public.domains FOR SELECT
  TO anon
  USING (is_verified = true);

-- ============================================
-- 4. DOMAIN MANAGEMENT FUNCTIONS
-- ============================================

-- Generate verification token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'bizscreen-verify-' || encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Add a new domain
CREATE OR REPLACE FUNCTION add_domain(
  p_tenant_id UUID,
  p_domain_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_domain RECORD;
  v_verification_token TEXT;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Validate tenant access
  IF NOT (
    p_tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = p_tenant_id
        AND organization_members.user_id = v_user_id
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Normalize domain name
  p_domain_name := lower(trim(p_domain_name));

  -- Check if domain already exists
  SELECT * INTO v_existing FROM public.domains WHERE domain_name = p_domain_name;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.tenant_id = p_tenant_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Domain already added to your account',
        'domain', jsonb_build_object(
          'id', v_existing.id,
          'domain_name', v_existing.domain_name,
          'is_verified', v_existing.is_verified
        )
      );
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Domain is already registered by another account');
    END IF;
  END IF;

  -- Generate verification token
  v_verification_token := generate_verification_token();

  -- Insert domain
  INSERT INTO public.domains (tenant_id, domain_name, verification_token)
  VALUES (p_tenant_id, p_domain_name, v_verification_token)
  RETURNING * INTO v_domain;

  RETURN jsonb_build_object(
    'success', true,
    'domain', jsonb_build_object(
      'id', v_domain.id,
      'domain_name', v_domain.domain_name,
      'is_verified', v_domain.is_verified,
      'verification_token', v_domain.verification_token,
      'created_at', v_domain.created_at
    )
  );
END;
$$;

-- Verify a domain
CREATE OR REPLACE FUNCTION verify_domain(
  p_domain_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_domain RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Get domain
  SELECT * INTO v_domain FROM public.domains WHERE id = p_domain_id;

  IF v_domain.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Domain not found');
  END IF;

  -- Validate tenant access
  IF NOT (
    v_domain.tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = v_domain.tenant_id
        AND organization_members.user_id = v_user_id
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Already verified?
  IF v_domain.is_verified THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'domain', jsonb_build_object(
        'id', v_domain.id,
        'domain_name', v_domain.domain_name,
        'is_verified', true,
        'verified_at', v_domain.verified_at
      )
    );
  END IF;

  -- Note: Actual DNS verification happens in the API route
  -- This function just returns the token for verification
  RETURN jsonb_build_object(
    'success', true,
    'requires_verification', true,
    'domain', jsonb_build_object(
      'id', v_domain.id,
      'domain_name', v_domain.domain_name,
      'verification_token', v_domain.verification_token
    ),
    'instructions', jsonb_build_object(
      'type', 'TXT',
      'host', '_bizscreen-verification',
      'value', v_domain.verification_token,
      'example', format('Add a TXT record: _bizscreen-verification.%s with value %s', v_domain.domain_name, v_domain.verification_token)
    )
  );
END;
$$;

-- Mark domain as verified (called by API after DNS check)
CREATE OR REPLACE FUNCTION mark_domain_verified(
  p_domain_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain RECORD;
BEGIN
  UPDATE public.domains
  SET is_verified = true,
      verified_at = NOW(),
      ssl_status = 'provisioning',
      updated_at = NOW()
  WHERE id = p_domain_id
  RETURNING * INTO v_domain;

  IF v_domain.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Domain not found');
  END IF;

  -- If this is the first verified domain, make it primary
  IF NOT EXISTS (
    SELECT 1 FROM public.domains
    WHERE tenant_id = v_domain.tenant_id
      AND is_primary = true
      AND id != v_domain.id
  ) THEN
    UPDATE public.domains SET is_primary = true WHERE id = v_domain.id;
    v_domain.is_primary := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'domain', jsonb_build_object(
      'id', v_domain.id,
      'domain_name', v_domain.domain_name,
      'is_verified', true,
      'is_primary', v_domain.is_primary,
      'verified_at', v_domain.verified_at
    )
  );
END;
$$;

-- Remove a domain
CREATE OR REPLACE FUNCTION remove_domain(
  p_domain_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_domain RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Get domain
  SELECT * INTO v_domain FROM public.domains WHERE id = p_domain_id;

  IF v_domain.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Domain not found');
  END IF;

  -- Validate tenant access
  IF NOT (
    v_domain.tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = v_domain.tenant_id
        AND organization_members.user_id = v_user_id
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Delete domain
  DELETE FROM public.domains WHERE id = p_domain_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_domain', v_domain.domain_name
  );
END;
$$;

-- List domains for a tenant
CREATE OR REPLACE FUNCTION list_domains(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_domains JSONB;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, v_user_id);

  -- Validate tenant access
  IF NOT (
    v_tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = v_tenant_id
        AND organization_members.user_id = v_user_id
        AND organization_members.status = 'active'
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'domain_name', d.domain_name,
      'is_verified', d.is_verified,
      'is_primary', d.is_primary,
      'ssl_status', d.ssl_status,
      'verification_token', CASE WHEN d.is_verified THEN NULL ELSE d.verification_token END,
      'verified_at', d.verified_at,
      'created_at', d.created_at
    ) ORDER BY d.is_primary DESC, d.created_at DESC
  ), '[]'::jsonb) INTO v_domains
  FROM public.domains d
  WHERE d.tenant_id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'domains', v_domains
  );
END;
$$;

-- Resolve tenant by domain
CREATE OR REPLACE FUNCTION resolve_tenant_by_domain(
  p_domain_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain RECORD;
  v_tenant RECORD;
BEGIN
  -- Normalize domain name
  p_domain_name := lower(trim(p_domain_name));

  -- Find verified domain
  SELECT * INTO v_domain
  FROM public.domains
  WHERE domain_name = p_domain_name
    AND is_verified = true;

  IF v_domain.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Get tenant with branding
  SELECT
    p.id,
    p.full_name,
    p.business_name,
    p.branding_primary_color,
    p.branding_secondary_color,
    p.branding_logo_url,
    p.branding_favicon_url,
    p.branding_is_dark_theme,
    p.white_label_enabled,
    p.hide_powered_by,
    p.login_page_logo_url,
    p.login_page_background_url,
    p.login_page_title,
    p.login_page_subtitle,
    p.email_logo_url,
    p.support_email,
    p.support_url
  INTO v_tenant
  FROM public.profiles p
  WHERE p.id = v_domain.tenant_id;

  RETURN jsonb_build_object(
    'found', true,
    'tenant_id', v_tenant.id,
    'domain', v_domain.domain_name,
    'branding', jsonb_build_object(
      'business_name', v_tenant.business_name,
      'primary_color', v_tenant.branding_primary_color,
      'secondary_color', v_tenant.branding_secondary_color,
      'logo_url', v_tenant.branding_logo_url,
      'favicon_url', v_tenant.branding_favicon_url,
      'is_dark_theme', v_tenant.branding_is_dark_theme,
      'hide_powered_by', v_tenant.hide_powered_by,
      'login_logo_url', v_tenant.login_page_logo_url,
      'login_background_url', v_tenant.login_page_background_url,
      'login_title', v_tenant.login_page_title,
      'login_subtitle', v_tenant.login_page_subtitle,
      'support_email', v_tenant.support_email,
      'support_url', v_tenant.support_url
    )
  );
END;
$$;

-- Set domain as primary
CREATE OR REPLACE FUNCTION set_primary_domain(
  p_domain_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_domain RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Get domain
  SELECT * INTO v_domain FROM public.domains WHERE id = p_domain_id;

  IF v_domain.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Domain not found');
  END IF;

  IF NOT v_domain.is_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Domain must be verified first');
  END IF;

  -- Validate tenant access
  IF NOT (
    v_domain.tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = v_domain.tenant_id
        AND organization_members.user_id = v_user_id
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Clear existing primary
  UPDATE public.domains
  SET is_primary = false, updated_at = NOW()
  WHERE tenant_id = v_domain.tenant_id AND is_primary = true;

  -- Set new primary
  UPDATE public.domains
  SET is_primary = true, updated_at = NOW()
  WHERE id = p_domain_id;

  RETURN jsonb_build_object(
    'success', true,
    'domain', jsonb_build_object(
      'id', v_domain.id,
      'domain_name', v_domain.domain_name,
      'is_primary', true
    )
  );
END;
$$;

-- Update white-label settings
CREATE OR REPLACE FUNCTION update_white_label_settings(
  p_tenant_id UUID,
  p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Validate tenant access
  IF NOT (
    p_tenant_id = v_user_id OR
    is_super_admin() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = p_tenant_id
        AND organization_members.user_id = v_user_id
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Update settings
  UPDATE public.profiles
  SET
    white_label_enabled = COALESCE((p_settings->>'white_label_enabled')::BOOLEAN, white_label_enabled),
    hide_powered_by = COALESCE((p_settings->>'hide_powered_by')::BOOLEAN, hide_powered_by),
    login_page_logo_url = COALESCE(p_settings->>'login_page_logo_url', login_page_logo_url),
    login_page_background_url = COALESCE(p_settings->>'login_page_background_url', login_page_background_url),
    login_page_title = COALESCE(p_settings->>'login_page_title', login_page_title),
    login_page_subtitle = COALESCE(p_settings->>'login_page_subtitle', login_page_subtitle),
    email_logo_url = COALESCE(p_settings->>'email_logo_url', email_logo_url),
    email_from_name = COALESCE(p_settings->>'email_from_name', email_from_name),
    support_email = COALESCE(p_settings->>'support_email', support_email),
    support_url = COALESCE(p_settings->>'support_url', support_url),
    custom_css = COALESCE(p_settings->>'custom_css', custom_css),
    updated_at = NOW()
  WHERE id = p_tenant_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- 5. TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION generate_verification_token() TO authenticated;
GRANT EXECUTE ON FUNCTION add_domain(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_domain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_domain_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_domain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_domains(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_tenant_by_domain(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_primary_domain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_white_label_settings(UUID, JSONB) TO authenticated;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE public.domains IS
'Custom domain mappings for white-label tenants. Each domain must be verified via DNS TXT record.';

COMMENT ON FUNCTION resolve_tenant_by_domain(TEXT) IS
'Resolves a tenant and their branding by custom domain. Used for login page customization and routing.';

COMMENT ON FUNCTION update_white_label_settings(UUID, JSONB) IS
'Updates white-label settings including login page, email branding, and support info.';
