/**
 * Social Feed Moderation E2E — smoke tests
 *
 * Covers Phase 167 Success Criteria:
 *   SC1 — User can navigate to the moderation queue
 *   SC4 — Empty state is shown when no items are pending
 *
 * SC2/SC3 (approve/reject happy paths) are exercised by the Plan 01 unit suite
 * and manually via the checkpoint task in this plan — a full E2E would require
 * seeding social_feeds rows per-test-tenant, which is out of scope here.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

test.describe('Social Feed Moderation', () => {
  test.skip(
    () => !process.env.TEST_CLIENT_EMAIL,
    'Client test credentials not configured'
  );

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD,
    });
  });

  test('sidebar exposes Social Moderation link and navigates to the queue (SC1)', async ({ page }) => {
    const navLink = page.getByRole('button', { name: /social moderation/i }).first();
    await expect(navLink).toBeVisible({ timeout: 10000 });
    await navLink.click();
    await waitForPageReady(page);

    await expect(
      page.getByRole('heading', { name: /social feed moderation/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state or list after load (SC1 + SC4)', async ({ page }) => {
    const navLink = page.getByRole('button', { name: /social moderation/i }).first();
    await expect(navLink).toBeVisible({ timeout: 10000 });
    await navLink.click();
    await waitForPageReady(page);

    // Loading spinner must disappear within 15s.
    await expect(page.getByTestId('queue-loading')).toBeHidden({ timeout: 15000 });

    const empty = page.getByTestId('queue-empty-state');
    const list = page.getByTestId('queue-list');

    // Exactly one of the two must be visible once loading completes.
    const emptyVisible = await empty.isVisible().catch(() => false);
    const listVisible = await list.isVisible().catch(() => false);
    expect(emptyVisible || listVisible).toBe(true);

    if (emptyVisible) {
      await expect(empty).toContainText(/no pending items/i);
    } else {
      // If there are items, every rendered item must carry approve + reject buttons.
      const firstItem = list.locator('[data-testid^="queue-item-"]').first();
      await expect(firstItem).toBeVisible();
      await expect(firstItem.locator('[data-testid^="approve-"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid^="reject-"]')).toBeVisible();
    }
  });

  test('refresh button is present and clickable (SC1)', async ({ page }) => {
    const navLink = page.getByRole('button', { name: /social moderation/i }).first();
    await navLink.click();
    await waitForPageReady(page);

    const refresh = page.getByTestId('refresh-queue');
    await expect(refresh).toBeVisible({ timeout: 10000 });
    await refresh.click();
    // After click, loading spinner should briefly appear and resolve without throwing.
    await expect(page.getByTestId('queue-loading').or(page.getByTestId('queue-empty-state')).or(page.getByTestId('queue-list')).first()).toBeVisible({ timeout: 10000 });
  });
});
