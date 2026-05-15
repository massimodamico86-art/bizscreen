---
phase: 168
plan: 01
subsystem: e2e-tests
tags: [restore, regression-recovery, playwright, test-infrastructure]
dependency_graph:
  requires: []
  provides:
    - tests/e2e/layouts-screenshots.spec.js (restored 197 lines)
    - tests/e2e/fixtures/index.js (restored 109 lines)
    - tests/e2e/playlists.spec.js (restored 619 lines)
    - tests/e2e/helpers/index.js (restored 21 lines)
    - tests/e2e/helpers/screenshots.js (restored 110 lines)
    - tests/e2e/helpers.js (restored 227 lines with assertAppReady + expect import)
  affects:
    - Wave 2 TQAL-01/03/04 edits (targets now available)
    - Wave 3 playwright stabilization run
tech_stack:
  added: []
  patterns: [git-show restoration from known-good snapshot]
key_files:
  created:
    - tests/e2e/layouts-screenshots.spec.js
    - tests/e2e/fixtures/index.js
    - tests/e2e/helpers/index.js
    - tests/e2e/helpers/screenshots.js
  modified:
    - tests/e2e/helpers.js
    - tests/e2e/playlists.spec.js
decisions:
  - "OVERWRITE_SAFE confirmed: helpers.js has 0 post-05a7f89d commits; diff shows only target-side additions (assertAppReady + expect import) — full overwrite used."
  - "Single atomic commit strategy used per D-01/D-02: all 6 files in one commit framed as regression recovery."
metrics:
  duration: ~5 minutes
  completed_date: "2026-04-13"
---

# Phase 168 Plan 01: Restore 6 Test Artifacts Summary

Single atomic commit restoring 6 E2E test artifacts deleted/truncated by `05a7f89d` (Phase 165-01 dayparting), recovering v18 Phase 162's test infrastructure with 884 lines restored across layouts-screenshots.spec.js, playlists.spec.js, fixtures/index.js, helpers/index.js, helpers/screenshots.js, and helpers.js (assertAppReady + expect import).

## OVERWRITE_SAFE Decision (Task 1)

Task 1 safety diff confirmed **OVERWRITE_SAFE**:

- `git log 05a7f89d..HEAD --oneline -- tests/e2e/helpers.js` returned 0 commits (Assumption A2 confirmed).
- `diff /tmp/168-helpers-current.js /tmp/168-helpers-target.js` showed only `>` (target-side addition) hunks — no `<`-only hunks representing post-05a7f89d content in current file.
- Divergent additions: none. The only differences were the `assertAppReady` function block (35 lines) and the `expect` import (1 line) present in target but missing from current.

Decision file `/tmp/168-01-helpers-decision.txt`: `OVERWRITE_SAFE`

## Line-Count Delta Table

| File | Pre-Restore | Post-Restore | Delta |
|------|-------------|--------------|-------|
| tests/e2e/helpers.js | 190 | 227 | +37 |
| tests/e2e/playlists.spec.js | 209 (truncated stub) | 619 | +410 |
| tests/e2e/layouts-screenshots.spec.js | DELETED | 197 | +197 |
| tests/e2e/fixtures/index.js | DELETED | 109 | +109 |
| tests/e2e/helpers/index.js | DELETED | 21 | +21 |
| tests/e2e/helpers/screenshots.js | DELETED | 110 | +110 |
| **Total** | | | **+884** |

All line counts match the research-documented baselines exactly (197, 109, 619, 21, 110, 227).

## Commit

**Single atomic commit: `19178c38`**

```
revert(168-01): restore 6 test artifacts silently deleted by 05a7f89d

Recovers v18 Phase 162's restore work. Commit 05a7f89d feat(165-01) dayparting
silently deleted 716 lines of test infrastructure across:
...
Source: D-01 / D-02 of .planning/phases/168-test-doc-quality-cleanup/168-CONTEXT.md
```

## Playwright --list Output (import resolution confirmed)

```
[chromium] › layouts-screenshots.spec.js:24:5 › Layouts › Layout List Page (CONT-05) › can navigate to Layouts page
[chromium] › layouts-screenshots.spec.js:33:5 › Layouts › Layout List Page (CONT-05) › shows layout templates or empty state
...
[chromium] › playlists.spec.js:278:5 › Playlists › Playlist Validation (CONT-10 partial) › cannot create playlist with empty name
[chromium] › playlists.spec.js:317:5 › Playlists › Playlist Empty State (CONT-09 partial) › empty playlist shows add content prompt
...
Total: 24 tests in 2 files
```

Exit code 0 — all imports resolved, no errors. Specs are ready for Wave 2 TQAL edits and Wave 3 execution.

## TQAL Wave 2 Targets Confirmed Present

| Requirement | Target | Status |
|-------------|--------|--------|
| TQAL-01 | `TEST_LAYOUT_PREFIX` in layouts-screenshots.spec.js line 10 import | Present — ready for Wave 2 removal |
| TQAL-03 | "storage state" JSDoc in fixtures/index.js | Present — ready for Wave 2 JSDoc rewrite |
| TQAL-04 | 2x `partial` in playlists.spec.js describe labels | Present (exactly 2) — ready for Wave 2 strip |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all restored content is from the known-good 05a7f89d~1 snapshot. The `partial` labels and `TEST_LAYOUT_PREFIX` import are intentional carry-forwards (per plan) — targets for Wave 2 TQAL edits, not stubs.

## Threat Flags

None — changes limited to test spec files and test helpers (no production code paths, no network endpoints, no auth paths, no schema changes).

## Self-Check: PASSED

- `tests/e2e/layouts-screenshots.spec.js`: FOUND
- `tests/e2e/fixtures/index.js`: FOUND
- `tests/e2e/playlists.spec.js`: FOUND
- `tests/e2e/helpers/index.js`: FOUND
- `tests/e2e/helpers/screenshots.js`: FOUND
- `tests/e2e/helpers.js`: FOUND (assertAppReady + expect import confirmed)
- Commit `19178c38`: FOUND (`git log --oneline -1`)
- Playwright `--list` exit 0: CONFIRMED (24 tests discovered)
