# Phase 177: AI Generation Pipeline + Admin Queue UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 177-ai-generation-pipeline-admin-queue-ui
**Areas discussed:** Page topology + Edit flow, Validator-fail persistence, Prompt library storage + selection UX, TGEN-06 A/B harness + threshold

---

## Area selection

User was offered 4 gray-area options to discuss. User answered "you decide based on optisigns" — delegated framing to OptiSigns walkthrough as the precedent reference. All 4 areas were addressed in a single proposed-decision-set turn rather than per-area drilldown.

| Option | Description | Selected |
|--------|-------------|----------|
| Page topology + Edit flow | How generator + queue + edit fit together; Edit reuses AdminEditTemplatePage or not | ✓ (delegated) |
| Validator-fail persistence | Status enum extension vs metadata JSONB vs no-persist | ✓ (delegated) |
| Prompt library storage + selection UX | Source file vs DB vs EF constants; selection UX shape | ✓ (delegated) |
| TGEN-06 A/B harness + threshold | Harness shape + threshold value | ✓ (delegated) |

**User's choice:** Delegated to Claude with OptiSigns as anchor. Approved the resulting decision set in one shot.

---

## Page topology + Edit flow

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate pages | `AdminAiGeneratorPage` + `AdminTemplateQueuePage` — clean separation, more nav steps | |
| Single tabbed page | `AdminTemplateQueuePage` with Generate / Pending tabs | ✓ |
| Queue page with modal | Queue list + "+ Generate" button opens a modal/drawer for prompt entry | |

**User's choice:** Single tabbed page (delegated; Claude picked).

**Edit-flow alternatives considered:**

| Option | Description | Selected |
|--------|-------------|----------|
| Clone draft to svg_templates(published=false), redirect to existing AdminEditTemplatePage | Reuses editor with no changes; needs lifecycle bookkeeping | (fallback) |
| Extend AdminEditTemplatePage with `?draftId=` URL param | Single editor handles both data sources; Save & Publish uses approve path | ✓ |
| Inline edit on queue card | Textarea + few fields on the queue page itself | |
| Promote-on-Edit | Edit immediately approves and edits live | |

**User's choice:** Extend AdminEditTemplatePage with `?draftId=` (D-04). Clone-then-redirect documented as the planner's fallback if data layer turns out svg_templates-coupled.

**Notes:** OptiSigns has no admin queue (self-serve), so page topology has no direct mirror. Tabbed page chosen because both tabs operate on `template_drafts` and the admin journey is generate→review→approve in one session. Reusing AdminEditTemplatePage avoids rebuilding 943 LOC of edit affordances.

---

## Validator-fail persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Add `'needs_human_review'` to status CHECK via new migration | First-class status, indexable, queryable; one-line DROP+ADD CONSTRAINT | ✓ |
| Encode in metadata JSONB | No new migration; flexible; harder to query/count | |
| Don't persist failures | Cleanest UX; loses audit; SC #2 says "draft is marked" → SC violation | |
| INSERT only last attempt with status=pending | Lightweight; conflates failed and pending; reviewers can't tell apart | |

**User's choice:** Add `'needs_human_review'` to status CHECK (D-05). Failure audit details (per-attempt errors, raw SVG excerpt, model_id, ts) stored as a JSONB array in `metadata.validator_failures`.

**Notes:** SC #2 wording is explicit about the draft being marked — must be persisted. Migration is ~5 lines (DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT, mirrors Phase 176 idempotency). Indexable on existing `idx_template_drafts_status`.

---

## Prompt library storage + selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Source-controlled file (`src/services/aiTemplate/promptLibrary.js` + EF copy) | Version-controlled, code-reviewable, no migration | ✓ |
| DB seed table (`template_prompt_library`) | Runtime-editable; needs admin CRUD UI + migration | |
| Edge Function constants only | Server-only; not accessible to frontend cards | |

**Selection UX:**

