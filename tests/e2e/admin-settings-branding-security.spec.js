/**
 * Phase 156: Branding, security, and notification settings tests (ADMN-02, ADMN-03, ADMN-06).
 * All assertions unconditional -- no soft-fail if/isVisible patterns.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

async function navigateToSettings(page) {
  // The Settings page ('settings') is NOT in the App.jsx sidebar navigation array.
  // It is accessible only via React state — no button/link triggers it from the UI.
  // ADMN-02/03 gap: Settings nav item absent from sidebar. Escalated in
  // 169-ADMN-PERSISTENCE-EVIDENCE.md under Escalated Gaps.
  //
  // Fix: dispatch 'settings' directly to the BizScreenAppInner currentPage state
  // via React fiber. This is a test-side-only reconciliation — no product code changed.
  await page.evaluate(() => {
    const root = document.getElementById('root');
    const containerKey = Object.keys(root).find(k => k.startsWith('__reactContainer'));
    const container = root[containerKey];
    const seen = new Set();

    function traverse(f, depth) {
      if (!f || depth > 35 || seen.has(f)) return null;
      seen.add(f);
      if (f.type && f.type.name === 'BizScreenAppInner') {
        // currentPage is the 2nd hook (hookIdx 1) on this component
        let hook = f.memoizedState;
        let idx = 0;
        while (hook && idx < 5) {
          if (idx === 1 && typeof hook.memoizedState === 'string' && hook.queue && hook.queue.dispatch) {
            hook.queue.dispatch('settings');
            return 'dispatched';
          }
          hook = hook.next;
          idx++;
        }
      }
      const r = traverse(f.child, depth + 1);
      if (r) return r;
      return traverse(f.sibling, depth);
    }

    traverse(container, 0);
  });
  // Allow React to re-render after state dispatch
  await page.waitForTimeout(300);
  await waitForPageReady(page);
}

test.describe('ADMN-02: Branding Settings', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await navigateToSettings(page);
    await page.getByRole('tab', { name: /branding/i }).click();
    await waitForPageReady(page);
  });

  test('branding tab shows brand themes section', async ({ page }) => {
    await expect(page.getByText(/brand themes/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('branding tab has import brand button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /import brand/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test('can open brand importer modal', async ({ page }) => {
    await page.getByRole('button', { name: /import brand/i }).click();

    // Should show the brand importer dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

    // Dialog should contain brand import content
    await expect(
      page.getByText(/upload|colors|brand|logo/i).first()
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe('ADMN-03: Security Settings', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await navigateToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await waitForPageReady(page);
  });

  test('security tab shows account security section', async ({ page }) => {
    await expect(
      page.getByText(/account security|two.factor|2fa/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('security tab shows session management', async ({ page }) => {
    await expect(
      page.getByText(/session|active sessions/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('security tab shows login history', async ({ page }) => {
    await expect(
      page.getByText(/login history|recent logins/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('ADMN-06: Notification Settings Persistence', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
    await navigateToSettings(page);
    await page.getByRole('tab', { name: /notifications/i }).click();
    await waitForPageReady(page);
  });

  test('notifications tab shows toggle checkboxes', async ({ page }) => {
    // The notification checkboxes use sr-only class but are still in the DOM
    await expect(
      page.locator('input[type="checkbox"]').first()
    ).toBeAttached({ timeout: 5000 });
  });

  test('can toggle a notification setting', async ({ page }) => {
    // Get the first notification checkbox (sr-only inputs behind styled toggle)
    const toggle = page.locator('input[type="checkbox"]').first();
    await expect(toggle).toBeAttached({ timeout: 5000 });

    const initial = await toggle.isChecked();

    // Click the parent label element to toggle (since input is sr-only)
    const label = page.locator('label:has(input[type="checkbox"])').first();
    await label.click();

    // Wait for auto-save
    await page.waitForTimeout(500);

    // Assert the new state is opposite
    await expect(toggle).toBeChecked({ checked: !initial });
  });

  test('notification toggle persists after reload', async ({ page }) => {
    // Get the first notification checkbox
    const toggle = page.locator('input[type="checkbox"]').first();
    await expect(toggle).toBeAttached({ timeout: 5000 });

    const initial = await toggle.isChecked();

    // Toggle it by clicking the parent label
    const label = page.locator('label:has(input[type="checkbox"])').first();
    await label.click();

    // Wait for auto-save to complete
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();
    await waitForPageReady(page);

    // Navigate back to settings and notifications tab
    await navigateToSettings(page);
    await page.getByRole('tab', { name: /notifications/i }).click();
    await waitForPageReady(page);

    // Assert checkbox state equals the toggled value
    const toggleAfterReload = page.locator('input[type="checkbox"]').first();
    await expect(toggleAfterReload).toBeChecked({ checked: !initial, timeout: 5000 });

    // Restore original state by toggling back
    const labelAfterReload = page.locator('label:has(input[type="checkbox"])').first();
    await labelAfterReload.click();
    await page.waitForTimeout(500);
  });
});
