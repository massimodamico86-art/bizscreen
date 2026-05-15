# Phase 177: AI Generation Pipeline + Admin Queue UI — Research

**Researched:** 2026-05-06
**Domain:** Supabase Edge Function (Deno) wrapping Anthropic Claude Haiku 4.5 + svgValidator + @resvg/resvg-wasm + admin queue UI
**Confidence:** HIGH on Deno-side library choices; MEDIUM on AdminEditTemplatePage extensibility (a substantive blocker found, see §"Existing-Code Inspection")

---

## Executive Summary

- **First Edge Function in this codebase.** No `supabase/functions/` directory exists yet. There is no representative gating pattern to copy — Phase 177 establishes it. (Existing AI-tagging service hits a `/api/ai/generate-tags` Vercel route which is currently disabled per `_api-disabled/`.) [VERIFIED: filesystem grep + ARCHITECTURE.md line 70]
- **Use `@resvg/resvg-wasm`, NOT `@resvg/resvg-js`, in the Edge Function.** Supabase docs explicitly state Edge Functions only support WASM-based image libraries; `@resvg/resvg-js` is N-API/native binary based and is documented to crash at runtime. [CITED: https://supabase.com/docs/guides/functions/examples/image-manipulation]
- **D-04 (`?draftId=` URL param) needs a re-think.** The actual `App.jsx` routing is **string-based currentPage state** (`currentPage.startsWith('admin-template-')`), not React Router with URL params. Worse, **AdminEditTemplatePage operates on `template_library` (Polotno templates) via `marketplaceService`, NOT on `svg_templates`** — a fundamentally different data source. The clone-then-redirect fallback (D-04 fallback) is the correct path; planner should treat the `?draftId=` extension as **architecturally infeasible** as written. (Detailed evidence in §"Existing-Code Inspection".) [VERIFIED: file inspection of `src/App.jsx:687-691,1025-1032` and `src/pages/Admin/AdminEditTemplatePage.jsx:1-50`]
- **Deno DOMParser landmine resolved: use `jsr:@b-fuze/deno-dom`** (WASM backend, no FFI flags). Native Deno `globalThis.DOMParser` does not exist in Edge Functions; `linkedom` is a viable second choice but `deno-dom` is closer to the W3C API the existing svgValidator already targets. [VERIFIED: deno-dom GitHub README + Deno docs + Supabase docs on FFI restrictions]
- **DOMPurify in Deno is the trickiest dependency.** Pure `npm:dompurify` requires a DOM (not present in Deno bare). Recommended path: skip the DOMPurify byte-equality drift check (Rule 4 of svgValidator) **on the server side** by passing `opts.DOMPurify = null` and surfacing a warning, OR add a small adapter that gives DOMPurify a window via deno-dom. The simplest safe choice for Phase 177 is **skip Rule 4 server-side** because the same SVG will be re-sanitized at every render path on the client (templateApplyService.js:55) — the server just needs to gate structural validity. Document this as a deliberate skip with rationale. [VERIFIED: cure53 README — DOMPurify needs a DOM]
- **Anthropic SDK Deno usage is clean.** `import Anthropic from "npm:@anthropic-ai/sdk@0.95.0"` — SDK targets Web Fetch API and runs in Deno 1.28+ without polyfills. Built-in retry (2× exponential) covers 429/5xx; structured-output via tool-use `input_schema` is the canonical Haiku 4.5 pattern (Anthropic's `output_config` JSON-schema parameter is also supported as of 2026 but requires the latest SDK). [VERIFIED: Context7 anthropic-sdk-typescript helpers.md + npm version 0.95.0]

**Primary recommendation:** Plan a **mandatory Wave 0 spike** (~2 hours) that deploys a minimal Edge Function containing the trio `npm:@anthropic-ai/sdk` + `jsr:@b-fuze/deno-dom` + `npm:@resvg/resvg-wasm`, calls Anthropic with a known-good system prompt, runs svgValidator with injected DOMParser, rasterizes the result, and returns it. This is the only credible way to derisk the three Deno-compat unknowns (DOMParser, resvg, anthropic) before committing to any other Phase 177 wave. Phase 176-SUMMARY already flagged the DOMParser piece; the resvg-wasm and anthropic-sdk pieces are in the same risk bucket.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TGEN-01 | End-to-end pipeline (admin prompt → LLM → validator → queue → approve → published) | §"Per-Requirement Implementation Notes" + §"Deno-Specific Constraints" |
| TGEN-02 | Auto-retry up to 2× on validator fail with error feedback to LLM | §"Per-Requirement: TGEN-02" + Pitfall A3 mitigation |
| TGEN-03 | Pipeline gated to admin role; no public Edge Function endpoint | §"Per-Requirement: TGEN-03" + admin-gate code pattern |
| TGEN-04 | LLM API credentials server-side only; rotation procedure documented | §"Per-Requirement: TGEN-04" |
| TGEN-05 | svgValidator runs at INGEST boundary (before INSERT) | §"Per-Requirement: TGEN-05" + Pitfall A1 alignment |
| TGEN-06 | Per-template-type prompt library; ≥30pp first-pass improvement | §"Per-Requirement: TGEN-06" + §"Validation Architecture" A/B subsection |
| TADM-01 | AdminTemplateQueuePage lists pending drafts with thumbnail + prompt | §"Per-Requirement: TADM-01" |
| TADM-02 | Per-draft Approve / Edit / Reject actions | §"Per-Requirement: TADM-02" + §"Existing-Code Inspection" Edit-flow note |
| TADM-03 | Approve rasterizes PNG, uploads to S3, flips published, surfaces in gallery_templates | §"Per-Requirement: TADM-03" + §"Deno-Specific Constraints" resvg-wasm |
| TADM-04 | Page gated to admin; non-admin gets 403/redirect | §"Per-Requirement: TADM-04" + adminToolPages pattern |
</phase_requirements>

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: Single combined page `AdminTemplateQueuePage` at route `admin-template-queue` with two tabs — **Generate** (prompt entry + example-prompt cards) and **Pending** (queue list). Single new route, single nav entry, single React component tree. Shared state because both tabs operate on the same `template_drafts` table.
- **D-02**: Generate tab UI mirrors OptiSigns `/ai` "Explore AI Prompts" pattern — vertical dropdown (`Restaurants` / `Retail` / `Healthcare` / `Cross-vertical`), template-type dropdown (`Menu` / `Promo` / `Announcement` / `Reminder` / `Wayfinding` / `Health Tip`), freeform prompt textarea, card grid showing one example per (template-type × vertical). Click card → pre-fills.
- **D-03**: Pending tab lists `template_drafts` rows where `status IN ('pending', 'needs_human_review')`, ordered by `created_at DESC`. Each row renders inline preview (sanitized via DOMPurify with `USE_PROFILES: { svg: true, svgFilters: true }`), originating prompt, vertical, template type, retry count, and three actions: **Approve / Edit / Reject**. `needs_human_review` drafts are visually flagged.
- **D-04**: Edit reuses `AdminEditTemplatePage` extended with `?draftId=X` URL param. Save → "Save & Publish" runs the same approve path. **Fallback for the planner:** clone-then-redirect (clone draft to `svg_templates` with `is_active=false`, navigate to existing editor, use existing publish toggle). [SEE §"Existing-Code Inspection" — this research recommends the planner switch to the fallback path.]
- **D-05**: Add `'needs_human_review'` to `template_drafts.status` CHECK via Phase 177's own atomic migration. DROP-then-ADD pattern.
- **D-06**: Failed-attempt audit data → `metadata.validator_failures` JSONB array. Per-entry shape: `{ attempt, model_id, errors[], warnings[], raw_svg_excerpt (≤500 chars), prompt_used, ts (ISO8601) }`.
- **D-07**: Approve/reject audit fields in `metadata.reviewed_by`, `metadata.reviewed_at`, `metadata.rejected_reason`. No new columns.
- **D-08**: Source-of-truth prompt library = JS data module at `src/services/aiTemplate/promptLibrary.js` + parallel TS copy at `supabase/functions/generate-svg-template/prompts.ts`. Synchronization enforced by Vitest equality test.
- **D-09**: Prompt entry shape: `{ id, template_type, vertical, label, example_freeform, system_prompt }`. Edge Function picks by `(template_type, vertical)` → falls back to `vertical=null`.
- **D-10**: ≥6 prompts at ship (one per template_type, `vertical=null` acceptable for v1). Per-vertical specialization is incremental.
- **D-11**: Vertical required at generate time (3 enums + Cross-vertical → NULL).
- **D-12**: A/B harness = one-off `scripts/eval-prompt-library.cjs`, NOT CI. 5 generations × 6 types × 2 conditions = 60 calls, ~$0.63/run.
- **D-13**: Threshold = ≥30pp improvement first-pass validator success. Tunable on first measurement.
- **D-14**: Generation UX is synchronous v1 (~30s wait, hint shown). Batch API deferred.
- **D-15**: Rasterization in same Edge Function on Approve. `npm:@resvg/resvg-js` per CONTEXT — but see §"Deno-Specific Constraints" for the corrected library.
- **D-16**: `ANTHROPIC_MODEL_ID` env var; default `claude-haiku-4-5-20251001`; Edge Function fails fast if missing.
- **D-17**: Pre-implementation Wave 0: Deno DOMParser smoke test for `svgValidator` injection.
- **D-18**: Double-defense admin gate — Edge Function `is_admin(uid) OR is_super_admin(uid)` + RLS already locked from Phase 176.
- **D-19**: Per-admin / per-day rate limit OUT of scope for Phase 177; tracked as v21.x.

### Claude's Discretion

- Single tabbed page over two pages (D-01)
- `?draftId=` extension over clone-then-redirect (D-04, with fallback)
- Source-file storage over DB table (D-08)
- 30pp threshold over 20pp/40pp (D-13)
- Synchronous over async/batch UX (D-14)
- Same-EF rasterization (D-15)
- Snapshot-pinned model ID (D-16)

### Deferred Ideas (OUT OF SCOPE)

- TGEN-F2 daily generation cap (Pitfall A4) — v21.x
- TGEN-F3 image upload as input — v22.0
- Anthropic Batch API for bulk seeding — usable in Phase 178, not 177
- Full 6×4 prompt matrix (per-vertical specialization) — incremental during Phase 178
- Per-attempt CI eval suite — v21.x or v22.0
- Detail-modal "See More Like This" — v22.0
- Self-serve AI generation for end users — explicit out-of-milestone

---

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` exists in the repo. Constraint set is implicit, drawn from prior phase patterns:
- React 19 + Vite SPA, plain CSS / Tailwind classes (no UI framework adds)
- Supabase JS v2 client; service-role usage server-side only
- Pure-function services (no React in `src/services/`); injectable validators
- Atomic migrations with `DO $$ ASSERT $$` self-verification
- DOMPurify config locked at `{ USE_PROFILES: { svg: true, svgFilters: true } }` byte-for-byte across `svgValidator.js` and `templateApplyService.js:55`
- Skip-guarded integration tests via `describe.runIf(SHOULD_RUN)` + deferred `createClient` into `beforeAll`
- No `cat`/`heredoc` for file creation — use Write tool
- Page registration via `App.jsx` `lazy()` import + `pageMap` entry + `adminToolPages` allowlist (string-based currentPage routing — no React Router params)

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin form + queue UI | Browser (React) | — | Admin-only React page, no SSR in this stack |
| LLM call (Anthropic) | API (Edge Function/Deno) | — | API key must never reach the client; Pitfall A2 + STACK.md |
| svgValidator at ingest | API (Edge Function/Deno) | Browser (mirror) | Pitfall A1 — gate before INSERT, not at publish |
| Auto-retry with error feedback | API (Edge Function/Deno) | — | Inside the same handler request lifecycle |
| `template_drafts` INSERT | Database (Postgres + RLS) | — | RLS double-defense (Phase 176 locked) |
| Rasterize SVG → PNG (on Approve) | API (Edge Function/Deno, WASM) | — | Same EF (D-15); no browser bundle bloat |
| S3 PNG upload | API (Edge Function/Deno) | — | Service-role S3 creds server-side |
| `svg_templates` INSERT (Approve) | Database (Postgres + RLS) | — | Atomic with rasterize+upload in same handler call |
| Inline draft preview (sanitized) | Browser (React + DOMPurify) | — | Already render in DOM; sanitize before innerHTML/dangerouslySetInnerHTML |
| Admin auth gate (UI) | Browser (`adminToolPages` allowlist) | API (Edge Function `is_admin()` check) | Defense in depth — UI hides nav, EF rejects 403 |
| Prompt library (source of truth) | Repo (frontend + EF parallel files) | — | D-08 locked; Vitest equality test enforces sync |

---

## Standard Stack (Phase 177)

### New Dependencies

| Library | Version | Location | Purpose |
|---------|---------|----------|---------|
| `npm:@anthropic-ai/sdk` | `^0.95.0` | Edge Function (Deno) | Claude Haiku 4.5 client; Web Fetch-based, Deno 1.28+ compatible [VERIFIED: npm view + Context7] |
| `jsr:@b-fuze/deno-dom` | latest stable | Edge Function (Deno) | DOMParser shim for svgValidator Rule 1 (`parseFromString(svg, 'image/svg+xml')`) [VERIFIED: GitHub README + Deno docs] |
| `npm:@resvg/resvg-wasm` | `^2.6.2` | Edge Function (Deno) | SVG → PNG rasterization (WASM, NOT the napi-rs `@resvg/resvg-js`) [CITED: https://supabase.com/docs/guides/functions/examples/image-manipulation] |

### Already-Installed (no new install for Phase 177's frontend)

| Library | Version | Used For |
|---------|---------|----------|
| `dompurify` | existing | Inline draft preview sanitization (D-03) |
| `@resvg/resvg-js` | `^2.6.2` | Existing thumbnail-rasterization Node CLI script (kept; only the Edge Function uses the WASM variant) |
| `@supabase/supabase-js` | v2 | Frontend invoke + service-layer fetch |
| `vitest` | v4 | Wave 0 RED tests + integration tests |

### Versions Verified

```bash
$ npm view @anthropic-ai/sdk version          # → 0.95.0
$ npm view @resvg/resvg-wasm version          # → 2.6.2
$ npm view @resvg/resvg-js version            # → 2.6.2 (used by existing Node CLI only)
```

### Installation Plan

```bash
# Step 1 — Frontend dep added to root package.json
# (No new frontend deps needed for Phase 177; DOMPurify already installed)

# Step 2 — Edge Function deps (per-function deno.json)
# File: supabase/functions/generate-svg-template/deno.json
{
  "imports": {
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@0.95.0",
    "@b-fuze/deno-dom": "jsr:@b-fuze/deno-dom@^0.1.48",
    "@resvg/resvg-wasm": "npm:@resvg/resvg-wasm@^2.6.2",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2"
  }
}

# Step 3 — Bundle WASM binary for resvg-wasm
# File: supabase/config.toml
[functions.generate-svg-template]
static_files = [ "./supabase/functions/generate-svg-template/index_bg.wasm" ]
```

[CITED: https://supabase.com/docs/guides/functions/wasm — `static_files` config + Supabase CLI ≥2.7.0 + Docker deploy required]

---

## Architecture Patterns

### System Architecture Diagram

```
GENERATE TAB (Browser)            APPROVE/REJECT (Browser)         EDGE FUNCTION (Deno)
─────────────────────             ────────────────────────         ─────────────────────
AdminTemplateQueuePage            AdminTemplateQueuePage           generate-svg-template
   │ (Generate tab)                  │ (Pending tab)                  │
   │ form: vertical, type, prompt    │ row actions:                   │ admin gate
   │                                  │   Approve / Edit / Reject     │ ┌───────────┐
   ▼                                  │                                ▼ │           │
supabase.functions.invoke          supabase.functions.invoke         is_admin()
   'generate-svg-template'           'generate-svg-template'           OR
   (action: 'generate')              (action: 'approve' | 'reject')   is_super_admin()
   │                                  │                                │           │
   ▼                                  ▼                                │ ┌──────┐  │
Edge Function (action=generate)    Edge Function (action=approve)      │ │ NO   │ ─┼─→ 403
   │                                  │                                │ └──────┘  │
   │ [Wave 0 spike — verify           │  ┌── load draft from           │           │
   │  npm:@anthropic-ai/sdk in Deno]  │  │   template_drafts            │ YES        │
   │                                  │  │                               │           │
   │ build system_prompt              │  ├── @resvg/resvg-wasm           ▼           │
   │   (template_type, vertical)      │  │   rasterize → PNG ───→ S3 PUT             │
   │                                  │  │                                            │
   │ POST anthropic.messages.create   │  ├── INSERT svg_templates                    │
   │   model: ANTHROPIC_MODEL_ID      │  │     (is_active=true, vertical, …)         │
   │   tools: [{ generate_svg }]      │  │                                            │
   │                                  │  └── UPDATE template_drafts                  │
   │ extract svg from tool_use        │      SET status='approved',                  │
   │                                  │          metadata.reviewed_by=uid             │
   │ injectable svgValidator(svg, {   │                                              │
   │   DOMParserCtor: deno-dom DOMParser})  ┌── (action=reject)                      │
   │                                  │     UPDATE template_drafts                   │
   │ retry loop (max 2 retries):      │     SET status='rejected', metadata…         │
   │   if !ok and retries<2:          │                                              │
   │     append validator errors to   │                                              │
   │     prompt; re-call Claude       │                                              │
   │                                  │                                              │
   │ on 3 failures:                   │                                              │
   │   INSERT template_drafts(        │                                              │
   │     status='needs_human_review',  │                                              │
   │     metadata.validator_failures) │                                              │
   │                                  │                                              │
   │ on 1+ pass:                      │                                              │
   │   INSERT template_drafts(        │                                              │
   │     status='pending',             │                                              │
   │     svg_content)                  │                                              │
   │                                  │                                              │
   ▼                                  │                                              │
Response: { draftId, status,         │                                              │
            warnings, attempts }      │                                              │
```

### Recommended Project Structure

```
supabase/
├── config.toml                       # add [functions.generate-svg-template] static_files block
└── functions/
    └── generate-svg-template/
        ├── deno.json                 # imports map (npm:/jsr:)
        ├── index.ts                  # Deno.serve handler — admin gate, dispatch on action
        ├── prompts.ts                # parallel copy of src/services/aiTemplate/promptLibrary.js
        ├── svgValidator.ts           # ports the JS validator's pure-function logic OR imports the JS
        ├── handlers/
        │   ├── generate.ts           # LLM + validator + retry loop
        │   ├── approve.ts            # rasterize + S3 + INSERT svg_templates + UPDATE draft
        │   └── reject.ts             # UPDATE draft only
        ├── deno-dom-domparser.ts     # the chosen DOMParser shim ctor
        └── resvg-wasm-init.ts        # initWasm() + rasterize() helper
src/
├── services/
│   └── aiTemplate/
│       ├── promptLibrary.js          # 6+ entries, source of truth (D-08)
│       └── templateDraftsService.js  # NEW — fetch pending, invoke EF for approve/reject
├── pages/
│   └── Admin/
│       └── AdminTemplateQueuePage.jsx  # NEW — D-01 single tabbed page
└── components/
    └── Admin/
        └── PromptLibraryCardGrid.jsx   # NEW — OptiSigns-mirror card grid (D-02)
scripts/
└── eval-prompt-library.cjs            # NEW — D-12 A/B harness (60 calls, ~$0.63/run)
supabase/migrations/
└── 177_template_drafts_needs_human_review.sql  # NEW — D-05 status enum extension
tests/
├── integration/
│   ├── promptLibraryParity.test.js     # D-08 Vitest equality test
│   ├── generateSvgTemplate.test.js     # EF integration test (skip-guarded)
│   └── approveDraftPipeline.test.js    # EF approve-path integration test (skip-guarded)
└── unit/
    └── svgValidatorDeno.test.js        # If we port to Deno, mirror Node tests with deno-dom ctor
```

### Pattern 1: Edge Function admin gate (NEW for this codebase)

**What:** Verify caller JWT, check `is_admin() OR is_super_admin()`, return 403 on miss.
**When to use:** Every Phase 177 EF action (`generate`, `approve`, `reject`).

```typescript
// supabase/functions/generate-svg-template/index.ts
// Source: https://supabase.com/docs/guides/functions/auth (verbatim Authorization-header forwarding pattern)
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  // Caller-scoped client (forwards JWT — RLS evaluates as the caller)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Path 1 — call SQL helpers directly (cheapest, single round trip)
  const { data: isAdminRow } = await supabase.rpc('is_admin');
  const { data: isSuperRow } = await supabase.rpc('is_super_admin');
  if (!isAdminRow && !isSuperRow) {
    return new Response('Forbidden — admin only', { status: 403 });
  }

  // ...continue to action dispatch
});
```

**Note on RPC vs SQL:** `is_admin()` and `is_super_admin()` are SECURITY DEFINER SQL functions in the public schema (defined in migrations 009/012, used by migration 102/176). They are callable via `supabase.rpc('is_admin')` from a JWT-scoped client and evaluate against `auth.uid()` of the caller. [VERIFIED: `grep is_admin supabase/migrations/`]

### Pattern 2: Anthropic call with structured-output via tool_use (Deno)

**What:** Force Claude to emit SVG as the parameter of a tool, eliminating free-text parsing.
**When to use:** Every generate call.

```typescript
// supabase/functions/generate-svg-template/handlers/generate.ts
// Source: https://github.com/anthropics/anthropic-cookbook/blob/main/tool_use/extracting_structured_json.ipynb
import Anthropic from 'npm:@anthropic-ai/sdk@0.95.0';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
const modelId = Deno.env.get('ANTHROPIC_MODEL_ID');
if (!modelId) throw new Error('ANTHROPIC_MODEL_ID env var required (D-16 fail-fast)');

