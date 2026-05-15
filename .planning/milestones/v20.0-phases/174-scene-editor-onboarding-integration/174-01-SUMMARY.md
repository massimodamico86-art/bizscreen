---
phase: 174-scene-editor-onboarding-integration
plan: 01
subsystem: testing
tags: [vitest, playwright, driver.js, tdd, red-stubs, nyquist-gate]

# Dependency graph
requires:
  - phase: 173-starter-packs-favorites
    provides: applyStarterPack RPC wrapper (reused by Plan 08), PackCard component (reused unchanged), Wave-0 RED-stub precedent
  - phase: 172-preview-apply-flow
    provides: useSearchParams URL filter pattern, TemplatePreviewModal apply branch, fiber-BFS readCurrentPage helper
provides:
  - driver.js@^1.4.0 installed (runtime dep) — Phase 174 only new library
  - 7 RED test stubs (5 vitest + 2 playwright) covering all 7 phase requirements (TEDR-01..03 + TONB-01..04)
  - applyTemplateToActiveSlide / markGalleryTourSeen / useGalleryTour symbols expected by downstream plans
affects: [174-02 (RPC + columns migration), 174-03 (apply RPC tests), 174-04 (client wrapper), 174-05 (Browse Templates button), 174-06 (URL filter + data-tour attrs), 174-07 (markGalleryTourSeen + RPC allowlist), 174-08 (StarterPackStep + ONBOARDING_STEPS), 174-09 (useGalleryTour hook)]

# Tech tracking
tech-stack:
  added: ["driver.js@^1.4.0 (MIT, product tour library)"]
  patterns:
    - "Wave-0 RED stub commit for every phase requirement (Nyquist sampling continuity gate — no 3-task gap without automated verify)"
    - "Bundle-commit pattern: package.json + RED stubs in a single revertable commit so RED state is reproducible from one revision"

key-files:
  created:
    - tests/integration/apply-template-to-slide.test.js
    - tests/integration/onboarding-rpc.test.js
    - tests/unit/hooks/useGalleryTour.test.js
    - tests/e2e/editor-return.spec.js
    - tests/e2e/gallery-tour.spec.js
  modified:
    - package.json (driver.js dep)
    - package-lock.json
    - tests/unit/services/marketplaceService.test.js (extended with applyTemplateToActiveSlide describe)
    - tests/unit/services/onboardingService.test.js (flipped length 6→7, added starter_pack ordering tests)

key-decisions:
  - "Bundled npm install + 5 vitest stubs into a single Task 1 commit so a single revert restores RED-baseline (precedent: Phase 173 Wave 0 pattern)"
  - "Reused fiber-BFS readCurrentPage helper from preview-apply.spec.js verbatim in editor-return.spec.js — App.jsx pseudo-routing requires reading currentPage React state, not window.location"
  - "Mocked driver.js + driver.js/dist/driver.css at vi.mock level for the unit hook test so the module-loader does not try to evaluate the real CSS asset under jsdom"
  - "Accepted the existing pass on `updateOnboardingStep('starter_pack', true)` mock-call test — the client wrapper already accepts arbitrary p_step strings; the *server-side* allowlist gate (RED until Plan 02 migration) is the GREEN target. The other two TONB-03 cases (getOnboardingProgress mapping, markGalleryTourSeen export) DO fail in RED."

patterns-established:
  - "RED test file naming: tests/integration/<feature>.test.js for RPC contract; tests/unit/hooks/<hookName>.test.js for hook unit; tests/e2e/<feature>.spec.js for round-trip"
  - "data-tour attribute selector strategy for driver.js anchors: filter-bar | search-input | first-card | apply-cta — assertable from both unit and E2E layers"
  - "driver.js mock factory in unit tests captures `lastDriverOptions` so lifecycle hooks (onDestroyStarted) can be invoked directly without rendering the popover"

requirements-completed: []  # Plan 01 creates RED stubs; downstream plans flip them GREEN. No requirements close in this plan.

# Metrics
duration: 25min
completed: 2026-04-29
---

# Phase 174 Plan 01: Wave 0 RED Stubs + driver.js Install Summary

**Installed driver.js@^1.4.0 and authored 7 RED test stubs (5 vitest + 2 Playwright) covering all 7 Phase 174 requirements — Nyquist gate satisfied, every downstream plan now has a concrete test file to flip from RED to GREEN.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-29T01:55:54Z
- **Completed:** 2026-04-29T02:02:05Z
- **Tasks:** 2
- **Files modified:** 9 (4 new tests + 1 existing test extension + 1 existing test extension + 2 new E2E + package.json + lockfile)

## Accomplishments

