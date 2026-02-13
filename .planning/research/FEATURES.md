# Feature Landscape: Display Toolkit Widgets

**Domain:** Digital signage display capability features (weather, video playback, screen groups, portrait mode, clock/date, QR code, menu board)
**Researched:** 2026-02-13
**Overall confidence:** HIGH (strong codebase analysis + training data on Yodeck, ScreenCloud, OptiSigns, Rise Vision, NoviSign patterns)

## Summary

This research covers 7 display toolkit features that extend BizScreen's content rendering capabilities. The critical finding is that **most of these features are partially built** -- weather, clock, date, QR code, and screen groups all have working service layers and basic player widgets. The work is completing, enhancing, and connecting them rather than building from scratch.

The features cluster into three categories:
1. **Widget upgrades** (weather, clock/date, QR code) -- Existing player widgets need configuration UIs, timezone support, and additional display styles. LOW complexity per widget.
2. **Infrastructure features** (video playback, screen groups, portrait mode) -- These are architectural. Video needs loop/mute/preload behavior. Screen groups need bulk content push. Portrait mode needs layout awareness. MEDIUM-HIGH complexity.
3. **Data-driven templates** (menu board) -- This is the highest-value, highest-complexity feature. It combines data binding, visual templates, and category/pricing structure. HIGH complexity.

**Key dependency insight:** BizScreen already has `ZonePlayer.jsx` rendering video via `<video>` tags, `AppRenderer.jsx` routing app types, and a widget barrel export in `src/player/components/widgets/index.js`. New widgets follow the established `{ props = {} }` pattern. The screen group service (`screenGroupService.js`) already has full CRUD + scene publishing. The real gaps are in the admin configuration UIs and player-side enhancements.

---

## Table Stakes

Features users expect in any digital signage platform. Missing = product feels incomplete.

### 1. Weather Widget (with Location + Forecast)

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Current temperature + condition icon | Every platform has this (Yodeck Weather Wall, ScreenCloud Weather) | Low | **BUILT**: `weatherService.js` fetches from OpenWeatherMap, `WeatherWidget.jsx` renders in player, `WeatherWall/` has 3 themes (Animated, Classic, Glass) | Enhancement: add timezone-aware display, more compact styles for zones |
| Location by city name or coordinates | Users expect to type "Miami" or "10.5,-84.3" | Low | **BUILT**: `getWeather(city)` and `getWeatherByCoords(lat, lon)` both implemented with caching | Working. No changes needed. |
| Celsius/Fahrenheit toggle | International users need both | Low | **BUILT**: `WeatherWallConfigModal` has unit selector, service accepts `metric`/`imperial` | Working. |
| Weather icon (not just text) | Visual weather representation is expected | Low | **BUILT**: Uses OpenWeatherMap icon URLs + emoji fallback via `getWeatherEmoji()` | Working. Icons render as images. |
| 5-day forecast | Most signage platforms show multi-day | Med | **BUILT**: `getWeatherForecast()` returns 5-day data, `getWeatherWallData()` bundles current + forecast | WeatherWall themes render it. Zone widget (compact) does not show forecast -- reasonable for small zones. |
| Auto-refresh (not stale data) | Weather data must update without restart | Low | **BUILT**: 15-min refresh interval in WeatherWall, 30-min cache in service, useWidgetData orchestrator for zone widget | Working. |

**Verdict: Weather is ~90% complete.** Gap: the admin-side configuration for the zone-embedded weather widget (not WeatherWall app) is basic -- the `LayoutElementRenderer.jsx` weather widget has hardcoded mock temp. Needs to use actual `getWeather()` at render time, or defer to player-side widget which already works.

### 2. Video Playback in Playlists and Zones

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Play video files (MP4/WebM) | Core media type alongside images | Low | **BUILT**: `ZonePlayer.jsx` renders `<video>` with autoPlay, muted, playsInline. `mediaService.js` validates video MIME types. | Working for basic playback. |
| Auto-advance after video ends | Playlist must cycle through items | Low | **BUILT**: `onEnded={advanceToNext}` in ZonePlayer | Working. |
| Muted by default (auto-play policy) | Browsers block unmuted autoplay | Low | **BUILT**: `muted` prop on video element | Working. Browsers require muted for autoplay. |
| Video preloading | No black frame between items | Med | **PARTIAL**: `mediaPreloader.js` has `loadedVideos` Map and bandwidth detection, but ZonePlayer doesn't call preloader for next item | Need to wire preloader to ZonePlayer advance logic |
| Error recovery (skip corrupt video) | Must not crash the playlist | Low | **BUILT**: `onError={advanceToNext}` in ZonePlayer | Working. |
| objectFit: cover (fill zone) | Video must fill its zone without distortion | Low | **BUILT**: `objectFit: 'cover'` in ZonePlayer | Working. |

