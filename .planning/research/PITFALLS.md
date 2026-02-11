# Domain Pitfalls: Data-Driven Signage Features

**Domain:** Data source widgets, social/RSS feeds, weather/time/countdown widgets for existing digital signage platform
**Project:** BizScreen v4 -- Data-Driven Content
**Researched:** 2026-02-11
**Confidence:** HIGH (based on deep codebase analysis of 50 shipped phases, existing service layer patterns, and established digital signage domain knowledge)

## Context

BizScreen already has foundational pieces for this milestone:
- `DataSourcesPage.jsx` with CRUD, CSV import, Google Sheets link/sync
- `dataSourceService.js` with field types, row operations, real-time subscriptions, binding resolution
- `googleSheetsService.js` with fetch/sync/change detection
- `SocialFeedWidget.jsx` and `SocialFeedRenderer.jsx` (player-side) with cached data only
- `socialFeedSyncService.js` with rate limiting, cooldowns, moderation
- `WeatherWidget.jsx` (player) with 10-minute refresh, OpenWeatherMap integration
- `weatherService.js` with in-memory cache, forecast support, coordinate-based lookup
- `ClockWidget.jsx`, `DateWidget.jsx` already in player/components/widgets/
- `offlineService.js` with IndexedDB caching via `cacheService.js` (scenes + media, LRU eviction)
- `AppRenderer.jsx` with `useAppData` hook using sessionStorage cache + periodic refresh
- Multi-tenant RLS throughout, Supabase Realtime subscriptions for data source updates

The challenge is NOT building these features from scratch. The challenge is:
1. Making data widgets render live data reliably on the PLAYER across 5 platforms
2. Ensuring offline cache covers dynamic data (not just static scenes/media)
3. Handling configurable poll intervals without hammering APIs or Supabase
4. Keeping multi-tenant isolation when syncing external data through edge functions or server-side cron

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or broken player experiences.

---

### Pitfall 1: Offline Cache Does Not Cover Dynamic Widget Data

**What goes wrong:** Player goes offline. Static scenes render from IndexedDB cache. But data source widgets (Google Sheets table, social feed, weather) show blank/error states because their data only lives in Supabase or in-memory JavaScript caches. A menu board shows "Loading..." indefinitely on an offline restaurant TV.

**Why it happens:** The current `cacheService.js` has four IndexedDB stores: `scenes`, `media`, `deviceState`, `offlineQueue`. None of these store widget data snapshots. The `weatherService.js` uses an in-memory `Map()` cache (line 15: `const weatherCache = new Map()`) that vanishes on page reload. The `SocialFeedRenderer.jsx` fetches directly from Supabase `social_feeds` table (line 28-34) -- no IndexedDB fallback. The `AppRenderer.jsx` caches in `sessionStorage` (line 52) which is volatile and limited to ~5MB.

**BizScreen-specific risk:** The existing offline architecture is scene/media-centric. The `fetchAndCacheScene()` function caches `design_json` and media blobs. But a scene containing a data source widget binds to external data at render time. The `resolveMultipleBindings()` function in `dataSourceService.js` makes live Supabase queries. Offline = no bindings resolved = empty widgets.

**Consequences:**
- Menu boards, price lists, event schedules show blank on network loss
- Social feeds display "No posts to display" placeholder
- Weather shows fallback "72F" mock data (line 98 in WeatherWidget.jsx) with no indication it is stale
- Player appears broken even though scenes and layouts load fine from cache

**Prevention:**
1. Add a `widgetData` store to IndexedDB in `cacheService.js` keyed by `{sceneId}:{widgetType}:{widgetConfig}`
2. When player fetches widget data online, always write-through to IndexedDB before rendering
3. When offline (detected via `offlineService.js` `getOfflineMode()`), read from IndexedDB first
4. Include `cachedAt` timestamp in cached widget data so the player can show a "Last updated 2h ago" indicator
5. For data sources specifically, cache the resolved binding values alongside the scene cache in `fetchAndCacheScene()` -- add a `dataBindings` field to the scene cache entry
6. For weather, serialize the last successful API response to IndexedDB, not just the in-memory Map
7. For social feeds, the `SocialFeedRenderer` already reads from Supabase `social_feeds` -- but needs a local fallback when Supabase is unreachable

**Detection (warning signs during development):**
- Player in airplane mode shows spinners or empty states in widget areas
- Test: unplug network while menu board is displaying, verify data persists
- Test: restart player browser while offline, verify cached data loads

**Phase mapping:** Must be addressed in the FIRST phase alongside the widget rendering pipeline. Do not ship any data widget to the player without offline cache. This is not a "nice to have" -- it is the core value prop of BizScreen ("content reaches screens correctly and plays without interruption").

