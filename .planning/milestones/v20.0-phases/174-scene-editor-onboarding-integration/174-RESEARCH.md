# Phase 174: Scene Editor + Onboarding Integration - Research

**Researched:** 2026-04-28
**Domain:** React SPA routing with pseudo-URL params, PL/pgSQL RPC authoring, driver.js v1.x tour integration, onboarding wizard extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Editor Return Apply Semantics**
- D-01: "Use Template" overwrites active slide's `design_json`/`svgContent` only. Confirmation dialog shown only when slide differs from `getDefaultDesign()`. Default-empty slides overwritten silently.
- D-02: Polotno templates hidden in `editorReturn` mode. Gallery filters to `editor_type='svg'` only when `?editorReturn=1` is present.
- D-03: "Browse Templates" button in `SceneEditorPage` topbar at ~line 527 next to AI panel toggle. Icon: `LayoutTemplate`. `variant="ghost"` `size="sm"`. Navigates via `onNavigate('templates')` with editorReturn URL params.
- D-04: URL contract: `?editorReturn=1&returnSceneId=<sceneId>`. Both params required. `TemplateGalleryPage` reads via `useSearchParams()`. After apply, navigate to `scene-editor-${returnSceneId}`.
- D-05: New RPC `apply_template_to_active_slide(p_scene_id UUID, p_slide_id UUID, p_template_id UUID, p_editor_type TEXT) RETURNS UUID`. Single PL/pgSQL transaction. Auth preamble, scene ownership, template access, svg_content read, `UPDATE scene_slides SET design_json = jsonb_set(...)`. Returns `p_slide_id`.
- D-06: `marketplaceService.js` — add `applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType)` thin wrapper. `TemplatePreviewModal` gains `mode` prop (`'new-scene'` default vs `'editor-return'`). Modal reads active sceneId/slideId from URL params.

**Onboarding Starter-Pack Step**
- D-07: Insert `'starter_pack'` between `'logo'` and `'first_media'` in `ONBOARDING_STEPS`. Final order: 7 steps.
- D-08: Step UI is embedded grid inside `OnboardingWizard` modal. 6 pack cards in a grid using `PackCard`. Card-click bypasses `PackPreviewModal` — "pick → apply → advance" directly.
- D-09: Top 6 packs by `display_order ASC, name ASC`. `fetchStarterPacks({ activeOnly: true })` + `slice(0, 6)` client-side.
- D-10: Success: toast "Added N templates from <pack name>", `update_onboarding_step('starter_pack', true)`, auto-advance to `first_media`. On failure: inline error toast, "Try again" affordance, no auto-advance.
- D-11: Skip button unchanged ("Skip for now"). Step skip calls `update_onboarding_step('starter_pack', true)` and advances. Wizard-level "Skip for now" preserved.

**`completed_starter_pack` Tracking**
- D-12: `ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS completed_starter_pack BOOLEAN DEFAULT FALSE`. No backfill.
- D-13: Tri-state encoded as: chosen = `completed_starter_pack=TRUE AND skipped_at IS NULL`; skipped = `completed_starter_pack=TRUE AND skipped_at IS NOT NULL`; not-reached = `completed_starter_pack=FALSE`.
- D-14: Three RPCs extended idempotently via `CREATE OR REPLACE FUNCTION`: `get_onboarding_progress()` return shape extended; `update_onboarding_step` allowlist extended; `skip_onboarding()` unchanged. Same migration as D-05/D-12/D-16.
- D-15: `is_complete` rollup now requires all 7 booleans TRUE. Wizard progress bar denominator driven by `ONBOARDING_STEPS.length` (auto-updates to 7 from the array change in D-07).

**driver.js Tour**
- D-16: Tour state in `onboarding_progress.completed_gallery_tour BOOLEAN DEFAULT FALSE`. Same migration as D-12.
- D-17: Trigger: first `TemplateGalleryPage` mount where `completed_gallery_tour=FALSE`. Extend `get_onboarding_progress()` return shape to include `completed_gallery_tour`. On any tour exit (complete, X-close, skip, Escape), call mutation to set `completed_gallery_tour=TRUE`.
- D-18: Four tour stops: (1) filter chips/sidebar, (2) search input, (3) first template card (use `data-tour` attribute), (4) static pointer at apply CTA with copy "Click any template to preview and apply." Do NOT auto-open preview modal.
- D-19: Any tour exit marks `completed_gallery_tour=TRUE`. Never re-appears. No replay button for v20.0.

### Claude's Discretion
- driver.js install version: `driver.js@^1.x` (latest stable: **1.4.0** [VERIFIED: npm registry 2025-11-18])
- Migration number: next available after 173 — use **174** (`174_phase_174_onboarding_columns_and_template_apply_rpc.sql`). Single file for D-05, D-12, D-14, D-16.
- Confirmation dialog wording for D-01: "Replace this slide with [template name]? Your current edits will be lost." with destructive-styled "Replace" + "Cancel".
- `data-tour` selector strategy: `data-tour="filter-bar" | "search-input" | "first-card" | "apply-cta"` DOM attributes.
- Onboarding step icon: planner picks from lucide-react (`Package` or `LayoutTemplate` recommended).
- Whether pack apply auto-completes `first_media`: leave independent (recommended).
- "Use Template" CTA: distinct copy, reuse `<Button variant="primary">` shape.

### Deferred Ideas (OUT OF SCOPE)
- Polotno round-trip in editorReturn mode
- `starter_pack_applied_id` audit column
- Tri-state ENUM `starter_pack_status`
- Tour replay / "Show me around" button
- Tour for non-onboarded users trigger restriction
- Auto-completing `first_media` from starter-pack apply
- Mobile-first overflow-menu for editor CTA
- Pack convergence with legacy `content_templates`
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEDR-01 | User can open the template gallery from inside the scene editor via a "Browse Templates" action | D-03: topbar button; D-04: URL contract; App.jsx routing mechanism documented below |
| TEDR-02 | User returning from gallery→editor lands back on the origin scene with the new template applied | D-05: apply_template_to_active_slide RPC; D-06: modal mode prop; editorReturn navigation flow |
| TEDR-03 | Gallery deep-link (`?editorReturn=true`) preserves editor context across the round-trip | D-04: URL contract; `useSearchParams()` already wired in TemplateGalleryPage; URL-param persistence mechanism documented |
| TONB-01 | New-user onboarding includes a skippable starter-pack selection step | D-07: ONBOARDING_STEPS insert; D-08: StepContent branch; OnboardingWizard switch shape documented |
| TONB-02 | Selecting a pack during onboarding bulk-applies it without leaving the wizard | D-08: card-click dispatch; D-10: `applyStarterPack` (Phase 173 Phase D-04 wrapper) called directly |
| TONB-03 | Onboarding state tracks `completed_starter_pack` | D-12: schema; D-14: RPC extensions; existing `update_onboarding_step` dynamic SQL mechanism documented |
| TONB-04 | First-visit driver.js tour on gallery | D-16/D-17/D-18/D-19: column, trigger, steps, dismissal; driver.js v1.4.0 API verified |
</phase_requirements>

