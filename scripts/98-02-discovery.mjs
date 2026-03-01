/**
 * 98-02: Authenticated App Pages Discovery
 *
 * Navigates to every authenticated page inside the BizScreen app shell,
 * takes a screenshot, and captures accessibility snapshots for each.
 *
 * Uses window.__setCurrentPage exposed by App.jsx in dev mode.
 * Recovers from page crashes by reloading /app.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('screenshots');

// All pages to visit, organized by group
const pages = [
  // Group 1: Main Sidebar Pages
  { id: '98-10', pageId: 'dashboard', name: 'Dashboard', group: 1 },
  { id: '98-11', pageId: 'welcome', name: 'Welcome', group: 1 },
  { id: '98-12', pageId: 'media-all', name: 'Media All', group: 1 },
  { id: '98-13', pageId: 'media-images', name: 'Media Images', group: 1 },
  { id: '98-14', pageId: 'media-videos', name: 'Media Videos', group: 1 },
  { id: '98-15', pageId: 'media-audio', name: 'Media Audio', group: 1 },
  { id: '98-16', pageId: 'media-documents', name: 'Media Documents', group: 1 },
  { id: '98-17', pageId: 'media-webpages', name: 'Media Web Pages', group: 1 },
  { id: '98-18', pageId: 'apps', name: 'Apps', group: 1 },
  { id: '98-19', pageId: 'playlists', name: 'Playlists', group: 1 },
  { id: '98-20', pageId: 'templates', name: 'Templates', group: 1 },
  { id: '98-21', pageId: 'schedules', name: 'Schedules', group: 1 },
  { id: '98-22', pageId: 'screens', name: 'Screens', group: 1 },
  { id: '98-23', pageId: 'menu-boards', name: 'Menu Boards', group: 1 },

  // Group 2: Settings & Account Pages
  { id: '98-24', pageId: 'settings', name: 'Settings', group: 2 },
  { id: '98-25', pageId: 'account-plan', name: 'Account Plan', group: 2 },
  { id: '98-26', pageId: 'branding', name: 'Branding Settings', group: 2 },
  { id: '98-27', pageId: 'team', name: 'Team Management', group: 2 },
  { id: '98-28', pageId: 'activity', name: 'Activity Log', group: 2 },
  { id: '98-29', pageId: 'locations', name: 'Locations', group: 2 },
  { id: '98-30', pageId: 'help', name: 'Help Center', group: 2 },

  // Group 3: Feature-Gated Pages
  { id: '98-31', pageId: 'analytics', name: 'Analytics', group: 3 },
  { id: '98-32', pageId: 'analytics-dashboard', name: 'Analytics Dashboard', group: 3 },
  { id: '98-33', pageId: 'content-performance', name: 'Content Performance', group: 3 },
  { id: '98-34', pageId: 'campaigns', name: 'Campaigns', group: 3 },
  { id: '98-35', pageId: 'screen-groups', name: 'Screen Groups', group: 3 },
  { id: '98-36', pageId: 'assistant', name: 'AI Content Assistant', group: 3 },
  { id: '98-37', pageId: 'developer', name: 'Developer Settings', group: 3 },
  { id: '98-38', pageId: 'white-label', name: 'White Label Settings', group: 3 },
  { id: '98-39', pageId: 'usage', name: 'Usage Dashboard', group: 3 },
  { id: '98-40', pageId: 'enterprise-security', name: 'Enterprise Security', group: 3 },
  { id: '98-41', pageId: 'reseller-dashboard', name: 'Reseller Dashboard', group: 3 },
  { id: '98-42', pageId: 'reseller-billing', name: 'Reseller Billing', group: 3 },

  // Group 4: Content & Marketplace Pages
  { id: '98-43', pageId: 'scenes', name: 'Scenes', group: 4 },
  { id: '98-44', pageId: 'svg-templates', name: 'SVG Template Gallery', group: 4 },
  { id: '98-45', pageId: 'template-marketplace', name: 'Template Marketplace', group: 4 },
  { id: '98-46', pageId: 'data-sources', name: 'Data Sources', group: 4 },
  { id: '98-47', pageId: 'social-accounts', name: 'Social Accounts', group: 4 },
  { id: '98-48', pageId: 'content-moderation', name: 'Content Moderation', group: 4 },
  { id: '98-49', pageId: 'review-inbox', name: 'Review Inbox', group: 4 },
  { id: '98-50', pageId: 'translations', name: 'Translation Dashboard', group: 4 },

  // Group 5: Admin & Operations Pages
  { id: '98-51', pageId: 'admin-tenants', name: 'Admin Tenants List', group: 5 },
  { id: '98-52', pageId: 'admin-audit-logs', name: 'Admin Audit Logs', group: 5 },
  { id: '98-53', pageId: 'admin-system-events', name: 'Admin System Events', group: 5 },
  { id: '98-54', pageId: 'admin-templates', name: 'Admin Templates', group: 5 },
  { id: '98-55', pageId: 'tenant-admin', name: 'Tenant Admin', group: 5 },
  { id: '98-56', pageId: 'status', name: 'Status Page', group: 5 },
  { id: '98-57', pageId: 'ops-console', name: 'Ops Console', group: 5 },
  { id: '98-58', pageId: 'feature-flags', name: 'Feature Flags', group: 5 },
  { id: '98-59', pageId: 'demo-tools', name: 'Demo Tools', group: 5 },
  { id: '98-60', pageId: 'security', name: 'Security Dashboard', group: 5 },
  { id: '98-61', pageId: 'device-diagnostics', name: 'Device Diagnostics', group: 5 },
  { id: '98-62', pageId: 'service-quality', name: 'Service Quality', group: 5 },
  { id: '98-63', pageId: 'alerts', name: 'Alerts Center', group: 5 },
  { id: '98-64', pageId: 'notification-settings', name: 'Notification Settings', group: 5 },
  { id: '98-65', pageId: 'clients', name: 'Clients Page', group: 5 },
  { id: '98-66', pageId: 'admin-test', name: 'Admin Test', group: 5 },
  { id: '98-67', pageId: 'listings', name: 'Listings Legacy', group: 5 },
];

/**
 * Ensure the app is loaded and __setCurrentPage is available.
 * Reloads the page if needed (e.g., after a crash).
 */
