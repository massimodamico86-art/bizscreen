/**
 * Crash Regression Tests -- Phase 104
 *
 * Regression guard for CRASH-01 through CRASH-06.
 * Navigates to 6 pages that previously crashed with
 * "Objects are not valid as a React child" and verifies
 * they render successfully without hitting the error boundary.
 *
 * These pages are NOT in the sidebar navigation, so we use
 * window.__setCurrentPage() to navigate programmatically.
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

/**
 * Helper to set up pageerror and console error capture.
 * Copied from smoke.spec.js (these functions are not exported from helpers).
 * Tracks ReferenceErrors separately for targeted reporting.
 */
function setupErrorCapture(page) {
  const errors = {
    pageErrors: [],
    consoleErrors: [],
    referenceErrors: [],
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
 * Assert no critical errors occurred.
 * Call this at the end of tests that use setupErrorCapture.
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
 * Navigate to a page using window.__setCurrentPage().
 * Waits for the function to be available, then navigates and waits for render.
 */
async function navigateToPage(page, pageKey) {
  // Ensure __setCurrentPage is available
  await page.waitForFunction(() => typeof window.__setCurrentPage === 'function', {
    timeout: 10000,
  });
  // Set the page
  await page.evaluate((key) => window.__setCurrentPage(key), pageKey);
  // Wait for React to re-render
  await page.waitForTimeout(500);
  // Wait for any loading indicators to clear
  await waitForPageReady(page);
}

test.describe('Crash Regression (Phase 104)', () => {
  // Only run on chromium (client) project -- same pattern as smoke tests
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  // Skip if credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('CRASH-01: Team Management page renders without crash', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    await navigateToPage(page, 'team');

    // Assert NO error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong', {
      timeout: 5000,
    });
    // Assert page has content
    await expect(page.locator('main, h1, h2, [class*="Page"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Assert no page errors
    assertNoPageErrors(errors, 'Team Management');
  });

  test('CRASH-02: Activity Log page renders without crash', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    await navigateToPage(page, 'activity');

    // Assert NO error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong', {
      timeout: 5000,
    });
    // Assert page has content
    await expect(page.locator('main, h1, h2, [class*="Page"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Assert no page errors
    assertNoPageErrors(errors, 'Activity Log');
  });

  test('CRASH-03: Template Marketplace page renders without crash', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    await navigateToPage(page, 'template-marketplace');

    // Assert NO error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong', {
      timeout: 5000,
    });
    // Assert page has content
    await expect(page.locator('main, h1, h2, [class*="Page"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Assert no page errors
    assertNoPageErrors(errors, 'Template Marketplace');
  });

  test('CRASH-04: Translation Dashboard page renders without crash', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    await navigateToPage(page, 'translations');

    // Assert NO error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong', {
      timeout: 5000,
    });
    // Assert page has content
    await expect(page.locator('main, h1, h2, [class*="Page"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Assert no page errors
    assertNoPageErrors(errors, 'Translation Dashboard');
  });

  test('CRASH-05: Demo Tools page renders without crash', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    await navigateToPage(page, 'demo-tools');

    // Assert NO error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong', {
      timeout: 5000,
    });
    // Assert page has content
    await expect(page.locator('main, h1, h2, [class*="Page"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Assert no page errors
    assertNoPageErrors(errors, 'Demo Tools');
  });

  test('CRASH-06: Security Dashboard page renders without crash', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    await navigateToPage(page, 'security');

    // Assert NO error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong', {
      timeout: 5000,
    });
    // Assert page has content
    await expect(page.locator('main, h1, h2, [class*="Page"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Assert no page errors
    assertNoPageErrors(errors, 'Security Dashboard');
  });

  test('all 6 crash-fix pages load in sequence without errors', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loginAndPrepare(page);
    await waitForPageReady(page);

    const pages = [
      { key: 'team', name: 'Team Management' },
      { key: 'activity', name: 'Activity Log' },
      { key: 'template-marketplace', name: 'Template Marketplace' },
      { key: 'translations', name: 'Translation Dashboard' },
      { key: 'demo-tools', name: 'Demo Tools' },
      { key: 'security', name: 'Security Dashboard' },
    ];

    for (const p of pages) {
      console.log(`[CRASH-REGRESSION] Navigating to: ${p.name}`);
      await navigateToPage(page, p.key);

      // Check for error boundary
      const hasErrorBoundary = await page
        .locator('body')
        .evaluate((body) => body.innerText.includes('Something Went Wrong'));
      expect(hasErrorBoundary, `${p.name} shows error boundary`).toBe(false);

      // Check page has visible content
      const content = page.locator('main, h1, h2, [class*="Page"]').first();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    assertNoPageErrors(errors, 'sequential page crawl');
  });
});