---

## Summary

Phase 174 wires three upstream phases (172, 173) into two new entry points: a scene-editor→gallery round-trip and an onboarding tour. The work touches seven files in existing code plus two new files (migration, useGalleryTour hook). No new pages or major architecture shifts — the phase is primarily about URL plumbing, RPC authoring, and driving.js integration.

**The most technically loaded task is the URL contract for editorReturn (D-04).** App.jsx uses a `pages[currentPage]` dict lookup where `currentPage` is a plain React state string — it does NOT contain query params. `TemplateGalleryPage` reads query params via `useSearchParams()` from react-router, which reads from the actual browser URL (`window.location.search`). When `SceneEditorPage` calls `onNavigate('templates')`, `currentPage` becomes `'templates'` (correct for the dict lookup), but query params must be written to the browser URL separately using `useNavigate` or `window.history.pushState` before calling `onNavigate`. The planner must address this sync mechanism explicitly — it is the primary new-pattern introduced by this phase.

**The second significant task is PL/pgSQL RPC authoring.** `apply_template_to_active_slide` is the project's first "mutate an existing slide, not clone to a new scene" RPC. The auth preamble and SVG-content read are direct copypasta from migration 170. The critical difference is the `UPDATE scene_slides SET design_json = jsonb_set(...)` instead of an `INSERT INTO scenes`.

**driver.js 1.4.0 is not yet in `package.json`** — Wave 0 must include `npm install driver.js@^1.4.0`. The library CSS must be imported alongside the JS import.

**Primary recommendation:** Wave 0 = install driver.js + RED test stubs + migration file skeleton. Wave 1 = migration push (BLOCKING — live DB apply). Wave 2 = client-side editor-return wiring. Wave 3 = onboarding step. Wave 4 = tour hook. Wave 5 = E2E + sign-off.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| editorReturn URL param propagation | Frontend (SceneEditorPage) | Frontend (TemplateGalleryPage consumer) | SceneEditorPage writes the URL; TemplateGalleryPage reads it via useSearchParams |
| apply_template_to_active_slide RPC | Database (PL/pgSQL) | Frontend (marketplaceService wrapper) | Atomicity requires DB-layer transaction; client wrapper is a thin pass-through |
| editorReturn mode detection + filter | Frontend (TemplateGalleryPage) | — | URL-param read already wired; mode logic added inline |
| TemplatePreviewModal `mode` prop | Frontend (component) | — | Modal dispatches to different apply path based on mode |
| Onboarding step insertion | Frontend (onboardingService + OnboardingWizard) | Database (onboarding_progress + RPCs) | Array insert is pure JS; DB tracks completion |
| completed_starter_pack / completed_gallery_tour columns | Database (migration 174) | Frontend (onboardingService mapper) | Source of truth is DB; service maps snake_case → camelCase |
| RPC allowlist extension | Database (update_onboarding_step) | — | Dynamic SQL already handles arbitrary column names; only allowlist check changes |
| driver.js tour | Frontend (useGalleryTour hook) | Database (completed_gallery_tour column) | Tour orchestration is client-side; persistence is DB-backed |
| Tour dismissal persistence | Frontend (markGalleryTourSeen mutation) | Database (completed_gallery_tour) | Client writes via existing RPC pattern |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| driver.js | **1.4.0** [VERIFIED: npm registry 2025-11-18] | Product tour / feature highlight | MIT license (required per REQUIREMENTS.md §Out of Scope), React 19 compatible, no dependencies |
| react-router-dom | existing | `useSearchParams()` for URL-backed state | Already installed; TemplateGalleryPage already uses it |
| supabase-js | existing | RPC calls, auth | Project standard |
| lucide-react | existing | `LayoutTemplate` icon for topbar button, step icon | Project design-system standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| driver.js/dist/driver.css | bundled with driver.js | Tour overlay/popover CSS | MUST import alongside JS — tour renders invisibly without it |
| DOMPurify | existing | SVG sanitization boundary | Already used in TemplatePreviewModal; editorReturn apply path inherits same boundary |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| driver.js | react-joyride | REJECTED: React 19 incompatible (`unmountComponentAtNode` removed). REQUIREMENTS.md §Out of Scope |
| driver.js | Shepherd.js | REJECTED: AGPL license. REQUIREMENTS.md §Out of Scope |
| DB column for tour state | localStorage | REJECTED: CONTEXT.md D-16 locked. localStorage is per-device; DB column is cross-device, same as other onboarding flags |

**Installation:**
```bash
npm install driver.js@^1.4.0
```

**Version verification:** Confirmed via `npm view driver.js` — 1.4.0 published 2025-11-18.

---

## Architecture Patterns

### System Architecture Diagram

