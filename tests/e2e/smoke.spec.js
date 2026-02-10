/**
 * Production Smoke Tests
 *
 * Fast, critical-path tests that verify the application is healthy.
 * These tests should:
 * - Run quickly (< 60 seconds total)
 * - Cover essential user flows
 * - Fail fast on critical issues
 * - Be run before and after deployments
 * - ALWAYS fail on pageerror (uncaught exceptions)
 * - Crawl pages, open modals, click primary buttons
 * - Specifically track and fail on ReferenceErrors
 *
 * Skip if TEST_USER_EMAIL is not configured.
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

/**
 * Helper to set up pageerror and console error capture
 * All smoke tests should use this to ensure we catch crashes
 * Specifically tracks ReferenceErrors separately for targeted reporting
 */
function setupErrorCapture(page) {
  const errors = {
    pageErrors: [],
    consoleErrors: [],
    referenceErrors: [], // Track ReferenceErrors specifically
  };

  // CRITICAL: Capture pageerror events (uncaught exceptions)
  // These should ALWAYS cause test failure
  page.on('pageerror', (err) => {
    const errorInfo = {
      message: err.message,
      stack: err.stack,
      name: err.name,
      url: page.url(),
    };
    errors.pageErrors.push(errorInfo);
    console.error('[PAGEERROR]', err.message);

    // Track ReferenceErrors specifically
    if (err.name === 'ReferenceError' || err.message.includes('is not defined')) {
      errors.referenceErrors.push(errorInfo);
      console.error('[REFERENCEERROR]', err.message);
    }
  });

  // Capture console errors for additional context
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known benign errors
      if (
        !text.includes('favicon') &&
        !text.includes('manifest') &&
        !text.includes('Failed to load resource') &&
        !text.includes('400') &&
        !text.includes('404') &&
        !text.includes('net::')
      ) {
        errors.consoleErrors.push(text);

        // Also check console errors for ReferenceError patterns
        if (text.includes('ReferenceError') || text.includes('is not defined')) {
          errors.referenceErrors.push({
            message: text,
            url: page.url(),
            source: 'console',
          });
          console.error('[REFERENCEERROR in console]', text);
        }
      }
    }
  });

  return errors;
}

/**
 * Assert no critical errors occurred
 * Call this at the end of tests that use setupErrorCapture
 */
function assertNoPageErrors(errors, context = '') {
  // First check for ReferenceErrors specifically (higher priority)
  if (errors.referenceErrors.length > 0) {
    const errorMessages = errors.referenceErrors
      .map((e) => `${e.name || 'ReferenceError'}: ${e.message} (at ${e.url})`)
      .join('\n');
    throw new Error(
      `ReferenceError(s) detected${context ? ` (${context})` : ''}:\n${errorMessages}\n\nThis indicates missing imports or undefined variables.`
    );
  }

  if (errors.pageErrors.length > 0) {
    const errorMessages = errors.pageErrors.map((e) => `${e.name}: ${e.message}`).join('\n');
    throw new Error(`Page error(s) occurred${context ? ` (${context})` : ''}:\n${errorMessages}`);
  }
}

/**
 * Try to open any modals on the page by clicking modal trigger buttons
 * Looks for common patterns: "Add", "Create", "New", buttons with modal-related attributes
 */