const response = await anthropic.messages.create({
  model: modelId,
  max_tokens: 4096,
  tools: [{
    name: 'emit_svg_template',
    description: 'Emit a single complete SVG template per the system prompt rules.',
    input_schema: {
      type: 'object',
      properties: {
        svg: { type: 'string', description: 'A single complete <svg>...</svg> string.' },
        rationale: { type: 'string', description: 'One-line rationale, ≤200 chars.' },
      },
      required: ['svg'],
    },
  }],
  tool_choice: { type: 'tool', name: 'emit_svg_template' },
  system: systemPrompt,                    // from promptLibrary by (template_type, vertical)
  messages: [{ role: 'user', content: adminFreeformPrompt }],
});

// Extract SVG from tool_use block (NOT from text)
const toolUseBlock = response.content.find((c: any) => c.type === 'tool_use');
const generatedSvg: string = toolUseBlock?.input?.svg ?? '';
```

**Why tool-use over `output_config.format`:** As of late 2026 the SDK supports `output_config.format` JSON-schema mode for guaranteed schema adherence on Haiku 4.5, but the SDK shape is still settling. Tool-use (`tools` + `tool_choice`) is the battle-tested pattern documented in the Anthropic cookbook and is identical in behavior for this single-string output case. It also lets the planner add structured fields later (e.g., `vertical_inferred`, `width`, `height`) without changing the response-extraction code.

[VERIFIED: Context7 anthropic-sdk-typescript helpers.md + Anthropic cookbook tool_use/extracting_structured_json.ipynb]

### Pattern 3: svgValidator with injected Deno DOMParser

**What:** Reuse the existing Node-friendly `validateSvg(svg, opts)` exactly, injecting `deno-dom`'s DOMParser.
**When to use:** Every Edge Function generate-call iteration before the INSERT.

```typescript
// supabase/functions/generate-svg-template/handlers/generate.ts
import { DOMParser } from 'jsr:@b-fuze/deno-dom';     // WASM backend — NO ffi flags needed
// Option A — port svgValidator.js to TypeScript here
// Option B — bundle the JS file into the EF (Deno supports JS imports)
import { validateSvg } from '../svgValidator.ts';