```
SceneEditorPage
  ├── "Browse Templates" button onClick
  │   ├── window.history.pushState (or useNavigate) — writes ?editorReturn=1&returnSceneId=<id>
  │   └── onNavigate('templates') — sets currentPage='templates' → renders TemplateGalleryPage
  │
TemplateGalleryPage (mounts fresh)
  ├── useSearchParams() reads ?editorReturn=1&returnSceneId
  ├── filters allTemplates to editor_type='svg' only
  ├── hides StarterPacksStrip
  ├── TemplateCard CTA label: "Use Template"
  └── card click → TemplatePreviewModal(mode='editor-return', returnSceneId)
          ├── "Use Template" CTA → marketplaceService.applyTemplateToActiveSlide(sceneId, slideId, templateId)
          │       └── supabase.rpc('apply_template_to_active_slide', {...})
          │               DB: UPDATE scene_slides SET design_json = jsonb_set(...svgContent...)
          └── on success → onNavigate('scene-editor-' + returnSceneId)

OnboardingWizard (TONB-01..03)
  ├── ONBOARDING_STEPS[2] = { id: 'starter_pack', no navigateTo }
  ├── StepContent switch case 'starter_pack'
  │   ├── fetchStarterPacks({ activeOnly: true }).slice(0,6)
  │   └── PackCard grid — onClick → applyStarterPack(packId)
  │           ├── success: showToast, updateOnboardingStep('starter_pack', true), advance
  │           └── failure: inline error, "Try again", no advance
  └── Skip → updateOnboardingStep('starter_pack', true), advance

TemplateGalleryPage (TONB-04 — first visit only)
  └── useGalleryTour() hook
      ├── on mount: read completed_gallery_tour from getOnboardingProgress()
      ├── if FALSE: driver.drive()
      │   Steps:
      │     [data-tour="filter-bar"]  → "Filter by category, orientation, or favorites."
      │     [data-tour="search-input"] → "Search the catalog by name or tag."
      │     [data-tour="first-card"]  → "Browse templates — click to preview."
      │     [data-tour="apply-cta"]   → "Click any template to preview and apply."
      └── onDestroyed / onCloseClick / onDestroyStarted → markGalleryTourSeen()
              → supabase.rpc('update_onboarding_step', { p_step: 'gallery_tour', p_completed: true })
              (or dedicated thin RPC — planner decides; extending update_onboarding_step is simpler)
```

### Recommended Project Structure

```
src/
├── hooks/
│   └── useGalleryTour.js              # NEW — driver.js wrapper (D-16..D-19)
├── pages/
│   ├── SceneEditorPage.jsx            # MODIFY — topbar button + URL nav (D-03, D-04)
│   └── TemplateGalleryPage.jsx        # MODIFY — editorReturn mode + tour trigger (D-02, D-04, D-17)
├── components/
│   ├── OnboardingWizard.jsx           # MODIFY — starter_pack case + STEP_ICONS (D-07, D-08)
│   └── template-gallery/
│       └── TemplatePreviewModal.jsx   # MODIFY — mode prop, editor-return apply path (D-06)
└── services/
    ├── marketplaceService.js          # MODIFY — applyTemplateToActiveSlide wrapper (D-06)
    └── onboardingService.js           # MODIFY — ONBOARDING_STEPS, typedef, helpers (D-07, D-15)
supabase/migrations/
└── 174_phase_174_onboarding_columns_and_template_apply_rpc.sql  # NEW (D-05, D-12, D-14, D-16)
tests/
├── e2e/
│   ├── editor-return.spec.js          # NEW — TEDR-01..03 round-trip
│   ├── onboarding.spec.js             # EXTEND — starter_pack step
│   └── gallery-tour.spec.js           # NEW — TONB-04 first/second visit
└── integration/
    └── apply-template-to-slide.test.js  # NEW — RPC atomicity, RLS, polotno-rejection
```

### Pattern 1: editorReturn URL Contract (D-04 — CRITICAL)

**What:** App.jsx uses `pages[currentPage]` dict lookup. `TemplateGalleryPage` uses `useSearchParams()` from react-router which reads the real browser URL, NOT the `currentPage` string. So `onNavigate('templates?editorReturn=1')` would break the dict lookup — the key `'templates?editorReturn=1'` does not exist in the `pages` dict.

**Required approach:** Two separate operations:
1. Write URL params to the browser location (without page reload)
2. Call `onNavigate('templates')` to switch the page (currentPage = 'templates' → hits the dict correctly)

**Mechanism — use `useNavigate` from react-router in SceneEditorPage:**
```javascript
// Source: [VERIFIED: codebase — src/pages/TemplateGalleryPage.jsx:26, useSearchParams pattern]
// Source: [VERIFIED: codebase — src/router/AppRouter.jsx — /app/* is one BrowserRouter route]
import { useNavigate } from 'react-router-dom';

// Inside SceneEditorPage component:
const navigate = useNavigate();

const handleBrowseTemplates = () => {
  // Step 1: push URL params into the browser URL (react-router maintains URL state)
  navigate(`?editorReturn=1&returnSceneId=${sceneId}`, { replace: true });
  // Step 2: switch the displayed page component via App.jsx pseudo-router
  onNavigate('templates');
};
```

**Why `useNavigate` not `window.history.pushState`:** `useNavigate` integrates with the BrowserRouter context that `useSearchParams()` in TemplateGalleryPage reads from. A raw `history.pushState` may bypass React Router's internal location tracking and cause `useSearchParams()` to miss the change.

**Alternative (simpler but less integrated):** Pass `editorReturn` and `returnSceneId` as props down from App.jsx rather than relying on URL params. This avoids the two-step nav pattern but violates D-04's URL contract and TEDR-03's "deep-link preserves context" requirement. Do NOT use this alternative.

**Return trip navigation:** After `applyTemplateToActiveSlide` succeeds in `TemplatePreviewModal`, call:
```javascript
// Clear editorReturn params first, then navigate to scene editor
navigate('?', { replace: true });  // clears params
onNavigate(`scene-editor-${returnSceneId}`);
```
Or simply: `onNavigate(`scene-editor-${returnSceneId}`)` — App.jsx's `startsWith('scene-editor-')` branch handles it. The URL params left behind are harmless since `scene-editor-<id>` is handled via the `startsWith` branch, not the `pages` dict.

**Confidence:** HIGH — verified by reading src/router/AppRouter.jsx, src/App.jsx:162, src/pages/TemplateGalleryPage.jsx:26+152.

### Pattern 2: apply_template_to_active_slide RPC (D-05 — concrete template)

**Blueprint:** Migration 170 `clone_svg_template_to_scene` for auth preamble and SVG-content read; migration 173 `apply_starter_pack` for auth preamble pattern. Critical difference: `UPDATE scene_slides` not `INSERT INTO scenes`.

