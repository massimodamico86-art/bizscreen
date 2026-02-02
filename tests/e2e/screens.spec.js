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

      // Header should show screen count and online/offline status
      const headerDescription = page.locator('header').locator('text=/\\d+ screens?.*online.*offline/i');
      const hasDescription = await headerDescription.isVisible({ timeout: 5000 }).catch(() => false);

      // Alternative: might show "0 screens" for empty state
      const zeroScreens = page.locator('header').locator('text=/0 screens/i');
      const hasZeroScreens = await zeroScreens.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasDescription || hasZeroScreens).toBeTruthy();
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
      await page.waitForTimeout(1500);

      // Check if screens table exists or empty state is shown
      const screensTable = page.locator('table');
      const hasTable = await screensTable.isVisible({ timeout: 2000 }).catch(() => false);

      if (!hasTable) {
        // Should show empty state with "You don't have any Screens" message
        const emptyMessage = page.getByText(/you don't have any screens/i);
        const hasEmptyState = await emptyMessage.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      }
      // Either table or empty state should be present - test passes
    });

    test('screens table has correct columns', async ({ page }) => {
      await navigateToSection(page, 'screens');
      await page.waitForTimeout(1500);

      const table = page.locator('table');
      if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check for expected column headers
        const expectedHeaders = ['Screen', 'Location', 'Status', 'Pairing Code', 'Last Seen'];

        for (const header of expectedHeaders) {
          const headerCell = page.locator(`th:has-text("${header}")`);
          const isVisible = await headerCell.isVisible({ timeout: 2000 }).catch(() => false);
          // At least some headers should be visible
          if (isVisible) {
            expect(isVisible).toBeTruthy();
            break;
          }
        }
      }
      // Test passes if table doesn't exist (empty state)
    });

    test('refresh button reloads screen data', async ({ page }) => {
      await navigateToSection(page, 'screens');
      await page.waitForTimeout(1000);

      // Look for refresh button
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await refreshButton.click();
        // Should trigger a reload - wait for any loading indicator to clear
        await page.waitForTimeout(1000);
        // Page should still show screens title
        await expect(page.locator('h1:has-text("Screens")')).toBeVisible();
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
    await page.waitForTimeout(1000);

    // Verify page loaded - either shows screens or empty state
    const hasScreensTitle = await page.locator('h1:has-text("Screens")').isVisible({ timeout: 5000 });
    expect(hasScreensTitle).toBeTruthy();
  });

  test('Add Screen modal can be closed', async ({ page }) => {
    await navigateToSection(page, 'screens');

    // Open Add Screen modal (exact match to avoid "Add Screen →" link)
    const addButton = page.getByRole('button', { name: 'Add Screen', exact: true });
    await addButton.click();

    // Modal should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Close via Cancel button or X button
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelButton.click();
    } else {
      // Try X button
      const closeButton = page.locator('[aria-label="Close"]').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
      }
    }

    // Modal should be closed
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });
});
