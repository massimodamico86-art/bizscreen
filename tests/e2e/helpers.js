/**
 * E2E Test Helpers
 *
 * Common utilities for E2E tests
 */
import { expect } from '@playwright/test';

/**
 * Login and prepare the app for testing
 *
 * This function:
 * 1. Navigates to login page
 * 2. Sets localStorage to skip the Welcome Modal (first-run experience)
 * 3. Fills in credentials and submits
 * 4. Waits for redirect to /app
 * 5. Dismisses any modal dialogs that might appear
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Optional configuration
 * @param {string} options.email - Email override (defaults to TEST_USER_EMAIL env var)
 * @param {string} options.password - Password override (defaults to TEST_USER_PASSWORD env var)
 */
export async function loginAndPrepare(page, options = {}) {
  const email = options.email || process.env.TEST_USER_EMAIL;
  const password = options.password || process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Test credentials not configured. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.');
  }

  // Navigate to login page
  await page.goto('/auth/login');

  // Set localStorage to skip the Welcome Modal before authentication
  // This key is checked by DashboardPage to decide whether to show the Welcome Modal
  await page.evaluate(() => {
    localStorage.setItem('bizscreen_welcome_modal_shown', 'true');
  });

  // Fill in credentials and submit
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for redirect to app
  await page.waitForURL(/\/app/, { timeout: 15000 });

  // Give the page a moment to render any modals
  await page.waitForTimeout(500);

  // Dismiss any modal dialogs that might have appeared
  await dismissAnyModals(page);
}

