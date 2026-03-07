/**
 * Screens & Device Management Screenshot Tests
 *
 * Captures screenshot evidence for screen management covering 5 SCRN requirements:
 * - SCRN-01: Screen list with status indicators (online/offline badges, device info)
 * - SCRN-02: Screen creation modal with pairing code info
 * - SCRN-03: OTP pairing flow (post-creation pairing code display)
 * - SCRN-04: Device diagnostics drawer (detail view with health metrics)
 * - SCRN-05: Remote commands menu (reboot, reload, clear cache, kiosk, reset)
 *
 * Screenshots saved to screenshots/119/ using screenshotStep helper.
 * Step numbers: 01-05 for this plan.
 *
 * Uses page.route() to mock Supabase REST API for screens and related data.
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
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_SCREENS = [
  {
    id: 'scr-001-aaaa-bbbb-cccc-ddddeeee0001',
    device_name: 'Lobby Display',
    otp_code: 'LBY742',
    status: 'online',
    player_type: 'bizscreen_player',
    orientation: 'landscape',
    last_seen: new Date().toISOString(),
    assigned_playlist_id: 'pl-001',
    assigned_playlist: { name: 'Welcome Loop' },
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: 'loc-001',
    location_name: 'Main Office',
    screen_group_id: 'sg-001',
    screen_group_name: 'Office Screens',
    working_hours: { enabled: true, start: '08:00', end: '20:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    kiosk_mode_enabled: false,
    device_info: { platform: 'ChromeOS' },
    model: 'ASUS Chromebit',
  },
  {
    id: 'scr-002-aaaa-bbbb-cccc-ddddeeee0002',
    device_name: 'Conference Room A',
    otp_code: 'CRA918',
    status: 'online',
    player_type: 'chrome',
    orientation: 'landscape',
    last_seen: new Date().toISOString(),
    assigned_playlist_id: null,
    assigned_playlist: null,
    assigned_layout_id: 'lay-001',
    assigned_layout: { name: 'Meeting Room Layout' },
    location_id: 'loc-001',
    location_name: 'Main Office',
    screen_group_id: null,
    screen_group_name: null,
    working_hours: null,
    kiosk_mode_enabled: true,
    device_info: { platform: 'Windows' },
    model: null,
  },
  {
    id: 'scr-003-aaaa-bbbb-cccc-ddddeeee0003',
    device_name: 'Storefront Window',
    otp_code: 'STR456',
    status: 'offline',
    player_type: 'bizscreen_player',
    orientation: 'portrait',
    last_seen: '2026-03-05T14:30:00Z',
    assigned_playlist_id: 'pl-002',
    assigned_playlist: { name: 'Promo Reel' },
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: 'loc-002',
    location_name: 'Downtown Store',
    screen_group_id: 'sg-002',
    screen_group_name: 'Retail Displays',
    working_hours: { enabled: true, start: '09:00', end: '21:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    kiosk_mode_enabled: false,
    device_info: { platform: 'Android' },
    model: 'Samsung Tizen',
  },
  {
    id: 'scr-004-aaaa-bbbb-cccc-ddddeeee0004',
    device_name: 'Cafeteria Menu Board',
    otp_code: 'CAF321',
    status: 'offline',
    player_type: 'chrome',
    orientation: 'landscape',
    last_seen: '2026-03-04T08:00:00Z',
    assigned_playlist_id: null,
    assigned_playlist: null,
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: null,
    location_name: null,
    screen_group_id: null,
    screen_group_name: null,
    working_hours: null,
    kiosk_mode_enabled: false,
    device_info: null,
    model: null,
  },
  {
    id: 'scr-005-aaaa-bbbb-cccc-ddddeeee0005',
    device_name: 'Reception Kiosk',
    otp_code: 'RCK887',
    status: 'online',
    player_type: 'bizscreen_player',
    orientation: 'portrait',
    last_seen: new Date().toISOString(),
    assigned_playlist_id: 'pl-001',
    assigned_playlist: { name: 'Welcome Loop' },
    assigned_layout_id: null,
    assigned_layout: null,
    location_id: 'loc-001',
    location_name: 'Main Office',
    screen_group_id: 'sg-001',
    screen_group_name: 'Office Screens',
    working_hours: null,
    kiosk_mode_enabled: true,
    device_info: { platform: 'Linux' },
    model: 'Raspberry Pi 4',
  },
];

const MOCK_PLAYLISTS = [
  { id: 'pl-001', name: 'Welcome Loop' },
  { id: 'pl-002', name: 'Promo Reel' },
  { id: 'pl-003', name: 'Daily Specials' },
];

const MOCK_LAYOUTS = [
  { id: 'lay-001', name: 'Meeting Room Layout', orientation: 'landscape' },
  { id: 'lay-002', name: 'Two-Zone Portrait', orientation: 'portrait' },
];

const MOCK_SCHEDULES = [
  { id: 'sch-001', name: 'Weekday Schedule' },
  { id: 'sch-002', name: 'Weekend Schedule' },
];

const MOCK_LOCATIONS = [
  { id: 'loc-001', name: 'Main Office' },
  { id: 'loc-002', name: 'Downtown Store' },
];

const MOCK_SCREEN_GROUPS = [
  { id: 'sg-001', name: 'Office Screens' },
  { id: 'sg-002', name: 'Retail Displays' },
];

const MOCK_DIAGNOSTICS = {
  screen: {
    id: 'scr-001-aaaa-bbbb-cccc-ddddeeee0001',
    device_name: 'Lobby Display',
    is_online: true,
    last_seen_at: new Date().toISOString(),
    player_version: '2.4.1',
    location_name: 'Main Office',
    group_name: 'Office Screens',
    timezone: 'America/New_York',
    device_metrics: {
      memory_gb: 3.2,
      js_heap_used: 45000000,
      js_heap_total: 100000000,
      storage_percent: 42,
      network_type: 'wifi',
      online: true,
      collected_at: new Date().toISOString(),
    },
    content_version_status: 'synced',
    last_screenshot_url: null,
    last_screenshot_at: null,
    needs_screenshot_update: false,
  },
  content_source: {
    resolution_path: 'playlist',
    assigned_playlist: { name: 'Welcome Loop', id: 'pl-001' },
    assigned_layout: null,
    active_schedule: null,
    active_campaign: null,
  },
  resolved_content: {
    type: 'playlist',
    name: 'Welcome Loop',
    items: [
      { name: 'Welcome Video', thumbnail_url: null },
      { name: 'Company Info', thumbnail_url: null },
    ],
  },
  recent_playback: {
    uptime_24h_percent: 98.5,
    last_event_at: new Date().toISOString(),
    top_items: [
      { media_id: 'm1', media_name: 'Welcome Video', play_count: 142 },
      { media_id: 'm2', media_name: 'Company Info', play_count: 98 },
    ],
  },
};

// ---------------------------------------------------------------------------
// API Mocking Setup
// ---------------------------------------------------------------------------

async function setupScreensMocking(page) {
  // Mock screens list
  await page.route('**/rest/v1/screens?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${MOCK_SCREENS.length - 1}/${MOCK_SCREENS.length}` },
        body: JSON.stringify(MOCK_SCREENS),
      });
    } else if (method === 'POST') {
      // Handle screen creation -- return a new screen with OTP code
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'scr-new-001',
          device_name: 'New Screen',
          otp_code: 'ABC123',
          status: 'offline',
          player_type: 'bizscreen_player',
          orientation: 'landscape',
          last_seen: null,
        }]),
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

  // Mock schedules
  await page.route('**/rest/v1/schedules?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCHEDULES),
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

  // Mock screen groups
  await page.route('**/rest/v1/screen_groups?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCREEN_GROUPS),
    });
  });

  // Mock plan limits
  await page.route('**/rest/v1/rpc/get_plan_limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maxScreens: 25 }),
    });
  });

  // Mock screen diagnostics
  await page.route('**/rest/v1/rpc/get_screen_diagnostics*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DIAGNOSTICS),
    });
  });

  // Mock screen_diagnostics table query
  await page.route('**/rest/v1/screen_diagnostics?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        screen_id: 'scr-001-aaaa-bbbb-cccc-ddddeeee0001',
        cpu_percent: 23,
        memory_percent: 64,
        disk_percent: 42,
        browser_version: 'Chrome 120.0.6099.109',
        os_version: 'ChromeOS 120',
        ip_address: '192.168.1.105',
        resolution: '1920x1080',
        uptime_seconds: 345600,
        js_heap_used: 45000000,
        js_heap_total: 100000000,
        last_heartbeat: new Date().toISOString(),
      }]),
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
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Screens Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Skip non-chromium browsers
    if (testInfo.project.name !== 'chromium') {
      test.skip(true, 'Screenshot tests run on chromium only');
    }

    // Set up API mocking before login
    await setupScreensMocking(page);

    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await dismissAnyModals(page);
  });

  test('SCRN-01: screen list with status indicators', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for table to appear or empty state
    const table = page.locator('table');
    const emptyState = page.locator('text=/No Screens Connected/i');

    await Promise.race([
      table.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null),
    ]);

    await screenshotStep(page, '119', '01-screens-list-status');
  });

  test('SCRN-02: screen creation modal with pairing code', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for page to settle
    await page.waitForTimeout(500);

    // Click "Add Screen" button
    const addBtn = page.getByRole('button', { name: 'Add Screen' });
    const addBtnVisible = await addBtn.isVisible().catch(() => false);

    if (addBtnVisible) {
      await addBtn.dispatchEvent('click');
    } else {
      // Fallback: try finding by text
      const fallbackBtn = page.locator('button:has-text("Add Screen")').first();
      await fallbackBtn.dispatchEvent('click');
    }

    // Wait for dialog to appear
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(300);

    await screenshotStep(page, '119', '02-screens-create-modal');

    // Fill in the name field if visible
    const nameInput = dialog.locator('input[type="text"], input[placeholder*="Lobby"], input[placeholder*="Screen"]').first();
    const inputVisible = await nameInput.isVisible().catch(() => false);

    if (inputVisible) {
      await nameInput.fill('Break Room Display');
      await page.waitForTimeout(200);
      await screenshotStep(page, '119', '02b-screens-create-filled');
    }
  });

  test('SCRN-03: OTP pairing flow', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);
    await page.waitForTimeout(500);

    // Click "Add Screen" button
    const addBtn = page.locator('button:has-text("Add Screen")').first();
    await addBtn.dispatchEvent('click');

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(300);

    // Fill in screen name
    const nameInput = dialog.locator('input[type="text"], input[placeholder*="Lobby"], input[placeholder*="Screen"]').first();
    const inputVisible = await nameInput.isVisible().catch(() => false);
    if (inputVisible) {
      await nameInput.fill('Test OTP Screen');
      await page.waitForTimeout(200);
    }

    // Click "Create Screen" submit button
    const createBtn = dialog.locator('button:has-text("Create Screen")').first();
    const createBtnVisible = await createBtn.isVisible().catch(() => false);

    if (createBtnVisible) {
      await createBtn.dispatchEvent('click');
      await page.waitForTimeout(1000);
    }

    // Wait for OTP code display (look for pairing code or ABC123 or the success state)
    const otpDisplay = page.locator('text=/pairing code|OTP|ABC123|Screen Created/i').first();
    await otpDisplay.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    await screenshotStep(page, '119', '03-screens-otp-pairing');
  });

  test('SCRN-04: device diagnostics drawer', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for table to appear
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(500);

    // Click the first action menu button (last button in the row is typically the MoreVertical)
    const rows = page.locator('table tbody tr');
    const firstRow = rows.first();
    const rowActionBtn = firstRow.locator('td:last-child button').first();
    const actionBtnVisible = await rowActionBtn.isVisible().catch(() => false);

    if (actionBtnVisible) {
      await rowActionBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Look for "View Details" menu item
      const viewDetailsBtn = page.locator('button:has-text("View Details")').first();
      const detailsVisible = await viewDetailsBtn.isVisible().catch(() => false);

      if (detailsVisible) {
        await viewDetailsBtn.dispatchEvent('click');
        await page.waitForTimeout(800);

        // Wait for the drawer to appear (fixed panel sliding in from the right)
        const drawer = page.locator('.fixed.inset-y-0.right-0, [class*="animate-slide-in"]').first();
        await drawer.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

        // Wait for loading to finish
        const loadingSpinner = drawer.locator('.animate-spin').first();
        await loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
      }
    }

    await screenshotStep(page, '119', '04-screens-device-diagnostics');
  });

  test('SCRN-05: remote commands menu', async ({ page }) => {
    // Navigate to screens page
    await page.evaluate(() => window.__setCurrentPage('screens'));
    await waitForPageReady(page);

    // Wait for table to appear
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(500);

    // Find and click the action menu button on the first screen row
    const rows = page.locator('table tbody tr');
    const firstRow = rows.first();
    const rowActionBtn = firstRow.locator('td:last-child button').first();
    const actionBtnVisible = await rowActionBtn.isVisible().catch(() => false);

    if (actionBtnVisible) {
      await rowActionBtn.dispatchEvent('click');
      await page.waitForTimeout(500);

      // The action menu should now be visible with Device Commands section
      const commandsHeader = page.locator('text=/Device Commands/i').first();
      await commandsHeader.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    }

    await screenshotStep(page, '119', '05-screens-remote-commands');
  });
});
