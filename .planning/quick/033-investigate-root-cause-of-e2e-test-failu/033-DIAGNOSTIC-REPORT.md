# Diagnostic Report: E2E Test Failures - Supabase 406 Errors

**Date:** 2026-02-03
**Investigator:** Claude (quick-033)
**Related Tasks:** quick-031, quick-032

## Root Cause Summary

The E2E test failures are caused by **two distinct issues**:

1. **Primary Issue (406 Errors):** PostgREST cannot resolve the embedded resource `plans(slug)` when querying the `subscriptions` table. This occurs because the test user (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` / superadmin) does **not have a subscription record** in the database. When there's no row returned, the foreign key join has nothing to join on, and PostgREST returns 406.

2. **Secondary Issue (Schema Mismatch):** `clientService.js` queries a non-existent `plan_slug` column directly from the `subscriptions` table. This is a bug - the column doesn't exist. The correct pattern is `plan_id, plans(slug)` as used by `feedbackService.js` and `featureFlagService.js`.

---

## Technical Details

### HTTP 406 (Not Acceptable) in PostgREST Context

HTTP 406 in PostgREST means:
- **Embedded resource not found:** The foreign key join target cannot be resolved
- **Schema cache mismatch:** PostgREST's cached schema doesn't match the actual database
- **Invalid Accept header:** (Unlikely - Supabase client handles this correctly)

For queries like `.select('plan_id, plans(slug)')`:
- PostgREST expects a foreign key relationship: `subscriptions.plan_id -> plans.id`
- If no subscription row exists for the user, the join has nothing to resolve
- PostgREST returns 406 rather than an empty result because the embedded resource syntax implies a join expectation

### Failing Query Pattern

**Decoded failing URL:**
```
/rest/v1/subscriptions
  ?select=plan_id,plans(slug)
  &owner_id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
  &status=in.(active,trialing)
  &order=created_at.desc
  &limit=1
```

**User:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (superadmin@bizscreen.test)

**Problem:** This user has **no subscription record** in the database.

### Schema Analysis

**`subscriptions` table columns (from migration 017):**
```sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id),  -- FK to profiles
  plan_id UUID REFERENCES public.plans(id),       -- FK to plans
  status TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Note:** There is NO `plan_slug` column. The slug must be obtained via the `plans(slug)` embedded resource join.

### Test Seed Data Analysis (migration 060)

**Test users created:**
| UUID | Email | Role | Has Subscription? |
|------|-------|------|-------------------|
| `aaaa...aaaa` | superadmin@bizscreen.test | super_admin | **NO** |
| `bbbb...bbbb` | admin@bizscreen.test | admin | **NO** |
| `cccc...cccc` | client@bizscreen.test | client | YES (starter) |
| `dddd...dddd` | client2@bizscreen.test | client | YES (pro) |

**Problem:** superadmin and admin users do not have subscription records, but the application code attempts to query their subscriptions on every authenticated request.

---

## Evidence

### Service Code - Correct Pattern (feedbackService.js, line 65-74)
```javascript
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_id, plans(slug)')   // Correct: embedded resource join
  .eq('owner_id', tenantId)
  .in('status', ['active', 'trialing'])
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

return subscription?.plans?.slug || 'free';  // Graceful fallback
```

### Service Code - Correct Pattern (featureFlagService.js, line 100-107)
```javascript
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_id, plans(slug)')   // Correct: embedded resource join
  .eq('owner_id', tenantId)
  .in('status', ['active', 'trialing'])
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### Service Code - INCORRECT Pattern (clientService.js, line 124-134)
```javascript
const { data: subscriptions } = await supabase
  .from('subscriptions')
  .select(`
    owner_id,
    plan_slug,   // BUG: This column does NOT exist!
    status,
    trial_ends_at,
    current_period_end,
    cancel_at_period_end
  `)
  .in('owner_id', clientIds);
