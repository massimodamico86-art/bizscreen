/**
 * Phase 173 — Favorites E2E (TFAV-01..03).
 *
 * Live Playwright coverage for per-user template favorites: toggle from card,
 * filter chip, persist across logout/login, empty state.
 *
 * Structural assertions only (TQAL-05): role + aria-label + regex. No exact
 * counts. Each toggle test cleans up (untoggle) to avoid leaking state into
 * later runs.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, forceRemoveGalleryTour } from './helpers.js';

const SKIP = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

async function gotoTemplates(page) {
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page
    .getByRole('heading', { name: /^Templates$/ })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await waitForPageReady(page);
  // Phase 180 Plan 180-12 (SC-11_v21.1): force-remove gallery-tour driver.js
  // elements after navigating to the templates page. Uses DOM removal (NOT
  // button clicks) to avoid triggering markGalleryTourSeen, preserving the
  // per-user completed_gallery_tour=false state for gallery-tour.spec.js.
  await forceRemoveGalleryTour(page);
}

test.describe.configure({ mode: 'serial' });
test.describe('Favorites (TFAV-01..03)', () => {
  test.skip(SKIP, 'TEST_USER_EMAIL/PASSWORD not configured');

  test('TFAV-01: toggle from card — heart aria-label flips, persists across session', async ({
    page,
  }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    // FavoriteButton: aria-label "Add to favorites" (unfavorited) /
    // "Remove from favorites" (favorited) — UI-SPEC contract
    const heart = page.getByRole('button', { name: /^Add to favorites$/i }).first();
    const unfavCount = await heart.count();
    test.skip(
      unfavCount === 0,
      'All templates already favorited — reset test user favorites first'
    );
    await expect(heart).toBeVisible({ timeout: 10000 });

    // Click heart AND wait for the POST /rest/v1/template_favorites to land.
    // Without this wait, we may clear cookies before the toggleFavorite()
    // insert completes, which means the server-side row is never created and
    // the persistence assertion below fails.
    const favoriteRequest = page.waitForResponse(
      (resp) =>
        resp.url().includes('/rest/v1/template_favorites') && resp.request().method() === 'POST',
      { timeout: 10000 }
    );
    await heart.click();
    await favoriteRequest;
    // After click, the SAME button's aria-label flips to "Remove from favorites"
    await expect(
      page.getByRole('button', { name: /^Remove from favorites$/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // Persistence check across a fresh page load. page.reload() and
    // page.goto('/app') both hit a pre-existing auth-context hang where the
    // app stays on the "Loading..." spinner indefinitely (not a Phase 173
    // regression — reproduces in manual testing). The robust workaround is
    // to drop cookies + local/sessionStorage and fully re-login, which
    // reliably exercises the "favorite persists in the database" contract
    // that TFAV-01 cares about. Note: TFAV-03 uses the same approach and
    // passes consistently.
    const ctx = page.context();
    await ctx.clearCookies();
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
    await loginAndPrepare(page);
    await gotoTemplates(page);
    await expect(
      page.getByRole('button', { name: /^Remove from favorites$/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Cleanup: untoggle so the test is idempotent across runs
    await page.getByRole('button', { name: /^Remove from favorites$/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('TFAV-02: favorites filter chip — URL ?favorites=1 toggles on/off', async ({ page }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    // TemplateGalleryPage renders the chip as <button role="checkbox"
    // aria-label="Filter by favorites">Favorites</button>
    const chip = page.getByRole('checkbox', { name: /Filter by favorites/i });
    await expect(chip).toBeVisible({ timeout: 10000 });

    // Initial state: chip unchecked, URL has no favorites=1
    await expect(page).not.toHaveURL(/favorites=1/);

    // Toggle on
    await chip.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/favorites=1/);

    // Toggle off
    await chip.click();
    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/favorites=1/);
  });

  test('TFAV-02: empty state when no favorites + filter active (UI-SPEC copy)', async ({
    page,
  }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    // Pre-condition: ensure no favorites exist. We do this by toggling the chip
    // and inspecting what appears. If the user happens to have favorites, skip
    // (this test is brittle to external test state — treat gracefully).
    const chip = page.getByRole('checkbox', { name: /Filter by favorites/i });
    await chip.click();
    await page.waitForTimeout(700);

    const emptyHeading = page.getByText(/^No favorites yet$/);
    const emptyVisible = await emptyHeading.isVisible({ timeout: 2000 }).catch(() => false);
    if (!emptyVisible) {
      // User has favorites → skip this test gracefully.
      // Cleanup chip before skip.
      await chip.click();
      test.skip(true, 'Test user already has favorites — cannot exercise empty state');
      return;
    }

    // UI-SPEC copy: "No favorites yet" + "Tap the heart on any template to save it here."
    await expect(emptyHeading).toBeVisible();
    await expect(
      page.getByText(/Tap the heart on any template to save it here\./)
    ).toBeVisible();

    // Cleanup: toggle chip off
    await chip.click();
    await page.waitForTimeout(500);
  });

  test('TFAV-03: favorites persist across logout/login', async ({ page, context }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    // Favorite first template (unfavorited state)
    const heart = page.getByRole('button', { name: /^Add to favorites$/i }).first();
    const unfavCount = await heart.count();
    test.skip(
      unfavCount === 0,
      'All templates already favorited; cannot exercise TFAV-03 toggle-then-persist'
    );
    // Click + wait for the server-side insert to complete. Without waiting
    // for the POST response, clearing cookies immediately after the optimistic
    // UI flip can drop the in-flight request and the favorite never persists.
    const favoriteRequest = page.waitForResponse(
      (resp) =>
        resp.url().includes('/rest/v1/template_favorites') && resp.request().method() === 'POST',
      { timeout: 10000 }
    );
    await heart.click();
    await favoriteRequest;
    // Wait for the aria-label flip before logging out.
    await expect(
      page.getByRole('button', { name: /^Remove from favorites$/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // "Logout" via cookie/storage clear — proxy for clicking a sign-out button.
    // Phase 173 does not contract how a specific logout UI is exposed, so the
    // most robust test-agnostic approach is to drop the session and re-login.
    await context.clearCookies();
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });

    // Re-login + re-navigate
    await loginAndPrepare(page);
    await gotoTemplates(page);

    // Previously-favorited template must still show "Remove from favorites"
    await expect(
      page.getByRole('button', { name: /^Remove from favorites$/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Cleanup: untoggle
    await page.getByRole('button', { name: /^Remove from favorites$/i }).first().click();
    await page.waitForTimeout(500);
  });
});
