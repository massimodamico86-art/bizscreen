# Phase 172: Preview + Apply Flow - Research

**Researched:** 2026-04-20
**Domain:** Full-screen template preview modal + in-browser SVG customize + atomic apply RPC + sessionStorage removal
**Confidence:** HIGH (every claim verified against actual source files or migrations on disk; one ambiguity in CONTEXT.md D-12 surfaced and documented)

---

## Summary

Phase 172 composes existing primitives — it does not introduce new libraries. All nine `svgCustomizeService` helpers exist and are unit-tested. The design-system `Modal` supports the `size="full"` and `closeOnOverlay={false}` props the UI-SPEC requires. The existing `clone_template_to_scene` RPC (migration 080, lines 175–287) is the canonical pattern to mirror for the new `clone_template_with_customization` RPC. `marketplaceService.installWithCustomization` has **zero live callers** in the codebase — it was left in place by quick task 260414-qc4 as a future hook. That means Phase 172 can delete it outright (recommended) rather than retain a wrapper. Only one `sessionStorage.getItem('pendingTemplate')` reader exists (SvgEditorPage.jsx:86), and **zero writers** — the writers were removed when the marketplace UI was retired in April 2026. TemplateGalleryPage's `displayedTemplates` useMemo already produces the filtered array the modal needs; the modal simply receives `templates[]` and `initialIndex`.

The two items the planner must treat with care:

1. **CONTEXT.md D-12 claims Polotno templates open at `/scene-editor/:sceneId`.** In reality, the app uses a flat `pageMap`-based route system (`scene-editor-{sceneId}`). More importantly, `SceneEditorPage` does **not mount PolotnoEditor** — PolotnoEditor is only mounted inside `DesignEditorPage` (`design-editor` route). The navigation target for Polotno templates needs a planning-time decision: either (a) wire Polotno rendering into SceneEditorPage, (b) navigate to `design-editor`, or (c) accept that Polotno templates currently have no downstream editor and scope Phase 172 to route Polotno apply to SceneEditorPage (producing scene rows that SceneEditorPage renders via its own block engine, ignoring Polotno JSON). Option (c) is consistent with the existing `clone_template_to_scene` RPC output shape and requires no new work beyond routing.
2. **Security: the new RPC accepts user-supplied SVG (`p_customized_svg TEXT`) and writes it directly to `scene_slides.design_json.svgContent`.** The codebase has `dompurify@3.3.3` installed as a dep but **NOT imported anywhere** (grep returns zero hits in src/). Client-side `svgCustomizeService.updateText` uses `textContent` (not `innerHTML`) — that protects against XSS *through the customize path*. But the user could bypass that by editing the SVG string in devtools before Apply. Client-side sanitization with DOMPurify before calling the RPC is mandatory for this phase.

**Primary recommendation:** Create `TemplatePreviewModal.jsx` and `QuickCustomizePanel.jsx` under `src/components/template-gallery/`. Create `src/services/templateApplyService.js` to own the `editor_type`-dispatched apply logic (decoupled from gallery-read service). Add migration `168_clone_template_with_customization.sql` mirroring the existing `clone_template_to_scene` RPC signature. Delete `installWithCustomization` and its sessionStorage branch entirely (no wrapper).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Modal shell, split-view layout, prev/next nav | Browser / Client | — | Pure UX; no server role. |
| SVG parsing, color/logo/text mutation, serialization | Browser / Client | — | `svgCustomizeService` already pure DOM; no server SVG engine. |
| Live preview update on customize change | Browser / Client | — | Serialized SVG rendered inline via `dangerouslySetInnerHTML` or `<img src=data:...>`. |
| Brand theme prefill (read active theme) | Browser / Client | API (Supabase RPC `get_active_brand_theme`) | One read on modal mount; cached per-session. |
| SVG sanitization before Apply | Browser / Client | — | DOMPurify in the client; server RPC is a persistor. |
| Atomic clone + customized-SVG write | API / Database | — | New `clone_template_with_customization` RPC (SECURITY DEFINER, single transaction). |
| License/access check | API / Database | — | Inherited from `clone_template_to_scene` pattern; no new policy. |
| Routing to editor after Apply | Browser / Client | — | `setCurrentPage('svg-editor?designId=...')` OR `setCurrentPage('scene-editor-{sceneId}')` via `onNavigate` prop. |
| SessionStorage removal | Browser / Client | — | Delete one code branch; no server role. |

---

## User Constraints (from 172-CONTEXT.md)

### Locked Decisions (D-01 … D-14)

- **D-01:** Full-screen modal, split view (~65% preview / ~35% panel) on desktop/tablet; both visible at all times for live updates.
- **D-02:** Stacks vertically below ~768px; preview top, panel scrolls under, Apply CTA sticky-bottom. No drawer/tabs.
- **D-03:** Prev/next via on-screen arrow buttons AND Left/Right keyboard shortcuts (only active when modal open and no input focused).
- **D-04:** Prev/next silently discards pending customize edits and resets to new template defaults. No confirmation.
- **D-05:** Polotno templates open the SAME modal; right panel replaced with informational block ("customize in editor after apply") + Apply button.
- **D-06:** Polotno preview image = static `thumbnail` column only. No Polotno runtime in modal.
- **D-07:** Prev/next is unified — cycles through the filtered result set regardless of `editor_type`.
- **D-08:** Apply CTA label identical across editor types: "Apply to new scene".
- **D-09:** New RPC `clone_template_with_customization(p_template_id UUID, p_scene_name TEXT, p_customized_svg TEXT) RETURNS UUID`. Single transaction. Existing `clone_template_to_scene` untouched.
- **D-10:** Payload is the final serialized SVG string. Client runs customize pipeline (parse → swap colors → replace logo → update text → serialize) and sends finished SVG. Server is a dumb persistor.
- **D-11:** Client dispatcher branches on `editor_type`: `'svg'` → new RPC, `'polotno'` → existing RPC.
- **D-12:** Gallery→editor handoff uses URL params, sceneId only. Navigate to `/svg-editor/:sceneId` (SVG) or `/scene-editor/:sceneId` (Polotno — planner to verify route). ⚠️ See Open Questions §OQ-1.
- **D-13:** Apply failure UX = inline Alert, keep modal open, preserve customize state, Apply button re-enables.
- **D-14:** `SvgEditorPage.jsx:86` sessionStorage branch deleted this phase. Audit for any other `pendingTemplate` writers (none found in codebase — see §Runtime State Inventory).

### Claude's Discretion

- Exact split-view pixel proportions and breakpoints (resolved in UI-SPEC: `grid-cols-[65fr_35fr]` ≥ 768px; vertical stack < 768px)
- Keyboard shortcut implementation details (resolved in UI-SPEC: check `document.activeElement.tagName` before binding arrows)
- QuickCustomizePanel internal layout (resolved in UI-SPEC: Colors → Logo → Text, always visible)
- Customize defaults (resolved in UI-SPEC: brand-theme prefill with per-control Clear)
- Scene naming behavior (resolved in UI-SPEC: auto-derived `"${template.name} scene"`)
- `use_count` increment timing (deferred to Phase 175 — do NOT touch in this phase)
- Modal file path: **recommend** `src/components/template-gallery/TemplatePreviewModal.jsx` and `src/components/template-gallery/QuickCustomizePanel.jsx`
- Apply dispatcher placement: **recommend** new `src/services/templateApplyService.js` (see §Focus Area 7 below)
- New RPC migration number: **next is `168_`** (latest on disk is `167_gallery_templates_view_and_rls.sql`) [VERIFIED: `ls supabase/migrations/` 2026-04-20]
- Polotno route: see Open Questions §OQ-1.

### Deferred Ideas (OUT OF SCOPE — do not research or plan)

