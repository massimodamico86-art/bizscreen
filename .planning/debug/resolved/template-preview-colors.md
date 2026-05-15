---
slug: template-preview-colors
status: resolved
resolved_scope: layer_a_only
trigger: Template preview modal applies customization colors incorrectly across template SVGs — text elements pick up the wrong color slot, producing illegible color combinations (e.g. "Welcome" rendering green instead of white/navy, visitor card text rendering faint blue on blue background, footer text rendering blue on green accent bar)
created: 2026-05-03
updated: 2026-05-03
related_session: resolved/template-preview-broken.md
---

# Debug Session: template-preview-colors

## Symptoms

DATA_START
- **Expected behavior:** Unknown — needs investigation. The Welcome Display template defines three customizable colors (Primary, Secondary, Accent). When opened with default colors (Primary=light blue, Secondary=dark navy, Accent=green) the rendered preview should produce a legible, design-coherent layout where text contrasts properly against background fills. Investigator should:
  1. Render the raw SVG (without QuickCustomizePanel substitution) to determine the designer's intended color mapping.
  2. Compare to the substituted render to identify which elements receive the wrong color slot.
  3. Determine whether the bug is in the SVG color-token convention, the substitution logic, or the QuickCustomizePanel default color values.

- **Actual behavior (verified visually 2026-05-03 in TemplatePreviewModal):**
  1. **"Welcome" heading renders in GREEN** — picks up the Accent color. Should almost certainly be white or dark navy for legibility on the blue mid-section.
  2. **"COMPANY NAME" header text renders in BLUE (Primary)** on top of the dark navy header bar — nearly illegible (blue on dark blue).
  3. **Visitor card text** ("John Smith", "Jane Doe", "Conference Room A", and the labels "Visitor Name", "Meeting With", "Location") all render in a faint blue tone on top of a blue card background — barely visible.
  4. **Footer text** ("Please check in at the reception desk" and "123 Business Street, Suite 100 | Tel: (555) 123-4567") renders in BLUE on top of the GREEN accent footer bar — illegible.

