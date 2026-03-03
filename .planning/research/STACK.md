# Technology Stack: v12.0 Feature Parity

**Project:** BizScreen - 14 new features (document display, YouTube/Vimeo, web page widget, proof of play, SSO/SAML, public REST API, nested playlists, media expiration, working hours scheduling, audio/background music, video wall, calendar widgets, Google Slides, Canva integration)
**Researched:** 2026-03-02
**Focus:** Stack additions needed for 14 new features on existing React 19 + Supabase platform

---

## Executive Summary

After thorough analysis of the existing codebase, **10 of 14 features require ZERO new npm dependencies**. The project already has substantial foundation code: an SSO service (`ssoService.js`), API versioning framework (`apiVersionService.js`), Canva OAuth service (`canvaService.js`), Google Drive OAuth with shared PKCE utilities (`cloudOAuthService.js`), a web page app in AppRenderer, a playback tracking service, audio as a recognized media type, and `ical.js` for calendar parsing.

The primary gaps requiring new libraries are:

1. **PDF rendering on player devices** -- `pdfjs-dist` for converting PDF pages to canvas (required for offline-capable player display on WebOS/Tizen)
2. **Server-side document conversion** -- LibreOffice headless via Supabase Edge Function or a conversion API for Word/PPT/Excel to images (player cannot render Office formats natively)
3. **Video wall time synchronization** -- No new library needed; use Supabase Realtime channels with NTP-style offset calculation

Everything else builds on existing patterns: YouTube/Vimeo use iframes (already in WebPageApp pattern), SAML uses Supabase Auth SSO API (already in `@supabase/supabase-js`), the REST API uses Supabase Edge Functions (existing pattern), audio uses HTML5 `<audio>` element, and Google Calendar/Slides/Canva extend the existing Google OAuth pattern.

---

## What Already Exists (DO NOT ADD)

These capabilities are already in the codebase and working. Adding duplicates would be wasteful.