**Confidence:** HIGH (verified from codebase: no IndexedDB store for widget data exists today)

---

### Pitfall 2: Polling Interval Multiplies Per Screen Per Widget Per Tenant

**What goes wrong:** Admin sets a data source to poll every 5 minutes. 50 screens are displaying that data source. Each screen independently polls Supabase every 5 minutes. That is 600 queries/hour for ONE data source. Add 10 data sources across a tenant, and you have 6,000 queries/hour. Add 20 tenants and you hit 120,000 queries/hour -- a Supabase rate-limit or billing event.

**Why it happens:** The current architecture has two independent polling paths:
1. **Server-side sync** (Google Sheets to Supabase): `googleSheetsService.js` syncs sheet data into `data_source_rows` table. The `listDataSourcesNeedingSync` RPC identifies stale sources. This is correct and runs centrally.
2. **Player-side poll** (Supabase to screen): Each player independently fetches its bound data. The `useAppData` hook in `AppRenderer.jsx` (line 17) sets up `setInterval` per widget instance. The `WeatherWidget.jsx` (line 93) sets its own 10-minute interval. Each screen runs its own timers.

The problem is #2. If polling is configured "per widget on each screen" rather than "centrally, pushed to screens," query volume scales as `screens x widgets x (60/interval)`.

**BizScreen-specific risk:** The `subscribeToDataSource` function in `dataSourceService.js` (line 1155) already uses Supabase Realtime subscriptions for push updates. But the existing pattern has each player subscribe to individual data source channels. Supabase Realtime has connection limits per project (default 200 concurrent connections for free/pro tiers, 500 for team). With 200 screens each subscribing to 3 data source channels, you hit 600 concurrent channels.

**Consequences:**
- Supabase connection limits exceeded -- screens lose real-time updates silently
- API rate limits on Google Sheets API (read requests: 300/minute per project)
- Database load spikes every N minutes as all screens poll simultaneously (thundering herd)
- Billing increases proportional to screen count, not data source count

**Prevention:**
1. **Server-side sync only**: External data (Sheets, RSS, weather APIs) should sync TO Supabase via Edge Functions on a cron schedule. Screens never call external APIs directly.
2. **Push, don't poll**: Use Supabase Realtime to push data source changes to screens. The `subscribeToClientDataSources` function (line 1221) already exists but subscribes to ALL row changes without filtering. Refine to subscribe per-screen's assigned data sources only.
3. **Single channel per screen**: Instead of subscribing to N data source channels per screen, subscribe to ONE screen-specific channel. Server broadcasts "content updated for screen X" on that channel. Screen then fetches its full resolved content once.
4. **Jitter on poll intervals**: If polling is used as a fallback, add random jitter (0-30s) to prevent thundering herd. The existing `calculateBackoff` in `playerService.js` has this pattern -- reuse it.
5. **Weather API proxy**: Weather data should be fetched server-side per location (not per screen). 50 screens in Miami should result in 1 weather API call, not 50. Cache weather data in a `weather_cache` table keyed by `(location, units)` with TTL.

**Detection:**
- Monitor Supabase Realtime connection count in dashboard
- Monitor Google Sheets API usage in Google Cloud Console
- Add a `poll_count` metric per data source per hour to detect N+1 polling

**Phase mapping:** Architecture decision must be made in phase 1 (data source rendering pipeline design). Wrong choice here means rewriting the entire data flow later.

**Confidence:** HIGH (verified: existing `subscribeToClientDataSources` subscribes to ALL row changes per client, current `WeatherWidget` calls API directly from player)

---

### Pitfall 3: Google Sheets API Key Exposed in Client Bundle

**What goes wrong:** The current `googleSheetsService.js` (line 21) reads `VITE_GOOGLE_API_KEY` from environment. Any `VITE_` prefixed variable is bundled into the client JavaScript by Vite. This API key is visible in browser DevTools to any user. An attacker extracts the key and makes unlimited Google Sheets API calls billed to BizScreen's project.

**Why it happens:** The Google Sheets fetch currently runs client-side in the browser (line 82-83 in `googleSheetsService.js` calls `fetch()` directly to `sheets.googleapis.com`). This is the "quick path" for the management UI to test sheet connectivity. But it means the API key must be in the client bundle.

**BizScreen-specific risk:** The `VITE_OPENWEATHER_API_KEY` (line 10 of `weatherService.js`) has the same exposure. Both keys are in the production bundle. The Google Sheets API has a default quota of 300 read requests per minute per project. An attacker can exhaust this quota, breaking sync for ALL BizScreen tenants.

