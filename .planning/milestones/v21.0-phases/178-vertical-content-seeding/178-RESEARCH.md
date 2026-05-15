# Phase 178 Research: Vertical Content Seeding

**Researched:** 2026-05-09
**Domain:** Content seeding at scale via AI generation pipeline + bulk admin tooling extensions
**Confidence:** HIGH (every load-bearing claim verified against committed code, the Phase 177 hardening trail, and Phase 178 CONTEXT.md decisions)
**Goal:** Produce a planner-ready brief that supports 5-8 PLAN.md files spanning ~300 net-new SVG templates across three verticals with no regression in v20.0 category filter behavior.

---

## Research Question

**What do we need to know to plan Phase 178 well?**

Phase 178 is unusual: the CONTEXT.md is exceptionally rich (16 locked decisions, 7 explicit Claude's-Discretion points, full canonical-refs list). The research question is therefore narrower than usual: *given that the production lane and major UX shape are locked, what implementation details, file-level patterns, and runtime constraints does the planner need so that 5-8 PLAN.md files can be authored without re-research?*

Concretely:

1. How does the existing `generate.ts` system-prompt assembly need to change to accept an `orientation` parameter without breaking the locked source-order awk gate or the parity-locked promptLibrary contract?
2. What is the minimum-viable shape of `approve_bulk` / `reject_bulk` Edge-Function handlers that loop the existing per-row flows without duplicating logic, while respecting Anthropic + S3 rate limits and the EF 60-second runtime cap?
3. What is the safest concrete answer to each of the 7 Claude's-Discretion points, given the live codebase and the Phase 177 BL-01..BL-06 hardening trail?
4. What is the right wave/plan structure for the planner (5-8 plans), including Wave 0 RED tests and the per-vertical content waves, without locking specific test assertions?
5. Where does the security/threat surface expand (bulk EF actions), and what existing controls need to stretch to cover it?

---

## Locked Constraints (read-only references)

These are NOT to be re-decided. Research INFORMS *how* to implement them; planning translates them into tasks.

### Phase 178 Decisions (D-01..D-16, from 178-CONTEXT.md)

| ID | Lock | Source |
|----|------|--------|
| D-01 | AI-heavy lane with curated prompts owned in repo | CONTEXT.md L46 |
| D-02 | Seed script LOOPS the existing Edge Function (`action=generate`) — no parallel SDK path | CONTEXT.md L48 |
| D-03 | Vertical-by-vertical waves (Restaurants → Retail → Healthcare); per-wave `178-WAVE-N-RUN.md` artifact | CONTEXT.md L50 |
| D-04 | Over-generate ~1.5× (~120 attempts/vertical, ~$15.60 expected, ~$0.04/template) | CONTEXT.md L52 |
| D-05 | New EF `action=approve_bulk` loops `approve_draft_atomic` RPC per-ID **serially** | CONTEXT.md L56 |
| D-06 | Symmetric EF `action=reject_bulk` with optional shared `metadata.rejected_reason` | CONTEXT.md L58 |
| D-07 | Pending tab gains filter chips (vertical / template_type / status) | CONTEXT.md L60 |
| D-08 | Confirm modal with count + first-5 names + per-draft execution feed + summary | CONTEXT.md L62 |
| D-09 | promptLibrary expands to ~18 entries (per-vertical × 6 base types); 6 cross-vertical entries stay as fallback | CONTEXT.md L66 |
| D-10 | `orientation` parameter on `action=generate`; viewBox swap + PORTRAIT-SPECIFIC GUIDANCE injected at call time | CONTEXT.md L68 |
| D-11 | Expand `template_type` set to add `queue_status, drive_thru, waiting_room_ambient, emergency_alert` (column-vs-metadata at planner discretion) | CONTEXT.md L70 |
| D-12 | Generate-tab template_type dropdown filters by selected vertical (mapping table in promptLibrary) | CONTEXT.md L72 |
| D-13 | Curated topic list authored in repo (`scripts/seedTopics.js`); reproducible asset | CONTEXT.md L76 |
| D-14 | Per-topic structured aesthetic hints: `{ palette, vibe, layout }` in addition to freeform `topic` | CONTEXT.md L78 |
| D-15 | Topic file owns identity verbatim: `{ slug, name, description, tags[], topic, palette, vibe, layout, vertical, template_type, orientation }` | CONTEXT.md L80 |
| D-16 | Backfill existing 127 `svg_templates.vertical` from category via atomic migration (DO-ASSERT pattern); ambiguous categories stay NULL | CONTEXT.md L82 |

### Schema Invariants (Phase 176 / 175 / 177 — locked)

| Invariant | Source | Notes |
|-----------|--------|-------|
| `vertical` enum is **lowercase**: `restaurants` / `retail` / `healthcare` (or NULL) | `176_template_drafts_and_vertical.sql` L98 | CHECK `chk_svg_templates_vertical_enum` |
| `template_drafts.vertical` follows same enum + NULL | `176_…` L55 | `chk_template_drafts_vertical_enum` |
| `gallery_templates` VIEW already exposes `vertical` (23 cols) | `176_…` L117-174 | No VIEW change needed in Phase 178 |
| `chk_svg_templates_category_enum` 15-value floor; net-new INSERTs satisfy via `deriveCategoryFromDraft` | `175_…` L36-52, `approve.ts` L99-107 | `restaurants` → `'Restaurant'`, `retail` → `'Retail'`, `healthcare` → `'Healthcare'`, fallback `'general'` |
| `template_drafts.status IN ('pending', 'needs_human_review', 'approved', 'rejected')` | `176_…` L62 | bulk handlers MUST match this set |
| `approve_draft_atomic` RPC is **EXECUTE-restricted to service_role only** (BL-NEW-01 closure) | `177_approve_draft_atomic.sql` L154-157 | bulk loop calls via service-role client; never PostgREST direct |
| Source-order awk gate in `approve.ts`: `validateSvg → rasterize → uploadPng → rpc("approve_draft_atomic")` | `approve.ts` L33 (header) | `approve_bulk` MUST preserve this per-ID |
| Locked DOMPurify config `{ USE_PROFILES: { svg: true, svgFilters: true } }` lives in 4 mirror sites; Phase 178 introduces NO new sanitization sites | `approve.ts` L131-167, `svgValidator.js` Rule 4, `templateApplyService.js`, `TemplateDraftPreview.jsx` | Bulk approve calls existing `approve.ts` validator path per-ID |
| Snapshot-pinned model `claude-haiku-4-5-20251001` (Pitfall A2 + D-16) | `index.ts` L30 | Cost projections derived from this pricing |
| 300ms serial throttle is mandatory in any script driving Anthropic / S3 in a loop (Pitfall 3) | `eval-prompt-library.cjs` L249, `generate-template-thumbnails.cjs` | Never `Promise.all` over the row set |
| `@anthropic-ai/sdk` declared `^0.94.0` in package.json; live `npm view` returns 0.95.1 (verified 2026-05-09) | `package.json` + `npm view` `[VERIFIED: npm registry]` | Pinned EF specifier `npm:@anthropic-ai/sdk@0.95.0` (`generate.ts` L144) — Phase 178 keeps this |

### Phase 177 BL-Closure Trail (must-survive)

Phase 178 is additive. None of the BL-01..BL-06 closures may regress.

| ID | Closure | Phase 178 implication |
|----|---------|----------------------|
| BL-01 | `saveDraftSvgContent` now routes through EF `action=save_edit` with server-side `validateSvg` re-gate | Bulk approve does NOT touch save_edit; safe |
| BL-02 | `approve_draft_atomic` RPC wraps INSERT+UPDATE atomically | Bulk loop calls this RPC per-ID; atomicity preserved |
| BL-03 | `reject.ts` race guard `.in('status', ['pending', 'needs_human_review'])` (BL-NEW-02 widening) | `reject_bulk` MUST call existing `reject.ts` flow per-ID |
| BL-04 | `svgValidator` Rule 4 (CSS injection / `<style>`+`@import`+`url(…)`) closed | Net-new generated SVG passes Rule 4 because EF re-validates at approve |
| BL-06 | `pg_try_advisory_xact_lock(hashtext(draftId))` inside `approve_draft_atomic` | Bulk loop's per-ID call inherits this lock for free |
| BL-NEW-01 | RPC EXECUTE restricted to service_role only | Bulk EF handler MUST use service-role client (same pattern as `approve` action in `index.ts` L163-166) |
| BL-NEW-02 | reject race guard widened to `.in()` form | reject_bulk inherits this naturally |
| BL-NEW-03 | `App.jsx` showToast tolerant signature accepts both `({variant,message})` and `(message,type)` | New bulk-confirm modal must use the modern object form |
| BL-NEW-04 | EF CORS preflight (OPTIONS handler + `withCors()` wrapper) in `index.ts` | New `approve_bulk` / `reject_bulk` actions inherit this via the existing `withCors()` envelope |

### CLAUDE.md / Project Skills

**No `./CLAUDE.md` present** at repo root (verified 2026-05-09). No project-level skill directives override the standard agent contract.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **TCAT-01** | Active template catalog reaches ≥427 published templates (existing 127 + ≥300 net-new) | Seed script + bulk-approve flow drives net-new INSERTs through `approve_draft_atomic` RPC; Phase 178 backfill migration only updates existing-127 `vertical`, does NOT add rows. SQL count verifies post-Wave-3. |
| **TCAT-02** | Hero template types ship in both portrait and landscape | D-10 `orientation` parameter on `action=generate`; topic file's `orientation` field declares per-row; seed loop iterates through hero types (menu, promo, ambient, banner) generating both orientations |
| **TCAT-03** | Every net-new template passes `svgValidator` (6-rule gate); PNG thumbnail at `s3://bizscreen-media/thumbnails/system/` | Already enforced by Phase 177 Plans 02+03 — `validateSvg` runs at ingest (generate.ts L245) AND defense-in-depth at approve (approve.ts L154); rasterize+S3 PUT in approve.ts L173-179 |
| **TCAT-04** | `chk_svg_templates_category_enum` CHECK + `gallery_templates` VIEW continue to enforce taxonomy | `deriveCategoryFromDraft` (approve.ts L99-107) maps vertical → `'Restaurant'`/`'Retail'`/`'Healthcare'`/`'general'`; ALL net-new INSERTs satisfy CHECK trivially. VIEW is unchanged from Phase 176. Verified by Playwright gallery filter regression run. |
| **TVRT-01** | Restaurants ≥80 templates, ≥8 distinct types | ~120 attempts × ~75% pass rate × visual cull → ~80; topic file declares per-type distribution |
| **TVRT-02** | Retail ≥80 templates, ≥8 distinct types | Same pattern as TVRT-01 with retail-specific topics |
| **TVRT-03** | Healthcare ≥80 templates, ≥8 distinct types; includes niche types (waiting_room_ambient, emergency_alert) | Adds ≥4 niche types per D-11 expansion |
| **TVRT-04** | Every net-new template carries `vertical` tag | Seed script POSTs `vertical` in body to `action=generate`; persisted on `template_drafts.vertical`; copied to `svg_templates.vertical` by `approve_draft_atomic` RPC payload (already implemented — `approve.ts` L202) |
| **TVRT-05** | v20.0 15-category filter continues to filter correctly | Backfill UPDATE only touches `vertical` column; `category` column untouched. Playwright `template-gallery.spec.js` regression run confirms. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Topic-list authoring + reproducibility | Repo / Static | — | D-13 — `scripts/seedTopics.js` is the source of truth; PR-reviewable |
| Per-attempt prompt composition + LLM call + validator-at-ingest + retry | API / Edge Function | — | Lives in `generate.ts`; Phase 178 extends body schema with `orientation` only |
| Per-attempt rate limiting (300ms) + cost cap + resume | Node CLI / Script | — | `seed-vertical-templates.cjs` orchestrates; Pitfall 3 mandates serial throttle |
| Bulk approve / reject orchestration | API / Edge Function | Frontend (UI feed) | New `approve_bulk` / `reject_bulk` actions in `index.ts`; UI streams per-ID results |
| Per-ID atomic INSERT+UPDATE | Database / Storage | API (rasterize+S3) | `approve_draft_atomic` RPC unchanged from Phase 177; advisory lock per-draft |
| Filter chips + bulk-action toolbar + confirm modal | Frontend (Browser) | — | `AdminTemplateQueuePage` extension; flat list + filter chips (D-07) |
| Existing-127 vertical backfill | Database / Storage | — | One-shot atomic migration with DO-ASSERT (D-16); standard MCP `apply_migration` |
| Per-net-new-row vertical assignment | API (approve_draft_atomic payload) | — | Already implemented Phase 177 Plan 03 — `approve.ts` L202 plumbs `draft.vertical` into INSERT |

---

## Open Questions (Claude's Discretion) — Recommended Answers

These 7 points were explicitly delegated to research/planning by CONTEXT.md. The planner SHOULD adopt these recommendations unless tasks surface a contradicting constraint.

### Q1. `template_type` as column with CHECK vs free string in `metadata.template_type` (D-11)

**Recommendation:** **Keep `metadata.template_type` (status quo). Do NOT promote to a column.**

**Evidence:**
- `approve.ts` L208 currently writes `template_type` into `svg_templates.metadata.template_type`. Promoting would require changing this site + the JSONB payload contract for `approve_draft_atomic` + a new CHECK constraint + backfilling existing 127 rows' metadata→column. Net change: ~5 mutations across migrations + EF code.
- Phase 178's TVRT-01..03 SC verification works either way (`SELECT COUNT(DISTINCT metadata->>'template_type')` is one extra arrow — no SC change).
- v22.0 (TCAT-F2 vertical filter chip + TCAT-F5 orthogonal filter taxonomy) is an explicit deferred phase. If v22.0 needs a column for filter SQL, it can promote at that time with a `metadata->>'template_type'` → column migration. Promoting now spends Phase 178 budget on a v22.0 prerequisite.
- The Phase 176 metadata-JSONB-for-everything-non-enum pattern is consistent (`validator_failures`, `model_id`, `attempt_count`, `reviewed_by`, `reviewed_at` all live in `template_drafts.metadata`).

**Tradeoff acknowledged:** A column would give DB-level enforcement of the niche-type set (rejects typo'd `template_type` at INSERT). The seed script already validates `template_type` against the topic file's enum at load time (slug uniqueness check pattern), so the typo class is contained at authoring time — DB-level enforcement is defense-in-depth, not load-bearing.

**Files of evidence:** `approve.ts` L208, `176_template_drafts_and_vertical.sql` L62, `175_seed_100_templates_and_taxonomy.sql` L36-52.

### Q2. Cost cap mechanic (D-04)

**Recommendation:** **Soft warning at $15.00 spent + hard stop at $20.00 spent + per-attempt cost-trail print + final-cost summary.** Both thresholds CLI-flag overridable: `--cost-soft=15 --cost-hard=20`.

**Evidence:**
- Expected total spend per CONTEXT.md L108: ~$15.60 across ~390 calls. Hard cap of $20 leaves ~$4.40 of headroom — about 110 retries — which matches Pitfall A3's "max 2 retries per attempt" budget.
- Soft warning at $15 fires roughly when Wave 2 (Retail) is 60% complete — actionable mid-run signal.
- Per-call spend is computable from Anthropic response token counts (input + output) × Haiku pricing ($1/M input, $5/M output). Already done in `eval-prompt-library.cjs` for measurement; Phase 178 reuses the math.
- Hard stop short-circuits the loop with an `EXITCODE=2` distinct from crash exit codes (matches `eval-prompt-library.cjs` L323 precedent).

**Tradeoff acknowledged:** Soft cap is informational only; admin can override with `--cost-hard=30` if Wave 1 review shows the prompts need a re-spend on a smaller sub-vertical. Defaults preserve safety; flags preserve agency.

**Files of evidence:** `eval-prompt-library.cjs` L161 (per-call cost estimator), `STACK.md` Capability Area 1 (Haiku 4.5 pricing math), Pitfall A3 (PITFALLS.md L57-75).

### Q3. Concurrency model for `approve_bulk` / `reject_bulk` (D-05/D-06)

**Recommendation:** **Serial loop with 300ms inter-call delay. No `Promise.all`, no chunked parallel.**

**Evidence:**
- The per-ID approve flow involves: validateSvg (CPU + DOMParser instantiation) → resvg-wasm rasterize (~150-300ms wasm-bound) → S3 PUT (~200-400ms net-bound) → RPC (~50-150ms DB). At median ~700ms per ID, 50 IDs serial = ~35s — comfortably inside the EF 60s cap. 100 IDs = ~70s, which exceeds the cap and demands chunking on the FRONTEND, not concurrency in the EF.
- Anthropic + S3 rate limits cited in Pitfall 3 are the load-bearing reason: parallel chunks of 3 against `approve_bulk` would also fan out S3 writes 3× — fine for a single bulk call but pathological if the admin double-clicks Approve-selected (3 in-flight bulk calls × chunks of 3 = 9 parallel S3 writes).
- The advisory lock in `approve_draft_atomic` (`pg_try_advisory_xact_lock(hashtext(draftId))`) makes the RPC itself safe under concurrency, but the rasterize+S3 path before it has no equivalent gate.
- 300ms inter-call delay matches Pitfall 3 / `eval-prompt-library.cjs` L249 / `generate-template-thumbnails.cjs` precedent.

**Frontend chunking pattern:** When admin selects >50 drafts and clicks Approve-selected, the frontend MUST split into chunks of ≤50 and call `approve_bulk` sequentially with progress updates between chunks. The EF handler itself stays simple (one input list, serial inner loop, return per-ID results).

**Tradeoff acknowledged:** A bulk-approve of 100 drafts becomes a ~70s wait. The confirm-modal's per-draft execution feed (D-08) makes this acceptable — the admin sees streaming progress, not a frozen modal. Limited parallel (chunks of 3) would shave ~40s but introduce the rate-limit concerns above; the trade isn't worth it for Phase 178's volumes.

**Files of evidence:** `approve.ts` (full file), `s3.ts` (S3 PUT), `resvg-wasm-init.ts` (rasterize), Pitfall 3 (PITFALLS.md L382), `eval-prompt-library.cjs` L249.

### Q4. Idempotency on partial wave failure (D-03)

**Recommendation:** **Stateless `--resume-from <slug>` flag on `seed-vertical-templates.cjs`. The topic file's slug uniqueness is the natural restart anchor.**

**Evidence:**
- D-15 has the topic file declare `slug` per entry, and `svg_templates.slug` already has a unique constraint (Phase 175 ON CONFLICT (slug) DO NOTHING pattern in migration 175). Re-running the same topic produces an idempotent `template_drafts` insert (drafts are not slug-keyed) but the resulting svg_templates row WILL conflict with prior approval if it was approved.
- However: at SEED time (before approval), drafts ARE re-creatable. The risk is double-spending on Anthropic. `--resume-from <slug>` lets the operator skip already-attempted topics by their position in the topic list (e.g., `--resume-from healthcare-waiting-room-ambient-spa-blue-portrait`).
- Stateless restart is preferable to a checkpoint file because: (a) checkpoint files create another failure mode (corrupt checkpoint), (b) the topic file is the source of truth and the operator can edit it between waves anyway (D-03 wave-tuning), (c) the wave artifact `178-WAVE-N-RUN.md` already records which slugs landed — operator reads the artifact to find the resume point.

**Alternative considered:** `--checkpoint-file <path>` with explicit JSON state. **Rejected** — adds a second source of truth (topic file vs checkpoint); operator confusion likely after a wave-1.5 prompt re-tune; adds a code surface that needs its own integration test.

**Tradeoff acknowledged:** If the seed dies mid-attempt (e.g., process killed during S3 PUT, leaving a draft INSERTed but no approve), `--resume-from` will re-attempt that topic and insert a duplicate draft. Acceptable: the duplicate is in `pending` status, and the bulk-approve UX surfaces all pending drafts; the admin reviewing Wave 1 will see (and reject) the dupe. Cheap to recover.

**Files of evidence:** D-15 (CONTEXT.md L80), `175_seed_100_templates_and_taxonomy.sql` ON CONFLICT pattern, `eval-prompt-library.cjs` argv parsing pattern.

### Q5. Parity-test extension for the larger ~24-entry promptLibrary.js + prompts.json (D-09)

**Recommendation:** **Keep the manual edit-both pattern (Phase 177 D-08). Do NOT introduce a build step.**

**Evidence:**
- `tests/integration/promptLibraryParity.test.js` (33 LOC, vitest) already enforces deep-equal between `promptLibrary.js` and `prompts.json`. At 6 entries, it's already mature; at 24 entries it works identically — `expect(promptLibrary).toEqual(promptsJson)` cares about array length proportionally, not entry count.
- A build step (single-source-of-truth `promptLibrary.ts` → emit `prompts.json` via codegen) introduces: (a) a new build-time dependency / npm script, (b) a CI gate to verify the generated file is in sync, (c) developer cognitive overhead ("which file do I edit?"). The current pattern is already cognitively clear ("edit BOTH files; vitest catches drift" — comment in `promptLibrary.js` L7-8).
- The expansion cadence is Phase 178 only. Future per-vertical expansions are v22.0+ scope. The edit-cadence cost is real but small (~24 entries authored once, ~24 entries reviewed once).

**Alternative considered:** Phase 178 could move to a JSON-only single-source with a tiny `.cjs` wrapper for the `import { promptLibrary }` Node path. **Rejected** — `promptLibrary.js` is currently a clean ESM export; moving to a wrapper trades clarity for tool-chain complexity. The eval harness already loads `prompts.json` directly via JSON parse (L93 of `eval-prompt-library.cjs`) — that path is already the single source of truth at runtime.

**Tradeoff acknowledged:** A single typo in one file vs the other ships the test as RED. Author iteratively (write 4 entries → run parity test → write 4 more) to keep the diff inspectable.

**Files of evidence:** `tests/integration/promptLibraryParity.test.js` (full file), `promptLibrary.js` L1-9, `eval-prompt-library.cjs` L86-93.

### Q6. Per-archetype distribution per vertical (D-09 + TVRT-01..03)

**Recommendation:** **Hero-weighted distribution with ≥4-per-type minimum, driven by topic-file row counts.**

**Evidence:**
- TVRT-01..03 require ≥80 templates × ≥8 distinct types per vertical. Even distribution = 10/type × 8 = 80, no headroom for rejection.
- Hero-weighted distribution (e.g., Restaurants: 15 menu boards, 12 promo, 10 announcement, 8 reminder, 8 wayfinding, 8 health_tip, 6 daypart_menu, 5 drive_thru = 72 + 25% over-generation buffer = 90 attempts) lands solidly above the 80-row floor with type concentration on the hero types that drive catalog impressions.
- The 4-per-type minimum guards against the "≥8 distinct types" SC failing if rejection rate is uneven — even if 50% of `wayfinding` attempts are rejected, 4 survives.
- Topic-file row counts ARE the distribution. The topic file is where this decision concretely lives (D-13 / D-15). A 90-row Restaurants topic file declares the distribution.

**Concrete distribution suggestion (planner may revise):**

| Vertical | menu | promo | announcement | reminder | wayfinding | health_tip | niche (drive_thru/daypart/etc) | TOTAL attempts |
|----------|------|-------|--------------|----------|------------|------------|-------------------------------|----------------|
| Restaurants | 18 | 14 | 10 | 8 | 8 | 6 | 14 (drive_thru, daypart_menu) | ~78 → +25% buffer = ~98 attempts |
| Retail | 16 | 18 | 12 | 8 | 10 | 6 | 8 (queue_status) | ~78 → ~98 |
| Healthcare | 8 | 10 | 12 | 16 | 8 | 14 | 14 (waiting_room_ambient, emergency_alert, vaccination_reminder) | ~82 → ~102 |

Total: ~300 attempts across 3 verticals + ~30 cross-vertical buffer = ~330. Cost ≈ $13.20 at $0.04/template — comfortably inside the $20 hard cap.

**Tradeoff acknowledged:** Hero-weighted means `health_tip` in Restaurants has only 6 attempts → if 33% are rejected, only 4 survive → SC bar exactly. Planner may add 2 buffer attempts to the lowest-count types per vertical (≥6 attempts per type minimum) for tighter safety margin.

**Files of evidence:** TVRT-01..03 (REQUIREMENTS.md L23-25), D-04 over-generation rationale (CONTEXT.md L52).

### Q7. Bulk-action audit trail shape (D-08)

**Recommendation:** **Reuse per-draft `metadata.reviewed_by` / `metadata.reviewed_at` (existing Phase 177 pattern, just iterated). Do NOT add a `template_bulk_audit` table.**

**Evidence:**
- The bulk-action context is recoverable by querying `template_drafts.metadata->>'reviewed_at'` clusters on the same `metadata->>'reviewed_by'` (e.g., 47 drafts approved within a 30-second window by the same reviewer = a bulk-approve session).
- A new table adds: (a) a migration, (b) RLS policy duplication, (c) a new query path for any future audit tooling. Phase 178 has no first-party use case for the bulk-cluster audit beyond debug post-mortems, which the cluster query handles fine.
- The Phase 177 audit pattern already handles the "approve via Edit modal" case (per-draft metadata) — extending to bulk preserves uniformity.

**Alternative considered:** A `template_bulk_audit(id, reviewer_uid, action, draft_count, reason, created_at)` table for clean SQL grouping. **Rejected** — Phase 178 ships nothing that consumes bulk-audit aggregates; defer the table until v22.0 / TCAT-F4 (admin publish/unpublish) actually needs it.

**Tradeoff acknowledged:** Reconstructing a bulk session from per-draft metadata requires a 30-second-window cluster query — slightly heavier than `SELECT * FROM template_bulk_audit`. Acceptable for the current investment level.

**Files of evidence:** `approve.ts` L211-215 (existing audit metadata patch), `reject.ts` L72-76 (existing reject audit shape), Phase 177 D-07 audit pattern.

---

## Implementation Approach

### Database / Migration

**One migration: `supabase/migrations/178_backfill_existing_127_vertical.sql`** (~50 LOC including DO-ASSERT). Pattern: 175/176/177 idempotent atomic-migration.

**Shape:**
```sql
-- Pre-state assertion (optional but matches 176 pattern):
DO $$ DECLARE v_pre INT; BEGIN
  SELECT COUNT(*) INTO v_pre FROM svg_templates WHERE vertical IS NOT NULL;
  ASSERT v_pre = 0, format('178: expected 0 vertical-tagged rows pre-backfill, got %s', v_pre);
END $$;

-- Backfill:
UPDATE svg_templates SET vertical = 'restaurants' WHERE category = 'Restaurant' AND vertical IS NULL;
UPDATE svg_templates SET vertical = 'retail'      WHERE category = 'Retail'     AND vertical IS NULL;
UPDATE svg_templates SET vertical = 'healthcare'  WHERE category = 'Healthcare' AND vertical IS NULL;
-- All other categories (Corporate, Hospitality, etc.) stay NULL per D-16

-- Post-state assertion:
DO $$ DECLARE v_rest INT; v_ret INT; v_hc INT; BEGIN
  SELECT COUNT(*) INTO v_rest FROM svg_templates WHERE vertical='restaurants' AND category='Restaurant';
  SELECT COUNT(*) INTO v_ret  FROM svg_templates WHERE vertical='retail'      AND category='Retail';
  SELECT COUNT(*) INTO v_hc   FROM svg_templates WHERE vertical='healthcare'  AND category='Healthcare';
  ASSERT v_rest > 0 AND v_ret > 0 AND v_hc > 0,
    format('178: backfill produced 0 rows for at least one vertical (rest=%s ret=%s hc=%s)', v_rest, v_ret, v_hc);
END $$;
```

**No DOWN migration** (matches Phase 176/177 convention). Migration lands BEFORE Wave 1 runs (so the wave-1 verification queries see existing-127 contributions counted toward the ≥80 vertical floor).

**Apply via:** Standard MCP `apply_migration` (small migration, no Mgmt API direct call needed — diverges from Phase 175).

### Edge Function Extensions

**Three changes in `supabase/functions/generate-svg-template/`:**

#### 1. `handlers/generate.ts` — extend body schema with `orientation`

| Site | Change |
|------|--------|
| `GenerateBody` interface (L48-53) | Add `orientation?: 'landscape' \| 'portrait'` (default landscape if undefined) |
| `pickPrompt()` (L83-92) | Unchanged — `orientation` is a runtime prompt-assembly concern, NOT a library lookup key |
| System-prompt assembly (around L189-190) | After `const systemPrompt = promptEntry.system_prompt;`, add: `const finalSystemPrompt = orientation === 'portrait' ? swapViewBoxAndAppendPortraitGuidance(systemPrompt) : systemPrompt;` |

**`swapViewBoxAndAppendPortraitGuidance()`** (new helper):
- Replace `viewBox="0 0 1920 1080"` → `viewBox="0 0 1080 1920"` in the system prompt text (string replace; promptLibrary entries are authored with the landscape literal).
- Append a `\n\nPORTRAIT-SPECIFIC GUIDANCE:\n- Layout vertically (header at top, content stacked, footer at bottom)\n- Use full canvas height; avoid wide horizontal arrangements\n- Hero text remains the largest element; sub-elements stack below\n` block.

**Locked source-order awk gate impact:** None. The validator-at-ingest contract is `validateSvg(svg, ...)` BEFORE INSERT (`generate.ts` L245). Adding portrait/landscape upstream of the LLM call doesn't touch that gate.

**Test coverage:** Extend `tests/integration/generateSvgTemplate.test.js` with two cases — `orientation: 'landscape'` (default) produces 1920×1080 viewBox; `orientation: 'portrait'` produces 1080×1920 viewBox. Mock Anthropic SDK to assert the system prompt passed in includes the swapped viewBox literal.

#### 2. `handlers/approve_bulk.ts` (NEW) — loops `approve` per-ID serially

**Shape (~80 LOC):**
```typescript
export async function approveBulk(
  body: { draftIds: string[], reviewerUid: string },
  supabase: any,
): Promise<{ ok: true, results: Array<{ draftId: string, ok: boolean, error?: string, thumbnail_url?: string, svg_template_id?: string }> }> {

  // Hard cap to prevent EF timeout (60s) — frontend MUST chunk above this.
  if (body.draftIds.length > 50) {
    throw new Response(
      JSON.stringify({ error: `approve_bulk supports max 50 drafts per call; got ${body.draftIds.length}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const results: Array<{ draftId: string, ok: boolean, error?: string, ... }> = [];

  for (const draftId of body.draftIds) {
    try {
      const r = await approve({ draftId, reviewerUid: body.reviewerUid }, supabase);
      results.push({ draftId, ok: true, thumbnail_url: r.thumbnail_url, svg_template_id: r.svg_template_id });
    } catch (e) {
      const msg = (e instanceof Response) ? `HTTP ${e.status}` : (e instanceof Error ? e.message : String(e));
      results.push({ draftId, ok: false, error: msg });
    }
    // Pitfall 3 — 300ms inter-call delay
    if (draftId !== body.draftIds.at(-1)) await new Promise(r => setTimeout(r, 300));
  }
  return { ok: true, results };
}
```

**Critical contract:** Each iteration calls the SAME `approve(...)` function from `./approve.ts`. NO logic duplication. Defense-in-depth re-validation, atomic RPC, advisory lock, idempotency short-circuit, source-order awk gate — all preserved per-ID.

**Why max 50:** At median ~700ms/ID + 300ms delay = ~1s/ID. 50 IDs ≈ 50s. EF runtime cap is 60s (Supabase default; some plans allow 150s for paid tiers — verify before raising). Frontend chunks larger selections.

#### 3. `handlers/reject_bulk.ts` (NEW) — symmetric to approve_bulk

**Shape (~50 LOC):** Same skeleton as `approve_bulk`, but loops `reject(...)` instead. Signature: `{ draftIds: string[], reviewerUid: string, reason?: string }`. The `reason` is applied to ALL drafts in the call (D-06).

**Inner per-ID call:** `await reject({ draftId, reason: body.reason, reviewerUid: body.reviewerUid }, supabase)`.

**No timeout concern:** Reject is a single UPDATE (~50ms each) — 50 IDs × 50ms = 2.5s, well inside the EF cap.

#### 4. `index.ts` — action routing

Add to the `try` dispatcher (around `index.ts` L190 alongside `if (body.action === "reject")`):

```typescript
if (body.action === "approve_bulk") {
  const supabaseSr = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user } } = await supabase.auth.getUser();
  return withCors(Response.json(
    await approveBulk({ draftIds: body.draftIds, reviewerUid: user!.id }, supabaseSr),
  ));
}