| Capability | Existing Code | Used By |
|-----------|---------------|---------|
| Google OAuth + PKCE | `cloudOAuthService.js`, `googleDriveService.js` | Cloud imports |
| Canva OAuth + API | `canvaService.js`, `CanvaCallbackPage.jsx` | Canva import flow |
| SSO provider config | `ssoService.js` (SAML + OIDC support, sso_providers table) | Enterprise security |
| API versioning + scopes | `apiVersionService.js` (V1_ENDPOINTS, scope validation) | Developer settings |
| Web page iframe display | `WebPageApp` in `AppRenderer.jsx` | App renderer |
| Playback tracking | `playbackTrackingService.js` (event queue, offline queue, flush) | Player |
| Widget registry | `src/widgets/registry.js` (12 types, one-file registration) | Editors + player |
| Audio media type | `mediaService.js` MEDIA_TYPES.AUDIO | Media library |
| Calendar parsing | `ical.js` 2.2.1 in package.json | Schedule features |
| HLS video streaming | `hls.js` 1.6.15 | Video playback |
| IndexedDB offline cache | `idb` 8.0.3 | Player offline |
| Supabase Realtime | `@supabase/supabase-js` 2.80.0 | Live sync |
| DOMPurify sanitization | `isomorphic-dompurify` 2.35.0 | RSS/content safety |
| Date/timezone handling | `date-fns` 4.1.0 + `@date-fns/tz` 1.4.1 | Scheduling |
| Drag-and-drop | `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 | Playlist ordering |
| Feature flags | `useFeatureFlag.jsx`, `featureFlags.js` (ENTERPRISE_SSO exists) | Plan gating |
| Edge Functions (Deno) | 4 existing: unsplash-proxy, rss-proxy, weather-proxy, ai-designer | Server-side proxies |

---

## Recommended Stack Additions

### 1. PDF Rendering (Document Display)

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| `pdfjs-dist` | ^4.x | Render PDF pages to canvas on player | Mozilla's PDF.js is the only production-grade browser PDF renderer. Works on all player platforms (web, Android WebView, iOS WKWebView, WebOS, Tizen). Canvas-based rendering means it works offline after caching. No `react-pdf` wrapper needed -- direct canvas rendering is simpler for signage where we render page-by-page as slides. |

**Confidence:** HIGH -- pdfjs-dist is the universal standard for browser PDF rendering. Used by Firefox, Chrome's fallback, and every PDF viewer library (react-pdf is just a wrapper around it).

**Integration point:** New `PDFWidget` in `src/player/components/widgets/`. Registers in `WIDGET_REGISTRY` as type `pdf`. Uses pdfjs-dist `getDocument()` + `page.render()` to paint each page onto a `<canvas>`. Auto-paginates with configurable interval (matching DataTableWidget pagination pattern).

**Bundle impact:** pdfjs-dist worker is ~800KB but can be loaded as a separate web worker file (not in main bundle). Use `pdfjs.GlobalWorkerOptions.workerSrc` pointing to CDN or self-hosted worker file in `/public/`.

**Offline strategy:** Cache the PDF file in IndexedDB via existing `cacheService.js`. pdfjs-dist renders from ArrayBuffer so cached binary works offline.

### 2. Document Conversion (Word/PPT/Excel)

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Supabase Edge Function + CloudConvert API | N/A (API) | Convert DOCX/PPTX/XLSX to PDF or images | Player devices (especially WebOS/Tizen) cannot render Office formats natively. Server-side conversion to PDF/images is the only reliable approach. CloudConvert or Gotenberg (self-hosted LibreOffice) converts on upload. |

**Confidence:** MEDIUM -- CloudConvert is the most popular conversion API. Alternative is Gotenberg (Docker-based LibreOffice). The approach (convert server-side, store as images/PDF) is HIGH confidence. The specific API choice needs validation against pricing.

**Why NOT client-side conversion:**
- `mammoth.js` (DOCX to HTML) loses layout fidelity -- unacceptable for signage
- `xlsx` / `SheetJS` renders spreadsheets but not as visual pages
- PPTX has no reliable client-side renderer
- Player devices have constrained memory -- conversion should happen at upload time

**Pattern:** On upload of .docx/.pptx/.xlsx, trigger an Edge Function that calls CloudConvert API, receives PDF/PNG output, stores converted files in S3 alongside the original. Player always displays the converted version. This is a "convert once, display everywhere" pattern used by Yodeck and OptiSigns.

**Alternative (self-hosted):** Deploy Gotenberg as a Docker container for LibreOffice-based conversion. More control, no per-conversion cost, but requires infrastructure management.

### 3. No New Library Needed -- Feature-Specific Details

The remaining 12 features require ZERO new npm packages. Here is the technology approach for each:

---

#### YouTube/Vimeo Embedding

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Native `<iframe>` | N/A | Embed YouTube/Vimeo players | YouTube and Vimeo provide embed URLs that work in iframes. The existing `WebPageApp` in AppRenderer.jsx already renders iframes with auto-refresh support. New widget adds URL parsing (extract video ID from various YouTube URL formats) and embed-specific parameters (autoplay, loop, mute, controls). |

**Why NOT a YouTube library:**
- `react-youtube` / `react-player` add unnecessary abstraction over an iframe
- Signage players need autoplay+mute (browser policy) which works natively with iframe parameters
- WebOS/Tizen webviews support iframes; third-party player libraries may not
- Bundle savings: 0 bytes added vs 30-50KB for react-player

**New widget type:** `youtube` and `vimeo` in WIDGET_REGISTRY. Parse URL to extract video ID, construct embed URL with parameters (`autoplay=1&mute=1&loop=1&controls=0&rel=0`). Add to registry, done.

**CSP update required:** Add `https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com` to `frame-src` in `vercel.json`.

---

#### Web Page Display Widget

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing `WebPageApp` | N/A | Already implemented in AppRenderer.jsx | The `WebPageApp` component already renders iframes with URL config, auto-refresh interval, and zoom level. Needs promotion to a proper widget in the registry with admin configuration UI (URL input, refresh interval, zoom, scroll position). |

**Action:** Register existing `WebPageApp` as a widget type `webpage` in WIDGET_REGISTRY. Add properties panel controls in scene/layout editors. No new code for the player rendering path.

---

#### Proof of Play Reporting

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing `playbackTrackingService.js` | N/A | Already tracks scene_start, scene_end, media_play events with offline queue | The service already queues events locally, flushes every 30s, and handles offline scenarios. For Proof of Play, extend with: per-media-item play duration tracking, completion percentage, and a new `playback_logs` table with compliance-ready schema (screen_id, media_id, started_at, ended_at, duration_seconds, completion_pct). |
| Supabase Edge Function | N/A | CSV/PDF export of playback reports | Edge Function queries `playback_logs`, formats as CSV or generates report. Download link from admin UI. |

**No new library.** The existing playback tracking infrastructure is comprehensive. Enhancement is data model + reporting UI, not new technology.

---

#### SSO via SAML

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| `supabase.auth.signInWithSSO()` | In `@supabase/supabase-js` 2.80.0 | Supabase built-in SAML SSO | Supabase has native SAML 2.0 support. The `signInWithSSO({ domain })` or `signInWithSSO({ providerId })` methods handle the entire SAML flow server-side. No SAML XML parsing in the browser. The existing `ssoService.js` already has the data model for sso_providers with SAML fields (metadata_url, metadata_xml, entity_id, sso_url, certificate). |

**Confidence:** HIGH -- Supabase SSO is documented and the method exists in the JS client. The existing `ssoService.js` already stores SAML config. The gap is wiring `supabase.auth.signInWithSSO()` into the login flow and the Supabase Dashboard SSO provider registration.

**What needs to happen:**
1. Register SAML IdP via Supabase CLI (`supabase sso add`) or Management API
2. Wire `supabase.auth.signInWithSSO({ providerId })` in login page when SSO is enforced
3. Existing `ssoService.js` already handles provider CRUD, enable/disable, enforcement toggle
4. Add domain-based auto-detection: if email domain matches SSO provider, redirect to SSO

**No new npm package.** Everything is in `@supabase/supabase-js` already.

---

#### Public REST API with API Key Management

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Supabase Edge Functions | N/A | API endpoint handlers | Existing Edge Function pattern (weather-proxy, rss-proxy) extends naturally to REST API endpoints. Each endpoint is an Edge Function that validates API key, checks scopes, and queries Supabase. |
| Existing `apiVersionService.js` | N/A | Version routing, scope validation, request logging | Already defines V1_ENDPOINTS for screens, playlists, campaigns, media, apps. Already has `hasRequiredScopes()`, `logApiRequest()`, `createApiResponse()`. |

**API Key storage:** New `api_keys` table in Supabase with columns: id, tenant_id, name, key_hash (SHA-256), scopes (text[]), rate_limit, is_active, last_used_at, expires_at. Keys are generated client-side, hashed before storage (like passwords -- never store plaintext API keys).

**Rate limiting:** Use existing `rateLimitService.js` pattern with per-key sliding window. Store counters in a `api_rate_limits` table or Redis-compatible key-value (Supabase has no built-in Redis, so use Postgres with TTL-based cleanup).

**No new npm package.** Edge Functions + existing service infrastructure.

---

#### Nested/Sub-Playlists

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing playlist infrastructure | N/A | Data model extension | Add `playlist_items.child_playlist_id` column (nullable FK to playlists). When player encounters a playlist item that references another playlist, it recursively resolves the items. Depth limit of 3 to prevent infinite recursion. |

**Player resolution:** Extend `get_resolved_player_content` RPC to recursively expand nested playlists. Use a recursive CTE in PostgreSQL (WITH RECURSIVE). This is a data model + RPC change, not a library change.

**Circular reference prevention:** Add a Postgres trigger or RPC validation that checks for cycles before allowing a playlist to reference another.

**No new npm package.**

---

#### Media Expiration Dates

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing `date-fns` + Supabase | N/A | Data model extension | Add `media_assets.expires_at` (timestamptz, nullable). Postgres cron job (pg_cron extension) runs daily to auto-archive expired media. Player's content resolution RPC filters out expired media items. |

**Admin UI:** DatePicker in media detail modal using native `<input type="datetime-local">` (no date picker library needed -- HTML5 is sufficient and cross-browser compatible).

**No new npm package.**

---

#### Working Hours / Screen Power Scheduling

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing `date-fns` + `@date-fns/tz` | N/A | Timezone-aware schedule evaluation | Add `screen_schedules` table with day-of-week + start_time + end_time per screen. Player evaluates schedule on each heartbeat. When outside working hours, player sends "power off" command (for WebOS/Tizen) or shows blank/standby screen (for web). |

**Player command:** The existing `usePlayerCommands` hook already handles remote commands. Add `POWER_OFF` / `POWER_ON` command types. WebOS and Tizen have native power management APIs accessible from their webviews.

**No new npm package.**

---

#### Audio / Background Music

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| HTML5 `<audio>` element | N/A | Background audio playback | HTML5 Audio API is sufficient for background music. No Howler.js needed -- the use case is simple sequential playlist playback, not spatial audio or complex sound management. The `<audio>` element supports MP3, AAC, OGG on all target platforms. |

**Why NOT Howler.js:**
- Howler.js adds ~30KB for features we do not need (spatial audio, sprites, audio pools)
- `<audio>` element handles playlist sequential playback, volume control, loop
- WebOS/Tizen webviews support `<audio>` natively
- Offline: audio files cached in IndexedDB (same as video/image), served from blob URLs

**Pattern:** New `AudioLayer` component in player that sits alongside visual content. Gets its own playlist of audio files, plays sequentially with crossfade using gain nodes from Web Audio API (for smooth transitions) or simple `<audio>` element swap.

**Volume control:** Configurable per-screen via admin UI. Stored in screen settings.

**No new npm package.**

---

#### Video Wall Support

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Supabase Realtime Channels | N/A | Cross-screen synchronization | Video wall requires multiple physical screens to display synchronized content. Each screen renders a portion (tile) of the full content. Synchronization uses Supabase Realtime broadcast channels with NTP-style clock offset calculation. |

**Synchronization approach:**
1. **Leader election:** One screen in the wall group is the "leader" (lowest screen_id)
2. **Time sync:** Leader broadcasts its playback timestamp every 5s via Supabase Realtime channel `video-wall:{group_id}`
3. **Followers adjust:** Each follower calculates clock offset, adjusts its playback position to match leader
4. **Content tiling:** Each screen knows its position in the grid (row, col) and viewport size. CSS `transform: translate(-X%, -Y%) scale(N)` crops the full content to show only its tile.

**Data model:** New `video_wall_groups` table: id, tenant_id, name, rows, cols, content_id. New `video_wall_positions` table: group_id, screen_id, row, col.

**Why NOT WebRTC/NTP library:**
- Supabase Realtime already provides sub-100ms message delivery
- True frame-perfect sync is physically impossible across separate devices; 100-200ms tolerance is industry standard for video walls
- No additional server infrastructure needed

**No new npm package.**

---

#### Calendar Widgets (Google Calendar / Outlook)

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing Google OAuth (extend scopes) | N/A | Google Calendar API access | The existing `googleDriveService.js` + `cloudOAuthService.js` pattern handles Google OAuth with PKCE. For Google Calendar, add `calendar.readonly` scope. Fetch events via Google Calendar REST API (`calendars/{id}/events`). |
| Microsoft Graph API | N/A | Outlook Calendar access | The existing `oneDriveService.js` handles Microsoft OAuth. For Outlook Calendar, add `Calendars.Read` scope. Fetch events via Microsoft Graph API (`/me/calendarView`). |
| Existing `ical.js` 2.2.1 | N/A | Parse iCal feeds | Already in package.json. Handles `.ics` URL subscriptions (public Google Calendar URLs, any iCal feed) without OAuth. |

**Edge Function proxy:** New `calendar-proxy` Edge Function fetches calendar events server-side, caches results (15-min TTL like weather), returns sanitized event list. Follows weather-proxy pattern exactly.

**Widget types:** Register `google-calendar` and `outlook-calendar` in WIDGET_REGISTRY. Also register `ical-feed` for URL-based calendar subscriptions (uses existing `ical.js`).

**No new npm package.**

---

#### Google Slides Integration

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Google Slides Embed URL | N/A | Display published slides | Google Slides has a native embed/publish URL: `https://docs.google.com/presentation/d/{id}/embed?start=true&loop=true&delayms=5000`. This renders as an auto-playing slideshow in an iframe. No API needed for display. |
| Google Slides API (optional) | N/A | Thumbnail generation for admin preview | If we want thumbnails in the admin UI, we can use the Google Slides API to get slide thumbnails. Uses existing Google OAuth with `presentations.readonly` scope. |

