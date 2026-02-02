---
task: 014
type: quick
files_modified:
  - tests/e2e/admin.spec.js
autonomous: true
---

<objective>
Fix admin E2E tests to use storage state authentication instead of manual login.

Problem: Admin tests (admin.spec.js) have two issues:
1. Tests do manual login in `beforeEach` which conflicts with Playwright's storage state auth
2. Tests expect super_admin features but `chromium-admin` uses admin@bizscreen.test (role='admin', not 'super_admin')
3. The "Something Went Wrong" error occurs because admin user lacks super_admin permissions

Root cause: admin.spec.js was written before storage state auth (task 010-012). It has its own manual login logic that:
- Conflicts with the storage state (tries to log in when already logged in)
- Goes to `/` instead of `/app` (hits login page again)
- Expects super_admin features regardless of which project runs the tests

Solution: Update admin.spec.js to leverage storage state auth by removing manual login and adding test.use() annotations to specify the correct project.

Output: Admin tests work correctly when run with `--project=chromium-superadmin`
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@tests/e2e/admin.spec.js
@playwright.config.js (projects: chromium, chromium-admin, chromium-superadmin)
@supabase/migrations/060_seed_test_data.sql (line 157-166: super_admin role)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update admin.spec.js to use storage state authentication</name>
  <files>tests/e2e/admin.spec.js</files>
  <action>
Refactor admin.spec.js to work with Playwright's storage state auth:

1. Remove manual login from ALL beforeEach hooks:
   - Delete the credential checking (`if (process.env.TEST_SUPERADMIN_EMAIL...`)
   - Delete the page.goto('/') and login form interactions
   - Keep only navigation to the appropriate app page

2. Add test.use() at the start of each describe block to specify the correct project storage:
   ```javascript
   test.describe('Admin Panel', () => {
     // Use superadmin auth - this describe block requires super_admin role
     test.use({ storageState: 'playwright/.auth/superadmin.json' });

     // Skip if running without superadmin project
     test.skip(
       () => !process.env.TEST_SUPERADMIN_EMAIL,
       'Super admin credentials not configured'
     );

     test.beforeEach(async ({ page }) => {
       // Storage state already has auth - just navigate to the app
       await page.goto('/app');
       await page.waitForLoadState('networkidle');
     });
   ```

3. Update "Admin Panel - Tenant Detail" describe block similarly

4. Update "Super Admin Dashboard - Admin Tools" describe block similarly

5. For "Admin Panel - Access Control" describe block that tests non-admin users:
   - Use the default chromium (client) storage state
   - Remove manual login code
   ```javascript
   test.describe('Admin Panel - Access Control', () => {
     // Uses default client auth (chromium project)
     test.use({ storageState: 'playwright/.auth/client.json' });

     test.beforeEach(async ({ page }) => {
       await page.goto('/app');
       await page.waitForLoadState('networkidle');
     });
   ```

6. Keep the test.skip() conditions for credential checking as a safety net

7. DO NOT change test assertions or selectors - only the auth setup
  </action>
  <verify>
```bash
# Syntax check
node -c tests/e2e/admin.spec.js

# Run one test with superadmin project to verify it works
npx playwright test "shows Admin Panel navigation" --project=chromium-superadmin --reporter=list 2>&1 | tail -20
```
  </verify>
  <done>
- admin.spec.js uses test.use({ storageState: ... }) for role-based auth
- No manual login in beforeEach hooks
- Tests navigate directly to /app assuming storage state handles auth
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify admin tests pass with correct project</name>
  <files>tests/e2e/admin.spec.js</files>
  <action>
Run the admin tests with the superadmin project and verify they work:

1. Run a subset of admin tests:
   ```bash
   npx playwright test admin.spec.js --project=chromium-superadmin --reporter=list
   ```

2. If tests still fail, check:
   - Storage state has valid tokens (may need to regenerate)
   - Super admin user exists in database with role='super_admin'
   - Navigation goes to correct URL (/app not /)

3. If storage state is expired, regenerate by running:
   ```bash
   npx playwright test --project=setup
   ```

4. Document findings - if tests pass, task is complete. If not, identify remaining issues for follow-up.
  </action>
  <verify>
```bash
# Run admin tests with superadmin project
npx playwright test admin.spec.js --project=chromium-superadmin --reporter=list 2>&1 | tail -30
```
  </verify>
  <done>
- Admin tests pass when run with --project=chromium-superadmin
- OR clear documentation of remaining issues if tests still fail
  </done>
</task>

</tasks>

<verification>
```bash
# Check no manual login in admin.spec.js beforeEach
grep -n "getByPlaceholder.*email" tests/e2e/admin.spec.js || echo "No manual email login found (good)"

# Check test.use is present
grep -n "test.use.*storageState" tests/e2e/admin.spec.js

# Run quick test
npx playwright test "shows Admin Panel" --project=chromium-superadmin --reporter=list 2>&1 | tail -10
```
</verification>

<success_criteria>
- admin.spec.js uses test.use({ storageState: ... }) for role-based auth
- No manual login form interactions in beforeEach hooks
- Tests run successfully with `--project=chromium-superadmin`
- Access control tests use client storage state appropriately
</success_criteria>

<output>
After completion, update .planning/STATE.md quick tasks table with entry for 014.
</output>
