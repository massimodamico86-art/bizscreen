---
phase: 172-preview-apply-flow
plan: 04
subsystem: ui
tags: [ui, component, svg, customize, brand-theme, quick-customize-panel, tprv-02, tprv-03]

# Dependency graph
requires:
  - phase: 172-preview-apply-flow
    plan: 01
    provides: "tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx scaffold with 6 it.skip stubs + embedded TEST_SVG fixture"
  - phase: 166-svg-customize-service
    provides: "src/services/svgCustomizeService.js (8 helpers: parseSvgForCustomize, extractColors, extractTextNodes, findLogoElement, swapColor, updateText, replaceLogo, serializeSvg)"
provides:
  - "src/components/template-gallery/QuickCustomizePanel.jsx — SVG-only customize panel (Colors / Logo / Text sections)"
  - "Live onChange(serializedSvg) propagation on swatch-swap, text-blur, logo-upload, logo-remove"
  - "Brand-theme prefill (primary/secondary/accent) guarded by prefilledRef so it runs at most once"
  - "Empty-state fallback copy 'This template has no customizable elements.' (Pitfall 6)"
  - "All 6 Plan 01 scaffolded unit tests filled and passing green"
affects: [172-05]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — uses existing React, lucide-react, design-system, svgCustomizeService, brandThemeService
  patterns:
    - "Parse-once-per-template pattern: useEffect keyed to template.id parses svg_content into a docRef.current Document; extract*/swap*/replaceLogo mutate in place; serializeSvg emits on every commit"
    - "Debounced color swap: single useRef timer + setTimeout(50ms), cleared on each new change, so rapid native-color-picker onChange events coalesce into one onChange emit"
    - "Uncontrolled text input (defaultValue + onBlur) to avoid mid-word re-renders disrupting focus — matches UI-SPEC §Text Section"
    - "Brand-theme prefill guarded by a useRef boolean so it applies exactly once after getBrandTheme resolves (never retriggers on subsequent state changes)"
    - "Testable data-color attribute on every swatch — enables querySelector-based assertions without ARIA-label coupling"

key-files:
  created:
    - "/Users/massimodamico/bizscreen/src/components/template-gallery/QuickCustomizePanel.jsx"
  modified:
    - "/Users/massimodamico/bizscreen/tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx"

key-decisions:
  - "Split the component body into three local render helpers (ColorRow, LogoBlock, TextField) defined in the same file — keeps the top-level function under 250 lines and clarifies the per-section rendering contract"
  - "Added a data-color={currentHex} attribute to each swatch button so the brand-prefill test can target swatches via querySelector without ARIA-label coupling (the attribute also aids future E2E selectors)"
  - "Brand-theme prefill only calls swapColor on the first N swatch positions (min of extracted colors and COLOR_LABELS.length=3) — matches UI-SPEC 'Up to 3 color controls'"
  - "logo Remove link shows only when there IS a logo (template's logoEl, or an uploaded preview, or a brand logo_url) — avoids a dangling link when the SVG had no logo to begin with"
  - "File-input value is reset to '' after every selection so the user can re-upload the same file (standard HTML file-input idiom)"
  - "Empty-state early-return placed BEFORE the render body — no section headers render when the SVG has nothing customizable, so the fallback copy is the only thing the user sees"

patterns-established:
  - "QuickCustomizePanel is the reference pattern for any future per-editor_type right-pane panel (Polotno info-block will sit where this component lives in Plan 05)"
  - "Debounce-via-useRef + clearTimeout is the canonical idiom for this codebase when a native input fires rapid onChange events that must be coalesced before a heavy downstream effect"

requirements-completed: [TPRV-02, TPRV-03]
# Note: Plan 05 still has to mount this component inside TemplatePreviewModal
# to surface it in the user-facing flow. Both TPRV-02 (sections rendered) and
# TPRV-03 (live update propagation) are satisfied at the component level now.

# Metrics
duration: 4min
completed: 2026-04-21
---

# Phase 172 Plan 04: QuickCustomizePanel Summary

**SVG-only Colors / Logo / Text customize panel with brand-theme prefill, debounced color swap, onBlur text commit, and empty-state fallback — 6/6 unit tests green.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-21T20:28:50Z
- **Completed:** 2026-04-21T20:32:58Z
- **Tasks:** 2/2
- **Files created:** 1
- **Files modified:** 1
- **Commits:** 2 (one per task)

