-- ============================================
-- Migration 041: Internationalization & Locale Preferences
-- ============================================
-- Adds locale preference fields to profiles and tenants
-- for per-user and per-tenant language settings.
-- ============================================

-- Add preferred_locale to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT NULL;

-- Note: tenants table doesn't exist in this schema - using profiles for tenant settings

-- Add default_locale to clients table (for multi-tenant setups where clients are the tenants)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tenant_default_locale TEXT DEFAULT 'en';

-- Comment on columns
COMMENT ON COLUMN profiles.preferred_locale IS 'User preferred UI locale (e.g., en, es, pt, it). NULL means use tenant/browser default.';
COMMENT ON COLUMN profiles.tenant_default_locale IS 'Default locale for the tenant/organization. Applied when user has no preference.';

-- ============================================
-- Locale validation function
-- ============================================
CREATE OR REPLACE FUNCTION is_valid_locale(locale_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN locale_code IS NULL OR locale_code IN ('en', 'es', 'pt', 'it', 'fr', 'de');
END;
$$;

-- ============================================
-- Add check constraint for valid locales
-- ============================================
DO $$
BEGIN
  -- Add constraint to preferred_locale if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_preferred_locale_valid'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_preferred_locale_valid
    CHECK (is_valid_locale(preferred_locale));
  END IF;

  -- Add constraint to tenant_default_locale if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_tenant_default_locale_valid'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_tenant_default_locale_valid
    CHECK (is_valid_locale(tenant_default_locale));
  END IF;
END $$;

-- ============================================
-- Helper RPC: Get effective locale for current user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_effective_locale()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_preferred_locale TEXT;
  v_tenant_default TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN 'en';
  END IF;

  -- Get user's preferred locale and tenant default
  SELECT
    preferred_locale,
    tenant_default_locale
  INTO
    v_preferred_locale,
    v_tenant_default
  FROM profiles
  WHERE id = v_user_id;

  -- Return in priority order: user preference > tenant default > 'en'
  RETURN COALESCE(v_preferred_locale, v_tenant_default, 'en');
END;
$$;

-- ============================================
-- Helper RPC: Set user preferred locale
-- ============================================
CREATE OR REPLACE FUNCTION set_user_preferred_locale(p_locale TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate locale
  IF NOT is_valid_locale(p_locale) THEN
    RAISE EXCEPTION 'Invalid locale: %', p_locale;
  END IF;

  -- Update user's preferred locale
  UPDATE profiles
  SET
    preferred_locale = p_locale,
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

-- ============================================
-- Helper RPC: Set tenant default locale (for admins)
-- ============================================
CREATE OR REPLACE FUNCTION set_tenant_default_locale(p_locale TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's role and tenant
  SELECT role, tenant_id INTO v_role, v_tenant_id
  FROM profiles
  WHERE id = v_user_id;

  -- Only allow admins and super_admins to set tenant default
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can set tenant default locale';
  END IF;

  -- Validate locale
  IF NOT is_valid_locale(p_locale) THEN
    RAISE EXCEPTION 'Invalid locale: %', p_locale;
  END IF;

  -- Update tenant default locale for the user's tenant
  UPDATE profiles
  SET
    tenant_default_locale = p_locale,
    updated_at = NOW()
  WHERE tenant_id = v_tenant_id;

  RETURN TRUE;
END;
$$;

-- ============================================
-- Add locale field to email_templates if exists
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    EXECUTE 'ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT ''en''';
    EXECUTE 'COMMENT ON COLUMN email_templates.locale IS ''Locale for this email template variant''';
  END IF;
END $$;

-- ============================================
-- Add locale field to help_topics if exists
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_topics') THEN
    EXECUTE 'ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT ''en''';
    EXECUTE 'COMMENT ON COLUMN help_topics.locale IS ''Locale for this help topic''';
  END IF;
END $$;

-- ============================================
-- Create index for faster locale lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_locale
ON profiles(preferred_locale)
WHERE preferred_locale IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_default_locale
ON profiles(tenant_default_locale);

-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION is_valid_locale(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_effective_locale() TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_preferred_locale(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_tenant_default_locale(TEXT) TO authenticated;
