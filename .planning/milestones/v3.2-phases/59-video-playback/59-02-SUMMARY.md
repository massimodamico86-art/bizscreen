---
phase: 59-video-playback
plan: 02
subsystem: ui
tags: [video, hls, hls.js, streaming, stall-detection, adaptive-bitrate, player]

# Dependency graph
requires:
  - phase: 59-video-playback-plan-01
    provides: video element type with basic <video> tags in LayoutElementRenderer and SceneRenderer
provides:
  - "VideoPlayer component with HLS adaptive streaming via hls.js light build"
  - "Automatic HLS error recovery (up to 3 fatal errors with startLoad/recoverMediaError)"
  - "Per-element stall detection (30s threshold, seek-and-play recovery)"
  - "Transparent MP4/HLS URL handling in layout preview and scene rendering"
affects: [player, layout-editor, scene-renderer]

# Tech tracking
tech-stack:
  added: [hls.js]
  patterns: [per-element stall detection mirroring useStuckDetection thresholds, Safari native HLS fallback]

key-files:
  created:
    - src/player/components/VideoPlayer.jsx
  modified:
    - package.json
    - src/components/layout-editor/LayoutElementRenderer.jsx
    - src/player/components/SceneRenderer.jsx
    - src/player/components/index.js

key-decisions:
  - "hls.js light build (hls.light.min.js) for smaller bundle size -- full build not needed for playback"
  - "Per-element stall detection inside VideoPlayer rather than extending useStuckDetection, because layouts contain multiple independent video zones each needing their own monitoring"
  - "eslint-disable for video.currentTime self-assign -- intentional seek-to-current-position triggers browser re-buffer for stall recovery"

patterns-established:
  - "VideoPlayer handles all video playback in player/preview mode -- single component for MP4 and HLS"
  - "HLS error recovery pattern: network errors -> startLoad(), media errors -> recoverMediaError(), other -> destroy()"

requirements-completed: [VIDEO-02, VIDEO-03, VIDEO-05]

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 59 Plan 02: Video Player Component Summary

**VideoPlayer with hls.js adaptive streaming, 3-retry HLS error recovery, and 30s stall detection wired into layout and scene rendering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T14:09:23Z
- **Completed:** 2026-02-18T14:13:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created VideoPlayer component that transparently handles MP4 and HLS (.m3u8) URLs
- HLS streams use hls.js light build on non-Safari browsers with Safari native fallback
- Fatal HLS errors auto-recover up to 3 times (network: startLoad, media: recoverMediaError)
- Per-element stall detection runs on 10s intervals, triggers seek-and-play recovery after 30s without progress
- Replaced basic `<video>` tags in both LayoutElementRenderer and SceneRenderer with VideoPlayer
- Added VideoPlayer to player components barrel export

## Task Commits

Each task was committed atomically:

1. **Task 1: Install hls.js and create VideoPlayer component** - `3d729e7` (feat)
2. **Task 2: Wire VideoPlayer into LayoutElementRenderer and SceneRenderer** - `89e8db6` (feat)

## Files Created/Modified
- `src/player/components/VideoPlayer.jsx` - Reusable video player with HLS streaming, error recovery, and stall detection
- `package.json` - Added hls.js dependency
- `src/components/layout-editor/LayoutElementRenderer.jsx` - Replaced basic `<video>` with VideoPlayer in preview mode
- `src/player/components/SceneRenderer.jsx` - Replaced basic `<video>` with VideoPlayer in video blocks
- `src/player/components/index.js` - Added VideoPlayer to barrel exports

## Decisions Made
- Used hls.js light build (`hls.js/dist/hls.light.min.js`) for smaller bundle -- full build features (subtitle parsing, EME DRM) not needed for digital signage playback
- Implemented stall detection inside VideoPlayer rather than extending the existing `useStuckDetection` hook, because layout/scene video elements are independent zones that each need their own monitoring; `useStuckDetection` monitors a single videoRef at the ViewPage level
- Added `eslint-disable-next-line no-self-assign` for `video.currentTime = video.currentTime` -- intentional browser re-buffer trigger for stall recovery

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added eslint-disable for intentional self-assign stall recovery**
- **Found during:** Task 1 (VideoPlayer creation)
- **Issue:** `video.currentTime = video.currentTime` is an intentional seek pattern to trigger browser re-buffer, but ESLint `no-self-assign` rule flags it as an error
- **Fix:** Added `eslint-disable-next-line no-self-assign` comment with explanation
- **Files modified:** src/player/components/VideoPlayer.jsx
- **Verification:** `npx eslint src/player/components/VideoPlayer.jsx` passes clean
- **Committed in:** 3d729e7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Lint compliance fix for an intentional pattern. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Video playback is production-grade with HLS streaming, error recovery, and stall detection
- Phase 59 (Video Playback) is complete -- both plans executed
- Ready for Phase 60

## Self-Check: PASSED

All 5 files verified present. Both task commits (3d729e7, 89e8db6) verified in git log.

---
*Phase: 59-video-playback*
*Completed: 2026-02-18*
