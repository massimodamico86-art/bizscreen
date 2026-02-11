# Phase 49: Stock Assets in Editor - Research

**Researched:** 2026-02-10
**Domain:** FabricSvgEditor panel integration, Unsplash proxy consumption, Iconify icon search API, media library in-editor browsing, HTML5 drag-and-drop to canvas
**Confidence:** HIGH

## Summary

Phase 49 integrates three asset sources -- Unsplash stock photos, searchable icons, and the user's uploaded media library -- into the FabricSvgEditor's LeftSidebar. The editor already has placeholder panels for Photos (PANELS.PHOTOS) and Elements (PANELS.ELEMENTS) in the LeftSidebar, plus a working `handleAddImageFromUrl` callback that loads images onto the Fabric.js canvas via `fabric.FabricImage.fromURL()`. The Phase 46 `unsplashProxyService.js` provides a ready-to-use `searchPhotos()` and `trackDownload()` API. The primary work is: (1) replacing the LeftSidebar's hardcoded Unsplash API key with the proxy service, (2) adding TOS-compliant attribution UI, (3) integrating the Iconify public API for searchable icons, (4) adding a "My Media" panel backed by the existing `mediaService.fetchMediaAssets()`, and (5) implementing HTML5 native drag-and-drop from sidebar panels onto the canvas.

**Critical finding:** The LeftSidebar currently contains a **hardcoded Unsplash API key** (`vWbf4D7AsEBx99UbqXK_Bf7Uv1rAfkLFc7PWqjDrSls`) that makes direct browser-side API calls (line 255 of `LeftSidebar.jsx`). This is a security and TOS violation that Phase 49 MUST replace with the proxy service. No attribution is shown, no download tracking fires, and the key is exposed in client-side code.

**Target editor:** FabricSvgEditor (Fabric.js 6.9), NOT the Polotno editor. While the ROADMAP says "Polotno editor," Phases 47-48 built the entire template flow on FabricSvgEditor with its LeftSidebar panel system. The Polotno editor (DesignEditorPage) is a separate iframe-based editor that communicates via postMessage. Phase 49 work targets the FabricSvgEditor LeftSidebar where the existing Photos, GIPHY, and Elements panels live.

**Primary recommendation:** Refactor the existing LeftSidebar Photos panel to use `unsplashProxyService`, add attribution and download tracking. Add a new "My Media" panel using `fetchMediaAssets()`. Replace the hardcoded icon set with Iconify API search. Implement HTML5 native drag-and-drop (not dnd-kit) for panel-to-canvas asset insertion, since Fabric.js canvases require native `drop` events with coordinate mapping.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fabric | ^6.9.0 | Canvas rendering, image/SVG insertion | Already the editor engine; `FabricImage.fromURL()` and `loadSVGFromString()` handle all asset types |
| unsplashProxyService | N/A (local) | Search Unsplash photos, track downloads via Edge Function | Built in Phase 46; replaces hardcoded API key; TOS-compliant |
| mediaService | N/A (local) | Fetch user's uploaded media from `media_assets` table | Already exists; `fetchMediaAssets()` supports pagination, type filtering, search |
| Iconify Public API | REST | Searchable icon library (200k+ icons, 200+ sets) | Free, no API key needed, returns SVG data directly, no new dependency |
| lucide-react | ^0.548.0 | UI icons for panel chrome (Search, Image, etc.) | Already used throughout the editor |
| framer-motion | ^12.23.24 | Panel animations | Already used for QuickCustomizePanel AnimatePresence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop (existing) | NOT for this phase -- dnd-kit is used for schedule blocks, not canvas drops |
| HTML5 Drag and Drop API | Native | Drag from sidebar panel to canvas | Required because Fabric.js canvas needs native `drop` events with coordinate mapping |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Iconify API | Lucide icons only | Lucide has ~1500 icons (React components, not searchable API). Iconify has 200k+ with search API. But Iconify adds external API dependency. |
| Iconify API | Font Awesome CDN | Font Awesome Free has ~2000 icons, similar search capability, but Iconify aggregates many sets and is free/open |
| HTML5 native DnD | dnd-kit | dnd-kit is already installed but designed for React-to-React drag operations. Canvas drops need native HTML5 events to get correct coordinates. dnd-kit cannot target a `<canvas>` element. |
| Separate My Media panel | Reuse Photos panel with tabs | Tabs would conflate external stock with user uploads. Separate panel is cleaner and matches OptiSigns-style sidebar. |

