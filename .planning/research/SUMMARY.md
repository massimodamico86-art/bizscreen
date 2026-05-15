# Project Research Summary

**Project:** BizScreen v21.0 — Templates at Scale
**Domain:** Digital signage template catalog — vertical content strategy, admin-driven AI generation pipeline, third-party SVG bulk import, gallery scalability
**Researched:** 2026-05-06
**Confidence:** HIGH

---

## Executive Summary

BizScreen v21.0 has a clear, well-bounded goal: grow the template catalog from 127 to ~500 templates, organized across three industry verticals (Restaurants & QSR, Retail & e-commerce, Healthcare & wellness), while keeping the gallery snappy at that scale and standing up the admin tooling that makes sustained catalog growth possible. The v20.0 foundation is strong — `gallery_templates` VIEW, atomic apply RPCs, `svgValidator`, `@resvg/resvg-js` rasterizer, and fuse.js search are all production-proven. The post-v20.0 decision to delete `TemplatePreviewModal` / `QuickCustomizePanel` / `svgCustomizeService` (commit `df2926e2`) removes the TPRV-F1 work area entirely: card-click-direct-to-editor is the UX, and the Polotno editor already handles color/logo/text. All v21.0 scope flows from four new capability areas instead.

The recommended build order is Schema Foundation first (migrations only, unblocks everything), then the two pipeline tracks in parallel — AI Generator + Bulk Import as one track, Gallery Virtualization as another — followed by Vertical Content seeding that both pipelines feed, and a final quality pass before launch. The shared admin review queue (one `template_drafts` table, one `AdminDraftsQueuePage`) is the key architectural decision: AI-generated drafts and bulk-imported drafts flow through the same approve/reject UI rather than requiring two separate admin interfaces. This keeps the admin surface area small and the validation rules consistent.

The single biggest risk is catalog quality at scale, not technical complexity. The existing `svgValidator` (6 rules) will need a Rule 7 addition (foreignObject with HTML children) before the first bulk import run. The AI generation pipeline must run `svgValidator` at ingest — not just at publish — because the admin queue is a post-validation holding area, not a staging buffer for malformed SVGs. Gallery virtualization is low-risk technically but has several launch-criterion checklist items (explicit scroll container height, scroll reset on filter change, overscan >= 3, loading guard on `count`) that must all be green before the virtualized gallery ships to a 500-template catalog.

---

## Key Findings

### Recommended Stack

The stack additions for v21.0 are minimal and additive. Two new npm packages: `@tanstack/react-virtual` ^3.13.24 (browser, gallery page only) for virtualization, and `@anthropic-ai/sdk` ^0.94.0 (server-side Edge Function only) for the AI generation pipeline. Both Claude and the Anthropic SDK are already established in the project (`ANTHROPIC_API_KEY` in `.env.example`, `autoTaggingService.js` calling `/api/ai/generate-tags`). Adding a second LLM vendor (OpenAI) is explicitly ruled out. `@tanstack/react-virtual` was already planned and is NOT currently installed — it must be added.

The optional `spdx-expression-parse` ^4.0.0 can validate SPDX strings entered by admins in the attribution form, but it is entirely avoidable if the form uses a dropdown of pre-approved license identifiers (CC0-1.0, MIT, Apache-2.0) instead of free text. All generation pipeline secrets route through Supabase Edge Functions using `Deno.env.get()` — never a `VITE_` prefix env var.

**Core technologies:**
- `@anthropic-ai/sdk` ^0.94.0 (server-side Edge Function only): LLM SVG generation — same vendor already used for auto-tagging; Claude Haiku 4.5 is $1/$5 per M tokens; structured output ensures JSON-envelope response; model ID stored in env var, never hardcoded
- `@tanstack/react-virtual` ^3.13.24 (browser, gallery page only): row-chunked single-axis virtualizer over fuse.js results — headless, zero style conflicts, explicitly planned since v20.0
- `spdx-expression-parse` ^4.0.0 (optional, admin form only): SPDX string validation for attribution form — only needed if free-text license entry is used instead of a pre-approved dropdown

### Expected Features

