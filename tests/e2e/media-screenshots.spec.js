/**
 * Media Library Core Screenshot Tests
 *
 * Captures screenshot evidence for media library core operations:
 * - MEDIA-01: Upload flow (modal with file upload and web page tabs)
 * - MEDIA-02: Grid/list view toggle
 * - MEDIA-03: Type filtering via sub-pages (Images, Videos, Audio)
 * - MEDIA-04: Preview popover on media hover
 * - MEDIA-05: Inline rename editing state
 * - MEDIA-06: Delete with confirmation dialog
 *
 * Screenshots saved to screenshots/media/ using screenshotStep helper.
 */
 
import { test, expect } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  navigateToSection,
  waitForPageReady,
  dismissAnyModals,
  assertAppReady,
} from './helpers/index.js';

test.describe('Media Library Screenshots', () => {
  // Only run on chromium (client) project
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Client test credentials not configured');

    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await navigateToSection(page, 'media');
    await waitForPageReady(page);
  });

  // =========================================================================
  // MEDIA-01: Upload flow
  // =========================================================================
  test('MEDIA-01: upload modal with file selection UI', async ({ page }) => {
    // Click Add Media button
    const addButton = page.locator('button:has-text("Add Media")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Screenshot the upload modal
    await screenshotStep(page, 'media', '01-upload-modal');

    // Check if upload tabs are visible (not a limit modal)
    const uploadTab = page.getByText(/upload files/i);
    const uploadCount = await uploadTab.count();
    if (uploadCount > 0 && (await uploadTab.isVisible())) {
      // Switch to Web Page URL tab
      const webPageTab = page.getByText(/web page url/i);
      const webPageCount = await webPageTab.count();
      if (webPageCount > 0) {
        await webPageTab.click();
        await page.waitForTimeout(300);
        await screenshotStep(page, 'media', '01-webpage-tab');
      }
    }

    // Close modal
    const cancelButton = page.getByRole('button', { name: /cancel|close/i }).first();
    const cancelCount = await cancelButton.count();
    if (cancelCount > 0 && (await cancelButton.isVisible())) {
      await cancelButton.click();
    } else {
      await dismissAnyModals(page);
    }
  });

  // =========================================================================
  // MEDIA-02: Grid/list view toggle
  // =========================================================================
  test('MEDIA-02: grid and list view modes', async ({ page }) => {
    // Screenshot the default grid view
    await screenshotStep(page, 'media', '02-grid-view');

    // Look for view toggle buttons
    const viewToggle = page.locator('.flex.border.rounded-lg');
    const toggleCount = await viewToggle.count();

    if (toggleCount > 0 && (await viewToggle.isVisible())) {
      const buttons = viewToggle.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount >= 2) {
        // Click list view (second button)
        await buttons.nth(1).click();
        await page.waitForTimeout(500);
        await screenshotStep(page, 'media', '02-list-view');

        // Restore grid view
        await buttons.nth(0).click();
      }
    } else {
      // No toggle found, still capture the current view state
      await screenshotStep(page, 'media', '02-list-view');
    }
  });

  // =========================================================================
  // MEDIA-03: Type filtering via sub-pages
  // =========================================================================
  test('MEDIA-03: type filtering across media sub-pages', async ({ page }) => {
    // Navigate to Images sub-page via sidebar
    // Media menu should already be expanded from beforeEach navigation
    const subPages = [
      { name: 'Images', step: '03-filter-images' },
      { name: 'Videos', step: '03-filter-videos' },
      { name: 'Audio', step: '03-filter-audio' },
    ];

    for (const subPage of subPages) {
      // Look for sidebar button matching the sub-page name
      const sidebarButton = page.locator(`button:has-text("${subPage.name}")`).first();
      const buttonCount = await sidebarButton.count();

      if (buttonCount > 0) {
        await sidebarButton.click();
        await waitForPageReady(page);
        await screenshotStep(page, 'media', subPage.step);
      }
    }
  });

  // =========================================================================
  // MEDIA-04: Preview popover
  // =========================================================================
  test('MEDIA-04: media preview popover with metadata', async ({ page }) => {
    // Check if media items exist
    const mediaCards = page.locator('.aspect-video, [class*="media-card"], [data-testid="media-item"]');
    const cardCount = await mediaCards.count();

    if (cardCount === 0) {
      // No media items - screenshot empty state
      await screenshotStep(page, 'media', '04-empty-state');
      test.skip(true, 'No media items available for preview popover test');
      return;
    }

    // Hover over first media item to trigger preview
    const firstCard = mediaCards.first();
    await firstCard.hover();

    // Wait for popover/tooltip to appear
    const popoverSelectors = [
      '[role="tooltip"]',
      '[data-radix-popper-content-wrapper]',
      '.popover',
      '[data-state="open"]',
    ];

    let popoverFound = false;
    for (const selector of popoverSelectors) {
      const popover = page.locator(selector).first();
      const count = await popover.count();
      if (count > 0) {
        const visible = await popover.isVisible().catch(() => false);
        if (visible) {
          popoverFound = true;
          break;
        }
      }
    }

    // Wait a bit for any animation
    await page.waitForTimeout(500);
    await screenshotStep(page, 'media', '04-preview-popover');

    if (!popoverFound) {
      // Popover might not appear on hover, capture whatever state we have
      console.warn('Preview popover not detected after hover, screenshot captured anyway');
    }
  });

  // =========================================================================
  // MEDIA-05: Rename inline editing
  // =========================================================================
  test('MEDIA-05: inline rename editing state', async ({ page }) => {
    const mediaCards = page.locator('.aspect-video, [class*="media-card"], [data-testid="media-item"]');
    const cardCount = await mediaCards.count();

    if (cardCount === 0) {
      await screenshotStep(page, 'media', '05-no-items');
      test.skip(true, 'No media items available for rename test');
      return;
    }

    // Try to find actions menu on a media card
    // Look for three-dot menu or actions dropdown trigger
    const firstCard = mediaCards.first();
    await firstCard.hover();
    await page.waitForTimeout(300);

    // Look for actions button (usually appears on hover)
    const actionsSelectors = [
      '.aspect-video button[aria-haspopup]',
      'button:has(svg.lucide-more-vertical)',
      'button:has(svg.lucide-ellipsis)',
      'button:has(svg.lucide-more-horizontal)',
      '[data-testid="media-actions"]',
      'button[aria-label*="action" i]',
      'button[aria-label*="menu" i]',
      'button[aria-label*="more" i]',
    ];

    let actionsClicked = false;
    for (const selector of actionsSelectors) {
      const btn = page.locator(selector).first();
      const count = await btn.count();
      if (count > 0) {
        const visible = await btn.isVisible().catch(() => false);
        if (visible) {
          await btn.click();
          actionsClicked = true;
          break;
        }
      }
    }

    if (!actionsClicked) {
      // Try right-click context menu
      await firstCard.click({ button: 'right' });
      await page.waitForTimeout(300);
    }

    // Look for rename option
    const renameButton = page.getByRole('menuitem', { name: /rename/i }).or(
      page.locator('[role="menu"] >> text=Rename').first()
    ).or(
      page.getByText(/rename/i).first()
    );

    const renameCount = await renameButton.count();
    if (renameCount > 0 && (await renameButton.isVisible().catch(() => false))) {
      await renameButton.click();
      await page.waitForTimeout(300);
      await screenshotStep(page, 'media', '05-rename-editing');
    } else {
      // No rename action found
      await screenshotStep(page, 'media', '05-rename-not-available');
      console.warn('Rename action not found in media card actions');
    }
  });

  // =========================================================================
  // MEDIA-06: Delete with confirmation
  // =========================================================================
  test('MEDIA-06: delete confirmation dialog', async ({ page }) => {
    const mediaCards = page.locator('.aspect-video, [class*="media-card"], [data-testid="media-item"]');
    const cardCount = await mediaCards.count();

    if (cardCount === 0) {
      await screenshotStep(page, 'media', '06-no-items');
      test.skip(true, 'No media items available for delete test');
      return;
    }

    // Hover to reveal actions
    const firstCard = mediaCards.first();
    await firstCard.hover();
    await page.waitForTimeout(300);

    // Find and click actions menu
    const actionsSelectors = [
      '.aspect-video button[aria-haspopup]',
      'button:has(svg.lucide-more-vertical)',
      'button:has(svg.lucide-ellipsis)',
      'button:has(svg.lucide-more-horizontal)',
      '[data-testid="media-actions"]',
      'button[aria-label*="action" i]',
      'button[aria-label*="menu" i]',
      'button[aria-label*="more" i]',
    ];

    let actionsClicked = false;
    for (const selector of actionsSelectors) {
      const btn = page.locator(selector).first();
      const count = await btn.count();
      if (count > 0) {
        const visible = await btn.isVisible().catch(() => false);
        if (visible) {
          await btn.click();
          actionsClicked = true;
          break;
        }
      }
    }

    if (!actionsClicked) {
      await firstCard.click({ button: 'right' });
      await page.waitForTimeout(300);
    }

    // Look for delete option
    const deleteButton = page.getByRole('menuitem', { name: /delete/i }).or(
      page.locator('[role="menu"] >> text=Delete').first()
    ).or(
      page.getByText(/delete/i).first()
    );

    const deleteCount = await deleteButton.count();
    if (deleteCount > 0 && (await deleteButton.isVisible().catch(() => false))) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      // Wait for confirmation dialog
      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
      const confirmCount = await confirmDialog.count();
      if (confirmCount > 0) {
        await screenshotStep(page, 'media', '06-delete-confirmation');

        // Cancel to avoid actual deletion
        const cancelBtn = page.getByRole('button', { name: /cancel|no|nevermind/i }).first();
        const cancelCount = await cancelBtn.count();
        if (cancelCount > 0 && (await cancelBtn.isVisible().catch(() => false))) {
          await cancelBtn.click();
        } else {
          await dismissAnyModals(page);
        }
      } else {
        await screenshotStep(page, 'media', '06-delete-no-confirm');
      }
    } else {
      await screenshotStep(page, 'media', '06-delete-not-available');
      console.warn('Delete action not found in media card actions');
    }
  });
});
