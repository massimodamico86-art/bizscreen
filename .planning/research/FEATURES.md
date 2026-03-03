# Feature Landscape: v12.0 Feature Parity

**Domain:** Digital signage platform -- closing feature gap with Yodeck, OptiSigns, ScreenCloud, Rise Vision
**Researched:** 2026-03-02
**Confidence:** MEDIUM (based on training data knowledge of competitor platforms + HIGH confidence codebase analysis)

## Table Stakes

Features users expect from any mid-tier digital signage platform. Missing = product feels incomplete compared to Yodeck/OptiSigns.

| # | Feature | Why Expected | Complexity | Existing Foundation |
|---|---------|--------------|------------|---------------------|
| 1 | YouTube/Vimeo embedding | Every competitor has this. Users upload YouTube URLs daily. Yodeck/OptiSigns treat it as a first-class media type. | Low | Video playback with HLS exists in ZonePlayer. AppRenderer has iframe pattern. appCatalog defines youtube type. |
| 2 | Web page display widget | All 4 competitors offer URL-as-content. Common for dashboards, internal portals, live sports scores. | Low | WebPageApp already exists in AppRenderer with iframe, zoom, auto-refresh. Needs promotion to widget registry. |
| 3 | Document display (PDF/Word/PPT/Excel) | Yodeck/OptiSigns both support PDF and Office docs. Corporate lobby/HR boards rely on this heavily. | Medium | Media library handles upload/browse. mediaService recognizes document type. Conversion pipeline needed. |
| 4 | Media expiration dates | OptiSigns and Yodeck both have auto-expire. Compliance-sensitive industries (pharma, finance, food) require it. | Low | Media library exists. media_assets table ready for expires_at column + cron/filter logic. |
| 5 | Nested/sub-playlists | Yodeck and OptiSigns both support playlists-within-playlists. Essential for multi-department content mixing. | Medium | Playlist CRUD is mature. Recursive resolution needed in player. Add FK reference for nesting. |
| 6 | Working hours / screen power scheduling | All 4 competitors offer this. Saves energy costs, extends screen life. Expected by any business deploying 5+ screens. | Medium | Schedule system with time/day rules and TZDate exists. Player commands (reboot, reload) exist. |
| 7 | Proof of Play reporting | Yodeck, OptiSigns, ScreenCloud all offer this. Required for advertising networks, franchise compliance, regulatory audits. | Medium | playbackTrackingService.js already tracks scene_start/end, media_play with offline queue and server flush via insert_playback_events RPC. Reporting/export layer needed. |
| 8 | Audio / background music | Yodeck and OptiSigns support background audio tracks behind visual content. Common in retail, restaurants, waiting rooms. | Medium | Media library supports audio type uploads. No player audio layer exists yet. |
| 9 | Calendar widgets (Google/Outlook) | Yodeck, OptiSigns, ScreenCloud all offer calendar widgets. Meeting room displays are a top-3 signage use case. | Medium | Widget registry has 12 types. Google OAuth exists. appCatalog defines calendar types. ical.js in package.json. |
| 10 | Google Slides integration | Yodeck, OptiSigns, and Rise Vision all support Google Slides. Users already have presentations they want on screens. | Low-Med | Google Drive OAuth import exists. Google Slides has embed URL pattern. Slides-specific rendering needed. |

## Differentiators

Features that set BizScreen apart. Not universally expected, but valued by enterprise/power users.

| # | Feature | Value Proposition | Complexity | Existing Foundation |
|---|---------|-------------------|------------|---------------------|
| 1 | Public REST API with key management | OptiSigns has a basic API. Yodeck has limited API. A well-documented, scoped, rate-limited REST API is a genuine differentiator. | High | apiTokenService.js with scopes (9 scope types), generation, rotation already exists. apiVersionService.js with v1 versioning and deprecation support exists. api_access feature flag on Pro plan. |
| 2 | SSO via SAML | Only enterprise-tier platforms offer this. Instant credibility with IT procurement. | High | Supabase Auth supports SAML. enterprise_sso feature flag already in Enterprise plan. ssoService.js models SAML providers. |
| 3 | Video wall support | ScreenCloud and Rise Vision offer this. Most competitors charge extra. Multi-screen synchronized display is a "wow" feature. | High | Screen groups with tag management exist. Supabase Realtime channels exist. No wall-specific code yet. |
| 4 | Canva integration (OAuth) | Only OptiSigns has meaningful Canva integration. Most competitors lack this entirely. | Medium | canvaService.js with full OAuth PKCE flow exists. CanvaCallbackPage.jsx implemented. Design list/import flow needed. |

