# Technology Stack: Display Toolkit Features

**Project:** BizScreen - Weather Widget, Video Playback, Screen Groups/Tags, Portrait Mode, Clock/Date Widget, QR Code Widget, Menu Board Widget
**Researched:** 2026-02-13
**Focus:** Stack additions/changes for new Display Toolkit features on existing React 19 + Supabase platform

## Executive Summary

After thorough analysis of the existing codebase, **most features require ZERO new npm dependencies**. The project already has comprehensive implementations of weather (OpenWeatherMap), QR code (qrcode + qrcode.react), clock/date (native Date API), and screen groups with tags (Supabase table with tags TEXT[] column). The primary gap is **HLS/adaptive video streaming** for the video playback feature -- the player currently uses raw `<video>` elements with direct src URLs, which cannot handle HLS `.m3u8` or DASH streams.

The menu board widget is best built as a new widget component following the existing DataTableWidget pattern, using the established `useWidgetData` hook and data refresh orchestrator -- no new library needed.

Portrait mode already has partial support in the layout editor (aspect ratio `9:16` defined in `types.js`, `ASPECT_RATIOS` config, `CreateLayoutModal` orientation selection), but needs completion in the player rendering pipeline to handle CSS rotation on landscape-only hardware.

---

## What Already Exists (DO NOT ADD)

These capabilities are already in package.json and working in the codebase. Adding duplicates would be wasteful.

| Capability | Existing Library | Version | Where Used |
|------------|-----------------|---------|------------|
| QR code rendering (SVG) | `qrcode.react` | ^4.2.0 | `QRCodeWidget.jsx`, `PairingScreen.jsx`, `LayoutElementRenderer.jsx` |
| QR code generation (raster) | `qrcode` | ^1.5.4 | `qrcodeService.js` (toDataURL for WiFi, URL, batch) |
| Weather data | OpenWeatherMap API (direct) | v2.5 | `weatherService.js` (current + 5-day forecast + coords) |
| Weather display | `WeatherWall` component | Custom | 3 themes: Animated, Classic, Glass |
| Clock widget | Native `Date.toLocaleTimeString` | N/A | `ClockWidget.jsx` (player), `ClockApp` (AppRenderer) |
| Date widget | Native `Date.toLocaleDateString` | N/A | `DateWidget.jsx` (player) |
| Timezone support | `@date-fns/tz` + `date-fns` | ^1.4.1 / ^4.1.0 | AppRenderer ClockApp supports timezone config |
| Screen groups | Supabase `screen_groups` table | Migration 026 | Full CRUD, tags TEXT[], location FK, publish-to-group RPC |
| Screen group tags | `tags TEXT[] DEFAULT '{}'` column | Migration 026 | `createScreenGroup`, `updateScreenGroup` support tags |
| Layout orientation | `ASPECT_RATIOS` in `types.js` | N/A | 16:9, 9:16, 4:3, 1:1 defined; CreateLayoutModal has orientation picker |
| Media orientation | `orientation` column on `media_assets` | Migration 088 | Auto-calculated from width/height |
| Data refresh orchestrator | `DataRefreshContext` + `useWidgetData` | Custom | All data-driven widgets use this pattern |
| Video playback (basic) | Native `<video>` element | HTML5 | `ViewPage.jsx`, `ZonePlayer.jsx` (mp4/webm direct src) |
| Stuck detection | `useStuckDetection` hook | Custom | Monitors video stall (30s) and page inactivity (5min) |
| DnD for layout editing | `@dnd-kit/core` | ^6.3.1 | Layout editor element positioning |

---

## Recommended Stack Additions

### New Dependencies (1 library)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `hls.js` | ^1.6.15 | HLS adaptive streaming in player | Only library needed. The player's `<video>` elements play mp4/webm directly but cannot handle `.m3u8` HLS streams without a polyfill. hls.js provides MSE-based HLS playback for browsers that lack native HLS support (all non-Safari browsers). ~300KB gzipped but tree-shakable. |

