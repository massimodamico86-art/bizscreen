---
phase: 07-player-refactoring
plan: 01
subsystem: player
tags: [react, widgets, retry-backoff, jitter, component-extraction]

# Dependency graph
requires:
  - phase: 06-player-reliability
    provides: calculateBackoff with full jitter (0-100%)
provides:
  - Extracted widget components (Clock, Date, Weather, QRCode)
  - PLR-01 gap fix: retry logic consolidated to calculateBackoff
  - Foundation for Player.jsx decomposition
affects: [07-02, 07-03, player-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Widget component extraction pattern (props = {} for defaults)
    - Self-contained widgets with internal state management

key-files:
  created:
    - src/player/components/widgets/ClockWidget.jsx
    - src/player/components/widgets/DateWidget.jsx
    - src/player/components/widgets/WeatherWidget.jsx
    - src/player/components/widgets/QRCodeWidget.jsx
    - src/player/components/widgets/index.js
  modified:
    - src/Player.jsx

key-decisions:
  - "Widget components are self-contained with internal timers"
  - "WeatherWidget fetches its own data (not passed from parent)"
  - "Props pattern: { props = {} } for safe default handling"

patterns-established:
  - "Widget extraction: Each widget manages its own state and side effects"
  - "Barrel exports: index.js for clean imports"

# Metrics
duration: 5min
completed: 2026-01-23
---

# Phase 7 Plan 1: Extract Widgets + Fix PLR-01 Summary

**Extracted 4 widget components from Player.jsx and consolidated retry logic to use calculateBackoff with 0-100% full jitter**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-23T17:29:28Z
- **Completed:** 2026-01-23T17:35:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extracted ClockWidget, DateWidget, WeatherWidget, QRCodeWidget from SceneWidgetRenderer
- Fixed PLR-01 gap: Removed getRetryDelay (0-25% jitter), now uses calculateBackoff (0-100% full jitter)
- Reduced Player.jsx by 307 lines (3495 -> 3188)
- Created foundation for future Player.jsx decomposition

## Task Commits

Each task was committed atomically:

1. **Task 1: Create widget directory and extract widget components** - `47fcba4` (feat)
2. **Task 2: Fix PLR-01 gap and update Player.jsx to use extracted widgets** - `2c177a5` (fix)

## Files Created/Modified

- `src/player/components/widgets/ClockWidget.jsx` - Clock widget with 1-second updates, size presets
- `src/player/components/widgets/DateWidget.jsx` - Date widget with configurable formatting
- `src/player/components/widgets/WeatherWidget.jsx` - Weather widget with minimal/card styles, 10-minute refresh
- `src/player/components/widgets/QRCodeWidget.jsx` - QR code generation with placeholder fallback
- `src/player/components/widgets/index.js` - Barrel export for all widgets
- `src/Player.jsx` - Updated to use extracted widgets, removed getRetryDelay

## Decisions Made

- **Widget data fetching in widget:** WeatherWidget fetches its own data rather than receiving it from parent. This makes widgets truly self-contained and reusable.
- **Props pattern:** Using `{ props = {} }` in component signature for safe default handling.
- **Barrel export:** Using index.js for clean imports from single entry point.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failures in offlineService.test.js and playbackTrackingService.test.js (unrelated to this plan's changes)
- All 60 Player tests pass successfully

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Widget extraction complete, ready for further Player.jsx decomposition
- calculateBackoff now used consistently across all retry logic
- SceneWidgetRenderer simplified to ~30 lines (was ~330 lines)

---
*Phase: 07-player-refactoring*
*Plan: 01*
*Completed: 2026-01-23*
