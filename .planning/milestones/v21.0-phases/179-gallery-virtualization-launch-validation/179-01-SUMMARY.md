---
phase: 179-gallery-virtualization-launch-validation
plan: 01
subsystem: infra
tags: [virtualization, dependency-install, supply-chain, a11y, dom-safety, tanstack-react-virtual, axe-core-playwright]

# Dependency graph
requires:
  - phase: 178-vertical-content-seeding
    provides: ~485-template active catalog that justifies virtualization
provides:
  - "@tanstack/react-virtual ^3.13.24 in dependencies (TVRZ-01 virtualization mechanism)"
  - "@axe-core/playwright ^4.11.3 in devDependencies (SC-5 axe-core a11y scanner for Plan 08)"
  - "Locked DOM-safety contract: zero `dangerouslySetInnerHTML` in src/components/template-gallery/ and src/pages/TemplateGalleryPage.jsx (T-179-03 mitigation gate for Plans 04/05)"
  - "Site-wide `dangerouslySetInnerHTML` baseline = 3 matches (informational delta gate for downstream plans)"
affects:
  - 179-02 (Wave 0 — useContainerColumns hook, parallelizable with this plan complete)
  - 179-03 (Wave 0 — measurement utilities, parallelizable)
  - 179-04 (Wave 1 — VirtualizedTemplateGrid imports useVirtualizer)
  - 179-05 (Wave 1 — gallery rewire; inherits no-dangerouslySetInnerHTML contract)
  - 179-08 (Wave 4 — a11y/perf gate uses AxeBuilder)

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-virtual ^3.13.24 — virtualization primitive for ≥500-template gallery (useVirtualizer named export)"
    - "@axe-core/playwright ^4.11.3 — devDependency-only WCAG/ARIA scanner for E2E a11y gate (AxeBuilder default export)"
  patterns:
    - "Pinned-with-carat (^X.Y.Z) for supply-chain mitigation — patch-only updates within minor version"
    - "Threat-model-driven install verification — Task 1/2 acceptance criteria re-verify version prefix post-install (matches T-179-01/02 dispositions)"
    - "DOM-safety grep gate as contract-as-code — Task 3 locks the contract for downstream plans without modifying any source file"

key-files:
  created: []
  modified:
    - "package.json — +1 dependency (@tanstack/react-virtual), +1 devDependency (@axe-core/playwright)"
    - "package-lock.json — reproducible install tree for both new packages"

key-decisions:
  - "Pinned @tanstack/react-virtual to ^3.13.24 (carat allows 3.13.x patches only) — patch-only supply-chain mitigation per T-179-01"
  - "Pinned @axe-core/playwright to ^4.11.3 in devDependencies (not dependencies) — never reaches production bundle per T-179-02"
  - "Verified @axe-core/playwright version via direct fs.readFileSync(node_modules/@axe-core/playwright/package.json) — the package's `exports` map blocks the `require('@axe-core/playwright/package.json')` subpath defined in the plan's acceptance criteria; substantive verification (require() loads, default export is a function, version starts with 4.11) is unchanged"
  - "Task 3 committed as --allow-empty (audit/gate task) — no file changes, but tracks the threat-model lockpoint for traceability"

patterns-established:
  - "Supply-chain pin pattern: `^MAJOR.MINOR.PATCH` (carat) + post-install version-prefix grep in acceptance criteria"
  - "Audit-only task pattern: empty commit with `chore(...)` prefix records gate verification when no files change"
  - "Subpath-export workaround: when a package's `exports` map blocks `require('<pkg>/package.json')`, fall back to direct fs read of node_modules/<pkg>/package.json"

requirements-completed: [TVRZ-01, TVRZ-05]

# Metrics
duration: 1.8min
completed: 2026-05-10
---

# Phase 179 Plan 01: Wave 0 BLOCKING Install Summary

**`@tanstack/react-virtual` ^3.13.24 (runtime) + `@axe-core/playwright` ^4.11.3 (devDependency) installed, importable, version-prefix-verified; DOM-safety grep gate clean across the gallery surface (zero `dangerouslySetInnerHTML` matches in `src/components/template-gallery/` + `src/pages/TemplateGalleryPage.jsx`); site-wide baseline = 3 matches (all outside gallery — TemplateDraftPreview admin queue x1, HelpCenterPage x2).**

## Performance

- **Duration:** 1.8 min (110 sec)
- **Started:** 2026-05-10T23:59:51Z
- **Completed:** 2026-05-11T00:01:41Z
- **Tasks:** 3
- **Files modified:** 2 (package.json, package-lock.json)
- **Commits:** 3 task + 0 metadata so far (plan-level metadata commit by orchestrator after wave completes)

## Accomplishments

