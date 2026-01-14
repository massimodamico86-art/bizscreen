/**
 * Client Dashboard Flows - Real User Experience Tests
 *
 * These tests reproduce the exact flows a real client user would perform
 * in the browser for Playlists, Layouts, Schedules, and Locations.
 */
import { test, expect } from '@playwright/test';

const CLIENT_EMAIL = process.env.TEST_USER_EMAIL || 'client@bizscreen.test';
const CLIENT_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestClient123!';

// Collect all console errors and network failures
const errors = [];
const networkFailures = [];

test.describe('Client Dashboard Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Clear error collectors
    errors.length = 0;
    networkFailures.length = 0;

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({ type: 'console', text: msg.text() });
      }
    });

    // Listen for page errors
    page.on('pageerror', err => {
      errors.push({ type: 'pageerror', text: err.message });
    });

    // Listen for failed requests
    page.on('requestfailed', request => {
      networkFailures.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });

    // Listen for response errors (4xx, 5xx)
    page.on('response', response => {
      if (response.status() >= 400) {
        networkFailures.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Login as client user
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Skip welcome modal if shown
    await page.evaluate(() => {
      localStorage.setItem('bizscreen_welcome_modal_dismissed', 'true');
      localStorage.setItem('bizscreen_onboarding_completed', 'true');
    });

    await page.fill('input[type="email"]', CLIENT_EMAIL);
    await page.fill('input[type="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL(/\/(app|dashboard)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log errors for debugging
    if (errors.length > 0) {
      console.log(`\n=== ERRORS for ${testInfo.title} ===`);
      errors.forEach(e => console.log(`  ${e.type}: ${e.text}`));
    }
    if (networkFailures.length > 0) {
      console.log(`\n=== NETWORK FAILURES for ${testInfo.title} ===`);
      networkFailures.forEach(f => console.log(`  ${f.status || 'FAILED'}: ${f.url}`));
    }

    // Take screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/client-flow-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }
  });

  // ============================================================================
  // PLAYLISTS FLOW
  // ============================================================================
  test.describe('Playlists Flow', () => {

    test('1. Navigate to Playlists page', async ({ page }) => {
      // Click on Playlists in sidebar
      await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
      await page.waitForLoadState('networkidle');

      // Verify we're on the Playlists page
      await expect(page.locator('h1, h2').filter({ hasText: /playlists/i }).first()).toBeVisible({ timeout: 10000 });

      // Take screenshot of current state
      await page.screenshot({ path: 'test-results/playlists-page.png', fullPage: true });

      // Check for critical errors (ignore 400s from feature flag/subscription lookups)
      const criticalErrors = errors.filter(e =>
        !e.text.includes('favicon') &&
        !e.text.includes('400') &&
        !e.text.includes('Failed to load resource')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('2. Open Add Playlist modal', async ({ page }) => {
      await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
      await page.waitForLoadState('networkidle');

      // Click Add Playlist button (use first one - in header)
      const addButton = page.locator('button').filter({ hasText: /add playlist/i }).first();
      await expect(addButton).toBeVisible({ timeout: 5000 });
      await addButton.click();

      // Wait for modal
      await page.waitForTimeout(500);

      // Check if modal opened - look for modal content
      const modal = page.locator('[role="dialog"], .fixed.inset-0, div:has(> h2:has-text("New Playlist")), div:has(> h2:has-text("Create Playlist"))');
      const modalVisible = await modal.isVisible().catch(() => false);

      await page.screenshot({ path: 'test-results/playlists-add-modal.png', fullPage: true });

      console.log('Add Playlist modal visible:', modalVisible);

      // Log what we see
      const pageContent = await page.content();
      if (pageContent.includes('Blank Playlist') || pageContent.includes('Template')) {
        console.log('Choice modal appeared (Blank vs Template)');
      }
    });

    test('3. Create a new playlist', async ({ page }) => {
      await page.click('button:has-text("Playlists"), a:has-text("Playlists")');
      await page.waitForLoadState('networkidle');

      // Click Add Playlist
      await page.click('button:has-text("Add Playlist")');
      await page.waitForTimeout(500);

      // If there's a choice modal (Blank vs Template), choose Blank
      const blankOption = page.locator('button:has-text("Blank Playlist")');
      if (await blankOption.isVisible().catch(() => false)) {
        await blankOption.click();
        await page.waitForTimeout(500);
      }

      // Fill in playlist name
      const nameInput = page.locator('input[placeholder*="name"], input[name="name"], input:near(:text("Name"))').first();
      await nameInput.fill('Test Playlist E2E');

      // Fill in description if visible
      const descInput = page.locator('textarea, input[name="description"]').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('Created by E2E test');
      }

      await page.screenshot({ path: 'test-results/playlists-create-form.png', fullPage: true });

      // Click Create/Save button
      const createBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').last();
      await createBtn.click();

      // Wait for navigation or success
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/playlists-after-create.png', fullPage: true });

      // Check for errors
      const criticalErrors = errors.filter(e =>
        !e.text.includes('favicon') &&
        !e.text.includes('401') // Ignore auth refresh errors
      );
      console.log('Errors after create:', criticalErrors);
      console.log('Network failures:', networkFailures);
    });
  });

  // ============================================================================
  // LAYOUTS FLOW
  // ============================================================================
  test.describe('Layouts Flow', () => {

    test('1. Navigate to Layouts page', async ({ page }) => {
      await page.click('button:has-text("Layouts"), a:has-text("Layouts")');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1, h2').filter({ hasText: /layouts/i }).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/layouts-page.png', fullPage: true });

      expect(errors.filter(e => !e.text.includes('favicon'))).toHaveLength(0);
    });

    test('2. Create a new layout', async ({ page }) => {
      await page.click('button:has-text("Layouts"), a:has-text("Layouts")');
      await page.waitForLoadState('networkidle');

      // Click Add Layout
      await page.click('button:has-text("Add Layout")');
      await page.waitForTimeout(500);

      // If there's a choice modal, choose Blank
      const blankOption = page.locator('button:has-text("Blank Layout")');
      if (await blankOption.isVisible().catch(() => false)) {
        await blankOption.click();
        await page.waitForTimeout(500);
      }

      // Fill in layout name
      const nameInput = page.locator('input[placeholder*="name"], input[name="name"], input:near(:text("Name"))').first();
      await nameInput.fill('Test Layout E2E');

      await page.screenshot({ path: 'test-results/layouts-create-form.png', fullPage: true });

      // Click Create/Save button
      const createBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').last();
      await createBtn.click();

      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/layouts-after-create.png', fullPage: true });

      console.log('Errors after layout create:', errors);
      console.log('Network failures:', networkFailures);
    });
  });

  // ============================================================================
  // SCHEDULES FLOW
  // ============================================================================
  test.describe('Schedules Flow', () => {

    test('1. Navigate to Schedules page', async ({ page }) => {
      await page.click('button:has-text("Schedules"), a:has-text("Schedules")');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1, h2').filter({ hasText: /schedules/i }).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/schedules-page.png', fullPage: true });

      expect(errors.filter(e => !e.text.includes('favicon'))).toHaveLength(0);
    });

    test('2. Create a new schedule', async ({ page }) => {
      await page.click('button:has-text("Schedules"), a:has-text("Schedules")');
      await page.waitForLoadState('networkidle');

      // Click Add Schedule (use first one)
      const addBtn = page.locator('button:has-text("Add Schedule")').first();
      await expect(addBtn).toBeVisible({ timeout: 5000 });
      await addBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'test-results/schedules-add-modal.png', fullPage: true });

      // Fill in schedule name
      const nameInput = page.locator('input[placeholder*="name"], input[name="name"], input:near(:text("Name"))').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Schedule E2E');
      }

      await page.screenshot({ path: 'test-results/schedules-create-form.png', fullPage: true });

      // Click Create/Save button
      const createBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').last();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
      }

      await page.screenshot({ path: 'test-results/schedules-after-create.png', fullPage: true });

      console.log('Errors after schedule create:', errors);
      console.log('Network failures:', networkFailures);
    });
  });

  // ============================================================================
  // LOCATIONS FLOW
  // ============================================================================
  test.describe('Locations Flow', () => {

    test('1. Navigate to Locations page', async ({ page }) => {
      await page.click('button:has-text("Locations"), a:has-text("Locations")');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1, h2').filter({ hasText: /locations/i }).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/locations-page.png', fullPage: true });

      expect(errors.filter(e => !e.text.includes('favicon'))).toHaveLength(0);
    });

    test('2. Create a new location', async ({ page }) => {
      await page.click('button:has-text("Locations"), a:has-text("Locations")');
      await page.waitForLoadState('networkidle');

      // Click Add Location
      const addBtn = page.locator('button:has-text("Add Location")');
      await expect(addBtn).toBeVisible({ timeout: 5000 });
      await addBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'test-results/locations-add-modal.png', fullPage: true });

      // Fill in location name
      const nameInput = page.locator('input[placeholder*="name"], input[name="name"], input:near(:text("Name"))').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Location E2E');
      }

      // Fill in city if visible
      const cityInput = page.locator('input[placeholder*="city"], input[name="city"]').first();
      if (await cityInput.isVisible().catch(() => false)) {
        await cityInput.fill('Test City');
      }

      await page.screenshot({ path: 'test-results/locations-create-form.png', fullPage: true });

      // Click Create/Save button
      const createBtn = page.locator('button[type="submit"], button:has-text("Add Location"), button:has-text("Save")').last();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
      }

      await page.screenshot({ path: 'test-results/locations-after-create.png', fullPage: true });

      console.log('Errors after location create:', errors);
      console.log('Network failures:', networkFailures);
    });
  });
});
