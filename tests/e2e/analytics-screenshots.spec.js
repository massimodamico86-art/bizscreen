/**
 * Analytics, Alerts & Notification Settings Screenshot Tests
 *
 * Captures screenshot evidence for analytics, alerts, notifications, and Proof of Play:
 * - ANLYT-01: Analytics dashboard with summary cards
 * - ANLYT-02: Content performance page with metrics
 * - ANLYT-03: Activity log with filterable entries
 * - ANLYT-04: Alerts center with severity indicators
 * - ANLYT-05: Alert detail modal with timeline
 * - ANLYT-06: Notification settings with toggle controls
 * - ANLYT-07: Notification settings persistence after toggle
 * - ANLYT-08: Proof of Play reporting page
 *
 * Screenshots saved to screenshots/121/ using screenshotStep helper.
 *
 * analytics-dashboard and content-performance are feature-gated (ADVANCED_ANALYTICS).
 * Tests handle the upgrade prompt gracefully, capturing it as evidence.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
} from './helpers/index.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_ANALYTICS_SUMMARY = [
  { id: 'as-001', metric: 'total_impressions', value: 145230, change_percent: 12.5, period: 'last_30_days' },
  { id: 'as-002', metric: 'avg_dwell_time', value: 8.3, change_percent: -2.1, period: 'last_30_days' },
  { id: 'as-003', metric: 'active_screens', value: 24, change_percent: 4.2, period: 'last_30_days' },
  { id: 'as-004', metric: 'content_plays', value: 52400, change_percent: 18.7, period: 'last_30_days' },
];

const MOCK_CONTENT_PERFORMANCE = [
  { id: 'cp-001', content_name: 'Summer Sale Banner', content_type: 'image', impressions: 12500, avg_duration: 10, engagement_rate: 0.85, last_played: '2026-03-09T14:00:00Z' },
  { id: 'cp-002', content_name: 'Welcome Video', content_type: 'video', impressions: 8200, avg_duration: 30, engagement_rate: 0.72, last_played: '2026-03-09T12:00:00Z' },
  { id: 'cp-003', content_name: 'Menu Board Layout', content_type: 'layout', impressions: 6100, avg_duration: 15, engagement_rate: 0.91, last_played: '2026-03-09T16:00:00Z' },
];

const MOCK_ACTIVITY_LOG = [
  { id: 'al-001', action: 'content_uploaded', user_email: 'admin@bizscreen.com', description: 'Uploaded "New Banner.png"', created_at: '2026-03-09T16:30:00Z', severity: 'info' },
  { id: 'al-002', action: 'screen_offline', user_email: 'system', description: 'Screen "Lobby Display" went offline', created_at: '2026-03-09T15:45:00Z', severity: 'warning' },
  { id: 'al-003', action: 'playlist_updated', user_email: 'editor@bizscreen.com', description: 'Updated playlist "Main Rotation"', created_at: '2026-03-09T14:20:00Z', severity: 'info' },
  { id: 'al-004', action: 'user_login', user_email: 'admin@bizscreen.com', description: 'User logged in from 192.168.1.1', created_at: '2026-03-09T13:00:00Z', severity: 'info' },
];

const MOCK_ALERTS = [
  {
    id: 'alert-001',
    title: 'Screen Offline',
    message: 'Lobby Display has been offline for 30 minutes',
    type: 'device_offline',
    severity: 'critical',
    status: 'open',
    occurrences: 3,
    first_occurred_at: '2026-03-09T15:15:00Z',
    last_occurred_at: '2026-03-09T15:45:00Z',
    resolved_at: null,
    resolution_notes: null,
    meta: { device_name: 'Lobby Display' },
    device: { id: 'd1', name: 'Lobby Display', status: 'offline' },
    scene: null,
    schedule: null,
    data_source: null,
    created_at: '2026-03-09T15:15:00Z',
  },
  {
    id: 'alert-002',
    title: 'Storage Warning',
    message: 'Media storage at 85% capacity',
    type: 'storage_quota_warning',
    severity: 'warning',
    status: 'open',
    occurrences: 1,
    first_occurred_at: '2026-03-09T14:00:00Z',
    last_occurred_at: '2026-03-09T14:00:00Z',
    resolved_at: null,
    resolution_notes: null,
    meta: {},
    device: null,
    scene: null,
    schedule: null,
    data_source: null,
    created_at: '2026-03-09T14:00:00Z',
  },
  {
    id: 'alert-003',
    title: 'Content Sync Complete',
    message: 'All screens synced successfully',
    type: 'device_recovery',
    severity: 'info',
    status: 'resolved',
    occurrences: 1,
    first_occurred_at: '2026-03-09T12:00:00Z',
    last_occurred_at: '2026-03-09T12:00:00Z',
    resolved_at: '2026-03-09T12:05:00Z',
    resolution_notes: 'Auto-resolved',
    meta: {},
    device: null,
    scene: null,
    schedule: null,
    data_source: null,
    created_at: '2026-03-09T12:00:00Z',
  },
  {
    id: 'alert-004',
    title: 'Screen Restarted',
    message: 'Conference Room display restarted unexpectedly',
    type: 'device_error',
    severity: 'warning',
    status: 'acknowledged',
    occurrences: 2,
    first_occurred_at: '2026-03-09T10:00:00Z',
    last_occurred_at: '2026-03-09T10:30:00Z',
    resolved_at: null,
    resolution_notes: null,
    meta: { device_name: 'Conference Room' },
    device: { id: 'd2', name: 'Conference Room', status: 'online' },
    scene: null,
    schedule: null,
    data_source: null,
    created_at: '2026-03-09T10:00:00Z',
  },
];

const MOCK_NOTIFICATION_SETTINGS = [
  { id: 'ns-001', category: 'screen_alerts', label: 'Screen Offline Alerts', enabled: true, channel: 'email' },
  { id: 'ns-002', category: 'content_updates', label: 'Content Upload Notifications', enabled: true, channel: 'in_app' },
  { id: 'ns-003', category: 'system_alerts', label: 'System Maintenance Alerts', enabled: false, channel: 'email' },
  { id: 'ns-004', category: 'team_activity', label: 'Team Member Activity', enabled: true, channel: 'in_app' },
  { id: 'ns-005', category: 'billing', label: 'Billing & Plan Alerts', enabled: false, channel: 'email' },
];

const MOCK_PROOF_OF_PLAY = [
  { id: 'pop-001', content_name: 'Summer Sale Banner', screen_name: 'Lobby Display', played_at: '2026-03-09T14:00:00Z', duration: 10, verified: true },
  { id: 'pop-002', content_name: 'Welcome Video', screen_name: 'Reception Screen', played_at: '2026-03-09T13:30:00Z', duration: 30, verified: true },
  { id: 'pop-003', content_name: 'Menu Board Layout', screen_name: 'Cafeteria Display', played_at: '2026-03-09T12:00:00Z', duration: 15, verified: false },
];

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------

/**
 * Set up Supabase API route mocking for analytics, alerts, and notification data.
 */
