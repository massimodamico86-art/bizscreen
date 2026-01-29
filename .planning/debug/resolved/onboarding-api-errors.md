---
status: resolved
trigger: "OnboardingService flooding console with 404/400 errors, modal appears broken"
created: 2026-01-29T10:00:00Z
updated: 2026-01-29T22:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Database migrations 136 and 139 not applied to local Supabase
test: Call RPC functions directly via curl to verify existence
expecting: Functions should exist if migrations applied
next_action: Apply missing migrations to local Supabase database

## Symptoms

expected: App loads normally with onboarding modal working correctly
actual: Console flooded with 86+ OnboardingService errors, modal appears empty/broken with only a blue button visible
errors:
  - 404 Not Found on `rest_welcome_tour_step` endpoint (127.0.0.1:54321/rest_welcome_tour_step)
  - 400 Bad Request on `rest_onboarding_state` endpoint (127.0.0.1:54321/rest_onboarding_state)
  - [ERROR] [OnboardingService] Error fetching unified onboarding state: Object
  - [ERROR] [OnboardingService] Error updating welcome tour step: Object
  - Errors repeat continuously suggesting a loop or retry mechanism
reproduction: Happens on app load at localhost:5173/app (Dashboard), onboarding modal triggers the errors
started: After recent changes

## Eliminated

- hypothesis: OnboardingService calling wrong endpoint names
  evidence: Code correctly uses supabase.rpc() with proper function names
  timestamp: 2026-01-29T10:15:00Z

- hypothesis: REST endpoint URL formatting issue
  evidence: All supabase.rpc() calls are correctly formatted
  timestamp: 2026-01-29T10:18:00Z

## Evidence

- timestamp: 2026-01-29T10:10:00Z
  checked: onboardingService.js API calls
  found: All calls correctly use supabase.rpc() with function names like 'get_welcome_tour_progress', 'update_welcome_tour_step', 'get_unified_onboarding_state'
  implication: Service code is correct, issue is server-side

- timestamp: 2026-01-29T10:20:00Z
  checked: curl test of RPC function get_welcome_tour_progress
  found: PGRST202 error - "Could not find the function public.get_welcome_tour_progress without parameters in the schema cache"
  implication: Migration 136 was NOT applied to local database

- timestamp: 2026-01-29T10:21:00Z
  checked: curl test of update_welcome_tour_step and skip_welcome_tour
  found: Both return PGRST202 - functions not found
  implication: Confirms migration 136 was never applied

- timestamp: 2026-01-29T10:22:00Z
  checked: Supabase status
  found: Local Supabase is running at 127.0.0.1:54321
  implication: Database is up, migrations just missing

## Resolution

root_cause: Database migrations 136 and 139 were not applied to local Supabase database. These migrations create the RPC functions get_welcome_tour_progress, update_welcome_tour_step, skip_welcome_tour, get_unified_onboarding_state, advance_onboarding_step, and complete_unified_onboarding. Without these functions, the onboardingService calls fail with 404/400 errors, which repeat continuously due to the UI trying to load onboarding state.

fix:
1. Applied migration 136_welcome_tour_onboarding.sql to create welcome tour RPC functions
2. Applied migration 139_unified_onboarding_state.sql to create unified onboarding RPC functions
3. Fixed both migrations to handle unauthenticated calls gracefully (return empty/default instead of crashing)
4. Fixed migration 105_application_logs.sql that referenced non-existent 'tenants' table
5. Fixed migration 106_gdpr_compliance.sql that had schema issues

verification:
- curl test of get_unified_onboarding_state returns valid JSON: {"can_resume": false, "skipped_at": null, "is_complete": false, "current_step": "welcome_tour", "progress_percent": 0}
- curl test of get_welcome_tour_progress returns empty array (expected for unauthenticated)
- Functions exist in database schema cache (no more PGRST202 errors)

files_changed:
- supabase/migrations/105_application_logs.sql (fixed tenants FK reference)
- supabase/migrations/106_gdpr_compliance.sql (fixed table schema)
- supabase/migrations/136_welcome_tour_onboarding.sql (added auth check)
- supabase/migrations/139_unified_onboarding_state.sql (added auth check)
