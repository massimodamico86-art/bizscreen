---
type: quick
id: "010"
title: Make Playwright login easier with storage state
wave: 1
depends_on: []
files_modified:
  - playwright.config.js
  - tests/e2e/auth.setup.js
  - tests/e2e/helpers.js
autonomous: true

must_haves:
  truths:
    - "Authenticated tests skip login form entirely"
    - "Auth setup runs once, not per-test"
    - "Storage state persists auth session across tests"
  artifacts:
    - path: "tests/e2e/auth.setup.js"
      provides: "Global setup that logs in and saves session"
    - path: "playwright.config.js"
      provides: "Project configuration with setup dependency"
  key_links:
    - from: "playwright.config.js"
      to: "tests/e2e/auth.setup.js"
      via: "setup project dependency"
---

<objective>
Implement Playwright's storage state pattern to authenticate once and reuse session across all tests.

Purpose: Tests currently call `loginAndPrepare()` for every test, which:
1. Hits the login page repeatedly
2. Depends on Supabase responding quickly
3. Can timeout or fail at authentication barrier

Storage state pattern: Login ONCE in setup, save cookies/localStorage to file, inject into all subsequent tests.

Output: Tests run faster and don't get stuck at login.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@playwright.config.js
@tests/e2e/helpers.js
@tests/e2e/auth.spec.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create auth.setup.js for global authentication</name>
  <files>tests/e2e/auth.setup.js</files>
  <action>
Create a Playwright setup file that:

1. Imports test from @playwright/test
2. Creates a setup test called 'authenticate' that:
   - Goes to /auth/login
   - Fills email from process.env.TEST_USER_EMAIL
   - Fills password from process.env.TEST_USER_PASSWORD
   - Clicks sign in button
   - Waits for /app redirect (15s timeout)
   - Dismisses any modals (copy logic from helpers.js dismissAnyModals)
   - Saves storage state to 'playwright/.auth/user.json'

Example structure:
```javascript
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Skip if no credentials
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.log('Skipping auth setup - no test credentials');
    return;
  }

  await page.goto('/auth/login');
  await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL);
  await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });

  // Dismiss modals
  await page.waitForTimeout(500);
  // ... modal dismissal logic

  await page.context().storageState({ path: authFile });
});
```

Add playwright/.auth/ to .gitignore if not already there.
  </action>
  <verify>File exists at tests/e2e/auth.setup.js with proper structure</verify>
  <done>Setup file exports authentication test that saves session to playwright/.auth/user.json</done>
</task>

<task type="auto">
  <name>Task 2: Update playwright.config.js with setup project</name>
  <files>playwright.config.js</files>
  <action>
Modify playwright.config.js to:

1. Add a 'setup' project that runs auth.setup.js:
```javascript
{
  name: 'setup',
  testMatch: /auth\.setup\.js/,
}
```

2. Update the 'chromium' project to:
   - Depend on 'setup'
   - Use storage state from 'playwright/.auth/user.json'
```javascript
{
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/user.json',
  },
  dependencies: ['setup'],
}
```

3. Keep testDir as ./tests/e2e

This means:
- 'setup' runs first, logs in, saves cookies
- 'chromium' waits for setup, then runs all tests with pre-authenticated session
  </action>
  <verify>`grep -q "storageState" playwright.config.js` returns 0</verify>
  <done>Config has setup project and chromium depends on it with storageState</done>
</task>

<task type="auto">
  <name>Task 3: Update helpers.js to handle pre-authenticated state</name>
  <files>tests/e2e/helpers.js</files>
  <action>
Update loginAndPrepare() to:

1. Check if already authenticated (on /app route)
2. If already authenticated, just dismiss modals and return
3. If not authenticated, perform full login

Updated logic:
```javascript
export async function loginAndPrepare(page, options = {}) {
  // Check if already authenticated (storage state injected)
  const currentUrl = page.url();
  if (currentUrl.includes('/app')) {
    // Already authenticated, just dismiss modals
    await dismissAnyModals(page);
    return;
  }

  // Not authenticated or fresh page, navigate and check
  await page.goto('/app');
  await page.waitForTimeout(1000);

  // If redirected to login, we need to authenticate
  if (page.url().includes('/auth/login')) {
    const email = options.email || process.env.TEST_USER_EMAIL;
    const password = options.password || process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      throw new Error('Test credentials not configured');
    }

    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });
  }

  await page.waitForTimeout(500);
  await dismissAnyModals(page);
}
```

This makes loginAndPrepare() work with OR without storage state:
- With storage state: Tests start authenticated, loginAndPrepare just dismisses modals
- Without storage state: Falls back to full login flow
  </action>
  <verify>`npm run test:e2e -- --grep "loads screens page" --headed` shows no login form</verify>
  <done>loginAndPrepare detects pre-auth state and skips login when storage state is active</done>
</task>

</tasks>

<verification>
1. Run `npx playwright test --project=setup` - should complete login
2. Run `npx playwright test tests/e2e/screens.spec.js --headed` - should skip login form
3. Check playwright/.auth/user.json exists after setup
4. Verify .gitignore has playwright/.auth/
</verification>

<success_criteria>
- Auth setup runs once before test suite
- Individual tests don't hit login page
- Tests that require login work without modification
- Tests run faster overall
</success_criteria>

<output>
After completion, create `.planning/quick/010-make-playwright-login-easier/010-SUMMARY.md`
</output>
