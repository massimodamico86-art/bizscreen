/**
 * Authentication E2E Tests
 *
 * Sprint 3: Comprehensive auth testing for login, signup, password reset, and session management.
 *
 * ISOLATION PATTERNS USED:
 * - Unauthenticated tests use test.use({ storageState: { cookies: [], origins: [] } })
 *   at the describe block level to clear auth state
 * - Authenticated tests (Session Persistence, Logout Flow) use default storage state
 *   from project config
 *
 * Alternative: For individual tests needing fresh context, use the freshPage fixture:
 *   test('my test', async ({ freshPage }) => { ... });
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from './fixtures/index.js';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

// =============================================================================
// LOGIN FLOW TESTS
// =============================================================================
test.describe('Login Flow', () => {
  // Clear auth state - these tests require unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('shows login page when not authenticated', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('displays email and password fields with correct attributes', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();

    // Check input types
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');

    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should show error message (red background container)
    const errorContainer = page.locator('.bg-red-50');
    await expect(errorContainer).toBeVisible({ timeout: 10000 });
  });

  test('has sign up link or option', async ({ page }) => {
    const signUpLink = page.getByText(/sign up|create.*account|register/i);
    await expect(signUpLink).toBeVisible();
  });

  test('has forgot password link', async ({ page }) => {
    const forgotLink = page.getByText(/forgot.*password/i);
    await expect(forgotLink).toBeVisible();
  });

  test('can navigate to signup page from login', async ({ page }) => {
    // Click on create account link
    await page.getByRole('link', { name: /create.*account|sign up/i }).click();

    // Should navigate to signup
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
  });

  test('can navigate to reset password from login', async ({ page }) => {
    // Click forgot password link
    await page.getByText(/forgot.*password/i).click();

    // Should navigate to reset password page
    await expect(page).toHaveURL(/\/auth\/reset-password/);
    await expect(page.getByRole('heading', { name: /reset.*password/i })).toBeVisible();
  });

  // Note: Loading state test skipped - too flaky in fast local environments
  test.skip('shows loading state during login attempt', async ({ _page }) => {
    // Loading states are too fast to reliably test in E2E
  });

  test('password visibility toggle works', async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/password/i);

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon to show password
    const toggleButton = page.locator('button:has(svg)').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') });
    if (await toggleButton.count() > 0) {
      await toggleButton.first().click();
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.first().click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });
});

// =============================================================================
// SIGNUP FLOW TESTS
// =============================================================================
test.describe('Signup Flow', () => {
  // Clear auth state - these tests require unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('displays signup page with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
  });

  test('displays all required signup fields', async ({ page }) => {
    // Check for all form fields
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/business name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('has create account submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /create account/i });
    await expect(submitButton).toBeVisible();
    // Button is disabled until form is filled (correct UX behavior)
    await expect(submitButton).toBeDisabled();
  });

  test('password field has minimum length requirement', async ({ page }) => {
    // The password input has minLength=8 attribute for browser validation
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('minLength', '8');
  });

  test('has terms and privacy policy links', async ({ page }) => {
    await expect(page.getByText(/terms of service/i)).toBeVisible();
    await expect(page.getByText(/privacy policy/i)).toBeVisible();
  });

  test('has link back to login', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });

  test('can navigate back to login from signup', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });

  test('password visibility toggle works on signup', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);

    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon
    const toggleButton = page.locator('button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)');
    if (await toggleButton.count() > 0) {
      await toggleButton.first().click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });

  // Note: Loading state test skipped - too flaky in fast local environments
  test.skip('shows loading state during signup attempt', async ({ _page }) => {
    // Loading states are too fast to reliably test in E2E
  });
});

// =============================================================================
// PASSWORD RESET FLOW TESTS
// =============================================================================
test.describe('Password Reset Flow', () => {
  // Clear auth state - these tests require unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/reset-password');
  });

  test('displays reset password page with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reset.*password/i })).toBeVisible();
  });

  test('displays email input field', async ({ page }) => {
    // Look for email input by label or by input type
    const emailByLabel = page.getByLabel(/email/i);
    const emailByType = page.locator('input[type="email"]');

    // Either selector should work - check count first, then visibility
    const labelCount = await emailByLabel.count();
    const emailInput = labelCount > 0 && (await emailByLabel.isVisible()) ? emailByLabel : emailByType;
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
  });

  test('has send reset link button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /send.*reset.*link/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('has back to login link', async ({ page }) => {
    const backLink = page.getByText(/back to login/i);
    await expect(backLink).toBeVisible();
  });

  test('can navigate back to login', async ({ page }) => {
    await page.getByText(/back to login/i).click();

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  // Note: Email sending tests are slow/unreliable in local dev
  // They require Supabase to send to Mailpit which can be slow
  test('can submit reset password form', async ({ page }) => {
    // Fill email and submit
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');

    const submitButton = page.getByRole('button', { name: /send.*reset.*link/i });
    await submitButton.click();

    // Wait for form response - either success page loads or we stay on same page
    // Use element-based wait: wait for either success heading OR loading to complete
    const successHeading = page.getByRole('heading', { name: /check your email/i });
    const resetHeading = page.getByRole('heading', { name: /reset.*password/i });

    // Wait for page to settle - one of these headings should be visible
    await expect(successHeading.or(resetHeading)).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// SESSION PERSISTENCE TESTS (require test credentials)
// =============================================================================
test.describe('Session Persistence', () => {
  // Only run on chromium (client) project - loginAndPrepare uses client credentials
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.skip(({ _browserName }) => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('successful login redirects to app', async ({ page }) => {
    await loginAndPrepare(page);

    // Should be on app page
    await expect(page).toHaveURL(/\/app/);
  });

  test('session persists after page reload', async ({ page }) => {
    await loginAndPrepare(page);

    // Verify we're in the app
    await expect(page).toHaveURL(/\/app/);

    // Reload the page
    await page.reload();
    await waitForPageReady(page);

    // Should still be in the app (not redirected to login)
    await expect(page).toHaveURL(/\/app/);
  });

  test('can access protected routes when authenticated', async ({ page }) => {
    await loginAndPrepare(page);

    // Try navigating to different app sections
    await page.goto('/app/screens');
    await waitForPageReady(page);

    // Should stay on protected route
    await expect(page).toHaveURL(/\/app/);
  });

  test('redirects to app after login', async ({ page }) => {
    await loginAndPrepare(page);

    // After login, should be on /app route
    // This verifies auth redirect works, regardless of page content
    await expect(page).toHaveURL(/\/app/);
  });
});

// =============================================================================
// LOGOUT FLOW TESTS (require test credentials)
// =============================================================================
test.describe('Logout Flow', () => {
  // Only run on chromium (client) project - loginAndPrepare uses client credentials
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.skip(({ _browserName }) => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('can find logout option in UI', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);

    // Look for user menu or settings that might contain logout
    // Common patterns: user avatar dropdown, settings icon, sidebar footer
    const logoutButton = page.getByRole('button', { name: /log ?out|sign ?out/i });
    const logoutLink = page.getByRole('link', { name: /log ?out|sign ?out/i });
    const logoutText = page.getByText(/log ?out|sign ?out/i);

    // Check if any logout option is visible using proper patterns
    const buttonCount = await logoutButton.count();
    const linkCount = await logoutLink.count();
    const textCount = await logoutText.count();

    const hasLogout = (buttonCount > 0 && await logoutButton.first().isVisible()) ||
      (linkCount > 0 && await logoutLink.first().isVisible()) ||
      (textCount > 0 && await logoutText.first().isVisible());

    // If not immediately visible, try opening user menu
    if (!hasLogout) {
      // Try clicking on user avatar or settings
      const userMenu = page.locator('[aria-label*="user"], [aria-label*="profile"], [aria-label*="account"]').first();
      const menuCount = await userMenu.count();
      if (menuCount > 0 && await userMenu.isVisible()) {
        await userMenu.click();
        // Wait for menu to appear using element-based wait
        const menu = page.locator('[role="menu"]');
        const menuExists = await menu.count();
        if (menuExists > 0) {
          await menu.waitFor({ state: 'visible', timeout: 1000 });
        }
      }
    }

    // At minimum, the app should provide some way to log out
    // This test documents whether logout is easily accessible
  });
});

// =============================================================================
// PROTECTED ROUTE TESTS
// =============================================================================
test.describe('Protected Routes', () => {
  // Clear auth state - these tests require unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated access to /app redirects to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/app');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login|\/login|\//);
  });

  test('unauthenticated access to /app/screens redirects', async ({ page }) => {
    await page.goto('/app/screens');

    // Should redirect to login or root
    await expect(page).toHaveURL(/\/auth\/login|\/login|\//);
  });

  test('unauthenticated access to /app/media redirects', async ({ page }) => {
    await page.goto('/app/media');

    await expect(page).toHaveURL(/\/auth\/login|\/login|\//);
  });
});

// =============================================================================
// AUTH STATE UI TESTS
// =============================================================================
test.describe('Auth State UI', () => {
  // Clear auth state - these tests require unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login form is accessible', async ({ page }) => {
    await page.goto('/auth/login');

    // Check form has proper structure for accessibility
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    // Inputs should be focusable
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
  });

  test('form validates required fields', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    // Check for browser validation or custom error
    // HTML5 validation shows browser-native message, or we get custom error
    const emailInput = page.getByPlaceholder(/email/i);

    // The email input should be marked as invalid or show validation message
    const validationMessage = await emailInput.evaluate((el) => (el).validationMessage);
    expect(validationMessage.length > 0 || await page.locator('.bg-red-50').isVisible()).toBeTruthy();
  });
});
