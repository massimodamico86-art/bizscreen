---
phase: 12-content-approval
plan: 01
subsystem: database, api
tags: [approval, scenes, permissions, migration, supabase]

# Dependency graph
requires:
  - phase: 12-research
    provides: approval system design and infrastructure patterns
provides:
  - Approval columns on scenes table (matching playlists/layouts/campaigns)
  - approvalService supports 'scene' resource type
  - requiresApproval() helper for role-based approval detection
  - canApproveContent() helper for approval permission checking
affects: [12-02, 12-03, 12-04, scene-editing, content-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Resource type extension pattern for approval system
    - Role-based permission helpers for approval workflows

key-files:
  created:
    - supabase/migrations/122_scenes_approval_columns.sql
  modified:
    - src/services/approvalService.js
    - src/services/permissionsService.js

key-decisions:
  - "Extended existing approval column pattern from migration 027 to scenes"
  - "Updated view v_review_requests_with_details to include scene name lookup"
  - "requiresApproval() returns true for editors/viewers, false for owners/managers/admins"

patterns-established:
  - "Resource type extension: Add to RESOURCE_TYPES constant and getTableName mapping"
  - "Role-based approval: Use requiresApproval() before showing approval UI"

# Metrics
duration: 1min 28s
completed: 2026-01-24
---

# Phase 12 Plan 01: Approval Infrastructure Summary

**Scenes approval columns, approvalService scene support, and role-based requiresApproval/canApproveContent permission helpers**

## Performance

- **Duration:** 1 min 28 sec
- **Started:** 2026-01-24T21:04:59Z
- **Completed:** 2026-01-24T21:06:27Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Scenes table now has approval_status, approval_requested_by/at, approval_decided_by/at, approval_comment columns
- approvalService RESOURCE_TYPES includes SCENE and getTableName maps 'scene' to 'scenes'
- permissionsService exports requiresApproval() and canApproveContent() for role-based approval detection
- review_requests and preview_links constraints updated to allow 'scene' resource type
- v_review_requests_with_details view updated to show scene names

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration for scenes approval columns** - `3790983` (feat)
2. **Task 2: Extend approvalService to support scenes** - `3ad4d58` (feat)
3. **Task 3: Add requiresApproval helper to permissionsService** - `2fde744` (feat)

## Files Created/Modified
- `supabase/migrations/122_scenes_approval_columns.sql` - Add approval columns to scenes, update constraints and view
- `src/services/approvalService.js` - Add SCENE resource type and scene table mapping
- `src/services/permissionsService.js` - Add requiresApproval() and canApproveContent() helpers

## Decisions Made
- Extended existing approval column pattern from migration 027 to scenes for consistency
- Updated v_review_requests_with_details view in same migration to include scene names
- canApproveContent() uses isAtLeastManager() helper for consistency with existing permission checks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Scenes now support approval workflow (same as playlists/layouts/campaigns)
- requiresApproval() available for UI to determine when to show approval UI
- canApproveContent() available to control approve/reject button visibility
- Ready for 12-02: Approval UI components (ApprovalBadge, RequestApprovalButton)

---
*Phase: 12-content-approval*
*Completed: 2026-01-24*
