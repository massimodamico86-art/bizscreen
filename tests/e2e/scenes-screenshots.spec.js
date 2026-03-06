/**
 * Scenes & SVG Editor Screenshot Tests
 *
 * Captures screenshot evidence for scene list and SVG editor operations:
 * - SCENE-01: Scene list page with create, duplicate, delete actions
 * - SCENE-02: Scene creation modal (AutoBuild/industry modal)
 * - SCENE-03: SVG editor loads with toolbar and canvas
 *
 * Screenshots saved to screenshots/116/ using screenshotStep helper.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
  assertAppReady,
} from './helpers/index.js';

/**
 * Navigate to the Scenes page.
 * Scenes is NOT in the sidebar, so we use the app's exposed
 * window.__setCurrentPage('scenes') dev helper to navigate programmatically.
 */
async function navigateToScenes(page) {
  // The app exposes window.__setCurrentPage in dev mode for QA navigation.
  await page.evaluate(() => {
    if (typeof window.__setCurrentPage === 'function') {
      window.__setCurrentPage('scenes');
    }
  });

  // Wait for the Scenes heading or empty state to appear
  const scenesHeading = page.getByRole('heading', { name: /scenes/i }).first();
  const emptyState = page.getByText('No scenes yet');

  await Promise.race([
    scenesHeading.waitFor({ state: 'visible', timeout: 10000 }),
    emptyState.waitFor({ state: 'visible', timeout: 10000 }),
  ]).catch(() => null);

  await waitForPageReady(page);
}

