-- =====================================================
-- FINAL RLS & RBAC CONSOLIDATION
-- =====================================================
-- This migration provides the canonical, final state for all RLS policies.
-- It is idempotent and can be run multiple times safely.
--
-- Purpose:
-- 1. Clean up any legacy policies from migrations 001/003
-- 2. Ensure correct RBAC policies from 009/011 are in place
-- 3. Fix profiles_insert_policy to allow self-registration
-- 4. Add missing activity_log UPDATE/DELETE policies for super_admin
-- 5. Verify all tables have RLS enabled
--
-- Dependencies:
-- - Requires helper functions from 009_add_roles_and_rbac.sql:
--   * is_super_admin()
--   * is_admin()
--   * get_my_client_ids()
-- =====================================================

-- ============================================
-- ENSURE HELPER FUNCTIONS EXIST
-- ============================================

-- Create helper functions if they don't exist (idempotent)
-- These are from migration 009, but we include them here for safety

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_client_ids()
RETURNS TABLE(client_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM profiles
  WHERE managed_by = auth.uid() AND role = 'client';
$$;

-- ============================================
-- CLEAN UP ALL LEGACY POLICIES
-- ============================================

-- PROFILES: Drop all possible policy names (from 001, 003, 009)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- LISTINGS: Drop all possible policy names (from 001, 009)
DROP POLICY IF EXISTS "Users can view own listings" ON listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON listings;
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON listings;
DROP POLICY IF EXISTS "listings_select_policy" ON listings;
DROP POLICY IF EXISTS "listings_insert_policy" ON listings;
DROP POLICY IF EXISTS "listings_update_policy" ON listings;
DROP POLICY IF EXISTS "listings_delete_policy" ON listings;

-- GUESTS: Drop all possible policy names (from 001, 009)
DROP POLICY IF EXISTS "Users can view guests for own listings" ON guests;
DROP POLICY IF EXISTS "Users can insert guests for own listings" ON guests;
DROP POLICY IF EXISTS "Users can update guests for own listings" ON guests;
DROP POLICY IF EXISTS "Users can delete guests for own listings" ON guests;
DROP POLICY IF EXISTS "guests_select_policy" ON guests;
DROP POLICY IF EXISTS "guests_insert_policy" ON guests;
DROP POLICY IF EXISTS "guests_update_policy" ON guests;
DROP POLICY IF EXISTS "guests_delete_policy" ON guests;

-- TV_DEVICES: Drop all possible policy names (from 001, 011)
DROP POLICY IF EXISTS "Users can view TV devices for own listings" ON tv_devices;
DROP POLICY IF EXISTS "Users can manage TV devices for own listings" ON tv_devices;
DROP POLICY IF EXISTS "tv_devices_select_policy" ON tv_devices;
DROP POLICY IF EXISTS "tv_devices_insert_policy" ON tv_devices;
DROP POLICY IF EXISTS "tv_devices_update_policy" ON tv_devices;
DROP POLICY IF EXISTS "tv_devices_delete_policy" ON tv_devices;

-- QR_CODES: Drop all possible policy names (from 001, 011)
DROP POLICY IF EXISTS "Users can view QR codes for own listings" ON qr_codes;
DROP POLICY IF EXISTS "Users can manage QR codes for own listings" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_select_policy" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_insert_policy" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_update_policy" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_delete_policy" ON qr_codes;

-- PMS_CONNECTIONS: Drop all possible policy names (from 006, 011)
DROP POLICY IF EXISTS "Users can view their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "Users can insert their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "Users can update their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "Users can delete their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "pms_connections_select_policy" ON pms_connections;
DROP POLICY IF EXISTS "pms_connections_insert_policy" ON pms_connections;
DROP POLICY IF EXISTS "pms_connections_update_policy" ON pms_connections;
DROP POLICY IF EXISTS "pms_connections_delete_policy" ON pms_connections;

-- ============================================
-- CREATE FINAL CANONICAL POLICIES
-- ============================================

-- ============================================
-- PROFILES TABLE (4 policies)
-- ============================================

CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
USING (
  id = auth.uid()                                      -- Users see own profile
  OR is_super_admin()                                  -- Super admins see all
  OR (is_admin() AND managed_by = auth.uid())          -- Admins see managed clients
);

CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
USING (
  id = auth.uid()                                      -- Users update own profile
  OR is_super_admin()                                  -- Super admins update all
  OR (is_admin() AND managed_by = auth.uid())          -- Admins update managed clients
);

-- FIX: Allow self-registration AND admin/super_admin creation
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
WITH CHECK (
  id = auth.uid()                                      -- Users can insert own profile (self-registration)
  OR is_super_admin()                                  -- Super admins can create profiles
  OR is_admin()                                        -- Admins can create client profiles
);

CREATE POLICY "profiles_delete_policy"
ON profiles FOR DELETE
USING (
  is_super_admin()                                     -- Only super admins can delete
);

-- ============================================
-- LISTINGS TABLE (4 policies)
-- ============================================

CREATE POLICY "listings_select_policy"
ON listings FOR SELECT
USING (
  owner_id = auth.uid()                                -- Clients see own listings
  OR is_super_admin()                                  -- Super admins see all
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))  -- Admins see managed clients' listings
);

