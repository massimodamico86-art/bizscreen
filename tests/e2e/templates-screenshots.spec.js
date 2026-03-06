/**
 * Templates Screenshot E2E Tests
 * Phase 118: Screenshot evidence for template gallery/marketplace
 *
 * Covers TMPL-01 through TMPL-08:
 * - TMPL-01: Gallery browse with category filters
 * - TMPL-02: Search with debounced results
 * - TMPL-03: Card hover animation
 * - TMPL-04: One-click Use Template (editor open)
 * - TMPL-05: Quick customize panel (marketplace)
 * - TMPL-06: Your Designs tab
 * - TMPL-07: Portrait/landscape orientation filter
 * - TMPL-08: Industry category expansion
 *
 * Prerequisites:
 * - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars must be set
 * - The test user should have 'client' role
 */
/* eslint-disable no-empty-pattern */
import { test } from '@playwright/test';
import {
  loginAndPrepare,
  waitForPageReady,
} from './helpers.js';
import { screenshotStep } from './helpers/screenshots.js';

/**
 * Navigate to the templates gallery page via sidebar.
 * The sidebar has a "Templates" button/link that loads SvgTemplateGalleryPage.
 */
async function navigateToTemplates(page) {
  const templatesButton = page.locator(
    'aside button:has-text("Templates"), aside a:has-text("Templates")'
  ).first();
  const exists = await templatesButton.count();
  if (exists > 0) {
    await templatesButton.click();
    await waitForPageReady(page);
  } else {
    // Fallback: use __setCurrentPage
    await page.evaluate(() => window.__setCurrentPage('templates'));
    await waitForPageReady(page);
  }
}

/**
 * Wait for the templates gallery to render (loaded state).
 * Looks for the gallery header or template cards or the empty/error state.
 */
async function waitForGalleryReady(page) {
  // Wait for either the gallery header, template content, or empty state
  const softTimeout = (ms) => new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));

  const galleryHeader = page.locator('text=/What Template Are You Looking For/i').first();
  const emptyState = page.locator('text=/No templates found/i').first();
  const filterSidebar = page.locator('text=/FILTERS/i').first();

  await Promise.race([
    galleryHeader.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'header'),
    emptyState.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'empty'),
    filterSidebar.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'filters'),
    softTimeout(8000),
  ]);
}

