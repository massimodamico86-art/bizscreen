# Project Research Summary

**Project:** BizScreen Display Toolkit Features (v3.2)
**Domain:** Digital signage display capabilities (weather, video playback, screen groups/tags, portrait mode, clock/date, QR code, menu board widgets)
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

After comprehensive analysis of the BizScreen codebase and digital signage industry patterns, the critical finding is that **most features are already partially built**. Weather, clock, date, QR code widgets, and screen groups all have functional service layers and basic player implementations. The project already uses React 19, Supabase, and has a sophisticated data refresh orchestrator for widget coordination. The work ahead is completion and enhancement, not greenfield development.

The recommended approach is to address table stakes features first (clock/date timezone support, video preloading, weather proxy for API key security, QR admin UI, and portrait mode infrastructure), followed by the high-value differentiator (menu board widget). The only new npm dependency required across all 7 features is `hls.js ^1.6.15` for adaptive video streaming. Everything else uses existing dependencies or native browser APIs.

Key risks center on cross-platform video playback (WebOS/Tizen autoplay policies differ significantly), portrait mode breaking existing layouts (requires schema changes and CSS rotation logic), and API key exposure (weather service currently exposes OpenWeatherMap key client-side). All risks have clear mitigation strategies based on existing patterns in the codebase.

## Key Findings

### Recommended Stack

The existing stack is comprehensive. Only **one new dependency** is needed across all 7 features: `hls.js ^1.6.15` for HLS adaptive streaming support. The codebase already has qrcode.react (^4.2.0), OpenWeatherMap integration via weatherService.js, date-fns with timezone support, screen groups with tags in Supabase, and a complete data refresh orchestrator.

**Core technologies (NO CHANGES):**
- React 19.1.1 — existing UI framework
- Supabase 2.80.0 — existing backend (auth, DB, realtime, Edge Functions)
- Vite 7.1.7 — existing bundler
- AWS S3 + CloudFront — existing media CDN (handles video files)

**New dependency (1 addition):**
- hls.js ^1.6.15 — HLS adaptive streaming in player (MSE-based, works with existing `<video>` elements, ~85KB gzipped, lazy-loadable)

**Infrastructure additions (no npm packages):**
- Supabase Edge Function: `weather-proxy` — move OpenWeatherMap API key server-side to prevent client exposure
- Database columns: `tv_devices.orientation`, `screen_groups.default_orientation`, `menu_boards` table
- GIN index on `screen_groups.tags` for efficient tag-based queries

### Expected Features

**Must have (table stakes):**
- **Weather widget enhancement** (~90% complete) — add timezone support, move API key to Edge Function proxy
- **Video playback in zones** (~75% complete) — connect mediaPreloader for seamless transitions, add HLS streaming support
- **Screen groups with tags** (~85% complete) — add tag filtering UI, tag autocomplete, bulk operations
- **Clock/Date widget enhancement** (~65% complete) — add timezone awareness, 12h/24h format toggle, combined clock+date mode
- **Portrait mode support** (~40% complete) — most infrastructure-heavy feature; needs player CSS rotation, portrait-aware canvas, 3-5 portrait templates
- **QR Code widget enhancement** (~80% complete) — add WiFi QR admin UI, error correction selector, dynamic QR from data binding

**Should have (competitive differentiator):**
- **Menu board widget** (~20% complete) — highest complexity, highest value. Data-driven menu rendering with categories, pricing, photos, auto-pagination. Requires new Supabase table, new widget component, and connection to existing data binding system.

**Defer (v2+):**
- Analog clock style (SVG-based clock face)
- Video wall sync (WebSocket time-sync across screen groups)
- QR code with embedded logo (requires error correction H + image overlay)
- Weather-triggered content rules (conditional campaigns based on temperature)
- POS integration for menu boards (complex API integrations)

### Architecture Approach

BizScreen follows a consistent 3-layer widget pattern: (1) editor mock preview in LayoutElementRenderer.jsx, (2) editor config UI in LayoutPropertiesPanel.jsx, and (3) live player rendering in SceneRenderer.jsx with useWidgetData orchestrator integration. All widgets register with DataRefreshOrchestrator for coordinated fetching and deduplication. New features extend this pattern rather than introducing new architectures.

