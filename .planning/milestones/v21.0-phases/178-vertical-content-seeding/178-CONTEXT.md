# Phase 178: Vertical Content Seeding - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce **≥300 net-new SVG templates** across three verticals (Restaurants & QSR, Retail & e-commerce, Healthcare & wellness — ≥80 each, ≥8 distinct template types each), with hero types in both portrait + landscape orientations, all gated by `svgValidator` + S3 thumbnails, plus the `vertical` tag applied — using the AI generation pipeline + admin queue UI shipped in Phase 177 as the production lane, with the existing v20.0 15-category filter preserved without regression.

**In scope:**

- New seed script (`scripts/seed-vertical-templates.cjs` or similar) that drives the existing `generate-svg-template` Edge Function in a serial 300ms-throttled loop, vertical-by-vertical, ~120 attempts per vertical (1.5× over-generation buffer), reading from a curated topic file in repo
- Curated topic file (`scripts/seedTopics.js` or similar) containing ~390 full topic records — each with `slug, name, description, tags[], topic, palette, vibe, layout, vertical, template_type, orientation`
- Expansion of `src/services/aiTemplate/promptLibrary.js` + `supabase/functions/generate-svg-template/prompts.json` from 6 cross-vertical entries to ~20–26 entries (per-vertical specialization × 6 base types + 4 niche types); parity-test maintained
- Expansion of `template_type` set to add ≥4 niche types: `queue_status, drive_thru, waiting_room_ambient, emergency_alert` (details — column-vs-metadata — at planner discretion; see Claude's Discretion below)
- Edge Function extension: add `orientation` parameter to `action=generate` body; system prompt swaps `viewBox` (1920×1080 landscape vs 1080×1920 portrait) + appends a PORTRAIT-SPECIFIC GUIDANCE section at call time; `templateDraftsService.generateDraft()` signature extends to `{ vertical, template_type, orientation, prompt }`
- Edge Function extension: new `action=approve_bulk` handler that loops the existing `approve_draft_atomic` RPC per-ID serially, returns per-ID success/fail; symmetric new `action=reject_bulk` handler with optional shared `metadata.rejected_reason`
- `AdminTemplateQueuePage` Pending-tab extension: row checkboxes + filter chips (vertical / template_type / status `pending|needs_human_review`) + Approve-selected + Reject-selected toolbar buttons + confirmation modal (count + first-5 draft names + per-draft execution status feed + final summary); Generate-tab `template_type` dropdown filters options by selected vertical
- `templateDraftsService` additions: `bulkApproveDrafts(draftIds[])` + `bulkRejectDrafts(draftIds[], reason?)`
- Phase 178 atomic migration: backfill `svg_templates.vertical` for the existing 127 rows from `category` (`'Restaurant'` → `'restaurants'`, `'Retail'` → `'retail'`, `'Healthcare'` → `'healthcare'`; all other categories stay NULL); follows 175/176/177 idempotent DO-ASSERT pattern
- Per-wave artifact: `178-WAVE-N-RUN.md` log with run timestamp, generated draft IDs, validator pass-rate, total cost, and qualitative review notes — committed alongside the wave's git activity
- Verification: SQL counts proving TVRT-01..03 (`COUNT(*) ≥ 80 per vertical`, `COUNT(DISTINCT template_type) ≥ 8 per vertical`); TCAT-01 (`gallery_templates COUNT ≥ 427`); TCAT-02 (hero types have both orientations live); TCAT-03 validator script run against all net-new SVG content with zero failures; TCAT-04 CHECK constraint untouched + Playwright gallery filter E2E run

**Out of scope (deferred / future phase / v21.x / v22.0):**

- TCAT-F2 vertical filter chip in `TemplateGalleryPage` — v22.0 (Phase 178 produces the tagged data; v22.0 surfaces it)
- TCAT-F1 sub-vertical tagging (`coffee-shop`, `pharmacy`, `urgent-care`, etc.) — v22.0
- TCAT-F3 per-vertical starter packs — v22.0
- TCAT-F4 admin publish/unpublish toggle — v22.0 (referenced as "approve-then-toggle" lane option, not adopted)
- TGEN-F2 daily LLM cost cap per admin — v21.x
- TGEN-F3 image upload as AI generation input — v22.0 (observed in OptiSigns)
- Anthropic Batch API integration (50% cost) — flagged in `research/STACK.md` as "valuable for Phase 178" but explicitly not adopted; the per-attempt retry-with-feedback loop doesn't fit Batch API's async fire-and-collect shape; revisit in v21.x or v22.0 if mass-regen becomes routine
- Self-serve AI generation for end users — explicit milestone-out-of-scope (deliberate divergence from OptiSigns)
- Manual audit + selective backfill of the existing 127 beyond category-derived mapping — out of scope; ambiguous categories (Corporate, Hospitality, Beauty, etc.) stay NULL
- Bulk SVG import pipeline (TPIPE-IMP-F1..F4) — explicitly deferred to v21.x with attribution form
- Phase 179 gallery virtualization — separate phase; assume the queue UI's 100+-row Pending tab may benefit from virtualization but that is not blocking (Phase 179 ships virtualization for the public gallery; same `@tanstack/react-virtual` dep can be retrofitted to the queue if review-session lag is observed)

</domain>

<decisions>
## Implementation Decisions

### Production lane

- **D-01:** **AI-heavy with curated prompts owned in repo** is the primary lane. Closest mirror to what is observable in OptiSigns's AI Designer; reuses the entire Phase 177 pipeline investment; produces a reproducible, versioned content asset (the topic file + the expanded promptLibrary). Rejected: pure hand-authored 175-style migration (doesn't exercise the 177 pipeline; manual SVG authoring at 300+ scale is not how OptiSigns produces their catalog either). Rejected: AI-only via existing one-at-a-time queue UI (300 admin clicks, not how scale-up is done).

