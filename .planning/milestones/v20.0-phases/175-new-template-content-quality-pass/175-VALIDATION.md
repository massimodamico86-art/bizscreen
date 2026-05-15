---
phase: 175
slug: new-template-content-quality-pass
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 175 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/integration) + Playwright (E2E) |
| **Config file** | `vitest.config.js`, `playwright.config.js` |
| **Quick run command** | `npm run test:unit -- --run --reporter=basic` |
| **Full suite command** | `npm run test && npm run test:e2e -- --project=chromium` |
| **Estimated runtime** | unit ~30s · full ~6 min |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --run path/to/touched.test.js`
- **After every plan wave:** Run full suite for the touched surface (validator, thumbnails, RLS, taxonomy, gallery e2e)
- **Before `/gsd-verify-work`:** Full unit + integration green; targeted E2E green
- **Max feedback latency:** 30s for unit, 90s for integration

---

## Per-Task Verification Map

> Filled by planner during Step 8. Each PLAN.md task must have an `<automated>` verify command or a Wave 0 dependency. Manual gaps are listed in **Manual-Only Verifications** below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 175-XX-XX | _planner_ | _planner_ | TCTN-01..04 / TQAL-05 | _planner_ | _planner_ | unit/integration/e2e | _planner_ | _planner_ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/svgValidator.js` — validator service stubs (RED state) covering 6 rules from RESEARCH.md
- [ ] `tests/unit/services/svgValidator.test.js` — failing assertions for each validation rule
- [ ] `scripts/validate-templates.cjs` — CLI runner stub (`npm run validate:templates`)
- [ ] `scripts/generate-thumbnails.cjs` — thumbnail rasterizer stub (using `@resvg/resvg-js`)
- [ ] `tests/integration/thumbnails.test.js` — integration test stub for resvg-js → S3 upload
- [ ] `tests/e2e/template-gallery-100.spec.js` — structural-assertion E2E stub (`toHaveCount` with `>=` semantics or `getByRole` count assertion)
- [ ] Install `@resvg/resvg-js` (verified `2.6.2` available)
- [ ] Spot-test resvg-js against 5 representative existing SVG templates to confirm fidelity (RESEARCH MEDIUM-confidence area)

*All Wave 0 stubs land in RED state. Wave 1 turns them green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity of generated thumbnails | TCTN-04 | Pixel-perfect rendering not auto-checkable cross-rasterizer | Spot-check 5 thumbnails against source SVG in browser preview |
| Template visual quality at gallery scale | TCTN-01 | Subjective design quality | Designer/PM review of catalog at 100+ templates |
| Open-source licensing audit | TCTN-01 | Legal review of attribution + license compatibility | Review `175-LICENSE-MANIFEST.md` against open-source license list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
