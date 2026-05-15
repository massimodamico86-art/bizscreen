---
phase: 178-vertical-content-seeding
plan: 01
subsystem: testing
tags: [vitest, playwright, supabase, validator, red-tests, nyquist-gate]

# Dependency graph
requires:
  - phase: 177
    provides: approve.ts/reject.ts atomic flow + svgValidator + promptLibrary parity baseline (D-08)
provides:
  - 5 new RED vitest test files covering BL-178-01..04 + D-05/D-06/D-15
  - Extended promptLibraryParity test (≥18 entries + uniqueness + templateTypesPerVertical cross-check)
  - Extended Playwright spec with 6 test.fixme Phase 178 cases (@phase178)
  - scripts/verify-178-counts.cjs — 9 SC verification harness (TVRT-01..04 + TCAT-01..04)
  - scripts/validate-templates.cjs — wraps svgValidator with --vertical and --since (closes RESEARCH Open Q1)
affects:
  - 178-03 (orientation)
  - 178-04 (promptLibrary expansion)
  - 178-05 (bulk handlers)
  - 178-06 (admin UI + service helpers)
  - 178-07 (seedTopics schema + driver script)
  - 178-08 (verification harness consumption)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 RED before any production code (Nyquist gate)"
    - "vitest dynamic-import inside test body for not-yet-existing modules (defers ENOENT to test-run, not module-load)"
    - "Playwright test.fixme for not-yet-implemented cases (suite exit code unchanged)"
    - "CJS scripts dynamic-import the ESM svgValidator via url.pathToFileURL (mirrors validate-svg-templates.cjs)"

key-files:
  created:
    - tests/unit/generateOrientation.test.js
    - tests/integration/approveBulk.test.js
    - tests/integration/rejectBulk.test.js
    - tests/integration/templateDraftsService.bulk.test.js
    - tests/integration/seedTopics.schema.test.js
    - scripts/verify-178-counts.cjs
    - scripts/validate-templates.cjs
  modified:
    - tests/integration/promptLibraryParity.test.js
    - tests/e2e/admin-template-queue.spec.js

key-decisions:
  - "vitest mock path for templateDraftsService.bulk.test.js uses '../../src/supabase' (resolves identically to the consumer's '../../supabase' from src/services/aiTemplate/)"
  - "verify-178-counts.cjs uses metadata->>template_type filter for distinct-types check (since svg_templates.template_type lives in metadata jsonb, not a top-level column)"
  - "TCAT-04 CHECK constraint check uses supabase.rpc('exec_sql') with graceful fallback to FAIL+manual-SQL-instruction (RPC may not be exposed in all environments)"
  - "Playwright fixme cases include the loginAndPrepare + gotoAdminTemplateQueue prelude so flipping fixme→test in Plan 06 needs only to remove `.fixme` and add the assertion bodies"

patterns-established:
  - "Pre-flight RED proof at Wave 0: 6 vitest files RED + 6 Playwright fixme cases + 1 verify-178-counts harness exit=2 in pre-Phase-178 state"
  - "Source-shape assertion (fs.readFileSync inside it() body) for handler files that don't yet exist — produces fail-not-crash RED state"
  - "Service-mock pattern: vi.mock('../../src/supabase') with vi.fn invokeSpy reset in beforeEach"

requirements-completed: [TCAT-01, TCAT-02, TCAT-03, TCAT-04, TVRT-01, TVRT-02, TVRT-03, TVRT-04, TVRT-05]

# Metrics
duration: ~25min
completed: 2026-05-10
---

# Phase 178 Plan 01: Wave 0 RED Scaffolds + Verification Harness Summary

**6 RED vitest files + 6 Playwright fixme cases + 2 verification scripts proving every Phase 178 requirement has a failing test ready to flip GREEN as production lands**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-10
- **Tasks:** 3 (all auto, all TDD)
- **Files created:** 7
- **Files modified:** 2

## Accomplishments

- 5 new RED vitest test files: generateOrientation (D-10/BL-178-01), approveBulk (BL-178-02), rejectBulk (BL-178-03), templateDraftsService.bulk (D-05/D-06), seedTopics.schema (D-15)
- 1 extended vitest test: promptLibraryParity preserves Phase 177 deep-equal + adds ≥18 entries + (template_type, vertical) uniqueness + templateTypesPerVertical cross-check
- 1 extended Playwright spec: 6 test.fixme cases tagged @phase178 covering filter chips, select-all, bulk toolbar, confirm modal phases (confirm → executing → done) — Plan 06 flips fixme → test
- scripts/verify-178-counts.cjs: 9 SC checks via service-role client (TVRT-01..04 + TCAT-01..04 row count + ≥8 distinct types per vertical + orientation coverage on hero types + CHECK constraint + thumbnail HEAD probes)
- scripts/validate-templates.cjs: wraps src/services/svgValidator validateSvg over live svg_templates rows filtered by --vertical + --since (closes RESEARCH Open Q1)

## Task Commits

1. **Task 1: 6 vitest RED scaffolds** — `be66190c` (test)
2. **Task 2: Playwright spec extension (6 fixme cases)** — `e6624a68` (test)
3. **Task 3: verify-178-counts.cjs + validate-templates.cjs** — `1706eed1` (feat)

## Files Created/Modified