### No New Installation Required
Zero new npm packages. The Iconify API is called via `fetch()`. All other dependencies are already installed.

## Architecture Patterns

### Existing LeftSidebar Panel System
```
LeftSidebar.jsx
  PANELS = {
    TEMPLATES, WIDGETS, PHOTOS, GIPHY, REPEATERS,
    TEXT, ELEMENTS, QR_CODE, DATASOURCE, BRAND_KIT
  }

  navItems[] -> icon buttons on left rail (w-14)
  activePanel -> expanded content panel (w-80)
  renderPanelContent() -> switch on activePanel

  Callbacks from FabricSvgEditor:
    onAddShape, onAddText, onAddImage (URL), onAddIcon,
    onAddQRCode, onAddWidget, onSelectTemplate, onSaveAsTemplate
```

### Recommended Changes
```
LeftSidebar.jsx
  PANELS += { MY_MEDIA: 'mymedia' }   // New panel

  navItems[] += { id: PANELS.MY_MEDIA, icon: FolderOpen, label: 'My Media' }

  PHOTOS panel: Replace direct Unsplash API with unsplashProxyService
  ELEMENTS panel: Replace hardcoded ICON_ELEMENTS with Iconify API search
  MY_MEDIA panel: New panel using fetchMediaAssets()

  All panels: Add draggable="true" + ondragstart to asset thumbnails

  New callbacks from FabricSvgEditor:
    onAddImageAtPosition(url, x, y)  // For drag-and-drop with coordinates
```

### Pattern 1: Unsplash Proxy Integration (Photos Panel)
**What:** Replace the hardcoded Unsplash API key with the `searchPhotos()` proxy service. Show attribution. Fire `trackDownload()` on selection.
**When to use:** Photos panel search and photo selection.
**Why:** Current code exposes the API key in the browser and violates all four Unsplash TOS requirements (no attribution, no download tracking, browser-side key, no UTM links).

```jsx
// Source: Codebase analysis -- LeftSidebar.jsx Photos panel refactor
import { searchPhotos, trackDownload } from '../../services/unsplashProxyService.js';

// In Photos panel search handler:
const handleSearchPhotos = async (query) => {
  setLoadingPhotos(true);
  try {
    const { photos, pagination } = await searchPhotos(query, {
      perPage: 20,
      orientation: 'landscape',
    });
    setPhotos(photos);
  } catch (error) {
    logger.error('Unsplash search failed', { error });
    setPhotos([]);
  } finally {
    setLoadingPhotos(false);
  }
};

// Photo grid item with attribution:
<div className="relative group">
  <img src={photo.urls.thumb} alt={photo.description} />
  {/* TOS-required attribution overlay */}
  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[9px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
    <a href={photo.attribution.photographer.profile_url} target="_blank" rel="noopener noreferrer">
      {photo.attribution.photographer.name}
    </a>
  </div>
</div>

// On photo selection -- fire download tracking:
const handleSelectPhoto = (photo) => {
  trackDownload(photo.id, photo.download_tracking_url);
  onAddImage?.(photo.urls.regular); // Insert onto canvas
};
```

### Pattern 2: Iconify API Search (Icons Panel)
**What:** Replace hardcoded `ICON_ELEMENTS` array with Iconify API-backed search. User types keyword, gets SVG icons from 200+ sets.
**When to use:** Elements panel icon section.
**Why:** Current hardcoded set has only ~15 icons using emoji as fallback. Iconify provides 200k+ searchable SVGs with no API key needed.