const result = validateSvg(generatedSvg, {
  DOMParserCtor: DOMParser,
  DOMPurify: null,                          // see §"Deno-Specific Constraints" — Rule 4 skipped server-side
});
// result.ok / result.errors / result.warnings
```

**deno-dom note:** `jsr:@b-fuze/deno-dom` (WASM backend) provides `parseFromString(svg, 'image/svg+xml')` with `querySelector('parsererror')` semantics that match the existing validator's expectations. The native backend (`jsr:@b-fuze/deno-dom/native`) is faster but requires `--unstable-ffi --allow-ffi` which Supabase Edge Functions don't grant. [VERIFIED: deno-dom GitHub README + Supabase Edge Function permission docs]

### Pattern 4: @resvg/resvg-wasm initialization + render

**What:** Initialize the WASM module once per cold start, then call `Resvg(svg).render().asPng()` per request.
**When to use:** Every Approve action.

```typescript
// supabase/functions/generate-svg-template/resvg-wasm-init.ts
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@^2.6.2';

// Cold-start init: bundle the .wasm via supabase/config.toml static_files
let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    // The .wasm file is bundled and accessible via the function's static_files mount
    const wasmBytes = await Deno.readFile(new URL('./index_bg.wasm', import.meta.url));
    wasmReady = initWasm(wasmBytes);
  }
  return wasmReady;
}

export async function rasterize(svg: string, { width, height }: { width: number; height: number }) {
  await ensureWasm();
  const useWidthFit = width >= height;
  const resvg = new Resvg(svg, {
    fitTo: useWidthFit ? { mode: 'width', value: width } : { mode: 'height', value: height },
    background: 'rgba(255,255,255,1)',
    font: { loadSystemFonts: false }, // WASM has no system fonts — pre-bundle if needed
  });
  return resvg.render().asPng();           // Uint8Array
}
```

**The font caveat is significant.** `@resvg/resvg-wasm` runs in WASM and has no access to system fonts. Templates with `<text>` referring to system fonts (Helvetica, Arial, etc.) will rasterize with fallback geometry. Mitigations:
- **Recommended for Phase 177:** require system prompt to instruct Claude to use SVG `<text>` elements with explicit `font-family="sans-serif"` (CSS generic) or to use `<path>` glyphs (no fonts needed). Document in the prompt-library system_prompt.
- **Alternative (deferred):** bundle a lightweight font (e.g., `Inter-Variable.woff2`) into static_files and pass `Resvg({ font: { fontFiles: [bundled_path] } })`.

[CITED: @resvg/resvg-wasm npm + supabase/functions/wasm Supabase docs]

### Anti-Patterns to Avoid

- **`@resvg/resvg-js` in the Edge Function** — it's N-API/native and will crash at runtime in the Supabase Deno runtime. The Node CLI (`scripts/generate-template-thumbnails.cjs`) keeps `@resvg/resvg-js`; the Edge Function uses `@resvg/resvg-wasm`. Two libraries, two contexts. [CITED: Supabase docs + dev.to Supabase npm-compat post]
- **`globalThis.DOMParser` in Deno** — the global doesn't exist in Edge Functions. Always inject `deno-dom`'s DOMParser via the existing `opts.DOMParserCtor` escape hatch.
- **DOMPurify with no DOM** — `npm:dompurify` requires a `window` global. Don't try to call it server-side without a DOM polyfill (jsdom doesn't run in Deno cleanly). Plan A: skip Rule 4 server-side. Plan B: feed the deno-dom-built document into a custom adapter — large engineering work, not worth it for Phase 177.
- **Free-text SVG parsing from LLM response** — always use `tools` + `tool_choice` (or `output_config.format`) to get the SVG as a discrete field, never as the body of `content[0].text`. (Pitfall A4 — structured output ≠ valid SVG, but it gives the validator clean input.)
- **`?draftId=` URL param assumption** — `App.jsx` doesn't use URL params; it uses string-based `currentPage` state. See §"Existing-Code Inspection".
- **Hardcoded model ID string** — Pitfall A2; `ANTHROPIC_MODEL_ID` env var is mandatory (D-16) and the EF must fail fast at startup.
- **Custom retry-loop with no maximum** — Pitfall A3; cap at exactly 2 retries (3 total attempts) per generate call.
- **Persisting failed-attempt SVG bytes in `metadata`** — only the first 500 chars (D-06 schema) to keep the JSONB row small. The `raw_svg_excerpt` field is for human debugging, not re-generation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG XML parser | Custom regex / string-search | `jsr:@b-fuze/deno-dom` DOMParser | Edge cases: namespaces, CDATA, entities, nested SVG; existing svgValidator already targets the W3C DOMParser API |
| LLM HTTP client | Raw `fetch` to `api.anthropic.com` | `npm:@anthropic-ai/sdk@0.95.0` | Built-in 2× retry on 429/5xx, error type taxonomy (`Anthropic.APIError`, `Anthropic.RateLimitError`), structured-output helpers |
| SVG → PNG rasterizer | hand-rolled rasterizer or call out to ImageMagick | `npm:@resvg/resvg-wasm` | Font fallback, viewBox math, gradient/filter handling — all non-trivial; resvg is the de-facto standard |
| Admin gate | Frontend `useAdmin` hook check only | SQL helpers `is_admin()` / `is_super_admin()` invoked from EF | Server-side enforcement is mandatory (Pitfall: client-side gates are bypassable) |
| JSON-mode prompt parsing | Regex-extract `<svg>...</svg>` from `content[0].text` | `tools` + `tool_choice` schema | Free-text parsing breaks on Claude's preamble/explanation; tool-use returns clean `tool_use.input.svg` |
| Per-attempt retry-with-feedback | Custom backoff logic | The retry loop is the only place you write yourself; the SDK retry covers transient errors. Validator-feedback retries are application logic. | But cap at 2 retries hard (D-12) and persist each attempt to `metadata.validator_failures` |
| Multipart S3 upload | Custom S3 SDK in Deno | Existing `/api/media/presign` route + PUT (same as `scripts/generate-template-thumbnails.cjs`) | Reuses presign pattern; service-role creds stay server-side |
| Inline draft preview sanitization | Allowlist regex | `dompurify` (already installed) with the locked `USE_PROFILES` config | DOMPurify is the project-wide canonical sanitizer; mismatched configs are Pitfall 5 |

**Key insight:** This phase has 7 places to lean on existing infra and 0 places to write new core algorithms. The novel work is glue (Edge Function structure, retry loop, queue UI), not crypto/parsing/rasterization.

---

## Common Pitfalls

### Pitfall 1: Edge Function cold-start time

**What goes wrong:** Cold-start of an Edge Function with `npm:@anthropic-ai/sdk` + `npm:@resvg/resvg-wasm` + `jsr:@b-fuze/deno-dom` can take 1.5-3s on first invocation due to bundle size + WASM init. The user sees a 30-second "generating" UI but the first half-second is just module load.
**Why:** Supabase bundles npm: imports at deploy time but WASM files still need first-call decoding.
**Avoid:** Initialize `resvg-wasm` lazily inside `ensureWasm()` (Pattern 4). Keep cold-start non-blocking by NOT initializing WASM at top-level. Document expected p50/p95 in `177-VERIFICATION.md`.
**Warning sign:** First admin generation feels much slower than subsequent ones — that's expected; warm calls drop to ~10s.

### Pitfall 2: `fontsLoadSystemFonts: true` in Deno

**What goes wrong:** `@resvg/resvg-wasm` ignores `loadSystemFonts: true` (no system fonts in WASM sandbox); text in generated PNGs falls back to a default glyph and looks wrong.
**Why:** WASM has no Deno FFI to read fonts.
**Avoid:** Set `loadSystemFonts: false` and require Claude to use generic font families (`sans-serif`, `serif`, `monospace`) in the system prompt. If a Phase-178 batch needs branded fonts, bundle a `.woff2` and pass `font.fontFiles`.
**Warning sign:** Approved templates' PNG thumbnails show garbled or fallback fonts vs the inline SVG preview.

### Pitfall 3: DOMPurify drift on the server side

**What goes wrong:** The svgValidator Rule 4 byte-equality drift check (`{ USE_PROFILES: { svg: true, svgFilters: true } }`) requires `purifier.sanitize(...)` to actually run. Server-side it's a no-op (DOMPurify needs a DOM); the validator silently emits a warning ("DOMPurify unavailable — sanitization check skipped") rather than failing.
**Why:** `purifier && typeof purifier.sanitize === 'function'` short-circuit in `svgValidator.js:124`.
**Avoid:** Document the deliberate server-side skip in the EF source comment AND in the Vitest test that asserts validator behavior. The client-side render path (Pending tab inline preview, AdminEditTemplatePage editor) still runs DOMPurify with the locked config — ingest is gated by structural rules; rendering is sanitized by DOMPurify. This is acceptable defense-in-depth.
**Warning sign:** Reviewer flags "we're not running DOMPurify on AI output before INSERT" — counter: "we don't render AI output before INSERT either; the Pending-tab preview is the first render and it sanitizes".

### Pitfall 4: `template_drafts.status` CHECK already includes 'needs_human_review'

**What goes wrong:** Migration 176 (already applied) **already includes** `'needs_human_review'` in the status CHECK. D-05's "Phase 177 own migration" is a redundant migration.
**Why:** Phase 176 author preempted the value. Verified: `supabase/migrations/176_template_drafts_and_vertical.sql` line 62 — `CHECK (status IN ('pending', 'needs_human_review', 'approved', 'rejected'))`.
**Avoid:** Planner should choose ONE of: (a) skip the Phase 177 migration entirely (the value already exists; D-05's intent is satisfied) and document in the migration plan that "Phase 176 preempted this value", OR (b) ship the migration as a no-op idempotent ALTER (DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT with the same predicate) for documentation/audit-trail purposes.
**Warning sign:** Plan 01 writes a fresh migration that fails to add the value (idempotent CHECK already there) and the DO ASSERT incorrectly claims to have added it.
[VERIFIED: re-read of `176_template_drafts_and_vertical.sql:57-62`]

### Pitfall 5: AdminEditTemplatePage operates on Polotno templates, not SVG

**What goes wrong:** D-04 assumes `AdminEditTemplatePage` is the right editor to extend with `?draftId=`. It's not — it edits `template_library` (Polotno) rows via `marketplaceService.fetchTemplateDetail/createTemplate/addTemplateSlide`. It has no code path that reads `svg_content` from `svg_templates` or any equivalent for `template_drafts`.
**Why:** AdminEditTemplatePage was built in v2.0 for the Polotno marketplace. Phase 177's drafts are **SVG content** (text), not Polotno design JSON. Different schema, different services, different render path.
**Avoid:** Planner picks D-04's documented **fallback** (clone-then-redirect) — and even that won't work because `svg_templates` has no equivalent edit page in this codebase (no admin SVG editor exists). Realistic recommendation: build an inline edit affordance on the Pending-tab row (textarea + re-validate button + Save) for v1; defer a full SVG admin editor to v22.0.
**Warning sign:** The planner writes a task to "extend AdminEditTemplatePage with `?draftId=` param" and the implementer can't find the data-load shape that matches the draft schema.
[VERIFIED: read of `AdminEditTemplatePage.jsx:1-50,90-200` showing `marketplaceService` imports and `template_library`-shaped form fields]

### Pitfall 6: App.jsx routing has no URL params

**What goes wrong:** `App.jsx` uses `useState('dashboard')` + `currentPage.startsWith('admin-template-')` for routing. There's no React Router param system.
**Why:** Project chose page-state-as-routing in v1; preserved through v20.0.
**Avoid:** Replace D-04's `?draftId=X` URL-param idea with `currentPage = 'admin-edit-draft-<id>'` string state — matches the existing `'admin-template-<id>'` pattern. See §"Existing-Code Inspection: AdminEditTemplatePage extensibility verdict" below.

### Pitfall 7: `ANTHROPIC_API_KEY` is in `.env.example` but is NOT set as a Supabase secret

**What goes wrong:** The key is documented at `.env.example:163` (per ARCHITECTURE.md) but no Supabase secret of that name has been set on the live project — there are no Edge Functions yet to consume it.
**Why:** Existing `autoTaggingService.js` calls `/api/ai/generate-tags` which routes to a disabled Vercel route.
**Avoid:** Plan 01 (or pre-Wave-0) MUST include a `supabase secrets set ANTHROPIC_API_KEY=…` step + `supabase secrets set ANTHROPIC_MODEL_ID=claude-haiku-4-5-20251001`. Add a fail-fast check at EF top-level for both env vars.

### Pitfall 8: prompt-library parity test is non-trivial in Vitest

**What goes wrong:** D-08 mandates a Vitest test that asserts `src/services/aiTemplate/promptLibrary.js` and `supabase/functions/generate-svg-template/prompts.ts` are byte-equal data. Vitest can import the JS file natively but importing TS-from-EF is awkward (different tsconfig roots).
**Avoid:** Two approaches that work:
1. Make the EF copy a `.json` file (dropping TS) so Vitest can `import promptsJson from "../../supabase/functions/generate-svg-template/prompts.json" assert { type: "json" }` and the EF can `import prompts from "./prompts.json" with { type: "json" }`. Cleanest.
2. Keep `prompts.ts` and read it as text: `const tsSource = await fs.readFile(EF_PROMPTS_PATH, 'utf8')` then deserialize via a tiny parser. Brittle.
**Recommendation:** approach 1 (JSON). Update D-08 in 177-CONTEXT-AMENDMENTS section if desired; otherwise plan around it.

---

## Existing-Code Inspection

### AdminEditTemplatePage extensibility — VERDICT: NOT extensible for D-04 as written

**Evidence:**
- File: `src/pages/Admin/AdminEditTemplatePage.jsx` lines 1-50
- Imports: `fetchTemplateDetail`, `createTemplate`, `updateTemplate`, `addTemplateSlide`, `updateTemplateSlide`, `deleteTemplateSlide`, `reorderTemplateSlides`, `fetchEnterpriseAccess`, `grantEnterpriseAccess`, `revokeEnterpriseAccess`, `uploadTemplateThumbnail` — all from `marketplaceService` — **all operate on `template_library` (Polotno)**
- Form state shape (lines 43-54): `name, description, categoryId, templateType, license, industry, tags, isActive, isFeatured, thumbnailUrl` — there is **no `svg_content` field, no `vertical` field, no `prompt` field**
- Slide CRUD (lines 290-370): edits `template_library_slides.design_json` (Polotno design JSON), not SVG content
- The `metadata.svgContent` injection at line 152-156 is a **legacy Polotno-template-with-SVG-thumbnail metadata field**, not a primary edit path

**Implication for D-04:** Extending this page to read from `template_drafts` requires:
1. New imports from a new `templateDraftsService.js` (doesn't exist yet)
2. Branching every form field, save handler, slide CRUD path on a `?draftId` flag
3. Net result: ~400 LOC of conditional code in a 943 LOC file = tax exceeds the saving

**Recommendation to planner:** **Reject D-04 primary path.** Adopt the documented fallback:
- **Clone-then-redirect is also unworkable** because `svg_templates` has no equivalent admin edit page. The closest analogue is `BulkTemplateUpload.jsx` which is upload-only.
- **Concrete alternative:** Build a lightweight inline-edit affordance on the Pending-tab row. Modal with: read-only metadata (prompt, vertical, type), editable SVG `<textarea>`, "Re-validate" button, "Save & Publish" button (runs the same approve path). Adds ~200 LOC of new code instead of 400 LOC of conditional. Fits the page-with-modal-drilldown pattern already used by `AdminStarterPacksPage`.

The planner should call this out explicitly in `177-PLAN.md` Risks/Concerns and re-discuss with the user before Wave 1, per the CONTEXT.md instruction "If implementation reveals any of these are wrong, planner can flag in 177-PLAN.md Risks/Concerns and re-discuss before Wave 1." This is exactly that case.

### App.jsx integration points

**Three-line addition pattern is verified — but URL param assumption is wrong.**

```javascript
// Line 119-121 area — add lazy import
const AdminTemplateQueuePage = lazy(() => import('./pages/Admin/AdminTemplateQueuePage'));