## Anti-Features

Features to explicitly NOT build in v12.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Native video transcoding | Massive infrastructure cost (FFmpeg, GPU, storage). Out of scope per PROJECT.md. | Accept pre-processed media. For documents, convert to images server-side. |
| Client-side Office rendering | mammoth.js/SheetJS lose layout fidelity. PPTX has no viable client renderer. | Server-side conversion to PDF/images at upload time. |
| Full web browser widget (interactive) | Security nightmare (XSS, clickjacking). Tizen/WebOS sandboxing makes this unreliable. | Sandboxed iframe with strict CSP for web page widget. Display-only, no interaction. |
| Audio mixing / multi-track editing | Audio DAW features are not signage features. Complexity explosion. | Single background audio track per playlist/layout. Volume control only. |
| Video wall pixel-perfect sync | NTP-based frame sync requires custom firmware. Software sync covers 95% of use cases. | Region-based content assignment. Heartbeat-based loose sync via Realtime channels. |
| SCIM user provisioning | Complex, rarely needed at launch. Even Yodeck Enterprise defers this. | SAML SSO with JIT provisioning. Users created on first login. |
| GraphQL API endpoint | GraphQL adds schema complexity without clear benefit for signage API use cases. | REST API with clear resource endpoints and OpenAPI spec. |
| Full-featured API covering all events | Scope creep. Webhooks already exist as a feature flag. | Read endpoints first. Write for media upload and playlist update. Expand later. |
| Offline document rendering | PDF/Office rendering requires heavy libraries. Player devices cannot run these. | Convert documents to images server-side. Player displays pre-rendered images. |
| Calendar event creation/editing | Signage displays events, it does not manage calendars. | Read-only calendar widget. Users manage events in Google/Outlook. |
| Interactive PDF viewer (zoom/scroll/search) | Player displays are view-only. No user interaction possible. | Auto-paginating slideshow of PDF page images. |
| Peer-to-peer video wall sync | WebRTC/TURN/STUN complexity for marginal improvement. | Supabase Realtime channels with leader-based sync. |

---

## Feature Details: Behavior Expectations per Competitor Analysis

### 1. Document Display (PDF/Word/PPT/Excel)

**How competitors do it:**
- **Yodeck:** Upload PDF/PPTX/DOCX. Server converts to images. Each page becomes a slide with configurable duration.
- **OptiSigns:** PDF and Google Slides natively. PPT requires conversion or Google Slides import.
- **ScreenCloud:** Uses Google Docs viewer for Office formats. PDF rendered natively.
- **Rise Vision:** Google Slides primary. PDF via third-party widget.

**Table stakes behavior:**
- Upload PDF, see pages rendered as slides with configurable duration per page
- Multi-page documents auto-paginate (rotate through pages)
- Office formats (DOCX/PPTX/XLSX) converted on upload
- Landscape/portrait detection matching screen orientation

**Implementation approach:**
- Server-side: Document conversion Edge Function (PDF-to-PNG via pdf.js or conversion API; Office-to-PDF-to-PNG pipeline)
- Store rendered pages as media assets linked to source document
- Player displays image sequence (already supported pattern)
- Re-conversion trigger when source document is re-uploaded

**Complexity:** MEDIUM -- conversion pipeline is the main work. Player already handles image sequences.

**Dependencies:** New media type in media_assets, Edge Function for conversion, S3 storage for rendered pages.

### 2. YouTube/Vimeo Embedding

**How competitors do it:**
- **Yodeck:** Paste URL. Extracts video ID. Renders in iframe. Options: mute, loop, autoplay, start time.
- **OptiSigns:** YouTube/Vimeo as media types. URL validation. YouTube IFrame API for control.
- **ScreenCloud:** YouTube app. Paste URL, configure loop/mute/autoplay.
- **Rise Vision:** YouTube widget. Mute by default (signage best practice).

**Table stakes behavior:**
- Paste YouTube or Vimeo URL, platform extracts video ID and thumbnail
- Player renders via YouTube IFrame API / Vimeo Player SDK
- Options: mute (default ON), loop, autoplay
- Offline: show thumbnail (streaming video cannot cache)

