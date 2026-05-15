/**
 * Player Rendering E2E Tests (PLYR-01, PLYR-02)
 *
 * Tests player rendering behavior covering PairPage UI, ViewPage states,
 * playlist content display (PLYR-01), and multi-zone layout rendering (PLYR-02).
 *
 * Player routes are public (no auth required):
 * - /player -> PairPage (OTP pairing form)
 * - /player/view -> ViewPage (content playback)
 */
import { test, expect } from '@playwright/test';

/**
 * Helper: Set up route interception for all common player RPC endpoints.
 * Intercepts content RPC with provided mock data and suppresses heartbeat/status RPCs.
 */
async function interceptPlayerRPCs(page, mockContentData) {
  // Intercept content fetching RPCs
  await page.route('**/rest/v1/rpc/get_resolved_player_content', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockContentData),
    });
  });
  await page.route('**/rest/v1/rpc/get_player_content', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockContentData),
    });
  });

  // Suppress heartbeat, status, command, and refresh RPCs
  await page.route('**/rest/v1/rpc/player_heartbeat', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/rest/v1/rpc/update_device_status', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/rest/v1/rpc/check_player_updates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasChanges: false }) });
  });
  await page.route('**/rest/v1/rpc/get_pending_device_command', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ has_command: false }) });
  });
  await page.route('**/rest/v1/rpc/check_device_refresh_status', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ needs_refresh: false }) });
  });
}

/**
 * Helper: Set localStorage player_screen_id before navigating to /player/view.
 */
async function setScreenIdInStorage(page, screenId = 'test-screen-id') {
  await page.evaluate((id) => {
    localStorage.setItem('player_screen_id', id);
  }, screenId);
}

