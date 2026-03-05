---
phase: quick-64
plan: 01
subsystem: testing
tags: [playwright, e2e, auth, login, signout]

requires:
  - phase: quick-60
    provides: DEV_AUTH_BYPASS for dev mode auth testing
provides:
  - Full auth lifecycle E2E test suite (login, sign out, console error capture)
  - BUGS.md tracker file
affects: [auth, e2e-tests]

tech-stack:
  added: []
  patterns: [dev-bypass-aware test skipping, console error filtering]

key-files:
  created:
    - tests/e2e/auth-full-flow.spec.js
    - .planning/BUGS.md
  modified:
    - tests/e2e/auth.setup.js

key-decisions:
  - "Skip sign-out redirect tests when DEV_AUTH_BYPASS active (dev mode expected behavior)"
  - "Filter backend connection errors as benign in console error assertions"

patterns-established:
  - "DEV_AUTH_BYPASS detection: check if /auth/login redirects to /app before testing sign-out flows"
  - "Console error filtering: whitelist known benign patterns (connection refused, auth session missing)"

requirements-completed: [QT-64]

duration: 7min
completed: 2026-03-05
---

# Quick Task 64: Full Auth Flow E2E Test Summary

**Playwright E2E test suite covering login redirect, sign-out button click, and console error capture during auth lifecycle**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-05T22:46:08Z
- **Completed:** 2026-03-05T22:53:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created comprehensive auth flow E2E test with 5 test cases (3 pass, 2 skip in dev mode)
- Fixed pre-existing race condition in auth.setup.js where DEV_AUTH_BYPASS caused flaky setup failures
- Established BUGS.md tracker file with QT-64 findings (clean pass with caveats)
- Console error capture validates no unexpected errors during auth lifecycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Write and run full auth flow E2E test** - `9a8ee9f` (feat)
2. **Task 2: Append findings to BUGS.md** - `48038ad` (docs)

## Files Created/Modified
- `tests/e2e/auth-full-flow.spec.js` - Full auth lifecycle E2E test (login, sign out, console errors)
- `tests/e2e/auth.setup.js` - Fixed race condition with DEV_AUTH_BYPASS URL check
- `.planning/BUGS.md` - Bug tracker with QT-64 findings

## Decisions Made
- Skipped sign-out redirect tests when DEV_AUTH_BYPASS is active rather than forcing a test that cannot pass in dev mode. The bypass immediately re-authenticates after sign out, making redirect verification impossible.
- Filtered backend connection errors (ERR_CONNECTION_REFUSED, WebSocket failures) as benign since the Supabase backend is not running locally and the app handles these gracefully.
- Added URL-based fallback check in auth.setup.js to handle the DEV_AUTH_BYPASS race condition where Promise.race incorrectly detected need-login when the app was actually bypassing auth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed auth.setup.js race condition with DEV_AUTH_BYPASS**
- **Found during:** Task 1 (running auth flow tests)
- **Issue:** The auth setup's Promise.race between login form and sidebar was flaky when DEV_AUTH_BYPASS was active. The setup would detect "need-login" but the page had actually redirected to /app, causing a timeout on `getByPlaceholder(/email/i).fill()`.
- **Fix:** Added URL check after Promise.race: if URL contains /app after detecting need-login, treat as already authenticated.
- **Files modified:** tests/e2e/auth.setup.js
- **Verification:** All 3 setup tests pass consistently
- **Committed in:** 9a8ee9f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary to unblock the chromium project tests from running. No scope creep.

## Issues Encountered
- DEV_AUTH_BYPASS prevents testing the full sign-out redirect flow. Tests that require real auth are marked with `(requires real auth)` and skip when bypass is detected.
- Supabase backend not running generates many console errors (ERR_CONNECTION_REFUSED). These are filtered in the console error assertion to avoid false positives.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth flow tests ready for use when running against a real Supabase backend
- Sign-out redirect tests will automatically un-skip when VITE_DEV_BYPASS_AUTH is disabled
- BUGS.md ready for future bug tracking entries

---
*Phase: quick-64*
*Completed: 2026-03-05*
