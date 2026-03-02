---
phase: 104-react-render-crash-fixes
plan: 02
subsystem: testing
tags: [e2e, playwright, crash-regression, error-boundary, smoke-test]

# Dependency graph
requires: ["104-01"]
provides:
  - "E2E regression guard for CRASH-01 through CRASH-06"
  - "7 Playwright tests covering all 6 previously-crashing pages"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["setupErrorCapture + assertNoPageErrors error detection", "window.__setCurrentPage programmatic SPA navigation in E2E"]

key-files:
  created:
    - tests/e2e/crash-regression.spec.js
  modified:
    - src/design-system/components/EmptyState.jsx
    - src/components/translations/TranslationFilters.jsx
    - src/pages/DemoToolsPage.jsx

key-decisions:
  - "Used isValidElement + cloneElement instead of createElement for already-rendered JSX icon elements in EmptyState"
  - "Created 6 individual tests plus 1 sequential crawl test for comprehensive regression coverage"
  - "Copied setupErrorCapture/assertNoPageErrors locally rather than exporting from helpers (matches smoke.spec.js pattern)"

patterns-established:
  - "crash-regression.spec.js pattern: login -> navigate via __setCurrentPage -> check error boundary -> check content -> assert no pageerrors"

requirements-completed: [CRASH-01, CRASH-02, CRASH-03, CRASH-04, CRASH-05, CRASH-06]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 104 Plan 02: Crash Regression E2E Tests Summary

**7 Playwright E2E tests guard all 6 crash-fix pages; discovered and fixed 3 additional bugs in EmptyState, TranslationFilters, and DemoToolsPage**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T17:07:12Z
- **Completed:** 2026-03-02T17:11:18Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 3

## Accomplishments
- Created `tests/e2e/crash-regression.spec.js` with 7 tests (6 individual page tests + 1 sequential crawl) covering all CRASH-01 through CRASH-06 requirements
- Tests verify: no error boundary text, no pageerror events, no ReferenceErrors, and visible page content
- Discovered and fixed 3 bugs that Plan 01 missed:
  1. EmptyState `createElement` call on already-rendered JSX elements (caused crash on all pages using `icon={<Component />}`)
  2. TranslationFilters missing `Select` import from design system (caused `Select is not defined` ReferenceError)
  3. DemoToolsPage passing plain object `{label, onClick, icon}` as EmptyState `action` prop instead of JSX Button element
- All 7 tests pass (10 total including 3 auth setup tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create crash regression E2E test for all 6 pages** - `62be570` (test)
2. **Task 2: Verify regression tests pass and fix discovered bugs** - `fef3a02` (fix)

## Files Created/Modified
- `tests/e2e/crash-regression.spec.js` -- 7 E2E tests for crash regression guard
- `src/design-system/components/EmptyState.jsx` -- Fixed icon rendering: isValidElement + cloneElement for JSX elements
- `src/components/translations/TranslationFilters.jsx` -- Added missing Select import from design system
- `src/pages/DemoToolsPage.jsx` -- Converted EmptyState action from object to JSX Button element

## Decisions Made
- Used React's `isValidElement` + `cloneElement` for JSX element detection in EmptyState -- more robust than manual `$$typeof` checks
- Created individual tests per page (not a loop) so each gets its own failure report in CI
- Added `waitForFunction` guard for `__setCurrentPage` availability to handle timing edge cases

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmptyState createElement crash on JSX elements**
- **Found during:** Task 2 (test run)
- **Issue:** Plan 01's defensive rendering used `createElement(icon)` when `icon.$$typeof` was truthy, but JSX elements (`<Users />`) also have `$$typeof` and cannot be passed to `createElement`. The error: "Element type is invalid: expected a string or class/function but got: `<Users />`"
- **Fix:** Replaced detection logic with `isValidElement(icon) ? cloneElement(icon, props) : createElement(icon, props)` -- correctly distinguishes rendered elements from component references
- **Files modified:** src/design-system/components/EmptyState.jsx
- **Commit:** fef3a02

**2. [Rule 1 - Bug] TranslationFilters missing Select import**
- **Found during:** Task 2 (test run for CRASH-04)
- **Issue:** `Select` component used in JSX but never imported, causing `ReferenceError: Select is not defined`
- **Fix:** Added `import { Select } from '../../design-system'`
- **Files modified:** src/components/translations/TranslationFilters.jsx
- **Commit:** fef3a02

**3. [Rule 1 - Bug] DemoToolsPage EmptyState action as plain object**
- **Found during:** Task 2 (test run for CRASH-05)
- **Issue:** EmptyState `action` prop received `{label, onClick, icon}` object instead of JSX element. EmptyState renders action directly as children, so React crashed with "Objects are not valid as a React child (found: object with keys {label, onClick, icon})"
- **Fix:** Converted to `<Button onClick={...} icon={...}>{label}</Button>` JSX element
- **Files modified:** src/pages/DemoToolsPage.jsx
- **Commit:** fef3a02

## Issues Encountered
- Initial test run showed 6 of 7 tests failing, revealing bugs not caught in Plan 01's manual verification
- All 3 bugs were distinct crash patterns requiring separate fixes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 6 CRASH requirements now have automated E2E regression guards
- Phase 104 is complete -- ready for Phase 105 (Functionality Bugs)

## Self-Check: PASSED
