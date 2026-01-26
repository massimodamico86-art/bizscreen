---
phase: 20-multi-language-core
plan: 02
subsystem: ui, api
tags: [multi-language, i18n, device-settings, scene-cards, badges]

# Dependency graph
requires:
  - phase: 20-multi-language-core
    plan: 01
    provides: languageService, LANGUAGE_COLORS, getAvailableLanguagesForScene
provides:
  - display_language field in device settings UI
  - updateDeviceLanguage function in screenService
  - LanguageBadges component for language indicators
  - Language badges on scene cards
affects: [20-03 (language switcher in editor)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch language fetching for scene lists
    - Color-coded language badges using LANGUAGE_COLORS
    - needs_refresh flag for device content reload

key-files:
  created:
    - src/components/scenes/LanguageBadges.jsx
  modified:
    - src/services/screenService.js
    - src/pages/components/ScreensComponents.jsx
    - src/pages/hooks/useScreensData.js
    - src/pages/ScenesPage.jsx

key-decisions:
  - "Display Language dropdown in EditScreenModal (not separate settings page)"
  - "Show native language names with English in parens (e.g., 'Espanol (Spanish)')"
  - "Batch fetch languages after scenes load (MVP approach, no RPC modification)"
  - "Hide badges when scene has only English (per CONTEXT.md)"
  - "Position badges below screen count badge in card header"

patterns-established:
  - "LanguageBadges component reusable for other card types"
  - "sceneLanguages Map pattern for storing per-scene language data"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 20 Plan 02: Device Language & Language Badges Summary

**Device language assignment UI and language indicator badges on scene cards for multi-language content visibility**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T20:04:39Z
- **Completed:** 2026-01-26T20:08:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added display_language to screenService allowedFields for updateScreen
- Created updateDeviceLanguage function that sets needs_refresh=true for content reload
- Added Display Language dropdown to EditScreenModal with Globe icon and helper text
- Created LanguageBadges component with color-coded chips from LANGUAGE_COLORS
- Integrated LanguageBadges into ScenesPage SceneCard component
- Added batch language fetching for scene lists using getAvailableLanguagesForScene

## Task Commits

Each task was committed atomically:

1. **Task 1: Add display_language to screenService and device settings** - `1177113` (feat)
2. **Task 2: Create LanguageBadges component and add to ScenesPage** - `89f92fe` (feat)

## Files Created/Modified

- `src/components/scenes/LanguageBadges.jsx` - New language badge component
- `src/services/screenService.js` - Added display_language and updateDeviceLanguage
- `src/pages/components/ScreensComponents.jsx` - Display Language dropdown in EditScreenModal
- `src/pages/hooks/useScreensData.js` - Handle displayLanguage in update handler
- `src/pages/ScenesPage.jsx` - Language badges integration with batch fetching

## Decisions Made

1. **Display Language in EditScreenModal:** Placed in the device settings section between Screen Group and Content Assignment, matching existing form patterns.

2. **Native language display format:** Show "Espanol (Spanish)" format for better user recognition while maintaining technical accuracy.

3. **Batch fetch approach for languages:** MVP approach that fetches languages after scenes load rather than modifying the RPC. Can optimize with RPC if performance becomes an issue.

4. **Badge visibility rules:** Per CONTEXT.md, badges hidden when scene has only default language (English). This reduces visual noise for single-language setups.

5. **Badge positioning:** Placed in card header, vertically stacked below screen count badge for clear visual hierarchy.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components integrated cleanly with existing patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Device language assignment complete (LANG-02)
- Language badges on scene cards complete (LANG-05)
- LanguageBadges component ready for reuse in editor
- needs_refresh pattern established for language-triggered content updates

**Ready for 20-03-PLAN.md** (Language Switcher in Editor)

---
*Phase: 20-multi-language-core*
*Completed: 2026-01-26*
