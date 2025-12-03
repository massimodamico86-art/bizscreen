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
import { loginAndPrepare, navigateToSection, waitForPageReady } from './helpers.js';

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

      // Verify main navigation is present
      const sidebar = page.locator('nav, aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Core Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });
    });

    test('dashboard loads correctly', async ({ page }) => {
      // Dashboard should load after login
      await waitForPageReady(page);

      // Should not show error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Should show some dashboard content
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });

    test('can access media library', async ({ page }) => {
      await navigateToSection(page, 'media');

      // Should show media page heading
      const mainContent = page.locator('main');
      await expect(mainContent.getByRole('heading', { name: /all media/i })).toBeVisible({ timeout: 5000 });

      // Should show Add Media button
      const header = page.locator('header');
      await expect(header.locator('button:has-text("Add Media")')).toBeVisible({ timeout: 3000 });
    });

    test('can access screens page', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Should show screens heading
      const mainContent = page.locator('main');
      await expect(mainContent.getByRole('heading', { name: /screens/i })).toBeVisible({ timeout: 5000 });
    });

    test('can access playlists page', async ({ page }) => {
      await navigateToSection(page, 'playlists');

      // Should show playlists heading
      await expect(page.getByRole('heading', { name: /playlists/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });
    });

    test('no JavaScript errors in console on main pages', async ({ page }) => {
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

      // Navigate through main pages
      await navigateToSection(page, 'media');
      await page.waitForTimeout(500);

      await navigateToSection(page, 'playlists');
      await page.waitForTimeout(500);

      await navigateToSection(page, 'screens');
      await page.waitForTimeout(500);

      // Should have no critical JS errors
      const criticalErrors = jsErrors.filter(e =>
        !e.includes('ResizeObserver') && // Known benign
        !e.includes('Non-Error') // Known benign
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('UI Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });
    });

    test('sidebar navigation is interactive', async ({ page }) => {
      // Click on Screens
      await page.getByRole('button', { name: /screens/i }).click();
      await expect(page).toHaveURL(/screens/, { timeout: 5000 });

      // Click on Playlists
      await page.getByRole('button', { name: /playlists/i }).click();
      await expect(page).toHaveURL(/playlists/, { timeout: 5000 });
    });

    test('buttons respond to hover states', async ({ page }) => {
      await navigateToSection(page, 'media');

      const header = page.locator('header');
      const addButton = header.locator('button:has-text("Add Media")');
      await expect(addButton).toBeVisible({ timeout: 3000 });

      // Hover should work without errors
      await addButton.hover();

      // Should still be visible and not error
      await expect(addButton).toBeVisible();
    });
  });
});
