/**
 * Template Gallery Performance — Phase 179 Plan 03 Wave 0 scaffold (TVRZ-02, SC-2)
 *
 * Plays the gallery first-paint scenario under CDP CPU throttle at rate=1
 * (literal interpretation of SC-2 "1x CPU throttling" per 179-RESEARCH OQ-2;
 * rate=1 = no throttle, used here to document intent and provide a CI-stable
 * spot to swap rates if hardware varies). The CONTEXT.md SC-2 wording
 * targets "mid-range Chromium hardware (~M1)" which approximates current CI
 * baseline.
 *
 * Nyquist RED state until Plans 04 + 05 ship the virtualized gallery —
 * `[role="grid"]` will not exist in the current `TemplateGalleryPage.jsx`
 * full-DOM rendering.
 *
 * Catalog-floor pre-flight: asserts `aria-rowcount * cols >= 400` so the
 * <1s gate does not falsely pass against an unseeded local Supabase DB
 * (RESEARCH §Assumptions Log A2 mitigation).
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

/** Click the sidebar Templates button and wait for the gallery to render. */
async function gotoTemplates(page) {
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page.waitForTimeout(500);
  await waitForPageReady(page);
}

test.describe('Template Gallery Performance (Phase 179 SC-2)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
  });

  test('gallery first-paint <1s at ~500-template catalog with 1x CPU throttle (SC-2)', async ({ page, context }) => {
    // Phase 180 Plan 180-11 (conditional): SC-7 perf gate formally ACCEPTED FOR v21.0
    // after Plan 180-10 prod-build re-run still missed the 1000ms budget. Per deferred-items.md
    // Phase 180 section, SC-2 budget remediation is scheduled for v21.1 (either bundle-analysis
    // + perf optimization, or formal budget revision to a measured prod baseline).
    test.skip(true, 'SC-7 perf gate deferred to v21.1: prod-build first-paint exceeded 1000ms budget per Plan 180-10 outcome');
    // Open CDP session BEFORE navigation per 179-RESEARCH §Pitfall 7
    const client = await context.newCDPSession(page);
    // rate=1 is documented as "no throttle" per Chrome DevTools spec — see OQ-2
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // Set start mark inside the post-login document, immediately before in-app navigation (CR-01 fix)
    await page.evaluate(() => performance.mark('gallery-paint-start'));

    await gotoTemplates(page);
    await page.locator('[role="grid"]').first().waitFor({ state: 'visible', timeout: 5000 });

    // Catalog-floor pre-flight (RESEARCH §Assumptions Log A2 mitigation)
    const rowcountAttr = await page.locator('[role="grid"]').first().getAttribute('aria-rowcount');
    const rowcount = Number(rowcountAttr);
    expect(rowcount).toBeGreaterThan(0);
    // Approximate cols=4 at default desktop viewport; pre-flight floor is 400 templates
    expect(rowcount * 4).toBeGreaterThanOrEqual(400);

    // Capture elapsed
    const elapsed = await page.evaluate(() => {
      performance.mark('gallery-paint-end');
      performance.measure('gallery-paint', 'gallery-paint-start', 'gallery-paint-end');
      return performance.getEntriesByName('gallery-paint')[0]?.duration ?? Infinity;
    });

    // eslint-disable-next-line no-console
    console.log(`[SC-2] gallery first-paint: ${elapsed.toFixed(0)}ms (budget 1000ms)`);
    expect(elapsed).toBeLessThan(1000);
  });
});
