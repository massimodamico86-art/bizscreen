---
phase: 64-telemetry-pipeline-offline-detection
plan: 02
subsystem: database
tags: [supabase, pg_cron, offline-detection, alerts, cron, device-monitoring, severity-escalation]

# Dependency graph
requires:
  - phase: 64-telemetry-pipeline-offline-detection
    plan: 01
    provides: "update_device_status RPC with p_metrics parameter, tv_devices.last_seen/is_online columns"
  - phase: 19-alerts-notifications
    provides: "alerts table with idx_alerts_coalesce unique index, raise_alert/auto_resolve_alert functions"
provides:
  - "evaluate_and_alert_offline_devices() SQL function for automated offline detection"
  - "pg_cron schedule running every 2 minutes with 5-minute offline threshold"
  - "Dual-path alert resolution: instant on heartbeat + periodic cron sweep"
  - "Severity escalation: info (<15 min), warning (15-59 min), critical (>=60 min)"
  - "Alert coalescing via ON CONFLICT on idx_alerts_coalesce"
affects: [64-03-PLAN, 68-notification-delivery, alerts-center-ui]

# Tech tracking
tech-stack:
  added: [pg_cron]
  patterns: ["SECURITY DEFINER cron function with no auth.uid() for scheduled execution", "ON CONFLICT upsert for alert coalescing/deduplication", "Dual-path resolution: instant heartbeat + periodic sweep"]

key-files:
  created:
    - "supabase/migrations/150_offline_detection_cron.sql"
  modified: []

key-decisions:
  - "Dual-path alert resolution ensures alerts resolve both instantly on heartbeat and via periodic sweep for edge cases"
  - "ON CONFLICT ON CONSTRAINT idx_alerts_coalesce used for dedup instead of SELECT-then-INSERT to avoid race conditions"
  - "Severity escalation at SQL level (not JS) so cron job handles escalation autonomously"

patterns-established:
  - "pg_cron scheduled function: SECURITY DEFINER, SET search_path = public, no auth.uid(), RETURNS JSONB summary"
  - "Alert upsert pattern: INSERT ON CONFLICT with severity escalation via CASE expression"

requirements-completed: [ALRT-01, ALRT-02]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 64 Plan 02: Offline Detection Cron Summary

**Automated offline detection via pg_cron every 2 minutes with severity-escalated device_offline alerts and dual-path resolution (instant heartbeat + periodic sweep)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T21:50:29Z
- **Completed:** 2026-02-19T21:52:01Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- evaluate_and_alert_offline_devices SQL function that detects stale devices, marks them offline, and raises/coalesces alerts with severity escalation
- Alert deduplication via ON CONFLICT on idx_alerts_coalesce unique partial index -- no duplicate alerts for the same device
- Auto-resolve logic in both the cron sweep and the update_device_status heartbeat RPC for dual-path resolution
- pg_cron job scheduled every 2 minutes with 5-minute offline threshold (worst-case detection: ~7 min)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create offline detection cron migration** - `a1794da` (feat)

## Files Created/Modified
- `supabase/migrations/150_offline_detection_cron.sql` - Migration with pg_cron extension, evaluate_and_alert_offline_devices function, extended update_device_status with auto-resolve, and cron schedule

## Decisions Made
- Dual-path alert resolution: heartbeat RPC resolves instantly on resume, cron sweep catches any missed recoveries as fallback
- Used ON CONFLICT ON CONSTRAINT idx_alerts_coalesce for alert coalescing instead of SELECT-then-INSERT to eliminate race conditions between concurrent cron runs
- Severity escalation computed at SQL level (info < 15 min, warning 15-59 min, critical >= 60 min) so cron job handles escalation autonomously without JS involvement
- Alert meta includes device_name, minutes_offline, last_heartbeat, detected_at for Phase 68 notification consumption

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - pg_cron is a Supabase-native extension. No external service configuration required.

## Next Phase Readiness
- Offline detection and alerting fully automated -- ready for Plan 03 (diagnostics dashboard UI) to display device health
- Alert meta carries full context for Phase 68 notification delivery (device name, duration, last heartbeat)
- Blocker to verify: pg_cron availability on current Supabase plan (already noted in STATE.md)

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 64-telemetry-pipeline-offline-detection*
*Completed: 2026-02-19*
