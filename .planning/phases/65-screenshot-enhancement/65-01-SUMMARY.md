---
phase: 65-screenshot-enhancement
plan: 01
subsystem: player
tags: [screenshot, heartbeat, html2canvas, periodic-capture, offline-recovery]

# Dependency graph
requires:
  - phase: 64-telemetry-pipeline-offline-detection
    provides: Device telemetry collection in usePlayerHeartbeat, heartbeat metrics pipeline
provides:
  - Periodic 5-minute auto-capture interval in player heartbeat
  - Offline recovery screenshot trigger (first successful heartbeat after failure)
  - Initial content load screenshot capture (lastScreenshotTimeRef starts at 0)
  - lastScreenshotTimeRef returned from hook for external consumers
affects: [65-02-screenshot-ui, device-diagnostics, screen-detail-drawer]

# Tech tracking
tech-stack:
  added: []
  patterns: [heartbeat-driven-screenshot-triggers, offline-recovery-detection-via-ref, concurrent-capture-guard]

key-files:
  created: []
  modified:
    - src/player/hooks/usePlayerHeartbeat.js

key-decisions:
  - "All screenshot timing within heartbeat sendBeat() cycle -- no separate setInterval"
  - "Recovery detection via wasOfflineRef set in catch block, cleared on successful heartbeat"
  - "Initial capture fires naturally because lastScreenshotTimeRef starts at 0"
  - "contentContainerRef existence check prevents capture before content mounts"

patterns-established:
  - "Heartbeat-driven triggers: all player-side periodic actions use sendBeat() timing rather than independent intervals"
  - "Ref-based state tracking: wasOfflineRef and lastScreenshotTimeRef for cross-heartbeat state without re-renders"

requirements-completed: [SCRN-01, SCRN-04]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 65 Plan 01: Player Heartbeat Screenshot Triggers Summary

**Periodic 5-minute auto-capture, offline recovery screenshot, and initial content load capture added to usePlayerHeartbeat via heartbeat-driven timing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T02:37:16Z
- **Completed:** 2026-02-20T02:39:02Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Player auto-captures a screenshot every 5 minutes while content is playing, using the existing captureAndUploadScreenshot() pipeline within the heartbeat cycle
- Player captures a recovery screenshot on the first successful heartbeat after a heartbeat failure (offline-to-online transition)
- Initial content load triggers a screenshot automatically because lastScreenshotTimeRef starts at 0, meaning the first heartbeat with mounted content exceeds the 5-minute threshold
- All captures are guarded by screenshotInProgressRef to prevent concurrent captures across all trigger types
- On-demand captures (server-driven needs_screenshot_update flag) reset the periodic timer to prevent duplicate captures

## Task Commits

Each task was committed atomically:

1. **Task 1: Add periodic 5-minute auto-capture interval** - `99270f0` (feat)
2. **Task 2: Add offline recovery and initial-load triggers** - `c58e193` (feat)

## Files Created/Modified
- `src/player/hooks/usePlayerHeartbeat.js` - Added SCREENSHOT_INTERVAL constant, lastScreenshotTimeRef, wasOfflineRef, recovery capture block, periodic capture block, and updated on-demand block to reset periodic timer

## Decisions Made
- All screenshot timing within heartbeat sendBeat() cycle rather than separate setInterval -- avoids race conditions and keeps all player timing centralized
- Recovery detection uses wasOfflineRef set in outer catch block rather than checking statusResult for specific fields -- simpler and catches any heartbeat failure (network, server, etc.)
- Initial capture fires naturally from lastScreenshotTimeRef starting at 0 rather than adding a separate "initial capture" timer -- one mechanism handles both periodic and initial cases
- contentContainerRef existence check prevents capture before content mounts -- avoids capturing blank/loading states

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Player-side screenshot triggers (periodic, recovery, initial) are complete and ready
- Plan 02 can now add the screenshot display section to ScreenDetailDrawer and on-demand capture button
- The lastScreenshotTimeRef is returned from the hook for any consumers that need to read the last capture time

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 65-screenshot-enhancement*
*Completed: 2026-02-19*
