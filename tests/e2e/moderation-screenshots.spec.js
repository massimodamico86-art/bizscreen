/**
 * Content Moderation Screenshot Tests
 *
 * Captures screenshot evidence for content moderation covering 5 MOD requirements:
 * - MOD-01: Moderation queue with pending social posts
 * - MOD-02: Approve action UI on pending post card
 * - MOD-03: Reject action UI on pending post card
 * - MOD-04: Status filter tabs (all/pending/approved/rejected)
 * - MOD-05: Hashtag/account filter configuration area
 *
 * Screenshots saved to screenshots/120/ using screenshotStep helper.
 * Step numbers: 14-18 for this plan.
 *
 * Uses page.route() to mock Supabase REST API for social feeds and accounts.
 */

import { test, expect } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
} from './helpers/index.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_SOCIAL_ACCOUNTS = [
  {
    id: 'sa-001',
    provider: 'instagram',
    account_name: 'BizScreen Official',
    username: '@bizscreen_official',
    display_name: 'BizScreen Official',
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
    last_sync_at: '2026-03-06T15:00:00Z',
    last_sync_error: null,
  },
  {
    id: 'sa-002',
    provider: 'twitter',
    account_name: 'BizScreen',
    username: '@bizscreen',
    display_name: 'BizScreen',
    is_active: true,
    created_at: '2026-01-20T10:00:00Z',
    last_sync_at: '2026-03-06T14:00:00Z',
    last_sync_error: null,
  },
];

const MOCK_MODERATION_POSTS = [
  {
    id: 'post-001',
    account_id: 'sa-001',
    provider: 'instagram',
    content_text: 'Check out our new digital signage setup! #digitalsignage #bizscreen',
    author_name: '@customer_one',
    media_url: null,
    thumbnail_url: null,
    posted_at: '2026-03-06T14:30:00Z',
    created_at: '2026-03-06T14:35:00Z',
    likes_count: 42,
    comments_count: 5,
    moderation: [],
  },
  {
    id: 'post-002',
    account_id: 'sa-002',
    provider: 'twitter',
    content_text: 'Amazing experience with @bizscreen displays at our store opening event today!',
    author_name: '@store_launch',
    media_url: null,
    thumbnail_url: null,
    posted_at: '2026-03-06T12:00:00Z',
    created_at: '2026-03-06T12:05:00Z',
    likes_count: 18,
    comments_count: 3,
    moderation: [],
  },
  {
    id: 'post-003',
    account_id: 'sa-001',
    provider: 'instagram',
    content_text: 'Beautiful menu board powered by BizScreen - love the easy content management',
    author_name: '@restaurant_fan',
    media_url: null,
    thumbnail_url: null,
    posted_at: '2026-03-05T18:00:00Z',
    created_at: '2026-03-05T18:10:00Z',
    likes_count: 67,
    comments_count: 12,
    moderation: [],
  },
  {
    id: 'post-004',
    account_id: 'sa-002',
    provider: 'twitter',
    content_text: 'Great product showcase display at the conference booth!',
    author_name: '@retail_partner',
    media_url: null,
    thumbnail_url: null,
    posted_at: '2026-03-05T10:00:00Z',
    created_at: '2026-03-05T10:05:00Z',
    likes_count: 30,
    comments_count: 2,
    moderation: [{ approved: true, moderated_at: '2026-03-05T11:00:00Z', notes: '' }],
  },
  {
    id: 'post-005',
    account_id: 'sa-001',
    provider: 'instagram',
    content_text: 'Inappropriate content flagged for review',
    author_name: '@spam_account',
    media_url: null,
    thumbnail_url: null,
    posted_at: '2026-03-04T08:00:00Z',
    created_at: '2026-03-04T08:10:00Z',
    likes_count: 0,
    comments_count: 0,
    moderation: [{ approved: false, moderated_at: '2026-03-04T09:00:00Z', notes: 'Spam content' }],
  },
];

const MOCK_FEED_SETTINGS = [
  {
    id: 'fs-001',
    account_id: 'sa-001',
    hashtag_filter: '#bizscreen,#digitalsignage',
    auto_approve: false,
    created_at: '2026-01-15T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------

async function setupModerationMocking(page) {
  // Mock social_accounts (used by getConnectedAccounts)
  await page.route('**/rest/v1/social_accounts*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SOCIAL_ACCOUNTS),
      });
    } else {
      await route.fallback();
    }
  });

  // Mock social_feeds with moderation join (used by getModerationQueue)
  await page.route('**/rest/v1/social_feeds*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MODERATION_POSTS),
      });
    } else {
      await route.fallback();
    }
  });

  // Mock social_feed_moderation (for moderatePost writes)
  await page.route('**/rest/v1/social_feed_moderation*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mod-001', approved: true }),
      });
    }
  });

  // Mock social_feed_settings (for hashtag config)
  await page.route('**/rest/v1/social_feed_settings*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FEED_SETTINGS),
      });
    } else {
      await route.fallback();
    }
  });

  // Mock RPC get_effective_limits
  await page.route('**/rest/v1/rpc/get_effective_limits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        max_screens: 25,
        max_users: 10,
        max_storage_mb: 5120,
        max_playlists: 50,
        max_layouts: 20,
      }),
    });
  });
}