**Implementation approach:**
- New widget types `youtube` and `vimeo` in registry (or unified `video-embed`)
- URL parser: extract IDs from youtu.be, youtube.com/watch, vimeo.com/123
- Player: `<iframe>` with enablejsapi=1, muted autoplay loop
- Thumbnail via oEmbed API for admin preview
- CSP frame-src update required for youtube.com and player.vimeo.com

**Complexity:** LOW -- iframe embedding is straightforward. URL parsing and oEmbed well-documented.

**Platform concern:** YouTube IFrame API works on web players. Tizen/WebOS may need `<webview>`. Test on target platforms.

### 3. Web Page Display Widget

**How competitors do it:**
- **Yodeck:** "Webpage" media type. URL, refresh interval, sandboxed iframe. Scroll position, zoom, CSS injection.
- **OptiSigns:** Web page widget. URL input. Refresh interval. No interaction.
- **ScreenCloud:** "URL" content type. Full-screen iframe.
- **Rise Vision:** Web page widget with configurable refresh.

**Table stakes behavior:**
- Enter any URL, display full-screen or in layout zone
- Configurable auto-refresh (5/15/30/60 min)
- Display-only (no user interaction on player)
- Handle HTTPS-only (mixed content blocking)

**Implementation approach:**
- WebPageApp already exists in AppRenderer with iframe, zoom, and auto-refresh
- Promote to widget registry as `webpage` type for use in layouts/scenes
- Props: url, refreshIntervalMinutes, scrollPosition, zoomLevel
- Handle X-Frame-Options/CSP errors gracefully (many sites block iframe embedding)

**Complexity:** LOW -- existing code needs promotion to widget registry plus error handling for blocked sites.

### 4. Proof of Play Reporting

**How competitors do it:**
- **Yodeck:** Reports with exact play times per screen per content. CSV/PDF export. Date/screen/content filters.
- **OptiSigns:** Detailed logs. CSV export. Screenshot evidence optional.
- **ScreenCloud:** "Audit Trail" with play logs and compliance exports.
- **Rise Vision:** Basic display logs.

**Table stakes behavior:**
- Log every content playback: screen, content, start time, end time, duration
- Filter by: date range, screen, screen group, content item, playlist
- Export to CSV and PDF
- Summary: total plays, total duration, screens reached, unique items
- Compliance mode: screenshot evidence on content change

**Implementation approach:**
- Data collection DONE: playbackTrackingService.js tracks scene_start/end, media_play with offline queue and flush via insert_playback_events RPC. playerAnalyticsService.js tracks per-zone playback in ZonePlayer.
- Need: Admin reporting page with filters, aggregation queries, CSV/PDF export
- Need: Database views/RPCs for aggregated proof-of-play queries (plays by screen, by content, by date)
- Need: Export service (CSV generation, PDF report template)
- Need: Optional screenshot-on-transition for compliance evidence (player already captures screenshots)

**Complexity:** MEDIUM -- data collection exists. Reporting UI, aggregation queries, and export formatting are the work.

### 5. SSO via SAML

**How competitors do it:**
- **Yodeck:** Enterprise only. SAML 2.0 with Okta, Azure AD, OneLogin. Admin configures IdP metadata.
- **OptiSigns:** Enterprise SSO via SAML.
- **ScreenCloud:** SAML on enterprise plan. Azure AD, Okta, Google Workspace.
- **Rise Vision:** Google Workspace SSO. Limited SAML.

**Table stakes behavior:**
- Admin configures SAML IdP: metadata URL, entity ID, X.509 certificate
- SP-initiated SSO ("Sign in with SSO" on login page)
- IdP-initiated SSO (user clicks app in IdP portal)
- JIT user provisioning: create profile on first SAML login
- Attribute mapping: email, name, role from SAML assertions

**Implementation approach:**
- Supabase Auth supports SAML 2.0 via `supabase.auth.signInWithSSO()`
- ssoService.js already models SAML providers
- Admin UI: SAML configuration in Enterprise Security settings
- Login page: "Sign in with SSO" button triggering SP-initiated flow
- JIT provisioning: create profile record with role from SAML attributes on first login
- Feature-gated to Enterprise plan (enterprise_sso flag exists in plans.js)

