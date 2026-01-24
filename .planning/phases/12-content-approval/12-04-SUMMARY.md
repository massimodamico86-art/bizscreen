---
phase: 12-content-approval
plan: 04
subsystem: services, pages
tags: [approval, scenes, permissions, auto-submit, ui]

# Dependency graph
requires:
  - phase: 12-01
    provides: approval infrastructure (scene support, requiresApproval, getOpenReviewForResource)
provides:
  - saveSceneWithApproval function for auto-submitting scenes for approval
  - SceneEditorPage integration with approval workflow
  - Approval status badge display in scene editor
affects: [12-05, 12-06, 12-07, scene-workflow, approval-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Auto-submit for approval on exit pattern (handleBack)
    - Approval-aware save function with duplicate detection
    - Re-approval workflow for previously approved content

key-files:
  created: []
  modified:
    - src/services/sceneService.js
    - src/pages/SceneEditorPage.jsx

key-decisions:
  - "Auto-submit on Done button click rather than during auto-save to avoid excessive review requests"
  - "Pass empty updates object since slide changes are saved separately via updateSlide"
  - "Show approval badge in header only for non-draft statuses"

patterns-established:
  - "Approval integration at navigation exit point rather than every save"
  - "Check userRequiresApproval on load, not on every save"

# Metrics
duration: 2min 3s
completed: 2026-01-24
---

# Phase 12 Plan 04: Scene Approval Auto-Submit Summary

**saveSceneWithApproval function and SceneEditorPage integration for automatic approval submission when editors/viewers save scenes**

## Performance

- **Duration:** 2 min 3 sec
- **Started:** 2026-01-24T21:11:10Z
- **Completed:** 2026-01-24T21:13:13Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- sceneService.js now exports saveSceneWithApproval with full approval workflow logic
- SceneEditorPage submits scenes for approval when user clicks "Done" (if user requires approval)
- Approval status badge visible in editor header for non-draft scenes
- Duplicate review detection prevents multiple open reviews for same scene
- Re-approval workflow handles editing previously approved content

## Task Commits

Each task was committed atomically:

1. **Task 1: Add saveSceneWithApproval to sceneService** - `d00d466` (feat)
2. **Task 2 & 3: Update SceneEditorPage with approval integration** - `933fad3` (feat)

## Files Modified
- `src/services/sceneService.js` - Added saveSceneWithApproval function with imports
- `src/pages/SceneEditorPage.jsx` - Added approval workflow, status badge, and toast messages

## Key Implementation Details

### saveSceneWithApproval Function
```javascript
export async function saveSceneWithApproval(sceneId, updates, sceneName) {
  // 1. Get current approval status before saving
  // 2. Save scene via updateScene
  // 3. Check if user requires approval via requiresApproval()
  // 4. Handle re-approval for previously approved content
  // 5. Check for existing open review to avoid duplicates
  // 6. Auto-submit via requestApproval if needed
  return { scene, submittedForApproval, existingReview, wasResubmission };
}
```

### SceneEditorPage Integration
- Imports: saveSceneWithApproval, getApprovalStatusConfig, getOpenReviewForResource, requiresApproval
- New state: currentReview, userRequiresApproval, approvalPending
- handleBack triggers approval submission when user clicks "Done"
- Approval status badge displayed in header next to business type

## Decisions Made
- Submit for approval on "Done" click (not during auto-save) to prevent excessive review requests
- Pass empty updates object to saveSceneWithApproval since slides are saved separately
- Show approval badge only for non-draft statuses to reduce UI clutter

## Deviations from Plan

**[Rule 2 - Adaptation] Modified Task 2 implementation approach**
- **Found during:** Task 2 implementation
- **Issue:** SceneEditorPage auto-saves slides, not scenes; no handleSave function exists
- **Adaptation:** Integrated approval into handleBack (Done button) instead of save handler
- **Rationale:** This better matches the actual code structure while achieving the same goal

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- saveSceneWithApproval available for any scene save workflow
- Approval status visible in scene editor UI
- Ready for 12-05: Approval Queue UI will display pending scene reviews
- Ready for 12-06: Content status indicators can use getApprovalStatusConfig

---
*Phase: 12-content-approval*
*Completed: 2026-01-24*
