---
phase: 44-eslint-zero-warnings
plan: 05
subsystem: code-quality
tags: [eslint, zero-warnings, error-promotion, pre-commit, lint-enforcement]

# Dependency graph
requires: [44-04]
provides:
  - "Zero ESLint warnings and zero ESLint errors across entire codebase"
  - "All rules enforced at error level -- pre-commit hooks block violations"
  - "Phase 44 complete: LINT-01, LINT-02, LINT-03 requirements met"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All ESLint rules at error level (no warn) for strict enforcement"
    - "Pre-commit hooks via Husky/lint-staged block any lint violation"

key-files:
  created: []
  modified:
    - "eslint.config.js"
    - "tests/unit/services/permissionsService.test.js"

key-decisions:
  - "Promoted all 6 warn-level rules to error in single change"
  - "Removed all TODO comments for future upgrades (all complete)"
  - "Fixed callCount reference bug in permissionsService test"

# Metrics
duration: 8min
completed: 2026-02-10
---

# Phase 44 Plan 05: Promote Warn Rules to Error Summary

**Promoted all 6 remaining warn-level ESLint rules to error, achieving zero warnings and zero errors across the entire codebase with pre-commit enforcement**

## What Was Done

### Task 1: Promote all warn-level rules to error and verify zero warnings

Promoted 6 rules from warn to error in eslint.config.js:

1. `no-console`: warn -> error (with allow: ['warn', 'error'])
2. `unused-imports/no-unused-vars`: warn -> error (with ignore patterns)
3. `no-case-declarations`: warn -> error
4. `no-useless-catch`: warn -> error
5. `no-useless-escape`: warn -> error
6. `no-undef`: warn -> error

Removed 4 TODO comments that referenced future upgrades (all complete now). Updated comments to reflect final state.

Fixed last remaining ESLint warning: undefined `callCount` variable reference in permissionsService.test.js (was referencing outer scope `callCount` instead of local `_callCount`). Removed the unused counter variable and its increment; mock already uses table-name routing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed undefined callCount variable in permissionsService test**
- **Found during:** Task 1 (pre-promotion verification)
- **Issue:** Line 148 referenced `callCount` (from outer test scope) instead of locally declared `_callCount` on line 146
- **Fix:** Removed unused `_callCount` variable and `callCount++` line (dead code); mock already uses table-name routing
- **Files modified:** tests/unit/services/permissionsService.test.js
- **Commit:** c0c717b

## Verification

- `npx eslint .` reports 0 problems (0 errors, 0 warnings) -- LINT-01 met
- eslint.config.js has 0 warn rules, 7 error rules, 14 off rules -- LINT-02 met
- .husky/pre-commit runs `npx lint-staged`, lint-staged runs `eslint --fix` on `*.{js,jsx}` -- LINT-03 met
- `npm run build` succeeds (12.98s)
- Pre-commit hook passed on task commit (lint-staged ran successfully)

## Self-Check: PASSED

- FOUND: eslint.config.js (modified)
- FOUND: tests/unit/services/permissionsService.test.js (modified)
- FOUND: commit c0c717b

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c0c717b | Promote all ESLint warn rules to error for zero-warning codebase |
