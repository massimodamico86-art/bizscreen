---
phase: 179-gallery-virtualization-launch-validation
plan: 03
subsystem: testing
tags: [virtualization, test-scaffold, nyquist-wave-0, vitest, playwright, axe-core, cdp-throttle]

# Dependency graph
requires:
  - phase: 179
    provides: Plan 01 dev-dep install of @axe-core/playwright (Wave 0 dependency)
provides:
  - tests/unit/components/VirtualizedTemplateGrid.test.jsx — Nyquist RED unit gate for SC-1 (overscan ≥3, count=0 guard, aria-rowcount math) + SC-5 (null scrollElement tolerance); 2 it.todo markers reserved for Plan 04 to wire SC-3 scrollToOffset(0) spy + SC-1 overscan spy
  - tests/e2e/template-gallery-perf.spec.js — Nyquist RED E2E gate for SC-2 (<1s first-paint with CDP CPU throttle + catalog-floor pre-flight)
  - tests/e2e/template-gallery-axe.spec.js — Nyquist RED E2E gate for SC-5 (axe-core zero violations on [role='grid'] with aria-rowcount sanity check)
affects: [179-04, 179-05, 179-06, 179-08, 179-09]

# Tech tracking
tech-stack:
  added: []  # Plan 01 owns the @axe-core/playwright devDependency entry
  patterns:
    - "Nyquist RED scaffold pattern: dynamic import inside each `it()` so module-not-found fires per-test (collection succeeds; tests fail). Plan 04 flips to top-level static import once the implementation file ships."
    - "Playwright RED scaffold pattern: skip-guard at describe level + identical gotoTemplates() helper from template-gallery.spec.js → test lists but no-ops when TEST_USER_EMAIL is unset."
    - "Catalog-floor pre-flight gate (rowcount * cols >= 400) in perf spec prevents false GREEN on an unseeded local DB (RESEARCH §Assumptions Log A2 mitigation)."

key-files:
  created:
    - tests/unit/components/VirtualizedTemplateGrid.test.jsx
    - tests/e2e/template-gallery-perf.spec.js
    - tests/e2e/template-gallery-axe.spec.js
  modified: []

key-decisions:
  - "Used dynamic import (`await import(MODULE_PATH)`) inside each test rather than a top-level static import — keeps the suite collectible by vitest while every per-test assertion fails RED with ERR_MODULE_NOT_FOUND. Plan 04 will convert to a static default import once src/components/template-gallery/VirtualizedTemplateGrid.jsx exists."
  - "Kept SC-3 scrollToOffset(0) spy and SC-1 overscan≥3 spy as `it.todo` markers (not `it.skip`) — plan-internal Nyquist signal that Plan 04 must increment the active-test count. Both are pending Plan 04's choice of mock strategy (vi.spy on useVirtualizer options vs vi.mock the module)."
  - "Installed @axe-core/playwright locally for verification only (not committed to package.json). Plan 01's Wave 0 worktree owns the package.json entry; this worktree only needs the package physically present so `npx playwright test --list` succeeds at collection time."

patterns-established:
  - "RED scaffold per-test dynamic import (vitest): keeps suite collection alive when target module is intentionally missing"
  - "Playwright RED E2E scaffold: skip-guard + inline gotoTemplates helper + locator wait on `[role='grid']` with documented future-GREEN seam (Plans 04+05 mount the role)"
  - "Catalog-floor pre-flight in perf spec to prevent false GREEN on unseeded DB"
  - "AxeBuilder scoped via .include('[role=\"grid\"]') to exclude unrelated chrome a11y noise"

requirements-completed: [TVRZ-01, TVRZ-02, TVRZ-05]

# Metrics
duration: 2m 16s
completed: 2026-05-11
---

# Phase 179 Plan 03: Wave 0 Nyquist Scaffolds Summary

**Three RED test scaffolds (1 vitest unit + 2 Playwright E2E) committed and structurally locked, defining the executable verification surface that Plans 04/05/06/08 will green as the gallery virtualization ships.**

## Performance

