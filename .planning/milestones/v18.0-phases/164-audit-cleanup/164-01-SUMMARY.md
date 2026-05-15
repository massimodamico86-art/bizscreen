---
phase: 164-audit-cleanup
plan: 01
subsystem: e2e-tests
tags: [import-cleanup, test-hygiene, audit-gap-closure]
dependency_graph:
  requires: []
  provides: [clean-scenes-spec-imports]
  affects: [tests/e2e/scenes.spec.js]
tech_stack:
  added: []
  patterns: [es-module-named-imports]
key_files:
  modified:
    - tests/e2e/scenes.spec.js
decisions:
  - Keep import from ./helpers/index.js (not ./helpers.js) to maintain barrel export pattern
  - Remove only assertAppReady; keep dismissAnyModals and all other helpers
metrics:
  duration: "~5 min"
  completed: "2026-04-11T19:01:06Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
requirements_closed:
  - CONT-01
---

# Phase 164 Plan 01: Remove Unused assertAppReady Import Summary

**One-liner:** Removed unused `assertAppReady` named import from `scenes.spec.js` line 11 to close CONT-01 audit gap, preserving all other helper imports and the `./helpers/index.js` barrel path.

## What Was Built

Cleaned `tests/e2e/scenes.spec.js` by removing the orphaned `assertAppReady` import that was added during Phase 161 import fixes but was never called in the file.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Remove unused assertAppReady import | 9b249c81 | tests/e2e/scenes.spec.js |

## Changes Made

**`tests/e2e/scenes.spec.js` line 11** — Before:
```javascript
import { loginAndPrepare, waitForPageReady, navigateToSection, dismissAnyModals, assertAppReady } from './helpers/index.js';
```

After:
```javascript
import { loginAndPrepare, waitForPageReady, navigateToSection, dismissAnyModals } from './helpers/index.js';
```

Only `, assertAppReady` was removed. All other imports and the import path remain unchanged.

## Verification Results

- `grep "assertAppReady" tests/e2e/scenes.spec.js` → 0 matches (PASS)
- `npx playwright test tests/e2e/scenes.spec.js --list` → 10 tests listed, no parse errors (PASS)
- Line 11 contains exactly 4 helper imports (PASS)
- No other lines modified (PASS)

## Deviations from Plan

None — plan executed exactly as written.

The worktree had an incorrect pre-existing modification (import changed to `./helpers.js` and `dismissAnyModals` removed) from a prior incomplete agent run. This was reset to the correct HEAD baseline before applying the plan's intended change.

## Known Stubs

None.

## Threat Flags

None — test-only file, no production code modified, no security surface affected.

## Self-Check: PASSED

- [x] `tests/e2e/scenes.spec.js` exists and modified correctly
- [x] Commit 9b249c81 exists in git log
- [x] No assertAppReady references in file
- [x] Playwright lists 10 tests without parse errors
