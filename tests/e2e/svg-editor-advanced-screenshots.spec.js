/**
 * SVG Editor Advanced Features - Screenshot E2E Tests
 *
 * Covers SCENE-12 through SCENE-17:
 * - SCENE-12: Undo/redo toolbar buttons
 * - SCENE-13: Save with success feedback
 * - SCENE-14: Export dialog with format/quality options
 * - SCENE-15: Context menu on right-click
 * - SCENE-16: Cloud import panel (Google Drive, Dropbox, etc.)
 * - SCENE-17: AI Designer panel (Scene Editor fallback)
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

// Skip entire suite if no test credentials
const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

/**
 * Take a named screenshot with consistent path convention.
 */
async function screenshotStep(page, filename, options = {}) {
  const { fullPage = false, locator = null } = options;
  const path = `screenshots/116/${filename}`;
  if (locator) {
    await locator.screenshot({ path });
  } else {
    await page.screenshot({ path, fullPage });
  }
}

/**
 * Navigate to the SVG editor via the UI.
 * This app is a SPA with internal state routing -- direct URL navigation to
 * /app/svg-editor does not work. We must navigate through the Templates page
 * and click "New Design" to open the SVG editor.
 */
async function openSvgEditor(page) {
  // Click Templates in the sidebar to navigate to the SVG template gallery
  const templatesBtn = page.locator('aside button:has-text("Templates")').first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 10000 });
  await templatesBtn.click();
  await page.waitForTimeout(2000);

  // On the Templates/SVG Template Gallery page, click "New Design" button
  // SvgTemplateGalleryPage has a "New Design" button that calls onNavigate('svg-editor')
  const newDesignBtn = page.locator('button:has-text("New Design")').first();
  await newDesignBtn.waitFor({ state: 'visible', timeout: 10000 });
  await newDesignBtn.click();
  await page.waitForTimeout(2000);

  // Wait for the SVG editor to load -- look for the canvas element
  const canvas = page.locator('canvas').first();
  const loadingSpinner = page.locator('.animate-spin').first();

  // Wait for canvas or editor header to appear
  await Promise.race([
    canvas.waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('input[placeholder="Design name"]').waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => {});

  // Wait for spinner to disappear if present
  const spinnerCount = await loadingSpinner.count();
  if (spinnerCount > 0 && await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // Give the editor a moment to initialize fabric.js canvas
  await page.waitForTimeout(2000);
}

test.describe('SVG Editor Advanced Screenshots', () => {
  test.skip(!hasCredentials, 'TEST_USER_EMAIL not set -- skipping SVG editor tests');

  // SCENE-12: Undo/redo keyboard shortcuts
  test('SCENE-12: undo/redo toolbar buttons', async ({ page }) => {
    test.slow();

    await loginAndPrepare(page);
    await openSvgEditor(page);

    // Screenshot the canvas controls area showing undo/redo buttons (right-side floating controls)
    // The CanvasControls component has undo/redo buttons with title="Undo (Ctrl+Z)" and title="Redo (Ctrl+Y)"
    await screenshotStep(page, '116-12-undo-redo-toolbar-desktop.png');

    // Add a text element to canvas by clicking the "Add Text" button in the EditorToolbar (left sidebar w-14)
    const addTextBtn = page.locator('button[title="Add Text"]').first();
    const addTextCount = await addTextBtn.count();
    if (addTextCount > 0 && await addTextBtn.isVisible()) {
      await addTextBtn.click();
      await page.waitForTimeout(1500);
    } else {
      // Fallback: try clicking the Type icon button in the left toolbar
      const typeBtn = page.locator('button:has(svg.lucide-type)').first();
      const typeBtnCount = await typeBtn.count();
      if (typeBtnCount > 0) {
        await typeBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // After adding text, the undo button should become enabled
    // Screenshot showing undo button enabled state
    await screenshotStep(page, '116-12-undo-enabled-desktop.png');

    // Press Ctrl+Z to undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);

    // Screenshot after undo
    await screenshotStep(page, '116-12-after-undo-desktop.png');
  });

  // SCENE-13: Save with success feedback
  test('SCENE-13: save with success feedback', async ({ page }) => {
    test.slow();

    await loginAndPrepare(page);
    await openSvgEditor(page);

    // Look for the Save button in the top header bar
    // The save button has text "Save" and an orange background
    const saveBtn = page.locator('button:has-text("Save"), motion\\.button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });

    // Click save
    await saveBtn.click();

    // Wait for save feedback -- look for "Saved!" text (green bg) or success toast
    // The editor shows a "Saved!" animation with Check icon
    await page.waitForTimeout(2000);

    // Screenshot showing save feedback
    await screenshotStep(page, '116-13-save-feedback-desktop.png');
  });

  // SCENE-14: Export dialog with format/quality options
  test('SCENE-14: export dialog with format and quality options', async ({ page }) => {
    test.slow();

    await loginAndPrepare(page);
    await openSvgEditor(page);

    // Look for the Export button in the header
    const exportBtn = page.locator('button:has-text("Export")').first();
    await expect(exportBtn).toBeVisible({ timeout: 10000 });

    // Click export to open dialog
    await exportBtn.click();
    await page.waitForTimeout(1000);

    // Wait for the export dialog modal to appear
    // It's a fixed overlay with format options (PNG, JPEG, SVG) and quality slider
    const exportDialog = page.locator('text="Export Design"').first();
    await expect(exportDialog).toBeVisible({ timeout: 5000 });

    // Screenshot the export dialog
    await screenshotStep(page, '116-14-export-dialog-desktop.png');

    // Close the dialog by clicking the X button or clicking outside
    const closeBtn = page.locator('.fixed button:has(svg.lucide-x)').first();
    const closeBtnCount = await closeBtn.count();
    if (closeBtnCount > 0 && await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Click outside the dialog to close
      await page.locator('.fixed.inset-0').first().click({ position: { x: 10, y: 10 } });
    }
  });

  // SCENE-15: Context menu on right-click
  test('SCENE-15: context menu on right-click', async ({ page }) => {
    test.slow();

    await loginAndPrepare(page);
    await openSvgEditor(page);

    // First add a text element so there's something on the canvas
    const addTextBtn = page.locator('button[title="Add Text"]').first();
    const addTextCount = await addTextBtn.count();
    if (addTextCount > 0 && await addTextBtn.isVisible()) {
      await addTextBtn.click();
      await page.waitForTimeout(1500);
    }

    // Right-click on the canvas area to trigger the context menu
    // The ContextMenu component renders as a fixed positioned div with min-w-[220px]
    // Fabric.js uses an upper-canvas overlay that intercepts pointer events
    const canvas = page.locator('canvas.upper-canvas').first();
    await canvas.click({ button: 'right', position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000);

    // Screenshot the context menu
    // The context menu shows items like Copy, Cut, Paste, Duplicate, Delete, Layer, etc.
    await screenshotStep(page, '116-15-context-menu-desktop.png');

    // Click elsewhere to dismiss
    await page.locator('header').first().click();
  });

  // SCENE-16: Cloud import panel
  test('SCENE-16: cloud import panel', async ({ page }) => {
    test.slow();

    await loginAndPrepare(page);
    await openSvgEditor(page);

    // In the left sidebar, find the "Cloud" tab button
    // The sidebar has icon-label buttons; Cloud tab has label "Cloud"
    const cloudTab = page.locator('button:has-text("Cloud")').first();
    const cloudTabCount = await cloudTab.count();

    if (cloudTabCount > 0 && await cloudTab.isVisible()) {
      await cloudTab.click();
      await page.waitForTimeout(1000);
    } else {
      // Fallback: try clicking the cloud icon button
      const cloudIconBtn = page.locator('button:has(svg.lucide-cloud)').first();
      const cloudIconCount = await cloudIconBtn.count();
      if (cloudIconCount > 0) {
        await cloudIconBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Screenshot the cloud import panel showing providers (Google Drive, Dropbox, OneDrive, etc.)
    await screenshotStep(page, '116-16-cloud-import-panel-desktop.png');

    // Check if cloud providers are visible
    const gdriveBtn = page.locator('button:has-text("Google Drive")').first();
    const gdriveCount = await gdriveBtn.count();
    if (gdriveCount > 0 && await gdriveBtn.isVisible()) {
      await screenshotStep(page, '116-16-cloud-providers-desktop.png');
    }
  });

  // SCENE-17: AI Designer panel (Scene Editor fallback)
  test('SCENE-17: AI designer panel', async ({ page }) => {
    test.slow();

    await loginAndPrepare(page);
    await openSvgEditor(page);

    // Check if there's an AI button or panel in the SVG editor
    // Look for sparkles icon or "AI" text in sidebar/toolbar
    const aiBtn = page.locator('button:has-text("AI"), button:has(svg.lucide-sparkles)').first();
    const aiBtnCount = await aiBtn.count();
    let foundAiInSvgEditor = false;

    if (aiBtnCount > 0 && await aiBtn.isVisible()) {
      await aiBtn.click();
      await page.waitForTimeout(1000);
      await screenshotStep(page, '116-17-ai-designer-panel-desktop.png');
      foundAiInSvgEditor = true;
    }

    if (!foundAiInSvgEditor) {
      // AI panel is in the Scene Editor, not the SVG editor
      // Navigate back to the app via the Back button in the SVG editor header
      const backBtn = page.locator('button[title="Back to gallery"]').first();
      const backCount = await backBtn.count();
      if (backCount > 0 && await backBtn.isVisible()) {
        // May prompt about unsaved changes
        page.on('dialog', dialog => dialog.accept());
        await backBtn.click();
        await page.waitForTimeout(2000);
      }
      await waitForPageReady(page);

      // Click on Scenes in sidebar
      const scenesBtn = page.locator('button:has-text("Scenes")').first();
      const scenesCount = await scenesBtn.count();

      if (scenesCount > 0 && await scenesBtn.isVisible()) {
        await scenesBtn.click();
        await page.waitForTimeout(2000);
        await waitForPageReady(page);

        // Look for a scene to open -- click first "Open" or scene card
        const openBtn = page.locator('button:has-text("Open"), button:has-text("Edit")').first();
        const openCount = await openBtn.count();

        if (openCount > 0 && await openBtn.isVisible()) {
          await openBtn.click();
          await page.waitForTimeout(2000);

          // In the scene editor, look for the Sparkles/AI toggle button
          const sparklesBtn = page.locator('button[title*="AI"], button:has(svg.lucide-sparkles)').first();
          const sparklesCount = await sparklesBtn.count();

          if (sparklesCount > 0 && await sparklesBtn.isVisible()) {
            await sparklesBtn.click();
            await page.waitForTimeout(1500);
            await screenshotStep(page, '116-17-ai-designer-panel-desktop.png');
            foundAiInSvgEditor = true;
          }
        }
      }

      if (!foundAiInSvgEditor) {
        // Neither SVG editor nor Scene editor had accessible AI panel
        // Take screenshot of current state with note
        await screenshotStep(page, '116-17-ai-not-available-desktop.png');
      }
    }
  });
});
