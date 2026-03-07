/**
 * Screen Management Screenshot Tests
 *
 * Captures screenshot evidence for screen management features covering SCRN-06 through SCRN-11:
 * - SCRN-06: Screen group management with tag chips
 * - SCRN-07: Playlist/layout assignment to screen
 * - SCRN-08: Screen orientation toggle
 * - SCRN-09: Master PIN modal for screen locking
 * - SCRN-10: Emergency push modal for screen groups
 * - SCRN-11: Working hours schedule per screen
 *
 * Screenshots saved to screenshots/119/ using screenshotStep helper.
 * Step numbers use 06-11 range for this plan.
 *
 * Uses page.route() to mock Supabase REST API for all screen management data.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
  assertAppReady,
} from './helpers/index.js';

// ---------------------------------------------------------------------------
// Mock data constants
// ---------------------------------------------------------------------------

const MOCK_SCREEN_GROUPS = [
  {
    id: 'sg-001',
    name: 'Lobby Displays',
    description: 'All lobby and entrance screens',
    location_id: 'loc-001',
    location_name: 'Downtown Office',
    device_count: 4,
    online_count: 3,
    active_scene_id: 'scene-001',
    active_scene_name: 'Welcome Slideshow',
    tags: ['lobby', 'retail'],
  },
  {
    id: 'sg-002',
    name: 'Meeting Room Screens',
    description: 'Conference and meeting room displays',
    location_id: 'loc-002',
    location_name: 'Uptown Campus',
    device_count: 6,
    online_count: 5,
    active_scene_id: null,
    active_scene_name: null,
    tags: ['meeting-room', 'outdoor'],
  },
  {
    id: 'sg-003',
    name: 'Retail Storefronts',
    description: 'Customer-facing retail displays',
    location_id: 'loc-001',
    location_name: 'Downtown Office',
    device_count: 8,
    online_count: 7,
    active_scene_id: 'scene-002',
    active_scene_name: 'Product Showcase',
    tags: ['retail', 'outdoor'],
  },
];

const MOCK_SCREENS = [
  {
    id: 'scr-001',
    device_name: 'Lobby TV Left',
    status: 'online',
    player_type: 'raspberry_pi',
    orientation: 'landscape',
    assigned_playlist_id: 'pl-001',
    assigned_playlist: { name: 'Welcome Loop' },
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: 'loc-001',
    location_name: 'Downtown Office',
    otp_code: 'A1B2C3',
    working_hours: {
      '0': { enabled: false, start: '09:00', end: '18:00' },
      '1': { enabled: true, start: '08:00', end: '20:00' },
      '2': { enabled: true, start: '08:00', end: '20:00' },
      '3': { enabled: true, start: '08:00', end: '20:00' },
      '4': { enabled: true, start: '08:00', end: '20:00' },
      '5': { enabled: true, start: '08:00', end: '20:00' },
      '6': { enabled: false, start: '10:00', end: '16:00' },
    },
    screen_group_id: 'sg-001',
    display_language: 'en',
  },
  {
    id: 'scr-002',
    device_name: 'Lobby TV Right',
    status: 'online',
    player_type: 'android',
    orientation: 'portrait',
    assigned_playlist_id: null,
    assigned_playlist: null,
    assigned_layout_id: 'lay-001',
    assigned_layout: { name: 'Info Board Layout' },
    location_id: 'loc-001',
    location_name: 'Downtown Office',
    otp_code: 'D4E5F6',
    working_hours: null,
    screen_group_id: 'sg-001',
    display_language: 'en',
  },
  {
    id: 'scr-003',
    device_name: 'Conference Room A',
    status: 'offline',
    player_type: 'web',
    orientation: 'landscape',
    assigned_playlist_id: 'pl-002',
    assigned_playlist: { name: 'Meeting Agenda' },
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: 'loc-002',
    location_name: 'Uptown Campus',
    otp_code: 'G7H8I9',
    working_hours: null,
    screen_group_id: null,
    display_language: 'en',
  },
  {
    id: 'scr-004',
    device_name: 'Storefront Display',
    status: 'online',
    player_type: 'raspberry_pi',
    orientation: 'portrait',
    assigned_playlist_id: 'pl-003',
    assigned_playlist: { name: 'Product Carousel' },
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: 'loc-001',
    location_name: 'Downtown Office',
    otp_code: 'J0K1L2',
    working_hours: null,
    screen_group_id: 'sg-003',
    display_language: 'en',
  },
];

const MOCK_PLAYLISTS = [
  { id: 'pl-001', name: 'Welcome Loop', item_count: 5 },
  { id: 'pl-002', name: 'Meeting Agenda', item_count: 3 },
  { id: 'pl-003', name: 'Product Carousel', item_count: 8 },
];

const MOCK_LAYOUTS = [
  { id: 'lay-001', name: 'Info Board Layout', orientation: 'landscape' },
  { id: 'lay-002', name: 'Portrait Menu Board', orientation: 'portrait' },
];

const MOCK_LOCATIONS = [
  { id: 'loc-001', name: 'Downtown Office' },
  { id: 'loc-002', name: 'Uptown Campus' },
];

const MOCK_TAGS = ['lobby', 'retail', 'outdoor', 'meeting-room'];

// ---------------------------------------------------------------------------
// API mocking setup
// ---------------------------------------------------------------------------

async function setupScreenManagementMocking(page) {
  // Mock screen groups list
  await page.route('**/rest/v1/screen_groups?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-2/3' },
        body: JSON.stringify(MOCK_SCREEN_GROUPS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock screens list (tv_devices is the actual Supabase table name)
  await page.route('**/rest/v1/tv_devices?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-3/4' },
        body: JSON.stringify(MOCK_SCREENS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock playlists
  await page.route('**/rest/v1/playlists?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PLAYLISTS),
    });
  });

  // Mock layouts
  await page.route('**/rest/v1/layouts?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LAYOUTS),
    });
  });

  // Mock locations
  await page.route('**/rest/v1/locations?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LOCATIONS),
    });
  });

  // Mock plan limits (get_effective_limits is the correct RPC endpoint)
  await page.route('**/rest/v1/rpc/get_effective_limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan_slug: 'business',
        plan_name: 'Business',
        status: 'active',
        max_screens: 25,
        max_media_assets: 500,
        max_playlists: 50,
        max_layouts: 20,
        max_schedules: 10,
      }),
    });
  });

  // Mock master PIN status
  await page.route('**/rest/v1/rpc/get_master_pin_status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isSet: true, setAt: '2025-12-01T00:00:00Z' }),
    });
  });

  // Mock screen groups view (used by ScreensPage sidebar)
  await page.route('**/rest/v1/v_screen_groups_with_counts?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCREEN_GROUPS),
    });
  });

  // Mock screen groups with scenes RPC (used by ScreenGroupsPage)
  await page.route('**/rest/v1/rpc/get_screen_groups_with_scenes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCREEN_GROUPS.map(g => ({
        ...g,
        active_scene: g.active_scene_id ? { id: g.active_scene_id, name: g.active_scene_name } : null,
      }))),
    });
  });

  // Mock all group tags
  await page.route('**/rest/v1/rpc/get_all_group_tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TAGS),
    });
  });

  // Mock screens in group
  await page.route('**/rest/v1/rpc/get_screens_in_group', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCREENS.slice(0, 2)),
    });
  });

  // Mock unassigned screens
  await page.route('**/rest/v1/rpc/get_unassigned_screens', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCREENS.slice(2)),
    });
  });

  // Mock schedules
  await page.route('**/rest/v1/schedules?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 's1', name: 'Business Hours' }]),
    });
  });

  // Mock permissions check
  await page.route('**/rest/v1/rpc/check_permission*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(true),
    });
  });

  // Mock master PIN set/save
  await page.route('**/rest/v1/rpc/set_master_kiosk_pin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock push playlist to group
  await page.route('**/rest/v1/rpc/push_playlist_to_group', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ devicesUpdated: 4 }),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Screen Management Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Skip non-chromium browsers
    if (testInfo.project.name !== 'chromium') {
      test.skip(true, 'Screenshot tests run on chromium only');
    }

    // Mock feature flags BEFORE login so FeatureFlagProvider picks them up on mount
    await page.route('**/rest/v1/rpc/get_active_feature_flags_for_tenant', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { flag_key: 'screen_groups', flag_name: 'Screen Groups', enabled: true, source: 'override' },
          { flag_key: 'advanced_scheduling', flag_name: 'Advanced Scheduling', enabled: true, source: 'override' },
        ]),
      });
    });

    // Mock profiles BEFORE login so permission checks resolve correctly
    await page.route('**/rest/v1/profiles?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000', role: 'admin' }),
      });
    });

    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await dismissAnyModals(page);
    // Set up remaining API mocking after login/init to avoid intercepting auth calls
    await setupScreenManagementMocking(page);
  });

  test('SCRN-06: screen group management with tag chips', async ({ page }) => {
    // Navigate to screen groups page
    await page.evaluate(() => window.__setCurrentPage('screen-groups'));
    await waitForPageReady(page);

    // Wait for group table or empty state
    const table = page.locator('table[role="table"]');
    const emptyState = page.locator('text=/No Screen Groups/i');

    await Promise.race([
      table.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ]);

    await screenshotStep(page, '119', '06-screen-groups-with-tags');
  });

  test('SCRN-07: playlist/layout assignment to screen', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for screen table to appear
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    // Open action menu for second screen (has layout assigned, not playlist — visually distinct)
    const actionBtn = page.locator('table tbody tr').nth(1).locator('button').last();
    const actionVisible = await actionBtn.isVisible().catch(() => false);

    if (actionVisible) {
      await actionBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Look for "Edit screen" menu item and click it
      const editBtn = page.locator('button:has-text("Edit screen")').first();
      const editVisible = await editBtn.isVisible().catch(() => false);

      if (editVisible) {
        await editBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        // Wait for the edit modal dialog to appear
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
      }
    }

    await screenshotStep(page, '119', '07-screens-playlist-layout-assignment');
  });

  test('SCRN-08: screen orientation toggle', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for screen table
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    // Open action menu for first screen
    const actionBtn = page.locator('table tbody tr').first().locator('button').last();
    const actionVisible = await actionBtn.isVisible().catch(() => false);

    if (actionVisible) {
      await actionBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Click Edit screen
      const editBtn = page.locator('button:has-text("Edit screen")').first();
      const editVisible = await editBtn.isVisible().catch(() => false);

      if (editVisible) {
        await editBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        // Wait for edit modal
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

        // Scroll to show orientation section and click dropdown to show options
        const orientationLabel = page.locator('text=/Screen Orientation/i').first();
        const orientationVisible = await orientationLabel.isVisible().catch(() => false);
        if (orientationVisible) {
          await orientationLabel.scrollIntoViewIfNeeded().catch(() => null);
          await page.waitForTimeout(200);

          // Change orientation to portrait to make it visually distinct from SCRN-07
          const orientationSelect = page.locator('select').filter({ has: page.locator('option[value="portrait"]') }).first();
          const selectVisible = await orientationSelect.isVisible().catch(() => false);
          if (selectVisible) {
            await orientationSelect.selectOption('portrait');
            await page.waitForTimeout(300);
          }
        }
      }
    }

    await screenshotStep(page, '119', '08-screens-orientation-toggle');
  });

  test('SCRN-09: master PIN modal for screen locking', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for page content to load (table or empty state)
    await page.waitForTimeout(1000);

    // Find the "Master PIN" button in the page header
    const masterPinBtn = page.locator('button:has-text("Master PIN")').first();
    const btnVisible = await masterPinBtn.isVisible().catch(() => false);

    if (btnVisible) {
      await masterPinBtn.dispatchEvent('click');
      await page.waitForTimeout(500);

      // Wait for the master PIN modal (fixed inset-0 overlay)
      const modal = page.locator('.fixed.inset-0').first();
      await modal.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    }

    await screenshotStep(page, '119', '09-screens-master-pin-modal');

    // Fill in 4 digits to show filled state
    const pinInput = page.locator('input[type="password"]').first();
    const pinVisible = await pinInput.isVisible().catch(() => false);
    if (pinVisible) {
      await pinInput.fill('1234');

      const confirmInput = page.locator('input[type="password"]').nth(1);
      const confirmVisible = await confirmInput.isVisible().catch(() => false);
      if (confirmVisible) {
        await confirmInput.fill('1234');
      }

      await page.waitForTimeout(300);
      await screenshotStep(page, '119', '09b-screens-master-pin-filled');
    }
  });

  test('SCRN-10: emergency push modal for screen groups', async ({ page }) => {
    // Navigate to screen groups page
    await page.evaluate(() => window.__setCurrentPage('screen-groups'));
    await waitForPageReady(page);

    // Wait for group table
    const table = page.locator('table[role="table"]');
    await table.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    // Click "lobby" tag filter chip to show filtered view (visually distinct from SCRN-06)
    const lobbyChip = page.locator('button:has-text("lobby")').first();
    const chipVisible = await lobbyChip.isVisible().catch(() => false);
    if (chipVisible) {
      await lobbyChip.click();
      await page.waitForTimeout(500);
    }

    // Try to open action menu for emergency push (requires admin permissions)
    const actionBtn = page.locator('table tbody tr').first().locator('button[aria-haspopup="menu"]').first();
    const actionVisible = await actionBtn.isVisible().catch(() => false);

    if (actionVisible) {
      await actionBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Look for "Push Playlist" menu item
      const pushBtn = page.locator('button[role="menuitem"]:has-text("Push Playlist")').first();
      const pushVisible = await pushBtn.isVisible().catch(() => false);

      if (pushVisible) {
        await pushBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        // Wait for PushPlaylistModal dialog to appear
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
      }
    }

    await screenshotStep(page, '119', '10-screen-groups-emergency-push');
  });

  test('SCRN-11: working hours schedule per screen', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for screen table
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    // Open action menu for first screen (which has working hours data)
    const actionBtn = page.locator('table tbody tr').first().locator('button').last();
    const actionVisible = await actionBtn.isVisible().catch(() => false);

    if (actionVisible) {
      await actionBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Click Edit screen to open EditScreenModal
      const editBtn = page.locator('button:has-text("Edit screen")').first();
      const editVisible = await editBtn.isVisible().catch(() => false);

      if (editVisible) {
        await editBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        // Wait for edit modal dialog
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

        // Toggle the Enable Working Hours switch off to make it visually distinct
        const whToggle = page.locator('button[role="switch"]').first();
        const toggleVisible = await whToggle.isVisible().catch(() => false);
        if (toggleVisible) {
          await whToggle.click();
          await page.waitForTimeout(300);
        }
      }
    }

    await screenshotStep(page, '119', '11-screens-working-hours');
  });
});
