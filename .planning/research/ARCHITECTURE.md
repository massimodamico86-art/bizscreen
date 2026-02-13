# Architecture Patterns: Display Toolkit (v3.2)

**Domain:** Digital signage display capability features
**Researched:** 2026-02-13
**Confidence:** HIGH (based on thorough codebase analysis of existing patterns)

## Existing Architecture Summary

Before defining new components, here is the existing architecture that new features MUST integrate with:

### Widget Registration Pattern (3 touch points)
Every widget follows a consistent 3-layer pattern:

1. **Editor Mock Preview** -- `src/components/layout-editor/LayoutElementRenderer.jsx`
   - `WidgetElement` switch statement dispatches by `widgetType`
   - Shows static/mock preview in editor canvas (no live data fetching)

2. **Editor Config UI** -- `src/components/layout-editor/LayoutPropertiesPanel.jsx`
   - `WidgetControls` renders type-specific property editors
   - Widget type selector grid + per-type config sections

3. **Live Player Rendering** -- `src/player/components/SceneRenderer.jsx`
   - `SceneWidgetRenderer` switch dispatches to real widget components
   - Widgets use `useWidgetData()` hook for orchestrator integration
   - `DataRefreshProvider` wraps the scene tree

### Widget Data Flow
```
Editor (design-time):
  LeftSidebar.handleAddWidget(widgetType)
    -> creates element { type: 'widget', widgetType, props }
    -> LayoutEditorCanvas renders LayoutElementRenderer (mock preview)
    -> LayoutPropertiesPanel shows WidgetControls (config UI)
    -> Save to Supabase layouts/scenes table as JSON

Player (runtime):
  SceneRenderer wraps in DataRefreshProvider
    -> SceneBlock renders SceneWidgetRenderer
    -> Widget calls useWidgetData(sourceKey, fetchFn, intervalMs)
    -> DataRefreshOrchestrator deduplicates, manages tick loop (10s)
    -> Widget receives { data, lastFetchedAt, isLoading, error }
```

### Key Existing Infrastructure

| Component | Path | Role |
|-----------|------|------|
| `types.js` | `src/components/layout-editor/types.js` | WidgetType enum, factory functions, default props |
| `LeftSidebar.jsx` | `src/components/layout-editor/LeftSidebar.jsx` | Widget catalog (WIDGET_ITEMS array) |
| `DataRefreshContext` | `src/player/contexts/DataRefreshContext.jsx` | Provider for coordinated data fetching |
| `useWidgetData` | `src/player/hooks/useWidgetData.js` | Consumer hook with fallback |
| `useDataRefreshOrchestrator` | `src/player/hooks/useDataRefreshOrchestrator.js` | Central tick loop, registry, dedup |
| `cacheService.js` | `src/player/cacheService.js` | IndexedDB v3 with scenes/media/dataSources/rssFeeds stores |
| `offlineService.js` | `src/player/offlineService.js` | Offline detection, scene caching, sync |
| `weatherService.js` | `src/services/weatherService.js` | OpenWeatherMap integration with LRU cache |
| `screenGroupService.js` | `src/services/screenGroupService.js` | CRUD, publish/unpublish scenes to groups |
| `AppRenderer.jsx` | `src/player/components/AppRenderer.jsx` | Full-screen app rendering (clock, weather wall, RSS, data table) |
| `ZonePlayer.jsx` | `src/player/components/ZonePlayer.jsx` | Multi-zone layout playback with video support |

### Existing Widget Types in types.js
```javascript
// Already defined:
'clock' | 'date' | 'weather' | 'qr' | 'data' | 'countdown' | 'ticker'
```

### Current WIDGET_ITEMS in LeftSidebar
```javascript
// Already in the catalog:
clock, date, weather, qr, data
```

---

## Recommended Architecture for New Features

### Feature 1: Weather Widget Enhancement

**Status:** ALREADY EXISTS -- needs enhancement, not creation.

**What exists:**
- `src/player/components/widgets/WeatherWidget.jsx` -- live player widget with orchestrator integration
- `src/components/layout-editor/LayoutElementRenderer.jsx` -- mock preview (minimal + card styles)
- `src/services/weatherService.js` -- OpenWeatherMap API with 30-min LRU cache, forecast, coords support
- `src/components/WeatherWall/` -- full-screen weather app (different from widget)