**Must have (table stakes) — v21.0 launch criteria:**
- Gallery virtualization (TGAL-F1) active — sub-second scroll at 500 templates
- At minimum 300 net-new templates seeded (127 existing + 300 new approx 427 total; target 500)
- At minimum 80 templates per vertical across Restaurants & QSR, Retail & e-commerce, Healthcare & wellness
- Vertical filter chip in gallery — `svg_templates.vertical` column (new, CHECK constraint)
- Admin publish/unpublish toggle surfaced in admin UI
- Bulk import pipeline: multi-file upload, batch svgValidator run, attribution form, batch thumbnail generation, drafts queue
- Attribution metadata stored and displayed for all third-party-sourced templates (legal requirement)
- AI generator pipeline: at least one working end-to-end run (prompt → svgValidator → admin queue → published)
- Shared admin drafts queue (AdminDraftsQueuePage) handling both AI-generated and imported drafts

**Should have (competitive differentiators):**
- Admin-only AI generation pipeline at meaningful volume (10-20 templates/day pace)
- Sub-vertical tagging extending fuse.js tag index (coffee-shop, pharmacy, fast-casual, etc.)
- Vertical starter packs (3 packs, one per vertical) reusing existing `template_packs` schema
- Portrait + landscape variants for key template types in each vertical

**Defer (v21.x or v22.0+):**
- TPRV-F1 / Polotno QuickCustomize — withdrawn; not a v21.0 phase
- Brand Kit persistence across templates
- Animated / dynamic templates
- Self-serve AI generation for end users
- Corporate vertical templates

### Architecture Approach

The architecture separates into two tracks that share a staging layer. The admin pipeline track introduces a `template_drafts` table (migration 176) as a shared staging queue for both AI-generated and bulk-imported SVGs; an Edge Function (`generate-svg-template`) handles the LLM call server-side with `ANTHROPIC_API_KEY` as a Supabase project secret; `AdminAiGeneratorPage` + `AdminBulkImportPage` are the two ingestion UIs; `AdminDraftsQueuePage` is the single review surface for both sources. The gallery track extends `svg_templates` with a `vertical TEXT` column (migration 177, CHECK constraint), updates the `gallery_templates` VIEW to surface it, and adds `useVirtualizer` from `@tanstack/react-virtual` to `TemplateGalleryPage` via a row-chunk pattern over `filteredTemplates` (the fuse.js output). These two tracks are independent after the Schema Foundation migrations land.

**Major components:**
1. `template_drafts` table (mig 176) — shared staging queue; `source IN ('ai-generated', 'import')`, `status IN ('pending', 'approved', 'rejected')`, attribution JSONB, LLM provenance fields
2. Edge Function `generate-svg-template` — admin-gated LLM call, svgValidator at ingest, INSERT into `template_drafts`; rate-limited before any token is spent
3. `AdminDraftsQueuePage` — unified approve/reject UI; on approve: `@resvg/resvg-js` rasterize → S3 thumbnail → INSERT into `svg_templates`
4. `AdminBulkImportPage` — multi-file drag-drop, attribution form (per-batch), batch svgValidator run, per-file result table
5. `TemplateGalleryPage` (extended) — `useVirtualizer` (row-chunked over `filteredTemplates`), vertical filter chip, scroll reset on filter change, explicit-height scroll container
6. `svg_templates.vertical` column (mig 177) + `gallery_templates` VIEW update — routes vertical filter without tag-parsing heuristics

### Critical Pitfalls

1. **svgValidator bypassed at AI generation ingest** — the admin queue MUST be a post-validation holding area, not a pre-validation staging buffer. Run `svgValidator` + DOMPurify before writing to `template_drafts`. If validation fails, mark `status='rejected'` with errors, not `status='pending'`. Blank-output detection via thumbnail rasterization luma check is a second gate.

2. **`foreignObject` with HTML children bypasses svgValidator** — the existing 6-rule validator does not block `foreignObject`. Third-party SVG sources (OpenClipart, Wikimedia) include `foreignObject` for accessibility; the inline SVG render path makes this live XSS surface. Add Rule 7 before the first bulk import run: strip or block `foreignObject` containing HTML elements.

3. **Attribution display deferred past first import run** — CC BY and CC BY-SA licenses require attribution displayed to the end user at time of use. Storing attribution in the database is necessary but not sufficient. Attribution display in the gallery/preview context is a legal requirement that must ship with the first import batch.