## Accomplishments

### Task 1 — QuickCustomizePanel.jsx (commit `be1de4e8`)

- Default-exported React function component at `src/components/template-gallery/QuickCustomizePanel.jsx` (419 lines).
- **Parse lifecycle:** `useEffect` keyed to `template.id` calls `parseSvgForCustomize(template.svg_content)`, stores the Document in `docRef.current`, runs `extractColors` / `extractTextNodes` / `findLogoElement` to populate `controls`, seeds `colorValues` / `textValues` with initial values, then emits `onChange(serializeSvg(doc))` so the parent preview has an initial SVG to render.
- **Brand-theme prefill:** Second `useEffect` calls `getBrandTheme()` once. Third `useEffect` fires when both `brandTheme` and `controls.colors` are ready, swapping up to 3 colors (primary/secondary/accent) onto the first, second, third extracted palette entries via `swapColor`. Guarded by `prefilledRef` so it runs at most once.
- **Colors section:** Up to 3 rows (Primary / Secondary / Accent labels). Each row has a 32×32 swatch button backed by a hidden native `<input type="color">` — user clicks the visible button, native picker opens, onChange fires. Debounced 50ms via a single `useRef` timer so rapid input events coalesce into one `swapColor` + `onChange` emit. Per-control "Clear" resets to the original extracted hex.
- **Logo section:** 64×64 preview cell (data-URL from upload, or `brandTheme.logo_url`, or a `LayoutTemplate` placeholder icon). "Upload logo" `Button variant="secondary" size="sm"` triggers a hidden `<input type="file" accept="image/*">`. 2MB cap enforced via `file.size > 2 * 1024 * 1024` check BEFORE reading. FileReader converts to data URL, then `replaceLogo(doc, dataUrl)` + `onChange`. "Remove logo" link (`aria-label="Remove logo"`) calls `replaceLogo(doc, null)` + `onChange`.
- **Text section:** Up to 4 uncontrolled `Input size="sm"` fields. `defaultValue` is the initial text; `onBlur` commits via `updateText(node.element, newText)` + `onChange`. Typing does not trigger `onChange` mid-word.
- **Empty-state fallback:** When `extractColors` + `extractTextNodes` + `findLogoElement` all return empty, renders exact copy `"This template has no customizable elements."` — no section headers.
- **Parse-error fallback:** If `parseSvgForCustomize` throws, renders `role="alert"` with the error message.
- **No framer-motion, no third-party color picker** — native picker only, per UI-SPEC.

### Task 2 — QuickCustomizePanel.test.jsx (commit `bd198ea5`)

- All 6 `it.skip` stubs replaced with real assertions. `grep -c "it.skip"` returns 0; `grep -Ec "^\s+(it|test)\("` returns 6.
- `svgCustomizeService` is NOT mocked — tests exercise the real DOM helpers against a minimal TEST_SVG fixture (one fill, one `<text id="headline">`, one `<image id="logo">`).
- `brandThemeService.getBrandTheme` is mocked; each test that cares about prefill overrides it via `mockResolvedValueOnce`.
- Test 1 (TPRV-02 copy): asserts headers "Colors", "Logo", "Text", plus "Upload logo" and the Remove logo `aria-label` are in the document.
- Test 2 (brand prefill): mocks `getBrandTheme` with `{ primary: #ff00ff, secondary: #00ffff, accent: #ffff00 }`, asserts it was called exactly once, waits for a `[data-color="#ff00ff"]` swatch to appear, verifies the latest `onChange` payload contains `#ff00ff`.
- Test 3 (TPRV-03 50ms debounce): fires a color `<input>` change; asserts `onChange` is NOT invoked synchronously; advances fake timers by 60ms; asserts `onChange` emitted a serialized SVG containing `#abcdef`.
- Test 4 (onBlur commit): fires 3 mid-typing change events — asserts `onChange` was NOT invoked; then blurs with the final value; asserts the committed text appears in the serialized SVG.
- Test 5 (empty state): renders a template with no extractable colors/texts/logo; asserts the exact fallback copy and that none of the three section headers render.
- Test 6 (Remove logo): clicks the Remove logo link; asserts `onChange` fires; asserts the emitted SVG no longer contains `href="old-logo.png"` or `xlink:href="old-logo.png"` (Pitfall-adjacent: confirms both attributes are cleared by `replaceLogo`).