**What to enhance:**
- Add forecast display option to the widget (currently only shows current temp)
- Add more style presets: `'detailed'` showing humidity/wind, `'forecast'` showing 3-5 day
- Expand `WidgetWeatherProps` in types.js with new style options
- Add forecast style to editor mock preview and properties panel

**Integration points (MODIFY, not create):**

| File | Change |
|------|--------|
| `types.js` | Add `'detailed' \| 'forecast'` to `WidgetWeatherProps.style` |
| `LayoutElementRenderer.jsx` | Add `detailed` and `forecast` mock renderers to `WeatherWidget` |
| `LayoutPropertiesPanel.jsx` | Add style selector with new options in weather controls |
| `WeatherWidget.jsx` (player) | Add `detailed` and `forecast` render modes |
| `weatherService.js` | Already has `getWeatherForecast()` -- no changes needed |

**Data flow:** Unchanged. `useWidgetData` with `sourceKey: weather:${location}:${units}` already handles coordinated refresh.

---

### Feature 2: Video Playback in Layout Zones

**Status:** PARTIALLY EXISTS -- `ZonePlayer` handles video in playlists. Layout editor needs video element support.

**What exists:**
- `ZonePlayer.jsx` already renders `<video>` elements with `autoPlay`, `muted`, `playsInline`, `onEnded`
- `LeftSidebar.jsx` `handleAddImage` already detects video type and sets `{ autoplay: true, loop: true, muted: true }`
- `LayoutElementRenderer.jsx` only handles `image` elements, NOT `video` elements

**What to build:**

| Component | Type | Purpose |
|-----------|------|---------|
| Video element renderer | MODIFY `LayoutElementRenderer.jsx` | Add `case 'video'` with `<video>` tag for editor preview |
| Video properties panel | MODIFY `LayoutPropertiesPanel.jsx` | Add `VideoControls` with autoplay, loop, muted, fit toggles |
| Video element type | MODIFY `types.js` | Add `'video'` to `ElementType`, `VideoElementProps` typedef, `createVideoElement` factory |
| Player video in scenes | MODIFY `SceneRenderer.jsx` `SceneBlock` | Add `case 'video'` block type rendering |

**Video element props schema:**
```javascript
/** @typedef {Object} VideoElementProps
 * @property {string} url - Video URL (S3/CloudFront)
 * @property {'cover' | 'contain' | 'fill'} [fit='cover'] - Object fit
 * @property {boolean} [autoplay=true] - Auto play
 * @property {boolean} [loop=true] - Loop playback
 * @property {boolean} [muted=true] - Muted (required for autoplay)
 * @property {number} [borderRadius=0] - Border radius
 * @property {number} [opacity=1] - Opacity
 * @property {string} [posterUrl] - Poster image URL
 */
```

**Offline caching consideration:** Videos are already cached by `cacheService.js` via the `media` store with blob storage. The existing `fetchAndCacheScene` in `offlineService.js` downloads media URLs including videos. No new offline logic needed -- just ensure the video URL is included in the scene's `media_urls` array.

**Cross-platform notes:**
- WebOS/Tizen: `<video>` tag is natively supported. `playsInline` and `muted` are critical for autoplay.
- Android WebView: Autoplay requires `muted`. May need `webkit-playsinline` attribute.
- iOS: Autoplay works only when muted. Low Power Mode may block it.
- **Key constraint:** Videos in layout zones MUST default to `muted: true` for reliable cross-platform autoplay. Audio requires explicit user interaction on most platforms.

---

### Feature 3: Screen Groups and Tags

**Status:** ALREADY EXISTS -- fully functional with CRUD, publish/unpublish, and device management.

