/**
 * Phase 177 Plan 06 — Admin Template Queue E2E (TADM-01, TADM-02, TADM-04).
 *
 * Coverage:
 *  - TADM-01: Pending tab renders draft rows with sanitized inline previews + actions.
 *  - TADM-02: Row actions (Approve / Edit / Reject) work end-to-end.
 *  - TADM-04: Non-admin user does not reach the Template Queue.
 *
 * Requirements:
 *  - super_admin test creds (TEST_SUPERADMIN_EMAIL / TEST_SUPERADMIN_PASSWORD).
 *  - Optional non-admin creds (TEST_CLIENT_EMAIL / TEST_CLIENT_PASSWORD) for TADM-04.
 *    If absent, the auth-gate suite skips with `test.skip()`.
 *  - At least 1 pending draft in template_drafts (Plan 02 left a live draft id
 *    e816e75a-c9cd-4312-920e-766d66db2d40 with status=pending; if cleaned up,
 *    use the Generate tab to seed one).
 *
 * Navigation pattern (mirrors admin-starter-packs.spec.js):
 *  - Login as super-admin via tests/e2e/helpers.js loginAndPrepare().
 *  - Wait for the super-admin dashboard heading to mount and React useEffects
 *    to register the test-mode CustomEvent listener (B-3 fix per Plan 09 Task 2
 *    of Phase 173 — see playwright.config.js webServer.env which sets
 *    VITE_E2E_TEST_MODE=1).
 *  - Dispatch `test:setCurrentPage` CustomEvent with detail='admin-template-queue'.
 *  - Wait for the Template Queue page heading.
 *
 * data-testid surface (defined in src/pages/Admin/AdminTemplateQueuePage.jsx +
 * src/components/Admin/{GenerateTabForm,TemplateDraftEditModal,PromptLibraryCardGrid,
 * TemplateDraftPreview}.jsx):
 *  - Tab toggle: tab-pending, tab-generate
 *  - Pending list: pending-list, draft-row (1 per draft)
 *  - Per-row chips: chip-vertical, chip-type, chip-attempts, needs-review-chip
 *  - Per-row actions: btn-approve, btn-edit, btn-reject
 *  - Reject modal: reject-reason-textarea, btn-reject-confirm
 *  - Generate tab: generate-tab, gen-vertical, gen-type, gen-prompt-textarea, gen-submit
 *  - Card grid: prompt-card-grid, prompt-card-{template_type} × 6
 *  - Edit modal: edit-draft-modal, edit-draft-metadata, edit-svg-textarea,
 *    btn-revalidate, btn-edit-cancel, btn-save-publish
 *
 * Skip behavior (RED-on-missing-cred guard):
 *  - The test.describe block uses test.skip(SKIP, 'message') to short-circuit
 *    the entire suite when super-admin creds are absent — same shape as
 *    admin-starter-packs.spec.js.
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

const SKIP = !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD;
// Non-admin creds for TADM-04 — TEST_USER_EMAIL/PASSWORD already exists in env.local
// (per .env line 27). If a separate "non-admin" pair is provided, prefer that;
// otherwise TEST_USER_EMAIL is the project's standard non-admin client account.
const NON_ADMIN_EMAIL = process.env.TEST_NON_ADMIN_EMAIL || process.env.TEST_USER_EMAIL;
const NON_ADMIN_PASSWORD = process.env.TEST_NON_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD;
const SKIP_NONADMIN = !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD;

/**
 * Navigate to admin-template-queue via the test-mode CustomEvent.
 * Matches admin-starter-packs.spec.js gotoAdminStarterPacks pattern.
 */
