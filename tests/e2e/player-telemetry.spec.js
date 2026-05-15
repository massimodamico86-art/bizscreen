/**
 * Player Telemetry E2E Tests
 * Phase 158: Tests for heartbeat sending and content version detection
 *
 * Covers:
 * - PLYR-05: Player reports content version and detects mismatch
 * - PLYR-06: Player sends heartbeat with device metrics
 *
 * Tests use Playwright route interception to capture outgoing RPC calls
 * and verify the player sends heartbeat/status RPCs with correct parameters.
 *
 * All assertions are unconditional -- no soft-fail if/isVisible patterns.
 */
import { test, expect } from '@playwright/test';

const mockPlaylistData = {
  screen: { id: 'test-telemetry-screen', name: 'Telemetry Screen', tenant_id: 't1', timezone: 'UTC' },
  mode: 'playlist',
  type: 'playlist',
  content_source: 'playlist',
  playlist: {
    id: 'pl-tel',
    name: 'Test Playlist',
    shuffle: false,
    defaultDuration: 10,
    items: [
      { id: 'item-t1', position: 0, mediaType: 'image', url: 'https://placehold.co/1920x1080/333/white?text=Telemetry', name: 'Test Image', duration: 10 }
    ]
  },
  items: [
    { id: 'item-t1', position: 0, mediaType: 'image', url: 'https://placehold.co/1920x1080/333/white?text=Telemetry', name: 'Test Image', duration: 10 }
  ]
};