- Polotno in-preview QuickCustomize (TPRV-F1, v20.1)
- `use_count` increment on Apply (Phase 175)
- Scene-editor → gallery entry point (Phase 174)
- Starter packs / favorites in preview modal (Phase 173)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TPRV-01 | Full-screen preview modal with prev/next nav across filtered result set | Modal `size="full"` verified in design-system/components/Modal.jsx:55; `displayedTemplates` array already produced by TemplateGalleryPage.jsx:260-306 — passes directly as modal prop. |
| TPRV-02 | QuickCustomize brand colors / logo / text overrides in modal | `svgCustomizeService` has all 9 required helpers (swapColor, replaceLogo, updateText, etc.) and is unit-tested (tests/unit/services/svgCustomize.test.js). |
| TPRV-03 | Live SVG preview updates as customize values change | Pure DOM mutation pipeline already in service; serialize on each change and re-render via `<img src="data:image/svg+xml;base64,...">` or `dangerouslySetInnerHTML`. |
| TPRV-04 | One-click Apply; SVG → FabricSvgEditor, Polotno → Polotno editor | `editor_type` discriminator exists on gallery_templates VIEW (migration 167:222/251). Dispatcher in templateApplyService branches on this. ⚠️ See Open Questions §OQ-1 for Polotno target route. |
| TPRV-05 | Race-safe atomic clone+patch (closes clone-then-patch race) | New `clone_template_with_customization` RPC in migration 168; mirrors `clone_template_to_scene` pattern from migration 080:175-287. |
| TPRV-06 | Eliminate sessionStorage in gallery→editor handoff | Only one reader on disk: SvgEditorPage.jsx:86, 94. Zero writers. Delete the entire `else if (urlTemplateId)` branch (lines 84-119). |

---

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` exists at repo root. Project conventions inherited from neighbors in the codebase (see Standard Stack). No specific override constraints.

---

## Standard Stack

### Core (all already installed — version-verified from package.json 2026-04-20)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | UI | App-wide; no alternatives considered. |
| framer-motion | 12.23.24 | Animation | Design-system motion primitives (`modal`, `fadeIn`, `fadeInScale`, `scaleTap`) all live here. |
| lucide-react | 0.548.0 | Icons | Design-system exclusive. Icons named in UI-SPEC (X, ChevronLeft, ChevronRight, Loader2, LayoutTemplate, AlertCircle) are all exported. |
| Tailwind CSS | 3 (Vite-configured) | Styling | Utility-first; matches every other page. |
| `@supabase/supabase-js` | 2.80.0 | RPC call | `supabase.rpc('clone_template_with_customization', {...})` is identical to existing RPC-caller pattern. |
| fuse.js | 7.3.0 | (not needed this phase) | Gallery uses it; modal doesn't. |
| **dompurify** | **3.3.3** | **SVG sanitization before Apply (see Security Domain)** | Installed as dep but not yet imported anywhere — Phase 172 introduces the first import. `[VERIFIED: grep of src/ 2026-04-20 returns zero hits]` |

### Supporting (existing, in-codebase)

| Asset | Path | Purpose |
|-------|------|---------|
| Design System primitives | `src/design-system/index.js` | `Modal`, `Button`, `Badge`, `Alert`, `Input`, `TemplateCardSkeleton`, motion primitives — all exported and version-frozen. |
| `svgCustomizeService` | `src/services/svgCustomizeService.js` | 9 pure helpers — see Focus Area 3. |
| `brandThemeService.getBrandTheme()` | `src/services/brandThemeService.js:371` | Returns `{ data: {primary_color, secondary_color, accent_color, logo_url, ...}, error }`. |
| `templateGalleryService.fetchGalleryTemplates()` | `src/services/templateGalleryService.js:39` | Phase 170 output; already the sole data path. |
| `LayoutPreviewModal.jsx` | `src/components/layout-editor/LayoutPreviewModal.jsx` | Only full-screen modal pattern in the codebase today — reference for backdrop, Escape handling, composition. |

### Alternatives Considered

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Design-system `Modal` (size="full") | Hand-rolled `fixed inset-0 z-50` like LayoutPreviewModal | Design-system Modal already provides focus trap, body scroll lock, ARIA wiring, portal render, escape handling. Reinventing is wasteful. |
| DOMPurify for SVG sanitization | `isomorphic-dompurify` | DOMPurify @ 3.3.3 already installed; works in browser (which is where we sanitize). No server-side need. |
| Native `<input type="color">` for swatches | `react-color`, `react-colorful` | UI-SPEC says no third-party color picker. Native input has full browser support and zero bundle impact. |
| `dangerouslySetInnerHTML` for live SVG preview | `<img src="data:image/svg+xml;base64,...">` | Data URL approach has 2-3x serialization cost on every keystroke. For live preview use `dangerouslySetInnerHTML` (sanitize-on-parse via DOMPurify once on template load). |
| URL param via `window.location` | `useSearchParams` from react-router-dom | App's `onNavigate` pattern uses flat string keys (`scene-editor-{sceneId}`) — not React Router URLs. Keep the convention. |

**Installation:**

Nothing new to install. DOMPurify is already present in `package.json`. Document: "This phase is the first consumer of dompurify in src/."

**Version verification (npm view run 2026-04-20):**

`dompurify` [VERIFIED: 3.3.3 in package.json; `npm view dompurify version` returns 3.3.3 matching — no drift]. No other package introduces new versions.

---

## Architecture Patterns

### System Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  GALLERY PAGE (TemplateGalleryPage.jsx)                                   │
│  displayedTemplates = useMemo(...) // already filtered+sorted             │
│  │                                                                         │
│  └── <TemplateCard onSelect={()=>openModal(template, i)} />  [click]      │
│         │                                                                  │
├─────────▼──────────────────────────────────────────────────────────────── │
│  TemplatePreviewModal  (new, src/components/template-gallery/)            │
│  Props: templates[], initialIndex, onClose, onApply, onNavigate           │
│  │                                                                         │
│  ├── TOOLBAR  [Close] Name [New/Popular badges] [i/n counter]             │
│  │                                                                         │
│  ├── PREVIEW PANE (65%)                                                   │
│  │    ┌─────────┐                                                          │
│  │    │  arrow← │  SVG inline (dangerouslySetInnerHTML, DOMPurify-sanit.) │
│  │    │  arrow→ │  OR Polotno thumbnail img                               │
│  │    └─────────┘                                                          │
│  │    keyboard: ArrowLeft/ArrowRight (guarded by activeElement.tagName)   │
│  │                                                                         │
│  └── RIGHT PANEL (35%)                                                    │
│        ├── [editor_type==='svg']                                           │
│        │     QuickCustomizePanel (new)                                     │
│        │     └─ runs svgCustomizeService.* on every change                 │
│        │     └─ emits customizedSvg (debounced 50ms for colors,            │
│        │         onBlur for text)                                          │
│        └── [editor_type==='polotno']                                       │
│              Polotno info block (<LayoutTemplate/> + copy)                 │
│                                                                             │
│  APPLY BUTTON  ───────────────────┐                                       │
│                                   ▼                                        │
├──────────────────────────────────────────────────────────────────────────── │
│  templateApplyService.applyTemplate(template, customizedSvg) (new)         │
│    ├── sanitizedSvg = DOMPurify.sanitize(customizedSvg, {                 │
│    │       USE_PROFILES: { svg: true, svgFilters: true } })                │
│    ├── switch (template.editor_type):                                      │
│    │    case 'svg':                                                         │
│    │      rpc('clone_template_with_customization',                         │
│    │          { p_template_id, p_scene_name, p_customized_svg })           │
│    │      → returns sceneId                                                │
│    │    case 'polotno':                                                    │
│    │      rpc('clone_template_to_scene',                                   │
│    │          { p_template_id, p_scene_name })                             │
│    │      → returns sceneId                                                │
│    │                                                                         │
│    └── navigates via onNavigate prop:                                      │
│         editor_type==='svg'     → `svg-editor?designId=${sceneId}`         │
│         editor_type==='polotno' → `scene-editor-${sceneId}`                 │
│                                                                             │
├──────────────────────────────────────────────────────────────────────────── │
│  MIGRATION 168 (new):                                                      │
│  clone_template_with_customization(p_template_id UUID,                     │
│                                    p_scene_name TEXT,                      │
│                                    p_customized_svg TEXT) RETURNS UUID     │
│    SECURITY DEFINER, search_path=public                                    │
│    Single BEGIN..END transaction:                                          │
│      1. auth check                                                         │
│      2. license check (mirror clone_template_to_scene lines 207-234)       │
│      3. INSERT scene row                                                   │
│      4. FOR each template_library_slides row: INSERT scene_slide           │
│         WITH design_json = jsonb_set(tl.design_json, '{svgContent}',       │
│                                      to_jsonb(p_customized_svg))           │
│      5. (use_count increment — OMITTED per Phase 175 deferral)             │
│      6. RETURN scene_id                                                    │
│    GRANT EXECUTE ... TO authenticated                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── components/
│   └── template-gallery/
│       ├── TemplatePreviewModal.jsx    # NEW — full-screen modal shell
│       ├── TemplatePreviewModal.test.jsx
│       ├── QuickCustomizePanel.jsx     # NEW — SVG-only customize panel
│       └── QuickCustomizePanel.test.jsx
├── services/
│   ├── templateApplyService.js         # NEW — editor_type dispatcher
│   ├── templateApplyService.test.js
│   ├── templateGalleryService.js       # existing (Phase 170) — unchanged
│   ├── svgCustomizeService.js          # existing — unchanged
│   ├── brandThemeService.js            # existing — imported for prefill
│   └── marketplaceService.js           # existing — DELETE installWithCustomization
└── pages/
    ├── TemplateGalleryPage.jsx         # modified — wire TemplateCard.onSelect to modal
    └── SvgEditorPage.jsx               # modified — delete sessionStorage branch (lines 83-119)

supabase/migrations/
└── 168_clone_template_with_customization.sql  # NEW
```

