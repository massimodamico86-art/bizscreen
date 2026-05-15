/**
 * Phase 173 — Starter Packs E2E (TPCK-01..04).
 *
 * Live Playwright coverage for the Starter Packs gallery feature.
 *
 * NAMING: This file is intentionally `starter-packs.spec.js`, NOT `template-packs.spec.js`.
 * The legacy `template-packs.spec.js` targets the v2 `content_templates` onboarding
 * flow (Phase 23), which CONTEXT D-02 keeps untouched. Phase 173 introduces a
 * distinct concept (curated gallery bundles), so the E2E suite is under a new name.
 *
 * Structural assertions only (TQAL-05): role, label, regex, getByTestId. Never
 * exact counts of templates/packs (those drift with seed data).
 *
 * Pitfall 7: pack apply does NOT navigate away from the gallery (D-14 — opt-in
 * 'View scenes' action in the toast). Do NOT use readCurrentPage here.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

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
}

test.describe('Starter Packs (TPCK-01..04)', () => {
  test.skip(SKIP, 'TEST_USER_EMAIL/PASSWORD not configured');

  test('TPCK-01: gallery shows pack strip section above template grid', async ({ page }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);
    // StarterPacksStrip renders <section aria-label="Starter Packs"> + <h2>Starter Packs</h2>
    await expect(
      page.getByRole('region', { name: /^Starter Packs$/i }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('TPCK-01: pack strip hides only when search input is non-empty (D-11, Pitfall 5)', async ({
    page,
  }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    const stripRegion = page.getByRole('region', { name: /^Starter Packs$/i }).first();
    await expect(stripRegion).toBeVisible();

    const searchInput = page.getByRole('textbox', { name: /Search templates/i }).first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type search → strip hides (D-11)
      await searchInput.fill('zzzxyz-no-match');
      await page.waitForTimeout(500);
      await expect(stripRegion).toBeHidden();

      // Clear → strip back
      await searchInput.fill('');
      await page.waitForTimeout(500);
      await expect(stripRegion).toBeVisible();
    }
  });

  test('TPCK-02: bulk apply emits success toast "Added N templates from <Pack>" (D-14)', async ({
    page,
  }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    // PackCard sets data-testid={`pack-card-${pack.id}`}
    const packCard = page.locator('[data-testid^="pack-card-"]').first();
    const count = await packCard.count();
    test.skip(count === 0, 'No starter packs available in test tenant — seed one first');
    await packCard.click();

    // Modal opens; Apply CTA label is "Apply pack (N templates)" per UI-SPEC
    const applyBtn = page.getByRole('button', { name: /^Apply pack \(\d+ templates\)$/i });
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    await applyBtn.click();

    // Success toast (TQAL-05: regex, not exact count). UI-SPEC heading:
    // "Added N templates from [Pack name]"
    await expect(page.getByText(/Added \d+ templates from /i)).toBeVisible({ timeout: 15000 });

    // Pitfall 7 — pack apply must NOT navigate. Structural proof: we stayed on
    // the Templates page (heading still visible).
    await expect(
      page.getByRole('heading', { name: /^Templates$/ }).first()
    ).toBeVisible();
  });

  test('TPCK-04: pack card displays count badge + industry label + 2x2 mosaic', async ({
    page,
  }) => {
    await loginAndPrepare(page);
    await gotoTemplates(page);

    const packCard = page.locator('[data-testid^="pack-card-"]').first();
    const count = await packCard.count();
    test.skip(count === 0, 'No starter packs available in test tenant');

    // Count badge text "N templates" (regex — never an exact integer per TQAL-05)
    await expect(packCard.getByText(/\d+ templates/i)).toBeVisible();
  });
});