async function ensureAppLoaded(page) {
  const hasGlobal = await page.evaluate(() => typeof window.__setCurrentPage === 'function');
  if (hasGlobal) return true;

  console.log('  [Recovery] Reloading /app...');
  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const hasGlobalAfterReload = await page.evaluate(() => typeof window.__setCurrentPage === 'function');
  if (!hasGlobalAfterReload) {
    console.log('  [Recovery] FAILED - __setCurrentPage still not available after reload');
    return false;
  }
  console.log('  [Recovery] App reloaded successfully');
  return true;
}

/**
 * Navigate to a page using the exposed window.__setCurrentPage function.
 */
async function navigateToPage(page, pageId) {
  const navigated = await page.evaluate((targetPage) => {
    if (typeof window.__setCurrentPage === 'function') {
      window.__setCurrentPage(targetPage);
      return true;
    }
    return false;
  }, pageId);
  return navigated;
}

/**
 * Check if the page shows an error boundary (crash screen).
 */
async function isErrorBoundary(page) {
  return await page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    return bodyText.includes('Reload Page') && bodyText.includes('Show Technical Details');
  });
}

async function captureInteractiveElements(page) {
  const interactiveElements = [];

  try {
    const ariaSnapshotText = await page.locator('body').ariaSnapshot({ timeout: 5000 });

    // Parse aria snapshot for interactive elements
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
    return { ariaSnapshotText, interactiveElements };
  } catch (snapErr) {
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
    return { ariaSnapshotText: '(fallback)', interactiveElements };
  }
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Collect console errors for debugging
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('Navigating to /app...');
  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Verify we're on the app and __setCurrentPage is available
  const hasGlobal = await page.evaluate(() => typeof window.__setCurrentPage === 'function');
  console.log(`window.__setCurrentPage available: ${hasGlobal}`);

  if (!hasGlobal) {
    console.error('FATAL: window.__setCurrentPage not found.');
    await browser.close();
    process.exit(1);
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;
  const crashedPages = [];

  for (const entry of pages) {
    const screenshotPath = path.join(SCREENSHOT_DIR, `${entry.id}-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.png`);

    console.log(`\n--- ${entry.id}: ${entry.name} (pageId: ${entry.pageId}) ---`);

    try {
      // Ensure app is loaded (recover from previous crash)
      const appReady = await ensureAppLoaded(page);
      if (!appReady) {
        console.log(`  SKIP: Cannot recover app state`);
        results.push({
          ...entry,
          screenshotFile: null,
          interactiveElements: 0,
          elements: [],
          error: 'App recovery failed',
          crashed: false,
          unreachable: true,
        });
        errorCount++;
        continue;
      }

      // Navigate to the page via global hook
      const navigated = await navigateToPage(page, entry.pageId);
      if (!navigated) {
        console.log(`  UNREACHABLE: ${entry.pageId}`);
        results.push({
          ...entry,
          screenshotFile: null,
          interactiveElements: 0,
          elements: [],
          error: 'Navigation failed',
          crashed: false,
          unreachable: true,
        });
        errorCount++;
        continue;
      }

      // Wait for React to re-render
      await page.waitForTimeout(1200);

      // Check for loading spinners and wait
      try {
        await page.waitForFunction(() => {
          const loaders = document.querySelectorAll('.animate-pulse, .animate-spin, [class*="loader"], [class*="spinner"]');
          for (const loader of loaders) {
            if (loader.offsetWidth > 100 || loader.offsetHeight > 100) return false;
          }
          return true;
        }, { timeout: 3000 });
      } catch {
        // Timeout waiting for loaders
      }

      await page.waitForTimeout(300);

      // Check if page crashed (error boundary)
      const crashed = await isErrorBoundary(page);
      if (crashed) {
        console.log(`  CRASHED: ${entry.pageId} hit error boundary`);
        crashedPages.push(entry.pageId);
      }

      // Take screenshot regardless (crash page IS a valid discovery result)
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot: ${path.basename(screenshotPath)}${crashed ? ' (CRASHED)' : ''}`);

      // Capture accessibility snapshot
      const { ariaSnapshotText, interactiveElements } = await captureInteractiveElements(page);
      console.log(`  Interactive elements: ${interactiveElements.length}`);

      // Log a few elements
      for (const el of interactiveElements.slice(0, 5)) {
        console.log(`    [${el.role}] ${el.name}`);
      }
      if (interactiveElements.length > 5) {
        console.log(`    ... and ${interactiveElements.length - 5} more`);
      }

      results.push({
        ...entry,
        screenshotFile: path.basename(screenshotPath),
        interactiveElements: interactiveElements.length,
        elements: interactiveElements,
        error: crashed ? 'Error boundary (crash)' : null,
        crashed,
        unreachable: false,
      });
      successCount++;

    } catch (err) {
      console.error(`  ERROR: ${err.message}`);

      // Try to take a screenshot of whatever state we're in
      try {
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  Screenshot (error state): ${path.basename(screenshotPath)}`);
        results.push({
          ...entry,
          screenshotFile: path.basename(screenshotPath),
          interactiveElements: 0,
          elements: [],
          error: err.message,
          crashed: true,
          unreachable: false,
        });
        successCount++; // Still got a screenshot
      } catch {
        results.push({
          ...entry,
          screenshotFile: null,
          interactiveElements: 0,
          elements: [],
          error: err.message,
          crashed: false,
          unreachable: true,
        });
        errorCount++;
      }
    }
  }

  await browser.close();

  // Write results JSON
  const resultsPath = path.join(SCREENSHOT_DIR, '98-02-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${resultsPath}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total pages: ${pages.length}`);
  console.log(`Screenshots captured: ${results.filter(r => r.screenshotFile).length}`);
  console.log(`Crashed pages: ${crashedPages.length}`);
  console.log(`Unreachable: ${results.filter(r => r.unreachable).length}`);

  if (crashedPages.length > 0) {
    console.log('\nCrashed pages (error boundary):');
    for (const p of crashedPages) {
      console.log(`  - ${p}`);
    }
  }

  // Group summary
  for (let g = 1; g <= 5; g++) {
    const groupPages = pages.filter(p => p.group === g);
    const groupScreenshots = results.filter(r => r.group === g && r.screenshotFile);
    const groupCrashed = results.filter(r => r.group === g && r.crashed);
    console.log(`\nGroup ${g}: ${groupScreenshots.length}/${groupPages.length} screenshots (${groupCrashed.length} crashed)`);
  }

  // Verify files exist
  const capturedScreenshots = results.filter(r => r.screenshotFile);
  const missing = capturedScreenshots.filter(r =>
    !fs.existsSync(path.join(SCREENSHOT_DIR, r.screenshotFile))
  );
  if (missing.length > 0) {
    console.log(`\nMISSING files: ${missing.map(r => r.screenshotFile).join(', ')}`);
  } else {
    console.log('\nAll screenshot files verified on disk.');
  }

  // Log any console errors captured
  if (consoleErrors.length > 0) {
    console.log(`\nConsole errors captured: ${consoleErrors.length}`);
    for (const err of consoleErrors.slice(0, 10)) {
      console.log(`  ${err.substring(0, 200)}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