4. **Virtualizer measurement feedback loop** — the scroll container must have an explicit CSS height (`height: calc(100vh - Xpx)` or equivalent), never `height: auto`. An auto-height container derives from virtualizer output, creating a ResizeObserver feedback loop visible as scroll jank on every keystroke.

5. **LLM model ID hardcoded in Edge Function** — Claude Haiku 4.5 model name must be stored in an env var (`ANTHROPIC_MODEL_ID`), not a string literal. A regression eval suite (5+ canonical prompts → structural SVG assertions) in CI is a launch criterion for the generation pipeline.

---

## Implications for Roadmap

Suggested phase structure: **5 phases** in a dependency-ordered sequence with Phases 2-4 partially parallelizable after Phase 1.

### Phase 1: Schema Foundation
**Rationale:** All downstream work needs the `template_drafts` table and `svg_templates.vertical` column to exist before any code references them. Migration-only; zero frontend changes; ships green immediately.
**Delivers:** Migration 176 (`template_drafts` table with RLS admin-only policy), Migration 177 (`svg_templates.vertical` TEXT CHECK column + `gallery_templates` VIEW update)
**Addresses:** Unblocks all four remaining phases simultaneously
**Avoids:** Deploying frontend code that references columns/tables that don't exist yet

### Phase 2: Admin Pipeline (AI Generator + Bulk Import + Shared Queue)
**Rationale:** The two ingestion pipelines share the `template_drafts` table and `AdminDraftsQueuePage` review UI. Building them together avoids two separate queues. This phase is the critical path to catalog growth at volume.
**Delivers:**
- Edge Function `generate-svg-template` — admin-gated, rate-limited, svgValidator-gated at ingest, LLM provenance logged, model ID in env var
- `AdminAiGeneratorPage` — vertical + prompt selector, invoke Edge Function, navigate to drafts queue
- `AdminBulkImportPage` — multi-file drop, per-batch attribution form (source URL / SPDX license / author), batch svgValidator run with Rule 7, per-file result table
- `AdminDraftsQueuePage` — unified approve/reject/edit; on approve: rasterize → S3 → INSERT svg_templates; `license_confirmed` non-nullable
- Attribution display in gallery context for all CC-licensed templates
**Uses:** `@anthropic-ai/sdk` ^0.94.0 (Edge Function); existing `svgValidator` (+ new Rule 7); existing `@resvg/resvg-js`
**Avoids:** Pitfalls A1 (prompt injection), A2 (model deprecation), A3 (cost runaway), A4 (structured output ≠ valid SVG), B1 (foreignObject), B2 (attribution loss), B3 (SPDX false positives)
**Needs research-phase:** YES — Deno DOMParser injection for `svgValidator` in Edge Function context; Anthropic Batch API setup for async generation; `license_confirmed` non-nullable schema design

### Phase 3: Vertical Content Seeding (~300 new templates)
**Rationale:** Content work is gated only on Phase 1 (vertical column exists). Can begin immediately after Phase 1 in parallel with Phase 2. The bulk import pipeline from Phase 2 accelerates this phase but is not strictly blocking — hand-authored templates can INSERT directly via migration or Supabase Mgmt API (same pattern as migration 175).
**Delivers:**
- ~300 net-new SVG templates across three verticals (>=80 per vertical at launch, targeting 100 each)
- Vertical filter chip in `TemplateGalleryPage` (`?vertical=` URL param, new chip row)
- Sub-vertical tagging on all new templates (extends fuse.js tag index; data-only, no new code)
- 3 vertical starter packs via `AdminStarterPacksPage` (schema already exists, mig 171)
- All new templates: portrait + landscape variants, svgValidator-passing, resvg-rasterized PNGs on S3
**Implements:** `svg_templates.vertical` column (from Phase 1); vertical filter chip in TemplateGalleryPage
**Avoids:** Seeding without attribution metadata for third-party sources (Phase 2 pipeline stores it)
**Needs research-phase:** NO — content authoring + trivial filter chip extension of existing pattern