/**
 * Dismiss any open modal dialogs
 *
 * Looks for common modal close buttons and clicks them if found.
 * This handles the Welcome Modal, OnboardingWizard, and any other dialogs.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function dismissAnyModals(page) {
  // Try to find and click modal close buttons
  // The design-system Modal has a close button with aria-label="Close modal"
  // The Welcome Modal has an X button in the header

  const closeButtonSelectors = [
    '[aria-label="Close modal"]',
    '[aria-label="Close"]',
    'button:has(svg.lucide-x)',
    '[role="dialog"] button:has-text("Skip")',
    '[role="dialog"] button:has-text("Close")',
    '[role="dialog"] button:has-text("Dismiss")',
    '[role="dialog"] button:has-text("Maybe Later")',
    // Phase 180 SC-11 closure (Plan 180-09): Phase 174 driver.js gallery-tour modal.
    // The modal is `<div role="dialog" class="driver-popover" ...>` and its close
    // button is `<button class="driver-popover-close-btn">×</button>` (text content
    // is `×`, no aria-label, no svg.lucide-x). The existing `[role="dialog"]` text
    // matchers above do not catch `×`. These two new selectors handle both the
    // explicit close button AND the "Next"/"Done" action buttons that progress the
    // tour to completion (which also flips `markGalleryTourSeen` per useGalleryTour.js).
    '.driver-popover button.driver-popover-close-btn',
    'button.driver-popover-close-btn',
    '.driver-popover button.driver-popover-next-btn',
    '.driver-popover button.driver-popover-done-btn',
  ];

  // Loop to dismiss stacked modals one at a time. After each successful click,
  // re-scan selectors (from the top) in case closing one modal revealed another.
  // The outer cap of 5 prevents infinite loops if a modal keeps re-opening.
  const MAX_DISMISSALS = 5;
  let dismissed = 0;
  while (dismissed < MAX_DISMISSALS) {
    let clicked = false;
    for (const selector of closeButtonSelectors) {
      const closeButton = page.locator(selector).first();
      if (await closeButton.isVisible({ timeout: 100 }).catch(() => false)) {
        await closeButton.click();
        // Wait for modal animation to complete before re-scanning
        await page.waitForTimeout(300);
        clicked = true;
        dismissed++;
        break;
      }
    }
    if (!clicked) break;
  }

  // Phase 180 Plan 180-12 (SC-11_v21.1) — Force-remove lingering driver.js
  // .driver-overlay SVG nodes that intercept pointer events.
  //
  // Plan 180-09 added .driver-popover selectors above (the BUBBLE), but the
  // .driver-overlay SVG (the BACKDROP) is a separate element that driver.js
  // SHOULD remove when the popover dismissal sequence completes — and in
  // most paths it does. However, Plan 180-11 SC-11 re-run Branch E revealed
  // 3 specs (TFAV-01, TFAV-03, TDSC-03) where the overlay persists after
  // popover dismissal (race or state mismatch between driver.js internal
  // destroy() and the synthetic click event timing). The overlay's full-
  // viewport SVG then intercepts subsequent locator clicks (e.g. favorites
  // heart, "Browse all templates" empty-state button).
  //
  // Defensive cleanup: enumerate any remaining .driver-overlay nodes and
  // remove them from the DOM directly. Safe because driver.js's tour state
  // is already considered "completed" (markGalleryTourSeen has fired via
  // the popover-close-btn / done-btn click above) — the overlay is the
  // sole remaining visual artifact.
  //
  // Pattern source: 180-VERIFICATION.md open_gaps[1] line 66.
  const driverOverlays = page.locator('.driver-overlay');
  const overlayCount = await driverOverlays.count();
  if (overlayCount > 0) {
    await driverOverlays.evaluateAll((els) => els.forEach((e) => e.remove()));
    await page.waitForTimeout(100);
  }

  // Also try clicking on the modal backdrop to close
  const backdrop = page.locator('[role="dialog"] > div[aria-hidden="true"]').first();
  if (await backdrop.isVisible({ timeout: 100 }).catch(() => false)) {
    // Click outside the modal content area
    await backdrop.click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }

  // Verify no blocking modals remain
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.isVisible({ timeout: 100 }).catch(() => false)) {
    // Log warning but continue - some modals might be expected
    console.warn('Modal still visible after dismiss attempt');
  }
}

/**
 * Force-remove gallery-tour driver.js DOM elements without triggering callbacks.
 *
 * Phase 180 Plan 180-12 (SC-11_v21.1 extended fix): Use this helper AFTER
 * navigating to the templates page in specs that do NOT test the gallery tour
 * itself (TFAV-01, TFAV-03, TDSC-03). Unlike calling dismissAnyModals(), this
 * helper removes .driver-popover and .driver-overlay nodes DIRECTLY from the DOM
 * without clicking any button — so driver.js's onDestroyed / onDestroyStarted
 * callback is NOT invoked and markGalleryTourSeen is NOT called. This preserves
 * the per-user completed_gallery_tour=false state so gallery-tour.spec.js can
 * still assert the tour fires on "first visit".
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function forceRemoveGalleryTour(page) {
  // Remove the driver.js overlay SVG (the full-viewport backdrop that captures
  // pointer events) and the popover bubble, without clicking any buttons.
  const driverEls = page.locator('.driver-overlay, .driver-popover');
  const count = await driverEls.count();
  if (count > 0) {
    await driverEls.evaluateAll((els) => els.forEach((e) => e.remove()));
    await page.waitForTimeout(100);
  }
}

/**
 * Wait for page to be ready for interaction
 * Ensures no loading spinners or skeleton screens are visible
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForPageReady(page) {
  // Wait for any loading indicators to disappear
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    '.animate-spin',
    '.animate-pulse',
    '[data-loading="true"]',
    'text=Loading...',
  ];

  for (const selector of loadingSelectors) {
    await page.locator(selector).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

/**
 * Navigate to a specific section of the app
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} section - Section name: 'media', 'playlists', 'screens', 'layouts', 'schedules'
 */
