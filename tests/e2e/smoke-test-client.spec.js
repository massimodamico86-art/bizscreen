/**
 * Client Smoke Test
 *
 * Smoke test from a client perspective to verify:
 * 1. Marketing pages load correctly (Home, Features, Pricing)
 * 2. Login flow works
 * 3. Dashboard loads after authentication
 * 4. Crawl pages, open modals, click primary buttons
 * 5. Detect and fail on ReferenceErrors
 *
 * This test verifies recent import fixes (quick tasks 019, 020) work correctly.
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

/**
 * Enhanced error capture that specifically tracks ReferenceErrors
 */
function setupEnhancedErrorCapture(page) {
  const errors = {
    pageErrors: [],
    consoleErrors: [],
    referenceErrors: [], // Track ReferenceErrors specifically
  };

  // Capture pageerror events (uncaught exceptions)
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

  // Capture console errors
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
 * Assert no ReferenceErrors or page errors occurred
 */
function assertNoErrors(errors, context = '') {
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
 */
async function tryOpenModals(page) {
  const modalTriggerSelectors = [
    'button:has-text("Add")',
    'button:has-text("Create")',
    'button:has-text("New")',
    'button[data-modal]',
    '[data-testid*="add"]',
    '[data-testid*="create"]',
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

          // Check if a modal opened using improved detection
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
 * Click primary action buttons on the page (non-destructive only)
 */
async function tryClickPrimaryButtons(page) {
  const primaryButtonSelectors = [
    'button.btn-primary',
    'button[class*="primary"]',
    'button:has-text("View")',
    'button:has-text("Edit")',
    'button:has-text("Details")',
  ];

  const avoidPatterns = ['delete', 'remove', 'archive', 'disable', 'logout', 'sign out'];

  for (const selector of primaryButtonSelectors) {
    try {
      const buttons = page.locator(selector);
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 2); i++) {
        const button = buttons.nth(i);
        const buttonVisible = await button.isVisible();
        if (buttonVisible) {
          const buttonText = (await button.textContent()) || '';
          const buttonTextLower = buttonText.toLowerCase();

          if (avoidPatterns.some((pattern) => buttonTextLower.includes(pattern))) {
            continue;
          }

          const isDisabled = await button.isDisabled();
          if (isDisabled) continue;

          console.log(`[BUTTON] Clicking: "${buttonText.trim()}"`);
          await button.click();

          // Wait for page to stabilize after click
          await page.waitForLoadState('domcontentloaded');

          const currentUrl = page.url();
          if (!currentUrl.includes('/app')) {
            await page.goBack().catch(() => {});
            await page.waitForLoadState('domcontentloaded');
          }
        }
      }
    } catch {
      // Continue to next selector
    }
  }
}

test.describe('Client Smoke Test', () => {
  test.describe('Marketing Pages', () => {
    // Marketing pages don't require authentication - use fresh context
    test.use({ storageState: { cookies: [], origins: [] } });

    test('HomePage loads without errors', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);

      // Navigate to home page
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Wait for page content to load (React hydration)
      const main = page.locator('main, #main-content, [role="main"]').first();
      await expect(main).toBeVisible({ timeout: 10000 });

      // Verify page loaded (not blank)
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify title contains BizScreen
      await expect(page).toHaveTitle(/BizScreen/);

      // Verify navigation is present
      await expect(page.getByRole('link', { name: /features/i }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible();

      // Check for critical JS errors (filter benign ones)
      const criticalErrors = errors.consoleErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Non-Error') &&
          !e.includes('ChunkLoadError')
      );

      expect(criticalErrors).toHaveLength(0);

      // CRITICAL: Fail on ReferenceErrors
      assertNoErrors(errors, 'HomePage');
    });

    test('Features page loads without errors', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);

      await page.goto('/features');
      await page.waitForLoadState('domcontentloaded');

      // Verify some content is visible
      const main = page.locator('main, #main-content, [role="main"]').first();
      await expect(main).toBeVisible({ timeout: 5000 });

      // Verify page loaded
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
      await expect(page).toHaveTitle(/Features.*BizScreen/);

      // CRITICAL: Fail on ReferenceErrors
      assertNoErrors(errors, 'Features page');
    });

    test('Pricing page loads without errors', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);

      await page.goto('/pricing');
      await page.waitForLoadState('domcontentloaded');

      // Verify some content is visible
      const main = page.locator('main, #main-content, [role="main"]').first();
      await expect(main).toBeVisible({ timeout: 5000 });

      // Verify page loaded
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
      await expect(page).toHaveTitle(/Pricing.*BizScreen/);

      // CRITICAL: Fail on ReferenceErrors
      assertNoErrors(errors, 'Pricing page');
    });

    test('Login page is accessible from marketing', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Find and click sign in link
      const signInLink = page.getByRole('link', { name: /sign in|log in/i }).first();
      await expect(signInLink).toBeVisible({ timeout: 5000 });
      await signInLink.click();

      // Verify we're on login page
      await page.waitForURL(/\/auth\/login/);
      await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();

      // CRITICAL: Fail on ReferenceErrors
      assertNoErrors(errors, 'Login page navigation');
    });
  });

  test.describe('Authentication Flow', () => {
    // Skip entire suite if credentials not configured
    test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

    // Use fresh context for login test (no pre-auth)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('can complete login and reach dashboard', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);

      // Navigate to login
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Verify login form is present
      await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();

      // Fill credentials
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD);

      // Submit
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Wait for redirect to app
      await page.waitForURL(/\/app/, { timeout: 15000 });

      // Verify we're in the app
      await expect(page).toHaveURL(/\/app/);

      // Wait for dashboard to load
      await waitForPageReady(page);

      // Verify no error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify main content area is present
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 5000 });

      // Check for critical JS errors
      const criticalErrors = errors.consoleErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Non-Error') &&
          !e.includes('ChunkLoadError')
      );

      expect(criticalErrors).toHaveLength(0);

      // CRITICAL: Fail on ReferenceErrors
      assertNoErrors(errors, 'login and dashboard');
    });
  });

  test.describe('Dashboard (Pre-authenticated)', () => {
    // Only run on chromium (client) project
    test.beforeEach(async ({}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    });

    // This uses the default storage state (client.json) from setup
    test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

    test('dashboard loads with pre-authenticated session', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);

      // loginAndPrepare handles both pre-auth and fresh login
      await loginAndPrepare(page);

      // Verify we're in the app
      await expect(page).toHaveURL(/\/app/);

      // Wait for page to be ready
      await waitForPageReady(page);

      // Wait for content to load
      const contentIndicator = page.locator('aside, main, h1, [role="navigation"]').first();
      await expect(contentIndicator).toBeVisible({ timeout: 15000 });

      // Verify no error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify page has meaningful content
      const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
      expect(hasContent).toBe(true);

      // Check for critical JS errors
      const criticalErrors = errors.consoleErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Non-Error') &&
          !e.includes('ChunkLoadError')
      );

      expect(criticalErrors).toHaveLength(0);

      // CRITICAL: Fail on ReferenceErrors
      assertNoErrors(errors, 'pre-authenticated dashboard');
    });
  });

  test.describe('Page Crawl with Modal and Button Interactions', () => {
    // Only run on chromium (client) project
    test.beforeEach(async ({}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    });

    // Skip if credentials not configured
    test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

    // Increase timeout for crawl test
    test.setTimeout(120000);

    test('crawl client pages, open modals, click buttons, detect ReferenceErrors', async ({ page }) => {
      const errors = setupEnhancedErrorCapture(page);
      const visitedPages = [];
      const pagesWithErrors = [];

      await loginAndPrepare(page);
      await waitForPageReady(page);

      // Define pages to crawl based on common client app routes
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
      assertNoErrors(errors, 'client page crawl');
    });
  });
});
