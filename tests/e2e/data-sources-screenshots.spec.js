/**
 * Data Sources Screenshot Tests
 *
 * Captures screenshot evidence for data sources covering 5 DATA requirements:
 * - DATA-01: Data sources list page with source entries showing field/row counts
 * - DATA-02: Create modal with Internal Table type selected
 * - DATA-03: Create modal with CSV Import type and file upload field
 * - DATA-04: Google Sheets Link modal with URL and range fields
 * - DATA-05: Sync interval dropdown in Google Sheets Link modal
 *
 * Screenshots saved to screenshots/120/ using screenshotStep helper.
 * Step numbers: 01-05 for this plan.
 *
 * Uses page.route() to mock Supabase REST API for data sources.
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

const MOCK_DATA_SOURCES = [
  {
    id: 'ds-001',
    name: 'Product Catalog',
    type: 'internal_table',
    description: 'Main product data',
    field_count: 8,
    row_count: 145,
    refresh_interval: 300,
    last_synced_at: '2026-03-06T10:00:00Z',
    status: 'active',
    created_at: '2026-02-15T08:00:00Z',
    integration_type: 'google_sheets',
    integration_config: {
      sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
      range: 'Sheet1!A:Z',
      pollIntervalMinutes: 15,
    },
    last_sync_at: '2026-03-06T10:00:00Z',
    last_sync_status: 'ok',
  },
  {
    id: 'ds-002',
    name: 'Employee Directory',
    type: 'csv_import',
    description: 'HR data import',
    field_count: 5,
    row_count: 52,
    refresh_interval: 3600,
    last_synced_at: '2026-03-06T09:00:00Z',
    status: 'active',
    created_at: '2026-02-20T14:00:00Z',
    integration_type: null,
    integration_config: null,
  },
  {
    id: 'ds-003',
    name: 'Company News Feed',
    type: 'internal_table',
    description: 'RSS news ticker data',
    field_count: 4,
    row_count: 28,
    refresh_interval: 600,
    last_synced_at: '2026-03-06T11:00:00Z',
    status: 'active',
    created_at: '2026-03-01T09:00:00Z',
    integration_type: null,
    integration_config: null,
  },
  {
    id: 'ds-004',
    name: 'Menu Prices',
    type: 'internal_table',
    description: 'Manually maintained prices',
    field_count: 3,
    row_count: 15,
    refresh_interval: null,
    last_synced_at: null,
    status: 'active',
    created_at: '2026-03-03T16:00:00Z',
    integration_type: null,
    integration_config: null,
  },
];

// Detail data - shared fields/rows
const MOCK_FIELDS = [
  { id: 'f1', name: 'product_name', label: 'Product Name', data_type: 'text', position: 0, visible: true },
  { id: 'f2', name: 'price', label: 'Price', data_type: 'number', position: 1, visible: true },
  { id: 'f3', name: 'category', label: 'Category', data_type: 'text', position: 2, visible: true },
];

const MOCK_ROWS = [
  { id: 'r1', data: { product_name: 'Widget A', price: '29.99', category: 'Electronics' }, is_active: true },
  { id: 'r2', data: { product_name: 'Widget B', price: '49.99', category: 'Hardware' }, is_active: true },
];

// Detail with Google Sheets linked (for Product Catalog)
const MOCK_SOURCE_LINKED = {
  ...MOCK_DATA_SOURCES[0],
  fields: MOCK_FIELDS,
  rows: MOCK_ROWS,
};

// Detail without integration (for Menu Prices - shows "Link to Sheet" button)
const MOCK_SOURCE_UNLINKED = {
  ...MOCK_DATA_SOURCES[3],
  fields: MOCK_FIELDS,
  rows: MOCK_ROWS,
};

// ---------------------------------------------------------------------------
// Mocking Setup
// ---------------------------------------------------------------------------

async function setupDataSourceMocking(page) {
  // Mock list_data_sources RPC
  await page.route('**/rest/v1/rpc/list_data_sources*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DATA_SOURCES),
    });
  });

  // Mock data_sources table GET
  await page.route('**/rest/v1/data_sources*', (route) => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      // Single source detail
      if (url.includes('id=eq.')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([MOCK_SOURCE_LINKED]),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DATA_SOURCES),
        });
      }
    } else {
      route.continue();
    }
  });

  // Mock data_source_fields
  await page.route('**/rest/v1/data_source_fields*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FIELDS),
      });
    } else {
      route.continue();
    }
  });

  // Mock data_source_rows
  await page.route('**/rest/v1/data_source_rows*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROWS),
      });
    } else {
      route.continue();
    }
  });

  // Mock get_effective_limits RPC
  await page.route('**/rest/v1/rpc/get_effective_limits*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ max_data_sources: 10, max_screens: 50 }),
    });
  });

  // Mock get_data_source_with_data RPC (used when clicking a source)
  await page.route('**/rest/v1/rpc/get_data_source_with_data*', async (route) => {
    let body;
    try {
      body = JSON.parse(route.request().postData() || '{}');
    } catch {
      body = {};
    }
    // Return linked source for Product Catalog, unlinked for others
    const detail = (body.p_data_source_id === 'ds-001') ? MOCK_SOURCE_LINKED : MOCK_SOURCE_UNLINKED;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    });
  });

  // Mock sync history RPC
  await page.route('**/rest/v1/rpc/get_sync_history*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock data_source_sync_logs table
  await page.route('**/rest/v1/data_source_sync_logs*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Navigation Helper
// ---------------------------------------------------------------------------

async function navigateToDataSources(page) {
  await page.evaluate(() => window.__setCurrentPage('data-sources'));
  await waitForPageReady(page);
  await dismissAnyModals(page);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Data Sources Screenshot Tests', () => {
  test('DATA-01: captures data sources list page', async ({ page }) => {
    await loginAndPrepare(page);
    await setupDataSourceMocking(page);

    await navigateToDataSources(page);

    // Wait for list to render with mocked data
    await page.locator('text=Product Catalog').waitFor({ timeout: 5000 });

    await screenshotStep(page, '120', '01', 'data-sources-list', 'desktop');
  });

  test('DATA-02: captures create modal with Internal Table type', async ({ page }) => {
    await loginAndPrepare(page);
    await setupDataSourceMocking(page);

    await navigateToDataSources(page);
    await page.locator('text=Product Catalog').waitFor({ timeout: 5000 });

    // Click "New Data Source" button
    const createBtn = page.getByRole('button', { name: /new data source/i });
    try {
      await createBtn.click({ timeout: 3000 });
    } catch {
      await createBtn.dispatchEvent('click');
    }

    // Wait for the create modal to appear
    const modal = page.locator('[role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);

    // Internal Table is the default type - capture it
    await screenshotStep(page, '120', '02', 'data-sources-create-google-sheets', 'desktop');
  });

  test('DATA-03: captures CSV Import data source creation', async ({ page }) => {
    await loginAndPrepare(page);
    await setupDataSourceMocking(page);

    await navigateToDataSources(page);
    await page.locator('text=Product Catalog').waitFor({ timeout: 5000 });

    // Click "New Data Source" button
    const createBtn = page.getByRole('button', { name: /new data source/i });
    try {
      await createBtn.click({ timeout: 3000 });
    } catch {
      await createBtn.dispatchEvent('click');
    }

    // Wait for modal
    const modal = page.locator('[role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);

    // Select CSV Import type from the dropdown
    const typeSelect = modal.locator('select').first();
    await typeSelect.selectOption('csv_import');
    await page.waitForTimeout(300);

    await screenshotStep(page, '120', '03', 'data-sources-create-csv', 'desktop');
  });

  test('DATA-04: captures Google Sheets link modal', async ({ page }) => {
    await loginAndPrepare(page);
    await setupDataSourceMocking(page);

    await navigateToDataSources(page);
    await page.locator('text=Product Catalog').waitFor({ timeout: 5000 });

    // Click on a non-linked source to show detail panel with "Link to Sheet" button
    await page.locator('text=Menu Prices').first().click();
    await page.waitForTimeout(500);

    // Click "Link to Sheet" button in the detail panel
    const linkBtn = page.getByRole('button', { name: /link to sheet/i });
    try {
      await linkBtn.click({ timeout: 3000 });
    } catch {
      await linkBtn.dispatchEvent('click');
    }

    // Wait for link modal
    const modal = page.locator('[role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);

    await screenshotStep(page, '120', '04', 'data-sources-create-rss', 'desktop');
  });

  test('DATA-05: captures refresh interval settings', async ({ page }) => {
    await loginAndPrepare(page);
    await setupDataSourceMocking(page);

    await navigateToDataSources(page);
    await page.locator('text=Product Catalog').waitFor({ timeout: 5000 });

    // Click on a non-linked source to get the Link to Sheet button
    await page.locator('text=Menu Prices').first().click();
    await page.waitForTimeout(500);

    // Open Link to Google Sheets modal
    const linkBtn = page.getByRole('button', { name: /link to sheet/i });
    try {
      await linkBtn.click({ timeout: 3000 });
    } catch {
      await linkBtn.dispatchEvent('click');
    }

    // Wait for link modal
    const modal = page.locator('[role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);

    // The sync interval select is visible inside the modal
    // Open the select to show interval options
    const syncSelect = modal.locator('select').last();
    await syncSelect.focus();

    // Take screenshot showing the sync interval dropdown
    await screenshotStep(page, '120', '05', 'data-sources-refresh-interval', 'desktop');
  });
});
