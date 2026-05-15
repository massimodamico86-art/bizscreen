import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, expectAtLeastOneTemplateCard, expectGalleryRendersWithoutError } from './helpers.js';

/**
 * Navigate to the SVG Templates gallery via the sidebar Templates button.
 *
 * Plan 175-01 originally shipped these tests using `?page=svg-templates`
 * URL params, but App.jsx (src/App.jsx:162) keeps `currentPage` in
 * useState — there is no router-based mapping for `?page=`. The canonical
 * Phase 171 entry point (template-gallery.spec.js) clicks the sidebar
 * Templates button which calls setCurrentPage('templates'); we mirror that
 * pattern here for Plan 175-07's audit pass.
 *
 * Pitfall 4 mitigation: when caller passes `q`, we update the URL
 * searchParams AFTER the gallery mounts so TemplateGalleryPage's
 * `useSearchParams().get('q')` (src/pages/TemplateGalleryPage.jsx:163)
 * picks up the search filter and pins results to page 1 of the (now 127
 * active row) catalog.
 */
async function gotoSvgTemplates(page, { q } = {}) {
  if (q) {
    // Pitfall 4 mitigation: seed the `?q=` searchParam BEFORE TemplateGalleryPage
    // mounts. TemplateGalleryPage's local searchInput state is initialized from
    // `searchParams.get('q')` (src/pages/TemplateGalleryPage.jsx:157) only at
    // mount time — pushing the URL after mount has no effect. Updating the
    // browser history BEFORE the sidebar click + dispatching popstate ensures
    // react-router-dom's useSearchParams() picks up the new URL state, so the
    // gallery reads the search filter on its first render and pins the result
    // to page 1 (default limit=50 per templateGalleryService) regardless of
    // the live catalog size (now 127 active rows post-Plan 06).
    //
    // history.pushState/replaceState do NOT auto-fire popstate; we dispatch
    // it manually so react-router's <Router> internal listener invalidates its
    // location snapshot.
    await page.evaluate((qVal) => {
      const url = new URL(window.location.href);
      url.searchParams.set('q', qVal);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, q);
    await page.waitForTimeout(100);
  }

  // Click the sidebar Templates button (mirrors Phase 171 pattern from
  // template-gallery.spec.js — proven against this app shell).
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page.waitForTimeout(500);
  await waitForPageReady(page);
  // Wait for the heading rendered by TemplateGalleryPage to confirm mount.
  await expect(page.getByRole('heading', { name: /^Templates$/ })).toBeVisible({ timeout: 15000 });

  if (q) {
    // Verify the URL→input round-trip worked (search input reflects the seeded q).
    await expect(page.getByPlaceholder('Search templates...')).toHaveValue(q);
  }
}

test.describe('Phase 175 — gallery at 100+ templates (TQAL-05 structural)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('gallery renders >= 1 card without error toast (TQAL-05)', async ({ page }) => {
    await gotoSvgTemplates(page);
    await expectGalleryRendersWithoutError(page);
    await expectAtLeastOneTemplateCard(page);
  });

  test('gallery card shows real <img> thumbnail (NOT LayoutTemplate icon placeholder) for new templates (TCTN-04)', async ({ page }) => {
    // Pin to page 1 with a search that matches an existing template — avoids Pitfall 4
    // pagination drift now that the live catalog has 127 active templates.
    // The TemplateGalleryPage reads `?q=` (src/pages/TemplateGalleryPage.jsx:163)
    // — NOT `?search=`, so we use the actual product param name.
    await gotoSvgTemplates(page, { q: 'restaurant' });
    await expectGalleryRendersWithoutError(page);
    // Structural: at least one img with a meaningful src attribute (not the LayoutTemplate svg icon).
    const thumb = page.locator('main img[src]:not([src=""])').first();
    await expect(thumb).toBeVisible({ timeout: 5000 });
    // Plan 06 SUMMARY note: live S3 thumbnail backfill is DEFERRED — the new 103 rows
    // resolve to inline `/templates/svg/<slug>/design.svg` paths until backfill runs.
    // Existing 12 templates have the same inline pattern. Both are real <img src=...>
    // references — NOT the LayoutTemplate Lucide icon placeholder, which is rendered
    // as inline SVG (not an <img>). The structural assertion holds in both states.
    const src = await thumb.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src.length).toBeGreaterThan(10);
  });

  test('grep gate — no exact toHaveCount(N>=1) in gallery specs (TQAL-05)', async () => {
    // Static lint expressed as a runtime spec so it appears in the regular CI report.
    const { execSync } = await import('node:child_process');
    let matches = '';
    try {
      // Filter comments per Nyquist Rule (no self-invalidating grep gate).
      matches = execSync(
        "grep -rE \"toHaveCount\\(\\s*[1-9]\" tests/e2e/template-*.spec.js tests/e2e/gallery-*.spec.js 2>/dev/null | grep -v '^[^:]*:[[:space:]]*//' || true",
        { encoding: 'utf8' }
      );
    } catch (e) {
      matches = '';
    }
    expect(matches.trim()).toBe('');
  });
});