```

This query will **always fail** because `plan_slug` is not a column in the `subscriptions` table.

---

## Recommended Fixes (Prioritized)

### Fix 1: Seed subscriptions for ALL test users (HIGH PRIORITY)

Add subscription records for superadmin and admin in migration 060:

```sql
-- Superadmin subscription (Free plan for testing)
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  id,
  'active',
  NOW()
FROM public.plans WHERE slug = 'free'
ON CONFLICT (owner_id) DO NOTHING;

-- Admin subscription (Starter plan)
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  id,
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM public.plans WHERE slug = 'starter'
ON CONFLICT (owner_id) DO NOTHING;
```

**Impact:** This will resolve the 406 errors for authenticated requests with these users.

### Fix 2: Fix clientService.js schema mismatch (HIGH PRIORITY)

Change line 124-134 from:
```javascript
.select(`
  owner_id,
  plan_slug,   // WRONG
  status,
  ...
`)
```

To:
```javascript
.select(`
  owner_id,
  plan_id,
  plans(slug),  // CORRECT
  status,
  ...
`)
```

And update the subscription lookup (line 138-140):
```javascript
(subscriptions || []).forEach((sub) => {
  subLookup[sub.owner_id] = {
    ...sub,
    plan_slug: sub.plans?.slug || 'free'  // Extract from embedded resource
  };
});
```

**Impact:** This will fix the clientService queries used by admin/superadmin panels.

### Fix 3: Defensive error handling (MEDIUM PRIORITY)

Add try-catch and fallback handling to subscription queries:

```javascript
try {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('plan_id, plans(slug)')
    ...;

  if (error || !subscription) {
    return 'free';  // Graceful fallback
  }
  return subscription.plans?.slug || 'free';
} catch (e) {
  logger.warn('Subscription query failed:', e);
  return 'free';
}
```

**Impact:** Prevents cascading failures when subscription queries fail.

### Fix 4: PostgREST schema cache reload (LOW PRIORITY - if issues persist)

If 406 errors persist after data fixes, the PostgREST schema cache may need refreshing:

```bash
# Via Supabase CLI
supabase db reset

# Or via SQL
SELECT pg_notify('pgrst', 'reload schema');
```

**Impact:** Ensures PostgREST has up-to-date foreign key relationship information.

---

## Impact Assessment

### Tests Affected
- **~450+ E2E tests** fail with 406 errors on subscription queries
- Tests for superadmin and admin roles are most affected
- Client role tests may work (client has subscription seeded)

### Features Blocked
- Any feature that checks subscription/plan status
- Feature flag evaluation
- Feedback submission (checks plan for targeting)
- Admin panel client listing (uses incorrect query)
- Usage limit checks

### Priority Recommendation

1. **URGENT:** Fix 1 (seed data) + Fix 2 (clientService.js) should be applied together
2. **Important:** Fix 3 (error handling) as a safety net
3. **If needed:** Fix 4 (schema cache) only if issues persist after data fix

---

## Quick Fix Script

For immediate testing, run this SQL in Supabase SQL Editor:

```sql
-- Add subscriptions for test users missing them
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (SELECT id FROM public.plans WHERE slug = 'pro'),
  'active',
  NOW()
ON CONFLICT (owner_id) DO NOTHING;

INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (SELECT id FROM public.plans WHERE slug = 'starter'),
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
ON CONFLICT (owner_id) DO NOTHING;

-- Verify
SELECT p.email, s.status, pl.slug as plan
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.owner_id = p.id
LEFT JOIN public.plans pl ON pl.id = s.plan_id
WHERE p.email LIKE '%@bizscreen.test'
ORDER BY p.email;
```

---

## Conclusion

The root cause is **missing subscription records for test users** combined with **a schema mismatch bug in clientService.js**. The fixes are straightforward:

1. Update migration 060 to seed subscriptions for ALL test users
2. Fix clientService.js to use correct embedded resource query pattern
3. Re-run E2E tests to verify

Estimated impact after fixes: **~450 tests should start passing**, reducing the failure count from ~535 to ~85 (remaining failures likely unrelated to subscription queries).
