/**
 * Playlists E2E Tests
 *
 * Tests the playlist management functionality:
 * - Navigate to playlists page
 * - Create a new playlist
 * - View playlist in list
 * - Delete playlist
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection, waitForPageReady } from './helpers.js';

test.describe('Playlists', () => {
  test.skip(({ browserName }) => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('can navigate to playlists page', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Should show playlists page
    await expect(page.getByRole('heading', { name: /playlists/i })).toBeVisible({ timeout: 5000 });
  });

  test('shows Add Playlist button', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Should have Add Playlist button
    const addButton = page.getByRole('button', { name: /add playlist/i });
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('opens choice modal when clicking Add Playlist', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Click Add Playlist button
    await page.getByRole('button', { name: /add playlist/i }).first().click();

    // Should show choice modal with Blank Playlist and Template options
    await expect(page.getByText(/new playlist/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/blank playlist/i)).toBeVisible();
    await expect(page.getByText(/start from template/i)).toBeVisible();
  });

  test('can open blank playlist creation form', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Click Add Playlist button
    await page.getByRole('button', { name: /add playlist/i }).first().click();

    // Wait for choice modal
    await expect(page.getByText(/blank playlist/i)).toBeVisible({ timeout: 5000 });

    // Click on Blank Playlist option
    await page.getByText(/blank playlist/i).click();

    // Should show create playlist form
    await expect(page.getByText(/create playlist/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/enter playlist name/i)).toBeVisible();
  });

  test('can create a new playlist', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Generate unique name
    const playlistName = `Test Playlist ${Date.now()}`;

    // Click Add Playlist button
    await page.getByRole('button', { name: /add playlist/i }).first().click();

    // Wait for choice modal and click Blank Playlist
    await expect(page.getByText(/blank playlist/i)).toBeVisible({ timeout: 5000 });
    await page.getByText(/blank playlist/i).click();

    // Fill in playlist name
    await page.getByPlaceholder(/enter playlist name/i).fill(playlistName);

    // Click Create Playlist button
    await page.getByRole('button', { name: /create playlist/i }).click();

    // Wait for navigation or success - the app navigates to playlist editor
    // or shows success message
    await page.waitForTimeout(2000);

    // Navigate back to playlists to verify it was created
    await navigateToSection(page, 'playlists');

    // Should see the new playlist in the list
    await expect(page.getByText(playlistName)).toBeVisible({ timeout: 5000 });
  });

  test('can cancel playlist creation', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Click Add Playlist button
    await page.getByRole('button', { name: /add playlist/i }).first().click();

    // Wait for choice modal and click Blank Playlist
    await expect(page.getByText(/blank playlist/i)).toBeVisible({ timeout: 5000 });
    await page.getByText(/blank playlist/i).click();

    // Should show create playlist form
    await expect(page.getByPlaceholder(/enter playlist name/i)).toBeVisible({ timeout: 5000 });

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(page.getByPlaceholder(/enter playlist name/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('can open template picker', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Click Add Playlist button
    await page.getByRole('button', { name: /add playlist/i }).first().click();

    // Wait for choice modal
    await expect(page.getByText(/start from template/i)).toBeVisible({ timeout: 5000 });

    // Click on Template option
    await page.getByText(/start from template/i).click();

    // Should show template picker
    await expect(page.getByText(/choose a template/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows search input for filtering playlists', async ({ page }) => {
    await navigateToSection(page, 'playlists');

    // Should have search input
    const searchInput = page.getByPlaceholder(/search playlists/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test.describe('Playlist Deletion', () => {
    test('can delete a playlist', async ({ page }) => {
      await navigateToSection(page, 'playlists');

      // First, create a playlist to delete
      const playlistName = `Delete Test ${Date.now()}`;

      // Click Add Playlist button
      await page.getByRole('button', { name: /add playlist/i }).first().click();
      await expect(page.getByText(/blank playlist/i)).toBeVisible({ timeout: 5000 });
      await page.getByText(/blank playlist/i).click();
      await page.getByPlaceholder(/enter playlist name/i).fill(playlistName);
      await page.getByRole('button', { name: /create playlist/i }).click();

      // Wait and navigate back to playlists
      await page.waitForTimeout(2000);
      await navigateToSection(page, 'playlists');

      // Verify playlist exists
      await expect(page.getByText(playlistName)).toBeVisible({ timeout: 5000 });

      // Find the playlist row and click the action menu
      const playlistRow = page.locator('tr').filter({ hasText: playlistName });
      await playlistRow.locator('button').filter({ has: page.locator('svg') }).last().click();

      // Click Delete in the dropdown
      await page.getByText(/delete/i).click();

      // Confirm deletion in the modal
      const deleteButton = page.getByRole('button', { name: /delete/i }).last();
      await expect(deleteButton).toBeVisible({ timeout: 3000 });
      await deleteButton.click();

      // Wait for deletion
      await page.waitForTimeout(1000);

      // Playlist should no longer be visible
      await expect(page.getByText(playlistName)).not.toBeVisible({ timeout: 5000 });
    });
  });
});