**Why hls.js specifically:**
- hls.js is the de facto standard for HLS in browsers (used by video.js, Shaka under the hood)
- It works directly with native `<video>` elements via `MediaSource Extensions` -- no wrapper UI needed
- The existing player already uses raw `<video>` tags in `ViewPage.jsx` and `ZonePlayer.jsx`, so hls.js attaches cleanly
- Lightweight: just the streaming logic, no UI framework overhead (unlike video.js which bundles UI + plugins)
- Safari has native HLS support, so hls.js detects and skips itself -- zero overhead on Apple devices
- Smart TV platforms (WebOS, Tizen) have varying native HLS support; hls.js provides a consistent fallback

**Why NOT video.js:** video.js (^8.x, ~500KB+) bundles its own player UI, skin system, and plugin architecture. BizScreen already has custom player UI in `ViewPage.jsx`. Adding video.js would mean fighting its opinions about controls, seeking, and fullscreen -- all things digital signage does not need. hls.js gives streaming without the UI baggage.

**Why NOT react-player:** react-player (^3.4.0) wraps video.js/hls.js/dash.js behind a React abstraction. It adds indirection without benefit since BizScreen needs fine-grained control over muted autoplay, stuck detection integration, and playlist advancement (`onEnded` callbacks). The existing `useRef` pattern in `ZonePlayer.jsx` is a better fit.

### Supabase Schema Additions (no npm packages)

| Change | Table | Purpose |
|--------|-------|---------|
| Add `orientation` column | `tv_devices` | Store per-device screen orientation (landscape/portrait/auto) for player CSS rotation |
| Add `screen_group_tags` GIN index | `screen_groups` | Efficient tag-based queries: `WHERE tags @> ARRAY['lobby']` |
| Add `menu_items` table | New | Structured menu data for menu board widget (name, description, price, category, sort_order, image_url) |

### Edge Function Additions (no npm packages)

| Function | Purpose | Why |
|----------|---------|-----|
| `weather-proxy` | Proxy OpenWeatherMap API calls to hide API key | Currently the API key is in `VITE_OPENWEATHER_API_KEY` (client-side env var). This is a security issue -- anyone can inspect the bundle and steal the key. Move to a Supabase Edge Function that holds the key server-side. |

---

## Recommended Stack (Complete View)

### Core Framework (NO CHANGES)
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | ^19.1.1 | UI framework | Existing |
| Vite | ^7.1.7 | Bundler | Existing |
| Supabase | ^2.80.0 | Backend (auth, DB, realtime, Edge Functions) | Existing |
| React Router | ^7.9.5 | Routing | Existing |

### Player / Display (1 ADDITION)
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| hls.js | ^1.6.15 | HLS adaptive streaming | **NEW** |
| Native `<video>` | HTML5 | MP4/WebM direct playback | Existing |
| `useStuckDetection` | Custom hook | Video stall recovery | Existing |
| `useWidgetData` | Custom hook | Widget data orchestration | Existing |

### Widgets (NO NEW LIBRARIES)
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| `qrcode.react` | ^4.2.0 | SVG QR code rendering | Existing |
| `qrcode` | ^1.5.4 | Raster QR code generation | Existing |
| OpenWeatherMap API | v2.5 | Weather data | Existing |
| `date-fns` + `@date-fns/tz` | ^4.1.0 / ^1.4.1 | Date formatting + timezones | Existing |
| Native `Date` API | Built-in | Clock/date display | Existing |

### Infrastructure (NO CHANGES)
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| AWS S3 + CloudFront | N/A | Media CDN (including video files) | Existing |
| IndexedDB (`idb`) | ^8.0.3 | Offline caching in player | Existing |
| Sentry | ^10.36.0 | Error monitoring | Existing |

---

## Feature-by-Feature Stack Mapping

### 1. Weather Widget Enhancement
**New dependencies:** NONE
**What exists:** `WeatherWidget.jsx` (player widget), `WeatherWall/` (3 themes), `weatherService.js` (current, forecast, coords, emoji)
**Work needed:**
- Move API key from `VITE_OPENWEATHER_API_KEY` to Supabase Edge Function (security fix)
- Weather widget already integrates with data refresh orchestrator via `useWidgetData`
- WeatherWallConfigModal already supports themes, orientation, language, auto-location
**Confidence:** HIGH -- complete implementation exists, needs security hardening only

