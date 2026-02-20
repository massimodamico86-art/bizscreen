---
phase: 67-content-verification
plan: 02
subsystem: player, ui
tags: [react, hooks, content-verification, mismatch-detection, force-sync, screen-drawer]

# Dependency graph
requires:
  - phase: 67-content-verification
    plan: 01
    provides: "contentVersionRef, onMismatchDetected callback, content_version_status column, get_screen_diagnostics with verification fields"
  - phase: 66-auto-recovery
    provides: "useAutoRecovery for crash recovery (kept separate from content mismatch)"
provides:
  - "useContentVerification hook for transition-aware content re-sync on mismatch"
  - "verifiedAdvanceToNext wrapper integrating sync check into playlist transitions"
  - "Mismatch warning card in ScreenDetailDrawer Device Health section"
  - "Force Sync button triggering needs_refresh + content_version_status='pending'"
  - "forceDeviceSync() helper in screenDiagnosticsService"
affects: [68-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Transition-aware content re-sync: mismatch queued by heartbeat, executed only between playlist items", "Ref-only hook state (no useState) to avoid player re-renders during verification"]

key-files:
  created:
    - "src/player/hooks/useContentVerification.js"
  modified:
    - "src/player/pages/ViewPage.jsx"
    - "src/player/hooks/index.js"
    - "src/components/ScreenDetailDrawer.jsx"
    - "src/services/screenDiagnosticsService.js"

key-decisions:
  - "verifiedAdvanceToNext wrapper in ViewPage integrates sync check at advanceToNext level so all transition paths (timer, video end, error) go through content verification"
  - "All verification state uses refs (pendingSyncRef, retryCountRef) not useState to avoid re-renders on mismatch detection"
  - "Auto-reset effect watches content identity (mode, source, playlist.id, layout.id) to clear pending sync when content reloads through any path"
  - "Force Sync sets both needs_refresh and content_version_status='pending' for immediate UI feedback and next-heartbeat reload"

patterns-established:
  - "Content mismatch is queued (not acted on immediately) to preserve VERI-04 play-then-verify principle"
  - "3-retry limit with graceful degradation to stale content on exhaustion"
  - "Mismatch and crash recovery are completely separate systems with no shared state"

requirements-completed: [VERI-03, VERI-04]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 67 Plan 02: Content Verification Sync and Dashboard Warning Summary

**Transition-aware content re-sync hook with 3-retry limit wired into ViewPage playlist transitions, plus yellow mismatch warning card with Force Sync button in ScreenDetailDrawer**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T19:20:02Z
- **Completed:** 2026-02-20T19:23:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- useContentVerification hook manages entire mismatch lifecycle: heartbeat signals mismatch, pending sync queued, executed only at natural playlist item transitions, retried up to 3 times before graceful degradation
- ViewPage integrates content verification through verifiedAdvanceToNext wrapper that intercepts every playlist transition (timer, video end, error advance) to check for pending content sync
- ScreenDetailDrawer shows yellow inline warning in Device Health section when content_version_status is 'mismatched', with Force Sync button that sets needs_refresh for immediate player reload
- Complete separation between content mismatch handling and Phase 66 crash recovery -- no shared counters or state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useContentVerification hook and wire into ViewPage transition point** - `558232b` (feat)
2. **Task 2: Add mismatch warning and Force Sync to ScreenDetailDrawer** - `9d9d16c` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/player/hooks/useContentVerification.js` - Content verification hook with onMismatchDetected, checkAndSync, and auto-reset effect
- `src/player/pages/ViewPage.jsx` - Imports useContentVerification, passes options to heartbeat hook, wraps advanceToNext with sync check
- `src/player/hooks/index.js` - Barrel export for useContentVerification
- `src/components/ScreenDetailDrawer.jsx` - Yellow mismatch warning card with Force Sync button in Device Health section
- `src/services/screenDiagnosticsService.js` - forceDeviceSync() function setting needs_refresh and content_version_status='pending'

## Decisions Made
- Used verifiedAdvanceToNext wrapper approach at ViewPage level (instead of modifying usePlayerPlayback) so all transition paths automatically go through content verification without touching the playback hook internals
- All verification state kept in refs (no useState) to prevent player re-renders when mismatch is detected or sync is attempted -- player UI should be completely unaffected by verification activity
- Auto-reset effect on content identity changes handles the case where content reloads through any path (polling, realtime push, manual publish) without explicit coordination between systems
- Force Sync button sets content_version_status to 'pending' (not just needs_refresh) so the yellow warning clears immediately in the UI without waiting for the next heartbeat cycle

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Content verification loop is complete: detection (Plan 01) + corrective action (Plan 02)
- content_version_status persists on the server for Phase 68 alert queries
- Partial index idx_tv_devices_content_mismatch (created in Plan 01) is ready for Phase 68 alert monitoring
- forceDeviceSync is available as an operator override for stuck mismatches

## Self-Check: PASSED

- FOUND: src/player/hooks/useContentVerification.js
- FOUND: src/player/pages/ViewPage.jsx
- FOUND: src/player/hooks/index.js
- FOUND: src/components/ScreenDetailDrawer.jsx
- FOUND: src/services/screenDiagnosticsService.js
- FOUND: commit 558232b (Task 1)
- FOUND: commit 9d9d16c (Task 2)
- FOUND: 67-02-SUMMARY.md

---
*Phase: 67-content-verification*
*Completed: 2026-02-20*
