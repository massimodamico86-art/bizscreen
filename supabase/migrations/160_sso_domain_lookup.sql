-- Migration: SSO Domain Lookup
-- Adds domains column to sso_providers and creates lookup RPC for login-page auto-detection.

-- 1. Add domains column to sso_providers
ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS domains TEXT[] DEFAULT '{}';

-- 2. GIN index for fast domain lookup via ANY()
CREATE INDEX IF NOT EXISTS idx_sso_providers_domains ON sso_providers USING GIN (domains);

-- 3. Public RPC: look up an SSO provider by email domain (called pre-login, needs anon access)
CREATE OR REPLACE FUNCTION public.lookup_sso_by_domain(p_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider RECORD;
BEGIN
  SELECT id, name, enforce_sso, tenant_id
  INTO v_provider
  FROM sso_providers
  WHERE is_enabled = true
    AND p_domain = ANY(domains)
  LIMIT 1;

  IF v_provider IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'provider_id', v_provider.id,
    'provider_name', v_provider.name,
    'enforce_sso', v_provider.enforce_sso,
    'tenant_id', v_provider.tenant_id
  );
END;
$$;

-- Grant execute to both authenticated and anon (anon needed for pre-login SSO detection)
GRANT EXECUTE ON FUNCTION public.lookup_sso_by_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_sso_by_domain(TEXT) TO anon;