**Verdict: Video playback is ~75% complete.** Gaps: (1) Video preloading for seamless transitions is wired in mediaPreloader but not connected to ZonePlayer. (2) No video duration override (always plays to completion, no way to cut short or extend). (3) No looping single video option (useful for ambient video walls). (4) No admin-side video preview in playlist editor.

### 3. Screen Groups (Bulk Content Management)

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Create/edit/delete groups | Users with 10+ screens need grouping | Low | **BUILT**: `screenGroupService.js` has full CRUD, `ScreenGroupDetailPage.jsx` has devices tab + settings tab | Working. |
| Assign/remove screens from groups | Drag or checkbox UI for assignment | Low | **BUILT**: `DevicesTabContent` in ScreenGroupDetailPage shows assigned vs available with checkbox + Add/Remove buttons | Working. |
| Publish content to group (push to all screens) | Core value of grouping | Low | **BUILT**: `publishSceneToGroup()`, `publishSceneToMultipleGroups()` RPC functions in service | Working at service layer. Need UI to trigger from more places (campaign editor, quick actions). |
| Location-based groups | Filter screens by physical location | Low | **BUILT**: Groups have `location_id`, service supports `locationId` filter | Working. |
| Group status overview | See online/offline count per group | Low | **BUILT**: `v_screen_groups_with_counts` view used in fetchScreenGroups | Working. |
| Language settings per group | Different groups serve different languages | Low | **BUILT**: `updateGroupLanguage()` + `ScreenGroupSettingsTab` component | Working. |

**Verdict: Screen groups are ~85% complete.** Gaps: (1) No "push playlist to group" flow (only scene publishing exists). (2) No group-level schedule assignment. (3) No group overview dashboard showing content status across all groups. (4) Missing bulk operations (rename, tag, delete multiple groups).

### 4. Clock/Date Widget

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Digital clock display | Lobby screens, wayfinding, corporate | Low | **BUILT**: `ClockWidget.jsx` in player renders time with 1-second interval, configurable size + color | Working. |
| Date display | Expected alongside clock | Low | **BUILT**: `DateWidget.jsx` renders formatted date, 3 format presets (short/long/full) | Working. |
| 12h/24h format toggle | US vs international | Low | **PARTIAL**: ClockWidget uses hardcoded `hour12: true`. Layout editor widget has `format: '12h'` prop but player ignores it | Need to wire format prop through to player widget |
| Timezone support | Show time for a specific timezone (e.g., NYC office shows Tokyo time) | Med | **NOT BUILT**: Both widgets use `new Date()` (local browser time). No timezone config in widget props. Device timezone exists in player content payload (`device.timezone`) | Need to add `timezone` prop and use `Intl.DateTimeFormat` with `timeZone` option |
| Custom font size | Fit the widget to any zone size | Low | **BUILT**: `size` prop with small/medium/large/custom presets, `customFontSize` for pixel control | Working. |

**Verdict: Clock/date is ~65% complete.** Gaps: (1) No timezone awareness (critical for multi-location deployments). (2) 24-hour format not wired to player. (3) No combined clock+date widget (users often want "10:30 AM | Thursday, Feb 13" in a single zone). (4) No analog clock style. (5) No seconds display option.

