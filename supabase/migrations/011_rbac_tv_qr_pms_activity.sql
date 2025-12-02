-- =====================================================
-- RBAC Policies for TV Devices, QR Codes, PMS, Activity Log
-- =====================================================
-- This migration adds admin/super_admin access to tables that
-- previously only had owner-based policies.
--
-- Dependencies: Requires helper functions from 009_add_roles_and_rbac.sql:
--   - is_super_admin()
--   - is_admin()
--   - get_my_client_ids()
-- =====================================================

-- ============================================
-- TV DEVICES RBAC POLICIES
-- ============================================

-- Drop old policies (from 001_initial_schema.sql)
DROP POLICY IF EXISTS "Users can view TV devices for own listings" ON tv_devices;
DROP POLICY IF EXISTS "Users can manage TV devices for own listings" ON tv_devices;

-- SELECT: Clients see own, admins see managed clients', super_admins see all
CREATE POLICY "tv_devices_select_policy" ON tv_devices FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- INSERT: Same pattern
CREATE POLICY "tv_devices_insert_policy" ON tv_devices FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- UPDATE: Same pattern
CREATE POLICY "tv_devices_update_policy" ON tv_devices FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- DELETE: Same pattern
CREATE POLICY "tv_devices_delete_policy" ON tv_devices FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- QR CODES RBAC POLICIES
-- ============================================

-- Drop old policies (from 001_initial_schema.sql)
DROP POLICY IF EXISTS "Users can view QR codes for own listings" ON qr_codes;
DROP POLICY IF EXISTS "Users can manage QR codes for own listings" ON qr_codes;

-- SELECT: Clients see own, admins see managed clients', super_admins see all
CREATE POLICY "qr_codes_select_policy" ON qr_codes FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- INSERT: Same pattern
CREATE POLICY "qr_codes_insert_policy" ON qr_codes FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- UPDATE: Same pattern
CREATE POLICY "qr_codes_update_policy" ON qr_codes FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- DELETE: Same pattern
CREATE POLICY "qr_codes_delete_policy" ON qr_codes FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- PMS CONNECTIONS RBAC POLICIES
-- ============================================

-- Drop old policies (from 006_pms_connections.sql)
DROP POLICY IF EXISTS "Users can view their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "Users can insert their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "Users can update their own PMS connections" ON pms_connections;
DROP POLICY IF EXISTS "Users can delete their own PMS connections" ON pms_connections;

-- SELECT: Clients see own, admins see managed clients', super_admins see all
CREATE POLICY "pms_connections_select_policy" ON pms_connections FOR SELECT
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- INSERT: Same pattern
CREATE POLICY "pms_connections_insert_policy" ON pms_connections FOR INSERT
WITH CHECK (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- UPDATE: Same pattern
CREATE POLICY "pms_connections_update_policy" ON pms_connections FOR UPDATE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- DELETE: Same pattern
CREATE POLICY "pms_connections_delete_policy" ON pms_connections FOR DELETE
USING (
  is_super_admin()
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND listing_id IN (
    SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "tv_devices_select_policy" ON tv_devices IS 'RBAC: Clients see own TV devices, admins see managed clients devices, super_admins see all';
COMMENT ON POLICY "qr_codes_select_policy" ON qr_codes IS 'RBAC: Clients see own QR codes, admins see managed clients codes, super_admins see all';
COMMENT ON POLICY "pms_connections_select_policy" ON pms_connections IS 'RBAC: Clients see own PMS connections, admins see managed clients connections, super_admins see all';

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================

-- Ensure RLS is enabled on all these tables
ALTER TABLE tv_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_connections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This migration successfully adds RBAC policies to:
-- ✅ tv_devices (4 policies: SELECT, INSERT, UPDATE, DELETE)
-- ✅ qr_codes (4 policies: SELECT, INSERT, UPDATE, DELETE)
-- ✅ pms_connections (4 policies: SELECT, INSERT, UPDATE, DELETE)
--
-- All policies follow the pattern:
-- - Clients: Access own data (via owner_id)
-- - Admins: Access managed clients' data (via get_my_client_ids())
-- - Super Admins: Access all data (via is_super_admin())
-- ============================================
