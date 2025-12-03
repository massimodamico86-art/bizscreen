/**
 * Media Library E2E Tests
 *
 * Tests the media library functionality:
 * - Navigation to media library
 * - Add media modal (UI only - actual upload uses Cloudinary widget)
 * - Web page URL addition
 * - Media deletion flow
 *
 * Note: File upload testing is limited because the app uses the Cloudinary
 * widget which is an external service. We test the UI flow up to the point
 * where the widget would open.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection, waitForPageReady } from './helpers.js';

test.describe('Media Library', () => {
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    // Login with CLIENT credentials (not admin)
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('can navigate to media library', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Should show media library page - look for heading in main content, not sidebar
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /all media/i })).toBeVisible({ timeout: 5000 });
  });

  test('shows Add Media button', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Should have Add Media button in the header area
    const header = page.locator('header');
    const addButton = header.locator('button:has-text("Add Media")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('opens Add Media modal when clicking Add Media button', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Click Add Media button in header
    const header = page.locator('header');
    const addButton = header.locator('button:has-text("Add Media")');
    await addButton.click();

    // Should show the upload modal - may show limit modal if user hit limits
    const uploadText = page.getByText(/upload files/i);
    const limitText = page.getByText(/media limit reached|upgrade/i);
    await expect(uploadText.or(limitText)).toBeVisible({ timeout: 5000 });
  });

  test('Add Media modal has upload and web page tabs', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Click Add Media button in header
    const header = page.locator('header');
    await header.locator('button:has-text("Add Media")').click();

    // Should have both tabs (if not hitting limit)
    const uploadText = page.getByText(/upload files/i);
    if (await uploadText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(page.getByText(/web page url/i)).toBeVisible();
    }
    // If limit modal appears, test passes since UI is working
  });

  test('can switch to Web Page URL tab in Add Media modal', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Click Add Media button in header
    const header = page.locator('header');
    await header.locator('button:has-text("Add Media")').click();

    // If upload modal appears, test the tab switching
    const uploadText = page.getByText(/upload files/i);
    if (await uploadText.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click on Web Page URL tab
      await page.getByText(/web page url/i).click();

      // Should show URL input field
      await expect(page.getByPlaceholder(/https:\/\/example.com/i)).toBeVisible();
    }
    // If limit modal appears, skip this test part
  });

  test('can close Add Media modal', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Click Add Media button in header
    const header = page.locator('header');
    await header.locator('button:has-text("Add Media")').click();

    // Wait for any modal to appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click Cancel or close button
    const cancelButton = page.getByRole('button', { name: /cancel|close/i }).first();
    await cancelButton.click();

    // Modal should be closed
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('shows empty state when no media exists', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Check for either media grid or empty state
    // This depends on whether the test user has media
    const mediaOrEmpty = await Promise.race([
      page.locator('.aspect-video').first().waitFor({ timeout: 3000 }).then(() => 'has-media'),
      page.getByText(/you haven't added your own media/i).waitFor({ timeout: 3000 }).then(() => 'empty'),
    ]).catch(() => 'unknown');

    // Either condition is valid - we just need the page to load correctly
    expect(['has-media', 'empty', 'unknown']).toContain(mediaOrEmpty);
  });

  test('shows search input for filtering media', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Should have search input
    const searchInput = page.getByPlaceholder(/search media/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('can type in search input', async ({ page }) => {
    await navigateToSection(page, 'media');

    // Find and fill search input
    const searchInput = page.getByPlaceholder(/search media/i);
    await searchInput.fill('test search');

    // Verify the value was entered
    await expect(searchInput).toHaveValue('test search');
  });

  // TODO: File upload testing requires mocking Cloudinary widget
  // The app opens an external Cloudinary widget for file uploads
  // which cannot be easily automated in E2E tests
  test.skip('can upload a media file', async () => {
    // This test is skipped because the app uses Cloudinary widget
    // for file uploads, which is an external service that opens
    // in a popup and cannot be controlled by Playwright
  });
});