### 5. Portrait Mode (Vertical Display Support)

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| 1080x1920 layout template | Retail, restaurant menu boards, wayfinding | Med | **PARTIAL**: `svgTemplateService.js` has portrait preset (1080x1920). WeatherWallConfigModal has orientation selector. Templates include 1 portrait template. | Layout editor needs portrait-aware canvas. |
| Content auto-adapts to orientation | Users should not manually redesign everything | Med | **PARTIAL**: WeatherWall handles portrait/landscape rendering. Layout zones use percentage-based positioning (orientation-agnostic). | Percentage zones auto-adapt. Scene editor (Fabric.js) is pixel-based -- needs explicit portrait canvas size. |
| Player renders portrait without CSS rotation hacks | Physical screen is rotated 90 degrees | Med | **NOT BUILT**: No player-side orientation detection or rotation. Many cheap signage players rotate via OS display settings, not app-level. | Player should detect orientation from device config or viewport aspect ratio and adjust content accordingly. |
| Template marketplace has portrait options | Users expect pre-built portrait designs | Low | **PARTIAL**: 1 portrait SVG template exists. WeatherWall supports portrait orientation. | Need 3-5 portrait templates minimum for launch. |

**Verdict: Portrait mode is ~40% complete.** This is the most infrastructure-heavy table stakes feature. The layout system's percentage-based zones are inherently orientation-agnostic, which is good. But the scene editor, template marketplace, and player need explicit portrait support.

### 6. QR Code Widget

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Generate QR from URL | Reviews, menu links, WiFi login pages | Low | **BUILT**: `qrcodeService.js` generates QR via `qrcode` library. `QRCodeWidget.jsx` in player renders via `qrcode.react` (QRCodeSVG). | Working. |
| WiFi QR code | Lobby/restaurant WiFi sharing | Low | **BUILT**: `generateWiFiQRCode(ssid, password, encryption)` in service | Service exists; need admin UI to select "WiFi" QR type and enter SSID/password |
| Customizable colors | Match brand theme | Low | **BUILT**: `qrFgColor`, `qrBgColor` props in player widget | Working. |
| Error correction levels | High correction for print/screen viewing | Low | **BUILT**: `errorCorrection` prop with L/M/Q/H levels | Working. |
| Label below QR code | "Scan for Menu" text | Low | **BUILT**: `label` prop renders text below QR | Working. |
| Scale control | Size QR within zone | Low | **BUILT**: `qrScale` prop (0.5-2.0 range) | Working. |

**Verdict: QR code is ~80% complete.** Gaps: (1) Admin config UI for QR type selection (URL vs WiFi vs plain text). (2) WiFi QR flow not exposed in layout editor sidebar. (3) No dynamic QR (e.g., QR that changes URL based on schedule or data source). (4) No logo/image overlay in center of QR code (common branding feature).

---

## Differentiators

Features that set BizScreen apart. Not expected, but high value when present.

### 7. Menu Board Widget (Data-Driven)

| Feature | Value Proposition | Complexity | Existing BizScreen State | Notes |
|---------|-------------------|------------|--------------------------|-------|
| Structured menu template (categories, items, prices) | Restaurant vertical is huge for signage. Most competitors offer this but poorly (static images). | High | **PARTIAL**: `restaurant-menu-template.json` is a static scene template with hardcoded items. Data binding exists (`dataBindingResolver.js`, `DataBoundWizardModal`). | The static template proves the concept. Real value is data-driven: connect a Google Sheet of menu items and auto-render a styled menu board. |
| Auto-pagination for long menus | 50+ item menus need to rotate across multiple "pages" on screen | High | **NOT BUILT** as a cohesive feature. DataTableWidget has pagination. | Combine pagination logic with menu styling. |
| Category grouping (Appetizers, Entrees, Drinks) | Organized menus with section headers | Med | **NOT BUILT**: Template has static category headings. | Need category field in data source, auto-grouping renderer. |
| Price display with currency formatting | "$12.99" or "12,99 EUR" based on locale | Low | **NOT BUILT**: Template hardcodes dollar signs in text. | Use Intl.NumberFormat with locale. |
| Item photos alongside menu items | Photo menus convert better (fast food, QSR) | Med | **NOT BUILT**: Template uses static decorative images, not per-item photos. | Support image URL column in data source, render inline or as grid. |
| Dietary icons/badges (V, VG, GF, spicy) | Expected in modern restaurant menus | Low | Not built. | Icon mapping from data source tags. |
| Real-time price/availability updates | "86'd" items or happy hour pricing | Med | Data source refresh exists (orchestrator). | Connect menu board to data source refresh cycle. |
| Multi-page layout (different boards for different sections) | Large restaurants with multiple screens | Med | **PARTIAL**: Playlists cycle through content. Screen groups target screens. | Combine: each menu section is a scene, group of scenes pushed to screen group. |

