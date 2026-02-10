---
phase: 44-eslint-zero-warnings
plan: 02
subsystem: ui
tags: [eslint, no-undef, react, logging, error-handling]

# Dependency graph
requires:
  - phase: 44-eslint-zero-warnings
    provides: "ESLint configuration and phase plan"
provides:
  - "Zero no-undef ESLint warnings across entire codebase"
  - "Correct variable references in all error logging calls"
  - "Logger instances added to 3 React components that lacked them"
affects: [44-eslint-zero-warnings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useLogger hook must be called in each React component that uses logger (not inherited from parent scope)"
    - "Error log metadata should reference in-scope variables (function params, component state)"

key-files:
  created: []
  modified:
    - src/components/layout-editor/PixieEditorModal.jsx
    - src/components/scene-editor/AiSuggestionsPanel.jsx
    - src/pages/Admin/AdminEditTemplatePage.jsx
    - src/pages/DataSourcesPage.jsx
    - src/pages/PlaylistsPage.jsx
    - src/pages/SchedulesPage.jsx
    - src/pages/ScreenGroupsPage.jsx
    - src/player/offlineService.js
    - src/services/sessionService.js

key-decisions:
  - "Fixed undefined logger refs by adding useLogger hook calls to child components rather than passing logger as prop"
  - "Fixed undefined variable refs in error logging by using correct in-scope variable names from function params"
  - "offlineService syncPendingHeartbeats replaced with syncPendingEvents (the actual exported function that handles heartbeat sync)"
  - "sessionService sessionId moved before try-catch to keep it in scope for catch block error logging"

patterns-established:
  - "Each React component that calls logger.error() must have its own useLogger() hook call"
  - "Error logging metadata must reference in-scope variables, not stale names from prior refactors"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 44 Plan 02: Fix no-undef Warnings Summary

**Fixed all 34 no-undef ESLint warnings across 9 files -- correcting undefined variable references in error logging, adding missing logger instances, and fixing a broken sync function call**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T15:38:57Z
- **Completed:** 2026-02-10T15:42:39Z
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments
- Eliminated all 34 no-undef ESLint warnings (zero remaining)
- Fixed incorrect variable references in error logging across 7 page/component files
- Added missing useLogger hook calls to 3 child React components (SimpleImageEditor, PolishSlidePanel, AssignScreensModal)
- Fixed broken syncPendingHeartbeats call in offlineService (was calling nonexistent function)
- Fixed sessionId scope issue in sessionService catch block

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all 34 no-undef warnings across 9 files** - `878dc50` (fix)

## Files Created/Modified
- `src/components/layout-editor/PixieEditorModal.jsx` - Added logger to SimpleImageEditor component (1 warning)
- `src/components/scene-editor/AiSuggestionsPanel.jsx` - Added logger to PolishSlidePanel, fixed polishAction -> actionId (2 warnings)
- `src/pages/Admin/AdminEditTemplatePage.jsx` - Fixed result -> savedTemplateId, accessId -> tenantId (3 warnings)
- `src/pages/DataSourcesPage.jsx` - Fixed campaign -> createData in error log (1 warning)
- `src/pages/PlaylistsPage.jsx` - Fixed 8 undefined refs (selectedTemplate, newPlaylist, newPlaylistName, playlistId x4, screenId)
- `src/pages/SchedulesPage.jsx` - Fixed 5 undefined refs (newScheduleName, scheduleId x3, updates)
- `src/pages/ScreenGroupsPage.jsx` - Added logger to AssignScreensModal, fixed groupId/formData/editingGroup/selectedScreenIds (10 warnings)
- `src/player/offlineService.js` - Fixed syncPendingHeartbeats -> syncPendingEvents (1 warning)
- `src/services/sessionService.js` - Moved sessionId declaration before try-catch for catch scope (1 warning)

## Decisions Made
- **useLogger in child components:** Rather than passing logger as a prop or using console.error, added useLogger() hook calls to each child component. This follows the existing codebase pattern where every component that logs errors has its own scoped logger.
- **Variable reference corrections:** All undefined variable references in error logging were from stale names left over from prior refactors. Each was corrected to the actual in-scope variable (function parameter, component state, or callback argument).
- **offlineService sync function:** `syncPendingHeartbeats` was never defined. The correct function is `syncPendingEvents()` which handles all pending event types including heartbeats.
- **sessionService scope fix:** Moved `const sessionId = localStorage.getItem(...)` before the try block so it remains accessible in the catch block for error logging.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All no-undef warnings eliminated, ready for next ESLint rule cleanup plans
- Build and all 2079 unit tests pass with no regressions

## Self-Check: PASSED

All 9 modified source files verified present. Commit 878dc50 verified in git log. Summary file exists.

---
*Phase: 44-eslint-zero-warnings*
*Completed: 2026-02-10*