### Pattern 1: Full-screen modal via design-system `Modal`

**What:** Use design-system `Modal` with `size="full"` and `closeOnOverlay={false}` instead of hand-rolling `fixed inset-0`.

**When:** Always. The design-system Modal already provides focus trap, portal mount, body scroll lock, escape key, ARIA wiring.

**Example:**
```jsx
// Source: src/design-system/components/Modal.jsx (existing)
import { Modal, Button, Badge, Alert } from '../../design-system';

<Modal
  open={isOpen}
  onClose={onClose}
  size="full"
  closeOnOverlay={false}
  closeOnEscape
  showCloseButton={false}        // custom toolbar has its own Close
>
  {/* Toolbar + Split View */}
</Modal>
```

### Pattern 2: Keyboard nav guarded by focused element

**What:** Attach ArrowLeft/ArrowRight listener to `window`, but no-op when `document.activeElement.tagName` is `INPUT` or `TEXTAREA`.

**Why:** Users typing in the text-override input must not trigger prev/next.

**Example:**
```jsx
useEffect(() => {
  if (!open) return;
  const handler = (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  onPrev();
    if (e.key === 'ArrowRight') onNext();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [open, onPrev, onNext]);
```

### Pattern 3: Live SVG preview with debounce

**What:** Color swatches debounce `onChange` by 50ms; text inputs fire `onBlur` (not `onChange`) to avoid reparenting focus mid-word.

**Why:** `swapColor` + `serializeSvg` on every keystroke is expensive. UI-SPEC pins the exact timings.

**Example:**
```jsx
const [svgString, setSvgString] = useState(initialSvg);
const [doc, setDoc] = useState(() => parseSvgForCustomize(initialSvg));

// Debounced color change
const onColorChange = useDebouncedCallback((targetColor, newColor) => {
  swapColor(doc, targetColor, newColor);
  setSvgString(serializeSvg(doc));
}, 50);

// Text change on blur (not onChange)
const onTextBlur = (element, newText) => {
  updateText(element, newText);
  setSvgString(serializeSvg(doc));
};
```

### Pattern 4: Mirror the existing RPC signature

**What:** The new RPC mirrors `clone_template_to_scene` (migration 080:175-287) exactly for security-definer, search-path, grant, auth check, and license-gate.

**Why:** Identical security surface. Review-friendly diff.

**Example:**
```sql
-- Source: supabase/migrations/080_template_marketplace.sql (lines 175-287)
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
DECLARE
  v_user_id uuid;
  v_template template_library%ROWTYPE;  -- or svg_templates; decide by template_id lookup strategy
  v_new_scene_id uuid;
  v_slide record;
  v_patched_design jsonb;
BEGIN
  -- (auth + license checks: copy lines 192-234 verbatim)
  ...
  INSERT INTO scenes (...) RETURNING id INTO v_new_scene_id;

  FOR v_slide IN SELECT ... FROM template_library_slides ... LOOP
    v_patched_design := CASE
      WHEN p_customized_svg IS NOT NULL
      THEN jsonb_set(COALESCE(v_slide.design_json, '{}'::jsonb),
                     '{svgContent}',
                     to_jsonb(p_customized_svg))
      ELSE v_slide.design_json
    END;
    INSERT INTO scene_slides (..., design_json, ...) VALUES (..., v_patched_design, ...);
  END LOOP;

  -- NOTE: use_count increment deferred to Phase 175 — do NOT copy lines 276-280.
  RETURN v_new_scene_id;
END;
$$;

GRANT EXECUTE ON FUNCTION clone_template_with_customization(uuid, text, text) TO authenticated;
```

⚠️ The SQL above references `template_library` but Phase 172 templates may originate from `svg_templates` (the SVG side of the union). The RPC must decide based on the template's source. One clean approach: query `gallery_templates` VIEW first to discover `source_table`, then branch. Alternatively: give the RPC an `editor_type` parameter. Decide in planning.

### Anti-Patterns to Avoid

- **Hand-rolling a fixed inset-0 overlay** — design-system Modal already exists and is more accessible.
- **Using `dangerouslySetInnerHTML` without DOMPurify sanitization** — even though svgCustomizeService uses `textContent`, the SVG string could still contain `<script>` or `on*` handlers from upstream sources.
- **Calling `sessionStorage.setItem('pendingTemplate', ...)` anywhere** — the whole key is being retired. New apply path uses RPC return value only.
- **Calling `clone_template_to_scene` then patching** — this is the race that TPRV-05 exists to close. Always use the new atomic RPC for SVG.
- **Passing template data via URL params** — D-12 says sceneId only; `onNavigate('svg-editor?designId={sceneId}')` matches existing convention.
- **Reading `design_json` from `gallery_templates` VIEW for Polotno** — VIEW explicitly nulls it (migration 167:260). Polotno slide data lives in `template_library_slides`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal shell / escape / focus trap | Hand-rolled `fixed` div + addEventListener | Design-system `Modal` (size="full") | Already portal-rendered with AnimatePresence, focus trap, body scroll lock, ARIA. |
| Color picker UI | react-color / react-colorful / wheel picker | Native `<input type="color">` triggered from a swatch button | Zero bundle, native a11y, UI-SPEC explicitly forbids third-party. |
| SVG mutation primitives | Hand-rolled querySelector + string replace | `svgCustomizeService.*` (9 helpers already tested) | Unit-tested, handles hex/rgb/named-color normalization, XSS-safe textContent. |
| Atomic SQL clone + patch | Read-modify-write from JS | `clone_template_with_customization` RPC (new) | Closes TPRV-05 race; transaction scope ensures no torn state. |
| Sanitization of user-supplied SVG | Regex strip of `<script>` / `on*` | `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }})` | DOMPurify is a community-vetted sanitizer; package already in deps. |
| Debounce hook | Custom `useDebounce` | Inline `setTimeout` cleared via ref (same pattern as TemplateGalleryPage search) | Phase 171 research Note: "No custom useDebounce hook — inline setTimeout is sufficient." |
| Toast/notification | Hand-rolled floating toast | `<Alert variant="error" dismissible>` inside the panel (per UI-SPEC D-13) | Phase 172 deliberately chose inline Alert over toast; keeps modal-scoped. |

**Key insight:** The v20.0 platform has already shipped every primitive this phase needs. The work is composition — not invention.

---

## Runtime State Inventory

This is a feature-add phase (not a rename/refactor), BUT it includes removal of sessionStorage state (D-14). Inventory below is exhaustive.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (DB) | None. New `scene_slides` rows will carry customized SVG in `design_json.svgContent`. No existing records carry the shape this phase introduces. | No migration needed for existing data. |
| Live service config | None. | — |
| OS-registered state | None. | — |
| Secrets/env vars | None. No new secrets. `VITE_CLOUDINARY_CLOUD_NAME` for logo upload already exists (brandThemeService.js:17). | — |
| Build artifacts | None. | — |
| **Browser storage (sessionStorage `pendingTemplate`)** | **1 reader on disk:** `src/pages/SvgEditorPage.jsx:86` (get), `:94` (remove). **0 writers** in active source. Writers were removed by quick task 260414-qc4 (Template Marketplace retirement, commit 2c2d736f). | **Delete the entire `else if (urlTemplateId)` branch** (lines 84-119). Also delete `urlTemplateId` from destructuring (line 55) if it becomes unused. [VERIFIED: `grep -rn "sessionStorage.*pendingTemplate\|pendingTemplate"` 2026-04-20 returns only these 2 lines in active src/.] |
| **Browser storage (other)** | `localStorage` key `bizscreen:recentTemplates:{uid}` (Phase 171, recently-used sort) — OUT OF SCOPE for this phase. Other sessionStorage usage: `canvaService` (OAuth state), `webVitalsService` (analytics session), `Player.jsx` (display cache). All unrelated. | Do not touch. |
| Installed packages | `dompurify@3.3.3` in package.json — installed but not imported in src/. Phase 172 becomes the first consumer. | Import in `templateApplyService.js` + (optionally) in `TemplatePreviewModal.jsx` for inline preview safety. |

