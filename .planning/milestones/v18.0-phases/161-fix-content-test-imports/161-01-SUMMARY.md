---
phase: 161-fix-content-test-imports
plan: 01
subsystem: test-infrastructure
tags: [e2e, imports, helpers, content-tests]
dependency_graph:
  requires: []
  provides: [assertAppReady-helper, helpers-barrel-export]
  affects: [scenes-spec, content-test-coverage]
tech_stack:
  added: []
  patterns: [barrel-export, app-shell-assertion]
key_files:
  created:
    - tests/e2e/helpers/index.js
  modified:
    - tests/e2e/helpers.js
    - tests/e2e/scenes.spec.js
decisions:
  - "assertAppReady checks main#main-content visibility and error boundary absence"
  - "Barrel pattern in helpers/index.js re-exports all helpers from ../helpers.js"
  - "scenes.spec.js import includes assertAppReady and dismissAnyModals for future use"
metrics:
  duration: "65s"
  completed: "2026-04-10T23:57:32Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 161 Plan 01: Fix Content Test Imports Summary

assertAppReady helper added to helpers.js with DOM shell visibility and error boundary checks, barrel export created at helpers/index.js, scenes.spec.js import path fixed to use barrel.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Create assertAppReady helper and add barrel export | 75371133 | Done |
| 2 | Fix scenes.spec.js import path and verify specs load | 006f927f | Done |

## What Was Done

### Task 1: Create assertAppReady helper and add barrel export
- Added `assertAppReady(page, testObj)` function to `tests/e2e/helpers.js`
- Function checks `main#main-content` visibility with 5s timeout
- Skips test if redirected to auth page instead of app
- Detects error boundary/crash screens via text pattern matching
- Updated default export object to include assertAppReady
- Created `tests/e2e/helpers/index.js` barrel file re-exporting all 6 helper functions

### Task 2: Fix scenes.spec.js import path and verify specs load
- Changed import from `./helpers.js` to `./helpers/index.js`
- Added `assertAppReady` and `dismissAnyModals` to import list
- Verified via `npx playwright test --list`: 10 tests listed, zero module errors

## Deviations from Plan

### Adjusted Items

**1. [Rule 3 - Blocking] layouts-screenshots.spec.js does not exist**
- **Found during:** Task 2 verification
- **Issue:** Plan referenced `tests/e2e/layouts-screenshots.spec.js` for verification but the file does not exist in the codebase
- **Resolution:** Skipped that verification step; the barrel export is ready for when the file is created

**2. [Rule 3 - Blocking] helpers/index.js did not pre-exist**
- **Found during:** Task 1
- **Issue:** Plan implied the barrel file already existed with some exports; it did not exist
- **Resolution:** Created the file from scratch with all 6 helper function re-exports

## Verification Results

| Check | Result |
|-------|--------|
| `grep "export async function assertAppReady" tests/e2e/helpers.js` | 1 match |
| `grep "assertAppReady" tests/e2e/helpers/index.js` | 1 match |
| `grep "from './helpers/index.js'" tests/e2e/scenes.spec.js` | 1 match |
| `npx playwright test tests/e2e/scenes.spec.js --list` | 10 tests listed, exit 0 |

## Known Stubs

None - all functions contain real implementation logic.

## Self-Check: PASSED

All 3 files exist. Both commit hashes (75371133, 006f927f) verified in git log.
