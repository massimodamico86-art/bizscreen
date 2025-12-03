/**
 * Billing & Plans E2E Tests
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('Billing & Plans', () => {
  test.skip(({ browserName }) => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('can access Plan & Limits page', async ({ page }) => {
    // Click on Plan & Limits in sidebar - use text locator for nested span
    const planButton = page.locator('button:has-text("Plan & Limits")').first();
    await planButton.scrollIntoViewIfNeeded();
    await planButton.click();

    // Should show plan information
    await expect(page.getByText(/plan|subscription|billing/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('shows current plan information', async ({ page }) => {
    const planButton = page.locator('button:has-text("Plan & Limits")').first();
    await planButton.scrollIntoViewIfNeeded();
    await planButton.click();

    // Should display plan tier - look for plan name in main content area
    const mainContent = page.locator('main');
    const planIndicator = mainContent.getByText(/free|starter|pro|enterprise|trial/i).first();
    await expect(planIndicator).toBeVisible({ timeout: 5000 });
  });

  test('shows usage limits', async ({ page }) => {
    const planButton = page.locator('button:has-text("Plan & Limits")').first();
    await planButton.scrollIntoViewIfNeeded();
    await planButton.click();

    // Should show usage limits section - look for limit indicators in main content
    const mainContent = page.locator('main');
    const usageIndicator = mainContent.getByText(/limit|usage|of \d+|remaining|included/i).first();
    await expect(usageIndicator).toBeVisible({ timeout: 5000 });
  });

  test('shows upgrade options if on free plan', async ({ page }) => {
    const planButton = page.locator('button:has-text("Plan & Limits")').first();
    await planButton.scrollIntoViewIfNeeded();
    await planButton.click();

    // Should have upgrade button if applicable
    const upgradeButton = page.getByRole('button', { name: /upgrade/i });
    if (await upgradeButton.isVisible()) {
      await expect(upgradeButton).toBeEnabled();
    }
  });

  test('displays plan comparison', async ({ page }) => {
    const planButton = page.locator('button:has-text("Plan & Limits")').first();
    await planButton.scrollIntoViewIfNeeded();
    await planButton.click();

    // Should show plan features or comparison
    await expect(page.getByText(/features|included|limits/i).first()).toBeVisible({ timeout: 5000 });
  });
});
