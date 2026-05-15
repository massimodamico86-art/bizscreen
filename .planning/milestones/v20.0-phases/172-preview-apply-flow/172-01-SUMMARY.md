---
phase: 172-preview-apply-flow
plan: 01
subsystem: testing
tags: [testing, wave-0, scaffolds, nyquist, vitest, playwright, skip-stub]

# Dependency graph
requires:
  - phase: 171-template-gallery-redesign
    provides: "Phase 171 E2E spec pattern (loginAndPrepare + test.skip guard + test.describe header) — reused verbatim for preview-apply.spec.js"
  - phase: 170-data-layer-foundation
    provides: "tests/unit/services/marketplaceService.test.js canonical vitest + supabase-mock header — reused for all 3 vitest scaffolds"
provides:
  - "5 net-new test files as skip-stub scaffolds covering TPRV-01..TPRV-06"
  - "Anchor file paths so Plans 02-07 <automated> verify blocks never need MISSING fallback"
  - "25 skipped vitest tests + 5 Playwright test.fixme = 30 placeholders ready for fill"
  - "TEST_SVG fixture embedded in QuickCustomizePanel.test.jsx for Plan 04 reuse"
  - "tests/integration/preview-apply/ directory created — first file under tests/integration/"
affects: [172-02, 172-03, 172-04, 172-05, 172-06, 172-07]

# Tech tracking
tech-stack:
  added: []  # No product deps — test-infra only
  patterns:
    - "Skip-stub scaffold pattern: it.skip + expect(true).toBe(true) + TODO pointer to fill plan"
    - "Wave 0 safety: zero product imports at module scope; dynamic `await import(...)` reserved for .skip bodies"
    - "Describe-level test.skip guard on TEST_USER_EMAIL (Phase 171 convention)"
    - "test.fixme over test.skip for E2E placeholders — stronger 'known pending' semantic"

key-files:
  created:
    - "/Users/massimodamico/bizscreen/tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx"
    - "/Users/massimodamico/bizscreen/tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx"
    - "/Users/massimodamico/bizscreen/tests/unit/services/templateApplyService.test.js"
    - "/Users/massimodamico/bizscreen/tests/integration/preview-apply/rpc-atomicity.test.js"
    - "/Users/massimodamico/bizscreen/tests/e2e/preview-apply.spec.js"
  modified: []

key-decisions:
  - "Used depth ../../../../src/... (4 levels) for tests/unit/components/template-gallery — one level deeper than marketplaceService.test.js due to the added template-gallery/ subdirectory"
  - "Mocked dompurify inline in templateApplyService.test.js so Plan 03 can fill sanitization assertions without touching module-scope imports"
  - "TEST_SVG fixture declared at module scope in QuickCustomizePanel.test.jsx (even though unused today) so Plan 04 fills reference it directly — avoids restructuring when .skip is removed"
  - "No modification to vitest.config.js — existing include glob 'tests/integration/**/*.{test,spec}.{js,jsx,ts,tsx}' already covers the new rpc-atomicity.test.js"
  - "test.fixme chosen over test.skip for E2E — Playwright report surfaces fixme as 'pending implementation' rather than opaque skip"

patterns-established:
  - "Dynamic-import safety: product files referenced only inside .skip/.fixme bodies via `await import(...)` — keeps scaffolds parse-clean before product code exists"
  - "Every it.skip(...) name cites its requirement ID (TPRV-0N) and/or Pitfall number verbatim — grep-friendly for downstream plans"
  - "Each skipped body carries a TODO line pointing to the plan that fills it (Plans 03, 04, 05, 07)"

requirements-completed: [TPRV-01, TPRV-02, TPRV-03, TPRV-04, TPRV-05, TPRV-06]
# Note: Wave 0 "completes" these requirements at the scaffold level only — the
# it.skip bodies ensure downstream plans' <automated> blocks can target concrete
# file paths. Actual requirement satisfaction (unskipped, passing tests) ships
# in Plans 03-07.

# Metrics
duration: 8min
completed: 2026-04-21
---

# Phase 172 Plan 01: Wave 0 Test Scaffolds Summary

**5 net-new skip-stub test files (25 vitest skipped + 5 Playwright test.fixme = 30 placeholders) so every downstream plan's `<automated>` verify block targets a real file path with no MISSING fallback.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-21T20:15:00Z (approx — worktree reset + plan read)
- **Completed:** 2026-04-21T20:23:00Z
- **Tasks:** 3/3
- **Files created:** 5
- **Files modified:** 0
- **Commits:** 3 (one per task)

## Accomplishments

- All 5 Wave 0 test files exist on disk, parse, and collect under their respective runners
- Vitest combined run (`tests/unit/components/template-gallery tests/unit/services/templateApplyService.test.js tests/integration/preview-apply`) reports 25 skipped tests across 4 files, exit code 0
- Playwright `tests/e2e/preview-apply.spec.js --list` lists 5 tests
- Zero product code imported at module scope (grep-verified across all 4 vitest files)
- `tests/integration/preview-apply/` directory created as first integration subdirectory under `tests/integration/` (prior dir contained only `api/`, `featureFlags.test.js`, `usageQuotas.test.js`)
- Total placeholder test count: 30 (spec expected ≥25 — threshold exceeded)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create vitest component-test directory scaffolds (TemplatePreviewModal + QuickCustomizePanel)** — `f4bff828` (test)
2. **Task 2: Create vitest service + integration test scaffolds (templateApplyService + rpc-atomicity)** — `a8986c88` (test)
3. **Task 3: Create Playwright E2E scaffold (preview-apply.spec.js)** — `7eb8ec7f` (test)

