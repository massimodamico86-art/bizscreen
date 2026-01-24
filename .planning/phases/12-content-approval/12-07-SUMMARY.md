---
phase: 12-content-approval
plan: 07
subsystem: services, ui
tags: [approval, schedules, permissions, content-assignment]

# Dependency graph
requires:
  - phase: 12-01
    provides: approval_status column on playlists/scenes, requiresApproval helper
provides:
  - canAssignContent validation in scheduleService
  - ScheduleEditorPage approval status display in content picker
  - Editors restricted from assigning unapproved content
affects: [schedule-workflow, content-publishing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Role-based content assignment validation
    - Approval status display in content pickers

key-files:
  created: []
  modified:
    - src/services/scheduleService.js
    - src/pages/ScheduleEditorPage.jsx

key-decisions:
  - "Validation at service level: canAssignContent called in createScheduleEntry, updateScheduleEntry, updateScheduleFillerContent"
  - "Native select dropdown with disabled options for unapproved content (simpler than custom component)"
  - "Helper text shown only when user requires approval"

patterns-established:
  - "Content assignment validation: Use canAssignContent() before allowing schedule assignment"
  - "UI approval restriction: Disable options in dropdown, show status label in option text"

# Metrics
duration: 2min 21s
completed: 2026-01-24
---

# Phase 12 Plan 07: Block Unapproved Content from Schedule Assignment Summary

**Service-level validation prevents editors from assigning unapproved content to schedules; UI shows approval status in content picker**

## Performance

- **Duration:** 2 min 21 sec
- **Started:** 2026-01-24T21:17:20Z
- **Completed:** 2026-01-24T21:19:41Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- canAssignContent() function validates approval status before content assignment
- Validation wired into createScheduleEntry, updateScheduleEntry, updateScheduleFillerContent
- ScheduleEditorPage content picker shows approval status labels
- Unapproved playlists/scenes are disabled for editors in dropdown
- Helper text explains approval requirement to editors
- getScenesForSchedule includes approval_status for UI display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add content assignment validation to scheduleService** - `268963e` (feat)
2. **Task 2: Update ScheduleEditorPage content picker** - `27232ae` (feat)
3. **Task 3: Ensure content queries include approval_status** - No changes needed (verification only)

## Files Modified

- `src/services/scheduleService.js` - Add canAssignContent(), wire into entry functions, update getScenesForSchedule
- `src/pages/ScheduleEditorPage.jsx` - Add approval status display, disable unapproved items, load approval_status

## Decisions Made

- Validation at service level ensures all assignment paths are protected (API-first approach)
- Used native HTML select with disabled attribute (simpler than custom component, accessible)
- Show approval status in option text for visibility without extra UI elements
- Helper text appears only for users who require approval (editors/viewers)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- APR-04 requirement fulfilled: Rejected content cannot be published to screens
- Editors see approval status and cannot select unapproved content
- Owners/managers can still assign any content regardless of status
- Ready for 12-08: Testing and verification

---
*Phase: 12-content-approval*
*Completed: 2026-01-24*
