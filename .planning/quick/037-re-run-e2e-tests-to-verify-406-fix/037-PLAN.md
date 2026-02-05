---
task: 037
type: quick
title: Re-run E2E tests to verify 406 fix
status: planned
autonomous: true
files_modified:
  - .planning/STATE.md
---

<objective>
Re-run E2E tests to verify the 406 error fix from quick-034 after Docker Desktop restart.

Purpose: Tasks 035 and 036 were BLOCKED due to Docker Desktop being unresponsive. This task verifies infrastructure is healthy and measures 406 fix impact.
Output: E2E test results compared against baseline (385 passed, ~454 failed, ~324 skipped)
</objective>

<context>
@.planning/STATE.md

**Background:**
- Quick-034 fixed 406 errors: seeded subscriptions for all 4 test users, corrected clientService.js schema
- Quick-035 and 036 were BLOCKED: Docker Desktop unresponsive (daemon not responding)
- User has presumably restarted Docker Desktop manually
- Baseline: 385 passed, ~454 failed, ~324 skipped
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify infrastructure health</name>
  <files>None (infrastructure verification only)</files>
  <action>
    Check Docker is responsive:
    ```bash
    docker ps --format "table {{.Names}}\t{{.Status}}" | head -10
    ```

    If Docker fails, STOP and report BLOCKED status - user must restart Docker Desktop manually.

    Check Supabase containers are running. If not, restart Supabase:
    ```bash
    npx supabase status || (npx supabase db reset && npx supabase start)
    ```

    Verify REST API responds:
    ```bash
    curl -s http://127.0.0.1:54321/rest/v1/plans?select=slug -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" | head -c 200
    ```

    Should return JSON array with plan slugs, not error.
  </action>
  <verify>
    - `docker ps` returns container list
    - Supabase status shows services running
    - REST API returns JSON (not "PGRST002" error)
  </verify>
  <done>Infrastructure verified healthy and ready for E2E tests</done>
</task>

<task type="auto">
  <name>Task 2: Run E2E tests and document results</name>
  <files>.planning/STATE.md, .planning/quick/037-re-run-e2e-tests-to-verify-406-fix/037-SUMMARY.md</files>
  <action>
    Ensure dev server is running:
    ```bash
    pgrep -f "vite" || npm run dev &
    sleep 5
    ```

    Run full E2E test suite:
    ```bash
    npx playwright test --reporter=list 2>&1 | tee /tmp/e2e-037-results.txt
    ```

    Extract summary (look for line with passed/failed/skipped totals).

    Compare against baseline (385 passed):
    | Metric | Baseline (032) | Current (037) | Delta |
    |--------|----------------|---------------|-------|
    | Passed | 385 | ? | ? |
    | Failed | ~454 | ? | ? |
    | Skipped | ~324 | ? | ? |

    Check for 406 errors in output:
    ```bash
    grep -c "406\|Not Acceptable" /tmp/e2e-037-results.txt || echo "No 406 errors found"
    ```

    Create 037-SUMMARY.md with:
    - Test results (passed/failed/skipped)
    - Delta from baseline
    - 406 error presence (yes/no)
    - Conclusion on fix effectiveness

    Update STATE.md:
    - Add quick task 037 to completed table
    - Update E2E baseline if changed
    - Update Session Continuity section
  </action>
  <verify>
    - E2E test suite runs to completion
    - Results captured and compared to baseline
    - 037-SUMMARY.md created
    - STATE.md updated
  </verify>
  <done>E2E tests completed, results documented, 406 fix verified or further issues identified</done>
</task>

</tasks>

<verification>
1. Docker and Supabase containers running
2. REST API responds without PGRST002 schema cache error
3. E2E test suite completes (no infrastructure timeout)
4. Results compared to baseline (385 passed)
5. STATE.md updated with current position
</verification>

<success_criteria>
- Infrastructure healthy (Docker + Supabase running)
- E2E test suite runs to completion
- Test results documented and compared to baseline
- 406 fix impact measured (improved pass rate = success, no change = investigate further)
- STATE.md reflects current status
</success_criteria>

<output>
After completion, create `.planning/quick/037-re-run-e2e-tests-to-verify-406-fix/037-SUMMARY.md`
</output>
