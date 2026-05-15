# Phase 178: Vertical Content Seeding - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 19 (5 NEW handlers/migrations/scripts, 6 MODIFIED source files, 6 NEW/MODIFIED tests, 1 NEW UI component, 3 NEW wave artifacts)
**Analogs found:** 19/19 (every file has a strong existing analog inside the same repo; no greenfield patterns)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/178_backfill_existing_127_vertical.sql` (NEW) | migration | batch (UPDATE + DO-ASSERT) | `supabase/migrations/176_template_drafts_and_vertical.sql` | exact (same DO-ASSERT idempotent atomic-migration shape) |
| `supabase/functions/generate-svg-template/handlers/approve_bulk.ts` (NEW) | edge-function handler | request-response (looped) | `supabase/functions/generate-svg-template/handlers/approve.ts` (the per-row flow being looped) | exact (loops the analog per-ID) |
| `supabase/functions/generate-svg-template/handlers/reject_bulk.ts` (NEW) | edge-function handler | request-response (looped) | `supabase/functions/generate-svg-template/handlers/reject.ts` | exact (loops the analog per-ID) |
| `supabase/functions/generate-svg-template/index.ts` (MODIFIED) | router/dispatcher | request-response | Same file lines 160-201 (existing `approve` / `reject` action blocks) | exact (paste-and-rename) |
| `supabase/functions/generate-svg-template/handlers/generate.ts` (MODIFIED) | edge-function handler | request-response | Same file lines 189-190 (system-prompt assembly site) | exact (in-place insertion) |
| `supabase/functions/generate-svg-template/prompts.json` (MODIFIED) | data / config | static | Same file (existing 6 entries) | exact |
| `src/services/aiTemplate/promptLibrary.js` (MODIFIED) | data / config | static | Same file (existing 6 entries) — parity-locked with prompts.json | exact |
| `src/services/aiTemplate/templateDraftsService.js` (MODIFIED) | service | request-response | Same file lines 33-63 (`generateDraft` / `approveDraft` / `rejectDraft` invoke pattern) | exact |
| `src/pages/Admin/AdminTemplateQueuePage.jsx` (MODIFIED) | page component | event-driven (CRUD) | Same file (Pending tab list + reject Modal at lines 355-402) | exact (extends existing tab) |
| `src/components/Admin/BulkActionConfirmModal.jsx` (NEW) | component (modal) | event-driven | `src/components/Admin/TemplateDraftEditModal.jsx` | role-match (Modal+Button+Alert composition) |
| `src/components/Admin/GenerateTabForm.jsx` (MODIFIED) | component (form) | request-response | Same file lines 26-93 (existing form + Select fields) | exact |
| `scripts/seed-vertical-templates.cjs` (NEW) | CLI script | batch + request-response | `scripts/eval-prompt-library.cjs` (skeleton) + `scripts/generate-template-thumbnails.cjs` (env-loading + service-role client) | role-match (closest twin = eval harness) |
| `scripts/seedTopics.js` (NEW) | data / config | static | None — first authored asset of this kind | no analog |
| `scripts/verify-178-counts.cjs` (NEW) | CLI script (verification) | batch (SQL counts) | `scripts/generate-template-thumbnails.cjs` (Supabase service-role client + env-loading) | role-match |
| `tests/integration/promptLibraryParity.test.js` (MODIFIED) | test (integration) | static | Same file (existing parity assertion) | exact |
| `tests/integration/approveBulk.test.js` (NEW) | test (integration) | request-response | `tests/integration/approveAtomicity.test.js` (file-source assertions over the handler) | role-match |
| `tests/integration/rejectBulk.test.js` (NEW) | test (integration) | request-response | `tests/integration/rejectIdempotency.test.js` | exact |
| `tests/unit/generateOrientation.test.js` (NEW) | test (unit) | request-response | `tests/unit/generateValidatorOrder.test.js` | exact |
| `tests/e2e/admin-template-queue.spec.js` (MODIFIED) | test (E2E) | event-driven | Same file (Phase 177 baseline) | exact |
| `.planning/phases/178-…/178-WAVE-{vertical}-RUN.md` (NEW × 3) | artifact / log | static | None — first artifact of this kind | no analog |

---

## Pattern Assignments

### `supabase/migrations/178_backfill_existing_127_vertical.sql` (NEW migration, batch UPDATE + DO-ASSERT)

**Analog:** `supabase/migrations/176_template_drafts_and_vertical.sql` (DO-ASSERT block + idempotent ALTER pattern)

**Header pattern** (176, lines 1-20):
```sql
-- ============================================================================
-- Migration 176: template_drafts + svg_templates.vertical + gallery_templates VIEW
-- Phase 176 — Schema Foundation (v21.0 Templates at Scale)
--
-- Addresses (3 ROADMAP success criteria for Phase 176): ...
--
-- Pattern references:
--   migration 094 — svg_templates base table + RLS + UUID PK + JSONB metadata
--   migration 102 — admin-only RLS pattern via `is_admin() OR is_super_admin()`
--   migration 175 — DROP-then-ADD CONSTRAINT idempotency + DO $$ ASSERT $$
--
-- Idempotent. No DOWN migration. Unblocks Phases 177, 178, 179.
-- ============================================================================
```

**Self-asserting verification block** (176, lines 194-255 — verbatim DO-ASSERT pattern to copy):
```sql
DO $$
DECLARE
  v_drafts_cols      INTEGER;
  v_drafts_rls       BOOLEAN;
  ...
BEGIN
  SELECT COUNT(*) INTO v_drafts_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'template_drafts'
      AND column_name IN ('id','svg_content',…);
  ASSERT v_drafts_cols = 8,
    format('SC-1: expected 8 columns on template_drafts, got %s', v_drafts_cols);
  ...
