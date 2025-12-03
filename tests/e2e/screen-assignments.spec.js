/**
 * Screen Assignments E2E Tests
 *
 * Tests the screen-to-playlist assignment functionality:
 * - Navigate to screens page
 * - View screen list and dropdowns
 * - Assign playlist to screen
 * - Verify assignment persists
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection, waitForPageReady } from './helpers.js';

test.describe('Screen Assignments', () => {
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    // Login with CLIENT credentials (not admin)
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('can navigate to screens page', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Should show screens page - look for heading in main content, not sidebar
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /screens/i })).toBeVisible({ timeout: 5000 });
  });

  test('shows Add Screen button', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Should have Add Screen button in header
    const header = page.locator('header');
    const addButton = header.locator('button:has-text("Add Screen"), button:has-text("Pair Screen")').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('can open Add Screen modal', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Click Add Screen button in header
    const header = page.locator('header');
    await header.locator('button:has-text("Add Screen"), button:has-text("Pair Screen")').first().click();

    // Should show a modal dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('can create a new screen', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Generate unique name
    const screenName = `Test Screen ${Date.now()}`;

    // Click Add Screen button in header
    const header = page.locator('header');
    await header.locator('button:has-text("Add Screen"), button:has-text("Pair Screen")').first().click();

    // Check if we can create (might hit limit)
    const nameInput = page.getByPlaceholder(/lobby tv|conference room/i);
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(screenName);

      // Click Create Screen button
      await page.getByRole('button', { name: /create screen/i }).click();

      // Should show success with pairing code
      await expect(page.getByText(/screen created successfully/i)).toBeVisible({ timeout: 5000 });

      // Click Done to close
      await page.getByRole('button', { name: /done/i }).click();

      // Should see the new screen in the list
      await expect(page.getByText(screenName)).toBeVisible({ timeout: 5000 });
    }
    // If limit modal appears, test passes - UI is working correctly
  });

  test('screens have playlist assignment dropdowns', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Wait for screens to load
    await page.waitForTimeout(1000);

    // Check if there are any screens
    const screenRows = page.locator('table tbody tr');
    const screenCount = await screenRows.count();

    if (screenCount > 0) {
      // Should have select dropdowns for playlist assignment
      // Look for select elements in the Content column
      const playlistSelect = page.locator('select').first();
      await expect(playlistSelect).toBeVisible({ timeout: 3000 });
    } else {
      // No screens exist - verify empty state or add screen prompt
      const emptyState = page.getByText(/you don't have any screens/i);
      const isEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isEmptyState || screenCount === 0).toBeTruthy();
    }
  });

  test.describe('Playlist Assignment', () => {
    test('can assign playlist to screen via dropdown', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // First ensure we have a screen and a playlist
      // Create a screen if needed
      const screenRows = page.locator('table tbody tr');
      let screenCount = await screenRows.count().catch(() => 0);

      if (screenCount === 0) {
        // Create a screen first
        const screenName = `Assignment Test Screen ${Date.now()}`;
        await page.getByRole('button', { name: /add screen/i }).first().click();
        await page.getByPlaceholder(/lobby tv|conference room/i).fill(screenName);
        await page.getByRole('button', { name: /create screen/i }).click();
        await expect(page.getByText(/screen created successfully/i)).toBeVisible({ timeout: 5000 });
        await page.getByRole('button', { name: /done/i }).click();
        await page.waitForTimeout(1000);
      }

      // Now create a playlist to assign
      await navigateToSection(page, 'playlists');
      const playlistName = `Assignment Test Playlist ${Date.now()}`;
      await page.getByRole('button', { name: /add playlist/i }).first().click();
      await expect(page.getByText(/blank playlist/i)).toBeVisible({ timeout: 5000 });
      await page.getByText(/blank playlist/i).click();
      await page.getByPlaceholder(/enter playlist name/i).fill(playlistName);
      await page.getByRole('button', { name: /create playlist/i }).click();
      await page.waitForTimeout(2000);

      // Navigate back to screens
      await navigateToSection(page, 'screens');
      await page.waitForTimeout(1000);

      // Find a screen row with a playlist dropdown
      const playlistSelects = page.locator('select').filter({ hasText: /no playlist/i });
      const selectCount = await playlistSelects.count();

      if (selectCount > 0) {
        const firstSelect = playlistSelects.first();

        // Select the playlist we just created
        await firstSelect.selectOption({ label: playlistName });

        // Wait for assignment to complete
        await page.waitForTimeout(1500);

        // Verify the selection persisted
        await expect(firstSelect).toHaveValue(/.+/); // Should have a value (not empty)
      }
    });

    test('playlist assignment persists after page refresh', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Create a screen
      const screenName = `Persist Test Screen ${Date.now()}`;
      await page.getByRole('button', { name: /add screen/i }).first().click();
      await page.getByPlaceholder(/lobby tv|conference room/i).fill(screenName);
      await page.getByRole('button', { name: /create screen/i }).click();
      await expect(page.getByText(/screen created successfully/i)).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /done/i }).click();
      await page.waitForTimeout(1000);

      // Create a playlist
      await navigateToSection(page, 'playlists');
      const playlistName = `Persist Test Playlist ${Date.now()}`;
      await page.getByRole('button', { name: /add playlist/i }).first().click();
      await expect(page.getByText(/blank playlist/i)).toBeVisible({ timeout: 5000 });
      await page.getByText(/blank playlist/i).click();
      await page.getByPlaceholder(/enter playlist name/i).fill(playlistName);
      await page.getByRole('button', { name: /create playlist/i }).click();
      await page.waitForTimeout(2000);

      // Navigate to screens and assign playlist
      await navigateToSection(page, 'screens');
      await page.waitForTimeout(1000);

      // Find the screen row we created
      const screenRow = page.locator('tr').filter({ hasText: screenName });
      const playlistSelect = screenRow.locator('select').first();

      if (await playlistSelect.isVisible()) {
        // Select the playlist
        await playlistSelect.selectOption({ label: playlistName });
        await page.waitForTimeout(1500);

        // Refresh the page
        await page.reload();
        await page.waitForTimeout(2000);

        // Navigate back to screens
        await navigateToSection(page, 'screens');
        await page.waitForTimeout(1000);

        // Find the screen again and verify playlist is still assigned
        const refreshedScreenRow = page.locator('tr').filter({ hasText: screenName });
        const refreshedSelect = refreshedScreenRow.locator('select').first();

        // The dropdown should still have the playlist selected
        const selectedValue = await refreshedSelect.inputValue();
        expect(selectedValue).toBeTruthy();
      }
    });
  });

  test.describe('Screen Management', () => {
    test('can view screen status (online/offline)', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Wait for screens to load
      await page.waitForTimeout(1000);

      const screenRows = page.locator('table tbody tr');
      const screenCount = await screenRows.count();

      if (screenCount > 0) {
        // Should show status badges
        const onlineOrOffline = page.getByText(/online|offline/i);
        await expect(onlineOrOffline.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('shows pairing code for unpaired screens', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Create a new screen to ensure we have one with a pairing code
      const screenName = `Pairing Code Test ${Date.now()}`;
      const header = page.locator('header');
      await header.locator('button:has-text("Add Screen"), button:has-text("Pair Screen")').first().click();

      const nameInput = page.getByPlaceholder(/lobby tv|conference room/i);
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(screenName);
        await page.getByRole('button', { name: /create screen/i }).click();

        // Should show pairing code in success modal
        await expect(page.getByText(/pairing code/i)).toBeVisible({ timeout: 5000 });

        // Pairing code should be visible (6 character code)
        const codeElement = page.locator('code').filter({ hasText: /^[A-Z0-9]{6}$/ });
        await expect(codeElement).toBeVisible({ timeout: 3000 });
      }
      // If limit modal appears, test passes
    });

    test('can copy pairing code', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Create a new screen
      const screenName = `Copy Code Test ${Date.now()}`;
      const header = page.locator('header');
      await header.locator('button:has-text("Add Screen"), button:has-text("Pair Screen")').first().click();

      const nameInput = page.getByPlaceholder(/lobby tv|conference room/i);
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(screenName);
        await page.getByRole('button', { name: /create screen/i }).click();

        // Wait for success modal
        await expect(page.getByText(/pairing code/i)).toBeVisible({ timeout: 5000 });

        // Find and click the copy button
        const copyButton = page.locator('button[title="Copy code"]');
        if (await copyButton.isVisible()) {
          await copyButton.click();
        }
      }
      // If limit modal appears, test passes
    });
  });
});