async function tryOpenModals(page) {
  const modalTriggerSelectors = [
    'button:has-text("Add")',
    'button:has-text("Create")',
    'button:has-text("New")',
    'button[data-modal]',
    'button[data-opens-modal]',
    '[data-testid*="add"]',
    '[data-testid*="create"]',
    '[data-testid*="new"]',
  ];

  // Helper to detect if any modal/dialog/overlay is open
  const isAnyModalOpen = async () => {
    const modalSelectors = [
      '[role="dialog"]',
      '[data-radix-dialog-content]',
      '.modal',
      // Tailwind-style fixed overlay with backdrop
      '.fixed.inset-0.z-50',
      '.fixed.inset-0[class*="bg-black"]',
    ];
    for (const sel of modalSelectors) {
      const el = page.locator(sel);
      if (await el.isVisible({ timeout: 100 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  };

  for (const selector of modalTriggerSelectors) {
    try {
      const button = page.locator(selector).first();
      const buttonCount = await button.count();
      if (buttonCount > 0 && (await button.isVisible())) {
        // Check if button is enabled
        const isDisabled = await button.isDisabled();
        if (!isDisabled) {
          console.log(`[MODAL] Clicking trigger: ${selector}`);
          await button.click();

          // Wait for modal to appear using element-based wait
          const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]').first();
          const dialogAppeared = await dialog
            .waitFor({ state: 'visible', timeout: 2000 })
            .then(() => true)
            .catch(() => false);

          // Check if a modal opened using our improved detection
          if (dialogAppeared || (await isAnyModalOpen())) {
            console.log('[MODAL] Modal opened successfully');

            // Close the modal
            await closeModal(page);

            // Verify modal is closed using element wait
            if (await isAnyModalOpen()) {
              console.warn('[MODAL] Modal still open after close attempt, forcing close');
              // Force close by pressing Escape multiple times
              for (let i = 0; i < 5; i++) {
                await page.keyboard.press('Escape');
                // Wait for dialog to close
                const closed = await dialog
                  .waitFor({ state: 'hidden', timeout: 500 })
                  .then(() => true)
                  .catch(() => false);
                if (closed || !(await isAnyModalOpen())) break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(`[MODAL] Error with selector ${selector}: ${err.message}`);
      // Try to close any open modal before continuing
      try {
        await page.keyboard.press('Escape');
        // Wait for any dialog to close
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Close any open modal - tries multiple strategies and verifies modal is closed
 */
async function closeModal(page) {
  // Helper to check if any modal/overlay is visible
  const isModalOpen = async () => {
    // Check for various modal patterns - be more specific about the overlay
    const overlaySelectors = [
      '[role="dialog"]',
      '[data-radix-dialog-content]',
      '.modal',
      // Tailwind pattern: fixed inset-0 with black bg and opacity
      '.fixed.inset-0[class*="bg-black"]',
      '.fixed.inset-0.bg-black\\/50', // Escaped slash for bg-black/50
    ];
    for (const sel of overlaySelectors) {
      const el = page.locator(sel);
      if (await el.isVisible({ timeout: 100 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  };

  const closeSelectors = [
    // Most reliable: Cancel button in modal (visible text)
    'button:has-text("Cancel")',
    // X button patterns
    '[aria-label="Close modal"]',
    '[aria-label="Close"]',
    'button:has(svg.lucide-x)',
    'button:has(svg[class*="lucide-x"])',
    // Generic close patterns
    '[role="dialog"] button:has-text("Close")',
    '.modal-close',
    '[data-dismiss="modal"]',
    'button[type="button"]:has-text("X")',
    // SVG X icon
    'button svg.w-5.h-5', // Common size for close icons
  ];

  // Get reference to dialog for waiting
  const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]').first();

  // Try each close selector
  for (const selector of closeSelectors) {
    try {
      const closeButton = page.locator(selector).first();
      const buttonCount = await closeButton.count();
      if (buttonCount > 0 && (await closeButton.isVisible())) {
        console.log(`[MODAL] Closing with: ${selector}`);
        await closeButton.click({ force: true }); // Force click in case of overlay issues

        // Wait for modal to close
        const closed = await dialog
          .waitFor({ state: 'hidden', timeout: 2000 })
          .then(() => true)
          .catch(() => false);

        // Verify modal is closed
        if (closed || !(await isModalOpen())) {
          console.log('[MODAL] Successfully closed');
          return;
        }
      }
    } catch (err) {
      // Continue to next selector
      console.log(`[MODAL] Selector ${selector} failed: ${err.message}`);
    }
  }

  // Try pressing Escape multiple times as fallback
  console.log('[MODAL] Trying Escape key fallback');
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    // Wait for dialog to close
    const closed = await dialog
      .waitFor({ state: 'hidden', timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    if (closed || !(await isModalOpen())) {
      console.log('[MODAL] Closed via Escape key');
      return;
    }
  }

  // Final attempt: click outside the modal dialog on the backdrop
  try {
    // Find the backdrop element and click near the edge
    const backdrop = page.locator('.fixed.inset-0').first();
    const backdropCount = await backdrop.count();
    if (backdropCount > 0 && (await backdrop.isVisible())) {
      console.log('[MODAL] Clicking backdrop to close');
      await backdrop.click({ position: { x: 5, y: 5 }, force: true });
      // Wait for dialog to close
      await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }
  } catch {
    // Ignore
  }

  // Log warning if modal is still open
  if (await isModalOpen()) {
    console.warn('[MODAL] WARNING: Modal may still be open after close attempts');
  }
}

/**
 * Click primary action buttons on the page (but not destructive ones)
 * Looks for primary-styled buttons, buttons with key action words
 */
async function tryClickPrimaryButtons(page) {
  const primaryButtonSelectors = [
    'button.btn-primary',
    'button[class*="primary"]',
    'button[class*="Primary"]',
    '[data-testid*="primary"]',
    // Common action buttons (non-destructive)
    'button:has-text("View")',
    'button:has-text("Edit")',
    'button:has-text("Details")',
    'button:has-text("Open")',
    'button:has-text("Expand")',
  ];

  // Avoid these destructive actions
  const avoidPatterns = ['delete', 'remove', 'archive', 'disable', 'logout', 'sign out'];

  for (const selector of primaryButtonSelectors) {
    try {
      const buttons = page.locator(selector);
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 2); i++) {
        // Limit to 2 buttons per selector
        const button = buttons.nth(i);
        const buttonVisible = await button.isVisible();
        if (buttonVisible) {
          const buttonText = (await button.textContent()) || '';
          const buttonTextLower = buttonText.toLowerCase();

          // Skip destructive actions
          if (avoidPatterns.some((pattern) => buttonTextLower.includes(pattern))) {
            continue;
          }

          // Skip if disabled
          const isDisabled = await button.isDisabled();
          if (isDisabled) continue;

          console.log(`[BUTTON] Clicking: "${buttonText.trim()}" (${selector})`);
          await button.click();

          // Wait for page to stabilize after click
          await page.waitForLoadState('domcontentloaded');

          // Let any errors register, then go back if we navigated
          const currentUrl = page.url();
          if (!currentUrl.includes('/app')) {
            await page.goBack().catch(() => {});
            await page.waitForLoadState('domcontentloaded');
          }
        }
      }
    } catch {
      // Continue to next selector if this one fails
    }
  }
}

test.describe('Production Smoke Tests', () => {
  // Skip if user credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.describe('Application Health', () => {
    // These tests need fresh context (no pre-auth) to test the login page
    test.use({ storageState: { cookies: [], origins: [] } });

    test('app loads without fatal errors', async ({ page }) => {
      const errors = setupErrorCapture(page);

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('domcontentloaded');

      // Verify page loaded (no error boundary triggered)
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify login form is present
      await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'login page load');
    });

    test('static assets load correctly', async ({ page }) => {
      const errors = setupErrorCapture(page);

      await page.goto('/auth/login');

      // Check that CSS has loaded (page should have styled elements)
      const loginButton = page.getByRole('button', { name: /sign in|log in/i });
      await expect(loginButton).toBeVisible({ timeout: 10000 });

      // Verify button has styling (not unstyled HTML)
      const styles = await loginButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          padding: computed.padding,
        };
      });

      // Should have some background color (not transparent/default)
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'static assets');
    });
  });

  test.describe('Authentication Flow', () => {
    // These tests need fresh context to test actual login
    test.use({ storageState: { cookies: [], origins: [] } });

    // Only run login test on client project since it uses client credentials
    test('can complete login successfully', async ({ page }, testInfo) => {
      // SKIP REASON: Login credentials are for client project only -- admin/superadmin projects use different auth
      if (testInfo.project.name !== 'chromium') {
        test.skip();
        return;
      }
      const errors = setupErrorCapture(page);

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      // Verify we're in the app
      await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

      // Verify main content area is present
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'login flow');
    });

    test('auth resolves within reasonable time', async ({ page }) => {
      const errors = setupErrorCapture(page);

      // Navigate to app route (requires auth)
      const startTime = Date.now();
      await page.goto('/app');

      // Auth should resolve (either redirect to login or show app) within 15 seconds
      // This catches infinite loading states
      await Promise.race([
        page.waitForURL(/\/(app|auth\/login)/, { timeout: 15000 }),
        page.waitForSelector('main', { timeout: 15000 }),
      ]);

      const elapsed = Date.now() - startTime;
      console.log(`Auth resolved in ${elapsed}ms`);

      // Should not take more than 15 seconds
      expect(elapsed).toBeLessThan(15000);

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'auth resolution');
    });
  });

  test.describe('Core Pages Load', () => {
    // Only run on chromium (client) project
    test.beforeEach(async ({}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    });

    test('dashboard loads after login', async ({ page }) => {
      const errors = setupErrorCapture(page);

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      // Dashboard should load after login
      await waitForPageReady(page);

      // Should not show error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Should show main content area (main for clients, div container for admin dashboards)
      // Different roles have different dashboard layouts
      const contentArea = page.locator('main, [class*="Dashboard"], h1');
      await expect(contentArea.first()).toBeVisible({ timeout: 5000 });

      // Verify page has meaningful content (not blank)
      const hasContent = await page.evaluate(() => {
        const body = document.body;
        return body && body.innerText.length > 100;
      });
      expect(hasContent).toBe(true);

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'dashboard load');
    });

    test('navigation works after dashboard loads', async ({ page }) => {
      const errors = setupErrorCapture(page);

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Try clicking a nav item - different items for different roles
      // Clients have Media/Screens, admins have different navigation
      const navItem = page
        .locator('button:has-text("Media"), button:has-text("Screens"), button:has-text("Tenant Management")')
        .first();
      const navItemCount = await navItem.count();
      if (navItemCount > 0 && (await navItem.isVisible())) {
        await navItem.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify page changed - look for any content container
        const contentArea = page.locator('main, [class*="Dashboard"], h1, h2');
        await expect(contentArea.first()).toBeVisible({ timeout: 5000 });
      }

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'navigation');
    });
  });

  test.describe('Error Handling', () => {
    // Only run on chromium (client) project
    test.beforeEach(async ({}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    });

    test('no JavaScript errors in console on dashboard', async ({ page }) => {
      const errors = setupErrorCapture(page);

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      // Wait for dashboard to fully load
      await waitForPageReady(page);

      // Wait for main content to be visible (ensures page is stable)
      const mainContent = page.locator('main, [class*="Dashboard"], h1');
      await expect(mainContent.first()).toBeVisible({ timeout: 10000 });

      // Should have no critical JS errors
      const criticalErrors = errors.consoleErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') && // Known benign
          !e.includes('Non-Error') // Known benign
      );

      expect(criticalErrors).toHaveLength(0);

      // CRITICAL: Fail on any pageerror
      assertNoPageErrors(errors, 'dashboard console');
    });
  });

  test.describe('Page Crawl with Modal and Button Interactions', () => {
    // Only run on chromium (client) project
    test.beforeEach(async ({}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    });

    // Increase timeout for crawl test
    test.setTimeout(120000);

    test('crawl app pages, open modals, click buttons, detect ReferenceErrors', async ({ page }) => {
      const errors = setupErrorCapture(page);
      const visitedPages = [];
      const pagesWithErrors = [];

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Define pages to crawl based on common app routes
      // These are navigation targets found in the sidebar
      const navTargets = [
        { name: 'Dashboard', selector: 'button:has-text("Dashboard")' },
        { name: 'Media', selector: 'button:has-text("Media")' },
        { name: 'Playlists', selector: 'button:has-text("Playlists")' },
        { name: 'Screens', selector: 'button:has-text("Screens")' },
        { name: 'Layouts', selector: 'button:has-text("Layouts")' },
        { name: 'Schedules', selector: 'button:has-text("Schedules")' },
        { name: 'Scenes', selector: 'button:has-text("Scenes")' },
        { name: 'Templates', selector: 'button:has-text("Templates")' },
        { name: 'Settings', selector: 'button:has-text("Settings")' },
      ];

      for (const target of navTargets) {
        const errorsBefore = errors.referenceErrors.length;

        try {
          console.log(`\n[CRAWL] Navigating to: ${target.name}`);
          const navButton = page.locator(target.selector).first();

          const navButtonCount = await navButton.count();
          if (navButtonCount > 0 && (await navButton.isVisible())) {
            await navButton.click();
            await page.waitForLoadState('domcontentloaded');
            await waitForPageReady(page);

            const currentUrl = page.url();
            visitedPages.push({ name: target.name, url: currentUrl });
            console.log(`[CRAWL] Loaded: ${currentUrl}`);

            // Verify no error boundary
            const hasErrorBoundary = await page
              .locator('body')
              .evaluate((body) => body.innerText.includes('Something Went Wrong'));
            if (hasErrorBoundary) {
              console.error(`[CRAWL] Error boundary triggered on ${target.name}`);
              pagesWithErrors.push({ name: target.name, error: 'Error boundary triggered' });
              continue;
            }

            // Try opening modals on this page
            console.log(`[CRAWL] Testing modals on ${target.name}`);
            await tryOpenModals(page);

            // Try clicking primary buttons
            console.log(`[CRAWL] Testing primary buttons on ${target.name}`);
            await tryClickPrimaryButtons(page);

            // Check if new errors occurred on this page
            if (errors.referenceErrors.length > errorsBefore) {
              const newErrors = errors.referenceErrors.slice(errorsBefore);
              pagesWithErrors.push({
                name: target.name,
                errors: newErrors.map((e) => e.message),
              });
            }
          } else {
            console.log(`[CRAWL] Skipping ${target.name} - nav button not visible`);
          }
        } catch (err) {
          console.error(`[CRAWL] Error on ${target.name}:`, err.message);
          pagesWithErrors.push({ name: target.name, error: err.message });
        }
      }

      // Summary
      console.log('\n========== CRAWL SUMMARY ==========');
      console.log(`Pages visited: ${visitedPages.length}`);
      visitedPages.forEach((p) => console.log(`  - ${p.name}: ${p.url}`));

      if (pagesWithErrors.length > 0) {
        console.log(`\nPages with errors: ${pagesWithErrors.length}`);
        pagesWithErrors.forEach((p) => {
          console.log(`  - ${p.name}: ${p.error || p.errors?.join(', ')}`);
        });
      }

      console.log(`\nTotal ReferenceErrors: ${errors.referenceErrors.length}`);
      console.log(`Total PageErrors: ${errors.pageErrors.length}`);
      console.log(`Total ConsoleErrors: ${errors.consoleErrors.length}`);
      console.log('====================================\n');

      // CRITICAL: Fail on ReferenceErrors with detailed summary
      if (errors.referenceErrors.length > 0) {
        const errorSummary = errors.referenceErrors
          .map((e, i) => `${i + 1}. ${e.name || 'ReferenceError'}: ${e.message}\n   URL: ${e.url}`)
          .join('\n\n');
        throw new Error(
          `CRAWL FAILED: ${errors.referenceErrors.length} ReferenceError(s) detected:\n\n${errorSummary}\n\nThese indicate missing imports or undefined variables that need to be fixed.`
        );
      }

      // Also fail on other page errors
      assertNoPageErrors(errors, 'page crawl');
    });
  });
});