- **Duration:** 2m 16s
- **Started:** 2026-05-11T00:01:51Z
- **Completed:** 2026-05-11T00:04:07Z
- **Tasks:** 3 / 3
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- Unit scaffold `tests/unit/components/VirtualizedTemplateGrid.test.jsx` (91 lines) — 4 active `it(...)` tests covering SC-1 aria-rowcount math (cols=3, cols=4), SC-1 count=0 guard, SC-5 null-scrollElement tolerance; 2 `it.todo()` markers reserved for Plan 04 (SC-1 overscan≥3 spy + SC-3 scrollToOffset(0) spy).
- Perf E2E scaffold `tests/e2e/template-gallery-perf.spec.js` (73 lines) — single SC-2 test: CDP `Emulation.setCPUThrottlingRate { rate: 1 }` before navigation, `performance.mark/measure` capture, `<1000ms` assertion, catalog-floor pre-flight (`rowcount * 4 >= 400`).
- Axe E2E scaffold `tests/e2e/template-gallery-axe.spec.js` (51 lines) — single SC-5 test: AxeBuilder scoped to `.include('[role="grid"]')`, aria-rowcount sanity (`> 50`), `expect(results.violations).toEqual([])`.
- All three files declare their SC coverage in file-level JSDoc per Validation Strategy lines 60–67.
- Vitest collects the unit scaffold (assertions RED via ERR_MODULE_NOT_FOUND); Playwright lists exactly 1 test for each E2E scaffold.

## Task Commits

Each task was committed atomically:

1. **Task 1: VirtualizedTemplateGrid unit scaffold (SC-1/3/5)** — `2b334b30` (test)
2. **Task 2: Gallery perf E2E scaffold (SC-2 CDP throttle + <1s)** — `2385e228` (test)
3. **Task 3: Gallery axe E2E scaffold (SC-5 zero violations)** — `ebd49ef9` (test)

_Plan metadata commit (this SUMMARY.md) will be added immediately after self-check._

## Files Created/Modified

### Created

- `tests/unit/components/VirtualizedTemplateGrid.test.jsx` — Nyquist RED unit gate. Tests `[role="grid"]` + `aria-rowcount` contract that Plan 04's component must satisfy. Uses dynamic import to keep vitest collection alive against the not-yet-existing module.
- `tests/e2e/template-gallery-perf.spec.js` — Nyquist RED E2E gate for the SC-2 <1s first-paint budget at ~500-template catalog. CDP CPU throttle (rate=1 = no throttle per Chrome DevTools spec; documented intent slot for OQ-2 escalation if CI hardware varies).
- `tests/e2e/template-gallery-axe.spec.js` — Nyquist RED E2E gate for the SC-5 axe-core zero-violations contract. Scoped to `[role="grid"]` so FilterBar/StarterPacksStrip/page chrome a11y noise doesn't contaminate the gate.

### Modified

None.

## Decisions Made

- **Dynamic import vs static import for the unit scaffold:** Chose `await import(MODULE_PATH)` inside each `it(...)` body so vitest's collection phase succeeds (the suite is discoverable + reported in the runner). A top-level static `import VirtualizedTemplateGrid from '...'` would have produced a collection-time crash that hides the count of failing tests — making the RED signal noisy. Plan 04 converts to a top-level static default import on green.
- **`it.todo` vs `it.skip` for spy-based tests:** Used `it.todo()` for the two SC-1 overscan-≥3 and SC-3 scrollToOffset(0) tests so vitest reports them as `2 todo` (visible Nyquist marker) rather than as ignored skips. Plan 04 must flip both to active `it(...)` — that delta is the gate-progress signal.
- **Local-only install of `@axe-core/playwright`:** Plan 01 (Wave 0) owns the package.json devDependency entry. I installed the package physically into this worktree's `node_modules` (without staging the package.json/package-lock.json change) so `npx playwright test --list` collects the axe scaffold here. When Plan 01 merges, its package.json entry persists; the binary already resolved here is what enables this plan's verify step to pass during the worktree's lifetime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking dependency] Missing `node_modules` in worktree**
- **Found during:** Task 1 verify (pre-flight before invoking vitest)
- **Issue:** This worktree was created from base commit `d1a2ffbd` and never had `npm install` run against it. `node_modules/` was absent, so `npx vitest` / `npx playwright` could not execute the plan's `<verify>` commands.
- **Fix:** Ran `npm install --no-audit --no-fund --silent` (top-level) once before Task 1. No package.json/package-lock.json change was staged.
- **Files modified:** None tracked (node_modules is gitignored).
- **Verification:** `ls node_modules/.bin/{vitest,playwright}` returned both binaries.
- **Committed in:** N/A (untracked file system change, gitignored)

