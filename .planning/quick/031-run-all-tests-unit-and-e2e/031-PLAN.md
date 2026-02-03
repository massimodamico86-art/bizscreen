---
quick: 031
type: execute
autonomous: true
files_modified: []
estimated_context: 20%
---

<objective>
Run all tests (unit and E2E) to establish current baseline after quick task 030 fix.

Purpose: Verify test suite health and track any improvements from YodeckAddMediaModal X import fix.
Output: Test results summary with pass/fail counts.
</objective>

<context>
@.planning/STATE.md

Previous baseline (quick-029): 340 passed, 433 failed, 260 skipped (out of 1203 E2E tests)
Recent fix: quick-030 fixed YodeckAddMediaModal.jsx "X is not defined" error
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run unit tests with Vitest</name>
  <files>None (test run only)</files>
  <action>
    Run unit tests using npm test command.
    Capture full output including pass/fail summary.
    Note any failures for investigation.
  </action>
  <verify>npm test completes (exit 0 for all pass, exit 1 if failures)</verify>
  <done>Unit test results captured with pass/fail count</done>
</task>

<task type="auto">
  <name>Task 2: Run E2E tests with Playwright</name>
  <files>None (test run only)</files>
  <action>
    Run E2E tests using npx playwright test command.
    Capture full output including pass/fail/skip summary.
    Compare against previous baseline (340 passed, 433 failed, 260 skipped).
    Note any changes - improvements from quick-030 fix or new failures.
  </action>
  <verify>npx playwright test completes with summary output</verify>
  <done>E2E test results captured with comparison to baseline</done>
</task>

</tasks>

<verification>
- Unit tests: Results logged with pass/fail count
- E2E tests: Results logged with comparison to quick-029 baseline
</verification>

<success_criteria>
- Both test suites complete execution
- Results summary documented for tracking
</success_criteria>

<output>
Report test results in STATE.md quick tasks completed table.
Format: "Run all tests (unit and E2E) - [results summary]"
</output>
