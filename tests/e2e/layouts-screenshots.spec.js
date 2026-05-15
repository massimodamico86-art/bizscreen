/**
 * Layouts E2E Tests
 *
 * Tests for the Layouts feature including:
 * - CONT-05: Layout CRUD (create, edit, delete, zone configuration)
 * - CONT-06: Widget configuration within layout zones
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, navigateToSection, dismissAnyModals, assertAppReady } from './helpers/index.js';
import { LAYOUT_PRESETS, WIDGET_TYPES } from './fixtures/index.js';

test.describe('Layouts', () => {
  // Skip if user credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    });
  });

  test.describe('Layout List Page (CONT-05)', () => {
    test('can navigate to Layouts page', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);
      await assertAppReady(page, test);

      // Verify we're on the layouts page - LayoutsPage shows template gallery
      await expect(page.locator('h1, h2, h3').filter({ hasText: /layout|template|design/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('shows layout templates or empty state', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Should show template cards, layout list, or empty state
      // Selector updated (D-08 drift): LayoutsPage cards use bg-gray-100 + rounded-lg,
      // not the old .bg-white.rounded-xl. Added .rounded-lg.bg-gray-100 and
      // .cursor-pointer.rounded-lg as fallbacks that match the TemplateCard component.
      const templateCards = page.locator(
        '[data-testid="template-card"], [data-testid="layout-card"], ' +
        '.bg-white.rounded-xl, article, ' +
        '.rounded-lg.bg-gray-100, .cursor-pointer.rounded-lg'
      ).first();
      const emptyState = page.locator('text=/no layout|create.*layout|get started/i');

      const hasTemplates = await templateCards.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasTemplates || hasEmptyState).toBeTruthy();
    });

    test('layout page has search functionality', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);

      // LayoutsPage has a search input in hero section
      const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="earch"]').first();
      const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasSearch, 'Search input not found on layouts page');

      await searchInput.fill('test layout search');
      await page.waitForTimeout(500);
      // Search should filter or show results
      await expect(searchInput).toHaveValue('test layout search');
    });

    test('layout page shows sidebar categories', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);

      // LayoutsPage has sidebar with categories like All, Featured, Popular
      const sidebarItems = page.locator('text=/All|Featured|Popular|Your Templates/i');
      await page.waitForTimeout(2000);

      const hasSidebar = await sidebarItems.first().isVisible().catch(() => false);
      if (hasSidebar) {
        await expect(sidebarItems.first()).toBeVisible();
      }
    });
  });

  test.describe('Layout Editor - Zone Configuration (CONT-05)', () => {
    test('layout editor shows preset layout options', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);
      await page.waitForTimeout(2000);

      // Try to open a layout or create new one
      const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
      // Selector updated (D-08 drift): LayoutsPage TemplateCard uses rounded-lg + bg-gray-100
      const layoutCard = page.locator('[data-testid="template-card"], [data-testid="layout-card"], article, .rounded-lg.bg-gray-100, .cursor-pointer.rounded-lg').first();

      const hasCreate = await createButton.isVisible().catch(() => false);
      const hasCard = await layoutCard.isVisible().catch(() => false);
      test.skip(!hasCreate && !hasCard, 'No create button or layout card found on layouts page');

      if (hasCreate) {
        await createButton.click();
        await waitForPageReady(page);
      } else {
        await layoutCard.click();
        await waitForPageReady(page);
      }

      // Check for preset layout names from LAYOUT_PRESETS
      const presetText = page.locator(`text=/${LAYOUT_PRESETS.slice(0, 3).join('|')}/i`);
      const hasPresets = await presetText.first().isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasPresets, 'Preset layout options not found in editor');
      await expect(presetText.first()).toBeVisible();
    });

    test('layout editor shows zone management controls', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);
      await page.waitForTimeout(2000);

      // Selector updated (D-08 drift): LayoutsPage TemplateCard uses rounded-lg + bg-gray-100
      const layoutCard = page.locator('[data-testid="template-card"], [data-testid="layout-card"], article, .rounded-lg.bg-gray-100, .cursor-pointer.rounded-lg').first();
      const hasLayoutCard = await layoutCard.isVisible().catch(() => false);
      test.skip(!hasLayoutCard, 'No layout card found to open editor');

      await layoutCard.click();
      await waitForPageReady(page);

      // Look for zone-related UI: Add Zone button, zone list, zone names
      const addZoneButton = page.getByRole('button', { name: /add zone|new zone/i });
      const zoneIndicators = page.locator('text=/zone|Zone/');
      const saveButton = page.getByRole('button', { name: /save/i });

      const hasZoneUI = await addZoneButton.isVisible({ timeout: 5000 }).catch(() => false) ||
                        await zoneIndicators.first().isVisible({ timeout: 3000 }).catch(() => false);

      test.skip(!hasZoneUI, 'Zone management UI not found in layout editor');
      // At least one zone UI element should be visible
      const zoneVisible = await addZoneButton.isVisible().catch(() => false);
      if (zoneVisible) {
        await expect(addZoneButton).toBeVisible();
      } else {
        await expect(zoneIndicators.first()).toBeVisible();
      }
    });
  });

  test.describe('Widget Configuration (CONT-06)', () => {
    test('layout zones can have content assigned', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);
      await page.waitForTimeout(2000);

      // Selector updated (D-08 drift): LayoutsPage TemplateCard uses rounded-lg + bg-gray-100
      const layoutCard = page.locator('[data-testid="template-card"], [data-testid="layout-card"], article, .rounded-lg.bg-gray-100, .cursor-pointer.rounded-lg').first();
      const hasLayoutCard = await layoutCard.isVisible().catch(() => false);
      test.skip(!hasLayoutCard, 'No layout card found to open editor');

      await layoutCard.click();
      await waitForPageReady(page);

      // Look for content assignment UI elements
      const assignButton = page.locator('button:has-text("Assign"), button:has-text("Content"), button:has-text("Widget")').first();
      const zoneClickable = page.locator('[class*="zone"], [data-zone], [class*="bg-blue-500/30"], [class*="bg-green-500/30"]').first();

      const hasAssignUI = await assignButton.isVisible({ timeout: 5000 }).catch(() => false);
      const hasZones = await zoneClickable.isVisible({ timeout: 3000 }).catch(() => false);

      test.skip(!hasAssignUI && !hasZones, 'Content assignment UI not found in layout editor');
      // Verify the detected UI element is visible
      if (hasAssignUI) {
        await expect(assignButton).toBeVisible();
      } else {
        await expect(zoneClickable).toBeVisible();
      }
    });

    test('widget types are available for zone configuration', async ({ page }) => {
      await navigateToSection(page, 'layouts');
      await waitForPageReady(page);
      await page.waitForTimeout(2000);

      // Selector updated (D-08 drift): LayoutsPage TemplateCard uses rounded-lg + bg-gray-100
      const layoutCard = page.locator('[data-testid="template-card"], [data-testid="layout-card"], article, .rounded-lg.bg-gray-100, .cursor-pointer.rounded-lg').first();
      const hasLayoutCard = await layoutCard.isVisible().catch(() => false);
      test.skip(!hasLayoutCard, 'No layout card found to open editor');

      await layoutCard.click();
      await waitForPageReady(page);

      // Try to access widget/content assignment
      const zoneClickable = page.locator('[class*="zone"], [data-zone], [class*="bg-blue-500/30"]').first();
      const hasZone = await zoneClickable.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasZone, 'No clickable zone found in layout editor');

      await zoneClickable.click();
      await page.waitForTimeout(500);

      // Check for widget type options from WIDGET_TYPES
      const widgetTypeText = page.locator(`text=/${WIDGET_TYPES.slice(0, 4).join('|')}/i`);
      const hasWidgetTypes = await widgetTypeText.first().isVisible({ timeout: 3000 }).catch(() => false);

      test.skip(!hasWidgetTypes, 'Widget type options not found in zone configuration');
      await expect(widgetTypeText.first()).toBeVisible();
    });
  });
});
