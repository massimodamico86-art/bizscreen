/**
 * Enterprise Security E2E Tests
 */
import { test, expect } from '@playwright/test';

test.describe('Enterprise Security', () => {
  // These tests require an enterprise account
  test.skip(({ browserName }) => !process.env.TEST_ENTERPRISE_EMAIL, 'Enterprise credentials not configured');

  test.beforeEach(async ({ page }) => {
    if (process.env.TEST_ENTERPRISE_EMAIL && process.env.TEST_ENTERPRISE_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_ENTERPRISE_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_ENTERPRISE_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });
    }
  });

  test('shows Enterprise button in navigation', async ({ page }) => {
    await expect(page.getByRole('button', { name: /enterprise/i })).toBeVisible({ timeout: 5000 });
  });

  test('can access Enterprise Security page', async ({ page }) => {
    await page.getByRole('button', { name: /enterprise/i }).click();

    // Should show enterprise security options
    await expect(page.getByText(/security|sso|compliance/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows SSO configuration section', async ({ page }) => {
    await page.getByRole('button', { name: /enterprise/i }).click();

    // Should have SSO section
    await expect(page.getByText(/sso|single.*sign.*on|saml/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows SCIM provisioning section', async ({ page }) => {
    await page.getByRole('button', { name: /enterprise/i }).click();

    // Should have SCIM section
    await expect(page.getByText(/scim|user.*provisioning|directory/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows compliance section', async ({ page }) => {
    await page.getByRole('button', { name: /enterprise/i }).click();

    // Should have compliance/data export section
    await expect(page.getByText(/compliance|export|audit/i)).toBeVisible({ timeout: 5000 });
  });

  test('SSO form has required fields', async ({ page }) => {
    await page.getByRole('button', { name: /enterprise/i }).click();

    // Look for SSO configuration fields
    const ssoSection = page.getByText(/sso|saml/i).first();
    if (await ssoSection.isVisible()) {
      // Should have IdP URL field
      await expect(page.getByText(/idp.*url|identity.*provider|metadata/i)).toBeVisible();
    }
  });
});

test.describe('Enterprise Security - Super Admin', () => {
  test.skip(({ browserName }) => !process.env.TEST_SUPERADMIN_EMAIL, 'Super admin credentials not configured');

  test.beforeEach(async ({ page }) => {
    if (process.env.TEST_SUPERADMIN_EMAIL && process.env.TEST_SUPERADMIN_PASSWORD) {
      await page.goto('/');
      await page.getByPlaceholder(/email/i).fill(process.env.TEST_SUPERADMIN_EMAIL);
      await page.getByPlaceholder(/password/i).fill(process.env.TEST_SUPERADMIN_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('**/*', { timeout: 10000 });
    }
  });

  test('super admin can access enterprise features', async ({ page }) => {
    // Super admin should be able to impersonate and view enterprise features
    await expect(page.getByText(/admin|dashboard|tenants/i)).toBeVisible({ timeout: 5000 });
  });
});