**Consequences:**
- API key abuse and potential billing charges
- Google Sheets quota exhaustion blocks all tenant syncs
- OpenWeatherMap key abuse (free tier: 1000 calls/day, paid: varies)
- Security audit failure for any enterprise customer

**Prevention:**
1. Move ALL external API calls to Supabase Edge Functions. The Edge Function receives `{sheetId, range}`, calls Google Sheets API with a server-side key, returns data to client.
2. Remove `VITE_GOOGLE_API_KEY` and `VITE_OPENWEATHER_API_KEY` from client env. Replace with `GOOGLE_API_KEY` and `OPENWEATHER_API_KEY` in Supabase Edge Function secrets.
3. The `syncDataSourceFromSheet()` function should call an Edge Function, not `fetch()` to `sheets.googleapis.com` directly.
4. For weather, create an Edge Function `/weather?location=Miami&units=imperial` that caches responses in a Supabase table with 30-minute TTL.
5. Apply per-tenant rate limiting in the Edge Function to prevent one tenant from exhausting shared quotas.

**Detection:**
- Search production bundle for `googleapis.com` or `openweathermap.org` URLs
- Search for `VITE_GOOGLE_API_KEY` in `.env` files
- `grep -r "import.meta.env.VITE_GOOGLE" src/` confirms client exposure

**Phase mapping:** Must be addressed BEFORE shipping any external data integration to production. Can be a dedicated "API security" task in phase 1 or 2.

**Confidence:** HIGH (verified: line 21 of `googleSheetsService.js` uses `import.meta.env.VITE_GOOGLE_API_KEY`)

---

### Pitfall 4: Data Source Widget Rendering Blocks Scene Transitions

**What goes wrong:** Player displays a playlist with 5 items. Item 3 has a data source widget (e.g., menu board from Google Sheets). The widget takes 3-8 seconds to fetch and resolve data bindings. During this time, the screen shows a loading spinner or blank area. The "duration" timer for the playlist item starts counting before data is loaded, so the item transitions away before the user sees the content.

**Why it happens:** The current `ZonePlayer.jsx` (line 71) starts a duration timer immediately: `const duration = (currentItem.duration || 10) * 1000; timerRef.current = setTimeout(advanceToNext, duration)`. This timer does not wait for widget data to load. The `useAppData` hook (line 29-72 of `AppRenderer.jsx`) fetches data asynchronously. If data takes 5 seconds and duration is 10 seconds, the user sees content for only 5 seconds. If duration is 8 seconds, the user sees it for 3 seconds. If the data fetch fails, they see nothing.

**BizScreen-specific risk:** The current player architecture treats all content items as "ready immediately" -- images and videos are pre-cached via `cacheMultipleMedia()`, but data widget content is fetched at render time. There is no "ready" signal from widgets back to the player.

**Consequences:**
- Menu boards flash briefly or not at all in playlists
- Data tables appear empty for half their display duration
- Users complain content "doesn't show" when it actually shows but transitions too quickly
- Countdown timers start with wrong values because they load after the display starts

**Prevention:**
1. Add a `onReady` callback to all data widgets. Widget calls `onReady()` only after data is loaded or cache hit.
2. `ZonePlayer` should not start the duration timer until the content signals ready.
3. Pre-fetch data bindings during the scene/playlist prefetch phase (in `fetchAndCacheScene()`) so data is in IndexedDB before the item displays.
4. Set a maximum "ready timeout" (e.g., 5 seconds). If widget data doesn't load in time, start the timer anyway with cached/fallback data.
5. For playlists, consider "look-ahead prefetching" -- when item N is playing, prefetch data for item N+1.

**Detection:**
- Visual testing: create a playlist with image + data widget items, observe transition timing
- The data widget should appear fully populated from frame 1 of its display slot

**Phase mapping:** Must be designed into the widget rendering pipeline. Retrofitting a ready-signal protocol into existing widgets is straightforward, but the `ZonePlayer` timer logic needs modification early.

**Confidence:** HIGH (verified: `ZonePlayer.jsx` line 71 starts timer unconditionally, no ready signal exists)

---

### Pitfall 5: RSS/Social Feed Content Moderation Gap

**What goes wrong:** A customer connects their Instagram feed to display on a lobby TV. An employee posts something inappropriate to the Instagram account. Within the next sync cycle (default 20 minutes per `socialFeedSyncService.js` line 26), the inappropriate content appears on the public-facing TV. The customer had no chance to review it.

**Why it happens:** The `socialFeedSyncService.js` already has moderation infrastructure (`moderatePost`, `getModerationQueue`). But the current `SocialFeedRenderer.jsx` (player-side) fetches ALL cached posts for an account without checking moderation status (line 28-34: `select('*').eq('account_id', ...).order('posted_at')`). The moderation table exists but is not joined or filtered in the player query.