```jsx
// Source: Iconify API docs (https://iconify.design/docs/api/search.html)
const ICONIFY_API = 'https://api.iconify.design';

async function searchIcons(query, limit = 64) {
  const url = `${ICONIFY_API}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Icon search failed');
  return response.json();
  // Returns: { icons: ['mdi:home', 'fa:home', ...], total, collections }
}

// Get SVG for a specific icon:
function getIconSvgUrl(iconName) {
  // iconName format: "prefix:name" e.g. "mdi:home"
  const [prefix, name] = iconName.split(':');
  return `${ICONIFY_API}/${prefix}/${name}.svg?height=128`;
}

// Insert icon as SVG image on canvas:
const handleInsertIcon = async (iconName) => {
  const svgUrl = getIconSvgUrl(iconName);
  onAddImage?.(svgUrl); // Uses existing handleAddImageFromUrl
};
```

### Pattern 3: My Media Panel (User Uploads)
**What:** New sidebar panel showing the user's uploaded media from the `media_assets` database table.
**When to use:** When user clicks "My Media" in the sidebar nav.
**Why:** ASSET-05 requires users to browse their uploaded media inside the editor. The `fetchMediaAssets()` service already exists with pagination, search, and type filtering.

```jsx
// Source: mediaService.js fetchMediaAssets
import { fetchMediaAssets, MEDIA_TYPES } from '../../services/mediaService.js';

// In My Media panel:
const [myMedia, setMyMedia] = useState([]);
const [mediaPage, setMediaPage] = useState(1);

useEffect(() => {
  if (activePanel !== PANELS.MY_MEDIA) return;
  const timer = setTimeout(async () => {
    try {
      const { data } = await fetchMediaAssets({
        type: MEDIA_TYPES.IMAGE, // Only images for the editor
        search: searchQuery || undefined,
        page: mediaPage,
        pageSize: 30,
      });
      setMyMedia(data);
    } catch (err) {
      logger.error('Failed to fetch media', { error: err });
    }
  }, 300);
  return () => clearTimeout(timer);
}, [activePanel, searchQuery, mediaPage]);
```

### Pattern 4: HTML5 Native Drag-and-Drop to Canvas
**What:** Enable dragging asset thumbnails from sidebar panels and dropping them onto the Fabric.js canvas at the desired position.
**When to use:** For all asset panels (Unsplash, icons, My Media).
**Why:** ASSET-06 requires drag-and-drop insertion. Fabric.js requires native HTML5 `drop` events to get correct canvas coordinates. The existing `@dnd-kit/core` library is designed for React-to-React drag operations and cannot target a raw `<canvas>` element.

**Sidebar (drag source):**
```jsx
// Each asset thumbnail gets native drag attributes:
<img
  src={photo.urls.thumb}
  alt={photo.description}
  draggable="true"
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', photo.urls.regular);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'unsplash',
      url: photo.urls.regular,
      id: photo.id,
      downloadTrackingUrl: photo.download_tracking_url,
      name: photo.description || 'Unsplash Photo',
    }));
  }}