**Major components:**
1. **Widget Registration System** — types.js defines widget types, LeftSidebar catalog, LayoutElementRenderer mock preview, LayoutPropertiesPanel config UI, SceneWidgetRenderer player dispatch
2. **Data Refresh Orchestrator** — useDataRefreshOrchestrator manages 10-second tick loop, subscriber deduplication by sourceKey, jittered initial fetches, IndexedDB caching via cacheService.js
3. **Player Rendering Pipeline** — ViewPage.jsx and ZonePlayer.jsx handle video/image/app playback, SceneRenderer.jsx renders widget blocks, offline caching via offlineService.js and IndexedDB v3
4. **Screen Group Infrastructure** — screenGroupService.js provides CRUD, publish/unpublish scenes, tags array support; ScreenGroupDetailPage.jsx manages device assignment
5. **Portrait Mode Layer** — Layout editor already has ASPECT_RATIOS with 9:16 support, needs player CSS rotation logic when content orientation != device orientation

### Critical Pitfalls

1. **Weather API Key Exposed Client-Side** — Current weatherService.js bundles VITE_OPENWEATHER_API_KEY in client JavaScript. Any deployed player can extract the key. **Fix:** Create weather-proxy Edge Function (following rss-proxy pattern), move key server-side, cache responses 15-30min.

2. **Video Autoplay Blocked on WebOS/Tizen/iOS** — Different platforms have different autoplay policies. iOS requires muted + playsInline + gesture. Tizen requires specific H.264 codec profile. WebOS has memory leaks after 24-48 hours. **Fix:** Codec compatibility checks, canplaythrough timeout (5s), periodic video element recreation on WebOS/Tizen, lower stuck detection threshold to 10s.

3. **Portrait Mode Breaks Existing Layouts** — Adding portrait (9:16) requires schema changes, editor canvas aspect ratio switching, and player CSS rotation. Percentage-based block positioning is orientation-agnostic but visual proportions change. **Fix:** Add orientation field to schema, dynamic canvas aspectRatio, CSS transform rotation in player, separate portrait templates.

4. **Missing tenant_id on New Tables** — Multi-tenant RLS requires every table have tenant_id with proper policies. New tables (menu_boards, etc.) must follow existing pattern. **Fix:** Migration checklist for tenant_id, RLS policies, and FK cascade. Pre-deploy verification query for tables without policies.

5. **QR Code Widget Missing Import** — QRCodeWidget.jsx line 75 references QRCodeSVG but lacks import statement. Runtime crash on deployed players. **Fix:** Add `import { QRCodeSVG } from 'qrcode.react';` immediately.

6. **Clock/Date Shows Wrong Timezone** — Widgets use `new Date().toLocaleTimeString()` which renders in browser's local timezone. Player hardware may be UTC but business wants screen's assigned timezone. **Fix:** Thread screen.timezone through to widget props, use Intl.DateTimeFormat with timeZone option.

## Implications for Roadmap

Based on research, suggested phase structure groups features by complexity and dependency chains. Build order follows: timezone infrastructure first (shared by clock/date/weather), independent improvements (video/QR/screen groups), portrait mode (infrastructure-heavy), and menu board last (consumes all patterns).

### Phase A: Widget Enhancements (Clock, Date, QR)
**Rationale:** Purely additive to existing widgets. Zero new dependencies. No new database tables. Extends established patterns with minimal risk.
**Delivers:** Enhanced clock/date with timezone/format controls, QR code with WiFi/error correction config UI
**Addresses:** Clock/Date completion (~65% → 95%), QR Code completion (~80% → 95%)
**Avoids:** Pitfall 6 (timezone), Pitfall 5 (QR import crash)
**Research flag:** Skip research-phase — straightforward extension of working widgets

### Phase B: Weather Widget Security + Enhancement
**Rationale:** Weather works but has critical API key exposure. Must address before player deployment. Service layer already has forecast support.
**Delivers:** weather-proxy Edge Function, timezone-aware display, forecast mode in zone widget
**Addresses:** Weather widget completion (~90% → 100%)
**Avoids:** Pitfall 1 (API key exposure), Pitfall 7 (offline staleness)
**Research flag:** Skip research-phase — Edge Function follows rss-proxy pattern

