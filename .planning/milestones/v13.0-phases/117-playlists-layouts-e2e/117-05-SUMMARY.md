---
phase: 117-playlists-layouts-e2e
plan: 05
subsystem: testing
tags: [playwright, e2e, layouts, screenshots, api-mocking, page-route]

requires:
  - phase: 117-playlists-layouts-e2e
    provides: API mocking pattern from plan 03 (playlists)
  - phase: 117-playlists-layouts-e2e
    provides: Layout editor navigation fix from plan 04
provides:
  - Fixed layout editor E2E tests with page.route() API mocking for zones, presets, and assign modal
  - Distinct screenshots for LAYOUT-02, LAYOUT-03, LAYOUT-04 showing real editor UI
affects: [122-responsive-edge]

tech-stack:
  added: []
  patterns: [page.route API mocking for layout/zone/playlist/media Supabase endpoints, modal-scoped locators for tab buttons]

key-files:
  created: []
  modified:
    - tests/e2e/layouts-screenshots.spec.js

key-decisions:
  - "Used page.route() to mock layouts, layout_zones, playlists, and media_assets Supabase endpoints"
  - "Simplified navigateToLayoutEditor to use mock layout ID directly (removed failing Supabase evaluate block)"
  - "Scoped assign modal tab locators to .fixed.inset-0 overlay to prevent accidental sidebar navigation"
  - "Added mocking to LAYOUT-08 as well since it also navigates to layout editor"

patterns-established:
  - "Layout API mocking: setupLayoutMocking() returns Two Columns layout with Left/Right zones"
  - "Modal-scoped locators: use assignModal.locator('button') to avoid matching sidebar buttons"

requirements-completed: [PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07, PLAY-08, LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, LAYOUT-06, LAYOUT-07, LAYOUT-08]

duration: 6min
completed: 2026-03-06
---

# Phase 117 Plan 05: Close Layout Editor E2E Gaps Summary

**Layout editor E2E tests now render full UI via page.route() API mocking -- zones, presets, property panel, and assign content modal all captured**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T23:09:20Z
- **Completed:** 2026-03-06T23:15:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added setupLayoutMocking() function intercepting layouts, layout_zones, playlists, and media_assets Supabase endpoints
- LAYOUT-02 screenshot shows layout editor with zone canvas (Left/Right zones) and Quick Presets section
- LAYOUT-03 screenshot shows zone selection with Zone Properties panel (name, position, dimensions, content)
- LAYOUT-04 screenshot shows Assign Content to Zone modal with Playlists and Media tabs populated with mock data
- All 8 LAYOUT tests pass (11 total including auth setup) with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add setupLayoutMocking and fix LAYOUT-02/03/04 tests** - `003fbc6` (fix)

## Files Created/Modified
- `tests/e2e/layouts-screenshots.spec.js` - Added setupLayoutMocking(), simplified navigateToLayoutEditor(), scoped modal locators, added mocking to LAYOUT-02/03/04/08

## Decisions Made
- Used page.route() to mock 4 Supabase tables (layouts, layout_zones, playlists, media_assets) plus RPC endpoints
- Mock layout uses Two Columns preset (Left 50% + Right 50%) matching LayoutEditorPage PRESET_LAYOUTS
- PostgREST .single() returns plain object (not array) for layout fetch compatibility
- Scoped assign modal tab buttons to `.fixed.inset-0.bg-black\\/50` overlay to prevent sidebar Playlists link from being clicked instead of modal tab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed assign button locator matching wrong element**
- **Found during:** Task 1 (running LAYOUT-04 test)
- **Issue:** Locator `/assign|content/i` matched "Header + Content" preset button before the actual "Assign Content" button in zone properties
- **Fix:** Changed locator to `/assign content/i` to match exact button text
- **Files modified:** tests/e2e/layouts-screenshots.spec.js
- **Verification:** LAYOUT-04 now correctly opens the assign modal
- **Committed in:** 003fbc6

**2. [Rule 1 - Bug] Fixed playlists tab click navigating to Playlists page**
- **Found during:** Task 1 (running LAYOUT-04 test)
- **Issue:** `page.getByRole('button', { name: /playlists/i }).first()` matched sidebar Playlists link before modal tab button
- **Fix:** Scoped tab locators to the assign modal overlay container
- **Files modified:** tests/e2e/layouts-screenshots.spec.js
- **Verification:** Playlists and Media tabs in assign modal now switch correctly
- **Committed in:** 003fbc6

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correct modal interaction. No scope creep.

## Issues Encountered
- Backend API not running during E2E tests -- resolved by implementing Supabase API mocking via page.route() (same pattern as 117-03)
- Assign Content button locator collided with preset button text -- resolved by using exact match

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 16 playlist + layout E2E requirements fully satisfied
- Phase 117 gap closures complete (plans 03, 04, 05)
- API mocking pattern proven for both playlists and layouts

---
*Phase: 117-playlists-layouts-e2e*
*Completed: 2026-03-06*
