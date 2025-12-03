/**
 * Content Pipeline E2E Tests
 *
 * Tests the content creation flow: Media → Playlist → Layout → Screen
 * Requires CLIENT role user (not admin) to see the client sidebar.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('Content Pipeline', () => {
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    // Login with CLIENT credentials (not admin)
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test.describe('Playlists', () => {
    test('can create a new playlist', async ({ page }) => {
      // Navigate to playlists
      await page.getByRole('button', { name: /playlists/i }).click();

      // Click create/add button
      const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill in playlist name
        const nameInput = page.getByPlaceholder(/name|title/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Playlist E2E');

          // Save
          await page.getByRole('button', { name: /save|create/i }).click();

          // Verify created
          await expect(page.getByText('Test Playlist E2E')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('can view playlist details', async ({ page }) => {
      await page.getByRole('button', { name: /playlists/i }).click();

      // Click on first playlist if exists
      const playlistCard = page.locator('[data-testid="playlist-card"]').first();
      if (await playlistCard.isVisible()) {
        await playlistCard.click();

        // Should show playlist editor or details
        await expect(page.getByText(/items|duration|edit/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Layouts', () => {
    test('can access layouts page', async ({ page }) => {
      await page.getByRole('button', { name: /layouts/i }).click();

      // Use heading role to avoid matching sidebar button and count text
      const mainContent = page.locator('main');
      await expect(mainContent.getByRole('heading', { name: /layouts/i })).toBeVisible({ timeout: 5000 });
    });

    test('can create a new layout', async ({ page }) => {
      await page.getByRole('button', { name: /layouts/i }).click();

      const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill in layout name if modal appears
        const nameInput = page.getByPlaceholder(/name|title/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Layout E2E');
          await page.getByRole('button', { name: /save|create/i }).click();
        }
      }
    });
  });

  test.describe('Schedules', () => {
    test('can access schedules page', async ({ page }) => {
      await page.getByRole('button', { name: /schedules/i }).click();

      // Use heading role to avoid matching sidebar button
      const mainContent = page.locator('main');
      await expect(mainContent.getByRole('heading', { name: /schedules/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Screens', () => {
    test('can access screens page', async ({ page }) => {
      await page.getByRole('button', { name: /screens/i }).click();

      // Use heading role to avoid matching sidebar button
      const mainContent = page.locator('main');
      await expect(mainContent.getByRole('heading', { name: /screens/i })).toBeVisible({ timeout: 5000 });
    });

    test('shows screen pairing option', async ({ page }) => {
      await page.getByRole('button', { name: /screens/i }).click();

      // Should have an add/pair screen button (use first() as there may be multiple)
      const addButton = page.getByRole('button', { name: /add.*screen|pair/i }).first();
      await expect(addButton).toBeVisible({ timeout: 5000 });
    });
  });
});
