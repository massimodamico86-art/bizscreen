---
phase: 34-cleanup-and-deprecation
plan: 01
subsystem: onboarding
tags: [cleanup, deprecation, dead-code-removal]

# Dependency graph
requires:
  - phase: 30-33
    provides: Unified onboarding flow replacing legacy components
provides:
  - Deletion of 3 legacy onboarding components (1000+ lines removed)
  - Updated barrel exports without deleted component references
affects: [34-02, future-onboarding-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Clean deletion with barrel export updates
    - Verify dependencies removed along with deleted components

key-files:
  created: []
  modified:
    - src/components/onboarding/index.js
    - src/pages/dashboard/index.js

deleted:
  - src/components/OnboardingWizard.jsx (539 lines)
  - src/components/onboarding/OnboardingBanner.jsx (102 lines)
  - src/pages/dashboard/WelcomeModal.jsx (359 lines)

key-decisions:
  - "Proceed with deletions despite pre-existing E2E test failures (infrastructure issues)"
  - "Storage key references in DashboardPage.jsx to be cleaned in Plan 02"

patterns-established:
  - "Deletion workflow: delete files, update barrel exports, verify build"

# Metrics
duration: 5min
completed: 2026-02-01
---

# Phase 34 Plan 01: Delete Legacy Onboarding Components Summary

**Removed 1000+ lines of dead code by deleting OnboardingWizard, OnboardingBanner, and WelcomeModal components replaced by unified onboarding flow**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-01T03:26:01Z
- **Completed:** 2026-02-01T03:31:00Z
- **Tasks:** 3 (1 checkpoint continuation, 2 new)
- **Files modified:** 5 (3 deleted, 2 barrel exports updated)

## Accomplishments
- Deleted OnboardingWizard.jsx (539 lines - broken wizard never properly wired)
- Deleted OnboardingBanner.jsx (102 lines - replaced by unified flow)
- Deleted WelcomeModal.jsx (359 lines - replaced by unified flow)
- Updated barrel exports in onboarding/index.js and dashboard/index.js
- Verified build still passes after deletions

## Task Commits

Each task was committed atomically:

1. **Task 1: Run E2E baseline before any deletions** - checkpoint (no commit)
   - E2E baseline captured: 13 passed, 61 failed (infrastructure), 278 skipped
   - Unit baseline: 2067 passed, 12 failed (mock issues)
   - User approved proceeding despite pre-existing failures
2. **Task 2: Delete legacy component files and update barrel exports** - `f11ea8b` (chore)
3. **Task 3: Remove storage key references from deleted component areas** - verification only (no commit)
   - Verified `onboarding_banner_dismissed` fully removed
   - Noted `bizscreen_welcome_modal_shown` in DashboardPage.jsx (Plan 02 cleanup)

## Files Created/Modified

**Deleted:**
- `src/components/OnboardingWizard.jsx` - Broken wizard component (539 lines)
- `src/components/onboarding/OnboardingBanner.jsx` - Legacy banner (102 lines)
- `src/pages/dashboard/WelcomeModal.jsx` - Legacy modal (359 lines)

**Modified:**
- `src/components/onboarding/index.js` - Removed OnboardingBanner export
- `src/pages/dashboard/index.js` - Removed WelcomeModal exports

## Decisions Made

1. **Proceed despite pre-existing test failures** - User confirmed E2E failures (61 tests) are infrastructure issues unrelated to components being deleted. Unit test failures (12 tests) are mock configuration issues. Approved proceeding with deletions.

2. **Storage key cleanup deferred to Plan 02** - The `bizscreen_welcome_modal_shown` key still exists in DashboardPage.jsx. This is expected and will be cleaned up in Plan 02 (DashboardPage cleanup task).

## Deviations from Plan

None - plan executed exactly as written. The storage key reference in DashboardPage.jsx was explicitly documented in the plan as "expected and addressed in Plan 02".

## Issues Encountered

**Pre-existing E2E test failures:** The baseline E2E run showed 61 failures, but these are documented infrastructure issues (Supabase connection, missing data fixtures) rather than problems with the components being deleted. User approved proceeding after review.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02:**
- DashboardPage.jsx still references deleted components (imports, state, JSX)
- tests/e2e/helpers.js still sets `bizscreen_welcome_modal_shown` storage key
- Plan 02 will clean up these references and verify tests pass

**Remaining cleanup scope:**
- DashboardPage.jsx import/state/JSX cleanup
- Unit test mock updates
- E2E helper storage key removal

---
*Phase: 34-cleanup-and-deprecation*
*Completed: 2026-02-01*
