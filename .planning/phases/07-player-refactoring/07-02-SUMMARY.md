---
phase: 07-player-refactoring
plan: 02
subsystem: player
tags: [react-hooks, custom-hooks, refactoring, player, content-loading, heartbeat]

# Dependency graph
requires:
  - phase: 07-01
    provides: Widget extraction, PLR-01 jitter fix, foundation for Player.jsx decomposition
provides:
  - usePlayerContent hook for content state, loading, polling, and offline fallback
  - usePlayerHeartbeat hook for 30-second device status updates and screenshots
  - usePlayerCommands hook for reload, reboot, clear_cache, reset command handling
  - Barrel export at src/player/hooks/index.js
affects: [07-03-split-components, player-testing, offline-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [custom-hooks-extraction, ref-for-callback-stability, analytics-wrapper-pattern]

key-files:
  created:
    - src/player/hooks/usePlayerContent.js
    - src/player/hooks/usePlayerHeartbeat.js
    - src/player/hooks/usePlayerCommands.js
    - src/player/hooks/index.js
  modified:
    - src/Player.jsx

key-decisions:
  - "usePlayerContent returns loadContentRef for heartbeat/stuck-detection access without dependency cycles"
  - "handleAdvanceToNext wrapper in ViewPage for analytics.endPlaybackEvent() before advancing"
  - "advanceToNextRef pattern for stuck detection effect to access latest callback"
  - "Keep kiosk mode, stuck detection, and analytics tracking in ViewPage (UI-specific)"

patterns-established:
  - "Hook returns refs for cross-hook access: loadContentRef, lastActivityRef"
  - "Wrapper function pattern for adding cross-cutting concerns (analytics) to hook functions"
  - "Ref pattern for stable callback access in interval-based effects"

# Metrics
duration: 6min
completed: 2026-01-23
---

# Phase 7 Plan 02: Extract Custom Hooks Summary

**Extracted usePlayerContent, usePlayerHeartbeat, and usePlayerCommands hooks from ViewPage, reducing Player.jsx by 293 lines while preserving all 73 Player tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-23T17:37:04Z
- **Completed:** 2026-01-23T17:43:05Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created usePlayerContent hook (356 lines) managing content state, loading, polling, and offline fallback
- Created usePlayerHeartbeat hook (110 lines) for 30-second device status updates and screenshot capture
- Created usePlayerCommands hook (104 lines) for device command handling (reboot, reload, clear_cache, reset)
- Reduced Player.jsx from 3188 to 2895 lines (-293 lines)
- All 73 Player characterization tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract usePlayerContent hook** - `8bf0aee` (feat)
2. **Task 2: Extract usePlayerHeartbeat and usePlayerCommands hooks** - `293c991` (feat)
3. **Task 3: Update ViewPage to use extracted hooks** - `5553176` (refactor)

## Files Created/Modified
- `src/player/hooks/usePlayerContent.js` - Content loading, caching, polling, offline fallback, shuffle, advance
- `src/player/hooks/usePlayerHeartbeat.js` - 30-second heartbeat, screenshot capture, refresh status check
- `src/player/hooks/usePlayerCommands.js` - Command handling for reboot, reload, clear_cache, reset
- `src/player/hooks/index.js` - Barrel export for all hooks
- `src/Player.jsx` - Updated ViewPage to use extracted hooks

## Decisions Made
- **loadContentRef pattern:** Hook returns loadContentRef for heartbeat/stuck-detection to access loadContent without dependency cycles
- **handleAdvanceToNext wrapper:** Created wrapper in ViewPage for analytics.endPlaybackEvent() call before advancing (keeps analytics concern in ViewPage)
- **advanceToNextRef pattern:** Added ref for handleAdvanceToNext to be accessible in stuck detection interval effect with empty dependency array
- **Keep UI concerns in ViewPage:** Kiosk mode state, stuck detection, analytics tracking, and render logic stay in ViewPage as they're UI-specific

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial approach tried to use handleAdvanceToNext directly in stuck detection effect, but the empty dependency array captured stale closure. Fixed by adding advanceToNextRef pattern (same as loadContentRef pattern already in use).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Player.jsx now at 2895 lines (down from 3495 original, 600 lines removed total in Phase 7)
- Hooks provide clean separation of concerns for future testing
- Ready for 07-03: Split Player.jsx into focused components (SceneRenderer, LayoutRenderer, etc.)
- ViewPage still has ~1200 lines of render logic that could be further componentized

---
*Phase: 07-player-refactoring*
*Completed: 2026-01-23*
