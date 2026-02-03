---
task: 034
type: quick
title: Fix E2E 406 errors
status: complete
completed: 2026-02-03
duration: ~15 minutes
commits:
  - ec38d0f: Add subscription records for superadmin/admin test users
  - 2541165: Fix clientService.js PostgREST embedded resource pattern
files_modified:
  - supabase/migrations/060_seed_test_data.sql
  - src/services/clientService.js
---

# Quick Task 034: Fix E2E 406 Errors

**One-liner:** Fixed 406 errors by seeding subscription records for all test users and correcting PostgREST query pattern in clientService.js

## Problem

E2E tests were failing with 406 (Not Acceptable) errors when querying subscription data for superadmin and admin test users. Root cause investigation in quick-033 identified two issues:

1. **Missing subscription records:** Migration 060 only seeded subscriptions for client/client2, leaving superadmin/admin without any subscription data
2. **Schema mismatch:** clientService.js queried non-existent `plan_slug` column instead of using PostgREST embedded resource pattern `plans(slug)`

## Solution

### Task 1: Add subscription records for superadmin and admin

Added two new INSERT statements to migration 060_seed_test_data.sql:

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

Migration 060 now seeds subscriptions for all 4 test users (superadmin, admin, client, client2).

### Task 2: Fix clientService.js schema mismatch

Changed the subscription query in `fetchClientsWithStats()`:

**Before (incorrect):**
```javascript
.select(`
  owner_id,
  plan_slug,   // BUG: Column does not exist!
  status,
  ...
`)
```

**After (correct):**
```javascript
.select(`
  owner_id,
  plan_id,
  plans(slug),   // Embedded resource join
  status,
  ...
`)
```

Updated subscription lookup to extract plan_slug from embedded resource:
```javascript
(subscriptions || []).forEach((sub) => {
  subLookup[sub.owner_id] = {
    ...sub,
    plan_slug: sub.plans?.slug || 'free'
  };
});
```

This matches the pattern used by feedbackService.js and featureFlagService.js.

### Task 3: Database reset and verification

- Ran `supabase db reset` - migrations 001-118 applied successfully
- Migration 119 failed due to pre-existing schema issue (td.name vs td.device_name) - unrelated to our changes
- E2E tests ran without 406 subscription errors in output
- Admin tests show many passing (authentication, tenant detail tabs, dashboard tools)

## Verification

1. Migration file contains 4 subscription INSERTs: verified
2. clientService.js uses `plans(slug)` not `plan_slug`: verified
3. Database reset applied migration 060: verified (up to migration 118)
4. No 406 errors in test output: verified

## Commits

| Commit | Description |
|--------|-------------|
| ec38d0f | fix(quick-034): add subscription records for superadmin and admin test users |
| 2541165 | fix(quick-034): use correct PostgREST embedded resource pattern in clientService |

## Notes

- Migration 119 (GDPR export) has a pre-existing bug: references `td.name` which should be `td.device_name` - separate fix needed
- Full E2E test run was limited by disk space constraints during verification
- The core 406 subscription error fix is complete and verified

## Next Steps

- Run full E2E test suite (quick-035) once disk space is available
- Fix migration 119 schema issue in separate task