**Pattern:** User pastes a Google Slides URL, we extract the presentation ID, construct the embed URL with auto-advance parameters, render in iframe on player. This is the exact same pattern used by Yodeck and OptiSigns.

**For offline:** Export slides as images via Google Slides API at schedule time. Store images in S3. Player shows cached images when offline, live embed when online.

**No new npm package.**

---

#### Canva Integration (OAuth Import)

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Existing `canvaService.js` | N/A | Already fully implemented | The service has OAuth with PKCE, token management, design listing, export (PNG/PDF), and polling for export completion. The `CanvaCallbackPage.jsx` handles the OAuth redirect. Template categories with deep links are defined. |

**What is missing:** Admin UI for browsing user's Canva designs, triggering export, and storing exported images as media assets in S3. This is UI work, not library work.

**Canva Connect API rate limits:** 100 requests/minute per user. The export polling (1s interval, max 30 attempts) in `exportDesign()` is already implemented and well-bounded.

**No new npm package.**

---

## Installation

```bash
# Only ONE new production dependency
npm install pdfjs-dist

# No new dev dependencies needed
```

**Total bundle impact:** ~20KB for pdfjs-dist core (worker loaded separately as ~800KB web worker file, not in main bundle). Copy worker to `public/pdf.worker.min.js` or load from CDN.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PDF rendering | `pdfjs-dist` (direct) | `react-pdf` (React wrapper) | react-pdf wraps pdfjs-dist with React components. Adds abstraction we don't need -- we render to canvas for signage, not interactive PDF viewer. Also, react-pdf may lag behind pdfjs-dist releases. |
| PDF rendering | `pdfjs-dist` (direct) | `pdf-lib` | pdf-lib is for creating/editing PDFs, not rendering them. Cannot display PDF pages. |
| Document conversion | Server-side conversion API | `mammoth.js` (client-side DOCX) | mammoth.js converts DOCX to HTML but loses layout fidelity. Cannot handle PPTX or XLSX. Unacceptable for signage where visual fidelity matters. |
| Document conversion | CloudConvert API | Gotenberg (self-hosted) | Gotenberg requires Docker infrastructure. CloudConvert is simpler for a Supabase Edge Function architecture. Consider Gotenberg if conversion volume makes API costs prohibitive. |
| Document conversion | CloudConvert API | Google Docs Viewer iframe | Google Docs Viewer (`docs.google.com/gview?url=`) works online-only. Cannot work offline on player. Cannot be cached. |
| YouTube embedding | Native iframe | `react-player` | react-player adds ~50KB for abstraction over iframes. All we need is `<iframe src="https://youtube.com/embed/{id}">` with correct parameters. react-player also has issues on WebOS/Tizen webviews. |
| Audio playback | HTML5 `<audio>` | `howler.js` | Howler.js adds ~30KB for spatial audio, sprites, and pools we don't need. Simple sequential playlist playback works fine with `<audio>` element. |
| Audio playback | HTML5 `<audio>` | `tone.js` | Tone.js is for music synthesis and audio processing. Complete overkill for playing MP3 files. |
| Video wall sync | Supabase Realtime | `WebRTC DataChannel` | WebRTC requires TURN/STUN servers and is designed for peer-to-peer. Supabase Realtime is simpler, works through firewalls, and is already in the stack. |
| Video wall sync | Supabase Realtime | `Socket.io` | Adding a separate WebSocket server when Supabase Realtime already provides pub/sub channels would be redundant. |
| Calendar widgets | API + ical.js | `fullcalendar` | FullCalendar is an interactive calendar UI component (~200KB). We need a read-only event display for signage, not an interactive calendar. Custom rendering with existing `date-fns` is lighter and fits the signage display pattern. |
| SAML SSO | Supabase Auth SSO | `passport-saml` / `saml2-js` | These are server-side Node.js SAML libraries. Supabase Auth handles SAML server-side natively. Adding a separate SAML library would duplicate Supabase's built-in capability. |
| REST API | Supabase Edge Functions | Express.js / Hono | Adding a separate API server when Supabase Edge Functions already provide serverless functions with the same database access would be architecturally redundant. |