**BizScreen-specific risk:** The moderation system exists in the schema but is not enforced in the player rendering path. The `social_feed_settings` table has widget config but no "require approval" flag that the player checks. This creates a false sense of security -- admins see moderation UI but it does not actually prevent unapproved content from appearing.

**Consequences:**
- Inappropriate social media content displayed on public screens
- Brand reputation damage for BizScreen customers
- Legal liability (especially in healthcare, education, government verticals)
- Customer trust erosion when "moderation" feature doesn't actually moderate

**Prevention:**
1. Add a `moderation_mode` field to `social_feed_settings`: `none` (show all), `auto_approve` (show unless explicitly rejected), `manual_approve` (show only explicitly approved)
2. Modify the player's `fetchCachedPosts()` to join with `social_feed_moderation` and filter based on `moderation_mode`
3. For RSS feeds (new feature), default to `auto_approve` with content filtering (strip HTML, check for blocked keywords)
4. Add a `content_filter` field to widget settings for basic keyword blocking
5. For Google Reviews, only show reviews above a configurable star threshold (e.g., >= 4 stars)

**Detection:**
- Audit: post something with a profanity to a connected social account, verify it does NOT appear on the player
- Check that the `social_feed_moderation` table is actually queried in the player path

**Phase mapping:** Must be addressed when implementing social feed rendering on the player. Do not ship social feeds without enforced moderation.

**Confidence:** HIGH (verified: `SocialFeedRenderer.jsx` fetches all posts without moderation join)

---

## Moderate Pitfalls

Issues that cause significant user experience problems or engineering rework but not catastrophic failures.

---

### Pitfall 6: Tizen/WebOS Player Cannot Run setInterval Reliably

**What goes wrong:** Smart TV platforms (Tizen for Samsung, WebOS for LG) aggressively throttle background timers. A data source widget configured to refresh every 5 minutes stops refreshing after the TV goes into "low power" mode or when the app is not in the foreground webview. The player shows stale data indefinitely.

**Why it happens:** Smart TV web runtimes are based on older Chromium versions with aggressive power management. `setInterval` timers may be throttled to once per minute (or paused entirely) when the webview is considered "background." The current `WeatherWidget.jsx` uses `setInterval(fetchWeatherData, 10 * 60 * 1000)` (line 93). The `ClockWidget.jsx` uses `setInterval(() => setTime(new Date()), 1000)` (line 47). These work in Chrome but may drift or stall on TV platforms.

**BizScreen-specific risk:** BizScreen targets WebOS, Tizen, Android, iOS, and web. The player codebase is shared across platforms. Timer-based polling that works on web/Android may silently fail on smart TVs. The `offlineService.js` heartbeat (30-second interval, line 69) has the same risk.

**Prevention:**
1. Use `requestAnimationFrame` + timestamp comparison for clock widgets instead of `setInterval`. Check elapsed time each frame; update display when >= 1 second has passed.
2. For data polling, use `visibilitychange` event to detect when the webview is restored, then immediately refresh all stale data.
3. Implement a "watchdog" pattern: each widget records its last refresh timestamp. A master timer checks every 30 seconds if any widget's last refresh exceeds its configured interval. If so, force refresh.
4. For Tizen specifically: use Tizen Web API `tizen.alarm` for reliable scheduled callbacks that survive low-power states.
5. For WebOS: use `webOSServiceBridge` for system-level timers if available.
6. Add platform detection in the player and log timer reliability metrics (expected vs actual refresh intervals).

**Detection:**
- Deploy a data source widget with 5-minute refresh to a Tizen TV
- Leave it running for 24 hours
- Check if refresh count matches expected (288 refreshes) or is lower

**Phase mapping:** Address when implementing configurable polling refresh. Platform-specific timer workarounds can be a dedicated task.

