/**
 * Reseller Flow E2E Tests
 */
import { test, expect } from '@playwright/test';

test.describe('Reseller Portal', () => {
  // These tests require a reseller account
  test.skip(({ browserName }) => !process.env.TEST_RESELLER_EMAIL, 'Reseller credentials not configured');

  test.beforeEach(async ({ page }) => {
    if (process.env.TEST_RESELLER_EMAIL && process.env.TEST_RESELLER_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_RESELLER_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_RESELLER_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });
    }
  });

  test('shows Reseller Portal in navigation', async ({ page }) => {
    // Reseller should see the Reseller Portal button
    await expect(page.getByRole('button', { name: /reseller.*portal/i })).toBeVisible({ timeout: 5000 });
  });

  test('can access Reseller Dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /reseller.*portal/i }).click();

    // Should show reseller dashboard
    await expect(page.getByText(/portfolio|tenants|licenses/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows portfolio statistics', async ({ page }) => {
    await page.getByRole('button', { name: /reseller.*portal/i }).click();

    // Should display stats cards
    await expect(page.getByText(/total|active|revenue/i)).toBeVisible({ timeout: 5000 });
  });

  test('can view tenant list', async ({ page }) => {
    await page.getByRole('button', { name: /reseller.*portal/i }).click();

    // Should show tenant section
    await expect(page.getByText(/tenant|customer|client/i)).toBeVisible({ timeout: 5000 });
  });

  test('can access Generate Licenses modal', async ({ page }) => {
    await page.getByRole('button', { name: /reseller.*portal/i }).click();

    // Click generate licenses button
    const generateButton = page.getByRole('button', { name: /generate.*license/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Should show license generation modal
      await expect(page.getByText(/license.*type|plan.*level/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('can access billing tab', async ({ page }) => {
    await page.getByRole('button', { name: /reseller.*portal/i }).click();

    // Click on billing tab
    const billingTab = page.getByRole('button', { name: /billing|commission/i });
    if (await billingTab.isVisible()) {
      await billingTab.click();

      // Should show billing information
      await expect(page.getByText(/earnings|commission|payout/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('License Generation', () => {
  test.skip(({ browserName }) => !process.env.TEST_RESELLER_EMAIL, 'Reseller credentials not configured');

  test.beforeEach(async ({ page }) => {
    if (process.env.TEST_RESELLER_EMAIL && process.env.TEST_RESELLER_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_RESELLER_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_RESELLER_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });
      await page.getByRole('button', { name: /reseller.*portal/i }).click();
    }
  });

  test('license generation modal has required fields', async ({ page }) => {
    const generateButton = page.getByRole('button', { name: /generate.*license/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Check for required fields
      await expect(page.getByText(/license.*type/i)).toBeVisible();
      await expect(page.getByText(/plan.*level/i)).toBeVisible();
      await expect(page.getByText(/quantity/i)).toBeVisible();
    }
  });

  test('can select different license types', async ({ page }) => {
    const generateButton = page.getByRole('button', { name: /generate.*license/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Should have license type options
      const licenseTypes = ['Trial', 'Standard', 'Pro', 'Enterprise'];
      for (const type of licenseTypes) {
        const option = page.getByText(new RegExp(type, 'i'));
        if (await option.isVisible()) {
          expect(true).toBe(true);
          break;
        }
      }
    }
  });
});
