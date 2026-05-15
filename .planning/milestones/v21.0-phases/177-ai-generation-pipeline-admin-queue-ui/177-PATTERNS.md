# Phase 177: AI Generation Pipeline + Admin Queue UI - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 19 new + 1 modified (App.jsx) + 1 amended (config.toml)
**Analogs found:** 11 strong / 19 (8 GREENFIELD — fall back to RESEARCH.md §"Deno-Specific Constraints" + §"Code Examples")

> Authority precedence (read top-down when conflicts arise): override addendum (D-04, D-05, D-15) → CONTEXT.md → RESEARCH.md "Existing-Code Inspection" + "Code Examples". Override addendum supersedes the original D-XX text.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `supabase/functions/generate-svg-template/index.ts` | edge-function entry / controller | request-response | RESEARCH.md §"Code Examples → Edge Function full skeleton" | GREENFIELD (no in-repo EF) |
| `supabase/functions/generate-svg-template/handlers/generate.ts` | service / handler | request-response + retry-loop | `src/services/svgValidator.js` (validator API) + RESEARCH.md §TGEN-02 retry loop | GREENFIELD-with-validator-anchor |
| `supabase/functions/generate-svg-template/handlers/approve.ts` | service / handler | request-response + file-I/O | `scripts/generate-template-thumbnails.cjs:56-95,189-209` | partial (Node/Deno runtime split; rasterization shape transfers) |
| `supabase/functions/generate-svg-template/handlers/reject.ts` | service / handler | CRUD (UPDATE only) | `src/services/marketplaceService.js:222-247` (updateTemplate shape) | role-match |
| `supabase/functions/generate-svg-template/prompts.json` | data module | static-data | RESEARCH.md §"prompts.json shape (D-08 + D-09)" | GREENFIELD |
| `supabase/functions/generate-svg-template/svgValidator.ts` (port or re-export) | utility / pure function | transform | `src/services/svgValidator.js` (verbatim port; injectable already) | exact (re-use existing JS via Deno npm import preferred — see RESEARCH §"svgValidator extensibility") |
| `supabase/functions/generate-svg-template/resvg-wasm-init.ts` (rasterize.ts) | utility | transform (SVG → PNG) | `scripts/generate-template-thumbnails.cjs:56-67` (Resvg ctor shape) | partial (`@resvg/resvg-js` Node API → `@resvg/resvg-wasm` WASM API; same call shape) |
| `supabase/functions/generate-svg-template/deno-dom-domparser.ts` | utility | transform | RESEARCH.md §"Pattern 3" (verbatim) | GREENFIELD |
| `supabase/functions/generate-svg-template/s3.ts` | utility | file-I/O | `scripts/generate-template-thumbnails.cjs:72-95` (presign + PUT) | exact-shape (confirm presign endpoint reachable from EF; Wave-0 task) |
| `supabase/functions/generate-svg-template/deno.json` | config | static-config | RESEARCH.md §"Recommended Project Structure" | GREENFIELD |
| `supabase/functions/generate-svg-template/index_bg.wasm` | binary (vendored) | n/a | n/a — pulled from `@resvg/resvg-wasm` package | GREENFIELD |
| `supabase/config.toml` (AMENDED) | config | static-config | self (lines 369-378 for `[edge_runtime]` precedent) | partial (no existing `[functions.*]` block; first one) |
| `src/pages/Admin/AdminTemplateQueuePage.jsx` | page / controller | request-response + CRUD | `src/pages/Admin/AdminStarterPacksPage.jsx` (full file) | exact (modal-drilldown shape with row actions) |
| `src/services/aiTemplate/promptLibrary.js` | data module | static-data | RESEARCH.md §"prompts.json shape" + structural mirror with `prompts.json` | GREENFIELD |
| `src/services/aiTemplate/templateDraftsService.js` | service | CRUD (over Supabase + EF) | `src/services/marketplaceService.js:50-260` (entire admin-CRUD pattern) | exact |
| `src/components/Admin/TemplateDraftEditModal.jsx` | component | request-response (modal) | `src/pages/Admin/AdminStarterPacksPage.jsx:200-233` (Modal pattern) + `src/components/Admin/BulkTemplateUpload.jsx:170-190` (validateSvg gate) | role-match |
| `src/components/Admin/TemplateDraftPreview.jsx` | component | transform (sanitize-then-render) | `src/services/templateApplyService.js:54-56` (locked DOMPurify config) + `src/services/svgValidator.js:124-127` | exact-config |
| `scripts/eval-prompt-library.cjs` | script | batch / event-driven | `scripts/generate-template-thumbnails.cjs` (entire file) | exact (CLI args + dotenv + serial loop + summary) |
| `tests/integration/edgeFunctionSpike.test.js` | test (W0 RED) | request-response | `tests/integration/templateDraftsRls.test.js:1-80` (skip-guard + deferred createClient) | exact |
| `tests/integration/generateSvgTemplate.test.js` | test (W0 RED) | request-response | `tests/integration/templateDraftsRls.test.js:1-80` | exact |
| `tests/integration/approveDraftPipeline.test.js` | test (W0 RED) | request-response + file-I/O | `tests/integration/templateDraftsRls.test.js:1-80` | exact |
| `tests/integration/promptLibraryParity.test.js` | test (W0 RED) | static-equality | `tests/integration/templateDraftsRls.test.js:20-26` (env loading only; assertion is plain Vitest) | partial |
| `tests/unit/generateValidatorOrder.test.js` | test (W0 RED) | unit | `tests/unit/services/*` (any pure-function test; mocks Anthropic + Supabase) | role-match |
| `tests/e2e/admin-template-queue.spec.js` | test (W4-5) | E2E | `tests/e2e/admin-starter-packs.spec.js` (entire file) | exact |
| `src/App.jsx` (MODIFIED) | wiring | static-config | self (lines 119-121, 577-578, 687-691) | exact-self-pattern |

