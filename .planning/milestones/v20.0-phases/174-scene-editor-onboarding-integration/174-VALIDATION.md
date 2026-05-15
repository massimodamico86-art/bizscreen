---
phase: 174
slug: scene-editor-onboarding-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 174 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `.planning/phases/174-scene-editor-onboarding-integration/174-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.x (unit/integration) + Playwright 1.x (E2E) |
| **Config file** | `vitest.config.js` / `playwright.config.js` (existing) |
| **Quick run command** | `npx vitest run tests/unit/services/onboardingService.test.js tests/unit/services/marketplaceService.test.js` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | Quick: ~10s · Full: ~6–8 min (vitest + playwright) |

---

## Sampling Rate

- **After every task commit:** Run quick command (vitest unit on the modified service)
- **After every plan wave:** Run full vitest suite + targeted Playwright spec for the wave (e.g. `npx playwright test tests/e2e/editor-return.spec.js`)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds for unit/integration; 5 minutes for E2E

---

## Per-Task Verification Map

> Planner fills this table after PLAN.md files are produced (one row per task with task IDs from frontmatter).
> Until planning completes, this section enumerates the requirement→test mapping that plans MUST honor.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| TEDR-01 | "Browse Templates" button visible in editor topbar; click navigates to gallery with `?editorReturn=1&returnSceneId=X` | E2E | `npx playwright test tests/e2e/editor-return.spec.js -g "shows Browse Templates"` | ❌ W0 | ⬜ pending |
| TEDR-02 | After "Use Template" apply, `scene_slides.design_json.svgContent` is updated atomically | Integration | `npx vitest run tests/integration/apply-template-to-slide.test.js` | ❌ W0 | ⬜ pending |
| TEDR-02 | Returning to scene editor lands on `scene-editor-<returnSceneId>` page with new template visible | E2E | `npx playwright test tests/e2e/editor-return.spec.js -g "round-trip"` | ❌ W0 | ⬜ pending |
| TEDR-03 | `?editorReturn=1` flips gallery to svg-only filter and swaps CTA copy to "Use Template" | E2E | `npx playwright test tests/e2e/editor-return.spec.js -g "preserves editorReturn"` | ❌ W0 | ⬜ pending |
| TONB-01 | `ONBOARDING_STEPS` length === 7; `starter_pack` between `logo` and `first_media` | Unit | `npx vitest run tests/unit/services/onboardingService.test.js -t "ONBOARDING_STEPS"` | ✅ extend | ⬜ pending |
| TONB-02 | Selecting a pack in the wizard calls `applyStarterPack` and auto-advances to `first_media` | E2E | `npx playwright test tests/e2e/onboarding.spec.js -g "starter_pack apply"` | ✅ extend | ⬜ pending |
| TONB-02 | Skip on `starter_pack` step writes `completed_starter_pack=TRUE` and advances without applying | E2E | `npx playwright test tests/e2e/onboarding.spec.js -g "starter_pack skip"` | ✅ extend | ⬜ pending |
| TONB-03 | `update_onboarding_step('starter_pack', true)` writes `completed_starter_pack=TRUE`; RPC return shape includes both new columns | Integration | `npx vitest run tests/integration/onboarding-rpc.test.js` | ❌ W0 | ⬜ pending |
| TONB-04 | First gallery visit shows tour (4 stops); second visit does not | E2E | `npx playwright test tests/e2e/gallery-tour.spec.js` | ❌ W0 | ⬜ pending |
| TONB-04 | Any tour exit (complete, X, Escape, skip) writes `completed_gallery_tour=TRUE` | E2E | `npx playwright test tests/e2e/gallery-tour.spec.js -g "dismissal"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install driver.js@^1.4.0` — required before any import; CSS import is mandatory
- [ ] `tests/e2e/editor-return.spec.js` — RED stubs for TEDR-01..03 (mirror `tests/e2e/preview-apply.spec.js`)
- [ ] `tests/e2e/gallery-tour.spec.js` — RED stubs for TONB-04 (4-stop assertion + persistence)
- [ ] `tests/integration/apply-template-to-slide.test.js` — RED stubs for TEDR-02 (atomicity, RLS, polotno-rejection per D-02)
- [ ] `tests/integration/onboarding-rpc.test.js` — RED stubs for TONB-03 (column write, return-shape extension, allowlist)
- [ ] `tests/unit/hooks/useGalleryTour.test.js` — RED stubs for hook conditional logic (mocks `get_onboarding_progress`)
- [ ] `tests/unit/services/onboardingService.test.js` — extend ONBOARDING_STEPS length assertion (6 → 7)
- [ ] `tests/unit/services/marketplaceService.test.js` — extend with `applyTemplateToActiveSlide` wrapper coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirmation dialog wording is acceptable for destructive slide replace (D-01) | TEDR-02 | Copy review is subjective | Trigger "Use Template" on a non-default slide; verify modal copy: "Replace this slide with [template name]? Your current edits will be lost." with destructive-styled "Replace" button |
| driver.js tour visual placement and pointer alignment at <=768px viewport | TONB-04 | Visual layout verification | Resize to mobile, run first-visit gallery tour, verify all 4 anchors are on-screen and not clipped behind collapsed nav |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (driver.js install + 6 new test files)
- [ ] No watch-mode flags in any verify command
- [ ] Feedback latency < 60s for unit, < 5min for E2E
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills per-task map

**Approval:** pending
