/**
 * Audit Logs E2E Tests
 * Phase 18: Tests for audit logs and system events pages
 */
import { test, expect } from '@playwright/test';

test.describe('Audit Logs', () => {
  // Only run on chromium-superadmin project - requires superadmin session
  // Uses storageState auth from playwright config - no manual login needed
  test.use({ storageState: 'playwright/.auth/superadmin.json' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-superadmin', 'Superadmin-only test');
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');
  });

  test('shows Audit Logs navigation item for super admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /audit.*logs/i })).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to Audit Logs page', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();

    // Should show audit logs header
    await expect(page.getByText(/audit.*logs/i).first()).toBeVisible({ timeout: 5000 });
  });

  // Re-enabled from test.fixme: Refresh/Filters buttons confirmed in AdminAuditLogsPage.jsx (Phase 43 triage)
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
    await expect(page.getByText(/event.*type/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/entity.*type/i)).toBeVisible({ timeout: 5000 });
  });

  test('filter panel has date range inputs', async ({ page }) => {
    await page.getByRole('button', { name: /audit.*logs/i }).click();
    await page.getByRole('button', { name: /filters/i }).click();
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
  // Only run on chromium-superadmin project
  // Uses storageState auth from playwright config - no manual login needed
  test.use({ storageState: 'playwright/.auth/superadmin.json' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-superadmin', 'Superadmin-only test');
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');
  });

  test('shows System Events navigation item for super admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /system.*events/i })).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to System Events page', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    // Should show system events header
    await expect(page.getByText(/system.*events/i).first()).toBeVisible({ timeout: 5000 });
  });

  // Re-enabled from test.fixme: Refresh button confirmed in AdminSystemEventsPage.jsx (Phase 43 triage)
  test('system events page has refresh button', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible({ timeout: 5000 });
  });

  test('system events page has severity filters', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();

    // Should show severity quick filters
    await expect(page.getByText(/debug|info|warning|error|critical/i).first()).toBeVisible({ timeout: 5000 });
  });

  // Re-enabled from test.fixme: Filters button confirmed in AdminSystemEventsPage.jsx (Phase 43 triage)
  test('system events page has filters button', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();
    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible({ timeout: 5000 });
  });

  test('clicking filters shows filter panel with source and severity', async ({ page }) => {
    await page.getByRole('button', { name: /system.*events/i }).click();
    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByText(/source/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/severity/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Audit Logs - Access Control', () => {
  // Only run on chromium (client) project - tests non-admin access
  // Uses storageState auth - client should NOT see admin nav items
  test.use({ storageState: 'playwright/.auth/client.json' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');
  });

  test('non-super-admin cannot access audit logs page', async ({ page }) => {
    // Wait for sidebar to appear (indicates auth succeeded)
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      test.skip(true, 'Sidebar not visible - auth may have failed');
    });

    // Audit Logs nav item should not be visible for regular users
    await expect(page.getByRole('button', { name: /audit.*logs/i })).not.toBeVisible({ timeout: 2000 });
  });

  test('non-super-admin cannot access system events page', async ({ page }) => {
    // Wait for sidebar to appear (indicates auth succeeded)
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      test.skip(true, 'Sidebar not visible - auth may have failed');
    });

    // System Events nav item should not be visible for regular users
    await expect(page.getByRole('button', { name: /system.*events/i })).not.toBeVisible({ timeout: 2000 });
  });
});
