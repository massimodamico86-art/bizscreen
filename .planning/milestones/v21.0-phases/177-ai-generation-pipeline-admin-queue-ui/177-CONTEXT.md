# Phase 177: AI Generation Pipeline + Admin Queue UI - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin-only end-to-end pipeline that turns a natural-language prompt into a published SVG template, gated by `svgValidator` at ingest and a human review queue at publish.

**In scope:**
- Supabase Edge Function (Deno) that calls Anthropic Claude (Haiku 4.5 by default) with a curated, per-template-type system prompt prepended to admin freeform input
- Auto-retry up to 2× on validator failure with the previous attempt's error messages fed back into the next prompt
- `svgValidator` runs on raw LLM output BEFORE any INSERT into `template_drafts` (Pitfall A1)
- Admin role gate at the Edge Function (403 for non-admins) plus RLS gate on `template_drafts` (already locked by Phase 176 migration 176)
- Per-template-type prompt library — 6 base prompts (Menu / Promo / Announcement / Reminder / Wayfinding / Health Tip) covering Restaurants & QSR / Retail & e-commerce / Healthcare & wellness
- `AdminTemplateQueuePage` (new page) with two tabs: **Generate** (prompt UI + OptiSigns-style example-prompt cards) and **Pending** (review/approve/edit/reject queue)
- Approve action: rasterize PNG via `@resvg/resvg-js` (Deno-compat), upload to S3 `bizscreen-media/thumbnails/system/`, INSERT `svg_templates` row with `is_active=true`, mark draft `approved` — all in one request
- Edit action: navigate into the existing `AdminEditTemplatePage` driven by a new `?draftId=` URL param (loads from `template_drafts` instead of `svg_templates`); Save & Publish runs the same approve path
- Reject action: flips draft status to `rejected` with `metadata.reviewed_by` + `metadata.rejected_reason`
- Migration 177: add `'needs_human_review'` to `template_drafts.status` CHECK (DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT pattern, mirrors Phase 176 idempotency)
- TGEN-06 A/B harness: one-off Node script (`scripts/eval-prompt-library.cjs`) producing 60 generations × 2 conditions; threshold ≥30 percentage-point first-pass `svgValidator` improvement

**Out of scope (deferred / Phase 178+ / v21.x):**
- Vertical content seeding — Phase 178
- Gallery virtualization — Phase 179
- Per-admin/per-day generation rate limit — v21.x (Pitfall A4 mitigation; not in TGEN/TADM SCs)
- Anthropic Batch API (50% cost reduction) — v21.x; v1 is synchronous
- Image upload as AI generation input (TGEN-F3) — v22.0
- Self-serve AI generation for end users — explicitly out of milestone

</domain>

<decisions>
## Implementation Decisions

### Page topology + Edit flow

- **D-01:** Single combined page `AdminTemplateQueuePage` at route `admin-template-queue` with two tabs — **Generate** (prompt entry + example-prompt cards) and **Pending** (queue list). Single new route, single nav entry, single React component tree. Shared state because both tabs operate on the same `template_drafts` table.

- **D-02:** Generate tab UI mirrors OptiSigns `/ai` "Explore AI Prompts" pattern — a vertical dropdown (`Restaurants` / `Retail` / `Healthcare` / `Cross-vertical`), template-type dropdown (`Menu` / `Promo` / `Announcement` / `Reminder` / `Wayfinding` / `Health Tip`), freeform prompt textarea, and a card grid below the form showing one example prompt per (template-type × vertical) pair. Clicking a card pre-fills prompt + selects type + vertical. Submit button triggers Edge Function call.

- **D-03:** Pending tab lists `template_drafts` rows where `status IN ('pending', 'needs_human_review')`, ordered by `created_at DESC`. Each row renders the in-DB `svg_content` as an inline preview (sanitized via DOMPurify with `USE_PROFILES: { svg: true, svgFilters: true }` — same config as `svgValidator` Rule 4 / `templateApplyService.js:55`), the originating prompt, vertical, template type, retry count, and three actions: **Approve** / **Edit** / **Reject**. Drafts with `status='needs_human_review'` are visually flagged (different chip color) and surface their `metadata.validator_failures[]` on click for the reviewer to see what went wrong.

