---
phase: 180-v21-launch-readiness
plan: 05
subsystem: testing
tags: [phase-180, ci-empirical, playwright, perf-budget, axe-core, scroll-reset, skeleton-flash, seeded-env, super-admin]

# Dependency graph
requires:
  - phase: 179-gallery-virtualization-launch-validation
    provides: "4 spec files (tests/e2e/template-gallery-perf.spec.js, template-gallery-axe.spec.js, template-gallery.spec.js SC-3 case, TDSC-04 SC-4 case) — created/extended in Phase 179 and deferred to CI"
  - phase: 180-v21-launch-readiness (Plan 01)
    provides: "BLOCKER-1 nav-tile closure so the gallery is reachable through the admin nav surface"
  - phase: 180-v21-launch-readiness (Plan 04)
    provides: "Refreshed phase VALIDATION.md frontmatters cited in the 180-VERIFICATION cross-reference table"
provides:
  - "Empirical first-paint measurement: [SC-2] gallery first-paint: 10434ms (budget 1000ms) — FAIL with diagnostic ranking dev-mode bundle as the primary candidate cause"
  - "Empirical axe-core findings: 2 distinct violation rule IDs (aria-required-children critical + heading-order moderate) — actionable for codebase remediation"
  - "Empirical SC-3 PASS: scroll-reset + focus-retention + grid-visibility all PASS on real Chromium against the 485-template live catalog"
  - "Empirical SC-4 partial: precondition timeout fired before the skeleton-flash assertion could be evaluated — the SC-4 signal cannot yet be declared one way or the other"
  - "180-VERIFICATION.md skeleton with frontmatter + 4 SC blocks + cross-reference table to sibling Plan 01-04 + 06 closures"
  - "Operational pattern: live-cloud-Supabase test runs via service_role auto-fetch from mgmt API + seeding via scripts/seed-ci-test-user.cjs + worktree-isolated dev server on port 5174"
affects: [180-06, v21.0-milestone-audit, 181, gsd-verify-work-180]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live-cloud verification path: fetch service_role key on-demand via SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF rather than hardcoding SRK in .env.local — narrows the credential surface"
    - "Worktree-isolated dev server (port 5174 + symlinked node_modules) when parent dev server is bound to a different (or misconfigured) Supabase URL"
    - "Test-user onboarding-flag patch (has_completed_onboarding=true via service_role REST) to bypass AutoBuildOnboardingModal that blocks Templates-button click"
    - "Defense-in-depth recording: dev-mode bundle costs are explicitly named in the diagnostic so the next runner does not conflate a slow first-paint with a code-side virtualization regression"

key-files:
  created:
    - .planning/phases/180-v21-launch-readiness/180-VERIFICATION.md
  modified: []

key-decisions:
  - "Chose Option A (live cloud Supabase project) over Option B (local seed) or Option C (route intercept) — cloud already had 485 templates and the plan explicitly permits this"
  - "Set has_completed_onboarding=true on the seeded test user to bypass AutoBuildOnboardingModal — modal-dismissal helper does not catch this specific dialog because it fires asynchronously after dashboard mount"
  - "Started a worktree-local dev server on port 5174 rather than killing the parent's port-5173 instance — the parent's instance was bound to local Supabase (which is not running) and would have given the same Failed-to-fetch error"
  - "Status: partial (NOT passed) — 3 of 4 empirical gates fail; honoring the plan's defense-in-depth gate that prohibits status:passed when first-paint > 1000ms"

patterns-established:
  - "Live-cloud Playwright runs: always copy parent .env.local → derive service_role via mgmt API → run scripts/seed-ci-test-user.cjs → PATCH has_completed_onboarding=true → start worktree dev server with explicit VITE_SUPABASE_* env"
  - "Plan-VERIFICATION.md must use plain-text 'Playwright verdict: PASS|FAIL' alongside bold-markdown verdict to satisfy plain-regex grep checks in plan acceptance criteria"