```sql
-- Source: [VERIFIED: supabase/migrations/170_clone_svg_template_to_scene.sql + 173_apply_starter_pack.sql]
CREATE OR REPLACE FUNCTION public.apply_template_to_active_slide(
  p_scene_id   uuid,
  p_slide_id   uuid,
  p_template_id uuid,
  p_editor_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_has_access     boolean := false;
  v_svg_template   svg_templates%ROWTYPE;
  v_resolved_svg   text;
BEGIN
  -- Auth preamble (Pattern C — mirrors 170:52-56, 173:37-41)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify scene ownership (not present in clone RPCs — new for this RPC)
  IF NOT EXISTS (
    SELECT 1 FROM scenes
    WHERE id = p_scene_id
      AND (tenant_id = v_user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'super_admin'
      ))
  ) THEN
    RAISE EXCEPTION 'Scene not found or access denied';
  END IF;

  -- Verify slide belongs to scene
  IF NOT EXISTS (
    SELECT 1 FROM scene_slides
    WHERE id = p_slide_id AND scene_id = p_scene_id
  ) THEN
    RAISE EXCEPTION 'Slide not found in scene';
  END IF;

  -- Reject polotno (D-02 enforcement at RPC layer)
  IF p_editor_type != 'svg' THEN
    RAISE EXCEPTION 'Only SVG templates supported in editor-return mode';
  END IF;

  -- Read template — mirrors svg_templates SELECT RLS (migration 167:39-45)
  SELECT * INTO v_svg_template
  FROM svg_templates
  WHERE id = p_template_id
    AND is_active = TRUE
    AND (tenant_id IS NULL OR created_by = v_user_id);

  -- super_admin bypass (mirrors 170:67-77)
  IF v_svg_template IS NULL THEN
    SELECT role = 'super_admin' INTO v_has_access
    FROM profiles WHERE id = v_user_id;
    IF v_has_access THEN
      SELECT * INTO v_svg_template
      FROM svg_templates
      WHERE id = p_template_id AND is_active = TRUE;
    END IF;
  END IF;

  IF v_svg_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  IF v_svg_template.svg_content IS NULL THEN
    RAISE EXCEPTION 'Template has no SVG body';
  END IF;

  -- Overwrite active slide's design_json (jsonb_set creates/overwrites svgContent key)
  UPDATE scene_slides
  SET
    design_json = jsonb_set(
      COALESCE(design_json, '{}'::jsonb),
      '{svgContent}',
      to_jsonb(v_svg_template.svg_content),
      true    -- create if not exists
    ),
    updated_at = NOW()
  WHERE id = p_slide_id
    AND scene_id = p_scene_id;

  RETURN p_slide_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_template_to_active_slide(uuid, uuid, uuid, text) TO authenticated;
```

**Confidence:** HIGH — pattern directly derived from verified migration 170 + 173 bodies.

### Pattern 3: update_onboarding_step allowlist extension (D-14)

**What:** The existing `update_onboarding_step` RPC uses dynamic SQL:
```sql
-- Source: [VERIFIED: supabase/migrations/034_tenant_lifecycle_and_onboarding.sql:591-594]
EXECUTE format(
  'UPDATE public.onboarding_progress SET %I = $1, last_step_at = NOW(), updated_at = NOW() WHERE owner_id = $2',
  'completed_' || p_step
) USING p_completed, v_user_id;
```

The `%I` format with `'completed_' || p_step` means the function will write to `completed_starter_pack` and `completed_gallery_tour` automatically — no allowlist exists in the current body. The `is_complete` rollup check on lines 596-603 references only the 6 original columns by name and must be extended to include the new `completed_starter_pack` boolean.

**Extension needed in migration 174 (CREATE OR REPLACE):**
```sql
-- In the is_complete check, extend the AND chain:
SELECT
  completed_welcome AND completed_logo AND completed_first_screen AND
  completed_first_playlist AND completed_first_media AND completed_screen_pairing
  AND completed_starter_pack   -- Phase 174 addition
INTO v_is_complete
FROM public.onboarding_progress
WHERE owner_id = v_user_id;
```

The `next_step` CASE also needs `'completed_gallery_tour'` handling. However, `completed_gallery_tour` is not a wizard step — it's a separate affordance. The planner should add `'gallery_tour'` to the dynamic-write allowlist but keep it OUT of the `is_complete` rollup (it's not a wizard step, just a tour flag). Recommended: add a validator at the top of the RPC that checks `p_step` is in an explicit set before executing the dynamic SQL. This avoids SQL injection via arbitrary column names.

**Confidence:** HIGH — verified by reading the exact dynamic SQL in migration 034:591-594.

### Pattern 4: get_onboarding_progress return shape extension (D-14, D-17)

Current RPC returns 10 columns. Add 2:

```sql
-- Source: [VERIFIED: supabase/migrations/034_tenant_lifecycle_and_onboarding.sql:516-566]
-- In RETURNS TABLE(...) add:
completed_starter_pack BOOLEAN,
completed_gallery_tour BOOLEAN

-- In the SELECT ... FROM public.onboarding_progress op:
op.completed_starter_pack,
op.completed_gallery_tour,

-- In the IF NOT FOUND defaults:
false AS completed_starter_pack,
false AS completed_gallery_tour
```

Client-side (`onboardingService.js:142-156`): add two mappings in the return object:
```javascript
// Source: [VERIFIED: src/services/onboardingService.js:144-155]
completedStarterPack: row?.completed_starter_pack || false,
completedGalleryTour:  row?.completed_gallery_tour  || false,
```

### Pattern 5: OnboardingWizard StepContent extension (D-08)

**Current `StepContent` shape** (line 367 in OnboardingWizard.jsx): a local `content` object keyed by `step.id`, returns `content[step.id] || null`. The new `starter_pack` case must be added to this object.

**Critical:** The existing steps use a static JSX tree. The `starter_pack` step needs async data (pack list) and event handlers (pack click → apply). The planner should **not** put async logic directly in the static `content` object — instead add a `StarterPackStep` sub-component that manages its own state.

```javascript
// Source: [VERIFIED: src/components/OnboardingWizard.jsx:367-526 — StepContent pattern]
// New case in the content object:
starter_pack: <StarterPackStep onApplySuccess={handlePackApplySuccess} />,

// StarterPackStep manages:
// - useState([]) for packs
// - useEffect fetch fetchStarterPacks({ activeOnly: true }).slice(0, 6)
// - onClick per PackCard → applyStarterPack(packId) → parent callback
// - inline error state for failed apply
```

