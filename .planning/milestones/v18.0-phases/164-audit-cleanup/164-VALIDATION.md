---
phase: 164
slug: audit-cleanup
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 164 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E), Vitest (unit) |
| **Config file** | `playwright.config.js`, `vitest.config.js` |
| **Quick run command** | `npx playwright test tests/e2e/scenes.spec.js --list` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~5 seconds (list check) |

---

## Sampling Rate

- **After every task commit:** Run `grep "assertAppReady" tests/e2e/scenes.spec.js` + `npx playwright test tests/e2e/scenes.spec.js --list`
- **After every plan wave:** Run `npx playwright test tests/e2e/scenes.spec.js --list`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 164-01-01 | 01 | 1 | CONT-01 | T-164-01 (accepted — test-only, no security impact) | N/A | e2e-parse | `grep -c "assertAppReady" tests/e2e/scenes.spec.js \| grep -q "^0$" && npx playwright test tests/e2e/scenes.spec.js --list` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test scaffolding needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

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