**What exists (comprehensive):**
- `src/services/screenGroupService.js` -- Full CRUD: create, update, delete, assign/remove screens, publish scenes
- `src/pages/ScreenGroupsPage.jsx` -- List page
- `src/pages/ScreenGroupDetailPage.jsx` -- Detail with devices tab and settings
- `src/components/screens/ScreenGroupSettingsTab.jsx` -- Language settings per group
- Database: `screen_groups` table with `tags` (text array), `location_id`, `active_scene_id`, `display_language`
- Database: `tv_devices.screen_group_id` foreign key
- RPC: `publish_scene_to_group`, `unpublish_scene_from_group`, `publish_scene_to_multiple_groups`, `get_screen_groups_with_scenes`
- View: `v_screen_groups_with_counts`

**What to enhance:**

| Enhancement | Type | Detail |
|-------------|------|--------|
| Tag-based filtering | MODIFY `ScreenGroupsPage` | Add filter chips for tags, use Supabase `@>` array contains |
| Bulk tag management | MODIFY `ScreenGroupDetailPage` | Tag editor component (add/remove tags) |
| Tag autocomplete | NEW small component | Fetch distinct tags with `select distinct unnest(tags)` |
| Content assignment by tag | MODIFY schedule/campaign editors | Target by tag instead of individual groups |

**Data model:** Already exists. The `screen_groups.tags` column is a PostgreSQL text array. No schema changes needed.

**Tag autocomplete service function:**
```javascript
// Add to screenGroupService.js
export async function getDistinctTags() {
  const { data, error } = await supabase.rpc('get_distinct_screen_tags');
  if (error) throw error;
  return data || [];
}
```

---

### Feature 4: Portrait Mode Support

**Status:** ALREADY EXISTS in the layout editor. Needs propagation to player.

**What exists:**
- `yodeckTheme.js` YODECK_ORIENTATIONS includes `9:16 (1080 x 1920)` and `3:4 (1080 x 1440)`
- `LayoutEditorCanvas.jsx` uses `canvasSize` prop with computed `aspectRatio`
- `TopToolbar.jsx` has orientation dropdown with portrait presets
- `types.js` ASPECT_RATIOS includes `'9:16'`
- `Layout` typedef has `aspectRatio: '16:9' | '9:16' | '4:3' | '1:1'`

**What to build:**

| Component | Type | Detail |
|-----------|------|--------|
| Screen orientation setting | MODIFY `ScreensPage`/screen settings | Add orientation field to `tv_devices` table |
| Layout orientation in player | MODIFY `LayoutRenderer.jsx` | Apply aspect ratio from layout when rendering zones |
| Player CSS rotation | MODIFY `ViewPage.jsx` | CSS `transform: rotate(90deg)` for portrait on landscape hardware |
| Force-orientation override | MODIFY screen group settings | Group-level orientation setting that overrides individual screens |

**Database change:**
```sql
ALTER TABLE tv_devices ADD COLUMN orientation TEXT DEFAULT 'landscape'
  CHECK (orientation IN ('landscape', 'portrait', 'auto'));
ALTER TABLE screen_groups ADD COLUMN default_orientation TEXT DEFAULT NULL
  CHECK (default_orientation IN ('landscape', 'portrait', 'auto'));
```

**Player rotation approach:**
The player should apply CSS rotation when the screen hardware is landscape but content is portrait (or vice versa). The recommended approach:

```javascript
// In ViewPage or a wrapper component
const contentOrientation = layout?.aspectRatio === '9:16' ? 'portrait' : 'landscape';
const screenOrientation = deviceSettings?.orientation || 'landscape';
const needsRotation = contentOrientation !== screenOrientation;

// CSS transform for rotation
const rotationStyle = needsRotation ? {
  transform: 'rotate(90deg)',
  transformOrigin: 'center center',
  width: '100vh',
  height: '100vw',
} : {};
```

---

### Feature 5: Clock/Date Widget Enhancement

**Status:** ALREADY EXISTS -- basic versions. Needs richer formatting options.

**What exists:**
- `ClockWidget.jsx` (player) -- 12h format, size presets, 1-second interval
- `DateWidget.jsx` (player) -- "Thursday, January 23" format, size presets
- Editor mock previews in `LayoutElementRenderer.jsx`
- Editor config in `LayoutPropertiesPanel.jsx` (textColor only)
- `types.js` has `WidgetClockProps` with format/showSeconds/timezone and `WidgetDateProps` with format

**What to enhance:**