// Line 577-578 area — add to pageMap
'admin-template-queue': <Suspense fallback={<PageLoader />}><AdminTemplateQueuePage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,

// Line 687-691 — add to adminToolPages allowlist
const adminToolPages = [
  'admin-tenants', 'admin-audit-logs', 'admin-system-events',
  'status', 'ops-console', 'tenant-admin', 'feature-flags', 'demo-tools', 'clients',
  'admin-templates', 'admin-starter-packs',
  'admin-template-queue',                    // ← NEW
];
```

**For "edit draft" navigation** — replace D-04's URL-param idea with string-based currentPage:
```javascript
// Line 1025 area — already has admin-template-{id} branch; add admin-edit-draft-{id} branch
} : currentPage.startsWith('admin-edit-draft-') ? (
  <Suspense fallback={<PageLoader />}>
    <AdminTemplateQueuePage
      showToast={showToast}
      onNavigate={setCurrentPage}
      editDraftId={currentPage.replace('admin-edit-draft-', '')}
    />
  </Suspense>
) : ...
```

(Or, with the modal-drilldown alternative recommendation: no new currentPage branch needed; the modal opens within `admin-template-queue`.)

[VERIFIED: read of App.jsx lines 100-121, 540-583, 687-691, 1015-1050]

### Existing Edge Function admin-gate pattern: NONE EXISTS

The `supabase/functions/` directory **does not exist in this repo**. Phase 177 creates it. The pattern documented in §"Architecture Patterns: Pattern 1" is synthesized from Supabase official docs + Phase 176's RLS verification (which proved `is_admin()` and `is_super_admin()` work on the live DB). No adoption-cost reference exists in-repo. This is fine — Pattern 1 is small and well-trodden — but it means Wave 0 has zero in-repo precedent to copy.

[VERIFIED: `ls /Users/massimodamico/bizscreen/supabase/functions/` → "No such file or directory"]

### svgValidator extensibility for Deno injection: CONFIRMED

`src/services/svgValidator.js` already accepts `opts.DOMParserCtor` (line 47) and `opts.DOMPurify` (line 123). The Edge Function can either:
- **Option A (recommended):** import the JS module directly. Deno supports `npm:` imports of plain JS, and the validator has no React/browser-specific deps once `dompurify` is replaced with `null`.
- **Option B:** port to TypeScript in `supabase/functions/generate-svg-template/svgValidator.ts`. More work, no behavior gain. Reject.

The Phase 175 design intent ("Run identically in browser and Node" — file header comment) extends naturally to Deno via the same injectable pattern.

[VERIFIED: read of `svgValidator.js:1-21,30-171`]

### Phase 176 Wave-0 RED test pattern: VERIFIED — copy this shape verbatim

The pattern is in `tests/integration/templateDraftsRls.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOULD_RUN = Boolean(URL && KEY);