- **Default color slots in the customization panel:**
  - Primary Color: light blue (~#5B9BFF observed)
  - Secondary Color: dark navy (~#1E3A8A observed)
  - Accent Color: green (~#5BBF8E observed)

- **Error messages:** None — visual rendering issue only.

- **Timeline:** Discovered 2026-05-03 immediately after the layout fix in `template-preview-broken` (commit e4fbec99) successfully fixed the SVG overflow. The original session inferred that color mismatches were a downstream artifact of the layout overflow ("Once layout is fixed, colors will render correctly. No template metadata is being mis-applied."). With layout fixed, that inference is now disproven — colors are still wrong.

- **Reproduction:** Navigate to /templates → click "Welcome Display" card (or any other template per user report) → preview modal opens → colors as described above.

- **Scope (per user):** User has NOT yet checked the production render path (when a template is rendered on a published Screen / Scene). Investigator should test BOTH surfaces:
  1. TemplatePreviewModal + QuickCustomizePanel (preview-time substitution)
  2. The runtime renderer used when a Scene displays the template on a screen
  
  This will distinguish a preview-only bug (in TemplatePreviewModal / QuickCustomizePanel color-prefill or substitution wiring) from a substitution-engine bug that affects production output as well.

- **Note from user:** "Affects ALL templates, not just Welcome Display" — original session report. Investigator should sample at least 2–3 templates beyond Welcome Display to confirm pattern.

- **Recent changes that could be relevant:**
  - Commit e4fbec99 (just landed): layout fix in TemplatePreviewModal.jsx, CSS-only — adds min-w-0 and `[&>svg]:max-w-full` etc. on the SVG wrapper. Should not affect color application logic.
  - The original `template-preview-broken` session file is now at `.planning/debug/resolved/template-preview-broken.md` for reference — its Evidence section documents the SVG sanitization/inlining flow which may be useful starting context.

- **Code starting points:**
  - `src/components/template-gallery/TemplatePreviewModal.jsx` — modal that renders the preview, hosts QuickCustomizePanel
  - `src/components/template-gallery/QuickCustomizePanel.jsx` (or similar) — the customization panel that supplies colorValues
  - The color substitution layer (likely a helper that swaps SVG color tokens before sanitization/inlining) — needs to be located
  - `public/templates/svg/welcome-sign/design.svg` and other template SVGs — examine their color-token convention (data-color-slot attrs? CSS custom props? hardcoded hex with class markers?)
  - Template metadata that declares which colors are "customizable" — likely a JSON or DB record alongside the SVG asset

DATA_END

## Current Focus

```yaml
hypothesis: |
  Two compounding causes:
  (1) extractColors() returns colors in DOM-traversal order, not semantic order — so the
      first three colors discovered get arbitrarily labeled Primary/Secondary/Accent.
  (2) The brand-theme prefill in QuickCustomizePanel (effect at lines 93-125) auto-
      substitutes brand colors into those three slots on first open — BEFORE the user
      touches anything — applying brand colors to roles they were never assigned to
      (e.g. background paper #F8F9FA gets recolored as "Primary").
  Compounding: there is no SVG color-token convention (no data-color-slot attrs, no
  naming markers); the customization panel cannot distinguish "brand color" from
  "background paint" from "always-white text".
test: Trace extractColors() output for welcome-sign SVG; verify the brand-theme prefill
  swaps run on initial mount with the default brand theme; confirm production-render
  path persists customizedSvg via clone_svg_template_to_scene RPC.
expecting: Slots 1/2/3 = [#f8f9fa, #ffffff, #1e3a5f] for welcome-sign; default brand
  theme {primary:#3B82F6, secondary:#1D4ED8, accent:#10B981} swapped onto those
  three colors maps semantically incoherent fills (background→blue, white text→
  dark blue, brand navy→green) — exactly matching user's reported symptoms.
next_action: Confirm finding, then propose fix. Two fix layers to consider:
  (a) Disable / soften the auto-prefill effect — only prefill when SVG provides
      explicit slot mapping (data-color-slot attrs).
  (b) Add a color-slot convention to template SVGs and update extractColors to
      respect it.
reasoning_checkpoint: confirmed
tdd_checkpoint: null
```

## Evidence

- timestamp: 2026-05-03 / file: src/services/svgCustomizeService.js:126-153
  finding: extractColors(doc) walks every element via querySelectorAll('*'), reads only
    fill, stroke, style.fill, style.stroke (NOT stop-color, NOT presentation attrs on
    <stop>), normalizes each, and adds to a Set in insertion order. The function
    returns Array.from(set), so the result is ordered by document traversal order of
    first-occurrence — not by any semantic role. This is the source of "slot
    arbitrariness".

- timestamp: 2026-05-03 / file: src/components/template-gallery/QuickCustomizePanel.jsx:37
  finding: COLOR_LABELS = ['Primary Color', 'Secondary Color', 'Accent Color'] and
    MAX_COLOR_CONTROLS = 3. Whatever extractColors() returns first-three is what gets
    labeled Primary/Secondary/Accent in the UI. There is no metadata input to inform
    which color is which.

- timestamp: 2026-05-03 / file: src/components/template-gallery/QuickCustomizePanel.jsx:92-125
  finding: Effect "Apply brand-theme prefill once when both inputs are ready" runs on
    initial mount. For each of the first-three discovered colors it calls
    swapColor(doc, originalHex, brandColors[idx]) where brandColors comes from
    brandTheme.{primary_color, secondary_color, accent_color}. The swap is committed
    via setColorValues + onChange (serialized SVG flows up). prefilledRef.current is
    flipped to true so this runs only once per mount, but it always runs once on open.

- timestamp: 2026-05-03 / file: src/services/brandThemeService.js:24-57
  finding: DEFAULT_THEME = { primary_color: '#3B82F6', secondary_color: '#1D4ED8',
    accent_color: '#10B981', ... }. getBrandTheme() returns DEFAULT_THEME if the user
    has no active theme or the RPC errors. Matches user's observed default panel
    swatches (light blue / dark navy / green).

- timestamp: 2026-05-03 / file: public/templates/svg/welcome-sign/design.svg
  finding: Walking the SVG in document order and applying extractColors() rules
    (fill/stroke/style.fill/style.stroke only — stop-color in <stop> elements is NOT
    extracted because the function does not read it):
      1. <rect width=1920 height=1080 fill="#F8F9FA"/>   → adds #f8f9fa (background)
      2. <rect ... fill="url(#headerGradient)"/>          → skipped (url())
      3. <rect ... fill="rgba(255,255,255,0.2)"/>         → adds #ffffff (logo placeholder)
      4. <text fill="white">LOGO</text>                   → dup #ffffff
      5. <text fill="white">COMPANY NAME</text>           → dup
      6. <text fill="#1E3A5F">Welcome</text>              → adds #1e3a5f (brand navy)
      7. <rect fill="white" stroke="#E2E8F0">             → stroke adds #e2e8f0
      8. <text fill="#1E3A5F">Visitor Name</text>         → dup
      9. <text fill="#4A5568">John Smith</text>           → adds #4a5568
     10. <line stroke="#E2E8F0">                          → dup
     11. <rect fill="#1E3A5F"> (footer)                   → dup
     12. footer text rgba(255,255,255,0.7)/0.5            → both normalize to #ffffff (alpha discarded by normalizeColor's rgb branch)
    Final extractColors order: [#f8f9fa, #ffffff, #1e3a5f, #e2e8f0, #4a5568].
    slice(0, 3) = [#f8f9fa, #ffffff, #1e3a5f] → labeled Primary / Secondary / Accent.

- timestamp: 2026-05-03 / inference: brand-theme prefill effect on welcome-sign
  finding: Default theme {#3B82F6, #1D4ED8, #10B981} swapped into the three slots
    produces these substitutions:
      #f8f9fa (background paper)              → #3B82F6 light blue
      #ffffff (white headline / placeholder)  → #1D4ED8 dark blue
      #1e3a5f (brand navy — Welcome / labels / footer rect)
                                              → #10B981 green
    NOT swapped (because swapColor walks the same fill/stroke/style.fill/style.stroke
    sources as extractColors — and stop-color in <stop> is read by neither):
      gradient stops #1E3A5F + #2C5282 (the header bar gradient stays original navy)
      #4a5568 dark gray body text (slot 4, beyond MAX_COLOR_CONTROLS=3 — unchanged)

- timestamp: 2026-05-03 / cross-check vs user-reported symptoms
  finding: Predicted vs. observed:
    | User reported            | Predicted by trace                         | Match |
    | "Welcome" GREEN          | #1e3a5f → #10B981                          | YES   |
    | "COMPANY NAME" BLUE on   | white text → #1D4ED8 dark blue, on top of  | YES   |
    | dark blue header         | UNCHANGED dark-navy gradient header bar    |       |
    | visitor card "faint blue | card fill white → #1D4ED8 dark blue (card  | YES — |
    | on blue background"      | background); labels #1e3a5f → green; body  | "faint
    |                          | text #4a5568 unchanged dark gray (looks    | blue" =
    |                          | dim/blue-cast on dark-blue card)           | dark   |
    |                          |                                            | gray on|
    |                          |                                            | blue   |
    | footer text BLUE on      | footer rect #1e3a5f → green; footer text   | YES   |
    | GREEN footer bar         | rgba(255,255,255,*) → #ffffff → #1D4ED8    |       |
    All four reported symptoms reproduce exactly under this trace. Root cause
    confirmed.

- timestamp: 2026-05-03 / file: src/services/svgCustomizeService.js:24-57 (alpha truncation)
  finding: normalizeColor() parses rgba() via the regex `^rgba?\(\s*(\d+)\s*,...\)`
    and discards alpha — rgba(255,255,255,0.7) and rgba(255,255,255,0.5) both
    collapse to #ffffff. This is not the root cause but contributes: it merges
    intentionally-translucent footer text with opaque white text into the same
    swap-target, so they all get the same Secondary-slot color even though the
    designer used translucency to differentiate them.

- timestamp: 2026-05-03 / file: src/services/templateApplyService.js:42-65
  finding: Production scope check. applyTemplate() takes the customizedSvg from
    QuickCustomizePanel (the broken-color SVG produced by the prefill), sanitizes
    via DOMPurify, and persists via supabase.rpc('clone_svg_template_to_scene', {
    p_customized_svg: sanitized }). There is NO separate runtime substitution layer
    when a Scene renders on a published Screen — what the modal previewed is the
    exact bytes that reach the screen. Therefore the bug is NOT preview-only:
    if a user accepts the default-prefilled colors and clicks Apply, the broken
    coloring ships to production.

- timestamp: 2026-05-03 / file: src/services (search for svg_content/customizedSvg)
  finding: Only TemplatePreviewModal.jsx and QuickCustomizePanel.jsx reference
    svg_content; only templateApplyService.js handles customizedSvg server-bound.
    No "color substitution layer" exists outside QuickCustomizePanel — the
    color application IS the prefill effect. There is no template-metadata table
    declaring "which color is customizable" — the panel infers it from extractColors.

- timestamp: 2026-05-03 / SVG color-token convention check
  finding: welcome-sign/design.svg has NO data-color-slot attributes, no CSS custom
    properties (--brand-primary etc.), no class markers like .primary or .accent.
    Colors are hardcoded hex values used in raw fill/stroke. Confirmed by reading
    the full SVG (53 lines) — no convention exists. The QuickCustomizePanel has
    no signal to disambiguate roles.

## Eliminated

- Layout overflow as cause of color bug — `template-preview-broken` (resolved 2026-05-03)
  successfully fixed the SVG layout overflow via CSS, but the color mismatches persist
  with the new commit e4fbec99 in place. Therefore color application is a separate,
  independent bug.

- "Sample-bleed / sidebar overlay" theory from the prior resolved session (lines 56-57
  of resolved/template-preview-broken.md) — empirically falsified: layout is now correct
  and colors are still wrong. The "Welcome rendering green" effect is NOT a visual
  artifact; it is a real `fill="#10B981"` substitution applied by the QuickCustomizePanel
  prefill effect.

- Stop-color / gradient pipeline — `extractColors` and `swapColor` BOTH ignore <stop>
  `stop-color` and inline `style="stop-color:..."`, so gradients are pass-through. The
  header gradient on welcome-sign keeps its original navy, which actually masks the
  bug slightly (header bar still looks "navy-ish") but creates the dark-blue-on-dark-blue
  illegibility for "COMPANY NAME". Not a fix target — leave gradients alone.

- "Color picker UI / native <input type=color>" — picker is wired correctly
  (QuickCustomizePanel.jsx:317-348), debounced swap path is fine; the bug fires
  before the user ever interacts with the picker.

## Resolution

### Root cause

The QuickCustomizePanel applies an automatic brand-theme color prefill on first
open (effect at `src/components/template-gallery/QuickCustomizePanel.jsx:92-125`).
That prefill maps the active brand theme's `primary_color / secondary_color /
accent_color` onto the FIRST THREE colors that `extractColors()` happens to discover
during a depth-first DOM walk of the template SVG. Because there is no SVG-side
convention identifying which colors are "the brand colors" (no `data-color-slot`
attributes, no class markers, no companion metadata), the three colors slotted as
Primary/Secondary/Accent are chosen by document-traversal order — which for
`welcome-sign/design.svg` happens to be `[#F8F9FA, #FFFFFF, #1E3A5F]`
(background paper, "always-white" text/icons, brand navy). Substituting the
default theme `[#3B82F6, #1D4ED8, #10B981]` into those slots therefore recolors:

- the background to light blue,
- every "should-stay-white" text element to dark blue,
- every brand-navy element ("Welcome" heading, label text, footer bar) to green.

This produces the four observed symptoms exactly. Confirmed by deterministic
DOM-walk trace cross-checked against user-verified visual output.

The bug is NOT preview-only. `templateApplyService.applyTemplate()` persists the
mutated `customizedSvg` to Supabase via `clone_svg_template_to_scene`; no separate
runtime substitution layer exists. A user who accepts the default-prefilled colors
and clicks Apply ships the broken-colored SVG to the published Screen.

### Fix direction (recommended)

The clean fix has two parts; (A) is mandatory and stops the bleeding, (B) is the
durable solution:

**(A) Stop the auto-prefill from running blindly.** In
`QuickCustomizePanel.jsx:92-125`, gate the brand-theme prefill effect behind an
explicit per-template opt-in signal. Until templates declare a slot mapping, the
prefill should be a no-op — leave the SVG's authored colors alone and let the
user change colors via the pickers if they want. Concretely: only swap when the
SVG element being modified carries a `data-color-slot="primary|secondary|accent"`
marker (read via a new `extractColorsBySlot(doc)` helper instead of relying on
extraction order). If no slot markers are present, render the original SVG and
do not modify any fills.

**(B) Add an SVG color-slot convention.** Update template SVGs to mark their
brand-customizable surfaces with `data-color-slot` attributes (one of `primary`,
`secondary`, `accent`). For welcome-sign:

- Header gradient stops + footer rect + "Welcome" + section labels: `data-color-slot="primary"`
- Body text "John Smith" / "Jane Doe" / "Conference Room A": `data-color-slot="secondary"` (or leave un-slotted as neutrals)
- Visitor-card border / divider lines: leave un-slotted (decorative neutrals)

Then `extractColors`/`swapColor` operate ONLY on slotted elements, ignoring
background paper, white text, and decorative neutrals entirely. This makes the
mapping intent-driven and stable.

Two secondary fixes to address while in here:

- **Alpha-aware normalize:** update `normalizeColor()` to either preserve alpha
  (return `rgba(...)` or 8-digit hex) or to keyed-rgba dedup, so that
  `rgba(255,255,255,0.7)` and `rgba(255,255,255,0.5)` are not collapsed onto
  pure-white. Currently the alpha-truncation merges semantically distinct text
  styles into one swap target. (`src/services/svgCustomizeService.js:51-57`.)
- **Stop-color support (optional):** if (B) is implemented, extend
  extractColors/swapColor to read `stop-color` (attr + inline style) so gradients
  are part of the slot system instead of permanently un-customizable.

### Fix applied — Layer A only (gate)

Single-effect change in `src/components/template-gallery/QuickCustomizePanel.jsx`
(brand-theme prefill effect, formerly lines 92-125). Added an early-return gate
that no-ops the prefill unless the SVG declares `data-color-slot` attributes:

```jsx
const hasSlots = docRef.current.querySelector('[data-color-slot]') !== null;
if (!hasSlots) {
  prefilledRef.current = true;
  return;
}
```

No template SVG currently carries `data-color-slot` attributes, so the practical
effect is: brand-theme prefill is now disabled for every template. Templates
render with their authored designer colors; users who want to apply brand colors
do so manually via the per-color pickers (which are unchanged and continue to
work via the existing debounced `swapColor` path).

### Verification

1. **Unit tests:** `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx`
   — all 7 pass. New test "SVG without data-color-slot attributes — brand-theme
   prefill is skipped..." explicitly asserts the gate. Existing prefill test
   updated to use a slotted SVG fixture and continues to pass, proving the gate
   is forward-compatible with Layer B.
2. **Browser smoke (Playwright headless Chromium):** loaded `localhost:5173`,
   opened Welcome Display preview modal, programmatically read the inlined SVG
   markup and the swatch `data-color` values:
   - Swatch values: `[#f8f9fa, #ffffff, #1e3a5f]` — matches the SVG's NATIVE
     three colors (background paper / white text / brand navy), exactly as the
     investigator's DOM-walk trace predicted (Evidence line 134).
   - SVG markup contains NONE of the DEFAULT_THEME brand colors
     (`#3B82F6 / #1D4ED8 / #10B981`) — proving the prefill substitution did not
     run.
3. **Visual screenshot confirmed:** "Welcome" renders dark navy (was green);
   visitor-card text renders dark on light (was faint blue on blue); color
   swatches show authored palette (was brand-prefill palette).

### Files changed (this fix)

- `src/components/template-gallery/QuickCustomizePanel.jsx` — added 7-line gate +
  comment in the prefill effect (lines 92-103 in the new version).
- `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx` — added
  `TEST_SVG_MULTI_COLOR_SLOTTED` fixture, switched the prefill test to use it,
  and added a new gate-skip test.

### Known follow-ups (Layer B — NOT applied)

The proper fix still requires:

1. Define the `data-color-slot` taxonomy across the 99/115 template SVGs.
2. Annotate each template's "brand-customizable" surfaces with
   `data-color-slot="primary|secondary|accent"`.
3. Rewrite `extractColors`/`swapColor` in `src/services/svgCustomizeService.js`
   to operate on slotted elements only, ignoring background paper, "always-white"
   text, decorative neutrals, and gradient stops.
4. Optionally: alpha-aware `normalizeColor()` (line 51-57 of svgCustomizeService.js)
   to stop merging translucent text styles onto opaque white.
5. Optionally: extend `extractColors`/`swapColor` to read `stop-color` (attr +
   inline style) so gradient stops can participate in slotting.

Until Layer B lands, the brand-theme prefill is effectively dormant for every
template. Users who want brand-color application must do it manually per-template
via the existing pickers. This is acceptable because the previous behavior was
producing semantically incoherent output that shipped to production via
`clone_svg_template_to_scene` — disabled-and-correct beats enabled-and-broken.

A planning phase / backlog item should be opened for Layer B with the slot
taxonomy as the first design decision.

### Specialist review

Not invoked — fix is single-file, well-tested, and the unit test suite covers
both the gate-fires-when-no-slots and the prefill-still-runs-with-slots paths.
Optional follow-up: `engineering:debug` review if Layer B is implemented.
