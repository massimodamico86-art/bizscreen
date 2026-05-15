---
phase: 175-new-template-content-quality-pass
plan: 07
subsystem: testing-signoff
tags: [tqal-05, structural-assertions, e2e-audit, pitfall-4, sign-off, milestone-v20]

# Dependency graph
requires:
  - phase: 175-new-template-content-quality-pass
    plan: 06
    provides: Live migration applied (127 active templates, 103 net-new); thumbnail backfill DEFERRED (env vars unavailable)
  - phase: 175-new-template-content-quality-pass
    plan: 01
    provides: expectAtLeastOneTemplateCard + expectGalleryRendersWithoutError helpers; tests/e2e/template-gallery-100.spec.js (3 RED tests)
  - phase: 171-core-gallery-ui-redesign
    provides: tests/e2e/template-gallery.spec.js (Phase 171 baseline — already structural)
provides:
  - "TQAL-05 audit lint: 0 matches across all gallery E2E specs (template-gallery, template-gallery-100, template-gallery-rls, template-packs, gallery-tour)"
  - "expectAtLeastOneTemplateCard helper imported by 2 specs (template-gallery.spec.js + template-gallery-100.spec.js); per acceptance criterion >= 2"
  - "Plan 175-01's 3/3 RED template-gallery-100 tests flipped GREEN against live 127-row catalog (sidebar-click navigation pattern + ?q= URL pinning per Pitfall 4)"
  - "Phase-level sign-off: 5 ROADMAP success criteria mapped to PASS / PARTIAL / FAIL with concrete verification commands"
  - "deferred-items.md — 3 pre-existing E2E failures documented as out-of-scope per scope-boundary rule (Phase 171 TDSC-04 product-routing, Phase 174 gallery-tour state, Phase 173 packs Layouts button)"
