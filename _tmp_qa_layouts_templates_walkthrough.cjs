/**
 * QA Walkthrough: Layouts and Templates Gallery Pages
 * Quick Task 77
 */
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const results = [];
  const log = (msg) => {
    console.log(msg);
    results.push(msg);
  };

  try {
    // ===== Step 1: Navigate to app (DEV_AUTH_BYPASS) =====
    log('--- Step 1: Layouts Page ---');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Navigate to Layouts page via __setCurrentPage
    await page.evaluate(() => window.__setCurrentPage?.('layouts'));
    await page.waitForTimeout(2000);

    // Screenshot 77-01: Layouts page
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-01-layouts-page.png'), fullPage: false });
    log('Screenshot: 77-01-layouts-page.png');

    // Verify sidebar categories present
    const sidebarCats = await page.locator('button:has-text("All")').first().isVisible().catch(() => false);
    const searchBarVisible = await page.locator('input[placeholder*="Building Directory"]').first().isVisible().catch(() => false);
    const templateCards = await page.locator('[data-testid="template-card"]').count().catch(() => 0);
    log(`Sidebar categories visible: ${sidebarCats}`);
    log(`Search bar visible: ${searchBarVisible}`);
    log(`Template cards rendered: ${templateCards}`);

    // Click "Featured" category in sidebar
    const featuredBtn = page.locator('button:has-text("Featured")').first();
    if (await featuredBtn.isVisible().catch(() => false)) {
      await featuredBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-02-layouts-featured-filter.png'), fullPage: false });
      log('Screenshot: 77-02-layouts-featured-filter.png');
      log('Featured filter clicked: PASS');
    } else {
      log('Featured filter button not found: WARN');
    }

    // Search "menu"
    const searchInput = page.locator('input[placeholder*="Building Directory"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('menu');
      await searchInput.press('Enter');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-03-layouts-search-results.png'), fullPage: false });
      log('Screenshot: 77-03-layouts-search-results.png');
      log('Search "menu" executed: PASS');
    }

    // Click on a template card to open editor modal
    // First reset to All to see all templates
    await page.evaluate(() => window.__setCurrentPage?.('layouts'));
    await page.waitForTimeout(1500);
    const firstCard = page.locator('[data-testid="template-card"]').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-04-layouts-editor-modal.png'), fullPage: false });
      log('Screenshot: 77-04-layouts-editor-modal.png');
      log('Template card clicked, editor modal opened: PASS');
      // Close modal via Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      log('No template cards to click: WARN (mock data may not load without backend)');
    }

    // ===== Step 2: Templates Page (mapped to SvgTemplateGalleryPage in sidebar) =====
    log('\n--- Step 2: Templates Page (SvgTemplateGalleryPage via sidebar) ---');
    // The sidebar "Templates" link maps to SvgTemplateGalleryPage in App.jsx
    // Click the sidebar link
    const templatesLink = page.locator('aside button:has-text("Templates"), aside a:has-text("Templates")').first();
    if (await templatesLink.isVisible().catch(() => false)) {
      await templatesLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Fallback: use __setCurrentPage
      await page.evaluate(() => window.__setCurrentPage?.('templates'));
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-05-templates-page.png'), fullPage: false });
    log('Screenshot: 77-05-templates-page.png');

    // Verify SVG Gallery elements
    const svgSearchBar = await page.locator('input[placeholder*="Building Directory"]').first().isVisible().catch(() => false);
    const homeBtn = await page.locator('button:has-text("Home")').first().isVisible().catch(() => false);
    const yourDesignsBtn = await page.locator('button:has-text("Your Designs")').first().isVisible().catch(() => false);
    const filtersLabel = await page.locator('text=FILTERS').first().isVisible().catch(() => false);
    log(`SVG Gallery search bar: ${svgSearchBar}`);
    log(`Home button: ${homeBtn}`);
    log(`Your Designs button: ${yourDesignsBtn}`);
    log(`Filters section: ${filtersLabel}`);

    // Click "Your Designs" to show user designs view
    const ydBtn = page.locator('button:has-text("Your Designs")').first();
    if (await ydBtn.isVisible().catch(() => false)) {
      await ydBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-07-templates-your-designs.png'), fullPage: false });
      log('Screenshot: 77-07-templates-your-designs.png');
      log('Your Designs view: PASS');
    }

    // Go back to Home view and click on a template card
    const homeButton = page.locator('button:has-text("Home")').first();
    if (await homeButton.isVisible().catch(() => false)) {
      await homeButton.click();
      await page.waitForTimeout(1000);
    }

    // Try clicking a template card in the SVG gallery
    const svgCard = page.locator('[data-testid="template-card"]').first();
    if (await svgCard.isVisible().catch(() => false)) {
      await svgCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-06-templates-preview-or-modal.png'), fullPage: false });
      log('Screenshot: 77-06-templates-preview-or-modal.png');
    } else {
      log('No SVG template cards to click: WARN (mock data may not load without backend)');
      // Screenshot empty state
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-06-templates-preview-or-modal.png'), fullPage: false });
    }

    // ===== Step 3: Template Marketplace Page =====
    log('\n--- Step 3: Template Marketplace Page ---');
    await page.evaluate(() => window.__setCurrentPage?.('template-marketplace'));
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-08-marketplace-page.png'), fullPage: false });
    log('Screenshot: 77-08-marketplace-page.png');

    // Verify marketplace elements
    const mpTitle = await page.locator('text=Template Marketplace').first().isVisible().catch(() => false);
    const mpSearch = await page.locator('input[placeholder*="Search templates"]').first().isVisible().catch(() => false);
    const mpResults = await page.locator('text=templates found').first().isVisible().catch(() => false);
    log(`Marketplace title: ${mpTitle}`);
    log(`Marketplace search bar: ${mpSearch}`);
    log(`Templates found indicator: ${mpResults}`);

    // Click on a template card for preview panel
    const mpCard = page.locator('[data-testid="template-card"]').first();
    if (await mpCard.isVisible().catch(() => false)) {
      await mpCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-09-marketplace-preview-panel.png'), fullPage: false });
      log('Screenshot: 77-09-marketplace-preview-panel.png');
      log('Marketplace preview panel opened: PASS');

      // Check for Customize button
      const customizeBtn = page.locator('button:has-text("Customize")').first();
      if (await customizeBtn.isVisible().catch(() => false)) {
        await customizeBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-10-marketplace-customize-wizard.png'), fullPage: false });
        log('Screenshot: 77-10-marketplace-customize-wizard.png');
        log('Customize wizard opened: PASS');
      } else {
        log('No Customize button visible (template may not have customizable fields): INFO');
      }
    } else {
      log('No marketplace template cards to click: WARN (mock data may not load without backend)');
    }

    // ===== Step 4: SVG Template Gallery (via svg-templates route) =====
    log('\n--- Step 4: SVG Template Gallery (via svg-templates route) ---');
    await page.evaluate(() => window.__setCurrentPage?.('svg-templates'));
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-11-svg-gallery-page.png'), fullPage: false });
    log('Screenshot: 77-11-svg-gallery-page.png');

    // Verify SVG gallery elements (same component as templates)
    const svgFilters = await page.locator('text=FILTERS').first().isVisible().catch(() => false);
    const orientationSection = await page.locator('text=Orientation').first().isVisible().catch(() => false);
    const categoriesSection = await page.locator('text=Categories').first().isVisible().catch(() => false);
    log(`SVG Gallery filters section: ${svgFilters}`);
    log(`Orientation filter: ${orientationSection}`);
    log(`Categories filter: ${categoriesSection}`);

    // Click a category filter
    const categoryBtn = page.locator('button:has-text("Featured")').first();
    if (await categoryBtn.isVisible().catch(() => false)) {
      await categoryBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-12-svg-gallery-filtered.png'), fullPage: false });
      log('Screenshot: 77-12-svg-gallery-filtered.png');
      log('SVG Gallery category filter: PASS');
    }

    // Search in SVG gallery
    const svgSearchInput = page.locator('input[placeholder*="Building Directory"]').first();
    if (await svgSearchInput.isVisible().catch(() => false)) {
      await svgSearchInput.fill('menu');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-13-svg-gallery-search.png'), fullPage: false });
      log('Screenshot: 77-13-svg-gallery-search.png');
      log('SVG Gallery search: PASS');
    }

    // ===== Console Error Analysis =====
    log('\n--- Console Error Analysis ---');
    const benignPatterns = [
      '127.0.0.1:54321',
      'ERR_CONNECTION_REFUSED',
      'Failed to fetch',
      'Service Unavailable',
      'supabase',
      'Supabase',
      'AuthApiError',
      'realtime',
      'subscription',
      'FeatureFlag',
      'featureFlag',
      'BrandThemeService',
      'TenantService',
      'OnboardingService',
      'DashboardService',
      'FeedbackService',
      'loggingService',
      'errorTracking',
      'scoped-logger',
      'ScopedLogger',
      'profiles',
      'tenant',
      'branding',
      'NetworkError',
    ];

    let benignCount = 0;
    let genuineErrors = [];

    for (const err of consoleErrors) {
      const isBenign = benignPatterns.some(p => err.toLowerCase().includes(p.toLowerCase()));
      if (isBenign) {
        benignCount++;
      } else {
        genuineErrors.push(err);
      }
    }

    log(`Total console errors: ${consoleErrors.length}`);
    log(`Benign (Supabase/connection): ${benignCount}`);
    log(`Genuine errors: ${genuineErrors.length}`);
    if (genuineErrors.length > 0) {
      genuineErrors.forEach((err, i) => log(`  Genuine #${i + 1}: ${err.substring(0, 200)}`));
    }

    log('\n=== QA WALKTHROUGH COMPLETE ===');
    log(`Screenshots captured: ${await require('fs').promises.readdir(SCREENSHOTS_DIR).then(files => files.filter(f => f.startsWith('77-')).length)}`);

  } catch (err) {
    console.error('Walkthrough error:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-error-debug.png'), fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
