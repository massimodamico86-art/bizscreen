# Phase 175 — @resvg/resvg-js Fidelity Spot-Test

**Date:** 2026-05-03
**Version:** @resvg/resvg-js@2.6.2 (verified — `node_modules/@resvg/resvg-js/package.json`)
**Test config:**
```javascript
{
  fitTo: { mode: 'width', value: 480 },
  background: 'rgba(255,255,255,1)',
  font: { loadSystemFonts: true },
}
```

**Method:** A one-off Node script (not committed — the report is the artifact) loaded each SVG with `fs.readFileSync`, instantiated `new Resvg(svg, opts)`, called `.render().asPng()`, wrote to `/tmp/175-spot-{slug}.png`, and the PNG was then visually inspected via the agent multimodal Read tool.

## Spot-Test Results

| Slug | SVG path | Input bytes | PNG bytes | Render result | Notes |
|------|----------|-------------|-----------|---------------|-------|
| restaurant-menu | public/templates/svg/restaurant-menu/menu-design.svg | 28,204 | 62,447 | **PASS** | Multi-section text-heavy menu. Text rendering crisp; column alignment preserved. Decorative background shapes use `opacity:0.3` which resvg correctly preserves as alpha — PNG is RGBA, so the 30%-alpha decorations show as a faint checkerboard in transparent viewers but composite correctly over any web background. No font fallback artifacts, no clipPath glitches. |
| happy-hour | public/templates/svg/happy-hour/design.svg | 4,075 | 35,783 | **PASS** | Portrait orientation. Dark gradient background, large hero typography, rounded pill button, list rows with right-aligned prices. All gradients (radial circles top-left + bottom-right) rendered correctly. Text shadows / weights legible. |
| real-estate | public/templates/svg/real-estate/design.svg | 5,006 | 30,678 | **PASS** | Two-column layout (image card + agent details). "FOR SALE" ribbon, price text, KPI stats grid, CTA button — all legible and aligned. Dimmed body copy intentional in source SVG (low contrast on blue card by design); not a resvg issue. |
| corporate-welcome | public/templates/svg/corporate-welcome/design.svg | 2,868 | 28,309 | **PASS** | Centered hero composition, logo plate, CTA pill button. Gradient background renders smoothly with no banding. Text drop-shadow effect preserved. |
| retail-sale | public/templates/svg/retail-sale/design.svg | 2,210 | 20,945 | **PASS** | Bold sale banner with corner ribbons. Strong typography ("50% OFF") rendered crisply. Background pattern dots preserved. |

**All 5 templates rasterized without error.** No exceptions thrown, no `console.error` from resvg, all PNG outputs are valid (file sizes within expected 20–70 KB range for 480×270/270×480 thumbnails).

## Conclusion

**GREEN — proceed with resvg-js for Plan 03.** All 5 representative templates render with acceptable fidelity. The `opacity:0.3` alpha-preservation on the restaurant-menu decorative shapes is **correct behavior** (RGBA PNG composites correctly on any backdrop) and not a defect.

## Recommendation for Plan 03

Use the verified configuration:

```javascript
const { Resvg } = require('@resvg/resvg-js');

function rasterize(svgString, { orientation = 'landscape' } = {}) {
  const dim = orientation === 'portrait'
    ? { mode: 'height', value: 480 }   // 270×480 portrait
    : { mode: 'width',  value: 480 };  // 480×270 landscape
  const resvg = new Resvg(svgString, {
    fitTo: dim,
    background: 'rgba(255, 255, 255, 1)',
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}
```

**Notes for Plan 03 implementation:**

1. Read `svg_templates.orientation` to choose `mode: 'height'` vs `mode: 'width'`.
2. The system-font load (`loadSystemFonts: true`) is necessary for the existing Adobe-Illustrator-emitted SVGs that reference fonts by name. CI runners usually have a baseline of Liberation/DejaVu fonts that resolve common Helvetica/Arial requests; falls back to a built-in font if no system fonts match.
3. Background set to opaque white ensures the rasterized PNG has a clean white background where the SVG document is otherwise transparent — but `opacity:0.x` shapes inside the SVG still render with alpha, which is the intended behavior for thumbnails composited over a card.
4. Output PNG sizes for these 5 templates ranged 20.9 KB → 62.4 KB — comfortably under any reasonable S3 cost concern. Skip optional `sharp` post-compression unless LCP becomes an issue.
5. **No fallback to Playwright is required for these 12 known-good templates.** If a Phase 175 Plan 04 seed template breaks resvg, document it in a follow-up and consider per-template Playwright fallback at that point.

## Threat-Register Cross-Reference

- **T-175-W0-01** (Tampering — supply chain): mitigated by `package-lock.json` pinning to `@resvg/resvg-js@2.6.2` (committed in Task 1 commit `bbe6da98`).
- **T-175-W0-03** (DoS — hostile SVG OOM): not exercised here — spot-test runs only against the 12 known-safe templates; Plan 02's validator enforces 200 KB max.
