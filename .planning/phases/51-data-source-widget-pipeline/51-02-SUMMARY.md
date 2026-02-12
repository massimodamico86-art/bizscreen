---
phase: 51-data-source-widget-pipeline
plan: 02
subsystem: ui
tags: [react, data-sources, preview-table, column-picker, tailwind]

# Dependency graph
requires:
  - phase: 51-data-source-widget-pipeline
    provides: DataSourcesPage with fields/rows editing and Google Sheets integration
provides:
  - DataPreviewTable component for scrollable admin-side data preview
  - ColumnPicker component for column visibility and reorder controls
  - Enhanced DataSourcesPage with data preview section and column picker toggle
affects: [51-03, scene-editor, layout-editor]

# Tech tracking
tech-stack:
  added: []
  patterns: [column-config-state-pattern, preview-table-with-sticky-headers]

key-files:
  created:
    - src/components/data-sources/DataPreviewTable.jsx
    - src/components/data-sources/ColumnPicker.jsx
  modified:
    - src/pages/DataSourcesPage.jsx

key-decisions:
  - "Column config (visibleColumns/columnOrder) stored as local component state on DataSourcesPage; per-widget overrides configured in plan 51-03"
  - "DataPreviewTable uses null for visibleColumns/columnOrder to mean 'show all in source order' for optimization"

patterns-established:
  - "Column config pattern: { visibleColumns: string[] | null, columnOrder: string[] | null } where null means 'all/default'"
  - "Preview table pattern: dark theme with sticky headers, alternating row colors, em-dash for missing values"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 51 Plan 02: Data Preview & Column Picker Summary

**Admin-side DataPreviewTable with sticky headers and ColumnPicker with visibility toggles and reorder controls, integrated into DataSourcesPage detail view**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T14:21:10Z
- **Completed:** 2026-02-12T14:24:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- DataPreviewTable renders scrollable table with sticky headers, alternating row colors, and row count
- ColumnPicker provides column visibility toggles, select all/deselect all, and up/down reorder controls
- DataSourcesPage shows preview table with column picker toggle in source detail view
- Column config resets when switching between data sources

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DataPreviewTable and ColumnPicker components** - `36c3f34` (feat)
2. **Task 2: Integrate preview table and column picker into DataSourcesPage** - `14f9700` (feat)

## Files Created/Modified
- `src/components/data-sources/DataPreviewTable.jsx` - Scrollable preview table with sticky headers, alternating rows, column filtering, and row count
- `src/components/data-sources/ColumnPicker.jsx` - Column visibility toggles with checkbox UI, select all/deselect all, and arrow-based reorder controls
- `src/pages/DataSourcesPage.jsx` - Enhanced with DataPreviewTable, ColumnPicker toggle, columnConfig state, Eye/EyeOff icons, and FormField import fix

## Decisions Made
- Column config (visibleColumns/columnOrder) stored as local component state since it is a preview-only concern on the admin page; per-widget overrides will be configured in plan 51-03
- Using null to represent "all visible" / "source order" as an optimization to avoid copying full arrays when no customization is needed
- Preview section only renders when both fields and rows exist, avoiding empty preview for blank data sources

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing FormField import**
- **Found during:** Task 2 (DataSourcesPage integration)
- **Issue:** FormField component was used in DataSourcesPage modals but never imported from the design system
- **Fix:** Added FormField to the design-system import block
- **Files modified:** src/pages/DataSourcesPage.jsx
- **Verification:** Lint passes, build succeeds
- **Committed in:** 14f9700 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor import fix for pre-existing issue. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DataPreviewTable and ColumnPicker are ready for reuse in the scene editor widget configuration (plan 51-03)
- Column config pattern (visibleColumns/columnOrder) established for consistent use across admin and widget contexts

---
*Phase: 51-data-source-widget-pipeline*
*Completed: 2026-02-12*
