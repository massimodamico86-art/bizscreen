# Phase 166: Template Quick Customize - Research

**Researched:** 2026-04-11
**Domain:** React SVG manipulation, in-browser color extraction, modal state management, scene creation
**Confidence:** HIGH

## Summary

Phase 166 adds a QuickCustomizePanel inside the existing TemplatePreviewModal. When the user clicks "Customize", the modal content switches to the panel, which lets them tweak brand colors, upload a logo, and override text fields. On "Apply & Create" the panel calls `installTemplateAsScene()` (or an extended version) and closes the modal — the user stays on the marketplace page.

All the tools needed already exist in the codebase. `parseSvgTextElements()` in `svgTemplateService.js` extracts text nodes from an SVG string using the browser's `DOMParser`. Color extraction follows the same pattern — walk SVG DOM nodes and collect unique `fill`/`stroke` attribute values. Logo replacement targets a designated `<image>` element in the SVG. Scene creation calls `clone_template_to_scene` via `installTemplateAsScene()`.

**Primary recommendation:** Build QuickCustomizePanel as a pure React component that accepts SVG content (already available via `detail.metadata?.svgContent` or fetched via `loadSvgContent()`) and manages all mutations in-memory before handing the modified SVG string to scene creation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** QuickCustomizePanel is accessible from TemplatePreviewModal via a new "Customize" button alongside the existing "Install" button
- **D-02:** Clicking "Customize" replaces the preview modal content with the customization panel (same modal shell, new content). A back button returns to the preview view
- **D-03:** No other entry points (no inline card buttons, no dedicated route)
- **D-04:** Live preview uses in-browser SVG re-rendering — parse template SVG, find color/text/image nodes, swap values in-memory, re-render inline
- **D-05:** Preview layout is stacked: SVG preview on top (~60% height), scrollable controls below, within the existing modal dimensions
- **D-06:** Auto-detect dominant colors from the template SVG (parse fills/strokes), present as editable color swatches
- **D-07:** Each swatch opens a color picker; all SVG nodes matching that color update on change
- **D-08:** Upload-only logo handling — simple file upload button (PNG, JPG, SVG accepted)
- **D-09:** Uploaded logo replaces a designated placeholder area in the template SVG
- **D-10:** Show current logo thumbnail with Upload and Remove actions
- **D-11:** Auto-detect text nodes from SVG, present each as a labeled input field
- **D-12:** Field labels derived from text content or nearby element IDs
- **D-13:** Text fields update the SVG preview on change
- **D-14:** "Apply & Create" creates a new scene with the customized SVG, shows a success toast, and closes the modal (user stays on marketplace)
- **D-15:** Scene auto-named from template name (matches existing installTemplateAsScene() behavior)
- **D-16:** Reuses/extends installTemplateAsScene() with customization data

