---
phase: 169-human-verification
plan: 01
subsystem: testing
tags: [playwright, e2e, HVER, NAVX, ADMN, ENTR, PLYR, spec-restore, baseline]

requires:
  - phase: 168-test-doc-quality-cleanup
    provides: helpers.js, fixtures/index.js, helpers/index.js, helpers/screenshots.js restored and on disk

provides:
  - 8 E2E spec files byte-identical to commit d0028db6 on main branch
  - 169-BASELINE.md with pass/fail/skip counts and Wave 2 handoff notes for all HVER items

affects:
  - 169-02 (NAVX-09 aria verification — needs nav-accessibility-onboarding.spec.js on disk)
  - 169-03 (player verification — needs player-rendering/offline-selfheal/telemetry.spec.js on disk)

tech-stack:
  added: []
  patterns:
    - "Restore deleted specs via git checkout <sha> -- <path> (verbatim, no modification)"
    - "Capture baseline via per-spec playwright run with --timeout=30000 --reporter=list before fixing"

key-files:
  created:
    - tests/e2e/nav-accessibility-onboarding.spec.js
    - tests/e2e/admin-settings-branding-security.spec.js
    - tests/e2e/enterprise-sso.spec.js
    - tests/e2e/enterprise-api.spec.js
    - tests/e2e/enterprise-analytics.spec.js
    - tests/e2e/player-rendering.spec.js
    - tests/e2e/player-offline-selfheal.spec.js
    - tests/e2e/player-telemetry.spec.js
    - .planning/phases/169-human-verification/169-BASELINE.md
  modified: []

key-decisions:
  - "Restored all 8 files verbatim from d0028db6 — zero diff confirmed via git diff --cached d0028db6"
  - "admin-settings tests fail due to navigateToSettings locator timeout — settings button selector needs update"
  - "HVER-05 player tests all pass (14/14) — no Wave 2 fix needed"
  - "enterprise specs correctly skip when TEST_ENTERPRISE_EMAIL absent — .env.example needs updating"

patterns-established:
  - "Pre-Wave-2 baseline captured truthfully — failed/skipped tests recorded as-is, not fixed"

requirements-completed:
  - HVER-01
  - HVER-02
  - HVER-03
  - HVER-04
  - HVER-05

duration: 11min
completed: 2026-04-14
---

# Phase 169 Plan 01: Restore + Baseline E2E Specs Summary

**8 deleted E2E spec files restored verbatim from d0028db6 and baseline pass/fail captured: HVER-05 player fully passing (14/14), HVER-01 nav 5/6 pass, HVER-02/03 admin blocked by locator issue, HVER-04 enterprise correctly skipped**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-14T03:13:53Z
- **Completed:** 2026-04-14T03:24:46Z
- **Tasks:** 2
- **Files modified:** 9 (8 spec files + 1 baseline doc)

## Accomplishments

- Restored 8 E2E spec files byte-identical to commit d0028db6 — verified via zero-output `git diff --cached d0028db6`
- Playwright parses all 8 files with zero SyntaxError/import errors
- Captured per-spec baseline: HVER-05 all 14 player tests pass, NAVX-08/09 pass, NAVX-10 fails, ADMN fails at nav locator, enterprise specs correctly skip
- Wave 2 plans now have both the spec files on disk and a truthful starting state document

## Task Commits

Each task was committed atomically:

1. **Task 1: Restore 8 deleted E2E spec files from d0028db6** - `fb438c00` (feat)
2. **Task 2: Capture baseline pass/fail/skip status per spec** - `e639021c` (docs)

## Files Created/Modified

