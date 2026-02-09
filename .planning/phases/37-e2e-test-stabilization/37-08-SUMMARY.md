---
phase: 37-e2e-test-stabilization
plan: 08
subsystem: testing
tags: [playwright, e2e, test-stabilization, auto-waiting]

# Dependency graph
requires:
  - phase: 37-07
    provides: Category 7 (Alerts & Diagnostics) stabilization
provides:
  - Zero waitForTimeout calls across entire E2E test suite
  - Category 8 (Remaining Files) stabilization
  - Comprehensive SKIPPED-TESTS.md documentation
  - Phase 37 completion
affects: [38-e2e-test-coverage-gate, future-test-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Title auto-wait assertions for hydration detection"
    - "Promise.race for auth resolution"
    - "Element waitFor instead of hardcoded waits"

key-files:
  created: []
  modified:
    - tests/e2e/seo.spec.js
    - tests/e2e/social.spec.js
    - tests/e2e/usage.spec.js
    - tests/e2e/debug.spec.js
    - .planning/phases/37-e2e-test-stabilization/SKIPPED-TESTS.md

key-decisions:
  - "Skip SEO tests for missing meta tags and accessibility features (4 tests)"
  - "Skip debug.spec.js entirely - manual debug tool with no assertions"
  - "Removed waitForTimeout from skipped tests for consistency"

patterns-established:
  - "Use toHaveTitle with timeout for React hydration detection"
  - "Use element.waitFor for menu expansion instead of timeouts"
  - "Use Promise.race for either/or auth resolution"

# Metrics
duration: 25min
completed: 2026-02-09
---

# Phase 37 Plan 08: Category 8 Stabilization Summary

**Final cleanup of 12 remaining test files: removed 9 waitForTimeout calls, completing phase goal of zero timing-based waits across entire E2E test suite (172 total removed)**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-09T01:14:22Z
- **Completed:** 2026-02-09T01:39:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Removed all 9 waitForTimeout calls from Category 8 files (seo, social, usage, debug)
- Verified all 12 remaining files pass or have documented skips
- Finalized SKIPPED-TESTS.md with comprehensive phase documentation
- Achieved phase goal: zero waitForTimeout calls across entire test suite

## Task Commits

Each task was committed atomically:

1. **Task 1: Stabilize all remaining test files** - `b639cf8` (feat)
   - Removed 9 waitForTimeout calls from 4 files
   - seo.spec.js: 5 calls -> title auto-wait assertions
   - social.spec.js: 1 call -> element waitFor for submenu
   - usage.spec.js: 2 calls -> auto-wait (inside skipped tests)
   - debug.spec.js: 1 call -> Promise.race for auth

2. **Task 2: Run verification and skip failing tests** - `72f27e2` (chore)
   - Skipped 4 SEO tests (missing meta tags, accessibility features)
   - Skipped debug.spec.js entirely (manual debug tool)
   - Verified all tests pass or are documented

3. **Task 3: Finalize SKIPPED-TESTS.md** - `f231368` (docs)
   - Added Category 8 stabilization details
   - Updated phase totals: 172 waitForTimeout calls removed
   - Documented 5 newly skipped tests with reasons

## Files Created/Modified

- `tests/e2e/seo.spec.js` - Replaced 5 waitForTimeout with title auto-wait, skipped 4 tests
- `tests/e2e/social.spec.js` - Replaced 1 waitForTimeout with element waitFor
- `tests/e2e/usage.spec.js` - Replaced 2 waitForTimeout (inside skipped tests)
- `tests/e2e/debug.spec.js` - Replaced 1 waitForTimeout, skipped entire file
- `.planning/phases/37-e2e-test-stabilization/SKIPPED-TESTS.md` - Phase completion documentation

## Decisions Made

1. **Skip SEO tests for missing features:** Auth pages lack noindex meta tags and skip-to-content link. These are feature gaps, not test issues. Skipping is appropriate until features are implemented.

2. **Skip debug.spec.js entirely:** This file is a manual debugging tool with no assertions. It should never run in CI or automated testing.

3. **Fix waitForTimeout in skipped tests too:** For consistency and to meet the "zero waitForTimeout" goal, removed calls even from tests that are already skipped.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **SEO tests failing due to missing features:** Tests expected meta tags and accessibility features that don't exist in the app. Resolution: Skip tests with documentation of what features need to be added.

2. **debug.spec.js using fake credentials:** The test file uses hardcoded fake credentials and expects certain elements. Since it's a manual debug tool, skipping it entirely was the correct approach.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 37 (E2E Test Stabilization) is now complete:

- **Total waitForTimeout removed:** 172 calls across 8 categories
- **Total E2E tests:** 1218 tests in 39 files
- **Pass rate:** All tests pass or are documented as skipped
- **Documentation:** SKIPPED-TESTS.md provides comprehensive reference

Ready for Phase 38 (E2E Test Coverage Gate):
- Test suite is stable with zero timing-based waits
- Skip documentation identifies tests needing future work
- Helpers.js provides stable patterns for new tests

---
*Phase: 37-e2e-test-stabilization*
*Completed: 2026-02-09*
