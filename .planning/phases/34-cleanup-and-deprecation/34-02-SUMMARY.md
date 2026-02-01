---
phase: 34-cleanup-and-deprecation
plan: 02
subsystem: onboarding
tags: [cleanup, dashboard, tests, dead-code-removal]

# Dependency graph
requires:
  - phase: 34-01
    provides: Deletion of legacy onboarding components
provides:
  - Cleaned DashboardPage with only unified onboarding flow
  - Updated unit tests without legacy component mocks
  - Updated E2E helpers without legacy storage keys
affects: [future-dashboard-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cleanup verification with grep checks before commit"
    - "Remove unused code paths when feature flags no longer needed"

key-files:
  created: []
  modified:
    - src/pages/DashboardPage.jsx
    - tests/unit/pages/DashboardPage.test.jsx
    - tests/e2e/helpers.js

key-decisions:
  - "Removed isFirstRun state since legacy first-run flows are deleted"
  - "Removed demoResult state and DemoResultCard since createDemoWorkspace was only triggered from WelcomeModal"
  - "Removed creatingDemo state since demo creation is no longer triggered from DashboardPage"

patterns-established:
  - "When removing feature-flagged code paths, remove both branches if legacy is deleted"

# Metrics
duration: 8min
completed: 2026-02-01
---

# Phase 34 Plan 02: Clean up DashboardPage and Tests Summary

**Removed 307 lines of legacy onboarding code from DashboardPage, updated test mocks, and verified all tests pass**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-01T03:31:32Z
- **Completed:** 2026-02-01T03:39:45Z
- **Tasks:** 3 (2 with commits, 1 verification only)
- **Files modified:** 3

## Accomplishments

- Cleaned DashboardPage from 668 to 361 lines (-307 lines, -46% reduction)
- Removed all legacy onboarding imports (OnboardingWizard, OnboardingBanner, WelcomeModal, etc.)
- Removed 15+ legacy state variables (showWelcomeModal, showOnboardingWizard, isFirstRun, etc.)
- Removed all legacy handler functions (dismissWelcomeModal, handleSelectBusinessType, etc.)
- Removed all legacy JSX conditional blocks for deleted components
- Updated unit test mocks - removed mocks for deleted components
- Updated E2E helpers - removed bizscreen_welcome_modal_shown localStorage setup
- Verified all 18 DashboardPage unit tests pass
- Verified E2E tests pass (13 passed, same as baseline)
- Verified zero grep matches for deleted component names in src/

## Task Commits

Each task was committed atomically:

1. **Task 1: Clean up DashboardPage imports, state, and JSX** - `68c712c` (refactor)
   - Removed all legacy onboarding imports
   - Removed all legacy state variables
   - Removed all legacy handlers
   - Removed all legacy JSX blocks
   - File reduced from 668 to 361 lines

2. **Task 2: Update test mocks and E2E helpers** - `0a5a03e` (test)
   - Removed mocks for deleted components
   - Removed legacy onboarding service mocks
   - Removed bizscreen_welcome_modal_shown from E2E helpers
   - All 18 unit tests pass

3. **Task 3: Run full test suite and verify cleanup complete** - (verification only)
   - E2E: 13 passed, 278 skipped (same as Plan 01 baseline)
   - Unit: All 18 DashboardPage tests pass
   - Zero grep matches for deleted components in src/

## Files Created/Modified

**Modified:**
- `src/pages/DashboardPage.jsx` - Cleaned up from 668 to 361 lines
- `tests/unit/pages/DashboardPage.test.jsx` - Removed legacy mocks (6 insertions, 61 deletions)
- `tests/e2e/helpers.js` - Removed bizscreen_welcome_modal_shown localStorage setup

## Decisions Made

1. **Removed isFirstRun state** - The legacy first-run flows (WelcomeHero, WelcomeFeatureCards, "Continue Setup" card) were all behind `!config().useUnifiedOnboarding` checks. With unified onboarding as the only path, these are dead code.

2. **Removed demoResult and DemoResultCard** - The demo workspace creation feature was only triggered from the deleted WelcomeModal. With no trigger path remaining, the state and card are unreachable dead code.

3. **Removed unused service imports** - `createDemoWorkspace`, `applyPack`, `getDefaultPackSlug`, and legacy onboarding service functions are no longer imported since their callers were removed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed additional unused code**
- **Found during:** Task 1
- **Issue:** After removing legacy handlers, `handleCreateDemoWorkspace` was defined but never used
- **Fix:** Removed the handler and related `demoResult` state
- **Files modified:** src/pages/DashboardPage.jsx
- **Rationale:** Dead code should be removed completely, not left dangling

## Issues Encountered

None - cleanup executed smoothly. Build and tests passed after each step.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 34 Complete:**
- All legacy onboarding components deleted (Plan 01)
- DashboardPage cleaned up (Plan 02)
- All tests pass

**Remaining plans in Phase 34:**
- Plan 03-04 may be skipped if they only cover already-completed work

**Ready for Phase 35:**
- Polotno editor verification

---
*Phase: 34-cleanup-and-deprecation*
*Completed: 2026-02-01*
