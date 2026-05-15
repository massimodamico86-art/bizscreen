---
phase: 162-restore-deleted-spec-files
plan: "01"
subsystem: e2e-tests
tags: [restore, e2e, playwright, spec-files, git-recovery]
dependency_graph:
  requires: []
  provides:
    - tests/e2e/helpers/screenshots.js
    - tests/e2e/fixtures/index.js
    - tests/e2e/helpers/index.js
    - 26 E2E spec files covering AUTH, NAV, SCREEN, SCHED, WDGT, MENU, LANG, ADMN, ENTR, PLYR
  affects:
    - tests/e2e/layouts-screenshots.spec.js (fixtures/index.js merge preserves LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX)
tech_stack:
  added: []
  patterns:
    - "git checkout <commit>~1 -- <path> to restore deleted files from history"
    - "Merged fixtures/index.js: pre-deletion Playwright fixtures + Phase 161 constants appended"
    - "Merged helpers/index.js: barrel exports from screenshots.js + helpers.js"
key_files:
  created:
    - tests/e2e/helpers/screenshots.js
    - tests/e2e/helpers/index.js
    - tests/e2e/auth-login-logout.spec.js
    - tests/e2e/auth-signup-reset-invite.spec.js
    - tests/e2e/nav-route-loading.spec.js
    - tests/e2e/nav-error-handling.spec.js
    - tests/e2e/nav-responsive.spec.js
    - tests/e2e/nav-accessibility-onboarding.spec.js
    - tests/e2e/screen-management.spec.js
    - tests/e2e/screen-groups-diagnostics.spec.js
    - tests/e2e/scheduling.spec.js
    - tests/e2e/campaigns.spec.js
    - tests/e2e/widgets-basic.spec.js
    - tests/e2e/widgets-data.spec.js
    - tests/e2e/widgets-embeds.spec.js
    - tests/e2e/widgets-rendering.spec.js
    - tests/e2e/edge-functions.spec.js
    - tests/e2e/menu-boards.spec.js
    - tests/e2e/multi-language.spec.js
    - tests/e2e/admin-settings-team.spec.js
    - tests/e2e/admin-settings-branding-security.spec.js
    - tests/e2e/admin-settings-billing-tools.spec.js
    - tests/e2e/enterprise-sso.spec.js
    - tests/e2e/enterprise-api.spec.js
    - tests/e2e/enterprise-analytics.spec.js
    - tests/e2e/player-rendering.spec.js
    - tests/e2e/player-offline-selfheal.spec.js
    - tests/e2e/player-telemetry.spec.js
  modified:
    - tests/e2e/fixtures/index.js
decisions:
  - "Restored from git history at 75371133~1 (verbatim) rather than recreating content to preserve exact pre-deletion test intent"
  - "fixtures/index.js merged: pre-deletion Playwright fixtures (authenticatedPage, freshPage) + Phase 161 constants appended at end to not break layouts-screenshots.spec.js"
  - "helpers/index.js written fresh (not restored verbatim) to include assertAppReady added in Phase 161"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_created: 28
  files_modified: 1
---

# Phase 162 Plan 01: Restore Deleted Spec Files Summary

**One-liner:** Recovered 26 E2E spec files + 3 infrastructure files from git history at 75371133~1, restoring 77 requirements worth of Playwright test coverage lost in a worktree merge incident.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Restore infrastructure files and merge fixtures/helpers barrels | de480da2 | tests/e2e/helpers/screenshots.js (restored), tests/e2e/fixtures/index.js (merged), tests/e2e/helpers/index.js (merged) |
| 2 | Batch restore all 26 deleted spec files | d0028db6 | 26 spec files restored verbatim from git history |

## What Was Built

Recovered 26 E2E spec files and 3 supporting infrastructure files that were deleted in the worktree merge commit `75371133`.

### Infrastructure (3 files)

- **tests/e2e/helpers/screenshots.js** — Restored from `75371133~1`. Provides `screenshotStep`, `VIEWPORTS`, `cleanScreenshots`, `detectViewport`.
- **tests/e2e/fixtures/index.js** — Merged: pre-deletion Playwright fixtures (`authenticatedPage`, `freshPage`, `test`, `expect`) + Phase 161 constants (`LAYOUT_PRESETS`, `WIDGET_TYPES`, `TEST_LAYOUT_PREFIX`).
- **tests/e2e/helpers/index.js** — Updated barrel: exports all 4 screenshot helpers from `./screenshots.js` + 6 test helpers including `assertAppReady` from `../helpers.js`.

### Spec Files Restored (26 files)

| Domain | Files | Requirements |
|--------|-------|--------------|
| AUTH | auth-login-logout, auth-signup-reset-invite | AUTH-01..08 |
| NAV | nav-route-loading, nav-error-handling, nav-responsive, nav-accessibility-onboarding | NAVX-01..10 |
| SCREEN | screen-management, screen-groups-diagnostics | SCRN-01..08 |
| SCHEDULING | scheduling, campaigns | SCHED-01..08 |
| WIDGETS | widgets-basic, widgets-data, widgets-embeds, widgets-rendering, edge-functions | WDGT-01..10 |
| MENU/LANG | menu-boards, multi-language | MENU-01..04, LANG-01..03 |
| ADMIN | admin-settings-team, admin-settings-branding-security, admin-settings-billing-tools | ADMN-01..06 |
| ENTERPRISE | enterprise-sso, enterprise-api, enterprise-analytics | ENTR-01..05 |
| PLAYER | player-rendering, player-offline-selfheal, player-telemetry | PLYR-01..06 |

## Decisions Made

1. **Verbatim git restore over recreation** — All 26 spec files restored from `75371133~1` using `git checkout` rather than manual recreation. Preserves exact test intent and avoids transcription errors.

2. **fixtures/index.js merge approach** — Restored pre-deletion version first (getting Playwright fixtures), then appended Phase 161 constants. This preserves both `authenticatedPage`/`freshPage` needed by auth/nav specs AND `LAYOUT_PRESETS`/`WIDGET_TYPES`/`TEST_LAYOUT_PREFIX` needed by `layouts-screenshots.spec.js`.

3. **helpers/index.js written fresh** — The pre-deletion version lacked `assertAppReady` (added by Phase 161). Rather than restoring then patching, the merged barrel was written directly with all required exports from both `screenshots.js` and `helpers.js`.

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed in sequence with correct merge operations.

## Known Stubs

None. All files contain real test content restored verbatim from git history.

## Self-Check: PASSED

Files created/exist:
- tests/e2e/helpers/screenshots.js: FOUND
- tests/e2e/fixtures/index.js: FOUND (with authenticatedPage + LAYOUT_PRESETS)
- tests/e2e/helpers/index.js: FOUND (with screenshotStep + assertAppReady)
- All 26 spec files: FOUND (26/26)

Commits exist:
- de480da2: FOUND (feat(162-01): restore infrastructure files and merge fixtures/helpers barrels)
- d0028db6: FOUND (feat(162-01): batch restore 26 deleted E2E spec files from git history)
