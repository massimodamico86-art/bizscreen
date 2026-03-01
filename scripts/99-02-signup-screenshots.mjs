/**
 * 99-02-01: Screenshot signup flow with form states and validation
 * Uses Playwright programmatic API for headless screenshot capture
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const BASE = 'http://localhost:5173';

async function waitForButtonEnabled(page, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const disabled = await page.locator('button[type="submit"]').isDisabled();
    if (!disabled) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Step 1: Empty signup form
    console.log('Step 1: Empty signup form...');
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#fullName', { timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, '99-13-signup-empty-form.png'), fullPage: true });
    console.log('  -> 99-13-signup-empty-form.png');

    // Step 2: Password strength indicator - weak password
    console.log('Step 2: Weak password...');
    await page.fill('#password', 'abc');
    await page.waitForTimeout(800); // Allow strength indicator to render
    await page.screenshot({ path: path.join(screenshotsDir, '99-14-signup-weak-password.png'), fullPage: true });
    console.log('  -> 99-14-signup-weak-password.png');

    // Step 3: Strong password
    console.log('Step 3: Strong password...');
    await page.fill('#password', '');
    await page.fill('#password', 'MyStr0ng!Pass#2026');
    // Wait for password validation + breach check (500ms debounce + API call)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '99-15-signup-strong-password.png'), fullPage: true });
    console.log('  -> 99-15-signup-strong-password.png');

    // Step 4: Filled signup form (keep strong password)
    console.log('Step 4: Filled form...');
    await page.fill('#fullName', 'Test User');
    await page.fill('#businessName', 'Test Business');
    await page.fill('#email', 'testuser@example.com');
    // Password already filled from step 3
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '99-16-signup-filled-form.png'), fullPage: true });
    console.log('  -> 99-16-signup-filled-form.png');

    // Step 5: Empty field validation
    // The submit button is disabled when password is invalid. On a fresh form with no password,
    // isPasswordValid=false so button is disabled. Use reportValidity() to trigger HTML5 validation.
    console.log('Step 5: Empty field validation...');
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#fullName', { timeout: 10000 });
    // Trigger HTML5 validation UI by calling reportValidity on the form
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.reportValidity();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '99-17-signup-empty-validation.png'), fullPage: true });
    console.log('  -> 99-17-signup-empty-validation.png');

    // Step 6: Signup submission (error expected since Supabase not configured for test email)
    console.log('Step 6: Signup submission...');
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#fullName', { timeout: 10000 });
    await page.fill('#fullName', 'QA Tester');
    await page.fill('#businessName', 'QA Corp');
    await page.fill('#email', 'qa@test.com');
    await page.fill('#password', 'Str0ngP@ssword!23');

    // Wait for password validation + breach check to complete (enable button)
    console.log('  Waiting for password validation...');
    const enabled = await waitForButtonEnabled(page, 15000);
    if (!enabled) {
      console.log('  -> Button still disabled after 15s. Capturing disabled state.');
      await page.screenshot({ path: path.join(screenshotsDir, '99-18-signup-loading-state.png'), fullPage: true });
      console.log('  -> 99-18-signup-loading-state.png (disabled state)');
      await page.screenshot({ path: path.join(screenshotsDir, '99-19-signup-result.png'), fullPage: true });
      console.log('  -> 99-19-signup-result.png (same as disabled state)');
    } else {
      // Button enabled - click to submit
      console.log('  Button enabled, clicking...');
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      // Capture loading state quickly
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(screenshotsDir, '99-18-signup-loading-state.png'), fullPage: true });
      console.log('  -> 99-18-signup-loading-state.png');

      // Wait for result
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(screenshotsDir, '99-19-signup-result.png'), fullPage: true });
      console.log('  -> 99-19-signup-result.png');
    }

    // Step 7: Sign-in link from signup
    console.log('Step 7: Sign-in link...');
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#fullName', { timeout: 10000 });
    // Highlight the Sign In link/button
    await page.evaluate(() => {
      const links = document.querySelectorAll('a[href="/auth/login"]');
      links.forEach(link => {
        link.style.outline = '3px solid red';
        link.style.outlineOffset = '4px';
      });
    });
    await page.screenshot({ path: path.join(screenshotsDir, '99-20-signup-signin-link.png'), fullPage: true });
    console.log('  -> 99-20-signup-signin-link.png');

    // Step 8: Plan-based signup variant
    console.log('Step 8: Plan-based signup...');
    await page.goto(`${BASE}/auth/signup?plan=Professional`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#fullName', { timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, '99-21-signup-with-plan.png'), fullPage: true });
    console.log('  -> 99-21-signup-with-plan.png');

    console.log('\nTask 99-02-01 complete: All signup screenshots captured.');
  } catch (err) {
    console.error('Error:', err.message);
    // Take a debug screenshot
    try {
      await page.screenshot({ path: path.join(screenshotsDir, '99-debug-signup-error.png'), fullPage: true });
    } catch (_) { /* ignore */ }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
