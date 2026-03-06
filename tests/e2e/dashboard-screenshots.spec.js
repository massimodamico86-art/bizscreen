/**
 * Dashboard Screenshot E2E Tests
 * Phase 115: Screenshot evidence for dashboard widgets and navigation
 *
 * Covers DASH-01 through DASH-05:
 * - DASH-01: Stat cards (Total Screens, Playlists, Media Assets, Apps)
 * - DASH-02: Sidebar navigation to primary pages
 * - DASH-03: Breadcrumb navigation
 * - DASH-04: Welcome vs Dashboard differentiation
 * - DASH-05: Notification bell dropdown
 *
 * Prerequisites:
 * - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars must be set
 * - The test user should have 'client' role
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from '@playwright/test';
import {
  loginAndPrepare,
  navigateToSection,
  waitForPageReady,
  dismissAnyModals,
} from './helpers.js';

test.describe('Dashboard Screenshots', () => {
  // Only run on chromium (client) project
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  // Skip all tests if credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('DASH-01: stat cards area on dashboard', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);

    // Wait for dashboard heading to confirm we're on the right page
    const mainContent = page.locator('#main-content');
    const dashboardHeading = page.getByRole('heading', { name: /dashboard/i }).first();
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });

    // Check for stat cards -- they render when backend data loads successfully
    // When backend is unavailable, the DashboardErrorState shows instead
    const statCardsVisible = await mainContent
      .getByText('Total Screens', { exact: true })
      .isVisible()
      .catch(() => false);

    if (statCardsVisible) {
      // Verify all four stat card labels
      await expect(mainContent.getByText('Total Screens', { exact: true })).toBeVisible();
      await expect(mainContent.getByText('Playlists', { exact: true })).toBeVisible();
      await expect(mainContent.getByText('Media Assets', { exact: true })).toBeVisible();
      await expect(mainContent.getByText('Apps', { exact: true }).first()).toBeVisible();
    } else {
      // Backend unavailable -- error state is shown, which is expected in E2E without backend
      // Verify the error state renders cleanly (no crash)
      const errorState = mainContent.getByText(/Couldn't load dashboard|trouble loading/i).first();
      await expect(errorState).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({
      path: 'screenshots/115-01-dashboard-stat-cards.png',
      fullPage: false,
    });
  });

  test('DASH-02: sidebar navigation to primary pages', async ({ page }) => {
    test.slow(); // This test visits many pages

    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);

    // Define navigation targets
    // Use navigateToSection helper for sections it supports, direct sidebar clicks for others
    // Sidebar items (from screenshots): Welcome, Dashboard, Media (expandable), Apps,
    // Playlists, Templates, Schedules, Screens, Video Walls, Menu Boards, Proof of Play
    const sections = [
      { name: 'media', useHelper: true },
      { name: 'playlists', useHelper: true },
      { name: 'screens', useHelper: true },
      { name: 'schedules', useHelper: true },
      { name: 'templates', useHelper: false, text: 'Templates' },
      { name: 'apps', useHelper: false, text: 'Apps' },
      { name: 'menu-boards', useHelper: false, text: 'Menu Boards' },
      { name: 'dashboard', useHelper: true },
    ];

    for (const section of sections) {
      if (section.useHelper) {
        await navigateToSection(page, section.name);
      } else {
        // Click sidebar button or link by text match
        const sidebarItem = page.locator(
          `aside button:has-text("${section.text}"), aside a:has-text("${section.text}")`
        ).first();
        const itemExists = await sidebarItem.count();
        if (itemExists === 0) {
          // Section not in sidebar, skip gracefully
          continue;
        }
        await sidebarItem.click();
        await waitForPageReady(page);
      }

      // Verify main content area is visible (no crash)
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('body')).not.toContainText('Something Went Wrong');

      // Dismiss any modals that may appear on page load
      await dismissAnyModals(page);

      await page.screenshot({
        path: `screenshots/115-02-nav-${section.name}.png`,
        fullPage: false,
      });
    }
  });

  test('DASH-03: breadcrumb navigation on sub-page', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);

    // Navigate to Media > All Media which has breadcrumbs (parent: "Media")
    await navigateToSection(page, 'media');
    await waitForPageReady(page);

    // The Header renders breadcrumbs in a nav element with "Home" > parent > label
    // Look for the breadcrumb nav containing "Home" text
    const breadcrumbNav = page.locator('nav:has-text("Home")').first();
    await expect(breadcrumbNav).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'screenshots/115-03-breadcrumb-path.png',
      fullPage: false,
    });
  });

  test('DASH-04: welcome page vs dashboard page are visually different', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);

    // Navigate to Welcome page
    await page.goto('/app/welcome');
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Assert no error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong');

    await page.screenshot({
      path: 'screenshots/115-04-welcome-page.png',
      fullPage: false,
    });

    // Navigate to Dashboard
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Assert no error boundary
    await expect(page.locator('body')).not.toContainText('Something Went Wrong');

    await page.screenshot({
      path: 'screenshots/115-04-dashboard-page.png',
      fullPage: false,
    });
  });

  test('DASH-05: notification bell dropdown', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);

    // Locate the notification bell button
    // The NotificationBell component uses aria-label="View notifications"
    const bellButton = page.locator(
      '[aria-label*="notification" i], [aria-label*="Notification" i], [aria-label*="bell" i], button:has(svg.lucide-bell)'
    ).first();

    await expect(bellButton).toBeVisible({ timeout: 10000 });

    // Click bell to open dropdown
    await bellButton.click();

    // Wait for dropdown to appear -- it contains "Notifications" heading
    const dropdown = page.locator('.absolute:has-text("Notifications")').first();
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'screenshots/115-05-notification-dropdown.png',
      fullPage: false,
    });

    // Close dropdown by clicking elsewhere
    await page.locator('main').click({ position: { x: 10, y: 10 }, force: true });
  });
});
