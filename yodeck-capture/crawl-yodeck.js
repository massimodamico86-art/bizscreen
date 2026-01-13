// crawl-yodeck.js
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * BASIC CONFIG
 */
const BASE_URL = 'https://app.yodeck.com';
const LOGIN_URL = `${BASE_URL}/login`; // adjust if different

// Sidebar navigation items to click (by link text or partial href)
// Yodeck is a SPA so we navigate by clicking sidebar items
const SIDEBAR_ITEMS = [
  { name: 'dashboard', text: 'Dashboard' },
  { name: 'media', text: 'Media' },
  { name: 'playlists', text: 'Playlists' },
  { name: 'layouts', text: 'Layouts' },
  { name: 'screens', text: 'Screens' },
  { name: 'schedules', text: 'Schedules' },
  { name: 'apps', text: 'Apps' },
  { name: 'settings', text: 'Settings' },
];

// Yodeck has a two-step login: email first, then password
const LOGIN_SELECTORS = {
  email: 'input[placeholder="Enter your Email"]',
  continueBtn: 'button:has-text("CONTINUE")',
  password: 'input[type="password"]',
  submit: 'button[type="submit"]',
};

const OUTPUT_DIR = path.join(__dirname, 'capture');

/**
 * Helpers
 */
async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function safeFilenameFromUrl(urlStr, suffix = '') {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname === '/' ? 'root' : url.pathname;
    const cleanPath = pathname.replace(/[^\w\-]+/g, '_').replace(/^_+/, '');
    const searchHash = url.search ? '_' + Buffer.from(url.search).toString('base64').slice(0, 12) : '';
    const base = (cleanPath + searchHash + (suffix ? '_' + suffix : '')) || 'file';
    return base.slice(0, 120);
  } catch {
    return 'file';
  }
}

(async () => {
  // Run in headed mode to avoid bot detection
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000); // 60 second timeout

  // Capture CSS, JS bundles, JSON APIs
  context.on('response', async (response) => {
    try {
      const url = response.url();
      const headers = response.headers();
      const ct = (headers['content-type'] || '').toLowerCase();

      if (ct.includes('text/css')) {
        const body = await response.text();
        const fname = safeFilenameFromUrl(url, 'css') + '.css';
        const fpath = path.join(OUTPUT_DIR, 'css', fname);
        await ensureDir(fpath);
        await fs.writeFile(fpath, body, 'utf8');
        return;
      }

      if (ct.includes('javascript') || url.endsWith('.js')) {
        const body = await response.text();
        const fname = safeFilenameFromUrl(url, 'js') + '.js';
        const fpath = path.join(OUTPUT_DIR, 'js', fname);
        await ensureDir(fpath);
        await fs.writeFile(fpath, body, 'utf8');
        return;
      }

      if (ct.includes('application/json')) {
        const body = await response.text();
        const fname = safeFilenameFromUrl(url, 'json') + '.json';
        const fpath = path.join(OUTPUT_DIR, 'api', fname);
        await ensureDir(fpath);
        await fs.writeFile(fpath, body, 'utf8');
        return;
      }
    } catch (_) {
      // ignore per-response errors
    }
  });

  // Login (credentials via env vars)
  console.log('Navigating to login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000); // Let the page settle

  const email = process.env.YODECK_EMAIL;
  const password = process.env.YODECK_PASSWORD;

  if (!email || !password) {
    console.error('Set YODECK_EMAIL and YODECK_PASSWORD env vars before running.');
    await browser.close();
    process.exit(1);
  }

  // MANUAL LOGIN MODE - Let user log in manually
  console.log('\n========================================');
  console.log('MANUAL LOGIN MODE');
  console.log('========================================');
  console.log('Please log in manually in the browser window.');
  console.log('Waiting for dashboard to appear (up to 2 minutes)...');
  console.log('========================================\n');

  // Wait for dashboard to appear (detect post-login state)
  try {
    // Wait for URL to change away from login, or for dashboard elements
    await page.waitForFunction(() => {
      return !window.location.href.includes('/login') ||
             document.querySelector('[data-testid="dashboard"]') ||
             document.querySelector('.dashboard') ||
             document.querySelector('nav') ||
             document.querySelector('.sidebar');
    }, { timeout: 120000 });

    // Extra wait for the page to fully load
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
  } catch (e) {
    console.log('Timeout waiting for login. Current URL:', page.url());
  }

  console.log('Continuing with capture...');
  console.log('Current URL:', page.url());
  await page.waitForTimeout(2000);

  // Take screenshot of post-login state
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug', 'post-login.png'), fullPage: true });
  console.log('Saved post-login screenshot');

  // Capture the initial dashboard
  const dashHtml = await page.content();
  await ensureDir(path.join(OUTPUT_DIR, 'html', 'dashboard.html'));
  await fs.writeFile(path.join(OUTPUT_DIR, 'html', 'dashboard.html'), dashHtml, 'utf8');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'screens', 'dashboard.png'), fullPage: true });
  console.log('Captured: dashboard (initial)');

  // Navigate through sidebar items
  for (const item of SIDEBAR_ITEMS) {
    try {
      console.log(`Navigating to: ${item.name}`);

      // Try to find and click the sidebar link
      const sidebarLink = page.locator(`nav a:has-text("${item.text}"), .sidebar a:has-text("${item.text}"), aside a:has-text("${item.text}"), a:has-text("${item.text}")`).first();

      const linkExists = await sidebarLink.count() > 0;
      if (linkExists) {
        await sidebarLink.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle').catch(() => {});

        const html = await page.content();
        const htmlPath = path.join(OUTPUT_DIR, 'html', `${item.name}.html`);
        await ensureDir(htmlPath);
        await fs.writeFile(htmlPath, html, 'utf8');

        const screenshotPath = path.join(OUTPUT_DIR, 'screens', `${item.name}.png`);
        await ensureDir(screenshotPath);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        console.log(`Captured: ${item.name}`);
      } else {
        console.log(`Sidebar link not found for: ${item.name}`);
      }
    } catch (e) {
      console.error(`Error capturing ${item.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('Done. Data saved under:', OUTPUT_DIR);
})();