- **D-02:** Seed script **loops the existing Edge Function** (`supabase.functions.invoke('generate-svg-template', { body: { action:'generate', vertical, template_type, orientation, prompt } })`) in a serial 300ms-throttled loop. "What we ship is what we test" — every seeded template traverses the validator-at-ingest gate + retry-with-feedback loop + atomic-approve flow that production users hit. Rejected: direct Anthropic SDK from script (creates a 2nd code path that must stay in lock-step with the EF; if the EF retry loop changes, the script silently diverges). Rejected: Anthropic Batch API (the per-attempt validator-feedback loop is the load-bearing quality lever; Batch API's async shape doesn't fit feedback because feedback requires inspecting attempt N's failure before composing attempt N+1; saving ~$6 across the whole milestone is poor ROI).

- **D-03:** **Vertical-by-vertical waves**: Wave 1 Restaurants (~120 attempts) → review sample + tune promptLibrary if first-pass quality is weak → Wave 2 Retail (~120) → same → Wave 3 Healthcare (~120). Each wave commits its own `178-WAVE-N-RUN.md` artifact (run timestamp, draft IDs, validator pass-rate, cost, qualitative notes). Lets us course-correct prompts between waves before spending the full budget. Rejected: type-by-type waves (harder to verify per-vertical depth incrementally; can't tune per-vertical prompts mid-run). Rejected: single one-shot run (no course-correction window; if prompts are weak we discover that AFTER spending the full budget).

- **D-04:** **Over-generate ~1.5×** to absorb the aesthetic-cull. Target ~120 attempts per vertical (~360 total + ~30 cross-vertical buffer ≈ ~390 LLM calls, ~$15.60 budget at Haiku 4.5 pricing). Reject the weakest 25% during review. Lands solidly above the ≥80/vertical SC bar with quality headroom. The visual cull is what the bulk-reject UX (D-06) supports.

### Approve-at-scale path

- **D-05:** **Bulk-approve in `AdminTemplateQueuePage`**: add row checkboxes + "Approve selected" toolbar button to the Pending tab. Server-side: a new EF `action=approve_bulk` handler that loops `approve_draft_atomic` RPC per-ID **serially** (no Promise.all — Pitfall 3 / load on Anthropic + S3); returns `{ ok: true, results: [{ draftId, ok, error?, thumbnail_url? }, ...] }`. Each iteration gets its own retry envelope so a single bad draft doesn't poison the wave. **Reuses the Plan 03 4-step atomic flow per ID** (validate → rasterize → S3 PUT → RPC) — no logic duplication; the load-bearing BL-04/BL-01 defense-in-depth re-validation stays in place. Rejected: script-loop without UI (loses the visual review gate that is BizScreen's differentiator vs OptiSigns). Rejected: Mgmt API direct INSERT (would reimplement the atomic 4-step flow — duplication risk + loses the 177 hardening). Rejected: approve-then-toggle (depends on v22.0 publish/unpublish toggle that doesn't ship until later).

- **D-06:** **Symmetric bulk-reject** with optional shared `metadata.rejected_reason` (`reason` text field rendered above the bulk-action toolbar; applied to all selected drafts when fired). New EF `action=reject_bulk` handler; same shape as `approve_bulk`. Mirrors approve UX so the visual cull is one cohesive sweep. Rejected: keep reject single-row only (~100 individual reject clicks per wave defeats the cull strategy). Rejected: 'reject all unselected' inverse model (dangerous default; bad recovery from accidental mass-reject).

- **D-07:** **Pending tab = flat list + filter chips**. Chronological DESC default (current Plan 04 behavior). Add chip filters at the top: vertical (`Restaurants` / `Retail` / `Healthcare` / `Cross`), template_type (the expanded ~10 enum), status (`Pending` / `Needs review`). Reuses the v20.0 gallery filter-chip pattern (`src/components/gallery/FilterChips` precedent). Pro: low complexity; admin can slice by vertical to focus a wave; pairs well with bulk-select. The 100+-row review session may benefit from virtualization but that is not blocking — Phase 179 ships `@tanstack/react-virtual` for the public gallery and the same dep can be retrofitted to the queue if review-session lag is observed (track as a v21.x watch item, not a Phase 178 task).

- **D-08:** **Confirm modal with count + first-5 draft names + per-draft execution feed + final summary**. After clicking "Approve selected" or "Reject selected", a modal shows: `Approve 47 drafts? [first 5 names listed, '…and 42 more']`. After confirm, the modal stays open and streams per-draft status (`✓ <slug>` / `✗ <slug> — <error>` rows append as the bulk EF call returns each result). Final summary: `Approved 45, 2 failed (see errors below)`. Failed drafts stay in `pending` so admin can re-try. Rejected: count-only confirm (admin can't spot wrong-vertical selection). Rejected: no confirmation, just toast (bad fit for irreversible publishing at this scale).

### Coverage tactics

- **D-09:** **Expand `promptLibrary` to ~18 entries** (per-vertical specialization for the 6 base types × 3 verticals). The existing 6 cross-vertical entries stay as fallback (Edge Function's `(template_type, vertical)` lookup falls back to `vertical=null` when no exact match — Phase 177 D-09 mechanism). New entry shape unchanged from Phase 177 D-09. Per-vertical entries refine the cross-vertical system_prompt with vertical-specific guidance (Restaurants menu = full menu board layout; Healthcare reminder = appointment-card aesthetic; Retail promo = flash-sale urgency framing). 177-CONTEXT.md D-10 explicitly endorsed this expansion as Phase 178 work.

- **D-10:** **Add `orientation` parameter to `action=generate` body**. EF extension: `generateDraft({ vertical, template_type, orientation, prompt })` where `orientation ∈ { 'landscape' | 'portrait' }`. The system prompt swaps `viewBox` (1920×1080 vs 1080×1920) and appends a PORTRAIT-SPECIFIC GUIDANCE section to each promptLibrary entry's system_prompt at call time. promptLibrary entries themselves stay orientation-agnostic — orientation is a runtime concern. Mirrors OptiSigns AI Designer's orientation dropdown (visible in `OPTISIGNS-WALKTHROUGH.md` §"AI Designer"). Generate-tab UI gains an orientation dropdown next to vertical/template_type. Rejected: parallel landscape+portrait library entries (2× the prompt authoring + parity test). Rejected: landscape-only + manual portrait port via edit modal (~5–10 min/template manual SVG editing → admin will avoid → TCAT-02 ship-blocker).

- **D-11:** **Expand `template_type` set + add per-vertical library entries** for the niche types named in TVRT-01..03: `queue_status, drive_thru, waiting_room_ambient, emergency_alert` (and possibly `vaccination_reminder` as a Healthcare-specialized `reminder` subtype). Final library size grows to ~20–26 entries. **Whether `template_type` is a column with CHECK constraint or stays in `metadata.template_type` is at planner discretion** — see Claude's Discretion below. The TVRT SC verification (`COUNT(DISTINCT template_type) ≥ 8 per vertical`) works either way (`SELECT DISTINCT template_type` vs `SELECT DISTINCT metadata->>'template_type'`); the column form is cleaner for downstream filtering, the metadata form is migration-cheaper.

- **D-12:** **Generate-tab template_type dropdown filters by selected vertical**. A small mapping table in `promptLibrary` (or a derived helper) declares which template_types are relevant to which vertical (drive_thru ↔ Restaurants only; waiting_room_ambient ↔ Healthcare only; emergency_alert ↔ Healthcare; menu/promo/announcement/reminder/wayfinding/health_tip = all verticals). When admin selects vertical='restaurants', the template_type dropdown narrows to Restaurants-relevant types. When admin selects 'cross-vertical', all types show. Admin freeform UX gains a useful filter; nonsense combinations (Healthcare + drive_thru) become unselectable. Rejected: flat all-types dropdown (admin can pick nonsense). Rejected: two-tier dropdown (leaks promptLibrary specialization model into the form).

### Source material strategy

- **D-13:** **Curated topic list authored by us, lives in repo** (e.g., `scripts/seedTopics.js`). The seed script (`scripts/seed-vertical-templates.cjs`) reads from this versioned data file. The topic file becomes a content asset that survives Phase 178 as documentation: "what does a good Restaurants daypart menu look like?" answered as code. PR-reviewable; reproducible across runs. ~390 records to author up-front (most can be Claude-assisted then human-edited in a single focused session). Rejected: mirror OptiSigns categories from the walkthrough (only 7 examples → 50× expansion needed → would mostly duplicate promptLibrary). Rejected: real-world establishment archetypes (interesting structurally but more enumeration work for marginal gain over the topic-with-aesthetic-hints model). Rejected: LLM-generated topic list at run time (not reproducible across runs; review burden moves from up-front-cheap to mid-run-expensive).

- **D-14:** **Structured aesthetic hints per topic entry** drive visual variety. Each topic entry carries `{ palette: 'warm-amber' | 'high-contrast-emergency' | 'calm-clinic-blue' | … , vibe: 'casual-bistro' | 'modern-fast-casual' | … , layout: 'left-aligned-with-divider' | 'centered-hero' | 'stacked-rows' | … }` in addition to the freeform `topic` string. The seed script weaves these into the freeform prompt sent to the EF. The topic file becomes a structured design brief; predictable variety; each entry is reviewable in isolation. Rejected: topic strings alone (LLM aesthetic convergence is a known failure mode → similar-looking outputs). Rejected: prior-template references (chicken-and-egg in first wave; risk of LLM copying too literally → amplifies same-ness). Rejected: aesthetics baked into promptLibrary (locks aesthetics at the library level → less per-template variety).

- **D-15:** **Topic file carries everything explicitly**. Each entry: `{ slug, name, description, tags[], topic, palette, vibe, layout, vertical, template_type, orientation }`. The approve_draft_atomic RPC payload is built from these fields verbatim during the bulk-approve flow (`name, description, tags, vertical, orientation, width, height` plumbed from the topic record; `category` derived via `deriveCategoryFromDraft` per Plan 03 Auto-fix Rule 1; `svg_content`/`svg_url` from the generated draft; `thumbnail` from S3 PUT during approve). Pro: full repo-reviewed control on identity + design hints; consistent naming; explicit slug uniqueness check at topic-file load time. Rejected: extend EF tool-use schema to emit name+description+tags (LLM-generated names tend toward generic — 'Modern Promo Banner', 'Restaurant Menu Template'; tag quality variable). Rejected: auto-derived names + post-hoc auto-tag pass via `batch-auto-tag-templates.cjs --rules-only` (predictable-but-bland names; rule-based tags hurt search quality).

- **D-16:** **Backfill existing 127 svg_templates rows' vertical column from category**. One-shot atomic migration (idempotent DO-ASSERT block, mirrors 175/176/177 pattern): `UPDATE svg_templates SET vertical='restaurants' WHERE category='Restaurant' AND vertical IS NULL; UPDATE … SET vertical='retail' WHERE category='Retail' …; UPDATE … SET vertical='healthcare' WHERE category='Healthcare' …`. Other categories (Corporate, Hospitality, Real Estate, Education, Events, Fitness, Entertainment, Beauty, Automotive, Technology, Finance, general) stay NULL — ambiguous mappings (Hospitality breakroom → restaurants? Beauty → retail?) are explicitly out of scope. Pro: existing Restaurant/Retail/Healthcare rows count toward TVRT-01..03 thresholds (lowers the net-new bar from 80 to 80−existing); zero behavior regression (category column untouched → 15-category filter unchanged → TVRT-05 trivially satisfied); cheap atomic migration. The migration runs once, before Wave 1, and its DO-ASSERT block confirms the exact pre/post counts.

### Claude's Discretion

The planner has flexibility on these details — research and code inspection should pick the right answer:

- **`template_type` as column with CHECK vs free string in `metadata.template_type`** (D-11). Column form is cleaner for v22.0 filtering and adds DB-level enforcement; metadata form is migration-cheaper and matches the Phase 176 metadata-JSONB-for-everything-non-enum pattern. Planner decides based on (a) whether v22.0 vertical-filter-chip needs `template_type` for SQL queries and (b) inspection of how `metadata.template_type` is currently populated by the EF.
- **Cost cap mechanic** (D-04). Soft warning at $X spent + hard stop at $Y, both configurable via CLI flag on `seed-vertical-templates.cjs`. Default values at planner discretion; suggested $20 hard cap with $15 soft warning.
- **Concurrency model for `approve_bulk` / `reject_bulk`** EF actions (D-05/D-06). Serial loop (300ms throttle, eval-prompt-library.cjs precedent) is the safe default. Limited parallel (e.g., `Promise.all` chunks of 3) is a planner judgment — must respect Anthropic + S3 rate limits and respect the Pitfall 3 rule about unbounded concurrency.
- **Idempotency on partial wave failure** (D-03). If Wave 1 dies mid-run after 73/120 attempts, does Wave 1.5 = re-run from attempt 74, or = treat the 73 as the wave and proceed to Wave 2? Planner picks; suggest `--resume-from <slug>` flag on the seed script with stateless restart (the topic file declares slug uniqueness, so re-running the same topic will fail INSERT on dup-key — natural restart point).
- **Parity-test extension** for the now-larger `promptLibrary.js` + `prompts.json` (~24 entries). Keep manual edit-both pattern (Phase 177 D-08), or move to single-source-of-truth with a build step that emits prompts.json. Planner picks based on edit cadence.
- **Per-archetype distribution per vertical**. Within a vertical's ~80 published templates spanning ~8 types, what's the per-type count? Even (10/type), hero-weighted (15 menu boards, 10 wayfinding, 5 health_tip in Restaurants), or driven by topic-file row counts? Planner decides; suggest hero-weighted with ≥4 per type minimum to satisfy "≥8 distinct template types" with quality headroom.
- **Bulk-action audit trail shape** (D-08). Per-draft individual `metadata.reviewed_by/reviewed_at` (current Plan 03 pattern, just iterated) vs an additional bulk-action log row in a new `template_bulk_audit` table. Planner picks; suggest reusing per-draft audit (no schema change; the bulk-action context is recoverable by querying `created_at` clusters on the same `reviewed_by`).

</decisions>

<specifics>
## Specific Ideas

- **Mirror OptiSigns's per-category curated prompts pattern** but at production-time (not user-facing). Their AI Designer has 7 example-prompt cards tagged with category — exactly the per-(template_type × vertical) structure D-09 expands the library to. The walkthrough (`OPTISIGNS-WALKTHROUGH.md` §"Concrete UX patterns to mirror or diverge from") locks this as a Mirror.
- **OptiSigns's seeded catalog quality is hand-curated, not pure AI**. Their hero templates look professionally designed. We accept that pure AI lane will produce slightly lower hero quality than OptiSigns and lean on the 1.5× over-generation + visual cull (D-04, D-05/D-06) to compensate.
- **The 6 cross-vertical promptLibrary entries from Phase 177 stay as fallback** (when admin selects 'cross-vertical' in the Generate tab, or when a `(template_type, vertical)` lookup misses an exact match — Phase 177 D-09 mechanism is preserved).
- **Reuse `eval-prompt-library.cjs` harness skeleton** for the seed script — it already wires Anthropic SDK + svgValidator + tool-use schema + 300ms serial throttle (Phase 177 Plan 06 ran 180 calls / $1.89). The seed script swaps the eval-collection logic for `supabase.functions.invoke(generate)` calls + topic-file iteration.
- **Reuse 175 hand-authored migration pattern** for the existing-127 backfill UPDATE — small atomic migration with DO-ASSERT confirming pre/post counts; no Mgmt API direct call needed (the UPDATE is small enough for the standard MCP `apply_migration`).
- **Per-draft size constraint**: ≤200KB SVG (locked in current promptLibrary system_prompts; preserved in expanded entries).
- **viewBox lock**: `1920×1080` for landscape orientation; `1080×1920` for portrait — D-10 swap logic.
- **Cost ceiling**: ~$15.60 expected at Haiku 4.5 pricing (~$0.04/template incl average 1.4 retries); budget hard cap $20 (Claude's Discretion).
- **Throttle**: 300ms serial inter-call delay (Pitfall 3 from research/PITFALLS.md; eval-prompt-library.cjs + generate-template-thumbnails.cjs precedent).
- **Wave artifact format**: `178-WAVE-N-RUN.md` with run timestamp, draft IDs (UUIDs), validator pass-rate, total cost, qualitative review notes — committed alongside each wave.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements

- `.planning/ROADMAP.md` §"Phase 178: Vertical Content Seeding" — phase goal, dependencies, full success criteria text (5 SCs covering TVRT-01..03 + TCAT-01..04 + TVRT-04..05)
- `.planning/REQUIREMENTS.md` §"Catalog Scale-Up (TCAT)" + §"Vertical Content (TVRT)" — TCAT-01..04 + TVRT-01..05 requirement IDs and traceability table
- `.planning/PROJECT.md` §"Current Milestone: v21.0 Templates at Scale" — milestone goal, target features, OptiSigns benchmark framing, vertical-first content strategy
- `.planning/STATE.md` §"v21.0 Phase Map" — Phase 178 risk note ("Content volume — 300 net-new templates; AI pipeline accelerates but hand-authoring is fallback") and v21.0 progress baseline (Phase 176 + 177 complete)

### OptiSigns walkthrough (drives content strategy + UX decisions)

- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"AI Designer" — verbatim 7-card category-tagged example prompt list (Menu / Retail / Announcement / Reminder / Wayfinding / Instructions / Food); orientation dropdown precedent (D-10)
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Filter Taxonomy" — 8-axis filter dimensions (Categories × Industries × Template Types × Visual Styles × Color Moods × …); explains why Phase 178 generates rich `tags[]` even though v21.0 surfaces only 3 axes (catalogue-side investment for v22.0 surfacing)
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Concrete UX patterns to mirror or diverge from" — Mirror/Diverge table that locks per-category curated prompts as Mirror, self-serve as Diverge, single-prompt UX as Mirror
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Layout patterns" — masonry grid + horizontal carousels + branded category banners (informs which catalogue-side metadata Phase 178 should emit even if v21.0 doesn't surface it)

### Architecture and stack research

- `.planning/research/STACK.md` §"Decision: @anthropic-ai/sdk — Claude Haiku 4.5 model" — locks LLM vendor, model snapshot, pricing math; Anthropic Batch API note flagging Phase 178 mass-seeding as the canonical Batch API use case (we deliberately do NOT adopt — see D-02 rationale)
- `.planning/research/ARCHITECTURE.md` §"AI Generation Pipeline" — Edge Function shape (now operational per Phase 177); guides `approve_bulk` / `reject_bulk` extension shape
- `.planning/research/PITFALLS.md` §A1 (validator-at-ingest), §A3 (structured output ≠ valid SVG), §A4 (retry storms / cost cap) + Pitfall 3 (serial 300ms throttle, no unbounded `Promise.all`)
- `.planning/research/SUMMARY.md` — research synthesis; flags content-volume risk as the dominant Phase 178 concern

### Phase 176 schema (locked, must not be re-decided)

- `supabase/migrations/176_template_drafts_and_vertical.sql` — `vertical` enum is **lowercase** `restaurants|retail|healthcare`; `template_drafts.status` already includes `needs_human_review`; `gallery_templates` VIEW exposes `vertical` (no VIEW change needed for Phase 178)
- `.planning/phases/176-schema-foundation/176-VERIFICATION.md` — independent verifier confirmed the live schema; pre/post-state of vertical column

### Phase 177 outputs (the production lane Phase 178 reuses)

- `.planning/phases/177-ai-generation-pipeline-admin-queue-ui/177-CONTEXT.md` §"Decisions" — D-04 OVERRIDE inline edit modal; D-08/D-09/D-10 promptLibrary shape and per-vertical specialization explicitly deferred to Phase 178; D-15 OVERRIDE @resvg/resvg-wasm; D-16 ANTHROPIC_MODEL_ID env var
- `.planning/phases/177-ai-generation-pipeline-admin-queue-ui/177-VERIFICATION.md` — 10/10 TGEN+TADM requirements verified; pipeline operational; bulk-extension surface (action=approve_bulk / reject_bulk) is additive to the verified per-row flows
- `supabase/functions/generate-svg-template/handlers/generate.ts` — current EF generate handler; Phase 178 extends body to include `orientation`; system prompt construction is the integration point for D-10 portrait/landscape
- `supabase/functions/generate-svg-template/handlers/approve.ts` — current per-row approve flow with locked source-order awk gate (`validateSvg → rasterize → uploadPng → rpc("approve_draft_atomic")`); `approve_bulk` MUST loop this flow per-ID (not bypass it)
- `supabase/functions/generate-svg-template/handlers/reject.ts` — current per-row reject; `reject_bulk` mirrors it with shared reason
- `supabase/migrations/177_approve_draft_atomic.sql` — `approve_draft_atomic` RPC; Phase 178 bulk-approve handler calls this RPC per-ID without modification (the per-call advisory lock + idempotency short-circuit are exactly what we want for retry semantics)
- `src/services/aiTemplate/promptLibrary.js` (60 LOC, 6 entries) + `supabase/functions/generate-svg-template/prompts.json` — parity-locked file pair; Phase 178 expands to ~20–26 entries
- `src/services/aiTemplate/templateDraftsService.js` (86 LOC) — frontend service; Phase 178 adds `bulkApproveDrafts` + `bulkRejectDrafts`; possibly extends `generateDraft` signature with `orientation`
- `src/pages/Admin/AdminTemplateQueuePage.jsx` — Plan 04+05 shell; Phase 178 adds checkboxes + filter chips + bulk-action toolbar + confirm modal
- `scripts/eval-prompt-library.cjs` — Phase 177 Plan 06; Anthropic SDK + svgValidator + tool-use schema + 300ms serial throttle; harness skeleton reused by `seed-vertical-templates.cjs`

### v20.0 / Phase 175 patterns reused

- `supabase/migrations/175_seed_100_templates_and_taxonomy.sql` — `chk_svg_templates_category_enum` 15-value floor (planner verifies new INSERTs continue to satisfy via `deriveCategoryFromDraft`); idempotent UUID-v5 seed pattern + ON CONFLICT (slug) DO NOTHING; DO-ASSERT self-verification block format
- `scripts/generate-template-thumbnails.cjs` — service-role Supabase client setup + 300ms serial throttle precedent (Pitfall 3 mitigation)
- `scripts/batch-auto-tag-templates.cjs` — auto-tagging script (NOT used in Phase 178 — D-15 has the topic file own tags directly; referenced as the rejected alternative)

### Phase 175 retrospective

- `.planning/phases/175-new-template-content-quality-pass/175-VERIFICATION.md` — closed-out evidence trail; precedent for "content-volume + validator + thumbnails" verification format that Phase 178's verification mirrors at 3× the volume
- Phase 175 chose hand-authored migration via Supabase Mgmt API direct call (84KB SQL too large for MCP `apply_migration`). Phase 178's expected migration size is small (the existing-127 backfill is ~10 lines + DO-ASSERT); use standard MCP `apply_migration`. The 300+ net-new SVG INSERTs land via the bulk-approve EF flow, NOT a migration — this is a deliberate divergence from 175.

### Code touched by Phase 178 (extension points)

- `supabase/functions/generate-svg-template/handlers/generate.ts` — extend body schema with `orientation`; system prompt assembly swaps viewBox + adds PORTRAIT-SPECIFIC GUIDANCE
- `supabase/functions/generate-svg-template/handlers/` — new `approve_bulk.ts` + `reject_bulk.ts` handlers; new action routing in `index.ts`
- `supabase/functions/generate-svg-template/prompts.json` — expand from 6 to ~24 entries (parity-locked with promptLibrary.js)
- `src/services/aiTemplate/promptLibrary.js` — expand from 6 to ~24 entries; add type-vertical-mapping helper for Generate-tab dropdown filtering
- `src/services/aiTemplate/templateDraftsService.js` — add `bulkApproveDrafts` + `bulkRejectDrafts`; extend `generateDraft` with `orientation`
- `src/pages/Admin/AdminTemplateQueuePage.jsx` — Pending tab: row checkboxes, filter chips (vertical / template_type / status), bulk-action toolbar with Approve-selected + Reject-selected; confirm modal with per-draft execution feed; Generate tab: orientation dropdown, vertical-filtered template_type dropdown
- `scripts/seed-vertical-templates.cjs` (NEW) — main seed driver; reads `seedTopics.js`, drives EF `action=generate` in serial loop, persists per-wave run artifacts
- `scripts/seedTopics.js` (NEW) — ~390 topic records with `{ slug, name, description, tags[], topic, palette, vibe, layout, vertical, template_type, orientation }`
- `supabase/migrations/178_*.sql` (NEW) — small atomic migration backfilling existing-127 vertical from category; DO-ASSERT block confirms pre/post counts
- `tests/integration/promptLibraryParity.test.js` — verify it still passes after the ~24-entry expansion (Phase 177 D-08 parity contract)
- `tests/e2e/admin-template-queue.spec.js` — extend Phase 177 Plan 06 spec with bulk-select + bulk-approve/reject coverage; verify confirm modal + per-draft feed; verify filter chips

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`supabase/functions/generate-svg-template/handlers/generate.ts`** — operational EF generate handler; D-10 extends body schema with `orientation` and system prompt construction with viewBox swap + PORTRAIT-SPECIFIC GUIDANCE section; tool-use schema (`emit_svg_template`) returns `{ svg, rationale }` only — no name/description/tags (D-15 has those owned by topic file).
- **`supabase/functions/generate-svg-template/handlers/approve.ts`** — operational per-row approve flow with locked source-order awk gate (`validateSvg → rasterize → uploadPng → rpc("approve_draft_atomic")`). `approve_bulk` calls this exact flow per-ID inside a serial loop — no logic duplication; load-bearing BL-04/BL-01 defense-in-depth re-validation stays in place.
- **`approve_draft_atomic` RPC** (migration 177) — accepts `(p_draft_id, p_svg_template, p_metadata_patch)` JSONB triple; `pg_try_advisory_xact_lock(hashtext(draftId))` + idempotency short-circuit make it natively safe for bulk-loop retry semantics. Planner does NOT modify the RPC.
- **`src/services/aiTemplate/promptLibrary.js` + `supabase/functions/generate-svg-template/prompts.json`** — parity-locked pair; Phase 178 expands from 6 to ~20–26 entries; existing `(template_type, vertical=null)` lookup-fallback mechanism (Phase 177 D-09) preserved.
- **`src/services/aiTemplate/templateDraftsService.js`** — frontend service mirroring `marketplaceService.js` error-throwing pattern; Phase 178 adds `bulkApproveDrafts(draftIds[])` + `bulkRejectDrafts(draftIds[], reason?)` that call new EF actions.
- **`src/pages/Admin/AdminTemplateQueuePage.jsx`** — Plan 04+05 shell with two tabs (Generate / Pending); Phase 178 adds checkbox column to the Pending tab table, filter chip row above the table, bulk-action toolbar (Approve-selected + Reject-selected with optional shared reason input), and a confirm modal that hosts the per-draft execution feed. Generate tab gains an orientation dropdown + the template_type dropdown becomes vertical-filtered.
- **`scripts/eval-prompt-library.cjs`** — Phase 177 Plan 06 harness; provides Anthropic-SDK + svgValidator + tool-use schema scaffolding + 300ms serial throttle pattern; `scripts/seed-vertical-templates.cjs` reuses this skeleton, swapping eval-collection logic for `supabase.functions.invoke(generate)` calls.
- **`scripts/generate-template-thumbnails.cjs`** — service-role Supabase client setup pattern for CLI scripts (no SDK auth — VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars); 300ms serial throttle reference.
- **`deriveCategoryFromDraft`** in `approve.ts` — already maps `draft.vertical` → `chk_svg_templates_category_enum`-valid `category` value (`restaurants` → `'Restaurant'`, `retail` → `'Retail'`, `healthcare` → `'Healthcare'`, fallback `'general'`). Phase 178 net-new INSERTs satisfy the CHECK trivially.

### Established Patterns

- **300ms serial throttle** (Pitfall 3 / research/PITFALLS.md) — every script driving Anthropic / S3 in a loop. Never `Promise.all` over the row set.
- **Atomic migration with DO-ASSERT** (Phases 175/176/177) — Phase 178's existing-127 backfill follows this pattern; the assertion block confirms pre/post vertical counts and ON CONFLICT (slug) DO NOTHING idempotency.
- **Wave 0 RED tests committed before production code** (Nyquist gate, Phases 173/174/175/176/177) — `bulkApproveDrafts` / `bulkRejectDrafts` test scaffolds + Playwright spec extension committed RED before the EF + UI code lands.
- **Skip-guarded integration tests** — `describe.runIf(SHOULD_RUN)` + `createClient` deferred into `beforeAll` (Phase 176 lesson; avoids suite-load crash when env vars absent).
- **Locked DOMPurify config** — `{ USE_PROFILES: { svg: true, svgFilters: true } }` is load-bearing across 4 mirror sites in Phase 177 (`svgValidator.js`, `templateApplyService.js`, `handlers/approve.ts`, `TemplateDraftPreview.jsx`). Phase 178 introduces no new sanitization sites — bulk-approve calls the existing approve.ts validator path per-ID.
- **Source-order awk gate** in `approve.ts` (`validateSvg → rasterize → uploadPng → rpc("approve_draft_atomic")`) — Phase 178 `approve_bulk` MUST preserve this contract per-ID; CI's source-order test extends to cover the new handler.
- **Parity test for promptLibrary.js / prompts.json** (Phase 177 D-08) — `tests/integration/promptLibraryParity.test.js` enforces data-equality; Phase 178 expansion must keep this green.
- **Snapshot-pinned model** (`claude-haiku-4-5-20251001` per Pitfall A2 + D-16) — Phase 178 uses the exact same model; cost projections derived from this pricing.

### Integration Points

- **`svg_templates.vertical` column** (Phase 176) — net-new INSERTs (via approve_draft_atomic.p_svg_template payload) write to it; Phase 178 backfill UPDATE writes to it for existing 127.
- **`chk_svg_templates_category_enum`** (Phase 175) — `deriveCategoryFromDraft` produces enum-valid values; Phase 178 changes nothing here. TCAT-04 SC ("CHECK constraint untouched") is satisfied by inspection.
- **`gallery_templates` VIEW** (Phase 176) — already exposes vertical; net-new templates surface via the VIEW immediately after approve. TCAT-04 SC ("VIEW continues to enforce taxonomy") is satisfied by Phase 176's existing VIEW shape.
- **`s3://bizscreen-media/thumbnails/system/<slug>.png`** (Phase 175 convention; Phase 177 deterministic-key Plan 177-08) — bulk-approve uploads here per-ID; key shape unchanged.
- **`is_admin()` / `is_super_admin()` SQL helpers** (migration 009) — bulk-approve / bulk-reject EF handlers gate on these (server-side); RLS policy on `template_drafts` enforces them at the row level.
- **`adminToolPages` array in `App.jsx`** — `admin-template-queue` already in the allowlist (Phase 177 Plan 04); no nav-gate change for Phase 178.
- **`ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL_ID` Supabase secrets** — already set; Phase 178 reuses; no new secrets.
- **Admin queue UI's Pending fetch** (`fetchPendingDrafts` in templateDraftsService) — currently returns up to all `pending|needs_human_review` rows; with ~120 drafts per wave, the existing query is fine; add filter-chip-driven WHERE clauses on the client side first, push to server-side filtering only if perf becomes a concern.

</code_context>

<deferred>
## Deferred Ideas

- **TCAT-F2 vertical filter chip** in `TemplateGalleryPage` — v22.0 (Phase 178 produces the tagged catalogue; v22.0 surfaces it as a user-facing chip)
- **TCAT-F1 sub-vertical tagging** (`coffee-shop`, `pharmacy`, `urgent-care`, `boutique`, etc.) — v22.0
- **TCAT-F3 per-vertical starter packs** — v22.0
- **TCAT-F4 admin publish/unpublish toggle** — v22.0 (referenced as "approve-then-toggle" lane option, not adopted in Phase 178)
- **TCAT-F5 orthogonal filter taxonomy** (Category × Vertical × Template Type × Visual Style × Color Mood) — v22.0
- **TGEN-F2 daily LLM cost cap per admin/per organization** — v21.x
- **TGEN-F3 image upload as AI generation input** — v22.0 (observed in OptiSigns)
- **Anthropic Batch API** (50% cost reduction) — flagged as "valuable for Phase 178" in research/STACK.md but explicitly NOT adopted: per-attempt validator-feedback loop is the load-bearing quality lever, doesn't fit Batch API's async fire-and-collect shape; saving ~$6 across the milestone is poor ROI. Revisit in v21.x or v22.0 if mass-regen becomes routine.
- **"See More Like This" / detail-modal recommendation row** — v22.0
- **Self-serve AI generation for end users** — explicit milestone-out-of-scope (deliberate divergence from OptiSigns)
- **Bulk SVG import pipeline** (TPIPE-IMP-F1..F4) — explicitly deferred to v21.x with attribution form + license-cleared sources
- **Manual audit + selective backfill** of existing 127 templates beyond category-derived mapping — out of scope; ambiguous categories (Hospitality, Beauty, Corporate) stay NULL in vertical column
- **Real-world establishment archetypes** as the topic-list structure (bistro / taqueria / urgent-care / boutique / etc.) — not adopted as primary structure; topic file's per-entry palette/vibe/layout fields capture archetype variety implicitly; revisit if visual variety in Wave 1 review is weak
- **Reference-image input** for AI generation — TGEN-F3 / v22.0 candidate
- **Per-eval-suite in CI** — out of scope; eval-prompt-library.cjs runs as a one-off harness, not a CI gate
- **Type-by-type waves** — rejected in favor of vertical-by-vertical (D-03); revisit if vertical-wave iteration produces uneven cross-vertical type quality
- **Two-phase generation** (LLM produces SVG, second LLM call extracts name/description/tags) — rejected in D-15; topic file owns identity fields
- **Queue-page virtualization** (`@tanstack/react-virtual`) — Phase 179 ships this for the public gallery; same dep retrofittable to the queue if review-session lag is observed; track as v21.x watch item, not Phase 178 task

</deferred>

---

*Phase: 178-vertical-content-seeding*
*Context gathered: 2026-05-09*
