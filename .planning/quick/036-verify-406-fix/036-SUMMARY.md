---
task: 036
type: quick
title: Verify 406 fix
status: completed
completed: 2026-02-04
duration: ~30 minutes (including Docker restart)
---

# Quick Task 036: Verify 406 Fix - COMPLETED

## One-liner
406 fix verified - auth setup passes for all test users. Found and fixed migration 119 column name mismatch and duplicate migration 127.

## Objective
Verify that the 406 error fix from quick-034 resolved the subscription query failures in E2E tests.

## Status: COMPLETED

### Verification Results

**406 Fix Confirmed Working!**

Auth setup now passes for all 3 test users:
```
✓ authenticate-client (1.9s)
✓ authenticate-admin (1.9s)
✓ authenticate-superadmin (1.9s)
```

The quick-034 fixes are working:
- Migration 060 seeds subscription records for all 4 test users
- clientService.js `plans(slug)` PostgREST embedded resource pattern is correct

### E2E Test Results

| Metric | Count |
|--------|-------|
| **Passed** | 174 |
| Skipped | 107 |
| Did not run | 12 |
| Failed | ~110 |
| **Total** | 403 |

### Issues Found & Fixed

#### 1. Docker Desktop Hung (Infrastructure)
**Problem:** Docker daemon became unresponsive (same issue from quick-035)
**Resolution:** Manual restart required, then `npx supabase stop && npx supabase start`

#### 2. Migration 119 Column Name Mismatch
**Problem:** `119_gdpr_export_data_collection.sql` referenced old column names renamed in migration 0041:
- `td.name` → `td.device_name`
- `td.last_seen_at` → `td.last_seen`
- `qr.name` → `qr.qr_name`
- `qr.type` → `qr.qr_type`
- `qr.details` → `qr.qr_details`

**Fix:** Updated migration 119 to use correct column names.

#### 3. Duplicate Migration Version 127
**Problem:** Two migrations had version 127:
- `127_campaign_analytics.sql`
- `127_campaign_templates_seasonal.sql`

**Fix:** Renamed `127_campaign_templates_seasonal.sql` to `140_campaign_templates_seasonal.sql`

## Files Modified

1. `supabase/migrations/119_gdpr_export_data_collection.sql` - Fixed column references
2. `supabase/migrations/127_campaign_templates_seasonal.sql` → `140_campaign_templates_seasonal.sql` - Renumbered

## Key Takeaways

1. **406 error is fixed** - The PostgREST query pattern and seed data from quick-034 resolved the issue
2. **Auth setup now reliable** - All 3 user roles authenticate successfully
3. **Migration schema drift** - Column renames in earlier migrations (0041) were not accounted for in later migrations (119)
4. **Migration naming conflicts** - Duplicate version numbers cause `schema_migrations_pkey` violations

## Next Steps

1. Commit the migration fixes
2. Address remaining E2E test failures (separate from 406 issue)
3. Update baseline test metrics

## Commits

- `fix(migrations): correct column names in 119_gdpr_export_data_collection.sql`
- `fix(migrations): renumber duplicate migration 127 to 140`
