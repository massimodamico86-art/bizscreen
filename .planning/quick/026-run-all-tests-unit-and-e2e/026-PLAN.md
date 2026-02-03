---
phase: quick
plan: 026
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
---

<objective>
Run all tests (unit and E2E) and report results.

Purpose: Verify current test suite health after recent quick task fixes (019-025)
Output: Test execution summary with pass/fail counts
</objective>

<context>
This is a verification task to check the health of the test suite.

Test commands:
- `npm run test` - Vitest unit/integration tests
- `npm run test:e2e` - Playwright E2E tests

Recent quick tasks (019-025) fixed various import issues. This task confirms the test suite is healthy.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run unit and integration tests</name>
  <files>None (read-only execution)</files>
  <action>
    Run vitest tests with `npm run test` and capture results.

    Report:
    - Total test count
    - Pass count
    - Fail count (list failing test files if any)
    - Skip count
  </action>
  <verify>Command completes (exit 0 = all pass, exit 1 = some fail)</verify>
  <done>Unit test results documented</done>
</task>

<task type="auto">
  <name>Task 2: Run E2E tests</name>
  <files>None (read-only execution)</files>
  <action>
    Run Playwright E2E tests with `npm run test:e2e` and capture results.

    Report:
    - Total test count
    - Pass count
    - Fail count (list failing tests if any)
    - Skip count

    Note: Server must be running for E2E tests. If server not running, document that.
  </action>
  <verify>Command completes</verify>
  <done>E2E test results documented</done>
</task>

<task type="auto">
  <name>Task 3: Summarize test health</name>
  <files>None</files>
  <action>
    Create summary table of overall test health:

    | Suite | Total | Pass | Fail | Skip |
    |-------|-------|------|------|------|
    | Unit  | X     | X    | X    | X    |
    | E2E   | X     | X    | X    | X    |

    If failures exist, list them for potential follow-up tasks.
    Do NOT fix failures - just report them.
  </action>
  <verify>Summary created</verify>
  <done>Test health summary documented</done>
</task>

</tasks>

<verification>
- Unit tests executed and results captured
- E2E tests executed and results captured
- Summary table created
</verification>

<success_criteria>
- All test commands run to completion
- Results documented with pass/fail/skip counts
- Any failures listed (without fixing them)
</success_criteria>

<output>
Report test results in response. No SUMMARY.md needed for verification-only task.
</output>
