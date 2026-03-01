/**
 * 99-02-02: Screenshot password reset, update password, and accept invite flows
 * Uses Playwright programmatic API for headless screenshot capture
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // ==========================================
    // RESET PASSWORD FLOW
    // ==========================================

    // Step 1: Empty reset password form
    console.log('Step 1: Empty reset password form...');
    await page.goto(`${BASE}/auth/reset-password`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, '99-22-reset-password-empty.png'), fullPage: true });
    console.log('  -> 99-22-reset-password-empty.png');

    // Step 2: Filled reset password form
    console.log('Step 2: Filled reset password form...');
    await page.fill('#email', 'user@example.com');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, '99-23-reset-password-filled.png'), fullPage: true });
    console.log('  -> 99-23-reset-password-filled.png');

    // Step 3: Submit reset password
    console.log('Step 3: Submit reset password...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Capture loading state immediately
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(screenshotsDir, '99-24-reset-password-loading.png'), fullPage: true });
    console.log('  -> 99-24-reset-password-loading.png');

    // Wait for result
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(screenshotsDir, '99-25-reset-password-result.png'), fullPage: true });
    console.log('  -> 99-25-reset-password-result.png');

    // Step 4: Back to login link
    console.log('Step 4: Back to login link...');
    await page.goto(`${BASE}/auth/reset-password`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#email', { timeout: 10000 });
    // Highlight the "Back to login" link
    await page.evaluate(() => {
      const links = document.querySelectorAll('a[href="/auth/login"]');
      links.forEach(link => {
        link.style.outline = '3px solid red';
        link.style.outlineOffset = '4px';
      });
    });
    await page.screenshot({ path: path.join(screenshotsDir, '99-26-reset-password-back-link.png'), fullPage: true });
    console.log('  -> 99-26-reset-password-back-link.png');

    // ==========================================
    // UPDATE PASSWORD FLOW
    // ==========================================

    // Step 5: Update password page without session (error state)
    console.log('Step 5: Update password - no session (error state)...');
    // Open a fresh context to ensure no session
    const freshContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const freshPage = await freshContext.newPage();
    await freshPage.goto(`${BASE}/auth/update-password`, { waitUntil: 'networkidle' });
    // Wait for the session check to complete (checking -> error state)
    await freshPage.waitForTimeout(3000);
    await freshPage.screenshot({ path: path.join(screenshotsDir, '99-27-update-password-no-session.png'), fullPage: true });
    console.log('  -> 99-27-update-password-no-session.png');
    await freshContext.close();

    // ==========================================
    // ACCEPT INVITE FLOW
    // ==========================================

    // Step 6: Accept invite page without token (error state)
    console.log('Step 6: Accept invite - no token (error state)...');
    const inviteContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(`${BASE}/auth/accept-invite`, { waitUntil: 'networkidle' });
    await invitePage.waitForTimeout(3000);
    await invitePage.screenshot({ path: path.join(screenshotsDir, '99-28-accept-invite-no-token.png'), fullPage: true });
    console.log('  -> 99-28-accept-invite-no-token.png');

    // Step 7: Accept invite page with invalid token
    console.log('Step 7: Accept invite - invalid token...');
    await invitePage.goto(`${BASE}/auth/accept-invite?token=invalid-test-token`, { waitUntil: 'networkidle' });
    // Capture loading state quickly
    await invitePage.waitForTimeout(500);
    await invitePage.screenshot({ path: path.join(screenshotsDir, '99-29-accept-invite-loading.png'), fullPage: true });
    console.log('  -> 99-29-accept-invite-loading.png');

    // Wait for error result
    await invitePage.waitForTimeout(5000);
    await invitePage.screenshot({ path: path.join(screenshotsDir, '99-30-accept-invite-invalid-token.png'), fullPage: true });
    console.log('  -> 99-30-accept-invite-invalid-token.png');
    await inviteContext.close();

    console.log('\nTask 99-02-02 complete: All reset/update/invite screenshots captured.');
  } catch (err) {
    console.error('Error:', err.message);
    try {
      await page.screenshot({ path: path.join(screenshotsDir, '99-debug-reset-error.png'), fullPage: true });
    } catch (_) { /* ignore */ }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
