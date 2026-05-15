# Phase 172: Preview + Apply Flow - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a full-screen `TemplatePreviewModal` launched from `TemplateGalleryPage` card clicks, with integrated QuickCustomizePanel (SVG only), prev/next navigation across filtered results, race-safe atomic Apply, and complete removal of `sessionStorage` from the gallery → editor handoff path. Covers TPRV-01..06.

Not in this phase:
- Polotno in-preview customization (TPRV-F1 deferred to v20.1)
- Scene-editor entry points back into gallery (Phase 174)
- Starter packs or favorites (Phase 173)
- Onboarding flow integration (Phase 174)

</domain>

<decisions>
## Implementation Decisions

### Modal Anatomy
- **D-01:** Full-screen modal with **split view** layout on desktop/tablet — preview on the left (~65%), sticky QuickCustomizePanel on the right (~35%). Both visible at all times so live SVG updates (TPRV-03) are immediate while the user edits.
- **D-02:** On narrow screens (<~768px) the split **stacks vertically** — preview pinned to the top, QuickCustomizePanel scrolls beneath it, Apply CTA sticky at the bottom. No drawer/tabs variant on mobile; keeping live-preview feedback on every form factor.
- **D-03:** Prev/next template navigation uses **on-screen arrow buttons flanking the preview AND Left/Right keyboard shortcuts**. Arrow keys are bound only while the modal is open and no input is focused.
- **D-04:** Prev/next template switches **discard pending customize edits silently** and reset the panel to the new template's defaults. No confirmation dialog. Rationale: browsing templates is a context switch — edits are not "saved work" until Apply is clicked.

### Polotno Preview Handling
- **D-05:** Clicking a Polotno template card opens the **same full-screen preview modal** as SVG templates. The right-hand panel is replaced with an informational block ("This template is customized in the editor after applying") + the Apply button. Consistent browsing UX across mixed editor_types (TPRV-01 prev/next works uniformly).
- **D-06:** The modal's preview image for Polotno templates is the **static `thumbnail` column from `gallery_templates`**. No Polotno runtime is mounted inside the modal — keeps bundle small and prev/next snappy.
- **D-07:** Prev/next is **unified** — cycles through the filtered result set in display order regardless of `editor_type`. The right-panel swaps between QuickCustomizePanel and the Polotno info block as the user navigates.
- **D-08:** Apply CTA label and position is **identical across editor_types**: "Apply to new scene". Routing difference (FabricSvgEditor vs Polotno editor) is invisible to the user — matches TPRV-04 one-click requirement.

### Apply Architecture (Race-Safe)
- **D-09:** Create a **new dedicated RPC `clone_template_with_customization`** (PL/pgSQL, single transaction). Signature: `(p_template_id UUID, p_scene_name TEXT, p_customized_svg TEXT) RETURNS UUID` (new scene ID). Leaves existing `clone_template_to_scene` untouched for non-customized callers (e.g., Polotno path, future callers). Closes the clone-then-patch race that TPRV-05 targets in `marketplaceService.installWithCustomization` (src/services/marketplaceService.js:209).
- **D-10:** Payload = **final serialized SVG string**. Client runs `svgCustomizeService` (parse → swap colors → replace logo → update text → serialize) and sends the finished SVG to the RPC. Server is a dumb persistor — it writes `design_json.svgContent = p_customized_svg` inside the same transaction as the row clone. No re-implementation of SVG mutation in SQL.
- **D-11:** Client service layer **dispatches to the correct RPC by `editor_type`**:
  - `editor_type = 'svg'` → `clone_template_with_customization(templateId, sceneName, customizedSvg)`
  - `editor_type = 'polotno'` → existing `clone_template_to_scene(templateId, sceneName)` (no patch)
  A single dispatch point in `templateGalleryService` (or new `templateApplyService`) — planner to decide file placement.
- **D-12:** Gallery → editor handoff uses **URL params, sceneId only**. Apply RPC returns new sceneId; client navigates via app's `onNavigate` pageMap:
  - SVG → `svg-editor?sceneId=${sceneId}` (new branch added to `SvgEditorPage`, resolves OQ-2)
  - Polotno → `scene-editor-${sceneId}` (existing route; resolves OQ-1)
  No template data in URL — clean, shareable, refresh-safe.