### Phase 4: Gallery Virtualization (TGAL-F1)
**Rationale:** Developed in parallel with Phase 3; activate (green gate flip) when catalog crosses ~200 templates. At 200+ templates the non-virtualized DOM shows scroll jank (~800ms initial paint on mid-range hardware at 1x CPU throttle). Technical implementation is independent of content volume.
**Delivers:**
- `npm install @tanstack/react-virtual` ^3.13.24
- `TemplateGalleryPage` extended: `rowChunks` pattern (flat filteredTemplates chunked into rows of 4), `useVirtualizer` over row count, explicit-height scroll container, `StaggeredPageTransition` removed from virtualized path
- Scroll position capture/restore via `sessionStorage` + `virtualizer.scrollToOffset()` for back-navigation
- Scroll reset to 0 on every `filteredResults` identity change
- `overscan={5}`, `aria-rowcount` on container, loading guard (`count=0` while `isLoading`), axe-core a11y check in E2E suite
**Uses:** `@tanstack/react-virtual` ^3.13.24; existing fuse.js pipeline; existing `useSearchParams` URL state
**Avoids:** D1 (measurement loop), D2 (scroll not reset), D3 (keyboard focus loss), D4 (URL state desync)
**Needs research-phase:** NO — TanStack Virtual API fully verified via Context7; row-chunk pattern fully specified in ARCHITECTURE.md

### Phase 5: Catalog Quality Pass + Launch Validation
**Rationale:** With ~500 templates seeded and gallery virtualized, a dedicated pass ensures every template has correct metadata, attribution obligations are fulfilled, and the gallery E2E suite covers the full catalog size.
**Delivers:**
- Metadata audit: all ~500 templates have `vertical`, `category`, `tags`, `orientation`, `is_active=TRUE`, S3 thumbnail
- `license_confirmed` non-null for all imported templates (human review completed)
- Attribution display verified for all CC-licensed templates
- Playwright E2E suite at 500-template catalog: scroll performance, vertical filter, search reset, back-nav scroll restore, axe-core scan
- Gallery tour copy review (3-step tour reflects vertical filter and card-click-direct-to-editor flow)
- Pre-existing E2E deferred failures from `deferred-items.md` addressed where catalog-related
**Addresses:** MVP launch criteria from FEATURES.md; legal attribution obligations; a11y compliance

---

### Phase Ordering Rationale

- Phase 1 first because all other phases reference the new schema. Zero risk, migrations only.
- Phases 2 and 3 in parallel after Phase 1. Phase 2 (pipelines) does not block Phase 3 (content) — first 80+ templates per vertical can be hand-authored or seeded via Supabase Mgmt API while the admin UI is being built.
- Phase 4 in parallel with Phase 3 — virtualization code is independent of content volume; activate the green gate when catalog hits ~200.
- Phase 5 last — requires both content (Phase 3) and virtualized gallery (Phase 4) to be complete.
- TPRV-F1 / Polotno QuickCustomize is NOT a phase in this roadmap. Withdrawn 2026-05-06. Research artifacts preserved in STACK.md (Capability Area 4) and ARCHITECTURE.md (sections b/d, Phases B/C) for a future milestone if a pre-apply customize step is reintroduced.

### Research Flags

