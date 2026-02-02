/**
 * Client Smoke Test
 *
 * Smoke test from a client perspective to verify:
 * 1. Marketing pages load correctly (Home, Features, Pricing)
 * 2. Login flow works
 * 3. Dashboard loads after authentication
 *
 * This test verifies recent import fixes (quick tasks 019, 020) work correctly.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

test.describe('Client Smoke Test', () => {
  test.describe('Marketing Pages', () => {
    // Marketing pages don't require authentication - use fresh context
    test.use({ storageState: { cookies: [], origins: [] } });

    test('HomePage loads without errors', async ({ page }) => {
      const jsErrors = [];

      // Capture console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore known benign errors
          if (
            !text.includes('favicon') &&
            !text.includes('manifest') &&
            !text.includes('Failed to load resource') &&
            !text.includes('net::')
          ) {
            jsErrors.push(text);
          }
        }
      });

      // Capture page errors (uncaught exceptions)
      page.on('pageerror', (err) => {
        jsErrors.push(`PageError: ${err.message}`);
      });

      // Navigate to home page
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Allow React to hydrate

      // Verify page loaded (not blank)
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify title contains BizScreen
      await expect(page).toHaveTitle(/BizScreen/);

      // Verify navigation is present
      await expect(page.getByRole('link', { name: /features/i }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible();

      // Verify main content area loaded
      const main = page.locator('main, #main-content, [role="main"]').first();
      await expect(main).toBeVisible({ timeout: 5000 });

      // Check for critical JS errors (filter benign ones)
      const criticalErrors = jsErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Non-Error') &&
          !e.includes('ChunkLoadError')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('Features page loads without errors', async ({ page }) => {
      const jsErrors = [];

      page.on('pageerror', (err) => {
        jsErrors.push(`PageError: ${err.message}`);
      });

      await page.goto('/features');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify page loaded
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
      await expect(page).toHaveTitle(/Features.*BizScreen/);

      // Verify some content is visible
      const main = page.locator('main, #main-content, [role="main"]').first();
      await expect(main).toBeVisible({ timeout: 5000 });

      expect(jsErrors).toHaveLength(0);
    });

    test('Pricing page loads without errors', async ({ page }) => {
      const jsErrors = [];

      page.on('pageerror', (err) => {
        jsErrors.push(`PageError: ${err.message}`);
      });

      await page.goto('/pricing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify page loaded
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
      await expect(page).toHaveTitle(/Pricing.*BizScreen/);

      // Verify some content is visible
      const main = page.locator('main, #main-content, [role="main"]').first();
      await expect(main).toBeVisible({ timeout: 5000 });

      expect(jsErrors).toHaveLength(0);
    });

    test('Login page is accessible from marketing', async ({ page }) => {
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
    });
  });

  test.describe('Authentication Flow', () => {
    // Skip entire suite if credentials not configured
    test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

    // Use fresh context for login test (no pre-auth)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('can complete login and reach dashboard', async ({ page }) => {
      const jsErrors = [];

      page.on('pageerror', (err) => {
        jsErrors.push(`PageError: ${err.message}`);
      });

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
      const criticalErrors = jsErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Non-Error') &&
          !e.includes('ChunkLoadError')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Dashboard (Pre-authenticated)', () => {
    // This uses the default storage state (client.json) from setup
    test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

    test('dashboard loads with pre-authenticated session', async ({ page }) => {
      const jsErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (
            !text.includes('favicon') &&
            !text.includes('manifest') &&
            !text.includes('Failed to load resource') &&
            !text.includes('net::') &&
            !text.includes('400') &&
            !text.includes('404')
          ) {
            jsErrors.push(text);
          }
        }
      });

      page.on('pageerror', (err) => {
        jsErrors.push(`PageError: ${err.message}`);
      });

      // loginAndPrepare handles both pre-auth and fresh login
      await loginAndPrepare(page);

      // Verify we're in the app
      await expect(page).toHaveURL(/\/app/);

      // Wait for page to be ready
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // Verify no error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify sidebar is visible (indicates app shell loaded)
      const sidebar = page.locator('aside, nav, [role="navigation"]').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Verify main content area is present
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 5000 });

      // Check for critical JS errors
      const criticalErrors = jsErrors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Non-Error') &&
          !e.includes('ChunkLoadError')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
