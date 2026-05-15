/**
 * Player Offline Fallback & Self-Heal E2E Tests
 * Phase 158, Plan 02
 *
 * Tests:
 * - PLYR-03: Player falls back to cached content when server returns errors
 * - PLYR-04: Player self-heals from error/frozen state
 *
 * These tests use Playwright route interception to simulate server failures
 * and verify offline fallback behavior, offline indicators, stuck detection
 * initialization, and error recovery via re-pairing.
 */
import { test, expect } from '@playwright/test';

// Mock playlist content that simulates the RPC response
const MOCK_PLAYLIST_CONTENT = {
  mode: 'playlist',
  type: 'playlist',
  content_source: 'playlist',
  items: [
    {
      id: 'item-1',
      position: 0,
      mediaType: 'image',
      url: 'https://placehold.co/800x600/333/white?text=Slide+1',
      duration: 10,
      name: 'Test Slide 1',
    },
    {
      id: 'item-2',
      position: 1,
      mediaType: 'image',
      url: 'https://placehold.co/800x600/555/white?text=Slide+2',
      duration: 10,
      name: 'Test Slide 2',
    },
  ],
  playlist: {
    id: 'test-playlist-1',
    name: 'Test Playlist',
    shuffle: false,
    defaultDuration: 10,
    items: [
      { id: 'item-1', position: 0, mediaType: 'image', url: 'https://placehold.co/800x600/333/white?text=Slide+1', duration: 10, name: 'Test Slide 1' },
      { id: 'item-2', position: 1, mediaType: 'image', url: 'https://placehold.co/800x600/555/white?text=Slide+2', duration: 10, name: 'Test Slide 2' },
    ],
  },
  screen: {
    id: 'test-offline-screen',
    name: 'Test Screen',
    tenant_id: 'test-tenant',
    timezone: 'UTC',
  },
};

/**
 * Set up common RPC route interceptions for the player.
 * @param {import('@playwright/test').Page} page
 * @param {'success'|'error'} contentResponse - 'success' returns mock content, 'error' returns 500
 */
async function setupPlayerRoutes(page, contentResponse) {
  // Intercept content RPC calls
  for (const rpc of ['get_resolved_player_content', 'get_player_content']) {
    await page.route(`**/rest/v1/rpc/${rpc}`, async (route) => {
      if (contentResponse === 'error') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error', code: 'INTERNAL_ERROR' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PLAYLIST_CONTENT),
        });
      }
    });
  }

  // Suppress other RPCs so they don't hit a real server
  for (const rpc of [
    'player_heartbeat',
    'update_device_status',
    'check_player_updates',
    'get_pending_device_command',
    'check_device_refresh_status',
  ]) {
    await page.route(`**/rest/v1/rpc/${rpc}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  }
}

test.describe('Player Offline Fallback & Self-Heal', () => {
  test.beforeEach(async ({ page }) => {
    // Set the player screen ID in localStorage before navigating
    await page.goto('/player');
    await page.evaluate(() => {
      localStorage.setItem('player_screen_id', 'test-offline-screen');
    });
  });

  test('player loads content and caches it to IndexedDB', async ({ page }) => {
    await setupPlayerRoutes(page, 'success');

    await page.goto('/player/view');

    // Wait for content to render -- an image element should appear
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

    // Verify that content was cached in IndexedDB
    const hasCached = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('bizscreen-player-cache', 1);
        req.onsuccess = () => {
          const db = req.result;
          try {
            const tx = db.transaction('content-cache', 'readonly');
            const store = tx.objectStore('content-cache');
            const getReq = store.get('content-test-offline-screen');
            getReq.onsuccess = () => resolve(!!getReq.result);
            getReq.onerror = () => resolve(false);
          } catch {
            resolve(false);
          }
        };
        req.onerror = () => resolve(false);
      });
    });
    expect(hasCached).toBe(true);
  });

  test('player falls back to cached content when offline (PLYR-03)', async ({ page }) => {
    // Step 1: Load content successfully so it gets cached
    await setupPlayerRoutes(page, 'success');
    await page.goto('/player/view');
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

    // Step 2: Switch routes to return errors (simulate server down)
    await page.unrouteAll();
    await setupPlayerRoutes(page, 'error');

    // Step 3: Reload the page to trigger a fresh content fetch (which will fail)
    await page.reload();

    // The player should fall back to IndexedDB-cached content
    // Wait for the image to appear again (from cache)
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

    // Verify offline indicator is shown
    // The player shows "Offline" text in a status badge or "Offline Mode - Playing Cached Content" watermark
    const offlineIndicator = page.locator('text=/Offline/i').first();
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
  });

  test('player displays error state when server fails without cache', async ({ page }) => {
    // Clear any IndexedDB cache to ensure no fallback
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('bizscreen-player-cache');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => resolve();
      });
    });

    // Intercept content RPC to fail
    await setupPlayerRoutes(page, 'error');

    await page.goto('/player/view');

    // When server fails and no cache exists, the player should show an error state
    // with "Server error" message visible (connection status badge or error display)
    const errorIndicator = page.locator('text=/Server error|Error|Offline/i').first();
    await expect(errorIndicator).toBeVisible({ timeout: 15000 });
  });

  test('stuck detection mechanism is registered on load (PLYR-04)', async ({ page }) => {
    // Inject script to track setInterval calls before page loads
    await page.addInitScript(() => {
      const originalSetInterval = window.setInterval;
      window.__stuckDetectionRegistered = false;
      window.setInterval = function (fn, delay, ...args) {
        // STUCK_DETECTION.checkIntervalMs = 10000
        if (delay === 10000) {
          window.__stuckDetectionRegistered = true;
        }
        return originalSetInterval.call(window, fn, delay, ...args);
      };
    });

    await setupPlayerRoutes(page, 'success');
    await page.goto('/player/view');

    // Wait for content to load, which means the component has mounted
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

    // Verify that the stuck detection interval was registered
    const stuckDetectionActive = await page.evaluate(() => window.__stuckDetectionRegistered);
    expect(stuckDetectionActive).toBe(true);
  });

  test('player shows error state and re-pair button when no cache (PLYR-04)', async ({ page }) => {
    // Clear any existing IndexedDB cache first
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('bizscreen-player-cache');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => resolve();
      });
    });

    // Set up routes to return errors (no content available)
    await setupPlayerRoutes(page, 'error');

    await page.goto('/player/view');

    // The player should show the error state with "Error" heading
    await expect(page.locator('h2:has-text("Error")')).toBeVisible({ timeout: 15000 });

    // Should show the "Re-pair Device" button
    const repairButton = page.locator('button:has-text("Re-pair Device")');
    await expect(repairButton).toBeVisible();

    // Click "Re-pair Device" to trigger self-heal recovery
    await repairButton.click();

    // Should navigate back to the pair page (/player)
    await page.waitForURL(/\/player$/, { timeout: 10000 });
  });
});
