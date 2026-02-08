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

  // Check if we stayed on /app (authenticated) or got redirected to login
  const afterNavUrl = page.url();
  if (afterNavUrl.includes('/app') && !afterNavUrl.includes('/auth/')) {
    // Already authenticated via storage state, just dismiss modals
    await page.waitForLoadState('domcontentloaded');
    await dismissAnyModals(page);
    return;
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

  // Fill in credentials and submit
  await page.getByPlaceholder(/email/i).fill(email);
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
 * This handles the Welcome Modal, OnboardingWizard, and any other dialogs.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function dismissAnyModals(page) {
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

  for (const selector of closeButtonSelectors) {
    const closeButton = page.locator(selector).first();
    if (await closeButton.isVisible({ timeout: 100 }).catch(() => false)) {
      await closeButton.click();
      // Wait for modal to close
      await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
      // Check if there are more modals
      break;
    }
  }

  // Also try clicking on the modal backdrop to close
  const backdrop = page.locator('[role="dialog"] > div[aria-hidden="true"]').first();
  if (await backdrop.isVisible({ timeout: 100 }).catch(() => false)) {
    // Click outside the modal content area
    await backdrop.click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
  }

  // Verify no blocking modals remain
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.isVisible({ timeout: 100 }).catch(() => false)) {
    // Log warning but continue - some modals might be expected
    console.warn('Modal still visible after dismiss attempt');
  }
}

/**
 * Wait for page to be ready for interaction
 * Ensures no loading spinners or skeleton screens are visible
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForPageReady(page) {
  // Wait for any loading indicators to disappear
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    '.animate-spin',
    '.animate-pulse',
    '[data-loading="true"]',
    'text=Loading...',
  ];

  for (const selector of loadingSelectors) {
    await page.locator(selector).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
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
