-- ============================================
-- Migration: 018_client_branding_and_business.sql
-- Description: Add branding and business info fields to profiles for agency platform
-- ============================================

-- Add branding and business columns to profiles
-- These fields allow each client to have their own branding/white-label configuration

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_name TEXT;

COMMENT ON COLUMN public.profiles.business_name IS 'Client business/company name displayed in the app';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branding_primary_color TEXT;

COMMENT ON COLUMN public.profiles.branding_primary_color IS 'Primary accent color (hex, e.g. #3B82F6) for buttons, links, active states';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branding_secondary_color TEXT;

COMMENT ON COLUMN public.profiles.branding_secondary_color IS 'Secondary accent color (hex) for hover states, backgrounds';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branding_logo_url TEXT;

COMMENT ON COLUMN public.profiles.branding_logo_url IS 'URL to client logo image displayed in sidebar header';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branding_favicon_url TEXT;

COMMENT ON COLUMN public.profiles.branding_favicon_url IS 'URL to favicon (optional, for future use)';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branding_is_dark_theme BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.branding_is_dark_theme IS 'Whether to use dark theme variant for this client';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.created_by IS 'Who created this profile (usually a super_admin or admin for client accounts)';

-- Add index for created_by for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);

-- ============================================
-- Helper function: Get current tenant profile with branding
-- Returns the effective tenant for the current user
-- For clients: returns their own profile
-- For admins/super_admins: returns their own profile (impersonation handled in frontend)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_current_tenant_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  business_name TEXT,
  branding_primary_color TEXT,
  branding_secondary_color TEXT,
  branding_logo_url TEXT,
  branding_favicon_url TEXT,
  branding_is_dark_theme BOOLEAN,
  managed_by UUID,
  created_by UUID
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.business_name,
    p.branding_primary_color,
    p.branding_secondary_color,
    p.branding_logo_url,
    p.branding_favicon_url,
    p.branding_is_dark_theme,
    p.managed_by,
    p.created_by
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- ============================================
-- Helper function: Get a specific profile by ID (for impersonation)
-- Only returns data if caller is super_admin or admin managing this client
-- ============================================

CREATE OR REPLACE FUNCTION public.get_profile_for_impersonation(target_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  business_name TEXT,
  branding_primary_color TEXT,
  branding_secondary_color TEXT,
  branding_logo_url TEXT,
  branding_favicon_url TEXT,
  branding_is_dark_theme BOOLEAN,
  managed_by UUID,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only allow super_admin or admin to fetch other profiles
  IF NOT (is_super_admin() OR is_admin()) THEN
    RETURN;
  END IF;

  -- Super admin can impersonate anyone
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.business_name,
      p.branding_primary_color,
      p.branding_secondary_color,
      p.branding_logo_url,
      p.branding_favicon_url,
      p.branding_is_dark_theme,
      p.managed_by,
      p.created_by
    FROM public.profiles p
    WHERE p.id = target_id;
    RETURN;
  END IF;

  -- Admin can only impersonate their managed clients
  IF is_admin() THEN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.business_name,
      p.branding_primary_color,
      p.branding_secondary_color,
      p.branding_logo_url,
      p.branding_favicon_url,
      p.branding_is_dark_theme,
      p.managed_by,
      p.created_by
    FROM public.profiles p
    WHERE p.id = target_id
      AND p.managed_by = auth.uid()
      AND p.role = 'client';
    RETURN;
  END IF;
END;
$$;

-- ============================================
-- Helper function: Update branding for a profile
-- Clients can update their own, super_admin/admin can update for impersonated clients
-- ============================================

CREATE OR REPLACE FUNCTION public.update_profile_branding(
  target_id UUID,
  p_business_name TEXT DEFAULT NULL,
  p_branding_primary_color TEXT DEFAULT NULL,
  p_branding_secondary_color TEXT DEFAULT NULL,
  p_branding_logo_url TEXT DEFAULT NULL,
  p_branding_favicon_url TEXT DEFAULT NULL,
  p_branding_is_dark_theme BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  can_update BOOLEAN := false;
BEGIN
  -- Check permissions
  IF target_id = auth.uid() THEN
    -- User updating their own profile
    can_update := true;
  ELSIF is_super_admin() THEN
    -- Super admin can update any profile
    can_update := true;
  ELSIF is_admin() THEN
    -- Admin can update their managed clients
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = target_id
        AND managed_by = auth.uid()
        AND role = 'client'
    ) INTO can_update;
  END IF;

  IF NOT can_update THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET
    business_name = COALESCE(p_business_name, business_name),
    branding_primary_color = COALESCE(p_branding_primary_color, branding_primary_color),
    branding_secondary_color = COALESCE(p_branding_secondary_color, branding_secondary_color),
    branding_logo_url = COALESCE(p_branding_logo_url, branding_logo_url),
    branding_favicon_url = COALESCE(p_branding_favicon_url, branding_favicon_url),
    branding_is_dark_theme = COALESCE(p_branding_is_dark_theme, branding_is_dark_theme),
    updated_at = NOW()
  WHERE id = target_id;

  RETURN true;
END;
$$;

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_current_tenant_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_for_impersonation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_branding(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
