# Quick Task 033: Investigate Root Cause of E2E Test Failures

## Summary

Investigation into Supabase 406 errors causing ~450 E2E test failures. Identified **two root causes**: missing subscription records for test users and a schema mismatch bug in clientService.js.

## Findings

### Root Cause 1: Missing Subscription Data

The test users `superadmin@bizscreen.test` (aaaa...aaaa) and `admin@bizscreen.test` (bbbb...bbbb) do not have subscription records in the database. When queries use `.select('plan_id, plans(slug)')`, PostgREST returns HTTP 406 because the embedded resource join cannot resolve for non-existent rows.

**Evidence:** Migration 060 only creates subscriptions for client and client2 users, not for superadmin or admin.

### Root Cause 2: Schema Mismatch in clientService.js

Line 124-134 queries `plan_slug` directly from the `subscriptions` table, but this column does not exist. The correct pattern is `plan_id, plans(slug)` (embedded resource join).

**Evidence:** Schema in migration 017 shows no `plan_slug` column. feedbackService.js and featureFlagService.js use the correct pattern.

## Recommended Fixes

1. **Fix migration 060:** Add subscription records for superadmin and admin test users
2. **Fix clientService.js:** Change `plan_slug` to `plan_id, plans(slug)` embedded resource
3. **Add defensive error handling:** Graceful fallback when subscription queries fail

## Impact

- ~450 tests affected by 406 errors
- Fixes are straightforward (data seeding + query correction)
- Expected to reduce failures from ~535 to ~85

## Output

- Diagnostic report: `.planning/quick/033-investigate-root-cause-of-e2e-test-failu/033-DIAGNOSTIC-REPORT.md`

## Date

2026-02-03