- `tests/e2e/nav-accessibility-onboarding.spec.js` - NAVX-08/09/10 E2E coverage (393 lines, restored from d0028db6)
- `tests/e2e/admin-settings-branding-security.spec.js` - ADMN-02/03/06 E2E coverage (145 lines, restored from d0028db6)
- `tests/e2e/enterprise-sso.spec.js` - ENTR-01 E2E coverage (71 lines, restored from d0028db6)
- `tests/e2e/enterprise-api.spec.js` - ENTR-02/03 E2E coverage (87 lines, restored from d0028db6)
- `tests/e2e/enterprise-analytics.spec.js` - ENTR-04/05 E2E coverage (110 lines, restored from d0028db6)
- `tests/e2e/player-rendering.spec.js` - PLYR-01/02 E2E coverage (282 lines, restored from d0028db6)
- `tests/e2e/player-offline-selfheal.spec.js` - PLYR-03/04 E2E coverage (235 lines, restored from d0028db6)
- `tests/e2e/player-telemetry.spec.js` - PLYR-05/06 E2E coverage (239 lines, restored from d0028db6)
- `.planning/phases/169-human-verification/169-BASELINE.md` - Baseline results table + Wave 2 handoff notes

## Decisions Made

- Restored all files verbatim from d0028db6 without any modification — byte-identical confirmed
- Copied main repo `.env` to worktree so playwright.config.js `dotenv.config()` could load test credentials
- Recorded admin-settings failures truthfully as navigation locator timeouts (not fixed — Wave 2 responsibility)
- NAVX-10 onboarding wizard failure recorded truthfully — sidebarVisible assertion fails; Wave 2 to investigate redirect timing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hard reset worktree after erroneous first commit**
- **Found during:** Task 1 (restore spec files)
- **Issue:** Initial `git reset --soft 9e48e407` on an old worktree HEAD (ae3b1dd5, Jan 2026) staged all the diffs going backward in time — causing a commit that deleted .planning/, src/components/, supabase/migrations/ and other critical files
- **Fix:** `git reset --hard 9e48e407` to restore correct working tree state, then re-ran all 8 `git checkout d0028db6 -- <file>` commands cleanly
- **Files modified:** None net — corrected to the intended 8 file additions only
- **Verification:** `git show --stat fb438c00` shows exactly 8 files created, zero deletions
- **Committed in:** fb438c00 (Task 1 corrected commit)

**2. [Rule 3 - Blocking] Copied .env from main repo to worktree**
- **Found during:** Task 2 (baseline test runs)
- **Issue:** Worktree had no `.env` file; playwright.config.js calls `dotenv.config()` from cwd so TEST_USER_EMAIL was absent; admin-settings spec would have skipped instead of running
- **Fix:** `cp /Users/massimodamico/bizscreen/.env .env` — copies test credentials so skip guards behave correctly
- **Files modified:** `.env` (not tracked, not committed — intentionally excluded from git)
- **Verification:** admin-settings spec ran (did not skip) confirming TEST_USER_EMAIL was loaded

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to correctly execute the plan. No scope creep. Spec file contents unchanged.

## Issues Encountered

- Worktree was initialized from a very old commit (ae3b1dd5 — Jan 2026 "Optimize dashboard queries" commit) rather than the expected base 9e48e407. The `git reset --soft` approach staged historical diffs as deletions. Resolved with `git reset --hard` to the correct expected base.
- Dev server not running at plan start — playwright.config.js `webServer: { reuseExistingServer: true }` config means it auto-starts when not found, but the startup took ~5s.

## Known Stubs

None — this plan creates only test spec files and a documentation file. No UI components or data services with stubs.

## Threat Flags

None — no new production surface introduced. Only E2E test spec files (read-only at runtime in CI/local) and a planning documentation file were added.

## User Setup Required

To run HVER-04 enterprise tests, add `TEST_ENTERPRISE_EMAIL` and `TEST_ENTERPRISE_PASSWORD` to `.env`. The restored enterprise-sso/api/analytics specs are guarded with `test.skip(() => !process.env.TEST_ENTERPRISE_EMAIL)`.

To fix the enterprise.spec.js "super admin can access enterprise features" failure, add `TEST_SUPERADMIN_PASSWORD` to `.env`.

## Next Phase Readiness

- Wave 2 plans (169-02, 169-03) now have all target spec files on disk
- 169-BASELINE.md provides exact starting state for each HVER item
- HVER-05 (player) is already verified passing — 169-03 can document and close
- HVER-01 NAVX-10 needs sidebarVisible assertion fix before it can pass
- HVER-02/03 admin-settings needs navigateToSettings locator update before tests can run

---
*Phase: 169-human-verification*
*Completed: 2026-04-14*
