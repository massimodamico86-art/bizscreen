/**
 * Full Auth Flow E2E Test
 *
 * Tests the complete auth round-trip:
 * 1. Login with test credentials -> verify redirect to /app
 * 2. Sign out via header button -> verify redirect back to login
 * 3. Verify cannot access /app after sign out
 * 4. Capture and report console errors throughout
 *
 * NOTE: When VITE_DEV_BYPASS_AUTH=true, sign out does not redirect to login
 * because the dev bypass immediately re-authenticates. Sign-out redirect tests
 * are skipped in this mode and this is documented as expected behavior.
 *
 * QT-64: Validates the complete auth lifecycle works end-to-end.
 */
import { test, expect } from './fixtures/index.js';
import { loginAndPrepare, waitForPageReady } from './helpers.js';
import { screenshotStep } from './helpers/index.js';

/**
 * Helper to click the sign out button using various locator strategies.
 * @param {import('@playwright/test').Page} page
 */
async function clickSignOut(page) {
  // Try title attribute first (exact match from Header.jsx)
  const signOutButton = page.locator('button[title="Sign out"]');
  const count = await signOutButton.count();
  if (count > 0) {
    await signOutButton.click();
    return;
  }

  // Fallback: role-based locator
  const altButton = page.getByRole('button', { name: /sign out/i });
  const altCount = await altButton.count();
  if (altCount > 0) {
    await altButton.click();
    return;
  }

  // Last resort: any element with title="Sign out"
  await page.locator('[title="Sign out"]').click();
}

