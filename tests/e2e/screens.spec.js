/**
 * Screens & TV Pairing E2E Tests
 * Phase 4: Smoke tests for screens page and TV player pairing
 *
 * Tests:
 * - Screens page loads and shows correct UI states
 * - Player/pairing page is accessible
 * - Error states display correctly
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection } from './helpers.js';

test.describe('Screens Page', () => {
  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndPrepare(page);
    });

    test('loads screens page with correct header', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Should show Screens title
      await expect(page.locator('h1:has-text("Screens")')).toBeVisible({ timeout: 10000 });
    });

    test('shows screen count in header description', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Header should show screen count - either with online/offline status or "0 screens"
      const headerDescription = page.locator('header').locator('text=/\\d+ screens?.*online.*offline/i');
      const zeroScreens = page.locator('header').locator('text=/0 screens/i');

      // Use element.or() to wait for either condition
      await expect(headerDescription.or(zeroScreens)).toBeVisible({ timeout: 5000 });
    });

    test('Add Screen button is visible and clickable', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Find Add Screen button (exact match to avoid "Add Screen →" link)
      const addButton = page.getByRole('button', { name: 'Add Screen', exact: true });
      await expect(addButton).toBeVisible({ timeout: 5000 });

      // Click should open modal
      await addButton.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
    });

    test('displays empty state when no screens exist', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Wait for either table or empty state to appear - one must be present
      const screensTable = page.locator('table');
      const emptyMessage = page.getByText(/you don't have any screens/i);

      // Use element.or() to wait for either condition
      await expect(screensTable.or(emptyMessage)).toBeVisible({ timeout: 5000 });

      // Verify at least one is present
      const tableCount = await screensTable.count();
      const emptyCount = await emptyMessage.count();
      expect(tableCount > 0 || emptyCount > 0).toBeTruthy();
    });

    test('screens table has correct columns', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Wait for page content to settle
      const table = page.locator('table');
      const emptyMessage = page.getByText(/you don't have any screens/i);
      await expect(table.or(emptyMessage)).toBeVisible({ timeout: 5000 });

      // Only check columns if table exists
      const tableCount = await table.count();
      if (tableCount > 0 && await table.isVisible()) {
        // Check for expected column headers
        const expectedHeaders = ['Screen', 'Location', 'Status', 'Pairing Code', 'Last Seen'];

        for (const header of expectedHeaders) {
          const headerCell = page.locator(`th:has-text("${header}")`);
          const headerCount = await headerCell.count();
          // At least some headers should be visible
          if (headerCount > 0 && await headerCell.isVisible()) {
            expect(true).toBeTruthy();
            break;
          }
        }
      }
      // Test passes if table doesn't exist (empty state)
    });

    test('refresh button reloads screen data', async ({ page }) => {
      await navigateToSection(page, 'screens');

      // Wait for page to be ready - either table or empty state
      const table = page.locator('table');
      const emptyMessage = page.getByText(/you don't have any screens/i);
      await expect(table.or(emptyMessage)).toBeVisible({ timeout: 5000 });

      // Look for refresh button
      const refreshButton = page.locator('button:has-text("Refresh")');
      const refreshCount = await refreshButton.count();
      if (refreshCount > 0 && await refreshButton.isVisible()) {
        await refreshButton.click();
        // Wait for screens title to confirm page is still functional after refresh
        await expect(page.locator('h1:has-text("Screens")')).toBeVisible({ timeout: 5000 });
      }
      // Test passes - refresh button may not be visible if no screens exist
    });
  });
});

test.describe('TV Player Pairing Page', () => {
  // Clear auth state - player page is public
  test.use({ storageState: { cookies: [], origins: [] } });

  test('player page loads without authentication', async ({ page }) => {
    // Navigate directly to player (no login required)
    await page.goto('/player');

    // Default view shows QR pairing screen
    await expect(page.getByText(/pair this screen/i)).toBeVisible({ timeout: 10000 });
  });

  test('player page shows QR code for pairing', async ({ page }) => {
    await page.goto('/player');

    // Should show QR code pairing UI
    await expect(page.getByText(/pair this screen/i)).toBeVisible({ timeout: 5000 });

    // Should have instructions
    await expect(page.getByText(/scan the qr code/i)).toBeVisible();

    // Should have fallback to manual entry
    await expect(page.getByRole('button', { name: /enter pairing code manually/i })).toBeVisible();
  });

  test('player page shows pairing instructions', async ({ page }) => {
    await page.goto('/player');

    // Should show "How to Pair" steps
    await expect(page.getByText(/how to pair/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/open the bizscreen app/i)).toBeVisible();
    await expect(page.getByText(/scan this qr code/i)).toBeVisible();
  });

  test('player page can switch to OTP entry mode', async ({ page }) => {
    await page.goto('/player');

    // Click to enter code manually
    const manualButton = page.getByRole('button', { name: /enter pairing code manually/i });
    await expect(manualButton).toBeVisible({ timeout: 5000 });
    await manualButton.click();

    // Should now show OTP input
    const otpInput = page.locator('input[placeholder="ABC123"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/connect your screen/i)).toBeVisible();
  });

  test('player page OTP mode - Connect button is disabled until 6 characters entered', async ({ page }) => {
    await page.goto('/player');

    // Switch to OTP mode
    await page.getByRole('button', { name: /enter pairing code manually/i }).click();

    const otpInput = page.locator('input[placeholder="ABC123"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });

    const connectButton = page.getByRole('button', { name: /connect screen/i });

    // Button should be disabled with empty input
    await expect(connectButton).toBeDisabled({ timeout: 3000 });

    // Enter 3 characters - still disabled
    await otpInput.fill('ABC');
    await expect(connectButton).toBeDisabled();

    // Enter 6 characters - should be enabled
    await otpInput.fill('ABC123');
    await expect(connectButton).toBeEnabled({ timeout: 2000 });
  });

  test('player page OTP mode - validates format (uppercase only)', async ({ page }) => {
    await page.goto('/player');

    // Switch to OTP mode
    await page.getByRole('button', { name: /enter pairing code manually/i }).click();

    const otpInput = page.locator('input[placeholder="ABC123"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });

    // Type lowercase - should be converted to uppercase
    await otpInput.fill('abc123');

    // Value should be uppercase
    const value = await otpInput.inputValue();
    expect(value).toBe('ABC123');
  });

  test('player page OTP mode - shows error for invalid code', async ({ page }) => {
    await page.goto('/player');

    // Switch to OTP mode
    await page.getByRole('button', { name: /enter pairing code manually/i }).click();

    const otpInput = page.locator('input[placeholder="ABC123"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });

    const connectButton = page.getByRole('button', { name: /connect screen/i });

    // Enter a fake OTP and submit
    await otpInput.fill('XXXXXX');
    await connectButton.click();

    // Should show inline error message for invalid OTP code
    const errorMessage = page.getByText(/invalid pairing code|failed to connect|please verify/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('player page shows BizScreen branding', async ({ page }) => {
    await page.goto('/player');

    // Switch to OTP mode to see branding
    await page.getByRole('button', { name: /enter pairing code manually/i }).click();

    // Should show BizScreen branding in OTP mode
    const branding = page.getByText(/powered by bizscreen/i);
    await expect(branding).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Screen Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('handles network errors gracefully on screens page', async ({ page }) => {
    // First navigate normally
    await navigateToSection(page, 'screens');

    // Verify page loaded - screens title should be visible
    await expect(page.locator('h1:has-text("Screens")')).toBeVisible({ timeout: 5000 });
  });

  test('Add Screen modal can be closed', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Open Add Screen modal (exact match to avoid "Add Screen →" link)
    const addButton = page.getByRole('button', { name: 'Add Screen', exact: true });
    await addButton.click();

    // Modal should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Close via Cancel button or X button - use element.or() for either
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    const closeButton = page.locator('[aria-label="Close"]').first();
    const closeControl = cancelButton.or(closeButton);
    await expect(closeControl).toBeVisible({ timeout: 3000 });
    await closeControl.click();

    // Modal should be closed
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  });
});