- **D-15 (added 2026-04-21 after research):** `SvgEditorPage` gains a new `?sceneId=...` load branch that fetches the scene + first slide, reads `slide.design_json.svgContent`, and initializes FabricSvgEditor with that SVG. Existing `?designId=...` branch is retained (it serves pre-existing svg_designs). The new RPC writes only a `scenes` row + `scene_slides` rows — no companion `svg_designs` row.
- **D-16 (added 2026-04-21 after research):** Polotno apply navigates to `scene-editor-${sceneId}`. Rendering fidelity of Polotno `design_json` inside `SceneEditorPage`'s block editor is **explicitly out-of-scope for this phase** — `SceneEditorPage` does not mount `PolotnoEditor` (PolotnoEditor is only in `DesignEditorPage`). This is a pre-existing gap. Phase 172 success criteria: Polotno apply completes atomically, scene row is created, navigation lands on scene-editor. Faithful Polotno rendering in scene editor is a Phase 174 follow-up.
- **D-17 (added 2026-04-21 after research):** Client-side SVG sanitization with `dompurify@3.3.3` (already installed, zero current consumers in `src/`) is **mandatory** before the customized SVG is sent to the RPC. The RPC is a dumb persistor per D-10 — it writes `p_customized_svg` verbatim. Phase 172 becomes the first consumer of dompurify. Sanitize with an SVG-profile config that preserves `data-customize-*` attributes.
- **D-13:** Apply-failure UX: **inline toast + keep modal open**. Preserves all customize state so the user can retry. Atomic RPC guarantees nothing is partially written on failure. Apply button re-enables after the toast. No auto-retry.
- **D-14:** **`SvgEditorPage.jsx:86` sessionStorage read-branch is fully removed** this phase. TPRV-06 mandates it, and it is now dead code — editor only needs to load a scene by ID (customized design_json is pre-written by D-09). The `sessionStorage.getItem('pendingTemplate')` and `removeItem` calls are deleted along with their surrounding branch. Any other gallery-side writers of `pendingTemplate` must be located and removed in the same plan (audit step).

### Claude's Discretion
- Exact split-view pixel proportions and breakpoints (D-01, D-02)
- Keyboard shortcut handling implementation (focus-trap interaction, escape-to-close vs escape-to-cancel-edit)
- QuickCustomizePanel internal layout (grouping of Colors / Logo / Text sections, control choices per field)
- Customize defaults — whether to auto-prefill from `brandThemeService` or start with template defaults (user deferred this area; recommended: auto-prefill brand colors + offer explicit "Clear" on each color control)
- Scene naming behavior (auto-derived `"<template.name> scene"` vs prompt) — follow existing `installTemplateAsScene` convention unless research finds otherwise
- `use_count` increment timing on Apply (deferred to Phase 175 per Phase 170 `<deferred>` and v20.0 research)
- `TemplatePreviewModal` file path and component boundary (recommended: `src/components/template-gallery/TemplatePreviewModal.jsx`)
- New RPC migration number (next available after 111)
- Whether Polotno route is `/scene-editor/:sceneId` or another pattern — verify in codebase scout during planning

### Folded Todos
None — no cross-referenced todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Preview + Apply Flow (TPRV-01..06) — acceptance criteria
- `.planning/REQUIREMENTS.md` §Out-of-scope (TPRV-F1) — Polotno in-preview customize deferred
- `.planning/ROADMAP.md` §Phase 172 (lines 270-285) — goal, success criteria, dependencies

### Prior Phase Context (read both)
- `.planning/phases/171-core-gallery-ui-redesign/171-CONTEXT.md` — gallery UI decisions (modal is launched from this page; `TemplateCard.onSelect` is the wired entry point)
- `.planning/milestones/v20.0-phases/170-data-layer-foundation/170-CONTEXT.md` — VIEW/schema including `editor_type` discriminator (D-03 there), service conventions, `templateGalleryService`

### v20.0 Research Synthesis
- `.planning/research/SUMMARY.md` §Preview + Apply — Phase 172 deliverables, routing by `editor_type`
- `.planning/research/PITFALLS.md` §Pitfall (clone-then-patch race) — the exact race TPRV-05 must close
- `.planning/research/ARCHITECTURE.md` — component/RPC integration map

