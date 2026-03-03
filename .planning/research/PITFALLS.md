# Pitfalls Research

**Domain:** Adding 14 features to existing digital signage platform (v12.0 Feature Parity)
**Researched:** 2026-03-02
**Confidence:** HIGH (based on deep codebase analysis of 196K LOC + domain expertise)

## Critical Pitfalls

### Pitfall 1: Nested Playlists Creating Infinite Recursion in Content Resolution

**What goes wrong:**
Adding sub-playlist support (`item_type = 'playlist'` in `playlist_items`) without recursion guards causes infinite loops when Playlist A references Playlist B which references Playlist A. The `get_resolved_player_content` RPC (migration 016) currently flattens playlist items with a single-level `LEFT JOIN playlist_items pi ON pi.playlist_id`. Nested playlists require recursive resolution, and the same RPC is called by the player on every 30-second heartbeat. An infinite loop here crashes the player or exhausts the Supabase connection pool.

**Why it happens:**
The content resolution RPC was designed for flat playlists. Developers add a self-referencing FK (`playlist_items.item_id -> playlists.id WHERE item_type = 'playlist'`) but forget that the resolution must be recursive AND that the player's offline cache, campaign priority system, and playback tracking all assume flat item arrays.

**How to avoid:**
- Add a `max_depth` parameter (3 levels) to a new recursive CTE in the resolution RPC
- Add a DB constraint: `CHECK` trigger that prevents circular references at write time (traverse the chain on INSERT/UPDATE)
- Flatten nested playlists into a single item array at resolution time -- the player should never receive nested structures
- Add a `playlist_items.item_type = 'playlist'` check that resolves to the child playlist's items inline
- Hard limit on total resolved items: 500 items per playlist (after expansion)

**Warning signs:**
- Player enters infinite content fetch loop (heartbeat logs show repeated RPC calls)
- `get_resolved_player_content` response grows unexpectedly large
- Supabase connection pool exhaustion alerts
- Offline cache fails to serialize (circular JSON)

**Phase to address:**
Nested playlists phase. Must be implemented with the circular reference check BEFORE any UI allows creating nested playlists.

---

### Pitfall 2: Document Display Failing Silently on Smart TV Platforms (WebOS/Tizen)

**What goes wrong:**
PDF.js requires a canvas element and significant JavaScript execution. WebOS (LG) and Tizen (Samsung) smart TV browsers have severe JS memory limits (typically 256-512MB), limited canvas support, and no native PDF rendering. Word/PPT/Excel files require server-side conversion. Implementing document display as client-side rendering works on web/desktop players but produces blank screens or crashes on 60%+ of deployed devices.

**Why it happens:**
Developers test on Chrome desktop, where PDF.js works perfectly. The player already runs on WebOS/Tizen (see `Player.jsx` supporting web, Android, iOS, WebOS, Tizen), but the document rendering path is never tested on these constrained devices. The existing content resolution pipeline (`get_resolved_player_content`) returns media URLs -- it does not handle document-to-image conversion.

**How to avoid:**
- Server-side conversion is mandatory: convert PDF/Word/PPT/Excel to images (PNG/JPEG per page) via a Supabase Edge Function or background worker at upload time
- Store converted images as regular media_assets linked to the source document
- Player receives image URLs, never document URLs -- the conversion is transparent
- For multi-page documents, generate an image per page and create an auto-cycling "slide deck" within the playlist item
- Use LibreOffice headless (via Docker sidecar or external service like Gotenberg) for Word/PPT/Excel conversion; use a PDF-to-image library for PDFs
- Conversion is async: `media_assets.conversion_status` column (pending, processing, completed, failed) with retry logic

**Warning signs:**
- Document media items show blank in player preview but work in admin dashboard
- Smart TV devices report crashes or recovery events around document items
- Test coverage exists only for web browser player
- Edge Function timeout errors (60s default) on large documents

**Phase to address:**
Document display phase. Server-side conversion must be the first task, before any player rendering work.

---

### Pitfall 3: Video Wall Synchronization Without a Clock Source

**What goes wrong:**
Video wall support means multiple physical screens display synchronized content that forms a larger image. Without a shared clock source, each screen's player advances through playlists independently. Even with identical content, clocks drift by 50-200ms within minutes, causing visible tearing at screen boundaries. The existing `usePlayerPlayback` hook manages per-device timing with local `setTimeout` -- there is no cross-device time coordination.

**Why it happens:**
The current architecture is deliberately single-screen: `ViewPage.jsx` fetches content per `screenId`, `usePlayerHeartbeat` reports per device, and `usePlayerPlayback` uses local timers. Video wall is architecturally different from everything else in the player -- it requires devices to coordinate rather than operate independently.

