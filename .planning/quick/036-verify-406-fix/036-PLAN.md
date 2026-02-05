---
task: 036
type: quick
title: Verify 406 fix
status: planned
directory: .planning/quick/036-verify-406-fix
---

<objective>
Verify that the 406 error fix from quick-034 resolved the subscription query failures in E2E tests.

Purpose: Confirm the fix (migration 060 seeding all test users + clientService.js plans(slug) pattern) works, and establish new E2E baseline.
Output: E2E test results showing improvement from baseline (385 passed).
</objective>

<context>
@.planning/STATE.md
@.planning/quick/034-fix-e2e-406-errors/034-SUMMARY.md
@.planning/quick/035-run-e2e-tests-to-verify-406-fix/035-SUMMARY.md

**Background:**
- Quick-034 fixed 406 errors: seeded subscriptions for all 4 test users, corrected clientService.js schema
- Quick-035 was BLOCKED: Supabase/Docker infrastructure unresponsive
- Infrastructure needs restart before tests can run
- Baseline: 385 passed, ~454 failed, ~324 skipped
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restart Docker and Supabase infrastructure</name>
  <files>None (infrastructure commands only)</files>
  <action>
    Check if Docker is responsive:
    ```bash
    timeout 5 docker ps
    ```

    If Docker hangs or times out:
    - Restart Docker Desktop via CLI: `killall Docker && open -a Docker`
    - Wait for Docker to become responsive (up to 60 seconds)

    Once Docker is responsive, restart Supabase:
    ```bash
    npx supabase stop --no-backup
    npx supabase db reset
    npx supabase start
    ```

    Verify Supabase is healthy:
    ```bash
    curl -s http://127.0.0.1:54321/auth/v1/health | head -c 100
    ```

    Should return JSON health response, not timeout.
  </action>
  <verify>
    - `docker ps` returns container list within 5 seconds
    - Supabase health endpoint responds with JSON
    - Migrations applied (output shows 001-118 applied, 119 may fail - known issue)
  </verify>
  <done>Supabase infrastructure running and healthy</done>
</task>

<task type="auto">
  <name>Task 2: Run E2E tests and compare results</name>
  <files>None (test execution only)</files>
  <action>
    Start dev server if not running:
    ```bash
    pgrep -f "vite" || (npm run dev &)
    ```

    Wait for server to be ready, then run full E2E test suite:
    ```bash
    npx playwright test --reporter=list 2>&1 | tee /tmp/e2e-results.txt
    ```

    Extract summary from output:
    ```bash
    grep -E "(passed|failed|skipped)" /tmp/e2e-results.txt | tail -5
    ```

    Compare against baseline (385 passed):
    - If passed count increased: 406 fix improved test pass rate
    - If passed count unchanged: 406 errors were not primary failure cause
    - If passed count decreased: regression introduced (unlikely)
  </action>
  <verify>
    - E2E test suite completes without auth setup timeout
    - No 406 subscription errors visible in output
    - Results captured in /tmp/e2e-results.txt
  </verify>
  <done>E2E test results collected and compared against baseline (385 passed)</done>
</task>

<task type="auto">
  <name>Task 3: Document results and update STATE.md</name>
  <files>.planning/quick/036-verify-406-fix/036-SUMMARY.md, .planning/STATE.md</files>
  <action>
    Create 036-SUMMARY.md with:
    - Test results (passed/failed/skipped counts)
    - Delta from baseline (385 passed)
    - Whether 406 errors still appear in output
    - Any new issues discovered

    Update STATE.md:
    - Update "Last activity" to reflect completion
    - Update E2E baseline numbers if significantly changed
    - Update Session Continuity section
    - Add quick task 036 to completed table
  </action>
  <verify>
    - 036-SUMMARY.md exists with test results
    - STATE.md updated with current position
  </verify>
  <done>Results documented, STATE.md reflects current status</done>
</task>

</tasks>

<verification>
1. Infrastructure: Supabase running and healthy
2. E2E tests: Suite completed without infrastructure timeout
3. 406 fix: No subscription 406 errors in test output
4. Documentation: SUMMARY.md and STATE.md updated
</verification>

<success_criteria>
- E2E test suite runs to completion
- Results compared against baseline (385 passed)
- 406 error fix impact documented
- STATE.md updated with accurate current position
</success_criteria>

<output>
After completion, create `.planning/quick/036-verify-406-fix/036-SUMMARY.md`
</output>
