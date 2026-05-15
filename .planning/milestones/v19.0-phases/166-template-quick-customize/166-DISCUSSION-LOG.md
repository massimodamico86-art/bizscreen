# Phase 166: Template Quick Customize - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 166-template-quick-customize
**Areas discussed:** Panel entry & placement, Live preview approach, Brand customization controls, Apply & scene creation

---

## Panel Entry & Placement

### Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| From TemplatePreviewModal | Add 'Customize' button alongside 'Install' in preview modal | ✓ |
| Inline on marketplace cards | Add customize icon on each template card in grid | |
| Both preview modal and cards | Accessible from both locations | |

**User's choice:** From TemplatePreviewModal
**Notes:** Single entry point, natural flow from browse → preview → customize.

### Panel Type

| Option | Description | Selected |
|--------|-------------|----------|
| Replace preview modal content | Modal transitions to show customization controls, back button returns to preview | ✓ |
| Slide-out drawer | Right-side drawer slides out over the page | |
| New full-page route | Navigate to /templates/:id/customize | |

**User's choice:** Replace preview modal content
**Notes:** Single modal shell, no extra layers.

---

## Live Preview Approach

### Update Method

| Option | Description | Selected |
|--------|-------------|----------|
| SVG re-render in browser | Parse SVG, find nodes, swap values in-memory, re-render inline | ✓ |
| Canvas thumbnail re-render | Use fabric.js to render on canvas, apply changes | |
| Static mockup with swatches | Show original thumbnail with color swatches alongside | |

**User's choice:** SVG re-render in browser
**Notes:** Fast, no server round-trips, works because templates are SVG-based.

### Preview Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Preview on top, controls below | Stacked layout, preview ~60% height, scrollable controls below | ✓ |
| Side by side | Preview left, controls right, needs wider modal | |

**User's choice:** Preview on top, controls below
**Notes:** Works well within existing modal width.

---

## Brand Customization Controls

### Color Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect template colors | Parse SVG fills/strokes, present dominant colors as editable swatches | ✓ |
| Fixed brand color slots | Always show Primary/Secondary/Accent, requires template metadata | |
| Full palette editor | Show all unique colors as grid, click to change any | |

**User's choice:** Auto-detect template colors
**Notes:** Adapts to any template automatically, no metadata requirements.

### Logo Customization

| Option | Description | Selected |
|--------|-------------|----------|
| Upload only | Simple file upload, replaces placeholder in template | ✓ |
| Upload + media library | Upload or pick from existing media library | |
| You decide | Claude picks best approach | |

**User's choice:** Upload only
**Notes:** Minimal UI, covers the main use case.

### Text Overrides

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect text nodes | Parse SVG for text elements, show as labeled input fields | ✓ |
| Single rich text area | One text area, system maps to slots | |
| You decide | Claude picks approach | |

**User's choice:** Auto-detect text nodes
**Notes:** Field labels from content or element IDs, updates preview on change.

---

## Apply & Scene Creation

### Apply Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Create scene and go to scenes list | Create scene, success toast, close modal, stay on marketplace | ✓ |
| Create scene and open in editor | Create scene then navigate to full editor | |
| Create scene with choice | Mini dialog: 'View in Scenes' or 'Open in Editor' | |

**User's choice:** Create scene and go to scenes list
**Notes:** Matches existing installTemplateAsScene() flow.

### Scene Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-name from template | Use template name as scene name | ✓ |
| Ask for name before creating | Show name input pre-filled with template name | |
| You decide | Claude picks simplest approach | |

**User's choice:** Auto-name from template
**Notes:** Matches current installTemplateAsScene() behavior.

---

## Claude's Discretion

- Color picker component choice
- SVG parsing strategy for nodes
- Loading/error states
- Modal transition animation

## Deferred Ideas

None — discussion stayed within phase scope.
