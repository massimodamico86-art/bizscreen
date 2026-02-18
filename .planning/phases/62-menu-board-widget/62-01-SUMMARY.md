---
phase: 62-menu-board-widget
plan: 01
subsystem: database, api
tags: [supabase, postgres, rls, realtime, dnd-kit, menu, crud, intl]

# Dependency graph
requires:
  - phase: 56-widget-registry
    provides: Widget registry pattern for menu-board widget registration
  - phase: 51-dynamic-data-sources
    provides: CRUD/reorder/realtime service patterns in dataSourceService.js
provides:
  - menu_boards, menu_categories, menu_items database tables with RLS
  - menuBoardService.js with full CRUD, reorder, realtime, dietary tags, currency formatting
  - @dnd-kit/sortable dependency for drag-and-drop reordering
affects: [62-02-menu-board-editor, 62-03-menu-board-player]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/sortable ^10.0.0"]
  patterns: ["Dedicated domain tables with denormalized FK for Realtime filtering", "Single Realtime channel with dual table listeners"]

key-files:
  created:
    - supabase/migrations/148_menu_boards.sql
    - src/services/menuBoardService.js
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Reuse existing update_updated_at_column() trigger function from migration 040 instead of creating a new one"
  - "Grant SELECT to anon role for player-side read-only access to menu board tables"
  - "RLS policies use join-based EXISTS subqueries for categories/items (tenant check via menu_boards parent)"

patterns-established:
  - "Denormalized menu_board_id on menu_items for Realtime filter efficiency (avoids join through categories)"
  - "Single Supabase channel with multiple .on() calls for reduced connection overhead"

requirements-completed: [MENU-01, MENU-02, MENU-04, MENU-06, MENU-07, MENU-08, MENU-09]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 62 Plan 01: Menu Board Schema & Service Summary

**Dedicated menu_boards/categories/items schema with RLS, Realtime publication, and comprehensive menuBoardService.js providing CRUD, reorder, dietary tags, and Intl.NumberFormat currency formatting**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T21:08:01Z
- **Completed:** 2026-02-18T21:11:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Three database tables (menu_boards, menu_categories, menu_items) with proper foreign keys, RLS policies, 6 indexes, and Realtime publication
- Complete menuBoardService.js exporting 17 functions/constants: CRUD for all three entity types, reorder, realtime subscription, dietary tags, and currency formatting
- @dnd-kit/sortable installed as companion to existing @dnd-kit/core for Plan 02 drag-and-drop editor

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migration and install @dnd-kit/sortable** - `740f2b7` (feat)
2. **Task 2: Create menuBoardService.js with CRUD, reorder, realtime, and formatting** - `ddf847c` (feat)

## Files Created/Modified
- `supabase/migrations/148_menu_boards.sql` - Three tables, RLS policies, indexes, Realtime publication, triggers
- `src/services/menuBoardService.js` - Complete service layer with 15 async functions, DIETARY_TAGS constant, formatMenuPrice utility
- `package.json` - Added @dnd-kit/sortable ^10.0.0 dependency
- `package-lock.json` - Updated lockfile

## Decisions Made
- Reused existing `update_updated_at_column()` trigger function from migration 040 rather than creating a dedicated one -- the function is generic and works for any table with an `updated_at` column
- Added `GRANT SELECT ... TO anon` on all three menu tables so the player (which uses anon key) can read menu board data without authentication
- RLS policies for categories and items use EXISTS subqueries joining back to menu_boards for tenant verification, matching the plan's specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema and service layer complete, ready for Plan 02 (MenuBoardEditorModal with CRUD UI and drag-and-drop reordering)
- Plan 03 (MenuBoardWidget player component) can also proceed with the service layer in place
- All 17 exported functions match the expected API surface defined in the plan

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 62-menu-board-widget*
*Completed: 2026-02-18*
