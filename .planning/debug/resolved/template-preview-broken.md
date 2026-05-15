---
slug: template-preview-broken
status: resolved
trigger: Template preview modal is visually broken across all templates — customization panel overlaps preview content, text is clipped, layout is misaligned
created: 2026-05-03
updated: 2026-05-03
resolved_scope: layout_only
---

# Debug Session: template-preview-broken

## Symptoms

DATA_START
- **Expected behavior:** Template preview modal should render the template cleanly with the customization panel beside it (not overlapping). Text like "Welcome", company name, and visitor card should display in full with correct colors and fonts.
- **Actual behavior:**
  1. Customization panel (right sidebar) overlaps the template preview content
  2. "Welcome" heading is clipped to "Wel..." (cut off by the right panel)
  3. Visitor card containing "John Smith" is misaligned / cut off at the right edge
  4. Colors/fonts appear wrong — "Welcome" rendering in green, "COMPANY NAME" in blue when the template's defined Primary/Secondary/Accent colors don't match this output
- **Error messages:** None reported — visual issue only, no runtime errors mentioned
- **Timeline:** Just noticed (2026-05-03). Unclear if it ever worked correctly in this state.
- **Reproduction:** Navigate to Templates page → click any template card (e.g. "Welcome Display") → preview modal opens with broken layout
- **Scope:** Affects ALL templates, not just Welcome Display
- **Screenshots:** Two screenshots provided by user showing the templates list and the broken Welcome Display preview modal
DATA_END

## Current Focus

```yaml
hypothesis: Inline SVG keeps intrinsic 1920x1080 size; wrapper max-w-full does not propagate to SVG; CSS Grid auto-min tracks expand left cell to fit, pushing right panel over preview content
test: Inspect TemplatePreviewModal layout, SVG asset width attrs, global SVG CSS rules
expecting: SVG with explicit width="1920", no global svg{max-width:100%} rule, grid without min-w-0 on tracks
next_action: Apply fix — constrain inline SVG via descendant CSS, add min-w-0 to grid tracks
reasoning_checkpoint: null
tdd_checkpoint: null
```

## Evidence

- timestamp: 2026-05-03 / file: src/components/template-gallery/TemplatePreviewModal.jsx:241-277
  finding: Modal split-view uses CSS Grid `grid-cols-[65fr_35fr]`. Left cell renders sanitized SVG via `dangerouslySetInnerHTML` inside a wrapper `<div className="max-w-full max-h-full ...">`. The SVG element itself receives no CSS sizing.

- timestamp: 2026-05-03 / file: public/templates/svg/welcome-sign/design.svg:2 (and 99/115 templates)
  finding: All template SVGs have explicit `width="1920" height="1080"` attributes. When inlined into HTML, these attributes drive the rendered intrinsic size. CSS `max-width: 100%` on a wrapper does NOT cascade onto the SVG child unless explicitly applied.

- timestamp: 2026-05-03 / file: src/index.css:170-175
  finding: Global CSS reset only constrains `img, video { max-width: 100%; height: auto; display: block; }`. There is no equivalent rule for `svg`. Hence inlined SVGs keep their native pixel dimensions.

- timestamp: 2026-05-03 / file: src/design-system/components/TemplateCard.jsx:72-74
  finding: Cards in the gallery list render the preview via `<img src={imageUrl}>` (a thumbnail), so the global `img { max-width: 100% }` rule constrains them — explaining why the list view looks fine but the modal does not.

- timestamp: 2026-05-03 / file: src/components/template-gallery/TemplatePreviewModal.jsx:241
  finding: Grid track sizing uses `[65fr_35fr]` with the default `auto` minimum (`minmax(auto, 1fr)`). With a 1920px-wide SVG inside the left cell, the track's auto-min floor expands to fit content, pushing the right track or causing overflow despite the parent's `overflow-hidden`. No `min-w-0` is set on the grid tracks.

- timestamp: 2026-05-03 / inference: color/font mismatch (symptom #4)
  finding: This is a downstream visual artifact of the layout breakage — the rendered SVG's "header gradient" (dark blue) and brand color block (gray-blue) overflow into the right panel area where the white sidebar background covers them, creating the illusion that "Welcome" is green (sample bleed from header gradient + sidebar overlay) and "COMPANY NAME" is blue. Once layout is fixed, colors will render correctly. No template metadata is being mis-applied.

## Eliminated

- Customization panel positioning bug — the panel uses normal flex/grid layout (`flex flex-col`), no absolute/fixed positioning, no z-index abuse. Panel sits in a proper grid sibling cell.
- Modal component itself — `Modal.jsx` size="full" gives `max-w-[calc(100vw-2rem)]` and proper portal rendering. Working as designed.
- DOMPurify stripping critical attributes — `USE_PROFILES: { svg: true, svgFilters: true }` preserves `width`/`height` (which is precisely the problem here, not a sanitization bug).
- Brand-theme color mis-application — colorValues prefill in `QuickCustomizePanel` only swaps colors that are explicitly customizable; the visual color mismatch is a side effect of overflow, not a swap bug.

## Resolution

```yaml
root_cause: |
  Inlined template SVGs (rendered via dangerouslySetInnerHTML inside the
  TemplatePreviewModal left grid cell) carry explicit width="1920" height="1080"
  attributes. The wrapper div's `max-w-full max-h-full` only sizes the wrapper,
  not the SVG child. There is no global `svg { max-width: 100% }` rule (only
  `img, video` are constrained in src/index.css:170-175). Combined with CSS Grid
  tracks that default to `minmax(auto, 1fr)` (no `min-w-0`), the left cell expands
  to fit the 1920px content. The result is the SVG renders at native size and
  overflows the cell, while the right customization panel sits on top of the
  bleed — producing the observed clipping of "Welcome", "John Smith" card
  cut-off, and apparent color/font mismatch.
fix: |
  Two-part CSS fix in src/components/template-gallery/TemplatePreviewModal.jsx:
  1. Add `min-w-0 min-h-0` to both grid track children so they can shrink below
     their intrinsic content size (CSS Grid track-sizing override).
  2. Use Tailwind arbitrary descendant variant on the SVG wrapper to force the
     inlined SVG to fit: `[&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto`.
verification: |
  Visual inspection — preview modal should now show:
  - "Welcome" heading rendered in full (no clipping)
  - Visitor card "John Smith" fully visible inside left preview pane
  - Right customization panel sitting cleanly to the right (no overlap)
  - Template colors/fonts matching the SVG's declared values
  Test command: `npm run dev` → navigate to /templates → click any template.
files_changed:
  - src/components/template-gallery/TemplatePreviewModal.jsx
known_followups: |
  Visual verification on 2026-05-03 confirmed layout fix works: customization
  panel sits cleanly to the right, "Welcome" heading no longer clipped, visitor
  card fully contained. HOWEVER, the original session's inference that color
  mismatches were a downstream artifact of layout overflow turned out to be
  WRONG. With layout fixed, the colors are still wrong: "Welcome" renders in
  green (Accent), "COMPANY NAME" in blue (Primary), visitor card text is faint
  blue on blue (illegible), footer text is blue on green (illegible). This is
  a separate bug in how QuickCustomizePanel's color customization maps onto
  SVG elements. Spinning up a new debug session: `template-preview-colors`.
```