The `handlePackApplySuccess` callback in `OnboardingWizard` calls:
1. `showToast("Added N templates from <pack name>")` (needs pack name returned from StarterPackStep)
2. `updateOnboardingStep('starter_pack', true)` → RPC call
3. `setCurrentStepIndex(currentStepIndex + 1)` (advance to next step = `first_media`)

**`isStepComplete` mapping extension** (line 96-107):
```javascript
// Source: [VERIFIED: src/components/OnboardingWizard.jsx:96-107]
// Add to the mapping object:
starter_pack: progress.completedStarterPack,
```

**STEP_ICONS extension** (line 41-48):
```javascript
// Source: [VERIFIED: src/components/OnboardingWizard.jsx:41-48]
// Add one entry — planner picks icon:
starter_pack: Package,  // from lucide-react
```

### Pattern 6: useGalleryTour hook (D-16..D-19)

```javascript
// Source: [VERIFIED: Context7 /websites/driverjs — driver.js v1.4.0 API]
// File: src/hooks/useGalleryTour.js
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getOnboardingProgress } from '../services/onboardingService';
import { updateOnboardingStep } from '../services/onboardingService';

export function useGalleryTour() {
  const driverRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function maybeStartTour() {
      const progress = await getOnboardingProgress();
      if (cancelled) return;
      if (progress.completedGalleryTour) return;

      const markSeen = async () => {
        if (cancelled) return;
        await updateOnboardingStep('gallery_tour', true);
      };

      driverRef.current = driver({
        animate: true,
        showProgress: true,
        progressText: '{{current}} of {{total}}',
        allowClose: true,
        steps: [
          {
            element: '[data-tour="filter-bar"]',
            popover: {
              title: 'Filter Templates',
              description: 'Filter by category, orientation, or favorites.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '[data-tour="search-input"]',
            popover: {
              title: 'Search',
              description: 'Search the catalog by name or tag.',
              side: 'bottom',
            },
          },
          {
            element: '[data-tour="first-card"]',
            popover: {
              title: 'Browse Templates',
              description: 'Click any card to preview and apply it to your screen.',
              side: 'bottom',
            },
          },
          {
            element: '[data-tour="apply-cta"]',
            popover: {
              title: 'Apply a Template',
              description: 'Click any template to preview and apply.',
              side: 'top',
            },
          },
        ],
        onDestroyStarted: () => { markSeen(); },
        onDestroyed: () => { /* cleanup if needed */ },
      });

      driverRef.current.drive();
    }

    maybeStartTour();

    return () => {
      cancelled = true;
      driverRef.current?.destroy();
    };
  }, []);
}
```

**Important:** driver.js 1.4.0 uses `onDestroyStarted` to catch ALL exit paths (complete, close button, Escape). `onCloseClick` fires only when the close (X) button is clicked. Using `onDestroyStarted` is the correct hook to mark the tour seen regardless of how the user exits.

**Note on `data-tour` anchors and loading state:** The gallery may still be loading templates when the tour fires on mount. The planner should add a small delay or a MutationObserver guard. Simplest: `setTimeout(() => driverRef.current.drive(), 500)` after the DOM is ready. Alternatively, delay the tour until `isFetching === false` by passing that state to the hook.

**Confidence:** HIGH — driver.js API verified via Context7 (/websites/driverjs) + npm registry version.

### Pattern 7: Active slide non-default predicate (D-01)

```javascript
// Source: [VERIFIED: src/services/sceneDesignService.js:548-553]
// getDefaultDesign() returns: { background: { type: 'solid', color: '#111827' }, blocks: [] }

import { getDefaultDesign } from '../services/sceneDesignService';

function isSlideDefault(designJson) {
  const def = getDefaultDesign();
  // Check for SVG content (an SVG slide is non-default regardless of blocks)
  if (designJson?.svgContent) return false;
  // Check blocks
  if (Array.isArray(designJson?.blocks) && designJson.blocks.length > 0) return false;
  // Check background differs from default
  if (designJson?.background?.color !== def.background.color) return false;
  if (designJson?.background?.type !== def.background.type) return false;
  return true;
}
```

**Usage in SceneEditorPage** (before calling apply RPC):
```javascript
const activeSlide = slides[activeSlideIndex];
const needsConfirmation = !isSlideDefault(activeSlide?.design_json);
if (needsConfirmation) {
  // Show confirmation dialog
}
// else: apply silently
```

**Confidence:** HIGH — `getDefaultDesign()` return value verified by reading src/services/sceneDesignService.js:548-553.

### Anti-Patterns to Avoid

- **Don't embed editorReturn in the `currentPage` string.** `onNavigate('templates?editorReturn=1')` would set `currentPage` to the full string including `?`, which won't match `pages['templates']` in App.jsx. Always use `onNavigate('templates')` for the page key and write URL params separately.
- **Don't use sessionStorage for editorReturn context.** Pitfall 4 (PITFALLS.md): sessionStorage breaks in multi-tab scenarios. TEDR-03 requires URL params as the source of truth.
- **Don't call the existing `clone_svg_template_to_scene` RPC in editorReturn mode.** That RPC creates a NEW scene. D-05 requires a different RPC that mutates an existing slide.
- **Don't auto-open TemplatePreviewModal during the tour.** D-18 explicitly forbids auto-opening the modal during tour step 4 — mixed tour/modal UI complicates focus management.
- **Don't add `completed_gallery_tour` to the `is_complete` wizard rollup.** It's a gallery affordance, not a wizard step. Only `completed_starter_pack` goes into the rollup.
- **Don't call `applyStarterPack` via the starter_pack step's skip path.** Skip → `update_onboarding_step('starter_pack', true)` with no RPC call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Product tours with element highlight/overlay | Custom overlay + highlight CSS | `driver.js@^1.4.0` | Focus management, keyboard nav, scroll-into-view, popover positioning are non-trivial to get right. driver.js handles all of these including mobile viewports. |
| SVG sanitization | Custom strip-script logic | DOMPurify (already installed) | Already used in TemplatePreviewModal (Phase 172 D-17). Apply path inherits the same boundary. |
| Atomic slide update | Client-side: fetch slide, patch locally, POST | `apply_template_to_active_slide` RPC | Race condition: client-side fetch-then-update can lose concurrent edits. Single DB transaction closes the race. |
| URL param state management | `window.location.search` manual parse | `useSearchParams()` from react-router | Already installed and used in TemplateGalleryPage. react-router keeps URL in sync with BrowserRouter context. |

