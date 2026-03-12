---
phase: 125-app-07-dietary-tags-e2e-fix
plan: 01
subsystem: testing
tags: [playwright, e2e, menu-boards, dietary-tags, screenshot]

requires:
  - phase: 120-data-sources-apps-moderation-e2e
    provides: Original APP-07 test and menu board E2E infrastructure
provides:
  - Fixed APP-07 E2E test with reliable button[title] locator
  - Distinct screenshot 120-12 showing expanded DietaryTagPicker
affects: [ci-pipeline, screenshot-comparison]

tech-stack:
  added: []
  patterns: [button title attribute locator for Playwright E2E]

key-files:
  created: []
  modified:
    - tests/e2e/apps-menuboards-screenshots.spec.js
    - screenshots/120/120-12-menu-board-dietary-tags-desktop.png

key-decisions:
  - "Used button[title='Dietary tags'] locator instead of compound CSS class selector for reliability"
  - "Removed silent fallback -- test now fails explicitly if tag button not found"

patterns-established:
  - "Prefer semantic attribute locators (title, role) over compound CSS class selectors for E2E tests"

requirements-completed: [APP-07]

duration: 2min
completed: 2026-03-12
---

# Phase 125 Plan 01: APP-07 Dietary Tags E2E Fix Summary

**Fixed APP-07 E2E test locator to produce distinct dietary tag screenshot using button[title] selector and DietaryTagPicker expansion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T22:45:36Z
- **Completed:** 2026-03-12T22:48:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced unreliable CSS compound class selector (`.border.border-gray-200.rounded-lg.p-3`) with semantic `button[title="Dietary tags"]` locator
- Screenshot 120-12 now shows expanded DietaryTagPicker with Vegetarian and Gluten-Free tags selected (solid colored backgrounds)
- Confirmed screenshots 120-10 and 120-12 have different MD5 hashes (f1b13d9 vs 0ca39b0) and different file sizes (92KB vs 103KB)
- All 27 APP tests pass across 3 roles with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix APP-07 locator and capture distinct dietary tag screenshot** - `b40bb32` (fix)
2. **Task 2: Verify screenshot distinctness** - verification only, no file changes

## Files Created/Modified
- `tests/e2e/apps-menuboards-screenshots.spec.js` - Replaced compound CSS locator with button[title] selector, removed fallback, added tag button click to expand DietaryTagPicker
- `screenshots/120/120-12-menu-board-dietary-tags-desktop.png` - Regenerated screenshot showing expanded dietary tag picker with selected tags

## Decisions Made
- Used `button[title="Dietary tags"]` instead of compound CSS class selector -- more reliable, semantically meaningful
- Removed the if/else fallback that silently produced a duplicate screenshot -- test now fails explicitly if locator doesn't match
- Click tag button to expand DietaryTagPicker rather than trying to screenshot inline tag badges -- produces more visually distinct evidence

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Playwright `--project=desktop` did not match any project (project names are chromium/chromium-admin/chromium-superadmin) -- used default project filter instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- APP-07 gap from v13.0 milestone audit is closed
- All APP-* tests pass reliably
- No further gap closure needed for this requirement

---
*Phase: 125-app-07-dietary-tags-e2e-fix*
*Completed: 2026-03-12*
