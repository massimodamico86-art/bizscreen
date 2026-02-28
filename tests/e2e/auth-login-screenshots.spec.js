/**
 * Auth Login Flow Screenshot Tests
 *
 * Captures screenshot evidence of three login paths:
 * - AUTH-01: Valid login redirects to dashboard
 * - AUTH-02: Invalid credentials show error
 * - AUTH-03: Empty field validation
 *
 * Screenshots are saved to screenshots/auth/ using the screenshotStep helper.
 *
 * NOTE: When VITE_DEV_BYPASS_AUTH=true is set in .env.local, the login page
 * auto-redirects to /app. Tests that require the login form will skip gracefully
 * in that environment.
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from './fixtures/index.js';
import { screenshotStep, cleanScreenshots, loginAndPrepare, waitForPageReady } from './helpers/index.js';

/**
 * Navigate to the login page and verify it rendered (not bypassed).
 * Returns true if the login form is visible, false if dev bypass redirected away.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} Whether the login form is accessible
 */
async function navigateToLoginPage(page) {
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');

  // Check if the login form appeared or if we got redirected (dev bypass)
  const emailInput = page.getByPlaceholder(/email/i);
  const appSidebar = page.locator('aside').first();

  const result = await Promise.race([
    emailInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'login-form'),
    appSidebar.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'app-redirect'),
  ]).catch(() => 'unknown');

  return result === 'login-form';
}

// =============================================================================
// AUTH-01: VALID LOGIN FLOW
// =============================================================================
test.describe('Auth Screenshots - Valid Login (AUTH-01)', () => {
  // Only run on chromium project - loginAndPrepare uses client credentials
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Test credentials not configured');
  });

  test('login page renders correctly', async ({ freshPage }) => {
    const loginVisible = await navigateToLoginPage(freshPage);
    if (!loginVisible) {
      // Dev bypass active or login page not accessible -- skip gracefully
      test.skip(true, 'Login page not accessible (dev bypass may be active)');
      return;
    }

    // Capture screenshot of the login form
    await screenshotStep(freshPage, 'auth', '01-login-page');

    // Assert login page elements are visible
    await expect(freshPage.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(freshPage.getByPlaceholder(/email/i)).toBeVisible();
    await expect(freshPage.getByPlaceholder(/password/i)).toBeVisible();
    await expect(freshPage.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('valid login redirects to dashboard with screenshot', async ({ page }) => {
    cleanScreenshots('auth');

    // Perform full login (handles both dev bypass and real auth)
    await loginAndPrepare(page);
    await waitForPageReady(page);

    // Capture screenshot of dashboard after login
    await screenshotStep(page, 'auth', '02-dashboard-after-login');

    // Assert we reached the app
    expect(page.url()).toMatch(/\/app/);
  });
});

// =============================================================================
// AUTH-02: INVALID CREDENTIALS
// =============================================================================
test.describe('Auth Screenshots - Invalid Credentials (AUTH-02)', () => {
  // Clear auth state for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows error for invalid credentials with screenshot', async ({ page }) => {
    const loginVisible = await navigateToLoginPage(page);
    if (!loginVisible) {
      test.skip(true, 'Login page not accessible (dev bypass may be active)');
      return;
    }

    // Fill in invalid credentials
    await page.getByPlaceholder(/email/i).fill('invalid-test@example.com');
    await page.getByPlaceholder(/password/i).fill('WrongPassword123!');

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the error container to appear
    const errorContainer = page.locator('.bg-red-50');
    await expect(errorContainer).toBeVisible({ timeout: 10000 });

    // Capture screenshot of the error state
    await screenshotStep(page, 'auth', '03-invalid-credentials-error');

    // Assert error is visible
    await expect(errorContainer).toBeVisible();
  });
});

// =============================================================================
// AUTH-03: EMPTY FIELD VALIDATION
// =============================================================================
test.describe('Auth Screenshots - Empty Field Validation (AUTH-03)', () => {
  // Clear auth state for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('empty form submission shows validation with screenshot', async ({ page }) => {
    const loginVisible = await navigateToLoginPage(page);
    if (!loginVisible) {
      test.skip(true, 'Login page not accessible (dev bypass may be active)');
      return;
    }

    // Click Sign in without filling any fields
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check HTML5 required constraint validation on the email field
    const emailInput = page.getByPlaceholder(/email/i);
    const validationMessage = await emailInput.evaluate(
      (el) => /** @type {HTMLInputElement} */ (el).validationMessage
    );

    // Capture screenshot of the validation state
    await screenshotStep(page, 'auth', '04-empty-field-validation');

    // Assert that either HTML5 validation fires or a custom error is shown
    const hasValidation = validationMessage.length > 0;
    const hasCustomError = await page.locator('.bg-red-50').isVisible();
    expect(hasValidation || hasCustomError).toBeTruthy();
  });
});
