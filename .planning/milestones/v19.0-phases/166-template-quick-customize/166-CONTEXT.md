# Phase 166: Template Quick Customize - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a QuickCustomizePanel to the template flow, allowing users to customize brand colors, logo, and text overrides on a template before creating a scene — without entering the full Polotno/SVG editor. The panel replaces TemplatePreviewModal content when the user clicks "Customize", and produces a new scene on Apply.

</domain>

<decisions>
## Implementation Decisions

### Panel Entry & Placement
- **D-01:** QuickCustomizePanel is accessible from TemplatePreviewModal via a new "Customize" button alongside the existing "Install" button
- **D-02:** Clicking "Customize" replaces the preview modal content with the customization panel (same modal shell, new content). A back button returns to the preview view
- **D-03:** No other entry points (no inline card buttons, no dedicated route)

### Live Preview
- **D-04:** Live preview uses in-browser SVG re-rendering — parse template SVG, find color/text/image nodes, swap values in-memory, re-render inline
- **D-05:** Preview layout is stacked: SVG preview on top (~60% height), scrollable controls below, within the existing modal dimensions

### Brand Color Controls
- **D-06:** Auto-detect dominant colors from the template SVG (parse fills/strokes), present as editable color swatches
- **D-07:** Each swatch opens a color picker; all SVG nodes matching that color update on change

### Logo Customization
- **D-08:** Upload-only logo handling — simple file upload button (PNG, JPG, SVG accepted)
- **D-09:** Uploaded logo replaces a designated placeholder area in the template SVG
- **D-10:** Show current logo thumbnail with Upload and Remove actions

### Text Overrides
- **D-11:** Auto-detect text nodes from SVG, present each as a labeled input field
- **D-12:** Field labels derived from text content or nearby element IDs
- **D-13:** Text fields update the SVG preview on change

### Apply & Scene Creation
- **D-14:** "Apply & Create" creates a new scene with the customized SVG, shows a success toast, and closes the modal (user stays on marketplace)
- **D-15:** Scene auto-named from template name (matches existing installTemplateAsScene() behavior)
- **D-16:** Reuses/extends installTemplateAsScene() with customization data

### Claude's Discretion
- Color picker component choice (native, custom, or existing design system picker)
- SVG parsing strategy for detecting color nodes, text nodes, and logo placeholder
- Loading/error states within the customize panel
- Exact modal transition animation between preview and customize views

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Template Flow
- `src/pages/TemplateMarketplacePage.jsx` — Marketplace page where users browse templates
- `src/pages/SvgTemplateGalleryPage.jsx` — SVG template gallery with filter/search
- `src/components/TemplatePreviewModal.jsx` — Current preview modal (QuickCustomizePanel replaces its content)
- `src/services/marketplaceService.js` — installTemplateAsScene(), fetchTemplateDetail(), template CRUD

### SVG Editor (reference patterns)
- `src/components/svg-editor/FabricSvgEditor.jsx` — Existing SVG editor with panel architecture
- `src/components/svg-editor/PropertiesPanel.jsx` — Color/property editing patterns
- `src/services/svgTemplateService.js` — SVG template fetching, user designs

### Design System
- `src/design-system/index.js` — Card, Button, Badge, Modal components
- `src/design-system/components/Modal.jsx` — Modal shell to extend

### Requirements
- `.planning/REQUIREMENTS.md` — CONT-01 (quick-customize requirement)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TemplatePreviewModal` — Modal shell and template detail loading; QuickCustomizePanel will share this modal
- `installTemplateAsScene()` in marketplaceService — existing scene creation from template; extend with customization payload
- Design system `Modal`, `Button`, `Card` components — consistent UI patterns
- `ImageUploadButton` component — potential reuse for logo upload

### Established Patterns
- Template flow: browse marketplace → preview modal → action (install). QuickCustomizePanel adds a customization step before the action
- SVG editor panels use a left sidebar panel pattern (LayersPanel, PropertiesPanel) — QuickCustomizePanel is simpler but can reference these for interaction patterns
- Color editing exists in PropertiesPanel — color picker patterns available for reference

### Integration Points
- QuickCustomizePanel renders inside TemplatePreviewModal (replaces content on "Customize" click)
- Calls installTemplateAsScene() with customization data on Apply
- SVG template data comes from fetchTemplateDetail() (already loaded in preview modal)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for SVG parsing, color detection, and text node extraction.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 166-template-quick-customize*
*Context gathered: 2026-04-11*
