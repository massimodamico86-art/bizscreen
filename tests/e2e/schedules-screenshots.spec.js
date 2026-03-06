/**
 * Schedules E2E Screenshot Tests
 *
 * Captures screenshot evidence for schedule management workflows:
 * - SCHED-01: Schedule list page with create/delete actions
 * - SCHED-02: Schedule creation with time range and day selection
 * - SCHED-03: Schedule editor with playlist/layout assignment
 * - SCHED-04: Conflict detection warning
 * - SCHED-05: Dayparting preset (Quick Apply time block)
 * - SCHED-06: Recurring schedule entry (repeat options)
 *
 * Screenshots saved to screenshots/118/ using screenshotStep helper.
 * Uses step numbers 10-15 to avoid collision with template screenshots (01-08).
 *
 * Strategy: When the Supabase backend is unavailable, the tests mock API
 * responses via page.route() so the schedule editor renders with fake data.
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

// Mock schedule data for when backend is unavailable
const MOCK_SCHEDULE_ID = 'e2e-test-schedule-001';
const MOCK_SCHEDULE = {
  id: MOCK_SCHEDULE_ID,
  name: 'Morning Promotions',
  description: 'Breakfast and lunch content rotation',
  is_active: true,
  owner_id: 'e2e-test-user',
  entry_count: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_SCHEDULE_2 = {
  id: 'e2e-test-schedule-002',
  name: 'Evening Schedule',
  description: 'Dinner and late-night content',
  is_active: false,
  owner_id: 'e2e-test-user',
  entry_count: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_ENTRIES = [
  {
    id: 'entry-001',
    schedule_id: MOCK_SCHEDULE_ID,
    content_type: 'playlist',
    content_id: 'playlist-001',
    content_name: 'Breakfast Menu',
    target_type: 'playlist',
    target_id: 'playlist-001',
    start_time: '08:00:00',
    end_time: '11:00:00',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    event_type: 'content',
    repeat_type: 'weekday',
    priority: 3,
    is_active: true,
  },
  {
    id: 'entry-002',
    schedule_id: MOCK_SCHEDULE_ID,
    content_type: 'layout',
    content_id: 'layout-001',
    content_name: 'Lunch Special Layout',
    target_type: 'layout',
    target_id: 'layout-001',
    start_time: '11:00:00',
    end_time: '14:00:00',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    event_type: 'content',
    repeat_type: 'daily',
    priority: 3,
    is_active: true,
  },
  {
    id: 'entry-003',
    schedule_id: MOCK_SCHEDULE_ID,
    content_type: 'playlist',
    content_id: 'playlist-002',
    content_name: 'Afternoon Promos',
    target_type: 'playlist',
    target_id: 'playlist-002',
    start_time: '14:00:00',
    end_time: '17:00:00',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    event_type: 'content',
    repeat_type: 'none',
    priority: 5,
    is_active: true,
  },
];

const MOCK_PLAYLISTS = [
  { id: 'playlist-001', name: 'Breakfast Menu', owner_id: 'e2e-test-user' },
  { id: 'playlist-002', name: 'Afternoon Promos', owner_id: 'e2e-test-user' },
];

const MOCK_LAYOUTS = [
  { id: 'layout-001', name: 'Lunch Special Layout', owner_id: 'e2e-test-user' },
];

/**
 * Set up Supabase API route mocking for the schedule editor.
 * Intercepts REST API calls and returns mock data so the editor UI
 * renders even when the backend is unavailable.
 */