---

## Pattern Assignments

### Edge Function entry — `supabase/functions/generate-svg-template/index.ts` (GREENFIELD)

**Analog:** None in-repo. Source-of-truth: `177-RESEARCH.md` §"Code Examples → Edge Function full skeleton" (lines 1009-1052) + §"Pattern 1: Edge Function admin gate" (lines 268-300). Pattern is small and well-trodden Supabase canonical.

**Top-of-file fail-fast (D-16) — copy verbatim from RESEARCH §"Code Examples"**

```typescript
// supabase/functions/generate-svg-template/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generate } from './handlers/generate.ts';
import { approve } from './handlers/approve.ts';
import { reject } from './handlers/reject.ts';

if (!Deno.env.get('ANTHROPIC_API_KEY')) throw new Error('ANTHROPIC_API_KEY required');
if (!Deno.env.get('ANTHROPIC_MODEL_ID')) throw new Error('ANTHROPIC_MODEL_ID required (D-16 fail-fast)');
```

**Admin gate — copy from RESEARCH §"Pattern 1"**

```typescript
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  // Caller-scoped client — forwards JWT, RLS evaluates as the caller
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // SECURITY DEFINER helpers from migration 009/012 — verified live in Phase 176
  const { data: isAdmin } = await supabase.rpc('is_admin');
  const { data: isSuper } = await supabase.rpc('is_super_admin');
  if (!isAdmin && !isSuper) return new Response('Forbidden', { status: 403 });
  // ... action dispatch
});
```

**Action dispatch (`generate` / `approve` / `reject`) and service-role client** — full shape in RESEARCH.md §"Code Examples" lines 1037-1051. **Important:** the JWT-scoped client is used **only** for the admin RPC check; mutations go through a separate service-role client (`SUPABASE_SERVICE_ROLE_KEY`) so the EF can bypass the row-level RLS that already gates non-admin INSERT (defense-in-depth per D-18).

---

### Generate handler — `supabase/functions/generate-svg-template/handlers/generate.ts` (GREENFIELD-with-anchor)

**Analog:** RESEARCH §"Pattern 2: Anthropic call" (lines 302-339) + §TGEN-02 retry-loop (RESEARCH lines 626-668).

**Anthropic tool-use call — copy verbatim**

```typescript
// supabase/functions/generate-svg-template/handlers/generate.ts
import Anthropic from 'npm:@anthropic-ai/sdk@0.95.0';
import { DOMParser } from 'jsr:@b-fuze/deno-dom';     // WASM backend — no FFI flags
import { validateSvg } from '../svgValidator.ts';      // OR npm: import of the JS module
import promptsData from '../prompts.json' with { type: 'json' };

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  timeout: 25_000,                                     // RESEARCH §Risks #5 — 25s × 2 retries < 60s EF timeout
});
const modelId = Deno.env.get('ANTHROPIC_MODEL_ID')!;   // 'claude-haiku-4-5-20251001' (D-16)

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
  system: systemPrompt,                                // from prompts.json by (template_type, vertical)
  messages: [{ role: 'user', content: adminFreeformPrompt }],
});

const toolUseBlock = response.content.find((c: any) => c.type === 'tool_use');
const generatedSvg: string = toolUseBlock?.input?.svg ?? '';
```

**Validator-then-INSERT order (TGEN-05 — Pitfall A1 mitigation, MANDATORY)**

```typescript
const result = validateSvg(generatedSvg, {
  DOMParserCtor: DOMParser,                            // jsr:@b-fuze/deno-dom
  DOMPurify: null,                                     // RESEARCH §Constraint 4 — skip Rule 4 server-side
});

if (!result.ok && attempt <= MAX_RETRIES) {
  // Append failure to attempts[], feed errors back into next prompt — TGEN-02
  attempts.push({ attempt, model_id: modelId, errors: result.errors, warnings: result.warnings,
                  raw_svg_excerpt: generatedSvg.slice(0, 500), prompt_used: messages, ts: new Date().toISOString() });
  continue;
}

// Only INSERT after validator passes OR after retries exhausted — TGEN-05 ORDER GUARANTEE
const finalStatus = result.ok ? 'pending' : 'needs_human_review';
const { data, error } = await supabase
  .from('template_drafts')
  .insert({
    svg_content: generatedSvg,
    prompt: adminFreeformPrompt,
    source: 'ai_generation',
    status: finalStatus,
    vertical: vertical,                                // 'restaurants'|'retail'|'healthcare'|null
    metadata: {
      template_type, validator_failures: attempts, generated_by: callerUid,
    },
  })
  .select('id')
  .single();
```

