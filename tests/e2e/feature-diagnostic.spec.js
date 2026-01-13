/**
 * Feature Diagnostic Tests
 * Systematically tests each client dashboard feature to identify issues
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, navigateToSection, dismissAnyModals } from './helpers.js';

const CLIENT_EMAIL = 'client@bizscreen.test';
const CLIENT_PASSWORD = 'TestClient123!';

// Run tests serially to avoid resource contention
test.describe.configure({ mode: 'serial' });

// Helper to collect errors
function setupErrorCollection(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('manifest') && !text.includes('ResizeObserver')) {
        errors.push({ type: 'console', text });
      }
    }
  });
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', text: err.message });
  });
  return errors;
}

test.describe('Feature Diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    });
  });

  test('1. Media Library - Access and Upload', async ({ page }) => {
    const errors = setupErrorCollection(page);

    // Navigate to Media Library
    await navigateToSection(page, 'media');
    await page.waitForTimeout(1000);

    console.log('=== MEDIA LIBRARY ===');

    // Check page heading
    const heading = await page.locator('h1').textContent().catch(() => 'No heading');
    console.log('Page heading:', heading);

    // Try to click Add Media
    const addButton = page.getByRole('button', { name: /add media/i });
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Add Media button found, clicking...');
      await addButton.click();
      await page.waitForTimeout(1000);

      // Check what modal/UI appears
      const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log('Modal appeared:', modalVisible);

      if (modalVisible) {
        const modalText = await page.locator('[role="dialog"]').textContent().catch(() => '');
        console.log('Modal content preview:', modalText?.substring(0, 300));

        // Check for Cloudinary error
        if (modalText?.toLowerCase().includes('cloudinary') || modalText?.toLowerCase().includes('not configured')) {
          console.log('ISSUE FOUND: Cloudinary configuration issue detected');
        }
      }
    } else {
      console.log('Add Media button NOT visible');
    }

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }

    await page.screenshot({ path: 'test-results/diagnostic-media.png', fullPage: true });
  });

  test('2. Playlists - List and Create', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await navigateToSection(page, 'playlists');
    await page.waitForTimeout(1000);

    console.log('=== PLAYLISTS ===');

    const heading = await page.locator('h1').textContent().catch(() => 'No heading');
    console.log('Page heading:', heading);

    // Check for playlist list
    const listItems = await page.locator('table tbody tr, [class*="card"], [class*="list-item"]').count();
    console.log('List items found:', listItems);

    // Try create
    const createButton = page.getByRole('button', { name: /create|new playlist/i }).first();
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Create button found, clicking...');
      await createButton.click();
      await page.waitForTimeout(1000);

      const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log('Modal appeared:', modalVisible);
    } else {
      console.log('Create button NOT visible');
    }

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }

    await page.screenshot({ path: 'test-results/diagnostic-playlists.png', fullPage: true });
  });

  test('3. Layouts - List and Create', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await navigateToSection(page, 'layouts');
    await page.waitForTimeout(1000);

    console.log('=== LAYOUTS ===');

    const heading = await page.locator('h1').textContent().catch(() => 'No heading');
    console.log('Page heading:', heading);

    const listItems = await page.locator('table tbody tr, [class*="card"], [class*="layout"]').count();
    console.log('Layout items found:', listItems);

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }

    await page.screenshot({ path: 'test-results/diagnostic-layouts.png', fullPage: true });
  });

  test('4. Schedules - List and Create', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await navigateToSection(page, 'schedules');
    await page.waitForTimeout(1000);

    console.log('=== SCHEDULES ===');

    const heading = await page.locator('h1').textContent().catch(() => 'No heading');
    console.log('Page heading:', heading);

    const listItems = await page.locator('table tbody tr, [class*="card"], [class*="schedule"]').count();
    console.log('Schedule items found:', listItems);

    // Try create
    const createButton = page.getByRole('button', { name: /create|new schedule/i }).first();
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Create button found');
    } else {
      console.log('Create button NOT visible');
    }

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }

    await page.screenshot({ path: 'test-results/diagnostic-schedules.png', fullPage: true });
  });

  test('5. Screens - List and Add', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await navigateToSection(page, 'screens');
    await page.waitForTimeout(1000);

    console.log('=== SCREENS ===');

    const heading = await page.locator('h1').textContent().catch(() => 'No heading');
    console.log('Page heading:', heading);

    const listItems = await page.locator('table tbody tr, [class*="card"], [class*="screen"]').count();
    console.log('Screen items found:', listItems);

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }

    await page.screenshot({ path: 'test-results/diagnostic-screens.png', fullPage: true });
  });

  test('6. Dashboard Quick Actions', async ({ page }) => {
    const errors = setupErrorCollection(page);

    // Already on dashboard after login
    await waitForPageReady(page);

    console.log('=== DASHBOARD QUICK ACTIONS ===');

    // Check Quick Actions section
    const quickActions = page.locator('text=Quick Actions');
    if (await quickActions.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Quick Actions section found');

      // List all quick action buttons
      const actionButtons = await page.locator('button:near(:text("Quick Actions"))').allTextContents();
      console.log('Action buttons:', actionButtons);
    }

    // Try clicking Add Screen quick action
    const addScreenBtn = page.getByRole('button', { name: /add screen/i }).first();
    if (await addScreenBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Add Screen button found, clicking...');
      await addScreenBtn.click();
      await page.waitForTimeout(1000);

      const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log('Modal appeared:', modalVisible);

      if (modalVisible) {
        await dismissAnyModals(page);
      }
    }

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }

    await page.screenshot({ path: 'test-results/diagnostic-dashboard.png', fullPage: true });
  });

  test('7. Check all sidebar navigation items', async ({ page }) => {
    const errors = setupErrorCollection(page);

    console.log('=== SIDEBAR NAVIGATION ===');

    // Get all sidebar buttons
    const sidebar = page.locator('aside');
    const buttons = await sidebar.locator('button').allTextContents();
    console.log('Sidebar buttons:', buttons);

    if (errors.length > 0) {
      console.log('Console errors:', JSON.stringify(errors, null, 2));
    }
  });
});