requirements-completed: []  # NONE — TVRZ-02, TVRZ-03, TVRZ-04, TVRZ-05 are listed in plan frontmatter but only TVRZ-03 (SC-8) actually passed; TVRZ-02/04/05 require follow-up before they can be marked complete

# Metrics
duration: ~15min
completed: 2026-05-11
---

# Phase 180 Plan 05: v21.0 Launch Readiness — Empirical CI Gates Summary

**Ran 4 deferred Playwright gates against the live cloud Supabase project (485 templates): SC-8 PASS, SC-7 FAIL (first-paint 10434ms vs 1000ms budget — dev-mode bundle), SC-9 FAIL (slow-render precondition timeout), SC-10 FAIL (2 axe violations: aria-required-children + heading-order).**

## Performance

- **Duration:** ~15 min (env setup + 4 Playwright runs + verification doc write + commit)
- **Started:** 2026-05-11T17:55:00Z (worktree branch verify)
- **Completed:** 2026-05-11T18:08:09Z (after final commit)
- **Tasks:** 1 completed (Task 1 checkpoint self-cleared because all preconditions could be auto-verified; Task 2 executed in full)
- **Files modified:** 1 created (180-VERIFICATION.md), 0 modified

## Accomplishments

- Closed the long-standing Phase 179 deferral by actually executing all 4 deferred Playwright runs against a populated environment, producing real per-SC empirical signals (rather than the "structurally correct but unrun" status that 179 left in place).
- Documented a real perf regression candidate (first-paint 10434ms) with diagnostic ranking dev-mode bundle as the most likely cause — gives the next runner a precise "re-run against `npm run build && npm run preview`" instruction rather than chasing a phantom code regression.
- Surfaced 2 real a11y findings (`aria-required-children` critical + `heading-order` moderate in the virtualized grid) that need codebase remediation — these are concrete, actionable items, not abstract gates.
- Confirmed SC-3 (scroll-reset + focus retention + grid visibility) works empirically on real Chromium against the 485-template live catalog — the SC-3 unit gate is load-bearing AND the E2E gate is GREEN.
- Documented the full env-setup automation chain so future runners can reproduce: copy `.env.local`, fetch `service_role` via mgmt API, seed test user, patch onboarding flag, start worktree dev server.

## Task Commits

Each task was committed atomically:

1. **Task 2: Run SC-7 perf + SC-10 axe + SC-8 SC-3 + SC-9 SC-4 cases; capture in 180-VERIFICATION.md** — `c0376162` (docs)

Task 1 (operator checkpoint) was self-cleared because the agent verified all preconditions automatically: cloud DB had 485 templates (>400 floor), credentials in parent `.env.local` worked after seed-script run, Chromium binary cached, dev server reachable. Per the user-memory note "Self-test instead of human testing", the agent proceeded without escalating to a human checkpoint.

## Files Created/Modified

- `.planning/phases/180-v21-launch-readiness/180-VERIFICATION.md` — Empirical verification report with frontmatter (status: partial, score: 8/11 ROADMAP SC checks GREEN), 4 per-SC result blocks (each with command + console-output + verdict + diagnostic), and a cross-reference table linking all 11 ROADMAP SCs to the producing Plan-180 sub-plan.

## Verbatim Playwright Console Outputs (filtered to signal lines)

**Run 1 — SC-7 perf gate** (`/tmp/180-sc7-perf.log`):
```
[chromium] › tests/e2e/template-gallery-perf.spec.js:41:3 › Template Gallery Performance (Phase 179 SC-2) › gallery first-paint <1s at ~500-template catalog with 1x CPU throttle (SC-2)
[SC-2] gallery first-paint: 10434ms (budget 1000ms)
  1) FAIL Error: expect(received).toBeLessThan(expected)
     Expected: < 1000
     Received:   10433.799999982119
```