END $$;
```

**Idempotency keys to copy:**
- `IF NOT EXISTS` on `CREATE TABLE` / `ADD COLUMN`
- `DROP CONSTRAINT IF EXISTS` then `ADD CONSTRAINT` (lines 51-55, 94-98)
- ON CONFLICT (slug) DO NOTHING — see migration 175 lines 95-96
- `DO $$ … ASSERT … $$` block at the END of the migration that fails the apply if pre/post invariants don't hold

**Phase 178 specifics (from RESEARCH §"Database / Migration"):**
- Pre-state DO-ASSERT confirms `COUNT(*) = 0` for vertical-tagged rows (defense)
- Three UPDATEs (Restaurant→restaurants, Retail→retail, Healthcare→healthcare) with `WHERE category = 'X' AND vertical IS NULL`
- Post-state DO-ASSERT confirms each vertical bucket has `> 0` rows AND that backfilled count equals the `COUNT(category='X')` total (Pitfall 4 mitigation — case-mismatch trap)

**No DOWN migration** (matches all 175/176/177).

---

### `supabase/functions/generate-svg-template/handlers/approve_bulk.ts` (NEW handler, looped)

**Analog:** `supabase/functions/generate-svg-template/handlers/approve.ts` (the per-row handler being iterated)

**Imports pattern** (approve.ts lines 34-36):
```typescript
import { rasterize } from "../resvg-wasm-init.ts";
import { uploadPng } from "../s3.ts";
import { validateSvg } from "../svgValidator.ts";
```

**Phase 178 imports** (approve_bulk.ts):
```typescript
import { approve } from "./approve.ts";  // CRITICAL: bulk loops this — no logic duplication
```

**Header comment block to copy verbatim style** (approve.ts lines 1-33):
```typescript
// Phase 177 — approve handler (refactored 177-08 for BL-02 + BL-06 + WR-09 closure).
//
// TADM-03 atomicity: validate → rasterize → S3 PUT → rpc('approve_draft_atomic').
// ...
// Source-order awk gate enforces the atomic sequence in this file:
//   validateSvg(draft.svg_content) → rasterize( → uploadPng( → rpc("approve_draft_atomic"
```

**Phase 178 header should include:**
- Reference to D-05 / D-08 / Pitfall 1 / Pitfall 3
- Statement that source-order awk gate is preserved per-ID via the `approve(...)` import
- BULK_HARD_CAP=50 + INTER_CALL_DELAY_MS=300 documented up-top

**Body schema + result interface pattern** (approve.ts lines 38-47):
```typescript
interface ApproveBody {
  draftId: string;
  reviewerUid: string;
}

interface ApproveResult {
  ok: true;
  thumbnail_url: string;
  svg_template_id: string;
}
```

**Phase 178 shape:**
```typescript
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
```

**Error-as-Response pattern** (approve.ts lines 158-167 — preserved per-ID):
```typescript
throw new Response(
  JSON.stringify({
    error: "Draft failed re-validation at approve",
    issues: validatorResult.errors,
  }),
  { status: 422, headers: { "Content-Type": "application/json" } },
);
```

**Phase 178 catches and converts to per-ID `error` string** (RESEARCH §"approve_bulk.ts shape"):
```typescript
try {
  const r = await approve({ draftId, reviewerUid: body.reviewerUid }, supabase);
  results.push({ draftId, ok: true, thumbnail_url: r.thumbnail_url, svg_template_id: r.svg_template_id });
} catch (e) {
  const msg = e instanceof Response
    ? `HTTP ${e.status} — ${await e.text().catch(() => "")}`
    : (e instanceof Error ? e.message : String(e));
  results.push({ draftId, ok: false, error: msg });
}
```

**300ms throttle pattern** (eval-prompt-library.cjs line 249 — must mirror, never `Promise.all`):
```typescript
if (i < total - 1) await new Promise(r => setTimeout(r, 300));
```

---

### `supabase/functions/generate-svg-template/handlers/reject_bulk.ts` (NEW handler, looped)

**Analog:** `supabase/functions/generate-svg-template/handlers/reject.ts`

**Body schema pattern** (reject.ts lines 21-30):
```typescript
interface RejectBody {
  draftId: string;
  reason?: string;
  reviewerUid: string;
}

interface RejectResult {
  ok: true;
  draftId: string;
}
```

**Phase 178 shape:** `{ draftIds: string[], reviewerUid: string, reason?: string }` — `reason` applied to ALL drafts (D-06).

**Race-guard contract preserved per-ID** (reject.ts lines 67-79 — relied upon, NOT reimplemented):
```typescript
const { data, error } = await supabase
  .from("template_drafts")
  .update({
    status: "rejected",
    metadata: { ...(draft.metadata ?? {}), reviewed_by, reviewed_at, rejected_reason },
  })
  .eq("id", body.draftId)
  .in("status", ["pending", "needs_human_review"])  // ← BL-03/BL-NEW-02 race guard
  .select("id")
  .single();
