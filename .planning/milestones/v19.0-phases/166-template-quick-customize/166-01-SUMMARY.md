---
phase: 166-template-quick-customize
plan: "01"
subsystem: services
tags: [svg, customization, parsing, unit-tests, xss-prevention]
dependency_graph:
  requires: []
  provides: [svgCustomizeService]
  affects: [QuickCustomizePanel]
tech_stack:
  added: []
  patterns: [DOMParser, XMLSerializer, textContent-XSS-safe]
key_files:
  created:
    - src/services/svgCustomizeService.js
    - tests/unit/services/svgCustomize.test.js
  modified: []
decisions:
  - "Used textContent (not innerHTML) for updateText() to prevent XSS in SVG text nodes (T-166-01)"
  - "Canvas-based named color resolution with jsdom fallback to rgb() parsing only"
  - "Added xmlns:xlink namespace to test fixture SVG to satisfy strict DOMParser namespace handling"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-12"
  tasks: 1
  files: 2
requirements:
  - CONT-01
---

# Phase 166 Plan 01: SVG Customize Service Summary

SVG in-browser mutation service with 9 exported helpers: normalizeColor, parseSvgForCustomize, extractColors, extractTextNodes, findLogoElement, swapColor, updateText (textContent-safe, XSS-prevented), replaceLogo (dual href/xlink:href), serializeSvg — all covered by 45 passing unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create svgCustomizeService.js with SVG mutation helpers | b5941571 | src/services/svgCustomizeService.js, tests/unit/services/svgCustomize.test.js |

## Decisions Made

1. **textContent over innerHTML** — `updateText()` uses `element.textContent = newText` exclusively. This prevents XSS via injected script tags when user text flows into SVG text nodes (threat T-166-01 mitigated).

2. **Canvas color resolution with fallback** — `normalizeColor()` attempts canvas-based named-color resolution in browser runtime. In jsdom (test environment), canvas `getContext('2d')` returns null, so the function falls through to direct rgb() parsing and hex lowercasing. Named colors like `'red'` return as-is in test environments (not converted to hex), but hex and rgb() always normalize correctly.

3. **xlink namespace in test fixture** — jsdom's `DOMParser` in `image/svg+xml` mode is strict about namespace prefixes. The `xlink:href` attribute requires `xmlns:xlink="http://www.w3.org/1999/xlink"` declared on the root `<svg>` element, otherwise parsing fails with "Invalid SVG content".

4. **Dual setAttribute for logo replacement** — `replaceLogo()` sets both `href` (SVG 2.0) and `xlink:href` (SVG 1.1) on the image element to ensure compatibility across rendering engines (browser, WebOS, Tizen, Android WebView).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added xmlns:xlink to test SVG fixture**
- **Found during:** Task 1 (GREEN phase — tests failing after initial implementation)
- **Issue:** Test fixture `TEST_SVG` used `xlink:href` without declaring the xlink namespace. jsdom's `DOMParser` threw "Invalid SVG content" because the `xmlns:xlink` prefix was undeclared, causing `doc.querySelector('svg')` to return null.
- **Fix:** Added `xmlns:xlink="http://www.w3.org/1999/xlink"` to the root `<svg>` element in the test fixture.
- **Files modified:** tests/unit/services/svgCustomize.test.js
- **Commit:** b5941571 (included in same commit — test-only change to fixture)

## Known Stubs

None. All functions are fully implemented with real DOM operations.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary surfaces introduced. The service operates entirely in-browser memory on already-parsed DOM documents.

## Self-Check: PASSED

- FOUND: src/services/svgCustomizeService.js
- FOUND: tests/unit/services/svgCustomize.test.js
- FOUND: commit b5941571
- 45/45 tests pass (`npx vitest run tests/unit/services/svgCustomize.test.js`)
