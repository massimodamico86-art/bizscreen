/**
 * Scenes E2E Tests
 *
 * Tests for the Scenes feature including:
 * - Navigating to Scenes page
 * - Viewing scenes list
 * - Opening scene detail page
 * - Publish to Screen modal
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, navigateToSection } from './helpers.js';

test.describe('Scenes', () => {
  // Skip if user credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    });
  });

  test.describe('Scenes List Page', () => {
    test('can navigate to Scenes page', async ({ page }) => {
      // Navigate to Scenes
      await navigateToSection(page, 'scenes');

      // Verify we're on the scenes page
      await expect(page.locator('h1, h2').filter({ hasText: /scenes/i })).toBeVisible({ timeout: 10000 });
    });

    test('shows scenes list or empty state', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      // Should show either scene cards or empty state
      const sceneCards = page.locator('[data-testid="scene-card"], .scene-card, [class*="SceneCard"]');
      const emptyState = page.locator('text=/no scenes|create.*scene|generate.*scene/i');

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Either should be visible
      const hasScenes = await sceneCards.count() > 0;
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasScenes || hasEmptyState).toBeTruthy();
    });

    test('scenes page shows business type badges', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      // Wait for content to load
      await page.waitForTimeout(2000);

      // If scenes exist, they should have business type badges
      const sceneCards = page.locator('[data-testid="scene-card"], article, .bg-white.rounded-xl').first();

      if (await sceneCards.isVisible().catch(() => false)) {
        // Business type badges like "Restaurant", "Salon", "Gym", etc.
        const businessBadges = page.locator('text=/Restaurant|Salon|Gym|Retail|Medical|Hotel|Business/i');
        await expect(businessBadges.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Scene Detail Page', () => {
    test('can open scene detail from list', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Look for an "Open Scene" button (if scenes exist)
      const openButton = page.getByRole('button', { name: /open scene/i }).first();

      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await waitForPageReady(page);

        // Verify we're on the detail page
        await expect(page.locator('text=/back to scenes/i')).toBeVisible({ timeout: 10000 });
      }
    });

    test('scene detail shows preview area', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      await page.waitForTimeout(2000);

      const openButton = page.getByRole('button', { name: /open scene/i }).first();

      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await waitForPageReady(page);

        // Should have a preview section
        await expect(page.locator('text=/preview/i')).toBeVisible({ timeout: 10000 });
      }
    });

    test('scene detail shows linked content (layout and playlist)', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      await page.waitForTimeout(2000);

      const openButton = page.getByRole('button', { name: /open scene/i }).first();

      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await waitForPageReady(page);

        // Should show Layout and Playlist info
        await expect(page.locator('text=/layout/i').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=/playlist/i').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Publish to Screen', () => {
    test('can open publish modal from scene detail', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      await page.waitForTimeout(2000);

      const openButton = page.getByRole('button', { name: /open scene/i }).first();

      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await waitForPageReady(page);

        // Click "Publish to Screen" button
        const publishButton = page.getByRole('button', { name: /publish.*screen/i });
        await expect(publishButton).toBeVisible({ timeout: 10000 });
        await publishButton.click();

        // Modal should open
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      }
    });

    test('publish modal shows device selection', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      await page.waitForTimeout(2000);

      const openButton = page.getByRole('button', { name: /open scene/i }).first();

      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await waitForPageReady(page);

        const publishButton = page.getByRole('button', { name: /publish.*screen/i });
        if (await publishButton.isVisible().catch(() => false)) {
          await publishButton.click();

          // Modal should show device selection area
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible({ timeout: 5000 });

          // Should show either devices or "no screens" message
          const hasDevices = await modal.locator('input[type="checkbox"]').count() > 0;
          const noDevicesMessage = await modal.locator('text=/no screens|add screen|register/i').isVisible().catch(() => false);

          expect(hasDevices || noDevicesMessage).toBeTruthy();
        }
      }
    });

    test('can close publish modal', async ({ page }) => {
      await navigateToSection(page, 'scenes');
      await waitForPageReady(page);

      await page.waitForTimeout(2000);

      const openButton = page.getByRole('button', { name: /open scene/i }).first();

      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await waitForPageReady(page);

        const publishButton = page.getByRole('button', { name: /publish.*screen/i });
        if (await publishButton.isVisible().catch(() => false)) {
          await publishButton.click();

          // Modal should open
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible({ timeout: 5000 });

          // Click cancel or close button
          const cancelButton = modal.getByRole('button', { name: /cancel|close/i });
          if (await cancelButton.isVisible().catch(() => false)) {
            await cancelButton.click();
            await expect(modal).not.toBeVisible({ timeout: 3000 });
          }
        }
      }
    });
  });

  test.describe('AI Onboarding', () => {
    test('AutoBuild modal appears for new users without scenes', async ({ page }) => {
      // This test is for new users who haven't completed onboarding
      // The modal should auto-trigger when they have no scenes
      // Note: This requires a fresh test user or mocking the has_completed_onboarding flag

      // For existing test users, we skip this test as they likely have onboarding complete
      test.skip(true, 'Requires fresh test user without completed onboarding');
    });
  });
});
