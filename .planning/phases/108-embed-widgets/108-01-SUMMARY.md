---
phase: 108-embed-widgets
plan: 01
subsystem: player
tags: [iframe, youtube, vimeo, google-slides, embed, widget, offline-fallback, lucide-react]

# Dependency graph
requires: []
provides:
  - "embedUtils.js: URL parsing, validation, and embed URL construction for YouTube, Vimeo, Web Page, Google Slides"
  - "4 player widget components: YouTubeWidget, VimeoWidget, WebPageWidget, GoogleSlidesWidget"
  - "EmbedOfflineFallback: shared offline fallback with cached thumbnail + Requires Internet badge"
  - "Widget registry entries for youtube, vimeo, webpage, google-slides"
affects: [108-02-PLAN, layout-editor, scene-editor]

# Tech tracking
tech-stack:
  added: []
  patterns: [iframe-embed-widget, offline-thumbnail-cache-resolution, embed-url-builder]

key-files:
  created:
    - src/services/embedUtils.js
    - src/player/components/widgets/EmbedOfflineFallback.jsx
    - src/player/components/widgets/YouTubeWidget.jsx
    - src/player/components/widgets/VimeoWidget.jsx
    - src/player/components/widgets/WebPageWidget.jsx
    - src/player/components/widgets/GoogleSlidesWidget.jsx
    - tests/unit/services/embedUtils.test.js
  modified:
    - src/player/components/widgets/index.js
    - src/widgets/registry.js

key-decisions:
  - "Used hqdefault (not maxresdefault) for YouTube thumbnails -- always available without API key"
  - "Vimeo uses 'muted' param (not 'mute') -- different from YouTube API"
  - "YouTube loop requires playlist=videoId param for single-video loop"
  - "WebPageWidget uses sandbox attribute for security; YouTube/Vimeo/Slides do not (would break embeds)"
  - "All 4 widgets resolve cached thumbnails via getCachedMediaUrl with type-prefixed keys"

patterns-established:
  - "Embed widget pattern: online/offline state + getCachedMediaUrl for thumbnail + iframe with crossfade"
  - "Embed URL builder pattern: pure functions in embedUtils.js, no state, no React"
  - "Offline fallback pattern: EmbedOfflineFallback component with WifiOff badge"

requirements-completed: [EMBED-01, EMBED-02, EMBED-03, EMBED-04, EMBED-05, EMBED-06, EMBED-07, SLIDES-01, SLIDES-02, SLIDES-03]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 108 Plan 01: Embed Widgets Core Summary

**4 embed player widgets (YouTube, Vimeo, Web Page, Google Slides) with URL parsing utilities, iframe rendering, and offline fallback via cached thumbnails**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T17:27:46Z
- **Completed:** 2026-03-03T17:33:08Z
- **Tasks:** 2
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments
- Created embedUtils.js with 10 pure functions covering URL extraction for YouTube (5 formats), Vimeo (2 formats), Google Slides (3 formats), plus embed URL builders, thumbnail helpers, and validation
- Built 4 player widget components following established WeatherWidget pattern with iframe embed, online/offline detection, cached thumbnail resolution via getCachedMediaUrl, and crossfade loading
- Registered all 4 new widget types in WIDGET_REGISTRY with Youtube/Video/Globe/Presentation icons
- 43 unit tests passing for all URL parsing and embed URL construction functions

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): Failing tests** - `08065e1` (test)
2. **Task 1 (TDD GREEN): embedUtils.js + EmbedOfflineFallback.jsx** - `c2b2001` (feat)
3. **Task 2: 4 widget components + registry** - `7b46f94` (feat)

_Note: Task 1 used TDD flow with separate test and implementation commits_

## Files Created/Modified
- `src/services/embedUtils.js` - URL parsing, validation, embed URL construction for all 4 embed types
- `src/player/components/widgets/EmbedOfflineFallback.jsx` - Shared offline fallback with thumbnail + WifiOff badge
- `src/player/components/widgets/YouTubeWidget.jsx` - YouTube iframe embed with autoplay+mute+loop+playlist
- `src/player/components/widgets/VimeoWidget.jsx` - Vimeo iframe embed with autoplay+muted+loop+autopause
- `src/player/components/widgets/WebPageWidget.jsx` - Sandboxed iframe with auto-refresh and zoom scaling
- `src/player/components/widgets/GoogleSlidesWidget.jsx` - Google Slides iframe embed with auto-advance
- `src/player/components/widgets/index.js` - Added 5 new barrel exports
- `src/widgets/registry.js` - Added 4 new WIDGET_REGISTRY entries with icons and defaultProps
- `tests/unit/services/embedUtils.test.js` - 43 unit tests for embedUtils

## Decisions Made
- Used hqdefault (not maxresdefault) for YouTube thumbnails -- hqdefault always exists, maxresdefault may 404
- Vimeo embed uses `muted` param (not `mute` like YouTube) per Vimeo's player API
- YouTube single-video loop requires `playlist={videoId}` in addition to `loop=1` -- documented in code
- WebPageWidget uses `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` for security; YouTube/Vimeo/Slides iframes have NO sandbox (would break their embeds)
- All cached thumbnail keys use type prefix (e.g., `thumbnail:youtube:{url}`) to avoid key collisions across widget types

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build (`npm run build`) has a pre-existing failure in `src/components/listings/TVPreviewModal.jsx` (missing import `../tv-layouts/ScaledStage`). This is NOT related to embed widget changes. All 2726 modules including embed widgets compiled successfully before the unrelated error. Logged to deferred items.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 embed widget types render on player screens via iframe embeds
- Widget picker shows all 4 new types with icons (Youtube, Video, Globe, Presentation)
- Offline fallback works for all 4 types with cached thumbnails
- Ready for Plan 02: editor UI controls (properties panel) for configuring embed widget props

---
*Phase: 108-embed-widgets*
*Completed: 2026-03-03*

## Self-Check: PASSED

All 9 files verified present. All 3 commits verified in git log.