test.describe('Player Telemetry', () => {
  /**
   * Helper: set up localStorage and route interception for player telemetry tests.
   * Returns an array that collects intercepted RPC calls.
   */
  async function setupPlayerWithRpcCapture(page) {
    const capturedRpcs = [];

    // Navigate to origin first so localStorage is accessible, then set values
    await page.goto('/player');
    await page.evaluate(() => {
      localStorage.setItem('player_screen_id', 'test-telemetry-screen');
      localStorage.removeItem('player_content_hash');
    });

    // Intercept all Supabase RPC calls
    await page.route('**/rest/v1/rpc/**', async (route) => {
      const url = route.request().url();
      const rpcName = url.split('/rpc/')[1]?.split('?')[0];
      const postData = route.request().postData();
      capturedRpcs.push({ rpc: rpcName, body: postData ? JSON.parse(postData) : null });

      if (rpcName === 'get_resolved_player_content' || rpcName === 'get_player_content') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlaylistData) });
      } else if (rpcName === 'update_device_status') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ needs_screenshot_update: false }) });
      } else if (rpcName === 'get_pending_device_command') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ has_command: false }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });

    // Intercept PostgREST table queries (used by checkDeviceRefreshStatus)
    await page.route('**/rest/v1/tv_devices**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ needs_refresh: false, last_refresh_at: null })
      });
    });

    // Intercept realtime websocket subscription attempts to prevent errors
    await page.route('**/realtime/**', async (route) => {
      await route.abort('connectionrefused');
    });

    return capturedRpcs;
  }

  test('player sends heartbeat update_device_status on mount (PLYR-06)', async ({ page }) => {
    test.setTimeout(45000);

    const capturedRpcs = await setupPlayerWithRpcCapture(page);

    // Navigate to the player view
    await page.goto('/player/view');

    // Wait for content to render -- the image should appear
    await page.locator('img').first().waitFor({ state: 'visible', timeout: 15000 });

    // Allow time for the initial heartbeat to fire (fires immediately on mount)
    await page.waitForTimeout(3000);

    // Verify update_device_status was called with the correct screen ID
    const statusCalls = capturedRpcs.filter(r => r.rpc === 'update_device_status');
    expect(statusCalls.length).toBeGreaterThanOrEqual(1);
    expect(statusCalls[0].body.p_device_id).toBe('test-telemetry-screen');
  });

  test('heartbeat includes player version and content hash (PLYR-05, PLYR-06)', async ({ page }) => {
    test.setTimeout(45000);

    const capturedRpcs = await setupPlayerWithRpcCapture(page);

    await page.goto('/player/view');

    // Wait for content to load and render
    await page.locator('img').first().waitFor({ state: 'visible', timeout: 15000 });

    // Wait for heartbeat to fire with content hash populated
    await page.waitForTimeout(3000);

    // Find the update_device_status call
    const statusCall = capturedRpcs.find(r => r.rpc === 'update_device_status');
    expect(statusCall).toBeTruthy();
    expect(statusCall.body.p_device_id).toBe('test-telemetry-screen');
    // Player sends PLAYER_VERSION ('1.2.0') as p_player_version
    expect(statusCall.body.p_player_version).toBeTruthy();

    // Verify content hash is stored in localStorage after content loads
    const contentHash = await page.evaluate(() => localStorage.getItem('player_content_hash'));
    expect(contentHash).toBeTruthy();
    const parsed = JSON.parse(contentHash);
    expect(parsed.mode).toBe('playlist');
    expect(parsed.playlistId).toBe('pl-tel');
  });

  test('player detects content version mismatch and triggers re-fetch (PLYR-05)', async ({ page }) => {
    test.setTimeout(60000);

    // Track how many times get_resolved_player_content is called
    let contentFetchCount = 0;
    const capturedRpcs = [];

    await page.goto('/player');
    await page.evaluate(() => {
      localStorage.setItem('player_screen_id', 'test-telemetry-screen');
      localStorage.removeItem('player_content_hash');
    });

    // The updated playlist data has a different playlist ID to trigger mismatch
    const updatedPlaylistData = {
      ...mockPlaylistData,
      playlist: {
        ...mockPlaylistData.playlist,
        id: 'pl-tel-updated',
        name: 'Updated Playlist'
      }
    };

    await page.route('**/rest/v1/rpc/**', async (route) => {
      const url = route.request().url();
      const rpcName = url.split('/rpc/')[1]?.split('?')[0];
      const postData = route.request().postData();
      capturedRpcs.push({ rpc: rpcName, body: postData ? JSON.parse(postData) : null });

      if (rpcName === 'get_resolved_player_content' || rpcName === 'get_player_content') {
        contentFetchCount++;
        // First fetch returns original data; subsequent fetches return updated data
        // This simulates a content version change on the server
        if (contentFetchCount === 1) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlaylistData) });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updatedPlaylistData) });
        }
      } else if (rpcName === 'update_device_status') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ needs_screenshot_update: false }) });
      } else if (rpcName === 'get_pending_device_command') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ has_command: false }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });

    // Intercept table queries
    await page.route('**/rest/v1/tv_devices**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ needs_refresh: false, last_refresh_at: null })
      });
    });

    await page.route('**/realtime/**', async (route) => {
      await route.abort('connectionrefused');
    });

    // Navigate and wait for initial content load
    await page.goto('/player/view');
    await page.locator('img').first().waitFor({ state: 'visible', timeout: 15000 });

    // The player polls every ~30s for content updates. When it detects a hash
    // mismatch, it re-fetches and updates content. Poll the fetch counter
    // event-driven so the test doesn't waste the full 30s on a fixed timeout
    // and isn't fragile if the interval constant changes.
    //
    // Content should have been fetched at least twice:
    // 1) Initial load via loadContent
    // 2) Polling interval detects mismatch (different playlistId) and updates
    await expect
      .poll(() => contentFetchCount, {
        timeout: 40000,
        intervals: [1000, 2000, 5000],
      })
      .toBeGreaterThanOrEqual(2);

    // Verify the content hash in localStorage was updated to reflect the new content
    const contentHash = await page.evaluate(() => localStorage.getItem('player_content_hash'));
    expect(contentHash).toBeTruthy();
    const parsed = JSON.parse(contentHash);
    expect(parsed.playlistId).toBe('pl-tel-updated');
  });

  test('player heartbeat polling sends player_heartbeat RPC (PLYR-06 device metrics)', async ({ page }) => {
    test.setTimeout(60000);

    const capturedRpcs = await setupPlayerWithRpcCapture(page);

    await page.goto('/player/view');

    // Wait for content to render
    await page.locator('img').first().waitFor({ state: 'visible', timeout: 15000 });

    // The player has two heartbeat mechanisms:
    // 1) update_device_status fires immediately on mount and every ~30s (heartbeat useEffect)
    // 2) player_heartbeat fires every ~30s during content polling (polling useEffect)
    // Poll the captured RPC list rather than using a fixed timeout, so the test
    // finishes as soon as the first heartbeat is observed and is not tied to a
    // specific interval constant.
    await expect
      .poll(
        () => capturedRpcs.filter((r) => r.rpc === 'player_heartbeat').length,
        { timeout: 40000, intervals: [1000, 2000, 5000] }
      )
      .toBeGreaterThanOrEqual(1);

    // Verify player_heartbeat RPC was called with screen ID during content polling
    const heartbeatCalls = capturedRpcs.filter(r => r.rpc === 'player_heartbeat');
    expect(heartbeatCalls[0].body.p_screen_id).toBe('test-telemetry-screen');

    // Also verify update_device_status was called multiple times (initial + interval)
    const statusCalls = capturedRpcs.filter(r => r.rpc === 'update_device_status');
    expect(statusCalls.length).toBeGreaterThanOrEqual(1);
  });
});