```

**Inner per-ID call:** `await reject({ draftId, reason: body.reason, reviewerUid: body.reviewerUid }, supabase)` — same 300ms inter-iteration delay; no hard cap concern (single UPDATE per-ID is ~50ms; 50 IDs = 2.5s well under EF cap).

---

### `supabase/functions/generate-svg-template/index.ts` (MODIFIED — add 2 actions)

**Analog:** Same file (existing `approve` action lines 160-171 — paste-and-rename)

**Existing `approve` block to copy** (index.ts lines 160-171):
```typescript
if (body.action === "approve") {
  // Service-role client for the cross-table mutations (svg_templates INSERT +
  // template_drafts UPDATE). The admin gate above already validated caller.
  const supabaseSr = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user } } = await supabase.auth.getUser();
  return withCors(Response.json(
    await approve({ draftId: body.draftId, reviewerUid: user!.id }, supabaseSr),
  ));
}
```

**Phase 178 additions (drop in alongside existing actions):**
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

**Imports to add at top of file** (alongside existing `approve`/`reject` imports at lines 24-26):
```typescript
import { approveBulk } from "./handlers/approve_bulk.ts";
import { rejectBulk } from "./handlers/reject_bulk.ts";
```

**CORS / admin-gate inheritance:** Both new actions inherit `withCors()` envelope and `is_admin() OR is_super_admin()` gate from lines 41-75 — no new code in the dispatcher beyond the two `if` blocks.

---

### `supabase/functions/generate-svg-template/handlers/generate.ts` (MODIFIED — add `orientation`)

**Analog:** Same file (system-prompt assembly site at line 189-190)

**Body interface to extend** (generate.ts lines 48-53):
```typescript
interface GenerateBody {
  vertical: Vertical;
  template_type: TemplateType;
  prompt: string;
  callerUid?: string;
}
```

**Phase 178 addition:**
```typescript
interface GenerateBody {
  vertical: Vertical;
  template_type: TemplateType;
  prompt: string;
  orientation?: "landscape" | "portrait";  // NEW — default landscape
  callerUid?: string;
}
```

**System-prompt assembly site to extend** (generate.ts lines 189-190):
```typescript
const promptEntry = pickPrompt(body.template_type, body.vertical);
const systemPrompt = promptEntry.system_prompt;
```

**Phase 178 helper + call site** (RESEARCH §"Code Examples — Example 3"):
```typescript
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
  return baseSystemPrompt
    .replace(/viewBox="0 0 1920 1080"/g, 'viewBox="0 0 1080 1920"')
    + PORTRAIT_GUIDANCE;
}

const systemPrompt = composeSystemPrompt(
  promptEntry.system_prompt,
  body.orientation ?? "landscape",
);
```

**LOAD-BEARING ORDER UNTOUCHED (TGEN-05 awk gate):** `validateSvg(svg, …)` at line 245 must STILL execute before INSERT at line 268. Phase 178 only injects upstream of the LLM call — does not move the validator gate.

**Pull-through for `index.ts` `action=generate` block** (index.ts lines 139-158): pass `body.orientation` through to `generate(...)`:
```typescript
const result = await generate(
  {
    vertical: body.vertical ?? null,
    template_type: body.template_type,
    prompt: body.prompt,
    orientation: body.orientation,  // NEW
    callerUid: user?.id ?? body.callerUid,
  },
  supabaseSr,
);
```

---

### `src/services/aiTemplate/promptLibrary.js` + `supabase/functions/generate-svg-template/prompts.json` (MODIFIED, parity-locked)

**Analog:** Same file (existing 6 cross-vertical entries — promptLibrary.js lines 10-59)

**Existing entry shape to clone for per-vertical entries** (promptLibrary.js lines 11-18):
```javascript
{
  "id": "menu-cross-vertical-v1",
  "template_type": "menu",
  "vertical": null,
  "label": "Menu (cross-vertical)",
  "example_freeform": "Promote Mother's Day brunch special...",
  "system_prompt": "You generate one complete SVG digital-signage menu template via the emit_svg_template tool.\n\nHARD RULES:\n- Output a single complete <svg>...</svg> with viewBox=\"0 0 1920 1080\".\n..."
}
```

**Phase 178 expansion contract (from RESEARCH §"promptLibrary Expansion"):**
- 6 existing cross-vertical entries DO NOT change (D-09 fallback mechanism)
- Add 18 per-vertical entries: 6 base types × 3 verticals (`vertical: 'restaurants' | 'retail' | 'healthcare'`)
- Add 4 niche entries pinned to specific verticals: `(drive_thru, restaurants)`, `(queue_status, restaurants|retail)`, `(waiting_room_ambient, healthcare)`, `(emergency_alert, healthcare)`
- Final ~28 entries; parity test enforces deep-equal between the .js array and prompts.json

**Critical lock from existing file header** (promptLibrary.js lines 1-9):
```javascript
/**
 * promptLibrary - Phase 177 TGEN-06 (D-08, D-09, D-10).
 *
 * SOURCE OF TRUTH for the curated prompt library.
 * parity-tested against supabase/functions/generate-svg-template/prompts.json
 * by tests/integration/promptLibraryParity.test.js - drift = test failure.
 *
 * To update: edit BOTH files. Vitest will catch any divergence.
 */
```

**System-prompt template for per-vertical entries** preserves the HARD RULES preamble verbatim and replaces the `*-SPECIFIC GUIDANCE` block with vertical-flavored guidance (e.g., for `(menu, restaurants)`: "RESTAURANTS-SPECIFIC GUIDANCE: full menu board layout with daypart sections; use chef-recommendation accent stripes; …").

**New sibling export `templateTypesPerVertical`** (RESEARCH §"Frontend Changes — Suggested helper shape"):
```javascript
// promptLibrary.js — appended after the array
export const templateTypesPerVertical = {
  null:           ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip'],
  restaurants:    ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'daypart_menu', 'drive_thru'],
  retail:         ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'queue_status'],
  healthcare:     ['reminder', 'announcement', 'health_tip', 'wayfinding', 'waiting_room_ambient', 'emergency_alert', 'vaccination_reminder'],
};
```

This is data, not logic — colocated with promptLibrary array; parity test extension can additionally assert every (template_type, vertical) library entry's combination is in `templateTypesPerVertical`.

---

### `src/services/aiTemplate/templateDraftsService.js` (MODIFIED — add bulk ops + extend generateDraft)

**Analog:** Same file (`generateDraft` / `approveDraft` / `rejectDraft` invoke pattern at lines 33-63)

**Existing pattern to clone** (templateDraftsService.js lines 33-39):
```javascript
export async function generateDraft({ vertical, template_type, prompt }) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'generate', vertical, template_type, prompt },
  });
  if (error) throw error;
  return data;
}
```

**Phase 178 additions (RESEARCH §"Frontend Changes #1"):**
```javascript
export async function generateDraft({ vertical, template_type, orientation, prompt }) {  // ← orientation added
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'generate', vertical, template_type, orientation, prompt },
  });
  if (error) throw error;
  return data;
}