/**
 * Detect if VITE_DEV_BYPASS_AUTH is active by checking if /auth/login
 * redirects to /app (bypass intercepts the route).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function isDevBypassActive(page) {
  // Check current URL -- if we're on /app after loginAndPrepare,
  // navigate to /auth/login to see if it gets intercepted
  const testPage = page;
  const currentUrl = testPage.url();

  // Save current URL, go to login, check if redirected
  await testPage.goto('/auth/login', { waitUntil: 'domcontentloaded' });

  // Wait briefly for any redirect
  const loginForm = testPage.getByPlaceholder(/email/i);
  const sidebar = testPage.locator('aside').first();

  const result = await Promise.race([
    loginForm.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'login-form'),
    sidebar.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'app-sidebar'),
  ]).catch(() => 'unknown');

  const isDevMode = result === 'app-sidebar' || testPage.url().includes('/app');

  // Navigate back
  if (currentUrl && !currentUrl.includes('about:blank')) {
    await testPage.goto(currentUrl, { waitUntil: 'domcontentloaded' });
  }

  return isDevMode;
}

// =============================================================================
// FULL AUTH FLOW: LOGIN -> VERIFY -> SIGN OUT -> VERIFY
// =============================================================================
test.describe('Full Auth Flow: Login -> Verify -> Sign Out -> Verify', () => {
  /** @type {Array<{type: string, text: string}>} */
  let consoleErrors;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Test credentials not configured');

    // Collect console errors throughout the test
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ type: msg.type(), text: msg.text() });
      }
    });
  });

  test('login redirects to /app dashboard', async ({ page }) => {
    await loginAndPrepare(page);

    // Assert URL matches /app
    await expect(page).toHaveURL(/\/app/);

    // Assert sidebar is visible (app is loaded)
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await screenshotStep(page, 'auth-flow', '01-logged-in-dashboard');
  });

  test('sign out button is clickable', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);

    // Pre-condition: we are on /app
    await expect(page).toHaveURL(/\/app/);

    // Verify the sign out button exists and is clickable
    const signOutButton = page.locator('button[title="Sign out"]');
    await expect(signOutButton).toBeVisible({ timeout: 5000 });

    // Click sign out
    await clickSignOut(page);

    // After clicking sign out, behavior depends on DEV_AUTH_BYPASS:
    // - With bypass: stays on /app (bypass re-authenticates immediately)
    // - Without bypass: redirects to /auth/login
    const redirected = await page.waitForURL(/\/auth\/login|^\/$/, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (redirected) {
      // Normal sign-out behavior: verify login page
      const loginHeading = page.getByRole('heading', { name: /sign in|welcome/i });
      await expect(loginHeading).toBeVisible({ timeout: 10000 });
      await screenshotStep(page, 'auth-flow', '02-after-sign-out');
    } else {
      // DEV_AUTH_BYPASS active: sign out clicked but app stays loaded
      // This is expected in dev mode -- document it
      console.log('Sign out clicked but no redirect (DEV_AUTH_BYPASS likely active)');
      await screenshotStep(page, 'auth-flow', '02-sign-out-dev-bypass-no-redirect');
    }
  });

  test('sign out redirects to login page (requires real auth)', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);

    // Check if dev bypass is active
    const devBypass = await isDevBypassActive(page);
    if (devBypass) {
      test.skip(true, 'DEV_AUTH_BYPASS active - sign out does not redirect in dev mode');
      return;
    }

    await expect(page).toHaveURL(/\/app/);

    await clickSignOut(page);

    // Wait for redirect to login page
    await page.waitForURL(/\/auth\/login|^\/$/, { timeout: 15000 });

    // Assert login heading is visible
    const loginHeading = page.getByRole('heading', { name: /sign in|welcome/i });
    await expect(loginHeading).toBeVisible({ timeout: 10000 });

    await screenshotStep(page, 'auth-flow', '02-after-sign-out');
  });

  test('full round-trip: login -> sign out -> verify cannot access /app (requires real auth)', async ({ page }) => {
    await loginAndPrepare(page);

    // Check if dev bypass is active
    const devBypass = await isDevBypassActive(page);
    if (devBypass) {
      test.skip(true, 'DEV_AUTH_BYPASS active - cannot verify post-signout redirect in dev mode');
      return;
    }

    await expect(page).toHaveURL(/\/app/);

    // Sign out
    await clickSignOut(page);
    await page.waitForURL(/\/auth\/login|^\/$/, { timeout: 15000 });

    // Try navigating to /app directly
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');

    // Wait for auth redirect
    await page.waitForURL(/\/auth\/login|^\/$/, { timeout: 15000 }).catch(() => {
      // URL might still be /app if redirect is slow
    });

    const currentUrl = page.url();
    const stillOnApp = currentUrl.includes('/app');

    if (stillOnApp) {
      await screenshotStep(page, 'auth-flow', '03-BUG-still-on-app-after-signout');
    }

    expect(stillOnApp, 'Should not be able to access /app after sign out').toBeFalsy();
  });

  test('no console errors during login flow', async ({ page }) => {
    // Perform login flow and collect console errors
    await loginAndPrepare(page);
    await waitForPageReady(page);

    // Take screenshot of logged-in state
    await screenshotStep(page, 'auth-flow', '04-console-check-logged-in');

    // Filter out known benign errors (backend connection issues, auth state, etc.)
    const significantErrors = consoleErrors.filter((err) => {
      const text = err.text.toLowerCase();
      // Skip known benign errors from backend being unavailable
      if (text.includes('auth session missing')) return false;
      if (text.includes('failed to fetch')) return false;
      if (text.includes('failed to load resource')) return false;
      if (text.includes('err_connection_refused')) return false;
      if (text.includes('networkerror')) return false;
      if (text.includes('net::err_')) return false;
      if (text.includes('aborted')) return false;
      if (text.includes('typeerror')) return false;
      if (text.includes('retry')) return false;
      if (text.includes('websocket connection')) return false;
      // Skip app-level service errors from missing backend
      if (text.includes('[error]')) return false;
      if (text.includes('errortacking')) return false;
      if (text.includes('error fetching')) return false;
      if (text.includes('subscription error')) return false;
      if (text.includes('correlationid')) return false;
      return true;
    });

    if (significantErrors.length > 0) {
      console.log('Console errors found during auth flow:');
      significantErrors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
      await screenshotStep(page, 'auth-flow', '05-console-errors-found');
    }

    expect(
      significantErrors.length,
      `Found ${significantErrors.length} console error(s) during login flow: ${significantErrors.map((e) => e.text).join('; ')}`,
    ).toBe(0);
  });
});