if (body.action === "reject_bulk") {
  const supabaseSr = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user } } = await supabase.auth.getUser();
  return withCors(Response.json(
    await rejectBulk({ draftIds: body.draftIds, reviewerUid: user!.id, reason: body.reason }, supabaseSr),
  ));
}
```

**Auth + RLS:** The existing admin gate at `index.ts` L73-75 (`is_admin() OR is_super_admin()`) already protects ALL actions. The service-role client used inside the bulk handlers bypasses RLS for the cross-table mutations (same pattern as the per-row `approve` action — `index.ts` L163-166).

**CORS:** Both new actions inherit `withCors()` automatically from the dispatcher envelope (BL-NEW-04).

### Frontend Changes

**Two component-level changes + service additions:**

#### 1. `src/services/aiTemplate/templateDraftsService.js` (additions)

```javascript
export async function bulkApproveDrafts(draftIds) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'approve_bulk', draftIds },
  });
  if (error) throw error;
  return data;  // { ok: true, results: [...] }
}

export async function bulkRejectDrafts(draftIds, reason) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'reject_bulk', draftIds, reason: reason ?? null },
  });
  if (error) throw error;
  return data;
}
```

Also extend `generateDraft` signature: `{ vertical, template_type, orientation, prompt }` (L33).

#### 2. `src/pages/Admin/AdminTemplateQueuePage.jsx` (Pending tab + Generate tab extensions)

**Pending tab additions:**
- **Filter chip row** above the drafts table: vertical chip set (`Restaurants` / `Retail` / `Healthcare` / `Cross`) + template_type chip set (the expanded ~10 enum) + status chip set (`Pending` / `Needs review`). Filter logic is client-side over the already-fetched `drafts[]` array (no API change). Reuses v20.0 `src/components/gallery/FilterChips` precedent if exists; otherwise a simple `useMemo` filter.
- **Row checkbox column** (leftmost). Selection state: `useState(new Set())` of draftIds. "Select all visible" header checkbox.
- **Bulk-action toolbar** above the table (visible when ≥1 draft selected): selection count + "Approve selected" button + "Reject selected" button + optional `<input>` for shared rejection reason.
- **Confirm modal** triggered by either bulk-action button. Shape per D-08:
  - Header: "Approve 47 drafts?" (or "Reject 47 drafts?")
  - Body shows first 5 draft names: "Modern Bistro Daily Special", "..." + `…and 42 more`
  - Confirm button fires `bulkApproveDrafts(selectedIds)` / `bulkRejectDrafts(selectedIds, reason)`
  - On API response, modal switches to **streaming-results view**: appends `✓ <slug>` / `✗ <slug> — <error>` rows as the response comes back. (Note: the EF returns the full results array at once after ~30-50s; the streaming UX is therefore "immediately render all rows once response arrives" rather than per-event SSE. If genuinely incremental rendering is desired, the planner can decide whether to chunk on the frontend by calling `bulkApproveDrafts` with N=10 chunks and updating the modal between chunks.)
  - Final summary: "Approved 45, 2 failed (see errors below)"
  - Failed drafts stay in `pending` (per existing approve handler — `approve.ts` L160-167 422 response leaves status untouched).
  - Modal close triggers `loadDrafts()` to refresh the Pending tab.

**Generate tab additions:**
- **Orientation dropdown** (between vertical and template_type): `Landscape` (default) / `Portrait`. Maps to `body.orientation` in the EF call.
- **Vertical-filtered template_type dropdown:** the template_type options narrow based on the selected vertical. Mapping table lives in promptLibrary.js as a derived helper (or a new sibling export `templateTypesPerVertical`).

**Suggested helper shape:**
```javascript
// promptLibrary.js — appended after the array
export const templateTypesPerVertical = {
  null:           ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip'],
  restaurants:    ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'daypart_menu', 'drive_thru'],
  retail:         ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'queue_status'],
  healthcare:     ['reminder', 'announcement', 'health_tip', 'wayfinding', 'waiting_room_ambient', 'emergency_alert', 'vaccination_reminder'],
};
```

This is data, not logic — so it's safe to colocate with the parity-locked promptLibrary.

#### 3. Loading + busy state

When `bulkApproveDrafts` is in flight, ALL Approve/Reject buttons (single-row + bulk) disable. The existing `busyDraftId` state (currently scalar) needs a `bulkInFlight: boolean` companion. Confirm modal exposes its own per-draft-row loading state for the streaming feed.

### Seed Script + Topic File

#### `scripts/seed-vertical-templates.cjs` (~250-350 LOC)

**Skeleton reuses `eval-prompt-library.cjs`:**
- Same dotenv loading pattern (L42-43)
- Same Anthropic SDK + jsdom validator + tool-use schema scaffolding
- **DIFFERENT:** Calls Supabase Edge Function via `supabase.functions.invoke('generate-svg-template', { body: { action: 'generate', ... } })` instead of direct Anthropic SDK (D-02 closure — "what we ship is what we test")

**Service-role Supabase client setup:** Mirror `generate-template-thumbnails.cjs` env-loading pattern (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

**CLI flags (recommended):**
```
--vertical=<restaurants|retail|healthcare>   Required — wave selector
--cost-soft=15                                Soft warning threshold (USD)
--cost-hard=20                                Hard stop threshold (USD)
--resume-from=<slug>                          Skip topics until this slug is reached
--limit=N                                     Cap attempts at N (smoke testing)
--dry-run                                     Skip the EF call; just validate topic file
--out-artifact=.planning/phases/178-vertical-content-seeding/178-WAVE-{vertical}-RUN.md
                                              Where to write the wave-run log
