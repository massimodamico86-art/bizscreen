/**
 * Playwright Authentication Setup
 *
 * This setup file runs once before all tests to authenticate and save the session.
 * Tests then use the saved storage state to skip the login process.
 *
 * Creates three auth states:
 * - client.json (default) - Standard tenant user
 * - admin.json - Admin user with elevated permissions
 * - superadmin.json - Super admin with full platform access
 *
 * Usage: Configured in playwright.config.js as a setup project dependency.
 */
import { test as setup } from '@playwright/test';

const authFiles = {
  client: 'playwright/.auth/client.json',
  admin: 'playwright/.auth/admin.json',
  superadmin: 'playwright/.auth/superadmin.json',
};

/**
 * Authenticate a role and save the session to a storage state file.
 *
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} authFile - Path to save the storage state
 * @param {string} roleName - Role name for logging
 */
async function authenticateRole(page, email, password, authFile, roleName) {
  // Skip if no credentials configured
  if (!email || !password) {
    console.log(`Skipping ${roleName} auth setup - no credentials configured`);
    return;
  }

  console.log(`Running ${roleName} auth setup - logging in to save session...`);

  // Capture page errors for debugging (helps diagnose React/build issues)
  page.on('pageerror', (err) => {
    console.error(`Page error during ${roleName} auth setup:`, err.message);
  });

  // Navigate to login page (don't use networkidle - Supabase realtime keeps connections open)
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

  // Wait for the form to be visible (React has mounted)
  console.log(`${roleName}: Waiting for login form to render...`);
  await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 15000 });
  console.log(`${roleName}: Login form found`);

  // Fill in credentials
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);

  // Submit login form
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for redirect to app
  await page.waitForURL(/\/app/, { timeout: 15000 });

  // Give the page a moment to render any modals
  await page.waitForTimeout(500);

  // Dismiss any modal dialogs that might have appeared
  // (Copy of dismissAnyModals logic to avoid circular dependency)
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
      await page.waitForTimeout(300);
      break;
    }
  }

  console.log(`${roleName} auth setup complete - saving session to ${authFile}`);

  // Save storage state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
}

// Client authentication (default role)
// Supports both TEST_USER_* (legacy) and TEST_CLIENT_* (new) env vars
setup('authenticate-client', async ({ page }) => {
  await authenticateRole(
    page,
    process.env.TEST_USER_EMAIL || process.env.TEST_CLIENT_EMAIL,
    process.env.TEST_USER_PASSWORD || process.env.TEST_CLIENT_PASSWORD,
    authFiles.client,
    'client'
  );
});

// Admin authentication
setup('authenticate-admin', async ({ page }) => {
  await authenticateRole(
    page,
    process.env.TEST_ADMIN_EMAIL,
    process.env.TEST_ADMIN_PASSWORD,
    authFiles.admin,
    'admin'
  );
});

// Superadmin authentication
setup('authenticate-superadmin', async ({ page }) => {
  await authenticateRole(
    page,
    process.env.TEST_SUPERADMIN_EMAIL,
    process.env.TEST_SUPERADMIN_PASSWORD,
    authFiles.superadmin,
    'superadmin'
  );
});