export async function bulkApproveDrafts(draftIds) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'approve_bulk', draftIds },
  });
  if (error) throw error;
  return data;  // { ok: true, results: [{ draftId, ok, error?, thumbnail_url? }, ...] }
}

export async function bulkRejectDrafts(draftIds, reason) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'reject_bulk', draftIds, reason: reason ?? null },
  });
  if (error) throw error;
  return data;
}
```

**Error-throwing contract preserved** (header comment line 10): "Mirrors src/services/marketplaceService.js error-throwing pattern" — every helper throws; caller catches.

---

### `src/pages/Admin/AdminTemplateQueuePage.jsx` (MODIFIED — Pending tab + Generate tab extensions)

**Analog:** Same file (existing reject Modal pattern lines 355-402; existing tab + draft list lines 137-329)

**Existing reject Modal pattern to extend for bulk-confirm modal** (AdminTemplateQueuePage.jsx lines 355-402):
```jsx
<Modal
  open={!!confirmReject}
  onClose={() => busyDraftId === null && setConfirmReject(null)}
  size="sm"
  aria-labelledby="reject-confirm-title"
>
  {confirmReject && (
    <div className="p-6">
      <h3 id="reject-confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
        Reject draft?
      </h3>
      ...
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setConfirmReject(null)}>Cancel</Button>
        <Button variant="danger" onClick={handleRejectConfirm} data-testid="btn-reject-confirm">
          {busyDraftId !== null ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>
    </div>
  )}
</Modal>
```

**Existing per-row action pattern to extend** (AdminTemplateQueuePage.jsx lines 67-103):
```jsx
const handleApprove = async (draft) => {
  setBusyDraftId(draft.id);
  try {
    const res = await approveDraft(draft.id);
    showToast?.({ variant: 'success', message: ... });
    await loadDrafts();
  } catch (err) {
    console.error('[AdminTemplateQueuePage] approve failed:', err);
    showToast?.({ variant: 'error', message: `Approve failed: ${err.message}` });
  } finally {
    setBusyDraftId(null);
  }
};
```

**Phase 178 state additions (per UI-SPEC):**
```jsx
const [selectedIds, setSelectedIds] = useState(new Set());
const [verticalFilter, setVerticalFilter] = useState('all');
const [typeFilter, setTypeFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');
const [bulkConfirmState, setBulkConfirmState] = useState(null);
// null | { action: 'approve' | 'reject', draftIds: string[], phase: 'confirm' | 'executing' | 'done', execResults: [...], reason: string }
const [bulkRejectReason, setBulkRejectReason] = useState('');
```

**Filter chip imports + render** (UI-SPEC §"Surface 1") — use existing `FilterChips` from `src/design-system/components/FilterChips.jsx` with `variant="default"` (gray-900 active, NOT brand). Three rows; client-side filtering via `useMemo` over `drafts[]`.

**Per-row checkbox column + bulk-toolbar render** (UI-SPEC §"Surface 2-3") — added before the existing `<TemplateDraftPreview>` block; `<Checkbox>` from `src/design-system/components/FormElements.jsx`.

**Confirm modal — extracted to new `BulkActionConfirmModal.jsx` component** (see next entry).

**LOCKED — DO NOT MODIFY (UI-SPEC §"What Is NOT Changing"):**
- Per-row Approve / Edit / Reject buttons (lines 294-322)
- Vertical chip / template-type chip / attempt-count chip (lines 240-258)
- `needs_human_review` amber row highlight (line 220)
- Existing Reject Modal (lines 355-402)
- `TemplateDraftEditModal` invocation (lines 343-353)

---

### `src/components/Admin/BulkActionConfirmModal.jsx` (NEW component)

**Analog:** `src/components/Admin/TemplateDraftEditModal.jsx` (Modal + Button + Alert composition + multi-step state)

**Header comment pattern to copy** (TemplateDraftEditModal.jsx lines 1-22):
```jsx
/**
 * BulkActionConfirmModal — Phase 178 D-08 (per-draft execution feed + summary).
 *
 * Multi-phase modal: confirm → executing → done.
 * Pre-confirm: count + first-5 draft names + Confirm/Cancel buttons.
 * Executing: streaming feed of per-draft results (✓/✗) + disabled "Please wait…" button.
 * Done: final summary + Close button (closeModalAndReload triggers loadDrafts()).
 *
 * Triggered by AdminTemplateQueuePage's bulk-action toolbar (Approve-selected / Reject-selected).
 * Calls bulkApproveDrafts / bulkRejectDrafts from templateDraftsService.
 */
```

**Imports pattern** (TemplateDraftEditModal.jsx lines 24-32):
```jsx
import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Modal, Alert } from '../../design-system';
import { bulkApproveDrafts, bulkRejectDrafts } from '../../services/aiTemplate/templateDraftsService';
```

**Multi-step state pattern + effect** (TemplateDraftEditModal.jsx lines 40-49):
```jsx
const [editedSvg, setEditedSvg] = useState(draft?.svg_content ?? '');
const [saving, setSaving] = useState(false);
const [validationErrors, setValidationErrors] = useState([]);
```

**Phase 178 state pattern (from UI-SPEC §"Surface 4"):**
```jsx
const [phase, setPhase] = useState('confirm');  // 'confirm' | 'executing' | 'done'
const [execResults, setExecResults] = useState([]);
const feedRef = useRef(null);
useEffect(() => {
  if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
}, [execResults.length]);
```

**Modal close behavior** (UI-SPEC §"Surface 4 — Modal Close Behavior"):
- Pre-confirm: Escape closes (Modal default)
- Executing: `closeOnEscape={false}` `closeOnOverlay={false}`
- Done: Escape re-enabled

**data-testids required** (UI-SPEC):
- `bulk-confirm-modal`
- `btn-bulk-confirm`
- `bulk-exec-feed`
- `btn-bulk-close`

---

### `src/components/Admin/GenerateTabForm.jsx` (MODIFIED — orientation dropdown + vertical-filtered template_type)

**Analog:** Same file (existing two-Select grid at lines 26-93)

**Existing Select pattern to clone for orientation** (GenerateTabForm.jsx lines 26-40):
```jsx
const VERTICAL_OPTIONS = [
  { value: 'cross-vertical', label: 'Cross-vertical (any)' },
  { value: 'restaurants', label: 'Restaurants & QSR' },
  { value: 'retail', label: 'Retail & e-commerce' },
  { value: 'healthcare', label: 'Healthcare & wellness' },
];

