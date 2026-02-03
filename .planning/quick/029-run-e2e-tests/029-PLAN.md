---
phase: quick
plan: 029
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
---

<objective>
Run E2E tests to verify the current state of the application after recent fixes.

Purpose: Validate that quick tasks 025-027 (import fixes) resolved the issues and get a baseline of test results.
Output: Test results showing pass/fail counts and any remaining issues.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@playwright.config.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run E2E test suite</name>
  <files>None (read-only verification)</files>
  <action>
Run the full E2E test suite using Playwright:

```bash
npm run test:e2e
```

The test suite:
- Has 37 spec files in tests/e2e/
- Runs against localhost:5173 (webServer auto-starts via `npm run dev`)
- Uses pre-authenticated storage states for client, admin, and superadmin roles
- Reports results in list format with HTML report in playwright-report/

If tests fail, capture:
1. Total tests run vs passed vs failed
2. Which spec files have failures
3. Any common error patterns (missing imports, auth issues, selector failures)
  </action>
  <verify>
Test command completes (exit 0 = all pass, exit 1 = some failures).
Results are visible in terminal output.
  </verify>
  <done>
E2E test suite has been executed and results are available. Summary includes:
- Total tests: X
- Passed: X
- Failed: X (if any)
- Skipped: X (if any)
  </done>
</task>

</tasks>

<verification>
- Test command executed without infrastructure errors (server started, auth setup ran)
- Results clearly show pass/fail counts
- Any failures are documented for potential follow-up
</verification>

<success_criteria>
- E2E test suite runs to completion
- Results are captured and summarized
- Any failures are identified with their error type (not necessarily fixed - this is a status check)
</success_criteria>

<output>
After completion, create `.planning/quick/029-run-e2e-tests/029-SUMMARY.md` with:
- Test execution results (pass/fail/skip counts)
- List of any failing tests with brief error descriptions
- Recommendation for next steps if issues found
</output>