**Retry-loop bounds (D-12 / Pitfall A3 cap) — capped at exactly 2 retries (3 total attempts)**

```typescript
const MAX_RETRIES = 2;
for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
  // ... LLM call → validator → break on ok or continue on fail
}
```

**Anti-pattern guard:** Never INSERT before validator runs (Pitfall A1). The unit test `tests/unit/generateValidatorOrder.test.js` enforces this with mocked Anthropic + Supabase.

---

### Approve handler — `supabase/functions/generate-svg-template/handlers/approve.ts`

**Analog:** `scripts/generate-template-thumbnails.cjs` lines 56-67 (rasterize), 72-95 (S3 PUT), 189-209 (process loop).

**Rasterize shape (LIFT FROM SCRIPT — Node `@resvg/resvg-js` API is structurally identical to Deno `@resvg/resvg-wasm` API, only the import + init differ):**

`scripts/generate-template-thumbnails.cjs:56-67`:
```javascript
function rasterize(svgString, { width, height }) {
  const useWidthFit = width >= height;
  const resvg = new Resvg(svgString, {
    fitTo: useWidthFit
      ? { mode: 'width', value: width }
      : { mode: 'height', value: height },
    background: 'rgba(255, 255, 255, 1)',
    font: { loadSystemFonts: true },                   // ← CHANGE to false in WASM (Pitfall 2)
  });
  return resvg.render().asPng();
}
```

**Deno equivalent (D-15 OVERRIDE — `@resvg/resvg-wasm` not `@resvg/resvg-js`):**

```typescript
// supabase/functions/generate-svg-template/resvg-wasm-init.ts
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@^2.6.2';

let initialized = false;
async function ensureInit() {
  if (initialized) return;
  // The .wasm binary is bundled via supabase/config.toml static_files
  const wasm = await Deno.readFile(new URL('./index_bg.wasm', import.meta.url));
  await initWasm(wasm);
  initialized = true;
}

export async function rasterize(svg: string, { width, height }: { width: number; height: number }) {
  await ensureInit();
  const useWidthFit = width >= height;
  const resvg = new Resvg(svg, {
    fitTo: useWidthFit
      ? { mode: 'width', value: width }
      : { mode: 'height', value: height },
    background: 'rgba(255,255,255,1)',
    font: { loadSystemFonts: false },                  // ← MANDATORY false (no system fonts in WASM)
  });
  return resvg.render().asPng();                       // Uint8Array
}
```

**S3 upload — copy presign-then-PUT shape from `scripts/generate-template-thumbnails.cjs:72-95`:**