affects: [/gsd-verify-work 175 (orchestrator verifier consumes this document directly), v20.0 milestone (Phase 175 closes the milestone)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sidebar-click navigation pattern for E2E tests against App.jsx pseudo-router (useState('dashboard') at App.jsx:162) — proven against 5/6 Phase 171 specs and 3/3 Plan 175-01 specs"
    - "Pitfall 4 mitigation: history.pushState `?q=<term>` BEFORE component mount so TemplateGalleryPage's local searchInput initializer (src/pages/TemplateGalleryPage.jsx:157 — `useState(() => searchParams.get('q') ?? '')`) reads it on first render and pins results to page 1 of the 127-row catalog"
    - "Acknowledgment that the planner's `?search=` mitigation (Plan 07 body) was the wrong param name — the actual product param is `?q=` (verified in src/pages/TemplateGalleryPage.jsx:163); fix applied as Rule 1 deviation"
    - "Pre-existing test failures isolated to deferred-items.md instead of conflated with Phase 175 deliverables (scope-boundary rule)"

key-files:
  created:
    - ".planning/phases/175-new-template-content-quality-pass/175-07-SUMMARY.md (this file)"
    - ".planning/phases/175-new-template-content-quality-pass/deferred-items.md"
  modified:
    - "tests/e2e/template-gallery.spec.js (+ helper import + structural card-presence assertion in TGAL-01 test)"
    - "tests/e2e/template-gallery-100.spec.js (sidebar-click navigation + ?q= URL seeding via history.pushState + popstate)"

key-decisions:
  - "Plan 07 body specified `?search=` as the Pitfall 4 query param; actual product code at src/pages/TemplateGalleryPage.jsx:163 reads `?q=`. Fixed as Rule 1 (test bug) — test would never have passed without this correction. Documented in deferred-items.md and inline test comments."
  - "Plan 01 ships template-gallery-100.spec.js using `?page=svg-templates` URL routing, but App.jsx uses an in-app pseudo-router (useState('dashboard'), App.jsx:162) — there is no `?page=` query param handler. Switched to sidebar-click pattern (mirroring Phase 171's template-gallery.spec.js gotoTemplates helper). Rule 1 deviation documented inline."
  - "TCTN-04 marked PARTIAL (not PASS) per Plan 06's deferral note: live S3 thumbnail backfill is awaiting `VITE_API_URL` + `SUPABASE_SERVICE_ROLE_KEY` environment variables. Schema/content layer is GREEN; S3 layer is documented in Plan 06's operator runbook."
  - "Pre-existing E2E failures (Phase 171 TDSC-04, Phase 174 gallery-tour, Phase 173 template-packs Layouts) logged to deferred-items.md instead of repaired — they are out-of-scope per the scope-boundary rule (Phase 175 audits gallery structural assertions, not Phase 171/173/174 product-routing or per-test state seeding)."

patterns-established:
  - "Phase-closing sign-off SUMMARY = ROADMAP SC table + Phase Requirement traceability table + Plan outcomes table + Test Surface Health table + Threats Mitigated section + Open Questions list"
  - "deferred-items.md per phase as the sanctioned destination for pre-existing failures discovered during audit (preserves visibility without conflating responsibility)"

requirements-completed: [TQAL-05]
requirements-partial: [TCTN-04]  # Schema/content GREEN, S3 backfill DEFERRED to operator (Plan 06 runbook)

# Metrics
duration: ~25min
completed: 2026-05-03
---

# Phase 175 — New Template Content + Quality Pass — Sign-Off

**Phase:** 175
**Status:** COMPLETE (with TCTN-04 PARTIAL — see SC-4 below)
**Closed:** 2026-05-03
**Plans:** 7 (Wave 0 RED stubs → Wave 5 sign-off)
**Milestone:** v20.0 Templates Reimagined — final phase closes the milestone

---

## ROADMAP Success Criteria Sign-Off

| # | Success Criterion | Status | Verified By | Evidence |
|---|-------------------|--------|-------------|----------|
| **SC-1** | At least 100 net-new SVG templates queryable from `svg_templates` across the defined category taxonomy | **PASS** | Plan 06 smoke SELECT 3 (Postgres superuser bypasses RLS) | 175-06-SUMMARY.md `phase_175_new = 103` (>= 100); 15/15 categories represented (Restaurant 15, general 14, Retail 12, Corporate 11, Events 9, Healthcare 9, Fitness 8, Hospitality 8, Real Estate 8, Education 7, Entertainment 6, Automotive 5, Beauty 5, Finance 5, Technology 5). DO $$ ASSERT block in migration self-verified `v_new=103 >= 100` and `v_total=127 >= 112` |
| **SC-2** | Every new template passes the SVG validation gate (well-formed XML, customization anchors, no currentColor / var(--), DOMPurify-clean) | **PASS** | Plan 02 unit tests + Plan 02/04/05 validator runs | `npm run test:unit -- tests/unit/services/svgValidator.test.js --run` 7/7 PASS; `.planning/175-validation-report.json` shows `totals.failed = 0` across **115 files** (`{total: 115, passed: 115, failed: 0, warned: 97}`); 97 warnings are byte-equality drift advisories, not blockers |
| **SC-3** | Category taxonomy documented and ENFORCED at admin-upload time — uploading without required taxonomy fields fails with clear error | **PASS** | Plan 02 admin UI gate + Plan 04 DB CHECK + Plan 06 smoke SELECT 6 | `grep -c 'validateSvg(fileEntry.content)' src/components/Admin/BulkTemplateUpload.jsx` returns **1** (line 180); migration 175 `chk_svg_templates_category_enum` CHECK constraint exists in `information_schema.check_constraints` (smoke SELECT 6 = PASS); `tests/integration/svgTaxonomy.test.js` ships with 2 RED tests ready to GREEN once SUPABASE_SERVICE_ROLE_KEY is provisioned (anon role blocked by RLS — see Plan 06 deferral) |
| **SC-4** | Template cards render real thumbnails (not LayoutTemplate icon placeholder) for all new templates | **PARTIAL** | Plan 03 rasterizer pipeline + Plan 06 dry-run + Plan 07 E2E thumbnail assertion | Schema/content layer **GREEN**: 175-06-SUMMARY.md confirms 3/3 dry-run rasterizations succeed (sizes 6.5KB–15.4KB); template-gallery-100.spec.js TCTN-04 test PASSES against the inline `/templates/svg/<slug>/design.svg` fallback (real `<img src=...>` references — NOT the LayoutTemplate Lucide icon). S3 backfill layer **DEFERRED**: `VITE_API_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars are not present on this developer machine. Operator runbook in 175-06-SUMMARY.md lines 78-90 |
| **SC-5** | Gallery E2E uses structural assertions (role, label, min-count) — no exact-count or screenshot-diff against dynamic catalog | **PASS** | Plan 07 audit lint + Plan 07 spec runs | `grep -rnE "toHaveCount\(\s*[1-9]" tests/e2e/template-*.spec.js tests/e2e/gallery-*.spec.js \| grep -v '^[^:]*:[[:space:]]*//' \| grep -v '^[^:]*:[[:space:]]*\*'` returns **0 matches**; `expectAtLeastOneTemplateCard` helper imported by 2 specs; `template-gallery-100.spec.js` 3/3 GREEN against live 127-row catalog; Phase 171's `template-gallery.spec.js` 5/6 GREEN (1 pre-existing TDSC-04 failure deferred — Phase 171 product-routing scope, not TQAL-05 structural) |

**SC Tally:** 4 PASS, 1 PARTIAL (TCTN-04 thumbnail S3 backfill — operator-deferred per Plan 06).

---

## Phase Requirement Traceability

| Requirement | Plans | Status | Notes |
|-------------|-------|--------|-------|
| **TCTN-01** (>= 100 net-new templates queryable) | 04, 05, 06 | **PASS** | Verified at live DB level — 103 net-new rows |
| **TCTN-02** (validation gate) | 01 (RED), 02 (validator + CLI + admin gate), 04, 05 (content runs through gate) | **PASS** | 0 errors across 115 files; 7/7 unit tests pass |
| **TCTN-03** (taxonomy enforcement) | 02 (admin UI gate), 04 (DB CHECK), 06 (live verify) | **PASS** | Multi-layer enforcement: client-side validateSvg, server-side CHECK constraint, integration tests pre-staged |
| **TCTN-04** (real thumbnails — not placeholder) | 01 (resvg fidelity), 03 (rasterizer pipeline), 06 (dry-run verified, S3 deferred) | **PARTIAL** | Schema/content GREEN; S3 layer DEFERRED to operator runbook (env vars unavailable) |
| **TQAL-05** (structural E2E assertions) | 01 (helper extraction RED), 07 (audit + lint) | **PASS** | Lint clean across 5 gallery specs; helper used by 2 |

---

## Plan Outcomes Summary

| Plan | Wave | Subject | Outcome |
|------|------|---------|---------|
| 175-01 | 0 | RED stubs + resvg fidelity spot-test | Bundle commits `bbe6da98` + `81b860fa`. Resvg verdict GREEN (5/5 spot-tests, no Playwright fallback needed for Plan 03). 9 RED stubs + helpers extension committed. |
| 175-02 | 1 | svgValidator + CLI + admin gate | Commits `2bbf0ab5` (validator), `c2f1836f` (CLI + admin gate). 12/12 existing templates pass; admin upload now blocks invalid SVGs client-side. |
| 175-03 | 1 | Resvg-js thumbnail rasterizer | Commit `e2d77d23`. Production CLI with rasterize() / uploadToS3() / isEligible() / resolveSvgString(). Idempotent re-run safety. |
| 175-04 | 2 | Migration skeleton + 30 first-party templates | Commits `af7f047e` (skeleton + 15) + `e0d5b0e8` (15 more). 30 net-new validator-clean SVGs across 15 categories. |
| 175-05 | 3 | Extend to >= 100 templates | Commits `b1cd1db7` (35 variants) + `f3d81c68` (additional). 73 net-new beyond Plan 04. ASSERT bumped to `v_new >= 100`. |
| 175-06 | 4 | Live migration push + thumbnail backfill | Commit `99f0018d`. Migration applied via Supabase Management API (84KB exceeded MCP context budget). 6/6 smoke SELECTs PASS. **Thumbnail backfill DEFERRED** (env vars). |
| 175-07 | 5 | E2E audit + sign-off | Commit `3892de2b` (audit pass). This SUMMARY. **TQAL-05 lint clean.** |

---

## Test Surface Health

| Surface | Tests | Status | Command |
|---------|-------|--------|---------|
| Unit (svgValidator) | 7 | 7/7 PASS | `npx vitest run tests/unit/services/svgValidator.test.js` |
| Unit (thumbnail rasterizer) | 2 | 2/2 PASS | `npx vitest run tests/integration/thumbnails.test.js` |
| Integration (count + thumbnail) | 2 | DEFERRED | `npx vitest run tests/integration/svgTemplatesCount.test.js` — requires SUPABASE_SERVICE_ROLE_KEY (anon role blocked by RLS); test infrastructure GREEN, awaiting env |
| Integration (taxonomy CHECK) | 2 | DEFERRED | `npx vitest run tests/integration/svgTaxonomy.test.js` — same blocker as above |
| E2E (template-gallery) | 6 | 5/6 PASS | `npx playwright test tests/e2e/template-gallery.spec.js` — 1 pre-existing TDSC-04 failure (deferred-items.md item 1) |
| E2E (template-packs) | 6 | 5/6 PASS | `npx playwright test tests/e2e/template-packs.spec.js` — 1 pre-existing layout-button failure (deferred-items.md item 3) |
| E2E (gallery-tour) | 2 | 1/2 PASS | `npx playwright test tests/e2e/gallery-tour.spec.js` — 1 pre-existing tour-state failure (deferred-items.md item 2) |
| E2E (template-gallery-rls) | 2 | 2/2 PASS | `npx playwright test tests/e2e/template-gallery-rls.spec.js` |
| E2E (template-gallery-100 — Plan 175-01) | 3 | 3/3 PASS | `npx playwright test tests/e2e/template-gallery-100.spec.js` |
| E2E grep gate (TQAL-05 lint) | 1 | PASS | embedded in template-gallery-100.spec.js test 3 |

**E2E aggregate:** 16/19 PASS in the gallery surface; 3 deferred items are all pre-existing (verified by stash-and-rerun against the unmodified Plan 06 commit).

---

## Deviations from Plan

Two Rule 1 (test-bug) deviations applied during Task 1's audit pass:

### 1. [Rule 1 - Bug] Sidebar-click navigation instead of `?page=svg-templates` URL routing

- **Found during:** Task 1 (running `npx playwright test tests/e2e/template-gallery-100.spec.js`)
- **Issue:** Plan 175-01 ships template-gallery-100.spec.js using `await page.goto('/?page=svg-templates')`, but App.jsx (src/App.jsx:162) keeps `currentPage` in `useState('dashboard')` — there is no `?page=` query param handler. Tests rendered the dashboard's "Loading..." spinner indefinitely.
- **Fix:** Replaced URL-routing with the sidebar-Templates-button click pattern proven in Phase 171's `template-gallery.spec.js` `gotoTemplates(page)` helper. Mirrors the established app-shell navigation contract.
- **Files modified:** `tests/e2e/template-gallery-100.spec.js`
- **Commit:** `3892de2b`

### 2. [Rule 1 - Bug] Pitfall 4 query param: `?q=` not `?search=`

- **Found during:** Task 1 (TCTN-04 thumbnail test still failed after fix #1 — search input was empty)
- **Issue:** Plan 07's body specified `?search=<name>` as the Pitfall 4 mitigation pattern, but `TemplateGalleryPage` reads `?q=` (src/pages/TemplateGalleryPage.jsx:163 — `searchParams.get('q')`). The plan's example was incorrect.
- **Fix:** Updated the `gotoSvgTemplates(page, { q })` helper to seed `?q=<term>` via `history.pushState` BEFORE the sidebar click so `useSearchParams().get('q')` resolves on first mount and the local searchInput initializer (line 157 — `useState(() => searchParams.get('q') ?? '')`) reads it. Also dispatched `popstate` so react-router's `<Router>` listener invalidates its location snapshot.
- **Files modified:** `tests/e2e/template-gallery-100.spec.js`
- **Commit:** `3892de2b`

No other deviations — Task 2 (this SUMMARY) executed exactly as Plan 07 specified.

---

## Authentication Gates

None encountered. The `loginAndPrepare` helper in `tests/e2e/helpers.js` handled the test-user login (`client@bizscreen.test`) without intervention. The Plan 06 deferral note for `VITE_API_URL` + `SUPABASE_SERVICE_ROLE_KEY` is documented under SC-4 as PARTIAL (not as a Plan 07 auth gate).

---

## Threats Mitigated

Per the Phase 175 cross-plan threat model:

- **T-175-01** through **T-175-06** (XSS, currentColor / var(--*) silently breaking brand swap, oversize SVG attacks) — mitigated by Plan 02's validator (6 rules, byte-equality DOMPurify drift detection per Pitfall 5)
- **T-175-04-01** (taxonomy bypass via direct SQL writes) — mitigated by Plan 04's `chk_svg_templates_category_enum` CHECK constraint (verified at live DB via Plan 06 smoke SELECT 6)
- **T-175-04-02** (partial deploys, missing rows) — mitigated by Plan 04/05's migration self-assert (`DO $$ ASSERT v_new >= 100 AND v_total >= 112`)
- **T-175-06-01** (Pitfall 2 cross-tenant visibility — RLS regression) — mitigated by `template-gallery-rls.spec.js` smoke SELECT 2 (Tenant B blocked from Tenant A non-global rows; globals visible to both)
- **T-175-03-01** (Pitfall 3 S3 rate limit) — mitigated by Plan 03's serial loop with 300ms delay (verified in `scripts/generate-template-thumbnails.cjs`)
- **T-175-04-03** (Pitfall 6 license-violating supply chain) — mitigated by `175-LICENSE-MANIFEST.md` (per-template license + attribution audit trail)
- **T-175-07-01** (E2E spec modification accidentally weakens existing assertion) — mitigated by Plan 07 acceptance criteria requiring all 5 gallery surface specs to remain at-or-above their pre-audit pass count; verified via stash-and-rerun against unmodified Plan 06 baseline (3 deferred failures isolated as pre-existing)
- **T-175-07-02** (SUMMARY.md leaks credentials) — accepted: SUMMARY documents commands, not credentials
- **T-175-07-03** (sign-off claims PASS without evidence) — mitigated: each SC row above cites a concrete grep / SQL / test command and supporting Plan SUMMARY references

---

## Threat Flags

None. The Plan 07 audit modified only test files (no new product surface — no new endpoints, auth paths, file access patterns, or schema changes). The `deferred-items.md` documents pre-existing failures, not new attack surface.

---

## Open Questions / Future Work

- **Polotno-side QuickCustomize parity (TPRV-F1)** — out of scope per `.planning/REQUIREMENTS.md`
- **Husky pre-commit validator** — deferred to v20.1+ per Plan 02's notes
- **Existing 12 templates anchor warnings** — non-blocking (validator emits warnings, not errors)
- **Per-category thumbnail visual review** — Plan 06 dry-run GREEN; PM/designer aesthetic review deferred to a CONTEXT.md follow-up
- **Open-source license legal review** — `175-LICENSE-MANIFEST.md` documents source/license; legal sign-off deferred per Open Question #1
- **TCTN-04 S3 backfill operator follow-up** — see Plan 06 SUMMARY runbook lines 78-90; requires `VITE_API_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Idempotent script ready to run.
- **Phase 171 TDSC-04 product-routing fix** — see deferred-items.md item 1; URL → state restore is incompatible with App.jsx's `useState`-based pseudo-router. Future router migration would close this.
- **Phase 174 gallery-tour deterministic reset** — see deferred-items.md item 2; needs a per-test Supabase RPC to reset `completed_gallery_tour=FALSE` for replayability.
- **Phase 173 template-packs Layouts navigation** — see deferred-items.md item 3; selector should switch to `helpers.navigateToSection(page, 'layouts')` (which uses React fiber BFS to compensate for the missing sidebar Layouts button).

---

## Hand-off

Phase 175 closes the **v20.0 Templates Reimagined** milestone (Phases 170-175). The orchestrator's `/gsd-verify-work 175` consumes this sign-off directly.

**v20.0 milestone status:**
- Phase 170 (Data Layer Foundation) — Complete
- Phase 171 (Core Gallery UI Redesign) — Complete (1 pre-existing TDSC-04 deferred to v20.1)
- Phase 172 (Preview + Apply Flow) + 172.1 — Complete
- Phase 173 (Starter Packs + Favorites) — Complete (1 pre-existing template-packs failure deferred)
- Phase 174 (Scene Editor + Onboarding Integration) — Complete (1 pre-existing gallery-tour failure deferred)
- Phase 175 (this phase) — Complete with TCTN-04 PARTIAL (operator runbook in 175-06-SUMMARY.md)

After `/gsd-verify-work 175` consumes this document and the operator runs the thumbnail backfill, milestone v20.0 is shippable.

---

## Self-Check

After writing this SUMMARY, the following claims were verified against the worktree:

- `tests/e2e/template-gallery-100.spec.js` — modified (sidebar click + ?q= URL pinning) — FOUND
- `tests/e2e/template-gallery.spec.js` — modified (helper import + structural card assertion in TGAL-01) — FOUND
- `.planning/phases/175-new-template-content-quality-pass/deferred-items.md` — FOUND
- Audit grep returns 0 matches — VERIFIED via `grep -rnE "toHaveCount\(\s*[1-9]" tests/e2e/template-*.spec.js tests/e2e/gallery-*.spec.js | grep -v '^[^:]*:[[:space:]]*//' | grep -v '^[^:]*:[[:space:]]*\*'`
- `expectAtLeastOneTemplateCard` imported by 2 specs — VERIFIED via `grep -l 'expectAtLeastOneTemplateCard' tests/e2e/*.spec.js | wc -l` returns 2
- Commit `3892de2b` — FOUND in `git log --oneline -1`
- Validation report totals (115/115/0/97) — VERIFIED via `python3 -c "import json; print(json.load(open('.planning/175-validation-report.json'))['totals'])"`
- Live DB count (127 active, 103 net-new) — sourced from Plan 06 SUMMARY smoke SELECT results

## Self-Check: PASSED

---

*Phase: 175-new-template-content-quality-pass*
*Plan: 07*
*Completed: 2026-05-03*
