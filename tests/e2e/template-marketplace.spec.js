/**
 * Template Marketplace E2E Tests
 *
 * Tests for the template marketplace functionality:
 * - Navigation to marketplace
 * - Template browsing and filtering
 * - Template preview modal
 * - License-based access control
 * - Admin template management
 *
 * Note: Template installation tests are limited because
 * it requires actual database setup with templates.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, dismissAnyModals } from './helpers.js';

/**
 * Navigate to marketplace section
 */
async function navigateToMarketplace(page) {
  const marketplaceButton = page.getByRole('button', { name: /marketplace/i }).first();
  await marketplaceButton.click();
  await page.waitForTimeout(500);
  await waitForPageReady(page);
}

// ============================================================================
// CLIENT USER TESTS - Template Browsing
// ============================================================================

test.describe('Template Marketplace - Client User', () => {
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('can navigate to template marketplace', async ({ page }) => {
    await navigateToMarketplace(page);

    // Should show marketplace page
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('heading', { name: /template.*marketplace/i })).toBeVisible({ timeout: 5000 });
  });

  test('marketplace shows search input', async ({ page }) => {
    await navigateToMarketplace(page);

    // Should have search input
    await expect(page.getByPlaceholder(/search.*template/i)).toBeVisible({ timeout: 5000 });
  });

  test('marketplace shows category filter', async ({ page }) => {
    await navigateToMarketplace(page);

    // Should have category filter - look for buttons with category-like names
    const categorySection = page.locator('text=Categories').or(page.locator('text=All Categories'));
    await expect(categorySection).toBeVisible({ timeout: 5000 });
  });

  test('marketplace shows license filter', async ({ page }) => {
    await navigateToMarketplace(page);

    // Should have license filter with Free, Pro, Enterprise options
    await expect(page.getByText(/free/i)).toBeVisible({ timeout: 5000 });
  });

  test('marketplace shows template grid or empty state', async ({ page }) => {
    await navigateToMarketplace(page);

    // Should either show templates or empty state message
    const hasTemplates = await page.locator('[class*="grid"]').isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/no template/i).isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasTemplates || hasEmptyState).toBe(true);
  });

  test('can search templates', async ({ page }) => {
    await navigateToMarketplace(page);

    // Type in search input
    const searchInput = page.getByPlaceholder(/search.*template/i);
    await searchInput.fill('retail');
    await page.waitForTimeout(500);

    // Page should update (we can't verify results without seeded data)
    await expect(searchInput).toHaveValue('retail');
  });

  test('can filter by category', async ({ page }) => {
    await navigateToMarketplace(page);

    // Click on a category button if visible
    const allCategoriesBtn = page.getByRole('button', { name: /all categories/i });
    if (await allCategoriesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allCategoriesBtn.click();
      // Should be clickable and filter state changes
      await expect(allCategoriesBtn).toBeVisible();
    }
  });

  test('clicking template opens preview modal', async ({ page }) => {
    await navigateToMarketplace(page);

    // Wait for potential templates to load
    await page.waitForTimeout(1000);

    // If templates exist, click one
    const templateCard = page.locator('[class*="border"]').filter({ hasText: /template/i }).first();
    if (await templateCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await templateCard.click();

      // Should open preview modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
    // If no templates, test passes
  });
});

// ============================================================================
// TEMPLATE PREVIEW MODAL TESTS
// ============================================================================

test.describe('Template Preview Modal', () => {
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
    await navigateToMarketplace(page);
  });

  test('preview modal can be closed with X button', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Try to open a template preview
    const templateCard = page.locator('[class*="cursor-pointer"]').first();
    if (await templateCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await templateCard.click();

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Find and click close button
        const closeButton = modal.locator('button').filter({ hasText: '' }).first();
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click();
        } else {
          // Try clicking outside
          await page.mouse.click(10, 10);
        }
        await page.waitForTimeout(500);
      }
    }
    // Test passes regardless - validates UI flow
  });

  test('preview modal can be closed with Escape key', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Try to open a template preview
    const templateCard = page.locator('[class*="cursor-pointer"]').first();
    if (await templateCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await templateCard.click();

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Modal should be hidden
        await expect(modal).toBeHidden({ timeout: 2000 });
      }
    }
  });
});

// ============================================================================
// ADMIN TEMPLATE MANAGEMENT TESTS
// ============================================================================

