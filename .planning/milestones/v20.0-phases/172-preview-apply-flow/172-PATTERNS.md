# Phase 172: Preview + Apply Flow — Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 12 (3 new UI components, 1 new service, 1 new migration, 5 new test files, 2 modified source files plus 1 light service edit)
**Analogs found:** 12 / 12 (100%)

Every analog is inside this repo. No net-new primitives are required — the design system, `svgCustomizeService`, `clone_template_to_scene` RPC, and the Supabase-RPC caller idiom already ship every pattern. The work is composition.

Absolute paths used throughout so the planner can paste them straight into each task's `<read_first>` block.

---

## File Classification

| Phase-172 file | Verb | Role | Data flow | Closest in-repo analog | Match quality |
|----------------|------|------|-----------|------------------------|---------------|
| `src/components/template-gallery/TemplatePreviewModal.jsx` | CREATE | UI component (modal shell) | request-response (read `templates[]`+`initialIndex` as props; emit `onApply`/`onNavigate`) | `src/components/layout-editor/LayoutPreviewModal.jsx` (legacy full-screen modal) + `src/design-system/components/Modal.jsx` (new canonical primitive) | role-match (modal shell); exact (composition) |
| `src/components/template-gallery/QuickCustomizePanel.jsx` | CREATE | UI component (stateful form panel) | event-driven (input → debounced mutation → live preview) | `src/services/svgCustomizeService.js` (9-helper DOM mutation API) + `src/services/brandThemeService.js` (prefill source) | role-match (no prior Colors/Logo/Text panel) |
| `src/services/templateApplyService.js` | CREATE | client service (RPC dispatcher) | request-response (one RPC call per Apply) | `src/services/marketplaceService.js` lines 186–200 (`installTemplateAsScene`) — same caller shape, different RPC name | exact |
| `supabase/migrations/168_clone_template_with_customization.sql` | CREATE | SQL migration (PL/pgSQL RPC) | CRUD (SELECT template → INSERT scene → LOOP INSERT slides; single transaction) | `supabase/migrations/080_template_marketplace.sql` lines 175–287 (`clone_template_to_scene` RPC) | exact |
| `src/pages/TemplateGalleryPage.jsx` | MODIFY | page wiring | lift state for modal open/close | itself — replace Phase 171's `/* Phase 172 wires … */` placeholder at lines 557–559 | exact (self-analog) |
| `src/pages/SvgEditorPage.jsx` | MODIFY | page wiring | remove dead sessionStorage branch AND add `?sceneId=` load branch | itself lines 67–82 (existing `urlDesignId` branch = shape to mirror for the new sceneId branch); itself lines 83–119 (dead code to delete) | exact (self-analog) |
| `src/services/marketplaceService.js` | MODIFY | client service | delete dead `installWithCustomization` (lines 209–237); AUDIT `installTemplateAsScene` callers before deciding on its fate | itself lines 186–237 | exact |
| `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` | CREATE | unit test (RTL + vitest) | jsdom; mock supabase + `templateApplyService` | `tests/unit/services/marketplaceService.test.js` lines 1–66 (vitest mock-supabase header) + RTL-style test patterns from existing test files | role-match (no component tests in tree yet — Wave 0 gap) |
| `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` | CREATE | unit test (RTL + vitest) | jsdom; mock `brandThemeService`; real `svgCustomizeService` | `tests/unit/services/svgCustomize.test.js` lines 1–30 (TEST_SVG fixtures) + mock-supabase header from `marketplaceService.test.js` | role-match |
| `tests/unit/services/templateApplyService.test.js` | CREATE | unit test (vitest) | mock supabase.rpc, mock DOMPurify | `tests/unit/services/marketplaceService.test.js` lines 1–80 | exact |
| `tests/integration/preview-apply/rpc-atomicity.test.js` | CREATE | integration (vitest, stubbed supabase) | simulates slow-DB + failure injection | `tests/integration/featureFlags.test.js` (if present) or `tests/unit/services/marketplaceService.test.js` pattern — planner decides on stub level | role-match |
| `tests/e2e/preview-apply.spec.js` | CREATE | Playwright E2E | browser automation | `tests/e2e/template-gallery.spec.js` lines 1–80 (Phase 171 E2E; gotoTemplates helper, loginAndPrepare, structural assertions) | exact |

---

## Pattern Assignments

### File 1 — `src/components/template-gallery/TemplatePreviewModal.jsx` (NEW)