```javascript
async function uploadToS3(buffer, slug) {
  const apiBase = process.env.VITE_API_URL || process.env.API_URL;
  const filename = `thumbnail-${slug}-${Date.now()}.png`;
  const presignRes = await fetch(`${apiBase}/api/media/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: 'image/png', folder: 'thumbnails/system' }),
  });
  if (!presignRes.ok) throw new Error(`presign failed (${presignRes.status})`);
  const { uploadUrl, fileUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`S3 PUT failed (${putRes.status})`);
  return fileUrl;
}
```

**Note for Deno port:** `process.env.X` → `Deno.env.get('X')`. **Wave-0 task** — verify the EF can reach `/api/media/presign` (it's a Vercel route on the public domain; the EF needs the public URL of the deployed app).

**Approve action atomic sequence — mirror RESEARCH §"S3 upload reuse (handlers/approve.ts)" verbatim** (lines 1063-1093). Order: rasterize → S3 PUT → INSERT `svg_templates` → UPDATE `template_drafts.status='approved'` (with `metadata.reviewed_by` + `metadata.reviewed_at` per D-07).

---

### Reject handler — `supabase/functions/generate-svg-template/handlers/reject.ts`

**Analog:** `src/services/marketplaceService.js:222-247` (updateTemplate UPDATE-with-select-single shape).

```typescript
// Mirror of the JS update-then-select pattern
export async function reject(body: { draftId: string, reason?: string, reviewerUid: string }, supabase: any) {
  const { data: draft } = await supabase.from('template_drafts').select('metadata').eq('id', body.draftId).single();
  if (!draft) throw new Error('Draft not found');

  const { data, error } = await supabase
    .from('template_drafts')
    .update({
      status: 'rejected',
      metadata: {
        ...draft.metadata,
        reviewed_by: body.reviewerUid,
        reviewed_at: new Date().toISOString(),
        rejected_reason: body.reason ?? null,           // D-07
      },
    })
    .eq('id', body.draftId)
    .select()
    .single();
  if (error) throw error;
  return { ok: true, draftId: data.id };
}
```

---

### svgValidator port — `supabase/functions/generate-svg-template/svgValidator.ts`

**Analog:** `src/services/svgValidator.js` (entire 171 LOC, already injectable).

**Recommendation per RESEARCH §"svgValidator extensibility for Deno injection":** Option A — import the existing JS file directly via Deno's npm/relative import. The validator already accepts `opts.DOMParserCtor` (line 47-49) and `opts.DOMPurify` (line 123). Replace the top-level `import DOMPurifyDefault from 'dompurify'` only if it crashes Deno; otherwise pass `opts.DOMPurify = null` to skip Rule 4.

**Configuration to inject from EF:**

```typescript
const result = validateSvg(svg, {
  DOMParserCtor: DOMParser,                  // jsr:@b-fuze/deno-dom — WASM backend
  DOMPurify: null,                            // RESEARCH §Constraint 4 — Rule 4 silently skipped
});
// result.ok / result.errors / result.warnings
```

**Locked DOMPurify config (load-bearing) — copy from `src/services/svgValidator.js:124-127`:**

```javascript
purifier.sanitize(svgString, {
  USE_PROFILES: { svg: true, svgFilters: true },
});
```

This config also appears at `src/services/templateApplyService.js:54-56`. **Drift between any two of these three sites = production bug** (Pitfall 5).

---

### prompts.json — `supabase/functions/generate-svg-template/prompts.json` (GREENFIELD)

**Analog:** RESEARCH §"prompts.json shape" (lines 1097-1108).

**Recommended (per RESEARCH Pitfall 8):** ship as `prompts.json` (not `.ts`) so the parity test in Vitest can `import promptsJson from '../../supabase/functions/generate-svg-template/prompts.json' with { type: 'json' }` and the EF can `import prompts from './prompts.json' with { type: 'json' }` — both runtimes share the same file.

**Single entry shape (D-09):**

```json
{
  "id": "menu-cross-vertical-v1",
  "template_type": "menu",
  "vertical": null,
  "label": "Menu (cross-vertical)",
  "example_freeform": "Promote Mother's Day brunch special featuring mimosas and french toast.",
  "system_prompt": "You generate one complete SVG digital-signage menu template via the emit_svg_template tool.\n\nHARD RULES:\n- Output a single complete <svg>...</svg> with viewBox=\"0 0 1920 1080\".\n- Use ONLY explicit hex colors (#RRGGBB). Never use currentColor or var(--*).\n- font-family must be sans-serif, serif, or monospace (no system-specific fonts like Helvetica/Arial).\n- Include at least one customization anchor: an element with id=\"title\" or id=\"text-headline\" or [data-customize-color] or [data-customize-text].\n- A visible non-white background fill on a root <rect>.\n- Output size ≤ 200KB."
}
```

**System-prompt content rules MUST mirror svgValidator gates** — the prompt explicitly tells Claude to satisfy Rules 2 (viewBox), 3 (no `currentColor` / `var(--`), 5 (customization anchors), 6 (≤200KB), AND adds Pitfall 2 mitigation (`font-family: sans-serif`). This is the load-bearing alignment between the prompt and the validator.

---

### Frontend page — `src/pages/Admin/AdminTemplateQueuePage.jsx`

**Analog:** `src/pages/Admin/AdminStarterPacksPage.jsx` (entire 236 LOC). This is the closest structural analog: PageLayout + table + modal-drilldown + row actions.

**Imports + state shape (lines 17-34):**

```javascript
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import PageLayout from '../../design-system/components/PageLayout';
import { Button, Alert, Modal } from '../../design-system';
import {
  fetchPendingDrafts, approveDraft, rejectDraft, generateDraft,    // NEW templateDraftsService.js
} from '../../services/aiTemplate/templateDraftsService';
import TemplateDraftEditModal from '../../components/Admin/TemplateDraftEditModal';

export default function AdminTemplateQueuePage({ showToast, onNavigate: _onNavigate }) {
  const [activeTab, setActiveTab] = useState('generate');         // 'generate' | 'pending'
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);     // null | <uuid>
  const [confirmReject, setConfirmReject] = useState(null);
  // ...
}
```

**Load + refresh pattern (lines 36-52) — mirror exactly:**

```javascript
const loadDrafts = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const rows = await fetchPendingDrafts();
    setDrafts(rows);
  } catch (err) {
    console.error('[AdminTemplateQueuePage] load failed:', err);
    setError('Failed to load drafts');
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => { loadDrafts(); }, [loadDrafts]);
```

**PageLayout + tab toggle + table — mirror `AdminStarterPacksPage.jsx:79-185`** (PageLayout chrome, table with row actions).

**Modal drill-in — mirror `AdminStarterPacksPage.jsx:188-198`:**

```javascript
{editingDraftId !== null && (
  <TemplateDraftEditModal
    draftId={editingDraftId}
    onClose={() => setEditingDraftId(null)}
    onSaved={async () => { setEditingDraftId(null); await loadDrafts(); }}
    showToast={showToast}
  />
)}
```

**Confirm-reject Modal — mirror the delete-confirm Modal at `AdminStarterPacksPage.jsx:201-233`** (verbatim Modal + Button shape; copy-rewrite the title and body for the reject UX).

**LOC budget:** ~600-800 LOC per CONTEXT (vs 236 for AdminStarterPacksPage); the Generate tab + OptiSigns prompt-card grid is the additional area beyond the Pending mirror.

---

### Service layer — `src/services/aiTemplate/templateDraftsService.js`

**Analog:** `src/services/marketplaceService.js` (lines 50-260 specifically for the admin CRUD shape).

**Imports + Supabase usage (lines 1-10):**

```javascript
import { supabase } from '../../supabase';
```

**Plain SELECT (mirror lines 113-123):**

```javascript
export async function fetchPendingDrafts() {
  const { data, error } = await supabase
    .from('template_drafts')
    .select('id, svg_content, prompt, source, status, vertical, metadata, created_at')
    .in('status', ['pending', 'needs_human_review'])      // D-03
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
```

**Edge Function invocation (NEW shape — Supabase functions.invoke):**

```javascript
export async function generateDraft({ vertical, template_type, prompt }) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'generate', vertical, template_type, prompt },
  });
  if (error) throw error;
  return data;       // { draftId, status: 'pending'|'needs_human_review' }
}