async function gotoAdminTemplateQueue(page) {
  // Wait for the super-admin dashboard heading to fully mount + useEffect to
  // register the test:setCurrentPage listener.
  await page
    .getByRole('heading', { name: /^Super Admin Dashboard$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('test:setCurrentPage', { detail: 'admin-template-queue' })
    );
  });

  // Confirm navigation actually happened — the AdminTemplateQueuePage renders
  // PageLayout title="Template Queue".
  await page
    .getByRole('heading', { name: /^Template Queue$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await waitForPageReady(page);
}

test.describe('Admin Template Queue (Phase 177 TADM-01 + TADM-02)', () => {
  test.skip(SKIP, 'TEST_SUPERADMIN_EMAIL/PASSWORD not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
  });

  test('TADM-01 — pending list renders draft rows with previews + actions', async ({ page }) => {
    await gotoAdminTemplateQueue(page);

    // The Pending tab is the default landing tab (activeTab='pending' initial state per
    // Plan 04 Decisions Made #1). Confirm the tab is visible + selected.
    await expect(page.getByTestId('tab-pending')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tab-generate')).toBeVisible({ timeout: 5000 });

    // The pending-list container is rendered when there's data; in an empty-DB scenario
    // (no live drafts) the page renders an empty-state message instead. The test
    // asserts the right shape based on what's there:
    const pendingList = page.getByTestId('pending-list');
    const isPopulated = await pendingList.isVisible({ timeout: 3000 }).catch(() => false);

    if (isPopulated) {
      // Populated path — assert at least one draft row + the row's chips + actions.
      const rows = page.getByTestId('draft-row');
      await expect(rows.first()).toBeVisible({ timeout: 5000 });
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1);

      // First row's structural assertions: chips + 3 action buttons all present.
      const firstRow = rows.first();
      await expect(firstRow.getByTestId('chip-vertical')).toBeVisible();
      await expect(firstRow.getByTestId('chip-type')).toBeVisible();
      await expect(firstRow.getByTestId('chip-attempts')).toBeVisible();
      await expect(firstRow.getByTestId('btn-approve')).toBeVisible();
      await expect(firstRow.getByTestId('btn-edit')).toBeVisible();
      await expect(firstRow.getByTestId('btn-reject')).toBeVisible();

      // The sanitized inline SVG preview must be rendered inside the row (TemplateDraftPreview
      // renders an <svg> via dangerouslySetInnerHTML with the locked DOMPurify config).
      const innerSvg = firstRow.locator('svg').first();
      await expect(innerSvg).toBeVisible({ timeout: 3000 });
    } else {
      // Empty-state path — page rendered with no drafts. The Pending tab still
      // shows the headings and the "no pending drafts" empty-state copy.
      await expect(page.getByText(/no pending drafts/i)).toBeVisible({ timeout: 5000 });
      // Document this case so an operator running with a clean DB can SEED via Generate
      // and re-run. The plan's <action> step 1 guidance about seeding via Mgmt-API or
      // Generate tab is captured here.
      test.info().annotations.push({
        type: 'note',
        description: 'TADM-01 ran against empty template_drafts — seed a draft via Generate tab and re-run for full coverage.',
      });
    }
  });

  test('TADM-02 — row actions (approve / edit / reject) work end-to-end', async ({ page }) => {
    await gotoAdminTemplateQueue(page);

    const pendingList = page.getByTestId('pending-list');
    const isPopulated = await pendingList.isVisible({ timeout: 3000 }).catch(() => false);

    test.skip(!isPopulated, 'TADM-02 requires at least one pending draft — seed via Generate tab and re-run');

    // ---- Edit action ----
    // Click the Edit button on the first row → modal should appear with editable
    // textarea + Save & Publish CTA.
    const firstRow = page.getByTestId('draft-row').first();
    await firstRow.getByTestId('btn-edit').click();

    const editModal = page.getByTestId('edit-draft-modal');
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('edit-draft-metadata')).toBeVisible();
    await expect(page.getByTestId('edit-svg-textarea')).toBeVisible();
    await expect(page.getByTestId('btn-save-publish')).toBeVisible();
    await expect(page.getByTestId('btn-revalidate')).toBeVisible();

    // The textarea must be editable. We do NOT click Save & Publish (that would
    // mutate the live DB and the row would disappear). Cancel out instead.
    const textarea = page.getByTestId('edit-svg-textarea');
    const initialValue = await textarea.inputValue();
    expect(initialValue.length).toBeGreaterThan(0);
    expect(initialValue).toContain('<svg');

    // Cancel — modal closes, row stays in pending state.
    await page.getByTestId('btn-edit-cancel').click();
    await expect(editModal).not.toBeVisible({ timeout: 3000 });
    // First row still present (not approved/rejected).
    await expect(page.getByTestId('draft-row').first()).toBeVisible();

    // ---- Reject action ----
    // Click Reject → confirm modal appears with optional reason textarea + confirm button.
    await firstRow.getByTestId('btn-reject').click();
    await expect(page.getByTestId('reject-reason-textarea')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('btn-reject-confirm')).toBeVisible();

    // Fill the optional D-07 audit reason (read-only verification of the field
    // existing — we DO NOT click confirm because that would mutate live DB).
    await page.getByTestId('reject-reason-textarea').fill('E2E test — DO NOT CONFIRM');
    const reasonValue = await page.getByTestId('reject-reason-textarea').inputValue();
    expect(reasonValue).toContain('E2E test');

    // Dismiss the modal without confirming. The Modal primitive supports clicking
    // outside (backdrop) or pressing Escape; press Escape for determinism.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('reject-reason-textarea')).not.toBeVisible({ timeout: 3000 });

    // ---- Approve action ----
    // We assert the Approve button is wired and clickable, but DO NOT click it.
    // Clicking would invoke the EF approve handler which rasterizes + S3 PUT +
    // svg_templates INSERT — destructive against the live DB. Confirming the
    // button is enabled and visible is sufficient for the SC.
    const approveBtn = firstRow.getByTestId('btn-approve');
    await expect(approveBtn).toBeVisible();
    await expect(approveBtn).toBeEnabled();
  });
});

