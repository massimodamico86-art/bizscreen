---
phase: 173-starter-packs-favorites
plan: 01
subsystem: testing
tags: [vitest, playwright, red-green, nyquist-wave-0, starter-packs, favorites]

requires:
  - phase: 172.1-fix-svg-apply-rpc
    provides: atomic RPC test blueprint (svg-rpc-atomicity.test.js) + Playwright helpers.js login harness
  - phase: 171-core-gallery-ui-redesign
    provides: TemplateGalleryPage + filter/URL-param contract that later plans extend

provides:
  - tests/fixtures/starter-packs.js factory builders (buildPack, buildPackItem, buildMixedPack)
  - tests/integration/preview-apply/apply-starter-pack-atomicity.test.js — RED vitest stub (4 cases) for apply_starter_pack RPC atomicity contract
  - tests/integration/favorites/view-per-user.test.js — RED vitest stub (3 it.skip cases) for gallery_templates_with_favorites VIEW per-user filter
  - tests/unit/components/PackCard.test.jsx — RED vitest stub (6 it.skip cases) for PackCard 2x2 mosaic rendering
  - tests/unit/components/FavoriteButton.test.jsx — RED vitest stub (3 it.skip cases) for FavoriteButton primitive (W-2 fix)
  - tests/e2e/starter-packs.spec.js — RED Playwright stub covering TPCK-01..04 flows
  - tests/e2e/favorites.spec.js — RED Playwright stub covering TFAV-01..03 flows
  - tests/e2e/admin-starter-packs.spec.js — RED Playwright stub for admin pack CRUD (TPCK-03)

affects:
  - 173-02-PLAN (migrations 171 + 172 schemas — VIEW test flips GREEN after 04 db push)
  - 173-03-PLAN (migration 173 apply_starter_pack RPC — atomicity test flips GREEN after Plan 05 client wrapper)
  - 173-05-PLAN (marketplaceService extensions — flips atomicity test from RED to GREEN)
  - 173-06-PLAN (FavoriteButton primitive — flips FavoriteButton.test.jsx from RED to GREEN)
  - 173-07-PLAN (PackCard component — flips PackCard.test.jsx from RED to GREEN)
  - 173-10-PLAN (verification wave — flips all remaining test.skip to live E2E)

tech-stack:
  added: []
  patterns:
    - "Nyquist Wave 0: failing tests land before production code so later plans have a concrete target to flip GREEN"
    - "test.skip + SKIP guard on Playwright files keeps CI exit-0 when TEST_USER_EMAIL unset"
    - "describe.skipIf(SKIP) on vitest integration tests requiring live DB credentials"
    - "3 RED cases for optimistic-UI primitives (flip-before-await, revert-on-error, busy-guard) — re-usable template for future optimistic components"

key-files:
  created:
    - tests/fixtures/starter-packs.js
    - tests/integration/preview-apply/apply-starter-pack-atomicity.test.js
    - tests/integration/favorites/view-per-user.test.js
    - tests/unit/components/PackCard.test.jsx
    - tests/unit/components/FavoriteButton.test.jsx
    - tests/e2e/starter-packs.spec.js
    - tests/e2e/favorites.spec.js
    - tests/e2e/admin-starter-packs.spec.js
  modified: []

key-decisions:
  - "E2E spec named starter-packs.spec.js (NOT template-packs.spec.js) to avoid collision with legacy v2 onboarding content_templates spec per CONTEXT D-02"
  - "FavoriteButton stub added to Wave 0 per W-2 fix so Plan 06 has a pre-existing RED file to flip rather than writing fresh in the same plan that ships the primitive"
  - "View-per-user test uses describe.skipIf(SKIP) rather than test.skip so vitest cleanly reports skipped files when credentials unset"
  - "Atomicity test intentionally imports from src/services/marketplaceService — the RED error ('applyStarterPack is not a function') proves Plan 05's GREEN signal will be meaningful"

patterns-established:
  - "Phase 173 Wave 0 test scaffolding: 8 files (1 fixture + 4 vitest RED stubs + 3 Playwright RED specs) committed in 2 atomic commits"
  - "Every PLAN.md <verify> command in plans 02..10 now has a concrete test file it can grep/run"

requirements-completed: [TPCK-01, TPCK-02, TPCK-03, TPCK-04, TFAV-01, TFAV-02, TFAV-03]

duration: 3min
completed: 2026-04-23
---

# Phase 173 Plan 01: Wave 0 RED Test Scaffolds Summary

**Eight RED-state test files (1 fixture + 4 vitest stubs + 3 Playwright specs) locking in a failing test for every TPCK and TFAV requirement before any production code lands — Plan 05 flips atomicity GREEN, Plan 06 flips FavoriteButton GREEN, Plan 10 flips E2E.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-23T01:49:51Z
- **Completed:** 2026-04-23T01:52:35Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments

- Atomicity test fails with exactly the expected RED signal: `TypeError: applyStarterPack is not a function` — proves later Plan 05 GREEN signal will be meaningful (the whole point of Nyquist Wave 0).
- 12 vitest cases skipped (expected at this stage): 6 PackCard + 3 FavoriteButton + 3 view-per-user, matching the plan's <verification> block.
- 15 Playwright tests discovered across 3 specs (4 admin + 5 favorites + 6 starter-packs), all marked skipped by the top-level SKIP guard when credentials absent.
- Legacy `tests/e2e/template-packs.spec.js` (v2 content_templates onboarding flow, preserved per CONTEXT D-02) left completely untouched — `git diff --stat tests/e2e/template-packs.spec.js` returns 0 lines.
- 8 of 8 `must_haves.artifacts` paths exist and contain their required `contains:` strings.