- `@tanstack/react-virtual@3.13.24` installed (alphabetically sorted between `@supabase/supabase-js` and `date-fns` in `dependencies`); `useVirtualizer` named export reachable via `require()`.
- `@axe-core/playwright@4.11.3` installed as devDependency (alphabetically sorted between `@anthropic-ai/sdk` and `@eslint/js`); `AxeBuilder` default export resolves as a function.
- `package-lock.json` regenerated with both packages — supply-chain tampering catchable via lockfile diff at PR time.
- DOM-safety threat-model gate (T-179-03) locked: zero `dangerouslySetInnerHTML` matches in the gallery surface; downstream Plans 04 and 05 inherit the contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @tanstack/react-virtual at ^3.13.24** — `382a1357` (feat)
2. **Task 2: Install @axe-core/playwright at ^4.11.3 as devDependency** — `7190d2bf` (feat)
3. **Task 3: Lint/grep gate — dangerouslySetInnerHTML banned in template-gallery surfaces** — `330cbb68` (chore, --allow-empty audit commit)

**Plan metadata commit:** _(deferred — parallel-wave orchestrator commits SUMMARY.md after all wave-0 agents return; STATE.md/ROADMAP.md owned by orchestrator)_

## Files Created/Modified

- `package.json` — +2 entries: `"@tanstack/react-virtual": "^3.13.24"` in dependencies; `"@axe-core/playwright": "^4.11.3"` in devDependencies. Alphabetical ordering preserved in both blocks.
- `package-lock.json` — Reproducible install tree refreshed for both packages (24 new lines in the second commit alone; full transitive closure recorded).

## Decisions Made