---

## CSP Updates Required

The Content-Security-Policy in `vercel.json` needs updates for several features:

```
frame-src additions:
  https://www.youtube.com
  https://www.youtube-nocookie.com
  https://player.vimeo.com
  https://docs.google.com  (Google Slides embed)

connect-src additions:
  https://www.googleapis.com/calendar  (Google Calendar API)
  https://graph.microsoft.com  (Outlook Calendar via Microsoft Graph)
  https://api.canva.com  (Canva Connect API -- may already be covered by existing pattern)
  https://api.cloudconvert.com  (if using CloudConvert -- only from Edge Function, not browser)
```

---

## Edge Functions to Create

| Function | Purpose | Pattern Source |
|----------|---------|---------------|
| `calendar-proxy` | Fetch Google/Outlook calendar events server-side, cache 15min | `weather-proxy` |
| `document-convert` | Convert uploaded DOCX/PPTX/XLSX to PDF/images via CloudConvert | `ai-designer` (external API call pattern) |
| `api-gateway` | Public REST API endpoint handler with API key validation | New, but uses existing `apiVersionService.js` patterns |
| `slides-export` | Export Google Slides as images for offline caching | `unsplash-proxy` (Google API call pattern) |

---

## Database Tables to Create

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `api_keys` | Public API key storage | tenant_id, name, key_hash, scopes[], rate_limit, is_active, expires_at |
| `api_request_logs` | API usage logging | token_id, endpoint, method, status_code, latency_ms (already defined in apiVersionService.js) |
| `playback_logs` | Proof of Play records | screen_id, media_id, playlist_id, started_at, ended_at, duration_seconds, completion_pct |
| `video_wall_groups` | Video wall configuration | tenant_id, name, rows, cols, content_id |
| `video_wall_positions` | Screen position in wall | group_id, screen_id, row, col |
| `screen_power_schedules` | Working hours per screen | screen_id, day_of_week, start_time, end_time, timezone |

