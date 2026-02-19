---
phase: 56-widget-registry-clock-date
plan: 01
subsystem: ui
tags: [react, widget-registry, refactoring, scene-editor, layout-editor]

# Dependency graph
requires: []
provides:
  - "Centralized WIDGET_REGISTRY at src/widgets/registry.js with 10 entries (9 unique + 1 legacy alias)"
  - "getWidgetComponent, getWidgetDefaults, getWidgetTypes lookup functions"
  - "Widget type prop-reset on type change in both PropertiesPanel and LayoutPropertiesPanel (INFRA-02)"
  - "CountdownWidget barrel export fix"
affects: [57-qr-widget-enhancements, 58-weather-widget, 59-video-widget, 60-menu-board-widget, 61-widget-polish, 62-display-toolkit-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Widget Registry pattern: single source of truth for widget types at src/widgets/registry.js"
    - "Registry lookup: getWidgetComponent(type) replaces switch statements in renderers"
    - "Prop reset on type change: getWidgetDefaults(newType) prevents stale props"

key-files:
  created:
    - "src/widgets/registry.js"
  modified:
    - "src/player/components/widgets/index.js"
    - "src/player/components/SceneRenderer.jsx"
    - "src/components/scene-editor/EditorCanvas.jsx"
    - "src/components/scene-editor/LivePreviewWindow.jsx"
    - "src/components/scene-editor/PropertiesPanel.jsx"
    - "src/components/layout-editor/LayoutElementRenderer.jsx"
    - "src/components/layout-editor/LeftSidebar.jsx"
    - "src/components/layout-editor/LayoutPropertiesPanel.jsx"
    - "src/components/layout-editor/types.js"
    - "src/services/sceneDesignService.js"
    - "src/components/player/SocialFeedRenderer.jsx"

key-decisions:
  - "Keep widget components in src/player/components/widgets/ -- registry imports FROM them, avoiding mass file moves"
  - "EditorCanvas keeps inline mock previews (editor-specific) but derives icon/label from registry"
  - "LivePreviewWindow now uses actual widget components instead of duplicated inline implementations"
  - "LayoutElementRenderer removes 5 inline widget implementations in favor of registry lookup"

patterns-established:
  - "Widget Registry: to add a new widget type, add ONE entry to WIDGET_REGISTRY in src/widgets/registry.js"
  - "Prop Reset: handleTypeChange calls getWidgetDefaults(newType) to replace props entirely on type switch"

# Metrics
duration: 8min
completed: 2026-02-14
---

# Phase 56 Plan 01: Widget Registry Summary

**Centralized widget registry replacing 9 duplication sites with single-source-of-truth lookup, plus prop-reset fix for stale widget props on type change**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-14T03:49:45Z
- **Completed:** 2026-02-14T03:57:52Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Created `src/widgets/registry.js` with WIDGET_REGISTRY mapping 10 widget types to component, icon, label, and defaultProps
- Refactored all 9 duplication sites to consume registry instead of maintaining their own widget type switches/maps
- Fixed INFRA-02: widget type switching now resets props to new type's defaults (no stale props from previous type)
- Added missing CountdownWidget to barrel export
- Removed ~290 lines of duplicated widget code (inline ClockWidget, DateWidget, WeatherWidget, QRWidget, DataWidget implementations in LayoutElementRenderer; inline clock/date in LivePreviewWindow)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create widget registry and update barrel export** - `0844ad2` (feat)
2. **Task 2: Refactor all 9 duplication sites to consume registry** - `19018ce` (refactor)

## Files Created/Modified
- `src/widgets/registry.js` - Central widget registry with WIDGET_REGISTRY, getWidgetComponent, getWidgetDefaults, getWidgetTypes
- `src/player/components/widgets/index.js` - Added CountdownWidget export
- `src/player/components/SceneRenderer.jsx` - Replaced widget switch with registry lookup
- `src/components/scene-editor/EditorCanvas.jsx` - Replaced WIDGET_ICONS map with WIDGET_REGISTRY lookup
- `src/components/scene-editor/LivePreviewWindow.jsx` - Replaced inline clock/date + switch with registry
- `src/components/scene-editor/PropertiesPanel.jsx` - Uses getWidgetTypes, prop reset with getWidgetDefaults
- `src/components/layout-editor/LayoutElementRenderer.jsx` - Removed 5 inline widget implementations, uses registry
- `src/components/layout-editor/LeftSidebar.jsx` - Replaced WIDGET_ITEMS and getDefaultWidgetProps with registry
- `src/components/layout-editor/LayoutPropertiesPanel.jsx` - Uses getWidgetTypes, prop reset with getWidgetDefaults
- `src/components/layout-editor/types.js` - createWidgetElement uses getWidgetDefaults
- `src/services/sceneDesignService.js` - createWidgetBlock uses getWidgetDefaults
- `src/components/player/SocialFeedRenderer.jsx` - Fixed broken import (Rule 3)

## Decisions Made
- Kept widget components in `src/player/components/widgets/` rather than moving them to `src/widgets/components/` to minimize churn and preserve git history
- EditorCanvas retains its detailed inline mock previews (editor-specific static previews) but uses registry for icon/label fallback
- LivePreviewWindow now renders actual widget components instead of simplified inline clones, ensuring TV preview matches player rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed SocialFeedRenderer broken import exposed by registry**
- **Found during:** Task 2 (build verification)
- **Issue:** SocialFeedRenderer imported non-existent `loggingService` named export from loggingService.js. Pre-existing bug was hidden from tree-shaking but exposed when registry imported all widget components via barrel.
- **Fix:** Replaced `import { loggingService }` with `import { createScopedLogger }` and instantiated scoped logger
- **Files modified:** src/components/player/SocialFeedRenderer.jsx
- **Verification:** Build succeeds
- **Committed in:** 19018ce (part of Task 2 commit)

**2. [Rule 1 - Bug] Added missing X icon import in LeftSidebar**
- **Found during:** Task 2 (LeftSidebar refactoring)
- **Issue:** X icon from lucide-react was used in JSX but not imported (pre-existing)
- **Fix:** Added X to the lucide-react import statement
- **Files modified:** src/components/layout-editor/LeftSidebar.jsx
- **Committed in:** 19018ce (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for build correctness. No scope creep.

## Issues Encountered
- SceneRenderer.jsx was located at `src/player/components/SceneRenderer.jsx` not `src/components/scene-editor/SceneRenderer.jsx` as referenced in the plan -- file paths in the plan's frontmatter were slightly off but the plan's context references were sufficient to locate the actual files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Widget registry is the foundation for all subsequent widget phases (57-62)
- Adding a new widget type now requires only ONE entry in WIDGET_REGISTRY
- Plan 02 (Clock/Date widget enhancements) can proceed immediately
- All existing widgets render identically in all rendering paths

## Self-Check: PASSED

All 12 claimed files verified present. Both commit hashes (0844ad2, 19018ce) confirmed in git log.

---
*Phase: 56-widget-registry-clock-date*
*Completed: 2026-02-14*
