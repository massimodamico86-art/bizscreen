# Phase 178: Vertical Content Seeding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 178-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 178-vertical-content-seeding
**Areas discussed:** Production lane, Approve-at-scale path, Coverage tactics, Source material strategy

---

## Production lane

### Q1 — Primary production lane

| Option | Description | Selected |
|--------|-------------|----------|
| AI-heavy with curated prompts (Recommended) | Expand promptLibrary to per-vertical entries, drive EF in deterministic seed script. Reproducible, owned, scales. | ✓ |
| Balanced hybrid (50/50) | AI for 6 base types covered by promptLibrary; hand-author 2-3 niche types per vertical. | |
| AI-only via existing queue UI | Use AdminTemplateQueuePage one-at-a-time. ~300 clicks; not how OptiSigns produces their catalog. | |
| Hand-authored migration (Phase 175 pattern) | 300+ SVG INSERTs in a 175-style migration via Mgmt API. Doesn't exercise the AI pipeline. | |

**User's choice:** AI-heavy with curated prompts.
**Notes:** User asked first which option resembles OptiSigns; response noted that OptiSigns's seed pipeline is opaque — what's *visible* (per-category curated AI Designer prompts) maps onto option 1; what's *implied* (professional curation on top) closer to option 2 (balanced hybrid). User went with option 1 after the OptiSigns clarification.

### Q2 — API path for the seed script

| Option | Description | Selected |
|--------|-------------|----------|
| Loop the existing Edge Function (Recommended) | Seed script calls supabase.functions.invoke('generate-svg-template', {action:'generate'}) in serial 300ms loop. Reuses validated path. | ✓ |
| Direct Anthropic SDK from script | Mirror eval-prompt-library.cjs pattern. Faster but creates 2nd code path. | |
| Anthropic Batch API | 50% cost reduction but async; doesn't fit per-attempt validator-feedback loop. | |
| Reuse the eval-prompt-library.cjs harness | Extend eval harness to produce real drafts. Same divergence risk as direct SDK. | |

**User's choice:** Loop the existing Edge Function.
**Notes:** No additional comment from user.

### Q3 — Run cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical-by-vertical waves (Recommended) | Wave 1 Restaurants → review/iterate → Wave 2 Retail → Wave 3 Healthcare. Course-correct between waves. | ✓ |
| Type-by-type waves | One wave per template_type across all 3 verticals. Cross-vertical type comparison. | |
| Single one-shot run | All 300+ in one serial loop. No course-correction. | |

**User's choice:** Vertical-by-vertical waves.
**Notes:** No additional comment from user.

### Q4 — Quality buffer

| Option | Description | Selected |
|--------|-------------|----------|
| Over-generate ~1.5× then cull (Recommended) | ~120 attempts/vertical (~$15.60), reject weakest 25%. Headroom above 80/vertical bar. | ✓ |
| Generate exactly to target | 300 attempts (~$12). Accept everything that passes svgValidator. No curation room. | |
| Generate-until-target with quality vote | Keep generating until ≥80 admin-approved per vertical, hard cap budget. | |

**User's choice:** Over-generate ~1.5× then cull.
**Notes:** No additional comment from user.

---

## Approve-at-scale path

### Q1 — Approve mechanism at volume

| Option | Description | Selected |
|--------|-------------|----------|
| Bulk-approve in queue UI (Recommended) | Row checkboxes + 'Approve selected' + new EF action approve_bulk that loops Plan 03 atomic flow per ID. Preserves human-in-the-loop quality gate. | ✓ |
| Script-loop EF approve | Headless script that calls EF action=approve in a loop. Bypasses visual review. | |
| Mgmt API direct INSERT (175 pattern) | Hand-authored SELECT-from-drafts → INSERT-into-svg_templates migration. Bypasses approve handler's atomic 4-step flow. | |
| Approve-then-toggle (admin curator) | Auto-approve all validator-passing drafts with is_active=FALSE; admin flips on the keepers via TCAT-F4 toggle (v22.0 dep). | |

**User's choice:** Bulk-approve in queue UI.
**Notes:** No additional comment from user.

### Q2 — Bulk reject parity

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — symmetric bulk-reject + bulk-approve (Recommended) | Same checkboxes + 'Reject selected' button + optional shared reason. Mirrors approve UX. | ✓ |
| No — keep reject single-row only | Bulk approve only; rejection one-at-a-time. ~100 reject clicks/wave defeats the cull strategy. | |
| Inverse: 'reject all unselected' | After admin Approves, follow-up confirmation offers mass-reject of unselected. Dangerous default. | |

**User's choice:** Yes — symmetric bulk-reject + bulk-approve.
**Notes:** No additional comment from user.

