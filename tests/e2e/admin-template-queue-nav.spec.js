/**
 * Admin Template Queue — Navigation E2E (Phase 180 Plan 01).
 *
 * Closes v21.0-MILESTONE-AUDIT.md BLOCKER-1 / FLOW-1: verifies that a real
 * super_admin user can reach AdminTemplateQueuePage by clicking the new
 * "AI Template Queue" tile in the SuperAdminDashboardPage Admin Tools
 * panel — exercising the same production click-through path real admins
 * use (no E2E test-only event-listener escape hatch — that path only
 * registers under VITE_E2E_TEST_MODE=1 and is not active in production
 * builds, so it cannot be the canonical production-admin navigation
 * surface).
 *
 * Skip-guard pattern: mirrors admin-starter-packs.spec.js — entire suite
 * skips when TEST_SUPERADMIN_EMAIL is unset, so this spec is safe to
 * commit and runs only when super_admin creds are provisioned.
 *
 * FLOW-1 contract-as-code: the executor's acceptance gates require that
 * neither the test-mode CustomEvent name nor any window event-dispatch
 * API name appears in this source file. This file is therefore written
 * to keep both of those literal strings out of comments and code.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('AI Template Queue navigation from Super Admin Dashboard (Phase 180 BLOCKER-1 / FLOW-1)', () => {
  test.skip(
    () => !process.env.TEST_SUPERADMIN_EMAIL,
    'super_admin test credentials (TEST_SUPERADMIN_EMAIL / TEST_SUPERADMIN_PASSWORD) not configured'
  );

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
  });

  test('super_admin clicks the AI Template Queue tile and lands on AdminTemplateQueuePage (BLOCKER-1 + FLOW-1)', async ({ page }) => {
    // Super Admin Dashboard is the default landing page for super_admin role
    // (src/App.jsx:712-715 routes the role to <SuperAdminDashboardPage onNavigate={setCurrentPage} />).
    await expect(page.getByRole('heading', { name: /^Super Admin Dashboard$/i })).toBeVisible({ timeout: 10000 });

    // The Admin Tools panel renders inside the {onNavigate && (...)} conditional
    // (SuperAdminDashboardPage.jsx:235). The new "AI Template Queue" tile is the
    // 11th entry in the array (Plan 01 Task 1).
    const tile = page.getByRole('button', { name: /^AI Template Queue$/i });
    await expect(tile).toBeVisible({ timeout: 5000 });
    await tile.click();

    // Post-click: AdminTemplateQueuePage renders via App.jsx pageMap entry
    // 'admin-template-queue' (line 589). The page's PageLayout sets the
    // heading "Template Queue" (AdminTemplateQueuePage.jsx:353) and the
    // Pending tab is the default activeTab — its <ul data-testid="pending-list">
    // (line 522) renders even when empty (shows empty-state copy).
    await expect(page.getByRole('heading', { name: /^Template Queue$/i })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="pending-list"]')).toBeVisible({ timeout: 5000 });

    // Defense-in-depth: the navigation path uses only the real
    // onClick → onNavigate(tool.id) chain rendered by the production
    // SuperAdminDashboardPage. The executor's grep gates assert that
    // no event-dispatch / test-only-listener identifiers appear in this
    // spec source (compile-time guarantee that the production navigation
    // surface is the only path under test).
  });
});