test.describe('Player Rendering', () => {

  test('PairPage loads correctly with OTP input and connect button', async ({ page }) => {
    await page.goto('/player');

    // Heading: "Connect Your Screen"
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText('Connect Your Screen');

    // OTP input field exists (single text input with placeholder)
    const otpInput = page.locator('input[type="text"]');
    await expect(otpInput).toBeVisible();
    await expect(otpInput).toHaveAttribute('placeholder', 'ABC123');
    await expect(otpInput).toHaveAttribute('maxlength', '6');

    // Connect button exists
    const connectButton = page.locator('button[type="submit"]');
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toContainText('Connect Screen');
  });

  test('ViewPage shows loading state while fetching content', async ({ page }) => {
    // Intercept the content RPC with a delayed response (5 seconds)
    await page.route('**/rest/v1/rpc/get_resolved_player_content', async (route) => {
      // Delay response to keep the loading state visible
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ type: null, playlist: null, layout: null, items: [] }),
      });
    });
    await page.route('**/rest/v1/rpc/get_player_content', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ type: null, playlist: null, layout: null, items: [] }),
      });
    });

    // Suppress heartbeat/status RPCs
    await page.route('**/rest/v1/rpc/player_heartbeat', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/rest/v1/rpc/update_device_status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/rest/v1/rpc/check_player_updates', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasChanges: false }) });
    });
    await page.route('**/rest/v1/rpc/get_pending_device_command', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ has_command: false }) });
    });
    await page.route('**/rest/v1/rpc/check_device_refresh_status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ needs_refresh: false }) });
    });

    // Set screen ID in localStorage before navigating
    await page.goto('/player/view');
    await setScreenIdInStorage(page, 'test-screen-id');
    await page.goto('/player/view');

    // Verify loading state appears
    await expect(page.getByText('Loading content...')).toBeVisible({ timeout: 5000 });
  });

  test('ViewPage shows no-content state when no playlist or layout assigned', async ({ page }) => {
    const mockNoContent = {
      screen: { id: 'test-screen', name: 'Test Screen', tenant_id: 'test-tenant', timezone: 'UTC' },
      mode: null,
      type: null,
      content_source: null,
      playlist: null,
      layout: null,
      scene: null,
      items: [],
    };

    await interceptPlayerRPCs(page, mockNoContent);

    // Set screen ID in localStorage before navigating
    await page.goto('/player/view');
    await setScreenIdInStorage(page, 'test-screen-id');
    await page.goto('/player/view');

    // Verify "No content assigned yet" text is visible
    await expect(page.getByText('No content assigned yet')).toBeVisible({ timeout: 10000 });

    // Verify screen name or "Connected" text is visible
    await expect(page.getByText('Test Screen Connected')).toBeVisible();
  });

  test('ViewPage renders playlist content with images and progress dots (PLYR-01)', async ({ page }) => {
    const mockPlaylistData = {
      screen: { id: 'test-screen', name: 'Test Screen', tenant_id: 't1', timezone: 'UTC' },
      mode: 'playlist',
      type: 'playlist',
      content_source: 'playlist',
      playlist: {
        id: 'pl-1',
        name: 'Test Playlist',
        shuffle: false,
        defaultDuration: 10,
        items: [
          { id: 'item-1', position: 0, mediaType: 'image', url: 'https://placehold.co/1920x1080/333/white?text=Slide+1', name: 'Slide 1', duration: 10 },
          { id: 'item-2', position: 1, mediaType: 'image', url: 'https://placehold.co/1920x1080/444/white?text=Slide+2', name: 'Slide 2', duration: 10 },
        ],
      },
      items: [
        { id: 'item-1', position: 0, mediaType: 'image', url: 'https://placehold.co/1920x1080/333/white?text=Slide+1', name: 'Slide 1', duration: 10 },
        { id: 'item-2', position: 1, mediaType: 'image', url: 'https://placehold.co/1920x1080/444/white?text=Slide+2', name: 'Slide 2', duration: 10 },
      ],
    };

    await interceptPlayerRPCs(page, mockPlaylistData);

    // Set screen ID in localStorage before navigating
    await page.goto('/player/view');
    await setScreenIdInStorage(page, 'test-screen-id');
    await page.goto('/player/view');

    // Verify an <img> element is visible with placehold.co source
    const image = page.locator('img[src*="placehold.co"]');
    await expect(image.first()).toBeVisible({ timeout: 10000 });

    // Verify progress dots appear (items.length > 1 creates dot indicators)
    // The dots are small divs at the bottom, with different widths for active vs inactive
    // There should be exactly 2 dots for 2 items
    const progressContainer = page.locator('div').filter({
      has: page.locator('div[style*="border-radius: 0.25rem"]'),
    }).filter({
      has: page.locator('div[style*="background-color"]'),
    });
    // At least verify the progress indicator area exists by checking for the styled dots
    // The active dot has width 1.5rem, inactive has 0.5rem
    const dots = page.locator('div[style*="borderRadius: 0.25rem"], div[style*="border-radius: 0.25rem"]');
    await expect(dots.first()).toBeVisible({ timeout: 5000 });
  });

  test('ViewPage renders multi-zone layout with absolute positioning (PLYR-02)', async ({ page }) => {
    const mockLayoutData = {
      screen: { id: 'test-screen', name: 'Test Screen', tenant_id: 't1', timezone: 'UTC' },
      mode: 'layout',
      type: 'layout',
      content_source: 'layout',
      layout: {
        id: 'layout-1',
        name: 'Two Zone Layout',
        zones: [
          {
            id: 'zone-1',
            name: 'Main',
            x_percent: 0,
            y_percent: 0,
            width_percent: 70,
            height_percent: 100,
            z_index: 0,
            content: {
              type: 'media',
              item: {
                id: 'm1',
                mediaType: 'image',
                url: 'https://placehold.co/800x600/555/white?text=Zone1',
                name: 'Zone 1 Image',
                duration: 10,
              },
            },
          },
          {
            id: 'zone-2',
            name: 'Sidebar',
            x_percent: 70,
            y_percent: 0,
            width_percent: 30,
            height_percent: 100,
            z_index: 0,
            content: {
              type: 'media',
              item: {
                id: 'm2',
                mediaType: 'image',
                url: 'https://placehold.co/400x600/666/white?text=Zone2',
                name: 'Zone 2 Image',
                duration: 10,
              },
            },
          },
        ],
      },
    };

    await interceptPlayerRPCs(page, mockLayoutData);

    // Set screen ID in localStorage before navigating
    await page.goto('/player/view');
    await setScreenIdInStorage(page, 'test-screen-id');
    await page.goto('/player/view');

    // Verify at least 2 <img> elements are rendered (one per zone)
    const images = page.locator('img[src*="placehold.co"]');
    await expect(images.first()).toBeVisible({ timeout: 10000 });
    await expect(images).toHaveCount(2);

    // Verify zone containers exist with position: absolute styling
    // LayoutRenderer renders zone divs with position: absolute and percentage-based left/top/width/height
    const zoneContainers = page.locator('div[style*="position: absolute"]');
    const zoneCount = await zoneContainers.count();
    expect(zoneCount).toBeGreaterThanOrEqual(2);

    // Verify percentage-based positioning is applied
    // Zone 1: left: 0%, width: 70%
    // Zone 2: left: 70%, width: 30%
    const zone1 = page.locator('div[style*="left: 0%"][style*="width: 70%"]');
    await expect(zone1).toBeVisible();

    const zone2 = page.locator('div[style*="left: 70%"][style*="width: 30%"]');
    await expect(zone2).toBeVisible();
  });

});
