---
phase: 20-multi-language-core
plan: 01
subsystem: database, api
tags: [multi-language, i18n, postgres, rpc, scenes, devices]

# Dependency graph
requires:
  - phase: 13-technical-foundation
    provides: Player.jsx refactoring enabling scene-based content
  - phase: 17-templates-core
    provides: Scene creation patterns
provides:
  - scene_language_groups table with RLS
  - language_group_id and language_code columns on scenes
  - display_language column on tv_devices
  - get_scene_for_device_language RPC with fallback logic
  - languageService.js with variant CRUD operations
  - copySlides helper for content duplication
affects: [20-02 (variant UI), 20-03 (language switcher), 20-04 (device settings)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Linked variants via group ID (separate scenes, not embedded translations)
    - Server-side language resolution via RPC (consistent fallback)
    - SECURITY DEFINER for tenant context in RPC

key-files:
  created:
    - supabase/migrations/132_multi_language_scenes.sql
    - src/services/languageService.js
  modified:
    - src/services/sceneDesignService.js

key-decisions:
  - "Use separate scenes linked by group ID (not JSONB embedded)"
  - "Copy original content to new variant (not blank scene)"
  - "Server-side RPC for language resolution ensures consistent fallback"
  - "ON DELETE SET NULL for language_group_id (orphan scenes, don't cascade delete)"

patterns-established:
  - "Language groups link related scene variants"
  - "RPC returns original scene as ultimate fallback (never NULL for valid input)"
  - "needs_refresh=true triggers device content update on language change"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 20 Plan 01: Language Schema Foundation Summary

**Database schema and service layer for multi-language scene variants with RPC-based device language resolution**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T19:55:53Z
- **Completed:** 2026-01-26T20:00:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created scene_language_groups table with full RLS policies
- Added language_group_id and language_code columns to scenes with validation
- Added display_language column to tv_devices with 'en' default
- Implemented get_scene_for_device_language RPC with 3-level fallback (exact match -> default language -> original scene)
- Created languageService.js with complete variant CRUD operations
- Added copySlides helper to support content duplication for variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Create multi-language database migration** - `72253a4` (feat)
2. **Task 2: Create languageService.js** - `22189e3` (feat)
3. **Task 3: Add copySlides helper to sceneDesignService** - `b827b78` (feat)

## Files Created/Modified

- `supabase/migrations/132_multi_language_scenes.sql` - Database migration for language support
- `src/services/languageService.js` - Language variant CRUD operations and helpers
- `src/services/sceneDesignService.js` - Added copySlides function for variant content

## Decisions Made

1. **Linked variants via group ID:** Separate scene records connected by language_group_id rather than embedded JSONB. This enables independent editing, proper RLS per scene, and scales better.

2. **Copy original content to variants:** Per CONTEXT.md, new variants start with the original's slides copied, not blank. Users expect to translate existing content.

3. **Server-side RPC for resolution:** Language resolution happens in PostgreSQL via get_scene_for_device_language RPC. This ensures consistent fallback logic regardless of client.

4. **ON DELETE SET NULL for groups:** If a language group is deleted, scenes become standalone (language_group_id = NULL) rather than cascade deleting all variants.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - migration applied cleanly, all tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema foundation complete and tested
- languageService ready for UI integration in 20-02
- copySlides helper enables variant creation with content
- RPC fallback logic verified with unit tests

**Ready for 20-02-PLAN.md** (Variant Creation UI)

---
*Phase: 20-multi-language-core*
*Completed: 2026-01-26*