- driver.js@^1.4.0 installed as a runtime dependency (MIT-licensed, React 19 compatible, used by Plan 09's `useGalleryTour` hook).
- 11 RED assertions across 5 vitest files fail deterministically when run; the 2 Playwright spec files list 5 tests via `playwright test --list` (syntactic validity confirmed).
- Test stubs reference symbols that don't exist yet (`applyTemplateToActiveSlide`, `markGalleryTourSeen`, `useGalleryTour`) — imports throw or assertions fail with concrete messages, giving downstream plans precise failure targets.
- Bundle-commit pattern from Phase 173 reused: `package.json` + RED stubs in a single Task-1 commit so `git revert` restores the RED baseline atomically.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install driver.js + create unit/integration RED stubs** — `a4670292` (chore — covers npm install + 5 vitest files: 3 new + 2 existing extended)
2. **Task 2: Create E2E RED stubs (editor-return + gallery-tour)** — `ca5eaaa6` (test — 2 new Playwright spec files, 5 tests total)

**Plan metadata commit:** [pending — will be made after STATE.md + ROADMAP.md updates]

## Files Created/Modified

### Created (5 test files + 0 source files)

- `tests/integration/apply-template-to-slide.test.js` (67 lines) — RPC client contract for `applyTemplateToActiveSlide` (TEDR-02). 4 RED cases: success path, RPC error propagation, single-call atomicity proof, polotno-rejection.
- `tests/integration/onboarding-rpc.test.js` (71 lines) — Onboarding RPC mapping + new mutations (TONB-03). 3 RED cases: `updateOnboardingStep('starter_pack')` arg shape, `getOnboardingProgress` camelCase mapping for `completedStarterPack` + `completedGalleryTour`, `markGalleryTourSeen` export.
- `tests/unit/hooks/useGalleryTour.test.js` (92 lines) — Hook conditional logic (TONB-04). 4 RED cases: drive-on-false, no-drive-on-true, isFetching gate, onDestroyStarted handler.
- `tests/e2e/editor-return.spec.js` (249 lines) — Round-trip E2E (TEDR-01..03). 3 tests: Browse Templates button visible, URL contract preserved, Use Template returns to scene editor with SVG applied.
- `tests/e2e/gallery-tour.spec.js` (121 lines) — driver.js tour E2E (TONB-04). 2 tests: 4-step tour fires on first visit, no re-appear on second visit.

### Modified

- `package.json` + `package-lock.json` — driver.js@^1.4.0 added to `dependencies`.
- `tests/unit/services/marketplaceService.test.js` — appended `describe('applyTemplateToActiveSlide (Phase 174 D-06)')` with 2 RED cases.
- `tests/unit/services/onboardingService.test.js` — flipped `ONBOARDING_STEPS.toHaveLength(6)` to `(7)`, added "between logo and first_media" ordering test, added "no navigateTo" assertion for the new `starter_pack` step.

## RED Verification Matrix

Each requirement has at least one failing assertion ready for downstream plans to flip:

| Req ID  | Test File                                                  | RED Assertion(s)                                                                  | Plan that flips GREEN  |
|---------|------------------------------------------------------------|-----------------------------------------------------------------------------------|------------------------|
| TEDR-01 | `tests/e2e/editor-return.spec.js`                          | "Browse Templates" button visible in scene-editor topbar                          | Plan 05                |
| TEDR-02 | `tests/integration/apply-template-to-slide.test.js` (×4)   | applyTemplateToActiveSlide RPC contract — args, success, error, polotno reject   | Plan 04 (client) + Plan 02 (RPC) |
| TEDR-02 | `tests/unit/services/marketplaceService.test.js` (×2)      | applyTemplateToActiveSlide wrapper exists with correct RPC name + args            | Plan 04                |
| TEDR-02 | `tests/e2e/editor-return.spec.js`                          | Use Template round-trip applies and returns to scene editor with SVG content      | Plans 04 + 06          |
| TEDR-03 | `tests/e2e/editor-return.spec.js`                          | URL contains editorReturn=1 + returnSceneId=<uuid> + slideId=<uuid>; CTA reads "Use Template"; StarterPacksStrip hidden | Plan 06 |
| TONB-01 | `tests/unit/services/onboardingService.test.js` (×3)       | ONBOARDING_STEPS length === 7; starter_pack between logo and first_media; no navigateTo | Plan 08 |
| TONB-02 | `tests/e2e/onboarding.spec.js` (existing — to be extended) | Pack click bulk-applies + auto-advances within wizard                             | Plan 08 (extension)    |
| TONB-03 | `tests/integration/onboarding-rpc.test.js` (×2 RED, ×1 pass) | getOnboardingProgress maps completed_starter_pack + completed_gallery_tour; markGalleryTourSeen export exists | Plan 02 + Plan 07 |
| TONB-04 | `tests/unit/hooks/useGalleryTour.test.js` (×4)             | useGalleryTour conditional logic — drive-on-false, no-drive-on-true, isFetching gate, onDestroyStarted handler | Plan 09 |
| TONB-04 | `tests/e2e/gallery-tour.spec.js` (×2)                      | First-visit 4-step driver.js tour; second-visit dismissal persistence             | Plans 06 + 09          |

### Vitest commands that fail today

```bash
# 11 failures, file-level FAIL × 5
npx vitest run \
  tests/integration/apply-template-to-slide.test.js \
  tests/integration/onboarding-rpc.test.js \
  tests/unit/hooks/useGalleryTour.test.js \
  tests/unit/services/marketplaceService.test.js \
  tests/unit/services/onboardingService.test.js
```

### Playwright commands that list (and would fail at runtime)

```bash
# Lists 5 tests across 2 files
npx playwright test \
  tests/e2e/editor-return.spec.js \
  tests/e2e/gallery-tour.spec.js \
  --list
```

## Decisions Made

- **Bundle commit for Task 1** — `package.json`, `package-lock.json`, and the 5 vitest file changes are in one commit so RED state is reversible from a single revision (precedent: Phase 173 Wave 0).
- **Reuse fiber-BFS helper verbatim** — `readCurrentPage` is duplicated into `editor-return.spec.js` rather than extracted to a shared helper. Phase 172 explicitly deferred cross-spec helper extraction; Plan 01 follows that precedent to avoid out-of-scope refactoring.
- **driver.js mock at vi.mock layer** — the unit hook test mocks both `driver.js` (to capture `options.onDestroyStarted`) and `driver.js/dist/driver.css` (no-op) so jsdom never tries to load CSS or execute the real popover code.
- **Accepted partial-RED on `onboarding-rpc.test.js`** — `updateOnboardingStep('starter_pack', true)` passes today because the existing client wrapper already forwards arbitrary `p_step` strings. The server-side allowlist (RED until migration in Plan 02) is the GREEN target — RPC integration tests in Plan 03 catch it. The other 2/3 TONB-03 cases (mapping + markGalleryTourSeen export) DO fail.

## Deviations from Plan

None — plan executed exactly as written. driver.js installed (Step 1), 5 vitest files created/extended (Steps 2–6), 2 Playwright specs created (Task 2). All acceptance criteria met:

- ✅ `grep -E '"driver\.js":\s*"\^1\.4\.\d"' package.json` exits 0
- ✅ `tests/integration/apply-template-to-slide.test.js` 67 lines (≥50)
- ✅ `tests/integration/onboarding-rpc.test.js` 71 lines (≥40)
- ✅ `tests/unit/hooks/useGalleryTour.test.js` 92 lines (≥50)
- ✅ `grep -c "applyTemplateToActiveSlide" tests/unit/services/marketplaceService.test.js` = 4 (≥2)
- ✅ `grep -c "toHaveLength(7)" tests/unit/services/onboardingService.test.js` = 1 (≥1)
- ✅ `grep -c "starter_pack" tests/unit/services/onboardingService.test.js` = 5 (≥2)
- ✅ vitest exits non-zero (11 failing tests across 5 files)
- ✅ `tests/e2e/editor-return.spec.js` 249 lines (≥60); TEDR-0[123] count = 7 (≥3)
- ✅ `tests/e2e/gallery-tour.spec.js` 121 lines (≥50); TONB-04 count = 5 (≥2); data-tour count = 5 (≥1)
- ✅ test.skip count = 2 (≥2) across both E2E files
- ✅ `playwright test --list` enumerates 5 tests (≥5)

## Issues Encountered

None. The 5 vitest files run cleanly (no syntax errors) and produce 11 deterministic failures with concrete messages. The 2 Playwright spec files list 5 tests with no syntax errors.

## Next Phase Readiness

- Plan 02 (Wave 1): can now write the migration with concrete failing tests in `tests/integration/onboarding-rpc.test.js` and `tests/integration/apply-template-to-slide.test.js` to flip after the RPC + columns deploy.
- Plan 04 (Wave 2): `applyTemplateToActiveSlide` wrapper has 6 RED cases (4 integration + 2 unit) waiting to flip GREEN.
- Plans 05/06/09: scene-editor button, URL filter, and `useGalleryTour` hook each have their dedicated RED files in place.
- driver.js@^1.4.0 is in the dependency tree; Plan 09 can `import { driver } from 'driver.js'` immediately.

## Self-Check: PASSED

- ✅ FOUND: `tests/integration/apply-template-to-slide.test.js`
- ✅ FOUND: `tests/integration/onboarding-rpc.test.js`
- ✅ FOUND: `tests/unit/hooks/useGalleryTour.test.js`
- ✅ FOUND: `tests/e2e/editor-return.spec.js`
- ✅ FOUND: `tests/e2e/gallery-tour.spec.js`
- ✅ FOUND commit `a4670292`: `chore(174-01): install driver.js@^1.4.0 + add unit/integration RED stubs (Wave 0)`
- ✅ FOUND commit `ca5eaaa6`: `test(174-01): add E2E RED stubs for editor-return and gallery tour (Wave 0)`

---
*Phase: 174-scene-editor-onboarding-integration*
*Plan: 01 — Wave 0 RED Stubs + driver.js Install*
*Completed: 2026-04-29*
