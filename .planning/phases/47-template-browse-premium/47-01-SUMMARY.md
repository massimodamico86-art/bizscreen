---
phase: 47-template-browse-premium
plan: 01
subsystem: ui
tags: [framer-motion, react, animation, template-card, design-system]

# Dependency graph
requires:
  - phase: 13-template-system
    provides: "Original TemplateCard component and design-system barrel"
provides:
  - "Premium TemplateCard with Framer Motion cardLift hover animation"
  - "Progressive image loading with pulse placeholder and opacity fade-in"
  - "Fixed-height thumbnails (h-60/h-80) preventing layout shift"
  - "cardLift motion preset for premium interactive surfaces"
  - "Dimension-matched TemplateCardSkeleton (h-60 + p-4)"
affects: [47-02-template-browse-page, template-gallery, svg-template-gallery]

# Tech tracking
tech-stack:
  added: []
  patterns: ["cardLift motion preset for premium card hover (y:-4, scale:1.02, shadow deepening)"]

key-files:
  created: []
  modified:
    - src/design-system/components/TemplateCard.jsx
    - src/design-system/motion.js
    - src/design-system/index.js

key-decisions:
  - "Fixed height (h-60/h-80) over aspect-ratio for thumbnails to prevent layout shift"
  - "cardLift preset uses y-translate + scale + boxShadow for premium hover feel"

patterns-established:
  - "cardLift: Framer Motion hover preset for premium interactive surfaces (y:-4, scale:1.02, shadow deepening)"
  - "Progressive image loading: useState(false) + pulse placeholder + opacity transition on load"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 47 Plan 01: Premium TemplateCard Summary

**Framer Motion cardLift hover animation with h-60 fixed-height thumbnails and progressive image fade-in on design-system TemplateCard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T23:09:34Z
- **Completed:** 2026-02-10T23:11:42Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- TemplateCard now uses Framer Motion `motion.div` with `cardLift` preset for smooth hover lift (y:-4, scale:1.02, shadow deepening)
- Thumbnail height upgraded from `aspect-video` to fixed `h-60` (240px landscape/square) and `h-80` (320px portrait) preventing layout shift
- Progressive image loading with `animate-pulse` placeholder that fades in on load via opacity transition
- TemplateCardSkeleton dimensions exactly match loaded card (h-60 thumbnail + p-4 content area)
- New `cardLift` motion preset exported from both `motion.js` and design-system barrel `index.js`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cardLift motion preset and enhance TemplateCard with Framer Motion hover** - `d635a25` (feat)

## Files Created/Modified
- `src/design-system/motion.js` - Added cardLift motion preset after scaleHover (y:-4, scale:1.02, shadow deepening)
- `src/design-system/components/TemplateCard.jsx` - Rewrote with motion.div, cardLift hover, h-60 thumbnails, progressive image loading, p-4 content padding
- `src/design-system/index.js` - Added cardLift to motion primitives barrel export

## Decisions Made
- Used fixed height classes (h-60/h-80) instead of aspect-ratio to prevent layout shift between skeleton and loaded states
- cardLift preset applies y-translate + scale + boxShadow via Framer Motion whileHover (no CSS transition-all to avoid conflicts)
- Kept existing hover overlay (dark bg + action buttons) unchanged -- it layers well on top of the lift effect
- Removed unused `duration`/`easing` imports from TemplateCard (only `cardLift` needed since preset encapsulates timing)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build error in DataSourcesPage.jsx (duplicate `Edit` symbol) unrelated to this plan -- left untouched
- Pre-existing `Button` used without import in TemplateCard hover overlay -- preserved as-is per plan instruction to not change overlay behavior

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Premium TemplateCard ready for use in plan 47-02 (template browse page enhancement)
- cardLift preset available for any future premium interactive surface

## Self-Check: PASSED

- [x] src/design-system/components/TemplateCard.jsx - FOUND
- [x] src/design-system/motion.js - FOUND
- [x] src/design-system/index.js - FOUND
- [x] Commit d635a25 - FOUND

---
*Phase: 47-template-browse-premium*
*Completed: 2026-02-10*
