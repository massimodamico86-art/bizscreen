/**
 * Playlist Template Flow Test
 *
 * Tests creating a playlist from template and opening it.
 */
import { test, expect } from '@playwright/test';

test.describe('Playlist Template Flow', () => {
  // Use storage state for client authentication
  test.use({ storageState: 'playwright/.auth/client.json' });

  const consoleErrors = [];
  const networkErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    networkErrors.length = 0;

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Navigate to app (already authenticated via storage state)
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');

    // Dismiss any modals that appear
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.count() > 0 && await dialog.isVisible()) {
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log(`\n=== CONSOLE ERRORS for ${testInfo.title} ===`);
      consoleErrors.forEach(e => console.log(`  ${e}`));
    }
    if (networkErrors.length > 0) {
      console.log(`\n=== NETWORK ERRORS for ${testInfo.title} ===`);
      networkErrors.forEach(e => console.log(`  ${e.status}: ${e.url}`));
    }
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/playlist-template-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }
  });

  test('Navigate to Playlists and click Add Playlist', async ({ page }) => {
    await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
    await page.waitForLoadState('networkidle');

    // Verify playlists page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /playlists/i }).first()).toBeVisible({ timeout: 10000 });

    // Check for user_preferences error
    const hasUserPreferencesError = consoleErrors.some(e => e.includes('user_preferences'));
    expect(hasUserPreferencesError).toBe(false);

    // Click Add Playlist
    const addButton = page.locator('button').filter({ hasText: /add playlist/i }).first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Wait for modal to appear
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'test-results/playlist-add-modal.png', fullPage: true });

    // Should NOT have user_preferences error at this point
    const hasUserPreferencesError2 = consoleErrors.some(e => e.includes('user_preferences'));
    console.log('user_preferences errors:', consoleErrors.filter(e => e.includes('user_preferences')));
    expect(hasUserPreferencesError2).toBe(false);
  });

  test('Create playlist from template without errors', async ({ page }) => {
    await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
    await page.waitForLoadState('networkidle');

    // Click Add Playlist
    const addButton = page.locator('button').filter({ hasText: /add playlist/i }).first();
    await addButton.click();

    // Click "Start from Template" button specifically
    const templateButton = page.locator('button:has-text("Start from Template")');
    await expect(templateButton).toBeVisible({ timeout: 5000 });
    await templateButton.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/playlist-template-options.png', fullPage: true });

    // Check for user_preferences error
    const hasUserPreferencesError = consoleErrors.some(e => e.includes('user_preferences'));
    console.log('Console errors after template click:', consoleErrors);
    expect(hasUserPreferencesError).toBe(false);
  });

  test('Open existing playlist without media_assets relationship error', async ({ page }) => {
    await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
    await page.waitForLoadState('networkidle');

    // Look for the "Lobby Display" playlist row
    const playlistRow = page.locator('tr:has-text("Lobby Display")');

    if (await playlistRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playlistRow.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/playlist-detail.png', fullPage: true });

      // Check for media_assets relationship error
      const hasMediaAssetsError = consoleErrors.some(e =>
        e.includes('media_assets') && e.includes('relationship')
      );
      console.log('Console errors after opening playlist:', consoleErrors);
      expect(hasMediaAssetsError).toBe(false);

      // Also verify we're on the playlist editor page
      const isEditorPage = await page.locator('h1, h2').filter({ hasText: /Lobby Display|Edit Playlist/i }).first().isVisible().catch(() => false);
      console.log('On playlist editor page:', isEditorPage);
    } else {
      console.log('No existing playlist found to test');
    }
  });
});