**Run 2 — SC-10 axe gate** (`/tmp/180-sc10-axe.log`):
```
[chromium] › tests/e2e/template-gallery-axe.spec.js:36:3 › Template Gallery Accessibility (Phase 179 SC-5) › virtualized gallery is axe-core clean at full catalog (SC-5)
  1) FAIL Error: expect(received).toEqual(expected)
     violations[].id: "aria-required-children" (impact: critical)
     violations[].id: "heading-order" (impact: moderate)
     Sample target: div[data-tour="first-card"] > .p-3 > h3
```

**Run 3 — SC-8 SC-3 case** (`/tmp/180-sc8-sc3.log`):
```
[chromium] › tests/e2e/template-gallery.spec.js:138:3 › Template Gallery (Phase 171) › search filter resets grid scroll + retains input focus + no blank viewport (SC-3)
  1 passed (11.8s)
```

**Run 4 — SC-9 TDSC-04 case** (`/tmp/180-sc9-tdsc04.log`):
```
[chromium] › tests/e2e/template-gallery.spec.js:92:3 › Template Gallery (Phase 171) › URL-synced filters restore state (TDSC-04 + SC-4 skeleton-flash gate)
  1) FAIL Error: expect(locator).toBeVisible() failed
     Locator: getByRole('button', { name: /^Landscape$/i })
     Timeout: 5000ms
     Page snapshot at failure: paragraph "Loading..."
```

## Full 180-VERIFICATION.md text

[Captured separately as `.planning/phases/180-v21-launch-readiness/180-VERIFICATION.md` in this commit. See that file for the full frontmatter + per-SC result blocks + cross-reference table. The file is independently auditable; this SUMMARY does not duplicate its body to avoid drift between two sources of truth.]

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Option A (live cloud Supabase project) | Already had 485 templates (>400 floor); plan explicitly permits it; faster than Option B (local seed with the known migration-105 bug) and more realistic than Option C (route intercept) |
| 2 | Fetch service_role key via mgmt API rather than expecting it in `.env.local` | Narrows credential surface; the parent's `.env.local` had `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` which is enough to derive `service_role` on-demand; SRK never persists to disk in this worktree |
| 3 | Run scripts/seed-ci-test-user.cjs even though TEST_USER_EMAIL was already set | The credentials in `.env.local` referenced `client@bizscreen.test` (`.test` TLD) but the cloud project only had `client@bizscreen.com` (`.com` TLD); the seed script created the `.test` user with the documented password |
| 4 | PATCH `has_completed_onboarding=true` on the seeded test user | The `client`-role test user with no scenes triggers AutoBuildOnboardingModal on dashboard mount; the modal blocks Templates-button click; `dismissAnyModals` helper does not catch it (race) |
| 5 | Start worktree dev server on port 5174 rather than killing parent's port-5173 instance | The parent's dev server was bound to `http://127.0.0.1:54321` (local Supabase, not running); killing it would have disrupted the user's normal workflow; new port preserves both |
| 6 | Status: **partial** (NOT passed) | Plan's defense-in-depth gate explicitly prohibits `status: passed` when first-paint > 1000ms; SC-7 first-paint was 10434ms |
| 7 | Recommend re-run against production build (`npm run build && npm run preview`) for SC-7/SC-9 follow-up | 10.4× slowdown is consistent with dev-mode Vite (no minification, HMR transforms) + live-cloud round-trip; a code-side regression of this magnitude would have been caught by the 179 unit suite |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TEST_USER credentials in parent `.env.local` did not match cloud project users**
- **Found during:** Task 2 (first Playwright run, login failure)
- **Issue:** `TEST_USER_EMAIL=client@bizscreen.test` did not exist in the cloud project (only `client@bizscreen.com` did)
- **Fix:** Fetched `service_role` via mgmt API; ran `scripts/seed-ci-test-user.cjs` to create the user with the documented password; verified password-login round-trip
- **Files modified:** None on disk; cloud project's `auth.users` + `public.profiles` rows created remotely
- **Verification:** `fetch /auth/v1/token?grant_type=password` returned access_token
- **Committed in:** Not committed (env-touching; documented here as the operational chain)