**Confidence:** MEDIUM (based on domain knowledge of smart TV platform limitations; not verified against BizScreen's specific Tizen/WebOS deployment)

---

### Pitfall 7: Data Source Schema Changes Break Player Rendering

**What goes wrong:** Admin has a Google Sheet with columns "Item, Price, Description" powering a menu board. Admin renames "Price" to "Cost" in the sheet. Next sync updates the field names in `data_source_fields`. But the scene's data bindings reference `price` (the old field name). The menu board now shows blank price values.

**Why it happens:** Data bindings in scenes are stored as part of `design_json` with references like `{sourceId: "abc", field: "price"}`. These are string references to field names. When the Google Sheets sync runs `generateFieldDefinitions()` (line 210 of `googleSheetsService.js`), it creates new field definitions from headers. If a header changes, the old field name is gone. The `resolveMultipleBindings()` function (line 846 of `dataSourceService.js`) silently returns empty for unmatched fields.

**BizScreen-specific risk:** The `syncDataSourceFromSheet()` function replaces ALL rows and potentially updates field definitions. There is no mapping between old and new field names. The `detectChangedRows()` function checks row-level changes but does not detect schema (column rename/remove) changes. The `sync_data_source_rows` RPC takes `p_field_definitions` which may create new fields without preserving old ones.

**Consequences:**
- Menu boards show blank values after sheet column rename
- No error is surfaced -- the binding silently resolves to empty string
- Admin does not know their screen content is broken until someone physically looks at the TV
- Data source shows "ok" sync status even though bindings are broken

**Prevention:**
1. Store binding by field ID (UUID), not field name. Field name changes should not break bindings.
2. If field names must be used (for simplicity), implement a "field rename" detection: when sync detects a column name change (same position, different name), auto-create a field alias mapping.
3. Add a `validate_data_bindings` RPC that checks all scenes using a data source for broken field references. Run this after every sync.
4. Surface broken binding warnings in the DataSourcesPage UI: "Warning: 3 scenes reference field 'price' which no longer exists."
5. Add an `orphaned_bindings` alert type to the alert engine (`alertEngineService`).
6. On the player side: if a binding resolves to empty but the field was previously non-empty, log a warning and show the last cached value instead of blank.

**Detection:**
- Rename a column in a linked Google Sheet
- Verify the player shows stale data (cached) rather than blank
- Verify the admin UI shows a warning about broken bindings

**Phase mapping:** Address during data source sync implementation. The field-alias approach is lower effort than switching to UUID-based bindings.

**Confidence:** HIGH (verified: bindings use field name strings, sync replaces field definitions)

---

### Pitfall 8: Countdown Widget Timezone Mismatch

**What goes wrong:** Admin in New York creates a countdown to "Store Opening: March 1, 2026 9:00 AM." Screen is in Los Angeles. The countdown shows 3 hours too early because the target time was stored in EST but rendered in PST without conversion. The event appears to start at 6 AM LA time.

**Why it happens:** JavaScript `new Date("2026-03-01T09:00:00")` without timezone offset uses the browser's local timezone. The admin's browser is EST. The stored date lacks timezone info. The player in PST interprets it as 9 AM PST. There is no standardized timezone handling in BizScreen's widget system.

**BizScreen-specific risk:** BizScreen screens can be deployed globally. The existing `ClockWidget.jsx` uses `new Date()` (line 42) which shows the player device's local time -- correct for a clock, but countdown targets must account for the intended timezone. The `WeatherWallConfigModal.jsx` has no timezone field. The `ZonePlayer.jsx` receives a `timezone` prop (line 12) but widgets don't consume it.

**Consequences:**
- Countdown timers end at wrong times for screens in different timezones
- "Happy Hour starts in..." shows negative time in some timezones
- Event promotions display wrong durations
- Clock widget may be correct (showing local time) but countdown disagrees with clock

**Prevention:**
1. Always store countdown target dates as ISO 8601 with timezone: `2026-03-01T09:00:00-05:00`
2. Pass the screen's configured timezone (from `ZonePlayer`'s `timezone` prop) to all time-based widgets
3. Countdown widget should calculate difference between `now` and target in absolute UTC time, not local time
4. Add a "timezone" selector to countdown widget configuration: "Event timezone: [auto/specific]"
5. For clocks: continue using device local time (correct behavior) but display the timezone name if configured
6. For weather: location determines timezone implicitly, so this is less of a concern

**Detection:**
- Create a countdown to an event 1 hour from now in a specific timezone
- View it on a device in a different timezone
- Verify the countdown shows the correct remaining time

**Phase mapping:** Address when implementing the countdown timer widget. Simple to get right if timezone is included from the start, painful to retrofit.

**Confidence:** HIGH (verified: `ZonePlayer` receives `timezone` prop but no widget uses it; `ClockWidget` uses `new Date()` without timezone awareness)

---

### Pitfall 9: RSS Feed HTML Injection on Player

**What goes wrong:** A malicious or poorly-formed RSS feed contains `<script>` tags, `<iframe>` elements, or CSS injection in its `description` or `content:encoded` fields. The player renders this HTML directly, executing arbitrary JavaScript on the signage screen. An attacker can display anything, redirect the player, or exfiltrate device information.

**Why it happens:** RSS feeds contain HTML-formatted content by design. The `<description>` and `<content:encoded>` fields frequently include formatting tags. A naive implementation uses `dangerouslySetInnerHTML` to render rich RSS content. Without sanitization, this is a direct XSS vector.

