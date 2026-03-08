/**
 * Apps & Menu Boards Screenshot Tests
 *
 * Captures screenshot evidence for apps gallery and menu boards covering APP-01 through APP-08:
 * - APP-01: Apps gallery page with catalog cards
 * - APP-02: App detail modal with description and Use App button
 * - APP-03: App config save (via Use App -> config modal)
 * - APP-04: Menu boards list page with board cards
 * - APP-05: Menu board editor modal with categories and items
 * - APP-06: Menu board item reorder state (drag handles visible)
 * - APP-07: Dietary/allergen tags on menu items
 * - APP-08: Menu board theme and currency settings
 *
 * Screenshots saved to screenshots/120/ using screenshotStep helper.
 * Step numbers use 06-13 range for this plan.
 *
 * Uses page.route() to mock Supabase REST API for installed apps and menu board data.
 * Apps gallery catalog cards are client-side and render without API mocking.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
} from './helpers/index.js';

// ---------------------------------------------------------------------------
// Mock data constants
// ---------------------------------------------------------------------------

const MOCK_INSTALLED_APPS = [
  {
    id: 'app-001',
    name: 'Office Clock',
    type: 'app',
    config_json: { appType: 'clock', format: '12h', style: 'digital' },
    created_at: '2026-02-15T08:00:00Z',
    owner_id: 'user-1',
  },
  {
    id: 'app-002',
    name: 'Weather Display',
    type: 'app',
    config_json: { appType: 'weather', location: 'New York', unit: 'fahrenheit' },
    created_at: '2026-02-20T10:00:00Z',
    owner_id: 'user-1',
  },
  {
    id: 'app-003',
    name: 'News Ticker',
    type: 'app',
    config_json: { appType: 'rss_ticker', url: 'https://feeds.example.com/news' },
    created_at: '2026-03-01T14:00:00Z',
    owner_id: 'user-1',
  },
];

const MOCK_MENU_BOARDS = [
  {
    id: 'mb-001',
    name: 'Lunch Menu',
    description: 'Daily lunch specials',
    theme: 'dark',
    currency: 'USD',
    currency_code: 'USD',
    accent_color: '#f26f21',
    price_columns: [{ key: 'default', label: 'Price' }],
    page_interval_seconds: 10,
    menu_categories: { count: 3 },
    menu_items: { count: 6 },
    created_at: '2026-02-10T08:00:00Z',
    owner_id: 'user-1',
  },
  {
    id: 'mb-002',
    name: 'Drinks Menu',
    description: 'Beverages and cocktails',
    theme: 'light',
    currency: 'EUR',
    currency_code: 'EUR',
    accent_color: '#3b82f6',
    price_columns: [{ key: 'default', label: 'Price' }],
    page_interval_seconds: 15,
    menu_categories: { count: 2 },
    menu_items: { count: 3 },
    created_at: '2026-02-15T12:00:00Z',
    owner_id: 'user-1',
  },
];

const MOCK_MENU_CATEGORIES = [
  { id: 'cat-001', menu_board_id: 'mb-001', name: 'Starters', order_index: 0, is_visible: true },
  { id: 'cat-002', menu_board_id: 'mb-001', name: 'Main Course', order_index: 1, is_visible: true },
  { id: 'cat-003', menu_board_id: 'mb-001', name: 'Desserts', order_index: 2, is_visible: true },
  { id: 'cat-004', menu_board_id: 'mb-002', name: 'Hot Drinks', order_index: 0, is_visible: true },
  { id: 'cat-005', menu_board_id: 'mb-002', name: 'Cold Drinks', order_index: 1, is_visible: true },
];

const MOCK_MENU_ITEMS = [
  {
    id: 'item-001', category_id: 'cat-001', name: 'Caesar Salad',
    prices: { default: 12.99 }, description: 'Fresh romaine lettuce',
    dietary_tags: ['vegetarian', 'gluten-free'], order_index: 0, is_available: true,
  },
  {
    id: 'item-002', category_id: 'cat-001', name: 'Soup of the Day',
    prices: { default: 8.50 }, description: 'Ask your server',
    dietary_tags: [], order_index: 1, is_available: true,
  },
  {
    id: 'item-003', category_id: 'cat-002', name: 'Grilled Salmon',
    prices: { default: 24.99 }, description: 'Atlantic salmon fillet',
    dietary_tags: ['gluten-free'], order_index: 0, is_available: true,
  },
  {
    id: 'item-004', category_id: 'cat-002', name: 'Pasta Primavera',
    prices: { default: 18.50 }, description: 'Seasonal vegetables',
    dietary_tags: ['vegetarian', 'vegan'], order_index: 1, is_available: true,
  },
  {
    id: 'item-005', category_id: 'cat-002', name: 'Chicken Parmesan',
    prices: { default: 21.99 }, description: 'Breaded chicken breast',
    dietary_tags: [], order_index: 2, is_available: true,
  },
  {
    id: 'item-006', category_id: 'cat-003', name: 'Tiramisu',
    prices: { default: 9.99 }, description: 'Classic Italian dessert',
    dietary_tags: ['vegetarian'], order_index: 0, is_available: true,
  },
  {
    id: 'item-007', category_id: 'cat-004', name: 'Espresso',
    prices: { default: 3.50 }, description: 'Double shot',
    dietary_tags: ['vegan'], order_index: 0, is_available: true,
  },
  {
    id: 'item-008', category_id: 'cat-004', name: 'Cappuccino',
    prices: { default: 4.50 }, description: 'With steamed milk',
    dietary_tags: ['vegetarian'], order_index: 1, is_available: true,
  },
  {
    id: 'item-009', category_id: 'cat-005', name: 'Fresh Lemonade',
    prices: { default: 5.00 }, description: 'House-made',
    dietary_tags: ['vegan', 'gluten-free'], order_index: 0, is_available: true,
  },
];

// ---------------------------------------------------------------------------
// Mock setup functions
// ---------------------------------------------------------------------------

/**
 * Set up API mocking for apps (installed apps from media_assets).
 * Catalog apps are client-side and need no mocking.
 */