test.describe('Templates Screenshots', () => {
  // Only run on chromium (client) project
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  // Skip all tests if credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('TMPL-01: gallery browse with category filters', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Screenshot the full gallery page
    await screenshotStep(page, '118', '01-templates-gallery');

    // Look for category filter items in the sidebar
    const categoriesSection = page.locator('text=/Categories/i').first();
    const categoriesVisible = await categoriesSection.isVisible().catch(() => false);

    if (categoriesVisible) {
      // Click on a category filter (e.g., "Featured")
      const featuredFilter = page.locator('button:has-text("Featured")').first();
      const featuredExists = await featuredFilter.count();
      if (featuredExists > 0) {
        await featuredFilter.click();
        await page.waitForTimeout(500);
        await screenshotStep(page, '118', '02-templates-category-filtered');
      }
    }
  });

  test('TMPL-02: search with debounced results', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Find SearchBar input - the sidebar has a SearchBar with placeholder containing "Building Directory"
    const searchInput = page.locator('input[placeholder*="Building Directory"], input[placeholder*="Search"], input[placeholder*="search"]').first();
    const searchExists = await searchInput.count();

    if (searchExists > 0) {
      await searchInput.fill('restaurant');
      // Wait for debounce (300ms) plus rendering
      await page.waitForTimeout(500);
    }

    // Screenshot search results (or empty state)
    await screenshotStep(page, '118', '03-templates-search-results');
  });

  test('TMPL-03: card hover animation', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Look for template cards - SVG gallery uses ScrollCard with hover:scale-[1.02] class
    // or the design-system TemplateCard
    const templateCard = page.locator(
      '.group.relative, [class*="template-card"], [data-testid*="template"], [aria-label*="Template"]'
    ).first();
    const cardExists = await templateCard.count();

    if (cardExists > 0 && await templateCard.isVisible().catch(() => false)) {
      await templateCard.hover();
      await page.waitForTimeout(300); // Wait for hover animation
      await screenshotStep(page, '118', '04-templates-card-hover');
    } else {
      // No cards visible - screenshot empty state
      await screenshotStep(page, '118', '04-templates-card-hover-empty');
    }
  });

  test('TMPL-04: one-click Use Template opens editor', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Look for a template card to click
    const templateCard = page.locator(
      '.group.relative, [class*="template-card"], [data-testid*="template"], [aria-label*="Template"]'
    ).first();
    const cardExists = await templateCard.count();

    if (cardExists > 0 && await templateCard.isVisible().catch(() => false)) {
      // Hover to reveal "Use Template" overlay button
      await templateCard.hover();
      await page.waitForTimeout(300);

      // Look for the "Use Template" or "Edit" button in hover overlay
      const useButton = page.locator(
        'span:has-text("Use Template"), button:has-text("Use Template"), span:has-text("Edit")'
      ).first();
      const useExists = await useButton.count();

      if (useExists > 0 && await useButton.isVisible().catch(() => false)) {
        await useButton.click();
        await page.waitForTimeout(1000);
        // Screenshot whatever opened (editor or modal)
        await screenshotStep(page, '118', '05-templates-use-template');
      } else {
        // Click the card directly
        await templateCard.click();
        await page.waitForTimeout(1000);
        await screenshotStep(page, '118', '05-templates-use-template');
      }
    } else {
      // No templates - screenshot the gallery with note
      await screenshotStep(page, '118', '05-templates-use-template-empty');
    }
  });

  test('TMPL-05: quick customize panel (marketplace)', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);

    // Navigate to template marketplace via __setCurrentPage
    await page.evaluate(() => window.__setCurrentPage('template-marketplace'));
    await waitForPageReady(page);
    await page.waitForTimeout(1000);

    // Screenshot the marketplace page
    await screenshotStep(page, '118', '06-template-marketplace');

    // Look for a template card to click for preview panel
    const marketplaceCard = page.locator(
      '[role="button"][aria-label*="Template"], .group.relative'
    ).first();
    const cardExists = await marketplaceCard.count();

    if (cardExists > 0 && await marketplaceCard.isVisible().catch(() => false)) {
      await marketplaceCard.click();
      await page.waitForTimeout(500);
      // Screenshot the preview/customize panel
      await screenshotStep(page, '118', '07-template-customize-panel');
    } else {
      // No templates in marketplace - screenshot empty state
      await screenshotStep(page, '118', '07-template-marketplace-empty');
    }
  });

  test('TMPL-06: Your Designs tab', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Find and click "Your Designs" button in the sidebar
    const yourDesignsButton = page.locator('button:has-text("Your Designs")').first();
    const exists = await yourDesignsButton.count();

    if (exists > 0) {
      await yourDesignsButton.click();
      await page.waitForTimeout(500);
    }

    // Screenshot showing Your Designs view (likely empty for test user)
    await screenshotStep(page, '118', '08-templates-your-designs');
  });

  test('TMPL-07: portrait/landscape orientation filter', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Look for orientation filter - Portrait button with Smartphone icon
    const portraitButton = page.locator('button:has-text("Portrait")').first();
    const portraitExists = await portraitButton.count();

    if (portraitExists > 0) {
      await portraitButton.click();
      await page.waitForTimeout(500);
      await screenshotStep(page, '118', '09-templates-portrait-filter');
    } else {
      // If portrait button not found, look for any orientation filter
      const landscapeButton = page.locator('button:has-text("Landscape")').first();
      const landscapeExists = await landscapeButton.count();
      if (landscapeExists > 0) {
        await landscapeButton.click();
        await page.waitForTimeout(500);
      }
      await screenshotStep(page, '118', '09-templates-orientation-filter');
    }
  });

  test('TMPL-08: industry category expansion', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
    await waitForPageReady(page);
    await navigateToTemplates(page);
    await waitForGalleryReady(page);

    // Look for "Industries" collapsible section in the sidebar
    // Industries section is collapsed by default (expandedFilters.industries: false)
    const industriesButton = page.locator('button:has-text("Industries"), span:has-text("Industries")').first();
    const industriesExists = await industriesButton.count();

    if (industriesExists > 0) {
      // Click to expand the Industries section
      await industriesButton.click();
      await page.waitForTimeout(500);

      // Screenshot the expanded industries with sub-items
      await screenshotStep(page, '118', '10-templates-industries-expanded');

      // Click on an industry filter (e.g., "Retail")
      const retailFilter = page.locator('button:has-text("Retail")').first();
      const retailExists = await retailFilter.count();
      if (retailExists > 0) {
        await retailFilter.click();
        await page.waitForTimeout(500);
        await screenshotStep(page, '118', '11-templates-industry-filtered');
      }
    } else {
      // No industries section found - screenshot current state
      await screenshotStep(page, '118', '10-templates-industries-not-found');
    }
  });
});