**Complexity:** HIGH -- SAML is notoriously finicky. Certificate rotation, clock skew, IdP-specific quirks. Supabase handles protocol, but config and testing are complex.

### 6. Public REST API

**How competitors do it:**
- **Yodeck:** Limited API for screen management and content push.
- **OptiSigns:** REST API with API key. Screens, playlists, media endpoints.
- **ScreenCloud:** API for content and screen control.
- **Rise Vision:** Extensive API for all features.

**Table stakes behavior:**
- API key authentication (bearer token)
- Endpoints: GET screens, GET playlists, GET media, POST media (upload), PUT playlists
- Rate limiting per key per minute
- JSON responses with pagination
- API documentation (OpenAPI/Swagger)

**Implementation approach:**
- apiTokenService.js already handles token creation with 9 scope types, expiration, rotation, prefix-based identification
- apiVersionService.js has v1 versioning with deprecation tracking and response wrappers
- api_access feature flag exists on Pro plan, webhooks flag exists
- Need: Supabase Edge Functions implementing REST endpoints
- Need: Rate limiting middleware (token bucket per API key)
- Need: OpenAPI spec and documentation page
- Start with read endpoints + media upload + playlist update

**Complexity:** HIGH -- API design, documentation, rate limiting, error handling, and versioning all need to be right from launch. Existing service layer provides strong foundation.

### 7. Nested/Sub-Playlists

**How competitors do it:**
- **Yodeck:** Playlists contain other playlists. Folder icon in editor. Flattened at play time. Circular reference prevention.
- **OptiSigns:** Sub-playlists. Drag into parent. Recursive play with duration inheritance.
- **ScreenCloud:** Channels reference other channels.
- **Rise Vision:** Schedules reference multiple playlists (not nested within playlists).

**Table stakes behavior:**
- "Add Playlist" option in playlist editor alongside "Add Media"
- Sub-playlist shows as collapsed item with icon and count
- Play order: parent items in sequence; sub-playlist plays all its items, then continues parent
- Circular reference prevention
- Depth limit: 3 levels max

**Implementation approach:**
- Add `item_type` ('media'|'playlist') and `linked_playlist_id` to playlist_items
- Playlist editor: "Insert Playlist" button with picker modal
- Player: recursive flatten at play time via server-side RPC (recursive CTE)
- Cycle detection on save: walk graph, reject cycles with clear error
- Offline cache stores flattened result

**Complexity:** MEDIUM -- data model is simple. Cycle detection and recursive CTE resolution are the tricky parts.

### 8. Media Expiration Dates

**How competitors do it:**
- **Yodeck:** "Valid until" date. After date, hidden from playlists and marked expired. Can be restored.
- **OptiSigns:** Expiration date. Auto-removes from playlists. Notification before expiry.
- **ScreenCloud:** Content scheduling with end date.
- **Rise Vision:** Schedule-based expiration.

**Table stakes behavior:**
- Optional `expires_at` date on any media asset
- Expired media excluded from playlist resolution automatically
- Visual indicator on expired media (badge, dimmed) in admin
- Expiration warnings (7 days before)
- Bulk set/clear expiration
- Library filters: expired, expiring soon, no expiration

**Implementation approach:**
- Add `expires_at` timestamp column to media_assets
- Date picker in media detail panel
- Playlist resolution RPC: filter `WHERE expires_at IS NULL OR expires_at > now()`
- pg_cron job: flag expiring-soon items, create notifications
- Media library filter additions

**Complexity:** LOW -- single column, filter in queries, date picker UI. Simplest feature in this set.

### 9. Working Hours / Screen Power Scheduling

**How competitors do it:**
- **Yodeck:** "Working Hours" per screen/group. On/off times per day. CEC power commands. Timezone-aware.
- **OptiSigns:** Power schedule. CEC or RS-232. Per-screen or group.
- **ScreenCloud:** "Power Schedule." Hardware-dependent.
- **Rise Vision:** Display on/off scheduling.

**Table stakes behavior:**
- Working hours per screen or screen group (Mon-Fri 8am-6pm)
- Outside hours: black screen/standby or power-off command
- Holiday/exception dates
- Timezone-aware (TZDate, already proven in schedule system)

**Implementation approach:**
- New `screen_power_schedules` table: screen_id, day_of_week, start_time, end_time, timezone
- Player checks schedule on heartbeat and content resolution
- v12.0: Player shows black screen outside hours (software approach)
- Future: CEC commands for hardware-supported devices
- Admin UI: working hours config per screen with group inheritance
- Holiday exceptions table

