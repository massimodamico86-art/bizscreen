/**
 * Enterprise SSO Configuration E2E Tests (ENTR-01)
 *
 * Tests the SAML SSO configuration flow on the Enterprise Security page,
 * covering SSO tab navigation, provider type selection (OIDC and SAML 2.0),
 * form fields, auto-discover functionality, and common SSO settings.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, dismissAnyModals } from './helpers.js';

test.describe('Enterprise SSO Configuration (ENTR-01)', () => {
  test.skip(() => !process.env.TEST_ENTERPRISE_EMAIL, 'Enterprise credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_ENTERPRISE_EMAIL,
      password: process.env.TEST_ENTERPRISE_PASSWORD,
    });

    // Navigate to Enterprise Security page
    await page.getByRole('button', { name: /enterprise/i }).click();
    await waitForPageReady(page);
  });

  test('SSO tab is active by default with configuration form', async ({ page }) => {
    // SSO tab should be selected by default
    const ssoTab = page.getByRole('tab', { name: /single sign-on/i });
    await expect(ssoTab).toHaveAttribute('aria-selected', 'true');

    // SSO Configuration heading and subtext should be visible
    await expect(page.getByText('SSO Configuration')).toBeVisible();

    // Provider Type selector should be present
    await expect(page.getByText('Provider Type')).toBeVisible();
  });

  test('can select OpenID Connect provider type and see OIDC fields', async ({ page }) => {
    // Click the OpenID Connect provider type button
    await page.getByText('OpenID Connect').click();

    // Verify OIDC-specific fields are visible
    await expect(page.getByText('Issuer URL')).toBeVisible();
    await expect(page.getByPlaceholder('https://your-org.okta.com')).toBeVisible();
    await expect(page.getByText('Auto-discover')).toBeVisible();
    await expect(page.getByText('Client ID')).toBeVisible();
    await expect(page.getByText('Client Secret')).toBeVisible();
    await expect(page.getByText(/Callback URL/i)).toBeVisible();
  });

  test('can select SAML 2.0 provider type and see SAML fields', async ({ page }) => {
    // Click the SAML 2.0 provider type button
    await page.getByText('SAML 2.0').click();

    // Verify SAML-specific fields are visible
    await expect(page.getByText('Metadata URL')).toBeVisible();
    await expect(page.getByPlaceholder('https://idp.example.com/metadata.xml')).toBeVisible();
    await expect(page.getByText(/Full SAML support requires/i)).toBeVisible();
  });

  test('SSO common settings are present', async ({ page }) => {
    // Verify common SSO settings are visible regardless of provider type
    await expect(page.getByText('Default Role for New Users')).toBeVisible();
    await expect(page.getByText('Auto-create Users')).toBeVisible();
    await expect(page.getByText('Enforce SSO Only')).toBeVisible();
  });

  test('Save Configuration button exists', async ({ page }) => {
    // Verify the save button is present
    await expect(page.getByRole('button', { name: /save configuration/i })).toBeVisible();
  });
});
