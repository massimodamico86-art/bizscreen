/**
 * Debug test to check environment configuration
 * This is a manual debugging helper, not a production test
 */
import { test, expect } from '@playwright/test';

// Skip in CI - this is a manual debug test that has no assertions
test.skip(!!process.env.CI, 'Debug test skipped in CI');

test('check supabase config in browser', async ({ page }) => {
  await page.goto('/auth/login');

  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');

  // Get the supabase config from the window object
  const config = await page.evaluate(() => {
    if (window.supabase) {
      // Check all properties of supabase object
      const props = Object.keys(window.supabase);
      // Also check env vars if accessible
      return {
        hasSupabase: true,
        props: props,
        url: window.supabase?.supabaseUrl ||
             window.supabase?.restUrl ||
             window.supabase?._supabaseUrl ||
             'not found',
        // Just a marker
        envChecked: true
      };
    }
    return { hasSupabase: false };
  });

  console.log('Supabase config:', config);

  // Also check what the console logs say
  page.on('console', msg => console.log('Browser console:', msg.text()));

  // Try to make a login request and capture the network
  await page.route('**/auth/**', route => {
    console.log('Auth request to:', route.request().url());
    route.continue();
  });

  // Fill in credentials
  await page.getByPlaceholder(/email/i).fill('test@bizscreen.test');
  await page.getByPlaceholder(/password/i).fill('testpassword123');

  // Click sign in
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait a bit and check the page state
  await page.waitForTimeout(3000);

  // Get any error messages
  const errorText = await page.locator('.bg-red-50').textContent().catch(() => 'no error');
  console.log('Error message:', errorText);

  // Get current URL
  console.log('Current URL:', page.url());
});