**Complexity:** MEDIUM -- schedule logic well-understood. CEC deferred. Software black-screen is straightforward.

### 10. Audio / Background Music

**How competitors do it:**
- **Yodeck:** Background audio per playlist/screen. MP3/AAC. Volume. Loops independently of visual content.
- **OptiSigns:** Background music per playlist. MP3. Volume slider. Loop.
- **ScreenCloud:** Audio zone in layouts. Separate channel.
- **Rise Vision:** Limited (video audio only).

**Table stakes behavior:**
- Upload audio files (MP3, AAC, WAV)
- Assign background audio to playlist or layout
- Audio plays continuously behind visual content
- Volume control, loop toggle
- Audio uninterrupted during visual transitions
- Mute per screen option

**Implementation approach:**
- Audio upload via existing media pipeline (already accepts audio types)
- `background_audio_id` on playlists, `audio_track_id` on layouts
- Player: `AudioPlayer` component parallel to visual rendering using HTML5 Audio API
- Volume/loop from playlist/layout settings

**Complexity:** MEDIUM -- HTML5 Audio straightforward. Complexity in lifecycle management independent of visual content and autoplay policy handling on various platforms.

### 11. Video Wall Support

**How competitors do it:**
- **Yodeck:** Grid definition (2x2, 3x3). Assign screens to positions. Content stretched/cropped across all.
- **OptiSigns:** Drag-and-drop positioning. Bezel compensation. Content split.
- **ScreenCloud:** Higher tiers. Grid-based layout.
- **Rise Vision:** Multi-display with content spanning.

**Table stakes behavior:**
- Video wall config: grid dimensions (rows x columns)
- Assign screens to grid positions
- Content split: each screen renders its portion of total canvas
- Bezel compensation for seamless appearance
- Admin preview showing full wall
- Works with images, videos, layouts

**Implementation approach:**
- New tables: `video_walls` (id, name, rows, columns) and `video_wall_positions` (wall_id, screen_id, row, col, bezel offsets)
- Player receives wall config: total grid, this screen's position, bezel offsets
- Player: CSS clip/transform to show only this screen's portion
- Sync: Supabase Realtime broadcast channel for loose content synchronization (leader-based: one screen is leader, others follow)
- Admin: visual grid editor

**Complexity:** HIGH -- bezel compensation math, content splitting, cross-device synchronization. Loose sync achievable. Frame-perfect sync is anti-feature.

### 12. Calendar Widgets (Google/Outlook)

**How competitors do it:**
- **Yodeck:** Google Calendar and Outlook apps. OAuth. Agenda/timeline view. Auto-refresh.
- **OptiSigns:** Google Calendar widget. Outlook via iCal URL.
- **ScreenCloud:** Calendar apps. Room booking display mode.
- **Rise Vision:** Google Calendar widget. Event list display.

**Table stakes behavior:**
- Connect Google Calendar or Outlook via OAuth
- Display modes: agenda list, day view, meeting room (free/busy)
- Show: title, time, location, organizer
- Auto-refresh (5-15 min)
- Meeting room mode: large free/busy indicator with next-event countdown
- Privacy option: free/busy only without details

**Implementation approach:**
- Widget types: `google-calendar`, `outlook-calendar` in registry
- OAuth: Google Calendar API (calendar.readonly scope), Microsoft Graph API
- Edge Function proxy: fetch events server-side, return sanitized JSON
- Meeting room mode: simplified status UI
- Offline: cache events in IndexedDB
- ical.js already in package.json for iCal parsing

**Complexity:** MEDIUM -- Google Calendar API well-documented. Microsoft Graph requires Azure AD app. OAuth pattern exists.

### 13. Google Slides Integration

**How competitors do it:**
- **Yodeck:** Paste URL. Google published embed. Auto-refresh. Configurable slide duration.
- **OptiSigns:** Google Slides as media. Auto-sync on edit.
- **ScreenCloud:** OAuth connect or public URL.
- **Rise Vision:** Deep integration (Google partner).

**Table stakes behavior:**
- Paste Google Slides URL
- Slides rotate at configurable interval
- Auto-sync when presentation edited
- Optional: specific slide range