const TEMPLATE_TYPE_OPTIONS = [
  { value: 'menu', label: 'Menu' },
  ...
];
```

**Phase 178 additions:**
```jsx
const ORIENTATION_OPTIONS = [
  { value: 'landscape', label: 'Landscape (1920×1080)' },
  { value: 'portrait', label: 'Portrait (1080×1920)' },
];

// State
const [orientation, setOrientation] = useState('landscape');

// Vertical-filtered template_type derivation (D-12 / UI-SPEC Surface 6)
import { templateTypesPerVertical } from '../../services/aiTemplate/promptLibrary';
const filteredTypeOptions = useMemo(() => {
  const verticalKey = vertical === 'cross-vertical' ? null : vertical;
  const allowed = templateTypesPerVertical[verticalKey] ?? templateTypesPerVertical.null;
  return TEMPLATE_TYPE_OPTIONS.filter(opt => allowed.includes(opt.value));
}, [vertical]);

// Reset templateType on vertical change if no longer in filtered set
useEffect(() => {
  if (!filteredTypeOptions.some(o => o.value === templateType)) {
    setTemplateType(filteredTypeOptions[0]?.value ?? 'menu');
  }
}, [filteredTypeOptions]);
```

**`handleSubmit` extension** (GenerateTabForm.jsx line 66):
```jsx
const result = await generateDraft({
  vertical: verticalForApi,
  template_type: templateType,
  orientation,  // NEW
  prompt: prompt.trim(),
});
```

**data-testid additions** (UI-SPEC):
- `gen-orientation` (new Select)
- `gen-type` already exists — unchanged

---

### `scripts/seed-vertical-templates.cjs` (NEW — main seed driver)

**Analog (skeleton):** `scripts/eval-prompt-library.cjs`
**Analog (env-loading + service-role client):** `scripts/generate-template-thumbnails.cjs`

**Header / dotenv pattern** (eval-prompt-library.cjs lines 37-43):
```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// dotenv (mirror scripts/generate-template-thumbnails.cjs env-loading pattern)
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}
```

**CLI args parser pattern** (eval-prompt-library.cjs lines 45-69):
```javascript
const args = process.argv.slice(2);
const options = { runs: 5, verbose: false, types: null };
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--verbose') options.verbose = true;
  else if (arg.startsWith('--runs=')) options.runs = parseInt(arg.slice('--runs='.length), 10);
  ...
  else if (arg === '--help' || arg === '-h') {
    console.log(`Usage: …`);
    process.exit(0);
  }
}
```

**Phase 178 CLI flags (RESEARCH §"Seed Script CLI flags"):**
```
--vertical=<restaurants|retail|healthcare>   Required
--cost-soft=15
--cost-hard=20
--resume-from=<slug>
--limit=N
--dry-run
--out-artifact=<path>
--verbose
```

**Service-role Supabase client setup** (generate-template-thumbnails.cjs analog — env vars `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`):
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
```

**EF invoke pattern** (RESEARCH §"Code Examples — Example 2"):
```javascript
const { data, error } = await supabase.functions.invoke('generate-svg-template', {
  body: {
    action: 'generate',
    vertical: t.vertical,
    template_type: t.template_type,
    orientation: t.orientation,
    prompt: composedPrompt,
  },
});
```

**300ms throttle (Pitfall 3)** (eval-prompt-library.cjs line 249):
```javascript
if (i < topics.length - 1) await new Promise((r) => setTimeout(r, 300));
```

**Cost cap pattern** (RESEARCH §"Code Examples — Example 2"):
```javascript
totalCostUsd += COST_PER_ATTEMPT_USD;  // ~$0.04
if (totalCostUsd >= options.costHard) {
  console.error(`Hard cost cap $${options.costHard} exceeded — aborting`);
  break;
}
if (totalCostUsd >= options.costSoft && !softWarned) {
  console.warn(`Soft cost cap $${options.costSoft} reached — continuing; abort with --cost-hard if needed`);
  softWarned = true;
}
```

**Exit-code convention** (eval-prompt-library.cjs lines 320-324):
```javascript
if (pooledLift >= 25) {
  process.exit(0);
} else {
  process.exit(2); // soft-fail (distinguish from crash exit codes)
}
```

Phase 178: exit 0 on success, exit 2 on cost-hard-cap-exceeded (mid-run abort), exit 1 on crash.

---

### `scripts/seedTopics.js` (NEW — ~390 topic records)

