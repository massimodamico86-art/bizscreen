---
phase: quick
plan: 011
type: execute
wave: 1
depends_on: []
files_modified:
  - .env.local
autonomous: true

must_haves:
  truths:
    - "Playwright tests authenticate successfully with saved session"
    - "npx playwright test runs tests instead of skipping all 275+"
  artifacts:
    - path: ".env.local"
      provides: "Test credentials for E2E auth"
      contains: "TEST_USER_EMAIL"
    - path: "playwright/.auth/user.json"
      provides: "Saved auth session state"
  key_links:
    - from: ".env.local"
      to: "tests/e2e/auth.setup.js"
      via: "process.env.TEST_USER_EMAIL"
      pattern: "TEST_USER_EMAIL"
---

<objective>
Configure Playwright test credentials so E2E tests can run with authentication.

Purpose: Currently all 275+ Playwright tests are skipped because no test credentials are configured. The auth.setup.js file checks for TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.

Output: Working E2E test authentication with saved session state.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.env.example (lines 186-216 document the test credentials)
@.env.local (current config without test credentials)
@tests/e2e/auth.setup.js (auth setup that checks for credentials)
@playwright.config.js (references auth setup project)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add test credentials to .env.local</name>
  <files>.env.local</files>
  <action>
Append the test credentials to .env.local:

```
# E2E Test Credentials (from .env.example)
TEST_USER_EMAIL=client@bizscreen.test
TEST_USER_PASSWORD=TestClient123!
```

These credentials are documented in .env.example (lines 205-207) and are used by the seeded test data from migration 060_seed_test_data.sql.

Note: Do NOT add the superadmin or admin credentials - only the client user is needed for standard E2E tests.
  </action>
  <verify>
Run: `grep TEST_USER_EMAIL .env.local`
Expected: `TEST_USER_EMAIL=client@bizscreen.test`
  </verify>
  <done>TEST_USER_EMAIL and TEST_USER_PASSWORD are set in .env.local</done>
</task>

<task type="auto">
  <name>Task 2: Run auth setup to verify credentials work</name>
  <files>playwright/.auth/user.json</files>
  <action>
Run only the auth setup project to verify credentials are working:

```bash
npx playwright test --project=setup
```

This will:
1. Start the dev server (or reuse existing)
2. Navigate to /auth/login
3. Fill in TEST_USER_EMAIL and TEST_USER_PASSWORD
4. Submit the form and wait for redirect to /app
5. Save session state to playwright/.auth/user.json

If the setup passes, the credentials are working and subsequent tests will use the saved session.
  </action>
  <verify>
Run: `npx playwright test --project=setup`
Expected output contains: "Auth setup complete - saving session to playwright/.auth/user.json"
Verify file exists: `ls -la playwright/.auth/user.json`
  </verify>
  <done>Auth setup runs successfully and saves session state</done>
</task>

<task type="auto">
  <name>Task 3: Verify tests no longer skip due to missing credentials</name>
  <files>None (verification only)</files>
  <action>
Run a small subset of tests to confirm they are no longer skipping:

```bash
npx playwright test auth.spec.js --reporter=list
```

The tests should now execute (pass or fail) rather than all being skipped.

Note: Some tests may fail for reasons unrelated to credentials (e.g., application bugs, missing data). The goal is to verify the credential issue is resolved.
  </action>
  <verify>
Run: `npx playwright test auth.spec.js --reporter=list 2>&1 | head -50`
Expected: Tests run and show pass/fail status (not "skipped")
  </verify>
  <done>E2E tests execute with authentication instead of skipping</done>
</task>

</tasks>

<verification>
- [ ] .env.local contains TEST_USER_EMAIL and TEST_USER_PASSWORD
- [ ] Auth setup project runs without "Skipping auth setup" message
- [ ] playwright/.auth/user.json file is created with session state
- [ ] At least one E2E test executes (not skipped)
</verification>

<success_criteria>
Running `npx playwright test` no longer skips all tests with "Skipping auth setup - no test credentials" message. Tests execute with authentication.
</success_criteria>

<output>
After completion, create `.planning/quick/011-configure-playwright-test-credentials/011-SUMMARY.md`
</output>