### Existing Source (to modify or read)
- `src/pages/TemplateGalleryPage.jsx:557-559` — TemplateCard `onSelect` placeholder for Phase 172 modal-open hook
- `src/services/marketplaceService.js:192-200` — `installTemplateAsScene` (reused for Polotno path, no change)
- `src/services/marketplaceService.js:209-237` — `installWithCustomization` (non-atomic; replaced by RPC call or retained as thin wrapper over the new RPC)
- `src/services/svgCustomizeService.js` — SVG mutation primitives: `parseSvgForCustomize`, `extractColors`, `extractTextNodes`, `findLogoElement`, `swapColor`, `updateText`, `replaceLogo`, `serializeSvg` — QuickCustomizePanel builds on these
- `src/services/templateGalleryService.js` — gallery data source (Phase 170 output); may host the Apply dispatcher
- `src/services/brandThemeService.js` — source for optional brand-color prefill
- `src/pages/SvgEditorPage.jsx:83-118` — sessionStorage branch to be deleted (TPRV-06, D-14)
- `src/components/svg-editor/FabricSvgEditor.jsx` — SVG editor component (the `editor_type='svg'` destination)
- `src/components/PolotnoEditor.jsx` — Polotno editor component (the `editor_type='polotno'` destination)
- `src/components/layout-editor/LayoutPreviewModal.jsx` — existing full-screen preview modal to mine for patterns (split layout, close handling, keyboard bindings)
- `src/design-system/index.js` — Modal, Button, Badge, PageTransition — already-exported primitives for TemplatePreviewModal composition

### Migrations
- `supabase/migrations/` (check for highest-numbered migration file at plan time) — new migration adds `clone_template_with_customization` RPC. No schema changes required.
- Existing reference: `clone_template_to_scene` RPC definition — find in `supabase/migrations/` history; new RPC should mirror its pattern (RETURNS UUID scene_id, SECURITY DEFINER or INVOKER consistent with existing).

### Design System
- `src/design-system/index.js` §Modal / Button / Badge — primitives used to compose TemplatePreviewModal

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `svgCustomizeService.js` mutation primitives — QuickCustomizePanel builds on these; no re-implementation needed
- `clone_template_to_scene` RPC — Polotno apply path and template for the new atomic RPC
- `LayoutPreviewModal.jsx` — existing full-screen modal pattern in this codebase; mine for close-handling, keyboard, split-layout composition
- `gallery_templates` VIEW — already exposes `editor_type`, `svg_content`, `design_json`, `thumbnail`, `width`, `height` needed by the modal (no new fetches required)
- Design-system primitives (Modal, Button, Badge, motion wrappers) — compose the modal chrome

### Established Patterns
- Services are pure JS modules, named exports, thin supabase wrapper — new Apply dispatcher follows this
- RPCs return primitive types (`RETURNS UUID`) — new RPC mirrors this
- Migrations numbered sequentially, no DOWN, idempotent guards
- Modal components live under `src/components/<domain>/` — new `TemplatePreviewModal.jsx` fits this convention

### Integration Points
- `TemplateGalleryPage.jsx` card `onSelect` — hook the modal open here
- `SvgEditorPage.jsx` — remove sessionStorage branch (D-14)
- New migration — adds `clone_template_with_customization` RPC
- `marketplaceService.installWithCustomization` — either rewritten to call the new RPC, or deprecated with the dispatcher living in `templateGalleryService` / new `templateApplyService` (planner decides)

### Creative Options Enabled
- `editor_type` discriminator (set up in Phase 170 D-03) lets the client dispatcher pick the right RPC with zero schema changes
- Because `design_json.svgContent` is pre-written atomically by the new RPC, the editor does not need to re-customize on load — purely a reader, simpler contract

</code_context>

<specifics>
## Specific Ideas

- User invoked manually after Phase 171 completion (8406d8fd) — fresh context, no `--chain` or `--auto`. Discussion is interactive; plan/execute are separate commands.
- "Customize defaults" was offered as a gray area but the user opted to skip it; left for Claude's discretion with a suggested default (brand-color prefill + per-control Clear) — planner may revisit during discuss-with-user if ambiguity surfaces.

</specifics>

<deferred>
## Deferred Ideas

- **Polotno in-preview QuickCustomize** — TPRV-F1 explicitly deferred to v20.1; no scope creep attempted.
- **`use_count` increment on Apply** — deferred to Phase 175 per Phase 170 CONTEXT and v20.0 research.
- **Scene-editor → gallery entry point** — Phase 174.
- **Starter packs / favorites integration in preview modal** — Phase 173.

### Reviewed Todos (not folded)
None reviewed — todo cross-reference returned no matches.

</deferred>

---

*Phase: 172-preview-apply-flow*
*Context gathered: 2026-04-20*
