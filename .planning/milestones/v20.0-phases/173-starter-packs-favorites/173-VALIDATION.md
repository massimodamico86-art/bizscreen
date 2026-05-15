---
phase: 173
slug: starter-packs-favorites
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 173 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Requirement coverage and test strategy derived from 173-RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit + integration) + Playwright (E2E) |
| **Config file** | `vitest.config.js`, `playwright.config.js` |
| **Quick run command** | `npm run test:unit -- --run <pattern>` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~60s unit/integration, ~120s E2E (chromium only) |

---

## Sampling Rate

- **After every task commit:** Run targeted `npm run test:unit -- --run <path>` for the touched service/component
- **After every plan wave:** Run `npm run test:integration` + the wave-relevant E2E spec
- **Before `/gsd-verify-work`:** Full suite (`npm run test && npm run test:e2e`) must be green
- **Max feedback latency:** 30 seconds for per-task unit; 120 seconds for E2E

---

## Per-Task Verification Map

Populated by planner once PLAN.md task IDs exist. Each row binds a `<task>` to a concrete automated command. Planner MUST add a row for every task that touches src/ or supabase/migrations/ — no 3-task gap without a row.

> **Status legend:** ⬜ pending · ✅ green · ❌ red · ⚠️ flaky
> **Status starts at `⬜ pending` for every row at planning time** and flips during execution. The `nyquist_compliant: false` and `wave_0_complete: false` flags in frontmatter ALSO flip during execution, not at planning time.

