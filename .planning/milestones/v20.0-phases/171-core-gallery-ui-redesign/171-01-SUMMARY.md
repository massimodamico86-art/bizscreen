---
phase: 171-core-gallery-ui-redesign
plan: 01
subsystem: testing
tags: [fuse.js, vitest, playwright, fixtures, gallery, tdd-scaffold]

# Dependency graph
requires:
  - phase: 170-data-layer-foundation
    provides: templateGalleryService.fetchGalleryTemplates + gallery_templates VIEW (21 snake_case columns)
provides:
  - fuse.js@^7.3.0 runtime dependency available for Wave 1 client-side search
  - Shared mockGalleryRows() fixture (10 rows, snake_case) consumed by all Wave 1 unit tests
  - RED unit test file TemplateGalleryPage.test.jsx (7 describes / 9 its) asserting UI-SPEC Copywriting Contract literals
  - RED regression test templateMarketplaceAlias.test.jsx guarding Pitfall 1 (App.jsx pageMap drift)
  - Playwright E2E spec template-gallery.spec.js (4 structural tests, TQAL-05 compliant) discoverable by --list
affects: [171-02-new-gallery-ui, 171-03-validation-and-qa, all future template-gallery tests]

# Tech tracking
tech-stack:
  added: [fuse.js@^7.3.0]
  patterns: [Shared snake_case fixture under tests/fixtures/, RED-first test scaffolding before implementation, File-inspection regression test (readFileSync + regex) as Pitfall 1 guard]

key-files:
  created:
    - tests/fixtures/galleryTemplates.js
    - tests/unit/pages/TemplateGalleryPage.test.jsx
    - tests/unit/pages/templateMarketplaceAlias.test.jsx
    - tests/e2e/template-gallery.spec.js
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "fuse.js pinned at caret ^7.3.0 (not --save-exact) per 171-RESEARCH.md line 102"
  - "Fixture emits snake_case only (no camelCase) to match Phase 170 D-08 service contract"
  - "Pitfall 1 test uses file-inspection style (readFileSync + regex), not component mount — <10ms, framework-agnostic"
  - "E2E spec is TQAL-05 compliant: only toHaveCount(0) is permitted (error-toast absence)"

patterns-established:
  - "Wave 0 scaffold: install deps + fixtures + RED tests BEFORE Wave 1 touches src/"
  - "Per-plan commit cadence: one atomic commit per Task (5 commits) for clean bisect"
  - "Structural-only E2E assertions for gallery (no exact template counts)"

requirements-completed: [TGAL-01, TGAL-02, TGAL-03, TGAL-04, TGAL-05, TDSC-01, TDSC-02, TDSC-03, TDSC-04, TDSC-05]

# Metrics
duration: 3min
completed: 2026-04-19
---

# Phase 171 Plan 01: Wave 0 Validation Scaffolding Summary

**Installed fuse.js@7.3.0, created 10-row snake_case gallery fixture, and scaffolded 3 test files (1 Vitest stub, 1 file-inspection regression test, 1 Playwright spec) — all committed RED so Wave 1 turns them GREEN one requirement at a time.**

## Performance

- **Duration:** ~3 min (pure commit timeline; includes npm install + vitest + playwright --list verification)
- **Started:** 2026-04-19T22:13:28Z (Task 1 commit)
- **Completed:** 2026-04-19T22:17:01Z (Task 5 commit)
- **Tasks:** 5/5 completed
- **Files modified:** 6 (2 modified, 4 created)

## Accomplishments