async function setupScheduleMocking(page) {
  // Mock schedules table
  await page.route('**/rest/v1/schedules?*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'GET') {
      if (url.includes(`id=eq.${MOCK_SCHEDULE_ID}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: JSON.stringify(MOCK_SCHEDULE),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-1/2' },
          body: JSON.stringify([MOCK_SCHEDULE, MOCK_SCHEDULE_2]),
        });
      }
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SCHEDULE),
      });
    } else if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SCHEDULE),
      });
    } else {
      await route.continue();
    }
  });

  // Mock schedule_entries table
  await page.route('**/rest/v1/schedule_entries?*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${MOCK_ENTRIES.length - 1}/${MOCK_ENTRIES.length}` },
        body: JSON.stringify(MOCK_ENTRIES),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ENTRIES[0]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock playlists table
  await page.route('**/rest/v1/playlists?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${MOCK_PLAYLISTS.length - 1}/${MOCK_PLAYLISTS.length}` },
        body: JSON.stringify(MOCK_PLAYLISTS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock layouts table
  await page.route('**/rest/v1/layouts?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${MOCK_LAYOUTS.length - 1}/${MOCK_LAYOUTS.length}` },
        body: JSON.stringify(MOCK_LAYOUTS),
      });
    } else {
      await route.continue();
    }
  });

  // Mock scenes table
  await page.route('**/rest/v1/scenes?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock devices and device_groups
  await page.route('**/rest/v1/devices?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/rest/v1/device_groups?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock plan limits
  await page.route('**/rest/v1/plan_limits?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ max_schedules: 50 }]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock RPC calls
  await page.route('**/rest/v1/rpc/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock campaigns table
  await page.route('**/rest/v1/campaigns?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Navigate to the schedule editor via __setCurrentPage.
 * Sets up mocking first to ensure editor can render.
 * Returns true if the editor loaded successfully.
 */
async function navigateToScheduleEditor(page) {
  await setupScheduleMocking(page);

  await page.evaluate((id) => {
    if (window.__setCurrentPage) {
      window.__setCurrentPage('schedule-editor-' + id);
    }
  }, MOCK_SCHEDULE_ID);

  // Wait for editor indicators
  const editorLoaded = await waitForEditorIndicators(page);
  if (editorLoaded) return true;

  // Retry with page reload (mocking persists)
  await page.reload();
  await waitForPageReady(page);

  await page.evaluate((id) => {
    if (window.__setCurrentPage) {
      window.__setCurrentPage('schedule-editor-' + id);
    }
  }, MOCK_SCHEDULE_ID);

  return await waitForEditorIndicators(page);
}

/**
 * Wait for schedule editor UI indicators to appear.
 */
async function waitForEditorIndicators(page) {
  const indicators = [
    page.getByText(/all schedules/i),
    page.getByText(/events list/i),
    page.locator('text=Today'),
    page.locator('select option[value="week"]'),
  ];

  const result = await Promise.race(
    indicators.map((loc) =>
      loc.waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false)
    )
  );

  if (result) {
    await waitForPageReady(page);
  }
  return result;
}

/**
 * Open the New Event modal in the schedule editor.
 * Uses dispatchEvent to bypass modal overlay interception.
 */
async function openEventModal(page) {
  // Use dispatchEvent to bypass overlay interception
  await page.evaluate(() => {
    // Look for the orange + button in the calendar toolbar
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => {
      const style = window.getComputedStyle(b);
      const hasSvg = b.querySelector('svg.lucide-plus');
      const isBgOrange = style.backgroundColor.includes('242') || b.className.includes('f26f21');
      return hasSvg && (isBgOrange || b.closest('.border-b'));
    });
    if (addBtn) {
      addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return;
    }
    // Fallback: click first time slot cell
    const cell = document.querySelector('[class*="min-h-"]');
    if (cell) {
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });

  await page.waitForTimeout(500);

  // Check if modal appeared
  const modal = page.locator('.fixed.inset-0').filter({
    has: page.locator('text=New Event, text=Edit Event'),
  }).first();

  // Fallback: any fixed overlay
  const anyModal = page.locator('.fixed.inset-0').first();
  const modalVisible = await modal
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(async () => {
      return await anyModal
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);
    });

  return modalVisible;
}

/**
 * Close the event modal using dispatchEvent to bypass overlay interception.
 */
async function closeEventModal(page) {
  await page.evaluate(() => {
    // Find Cancel button inside the modal
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return;
    const buttons = Array.from(modal.querySelectorAll('button'));
    const cancelBtn = buttons.find(b => b.textContent.trim() === 'Cancel');
    if (cancelBtn) {
      cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return;
    }
    // Fallback: click the X button
    const closeBtn = buttons.find(b => b.querySelector('svg.lucide-x'));
    if (closeBtn) {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await page.waitForTimeout(300);
}

test.describe('Schedules Screenshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
    test.skip(!process.env.TEST_USER_EMAIL, 'Client test credentials not configured');

    await loginAndPrepare(page);
    await assertAppReady(page, test);
  });

  // =========================================================================
  // SCHED-01: Schedule list page with create/delete actions
  // =========================================================================
  test('SCHED-01: schedule list page with create and delete actions', async ({ page }) => {
    test.slow();

    await navigateToSection(page, 'schedules');
    await waitForPageReady(page);

    // Wait for page heading or error state
    const heading = page.getByRole('heading', { name: /schedules/i }).first();
    const errorState = page.getByText(/unable to load schedules/i);

    await Promise.race([
      heading.waitFor({ state: 'visible', timeout: 10000 }),
      errorState.waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => null);

    // Screenshot the schedules list page (may show list, empty state, or error)
    await screenshotStep(page, '118', '10-schedules-list');

    // Try to open create modal
    const addBtn = page.locator('button').filter({ hasText: /add schedule/i }).first();
    const createScheduleBtn = page.locator('button').filter({ hasText: /create schedule/i }).first();
    const actionBtn = addBtn.or(createScheduleBtn);

    if ((await actionBtn.count()) > 0 && (await actionBtn.first().isVisible().catch(() => false))) {
      // Use dispatchEvent to bypass modal overlay interception
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b =>
          b.textContent.includes('Add Schedule') || b.textContent.includes('Create Schedule')
        );
        if (btn) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      });

      await page.waitForTimeout(500);

      // Check if create modal or limit modal appeared
      const modal = page.locator('.fixed.inset-0').first();
      const modalVisible = await modal
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      if (modalVisible) {
        await screenshotStep(page, '118', '10-schedules-create-modal');

        // Close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        const stillOpen = await modal.isVisible().catch(() => false);
        if (stillOpen) {
          await dismissAnyModals(page);
        }
      }
    }

    // Check for action menu on any schedule (MoreVertical icon)
    const moreVertBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-more-vertical'),
    }).first();

    if ((await moreVertBtn.count()) > 0 && (await moreVertBtn.isVisible().catch(() => false))) {
      await moreVertBtn.click();
      await page.waitForTimeout(300);

      // Look for delete option in dropdown
      const deleteOption = page.locator('button').filter({ hasText: /delete/i });
      const hasDelete = (await deleteOption.count()) > 0 && (await deleteOption.first().isVisible().catch(() => false));

      if (hasDelete) {
        await screenshotStep(page, '118', '10-schedules-action-menu-delete');
      }

      // Close dropdown by clicking elsewhere
      await page.locator('body').click({ position: { x: 10, y: 10 }, force: true });
      await page.waitForTimeout(300);
    }
  });

  // =========================================================================
  // SCHED-02: Schedule creation with time range and day selection
  // =========================================================================
  test('SCHED-02: schedule creation with time range and day selection', async ({ page }) => {
    test.slow();

    await navigateToSection(page, 'schedules');
    await waitForPageReady(page);

    // Try to open create modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent.includes('Add Schedule') || b.textContent.includes('Create Schedule')
      );
      if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });

    await page.waitForTimeout(500);

    // Check if modal appeared
    const modal = page.locator('.fixed.inset-0').first();
    const modalVisible = await modal
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (modalVisible) {
      // Scope to the modal to avoid search bar ambiguity
      const nameInput = page.locator('.fixed.inset-0 input[placeholder*="schedule name" i]').first();
      const inputCount = await nameInput.count();

      if (inputCount > 0 && (await nameInput.isVisible().catch(() => false))) {
        await nameInput.fill('Morning Promotions');
        await page.waitForTimeout(300);
        await screenshotStep(page, '118', '11-schedule-create-form-filled');
      } else {
        // Might be limit modal
        await screenshotStep(page, '118', '11-schedule-limit-modal');
      }

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const stillOpen = await modal.isVisible().catch(() => false);
      if (stillOpen) {
        await dismissAnyModals(page);
      }
    }

    // Navigate to schedule editor for time range and day selection
    const editorOpened = await navigateToScheduleEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '118', '11-schedule-editor-not-accessible');
      return;
    }

    // Open event modal to show time/day fields
    const modalOpened = await openEventModal(page);
    if (modalOpened) {
      // Screenshot the event modal showing time range and day selection
      await screenshotStep(page, '118', '11-schedule-time-day-selection');
    } else {
      // Screenshot the editor calendar showing day columns and time slots
      await screenshotStep(page, '118', '11-schedule-editor-calendar');
    }
  });

  // =========================================================================
  // SCHED-03: Schedule editor with playlist/layout assignment
  // =========================================================================
  test('SCHED-03: schedule editor with playlist and layout assignment', async ({ page }) => {
    test.slow();

    await navigateToSection(page, 'schedules');
    await waitForPageReady(page);

    const editorOpened = await navigateToScheduleEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '118', '12-editor-not-accessible');
      return;
    }

    // Screenshot the editor page showing the calendar and events list
    await screenshotStep(page, '118', '12-schedule-editor-overview');

    // Open event modal to show content assignment (playlist/layout dropdown)
    const modalOpened = await openEventModal(page);
    if (modalOpened) {
      // The event modal has content type selector (Playlist/Layout/Scene)
      const contentTypeSelect = page.locator('select').filter({
        has: page.locator('option[value="playlist"]'),
      }).first();

      if ((await contentTypeSelect.count()) > 0 && (await contentTypeSelect.isVisible().catch(() => false))) {
        // Select "Playlist" using evaluate to bypass overlay
        await page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll('.fixed.inset-0 select'));
          const contentSelect = selects.find(s => {
            const opts = Array.from(s.options);
            return opts.some(o => o.value === 'playlist');
          });
          if (contentSelect) {
            contentSelect.value = 'playlist';
            contentSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await page.waitForTimeout(300);
        await screenshotStep(page, '118', '12-schedule-playlist-assignment');

        // Switch to Layout
        await page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll('.fixed.inset-0 select'));
          const contentSelect = selects.find(s => {
            const opts = Array.from(s.options);
            return opts.some(o => o.value === 'layout');
          });
          if (contentSelect) {
            contentSelect.value = 'layout';
            contentSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await page.waitForTimeout(300);
        await screenshotStep(page, '118', '12-schedule-layout-assignment');
      } else {
        await screenshotStep(page, '118', '12-schedule-event-modal');
      }

      // Close modal via dispatchEvent to bypass overlay
      await closeEventModal(page);
    }
  });

  // =========================================================================
  // SCHED-04: Conflict detection warning
  // =========================================================================
  test('SCHED-04: conflict detection warning', async ({ page }) => {
    test.slow();

    await navigateToSection(page, 'schedules');
    await waitForPageReady(page);

    const editorOpened = await navigateToScheduleEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '118', '13-editor-not-accessible');
      return;
    }

    // Open event modal
    const modalOpened = await openEventModal(page);
    if (modalOpened) {
      // Set up overlapping time to trigger conflict detection via evaluate
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return;
        // Find time inputs within the modal
        const timeInputs = modal.querySelectorAll('input[type="time"]');
        if (timeInputs[0]) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(timeInputs[0], '09:00');
          timeInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          timeInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (timeInputs[1]) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(timeInputs[1], '10:00');
          timeInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          timeInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Select content type
        const selects = Array.from(modal.querySelectorAll('select'));
        const contentSelect = selects.find(s => {
          const opts = Array.from(s.options);
          return opts.some(o => o.value === 'playlist');
        });
        if (contentSelect) {
          contentSelect.value = 'playlist';
          contentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.waitForTimeout(500);

      // Check for ConflictWarning component
      const conflictWarning = page.getByText(/conflict/i).first();
      const hasConflict = await conflictWarning
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      if (hasConflict) {
        await screenshotStep(page, '118', '13-schedule-conflict-warning');
      } else {
        // Conflict detection may not trigger with mock data
        // Screenshot the modal showing the overlapping time setup
        await screenshotStep(page, '118', '13-schedule-conflict-inactive');
      }

      // Also check if the Save button shows conflict state
      const conflictSaveBtn = page.locator('button').filter({ hasText: /resolve conflicts/i });
      if ((await conflictSaveBtn.count()) > 0 && (await conflictSaveBtn.isVisible().catch(() => false))) {
        await screenshotStep(page, '118', '13-schedule-conflict-save-disabled');
      }

      // Close modal via dispatchEvent to bypass overlay
      await closeEventModal(page);
    } else {
      // Screenshot the editor noting no conflict visible
      await screenshotStep(page, '118', '13-schedule-no-event-modal');
    }
  });

  // =========================================================================
  // SCHED-05: Dayparting preset (Quick Apply time block)
  // =========================================================================
  test('SCHED-05: dayparting preset selection', async ({ page }) => {
    test.slow();

    await navigateToSection(page, 'schedules');
    await waitForPageReady(page);

    const editorOpened = await navigateToScheduleEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '118', '14-editor-not-accessible');
      return;
    }

    // Open event modal to find DaypartPicker
    const modalOpened = await openEventModal(page);
    if (modalOpened) {
      // Scroll down within the modal to find Quick Apply / DaypartPicker
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0 .overflow-y-auto');
        if (modal) modal.scrollTop = 300;
      });
      await page.waitForTimeout(300);

      // Look for Quick Apply heading or DaypartPicker buttons
      const quickApply = page.getByText(/quick apply/i).first();
      const daypartVisible = await quickApply
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      if (daypartVisible) {
        await screenshotStep(page, '118', '14-schedule-daypart-picker');

        // Click the Quick Apply Time Block button using dispatchEvent
        await page.evaluate(() => {
          const modal = document.querySelector('.fixed.inset-0');
          if (!modal) return;
          const buttons = Array.from(modal.querySelectorAll('button'));
          const qab = buttons.find(b => b.textContent.includes('Quick Apply Time Block'));
          if (qab) {
            qab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        });
        await page.waitForTimeout(500);

        // Look for expanded daypart preset options
        const daypartButtons = page.locator('button').filter({ hasText: /breakfast|lunch|dinner|morning|evening/i });
        const daypartCount = await daypartButtons.count();

        if (daypartCount > 0) {
          // Click the first preset button using dispatchEvent
          await page.evaluate(() => {
            const modal = document.querySelector('.fixed.inset-0');
            if (!modal) return;
            const buttons = Array.from(modal.querySelectorAll('button'));
            const preset = buttons.find(b =>
              /breakfast|lunch|dinner|morning|evening/i.test(b.textContent)
            );
            if (preset) {
              preset.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          });
          await page.waitForTimeout(500);
          await screenshotStep(page, '118', '14-schedule-daypart-applied');
        } else {
          await screenshotStep(page, '118', '14-schedule-daypart-expanded');
        }
      } else {
        // DaypartPicker may be rendered but not scrolled to
        // Screenshot the full modal showing settings
        await screenshotStep(page, '118', '14-schedule-event-modal-settings');
      }

      // Close modal via dispatchEvent to bypass overlay
      await closeEventModal(page);
    } else {
      await screenshotStep(page, '118', '14-daypart-no-event-modal');
    }
  });

  // =========================================================================
  // SCHED-06: Recurring schedule entry (repeat options)
  // =========================================================================
  test('SCHED-06: recurring schedule entry repeat options', async ({ page }) => {
    test.slow();

    await navigateToSection(page, 'schedules');
    await waitForPageReady(page);

    const editorOpened = await navigateToScheduleEditor(page);
    if (!editorOpened) {
      await screenshotStep(page, '118', '15-editor-not-accessible');
      return;
    }

    // Open event modal to find Repeat Options section
    const modalOpened = await openEventModal(page);
    if (modalOpened) {
      // Scroll to Repeat Options section
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0 .overflow-y-auto');
        if (modal) modal.scrollTop = modal.scrollHeight;
      });
      await page.waitForTimeout(300);

      // Look for Repeat Options heading
      const repeatHeading = page.getByText(/repeat options/i);
      const repeatVisible = await repeatHeading
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      if (repeatVisible) {
        await screenshotStep(page, '118', '15-schedule-repeat-options');
      }

      // Use evaluate to change repeat dropdown (avoids overlay interception)
      const weeklySet = await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return false;
        const selects = Array.from(modal.querySelectorAll('select'));
        // Find the repeat select - it has options with value "daily", "weekly", etc.
        const repeatSelect = selects.find(s => {
          const opts = Array.from(s.options);
          return opts.some(o => o.value === 'weekly');
        });
        if (repeatSelect) {
          repeatSelect.value = 'weekly';
          repeatSelect.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      });

      if (weeklySet) {
        await page.waitForTimeout(300);
        await screenshotStep(page, '118', '15-schedule-repeat-weekly');

        // Switch to 'custom' to show custom repeat options
        await page.evaluate(() => {
          const modal = document.querySelector('.fixed.inset-0');
          if (!modal) return;
          const selects = Array.from(modal.querySelectorAll('select'));
          const repeatSelect = selects.find(s => {
            const opts = Array.from(s.options);
            return opts.some(o => o.value === 'custom');
          });
          if (repeatSelect) {
            repeatSelect.value = 'custom';
            repeatSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await page.waitForTimeout(300);

        // Scroll down again to reveal custom repeat UI
        await page.evaluate(() => {
          const modal = document.querySelector('.fixed.inset-0 .overflow-y-auto');
          if (modal) modal.scrollTop = modal.scrollHeight;
        });
        await page.waitForTimeout(300);

        await screenshotStep(page, '118', '15-schedule-repeat-custom');
      } else {
        // Screenshot whatever repeat UI is visible
        await screenshotStep(page, '118', '15-schedule-repeat-section');
      }

      // Close modal via dispatchEvent to bypass overlay
      await closeEventModal(page);
    } else {
      await screenshotStep(page, '118', '15-repeat-no-event-modal');
    }
  });
});