--verbose                                     Per-attempt log lines
```

**Control flow:**
```
1. Load topic file; filter by --vertical
2. If --resume-from: skip until slug matches
3. For each topic in filtered list:
   a. Compose freeform prompt: `${topic.topic}. Palette: ${topic.palette}. Vibe: ${topic.vibe}. Layout: ${topic.layout}.`
   b. Call EF: invoke('generate-svg-template', { body: { action: 'generate', vertical, template_type, orientation, prompt }})
   c. Capture { draftId, status, attempt_count, warnings } from response
   d. Append per-attempt row to artifact (timestamp, slug, draftId, status, attempts, cost-est)
   e. Track running cost; abort if > --cost-hard
   f. Pitfall 3: 300ms delay before next iteration
4. Write summary block to artifact: total_attempts, validator_pass_rate, total_cost, time_elapsed
```

**Wave artifact `178-WAVE-{vertical}-RUN.md` shape (locked by CONTEXT.md L110):**
```markdown
# Wave {N}: {Vertical} — Run Log

**Run:** 2026-05-{date}T{time}Z
**Attempts:** {N}
**Validator pass rate:** {%}
**Total cost:** ${X.XX}
**Time elapsed:** {min}

## Per-attempt detail

| # | Slug | template_type | orientation | draftId | status | attempts | cost_est |
|---|------|---------------|-------------|---------|--------|----------|----------|
| 1 | bistro-daily-special-sunset-warm-amber-landscape | menu | landscape | uuid | pending | 1 | $0.0105 |
| ... |

