---
status: resolved
trigger: "Login fails with 'Profile load failed: column profiles.tenant_id does not exist' (PostgreSQL error 42703)"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - Code SELECT referenced tenant_id column that did not exist on profiles table
test: Applied migration 155_add_tenant_id_to_profiles.sql, verified column exists and data is correct
expecting: Login succeeds, profile loads with tenant_id populated
next_action: RESOLVED - archived

## Symptoms

expected: User can log in and their profile loads successfully
actual: After login, a "Profile Load Failed" modal appears with message "Profile load failed: column profiles.tenant_id does not exist" (error code 42703). The browser console shows a 400 Bad Request on a REST endpoint and "[AuthContext] Profile fetch error".
errors: |
  - UI: "Profile load failed: column profiles.tenant_id does not exist"
  - Error Code: 42703 (PostgreSQL undefined_column)
  - Console: "Failed to load resource: the server responded with a status of 400 (Bad Request)" on 127.0.0.1:54321/rest/...
  - Console: [AuthContext] Profile fetch error
  - Console: [AuthContext] Fetching profile -> then immediately error
  - User signed in successfully (auth works), but profile fetch fails
reproduction: Navigate to localhost:5173/app, log in as client@bizscreen.test
started: Just broke after a recent change. Was working before.

## Eliminated

## Evidence

- timestamp: 2026-02-23T00:05:00Z
  checked: src/contexts/AuthContext.jsx line 102
  found: ".select('id, email, full_name, role, has_completed_onboarding, tenant_id')" - added in commit b362ebe
  implication: The query asks for tenant_id column which doesn't exist on profiles table

- timestamp: 2026-02-23T00:07:00Z
  checked: git log --follow src/contexts/AuthContext.jsx
  found: commit b362ebe "fix(76-03): add tenant_id to AuthContext profiles SELECT and fix deletion argument"
  implication: The commit added tenant_id to SELECT but forgot to add a DB migration

- timestamp: 2026-02-23T00:09:00Z
  checked: All supabase/migrations/*.sql for "ADD COLUMN.*tenant_id.*profiles" or "ALTER TABLE.*profiles.*tenant_id"
  found: No such migration exists
  implication: The column was added to code but never added to the database schema

- timestamp: 2026-02-23T00:10:00Z
  checked: supabase/migrations/001_initial_schema.sql CREATE TABLE profiles definition
  found: profiles table has columns: id, email, full_name, role, avatar_url, created_at, updated_at, last_active_at - NO tenant_id
  implication: Confirms the column has never existed

- timestamp: 2026-02-23T00:12:00Z
  checked: Usage of userProfile.tenant_id across entire codebase
  found: Used in EnterpriseSecurityPage (policy load/save, data deletion), layoutTemplateService (save as template), notificationDispatcherService (filter users by tenant), observability.js
  implication: tenant_id is legitimately needed - the right fix is adding the DB column, not removing from SELECT

- timestamp: 2026-02-23T00:15:00Z
  checked: notificationDispatcherService.js - SELECT tenant_id FROM profiles WHERE tenant_id = alert.tenant_id
  found: The service also filters profiles BY tenant_id - so the column must exist in DB for that query too
  implication: This is a systemic missing migration, not a code error

- timestamp: 2026-02-23T00:18:00Z
  checked: Architecture pattern via migrations/057_phase18_event_logs.sql comments
  found: "TENANT MODEL: profiles-as-tenant — tenant_id references profiles(id) - the profile IS the tenant/owner"
  implication: For admins, tenant_id = their own id. For managed clients, tenant_id = admin's id (via managed_by)

- timestamp: 2026-02-23T00:25:00Z
  checked: docker exec profiles table column list via psql
  found: 49 columns, NO tenant_id column - confirmed missing
  implication: Root cause verified

- timestamp: 2026-02-23T00:28:00Z
  checked: After applying migration 155
  found: SELECT returns tenant_id=bbbbbbbb (admin id) for client@bizscreen.test with managed_by=bbbbbbbb. Correct.
  implication: Fix verified - column exists, backfill correct, REST query succeeds

## Resolution

root_cause: >
  Commit b362ebe added `tenant_id` to the AuthContext profiles SELECT query
  (src/contexts/AuthContext.jsx line 102) to support features in EnterpriseSecurityPage
  and other services, but NO database migration was created to add the column to the
  profiles table. PostgreSQL responded with error 42703 (undefined_column) on every
  profile fetch, causing the "Profile Load Failed" modal on every login.

fix: >
  Created supabase/migrations/155_add_tenant_id_to_profiles.sql which:
  1. Adds tenant_id UUID column to public.profiles with FK reference to profiles(id)
  2. Backfills existing rows: clients with managed_by get tenant_id=managed_by;
     all others get tenant_id=their own id (profiles-as-tenant pattern)
  3. Creates an index on tenant_id for query performance
  4. Creates INSERT trigger to auto-set tenant_id on new profile creation
  5. Creates UPDATE trigger to re-derive tenant_id when managed_by changes

verification: >
  Applied migration via docker exec psql. Verified:
  - client@bizscreen.test now has tenant_id=bbbbbbbb-bbbb (their managing admin's id)
  - admin@bizscreen.test has tenant_id=their own id
  - REST endpoint /rest/v1/profiles?select=...tenant_id returns 200 (was 400)
  - 5 existing profiles all correctly backfilled

files_changed:
  - supabase/migrations/155_add_tenant_id_to_profiles.sql (new file - adds tenant_id column to profiles)