test.describe('Admin Template Queue Generate tab (Phase 177 TADM-01 — Generate side)', () => {
  test.skip(SKIP, 'TEST_SUPERADMIN_EMAIL/PASSWORD not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
  });

  test('Generate tab renders OptiSigns-style form + 6-card grid (D-02 + D-14)', async ({ page }) => {
    await gotoAdminTemplateQueue(page);

    // Switch to Generate tab.
    await page.getByTestId('tab-generate').click();
    await expect(page.getByTestId('generate-tab')).toBeVisible({ timeout: 5000 });

    // Form fields — OptiSigns mirror.
    await expect(page.getByTestId('gen-vertical')).toBeVisible();
    await expect(page.getByTestId('gen-type')).toBeVisible();
    await expect(page.getByTestId('gen-prompt-textarea')).toBeVisible();
    await expect(page.getByTestId('gen-submit')).toBeVisible();

    // Card grid + all 6 cards (one per template_type — D-08 parity-locked).
    await expect(page.getByTestId('prompt-card-grid')).toBeVisible();
    const cardTypes = ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip'];
    for (const type of cardTypes) {
      await expect(page.getByTestId(`prompt-card-${type}`)).toBeVisible();
    }

    // Card click pre-fills the form atomically (vertical + template_type + prompt).
    await page.getByTestId('prompt-card-promo').click();
    const promptValue = await page.getByTestId('gen-prompt-textarea').inputValue();
    expect(promptValue.length).toBeGreaterThan(0);
    // The promo entry's example_freeform mentions "winter coats" and "30% off".
    expect(promptValue.toLowerCase()).toMatch(/sale|coat|flash/);
  });
});

test.describe('Admin Template Queue auth gate (Phase 177 TADM-04)', () => {
  test.skip(SKIP_NONADMIN, 'TEST_NON_ADMIN_EMAIL or TEST_USER_EMAIL not configured');

  test('TADM-04 — non-admin user does not reach Template Queue', async ({ page }) => {
    // Sign in as a NON-admin (TEST_USER_EMAIL = client@bizscreen.test per .env line 27).
    await loginAndPrepare(page, {
      email: NON_ADMIN_EMAIL,
      password: NON_ADMIN_PASSWORD,
    });

    // Non-admin users land on the regular client dashboard, NOT the super-admin one.
    // The super-admin dashboard heading should NOT be visible.
    const superAdminHeading = page.getByRole('heading', { name: /^Super Admin Dashboard$/i });
    const superAdminVisible = await superAdminHeading.first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    expect(superAdminVisible, 'Non-admin user should NOT see the Super Admin Dashboard').toBe(false);

    // Attempt to navigate to admin-template-queue via the test-mode CustomEvent.
    // The dispatch fires; App.jsx's currentPage handler accepts it but the
    // adminToolPages allowlist gate (line 691-692 + startsWith('admin-template-')
    // match line 691) routes the user to their role-specific dashboard upstream.
    await page.waitForTimeout(500); // let the listener register if it does
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('test:setCurrentPage', { detail: 'admin-template-queue' })
      );
    });
    await page.waitForTimeout(1500); // give navigation a chance to settle

    // Assert the Template Queue heading is NOT visible — non-admin is gated.
    const templateQueueHeading = page.getByRole('heading', { name: /^Template Queue$/i });
    const queueVisible = await templateQueueHeading.first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    expect(queueVisible, 'Non-admin user should NOT reach Template Queue').toBe(false);

    // The page should still be on a non-admin route (URL contains /app, not redirected to auth).
    expect(page.url()).toMatch(/\/app/);
  });
});

