/**
 * Onboarding Flow E2E Tests
 *
 * Tests the new tenant onboarding experience.
 *
 * Phase 174 Wave 5 (Plan 08): added 2 tests for the starter_pack wizard step
 * (TONB-02 apply path + skip path) — verifies that selecting a pack OR clicking
 * Skip-for-now both advance the wizard to the first_media step, and that ONLY
 * the apply path emits a success toast.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare } from './helpers.js';

test.describe('Onboarding Flow', () => {
  // Skip if client credentials not configured
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    // Login with CLIENT credentials (not admin)
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  test('displays dashboard after login', async ({ page }) => {
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows navigation sidebar', async ({ page }) => {
    // Key navigation items should be visible
    await expect(page.getByText(/media/i)).toBeVisible();
    await expect(page.getByText(/playlists/i)).toBeVisible();
    await expect(page.getByText(/screens/i)).toBeVisible();
  });

  test('can access media library', async ({ page }) => {
    // Click on Media in nav
    await page.getByRole('button', { name: /media/i }).first().click();

    // Should show media library
    await expect(page.getByText(/all media|media library/i)).toBeVisible({ timeout: 5000 });
  });

  test('can access playlists page', async ({ page }) => {
    await page.getByRole('button', { name: /playlists/i }).click();

    // Should show playlists page
    await expect(page.getByText(/playlists/i)).toBeVisible({ timeout: 5000 });
  });

  test('can access screens page', async ({ page }) => {
    await page.getByRole('button', { name: /screens/i }).click();

    // Should show screens page with add button
    await expect(page.getByText(/screens/i)).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Phase 174 Plan 08 — Starter Pack Step (TONB-02)
 *
 * Wizard reset note:
 *   The OnboardingWizard reads `onboarding_progress` from Supabase. To land on
 *   the starter_pack step we'd need to reset `completed_starter_pack=FALSE`
 *   and `completed_logo=TRUE` for the test user. Doing that programmatically
 *   from a Playwright test requires either a service-role admin RPC or a
 *   direct DB write — neither is currently exposed in this repo.
 *
 *   The tests below open the wizard from the dashboard's "Continue Your Setup"
 *   card. If the test user has already completed onboarding (the common case
 *   for an existing test client), the wizard either does not open or opens at
 *   a different step. In that case the tests are marked SKIPPED at runtime
 *   via test.skip(condition, reason) — they do NOT fail. This is the same
 *   defensive pattern the broader spec uses (TEST_CLIENT_EMAIL guard).
 *
 *   When the test user is reset (manually, before a UAT run), both tests
 *   exercise the starter_pack step end-to-end: card click → success toast →
 *   advance to first_media (apply path); skip click → advance without toast
 *   (skip path).
 */
test.describe('Starter Pack Step (Phase 174 TONB-02)', () => {
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD
    });
  });

  /**
   * Helper: try to land on the starter_pack step. Returns true if successful,
   * false if the wizard is not available or is on a different step. Tests that
   * cannot land on starter_pack are skipped at runtime (not failed).
   */
  async function tryOpenStarterPackStep(page) {
    // Look for the "Continue Your Setup" card on the dashboard, OR a button
    // that opens the wizard. If not found, the user has likely completed
    // onboarding and we cannot land on the starter_pack step automatically.
    const continueBtn = page.getByRole('button', { name: /continue setup|continue your setup|complete setup/i }).first();
    const visible = await continueBtn.isVisible().catch(() => false);
    if (!visible) return false;
    await continueBtn.click();

    // Wait briefly for the wizard modal to render
    await page.waitForTimeout(500);

    // Check the wizard heading. If it reads "Choose a Starter Pack", we're on
    // the right step. Otherwise, this user is on a different step and we
    // cannot exercise the starter_pack flow without DB-level reset.
    const starterPackHeading = page.getByRole('heading', { name: /choose a starter pack/i });
    const onPackStep = await starterPackHeading.isVisible({ timeout: 2000 }).catch(() => false);
    return onPackStep;
  }

  test('TONB-02 — starter_pack apply path advances to first_media', async ({ page }) => {
    const onStep = await tryOpenStarterPackStep(page);
    test.skip(!onStep, 'Test user is not currently on the starter_pack step (already completed or different state); manual DB reset required to exercise this path');

    // Wait for at least one PackCard to render. PackCard exposes a data-testid
    // of the form `pack-card-<id>`.
    const firstPackCard = page.locator('[data-testid^="pack-card-"]').first();
    await firstPackCard.waitFor({ state: 'visible', timeout: 10000 });

    // Click the first pack card. Triggers applyStarterPack RPC + advance.
    await firstPackCard.click();

    // Expect a success toast containing "Added ... templates from"
    await expect(page.getByText(/Added.*templates from/i)).toBeVisible({ timeout: 10000 });

    // Wait for the wizard heading to flip to the next step (first_media).
    await expect(
      page.getByRole('heading', { name: /upload your first media|add your first media/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('TONB-02 — starter_pack skip path advances without applying', async ({ page }) => {
    const onStep = await tryOpenStarterPackStep(page);
    test.skip(!onStep, 'Test user is not currently on the starter_pack step (already completed or different state); manual DB reset required to exercise this path');

    // Click "Skip for now" — step-level skip should mark complete without
    // applying any pack and advance to first_media.
    const skipBtn = page.getByRole('button', { name: /skip for now/i });
    await skipBtn.click();

    // Wait for the wizard heading to flip to first_media.
    await expect(
      page.getByRole('heading', { name: /upload your first media|add your first media/i })
    ).toBeVisible({ timeout: 10000 });

    // Assert NO "Added X templates" toast appeared (skip path does not apply).
    const toast = page.getByText(/Added.*templates from/i);
    await expect(toast).toHaveCount(0);

    // Assert the wizard is STILL OPEN (the wizard modal has role="dialog").
    // skipped_at must NOT be set — only completed_starter_pack flipped.
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
