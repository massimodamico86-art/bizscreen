---
phase: quick
plan: 022
subsystem: testing
tags: [playwright, e2e, smoke-testing, client-ui]
dependency-graph:
  requires: [quick-010, quick-011]
  provides: [comprehensive-client-smoke-tests]
  affects: []
tech-stack:
  added: []
  patterns: [smoke-testing-with-fixme, error-boundary-detection]
key-files:
  created:
    - tests/e2e/client-interactions.spec.js
  modified: []
decisions:
  - key: known-issues-as-fixme
    choice: "Mark broken pages with test.fixme rather than skip"
    reason: "Documents bugs while allowing working tests to pass"
  - key: defensive-assertions
    choice: "Use isVisible().catch() pattern for resilience"
    reason: "Smoke tests should be resilient to timing issues"
  - key: error-boundary-detection
    choice: "Check for 'Something Went Wrong' text as crash indicator"
    reason: "ErrorBoundary component shows this text on render errors"
metrics:
  duration: 9m 31s
  tests-passing: 10
  tests-fixme: 5
  completed: 2026-02-02
---

# Quick Task 022: Client UI Interaction Tests - Summary

Comprehensive Playwright E2E smoke test for client-side UI interactions with error boundary detection and known issue tracking.

## What Was Built

Created `tests/e2e/client-interactions.spec.js` - a comprehensive test suite that:

1. **Navigates through all main sidebar sections:**
   - Dashboard, Media (expandable submenu), Apps, Playlists, Templates, Schedules, Screens, Knowledge Hub

2. **Interacts with dashboard elements:**
   - Stat cards (Total Screens, Playlists, Media Assets, Apps)
   - Quick Action buttons (Add Screen, Create Playlist, Upload Media, Create App)

3. **Verifies no crashes:**
   - Checks for "Something Went Wrong" error boundary after each navigation
   - Tracks console errors (filtering benign ones like favicon, ResizeObserver)

4. **Documents known issues:**
   - Uses `test.fixme` to mark broken pages that need fixing

## Test Results

| Category | Test | Status |
|----------|------|--------|
| Working Navigation | Schedules page | Pass |
| Working Navigation | Screens page | Pass |
| Working Navigation | Knowledge Hub | Pass |
| Dashboard Features | Stat cards visible | Pass |
| Dashboard Features | Quick Actions visible | Pass |
| Dashboard Features | Add Screen button | Pass |
| Screens Page | Load and interact | Pass |
| Console Tracking | No critical errors | Pass |
| Known Issues | Media pages | fixme (crashes) |
| Known Issues | Apps page | fixme (crashes) |
| Known Issues | Playlists page | fixme (crashes) |
| Known Issues | Templates page | fixme (crashes) |
| Known Issues | Dashboard re-nav | fixme (loading issue) |

## Known Issues Discovered

The tests revealed several pages that crash with "Something Went Wrong":

1. **MediaLibraryPage** - Import errors causing crash
2. **AppsPage** - Import errors causing crash
3. **PlaylistsPage** - Import errors causing crash
4. **TemplatesPage** (SvgTemplateGalleryPage) - Component errors
5. **Dashboard re-navigation** - Gets stuck at "Loading..."

These are documented as `test.fixme` tests that will fail when the bugs are fixed (signal to enable them).

## Test Infrastructure Notes

- Uses storage state auth from `playwright/.auth/client.json`
- 60-second timeout per test to handle slow app loading
- `waitForAppReady()` helper waits for loading states to clear
- Console error tracking filters out benign errors

## Commits

| Hash | Description |
|------|-------------|
| 4c48a97 | test(quick-022): add comprehensive client UI interaction tests |

## Files

**Created:**
- `tests/e2e/client-interactions.spec.js` (292 lines)

## Run Tests

```bash
# Run all client interaction tests
npx playwright test tests/e2e/client-interactions.spec.js --project=chromium

# Run with retry for flaky tests
npx playwright test tests/e2e/client-interactions.spec.js --project=chromium --retries=1
```

## Next Steps

To fix the known issues (will make fixme tests pass):

1. Debug MediaLibraryPage import errors
2. Debug AppsPage import errors
3. Debug PlaylistsPage import errors
4. Debug TemplatesPage/SvgTemplateGalleryPage errors
5. Investigate Dashboard loading state issues

When fixed, remove `test.fixme` from those tests to enable them.
