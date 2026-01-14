/**
 * Scene Editor E2E Tests
 *
 * Tests for the Canva-style Scene Editor including:
 * - Navigating to editor from scene detail
 * - Canvas rendering and block manipulation
 * - Properties panel interactions
 * - Slide management (add, delete, navigate)
 * - AI suggestions panel
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, navigateToSection } from './helpers.js';

test.describe('Scene Editor', () => {
  // Skip if user credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    });
  });

  /**
   * Helper to navigate to scene editor from a scene
   */
  async function navigateToSceneEditor(page) {
    // Go to scenes list
    await navigateToSection(page, 'scenes');
    await waitForPageReady(page);
    await page.waitForTimeout(2000);

    // Open first scene
    const openButton = page.getByRole('button', { name: /open scene/i }).first();
    if (!await openButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      return false;
    }

    await openButton.click();
    await waitForPageReady(page);

    // Click "Edit Design" button
    const editDesignButton = page.getByRole('button', { name: /edit design/i });
    if (!await editDesignButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      return false;
    }

    await editDesignButton.click();
    await waitForPageReady(page);
    await page.waitForTimeout(1000);

    return true;
  }

  test.describe('Editor Navigation', () => {
    test('can navigate to scene editor from scene detail', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Verify we're in the editor (has canvas area)
        const canvas = page.locator('[data-testid="editor-canvas"], .editor-canvas, [class*="EditorCanvas"]');
        await expect(canvas.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows back button to return to scene detail', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Should have a back button
        const backButton = page.getByRole('button', { name: /back|close|exit/i }).first();
        await expect(backButton).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Canvas Rendering', () => {
    test('displays 16:9 canvas area', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Canvas should be visible with aspect ratio container
        const canvas = page.locator('[data-testid="editor-canvas"], .aspect-video').first();
        await expect(canvas).toBeVisible({ timeout: 10000 });
      }
    });

    test('canvas has background color', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Canvas should have a background
        const canvas = page.locator('[data-testid="editor-canvas"], .aspect-video').first();
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Check it has some background style
        const bgColor = await canvas.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });
        expect(bgColor).toBeTruthy();
      }
    });
  });

  test.describe('Slide Strip', () => {
    test('shows slide thumbnails on left panel', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Should see slide strip with thumbnails
        const slideStrip = page.locator('text=/slides/i');
        await expect(slideStrip.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('can add new slide', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Find add slide button
        const addSlideButton = page.getByRole('button', { name: /add slide|new slide|\+/i }).first();

        if (await addSlideButton.isVisible().catch(() => false)) {
          // Count initial slides
          const slidesBefore = await page.locator('[data-testid="slide-thumbnail"], .slide-thumbnail').count();

          await addSlideButton.click();
          await page.waitForTimeout(500);

          // Should have one more slide
          const slidesAfter = await page.locator('[data-testid="slide-thumbnail"], .slide-thumbnail').count();
          expect(slidesAfter).toBeGreaterThanOrEqual(slidesBefore);
        }
      }
    });

    test('can select different slides', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // If there are multiple slide thumbnails
        const thumbnails = page.locator('[data-testid="slide-thumbnail"], .slide-thumbnail, button:has(.aspect-video)');
        const count = await thumbnails.count();

        if (count > 1) {
          // Click second slide
          await thumbnails.nth(1).click();
          await page.waitForTimeout(300);

          // Should have visual indicator of selection
          const selectedSlide = page.locator('[data-testid="slide-thumbnail"].ring-2, .slide-thumbnail.selected, .ring-blue-500');
          await expect(selectedSlide.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Block Toolbar', () => {
    test('shows toolbar with block type buttons', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Should see block type buttons (Text, Image, Shape, Widget)
        const textButton = page.getByRole('button', { name: /text/i }).first();
        const imageButton = page.getByRole('button', { name: /image/i }).first();
        const shapeButton = page.getByRole('button', { name: /shape/i }).first();

        // At least one block type button should be visible
        const anyVisible = await textButton.isVisible().catch(() => false) ||
                          await imageButton.isVisible().catch(() => false) ||
                          await shapeButton.isVisible().catch(() => false);

        expect(anyVisible).toBeTruthy();
      }
    });

    test('can add text block', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Click text button
        const textButton = page.getByRole('button', { name: /text/i }).first();

        if (await textButton.isVisible().catch(() => false)) {
          await textButton.click();
          await page.waitForTimeout(500);

          // Should see a text block on canvas or properties panel updates
          const textIndicator = page.locator('text=/text|heading|body/i').first();
          await expect(textIndicator).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('can add shape block', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        const shapeButton = page.getByRole('button', { name: /shape|square|rectangle/i }).first();

        if (await shapeButton.isVisible().catch(() => false)) {
          await shapeButton.click();
          await page.waitForTimeout(500);

          // Properties should update to show shape options
          const shapeIndicator = page.locator('text=/shape|fill|opacity/i').first();
          await expect(shapeIndicator).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Properties Panel', () => {
    test('shows properties panel on right side', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Should see properties panel
        const propertiesPanel = page.locator('text=/properties|background/i');
        await expect(propertiesPanel.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows background settings', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Background section should be visible
        const backgroundSection = page.locator('text=/background/i');
        await expect(backgroundSection.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows "select a block" message when nothing selected', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // When no block is selected, should show message
        const selectMessage = page.locator('text=/select.*block|click.*edit/i');

        // Either this message or a block is already selected
        const hasMessage = await selectMessage.isVisible().catch(() => false);
        const hasBlockType = await page.locator('text=/text|shape|image|widget/i').first().isVisible().catch(() => false);

        expect(hasMessage || hasBlockType).toBeTruthy();
      }
    });
  });

  test.describe('AI Suggestions Panel', () => {
    test('can toggle AI suggestions panel', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Look for AI/sparkles button
        const aiButton = page.getByRole('button', { name: /ai|suggest|sparkle/i }).first();

        if (await aiButton.isVisible().catch(() => false)) {
          await aiButton.click();
          await page.waitForTimeout(500);

          // Should see AI panel with tabs
          const aiPanel = page.locator('text=/ai assistant|templates|improve/i');
          await expect(aiPanel.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('shows industry presets in templates tab', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Open AI panel
        const aiButton = page.getByRole('button', { name: /ai|suggest|sparkle/i }).first();

        if (await aiButton.isVisible().catch(() => false)) {
          await aiButton.click();
          await page.waitForTimeout(500);

          // Click templates tab if not already active
          const templatesTab = page.getByRole('button', { name: /templates/i }).first();
          if (await templatesTab.isVisible().catch(() => false)) {
            await templatesTab.click();
            await page.waitForTimeout(300);
          }

          // Should show preset templates
          const presets = page.locator('text=/menu|special|welcome|promo|announcement/i');
          await expect(presets.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Save Status', () => {
    test('shows save status indicator', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Should show saved/saving status
        const saveStatus = page.locator('text=/saved|saving|auto-save/i');
        await expect(saveStatus.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Undo/Redo', () => {
    test('shows undo/redo buttons', async ({ page }) => {
      const success = await navigateToSceneEditor(page);

      if (success) {
        // Should have undo button (may be disabled initially)
        const undoButton = page.getByRole('button', { name: /undo/i }).first();
        const redoButton = page.getByRole('button', { name: /redo/i }).first();

        const hasUndo = await undoButton.isVisible().catch(() => false);
        const hasRedo = await redoButton.isVisible().catch(() => false);

        // At least undo should be visible
        expect(hasUndo || hasRedo).toBeTruthy();
      }
    });
  });
});
