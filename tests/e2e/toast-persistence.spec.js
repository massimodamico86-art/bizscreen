/**
 * Toast Persistence on Navigation - E2E Test
 *
 * Verifies BUG-07 fix (quick-52): error toasts should be dismissed
 * when navigating between pages via sidebar. Tests rapid navigation
 * to ensure no stale toasts persist across page transitions.
 *
 * IMPORTANT DISTINCTION: Some pages generate their own toasts on mount
 * (e.g., "Failed to fetch" when backend is unavailable). These are NOT
 * stale toasts -- they are new toasts from the current page. The BUG-07
 * fix ensures toasts from a PREVIOUS page do not carry over.
 *
 * Related: App.jsx useEffect(() => setToast(null), [currentPage])
 */

import { test, expect } from './fixtures/index.js';
import { loginAndPrepare, assertAppReady } from './helpers.js';

test.describe('Toast persistence on navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await assertAppReady(page, test);
  });

  /**
   * Toast selectors matching Toast.jsx:
   * - role="alert" for error toasts
   * - role="status" for success/info toasts
   * - .fixed.bottom-4.right-4 CSS classes on the toast container
   */
  const toastSelector = '[role="alert"], [role="status"]';
  const toastCssSelector = '.fixed.bottom-4.right-4';

  // Sidebar pages to navigate through
  const sidebarPages = [
    { name: 'Dashboard', label: 'Dashboard' },
    { name: 'Screens', label: 'Screens' },
    { name: 'Playlists', label: 'Playlists' },
    { name: 'Schedules', label: 'Schedules' },
    { name: 'Templates', label: 'Templates' },
    { name: 'Apps', label: 'Apps' },
    { name: 'Menu Boards', label: 'Menu Boards' },
    { name: 'Scenes', label: 'Scenes' },
    { name: 'Settings', label: 'Settings' },
    { name: 'Analytics', label: 'Analytics' },
  ];

  /**
   * Helper: get visible toast text, or null if no toast visible
   */
  async function getVisibleToastText(page) {
    const roleToasts = page.locator(toastSelector).filter({ hasText: /.+/ });
    const count = await roleToasts.count();
    if (count > 0) {
      const isVisible = await roleToasts.first().isVisible();
      if (isVisible) {
        return (await roleToasts.first().textContent())?.trim() || '[empty]';
      }
    }
    const cssToasts = page.locator(toastCssSelector);
    const cssCount = await cssToasts.count();
    if (cssCount > 0) {
      const isVisible = await cssToasts.first().isVisible();
      if (isVisible) {
        return (await cssToasts.first().textContent())?.trim() || '[empty]';
      }
    }
    return null;
  }

  test('toasts from previous page are dismissed on navigation', async ({ page }) => {
    const findings = [];
    let previousPageToast = null;
    let previousPageName = null;

    for (const { name, label } of sidebarPages) {
      const sidebarItem = page.locator('aside').getByText(label, { exact: false }).first();
      const count = await sidebarItem.count();

      if (count === 0) {
        findings.push({ page: name, status: 'SKIP', detail: 'Sidebar item not found (feature-gated)' });
        continue;
      }

      // Click sidebar item
      await sidebarItem.click();

      // Wait 300ms for page to render and any mount-effect toasts to fire
      await page.waitForTimeout(300);

      // Get current toast (if any)
      const currentToast = await getVisibleToastText(page);

      // BUG-07 check: if the previous page had a toast, and the current page
      // also shows a toast with the SAME text, that is a stale toast carried over.
      // If the current page shows a DIFFERENT toast, it is a new page-specific toast.
      if (previousPageToast && currentToast && currentToast === previousPageToast) {
        // Same toast text carried over from previous page -- this is the BUG-07 pattern
        await page.screenshot({
          path: `screenshots/66-stale-toast-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: false,
        });
        findings.push({
          page: name,
          status: 'FAIL',
          detail: `STALE toast from ${previousPageName}: "${currentToast}"`,
        });
      } else if (currentToast) {
        // Page generated its own toast (e.g., backend connection error) -- not a BUG-07 issue
        findings.push({
          page: name,
          status: 'WARN',
          detail: `Page-specific toast (not stale): "${currentToast}"`,
        });
      } else {
        findings.push({ page: name, status: 'PASS', detail: 'No toast visible' });
      }

      previousPageToast = currentToast;
      previousPageName = name;
    }

    // Log findings summary
    const failures = findings.filter(f => f.status === 'FAIL');
    const warnings = findings.filter(f => f.status === 'WARN');
    console.log('\n--- Toast Persistence Check (Normal Speed) ---');
    for (const f of findings) {
      console.log(`  [${f.status}] ${f.page}: ${f.detail}`);
    }
    if (warnings.length > 0) {
      console.log(`\n  NOTE: ${warnings.length} page(s) showed page-specific toasts (not stale). These are expected when backend is unavailable.`);
    }

    expect(failures, `Stale toasts carried over on: ${failures.map(f => f.page).join(', ')}`).toHaveLength(0);
  });

  test('no stale toasts persist during rapid-fire sidebar navigation', async ({ page }) => {
    // First, navigate to Screens (known to trigger a toast when backend is down)
    const screensItem = page.locator('aside').getByText('Screens', { exact: false }).first();
    const screensExists = await screensItem.count();
    if (screensExists > 0) {
      await screensItem.click();
      await page.waitForTimeout(300);
    }

    // Record the toast on Screens page (if any)
    const screensToast = await getVisibleToastText(page);

    // Rapid pass: click through 5 pages with only 100ms between clicks
    const rapidPages = ['Dashboard', 'Playlists', 'Templates', 'Settings', 'Apps'];
    const rapidFindings = [];

    for (const label of rapidPages) {
      const sidebarItem = page.locator('aside').getByText(label, { exact: false }).first();
      const count = await sidebarItem.count();

      if (count === 0) {
        rapidFindings.push({ page: label, status: 'SKIP', detail: 'Not found' });
        continue;
      }

      await sidebarItem.click();
      // Only 100ms between clicks for stress test
      await page.waitForTimeout(100);

      rapidFindings.push({ page: label, status: 'CLICKED', detail: 'Rapid click' });
    }

    // After rapid pass, wait 500ms and check for any remaining toast
    await page.waitForTimeout(500);

    const remainingToast = await getVisibleToastText(page);

    console.log('\n--- Toast Persistence Check (Rapid Fire) ---');
    console.log(`  Pages clicked: Screens -> ${rapidPages.join(' -> ')}`);
    console.log(`  Screens toast: ${screensToast || 'none'}`);
    console.log(`  Remaining toast: ${remainingToast || 'none'}`);

    // If a toast remains AND it matches the Screens toast, that is stale
    if (remainingToast && screensToast && remainingToast === screensToast) {
      await page.screenshot({
        path: 'screenshots/66-stale-toast-rapid-fire.png',
        fullPage: false,
      });
      expect(false, `Stale toast from Screens persisted after rapid navigation: "${remainingToast}"`).toBeTruthy();
    }

    // Log results
    for (const f of rapidFindings) {
      console.log(`  [${f.status}] ${f.page}: ${f.detail}`);
    }

    // If there IS a remaining toast but it is different from Screens, it is from the last page (Apps)
    if (remainingToast && remainingToast !== screensToast) {
      console.log(`  NOTE: Toast "${remainingToast}" is from the current page, not stale.`);
    }
  });
});