export async function approveDraft(draftId) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'approve', draftId },
  });
  if (error) throw error;
  return data;       // { ok: true, thumbnail_url }
}

export async function rejectDraft(draftId, reason) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'reject', draftId, reason },
  });
  if (error) throw error;
  return data;
}
```

**Update-then-select (mirror `marketplaceService.js:222-247`) — only used if direct DB UPDATE is preferred for some queue housekeeping; defer until needed.**

---

### Edit modal — `src/components/Admin/TemplateDraftEditModal.jsx`

**Override D-04:** Inline modal (NOT extension of `AdminEditTemplatePage`). Pitfall 5 in RESEARCH (lines 465-471) verified that `AdminEditTemplatePage` operates on Polotno templates, not SVG.

**Analog (modal shell):** `src/pages/Admin/AdminStarterPacksPage.jsx:201-233` (Modal pattern for confirm dialog) + `src/components/Admin/BulkTemplateUpload.jsx:170-190` (validateSvg call site).

**Modal shell — copy `AdminStarterPacksPage.jsx:201-233`:**

```javascript
<Modal
  open={!!draftId}
  onClose={() => !saving && onClose()}
  size="lg"                                            // larger than 'sm' confirm — needs textarea space
  aria-labelledby="edit-draft-title"
>
  <div className="p-6">
    <h3 id="edit-draft-title" className="text-lg font-semibold text-gray-900 mb-2">
      Edit draft
    </h3>
    {/* read-only metadata: prompt, vertical, template_type, retry count */}
    {/* textarea: editable svg_content */}
    {/* live-preview: TemplateDraftPreview component */}
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button variant="primary" onClick={handleSaveAndPublish} disabled={saving}>
        {saving ? 'Saving…' : 'Save & Publish'}
      </Button>
    </div>
  </div>
</Modal>
```

**Validation gate before publish — copy from `BulkTemplateUpload.jsx:174-190`:**

```javascript
// Pre-publish validation gate (TGEN-05 mirror — but client-side this time)
const validation = validateSvg(editedSvg);             // import from svgValidator.js
if (!validation.ok) {
  showToast?.({ variant: 'error', message: `Validation failed: ${validation.errors.join('; ')}` });
  return;
}
if (validation.warnings.length > 0) {
  console.warn('[TemplateDraftEditModal]', validation.warnings);
}

// Save & Publish runs the EF approve path (which also re-validates server-side)
await saveDraftSvgContent(draftId, editedSvg);          // first — UPDATE template_drafts.svg_content
await approveDraft(draftId);                             // then — invoke EF approve
```

---

### Inline preview — `src/components/Admin/TemplateDraftPreview.jsx`

**Analog:** `src/services/templateApplyService.js:54-56` (DOMPurify config) + `src/services/svgValidator.js:124-127` (same config).

**Locked DOMPurify call (load-bearing — MUST match exactly):**

```javascript
import DOMPurify from 'dompurify';

export default function TemplateDraftPreview({ svgContent, className }) {
  // D-03 — sanitize via the locked config (mirrors templateApplyService.js:55 byte-for-byte).
  // ANY drift here = production security regression (Pitfall 5).
  const sanitized = svgContent
    ? DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true, svgFilters: true } })
    : '';
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

**Anti-pattern:** Do NOT use `<img src={`data:image/svg+xml;utf8,${svg}`} />` — defeats DOMPurify, no validator path. Always render via sanitized inline HTML.

---

### A/B harness — `scripts/eval-prompt-library.cjs`

**Analog:** `scripts/generate-template-thumbnails.cjs` (entire 228 LOC). Mirror: shebang + `require()` of dotenv + CLI arg parser + serial loop with delay + summary block.

**Top of file (lines 1-24) — mirror exactly:**

```javascript
#!/usr/bin/env node
/**
 * eval-prompt-library.cjs — Phase 177 TGEN-06 A/B harness (D-12).
 * 5 generations × 6 template_types × 2 conditions = 60 calls. ~$0.63 / run @ Haiku 4.5.
 *
 * Usage:
 *   node scripts/eval-prompt-library.cjs --runs=5
 *   node scripts/eval-prompt-library.cjs --runs=5 --verbose
 */
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}
```

**CLI args + serial loop with delay (lines 27-54, 188-219) — mirror exactly. Specifically the 300ms inter-iteration delay (`Pitfall 3` in 175 ARCHITECTURE — never switch to unbounded `Promise#all`).**

**Summary block (lines 221-223) — mirror exactly:**

