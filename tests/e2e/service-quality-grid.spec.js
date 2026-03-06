/**
 * Service Quality Grid Layout E2E Tests
 *
 * Verifies that the Service Quality page renders CSS grid containers
 * (from design-system Grid component) instead of broken SVG icon elements.
 * This confirms the BUG-01 fix from quick-50 is holding.
 */
import { test, expect } from '@playwright/test';

test.describe('Service Quality Grid Layout', () => {
  test.setTimeout(30000);

  test.beforeEach(async ({ page }) => {
    // Navigate to app first (DEV_AUTH_BYPASS handles auth)
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');

    // Wait for sidebar to confirm app loaded
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 15000 });

    // Navigate to Service Quality page via __setCurrentPage
    await page.evaluate(() => {
      if (window.__setCurrentPage) {
        window.__setCurrentPage('service-quality');
      }
    });

    // Wait for page content to render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('page renders with CSS grid containers', async ({ page }) => {
    // Verify page loaded -- look for Service Quality heading or related content
    const pageContent = page.locator('main, [class*="page"], [class*="content"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });

    // Count CSS grid containers (design-system Grid renders as <div class="grid ...">)
    const gridContainers = page.locator('div.grid');
    const gridCount = await gridContainers.count();

    // The ServiceQualityPage uses Grid with cols={4}, cols={3}, and cols={2} (x2)
    // Expect at least 4 CSS grid containers
    expect(gridCount).toBeGreaterThanOrEqual(4);

    // Verify NO svg elements are acting as layout containers
    // The old bug imported Grid from lucide-react which rendered SVG icons
    // Check that there are no <svg> elements with grid-like class names
    const svgGridContainers = page.locator('svg.grid, svg[class*="grid-cols"]');
    const svgGridCount = await svgGridContainers.count();
    expect(svgGridCount).toBe(0);

    // Verify the grid containers are actual div elements with grid display
    const firstGrid = gridContainers.first();
    const tagName = await firstGrid.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('div');

    // Take full-page screenshot
    await page.screenshot({
      path: 'screenshots/78-01-service-quality-grid.png',
      fullPage: true,
    });
  });

  test('stats row displays multiple card columns', async ({ page }) => {
    // Wait for grid containers to be present
    const gridContainers = page.locator('div.grid');
    await expect(gridContainers.first()).toBeVisible({ timeout: 10000 });

    // The first Grid (cols={4}) is the stats row -- it should have multiple children
    // Find a grid container that has grid-cols-4 or equivalent responsive classes
    const statsGrid = page.locator('div.grid').first();

    // Check that the stats grid has child elements (stat cards)
    const childCount = await statsGrid.evaluate(el => el.children.length);
    expect(childCount).toBeGreaterThanOrEqual(3);

    // Verify children are visible (rendered as cards, not collapsed)
    const firstChild = statsGrid.locator('> *').first();
    await expect(firstChild).toBeVisible();

    // Take a zoomed screenshot of the stats area
    const statsBox = await statsGrid.boundingBox();
    if (statsBox) {
      await page.screenshot({
        path: 'screenshots/78-02-service-quality-stats-row.png',
        clip: {
          x: Math.max(0, statsBox.x - 10),
          y: Math.max(0, statsBox.y - 10),
          width: Math.min(statsBox.width + 20, 1280),
          height: Math.min(statsBox.height + 20, 800),
        },
      });
    }
  });
});