### Claude's Discretion
- Color picker component choice (native, custom, or existing design system picker)
- SVG parsing strategy for detecting color nodes, text nodes, and logo placeholder
- Loading/error states within the customize panel
- Exact modal transition animation between preview and customize views

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | User can quick-customize a template (brand colors, logo, text overrides) via QuickCustomizePanel without entering the full editor | All four success criteria addressed: entry via TemplatePreviewModal (D-01/D-02), live color preview (D-04/D-06/D-07), logo + text overrides (D-08 – D-13), scene creation without opening editor (D-14 – D-16) |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | Component rendering, state | Already in project [VERIFIED: package.json] |
| Browser DOMParser | built-in | Parse SVG strings to DOM | Used in parseSvgTextElements() today [VERIFIED: svgTemplateService.js] |
| `<input type="color">` (native) | HTML5 | Color picker for each swatch | Zero-dependency; sufficient for swatch editing; project has no third-party color-picker dependency [VERIFIED: package.json] |
| Supabase JS | 2.80.0 | Scene creation via clone_template_to_scene RPC | Already in project [VERIFIED: package.json] |
| framer-motion | 12.x | Modal transition animation | Already used in design-system Modal.jsx [VERIFIED: Modal.jsx] |
| lucide-react | 0.548.0 | Icons (back arrow, upload, X) | Already used across project [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `URL.createObjectURL()` | built-in | Convert File to image src for logo preview | Used when user picks a local file before upload |
| Supabase Storage | via @supabase/supabase-js | Upload logo to storage bucket | On Apply, persist logo before scene creation |
| Tailwind CSS | 3.4.x | Styling | All UI — project convention [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="color">` | react-color / @uiw/react-color | External deps add weight; native picker is sufficient for brand swatch editing; Claude's discretion area |
| In-memory SVG string manipulation | Fabric.js canvas | Overkill — full editor path; QuickCustomizePanel should stay lightweight |

**Installation:**
No new packages needed. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── TemplatePreviewModal.jsx    # Modified: add view state + Customize button
│   └── QuickCustomizePanel.jsx     # New: customization UI
├── services/
│   └── marketplaceService.js       # Modified: extend installTemplateAsScene()
│       or
│   └── svgCustomizeService.js      # New (optional): SVG mutation helpers
```

### Pattern 1: View Toggle Inside TemplatePreviewModal

**What:** TemplatePreviewModal holds a `view` state: `'preview'` | `'customize'`. Footer and content area render different content per view. The modal shell (header, close button, size classes) stays unchanged.

**When to use:** Keeps modal logic encapsulated; avoids creating a second modal or a new route.

**Example:**
```jsx
// Source: inferred from existing TemplatePreviewModal.jsx pattern [VERIFIED: TemplatePreviewModal.jsx]
const [view, setView] = useState('preview'); // 'preview' | 'customize'

// In footer:
{view === 'preview' && detail?.canAccess && (
  <>
    <button onClick={() => setView('customize')}>Customize</button>
    <button onClick={handleInstall}>Use Template</button>
  </>
)}
{view === 'customize' && (
  <button onClick={() => setView('preview')}>Back</button>
  // Apply & Create button lives inside QuickCustomizePanel
)}
```

### Pattern 2: In-Memory SVG Mutation

**What:** Parse the SVG string once into a DOM document, hold the document in state, mutate it directly (change fill/stroke/text/image), serialize back to string for preview rendering.

**When to use:** For all three customization dimensions (colors, text, logo).

**Example:**
```jsx
// Source: extends parseSvgTextElements() pattern [VERIFIED: svgTemplateService.js]
function parseSvgForCustomize(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  return doc;
}

function serializeSvg(doc) {
  return new XMLSerializer().serializeToString(doc);
}

// Color swap: find all elements with fill === targetColor, set to newColor
function swapColor(doc, targetColor, newColor) {
  doc.querySelectorAll('[fill]').forEach(el => {
    if (normalizeColor(el.getAttribute('fill')) === normalizeColor(targetColor)) {
      el.setAttribute('fill', newColor);
    }
  });
  doc.querySelectorAll('[stroke]').forEach(el => {
    if (normalizeColor(el.getAttribute('stroke')) === normalizeColor(targetColor)) {
      el.setAttribute('stroke', newColor);
    }
  });
}
```

### Pattern 3: Color Detection from SVG

**What:** Walk all SVG elements, collect `fill` and `stroke` attribute values, deduplicate, filter out `none`/`transparent`/gradients, present as swatches.

**Example:**
```jsx
// Source: [ASSUMED] — standard DOM traversal pattern consistent with parseSvgTextElements()
function extractColors(doc) {
  const colorSet = new Set();
  doc.querySelectorAll('[fill], [stroke]').forEach(el => {
    ['fill', 'stroke'].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && val !== 'none' && !val.startsWith('url(')) {
        colorSet.add(normalizeColor(val));
      }
    });
  });
  return [...colorSet];
}
```

### Pattern 4: Logo Placeholder Detection

**What:** Template SVGs should have a designated `<image>` element (look for `id="logo"`, `id="logo-placeholder"`, class `logo`, or the first `<image>` element). Replace its `href`/`xlink:href` with an object URL or uploaded URL.

**Example:**
```jsx
// Source: [ASSUMED] — standard SVG image attribute pattern
function replaceLogo(doc, logoSrc) {
  const imgEl = doc.querySelector('image#logo, image.logo, image#logo-placeholder')
    ?? doc.querySelector('image'); // fallback: first image
  if (imgEl) {
    imgEl.setAttribute('href', logoSrc);
    imgEl.setAttribute('xlink:href', logoSrc); // SVG 1.1 compat
  }
}
```

### Pattern 5: Scene Creation with Custom SVG

**What:** `installTemplateAsScene()` calls `clone_template_to_scene` RPC which copies the template's existing slides. To apply customizations, the plan is to either (a) create the scene first, then patch its slide data with the modified SVG, or (b) extend `installTemplateAsScene()` to accept a `customizationPayload`.

**Important:** The existing RPC `clone_template_to_scene(p_template_id, p_scene_name)` does not currently accept a customization payload [VERIFIED: marketplaceService.js]. The plan must address how the modified SVG is persisted in the new scene.

**Recommended approach:** After `installTemplateAsScene()` returns a `sceneId`, patch the scene's slide `design_json` or `svg_content` with the customized SVG via a Supabase update. This avoids changing the DB function.

```js
// Source: [ASSUMED] — matches Supabase pattern used elsewhere in codebase
async function installWithCustomization(templateId, sceneName, customizedSvg) {
  const sceneId = await installTemplateAsScene(templateId, sceneName);
  // Fetch cloned slides, patch SVG content
  const { data: slides } = await supabase
    .from('scene_slides') // actual table name TBD — verify against DB schema
    .select('id')
    .eq('scene_id', sceneId)
    .order('position')
    .limit(1);
  if (slides?.[0]) {
    await supabase
      .from('scene_slides')
      .update({ svg_content: customizedSvg })
      .eq('id', slides[0].id);
  }
  return sceneId;
}
```

### Pattern 6: Logo File Upload (local file → object URL → Supabase Storage on Apply)

**What:** Use a simple `<input type="file">` (not Cloudinary — Cloudinary widget is for media library, not quick inline use). On file select, create an object URL for immediate preview. On Apply, upload to Supabase Storage and use the persistent URL.

**Why not ImageUploadButton?** `ImageUploadButton` uses Cloudinary via `useCloudinaryUpload`, which opens a widget and is designed for the media library. For a simple inline logo picker, a plain `<input type="file" accept="image/*">` is lighter and more appropriate.

**Example:**
```jsx
// Source: [ASSUMED] — standard React file input pattern
const [logoFile, setLogoFile] = useState(null);
const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);

const handleLogoChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setLogoFile(file);
  setLogoPreviewUrl(URL.createObjectURL(file));
};
// On component unmount or when file changes: URL.revokeObjectURL(logoPreviewUrl)
```

### Anti-Patterns to Avoid

- **Mutating SVG string with regex:** Use DOMParser/XMLSerializer for correctness. Regex breaks on namespaces, CDATA, and encoded characters.
- **Re-parsing SVG on every keystroke:** Parse once into a DOM document on panel mount; mutate the DOM document in-place; serialize to string only for preview re-render.
- **Opening Cloudinary widget for logo:** ImageUploadButton opens a full media-library widget. Use a native `<input type="file">` for the logo picker.
- **Navigating to scene editor on Apply:** D-14 says user stays on marketplace. Do not call `navigate()` after success — only close modal and show toast.
- **Adding new modal or route:** D-03 says no other entry points. Keep everything inside TemplatePreviewModal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG parsing | Custom regex parser | Browser `DOMParser` | Already used in `parseSvgTextElements()` — handles namespaces, encoding |
| SVG serialization | Manual string concat | `XMLSerializer.serializeToString()` | Browser built-in, handles all SVG edge cases |
| Text node detection | Custom traversal | Extend existing `parseSvgTextElements()` | Already handles `<text>` and `<tspan>`, matrix transforms, fill extraction |
| Modal shell | New modal component | Existing `TemplatePreviewModal` shell (or design-system `Modal`) | Already handles escape key, backdrop, scroll lock |
| Color normalization | Custom parser | A small hex/rgb normalizer function | Colors appear as hex, `rgb()`, or named; normalize to lowercase hex for comparison |
| Toast on success | Custom notification | `Toast` component already in `src/components/Toast.jsx` | Project already uses it; pattern: local `useState` for toast visibility |

---

## Common Pitfalls

### Pitfall 1: SVG `fill` in `<style>` blocks vs. attributes
**What goes wrong:** Color extraction only queries `[fill]` attributes and misses colors defined inside `<style>` or inline `style=""` attributes.
**Why it happens:** SVGs generated by Illustrator/Figma often use `<style>` blocks or inline style properties rather than presentation attributes.
**How to avoid:** Also check `el.style.fill` and `el.style.stroke` after attribute check. Consider using `window.getComputedStyle()` on SVG elements (already done in `parseSvgTextElements()`).
**Warning signs:** Swatch list is empty even though the SVG has visible colors.

### Pitfall 2: SVG color value formats vary (`#ff0000`, `rgb(255,0,0)`, `red`)
**What goes wrong:** Two swatches for the same visual color appear because `#1a1a2e` !== `#1A1A2E`.
**Why it happens:** Different SVG generators use different formats.
**How to avoid:** Normalize all extracted colors to lowercase hex before deduplication. A 5-line helper using `canvas.getContext('2d')` to resolve named colors is sufficient.
**Warning signs:** Duplicate color swatches in the panel.

### Pitfall 3: `xlink:href` vs `href` for SVG `<image>`
**What goes wrong:** Logo replacement works in Chrome but not Safari/Firefox because old SVGs use `xlink:href` (SVG 1.1) while new SVGs use `href` (SVG 2).
**Why it happens:** SVG `<image>` attributes vary by SVG spec version.
**How to avoid:** Always set both: `el.setAttribute('href', url)` and `el.setAttribute('xlink:href', url)`.
**Warning signs:** Logo appears in one browser, not another.

### Pitfall 4: `clone_template_to_scene` copies slides without SVG customization
**What goes wrong:** Apply & Create creates the scene, but the slide still has the original SVG.
**Why it happens:** The RPC (`clone_template_to_scene`) simply copies template data — it has no knowledge of in-browser SVG mutations [VERIFIED: marketplaceService.js].
**How to avoid:** After scene creation, fetch the new scene's slides and PATCH the relevant `svg_content` or `design_json` field with the customized SVG string before showing the success toast.
**Warning signs:** User opens the scene later and sees the original template, not the customized one.

### Pitfall 5: Object URL memory leak
**What goes wrong:** `URL.createObjectURL()` for logo preview is never revoked, leading to memory accumulation across multiple uses.
**Why it happens:** Object URLs are not automatically garbage-collected.
**How to avoid:** Call `URL.revokeObjectURL(logoPreviewUrl)` in the `useEffect` cleanup or when a new file is selected.
**Warning signs:** Memory usage grows with each logo preview in a session.

### Pitfall 6: TemplatePreviewModal currently navigates to scene editor on install success
**What goes wrong:** Existing `handleInstallSuccess` in `TemplateMarketplacePage` calls `navigate('/scene-editor/${sceneId}')`. If QuickCustomizePanel reuses this callback, the user gets sent to the editor despite D-14 saying they should stay on the marketplace.
**Why it happens:** The existing flow was designed for "install and edit". QuickCustomize should not navigate [VERIFIED: TemplateMarketplacePage.jsx line 107-110].
**How to avoid:** QuickCustomizePanel calls a separate `onCustomizeSuccess` callback (not `onInstallSuccess`) that only closes the modal and shows a toast, without navigating.

---

## Code Examples

Verified patterns from official sources:

### Existing: parseSvgTextElements() — extend this for color/logo
```js
// Source: [VERIFIED: src/services/svgTemplateService.js line 447-517]
export function parseSvgTextElements(svgContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  const textElements = svg.querySelectorAll('text, tspan');
  // ... returns { textElements, viewBox, width, height, svgContent }
}
```

### Existing: installTemplateAsScene()
```js
// Source: [VERIFIED: src/services/marketplaceService.js line 192-200]
export async function installTemplateAsScene(templateId, sceneName = null) {
  const { data, error } = await supabase.rpc('clone_template_to_scene', {
    p_template_id: templateId,
    p_scene_name: sceneName,
  });
  if (error) throw error;
  return data; // returns new scene ID (string)
}
```

### Existing: TemplatePreviewModal view-toggle hook point
```jsx
// Source: [VERIFIED: src/components/TemplatePreviewModal.jsx]
// Modal already has: useState for loading, installing, error, detail, customName, activeSlide
// Add: const [view, setView] = useState('preview');
// Footer "Use Template" button sits at line 392-432 — add "Customize" button beside it
```

### Existing: SVG template data path
```js
// Source: [VERIFIED: src/services/svgTemplateService.js line 327-368]
// template_library row includes metadata.svgContent for admin-uploaded SVGs
const svgContent = t.metadata?.svgContent;
// For templates without svgContent, use preview_url or thumbnail_url as SVG src
// then fetch with loadSvgContent(svgUrl)
```

### Existing: Toast pattern
```jsx
// Source: [VERIFIED: src/components/ImageUploadButton.jsx]
const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
// ... set toast on success/error, auto-clear after timeout
// <Toast message={toast.message} type={toast.type} onClose={...} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Navigate to scene editor after install | Stay on marketplace with toast | Phase 166 | QuickCustomize must NOT call navigate() — use new onCustomizeSuccess callback |

---

## Open Questions (RESOLVED)

1. **What is the actual scene slide table/column that holds SVG content?**
   - What we know: `clone_template_to_scene` RPC creates a scene from a template. Template slides have `design_json` (JSON, used by `SlidePreview`) and potentially `svg_content` (string).
   - What's unclear: The exact Supabase table (`scene_slides`? `scenes_slides`?) and column name for storing the modified SVG after scene creation. The codebase doesn't reveal the DB schema directly.
   - Recommendation: Wave 0 task — query `supabase.from('scene_slides').select()` on a cloned scene to confirm table name and columns, OR inspect the `clone_template_to_scene` RPC definition in Supabase.
   - **RESOLVED:** Plans use `scene_slides.design_json.svgContent` pattern, matching the existing `sceneDesignService.js` CRUD pattern for `scene_slides` table with `design_json` column.

2. **Do templates in `template_library` always have SVG content in `metadata.svgContent`?**
   - What we know: `svgTemplateService.js` checks `t.metadata?.svgContent` and falls back to `preview_url` or `thumbnail_url` [VERIFIED: svgTemplateService.js line 338-368]. Some templates may only have image URLs, not raw SVG.
   - What's unclear: If a template has no SVG content, in-browser SVG re-rendering is not possible.
   - Recommendation: QuickCustomizePanel should gracefully degrade — if no SVG content is available, show a "Customize not available for this template" state instead of crashing.
   - **RESOLVED:** Plan 02 Task 2 implements graceful fallback — `if (!detail?.metadata?.svgContent)` shows "Customize is not available for this template" message with a back button.

3. **Is there a designated logo placeholder convention in existing SVG templates?**
   - What we know: The project has local SVG templates (restaurant menu, etc.) in `public/templates/svg/`. Whether they use `id="logo"` or similar is unverified.
   - What's unclear: If no convention exists, the fallback (replace first `<image>` element) may target unintended elements.
   - Recommendation: Wave 0 task — inspect two or three local SVG files to confirm placeholder conventions; document the detection priority order.
   - **RESOLVED:** Plan 01 implements priority detection order: `image#logo`, `image.logo`, `image#logo-placeholder`, then first `<image>` element as fallback. If no image element exists, `findLogoElement()` returns null and logo section is hidden.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 166 is a frontend-only code change. All runtime dependencies (Supabase, React, browser APIs) are already in use and operational.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit) + Playwright 1.57 (E2E) |
| Config file | `vite.config.js` (Vitest), `playwright.config.js` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 SC1 | QuickCustomizePanel accessible from TemplatePreviewModal | E2E | `npx playwright test tests/e2e/template-marketplace.spec.js -x` | ✅ (needs new tests) |
| CONT-01 SC2 | Live color preview updates SVG | unit | `npm run test:unit -- tests/unit/services/svgCustomize.test.js` | ❌ Wave 0 |
| CONT-01 SC3 | Logo upload and text override apply | E2E | `npx playwright test tests/e2e/template-marketplace.spec.js -x` | ✅ (needs new tests) |
| CONT-01 SC4 | Apply creates scene, stays on marketplace | E2E | `npx playwright test tests/e2e/template-marketplace.spec.js -x` | ✅ (needs new tests) |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test && npx playwright test tests/e2e/template-marketplace.spec.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/services/svgCustomize.test.js` — unit tests for color extraction, text extraction, color swap, logo replacement, SVG serialization
- [ ] New E2E test cases in `tests/e2e/template-marketplace.spec.js` — QuickCustomizePanel open/close, color change, Apply & Create

---

## Security Domain

> `security_enforcement` not set to false in config — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | User must be authenticated to access template marketplace (existing Supabase auth) |
| V3 Session Management | no | Existing session management handles this |
| V4 Access Control | yes | `canAccess` check (via `can_access_template` RPC) gates Customize button — same as Install button |
| V5 Input Validation | yes | Logo file: accept only `image/*`, validate MIME type; text overrides: sanitize before SVG injection |
| V6 Cryptography | no | No new crypto requirements |

### Known Threat Patterns for SVG in-browser manipulation

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SVG XSS via text override | Tampering | Text inputs injected into SVG `<text>` `textContent` — use `el.textContent = value` (not `innerHTML`) to prevent script injection |
| SVG XSS via logo URL | Tampering | Use `URL.createObjectURL(file)` for local files; validate that uploaded URLs are from trusted Supabase storage domain before setting `href` |
| MIME type spoofing for logo | Tampering | Check `file.type.startsWith('image/')` client-side; Supabase Storage bucket policies enforce file types server-side |
| Access control bypass | Elevation of Privilege | Re-verify `detail?.canAccess` before calling Apply — don't rely solely on button visibility |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | After `installTemplateAsScene()` returns a sceneId, scene slides can be patched via a Supabase update to apply the custom SVG | Architecture Pattern 5 | Scene creation approach needs redesign; may require RPC modification |
| A2 | The scene slides table is named `scene_slides` with a column for SVG content | Architecture Pattern 5 | Wrong table/column name causes a runtime error in Apply path |
| A3 | Existing local SVG templates have `<image>` elements for logo placeholders | Pattern 4 | Logo replacement finds nothing; logo customization appears broken |
| A4 | `detail.metadata?.svgContent` is populated for templates in `template_library` | Open Questions #2 | No SVG content available → live preview not possible for marketplace templates |
| A5 | Native `<input type="color">` is the chosen color picker (Claude's discretion) | Standard Stack | If project requires a more polished picker, an external lib like `react-colorful` (~2KB) could be added |

**All A-items require Wave 0 verification before implementation begins.**

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: src/components/TemplatePreviewModal.jsx] — full modal implementation, state variables, install flow
- [VERIFIED: src/services/marketplaceService.js] — installTemplateAsScene(), fetchTemplateDetail(), RPC signatures
- [VERIFIED: src/services/svgTemplateService.js] — parseSvgTextElements(), loadSvgContent(), svgContent path in metadata
- [VERIFIED: src/components/svg-editor/PropertiesPanel.jsx] — color picker swatch + hex input pattern
- [VERIFIED: src/design-system/components/Modal.jsx] — Modal, ModalContent, ModalFooter composition
- [VERIFIED: src/design-system/index.js] — exported design system components
- [VERIFIED: src/components/ImageUploadButton.jsx] — file upload + Toast pattern
- [VERIFIED: src/pages/TemplateMarketplacePage.jsx] — handleInstallSuccess navigates to editor (must NOT reuse for QuickCustomize)
- [VERIFIED: package.json] — full dependency list (no existing color picker lib)

### Secondary (MEDIUM confidence)
- [ASSUMED] SVG DOM mutation patterns (DOMParser, XMLSerializer, querySelectorAll) — standard browser APIs, widely documented

### Tertiary (LOW confidence)
- A1-A5 in Assumptions Log — require Wave 0 verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs already in project, verified via package.json
- Architecture: HIGH for modal view-toggle and SVG manipulation patterns; MEDIUM for Apply/scene-patch path (A1/A2 unverified)
- Pitfalls: HIGH — derived directly from reading the existing codebase

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable stack; SVG browser APIs are long-lived)