**Nothing found in category:** As noted above — every "None" is verified, not omitted.

---

## Common Pitfalls

### Pitfall 1: SVG color normalization silently fails on new templates
**What goes wrong:** `svgCustomizeService.normalizeColor` does not handle `var(--...)`, `currentColor`, or class-based CSS colors. `swapColor` compares normalized strings; mismatches silently no-op. Users edit the swatch but nothing visibly changes.
**Why:** `normalizeColor` was built against hand-crafted hex-only SVGs.
**How to avoid:** Before preview mounts, run `extractColors(doc)` and check `.length`. If zero for a visually colorful template, show "This template has no customizable colors." message (already in UI-SPEC Copywriting Contract as `Empty panel (no customize attributes)`). Document in content-authoring guide (Phase 175): "All colors MUST be explicit hex." Not fixable this phase without touching the service.
**Warning signs:** User reports "I changed the color but nothing happened." `extractColors().length === 0` on a non-trivial template.

### Pitfall 2: Double-click on Apply creates two scenes
**What goes wrong:** While the RPC is in-flight, a second click fires a second RPC call. Two scene rows, two different IDs, user lands on the second one; the first is an orphan.
**Why:** Network lag between click and button-disable.
**How to avoid:** Set `loading={true}` on `<Button>` BEFORE awaiting the RPC call (not after). Button's `loading` prop disables the click handler implicitly (Button.jsx:176). UI-SPEC Apply CTA state table requires this.
**Warning signs:** Two scenes in the user's library with the same name / 200ms apart in created_at.

### Pitfall 3: Prev/next nav keeps pending customize state
**What goes wrong:** User tweaks colors on template A, clicks Next, panel shows template B but with template A's colors still applied to the new SVG doc.
**Why:** The customize state (hex values) lives in the component; the SVG doc changes but state doesn't reset.
**How to avoid:** Use `key={currentTemplate.id}` on `<QuickCustomizePanel>` — React remounts the component on template change, guaranteeing fresh state. Alternative: explicit reset in useEffect on `currentTemplate.id` change.
**Warning signs:** Colors from template A visually bleeding into template B's preview.

### Pitfall 4: Polotno navigation target mismatch (CONTEXT.md D-12 ambiguity)
**What goes wrong:** D-12 says Polotno opens at `/scene-editor/:sceneId`, but SceneEditorPage does NOT mount PolotnoEditor — PolotnoEditor only lives in DesignEditorPage (`design-editor` route). Navigating to scene-editor renders a block-based editor that cannot read Polotno JSON blueprints.
**Why:** The v20.0 architecture assumed `editor_type='polotno'` routes to a "Polotno scene editor" — but no such component exists yet. PolotnoEditor is used only for designs, not scenes.
**How to avoid:** Resolve in planning. Three viable paths — see §Open Questions §OQ-1. Safest for Phase 172 scope: navigate to `scene-editor-{sceneId}` regardless, accept that Polotno-specific rendering is not yet wired, flag as follow-up. The existing `clone_template_to_scene` RPC already succeeds in cloning; what the user sees at scene-editor is SceneEditorPage's default block view of the cloned slides.
**Warning signs:** User applies a Polotno template, lands on scene editor, sees an empty or misrendered canvas.