**Analog:** None — first authored asset of this kind. Use ESM export shape consistent with `src/services/aiTemplate/promptLibrary.js` (since the seed script's CJS runtime can `require()` ESM static-data files in Node 22+).

**Per-record shape locked by D-15** (CONTEXT.md L80, RESEARCH §"seedTopics.js"):
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

**Validation hook (loaded by seed script):**
- Slug uniqueness (assert no dups within file)
- Cross-check against existing `svg_templates.slug` (Pitfall 3 — slug collision)
- `vertical ∈ {restaurants, retail, healthcare}` (NOT 'cross-vertical' — that's Generate-tab UI only)
- `template_type ∈ templateTypesPerVertical[vertical]`
- `orientation ∈ {landscape, portrait}`

---

### `scripts/verify-178-counts.cjs` (NEW — SC verification harness)

**Analog:** `scripts/generate-template-thumbnails.cjs` (Supabase service-role client + env-loading) + structural mirror of any phase-verification script

**SQL queries to run** (RESEARCH §"SC verification queries"):
```sql
-- TVRT-01..03 (per vertical)
SELECT COUNT(*) FROM svg_templates WHERE vertical='restaurants' AND is_active=TRUE;  -- ≥80
SELECT COUNT(DISTINCT metadata->>'template_type') FROM svg_templates WHERE vertical='restaurants' AND is_active=TRUE;  -- ≥8
SELECT DISTINCT orientation FROM svg_templates WHERE vertical='restaurants' AND is_active=TRUE
  AND metadata->>'template_type' IN ('menu','daypart_menu');

-- TCAT-01
SELECT COUNT(*) FROM gallery_templates WHERE is_active=TRUE;  -- ≥427

-- TCAT-04
SELECT COUNT(*) FROM information_schema.check_constraints
  WHERE constraint_name='chk_svg_templates_category_enum';  -- =1
```

**Service-role pattern** (generate-template-thumbnails.cjs lines 22-24):
```javascript
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}
```

**S3 thumbnail audit:** For each net-new svg_templates row with `vertical IS NOT NULL AND is_active=TRUE`, HEAD `s3://bizscreen-media/<thumbnail>` to confirm 200. Reuse existing AWS SDK setup in EF (or shell-script `aws s3api head-object`).

---

### `tests/integration/promptLibraryParity.test.js` (MODIFIED — extend assertions)

**Analog:** Same file (existing 33-line test)

**Existing assertions to extend** (promptLibraryParity.test.js lines 22-32):
```javascript
describe('Phase 177 — prompt library parity (D-08)', () => {
  it('promptLibrary.js and prompts.json are deep-equal by content', () => {
    expect(promptLibrary).toEqual(promptsJson);
  });

  it('contains at least 6 entries (one per template_type)', () => {
    expect(promptLibrary.length).toBeGreaterThanOrEqual(6);
    const types = new Set(promptLibrary.map((p) => p.template_type));
    expect(types).toEqual(new Set(['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip']));
  });
});
```

**Phase 178 additions:**
- Update `length` assertion to `≥18` (or precise final count)
- Add: every entry's `(template_type, vertical)` combination is unique across the array
- Add: every entry's `(template_type, vertical)` is present in `templateTypesPerVertical[vertical]`
- Keep deep-equal assertion verbatim (it scales naturally to N entries)

---

### `tests/integration/approveBulk.test.js` (NEW)

**Analog:** `tests/integration/approveAtomicity.test.js` (file-source assertions over the handler — pattern at lines 22-79)

**Pattern from approveAtomicity.test.js lines 22-49:**
```javascript
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 177 gap-closure 177-08 — BL-02 + BL-06 + WR-09 (approve atomicity)', () => {
  it('Test 1: handler source no longer contains BL-02 vulnerable 2-step pattern; rpc("approve_draft_atomic") is the sole mutation site', () => {
    const handlerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/approve.ts'),
      'utf8'
    );
    expect(handlerSrc).not.toMatch(/from\(["']svg_templates["']\)\.insert\(/);
    expect(handlerSrc).toMatch(/rpc\(["']approve_draft_atomic["']/);
  });
```

**Phase 178 assertions** (RESEARCH §"Wave 0 Gaps"):
- Source contains `import { approve } from "./approve.ts"` (no logic duplication — proves bulk loops the per-row analog)
- Source contains `BULK_HARD_CAP = 50` and a 400-response if length exceeded
- Source contains `await new Promise(r => setTimeout(r, 300))` between iterations
- Source does NOT contain `Promise.all(` (Pitfall 3 negative assertion)
- Per-ID error isolation: catch block converts to `{ ok: false, error }` instead of bubbling

**Optional behavioral test** (mocked supabase with `vi.fn` `approve` mock): assert serial call order across N=3 IDs and observe ≥600ms total elapsed (proves throttle).

---

### `tests/integration/rejectBulk.test.js` (NEW)

**Analog:** `tests/integration/rejectIdempotency.test.js`

**Pattern to clone** (rejectIdempotency.test.js lines 17-30):
```javascript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REJECT_PATH = path.resolve(
  __dirname,
  '../../supabase/functions/generate-svg-template/handlers/reject.ts'
);

describe('Phase 177-09 — reject idempotency + race guard (BL-03)', () => {
  const src = fs.readFileSync(REJECT_PATH, 'utf8');

  it('Test 2: race guard — UPDATE has .in("status", ["pending", "needs_human_review"])', () => {
    expect(src).toMatch(/\.in\(\s*["']status["']\s*,\s*\[\s*["']pending["']\s*,\s*["']needs_human_review["']\s*\]\s*\)/);
  });
});
```

**Phase 178 assertions:** Source contains `import { reject } from "./reject.ts"`, shared `reason` argument applied per-ID, 300ms throttle, no `Promise.all`.

---

### `tests/unit/generateOrientation.test.js` (NEW)

**Analog:** `tests/unit/generateValidatorOrder.test.js` (pure-mock vitest with vi.fn DI seam)

**Pattern to clone verbatim** (generateValidatorOrder.test.js lines 17-67) — the DI-seam shape is exactly what's needed for the orientation test:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { generate } from '../../supabase/functions/generate-svg-template/handlers/generate.ts';

describe('Phase 178 — orientation parameter (D-10)', () => {
  it('passes 1080×1920 viewBox to system prompt when orientation=portrait', async () => {
    let capturedSystem = '';
    const mockAnthropic = {
      messages: {
        create: async (args) => {
          capturedSystem = args.system;
          return {
            content: [{
              type: 'tool_use',
              input: { svg: '<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">...</svg>' },
            }],
          };
        },
      },
    };
    const mockSupa = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }) }) };
    const mockValidate = vi.fn(() => ({ ok: true, errors: [], warnings: [] }));

    await generate(
      { vertical: 'restaurants', template_type: 'menu', orientation: 'portrait', prompt: 'test' },
      mockSupa,
      { Anthropic: mockAnthropic, validateSvg: mockValidate },
    );

    expect(capturedSystem).toContain('viewBox="0 0 1080 1920"');
    expect(capturedSystem).toContain('PORTRAIT-SPECIFIC GUIDANCE');
    expect(capturedSystem).not.toContain('viewBox="0 0 1920 1080"');
  });

  it('preserves 1920×1080 viewBox when orientation=landscape (or omitted)', async () => { ... });
});
```

---

### `tests/e2e/admin-template-queue.spec.js` (MODIFIED — extend with bulk + filter)

**Analog:** Same file (Phase 177 baseline at lines 83-end; navigation pattern at lines 59-81)

**Navigation helper to reuse** (admin-template-queue.spec.js lines 59-81):
```javascript
async function gotoAdminTemplateQueue(page) {
  await page.getByRole('heading', { name: /^Super Admin Dashboard$/i }).first().waitFor(...);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('test:setCurrentPage', { detail: 'admin-template-queue' }));
  });
  await page.getByRole('heading', { name: /^Template Queue$/i }).first().waitFor(...);
}
```

**Skip-guard pattern** (lines 47-53):
```javascript
const SKIP = !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD;
test.describe('Admin Template Queue (Phase 178 — bulk + filter chips)', () => {
  test.skip(SKIP, 'TEST_SUPERADMIN_EMAIL/PASSWORD not configured');
  ...
});
```

**Phase 178 new test cases** (using data-testids from UI-SPEC §"data-testid Contract"):
- Filter chip changes narrow visible draft rows (client-side; instant)
- Header `checkbox-select-all` toggles all visible rows; transitions to `indeterminate` on partial deselect
- `bulk-action-toolbar` hidden when 0 selected; visible when ≥1
- Click `btn-bulk-approve` → `bulk-confirm-modal` opens with first-5 names + `…and N more`
- `btn-bulk-confirm` → modal advances to executing phase; `bulk-exec-feed` populates with ✓/✗ rows
- Done phase shows `btn-bulk-close`; click → modal closes + `loadDrafts()` refreshes

---

## Shared Patterns

### Authentication / Authorization

**Source:** `supabase/functions/generate-svg-template/index.ts` lines 63-75
**Apply to:** All NEW EF handlers (`approve_bulk`, `reject_bulk`)

```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader) return withCors(new Response("Unauthorized", { status: 401 }));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } } },
);