```javascript
console.log(`\n=== Summary ===\nProcessed: ${rows.length}\nSuccess:   ${ok}\nFailed:    ${failed}`);
console.log(`First-pass success — with-base-prompt:  ${withN}/${total} (${withPct}%)`);
console.log(`First-pass success — freeform-only:     ${freeN}/${total} (${freePct}%)`);
console.log(`Lift:                                   ${(withPct - freePct).toFixed(1)} percentage points`);
```

**Report destination:** `.planning/phases/177-ai-generation-pipeline-admin-queue-ui/prompt-library-eval.md` (D-12) and headline pasted into `177-VERIFICATION.md`.

---

### Wave-0 RED test pattern — `tests/integration/{edgeFunctionSpike,generateSvgTemplate,approveDraftPipeline,promptLibraryParity}.test.js`

**Analog:** `tests/integration/templateDraftsRls.test.js:20-58` (verbatim shape per RESEARCH §"Phase 176 Wave-0 RED test pattern: VERIFIED — copy this shape verbatim").

**Skip-guard preamble — copy verbatim:**

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const SHOULD_RUN = Boolean(URL && KEY && ANTHROPIC);

describe.runIf(SHOULD_RUN)('Phase 177 — generate-svg-template EF integration', () => {
  let supa;
  beforeAll(() => { supa = createClient(URL, KEY); });   // deferred — avoid suite-load crash
  afterAll(() => { /* no-op for now */ });

  it('rejects POST without admin JWT', async () => { /* ... */ });
  it('returns draftId on valid prompt + valid SVG', async () => { /* ... */ });
  it('retries 2× then lands needs_human_review on persistent validator fail', async () => { /* ... */ });
});
```

**Three lessons (RESEARCH lines 597-601):**
1. `createClient` deferred into `beforeAll` (suite-load doesn't crash on missing env)
2. `describe.runIf(SHOULD_RUN)` skips entire block cleanly
3. dotenv loads `.env.local` THEN `.env` with override semantics

**For `promptLibraryParity.test.js` (no env required, runs in CI):**

```javascript
import { describe, it, expect } from 'vitest';
import promptsJson from '../../supabase/functions/generate-svg-template/prompts.json' with { type: 'json' };
import { promptLibrary } from '../../src/services/aiTemplate/promptLibrary.js';

describe('Phase 177 — prompt library parity (D-08)', () => {
  it('promptLibrary.js and prompts.json are deep-equal by content', () => {
    expect(promptLibrary).toEqual(promptsJson);
  });
});
```

---

### Unit test (validator-order) — `tests/unit/generateValidatorOrder.test.js`

**Analog:** Generic Vitest pure-function test pattern. The TGEN-05 contract is enforced by mocking the Anthropic SDK + the Supabase client, then asserting the call order.

**Shape:**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { generate } from '../../supabase/functions/generate-svg-template/handlers/generate.ts';

describe('Phase 177 — TGEN-05 validator-before-INSERT order', () => {
  it('calls validateSvg BEFORE supabase.from(template_drafts).insert', async () => {
    const callOrder = [];
    const mockValidate = vi.fn(() => { callOrder.push('validateSvg'); return { ok: true, errors: [], warnings: [] }; });
    const mockInsert = vi.fn(() => { callOrder.push('insert'); return { select: () => ({ single: () => ({ data: { id: 'x' }, error: null }) }) }; });
    const mockSupa = { from: () => ({ insert: mockInsert }) };
    const mockAnthropic = { messages: { create: async () => ({ content: [{ type: 'tool_use', input: { svg: '<svg viewBox="0 0 1920 1080" />' } }] }) } };

    await generate({ /* args */ }, mockSupa, { Anthropic: mockAnthropic, validateSvg: mockValidate });

    expect(callOrder.indexOf('validateSvg')).toBeLessThan(callOrder.indexOf('insert'));
  });
});
```

**Note:** This test is what enforces Pitfall A1 mitigation. If the planner refactors `generate.ts`, this test fails → the refactor is rejected.

---

### Playwright E2E — `tests/e2e/admin-template-queue.spec.js` (Wave 4-5)

**Analog:** `tests/e2e/admin-starter-packs.spec.js` (entire file). Mirror: env-based skip + super-admin login + `test:setCurrentPage` CustomEvent navigation.

**Top + skip + nav (lines 17-51) — mirror exactly:**

```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

const SKIP = !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD;

async function gotoAdminTemplateQueue(page) {
  await page.getByRole('heading', { name: /^Super Admin Dashboard$/i }).first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('test:setCurrentPage', { detail: 'admin-template-queue' }));
  });
  await page.getByRole('heading', { name: /Template Queue/i }).first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await waitForPageReady(page);
}

test.describe('Admin Template Queue (Phase 177)', () => {
  test.skip(SKIP, 'TEST_SUPERADMIN_EMAIL/PASSWORD not configured');
  // pending list, row actions, auth gate
});
```

---

### App.jsx integration (MODIFIED) — `src/App.jsx` (3 surgical additions)

**Analog:** self — the file already encodes the pattern at three specific locations.

**Line 119-121 — add lazy import alongside other admin pages:**