| Task ID | Plan | Wave | Name | Requirement(s) | Test Type | Automated Command | Status |
|---------|------|------|------|----------------|-----------|-------------------|--------|
| 173-01-01 | 01 | 0 | Create starter-packs fixture + integration test stubs (RED) | TPCK-01..04, TFAV-01..03 | grep (file presence — RED stubs) | `test -f tests/fixtures/starter-packs.js && test -f tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` (full chain in 173-01-PLAN.md `<automated>`) | ⬜ pending |
| 173-01-02 | 01 | 0 | Create PackCard unit test stub + 3 Playwright E2E spec stubs (RED) | TPCK-01..04, TFAV-01..03 | grep (file presence — RED stubs) | `test -f tests/unit/components/PackCard.test.jsx && test -f tests/e2e/starter-packs.spec.js` (full chain in 173-01-PLAN.md `<automated>`) | ⬜ pending |
| 173-02-01 | 02 | 1 | Write migration 171 — template_packs + template_pack_items + RLS | TPCK-01, TPCK-03, TPCK-04 | grep (DDL structure check) | `test -f supabase/migrations/171_template_packs.sql` (full chain in 173-02-PLAN.md `<automated>`) | ⬜ pending |
| 173-02-02 | 02 | 1 | Write migration 172 — template_favorites + RLS + gallery_templates_with_favorites VIEW | TFAV-02, TFAV-03 | grep (DDL + VIEW structure) | `test -f supabase/migrations/172_template_favorites.sql` (full chain in 173-02-PLAN.md `<automated>`) | ⬜ pending |
| 173-03-01 | 03 | 1 | Write migration 173 — atomic apply_starter_pack RPC | TPCK-02 | grep (RPC body structure) | `test -f supabase/migrations/173_apply_starter_pack.sql` (full chain in 173-03-PLAN.md `<automated>`) | ⬜ pending |
| 173-04-01 | 04 | 2 | [BLOCKING] Push migrations 171 + 172 + 173 to live Supabase project | TPCK-01..04, TFAV-01..03 | checkpoint (smoke SELECTs) | `(human gate)` — see 173-04 `<verify>` Step D smoke SELECTs + checkpoint resume-signal | ⬜ pending |
| 173-05-01 | 05 | 3 | Extend marketplaceService.js with 9 pack exports + applyStarterPack wrapper | TPCK-01, TPCK-02, TPCK-03, TPCK-04 | unit (vitest + grep) | `npx vitest run tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` (full chain in 173-05-PLAN.md `<automated>`) — Plan 01 RED test flips to GREEN | ⬜ pending |
| 173-05-02 | 05 | 3 | Extend templateGalleryService.js — VIEW swap + toggleFavorite | TFAV-01, TFAV-03 | grep (export + VIEW swap) | `grep -q "from('gallery_templates_with_favorites')" src/services/templateGalleryService.js` (full chain in 173-05-PLAN.md `<automated>`) | ⬜ pending |
| 173-05-03 | 05 | 3 | Extend marketplaceService.test.js — pack CRUD + applyStarterPack unit tests | TPCK-01, TPCK-02, TPCK-03, TPCK-04 | unit (vitest) | `npx vitest run tests/unit/services/marketplaceService.test.js` (full chain in 173-05-PLAN.md `<automated>`) | ⬜ pending |
| 173-06-01 | 06 | 4 | Create FavoriteButton primitive + barrel export | TFAV-01 | grep (component shape) | `test -f src/design-system/components/FavoriteButton.jsx` (full chain in 173-06-PLAN.md `<automated>`) | ⬜ pending |
| 173-06-02 | 06 | 4 | Add FavoriteButton slot to TemplateCard + wire heart in TemplatePreviewModal | TFAV-01 | grep (slot + wiring) | `grep -q "import FavoriteButton" src/design-system/components/TemplateCard.jsx` (full chain in 173-06-PLAN.md `<automated>`) | ⬜ pending |
| 173-07-01 | 07 | 4 | Create PackCard component (2x2 mosaic + count badge + industry label) | TPCK-01, TPCK-02, TPCK-04 | grep (component shape) | `test -f src/components/template-gallery/PackCard.jsx` (full chain in 173-07-PLAN.md `<automated>`) | ⬜ pending |
| 173-07-02 | 07 | 4 | Create StarterPacksStrip + PackPreviewModal components | TPCK-01, TPCK-02, TPCK-04 | grep (component shape) | `test -f src/components/template-gallery/StarterPacksStrip.jsx` (full chain in 173-07-PLAN.md `<automated>`) | ⬜ pending |
| 173-08-01 | 08 | 5 | TemplateGalleryPage — add favorites filter state + chip + favorite-toggle on card + pack modal mount | TPCK-01, TPCK-02, TPCK-04, TFAV-01, TFAV-02 | grep + build | `grep -q "import StarterPacksStrip" src/pages/TemplateGalleryPage.jsx` (full chain in 173-08-PLAN.md `<automated>`) | ⬜ pending |
| 173-09-01 | 09 | 5 | Create AdminStarterPacksPage (list + actions) and sibling PackEditorPanel.jsx (W-5 split) | TPCK-03 | grep (page + sibling + service wiring) | `test -f src/pages/Admin/AdminStarterPacksPage.jsx && test -f src/pages/Admin/PackEditorPanel.jsx` (full chain in 173-09-PLAN.md `<automated>`) | ⬜ pending |
| 173-09-02 | 09 | 5 | Register admin-starter-packs in App.jsx (4 edits — 3 routing + 1 test-mode listener for B-3) | TPCK-03 | build (`npm run build`) + grep (test:setCurrentPage listener) | `npm run build` + `grep -q "test:setCurrentPage" src/App.jsx` (full chain in 173-09-PLAN.md `<automated>`) | ⬜ pending |
| 173-10-01 | 10 | 6 | Flip unit + integration tests from RED to GREEN | TPCK-04, TFAV-01, TFAV-03 | unit + integration (vitest) | `npx vitest run tests/unit/components/PackCard.test.jsx tests/integration/favorites/view-per-user.test.js` (full chain in 173-10-PLAN.md `<automated>`) | ⬜ pending |
| 173-10-02 | 10 | 6 | Flip 3 Playwright E2E specs from RED to GREEN against live credentials | TPCK-01..04, TFAV-01..03 | e2e (playwright) | `npx playwright test tests/e2e/starter-packs.spec.js tests/e2e/favorites.spec.js tests/e2e/admin-starter-packs.spec.js` (full chain in 173-10-PLAN.md `<automated>`) | ⬜ pending |
| 173-10-03 | 10 | 6 | Manual UAT + ROADMAP success criteria sign-off | TPCK-01..04, TFAV-01..03 | checkpoint (human-verify) | `(human gate)` — see 173-10 Task 3 Step C ROADMAP SC matrix + resume-signal | ⬜ pending |

---

## Wave 0 Requirements

Wave 0 creates test stubs in RED state. All targets MUST exist before Wave 1 begins.

