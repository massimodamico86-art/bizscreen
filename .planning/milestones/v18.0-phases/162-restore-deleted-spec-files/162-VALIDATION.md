---
phase: 162
slug: restore-deleted-spec-files
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
validated: 2026-04-11
---

# Phase 162 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (via @playwright/test) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --list` |
| **Full suite command** | `npx playwright test --list` |
| **Estimated runtime** | ~5 seconds (parse-only, no browser) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --list`
- **After every plan wave:** Run `npx playwright test --list`
- **Before `/gsd-verify-work`:** Full list must discover all 29 restored/repaired spec files
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 162-01-01 | 01 | 1 | AUTH-01..08 | — | N/A | parse | `npx playwright test --list tests/e2e/auth*.spec.js` | ✅ | ✅ green (14 tests) |
| 162-01-02 | 01 | 1 | NAVX-01..10 | — | N/A | parse | `npx playwright test --list tests/e2e/nav*.spec.js` | ✅ | ✅ green (20 tests) |
| 162-01-03 | 01 | 1 | SCRN-01..08 | — | N/A | parse | `npx playwright test --list tests/e2e/screen*.spec.js` | ✅ | ✅ green (19 tests) |
| 162-01-04 | 01 | 1 | SCHED-01..08 | — | N/A | parse | `npx playwright test --list tests/e2e/campaign*.spec.js` | ✅ | ✅ green (21 tests) |
| 162-01-05 | 01 | 1 | WDGT-01..10 | — | N/A | parse | `npx playwright test --list tests/e2e/widget*.spec.js` | ✅ | ✅ green (36 tests) |
| 162-01-06 | 01 | 1 | MENU-01..04 | — | N/A | parse | `npx playwright test --list tests/e2e/menu*.spec.js` | ✅ | ✅ green (19 tests) |
| 162-01-07 | 01 | 1 | LANG-01..03 | — | N/A | parse | `npx playwright test --list tests/e2e/lang*.spec.js` | ✅ | ✅ green (19 tests) |
| 162-01-08 | 01 | 1 | ADMN-01..06 | — | N/A | parse | `npx playwright test --list tests/e2e/admin*.spec.js` | ✅ | ✅ green (26 tests) |
| 162-01-09 | 01 | 1 | ENTR-01..05 | — | N/A | parse | `npx playwright test --list tests/e2e/enterprise*.spec.js` | ✅ | ✅ green (17 tests) |
| 162-01-10 | 01 | 1 | PLYR-01..06 | — | N/A | parse | `npx playwright test --list tests/e2e/player*.spec.js` | ✅ | ✅ green (14 tests) |
| 162-02-01 | 02 | 1 | CONT-02..04,07..12 | — | N/A | parse | `npx playwright test --list tests/e2e/playlists.spec.js tests/e2e/template-marketplace.spec.js` | ✅ | ✅ green (45 tests) |
| 162-03-01 | 03 | 1 | — | — | N/A | parse | `npx playwright test --list tests/e2e/fixtures/index.js` | ✅ | ✅ green (infra) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (Phase 161 installed Playwright fixtures and helpers).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification (parse-only `--list` check).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-11

---

## Validation Audit 2026-04-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Method:** `npx playwright test --list` — 572 tests in 61 files, 0 parse errors. All 12 task verification commands confirmed test discovery across all requirement domains (AUTH, NAVX, SCRN, SCHED, WDGT, MENU, LANG, ADMN, ENTR, PLYR, CONT). Total: 250 tests across 29 restored/repaired spec files.