- **D-04:** Edit reuses the existing `AdminEditTemplatePage` (943 LOC, mature) — extended with a `?draftId=X` URL param that swaps the data source from `svg_templates` to `template_drafts`. Save button becomes "Save & Publish" which runs the same approve path (validator → rasterize → S3 → INSERT `svg_templates` → mark draft `approved`). Existing edit-template flow (no `draftId`) is unchanged. **Fallback for the planner:** if AdminEditTemplatePage's data layer turns out to be too svg_templates-coupled to extend cleanly, clone-then-redirect is the alternative — clone the draft into `svg_templates` with `is_active=false`, navigate to the existing editor unchanged, and use AdminEditTemplatePage's existing publish toggle to flip live. Planner picks based on file inspection.

### Validator-fail persistence

- **D-05:** Add `'needs_human_review'` to `template_drafts.status` CHECK via a new atomic migration (Phase 177's own migration). Pattern: `ALTER TABLE template_drafts DROP CONSTRAINT IF EXISTS chk_template_drafts_status_enum; ALTER TABLE template_drafts ADD CONSTRAINT chk_template_drafts_status_enum CHECK (status IN ('pending', 'approved', 'rejected', 'needs_human_review'));` Mirrors Phase 176's idempotent DROP-then-ADD style. Folded into a Wave-0 migration plan in this phase (not a downstream-only side effect).

- **D-06:** Failed-attempt audit data goes into `metadata.validator_failures` as a JSONB array. Schema for each entry: `{ attempt: 1|2|3, model_id: string, errors: string[], warnings: string[], raw_svg_excerpt: string (first 500 chars), prompt_used: string, ts: ISO8601 }`. The Edge Function appends one entry per attempt; on the third consecutive failure (after 2 retries) it INSERTs the draft with `status='needs_human_review'` and the full failures array.

- **D-07:** Approve/reject audit fields also live in metadata: `metadata.reviewed_by` (UUID), `metadata.reviewed_at` (ISO8601), `metadata.rejected_reason` (string, optional, free-text from admin). No new columns — the Phase 176 schema already settled on metadata-JSONB-for-everything-non-enum and this phase keeps that pattern.

### Prompt library storage + selection UX

- **D-08:** Source-of-truth is a version-controlled JS data module at `src/services/aiTemplate/promptLibrary.js`, with a parallel TypeScript copy in the Edge Function dir (`supabase/functions/generate-svg-template/prompts.ts`). Synchronization enforced by a Vitest integration test that asserts data-equality between the two files. Why two files: Vite/SPA can't import from `supabase/functions/`, and the Edge Function (Deno) bundles its own prompts at deploy time. **No DB table, no migration.** 6 prompts is too few to justify a CRUD admin UI; iteration loop is code review.

- **D-09:** Prompt-library entry shape: `{ id: string, template_type: 'menu'|'promo'|'announcement'|'reminder'|'wayfinding'|'health_tip', vertical: 'restaurants'|'retail'|'healthcare'|null, label: string, example_freeform: string, system_prompt: string }`. The Edge Function picks the entry where `(template_type, vertical)` matches the admin's selection — falls back to vertical=null if no exact match — and prepends `system_prompt` to the admin's freeform input before calling Claude. The frontend uses `label` and `example_freeform` to render the OptiSigns-style example-prompt cards.

- **D-10:** **Minimum 6 entries × 4 vertical options = up to 24 prompts at full coverage.** Phase 177 ships at least 6 prompts (one per template_type, vertical=null is acceptable for v1) to satisfy TGEN-06 SC. Per-vertical specialization can be added incrementally during Phase 178 content seeding without a re-deploy of the Edge Function (the data file is bundled at deploy time but is a small change).

- **D-11:** Vertical is a required selection at generate time (3 enum values + a "Cross-vertical" option that maps to `vertical=NULL` in `template_drafts`). Drives the system-prompt branch and is persisted on the draft for downstream filtering and Phase 178 inventories.

### TGEN-06 A/B harness + threshold

- **D-12:** Harness is a one-off Node script at `scripts/eval-prompt-library.cjs`, NOT automated CI. Calls the deployed Edge Function (or hits Anthropic API directly with the same logic) 5 times per template_type × 2 conditions (with-base-prompt / freeform-only) = 60 generations total. At Haiku 4.5 pricing (~$1/M input, $5/M output) ≈ $0.63 per full run. Manually run during phase verification, results captured in `.planning/phases/177-ai-generation-pipeline-admin-queue-ui/prompt-library-eval.md` and the headline number pasted into `177-VERIFICATION.md`.

- **D-13:** Threshold for TGEN-06 SC #6: **≥30 percentage-point improvement** in first-pass `svgValidator` success rate when the curated base prompt is applied vs raw freeform. Matches the SC's parenthetical example. **Tunable on first measurement** — if the first run shows <30pp improvement, the planner has two levers: iterate the prompt library before re-running, or document a lower defensible bar with rationale (research projects raw LLM at 40-60% first-pass; well-curated prompts should push to ≥70-80%, so a 30pp gap is realistic). Re-run cost is bounded (~$0.63/run).

### Defaults locked (no objection raised)

- **D-14:** Generation UX is **synchronous** for v1 — admin clicks Generate, the Edge Function does its work (LLM call + validator + retries internally) within ~10-30 seconds, and returns the draft ID (or a `needs_human_review` indicator) in a single response. The frontend shows a loading state with a "this can take ~30 seconds" hint. Anthropic Batch API (50% cost reduction) is deferred to v21.x — admins generate one at a time at low cadence, async UX complexity isn't worth the saving.

- **D-15:** Rasterization happens **inside the same Edge Function** on the Approve action, using `npm:@resvg/resvg-js` (Supabase Edge Functions support npm: imports). S3 PUT via the project's S3 service-role credentials (same upload path as `scripts/generate-template-thumbnails.cjs`). Avoids browser bundle bloat, keeps the approve path atomic.

- **D-16:** LLM model is referenced via `ANTHROPIC_MODEL_ID` env var (NOT `OPENAI_MODEL_ID` — Pitfalls A2 example used OpenAI but BizScreen is on Anthropic). Default value: `claude-haiku-4-5-20251001` (snapshot-pinned per Pitfall A2). Edge Function fails fast at startup if the env var is missing — no hardcoded fallback.

- **D-17:** Open landmine from Phase 176 SUMMARY: **Deno DOMParser injection into `svgValidator` needs a smoke test before the main implementation.** Plan a pre-implementation Wave 0 task that confirms either (a) Deno's built-in `globalThis.DOMParser` works for `parseFromString(svg, 'image/svg+xml')`, or (b) which `npm:` shim (e.g., `npm:linkedom`, `npm:@xmldom/xmldom`) is the right fit. `svgValidator` is already injectable-friendly via `opts.DOMParserCtor` — Phase 175 verified this works in Node — so the smoke test only needs to pick the Deno-side ctor.

- **D-18:** Admin role gate is **double-defense**: (a) Edge Function checks `is_admin(auth.uid()) OR is_super_admin(auth.uid())` (the same helpers used by Phase 176's RLS policy on `template_drafts`); (b) RLS policy `template_drafts_admin_only` already rejects non-admin INSERT/UPDATE/DELETE (verified live in Phase 176 verification). The frontend route `admin-template-queue` joins `adminToolPages` in `App.jsx` (same gate as `admin-templates`, `admin-starter-packs`).

- **D-19:** Per-admin / per-day rate limit (Pitfall A4 mitigation) is **OUT of scope** for Phase 177 — not in TGEN/TADM SCs. Tracked as v21.x concern; data is already there to enforce it later (`template_drafts.metadata->>'generated_by'` + `created_at` already in schema).

### Claude's Discretion

The user delegated framing to OptiSigns precedent ("you decide based on optisigns") and approved the resulting decision set without amendments. Areas where Claude exercised judgment:
- Picking single tabbed page over two pages (D-01) — driven by single-database-table cohesion + OptiSigns single-AI-surface precedent
- Picking Edit-via-`?draftId` over clone-then-redirect (D-04) — with documented fallback for the planner
- Picking source-file storage over DB table (D-08) — driven by 6-prompt scale + version-controlled-iteration discipline
- Picking 30pp threshold (D-13) — direct match to SC parenthetical, tunable on first run
- Picking sync over async/batch UX (D-14) — driven by low admin cadence + simpler v1
- Picking same-EF rasterization over browser/separate-EF (D-15) — driven by atomic-approve and bundle hygiene

If implementation reveals any of these are wrong, planner can flag in `177-PLAN.md` Risks/Concerns and re-discuss before Wave 1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements

- `.planning/ROADMAP.md` §"Phase 177: AI Generation Pipeline + Admin Queue UI" — phase goal, dependencies, full success criteria text (6 SCs)
- `.planning/REQUIREMENTS.md` §"AI Generation Pipeline (TGEN)" + §"Admin Queue UI (TADM)" — TGEN-01..06 + TADM-01..04 requirement IDs and traceability table
- `.planning/PROJECT.md` §"Current Milestone: v21.0 Templates at Scale" — milestone goal, target features, OptiSigns benchmark framing
- `.planning/STATE.md` §"v21.0 Phase Map" — Phase 177 risk note ("svgValidator MUST run at ingest; model ID in env var") and Blockers/Concerns ("Deno DOMParser injection needs smoke test")

### Architecture and stack research (locks LLM/runtime decisions)

- `.planning/research/STACK.md` §"Decision: @anthropic-ai/sdk — Claude Haiku 4.5 model" — locks LLM vendor, model, pricing math, structured-output approach, batch-API note
- `.planning/research/ARCHITECTURE.md` §(a) "AI Generation Pipeline — Edge Function shape" — Edge Function skeleton (admin gate → LLM call → validator → INSERT), Deno DOMParser injection note
- `.planning/research/ARCHITECTURE.md` §(b) — `template_drafts` schema design vs Phase 176's actual applied schema (research used a wider 17-col shape; **Phase 176 actually applied an 8-col + metadata-JSONB shape**; Phase 177 implementation must follow the **applied** schema, not the research draft)
- `.planning/research/PITFALLS.md` §A1 "Validator runs at publish, not ingest" + §A2 "Model deprecation" + §A3 "Structured output ≠ valid SVG" + §A4 "Retry storms / cost cap" — all four pitfalls mitigated by SCs but implementation must verify each
- `.planning/research/SUMMARY.md` — research synthesis; flags the Deno DOMParser smoke-test gap

### OptiSigns walkthrough (drives UX decisions)

- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Single text input" + §"Explore AI Prompts" — verbatim card list (Menu / Retail / Announcement / Reminder / Wayfinding / Instructions / Food) with example-prompt strings; this is the visual precedent for D-02 example-prompt cards
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Scope adjustment" — rationale for promoting TGEN-F1 to TGEN-06 v21.0 active scope
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Concrete UX patterns to mirror or diverge from" — the 8-row table that locks Mirror/Diverge per pattern
- `.planning/research/optisigns-screenshots/` — captured 2026-05-06 via authenticated Playwright session

### Phase 176 schema (locked, must not be re-decided)

- `supabase/migrations/176_template_drafts_and_vertical.sql` — actual applied schema; columns are `id, svg_content, prompt, source, status, vertical, metadata, created_at`; `vertical` enum is **lowercase** `restaurants|retail|healthcare`; `status` enum is `pending|approved|rejected` (Phase 177 will add `needs_human_review`)
- `.planning/phases/176-schema-foundation/176-VERIFICATION.md` — independent verifier confirmed live schema, RLS policy `template_drafts_admin_only` (`is_admin() OR is_super_admin()`), and CHECK constraint behavior
- `.planning/phases/176-schema-foundation/176-03-SUMMARY.md` — pattern for Vitest integration tests with `describe.runIf(SHOULD_RUN)` + `createClient` deferred into `beforeAll` (avoid suite-load crash on missing env)

### Existing code that this phase builds on or extends

- `src/services/svgValidator.js` (171 LOC) — pure function with `opts.DOMParserCtor` + `opts.DOMPurify` injection; Phase 177 Edge Function injects Deno's DOMParser equivalent
- `src/pages/Admin/AdminEditTemplatePage.jsx` (943 LOC) — target for D-04 Edit-via-`?draftId` extension; planner inspects to confirm extensibility
- `src/pages/Admin/AdminTemplatesPage.jsx` (503 LOC) — admin-page pattern (`PageLayout` chrome + filter row + table); `AdminTemplateQueuePage` follows the same shell
- `src/pages/Admin/AdminStarterPacksPage.jsx` (236 LOC) — closest structural analog (Modal-based drill-in editor + table-with-actions); `AdminTemplateQueuePage` mirrors its component shape
- `src/components/Admin/BulkTemplateUpload.jsx` (463 LOC) — existing `validateSvg` call site + DOM dimension parsing; reference for how generated SVG dimension extraction works
- `src/hooks/useAdmin.js` lines 259-266 — `isAdmin` / `isSuperAdmin` derivation from `userProfile.role`; Edge Function admin gate calls SQL helpers `is_admin(uid)` / `is_super_admin(uid)` (same logic, server-side)
- `src/App.jsx` lines 119-121, 577-578, 687-691, 1027 — `lazy()` admin-page imports, `pageMap` route registration, `adminToolPages` allowlist, `AdminEditTemplatePage` mount; new `AdminTemplateQueuePage` follows the same registration pattern
- `scripts/generate-template-thumbnails.cjs` lines 6, 19, 56-69, 195 — reference rasterization implementation using `@resvg/resvg-js` Resvg ctor + `.render().asPng()`; Edge Function uses the equivalent `npm:@resvg/resvg-js` import

### v20.0 / v19.0 patterns reused

- `src/services/marketplaceService.js` — admin pack/template CRUD pattern (used by AdminStarterPacksPage); precedent for service-layer abstraction over Supabase calls
- Phase 175 atomic-migration + DO-ASSERT pattern (`supabase/migrations/175_*.sql`) — Phase 177 migration follows the same shape
- Wave 0 RED tests committed before production code (Nyquist gate) — applied across Phases 173/174/175/176; downstream plans flip to GREEN

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/services/svgValidator.js`** — already injectable for non-browser runtimes via `opts.DOMParserCtor`. Edge Function imports + injects Deno's `DOMParser`. Saves rewriting validation logic in TypeScript. **Pre-flight smoke test needed** to confirm which Deno DOMParser source works (built-in vs npm shim).
- **`src/pages/Admin/AdminEditTemplatePage.jsx`** — full edit UI for templates, 943 LOC. Extension via `?draftId` URL param avoids rebuilding edit affordances. Planner verifies the data layer is decoupled enough; if not, fall back to clone-then-redirect.
- **`scripts/generate-template-thumbnails.cjs`** — reference `@resvg/resvg-js` rasterization; Edge Function uses the same `Resvg(svg).render().asPng()` shape via `npm:@resvg/resvg-js`.
- **`src/components/Admin/BulkTemplateUpload.jsx`** — existing `validateSvg` call site + SVG-dimension extraction logic. Generated drafts get the same dimension parsing for `metadata.width` / `metadata.height`.
- **`src/services/marketplaceService.js`** — admin CRUD service pattern; `AdminTemplateQueuePage` may add a parallel `templateDraftsService.js` for fetch/approve/reject with the same shape.

### Established Patterns

- **Admin page shell** — `PageLayout` chrome + filter/action row + table or modal-drilldown (AdminTemplatesPage / AdminStarterPacksPage / AdminAuditLogsPage all share this). `AdminTemplateQueuePage` follows it for visual consistency.
- **Admin route registration** — `App.jsx` `lazy()` import + `pageMap` entry + `adminToolPages` array membership. Three-line addition for the new route.
- **Atomic migration with DO-ASSERT** — Phases 175/176 lock this pattern. Phase 177's `'needs_human_review'` migration includes a self-asserting block that verifies the new enum value lands.
- **Wave 0 RED tests** — write the failing integration test for the Edge Function's admin-gate behavior before the production code; commits the RED state; downstream waves flip to GREEN.
- **Skip-guarded integration tests** — `describe.runIf(SHOULD_RUN)` + `createClient` deferred into `beforeAll` (Phase 176 lesson; avoids suite-load crash when env vars absent).
- **Service-role Supabase from Edge Functions** — Edge Functions use `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (already standard pattern in the project's other 8 deployed Edge Functions).
- **DOMPurify config consistency** — `{ USE_PROFILES: { svg: true, svgFilters: true } }` is load-bearing across `svgValidator.js`, `templateApplyService.js`, and Phase 175 work; queue-page preview rendering uses the same config.

### Integration Points

- **`gallery_templates` VIEW** — already exposes `vertical` (Phase 176). Approving a draft INSERTs into `svg_templates` with the right `vertical` value; the VIEW surfaces it immediately. No VIEW change needed.
- **`s3://bizscreen-media/thumbnails/system/<id>.png`** — convention from Phase 175. Approve path uploads to the same prefix using the same key shape.
- **`is_admin()` / `is_super_admin()` SQL helpers** (migration 009) — Edge Function gates on these (server-side); RLS policy on `template_drafts` already enforces them at the row level.
- **`adminToolPages` array in `App.jsx:687-691`** — adding `'admin-template-queue'` is the one-line nav-gate change.
- **`ANTHROPIC_API_KEY` Supabase secret** — already set per `.env.example:163` and `autoTaggingService.js` precedent. New: `ANTHROPIC_MODEL_ID` secret (defaulted to `claude-haiku-4-5-20251001` if planner deems an in-code default acceptable; otherwise fail-fast on missing env).

</code_context>

<specifics>
## Specific Ideas

- **OptiSigns "Explore AI Prompts" cards are the verbatim UX precedent** for D-02. Reproduce the card layout (~7 cards, each tagged with a category badge and showing 1-2 line example prompts). See `.planning/research/OPTISIGNS-WALKTHROUGH.md` lines 73-85 for the exact 7 example prompts captured during the walkthrough.
- **Synchronous generation UX with a 30-second hint** — admin sees "Generating SVG... this can take ~30 seconds" while Edge Function does LLM + retries + insert. Acceptable for low-cadence admin work; matches OptiSigns AI Designer.
- **Threshold ≥30pp** — direct match to SC #6 parenthetical example. CONTEXT.md flags this as tunable on first measurement (re-run is ~$0.63).
- **Snapshot-pinned model** — `claude-haiku-4-5-20251001` (not the floating `claude-haiku-4-5` alias) per Pitfall A2 — controlled deprecation path.

</specifics>

<deferred>
## Deferred Ideas

- **TGEN-F2 — daily LLM generation cap and cost controls per admin/per organization** — Pitfall A4 mitigation, not in TGEN/TADM SCs. Track for v21.x.
- **TGEN-F3 — Image upload as AI generation input** — observed in OptiSigns; v22.0 candidate.
- **Anthropic Batch API for bulk generation** — 50% cost reduction; valuable for Phase 178 mass-seeding, not for Phase 177's one-at-a-time admin UX.
- **Per-vertical specialization of all 6 prompts (full 6×4 matrix)** — Phase 177 ships the 6 prompts with vertical=null acceptable; expand during Phase 178 content-seeding work as gaps surface.
- **"See More Like This" / detail-modal recommendation row** — v22.0; not relevant to admin queue UX.
- **Self-serve AI generation for end users** — explicit milestone-out-of-scope; deliberate divergence from OptiSigns.
- **Per-attempt eval suite in CI** (vs the one-off eval script) — out of scope; cost + flake risk make this v21.x or v22.0 work.

</deferred>

<overrides>
## Override Addendum (2026-05-06, post-research)

These three locked decisions are SUPERSEDED by post-research findings. Planner MUST follow the override, not the original D-XX text.

### D-04 SUPERSEDED → Inline edit modal

**Original:** Edit reuses `AdminEditTemplatePage` extended with `?draftId=` URL param; clone-then-redirect as fallback.

**Override:** **Inline edit modal on the Pending tab.** Reasons (verified against codebase):
- `src/App.jsx:162` uses string-based `currentPage` state — there is no URL-param routing infrastructure to add a `?draftId=` to.
- `src/pages/Admin/AdminEditTemplatePage.jsx` imports from `src/services/marketplaceService.js` which operates on `template_library` / `template_library_slides` (Polotno multi-slide templates), NOT `svg_templates` or `template_drafts`. The CONTEXT.md fallback "clone draft into `svg_templates` with `is_active=false`, navigate to existing editor" also fails — the editor doesn't read `svg_templates`.
- Inline modal (~200 LOC) keeps the single-tabbed-page cohesion locked in D-01; matches OptiSigns AI Designer's inline editing of generated results (no separate full-page editor for AI output).

**Override shape:** Pending tab Edit action opens a modal containing: textarea with editable `svg_content`, read-only originating prompt + vertical + template_type + retry count, optional regenerate-thumbnail-preview button, and a "Save & Publish" CTA that runs the same approve path (validator → rasterize → S3 → INSERT `svg_templates` → mark draft `approved`). Cancel reverts and leaves the draft `pending`.

### D-05 SUPERSEDED → No Phase 177 migration

**Original:** Migration 177 adds `'needs_human_review'` to `template_drafts.status` CHECK via DROP+ADD pattern.

**Override:** **No migration in Phase 177.** [supabase/migrations/176_template_drafts_and_vertical.sql:62](supabase/migrations/176_template_drafts_and_vertical.sql#L62) already includes `'needs_human_review'` in the enum (`CHECK (status IN ('pending', 'needs_human_review', 'approved', 'rejected'))`). The Phase 176 migration was written to anticipate Phase 177's needs.

If a NEW schema change surfaces during planning (e.g., a new index on `template_drafts` for queue queries), the planner adds a Phase 177 migration at that point — but pre-allocating one for `needs_human_review` is dead work.

### D-15 SUPERSEDED → @resvg/resvg-wasm (not @resvg/resvg-js)

**Original:** Rasterization in same Edge Function on Approve, using `npm:@resvg/resvg-js`.

**Override:** **Use `npm:@resvg/resvg-wasm`** (WASM build), not `@resvg/resvg-js` (N-API native binary). Supabase Edge Functions only support WASM image libraries; the N-API variant crashes at runtime ([Supabase docs — Image Manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation)).

**Implementation deltas:**
- Edge Function imports `import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@^2.6.2"`.
- Bundle WASM binary via `supabase/config.toml`:
  ```toml
  [functions.generate-svg-template]
  static_files = [ "./supabase/functions/generate-svg-template/index_bg.wasm" ]
  ```
- Requires Supabase CLI ≥2.7.0 + Docker for deploy. Add a planning task to verify the dev box meets these.
- Existing `scripts/generate-template-thumbnails.cjs` keeps `@resvg/resvg-js` (Node runtime, different surface).

### Stale claim correction

CONTEXT.md `<code_context>` section states "the project's other 8 deployed Edge Functions" — this is INCORRECT. `supabase/functions/` directory does not exist. Phase 177 establishes the first Edge Function in the codebase. Planner does not look for an existing admin-gate or service-role pattern in `supabase/functions/`; it establishes the pattern.

</overrides>

---

*Phase: 177-ai-generation-pipeline-admin-queue-ui*
*Context gathered: 2026-05-06*
*Override addendum added: 2026-05-06 post-research*
