/**
 * Template Gallery Accessibility — Phase 179 Plan 03 Wave 0 scaffold (TVRZ-05, SC-5)
 *
 * Runs @axe-core/playwright scoped to the virtualized grid container.
 * `.include('[role="grid"]')` excludes the FilterBar + StarterPacksStrip
 * + page chrome so the gate measures the new virtualized DOM in isolation.
 *
 * Nyquist RED state until Plans 04 + 05 ship the virtualized gallery —
 * `[role="grid"]` will not exist in the current full-DOM rendering.
 *
 * Pattern source: 179-RESEARCH.md §Code Examples Example 2.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

/** Click the sidebar Templates button and wait for the gallery to render. */
async function gotoTemplates(page) {
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page.waitForTimeout(500);
  await waitForPageReady(page);
}

test.describe('Template Gallery Accessibility (Phase 179 SC-5)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
  });

  test('virtualized gallery is axe-core clean at full catalog (SC-5)', async ({ page }) => {
    await gotoTemplates(page);
    await page.locator('[role="grid"]').first().waitFor({ state: 'visible', timeout: 5000 });

    // aria-rowcount sanity (~500 templates / 4 cols ≈ 125 rows; floor 50)
    const rowcountAttr = await page.locator('[role="grid"]').first().getAttribute('aria-rowcount');
    expect(Number(rowcountAttr)).toBeGreaterThan(50);

    // Scoped axe scan — only the virtual grid
    const results = await new AxeBuilder({ page })
      .include('[role="grid"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
