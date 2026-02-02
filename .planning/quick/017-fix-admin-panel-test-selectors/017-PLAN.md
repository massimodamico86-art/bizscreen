---
task: 017
type: quick
wave: 1
autonomous: true
files_modified:
  - tests/e2e/admin.spec.js
---

<objective>
Fix admin panel E2E test selectors to match actual UI text.

Purpose: Tests currently look for "Admin Panel" but the UI shows "Tenant Management"
Output: All 14 failing admin.spec.js tests pass
</objective>

<context>
@.planning/quick/016-run-admin-tests-to-verify-fixes/016-SUMMARY.md

Key findings from task 016:
- 14 tests failing due to selector mismatch
- Current selector: `/admin.*panel|admin.*tenants/i`
- Actual UI button text: "Tenant Management" (visible in page snapshot)
- SuperAdminDashboardPage.jsx line 244 confirms: `{ id: 'admin-tenants', label: 'Tenant Management', ... }`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update admin.spec.js selectors</name>
  <files>tests/e2e/admin.spec.js</files>
  <action>
Replace all occurrences of the failing selector pattern with the correct one:

1. Find all instances of:
   `page.getByRole('button', { name: /admin.*panel|admin.*tenants/i })`

2. Replace with:
   `page.getByRole('button', { name: /tenant management/i })`

This selector will match the actual button text "Tenant Management" shown in the Super Admin Dashboard's Admin Tools section.

Files to update (lines from admin.spec.js):
- Line 32: Navigation item visibility test
- Line 36: Navigation click test
- Line 43: Tenant list test
- Line 50: Search functionality test
- Line 57: Plan filter test
- Line 64: Status filter test
- Line 71: Refresh button test
- Line 93: Tenant Detail beforeEach

Also update line 188 (Access Control test) which uses `/admin.*panel/i`.
  </action>
  <verify>
Run: `npx playwright test admin.spec.js --project=chromium-superadmin 2>&1 | grep -E "(passed|failed|Test Results)"`

Expected: 23+ tests pass (previously 9 passed, 14 failed due to selector)
  </verify>
  <done>
All "Admin Panel" and "Admin Panel - Tenant Detail" tests that were failing due to selector mismatch now pass.
  </done>
</task>

</tasks>

<verification>
```bash
# Run full admin test suite
npx playwright test admin.spec.js --project=chromium-superadmin

# Verify no "Admin Panel" selector failures remain
npx playwright test admin.spec.js --project=chromium-superadmin 2>&1 | grep -c "locator.*admin.*panel" || echo "No selector failures"
```
</verification>

<success_criteria>
- All admin.spec.js tests that were failing due to selector mismatch now pass
- No regressions in previously passing tests (Super Admin Dashboard tests)
- Test selectors use exact UI text match (/tenant management/i)
</success_criteria>

<output>
Create: `.planning/quick/017-fix-admin-panel-test-selectors/017-SUMMARY.md`
</output>
