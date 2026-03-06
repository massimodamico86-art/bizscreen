---
phase: quick-82
plan: 82
subsystem: ui
tags: [react, bugfix, scenes, playlist, tv-layouts, placeholders]

requires:
  - phase: quick-76
    provides: "BUG-Q76-01 discovery (Create Scene button non-functional)"
  - phase: quick-79
    provides: "BUG-Q79-01 and BUG-Q79-02 discovery (missing Share button, broken preview link href)"
  - phase: quick-63
    provides: "BUG-Q63-01 discovery (raw placeholders on TV layouts)"
provides:
  - "Create Scene button wired to IndustrySelectionModal via onShowAutoBuild prop"
  - "Share preview link button in playlist editor toolbar"
  - "Fixed preview link href using link.url instead of formatPreviewLink"
  - "Placeholder substitution (first-name, last-name) in all 4 TV layout components"
affects: []

tech-stack:
  added: []
  patterns:
    - "replacePlaceholders helper for mustache-style substitution in layout components"

key-files:
  created: []
  modified:
    - src/App.jsx
    - src/pages/PlaylistEditorPage.jsx
    - src/pages/components/PlaylistEditorComponents.jsx
    - src/layouts/Layout1.jsx
    - src/layouts/Layout2.jsx
    - src/layouts/Layout3.jsx
    - src/layouts/Layout4.jsx

key-decisions:
  - "Rendered IndustrySelectionModal in BizScreenAppInner (not ClientUILayout) to keep state co-located with pages object"
  - "Used local replacePlaceholders helper in each Layout file to minimize cross-file dependencies"

patterns-established: []

requirements-completed: [BUG-Q76-01, BUG-Q79-01, BUG-Q79-02, BUG-Q63-01]

duration: 4min
completed: 2026-03-06
---

# Quick Task 82: Fix Known Bugs Summary

**Fixed 4 QA bugs: Create Scene button wiring, playlist Share button, preview link href, and TV layout placeholder substitution**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T02:56:19Z
- **Completed:** 2026-03-06T03:00:39Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- BUG-Q76-01: Wired onShowAutoBuild prop from App.jsx to ScenesPage, opening IndustrySelectionModal on Create Scene click
- BUG-Q79-01: Added Share2 icon button to playlist editor toolbar that triggers PreviewLinksModal
- BUG-Q79-02: Replaced broken formatPreviewLink(link.token) href with link.url fallback
- BUG-Q63-01: Added replacePlaceholders helper to all 4 TV Layout components, substituting {{first-name}} and {{last-name}} with guestData

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Create Scene button and fix playlist preview link bugs** - `ca7fff9` (fix)
2. **Task 2: Add placeholder substitution to TV layout components** - `ac65c97` (fix)

## Files Created/Modified
- `src/App.jsx` - Added showIndustryModal state, IndustrySelectionModal import/render, onShowAutoBuild prop to ScenesPage
- `src/pages/PlaylistEditorPage.jsx` - Added Share2 import and Share button in editor toolbar
- `src/pages/components/PlaylistEditorComponents.jsx` - Fixed preview link href to use link.url instead of formatPreviewLink
- `src/layouts/Layout1.jsx` - Added replacePlaceholders helper and guestData prop, applied to welcomeGreeting/welcomeMessage
- `src/layouts/Layout2.jsx` - Added replacePlaceholders helper and guestData prop, applied to welcomeGreeting/welcomeMessage
- `src/layouts/Layout3.jsx` - Added replacePlaceholders helper and guestData prop, applied to welcomeGreeting/welcomeMessage
- `src/layouts/Layout4.jsx` - Added replacePlaceholders helper and guestData prop, applied to welcomeGreeting/welcomeMessage

## Decisions Made
- Rendered IndustrySelectionModal in BizScreenAppInner (same scope as pages object and showIndustryModal state) rather than ClientUILayout, to avoid scope issues
- Used local replacePlaceholders helper in each Layout file rather than a shared utility, keeping changes minimal and self-contained

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed IndustrySelectionModal scope placement**
- **Found during:** Task 1
- **Issue:** Initial placement of modal JSX was in ClientUILayout function but state was in BizScreenAppInner, causing eslint no-undef errors
- **Fix:** Moved modal render to BizScreenAppInner return JSX, alongside ClientUILayout
- **Files modified:** src/App.jsx
- **Verification:** Build passes, eslint clean
- **Committed in:** ca7fff9

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor placement adjustment, no scope creep.

## Issues Encountered
None beyond the scope fix documented above.

## Next Phase Readiness
- All 4 open QA bugs are now resolved
- No remaining open bugs from QA walkthrough phases 63, 76, 79

---
*Phase: quick-82*
*Completed: 2026-03-06*