**2. [Rule 3 - Blocking dependency] Missing `@axe-core/playwright` for Task 3 `--list`**
- **Found during:** Task 3 plan-pre-read (`grep -E "@axe-core" package.json` returned no match)
- **Issue:** Task 3's `<verify>` runs `npx playwright test ...axe.spec.js --list`. With `@axe-core/playwright` not yet installed (Plan 01 owns this devDependency, runs in a parallel Wave 0 worktree), the import statement at the top of the axe spec file would have thrown at collection time and `--list` would have exited non-zero.
- **Fix:** Installed `@axe-core/playwright` locally via `npm install --save-dev`, then ran `git checkout -- package.json package-lock.json` to revert the manifest change. The package binary remains physically present in this worktree's `node_modules/@axe-core/playwright/`; the manifest entry is left for Plan 01 to commit.
- **Files modified:** None tracked. (Plan 01's package.json change will land via its own commit when its Wave 0 worktree merges.)
- **Verification:** `ls node_modules/@axe-core/playwright` returned the package; `npx playwright test tests/e2e/template-gallery-axe.spec.js --list` exits 0 and lists exactly 1 test; `grep '@axe-core' package.json` exits non-zero (manifest unchanged).
- **Committed in:** N/A (intentionally not committed; ownership belongs to Plan 01)

**3. [Rule 3 - Verify-command mismatch] Plan's `npm run test:unit -- VirtualizedTemplateGrid --run` filter pattern**
- **Found during:** Task 1 verify run
- **Issue:** The plan's literal verify command (`npm run test:unit -- VirtualizedTemplateGrid --run --reporter=verbose`) expands to `vitest run --dir tests/unit VirtualizedTemplateGrid --run` (because `test:unit` in package.json is already `vitest run --dir tests/unit`). Vitest 4.0.14 treats the trailing positional `VirtualizedTemplateGrid` as a directory/path filter, not a name filter, and returns `No test files found, exiting with code 1`.
- **Fix:** Used `npx vitest run tests/unit/components/VirtualizedTemplateGrid.test.jsx` to invoke the file directly. Same RED outcome (4 failed + 2 todo) and identical compliance with the `<verify>` regex `(VirtualizedTemplateGrid|Cannot find module|MODULE_NOT_FOUND)`.
- **Files modified:** None — this is an invocation-only difference. The scaffold file's contents match the plan verbatim.
- **Verification:** `npx vitest run tests/unit/components/VirtualizedTemplateGrid.test.jsx 2>&1 | grep -qE "(VirtualizedTemplateGrid|Cannot find module|MODULE_NOT_FOUND)"` exits 0.
- **Note for Plan 04:** When you flip the scaffold to GREEN, either pass the file path or use `vitest run` (without `--dir`) plus a glob — `npm run test:unit -- tests/unit/components/VirtualizedTemplateGrid` works in vitest 4 because the positional is a path, not a name.
- **Committed in:** N/A (invocation-only deviation)

---

**Total deviations:** 3 auto-fixed (3× Rule 3 — blocking).
**Impact on plan:** All three deviations were environmental (worktree had no node_modules; Plan 01's package install hadn't reached this worktree; the plan's verify command targeted a vitest CLI behavior that doesn't match the installed version). The committed scaffold file contents match the plan verbatim. Zero deviation from the Nyquist RED contract or from the file-level structure required by `<acceptance_criteria>`.

## Issues Encountered

- **`npm run test:unit -- VirtualizedTemplateGrid --run` returns exit 1 with "No test files found":** Documented above as Rule 3 deviation. Plan 04 should use a path-based invocation for the unit verify step.

## User Setup Required

None — no external service configuration touched.

## Next Phase Readiness

**For Plan 04 (VirtualizedTemplateGrid component):**
- Unit scaffold expects `src/components/template-gallery/VirtualizedTemplateGrid.jsx` with a default export. The component must mount `<div role="grid" aria-rowcount={ceil(templates.length / cols)}>` and tolerate `scrollElement={null}` on first render. The 2 `it.todo` markers must be flipped to active `it(...)` with a chosen mock strategy (vi.spy on useVirtualizer options vs vi.mock the module) — both gates verify SC-1 (overscan ≥3) and SC-3 (scrollToOffset(0) on templates identity change).

**For Plan 05 (TemplateGalleryPage rewire):**
- Both E2E scaffolds locate the virtual container via `page.locator('[role="grid"]').first()` and require `aria-rowcount` to be set. Plan 05 must wire `TemplateGalleryPage.jsx` to mount Plan 04's `VirtualizedTemplateGrid` in place of the existing full-DOM render and ensure the gallery page becomes the active surface when the sidebar Templates button is clicked.

**For Plan 06 (perf scenarios):**
- The perf spec's catalog-floor pre-flight (`rowcount * 4 >= 400`) will fail GREEN unless the test environment has ≥400 templates seeded. Plan 06 must either seed the test DB to that floor or document the dependency in its own SUMMARY.

**For Plan 08 (axe):**
- Axe scaffold's aria-rowcount sanity (`> 50`) implicitly requires a ~200-template floor at cols=4 (or smaller floor at cols=1/2). Same seeding consideration as Plan 06.

**Blockers / concerns:**
- None. Plan 01's package.json change for `@axe-core/playwright` will merge cleanly — the package was already a fresh add (no version range conflict possible in this worktree).

## Threat Flags

None. All three scaffolds are test files; they do not introduce new endpoints, auth paths, file access, or schema. SC-5 (a11y) is itself a defensive contract.

## TDD Gate Compliance

All three tasks have `tdd="true"` in the plan and Wave 0 calls for RED-only commits. Each task's commit is a `test(...)` commit. Plans 04 (unit GREEN) + 05 (E2E mount GREEN) + 06 (perf GREEN) + 08 (axe GREEN) will provide the matching `feat(...)` GREEN commits per the phase plan.

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- **Created files exist:**
  - `tests/unit/components/VirtualizedTemplateGrid.test.jsx` — FOUND
  - `tests/e2e/template-gallery-perf.spec.js` — FOUND
  - `tests/e2e/template-gallery-axe.spec.js` — FOUND
- **Commits exist on the worktree branch:**
  - `2b334b30` — FOUND (Task 1: unit scaffold)
  - `2385e228` — FOUND (Task 2: perf scaffold)
  - `ebd49ef9` — FOUND (Task 3: axe scaffold)
- **RED state verified:**
  - Unit scaffold: `npx vitest run tests/unit/components/VirtualizedTemplateGrid.test.jsx` → `4 failed + 2 todo` (1 file collected; exits non-zero) — Nyquist RED CONFIRMED.
  - Perf scaffold: `npx playwright test tests/e2e/template-gallery-perf.spec.js --list` → `Total: 1 test in 1 file` (exits 0) — collection-only PASS, runtime will RED against current full-DOM gallery.
  - Axe scaffold: `npx playwright test tests/e2e/template-gallery-axe.spec.js --list` → `Total: 1 test in 1 file` (exits 0) — collection-only PASS, runtime will RED against current full-DOM gallery.
- **`it.todo` count in unit scaffold:** 2 (Plan 04 must drive this to 0).

---

*Phase: 179-gallery-virtualization-launch-validation*
*Plan: 03 (Wave 0 — Nyquist RED scaffolds)*
*Completed: 2026-05-11*
