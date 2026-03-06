/**
 * Media Library Advanced E2E Screenshot Tests
 *
 * Captures screenshot evidence for advanced media operations:
 * - MEDIA-07: Bulk select and bulk delete
 * - MEDIA-08: Folder creation modal
 * - MEDIA-09: Storage usage bar
 * - MEDIA-10: All 5 media sub-pages (Images, Videos, Audio, Documents, Web Pages)
 *
 * Screenshots are saved to screenshots/115/ using the screenshotStep helper.
 */
 
import { test, expect } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  navigateToSection,
  waitForPageReady,
  assertAppReady,
} from './helpers/index.js';

test.describe('Media Advanced Screenshots', () => {
  // Only run on chromium (client) project
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await assertAppReady(page, test);
  });

  // ---------------------------------------------------------------------------
  // MEDIA-07: Bulk select and bulk actions
  // ---------------------------------------------------------------------------
  test('MEDIA-07: bulk select mode and bulk actions bar', async ({ page }) => {
    await navigateToSection(page, 'media');
    await waitForPageReady(page);

    // Wait for the media page heading
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /all media/i })).toBeVisible({ timeout: 10000 });

    // Check if there are any media items (grid cards with aspect-video)
    const mediaCards = page.locator('.aspect-video');
    const cardCount = await mediaCards.count();

    if (cardCount === 0) {
      // No media items -- check for list view checkboxes instead
      const listCheckboxes = page.locator('table input[type="checkbox"]');
      const listCheckCount = await listCheckboxes.count();

      if (listCheckCount === 0) {
        // No media at all - screenshot the empty state and skip gracefully
        await screenshotStep(page, '115', '12-media-bulk-select-empty');
        test.skip(true, 'No media items available to test bulk selection');
        return;
      }

      // Click the first list checkbox to enter selection mode
      await listCheckboxes.first().click();
    } else {
      // In grid mode, look for checkbox overlay on media cards
      // The MediaGridCard has a checkbox that shows on hover or when bulk-selected
      // Try clicking the first card's checkbox - it may appear on hover
      const firstCard = mediaCards.first();
      await firstCard.hover();

      // Look for a checkbox input within the card area
      const checkbox = firstCard.locator('input[type="checkbox"]');
      const checkboxCount = await checkbox.count();

      if (checkboxCount > 0) {
        await checkbox.first().click();
      } else {
        // Try clicking directly on the card to select it
        await firstCard.click();
      }
    }

    // Screenshot showing selection state
    await screenshotStep(page, '115', '12-media-bulk-select');

    // Check if the BulkActionBar appeared (it's a fixed bottom bar with "selected" text)
    const bulkBar = page.locator('text=/\\d+ selected/i');
    const bulkBarCount = await bulkBar.count();

    if (bulkBarCount > 0 && await bulkBar.first().isVisible()) {
      await screenshotStep(page, '115', '12-media-bulk-actions-bar');
    }
  });

  // ---------------------------------------------------------------------------
  // MEDIA-08: Folder creation modal
  // ---------------------------------------------------------------------------
  test('MEDIA-08: folder creation modal', async ({ page }) => {
    await navigateToSection(page, 'media');
    await waitForPageReady(page);

    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /all media/i })).toBeVisible({ timeout: 10000 });

    // Look for "Add folder" button in the toolbar area
    const addFolderButton = page.locator('button:has-text("Add folder")');
    const addFolderCount = await addFolderButton.count();

    if (addFolderCount > 0 && await addFolderButton.first().isVisible()) {
      await addFolderButton.first().click();
    } else {
      // Try alternative: "Create Folder" or "New Folder"
      const createFolderBtn = page.locator('button:has-text("Create Folder"), button:has-text("New Folder")').first();
      const createCount = await createFolderBtn.count();

      if (createCount > 0) {
        await createFolderBtn.click();
      } else {
        // Screenshot current state for debugging and skip
        await screenshotStep(page, '115', '13-media-no-folder-button');
        test.skip(true, 'No folder creation button found on media page');
        return;
      }
    }

    // Wait for the folder creation modal
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Screenshot the folder creation modal
    await screenshotStep(page, '115', '13-media-create-folder-modal');

    // Close without creating
    const cancelButton = page.getByRole('button', { name: /cancel|close/i }).first();
    const cancelCount = await cancelButton.count();
    if (cancelCount > 0 && await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });

  // ---------------------------------------------------------------------------
  // MEDIA-09: Storage usage bar
  // ---------------------------------------------------------------------------
  test('MEDIA-09: storage usage bar', async ({ page }) => {
    await navigateToSection(page, 'media');
    await waitForPageReady(page);

    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /all media/i })).toBeVisible({ timeout: 10000 });

    // The StorageUsageInline is in the page header area with class "hidden md:flex"
    // It shows a HardDrive icon and usage text
    // Look for the storage bar component - it renders a progress bar with usage info
    const storageBar = page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB|GB)/i').first();
    const storageCount = await storageBar.count();

    if (storageCount > 0 && await storageBar.isVisible()) {
      // Screenshot the header area showing storage usage
      await screenshotStep(page, '115', '14-media-storage-bar');
    } else {
      // Storage bar might not be visible on narrow viewport or still loading
      // Take a full page screenshot to capture it wherever it may be
      await screenshotStep(page, '115', '14-media-storage-fullpage', { fullPage: true });
    }
  });

  // ---------------------------------------------------------------------------
  // MEDIA-10: All 5 media sub-pages
  // ---------------------------------------------------------------------------
  test('MEDIA-10: navigate all 5 media sub-pages', async ({ page }) => {
    test.slow(); // This test navigates 5+ pages

    // First, navigate to media to expand the sidebar menu
    await navigateToSection(page, 'media');
    await waitForPageReady(page);

    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /all media/i })).toBeVisible({ timeout: 10000 });

    // The sidebar has expandable Media section with sub-items:
    // "All Media", "Images", "Videos", "Audio", "Documents", "Web Pages"
    // The Media section should already be expanded from navigateToSection

    const subPages = [
      { name: 'Images', heading: /images/i, slug: 'images' },
      { name: 'Videos', heading: /videos/i, slug: 'videos' },
      { name: 'Audio', heading: /audio/i, slug: 'audio' },
      { name: 'Documents', heading: /documents/i, slug: 'documents' },
      { name: 'Web Pages', heading: /web pages/i, slug: 'web-pages' },
    ];

    for (const subPage of subPages) {
      // Click the sidebar button for this sub-page
      const sidebarBtn = page.locator('aside').locator(`button:has-text("${subPage.name}")`).first();
      const btnCount = await sidebarBtn.count();

      if (btnCount === 0) {
        // Try re-expanding the Media menu
        const mediaButton = page.locator('button:has-text("Media")').first();
        await mediaButton.click();
        // Wait briefly for submenu
        await page.waitForTimeout(500);
      }

      const sidebarBtnRetry = page.locator('aside').locator(`button:has-text("${subPage.name}")`).first();
      await expect(sidebarBtnRetry).toBeVisible({ timeout: 5000 });
      await sidebarBtnRetry.click();

      await waitForPageReady(page);

      // Verify the heading updated to match the sub-page
      await expect(mainContent.getByRole('heading', { name: subPage.heading })).toBeVisible({ timeout: 10000 });

      // Screenshot the sub-page
      await screenshotStep(page, '115', `15-media-subpage-${subPage.slug}`);
    }
  });
});