**Verdict: Menu board is ~20% complete.** This is the highest-complexity, highest-value new feature. The restaurant template proves visual feasibility but is entirely static. The real differentiator is connecting the data binding system (Google Sheets of menu items) to styled menu rendering with auto-pagination and category grouping. Competitors (Yodeck, ScreenCloud) offer basic menu board apps but few do true data-driven menus with live updates.

### Additional Differentiators (Lower Priority)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Combined clock + weather bar widget | Single zone shows "10:30 AM -- 72F Sunny -- Thursday, Feb 13". Common in lobby/reception displays. | Low | Combine existing clock, date, weather widgets into one horizontal bar. |
| Analog clock style | Premium feel for corporate lobbies, hotels | Med | SVG-based analog clock face with rotating hands. New component. |
| Video wall sync (play same video across screen group) | Impressive for retail/events -- 2x2 or 3x3 video walls | High | Would require WebSocket time-sync between players. Defer to future. |
| QR code with embedded logo | Brand logo in center of QR code. Premium feel. | Med | Use higher error correction (H) + overlay brand image. qrcode library may support. |
| Screen group scheduling | Push different content to a group at different times (breakfast menu vs lunch menu) | Med | Combines screen groups with existing campaign/dayparting scheduler. |
| Weather-triggered content | "Show iced coffee ad when temp > 80F" | High | Combines weather API with campaign rules. Complex but powerful differentiator. |

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom video player controls (play/pause/seek) | Digital signage is passive; there is no viewer to control playback. Controls add complexity and attack surface. | Auto-play, auto-loop, auto-advance only. Muted by default. |
| Real-time weather alerts/severe weather push | Liability concern. Weather alerts require NOAA/NWS integration, legal disclaimers, and reliability guarantees. | Show current conditions and forecast. Let emergency override system handle severe weather messaging. |
| Video transcoding/encoding on upload | Massive infrastructure cost. Users should upload web-ready formats. | Validate accepted formats (MP4 H.264, WebM VP9). Reject unsupported formats with helpful error message. |
| Menu board POS integration | POS systems (Toast, Square, Clover) have complex APIs, require OAuth, and change frequently. Too much scope. | Google Sheets or CSV as data source for menu items. POS integration can be a future premium feature. |
| Interactive QR code analytics (scan tracking) | Requires server-side redirect infrastructure, analytics pipeline, GDPR consent. | Static QR codes pointing to user-controlled URLs. Users can track via their own URL shortener (bit.ly, etc.). |
| Screen group auto-discovery (mDNS/SSDP) | Network discovery is unreliable across subnets, firewalls, VLANs. Support nightmare. | Manual OTP pairing (already built) + manual group assignment. |
| Portrait mode auto-detection via accelerometer | Web browsers have limited accelerometer access, and signage players are physically mounted once. | User selects orientation in device settings. Player reads orientation from config. |

---

## Feature Dependencies

```
Weather Widget (enhanced)
  --> Timezone support in Clock/Date (shared timezone infrastructure)

Clock/Date Widget (enhanced)
  --> Timezone utility functions (shared with weather, countdown)

QR Code Widget (enhanced)
  --> WiFi QR admin UI (new settings panel in layout sidebar)

Video Playback (enhanced)
  --> Media preloader connection (wire existing mediaPreloader to ZonePlayer)
  --> No external dependencies

Portrait Mode
  --> Layout editor canvas resizing (new)
  --> Portrait template library (content creation)
  --> No dependency on other 6 features

Screen Groups (enhanced)
  --> Playlist push to groups (extends existing scene push)
  --> Schedule assignment per group (extends existing campaign system)
  --> No dependency on widget features

Menu Board Widget (NEW)
  --> Data source system (already built: Google Sheets, CSV)
  --> Data binding resolver (already built: dataBindingResolver.js)
  --> Scene/template rendering (already built: Fabric.js, Polotno)
  --> Auto-pagination (new, builds on DataTableWidget pagination)
  --> Portrait mode (menu boards often run portrait)
```