### Pitfall 5: SVG XSS via bypass of svgCustomizeService.updateText
**What goes wrong:** `svgCustomizeService.updateText` uses `textContent` — but a malicious user can paste SVG source into the input (if we had one) or, more practically, could patch the customizedSvg variable in browser devtools before Apply fires. The RPC writes whatever string it receives. Subsequent render of `design_json.svgContent` in the editor or player could execute `<script>` or `on*` handlers.
**Why:** The RPC is a dumb persistor by D-10. Server-side PL/pgSQL SVG sanitization is out of scope and would need a PG extension.
**How to avoid:** Call `DOMPurify.sanitize(customizedSvg, { USE_PROFILES: { svg: true, svgFilters: true }})` in `templateApplyService.applyTemplate` before the RPC call. Also sanitize once on modal mount before setting the initial SVG string (in case upstream templates contain user-authored content — they shouldn't, but defense-in-depth).
**Warning signs:** Scene editor renders a template and executes arbitrary JS. Any `<script>` tag appearing in `scene_slides.design_json.svgContent` in DB queries.

### Pitfall 6: Empty QuickCustomizePanel on template with no data-customize-* attributes
**What goes wrong:** `extractColors`/`extractTextNodes`/`findLogoElement` all return empty; panel renders zero controls; Apply still works but the user sees a blank right pane.
**Why:** svgCustomizeService operates on all elements (not just `data-customize-*` attributes currently — see service implementation), but some templates may have no colors at all (e.g., pure monochrome logos).
**How to avoid:** UI-SPEC specifies empty-panel copy: "This template has no customizable elements." Render that when all three extract functions return empty. Apply button remains enabled — user can still apply the template unchanged.
**Warning signs:** User reports "I can't customize this one" — expected behavior if SVG has no variable content.

### Pitfall 7: Modal opens before filtered array is stable
**What goes wrong:** User clicks a card while the gallery is still re-filtering (e.g., after changing a filter chip). `initialIndex` is computed against an array that's about to change; modal opens on wrong template.
**Why:** React concurrent rendering; click handler captures `displayedTemplates[i]` at event time, not at modal-render time.
**How to avoid:** Modal prop contract — accept `templates[]` (full array) and `initialIndex`, snapshot them into modal-internal state on mount. Do NOT re-derive from gallery state while modal is open. UI-SPEC says: `initialIndex` = card's position in filtered results array — snapshot semantics are implied.
**Warning signs:** Modal sometimes opens on a different template than the one clicked; "jumps" when a filter is applied just before the click.

---

## Code Examples

Verified patterns from official sources and in-codebase neighbors.

### Example 1: Calling the new RPC from the client
```javascript
// Source: pattern in src/services/marketplaceService.js:192-200
// (same caller shape; just a different RPC name + extra arg)
import { supabase } from '../supabase';

export async function cloneTemplateWithCustomization(templateId, sceneName, customizedSvg) {
  const { data, error } = await supabase.rpc('clone_template_with_customization', {
    p_template_id: templateId,
    p_scene_name: sceneName,
    p_customized_svg: customizedSvg,
  });
  if (error) throw error;
  return data; // new scene UUID
}
```

### Example 2: DOMPurify sanitizing SVG before RPC
```javascript
// Source: DOMPurify README (dompurify 3.x) — https://github.com/cure53/DOMPurify
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(customizedSvgString, {
  USE_PROFILES: { svg: true, svgFilters: true },
  // default behavior: strips <script>, on* handlers, javascript: URLs
});
```

### Example 3: Design-system Modal full-screen composition
```jsx
// Source: src/design-system/components/Modal.jsx (existing)
import { Modal } from '../../design-system';

<Modal open={open} onClose={onClose} size="full" closeOnOverlay={false} showCloseButton={false}>
  <div className="flex flex-col h-full">
    {/* custom toolbar */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <Button variant="ghost" onClick={onClose} aria-label="Close template preview">
        <X className="w-5 h-5" />
      </Button>
      <h2 id="preview-title" className="text-base font-semibold text-gray-900">
        {template.name}
      </h2>
      <Badge variant="default" size="sm">{currentIndex + 1} of {total}</Badge>
    </div>

    {/* split view */}
    <div className="flex-1 grid grid-cols-[65fr_35fr] gap-0 overflow-hidden">
      <div className="relative bg-gray-100 p-8 flex items-center justify-center">{/* preview */}</div>
      <div className="overflow-y-auto border-l border-gray-200">{/* panel */}</div>
    </div>
  </div>
</Modal>
```

### Example 4: Service dispatcher (templateApplyService.js — new file)
```javascript
// Source: new file; follows existing service conventions (named exports, thin supabase wrapper)
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';

/**
 * Apply a template to a new scene. Dispatches to the correct RPC by editor_type.
 *
 * @param {Object} template - Row from gallery_templates VIEW
 * @param {Object} options
 * @param {string} [options.customizedSvg] - Pre-serialized customized SVG (svg editor_type only)
 * @returns {Promise<string>} new scene UUID
 */
export async function applyTemplate(template, { customizedSvg } = {}) {
  const sceneName = `${template.name} scene`;

  if (template.editor_type === 'svg') {
    const sanitized = customizedSvg
      ? DOMPurify.sanitize(customizedSvg, { USE_PROFILES: { svg: true, svgFilters: true }})
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

/**
 * Build the navigation target for the editor after Apply.
 * App uses flat pageMap keys (not React Router paths).
 */
export function editorRouteFor(template, sceneId) {
  if (template.editor_type === 'svg') return `svg-editor?designId=${sceneId}`;
  if (template.editor_type === 'polotno') return `scene-editor-${sceneId}`;
  throw new Error(`Unknown editor_type: ${template.editor_type}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sessionStorage.pendingTemplate` handoff to editor | URL param + DB fetch (scene loaded by sceneId from URL) | This phase (Phase 172) | Multi-tab safe, refresh-safe, shareable. |
| `marketplaceService.installWithCustomization` (clone-then-patch) | `clone_template_with_customization` RPC (atomic, single transaction) | This phase (Phase 172) | Closes TPRV-05 race. |
| Three-source JS merge in `svgTemplateService.fetchSvgTemplates` | Single query against `gallery_templates` VIEW | Phase 170 (complete) | Already in place; Phase 172 just consumes it. |
| Full-screen modal via hand-rolled `fixed inset-0` (LayoutPreviewModal pattern) | Design-system `Modal` with `size="full"` | 2026-04 (design-system extension; not this phase's change) | Design-system Modal already supports full — use it for new work. Do not refactor LayoutPreviewModal in this phase. |

**Deprecated/outdated:**
- `sessionStorage.pendingTemplate` — being removed this phase.
- `marketplaceService.installWithCustomization` — to be deleted (zero callers). Any attempt to "retain as wrapper" adds no value given no callers exist.

---

## Focus Areas (detailed answers to the planner's research questions)

### Focus Area 1: Existing `clone_template_to_scene` RPC

**Location:** `supabase/migrations/080_template_marketplace.sql` lines 175-287. [VERIFIED]

**Signature:**
```sql
CREATE OR REPLACE FUNCTION clone_template_to_scene(
  p_template_id uuid,
  p_scene_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

**Grant pattern (line 287):** `GRANT EXECUTE ON FUNCTION clone_template_to_scene(uuid, text) TO authenticated;`

**Security model:**
- `SECURITY DEFINER` — runs as function owner; bypasses RLS on tables read.
- `SET search_path = public` — prevents search_path injection.
- Auth check: `v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION` (lines 192-196).
- License gate: free/pro/enterprise switch (lines 213-223); super_admin override (lines 226-230).
- Uses `v_user_id` (auth.uid) as `tenant_id` when inserting scenes (line 244). Note: uses profile ID as tenant ID — matches the `tenants` = `profiles` convention elsewhere.

**Return:** UUID of the new scene row.

**Highest migration on disk as of 2026-04-20:** `167_gallery_templates_view_and_rls.sql` [VERIFIED: `ls supabase/migrations/`]. **New migration MUST be numbered `168_` or higher.**

### Focus Area 2: `LayoutPreviewModal.jsx` pattern

**Location:** `src/components/layout-editor/LayoutPreviewModal.jsx` (137 lines). [VERIFIED]

**Pattern extracted:**
- `fixed inset-0 z-50 flex items-center justify-center` wrapper
- Backdrop: `absolute inset-0 bg-black/90 backdrop-blur-sm` with `onClick={onClose}` (overlay-closes — diverges from UI-SPEC D-01 intent for Phase 172)
- Escape handler: `useEffect` binding `keydown`, checks `e.key === 'Escape'` (lines 28-39)
- Content layout: flex-col with top toolbar (`bg-black/50` dark toolbar), centered canvas (`flex-1 flex items-center justify-center`), bottom info bar

**Recommendation:** Do NOT clone LayoutPreviewModal. Instead, use design-system `Modal` (size="full", closeOnOverlay=false). LayoutPreviewModal predates the design-system Modal's `full` size support; it is legacy. Reusing it for a split-view preview would require rewriting the internals anyway, for no gain.

### Focus Area 3: `svgCustomizeService.js` API surface

**Location:** `src/services/svgCustomizeService.js` (284 lines). [VERIFIED]

Exported function signatures:

| Function | Input | Output | Notes |
|----------|-------|--------|-------|
| `normalizeColor(colorValue: string)` | CSS color string | Lowercase hex string OR pass-through | Handles hex (3/6/8 digit), rgb()/rgba(), named colors via canvas. `none`, `transparent`, `url(...)` pass through. Does NOT handle `var(--...)` or `currentColor` (Pitfall 1). |
| `parseSvgForCustomize(svgString: string)` | SVG source string | DOM Document | Uses `DOMParser`. Throws `Error('Invalid SVG content')` if no `<svg>` root. |
| `extractColors(doc: Document)` | Parsed SVG doc | `string[]` of unique lowercase hex | Reads `fill`/`stroke` from attributes and inline styles. Excludes `none`/`transparent`/`url(...)`. |
| `extractTextNodes(doc: Document)` | Parsed SVG doc | `Array<{id: string, element: Element, text: string, label: string}>` | Skips tspans whose parent is a `<text>`. `label` = element's `id` attribute or first 20 chars of text. |
| `findLogoElement(doc: Document)` | Parsed SVG doc | `Element \| null` | Queries `image#logo, image.logo, image#logo-placeholder` in order; falls back to first `image`. |
| `swapColor(doc, targetColor, newColor)` | Doc + two color strings | `void` (mutates doc) | Handles `fill`/`stroke` attribute AND inline-style. Normalizes both target and new through `normalizeColor`. |
| `updateText(element: Element, newText: string)` | Element + string | `void` (mutates element) | Uses `textContent` (XSS-safe per T-166-01 comment). |
| `replaceLogo(doc, logoSrc: string)` | Doc + URL string | `void` (mutates doc) | Sets both `href` (SVG 2) and `xlink:href` (SVG 1.1). No-op if logo element not found. |
| `serializeSvg(doc: Document)` | Parsed SVG doc | `string` | Uses `XMLSerializer`. |

**All 9 functions are unit-tested in `tests/unit/services/svgCustomize.test.js`.** Phase 172 introduces no new helpers.

### Focus Area 4: `marketplaceService.installWithCustomization` callers

**Location:** `src/services/marketplaceService.js:209-237`. [VERIFIED]

**Current implementation:** Clone-then-patch (non-atomic):
1. Calls `installTemplateAsScene` (which calls `clone_template_to_scene` RPC)
2. SELECT from `scene_slides` for the cloned scene (LIMIT 1, position ASC)
3. UPDATE `scene_slides.design_json` to merge `svgContent: customizedSvg`

**Callers:** **Zero.** `grep -rn "installWithCustomization" src/` returns only the definition line. The function is dormant code waiting for a consumer. [VERIFIED 2026-04-20]

**Recommendation:** Delete `installWithCustomization` entirely in this phase. No callers = no wrapper retention value. The new `templateApplyService.applyTemplate` becomes the sole entry point. Keep `installTemplateAsScene` (still used via the dispatcher's Polotno branch as a reference pattern, though the dispatcher calls the RPC directly — `installTemplateAsScene` may also be deletable; confirm at plan time whether any admin page uses it).

### Focus Area 5: Scene editor routes

**App routing pattern:** Flat `pageMap` in `src/App.jsx`. `currentPage` is a string key; navigation = `setCurrentPage(key)` or `onNavigate(key)`. NOT React Router paths. [VERIFIED: src/App.jsx]

**Routes relevant to Phase 172:**

| Route key / prefix | Component | Line in App.jsx |
|---|---|---|
| `svg-editor` (query-string style: `svg-editor?templateId=X`, `svg-editor?designId=X`) | `SvgEditorPage` | 1039 |
| `scene-editor-{sceneId}` | `SceneEditorPage` | 998-1005 |
| `design-editor` / `design-editor-{id}` | `DesignEditorPage` (THIS is where PolotnoEditor is mounted, via iframe — line 20: `lazy(() => import('../components/PolotnoEditor'))`) | 1030-1038 |

**Key finding:** `SceneEditorPage` does NOT mount `PolotnoEditor`. PolotnoEditor is only in `DesignEditorPage`. This surfaces the Open Question §OQ-1.

**For SVG post-Apply (D-12):** `onNavigate('svg-editor?designId=' + sceneId)` — reuses SvgEditorPage's existing `designId` branch (SvgEditorPage.jsx:67-82). This is the path that DOES work today.

Wait — re-read SvgEditorPage.jsx:67-82: it loads `designId` as a `svg_designs` row via `loadUserSvgDesign`, not a scene. The new RPC creates a scene row, not an `svg_designs` row. This is another planning-time ambiguity. See §OQ-2.

### Focus Area 6: `SvgEditorPage.jsx:83-118` sessionStorage branch

**Exact code to delete** (lines 83-119, inclusive of the `else if` condition):

```javascript
// Check for template ID - load from sessionStorage
else if (urlTemplateId) {
  try {
    const storedTemplate = sessionStorage.getItem('pendingTemplate');
    if (!storedTemplate) {
      throw new Error('Template data not found');
    }
    const templateData = JSON.parse(storedTemplate);
    console.log('Loading template:', templateData.name);

    // Clear the stored template
    sessionStorage.removeItem('pendingTemplate');

    // Determine SVG URL - use svgContent if available (from template_library),
    // otherwise fall back to svgUrl
    let svgUrl = templateData.svgUrl;
    if (templateData.svgContent) {
      // Convert SVG content to data URL for the editor
      const encoded = btoa(unescape(encodeURIComponent(templateData.svgContent)));
      svgUrl = `data:image/svg+xml;base64,${encoded}`;
    }

    if (cancelled) return;
    setEditorConfig({
      svgUrl,
      templateId: templateData.id,
      templateName: templateData.name || 'New Design',
      initialJson: null,
      designId: null,
      canvasWidth: templateData.width || 1920,
      canvasHeight: templateData.height || 1080,
    });
  } catch (e) {
    console.error('Failed to load template:', e);
    if (!cancelled) setError('Template not found. Please select a template again.');
  }
}
```

**Also remove** `templateId: params.get('templateId')` from the `parseQueryParams` function (line 27) AND the `urlTemplateId` destructure at line 55 AND the `'templateId:', urlTemplateId` log at line 65.

**Writers of `pendingTemplate` in the codebase:** **Zero.** [VERIFIED: `grep -rn "sessionStorage.setItem.*pendingTemplate\|setItem.*pendingTemplate"` returns no matches. Historical writers were removed in quick task 260414-qc4.]

### Focus Area 7: Service dispatcher placement — recommendation

**Three candidates considered:**

1. `templateGalleryService.js` — read-focused; already Phase 170-owned; adding write operations changes its nature.
2. `templateApplyService.js` (new) — write-focused; mirrors the existing pattern of service-per-responsibility.
3. `TemplatePreviewModal.jsx` internal — keeps everything in one component; difficult to unit-test.

**Recommendation:** **New file `src/services/templateApplyService.js`.**

**Rationale:**
- Existing codebase convention: services are named by responsibility (`marketplaceService.js` for install, `svgTemplateService.js` for SVG-specific reads, `templateGalleryService.js` for gallery reads). A new `templateApplyService.js` fits.
- `templateGalleryService` has a single-function surface today (`fetchGalleryTemplates`). Adding Apply mixes read and write concerns and bloats its test surface.
- `TemplatePreviewModal` should be pure UI — business logic (sanitization, dispatch, navigation route building) belongs in a service for unit-testability.
- Aligns with the v20.0 research note (SUMMARY.md line 129): "New `templateGalleryService.js` ... single data-access point for gallery." — distinct from Apply.

**Public surface (proposed):**
```javascript
export async function applyTemplate(template, { customizedSvg } = {}) // Promise<sceneId>
export function editorRouteFor(template, sceneId)                     // string (pageMap key)
```

### Focus Area 8: `brandThemeService` shape

**Active-theme API:** `brandThemeService.getBrandTheme()` at line 371. [VERIFIED]

**Signature:**
```javascript
export async function getBrandTheme()
// returns { data: Object|null, error: string|null }
```

**Implementation:** Calls Supabase RPC `get_active_brand_theme`. Returns `DEFAULT_THEME` on any error (graceful fallback).

**Shape of `data`** (from `DEFAULT_THEME` at line 24):
```javascript
{
  name: 'Default Theme',
  primary_color: '#3B82F6',     // ← used for QuickCustomizePanel primary swatch default
  secondary_color: '#1D4ED8',   // ← secondary swatch default
  accent_color: '#10B981',      // ← accent swatch default
  neutral_color: '#6B7280',
  background_color: '#0F172A',
  text_primary_color: '#FFFFFF',
  text_secondary_color: '#94A3B8',
  font_heading: 'Inter',
  font_body: 'Inter',
  background_style: {...},
  widget_style: {...},
  block_defaults: {...},
  logo_url: (from brand_themes table when fetched from DB, not in DEFAULT_THEME)
}
```

**Logo URL:** The DB row (`brand_themes.logo_url`) is what the UI-SPEC Logo section references. `DEFAULT_THEME` does NOT include `logo_url`; the field exists only when a user-saved theme is loaded. QuickCustomizePanel must check `theme?.logo_url` and render the upload-placeholder when absent.

**Brand theme prefill pattern for QuickCustomizePanel:**
```jsx
const [brandTheme, setBrandTheme] = useState(null);
useEffect(() => {
  getBrandTheme().then(({ data }) => setBrandTheme(data));
}, []);

// In Colors section:
const defaultPrimary = brandTheme?.primary_color || extractedColors[0]; // fallback to template's embedded first color
```

### Focus Area 9: Design-system exports (verification)

| Required by UI-SPEC | Verified? | Evidence |
|---|---|---|
| `Modal size="full"` | ✓ | `sizeStyles.full` at Modal.jsx:55. Exported from design-system/index.js:53. |
| `Modal closeOnOverlay={false}` | ✓ | Prop at Modal.jsx:38 default true; explicit `false` supported at Modal.jsx:128. |
| `Button variant="primary"` | ✓ | Button.jsx:21 default; also variants `secondary`, `ghost`, `danger`. Button.jsx:65-100. |
| `Button variant="ghost"` | ✓ | Button.jsx:85-92. |
| `Button variant="secondary"` | ✓ | Button.jsx:76-83. |
| `Button size="lg"` / `size="md"` / `size="sm"` | ✓ | Button.jsx:48-54 (sizes: `xs`, `sm`, `md`, `lg`, `xl`). |
| **`Badge variant="neutral"`** | **⚠️ MISMATCH** | **Badge.jsx has NO `neutral` variant.** Available: `default`, `success`, `warning`, `error`, `info`, `purple` (Badge.jsx:25-32). UI-SPEC Component Inventory says `Badge variant="neutral"` — this is a UI-SPEC error. **Use `variant="default"` instead** (matches the gray-100/gray-700 nav counter visual the UI-SPEC intends). Align with Phase 171 (TemplateGalleryPage.jsx:547 uses `variant="default"` for the "Popular" badge). |
| `Badge variant="warning"` | ✓ | Badge.jsx:28 — `bg-amber-50 text-amber-700`. |
| `Alert variant="error"` | ✓ | Alert.jsx:46-52. |
| `Alert dismissible + onDismiss` | ✓ | Alert.jsx:20-21, :102 (renders X button when dismissible). |
| `Input` | ✓ | Exported via design-system/index.js:42 from FormElements. |
| `TemplateCardSkeleton` | ✓ | Exported from design-system/index.js:79. |
| Motion primitive `modal` | ✓ | motion.js, re-exported from index.js:111. |
| Motion primitive `fadeIn` | ✓ | index.js:105. |
| Motion primitive `fadeInScale` | ✓ | index.js:106. |
| Motion primitive `scaleTap` | ✓ | index.js:109. |
| **`Skeleton` primitive** | **⚠️** | **`Skeleton` is not exported in design-system/index.js.** UI-SPEC Component Inventory line references "Skeleton | Design system base". The base `Skeleton`, `SkeletonText`, `SkeletonImage` are only used internally by `TemplateCardSkeleton`. For Phase 172: either (a) use `TemplateCardSkeleton` for the preview loading state (overkill shape-wise), or (b) add `Skeleton` to the design-system index export (small, safe). **Recommend (b) — one-line export addition.** |

**Action for planner:** Add Badge `variant="default"` fix to the UI-SPEC cross-reference task (planner should NOT silently substitute). Add `Skeleton` export to design-system/index.js in the same wave as TemplatePreviewModal construction.

### Focus Area 10: Filtered-results plumbing

**Source of the filtered array:** `TemplateGalleryPage.jsx:260-306` — a useMemo called `displayedTemplates` that applies fuse.js search, category/tag/orientation filters, and one of four sort strategies. [VERIFIED]

**Data contract passed to modal:** The modal needs the full filtered array AND the clicked card's index. TemplateCard invokes `onSelect()` with no argument (TemplateCard.jsx:63) — so the gallery page must wire `onSelect={() => openModal(index)}` via closure over `index` from the `.map((t, i) => ...)` expression.

**Modal prop interface (proposed):**
```jsx
<TemplatePreviewModal
  open={isModalOpen}
  templates={displayedTemplates}          // snapshot at open time
  initialIndex={selectedIndex}             // index within templates[]
  onClose={() => setIsModalOpen(false)}
  onApply={(template, customizedSvg) => {...}}
  onNavigate={onNavigate}                  // pass-through for editor route
  showToast={showToast}                    // pass-through for errors (inline Alert preferred per D-13)
/>
```

**Snapshot semantics (Pitfall 7):** Modal should copy `templates` to internal state on `open` transition (via `useState(() => templates)` or ref) so mid-modal filter changes don't shift the array under the user's feet.

---

## Common Pitfalls summary (cross-reference table)

| # | Pitfall | Mitigation | Where Tested |
|---|---------|-----------|--------------|
| 1 | CSS-variable / currentColor color swap no-ops | Empty-panel fallback copy | Manual / content-authoring guide |
| 2 | Double-click on Apply → two scenes | `loading={true}` before awaiting RPC | Component test (TemplatePreviewModal) |
| 3 | Prev/next keeps stale customize state | `key={template.id}` on QuickCustomizePanel | Component test |
| 4 | Polotno route mismatch (CONTEXT.md D-12) | Planner decision — see §OQ-1 | Manual after planning decision |
| 5 | SVG XSS via devtools tampering | DOMPurify.sanitize before RPC | Unit test (templateApplyService) + integration test (slow-DB) |
| 6 | Empty QuickCustomizePanel | Copy from UI-SPEC fallback string | Component test |
| 7 | Modal opens on wrong filtered item | Snapshot templates[] on open | Component test |

---

## Environment Availability

No external tools or services are newly required. All dependencies are in-repo:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| dompurify | templateApplyService sanitization | ✓ | 3.3.3 | — |
| Supabase Postgres | new RPC | ✓ | migrations run via `supabase db query --linked --file` per Phase 170 convention | — |
| vitest | unit tests | ✓ | 4.0.14 | — |
| @playwright/test | E2E tests | ✓ | 1.57.0 | — |
| Node | test runner | ✓ | v25.0.0 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | vitest 4.0.14 (config: `vitest.config.js`; env: jsdom) |
| E2E framework | Playwright 1.57.0 (config: `playwright.config.js`; test dir: `tests/e2e`) |
| Quick run command | `npx vitest run --dir tests/unit/services tests/unit/components/template-gallery tests/integration/preview-apply` (< 20s) |
| Full suite command | `npm run test && npm run test:e2e` |
| Wave 0 test dirs | `tests/unit/components/template-gallery/` (new), `tests/integration/preview-apply/` (new), `tests/e2e/preview-apply.spec.js` (new) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TPRV-01 | Modal opens from card click; prev/next cycles filtered set; keyboard + arrow buttons both work | Component (vitest+RTL) | `npx vitest run tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` | ❌ Wave 0 |
| TPRV-01 | Arrow keys disabled while INPUT/TEXTAREA focused | Component | Same file | ❌ Wave 0 |
| TPRV-02 | QuickCustomizePanel renders Colors / Logo / Text sections; brand-theme prefill fires | Component | `npx vitest run tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` | ❌ Wave 0 |
| TPRV-03 | Swatch change triggers `swapColor` and serialized SVG updates in preview | Component | Same file | ❌ Wave 0 |
| TPRV-04 | SVG template → `clone_template_with_customization`; Polotno template → `clone_template_to_scene` (dispatcher test) | Unit | `npx vitest run tests/unit/services/templateApplyService.test.js` | ❌ Wave 0 |
| TPRV-05 | New RPC writes scene row with customized svgContent atomically (slow-DB simulation) | Integration | `npx vitest run tests/integration/preview-apply/rpc-atomicity.test.js` (mocked supabase) + manual verification query against Supabase dev DB | ❌ Wave 0 |
| TPRV-05 | New RPC rejects mismatched license tier (403-equivalent RAISE EXCEPTION) | Integration | Same file | ❌ Wave 0 |
| TPRV-06 | Navigating from gallery→editor leaves sessionStorage clean (no `pendingTemplate` key) | E2E | `npx playwright test tests/e2e/preview-apply.spec.js -g "sessionStorage"` | ❌ Wave 0 |
| TPRV-06 | SvgEditorPage opens scene by designId URL param; DB scene design_json contains customized svgContent | E2E | Same file | ❌ Wave 0 |
| Security | DOMPurify strips `<script>` and `on*` handlers from customizedSvg before RPC | Unit | `tests/unit/services/templateApplyService.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched-file-dir>` — whichever directory the task touched (modal/panel/service).
- **Per wave merge:** `npx vitest run` (all unit + integration).
- **Phase gate:** Full suite green (`npm run test && npm run test:e2e`) before `/gsd-verify-work`.

### Wave 0 Gaps

All gaps — this is a net-new component area:

- [ ] `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` — covers TPRV-01 (open/close/nav), TPRV-03 (live update propagation), Pitfall 2/3/7
- [ ] `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` — covers TPRV-02/03 sections, brand-theme prefill
- [ ] `tests/unit/services/templateApplyService.test.js` — covers TPRV-04 dispatcher, DOMPurify integration (Security), editorRouteFor
- [ ] `tests/integration/preview-apply/rpc-atomicity.test.js` — covers TPRV-05 (simulated slow-DB, license gate); may be stubbed-supabase since live RPC requires auth
- [ ] `tests/e2e/preview-apply.spec.js` — covers TPRV-06 (sessionStorage absent) + full flow (gallery click → modal → customize → apply → editor loads correct customized SVG)
- [ ] Manual verification checklist (below) for visuals not easily automated

### Manual Verification Checklist (items E2E can't easily assert)

- [ ] Split-view proportions visually 65/35 on a 1440px viewport
- [ ] Mobile stack at 375px viewport: preview top, panel scrolls under, Apply sticky-bottom
- [ ] Keyboard-only navigation: Tab into modal, ArrowRight/ArrowLeft cycles templates, Escape closes, focus returns to originating card
- [ ] Color swatch tap on touch device opens native color picker
- [ ] Backdrop click does NOT close modal (D-01 vs LayoutPreviewModal legacy behavior)
- [ ] Apply failure Alert: appears above Apply button, dismissible, Apply re-enables afterward
- [ ] Polotno variant: static thumbnail shown, info block shown, Apply works, lands on `scene-editor-{sceneId}`
- [ ] After Apply (SVG): `document.createElement('a').href=...'` style check on design_json to confirm sanitized content
- [ ] After Apply: `sessionStorage.length === 0` for gallery-handoff keys (check DevTools Application tab)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | `auth.uid()` check in new RPC — mirrors existing pattern. |
| V3 Session Management | partial | Existing Supabase session cookies; no change. D-14 removes a session-based cache (`sessionStorage.pendingTemplate`) which was NEVER containing secret data (it held template preview data) — removal is purely a UX hardening, not a security fix. |
| V4 Access Control | yes (inherited) | RPC inherits `clone_template_to_scene` license-tier logic verbatim (free / pro / enterprise / super_admin). Verify at migration time. |
| **V5 Input Validation** | **YES (CRITICAL)** | **`p_customized_svg TEXT` accepts arbitrary client input. Must sanitize client-side via DOMPurify before RPC call.** |
| V6 Cryptography | no | No new crypto. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via crafted SVG (`<script>`, `<a href="javascript:">`, `on*` attributes) | Tampering | `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }})` client-side; server is a dumb persistor (D-10). |
| SQL injection in `p_customized_svg` | Tampering | `p_customized_svg` is a `TEXT` parameter passed by Supabase JS client; `jsonb_set(..., to_jsonb(p_customized_svg))` inside PL/pgSQL — parameterized throughout, no string concatenation. Low risk. |
| License-tier bypass via direct RPC call | Elevation | Same license gate as `clone_template_to_scene` (SECURITY DEFINER, auth.uid check, license switch). Inherited mitigation. |
| Denial-of-service via huge SVG payload | Availability | Client-side DOMPurify has a default max-length guard. Add hard cap in `templateApplyService.applyTemplate` (e.g., reject >500KB SVG) — SVGs at signage display sizes should never approach this. |
| CSRF via forged RPC call | Spoofing | Supabase JS client attaches auth token automatically; `SECURITY DEFINER` verifies via `auth.uid()`. No additional CSRF token needed. |
| RLS bypass via SECURITY DEFINER | Elevation | `search_path = public` set at function definition (mirrored from existing RPC). Verify at code-review time. |

**Security enforcement policy:** This phase is the first consumer of `dompurify` in src/. Add a CI-level ESLint rule (if feasible) or README note: "User-supplied SVG content MUST pass through DOMPurify before persistence."

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DOMPurify `USE_PROFILES: { svg: true, svgFilters: true }` is the correct config for SVG sanitization in dompurify 3.x | Security Domain, Code Example 2 | XSS bypass if config is insufficient. Verify against dompurify 3.x docs at plan time. [CITED: dompurify README, but profile names should be double-checked for 3.3.x] |
| A2 | `brand_themes.logo_url` column exists and is populated for users who have uploaded a logo | Focus Area 8 | Logo prefill silently shows placeholder. Planner should verify via `\d brand_themes` or a smoke query. [ASSUMED from brandThemeService.js:426 `logo_url: themeData.logo_url \|\| null` which implies the column exists.] |
| A3 | `SceneEditorPage` does not need to render Polotno JSON blueprints correctly for Phase 172 (it already works with block-based rendering of whatever `design_json` contains) | Pitfall 4, Focus Area 5 | Polotno templates appear empty or malformed in scene editor after Apply. See §OQ-1. [ASSUMED] |
| A4 | The `installTemplateAsScene` function (marketplaceService.js:192) is still used by some admin page; not safe to delete in this phase | Focus Area 4 | If unused, deleting it is cleaner. If used (e.g., AdminTemplatesPage), deletion breaks admin. [ASSUMED safe to keep; verify at plan time.] |
| A5 | The highest migration number on disk (167) is also the highest deployed — no pending/unmerged migrations | Focus Area 1 | New migration collides with an unmerged one. [VERIFIED on disk — but cross-check open branches at plan time.] |

**If this table is empty:** Not empty — 5 assumptions listed; 2 verifiable via 5-minute queries during planning.

---

## Open Questions (RESOLVED)

> All three questions resolved before /gsd-plan-phase Wave 1. See 172-CONTEXT.md D-15, D-16, D-17 (added 2026-04-21) and Plan 06 Task 3.

1. **§OQ-1 — Polotno template destination route (D-12 ambiguity).** **RESOLVED** by 172-CONTEXT.md D-16 (2026-04-21): Polotno apply navigates to `scene-editor-${sceneId}`; Polotno rendering fidelity inside `SceneEditorPage`'s block editor is explicitly out-of-scope for Phase 172 and deferred to Phase 174 follow-up.
   - What we knew: D-12 originally said Polotno opens at `/scene-editor/:sceneId`. `SceneEditorPage` renders at pageMap key `scene-editor-{sceneId}`. BUT `SceneEditorPage` does NOT mount `PolotnoEditor` — it mounts its own block-based editor. `PolotnoEditor` lives in `DesignEditorPage` (pageMap key `design-editor`). `DesignEditorPage` operates on `svg_designs` or blank designs via `designId`, NOT on scenes.
   - Options considered:
     1. Route Polotno apply to `scene-editor-{sceneId}` and accept that the block-based editor may not render Polotno JSON faithfully.
     2. Scope creep: wire PolotnoEditor into SceneEditorPage based on `design_json` shape (conflicts with D-05).
     3. Pragmatic compromise: route Polotno apply to `scene-editor-{sceneId}` AND flag a follow-up issue for Phase 174. **← selected**
   - Resolution: Option 3 chosen. Documented as D-16 in CONTEXT.md.

2. **§OQ-2 — SVG editor post-Apply navigation URL shape.** **RESOLVED** by 172-CONTEXT.md D-15 (2026-04-21): a new `?sceneId=` branch is added to `SvgEditorPage.jsx` by Plan 06. The new RPC writes only `scenes`+`scene_slides` rows (no companion `svg_designs` row).
   - What we knew: D-12 originally said `/svg-editor/:sceneId`. Existing SvgEditorPage used `svg-editor?designId={id}` against `svg_designs` via `loadUserSvgDesign`.
   - Resolution: Extend SvgEditorPage with a third branch that accepts `?sceneId=...`, loads the scene + first slide, extracts `slide.design_json.svgContent`, and initializes FabricSvgEditor with that SVG. Existing `?designId=` branch retained for pre-existing svg_designs. Documented as D-15 in CONTEXT.md; implemented in Plan 06.

3. **§OQ-3 — `installTemplateAsScene` reachability audit.** **RESOLVED** by Plan 06 Task 3 — runtime audit is performed during Wave 4 execution: `grep -rn "installTemplateAsScene" .` (including `scripts/`, `supabase/functions/`). If zero external callers, the function is deleted alongside `installWithCustomization`; otherwise retained.
   - What we knew: `installTemplateAsScene` (marketplaceService.js:192) is called by `installWithCustomization` (same file, line 211). No other callers in `src/`.
   - Resolution: Full-path audit gated on execution time, with the delete/retain decision deterministic from grep output.

---

## Sources

### Primary (HIGH confidence — direct file inspection 2026-04-20)

- `supabase/migrations/080_template_marketplace.sql:175-287` — `clone_template_to_scene` RPC definition (template for new RPC)
- `supabase/migrations/167_gallery_templates_view_and_rls.sql` — gallery_templates VIEW; confirms highest migration number is 167
- `src/services/svgCustomizeService.js` (all 284 lines) — 9 exported helpers; unit-tested
- `src/services/marketplaceService.js:192-237` — existing `installTemplateAsScene` and `installWithCustomization` (dead code path)
- `src/services/templateGalleryService.js` — Phase 170 gallery service
- `src/services/brandThemeService.js:24-57, :371-383` — DEFAULT_THEME shape and getBrandTheme API
- `src/design-system/components/Modal.jsx:30-187` — Modal with size="full" support verified
- `src/design-system/components/Button.jsx:18-100` — Button variants and sizes verified
- `src/design-system/components/Badge.jsx:13-54` — Badge variants (no "neutral" — mismatch with UI-SPEC noted)
- `src/design-system/components/Alert.jsx:1-70` — Alert with dismissible + onDismiss verified
- `src/design-system/index.js` — full design-system export list (Skeleton NOT exported; TemplateCardSkeleton exported)
- `src/pages/TemplateGalleryPage.jsx:260-306, :557-560` — displayedTemplates filtered array; TemplateCard.onSelect hook point
- `src/pages/SvgEditorPage.jsx:22-147` — sessionStorage branch; parseQueryParams
- `src/pages/SceneEditorPage.jsx:87, :670-695` — Does NOT mount PolotnoEditor
- `src/pages/DesignEditorPage.jsx:20` — PolotnoEditor is only mounted here (lazy-loaded)
- `src/App.jsx:531, :563, :898, :998, :1039` — pageMap routes
- `package.json:38` — dompurify 3.3.3 confirmed installed
- `tests/unit/services/svgCustomize.test.js` — existing svgCustomize test pattern (reference for new tests)
- `playwright.config.js`, `vitest.config.js`, `tests/setup.js` — test-framework configs

### Secondary (MEDIUM confidence — validated once, prefer double-check at plan time)

- DOMPurify 3.x SVG profile configuration — general pattern from DOMPurify README; version-specific profile names not re-verified this session
- `brand_themes.logo_url` column existence — inferred from `brandThemeService.createBrandTheme` body; not confirmed via `\d brand_themes`

### Tertiary (LOW confidence — flagged)

- None. All material claims above are either VERIFIED or ASSUMED-and-listed in the Assumptions Log.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against package.json and all design-system exports confirmed against source
- Architecture: HIGH — every integration point grepped in actual codebase; dispatcher placement rationale anchored in observed conventions
- Pitfalls: HIGH — derived from direct code inspection + inherited from v20.0 research synthesis (PITFALLS.md)
- Security: HIGH — DOMPurify absence verified via grep; RPC surface inherited from documented pattern
- Open questions: MEDIUM — §OQ-1 (Polotno route) is a real architectural gap; the research resolves to "scope around it" but a planner-time decision is still required

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days; stack and migrations are stable; dompurify 3.x is stable; any material change would likely be a new phase)
