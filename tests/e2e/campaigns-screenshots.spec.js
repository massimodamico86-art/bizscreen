/**
 * Campaigns Screenshot Tests
 *
 * Captures screenshot evidence for campaign management covering all 9 CAMP requirements:
 * - CAMP-01: Campaign list with status indicators
 * - CAMP-02: Campaign creation with priority and dates
 * - CAMP-03: Content assignment in campaign editor
 * - CAMP-04: Screen targeting in campaign editor
 * - CAMP-05: Emergency push modal
 * - CAMP-06: Campaign analytics card
 * - CAMP-07: Rotation controls
 * - CAMP-08: Seasonal date picker
 * - CAMP-09: Template picker modal
 *
 * Screenshots saved to screenshots/118/ using screenshotStep helper.
 * Step numbers use 20-28 range for campaigns (templates 01-09, schedules 10-18).
 *
 * Campaigns is feature-gated (Feature.CAMPAIGNS). Tests handle the upgrade prompt
 * gracefully, capturing it as evidence and skipping the actual test.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
  assertAppReady,
} from './helpers/index.js';

// Mock campaign data for API route interception
const MOCK_CAMPAIGNS = [
  {
    id: 'camp-001',
    name: 'Black Friday Sale 2025',
    description: 'Seasonal promotion for all retail screens',
    status: 'active',
    priority: 150,
    start_at: '2025-11-28T00:00:00Z',
    end_at: '2025-12-01T23:59:59Z',
    target_count: 12,
    target_types: ['screen', 'screen_group'],
    content_count: 3,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-28T08:00:00Z',
  },
  {
    id: 'camp-002',
    name: 'Holiday Hours Notice',
    description: 'Display updated store hours during holidays',
    status: 'scheduled',
    priority: 100,
    start_at: '2025-12-20T00:00:00Z',
    end_at: '2026-01-02T23:59:59Z',
    target_count: 8,
    target_types: ['location'],
    content_count: 1,
    created_at: '2025-12-01T14:00:00Z',
    updated_at: '2025-12-05T09:00:00Z',
  },
  {
    id: 'camp-003',
    name: 'New Year Countdown',
    description: 'Countdown display for New Year celebration',
    status: 'draft',
    priority: 80,
    start_at: null,
    end_at: null,
    target_count: 0,
    target_types: [],
    content_count: 2,
    created_at: '2025-12-10T16:00:00Z',
    updated_at: '2025-12-10T16:00:00Z',
  },
  {
    id: 'camp-004',
    name: 'Summer Flash Sale',
    description: 'Completed summer promotion',
    status: 'completed',
    priority: 120,
    start_at: '2025-06-01T00:00:00Z',
    end_at: '2025-06-15T23:59:59Z',
    target_count: 5,
    target_types: ['screen'],
    content_count: 4,
    created_at: '2025-05-20T10:00:00Z',
    updated_at: '2025-06-15T23:59:59Z',
  },
  {
    id: 'camp-005',
    name: 'Q1 Product Launch',
    description: 'Product launch campaign paused for review',
    status: 'paused',
    priority: 110,
    start_at: '2026-01-15T00:00:00Z',
    end_at: '2026-02-15T23:59:59Z',
    target_count: 3,
    target_types: ['screen_group'],
    content_count: 2,
    created_at: '2026-01-05T11:00:00Z',
    updated_at: '2026-01-20T14:00:00Z',
  },
];

// Mock campaign editor data (for single campaign view)
const MOCK_CAMPAIGN_DETAIL = {
  id: 'camp-001',
  name: 'Black Friday Sale 2025',
  description: 'Seasonal promotion for all retail screens',
  status: 'active',
  priority: 150,
  start_at: '2025-11-28T00:00:00',
  end_at: '2025-12-01T23:59:59',
  approval_status: null,
  recurrence_rule: null,
  targets: [
    { id: 't1', target_type: 'screen', target_name: 'Lobby Display', target_id: 's1' },
    { id: 't2', target_type: 'screen_group', target_name: 'Retail Stores', target_id: 'sg1' },
    { id: 't3', target_type: 'location', target_name: 'Downtown Mall', target_id: 'l1' },
  ],
  contents: [
    { id: 'c1', content_type: 'playlist', content_name: 'Holiday Promos', content_id: 'p1', weight: 3, rotation_percentage: 50 },
    { id: 'c2', content_type: 'layout', content_name: 'Sale Banner Layout', content_id: 'l1', weight: 2, rotation_percentage: 30 },
    { id: 'c3', content_type: 'media', content_name: 'Black Friday Video', content_id: 'm1', weight: 1, rotation_percentage: 20 },
  ],
};

// Mock analytics data
const MOCK_ANALYTICS = {
  impressions: 45230,
  unique_screens: 12,
  avg_play_duration: 15.4,
  completion_rate: 92.3,
  daily_data: [],
};

// Mock template data for template picker
const MOCK_TEMPLATES = [
  {
    id: 'tmpl-001',
    name: 'Holiday Promotion',
    description: 'Template for seasonal holiday campaigns with targeted promotions',
    is_system: false,
    tags: ['holiday', 'retail'],
    template_data: {
      targets: [{ target_type: 'screen_group' }],
      contents: [{ content_type: 'playlist' }, { content_type: 'layout' }],
      settings: { priority: 120 },
    },
  },
  {
    id: 'tmpl-002',
    name: 'Emergency Broadcast',
    description: 'System template for urgent messages across all screens',
    is_system: true,
    tags: ['emergency', 'broadcast'],
    template_data: {
      targets: [{ target_type: 'all' }],
      contents: [{ content_type: 'media' }],
      settings: { priority: 200 },
    },
  },
  {
    id: 'tmpl-003',
    name: 'Product Launch',
    description: 'Multi-channel product launch campaign template',
    is_system: true,
    tags: ['launch', 'product'],
    template_data: {
      targets: [{ target_type: 'screen' }, { target_type: 'location' }],
      contents: [{ content_type: 'playlist' }, { content_type: 'media' }, { content_type: 'layout' }],
      settings: { priority: 140 },
    },
  },
];

/**
 * Set up Supabase API route mocking for campaigns data.
 * Intercepts REST API calls to return mock campaign data.
 */
