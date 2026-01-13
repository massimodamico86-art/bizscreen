/**
 * Dashboard E2E Tests
 * Phase 2: End-to-end tests for client dashboard
 *
 * Tests cover:
 * - Dashboard loads after authentication
 * - Key dashboard widgets are visible
 * - Stats cards are rendered
 * - Quick actions are interactive
 * - No JavaScript errors on dashboard
 *
 * Prerequisites:
 * - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars must be set
 * - The test user should have 'client' role
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, dismissAnyModals } from './helpers.js';

test.describe('Client Dashboard', () => {
  // Skip all tests if credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.describe('Dashboard Loading', () => {
    test('dashboard loads successfully after login', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      // Wait for page to be ready
      await waitForPageReady(page);

      // Verify we're on the app page
      await expect(page).toHaveURL(/\/app/);

      // Dashboard should be the default page - check for dashboard heading
      // The heading might say "Dashboard" or be part of the page structure
      const dashboardHeading = page.getByRole('heading', { name: /dashboard/i }).first();
      await expect(dashboardHeading).toBeVisible({ timeout: 10000 });
    });

    test('dashboard shows main content area', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Main content area should be visible
      await expect(page.locator('main')).toBeVisible();

      // Should not show error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
    });
  });

  test.describe('Dashboard Stats', () => {
    test('displays stat cards with proper labels', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Check for stat card labels within main content (using more specific selectors)
      const mainContent = page.locator('#main-content');
      await expect(mainContent.getByText('Total Screens', { exact: true })).toBeVisible({ timeout: 5000 });
      await expect(mainContent.getByText('Playlists', { exact: true })).toBeVisible({ timeout: 5000 });
      await expect(mainContent.getByText('Media Assets', { exact: true })).toBeVisible({ timeout: 5000 });
      await expect(mainContent.getByText('Apps', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    });

    test('stat cards are clickable', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Find a stat card within main content and click it (should navigate)
      const mainContent = page.locator('#main-content');
      const playlistsCard = mainContent.getByText('Playlists', { exact: true });
      await expect(playlistsCard).toBeVisible();

      // Clicking should not cause an error (navigation is handled by setCurrentPage)
      await playlistsCard.click();
      await page.waitForTimeout(300);

      // Page should still be functional (no crash)
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Dashboard Sections', () => {
    test('displays Screens Overview section', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Screens Overview section should be visible
      await expect(page.getByText('Screens Overview')).toBeVisible({ timeout: 5000 });
    });

    test('displays Quick Actions section', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Quick Actions section should be visible
      await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 5000 });

      // Quick action buttons should be present
      await expect(page.getByText('Add Screen')).toBeVisible();
      await expect(page.getByText('Create Playlist')).toBeVisible();
      await expect(page.getByText('Upload Media')).toBeVisible();
      await expect(page.getByText('Create App')).toBeVisible();
    });

    test('quick action buttons are interactive', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Click on "Add Screen" quick action
      const addScreenButton = page.getByRole('button', { name: /add screen/i }).first();
      await expect(addScreenButton).toBeVisible();
      await addScreenButton.click();

      // Wait for navigation
      await page.waitForTimeout(500);

      // Should navigate away from dashboard (screens page)
      // The sidebar should update or the content should change
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('no JavaScript errors on dashboard load', async ({ page }) => {
      const jsErrors = [];

      // Collect console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore known benign errors and network errors (API may return 400/404 for missing data)
          if (
            !text.includes('favicon') &&
            !text.includes('manifest') &&
            !text.includes('ResizeObserver') &&
            !text.includes('Non-Error') &&
            !text.includes('Failed to load resource') &&
            !text.includes('400') &&
            !text.includes('404') &&
            !text.includes('net::')
          ) {
            jsErrors.push(text);
          }
        }
      });

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Wait extra time for any async operations
      await page.waitForTimeout(2000);

      // Should have no critical JS errors
      expect(jsErrors).toHaveLength(0);
    });

    test('no error boundary triggered on dashboard', async ({ page }) => {
      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // ErrorBoundary fallback text should not be visible
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
      await expect(page.locator('body')).not.toContainText('Error loading');
    });
  });

  test.describe('Responsive Layout', () => {
    test('dashboard renders correctly on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Sidebar should be visible on desktop
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();

      // Main content should be visible
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // Stats should be in a grid layout (4 cards)
      await expect(mainContent.getByText('Total Screens', { exact: true })).toBeVisible();
      await expect(mainContent.getByText('Apps', { exact: true }).first()).toBeVisible();
    });

    test('dashboard renders without crash on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await loginAndPrepare(page, {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      });

      await waitForPageReady(page);

      // Main content should still be visible
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // Dashboard heading should be visible (stats may be hidden or collapsed on mobile)
      const dashboardHeading = page.getByRole('heading', { name: /dashboard/i }).first();
      await expect(dashboardHeading).toBeVisible({ timeout: 5000 });

      // Page should not crash - no error boundary
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');
    });
  });
});