describe.runIf(SHOULD_RUN)('Phase 177 — generate-svg-template EF integration', () => {
  let supa;
  beforeAll(() => { supa = createClient(URL, KEY); });
  afterAll(() => { /* no-op for now */ });

  it('rejects POST without admin JWT', async () => { /* ... */ });
  it('returns draftId on valid prompt + valid SVG', async () => { /* ... */ });
});
```

Three lessons from Phase 176-03-SUMMARY embedded in this shape:
1. `createClient` is **deferred into `beforeAll`** so suite-load doesn't crash when env is unset.
2. `describe.runIf(SHOULD_RUN)` skips the entire block cleanly.
3. dotenv loads `.env.local` THEN `.env` with override semantics matching the project standard.

[VERIFIED: read of `templateDraftsRls.test.js:20-58`]

### App.jsx pageMap precedent

The exact insert points and three-line pattern (lazy import + pageMap entry + adminToolPages append) are documented in CONTEXT.md and verified by reading the file. No surprises.

---

## Per-Requirement Implementation Notes

### TGEN-01: End-to-end pipeline operational

**Files to create:**
- `supabase/functions/generate-svg-template/index.ts` (~120 LOC) — Deno.serve handler with action-dispatch on `req.json().action ∈ {'generate','approve','reject'}`
- `supabase/functions/generate-svg-template/handlers/generate.ts` (~100 LOC) — system_prompt build + Anthropic call + validator + retry loop + INSERT
- `supabase/functions/generate-svg-template/svgValidator.ts` (~5 LOC re-export from JS, OR port)
- `supabase/functions/generate-svg-template/prompts.json` (D-08 — JSON, not TS, see Pitfall 8) — 6 entries
- `supabase/functions/generate-svg-template/deno.json` — npm:/jsr: imports map
- `supabase/config.toml` (modify) — add `[functions.generate-svg-template]` block

**SC verification:** ≥1 production-published template proves the path. Wave 0 spike + Wave 1 happy-path E2E fixture.

**Frontend:** `src/services/aiTemplate/templateDraftsService.js` (~80 LOC) wraps `supabase.functions.invoke('generate-svg-template', { body: { action: 'generate', vertical, template_type, prompt }})` with type-friendly response shape.

### TGEN-02: Auto-retry up to 2× with error feedback

**Implementation in `handlers/generate.ts`:**

```typescript
const MAX_RETRIES = 2;
const attempts: ValidatorFailure[] = [];
let svg = '';

for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
  const messages = attempts.length === 0
    ? [{ role: 'user' as const, content: adminPrompt }]
    : [
        { role: 'user' as const, content: adminPrompt },
        { role: 'assistant' as const, content: `(previous attempt's SVG was rejected by validator)` },
        { role: 'user' as const, content:
          `The previous SVG had these validator errors:\n${attempts.at(-1)!.errors.join('\n')}\n` +
          `Regenerate addressing each error specifically. Output a complete corrected SVG.` },
      ];
  const response = await anthropic.messages.create({ model: modelId, system: systemPrompt, messages, tools, tool_choice });
  svg = extractSvg(response);
  const result = validateSvg(svg, { DOMParserCtor: DOMParser, DOMPurify: null });
  if (result.ok) break;
  attempts.push({
    attempt, model_id: modelId, errors: result.errors, warnings: result.warnings,
    raw_svg_excerpt: svg.slice(0, 500), prompt_used: messages.at(-1)!.content as string, ts: new Date().toISOString(),
  });
}

const finalStatus = attempts.length === MAX_RETRIES + 1 ? 'needs_human_review' : 'pending';
const metadata = { validator_failures: attempts, generated_by: callerUid, model_id: modelId, attempt_count: attempts.length + 1 };
const { data: draft } = await supabase.from('template_drafts').insert({
  svg_content: finalStatus === 'pending' ? svg : (attempts.at(-1)?.raw_svg_excerpt ?? ''),
  prompt: adminPrompt, source: 'ai_generation', status: finalStatus,
  vertical: verticalOrNull, metadata,
}).select('id').single();
```

**Note:** Pitfall A4 — even after 3 attempts the SVG might be invalid. We persist the latest excerpt for human review; the `needs_human_review` status flag tells the Pending tab to show the failure detail.

**SC verification:** Wave 0 RED test — mock Anthropic returns invalid SVG twice; assert metadata.validator_failures has 3 entries and status is 'needs_human_review'.

### TGEN-03: Pipeline gated to admin role

**Triple defense:**
1. **Frontend:** `admin-template-queue` joined to `adminToolPages` (App.jsx:687-691); non-admin users never see the page (no nav entry, no route reachable).
2. **Edge Function:** `is_admin() OR is_super_admin()` check at handler top (Pattern 1). 403 on miss.
3. **RLS:** `template_drafts_admin_only` policy already locked from Phase 176. Even if EF gate is bypassed (e.g., service-role compromise), RLS rejects from a non-admin context.

**SC verification:** Wave-3 negative-path test — non-admin POSTs to the EF with their JWT; assert 403 response and zero rows in `template_drafts` post-test.

### TGEN-04: LLM credentials server-side only

**Concrete checks:**
- `ANTHROPIC_API_KEY` set as Supabase secret (`supabase secrets set ANTHROPIC_API_KEY=…`); never exposed in `VITE_` prefix
- `ANTHROPIC_MODEL_ID` set as Supabase secret (D-16); fail-fast if absent
- Build-time grep: `grep -r "ANTHROPIC" dist/` produces zero matches (per SC #3 wording in ROADMAP)
- Rotation procedure documented in `STACK.md` notes (already locked there)

**SC verification:** Wave-3 negative test — `npm run build && grep -r ANTHROPIC dist/`; assert exit code 1 (no matches).

### TGEN-05: svgValidator at INGEST boundary

The retry-loop in TGEN-02 is the implementation. The validator runs 1-3 times **before** any INSERT into `template_drafts`. The INSERT only happens after the loop terminates (either success on attempts ≤ MAX or 3 failures → `needs_human_review`).

**SC verification:** Wave-0 unit test — mock Anthropic to return malformed SVG; assert `validateSvg` is called with the raw response BEFORE any `.from('template_drafts').insert(…)` call (use a Supabase-client mock with call-order assertion).

### TGEN-06: Per-template-type prompt library + ≥30pp improvement

**Library shape (`prompts.json`):**
```json
[
  {
    "id": "menu-cross-vertical-v1",
    "template_type": "menu",
    "vertical": null,
    "label": "Menu (any vertical)",
    "example_freeform": "Promote Mother's Day brunch special featuring mimosas and french toast.",
    "system_prompt": "You generate a single complete SVG digital-signage menu template. Rules:\n- viewBox required (1920x1080 landscape default)\n- No `currentColor` or `var(--*)` — use explicit hex (#RRGGBB)\n- At least one customization anchor: id=\"title\" or id=\"text-headline\" or [data-customize-color]\n- font-family: \"sans-serif\" (no system fonts)\n- Background visible (non-white fill on a root <rect>)\n- Output ONE complete SVG via the emit_svg_template tool."
  },
  ... // 5 more: promo, announcement, reminder, wayfinding, health_tip
]
```

**A/B harness (`scripts/eval-prompt-library.cjs`):**
- For each template_type ∈ {menu, promo, announcement, reminder, wayfinding, health_tip}:
  - For each condition ∈ {with-base-prompt, freeform-only}:
    - For 5 generations: invoke EF (or call Anthropic directly with same logic), capture `validator_first_pass_ok` boolean
- Aggregate to (with-prompt success rate) − (freeform-only success rate) per type, and overall
- Output `prompt-library-eval.md` with table + headline number

**Threshold proof:** ≥30pp improvement in first-pass `validator_ok` rate, aggregated across all 6 template types. ~$0.63/run; tunable on first measurement.

[See §"Validation Architecture" — A/B subsection — for sample-size analysis.]

### TADM-01: Pending tab lists drafts

**Component (`AdminTemplateQueuePage.jsx`):**
- Shell follows `AdminTemplatesPage`/`AdminStarterPacksPage` pattern: `PageLayout` chrome + tab bar + content area
- `<TabBar tabs={['Generate', 'Pending']} />`
- Pending tab: fetch on mount + on focus
  ```javascript
  const { data } = await supabase.from('template_drafts')
    .select('*')
    .in('status', ['pending', 'needs_human_review'])
    .order('created_at', { ascending: false });
  ```
- Each row renders: inline SVG preview (DOMPurify-sanitized via `dangerouslySetInnerHTML`), prompt (truncated), vertical chip, template_type chip, retry count badge (`metadata.attempt_count`), three action buttons
- `needs_human_review` rows: red border + "VALIDATOR FAILED — review errors" expand-to-show-`metadata.validator_failures[]`

### TADM-02: Per-row Approve / Edit / Reject

- **Approve:** `supabase.functions.invoke('generate-svg-template', { body: { action: 'approve', draftId } })` — Edge Function does rasterize + S3 + INSERT svg_templates + UPDATE draft
- **Edit:** Opens inline modal (per recommendation in §"Existing-Code Inspection") with editable `<textarea>` for `svg_content`, "Re-validate" button (calls EF action `validate-only`), "Save & Publish" button (calls EF action `approve` with overridden svg)
- **Reject:** Inline confirmation prompt asking for `rejected_reason` (free text); on confirm, `supabase.functions.invoke('generate-svg-template', { body: { action: 'reject', draftId, rejected_reason } })`

### TADM-03: Approve rasterizes + uploads + INSERTs

Already detailed in §"Architecture Patterns: Pattern 4". Atomic in the EF handler: rasterize → S3 PUT → INSERT svg_templates (with `vertical`, `is_active=true`, name/description/category derived from prompt+template_type+vertical) → UPDATE template_drafts.status='approved'.

**Failure handling:** if rasterize fails, return 500 and leave draft unchanged. If S3 upload fails, ditto. If `svg_templates` INSERT fails, also ditto. Don't write `template_drafts.status='approved'` until all three steps succeed. (This is a known EF non-transactionality risk; mitigation is each step is idempotent and admin can retry.)

### TADM-04: Page gated to admin

Already locked by joining `admin-template-queue` to `adminToolPages` allowlist (App.jsx:687-691). Non-admin users see no nav entry; direct currentPage assignment renders nothing because the role check upstream redirects.

**SC verification:** E2E test — sign in as non-admin, attempt to navigate to `admin-template-queue`, assert redirect to dashboard or 403.

---

## Deno-Specific Constraints (the heart of this research)

### Constraint 1: DOMParser injection — USE `jsr:@b-fuze/deno-dom`

**Question:** Does `globalThis.DOMParser` work in Supabase Edge Functions for `parseFromString(svg, 'image/svg+xml')`?

**Answer:** No. Deno's standard runtime does not include a built-in DOMParser. (Deno tracks issue [denoland/deno#3648](https://github.com/denoland/deno/issues/3648) for adding it; not delivered.) Use the `jsr:@b-fuze/deno-dom` WASM backend.

**Concrete code:**
```typescript
import { DOMParser } from 'jsr:@b-fuze/deno-dom';                  // WASM backend (no FFI flags)
// NOT: import { DOMParser } from 'jsr:@b-fuze/deno-dom/native';   // requires --unstable-ffi --allow-ffi (Supabase doesn't grant)

const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
const parserError = doc.querySelector('parsererror');             // null on success
const svgRoot = doc.querySelector('svg');
```

**Compatibility check:** the existing svgValidator uses these methods on the parsed doc — `doc.querySelector('parsererror')`, `doc.querySelector('svg')`, `svg.hasAttribute('viewBox')`, `doc.querySelector('image#logo')`, etc. All of these are W3C DOM API and supported by deno-dom WASM. [VERIFIED: GitHub `b-fuze/deno-dom` README + Deno docs]

**Wave 0 spike validates this** before any other code is written. Pass criteria: validator runs identically to Node-side behavior on a 5-fixture corpus (3 valid, 2 malformed).

### Constraint 2: SVG → PNG — USE `npm:@resvg/resvg-wasm`, NOT `@resvg/resvg-js`

**Question:** Does `npm:@resvg/resvg-js` work in Supabase Deno runtime?

**Answer:** Almost certainly not. Supabase docs explicitly state: *"Edge Functions currently doesn't support image processing libraries such as `Sharp`, which depend on native libraries. Only WASM-based libraries are supported."* [CITED: https://supabase.com/docs/guides/functions/examples/image-manipulation]

`@resvg/resvg-js` is the napi-rs (N-API) variant — native Rust binary loaded via Node-API. Supabase's Deno Edge runtime does not load N-API binaries the way Node does. The WASM variant `@resvg/resvg-wasm` is the documented choice for Edge Functions.

**Concrete code (initialization + render):**
```typescript
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@^2.6.2';