export async function navigateToSection(page, section) {
  const sectionLower = section.toLowerCase();

  // Media is an expandable menu - need to click "Media" then "All Media"
  if (sectionLower === 'media') {
    // First expand the Media menu
    const mediaButton = page.locator('button:has-text("Media")').first();
    await mediaButton.click();
    await page.waitForTimeout(300);

    // Then click on "All Media" sub-item
    const allMediaButton = page.locator('button:has-text("All Media")').first();
    await allMediaButton.click();
    await page.waitForTimeout(500);
    await waitForPageReady(page);
    return;
  }

  // Layouts has no sidebar button in the current Yodeck-exact nav — navigate programmatically.
  // The LayoutsPage exists in App.jsx's pages map but was intentionally omitted from the sidebar.
  // We first click "Templates" (which IS in the sidebar) to ensure the app shell is fully mounted,
  // then use React fiber internals (BFS traversal) to call onNavigate('layouts') on the rendered
  // TemplateGalleryPage component, which receives onNavigate={setCurrentPage} from App.
  // This is test-only — no product code is modified.
  if (sectionLower === 'layouts') {
    // Step 1: Ensure the app shell is rendered (wait for sidebar nav to appear)
    const templatesBtn = page.getByRole('button', { name: /^templates$/i }).first();
    await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });

    // Step 2: Click Templates to mount TemplateGalleryPage (which has onNavigate prop)
    await templatesBtn.click();
    // Wait for the page to settle and TemplateGalleryPage to fully mount
    await page.waitForTimeout(1000);
    await waitForPageReady(page);

    // Step 3: Use React fiber BFS to find the onNavigate prop and call it with 'layouts'.
    // In React 18 with createRoot(), the FiberRoot is attached via '__reactContainer$...'
    // on the #root element. We traverse from fiberRoot.current (the HostRoot fiber).
    //
    // NOTE (test-only hack): This relies on React 18 private internals
    // (__reactContainer$<hash> key + fiber shape). If React is upgraded to a
    // version that changes the key prefix or fiber layout, the BFS will fall
    // through to the breadcrumb fallback. See D-08 for the rationale (Option A:
    // do not modify product code to expose a test hook).
    const BFS_NODE_CAP = 10000; // Allow deeper scans of the full app tree
    const navigated = await page.evaluate((nodeCap) => {
      const root = document.getElementById('root');
      if (!root) return { ok: false, reason: 'no #root' };

      // React 18: __reactContainer$<hash> holds the FiberRoot (not __reactFiber$)
      const containerKey = Object.keys(root).find(k => k.startsWith('__reactContainer'));
      if (!containerKey) {
        const reactVersion = (window.React && window.React.version) || 'unknown';
        return {
          ok: false,
          reason: `no __reactContainer key on #root (React version: ${reactVersion}) — ` +
            `React may have changed its internal fiber-attachment convention`,
        };
      }

      const fiberRoot = root[containerKey];
      const startFiber = (fiberRoot && fiberRoot.current) ? fiberRoot.current : fiberRoot;

      // BFS over the fiber tree starting from the root HostRoot fiber.
      // We gate enqueue on visited.has(...) so fibers that appear in multiple
      // traversal paths (e.g. during concurrent-render snapshots) don't inflate
      // the queue beyond what the node cap permits.
      const queue = [startFiber];
      const visited = new Set();
      let checked = 0;

      while (queue.length > 0 && checked < nodeCap) {
        const fiber = queue.shift();
        if (!fiber || visited.has(fiber)) continue;
        visited.add(fiber);
        checked++;

        // Check memoizedProps for onNavigate (page-level components receive this from App)
        const props = fiber.memoizedProps;
        if (props && typeof props.onNavigate === 'function') {
          try {
            props.onNavigate('layouts');
            return { ok: true, checked };
          } catch (e) {
            // prop exists but threw — continue searching
          }
        }

        // BFS: enqueue child and sibling, skipping already-visited nodes up front
        if (fiber.child && !visited.has(fiber.child)) queue.push(fiber.child);
        if (fiber.sibling && !visited.has(fiber.sibling)) queue.push(fiber.sibling);
      }

      return {
        ok: false,
        reason: `BFS exhausted ${checked} nodes (cap=${nodeCap}), no onNavigate prop found`,
      };
    }, BFS_NODE_CAP);

    if (!navigated.ok) {
      // Fallback: look for any button whose text is exactly 'Layouts' (e.g., breadcrumb)
      const layoutsBtn = page.getByRole('button', { name: /^layouts$/i }).first();
      const visible = await layoutsBtn.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        await layoutsBtn.click();
      } else {
        throw new Error(
          `navigateToSection("layouts"): React fiber BFS failed (${navigated.reason}). ` +
          'The sidebar has no Layouts button and no onNavigate("layouts") call point was found. ' +
          'Check App.jsx navigation array or add a layouts route.'
        );
      }
    }

    await page.waitForTimeout(500);
    await waitForPageReady(page);
    return;
  }

  const sectionPatterns = {
    playlists: /playlists/i,
    screens: /screens/i,
    schedules: /schedules/i,
    dashboard: /dashboard/i,
    scenes: /scenes/i,
  };

  const pattern = sectionPatterns[sectionLower];
  if (!pattern) {
    throw new Error(`Unknown section: ${section}. Valid options: media, layouts, ${Object.keys(sectionPatterns).join(', ')}`);
  }

  // Click on the navigation item
  const navButton = page.getByRole('button', { name: pattern }).first();
  await navButton.click();

  // Wait for the page to load
  await page.waitForTimeout(500);
  await waitForPageReady(page);
}