/**
 * Navigate to moderation page and wait for posts to render.
 */
async function navigateToModeration(page) {
  await page.evaluate(() => window.__setCurrentPage('content-moderation'));
  await waitForPageReady(page);
  await dismissAnyModals(page);

  // Wait for posts to render
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      return body.includes('@customer_one') || body.includes('digital signage');
    },
    { timeout: 10000 },
  );
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Content Moderation Screenshot Tests', () => {
  test('MOD-01: captures moderation queue with pending items', async ({ page }) => {
    await loginAndPrepare(page);
    await setupModerationMocking(page);
    await navigateToModeration(page);

    // Full page screenshot showing queue with all posts
    await screenshotStep(page, '120', '14-moderation-queue');
  });

  test('MOD-02: captures approve action UI', async ({ page }) => {
    await loginAndPrepare(page);
    await setupModerationMocking(page);
    await navigateToModeration(page);

    // Target approve buttons inside post cards (bg-green-50 class distinguishes from tab buttons)
    const approveButton = page.locator('button.bg-green-50', { hasText: 'Approve' }).first();
    await expect(approveButton).toBeVisible({ timeout: 5000 });

    // Hover the approve button to highlight it
    await approveButton.hover();
    await page.waitForTimeout(300);

    // Screenshot the first post card containing the approve button
    // Cards use the grid layout -- find the parent card
    const firstCard = page.locator('.grid .overflow-hidden').first();
    await firstCard.screenshot({
      path: 'screenshots/120/120-15-moderation-approve-action-desktop.png',
    });
  });

  test('MOD-03: captures reject action UI', async ({ page }) => {
    await loginAndPrepare(page);
    await setupModerationMocking(page);
    await navigateToModeration(page);

    // Target reject buttons inside post cards (bg-red-50 class distinguishes from tab buttons)
    const rejectButton = page.locator('button.bg-red-50', { hasText: 'Reject' }).first();
    await expect(rejectButton).toBeVisible({ timeout: 5000 });

    // Hover the reject button to highlight it
    await rejectButton.hover();
    await page.waitForTimeout(300);

    // Screenshot the second post card to show a different card with reject highlighted
    const secondCard = page.locator('.grid .overflow-hidden').nth(1);
    await secondCard.screenshot({
      path: 'screenshots/120/120-16-moderation-reject-reason-desktop.png',
    });
  });

  test('MOD-04: captures filter tabs showing status options', async ({ page }) => {
    await loginAndPrepare(page);
    await setupModerationMocking(page);
    await navigateToModeration(page);

    // Click "Pending" tab to show filtered state (distinct from MOD-01 which shows "All")
    const pendingTab = page.locator('button', { hasText: 'Pending' }).first();
    await expect(pendingTab).toBeVisible({ timeout: 5000 });
    await pendingTab.click();
    await page.waitForTimeout(300);

    // Screenshot the status filter tab bar showing Pending selected
    const filterBar = page.locator('.flex.gap-1').filter({ hasText: 'All' }).first();
    try {
      await filterBar.screenshot({
        path: 'screenshots/120/120-17-moderation-filter-status-desktop.png',
      });
    } catch {
      await screenshotStep(page, '120', '17-moderation-filter-status');
    }
  });

  test('MOD-05: captures hashtag/account filter configuration', async ({ page }) => {
    await loginAndPrepare(page);
    await setupModerationMocking(page);
    await navigateToModeration(page);

    // Select a specific account in the account filter dropdown
    const accountSelect = page.locator('select[aria-label="Filter by social account"]');
    await expect(accountSelect).toBeVisible({ timeout: 5000 });
    await accountSelect.selectOption({ label: 'BizScreen Official (Instagram)' });
    await page.waitForTimeout(500);

    // Take full page screenshot showing filtered-by-account state
    // This is visually distinct from MOD-01 (shows account filter selected + filtered results)
    await screenshotStep(page, '120', '18-moderation-hashtag-config');
  });
});