## Qualitative review notes

- {free-form notes after the operator reviews the resulting drafts in the queue UI}
- Promptlib refinements applied between this wave and Wave N+1: {…}
```

#### `scripts/seedTopics.js` (~390 records, ~600-1000 LOC depending on per-record verbosity)

**Per-record shape (per D-15, fully verbatim from CONTEXT.md L80):**
```javascript
{
  slug: 'bistro-daily-special-sunset-warm-amber-landscape',
  name: 'Sunset Bistro Daily Special',
  description: 'Warm-amber bistro daily-special card with chef-recommendation accent stripe',
  tags: ['restaurant', 'bistro', 'daily', 'special', 'warm-amber'],
  topic: 'Promote a Sunday evening bistro daily special featuring grilled salmon and seasonal sides',
  palette: 'warm-amber',
  vibe: 'casual-bistro',
  layout: 'left-aligned-with-divider',
  vertical: 'restaurants',
  template_type: 'menu',
  orientation: 'landscape',
}
```

**Authoring approach:** Claude-assisted batch generation of topic records, then human-edited in a single focused session. The file is the work asset of Phase 178 — it survives as canonical "what does a good <vertical> <template_type> look like?" reference.

**Validation at file-load time (in seed script):**
- Slug uniqueness assert
- vertical ∈ {restaurants, retail, healthcare} (NOT cross-vertical — those are admin-UI generate-tab only)
- template_type ∈ allowed set per vertical (matches `templateTypesPerVertical`)
- orientation ∈ {landscape, portrait}

### promptLibrary Expansion (6 → ~24 entries)

**Strategy:** PER-(template_type × vertical) entries with `vertical` set to one of `restaurants|retail|healthcare`. Shape unchanged from Phase 177:
```javascript
{
  id: 'menu-restaurants-v1',
  template_type: 'menu',
  vertical: 'restaurants',
  label: 'Menu / daypart menu (Restaurants & QSR)',
  example_freeform: '...',
  system_prompt: '<base menu rules + RESTAURANTS-SPECIFIC GUIDANCE: full menu board layout, ...>',
}
```

**Fallback mechanism preserved:** `pickPrompt()` in `generate.ts` L83-92 already does exact-match-then-vertical-null. With ~24 entries:
- Exact match: `(menu, restaurants)` → `menu-restaurants-v1`
- No exact match (e.g., `(menu, null)` for cross-vertical): falls back to `menu-cross-vertical-v1`
- No match at all: throws (signals topic-file authoring error)

**Approximate final entry count:**
- 6 cross-vertical (existing — DO NOT modify)
- 6 base types × 3 verticals = 18 per-vertical entries
- 4 niche types (drive_thru, queue_status, waiting_room_ambient, emergency_alert), each pinned to its specific vertical = 4 entries

Total: 6 + 18 + 4 = **28 entries** (slightly above CONTEXT.md's "~20-26" estimate; planner may consolidate by skipping low-value cells, e.g., `(health_tip, retail)` if not represented in the topic file).

**Orientation handling:** promptLibrary entries stay orientation-AGNOSTIC. The EF's `swapViewBoxAndAppendPortraitGuidance()` injects portrait-specific text at call time (D-10). One library entry serves both orientations — saves authoring effort + parity-test surface.

**PORTRAIT-SPECIFIC GUIDANCE block (shared, injected by EF):**
```
PORTRAIT-SPECIFIC GUIDANCE:
- Layout vertically: header at top, content stacked, footer at bottom
- Use full canvas height (1920); avoid wide horizontal arrangements
- Hero text remains the largest element; sub-elements stack below
- Maintain at least 80px top/bottom margins for kiosk-mount viewing
```

**Parity test:** Already enforced by `tests/integration/promptLibraryParity.test.js`. The test currently asserts ≥6 entries with the 6-base-type set; Phase 178 must update this to assert ≥18 entries (or the precise final count) covering ≥3 verticals × ≥6 base types. NEW assertion: every entry's `template_type` × `vertical` combination is unique (no duplicate keys).

### Verification + Wave Artifacts

**Per-wave artifacts** (D-03 / CONTEXT.md L110): `178-WAVE-{vertical}-RUN.md` (3 files: Restaurants, Retail, Healthcare). Each ~150-300 LOC. Committed alongside the wave's git activity.

**SC verification queries:**

```sql
-- TVRT-01 (restaurants)
SELECT COUNT(*) FROM svg_templates WHERE vertical='restaurants' AND is_active=TRUE;  -- expect ≥80
SELECT COUNT(DISTINCT metadata->>'template_type') FROM svg_templates WHERE vertical='restaurants' AND is_active=TRUE;  -- expect ≥8
SELECT DISTINCT orientation FROM svg_templates WHERE vertical='restaurants' AND is_active=TRUE
  AND metadata->>'template_type' IN ('menu','daypart_menu');  -- expect both 'landscape' and 'portrait'

-- TVRT-02 (retail) — same shape
-- TVRT-03 (healthcare) — same shape

-- TCAT-01
SELECT COUNT(*) FROM gallery_templates WHERE is_active=TRUE;  -- expect ≥427

-- TCAT-04
SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name='chk_svg_templates_category_enum';  -- expect 1 (untouched)
```

**Validator script (TCAT-03):** Run `svgValidator` against ALL net-new svg_content. Reuses the existing CLI from Phase 175 Plan 02 (`scripts/validate-templates.cjs` if it exists; otherwise a thin wrapper around `validateSvg` that takes a vertical filter). Phase 178 is allowed to ASSUME this is already operational — Phase 175 SC verification proved it. Re-run as `node scripts/validate-templates.cjs --vertical=restaurants,retail,healthcare --since=2026-05-09` (post-Phase 178 timestamp filter).

**S3 thumbnail audit (TCAT-03):** SQL query `SELECT id, slug, thumbnail FROM svg_templates WHERE vertical IS NOT NULL AND is_active=TRUE` → for each, HEAD `s3://bizscreen-media/<thumbnail-path>` to confirm 200. Reuses existing AWS SDK setup; can be a shell-script harness over `aws s3api head-object`.

