---
phase: 25-test-infrastructure
plan: 01
subsystem: testing
tags: [vitest, mocking, circular-dependency, loggingService, DOMPurify]

# Dependency graph
requires:
  - phase: 24-player-restructure
    provides: Refactored Player.jsx structure, test baseline
provides:
  - Global loggingService mock breaking circular dependency
  - Fixed mock configurations for service tests
  - XSS sanitization in HelpCenterPage
  - Clean test suite (73 files, 2071 tests passing)
affects: [26-scene-migration, future-test-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [vi.mock in setup.js for global mocking, permission mock bypass pattern]

key-files:
  created:
    - tests/mocks/loggingService.js
  modified:
    - tests/setup.js
    - tests/unit/pages/hooks/pageHooks.test.jsx
    - tests/unit/services/scheduleService.test.js
    - tests/unit/pages/DashboardPage.test.jsx
    - src/pages/HelpCenterPage.jsx

key-decisions:
  - "Global vi.mock in setup.js to break loggingService<->supabase circular dependency"
  - "Mock permissionsService.requiresApproval to bypass DB calls in schedule tests"
  - "Use getAllByText for responsive layout duplicate elements in DashboardPage tests"

patterns-established:
  - "Global mocking: Add vi.mock to tests/setup.js for modules causing circular dependencies"
  - "Permission bypass: Mock requiresApproval to return false for tests not testing permissions"

# Metrics
duration: 7min
completed: 2026-01-28
---

# Phase 25 Plan 01: Circular Dependency Fixes Summary

**Global loggingService mock breaks circular dependency, fixing 46 test failures across 20 files**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-28T14:59:12Z
- **Completed:** 2026-01-28T15:05:43Z
- **Tasks:** 2
- **Files modified:** 6 created/modified, 5 deleted

## Accomplishments
- Fixed circular dependency between loggingService.js and supabase.js via global mock
- Reduced failing test files from 20 to 0 (73 files, 2071 tests passing)
- Fixed XSS vulnerability in HelpCenterPage (using sanitizeHTML now)
- Removed 5 orphaned test files referencing deleted source files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add global loggingService mock** - `cbb4f76` (feat)
2. **Task 2: Fix remaining test failures** - `8c45790` (fix)
3. **Orphaned test cleanup** - `a681a3d` (chore)

## Files Created/Modified
- `tests/mocks/loggingService.js` - Centralized loggingService mock module
- `tests/setup.js` - Added global vi.mock for loggingService
- `tests/unit/pages/hooks/pageHooks.test.jsx` - Added ROTATION_MODES to campaignService mock
- `tests/unit/services/scheduleService.test.js` - Added permissionsService/approvalService mocks, fixed mock chains
- `tests/unit/pages/DashboardPage.test.jsx` - Changed getByText to getAllByText for responsive layouts
- `src/pages/HelpCenterPage.jsx` - Added sanitizeHTML to prevent XSS

## Decisions Made
- Used vi.mock factory pattern in setup.js rather than mock module import for simplicity
- Mocked requiresApproval to always return false to bypass DB checks in schedule service tests
- Used getAllByText in Dashboard tests to handle responsive duplicate elements

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deleted orphaned test files**
- **Found during:** Task 2
- **Issue:** 5 test files referenced source files that had been deleted (api/lib/lruCache.js, api/lib/usageTracker.js, api/lib/featureCheck.js, src/utils/logger.js)
- **Fix:** Deleted the orphaned test files
- **Files deleted:** tests/unit/api/lruCache.test.js, tests/unit/api/usageTracker.test.js, tests/integration/featureFlags.test.js, tests/integration/usageQuotas.test.js, tests/unit/utils/logger.test.js
- **Verification:** npm test passes
- **Committed in:** a681a3d

**2. [Rule 1 - Bug] Fixed XSS vulnerability in HelpCenterPage**
- **Found during:** Task 2 (HelpCenterPage test failure)
- **Issue:** HelpCenterPage used dangerouslySetInnerHTML without sanitization, allowing script injection
- **Fix:** Added sanitizeHTML wrapper from existing security/sanitize.js module
- **Files modified:** src/pages/HelpCenterPage.jsx
- **Verification:** XSS test passes, script tags stripped from content
- **Committed in:** 8c45790 (part of Task 2)

**3. [Rule 1 - Bug] Fixed mock chain for scheduleService getWeekPreview**
- **Found during:** Task 2
- **Issue:** Mock for `.in()` resolved directly instead of returning `.order()` chain
- **Fix:** Changed mockResolvedValue to mockReturnValue with order function
- **Files modified:** tests/unit/services/scheduleService.test.js
- **Verification:** getWeekPreview test passes
- **Committed in:** 8c45790 (part of Task 2)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correct test operation. XSS fix improved security. No scope creep.

## Issues Encountered
- scheduleService tests called canAssignContent which made DB calls - resolved by mocking permissionsService to bypass
- DashboardPage renders duplicate elements for responsive design - resolved by using getAllByText

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 2071 tests passing across 73 test files
- Test infrastructure stable for future development
- Global mocking pattern established for other circular dependency issues if needed

---
*Phase: 25-test-infrastructure*
*Completed: 2026-01-28*