### 2. Video Playback
**New dependencies:** `hls.js ^1.6.15`
**What exists:** Native `<video>` in `ViewPage.jsx` (line 807) and `ZonePlayer.jsx` (line 105), `useStuckDetection` for stall recovery
**Work needed:**
- Create `useHlsPlayer` hook that attaches hls.js to video elements when src is `.m3u8`
- Integrate into existing `<video>` rendering in both `ViewPage.jsx` and `ZonePlayer.jsx`
- Handle fallback: Safari uses native HLS, other browsers use hls.js
- Extend `useStuckDetection` for HLS-specific stall scenarios (buffer underrun)
- Video files served from CloudFront CDN (existing infrastructure)
**Confidence:** HIGH -- hls.js API is well-documented and the integration point is clear

### 3. Screen Groups with Tags
**New dependencies:** NONE
**What exists:** `screen_groups` table (migration 026) with `tags TEXT[]` column, full CRUD in `screenGroupService.js`, `ScreenGroupsPage.jsx`, `ScreenGroupDetailPage.jsx`, publish-to-group RPCs
**Work needed:**
- Add GIN index for tag-based queries (performance)
- Build tag management UI (tag chips with add/remove)
- Add tag-based filtering in screen group list
- Add "filter by tag" to campaign targeting
**Confidence:** HIGH -- infrastructure is complete, this is UI/query work

### 4. Portrait Mode
**New dependencies:** NONE
**What exists:** `ASPECT_RATIOS` with 9:16 portrait, `CreateLayoutModal` orientation picker, layout templates with portrait orientation, `orientation` column on `media_assets`
**Work needed:**
- Add `orientation` column to `tv_devices` table
- Player CSS rotation logic: when device is landscape-only hardware but content is 9:16, apply `transform: rotate(90deg)` with adjusted viewport
- Ensure all widget components render correctly at 9:16 (most use flexbox with 100% width/height, should adapt)
- Portrait-specific layout templates (some already seeded in migration 091)
**Confidence:** MEDIUM -- Layout editor supports it, but player rotation on physical landscape hardware needs testing across WebOS/Tizen/Android

### 5. Clock/Date Widget Enhancement
**New dependencies:** NONE
**What exists:** `ClockWidget.jsx` (player), `DateWidget.jsx` (player), `ClockApp` in `AppRenderer.jsx` (full-screen with timezone support, 12/24h format, show seconds, date formats)
**Work needed:**
- Enhance `ClockWidget` to support timezone, 24h format, show seconds (currently hardcoded to 12h, no timezone)
- Enhance `DateWidget` to support format options (currently hardcoded to 'long' weekday + month + day)
- Add `clock` and `date` config panels in the layout editor properties panel
- These are purely UI enhancements to existing components
**Confidence:** HIGH -- `ClockApp` in AppRenderer already has the full feature set; ClockWidget/DateWidget just need the same config support

### 6. QR Code Widget Enhancement
**New dependencies:** NONE
**What exists:** `QRCodeWidget.jsx` (player), `QRCodeManager.jsx` (listings), `qrcodeService.js` (URL, WiFi, batch), `qrcode.react` for SVG rendering
**Work needed:**
- Add WiFi QR code support to the widget (service already supports it via `generateWiFiQRCode`)
- Add vCard QR code type
- Add analytics tracking QR (redirect through a tracking URL)
- Config panel for QR type selection in layout editor
**Confidence:** HIGH -- core library and service layer already exist

