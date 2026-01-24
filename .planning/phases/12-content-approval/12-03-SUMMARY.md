---
phase: 12-content-approval
plan: 03
subsystem: api
tags: [approval, permissions, playlist, auto-submit, workflow]

# Dependency graph
requires:
  - phase: 12-01
    provides: approval database schema, approval columns on playlists table
provides:
  - savePlaylistWithApproval function with role-based auto-submit
  - handleSavePlaylist hook callback with approval integration
  - Re-approval flow for editing approved content
  - Duplicate review request prevention
affects: [12-04, 12-05, scene-approval]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-submit pattern: save then conditionally request approval based on user role"
    - "Re-approval pattern: detect approved status, reset to draft, create new review"
    - "Duplicate prevention pattern: check for existing open review before creating new"

key-files:
  created: []
  modified:
    - src/services/playlistService.js
    - src/pages/hooks/usePlaylistEditor.js

key-decisions:
  - "Combined Task 1 and Task 3 implementation since re-approval logic belongs in savePlaylistWithApproval"
  - "Return wasResubmission flag to differentiate new submissions from re-submissions"
  - "Auto-submit has empty message; re-submissions include 'Content was edited after approval'"

patterns-established:
  - "saveWithApproval pattern: single function handles save + conditional approval flow"
  - "Approval toast hierarchy: wasResubmission > submittedForApproval > existingReview > plain save"

# Metrics
duration: 2min
completed: 2026-01-24
---

# Phase 12 Plan 03: Playlist Auto-Submit for Approval Summary

**savePlaylistWithApproval function auto-submits for approval when editor/viewer saves, handles re-approval on edit, prevents duplicate reviews**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-24T21:10:36Z
- **Completed:** 2026-01-24T21:12:52Z
- **Tasks:** 3 (Task 3 merged into Task 1)
- **Files modified:** 2

## Accomplishments
- Added savePlaylistWithApproval function to playlistService.js that saves playlist and conditionally auto-submits for approval
- Integrated auto-submit into usePlaylistEditor hook via new handleSavePlaylist callback
- Implemented re-approval flow: editing approved content resets to draft and creates new review request
- Duplicate review prevention: checks for existing open review before creating new one
- Role-based behavior: owners/managers save without approval, editors/viewers auto-submit

## Task Commits

Each task was committed atomically:

1. **Task 1: Add savePlaylistWithApproval to playlistService** - `ed6aa72` (feat)
2. **Task 2: Update usePlaylistEditor to use auto-submit** - `54d138b` (feat)
3. **Task 3: Handle re-approval on edit** - Included in `ed6aa72` (merged with Task 1)

## Files Created/Modified
- `src/services/playlistService.js` - Added savePlaylistWithApproval function with imports from permissionsService and approvalService
- `src/pages/hooks/usePlaylistEditor.js` - Added handleSavePlaylist callback using savePlaylistWithApproval, exported in hook return

## Decisions Made
- Combined Task 1 and Task 3 into single implementation since the re-approval logic naturally belongs within the savePlaylistWithApproval function
- Used `wasResubmission` flag to differentiate re-submissions from new submissions for appropriate toast messaging
- Auto-submit uses empty message; re-submissions include explanatory message "Content was edited after approval"

## Deviations from Plan

None - plan executed as written. Task 3 was implemented as part of Task 1's savePlaylistWithApproval function rather than as a separate modification since the logic naturally fit together.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- savePlaylistWithApproval pattern ready to be replicated for scenes in Plan 04
- handleSavePlaylist available for UI integration (e.g., Done button could call it)
- Approval flow end-to-end: save -> check role -> check existing -> create review -> update status

---
*Phase: 12-content-approval*
*Plan: 03*
*Completed: 2026-01-24*
