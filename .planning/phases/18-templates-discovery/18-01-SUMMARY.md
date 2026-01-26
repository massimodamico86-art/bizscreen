---
phase: 18-templates-discovery
plan: 01
subsystem: database, ui
tags: [supabase, rpc, favorites, history, react, lucide]

# Dependency graph
requires:
  - phase: 17-templates-core
    provides: TemplateCard, TemplateGrid, marketplace components
  - phase: 080_template_marketplace
    provides: template_library table, clone_template_to_scene RPC
provides:
  - marketplace_template_favorites table with RLS
  - marketplace_template_history table with RLS
  - toggle_marketplace_favorite RPC
  - get_marketplace_favorites RPC with full template data
  - get_recent_marketplace_templates RPC with deduplication
  - toggleMarketplaceFavorite service function
  - fetchMarketplaceFavorites service function
  - fetchRecentMarketplaceTemplates service function
  - recordMarketplaceUsage service function
  - checkFavoritedTemplates batch check function
  - TemplateCard with favorite heart icon
  - TemplateGrid with favoriteIds and onToggleFavorite props
affects: [18-02-favorites-sidebar, 18-templates-discovery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RPC-based toggle pattern (delete if exists, insert if not)
    - Deduplication via DISTINCT ON for recents
    - Heart icon favorite pattern (fill-red-500 when active)

key-files:
  created:
    - supabase/migrations/129_marketplace_favorites_history.sql
  modified:
    - src/services/marketplaceService.js
    - src/components/templates/TemplateGrid.jsx

key-decisions:
  - "Separate tables for marketplace (template_library) vs content_templates favorites"
  - "RPC-based toggle returns boolean for optimistic UI"
  - "recordMarketplaceUsage called non-blocking after installTemplateAsScene"
  - "Heart icon always visible (not hover-only) for better discoverability"

patterns-established:
  - "Heart icon: fill-red-500 text-red-500 when favorited, text-gray-400 when not"
  - "Favorite toggle: stops propagation to prevent card click"
  - "Batch favorite check: checkFavoritedTemplates returns Set for O(1) lookup"

# Metrics
duration: 5min
completed: 2026-01-26
---

# Phase 18 Plan 01: Favorites and History Summary

**Database tables and service layer for marketplace template favorites/history with heart icon UI**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-26T15:43:03Z
- **Completed:** 2026-01-26T15:47:49Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Database tables for favorites and history with proper RLS (users can only access their own data)
- Three RPCs for toggle, fetch favorites, and fetch recents (deduplicated)
- Service layer with 5 new functions for favorites/history operations
- installTemplateAsScene now automatically records usage for recents
- TemplateCard has heart icon that toggles between filled (red) and outline (gray)
- TemplateGrid passes favorite state to cards via Set for efficient lookup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create marketplace favorites and history database tables** - `4c01d6a` (feat)
2. **Task 2: Extend marketplaceService with favorites and history functions** - `5e2a538` (feat)
3. **Task 3: Add favorite heart icon to TemplateCard** - `83304e0` (feat)

_Note: Task 2 was merged into the 18-03 starter packs commit but includes all favorites/history functions_

## Files Created/Modified
- `supabase/migrations/129_marketplace_favorites_history.sql` - Tables, RLS policies, and RPCs for favorites/history
- `src/services/marketplaceService.js` - 5 new functions for favorites/history operations
- `src/components/templates/TemplateGrid.jsx` - Heart icon on TemplateCard, favoriteIds prop on TemplateGrid

## Decisions Made
- **Separate tables from content_templates:** marketplace_template_favorites references template_library (not content_templates) to keep marketplace and content systems separate
- **RPC toggle pattern:** toggle_marketplace_favorite deletes if exists, inserts if not - returns boolean for optimistic UI
- **Non-blocking usage recording:** recordMarketplaceUsage is called with .catch() to not block the scene creation flow
- **Heart always visible:** Icon is always visible (not hover-only) to make favoriting more discoverable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Database migration 105 (application_logs) has pre-existing error referencing non-existent 'tenants' table - unrelated to this plan
- ESLint reports false positives for unused imports (Heart, Layout, Loader2) despite them being used in JSX - project-wide ESLint config issue, not functional

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Favorites and history backend ready for sidebar integration in Plan 02
- TemplateGrid and TemplateCard props ready for favorites state management
- Service functions can be called from TemplateSidebar component

---
*Phase: 18-templates-discovery*
*Completed: 2026-01-26*