**Dependency order summary:**
1. Clock/Date + Weather (timezone infrastructure first, shared by both)
2. QR Code + Video (independent, can parallel with #1)
3. Portrait Mode (enables menu board portrait layouts)
4. Screen Groups (independent of widgets, can parallel)
5. Menu Board (depends on portrait mode + data binding, build last)

---

## MVP Recommendation

### Must Ship (Table Stakes Completion)

1. **Clock/Date Widget Enhancement** -- Add timezone support (using `Intl.DateTimeFormat`), wire 12h/24h format to player, add combined clock+date mode. LOW effort, HIGH impact for multi-location deployments.

2. **Video Playback Enhancement** -- Connect mediaPreloader to ZonePlayer for seamless transitions, add single-video loop mode, add video duration override in playlist editor. MEDIUM effort, removes a rough edge.

3. **Weather Widget Polish** -- Ensure zone-embedded widget (not just WeatherWall app) uses live data in player. Add timezone-aware display. LOW effort, mostly wiring.

4. **QR Code Admin UI** -- Add QR type selector (URL/WiFi/text) in layout editor sidebar. Expose WiFi SSID/password fields. LOW effort, HIGH perceived completeness.

5. **Portrait Mode** -- Layout editor portrait canvas option (1080x1920), 3-5 portrait templates. Player reads orientation from device config. MEDIUM effort, unlocks entire vertical display market.

6. **Screen Groups Enhancement** -- Add "push playlist to group" action in playlist editor. Group-level quick actions from main screen list. LOW effort on existing foundation.

### Defer to Future

7. **Menu Board Widget** -- This is the correct #7 because it depends on portrait mode being solid, requires data-driven template rendering infrastructure, and is the highest-complexity item. Build it as a separate focused milestone after the display toolkit foundation is solid. It is a differentiator, not table stakes -- users will accept "use the restaurant template + manual editing" as V1.

### Rationale

Build order follows dependency chain: timezone infrastructure (clock/date/weather) first, then independent improvements (video/QR/screen groups/portrait), then menu board last because it consumes all of them. This also means the first 4-5 items ship quickly (1-2 days each) creating visible progress, while the menu board gets its own focused phase.

---

## Complexity Breakdown by Feature

| Feature | Admin UI Work | Service Layer Work | Player Rendering Work | Total Estimate |
|---------|--------------|-------------------|----------------------|----------------|
| Clock/Date Enhancement | Wire format/timezone props to sidebar | None (use Intl API) | Add timezone + format logic to ClockWidget/DateWidget | Low (1-2 days) |
| Video Playback Enhancement | Duration override in playlist editor | None | Preloader wiring, loop mode, seamless transition | Medium (2-3 days) |
| Weather Widget Polish | Minor -- zone widget config in sidebar | None (already built) | Ensure WeatherWidget uses live data, add timezone | Low (1 day) |
| QR Code Admin UI | QR type selector, WiFi fields in sidebar | None (service has WiFi QR) | None (player widget already works) | Low (1 day) |
| Portrait Mode | Canvas size toggle, portrait template CRUD | Portrait layout creation service | Orientation-aware rendering | Medium (3-4 days) |
| Screen Groups Enhancement | Push playlist flow, group quick actions | Extend service for playlist push | None | Low-Med (2 days) |
| Menu Board Widget | Template builder, category/item editor, price formatting UI | Data-to-menu rendering pipeline, auto-pagination service | Menu renderer with categories, pricing, photos, pagination | High (5-8 days) |

**Total estimated effort: 15-21 days** across all 7 features.

---

## Competitive Landscape (User Expectations by Feature)

### Weather Widget
**What competitors offer:** Yodeck has Weather Wall (3 themes, 12 languages, forecast). ScreenCloud has Weather App. OptiSigns has weather widget. All offer current + forecast, unit toggle, location input, themed display.
**BizScreen position:** Already at parity with full WeatherWall app. Zone widget is simpler than competitors (no forecast in compact mode) -- acceptable.
**Confidence:** MEDIUM (based on training data, not verified against current competitor sites)

### Video Playback
**What competitors offer:** All platforms support MP4/WebM playback. Yodeck supports 4K. ScreenCloud supports video playlists with transition effects. Most require H.264/H.265 codec. None offer in-browser transcoding.
**BizScreen position:** Basic playback works. Needs preloading for seamless transitions (competitors do this). Loop mode is expected.
**Confidence:** HIGH (video playback is well-understood; existing code confirms behavior)

### Screen Groups
**What competitors offer:** Yodeck has "Screen Groups" with bulk content push. ScreenCloud has "Channels" that map to screen groups. OptiSigns has "Groups" with bulk scheduling. All support location-based grouping.
**BizScreen position:** Ahead of most on group management (CRUD, scene publishing, language per group). Behind on playlist/schedule push to groups.
**Confidence:** HIGH (service layer code confirms feature set)

### Portrait Mode
**What competitors offer:** All major platforms support portrait (9:16). Yodeck auto-detects orientation from player device. ScreenCloud requires manual orientation setting. Most offer portrait-specific templates.
**BizScreen position:** Behind. Only 1 portrait template. No explicit portrait mode in layout editor. WeatherWall supports it; other features do not.
**Confidence:** HIGH (code analysis confirms gaps)

### Clock/Date
**What competitors offer:** Simple utility widgets. Most offer 12h/24h toggle, timezone selection (world clock), optional seconds, analog/digital styles. Often combined as a single widget with configurable parts.
**BizScreen position:** Basic widgets work but lack timezone and format configuration in player. Behind on analog clock style (nice-to-have).
**Confidence:** HIGH (widget code confirms current capabilities and gaps)

### QR Code
**What competitors offer:** URL QR, WiFi QR, vCard QR. Color customization. Logo overlay (premium feature in some). Dynamic QR (URL changes based on context -- rare).
**BizScreen position:** Strong. URL and WiFi QR services exist. Player widget has color, scale, error correction. Missing admin UI for WiFi config and logo overlay.
**Confidence:** HIGH (service and widget code confirms)

### Menu Board
**What competitors offer:** Yodeck has "Digital Menu Board" app with templates. ScreenCloud has menu board templates. OptiSigns has menu board with Google Sheets integration. NoviSign has data-driven menu boards. Most are template-based with manual editing; few offer true data-driven auto-rendering.
**BizScreen position:** Behind on dedicated menu board feature. Has static restaurant template. Has data source infrastructure (Google Sheets, CSV, data binding). The combination of data binding + menu rendering is a differentiator opportunity.
**Confidence:** MEDIUM (competitor features based on training data)

---

## Sources

- **BizScreen codebase analysis** (HIGH confidence):
  - `/Users/massimodamico/bizscreen/src/services/weatherService.js` -- OpenWeatherMap integration with caching, forecast, coords
  - `/Users/massimodamico/bizscreen/src/components/WeatherWall/` -- 3-theme weather app (Animated, Classic, Glass)
  - `/Users/massimodamico/bizscreen/src/components/apps/WeatherWallConfigModal.jsx` -- Full config UI
  - `/Users/massimodamico/bizscreen/src/services/qrcodeService.js` -- QR generation (URL, WiFi, batch)
  - `/Users/massimodamico/bizscreen/src/services/screenGroupService.js` -- Full CRUD + scene publishing
  - `/Users/massimodamico/bizscreen/src/pages/ScreenGroupDetailPage.jsx` -- Device assignment UI
  - `/Users/massimodamico/bizscreen/src/player/components/ZonePlayer.jsx` -- Video/image/app rendering in zones
  - `/Users/massimodamico/bizscreen/src/player/components/widgets/` -- Clock, Date, Weather, QR, DataTable, RSS widgets
  - `/Users/massimodamico/bizscreen/src/player/components/AppRenderer.jsx` -- App routing with data caching
  - `/Users/massimodamico/bizscreen/src/components/layout-editor/LayoutElementRenderer.jsx` -- Admin-side widget preview
  - `/Users/massimodamico/bizscreen/src/services/svgTemplateService.js` -- Portrait/landscape presets
  - `/Users/massimodamico/bizscreen/src/services/mediaPreloader.js` -- Image/video preloading with bandwidth detection
  - `/Users/massimodamico/bizscreen/src/templates/restaurant-menu-template.json` -- Static menu template
- **Digital signage industry patterns** (MEDIUM confidence, training data):
  - Yodeck app marketplace patterns (Weather Wall, QR Code, Clock, Menu Board)
  - ScreenCloud app store patterns (Weather, QR, Menu Board)
  - OptiSigns widget patterns (Google Sheets menu board)
  - Rise Vision widget patterns (Weather, Clock, QR)
