/**
 * 98-01: Public Routes & Auth Pages Discovery
 *
 * Navigates to all public routes, takes screenshots,
 * and captures accessibility snapshots.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('screenshots');

const routes = [
  { id: '98-01', path: '/', name: 'Homepage (Marketing)' },
  { id: '98-02', path: '/features', name: 'Features Page' },
  { id: '98-03', path: '/pricing', name: 'Pricing Page' },
  { id: '98-04', path: '/auth/login', name: 'Login Page' },
  { id: '98-05', path: '/auth/signup', name: 'Signup Page' },
  { id: '98-06', path: '/auth/reset-password', name: 'Reset Password Page' },
  { id: '98-07', path: '/auth/update-password', name: 'Update Password Page' },
  { id: '98-08', path: '/auth/accept-invite', name: 'Accept Invite Page' },
  { id: '98-09', path: '/preview/test-token', name: 'Public Preview Page' },
];

async function main() {
  // Ensure screenshot dir exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const results = [];

  for (const route of routes) {
    const url = `${BASE_URL}${route.path}`;
    const screenshotPath = path.join(SCREENSHOT_DIR, `${route.id}-${route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.png`);

    console.log(`\n--- Route ${route.id}: ${route.name} ---`);
    console.log(`  URL: ${url}`);

    try {
      // Navigate
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      const finalUrl = page.url();
      const status = response ? response.status() : 'unknown';

      console.log(`  Status: ${status}`);
      console.log(`  Final URL: ${finalUrl}`);

      // Wait a bit for any animations/renders
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot: ${screenshotPath}`);

      // Get accessibility snapshot via ariaSnapshot (Playwright 1.49+)
      let ariaSnapshotText = '';
      const interactiveElements = [];
      try {
        ariaSnapshotText = await page.locator('body').ariaSnapshot({ timeout: 5000 });
        console.log(`  Aria snapshot length: ${ariaSnapshotText.length} chars`);

        // Parse aria snapshot text for interactive elements
        const lines = ariaSnapshotText.split('\n');
        for (const line of lines) {
          const match = line.match(/- (button|link|textbox|checkbox|radio|combobox|tab|menuitem|switch|slider|spinbutton)\s+"?([^"]*)"?/i);
          if (match) {
            interactiveElements.push({
              role: match[1].toLowerCase(),
              name: match[2] || '(unnamed)',
            });
          }
        }
      } catch (snapErr) {
        console.log(`  Aria snapshot fallback: using querySelectorAll`);
        // Fallback: query interactive elements directly
        const elements = await page.evaluate(() => {
          const selectors = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="combobox"], [role="switch"]';
          const els = document.querySelectorAll(selectors);
          return Array.from(els).map(el => ({
            role: el.role || el.tagName.toLowerCase(),
            name: el.getAttribute('aria-label') || el.textContent?.trim().substring(0, 80) || el.getAttribute('placeholder') || '(unnamed)',
          }));
        });
        interactiveElements.push(...elements);
      }

      console.log(`  Interactive elements: ${interactiveElements.length}`);
      for (const el of interactiveElements.slice(0, 20)) {
        console.log(`    [${el.role}] ${el.name}`);
      }
      if (interactiveElements.length > 20) {
        console.log(`    ... and ${interactiveElements.length - 20} more`);
      }

      // Check if page redirected
      const redirected = finalUrl !== url;

      results.push({
        ...route,
        url,
        finalUrl,
        status,
        redirected,
        screenshotFile: path.basename(screenshotPath),
        interactiveElements: interactiveElements.length,
        elements: interactiveElements,
        error: null,
      });

    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({
        ...route,
        url,
        finalUrl: null,
        status: 'error',
        redirected: false,
        screenshotFile: null,
        interactiveElements: 0,
        elements: [],
        error: err.message,
      });
    }
  }

  await browser.close();

  // Write results JSON for later use
  const resultsPath = path.join(SCREENSHOT_DIR, '98-01-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n\nResults written to ${resultsPath}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total routes: ${routes.length}`);
  console.log(`Successful: ${results.filter(r => !r.error).length}`);
  console.log(`Errors: ${results.filter(r => r.error).length}`);
  console.log(`Redirected: ${results.filter(r => r.redirected).length}`);

  // Check all screenshots exist
  const missingScreenshots = results.filter(r => r.screenshotFile && !fs.existsSync(path.join(SCREENSHOT_DIR, r.screenshotFile)));
  if (missingScreenshots.length > 0) {
    console.log(`MISSING screenshots: ${missingScreenshots.map(r => r.screenshotFile).join(', ')}`);
  } else {
    console.log('All screenshots captured successfully.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
