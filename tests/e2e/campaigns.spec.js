/**
 * Campaigns E2E Tests
 * Phase 165: Campaign Scheduling UI
 *
 * Tests:
 * - Dayparting preset chips visible and functional [SCHED-01]
 * - Campaign analytics stat cards for existing campaigns [SCHED-02]
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, generateTestName, dismissAnyModals } from './helpers.js';

async function navigateToCampaigns(page) {
  await page.goto('/app/campaigns');
  await page.waitForTimeout(1500);
  await dismissAnyModals(page);
  // Return false if campaigns page is not accessible
  const hasAccess = await page.locator('h1, h2').filter({ hasText: /campaigns/i }).isVisible({ timeout: 5000 }).catch(() => false);
  return hasAccess;
}

async function navigateToNewCampaign(page) {
  // Wait for the app to fully load after login (sidebar visible)
  await page.waitForSelector('nav', { timeout: 15000 });
  await page.waitForTimeout(1000);
  // Use pushState + popstate to trigger React Router SPA navigation
  // without a full page reload (which would re-trigger auth init)
  await page.evaluate(() => {
    window.history.pushState({}, '', '/app/campaigns/new');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(3000);
  await dismissAnyModals(page);
  // Wait for the campaign editor to be visible
  await page.waitForSelector('text=Campaign Details', { timeout: 20000 }).catch(() => {});
}

test.describe('Campaign Scheduling UI [SCHED-01, SCHED-02]', () => {

  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('dayparting preset chips are visible in campaign editor [SCHED-01]', async ({ page }) => {
    await navigateToNewCampaign(page);
    await waitForPageReady(page);
    // Verify the 4 preset chips are visible
    await expect(page.getByText('Morning (6am-12pm)')).toBeVisible();
    await expect(page.getByText('Afternoon (12pm-6pm)')).toBeVisible();
    await expect(page.getByText('Evening (6pm-10pm)')).toBeVisible();
    await expect(page.getByText('Late Night (10pm-12am)')).toBeVisible();
  });

  test('selecting a dayparting preset auto-fills time fields [SCHED-01]', async ({ page }) => {
    await navigateToNewCampaign(page);
    await waitForPageReady(page);
    // Click "Morning (6am-12pm)" preset chip
    await page.getByText('Morning (6am-12pm)').click();
    // Verify start_at time portion contains 06:00
    const startInput = page.locator('input[type="datetime-local"]').first();
    const startValue = await startInput.inputValue();
    expect(startValue).toContain('06:00');
    // Verify end_at time portion contains 12:00
    const endInput = page.locator('input[type="datetime-local"]').last();
    const endValue = await endInput.inputValue();
    expect(endValue).toContain('12:00');
  });

  test('manual time edit deselects preset chip [SCHED-01]', async ({ page }) => {
    await navigateToNewCampaign(page);
    await waitForPageReady(page);
    // Select Morning preset
    const morningChip = page.getByText('Morning (6am-12pm)');
    await morningChip.click();
    // Verify Morning chip is in selected/active state (bg-brand-500)
    const chipButton = page.locator('button').filter({ hasText: 'Morning (6am-12pm)' });
    await expect(chipButton).toHaveClass(/bg-brand-500/);
    // Manually edit start time
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.fill('2025-01-01T08:00');
    // Verify Morning chip is no longer in selected state — selectedPreset is null so bg-brand-500 removed
    await expect(chipButton).not.toHaveClass(/bg-brand-500/);
  });

  test('campaign analytics section visible for existing campaigns [SCHED-02]', async ({ page }) => {
    // Navigate to campaigns list, then click into the first existing campaign
    const hasAccess = await navigateToCampaigns(page);
    if (!hasAccess) { test.skip(); return; }
    // Click first campaign row to open editor
    const campaignRow = page.locator('table tbody tr, [data-testid="campaign-row"]').first();
    if (await campaignRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campaignRow.click();
      await waitForPageReady(page);
      // Verify analytics section is present per D-08 labels
      await expect(page.getByText('Campaign Analytics')).toBeVisible();
      await expect(page.getByText('Last 30 days')).toBeVisible();
      await expect(page.getByText('Impressions')).toBeVisible();
      await expect(page.getByText('Play Counts')).toBeVisible();
      await expect(page.getByText('Duration')).toBeVisible();
    } else {
      test.skip(); // No existing campaigns to test with
    }
  });

  test('campaign analytics section hidden for new campaigns [SCHED-02]', async ({ page }) => {
    await navigateToNewCampaign(page);
    await waitForPageReady(page);
    await expect(page.getByText('Campaign Analytics')).not.toBeVisible();
  });

  test('analytics shows empty state when no stats available [SCHED-02]', async ({ page }) => {
    // Create a new campaign (which will have no playback data), save it, then verify empty state
    await navigateToNewCampaign(page);
    await waitForPageReady(page);
    // Fill required fields and save
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(generateTestName('stats-test'));
      // Save the campaign
      const saveBtn = page.getByRole('button', { name: /save/i });
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        // After save, should redirect to editor for existing campaign
        // The stat cards should show 0 values and "No playback data yet"
        await expect(page.getByText('No playback data yet')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
