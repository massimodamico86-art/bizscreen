---
phase: 109-content-model
plan: 01
subsystem: database
tags: [postgres, supabase, migration, recursive-cte, trigger, plpgsql, nested-playlists, background-audio, working-hours]

# Dependency graph
requires:
  - phase: 014 (media_playlists)
    provides: playlist_items table, playlists table, media_assets table
  - phase: 147 (portrait_mode)
    provides: get_resolved_player_content RPC, tv_devices.orientation
provides:
  - Extended playlist_items CHECK constraint allowing 'playlist' item_type
  - Circular reference prevention trigger (check_playlist_nesting) on playlist_items
  - check_playlist_nesting_valid RPC for service-layer pre-check
  - background_audio_id and background_audio_volume columns on playlists
  - working_hours JSONB column on tv_devices
  - flatten_playlist_items helper function for recursive playlist expansion
  - Updated get_resolved_player_content with working_hours, background audio, and nested flattening
affects: [109-02, 109-03, 109-04, player-content-resolution, playlist-editor, screen-settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [recursive-cte-tree-walk, trigger-based-constraint, helper-function-for-rpc]

key-files:
  created:
    - supabase/migrations/156_nested_playlists_audio_working_hours.sql
  modified: []

key-decisions:
  - "Two-phase recursive CTE in flatten_playlist_items: first build playlist tree, then join for leaf items (avoids cartesian product)"
  - "Separate ancestry walk (UP) and descendant walk (DOWN) in trigger for accurate total depth calculation"
  - "check_playlist_nesting_valid RPC mirrors trigger logic but returns boolean for fast service-layer pre-check"
  - "Background audio URL resolved from media_assets.url column directly (no file_url column on media_assets)"

patterns-established:
  - "Recursive CTE tree-walk pattern: first expand tree nodes, then join for leaf data"
  - "Dual RPC pattern: trigger for authoritative enforcement, boolean RPC for UX-friendly pre-check"

requirements-completed: [NEST-03, NEST-04, AUDIO-04]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 109 Plan 01: Content Model Schema Summary

**Database migration with circular reference prevention trigger, nested playlist flattening helper, background audio columns, working hours JSONB, and updated player content RPC returning all new fields**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-03T21:00:25Z
- **Completed:** 2026-03-03T21:04:14Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Single migration file (156) with 7 sections covering all three Phase 109 schema features
- Circular reference prevention trigger with self-reference fast path, multi-step cycle detection via ancestry walk, and depth limit of 5 levels
- flatten_playlist_items helper function using clean two-phase recursive CTE (build tree, then join for leaves)
- get_resolved_player_content updated: working_hours in all 7 device object return paths, backgroundAudioUrl/Volume in both playlist paths, nested items flattened via helper

## Task Commits

Each task was committed atomically:

1. **Task 1: Create schema migration for nested playlists, background audio, and working hours** - `b6e14a0` (feat)
2. **Task 2: Update get_resolved_player_content RPC** - `34c6e46` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `supabase/migrations/156_nested_playlists_audio_working_hours.sql` - Complete migration with 7 sections: CHECK constraint extension, circular reference trigger, background audio columns, working hours column, validation RPC, flatten helper, updated player content RPC (825 lines)

## Decisions Made
- **Two-phase recursive CTE:** The flatten_playlist_items helper first builds a tree of all playlist IDs at each depth level using a recursive CTE, then a single final SELECT joins to get all non-playlist (leaf) items. This avoids the cartesian product risk that comes from joining recursive results back to the source table.
- **Separate UP/DOWN walks in trigger:** The check_playlist_nesting trigger walks UP from the insertion point to find ancestors, then DOWN from the child playlist to find descendants. Total depth = ancestor depth + descendant depth. This is more accurate than a single-direction walk.
- **Boolean validation RPC:** check_playlist_nesting_valid mirrors the trigger logic exactly but returns false instead of raising exceptions, providing the service layer with a fast pre-check for UX feedback.
- **media_assets.url for audio:** Used the standard `url` column (not `file_url`) since media_assets has `url` as its file reference column per migration 014.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed flatten_playlist_items recursive CTE cartesian product**
- **Found during:** Task 2 (RPC update)
- **Issue:** The plan's suggested recursive CTE for flattening joined flat_items back to playlist_items by source_playlist_id, which would produce a cartesian product (each row at a level would re-expand all nested playlists at that level)
- **Fix:** Rewrote as a two-phase approach: recursive CTE builds a tree of playlist IDs at each depth, then a single final SELECT joins all leaf items from those playlists
- **Files modified:** supabase/migrations/156_nested_playlists_audio_working_hours.sql
- **Verification:** Logic review confirms no self-join on recursive results
- **Committed in:** 34c6e46 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed file_url column reference to url**
- **Found during:** Task 2 (RPC update)
- **Issue:** Initial implementation used `file_url` column from media_assets for background audio URL, but media_assets table uses `url` not `file_url`
- **Fix:** Changed to use `url` column directly per migration 014 schema
- **Files modified:** supabase/migrations/156_nested_playlists_audio_working_hours.sql
- **Verification:** Confirmed media_assets schema from migration 014 has `url TEXT NOT NULL`
- **Committed in:** 34c6e46 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation complete for all three Phase 109 features
- Subsequent plans can safely build service layers and UI on top of these schema changes
- The circular reference trigger is active and will protect against invalid nesting from any code path
- check_playlist_nesting_valid RPC is ready for service-layer integration (Plan 02)
- flatten_playlist_items is ready for any consumer that needs flattened playlist content

## Self-Check: PASSED

- FOUND: supabase/migrations/156_nested_playlists_audio_working_hours.sql
- FOUND: .planning/phases/109-content-model/109-01-SUMMARY.md
- FOUND: b6e14a0 (Task 1 commit)
- FOUND: 34c6e46 (Task 2 commit)

---
*Phase: 109-content-model*
*Completed: 2026-03-03*