- **Carat-pinned both packages** (`^3.13.24` / `^4.11.3`) per supply-chain mitigations T-179-01 and T-179-02 — allows patch-only updates within the validated minor; `package-lock.json` diff is the canonical tampering catch at PR time.
- **`@axe-core/playwright` as devDependency only** — test-only infrastructure; T-179-02 disposition states it must never reach the production bundle. Confirmed under `devDependencies` (line 62 of package.json post-Task-2).
- **Task 3 empty-commit pattern** — Per-task atomicity is non-negotiable in this workflow; Task 3 is a verification-only gate (no file edits), so an `--allow-empty` `chore(...)` commit records the gate check in the git log without polluting the working tree. Pattern is reusable for any future audit-only task.
- **`package.json` subpath-export workaround** — The plan's Task 2 acceptance criterion uses `require('@axe-core/playwright/package.json')` to read the version; the package's `exports` map blocks that subpath (Node 25.0.0 throws `ERR_PACKAGE_PATH_NOT_EXPORTED`). I fell back to `fs.readFileSync('node_modules/@axe-core/playwright/package.json')` which is the equivalent verification with no security/correctness implication. Substantive gates (require() load, default-export type, version starts with `4.11.`) all PASS.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch was based on older commit `ae3b1dd5` instead of expected `d1a2ffbd`**
- **Found during:** Pre-execution `<worktree_branch_check>` gate.
- **Issue:** `git merge-base HEAD d1a2ffbd59afe083e69810c322e5470613a84266` returned `ae3b1dd5` (older base), which means the worktree branch was created from a previous commit. Per the prompt's explicit fail-safe protocol, this required a hard reset to the correct base before any work — otherwise the post-wave merge would carry stale state.
- **Fix:** `git reset --hard d1a2ffbd59afe083e69810c322e5470613a84266` (this is the only sanctioned `git reset --hard` in this agent's flow, explicitly authorized by the `<worktree_branch_check>` instructions).
- **Files modified:** None (HEAD moved; working tree was clean of intentional changes — pre-existing untracked items like `playwright-report/index.html` and `src/hooks/useAbortSignal.js` were created by other tooling and were unrelated to this plan).
- **Verification:** `git rev-parse HEAD == d1a2ffbd59afe083e69810c322e5470613a84266` ✓.
- **Committed in:** N/A (state reset, no file change).

**2. [Rule 1 - Bug] `require('@axe-core/playwright/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED` in Node 25 because the package's `exports` map does not include `./package.json`**
- **Found during:** Task 2 (axe-core install verification).
- **Issue:** The plan's Task 2 verify command (`node -e "console.log(require('@axe-core/playwright/package.json').version)"`) fails with `Error [ERR_PACKAGE_PATH_NOT_EXPORTED]` because modern packages that ship an `exports` field do not implicitly expose `./package.json` as a subpath import. Node 25's CJS resolver respects the `exports` allowlist strictly. This is a packaging convention issue (not a fault of the install) — the plan was authored against an older Node version that allowed the subpath.
- **Fix:** Switched to a functionally-equivalent verification that reads `node_modules/@axe-core/playwright/package.json` directly via `fs.readFileSync()`. Confirms version is `4.11.3` (starts with `4.11.`), which is the substantive check.
- **Files modified:** None — workaround was a one-shot verification command.
- **Verification:** All Task 2 substantive acceptance criteria still pass: `grep -F '"@axe-core/playwright": "^4.11' package.json` exits 0; package is in `devDependencies` block; `require('@axe-core/playwright')` resolves; default export `typeof === 'function'`. Only the version-read command itself was adjusted.
- **Committed in:** `7190d2bf` (Task 2 commit covers the install; the verification workaround is documented here for downstream plans that may hit the same issue).

---

**Total deviations:** 2 auto-fixed (1 blocking-environment, 1 bug-in-plan-verify-command)
**Impact on plan:** Neither deviation changes the substance of what shipped. Worktree base correction is a workflow guardrail. Subpath-exports workaround is an environment compatibility fix; the package itself installs and works exactly as the plan specifies.

## Issues Encountered

- **`npm install` surfaced 47 audit warnings** (3 low, 31 moderate, 12 high, 1 critical) on the existing dependency tree. These are pre-existing in the codebase and are explicitly out of scope per the executor-examples scope boundary (don't fix audit warnings unrelated to the current task). Logged here for transparency; no remediation taken.
- **`npm install` surfaced 8 `npm warn deprecated` messages** for transitive dev dependencies (inflight, npmlog, rimraf@3, abab, glob@7, are-we-there-yet, gauge@3, domexception). All pre-existing transitive; not introduced by this plan; not in scope for Plan 01.

## Threat Flags

None — both packages introduce attack surface explicitly modeled in the plan's threat register (T-179-01, T-179-02). Mitigations are in place and verifiable post-install. No new trust boundary or DOM/network/auth surface created beyond what the plan anticipated.

## Known Stubs

None — this plan installs library dependencies and verifies a no-op grep gate. No source files were created or modified; no stub UI/data paths exist.

## TDD Gate Compliance

N/A — Plan 01 is `type: execute`, not `type: tdd`. No RED→GREEN→REFACTOR gate sequence required. (Wave-0 RED scaffolding lives in Plan 03 per the phase plan.)

## User Setup Required

None — both packages install via `npm install` (no env vars, no external service config, no manual steps). Plan 08 (axe-core a11y gate) will exercise `@axe-core/playwright` at E2E time using an already-running Playwright harness — no additional admin action needed.

## Baseline Site-wide `dangerouslySetInnerHTML` Count (for Plans 04/05 delta gate)

Pre-plan-01 baseline: **3 matches** in src/, all OUTSIDE the gallery surface area:

| File | Line | Context | Status |
|------|------|---------|--------|
| `src/components/Admin/TemplateDraftPreview.jsx` | 31 | Admin draft preview (Phase 177 — 4th byte-equal DOMPurify config mirror site) | OUT-OF-SCOPE — admin queue, not gallery |
| `src/pages/HelpCenterPage.jsx` | 289 | Help center bulleted list formatter | OUT-OF-SCOPE — help docs, not gallery |
| `src/pages/HelpCenterPage.jsx` | 293 | Help center paragraph formatter | OUT-OF-SCOPE — help docs, not gallery |

**Plans 04 and 05 MUST NOT increase this count** (per T-179-03 disposition). Their own verification re-runs the same site-wide `grep` and asserts ≤ 3.

## Self-Check

**1. Files claimed to exist:**
- `package.json` — FOUND (modified, contains both new entries — verified via grep in commit hashes 382a1357 and 7190d2bf)
- `package-lock.json` — FOUND (modified, contains both new entries — verified)
- `node_modules/@tanstack/react-virtual/` — FOUND (version 3.13.24 — verified via fs)
- `node_modules/@axe-core/playwright/` — FOUND (version 4.11.3 — verified via fs)

**2. Commits claimed to exist:**
- `382a1357` (Task 1) — FOUND in `git log --oneline -5`
- `7190d2bf` (Task 2) — FOUND in `git log --oneline -5`
- `330cbb68` (Task 3) — FOUND in `git log --oneline -5`

**3. Verification commands re-run after SUMMARY write:**
- `node -e "require('@tanstack/react-virtual'); require('@axe-core/playwright'); console.log('OK')"` → OK
- versions → `{ a: '3.13.24', b: '4.11.3' }`
- `! grep -rn "dangerouslySetInnerHTML" src/components/template-gallery/ src/pages/TemplateGalleryPage.jsx 2>/dev/null` → exit 0 (gate clean)

## Self-Check: PASSED

## Next Phase Readiness

**Unblocked for parallel execution (Wave 0):**
- **Plan 02** (useContainerColumns hook) — depends on no install; can start now.
- **Plan 03** (measurement utilities + RED scaffolds) — depends on no install; can start now.

**Unblocked for serial execution (Wave 1, after Wave 0):**
- **Plan 04** (VirtualizedTemplateGrid) — imports `useVirtualizer` from `@tanstack/react-virtual` (NOW INSTALLED).
- **Plan 05** (gallery page rewire) — inherits no-`dangerouslySetInnerHTML` contract from Task 3.

**Unblocked for Wave 4 (a11y/perf gate):**
- **Plan 08** — imports `AxeBuilder` from `@axe-core/playwright` (NOW INSTALLED).

**Carryover blockers/concerns:** None. Pre-existing npm audit warnings and deprecated-transitive warnings are unchanged by this plan and are out of scope.

---
*Phase: 179-gallery-virtualization-launch-validation*
*Completed: 2026-05-10*
