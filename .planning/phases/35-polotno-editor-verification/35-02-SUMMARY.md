---
phase: 35-polotno-editor-verification
plan: 02
subsystem: ui
tags: [polotno, editor, dirty-state, modal, postMessage, iframe]

# Dependency graph
requires:
  - phase: 35-01
    provides: EditorModal wrapper with loading/error states
provides:
  - Dirty state tracking via iframe postMessage
  - UnsavedChangesDialog with Save/Discard/Cancel buttons
  - Close interception when unsaved changes exist
affects: [35-03, 35-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - postMessage dirty state communication between iframe and parent
    - Three-button confirmation dialog pattern

key-files:
  created:
    - src/components/UnsavedChangesDialog.jsx
  modified:
    - scripts/polotno-build/src/main.jsx
    - src/components/PolotnoEditor.jsx
    - src/components/EditorModal.jsx

key-decisions:
  - "Use postMessage designChanged to track dirty state from iframe to parent"
  - "500ms debounce on change notifications to avoid excessive messages"
  - "triggerSave action enables programmatic save from UnsavedChangesDialog"
  - "Cancel returns to editor, Discard closes without saving, Save saves then closes"

patterns-established:
  - "Iframe-parent dirty state: iframe sends designChanged, parent tracks isDirty"
  - "Close interception: handleCloseAttempt checks dirty before allowing close"
  - "Three-button dialog layout: Cancel left, Discard/Save right"

# Metrics
duration: 5min
completed: 2026-02-01
---

# Phase 35 Plan 02: Unsaved Changes Detection Summary

**Dirty state tracking via iframe postMessage with three-button confirmation dialog (Save/Discard/Cancel)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-01T04:37:09Z
- **Completed:** 2026-02-01T04:41:48Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Iframe editor sends 'designChanged' postMessage when user edits
- PolotnoEditor tracks and reports dirty state to parent via onDirtyChange callback
- EditorModal intercepts close attempts and shows UnsavedChangesDialog when dirty
- UnsavedChangesDialog provides Save/Discard/Cancel options for user choice
- triggerSave action enables programmatic save-then-close flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Add change detection in iframe editor** - Already committed in previous session (included in main.jsx)
2. **Task 2: Handle dirty state in PolotnoEditor and EditorModal** - `64551d4` (feat)
3. **Task 3: Create UnsavedChangesDialog with three buttons** - `303727e` (feat)
4. **Task 1 addition: triggerSave handler** - `2fe3826` (feat)

## Files Created/Modified

- `scripts/polotno-build/src/main.jsx` - Added store.on('change') listener, designChanged postMessage, triggerSave handler
- `src/components/PolotnoEditor.jsx` - Added onDirtyChange prop, handle designChanged message, clear dirty on save
- `src/components/EditorModal.jsx` - Track isDirty state, handleCloseAttempt, render UnsavedChangesDialog
- `src/components/UnsavedChangesDialog.jsx` - Three-button modal with Save/Discard/Cancel, loading state

## Decisions Made

- **500ms debounce on change notifications**: Prevents excessive postMessage traffic while still detecting changes quickly
- **triggerSave action**: Enables UnsavedChangesDialog to programmatically trigger save before close
- **Reset dirty state on load**: Both loadDesign and loadTemplate reset hasChanges to prevent false positives
- **Amber warning styling**: AlertTriangle icon with amber colors signals warning without being too alarming

## Deviations from Plan

None - plan executed exactly as written. Task 1 changes were already partially present from a previous session.

## Issues Encountered

None - builds passed on first attempt.

## Next Phase Readiness

- Dirty state detection working end-to-end
- UnsavedChangesDialog integrated with EditorModal
- PostSaveDialog from Plan 35-03 already integrated (commits found in history)
- Ready for Plan 35-04: Full flow verification

---
*Phase: 35-polotno-editor-verification*
*Completed: 2026-02-01*
