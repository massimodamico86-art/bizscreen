---
phase: 109-content-model
plan: 04
subsystem: player
tags: [react, hooks, audio, working-hours, player]

# Dependency graph
requires:
  - phase: 109-content-model
    provides: "flatten_playlist_items RPC (plan 01), workingHoursService (plan 03), background audio and working hours admin UI (plans 02-03)"
provides:
  - "BackgroundAudio component for persistent audio behind visual content"
  - "useWorkingHours hook with 60s interval check and state transition logging"
  - "useBackgroundAudio hook for Audio object lifecycle management"
  - "Working hours guard in ViewPage with emergency content override"
  - "Defensive guard in ZonePlayer for unflattened playlist items"
affects: [player, offline-playback, emergency-content]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Audio object management via useRef (not DOM element)"
    - "Working hours guard pattern: early-return black screen before content rendering"
    - "Emergency override pattern: isEmergency || isWithinWorkingHours"
    - "BackgroundAudio persisted across content modes via per-return-path mounting"

key-files:
  created:
    - "src/player/hooks/useWorkingHours.js"
    - "src/player/hooks/useBackgroundAudio.js"
    - "src/player/components/BackgroundAudio.jsx"
  modified:
    - "src/player/pages/ViewPage.jsx"
    - "src/player/components/ZonePlayer.jsx"
    - "src/player/hooks/index.js"
    - "src/player/components/index.js"

key-decisions:
  - "BackgroundAudio uses new Audio() object via useRef, not a DOM audio element"
  - "Working hours guard is an early-return with black div, BackgroundAudio stays mounted (paused)"
  - "Emergency content (source=emergency) overrides working hours on client side"
  - "ZonePlayer defensive guard skips unexpected playlist items with setTimeout advance"

patterns-established:
  - "Player hooks: useWorkingHours(config, timezone) returns boolean with 60s polling"
  - "Player audio: useBackgroundAudio manages Audio lifecycle, handles autoplay policy silently"
  - "Working hours guard: effectivelyActive = isEmergency || isWithinWorkingHours"

requirements-completed: [NEST-02, AUDIO-02, POWER-02, POWER-03]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 109 Plan 04: Player Integration Summary

**Working hours guard blanks screen outside schedule with emergency override, background audio plays continuously behind visual content transitions via Audio object hook**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T21:16:44Z
- **Completed:** 2026-03-03T21:20:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created useWorkingHours hook that checks working hours every 60 seconds with state transition logging
- Created useBackgroundAudio hook managing Audio object lifecycle with autoplay policy handling
- Created BackgroundAudio thin component wrapper for React lifecycle integration
- Wired working hours guard into ViewPage with emergency content override
- Added BackgroundAudio to all content rendering paths (scene, layout, playlist)
- Added defensive guard in ZonePlayer for unexpected unflattened playlist items

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BackgroundAudio component and useWorkingHours/useBackgroundAudio hooks** - `1cbed92` (feat)
2. **Task 2: Wire working hours guard and background audio into ViewPage and ZonePlayer** - `47bf442` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/player/hooks/useWorkingHours.js` - Hook checking working hours on 60s interval, returns boolean
- `src/player/hooks/useBackgroundAudio.js` - Hook managing Audio object lifecycle with play/pause/volume
- `src/player/components/BackgroundAudio.jsx` - Thin wrapper component, renders null
- `src/player/pages/ViewPage.jsx` - Working hours guard, emergency override, background audio integration
- `src/player/components/ZonePlayer.jsx` - Defensive guard for unflattened playlist items
- `src/player/hooks/index.js` - Added useWorkingHours and useBackgroundAudio exports
- `src/player/components/index.js` - Added BackgroundAudio export

## Decisions Made
- BackgroundAudio uses `new Audio()` via useRef rather than a DOM `<audio>` element for simpler lifecycle management
- Working hours blank screen is an early-return rendering a black div; BackgroundAudio stays mounted (with isPlaying=false) so it resumes instantly when hours resume
- Emergency content (source === 'emergency') overrides working hours on the client side as a redundant safety check (server RPC also handles this)
- ZonePlayer defensive guard for playlist-typed items uses setTimeout(advanceToNext, 100) to skip gracefully without crashing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 109 (Content Model) is now fully complete: all 4 plans executed
- Player correctly consumes nested playlist data (flattened by RPC), plays background audio, and enforces working hours
- Ready for next milestone phase

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 109-content-model*
*Completed: 2026-03-03*
