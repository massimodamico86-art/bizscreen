# Phase 168: Test & Doc Quality Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 168-test-doc-quality-cleanup
**Areas discussed:** Phase premise check, Restoration source, Verification depth, TQAL-04 shape, E2E failure handling, Lint scope

---

## Phase premise check (blocker surfaced before gray areas)

Claude discovered during scout that commit `05a7f89d feat(165-01)` silently
deleted 716 lines across three test files that TQAL-01/03/04 target
(`layouts-screenshots.spec.js`, `fixtures/index.js`, 410 lines of
`playlists.spec.js`). This invalidated the phase's premise as originally
scoped. User asked to choose how to reshape the phase.

| Option | Description | Selected |
|--------|-------------|----------|
| Restore then cleanup | Recover deleted specs, then apply the 4 TQAL fixes. Larger scope, delivers original intent. | ✓ |
| Cleanup what's present | Do only TQAL-02; mark TQAL-01/03/04 superseded. | |
| Split: 168 restores, 168.1 cleans | Phase 168 = restore only; new 168.1 = cleanups on restored files. | |
| Investigate first | Review commit 05a7f89d before deciding. | |

**User's choice:** Restore then cleanup
**Notes:** Turns phase into a two-part deliverable: restore regression + apply cleanups.

---

## Restoration source

| Option | Description | Selected |
|--------|-------------|----------|
| 05a7f89d~1 (parent of delete) | Single snapshot immediately before the accidental delete. Guarantees the three files are internally consistent. | ✓ |
| Original restore commits | Cherry-pick from 3002f3c8 (layouts + fixtures) + 1d2d35f2 (playlists). | |
| git revert 05a7f89d's test deletions | Path-filtered reverse patch of 05a7f89d. Preserves dayparting changes. | |

**User's choice:** 05a7f89d~1 (parent of delete)
**Notes:** Simplest git operation; verified content matches expectations (TEST_LAYOUT_PREFIX import at line 10, stale JSDoc, 619-line playlists.spec.js).

---

## Verification depth

| Option | Description | Selected |
|--------|-------------|----------|
| Static only | Grep-based checks; no test runs. Fastest. | |
| Static + ESLint | Above + ESLint on three files. | |
| Static + ESLint + Playwright dry run | Above + `playwright test --list`. | |
| Full e2e run | Run three specs via Playwright against live test env. | ✓ |

**User's choice:** Full e2e run
**Notes:** User escalated beyond cleanup-phase minimum. Signals intent for restored specs to actually work on main, not just mechanically re-added.

---

## TQAL-04 shape

| Option | Description | Selected |
|--------|-------------|----------|
| Strip 'partial' keyword | Rename the two describe blocks to drop `partial`. Minimal change. | ✓ |
| Strip + add coverage comment | Strip + add a 1-line scope comment above each describe. | |
| Leave labels, mark requirement satisfied | Keep 'partial' as author artifact; satisfy TQAL-04 via REQUIREMENTS.md note only. | |

**User's choice:** Strip 'partial' keyword
**Notes:** Matches v18.0-MILESTONE-AUDIT.md line 224 — coverage is actually full, the `partial` qualifier was a labeling artifact.

---

## E2E failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fix forward in 168 | If restored specs fail on current product, fix the specs as part of 168. Phase can grow. | ✓ |
| Restore + triage, don't fix | Run e2e, report pass/fail. Skip failing specs with TODOs to a new phase. | |
| All-or-nothing | Block phase close until green, but don't expand scope to product fixes. | |

**User's choice:** Fix forward in 168
**Notes:** User accepts scope growth for test-side stabilization. Product bugs surfaced (not test drift) remain out of scope per D-08.

---

## Lint scope

| Option | Description | Selected |
|--------|-------------|----------|
| Just the 3 touched files | Narrow ESLint run on the restored/cleaned files only. | ✓ |
| tests/ directory | Broader but still bounded. | |
| Project-wide | Would surface pre-existing unrelated warnings. | |

**User's choice:** Just the 3 touched files
**Notes:** Matches "cleanup" intent; phase should not own pre-existing lint warnings elsewhere.

---

## Claude's Discretion

- Restore commit message wording (name 05a7f89d as regression source, credit Phase 162).
- Whether TQAL fixes land as 4 atomic commits or grouped — planner decision per GSD norm.
- Specific selector/flow changes needed to stabilize restored specs — executor decides per failure, guided by test-vs-product boundary in D-08.

## Deferred Ideas

- Forensic audit of other silent regressions in 05a7f89d (lots of `.planning/` was also deleted, later restored).
- Product bugs surfaced by e2e run — dedicated phase, not 168.
- Consolidation of overlap between `playlist-template.spec.js` and restored `playlists.spec.js` if found post-restore.
- Pre-commit / ESLint rule preventing silent deletion of `tests/e2e/*.spec.js` files.
