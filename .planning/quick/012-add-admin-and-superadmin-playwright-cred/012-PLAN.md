---
task: 012
type: quick
files_modified:
  - .env.local
  - tests/e2e/auth.setup.js
  - playwright.config.js
autonomous: true
---

<objective>
Add admin and superadmin Playwright credentials to enable role-based E2E testing.

Purpose: Currently only client credentials exist. Tests requiring admin or superadmin roles cannot run.
Output: Three separate auth states (client, admin, superadmin) that tests can use via project dependencies.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.env.example (lines 186-216 for credential format)
@tests/e2e/auth.setup.js
@playwright.config.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add admin and superadmin credentials to .env.local</name>
  <files>.env.local</files>
  <action>
Add these environment variables to .env.local (matching .env.example format):

```
# Admin Test Credentials
TEST_ADMIN_EMAIL=admin@bizscreen.test
TEST_ADMIN_PASSWORD=TestAdmin123!

# Superadmin Test Credentials
TEST_SUPERADMIN_EMAIL=superadmin@bizscreen.test
TEST_SUPERADMIN_PASSWORD=TestSuperAdmin123!
```

Note: These users are seeded by migration 060_seed_test_data.sql.
  </action>
  <verify>grep TEST_ADMIN_EMAIL .env.local && grep TEST_SUPERADMIN_EMAIL .env.local</verify>
  <done>All three role credentials exist in .env.local</done>
</task>

<task type="auto">
  <name>Task 2: Create role-specific auth setup functions</name>
  <files>tests/e2e/auth.setup.js</files>
  <action>
Refactor auth.setup.js to create three separate auth states:

1. Extract the login logic into a reusable function:
```javascript
async function authenticateRole(page, email, password, authFile, roleName) {
  if (!email || !password) {
    console.log(`Skipping ${roleName} auth setup - no credentials configured`);
    return;
  }
  // ... existing login logic ...
}
```

2. Create three setup tests:
```javascript
const authFiles = {
  client: 'playwright/.auth/client.json',
  admin: 'playwright/.auth/admin.json',
  superadmin: 'playwright/.auth/superadmin.json',
};

setup('authenticate-client', async ({ page }) => {
  await authenticateRole(
    page,
    process.env.TEST_USER_EMAIL || process.env.TEST_CLIENT_EMAIL,
    process.env.TEST_USER_PASSWORD || process.env.TEST_CLIENT_PASSWORD,
    authFiles.client,
    'client'
  );
});

setup('authenticate-admin', async ({ page }) => {
  await authenticateRole(
    page,
    process.env.TEST_ADMIN_EMAIL,
    process.env.TEST_ADMIN_PASSWORD,
    authFiles.admin,
    'admin'
  );
});

setup('authenticate-superadmin', async ({ page }) => {
  await authenticateRole(
    page,
    process.env.TEST_SUPERADMIN_EMAIL,
    process.env.TEST_SUPERADMIN_PASSWORD,
    authFiles.superadmin,
    'superadmin'
  );
});
```

Keep backward compatibility: TEST_USER_EMAIL still works (maps to client role).
  </action>
  <verify>node -c tests/e2e/auth.setup.js (syntax check)</verify>
  <done>auth.setup.js creates three auth files: client.json, admin.json, superadmin.json</done>
</task>

<task type="auto">
  <name>Task 3: Update playwright.config.js with role-specific projects</name>
  <files>playwright.config.js</files>
  <action>
Update playwright.config.js to support role-based testing:

1. Update the setup project to run all three auth setups:
```javascript
{
  name: 'setup',
  testMatch: /auth\.setup\.js/,
},
```
(No change needed - setup project already matches the file)

2. Update the chromium project to use client auth by default (backward compatible):
```javascript
{
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/client.json',  // Changed from user.json
  },
  dependencies: ['setup'],
},
```

3. Add new projects for admin and superadmin roles:
```javascript
{
  name: 'chromium-admin',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/admin.json',
  },
  dependencies: ['setup'],
},
{
  name: 'chromium-superadmin',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/superadmin.json',
  },
  dependencies: ['setup'],
},
```

Tests can now specify which role to use:
- `npx playwright test` - runs with client auth (default)
- `npx playwright test --project=chromium-admin` - runs with admin auth
- `npx playwright test --project=chromium-superadmin` - runs with superadmin auth
  </action>
  <verify>npx playwright test --list 2>&1 | head -20 (shows projects listed)</verify>
  <done>playwright.config.js has chromium, chromium-admin, and chromium-superadmin projects</done>
</task>

</tasks>

<verification>
```bash
# Check credentials exist
grep -E "TEST_(ADMIN|SUPERADMIN)_(EMAIL|PASSWORD)" .env.local

# Check auth setup syntax
node -c tests/e2e/auth.setup.js

# List available projects
npx playwright test --list 2>&1 | grep -E "(chromium|setup)"
```
</verification>

<success_criteria>
- .env.local contains admin and superadmin credentials
- auth.setup.js creates three separate auth files (client.json, admin.json, superadmin.json)
- playwright.config.js has projects for each role
- Existing tests continue to work (backward compatible with client/user auth)
</success_criteria>

<output>
After completion, update .planning/STATE.md quick tasks table with entry for 012.
</output>
