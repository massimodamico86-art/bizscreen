import { test, expect } from '@playwright/test';

const CLIENT_EMAIL = process.env.TEST_USER_EMAIL || 'client@bizscreen.test';
const CLIENT_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestClient123!';

test('Diagnose Locations page error', async ({ page }) => {
  const consoleMessages = [];
  const networkErrors = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    consoleMessages.push({ type: 'PAGE_ERROR', text: err.message, stack: err.stack });
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  // Login
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    localStorage.setItem('bizscreen_welcome_modal_dismissed', 'true');
    localStorage.setItem('bizscreen_onboarding_completed', 'true');
  });
  await page.fill('input[type="email"]', CLIENT_EMAIL);
  await page.fill('input[type="password"]', CLIENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app|dashboard)?/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Navigate to Locations
  await page.click('button:has-text("Locations"), a:has-text("Locations")');
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');

  // Log all messages
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(m => {
    if (m.type === 'error' || m.type === 'PAGE_ERROR') {
      console.log(`[${m.type}] ${m.text}`);
      if (m.stack) console.log(m.stack);
    }
  });

  console.log('\n=== NETWORK 400+ ERRORS ===');
  networkErrors.forEach(e => {
    console.log(`${e.status}: ${e.url}`);
  });

  // Check page content
  const content = await page.content();
  if (content.includes('Something Went Wrong')) {
    console.log('\n=== PAGE IS SHOWING ERROR ===');
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/location-diagnostic.png', fullPage: true });
  
  // Find the error
  expect(networkErrors.length).toBe(0);
});
