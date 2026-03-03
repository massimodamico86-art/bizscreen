# Phase 108: Embed Widgets - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add 4 new widget types to the widget registry: YouTube, Vimeo, Web Page, and Google Slides. Users configure them in the layout editor properties panel and see them rendering on screen players via iframe embeds. Offline screens show cached thumbnails with a "requires internet" indicator. Requirements: EMBED-01 through EMBED-07, SLIDES-01 through SLIDES-03.

</domain>

<decisions>
## Implementation Decisions

### Widget types and registry
- 4 separate widget type entries in the registry: `youtube`, `vimeo`, `webpage`, `google-slides`
- Each gets its own icon and label in the widget picker (not a single "Embed" type)
- Follows the existing one-file registration pattern in `src/widgets/registry.js`
- Each widget gets a player component in `src/player/components/widgets/`

### Offline fallback
- When offline, all 4 embed types show a cached thumbnail with a subtle "Requires Internet" badge
- The badge only appears when the device is actually offline — not during normal loading
- During normal loading, show the thumbnail as a brief placeholder until the iframe loads
- Web pages get thumbnail-only fallback (no HTML snapshot caching — too complex, pages change too often)
- Consistent fallback behavior across all 4 embed types

### Thumbnail capture
- Thumbnails are captured on save in the editor (not on first player load)
- YouTube: fetch via YouTube thumbnail API (img.youtube.com/vi/{ID}/maxresdefault.jpg — no auth needed)
- Vimeo: fetch via Vimeo oEmbed API (vimeo.com/api/oembed.json?url={URL} — no auth needed)
- Google Slides: fetch first slide thumbnail from the published URL
- Web pages: extract Open Graph image or use a screenshot approach
- Thumbnails stored as cached assets for offline use

### YouTube/Vimeo controls
- Autoplay is always on (digital signage — nobody clicks play)
- Two configurable options: mute toggle + loop toggle
- Minimal control set — keeps the editor panel clean

### Web Page controls
- URL input field
- Auto-refresh interval dropdown (5/15/30/60 minutes, matching existing data widget pattern)
- Zoom/scale slider for fitting wide pages (dashboards) into smaller zones

### Google Slides controls
- URL input field (accepts published embed URL)
- Auto-advance interval dropdown (5/10/15/30/60 seconds)
- Rendering via Google's published embed URL (File > Share > Publish to web)
- No OAuth needed — purely URL-based

### Google Slides URL handling
- User pastes the published URL; system extracts presentation ID
- Embed URL constructed from user's settings (auto-advance interval, loop, autostart)
- If user pastes a regular Slides URL (not published), show a helpful instruction: "This looks like a regular Slides link. To display it on screen, publish it first: File > Share > Publish to web."
- Don't reject non-published URLs — guide the user

### URL validation and input UX
- Validate URLs on paste/blur
- Show inline preview thumbnail in the properties panel on valid URL
- Accept all common URL formats and normalize:
  - YouTube: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
  - Vimeo: vimeo.com/{ID}, player.vimeo.com/video/{ID}
  - Google Slides: docs.google.com/presentation/d/{ID}/pub, docs.google.com/presentation/d/{ID}/edit
- Inline error messages for invalid/private URLs (red border + explanation)
- Don't block saving on validation failure — content might become available later

### Editor panel style
- All 4 embed widget types share a common panel layout: URL input at top, type-specific options below
- Reuse the existing prop adapter pattern from layout editor (onPropChange adapter bridging scene/layout editor)

### Claude's Discretion
- Exact iframe sandbox attributes and permissions (allow-scripts, allow-same-origin, etc.)
- Error recovery behavior when an iframe fails to load
- Loading spinner design during iframe initialization
- Thumbnail image size/quality tradeoffs
- Whether to use YouTube's iframe API or a plain iframe

</decisions>

<specifics>
## Specific Ideas

- Competitors (Yodeck, OptiSigns) show cached thumbnails when offline — proven pattern
- Google Slides auto-advance is built into their embed URL parameters (?start=true&loop=true&delayms=5000)
- YouTube thumbnails are freely available at img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg
- Vimeo oEmbed API returns thumbnail URLs without authentication

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/widgets/registry.js`: Widget registry with 12 types — add 4 more entries following the same pattern
- `src/player/components/widgets/index.js`: Barrel export for widget components — add 4 new exports
- `src/player/components/widgets/*.jsx`: Existing widget components — follow same structure (props destructuring, data fetching, offline caching)
- `src/player/cacheService.js` + `src/player/offlineService.js`: IndexedDB offline cache — can store thumbnail assets
- `src/player/hooks/useWidgetData.js`: Orchestrator integration hook for data-fetching widgets
- Layout editor prop adapter pattern: `onPropChange` adapter bridging scene/layout editor controls

### Established Patterns
- Widget registration: ONE entry in registry.js, all rendering/editor/factory paths pick it up automatically
- Widget components receive `{ props, timezone }` — props is a shallow object from defaultProps
- Data-fetching widgets use `useWidgetData` hook for orchestrator integration
- Offline caching via IndexedDB in `cacheService.js` (existing pattern for RSS, weather, data tables)
- Editor controls reused between scene and layout editor via prop adapter

### Integration Points
- `src/widgets/registry.js`: Add 4 new entries
- `src/player/components/widgets/index.js`: Export 4 new components
- `src/components/layout-editor/LayoutPropertiesPanel.jsx`: Widget controls for the 4 new types
- `src/player/components/SceneRenderer.jsx`: Uses `getWidgetComponent(widgetType)` — automatic via registry
- `src/player/components/ZonePlayer.jsx`: Zone-level playback — may need iframe-aware duration handling

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 108-embed-widgets*
*Context gathered: 2026-03-03*