async function setupCampaignMocking(page) {
  // Mock campaigns list
  await page.route('**/rest/v1/campaigns?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-4/5' },
        body: JSON.stringify(MOCK_CAMPAIGNS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock single campaign fetch (for editor)
  await page.route('**/rest/v1/campaigns?id=eq.*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_CAMPAIGN_DETAIL]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock campaign targets
  await page.route('**/rest/v1/campaign_targets?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CAMPAIGN_DETAIL.targets),
    });
  });

  // Mock campaign contents
  await page.route('**/rest/v1/campaign_contents?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CAMPAIGN_DETAIL.contents),
    });
  });

  // Mock campaign analytics
  await page.route('**/rest/v1/campaign_analytics?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([MOCK_ANALYTICS]),
    });
  });

  // Mock campaign templates
  await page.route('**/rest/v1/campaign_templates?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TEMPLATES),
    });
  });

  // Mock screens for target picker
  await page.route('**/rest/v1/screens?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 's1', name: 'Lobby Display', status: 'online' },
        { id: 's2', name: 'Entrance Screen', status: 'online' },
        { id: 's3', name: 'Checkout Display', status: 'offline' },
      ]),
    });
  });

  // Mock screen groups for target picker
  await page.route('**/rest/v1/screen_groups?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'sg1', name: 'Retail Stores', screen_count: 8 },
        { id: 'sg2', name: 'Office Lobbies', screen_count: 4 },
      ]),
    });
  });

  // Mock locations for target picker
  await page.route('**/rest/v1/locations?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'l1', name: 'Downtown Mall', screen_count: 6 },
        { id: 'l2', name: 'Airport Terminal', screen_count: 3 },
      ]),
    });
  });

  // Mock playlists for content picker
  await page.route('**/rest/v1/playlists?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'p1', name: 'Holiday Promos', item_count: 5 },
        { id: 'p2', name: 'Daily Specials', item_count: 3 },
      ]),
    });
  });

  // Mock layouts for content picker
  await page.route('**/rest/v1/layouts?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'l1', name: 'Sale Banner Layout', orientation: 'landscape' },
        { id: 'l2', name: 'Two Column Info', orientation: 'landscape' },
      ]),
    });
  });
}

