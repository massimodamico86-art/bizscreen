/**
 * Tenant B login helper for cross-tenant RLS smoke tests (Phase 170, TDAT-03).
 *
 * Requires env vars TEST_TENANT_B_EMAIL and TEST_TENANT_B_PASSWORD.
 * Callers MUST check tenantBAvailable() first and skip if false — Tenant B
 * is a provisioning prerequisite that may not exist in every environment.
 */
import { loginAndPrepare } from '../helpers.js';

export function tenantBAvailable() {
  return Boolean(
    process.env.TEST_TENANT_B_EMAIL && process.env.TEST_TENANT_B_PASSWORD
  );
}

export async function loginAsTenantB(page) {
  const email = process.env.TEST_TENANT_B_EMAIL;
  const password = process.env.TEST_TENANT_B_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'loginAsTenantB: TEST_TENANT_B_EMAIL / TEST_TENANT_B_PASSWORD not set'
    );
  }
  return loginAndPrepare(page, { email, password });
}