const { data: isAdmin } = await supabase.rpc("is_admin");
const { data: isSuper } = await supabase.rpc("is_super_admin");
if (!isAdmin && !isSuper) return withCors(new Response("Forbidden", { status: 403 }));
```

**Inheritance:** Phase 178 actions land inside the existing dispatcher's `try` block, AFTER the gate runs — no per-handler re-auth needed.

### Service-role client (cross-table mutations)

**Source:** `supabase/functions/generate-svg-template/index.ts` lines 161-167
**Apply to:** `approve_bulk` and `reject_bulk` action blocks (D-NEW-01 boundary)

```typescript
const supabaseSr = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const { data: { user } } = await supabase.auth.getUser();
return withCors(Response.json(
  await approveBulk({ draftIds: body.draftIds, reviewerUid: user!.id }, supabaseSr),
));
```

**Boundary:** Service-role client constructed AFTER admin gate; never used to bypass RLS for non-admin operations.

### Error Handling — Response-as-throw + per-ID isolation

**Source:** `supabase/functions/generate-svg-template/handlers/approve.ts` lines 158-167, 217-228
**Apply to:** Bulk handlers (catch and convert to per-ID `error` strings)

```typescript
// Inside approve.ts — throws Response for HTTP-mapped failures:
throw new Response(
  JSON.stringify({ error: "Draft failed re-validation at approve", issues: validatorResult.errors }),
  { status: 422, headers: { "Content-Type": "application/json" } },
);

// approve_bulk.ts catches both shapes:
try {
  const r = await approve({ draftId, reviewerUid }, supabase);
  results.push({ draftId, ok: true, ... });
} catch (e) {
  const msg = e instanceof Response
    ? `HTTP ${e.status} — ${await e.text().catch(() => "")}`
    : (e instanceof Error ? e.message : String(e));
  results.push({ draftId, ok: false, error: msg });
}
```

### CORS envelope inheritance

**Source:** `supabase/functions/generate-svg-template/index.ts` lines 41-55 (BL-NEW-04)
**Apply to:** All new EF actions — automatic via `withCors(Response.json(...))` wrapper

```typescript
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
function withCors(res: Response): Response { ... }
```

### 300ms serial throttle (Pitfall 3 / Pitfall A4)

**Source:** `scripts/eval-prompt-library.cjs` line 249 + `scripts/generate-template-thumbnails.cjs`
**Apply to:** `approve_bulk.ts`, `reject_bulk.ts`, `seed-vertical-templates.cjs`

```javascript
// Between iterations, never Promise.all over the row set:
if (i < total - 1) await new Promise(r => setTimeout(r, 300));
```

**Negative-test assertion (in Wave 0 RED tests):** the bulk handler source must NOT match `/Promise\.all\s*\(/`.

### dotenv loading (CLI scripts)

**Source:** `scripts/eval-prompt-library.cjs` lines 41-43, `scripts/generate-template-thumbnails.cjs` lines 22-24
**Apply to:** `seed-vertical-templates.cjs`, `verify-178-counts.cjs`

```javascript
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}
```

### Service-role Supabase client (CLI scripts)

**Source:** `scripts/generate-template-thumbnails.cjs`
**Apply to:** `seed-vertical-templates.cjs`, `verify-178-counts.cjs`

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
```

