/**
 * Phase 173 — Admin Starter Packs E2E (TPCK-03).
 *
 * Requires super_admin test credentials (TEST_SUPERADMIN_EMAIL / TEST_SUPERADMIN_PASSWORD
 * — NOTE: single-word "SUPERADMIN", matches existing repo env convention).
 *
 * Admin-nav navigation: the super-admin dashboard's hardcoded admin-tools grid
 * does not currently link to admin-starter-packs (scoped out of Phase 173 per
 * T-173-10-03 threat register). Tests dispatch a CustomEvent consumed by the
 * test-mode listener in App.jsx (Plan 09 Task 2), guarded by
 * `import.meta.env.MODE === 'test' || VITE_E2E_TEST_MODE`. playwright.config.js
 * sets VITE_E2E_TEST_MODE=1 on the dev server it spawns, so the listener is
 * always active when running through the Playwright webServer. If the listener
 * is NOT active, the heading waitFor() below times out and the test fails
 * loudly (not silently skipped).
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

const SKIP = !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD;

/**
 * Navigate to admin-starter-packs via the test-mode CustomEvent.
 * App.jsx listens for `test:setCurrentPage` ONLY when MODE === 'test' or
 * VITE_E2E_TEST_MODE is set (Plan 09 Task 2 — B-3 fix).
 */
async function gotoAdminStarterPacks(page) {
  // Wait for the super-admin dashboard to fully mount + React useEffect to
  // register the test:setCurrentPage listener. Without this wait the dispatch
  // can fire before the listener exists, silently doing nothing. Empirically
  // a 1s wait is sufficient; we also explicitly wait for the dashboard
  // heading as a structural signal that the tree is mounted.
  await page
    .getByRole('heading', { name: /^Super Admin Dashboard$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('test:setCurrentPage', { detail: 'admin-starter-packs' })
    );
  });
  // Confirm navigation actually happened — the AdminStarterPacksPage renders
  // PageLayout title="Starter Packs".
  await page
    .getByRole('heading', { name: /^Starter Packs$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await waitForPageReady(page);
}

test.describe('Admin Starter Packs (TPCK-03)', () => {
  test.skip(SKIP, 'TEST_SUPERADMIN_EMAIL/PASSWORD not configured');

  test('super_admin can navigate to admin-starter-packs page (Pitfall 6 — sidebar absent; B-3 — test-mode listener active)', async ({
    page,
  }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminStarterPacks(page);
    // Heading visibility already asserted in helper.
  });

  test('super_admin sees "New pack" CTA on the admin page (UI-SPEC Copywriting)', async ({
    page,
  }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminStarterPacks(page);
    await expect(
      page.getByRole('button', { name: /^New pack$/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test('super_admin can open delete confirmation showing UI-SPEC copy (Keep pack + Delete pack labels)', async ({
    page,
  }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminStarterPacks(page);

    // W-7 fix: scope the Delete selector to a pack row via the stable testid
    // added in Plan 09 Task 1 (data-testid={`delete-pack-${pack.id}`}).
    const deleteBtn = page.getByTestId(/^delete-pack-/).first();
    const count = await deleteBtn.count();
    test.skip(count === 0, 'No packs to delete in test DB — seed one first');
    await deleteBtn.click();

    // UI-SPEC Copywriting (verbatim):
    //   "This removes the pack but does not delete its templates or any
    //    scenes you've already created from it."
    await expect(
      page.getByText(/This removes the pack but does not delete its templates/i)
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^Delete pack$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Keep pack$/i })).toBeVisible();

    // Dismiss without deleting — do NOT destroy the seed pack
    await page.getByRole('button', { name: /^Keep pack$/i }).click();
    await expect(
      page.getByText(/This removes the pack but does not delete its templates/i)
    ).not.toBeVisible({ timeout: 3000 });
  });
});