- fuse.js@7.3.0 installed as runtime dependency (alphabetical placement between `framer-motion` and `html2canvas`) — import smoke test prints `Fuse`
- Shared fixture `tests/fixtures/galleryTemplates.js` exports `createMockGalleryRow(overrides)` + `mockGalleryRows()` returning 10 snake_case rows covering every filter/sort axis (3 categories, 3 tag pools, 6 landscape / 3 portrait / 1 null orientation, use_count 0–100, 5 "New" rows, 9 svg + 1 polotno, plus a uniquely-named "Neon Deal Poster" row for fuzzy-search tests)
- Unit test stub `tests/unit/pages/TemplateGalleryPage.test.jsx` — 7 describe blocks, 9 it blocks, all assertions use 171-UI-SPEC Copywriting Contract literals verbatim; mocks `useAuth` and `fetchGalleryTemplates`; clears `window.localStorage` in `beforeEach` (T-171-I01 isolation)
- Pitfall 1 regression test `tests/unit/pages/templateMarketplaceAlias.test.jsx` — 5 assertions via `readFileSync` + regex covering all three pageMap alias keys (`templates`, `template-marketplace`, `svg-templates`); runs in <20ms with no React tree
- Playwright E2E spec `tests/e2e/template-gallery.spec.js` — 4 structural-only tests (TGAL-01, TGAL-05, TDSC-01, TDSC-04), `test.skip` guard on `TEST_USER_EMAIL`, discovered by `--list` successfully

## Task Commits

Each task was committed atomically on the worktree branch (`--no-verify` per parallel-executor protocol):

1. **Task 1: Install fuse.js@^7.3.0** — `1aa7dcee` (chore)
2. **Task 2: Create shared gallery fixture** — `e1aed96a` (test)
3. **Task 3: Stub TemplateGalleryPage unit tests (RED)** — `b4bb1c94` (test)
4. **Task 4: Stub pageMap alias regression test (Pitfall 1)** — `af0559dc` (test)
5. **Task 5: Stub Playwright E2E spec (structural only)** — `4edc5fb6` (test)

Plan metadata commit: added after self-check in a separate commit that stages only this SUMMARY.md (worktree mode — STATE.md/ROADMAP.md are excluded and written centrally by the orchestrator after wave merge).

## Files Created/Modified

- `package.json` — added `"fuse.js": "^7.3.0"` in dependencies (alphabetical)
- `package-lock.json` — resolved fuse.js 7.3.0 + transitive dep tree (761 packages re-audited; no direct consumers touched)
- `tests/fixtures/galleryTemplates.js` (149 lines) — `createMockGalleryRow()` factory + 10-row `mockGalleryRows()` dataset; 21 snake_case columns per Phase 170 service contract
- `tests/unit/pages/TemplateGalleryPage.test.jsx` (182 lines) — RED unit-test scaffold with 7 describe blocks × 9 it blocks; imports fixture + mocks service
- `tests/unit/pages/templateMarketplaceAlias.test.jsx` (49 lines) — file-inspection regression test using `readFileSync` + regex
- `tests/e2e/template-gallery.spec.js` (67 lines) — 4 structural-only Playwright tests with `test.skip` credential guard

## Decisions Made

- **Caret range for fuse.js** — Kept `^7.3.0` (not exact) per 171-RESEARCH.md line 102, so Wave 1+ can pick up patch releases without lockfile churn.
- **Runtime (not dev) dependency placement** — fuse.js ships to the browser via `src/pages/TemplateGalleryPage.jsx` (to be created in Plan 02), so it must be in `dependencies`.
- **File-inspection regression test** — Option 2 from 171-PATTERNS.md (readFileSync + regex) chosen over component-render style. Runs in <20ms, zero React/test-harness coupling — exactly the shape needed to catch stale pageMap aliases before Plan 02 deletes the legacy page.
- **No additional test-case paraphrasing** — Every user-facing string came from the 171-UI-SPEC Copywriting Contract (lines 252–276) verbatim. Any future copy tweak must update the contract first so tests can follow.

## Deviations from Plan

None — plan executed exactly as written. Every Task verify block and acceptance-criteria item was re-run and passed before the commit.

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered

- None blocking. First `npx vitest run` invocation was piped through `| tail`, which masked the non-zero exit code; re-ran the command with direct redirection to capture the true exit status (1 = RED, as expected). The fix was verification tooling, not code.

## Known Stubs

All four created test files are intentional RED stubs — this is the purpose of a Wave 0 validation-scaffolding plan. Each one fails today and must turn GREEN in a specific future task:

| Stub file | Currently fails because… | Turned GREEN by |
|-----------|--------------------------|-----------------|
| `tests/unit/pages/TemplateGalleryPage.test.jsx` | `src/pages/TemplateGalleryPage.jsx` does not yet exist | Phase 171 Plan 02, Task 1 (create TemplateGalleryPage.jsx) |
| `tests/unit/pages/templateMarketplaceAlias.test.jsx` | `src/App.jsx` still lazy-imports `SvgTemplateGalleryPage` at line 128 | Phase 171 Plan 02, Task 2 (atomic legacy delete + pageMap re-point) |
| `tests/e2e/template-gallery.spec.js` | Test body is correct but currently skipped in CI (`TEST_USER_EMAIL` not set) — will execute in Wave 2 once TemplateGalleryPage ships | Phase 171 Plan 03 (browser-first validation loop) |
| `tests/fixtures/galleryTemplates.js` | Not a stub — already returns the correct shape. Listed here only as the data source for the stubs above. | N/A (already GREEN) |

## Plan-Level Verification Results

All 7 items from the `<verification>` block at plan completion:

| # | Check | Result |
|---|-------|--------|
| 1 | `grep -q '"fuse.js": "\^7\.3\.0"' package.json` | exits 0 (ok) |
| 2 | `test -f tests/fixtures/galleryTemplates.js` | exits 0 (ok) |
| 3 | `test -f tests/unit/pages/TemplateGalleryPage.test.jsx` | exits 0 (ok) |
| 4 | `test -f tests/unit/pages/templateMarketplaceAlias.test.jsx` | exits 0 (ok) |
| 5 | `test -f tests/e2e/template-gallery.spec.js` | exits 0 (ok) |
| 6 | `npx vitest run tests/unit/pages/TemplateGalleryPage.test.jsx tests/unit/pages/templateMarketplaceAlias.test.jsx` | exit=1, 2 files failed / 5 tests failed (expected RED) |
| 7 | `npx playwright test tests/e2e/template-gallery.spec.js --list` | exit=0, 4 tests discovered across chromium project |

## User Setup Required

None. fuse.js is a standard npm package; no environment variables, dashboard configuration, or external services introduced by this plan.

## Next Phase Readiness

- **Plan 02 (Wave 1 implementation) unblocked:** Every Wave 1 task now has a pre-existing RED `<automated>` target. Plan 02 can proceed TDD-style — create `src/pages/TemplateGalleryPage.jsx`, atomically delete legacy `SvgTemplateGalleryPage` from `src/App.jsx` + re-point the three pageMap aliases, watch the Vitest failures flip to GREEN one describe block at a time.
- **Plan 03 (Wave 2 validation) ready in parallel:** The Playwright spec is already discoverable by `--list`; running it end-to-end just requires Plan 02 to land the page file.
- **Requirements coverage complete:** 10/10 requirements from this plan's frontmatter (TGAL-01..05 and TDSC-01..05) now have an executable test target on disk. None are merely "planned" anymore.
- **No blockers or concerns introduced.**

## Self-Check: PASSED

All 7 files claimed in this SUMMARY exist on disk:
- `tests/fixtures/galleryTemplates.js` — FOUND
- `tests/unit/pages/TemplateGalleryPage.test.jsx` — FOUND
- `tests/unit/pages/templateMarketplaceAlias.test.jsx` — FOUND
- `tests/e2e/template-gallery.spec.js` — FOUND
- `.planning/phases/171-core-gallery-ui-redesign/171-01-SUMMARY.md` — FOUND
- `package.json` — FOUND (fuse.js dependency present)
- `package-lock.json` — FOUND

All 5 task commits claimed in this SUMMARY exist in git log:
- `1aa7dcee` (Task 1) — FOUND
- `e1aed96a` (Task 2) — FOUND
- `b4bb1c94` (Task 3) — FOUND
- `af0559dc` (Task 4) — FOUND
- `4edc5fb6` (Task 5) — FOUND

---
*Phase: 171-core-gallery-ui-redesign*
*Plan: 01*
*Completed: 2026-04-19*