**Run result:** `npx vitest run tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` → `6 passed / 6`, ~0.5–0.7s.

## Commits

| Task | Subject | Commit |
|------|---------|--------|
| 1 | `feat(172-04): add QuickCustomizePanel component` | `be1de4e8` |
| 2 | `test(172-04): fill QuickCustomizePanel unit tests — 6 green` | `bd198ea5` |

## Deviations from Plan

**None — plan executed exactly as written.**

Every concrete element the plan asked for (React signature, state shape, three sections, debounce constant, 2MB cap, `accept="image/*"`, `onBlur` text commits, empty-state copy, brand-prefill guard, no framer-motion, no third-party color picker) is present in the finished component. The internal render helpers (ColorRow / LogoBlock / TextField) were explicitly permitted by the plan ("split internal render helpers if it grows longer"), and `data-color` on each swatch was explicitly permitted ("if not already done, add a `data-color={currentHex}` prop to each swatch button for testability").

## Authentication gates

**None.** No auth-bearing operations in this plan — the component is pure client-side; `getBrandTheme` is mocked in tests and calls a Supabase RPC in production, but the panel never blocks on auth state.

## Hand-off to Plan 05 (TemplatePreviewModal)

**Mount contract — use verbatim:**

```jsx
<QuickCustomizePanel
  key={template.id}                    // required: forces remount on prev/next nav (Pitfall 3)
  template={template}                  // must have .id + .svg_content; optionally .name
  onChange={(serializedSvg) => setCustomizedSvg(serializedSvg)}
/>
```

**Prop contract notes:**

1. The component reads `template.svg_content` (snake_case), which matches the `gallery_templates` VIEW column name from Phase 170 migration 167. Plan 05 must pass rows directly from that VIEW without re-mapping.
2. The component emits `onChange` exactly once on initial mount (so the preview has a starting SVG), once after brand-theme prefill completes (if it actually changed colors), and once per subsequent user mutation. Plan 05's preview should render whatever the latest `onChange` payload is — no need to read `template.svg_content` separately.
3. Mount this panel ONLY when `template.editor_type === 'svg'`. For `editor_type === 'polotno'`, render the info-block per UI-SPEC §Layout Anatomy §Polotno variant instead (this component does not handle Polotno templates).
4. The panel handles all three fallbacks internally (parse error, empty state, no brand theme). Plan 05 does not need to duplicate any of them.

## Known Stubs

**None.** Every piece of visible UI is wired to live data or a genuine user-controlled input:

- Colors section → real extracted hex colors from the parsed SVG; real brand colors when prefill resolves.
- Logo section → real uploaded file (data URL) or real brand logo_url; placeholder icon only when both are absent.
- Text section → real text values from `extractTextNodes`.
- Empty-state copy → only renders when the SVG genuinely has no customizable elements (all three extractors returned empty).

## Threat Flags

**None.** Threat model T-172-01 (text input SVG injection) is mitigated upstream by `svgCustomizeService.updateText`, which uses `element.textContent` (browser-native escape). T-172-10 (DoS via huge logo) is mitigated by the 2MB `file.size` check before `FileReader.readAsDataURL`. T-172-11 (logo leaks to network) is accepted — the panel never makes network requests for logos. T-172-12 (spoofed brand colors) is accepted — colors are visual-only and still pass through the Plan 03 DOMPurify gate before RPC submission. No new security surface was introduced.

## Self-Check: PASSED

- **Created file:** `src/components/template-gallery/QuickCustomizePanel.jsx` — FOUND (verified with `test -f`)
- **Modified file:** `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` — FOUND
- **Commit `be1de4e8`** (Task 1): FOUND in `git log`
- **Commit `bd198ea5`** (Task 2): FOUND in `git log`
- **Test suite:** `npx vitest run tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` → 6 passed / 6 (verified twice during execution)
- **All Task 1 grep acceptance criteria:** PASS (component exists, default-exported, all 8 service imports present, brand-theme import present, debounce constant 50, 2MB cap, `accept="image/*"`, `onBlur`, `type="color"`, empty-state copy, Remove/Upload logo copy, no framer-motion, no react-color/react-colorful)
- **All Task 2 grep acceptance criteria:** PASS (zero `it.skip`, 6 `it()`, fake-timer usage, `onBlur`/`fireEvent.blur`, Remove logo copy, empty-state copy, `primary_color` prefill assertion)