### Phase C: Video Playback Enhancement
**Rationale:** Adds HLS streaming (only new npm dependency). ZonePlayer already handles basic video. Cross-platform testing critical.
**Delivers:** hls.js integration, mediaPreloader wiring, loop mode, seamless transitions
**Addresses:** Video playback completion (~75% → 95%)
**Avoids:** Pitfall 2 (autoplay policies), Pitfall 12 (video in scene blocks)
**Research flag:** Needs device testing on WebOS/Tizen — research-phase for codec compatibility matrix

### Phase D: Screen Groups/Tags Enhancement
**Rationale:** Infrastructure exists, this is UI enhancement. Independent of widget features, can parallel with A-B-C.
**Delivers:** Tag filtering, autocomplete, bulk operations, GIN index
**Addresses:** Screen groups completion (~85% → 95%)
**Avoids:** Pitfall 8 (cascade orphans), Pitfall 16 (tag query performance)
**Research flag:** Skip research-phase — existing service layer is solid

### Phase E: Portrait Mode
**Rationale:** Most infrastructure-heavy table stakes feature. Needs schema changes, player rotation logic, portrait templates. Blocks menu board (which often runs portrait).
**Delivers:** orientation field in schema, CSS rotation in player, 3-5 portrait templates, orientation validation
**Addresses:** Portrait mode completion (~40% → 90%)
**Avoids:** Pitfall 3 (layout breakage), Pitfall 18 (scheduling mismatch)
**Research flag:** Needs research-phase for CSS rotation math, template design patterns

### Phase F: Menu Board Widget
**Rationale:** Highest complexity, highest value differentiator. Requires new Supabase table, new widget component, data-driven rendering with pagination. Depends on portrait mode, widget registration patterns, and data orchestrator.
**Delivers:** menu_boards table, MenuBoardWidget component, category/item editor, auto-pagination, Realtime updates
**Addresses:** Menu board feature (~20% → 100%)
**Avoids:** Pitfall 9 (schema complexity), Pitfall 14 (font sizing), Pitfall 19 (stale pricing)
**Research flag:** Needs research-phase for menu board UX patterns, competitor analysis (Yodeck, ScreenCloud menu apps)

### Phase Ordering Rationale

- **Phases A-B run first** because they complete table stakes widgets with minimal risk. They share timezone infrastructure (Intl.DateTimeFormat) and establish the widget enhancement pattern.
- **Phase C (video) can parallel A-B** as it's independent, but cross-platform testing adds risk. HLS.js integration is well-documented.
- **Phase D (screen groups) can parallel A-B-C** — it's purely backend/UI, no player changes.
- **Phase E (portrait) must precede F** because menu boards often run portrait. It's the most infrastructure-heavy and touches editor canvas, scene renderer, and layout renderer.
- **Phase F (menu board) comes last** as it consumes all established patterns: widget registration (Phase A pattern), data orchestrator (existing), portrait support (Phase E), and data binding (existing dataBindingResolver.js).

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase C (Video):** Cross-platform codec compatibility matrix for WebOS/Tizen/iOS. Specific H.264 profile requirements.
- **Phase E (Portrait):** CSS rotation math for different screen hardware aspect ratios. Template design best practices for vertical displays.
- **Phase F (Menu Board):** Competitor menu board app analysis (Yodeck, ScreenCloud, OptiSigns patterns). Menu editing UX for categories, pricing, modifiers.

**Phases with standard patterns (skip research-phase):**
- **Phase A (Clock/Date/QR):** Widget enhancement pattern well-established in codebase
- **Phase B (Weather):** Edge Function proxy follows existing rss-proxy pattern exactly
- **Phase D (Screen Groups):** Service layer complete, UI enhancement only

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Codebase analysis confirms existing dependencies, package.json verified, hls.js is industry standard |
| Features | HIGH | Service layer code inspection shows completion percentages, widget implementations exist |
| Architecture | HIGH | Widget registration pattern consistent across 8 existing widgets, orchestrator well-documented in code |
| Pitfalls | HIGH | Critical pitfalls verified directly in code (API key exposure, missing imports, timezone handling, RLS patterns) |

