---
phase: 42-dead-code-legacy-cleanup
plan: 01
subsystem: codebase-hygiene
tags: [dead-code, migrations, supabase, onboarding, logging]

# Dependency graph
requires:
  - phase: 30-35 (v2.2 Onboarding Polish)
    provides: Onboarding system that made AutoBuildOnboardingModal and autoBuildService obsolete
provides:
  - Zero dead onboarding files (AutoBuildOnboardingModal, autoBuildService removed)
  - Corrective migration 141 dropping orphaned tenant_id from application_logs
  - Clean loggingService insert mapping (no tenant_id)
affects: [43-skipped-test-audit, logging, database-schema]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Corrective migration pattern: new migration to fix already-applied migration schema errors"

key-files:
  created:
    - supabase/migrations/141_remove_application_logs_tenant_id.sql
  modified:
    - src/components/onboarding/index.js
    - src/services/loggingService.js

key-decisions:
  - "Corrective migration (141) instead of editing applied migration (105) -- standard approach for fixing schema in already-deployed databases"

patterns-established:
  - "Corrective migration: When an applied migration has schema errors, create a new migration to ALTER/DROP rather than editing the original"

# Metrics
duration: 2min
completed: 2026-02-09
---

# Phase 42 Plan 01: Dead Code & Legacy Cleanup Summary

**Removed dead AutoBuildOnboardingModal/autoBuildService chain and created corrective migration 141 to drop orphaned tenant_id from application_logs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-09T23:55:46Z
- **Completed:** 2026-02-09T23:57:36Z
- **Tasks:** 3 (2 execution + 1 verification)
- **Files modified:** 4 (2 deleted, 1 created, 2 modified)

## Accomplishments
- Deleted AutoBuildOnboardingModal.jsx and autoBuildService.js (631 lines of dead code removed)
- Cleaned barrel export in onboarding/index.js to remove dead reference
- Created corrective migration 141 to drop tenant_id column, its index, and fix RLS policy on application_logs
- Removed tenant_id from loggingService.js insert mapping
- Verified all 5 requirements (DEAD-01 through DEAD-04, MIGR-01) pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove AutoBuildOnboardingModal and dead chain** - `7c0958c` (feat)
2. **Task 2: Fix migration 105 tenant_id and update loggingService** - `f8bc736` (fix)
3. **Task 3: Verify all success criteria** - No commit (verification-only, no file changes)

**Plan metadata:** `8677141` (docs: complete plan)

## Files Created/Modified
- `src/components/onboarding/AutoBuildOnboardingModal.jsx` - DELETED (dead onboarding modal, 421 lines)
- `src/services/autoBuildService.js` - DELETED (dead service, 208 lines)
- `src/components/onboarding/index.js` - Removed AutoBuildOnboardingModal barrel export and JSDoc reference
- `supabase/migrations/141_remove_application_logs_tenant_id.sql` - CREATED: Corrective migration dropping tenant_id column, index, and fixing RLS policy
- `src/services/loggingService.js` - Removed tenant_id from storeCriticalLogs insert mapping

## Decisions Made
- Used corrective migration (141) rather than editing applied migration (105) -- migration 105 has already been applied to the database, so editing it would not retroactively fix the schema. A new migration safely alters the existing table.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Migration 141 will be applied on next `supabase db push` or deployment.

## Next Phase Readiness
- Dead code from previous onboarding milestones fully eliminated
- Migration history is clean with proper corrective migration chain (105 -> 141)
- Ready for Phase 43 (Skipped Test Audit) or any subsequent cleanup phases

## Self-Check: PASSED

- AutoBuildOnboardingModal.jsx: CONFIRMED DELETED
- autoBuildService.js: CONFIRMED DELETED
- migration 141: FOUND
- index.js: FOUND (modified)
- loggingService.js: FOUND (modified)
- Commit 7c0958c: FOUND (Task 1)
- Commit f8bc736: FOUND (Task 2)

---
*Phase: 42-dead-code-legacy-cleanup*
*Completed: 2026-02-09*
