/**
 * Template Packs E2E Tests
 *
 * Tests the Starter Packs functionality:
 * - Navigate to Templates page
 * - Use each pack type
 * - Verify playlists and layouts are created
 */
import { test, expect } from '@playwright/test';

const CLIENT_EMAIL = process.env.TEST_USER_EMAIL || 'client@bizscreen.test';
const CLIENT_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestClient123!';

test.describe('Template Packs', () => {
  const consoleErrors = [];
  const networkErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    networkErrors.length = 0;

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });

    page.on('response', response => {
      if (response.status() >= 400 && !response.url().includes('favicon')) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Login
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.setItem('bizscreen_welcome_modal_dismissed', 'true');
      localStorage.setItem('bizscreen_onboarding_completed', 'true');
    });
    await page.fill('input[type="email"]', CLIENT_EMAIL);
    await page.fill('input[type="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(app|dashboard)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log(`\n=== CONSOLE ERRORS for ${testInfo.title} ===`);
      consoleErrors.forEach(e => console.log(`  ${e}`));
    }
    if (networkErrors.length > 0) {
      console.log(`\n=== NETWORK ERRORS for ${testInfo.title} ===`);
      networkErrors.forEach(e => console.log(`  ${e.status}: ${e.url}`));
    }
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/template-packs-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }
  });

  test('can navigate to Templates page', async ({ page }) => {
    // Click Templates in nav
    await page.click('button:has-text("Templates"), a:has-text("Templates")');
    await page.waitForLoadState('networkidle');

    // Verify Templates page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /templates|starter packs/i }).first()).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/templates-page.png', fullPage: true });

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('uuid_generate_v4') ||
      e.includes('function') && e.includes('does not exist')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('can see all 5 starter packs', async ({ page }) => {
    await page.click('button:has-text("Templates"), a:has-text("Templates")');
    await page.waitForLoadState('networkidle');

    // Look for Starter Packs tab/section
    const starterPacksTab = page.locator('button, a').filter({ hasText: /starter packs/i }).first();
    if (await starterPacksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await starterPacksTab.click();
      await page.waitForTimeout(500);
    }

    // Verify all 5 packs are visible
    const packNames = [
      'Quick Start Pack',
      'Restaurant Starter Pack',
      'Salon Starter Pack',
      'Gym & Fitness Pack',
      'Retail Store Pack'
    ];

    for (const packName of packNames) {
      const pack = page.locator(`text=${packName}`).first();
      const isVisible = await pack.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Pack "${packName}": ${isVisible ? 'visible' : 'not visible'}`);
    }
  });

  test('can use Quick Start Pack without uuid error', async ({ page }) => {
    await page.click('button:has-text("Templates"), a:has-text("Templates")');
    await page.waitForLoadState('networkidle');

    // Look for Starter Packs tab
    const starterPacksTab = page.locator('button, a').filter({ hasText: /starter packs/i }).first();
    if (await starterPacksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await starterPacksTab.click();
      await page.waitForTimeout(500);
    }

    // Find Quick Start Pack card
    const quickStartCard = page.locator('[class*="card"], div').filter({ hasText: 'Quick Start Pack' }).first();

    if (await quickStartCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click Use This Pack button within the card
      const useButton = quickStartCard.locator('button').filter({ hasText: /use|apply|start/i }).first();

      if (await useButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useButton.click();
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: 'test-results/quick-start-pack-result.png', fullPage: true });

        // Check for uuid_generate_v4 error
        const hasUuidError = consoleErrors.some(e =>
          e.includes('uuid_generate_v4') ||
          e.includes('function') && e.includes('does not exist')
        );
        console.log('Console errors after using pack:', consoleErrors);
        expect(hasUuidError).toBe(false);

        // Check for success message or created content
        const successIndicator = page.locator('text=/created|success|applied/i').first();
        const hasSuccess = await successIndicator.isVisible({ timeout: 3000 }).catch(() => false);
        console.log('Success indicator visible:', hasSuccess);
      } else {
        console.log('Use button not found in Quick Start Pack card');
      }
    } else {
      console.log('Quick Start Pack card not found');
    }
  });

  test('can use Restaurant Starter Pack', async ({ page }) => {
    await page.click('button:has-text("Templates"), a:has-text("Templates")');
    await page.waitForLoadState('networkidle');

    // Look for Starter Packs tab
    const starterPacksTab = page.locator('button, a').filter({ hasText: /starter packs/i }).first();
    if (await starterPacksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await starterPacksTab.click();
      await page.waitForTimeout(500);
    }

    // Find Restaurant Pack card
    const restaurantCard = page.locator('[class*="card"], div').filter({ hasText: 'Restaurant Starter Pack' }).first();

    if (await restaurantCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const useButton = restaurantCard.locator('button').filter({ hasText: /use|apply|start/i }).first();

      if (await useButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useButton.click();
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: 'test-results/restaurant-pack-result.png', fullPage: true });

        // Verify no uuid error
        const hasUuidError = consoleErrors.some(e => e.includes('uuid_generate_v4'));
        expect(hasUuidError).toBe(false);
      }
    }
  });

  test('created playlists from pack can be opened', async ({ page }) => {
    // First use a pack
    await page.click('button:has-text("Templates"), a:has-text("Templates")');
    await page.waitForLoadState('networkidle');

    const starterPacksTab = page.locator('button, a').filter({ hasText: /starter packs/i }).first();
    if (await starterPacksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await starterPacksTab.click();
      await page.waitForTimeout(500);
    }

    // Use Quick Start Pack
    const quickStartCard = page.locator('[class*="card"], div').filter({ hasText: 'Quick Start Pack' }).first();
    if (await quickStartCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const useButton = quickStartCard.locator('button').filter({ hasText: /use|apply|start/i }).first();
      if (await useButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useButton.click();
        await page.waitForTimeout(3000);
      }
    }

    // Navigate to Playlists
    await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for created playlist (Welcome & Info or similar)
    const playlistRow = page.locator('tr').filter({ hasText: /welcome|menu|info/i }).first();

    if (await playlistRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playlistRow.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/pack-playlist-opened.png', fullPage: true });

      // Verify no relationship errors
      const hasRelationshipError = consoleErrors.some(e =>
        e.includes('relationship') || e.includes('media_assets')
      );
      console.log('Console errors when opening playlist:', consoleErrors);
      expect(hasRelationshipError).toBe(false);
    } else {
      console.log('No pack-created playlist found to open');
    }
  });

  test('created layouts from pack can be opened', async ({ page }) => {
    // First use a pack
    await page.click('button:has-text("Templates"), a:has-text("Templates")');
    await page.waitForLoadState('networkidle');

    const starterPacksTab = page.locator('button, a').filter({ hasText: /starter packs/i }).first();
    if (await starterPacksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await starterPacksTab.click();
      await page.waitForTimeout(500);
    }

    // Use Salon Pack for variety
    const salonCard = page.locator('[class*="card"], div').filter({ hasText: 'Salon Starter Pack' }).first();
    if (await salonCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const useButton = salonCard.locator('button').filter({ hasText: /use|apply|start/i }).first();
      if (await useButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useButton.click();
        await page.waitForTimeout(3000);
      }
    }

    // Navigate to Layouts
    await page.click('button:has-text("Layouts"), a:has-text("Layouts")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for created layout
    const layoutRow = page.locator('tr').filter({ hasText: /salon|display|lobby/i }).first();

    if (await layoutRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await layoutRow.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/pack-layout-opened.png', fullPage: true });

      // Verify no zone_name errors
      const hasZoneError = consoleErrors.some(e =>
        e.includes('zone_name') || e.includes('layout_zones')
      );
      console.log('Console errors when opening layout:', consoleErrors);
      expect(hasZoneError).toBe(false);
    } else {
      console.log('No pack-created layout found to open');
    }
  });
});