| Enhancement | Files to modify | Detail |
|-------------|----------------|--------|
| 24h format support | `ClockWidget.jsx`, `LayoutPropertiesPanel.jsx` | Format toggle in editor, honor in player |
| Show seconds | `ClockWidget.jsx`, `LayoutPropertiesPanel.jsx` | Checkbox in editor config |
| Timezone selector | `ClockWidget.jsx`, `LayoutPropertiesPanel.jsx` | Dropdown with common timezones |
| Date format options | `DateWidget.jsx`, `LayoutPropertiesPanel.jsx` | Short/long/numeric/custom formats |
| Combined clock+date widget | NEW: `ClockDateWidget.jsx` | Single widget showing both time and date |
| Analog clock style | NEW: render mode in `ClockWidget.jsx` | SVG-based analog clock face |

**Props additions to types.js:**
```javascript
/** @typedef {Object} WidgetClockProps
 * @property {string} [textColor='#ffffff']
 * @property {'12h' | '24h'} [format='12h']
 * @property {boolean} [showSeconds=false]
 * @property {string} [timezone] - IANA timezone (e.g., 'America/New_York')
 * @property {'digital' | 'analog' | 'minimal'} [displayStyle='digital']
 * @property {string} [accentColor='#3b82f6'] - Analog clock hands/markers color
 */
```

---

### Feature 6: QR Code Widget Enhancement

**Status:** ALREADY EXISTS -- functional. Needs richer configuration.

**What exists:**
- `QRCodeWidget.jsx` (player) -- uses `QRCodeSVG` from qrcode.react (already in package.json v4.2.0)
- Editor mock preview with CSS grid placeholder pattern
- Editor config for URL, label, colors in `LayoutPropertiesPanel.jsx`
- `types.js` has `WidgetQRProps`

**What to enhance:**

| Enhancement | Files | Detail |
|-------------|-------|--------|
| Error correction level | `LayoutPropertiesPanel.jsx`, `QRCodeWidget.jsx` | L/M/Q/H selector |
| Logo overlay | `QRCodeWidget.jsx` | Center image overlay (brand logo) |
| Dynamic QR (data binding) | `QRCodeWidget.jsx` | URL from data source with `{{field}}` template |
| Size/scale control | `LayoutPropertiesPanel.jsx` | Already has `qrScale` in player, expose in editor |
| Style presets | `LayoutPropertiesPanel.jsx` | Quick color scheme presets (dark on light, light on dark, branded) |

**Logo overlay approach:**
```javascript
// qrcode.react supports imageSettings prop
<QRCodeSVG
  value={url}
  size={256}
  level="H" // High error correction needed for logo overlay
  imageSettings={{
    src: logoUrl,
    x: undefined, // Center by default
    y: undefined,
    height: 40,
    width: 40,
    excavate: true, // Remove QR modules behind logo
  }}
/>
```

**Note:** Logo overlay requires error correction level H (30% recovery) to remain scannable. The editor should auto-set level to H when a logo is provided.

---

### Feature 7: Menu Board Widget

**Status:** PARTIALLY EXISTS as full-screen app (`DataTableApp` in `AppRenderer.jsx`). Needs a layout widget version.

**What exists:**
- `DataTableApp` in `AppRenderer.jsx` -- full-screen tabular data with title, headers, rows, themes
- `DataTableWidget.jsx` in player widgets -- data source bound table widget
- `useAppData` hook for app-level data fetching

**What to build:**

| Component | Type | Purpose |
|-----------|------|---------|
| `MenuBoardWidget.jsx` | NEW player widget | Compact menu board for layout zones |
| `MenuBoardWidgetControls.jsx` | NEW editor component | Config UI for menu items, categories, styling |
| Menu board editor mock | MODIFY `LayoutElementRenderer.jsx` | Add `case 'menu-board'` to widget switch |
| Menu board properties | MODIFY `LayoutPropertiesPanel.jsx` | Add menu board config section |
| Menu board data model | NEW Supabase table | `menu_boards` with categories and items |

**Menu board data model:**
```sql
CREATE TABLE menu_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]',
  -- categories: [{ name: "Appetizers", items: [{ name, description, price, image_url, available }] }]
  style JSONB DEFAULT '{}',
  -- style: { theme, headerFont, itemFont, priceAlignment, showImages, columns }
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: tenant isolation
ALTER TABLE menu_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON menu_boards
  FOR ALL USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT managed_tenant_id FROM profiles WHERE id = auth.uid()
  ));
```