### Q3 — Pending tab structure at high volume

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list + filter chips (Recommended) | Single list, chronological DESC. Filter chips at top: vertical / template_type / status. Reuses v20.0 gallery pattern. | ✓ |
| Grouped sections by vertical | Three collapsible sections (Restaurants/Retail/Healthcare). Bulk-select-across-sections fiddly. | |
| Per-wave subsections | Subsections per seed run with metadata.seed_run tag. Couples queue to seed-script knowledge. | |

**User's choice:** Flat list + filter chips.
**Notes:** No additional comment from user.

### Q4 — Bulk action safety

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm modal with count + names (Recommended) | Modal: 'Approve 47 drafts? [first 5 names], …42 more' + per-draft execution feed + final summary. | ✓ |
| Confirm modal with count only | Simple count confirm; no preview of which drafts. | |
| No confirmation, just toast | Click → toast 'Approving 47…' → toast 'Approved 45, 2 failed'. No recovery from accidental click. | |

**User's choice:** Confirm modal with count + names.
**Notes:** No additional comment from user.

---

## Coverage tactics

### Q1 — Niche template types not covered by 6-entry library

| Option | Description | Selected |
|--------|-------------|----------|
| Expand promptLibrary to ~18 entries (Recommended) | Per-vertical specialization × 6 base types. Cross-vertical entries stay as fallback. | ✓ |
| Expand both type enum AND promptLibrary | Add ~4 new template_type values + their entries. ~30 prompts to author. | |
| Keep 6 entries; specialize via freeform admin steering | Library stays at 6; per-template freeform prompts in seed script supply specialization. | |
| Use metadata.template_type as a free string | Existing 6 enum + free-string fine-grained types in metadata. Filterability suffers. | |

**User's choice:** Expand promptLibrary to ~18 entries.
**Notes:** No additional comment from user.

### Q2 — Hero portrait/landscape coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Add 'orientation' param to EF + dynamic viewBox (Recommended) | generateDraft({vertical, template_type, orientation, prompt}); EF swaps viewBox + appends portrait guidance. | ✓ |
| Author parallel landscape + portrait library entries | ~36 entries. 2× authoring + parity-test load. | |
| Landscape-only generation + manual portrait port via edit modal | High-friction manual SVG editing per template. TCAT-02 likely ship-blocker. | |
| Two-pass script: generate landscape, then re-prompt portrait | Worse abstraction than option 1 with same end state. | |

**User's choice:** Add 'orientation' param to EF + dynamic viewBox in system prompt.
**Notes:** No additional comment from user.

### Q3 — Niche template types beyond the 6 base

| Option | Description | Selected |
|--------|-------------|----------|
| Expand template_type enum + add library entries (Recommended) | Add queue_status, drive_thru, waiting_room_ambient, emergency_alert. Library grows to ~20–26. | ✓ |
| Reuse existing 6 + tag niche-ness in metadata.subtype | Map niche onto closest base; subtype in metadata. TVRT SC verification awkward. | |
| Drop 'distinct types' to library types only | Concentrate ≥80/vertical in 6 base types (~14 per type). Weakens SC, misses signature types. | |

**User's choice:** Expand template_type enum + add library entries.
**Notes:** No additional comment from user.

### Q4 — Generate-tab template_type dropdown UX

| Option | Description | Selected |
|--------|-------------|----------|
| Filter types by selected vertical (Recommended) | Vertical=restaurants narrows dropdown to Restaurants-relevant types. Cross-vertical shows all. | ✓ |
| Show all ~10 types regardless of vertical | Single flat dropdown. Admin can pick nonsense (Healthcare + drive_thru). | |
| Two-tier dropdown: base type → specialization | Hierarchical. Leaks promptLibrary specialization model into the form. | |

**User's choice:** Filter types by selected vertical.
**Notes:** No additional comment from user.

---

## Source material strategy

### Q1 — Topic source for the ~390 freeform prompts

| Option | Description | Selected |
|--------|-------------|----------|
| Curated topic list authored by us, lives in repo (Recommended) | scripts/seedTopics.js with per-(vertical × type) ~12 specific topic strings. Reproducible, PR-reviewable. | ✓ |
| Mirror OptiSigns categories from the walkthrough | Use 7 example prompts as seed; expand 50× during seeding. IP optics + duplicates promptLibrary. | |
| Real-world establishment archetypes | Per-vertical archetype lists (bistro/urgent-care/boutique/…) × types. Visually-varied results. | |
| Generate topics during the run (LLM-driven seed list) | LLM produces topic list itself. Not reproducible across runs. | |

**User's choice:** Curated topic list authored by us, lives in repo.
**Notes:** No additional comment from user.

### Q2 — Visual variety lever within a (vertical × type) slot

