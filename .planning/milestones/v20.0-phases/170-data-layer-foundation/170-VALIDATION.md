---
phase: 170
slug: data-layer-foundation
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
updated: 2026-04-15
---

# Phase 170 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) + Supabase SQL assertions (integration) + Node CLI smoke harness |
| **Config file** | `playwright.config.js` |
| **Quick run command** | `npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium` |
| **Full suite command** | `npx playwright test --project=chromium` |
| **Smoke harness** | `node scripts/smoke-template-gallery.mjs` |
| **Estimated runtime** | ~60 seconds (RLS spec) / ~5 min (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` verify block (SQL grep, file existence, or migration ASSERT block)
- **After every plan wave:** Run `npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium`
- **Before `/gsd-verify-work`:** Full RLS Playwright + all SQL assertions + `npm run build` green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Task IDs align with the final plan structure (Plan 01 = Wave 0 infra, Plan 02 = Wave 1 migration, Plan 03 = Wave 2 service + cleanup).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 170-00-01 | 01 | 0 | TDAT-02, TDAT-03 | T-170-03 | RLS spec + Tenant B helper + smoke harness + env docs exist; spec skip-guards when Tenant B absent | Playwright --list + file grep | `test -f tests/e2e/template-gallery-rls.spec.js && test -f tests/e2e/helpers/tenantB.js && test -f scripts/smoke-template-gallery.mjs && grep -q "TEST_TENANT_B_EMAIL" .env.example && npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium --list` | ✅ (this plan) | ⬜ pending |
| 170-01-01 | 02 | 1 | TDAT-01, TDAT-03, TDAT-04 | T-170-01, T-170-05, T-170-06 | Migration 111 file contains all 6 blocks (schema, RLS swap, seed, VIEW, GIN, ASSERT) | file grep | `grep -q "CREATE OR REPLACE VIEW gallery_templates" supabase/migrations/111_gallery_templates_view_and_rls.sql && grep -q "svg_templates_select" supabase/migrations/111_gallery_templates_view_and_rls.sql && [ "$(grep -c 'uuid_generate_v5' supabase/migrations/111_gallery_templates_view_and_rls.sql)" -ge 12 ]` | ✅ (this plan) | ⬜ pending |
| 170-01-02 | 02 | 1 | TDAT-01, TDAT-04 | T-170-04, T-170-06 | [BLOCKING] `supabase db push` applies migration; embedded DO $$ ASSERT block verifies seed count = 12 | Supabase CLI + SQL assert | `supabase db push --yes && supabase db query "SELECT COUNT(*) FROM gallery_templates WHERE source_table='svg_templates'" \| grep -E "12\|1[3-9]\|[2-9][0-9]"` | ✅ (this plan) | ⬜ pending |
| 170-01-03 | 02 | 1 | TDAT-03 | T-170-01 | Playwright RLS spec passes or skips; SQL confirms only `svg_templates_select` exists | Playwright + SQL | `npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium && supabase db query "SELECT polname FROM pg_policies WHERE tablename='svg_templates' AND cmd='SELECT'"` | ✅ (Plan 01) | ⬜ pending |
| 170-02-01 | 03 | 2 | TDAT-02 | T-170-07, T-170-08 | `fetchGalleryTemplates()` exists, reads only from VIEW, sanitizes search input | Node smoke + file grep | `grep -q "from('gallery_templates')" src/services/templateGalleryService.js && [ "$(grep -c 'LOCAL_SVG_TEMPLATES' src/services/templateGalleryService.js)" -eq 0 ] && node scripts/smoke-template-gallery.mjs` | ✅ (Plan 01 harness) | ⬜ pending |
| 170-02-02 | 03 | 2 | TDAT-02, TDAT-04 | T-170-09 | svgTemplateService delegates to gallery service; LOCAL_SVG_TEMPLATES removed | file grep + build | `[ "$(grep -c 'LOCAL_SVG_TEMPLATES' src/services/svgTemplateService.js)" -eq 0 ] && grep -q "editorType: 'svg'" src/services/svgTemplateService.js && npm run build` | ✅ | ⬜ pending |
| 170-03-01 | 03 | 2 | TDAT-04 | T-170-09 | FabricSvgEditor fetches sidebar templates from DB; LOCAL_SVG_TEMPLATES absent everywhere in src/ | repo-wide grep + build | `[ "$(grep -rn 'LOCAL_SVG_TEMPLATES' src/ --include='*.js' --include='*.jsx' \| wc -l \| tr -d ' ')" -eq 0 ] && grep -q "templates={sidebarTemplates}" src/components/svg-editor/FabricSvgEditor.jsx && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All wave 0 bootstrap work is delivered by Plan 01 (`170-01-PLAN.md`). After Plan 01 completes, every downstream task has an executable `<automated>` verify (no MISSING fallbacks remain).

- [ ] `tests/e2e/template-gallery-rls.spec.js` — two-tenant RLS smoke spec skeleton (TDAT-03) — created in Plan 01 task 170-00-01
- [ ] `tests/e2e/helpers/tenantB.js` — `loginAsTenantB`, `tenantBAvailable` helpers — created in Plan 01 task 170-00-01
- [ ] `scripts/smoke-template-gallery.mjs` — CLI harness for fetchGalleryTemplates (TDAT-02) — created in Plan 01 task 170-00-01
- [ ] `.env.example` contains `TEST_TENANT_B_EMAIL=` and `TEST_TENANT_B_PASSWORD=` placeholders — Plan 01 task 170-00-01
- [ ] Operational: actual TEST_TENANT_B_* values provisioned in the CI / local `.env` for Playwright to run non-skipped — NOT a planner deliverable; documented here as a prerequisite for full green on task 170-01-03

SQL self-verification for TDAT-01 and TDAT-04 is embedded as a `DO $$ ... ASSERT ... $$` block at the end of migration 111 itself (Plan 02 task 170-01-01) — the migration fails to apply if seed rows are missing, making the verification inseparable from the change.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SvgEditorPage + FabricSvgEditor render seeded SVG templates correctly after LOCAL_SVG_TEMPLATES removal | TDAT-04 | Visual/functional correctness of SVG rendering from DB URLs can regress silently; automated pixel test out of scope for Phase 170 | Load `/svg-editor?templateId={slug}` for 3 seeded slugs (e.g. `restaurant-menu-1`, `happy-hour-1`, `event-promo-1`); confirm SVG loads on canvas and LeftSidebar lists all 12 templates from the DB fetch |
| SvgTemplateGalleryPage still works during Phase 170 cutover (no Phase 171 page yet) | TDAT-02 | Page is the only user-facing gallery during Phase 170; regression means user-visible outage | Load `/svg-templates` logged in, confirm list renders >= 12 seeded rows, filter/search controls still work |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies satisfied by Plan 01
- [x] Sampling continuity: every task has automated verify — no 3-consecutive-task gaps
- [x] Wave 0 covers all MISSING references (RLS spec, tenant B helper, smoke harness, env vars)
- [x] No watch-mode flags
- [x] Feedback latency < 60s (fastest SQL grep <1s; Playwright RLS spec ~20-60s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — task IDs aligned to final plans (170-00-01 / 170-01-* / 170-02-* / 170-03-01)
