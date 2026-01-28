---
phase: 29
plan: 01
subsystem: imports
tags: [eslint, imports, react-router-dom, test-fixes]
dependency-graph:
  requires: [28-01]
  provides: [restored-imports-player, restored-imports-tests]
  affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/Player.jsx
    - tests/unit/player/Player.test.jsx
    - tests/unit/player/Player.heartbeat.test.jsx
    - tests/unit/player/Player.offline.test.jsx
    - tests/unit/player/Player.sync.test.jsx
    - tests/unit/player/PinEntry.test.jsx
    - tests/unit/pages/DashboardComponents.test.jsx
    - tests/unit/pages/HelpCenterPage.test.jsx
    - tests/unit/security/SafeHTML.test.jsx
    - tests/unit/components/ScreenGroupSettingsTab.test.jsx
decisions:
  - DashboardComponents imports from DashboardSections.jsx not DashboardPage.jsx
metrics:
  duration: 15min
  completed: 2026-01-28
---

# Phase 29 Plan 01: Restore Auto-Removed Imports Summary

**One-liner:** Restored ESLint auto-removed imports to Player.jsx and 9 test files; source file import issues identified as blocking remaining tests

## What Was Built

Restored imports that were incorrectly removed by ESLint's unused-imports plugin during Phase 28-01. The plugin failed to detect JSX usage patterns, removing imports that were actually in use.

**Files Fixed:**

1. **src/Player.jsx** - Added:
   - `Routes, Route, Navigate` from react-router-dom
   - `PairPage` from player/components/PairPage
   - `ViewPage` from player/pages/ViewPage

2. **Player Test Files** - Added:
   - `MemoryRouter, Routes, Route` from react-router-dom
   - `Player` default import where missing

3. **Other Test Files** - Added:
   - `BrowserRouter`, component imports for test files
   - `SafeHTML` named export
   - `HelpCenterPage` default export

## Commits

| Commit | Description |
|--------|-------------|
| 5dcbd4b | fix(29-01): restore imports to Player.jsx |
| 41b1472 | fix(29-01): restore imports to Player test files |
| 5825ce3 | fix(29-01): restore imports to other test files |

## Test Results

| Test File | Status | Tests |
|-----------|--------|-------|
| Player.test.jsx | PASS | 13/13 |
| PinEntry.test.jsx | PASS | 29/29 |
| SafeHTML.test.jsx | PASS | 36/36 |
| Player.heartbeat.test.jsx | PARTIAL | Pre-existing failures |
| Player.offline.test.jsx | PARTIAL | Pre-existing failures |
| Player.sync.test.jsx | PARTIAL | Pre-existing failures |
| DashboardComponents.test.jsx | BLOCKED | Source file imports missing |
| HelpCenterPage.test.jsx | BLOCKED | Source file imports missing |
| ScreenGroupSettingsTab.test.jsx | BLOCKED | Source file imports missing |

**Full Suite:** 1992 passing / 79 failing (2071 total)

## Deviations from Plan

### Plan Scope Issue Identified

**The plan scope was incomplete.** The plan specified fixing 10 files to achieve "0 failures", but the ESLint auto-fix affected many more source files beyond just Player.jsx.

**Source files with missing imports (NOT in plan scope):**
- `src/pages/HelpCenterPage.jsx` - Missing: PageLayout, PageHeader
- `src/pages/dashboard/DashboardSections.jsx` - Missing: Badge, Stack, Card components
- `src/components/screens/ScreenGroupSettingsTab.jsx` - Missing: Card, CardContent
- `src/player/components/PairPage.jsx` - Missing: PairingScreen
- `src/player/pages/ViewPage.jsx` - Missing: AppRenderer

These source file issues cause 79 test failures that cannot be resolved by fixing test file imports alone.

### Correction Applied

Fixed `DashboardComponents.test.jsx` import path:
- Changed: `from '../../../src/pages/DashboardPage'`
- To: `from '../../../src/pages/dashboard/DashboardSections'`

The components are actually exported from DashboardSections.jsx, not DashboardPage.jsx.

## Success Criteria Status

| Criterion | Status |
|-----------|--------|
| Player.jsx has react-router-dom imports | PASS |
| Player.jsx has PairPage and ViewPage imports | PASS |
| All 10 test files have restored imports | PASS |
| ESLint passes on Player.jsx | PASS |
| Test suite passes with 0 failures | FAIL - 79 failures remain |

## Blocker Identified

**The 79 remaining test failures require source file import restoration, not test file fixes.**

The following source files need imports restored (separate phase required):
1. `src/pages/HelpCenterPage.jsx`
2. `src/pages/dashboard/DashboardSections.jsx`
3. `src/components/screens/ScreenGroupSettingsTab.jsx`
4. `src/player/components/PairPage.jsx`
5. `src/player/pages/ViewPage.jsx`
6. And potentially others

## Recommendation

Create a follow-up phase to:
1. Audit ALL source files for missing imports from Phase 28-01
2. Restore imports to all affected source files
3. Re-run full test suite to confirm 0 failures

The current phase successfully restored all imports within its defined scope, but the scope was insufficient to achieve the stated success criterion of "0 failures".
