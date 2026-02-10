# Phase 48: Template-to-Editor Flow - Research

**Researched:** 2026-02-10
**Domain:** SPA navigation, Fabric.js SVG editor integration, collapsible UI panels, scroll position restoration
**Confidence:** HIGH

## Summary

Phase 48 connects the SVG template browse page (SvgTemplateGalleryPage, built in Phase 47) to the Fabric.js SVG editor (FabricSvgEditor) via a one-click flow. The existing infrastructure already has a working template-click-to-editor path using sessionStorage + `onNavigate('svg-editor?templateId=X')`, which means FLOW-01 and FLOW-02 are partially satisfied today. The primary new work is: (1) removing any friction in the click path, (2) building a collapsible quick-customize panel inside the FabricSvgEditor, and (3) preserving scroll position when navigating back from the editor to the gallery.

The app uses **state-based routing** (`setCurrentPage` / `onNavigate` in App.jsx) for all internal pages, not React Router's `<Route>` component. Pages are lazy-loaded via `React.lazy` and rendered conditionally in a `pages` object. The SVG editor is rendered when `currentPage.startsWith('svg-editor')` with `routeString` passed to `SvgEditorPage`. This is a critical architectural constraint -- all navigation solutions must work within this state-based paradigm, not URL-based routing.

The template-to-editor flow uses **Fabric.js 6.9** (not Polotno). The `PolotnoEditor` component is a separate editor that runs in an iframe for a different page (`DesignEditorPage`). The SVG template flow specifically goes through `SvgEditorPage` -> `FabricSvgEditor`. The quick-customize panel must be built inside or alongside `FabricSvgEditor`, not inside a Polotno iframe.

**Primary recommendation:** Enhance the existing sessionStorage-based template-click flow to skip any confirmation modals, add a collapsible quick-customize panel as a new sibling panel in FabricSvgEditor, and store/restore scroll position in sessionStorage keyed by the gallery page ID.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fabric | ^6.9.0 | SVG template canvas editor | Already in use, the SVG editor is built on it |
| framer-motion | ^12.23.24 | Panel animations, collapsible transitions | Already in use across all Phase 47 cards and gallery |
| lucide-react | ^0.548.0 | Icons for customize panel | Already standard across the app |
| react | ^19.1.1 | Core framework | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase (client) | existing | Fetch brand theme data for quick-customize | Already initialized in services |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sessionStorage for scroll | React state | sessionStorage survives component unmount/remount, React state would not |
| New panel in FabricSvgEditor | Separate modal overlay | Panel is explicitly required to be "inside the editor", modal would contradict FLOW-01 |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
```

## Architecture Patterns

### Existing Navigation Flow (State-Based Routing)
```
App.jsx
  currentPage state ("templates" | "svg-editor?templateId=X" | ...)
  pages object maps page keys to lazy-loaded components
  Dynamic routes: currentPage.startsWith('svg-editor') -> <SvgEditorPage routeString={currentPage} />
```

### Existing Template-to-Editor Flow
```
SvgTemplateGalleryPage
  handleTemplateClick(template)
    -> sessionStorage.setItem('pendingTemplate', JSON.stringify(templateData))
    -> onNavigate('svg-editor?templateId=X')

SvgEditorPage
  parseQueryParams(routeString)
    -> if templateId: sessionStorage.getItem('pendingTemplate')
    -> parse JSON, set editorConfig
    -> render <FabricSvgEditor svgUrl={...} />

FabricSvgEditor
  loadContent(canvas)
    -> if svgUrl: loadSvgContent(svgUrl) -> loadSvgIntoCanvas(canvas, svgString)
    -> SVG parsed into individual Fabric.js objects (text becomes IText, shapes stay as-is)
```

### Pattern 1: Quick-Customize Panel (Collapsible Sidebar)
**What:** A collapsible panel inside the editor that appears on first open from a template, offering brand color, logo, and text overrides.
**When to use:** When `templateId` is present and the design was just loaded (first open).
**Architecture:**
```
FabricSvgEditor
  [existing state]
  + showQuickCustomize: boolean (true when opened from template, false after collapse)
  + quickCustomizeData: { brandColors, logoUrl, primaryTexts }

  Layout:
  [TopToolbar]
  [LeftSidebar] [QuickCustomizePanel?] [Canvas] [LayersPanel?]

  QuickCustomizePanel:
    - Brand color picker (reads from BrandingContext or brandThemeService)
    - Logo upload/placement
    - Primary text overrides (scan canvas for IText objects, show editable fields)
    - Collapse button (dismiss, never shows again for this session)
```

**Example:**
```jsx
// Source: Codebase analysis of FabricSvgEditor.jsx structure
// The panel should be a sibling to LeftSidebar and Canvas, animated with AnimatePresence
import { AnimatePresence, motion } from 'framer-motion';