```javascript
const AdminTemplatesPage = lazy(() => import('./pages/Admin/AdminTemplatesPage'));
const AdminEditTemplatePage = lazy(() => import('./pages/Admin/AdminEditTemplatePage'));
const AdminStarterPacksPage = lazy(() => import('./pages/Admin/AdminStarterPacksPage'));
const AdminTemplateQueuePage = lazy(() => import('./pages/Admin/AdminTemplateQueuePage'));   // ← NEW
```

**Line 577-578 — add to pageMap (mirror `admin-templates` / `admin-starter-packs` shape):**

```javascript
'admin-templates': <Suspense fallback={<PageLoader />}><AdminTemplatesPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
'admin-starter-packs': <Suspense fallback={<PageLoader />}><AdminStarterPacksPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
'admin-template-queue': <Suspense fallback={<PageLoader />}><AdminTemplateQueuePage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,   // ← NEW
```

**Line 687-690 — add to `adminToolPages` allowlist:**

```javascript
const adminToolPages = [
  'admin-tenants', 'admin-audit-logs', 'admin-system-events',
  'status', 'ops-console', 'tenant-admin', 'feature-flags', 'demo-tools', 'clients',
  'admin-templates', 'admin-starter-packs',
  'admin-template-queue',                          // ← NEW
];
```

**No URL-param routing.** RESEARCH Pitfall 6 (lines 473-477) verified `App.jsx` uses string-based `useState('dashboard')` — there is no `?draftId=` infrastructure. The override addendum (D-04 SUPERSEDED) enforces inline modal instead, so no new `currentPage` branch is needed.

---

### Supabase config — `supabase/config.toml` (AMENDED)

**Analog:** self — line 369 `[edge_runtime]` is the only existing block in the EF area; no `[functions.*]` block exists yet (this phase establishes the first one).

**Add at end of file (or after `[edge_runtime]`):**

```toml
[functions.generate-svg-template]
# WASM static_files bundling — required for npm:@resvg/resvg-wasm + jsr:@b-fuze/deno-dom (D-15 override).
# Requires Supabase CLI ≥2.7.0 + Docker for `supabase functions deploy` (Wave 0 verification task).
static_files = [ "./supabase/functions/generate-svg-template/index_bg.wasm" ]
```

Source: RESEARCH §"Constraint 2: SVG → PNG" (lines 813-820) + override addendum.

---

### Deno function manifest — `supabase/functions/generate-svg-template/deno.json` (GREENFIELD)

Source: RESEARCH §"Recommended Project Structure". Imports map shape:

```json
{
  "imports": {
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@0.95.0",
    "@b-fuze/deno-dom": "jsr:@b-fuze/deno-dom@0.1.x",
    "@resvg/resvg-wasm": "npm:@resvg/resvg-wasm@^2.6.2",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2"
  }
}
```

---

## Shared Patterns

### Authentication / Authorization (admin-only)

**Source:** RESEARCH §"Pattern 1" + Phase 176 verification (`is_admin()` + `is_super_admin()` SECURITY DEFINER helpers from migrations 009/012).

**Apply to:** `supabase/functions/generate-svg-template/index.ts` (every action; double-defense per D-18 — server-side EF check + RLS policy `template_drafts_admin_only`).

```typescript
const { data: isAdmin } = await supabase.rpc('is_admin');
const { data: isSuper } = await supabase.rpc('is_super_admin');
if (!isAdmin && !isSuper) return new Response('Forbidden', { status: 403 });
```

**Frontend allowlist gate:** `src/App.jsx:687-691` — `adminToolPages` array membership. Add `'admin-template-queue'` exactly like `'admin-templates'` / `'admin-starter-packs'`.

---

### Error Handling

**Source:** `src/services/marketplaceService.js` throughout (e.g. lines 73, 212, 246).

**Apply to:** all service-layer functions in `templateDraftsService.js`, all EF handlers.

```javascript
const { data, error } = await supabase./* ... */;
if (error) throw error;             // bubble to caller; UI catches and toasts
return data;
```

**Component-side catch** — mirror `AdminStarterPacksPage.jsx:42-47, 58-61, 70-74`:

```javascript
try {
  await someAction();
  await loadData();
} catch (err) {
  console.error('[AdminTemplateQueuePage] action failed:', err);
  showToast?.({ variant: 'error', message: 'Failed to <action>' });
}
```

**EF top-level catch** — copy from RESEARCH §"Code Examples" lines 1047-1050:

```typescript
try { /* dispatch */ }
catch (e) {
  console.error('[generate-svg-template]', e);
  return Response.json({ error: e.message }, { status: 500 });
}
```

---

### Validation (svgValidator)

**Source:** `src/services/svgValidator.js:30-171` (the entire pure function — already injectable).

**Apply to:**
1. EF generate handler (server-side gate at INGEST — TGEN-05 / Pitfall A1) — **mandatory**.
2. `TemplateDraftEditModal.jsx` Save & Publish path — client-side gate before invoking EF approve (defense-in-depth).
3. `BulkTemplateUpload.jsx:180` — already in place; reference shape only.

**Locked DOMPurify config (load-bearing):**

```javascript
{ USE_PROFILES: { svg: true, svgFilters: true } }
```

This appears at:
- `src/services/svgValidator.js:124-127` (Rule 4 byte-equality drift check)
- `src/services/templateApplyService.js:54-56` (apply-time sanitization)
- `src/components/Admin/TemplateDraftPreview.jsx` (NEW — Pending tab inline preview)