| Option | Description | Selected |
|--------|-------------|----------|
| Add structured aesthetic hints per topic entry (Recommended) | { topic, palette, vibe, layout } in seedTopics. Topic file becomes a design brief. | ✓ |
| Just diverse topic strings | Rely on topic strings alone. LLM aesthetic convergence likely. | |
| Topic + prior-template reference | Each topic references a prior template by ID. Chicken-and-egg in Wave 1. | |
| Per-archetype palette baked into promptLibrary | Move palette/vibe/layout into library entries. Locks aesthetics; less per-template variety. | |

**User's choice:** Add structured aesthetic hints to each topic entry.
**Notes:** No additional comment from user.

### Q3 — Names + tags source for 390 templates

| Option | Description | Selected |
|--------|-------------|----------|
| Topic file carries everything explicitly (Recommended) | { slug, name, description, tags[], topic, palette, vibe, layout } per entry. Repo-controlled. | ✓ |
| Extend EF tool-use schema to emit name+description+tags | LLM emits identity fields. Generic names; variable tag quality. | |
| Auto-derived + post-hoc auto-tag pass | name='<archetype> <type>', slug='<vertical>-<type>-<idx>'. Bland names; rule-based tags. | |
| Hybrid: topic file owns identity, LLM emits tags | Identity in repo; tags from LLM. Still requires tool-use schema extension. | |

**User's choice:** Topic file carries everything explicitly.
**Notes:** No additional comment from user.

### Q4 — Existing 127 templates' vertical column

| Option | Description | Selected |
|--------|-------------|----------|
| Backfill from category (Recommended) | UPDATE: Restaurant→restaurants, Retail→retail, Healthcare→healthcare. Others stay NULL. | ✓ |
| Don't backfill — only tag net-new | Existing 127 keep vertical=NULL. ≥80 net-new per vertical bar applies literally. | |
| Manual audit + selective backfill | Per-template decision for ambiguous cases (Hospitality, Beauty). Not reproducible. | |
| Backfill from category PLUS expand mappings | Pull borderline categories in (Hospitality breakroom → restaurants). Mis-tagging risk. | |

**User's choice:** Backfill from category (others stay NULL).
**Notes:** No additional comment from user.

---

## Claude's Discretion

User explicitly delegated several detailed implementation choices to the planner:

- `template_type` as DB column with CHECK constraint vs free string in `metadata.template_type` (D-11)
- Cost cap mechanic — soft warning + hard stop thresholds for `seed-vertical-templates.cjs` (D-04)
- Concurrency model for `approve_bulk` / `reject_bulk` EF actions (D-05/D-06) — serial vs limited parallel
- Idempotency / restart semantics on partial wave failure (D-03)
- Parity-test extension strategy for the now-larger promptLibrary.js + prompts.json (~24 entries)
- Per-archetype distribution per vertical within the ~80 published templates × ~8 types (suggest hero-weighted)
- Bulk-action audit trail shape — per-draft (current pattern, just iterated) vs separate bulk-action log row (D-08)

## Deferred Ideas

Captured during discussion as out-of-scope for Phase 178:

- TCAT-F2 vertical filter chip in TemplateGalleryPage — v22.0
- TCAT-F1 sub-vertical tagging (coffee-shop, pharmacy, etc.) — v22.0
- TCAT-F3 per-vertical starter packs — v22.0
- TCAT-F4 admin publish/unpublish toggle — v22.0 (referenced as approve-then-toggle option, rejected for Phase 178)
- TCAT-F5 orthogonal filter taxonomy — v22.0
- TGEN-F2 daily LLM cost cap per admin — v21.x
- TGEN-F3 image upload as AI generation input — v22.0
- Anthropic Batch API for mass-seeding — flagged in research/STACK.md as "valuable for Phase 178" but explicitly NOT adopted (per-attempt validator-feedback loop incompatible with Batch API async shape; ROI poor at this volume); revisit v21.x
- "See More Like This" / detail-modal recommendation row — v22.0
- Self-serve AI generation for end users — milestone-out-of-scope (deliberate divergence from OptiSigns)
- Bulk SVG import pipeline — v21.x
- Manual audit + selective backfill of existing 127 beyond category-derived mapping — out of scope
- Real-world establishment archetypes as primary topic structure — rejected in D-13; revisit if Wave 1 visual variety is weak
- Per-eval-suite in CI — out of scope (eval-prompt-library.cjs runs as one-off harness)
- Type-by-type waves — rejected in D-03; revisit if vertical waves produce uneven cross-vertical type quality
- Two-phase generation (LLM → SVG, then LLM → name/description/tags) — rejected in D-15
- Queue-page virtualization — Phase 179 ships @tanstack/react-virtual for public gallery; retrofittable to queue if review-session lag observed; v21.x watch item
