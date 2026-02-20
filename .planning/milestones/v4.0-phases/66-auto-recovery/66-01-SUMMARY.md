---
phase: 66-auto-recovery
plan: 01
subsystem: player
tags: [react-hooks, localStorage, auto-recovery, blank-detection, heartbeat-telemetry]

# Dependency graph
requires:
  - phase: 64-telemetry
    provides: "Heartbeat metrics pipeline (collectDeviceMetrics in usePlayerHeartbeat)"
  - phase: 65-screenshot-enhancement
    provides: "screenshotInProgressRef for recovery timing coordination"
provides:
  - "useAutoRecovery hook with localStorage crash counter and progressive recovery strategy"
  - "Blank screen detection in useStuckDetection with grace period and confirmation checks"
  - "Recovery state reporting (recovery_crash_count, recovery_phase, recovery_last_at) in heartbeat metrics"
affects: [66-02-PLAN, ViewPage-integration, RecoveryFallbackScreen]

# Tech tracking
tech-stack:
  added: []
  patterns: ["localStorage persistent crash counter", "progressive recovery escalation (soft -> hard -> cached -> exhausted)", "consecutive blank-screen confirmation checks"]

key-files:
  created:
    - "src/player/hooks/useAutoRecovery.js"
  modified:
    - "src/player/hooks/useStuckDetection.js"
    - "src/player/hooks/usePlayerHeartbeat.js"
    - "src/player/hooks/index.js"

key-decisions:
  - "mountTimeRef removed from useAutoRecovery since blank detection lives in useStuckDetection"
  - "Recovery metrics only included in heartbeat when crashCount > 0 to avoid polluting normal telemetry"
  - "Blank screen detection uses 10s grace + 3 consecutive checks (30s) to prevent false positives during normal rendering"

patterns-established:
  - "localStorage keys prefixed with player_ for recovery state persistence across page reloads"
  - "Progressive recovery: soft_reload (0-1), hard_reload (2-4), cached_fallback (5), exhausted (>=6)"
  - "Blank screen confirmation pattern: grace period + consecutive check threshold before triggering callback"

requirements-completed: [RECV-01, RECV-02, RECV-03]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 66 Plan 01: Auto-Recovery Core Infrastructure Summary

**useAutoRecovery hook with localStorage crash counter (max 6 attempts), progressive recovery escalation, blank screen detection in useStuckDetection, and recovery state in heartbeat telemetry**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T18:02:04Z
- **Completed:** 2026-02-20T18:05:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created useAutoRecovery hook with localStorage-persisted crash counter, progressive recovery strategy (soft_reload -> hard_reload -> cached_fallback -> exhausted), and automatic counter reset on successful content display
- Extended useStuckDetection with blank screen detection after 10s grace period requiring 3 consecutive blank checks (30s total) before firing onBlankScreen callback
- Added recovery_crash_count, recovery_phase, and recovery_last_at to heartbeat telemetry metrics (only when crashCount > 0)
- Exported useAutoRecovery from player hooks barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAutoRecovery hook and extend useStuckDetection** - `8736bbb` (feat)
2. **Task 2: Add recovery state reporting to heartbeat telemetry** - `65d5b47` (feat)

**Plan metadata:** (pending) (docs: complete plan)

## Files Created/Modified
- `src/player/hooks/useAutoRecovery.js` - Recovery orchestrator with localStorage crash counter and progressive recovery strategy
- `src/player/hooks/useStuckDetection.js` - Extended with blank screen detection (contentContainerRef, loading, onBlankScreen params)
- `src/player/hooks/usePlayerHeartbeat.js` - Recovery state piggybacked on heartbeat metrics
- `src/player/hooks/index.js` - Barrel export including useAutoRecovery

## Decisions Made
- Removed mountTimeRef from useAutoRecovery since blank screen detection lives in useStuckDetection (avoids duplicate timing logic)
- Recovery metrics only included in heartbeat when crashCount > 0 to avoid polluting normal telemetry with zero values
- Blank screen detection uses 10s grace period + 3 consecutive checks (30s total confirmed blankness) to prevent false positives during normal React rendering and content transitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused mountTimeRef from useAutoRecovery**
- **Found during:** Task 1 (commit attempt)
- **Issue:** ESLint caught `mountTimeRef` as assigned but never used -- blank screen detection was in useStuckDetection, not useAutoRecovery
- **Fix:** Removed `mountTimeRef` ref and unused `useRef` import
- **Files modified:** src/player/hooks/useAutoRecovery.js
- **Verification:** ESLint passes, build succeeds
- **Committed in:** 8736bbb (Task 1 commit, after fix)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial cleanup of unused variable. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useAutoRecovery hook is ready to be wired into ViewPage (Plan 02)
- useStuckDetection accepts contentContainerRef, loading, and onBlankScreen for ViewPage integration
- Heartbeat metrics include recovery state for server-side visibility
- RecoveryFallbackScreen component still needed (Plan 02)

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 66-auto-recovery*
*Completed: 2026-02-20*
