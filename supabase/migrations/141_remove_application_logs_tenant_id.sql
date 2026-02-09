-- Migration: Remove orphaned tenant_id from application_logs
-- Created: 2026-02-09
-- Description: Migration 105 created application_logs with a tenant_id column
-- referencing a non-existent tenants table. This project uses profiles.owner_id
-- for tenant identity. This corrective migration removes the orphaned column,
-- its index, and updates the RLS policy that referenced it.

-- Drop the index on tenant_id
DROP INDEX IF EXISTS idx_application_logs_tenant_id;

-- Update the RLS policy that references tenant_id
-- Old policy: "Users can view own logs" allowed access if user_id = auth.uid() OR tenant_id::text = auth.uid()::text
-- New policy: simplified to just user_id = auth.uid()
DROP POLICY IF EXISTS "Users can view own logs" ON application_logs;
CREATE POLICY "Users can view own logs"
  ON application_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Drop the tenant_id column
ALTER TABLE application_logs DROP COLUMN IF EXISTS tenant_id;

-- Update table comment
COMMENT ON TABLE application_logs IS 'Stores critical application logs for monitoring and debugging. Tenant identity tracked via user_id -> profiles.owner_id.';
