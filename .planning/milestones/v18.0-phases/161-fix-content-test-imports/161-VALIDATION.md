---
phase: 161
slug: fix-content-test-imports
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 161 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) |
| **Config file** | `playwright.config.js` |
| **Quick run command** | `npx playwright test tests/e2e/scenes.spec.js --list` |
| **Full suite command** | `npx playwright test tests/e2e/scenes.spec.js tests/e2e/layouts-screenshots.spec.js --list` |
| **Estimated runtime** | ~3 seconds (--list mode) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test {modified_spec} --list`
- **After every plan wave:** Run `npx playwright test tests/e2e/scenes.spec.js tests/e2e/layouts-screenshots.spec.js --list`
- **Before `/gsd-verify-work`:** Full suite must list all tests with exit 0
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 161-01-01 | 01 | 1 | CONT-01 | T-161-01 | Test-only code, no prod impact | e2e-list | `grep "export async function assertAppReady" tests/e2e/helpers.js` | ✅ | ✅ green |
| 161-01-02 | 01 | 1 | CONT-01, CONT-05, CONT-06 | — | N/A | e2e-list | `npx playwright test tests/e2e/scenes.spec.js --list` | ✅ | ✅ green |
| 161-02-01 | 02 | 1 | CONT-05, CONT-06 | T-161-02 | Test-only fixtures, no prod impact | e2e-list | `npx playwright test tests/e2e/layouts-screenshots.spec.js --list` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Playwright was already configured. No new test framework needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-10

---

## Validation Audit 2026-04-10

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 3 requirements (CONT-01, CONT-05, CONT-06) have automated verification via Playwright `--list` confirming tests load without module errors. Code review issues (WR-01, WR-02, WR-03) were all fixed. UAT passed 4/4.

---

_Validated: 2026-04-10_
_Validator: Claude (gsd-nyquist-auditor)_