## Task Commits

1. **Task 1: Create starter-packs fixture + integration test stubs (RED)** — `3b0ffbbb` (test)
2. **Task 2: Create PackCard + FavoriteButton unit + 3 Playwright E2E stubs (RED)** — `21117829` (test)

_Metadata commit for SUMMARY/STATE/ROADMAP will be recorded as the final commit in this plan._

## Files Created/Modified

### Created (8)
- `tests/fixtures/starter-packs.js` — `buildPack`, `buildPackItem`, `buildMixedPack` factory builders (null tenant = global per D-03, alternating svg/polotno for mixed-pack tests)
- `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` — 4 vitest cases for apply_starter_pack RPC atomicity (resolves uuid[], throws on rollback, empty-pack returns [], zero follow-up UPDATEs)
- `tests/integration/favorites/view-per-user.test.js` — 3 it.skip cases under `describe.skipIf(SKIP)` for gallery_templates_with_favorites VIEW per-user filter; requires TEST_USER_EMAIL/PASSWORD
- `tests/unit/components/PackCard.test.jsx` — 6 it.skip cases (mosaic render, placeholder fill, thumbnail_url short-circuit, count badge copy, industry label, click guard)
- `tests/unit/components/FavoriteButton.test.jsx` — 3 it.skip cases for optimistic-UI primitive (optimistic-before-await, revert-on-error, busy-guard re-entry); W-2 fix
- `tests/e2e/starter-packs.spec.js` — 6 test.skip cases covering TPCK-01..04 flows; filename distinct from legacy template-packs.spec.js per CONTEXT D-02
- `tests/e2e/favorites.spec.js` — 5 test.skip cases covering TFAV-01..03 flows
- `tests/e2e/admin-starter-packs.spec.js` — 4 test.skip cases covering TPCK-03 super_admin CRUD; independent TEST_SUPER_ADMIN_EMAIL/PASSWORD guard

### Modified
None — Wave 0 is pure test-scaffold addition with zero production-code contact.

## Decisions Made

- **Kept file names exactly as specified in plan (no drift).** `starter-packs.spec.js` vs legacy `template-packs.spec.js` distinction preserved; mirrors CONTEXT D-02.
- **Followed plan verbatim for all 8 file bodies.** No deviations from RESEARCH §Example 10 atomicity scaffold or UI-SPEC Copywriting Contract strings referenced in later plans.
- **Verified RED signal is the intended one** before committing: atomicity failure is `TypeError: applyStarterPack is not a function` (correct — the test is asserting the function will exist), not a missing-file or syntax error.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met on first verification run:
- File existence: 8/8 present
- `it(` count in atomicity: 4 ✓
- `it.skip(` count in PackCard: 6 ✓
- `it.skip(` count in FavoriteButton: 3 ✓
- `test.skip` count in starter-packs.spec.js: 8 (≥6 required) ✓
- Legacy template-packs.spec.js untouched: ✓ (0 diff lines)
- helpers.js imports across 3 E2E specs: 3/3 ✓
- Atomicity test in genuine RED: ✓ (`applyStarterPack is not a function`)
- View test uses describe.skipIf: ✓
- Fixture exports `buildPack` etc: ✓

## Issues Encountered

None.

## User Setup Required

None — Wave 0 is test scaffolding only. No external services touched.

## Next Phase Readiness

**Plan 02 (Wave 1) is unblocked.** Next step:
- Write migration `171_template_packs.sql` (template_packs + template_pack_items + RLS) per RESEARCH §supabase/migrations/171 section and PATTERNS.md §Pattern A idempotent DDL.
- Write migration `172_template_favorites.sql` (template_favorites + RLS + gallery_templates_with_favorites VIEW) per PATTERNS.md §172 section. Once pushed live in Plan 04, the Plan 01 VIEW test becomes executable (still skipped until Plan 09 fills the 3 skip cases with live-DB assertions).

**Plan 05 specifically awaits** the atomicity RED test committed in `3b0ffbbb` — adding the `applyStarterPack` named export in `src/services/marketplaceService.js` is what flips that 4-case file from all-red to all-green, which is the `npm test -- apply-starter-pack-atomicity` gate in 173-05-PLAN.md.

## Self-Check: PASSED

- File `tests/fixtures/starter-packs.js`: FOUND
- File `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js`: FOUND
- File `tests/integration/favorites/view-per-user.test.js`: FOUND
- File `tests/unit/components/PackCard.test.jsx`: FOUND
- File `tests/unit/components/FavoriteButton.test.jsx`: FOUND
- File `tests/e2e/starter-packs.spec.js`: FOUND
- File `tests/e2e/favorites.spec.js`: FOUND
- File `tests/e2e/admin-starter-packs.spec.js`: FOUND
- Commit `3b0ffbbb`: FOUND in git log
- Commit `21117829`: FOUND in git log

---
*Phase: 173-starter-packs-favorites*
*Completed: 2026-04-23*