**Widget props schema:**
```javascript
/** @typedef {Object} WidgetMenuBoardProps
 * @property {string} menuBoardId - Menu board UUID
 * @property {'compact' | 'detailed' | 'grid'} [layout='compact']
 * @property {'light' | 'dark' | 'chalkboard'} [theme='dark']
 * @property {boolean} [showPrices=true]
 * @property {boolean} [showImages=false]
 * @property {boolean} [showDescriptions=true]
 * @property {string} [headerColor='#ffffff']
 * @property {string} [priceColor='#22c55e']
 * @property {string} [categoryColor='#f59e0b']
 * @property {number} [fontSize=16]
 */
```

**Orchestrator integration:**
```javascript
// In MenuBoardWidget.jsx
const sourceKey = `menu-board:${menuBoardId}`;
const fetchFn = useCallback(async () => {
  const { data, error } = await supabase
    .from('menu_boards')
    .select('*')
    .eq('id', menuBoardId)
    .single();
  if (error) throw error;
  return data;
}, [menuBoardId]);

const { data: menuData, isLoading } = useWidgetData(sourceKey, fetchFn, 5 * 60 * 1000);
```

**Offline caching:** Add `menuBoards` store to IndexedDB (bump to v4), or store as a data source in existing `dataSources` store with key prefix `menu-board:`. The simpler approach is to use the existing `dataSources` store with a namespaced key -- avoids a schema migration.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `LayoutElementRenderer` | Renders element by type in editor canvas | Reads element props |
| `LayoutPropertiesPanel` | Per-type config UI in editor sidebar | Calls `onElementUpdate` |
| `LeftSidebar` | Widget catalog, add to canvas | Calls `onAddElement` |
| `types.js` | Type definitions, factory functions | Imported by all editor components |
| `SceneWidgetRenderer` | Routes widget types to live components | Renders player widgets |
| `useWidgetData` | Subscribes to orchestrator for data | DataRefreshContext |
| `useDataRefreshOrchestrator` | Tick loop, registry, deduplication | Manages dataStoreRef |
| `weatherService.js` | Weather API with caching | Called by WeatherWidget fetchFn |
| `cacheService.js` | IndexedDB for offline | Called by offlineService |
| `screenGroupService.js` | Group CRUD, publish, tags | Supabase RPC/REST |

---

## Data Flow Diagrams

### Widget: Design-Time to Runtime

```
DESIGN TIME (Layout Editor)
  User selects widget type from LeftSidebar
    |
    v
  createElement({type: 'widget', widgetType: 'menu-board', props: {...}})
    |
    v
  LayoutEditorCanvas renders LayoutElementRenderer (mock preview)
  LayoutPropertiesPanel renders WidgetControls (config UI)
    |
    v
  Save layout JSON to Supabase (layouts.elements or scenes.design_json)

RUNTIME (Player)
  Player fetches layout/scene from Supabase (or IndexedDB cache)
    |
    v
  SceneRenderer wraps in DataRefreshProvider(orchestrator)
    |
    v
  SceneBlock detects type='widget', renders SceneWidgetRenderer
    |
    v
  SceneWidgetRenderer routes to MenuBoardWidget by widgetType
    |
    v
  MenuBoardWidget calls useWidgetData('menu-board:${id}', fetchFn, 5min)
    |
    v
  Orchestrator: register -> immediate fetch -> tick loop every 10s checks interval
    |
    v
  Widget receives { data, lastFetchedAt, isLoading } -> renders menu content
```

### Video: S3 to Player

```
Upload: Media Library -> S3 bucket -> CloudFront CDN URL stored in media table
    |
    v
Design: Layout editor -> Add video element -> URL from media library
    |
    v
Save: layout.elements includes {type: 'video', props: {url, autoplay, loop, muted}}
    |
    v
Offline Cache: offlineService.fetchAndCacheScene downloads video blob to IndexedDB
    |
    v
Player: SceneBlock renders <video> tag
  - Online: src={cloudfront_url}
  - Offline: src={IndexedDB blob URL via getCachedMediaUrl}
```