**Modified tables:**
- `media_assets`: Add `expires_at` (timestamptz), `converted_url` (text), `conversion_status` (text)
- `playlist_items`: Add `child_playlist_id` (FK to playlists, nullable) for nested playlists
- `screens`: Add `audio_volume` (integer 0-100), `video_wall_group_id` (FK)

---

## Widget Registry Additions

New widget types to register in `src/widgets/registry.js`:

| Type Key | Component | Icon | Purpose |
|----------|-----------|------|---------|
| `youtube` | `YouTubeWidget` | `Youtube` (lucide) | YouTube video embed |
| `vimeo` | `VimeoWidget` | `Play` (lucide) | Vimeo video embed |
| `webpage` | `WebPageWidget` | `Globe` (lucide) | Web page iframe (promote from AppRenderer) |
| `pdf` | `PDFWidget` | `FileText` (lucide) | PDF document viewer with auto-pagination |
| `google-calendar` | `GoogleCalendarWidget` | `Calendar` (lucide) | Google Calendar events display |
| `outlook-calendar` | `OutlookCalendarWidget` | `Calendar` (lucide) | Outlook Calendar events display |
| `google-slides` | `GoogleSlidesWidget` | `Presentation` (lucide) | Google Slides embed |
| `audio` | `AudioWidget` | `Music` (lucide) | Background audio layer |

