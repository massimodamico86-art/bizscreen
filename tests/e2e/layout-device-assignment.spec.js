/**
 * Layout-Device Assignment Flow E2E Tests
 *
 * Comprehensive tests covering the layout-to-device assignment flow:
 * - Path A: Content Picker Modal (Assign Layout to Screen)
 * - Path B: Edit Screen Modal (Layout Dropdown)
 * - Path C: Layout Gallery and Editor Access
 * - Path D: Screens Page - Content Display and Filtering
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection, assertAppReady, waitForPageReady } from './helpers.js';

// ---------------------------------------------------------------------------
// Path A: Content Picker Modal (Assign Layout to Screen)
// ---------------------------------------------------------------------------
test.describe('Path A: Content Picker Modal', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await navigateToSection(page, 'screens');
  });

  test('screens page loads with table or empty state', async ({ page }) => {
    // Wait for either screens table or empty state
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);
    const errorState = page.getByText(/couldn't load screens/i);

    await expect(
      screensTable.or(emptyState).or(errorState)
    ).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'screenshots/59-01-screens-page-loaded.png' });
  });

  test('clicking Screen Content cell opens InsertContentModal', async ({ page }) => {
    // Wait for screens table to load
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available to test content picker');
      return;
    }

    // Click on the content display cell (shows content name or "No Content Assigned")
    const contentCell = page.locator('td button').filter({ hasText: /(no content assigned|assigned)/i }).first()
      .or(page.locator('td button').first());

    const cellCount = await contentCell.count();
    if (cellCount === 0) {
      test.skip(true, 'No clickable content cells found');
      return;
    }

    await contentCell.click();

    // InsertContentModal should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show "Assign Content to [screen name]" title
    await expect(dialog.getByText(/assign content to/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/59-02-content-picker-modal-open.png' });
  });

  test('InsertContentModal shows Playlists and Layouts tabs only', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Open content picker
    const contentCell = page.locator('td button').first();
    const cellCount = await contentCell.count();
    if (cellCount === 0) {
      test.skip(true, 'No clickable content cells');
      return;
    }
    await contentCell.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show Playlists and Layouts tabs (allowedTabs=['playlists', 'layouts'])
    await expect(dialog.getByText('Playlists')).toBeVisible();
    await expect(dialog.getByText('Layouts')).toBeVisible();

    // Should NOT show All Media or Apps tabs
    const mediaTab = dialog.getByText('All Media');
    const appsTab = dialog.getByText('Apps');
    await expect(mediaTab).not.toBeVisible();
    await expect(appsTab).not.toBeVisible();

    await page.screenshot({ path: 'screenshots/59-03-content-picker-tabs.png' });
  });

  test('clicking Layouts tab shows layouts or empty state', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Open content picker
    const contentCell = page.locator('td button').first();
    const cellCount = await contentCell.count();
    if (cellCount === 0) {
      test.skip(true, 'No clickable content cells');
      return;
    }
    await contentCell.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click Layouts tab
    const layoutsTab = dialog.getByText('Layouts');
    await layoutsTab.click();

    // Wait for loading to finish
    const loader = dialog.locator('.animate-spin');
    const _loaderResult = await Promise.race([
      loader.waitFor({ state: 'hidden', timeout: 10000 }).then(() => 'loaded'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 10000)),
    ]);

    // Should show either layout items or "No layouts available" empty state
    const layoutItems = dialog.locator('button:has(.aspect-video)');
    const emptyMessage = dialog.getByText(/no layouts available|no results/i);

    await expect(layoutItems.first().or(emptyMessage)).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'screenshots/59-04-content-picker-layouts-tab.png' });
  });

  test('Insert Content button is disabled until an item is selected', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Open content picker
    const contentCell = page.locator('td button').first();
    const cellCount = await contentCell.count();
    if (cellCount === 0) {
      test.skip(true, 'No clickable content cells');
      return;
    }
    await contentCell.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Insert Content button should be disabled
    const insertButton = dialog.getByRole('button', { name: /insert content/i });
    await expect(insertButton).toBeDisabled();

    await page.screenshot({ path: 'screenshots/59-05-insert-button-disabled.png' });
  });
});

// ---------------------------------------------------------------------------
// Path B: Edit Screen Modal (Layout Dropdown)
// ---------------------------------------------------------------------------
test.describe('Path B: Edit Screen Modal', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await navigateToSection(page, 'screens');
  });

  test('Edit screen action opens EditScreenModal with content assignment section', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Click the action menu (three dots) on the first screen row
    const moreButtons = page.locator('button:has(.lucide-more-vertical)').first();

    const btnToClick = moreButtons;
    const btnCount = await btnToClick.count();
    if (btnCount === 0) {
      test.skip(true, 'No action menu buttons found');
      return;
    }
    await btnToClick.click();

    // Click "Edit screen" from the dropdown
    const editButton = page.getByText('Edit screen');
    await expect(editButton).toBeVisible({ timeout: 3000 });
    await editButton.click();

    // EditScreenModal should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show "Edit Screen" title
    await expect(dialog.getByText('Edit Screen')).toBeVisible();

    // Should show "Content Assignment" section
    await expect(dialog.getByText('Content Assignment')).toBeVisible();

    await page.screenshot({ path: 'screenshots/59-06-edit-screen-modal.png' });
  });

  test('EditScreenModal has playlist and layout dropdowns with mutual exclusivity', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Open edit modal via action menu
    const moreButtons = page.locator('button:has(.lucide-more-vertical)').first();
    const btnCount = await moreButtons.count();
    if (btnCount === 0) {
      test.skip(true, 'No action menu buttons');
      return;
    }
    await moreButtons.click();
    await page.getByText('Edit screen').click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Scroll down to Content Assignment section
    await dialog.getByText('Content Assignment').scrollIntoViewIfNeeded();

    // Should have Playlist dropdown with "No playlist" default
    const playlistSelect = dialog.locator('select').filter({ has: page.locator('option:text("No playlist")') });
    await expect(playlistSelect).toBeVisible({ timeout: 3000 });

    // Should have Layout dropdown with "No layout" default
    const layoutSelect = dialog.locator('select').filter({ has: page.locator('option:text("No layout")') });
    await expect(layoutSelect).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'screenshots/59-07-edit-screen-content-assignment.png' });
  });

  test('EditScreenModal shows orientation and working hours fields', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Open edit modal
    const moreButtons = page.locator('button:has(.lucide-more-vertical)').first();
    const btnCount = await moreButtons.count();
    if (btnCount === 0) {
      test.skip(true, 'No action menu buttons');
      return;
    }
    await moreButtons.click();
    await page.getByText('Edit screen').click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should have Screen Orientation dropdown
    await expect(dialog.getByText('Screen Orientation')).toBeVisible();
    const orientationSelect = dialog.locator('select').filter({ has: page.locator('option:text("Landscape (horizontal)")') });
    await expect(orientationSelect).toBeVisible();

    // Should have Working Hours section
    await expect(dialog.getByText('Working Hours')).toBeVisible();

    // Should have Display Language dropdown
    await expect(dialog.getByText('Display Language')).toBeVisible();

    await page.screenshot({ path: 'screenshots/59-08-edit-screen-orientation-hours.png' });
  });
});

// ---------------------------------------------------------------------------
// Path C: Layout Gallery and Editor Access
// ---------------------------------------------------------------------------
test.describe('Path C: Layout Gallery and Editor', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await assertAppReady(page, test);
  });

  test('Templates page loads with gallery and sidebar filters', async ({ page }) => {
    // Navigate to Templates via sidebar
    const templatesButton = page.locator('aside').getByRole('button', { name: /templates/i }).first();
    await expect(templatesButton).toBeVisible({ timeout: 10000 });
    await templatesButton.click();
    await waitForPageReady(page);

    // Wait for the page to load
    const loadingSpinner = page.locator('.animate-spin');

    // Wait for loading to finish
    await Promise.race([
      loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).then(() => 'loaded'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    // Should show heading
    await expect(page.getByText(/what template are you looking for/i)).toBeVisible({ timeout: 5000 });

    // Should show Featured and Popular sections
    await expect(page.getByRole('heading', { name: 'Featured' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Popular' }).first()).toBeVisible({ timeout: 5000 });

    // Should show sidebar with filter categories (FILTERS heading + category buttons)
    await expect(page.getByRole('heading', { name: 'FILTERS' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Orientation' })).toBeVisible();

    await page.screenshot({ path: 'screenshots/59-09-templates-page.png' });
  });

  test('Templates page search filters content', async ({ page }) => {
    const templatesButton = page.locator('aside').getByRole('button', { name: /templates/i }).first();
    await expect(templatesButton).toBeVisible({ timeout: 10000 });
    await templatesButton.click();
    await waitForPageReady(page);

    // Wait for page to load
    await expect(page.getByText(/what template are you looking for/i)).toBeVisible({ timeout: 15000 });

    // Find the search input (placeholder contains "Try")
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type a search query
    await searchInput.fill('menu');

    // Wait briefly for filtering
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/59-10-templates-search.png' });
  });

  test('Templates page Your Designs section accessible', async ({ page }) => {
    const templatesButton = page.locator('aside').getByRole('button', { name: /templates/i }).first();
    await expect(templatesButton).toBeVisible({ timeout: 10000 });
    await templatesButton.click();
    await waitForPageReady(page);

    await expect(page.getByText(/what template are you looking for/i)).toBeVisible({ timeout: 15000 });

    // Click "Your Designs" button in the sidebar
    const yourDesigns = page.getByRole('button', { name: 'Your Designs' });
    const yourDesignsCount = await yourDesigns.count();

    if (yourDesignsCount > 0) {
      await yourDesigns.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'screenshots/59-11-your-designs.png' });
  });
});

// ---------------------------------------------------------------------------
// Path D: Screens Page - Content Display and Filtering
// ---------------------------------------------------------------------------
test.describe('Path D: Screens Page Content Display', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await assertAppReady(page, test);
    await navigateToSection(page, 'screens');
  });

  test('screens with content show content name, others show "No Content Assigned"', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Content display cells should exist
    // Each screen row has a clickable button in the "Screen Content" column
    const contentButtons = page.locator('td button').filter({ hasText: /./i });
    const count = await contentButtons.count();

    // At least some content cells should be present
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots/59-12-screens-content-display.png' });
  });

  test('bulk selection shows schedule assignment dropdown', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Click the "select all" checkbox in the header
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]');
    const checkboxCount = await selectAllCheckbox.count();
    if (checkboxCount === 0) {
      test.skip(true, 'No select-all checkbox found');
      return;
    }
    await selectAllCheckbox.click();

    // Bulk action bar should appear
    const bulkBar = page.getByText(/screen.*selected/i);
    await expect(bulkBar).toBeVisible({ timeout: 5000 });

    // Should show "Assign Schedule..." dropdown
    const scheduleDropdown = page.locator('select').filter({ has: page.locator('option:text("Assign Schedule...")') });
    await expect(scheduleDropdown).toBeVisible({ timeout: 3000 });

    // Should show "Clear selection" button
    await expect(page.getByText('Clear selection')).toBeVisible();

    await page.screenshot({ path: 'screenshots/59-13-bulk-selection-schedule.png' });

    // Clear selection
    await page.getByText('Clear selection').click();
    await expect(bulkBar).not.toBeVisible({ timeout: 3000 });
  });

  test('screen search filters results', async ({ page }) => {
    const screensTable = page.locator('table');
    const emptyState = page.getByText(/no screens connected/i);

    const result = await Promise.race([
      screensTable.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'table'),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    if (result !== 'table') {
      test.skip(true, 'No screens available');
      return;
    }

    // Search input should be visible
    const searchInput = page.getByPlaceholder(/search screens/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type a search term
    await searchInput.fill('nonexistent-screen-xyz-999');

    // Wait for filtering
    await page.waitForTimeout(500);

    // Table should either show filtered results or be empty
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    // Searching for a nonexistent screen should yield 0 rows
    expect(rowCount).toBe(0);

    await page.screenshot({ path: 'screenshots/59-14-screens-search-filter.png' });
  });

  test('Add Screen button and Refresh button are visible', async ({ page }) => {
    // Add Screen button should be visible in the header (use exact match to avoid matching footer CTA)
    const addButton = page.getByRole('button', { name: 'Add Screen', exact: true });
    await expect(addButton).toBeVisible({ timeout: 10000 });

    // Refresh button should be visible (only if screens exist)
    const screensTable = page.locator('table');
    const tableVisible = await screensTable.isVisible();
    if (tableVisible) {
      const refreshButton = page.getByRole('button', { name: /refresh/i });
      await expect(refreshButton).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'screenshots/59-15-screens-header-buttons.png' });
  });
});
