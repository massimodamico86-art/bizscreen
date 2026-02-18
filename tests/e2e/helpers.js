/**
 * E2E Test Helpers
 *
 * Common utilities for E2E tests
 */

/**
 * Login and prepare the app for testing
 *
 * This function handles both pre-authenticated state (from storage state) and fresh logins:
 * 1. If already authenticated (storage state injected), just navigates to /app and dismisses modals
 * 2. If not authenticated, performs full login flow
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Optional configuration
 * @param {string} options.email - Email override (defaults to TEST_USER_EMAIL env var)
 * @param {string} options.password - Password override (defaults to TEST_USER_PASSWORD env var)
 */
export async function loginAndPrepare(page, options = {}) {
  // Check if already authenticated (storage state may have been injected)
  const currentUrl = page.url();
  if (currentUrl.includes('/app')) {
    // Already on app route, just dismiss modals
    await dismissAnyModals(page);
    return;
  }

  // Navigate to app and see if we're authenticated
  await page.goto('/app');
  await page.waitForLoadState('domcontentloaded');

  // Wait for auth to resolve - either app renders sidebar (authenticated) or we get redirected to login
  // This handles the case where the page shows /app URL briefly before auth redirect kicks in
  const sidebar = page.locator('aside').first();
  const loginForm = page.getByPlaceholder(/email/i);

  // Race between sidebar appearing (authenticated) or login form appearing (need to login)
  const authResolved = await Promise.race([
    sidebar.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'authenticated'),
    loginForm.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'need-login'),
  ]).catch(() => 'unknown');

  if (authResolved === 'authenticated') {
    // Already authenticated via storage state, just dismiss modals
    await dismissAnyModals(page);
    return;
  }

  if (authResolved === 'unknown') {
    // Fallback: check URL - if still on /app, likely authenticated
    if (page.url().includes('/app')) {
      await dismissAnyModals(page);
      return;
    }
  }

  // Not authenticated - perform full login flow
  const email = options.email || process.env.TEST_USER_EMAIL;
  const password = options.password || process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Test credentials not configured. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.');
  }

  // Navigate to login page (may already be there from redirect)
  if (!page.url().includes('/auth/login')) {
    await page.goto('/auth/login');
  }

  // Wait for login form to be fully rendered
  const emailField = page.getByPlaceholder(/email/i);
  await emailField.waitFor({ state: 'visible', timeout: 10000 });

  // Fill in credentials and submit
  await emailField.fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for redirect to app
  await page.waitForURL(/\/app/, { timeout: 15000 });

  // Wait for the page to be ready before checking for modals
  await page.waitForLoadState('domcontentloaded');

  // Dismiss any modal dialogs that might have appeared
  await dismissAnyModals(page);
}

