---
id: quick-039
type: quick
description: Run E2E tests
status: planned
---

<objective>
Run E2E tests to get current baseline status.

Purpose: Track E2E test health after recent infrastructure stabilization
Output: Test results summary with pass/fail/skip counts
</objective>

<context>
@.planning/STATE.md

**Last E2E Run (quick-037):**
- 380 passed, 462 failed, 321 skipped
- Duration: 36.7 minutes
- 406 fix verified - no HTTP 406 errors
- Scene tests skipped (81 tests - feature not in navigation)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run E2E tests</name>
  <action>
Run the Playwright E2E test suite:

```bash
cd /Users/massimodamico/bizscreen
npx playwright test --reporter=list 2>&1 | tee e2e-output.txt
```

Capture results for summary.
  </action>
  <verify>Test run completes (pass or fail) without infrastructure errors</verify>
  <done>E2E test results captured with pass/fail/skip counts</done>
</task>

<task type="auto">
  <name>Task 2: Document results</name>
  <action>
Create summary with:
- Pass/fail/skip counts
- Duration
- Any notable errors (infrastructure, timeouts, etc.)
- Comparison to previous run (quick-037: 380/462/321)
  </action>
  <verify>Summary captures key metrics</verify>
  <done>Results documented for tracking</done>
</task>

</tasks>

<success_criteria>
- E2E tests run to completion
- Results documented with counts
- No infrastructure failures blocking tests
</success_criteria>
