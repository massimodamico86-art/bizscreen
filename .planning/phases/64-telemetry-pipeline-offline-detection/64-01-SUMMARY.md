---
phase: 64-telemetry-pipeline-offline-detection
plan: 01
subsystem: database, player
tags: [supabase, jsonb, telemetry, heartbeat, browser-apis, device-metrics]

# Dependency graph
requires:
  - phase: 17-device-lockdown-offline-mode
    provides: "update_device_status RPC, tv_devices columns (last_seen_at, is_online, player_version, cached_content_hash)"
  - phase: 19-device-screenshots
    provides: "Extended update_device_status with needs_screenshot_update return"
provides:
  - "device_metrics JSONB column on tv_devices storing latest telemetry snapshot"
  - "metrics_updated_at timestamp for freshness queries"
  - "Extended update_device_status RPC with p_metrics JSONB parameter"
  - "collectDeviceMetrics() browser metrics collection function"
  - "Player heartbeat now sends memory, storage, network metrics on every 30s cycle"
affects: [64-02-PLAN, 64-03-PLAN, device-diagnostics, offline-detection, alerts]

# Tech tracking
tech-stack:
  added: []
  patterns: ["JSONB metrics snapshot piggybacked on existing heartbeat RPC", "Individual try-catch per browser API for graceful degradation"]

key-files:
  created:
    - "supabase/migrations/149_telemetry_metrics.sql"
  modified:
    - "src/services/playerService.js"
    - "src/player/hooks/usePlayerHeartbeat.js"

key-decisions:
  - "Metrics collected in hook file (not playerService) because browser APIs are player-specific and unavailable in Node/server contexts"
  - "Each browser API call individually try-catch wrapped so partial metrics are sent even if some APIs unavailable"
  - "DROP old function signature before CREATE OR REPLACE to avoid 3-arg vs 4-arg overload conflict"

patterns-established:
  - "Telemetry piggybacking: attach JSONB payloads to existing RPC calls rather than creating new endpoints"
  - "Graceful browser API collection: try-catch each API independently, return partial results"

requirements-completed: [TELM-01]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 64 Plan 01: Heartbeat Telemetry Pipeline Summary

**Device telemetry metrics (memory, storage, network) collected from browser APIs on every 30s heartbeat cycle and stored as JSONB snapshot on tv_devices**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T21:45:48Z
- **Completed:** 2026-02-19T21:47:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Migration adding device_metrics JSONB column and metrics_updated_at timestamp to tv_devices
- Extended update_device_status RPC with backward-compatible p_metrics JSONB parameter
- collectDeviceMetrics function collecting memory, JS heap, storage, network, and online status from browser APIs
- Player heartbeat now collects and sends telemetry on every 30-second cycle with zero-failure guarantee

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration for device_metrics column and extended RPC** - `b634f1e` (feat)
2. **Task 2: Extend playerService and usePlayerHeartbeat to collect and send metrics** - `cba2464` (feat)

## Files Created/Modified
- `supabase/migrations/149_telemetry_metrics.sql` - Migration adding device_metrics JSONB column, metrics_updated_at, extended update_device_status RPC, and index
- `src/services/playerService.js` - Extended updateDeviceStatus to accept and forward metrics parameter
- `src/player/hooks/usePlayerHeartbeat.js` - Added collectDeviceMetrics function and integrated with sendBeat

## Decisions Made
- Metrics collected in the hook file (not playerService) because browser APIs (navigator.deviceMemory, performance.memory, navigator.storage, navigator.connection) are player-specific and unavailable in Node/server contexts
- Each browser API call individually try-catch wrapped so partial metrics are always sent even when some APIs are unsupported on certain browsers
- Used DROP FUNCTION before CREATE OR REPLACE to avoid PostgreSQL overload conflict when adding a parameter with a default value to an existing function

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- device_metrics column now receives telemetry data on every heartbeat -- ready for Plan 02 (diagnostics UI) to query and display
- metrics_updated_at enables freshness detection for Plan 03 (offline detection / alerting)
- No blockers for next plans

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 64-telemetry-pipeline-offline-detection*
*Completed: 2026-02-19*