{showQuickCustomize && (
  <AnimatePresence>
    <motion.div
      key="quick-customize"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="border-r border-gray-700 overflow-hidden flex-shrink-0"
    >
      <QuickCustomizePanel
        canvas={fabricCanvasRef.current}
        onApplyColor={handleApplyBrandColor}
        onPlaceLogo={handlePlaceLogo}
        onDismiss={() => setShowQuickCustomize(false)}
      />
    </motion.div>
  </AnimatePresence>
)}
```

### Pattern 2: Scroll Position Preservation (sessionStorage)
**What:** Save the gallery page scroll position before navigating to the editor, restore it when navigating back.
**When to use:** Every time the user clicks a template card to open the editor.
**Architecture:**
```
SvgTemplateGalleryPage:
  - On mount: check sessionStorage for saved scroll position, restore if present
  - handleTemplateClick: save current scrollTop to sessionStorage before navigating

SvgEditorPage / FabricSvgEditor:
  - handleClose: navigate to 'svg-templates' (already does this)
  - No changes needed on editor side
```

**Example:**
```jsx
// Source: Codebase analysis + web search patterns
const SCROLL_KEY = 'svg-gallery-scroll';

// In SvgTemplateGalleryPage - the scrollable container is "flex-1 overflow-y-auto bg-gray-50"
const mainContentRef = useRef(null);

// Restore scroll on mount
useEffect(() => {
  const savedScroll = sessionStorage.getItem(SCROLL_KEY);
  if (savedScroll && mainContentRef.current) {
    mainContentRef.current.scrollTop = parseInt(savedScroll, 10);
    sessionStorage.removeItem(SCROLL_KEY);
  }
}, [loading]); // After loading completes

// Save scroll before navigating
const handleTemplateClick = (template) => {
  if (mainContentRef.current) {
    sessionStorage.setItem(SCROLL_KEY, String(mainContentRef.current.scrollTop));
  }
  // ... existing sessionStorage + navigate logic
};
```

### Pattern 3: First-Open Detection
**What:** Detect when the editor was opened from a template (vs. opening an existing design) to show the quick-customize panel.
**When to use:** To conditionally show the QuickCustomizePanel only on first open from a template.
**Architecture:**
```
SvgEditorPage:
  - Pass `isFromTemplate: boolean` prop to FabricSvgEditor based on urlTemplateId presence

FabricSvgEditor:
  - New prop: isFromTemplate
  - showQuickCustomize state initialized to isFromTemplate
  - Once dismissed, stays dismissed for this editor session