**Playwright gallery filter regression run (TCAT-04 / TVRT-05):** Re-run the existing v20.0 spec `tests/e2e/template-gallery.spec.js` (or equivalent — verify with planner). Assert ≥90% green. No new spec needed for this SC.

---

## Validation Architecture

> Phase 178 is in v21.0 active scope; treat Nyquist validation as enabled. (`.planning/config.json` does NOT explicitly disable.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4 (unit + integration) + Playwright (E2E) |
| Config files | `vitest.config.js`, `playwright.config.js` |
| Quick run command | `npx vitest run tests/integration/<file>` |
| Full suite command | `npm test` (vitest) + `npx playwright test` |
| Phase gate | Full suite green before `/gsd-verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TCAT-01 | ≥427 published templates post-seed | integration (SQL count) | `node scripts/verify-178-counts.cjs` | ❌ Wave 0 (new harness) |
| TCAT-02 | Hero types in both orientations | integration (SQL distinct orientation per type) | included in `verify-178-counts.cjs` | ❌ Wave 0 |
| TCAT-03 | Every net-new passes svgValidator | integration (validator CLI re-run) | `node scripts/validate-templates.cjs --since=...` | ✅ Phase 175 |
| TCAT-03 | Every net-new has S3 thumbnail | integration (S3 HEAD audit) | included in `verify-178-counts.cjs` | ❌ Wave 0 |
| TCAT-04 | CHECK constraint untouched | integration (SQL information_schema query) | included in `verify-178-counts.cjs` | ❌ Wave 0 |
| TVRT-01 | Restaurants ≥80 + ≥8 types | integration (SQL count + DISTINCT) | `verify-178-counts.cjs` | ❌ Wave 0 |
| TVRT-02 | Retail ≥80 + ≥8 types | integration (SQL count + DISTINCT) | `verify-178-counts.cjs` | ❌ Wave 0 |
| TVRT-03 | Healthcare ≥80 + ≥8 types | integration (SQL count + DISTINCT) | `verify-178-counts.cjs` | ❌ Wave 0 |
| TVRT-04 | All net-new have vertical tag | integration (SQL filter) | `verify-178-counts.cjs` | ❌ Wave 0 |
| TVRT-05 | v20.0 category filter regression | E2E (Playwright re-run) | `npx playwright test tests/e2e/template-gallery.spec.js` | ✅ Phase 171 |
| BL-178-01 | EF action=generate accepts orientation; portrait viewBox swap fires | unit (vitest, mocked Anthropic) | `npx vitest run tests/unit/generateOrientation.test.js` | ❌ Wave 0 |
| BL-178-02 | EF action=approve_bulk loops approve serially with 300ms delay | integration (vitest + mock supabase) | `npx vitest run tests/integration/approveBulk.test.js` | ❌ Wave 0 |
| BL-178-03 | EF action=reject_bulk loops reject serially | integration | `npx vitest run tests/integration/rejectBulk.test.js` | ❌ Wave 0 |
| BL-178-04 | promptLibrary parity holds at ~24 entries | integration | `npx vitest run tests/integration/promptLibraryParity.test.js` | ✅ Phase 177 (extends count assertion) |
| BL-178-05 | AdminTemplateQueuePage filter chips + bulk toolbar | E2E (Playwright) | `npx playwright test tests/e2e/admin-template-queue.spec.js` | ✅ Phase 177 (extends spec) |
| BL-178-06 | Confirm modal renders count + first-5 names + per-draft feed | E2E (Playwright) | included in `admin-template-queue.spec.js` extension | ✅ Phase 177 (extends) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/integration/<changed-file>.test.js` (~5-30s)
- **Per wave merge:** `npm test` + `npx playwright test --grep "@phase178"` (~3-5min)
- **Phase gate:** Full vitest suite green + Playwright `template-gallery.spec.js` + `admin-template-queue.spec.js` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/generateOrientation.test.js` — covers BL-178-01 (mocks Anthropic, asserts portrait viewBox in system prompt)
- [ ] `tests/integration/approveBulk.test.js` — covers BL-178-02 (mocks supabase, asserts 50-cap, 300ms delay observable, per-ID error isolation)
- [ ] `tests/integration/rejectBulk.test.js` — covers BL-178-03 (mocks supabase, asserts shared reason applied per-ID)
- [ ] `scripts/verify-178-counts.cjs` — verification harness for TVRT-01..04 + TCAT-01..04 SC counts; runs as part of phase gate
- [ ] Playwright spec extension in `tests/e2e/admin-template-queue.spec.js` — bulk-select, bulk-approve confirm modal flow, filter-chip behavior

---

## Security Domain

> `security_enforcement` not explicitly disabled in config; treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing JWT-scoped client + `is_admin()` / `is_super_admin()` RPC at EF entry (`index.ts` L73-75); inherited by `approve_bulk` / `reject_bulk` |
| V3 Session Management | no | Phase 178 introduces no new session surface |
| V4 Access Control | yes | RLS policy `template_drafts_admin_only` (Phase 176) + EF service-role client only after admin gate (matches per-row precedent in `index.ts` L163-166); BL-NEW-01 RPC EXECUTE boundary preserved |
| V5 Input Validation | yes | `validateSvg` runs at ingest (generate.ts L245) AND defense-in-depth at approve (approve.ts L154); body schema validation per action |
| V6 Cryptography | no | No new crypto — reuses existing AWS SDK signing for S3 PUT |

### Known Threat Patterns for Phase 178

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bulk approve enables admin to publish 50 drafts in one click — magnifies any single-draft validation gap into a 50× exposure | Tampering / EoP | Per-ID `validateSvg` re-gate inside `approve.ts` (called by `approve_bulk`) means each draft hits the SAME defense-in-depth path; volume does not bypass validation |
| `reject_bulk` shared-reason field is admin-supplied free text → stored in `metadata.rejected_reason` → could include script tags or malicious content if ever rendered to a non-admin surface | Tampering | Reason text is admin-only (RLS gates `template_drafts` reads to admin); never rendered to end users; stored as-is per Phase 177 pattern. If ever exposed in a future audit dashboard, sanitize at render time. |
| Bulk approve with 100+ drafts can exceed EF 60s runtime → partial completion → admin re-clicks → race against in-flight RPC | DoS / data integrity | Backend hard-cap of 50 per call; advisory lock in `approve_draft_atomic` (BL-06 closure) makes concurrent re-clicks safe (returns `concurrent_approve_in_progress` 409); idempotency short-circuit returns existing thumbnail_url for re-attempted approved drafts |
| Anthropic + S3 rate limit cascade if bulk approve runs while seed script also runs | DoS | Document operator runbook: do NOT run seed waves and bulk-approve simultaneously; in practice the wave-by-wave cadence (D-03) makes them sequential anyway |
| Topic file slug collision with existing svg_templates.slug → seed script's draft INSERT succeeds but later approve fails on UNIQUE | Data integrity | Topic file load-time validation: cross-check against existing `svg_templates.slug` SELECT before starting wave; abort if collision |
| Service-role secret leak in seed script logs (esp. wave artifacts) | Information disclosure | Seed script must NEVER log the service-role key value; use `process.env` directly without echoing; lint check via `grep -rn "SUPABASE_SERVICE_ROLE_KEY" scripts/seed-vertical-templates.cjs` returns ONLY the read site |
| Cross-vertical template_type bleed (e.g., `(emergency_alert, restaurants)` selected via Generate-tab UI bug) | Tampering | `templateTypesPerVertical` mapping enforced client-side; EF's `pickPrompt()` lookup falls back to `vertical=null` if exact match missing — no SVG is generated against a wrong-vertical prompt; topic-file load-time validation catches authoring errors |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-ID atomic approve | Custom INSERT-then-UPDATE in approve_bulk handler | `approve_draft_atomic` RPC (Phase 177) | Already wraps INSERT+UPDATE in single transaction with advisory lock; BL-02/BL-06 closure depends on this |
| 300ms throttle | Custom rate-limiter inside the bulk handler | Plain `await new Promise(r => setTimeout(r, 300))` between iterations | Pitfall 3 + eval-prompt-library.cjs precedent |
| LLM SVG validation | Custom regex / manual XML parse | `validateSvg` (svgValidator.js) called inside EF generate.ts and approve.ts | 6-rule gate already battle-tested across Phases 173/175/176/177; locked DOMPurify config preserved |
| SVG-to-PNG rasterization | Custom Resvg invocation in bulk handler | `rasterize` from `resvg-wasm-init.ts` (called inside `approve.ts`) | Already wired, pinned (`@resvg/resvg-wasm@^2.6.2`), tested |
| S3 PUT | Custom presign + fetch | `uploadPng` from `s3.ts` (Phase 177 Plan 03 B3 — direct AWS SDK, no presign) | Production presign route doesn't exist (vercel.json routes /api/* → /index.html) |
| Bulk audit table | New `template_bulk_audit` schema + RLS | Reuse per-draft `metadata.reviewed_by`/`reviewed_at` cluster | Q7 recommendation — no Phase 178 use case for the table |
| Topic-file checkpoint | Stateful checkpoint JSON | Stateless `--resume-from <slug>` (Q4) | One source of truth; survives prompt re-tunes |
| Anthropic Batch API | Adopt Batch API for 50% cost | Pay full price; use serial generate loop | D-02 — per-attempt validator-feedback loop is load-bearing; doesn't fit Batch's async fire-and-collect |
| Promotion of `template_type` to column | New CHECK column + backfill migration | Keep in `metadata.template_type` (Q1) | v22.0 territory; Phase 178 SC verification works either way |

**Key insight:** Phase 178 is a CONTENT phase, not an infrastructure phase. Almost everything is wired up — Phase 178 either calls existing APIs or extends one body field. The DON'T-HAND-ROLL list above is dominated by "use the Phase 177 closure trail; do not parallel it."

---

## Common Pitfalls

### Pitfall 1: Bulk approve EF timeout on 50+ drafts

**What goes wrong:** Admin selects 75 drafts, clicks Approve-selected, EF runs 50 successfully then times out at 60s. Frontend shows partial results (50 ok), but UI state is confused — the remaining 25 are still in `pending` (correct) but the admin doesn't know whether the timeout was their fault or a transient issue.

**Why it happens:** Per-ID approve median ~700ms + 300ms delay = 1s/ID. 60s EF cap = ~50 ID limit before any safety margin.

**How to avoid:**
- Backend hard-cap of 50 per `approve_bulk` call (returns 400 if exceeded)
- Frontend chunks selection sets >50 into ≤50-sized chunks, calling `bulkApproveDrafts` sequentially with an "Approving 47 of 75..." progress label between chunks
- Confirm modal's per-draft execution feed surfaces the chunk-boundary explicitly so admin sees no perceived freeze

**Warning signs:** First wave's bulk-approve UAT shows admin attempting 80-draft selections; they hit the 50-cap with no clear UX hint about why.

### Pitfall 2: LLM aesthetic convergence — "all menus look the same"

**What goes wrong:** Wave 1 produces 90 Restaurants templates that all use the same warm-amber palette and centered-hero layout because the prompt-library entry's "menu-restaurants-v1" system prompt skews the LLM toward one aesthetic. Visual review reveals 25% are visually duplicate-feeling; the cull rate is 50%, missing the ≥80 floor.

**Why it happens:** LLMs converge to the prompt's strongest stylistic signal. Even with diverse `topic` strings, identical system prompts produce stylistic bunching.

**How to avoid (D-14 closure):**
- Topic file's `palette / vibe / layout` fields explicitly diversify each row
- Seed script weaves these hints into the user-facing freeform prompt: `"${topic}. Palette: ${palette}. Vibe: ${vibe}. Layout: ${layout}."` — LLM sees a different concrete style brief per topic
- Topic file authoring guideline: aim for ≥4 palettes, ≥3 vibes, ≥3 layouts within each (vertical × template_type) cell

**Warning signs:** Wave 1 review shows ≥20% visual similarity within a single (vertical × template_type) cell; admin culls hit 40%+.

**Recovery:** Wave-1.5 prompt re-tune: refine the per-vertical system prompt to add explicit anti-convergence guidance ("Vary background palette and primary accent across attempts; do not default to amber tones."), then `--resume-from <slug>` for the next batch.

### Pitfall 3: Slug collision between topic file and existing svg_templates

**What goes wrong:** Topic file has `slug: 'flash-sale-banner'`. Existing migration 175 already seeded `slug: 'flash-sale-banner'` (Phase 175 Plan 04 row L106). Seed script generates → draft → bulk-approve → `approve_draft_atomic` RPC's INSERT into `svg_templates` fails on UNIQUE (slug). Draft stays `pending`; admin confused.

**Why it happens:** No load-time check between topic file and existing svg_templates.slug.

**How to avoid:**
- Seed script start: `SELECT slug FROM svg_templates WHERE slug = ANY($1::text[])` against the topic-file slugs; abort with the colliding slug list if any match
- Author the topic file with a per-vertical naming convention that includes the orientation suffix (e.g., `bistro-daily-special-warm-amber-landscape` vs `flash-sale-banner` from Phase 175) — collision risk drops to nearly zero

**Warning signs:** During Wave 1, several drafts return `pending` after bulk-approve; logs show `duplicate key value violates unique constraint`.

### Pitfall 4: Existing-127 backfill miscounts

**What goes wrong:** Migration 178 runs UPDATE for category='Restaurant' but the existing data has 'restaurant' (lowercase) due to a Phase 175 seed inconsistency. The DO-ASSERT post-state passes (≥1 row updated) because retail and healthcare were correctly cased, but the restaurant rows are silently NULL'd.

**Why it happens:** `chk_svg_templates_category_enum` is exact-match (Phase 175 enum); Phase 175 seed used 'Restaurant' (uppercase). But what if a Phase 174 or earlier row used a different casing? Need to verify.

**How to avoid:**
- Migration 178 starts with a discovery query (in a comment, executed first via MCP probe): `SELECT DISTINCT category FROM svg_templates;` → confirm the case-exact form before writing UPDATE statements
- Tighten the post-state DO-ASSERT to verify EXACT counts: `ASSERT v_rest >= 1 AND v_rest = (SELECT COUNT(*) FROM svg_templates WHERE category='Restaurant')`

**Warning signs:** Pre-Wave-1 verification shows `SELECT COUNT(*) FROM svg_templates WHERE vertical='restaurants'` returns 0 even though the migration applied "successfully."

### Pitfall 5: Generate-tab orientation dropdown defaults to landscape, but admin assumes portrait was applied

**What goes wrong:** Admin enters a portrait-shaped prompt ("Tall menu board for Healthcare lobby kiosk"), forgets to flip the orientation dropdown from landscape default → generated SVG is 1920×1080 → admin reviews thumbnail and approves → kiosk renders the wrong orientation.

**Why it happens:** Default value bias; orientation choice doesn't fit admin's mental model when prompt itself implies orientation.

**How to avoid:**
- Generate-tab UI puts orientation dropdown PROMINENTLY next to vertical/template_type (not buried)
- Add inline copy: "Orientation affects viewBox (landscape 1920×1080 / portrait 1080×1920) and prompt guidance — choose deliberately"
- (Optional v21.x) post-generation thumbnail dimension preview before approve

**Warning signs:** Admin UAT reports "wrong orientation got published" within first week.

### Pitfall 6: promptLibrary parity test breaks during incremental authoring

**What goes wrong:** Author edits 4 entries in `promptLibrary.js`, runs the wave script — script calls `prompts.json` (unchanged) → entries don't match what's tested locally. Author also notices CI is RED on the parity test.

**Why it happens:** D-08 contract enforces deep-equal; the test fires on every commit.

**How to avoid:**
- Author iteratively: write 4 entries in BOTH files, run parity test, commit. Repeat.
- If a paired-edit is partially complete, mark the commit as `[WIP]` and don't merge until parity is restored.

**Warning signs:** Multiple "fix prompt library parity" commits in a row.

---

## Code Examples

### Example 1: Bulk handler shape (approve_bulk.ts)

```typescript
// supabase/functions/generate-svg-template/handlers/approve_bulk.ts
// Phase 178 — bulk approve handler. Loops the per-row approve flow serially.
//
// Source-order awk gate of approve.ts (validateSvg → rasterize → uploadPng →
// approve_draft_atomic) is preserved per-ID — bulk_approve introduces NO new
// validation site; it iterates the existing one.
//
// Pitfall 3 (300ms inter-call delay): mandatory between iterations; never use
// Promise.all over the draftIds array — Anthropic/S3 rate-limit cascade.
//
// EF runtime cap (60s default): backend hard-caps draftIds.length at 50; the
// frontend must chunk larger selections.

import { approve } from "./approve.ts";

const BULK_HARD_CAP = 50;
const INTER_CALL_DELAY_MS = 300;

interface ApproveBulkBody {
  draftIds: string[];
  reviewerUid: string;
}

interface PerIdResult {
  draftId: string;
  ok: boolean;
  error?: string;
  thumbnail_url?: string;
  svg_template_id?: string;
}

export async function approveBulk(
  body: ApproveBulkBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ ok: true; results: PerIdResult[] }> {
  if (!Array.isArray(body.draftIds) || body.draftIds.length === 0) {
    throw new Response(JSON.stringify({ error: "draftIds must be a non-empty array" }),
      { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (body.draftIds.length > BULK_HARD_CAP) {
    throw new Response(JSON.stringify({
      error: `approve_bulk supports max ${BULK_HARD_CAP} drafts per call; got ${body.draftIds.length}`,
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const results: PerIdResult[] = [];
  const total = body.draftIds.length;

  for (let i = 0; i < total; i++) {
    const draftId = body.draftIds[i];
    try {
      const r = await approve({ draftId, reviewerUid: body.reviewerUid }, supabase);
      results.push({
        draftId,
        ok: true,
        thumbnail_url: r.thumbnail_url,
        svg_template_id: r.svg_template_id,
      });
    } catch (e) {
      const msg = e instanceof Response
        ? `HTTP ${e.status} — ${await e.text().catch(() => "")}`
        : (e instanceof Error ? e.message : String(e));
      results.push({ draftId, ok: false, error: msg });
    }
    // Pitfall 3 — 300ms between iterations
    if (i < total - 1) await new Promise(r => setTimeout(r, INTER_CALL_DELAY_MS));
  }

  return { ok: true, results };
}
```

### Example 2: Seed script outer loop

```javascript
// scripts/seed-vertical-templates.cjs (excerpt — main per-topic loop)
// Phase 178 D-02: drives the existing Edge Function `action=generate`.
// What we ship is what we test — every seeded template traverses the
// validator-at-ingest gate + retry-with-feedback loop.

for (let i = 0; i < topics.length; i++) {
  const t = topics[i];
  const composedPrompt =
    `${t.topic}. Palette: ${t.palette}. Vibe: ${t.vibe}. Layout: ${t.layout}.`;

  const startMs = Date.now();
  let efResult = null;
  let httpError = null;
  try {
    const { data, error } = await supabase.functions.invoke('generate-svg-template', {
      body: {
        action: 'generate',
        vertical: t.vertical,
        template_type: t.template_type,
        orientation: t.orientation,
        prompt: composedPrompt,
      },
    });
    if (error) throw error;
    efResult = data;
  } catch (e) {
    httpError = e?.message ?? String(e);
  }
  const elapsedMs = Date.now() - startMs;

  // Cost tracking (rough estimate — actual usage from EF response if exposed)
  totalCostUsd += COST_PER_ATTEMPT_USD;  // ~$0.04

  // Append per-attempt row to wave artifact
  artifactRows.push({
    idx: i + 1,
    slug: t.slug,
    template_type: t.template_type,
    orientation: t.orientation,
    draftId: efResult?.draftId ?? null,
    status: efResult?.status ?? 'http_error',
    attempts: efResult?.attempt_count ?? 0,
    elapsedMs,
    error: httpError,
  });

  // Cost cap (Q2 recommendation)
  if (totalCostUsd >= options.costHard) {
    console.error(`Hard cost cap $${options.costHard} exceeded — aborting`);
    break;
  }
  if (totalCostUsd >= options.costSoft && !softWarned) {
    console.warn(`Soft cost cap $${options.costSoft} reached — continuing; abort with --cost-hard if needed`);
    softWarned = true;
  }

  // Pitfall 3 — 300ms inter-call delay
  if (i < topics.length - 1) await new Promise(r => setTimeout(r, 300));
}
```

### Example 3: System prompt orientation injection

```typescript
// supabase/functions/generate-svg-template/handlers/generate.ts (excerpt)
// Phase 178 D-10: portrait-vs-landscape viewBox swap + portrait-specific guidance.

const PORTRAIT_GUIDANCE = `

PORTRAIT-SPECIFIC GUIDANCE:
- Layout vertically: header at top, content stacked, footer at bottom
- Use full canvas height (1920); avoid wide horizontal arrangements
- Hero text remains the largest element; sub-elements stack below
- Maintain at least 80px top/bottom margins for kiosk-mount viewing`;

function composeSystemPrompt(
  baseSystemPrompt: string,
  orientation: "landscape" | "portrait",
): string {
  if (orientation === "landscape") return baseSystemPrompt;
  // Portrait: swap viewBox + append guidance
  return baseSystemPrompt
    .replace(/viewBox="0 0 1920 1080"/g, 'viewBox="0 0 1080 1920"')
    + PORTRAIT_GUIDANCE;
}

// Then in generate():
const systemPrompt = composeSystemPrompt(
  promptEntry.system_prompt,
  body.orientation ?? "landscape",
);
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Content volume — 300+ templates in one phase strains review velocity | HIGH | MEDIUM | Wave-by-wave structure (D-03); bulk-approve UI absorbs the click cost; topic file authored once with explicit aesthetic diversity (D-14) |
| LLM aesthetic convergence — Wave 1 produces visually similar templates → cull rate exceeds buffer | MEDIUM | HIGH | D-14 palette/vibe/layout hints; 1.5× over-generation buffer (D-04); Wave-1.5 prompt re-tune option built into D-03 |
| Wave 1 quality forces a promptLibrary re-tune → parity-test thrash | MEDIUM | LOW | Iterative paired edits; parity test catches drift early; promptLibrary is data-only (no logic to re-test) |
| Cost overrun — model retries spike on a category that the system prompt fits poorly | LOW | MEDIUM | $20 hard cap (Q2); per-attempt cost tracked in artifact; abort + iterate prompts before re-spending |
| Bulk EF timeouts at 100+ drafts | LOW | MEDIUM | 50-cap backend + frontend chunking (Pitfall 1); confirm-modal feed surfaces progress |
| Admin queue UI lag at 100+ pending rows | LOW | LOW | Phase 179 ships `@tanstack/react-virtual` for the public gallery; same dep retrofittable to queue if observed (CONTEXT.md L60) |
| Migration 178 backfill miscount due to category casing | LOW | MEDIUM | Discovery `SELECT DISTINCT category` before writing UPDATEs; tight DO-ASSERT post-state |
| Slug collision between topic file and existing svg_templates | LOW | LOW | Load-time check in seed script; naming convention with orientation suffix |
| `templateTypesPerVertical` mapping bleeds wrong-vertical types into Generate tab | LOW | LOW | Mapping is data-only; promptLibrary parity test extension can include a redundancy assert (`every entry's (template_type, vertical) is in templateTypesPerVertical`) |

---

## Pattern Map (file → role → analog)

| NEW or MODIFIED file | Role | Closest existing analog |
|---|---|---|
| `supabase/migrations/178_backfill_existing_127_vertical.sql` (NEW) | One-shot atomic backfill UPDATE + DO-ASSERT | `supabase/migrations/176_template_drafts_and_vertical.sql` (DO-ASSERT block) |
| `supabase/functions/generate-svg-template/handlers/approve_bulk.ts` (NEW) | Serial loop calling per-row `approve(...)` | `supabase/functions/generate-svg-template/handlers/approve.ts` (per-row handler being looped) |
| `supabase/functions/generate-svg-template/handlers/reject_bulk.ts` (NEW) | Serial loop calling per-row `reject(...)` | `supabase/functions/generate-svg-template/handlers/reject.ts` |
| `supabase/functions/generate-svg-template/index.ts` (MODIFIED) | Action-router additions | `index.ts` existing `if (body.action === "approve")` block (L160-171) |
| `supabase/functions/generate-svg-template/handlers/generate.ts` (MODIFIED) | Add `orientation` body field + viewBox swap helper | Same file (system-prompt assembly site at L189) |
| `supabase/functions/generate-svg-template/prompts.json` (MODIFIED) | Expand from 6 to ~24 entries | Same file (entries author-edit) |
| `src/services/aiTemplate/promptLibrary.js` (MODIFIED) | Same as prompts.json | Same file |
| `src/services/aiTemplate/templateDraftsService.js` (MODIFIED) | Add `bulkApprove` / `bulkReject` + extend `generateDraft` | Same file (existing `approveDraft` / `rejectDraft` shape) |
| `src/pages/Admin/AdminTemplateQueuePage.jsx` (MODIFIED) | Filter chips + bulk-action toolbar + confirm modal | Same file (existing reject Modal usage L86-103) |
| `src/components/Admin/BulkActionConfirmModal.jsx` (NEW, suggested) | Confirm modal + per-draft execution feed | `src/components/Admin/TemplateDraftEditModal.jsx` (existing modal pattern) |
| `scripts/seed-vertical-templates.cjs` (NEW) | Outer driver for the wave seeding | `scripts/eval-prompt-library.cjs` (skeleton) + `scripts/generate-template-thumbnails.cjs` (env-loading + 300ms throttle) |
| `scripts/seedTopics.js` (NEW) | ~390 topic records | None — first authored asset of this kind |
| `scripts/verify-178-counts.cjs` (NEW) | SC verification harness for TVRT-01..04 + TCAT | `scripts/generate-template-thumbnails.cjs` (Supabase service-role client setup) |
| `tests/integration/promptLibraryParity.test.js` (MODIFIED) | Update entry-count assertions for ~24 entries | Same file |
| `tests/integration/approveBulk.test.js` (NEW) | Asserts 50-cap + 300ms delay observability + per-ID error isolation | `tests/integration/approveAtomicity.test.js` (existing approve integration test) |
| `tests/integration/rejectBulk.test.js` (NEW) | Mirrors approveBulk shape | `tests/integration/rejectIdempotency.test.js` |
| `tests/unit/generateOrientation.test.js` (NEW) | Mocks Anthropic, asserts portrait viewBox in system prompt | `tests/unit/generateValidatorOrder.test.js` (existing generate.ts unit test) |
| `tests/e2e/admin-template-queue.spec.js` (MODIFIED) | Bulk-select + confirm modal + filter chips | Same file (Phase 177 Plan 06 baseline) |
| `.planning/phases/178-vertical-content-seeding/178-WAVE-{vertical}-RUN.md` (NEW × 3) | Per-wave run artifact (timestamps, IDs, cost, qualitative notes) | None — first artifact of this kind in project |
| `.planning/phases/178-vertical-content-seeding/178-VERIFICATION.md` (NEW) | Phase-close verification trail | `.planning/phases/177-…/177-VERIFICATION.md` |

---

## Recommended Plan Structure (suggestion to planner — planner decides waves)

The planner ultimately decides waves, but research suggests this 7-plan / 5-wave layout based on dependency analysis. Plans within a wave can run parallel; waves are sequential.

### Wave 0 — RED tests (Nyquist gate)
**Plan 178-01: RED test scaffolds** (~4-6 RED files committed, all failing module-load or assertion-as-expected)
- `tests/unit/generateOrientation.test.js` (RED — handler doesn't accept orientation yet)
- `tests/integration/approveBulk.test.js` (RED — handler doesn't exist yet)
- `tests/integration/rejectBulk.test.js` (RED — handler doesn't exist yet)
- `tests/integration/promptLibraryParity.test.js` extension (assert ≥18 entries — RED until Wave 1 expands)
- `tests/e2e/admin-template-queue.spec.js` extension (bulk-select + confirm modal — RED skipped if local DB has no drafts; CI exercises with fixture)
- `scripts/verify-178-counts.cjs` skeleton (RED — counts are below threshold pre-seed)

### Wave 1 — Backfill migration + EF orientation + promptLibrary expansion
Parallelizable. None of these depend on each other.

**Plan 178-02: 178 backfill migration**
- Author + apply `supabase/migrations/178_backfill_existing_127_vertical.sql`
- DO-ASSERT pre/post counts confirm
- Smoke SELECT verifies existing-127 row counts contribute to vertical totals

**Plan 178-03: Edge Function `orientation` parameter + portrait guidance**
- Modify `handlers/generate.ts` body schema + `composeSystemPrompt` helper
- Deploy EF
- `generateOrientation.test.js` flips GREEN

**Plan 178-04: promptLibrary expansion (~24 entries) + templateTypesPerVertical mapping**
- Author per-vertical × per-template_type entries in BOTH `promptLibrary.js` and `prompts.json` (paired edits)
- Add `templateTypesPerVertical` derived helper
- Parity test passes; entry-count assertion passes

### Wave 2 — EF bulk handlers + service + UI
Parallelizable internally; Wave 2 depends on Wave 1.

**Plan 178-05: EF `approve_bulk` + `reject_bulk` handlers + index.ts routing**
- Author `handlers/approve_bulk.ts` + `handlers/reject_bulk.ts`
- Wire into `index.ts` action dispatcher
- Deploy EF
- `approveBulk.test.js` + `rejectBulk.test.js` flip GREEN

**Plan 178-06: Frontend service + AdminTemplateQueuePage Pending+Generate tab extensions**
- Add `bulkApproveDrafts` / `bulkRejectDrafts` to `templateDraftsService.js`
- Extend `generateDraft` signature with `orientation`
- Pending tab: filter chips + checkboxes + bulk-action toolbar
- Generate tab: orientation dropdown + vertical-filtered template_type dropdown
- New `BulkActionConfirmModal` component
- Playwright spec extensions flip GREEN

### Wave 3 — Seed script + topic file
**Plan 178-07: Seed script + topic file authoring**
- Author `scripts/seedTopics.js` (~390 records)
- Author `scripts/seed-vertical-templates.cjs` (~250-350 LOC)
- Smoke run (`--limit=3 --dry-run` or `--limit=3` for live single-attempt validation)

### Wave 4 — Per-vertical content waves (operational; 3 artifacts)
**Plan 178-08: Run + log Wave 1 (Restaurants)** → produces `178-WAVE-restaurants-RUN.md`. Operator review + bulk-approve session. Mid-run: optional prompt re-tune (commit + new wave).

**Plan 178-09: Run + log Wave 2 (Retail)** → produces `178-WAVE-retail-RUN.md`. Same shape.

**Plan 178-10: Run + log Wave 3 (Healthcare)** → produces `178-WAVE-healthcare-RUN.md`. Same shape.

(Plans 08-10 may be a single PLAN.md with three operational tasks if the planner prefers; depends on per-wave separation philosophy.)

### Wave 5 — Verification + close
**Plan 178-11 (or absorbed into Wave 4): Phase verification**
- Run `verify-178-counts.cjs` — assert TVRT-01..04 + TCAT-01..04 SC counts pass
- Run validator script across net-new content
- Run S3 thumbnail audit
- Run Playwright `template-gallery.spec.js` — assert ≥90% green (TVRT-05)
- Author `178-VERIFICATION.md` with full evidence trail
- ROADMAP.md update to mark Phase 178 complete

**Plan count:** 7 distinct plans (Wave 4 may consolidate 08-10 into one) — close to the upper end of CONTEXT.md's 5-8 estimate. Planner can collapse Wave 1's parallel plans (178-02 + 178-03 + 178-04) into a single plan if granularity is preferred coarser.

---

## Assumptions Log

> Claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Edge Function default runtime cap is 60s | Implementation Approach §EF Extensions Pitfall 1 | Could be 150s on paid plans; if confirmed, raise BULK_HARD_CAP from 50 to ~120 |
| A2 | Per-ID approve median ~700ms (validateSvg + rasterize + S3 PUT + RPC) | Q3 + Pitfall 1 | If actual median is 1.5s+, BULK_HARD_CAP must drop to ~30 |
| A3 | Existing `validate-templates.cjs` CLI from Phase 175 Plan 02 supports `--vertical` and `--since` flags | Verification + Wave Artifacts | Planner must verify; if not present, Wave 0 must add a thin wrapper or one new flag |
| A4 | Existing v20.0 Playwright spec covering category-filter regression is `tests/e2e/template-gallery.spec.js` | TVRT-05 Verification | Planner must verify exact filename; spec exists per ROADMAP §"Phase 171 Plans" but exact path not confirmed in this research |
| A5 | Anthropic SDK npm version pinned in EF specifier (`npm:@anthropic-ai/sdk@0.95.0`) is the live deployed version | Locked Constraints table | Verified in `generate.ts` L144 source; trusts the EF was redeployed after BL-NEW-04 hotfix on 2026-05-10 (`db8451eb`) |
| A6 | The `templateTypesPerVertical` recommendation table is a reasonable default; final per-vertical type set may be refined during topic-file authoring | Frontend Changes §Generate tab | Low risk — data-only, edit-once during Plan 178-04 |
| A7 | ~24 final promptLibrary entry count is the right ceiling; could land at 22 or 28 depending on niche-type coverage decisions | promptLibrary Expansion | Low risk — parity test enforces consistency at whatever count is chosen |
| A8 | Per-attempt cost ~$0.04 (CONTEXT.md L108 estimate) holds for the expanded prompt library at full system-prompt length | Q2 cost cap | Low risk — soft+hard cap absorbs cost variance up to ~25% |

**Items NOT assumed (verified):** Schema enums (verified against migrations 175/176/177), source-order awk gate (verified in approve.ts L33 header), 6 existing prompt entries (verified in prompts.json + promptLibrary.js), Anthropic SDK installed version `^0.94.0` declared (verified in package.json), live registry version 0.95.1 (`[VERIFIED: npm registry]` 2026-05-09), Phase 177 BL closures (verified in 177-VERIFICATION.md cycle 3.5), DOMPurify locked config sites (verified in 4 named files), CLAUDE.md absent (verified `ls /Users/massimodamico/bizscreen/CLAUDE.md`).

---

## Open Questions (RESOLVED)

> All four open questions have been resolved during plan-checking + plan revision. Each item carries an inline `**RESOLVED:**` line citing where the resolution was made.

1. **Existing validator CLI script availability.** Does `scripts/validate-templates.cjs` exist with the flag interface assumed in Verification §TCAT-03? If not, who authors the Wave 0 wrapper — planner spawns it as a Plan 178-01 task, or it lands in Wave 5 verification?
   - **What we know:** Phase 175 Plan 02 produced a validator + CLI per CONTEXT.md L161 reference; exact filename and flag set not observed in the visible repo state.
   - **Recommendation:** Planner verifies during plan-checking; if missing, add a small wrapper task to Plan 178-01 (Wave 0 RED tests).
   - **RESOLVED:** Plan 178-01 Task 3 closes Q1 — the planner confirmed the script does NOT exist in the live repo state on 2026-05-09 and added authoring of `scripts/validate-templates.cjs` as a Wave 0 task with `--vertical=<csv>` and `--since=<ISO>` flags wrapping `src/services/svgValidator.js`.

2. **Playwright gallery regression spec exact filename + selectors.** TVRT-05 verification depends on running the v20.0 category-filter spec. CONTEXT.md doesn't name the exact file.
   - **What we know:** Phase 171 Plan 03 shipped a Playwright E2E for the category filter (`gallery-tests.spec.js` or similar).
   - **Recommendation:** Planner finds the spec via `find tests/e2e -name "*gallery*"`; documents in Plan 178-11 (verification plan).
   - **RESOLVED:** Plan 178-08 Task 4 names `tests/e2e/template-gallery.spec.js` + `tests/e2e/template-gallery-100.spec.js` as the TVRT-05 regression-sweep targets and asserts ≥90% green.

3. **Bulk-approve UX: incremental rendering vs full-response wait.** D-08 specifies a "per-draft execution feed" but the EF returns the full results array at once. Does the UI mock incremental rendering by deferred-rendering N=10 chunks client-side, or does it just render the full results once the response arrives?
   - **What we know:** D-08 doesn't constrain implementation; the user-facing requirement is "per-draft status visible during execution."
   - **Recommendation:** Frontend chunks selection >50 anyway (Pitfall 1); chunking at N=10 with one bulk EF call per chunk delivers genuine incremental rendering at zero additional backend complexity. Adopt this approach.
   - **RESOLVED:** Plan 178-06 Task 4 closes Q3 via REAL chunking — `Math.ceil(N/50)` sequential EF calls (CHUNK_SIZE=50) in a serial `for` loop, with per-chunk results aggregated into the modal feed and aggregate progress surfaced as "Approving X / N (chunk K/M)" in BulkActionConfirmModal. Replaces the earlier silent `slice(0, 50)` truncation that would have dropped IDs at index 50+.

4. **Topic-file authoring scope** — research assumes ~390 records authored in a single Claude-assisted-then-human-edited session. Is that a reasonable estimate, or should the planner chunk topic-file authoring across plans 07a/07b/07c?
   - **What we know:** D-13 says authored-once asset; CONTEXT.md L77 says "most can be Claude-assisted then human-edited in a single focused session."
   - **Recommendation:** Single Plan 178-07 covers it; if mid-run the operator wants to re-tune topic file between waves, that's a small Quick-Task commit, not a new plan.
   - **RESOLVED:** Plan 178-07 Task 1 covers the full ~360 record authoring (≥120 per vertical per D-04 1.5× over-generation) in a single plan; if Wave 1 quality reveals topic-file gaps, the operator can `--resume-from <slug>` after a small Quick-Task commit between waves rather than a re-planned subdivision.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Seed script + verification harness | ✓ | (existing project Node) | — |
| `@anthropic-ai/sdk` (Node) | seed-vertical-templates.cjs (transitively via EF) | ✓ | 0.94.0 declared / 0.95.1 latest verified | — |
| `@supabase/supabase-js` (Node) | seed-vertical-templates.cjs (functions.invoke) + verify-178-counts.cjs | ✓ | (existing) | — |
| `jsdom` (Node) | (Optional — only if seed script runs validator locally; D-02 says it doesn't, EF does) | ✓ | (existing for eval-prompt-library.cjs) | — |
| `@resvg/resvg-js` (Node, dev only) | NOT needed — Phase 178 uses EF's resvg-wasm | ✓ | ^2.6.2 | — |
| `@resvg/resvg-wasm` (Deno) | EF approve handler | ✓ | ^2.6.2 (pinned via npm: specifier in index.ts) | — |
| `@aws-sdk/client-s3` (Deno) | EF approve handler | ✓ | ^3.654.0 | — |
| `jsr:@b-fuze/deno-dom` | EF generate + approve validator path | ✓ | ^0.1.48 | — |
| `vitest` 4 | RED tests + integration | ✓ | (existing) | — |
| `Playwright` | E2E spec | ✓ | (existing) | — |
| `supabase` MCP / Mgmt API | Migration apply | ✓ | (existing) | Mgmt API direct call (175 precedent) if MCP fails |
| `dotenv` | Local script env loading | ✓ | (existing) | — |
| `ANTHROPIC_API_KEY` | Live wave runs | ✓ | (Supabase secret + .env.local for scripts) | — |
| `ANTHROPIC_MODEL_ID` | EF generate handler fail-fast | ✓ | (`claude-haiku-4-5-20251001`) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | seed-vertical-templates.cjs + verify-178-counts.cjs | ✓ | (existing) | — |
| `VITE_SUPABASE_URL` | seed scripts | ✓ | (existing) | — |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | EF S3 PUT (transitively) | ✓ | (Supabase secrets — Phase 177 verified) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

Phase 178 has zero new external dependencies. All required tooling is operational from Phase 177 hardening + v20.0 production state.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-authored migration to seed templates (Phase 175 — 127 rows in 84KB SQL via Mgmt API direct call) | AI-generated seeds via the Phase 177 pipeline + bulk admin approval | Phase 177 (pipeline) + Phase 178 (operationalization) | Phase 178 ships ~3× more templates than Phase 175 with one production migration (the existing-127 backfill); the 300+ net-new INSERTs flow through approve_draft_atomic — same code path as production user generation |
| `Promise.all` over template generation calls | Serial 300ms-throttled loop (Pitfall 3) | Phase 177 | Required for Anthropic + S3 rate-limit compliance; locked in eval-prompt-library.cjs precedent |
| Single-vertical prompt library | Per-(template_type × vertical) entries with cross-vertical fallback | Phase 178 (D-09) | LLM aesthetic specialization without losing general-purpose fallback |
| One-orientation prompt entries | Orientation-agnostic library + EF-time portrait guidance injection | Phase 178 (D-10) | One library entry serves both orientations; halves authoring + parity-test surface |

**Deprecated/outdated for Phase 178:**
- Hand-authoring 300+ SVGs as raw migration content — replaced by the seed-via-EF lane.
- Direct Anthropic SDK from a Node script for content production — replaced by `supabase.functions.invoke('generate-svg-template', ...)` so production validators + retry loop are exercised.
- Adding a `template_bulk_audit` table for bulk-action attribution — deferred until v22.0 needs it.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/178-vertical-content-seeding/178-CONTEXT.md` — locked decisions (D-01..D-16) + Claude's-Discretion points
- `.planning/REQUIREMENTS.md` — TVRT-01..05 + TCAT-01..04 IDs and traceability
- `.planning/ROADMAP.md` §Phase 178 — phase goal, dependencies, 5 success criteria
- `.planning/phases/177-…/177-CONTEXT.md` D-08/D-09/D-10 — promptLibrary shape and per-vertical specialization deferred to 178
- `.planning/phases/177-…/177-VERIFICATION.md` cycle 3.5 — Phase 177 closure trail (BL-01..BL-06 + BL-NEW-01..04)
- `supabase/functions/generate-svg-template/handlers/generate.ts` — current EF generate handler shape (extension point for orientation)
- `supabase/functions/generate-svg-template/handlers/approve.ts` — per-row approve flow (locked source-order awk gate; bulk approve loops this)
- `supabase/functions/generate-svg-template/handlers/reject.ts` — per-row reject flow + BL-03 race guard
- `supabase/functions/generate-svg-template/index.ts` — action dispatcher (CORS envelope + service-role pattern)
- `supabase/functions/generate-svg-template/prompts.json` + `src/services/aiTemplate/promptLibrary.js` — parity-locked pair (currently 6 entries)
- `supabase/migrations/176_template_drafts_and_vertical.sql` — vertical enum, gallery_templates VIEW shape (verified)
- `supabase/migrations/175_seed_100_templates_and_taxonomy.sql` — 15-value category CHECK constraint
- `supabase/migrations/177_approve_draft_atomic.sql` — RPC contract + EXECUTE boundary
- `scripts/eval-prompt-library.cjs` — Phase 177 Plan 06 harness (reused as seed-script skeleton)
- `scripts/generate-template-thumbnails.cjs` — 300ms throttle precedent + service-role client setup
- `tests/integration/promptLibraryParity.test.js` — D-08 parity contract (must stay green)
- `.planning/research/PITFALLS.md` §A1-A4 — validator-at-ingest, model deprecation, retry-storm cost cap, structured-output ≠ valid SVG
- `.planning/research/STACK.md` Capability Area 1 — Claude Haiku 4.5 pricing math + Batch API non-adoption rationale

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — milestone-level scope synthesis
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` — orientation-dropdown precedent + per-category prompt curation pattern
- `.planning/research/ARCHITECTURE.md` — EF shape + admin-pipeline track architecture

### Tertiary (LOW confidence — cross-verified or trusted-by-context)
- `npm view @anthropic-ai/sdk version` — returned 0.95.1 on 2026-05-09 `[VERIFIED: npm registry]`
- Supabase EF runtime cap of 60s — `[ASSUMED]` from general Supabase platform docs; planner verifies

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package is already wired; Phase 178 adds zero npm deps.
- Architecture: HIGH — every extension site is a one-line addition or a new file modeled on a Phase 177 analog; no novel patterns.
- Pitfalls: HIGH — bulk-action timeout, aesthetic convergence, slug collision, backfill miscounts all have concrete mitigations grounded in observed code.
- Open questions: LOW — three of four require a quick `find`/`grep` by the planner during plan-checking; none are blocking.

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days — phase scope is stable; longer if Phase 178 doesn't start within 30 days)
**Author:** gsd-phase-researcher

---

## RESEARCH COMPLETE

Phase 178 research is plan-ready. The locked-decision density (16 decisions in CONTEXT.md, plus Phase 177's full BL-closure trail) makes Phase 178 a CONTENT phase wrapped around two EF additions (`approve_bulk` + `reject_bulk`), one EF parameter extension (`orientation`), one frontend extension (filter chips + bulk toolbar + confirm modal), one migration (existing-127 backfill), and two new authored assets (topic file + seed script). All 7 Claude's-Discretion points have concrete recommendations grounded in observed code. The recommended 7-plan / 5-wave structure stays inside CONTEXT.md's 5-8 envelope and gives Wave 0 a Nyquist-grade RED-test scaffold before any production code lands. No new external dependencies; no hand-rolled patterns; every load-bearing step calls an existing Phase 177 closure (RPC, validator, rasterizer, S3 helper). The planner can now author 5-8 PLAN.md files without re-researching.