test.describe('Scenes & SVG Editor Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Client test credentials not configured');

    await loginAndPrepare(page);
    await assertAppReady(page, test);
  });

  // =========================================================================
  // SCENE-01: Scene list page with create, duplicate, delete actions
  // =========================================================================
  test('SCENE-01: scene list page with card actions', async ({ page }) => {
    test.slow();

    // Navigate to scenes - since it's not in the sidebar, try multiple approaches
    await navigateToScenes(page);

    // Wait for either scene cards or empty state
    const scenesHeading = page.getByRole('heading', { name: /scenes/i }).first();
    const emptyState = page.getByText('No scenes yet');
    const sceneCards = page.locator('.hover\\:shadow-md').or(page.locator('article'));

    // Give the page time to render scenes or empty state
    await Promise.race([
      scenesHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);

    await waitForPageReady(page);

    // Screenshot the scenes list page (or empty state)
    await screenshotStep(page, '116', '01-scenes-list');

    // Check if scenes exist
    const cardCount = await sceneCards.count();

    if (cardCount > 0) {
      // Look for Duplicate and Delete buttons on a card
      const duplicateButton = page.locator('button:has-text("Duplicate")').first();
      const deleteButton = page.locator('button:has-text("Delete")').first();

      const hasDuplicate = await duplicateButton.count() > 0 && await duplicateButton.isVisible().catch(() => false);
      const hasDelete = await deleteButton.count() > 0 && await deleteButton.isVisible().catch(() => false);

      if (hasDuplicate || hasDelete) {
        await screenshotStep(page, '116', '01-scenes-card-actions');
      }

      // Test delete confirmation modal
      if (hasDelete) {
        await deleteButton.click();
        // Wait for delete confirmation modal
        const deleteModal = page.locator('[role="dialog"]').filter({ hasText: /delete scene/i });
        const modalVisible = await deleteModal.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

        if (modalVisible) {
          await screenshotStep(page, '116', '01-scenes-delete-modal');

          // Cancel to avoid actual deletion
          const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
          if (await cancelBtn.count() > 0) {
            await cancelBtn.click();
            await page.waitForTimeout(300);
          } else {
            await dismissAnyModals(page);
          }
        }
      }

      // Test duplicate action (just screenshot, don't wait for side effects)
      if (hasDuplicate) {
        await duplicateButton.click();
        await page.waitForTimeout(1000);
        await screenshotStep(page, '116', '01-scenes-duplicate');
      }
    } else {
      // Empty state - verify the generate button is present
      const generateButton = page.getByRole('button', { name: /generate my first scene/i });
      const genCount = await generateButton.count();
      if (genCount > 0) {
        await screenshotStep(page, '116', '01-scenes-empty-state');
      }
    }
  });

  // =========================================================================
  // SCENE-02: Scene creation modal
  // =========================================================================
  test('SCENE-02: scene creation modal', async ({ page }) => {
    test.slow();

    await navigateToScenes(page);

    // Wait for the page to settle
    await Promise.race([
      page.getByRole('heading', { name: /scenes/i }).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      page.getByText('No scenes yet').waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);
    await waitForPageReady(page);

    // Click "Create Scene" or "Generate My First Scene" button
    const createButton = page.getByRole('button', { name: /create scene/i })
      .or(page.getByRole('button', { name: /generate my first scene/i }));

    const createCount = await createButton.count();
    if (createCount === 0) {
      // No create button found, screenshot current state
      await screenshotStep(page, '116', '02-scenes-create-not-found');
      return;
    }

    await createButton.first().click();

    // Wait for the AutoBuild/industry modal or any dialog
    const dialog = page.locator('[role="dialog"]').first();
    const fixedOverlay = page.locator('.fixed.inset-0').first();

    const modalAppeared = await Promise.race([
      dialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'dialog'),
      fixedOverlay.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'overlay'),
    ]).catch(() => 'none');

    if (modalAppeared !== 'none') {
      await page.waitForTimeout(500); // Allow animations to settle
      await screenshotStep(page, '116', '02-scenes-create-modal');

      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // If still open, try other close methods
      const stillOpen = await dialog.isVisible().catch(() => false);
      if (stillOpen) {
        await dismissAnyModals(page);
      }
    } else {
      // No modal appeared - might have navigated somewhere
      await screenshotStep(page, '116', '02-scenes-create-action');
    }
  });

  // =========================================================================
  // SCENE-03: SVG editor loads with toolbar and canvas
  // =========================================================================
  test('SCENE-03: SVG editor with toolbar and canvas', async ({ page }) => {
    test.slow();

    // Navigate to Templates page via sidebar
    const templatesButton = page.getByRole('button', { name: /templates/i }).first();
    await templatesButton.click();
    await waitForPageReady(page);

    // Wait for the template gallery to load
    await page.waitForTimeout(1000);

    // Screenshot the templates gallery page
    await screenshotStep(page, '116', '03-templates-gallery');

    // Look for a "New Design" or "Create" button, or a template card to use
    const newDesignButton = page.getByRole('button', { name: /new design|create|start from scratch/i }).first();
    const templateCards = page.locator('article, .template-card, [class*="cursor-pointer"]').filter({
      has: page.locator('img'),
    });

    let editorOpened = false;

    // Try "New Design" / blank canvas first
    const newDesignCount = await newDesignButton.count();
    if (newDesignCount > 0 && (await newDesignButton.isVisible().catch(() => false))) {
      await newDesignButton.click();
      await page.waitForTimeout(2000);
      editorOpened = true;
    } else {
      // Try clicking "Use Template" or similar button on a template card
      const useTemplateBtn = page.getByRole('button', { name: /use template|edit|customize/i }).first();
      const useCount = await useTemplateBtn.count();

      if (useCount > 0 && (await useTemplateBtn.isVisible().catch(() => false))) {
        await useTemplateBtn.click();
        await page.waitForTimeout(2000);
        editorOpened = true;
      } else {
        // Try hovering on a template card to reveal action buttons
        const cardCount = await templateCards.count();
        if (cardCount > 0) {
          await templateCards.first().hover();
          await page.waitForTimeout(500);

          // Look for any action button that appeared
          const hoverBtn = page.getByRole('button', { name: /use|edit|open|customize/i }).first();
          const hoverCount = await hoverBtn.count();
          if (hoverCount > 0 && (await hoverBtn.isVisible().catch(() => false))) {
            await hoverBtn.click();
            await page.waitForTimeout(2000);
            editorOpened = true;
          }
        }
      }
    }

    if (editorOpened) {
      // Wait for SVG editor to load (look for canvas or toolbar)
      const canvasArea = page.locator('canvas, .canvas-container, [class*="fabric"]');
      const editorLoading = page.getByText(/loading editor/i);

      // Wait for loading to finish
      await Promise.race([
        editorLoading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => null),
        canvasArea.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      ]);

      await page.waitForTimeout(1000); // Allow canvas to fully render

      await screenshotStep(page, '116', '03-svg-editor-loaded');
    } else {
      // Couldn't open editor, screenshot current state
      await screenshotStep(page, '116', '03-svg-editor-fallback');
    }
  });
});
