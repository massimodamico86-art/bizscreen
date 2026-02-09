/**
 * Onboarding Flow E2E Tests
 *
 * Tests the new tenant onboarding experience
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('Onboarding Flow', () => {
  // Only run on chromium (client) project - admin/superadmin have different dashboard
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    // Login with CLIENT credentials (not admin)
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('displays dashboard after login', async ({ page }) => {
    // Wait for sidebar to appear, indicating app loaded
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Main content area should be visible (dashboard is default page)
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test('shows navigation sidebar', async ({ page }) => {
    // Wait for sidebar
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Key navigation items should be visible as buttons
    await expect(page.getByRole('button', { name: /media/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /playlists/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /screens/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('can access media library', async ({ page }) => {
    // Click on Media in nav
    await page.getByRole('button', { name: /media/i }).first().click();

    // Should show media library
    await expect(page.getByText(/all media|media library/i)).toBeVisible({ timeout: 5000 });
  });

  test('can access playlists page', async ({ page }) => {
    await page.getByRole('button', { name: /playlists/i }).first().click();

    // Should show playlists page heading in main content
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /playlists/i })).toBeVisible({ timeout: 5000 });
  });

  test('can access screens page', async ({ page }) => {
    await page.getByRole('button', { name: /screens/i }).first().click();

    // Should show screens page heading in main content
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /screens/i })).toBeVisible({ timeout: 5000 });
  });
});
