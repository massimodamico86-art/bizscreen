---
phase: 41-feature-flag-cleanup
plan: 01
subsystem: ui
tags: [feature-flags, onboarding, dead-code-removal, vite-env]

# Dependency graph
requires:
  - phase: 34-legacy-component-cleanup
    provides: "Legacy onboarding components deleted, unified onboarding is only path"
  - phase: 31-unified-onboarding
    provides: "Unified onboarding controller and useUnifiedOnboarding hook"
provides:
  - "Clean codebase with zero VITE_USE_UNIFIED_ONBOARDING references"
  - "Unconditional unified onboarding rendering (no feature flag gate)"
  - "AutoBuildOnboardingModal de-wired from App.jsx"
  - "~17KB App.jsx bundle reduction from dead code removal"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature flags removed when feature becomes the only path"

key-files:
  created: []
  modified:
    - src/config/env.js
    - src/pages/DashboardPage.jsx
    - src/App.jsx
    - .env.local
    - tests/e2e/helpers.js

key-decisions:
  - "Removed config() import from DashboardPage after all config() references eliminated"
  - "Removed config import, fetchScenesForTenant import from App.jsx since both were only used in dead AutoBuild code"
  - ".env.local is gitignored so change is local-only (as expected for env files)"

patterns-established:
  - "Feature flag cleanup: remove flag from env schema, config export, all conditional gates, then remove unused imports"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 41 Plan 01: Feature Flag Cleanup Summary

**Removed VITE_USE_UNIFIED_ONBOARDING feature flag and dead AutoBuild onboarding code, reducing App.jsx bundle by ~17KB**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T22:45:24Z
- **Completed:** 2026-02-09T22:48:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Removed all 5 references to VITE_USE_UNIFIED_ONBOARDING from env schema, config export, DashboardPage conditionals, .env.local, and test comment
- De-wired AutoBuildOnboardingModal from App.jsx: import, state, useEffect, props, and JSX all removed
- Reduced App.jsx bundle from 294.63 KB to 277.90 KB (~17KB dead code eliminated)
- All 2079 unit tests pass and build succeeds with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove feature flag from env config, DashboardPage, env file, and test comment** - `2290eab` (feat)
2. **Task 2: Remove dead AutoBuild onboarding code from App.jsx** - `dfb7f1d` (feat)

## Files Created/Modified
- `src/config/env.js` - Removed VITE_USE_UNIFIED_ONBOARDING from envSchema.optional and useUnifiedOnboarding from getConfig() return
- `src/pages/DashboardPage.jsx` - Removed config() feature flag gates on onboarding and ScreenPairingReminderCard, removed config import
- `src/App.jsx` - Removed AutoBuildOnboardingModal import/state/useEffect/props/JSX, removed config and fetchScenesForTenant imports
- `.env.local` - Removed VITE_USE_UNIFIED_ONBOARDING=true line (gitignored, local-only)
- `tests/e2e/helpers.js` - Updated stale comment referencing Welcome Modal and OnboardingWizard

## Decisions Made
- Removed config() import from DashboardPage after verifying no other config() usage remained in the file
- Removed config and fetchScenesForTenant imports from App.jsx after verifying both were only used in the dead AutoBuild useEffect
- Did NOT delete AutoBuildOnboardingModal.jsx file itself (out of scope per plan, only de-wired from App.jsx)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `.env.local` is in `.gitignore` so the change was applied locally but not committed (expected behavior for env files)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Feature flag cleanup complete for VITE_USE_UNIFIED_ONBOARDING
- AutoBuildOnboardingModal.jsx file still exists as unused code (could be deleted in a future cleanup if desired)
- Codebase is clean with zero dead feature flag conditionals
- This is the final phase of v2.3 Production Hardening milestone

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 41-feature-flag-cleanup*
*Completed: 2026-02-09*