let initialized = false;
async function ensureInit() {
  if (initialized) return;
  // The .wasm binary must be bundled via supabase/config.toml static_files
  const wasm = await Deno.readFile(new URL('./index_bg.wasm', import.meta.url));
  await initWasm(wasm);
  initialized = true;
}

export async function rasterize(svg: string, opts: { width: number; height: number }) {
  await ensureInit();
  const useWidthFit = opts.width >= opts.height;
  const resvg = new Resvg(svg, {
    fitTo: useWidthFit
      ? { mode: 'width', value: opts.width }
      : { mode: 'height', value: opts.height },
    background: 'rgba(255,255,255,1)',
    font: { loadSystemFonts: false },         // WASM has no system fonts
  });
  return resvg.render().asPng();              // returns Uint8Array
}
```

**Bundling the .wasm:**
```toml
# supabase/config.toml
[functions.generate-svg-template]
static_files = [ "./supabase/functions/generate-svg-template/index_bg.wasm" ]
```

You must download `index_bg.wasm` from the npm package and place it next to `index.ts` (a Wave 0 task). [CITED: https://supabase.com/docs/guides/functions/wasm — `static_files` config + Supabase CLI ≥2.7.0 required, deploys via Docker, not `--use-api`]

**The font caveat applies:** see Pitfall 2. Mitigation: prompt-library system_prompts force `font-family="sans-serif"`.

### Constraint 3: Anthropic SDK — USE `npm:@anthropic-ai/sdk@0.95.0`

**Question:** Does `npm:@anthropic-ai/sdk` work cleanly in the Supabase Deno runtime?

**Answer:** Yes. The SDK targets the Web Fetch API (not Node-specific HTTP primitives) and supports Deno 1.28+. Built-in retry handles 429/connection/5xx with 2× exponential backoff. [VERIFIED: Context7 anthropic-sdk-typescript docs + DeepWiki SDK installation page]

**Concrete code:**
```typescript
import Anthropic from 'npm:@anthropic-ai/sdk@0.95.0';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

try {
  const msg = await client.messages.create({
    model: Deno.env.get('ANTHROPIC_MODEL_ID')!,           // 'claude-haiku-4-5-20251001'
    max_tokens: 4096,
    system: systemPrompt,
    tools: [{
      name: 'emit_svg_template',
      description: 'Emit a single complete SVG template per the system prompt rules.',
      input_schema: { type: 'object', properties: { svg: { type: 'string' } }, required: ['svg'] },
    }],
    tool_choice: { type: 'tool', name: 'emit_svg_template' },
    messages: [{ role: 'user', content: adminPrompt }],
  });
  const block = msg.content.find((c: any) => c.type === 'tool_use');
  const svg = block?.input?.svg ?? '';
  return svg;
} catch (e) {
  if (e instanceof Anthropic.RateLimitError) { /* surface 429 to caller */ }
  if (e instanceof Anthropic.APIError && e.status >= 500) { /* surface as transient */ }
  throw e;
}
```

[VERIFIED: Context7 helpers.md — error class taxonomy + retry semantics]

### Constraint 4: DOMPurify — RECOMMEND skipping Rule 4 server-side

**Question:** Does `npm:dompurify` work in Deno?

**Answer:** Not without a DOM. `dompurify` requires `window` + DOM tree to operate. The deno-dom WASM backend creates Document objects but doesn't provide the `window` global with `Node`/`HTMLElement` constructors that DOMPurify expects. `isomorphic-dompurify` exists for Node+jsdom; Deno is not a target. [VERIFIED: cure53 README + isomorphic-dompurify README]

**Recommended Phase 177 approach:** Pass `opts.DOMPurify = null` from the EF. The validator's Rule 4 silently skips with a warning ("DOMPurify unavailable — sanitization check skipped"), which is acceptable because:
1. The structural rules (1-3, 5, 6) catch malformed XML, dimensions, forbidden tokens, customization anchors, size — all the security-critical structural issues.
2. Rule 4's purpose is detecting DOMPurify-stripped content (drift), which is a **rendering-time** concern. The Pending-tab inline preview re-runs DOMPurify with the locked config; templateApplyService.js:55 also re-runs it at user-apply time. Multi-layer defense.
3. Adding a Deno DOMPurify polyfill is ~200-500 LOC of glue work for a Rule 4 byte-equality drift check that the client-side render path performs anyway.

**Alternative (deferred):** Use `linkedom` as a windowed-DOM provider:
```typescript
// import { parseHTML } from 'npm:linkedom';
// const { window } = parseHTML('<html></html>');
// import DOMPurify from 'npm:dompurify';
// const purifier = DOMPurify(window);
```
This may work but adds bundle size and a second DOM library. Document as a Phase 177 deferral; revisit if rendering drift becomes an audit issue.

### Constraint 5: Bundle size + cold-start

Combined npm:@anthropic-ai/sdk (~1MB) + jsr:@b-fuze/deno-dom WASM (~700KB) + npm:@resvg/resvg-wasm (~3MB) ≈ 4.7MB bundle. Edge Function cold-start with this bundle is in the 1.5-3s range based on Supabase's published Edge Functions perf characteristics. Warm-start is sub-100ms.

D-14 (synchronous UX with ~30s hint) is robust against this; document the cold-start in `177-VERIFICATION.md` so reviewer doesn't flag a "first call took 5s" anomaly as a regression.

---

## Validation Architecture

> Required for Nyquist gate (workflow.nyquist_validation absent → enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.0.14 (already installed; verified by 176-03-SUMMARY vitest output) |
| Config file | `vitest.config.js` (existing) |
| Quick run command | `npx vitest run --reporter=basic <file>` |
| Full suite command | `npm test` |
| EF integration test command | `npx vitest run tests/integration/generateSvgTemplate.test.js` (skip-guarded) |
| E2E command | `npx playwright test tests/e2e/admin-template-queue.spec.js` (Wave 5+) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TGEN-01 | EF returns draftId on valid generation | integration | `npx vitest run tests/integration/generateSvgTemplate.test.js -t "happy path"` | ❌ Wave 0 |
| TGEN-02 | EF retries 2× on validator fail; lands needs_human_review on 3 fails | integration | `npx vitest run tests/integration/generateSvgTemplate.test.js -t "retry budget"` | ❌ Wave 0 |
| TGEN-03 | EF returns 403 to non-admin caller | integration | `npx vitest run tests/integration/generateSvgTemplate.test.js -t "admin gate"` | ❌ Wave 0 |
| TGEN-04 | `dist/` contains no ANTHROPIC string | smoke | `npm run build && grep -r ANTHROPIC dist/ \| wc -l` (asserted ≤ 0) | ❌ Wave 5 |
| TGEN-05 | validateSvg called BEFORE any INSERT | unit | `npx vitest run tests/unit/generateValidatorOrder.test.js` | ❌ Wave 0 |
| TGEN-06 | A/B harness shows ≥30pp first-pass improvement | manual-only | `node scripts/eval-prompt-library.cjs --runs=5` (manual; ~$0.63) | ❌ Wave 5 |
| TADM-01 | Pending tab renders draft list with thumbnails | E2E | `npx playwright test admin-template-queue.spec.js -g "pending list"` | ❌ Wave 5 |
| TADM-02 | Approve/Edit/Reject actions work end-to-end | E2E | `npx playwright test admin-template-queue.spec.js -g "row actions"` | ❌ Wave 5 |
| TADM-03 | Approve produces gallery_templates row + S3 PNG | integration | `npx vitest run tests/integration/approveDraftPipeline.test.js` | ❌ Wave 0 |
| TADM-04 | Non-admin redirected from admin-template-queue | E2E | `npx playwright test admin-template-queue.spec.js -g "auth gate"` | ❌ Wave 5 |
| Prompt parity | promptLibrary.js ≡ prompts.json byte-equal | unit | `npx vitest run tests/integration/promptLibraryParity.test.js` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run <touched-test-file>` (~2-5s)
- **Per wave merge:** `npm test` (full Vitest suite, currently ~30-60s)
- **Phase gate:** Full Vitest + Playwright E2E green + manual A/B harness (TGEN-06) — before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/integration/generateSvgTemplate.test.js` — covers TGEN-01, TGEN-02, TGEN-03 (skip-guarded; live deploy required)
- [ ] `tests/integration/approveDraftPipeline.test.js` — covers TADM-03 (skip-guarded; live deploy + S3 creds required)
- [ ] `tests/integration/promptLibraryParity.test.js` — covers Prompt parity (no env required, runs in CI)
- [ ] `tests/unit/generateValidatorOrder.test.js` — covers TGEN-05 (no env required; mocks Anthropic + Supabase)
- [ ] `tests/e2e/admin-template-queue.spec.js` — covers TADM-01, TADM-02, TADM-04 (Wave 5)
- [ ] `scripts/eval-prompt-library.cjs` — covers TGEN-06 (Wave 5; manual run)

### A/B Harness — Statistical Considerations (D-12)

D-12 specifies 5 generations per template_type × 2 conditions = 60 calls. Statistical caveats:

- **N=5 per condition is small.** With binary first-pass-success outcome, the 95% Clopper-Pearson interval at observed 5/5 success is [48%, 100%] — wide. At 3/5 it's [15%, 95%]. So a single 5-call sample doesn't isolate small effects.
- **However the 30pp threshold is large.** A 30pp difference in proportions with N=5 per arm is detectable at p≈0.05 (one-sided Fisher's exact) when the freeform-only baseline is ≤ 50% and the with-prompt arm is ≥ 80%. Both projected ranges are realistic for SVG generation. So 5 per arm is **adequate to ratify a real ≥30pp effect at the 30pp boundary**, even if it under-powers smaller effects.
- **Aggregate across template types.** The harness aggregates across all 6 template types (60 total calls). The pooled sample is N=30 per condition. At N=30 per arm, a 30pp difference reaches p<0.001 by Fisher's exact. So the headline number is robust.
- **Re-run is cheap.** $0.63 per full 60-call run. If the first run lands in the [25, 35]pp interval (close to threshold), a second run at N=10 per type provides definitive ratification.

**Test fixtures and corpus:**
- The A/B harness doesn't need a fixture corpus — it generates fresh outputs per call. The validator runs against each fresh output.
- The unit-test order-of-call test (TGEN-05) needs a fixed minimal SVG fixture (≤200 bytes) and a malformed-SVG fixture (intentionally missing viewBox or with a `currentColor`) for retry-loop testing.
- The Wave 0 spike (smoke test that the EF infrastructure works at all) needs ONE known-good system_prompt + freeform input that's high-probability to produce a passing SVG. Recommended: "Promote a 25% off summer sale on swimwear" with the menu/promo system_prompt.

**Sample size for verification:**
- Wave 0 spike: 1-3 successful end-to-end runs (manual, smoke-test threshold)
- Wave 5 verification: ≥30 successful runs across the 6 template types via the A/B harness (D-12 N=60)
- Production sign-off: ≥1 production-published template (TGEN-01 SC requirement)

---

## Risks / Open Questions

1. **AdminEditTemplatePage extension is infeasible.** Documented above. Planner must flag in Risks/Concerns and re-discuss with user before Wave 1. Recommended path: inline edit modal on Pending tab. **HIGH confidence in finding** based on direct file read.

2. **resvg-wasm cold-start performance.** First-call WASM init is 1.5-3s on Supabase. The 30s synchronous UX hint absorbs this, but document it. **Open question:** Is the cold-start within Supabase Edge Functions' max-duration cap? Supabase Edge Functions have a 60-second timeout (recently raised from 30s). Generation + retries (3 × ~5-10s = up to 30s) + cold-start (3s) = ~33s worst case, within budget. [LOW confidence — this is the dimension I have the least direct visibility into; recommend Wave 0 spike measures this empirically.]

3. **Bundling .wasm via static_files requires Docker deploy.** `supabase functions deploy` with `--use-api` is documented as incompatible with WASM static_files. The CI/Mgmt-API path Phase 176 used (Mgmt API direct migration apply) doesn't apply here; Phase 177 must use `supabase functions deploy generate-svg-template` from a box with Docker installed. **Open question:** does the dev box that closed Phase 176 have Docker? If not, there's a deploy-environment dependency to surface in Wave 1.

4. **`@resvg/resvg-wasm` font fallback.** Generated SVGs lacking explicit `font-family` will rasterize with a default geometric fallback that may look wrong. Mitigation: prompt-library system_prompts must REQUIRE `font-family: sans-serif` (or `serif`/`monospace`). Open question: is the rasterized PNG quality with `loadSystemFonts: false` acceptable to admins as a thumbnail at 480×270? Spike-test in Wave 0.

5. **Supabase Edge Function 60s timeout vs `npm:@anthropic-ai/sdk` retry behavior.** SDK's default timeout for the underlying fetch is 10 minutes; overlay with Supabase's 60s function timeout. Set `client = new Anthropic({ apiKey, timeout: 25_000 })` (25s per call, allowing 2 retries within the 60s window). Document the timeout choice with the math.

6. **`metadata.validator_failures` array unbounded growth across attempts.** Three entries per failed generation × first-pass and retries × 500-byte excerpt = ~2KB per failed generation. If admins generate hundreds of failures, the JSONB array grows. Acceptable for v1; a v21.x cleanup task can archive `template_drafts` rows with `created_at < NOW() - INTERVAL '90 days'`.

7. **Phase 176 already added `'needs_human_review'` to status CHECK.** D-05's Phase 177 migration is redundant. Planner should write the migration as a no-op idempotent re-application OR skip it entirely with documentation. Document in Plan 01.

8. **`is_admin()` and `is_super_admin()` invocability from a JWT-scoped EF client.** Phase 176 verified the helpers work via Mgmt API + role-switch (Path B); Path A (JWT) was skipped due to missing test-tenant creds. Wave 0 spike should validate Path A live by signing in as an admin and calling `supabase.rpc('is_admin')`. **MEDIUM confidence** — should work per migration 102 pattern, but no live verification yet.

---

## Recommendations for Plan Structure

Suggested wave breakdown for `177-PLAN.md` planning:

| Wave | Goal | Files | Atomic Commit Boundary |
|------|------|-------|------------------------|
| **Wave 0 — Spike + RED tests** | De-risk Deno trio (deno-dom, resvg-wasm, anthropic-sdk); land RED skip-guarded integration tests; commit prompt library | 1 minimal Edge Function (~100 LOC), 4 test files (unit + integration), 1 prompt library JSON | Feature-flagged (no admin nav entry yet); each test file = 1 commit; spike commit contains the working Edge Function |
| **Wave 1 — Migration + EF generate path** | (a) Phase 177 migration (no-op or documented redundant), (b) full generate handler with retry loop, (c) Wave-0 RED tests flip GREEN | 1 SQL migration, 1 EF index.ts + handlers/generate.ts + svgValidator.ts (port or import), 1 prompts.json | Migration commit separate from EF code commit |
| **Wave 2 — Approve/reject paths + S3** | EF actions for approve and reject; rasterize-then-upload-then-INSERT atomic-ish flow; integration test for approve pipeline flips GREEN | EF handlers/approve.ts + handlers/reject.ts + resvg-wasm-init.ts + .wasm bundling | Approve commit + reject commit separate (different code paths, easier review) |
| **Wave 3 — Frontend page shell + Pending tab** | `AdminTemplateQueuePage` component, registered in App.jsx, Pending tab with row actions wired through `templateDraftsService.js` | AdminTemplateQueuePage.jsx (~250 LOC), templateDraftsService.js (~80 LOC), App.jsx (3-line addition) | Page-component commit + service-layer commit + App.jsx-wiring commit (3 atomic commits) |
| **Wave 4 — Generate tab + prompt cards + edit modal** | Generate tab UI (form + OptiSigns-mirror cards) and inline-edit-modal (replacing D-04 ?draftId) | PromptLibraryCardGrid.jsx + GenerateTabForm.jsx + EditDraftModal.jsx | Three atomic commits, one per component |
| **Wave 5 — A/B harness + E2E + verification** | `scripts/eval-prompt-library.cjs` (manual run), Playwright E2E suite, `prompt-library-eval.md`, `177-VERIFICATION.md` | A/B harness (~150 LOC), 1 Playwright spec, 2 markdown deliverables | Each is one atomic commit |

**File count estimate:** 25-30 files net new (5 EF files, 4 test files, 4 frontend components, 1 service, 1 migration, 1 script, 4 docs/configs, ~5 misc).

**Atomic commit boundaries (general principles):**
- Migrations: one commit per migration file (matches Phase 175/176 pattern)
- Edge Function: one commit per handler file (generate, approve, reject) so reviewer can scope
- Frontend: one commit per page-component file; service-layer changes are their own commit
- Tests: one commit per test file (Wave 0 RED state, then each wave flips its tests GREEN as those tests' production code lands)

**Critical Wave 0 spike checklist (must pass before Wave 1):**
- [ ] `supabase functions deploy generate-svg-template --project-ref <ref>` succeeds with WASM static_files bundled
- [ ] `supabase.functions.invoke('generate-svg-template', { body: { action: 'generate', ... }})` from an admin JWT returns a valid SVG draftId
- [ ] svgValidator (with deno-dom DOMParser injection) returns `ok: true` for the generated SVG and `ok: false` for a known-malformed corpus fixture
- [ ] resvg-wasm rasterizes the generated SVG to a non-empty PNG (>1KB)
- [ ] Anthropic SDK error class taxonomy works: a deliberately bad ANTHROPIC_API_KEY surfaces as `Anthropic.AuthenticationError`
- [ ] `is_admin()` RPC returns true for the admin caller, false for a non-admin caller (Path A live verification — closing Phase 176's deferred SC-1.b path)

---

## Code Examples

### Edge Function full skeleton (`index.ts`)

```typescript
// supabase/functions/generate-svg-template/index.ts
// Source: synthesized from §"Architecture Patterns" 1-4
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generate } from './handlers/generate.ts';
import { approve } from './handlers/approve.ts';
import { reject } from './handlers/reject.ts';