**How to avoid:**
- Designate one screen as the "leader" and others as "followers" in a video wall group
- Leader broadcasts its playback position via Supabase Realtime (a dedicated channel per wall group)
- Followers sync their playback position to the leader's timestamp on each message
- Use NTP-aligned timestamps (`performance.now()` offset calculated against server time) rather than `Date.now()` for timing
- Content for each screen is a viewport crop of the full content -- resolve this server-side and deliver pre-cropped coordinates per device
- Start simple: static content (images/scenes) split across screens. Video sync across screens is much harder and may need to be deferred
- Accept 100-200ms tolerance as industry standard for non-genlock video walls
- Display a "sync quality" indicator in admin UI showing per-screen offset

**Warning signs:**
- Visible content offset at screen boundaries (content doesn't align)
- Content transitions happen at different times on different screens
- Player heartbeats show different `content_version` across wall members

**Phase to address:**
Video wall phase. Requires its own Realtime channel architecture and a new `video_wall_groups` table. Do NOT attempt to retrofit the existing single-screen playback model.

---

### Pitfall 4: Proof of Play Reporting Blowing Up Database Storage

**What goes wrong:**
Proof of Play requires logging every content impression with timestamps, duration, and screen ID. With 1,000 screens each playing 6 items per minute at 10-second durations, that is 360,000 rows per hour, 8.6M per day. The existing `playback_events` table (migration 022) and `playbackTrackingService.js` already queue events locally and flush every 30 seconds (`CONFIG.FLUSH_INTERVAL_MS = 30000`). But adding compliance-grade proof of play (with exact start/end timestamps, no gaps, exportable to CSV/PDF) dramatically increases the volume and retention requirements. Without partitioning, this table will degrade query performance within weeks.

**Why it happens:**
The existing tracking was designed for analytics aggregation (counts, averages), not compliance reporting (every event, exact timestamps, long retention). Developers add the columns and start collecting data, but the table becomes the largest in the database and slows down all reporting queries.

**How to avoid:**
- Partition `playback_events` by month (`PARTITION BY RANGE (recorded_at)`) from day one
- Set up automatic partition creation (pg_cron job creates next month's partition on the 25th)
- Create a separate `proof_of_play_reports` table for generated reports (pre-aggregated)
- Create `playback_daily_summary` aggregate table populated by pg_cron for dashboard queries
- Add an archival policy: move raw events older than 90 days to cold storage (or archive to S3 as CSV)
- Batch inserts: the player already queues events locally. Use `record_playback_events_batch` RPC (already exists in `offlineService.js:551`) for bulk inserts
- Index only on `(tenant_id, screen_id, recorded_at)` -- do NOT add per-media indexes on the raw table

**Warning signs:**
- `playback_events` table exceeds 10M rows
- Analytics dashboard queries take > 5 seconds
- Supabase plan storage alerts
- Player heartbeat RPC slows down (shares connection pool)

**Phase to address:**
Proof of Play phase. Table partitioning must be in the first migration, not retrofitted later.

---

### Pitfall 5: YouTube/Vimeo Embedding Breaking Offline Player

**What goes wrong:**
YouTube and Vimeo embeds use iframe-based players that require network access. When the player goes offline (the entire offline cache system in `offlineService.js` and `cacheService.js` is designed for self-hosted content), embedded videos show blank iframes or error pages. The `getSceneForPlayback` fallback in `offlineService.js:337-376` returns cached scenes but cannot cache third-party iframe content.

**Why it happens:**
The existing cache system stores media blobs in IndexedDB (images, videos uploaded to S3). YouTube/Vimeo content cannot be downloaded and cached -- it is third-party streaming content behind DRM and ToS restrictions. Developers add the embed widget but forget the offline story, resulting in blank zones on screens that lose connectivity.

**How to avoid:**
- Treat YouTube/Vimeo embeds as "online-only" content with an explicit fallback
- When offline, display a configurable fallback: thumbnail + "Content requires internet" message, or a designated offline replacement media item
- Add a `requiresNetwork` flag to the widget registry entry for these types
- The player's `getMediaUrl` function (`offlineService.js:406-417`) must handle the "no cache available" case for iframe widgets gracefully
- Generate and cache a thumbnail of the video (via YouTube/Vimeo API thumbnail endpoints) as the offline fallback image
- Document this limitation in the admin UI when adding YouTube/Vimeo content: "This content will not display when screen is offline"
- Always embed with `mute=1` parameter (muted autoplay is allowed without user interaction on all platforms)
- Add `allow="autoplay; encrypted-media"` to the iframe

**Warning signs:**
- Blank zones on screens during network outages
- Player recovery system triggers (blank screen detection at 30s threshold) for YouTube/Vimeo zones
- Stuck detection false positives (`useStuckDetection` hook sees no content)

**Phase to address:**
YouTube/Vimeo embedding phase. The offline fallback must be implemented alongside the embed widget, not as a follow-up.

---

### Pitfall 6: SAML SSO Bypassing Supabase Auth and Breaking RLS

**What goes wrong:**
Supabase Auth has built-in SAML support (via `supabase.auth.signInWithSSO()`), but it requires configuring the SAML provider at the Supabase project level. The existing `ssoService.js` stores provider config in a custom `sso_providers` table with fields for `metadata_url`, `metadata_xml`, `entity_id`, `sso_url`, and `certificate` but does not wire it to Supabase Auth's actual SAML flow. If SSO is implemented as a separate auth mechanism that bypasses `supabase.auth`, then all RLS policies (which depend on `auth.uid()`) break. Users authenticated via custom SSO would have no Supabase session and no row-level security.

**Why it happens:**
Multi-tenant SAML is complex. Each tenant wants their own IdP (Okta, Azure AD, etc.). Supabase's SSO requires either their enterprise plan or manual provider registration. Developers build a custom SAML flow to avoid this dependency but forget that the entire data access layer depends on `auth.uid()` in RLS policies.

**How to avoid:**
- Use Supabase Auth SSO if on a plan that supports it -- this keeps `auth.uid()` and all RLS intact
- If building custom SAML: after SAML assertion validation, create/link a Supabase user and generate a Supabase session (via `supabase.auth.admin.generateLink()` or custom JWT)
- NEVER have two parallel auth systems -- SSO users must end up with a Supabase session
- The `AuthContext.jsx` (which reads `supabase.auth.getSession()`) must handle SSO sessions identically to password sessions
- Store SAML provider config per tenant, but the actual authentication still flows through Supabase Auth
- Test with `enforce_sso: true` (already in `ssoService.js:63`) to ensure password login is properly blocked for SSO tenants
- Never parse SAML XML in the browser -- assertion validation must happen server-side

**Warning signs:**
- SSO users can log in but see empty data (RLS filtering everything)
- SSO users authenticated but `userProfile` is null (no matching row in `profiles` table)
- SSO sessions not appearing in Supabase Auth dashboard
- `auth.uid()` returns null in RLS policies for SSO users

**Phase to address:**
SSO/SAML phase. Architecture decision (Supabase native vs. custom) must be made first, before any implementation.

---

### Pitfall 7: Public REST API Leaking Tenant Data Across Boundaries

**What goes wrong:**
The existing `apiTokenService.js` generates tokens with scopes (9 defined in `AVAILABLE_SCOPES`) and stores hashes in an `api_tokens` table. But a public REST API needs its own request handling layer (Edge Function or separate endpoint) that validates the token AND applies tenant isolation. If the API uses a service role key for flexibility (batch operations, cross-table queries), it bypasses RLS entirely. One misconfigured endpoint can return another tenant's screens, playlists, or media.

**Why it happens:**
The existing 90+ service files all use `supabase` from `src/supabase.js` which authenticates via the user's session. API token auth is fundamentally different -- there is no user session. Developers either use the service role (bypassing RLS) or try to impersonate a user (fragile). Neither approach naturally maps to the existing service layer.

**How to avoid:**
- Implement the API as Supabase Edge Functions that validate the `biz_` token prefix, hash and look up from `api_tokens`, and then execute queries with explicit `WHERE owner_id = $1` filters (defense in depth alongside RLS)
- Never use the service role key in API endpoints that accept external tokens
- Each API endpoint must include a tenant filter even if RLS is active (belt and suspenders)
- Rate limit per API token, not per IP (the token identifies the tenant)
- Add integration tests that attempt cross-tenant access and verify 403 responses
- The existing `AVAILABLE_SCOPES` in `apiTokenService.js` must map to actual authorization checks in each endpoint
- Include `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers in responses

**Warning signs:**
- API responses include data from multiple tenants
- API token with `screens:read` scope can access playlists
- No tenant filter in API query WHERE clauses (relying solely on RLS)
- API tests pass without creating test data (reading real/other tenant data)

**Phase to address:**
Public API phase. Tenant isolation must be validated in the first endpoint, establishing the pattern for all subsequent endpoints.

---

### Pitfall 8: Audio/Background Music Conflicting with Video Playback

**What goes wrong:**
Background music is a separate audio track that plays alongside visual content. But the player already handles video with audio (`VideoPlayer.jsx` defaults to `muted = true` but can be unmuted). When a user adds background music AND a video with audio, both audio streams play simultaneously. The existing player has no audio mixing or priority system. On WebOS/Tizen, multiple simultaneous audio streams may not be supported at all (hardware audio decoders are limited).

**Why it happens:**
The player treats each zone/item independently. `ZonePlayer.jsx` manages items per zone with no awareness of what other zones are playing. Adding a "background music" track is a cross-zone concern that the current architecture does not support.

**How to avoid:**
- Add audio priority: background music automatically pauses when a video with audio plays, resumes when the video ends
- Implement a player-level `AudioManager` that coordinates audio across all zones (similar to `DataRefreshContext.jsx` but for audio)
- Default all video items to muted when background music is active; provide per-item "override: play video audio" toggle
- On WebOS/Tizen, only one audio stream at a time (detect platform via user agent)
- Background music should be a screen-level setting, not a playlist item -- it persists across content transitions
- Use the Web Audio API for mixing on platforms that support it; fall back to simple pause/resume on constrained platforms

**Warning signs:**
- Overlapping audio from multiple sources on screen
- Audio continues playing after content transitions
- Smart TV players crash when two audio streams are requested
- Background music restarts on every playlist loop

**Phase to address:**
Audio/background music phase. The AudioManager must be implemented BEFORE the background music widget, as it affects the entire player playback model.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client-side PDF rendering (PDF.js) | Fast to implement, no server needed | Crashes on smart TVs, memory exhaustion on large docs | Never -- server-side conversion is mandatory |
| Storing OAuth tokens in localStorage (Canva/Google) | Simple persistence across sessions | XSS can steal tokens; existing pattern in `canvaService.js` uses localStorage | MVP only -- migrate to httpOnly cookies or server-side vault |
| Polling for video wall sync | Simpler than Realtime channels | 100ms+ latency makes visible sync drift | Only for static content walls (no video) |
| Single `playback_events` table without partitioning | No migration complexity | Table bloats to millions of rows; queries slow | Never for production proof of play |
| Embedding YouTube via direct iframe URL | No API key needed | No offline fallback, no playback tracking, no duration control | MVP with documented limitation |
| API endpoints using service role key | Bypass RLS for flexibility | One bug = cross-tenant data leak | Never |
| Client-side SAML assertion parsing | No server-side dependency | Cannot validate signature without IdP cert on server | Never -- security critical |
| On-demand document conversion (not at upload) | Simpler upload flow | First viewer sees loading spinner for minutes | Never -- convert at upload time |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| YouTube embed | Using `watch?v=` URL in iframe | Must use `embed/VIDEO_ID` URL format; `watch` URLs blocked by X-Frame-Options |
| Vimeo embed | Assuming all videos are embeddable | Check `privacy.embed` field in Vimeo API response; private videos return 403 |
| Google Calendar API | Requesting full event details for display | Use `events.list` with `fields` parameter to limit response size; fetch only today + 7 days |
| Outlook Calendar | Using Microsoft Graph with delegated permissions | Calendar read requires `Calendars.Read` scope AND admin consent in many orgs |
| Google Slides | Fetching presentation via Drive API | Must use Slides API specifically (`presentations.get`) for slide dimensions and thumbnail URLs |
| Canva Connect | Assuming export is instant | Export is async: `POST /designs/{id}/exports`, then poll until `status: completed`; existing `canvaService.js` handles this |
| SAML IdP metadata | Hardcoding metadata URL | Metadata URLs change; store and periodically refresh; support both URL and raw XML upload |
| Supabase Edge Functions + CORS | Forgetting CORS for new Edge Functions | Use the existing `_shared/cors.ts` pattern; the 4 existing proxies all use it |
| IndexedDB version bump | Adding new stores without incrementing DB_VERSION | `cacheService.js` uses `DB_VERSION = 4`. New stores for calendar/document cache need version 5+ with proper `upgrade` handler |
| Supabase Realtime for video wall | Creating one channel per screen | One channel per wall group; screens subscribe with their position metadata |
| Web page widget iframes | No sandbox attribute | Always use `sandbox="allow-scripts allow-same-origin"` to prevent parent page access |
| Google OAuth | Requesting all scopes at once | Request incrementally: only `calendar.readonly` for calendar widget, only `presentations.readonly` for Slides |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Proof of play: unpartitioned events table | Analytics queries slow to > 5s | Partition by month from day one | ~5M rows (1-2 weeks at 1K screens) |
| Document conversion on-demand | First viewer sees minutes-long spinner | Convert at upload time, store as images | First use with multi-page PPT |
| YouTube embed auto-refresh on player heartbeat | YouTube rate limits reached, embeds show errors | Cache embed URL, only refresh iframe on content change | 100+ screens with YouTube |
| Calendar widget fetching all events | Slow render, memory pressure on player | Fetch only today + 7 day lookahead | Calendars with 1000+ historical events |
| API token validation via DB lookup per request | DB connection pool exhaustion under load | Cache token-to-tenant mapping in-memory with 5-min TTL | 100+ API requests/second |
| Media expiration check on every heartbeat | N+1 query pattern (check each item) | Add `expires_at` to content resolution RPC, filter server-side | 50+ expired items in active playlists |
| Nested playlist resolution at play time | Deep nesting = slow resolution + large payloads | Flatten at publish time, cache the flat version | 3+ nesting levels with 50+ items each |
| Video wall: all screens polling leader state | Network traffic grows with wall size | Leader broadcasts via Realtime; followers receive, not poll | 3x3+ walls (9+ screens) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key stored in plaintext | DB breach reveals all API keys, full API access to all tenants | SHA-256 hash storage only (existing `apiTokenService.js` generates tokens correctly); show raw key once at creation |
| SAML assertion replay | Attacker reuses intercepted SAML response to gain access | Validate `NotOnOrAfter`, check `InResponseTo` against stored request ID; use Supabase Auth SSO which handles this |
| Iframe widget pointing to malicious URL | XSS via injected web page widget content | Sanitize and validate URLs server-side; use CSP `frame-src` allowlist; warn on non-HTTPS URLs |
| YouTube/Vimeo embed leaking screen context | Referrer headers sent to YouTube reveal screen URLs | Use `referrerpolicy="no-referrer"` on embed iframes |
| Public API without rate limiting | DDoS via unlimited API calls exhausts Supabase pool | Rate limit per token (100 req/min default), implement in Edge Function |
| Google/Outlook OAuth tokens stored in client-accessible table | Tokens persisted in RLS-protected but still client-queryable table | Store OAuth tokens in separate `oauth_tokens` table with service-role-only RLS; never send to client |
| Background music file stored without scanning | Malicious audio file exploits codec vulnerability on smart TV | Validate audio MIME type and file header bytes at upload; transcode to known-safe format (MP3/AAC) |
| Service role key in API Edge Functions | Any API bug can leak/modify data across tenants | Never use service role for external-facing endpoints; use explicit WHERE filters per tenant |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No preview for document pages before scheduling | User uploads 50-page PDF, doesn't know which pages will show | Show page thumbnails in media library after upload conversion; let user select page range |
| Media expiration with no warning | Content disappears from screens without notice | Show "expires in X days" badge in playlist editor; send email notification 7 days before expiration |
| Working hours conflicts with existing schedules | Power-off schedule turns off screen during scheduled campaign | Show conflict detection in working hours UI; working hours overrides schedule |
| Nested playlist with no visual depth indicator | User can't tell which items are direct vs. from sub-playlists | Show indented tree view with sub-playlist name as section header; total duration includes sub-playlist durations |
| Video wall setup requiring manual per-screen config | Setting up a 3x3 wall requires configuring 9 screens individually | Provide "wall wizard" that auto-assigns position (row, column) based on selected grid layout |
| API key shown only once but user misses copy | User creates token, navigates away, token is lost | Show token in modal with explicit "I've copied this token" confirmation before allowing dismiss |
| Calendar widget showing stale data | Screen shows yesterday's schedule all day | Default refresh to 15-min intervals; show "last updated" timestamp on calendar widget |
| Media expiration timezone confusion | User sets "March 15" but content expires at UTC midnight, 5-8 hours early | Default expiration to end-of-day (23:59) in user's timezone; show explicit date+time+timezone |
| Google OAuth "unverified app" warning | Users scared by Google's warning screen, abandon setup | Submit app for Google OAuth verification (2-6 weeks); request scopes incrementally |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Document display:** Often missing server-side conversion -- verify documents render on WebOS/Tizen, not just Chrome
- [ ] **YouTube embed:** Often missing offline fallback -- verify screen shows fallback image, not blank, when offline
- [ ] **YouTube embed:** Often missing muted autoplay -- verify `mute=1` in embed URL (required for autoplay without interaction)
- [ ] **Web page widget:** Often missing iframe sandboxing -- verify `sandbox` attribute prevents parent page access
- [ ] **Web page widget:** Often missing X-Frame-Options pre-check -- verify admin UI warns when URL blocks embedding
- [ ] **Proof of play:** Often missing data export -- verify CSV/PDF export works for 100K+ events without timeout
- [ ] **Proof of play:** Often missing table partitioning -- verify `playback_events` is partitioned from day one
- [ ] **SSO/SAML:** Often missing profile sync -- verify SAML attributes (name, email) sync to `profiles` table on each login
- [ ] **SSO/SAML:** Often missing Supabase session -- verify SSO users have `auth.uid()` set (not null in RLS context)
- [ ] **Public API:** Often missing pagination -- verify list endpoints return paginated results, not unbounded arrays
- [ ] **Public API:** Often missing rate limit headers -- verify 429 responses include `Retry-After` header
- [ ] **Nested playlists:** Often missing duration calculation -- verify total playlist duration accounts for sub-playlist items
- [ ] **Nested playlists:** Often missing circular reference check -- verify A->B->A is rejected at save time
- [ ] **Media expiration:** Often missing player-side enforcement -- verify expired media is skipped during playback, not just hidden in admin
- [ ] **Working hours:** Often missing timezone awareness -- verify power schedule respects per-screen timezone (`tv_devices.timezone`)
- [ ] **Audio/music:** Often missing resume-on-next-loop -- verify background music resumes from where it paused after video ends
- [ ] **Audio/music:** Often missing WebOS/Tizen single-stream enforcement -- verify only one audio stream on smart TVs
- [ ] **Video wall:** Often missing partial failure handling -- verify wall continues displaying if one screen goes offline
- [ ] **Calendar widgets:** Often missing auth token refresh -- verify OAuth tokens are refreshed before expiry (proactive, not reactive)
- [ ] **Google Slides:** Often missing slide update detection -- verify slides reflect changes made in Google Slides without manual re-import
- [ ] **Canva integration:** Often missing design update sync -- verify Canva design changes propagate to screens (existing `canvaService.js` handles initial import only)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nested playlist infinite recursion crashes player | MEDIUM | Add `MAX_DEPTH = 3` guard to RPC; deploy migration; affected players recover on next heartbeat |
| Document rendering crashes smart TVs | HIGH | Must build server-side conversion pipeline; redeploy all document media as images; player update needed |
| Video wall sync drift | LOW | Increase Realtime broadcast frequency; add manual "sync now" command to screen group |
| Proof of play table bloat | HIGH | Requires table partitioning migration (locks table); export/reimport data into partitioned table |
| YouTube embed breaks offline player | LOW | Add `requiresNetwork` flag to widget type; deploy player update; fallback shows cached thumbnail |
| SSO bypasses RLS (no Supabase session) | CRITICAL | Must rearchitect SSO to produce Supabase sessions; all SSO users need re-authentication |
| API leaks cross-tenant data | CRITICAL | Disable API immediately; audit access logs; add tenant filter to all endpoints; rotate affected tokens |
| Audio conflict crashes WebOS player | MEDIUM | Add platform detection; limit to single audio stream on WebOS/Tizen; deploy player update |
| Media expiration not enforced on player | LOW | Add `expires_at` filter to content resolution RPC; player re-fetches on next heartbeat |
| Working hours timezone mismatch | LOW | Fix schedule to use screen timezone; affected screens correct on next schedule evaluation |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nested playlist recursion | Nested playlists (circular ref check in first migration) | Create A->B->A chain, verify error; check `get_resolved_player_content` returns flat array |
| Document rendering on smart TVs | Document display (server-side conversion first) | Upload PDF, verify images appear in media_assets; test on WebOS emulator |
| Video wall sync drift | Video wall (leader/follower pattern from start) | Deploy 2-screen wall; verify content transitions within 200ms of each other |
| Proof of play storage | Proof of play (partitioned table in first migration) | Run for 24 hours at scale; verify query performance < 2s on 1M rows |
| YouTube/Vimeo offline fallback | YouTube/Vimeo embedding (fallback alongside embed) | Disconnect network; verify fallback image displays within 5s |
| SSO breaking RLS | SSO/SAML (architecture decision before implementation) | SSO user logs in; verify `auth.uid()` is set; verify data access matches password user |
| API tenant isolation | Public API (first endpoint includes cross-tenant test) | Create data as Tenant A; query API as Tenant B; verify 0 results |
| Audio conflicts | Audio/background music (AudioManager before music widget) | Play video with audio + background music; verify only one plays at a time |
| Media expiration not enforced on player | Media expiration (add `expires_at` filter to content resolution RPC) | Set media expiration to past date; verify player skips item |
| Working hours timezone mismatch | Working hours scheduling (use screen timezone from `tv_devices.timezone`) | Set screen to Tokyo timezone; set working hours 9-17; verify power state matches Tokyo time |
| Calendar token refresh failure | Calendar widgets (proactive token refresh, not reactive) | Set token expiry to short interval; verify refresh happens before expiry |
| Canva design staleness | Canva integration (webhook or polling for design changes) | Edit design in Canva; verify BizScreen detects change within configured interval |
| Google Slides staleness | Google Slides (periodic re-fetch of slide thumbnails) | Edit slide in Google Slides; verify updated thumbnail appears on screen |
| Web page iframe escape | Web page widget (sandbox attribute on all iframes) | Create widget pointing to page with `window.parent.postMessage`; verify it is blocked |
| API key plaintext storage | Public API (SHA-256 hash from day one) | Inspect `api_tokens` table; verify no plaintext key column exists |

## Cross-Cutting Concerns

These concerns span ALL 14 features and must be addressed systematically rather than per-feature.

### Offline Support

Every new widget type registered in `WIDGET_REGISTRY` must answer: "What does this widget show when offline?"

| Feature | Offline Strategy | Cache Store Needed |
|---------|------------------|--------------------|
| Document display | Pre-converted images already in media cache | No (uses existing `STORES.MEDIA`) |
| YouTube/Vimeo | Cached thumbnail + "requires internet" overlay | New: thumbnail stored in `STORES.MEDIA` |
| Web page widget | Cached screenshot of last loaded state OR fallback | New: webpage screenshot in `STORES.MEDIA` or separate store |
| Calendar widgets | Last-fetched event list from IndexedDB | New: `STORES.CALENDAR_EVENTS` (requires DB_VERSION bump to 5) |
| Google Slides | Cached slide images from last sync | No (uses existing `STORES.MEDIA`) |
| Canva designs | Cached exported image from last sync | No (uses existing `STORES.MEDIA`) |
| Audio/music | Cached audio file in IndexedDB media store | No (uses existing `STORES.MEDIA`, but note larger blob sizes) |
| Proof of play | Events queued in offline queue (already supported) | No (existing `STORES.OFFLINE_QUEUE`) |
| Nested playlists | Same as parent: resolved flat items cached normally | No change needed |
| Media expiration | Expiration metadata cached with content | Include in content resolution response |
| Working hours | Schedule cached locally | Existing device state store |
| Video wall | Leader broadcasts; followers cache last position | Existing device state store |

Requires `cacheService.js` DB_VERSION bump from 4 to 5+ for new stores.

### Player Compatibility

| Feature | Web | Android | iOS | WebOS | Tizen | Notes |
|---------|-----|---------|-----|-------|-------|-------|
| Document display (as images) | Yes | Yes | Yes | Yes | Yes | Server-side conversion eliminates platform issues |
| YouTube embed (iframe) | Yes | Yes | Partial | Partial | Partial | Smart TVs may restrict iframes; test needed |
| Vimeo embed (iframe) | Yes | Yes | Partial | Partial | Partial | Same iframe restrictions as YouTube |
| Web page (iframe) | Yes | Yes | Yes | Limited | Limited | CSP and memory constraints on smart TVs |
| Audio playback | Yes | Yes | Yes | Single stream | Single stream | AudioManager handles platform limits |
| Video wall sync | Yes | Yes | Yes | Yes | Yes | Realtime channels work on all platforms |
| Calendar widget | Yes | Yes | Yes | Yes | Yes | Data-driven, no special APIs needed |
| Google Slides (as images) | Yes | Yes | Yes | Yes | Yes | Pre-fetched slide images |
| Canva (as exported image) | Yes | Yes | Yes | Yes | Yes | Pre-exported image |
| Proof of play tracking | Yes | Yes | Yes | Yes | Yes | Uses existing event queue |

### Multi-Tenant Isolation

Every new database table must include:

1. `tenant_id` (or `owner_id`) column with NOT NULL constraint
2. RLS policy: `USING (owner_id = auth.uid())` for client access
3. Index on `(owner_id, ...)` for RLS-filtered query performance
4. API endpoints with explicit `WHERE owner_id = $1` (defense in depth)

New tables needed for v12.0:

| Table | Tenant Column | Special RLS Notes |
|-------|---------------|-------------------|
| `proof_of_play_events` (partitioned) | `tenant_id` | RLS on parent table propagates to partitions |
| `sso_providers` | `tenant_id` | Already exists in `ssoService.js`; verify RLS |
| `api_tokens` | `owner_id` | Already exists; verify RLS policy covers scopes |
| `video_wall_groups` | `owner_id` | Members must share same tenant |
| `screen_power_schedules` | `owner_id` | Per-screen overrides need same tenant check |
| `oauth_tokens` | `owner_id` | Service-role-only access; never client-readable |
| `media_expirations` | Via `media_assets.owner_id` | No new table; add `expires_at` column to `media_assets` |

### Widget Registry Expansion

Current registry has 12 types (11 + 1 legacy alias) in `src/widgets/registry.js`. v12.0 adds up to 7 new widget types:

| New Widget Type | Registry Key | Component | Requires Network |
|-----------------|-------------|-----------|-----------------|
| YouTube embed | `youtube` | `YouTubeWidget` | Yes |
| Vimeo embed | `vimeo` | `VimeoWidget` | Yes |
| Web page | `webpage` | `WebPageWidget` | Yes |
| Calendar | `calendar` | `CalendarWidget` | Yes (for refresh) |
| Google Slides | `google-slides` | `GoogleSlidesWidget` | Yes (for refresh) |
| Audio player | `audio` | `AudioWidget` | No (cached) |
| Document viewer | `document` | `DocumentWidget` | No (pre-converted images) |

Each must follow the existing pattern: add ONE entry to `WIDGET_REGISTRY`, implement the component in `src/player/components/widgets/`, and all rendering paths pick it up automatically. The `requiresNetwork` flag is new metadata that the offline service should check.

### Edge Function Expansion

Current: 4 Edge Functions (`unsplash-proxy`, `rss-proxy`, `weather-proxy`, `ai-designer`). v12.0 needs:

| New Edge Function | Purpose | Pattern |
|-------------------|---------|---------|
| `document-converter` | PDF/Office to image conversion | Async job pattern (POST returns job ID, poll for result) |
| `api-gateway` | Public REST API endpoint | Token auth, tenant isolation, rate limiting |
| `calendar-proxy` | Google Calendar / Outlook API proxy | OAuth token refresh, data transform, caching |
| `slides-proxy` | Google Slides thumbnail fetch | OAuth token refresh, image URL extraction |

All must use the existing `_shared/cors.ts` pattern for CORS headers.

## Sources

- Codebase analysis: `src/widgets/registry.js` -- 12 widget types, registration pattern, `getWidgetComponent()` lookup
- Codebase analysis: `src/player/offlineService.js` -- offline sync strategy, IndexedDB caching, 3-phase sync
- Codebase analysis: `src/player/cacheService.js` -- DB_VERSION=4, 6 stores, LRU eviction, 500MB media limit
- Codebase analysis: `supabase/migrations/016_player_content_resolution.sql` -- content resolution RPC, flat playlist assumption, schedule priority
- Codebase analysis: `src/player/components/AppRenderer.jsx` -- app type routing, `WebPageApp` iframe pattern
- Codebase analysis: `src/player/components/VideoPlayer.jsx` -- HLS support, stall detection, muted default
- Codebase analysis: `src/player/components/ZonePlayer.jsx` -- per-zone playback, no cross-zone coordination, duration timer
- Codebase analysis: `src/player/pages/ViewPage.jsx` -- player hooks composition, retry config, content verification
- Codebase analysis: `src/services/ssoService.js` -- SSO_TYPES, provider config, enforce_sso, attribute mapping
- Codebase analysis: `src/services/apiTokenService.js` -- token generation with `biz_` prefix, SHA-256 hash, 9 scopes
- Codebase analysis: `src/services/canvaService.js` -- PKCE OAuth, localStorage tokens, export polling
- Codebase analysis: `src/services/playbackTrackingService.js` -- event queue (50 max), 30s flush, offline storage
- Codebase analysis: `src/services/mediaService.js` -- MEDIA_TYPES enum (image/video/audio/document/web_page/app)
- Codebase analysis: `.planning/codebase/ARCHITECTURE.md` -- system layers, content resolution flow, widget registry
- Codebase analysis: `.planning/codebase/CONCERNS.md` -- existing security issues (API keys in client, fake billing), tech debt
- Codebase analysis: `.planning/codebase/STACK.md` -- Supabase 2.80, React 19, Vite 7, hls.js light build
- Domain expertise: PDF rendering on constrained smart TV platforms (WebOS/Tizen memory limits)
- Domain expertise: Video wall synchronization (leader/follower, NTP alignment, genlock alternatives)
- Domain expertise: SAML/SSO multi-tenant architecture (Supabase Auth integration requirements)
- Domain expertise: Proof of play compliance requirements (partition strategies, retention policies)
- Domain expertise: YouTube/Vimeo iframe embedding restrictions and autoplay policies

---
*Pitfalls research for: BizScreen v12.0 Feature Parity*
*Researched: 2026-03-02*