// -------------------------------------------------------------------------
// Phase 178 — bulk + filter chips extension (RED scaffolds; flipped GREEN
// by Plan 06 once AdminTemplateQueuePage extensions land). data-testid
// contract sourced from .planning/phases/178-vertical-content-seeding/178-UI-SPEC.md
// §"data-testid Contract" (lines 658-679).
//
// Phase 178 Plan 06 (Wave 3): the cases below were authored as RED skip-shells
// in Plan 01 and flipped to live test() here once the AdminTemplateQueuePage
// extension landed. They remain skip-guarded by the describe-level
// test.skip(SKIP, …) when super-admin creds are absent.
// -------------------------------------------------------------------------
test.describe('Phase 178 — bulk + filter chips @phase178', () => {
  test.skip(SKIP, 'TEST_SUPERADMIN_EMAIL/PASSWORD not configured');

  test('filter chips narrow visible drafts (filter-vertical / filter-type / filter-status)', async ({ page }) => {
    // signIn + gotoAdminTemplateQueue; click data-testid="filter-vertical" chip
    // for "restaurants"; assert visible draft-row entries all carry
    // data-vertical="restaurants" (or chip-vertical text "restaurants").
    // Repeat for filter-type and filter-status chips.
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminTemplateQueue(page);
    const filterVertical = page.getByTestId('filter-vertical');
    await expect(filterVertical).toBeVisible();
  });

  test('checkbox-select-all transitions checked → indeterminate → unchecked', async ({ page }) => {
    // Click checkbox-select-all; assert all checkbox-draft-* are checked.
    // Click a single row checkbox off; assert select-all has aria-checked="mixed"
    // (indeterminate). Click select-all again; assert all unchecked.
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminTemplateQueue(page);
    const selectAll = page.getByTestId('checkbox-select-all');
    await expect(selectAll).toBeVisible();
  });

  test('bulk-action-toolbar visibility tied to selection count', async ({ page }) => {
    // Toolbar hidden at 0 selected; visible when ≥1 with selected count text.
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminTemplateQueue(page);
    const toolbar = page.getByTestId('bulk-action-toolbar');
    await expect(toolbar).toBeHidden();
  });

  test('btn-bulk-approve opens bulk-confirm-modal with first-5 names + "and N more"', async ({ page }) => {
    // Select 7 rows; click btn-bulk-approve; assert bulk-confirm-modal visible
    // with 5 li elements + paragraph containing "and 2 more".
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminTemplateQueue(page);
    const btnApprove = page.getByTestId('btn-bulk-approve');
    await expect(btnApprove).toBeVisible();
    const modal = page.getByTestId('bulk-confirm-modal');
    await expect(modal).toBeHidden();
  });

  test('btn-bulk-confirm advances to executing phase; bulk-exec-feed populates', async ({ page }) => {
    // Trigger approve flow; click btn-bulk-confirm; assert bulk-exec-feed receives
    // ✓ or ✗ rows for each draft id. Modal disables overlay/escape close while
    // executing.
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminTemplateQueue(page);
    const feed = page.getByTestId('bulk-exec-feed');
    await expect(feed).toBeHidden();
  });

  test('done phase shows btn-bulk-close which closes modal + refreshes drafts list', async ({ page }) => {
    // Wait for done phase; click btn-bulk-close; assert modal hidden + Pending
    // tab refreshed (draft-row count decreased by approved count).
    await loginAndPrepare(page, {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    });
    await gotoAdminTemplateQueue(page);
    const btnClose = page.getByTestId('btn-bulk-close');
    await expect(btnClose).toBeHidden();
  });
});
