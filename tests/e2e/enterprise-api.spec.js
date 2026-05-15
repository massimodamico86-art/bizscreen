/**
 * Enterprise REST API E2E Tests (ENTR-02, ENTR-03)
 *
 * Tests for the REST API gateway token management UI on the Developer Settings page,
 * covering token creation with scoped permissions, token list display,
 * and API endpoint documentation visibility.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, dismissAnyModals } from './helpers.js';

test.describe('Enterprise REST API (ENTR-02, ENTR-03)', () => {
  test.skip(() => !process.env.TEST_ENTERPRISE_EMAIL, 'Enterprise credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_ENTERPRISE_EMAIL,
      password: process.env.TEST_ENTERPRISE_PASSWORD,
    });

    // Navigate to Developer Settings via sidebar
    await page.getByRole('button', { name: /developer/i }).click();
    await waitForPageReady(page);
  });

  test('Developer Settings page loads with API Tokens tab active', async ({ page }) => {
    // Verify the API Tokens tab is selected by default
    const tokensTab = page.getByRole('tab', { name: /api tokens/i });
    await expect(tokensTab).toHaveAttribute('aria-selected', 'true');

    // Verify the API Tokens heading is visible
    const heading = page.locator('h2').filter({ hasText: 'API Tokens' });
    await expect(heading).toBeVisible();
  });

  test('shows API documentation links in info banner', async ({ page }) => {
    // Verify the info banner title
    await expect(page.getByText('Public API & Webhooks')).toBeVisible();

    // Verify documentation links
    await expect(page.getByRole('link', { name: /api reference/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /webhooks guide/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /code examples/i })).toBeVisible();
  });

  test('Create Token button opens modal with name and scope fields', async ({ page }) => {
    // Click the Create Token button (use first() in case empty state also has one)
    await page.getByRole('button', { name: /create token/i }).first().click();

    // Verify modal title
    await expect(page.getByText('Create API Token')).toBeVisible();

    // Verify token name input
    await expect(page.getByPlaceholder(/CI\/CD Pipeline/i)).toBeVisible();

    // Verify scopes section
    await expect(page.getByText('Token Scopes')).toBeVisible();
  });

  test('token creation modal shows all required scopes (ENTR-02)', async ({ page }) => {
    // Open the create token modal
    await page.getByRole('button', { name: /create token/i }).first().click();

    // Verify required scope labels are visible
    await expect(page.getByText('Screens - Read')).toBeVisible();
    await expect(page.getByText('Playlists - Read')).toBeVisible();
    await expect(page.getByText('Media - Read')).toBeVisible();
    await expect(page.getByText('Playlists - Write')).toBeVisible();
    await expect(page.getByText('Media - Write')).toBeVisible();

    // Verify scope checkboxes exist
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(5); // At minimum the 5 scopes verified above
  });

  test('can switch to Webhooks tab', async ({ page }) => {
    // Click the Webhooks tab
    await page.getByRole('tab', { name: /webhooks/i }).click();

    // Verify the Webhooks tab is now selected
    const webhooksTab = page.getByRole('tab', { name: /webhooks/i });
    await expect(webhooksTab).toHaveAttribute('aria-selected', 'true');

    // Verify Webhook Endpoints heading is visible
    await expect(page.getByText(/Webhook Endpoints/i)).toBeVisible();
  });
});
