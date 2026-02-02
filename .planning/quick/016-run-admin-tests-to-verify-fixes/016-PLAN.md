---
phase: quick
plan: 016
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true

must_haves:
  truths:
    - "Admin tests complete without timeout failures"
    - "Super admin dashboard loads without crash"
    - "Test results show improvement over previous runs"
  artifacts: []
  key_links: []
---

<objective>
Run admin E2E tests to verify that quick tasks 014 and 015 resolved the issues.

Purpose: Confirm that auth refactoring (014) and import fixes (015) allow admin tests to pass
Output: Test results documenting pass/fail counts and any remaining issues
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/014-debug-admin-auth-issues/014-SUMMARY.md
@.planning/quick/015-fix-super-admin-dashboard-crash/015-SUMMARY.md
@tests/e2e/admin.spec.js
</context>

<background>
Quick task 014 refactored admin.spec.js to use Playwright storage state auth:
- Removed manual login from all beforeEach hooks
- Added test.use({ storageState: 'playwright/.auth/superadmin.json' })
- Tests were failing because super admin dashboard crashed

Quick task 015 fixed the super admin dashboard crash:
- Added missing imports: ErrorBoundary, ChevronRight, X, Eye, EyeOff
- Root cause: ESLint auto-fix incorrectly removed "unused" imports
- 015-SUMMARY reports 20/27 admin tests passed

Expected outcome: All or most admin tests should now pass.
</background>

<tasks>

<task type="auto">
  <name>Task 1: Run admin tests with chromium-superadmin project</name>
  <files>None (verification only)</files>
  <action>
Run the admin E2E tests using the correct project configuration:

1. Ensure dev server is running or use webServer config
2. Run: `npx playwright test admin.spec.js --project=chromium-superadmin`
3. If tests fail due to auth setup, run: `npx playwright test auth.setup.js` first
4. Capture the full test output including:
   - Total tests run
   - Passed/failed/skipped counts
   - Any error messages for failed tests

Document findings:
- Which tests pass vs fail
- Whether failures are auth-related (task 014 scope) or UI-related (task 015 scope)
- Whether the "Something Went Wrong" crash is resolved

If all tests pass, great. If some fail:
- Categorize failures as: auth issues, dashboard crash, UI element not found, or other
- Document which specific tests fail and why
  </action>
  <verify>
Test command completes without hanging (no 30s+ timeouts).
Results are captured and documented.
  </verify>
  <done>
Test results recorded with pass/fail breakdown.
Comparison to 015-SUMMARY baseline (20/27 passed).
  </done>
</task>

<task type="auto">
  <name>Task 2: Document verification results</name>
  <files>.planning/quick/016-run-admin-tests-to-verify-fixes/016-SUMMARY.md</files>
  <action>
Create 016-SUMMARY.md with:
1. Test results (pass/fail/skip counts)
2. Comparison to baseline from 015-SUMMARY (20/27)
3. List of any remaining failures with root cause analysis
4. Verdict: Are tasks 014 and 015 verified as successful?

Use the standard summary template format.
  </action>
  <verify>Summary file exists and contains test results</verify>
  <done>016-SUMMARY.md created with complete verification results</done>
</task>

</tasks>

<verification>
- Admin tests run to completion without hanging
- Super admin dashboard does not crash with "Something Went Wrong"
- Test pass rate is documented and compared to baseline
</verification>

<success_criteria>
- Test suite runs successfully with chromium-superadmin project
- Results show improvement or stability vs 015-SUMMARY baseline (20/27)
- No new regressions introduced
- Remaining failures (if any) are categorized and documented
</success_criteria>

<output>
After completion, create `.planning/quick/016-run-admin-tests-to-verify-fixes/016-SUMMARY.md`
</output>
