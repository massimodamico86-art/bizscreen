---
phase: 171
slug: core-gallery-ui-redesign
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
---

# Phase 171 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.14 (unit) + Playwright 1.57.0 (E2E) |
| **Config file** | `vitest.config.js`, `playwright.config.js` |
| **Quick run command** | `npx vitest run tests/unit/pages/TemplateGalleryPage.test.jsx` |
| **Full suite command** | `npx vitest run tests/unit/pages && npx playwright test tests/e2e/template-gallery.spec.js --project=chromium` |
| **Estimated runtime** | ~30 seconds (quick) / ~3 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run quick run command (scoped to touched test file)
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

> Every task in every Phase 171 plan has an entry here. `File Exists?` column tracks
> Wave 0 progression — rows flip from `Wave 0` to `✅ present` as stubs are created.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 171-01-T1 | 01 | 0 | Infra (fuse.js)   | T-171-V01 | Vetted npm package, pinned version  | Unit (smoke)     | `node -e "import('fuse.js').then(m=>console.log(typeof m.default))"` | After task ✅ | ✅ green |
| 171-01-T2 | 01 | 0 | Infra (fixture)   | T-171-I03 | Snake_case shape matches VIEW       | Unit (import)    | `node --input-type=module -e "import('./tests/fixtures/galleryTemplates.js').then(m=>console.log(m.mockGalleryRows().length))"` | After task ✅ | ✅ green |
| 171-01-T3 | 01 | 0 | TGAL-02/03/04, TDSC-02/03/05 | T-171-V02, T-171-I01 | Test stubs describe expected states | Unit (RTL stub) | `npx vitest run tests/unit/pages/TemplateGalleryPage.test.jsx` (must exit 1 — RED) | After task ✅ | ✅ green |
| 171-01-T4 | 01 | 0 | Pitfall 1 regression | T-171-T01 | App.jsx import integrity            | Unit (static)    | `npx vitest run tests/unit/pages/templateMarketplaceAlias.test.jsx` (must exit 1 — RED) | After task ✅ | ✅ green |
| 171-01-T5 | 01 | 0 | TGAL-01, TGAL-05, TDSC-01, TDSC-04 | T-171-V02, T-171-I02 | E2E spec stubs for structural assertions | Playwright (stub) | `npx playwright test tests/e2e/template-gallery.spec.js --project=chromium --list` (must find 0+ tests, syntactically valid) | After task ✅ | ✅ green |
| 171-02-T1 | 02 | 1 | TGAL-01..05, TDSC-01..05 | T-171-V01, T-171-V02, T-171-I03, T-171-T01 | React text interpolation, `<img>` thumbnails, namespaced localStorage, URL-param-safe | Unit (RTL)       | `npx vitest run tests/unit/pages/TemplateGalleryPage.test.jsx` (GREEN) | Wave 1 | ✅ green |
| 171-02-T2 | 02 | 1 | Pitfall 1 (atomic) | T-171-T01 | No stale pageMap alias, single commit | Unit (static)    | `npx vitest run tests/unit/pages/templateMarketplaceAlias.test.jsx` (GREEN) | Wave 1 | ✅ green |
| 171-02-T3 | 02 | 1 | TGAL-01 (delete legacy) | T-171-T02 | Legacy page removed, no orphaned refs | Unit (grep)      | `! grep -rn "SvgTemplateGalleryPage" src/` (exit 0 when no hits) | Wave 1 | ✅ green |
| 171-03-T1 | 03 | 2 | TGAL-01, TGAL-05, TDSC-01, TDSC-04 | T-171-V02, T-171-I02 | Browser render, URL round-trip, debounced search | Playwright E2E   | `npx playwright test tests/e2e/template-gallery.spec.js --project=chromium` (GREEN) | Wave 2 | ✅ green |
| 171-03-T2 | 03 | 2 | UI-SPEC compliance | n/a | Visual verification of badges, empty states, responsive breakpoints | Human checkpoint  | Manual per UI-SPEC + VALIDATION `## Manual-Only Verifications` | Wave 2 | ✅ green |
| 171-03-T3 | 03 | 2 | Sign-off | n/a | `nyquist_compliant: true` flipped | Doc update       | `grep -q "nyquist_compliant: true" .planning/phases/171-core-gallery-ui-redesign/171-VALIDATION.md` | Wave 2 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/pages/TemplateGalleryPage.test.jsx` — stubs for TGAL-01 through TGAL-05 and TDSC-01 through TDSC-05
- [ ] `tests/unit/pages/templateMarketplaceAlias.test.jsx` — Pitfall 1 regression stub
- [ ] `tests/e2e/template-gallery.spec.js` — stubs for browse/search/filter/sort/URL-sync acceptance criteria
- [ ] `tests/fixtures/galleryTemplates.js` — shared fixture returning mock `gallery_templates` rows (snake_case VIEW shape, including mixed orientation / use_count / created_at values)
- [ ] `fuse.js@^7.3.0` — install as new runtime dependency for client-side fuzzy search

*Service layer is Phase 170's responsibility — NOT re-tested here.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Illustrated empty state visual quality | Success #5 | Illustration asset choice + composition is a design judgement, not a functional assertion | Open gallery with filters that match nothing; verify `SearchIllustration` renders and "Browse all templates" button is clickable |
| "New" / "Popular" badge placement aesthetics | Success #1 | Visual polish on card hover + badge stacking | Hover every card in grid at 3 viewports (375, 768, 1440); confirm no overlap with thumbnail or title; verify "New" top-left, "Popular" top-right |
| Skeleton-to-content perceived smoothness | Success #5 | Requires human eye for transition jank | Simulate slow network (DevTools 3G); verify skeleton matches final card dimensions to avoid layout shift |
| Sticky filter bar behavior under scroll | UI-SPEC Layout | Visual confirmation of `sticky top-0 z-10` + backdrop-blur | Scroll gallery with >12 templates; confirm filter bar remains visible and legible |

---

## Threat Reference Index

Threat IDs referenced in the Per-Task Verification Map — full details live in each plan's `<threat_model>` block.

| Threat ID | Category | Surface |
|-----------|----------|---------|
| T-171-V01 | Tampering (V5) | URL-parsed search/filter/sort values |
| T-171-V02 | Tampering (V5) | fuse.js query (user typing) |
| T-171-I01 | Information Disclosure (V8) | localStorage "Recently Used" namespace |
| T-171-I02 | Information Disclosure (V4) | Cross-tenant `gallery_templates` read |
| T-171-I03 | Information Disclosure (V7) | Fetch-error surface in `EmptyState` |
| T-171-T01 | Tampering (V5) | `App.jsx` pageMap alias integrity |
| T-171-T02 | Tampering | Orphaned legacy component reference |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (CI must exit)
- [x] Feedback latency < 30s for quick run
- [x] `nyquist_compliant: true` set in frontmatter (flipped in 171-03-T3)

**Approval:** approved
