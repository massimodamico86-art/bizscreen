const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: 'playwright/.auth/client.json' });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => {
    console.log('PAGE ERROR: ' + err.message);
    errors.push(err.message);
  });

  console.log('=== Testing Media Page with 10s wait ===');
  await page.goto('http://localhost:5173/app/media');

  // Wait for loading to finish (look for content or timeout)
  try {
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    console.log('Page finished loading');
  } catch (e) {
    console.log('Still loading after 10s');
  }

  await page.screenshot({ path: 'test-results/media-10s.png' });

  // Check what buttons exist
  const buttons = await page.locator('button:visible').allTextContents();
  console.log('Buttons found: ' + buttons.filter(b => b.trim()).slice(0, 5).join(', '));

  // Try to click Upload button directly
  const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Add Media")');
  if (await uploadBtn.count() > 0) {
    console.log('Clicking Upload/Add Media button...');
    await uploadBtn.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/media-modal-10s.png' });
    console.log('Modal screenshot saved');
  }

  await browser.close();

  console.log('\n=== RESULTS ===');
  console.log('JavaScript errors: ' + errors.length);
  errors.forEach(e => console.log('  ' + e));
})();