**BizScreen-specific risk:** BizScreen already has XSS prevention (per `PROJECT.md`), but the RSS rendering pipeline is NEW and may not go through the same sanitization. The social feed renderer (`SocialFeedRenderer.jsx`) only displays `content_text` (pre-sanitized during sync). RSS is different -- content is rendered directly from the feed XML.

**Consequences:**
- Arbitrary code execution on player devices
- Screen takeover (display attacker content)
- Data exfiltration (device ID, screen ID, tenant info accessible via Supabase client)
- If player runs as a kiosk app with elevated permissions, broader device compromise

**Prevention:**
1. Use DOMPurify to sanitize ALL RSS content before rendering. Strip `<script>`, `<iframe>`, `<object>`, `<embed>`, event handlers (`onclick`, `onerror`, etc.)
2. Render RSS content in a sandboxed `<iframe>` with `sandbox="allow-same-origin"` (no `allow-scripts`)
3. Server-side: sanitize RSS content during the sync/fetch phase (Edge Function), not on the player
4. Apply Content Security Policy headers on the player page to prevent inline script execution
5. Use a whitelist approach for allowed HTML tags: `<p>`, `<br>`, `<strong>`, `<em>`, `<img>`, `<a>`, `<ul>`, `<li>`
6. For `<img>` tags in RSS content: proxy through BizScreen's media pipeline to prevent tracking pixels and mixed content

**Detection:**
- Create a test RSS feed with `<script>alert('xss')</script>` in the description
- Verify it renders as text, not as executable script
- Run OWASP ZAP or similar scanner against the player with RSS widget

**Phase mapping:** Must be addressed BEFORE shipping RSS feed rendering. This is a security requirement, not a polish item.

**Confidence:** HIGH (RSS feeds inherently contain HTML; the rendering pipeline does not exist yet and must be built with sanitization from day one)

---

### Pitfall 10: Realtime Subscription Memory Leaks on Long-Running Player

**What goes wrong:** Player runs for 30 days without restart (common for signage). During that time, data source subscriptions accumulate. Each schedule change, playlist reassignment, or data source link creates new Supabase Realtime channels. Old channels are not properly cleaned up. The player's WebSocket connection becomes unstable, memory usage grows, and eventually the player crashes or stops receiving updates.

**Why it happens:** The `subscribeToDataSource` function (line 1155 of `dataSourceService.js`) creates TWO channels per data source (row changes + metadata changes). The `subscribeToClientDataSources` function creates one channel per client. If the player switches between playlists or screens are reassigned, old subscriptions may not be `unsubscribe()`d. React's `useEffect` cleanup helps but is fragile -- if the component unmounts unexpectedly (error boundary, hot reload), cleanup may not run.

**BizScreen-specific risk:** The player already uses Supabase Realtime for heartbeat and content update notifications. Adding data source subscriptions multiplies the channel count. Supabase JS client v2 has a known pattern where `removeChannel()` can leave internal state if the channel is in a `joining` state when removed. The `offlineService.js` module-level state (`offlineListeners` array, line 79) could also leak if listeners are added without removal.

**Consequences:**
- Player memory usage grows 1-5MB per day due to leaked subscriptions
- After 1-2 weeks, player becomes sluggish or crashes
- WebSocket reconnection storms as stale channels try to rejoin
- Missed data updates because the "active" channel is actually a zombie

**Prevention:**
1. Implement a subscription manager singleton in the player that tracks all active channels. Maximum one subscription per data source per player.
2. Before creating a new subscription, check if one already exists for that data source. If so, reuse it.
3. Add a periodic cleanup (every hour): list all Supabase channels, remove any that are not for currently-displayed data sources.
4. Use a single "player updates" channel per screen (not per widget). Server pushes change notifications. Player fetches only what changed.
5. Monitor channel count in the player diagnostics (extend `getOfflineServiceInfo()`).
6. Add a `maxChannels` guard: if the player has > 20 active channels, log a warning and remove the oldest non-essential ones.

**Detection:**
- Log `supabase.getChannels().length` every 5 minutes on a long-running player
- If count increases over time without corresponding content changes, there is a leak
- Monitor player memory usage in Chrome DevTools over 24+ hours

**Phase mapping:** Address when implementing real-time data push to player. The subscription manager should be built as foundational infrastructure.

**Confidence:** HIGH (verified: existing subscription functions create multiple channels per call, no centralized subscription lifecycle management exists)

---

## Minor Pitfalls

Issues that cause developer friction, edge-case bugs, or suboptimal UX but are recoverable.

---

### Pitfall 11: CSV/Google Sheets Data Exceeds Widget Rendering Capacity

**What goes wrong:** Admin links a Google Sheet with 5,000 rows to a "scrolling menu" widget. The widget tries to render all 5,000 items. On a low-powered Tizen TV with 1GB RAM, the browser tab crashes. Even on capable hardware, scrolling through 5,000 items on a signage screen makes no visual sense.