**Key insight:** driver.js is the single most complex dependency in this phase. Its overlay, focus-trap, scroll-into-view, mobile-responsive popover positioning, and keyboard navigation would each take days to implement reliably. Do not attempt to build a custom tour.

---

## Common Pitfalls

### Pitfall 1: editorReturn URL params lost on page re-render

**What goes wrong:** `onNavigate('templates')` re-mounts `TemplateGalleryPage` from scratch. If URL params were written to a location that react-router doesn't track (e.g., `window.history.replaceState` called without going through react-router's `navigate`), `useSearchParams()` in the remounted TemplateGalleryPage may return empty params.

**Why it happens:** React Router's `useSearchParams()` reads from the Router's internal location object, not directly from `window.location.search`. `window.history.pushState()` updates `window.location` but may not update react-router's location if called outside a `useNavigate` call.

**How to avoid:** Use `useNavigate()` from react-router in SceneEditorPage:
```javascript
const navigate = useNavigate();
navigate(`?editorReturn=1&returnSceneId=${sceneId}`, { replace: true });
// then:
onNavigate('templates');
```

**Warning signs:** `searchParams.get('editorReturn')` returns null in TemplateGalleryPage when arriving from the editor button.

### Pitfall 2: driver.js fires before gallery templates are rendered in the DOM

**What goes wrong:** `useGalleryTour` fires on mount. If `[data-tour="first-card"]` doesn't exist yet (gallery is still fetching), driver.js silently skips that step or shows a floating popover with no anchor.

**Why it happens:** The tour mount effect and the gallery fetch both happen on the same render cycle. Fetch is async; tour starts before fetch resolves.

**How to avoid:** Gate the tour start on `isFetching === false` — either pass it as a parameter to `useGalleryTour`, or add a minimal delay (`setTimeout 300ms`) after mount. The `data-tour="filter-bar"` and `data-tour="search-input"` are always present (non-data), but `data-tour="first-card"` requires at least one template to be rendered.

**Warning signs:** Tour step 3 shows a floating popover with no highlighted element; or tour step 3 is skipped entirely.

### Pitfall 3: `update_onboarding_step('gallery_tour', true)` writes `completed_gallery_tour` column

**What goes wrong:** The existing `update_onboarding_step` RPC uses `'completed_' || p_step` as the column name. This means calling it with `'gallery_tour'` writes to `completed_gallery_tour` — correct. But the current `is_complete` rollup doesn't include `completed_gallery_tour` (tour state should NOT block wizard completion). If the RPC's `is_complete` check is not updated correctly in migration 174, adding `completed_gallery_tour` to the rollup would cause the wizard to appear incomplete even for users who did all 7 steps.

**How to avoid:** In the migration 174 `CREATE OR REPLACE` of `update_onboarding_step`, extend the `is_complete` rollup to include `completed_starter_pack` ONLY, not `completed_gallery_tour`. Add a validator that checks `p_step` is in the allowlist `{'welcome','logo','first_media','first_playlist','first_screen','screen_pairing','starter_pack','gallery_tour'}` to prevent arbitrary column writes.

**Warning signs:** After completing all 7 wizard steps, `is_complete` remains false; wizard won't close.

### Pitfall 4: PackCard click inside OnboardingWizard bypasses the modal chrome's Skip/Continue

**What goes wrong:** `PackCard.onSelect` fires immediately on click. If the user's click hits the Card's full surface (which is large), a mis-click near the Skip button area might trigger pack selection AND then the wizard footer Skip at the same time (event bubbling).

**Why it happens:** `PackCard` uses `Card onClick={onSelect}` — the entire card surface is the click target. `onClick={e => e.stopPropagation()}` is not present.

**How to avoid:** Wrap each `PackCard` in a container with `onClick={(e) => e.stopPropagation()}` OR ensure the pack grid is positioned well away from the wizard footer buttons. The wizard modal is `max-w-lg` so vertical spacing should be sufficient, but test on small screens.

**Warning signs:** Clicking a pack in the wizard immediately skips the entire wizard.

### Pitfall 5: `getOnboardingProgress` error fallback omits new columns

**What goes wrong:** `getOnboardingProgress` in `onboardingService.js` has an error fallback path (lines 127-140) that builds a hardcoded object. This fallback does NOT include `completedStarterPack` or `completedGalleryTour`.

**How to avoid:** After adding the new fields to the happy path (line 144-155), also add them to the fallback return object in the `catch` block. Default both to `false`.

**Warning signs:** `progress.completedGalleryTour` is `undefined` when the RPC fails, causing `useGalleryTour` to treat it as falsy and run the tour every time (not every visit, but on every mount after an RPC error).

---

## Code Examples

Verified patterns from official sources:

### driver.js v1.4.0 — complete tour initialization
```javascript
// Source: [CITED: https://driverjs.com/docs/configuration — verified via Context7 /websites/driverjs]
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const driverObj = driver({
  animate: true,
  showProgress: true,
  progressText: '{{current}} of {{total}}',
  allowClose: true,
  steps: [
    {
      element: '[data-tour="filter-bar"]',
      popover: {
        title: 'Step Title',
        description: 'Step description',
        side: 'bottom',  // "top" | "right" | "bottom" | "left"
        align: 'start',  // "start" | "center" | "end"
      },
    },
  ],
  onDestroyStarted: (element, step, { config, state, driver }) => {
    // fires on ALL exit paths: complete, X-close, Escape
    markTourSeen();
  },
});

driverObj.drive();  // starts from step 0
```

### getDefaultDesign() — confirmed return shape
```javascript
// Source: [VERIFIED: src/services/sceneDesignService.js:548-553]
export function getDefaultDesign() {
  return {
    background: { type: 'solid', color: '#111827' },
    blocks: [],
  };
}
// A slide with { svgContent: '...' } in design_json is NON-DEFAULT
// A slide with blocks.length > 0 is NON-DEFAULT
// A blank slide = getDefaultDesign() shape = default (no confirmation needed)
```