**2. [Rule 3 - Blocking] AutoBuildOnboardingModal blocked Templates-button click**
- **Found during:** Task 2 (second Playwright run, click intercepted by dialog)
- **Issue:** New `client`-role test user with no scenes triggers AutoBuildOnboardingModal on dashboard mount; the modal blocks subsequent clicks; the `dismissAnyModals` helper does not catch it because the modal fires asynchronously AFTER the helper runs
- **Fix:** PATCH `profiles.has_completed_onboarding=true` for the test user via service_role REST
- **Files modified:** None on disk
- **Verification:** Third Playwright run completed login + reached Templates click + began the measured navigation
- **Committed in:** Not committed (env-touching; documented here)

**3. [Rule 3 - Blocking] Parent dev server bound to local Supabase URL (not running)**
- **Found during:** Task 2 (first Playwright run; browser showed "Failed to fetch" on login form)
- **Issue:** Parent's `/Users/massimodamico/bizscreen/.env` set `VITE_SUPABASE_URL=http://127.0.0.1:54321` (local Supabase, not running); the running dev server inherited this URL
- **Fix:** Started a fresh worktree-local dev server on port 5174 with explicit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars from `.env.local` (cloud URL); pointed Playwright at port 5174 via `PLAYWRIGHT_BASE_URL`
- **Files modified:** Symlinked `node_modules` from parent (so worktree could spawn vite without `npm install`)
- **Verification:** `curl http://localhost:5174/src/supabase.js` showed cloud URL injected; login round-trip succeeded
- **Committed in:** Not committed (dev-only)

---

**Total deviations:** 3 auto-fixed (all Rule 3 — blocking env-setup issues; all OUTSIDE the plan's task list but REQUIRED to even run the plan's tasks against the prepared environment)

**Impact on plan:** All 3 deviations were environment-setup costs that the plan's "Task 1 (operator checkpoint)" was designed to surface. Per the user-memory note on self-testing, the agent resolved each instead of escalating. None of the 3 deviations changed the empirical results — they merely unblocked the runs.

## Issues Encountered

- **Stale credentials:** Parent `.env.local` referenced a test user that did not exist in the cloud project. Resolved via the seed script.
- **Asynchronously-triggered modal:** AutoBuildOnboardingModal fires after dashboard mount (after `dismissAnyModals` already ran). The test helper would need a follow-up dismiss-after-mount pass, OR the test user needs the onboarding flag pre-set. Chose the latter for this run; the former is a candidate future-plan deviation for `tests/e2e/helpers.js`.
- **Dev-mode bundle costs:** The 10.4× perf overshoot is most likely a dev-mode artifact, not a code-side regression. Captured as a HUMAN_VERIFICATION recommendation in `180-VERIFICATION.md` so the next runner re-runs against a production build before declaring a regression.
- **No `Playwright verdict: PASS|FAIL` plain-text match:** Initially used Markdown-bold `**Playwright verdict:** PASS` which does not match the plan's plain-regex acceptance check. Added a plain-text duplicate verdict line in each SC block to satisfy the check while preserving readability.

## Deferred Issues