**Prevention:**
1. Enforce a `max_rows` limit per data source widget (configurable, default 100).
2. The `fetchSheetData` function already fetches up to `A1:Z1000` (line 71 of `googleSheetsService.js`). This is the server-side limit. Add a player-side display limit.
3. For scrolling/rotating widgets, paginate: show 10 items at a time, rotate through pages.
4. Show a warning in DataSourcesPage when a data source exceeds 500 rows: "Large data sources may affect player performance."

**Phase mapping:** Address during widget rendering implementation. Simple guard.

---

### Pitfall 12: Weather API Location Resolution Ambiguity

**What goes wrong:** Admin types "Springfield" as the weather location. There are 34 Springfields in the US. OpenWeatherMap returns the most "popular" one, which may not be the correct one. The screen in Springfield, IL shows weather for Springfield, MA.

**Prevention:**
1. Use coordinate-based weather lookup (existing `getWeatherByCoords`) instead of city name when possible.
2. The `WeatherWallConfigModal.jsx` already supports coordinate input ("51.5074,-0.1278" per line 339). Make this the primary method.
3. Add a location autocomplete/picker that resolves to coordinates during configuration.
4. For `usePlayerLocation: true`, use the screen's configured location (lat/lon from the screens table) rather than browser geolocation.

**Phase mapping:** Address during weather widget configuration enhancement. Not blocking for initial release.

---

### Pitfall 13: Social Feed Image CDN URLs Expire

**What goes wrong:** Instagram/Facebook media URLs (from the Graph API) are CDN URLs with expiration tokens. After 24-72 hours, the URL returns 403. The `social_feeds` table stores the original CDN URL. The player requests the image, gets 403, shows a broken image icon.

**Prevention:**
1. During social feed sync, download media to BizScreen's own storage (Supabase Storage / S3).
2. Store a permanent BizScreen URL in `social_feeds.media_url` instead of the CDN URL.
3. If storage is a concern, at minimum re-fetch and cache URLs during each sync cycle.
4. The `SocialFeedRenderer` should handle 403/404 on images gracefully -- show a placeholder instead of a broken icon.

**Phase mapping:** Address during social feed sync implementation. Must be solved before production social feeds.

**Confidence:** HIGH (Instagram CDN URL expiration is well-documented behavior)

---

### Pitfall 14: Multiple Data Sources Create Conflicting Realtime Channels

**What goes wrong:** A scene uses data from 3 different data sources. Each data source has its own Realtime subscription channel. When data source A updates, the player re-renders. During re-render, it also re-fetches data sources B and C unnecessarily. If B or C are mid-update, the player gets partial data and displays an inconsistent state (e.g., item names from version 1 with prices from version 2).

**Prevention:**
1. Batch data source resolution: when any data source updates, fetch ALL bound data sources for the scene in a single RPC call.
2. Use the existing `resolveMultipleBindings` function but wrap it in a debounce (300ms) so multiple rapid updates collapse into one fetch.
3. Apply the data atomically: only update the rendered widgets when ALL bound data is resolved, not one binding at a time.

**Phase mapping:** Address during data binding rendering pipeline. Design the update path to be atomic from the start.

---

### Pitfall 15: Configurable Poll Interval UI Allows Dangerous Values

**What goes wrong:** Admin sets the poll interval for a Google Sheet to 1 minute. The Google Sheets API allows 300 read requests per minute per project. If 5 data sources are set to 1-minute polling, and the sync job processes them all, that is 5 reads per minute for THIS tenant. With 60 tenants, that is 300 reads/minute -- the exact quota limit. One more tenant tips the system over.

**Prevention:**
1. Enforce a minimum poll interval of 5 minutes in the UI (already in the dropdown: 5/10/15/30/60 per `DataSourcesPage.jsx` line 1229).
2. Enforce the same minimum server-side in the `link_data_source_to_google_sheets` RPC.
3. For free-tier tenants, enforce 15-minute minimum. Allow 5 minutes only for paid plans.
4. Add a global rate limiter in the sync Edge Function: maximum N Google Sheets API calls per minute across all tenants. Queue excess requests.
5. Display estimated API usage to admin: "5 data sources x 5 min interval = 60 API calls/hour."

