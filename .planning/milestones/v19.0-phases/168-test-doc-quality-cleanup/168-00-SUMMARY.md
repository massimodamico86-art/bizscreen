---
phase: 168-test-doc-quality-cleanup
plan: 00
subsystem: testing
tags: [eslint, flat-config, eslint9, e2e, wave0]

# Dependency graph
requires: []
provides:
  - "eslint.config.js at repo root — ESLint 9.x flat config enabling lint of tests/e2e/*.spec.js files"
affects:
  - 168-01
  - 168-02
  - 168-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESLint 9.x flat config (export default array) at repo root"

key-files:
  created:
    - "eslint.config.js"
  modified: []

key-decisions:
  - "Restore eslint.config.js from commit 289a2c7b^ (56 lines) rather than creating a new one from scratch — known-good baseline"
  - "Remove only 'tests' from ignores array; preserve all other entries unchanged — minimal invasive change"

patterns-established:
  - "ESLint flat config: export default array with ignores object as first entry, then per-file overrides"

requirements-completed:
  - TQAL-01

# Metrics
duration: 3min
completed: 2026-04-13
---

# Phase 168 Plan 00: Restore eslint.config.js Summary

**Restored ESLint 9.x flat config from commit 289a2c7b^ with 'tests' removed from ignores, unblocking TQAL-01 SC1 lint verification on tests/e2e/*.spec.js files**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-13T19:14:26Z
- **Completed:** 2026-04-13T19:17:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Restored `eslint.config.js` from historical commit `289a2c7b^` (56 lines) at the repo root
- Removed `'tests'` from the ignores array — tests/e2e/ files now discoverable by ESLint 9.x
- Verified `npx eslint --print-config` exits 0 (no "couldn't find config" error)
- All other ignore entries (dist, node_modules, playwright-report, test-results, etc.) preserved verbatim

## Task Commits

1. **Task 1: Restore eslint.config.js from 289a2c7b^ with 'tests' removed from ignores** - `62206909` (chore)

## Files Created/Modified
- `eslint.config.js` — ESLint 9.x flat config; 'tests' removed from ignores so Wave 1+ plans can lint tests/e2e/*.spec.js

## Decisions Made
- Used `289a2c7b^:eslint.config.js` as source (56 lines) — known-good baseline per 168-RESEARCH.md Pitfall 3
- Only removed `'tests'` entry from ignores; no other modifications to content, rules, or formatting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

During the initial `git reset --soft` to rebase the worktree onto the expected base commit (`90e8480d`), the working tree had pre-staged deletions from the prior soft-reset. The first commit attempt accidentally included all those staged deletions. Immediately rolled back with `git reset --soft HEAD~1`, unstaged all other changes with `git restore --staged -- .`, then staged only `eslint.config.js` for the clean commit. No files were lost; the worktree is a sparse checkout, and those deletions were just uncommitted worktree-vs-base differences.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wave 0 complete: `eslint.config.js` present and loadable
- Wave 1 plans (168-01, 168-02) can now restore test spec files and run ESLint against them
- The full D-09 lint command (`npx eslint tests/e2e/layouts-screenshots.spec.js tests/e2e/fixtures/index.js tests/e2e/playlists.spec.js`) will succeed once Wave 1 creates those target files

## Self-Check

- [x] `eslint.config.js` exists at repo root
- [x] Commit `62206909` exists: `git log --oneline | grep 62206909`
- [x] `grep -c "'tests'" eslint.config.js` = 0
- [x] `wc -l < eslint.config.js` = 56 (within 40–60 range)
- [x] `npx eslint --print-config eslint.config.js` exits 0

## Self-Check: PASSED

---
*Phase: 168-test-doc-quality-cleanup*
*Completed: 2026-04-13*