**Role:** full-screen modal shell wrapping a split-view preview + panel.
**Data flow:** props-in (`templates[]`, `initialIndex`, `open`, `onClose`, `onApply`, `onNavigate`); internal state for `currentIndex` + snapshotted `templates[]` (Pitfall 7); emits events up.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/design-system/components/Modal.jsx` lines 30–187 — canonical `Modal` primitive (supports `size="full"` at line 55, `closeOnOverlay={false}` at line 128, focus trap at 98–115, body-scroll lock at 86–96, `createPortal` at 185). **Use this, not `LayoutPreviewModal`.**
2. `/Users/massimodamico/bizscreen/src/components/layout-editor/LayoutPreviewModal.jsx` (137 lines, entire file) — mine ONLY for: Escape handler idiom (lines 28–39), toolbar shape (67–97), preview container dimensions (100–128). Do NOT copy the `fixed inset-0 z-50` shell — Modal supersedes it. Legacy file, overlay-click closes (opposite of D-01).
3. `/Users/massimodamico/bizscreen/src/design-system/index.js` lines 51–66, 78–80, 103–120 — barrel exports for `Modal`, `Button`, `Badge`, `Alert`, `Input`, `TemplateCardSkeleton`, and motion primitives `fadeIn`, `fadeInScale`, `modal`.
4. `/Users/massimodamico/bizscreen/src/design-system/components/Button.jsx` lines 18–54, 172–191 — `Button` props (`variant`, `size`, `loading`, `fullWidth`); note `loading` disables the button implicitly at line 176 (Pitfall 2 mitigation).
5. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-UI-SPEC.md` §Layout Anatomy + §Interaction Contract — authoritative for split proportions (65/35), arrow-button placement, keyboard guard, Apply states.
6. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` Focus Area 2 (line 610) + Focus Area 9 (line 788) — Badge `variant="neutral"` does NOT exist; use `variant="default"` instead (Badge.jsx:25–32 verified). `Skeleton` base is NOT exported — either add to barrel or use `TemplateCardSkeleton`.

**Imports pattern** (compose from 172-RESEARCH.md §Code Example 3):
```jsx
import { useEffect, useState, useMemo, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  Modal,
  Button,
  Badge,
  Alert,
  TemplateCardSkeleton,
} from '../../design-system';
import QuickCustomizePanel from './QuickCustomizePanel';
import { applyTemplate, editorRouteFor } from '../../services/templateApplyService';
```

**Modal shell pattern** (from `src/design-system/components/Modal.jsx`, combined with UI-SPEC §Layout Anatomy):
```jsx
<Modal
  open={open}
  onClose={onClose}
  size="full"
  closeOnOverlay={false}
  closeOnEscape
  showCloseButton={false}        // custom toolbar owns the Close button
