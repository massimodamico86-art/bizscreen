/**
 * Playlists E2E Screenshot Tests
 *
 * Captures screenshot evidence for playlist operations:
 * - PLAY-01: Playlist list page with create, duplicate, delete actions
 * - PLAY-02: Playlist creation modal with name input
 * - PLAY-03: Playlist editor with item addition from media library
 * - PLAY-04: Playlist item drag-and-drop reordering
 * - PLAY-05: Playlist item duration and transition settings
 * - PLAY-06: Nested playlist insertion with depth indicator
 * - PLAY-07: Background audio toggle and volume control
 * - PLAY-08: Playlist preview in player mode
 *
 * Screenshots saved to screenshots/117/ using screenshotStep helper.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
  assertAppReady,
  navigateToSection,
} from './helpers/index.js';

/**
 * Navigate to the Playlists page via sidebar link.
 */
async function navigateToPlaylists(page) {
  // Try sidebar link first
  const sidebarLink = page.getByRole('link', { name: /playlists/i }).first();
  const sidebarButton = page.getByRole('button', { name: /playlists/i }).first();

  const linkCount = await sidebarLink.count();
  const buttonCount = await sidebarButton.count();

  if (linkCount > 0 && (await sidebarLink.isVisible().catch(() => false))) {
    await sidebarLink.click();
  } else if (buttonCount > 0 && (await sidebarButton.isVisible().catch(() => false))) {
    await sidebarButton.click();
  } else {
    // Fallback: use navigateToSection helper
    await navigateToSection(page, 'playlists');
  }

  // Wait for the Playlists heading or empty state
  const heading = page.getByRole('heading', { name: /playlists/i }).first();
  const emptyState = page.getByText(/no playlists yet/i);

  await Promise.race([
    heading.waitFor({ state: 'visible', timeout: 10000 }),
    emptyState.waitFor({ state: 'visible', timeout: 10000 }),
  ]).catch(() => null);

  await waitForPageReady(page);
}

/**
 * Navigate to the playlist editor by clicking on a playlist or creating one.
 * Returns true if editor was successfully opened.
 */
async function navigateToPlaylistEditor(page) {
  // Check if playlists exist in the table
  const tableRows = page.locator('table tbody tr, [role="row"]').filter({
    hasNot: page.locator('th'),
  });
  const rowCount = await tableRows.count();

  if (rowCount > 0) {
    // Click the first playlist name/link to open editor
    const firstRow = tableRows.first();
    const nameLink = firstRow.locator('a, button, [class*="cursor-pointer"]').first();
    const nameCount = await nameLink.count();

    if (nameCount > 0) {
      await nameLink.click();
    } else {
      await firstRow.click();
    }
  } else {
    // No playlists - create one first
    const createBtn = page.getByRole('button', { name: /new playlist|create/i }).first();

    const createCount = await createBtn.count();
    if (createCount > 0 && (await createBtn.isVisible().catch(() => false))) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Fill in name and create - target the modal input specifically
      const nameInput = page.locator('[role="dialog"] input[placeholder*="playlist name" i]').first()
        .or(page.locator('#create-playlist-form input').first())
        .or(page.locator('[role="dialog"] input[type="text"]').first());
      const inputCount = await nameInput.count();
      if (inputCount > 0) {
        await nameInput.fill('Test Playlist E2E');
        // Click the Create Playlist button - use dispatchEvent to bypass overlay
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('[role="dialog"] button'));
          const createBtn = buttons.find(b => b.textContent.includes('Create Playlist'));
          if (createBtn) {
            createBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        });
        await page.waitForTimeout(3000);

        // If modal still open, dismiss it and try another approach
        const modalStillOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        if (modalStillOpen) {
          await dismissAnyModals(page);
          await page.waitForTimeout(500);
        }
      }
    } else {
      return false;
    }
  }

  // Wait for editor to load
  const editorIndicators = [
    page.getByText(/all changes saved/i),
    page.locator('input[placeholder*="search library" i]'),
    page.locator('[class*="timeline"]'),
    page.getByText(/select an item to preview/i),
  ];

  await Promise.race(
    editorIndicators.map((loc) =>
      loc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null)
    )
  );

  await waitForPageReady(page);
  return true;
}