**Phase mapping:** Address during data source configuration and sync implementation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|---|---|---|---|
| Data source widget rendering on player | P1 (offline cache), P4 (render blocking), P7 (schema breaks) | Critical | Build widget data cache into IndexedDB before rendering any widgets; implement ready-signal protocol |
| Google Sheets sync pipeline | P3 (API key exposure), P15 (poll interval abuse) | Critical | Move to Edge Functions before production; enforce server-side rate limits |
| Social/RSS feed display | P5 (moderation gap), P9 (XSS), P13 (CDN expiry) | Critical | Sanitize all external content server-side; enforce moderation in player query; re-host media |
| Weather/clock/countdown widgets | P6 (timer throttling), P8 (timezone), P12 (location ambiguity) | Moderate | Use coordinate-based lookup; store dates with timezone; implement timer watchdog |
| Configurable polling refresh | P2 (N*M polling), P10 (subscription leaks) | Critical | Push-based architecture; single channel per screen; subscription manager singleton |
| Cross-platform player testing | P6 (Tizen/WebOS timers), P11 (large datasets on low RAM) | Moderate | Platform-specific testing required; enforce display limits for large data sources |

---

## Integration Risks with Existing BizScreen Architecture

### Risk 1: cacheService.js IndexedDB Schema Migration

Adding a `widgetData` store to IndexedDB requires incrementing `DB_VERSION` (currently 1, line 19 of `cacheService.js`). The `upgrade` handler must handle migration from version 1 to 2 without losing existing cached scenes/media. If the upgrade handler is wrong, the IndexedDB is destroyed and screens lose their offline cache.

**Mitigation:** Test the upgrade handler by creating a version-1 DB with cached data, then upgrading. Verify all existing stores are preserved.

### Risk 2: AppRenderer.jsx useAppData Hook Architecture

The current `useAppData` hook in `AppRenderer.jsx` uses `sessionStorage` (volatile) and a generic fetch URL. For data source widgets, this hook needs to be extended or replaced with one that:
- Reads from IndexedDB (not sessionStorage)
- Subscribes to Realtime updates (not just polling)
- Handles binding resolution (not just raw data fetch)

The existing hook is a good starting point but will need significant modification.

### Risk 3: Player Bundle Size on Smart TVs

Each new widget type adds to the player's JavaScript bundle. Smart TVs have limited CPU and memory. Adding React components for weather, social feed, data table, RSS, countdown, and clock -- with their supporting libraries (DOMPurify for RSS, date-fns for timezones) -- could push the player bundle beyond comfortable limits for Tizen/WebOS.

**Mitigation:** Code-split widget components. Only load the widget renderers that a screen actually needs (based on its assigned content). The existing player architecture loads all widget types eagerly.

### Risk 4: RLS on Data Source Access from Player

The player authenticates as an anonymous or service-role user. Data sources are scoped to `client_id` via RLS. The player must pass the correct `client_id` context when querying data source rows. The existing `subscribeToClientDataSources` function (line 1221) verifies `client_id` in a callback, which is correct but adds a round-trip. For the initial data fetch, ensure the RPC uses `p_screen_id` to resolve the correct tenant context server-side.

---

## Sources

All findings are based on direct codebase analysis of the following files:

- `/Users/massimodamico/bizscreen/src/services/dataSourceService.js` -- data source CRUD, bindings, subscriptions
- `/Users/massimodamico/bizscreen/src/services/googleSheetsService.js` -- Google Sheets sync, API key usage
- `/Users/massimodamico/bizscreen/src/services/weatherService.js` -- weather API, in-memory cache
- `/Users/massimodamico/bizscreen/src/services/socialFeedSyncService.js` -- social feed sync, moderation
- `/Users/massimodamico/bizscreen/src/components/SocialFeedWidget.jsx` -- social feed editor widget
- `/Users/massimodamico/bizscreen/src/components/player/SocialFeedRenderer.jsx` -- social feed player renderer
- `/Users/massimodamico/bizscreen/src/player/components/widgets/WeatherWidget.jsx` -- weather player widget
- `/Users/massimodamico/bizscreen/src/player/components/widgets/ClockWidget.jsx` -- clock player widget
- `/Users/massimodamico/bizscreen/src/player/components/AppRenderer.jsx` -- app rendering with useAppData hook
- `/Users/massimodamico/bizscreen/src/player/components/ZonePlayer.jsx` -- zone playback with duration timers
- `/Users/massimodamico/bizscreen/src/player/offlineService.js` -- offline detection, service worker, sync
- `/Users/massimodamico/bizscreen/src/player/cacheService.js` -- IndexedDB cache with LRU eviction
- `/Users/massimodamico/bizscreen/src/player/hooks/usePlayerContent.js` -- content loading with retry
- `/Users/massimodamico/bizscreen/src/pages/DataSourcesPage.jsx` -- data source management UI
- `/Users/massimodamico/bizscreen/src/components/apps/WeatherWallConfigModal.jsx` -- weather config UI

Confidence levels are based on direct code verification (HIGH) or domain knowledge without specific platform testing (MEDIUM).
