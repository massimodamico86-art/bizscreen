---
phase: 161-fix-content-test-imports
plan: "02"
subsystem: testing
tags: [playwright, e2e, layouts, fixtures, test-data]

requires:
  - phase: 161-fix-content-test-imports plan 01
    provides: helpers/index.js barrel with assertAppReady and helpers exports

provides:
  - tests/e2e/fixtures/index.js barrel with LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX constants
  - tests/e2e/layouts-screenshots.spec.js with 8 E2E tests covering CONT-05 and CONT-06

affects:
  - phase 161 verification (ROADMAP SC2, SC3)
  - any future layout E2E test expansion

tech-stack:
  added: []
  patterns:
    - "E2E fixtures pattern: export test data constants from tests/e2e/fixtures/index.js"
    - "Dual-import pattern: spec imports from both fixtures/index.js and helpers/index.js"
    - "Conditional UI guard pattern: if (isVisible) guards for optional UI elements"

key-files:
  created:
    - tests/e2e/fixtures/index.js
    - tests/e2e/layouts-screenshots.spec.js
  modified: []

key-decisions:
  - "Used same conditional UI guard pattern as scenes.spec.js to handle optional UI elements gracefully"
  - "Split tests into three describe blocks: Layout List (CONT-05), Layout Editor (CONT-05), Widget Config (CONT-06)"

patterns-established:
  - "Fixtures barrel: tests/e2e/fixtures/index.js for shared test data constants"
  - "Layout test pattern: navigateToSection(page, 'layouts') then waitForPageReady"

requirements-completed: [CONT-05, CONT-06]

duration: 15min
completed: 2026-04-11
---

# Phase 161 Plan 02: Fix Content Test Imports Summary

**E2E layouts-screenshots.spec.js with 8 tests covering CONT-05/CONT-06 and fixtures/index.js barrel exporting LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-11T00:04:00Z
- **Completed:** 2026-04-11T00:19:24Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `tests/e2e/fixtures/index.js` barrel with 3 exported constants (LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX)
- Created `tests/e2e/layouts-screenshots.spec.js` importing from both `./helpers/index.js` and `./fixtures/index.js` (ROADMAP SC2)
- Playwright `--list` confirms 8 Layout tests load with zero module errors (ROADMAP SC3)
- CONT-05 (Layout CRUD) covered via "Layout List Page" and "Layout Editor" describe blocks
- CONT-06 (Widget config) covered via "Widget Configuration" describe block

## Task Commits

1. **Task 1: Create fixtures/index.js barrel and layouts-screenshots.spec.js** - `3002f3c8` (feat)

**Plan metadata:** (docs commit will follow)

## Files Created/Modified

- `tests/e2e/fixtures/index.js` - Test data constants barrel: LAYOUT_PRESETS (7 presets), WIDGET_TYPES (9 types), TEST_LAYOUT_PREFIX
- `tests/e2e/layouts-screenshots.spec.js` - 8 E2E tests for Layouts page and editor, dual-import from helpers and fixtures

## Decisions Made

- Used the same conditional UI guard pattern (`if (isVisible)`) established in scenes.spec.js to handle environments where optional UI elements may not be present
- Split tests across 3 describe blocks mapping directly to requirement IDs (CONT-05 list, CONT-05 editor, CONT-06 widget)
- Reused `navigateToSection(page, 'layouts')` confirmed to exist in helpers.js sectionPatterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CONT-05 and CONT-06 now have spec coverage satisfying ROADMAP SC3
- fixtures/index.js and helpers/index.js imports both resolve correctly satisfying ROADMAP SC2
- No blockers for phase verification

---
*Phase: 161-fix-content-test-imports*
*Completed: 2026-04-11*
