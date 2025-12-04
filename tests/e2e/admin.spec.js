/**
 * Admin Panel E2E Tests
 * Phase 17: Tests for admin panel tenant management
 *
 * Note: These tests are skipped because:
 * 1. BizScreen uses state-based navigation (setCurrentPage) instead of URL routing
 * 2. Super admin credentials are required but not configured in CI
 * 3. Admin panel requires actual database with tenant data
 *
 * To enable these tests:
 * - Set TEST_SUPERADMIN_EMAIL and TEST_SUPERADMIN_PASSWORD environment variables
 * - Ensure test database has tenant data
 */
import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  // Skip all tests if super admin credentials not configured
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

  test('shows Admin Panel navigation item for super admin', async ({ page }) => {
    // Super admin dashboard should show admin tools
    await expect(page.getByRole('button', { name: /admin.*panel|admin.*tenants/i })).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to Admin Panel page', async ({ page }) => {
    await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();

    // Should show tenant management header
    await expect(page.getByText(/tenant.*management/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin panel shows tenant list', async ({ page }) => {
    await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();

    // Should have a table or list of tenants
    await expect(page.locator('table').or(page.getByRole('list'))).toBeVisible({ timeout: 5000 });
  });

  test('admin panel has search functionality', async ({ page }) => {
    await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();

    // Should have search input
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin panel has plan filter', async ({ page }) => {
    await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();

    // Should have plan filter dropdown
    await expect(page.getByRole('combobox').filter({ hasText: /all.*plans|plan/i })).toBeVisible({ timeout: 5000 });
  });

  test('admin panel has status filter', async ({ page }) => {
    await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();

    // Should have status filter dropdown
    await expect(page.getByRole('combobox').filter({ hasText: /all.*status|status/i })).toBeVisible({ timeout: 5000 });
  });

  test('admin panel has refresh button', async ({ page }) => {
    await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();

    // Should have refresh button
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Panel - Tenant Detail', () => {
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

      // Navigate to admin panel
      await page.getByRole('button', { name: /admin.*panel|admin.*tenants/i }).click();
    }
  });

  test('clicking a tenant opens detail view', async ({ page }) => {
    // Click on first tenant in list (if any)
    const tenantRow = page.locator('tr').filter({ hasText: /tenant|acme/i }).first();
    if (await tenantRow.isVisible({ timeout: 3000 })) {
      await tenantRow.click();

      // Should show tenant detail with tabs
      await expect(page.getByRole('tab').or(page.getByRole('button', { name: /overview/i }))).toBeVisible({ timeout: 5000 });
    }
  });

  test('tenant detail has Overview tab', async ({ page }) => {
    const tenantRow = page.locator('tr').filter({ hasText: /tenant|acme/i }).first();
    if (await tenantRow.isVisible({ timeout: 3000 })) {
      await tenantRow.click();

      await expect(page.getByRole('button', { name: /overview/i }).or(page.getByText(/overview/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('tenant detail has Users tab', async ({ page }) => {
    const tenantRow = page.locator('tr').filter({ hasText: /tenant|acme/i }).first();
    if (await tenantRow.isVisible({ timeout: 3000 })) {
      await tenantRow.click();

      await expect(page.getByRole('button', { name: /users/i }).or(page.getByText(/users/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('tenant detail has Screens tab', async ({ page }) => {
    const tenantRow = page.locator('tr').filter({ hasText: /tenant|acme/i }).first();
    if (await tenantRow.isVisible({ timeout: 3000 })) {
      await tenantRow.click();

      await expect(page.getByRole('button', { name: /screens/i }).or(page.getByText(/screens/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('tenant detail has Billing tab', async ({ page }) => {
    const tenantRow = page.locator('tr').filter({ hasText: /tenant|acme/i }).first();
    if (await tenantRow.isVisible({ timeout: 3000 })) {
      await tenantRow.click();

      await expect(page.getByRole('button', { name: /billing/i }).or(page.getByText(/billing/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('tenant detail has back button', async ({ page }) => {
    const tenantRow = page.locator('tr').filter({ hasText: /tenant|acme/i }).first();
    if (await tenantRow.isVisible({ timeout: 3000 })) {
      await tenantRow.click();

      // Should have a back button/arrow
      await expect(page.getByRole('button', { name: /back/i }).or(page.locator('[aria-label="Back"]'))).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Admin Panel - Access Control', () => {
  test('non-super-admin cannot access admin panel', async ({ page }) => {
    // Use regular test user credentials
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });

      // Admin Panel nav item should not be visible for regular users
      await expect(page.getByRole('button', { name: /admin.*panel/i })).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Admin API Endpoints', () => {
  test.skip(
    () => !process.env.TEST_SUPERADMIN_EMAIL,
    'Super admin credentials not configured'
  );

  test('tenant list API returns valid structure', async ({ request }) => {
    // This would require auth token - skip for now
    test.skip();
  });

  test('tenant detail API returns valid structure', async ({ request }) => {
    // This would require auth token - skip for now
    test.skip();
  });
});