test.describe('Playlists Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Client test credentials not configured');

    await loginAndPrepare(page);
    await assertAppReady(page, test);
  });

  // =========================================================================
  // PLAY-01: Playlist list page with create, duplicate, delete actions
  // =========================================================================
  test('PLAY-01: playlist list page with card actions', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);
    await screenshotStep(page, '117', '01-playlists-list');

    // Check if playlists exist and try to show action buttons
    const tableRows = page.locator('table tbody tr, [role="row"]').filter({
      hasNot: page.locator('th'),
    });
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // Hover a row to reveal action buttons
      const firstRow = tableRows.first();
      await firstRow.hover();
      await page.waitForTimeout(500);

      // Look for duplicate/delete action buttons
      const duplicateBtn = page.locator('button').filter({ hasText: /duplicate|copy/i }).first();
      const deleteBtn = page.locator('button').filter({ hasText: /delete/i }).first();
      const actionBtns = page.locator('button[title*="Duplicate"], button[title*="Delete"], button[title*="duplicate"], button[title*="delete"]');

      const hasDuplicate = (await duplicateBtn.count()) > 0 && (await duplicateBtn.isVisible().catch(() => false));
      const hasDelete = (await deleteBtn.count()) > 0 && (await deleteBtn.isVisible().catch(() => false));
      const hasActionBtns = (await actionBtns.count()) > 0;

      if (hasDuplicate || hasDelete || hasActionBtns) {
        await screenshotStep(page, '117', '01-playlists-actions');
      }

      // Test delete confirmation modal
      if (hasDelete) {
        await deleteBtn.click();
        const deleteModal = page.locator('[role="dialog"]').filter({ hasText: /delete/i });
        const modalVisible = await deleteModal
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false);

        if (modalVisible) {
          await screenshotStep(page, '117', '01-playlists-delete-modal');
          // Cancel to avoid actual deletion
          const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
          if ((await cancelBtn.count()) > 0) {
            await cancelBtn.click();
            await page.waitForTimeout(300);
          } else {
            await dismissAnyModals(page);
          }
        }
      }
    } else {
      await screenshotStep(page, '117', '01-playlists-empty-state');
    }
  });

  // =========================================================================
  // PLAY-02: Playlist creation modal with name input
  // =========================================================================
  test('PLAY-02: playlist creation modal', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    // Click the create button
    const createBtn = page.getByRole('button', { name: /new playlist/i })
      .or(page.getByRole('button', { name: /create playlist/i }))
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first());

    const createCount = await createBtn.count();
    if (createCount === 0) {
      await screenshotStep(page, '117', '02-create-button-not-found');
      return;
    }

    await createBtn.first().click();

    // Wait for modal to appear
    const dialog = page.locator('[role="dialog"]').first();
    const modalAppeared = await dialog
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!modalAppeared) {
      // Try fixed overlay detection
      const overlay = page.locator('.fixed.inset-0').first();
      await overlay.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    }

    await page.waitForTimeout(500);
    await screenshotStep(page, '117', '02-create-modal-empty');

    // Fill in name
    const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
    const inputCount = await nameInput.count();
    if (inputCount > 0 && (await nameInput.isVisible().catch(() => false))) {
      await nameInput.fill('Test Playlist E2E');
      await page.waitForTimeout(300);
      await screenshotStep(page, '117', '02-create-modal-filled');
    }

    // Close modal without creating
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const stillOpen = await dialog.isVisible().catch(() => false);
    if (stillOpen) {
      await dismissAnyModals(page);
    }
  });

  // =========================================================================
  // PLAY-03: Playlist editor with item addition from media library
  // =========================================================================
  test('PLAY-03: playlist editor with media library', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    const editorOpened = await navigateToPlaylistEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '117', '03-editor-not-accessible');
      return;
    }

    await screenshotStep(page, '117', '03-editor-loaded');

    // Look for media items in the library panel
    const libraryItems = page.locator('[class*="grid"] img, [class*="library"] img').first();
    const hasLibraryItems =
      (await libraryItems.count()) > 0 && (await libraryItems.isVisible().catch(() => false));

    if (hasLibraryItems) {
      // Click a library item to add it to the timeline
      await libraryItems.click();
      await page.waitForTimeout(1000);
      await screenshotStep(page, '117', '03-editor-with-item');
    } else {
      await screenshotStep(page, '117', '03-editor-empty-library');
    }
  });

  // =========================================================================
  // PLAY-04: Playlist item drag-and-drop reordering
  // =========================================================================
  test('PLAY-04: playlist item reordering', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    const editorOpened = await navigateToPlaylistEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '117', '04-editor-not-accessible');
      return;
    }

    // Look for timeline items at the bottom strip
    const timelineItems = page.locator('[draggable="true"]');
    const timelineCount = await timelineItems.count();

    if (timelineCount >= 2) {
      await screenshotStep(page, '117', '04-timeline-items');

      // Hover over the first timeline item to show move controls
      await timelineItems.first().hover();
      await page.waitForTimeout(500);
      await screenshotStep(page, '117', '04-reorder-controls');
    } else if (timelineCount === 1) {
      await screenshotStep(page, '117', '04-timeline-single-item');
    } else {
      // No items - screenshot the empty timeline drop zone
      const dropZone = page.locator('[class*="dashed"]').first();
      if ((await dropZone.count()) > 0) {
        await screenshotStep(page, '117', '04-timeline-empty');
      } else {
        await screenshotStep(page, '117', '04-timeline-area');
      }
    }
  });

  // =========================================================================
  // PLAY-05: Playlist item duration and transition settings
  // =========================================================================
  test('PLAY-05: duration and transition settings', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    const editorOpened = await navigateToPlaylistEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '117', '05-editor-not-accessible');
      return;
    }

    // Click the Settings gear button
    const settingsBtn = page.locator('button[title="Playlist settings"]')
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-settings') }));

    const settingsCount = await settingsBtn.count();
    if (settingsCount === 0) {
      await screenshotStep(page, '117', '05-settings-not-found');
      return;
    }

    await settingsBtn.first().click();
    await page.waitForTimeout(500);

    // Wait for the settings dropdown with Transition Effect heading
    const transitionHeading = page.getByText(/transition effect/i);
    await transitionHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    await screenshotStep(page, '117', '05-transition-settings');

    // Change transition to Fade
    const transitionSelect = page.locator('select').filter({
      has: page.locator('option[value="fade"]'),
    }).first();

    const selectCount = await transitionSelect.count();
    if (selectCount > 0) {
      await transitionSelect.selectOption('fade');
      await page.waitForTimeout(300);
      await screenshotStep(page, '117', '05-transition-fade-selected');
    }
  });

  // =========================================================================
  // PLAY-06: Nested playlist insertion with depth indicator
  // =========================================================================
  test('PLAY-06: nested playlist insertion', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    const editorOpened = await navigateToPlaylistEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '117', '06-editor-not-accessible');
      return;
    }

    // Click the "Playlists" filter tab in the library panel
    const playlistsTab = page.locator('button').filter({ hasText: /^Playlists$/i }).first();
    const tabCount = await playlistsTab.count();

    if (tabCount > 0) {
      await playlistsTab.click();
      await page.waitForTimeout(500);
      await screenshotStep(page, '117', '06-nested-playlists-filter');

      // Check if playlist items appear in the library
      const nestedItems = page.locator('[class*="grid"] [class*="cursor-pointer"], [class*="library"] [class*="cursor-pointer"]');
      const nestedCount = await nestedItems.count();

      if (nestedCount > 0) {
        await screenshotStep(page, '117', '06-nested-playlist-available');
      }
    } else {
      // Fallback: look for filter tabs with different structure
      const filterTabs = page.locator('button[class*="rounded-full"]').filter({ hasText: /playlists/i });
      if ((await filterTabs.count()) > 0) {
        await filterTabs.first().click();
        await page.waitForTimeout(500);
        await screenshotStep(page, '117', '06-nested-playlists-filter');
      } else {
        await screenshotStep(page, '117', '06-playlists-tab-not-found');
      }
    }
  });

  // =========================================================================
  // PLAY-07: Background audio toggle and volume control
  // =========================================================================
  test('PLAY-07: background audio controls', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    const editorOpened = await navigateToPlaylistEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '117', '07-editor-not-accessible');
      return;
    }

    // Open Settings if not already open
    const settingsBtn = page.locator('button[title="Playlist settings"]')
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-settings') }));

    const settingsCount = await settingsBtn.count();
    if (settingsCount > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(500);
    }

    // Look for the Background Audio section
    const audioHeading = page.getByText(/background audio/i);
    const audioVisible = await audioHeading
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (audioVisible) {
      await screenshotStep(page, '117', '07-background-audio-section');

      // Check if there's a volume slider (audio track set) or a select dropdown (no audio)
      const volumeSlider = page.locator('input[type="range"]').first();
      const audioSelect = page.locator('select').filter({
        has: page.locator('option:has-text("Select audio track")'),
      }).first();

      if ((await volumeSlider.count()) > 0 && (await volumeSlider.isVisible().catch(() => false))) {
        await screenshotStep(page, '117', '07-audio-volume-control');
      } else if ((await audioSelect.count()) > 0 && (await audioSelect.isVisible().catch(() => false))) {
        await screenshotStep(page, '117', '07-audio-track-selector');
      }
    } else {
      await screenshotStep(page, '117', '07-audio-section-not-found');
    }
  });

  // =========================================================================
  // PLAY-08: Playlist preview in player mode
  // =========================================================================
  test('PLAY-08: playlist preview player', async ({ page }) => {
    test.slow();

    await navigateToPlaylists(page);

    const editorOpened = await navigateToPlaylistEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '117', '08-editor-not-accessible');
      return;
    }

    // Look for timeline items and click one to select for preview
    const timelineItems = page.locator('[draggable="true"]');
    const timelineCount = await timelineItems.count();

    if (timelineCount > 0) {
      // Click the first timeline item to preview it
      await timelineItems.first().click();
      await page.waitForTimeout(500);
      await screenshotStep(page, '117', '08-player-preview');

      // Click Play button (orange circle button)
      const playBtn = page.locator('button[class*="bg-orange"]').filter({
        has: page.locator('svg'),
      }).first();

      if ((await playBtn.count()) > 0 && (await playBtn.isVisible().catch(() => false))) {
        await playBtn.click();
        await page.waitForTimeout(1000);

        // Look for PLAYING indicator
        const playingIndicator = page.getByText('PLAYING');
        await playingIndicator.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

        await screenshotStep(page, '117', '08-player-playing');

        // Stop playback
        const pauseBtn = page.locator('button[class*="bg-orange"]').filter({
          has: page.locator('svg'),
        }).first();
        if ((await pauseBtn.count()) > 0) {
          await pauseBtn.click().catch(() => null);
        }
      }
    } else {
      // No items - screenshot the empty preview state
      const emptyPreview = page.getByText(/select an item to preview/i);
      if ((await emptyPreview.count()) > 0) {
        await screenshotStep(page, '117', '08-player-empty-preview');
      } else {
        await screenshotStep(page, '117', '08-player-area');
      }
    }
  });
});