>
  <div className="flex flex-col h-full">
    {/* TOOLBAR */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <Button variant="ghost" onClick={onClose} aria-label="Close template preview">
        <X className="w-5 h-5" />
      </Button>
      <h2 id="preview-title" className="text-base font-semibold text-gray-900">
        {current.name}
      </h2>
      <Badge variant="default" size="sm">{index + 1} of {total}</Badge>
    </div>

    {/* SPLIT VIEW (desktop) / STACK (mobile) */}
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[65fr_35fr] overflow-hidden">
      <div className="relative bg-gray-100 p-8 flex items-center justify-center">
        {/* arrow buttons absolute left-3/right-3 top-1/2 -translate-y-1/2 */}
        {/* SVG live-preview (dangerouslySetInnerHTML, pre-sanitized) OR thumbnail img */}
      </div>
      <div className="overflow-y-auto border-l border-gray-200 p-6">
        {current.editor_type === 'svg'
          ? <QuickCustomizePanel key={current.id} template={current} onChange={setCustomizedSvg} />
          : <PolotnoInfoBlock />
        }
        {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>…</Alert>}
        <Button variant="primary" size="lg" fullWidth loading={applying} onClick={handleApply}>
          {applying ? 'Applying…' : 'Apply to new scene'}
        </Button>
      </div>
    </div>
  </div>
</Modal>
```

**Keyboard navigation pattern** (172-RESEARCH.md §Pattern 2, verified by `src/components/layout-editor/LayoutPreviewModal.jsx:28-39` escape handler):
```jsx
useEffect(() => {
  if (!open) return;
  const handler = (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [open, onPrev, onNext]);
```

**Snapshot pattern (Pitfall 7)** — `useState(() => templates)` on open edge OR `useRef(templates)` set once; do NOT re-read from parent while open. Pair with `key={current.id}` on `QuickCustomizePanel` (Pitfall 3 mitigation).

**Apply handler pattern** (Pitfall 2 mitigation — set `loading` BEFORE awaiting):
```jsx
const handleApply = async () => {
  setApplying(true);               // disables Button via Button.jsx:176
  setError(null);
  try {
    const sceneId = await applyTemplate(current, { customizedSvg });
    onNavigate(editorRouteFor(current, sceneId));
    onClose();
  } catch (err) {
    setError("Couldn't apply template. Your customizations are saved — tap Apply to try again.");
    setApplying(false);
  }
};
```

---

### File 2 — `src/components/template-gallery/QuickCustomizePanel.jsx` (NEW)

**Role:** form panel with Colors / Logo / Text sections; mutates a parsed SVG doc and emits serialized SVG on each change.
**Data flow:** mounts → `parseSvgForCustomize(template.svg_content)` → extract controls → user edits trigger `swapColor`/`replaceLogo`/`updateText` → `serializeSvg` → `props.onChange(string)`.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/services/svgCustomizeService.js` (entire 284-line file) — 9 pure helpers; signatures and semantics documented in 172-RESEARCH.md Focus Area 3 (lines 622–640). Phase 172 introduces **no new helpers**.
2. `/Users/massimodamico/bizscreen/src/services/brandThemeService.js` lines 24–57 (`DEFAULT_THEME`) and lines 371–383 (`getBrandTheme` — returns `{ data, error }`; falls back to `DEFAULT_THEME` on any error). Note: `DEFAULT_THEME` has NO `logo_url` — only loaded user themes carry it (Focus Area 8).
3. `/Users/massimodamico/bizscreen/src/design-system/components/FormElements.jsx` — `Input` component API (full-width, `size="sm"`).
4. `/Users/massimodamico/bizscreen/src/design-system/components/Button.jsx` — `variant="secondary" size="sm"` for "Upload logo".
5. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-UI-SPEC.md` §QuickCustomizePanel Sections — pinned copy, per-control timings (50ms debounce for color, `onBlur` for text), empty-state copy.
6. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` Focus Area 8 (brand-theme shape) + Pitfall 1 (normalizeColor limitations) + Pitfall 6 (empty-panel copy).

**Imports pattern:**
```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, LayoutTemplate } from 'lucide-react';
import { Input, Button } from '../../design-system';
import {
  parseSvgForCustomize,
  extractColors,
  extractTextNodes,
  findLogoElement,
  swapColor,
  updateText,
  replaceLogo,
  serializeSvg,
} from '../../services/svgCustomizeService';
import { getBrandTheme } from '../../services/brandThemeService';
```

**Doc lifecycle pattern** (172-RESEARCH.md §Pattern 3):
```jsx
const docRef = useRef(null);                   // parsed Document, mutated in-place
const [controls, setControls] = useState({ colors: [], texts: [], logoEl: null });
const [brandTheme, setBrandTheme] = useState(null);

// Parse ONCE per template.id (the key={template.id} on the parent remounts this component).
useEffect(() => {
  const doc = parseSvgForCustomize(template.svg_content);
  docRef.current = doc;
  setControls({
    colors: extractColors(doc),
    texts: extractTextNodes(doc),
    logoEl: findLogoElement(doc),
  });
  onChange?.(serializeSvg(doc));               // emit initial serialized SVG
}, [template.id]);

useEffect(() => {
  getBrandTheme().then(({ data }) => setBrandTheme(data));
}, []);
```

**Debounced color swap pattern:**
```jsx
const debounceRef = useRef(null);
const scheduleColorSwap = (oldHex, newHex) => {
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    swapColor(docRef.current, oldHex, newHex);
    onChange(serializeSvg(docRef.current));
  }, 50);                                       // UI-SPEC: 50ms debounce
};
```

**Text `onBlur` pattern** (Pitfall 3 avoidance for mid-word focus loss):
```jsx
const handleTextBlur = (textNode, newText) => {
  updateText(textNode.element, newText);        // textContent-based, XSS-safe
  onChange(serializeSvg(docRef.current));
};
```

**Empty-state fallback** (Pitfall 6; UI-SPEC Copywriting Contract line "Empty panel (no customize attributes)"):
```jsx
if (!controls.colors.length && !controls.texts.length && !controls.logoEl) {
  return <p className="text-sm text-gray-500">This template has no customizable elements.</p>;
}
```

---

### File 3 — `src/services/templateApplyService.js` (NEW)

**Role:** client service; dispatches Apply to the correct RPC by `editor_type`; owns DOMPurify sanitization; builds editor route string.
**Data flow:** one Supabase RPC call → returns new scene UUID; route helper is pure.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` lines 1–10 (header + supabase import) and lines 186–200 (`installTemplateAsScene` — **exact caller shape** to mirror for new RPC) and lines 209–237 (`installWithCustomization` — dead code; demonstrates the NON-atomic anti-pattern this phase closes).
2. `/Users/massimodamico/bizscreen/src/services/templateGalleryService.js` (entire 70-line file) — single-function service convention (D-07 from Phase 170); `{ data, error }` contract; snake_case pass-through; JSDoc typedef at top.
3. `/Users/massimodamico/bizscreen/src/supabase.js` (or `supabase/index.js`) — canonical supabase client import path.
4. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Code Example 1 (line 454) + §Code Example 4 (line 509) — full working skeleton of both public exports.
5. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-CONTEXT.md` D-17 (DOMPurify mandatory) + D-11 (dispatcher) + D-12/D-16 (navigation target per editor_type) + D-9 (new RPC signature).

**Imports pattern** (mirror `marketplaceService.js:8` and extend with DOMPurify — first consumer of the lib in src/):
```javascript
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';
```

**RPC caller pattern** (copied verbatim from `marketplaceService.js:192-200`, new RPC name + third arg):
```javascript
const { data, error } = await supabase.rpc('clone_template_with_customization', {
  p_template_id: template.id,
  p_scene_name: sceneName,
  p_customized_svg: sanitized,
});
if (error) throw error;
return data;  // new scene UUID
```

**Full dispatcher skeleton** (172-RESEARCH.md §Code Example 4 — copy as-is):
```javascript
export async function applyTemplate(template, { customizedSvg } = {}) {
  const sceneName = `${template.name} scene`;   // discretion: matches installTemplateAsScene convention

  if (template.editor_type === 'svg') {
    const sanitized = customizedSvg
      ? DOMPurify.sanitize(customizedSvg, { USE_PROFILES: { svg: true, svgFilters: true } })
      : null;
    const { data, error } = await supabase.rpc('clone_template_with_customization', {
      p_template_id: template.id,
      p_scene_name: sceneName,
      p_customized_svg: sanitized,
    });
    if (error) throw error;
    return data;
  }

  if (template.editor_type === 'polotno') {
    const { data, error } = await supabase.rpc('clone_template_to_scene', {
      p_template_id: template.id,
      p_scene_name: sceneName,
    });
    if (error) throw error;
    return data;
  }

  throw new Error(`Unknown editor_type: ${template.editor_type}`);
}

export function editorRouteFor(template, sceneId) {
  if (template.editor_type === 'svg') return `svg-editor?sceneId=${sceneId}`;
  if (template.editor_type === 'polotno') return `scene-editor-${sceneId}`;
  throw new Error(`Unknown editor_type: ${template.editor_type}`);
}
```

**Critical note:** Per D-15, the route is `svg-editor?sceneId=${sceneId}` — **NOT `?designId=`** (the existing branch loads `svg_designs` rows; the new RPC writes only `scenes`+`scene_slides`). SvgEditorPage gains a new branch keyed on `sceneId`. 172-RESEARCH.md §OQ-2 flagged this; CONTEXT.md D-15 resolves it.

---

### File 4 — `supabase/migrations/168_clone_template_with_customization.sql` (NEW)

**Role:** PL/pgSQL RPC; atomic (single transaction) clone + customized-SVG write.
**Data flow:** SELECT template_library row → INSERT scenes row → LOOP INSERT scene_slides with `jsonb_set(design_json, '{svgContent}', to_jsonb(p_customized_svg))` → RETURN new scene UUID.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql` lines 175–287 — **the template to mirror verbatim.** Includes: signature (175–183), auth check (192–196), template lookup (199–205), plan-tier gate (207–223), super-admin override (226–230), denial branch (232–234), scene INSERT (236–250), slides LOOP (253–274), install-count increment (276–280; **DO NOT copy — Phase 175 owns `use_count`**), RETURN (282). GRANT at line 287.
2. `/Users/massimodamico/bizscreen/supabase/migrations/167_gallery_templates_view_and_rls.sql` lines 1–46 — header + idempotency style (`DROP POLICY IF EXISTS` pattern, `CREATE UNIQUE INDEX IF NOT EXISTS`). Establishes the `-- Phase XXX` comment convention and absence of a DOWN block.
3. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Pattern 4 (line 307) + §Focus Area 1 (line 581) — full RPC skeleton; notes that `p_customized_svg` should be applied via `jsonb_set` to preserve other `design_json` keys.
4. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-CONTEXT.md` D-09 (signature `(p_template_id UUID, p_scene_name TEXT, p_customized_svg TEXT) RETURNS UUID`), D-10 (server is a dumb persistor — NO SVG mutation in SQL), D-16 (Polotno rendering is out of scope).

**Signature to copy** (from migration 080:175-183, with third argument added per D-09):
```sql
CREATE OR REPLACE FUNCTION clone_template_with_customization(
  p_template_id uuid,
  p_scene_name text DEFAULT NULL,
  p_customized_svg text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
```

**Auth / license gate** — copy migration 080:184–234 **verbatim** (`DECLARE` block + auth check + template lookup + plan-tier switch + super_admin override + denial `RAISE EXCEPTION`).

**Scene insert + slides loop (DIVERGES from migration 080 at slide insert):**
```sql
-- Copy scene INSERT from 080:236-250 unchanged.
-- Modify slides loop (080:253-274) to patch design_json when p_customized_svg is provided.
FOR v_slide IN
  SELECT position, title, kind, design_json, duration_seconds
  FROM template_library_slides
  WHERE template_id = p_template_id
  ORDER BY position
LOOP
  INSERT INTO scene_slides (
    scene_id, position, title, kind, design_json, duration_seconds
  ) VALUES (
    v_new_scene_id,
    v_slide.position,
    v_slide.title,
    v_slide.kind,
    CASE
      WHEN p_customized_svg IS NOT NULL
        THEN jsonb_set(COALESCE(v_slide.design_json, '{}'::jsonb),
                       '{svgContent}',
                       to_jsonb(p_customized_svg))
      ELSE v_slide.design_json
    END,
    v_slide.duration_seconds
  );
END LOOP;
```

**DO NOT copy** migration 080:276–280 (install_count increment) — 172-CONTEXT.md notes `use_count` increment is **deferred to Phase 175**. Leave the comment block acknowledging the deferral so the diff is obvious at review.

**GRANT** — mirror migration 080:287 with the new three-arg signature:
```sql
GRANT EXECUTE ON FUNCTION clone_template_with_customization(uuid, text, text) TO authenticated;
```

**Migration numbering:** [VERIFIED 2026-04-20] `ls supabase/migrations/ | sort | tail` shows `167_gallery_templates_view_and_rls.sql` as the highest. `168_clone_template_with_customization.sql` is correct. Re-verify at plan-execution time in case an intervening migration lands.

**Template-source decision:** 172-RESEARCH.md §Pattern 4 flags that `p_template_id` may originate from `svg_templates` or `template_library`. Planner must choose one of: (a) add `p_editor_type` arg, (b) query `gallery_templates` VIEW to discriminate, (c) accept that `clone_template_with_customization` serves only `template_library` (SVG editor_type rows that live there) and Polotno keeps using existing `clone_template_to_scene` per D-11. **Recommended: (c) — mirrors the existing RPC's table assumption exactly; any svg_templates-sourced rows can continue through `clone_template_to_scene` if needed.** Verify in plan by checking which table `gallery_templates` rows with `editor_type='svg'` originate from.

---

### File 5 — `src/pages/TemplateGalleryPage.jsx` (MODIFY)

**Role:** gallery page wiring — hook `TemplateCard.onSelect` to the modal; lift `modalOpen`/`initialIndex` state.
**Data flow:** click closure captures index at event time; modal snapshots `displayedTemplates` on open (Pitfall 7).

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/pages/TemplateGalleryPage.jsx` lines 260–306 — the `displayedTemplates` useMemo (filtered+sorted); this array is the one the modal receives.
2. `/Users/massimodamico/bizscreen/src/pages/TemplateGalleryPage.jsx` lines 530–568 — the `.map((t) => ...)` block and the `TemplateCard onSelect={() => { /* Phase 172 wires … */ }}` placeholder at lines 557–559. The loop variable must change from `(t)` to `(t, i)` so the closure can capture the index.
3. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Focus Area 10 (line 812) — modal prop interface contract; snapshot semantics.

**Wiring pattern (minimal patch):**
```jsx
// Near existing useState blocks at top of the component
const [previewState, setPreviewState] = useState({ open: false, index: 0 });

// Inside .map — change (t) => to (t, i) =>, and the onSelect closure:
<TemplateCard
  title={t.name}
  description={t.description}
  imageUrl={t.thumbnail}
  orientation={t.orientation}
  onSelect={() => setPreviewState({ open: true, index: i })}
/>

// Render modal alongside existing grid (inside Content branch, before the closing PageLayout):
<TemplatePreviewModal
  open={previewState.open}
  templates={displayedTemplates}              // snapshotted internally
  initialIndex={previewState.index}
  onClose={() => setPreviewState((s) => ({ ...s, open: false }))}
  onNavigate={onNavigate}                     // pass-through to parent router
  showToast={showToast}                       // ambient prop from parent
/>
```

**Do not touch:** filter pipeline, `displayedTemplates` memo, any of the other branches (Loading / Error / Zero-content / No-results). Minimal diff per Phase 171 Pattern I.

---

### File 6 — `src/pages/SvgEditorPage.jsx` (MODIFY)

**Role:** SVG editor page. Two independent edits: (a) DELETE the sessionStorage branch (D-14 / TPRV-06); (b) ADD a new `?sceneId=` branch (D-15 / §OQ-2 resolution).

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/pages/SvgEditorPage.jsx` lines 22–32 — `parseQueryParams` currently extracts `templateId` and `designId`. **REMOVE `templateId`**, **ADD `sceneId`**.
2. `/Users/massimodamico/bizscreen/src/pages/SvgEditorPage.jsx` lines 53–56 — destructure of `queryParams`. Update accordingly.
3. `/Users/massimodamico/bizscreen/src/pages/SvgEditorPage.jsx` lines 67–82 — existing `urlDesignId` branch. **MIRROR this shape** for the new `urlSceneId` branch; replace the `loadUserSvgDesign` call with a scene+slide fetch.
4. `/Users/massimodamico/bizscreen/src/pages/SvgEditorPage.jsx` lines 83–119 — **DELETE ENTIRELY** (the `else if (urlTemplateId) { ... }` block plus the sessionStorage read/remove inside).
5. `/Users/massimodamico/bizscreen/src/pages/SvgEditorPage.jsx` lines 144–147 — `useEffect` dep array currently `[urlDesignId, urlTemplateId]`. Update to `[urlDesignId, urlSceneId]`.
6. `/Users/massimodamico/bizscreen/src/pages/SvgEditorPage.jsx` line 65 — `console.log` referencing `urlTemplateId`. Remove or rewrite.
7. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-CONTEXT.md` D-14 (sessionStorage delete) + D-15 (sceneId branch contract: fetch scene + first slide, read `slide.design_json.svgContent`, feed FabricSvgEditor).
8. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Focus Area 6 (line 673) — exact code to delete, pasted for reference.

**New `?sceneId=` branch shape (mirrors the existing designId branch at 67–82):**
```javascript
else if (urlSceneId) {
  // Fetch scene + first slide; read design_json.svgContent; init FabricSvgEditor with that SVG.
  const { data: scene, error: sceneErr } = await supabase
    .from('scenes').select('id, name, settings').eq('id', urlSceneId).single();
  if (sceneErr) throw sceneErr;

  const { data: slides, error: slidesErr } = await supabase
    .from('scene_slides').select('design_json').eq('scene_id', urlSceneId)
    .order('position', { ascending: true }).limit(1);
  if (slidesErr) throw slidesErr;

  const svgContent = slides?.[0]?.design_json?.svgContent;
  const svgUrl = svgContent
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
    : null;

  if (cancelled) return;
  setEditorConfig({
    svgUrl,
    templateId: null,
    templateName: scene.name,
    initialJson: null,
    designId: null,           // new RPC does NOT write svg_designs — keep null
    canvasWidth: scene.settings?.width  || 1920,
    canvasHeight: scene.settings?.height || 1080,
  });
}
```
**Note:** the `supabase` client import at the top of the file must be added if not already present (`import { supabase } from '../supabase';`).

**Data-URL conversion pattern:** copied verbatim from the doomed block at lines 99–103 — the `btoa(unescape(encodeURIComponent(...)))` idiom was the only reusable piece of the deleted branch.

---

### File 7 — `src/services/marketplaceService.js` (MODIFY)

**Role:** delete dead code; optionally audit-then-keep `installTemplateAsScene`.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` lines 186–237 — the two functions in question. `installTemplateAsScene` (186–200) may still be needed by `templateApplyService` indirectly (NO — the dispatcher calls `supabase.rpc` directly per 172-RESEARCH.md §Code Example 4). `installWithCustomization` (209–237) has **zero callers** (verified in §Focus Area 4).
2. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Focus Area 4 (line 642) + §OQ-3 (line 980) — deletion recommendation + audit checklist.

**Required action:** DELETE lines 209–237 (`installWithCustomization`), plus the comment banner at lines 202–207 if it only belongs to that function.

**Optional action (gated by audit):** run `grep -rn "installTemplateAsScene" src/ scripts/ supabase/functions/` at plan time (§OQ-3). If zero external callers, also delete lines 186–200. If it's used by an admin page, leave it.

**Imports:** no import changes needed (removing functions doesn't remove imports; `supabase` stays).

---

### File 8 — `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` (NEW)

**Role:** component test (vitest + jsdom + React Testing Library).
**Data flow:** render with mocked `templateApplyService` and mocked `brandThemeService`; assert DOM behaviors (modal open, keyboard nav, Apply loading state, error Alert visibility).

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/tests/unit/services/marketplaceService.test.js` lines 1–66 — **canonical vitest + supabase-mock header**; copy the `vi.mock('../../../src/supabase', () => ({ ... }))` block shape (adjust depth of `../` for the new test location).
2. `/Users/massimodamico/bizscreen/vitest.config.js` + `/Users/massimodamico/bizscreen/tests/setup.js` — confirm jsdom env, RTL matchers availability.
3. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Validation Architecture (line 866) + §Requirements→Test Map (line 879) — required coverage: TPRV-01 open/close/nav, Pitfalls 2/3/7.

**Header pattern** (adapted from `tests/unit/services/marketplaceService.test.js:7-51`, depth adjusted to `../../../../src/...`):
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../../src/services/templateApplyService', () => ({
  applyTemplate: vi.fn().mockResolvedValue('scene-uuid-123'),
  editorRouteFor: vi.fn().mockReturnValue('svg-editor?sceneId=scene-uuid-123'),
}));
vi.mock('../../../../src/services/brandThemeService', () => ({
  getBrandTheme: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

import TemplatePreviewModal from '../../../../src/components/template-gallery/TemplatePreviewModal';
```

**Required test cases (per 172-RESEARCH.md §Wave 0 Gaps):**
- Opens with `initialIndex` and shows that template's name (TPRV-01)
- ArrowRight advances index; ArrowLeft decrements; wraps at boundaries (TPRV-01)
- ArrowRight is a **no-op** when an `<input>` is focused (keyboard guard)
- Clicking "Apply to new scene" calls `applyTemplate`; during the in-flight state the button is disabled and says "Applying…" (Pitfall 2)
- On `applyTemplate` rejection, inline Alert appears with the UI-SPEC copy and Apply button re-enables (D-13)
- Prev/next between templates remounts QuickCustomizePanel via `key={template.id}` — asserted via test id on the panel root (Pitfall 3)
- Snapshot semantics: parent changes `templates` array while modal is open → the visible template does NOT shift under the user (Pitfall 7)

---

### File 9 — `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` (NEW)

**Role:** component test (vitest + jsdom + RTL).
**Data flow:** render with a small hand-crafted SVG fixture; assert that editing controls mutates the serialized SVG and invokes `onChange`.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/tests/unit/services/svgCustomize.test.js` lines 1–30 — **TEST_SVG fixture** to reuse (or adapt). Imports list at lines 1–12 shows which helpers the panel will invoke.
2. `/Users/massimodamico/bizscreen/tests/unit/services/marketplaceService.test.js` lines 7–51 — mock-supabase header (needed because `brandThemeService.getBrandTheme` ultimately calls `supabase.rpc`).
3. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-UI-SPEC.md` §QuickCustomizePanel Sections — source-of-truth for pinned copy, timings, and a11y labels.

**Required test cases:**
- Renders Colors / Logo / Text headers exactly per Copywriting Contract
- On mount, calls `getBrandTheme()` once; when it returns a theme, primary/secondary/accent swatches reflect those colors (prefill, discretion-level decision from UI-SPEC)
- Changing a color swatch (50ms debounced) → `onChange` fires with a serialized SVG whose matching `fill` has been swapped (verify by regex on the emitted string)
- Text input `onBlur` → `onChange` fires; mid-typing `onChange` does NOT fire (timing guard)
- When `extractColors` + `extractTextNodes` + `findLogoElement` all return empty → renders "This template has no customizable elements." (Pitfall 6)
- "Remove logo" link fires `replaceLogo(doc, null)` and `onChange` emits updated SVG

---

### File 10 — `tests/unit/services/templateApplyService.test.js` (NEW)

**Role:** unit test for the dispatcher (vitest, no DOM).
**Data flow:** mock `supabase.rpc` and `DOMPurify.sanitize`; assert routing + sanitization.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/tests/unit/services/marketplaceService.test.js` lines 1–80 — **exact shape** for vitest + supabase mocking; adapt for `supabase.rpc` focus (drop the `from()` chains).
2. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Requirements→Test Map line 885 (TPRV-04 dispatcher test) + Security line 890 (DOMPurify strips `<script>`).

**Mock-supabase header (minimal — rpc only):**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: 'new-scene-uuid', error: null }),
  },
}));
vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((s) => s.replace(/<script[^>]*>.*?<\/script>/gi, '')) },
}));

import { applyTemplate, editorRouteFor } from '../../../src/services/templateApplyService';
import { supabase } from '../../../src/supabase';
import DOMPurify from 'dompurify';
```

**Required test cases:**
- `editor_type='svg'` + `customizedSvg` provided → sanitizes, calls `rpc('clone_template_with_customization', { p_template_id, p_scene_name, p_customized_svg })`, returns scene uuid
- `editor_type='svg'` + no `customizedSvg` → calls RPC with `p_customized_svg: null`
- `editor_type='polotno'` → calls `rpc('clone_template_to_scene', { p_template_id, p_scene_name })` (NO third arg)
- Unknown `editor_type` → throws with the literal error message
- Sanitization removes `<script>` tags from the SVG before the RPC sees it (Pitfall 5 / Security)
- RPC error propagates as a thrown error (asserts `.rejects.toThrow`)
- `editorRouteFor` returns `svg-editor?sceneId={id}` and `scene-editor-{id}` for the two editor_types (per D-15/D-12)

---

### File 11 — `tests/integration/preview-apply/rpc-atomicity.test.js` (NEW)

**Role:** integration test (vitest).
**Data flow:** mock supabase with injectable delay / failure to simulate the clone-then-patch race TPRV-05 closes.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/tests/unit/services/marketplaceService.test.js` lines 1–66 — mock shape.
2. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Validation Architecture line 886 — TPRV-05 atomicity + license-gate coverage contract.

**Required test cases:**
- Stub `supabase.rpc('clone_template_with_customization', …)` to resolve after 500ms; assert that the Apply button stays disabled for the full duration (Pitfall 2)
- Stub RPC to reject with `{ message: 'Access denied: insufficient plan tier' }`; assert `applyTemplate` throws the same message
- Stub RPC to resolve with a scene uuid; assert that **no follow-up UPDATE** is issued (the whole point of the atomic RPC — if the test sees a second supabase call, the regression is back)
- Document that live RPC verification (real Supabase) is a **manual checklist item** — this test covers only the client-side contract

---

### File 12 — `tests/e2e/preview-apply.spec.js` (NEW)

**Role:** Playwright end-to-end test. Full flow: gallery click → modal → customize → Apply → editor loads customized SVG.

**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/tests/e2e/template-gallery.spec.js` lines 1–80 (entire file is fine; Phase 171 baseline). **Copy the module header, login pattern, `gotoTemplates` helper verbatim.**
2. `/Users/massimodamico/bizscreen/tests/e2e/helpers.js` — `loginAndPrepare`, `waitForPageReady` — signatures in use by the Phase 171 spec.
3. `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Validation Architecture lines 888–889 (TPRV-06 sessionStorage + E2E success path) + §Manual Verification Checklist (line 908).

**Skip guard pattern** (copy from `tests/e2e/template-gallery.spec.js:42`):
```javascript
test.describe('Preview + Apply (Phase 172)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
  });
  // tests here
});
```

**Required test cases:**
- Open gallery → click a card → modal visible with toolbar text "Apply to new scene" and nav counter
- ArrowRight advances template (verify toolbar name changes)
- Click a color swatch (native picker) — **manual-only** per UI-SPEC; E2E skips this
- Click "Apply to new scene" → page lands on `svg-editor?sceneId=…` (URL assertion)
- After Apply, `sessionStorage.length` for `pendingTemplate` is 0 (evaluate in page context) — TPRV-06
- No error toasts appear (`expect(page.locator('[role="alert"]')).toHaveCount(0)`) — structural assertion pattern from Phase 171

---

## Shared Patterns

### Supabase RPC caller idiom
**Source:** `/Users/massimodamico/bizscreen/src/services/marketplaceService.js:192-200` (`installTemplateAsScene`).
**Apply to:** `templateApplyService.applyTemplate` (File 3).
```javascript
const { data, error } = await supabase.rpc('<rpc_name>', { p_…: … });
if (error) throw error;
return data;
```
All three existing service patterns (`marketplaceService.installTemplateAsScene`, `templateGalleryService.fetchGalleryTemplates`, `brandThemeService.getBrandTheme`) use this exact shape. **Do not wrap in try/catch inside the service** — let the error propagate; the caller (modal) decides whether to show an Alert.

### PL/pgSQL atomic-write RPC
**Source:** `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql:175-287` (`clone_template_to_scene`).
**Apply to:** migration 168 (File 4).
- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` header
- `DECLARE` block with `v_user_id`, `v_template <table>%ROWTYPE`, `v_new_scene_id`, `v_slide record`
- `auth.uid() IS NULL → RAISE EXCEPTION 'Not authenticated'`
- License-tier gate pattern (free / pro / enterprise) + super_admin override
- `INSERT … RETURNING id INTO v_new_scene_id;`
- `FOR v_slide IN SELECT … LOOP … END LOOP;`
- `GRANT EXECUTE ON FUNCTION <name>(<sig>) TO authenticated;` at bottom

### XSS defense-in-depth (Phase 172 introduces DOMPurify in src/)
**Source:** `/Users/massimodamico/bizscreen/.planning/phases/172-preview-apply-flow/172-RESEARCH.md` §Code Example 2 (line 471) + §Pitfall 5 (line 430) + §Security Domain (line 922).
**Apply to:** `templateApplyService.applyTemplate` (File 3) before every RPC call; optionally also in `TemplatePreviewModal` before the inline `dangerouslySetInnerHTML` preview.
```javascript
DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } });
```
Server-side RPC is a **dumb persistor** (D-10) — it never re-sanitizes. All responsibility is client-side.

### Vitest mock-supabase header
**Source:** `/Users/massimodamico/bizscreen/tests/unit/services/marketplaceService.test.js:7-51`.
**Apply to:** Files 8, 9, 10, 11. Adjust the `'../../../src/supabase'` depth to the test file's location.

### Keyboard-shortcut guard by focused element
**Source:** `/Users/massimodamico/bizscreen/src/components/layout-editor/LayoutPreviewModal.jsx:28-39` (Escape) combined with 172-RESEARCH.md §Pattern 2 (activeElement guard).
**Apply to:** `TemplatePreviewModal` Left/Right arrow handler. Escape is delegated to design-system `Modal` (`closeOnEscape=true`).

### Service-per-responsibility convention
**Source:** observed across `marketplaceService.js`, `templateGalleryService.js`, `brandThemeService.js`, `svgCustomizeService.js`.
**Apply to:** `templateApplyService.js` (File 3).
- Named exports only (no default export)
- Leading JSDoc block with phase reference and decision anchors
- Thin supabase wrapper: one function = one RPC or one table op
- `{ data, error }` pattern for reads; `throw` for writes (follows marketplaceService write path)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | — |

Every Phase 172 file has a close in-repo analog. The only "no prior art" areas are:
- **Component-level unit tests** (`tests/unit/components/**`) — directory is empty today but the pattern is the same as `tests/unit/services/marketplaceService.test.js` with RTL `render` / `screen` primitives added on top.
- **Integration test directory** (`tests/integration/preview-apply/`) — also new; Phase 171's integration tests live at `tests/integration/api/*` but those cover server contracts, not UI-to-service flows. For Phase 172 the "integration" is still client-only (stubbed supabase), so the vitest mock pattern carries over unchanged.

Both gaps are directory-level, not pattern-level — Phase 172 establishes the directory convention without inventing a new test style.

---

## Metadata

**Analog search scope:**
- `/Users/massimodamico/bizscreen/src/pages/`
- `/Users/massimodamico/bizscreen/src/components/layout-editor/`, `svg-editor/`, `template-gallery/` (not yet existing)
- `/Users/massimodamico/bizscreen/src/services/`
- `/Users/massimodamico/bizscreen/src/design-system/components/` + `index.js`
- `/Users/massimodamico/bizscreen/supabase/migrations/` (080, 167 directly; 094/110 spot-checked)
- `/Users/massimodamico/bizscreen/tests/unit/services/`, `tests/unit/components/` (empty), `tests/integration/`, `tests/e2e/`
- `/Users/massimodamico/bizscreen/.planning/phases/171-core-gallery-ui-redesign/171-PATTERNS.md` (for cross-phase style fidelity)

**Files scanned:** 18 (full reads) + 3 partial greps + 2 directory listings.

**Pattern extraction date:** 2026-04-20

**Read-only compliance:** No source files were modified. Only `172-PATTERNS.md` was written.