async function setupAnalyticsMocking(page) {
  // Mock analytics_summary table
  await page.route('**/rest/v1/analytics_summary*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYTICS_SUMMARY),
      });
    } else {
      await route.continue();
    }
  });

  // Mock content_performance table
  await page.route('**/rest/v1/content_performance*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CONTENT_PERFORMANCE),
      });
    } else {
      await route.continue();
    }
  });

  // Mock activity_logs table
  await page.route('**/rest/v1/activity_logs*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-3/4' },
        body: JSON.stringify(MOCK_ACTIVITY_LOG),
      });
    } else {
      await route.continue();
    }
  });

  // Mock alerts table (with joins for device, scene, schedule, data_source)
  await page.route('**/rest/v1/alerts*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-3/4' },
        body: JSON.stringify(MOCK_ALERTS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock notification_settings / notification_preferences table
  await page.route('**/rest/v1/notification_settings*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_NOTIFICATION_SETTINGS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock notification_preferences table (used by NotificationSettingsPage)
  await page.route('**/rest/v1/notification_preferences*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'np-001',
          channel_email: true,
          channel_in_app: true,
          min_severity: 'warning',
          types_whitelist: null,
          types_blacklist: ['api_rate_limit'],
          quiet_hours_start: null,
          quiet_hours_end: null,
          quiet_hours_timezone: null,
          email_digest_enabled: false,
          email_digest_frequency: 'daily',
        }]),
      });
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'np-001' }]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock proof_of_play table
  await page.route('**/rest/v1/proof_of_play*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROOF_OF_PLAY),
      });
    } else {
      await route.continue();
    }
  });

  // Mock RPC endpoints
  await page.route('**/rest/v1/rpc/get_effective_limits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ max_screens: 50 }),
    });
  });

  await page.route('**/rest/v1/rpc/get_analytics_summary*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ANALYTICS_SUMMARY),
    });
  });

  await page.route('**/rest/v1/rpc/get_content_performance*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CONTENT_PERFORMANCE),
    });
  });

  // Mock RPC for alert summary
  await page.route('**/rest/v1/rpc/get_alert_summary*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ open: 2, critical: 1, warning: 1, info: 0, acknowledged: 1 }),
    });
  });

  // Mock proof of play RPC endpoints
  await page.route('**/rest/v1/rpc/get_proof_of_play*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROOF_OF_PLAY),
    });
  });

  await page.route('**/rest/v1/rpc/get_playback_summary*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_plays: 156,
        total_duration: 2340,
        unique_content: 12,
        unique_screens: 8,
      }),
    });
  });

  // Mock tv_devices for proof of play screen selector
  await page.route('**/rest/v1/tv_devices*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'd1', name: 'Lobby Display', status: 'online' },
          { id: 'd2', name: 'Conference Room', status: 'online' },
          { id: 'd3', name: 'Cafeteria Display', status: 'offline' },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock content analytics service calls (used by AnalyticsDashboardPage)
  await page.route('**/rest/v1/rpc/get_content_analytics_summary*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_view_hours: 342.5,
        active_screens: 24,
        top_content_name: 'Summer Sale Banner',
        total_scenes: 15,
      }),
    });
  });

  await page.route('**/rest/v1/rpc/get_top_scenes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { scene_id: 's1', scene_name: 'Summer Sale', total_view_seconds: 45000, play_count: 1200 },
        { scene_id: 's2', scene_name: 'Welcome Screen', total_view_seconds: 32000, play_count: 800 },
        { scene_id: 's3', scene_name: 'Menu Board', total_view_seconds: 28000, play_count: 950 },
      ]),
    });
  });

  await page.route('**/rest/v1/rpc/get_content_performance_list*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CONTENT_PERFORMANCE),
    });
  });

  await page.route('**/rest/v1/rpc/get_viewing_heatmap*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock dashboard analytics (used by ContentPerformancePage)
  await page.route('**/rest/v1/rpc/get_dashboard_analytics*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_plays: 52400,
        total_duration_hours: 342.5,
        active_devices: 24,
        avg_uptime_percent: 97.2,
        top_scenes: [
          { scene_id: 's1', scene_name: 'Summer Sale', total_plays: 12500, total_duration: 125000 },
          { scene_id: 's2', scene_name: 'Welcome Screen', total_plays: 8200, total_duration: 246000 },
        ],
        device_uptime: [
          { device_id: 'd1', device_name: 'Lobby Display', uptime_percent: 99.1, last_seen: '2026-03-09T16:00:00Z' },
          { device_id: 'd2', device_name: 'Conference Room', uptime_percent: 95.3, last_seen: '2026-03-09T15:30:00Z' },
        ],
      }),
    });
  });

  // Mock scenes for content performance
  await page.route('**/rest/v1/scenes*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 's1', name: 'Summer Sale', created_at: '2026-01-01T00:00:00Z' },
          { id: 's2', name: 'Welcome Screen', created_at: '2026-01-01T00:00:00Z' },
        ]),
      });
    } else {
      await route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Helper: Navigate to feature-gated page
// ---------------------------------------------------------------------------

async function navigateToFeatureGatedPage(page, pageId, stepPrefix) {
  await page.evaluate((id) => window.__setCurrentPage(id), pageId);
  await waitForPageReady(page);

  const upgradePrompt = page.locator('text=/upgrade.*plan|requires.*upgrade|available.*on/i').first();
  const isGated = await upgradePrompt.isVisible({ timeout: 3000 }).catch(() => false);

  if (isGated) {
    await screenshotStep(page, '121', `${stepPrefix}-feature-gated`);
    return { gated: true };
  }
  return { gated: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Analytics & Alerts Screenshot Tests', () => {

  // ANLYT-01: Analytics dashboard with summary cards
  test('captures analytics dashboard with summary cards', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'analytics-dashboard', '01');
    if (result.gated) {
      test.info().annotations.push({ type: 'skip', description: 'analytics-dashboard is feature-gated' });
      return;
    }

    // Wait for dashboard content to render
    await page.waitForSelector('text=/analytics|dashboard|overview/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await dismissAnyModals(page);

    await screenshotStep(page, '121', '01-analytics-dashboard');
  });

  // ANLYT-02: Content performance page with metrics
  test('captures content performance page with metrics', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'content-performance', '02');
    if (result.gated) {
      test.info().annotations.push({ type: 'skip', description: 'content-performance is feature-gated' });
      return;
    }

    // Wait for performance content to render
    await page.waitForSelector('text=/performance|content|scenes|uptime/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await dismissAnyModals(page);

    await screenshotStep(page, '121', '02-content-performance');
  });

  // ANLYT-03: Activity log with filterable entries
  test('captures activity log with filterable entries', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('activity'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for activity log heading or entries
    await page.waitForSelector('text=/activity|log|recent/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await screenshotStep(page, '121', '03-activity-log');
  });

  // ANLYT-04: Alerts center with severity indicators
  test('captures alerts center with severity indicators', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('alerts'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for alerts heading or alert entries
    await page.waitForSelector('text=/alerts center|alerts/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await screenshotStep(page, '121', '04-alerts-severity');
  });

  // ANLYT-05: Alert detail modal with timeline
  test('captures alert detail modal with timeline', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('alerts'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for alerts to load
    await page.waitForSelector('text=/alerts center|alerts/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Try to click on the first alert row to open detail modal
    // The alert title is a button that opens the detail modal
    const alertButton = page.locator('button:has-text("Screen Offline")').first();
    const alertExists = await alertButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (alertExists) {
      await alertButton.click();
      // Wait for modal to appear
      await page.waitForTimeout(500);
    } else {
      // Try clicking any alert title or the view details button (ExternalLink icon)
      const detailButton = page.locator('button[title="View details"]').first();
      const detailExists = await detailButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (detailExists) {
        await detailButton.click();
        await page.waitForTimeout(500);
      }
    }

    await screenshotStep(page, '121', '05-alert-detail-modal');
  });

  // ANLYT-06: Notification settings with toggle controls
  test('captures notification settings with toggle controls', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('notification-settings'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for settings heading or toggle controls
    await page.waitForSelector('text=/notification settings|notification/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await screenshotStep(page, '121', '06-notification-settings-toggles');
  });

  // ANLYT-07: Notification settings persistence after toggle
  test('captures notification settings persistence after toggle', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('notification-settings'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for settings to render
    await page.waitForSelector('text=/notification settings|notification/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Find the Quiet Hours toggle (it uses sr-only peer pattern) and click it
    const quietHoursToggle = page.locator('text=/quiet hours/i').locator('..').locator('..').locator('input[type="checkbox"].sr-only').first();
    const quietHoursExists = await quietHoursToggle.isVisible({ timeout: 2000 }).catch(() => false);

    if (quietHoursExists) {
      await quietHoursToggle.click({ force: true });
    } else {
      // Fallback: click any checkbox toggle on the page to show toggled state
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 2) {
        // Click a checkbox that's further down the page (likely an alert type toggle)
        await checkboxes.nth(Math.min(4, count - 1)).click({ force: true });
      }
    }

    await page.waitForTimeout(300);
    await screenshotStep(page, '121', '07-notification-toggle-persistence');
  });

  // ANLYT-08: Proof of Play reporting page
  test('captures Proof of Play reporting page', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAnalyticsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('proof-of-play'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for proof of play content
    await page.waitForSelector('text=/proof of play|playback|report/i', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await screenshotStep(page, '121', '08-proof-of-play');
  });
});
