/**
 * Production Smoke Tests
 *
 * Fast, critical-path tests that verify the application is healthy.
 * These tests should:
 * - Run quickly (< 60 seconds total)
 * - Cover essential user flows
 * - Fail fast on critical issues
 * - Be run before and after deployments
 *
 * Skip if TEST_USER_EMAIL is not configured.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

test.describe('Production Smoke Tests', () => {
  // Skip if user credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.describe('Application Health', () => {
    test('app loads without fatal errors', async ({ page }) => {
      // Navigate to login page
      await page.goto('/auth/login');

      // Verify page loaded (no error boundary triggered)
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Verify login form is present
      await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
    });

    test('static assets load correctly', async ({ page }) => {
      await page.goto('/auth/login');

      // Check that CSS has loaded (page should have styled elements)
      const loginButton = page.getByRole('button', { name: /sign in|log in/i });
      await expect(loginButton).toBeVisible({ timeout: 10000 });

      // Verify button has styling (not unstyled HTML)
      const styles = await loginButton.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          padding: computed.padding
        };
      });

      // Should have some background color (not transparent/default)
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Authentication Flow', () => {
    test('can complete login successfully', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });

      // Verify we're in the app
      await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

      // Verify main content area is present
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Core Pages Load', () => {
    test('dashboard loads after login', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });

      // Dashboard should load after login
      await waitForPageReady(page);

      // Should not show error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Should show main content
      await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('no JavaScript errors in console on dashboard', async ({ page }) => {
      const jsErrors = [];

      // Collect console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore known benign errors
          if (!text.includes('favicon') && !text.includes('manifest')) {
            jsErrors.push(text);
          }
        }
      });

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });

      // Wait for dashboard to fully load
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // Should have no critical JS errors
      const criticalErrors = jsErrors.filter(e =>
        !e.includes('ResizeObserver') && // Known benign
        !e.includes('Non-Error') // Known benign
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
