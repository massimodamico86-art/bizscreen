---
phase: 166
slug: template-quick-customize
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 166 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / Playwright |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30 seconds (unit) / ~120 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 166-01-01 | 01 | 1 | CONT-01 | T-166-01, T-166-02 | textContent (not innerHTML), href+xlink:href | unit (TDD) | `npx vitest run tests/unit/services/svgCustomize.test.js` | ❌ W1 creates | ⬜ pending |
| 166-02-01 | 02 | 2 | CONT-01 | T-166-04 | canAccess re-check before Apply | unit+static | `npx vitest run tests/unit/services/svgCustomize.test.js && node -e "..."` | ✅ | ⬜ pending |
| 166-02-02 | 02 | 2 | CONT-01 | T-166-02, T-166-03, T-166-05 | MIME validation, revokeObjectURL, no navigate | static | `node -e "..."` (file content checks) | ✅ | ⬜ pending |
| 166-02-03 | 02 | 2 | CONT-01 | — | N/A | E2E | `npx playwright test tests/e2e/template-marketplace.spec.js --grep "Quick Customize"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Plan 01 (Wave 1) creates unit tests via TDD before Wave 2 plans execute. Plan 02 Task 3 creates E2E tests inline.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live SVG preview updates visually | CONT-01 | Visual rendering verification | Open template, change color, verify SVG re-renders |
| Logo upload replaces placeholder | CONT-01 | File upload + visual | Upload PNG, verify logo appears in preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