if (!Deno.env.get('ANTHROPIC_API_KEY')) throw new Error('ANTHROPIC_API_KEY required');
if (!Deno.env.get('ANTHROPIC_MODEL_ID')) throw new Error('ANTHROPIC_MODEL_ID required (D-16 fail-fast)');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: isAdmin } = await supabase.rpc('is_admin');
  const { data: isSuper } = await supabase.rpc('is_super_admin');
  if (!isAdmin && !isSuper) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const supabaseSr = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  try {
    if (body.action === 'generate') return Response.json(await generate(body, supabaseSr));
    if (body.action === 'approve')  return Response.json(await approve(body, supabaseSr));
    if (body.action === 'reject')   return Response.json(await reject(body, supabaseSr));
    return new Response(`Unknown action: ${body.action}`, { status: 400 });
  } catch (e) {
    console.error('[generate-svg-template]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});
```

### Validator with retry (handlers/generate.ts)

See §"Per-Requirement Implementation Notes: TGEN-02" for the full retry loop.

### S3 upload reuse (handlers/approve.ts)

```typescript
// Reuses /api/media/presign pattern from scripts/generate-template-thumbnails.cjs:73-95
// (NB: in EF context, the presign API path may need to be the public URL of the static file route, not the dev box localhost; verify in Wave 0)
export async function approve(body: { draftId: string }, supabase: any) {
  const { data: draft } = await supabase.from('template_drafts').select('*').eq('id', body.draftId).single();
  if (!draft) throw new Error('Draft not found');

  const png = await rasterize(draft.svg_content, { width: 480, height: 270 });
  const fileUrl = await uploadToS3(png, draft.id, supabase);

  // Map draft → svg_templates row
  await supabase.from('svg_templates').insert({
    name: deriveNameFromDraft(draft),
    description: deriveDescriptionFromDraft(draft),
    category: deriveCategoryFromDraft(draft),
    orientation: draft.svg_content.includes('1080') && draft.svg_content.includes('1920') ? 'landscape' : 'portrait',
    thumbnail: fileUrl,
    svg_url: '',                                     // populated lazily; svg_content is canonical
    svg_content: draft.svg_content,
    width: 1920, height: 1080,                       // TODO: parse from svg_content
    tags: [],
    is_active: true,
    vertical: draft.vertical,
    metadata: { source: 'ai_generation', draft_id: draft.id, prompt: draft.prompt },
  });

  await supabase.from('template_drafts').update({
    status: 'approved',
    metadata: { ...draft.metadata, reviewed_by: body.reviewerUid, reviewed_at: new Date().toISOString() },
  }).eq('id', body.draftId);

  return { ok: true, thumbnail_url: fileUrl };
}
```

### prompts.json shape (D-08 + D-09)

```json
[
  {
    "id": "menu-cross-vertical-v1",
    "template_type": "menu",
    "vertical": null,
    "label": "Menu (cross-vertical)",
    "example_freeform": "Promote Mother's Day brunch special featuring mimosas and french toast.",
    "system_prompt": "You generate one complete SVG digital-signage menu template via the emit_svg_template tool.\n\nHARD RULES:\n- Output a single complete <svg>...</svg> with viewBox=\"0 0 1920 1080\".\n- Use ONLY explicit hex colors (#RRGGBB). Never use currentColor or var(--*).\n- font-family must be sans-serif, serif, or monospace (no system-specific fonts like Helvetica/Arial).\n- Include at least one customization anchor: an element with id=\"title\" or id=\"text-headline\" or [data-customize-color] or [data-customize-text].\n- A visible non-white background fill on a root <rect>.\n- Output size ≤ 200KB.\n\nMENU-SPECIFIC GUIDANCE:\n- Use a header strip with the establishment name placeholder.\n- Use 2-6 menu rows with item name + price + (optional) description.\n- Maintain visual hierarchy: header > section divider > item rows.\n- Use a price-anchor element id=\"price-1\" through id=\"price-N\" for downstream brand-color application."
  }
]
```

(5 more entries for promo, announcement, reminder, wayfinding, health_tip — each per D-09 schema.)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded model name in API call | `ANTHROPIC_MODEL_ID` env var (snapshot-pinned) | Pitfall A2 mitigation locked 2026-05-06 | Required for controlled deprecation path |
| `currentColor` / `var(--*)` for theming SVGs | Explicit hex with customization anchors via id="text-..." / [data-customize-color] | Phase 175 (TCTN-02 / Pitfall 6) | Locks brand-swap behavior; drives Rule 3 of svgValidator |
| Non-validated SVG entering admin queue | svgValidator at INGEST boundary BEFORE INSERT | Pitfall A1 mitigation | Validator gates the queue, not the publish step |
| Free-text SVG extraction from LLM response | Tool-use with input_schema → tool_use.input.svg | 2026 Anthropic SDK pattern | Cleaner parsing; eliminates Pitfall A4-style false confidence |
| `@resvg/resvg-js` everywhere | Split: `@resvg/resvg-js` for Node CLI + `@resvg/resvg-wasm` for Edge Functions | Supabase WASM-only constraint | Two libraries, two contexts |

**Deprecated/outdated:**
- `globalThis.DOMParser` in Deno: doesn't exist; use deno-dom WASM
- `npm:@resvg/resvg-js` in Edge Functions: documented incompatible with the WASM-only constraint
- DOMPurify server-side sanitization without a DOM polyfill: not viable; skip Rule 4 in EF context

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Edge Function 60s timeout is sufficient for 3 attempts × ~5-10s + cold-start | Open Question 5 | EF times out mid-retry; partial state in template_drafts. Mitigation: per-call SDK timeout 25s |
| A2 | `is_admin()` RPC works from a JWT-scoped EF client (Phase 176 only verified Path B) | Open Question 8 | Wave 0 spike fails; need to fall back to manual JWT decode + claims-based admin detection |
| A3 | Phase 177 dev box has Docker available for `supabase functions deploy` | Open Question 3 | Deploy is blocked; need to provision a Docker-equipped CI runner or developer box |
| A4 | `@resvg/resvg-wasm` rasterization quality at 480×270 is acceptable for thumbnails without system fonts | Pitfall 2, Open Question 4 | Thumbnails look bad; ship with a bundled `.woff2` font (defer this engineering to Phase 178) |
| A5 | Phase 176-applied status CHECK already including 'needs_human_review' makes Phase 177 migration redundant | Pitfall 4 | Planner writes a redundant migration; minor inefficiency, no functional issue |
| A6 | The admin caller's JWT is forwardable to internal `supabase.rpc('is_admin')` calls correctly without additional context plumbing | Pattern 1 | Admin gate fails open or fails closed unpredictably; surface in Wave 0 spike with test creds |

**Total assumed claims: 6.** All flagged as Wave-0-spike validation targets so the planner picks them up before committing to wave structure.

---

## Open Questions (RESOLVED)

1. **Is the EF dev box Docker-equipped?**
   - What we know: Phase 176 used Mgmt API direct (no Docker required). Phase 177 needs `supabase functions deploy` with WASM static_files which mandates Docker.
   - What's unclear: whether the operator has Docker installed/running.
   - Recommendation: Surface in Plan 01; if Docker isn't available, the Wave 0 spike must include a Docker-installation step or use a CI runner.
   - **RESOLVED:** Plan 01 Task 1 (`checkpoint:human-action`) gates on `docker info` + `supabase --version ≥ 2.7.0` before any deploy attempt. Operator must reply "approved" before Wave 0 proceeds.

2. **Does `supabase.rpc('is_admin')` work from an EF Authorization-header-scoped client?**
   - What we know: Phase 176 verified `is_admin()` evaluates correctly at the SQL layer; the helper is callable via PostgREST.
   - What's unclear: whether the JWT-scoped client correctly passes auth.uid() into the RPC.
   - Recommendation: Wave 0 spike test 1 — sign in as a known admin, hit the EF, assert the gate passes. Sign in as a known non-admin, hit the EF, assert 403.
   - **RESOLVED:** Plan 01 Task 3f live-verifies Path A (admin JWT → 200; non-admin JWT → 403). Both responses captured in the Plan 01 SUMMARY commit body.

3. **Is the EF cold-start under the 60s function timeout?**
   - What we know: Bundle is ~4.7MB; Supabase typical EF cold-start is 100-500ms for small bundles.
   - What's unclear: how WASM init contributes to cold-start in the production Deno runtime.
   - Recommendation: Wave 0 spike measures cold-start vs warm-start time; record in `177-VERIFICATION.md`.
   - **RESOLVED:** Plan 01 Task 3e measures cold-start once during the live spike deploy and records the value in 177-01-SUMMARY.md (forward-cited from 177-VERIFICATION.md).

4. **What's the right rasterized-thumbnail dimension for AI-generated templates?**
   - What we know: Existing thumbnail script uses 480×270 (landscape) / 270×480 (portrait).
   - What's unclear: whether the rasterized-without-system-fonts PNG looks acceptable at this resolution.
   - Recommendation: Wave 0 spike rasterizes a known-good SVG via resvg-wasm; spot-check the output PNG visually.
   - **RESOLVED:** Plan 03 Task 1 locks `THUMB_LANDSCAPE = { width: 480, height: 270 }` / `THUMB_PORTRAIT = { width: 270, height: 480 }` constants in `handlers/approve.ts` (matches existing thumbnail script convention).

5. **Should the Phase 177 migration be a no-op or skipped entirely?**
   - What we know: Phase 176 already added `'needs_human_review'` to the CHECK.
   - What's unclear: whether the planner wants the migration as audit-trail documentation or wants a clean skip.
   - Recommendation: Plan 01 chooses one and documents the choice.
   - **RESOLVED:** D-05 OVERRIDE in 177-CONTEXT.md `<overrides>` block — no Phase 177 migration. Phase 176's `176_template_drafts_and_vertical.sql:62` already added `'needs_human_review'` to the CHECK.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | EF deploy | ✓ (verified by Phase 176 Plan 02 Mgmt-API path) | ≥2.7.0 needed for static_files | Mgmt API direct (NOT applicable for EF deploy) |
| Docker | EF deploy with WASM static_files | UNKNOWN — needs verification | — | Switch to no-WASM path (impossible — resvg-wasm requires WASM bundle) |
| Node 18+ + npm | A/B harness, frontend dev | ✓ | 22.x per project history | — |
| Deno (local) | EF local dev/test | UNKNOWN | — | Deploy + test in cloud only (slower iteration) |
| `ANTHROPIC_API_KEY` Supabase secret | Edge Function | UNKNOWN — must verify before Wave 1 | — | Sign up + set secret (1-time) |
| `SUPABASE_SERVICE_ROLE_KEY` env | Integration tests | LIKELY ✗ (Phase 176-03 deferred SC-2.b for this reason) | — | Path B SQL-level fallback per Phase 176 pattern |

**Missing dependencies with no fallback:**
- Docker for EF deploy with WASM static_files — must address before Wave 2

**Missing dependencies with fallback:**
- `SUPABASE_SERVICE_ROLE_KEY` — Mgmt API + Path B fallback per Phase 176 pattern works for verification

---

## Sources

### Primary (HIGH confidence)
- Context7 `/anthropics/anthropic-sdk-typescript` — Deno usage, error class taxonomy, model IDs (claude-haiku-4-5-20251001 verified in SDK Model union type)
- `npm view @anthropic-ai/sdk version` → 0.95.0 (verified 2026-05-06)
- `npm view @resvg/resvg-wasm version` → 2.6.2
- `npm view @resvg/resvg-js version` → 2.6.2 (Node-only)
- File reads: `src/services/svgValidator.js`, `src/pages/Admin/AdminEditTemplatePage.jsx`, `src/pages/Admin/AdminTemplatesPage.jsx`, `src/pages/Admin/AdminStarterPacksPage.jsx`, `src/components/Admin/BulkTemplateUpload.jsx`, `src/services/autoTaggingService.js`, `src/App.jsx`, `supabase/migrations/176_template_drafts_and_vertical.sql`, `tests/integration/templateDraftsRls.test.js`, `scripts/generate-template-thumbnails.cjs`
- Phase 176 artifacts: `176-03-SUMMARY.md` for skip-guarded test pattern; `176-VERIFICATION.md` for migration verification

### Secondary (MEDIUM confidence)
- [Supabase Edge Functions: Image Manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation) — confirms WASM-only constraint
- [Supabase Edge Functions: Using Wasm modules](https://supabase.com/docs/guides/functions/wasm) — `static_files` config + Docker deploy requirement
- [Supabase Edge Functions: Managing dependencies](https://supabase.com/docs/guides/functions/dependencies) — `npm:` and `jsr:` import syntax
- [Supabase Edge Functions: Securing Edge Functions](https://supabase.com/docs/guides/functions/auth) — JWT verification, Authorization header forwarding
- [b-fuze/deno-dom GitHub README](https://github.com/b-fuze/deno-dom) — DOMParser API, WASM vs native backend, image/svg+xml support
- [@resvg/resvg-wasm npm](https://www.npmjs.com/package/@resvg/resvg-wasm) — initWasm API, bundle size, font caveat
- [Deno docs: DOMParser](https://doc.deno.land/deno/dom/~/DOMParser) — confirms image/svg+xml MIME support
- [Anthropic Cookbook: extracting structured JSON via tool_use](https://github.com/anthropics/anthropic-cookbook/blob/main/tool_use/extracting_structured_json.ipynb) — battle-tested pattern for Haiku 4.5

### Tertiary (LOW confidence — flagged for Wave 0 spike validation)
- `is_admin()` RPC behavior under JWT-scoped EF client — only Path B verified in Phase 176; Path A (JWT) deferred
- resvg-wasm cold-start performance in Supabase production runtime
- Docker availability on the dev box that ran Phase 176

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions verified live; Context7-backed library docs; prior Phase 175/176 patterns provide in-repo precedent for everything but the Edge Function shape itself
- Architecture: HIGH on Deno-side library trio + EF skeleton; MEDIUM on rasterization edge cases (font fallback) and timeout-vs-cold-start; LOW on AdminEditTemplatePage extensibility (because the verdict is NEGATIVE — D-04 needs revision)
- Pitfalls: HIGH — direct file reads validated 4 of 8 pitfalls; the other 4 are derived from documented platform constraints
- Validation Architecture: MEDIUM — N=5/condition is justified statistically but not at high confidence; recommend re-run protocol on first measurement

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (30 days; flag for review if Anthropic SDK or Supabase Edge Function runtime sees a major release)
