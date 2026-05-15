---
phase: 168
slug: test-doc-quality-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 168 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright Test (E2E) + ESLint (static) — both already installed |
| **Config file** | `playwright.config.js` (present); `eslint.config.js` (ABSENT — Wave 0 gap) |
| **Quick run command** | `npx playwright test tests/e2e/layouts-screenshots.spec.js tests/e2e/playlists.spec.js --project=chromium --reporter=list` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~90–180 seconds for the two restored specs; ~minutes for full e2e |

---

## Sampling Rate

- **After every task commit:** Run the task's own grep-level verification (5-second checks).
- **After every plan wave:**
  - Post-Wave 0 (ESLint config): `npx eslint tests/e2e/*.spec.js` exits 0 on unchanged files.
  - Post-Wave 1 (Restore): `npx playwright test tests/e2e/layouts-screenshots.spec.js tests/e2e/playlists.spec.js --reporter=list` — restored files load without import errors; at least one describe block green.
  - Post-Wave 2 (TQAL fixes): re-run all four grep checks + the full restored-spec suite.
- **Before `/gsd-verify-work`:** All three restored-spec files green under live Playwright (D-07).
- **Max feedback latency:** 180 seconds for per-wave e2e; 5 seconds for per-task greps.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 168-00-01 | 00 | 0 | TQAL-01 | — | N/A | static | `test -f eslint.config.js && npx eslint tests/e2e/layouts-screenshots.spec.js tests/e2e/fixtures/index.js tests/e2e/playlists.spec.js` | ❌ W0 | ⬜ pending |
| 168-01-01 | 01 | 1 | TQAL-01/03/04 (restore targets) | — | N/A | static | `test -f tests/e2e/layouts-screenshots.spec.js && test -f tests/e2e/fixtures/index.js && test -f tests/e2e/playlists.spec.js && test -f tests/e2e/helpers/index.js && test -f tests/e2e/helpers/screenshots.js && grep -q "assertAppReady" tests/e2e/helpers.js` | ❌ W1 | ⬜ pending |
| 168-02-01 | 02 | 2 | TQAL-01 | — | N/A | static+lint | `! grep -q TEST_LAYOUT_PREFIX tests/e2e/layouts-screenshots.spec.js && npx eslint tests/e2e/layouts-screenshots.spec.js` | ❌ W1 | ⬜ pending |
| 168-02-02 | 02 | 2 | TQAL-02 | — | N/A | static | `! grep -q "language variants" .planning/ROADMAP.md .planning/milestones/v18.0-ROADMAP.md && grep -q "locale preference" .planning/ROADMAP.md .planning/milestones/v18.0-ROADMAP.md` | ✅ main | ⬜ pending |
| 168-02-03 | 02 | 2 | TQAL-03 | — | N/A | static | `! grep -q "storage state" tests/e2e/fixtures/index.js && grep -q "loginAndPrepare" tests/e2e/fixtures/index.js` | ❌ W1 | ⬜ pending |
| 168-02-04 | 02 | 2 | TQAL-04 | — | N/A | static | `[ "$(grep -c partial tests/e2e/playlists.spec.js)" -eq 0 ]` | ❌ W1 | ⬜ pending |
| 168-03-01 | 03 | 3 | D-07 (all TQAL-01..04 via live run) | — | Restored specs pass under live product | e2e (live) | `npx playwright test tests/e2e/layouts-screenshots.spec.js tests/e2e/playlists.spec.js --reporter=list` | ❌ W1/W2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `eslint.config.js` at repo root — required for D-09 (`npx eslint tests/e2e/...`) to execute at all under ESLint 9.x. Start from `git show 289a2c7b^:eslint.config.js` (56 lines) and remove `'tests'` from the `ignores` array so test files lint cleanly.
- [ ] Confirm `.env` (or runner env) provides both `TEST_USER_EMAIL/PASSWORD` and `TEST_CLIENT_EMAIL/PASSWORD` before Wave 3 live run (D-07).
- [ ] (Optional) Confirm port 5173 is free, or set `PLAYWRIGHT_BASE_URL` to a pre-running instance, before Wave 3.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Playwright auth fixtures still drive valid sessions after restore | D-07 | Live session validity can't be grep-checked | Observe Playwright trace after Wave 3 shows authenticated DOM under `/playlists` and `/layouts` routes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (eslint.config.js)
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