async function setupAppsMocking(page) {
  // Mock installed apps (media_assets with type=app)
  await page.route('**/rest/v1/media_assets*', async (route) => {
    const url = route.request().url();
    if (url.includes('type=eq.app') || url.includes('select=')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_INSTALLED_APPS),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });

  // Mock effective limits
  await page.route('**/rest/v1/rpc/get_effective_limits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        max_screens: 50,
        max_storage_mb: 10240,
        max_users: 25,
        max_media: 500,
        max_playlists: 100,
        max_layouts: 50,
        max_schedules: 50,
        max_apps: 100,
        max_menu_boards: 20,
      }),
    });
  });
}

/**
 * Set up API mocking for menu boards.
 */
async function setupMenuBoardMocking(page) {
  // Mock menu boards list and single board fetch
  await page.route('**/rest/v1/menu_boards*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const acceptHeader = route.request().headers()['accept'] || '';

    if (method === 'GET') {
      // Single board fetch (for editor - getMenuBoard uses .single())
      if (url.includes('id=eq.')) {
        const idMatch = url.match(/id=eq\.([^&]+)/);
        const boardId = idMatch?.[1];
        const board = MOCK_MENU_BOARDS.find((b) => b.id === boardId);
        if (board) {
          // Return full board data for editor (with nested categories/items)
          const categories = MOCK_MENU_CATEGORIES
            .filter((c) => c.menu_board_id === boardId)
            .map((cat) => ({
              ...cat,
              menu_items: MOCK_MENU_ITEMS.filter((item) => item.category_id === cat.id),
            }));
          const fullBoard = { ...board, menu_categories: categories };

          // .single() sends Accept: application/vnd.pgrst.object+json
          // PostgREST returns a plain object (not array) for this header
          if (acceptHeader.includes('vnd.pgrst.object')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(fullBoard),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([fullBoard]),
            });
          }
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      } else {
        // List all boards
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MENU_BOARDS),
        });
      }
    } else {
      // POST/PATCH/DELETE - return success
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MENU_BOARDS[0]),
      });
    }
  });

  // Mock menu categories
  await page.route('**/rest/v1/menu_categories*', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET') {
      const boardMatch = url.match(/menu_board_id=eq\.([^&]+)/);
      if (boardMatch) {
        const filtered = MOCK_MENU_CATEGORIES.filter(
          (c) => c.menu_board_id === boardMatch[1]
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(filtered),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MENU_CATEGORIES),
        });
      }
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MENU_CATEGORIES[0]),
      });
    }
  });

  // Mock menu items
  await page.route('**/rest/v1/menu_items*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MENU_ITEMS),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MENU_ITEMS[0]),
      });
    }
  });

  // Mock effective limits
  await page.route('**/rest/v1/rpc/get_effective_limits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        max_screens: 50,
        max_storage_mb: 10240,
        max_users: 25,
        max_media: 500,
        max_playlists: 100,
        max_layouts: 50,
        max_schedules: 50,
        max_apps: 100,
        max_menu_boards: 20,
      }),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Apps & Menu Boards Screenshot Tests', () => {
  // =========================================================================
  // APP TESTS (APP-01 through APP-03)
  // =========================================================================

  test('APP-01: captures apps gallery page', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAppsMocking(page);

    // Navigate to Apps via SPA state routing
    await page.evaluate(() => window.__setCurrentPage('apps'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for gallery catalog cards to render (client-side, no API needed)
    await page.waitForTimeout(1500);

    // Full page screenshot of apps gallery
    await screenshotStep(page, '120', '06-apps-gallery', { fullPage: true });
  });

  test('APP-02: captures app detail modal', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAppsMocking(page);

    // Navigate to Apps
    await page.evaluate(() => window.__setCurrentPage('apps'));
    await waitForPageReady(page);
    await dismissAnyModals(page);
    await page.waitForTimeout(1500);

    // Click on the first app card in the gallery to open detail modal
    // AppCard is a <button> element
    const appCards = page.locator('button').filter({ has: page.locator('.aspect-square') });
    const firstCard = appCards.first();
    await firstCard.waitFor({ state: 'visible', timeout: 5000 });

    // Use dispatchEvent to bypass potential overlay interception
    await firstCard.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(800);

    // AppDetailModal uses .fixed.inset-0 overlay
    const modal = page.locator('.fixed.inset-0').last();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Screenshot the detail modal
    const modalContent = modal.locator('.bg-white.rounded-xl').first();
    await modalContent.screenshot({
      path: 'screenshots/120/120-07-apps-detail-modal-desktop.png',
    });
  });

  test('APP-03: captures app config save modal', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAppsMocking(page);

    // Navigate to Apps
    await page.evaluate(() => window.__setCurrentPage('apps'));
    await waitForPageReady(page);
    await dismissAnyModals(page);
    await page.waitForTimeout(1500);

    // Click on a catalog app card to open detail modal
    const appCards = page.locator('button').filter({ has: page.locator('.aspect-square') });
    const firstCard = appCards.first();
    await firstCard.waitFor({ state: 'visible', timeout: 5000 });
    await firstCard.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(800);

    // Click "Use App" button in the detail modal
    const useAppBtn = page.getByRole('button', { name: /use app/i });
    if (await useAppBtn.isVisible()) {
      await useAppBtn.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await page.waitForTimeout(1000);

      // Try to find the config modal that opens
      const configModal = page.locator('[role="dialog"]').last();
      if (await configModal.isVisible().catch(() => false)) {
        await configModal.screenshot({
          path: 'screenshots/120/120-08-apps-config-save-desktop.png',
        });
      } else {
        // Config modal might use .fixed.inset-0 pattern
        const fixedOverlay = page.locator('.fixed.inset-0').last();
        if (await fixedOverlay.isVisible().catch(() => false)) {
          const configContent = fixedOverlay.locator('.bg-white').first();
          await configContent.screenshot({
            path: 'screenshots/120/120-08-apps-config-save-desktop.png',
          });
        } else {
          // Fallback: capture full page showing whatever state we are in
          await screenshotStep(page, '120', '08-apps-config-save', { fullPage: true });
        }
      }
    } else {
      // Fallback: capture the detail modal itself as config
      await screenshotStep(page, '120', '08-apps-config-save', { fullPage: true });
    }
  });

  // =========================================================================
  // MENU BOARD TESTS (APP-04 through APP-08)
  // =========================================================================

  test('APP-04: captures menu boards list page', async ({ page }) => {
    await loginAndPrepare(page);
    await setupMenuBoardMocking(page);

    // Navigate to Menu Boards via sidebar
    await page.evaluate(() => window.__setCurrentPage('menu-boards'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for board cards to render
    await page.getByText('Lunch Menu').waitFor({ state: 'visible', timeout: 8000 });

    // Full page screenshot
    await screenshotStep(page, '120', '09-menu-boards-list', { fullPage: true });
  });

  test('APP-05: captures menu board editor with categories and items', async ({ page }) => {
    await loginAndPrepare(page);
    await setupMenuBoardMocking(page);

    // Navigate to Menu Boards
    await page.evaluate(() => window.__setCurrentPage('menu-boards'));
    await waitForPageReady(page);
    await dismissAnyModals(page);
    await page.getByText('Lunch Menu').waitFor({ state: 'visible', timeout: 8000 });

    // Hover to reveal action buttons, then click Edit
    const boardCard = page.locator('.group').filter({ hasText: 'Lunch Menu' }).first();
    await boardCard.hover();
    await page.waitForTimeout(300);

    // Click Edit button using dispatchEvent
    const editBtn = boardCard.getByTitle('Edit');
    await editBtn.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(1500);

    // Wait for editor modal (uses design system Modal with role="dialog")
    const dialog = page.locator('[role="dialog"]').last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // Screenshot the editor modal
    await dialog.screenshot({
      path: 'screenshots/120/120-10-menu-board-editor-desktop.png',
    });
  });

  test('APP-06: captures menu board item reorder state with drag handles', async ({ page }) => {
    await loginAndPrepare(page);
    await setupMenuBoardMocking(page);

    // Navigate and open editor
    await page.evaluate(() => window.__setCurrentPage('menu-boards'));
    await waitForPageReady(page);
    await dismissAnyModals(page);
    await page.getByText('Lunch Menu').waitFor({ state: 'visible', timeout: 8000 });

    const boardCard = page.locator('.group').filter({ hasText: 'Lunch Menu' }).first();
    await boardCard.hover();
    await page.waitForTimeout(300);
    const editBtn = boardCard.getByTitle('Edit');
    await editBtn.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(1500);

    const dialog = page.locator('[role="dialog"]').last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // Scroll down to Categories & Items section to show drag handles (GripVertical)
    // The categories section has category rows with GripVertical handles
    const categoriesSection = dialog.locator('text=Categories & Items').first();
    if (await categoriesSection.isVisible().catch(() => false)) {
      await categoriesSection.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(500);

    // Screenshot focusing on the categories/items area with drag handles
    await dialog.screenshot({
      path: 'screenshots/120/120-11-menu-board-reorder-desktop.png',
    });
  });

  test('APP-07: captures dietary/allergen tags on menu items', async ({ page }) => {
    await loginAndPrepare(page);
    await setupMenuBoardMocking(page);

    // Navigate and open editor
    await page.evaluate(() => window.__setCurrentPage('menu-boards'));
    await waitForPageReady(page);
    await dismissAnyModals(page);
    await page.getByText('Lunch Menu').waitFor({ state: 'visible', timeout: 8000 });

    const boardCard = page.locator('.group').filter({ hasText: 'Lunch Menu' }).first();
    await boardCard.hover();
    await page.waitForTimeout(300);
    const editBtn = boardCard.getByTitle('Edit');
    await editBtn.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(1500);

    const dialog = page.locator('[role="dialog"]').last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // Look for an item with dietary tags -- Caesar Salad has vegetarian + gluten-free
    // The dietary tag badges are small colored chips rendered inline
    // Find the first item row that has dietary tag badges and screenshot it
    const itemWithTags = dialog.locator('.border.border-gray-200.rounded-lg.p-3').filter({
      hasText: 'Caesar Salad',
    }).first();

    if (await itemWithTags.isVisible().catch(() => false)) {
      await itemWithTags.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await itemWithTags.screenshot({
        path: 'screenshots/120/120-12-menu-board-dietary-tags-desktop.png',
      });
    } else {
      // Fallback: screenshot the whole dialog showing items with tags
      await dialog.screenshot({
        path: 'screenshots/120/120-12-menu-board-dietary-tags-desktop.png',
      });
    }
  });

  test('APP-08: captures menu board theme and currency settings', async ({ page }) => {
    await loginAndPrepare(page);
    await setupMenuBoardMocking(page);

    // Navigate and open editor
    await page.evaluate(() => window.__setCurrentPage('menu-boards'));
    await waitForPageReady(page);
    await dismissAnyModals(page);
    await page.getByText('Lunch Menu').waitFor({ state: 'visible', timeout: 8000 });

    const boardCard = page.locator('.group').filter({ hasText: 'Lunch Menu' }).first();
    await boardCard.hover();
    await page.waitForTimeout(300);
    const editBtn = boardCard.getByTitle('Edit');
    await editBtn.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(1500);

    const dialog = page.locator('[role="dialog"]').last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // The Board Settings section at the top contains Theme selector, Currency Code,
    // Accent Color, and Page Interval -- screenshot that section
    const settingsSection = dialog.locator('text=Board Settings').first();
    if (await settingsSection.isVisible().catch(() => false)) {
      // Get the parent section element
      const section = settingsSection.locator('..').first();
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await section.screenshot({
        path: 'screenshots/120/120-13-menu-board-theme-settings-desktop.png',
      });
    } else {
      // Fallback: screenshot the top of the dialog showing settings
      await dialog.screenshot({
        path: 'screenshots/120/120-13-menu-board-theme-settings-desktop.png',
      });
    }
  });
});
