---
quick: 028
type: execute
description: Run all tests (unit and E2E)
autonomous: true
---

<objective>
Run the complete test suite (vitest unit tests and Playwright E2E tests) and report results.

Purpose: Verify current codebase health after quick tasks 025-027 import fixes
Output: Test results summary showing pass/fail counts
</objective>

<context>
@.planning/STATE.md
Test commands from package.json:
- `npm run test` - vitest unit tests
- `npm run test:e2e` - Playwright E2E tests
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run unit tests (vitest)</name>
  <files>None modified - read only</files>
  <action>
Run the vitest unit test suite:
```bash
npm run test
```

Capture and report:
- Total tests run
- Tests passed
- Tests failed
- Tests skipped
- Any error messages from failures
  </action>
  <verify>Command completes (exit code 0 for pass, non-zero for failures)</verify>
  <done>Unit test results captured and summarized</done>
</task>

<task type="auto">
  <name>Task 2: Run E2E tests (Playwright)</name>
  <files>None modified - read only</files>
  <action>
Run the Playwright E2E test suite:
```bash
npm run test:e2e
```

Capture and report:
- Total tests run
- Tests passed
- Tests failed
- Tests skipped
- Any error messages from failures

Note: E2E tests require the dev server running. If tests fail due to no server, note this in results.
  </action>
  <verify>Command completes (with results, regardless of pass/fail)</verify>
  <done>E2E test results captured and summarized</done>
</task>

<task type="auto">
  <name>Task 3: Compile results summary</name>
  <files>None modified - reporting only</files>
  <action>
Compile a final summary with:

1. Unit Tests (vitest):
   - Pass/Fail/Skip counts
   - Duration
   - Any notable failures

2. E2E Tests (Playwright):
   - Pass/Fail/Skip counts
   - Duration
   - Any notable failures

3. Overall Health Assessment:
   - Green: All tests pass
   - Yellow: Some tests fail but core functionality works
   - Red: Critical failures

Do NOT fix any issues - just report them. Fixes would be separate quick tasks.
  </action>
  <verify>Summary clearly states test health status</verify>
  <done>Complete test suite results documented</done>
</task>

</tasks>

<verification>
- Both test commands executed
- Results captured for each suite
- Summary provided to user
</verification>

<success_criteria>
- Unit test results reported (pass/fail counts)
- E2E test results reported (pass/fail counts)
- Overall health assessment provided
- No code changes made (report only)
</success_criteria>

<output>
Report results directly to user. Update STATE.md with quick task completion.
</output>