### applyTemplateToActiveSlide — client wrapper pattern
```javascript
// Source: [VERIFIED: src/services/marketplaceService.js:632-636 — mirrors applyStarterPack]
export async function applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType) {
  const { data, error } = await supabase.rpc('apply_template_to_active_slide', {
    p_scene_id:    sceneId,
    p_slide_id:    slideId,
    p_template_id: templateId,
    p_editor_type: editorType,
  });
  if (error) throw error;
  return data;  // returns p_slide_id (UUID)
}
```

### OnboardingWizard — StepContent current switch shape
```javascript
// Source: [VERIFIED: src/components/OnboardingWizard.jsx:370-526]
// Current: plain object keyed by step.id, each value is JSX
const content = {
  welcome: (<div>...</div>),
  logo: (<div>...</div>),
  first_media: (<div>...</div>),
  first_playlist: (<div>...</div>),
  first_screen: (<div>...</div>),
  screen_pairing: (<div>...</div>),
};
return content[step.id] || null;

// Phase 174 addition — insert before first_media key:
starter_pack: <StarterPackStep onApplySuccess={handlePackApplySuccess} />,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sessionStorage template handoff | URL params via `useSearchParams()` | Phase 172 | editorReturn relies on URL params — must use same pattern; sessionStorage is forbidden (Pitfall 4 in PITFALLS.md) |
| Single apply path (clone to new scene) | Atomic RPC per apply type (clone or mutate existing) | Phase 172.1 | Phase 174 adds a third apply variant: mutate existing slide. Same atomicity contract |
| react-joyride for tours | driver.js (MIT) | Chosen for v20.0 | react-joyride incompatible with React 19; driver.js v1.x API is stable |
| 6-step onboarding wizard | 7-step wizard (adding starter_pack) | Phase 174 | Progress bar denominator auto-updates from `ONBOARDING_STEPS.length` — no UI change needed |

**Deprecated/outdated:**
- `sessionStorage` for ANY template handoff: removed in Phase 172 (TPRV-06). NEVER reintroduce.
- `clone_svg_template_to_scene` in editorReturn context: wrong RPC (creates new scene). Use `apply_template_to_active_slide`.

---

## Open Questions

1. **How does `TemplatePreviewModal` read `returnSceneId` in editor-return mode?**
   - What we know: D-06 says the modal reads from "URL params and the modal owner (TemplateGalleryPage)". The modal currently has no access to `searchParams`.
   - What's unclear: Does TemplateGalleryPage read `returnSceneId` from `searchParams` and pass it as a prop to the modal? Or does the modal import `useSearchParams()` directly?
   - Recommendation: TemplateGalleryPage reads `returnSceneId` from `searchParams` and passes it as a prop to `TemplatePreviewModal` alongside `mode`. This avoids coupling the modal to URL structure and is consistent with how TemplateGalleryPage already manages all URL state. Also: the `slideId` of the active slide must come from `SceneEditorPage` context — the planner must decide how this is communicated to the gallery. The gallery doesn't know which slide was active. Options: (a) add `activeSlideId` to the URL contract (`?editorReturn=1&returnSceneId=X&slideId=Y`), or (b) the RPC reads the first slide for the scene if no slideId is passed. Option (a) is cleaner and maintains the single-source-of-truth principle.

2. **Should `markGalleryTourSeen` use `update_onboarding_step('gallery_tour', true)` or a dedicated RPC?**
   - What we know: D-17 says "call a new mutation that sets `completed_gallery_tour=TRUE`". The existing `update_onboarding_step` dynamic SQL already writes `completed_gallery_tour` if called with `p_step='gallery_tour'`. So no new RPC is technically required.
   - What's unclear: The `is_complete` rollup in `update_onboarding_step` must NOT include `gallery_tour`. If the RPC is extended cleanly with an allowlist + rollup guard, reusing it is fine.
   - Recommendation: Reuse `update_onboarding_step('gallery_tour', true)` in migration 174's `CREATE OR REPLACE` body by (a) adding `'gallery_tour'` to the allowlist, (b) keeping it out of the `is_complete` AND chain. Add `markGalleryTourSeen()` as a named client function in `onboardingService.js` that calls this RPC with step `'gallery_tour'` for clarity.

3. **Does the activeSlideId need to be in the URL contract?**
   - See Open Question 1 above. This must be resolved before planning Task 1 (migration) and Task for SceneEditorPage button.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| driver.js | TONB-04 tour | Not yet installed | — install 1.4.0 | None — required |
| supabase CLI | migration push (BLOCKING wave) | Limited (see STATE.md) | Version drift known | MCP `apply_migration` (Path B — Phase 173 precedent) |
| npm registry | driver.js install | Yes (build environment) | — | — |
| Local Supabase DB | integration tests | Yes (docker) | migrations 171/172/173 applied per STATE.md Plan 10 | — |
| TEST_CLIENT_EMAIL | E2E tests | Assumed present | — | Skip guard in spec |

**Missing dependencies with no fallback:**
- driver.js not installed — Wave 0 Task: `npm install driver.js@^1.4.0`

**Missing dependencies with fallback:**
- supabase CLI — use MCP `apply_migration` (established precedent from Phase 173 Plan 04)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit/integration) + Playwright (E2E) |
| Config file | `vitest.config.js` / `playwright.config.js` (existing) |
| Quick run command | `npx vitest run tests/unit/services/onboardingService.test.js tests/unit/services/marketplaceService.test.js` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEDR-01 | Browse Templates button visible in editor topbar | E2E | `npx playwright test tests/e2e/editor-return.spec.js -g "shows Browse Templates"` | ❌ Wave 0 |
| TEDR-02 | After Use Template, slide design_json updated in DB | Integration | `npx vitest run tests/integration/apply-template-to-slide.test.js` | ❌ Wave 0 |
| TEDR-03 | editorReturn URL params present in gallery URL | E2E | `npx playwright test tests/e2e/editor-return.spec.js -g "preserves editorReturn"` | ❌ Wave 0 |
| TONB-01 | starter_pack step appears between logo and first_media | Unit | `npx vitest run tests/unit/services/onboardingService.test.js -t "ONBOARDING_STEPS"` | ✅ (extend) |
| TONB-02 | Pack selection calls applyStarterPack and auto-advances | E2E | `npx playwright test tests/e2e/onboarding.spec.js -g "starter_pack"` | ✅ (extend) |
| TONB-03 | completed_starter_pack written to DB on apply or skip | Integration | `npx vitest run tests/integration/apply-template-to-slide.test.js -t "completed_starter_pack"` | ❌ Wave 0 |
| TONB-04 | Gallery tour fires on first visit, not on second | E2E | `npx playwright test tests/e2e/gallery-tour.spec.js` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Quick run — unit tests for the modified service (`onboardingService`, `marketplaceService`)
- **Per wave merge:** Full vitest suite + targeted Playwright spec for the wave
- **Phase gate:** Full suite green before `/gsd-verify-work 174`

### Wave 0 Gaps

- [ ] `tests/e2e/editor-return.spec.js` — covers TEDR-01..03 (RED stubs)
- [ ] `tests/e2e/gallery-tour.spec.js` — covers TONB-04 (RED stubs)
- [ ] `tests/integration/apply-template-to-slide.test.js` — covers TEDR-02 atomicity + RLS + polotno-rejection
- [ ] `tests/unit/hooks/useGalleryTour.test.js` — unit tests for hook conditional logic
- [ ] `npm install driver.js@^1.4.0` — required before any import of the library

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth preamble in `apply_template_to_active_slide` RPC — `auth.uid() IS NOT NULL` |
| V3 Session Management | no | No new session flows |
| V4 Access Control | yes | Scene ownership check in RPC; template RLS mirrors migration 167 predicate |
| V5 Input Validation | yes | `p_editor_type` validated in RPC (`!= 'svg'` raises); `p_step` allowlist in `update_onboarding_step` |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized slide mutation (wrong tenant) | Tampering | RPC checks `scenes.tenant_id = auth.uid()` before UPDATE |
| Polotno template injected via editor-return | Tampering | RPC rejects `p_editor_type != 'svg'` with RAISE EXCEPTION |
| XSS via SVG content in slide design_json | Tampering | SVG written to DB unescaped; DOMPurify boundary is at render time in FabricSvgEditor (pre-existing pattern — consistent with how Phase 172 handles it) |
| SQL injection via `p_step` in dynamic SQL | Tampering | Add explicit allowlist validation at top of `update_onboarding_step` before the EXECUTE USING block |
| Tour firing for wrong user (shared session) | Info Disclosure | Tour state is DB-backed per `auth.uid()` — cross-user contamination not possible |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: src/components/OnboardingWizard.jsx] — StepContent shape, STEP_ICONS map, handleCompleteStep, handleSkip, wizard modal chrome (lines 41-529)
- [VERIFIED: src/services/onboardingService.js] — ONBOARDING_STEPS array (6 entries), getOnboardingProgress mapper, update_onboarding_step call (lines 30-259)
- [VERIFIED: src/services/sceneDesignService.js:548-553] — getDefaultDesign() return value
- [VERIFIED: src/services/marketplaceService.js:632-636] — applyStarterPack pattern (blueprint for applyTemplateToActiveSlide)
- [VERIFIED: supabase/migrations/034_tenant_lifecycle_and_onboarding.sql:516-662] — get_onboarding_progress, update_onboarding_step, skip_onboarding exact bodies
- [VERIFIED: supabase/migrations/170_clone_svg_template_to_scene.sql] — auth preamble, template access, SVG resolution pattern (blueprint for new RPC)
- [VERIFIED: supabase/migrations/173_apply_starter_pack.sql] — bulk-apply RPC pattern, auth preamble, super_admin bypass
- [VERIFIED: src/App.jsx:162,549,967] — currentPage state string, pages dict lookup, 'templates' key maps to TemplateGalleryPage
- [VERIFIED: src/router/AppRouter.jsx] — /app/* is a single BrowserRouter route, no sub-routes
- [VERIFIED: src/pages/TemplateGalleryPage.jsx:26,152] — useSearchParams() from react-router, searchParams.get('editorReturn') pattern
- [VERIFIED: src/pages/SceneEditorPage.jsx:527] — AI panel toggle button at line 527 (insertion point for Browse Templates button)
- [VERIFIED: npm view driver.js] — version 1.4.0, published 2025-11-18
- [CITED: Context7 /websites/driverjs] — driver.js v1.4.0 API: steps config, lifecycle hooks (onDestroyStarted), popover side/align, CSS import requirement

### Secondary (MEDIUM confidence)
- [VERIFIED: tests/e2e/onboarding.spec.js] — existing test structure and loginAndPrepare pattern
- [VERIFIED: tests/e2e/preview-apply.spec.js] — fiber-BFS currentPage read pattern, gotoTemplates helper shape, structural assertion approach
- [VERIFIED: tests/unit/services/onboardingService.test.js] — `ONBOARDING_STEPS.length === 6` assertion (will flip to 7)
- [VERIFIED: tests/unit/services/marketplaceService.test.js] — supabase mock pattern for new applyTemplateToActiveSlide test

### Tertiary (LOW confidence)
- None — all critical claims verified via codebase or official sources.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The two-step navigate pattern (`useNavigate` for URL params + `onNavigate` for page key) correctly causes `useSearchParams()` in TemplateGalleryPage to see the new params after remount | Pattern 1 | editorReturn mode won't activate; TEDR-03 fails |
| A2 | `onDestroyStarted` fires for ALL driver.js exit paths including Escape key | Pattern 6 | Tour might not be marked seen on Escape-dismiss |
| A3 | `window.history.pushState` does NOT update react-router's internal location (justifying the `useNavigate` approach over pushState) | Pitfall 1 | If pushState does work, simpler code is possible |

**Note on A1 and A3:** The react-router BrowserRouter context maintains location state. `useNavigate()` is the documented, supported way to update it. Using it before the `setCurrentPage` call should cause `TemplateGalleryPage`'s `useSearchParams()` to initialize from the correct URL on mount. This is HIGH confidence based on how react-router works, tagged ASSUMED because it hasn't been verified with an actual runtime test in this specific app.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — driver.js version verified from npm registry; all other libs are existing project deps
- Architecture: HIGH — all integration points verified by reading actual source files
- PL/pgSQL RPC: HIGH — concrete template derived from verbatim migration 170 and 173 body reading
- driver.js API: HIGH — verified via Context7 documentation lookup
- URL routing mechanism: HIGH/ASSUMED — App.jsx and react-router setup verified; the two-step pattern is ASSUMED correct but not runtime-tested in this session

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable stack — driver.js, Supabase, React Router all stable)
