---
phase: 64-telemetry-pipeline-offline-detection
plan: 03
subsystem: ui, database
tags: [react, supabase, telemetry, device-metrics, health-monitoring, screen-drawer]

# Dependency graph
requires:
  - phase: 64-telemetry-pipeline-offline-detection
    plan: 01
    provides: "device_metrics JSONB column and metrics_updated_at on tv_devices, collectDeviceMetrics in heartbeat"
provides:
  - "Device Health section in ScreenDetailDrawer with offline banner and metric cards"
  - "get_screen_diagnostics RPC now returns device_metrics and metrics_updated_at"
  - "getMetricStatus threshold evaluator for JS heap, storage, network metrics"
  - "formatMetricValue display formatter for memory, heap, storage, network"
  - "getJsHeapPercent computed heap percentage helper"
  - "MetricCard component with color-coded status borders"
  - "30-second auto-refresh polling for device diagnostics"
affects: [64-02-PLAN, alerts-dashboard, screen-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Color-coded border-l-4 metric cards with threshold tooltips", "Auto-refresh polling with useEffect interval cleanup", "Offline banner with grayed-out stale metrics for troubleshooting"]

key-files:
  created:
    - "supabase/migrations/151_diagnostics_metrics.sql"
  modified:
    - "src/services/screenDiagnosticsService.js"
    - "src/components/ScreenDetailDrawer.jsx"

key-decisions:
  - "Metric cards use border-l-4 color coding (green/yellow/red/gray) instead of gauges for compact display"
  - "30-second polling interval matches heartbeat cycle for fresh data on each refresh"
  - "Offline banner and grayed-out stale metrics follow locked user decisions from CONTEXT.md"

patterns-established:
  - "MetricCard: reusable card component with status-colored left border and hover tooltip"
  - "Threshold evaluation: numeric thresholds with inverted support (lower-is-worse for downlink)"

requirements-completed: [TELM-02]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 64 Plan 03: Device Health UI Summary

**Device Health section in ScreenDetailDrawer with offline banner, color-coded metric cards (memory, JS heap, storage, network), and 30-second auto-refresh polling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T21:50:32Z
- **Completed:** 2026-02-19T21:53:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended get_screen_diagnostics RPC to include device_metrics and metrics_updated_at in the screen response object
- Added metric threshold evaluator (getMetricStatus) supporting JS heap, storage, network with warning/critical levels
- Added metric value formatter (formatMetricValue) for memory, JS heap, storage, network display
- Added Device Health section to ScreenDetailDrawer between Overview and Content Source
- Offline banner with "Device Offline" text and relative last-seen time when device is offline
- Metric cards grayed out (opacity-60) when offline for stale-data troubleshooting visibility
- 30-second auto-refresh polling while drawer is open, matching heartbeat cycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend diagnostics RPC and add metric helpers** - `8c85940` (feat)
2. **Task 2: Add Device Health section to ScreenDetailDrawer** - `66b1a49` (feat)

## Files Created/Modified
- `supabase/migrations/151_diagnostics_metrics.sql` - Extended get_screen_diagnostics to return device_metrics and metrics_updated_at
- `src/services/screenDiagnosticsService.js` - Added getMetricStatus, formatMetricValue, getJsHeapPercent helpers
- `src/components/ScreenDetailDrawer.jsx` - Device Health section with MetricCard component, offline banner, auto-refresh

## Decisions Made
- Metric cards use border-l-4 color coding (green/yellow/red/gray) instead of gauges -- compact display fits the drawer's card pattern
- 30-second polling interval matches the heartbeat cycle so each refresh gets the latest data
- Offline banner and grayed-out stale metrics follow locked user decisions from CONTEXT.md
- MetricCard defined as local component in the file (not separate file) since it's specific to this drawer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Device metrics are now visible in the ScreenDetailDrawer when operators inspect a screen
- Metric thresholds provide at-a-glance health status (green/yellow/red)
- Offline detection is visually clear with prominent red banner
- Ready for Plan 02 (offline detection cron) to provide automated alerting as complement to this visual UI

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 64-telemetry-pipeline-offline-detection*
*Completed: 2026-02-19*