### 7. Menu Board Widget
**New dependencies:** NONE
**What exists:** `DataTableWidget.jsx` pattern, `DataTableApp` in AppRenderer (renders tabular data with headers/rows), `dsmenu` app in catalog with `configType: 'menu'`
**Work needed:**
- Create `MenuBoardWidget.jsx` following `DataTableWidget` pattern with `useWidgetData`
- Build specialized rendering: category sections, item name/description/price, optional images, dietary icons
- Create `menu_items` Supabase table for structured menu data (vs generic table rows)
- Create menu editor UI (CRUD for categories and items with drag-to-reorder using `@dnd-kit/core`)
- Build Edge Function for menu data API (similar to existing RSS proxy pattern)
**Confidence:** MEDIUM -- No structural unknowns, but menu board UX has many design decisions (multi-column, pricing formats, modifiers, seasonal items)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| HLS streaming | hls.js | video.js | video.js bundles UI + plugin system we don't need; 500KB+ vs ~300KB |
| HLS streaming | hls.js | react-player | Adds React wrapper indirection; BizScreen needs raw video ref control for stuck detection |
| HLS streaming | hls.js | Shaka Player | Shaka targets DASH primarily; heavier for HLS-only use case |
| QR code | qrcode.react (existing) | react-qr-code | Already installed and working across 7+ components |
| Weather API | OpenWeatherMap (existing) | WeatherAPI.com | Already integrated with caching, forecast, coords; switching would mean rewriting weatherService.js for zero benefit |
| Menu data | Supabase table + Edge Function | Google Sheets integration | Adds external dependency; menu data should be first-class in the platform |
| Clock/Date | Native Date API (existing) | Luxon / Moment.js | date-fns + @date-fns/tz already installed for timezone work; adding another date library is wasteful |
| Portrait rotation | CSS transform (existing) | Screen Orientation API | Screen Orientation API only works for mobile browsers; digital signage uses fixed-rotation displays; CSS transform is more reliable |

---

## Installation

```bash
# Single new dependency
npm install hls.js@^1.6.15
```

That is the **only** `npm install` command needed for all 7 features.

---

## Integration Points with Existing Stack

### hls.js + Existing Player
```
ViewPage.jsx
  └── <video ref={videoRef} src={url}>
      └── NEW: useHlsPlayer(videoRef, url) -- attaches hls.js when url ends in .m3u8
          └── Existing: useStuckDetection(videoRef) -- works unchanged
          └── Existing: onEnded -> advanceToNext -- works unchanged
```

### Menu Board Widget + Data Orchestrator
```
SceneRenderer.jsx
  └── SceneWidgetRenderer
      └── case 'menu-board': <MenuBoardWidget props={safeProps} />
          └── useWidgetData(sourceKey, fetchFn, intervalMs)  -- existing pattern
              └── DataRefreshContext (orchestrator) -- existing
```

### Weather Proxy + Existing Service
```
weatherService.js (existing)
  └── BEFORE: fetch(openweathermap.org?appid=VITE_KEY)  -- API key in client
  └── AFTER:  fetch(supabase.co/functions/v1/weather-proxy?city=X)  -- key server-side
      └── Edge Function holds OPENWEATHER_API_KEY as env secret
```

### Portrait Mode + Player
```
tv_devices table
  └── NEW: orientation column ('landscape' | 'portrait' | 'auto')
      └── Player reads device config on init
          └── If portrait + hardware is landscape:
              CSS: transform: rotate(90deg); transform-origin: top left;
              Viewport: swap width/height
```

---

## Bundle Impact Analysis

| Addition | Estimated Size (gzipped) | Tree-shakable | Notes |
|----------|--------------------------|---------------|-------|
| hls.js | ~85KB | Partial (core vs full) | Only loaded in player routes; code-split via dynamic import |
| All other features | 0KB | N/A | Use existing dependencies or native APIs |

**Recommendation:** Lazy-load hls.js only when a video URL ends in `.m3u8`:
```javascript
// In useHlsPlayer hook
const Hls = await import('hls.js');
```
This means hls.js never loads for image-only or app-only playlists, keeping the common case bundle unchanged.

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| BizScreen codebase analysis | Direct code inspection | HIGH |
| `package.json` dependencies | Direct file read | HIGH |
| `npm view hls.js version` (1.6.15) | npm registry | HIGH |
| Supabase migrations (026, 086, 088, 091) | Direct file read | HIGH |
| Existing widget implementations (7 files) | Direct code inspection | HIGH |
| Layout editor types.js (ASPECT_RATIOS) | Direct code inspection | HIGH |
| hls.js vs video.js comparison | Training data (May 2025) | MEDIUM -- hls.js dominance is well-established but exact bundle sizes may have shifted |