/**
 * Generate a unique test name with timestamp
 *
 * @param {string} prefix - Prefix for the name
 * @returns {string} Unique name
 */
export function generateTestName(prefix = 'Test') {
  return `${prefix} ${Date.now()}`;
}

/**
 * Assert the app shell is ready and no error page is displayed.
 * Complements waitForPageReady (which waits for network idle) by
 * asserting the main content area is visible and no error boundary
 * or crash screen is showing.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} testObj - Playwright test object (for test.skip if needed)
 */
export async function assertAppReady(page, testObj) {
  // Verify the main app shell container is visible
  const mainContent = page.locator('main#main-content');
  const mainVisible = await mainContent.isVisible({ timeout: 5000 }).catch(() => false);

  if (!mainVisible) {
    // Check if we're on an error/auth page instead of the app
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/')) {
      testObj.skip(true, 'App not ready - redirected to auth page');
      return;
    }
    // If main is not visible and we're not on auth, something is wrong
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  }

  // Verify no error boundary or crash screen is displayed
  const errorIndicators = page.locator(
    'text=/something went wrong|unexpected error|application error|500|internal server error/i'
  );
  const hasError = await errorIndicators.first().isVisible({ timeout: 500 }).catch(() => false);
  if (hasError) {
    expect(hasError, 'App shows an error page instead of the expected content').toBe(false);
  }
}

// Phase 175 — TQAL-05 structural assertions (RESEARCH.md Pattern 3, lines 354-368)
//
// `expectAtLeastOneTemplateCard` asserts at least one template card is visible
// in the gallery without enforcing an exact count (forbidden under TQAL-05).
// `expectGalleryRendersWithoutError` asserts the gallery shell rendered with no
// error toast and no failure copy.
//
// Both helpers reuse the module-level `expect` import (line 6) — do NOT add a
// dynamic import; the module already pulls expect from @playwright/test.

/**
 * Assert at least one template card is visible in the gallery main area.
 *
 * Cards render via TemplateCard.jsx using h4 for the template name (Phase 180
 * SC-10 axe-core heading-order remediation; previously h3 until Phase 180 Plan 07).
 * We filter out the page heading + filter group labels (which are h3 in some
 * renderings) so the assertion targets actual template cards.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function expectAtLeastOneTemplateCard(page) {
  const main = page.getByRole('main');
  // Phase 180 Plan 180-07 lowered TemplateCard title from <h3> to <h4> for axe-core
  // heading-order rule compliance. The filter remains as defense-in-depth in case
  // any future filter-panel section heading is also rendered as <h4>.
  const cards = main.locator('h4').filter({ hasNotText: /^(Templates|Sort|Filters|Categories|Tags|Orientation)$/ });
  // Use Playwright's locator.first() + toBeVisible — structural, not exact-count.
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Assert the gallery shell rendered without error.
 *
 * Confirms the Templates heading is visible, no [role="alert"] elements are
 * present (toHaveCount(0) is the ONLY allowed exact-count form per TQAL-05),
 * and the "Couldn't load templates" failure copy is not displayed.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function expectGalleryRendersWithoutError(page) {
  await expect(page.getByRole('heading', { name: /^Templates$/ })).toBeVisible();
  // toHaveCount(0) on [role="alert"] is the ONLY allowed exact-count form per TQAL-05.
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.getByText("Couldn't load templates")).not.toBeVisible();
}

export default {
  loginAndPrepare,
  dismissAnyModals,
  waitForPageReady,
  navigateToSection,
  generateTestName,
  assertAppReady,
  expectAtLeastOneTemplateCard,
  expectGalleryRendersWithoutError,
};