**Implementation approach:**
- Simplest: Google Slides published URL in iframe (auto-advance built-in, limited control)
- Better: Slides API to fetch slide thumbnails, render as image sequence (full timing control)
- Recommend iframe embed for v12.0 (lowest effort), with API-based upgrade path
- Google OAuth scope extension (slides.readonly)

**Complexity:** LOW-MEDIUM -- iframe embed is trivial. API-based rendering is medium but provides better control.

### 14. Canva Integration (OAuth)

**How competitors do it:**
- **OptiSigns:** Canva Connect API. OAuth. Browse designs. Import as image/PDF.
- **Yodeck/ScreenCloud/Rise Vision:** No native integration.

**Table stakes behavior:**
- Connect Canva account via OAuth
- Browse designs in picker modal
- Import as PNG/JPEG for playlists/layouts
- Optional auto-refresh on design update

**Implementation approach:**
- canvaService.js EXISTS with full OAuth PKCE flow and scopes: design:content:read, design:content:write, asset:read, asset:write, profile:read
- CanvaCallbackPage.jsx EXISTS and handles redirect
- Need: Design browser modal (list designs via Canva API)
- Need: Export flow (Canva API design export to PNG/PDF, upload to media library)
- Need: Refresh trigger for design updates

**Complexity:** MEDIUM -- OAuth done. Design browser UI, export pipeline, and media library integration needed.

---

## Feature Dependencies

```
Document Display -------> Media Library (upload), S3 (storage), Edge Function (conversion)
YouTube/Vimeo ----------> Widget Registry, CSP frame-src update, Player iframe
Web Page Widget --------> Promote existing WebPageApp to Widget Registry
Proof of Play ----------> playbackTrackingService (EXISTS), Admin reporting UI, Export service
SSO via SAML -----------> Supabase Auth SAML, ssoService (EXISTS), Enterprise plan gate
Public REST API --------> apiTokenService (EXISTS), apiVersionService (EXISTS), Edge Functions
Nested Playlists -------> Playlist items schema, Recursive CTE, Cycle detection
Media Expiration -------> media_assets.expires_at, Playlist resolution filter, pg_cron
Working Hours ----------> screen_power_schedules table, TZDate, Player schedule check
Audio / Music ----------> Media library, AudioPlayer component, Playlist/Layout data model
Video Wall ------------->  video_wall tables, Realtime broadcast, Player clip/transform
Calendar Widgets -------> Google/Microsoft OAuth, Edge Function proxy, Widget Registry, ical.js
Google Slides ----------> Google OAuth scope extension, Slides embed/API
Canva Integration ------> canvaService (EXISTS), Design browser UI, Export pipeline

YouTube/Vimeo --\
Web Page Widget --> Both use iframe in player (shared rendering pattern)

Google Slides --\
Canva -----------> Both import external designs as rendered images (shared import pattern)

Calendar --------\
Google Slides ----> Both use Google OAuth (shared credential, extend scopes together)

Media Expiration --> affects Playlist Resolution --> affects Nested Playlists
                     (expiration filter applied before nesting resolution)

Proof of Play ----> depends on all content types being trackable
                    (must track document pages, YouTube plays, audio plays)
```

**Critical chain:** Google Calendar + Google Slides share Google OAuth scopes -- implement together or sequentially to avoid re-authorization prompts.

## Complexity Tiers

### Tier 1: Low Complexity (ship fast, high impact)
| Feature | Est. Effort | Why Low |
|---------|-------------|---------|
| Media Expiration | 1-2 days | Single column, filter logic, date picker UI |
| YouTube/Vimeo Embedding | 2-3 days | iframe + URL parser + widget registry entry |
| Web Page Widget | 1-2 days | Promote existing AppRenderer code to widget registry |

### Tier 2: Medium Complexity (core of v12.0)
| Feature | Est. Effort | Why Medium |
|---------|-------------|------------|
| Nested/Sub-Playlists | 3-5 days | Cycle detection, recursive CTE, editor UI |
| Audio / Background Music | 3-5 days | New player component, autoplay policy handling |
| Calendar Widgets | 4-6 days | OAuth + API integration + widget rendering |
| Document Display | 4-6 days | Server-side conversion pipeline |
| Proof of Play | 4-6 days | Reporting UI, aggregation queries, export |
| Google Slides | 2-4 days | iframe embed or API integration |
| Canva Integration | 3-4 days | Design browser UI (OAuth already done) |
| Working Hours | 3-5 days | Schedule logic, player check, admin UI |

