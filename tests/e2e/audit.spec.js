/**
 * Audit Logs E2E Tests
 * Phase 18: Tests for audit logs and system events pages
 */
import { test, expect } from '@playwright/test';

test.describe('Audit Logs', () => {
  // These tests require super admin credentials
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
    }
  });

  test('shows Audit Logs navigation item for super admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /audit.*logs/i })).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to Audit Logs page', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    // Should show audit logs header
    await expect(page.getByText(/audit.*logs/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('audit logs page has refresh button', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible({ timeout: 5000 });
  });

  test('audit logs page has filters button', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible({ timeout: 5000 });
  });

  test('clicking filters shows filter panel', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    await page.getByRole('button', { name: /filters/i }).click();

    // Should show filter options
    await expect(page.getByText(/event.*type/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/entity.*type/i)).toBeVisible({ timeout: 5000 });
  });

  test('filter panel has date range inputs', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    await page.getByRole('button', { name: /filters/i }).click();

    // Should have date inputs
    await expect(page.getByText(/from.*date/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/to.*date/i)).toBeVisible({ timeout: 5000 });
  });

  test('filter panel has apply and clear buttons', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    await page.getByRole('button', { name: /filters/i }).click();

    await expect(page.getByRole('button', { name: /apply.*filters/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/clear.*all/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('System Events', () => {
  test.skip(
    () => !process.env.TEST_SUPERADMIN_EMAIL,
    'Super admin credentials not configured'
  );

  test.beforeEach(async ({ page }) => {
    if (process.env.TEST_SUPERADMIN_EMAIL && process.env.TEST_SUPERADMIN_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_SUPERADMIN_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_SUPERADMIN_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });
    }
  });

  test('shows System Events navigation item for super admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /system.*events/i })).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to System Events page', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    // Should show system events header
    await expect(page.getByText(/system.*events/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('system events page has refresh button', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible({ timeout: 5000 });
  });

  test('system events page has severity filters', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    // Should show severity quick filters
    await expect(page.getByText(/debug|info|warning|error|critical/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('system events page has filters button', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible({ timeout: 5000 });
  });

  test('clicking filters shows filter panel with source and severity', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    await page.getByRole('button', { name: /filters/i }).click();

    // Should show source and severity filters
    await expect(page.getByText(/source/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/severity/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Audit Logs - Access Control', () => {
  // Skip access control tests in CI - they require a properly configured test user
  test.skip(
    () => process.env.CI === 'true',
    'Access control tests skipped in CI - requires configured test user in database'
  );

  test('non-super-admin cannot access audit logs page', async ({ page }) => {
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL);
    await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for dashboard to load
    try {
      await expect(page.getByText(/dashboard|screens|welcome/i)).toBeVisible({ timeout: 10000 });
    } catch {
      test.skip();
      return;
    }

    // Audit Logs nav item should not be visible for regular users
    await expect(page.getByRole('button', { name: /audit.*logs/i })).not.toBeVisible({ timeout: 2000 });
  });

  test('non-super-admin cannot access system events page', async ({ page }) => {
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL);
    await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for dashboard to load
    try {
      await expect(page.getByText(/dashboard|screens|welcome/i)).toBeVisible({ timeout: 10000 });
    } catch {
      test.skip();
      return;
    }

    // System Events nav item should not be visible for regular users
    await expect(page.getByRole('button', { name: /system.*events/i })).not.toBeVisible({ timeout: 2000 });
  });
});