Phases likely needing `/gsd-research-phase` during planning:
- **Phase 2 (Admin Pipeline):** Deno-compatible invocation of `svgValidator` (injectable `DOMParserCtor` in Edge Function context), Anthropic Batch API setup for async generation jobs, `license_confirmed` non-nullable schema final design, Rule 7 foreignObject detection implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema Foundation):** Pure migrations following established patterns (CHECK constraint discipline mirrors `chk_svg_templates_category_enum`; `template_drafts` follows existing staging table shape).
- **Phase 3 (Vertical Content):** Content authoring + trivial filter chip extension. Vertical filter chip follows exact same pattern as existing category/tag/orientation chips.
- **Phase 4 (Gallery Virtualization):** TanStack Virtual API fully verified via Context7. Row-chunk pattern, scroll restore, overscan, loading guard — all specified in ARCHITECTURE.md with code snippets.
- **Phase 5 (Quality Pass):** Standard audit + E2E expansion work.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All new library versions verified via npm registry (2026-05-06). `@anthropic-ai/sdk` and `@tanstack/react-virtual` APIs confirmed via Context7. Existing stack (Supabase Edge Functions Deno compatibility, `ANTHROPIC_API_KEY` presence) confirmed from live codebase files. |
| Features | MEDIUM-HIGH | Competitive analysis against OptiSigns, Yodeck, Rise Vision, LOOK DS, truDigital, NoviSign, PosterMyWall. Template type inventories drawn from industry-specific research. MVP definition anchored to PROJECT.md milestone goal. First-pass AI rejection rate unknown until first batch. |
| Architecture | HIGH | All conclusions drawn from live code files (migrations, service files, page components), not training assumptions. `template_drafts` schema, `svg_templates.vertical` column, VIEW update, and row-chunked virtualizer pattern all verified against existing codebase shape. |
| Pitfalls | HIGH | Security pitfalls sourced from OWASP LLM Top 10, CVE databases (DOMPurify CVE-2026-41238), and SVG security references. Virtualizer pitfalls sourced from TanStack Virtual docs and react-virtualized GitHub issue history. Attribution pitfalls sourced from CC license obligation analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **Deno DOMParser injection**: `svgValidator`'s injectable `DOMParserCtor` pattern is confirmed, but the specific Deno built-in or shim to inject in the Edge Function context needs a quick smoke test before Phase 2 implementation begins.
- **AI generation quality at vertical specificity**: First-pass validator rejection rate for vertically-specific SVG prompts is unknown until the first batch runs. Research estimates 40-60% failure rate for general SVG generation; structured output + SVG-specific system prompt should bring this below 20%, but actual rates are empirical. The 2-retry cap + `needs_human_review` fallback handles this gracefully regardless.
- **Thumbnail rasterization throughput for batch import**: `@resvg/resvg-js` is proven for 127 templates (migration 175). Batch throughput for 300+ concurrent rasterizations in an Edge Function needs measurement during Phase 2 approval flow implementation. Chunked batch processing may be required.
- **Vertical filter chip layout**: Whether the vertical filter is a separate chip row, a dropdown, or inline with existing chips is a minor UX decision to resolve during Phase 3 planning.

---

## Sources

### Primary (HIGH confidence)
- `@anthropic-ai/sdk` Context7 docs (`/anthropics/anthropic-sdk-typescript`) — structured output, batch API, model IDs, Deno compatibility
- `@tanstack/react-virtual` Context7 docs (`/tanstack/virtual`) — `useVirtualizer`, `initialOffset`, `scrollToOffset`, row-chunk grid pattern, overscan, `useWindowVirtualizer`
- BizScreen live codebase: `src/services/svgValidator.js`, `src/services/templateApplyService.js`, `src/services/templateGalleryService.js`, `src/pages/TemplateGalleryPage.jsx`, `src/services/autoTaggingService.js`, `supabase/migrations/` (094, 167, 168, 175), `vercel.json`, `package.json`
- OWASP LLM Prompt Injection (LLM01:2025): https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- SVG foreignObject / XXE surface (OPSWAT): https://www.opswat.com/blog/svg-unveiled-understanding-xxe-vulnerabilities-and-defending-your-codebase
- DOMPurify CVE-2026-41238: https://security.snyk.io/vuln/SNYK-JS-DOMPURIFY-16132234
- TanStack Virtual accessibility and overscan: https://tanstack.com/virtual/latest/docs/api/virtualizer

### Secondary (MEDIUM confidence)
- OptiSigns template library + vertical industry pages: https://www.optisigns.com/templates, /industries/restaurant, /industries/retail, /industries/healthcare
- Yodeck free template library: https://www.yodeck.com/free-digital-signage-templates/
- LOOK DS healthcare + retail + QSR pages
- truDigital healthcare templates: https://www.trudigital.com/blog/customizable-digital-signage-templates-for-healthcare
- PosterMyWall retail template guide: https://www.postermywall.com/blog/2025/04/14/
- Claude pricing 2026: https://benchlm.ai/blog/posts/claude-api-pricing (Haiku 4.5 at $1/$5 per M tokens)
- npm registry: `@tanstack/react-virtual` 3.13.24, `@anthropic-ai/sdk` 0.94.0 (verified 2026-05-06)
- TanStack Virtual + filtering: GitHub Discussion #290

### Tertiary (LOW confidence)
- AI SVG first-pass rejection rate (~40-60%) — inferred from general LLM structured output literature; actual rate for vertically-specific SVG prompts is unknown until first batch runs
- Thumbnail rasterization batch throughput ceiling — inferred from migration 175 usage; not benchmarked at 300+ concurrent files

---
*Research completed: 2026-05-06*
*Milestone: v21.0 Templates at Scale*
*Ready for roadmap: yes*
