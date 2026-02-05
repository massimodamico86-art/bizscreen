---
task: 035
type: quick
title: Run E2E tests to verify 406 fix
status: planned
autonomous: true
files_modified: []
---

<objective>
Run full E2E test suite to measure the impact of the 406 error fixes from quick-034.

Purpose: Verify that fixing subscription seed data and clientService.js schema mismatch improves E2E test pass rate
Output: Test results compared against baseline (385 passed, ~454 failed, ~324 skipped)
</objective>

<context>
Baseline (quick-032): 385 passed, ~454 failed, ~324 skipped
- Scene tests (81) moved from failed to skipped (feature not in navigation)

Fixes applied (quick-034):
1. Migration 060: Added subscriptions for superadmin and admin test users
2. clientService.js: Changed `plan_slug` to `plans(slug)` embedded resource pattern

Expected improvement: Tests that were failing with 406 errors on subscription queries should now pass.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run full E2E test suite</name>
  <files>none (read-only verification)</files>
  <action>
Run the complete E2E test suite to get current pass/fail/skip counts:

```bash
npx playwright test --reporter=list 2>&1 | tee /tmp/e2e-035-results.txt
```

After completion, extract summary line showing passed/failed/skipped counts.
  </action>
  <verify>Test run completes and summary shows passed/failed/skipped counts</verify>
  <done>Full E2E test run completed with results captured</done>
</task>

<task type="auto">
  <name>Task 2: Compare results against baseline and report</name>
  <files>.planning/STATE.md</files>
  <action>
Compare test results to baseline and document findings:

| Metric | Baseline (032) | Current (035) | Delta |
|--------|----------------|---------------|-------|
| Passed | 385 | ? | ? |
| Failed | ~454 | ? | ? |
| Skipped | ~324 | ? | ? |

Update STATE.md with:
1. Quick task 035 completion entry
2. New E2E baseline numbers
3. Note whether 406 fix improved pass rate

If pass rate improved significantly, the 406 fix was successful.
If no improvement, investigate whether db reset was applied or if other errors mask 406 fixes.
  </action>
  <verify>STATE.md updated with task 035 and new baseline</verify>
  <done>Results documented, baseline updated, 406 fix impact measured</done>
</task>

</tasks>

<verification>
1. E2E test suite ran to completion
2. Results compared against baseline (385 passed)
3. STATE.md updated with findings
</verification>

<success_criteria>
- Full E2E test run completed
- Pass/fail/skip counts documented
- Improvement (or lack thereof) from 406 fix quantified
- STATE.md updated with new baseline
</success_criteria>

<output>
After completion, update `.planning/STATE.md` with quick task 035 completion and new E2E baseline.
</output>
