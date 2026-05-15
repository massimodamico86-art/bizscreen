---
phase: 173-starter-packs-favorites
plan: 05
subsystem: service-layer
tags: [service-layer, api, starter-packs, favorites, marketplace-service, template-gallery-service]

requires:
  - phase: 173-starter-packs-favorites
    plan: 01
    provides: RED atomicity test (4 cases) + RED view-per-user stub — unblocked targets for this plan to flip
  - phase: 173-starter-packs-favorites
    plan: 04
    provides: live DB schema on gdxizdiltfqeugbsgtpx — template_packs, template_pack_items, template_favorites, gallery_templates_with_favorites VIEW, apply_starter_pack RPC

provides:
  - src/services/marketplaceService.js — 9 new pack exports (fetchStarterPacks, fetchPackDetail, createPack, updatePack, deletePack, addPackItem, removePackItem, reorderPackItems, applyStarterPack)
  - src/services/templateGalleryService.js — VIEW swap + toggleFavorite export (single boundary for per-user favorite writes)
  - tests/unit/services/marketplaceService.test.js — 11 new unit test cases (7 pack CRUD + 4 applyStarterPack)

affects:
  - 173-06-PLAN (FavoriteButton primitive — consumes toggleFavorite)
  - 173-07-PLAN (PackCard, StarterPacksStrip, PackPreviewModal — consume fetchStarterPacks, fetchPackDetail, applyStarterPack)
  - 173-08-PLAN (TemplateGalleryPage integration — consumes fetchGalleryTemplates VIEW rows with is_favorited, toggleFavorite, fetchStarterPacks)
  - 173-09-PLAN (AdminStarterPacksPage — consumes create/update/delete/add/remove/reorderPackItems)
  - 173-10-PLAN (verification wave — Plan 01 atomicity test already flipped GREEN here)

tech-stack:
  added: []
  patterns:
    - "Thin RPC client wrapper (applyStarterPack) — no client-side iteration/fallback preserves D-07 all-or-nothing atomicity"
    - "Colocated favorites write (toggleFavorite in templateGalleryService.js) — single boundary, D-04 keeps marketplaceService focused on pack CRUD"
    - "VIEW swap via select('*') — additive is_favorited column propagates automatically; existing callers ignore it transparently (Pattern 4)"
    - "Parallel single-row UPDATEs via Promise.all (reorderPackItems) — safe because PK is composite (pack_id, template_id, editor_type), not (pack_id, position); Pitfall 4 cleared"
    - "PG 23505 duplicate-key tolerance on favorite insert — idempotent toggle for optimistic UI (Pattern 5 compatible)"
    - "Deep chainable supabase.from() mock (installDeepFromMock helper) — works around vi.clearAllMocks preserving prior mockReturnValue state"

key-files:
  created: []
  modified:
    - src/services/marketplaceService.js
    - src/services/templateGalleryService.js
    - tests/unit/services/marketplaceService.test.js

key-decisions:
  - "[173-05] applyStarterPack is a thin one-line wrapper over supabase.rpc('apply_starter_pack', { p_pack_id: packId }) — NO client-side loop/fallback. Atomicity lives on the server; violating this breaks the D-07 rollback contract."
  - "[173-05] toggleFavorite lives in templateGalleryService.js (colocated with gallery read) — NOT in marketplaceService.js (reserved for pack CRUD per D-04). Single boundary for favorites writes honors Claude's Discretion recommendation from CONTEXT."
  - "[173-05] VIEW swap from 'gallery_templates' to 'gallery_templates_with_favorites' is unconditional — no feature flag. Callers that destructure rows ignore the new is_favorited column transparently; per Pattern 4 future VIEW additions propagate with zero service changes."
  - "[173-05] reorderPackItems issues parallel UPDATEs via Promise.all — safe because template_pack_items PK is composite (Pitfall 4 clear). Mirrors existing reorderTemplateSlides shape."
  - "[173-05] Unit-test mock hardening: installDeepFromMock() helper restores a deep chainable from() factory in beforeEach because vi.clearAllMocks() preserves prior tests' supabase.from.mockReturnValue overrides, which breaks the .insert/.update/.delete/.select.order.order chains the pack functions need. Rule 1 fix applied inline."
  - "[173-05] No getEffectiveOwnerId import added for pack CRUD — packs use tenant_id column directly (admin writes it; null = global); getEffectiveOwnerId is reserved for tenant-switched reads, not for pack authoring."

requirements-completed: [TPCK-01, TPCK-02, TPCK-03, TPCK-04, TFAV-01, TFAV-03]

metrics:
  duration: 4min
  completed: 2026-04-23
  files_modified: 3
  tasks_completed: 3
  tests_added: 11
  tests_green: 39  # 35 in marketplaceService.test.js (24 prior + 11 new) + 4 atomicity
  lines_added: ~315  # service additions + test additions
---

# Phase 173 Plan 05: Service Layer (Pack CRUD + Favorites) Summary