### Portrait Mode: Configuration to Display

```
Admin: ScreensPage -> Screen settings -> orientation: 'portrait'
  OR: ScreenGroupDetailPage -> Settings -> default_orientation: 'portrait'
    |
    v
Database: tv_devices.orientation = 'portrait'
    |
    v
Player: ViewPage fetches device settings
  - Checks layout aspectRatio vs device orientation
  - Applies CSS rotation if mismatch
  - Content renders at correct aspect ratio
    |
    v
Display: Physical screen (landscape hardware) shows portrait content rotated 90deg
```

---

## Patterns to Follow

### Pattern 1: Widget Registration Checklist
**What:** Every new widget MUST touch these files in order.
**When:** Adding any new widget type.

```
1. types.js          -- Add to WidgetType union, add Props typedef, add to createWidgetElement defaults
2. LeftSidebar.jsx   -- Add to WIDGET_ITEMS array (icon, label, widgetType)
3. LayoutElementRenderer.jsx -- Add case in WidgetElement switch (mock preview)
4. LayoutPropertiesPanel.jsx -- Add config section in WidgetControls (or extend widgetTypes grid)
5. New*Widget.jsx (player)   -- Create live player component with useWidgetData
6. SceneRenderer.jsx          -- Add case in SceneWidgetRenderer switch
7. widgets/index.js           -- Export from barrel file
```

### Pattern 2: Orchestrator Integration for Data Widgets
**What:** Widgets needing external data use `useWidgetData` for coordinated fetching.
**When:** Widget fetches from API, database, or external source.

```javascript
// In your widget component
const sourceKey = `widget-type:${uniqueIdentifier}`;
const fetchFn = useCallback(async () => {
  // Fetch data from API/Supabase
  return data;
}, [dependencies]);

// cacheFn is optional -- for IndexedDB offline caching
const cacheFn = useCallback(async (data) => {
  await cacheToIndexedDB(sourceKey, data);
}, [sourceKey]);

const { data, lastFetchedAt, isLoading, error } = useWidgetData(
  sourceKey,
  fetchFn,
  intervalMs, // e.g., 5 * 60 * 1000 for 5 minutes
  cacheFn
);
```

### Pattern 3: Editor Mock Preview
**What:** Editor shows a visual approximation without live data.
**When:** Any widget that fetches runtime data.