### Tier 3: High Complexity (enterprise value, more risk)
| Feature | Est. Effort | Why High |
|---------|-------------|----------|
| Public REST API | 6-10 days | Endpoint design, rate limiting, docs, testing |
| SSO via SAML | 4-6 days | SAML finicky, IdP-specific testing needed |
| Video Wall | 6-10 days | Synchronization, bezel math, grid editor |

## MVP Recommendation

**Priority order for maximum user impact:**

### Phase A: Quick Wins (ship first, 1 week)
1. **Media Expiration Dates** -- lowest effort, immediate compliance value
2. **YouTube/Vimeo Embedding** -- highest user demand, low effort
3. **Web Page Display Widget** -- zero new code (promote existing), high utility

### Phase B: Core Feature Parity (2 weeks)
4. **Proof of Play Reporting** -- enterprise requirement, data collection exists
5. **Nested/Sub-Playlists** -- power user workflow, data model change
6. **Document Display** -- corporate/education use case, needs conversion pipeline
7. **Calendar Widgets** -- meeting room use case, OAuth extension

### Phase C: Integration Power (2 weeks)
8. **Google Slides Integration** -- shares OAuth with calendar, natural pairing
9. **Canva Integration** -- OAuth already built, finish the flow
10. **Audio / Background Music** -- retail/restaurant differentiator
11. **Working Hours / Power Schedule** -- energy savings, screen management

### Phase D: Enterprise Features (2 weeks)
12. **SSO via SAML** -- enterprise gate, feature-flagged to Enterprise plan
13. **Public REST API** -- developer ecosystem, feature-flagged to Pro+ plans
14. **Video Wall** -- highest complexity, highest wow factor, enterprise only

**Defer to post-v12.0:**
- Video wall frame-perfect sync (software loose-sync sufficient)
- API write endpoints beyond media upload and playlist update
- SCIM provisioning
- CEC hardware power commands (start with software black-screen)

## Plan Tier Gating Recommendation

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| YouTube/Vimeo | Yes | Yes | Yes | Yes |
| Web Page Widget | No | Yes | Yes | Yes |
| Document Display | No | Yes | Yes | Yes |
| Media Expiration | No | Yes | Yes | Yes |
| Nested Playlists | No | Yes | Yes | Yes |
| Working Hours | No | Yes | Yes | Yes |
| Calendar Widgets | No | No | Yes | Yes |
| Google Slides | No | No | Yes | Yes |
| Canva Integration | No | No | Yes | Yes |
| Audio / Background | No | No | Yes | Yes |
| Proof of Play | No | No | Yes | Yes |
| Public REST API | No | No | Yes | Yes |
| SSO via SAML | No | No | No | Yes |
| Video Wall | No | No | No | Yes |

## Sources

- Competitor platform feature knowledge from training data (Yodeck, OptiSigns, ScreenCloud, Rise Vision) -- MEDIUM confidence, not live-verified
- BizScreen codebase analysis -- HIGH confidence:
  - `/Users/massimodamico/bizscreen/src/widgets/registry.js` -- 12 widget types, extensible pattern
  - `/Users/massimodamico/bizscreen/src/services/playbackTrackingService.js` -- full event tracking with offline queue
  - `/Users/massimodamico/bizscreen/src/services/canvaService.js` -- OAuth PKCE flow complete
  - `/Users/massimodamico/bizscreen/src/pages/CanvaCallbackPage.jsx` -- callback handler implemented
  - `/Users/massimodamico/bizscreen/src/services/apiTokenService.js` -- 9 scopes, token generation/rotation
  - `/Users/massimodamico/bizscreen/src/services/apiVersionService.js` -- v1 versioning with deprecation
  - `/Users/massimodamico/bizscreen/src/config/plans.js` -- enterprise_sso, api_access flags exist
  - `/Users/massimodamico/bizscreen/src/config/appCatalog.js` -- calendar and youtube types defined
  - `/Users/massimodamico/bizscreen/src/player/components/AppRenderer.jsx` -- WebPageApp iframe pattern
  - `/Users/massimodamico/bizscreen/src/player/components/ZonePlayer.jsx` -- zone playback with analytics
  - `/Users/massimodamico/bizscreen/.planning/codebase/ARCHITECTURE.md` -- system design reference