### Test Files (RED stubs — see RESEARCH.md §Validation Architecture)

- [ ] `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` — `apply_starter_pack` all-or-nothing; empty pack returns `[]`; partial-failure rollback. Blueprint: `tests/integration/preview-apply/svg-rpc-atomicity.test.js`.
- [ ] `tests/unit/services/marketplaceService.pack-crud.test.js` — pack CRUD + `applyStarterPack` client wrapper.
- [ ] `tests/unit/services/templateFavoritesService.test.js` — favorite/unfavorite toggle, fetch (or add `fetchMyFavoriteTemplateIds` tests to `templateGalleryService.test.js` if exposure is VIEW-based).
- [ ] `tests/e2e/starter-packs.spec.js` — browse strip → open PackPreviewModal → Apply pack → success toast + View scenes navigation (TPCK-01..04).
- [ ] `tests/e2e/favorites.spec.js` — toggle from card, toggle from modal, filter chip, persist across logout (TFAV-01..03).
- [ ] `tests/integration/gallery-templates-with-favorites.test.js` — (only if VIEW path chosen) tenant isolation + auth.uid() filter correctness. Blueprint: `tests/integration/rls/gallery-templates-view.test.js`.
- [ ] `tests/e2e/admin-starter-packs.spec.js` — super_admin CRUD flow + member reorder (TPCK-03). Blueprint: existing `tests/e2e/admin-templates.spec.js` (if present) else skip with TODO.
- [ ] `tests/unit/components/FavoriteButton.test.jsx` — RED-stubbed unit test for `FavoriteButton` primitive (Plan 06 wires the live primitive; Plan 10 may flip these to GREEN). Three skipped cases: optimistic flip BEFORE await, revert-on-mutation-error, busy-guard re-entry. (Wave 0 stub addition tracked in W-2 fix.)

### Fixtures

- [ ] `tests/fixtures/starter-packs.js` — factory builders for `template_packs`, `template_pack_items`, mixed svg+polotno membership.
- [ ] Existing `tests/fixtures/tenant-b.js` or equivalent tenant helper — REUSED (not recreated) per Phase 170 RLS test harness.

### Dependencies

*No new npm packages required.* Phase 173 is pure assembly over existing test infra (vitest, Playwright, supabase test client, tenant helpers already installed).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pack strip visual layout (horizontal scroll on narrow, 2-3 row wrap on desktop) | TPCK-04 | CSS layout invariants not reliably assertable in headless Playwright without pixel diffing | Open gallery at 375px, 768px, 1440px widths; confirm strip scrolls/wraps per D-10 |
| PackCard 2×2 mosaic thumbnail rendering with brand-tinted placeholders for <4 members | TPCK-04 | Visual — thumbnail image load timing and brand-color fallback are design-review checkpoints | Create pack with 3 members; confirm 4th cell shows brand-tinted placeholder (per D-12) |
| Heart icon visual state transitions (filled red vs outline) on optimistic toggle + revert on error | TFAV-01, TFAV-02 | Animation/flash-of-wrong-state is a design-quality checkpoint, not a correctness check | Toggle heart with network throttled; confirm no flicker on rollback |
| Toast copy, placement, and action button (View scenes) match brand tone | TPCK-02 | Copy review + brand consistency | Run bulk apply, confirm toast text matches "Added [N] templates from [Pack name]" and CTA navigates |

---

## Validation Sign-Off

All rows in the Per-Task Verification Map are populated; checks remain unchecked until corresponding tasks land. The `nyquist_compliant` and `wave_0_complete` frontmatter flags both flip from `false` to `true` during execution (after Plan 01 wave 0 lands and after the full suite is green respectively).

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies — table populated for every task in plans 01..10
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (verified by table — every task row has a command)
- [ ] Wave 0 covers all test-file MISSING references above
- [ ] No watch-mode flags in any automated command
- [ ] Feedback latency < 30s (unit), < 120s (E2E)
- [ ] `nyquist_compliant: true` set in frontmatter (flips after Plan 01 commit)
- [ ] `wave_0_complete: true` set in frontmatter (flips after Plan 01 commit)

**Approval:** pending (status flips during execution; planning-time approval is "table populated, awaiting RED→GREEN flips per task")