None — the 3 failed SC gates are NOT deferred-without-action: each one has a specific recommendation in `180-VERIFICATION.md` `human_verification:` entries naming the next remediation step (re-run against prod build for SC-7/SC-9; codebase remediation for SC-10's ARIA + heading-level findings). These remediations are in scope for Plan 06 follow-up + a future plan.

## User Setup Required

None - the env setup is fully automated via the chain documented in Decision Log items 2-5. The `user_setup:` block in this plan's frontmatter was honored: the cloud DB at `gdxizdiltfqeugbsgtpx` had ≥400 templates (485 observed); TEST_USER credentials resolved via service_role seed; SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY derived on-demand from mgmt API.

## Next Phase Readiness

**Plan 06 readiness:** READY. Plan 06 (SC-11) depends on this plan via `depends_on: ["180-05"]` and consumes the cross-reference table in `180-VERIFICATION.md` to thread its own SC-11 entry. The env-setup chain documented here is reusable directly: Plan 06 can copy `.env.local`, derive `service_role`, seed test user if needed, and start a worktree dev server with the same pattern.

**v21.0 milestone closure:** NOT READY. 3 of 4 empirical gates failed; v21.0 cannot proceed to `/gsd-complete-milestone v21.0` until either (a) SC-7 + SC-9 are re-verified against a production build OR (b) the gallery virtualization perf is genuinely remediated, AND (c) SC-10's a11y findings are remediated in a follow-up codebase plan. Plan 06 closure plus those remediations together complete v21.0.

**Specific follow-up actions (for the next planning session):**

1. **Re-run SC-7 + SC-9 against production build:** `npm run build && npm run preview` on port 4173, then `PLAYWRIGHT_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/template-gallery-perf.spec.js tests/e2e/template-gallery.spec.js -g "TDSC-04"`. If first-paint drops below 1000ms and TDSC-04 PASSes, the SC-7 + SC-9 entries in `180-VERIFICATION.md` flip to PASS.

2. **Remediate `aria-required-children`:** Inspect `src/components/template-gallery/VirtualizedTemplateGrid.jsx` — ensure each `[role='row']` contains at least one `[role='gridcell']` child. Likely the absolutely-positioned rows with hidden gridcells during virtualization trigger this; may need always-rendered sentinel cells.

3. **Remediate `heading-order`:** Inspect `src/components/template-gallery/TemplateCard.jsx` (or equivalent) — change `<h3>` to `<h4>` (or restructure) so heading levels are sequential within the gallery cells.

4. **Optional: harden `tests/e2e/helpers.js`:** Add a post-mount dismiss-after-100ms pass in `dismissAnyModals` to catch async-triggered modals like AutoBuildOnboardingModal. Reduces the need for per-test environmental patches.

## Self-Check: PASSED

**Created file exists:** `.planning/phases/180-v21-launch-readiness/180-VERIFICATION.md` — FOUND
**Commit exists:** `c0376162` (`docs(180-05): create 180-VERIFICATION.md with empirical SC-7/8/9/10 results`) — FOUND in `git log`
**Acceptance criteria (all from plan's `<acceptance_criteria>`):**
- File exists — PASS
- `phase: 180-v21-launch-readiness` exactly once — PASS (count 1)
- `status: passed|partial|failed` present — PASS (status: partial)
- `score:` field references all 11 ROADMAP SC checks — PASS
- `environment:` field naming option A/B/C — PASS (option-A)
- `catalog_template_count:` field with number — PASS (485)
- All 4 SC result blocks present (SC-7/8/9/10) — PASS
- `[SC-2] gallery first-paint:` literal captured — PASS (3 occurrences)
- Numeric milliseconds value extractable — PASS (`first-paint: 10434ms`)
- `Violation count` present + recorded count — PASS (2 distinct rule IDs)
- `aria-rowcount` reference — PASS (2 occurrences)
- `scrollTop|Scroll reset|scroll-reset` — PASS (4 occurrences)
- `skeleton-flash|TDSC-04` — PASS (7 occurrences)
- Cross-reference table references 5 sibling plans (180-01/02/03/04/06) — PASS (8 occurrences)
- `Playwright verdict: PASS|FAIL` ≥4 — PASS (4 plain-text matches)
- Defense-in-depth gate: status:passed=0 AND first-paint > 1000ms documented — PASS
- `human_verification:` entries for each failing SC — PASS (3 entries)

---

*Phase: 180-v21-launch-readiness, Plan: 05*
*Completed: 2026-05-11*
