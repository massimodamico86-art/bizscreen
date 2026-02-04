---
task: 036
type: quick
title: Verify 406 fix
status: blocked
completed: 2026-02-04
duration: ~15 minutes (blocked by infrastructure)
---

# Quick Task 036: Verify 406 Fix - BLOCKED

## One-liner
Docker Desktop unresponsive; cannot verify 406 fix due to PostgREST PGRST002 schema cache error.

## Objective
Verify that the 406 error fix from quick-034 resolved the subscription query failures in E2E tests.

## Status: BLOCKED

### Root Cause Identified

E2E tests failed with "Database error querying schema" on login page. Investigation revealed:

```bash
curl http://127.0.0.1:54321/rest/v1/plans?select=slug,name
# Response:
{"code":"PGRST002","details":null,"hint":null,"message":"Could not query the database for the schema cache. Retrying."}
```

**PGRST002** indicates PostgREST cannot connect to PostgreSQL to refresh its schema cache. This is a Supabase infrastructure issue, not related to the 406 fix code changes.

### Infrastructure Status

1. **Docker ps initially returned containers** - Showed 11 Supabase containers running, healthy
2. **Supabase health endpoint responded** - GoTrue v2.184.0 healthy
3. **PostgREST failing** - PGRST002 error on all REST API calls
4. **`npx supabase db reset` failed** - Docker I/O error when pulling postgres:17.6.1.079
5. **Docker commands became unresponsive** - All `docker` commands timeout with no output
6. **Docker Desktop restart attempted** - Force killed and restarted, but daemon unresponsive

### Blocking Issue

Docker Desktop appears to be in a corrupted/hung state requiring manual intervention:
- Docker processes exist (PID 99288+) but daemon not responding
- All `docker` CLI commands hang indefinitely
- Cannot restart Supabase services
- Cannot reset database

### Actions Required

**Human intervention needed:**

1. **Restart Docker Desktop manually:**
   - Click Docker icon in menu bar
   - Select "Restart" or "Troubleshoot > Reset to factory defaults"
   - Or: Kill Docker from Activity Monitor, then relaunch

2. **Reset Supabase database:**
   ```bash
   npx supabase stop --no-backup
   npx supabase db reset
   npx supabase start
   ```

3. **Verify infrastructure:**
   ```bash
   curl http://127.0.0.1:54321/rest/v1/plans?select=slug -H "apikey: $ANON_KEY"
   # Should return JSON array, not PGRST002 error
   ```

4. **Re-run quick task 036** once infrastructure is healthy

### Test Results

- E2E tests: **Did not run** (auth setup failed)
- Auth setup failure: All 3 roles (client, admin, superadmin) timed out waiting for login redirect
- Root cause: PostgREST PGRST002 error displayed on login page

### Quick-034 Fix Status

**Unable to verify.** The 406 fix (migration 060 subscription seeding + clientService.js schema correction) cannot be tested until Docker/Supabase infrastructure is restored.

The fix code changes from quick-034 remain in place and should be correct based on code review:
- Migration 060 seeds subscriptions for all 4 test users
- clientService.js uses `plans(slug)` embedded resource pattern

## Next Steps

1. Manual Docker Desktop restart by user
2. `npx supabase db reset` to apply all migrations
3. Re-run E2E tests: `npx playwright test`
4. Compare results against baseline (385 passed)

## Files Created/Modified

None - this task was blocked before any code changes.

## Commits

None - no code changes made.