| Option | Description | Selected |
|--------|-------------|----------|
| Type/vertical dropdowns only | Minimal UI; matches typical form pattern | (kept as fallback dropdowns) |
| OptiSigns-style "Explore AI Prompts" cards | Card grid below form; click to fill prompt + select type/vertical | ✓ (primary) |
| Search-as-you-type prompt picker | More complex UX; overkill for 6-24 prompts | |

**User's choice:** Source file storage (D-08); OptiSigns-mirror card grid for discovery + dropdowns for direct selection (D-02). Vertical required at generate time (3 enums + Cross-vertical → NULL).

**Notes:** 6 prompts is too few to justify a CRUD admin UI. Two-file pattern (frontend JS + Deno TS) with a Vitest equality test is the canonical-data approach. Schema for entries: `{ id, template_type, vertical, label, example_freeform, system_prompt }`. v1 ships ≥6 prompts with `vertical=null` acceptable for SC compliance; per-vertical specialization expands during Phase 178.

---

## TGEN-06 A/B harness + threshold

**Harness alternatives:**

| Option | Description | Selected |
|--------|-------------|----------|
| One-off Node script run at phase verification | ~$0.63/run; manual trigger; results into VERIFICATION.md | ✓ |
| Automated CI integration test | Runs on every PR touching prompt library; real money + flake risk | |
| Playwright E2E | Heavier; doesn't add over node-script | |

**Threshold alternatives:**

| Option | Description | Selected |
|--------|-------------|----------|
| ≥20pp first-pass improvement | Loose; might miss sub-quality prompts | |
| ≥30pp first-pass improvement | SC #6 parenthetical example value | ✓ |
| ≥40pp first-pass improvement | Tight; risks blocking on tunable factor | |

**User's choice:** One-off Node script (`scripts/eval-prompt-library.cjs`); ≥30pp threshold (D-12, D-13). Tunable on first measurement.

**Notes:** Math = 5 gens × 6 types × 2 conditions = 60 LLM calls. Haiku 4.5 ≈ $0.63/full run. Results land in `.planning/phases/177-.../prompt-library-eval.md` with headline number copied into `177-VERIFICATION.md`. Re-run cost is bounded so threshold can be revisited if first measurement is borderline.

---

## Defaults locked without explicit selection

| Default | Value | Rationale |
|---------|-------|-----------|
| Generation UX | Synchronous v1 (~30s wait) | Low admin cadence; async/Batch deferred to v21.x |
| Rasterization location | Same Edge Function on Approve | Atomic approve path; no browser bundle bloat |
| LLM model env var | `ANTHROPIC_MODEL_ID` (default `claude-haiku-4-5-20251001`) | Pitfall A2 mitigation; snapshot-pinned |
| Per-admin rate limit | OUT of scope — v21.x | Not in TGEN/TADM SCs; data exists for later enforcement |
| Admin role gate | Edge Function `is_admin()`/`is_super_admin()` + RLS already locked from Phase 176 | Double defense |
| Pre-implementation Wave 0 | Deno DOMParser smoke test | Phase 176 SUMMARY flagged this as a gap |

---

## Claude's Discretion

User explicitly delegated framing to OptiSigns precedent ("you decide based on optisigns") and approved the resulting full decision set. Areas where Claude exercised judgment:

- Single tabbed page over two pages (D-01)
- `?draftId=` extension over clone-then-redirect (D-04, with documented fallback)
- Source file storage over DB table (D-08)
- 30pp threshold over 20pp/40pp (D-13)
- Synchronous over async/batch UX (D-14)
- Same-EF rasterization over alternatives (D-15)
- Snapshot-pinned model ID (D-16)

If implementation reveals any of these are wrong, planner can flag in PLAN.md Risks/Concerns and re-discuss before Wave 1.

## Deferred Ideas

- TGEN-F2 daily generation cap (Pitfall A4) — v21.x
- TGEN-F3 image upload as input — v22.0
- Anthropic Batch API for bulk seeding — usable in Phase 178, not 177
- Full 6×4 prompt matrix (per-vertical specialization) — incremental during Phase 178
- Per-attempt CI eval suite — v21.x or v22.0
- Detail-modal "See More Like This" — v22.0
- Self-serve AI generation for end users — explicit out-of-milestone