```

### Anti-Patterns to Avoid
- **Intermediate confirmation modal before opening editor:** FLOW-01 explicitly forbids this. The current code already goes directly to editor -- do not add any modal.
- **Loading template as a flattened image:** FLOW-02 requires fully editable design. The current Fabric.js SVG parser already makes text editable as IText objects. Do not regress to image-based loading.
- **Using React Router for internal navigation:** The app uses state-based routing via `setCurrentPage`. Do not introduce `useNavigate` or `<Link>` for these pages.
- **Storing scroll position in React state:** React state is lost when the component unmounts during navigation. Use sessionStorage instead.
- **Building quick-customize as a separate page/route:** It must be "inside the editor" per FLOW-03.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Panel open/close animation | CSS transition with manual height calculation | Framer Motion AnimatePresence + motion.div | Already used everywhere in the app, handles mount/unmount animations cleanly |
| Brand color/logo data | Custom fetch logic | `getBrandTheme()` from brandThemeService + `useBranding()` from BrandingContext | Both already exist and return the user's brand colors, logo, fonts |
| Color picker UI | Custom color picker component | Reuse `COLOR_PRESETS` array from FabricSvgEditor + existing color button pattern | Already defined in the editor, consistent with existing UX |
| SVG text element discovery | Manual DOM parsing | `fabricCanvasRef.current.getObjects().filter(obj => obj.type === 'i-text')` | Fabric.js already has the parsed objects, just filter by type |

**Key insight:** The FabricSvgEditor already has all the infrastructure for modifying canvas objects (colors, text, adding images). The quick-customize panel is essentially a curated subset of existing editor capabilities, presented in a more guided UX.

## Common Pitfalls

### Pitfall 1: SessionStorage Race Condition on Template Load
**What goes wrong:** Template data is stored in sessionStorage before navigation, but if the editor mounts before sessionStorage write completes, the data might not be there.
**Why it happens:** JavaScript is single-threaded so this shouldn't normally happen, but the existing code already handles this with a fallback error message.
**How to avoid:** The existing pattern (write to sessionStorage, then navigate) is correct. Keep the error handling in SvgEditorPage that catches missing template data.
**Warning signs:** "Template data not found" error appearing intermittently.

### Pitfall 2: Scroll Position Restored Before Content Loads
**What goes wrong:** Scroll position is restored before templates finish loading, so the scroll goes nowhere or goes to wrong position.
**Why it happens:** Templates are fetched async, and the gallery initially shows a skeleton grid. If scroll is restored before content renders, the container height is too small.
**How to avoid:** Restore scroll position AFTER `loading` state becomes false and templates are rendered. Use a `useEffect` that depends on `loading`.
**Warning signs:** User returns to gallery but is at top despite having scrolled down previously.

### Pitfall 3: Quick-Customize Panel Interferes with Canvas Sizing
**What goes wrong:** Adding a panel to the left of the canvas changes available width, causing the canvas to be incorrectly sized or overlapped.
**Why it happens:** FabricSvgEditor uses `containerRef.current.clientWidth` for auto-fit calculations.
**How to avoid:** Trigger a canvas resize recalculation when the quick-customize panel opens or closes. The editor already has a `handleResize` pattern on window resize -- trigger it on panel toggle too.
**Warning signs:** Canvas appears cut off or zoomed incorrectly after panel opens/closes.

### Pitfall 4: Fabric.js Canvas Not Ready When Applying Brand Colors
**What goes wrong:** Quick-customize panel tries to apply brand colors to canvas objects before the SVG template finishes loading.
**Why it happens:** SVG loading is async (`loadSvgContent` + `loadSvgIntoCanvas`), and the panel might render before loading completes.
**How to avoid:** The quick-customize panel should be disabled/show loading state until `isLoading` is false. Gate color/text operations on canvas readiness.
**Warning signs:** "Cannot read properties of null" errors or no visible effect when clicking color buttons.

### Pitfall 5: Losing "isFromTemplate" Signal After Save
**What goes wrong:** User saves the design, but on subsequent opens it's treated as a saved design (not from template), so quick-customize never shows again even if appropriate.
**Why it happens:** Once saved, the design is loaded via `designId` not `templateId`.
**How to avoid:** This is actually correct behavior -- quick-customize should only show on FIRST open from a template. Don't try to persist this state.
**Warning signs:** Quick-customize appearing on every editor open, even for existing designs.

## Code Examples

Verified patterns from the existing codebase:

### Accessing Brand Theme Data
```jsx
// Source: src/services/brandThemeService.js line 375
import { getBrandTheme, DEFAULT_THEME } from '../services/brandThemeService';

// In component init:
const [brandTheme, setBrandTheme] = useState(DEFAULT_THEME);
useEffect(() => {
  getBrandTheme().then(({ data }) => setBrandTheme(data || DEFAULT_THEME));
}, []);

// Brand theme shape:
// {
//   primary_color: '#3B82F6',
//   secondary_color: '#1D4ED8',
//   accent_color: '#10B981',
//   logo_url: '...',
//   font_heading: 'Inter',
//   font_body: 'Inter',
// }
```

### Accessing Branding Context (Logo, Business Name)
```jsx
// Source: src/contexts/BrandingContext.jsx
import { useBranding } from '../contexts/BrandingContext';

// In component:
const { branding } = useBranding();
// branding.logoUrl - user's logo URL
// branding.primaryColor - user's primary brand color
// branding.businessName - user's business name
```

### Applying Color to All Matching Canvas Objects
```jsx
// Source: FabricSvgEditor.jsx pattern for canvas object manipulation
function applyBrandColorToCanvas(canvas, oldColor, newColor) {
  canvas.getObjects().forEach((obj) => {
    if (obj.fill === oldColor) {
      obj.set('fill', newColor);
    }
    if (obj.stroke === oldColor) {
      obj.set('stroke', newColor);
    }
  });
  canvas.renderAll();
}
```

### Getting Editable Text Elements from Canvas
```jsx
// Source: FabricSvgEditor.jsx pattern
function getEditableTexts(canvas) {
  return canvas.getObjects()
    .filter(obj => obj.type === 'i-text' || obj.type === 'textbox')
    .map(obj => ({
      id: obj.id,
      name: obj.name,
      text: obj.text,
      fontFamily: obj.fontFamily,
      fontSize: obj.fontSize,
      fill: obj.fill,
    }));
}
```

### Adding Logo Image to Canvas
```jsx
// Source: FabricSvgEditor.jsx handleImageFileChange pattern (line 770)
import * as fabric from 'fabric';