**Plan metadata commit:** Appended after this SUMMARY is written.

_Note: Although plan frontmatter marks tasks `tdd="true"`, Wave 0 scaffolds have no implementation to GREEN — tests are deliberately `.skip` because the product code does not yet exist. TDD RED/GREEN cycles fire in Plans 03-07 when bodies are filled and product files land._

## Files Created

- `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` (82 lines) — 8 it.skip cases for TPRV-01, TPRV-03, Pitfalls 2/3/7; mocks supabase + templateApplyService + brandThemeService
- `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` (73 lines) — 6 it.skip cases for TPRV-02, TPRV-03, brand-theme prefill, empty-state (Pitfall 6); declares TEST_SVG fixture; mocks brandThemeService only (real svgCustomizeService helpers)
- `tests/unit/services/templateApplyService.test.js` (69 lines) — 7 it.skip cases for TPRV-04 dispatcher split, DOMPurify sanitization (T-172-01 / Pitfall 5), editorRouteFor (D-15/D-12); mocks supabase + dompurify
- `tests/integration/preview-apply/rpc-atomicity.test.js` (48 lines) — 4 it.skip cases for TPRV-05 atomicity, T-172-03 license gate, in-flight Apply contract; mocks supabase
- `tests/e2e/preview-apply.spec.js` (55 lines) — 5 test.fixme cases for TPRV-01, TPRV-04 (D-15), TPRV-06 (D-14 sessionStorage removal); describe-level test.skip guard on TEST_USER_EMAIL

## Decisions Made

- **Depth `../../../../` for component scaffolds:** The `tests/unit/components/template-gallery/` subdirectory adds one level over the canonical `tests/unit/services/` pattern. Confirmed by counting segments to project root.
- **Dompurify mocked at module scope in unit service test:** Plan 03 can assert sanitize-before-rpc ordering without needing to reshape imports.
- **TEST_SVG at module scope in QuickCustomizePanel file:** Even though unused in the `.skip` placeholder bodies, declaring it now means Plan 04 references the same constant and doesn't need to re-engineer file structure.
- **test.fixme vs test.skip in E2E:** Playwright's report groups `test.fixme` as "pending implementation" (distinct from accidentally-skipped), which is the correct semantic for Wave 0 placeholders.
- **No change to vitest.config.js:** The existing `'tests/integration/**/*.{test,spec}.{js,jsx,ts,tsx}'` glob already picks up the new `rpc-atomicity.test.js` — deviation note not required for Plan 03.

## Deviations from Plan

None — plan executed exactly as written.

All 3 tasks met their acceptance criteria on the first attempt:

- Task 1: 14 skipped tests (criteria: ≥8 + ≥6 = 14) ✓
- Task 2: 11 skipped tests (criteria: ≥7 + ≥4 = 11) ✓
- Task 3: 5 tests listed (criteria: ≥5) ✓

No Rule 1/2/3 auto-fixes required. No architectural (Rule 4) decisions encountered.

## Issues Encountered

None during task execution. One observation for orchestrator:

- The worktree began at commit `ae3b1dd5`, which differs from the expected base `563f53e1`. The `<worktree_branch_check>` hard-reset executed successfully and brought the worktree to the correct base before any task work began.

## User Setup Required

None — Wave 0 is test-infra only. No environment variables, external services, or manual configuration needed.

## Threat Flags

No new security-relevant surface introduced. All 5 files are test-only; the one auth-adjacent file (`tests/e2e/preview-apply.spec.js`) reuses the existing `loginAndPrepare` helper that is already vetted for credential handling (T-172-wave0-01 mitigation from the plan's threat register is honored — no `console.log` of `TEST_USER_*` env vars).

## Next Phase Readiness

**Ready for Wave 1+ (Plans 02-07) concurrent execution:**

- Plan 02 (config wiring, if needed): no-op — `vitest.config.js` already includes `tests/integration/**`, `playwright.config.js` already scans `tests/e2e/**`.
- Plan 03 (`templateApplyService` dispatcher): can fill `tests/unit/services/templateApplyService.test.js` and `tests/integration/preview-apply/rpc-atomicity.test.js` it.skip bodies directly — module-scope mocks already in place.
- Plan 04 (`QuickCustomizePanel`): can fill `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` with `TEST_SVG` already declared.
- Plan 05 (`TemplatePreviewModal`): can fill `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx`; all three mocks (supabase, templateApplyService, brandThemeService) are already wired.
- Plan 07 (E2E full flow): can flip `test.fixme` → `test` in `tests/e2e/preview-apply.spec.js`; describe-level skip guard + beforeEach login already present.

**Wave 0 checklist in `172-VALIDATION.md` lines 53-58 can now flip to `[x]`** — all 5 paths exist, all files parse and collect, no product-code imports at module scope, ≥25 skipped tests reported.

## Self-Check: PASSED

Verified on completion:

- `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` — FOUND
- `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` — FOUND
- `tests/unit/services/templateApplyService.test.js` — FOUND
- `tests/integration/preview-apply/rpc-atomicity.test.js` — FOUND
- `tests/e2e/preview-apply.spec.js` — FOUND
- Commit `f4bff828` — FOUND in `git log`
- Commit `a8986c88` — FOUND in `git log`
- Commit `7eb8ec7f` — FOUND in `git log`
- Combined vitest run: 25 skipped / 0 failed / 0 passed / exit 0 — FOUND in output
- Playwright `--list`: 5 tests listed — FOUND in output
- Zero product imports at module scope (grep `^import.*src/(components|services)` across all 4 vitest files) — FOUND (no matches)

---

*Phase: 172-preview-apply-flow*
*Plan: 01*
*Completed: 2026-04-21*