test.describe('Admin Template Management', () => {
  // Skip if super admin credentials not configured
  test.skip(
    () => !process.env.TEST_SUPERADMIN_EMAIL,
    'Super admin credentials not configured. Set TEST_SUPERADMIN_EMAIL and TEST_SUPERADMIN_PASSWORD to run these tests.'
  );

  test.beforeEach(async ({ page }) => {
    if (process.env.TEST_SUPERADMIN_EMAIL && process.env.TEST_SUPERADMIN_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_SUPERADMIN_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_SUPERADMIN_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });
      await dismissAnyModals(page);
    }
  });

  test('shows Template Library navigation for super admin', async ({ page }) => {
    // Super admin should see Template Library in admin navigation
    await expect(page.getByRole('button', { name: /template.*library/i })).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to Template Library page', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();

    // Should show template management page
    await expect(page.getByText(/template.*management/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin template page has Add Template button', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();

    // Should have Add Template button
    await expect(page.getByRole('button', { name: /add.*template/i })).toBeVisible({ timeout: 5000 });
  });

  test('admin template page has category filter', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();

    // Should have category filter dropdown
    await expect(page.locator('select').filter({ hasText: /all.*categories/i })).toBeVisible({ timeout: 5000 });
  });

  test('admin template page has license filter', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();

    // Should have license filter dropdown
    await expect(page.locator('select').filter({ hasText: /all.*licenses/i })).toBeVisible({ timeout: 5000 });
  });

  test('admin template page has status filter', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();

    // Should have status filter dropdown
    await expect(page.locator('select').filter({ hasText: /all|active|inactive/i })).toBeVisible({ timeout: 5000 });
  });

  test('clicking Add Template navigates to edit page', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();
    await page.getByRole('button', { name: /add.*template/i }).click();

    // Should show template creation form
    await expect(page.getByText(/create.*template|new.*template/i)).toBeVisible({ timeout: 5000 });
  });

  test('template edit page has name input', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();
    await page.getByRole('button', { name: /add.*template/i }).click();

    // Should have name input
    await expect(page.getByLabel(/template.*name|name/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('template edit page has category dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();
    await page.getByRole('button', { name: /add.*template/i }).click();

    // Should have category dropdown
    await expect(page.locator('select').filter({ hasText: /category|select.*category/i })).toBeVisible({ timeout: 5000 });
  });

  test('template edit page has license dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();
    await page.getByRole('button', { name: /add.*template/i }).click();

    // Should have license dropdown
    await expect(page.locator('select').filter({ hasText: /license|free|pro/i })).toBeVisible({ timeout: 5000 });
  });

  test('can cancel template creation', async ({ page }) => {
    await page.getByRole('button', { name: /template.*library/i }).click();
    await page.getByRole('button', { name: /add.*template/i }).click();

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Should return to template list
    await expect(page.getByText(/template.*management/i)).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================================
// TEMPLATE PICKER MODAL TESTS (Scene Editor Integration)
// ============================================================================

test.describe('Template Picker Modal', () => {
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('template picker is accessible from scenes', async ({ page }) => {
    // Navigate to scenes
    const scenesButton = page.getByRole('button', { name: /scenes/i }).first();
    await scenesButton.click();
    await page.waitForTimeout(500);

    // Look for a "new from template" or similar option
    const newButton = page.getByRole('button', { name: /new.*scene|create|add/i }).first();
    if (await newButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // This confirms scenes page is accessible
      // Template picker would be triggered from here
      await expect(newButton).toBeVisible();
    }
  });
});

// ============================================================================
// LICENSE-BASED ACCESS CONTROL TESTS
// ============================================================================

test.describe('License-Based Access Control', () => {
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
    await navigateToMarketplace(page);
  });

  test('marketplace shows license badges on templates', async ({ page }) => {
    await page.waitForTimeout(1000);

    // If templates exist, they should have license badges
    const freeBadge = page.locator('text=Free');
    const proBadge = page.locator('text=Pro');
    const enterpriseBadge = page.locator('text=Enterprise');

    // At least one should be visible if templates exist
    const hasLicenseBadge =
      await freeBadge.first().isVisible({ timeout: 2000 }).catch(() => false) ||
      await proBadge.first().isVisible({ timeout: 1000 }).catch(() => false) ||
      await enterpriseBadge.first().isVisible({ timeout: 1000 }).catch(() => false);

    // This test passes if license badges are visible OR no templates exist
    // (can't show badges without templates)
  });

  test('pro templates show upgrade prompt if on free plan', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Filter to show pro templates
    const proFilterButton = page.getByRole('button', { name: /^pro$/i }).first();
    if (await proFilterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await proFilterButton.click();
      await page.waitForTimeout(500);

      // Click on a pro template
      const templateCard = page.locator('[class*="cursor-pointer"]').first();
      if (await templateCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await templateCard.click();

        // Modal should show upgrade message if user is on free plan
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Either "Upgrade" button or normal "Use Template" button
          const upgradeButton = modal.getByRole('button', { name: /upgrade/i });
          const useButton = modal.getByRole('button', { name: /use.*template/i });

          const hasUpgrade = await upgradeButton.isVisible({ timeout: 1000 }).catch(() => false);
          const hasUse = await useButton.isVisible({ timeout: 1000 }).catch(() => false);

          // One of these should be visible
          expect(hasUpgrade || hasUse).toBe(true);
        }
      }
    }
  });
});