/>
```

**Canvas container (drop target) -- in FabricSvgEditor.jsx:**
```jsx
// On the canvas container div:
<div
  ref={containerRef}
  onDragOver={(e) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'copy';
  }}
  onDrop={(e) => {
    e.preventDefault();
    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) return;

    const asset = JSON.parse(jsonData);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Convert drop position to canvas coordinates
    const canvasEl = canvas.getElement();
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Fire download tracking for Unsplash photos
    if (asset.type === 'unsplash' && asset.downloadTrackingUrl) {
      trackDownload(asset.id, asset.downloadTrackingUrl);
    }

    // Load and place image at drop position
    fabric.FabricImage.fromURL(asset.url, { crossOrigin: 'anonymous' })
      .then((img) => {
        const maxWidth = canvasWidth * 0.4;
        const maxHeight = canvasHeight * 0.4;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        img.set({
          left: x - (img.width * scale) / 2,
          top: y - (img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          id: `${asset.type}-${Date.now()}`,
          name: asset.name || 'Dropped Asset',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
  }}
>
```

### Pattern 5: Inserting SVG Icons as Fabric Objects
**What:** Insert Iconify SVG icons as vector objects (not rasterized images) onto the Fabric.js canvas.
**When to use:** When user clicks an icon in the Elements panel.
**Why:** SVG icons should remain vector for infinite scaling. Fabric.js `loadSVGFromString` parses SVG into native Fabric objects.

```jsx
// Source: Fabric.js 6 SVG API + Iconify SVG endpoint
async function insertSvgIcon(canvas, iconName, x, y) {
  const [prefix, name] = iconName.split(':');
  const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?height=128&color=%23333333`;

  // Fetch SVG string
  const response = await fetch(svgUrl);
  const svgString = await response.text();

  // Parse SVG into Fabric objects
  const result = await fabric.loadSVGFromString(svgString);
  const objects = result.objects || [];

  if (objects.length === 0) return;

  // Group SVG elements
  const group = new fabric.Group(objects, {
    left: x || canvas.width / 2 - 64,
    top: y || canvas.height / 2 - 64,
    id: `icon-${Date.now()}`,
    name: `Icon: ${name}`,
  });

  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.renderAll();
}
```

### Anti-Patterns to Avoid
- **Exposing Unsplash API key in client code:** The current LeftSidebar has a hardcoded key on line 255. Remove it completely. Use only the proxy service.
- **Omitting Unsplash attribution:** TOS requires "Photo by [Name] on Unsplash" with UTM links. The proxy service returns pre-formatted attribution.
- **Forgetting download tracking on drag-and-drop:** `trackDownload()` must fire when a photo is dropped onto the canvas, not just when clicked.
- **Using dnd-kit for canvas drops:** dnd-kit uses React synthetic events and cannot handle `<canvas>` element drops. Use native HTML5 drag-and-drop.
- **Rasterizing SVG icons:** Loading SVG icons via `FabricImage.fromURL()` rasterizes them. Use `loadSVGFromString()` to keep them as vector paths.
- **Making Iconify API calls without debouncing:** Each keystroke would fire an API call. Debounce at 300ms minimum (the existing pattern in LeftSidebar).
- **Loading full-resolution images for thumbnails:** Unsplash provides `urls.thumb` (200px) for grid display and `urls.regular` (1080px) for canvas insertion. Use the appropriate size.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stock photo search | Direct Unsplash API calls | `unsplashProxyService.searchPhotos()` | Key security, caching, rate limiting, TOS compliance |
| Download tracking | Manual fetch to Unsplash API | `unsplashProxyService.trackDownload()` | Fire-and-forget pattern, error handling, logging |
| Icon search | Static array of icons | Iconify REST API (`/search?query=...`) | 200k+ searchable icons vs 15 hardcoded ones |
| SVG icon rendering | Canvas text with emoji fallback | Iconify SVG endpoint + `loadSVGFromString` | Proper vector icons instead of emoji approximations |
| Media browsing | New database query | `mediaService.fetchMediaAssets()` | Already has pagination, type filtering, search, RLS |
| Image loading | Manual XHR + Image constructor | `fabric.FabricImage.fromURL(url, { crossOrigin })` | Handles CORS, scaling, error callbacks |
| Search debouncing | Custom debounce function | `useEffect` + `setTimeout` pattern (already in LeftSidebar) | Proven pattern, cleanup on unmount |

**Key insight:** The LeftSidebar already has the panel system, search debouncing, and image loading patterns. Phase 49 is primarily about swapping data sources (proxy instead of direct API, Iconify instead of static array, fetchMediaAssets instead of nothing) and adding drag-and-drop.

## Common Pitfalls

### Pitfall 1: Forgetting Unsplash Download Tracking on Drag-and-Drop
**What goes wrong:** Download tracking fires when user clicks a photo to insert it, but NOT when they drag-and-drop it onto the canvas. This violates Unsplash TOS.
**Why it happens:** Click handler and drag-and-drop handler are separate code paths. The `onDragStart` handler sets up data transfer but does not trigger the download. The `onDrop` handler inserts the image but might not call `trackDownload()`.
**How to avoid:** Pass the `download_tracking_url` in the drag data transfer JSON. In the drop handler, check for `asset.type === 'unsplash'` and call `trackDownload()` before inserting the image.
**Warning signs:** Photos appearing on canvas without corresponding download tracking calls in the console/logs.

### Pitfall 2: Canvas Coordinate Mismatch with Zoom
**What goes wrong:** User drops an asset on the canvas but it appears at the wrong position -- offset from where they dropped it.
**Why it happens:** The canvas is rendered with CSS transform `scale(${zoom})` but the `<canvas>` element's internal coordinate system doesn't know about this. Drop event coordinates are in screen space, not canvas space.
**How to avoid:** Convert screen coordinates to canvas coordinates: divide `(e.clientX - rect.left)` by `zoom` and similarly for Y. The `rect` should be from the `<canvas>` element's `getBoundingClientRect()`, not the container div.
**Warning signs:** Dropped images appear correctly at 100% zoom but are offset at other zoom levels.

### Pitfall 3: CORS Errors Loading Iconify SVGs
**What goes wrong:** `fabric.FabricImage.fromURL()` or `loadSVGFromString()` fails with CORS error when loading from Iconify CDN.
**Why it happens:** Fabric.js may try to taint the canvas when loading external URLs without proper CORS headers. Iconify CDN supports CORS, but the `crossOrigin` attribute must be set.
**How to avoid:** For SVG icons, fetch the SVG string via `fetch()` (which handles CORS via browser) and then use `loadSVGFromString()`. Do NOT use `loadSVGFromURL()` which can have CORS issues. For images, always pass `{ crossOrigin: 'anonymous' }` to `FabricImage.fromURL()`.
**Warning signs:** Icons work in the search grid (as `<img>` tags) but fail when inserted onto the canvas.

### Pitfall 4: Unsplash Photo Grid Missing Attribution
**What goes wrong:** Photos show in the search grid but no photographer name is displayed. This violates Unsplash TOS.
**Why it happens:** The current Photos panel only shows `<img>` tags with no attribution overlay. The proxy service returns attribution data but the UI must render it.
**How to avoid:** Each photo thumbnail must show photographer name (at minimum on hover). The proxy service returns `photo.attribution.photographer.name` and `photo.attribution.photographer.profile_url` with UTM parameters already included.
**Warning signs:** Photo grid that looks like anonymous image search results.

### Pitfall 5: My Media Panel Loading All Types
**What goes wrong:** My Media panel shows videos, documents, and apps alongside images. User tries to insert a video and gets an error or blank canvas object.
**Why it happens:** `fetchMediaAssets()` returns all media types by default.
**How to avoid:** Filter by `type: MEDIA_TYPES.IMAGE` when fetching for the editor panel. Only images (and potentially SVGs) can be inserted onto the Fabric.js canvas. Videos and other types are not supported.
**Warning signs:** Non-image assets appearing in the editor's media browser.

### Pitfall 6: Iconify API Rate Limiting
**What goes wrong:** Rapid typing triggers many API calls. The Iconify public API may rate-limit or return errors.
**Why it happens:** No debouncing on search input, or debounce too short.
**How to avoid:** Use 300-500ms debounce (the existing LeftSidebar pattern uses 500ms for photo search). Cache recent search results in component state. Show loading spinner during search.
**Warning signs:** API returning 429 errors or empty results intermittently.

### Pitfall 7: Large SVG Icons Causing Performance Issues
**What goes wrong:** Complex SVG icons (emoji sets, detailed illustrations) with many paths slow down the canvas when inserted via `loadSVGFromString`.
**Why it happens:** Some Iconify icon sets (e.g., `noto`, `twemoji`, `fluent-emoji-flat`) contain very complex SVGs with hundreds of paths.
**How to avoid:** Limit icon search to simpler icon sets by default (e.g., `mdi`, `fa-solid`, `lucide`, `tabler`). Or load complex icons as rasterized images via `FabricImage.fromURL()` instead of parsing as SVG paths. Consider adding a `prefixes` parameter to limit search scope.
**Warning signs:** Canvas becoming sluggish after inserting certain icons. Long delay between clicking an icon and it appearing on canvas.

## Code Examples

Verified patterns from the existing codebase:

### Existing Image-from-URL Handler (FabricSvgEditor.jsx line 1081)
```jsx
// Source: FabricSvgEditor.jsx -- handleAddImageFromUrl
const handleAddImageFromUrl = useCallback((url) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || !url) return;

  fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
    const maxWidth = canvasWidth * 0.5;
    const maxHeight = canvasHeight * 0.5;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

    img.set({
      left: canvasWidth / 2 - (img.width * scale) / 2,
      top: canvasHeight / 2 - (img.height * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      id: `image-${Date.now()}`,
      name: 'Stock Photo',
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    setHasUnsavedChanges(true);
    syncCanvasObjects();
  }).catch((err) => {
    logger.error('Failed to load image', { error: err });
    showToast?.('Failed to load image', 'error');
  });
}, [canvasWidth, canvasHeight, syncCanvasObjects, showToast, logger]);
```

### Existing LeftSidebar Photo Search (currently hardcoded key)
```jsx
// Source: LeftSidebar.jsx line 255-323 -- REPLACE THIS
// Current code uses hardcoded UNSPLASH_ACCESS_KEY = 'vWbf4D7AsEBx99UbqXK_Bf7Uv1rAfkLFc7PWqjDrSls'
// and makes direct browser-side API calls to api.unsplash.com
// This MUST be replaced with unsplashProxyService.searchPhotos()
```

### Existing UnsplashProxyService (Phase 46 output)
```jsx
// Source: src/services/unsplashProxyService.js
import { searchPhotos, trackDownload } from '../services/unsplashProxyService.js';

// Search:
const { photos, pagination, cached } = await searchPhotos('coffee shop', {
  page: 1,
  perPage: 20,
  orientation: 'landscape',
});

// Each photo has:
// photo.id, photo.urls.{thumb, small, regular, full, raw}
// photo.attribution.photographer.{name, username, profile_url}
// photo.attribution.html (pre-formatted attribution HTML)
// photo.download_tracking_url

// Track download (fire-and-forget):
trackDownload(photo.id, photo.download_tracking_url);
```

### Existing MediaService (fetchMediaAssets)
```jsx
// Source: src/services/mediaService.js
import { fetchMediaAssets, MEDIA_TYPES } from '../../services/mediaService.js';

const { data, totalCount, page, totalPages } = await fetchMediaAssets({
  type: MEDIA_TYPES.IMAGE,
  search: 'logo',
  page: 1,
  pageSize: 30,
});

// Each media asset has:
// asset.id, asset.name, asset.url, asset.thumbnail_url
// asset.type ('image'|'video'|'audio'|'document')
// asset.width, asset.height, asset.file_size
```

### Iconify API Usage (no dependency needed)
```jsx
// Search icons:
const response = await fetch('https://api.iconify.design/search?query=home&limit=64');
const { icons, total, collections } = await response.json();
// icons: ['mdi:home', 'fa-solid:home', 'lucide:home', ...]

// Get SVG for display in search results:
// <img src="https://api.iconify.design/mdi/home.svg?height=48" />

// Get SVG string for Fabric.js insertion:
const svgResponse = await fetch('https://api.iconify.design/mdi/home.svg?height=128&color=%23333333');
const svgString = await svgResponse.text();
const result = await fabric.loadSVGFromString(svgString);
const group = new fabric.Group(result.objects, { left: 100, top: 100 });
canvas.add(group);
```

### LeftSidebar Panel Navigation Pattern
```jsx
// Source: LeftSidebar.jsx -- navItems array and panel rendering
const navItems = [
  { id: PANELS.TEMPLATES, icon: LayoutTemplate, label: 'Templates' },
  { id: PANELS.WIDGETS, icon: Grid3X3, label: 'Widgets' },
  { id: PANELS.PHOTOS, icon: Image, label: 'Photos' },
  // ... other panels
  { id: PANELS.MY_MEDIA, icon: FolderOpen, label: 'My Media' }, // NEW
];

// Panel content rendered via switch:
case PANELS.MY_MEDIA:
  return <MyMediaPanelContent />;
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 49) | Impact |
|------------------------|------------------------|--------|
| Hardcoded Unsplash API key in browser | Proxy service via Edge Function | Security fix + TOS compliance |
| No photographer attribution | Attribution overlay on hover | TOS compliance |
| No download tracking | `trackDownload()` on select/drop | TOS compliance |
| ~15 hardcoded emoji icons | Iconify API with 200k+ searchable SVG icons | Dramatically better icon experience |
| No media library in editor | fetchMediaAssets() with search + pagination | Users can reuse their uploads |
| Click-only asset insertion | Click + drag-and-drop to specific canvas position | ASSET-06 requirement |
| Lorem Picsum fallback images | Graceful error message on proxy failure | No misleading placeholder images |

**Deprecated/outdated:**
- `unsplash-js` npm package: Archived January 2026. The proxy uses raw `fetch()`. (Phase 46 decision)
- Direct browser-side Unsplash API calls: Must be replaced with proxy for key security.
- Emoji-based icon rendering (e.g., `'clock': '🕐'`): Replace with proper SVG icons from Iconify.

## File Inventory (Files to Modify)

### Must Modify
| File | Changes |
|------|---------|
| `src/components/svg-editor/LeftSidebar.jsx` | (1) Remove hardcoded Unsplash API key. (2) Replace Photos panel with proxy service + attribution. (3) Replace Elements icon section with Iconify search. (4) Add My Media panel. (5) Add `draggable` + `onDragStart` to all asset thumbnails. |
| `src/components/svg-editor/FabricSvgEditor.jsx` | (1) Add `onDragOver` + `onDrop` to canvas container div. (2) Add new handler `handleAddImageAtPosition(url, x, y, metadata)`. (3) Import `trackDownload` for drag-and-drop Unsplash photos. |

### May Modify
| File | Changes |
|------|---------|
| `src/components/svg-editor/TopToolbar.jsx` | Potentially add "Insert Stock Photo" or "Insert Icon" shortcut buttons |

### No New Files Required
All functionality fits within existing files. The LeftSidebar already has the panel infrastructure; the new My Media panel is just a new case in the `renderPanelContent()` switch statement.

## Open Questions

1. **Iconify API dependency for production**
   - What we know: Iconify public API is free to use at `https://api.iconify.design`. It hosts 200k+ icons.
   - What's unclear: Whether the public API has rate limits or uptime SLAs for production use. Iconify recommends self-hosting the API for production applications.
   - Recommendation: Start with the public API. If rate limiting becomes an issue, consider self-hosting or falling back to a curated subset of Lucide icons. The public API appears stable and widely used.

2. **Icon set filtering for performance**
   - What we know: Iconify has 200+ icon sets. Some (noto, twemoji) have very complex SVGs.
   - What's unclear: Whether to allow searching all icon sets or restrict to a curated list.
   - Recommendation: Default search across popular sets (`mdi`, `fa-solid`, `lucide`, `tabler`, `heroicons`) using the `prefixes` parameter. Allow "all icons" as an option. Complex emoji sets should load as rasterized images, not parsed SVG.

3. **Polotno editor integration scope**
   - What we know: The ROADMAP says "Polotno editor" but all Phase 47-48 work targeted FabricSvgEditor. Polotno runs in an isolated iframe and communicates via postMessage.
   - What's unclear: Whether Phase 49 should also add stock assets to the Polotno editor (DesignEditorPage).
   - Recommendation: Scope Phase 49 to FabricSvgEditor only. Polotno integration would require building panels inside the iframe's React 18 environment, which is a separate and larger effort. The FabricSvgEditor is where the template flow (Phases 47-48) lands users.

4. **Drag-and-drop visual feedback**
   - What we know: HTML5 drag-and-drop supports `dragImage` for custom drag previews and `dragover` for drop zone highlighting.
   - What's unclear: How much visual polish to invest in the drag feedback (ghost preview, canvas highlight border, drop position indicator).
   - Recommendation: Start with basic drag feedback (browser default drag ghost + canvas border highlight on dragover). Polish in Phase 50 (Editor Polish) if needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/svg-editor/LeftSidebar.jsx` -- Current Photos panel with hardcoded Unsplash key (line 255), Elements panel with hardcoded icons, panel system architecture
- Codebase analysis: `src/components/svg-editor/FabricSvgEditor.jsx` -- Canvas container, `handleAddImageFromUrl`, zoom handling, layout structure
- Codebase analysis: `src/services/unsplashProxyService.js` -- Phase 46 output, `searchPhotos()` and `trackDownload()` API
- Codebase analysis: `src/services/mediaService.js` -- `fetchMediaAssets()`, `MEDIA_TYPES`, pagination support
- Phase 46 Research: `.planning/phases/46-unsplash-proxy-infrastructure/46-RESEARCH.md` -- Unsplash TOS compliance requirements, proxy architecture
- Phase 48 Research: `.planning/phases/48-template-to-editor-flow/48-RESEARCH.md` -- FabricSvgEditor structure, panel system, Fabric.js patterns
- [Iconify API Search docs](https://iconify.design/docs/api/search.html) -- Search endpoint, parameters, response format
- [Iconify SVG Generation docs](https://iconify.design/docs/api/svg.html) -- SVG endpoint URL pattern, parameters (color, height, flip, rotate)
- [Iconify Icon Data docs](https://iconify.design/docs/api/icon-data.html) -- JSON icon data endpoint, response format with SVG body

### Secondary (MEDIUM confidence)
- [Fabric.js SVG loading](https://fabricjs.com/docs/old-docs/fabric-intro-part-3/) -- `loadSVGFromString`, `groupSVGElements` patterns
- [Fabric.js GitHub](https://github.com/kangax/fabric.js/) -- Confirmed v6 uses promise-based SVG loading
- [HTML5 Drag and Drop + Fabric.js patterns](https://github.com/fabricjs/fabric.js/issues/4730) -- Community patterns for drop-to-canvas with coordinate handling
- [Iconify GitHub](https://github.com/iconify/iconify) -- Confirmed 200k+ icons, 200+ sets, open source

### Tertiary (LOW confidence)
- Iconify public API rate limits: Not documented explicitly. The API docs say "servers are free to use" but mention running them "is not free." Self-hosting may be needed for high-volume production use.
- Complex SVG performance in Fabric.js: Anecdotal from GitHub issues. Needs testing with actual icon sets to determine threshold.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed, proxy service built and tested in Phase 46
- Architecture: HIGH -- LeftSidebar panel system is well-understood, existing patterns for all operations
- Unsplash integration: HIGH -- Proxy service ready, TOS requirements documented in Phase 46
- Iconify integration: MEDIUM -- Public API is well-documented but external dependency with unclear production SLAs
- Drag-and-drop: MEDIUM -- Pattern is well-known but canvas coordinate mapping with zoom needs careful implementation
- My Media panel: HIGH -- Uses existing `fetchMediaAssets()` service with no new infrastructure

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable APIs and libraries)
