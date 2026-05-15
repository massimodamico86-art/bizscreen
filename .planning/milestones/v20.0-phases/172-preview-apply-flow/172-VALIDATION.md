---
phase: 172
slug: preview-apply-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 172 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | vitest 4.0.14 (config: `vitest.config.js`; env: jsdom) |
| **Framework (E2E)** | Playwright 1.57.0 (config: `playwright.config.js`; test dir: `tests/e2e`) |
| **Quick run command** | `npx vitest run --dir tests/unit/services --dir tests/unit/components/template-gallery --dir tests/integration/preview-apply` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~20s quick; ~4m full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <directory-touched>` (modal, panel, or service dir — whichever the task modified).
- **After every plan wave:** Run `npx vitest run` (all unit + integration).
- **Before `/gsd-verify-work`:** `npm run test && npm run test:e2e` must be green.
- **Max feedback latency:** 20 seconds for quick, 4 minutes for full.

---

## Per-Task Verification Map

Filled in during plan-checker sampling. Reference `172-RESEARCH.md §Validation Architecture §Phase Requirements → Test Map` for the authoritative req→test rows; plans must cite these file paths in `<automated>` blocks.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (populated during /gsd-plan-phase sampling) | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All test files are net-new — this is a brand-new component area. Wave 0 creates the test scaffolds and verifies they can execute (even with placeholder assertions) before Wave 1+ begins implementation.

- [ ] `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` — stubs for TPRV-01 (open/close/nav), TPRV-03 live update propagation, Pitfall 2 (double-apply), Pitfall 3 (nav discards edits), Pitfall 7 (stable filtered array).
- [ ] `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` — stubs for TPRV-02 (sections), TPRV-03 (swatch change → `swapColor`), brand-theme prefill.
- [ ] `tests/unit/services/templateApplyService.test.js` — stubs for TPRV-04 dispatcher, DOMPurify integration (security), `editorRouteFor()`.
- [ ] `tests/integration/preview-apply/rpc-atomicity.test.js` — stubs for TPRV-05 atomicity + license gate (stubbed supabase client).
- [ ] `tests/e2e/preview-apply.spec.js` — stubs for TPRV-06 (sessionStorage absent after handoff) + end-to-end gallery → modal → customize → apply → editor.

*Infrastructure (vitest, playwright, jsdom, React Testing Library) is already installed and configured — no framework install needed. `tests/conftest`-equivalent shared fixtures can live in `tests/support/` if needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Split-view proportions 65/35 at 1440px | TPRV-01 / UI-SPEC §Layout Anatomy | Visual proportion; jsdom has no layout engine | Open gallery at 1440×900 viewport, click template, measure preview pane ≈ 65% and panel ≈ 35% |
| Stacked mobile layout at 375px | TPRV-01 / UI-SPEC §Stacked Mobile | Visual layout; Playwright viewport emulation verifies DOM but not paint | Chrome DevTools device emulation at 375px, verify preview top / panel scrolls / Apply sticky bottom |
| Keyboard-only full flow | TPRV-01 Accessibility | Tab order, focus trap, focus restore — subtle semantics | Tab into card → Enter → modal opens → ArrowRight cycles → Escape closes → focus returns to originating card |
| Color swatch opens native picker on touch | UI-SPEC §Colors Section | Native input[type=color] invocation device-specific | Tap swatch on iOS Safari and Android Chrome, verify native color picker UI appears |
| Backdrop click does NOT close modal | UI-SPEC §Modal Open/Close | `closeOnOverlay={false}` is structural; regression-prone | Click the dim area outside the modal card — modal must stay open |
| Apply failure Alert behaviour | UI-SPEC §Apply CTA | Transient runtime state; easier visual inspection | Temporarily force RPC failure (e.g., invalid auth), confirm inline Alert appears above Apply, dismissible, Apply re-enables |
| Polotno apply lands on scene-editor | D-16 (CONTEXT.md) | Cross-page navigation + DB round-trip better observed manually | Apply a Polotno-type gallery template, verify browser lands on `scene-editor-{sceneId}`; rendering fidelity inside scene editor is out-of-scope (Phase 174 follow-up) |
| DOMPurify actually strips `<script>`/`on*` in the real flow | D-17 security | Unit tests cover the helper; full-flow assurance requires inspection | DevTools: intercept `supabase.rpc('clone_template_with_customization')` call, inspect `p_customized_svg` payload — must contain no `<script>` tags nor `on*` attributes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 new test files above)
- [ ] No watch-mode flags in any `<automated>` command
- [ ] Feedback latency < 20s for quick runs
- [ ] `nyquist_compliant: true` set in frontmatter once plans filled in Per-Task map

**Approval:** pending