**9 new pack functions added to marketplaceService.js, VIEW swap + toggleFavorite added to templateGalleryService.js, and 11 new unit cases covering pack CRUD + bulk-apply — Plan 01 RED atomicity test (4 cases) flipped GREEN on the first run, unblocking every UI consumer in Plans 06..09.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-23T13:02:54Z
- **Completed:** 2026-04-23T13:06:32Z
- **Tasks:** 3
- **Files modified:** 3
- **Files created:** 0
- **Tests:** 11 new, 39 total GREEN across the two files this plan touched

## Accomplishments

- **Atomicity test flipped RED→GREEN on first attempt:** `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` 4/4 pass immediately after Task 1 — proves the Nyquist Wave 0 → Wave 3 contract from Plan 01 held exactly as designed.
- **applyStarterPack is a one-liner wrapper** (3 effective lines: rpc call, error throw, return data ?? []) — no client-side loop, no fallback, no retry inside the wrapper. D-07 atomicity preserved cleanly.
- **9 new marketplaceService exports** (22 → 31 total); file grew from 505 → 636 lines (131 added, exceeds ≥100 plan requirement).
- **VIEW swap landed surgically:** 1-line change at line 51 of templateGalleryService.js (`gallery_templates` → `gallery_templates_with_favorites`) + append-only `toggleFavorite` function. Existing `fetchGalleryTemplates` signature preserved; callers get free `is_favorited` column with zero code changes.
- **toggleFavorite is idempotent on insert** via PG 23505 tolerance — optimistic-UI friendly per Pattern 5 (the Plan 06 FavoriteButton will consume this without any revert-on-duplicate logic of its own).
- **11 new it() cases all passing** covering fetchStarterPacks, createPack, updatePack, deletePack, addPackItem, removePackItem, reorderPackItems (parallel UPDATE proof), and 4 applyStarterPack cases (happy path, data array, null default, error propagation).
- **No regressions:** all 24 prior test cases in marketplaceService.test.js still pass; total 35/35.
- **No existing exports modified:** `grep -c "^export"` pre-plan was 22, post-plan is 31 = prior + 9 new; zero deletions or edits to the existing marketplace surface.

## Task Commits

1. **Task 1: Extend marketplaceService.js with 9 pack exports + applyStarterPack wrapper** — `d5d08ddd` (feat)
2. **Task 2: Extend templateGalleryService.js — VIEW swap + toggleFavorite** — `4cd091e3` (feat)
3. **Task 3: Extend marketplaceService.test.js — pack CRUD + applyStarterPack unit tests** — `a269f844` (test)

_Metadata commit for SUMMARY/STATE/ROADMAP recorded as the final commit in this plan._

## Files Created/Modified

### Modified (3)

- `src/services/marketplaceService.js` (+131 lines) — 9 new pack exports appended after `uploadTemplatePreview`; 1 new section divider comment `// STARTER PACKS (Phase 173) //`; no imports added; no existing exports touched.
- `src/services/templateGalleryService.js` (+32 / -1 lines) — VIEW swap at line 51 (`gallery_templates` → `gallery_templates_with_favorites`) and `toggleFavorite` export appended; function signature of `fetchGalleryTemplates` preserved.
- `tests/unit/services/marketplaceService.test.js` (+152 lines) — 2 new describe blocks with 11 it() cases, plus `installDeepFromMock()` helper for deep chainable `from()` factory restoration in `beforeEach` (Rule 1 auto-fix — see Deviations).

### Created
None — this is a service-layer extension plan; no new files.

## Decisions Made

- **applyStarterPack stays a thin RPC wrapper.** Not a client-side loop calling `clone_svg_template_to_scene` N times (Pattern 1 anti-pattern). Server transaction is the only atomic boundary.
- **toggleFavorite lives in templateGalleryService, not marketplaceService.** D-04 carves marketplaceService for pack CRUD; CONTEXT Claude's Discretion places favorites writes with the gallery read for a single boundary.
- **VIEW swap is unconditional, no feature flag.** Every gallery read now carries `is_favorited`; rollback would be a code edit, not a toggle. Acceptable because migration 172 deployed 2026-04-23 and the VIEW is live.
- **reorderPackItems uses composite-key WHERE (pack_id, template_id, editor_type), not a synthetic row id.** Mirrors the existing `reorderTemplateSlides` shape. Pitfall 4 explicitly cleared because the PK has no (pack_id, position) UNIQUE to collide on.
- **Pack CRUD exports write tenant_id directly from the caller payload** — no `getEffectiveOwnerId` call. Admin writes null for global packs; per-tenant CRUD is forward-compat but v20.0 surface is super_admin only (RLS enforces).
- **Test file extended with deep-mock helper instead of refactoring the top-of-file mock.** Leaves the 24 existing tests untouched — no risk of regressions from mock surgery. The helper is scoped to the new describe blocks only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unit test mock leakage between describe blocks**

