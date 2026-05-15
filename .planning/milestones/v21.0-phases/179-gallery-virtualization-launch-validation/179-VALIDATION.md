---
phase: 179
slug: gallery-virtualization-launch-validation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
validation_signed_off: 2026-05-11
wave_0_evidence_ref: "179-03-SUMMARY.md key-files block — 3 RED scaffold files created: tests/unit/components/VirtualizedTemplateGrid.test.jsx (SC-1 unit gate), tests/e2e/template-gallery-perf.spec.js (SC-2 perf gate with CDP throttle + catalog-floor pre-flight), tests/e2e/template-gallery-axe.spec.js (SC-5 axe-core zero-violations gate scoped to [role='grid']). Wave 0 prerequisite @axe-core/playwright install documented in 179-01-SUMMARY.md (package.json devDependency). All 3 RED scaffolds committed before production virtualizer code per Plan 03 deliverable; Plans 04/05/06/08 flipped them to GREEN. Cross-reference: Phase 180 Plan 04 spot-check 2026-05-11 confirms files physically present + 179-03-SUMMARY.md cites them in key-files + package.json has @axe-core/playwright."
---

# Phase 179 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `179-RESEARCH.md` §"Validation Architecture" (lines 646–687).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit framework** | Vitest ^4.0.14 + @testing-library/react ^16.3.0 + jsdom ^27.3.0 [VERIFIED: package.json] |
| **E2E framework** | @playwright/test ^1.57.0 (Chromium project per `playwright.config.js` lines 51–54) |
| **Accessibility scanner** | @axe-core/playwright ^4.11.3 (NEW — install in Wave 0) |
| **Unit config** | implicit (`vitest run --dir tests/unit` per `package.json` `test:unit` script) |
| **E2E config** | `playwright.config.js` (project root) |
| **Quick unit run** | `npm run test:unit -- VirtualizedTemplateGrid` |
| **Quick E2E run** | `npm run test:e2e -- tests/e2e/template-gallery.spec.js` |
| **Full suite** | `npm run test:all` (vitest + playwright) |
| **Estimated runtime** | ~2s targeted unit · ~90s full unit · ~5min full E2E |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- VirtualizedTemplateGrid` (≤2s targeted)
- **After every plan wave:** Run `npm run test:unit` + `npm run test:e2e -- tests/e2e/template-gallery*.spec.js`
- **Before `/gsd-verify-work`:** Full suite must be green; v20.0 gallery E2E suite ≥90% green per SC-5
- **Max feedback latency:** ≤90s targeted unit on every commit; ≤5min E2E per wave merge

---

## Per-Task Verification Map

> Per-task rows are populated by the planner during plan generation.
> Each task references one (TVRZ-XX) requirement and resolves to one test mechanism below.
> This phase has no threat-model entries (security domain is presentation-layer only — see RESEARCH §"Security Domain").

| Requirement | SC | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----|----------|-----------|-------------------|-------------|--------|
| TVRZ-01 | SC-1 | `@tanstack/react-virtual` activated; scroll container has explicit CSS height; `overscan ≥ 3`; `count = 0` while `isLoading` | unit | `npm run test:unit -- VirtualizedTemplateGrid` | ❌ W0 | ⬜ pending |
| TVRZ-02 | SC-2 | Initial render <1s with 1× CPU throttle (CDP) at ~500-template catalog | E2E (Playwright + CDP) | `npm run test:e2e -- template-gallery-perf.spec.js` | ❌ W0 | ⬜ pending |
| TVRZ-03 | SC-3 | (a) viewport shows first result after search; (b) input retains focus; (c) no blank viewport; `scrollToOffset(0)` on every `filteredResults` identity change | E2E + unit spy | `npm run test:e2e -- template-gallery.spec.js` + `npm run test:unit -- scroll-reset` | ⚠ Partial (spec exists; case to add) | ⬜ pending |
| TVRZ-04 | SC-4 | `?category=Restaurant` URL → skeleton → category chip active → filtered count; no flash of "0 results" | E2E | `npm run test:e2e -- template-gallery.spec.js` (TDSC-04 case at line ~92; extend with skeleton-flash gate) | ⚠ Partial | ⬜ pending |
| TVRZ-05 | SC-5 | Skeleton/empty/error inside virtualized container; axe-core zero violations; `aria-rowcount` present; v20.0 gallery E2E ≥90% green | E2E (axe) + E2E (regression) | `npm run test:e2e -- template-gallery-axe.spec.js` + `npm run test:e2e -- tests/e2e/template-gallery*.spec.js` | ❌ W0 (axe spec) / ✓ Existing (`template-gallery*.spec.js`) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/components/VirtualizedTemplateGrid.test.jsx` — SC-1 unit assertions (overscan ≥3, count=0 guard, aria-rowcount math) for TVRZ-01
- [ ] `tests/unit/hooks/useContainerColumns.test.js` — ResizeObserver-driven cols (D-01) test with mocked RO for TVRZ-01
- [ ] `tests/e2e/template-gallery-perf.spec.js` — SC-2 first-paint <1s with CDP CPU throttle for TVRZ-02
- [ ] `tests/e2e/template-gallery-axe.spec.js` — SC-5 axe-core zero-violations scan scoped to `[role="grid"]` for TVRZ-05
- [ ] Extend `tests/e2e/template-gallery.spec.js` — SC-3 (scroll reset + focus retention + no blank viewport) + SC-4 (`?category=Restaurant` skeleton-flash gate)
- [ ] Install deps: `npm install @tanstack/react-virtual && npm install --save-dev @axe-core/playwright` (BLOCKING: must run before any test file is meaningful)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Smooth-scroll visual quality on mid-range hardware (no perceived jank during fast wheel/trackpad scroll) | TVRZ-03 | Subjective UX dimension; Playwright cannot reliably assert frame-pacing | Run dev server, navigate to `/template-gallery`, scroll the mid-catalog rapidly via trackpad and wheel; verify no visible jank, blank rows, or aspect-ratio flashes |
| OptiSigns visual parity (masonry feel — mixed-orientation cards interleave without letterboxing) | TVRZ-01 (D-02) | Visual judgment vs OptiSigns walkthrough reference | After Phase 178 portrait variants render in the grid, compare side-by-side with OptiSigns category view screenshot; assert mixed-orientation interleaving is visually similar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 items above + 1 install)
- [ ] No watch-mode flags in any executed test command
- [ ] Feedback latency < 90s per commit
- [ ] v20.0 gallery E2E suite baseline measured before Wave 1 begins (SC-5 ≥90% green is a delta gate; must know the baseline)
- [ ] `nyquist_compliant: true` set in frontmatter after all per-task rows mapped

**Approval:** pending