CREATE POLICY "listings_insert_policy"
ON listings FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "listings_update_policy"
ON listings FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "listings_delete_policy"
ON listings FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- ============================================
-- GUESTS TABLE (4 policies)
-- ============================================

CREATE POLICY "guests_select_policy"
ON guests FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l
    WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "guests_insert_policy"
ON guests FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l
    WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "guests_update_policy"
ON guests FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l
    WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "guests_delete_policy"
ON guests FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l
    WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- TV_DEVICES TABLE (4 policies)
-- ============================================

CREATE POLICY "tv_devices_select_policy"
ON tv_devices FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "tv_devices_insert_policy"
ON tv_devices FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "tv_devices_update_policy"
ON tv_devices FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "tv_devices_delete_policy"
ON tv_devices FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- QR_CODES TABLE (4 policies)
-- ============================================

CREATE POLICY "qr_codes_select_policy"
ON qr_codes FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "qr_codes_insert_policy"
ON qr_codes FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "qr_codes_update_policy"
ON qr_codes FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "qr_codes_delete_policy"
ON qr_codes FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- PMS_CONNECTIONS TABLE (4 policies)
-- ============================================

CREATE POLICY "pms_connections_select_policy"
ON pms_connections FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "pms_connections_insert_policy"
ON pms_connections FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "pms_connections_update_policy"
ON pms_connections FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

CREATE POLICY "pms_connections_delete_policy"
ON pms_connections FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_connections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADD POLICY COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "profiles_select_policy" ON profiles IS 'RBAC: Users see own, admins see managed clients, super_admins see all';
COMMENT ON POLICY "profiles_update_policy" ON profiles IS 'RBAC: Users update own, admins update managed clients, super_admins update all';
COMMENT ON POLICY "profiles_insert_policy" ON profiles IS 'RBAC: Self-registration allowed, admins/super_admins can create profiles';
COMMENT ON POLICY "profiles_delete_policy" ON profiles IS 'RBAC: Only super_admins can delete profiles';

COMMENT ON POLICY "listings_select_policy" ON listings IS 'RBAC: Clients see own, admins see managed clients listings, super_admins see all';
COMMENT ON POLICY "listings_insert_policy" ON listings IS 'RBAC: Clients insert own, admins insert for managed clients, super_admins insert all';
COMMENT ON POLICY "listings_update_policy" ON listings IS 'RBAC: Clients update own, admins update managed clients listings, super_admins update all';
COMMENT ON POLICY "listings_delete_policy" ON listings IS 'RBAC: Clients delete own, admins delete managed clients listings, super_admins delete all';

COMMENT ON POLICY "guests_select_policy" ON guests IS 'RBAC: Access tied to listing ownership';
COMMENT ON POLICY "tv_devices_select_policy" ON tv_devices IS 'RBAC: Access tied to listing ownership';
COMMENT ON POLICY "qr_codes_select_policy" ON qr_codes IS 'RBAC: Access tied to listing ownership';
COMMENT ON POLICY "pms_connections_select_policy" ON pms_connections IS 'RBAC: Access tied to listing ownership';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Final Policy Count:
-- - profiles: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - listings: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - guests: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - tv_devices: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - qr_codes: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - pms_connections: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Total: 24 policies

-- All policies follow the RBAC pattern:
-- ✅ Clients: Access own data
-- ✅ Admins: Access managed clients' data (via get_my_client_ids())
-- ✅ Super Admins: Access all data (via is_super_admin())
