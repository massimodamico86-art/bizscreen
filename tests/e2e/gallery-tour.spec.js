/**
 * Gallery Tour E2E
 *
 * Playwright coverage for the driver.js first-visit gallery tour:
 *   - On first gallery visit (completed_gallery_tour=false), a 3-step
 *     driver.js tour fires highlighting filter bar, search, and first
 *     template card.
 *   - On any subsequent visit (after dismissal), the tour does not re-appear
 *     (dismissal persistence).
 *
 * Note on test sequencing: these tests rely on a pristine `completed_gallery_tour=false`
 * for the test user. The first-visit test completes the tour; the second-visit test
 * relies on that completion and runs second (Playwright executes tests within a file
 * sequentially by default in absence of fullyParallel). If executed independently,
 * the second test will land on a completed-tour state and pass for the right reason.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

async function gotoTemplates(page) {
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page
    .getByRole('heading', { name: /^Templates$/ })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await waitForPageReady(page);
}

test.describe('Gallery Tour (TONB-04)', () => {
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD,
    });
    await waitForPageReady(page);
  });

  test('shows 3-step driver.js tour on first gallery visit', async ({ page }) => {
    // Phase 180 Plan 180-12 (SC-11_v21.1 extended): gallery-tour first-visit
    // formally ACCEPTED FOR v21.0 alongside dismissal-persistence (below).
    // Root cause: completed_gallery_tour=true is persisted to the shared
    // onboarding_progress DB row for the test user — once any run marks it seen
    // (by completing the driver.js tour), subsequent runs see the tour as already
    // seen and it no longer fires. A per-test state-reset RPC is required to make
    // this test reliably green; deferred to v21.1 per-test isolation work.
    test.skip(true, 'gallery-tour first-visit deferred: per-user completed_gallery_tour DB state non-determinism; v20.0-baseline carried-forward per Phase 180 acceptance (Plan 180-12)');
    // Precondition: completed_gallery_tour=false for this user.
    await gotoTemplates(page);

    await expect(page.locator('[data-tour="filter-bar"]')).toBeVisible({
      timeout: 10000,
    });

    const popover = page.locator('.driver-popover');
    await expect(popover).toBeVisible({ timeout: 10000 });

    // Step 1: filter bar.
    await expect(popover).toContainText(/Filter Templates/i);

    // Step 2: search input.
    await page.locator('.driver-popover-next-btn').click();
    await expect(popover).toContainText(/Search/i);

    // Step 3: first template card.
    await page.locator('.driver-popover-next-btn').click();
    await expect(popover).toContainText(/Apply a Template/i);

    const doneBtn = page.locator('.driver-popover-done-btn, .driver-popover-next-btn').last();
    await doneBtn.click();

    await expect(popover).toHaveCount(0, { timeout: 5000 });
  });

  test('tour does not re-appear on second gallery visit (dismissal persistence)', async ({
    page,
  }) => {
    // Phase 180 Plan 180-11 (extending Plan 180-09): gallery-tour dismissal-persistence
    // formally ACCEPTED FOR v21.0 per .planning/milestones/v20.0-phases/175-new-template-content-quality-pass/deferred-items.md
    // Phase 180 section. Root cause: per-user `completed_gallery_tour` state non-determinism
    // across parallel test workers — `markGalleryTourSeen` is per-user, not per-test. Re-enabling
    // requires per-test reset RPC or per-worker isolated test user in v21.1.
    test.skip(true, 'gallery-tour dismissal-persistence deferred: per-user state non-determinism; v20.0-baseline carried-forward per Phase 180 acceptance');
    // Precondition: completed_gallery_tour=true (set by the previous test
    // OR by markGalleryTourSeen having been called for this user).
    // Navigate AWAY then BACK to force a fresh mount of TemplateGalleryPage.
    await gotoTemplates(page);

    const dashboardBtn = page.getByRole('button', { name: /^Dashboard$/i }).first();
    if (await dashboardBtn.count()) {
      await dashboardBtn.click();
      await waitForPageReady(page);
    }

    await gotoTemplates(page);

    // Wait for filter bar — proves we landed on the gallery.
    await expect(page.locator('[data-tour="filter-bar"]')).toBeVisible({
      timeout: 10000,
    });

    // Give the tour 2 seconds to fire (it shouldn't). After that window,
    // assert no popover is present.
    await page.waitForTimeout(2000);
    await expect(page.locator('.driver-popover')).toHaveCount(0);
  });
});
