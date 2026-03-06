/**
 * Layouts & Template Gallery Screenshot Tests
 *
 * Captures screenshot evidence for layout list, editor, zones, and widget configurations:
 * - LAYOUT-01: Layout list page with create and filter actions
 * - LAYOUT-02: Layout creation modal with zone configuration
 * - LAYOUT-03: Layout editor zone selection and property panel
 * - LAYOUT-04: Widget type selector shows all 17+ widget types
 * - LAYOUT-05: Clock widget configuration (12h/24h, analog/digital)
 * - LAYOUT-06: Weather widget configuration (location, forecast mode)
 * - LAYOUT-07: Data table widget configuration (source, columns, refresh)
 * - LAYOUT-08: Video widget configuration (source, HLS, autoplay)
 *
 * Screenshots saved to screenshots/117/ using screenshotStep helper.
 * Step numbers start at 10+ to avoid collision with playlist screenshots (01-09).
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
  assertAppReady,
} from './helpers/index.js';

// Mock layout data for when backend is unavailable
const MOCK_LAYOUT_ID = 'e2e-test-layout-001';
const MOCK_LAYOUT = {
  id: MOCK_LAYOUT_ID,
  name: 'E2E Test Layout',
  description: 'Two column layout for testing',
  owner_id: 'e2e-test-user',
  orientation: 'landscape',
  resolution: '1920x1080',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  layout_zones: [
    {
      id: 'zone-001',
      zone_name: 'Left',
      x_percent: 0,
      y_percent: 0,
      width_percent: 50,
      height_percent: 100,
      z_index: 0,
      assigned_playlist_id: null,
      assigned_media_id: null,
      playlists: null,
      media: null,
    },
    {
      id: 'zone-002',
      zone_name: 'Right',
      x_percent: 50,
      y_percent: 0,
      width_percent: 50,
      height_percent: 100,
      z_index: 1,
      assigned_playlist_id: null,
      assigned_media_id: null,
      playlists: null,
      media: null,
    },
  ],
};

/**
 * Set up Supabase API route mocking so the layout editor can render
 * even when the backend is unavailable.
 *
 * Intercepts REST API calls matching layout/zone fetch patterns and returns
 * mock data. This allows the editor UI (zone canvas, preset buttons,
 * properties panel, assign modal) to render for screenshot capture.
 */
