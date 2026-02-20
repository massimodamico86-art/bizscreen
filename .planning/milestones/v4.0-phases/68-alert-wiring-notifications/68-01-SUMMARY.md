---
phase: 68-alert-wiring-notifications
plan: 01
subsystem: database, api, notifications
tags: [postgres, alerts, notifications, recovery, email, resend, triggers]

# Dependency graph
requires:
  - phase: 64-telemetry-offline-detection
    provides: alert engine (raise/coalesce/resolve), offline detection cron, update_device_status RPC
  - phase: 66-auto-recovery
    provides: recovery_crash_count and recovery_phase in heartbeat metrics
  - phase: 67-content-verification
    provides: content version comparison in update_device_status (5-param signature)
provides:
  - device_recovery and device_recovery_exhausted alert types in SQL CHECK and JS ALERT_TYPES
  - SQL-level recovery detection in heartbeat RPC (update_device_status)
  - Auto-resolve for recovery alerts when device metrics show healthy state
  - Postgres trigger (trg_alert_auto_notify) for reliable in-app notification creation on all alert insertions
  - Email sending wired with critical-only severity gate
  - Unique constraint on notifications (user_id, alert_id, channel) for dedup
affects: [68-alert-wiring-notifications plan 02, notification-bell, alerts-center]

# Tech tracking
tech-stack:
  added: []
  patterns: [postgres-trigger-for-notifications, sql-level-alert-detection, critical-only-email-gate]

key-files:
  created:
    - supabase/migrations/154_recovery_alert_types.sql
  modified:
    - src/services/alertEngineService.js
    - src/services/notificationDispatcherService.js

key-decisions:
  - "Recovery alerts detected at SQL level in update_device_status because player may be in recovery loop doing reloads"
  - "Auto-resolve checks for ABSENCE of recovery metrics (not zero value) per Phase 66 decision"
  - "Postgres trigger handles ALL in-app notifications (SQL and JS raised alerts) for reliability"
  - "Email restricted to critical severity only (ALRT-05): device_offline escalated and device_recovery_exhausted"
  - "Unique constraint on notifications prevents duplicates when both trigger and JS dispatch create notifications"

patterns-established:
  - "Postgres AFTER INSERT trigger on alerts for reliable in-app notification dispatch regardless of alert origin"
  - "Critical-only email gate pattern: severity check before email send, skip with debug log for non-critical"
  - "Graceful unique constraint handling: error code 23505 treated as success (trigger already handled it)"

requirements-completed: [ALRT-03, ALRT-04, ALRT-05]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 68 Plan 01: Alert Wiring & Notifications Summary

**Recovery alert detection in heartbeat RPC with SQL trigger for reliable in-app notifications and critical-only email sending via Resend**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T20:24:49Z
- **Completed:** 2026-02-20T20:28:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Recovery alert types (device_recovery, device_recovery_exhausted) added to SQL CHECK constraint and JS ALERT_TYPES
- Heartbeat RPC extended to detect recovery_crash_count in metrics and raise/resolve recovery alerts at SQL level
- Postgres trigger (trg_alert_auto_notify) ensures ALL alerts generate in-app notifications regardless of origin
- Email sending wired into queueEmailNotification with critical-only severity gate per ALRT-05
- Unique constraint prevents duplicate notifications when both trigger and JS dispatch create entries

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 154 for recovery alert types, heartbeat detection, and notification trigger** - `bdd18df` (feat)
2. **Task 2: Update JS services - alert types, escalation rules, email wiring** - `7faecc8` (feat)

## Files Created/Modified
- `supabase/migrations/154_recovery_alert_types.sql` - Migration with CHECK expansion, recovery detection in update_device_status, notification trigger, unique constraint
- `src/services/alertEngineService.js` - Added DEVICE_RECOVERY and DEVICE_RECOVERY_EXHAUSTED types, raiseRecoveryAlert helper, escalation rules
- `src/services/notificationDispatcherService.js` - Wired sendEmailNotification with critical-only gate, graceful 23505 handling in createInAppNotification

## Decisions Made
- Recovery alerts detected at SQL level in update_device_status because player may be in a recovery loop doing hard reloads and cannot reliably make separate RPC calls
- Auto-resolve checks for ABSENCE of recovery metrics (not zero value) matching Phase 66 decision "Recovery metrics only in heartbeat when crashCount > 0"
- Postgres trigger handles ALL in-app notifications to ensure alerts raised from any path (SQL heartbeat, SQL cron, JS alertEngineService) generate notifications
- Email restricted to critical severity only per ALRT-05 requirement -- only device_offline (after escalation) and device_recovery_exhausted trigger email
- Unique constraint on notifications (user_id, alert_id, channel) prevents duplicates; JS code handles 23505 gracefully as success

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Email sending requires VITE_RESEND_API_KEY (already configured from prior phases).

## Next Phase Readiness
- Recovery alert types are registered in both SQL and JS layers, ready for UI display
- Plan 02 can add recovery type icons/labels to NotificationBell and AlertsCenterPage
- The Postgres trigger handles in-app notification creation, so Plan 02 UI work only needs to handle display rendering

---
*Phase: 68-alert-wiring-notifications*
*Completed: 2026-02-20*
