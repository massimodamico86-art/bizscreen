---
phase: 86-screen-management
plan: 02
subsystem: ui
tags: [react, screen-groups, permissions, location-service, language-service, design-system]

# Dependency graph
requires:
  - phase: 86-screen-management-01
    provides: "Screen management page and device CRUD"
provides:
  - "Verified and fixed screen groups page with correct location data extraction"
  - "Verified screen group detail page with devices and settings tabs"
  - "Verified group settings tab with language and location selectors"
  - "Fixed async permissions handling for canEditScreens"
affects: [screen-management, campaigns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async permissions: use useState + useEffect for async permission checks instead of sync calls"
    - "Location data extraction: fetchLocations returns {data, error}, extract array defensively"

key-files:
  created: []
  modified:
    - "src/pages/ScreenGroupsPage.jsx"
    - "src/components/screens/ScreenGroupSettingsTab.jsx"

key-decisions:
  - "fetchLocations defensive extraction: use locationsData?.data with Array.isArray fallback for backward compat"
  - "canEditScreens async fix: useState(true) default with useEffect resolution, avoiding breaking existing pattern across pages"
  - "Select placeholder suppression: pass placeholder='' to design-system Select when using custom default options"

patterns-established:
  - "Defensive service response extraction: always check for .data property on service responses that may wrap arrays"

requirements-completed: [SCRN-03, SCRN-04]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 86 Plan 02: Screen Groups Management Summary

**Fixed fetchLocations data shape extraction, async permissions wiring, and Select placeholder duplication in screen group pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T15:22:50Z
- **Completed:** 2026-02-24T15:26:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed runtime crash in ScreenGroupsPage where fetchLocations() response object was used as array for location filter dropdown
- Fixed canEditScreens() async function being called synchronously (returned Promise, always truthy) -- converted to useState + useEffect pattern
- Fixed Select component placeholder duplication in ScreenGroupSettingsTab where default "Select..." overlapped custom default options
- Verified all imports and wiring across ScreenGroupsPage, ScreenGroupDetailPage, ScreenGroupSettingsTab, PlayerStatusBadge, ScreensFooterCards, PushPlaylistModal, TagChipInput

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit and fix ScreenGroupsPage imports and data wiring** - `50691b4` (fix)
2. **Task 2: Audit and fix ScreenGroupDetailPage and ScreenGroupSettingsTab** - `4b0d8b8` (fix)

**Plan metadata:** `0e6aa0c` (docs: complete plan)

## Files Created/Modified
- `src/pages/ScreenGroupsPage.jsx` - Fixed fetchLocations data extraction and async canEditScreens
- `src/components/screens/ScreenGroupSettingsTab.jsx` - Fixed Select placeholder duplication

## Decisions Made
- Used defensive extraction `locationsData?.data || (Array.isArray(locationsData) ? locationsData : [])` to handle both wrapped and unwrapped location responses
- Converted sync `canEditScreens(user)` call to async useState+useEffect pattern; defaulting to true until resolved to avoid flash of hidden UI
- Added `placeholder=""` to Select components that provide their own default option children

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed canEditScreens async call pattern**
- **Found during:** Task 1 (ScreenGroupsPage import audit)
- **Issue:** `canEditScreens` is an async function (returns Promise) but was called synchronously as `const canEdit = canEditScreens(user)`. Function also doesn't accept a user parameter. The Promise object is always truthy, so permissions were effectively always "allowed".
- **Fix:** Converted to useState + useEffect pattern that properly resolves the async result. Removed unused `user` destructure and `useAuth` import.
- **Files modified:** src/pages/ScreenGroupsPage.jsx
- **Verification:** Build passes, permissions resolve correctly
- **Committed in:** 50691b4

**2. [Rule 1 - Bug] Fixed Select placeholder duplication in ScreenGroupSettingsTab**
- **Found during:** Task 2 (ScreenGroupSettingsTab wiring verification)
- **Issue:** Design-system Select component has `placeholder="Select..."` as default, rendering a disabled option. ScreenGroupSettingsTab already provides custom default options ("None (use device default)", "No location set"), creating duplicate defaults.
- **Fix:** Added `placeholder=""` to both Select components to suppress the default placeholder.
- **Files modified:** src/components/screens/ScreenGroupSettingsTab.jsx
- **Verification:** Build passes, Select renders only the intended options
- **Committed in:** 4b0d8b8

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes resolve correctness issues. No scope creep.

### Deferred Items (Out of Scope)

- `canEditScreens(user)` same async pattern exists in CampaignsPage.jsx and CampaignEditorPage.jsx -- pre-existing, not caused by this plan
- ScreenGroupDetailPage useEffect has `group` object in dependency array alongside `group?.id`, causing redundant refetches -- minor optimization, not a bug

## Issues Encountered
None - all imports and wiring verified correct beyond the three fixes above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Screen group management fully verified: CRUD, tag management, screen assignment, language settings
- All screen management pages (ScreenGroupsPage, ScreenGroupDetailPage, ScreenGroupSettingsTab) build without errors
- Ready for remaining phase 86 plans or next phase

## Self-Check: PASSED

- FOUND: src/pages/ScreenGroupsPage.jsx
- FOUND: src/components/screens/ScreenGroupSettingsTab.jsx
- FOUND: .planning/phases/86-screen-management/86-02-SUMMARY.md
- FOUND: commit 50691b4 (Task 1)
- FOUND: commit 4b0d8b8 (Task 2)

---
*Phase: 86-screen-management*
*Completed: 2026-02-24*
