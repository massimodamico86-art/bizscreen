-- Migration 155: Add tenant_id column to profiles table
--
-- Context: The codebase uses a "profiles-as-tenant" pattern where each admin/owner
-- profile IS a tenant. Code in AuthContext, layoutTemplateService, notificationDispatcherService,
-- EnterpriseSecurityPage, and observability all expect a tenant_id column on profiles.
--
-- Tenant ID semantics:
--   - For super_admin and admin roles: tenant_id = their own profile id (they ARE the tenant)
--   - For client role with managed_by set: tenant_id = managed_by (the admin IS the tenant)
--   - For client role without managed_by: tenant_id = their own id (standalone client)
-- ============================================================================

-- 1. Add the tenant_id column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Backfill existing rows:
--    - Clients with managed_by: tenant_id = managed_by (admin is the root tenant)
--    - Everyone else: tenant_id = their own id (they are the root tenant)
UPDATE public.profiles
SET tenant_id = CASE
  WHEN role = 'client' AND managed_by IS NOT NULL THEN managed_by
  ELSE id
END;

-- 3. Create an index for efficient tenant-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- 4. Create a trigger to automatically set tenant_id on INSERT
CREATE OR REPLACE FUNCTION public.set_profile_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If tenant_id is already set, leave it alone
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- For clients with a managing admin, use the admin's id as tenant
  IF NEW.role = 'client' AND NEW.managed_by IS NOT NULL THEN
    NEW.tenant_id := NEW.managed_by;
  ELSE
    -- Admin, super_admin, or standalone client: they ARE the tenant
    NEW.tenant_id := NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_tenant_id ON public.profiles;
CREATE TRIGGER trg_set_profile_tenant_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_tenant_id();

-- 5. Also update tenant_id when managed_by changes
CREATE OR REPLACE FUNCTION public.update_profile_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If managed_by changed, re-derive tenant_id
  IF NEW.managed_by IS DISTINCT FROM OLD.managed_by THEN
    IF NEW.role = 'client' AND NEW.managed_by IS NOT NULL THEN
      NEW.tenant_id := NEW.managed_by;
    ELSE
      NEW.tenant_id := NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_tenant_id ON public.profiles;
CREATE TRIGGER trg_update_profile_tenant_id
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_tenant_id();

DO $$ BEGIN RAISE NOTICE 'Migration 155 completed: Added tenant_id column to profiles with backfill and triggers'; END $$;
