---
phase: 43-e2e-test-triage
plan: 01
subsystem: testing
tags: [playwright, e2e, audit, skip-triage, test-cleanup]

# Dependency graph
requires:
  - phase: 38-e2e-test-coverage-gate
    provides: "E2E test suite with 917 skipped tests and coverage report"
  - phase: 37-e2e-test-stabilization
    provides: "Skipped tests inventory and stabilization patterns"
provides:
  - "E2E-AUDIT-REPORT.md categorizing all 917 skipped tests into 9 actionable categories"
  - "Removal of 3 obsolete diagnostic/debug test files (10 tests)"
affects: [43-02, 43-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "9-category skip classification: project-specific, selector mismatch, auth pattern, obsolete feature, diagnostic, blocked-nav, missing feature, external dep, credentials"

key-files:
  created:
    - ".planning/phases/43-e2e-test-triage/E2E-AUDIT-REPORT.md"
  modified: []

key-decisions:
  - "Classified ~800 project-specific skips as intentional/correct -- no action needed for multi-project skip pattern"
  - "Separated obsolete-feature tests (44 in describe.skip) from blocked-navigation tests (30 in scenes/scene-editor) for different triage actions"
  - "Deleted 3 diagnostic files immediately rather than deferring -- they had zero test value (no assertions, hardcoded credentials, legacy auth)"

patterns-established:
  - "Skip audit methodology: scan all spec files, categorize by skip mechanism (describe.skip, test.fixme, test.skip, project-specific, credential-gated)"

# Metrics
duration: 7min
completed: 2026-02-10
---

# Phase 43 Plan 01: E2E Test Skip Audit Summary

**Comprehensive audit of 917 skipped E2E tests across 38 spec files, categorized into 9 actionable buckets, with 3 obsolete diagnostic files deleted**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-10T02:01:30Z
- **Completed:** 2026-02-10T02:08:06Z
- **Tasks:** 1
- **Files modified:** 4 (1 created, 3 deleted)

## Accomplishments
- Created E2E-AUDIT-REPORT.md with every skipped test categorized by reason, file, line number, and recommended action
- Identified ~800 project-specific skips as intentional (multi-project Playwright pattern), requiring no action
- Catalogued 8 fixable selector-mismatch tests, 5 auth-pattern issues, 44 obsolete feature tests, 30 blocked navigation tests, 4 missing SEO features, 1 external dependency, and 15+ credential-gated tests
- Deleted 3 obsolete diagnostic/debug test files (debug.spec.js, feature-diagnostic.spec.js, location-diagnostic.spec.js) containing 10 tests with zero ongoing value

## Task Commits

Each task was committed atomically:

1. **Task 1: Create E2E audit report and delete obsolete test files** - `a9a185e` (feat)

## Files Created/Modified
- `.planning/phases/43-e2e-test-triage/E2E-AUDIT-REPORT.md` - Comprehensive categorized audit of all 917 skipped E2E tests
- `tests/e2e/debug.spec.js` - DELETED (manual debug helper, no assertions)
- `tests/e2e/feature-diagnostic.spec.js` - DELETED (one-off diagnostic with hardcoded credentials)
- `tests/e2e/location-diagnostic.spec.js` - DELETED (one-off diagnostic with legacy login pattern)

## Decisions Made
- Classified ~800 project-specific skips as intentional -- the Playwright multi-project pattern (chromium, chromium-admin, chromium-superadmin) means each test is designed for one project but runs across all three, generating 2 skips per test. This is correct behavior.
- Separated "obsolete feature" (44 tests in describe.skip for features not in UI) from "blocked navigation" (30 tests for scenes/scene-editor where feature exists but is not in sidebar). Different triage paths: obsolete tests may be removed, blocked tests should be re-enabled when navigation is added.
- Deleted diagnostic files immediately rather than marking for later cleanup -- they contained no assertions, used hardcoded credentials incompatible with storage state auth, and served only as one-off development tools.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- E2E-AUDIT-REPORT.md provides complete input for Plan 43-02 (fix selector mismatch and auth pattern tests)
- Categories clearly delineate what Plan 43-03 should document vs what should be removed
- Test suite verified: 1191 tests in 35 remaining spec files, no breakage from deletions

## Self-Check: PASSED

- FOUND: `.planning/phases/43-e2e-test-triage/E2E-AUDIT-REPORT.md`
- FOUND: `.planning/phases/43-e2e-test-triage/43-01-SUMMARY.md`
- CONFIRMED DELETED: `tests/e2e/debug.spec.js`
- CONFIRMED DELETED: `tests/e2e/feature-diagnostic.spec.js`
- CONFIRMED DELETED: `tests/e2e/location-diagnostic.spec.js`
- FOUND: commit `a9a185e`
- VERIFIED: Report contains all 9 categories
- VERIFIED: 1191 tests in 35 files (no breakage from deletions)

---
*Phase: 43-e2e-test-triage*
*Completed: 2026-02-10*