This brings the registry from 12 to 20 widget types (including the `data` legacy alias).

---

## Feature-to-Technology Mapping

| Feature | New NPM Package | New Edge Function | New DB Table | New Widget Type |
|---------|-----------------|-------------------|-------------|-----------------|
| Document display (PDF) | `pdfjs-dist` | -- | -- | `pdf` |
| Document display (Office) | -- | `document-convert` | -- | -- |
| YouTube embedding | -- | -- | -- | `youtube` |
| Vimeo embedding | -- | -- | -- | `vimeo` |
| Web page widget | -- | -- | -- | `webpage` |
| Proof of Play | -- | -- | `playback_logs` | -- |
| SSO via SAML | -- | -- | -- | -- |
| Public REST API | -- | `api-gateway` | `api_keys`, `api_request_logs` | -- |
| Nested playlists | -- | -- | (modify playlist_items) | -- |
| Media expiration | -- | -- | (modify media_assets) | -- |
| Working hours | -- | -- | `screen_power_schedules` | -- |
| Audio/music | -- | -- | (modify screens) | `audio` |
| Video wall | -- | -- | `video_wall_groups`, `video_wall_positions` | -- |
| Calendar widgets | -- | `calendar-proxy` | -- | `google-calendar`, `outlook-calendar` |
| Google Slides | -- | `slides-export` | -- | `google-slides` |
| Canva integration | -- | -- | -- | -- |