async function addLogoToCanvas(canvas, logoUrl, canvasWidth, canvasHeight) {
  const img = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: 'anonymous' });
  const maxWidth = canvasWidth * 0.2; // Logo at 20% of canvas width
  const maxHeight = canvasHeight * 0.15;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

  img.set({
    left: 40, // Top-left corner with padding
    top: 40,
    scaleX: scale,
    scaleY: scale,
    id: `logo-${Date.now()}`,
    name: 'Brand Logo',
  });

  canvas.add(img);
  canvas.renderAll();
}
```

### Existing handleTemplateClick in Gallery
```jsx
// Source: src/pages/SvgTemplateGalleryPage.jsx line 224
const handleTemplateClick = (template) => {
  const templateData = {
    id: template.id,
    name: template.name,
    svgUrl: template.svgUrl || template.svg_url,
    svgContent: template.svgContent,
    width: template.width || 1920,
    height: template.height || 1080,
    originalWidth: template.originalWidth,
    originalHeight: template.originalHeight,
  };
  sessionStorage.setItem('pendingTemplate', JSON.stringify(templateData));
  onNavigate?.(`svg-editor?templateId=${template.id}`);
};
```

### Existing Close Handler in SvgEditorPage
```jsx
// Source: src/pages/SvgEditorPage.jsx line 176
const handleClose = () => {
  onNavigate?.('svg-templates');
};
// Note: 'svg-templates' maps to SvgTemplateGalleryPage in App.jsx pages object
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Confirmation modal before editor | Direct click-to-editor | Phase 48 requirement | FLOW-01 demands no intermediate modals |
| Template as flattened image | SVG parsed into editable Fabric.js objects | Already implemented | FLOW-02 already satisfied by existing code |
| No brand customization in editor | Quick-customize panel on first open | Phase 48 new | FLOW-03 adds guided brand override UX |
| Lost position on back navigation | sessionStorage scroll preservation | Phase 48 new | FLOW-04 preserves browse context |

**Already working (verify, do not break):**
- Template click goes directly to FabricSvgEditor (no intermediate modal)
- SVG templates are parsed into editable Fabric.js IText objects (not flattened)
- Close button in editor navigates back to 'svg-templates' page

## Open Questions

1. **Quick-customize panel placement: left or right?**
   - What we know: FabricSvgEditor has a LeftSidebar (tools) and optional panels (Effects, Filters, Animate, Position) that appear between sidebar and canvas. LayersPanel appears on the right.
   - What's unclear: Whether the quick-customize panel should follow the existing left-panel pattern or appear on the right
   - Recommendation: Use the right side (similar to LayersPanel position) since it's for property editing, not tool selection. This also avoids conflicting with the existing LeftSidebar.

2. **Brand data source: BrandingContext vs. brandThemeService?**
   - What we know: BrandingContext provides `branding.logoUrl`, `branding.primaryColor`. brandThemeService provides `getBrandTheme()` which returns more detailed theme data (6 colors, fonts, etc.)
   - What's unclear: Which level of detail the quick-customize panel needs
   - Recommendation: Use `getBrandTheme()` for richer data (primary, secondary, accent colors + fonts). Fall back to BrandingContext for logo URL since it's already loaded.

3. **Should quick-customize auto-apply brand colors or just offer them?**
   - What we know: FLOW-03 says "brand color, logo, and text overrides" -- suggesting user control
   - What's unclear: Whether colors should be auto-applied on template load or offered as clickable options
   - Recommendation: Offer as clickable options (not auto-apply). Auto-applying would change the template before the user sees it, which could be confusing.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/pages/SvgTemplateGalleryPage.jsx` -- template browse page, click handling, sessionStorage pattern
- Codebase analysis: `src/pages/SvgEditorPage.jsx` -- editor page wrapper, template loading from sessionStorage
- Codebase analysis: `src/components/svg-editor/FabricSvgEditor.jsx` -- Fabric.js editor, SVG loading, canvas manipulation
- Codebase analysis: `src/App.jsx` -- state-based routing, page mounting, navigation flow
- Codebase analysis: `src/services/brandThemeService.js` -- brand theme CRUD, getBrandTheme()
- Codebase analysis: `src/contexts/BrandingContext.jsx` -- branding context provider
- Codebase analysis: `src/design-system/motion.js` -- motion presets including AnimatePresence patterns
- Codebase analysis: `src/design-system/components/TemplateCard.jsx` -- TemplateCard with cardLift preset

### Secondary (MEDIUM confidence)
- [Framer Motion Layout Animations](https://motion.dev/docs/react-layout-animations) -- AnimatePresence for panel mount/unmount
- [React Router ScrollRestoration](https://reactrouter.com/api/components/ScrollRestoration) -- sessionStorage pattern for scroll preservation
- [Scroll Restoration in SPAs](https://www.davidtran.dev/blogs/scroll-restoration-in-spas) -- manual scroll restoration with sessionStorage

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, verified via package.json and codebase analysis
- Architecture: HIGH - full flow traced through codebase from gallery click to editor render to back navigation
- Pitfalls: HIGH - identified from actual code patterns (canvas resize, async loading, sessionStorage timing)
- Quick-customize panel: MEDIUM - new component, but built from well-understood primitives (Framer Motion, Fabric.js API, existing brand services)

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable technology, no fast-moving dependencies)