**Security note (RESEARCH §"Security Domain"):** Seed script must NEVER log the service-role key value; use `process.env` directly without echoing.

### Migration self-verification (DO-ASSERT)

**Source:** `supabase/migrations/176_template_drafts_and_vertical.sql` lines 194-255
**Apply to:** `178_backfill_existing_127_vertical.sql`

```sql
DO $$
DECLARE v_X INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_X FROM ... WHERE ...;
  ASSERT v_X = <expected>, format('SC-N: expected %s, got %s', <expected>, v_X);
END $$;
```

**Idempotency wrappers:**
- Migration 175 lines 31-32: `DROP CONSTRAINT IF EXISTS … ; ALTER TABLE … ADD CONSTRAINT …;`
- Migration 175 line 96: `ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING`
- Migration 176 line 38: `CREATE TABLE IF NOT EXISTS …`

### Test file-source-shape assertions (Wave 0 RED pattern)

**Source:** `tests/integration/approveAtomicity.test.js` (lines 22-79), `tests/integration/rejectIdempotency.test.js`
**Apply to:** `approveBulk.test.js`, `rejectBulk.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const HANDLER_PATH = path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/approve_bulk.ts');

describe('Phase 178 — approve_bulk (D-05)', () => {
  const src = fs.readFileSync(HANDLER_PATH, 'utf8');
  it('imports approve from ./approve.ts (no logic duplication)', () => {
    expect(src).toMatch(/import\s+\{\s*approve\s*\}\s+from\s+["']\.\/approve\.ts["']/);
  });
  it('does not use Promise.all (Pitfall 3)', () => {
    expect(src).not.toMatch(/Promise\.all\s*\(/);
  });
  it('enforces BULK_HARD_CAP = 50', () => {
    expect(src).toMatch(/BULK_HARD_CAP\s*=\s*50/);
  });
});
```

### DI-seam unit-test pattern (mocked Anthropic + supabase)

**Source:** `tests/unit/generateValidatorOrder.test.js` lines 22-67
**Apply to:** `generateOrientation.test.js`

```javascript
const mockAnthropic = { messages: { create: async (args) => { /* capture args.system */ ... } } };
const mockSupa = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'fake-uuid' }, error: null }) }) }) }) };
const mockValidate = vi.fn(() => ({ ok: true, errors: [], warnings: [] }));

await generate({ ... }, mockSupa, { Anthropic: mockAnthropic, validateSvg: mockValidate });
```

### Frontend service error-throw contract

**Source:** `src/services/aiTemplate/templateDraftsService.js` (header comment line 10 + every helper)
**Apply to:** `bulkApproveDrafts`, `bulkRejectDrafts`

```javascript
const { data, error } = await supabase.functions.invoke(...);
if (error) throw error;
return data;
```

Caller (page component) wraps in try/catch + `showToast({ variant: 'error', message: ... })`.

### Toast / showToast modern object form (BL-NEW-03 closure)

**Source:** `src/pages/Admin/AdminTemplateQueuePage.jsx` lines 71-76
**Apply to:** All Phase 178 toast invocations

```jsx
showToast?.({ variant: 'success', message: 'Draft approved' });
showToast?.({ variant: 'error', message: `Approve failed: ${err.message}` });
```

(Tolerant signature — the legacy `(message, type)` form also works, but new code uses the object form.)

---

## No Analog Found

Files with no close existing match (planner uses RESEARCH.md patterns + UI-SPEC for these):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/seedTopics.js` | data / config | static | First authored asset of this kind. Per-record shape is locked by D-15; ESM export consistent with promptLibrary.js |
| `.planning/phases/178-…/178-WAVE-{vertical}-RUN.md` (× 3) | artifact / log | static | First wave-artifact of this kind in project. Format locked by CONTEXT.md L110 + RESEARCH §"Wave artifact format" |
| `BulkActionConfirmModal.jsx` (multi-phase modal) | component | event-driven | TemplateDraftEditModal.jsx is the closest analog (Modal+Button+Alert+multi-step state) but no existing component implements the streaming-feed-with-auto-scroll pattern. UI-SPEC §"Surface 4" is the contract |

For these, the planner consumes RESEARCH.md and UI-SPEC.md as the design source — no codebase analog excerpt to copy.

---

## Metadata

**Analog search scope:**
- `supabase/functions/generate-svg-template/handlers/`
- `supabase/migrations/` (175, 176, 177)
- `src/services/aiTemplate/`
- `src/pages/Admin/`
- `src/components/Admin/`
- `src/design-system/components/`
- `scripts/`
- `tests/integration/`, `tests/unit/`, `tests/e2e/`

**Files scanned:** 19 (Read tool: 14 read in full or large excerpts; 5 confirmed by directory listing)
**Pattern extraction date:** 2026-05-09
**Phase scope source:** 178-CONTEXT.md (D-01..D-16), 178-RESEARCH.md (Q1..Q7 recommendations + Pattern Map at L958-982), 178-UI-SPEC.md (Surfaces 1-6 + data-testid contract)

**Key insight:** Phase 178 is overwhelmingly an **extension** phase — every NEW file has a strong existing analog inside the repo (most extending or looping a Phase 177 closure). The "no analog" set is just the topic-data file, the wave-run logs, and the multi-phase confirm modal — three small surfaces where the planner relies on RESEARCH/UI-SPEC, not codebase patterns.
