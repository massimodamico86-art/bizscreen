# Phase 168: Test & Doc Quality Cleanup - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver all four v18.0 TQAL cleanups (TQAL-01..04) as functional, verified
changes on `main`. Because commit `05a7f89d feat(165-01)` silently deleted
the three spec files that TQAL-01/03/04 target (716 lines across
`tests/e2e/layouts-screenshots.spec.js`, `tests/e2e/fixtures/index.js`,
`tests/e2e/playlists.spec.js` — regressing v18 Phase 162's restore work),
this phase has two parts:

1. **Restore** the three deleted files from `05a7f89d~1` so TQAL-01/03/04
   have real targets to clean up.
2. **Clean up** — apply the four TQAL fixes on restored code and the v18
   milestone roadmap, then stabilize the restored specs so they pass a
   live Playwright run.

Out of scope: fixing unrelated product bugs surfaced by e2e, modifying
specs outside the three restored files, broader test refactors.

</domain>

<decisions>
## Implementation Decisions

### Restoration
- **D-01:** Restore all three deleted files from the single snapshot
  `05a7f89d~1` (parent of the accidental-delete commit). Single known-good
  revision guarantees the three files are internally consistent — the
  state they last coexisted in. Use `git show 05a7f89d~1:<path> > <path>`.
- **D-02:** Restore is a standalone atomic commit (one commit for the
  three files together, message frames it as a regression recovery of
  v18 Phase 162's work). TQAL fixes land in separate atomic commits after.

### TQAL Fixes
- **D-03:** **TQAL-01** — Remove `TEST_LAYOUT_PREFIX` from the import
  statement at line ~10 of `tests/e2e/layouts-screenshots.spec.js`. Keep
  the other imports (`LAYOUT_PRESETS`, `WIDGET_TYPES`) intact. Do not
  reorder unrelated code.
- **D-04:** **TQAL-02** — Fix stale Phase 155 SC3 text in
  `.planning/milestones/v18.0-ROADMAP.md`. Confirm current text against
  the intent captured in `v18.0-MILESTONE-AUDIT.md` line 36 ("should read
  locale preference wording, still shows old language variants text,
  reverted by worktree merge commit 78777e2b"). Researcher must diff
  current file against 78777e2b parent to identify the exact span.
- **D-05:** **TQAL-03** — Update `tests/e2e/fixtures/index.js` JSDoc so
  `authenticatedPage` description references `loginAndPrepare()` rather
  than "auth from storage state (project config)". Replace the stale
  USAGE PATTERNS comment block accordingly. Do not change runtime
  behavior, only docstrings.
- **D-06:** **TQAL-04** — Strip the `partial` keyword from two
  `test.describe(...)` labels in `tests/e2e/playlists.spec.js`:
  `'Playlist Empty State (CONT-09 partial)'` → `'Playlist Empty State
  (CONT-09)'` and `'Playlist Validation (CONT-10 partial)'` → `'Playlist
  Validation (CONT-10)'`. No other changes to describe blocks.

### Verification
- **D-07:** Run **full Playwright e2e** against the three restored specs
  (`layouts-screenshots.spec.js`, `playlists.spec.js`, and any spec that
  imports `fixtures/index.js`). Required envs: `TEST_CLIENT_EMAIL`,
  `TEST_CLIENT_PASSWORD`, admin creds as applicable. Goal: all three
  files green.
- **D-08:** If restored specs fail due to product drift since Phase 162,
  **fix forward within this phase**: update selectors / flows / helpers
  to match current product. Phase can grow in scope for test-side fixes.
  Product bugs surfaced (not test-side drift) stay out of scope —
  document them as deferred items, do not fix in this phase.
- **D-09:** **ESLint scope** — Run eslint on exactly the three touched
  files: `eslint tests/e2e/layouts-screenshots.spec.js
  tests/e2e/fixtures/index.js tests/e2e/playlists.spec.js`. Require zero
  errors/warnings. Do not run project-wide lint; don't own pre-existing
  warnings elsewhere.

### Claude's Discretion
- Exact wording of restore commit message (should credit Phase 162 and
  name commit 05a7f89d as the regression source).
- Whether to split TQAL fixes into 4 atomic commits or group cosmetic
  ones — planner/executor to decide based on GSD atomic-commit norm.
- Selector/flow fixes needed to stabilize restored specs — executor
  decides per failure, guided by D-08 test-vs-product boundary.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Regression context (why files are missing)
- `.planning/milestones/v18.0-MILESTONE-AUDIT.md` lines 36, 52, 155,
  219-224 — defines the exact intent behind each TQAL item and the prior
  state the audit expected.
- Commit `05a7f89d` — the accidental-delete commit; run
  `git show --stat 05a7f89d -- tests/e2e/` to see the 716-line loss.
- Commit `05a7f89d~1` — single authoritative restore source for all
  three files (D-01).

### v18 Phase 162 restore work (the effort this phase recovers)
- `.planning/milestones/v18.0-phases/162-restore-deleted-spec-files/162-RESEARCH.md`
  — catalogs what was restored and why (CONT-02..10 coverage mapping).
- `.planning/milestones/v18.0-phases/162-restore-deleted-spec-files/162-02-PLAN.md`
  lines 17-18, 92, 111-112 — documents the CONT-09/CONT-10 `partial`
  label convention that TQAL-04 strips.
- `.planning/milestones/v18.0-phases/162-restore-deleted-spec-files/162-VERIFICATION.md`
  lines 45, 97-98 — file line-count baseline (≥ 600 lines,
  CONT-02..04, CONT-08..10 all present).

### v18 Phase 161 context (why fixtures/index.js exists at all)
- Commit `3002f3c8 feat(161-02): add layouts-screenshots.spec.js and
  fixtures/index.js barrel` — original introduction of both files.
- Commit `75371133 feat(161-01): add assertAppReady helper and barrel
  export` — helpers barrel companion.

### TQAL-02 specific
- `.planning/milestones/v18.0-ROADMAP.md` lines 120 and 232-243 — Phase
  155 summary and SC3 text; researcher must diff against worktree merge
  commit `78777e2b`'s parent to isolate what got reverted.

### Current milestone context
- `.planning/ROADMAP.md` lines 188-197 — Phase 168 definition and
  success criteria.
- `.planning/REQUIREMENTS.md` lines 26-29 — TQAL-01..04 acceptance
  statements.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/e2e/helpers.js` — already on main, exports `loginAndPrepare`,
  `navigateToSection`, `waitForPageReady` etc. Restored fixtures/index.js
  will sit alongside it; the two must not conflict on exports.
- `tests/e2e/playlist-template.spec.js` (5674 bytes, on main) — shares
  playlist domain; restored `playlists.spec.js` should not duplicate its
  coverage. Planner must check for describe-block overlap after restore.
- `tests/e2e/template-marketplace.spec.js` — uses `CONT-01` label
  convention in describe blocks; confirms the `(REQ-XX)` suffix pattern
  TQAL-04 preserves when stripping `partial`.

### Established Patterns
- Playwright `test.describe('Feature (REQ-XX)')` labeling convention
  with requirement IDs in parens — widespread in `tests/e2e/*.spec.js`.
  TQAL-04 keeps the convention, only drops the `partial` qualifier.
- Test files typically guard on env vars via `test.skip(() =>
  !process.env.TEST_CLIENT_EMAIL, ...)` — see current
  `playlists.spec.js` lines 15-16. Restored 619-line version likely
  keeps the same pattern; verify post-restore.
- `eslint` is project-configured (see `eslint.config.js` /
  `.eslintrc*`) — `no-unused-vars` is presumably on, which is what
  flagged TEST_LAYOUT_PREFIX in the first place.

### Integration Points
- `tests/e2e/fixtures/index.js` is imported by
  `layouts-screenshots.spec.js` (confirmed line 10 of `05a7f89d~1`
  version). Both must be restored together or neither.
- No other specs on main import `./fixtures/index.js` — grep confirms
  the barrel is only used by `layouts-screenshots.spec.js` in the
  restored state.
- Playwright runner config (`playwright.config.js`) must be able to
  discover the restored specs without changes — they sit in the
  existing `tests/e2e/` glob.

</code_context>

<specifics>
## Specific Ideas

- User chose "Full e2e run" for verification depth (the strictest
  option offered) and "Fix forward in 168" for failure handling. This
  signals the user wants the restored specs *actually working on main*,
  not just mechanically re-added. Planner should budget for test-side
  stabilization work, not just line-count verification.
- User wants `05a7f89d~1` as the single restore source rather than
  cherry-picking from the original feature/restore commits. Simpler git
  operation and internally consistent.

</specifics>

<deferred>
## Deferred Ideas

- **Audit for other silent regressions in 05a7f89d** — that commit
  deleted a lot of `.planning/` content too (REQUIREMENTS.md, PROJECT.md,
  MILESTONES.md, v18 milestone docs, Phase 161/162 planning). Those
  were apparently restored by later work, but a full post-mortem audit
  is out of scope for 168. Candidate for a forensics/retrospective pass.
- **Product bugs surfaced by e2e run** — if Playwright flags bugs in
  playlist empty state, playlist validation, or layout screenshot
  rendering (not test-side drift), capture them and route to a new
  dedicated phase. Do not fix here (D-08).
- **Overlap between `playlist-template.spec.js` and restored
  `playlists.spec.js`** — if planner finds duplicate describe blocks
  post-restore, consider a consolidation phase.
- **Prevention** — ESLint / pre-commit rule that flags commits deleting
  `tests/e2e/*.spec.js` files would have caught 05a7f89d. Future
  tooling phase.

</deferred>

---

*Phase: 168-test-doc-quality-cleanup*
*Context gathered: 2026-04-13*
