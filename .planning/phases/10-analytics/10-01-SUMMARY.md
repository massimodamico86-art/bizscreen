---
phase: 10-analytics
plan: 01
subsystem: database
tags: [postgres, rpc, analytics, heatmap, aggregation]

# Dependency graph
requires:
  - phase: 01-testing-infrastructure
    provides: playback_events table and basic analytics RPCs
provides:
  - get_content_metrics RPC for single content item metrics
  - get_content_performance_list RPC for content ranking by view time
  - get_viewing_heatmap RPC for 7x24 viewing pattern grid
affects: [10-analytics (UI plans), contentAnalyticsService]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CTE-based aggregation for multi-content-type stats
    - generate_series for complete time grids
    - AT TIME ZONE for timezone-aware heatmap

key-files:
  created:
    - supabase/migrations/118_content_analytics_rpcs.sql
  modified: []

key-decisions:
  - "Use 30 seconds default for scenes (no explicit duration in schema)"
  - "Cap completion rate at 100% using LEAST() to handle over-viewing"
  - "Generate full 7x24 grid with zeros for empty cells (pitfall #2 from RESEARCH.md)"

patterns-established:
  - "Completion rate: (avg_actual / scheduled_duration) * 100, capped at 100"
  - "Content type polymorphism: filter by scene_id/media_id/playlist_id based on p_content_type"
  - "Heatmap grid: generate_series CROSS JOIN with LEFT JOIN to actual data"

# Metrics
duration: 1min
completed: 2026-01-24
---

# Phase 10 Plan 01: Content Analytics RPCs Summary

**Database RPC functions for content metrics, performance ranking, and viewing heatmap with completion rate calculation**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-24T14:16:20Z
- **Completed:** 2026-01-24T14:17:35Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Created get_content_metrics RPC for single content item analytics (avg duration, completion rate, total views)
- Created get_content_performance_list RPC returning content sorted by total view time with metrics
- Created get_viewing_heatmap RPC with full 7x24 grid using generate_series

## Task Commits

All three tasks committed together since they're in a single migration file:

1. **Task 1: Create get_content_metrics RPC** - `af79afc` (feat)
2. **Task 2: Create get_content_performance_list RPC** - `af79afc` (feat)
3. **Task 3: Create get_viewing_heatmap RPC** - `af79afc` (feat)

## Files Created/Modified
- `supabase/migrations/118_content_analytics_rpcs.sql` - Three RPC functions for content analytics

## Decisions Made

1. **Scene duration default (30s):** Scenes don't have an explicit duration column, so using 30 seconds as default. Can be overridden via settings->>'default_duration' JSONB field.

2. **Completion rate capping:** Used LEAST() to cap completion rate at 100% to handle cases where users view content longer than scheduled duration.

3. **Heatmap full grid:** Implemented pitfall #2 from RESEARCH.md - using generate_series(0, 6) CROSS JOIN generate_series(0, 23) to ensure all 168 cells are returned, even when no data exists.

4. **Timezone parameter:** Added p_timezone parameter to get_viewing_heatmap (default 'UTC') for proper local time display.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Database RPCs ready for service layer integration
- Service layer can now call:
  - `supabase.rpc('get_content_metrics', {...})`
  - `supabase.rpc('get_content_performance_list', {...})`
  - `supabase.rpc('get_viewing_heatmap', {...})`
- Next plans can build contentAnalyticsService extensions and dashboard UI

---
*Phase: 10-analytics*
*Completed: 2026-01-24*
