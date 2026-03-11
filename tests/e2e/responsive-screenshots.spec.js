/**
 * Responsive Viewport Screenshot Tests
 *
 * Captures screenshot evidence for responsive layout behavior across viewports:
 * - RESP-01: Dashboard renders at 375px mobile viewport
 * - RESP-02: Dashboard renders at 768px tablet viewport
 * - RESP-03: Sidebar collapses to hamburger on mobile
 * - RESP-04: Media grid columns adjust per viewport
 * - RESP-05: Template gallery responsive layout
 * - RESP-06: Pricing page tablet grid (public page)
 * - RESP-07: Schedule editor on tablet
 * - RESP-08: Admin nav hidden for non-admin (client role)
 *
 * This spec matches /.*responsive.*\.spec\.js/ so Playwright mobile/tablet/desktop
 * projects auto-select it. It runs on ALL three viewport projects.
 *
 * Screenshots saved to screenshots/122/ using screenshotStep helper with
 * auto-detected viewport labels.
 */

import { test, expect } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
} from './helpers/index.js';

// Skip all tests if credentials not configured
const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

test.describe('Responsive Screenshots', () => {
  // NO project skip -- this runs on mobile, tablet, desktop projects

  test.skip(!hasCredentials, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');

  test('RESP-01 + RESP-02: dashboard at current viewport', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Navigate to dashboard
    await page.evaluate(() => window.__setCurrentPage('dashboard'));
    await page.waitForTimeout(1500);

    // Wait for dashboard content to load (stat cards or welcome state)
    await Promise.race([
      page.locator('[class*="StatCard"], [class*="stat-card"], .grid').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('text=/dashboard/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {});

    // Screenshot regardless of content state
    await screenshotStep(page, '122', '01-dashboard');
  });

  test('RESP-03: sidebar collapse to hamburger on mobile', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Navigate to dashboard as baseline
    await page.evaluate(() => window.__setCurrentPage('dashboard'));
    await page.waitForTimeout(1000);

    const viewportSize = page.viewportSize();
    const isMobile = viewportSize && viewportSize.width <= 375;

    if (isMobile) {
      // Hamburger button should be visible
      const hamburger = page.locator('button[aria-label="Open navigation"]');
      const hamburgerVisible = await hamburger.isVisible().catch(() => false);

      // Take screenshot showing mobile nav state
      await screenshotStep(page, '122', '02-hamburger-menu');

      // If hamburger exists, click it to show mobile nav
      if (hamburgerVisible) {
        await hamburger.click();
        await page.waitForTimeout(500);
        await screenshotStep(page, '122', '02-hamburger-menu-open');
      }
    } else {
      // On tablet/desktop: sidebar should be visible
      await screenshotStep(page, '122', '02-hamburger-menu');
    }
  });

  test('RESP-04: media grid columns adjust per viewport', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Navigate to media-all
    await page.evaluate(() => window.__setCurrentPage('media-all'));
    await page.waitForTimeout(1500);

    // Wait for media grid or empty state
    await Promise.race([
      page.locator('.grid, [class*="grid"]').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('text=/no media/i, text=/upload/i, text=/empty/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {});

    await screenshotStep(page, '122', '03-media-grid');
  });

  test('RESP-05: template gallery responsive layout', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Navigate to templates
    await page.evaluate(() => window.__setCurrentPage('templates'));
    await page.waitForTimeout(1500);

    // Wait for template cards, empty state, or filter sidebar
    await Promise.race([
      page.locator('[class*="card"], [class*="Card"]').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('text=/no templates/i, text=/get started/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('text=/filter/i, text=/category/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {});

    await screenshotStep(page, '122', '04-template-gallery');
  });

  test('RESP-06: pricing page tablet grid', async ({ page }) => {
    // Navigate to /pricing (public page, no login needed)
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Wait for pricing cards or heading
    await Promise.race([
      page.locator('text=/pricing/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('[class*="card"], [class*="Card"], [class*="plan"]').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {});

    await screenshotStep(page, '122', '05-pricing', { fullPage: true });
  });

  test('RESP-07: schedule editor on tablet', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Navigate to schedules
    await page.evaluate(() => window.__setCurrentPage('schedules'));
    await page.waitForTimeout(1500);

    // Wait for schedule content or empty state
    await Promise.race([
      page.locator('text=/schedule/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('[class*="calendar"], [class*="Calendar"]').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('text=/no schedules/i, text=/create/i').first()
        .waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {});

    await screenshotStep(page, '122', '06-schedule-editor');
  });

  test('RESP-08: admin nav hidden for non-admin', async ({ page }) => {
    await loginAndPrepare(page);
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Navigate to dashboard
    await page.evaluate(() => window.__setCurrentPage('dashboard'));
    await page.waitForTimeout(1000);

    const viewportSize = page.viewportSize();
    const isMobile = viewportSize && viewportSize.width <= 375;

    if (isMobile) {
      // On mobile, open hamburger menu first to check nav items
      const hamburger = page.locator('button[aria-label="Open navigation"]');
      const hamburgerVisible = await hamburger.isVisible().catch(() => false);
      if (hamburgerVisible) {
        await hamburger.click();
        await page.waitForTimeout(500);
      }
    }

    // Check that admin nav items are NOT visible
    // Admin items include: Tenants, Audit Logs, System Events, Feature Flags
    const adminItems = [
      page.locator('nav >> text=Tenants'),
      page.locator('aside >> text=Tenants'),
      page.locator('nav >> text=Audit Logs'),
      page.locator('aside >> text=Audit Logs'),
      page.locator('nav >> text=System Events'),
      page.locator('aside >> text=System Events'),
      page.locator('nav >> text=Feature Flags'),
      page.locator('aside >> text=Feature Flags'),
    ];

    for (const item of adminItems) {
      const visible = await item.isVisible().catch(() => false);
      expect(visible, `Admin nav item should not be visible for client role`).toBe(false);
    }

    await screenshotStep(page, '122', '07-admin-hidden-nav');
  });
});
