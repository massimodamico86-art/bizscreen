---
phase: 162-restore-deleted-spec-files
plan: "02"
subsystem: e2e-tests
tags: [restore, e2e, playwright, spec-files, git-recovery, playlists, template-marketplace]
dependency_graph:
  requires:
    - 162-01
  provides:
    - tests/e2e/playlists.spec.js (full CONT-02/03/04/08/09/10 coverage)
    - tests/e2e/template-marketplace.spec.js (full CONT-07/11/12 coverage)
  affects:
    - All 29 restored/repaired spec files (validated parsing via Playwright --list)
tech_stack:
  added: []
  patterns:
    - "git checkout <commit>~1 -- <path> to restore overwritten files from history"
    - "Playwright --list for parse-only validation without browser launch"
key_files:
  created: []
  modified:
    - tests/e2e/playlists.spec.js (209 -> 619 lines, adds CONT-02/03/04/08/09/10)
    - tests/e2e/template-marketplace.spec.js (384 -> 484 lines, adds CONT-11/12)
decisions:
  - "Restored both overwritten specs from 75371133~1 verbatim — pre-deletion versions contain full CONT requirement coverage that HEAD versions lack"
  - "Hard reset worktree to 58ed7289 before Task 1 commit to avoid accidentally deleting 162-01 restored files"
metrics:
  duration: "~15 minutes (includes worktree reset correction)"
  completed: "2026-04-11"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 162 Plan 02: Restore Overwritten Spec Files Summary

**One-liner:** Restored playlists.spec.js (209->619 lines) and template-marketplace.spec.js (384->484 lines) from git history, completing CONT-02/03/04/07/08/09/10/11/12 coverage; all 29 spec files parse with zero Playwright errors (572 tests in 61 files).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Restore overwritten playlists.spec.js and template-marketplace.spec.js | 1d2d35f2 | tests/e2e/playlists.spec.js (+410 lines), tests/e2e/template-marketplace.spec.js (+100 lines) |
| 2 | Validate all 29 restored/repaired spec files parse with Playwright | 83d56cb8 | (validation only - no code changes) |

## What Was Built

Restored 2 overwritten spec files that were truncated by the worktree merge commit `75371133`.

### Restored Files

- **tests/e2e/playlists.spec.js** — Restored from `75371133~1` (619 lines, pre-deletion). Provides full coverage for CONT-02 (Playlist Editing), CONT-03 (Nested Playlists), CONT-04 (Background Audio), CONT-08 (Drag-Drop Reorder), CONT-09 (Playlist Empty State), CONT-10 (Playlist Validation). Prior HEAD version (209 lines) covered only basic CRUD.

- **tests/e2e/template-marketplace.spec.js** — Restored from `75371133~1` (484 lines, pre-deletion). Provides full coverage for CONT-07 (template browsing/filtering), CONT-11 (apply via hover overlay), CONT-12 (template customization). Prior HEAD version (384 lines) lacked CONT-11/12 test groups.

### Validation Results

- **Total tests discovered:** 572 in 61 files
- **Parse errors:** 0
- **All file categories confirmed discovered:**
  - Auth: 14 tests (auth-login-logout, auth-signup-reset-invite)
  - Nav: 20 tests (nav-route-loading, nav-error-handling, nav-responsive, nav-accessibility-onboarding)
  - Screen: 19 tests (screen-management, screen-groups-diagnostics)
  - Scheduling: 21 tests (scheduling, campaigns)
  - Widgets: 36 tests (widgets-basic, widgets-data, widgets-embeds, widgets-rendering, edge-functions)
  - Menu/Lang: 19 tests (menu-boards, multi-language)
  - Admin: 26 tests (admin-settings-team, admin-settings-branding-security, admin-settings-billing-tools)
  - Enterprise: 17 tests (enterprise-sso, enterprise-api, enterprise-analytics)
  - Player: 14 tests (player-rendering, player-offline-selfheal, player-telemetry)
  - Playlists/Template: 43 tests (playlists with CONT groups, template-marketplace)
  - Layouts-screenshots: 8 tests (Phase 161, fixtures/index.js merge preserved)

## Decisions Made

1. **Verbatim restore from git history** — Both files restored with `git checkout 75371133~1 -- <path>`. The pre-deletion versions contain the full CONT requirement coverage; recreating would risk drift from original test intent.

2. **Hard reset worktree before staging** — Initial `git reset --soft 58ed7289` left working tree without the 162-01 restored files. The subsequent `git add` would have deleted them. Corrected by running `git reset --hard 58ed7289` before staging Task 1 changes, ensuring only the 2 spec files were in the diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Worktree working tree mismatch after soft reset**
- **Found during:** Task 1 commit
- **Issue:** Initial `git reset --soft 58ed7289` moved HEAD to the 162-01 base but left the working tree in the original worktree state (which lacked the 26 files restored by 162-01). A naive `git add` + commit would have deleted all 162-01 work.
- **Fix:** Detected the issue from the 842-file commit stat, ran `git reset --hard 58ed7289` to align working tree with the 162-01 complete state, then re-ran the restore and committed only the 2 target spec files.
- **Files modified:** (no additional files — correction was process-level)
- **Commit:** 1d2d35f2 (clean 2-file commit)

## Known Stubs

None. All files contain real test content restored verbatim from git history.

## Threat Flags

None. Both restored spec files are read-only test assets with no network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

Files modified exist at expected sizes:
- tests/e2e/playlists.spec.js: 619 lines (>= 600 required) — FOUND
- tests/e2e/template-marketplace.spec.js: 484 lines (>= 450 required) — FOUND

CONT IDs confirmed in restored files:
- CONT-02, CONT-03, CONT-04, CONT-08, CONT-09, CONT-10 in playlists.spec.js — FOUND
- CONT-11, CONT-12 in template-marketplace.spec.js — FOUND

Playwright parse validation:
- 572 tests in 61 files, 0 parse errors — PASSED

Commits exist:
- 1d2d35f2: FOUND (feat(162-02): restore overwritten playlists.spec.js and template-marketplace.spec.js)
- 83d56cb8: FOUND (test(162-02): validate all 29 spec files parse with Playwright)