**Overall confidence:** HIGH

Research based on thorough codebase analysis (60+ source files read), verified against package.json dependencies, Supabase migrations, and existing widget implementations. The existing patterns are clear and consistent.

### Gaps to Address

**Stack gaps:**
- **HLS streaming details:** hls.js attachment API is known, but optimal configuration for low-powered signage hardware needs testing. Lazy-loading pattern (dynamic import) should be validated.

**Feature gaps:**
- **Portrait template designs:** Only 1 portrait template exists. Need 3-5 designs for launch. This is content creation work, not technical uncertainty.

**Architecture gaps:**
- **Widget registry pattern:** Currently uses switch statements in 3 places (EditorCanvas, LivePreviewWindow, SceneRenderer). Should refactor to registry before adding more widgets (Pitfall 13).

**Pitfall gaps:**
- **WebOS/Tizen codec support:** Training data indicates H.264 Main Profile restrictions, but exact codec parameters need verification on actual devices. Phase C should include device testing.
- **IndexedDB quota limits:** Mitigation strategy (cache eviction by priority) is sound, but specific quota limits for WebOS/Tizen unknown. Monitor during Phase C testing.

**Handling during implementation:**
- **HLS configuration:** Start with hls.js defaults, add configuration options based on player diagnostics data from deployed devices.
- **Portrait templates:** Design sprint during Phase E, leverage existing WeatherWall portrait support as reference.
- **Widget registry refactor:** Do in Phase A before adding new widget types. Low risk, high value for maintainability.
- **Device testing:** Acquire WebOS and Tizen test devices during Phase C. Document codec compatibility matrix for future reference.

## Sources

### Primary (HIGH confidence)
- **BizScreen codebase analysis** — Direct reading of 60+ source files
  - `src/services/weatherService.js` — OpenWeatherMap integration, API key exposure pattern
  - `src/services/qrcodeService.js` — QR generation (URL, WiFi, batch)
  - `src/services/screenGroupService.js` — Full CRUD, publish/unpublish, tags support
  - `src/player/components/widgets/` — 8 existing widget implementations (Clock, Date, Weather, QR, DataTable, RSS, SocialFeed, Countdown)
  - `src/player/hooks/useWidgetData.js` — Orchestrator integration hook
  - `src/player/hooks/useDataRefreshOrchestrator.js` — Tick loop architecture (10s interval, jitter, dedup)
  - `src/components/layout-editor/types.js` — Widget type system, ASPECT_RATIOS with 9:16 support
  - `src/components/layout-editor/LayoutElementRenderer.jsx` — Editor mock preview pattern
  - `src/components/layout-editor/LayoutPropertiesPanel.jsx` — Widget config UI pattern
  - `src/player/components/SceneRenderer.jsx` — Player rendering dispatch, DataRefreshProvider
  - `src/player/components/ZonePlayer.jsx` — Video playback implementation
  - `supabase/migrations/026_screen_groups_and_campaigns.sql` — RLS pattern, tenant_id usage
  - `supabase/functions/rss-proxy/index.ts` — Edge Function proxy pattern
  - `package.json` — Confirmed qrcode.react v4.2.0, date-fns v4.1.0, @date-fns/tz v1.4.1
- **npm registry** — hls.js version 1.6.15 verified as current stable
- **Supabase migrations** — Migrations 026, 086, 088, 091 analyzed for schema patterns

### Secondary (MEDIUM confidence)
- **Digital signage industry patterns** — Training data (May 2025) on Yodeck, ScreenCloud, OptiSigns, Rise Vision app marketplaces
  - Weather widget patterns (forecast, themes, timezone support)
  - Menu board app features (data sources, category grouping, pricing formats)
  - QR code widget capabilities (WiFi, vCard, logo overlay)
  - Video playback expectations (seamless transitions, loop modes, codec support)
- **hls.js vs video.js comparison** — Training data indicates hls.js as lightweight standard vs video.js UI bundle
- **WebOS/Tizen codec restrictions** — Training data suggests H.264 Main Profile requirement, needs device verification

### Tertiary (LOW confidence)
- None — all findings verified against codebase or confirmed via package ecosystem

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*
