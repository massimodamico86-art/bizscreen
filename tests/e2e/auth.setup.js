/**
 * Playwright Authentication Setup
 *
 * This setup file runs once before all tests to authenticate and save the session.
 * Tests then use the saved storage state to skip the login process.
 *
 * Usage: Configured in playwright.config.js as a setup project dependency.
 */
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Skip if no credentials configured
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.log('Skipping auth setup - no test credentials (TEST_USER_EMAIL, TEST_USER_PASSWORD)');
    return;
  }

  console.log('Running auth setup - logging in to save session...');

  // Capture page errors for debugging (helps diagnose React/build issues)
  page.on('pageerror', (err) => {
    console.error('Page error during auth setup:', err.message);
  });

  // Navigate to login page and wait for network idle
  await page.goto('/auth/login', { waitUntil: 'networkidle' });

  // Wait for the form to be visible (React has mounted)
  console.log('Waiting for login form to render...');
  await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 15000 });
  console.log('Login form found');

  // Fill in credentials
  await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL);
  await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD);

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

  console.log('Auth setup complete - saving session to', authFile);

  // Save storage state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
