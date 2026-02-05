---
task: 034
type: quick
title: Fix E2E 406 errors
status: planned
autonomous: true
files_modified:
  - supabase/migrations/060_seed_test_data.sql
  - src/services/clientService.js
---

<objective>
Fix the root causes of E2E test 406 errors identified in quick-033 investigation.

Purpose: Enable ~450 currently failing E2E tests to pass by fixing missing subscription data and schema mismatch
Output: Updated migration and service file, verified via `supabase db reset` and E2E test run
</objective>

<context>
Investigation findings (quick-033):

1. **Primary Issue (406 Errors):** superadmin/admin test users missing subscription records
   - Migration 060 only seeds subscriptions for client/client2
   - Any subscription query for superadmin/admin returns 406 (PostgREST cannot resolve embedded resource on empty result)

2. **Secondary Issue (Schema Mismatch):** clientService.js queries non-existent `plan_slug` column
   - Line 128: `plan_slug` does not exist on subscriptions table
   - Correct pattern: `plan_id, plans(slug)` as used by feedbackService.js and featureFlagService.js

@.planning/quick/033-investigate-root-cause-of-e2e-test-failu/033-DIAGNOSTIC-REPORT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add subscriptions for superadmin and admin test users</name>
  <files>supabase/migrations/060_seed_test_data.sql</files>
  <action>
Add subscription records for superadmin and admin users in section D. SUBSCRIPTIONS.

After the existing client2 subscription INSERT (around line 335), add:

```sql
-- Superadmin subscription (Pro plan - full platform access for testing)
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  id,
  'active',
  NOW(),
  NOW() + INTERVAL '365 days'
FROM public.plans WHERE slug = 'pro'
ON CONFLICT (owner_id) DO UPDATE SET
  status = 'active';

-- Admin subscription (Starter plan)
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  id,
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM public.plans WHERE slug = 'starter'
ON CONFLICT (owner_id) DO UPDATE SET
  status = 'active';
```

This ensures ALL test users have subscription records, preventing 406 errors on subscription queries.
  </action>
  <verify>Review the migration file to confirm 4 subscription INSERTs exist (one per test user)</verify>
  <done>All 4 test users (superadmin, admin, client, client2) have subscription seed data</done>
</task>

<task type="auto">
  <name>Task 2: Fix clientService.js schema mismatch</name>
  <files>src/services/clientService.js</files>
  <action>
In fetchClientsWithStats() function (around line 124-140):

1. Change the subscription query from:
```javascript
.select(`
  owner_id,
  plan_slug,   // BUG: This column does NOT exist!
  status,
  trial_ends_at,
  current_period_end,
  cancel_at_period_end
`)
```

To:
```javascript
.select(`
  owner_id,
  plan_id,
  plans(slug),
  status,
  trial_ends_at,
  current_period_end,
  cancel_at_period_end
`)
```

2. Update the subscription lookup (around line 138-140) to extract plan_slug from embedded resource:
```javascript
(subscriptions || []).forEach((sub) => {
  subLookup[sub.owner_id] = {
    ...sub,
    plan_slug: sub.plans?.slug || 'free'
  };
});
```

This matches the correct pattern used by feedbackService.js and featureFlagService.js.
  </action>
  <verify>grep -n "plan_slug\|plans(slug)" src/services/clientService.js should show plans(slug) in select, plan_slug extracted from sub.plans?.slug</verify>
  <done>clientService.js uses correct embedded resource query pattern</done>
</task>

<task type="auto">
  <name>Task 3: Reset database and verify fixes</name>
  <files>none</files>
  <action>
1. Reset the Supabase database to apply the updated migration:
```bash
supabase db reset
```

2. Run a quick E2E test to verify 406 errors are resolved:
```bash
npx playwright test tests/e2e/dashboard.spec.js --headed
```

If 406 errors persist, the PostgREST schema cache may need refreshing (handled by db reset).
  </action>
  <verify>E2E test runs without 406 subscription query errors</verify>
  <done>Database reset successful, E2E tests no longer show 406 errors for subscription queries</done>
</task>

</tasks>

<verification>
1. Migration file contains 4 subscription INSERTs (superadmin, admin, client, client2)
2. clientService.js uses `plans(slug)` not `plan_slug`
3. `supabase db reset` completes without errors
4. Sample E2E test completes without 406 errors
</verification>

<success_criteria>
- Migration 060 seeds subscriptions for ALL test users
- clientService.js uses correct PostgREST embedded resource syntax
- E2E tests no longer fail with 406 errors on subscription queries
- Ready for full E2E test suite run (quick-035)
</success_criteria>

<output>
After completion, update `.planning/STATE.md` with quick task 034 completion.
</output>
