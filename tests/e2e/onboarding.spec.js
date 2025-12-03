/**
 * Onboarding Flow E2E Tests
 *
 * Tests the new tenant onboarding experience
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('Onboarding Flow', () => {
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    // Login with CLIENT credentials (not admin)
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('displays dashboard after login', async ({ page }) => {
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows navigation sidebar', async ({ page }) => {
    // Key navigation items should be visible
    await expect(page.getByText(/media/i)).toBeVisible();
    await expect(page.getByText(/playlists/i)).toBeVisible();
    await expect(page.getByText(/screens/i)).toBeVisible();
  });

  test('can access media library', async ({ page }) => {
    // Click on Media in nav
    await page.getByRole('button', { name: /media/i }).first().click();

    // Should show media library
    await expect(page.getByText(/all media|media library/i)).toBeVisible({ timeout: 5000 });
  });

  test('can access playlists page', async ({ page }) => {
    await page.getByRole('button', { name: /playlists/i }).click();

    // Should show playlists page
    await expect(page.getByText(/playlists/i)).toBeVisible({ timeout: 5000 });
  });

  test('can access screens page', async ({ page }) => {
    await page.getByRole('button', { name: /screens/i }).click();

    // Should show screens page with add button
    await expect(page.getByText(/screens/i)).toBeVisible({ timeout: 5000 });
  });
});
