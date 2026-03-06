---
phase: quick-68
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/BUGS.md
autonomous: true
requirements: [QT-68]

must_haves:
  truths:
    - "Existing auth-full-flow.spec.js tests are re-run and all passing tests still pass"
    - "Console errors during auth flow are captured and any new errors reported"
    - "Findings from this run are appended to BUGS.md as QT-68 entry"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "QT-68 auth flow regression test findings"
      contains: "QT-68"
  key_links:
    - from: "tests/e2e/auth-full-flow.spec.js"
      to: "tests/e2e/helpers.js"
      via: "loginAndPrepare import"
      pattern: "import.*loginAndPrepare.*from.*helpers"
---

<objective>
Re-run the existing Playwright auth flow E2E tests (tests/e2e/auth-full-flow.spec.js) after the BUG-17/18/19 fixes from quick-67. Verify login, dashboard redirect, sign out button, and console error capture still work. Append regression test findings to BUGS.md.

Purpose: Confirm auth flow stability after recent fixes (quick-67: createScreen auth bypass, polling backoff, OTP label).
Output: BUGS.md updated with QT-68 regression test results.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@tests/e2e/auth-full-flow.spec.js (existing auth flow tests from QT-64 -- 5 tests covering login, sign out, console errors)
@tests/e2e/helpers.js (loginAndPrepare, waitForPageReady helpers)
@.planning/BUGS.md (existing bug tracker with QT-64 and QT-66 entries)

<interfaces>
From tests/e2e/auth-full-flow.spec.js (QT-64):
- Test 1: "login redirects to /app dashboard" -- loginAndPrepare, assert /app URL, sidebar visible
- Test 2: "sign out button is clickable" -- loginAndPrepare, click sign out, check redirect or dev bypass
- Test 3: "sign out redirects to login page (requires real auth)" -- skipped if DEV_AUTH_BYPASS
- Test 4: "full round-trip: login -> sign out -> verify cannot access /app (requires real auth)" -- skipped if DEV_AUTH_BYPASS
- Test 5: "no console errors during login flow" -- filters benign backend errors

From tests/e2e/helpers.js:
```javascript
export async function loginAndPrepare(page, options = {})
export async function waitForPageReady(page)
export async function dismissAnyModals(page)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run auth flow tests and append findings to BUGS.md</name>
  <files>.planning/BUGS.md</files>
  <action>
Run the existing auth flow E2E test suite and document results.

1. Ensure the dev server is running (check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` -- if not 200, start with `npx vite --host &` and wait for it).

2. Run the full auth flow test:
   ```
   npx playwright test tests/e2e/auth-full-flow.spec.js --project=chromium --reporter=list 2>&1
   ```
   Capture the full output including pass/fail/skip status for each test.

3. If any previously-passing test now fails, take a screenshot for diagnosis and note it as a regression.

4. Also run a quick smoke test of the login page to verify no visual regressions:
   ```
   npx playwright test tests/e2e/auth.spec.js --project=chromium --reporter=list 2>&1 | tail -30
   ```

5. Append a new section to `.planning/BUGS.md` with findings:

   If all tests pass (matching QT-64 results: 3 pass, 2 skip):
   ```markdown
   ## QT-68: Auth Flow Regression Test (2026-03-05)

   **Status:** PASS -- No regressions after quick-67 fixes

   **Context:** Re-run after BUG-17 (createScreen auth bypass), BUG-18 (polling backoff), BUG-19 (OTP label) fixes

   **Tests run (auth-full-flow.spec.js):**
   - Login redirects to /app dashboard: PASS
   - Sign out button is clickable: PASS
   - Sign out redirects to login page: SKIPPED (DEV_AUTH_BYPASS)
   - Full round-trip (login -> sign out -> cannot access /app): SKIPPED (DEV_AUTH_BYPASS)
   - No console errors during login flow: PASS

   **Tests run (auth.spec.js):**
   - [list results from auth.spec.js run]

   **Conclusion:** Auth flow remains stable after quick-67 fixes. No regressions detected.
   ```

   If any test fails, document as:
   ```markdown
   ## QT-68: Auth Flow Regression Test (2026-03-05)

   **Status:** REGRESSION FOUND

   ### BUG-Q68-XX: [Description of regression]
   - **Severity:** high
   - **Previously:** Passed in QT-64
   - **Now:** [failure description]
   - **Likely cause:** quick-67 changes
   - **Console errors:** [if any new ones]
   ```

Read `.planning/BUGS.md` first before appending. Preserve all existing content.
  </action>
  <verify>
    <automated>grep -q "QT-68" .planning/BUGS.md && echo "BUGS.md updated with QT-68 findings"</automated>
  </verify>
  <done>Auth flow tests re-run post-quick-67. BUGS.md contains QT-68 section documenting either clean regression pass or specific regressions found with details.</done>
</task>

</tasks>

<verification>
- `npx playwright test tests/e2e/auth-full-flow.spec.js --project=chromium` completes
- `.planning/BUGS.md` contains QT-68 section
- Test results match or improve on QT-64 baseline (3 pass, 2 skip)
</verification>

<success_criteria>
- All previously-passing auth tests still pass (no regressions from quick-67)
- Console error capture confirms no new errors introduced
- BUGS.md documents the regression test results
</success_criteria>

<output>
After completion, create `.planning/quick/68-test-auth-flow-via-playwright-login-veri/68-SUMMARY.md`
</output>
