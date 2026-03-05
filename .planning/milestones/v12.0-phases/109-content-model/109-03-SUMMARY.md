---
phase: 109-content-model
plan: 03
subsystem: ui
tags: [react, playlist-editor, screen-settings, background-audio, working-hours, supabase, service-layer]

# Dependency graph
requires:
  - phase: 109-01
    provides: background_audio_id/volume columns on playlists, working_hours JSONB on tv_devices
provides:
  - workingHoursService with validation, time-check, and display utilities
  - Background audio picker and volume control in playlist editor settings
  - WorkingHoursEditor component with per-day on/off time schedule
  - EditScreenModal integration with working hours section
  - Service-layer allowedFields updates for background_audio and working_hours
affects: [109-04, player-content-resolution, playlist-editor, screen-settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [debounced-volume-persistence, select-on-focus-lazy-load, inline-validation]

key-files:
  created:
    - src/services/workingHoursService.js
    - src/components/screens/WorkingHoursEditor.jsx
  modified:
    - src/services/playlistService.js
    - src/services/screenService.js
    - src/pages/hooks/usePlaylistEditor.js
    - src/pages/PlaylistEditorPage.jsx
    - src/pages/components/ScreensComponents.jsx
    - src/pages/hooks/useScreensData.js

key-decisions:
  - "Audio picker uses <select> dropdown lazy-loaded on focus (fetchAudioAssets on focus) to avoid upfront load"
  - "Volume changes debounced at 500ms to avoid excessive DB writes during slider drag"
  - "WorkingHoursEditor uses null for 'always on' (no JSONB), DEFAULT_WORKING_HOURS on first enable"
  - "isWithinWorkingHours fails open (returns true) on error to prevent screens from going dark due to bugs"

patterns-established:
  - "Debounced slider persistence: local state update immediately, debounce DB write with useRef timer"
  - "Working hours null-means-always-on pattern for backward compatibility"

requirements-completed: [AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, POWER-01]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 109 Plan 03: Background Audio & Working Hours UI Summary

**Background audio picker with volume slider in playlist editor settings, and per-day working hours editor in EditScreenModal with validation and fail-open time checks**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T21:07:41Z
- **Completed:** 2026-03-03T21:13:26Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- New workingHoursService with DEFAULT_WORKING_HOURS template, validateWorkingHours (shape + time order), isWithinWorkingHours (timezone-aware with fail-open), and formatWorkingHoursForDisplay (human summary)
- Background audio section in playlist editor settings dropdown: audio track picker (select lazy-loaded on focus), remove button, and 0-100 volume slider with debounced persistence
- WorkingHoursEditor component with enable/disable toggle, 7-day schedule grid with per-day on/off switches and time inputs, "Apply Monday hours to Tue-Fri" quick action, and inline validation errors
- Full data flow wired: EditScreenModal -> useScreensData -> screenService for working_hours; PlaylistEditorPage -> usePlaylistEditor -> playlistService for background_audio

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workingHoursService and add background audio to playlistService** - `9ef61d5` (feat)
2. **Task 2: Add background audio picker and volume control to playlist editor** - `87fa8e5` (feat)
3. **Task 3: Create WorkingHoursEditor component and wire into EditScreenModal** - `a3551bd` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/services/workingHoursService.js` - New service with DEFAULT_WORKING_HOURS, validateWorkingHours, isWithinWorkingHours, formatWorkingHoursForDisplay
- `src/services/playlistService.js` - Added background_audio_id and background_audio_volume to updatePlaylist allowedFields
- `src/services/screenService.js` - Added working_hours to updateScreen allowedFields
- `src/pages/hooks/usePlaylistEditor.js` - Added background audio state (id, volume, asset, audioAssets), fetch/set/remove/volume handlers, asset loading on playlist fetch
- `src/pages/PlaylistEditorPage.jsx` - Added Background Audio section in settings dropdown with picker, remove button, volume slider
- `src/components/screens/WorkingHoursEditor.jsx` - New component with enable toggle, 7-day schedule grid, time inputs, apply-weekday shortcut, inline validation
- `src/pages/components/ScreensComponents.jsx` - Added WorkingHoursEditor to EditScreenModal after orientation field, included workingHours in submit data
- `src/pages/hooks/useScreensData.js` - Pass working_hours through handleUpdateScreen to screenService

## Decisions Made
- **Audio picker uses lazy-loaded select:** Rather than a modal, audio track selection uses a `<select>` dropdown that calls `fetchAudioAssets` on focus. This is lightweight and avoids adding another modal to the already complex playlist editor.
- **Debounced volume writes:** Volume slider updates local state immediately but debounces the database write at 500ms to prevent excessive writes during slider drag.
- **Working hours null = always on:** `null` working_hours means the screen is always on (backward compatible with all existing screens). Enabling working hours initializes with DEFAULT_WORKING_HOURS (Mon-Fri 8-6).
- **Fail-open on error:** `isWithinWorkingHours` returns `true` on any error (bad timezone, missing schedule) to prevent screens from going dark due to bugs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- workingHoursService.isWithinWorkingHours is ready for Plan 04's player-side integration
- Background audio fields (id, volume) are persisted and ready for player-side audio playback in Plan 04
- All admin-side UX for AUDIO-01/03 and POWER-01 is complete

## Self-Check: PASSED

- FOUND: src/services/workingHoursService.js
- FOUND: src/components/screens/WorkingHoursEditor.jsx
- FOUND: src/services/playlistService.js
- FOUND: src/services/screenService.js
- FOUND: src/pages/hooks/usePlaylistEditor.js
- FOUND: src/pages/PlaylistEditorPage.jsx
- FOUND: src/pages/components/ScreensComponents.jsx
- FOUND: src/pages/hooks/useScreensData.js
- FOUND: .planning/phases/109-content-model/109-03-SUMMARY.md
- FOUND: 9ef61d5 (Task 1 commit)
- FOUND: 87fa8e5 (Task 2 commit)
- FOUND: a3551bd (Task 3 commit)

---
*Phase: 109-content-model*
*Completed: 2026-03-03*