**Summary:** 1 new npm package, 4 new Edge Functions, 5 new DB tables + 3 table modifications, 8 new widget types.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| pdfjs-dist for PDF rendering | HIGH | De facto standard, used by every PDF viewer. Training data strongly supports this. |
| Server-side doc conversion approach | HIGH | Industry standard pattern. Specific API (CloudConvert) is MEDIUM -- pricing/availability should be validated. |
| Supabase Auth SSO for SAML | HIGH | Documented Supabase feature, method exists in supabase-js client. Existing ssoService.js already models this. |
| YouTube/Vimeo iframe embed | HIGH | Standard web pattern, existing WebPageApp already demonstrates the approach. |
| Supabase Realtime for video wall | MEDIUM | Realtime broadcast channels are documented, but sub-100ms sync for video walls is at the edge of what Realtime can guarantee. May need NTP offset calibration. |
| HTML5 audio for background music | HIGH | Standard browser API, works on all target platforms. |
| Edge Functions for REST API | HIGH | Existing pattern with 4 functions in production. |
| pdfjs-dist version (^4.x) | LOW | Cannot verify latest version without web access. Version should be validated at install time via `npm info pdfjs-dist version`. |
| CloudConvert API specifics | LOW | Cannot verify current pricing/API without web access. Alternative (Gotenberg) should be evaluated. |

---

## Sources

- Codebase analysis: `src/services/canvaService.js`, `src/services/ssoService.js`, `src/services/apiVersionService.js`, `src/services/cloud/cloudOAuthService.js`, `src/services/playbackTrackingService.js`
- Widget registry: `src/widgets/registry.js` (12 existing types)
- Player rendering: `src/player/components/AppRenderer.jsx` (WebPageApp iframe pattern)
- Edge Function pattern: `supabase/functions/weather-proxy/index.ts`
- CSP configuration: `vercel.json`
- Package manifest: `package.json` (existing dependencies)
- App catalog: `src/config/appCatalog.js` (YouTube, Google Calendar, Outlook Calendar, Google Slides already defined as app types)

---

*Stack analysis: 2026-03-02*