/**
 * Dismiss any open modal dialogs
 *
 * Looks for common modal close buttons and clicks them if found.
 * This handles any modal dialogs that may appear on page load.
 *
 * Uses proper Playwright auto-waiting patterns instead of catch swallowing.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function dismissAnyModals(page) {
  // Import expect for auto-waiting assertions
  const { _expect } = await import('@playwright/test');

  // Try to find and click modal close buttons
  // The design-system Modal has a close button with aria-label="Close modal"
  // The Welcome Modal has an X button in the header

  const closeButtonSelectors = [
    '[aria-label="Close modal"]',
    '[aria-label="Close"]',
    'button:has(svg.lucide-x)',
    '[role="dialog"] button:has-text("Skip")',
    '[role="dialog"] button:has-text("Close")',
    '[role="dialog"] button:has-text("Dismiss")',
    '[role="dialog"] button:has-text("Maybe Later")',
  ];

  const dialog = page.locator('[role="dialog"]').first();

  // Check if any modal is visible
  // isVisible() returns false for non-existent elements, no catch needed
  const dialogCount = await dialog.count();
  if (dialogCount === 0) {
    // No dialog element present, nothing to dismiss
    return;
  }

  const hasModal = await dialog.isVisible();
  if (!hasModal) {
    // Dialog element exists but is not visible
    return;
  }

  // Try each close button selector
  for (const selector of closeButtonSelectors) {
    const closeButton = page.locator(selector).first();
    const buttonCount = await closeButton.count();
    if (buttonCount > 0) {
      const isButtonVisible = await closeButton.isVisible();
      if (isButtonVisible) {
        await closeButton.click();
        // Wait for modal to close using proper auto-waiting
        await dialog.waitFor({ state: 'hidden', timeout: 2000 });
        return;
      }
    }
  }

  // If no close button found, try clicking on the modal backdrop
  const backdrop = page.locator('[role="dialog"] > div[aria-hidden="true"]').first();
  const backdropCount = await backdrop.count();
  if (backdropCount > 0) {
    const isBackdropVisible = await backdrop.isVisible();
    if (isBackdropVisible) {
      await backdrop.click({ position: { x: 10, y: 10 }, force: true });
      await dialog.waitFor({ state: 'hidden', timeout: 2000 });
      return;
    }
  }

  // If modal still visible after all attempts, log warning
  const stillVisible = await dialog.isVisible();
  if (stillVisible) {
    console.warn('Modal still visible after dismiss attempt');
  }
}

/**
 * Wait for page to be ready for interaction
 * Gives loading indicators a chance to disappear, but doesn't fail if they persist.
 *
 * Uses element-based waits instead of networkidle for reliability.
 * Uses Promise.race for soft timeouts without catch swallowing or waitForTimeout.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForPageReady(page) {
  // Wait for DOM to be ready first
  await page.waitForLoadState('domcontentloaded');

  // Wait for common loading indicators to disappear
  // Use soft timeout via Promise.race - don't fail if loader persists
  const loadingSelectors = [
    '.animate-spin',
    '.animate-pulse',
    '[data-loading="true"]',
    'text=Loading...',
  ];

  // Helper to create a timeout promise that resolves (not rejects) after delay
  const softTimeout = (ms) => new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));

  for (const selector of loadingSelectors) {
    const loader = page.locator(selector).first();
    const count = await loader.count();
    if (count > 0) {
      // Race between loader disappearing and soft timeout
      // waitFor returns undefined on success, so we check the result
      const result = await Promise.race([
        loader.waitFor({ state: 'hidden', timeout: 10000 }).then(() => 'hidden'),
        softTimeout(5000),
      ]);
      if (result === 'timeout') {
        // Loader still visible after 5s - log but continue
        console.warn(`Loading indicator '${selector}' still visible after 5s, continuing anyway`);
      }
    }
  }
}

/**
 * Navigate to a specific section of the app
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} section - Section name: 'media', 'playlists', 'screens', 'layouts', 'schedules'
 */
export async function navigateToSection(page, section) {
  const sectionLower = section.toLowerCase();

  // Media is an expandable menu - need to click "Media" then "All Media"
  if (sectionLower === 'media') {
    // First expand the Media menu
    const mediaButton = page.locator('button:has-text("Media")').first();
    await mediaButton.click();
    // Wait for submenu to appear
    const allMediaButton = page.locator('button:has-text("All Media")').first();
    await allMediaButton.waitFor({ state: 'visible', timeout: 5000 });

    // Then click on "All Media" sub-item
    await allMediaButton.click();
    await waitForPageReady(page);
    return;
  }

  const sectionPatterns = {
    playlists: /playlists/i,
    screens: /screens/i,
    layouts: /layouts/i,
    schedules: /schedules/i,
    dashboard: /dashboard/i,
    scenes: /scenes/i,
  };

  const pattern = sectionPatterns[sectionLower];
  if (!pattern) {
    throw new Error(`Unknown section: ${section}. Valid options: media, ${Object.keys(sectionPatterns).join(', ')}`);
  }

  // Click on the navigation item
  const navButton = page.getByRole('button', { name: pattern }).first();
  await navButton.click();

  // Wait for the page to be ready
  await waitForPageReady(page);
}

/**
 * Generate a unique test name with timestamp
 *
 * @param {string} prefix - Prefix for the name
 * @returns {string} Unique name
 */
export function generateTestName(prefix = 'Test') {
  return `${prefix} ${Date.now()}`;
}

export default {
  loginAndPrepare,
  dismissAnyModals,
  waitForPageReady,
  navigateToSection,
  generateTestName,
};