```javascript
// In LayoutElementRenderer.jsx WidgetElement switch
case 'menu-board':
  return <MenuBoardMock props={props} />;

// Mock shows placeholder data representing the visual structure
function MenuBoardMock({ props }) {
  return (
    <div className="w-full h-full bg-gray-900 p-2 rounded">
      <div className="text-xs font-bold text-amber-400 mb-1">MENU</div>
      <div className="space-y-0.5">
        <div className="flex justify-between text-[8px] text-white">
          <span>Item Name</span><span className="text-green-400">$9.99</span>
        </div>
        {/* ... more placeholder rows */}
      </div>
    </div>
  );
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Widget Fetching Outside Orchestrator
**What:** Making direct `fetch()` or Supabase calls inside a widget's render/effect without `useWidgetData`.
**Why bad:** Defeats deduplication. Two instances of the same weather widget would make separate API calls. No coordinated refresh timing.
**Instead:** Always use `useWidgetData(sourceKey, fetchFn, intervalMs)`. The orchestrator deduplicates by `sourceKey`.

### Anti-Pattern 2: Heavy Assets in Editor Preview
**What:** Loading actual video files, making API calls, or rendering complex SVGs in the editor mock.
**Why bad:** Layout editor has many elements. Heavy previews cause editor lag. Videos auto-playing in the editor would be disruptive.
**Instead:** Use lightweight mock previews. Video element shows a poster frame or placeholder with a play icon. Weather widget shows static "72F" text.

### Anti-Pattern 3: Non-Fractional Positioning
**What:** Storing element positions as pixel values instead of 0-1 fractions.
**Why bad:** Existing system uses fractional positions (`x: 0.35, y: 0.45, width: 0.3, height: 0.1`). Mixing pixel and fractional values breaks cross-resolution rendering. Portrait and landscape would render differently.
**Instead:** All positions are 0-1 fractions of canvas dimensions. The canvas applies them as percentages.

### Anti-Pattern 4: Client-Side API Key Exposure for Menu Boards
**What:** Embedding external API keys in widget props that get stored in layout JSON.
**Why bad:** Layout JSON is visible to anyone with Supabase access. API keys leak.
**Instead:** Menu board data lives in Supabase tables (server-side). If external APIs are needed, use Edge Functions as proxies (like the existing RSS proxy pattern).

---

## Scalability Considerations

| Concern | At 100 screens | At 10K screens | At 1M screens |
|---------|---------------|----------------|---------------|
| Weather API calls | In-memory cache sufficient | Need server-side cache/proxy Edge Function | Mandatory: proxy with shared cache per location |
| Menu board data | Direct Supabase queries fine | Add cache header, CDN for menu JSON | Dedicated menu API with edge caching |
| Video storage | S3 + CloudFront handles it | CloudFront caching critical | Multi-region CDN, adaptive bitrate |
| Screen groups | Simple queries sufficient | Index on tags array, materialized view | Partition by tenant_id |
| Portrait rotation | CSS transform works | Same | Same (client-side only) |
| QR code generation | Client-side SVG fast | Same | Same (no server dependency) |

---

## Build Order (Dependency-Aware)

The recommended build order considers:
- Features with zero new dependencies should come first
- Features that MODIFY existing files should come before features that create NEW files
- The menu board widget (most complex, new table) should come last

### Phase Structure Recommendation

**Phase A: Clock/Date Enhancement + QR Enhancement**
- Rationale: Purely additive to existing widgets. No new database tables. No new player components.
- Touches: `types.js`, `LayoutElementRenderer.jsx`, `LayoutPropertiesPanel.jsx`, `ClockWidget.jsx`, `DateWidget.jsx`, `QRCodeWidget.jsx`
- Risk: LOW -- extending existing patterns

**Phase B: Weather Widget Enhancement**
- Rationale: Extends existing widget with forecast mode. weatherService already has forecast API.
- Touches: Same editor files + `WeatherWidget.jsx`
- Risk: LOW -- data source already exists

**Phase C: Video Playback in Layouts**
- Rationale: Adds new element type. LeftSidebar already handles video detection. ZonePlayer already plays video.
- Touches: `types.js` (new type), `LayoutElementRenderer.jsx` (new case), `LayoutPropertiesPanel.jsx` (new controls), `SceneRenderer.jsx` (new block type)
- Risk: MEDIUM -- cross-platform autoplay behavior needs testing on WebOS/Tizen

**Phase D: Portrait Mode**
- Rationale: Layout editor already supports portrait. Needs DB column + player CSS rotation.
- Touches: Database migration, screen settings UI, `ViewPage.jsx` rotation logic
- Risk: MEDIUM -- CSS rotation math across different screen hardware

**Phase E: Screen Groups/Tags Enhancement**
- Rationale: Groups already work. Tags column already exists. This is UI enhancement.
- Touches: `ScreenGroupsPage`, `ScreenGroupDetailPage`, possibly schedule/campaign editors
- Risk: LOW -- existing infrastructure

**Phase F: Menu Board Widget**
- Rationale: Most complex. Needs new database table, new widget component, new editor controls.
- Touches: New Supabase table + migration, new widget files, all editor registration points
- Risk: MEDIUM -- new data model, menu editing UX complexity
- Depends on: Phase A-C patterns established (widget registration pattern proven with simpler widgets)

---

## New Files to Create

| File | Feature | Purpose |
|------|---------|---------|
| `src/player/components/widgets/MenuBoardWidget.jsx` | Menu Board | Live menu board renderer |
| `src/components/scene-editor/MenuBoardWidgetControls.jsx` | Menu Board | Editor config for menu boards |
| `src/pages/MenuBoardsPage.jsx` | Menu Board | Menu board management CRUD page |
| `src/services/menuBoardService.js` | Menu Board | Supabase CRUD for menu_boards table |
| `supabase/migrations/NNNN_menu_boards.sql` | Menu Board | Table creation + RLS |
| `supabase/migrations/NNNN_device_orientation.sql` | Portrait | Add orientation columns |

## Existing Files to Modify

| File | Features | Changes |
|------|----------|---------|
| `src/components/layout-editor/types.js` | All widgets, Video | New types, factory functions |
| `src/components/layout-editor/LayoutElementRenderer.jsx` | All widgets, Video | New switch cases for video + menu-board |
| `src/components/layout-editor/LayoutPropertiesPanel.jsx` | All widgets, Video | New config sections (clock format, QR logo, video controls, menu board picker) |
| `src/components/layout-editor/LeftSidebar.jsx` | Menu Board | Add to WIDGET_ITEMS |
| `src/player/components/SceneRenderer.jsx` | Menu Board, Video | New switch cases in SceneWidgetRenderer + SceneBlock |
| `src/player/components/widgets/index.js` | Menu Board | Export new widget |
| `src/player/components/widgets/WeatherWidget.jsx` | Weather | Forecast + detailed render modes |
| `src/player/components/widgets/ClockWidget.jsx` | Clock | 24h, seconds, analog, timezone |
| `src/player/components/widgets/DateWidget.jsx` | Date | Format options |
| `src/player/components/widgets/QRCodeWidget.jsx` | QR | Logo, error correction, dynamic URL |
| `src/player/pages/ViewPage.jsx` | Portrait | CSS rotation logic |
| `src/pages/ScreenGroupsPage.jsx` | Tags | Tag filtering UI |
| `src/pages/ScreenGroupDetailPage.jsx` | Tags | Tag management UI |
| `src/services/screenGroupService.js` | Tags | Tag autocomplete RPC |
| `src/player/components/LayoutRenderer.jsx` | Portrait | Aspect ratio from layout |

---

## Sources

- **Codebase analysis** (HIGH confidence): All findings based on direct reading of source files
- `src/components/layout-editor/types.js` -- Type system and widget factory pattern
- `src/components/layout-editor/LayoutElementRenderer.jsx` -- Widget rendering dispatch (5 widget types: clock, date, weather, qr, data)
- `src/components/layout-editor/LayoutPropertiesPanel.jsx` -- Widget config UI pattern with WidgetControls
- `src/components/layout-editor/LeftSidebar.jsx` -- Widget catalog (WIDGET_ITEMS), video type detection in handleAddImage
- `src/components/layout-editor/LayoutEditorCanvas.jsx` -- Fractional positioning, canvasSize prop, aspect ratio calculation
- `src/components/layout-editor/TopToolbar.jsx` -- Orientation dropdown with portrait presets
- `src/config/yodeckTheme.js` -- YODECK_ORIENTATIONS including 9:16, 3:4
- `src/player/components/SceneRenderer.jsx` -- Player widget rendering + DataRefreshProvider + orchestrator integration
- `src/player/hooks/useWidgetData.js` -- Data fetch hook with orchestrator-aware deduplication
- `src/player/hooks/useDataRefreshOrchestrator.js` -- Central tick loop (10s), registry, subscriber counting, jitter
- `src/player/components/widgets/*.jsx` -- 8 existing widget implementations (Clock, Date, Weather, QR, DataTable, RssTicker, RssCard, SocialFeed)
- `src/player/components/ZonePlayer.jsx` -- Video playback in zone layout (autoPlay, muted, playsInline, onEnded)
- `src/player/components/AppRenderer.jsx` -- Full-screen apps including DataTableApp (menu pattern)
- `src/services/weatherService.js` -- OpenWeatherMap with getWeather, getWeatherForecast, getWeatherByCoords, 30-min LRU cache
- `src/services/screenGroupService.js` -- Screen group CRUD, tags array, publish/unpublish scenes, language settings
- `src/player/cacheService.js` -- IndexedDB v3: scenes, media, deviceState, offlineQueue, dataSources, rssFeeds stores
- `src/player/offlineService.js` -- Offline sync: fetchAndCacheScene, service worker, event queue
- `package.json` -- Confirms qrcode.react v4.2.0 already installed
- qrcode.react `imageSettings` prop (MEDIUM confidence, from training data): Logo overlay support with excavate option