- **Found during:** Task 3 verify — 7 of 11 new pack-CRUD tests failed with `TypeError: supabase.from(...).insert is not a function` (and similar for update/delete/select.order.order).
- **Issue:** The existing top-of-file supabase mock uses `from: vi.fn(() => ({...chainable...}))`. Earlier test blocks (e.g. `fetchCategories`) call `supabase.from.mockReturnValue({ select: mockSelect })` which persists across `vi.clearAllMocks()` — `clearAllMocks` resets call history but does NOT clear `mockReturnValue` overrides. By the time the new pack-CRUD describe runs, `from()` returns the narrow `{ select: mockSelect }` shape from `fetchCategories`, missing `.insert/.update/.delete` and missing chained `.order().order()` needed by `fetchStarterPacks`.
- **Fix:** Added `installDeepFromMock()` helper in the new describe block's scope; called from `beforeEach` alongside `vi.clearAllMocks()`. The helper uses `supabase.from.mockImplementation(() => ({...deep chainable with select/insert/update/delete/order.order...}))` to restore a full chainable factory per test. Existing tests untouched; their `mockReturnValue` calls continue to work for their own lifetime.
- **Files modified:** `tests/unit/services/marketplaceService.test.js` (helper definition + beforeEach update).
- **Commit:** `a269f844` (folded into Task 3 commit — one coherent unit of work).
- **Verification:** 35/35 tests pass (24 prior + 11 new).

No other deviations. Plan 01's atomicity test flipped GREEN on the very first Task 1 run without any iteration.

## Issues Encountered

**Test mock leakage (addressed above under Deviations — Rule 1 auto-fix).** Took ~1 minute to diagnose and resolve. Pattern logged for future plans that extend this test file.

## User Setup Required

None — plan is purely service-layer JavaScript additions. Live DB objects already exist (deployed Wave 2, 2026-04-23T02:15:00Z).

## Known Stubs

None — every new export fully wires to live DB objects or the atomic RPC. No placeholder data paths introduced.

## Threat Flags

None beyond the `<threat_model>` already declared in the plan. No new surface introduced that was not enumerated in the plan's STRIDE register (T-173-05-01..05 — all mitigated or accepted as designed).

## Next Phase Readiness

**Plans 06 + 07 (Wave 4) are now unblocked and can run in parallel.**

- **Plan 06 (FavoriteButton DS primitive + TemplateCard slot + TemplatePreviewModal heart):** consumes `toggleFavorite({ templateId, editorType, nextValue })` from `templateGalleryService.js`. The PG 23505 tolerance in the insert branch means the button can fire `toggleFavorite({nextValue:true})` optimistically without a pre-check; duplicate rows are swallowed server-side.
- **Plan 07 (PackCard + StarterPacksStrip + PackPreviewModal):** consumes `fetchStarterPacks()`, `fetchPackDetail(packId)`, and `applyStarterPack(packId)` from `marketplaceService.js`. The `fetchPackDetail` return shape is `{ ...pack, members: [...gallery_template, position, editor_type] }` — Plan 07 can destructure `.members` directly for the modal mini-grid render.

**Plan 01 RED test status:**
- `apply-starter-pack-atomicity.test.js`: 4/4 GREEN (flipped here, Task 1).
- `view-per-user.test.js`: 3 cases still `it.skip` under `describe.skipIf(SKIP)` — Plan 10 fills them with live-DB assertions (unchanged by this plan; the VIEW is live but the test still needs TEST_USER_EMAIL env).
- `PackCard.test.jsx` (6 it.skip): unchanged; Plan 07 flips.
- `FavoriteButton.test.jsx` (3 it.skip): unchanged; Plan 06 flips.

## Self-Check: PASSED

- File `src/services/marketplaceService.js`: FOUND (636 lines, 31 exports)
- File `src/services/templateGalleryService.js`: FOUND (101 lines, 2 exports)
- File `tests/unit/services/marketplaceService.test.js`: FOUND (488 lines, 35 tests GREEN)
- Commit `d5d08ddd` (Task 1 — 9 pack exports): FOUND in git log
- Commit `4cd091e3` (Task 2 — VIEW swap + toggleFavorite): FOUND in git log
- Commit `a269f844` (Task 3 — unit tests): FOUND in git log
- grep `"export async function applyStarterPack"` in marketplaceService.js: FOUND
- grep `"supabase.rpc('apply_starter_pack'"` in marketplaceService.js: FOUND
- grep `"STARTER PACKS (Phase 173)"` in marketplaceService.js: FOUND
- grep `"from('gallery_templates_with_favorites')"` in templateGalleryService.js: FOUND
- `! grep "from('gallery_templates')"` in templateGalleryService.js: VERIFIED (old ref removed)
- grep `"export async function toggleFavorite"` in templateGalleryService.js: FOUND
- grep `"if (error && error.code !== '23505')"` in templateGalleryService.js: FOUND
- `npx vitest run tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` → 4 passed (0 failed)
- `npx vitest run tests/unit/services/marketplaceService.test.js` → 35 passed (0 failed)

---
*Phase: 173-starter-packs-favorites*
*Completed: 2026-04-23*