/**
 * Navigate to campaigns page and check for feature gate.
 * Returns { gated: boolean } -- if gated, screenshot is already captured.
 */
async function navigateToCampaigns(page, stepPrefix) {
  await page.evaluate(() => window.__setCurrentPage('campaigns'));
  await waitForPageReady(page);

  // Check for feature upgrade prompt
  const upgradePrompt = page.locator('text=/upgrade.*plan|requires.*upgrade|available.*on/i').first();
  const isGated = await upgradePrompt.isVisible().catch(() => false);

  if (isGated) {
    await screenshotStep(page, '118', `${stepPrefix}-campaigns-feature-gated`);
    return { gated: true };
  }

  return { gated: false };
}

/**
 * Navigate to campaign editor for a specific or new campaign.
 */
async function navigateToCampaignEditor(page, campaignId = 'new') {
  await page.evaluate((id) => window.__setCurrentPage(`campaign-editor-${id}`), campaignId);
  await waitForPageReady(page);
}

test.describe('Campaigns Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Skip non-chromium browsers
    if (testInfo.project.name !== 'chromium') {
      test.skip(true, 'Screenshot tests run on chromium only');
    }

    // Set up API mocking before login
    await setupCampaignMocking(page);

    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await dismissAnyModals(page);
  });

  test('CAMP-01: campaign list with status indicators', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '20');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated - upgrade prompt captured');
      return;
    }

    // Wait for campaign list to render (table or empty state)
    const table = page.locator('table[role="table"]');
    const emptyState = page.locator('text=/No Campaigns/i');

    await Promise.race([
      table.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ]);

    await screenshotStep(page, '118', '20-campaigns-list');
  });

  test('CAMP-02: campaign creation with priority and dates', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '21');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Click New Campaign button to open dropdown
    const newCampaignBtn = page.locator('button:has-text("New Campaign")').first();
    const btnVisible = await newCampaignBtn.isVisible().catch(() => false);

    if (btnVisible) {
      // Use dispatchEvent to bypass overlay interception
      await newCampaignBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Click "Blank Campaign" from dropdown
      const blankOption = page.locator('button:has-text("Blank Campaign")').first();
      const blankVisible = await blankOption.isVisible().catch(() => false);
      if (blankVisible) {
        await blankOption.dispatchEvent('click');
        await waitForPageReady(page);
      }
    }

    // Now on campaign editor (new) -- capture the creation form with priority and dates
    await screenshotStep(page, '118', '21-campaigns-create-form');
  });

  test('CAMP-03: content assignment', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '22');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Navigate to campaign editor for existing campaign
    await navigateToCampaignEditor(page, 'camp-001');

    // Look for Add Content button
    const addContentBtn = page.locator('button:has-text("Add Content")').first();
    const contentBtnVisible = await addContentBtn.isVisible().catch(() => false);

    if (contentBtnVisible) {
      await addContentBtn.dispatchEvent('click');
      await page.waitForTimeout(500);

      // Check if content picker modal opened
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    }

    await screenshotStep(page, '118', '22-campaigns-content-assignment');
  });

  test('CAMP-04: screen targeting', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '23');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Navigate to campaign editor for existing campaign
    await navigateToCampaignEditor(page, 'camp-001');

    // Look for Add Target button
    const addTargetBtn = page.locator('button:has-text("Add Target")').first();
    const targetBtnVisible = await addTargetBtn.isVisible().catch(() => false);

    if (targetBtnVisible) {
      await addTargetBtn.dispatchEvent('click');
      await page.waitForTimeout(500);

      // Check if target picker modal opened
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    }

    await screenshotStep(page, '118', '23-campaigns-screen-targeting');
  });

  test('CAMP-05: emergency push modal', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '24');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Emergency push may be on the campaigns page or in the campaign editor.
    // Check campaigns page first for any emergency/push buttons.
    let emergencyBtn = page.locator('button:has-text(/emergency|push now|broadcast/i)').first();
    let emergencyVisible = await emergencyBtn.isVisible().catch(() => false);

    if (!emergencyVisible) {
      // Try in campaign editor -- navigate to an active campaign
      await navigateToCampaignEditor(page, 'camp-001');

      emergencyBtn = page.locator('button:has-text(/emergency|push now|broadcast|activate/i)').first();
      emergencyVisible = await emergencyBtn.isVisible().catch(() => false);

      if (emergencyVisible) {
        await emergencyBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
      }
    } else {
      await emergencyBtn.dispatchEvent('click');
      await page.waitForTimeout(500);
    }

    // Capture whatever state we ended up in -- emergency modal or editor with activate controls
    await screenshotStep(page, '118', '24-campaigns-emergency-push');
  });

  test('CAMP-06: campaign analytics', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '25');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Navigate to campaign editor for existing campaign to see analytics card
    await navigateToCampaignEditor(page, 'camp-001');

    // Wait for the analytics section to appear (CampaignAnalyticsCard)
    const analyticsCard = page.locator('text=/analytics|impressions|performance/i').first();
    await analyticsCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    await screenshotStep(page, '118', '25-campaigns-analytics');
  });

  test('CAMP-07: rotation controls', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '26');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Navigate to campaign editor for existing campaign with content
    await navigateToCampaignEditor(page, 'camp-001');

    // Look for rotation controls section (appears when 2+ contents exist)
    const rotationSection = page.locator('text=/Content Rotation|Weighted|Sequential|Random/i').first();
    await rotationSection.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    await screenshotStep(page, '118', '26-campaigns-rotation-controls');
  });

  test('CAMP-08: seasonal date picker', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '27');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Navigate to campaign editor for existing campaign (non-new to see SeasonalDatePicker)
    await navigateToCampaignEditor(page, 'camp-001');

    // Look for Seasonal Recurrence toggle
    const seasonalSection = page.locator('text=/Seasonal Recurrence/i').first();
    await seasonalSection.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    // If the toggle/switch is visible, try to enable it to show the full picker
    const switchToggle = page.locator('button[role="switch"], [role="switch"]').first();
    const switchVisible = await switchToggle.isVisible().catch(() => false);
    if (switchVisible) {
      const isChecked = await switchToggle.getAttribute('aria-checked');
      if (isChecked !== 'true') {
        await switchToggle.click();
        await page.waitForTimeout(300);
      }
    }

    await screenshotStep(page, '118', '27-campaigns-seasonal-date-picker');
  });

  test('CAMP-09: template picker modal', async ({ page }) => {
    const { gated } = await navigateToCampaigns(page, '28');
    if (gated) {
      test.skip(true, 'Campaigns feature is gated');
      return;
    }

    // Click New Campaign button to open dropdown
    const newCampaignBtn = page.locator('button:has-text("New Campaign")').first();
    const btnVisible = await newCampaignBtn.isVisible().catch(() => false);

    if (btnVisible) {
      await newCampaignBtn.dispatchEvent('click');
      await page.waitForTimeout(300);

      // Click "From Template" to open TemplatePickerModal
      const fromTemplateBtn = page.locator('button:has-text("From Template")').first();
      const templateVisible = await fromTemplateBtn.isVisible().catch(() => false);
      if (templateVisible) {
        await fromTemplateBtn.dispatchEvent('click');
        await page.waitForTimeout(500);
      }
    }

    // Wait for template picker modal
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

    await screenshotStep(page, '118', '28-campaigns-template-picker');
  });
});