**ANY drift between these sites = production security regression (Pitfall 5).**

---

### Skip-guarded integration tests

**Source:** `tests/integration/templateDraftsRls.test.js:20-58` (Phase 176 lesson, verified shape).

**Apply to:** all 4 new integration test files (`edgeFunctionSpike`, `generateSvgTemplate`, `approveDraftPipeline`, `promptLibraryParity` is the exception — no env needed).

```javascript
const SHOULD_RUN = Boolean(/* env tuple */);
describe.runIf(SHOULD_RUN)('...', () => {
  let supa;
  beforeAll(() => { supa = createClient(URL, KEY); });   // ← deferred is mandatory
});
```

---

### Service-role Supabase access from EF

**Source:** RESEARCH §"Code Examples" lines 1037-1041 (split-client pattern: JWT-scoped for admin RPC + service-role for mutations).

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});                                                       // ← caller-scoped, admin RPC only

const supabaseSr = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);  // ← mutations
```

**Apply to:** all EF handlers that INSERT/UPDATE `template_drafts` or `svg_templates`.

---

### Atomic / idempotent migration

**Source:** `supabase/migrations/176_template_drafts_and_vertical.sql` (Phase 175/176 pattern: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT + DO ASSERT).

**Apply to:** N/A for Phase 177 per D-05 OVERRIDE — the `'needs_human_review'` value is **already in** the Phase 176 migration (verified at line 62). **No Phase 177 migration is required**. If a downstream need surfaces (e.g., a new index for queue queries), follow the Phase 176 shape.

---

## No Analog Found (GREENFIELD — fall back to RESEARCH.md)

| File | Role | Data Flow | Reason | Authoritative Reference |
|------|------|-----------|--------|-------------------------|
| `supabase/functions/generate-svg-template/index.ts` | EF entry | request-response | First Edge Function in the codebase | RESEARCH §"Code Examples → Edge Function full skeleton" (lines 1009-1052) |
| `supabase/functions/generate-svg-template/handlers/generate.ts` | EF handler | retry-loop | No prior LLM-with-retry path in repo | RESEARCH §"Pattern 2" + §TGEN-02 retry loop |
| `supabase/functions/generate-svg-template/deno-dom-domparser.ts` | utility | transform | No DOM-injection ctor exists in Deno context in repo | RESEARCH §"Constraint 1" (lines 758-776) |
| `supabase/functions/generate-svg-template/deno.json` | config | static-config | No EF deno manifest exists | RESEARCH §"Recommended Project Structure" |
| `supabase/functions/generate-svg-template/prompts.json` | static-data | n/a | No prompt-library file exists | RESEARCH §"prompts.json shape (D-08 + D-09)" + Pitfall 8 |
| `supabase/functions/generate-svg-template/index_bg.wasm` | binary | n/a | Vendored from `@resvg/resvg-wasm` package | RESEARCH §"Constraint 2" |
| `src/services/aiTemplate/promptLibrary.js` | data module | static-data | Mirror of `prompts.json` for Vite bundling | RESEARCH §"prompts.json shape" + D-08 |
| `src/components/Admin/TemplateDraftPreview.jsx` | component | sanitize-then-render | First standalone sanitized-SVG-preview component (the existing call sites are inline within larger components) | `templateApplyService.js:54-56` for the locked DOMPurify call |

**For all 8 GREENFIELD files: do not invent new patterns.** Follow the RESEARCH.md sections cited; they are pre-validated against Context7 + Supabase docs + Anthropic cookbook (RESEARCH §"Sources"). The Wave-0 spike (`tests/integration/edgeFunctionSpike.test.js`) ratifies the trio (deno-dom + resvg-wasm + anthropic-sdk) live before any other EF code is written.

---

## Metadata

**Analog search scope:**
- `src/pages/Admin/` (admin pages — full)
- `src/components/Admin/` (admin components — full)
- `src/services/` (service layer — `marketplaceService.js`, `svgValidator.js`, `templateApplyService.js`)
- `scripts/` (Node CLI scripts — `generate-template-thumbnails.cjs`)
- `tests/integration/` (skip-guard test pattern — `templateDraftsRls.test.js`)
- `tests/e2e/` (Playwright pattern — `admin-starter-packs.spec.js`)
- `src/App.jsx` (route registration — lines 119-121, 577-578, 687-691)
- `supabase/config.toml` (config block precedent — line 369)
- `supabase/functions/` — verified empty (RESEARCH lines 555-559)

**Files scanned (read or grepped during mapping):** 13 in-repo files + 3 phase planning docs (CONTEXT.md, RESEARCH.md, VALIDATION.md).

**Pattern extraction date:** 2026-05-06.

**Override addendum compliance:**
- D-04 (inline modal, NOT AdminEditTemplatePage extension) — encoded in `TemplateDraftEditModal.jsx` mapping
- D-05 (no Phase 177 migration) — listed under "Shared Patterns → Atomic / idempotent migration" as N/A
- D-15 (`@resvg/resvg-wasm`, NOT `@resvg/resvg-js`) — encoded in approve handler + config.toml mappings
