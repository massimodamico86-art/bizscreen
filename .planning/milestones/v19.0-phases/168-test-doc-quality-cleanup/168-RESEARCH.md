# Phase 168: Test & Doc Quality Cleanup - Research

**Researched:** 2026-04-13
**Domain:** Playwright E2E spec restoration + documentation/label cleanup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Restoration**
- **D-01:** Restore all three deleted files from the single snapshot `05a7f89d~1` (parent of the accidental-delete commit). Single known-good revision guarantees the three files are internally consistent — the state they last coexisted in. Use `git show 05a7f89d~1:<path> > <path>`.
- **D-02:** Restore is a standalone atomic commit (one commit for the three files together, message frames it as a regression recovery of v18 Phase 162's work). TQAL fixes land in separate atomic commits after.

**TQAL Fixes**
- **D-03: TQAL-01** — Remove `TEST_LAYOUT_PREFIX` from the import statement at line ~10 of `tests/e2e/layouts-screenshots.spec.js`. Keep the other imports (`LAYOUT_PRESETS`, `WIDGET_TYPES`) intact. Do not reorder unrelated code.
- **D-04: TQAL-02** — Fix stale Phase 155 SC3 text in `.planning/milestones/v18.0-ROADMAP.md`. Confirm current text against the intent captured in `v18.0-MILESTONE-AUDIT.md` line 36 ("should read locale preference wording, still shows old language variants text, reverted by worktree merge commit 78777e2b"). Researcher must diff current file against 78777e2b parent to identify the exact span.
- **D-05: TQAL-03** — Update `tests/e2e/fixtures/index.js` JSDoc so `authenticatedPage` description references `loginAndPrepare()` rather than "auth from storage state (project config)". Replace the stale USAGE PATTERNS comment block accordingly. Do not change runtime behavior, only docstrings.
- **D-06: TQAL-04** — Strip the `partial` keyword from two `test.describe(...)` labels in `tests/e2e/playlists.spec.js`: `'Playlist Empty State (CONT-09 partial)'` → `'Playlist Empty State (CONT-09)'` and `'Playlist Validation (CONT-10 partial)'` → `'Playlist Validation (CONT-10)'`. No other changes to describe blocks.

**Verification**
- **D-07:** Run **full Playwright e2e** against the three restored specs. Required envs: `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD`, admin creds as applicable. Goal: all three files green.
- **D-08:** If restored specs fail due to product drift since Phase 162, **fix forward within this phase**: update selectors / flows / helpers to match current product. Phase can grow in scope for test-side fixes. Product bugs surfaced (not test-side drift) stay out of scope — document them as deferred items.
- **D-09: ESLint scope** — Run eslint on exactly the three touched files. Require zero errors/warnings. Do not run project-wide lint.

### Claude's Discretion
- Exact wording of restore commit message (should credit Phase 162 and name commit 05a7f89d as the regression source).
- Whether to split TQAL fixes into 4 atomic commits or group cosmetic ones.
- Selector/flow fixes needed to stabilize restored specs — executor decides per failure, guided by D-08 test-vs-product boundary.

### Deferred Ideas (OUT OF SCOPE)
- Audit for other silent regressions in 05a7f89d (broader forensics pass).
- Product bugs surfaced by e2e run (route to a new dedicated phase).
- Overlap consolidation between `playlist-template.spec.js` and restored `playlists.spec.js`.
- ESLint / pre-commit rule to flag commits deleting `tests/e2e/*.spec.js` files.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TQAL-01 | Unused TEST_LAYOUT_PREFIX import removed from layouts-screenshots.spec.js | File is DELETED on main; must be restored from `05a7f89d~1` before edit. Target line confirmed at line 10 (see "TQAL-01 Target" below). |
| TQAL-02 | ROADMAP.md Phase 155 SC3 stale text corrected | Target file (`v18.0-ROADMAP.md`) SC3 at line 239 is ALREADY CORRECT — "locale preference" wording. Staleness now lives on the 1-line summary at **line 120** and the matching summary in `.planning/ROADMAP.md` line 120. See "TQAL-02 Target Ambiguity" below — planner must choose scope. |
| TQAL-03 | fixtures/index.js JSDoc updated to reflect loginAndPrepare() (not storageState) | File is DELETED on main; must be restored. Exact JSDoc strings to change are quoted in "TQAL-03 Target" below. |
| TQAL-04 | CONT-09/CONT-10 "partial" labels resolved in playlists.spec.js | File on main is a 209-line STUB (truncated from 619 by commit 05a7f89d). Full 619-line version at `05a7f89d~1` has exactly 2 `partial` occurrences, both on describe labels. Must be restored to 619 lines before edit. |
</phase_requirements>

## Summary

Phase 168 is a **restore-then-cleanup** phase. The apparent "4 small fixes" are currently **untargetable** because three of the four touch files that were silently deleted or truncated by commit `05a7f89d` (a Phase 165-01 dayparting commit that also deleted 716 lines of test infrastructure). All TQAL-01/03/04 editing must happen on content restored from `05a7f89d~1`; TQAL-02 is the only purely in-place doc edit.

Two critical surprises the planner must pre-empt:

1. **ESLint is globally broken on main.** `eslint.config.js` was deleted in commit `289a2c7b` (Phase 151-02), and ESLint 9.39.1 refuses to run without a flat config file. `npm run lint` currently errors out project-wide. TQAL-01 SC1 ("ESLint passes clean on this file") is **currently unverifiable** — either the phase must also (a) restore/add `eslint.config.js`, or (b) reinterpret SC1 as "no unused identifiers per static visual inspection / `eslint --no-config-lookup`". The restored config historically ignored `tests/**`, so even if restored verbatim it would not lint the target file. Planner decision point — recommend adding a minimal flat config with `tests/` NOT in ignores so D-09's exact eslint command can actually succeed.
2. **TQAL-02 target text is already correct.** `v18.0-ROADMAP.md` line 239 (SC3) already reads "switch locale preference via Settings, language preference persists across reload, and fallback chain resolves user preferred to browser to default 'en'" — the intended wording. The 78777e2b reversion appears to have been itself reverted during Phase 155-03 gap closure. The only remaining "stale" wording is the 1-line summary at **line 120** ("rendering, language variants, and fallback"), which also appears in `.planning/ROADMAP.md` line 120. Planner must either (a) declare TQAL-02 a no-op (closing SC2 trivially), or (b) reinterpret TQAL-02 as "fix line 120 summary". Recommendation: option (b) — fix line 120 in both files for consistency with the LANG-01/02/03 requirement model.

Additional restoration dependency chain discovered: `layouts-screenshots.spec.js` imports `./helpers/index.js` (also deleted in `05a7f89d`), which imports `./helpers/screenshots.js` (also deleted) AND re-exports `assertAppReady` from `../helpers.js` (currently missing from `tests/e2e/helpers.js` — stripped in the same commit). So the minimum restoration footprint is **6 artifacts, not 3**. Without all 6, `layouts-screenshots.spec.js` will fail at import resolution.

**Primary recommendation:** Split into three waves.
1. **Wave 1 (restore):** Single atomic commit that `git show 05a7f89d~1:<path>`s back all six deleted/truncated artifacts — `layouts-screenshots.spec.js`, `playlists.spec.js` (replace 209-line stub with 619-line full), `fixtures/index.js`, `helpers/index.js`, `helpers/screenshots.js`, and the `assertAppReady` function + `expect` import in `helpers.js`. Plus one task to add a minimal `eslint.config.js` so lint is runnable on the phase-scoped files.
2. **Wave 2 (TQAL fixes):** Four atomic commits, one per TQAL. Tiny diffs, each verifiable by grep.
3. **Wave 3 (stabilize):** Run `npx playwright test` on the three restored specs (+ any spec that imports the restored barrels). Fix selectors / flows forward per D-08. Product drift scope is small: only 1 relevant commit (`6fceea4c` added `dotenv.config()` to `playwright.config.js`) touched infra. No commits touched `src/routes/playlists`, `src/routes/layouts`, `src/lib/auth`, or `tests/e2e/helpers.js` between `05a7f89d` and HEAD.

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` file exists at the repo root. No `.claude/skills/` or `.agents/skills/` directory was found in the working tree. No project-specific directives beyond what's in `CONTEXT.md` and `.planning/`.

## Standard Stack

This phase adds no new dependencies. It works within the existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | installed (see `package.json`) | E2E test runner for restored specs | Existing project standard [VERIFIED: package.json, `test:e2e` script] |
| `eslint` | 9.39.1 | Lints restored files for TQAL-01 | Devdep present [VERIFIED: `npx eslint --version`] |
| `dotenv` | installed | Injects `TEST_CLIENT_EMAIL` etc into Playwright | Wired in `playwright.config.js` line 2-4 as of commit `6fceea4c` [VERIFIED: git show 6fceea4c] |
| `@eslint/js` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `globals` | installed | Needed by the flat config if planner restores one | devDeps present [VERIFIED: package.json] |

**Nothing to install.** All required tools are already in `node_modules`.

**Version verification:**
- Playwright: resolved via `package.json` / `package-lock.json` (not probed here — restored tests were authored against same version, backward-compat within 1.x not an issue for describe-label/import-only changes).
- ESLint 9.39.1 requires **flat config** (`eslint.config.js|mjs|cjs`) — legacy `.eslintrc.*` is NOT honored starting ESLint v9.0.0. [CITED: https://eslint.org/docs/latest/use/configure/migration-guide, confirmed by live `npx eslint` error message at research time]

## Architecture Patterns

### Playwright E2E Layout (current)

```
tests/
└── e2e/
    ├── helpers.js               # flat utility module; exports loginAndPrepare, dismissAnyModals, etc.
    ├── helpers/                 # DELETED by 05a7f89d — must be restored
    │   ├── index.js             #   → barrel, re-exports helpers.js + screenshots.js helpers
    │   └── screenshots.js       #   → screenshot capture utilities (VIEWPORTS, screenshotStep, etc.)
    ├── fixtures/                # DELETED by 05a7f89d — must be restored
    │   └── index.js             #   → Playwright base fixtures + LAYOUT_PRESETS/WIDGET_TYPES/TEST_LAYOUT_PREFIX
    ├── layouts-screenshots.spec.js  # DELETED by 05a7f89d — must be restored (197 lines)
    ├── playlists.spec.js            # TRUNCATED by 05a7f89d from 619 → 209 lines — must be restored to 619
    └── *.spec.js                    # many other specs, unaffected
```

### Pattern 1: Restore-by-checkout from known-good snapshot
**What:** `git show 05a7f89d~1:<path> > <path>` writes the file content as it existed in the parent of the deletion commit, without touching git history.
**When to use:** Single known-good revision where multiple files coexisted consistently — D-01 mandates this.
**Example:**
```bash
# Wave 1 restore task
git show '05a7f89d~1:tests/e2e/layouts-screenshots.spec.js' > tests/e2e/layouts-screenshots.spec.js
git show '05a7f89d~1:tests/e2e/fixtures/index.js'          > tests/e2e/fixtures/index.js
git show '05a7f89d~1:tests/e2e/playlists.spec.js'          > tests/e2e/playlists.spec.js
mkdir -p tests/e2e/helpers
git show '05a7f89d~1:tests/e2e/helpers/index.js'           > tests/e2e/helpers/index.js
git show '05a7f89d~1:tests/e2e/helpers/screenshots.js'     > tests/e2e/helpers/screenshots.js
# Restore helpers.js (219-line version with assertAppReady) OR patch in just the missing export
git show '05a7f89d~1:tests/e2e/helpers.js' > tests/e2e/helpers.js
git add tests/e2e/
git commit -m "revert(168): restore 6 test artifacts silently deleted by 05a7f89d (recovers Phase 162 work)"
# Source: git history on main
```

### Pattern 2: In-place string replacement for TQAL fixes
**What:** Each TQAL fix is 1-3 lines changed. Use Edit tool on the (now-restored) files.
**When to use:** Mechanical, grep-verifiable change.
**Example:**
```javascript
// TQAL-01 — layouts-screenshots.spec.js line 10
// BEFORE:
import { LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX } from './fixtures/index.js';
// AFTER:
import { LAYOUT_PRESETS, WIDGET_TYPES } from './fixtures/index.js';
```

### Anti-Patterns to Avoid
- **Don't cherry-pick 1d2d35f2** (the Phase 162 restore commit) — CONTEXT.md D-01 explicitly mandates `05a7f89d~1` as the single snapshot. Cherry-picking may not match the `05a7f89d~1` state for `layouts-screenshots.spec.js` and `fixtures/index.js` (those originated from `3002f3c8` / `75371133` and may have been touched by intervening commits).
- **Don't edit TQAL targets before restore lands.** TEST_LAYOUT_PREFIX cannot be removed from a file that doesn't exist. Plans that try to do TQAL edits before Wave 1 commits will fail — TQAL-01/03/04 tasks must depend on the restore commit.
- **Don't run project-wide ESLint as a verification.** D-09 scopes ESLint to the three touched files explicitly. Project-wide lint is currently broken (no config) and would drown the PR in unrelated warnings even if fixed.
- **Don't merge into the deferred "unrelated product bugs" lane.** D-08 draws the line: test-side drift (outdated selectors) = fix here; product bugs (app actually broken) = defer and document. Executors must surface the judgment call explicitly in task SUMMARYs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reconstruct deleted files from memory | Don't rewrite what 05a7f89d~1 already has | `git show 05a7f89d~1:<path>` | Memory/synthesized content risks divergence from Phase 162's verified 619-line/197-line baselines. |
| Custom lint for "no unused imports" | Don't hand-roll an AST check | ESLint core `no-unused-vars` rule (on by default in `@eslint/js` recommended) | ESLint already in devDeps; just needs a flat config. |
| Ad-hoc e2e subset runner | Don't script a custom Playwright invocation | `npx playwright test <spec-path>` | Native Playwright CLI accepts space-separated spec paths. |
| Diff-the-roadmap manually | Don't eyeball two copies | `git show 78777e2b^:.planning/ROADMAP.md` and `git show 78777e2b:.planning/ROADMAP.md` | Produces exact before/after text. Already done in this research. |

**Key insight:** Every TQAL "fix" is a mechanical string transformation over files that Phase 162 already vetted. Resist the temptation to rewrite/refactor the restored content.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no databases or datastores reference any of: `TEST_LAYOUT_PREFIX`, `storageState`, `CONT-09 partial`, `CONT-10 partial`, or the three deleted file names. All targets are in-repo file content. | None |
| Live service config | None — no external service (n8n, Datadog, Tailscale, Cloudflare) references these strings. Playwright is a local CLI runner, not a service. | None |
| OS-registered state | None — no Task Scheduler / launchd / systemd unit references these files. Playwright webServer is spawned per-run from `playwright.config.js` line 68 (`npm run dev`). | None |
| Secrets/env vars | Required for e2e: `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` (used by `layouts-screenshots.spec.js` line 14-19) AND `TEST_CLIENT_EMAIL`/`TEST_CLIENT_PASSWORD` (used by restored `playlists.spec.js` line 15-21). Verified by grep across restored content. Ensure `.env` on the runner host provides BOTH sets. Neither env var *name* changes, only the files that consume them get restored. | Confirm `.env` has both user-role and client-role creds before D-07 e2e run. |
| Build artifacts | None — no compiled/cached artifacts reference the deleted files. `playwright-report/` and `test-results/` contain stale reports from prior runs; these will be overwritten by the D-07 run. Safe to leave. | None |

## Common Pitfalls

### Pitfall 1: Restore leaves stale tree entries for deleted barrel directories
**What goes wrong:** `git show` writes file content, but on-disk you need the parent directory (`tests/e2e/helpers/` and `tests/e2e/fixtures/`) to exist.
**Why it happens:** `05a7f89d` deleted the directories' only children, so the directories themselves are gone from the working tree.
**How to avoid:** `mkdir -p tests/e2e/helpers tests/e2e/fixtures` before redirecting. Or use a wrapper that creates parent dirs.
**Warning signs:** `bash: tests/e2e/fixtures/index.js: No such file or directory` on redirect.

### Pitfall 2: `assertAppReady` missing from current `tests/e2e/helpers.js`
**What goes wrong:** Restored `helpers/index.js` re-exports `assertAppReady` from `../helpers.js`, but current `helpers.js` on main is the truncated 190-line version that has no such function. Import resolution succeeds at load time (ES modules allow named re-exports that miss to be lazily evaluated) but `layouts-screenshots.spec.js` calls `assertAppReady(...)` at test time → ReferenceError.
**Why it happens:** `05a7f89d` also trimmed 35 lines from `helpers.js` (see `git diff 05a7f89d~1:tests/e2e/helpers.js tests/e2e/helpers.js`), removing both the `assertAppReady` export and the `import { expect } from '@playwright/test';` line.
**How to avoid:** Either (a) overwrite current `helpers.js` with the `05a7f89d~1` version (227 lines, includes `assertAppReady`), or (b) append the missing function + `expect` import as a targeted patch. Option (a) is simpler and matches D-01's "single snapshot" principle.
**Warning signs:** Playwright reports `assertAppReady is not a function` on first run of `layouts-screenshots.spec.js`.

### Pitfall 3: ESLint 9.x refuses to run with legacy-style config
**What goes wrong:** D-09 command `eslint tests/e2e/<files>` errors with "couldn't find an eslint.config.(js|mjs|cjs) file" — ESLint 9 requires flat config and there is none on main.
**Why it happens:** `eslint.config.js` was deleted in commit `289a2c7b` (Phase 151-02) and never replaced.
**How to avoid:** Add a minimal `eslint.config.js` at repo root as part of Wave 1 (or a dedicated TQAL-01-prep task). Historical content from `289a2c7b^:eslint.config.js` is a fine starting point, BUT remove `'tests'` from the `ignores` array so the three phase-scoped files actually get linted. Alternative: run `npx eslint --no-config-lookup --rule '{"no-unused-vars":"error"}' <files>` but this bypasses project standards.
**Warning signs:** ESLint CLI error: "From ESLint v9.0.0, the default configuration file is now eslint.config.js."

### Pitfall 4: Editing the wrong file for TQAL-02
**What goes wrong:** Plan says "fix SC3 in v18.0-ROADMAP.md" — but SC3 is already correct. If the executor edits SC3 anyway (e.g., inverting back to "language variants"), they undo the Phase 155-03 gap-closure fix.
**Why it happens:** Audit text was written against a transient state that's since been repaired.
**How to avoid:** Read "TQAL-02 Target Ambiguity" below. Confirm the true stale wording is on **line 120** summary, NOT SC3. Planner explicitly pick scope.
**Warning signs:** Diff on SC3 after "fix" should be empty; if it's non-empty, re-check.

### Pitfall 5: Domain overlap with `playlist-template.spec.js`
**What goes wrong:** Both `playlists.spec.js` (restored) and `playlist-template.spec.js` (on main) create, list, and delete playlists. Running both against the same test-client account may create resource collisions.
**Why it happens:** Phase 162 restored `playlists.spec.js` without reconciling against the later-written `playlist-template.spec.js`.
**How to avoid:** CONTEXT.md deferred the consolidation. For this phase, rely on Playwright's `fullyParallel: true` tolerance and each spec's timestamped naming (`Edit Test ${Date.now()}`, `Empty State Test ${Date.now()}`). If flakes emerge, document and defer.
**Warning signs:** Flakes on "playlist already exists" errors, or deletion conflicts.

### Pitfall 6: playwright.config.js baseURL depends on localhost dev server
**What goes wrong:** `playwright.config.js` spawns `npm run dev` (line 68) on port 5173. If a prior instance is running or port's taken, webServer fails.
**Why it happens:** `reuseExistingServer: true` mitigates but doesn't eliminate collisions.
**How to avoid:** Ensure port 5173 is free before D-07 run, or set `PLAYWRIGHT_BASE_URL` to a pre-running instance.
**Warning signs:** `Error: webServer failed to start within 120s`.

## Code Examples

### Example 1: Exact restoration commands (planner task actions)

```bash
# Source: live git history on main, commit 05a7f89d~1
mkdir -p tests/e2e/helpers tests/e2e/fixtures
git show '05a7f89d~1:tests/e2e/layouts-screenshots.spec.js' > tests/e2e/layouts-screenshots.spec.js  # 197 lines
git show '05a7f89d~1:tests/e2e/fixtures/index.js'           > tests/e2e/fixtures/index.js           # 109 lines
git show '05a7f89d~1:tests/e2e/playlists.spec.js'           > tests/e2e/playlists.spec.js           # 619 lines
git show '05a7f89d~1:tests/e2e/helpers/index.js'            > tests/e2e/helpers/index.js            #  21 lines
git show '05a7f89d~1:tests/e2e/helpers/screenshots.js'      > tests/e2e/helpers/screenshots.js      # 110 lines
git show '05a7f89d~1:tests/e2e/helpers.js'                  > tests/e2e/helpers.js                  # 227 lines (superset of current 190)
```

### Example 2: TQAL-01 exact target line

```javascript
// File:  tests/e2e/layouts-screenshots.spec.js  (after restore)
// Line:  10
// BEFORE:
import { LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX } from './fixtures/index.js';
// AFTER:
import { LAYOUT_PRESETS, WIDGET_TYPES } from './fixtures/index.js';
// Source: git show 05a7f89d~1:tests/e2e/layouts-screenshots.spec.js | sed -n '10p'
```

### Example 3: TQAL-03 exact JSDoc blocks to replace

Two locations in restored `tests/e2e/fixtures/index.js`:

**Location A — USAGE PATTERNS comment (lines 13-20 in restored file):**
```javascript
// BEFORE:
 * 1. For authenticated tests (most common):
 *    ```javascript
 *    import { test, expect } from './fixtures/index.js';
 *
 *    test('my authenticated test', async ({ page }) => {
 *      // page already has auth from storage state (project config)
 *    });
 *    ```
// AFTER (proposed):
 * 1. For authenticated tests (most common):
 *    ```javascript
 *    import { test, expect } from './fixtures/index.js';
 *
 *    test('my authenticated test', async ({ authenticatedPage }) => {
 *      // authenticatedPage already called loginAndPrepare() before the test body
 *    });
 *    ```
```

**Location B — `authenticatedPage` fixture JSDoc (lines 65-73 in restored file):**
```javascript
// BEFORE:
  /**
   * Authenticated page fixture
   *
   * Uses the page from context (which already has storage state from project config)
   * and calls loginAndPrepare to ensure the page is ready for testing.
   *
   * @example
   * test('authenticated test', async ({ authenticatedPage }) => {
   *   await authenticatedPage.goto('/app/dashboard');
   * });
   */
// AFTER (proposed):
  /**
   * Authenticated page fixture
   *
   * Calls loginAndPrepare() on the per-test page (no storageState in project config)
   * so the page is logged in and ready for testing. Credentials come from
   * TEST_USER_EMAIL / TEST_USER_PASSWORD env vars.
   *
   * @example
   * test('authenticated test', async ({ authenticatedPage }) => {
   *   await authenticatedPage.goto('/app/dashboard');
   * });
   */
```

Note the "FIXTURES PROVIDED" block on lines 49-51 of the restored file already says `authenticatedPage: Uses existing storage state and prepares the page` — this is also stale. Recommend: change to `authenticatedPage: Logs in via loginAndPrepare() and prepares the page`.

### Example 4: TQAL-04 exact describe labels

```javascript
// File: tests/e2e/playlists.spec.js  (after restore to 619 lines)
// Line 277:
test.describe('Playlist Validation (CONT-10 partial)', () => {     // BEFORE
test.describe('Playlist Validation (CONT-10)', () => {             // AFTER

// Line 316:
test.describe('Playlist Empty State (CONT-09 partial)', () => {    // BEFORE
test.describe('Playlist Empty State (CONT-09)', () => {            // AFTER
```

Grep confirms exactly 2 occurrences of `partial` in the restored file (both on `describe` labels, no others) — `git show 05a7f89d~1:tests/e2e/playlists.spec.js | grep -c partial` → `2`.

## TQAL-01 Target

**File:** `tests/e2e/layouts-screenshots.spec.js`
**State on main:** DELETED (must restore from `05a7f89d~1`, 197 lines).
**Target line after restore:** line 10.

Exact old line text:
```
import { LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX } from './fixtures/index.js';
```

Exact new line text:
```
import { LAYOUT_PRESETS, WIDGET_TYPES } from './fixtures/index.js';
```

`TEST_LAYOUT_PREFIX` is never used in the 197-line body — grep confirms zero body references. `LAYOUT_PRESETS` and `WIDGET_TYPES` ARE used (in describe block assertions).

## TQAL-02 Target Ambiguity

**The requirement text is ambiguous after Phase 155-03's gap closure.** Two candidate targets:

**Candidate A — SC3 text in v18.0-ROADMAP.md (the literal reading of the audit):**
- File: `.planning/milestones/v18.0-ROADMAP.md`
- Line 239 current content: `3. Test suite verifies user can switch locale preference via Settings, language preference persists across reload, and fallback chain resolves user preferred to browser to default 'en'`
- **This IS the intended "locale preference" wording.** It is NOT stale. [VERIFIED: read of `.planning/milestones/v18.0-ROADMAP.md` lines 232-240]
- The 78777e2b diff (`git show 78777e2b`) shows the reversion was applied to `.planning/ROADMAP.md`, not `v18.0-ROADMAP.md`. And `.planning/ROADMAP.md` just before the v18.0 archive commit (`72d96d04^`) also already had the locale-preference wording. So the reversion was itself repaired sometime during Phase 155-03.
- **Action if Candidate A:** TQAL-02 is a no-op. Close SC2 with a verification note citing line 239's current content.

**Candidate B — Line 120 1-line summary in both ROADMAPs (the pragmatic reading):**
- File 1: `.planning/milestones/v18.0-ROADMAP.md` line 120
- File 2: `.planning/ROADMAP.md` line 120 (both currently identical text)
- Current content: `- [x] **Phase 155: Menu Board & Multi-Language Tests** - E2E tests for menu board CRUD, drag-drop, dietary tags, rendering, language variants, and fallback (completed 2026-04-09)`
- Stale phrase: `rendering, language variants, and fallback` — still the old language-variants framing.
- Proposed new phrase: `rendering, locale preference, and language fallback chain` (matches SC3 wording model).
- **Action if Candidate B:** One-line edit to both files. Grep-verifiable.

**Recommendation:** Take Candidate B. It delivers on the audit's spirit (eliminate stale "language variants" wording in the v18 roadmap) with a concrete, testable diff. Escalate to user only if planner wants confirmation.

## TQAL-03 Target

See "Example 3" above — three strings to replace in the restored `tests/e2e/fixtures/index.js`:
1. The USAGE PATTERNS "page already has auth from storage state (project config)" comment (~line 18).
2. The `authenticatedPage` JSDoc "Uses the page from context (which already has storage state from project config)" block (~line 67).
3. The FIXTURES PROVIDED bullet "authenticatedPage: Uses existing storage state and prepares the page" (~line 50).

All three are docstring-only; no runtime behavior changes.

## TQAL-04 Target

Exactly 2 occurrences of `partial` in restored `tests/e2e/playlists.spec.js`, both on describe labels:

| Line | Current | New |
|------|---------|-----|
| 277 | `test.describe('Playlist Validation (CONT-10 partial)', () => {` | `test.describe('Playlist Validation (CONT-10)', () => {` |
| 316 | `test.describe('Playlist Empty State (CONT-09 partial)', () => {` | `test.describe('Playlist Empty State (CONT-09)', () => {` |

No other `partial` qualifier in the file. Grep verified: `git show 05a7f89d~1:tests/e2e/playlists.spec.js | grep -c partial` → `2`.

## Export Collision Check (fixtures/index.js vs helpers.js)

Restored `tests/e2e/fixtures/index.js` exports:
- `test` (re-branded Playwright `base.extend({...})`)
- `expect` (re-exported from `@playwright/test`)
- `LAYOUT_PRESETS`, `WIDGET_TYPES`, `TEST_LAYOUT_PREFIX` (constants)
- Implicit fixtures: `authenticatedPage`, `freshPage`

Current `tests/e2e/helpers.js` exports:
- `loginAndPrepare`, `dismissAnyModals`, `waitForPageReady`, `navigateToSection`, `generateTestName` (and in restored version, `assertAppReady`)

**No name collision.** `fixtures/index.js` imports `loginAndPrepare` from `../helpers.js` (relative path that will still resolve). The two modules are complementary, not competing. Restore as-is. [VERIFIED: read of both files at `05a7f89d~1`]

## Restoration Targets

| Path | State on main | Source | Target lines |
|------|---------------|--------|--------------|
| `tests/e2e/layouts-screenshots.spec.js` | DELETED | `05a7f89d~1` | 197 |
| `tests/e2e/playlists.spec.js` | TRUNCATED (209 lines, stub) | `05a7f89d~1` | 619 |
| `tests/e2e/fixtures/index.js` | DELETED | `05a7f89d~1` | 109 |
| `tests/e2e/helpers/index.js` | DELETED | `05a7f89d~1` | 21 |
| `tests/e2e/helpers/screenshots.js` | DELETED | `05a7f89d~1` | 110 |
| `tests/e2e/helpers.js` | TRUNCATED (190 lines, missing `assertAppReady`) | `05a7f89d~1` | 227 |

Total restoration: ~1,293 lines across 6 files. All paths confirmed to exist at `05a7f89d~1` via `git show`. [VERIFIED: `git show 05a7f89d~1:<path> | wc -l` for each]

**Restore dependency chain:**
- `layouts-screenshots.spec.js` → imports from `./helpers/index.js` (line 9) AND `./fixtures/index.js` (line 10). Both must exist to avoid import-resolution failure.
- `helpers/index.js` → re-exports from `./screenshots.js` AND from `../helpers.js` (including `assertAppReady`).
- `fixtures/index.js` → imports `loginAndPrepare` from `../helpers.js`.

If ANY of the 6 are not restored, `layouts-screenshots.spec.js` will fail at test-discovery (import error).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright fixtures use `storageState` via project config | Fixtures call `loginAndPrepare()` per test | Sometime before commit `75371133` (Phase 161) | `fixtures/index.js` JSDoc lags behind actual implementation — this is what TQAL-03 fixes. Behavior is already correct; only documentation is stale. |
| ESLint legacy config `.eslintrc.*` | ESLint flat config `eslint.config.js` | ESLint v9.0.0 | Any restored legacy-style config won't be honored by ESLint 9.x. Flat config required. [CITED: https://eslint.org/docs/latest/use/configure/migration-guide] |

**Deprecated/outdated:**
- "Uses existing storage state and prepares the page" wording in `fixtures/index.js` FIXTURES PROVIDED block — deprecated by actual loginAndPrepare() call pattern (TQAL-03).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Planner should reinterpret TQAL-02 as "line 120 summary in both ROADMAPs" (Candidate B) | TQAL-02 Target Ambiguity | If user wanted the literal reading (no-op since SC3 is correct), Candidate B creates unintended churn in milestone docs. Surface in SUMMARY for user review. |
| A2 | Restoring `helpers.js` from `05a7f89d~1` (full 227-line version) is preferred over patching in just `assertAppReady` | Pitfall 2 | If current `helpers.js` has unrelated edits made since `05a7f89d~1` that matter, overwriting loses them. Mitigation: `git log 05a7f89d~1..HEAD -- tests/e2e/helpers.js` returns 0 commits — no intervening edits. Verified. |
| A3 | Adding a minimal flat `eslint.config.js` is in-scope for Phase 168 | Pitfall 3 | If user considers config restoration a separate concern, this expands Wave 1 beyond D-01. Alternative: use `--no-config-lookup` flag in D-09 command. Planner decision. |
| A4 | No other spec on main imports `./fixtures/index.js` or `./helpers/index.js` | code_context summary in CONTEXT.md | If a grep was missed and another spec imports either barrel, restoring partially leaves collateral broken. Verified via Grep: no matches. |

## Open Questions (RESOLVED)

1. **Should TQAL-02 edit SC3 (current wording is already correct) or the line 120 summary?**
   - What we know: SC3 is the locale-preference wording; line 120 summary still has the "language variants" wording.
   - What's unclear: Which did the user mean when writing TQAL-02.
   - Recommendation: Planner proceed with Candidate B (edit line 120 in both `.planning/ROADMAP.md` and `.planning/milestones/v18.0-ROADMAP.md`). If uncertain, surface in phase SUMMARY with a one-sentence ask.
   - **RESOLVED:** Candidate B — edit line 120 summary in both roadmaps. Source: user decision during /gsd-plan-phase (2026-04-13); encoded in CONTEXT.md decision intent and implemented in `168-02-PLAN.md` Task 2.

2. **Is a flat `eslint.config.js` in scope, or should D-09 use `--no-config-lookup` or a throwaway inline config?**
   - What we know: ESLint 9 requires flat config to run at all; restored `tests/` directory was historically ignored by the old config.
   - What's unclear: Whether this phase owns ESLint restoration or defers it.
   - Recommendation: Wave 1 adds a minimal `eslint.config.js` derived from `289a2c7b^:eslint.config.js` with `'tests'` removed from `ignores`. Takes ~15 lines. Without it, D-09's named command cannot execute.
   - **RESOLVED:** Restore `eslint.config.js` in Phase 168 Wave 0. Source: user decision during /gsd-plan-phase (2026-04-13); implemented in `168-00-PLAN.md` (standalone Wave 0 plan).

3. **Product drift stabilization scope — how much test-side drift is expected?**
   - What we know: Only 1 commit (`6fceea4c`) touched phase-adjacent infra between `05a7f89d` and HEAD, and it was additive (dotenv loading). No changes to playlist/layouts/auth product code.
   - What's unclear: Whether the restored 619-line `playlists.spec.js` passes today's live product; e2e wasn't run in this research step.
   - Recommendation: Allocate one "stabilization wave" task with flexible scope (D-08 license). Plan for the possibility of 0-5 small selector/timing tweaks per spec.
   - **RESOLVED:** Fix forward test-side drift within Phase 168; escalate and stop if >3 product bugs surface. Source: CONTEXT.md D-08 + `168-03-PLAN.md` Task 2 stop-condition.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@playwright/test` runtime | D-07 e2e run | ✓ (via `npm run test:e2e`) | installed via package.json | — |
| `npm run dev` on :5173 | Playwright `webServer` block | Inferred ✓ (vite dev is standard) | — | Set `PLAYWRIGHT_BASE_URL` to a pre-running instance |
| ESLint 9.39.1 | D-09 lint scope | ✓ binary resolves | 9.39.1 [VERIFIED] | — |
| `eslint.config.js` (flat config) | ESLint 9 to run at all | ✗ NONE in repo | — | Add minimal config in Wave 1 (recommended) OR use `eslint --no-config-lookup --rule '{"no-unused-vars":"error"}' <files>` |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | `layouts-screenshots.spec.js` | Not probed (user's machine) | — | `test.skip(...)` guard means tests skip gracefully if absent; but D-07 requires them to be present. |
| `TEST_CLIENT_EMAIL` / `TEST_CLIENT_PASSWORD` | restored `playlists.spec.js` | Not probed | — | Same skip-guard; D-07 requires both sets. |
| `dotenv` for `playwright.config.js` | env var injection into spawned web server | ✓ (import on line 2 as of `6fceea4c`) | — | — |

**Missing dependencies with no fallback:** None blocking.

**Missing dependencies with fallback:**
- `eslint.config.js` — blocks D-09 command verbatim. Fallback: pass `--no-config-lookup` OR add a minimal config (recommended).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright Test (E2E) + ESLint (static) — both already installed |
| Config file | `playwright.config.js` (present); `eslint.config.js` (ABSENT — Wave 0 gap) |
| Quick run command | `npx playwright test tests/e2e/layouts-screenshots.spec.js tests/e2e/playlists.spec.js --project=chromium` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TQAL-01 | `TEST_LAYOUT_PREFIX` absent from layouts-screenshots.spec.js imports; ESLint clean on the three files | static (grep + eslint) | `! grep -q TEST_LAYOUT_PREFIX tests/e2e/layouts-screenshots.spec.js && npx eslint tests/e2e/layouts-screenshots.spec.js tests/e2e/fixtures/index.js tests/e2e/playlists.spec.js` | ❌ Wave 0 must add `eslint.config.js` |
| TQAL-02 | Line 120 summary in both ROADMAPs no longer says "language variants" | static (grep) | `! grep -q "language variants" .planning/ROADMAP.md .planning/milestones/v18.0-ROADMAP.md` | ✅ files exist on main |
| TQAL-03 | `fixtures/index.js` JSDoc no longer claims "storage state"; references `loginAndPrepare()` | static (grep) | `! grep -q "storage state" tests/e2e/fixtures/index.js && grep -q "loginAndPrepare" tests/e2e/fixtures/index.js` | ❌ Wave 1 restore must create file |
| TQAL-04 | Zero `partial` occurrences in playlists.spec.js | static (grep) | `[ "$(grep -c partial tests/e2e/playlists.spec.js)" -eq 0 ]` | ❌ Wave 1 restore must expand file to 619 lines |
| D-07 | Three restored specs run green under live Playwright | e2e (live) | `npx playwright test tests/e2e/layouts-screenshots.spec.js tests/e2e/playlists.spec.js --reporter=list` (and any spec importing the restored barrels) | ⚠️ Requires TEST_* env vars + dev server on :5173 |

### Sampling Rate
- **Per task commit:** Run the task's own grep-level verification (5-second checks).
- **Per wave merge:** After Wave 1 (restore), run `npx playwright test tests/e2e/layouts-screenshots.spec.js tests/e2e/playlists.spec.js --reporter=list` to confirm restored files load without import errors, then spot-check one describe block passes. After Wave 2 (TQAL fixes), re-run all four grep checks.
- **Phase gate:** Full `npm run test:e2e` green (restricted to restored specs + any spec importing restored barrels if practical) before `/gsd-verify-work`. Per D-07: "all three files green".

### Wave 0 Gaps
- [ ] `eslint.config.js` at repo root — required for D-09 command to execute at all under ESLint 9.x. Start from `289a2c7b^:eslint.config.js` (56 lines) with `'tests'` removed from the `ignores` array.
- [ ] Confirm `.env` (or runner env) provides both `TEST_USER_EMAIL/PASSWORD` and `TEST_CLIENT_EMAIL/PASSWORD` before D-07 live run.
- [ ] (Optional) Confirm port 5173 is free or set `PLAYWRIGHT_BASE_URL` to a pre-running instance.

## Sources

### Primary (HIGH confidence)
- `git show 05a7f89d~1:<path>` for the 6 restoration targets — all paths confirmed present; line counts recorded.
- `git show 05a7f89d -- <path>` — confirmed what was deleted/truncated by the regression commit.
- `git show 78777e2b` — confirmed the reversion touched `.planning/ROADMAP.md` SC3, not `v18.0-ROADMAP.md`.
- `git show 72d96d04^:.planning/ROADMAP.md` line 239 — confirmed `.planning/ROADMAP.md` already had locale-preference wording at archive time.
- `git show 289a2c7b -- eslint.config.js` — confirmed `eslint.config.js` was deleted by commit `289a2c7b`.
- `npx eslint --version` → 9.39.1 — confirmed live on this checkout.
- `npx eslint --print-config tests/e2e/playlists.spec.js` → error "couldn't find eslint.config" — confirms lint is broken on main.
- `package.json` scripts and devDependencies — read directly.
- `playwright.config.js` — read directly (testDir `./tests/e2e`, testMatch `**/*.spec.{js,ts}`, baseURL on :5173, webServer `npm run dev`).

### Secondary (MEDIUM confidence)
- `.planning/milestones/v18.0-MILESTONE-AUDIT.md` — author's intent capture for TQAL items (lines 36, 52, 219-224).
- `.planning/milestones/v18.0-phases/162-restore-deleted-spec-files/162-VERIFICATION.md` — confirms Phase 162 restored `playlists.spec.js` to 619 lines with CONT-02..10 coverage.

### Tertiary (LOW confidence)
- Assumption that all 62 commits between `05a7f89d` and HEAD have NO other changes touching restored specs' helpers — reduced to HIGH via: `git diff 05a7f89d..HEAD --stat -- tests/e2e/helpers.js "src/routes/playlists" "src/routes/layouts" "src/lib/auth" playwright.config.js` → only `playwright.config.js` shows `3 insertions`.

## Metadata

**Confidence breakdown:**
- Restoration targets and line counts: HIGH — all 6 paths and line counts directly read from git.
- TQAL-01/03/04 exact-line targets: HIGH — quoted directly from `05a7f89d~1` content.
- TQAL-02 interpretation: MEDIUM — literal audit reading is contradicted by current file state; research surfaces the ambiguity for planner decision.
- ESLint readiness: HIGH — lint command actively errors, dependency is documented, fallback path is known.
- Product-drift risk: HIGH (low risk) — only 1 infra-touching commit, no product route changes in phase-adjacent dirs.
- E2E stabilization effort: MEDIUM — can't predict pass-rate without running live, but baseline was green per Phase 162 verification 2 days before `05a7f89d`.

**Research date:** 2026-04-13
**Valid until:** 2026-04-20 (7 days — git history is immutable, but live e2e surface may shift as other phases merge).