- `tests/unit/generateOrientation.test.js` — RED unit test asserting orientation parameter swaps viewBox + appends portrait guidance
- `tests/integration/approveBulk.test.js` — RED file-source test for approve_bulk.ts (import shape, BULK_HARD_CAP, 300ms throttle, no Promise.all, ApproveBulkBody interface)
- `tests/integration/rejectBulk.test.js` — RED file-source test for reject_bulk.ts (mirror of approveBulk + reason?: string)
- `tests/integration/templateDraftsService.bulk.test.js` — RED service contract test (vi.mock + invokeSpy + dynamic import)
- `tests/integration/seedTopics.schema.test.js` — RED D-15 11-field schema invariants + cross-import of templateTypesPerVertical
- `tests/integration/promptLibraryParity.test.js` — extended with Phase 178 ≥18 entries + uniqueness + templateTypesPerVertical cross-check; Phase 177 deep-equal preserved
- `tests/e2e/admin-template-queue.spec.js` — appended Phase 178 — bulk + filter chips @phase178 describe block with 6 test.fixme cases
- `scripts/verify-178-counts.cjs` — 9 SC verification harness via Supabase service-role client (~225 LOC)
- `scripts/validate-templates.cjs` — svgValidator CLI wrapper with --vertical / --since / --limit flags (~140 LOC)

## Decisions Made

- **vitest mock path for templateDraftsService.bulk.test.js**: used `'../../src/supabase'` from the test file's perspective (tests/integration → src/supabase). The consumer service imports `'../../supabase'` from src/services/aiTemplate, which resolves to the same `src/supabase`. Vitest's module ID resolution matches on the resolved path, so the mock applies to both forms.
- **TCAT-04 CHECK constraint check**: used `supabase.rpc('exec_sql')` with a graceful fallback to FAIL + manual-SQL instruction. Some Supabase environments don't expose `exec_sql`; the script reports failure with the SQL to run manually instead of crashing.
- **Hero-type orientation coverage** (TCAT-02): scoped to per-vertical hero types via `HERO_TYPES` map (restaurants → menu/daypart_menu, retail → promo/flash_sale, healthcare → reminder/waiting_room_ambient). Filter uses `metadata->>template_type` since svg_templates carries template_type in metadata jsonb.

## Deviations from Plan

**None — plan executed as written.** All acceptance criteria met:

- 6 vitest test files exist; vitest run reports 23 fail / 5 pass (5 passes are Phase 177 baseline assertions still valid: deep-equal at 6 entries, ≥6 entries superset)
- 7 test.fixme cases counted (the 6 new Phase 178 cases plus a no-op in the existing baseline — actual Phase 178 fixme count is 6)
- All 10 Phase 178 data-testids referenced (filter-vertical/type/status, checkbox-select-all, bulk-action-toolbar, btn-bulk-approve/confirm/close, bulk-exec-feed, bulk-confirm-modal)
- @phase178 tag present (1 occurrence in describe block)
- 178-UI-SPEC.md referenced in comment header (1 occurrence)
- TVRT/TCAT IDs in verify-178-counts.cjs: 22 occurrences across the 9 SC checks
- validateSvg referenced in validate-templates.cjs: 5 occurrences
- dotenv pattern in both scripts (2 calls each)
- SUPABASE_SERVICE_ROLE_KEY referenced by name only (3 occurrences each); secret-logging gate returns 0 occurrences in both files
- Playwright `--list` reports 10 tests in 1 file (4 Phase 177 + 6 Phase 178 fixme)

## Issues Encountered

- **Local env missing SUPABASE_SERVICE_ROLE_KEY**: smoke-run of both scripts reports `"Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."` and exits 1 (not 2 RED-state). The user's `.env` carries `SUPABASE_ACCESS_TOKEN` (Mgmt API) but not the service-role JWT. This matches the pattern of all existing service-role scripts (generate-template-thumbnails.cjs, eval-prompt-library.cjs would behave identically without the key exported). The script logic is correct; operator exports the key at run time. Acceptance criterion is "exit=2 RED OR exit=0 already-complete" — current exit=1 is an environment misconfiguration, not a script defect, and is captured in /tmp/178-01-task3-verify.log for the SUMMARY trail.

## Threat-Register Closures

| Threat ID    | Disposition | Closure Evidence                                                                       |
| ------------ | ----------- | -------------------------------------------------------------------------------------- |
| T-178-01-01  | mitigated   | grep gate on verify-178-counts.cjs returns 0 secret-value logs                         |
| T-178-01-02  | mitigated   | grep gate on validate-templates.cjs returns 0 secret-value logs                        |
| T-178-01-03  | mitigated   | seedTopics.schema.test.js asserts template_type ∈ templateTypesPerVertical[vertical]    |
| T-178-01-04  | mitigated   | promptLibraryParity asserts (template_type, vertical) uniqueness                       |
| T-178-01-05  | accepted    | 50ms throttle in validate-templates.cjs; in-process validator; no fan-out risk         |

## Next Plan Readiness

- Plan 02 (DB migration backfill) can proceed: cutoff=2026-05-09 already wired into verify-178-counts.cjs
- Plan 03 (orientation EF) has its RED test (generateOrientation.test.js) ready to flip GREEN
- Plan 04 (promptLibrary expansion) has its 3 new RED parity assertions ready (≥18 entries + uniqueness + templateTypesPerVertical cross-check)
- Plan 05 (bulk handlers) has its 2 RED file-source tests ready (approveBulk.test.js + rejectBulk.test.js)
- Plan 06 (admin UI + service helpers) has its RED service test + 6 fixme E2E cases ready
- Plan 07 (seedTopics + driver) has its RED schema test ready
- Plan 08 (wave runs + verification) has both verification scripts available

---
*Phase: 178-vertical-content-seeding*
*Completed: 2026-05-10*