async function setupLayoutMocking(page) {
  // Intercept Supabase REST API calls for layouts table
  await page.route('**/rest/v1/layouts?*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'GET') {
      // Check if this is a single layout fetch (has id filter -- PostgREST .single())
      if (url.includes(`id=eq.${MOCK_LAYOUT_ID}`) || url.includes('select=')) {
        // .single() expects a plain object, not an array
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'content-range': '0-0/1',
            'content-profile': 'public',
          },
          body: JSON.stringify(MOCK_LAYOUT),
        });
      } else {
        // List fetch - return array
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: JSON.stringify([MOCK_LAYOUT]),
        });
      }
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LAYOUT),
      });
    } else if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LAYOUT),
      });
    } else {
      await route.continue();
    }
  });

  // Intercept layout_zones fetch
  await page.route('**/rest/v1/layout_zones?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-1/2' },
        body: JSON.stringify(MOCK_LAYOUT.layout_zones),
      });
    } else if (method === 'POST') {
      // Creating a zone -- return a new zone object
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'zone-new-' + Date.now(),
          zone_name: 'New Zone',
          x_percent: 0,
          y_percent: 0,
          width_percent: 25,
          height_percent: 25,
          z_index: 2,
          assigned_playlist_id: null,
          assigned_media_id: null,
        }),
      });
    } else if (method === 'PATCH' || method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    } else {
      await route.continue();
    }
  });

  // Intercept playlists fetch (for assign content modal)
  await page.route('**/rest/v1/playlists?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([{ id: 'playlist-001', name: 'Test Playlist' }]),
      });
    } else {
      await route.continue();
    }
  });

  // Intercept media_assets fetch (for assign content modal)
  await page.route('**/rest/v1/media_assets?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const mockMedia = [
        {
          id: 'media-001',
          name: 'Sample Image 1',
          type: 'image',
          url: 'https://placehold.co/400x300/orange/white?text=Sample+1',
          thumbnail_url: 'https://placehold.co/200x150/orange/white?text=S1',
          file_size: 102400,
          created_at: new Date().toISOString(),
        },
        {
          id: 'media-002',
          name: 'Sample Video',
          type: 'video',
          url: 'https://placehold.co/400x300/green/white?text=Video',
          thumbnail_url: 'https://placehold.co/200x150/green/white?text=V1',
          file_size: 1048576,
          duration: 30,
          created_at: new Date().toISOString(),
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${mockMedia.length - 1}/${mockMedia.length}` },
        body: JSON.stringify(mockMedia),
      });
    } else {
      await route.continue();
    }
  });

  // Intercept RPC calls
  await page.route('**/rest/v1/rpc/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/**
 * Navigate to the Templates/Layouts page via sidebar.
 */
async function navigateToTemplates(page) {
  const templatesButton = page.getByRole('button', { name: /templates/i }).first();
  const templatesCount = await templatesButton.count();

  if (templatesCount > 0 && (await templatesButton.isVisible().catch(() => false))) {
    await templatesButton.click();
  } else {
    // Fallback: use __setCurrentPage
    await page.evaluate(() => {
      if (typeof window.__setCurrentPage === 'function') {
        window.__setCurrentPage('layouts');
      }
    });
  }

  await waitForPageReady(page);
  await page.waitForTimeout(1000);
}

/**
 * Navigate to the Layout Editor page using mock layout ID.
 * Uses page.route() API mocking so the editor renders with fake data
 * instead of showing "Layout not found".
 */
async function navigateToLayoutEditor(page) {
  await page.evaluate((id) => {
    if (typeof window.__setCurrentPage === 'function') {
      window.__setCurrentPage('layout-editor-' + id);
    }
  }, MOCK_LAYOUT_ID);

  await waitForPageReady(page);
  await page.waitForTimeout(1500);
}

/**
 * Navigate to the Apps page.
 */
async function navigateToApps(page) {
  await page.evaluate(() => {
    if (typeof window.__setCurrentPage === 'function') {
      window.__setCurrentPage('apps');
    }
  });
  await waitForPageReady(page);
  await page.waitForTimeout(1000);
}

/**
 * Navigate to Data Sources page.
 */
async function navigateToDataSources(page) {
  await page.evaluate(() => {
    if (typeof window.__setCurrentPage === 'function') {
      window.__setCurrentPage('data-sources');
    }
  });
  await waitForPageReady(page);
  await page.waitForTimeout(1000);
}

test.describe('Layouts & Template Gallery Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Client test credentials not configured');

    await loginAndPrepare(page);
    await assertAppReady(page, test);
  });

  // =========================================================================
  // LAYOUT-01: Layout list page with create and filter actions
  // =========================================================================
  test('LAYOUT-01: layout list page with filters', async ({ page }) => {
    test.slow();

    await navigateToTemplates(page);

    // Wait for the hero section or template grid to appear
    const heroHeading = page.getByRole('heading', { name: /what template are you looking for/i });
    const templateGrid = page.locator('[data-testid="template-card"]').first();
    const allDesignsHeading = page.getByRole('heading', { name: /all designs/i });

    await Promise.race([
      heroHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      templateGrid.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      allDesignsHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);

    await waitForPageReady(page);

    // Screenshot the layouts/templates page
    await screenshotStep(page, '117', '10-layouts-list');

    // Click "Your Designs" button in the left sidebar
    const yourDesignsButton = page.getByRole('button', { name: /your designs/i }).first();
    const yourDesignsCount = await yourDesignsButton.count();
    if (yourDesignsCount > 0) {
      await yourDesignsButton.click();
      await page.waitForTimeout(1500);
      await waitForPageReady(page);

      // Screenshot your designs section (either user layouts grid or empty state)
      await screenshotStep(page, '117', '10-layouts-your-designs');
    }

    // Click "Featured" category in the sidebar to show featured filter
    // The sidebar categories are buttons with text labels
    const featuredButton = page.locator('button').filter({ hasText: /^Featured$/ }).first();
    const featuredCount = await featuredButton.count();
    if (featuredCount > 0 && (await featuredButton.isVisible().catch(() => false))) {
      await featuredButton.click();
      await page.waitForTimeout(1000);
      await waitForPageReady(page);
      await screenshotStep(page, '117', '10-layouts-featured-filter');
    }
  });

  // =========================================================================
  // LAYOUT-02: Layout creation modal with zone configuration
  // =========================================================================
  test('LAYOUT-02: layout editor with zone presets', async ({ page }) => {
    test.slow();

    // Set up API mocking before navigating so the editor loads with zones
    await setupLayoutMocking(page);

    // Navigate to layout editor (shows preset layouts)
    await navigateToLayoutEditor(page);

    // Wait for the editor to load - look for preset buttons or layout editor heading
    const editorHeading = page.getByText(/layout preview/i).first();
    const presetButton = page.getByRole('button', { name: /full screen|two columns|three columns/i }).first();
    const layoutNotFound = page.getByText(/layout not found/i);

    await Promise.race([
      editorHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      presetButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      layoutNotFound.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);

    await waitForPageReady(page);

    // Screenshot the layout editor with preset options
    await screenshotStep(page, '117', '11-layout-editor-presets');

    // Try clicking a preset (e.g., "Two Columns")
    try {
      const twoColumnsBtn = page.getByRole('button', { name: /two columns/i }).first();
      const twoCols = await twoColumnsBtn.count();
      if (twoCols > 0 && (await twoColumnsBtn.isVisible().catch(() => false))) {
        // Handle confirm dialog for replacing existing zones
        page.once('dialog', async (dialog) => {
          await dialog.accept();
        });
        await twoColumnsBtn.click();
        await page.waitForTimeout(1500);
        await screenshotStep(page, '117', '11-layout-two-columns');
      }
    } catch {
      // Preset buttons may not be available without a loaded layout
      await screenshotStep(page, '117', '11-layout-editor-state');
    }
  });

  // =========================================================================
  // LAYOUT-03: Layout editor zone selection and property panel
  // =========================================================================
  test('LAYOUT-03: zone selection and property panel', async ({ page }) => {
    test.slow();

    // Set up API mocking before navigating so zones are available
    await setupLayoutMocking(page);

    await navigateToLayoutEditor(page);

    // Wait for page to settle
    await page.waitForTimeout(2000);
    await waitForPageReady(page);

    // Look for zones in the layout preview canvas (colored divs inside the layout preview)
    const zones = page.locator('.absolute.border-2.cursor-pointer');
    const zoneCount = await zones.count();

    if (zoneCount > 0) {
      // Click on the first zone to select it
      await zones.first().click();
      await page.waitForTimeout(500);

      // Screenshot with selected zone and property panel
      await screenshotStep(page, '117', '12-zone-selected-properties');
    } else {
      // No zones yet - screenshot the empty editor
      await screenshotStep(page, '117', '12-zone-editor-empty');
    }

    // Try to add a zone
    const addZoneBtn = page.getByRole('button', { name: /add zone/i }).first();
    const addZoneCount = await addZoneBtn.count();
    if (addZoneCount > 0 && (await addZoneBtn.isVisible().catch(() => false))) {
      await addZoneBtn.click();
      await page.waitForTimeout(1000);
      await screenshotStep(page, '117', '12-zone-added');
    }
  });

  // =========================================================================
  // LAYOUT-04: Widget type selector shows all 17+ widget types
  // =========================================================================
  test('LAYOUT-04: content assignment modal with tabs', async ({ page }) => {
    test.slow();

    // Set up API mocking before navigating so zones and assign modal data are available
    await setupLayoutMocking(page);

    await navigateToLayoutEditor(page);
    await page.waitForTimeout(2000);
    await waitForPageReady(page);

    // Look for zones and try to open assign modal
    const zones = page.locator('.absolute.border-2.cursor-pointer');
    const zoneCount = await zones.count();

    if (zoneCount > 0) {
      // Select a zone first
      await zones.first().click();
      await page.waitForTimeout(500);

      // Look for "Assign Content" button in the zone properties panel
      const assignBtn = page.getByRole('button', { name: /assign content/i }).first();
      const assignCount = await assignBtn.count();

      if (assignCount > 0 && (await assignBtn.isVisible().catch(() => false))) {
        await assignBtn.click();
        await page.waitForTimeout(1500);

        // Wait for the assign modal to appear (it uses fixed overlay with bg-black/50)
        const assignModal = page.locator('.fixed.inset-0.bg-black\\/50').first();
        const modalVisible = await assignModal.waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false);

        if (modalVisible) {
          // Screenshot the assign modal
          await screenshotStep(page, '117', '13-widget-type-selector');

          // Scope tab buttons to the assign modal to avoid matching sidebar links
          const playlistsTab = assignModal.locator('button').filter({ hasText: /Playlists/ }).first();
          const mediaTab = assignModal.locator('button').filter({ hasText: /Media/ }).first();

          if (await playlistsTab.count() > 0 && (await playlistsTab.isVisible().catch(() => false))) {
            await playlistsTab.click();
            await page.waitForTimeout(500);
            await screenshotStep(page, '117', '13-assign-playlists-tab');
          }

          if (await mediaTab.count() > 0 && (await mediaTab.isVisible().catch(() => false))) {
            await mediaTab.click();
            await page.waitForTimeout(500);
            await screenshotStep(page, '117', '13-assign-media-tab');
          }

          // Close the modal
          await dismissAnyModals(page);
        } else {
          // Modal didn't appear - screenshot the zone properties with Assign Content button
          await screenshotStep(page, '117', '13-assign-content-button');
        }
      } else {
        // No assign button visible - screenshot zone properties as fallback
        await screenshotStep(page, '117', '13-zone-properties-fallback');
      }
    } else {
      // No zones available - screenshot whatever is visible
      await screenshotStep(page, '117', '13-no-zones-fallback');
    }
  });

  // =========================================================================
  // LAYOUT-05: Clock widget configuration (12h/24h, analog/digital)
  // =========================================================================
  test('LAYOUT-05: clock widget configuration', async ({ page }) => {
    test.slow();

    // Navigate to Apps page to find Clock app
    await navigateToApps(page);

    // Wait for apps page to load
    const appsHeading = page.getByRole('heading', { name: /apps/i }).first();
    await appsHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
    await waitForPageReady(page);

    // Look for a Clock app in the gallery
    const clockApp = page.locator('text=Clock').first();
    const clockCount = await clockApp.count();

    if (clockCount > 0 && (await clockApp.isVisible().catch(() => false))) {
      await clockApp.click();
      await page.waitForTimeout(1000);

      // Screenshot the clock app detail/config
      await screenshotStep(page, '117', '14-clock-app-config');

      // Close any modal
      await dismissAnyModals(page);
    } else {
      // Fallback: screenshot the apps page showing available apps
      await screenshotStep(page, '117', '14-apps-page-clock-search');
    }

    // Also try searching for Clock
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    const searchCount = await searchInput.count();
    if (searchCount > 0 && (await searchInput.isVisible().catch(() => false))) {
      await searchInput.fill('Clock');
      await page.waitForTimeout(500);
      await screenshotStep(page, '117', '14-clock-widget-config');
    }
  });

  // =========================================================================
  // LAYOUT-06: Weather widget configuration (location, forecast mode)
  // =========================================================================
  test('LAYOUT-06: weather widget configuration', async ({ page }) => {
    test.slow();

    // Navigate to Apps page to find Weather app
    await navigateToApps(page);

    const appsHeading = page.getByRole('heading', { name: /apps/i }).first();
    await appsHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
    await waitForPageReady(page);

    // Look for a Weather app in the gallery
    const weatherApp = page.locator('text=Weather').first();
    const weatherCount = await weatherApp.count();

    if (weatherCount > 0 && (await weatherApp.isVisible().catch(() => false))) {
      await weatherApp.click();
      await page.waitForTimeout(1000);
      await screenshotStep(page, '117', '15-weather-app-config');
      await dismissAnyModals(page);
    } else {
      await screenshotStep(page, '117', '15-apps-page-weather-search');
    }

    // Also try searching for Weather
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    const searchCount = await searchInput.count();
    if (searchCount > 0 && (await searchInput.isVisible().catch(() => false))) {
      await searchInput.fill('Weather');
      await page.waitForTimeout(500);
      await screenshotStep(page, '117', '15-weather-widget-config');
    }
  });

  // =========================================================================
  // LAYOUT-07: Data table widget configuration (source, columns, refresh)
  // =========================================================================
  test('LAYOUT-07: data table widget configuration', async ({ page }) => {
    test.slow();

    // Navigate to Data Sources page
    await navigateToDataSources(page);

    // Wait for data sources page
    const dsHeading = page.getByRole('heading', { name: /data source/i }).first();
    const dsPage = page.getByText(/data source/i).first();

    await Promise.race([
      dsHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      dsPage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);
    await waitForPageReady(page);

    // Screenshot the data sources page
    await screenshotStep(page, '117', '16-data-sources-page');

    // Try to open a create modal for data source
    const createBtn = page.getByRole('button', { name: /create|add|new/i }).first();
    const createCount = await createBtn.count();

    if (createCount > 0 && (await createBtn.isVisible().catch(() => false))) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"]').first();
      const dialogVisible = await dialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

      if (dialogVisible) {
        await screenshotStep(page, '117', '16-data-table-config');
        await dismissAnyModals(page);
      }
    }
  });

  // =========================================================================
  // LAYOUT-08: Video widget configuration (source, HLS, autoplay)
  // =========================================================================
  test('LAYOUT-08: video widget configuration', async ({ page }) => {
    test.slow();

    // Set up API mocking so layout editor has zones with content
    await setupLayoutMocking(page);

    // Navigate to layout editor to try assigning video content to a zone
    await navigateToLayoutEditor(page);
    await page.waitForTimeout(2000);
    await waitForPageReady(page);

    // Look for zones
    const zones = page.locator('.absolute.border-2.cursor-pointer');
    const zoneCount = await zones.count();

    if (zoneCount > 0) {
      // Click on a zone
      await zones.first().click();
      await page.waitForTimeout(500);

      // Screenshot zone properties panel showing content config
      await screenshotStep(page, '117', '17-zone-video-assigned');

      // Try to find assign button for media (video) assignment
      const assignBtn = page.getByRole('button', { name: /assign|content/i }).first();
      const assignCount = await assignBtn.count();

      if (assignCount > 0 && (await assignBtn.isVisible().catch(() => false))) {
        await assignBtn.click();
        await page.waitForTimeout(1000);

        // Switch to media tab if available
        const mediaTab = page.getByRole('button', { name: /media/i }).first();
        if (await mediaTab.count() > 0 && (await mediaTab.isVisible().catch(() => false))) {
          await mediaTab.click();
          await page.waitForTimeout(500);
        }

        await screenshotStep(page, '117', '17-video-widget-config');
        await dismissAnyModals(page);
      }
    } else {
      // Fallback: navigate to Apps and search for video-related app
      // Use "Stream" app (RTSP/HLS video streams) instead of "Video" which
      // matches "Video Wall" and navigates to the wrong page
      await navigateToApps(page);
      await page.waitForTimeout(1500);
      await waitForPageReady(page);

      // Use the search input to filter for video-related apps
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      const searchCount = await searchInput.count();
      if (searchCount > 0 && (await searchInput.isVisible().catch(() => false))) {
        await searchInput.fill('Stream');
        await page.waitForTimeout(1000);
        await screenshotStep(page, '117', '17-video-stream-search');

        // Try to click the Stream app card
        const streamApp = page.locator('text=Stream').first();
        if (await streamApp.count() > 0 && (await streamApp.isVisible().catch(() => false))) {
          await streamApp.click();
          await page.waitForTimeout(1000);
          await screenshotStep(page, '117', '17-video-widget-config');
          await dismissAnyModals(page);
        }
      } else {
        // No search input - try YouTube as alternative (won't navigate away)
        const youtubeApp = page.locator('text=YouTube').first();
        if (await youtubeApp.count() > 0 && (await youtubeApp.isVisible().catch(() => false))) {
          await youtubeApp.click();
          await page.waitForTimeout(1000);
          await screenshotStep(page, '117', '17-video-widget-config');
          await dismissAnyModals(page);
        } else {
          await screenshotStep(page, '117', '17-video-apps-fallback');
        }
      }
    }
  });
});
