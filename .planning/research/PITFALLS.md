# Domain Pitfalls: Player Hardening Features

**Domain:** Adding screenshot capture, auto-recovery, content verification, diagnostic telemetry, and alert tuning to existing digital signage player
**Researched:** 2026-02-19
**Scope:** BizScreen -- React player running in browser/webview across 5 platforms (web, Android, iOS, WebOS, Tizen), Supabase backend with RLS, existing 30s heartbeat, IndexedDB offline cache, S3/CloudFront media, Sentry error monitoring, html2canvas screenshot capture
**Confidence:** MEDIUM -- Based on deep codebase analysis and domain expertise; web search unavailable for verification of platform-specific claims

---

## Critical Pitfalls

Mistakes that cause player downtime on deployed devices, data loss, or cascading failures across the fleet.

---

### Pitfall 1: Auto-Recovery Infinite Restart Loop

**What goes wrong:** The existing `useStuckDetection.js` calls `window.location.reload()` when the page is inactive for 5 minutes (`maxNoActivityMs: 300000`). If the root cause of inactivity is a persistent error (bad content JSON, corrupt cache, unreachable Supabase endpoint), the page reloads, hits the same error, goes inactive again, and reloads indefinitely. On low-power signage hardware (WebOS, Tizen), this creates a visible reload flash every 5 minutes and exhausts device memory as each reload leaks browser resources that the constrained garbage collector cannot reclaim.

**Why it happens:** The current `onPageStuck` callback in `ViewPage.jsx` (line 186) does a hard reload with zero state tracking:
```javascript
onPageStuck: () => {
  logger.warn('Player inactive for too long, reloading...');
  window.location.reload();
}
```
There is no mechanism to detect that the reload is happening repeatedly, no exponential backoff between reloads, and no fallback behavior after N failed recovery attempts.

**Consequences:**
- **Visible flashing:** Customer sees white screen flashing every 5 minutes on their lobby display.
- **Memory exhaustion:** WebOS LG panels and older Tizen Samsung displays have 512MB-1GB RAM. Each reload without proper cleanup fragments memory. After 10-20 cycles, the browser process is killed by the OS watchdog, leaving a black screen until manual power cycle.
- **Heartbeat spam:** Each reload sends an immediate heartbeat (line 95 of `usePlayerHeartbeat.js`), content fetch, screenshot check, PIN hash fetch, and analytics init. A fleet of 100 devices in a restart loop generates 100 concurrent bursts every 5 minutes against Supabase.
- **Alert storm:** Each restart cycle triggers device_offline -> device_online transitions, flooding the alerts table and notification system.

**Prevention:**
- Track restart count in `localStorage` with a timestamp. Before executing `window.location.reload()`, check: if more than 3 reloads in the last 30 minutes, stop reloading and display a static "device needs attention" screen instead.
- Implement exponential backoff between reloads: 5 min, 10 min, 20 min, capped at 60 min.
- On recovery after multiple failures, clear IndexedDB cache before reloading (the cached content may be the cause).
- Add a `recovery_attempts` counter to the heartbeat payload so the dashboard shows which devices are in a restart loop.

**Detection:**
- `localStorage.getItem('player_restart_count')` exists and is > 3.
- Dashboard shows a device alternating between online/offline every few minutes.
- Sentry shows repeated `Player inactive for too long, reloading...` warnings from the same device.

**Phase assignment:** Must be the first thing addressed in the auto-recovery phase. All other recovery features depend on not having an infinite loop as the foundation.

---

### Pitfall 2: html2canvas Fails Silently on WebOS and Tizen

**What goes wrong:** The existing `screenshotService.js` uses `html2canvas` to capture the DOM. On WebOS (LG signage) and Tizen (Samsung signage), `html2canvas` frequently fails or produces blank/corrupt images because:

1. **WebGL/Canvas limitations:** WebOS 3.x-5.x and Tizen 3.x-5.x have incomplete Canvas 2D implementations. `html2canvas` uses `CanvasRenderingContext2D.drawImage()` to composite layers, but the hardware-accelerated canvas on these platforms sometimes returns empty pixel data for cross-origin images (even with `useCORS: true`).
2. **Memory pressure during capture:** `html2canvas` clones the entire DOM, creates an offscreen canvas at the configured scale (currently 0.5x), and composites all elements. On a device playing 1080p video with 512MB RAM, this operation can trigger an out-of-memory kill of the canvas context, returning a blank canvas that converts to a tiny (200-500 byte) JPEG.
3. **Video frames not captured:** `html2canvas` cannot capture the current frame of a `<video>` element. The screenshot shows everything except the video, which appears as a black rectangle. For a signage player where video is the primary content, this makes screenshots useless for diagnostics.

**Why it happens:** The current code (line 40-50 of `screenshotService.js`) passes `allowTaint: true` and `useCORS: true` but does not handle the case where the canvas is blank or undersized. The `captureScreenshot` function returns whatever blob `canvas.toBlob` produces, even if it is effectively empty.

**Consequences:**
- Dashboard shows "last screenshot" that is a black rectangle or a blank white image, providing zero diagnostic value.
- Operators waste time investigating "broken screens" that are actually working fine -- the screenshot just did not capture properly.
- After 2 consecutive failures, `screenshotService.js` raises a `DEVICE_SCREENSHOT_FAILED` alert (line 201), creating noise for a problem that is not actually a device failure but a capture limitation.
- Screenshot storage fills with useless blank images consuming Supabase Storage quota.

**Prevention:**
- **Validate screenshot before upload:** After `canvas.toBlob()`, check the blob size. A valid 1920x1080 JPEG at 0.5x scale (960x540) should be 30KB-200KB. If the blob is under 5KB, it is almost certainly blank. Discard and skip rather than upload.
- **Capture video frames separately:** Use `videoElement.captureStream()` or draw the video frame directly onto a canvas with `ctx.drawImage(videoRef.current, 0, 0)` before compositing with the html2canvas output. This requires merging two canvases: one from html2canvas (UI layer) and one from the video element.
- **Platform-specific fallback:** On WebOS and Tizen, skip html2canvas entirely and use the native WebOS `window.PalmSystem?.screenCapture()` or Tizen `tizen.systeminfo` screenshot APIs if available. These capture the actual display output including video frames.
- **Reduce capture frequency on constrained devices:** Detect device type from user agent. On WebOS/Tizen, only capture screenshots on explicit admin request (`needs_screenshot_update` flag), never on a timer. On web/Android/iOS, periodic capture is safe.
- **Add a minimum size check to the existing `cleanupOldScreenshots`** so it also purges screenshots under 5KB.

**Detection:**
- Query `device-screenshots` storage for files under 5KB -- these are blank captures.
- Screenshot age is always stale on WebOS/Tizen devices even though the device is online and responding to heartbeats.

**Phase assignment:** Screenshot hardening phase. Must address before enabling periodic screenshots fleet-wide, or the alert system will be overwhelmed with false positives.

---

### Pitfall 3: Telemetry Volume Overwhelms Supabase Database

**What goes wrong:** The player already sends telemetry on multiple overlapping timers:
- **Heartbeat** every 30s (`usePlayerHeartbeat.js` -> `updateDeviceStatus` RPC)
- **Content polling** every 30s (`usePlayerContent.js` line 307 -> `getResolvedContent` RPC + `player_heartbeat` RPC)
- **Device refresh check** every heartbeat (`checkDeviceRefreshStatus` -> direct `tv_devices` query)
- **Command polling** (realtime WebSocket with polling fallback at 10s)
- **Playback tracking** flushes every 30s (`playbackTrackingService.js` CONFIG.FLUSH_INTERVAL_MS)
- **Data refresh orchestrator** ticks every 10s (`useDataRefreshOrchestrator.js`)
- **PIN hash fetch** every 30s in kiosk mode (line 209 of `ViewPage.jsx`)

Adding diagnostic telemetry (device metrics like CPU, memory, temperature, network stats) on top of this creates a situation where each device makes **8-12 Supabase calls every 30 seconds**. For a fleet of 500 devices, that is **8,000-12,000 requests per minute** against the database. Supabase Pro plan includes pooled connections (25 direct, 200 via Supavisor), and this volume will exhaust the connection pool, causing timeouts for both player devices AND admin dashboard users.

**Why it happens:** Each feature was added incrementally by different phases. The heartbeat, content polling, device refresh check, and command polling all evolved independently with their own timers. Nobody audited the total request volume per device per minute.

**Consequences:**
- **Connection pool exhaustion:** Supabase connection pool timeouts cascade -- when one request hangs, the next request queues, and within 60s the entire pool is blocked. Admin users see "connection timeout" when trying to load the dashboard.
- **Database CPU saturation:** Each `get_resolved_player_content` RPC joins 5+ tables. At 500 devices x 2 calls/min = 1,000 complex queries/min. This competes with admin CRUD operations.
- **Supabase billing spike:** Supabase bills on database compute time and bandwidth. Telemetry is read-heavy (heartbeats update one row then read back), and at fleet scale the egress costs multiply.
- **Battery drain on Android/iOS players:** Frequent network calls prevent the device from entering low-power mode, draining battery on tablet-based signage.

**Prevention:**
- **Consolidate into a single heartbeat RPC:** Create one `player_heartbeat_v2` RPC that accepts a JSONB payload containing: device status, content hash, metrics snapshot, screenshot status, and recent playback events. Call it every 30s. Kill the separate content poll, device refresh check, and PIN hash fetch timers.
- **Batch telemetry writes:** Instead of flushing playback events every 30s, accumulate locally and flush every 5 minutes (or when the queue hits 50 events). The existing `playbackTrackingService.js` already has this pattern but the `FLUSH_INTERVAL_MS` of 30s is too aggressive for fleet scale.
- **Use Supabase realtime channels instead of polling:** The existing realtime subscription for commands (`subscribeToDeviceCommands`) is correct. Extend this pattern to content updates and screenshot requests, eliminating 2 polling endpoints per device.
- **Add server-side telemetry aggregation:** Instead of storing raw heartbeats, use a PostgreSQL function that updates an `device_metrics_hourly` rollup table. Only keep the last 24h of raw heartbeats; aggregate older data into hourly/daily summaries.
- **Implement adaptive polling intervals:** If the device has not had a content change in 30 minutes, back off content polling to every 5 minutes. Resume 30s polling on realtime event or on admin dashboard visit.

**Detection:**
- Supabase dashboard shows sustained database CPU > 50% during business hours.
- `pg_stat_activity` shows more than 20 concurrent connections from the `anon` role (player devices).
- Player logs show increasing `Heartbeat error` or `Polling error` entries.
- Admin dashboard becomes sluggish during peak device hours.

**Phase assignment:** Telemetry phase must consolidate the heartbeat BEFORE adding new diagnostic metrics. Adding metrics to the existing fragmented polling architecture will make this pitfall materialize immediately.

---

### Pitfall 4: Content Verification Blocks Playback on Slow Networks

**What goes wrong:** Content verification (checking that media files are complete, not corrupted, and match server checksums) is added as a synchronous step before playback. The existing `checkSceneNeedsUpdate` in `offlineService.js` already calls the `check_if_scene_changed` RPC, but adding full media verification (downloading and checking checksums for all media in a playlist) on every content change can take 10-60 seconds on slow networks or with large playlists (20+ items, 100MB+ total media).

During this verification window, the screen shows either a loading spinner or the previous content (which may be outdated). If verification fails (network timeout, checksum mismatch on one item), the question becomes: play the unverified content, or show nothing?

**Why it happens:** Developers implement verification as a blocking pre-condition because it feels "safe" -- never play content that has not been verified. But signage has a different correctness priority than other software: **showing slightly stale content is always better than showing nothing**. A blank screen in a restaurant or hotel lobby is worse than showing yesterday's menu.

**Consequences:**
- **Extended blank screen windows:** On 3G/4G-connected signage (common in outdoor and retail), verification of a 20-item playlist with video takes 30-60 seconds. The screen is blank during this time, multiple times per day when content updates.
- **Verification failure = no content:** If even one media file fails checksum, strict verification rejects the entire content set. The player falls back to cache, but if the cache was already cleared (e.g., by a `clear_cache` command), the screen goes blank.
- **Memory pressure from parallel downloads:** Verifying by downloading all media into memory (even just for checksum) on a 512MB WebOS device can OOM the browser process.

**Prevention:**
- **Never block playback for verification.** Always play content immediately (from cache or fresh fetch), then verify in the background. If verification finds issues, log them and flag the specific items, but continue playing.
- **Verify lazily per-item:** Verify each media item just before it plays (e.g., during the previous item's display duration). If verification fails, skip to the next item and alert.
- **Use streaming checksums:** Instead of downloading the entire file to verify, use HTTP Range requests to check the first 64KB and last 64KB of each file. This catches truncated downloads (the most common corruption) without downloading the whole file.
- **Separate "can play" from "verified":** Content enters a `playable` state immediately on successful fetch. Verification upgrades it to `verified` state. The player always plays `playable` content. The dashboard shows verification status as an informational indicator, not a blocker.
- **Implement progressive verification:** Check the most important items first (currently playing item, next 3 items in playlist). Defer verification of items further in the queue.

**Detection:**
- Player logs show "Loading content..." for > 10 seconds between content transitions.
- Users report blank screens during content updates.
- Playback tracking shows gaps in scene playback events correlating with content change timestamps.

**Phase assignment:** Content verification phase. The architecture decision (blocking vs. background) must be made at the start of this phase. Getting this wrong requires a rewrite.

---

### Pitfall 5: Multi-Tenant Alert Noise Makes Alerts Useless

**What goes wrong:** The existing alert system (`alertEngineService.js`) already has rate limiting (5 alerts per device per minute) and coalescing (dedup open alerts). But adding screenshot failure alerts, content verification failure alerts, auto-recovery alerts, and telemetry gap alerts to the existing device_offline, cache_stale, and sync_failed alerts creates an alert volume where operators stop checking them entirely.

The current escalation rules (line 308-331 of `alertEngineService.js`) auto-escalate to CRITICAL after specific thresholds (30 min offline, 5 screenshot failures, etc.), but there is no mechanism to suppress low-value alerts when a higher-value alert already explains the root cause. For example: a device goes offline, which simultaneously triggers `device_offline`, `device_screenshot_failed` (because screenshots cannot be uploaded), `device_cache_stale` (because cache cannot be refreshed), and `data_source_sync_failed` (because RSS/weather cannot be fetched). One root cause produces 4+ alerts.

**Why it happens:** Each alert type was added by a different feature phase with its own raise/resolve logic. The alertEngineService handles dedup within a single alert type (coalescing), but does not correlate across alert types. Adding 3-5 new alert types for hardening features multiplies the cross-type correlation problem.

**Consequences:**
- **Alert fatigue:** Operators see 20 open alerts, most of which are symptoms of 2 root causes. They stop checking.
- **Real issues hidden:** A genuine content verification failure (corrupt media file) is buried among a flood of screenshot and telemetry alerts.
- **Notification spam:** The `dispatchAlertNotifications` function sends emails for new CRITICAL alerts. If a fleet-wide network outage triggers 500 device_offline + 500 screenshot_failed + 500 cache_stale alerts, that is up to 1,500 notification emails.
- **Database growth:** The alerts table grows unbounded. With 500 devices generating 5+ alert types each, the coalescing index (`idx_alerts_coalesce`) becomes a bottleneck because it must check for existing open alerts across 6 columns.

**Prevention:**
- **Implement root cause correlation:** When a device is offline, suppress all other alerts for that device. The `device_offline` alert is the root cause; screenshot, cache, and sync failures are expected consequences. Auto-resolve these symptom alerts when they are raised while a `device_offline` alert is already open.
- **Add alert grouping/hierarchy:** Define parent-child relationships between alert types. `device_offline` is a parent of `device_screenshot_failed`, `device_cache_stale`, and `data_source_sync_failed` for the same device. The dashboard shows the parent alert with a count of suppressed children.
- **Implement fleet-level dedup:** If more than 30% of devices in a screen group simultaneously go offline, raise a single "Network outage in [group]" alert instead of N individual device_offline alerts.
- **Add auto-close TTL:** Alerts in `open` status for more than 7 days are automatically archived/closed. Stale alerts provide no value and clutter the dashboard.
- **Tier notification channels by severity:** CRITICAL = email + in-app. WARNING = in-app only. INFO = dashboard only (no notification). Currently all levels dispatch through the same path.

**Detection:**
- Dashboard shows > 10 open alerts for the same device, all with similar timestamps.
- Operators report ignoring alerts or disabling email notifications.
- `alerts` table has > 10,000 rows within the first month.

**Phase assignment:** Alert tuning should be a dedicated sub-phase that happens AFTER all new alert types are defined but BEFORE enabling them in production. Shipping noisy alerts is worse than shipping no alerts.

---

## Moderate Pitfalls

Issues that cause degraded functionality, poor UX, or maintenance burden, but not outright failures.

---

### Pitfall 6: Screenshot Storage Costs Grow Linearly and Are Never Cleaned at Fleet Scale

**What goes wrong:** The existing `cleanupOldScreenshots` function (line 227 of `screenshotService.js`) keeps the last 5 screenshots per device. With 500 devices, that is 2,500 files. But the function is called by the player device itself on every screenshot capture, using `supabase.storage.list()` which is an expensive operation at scale. More importantly, if a device goes offline permanently (removed, replaced, lost), its screenshots are never cleaned up because the cleanup runs on the device.

**Why it happens:** Storage cleanup was designed for a small fleet (< 50 devices). The per-device cleanup approach does not account for decommissioned devices or storage growth over time.

**Prevention:**
- Implement server-side cleanup: a Supabase Edge Function or cron job that runs daily, listing all screenshot folders and deleting files older than 7 days AND files from devices that have been offline for > 30 days.
- Remove the per-device cleanup from the screenshot capture path (it adds latency and API calls to an already expensive operation).
- Set a Supabase Storage lifecycle policy on the `device-screenshots` bucket to auto-delete files older than 30 days.
- Track screenshot storage usage per tenant in the `usage_quotas` system (migration 056) and alert when approaching limits.

**Detection:**
- Supabase Storage dashboard shows `device-screenshots` bucket growing by > 1GB/month.
- `supabase.storage.list()` calls start timing out for devices with many screenshots.

**Phase assignment:** Screenshot phase. Add server-side cleanup alongside periodic capture, not as an afterthought.

---

### Pitfall 7: Stuck Detection Recovery Creates Visible Content Glitches

**What goes wrong:** The current video stuck recovery in `ViewPage.jsx` (line 177) resets the video to the beginning and calls `.play()`:
```javascript
onVideoStuck: () => {
  videoRef.current.currentTime = 0;
  videoRef.current.play().catch(...);
}
```
For page-level stuck recovery (line 186), it does a full page reload. Both approaches create a visible disruption: the video visibly restarts from the beginning, or the screen flashes white during reload. On a 4K lobby display, this is jarring.

**Why it happens:** Recovery prioritizes getting back to a working state as fast as possible, which is correct. But it does not consider minimizing the visual disruption of the recovery.

**Prevention:**
- For video stuck: instead of resetting to `currentTime = 0`, skip to the next playlist item. A stuck video is likely a codec or memory issue with that specific file; replaying it will likely get stuck again.
- For page stuck: instead of `window.location.reload()`, try a soft recovery first: re-mount the content components via React state change. Only escalate to a full reload if the soft recovery does not resolve within 10 seconds.
- Add a "recovery in progress" overlay: a simple black screen with the logo shown for 1-2 seconds during recovery, which looks intentional rather than broken.
- On WebOS and Tizen, perform recovery by destroying and recreating the video element rather than reloading the page. These platforms leak memory on reload, making the problem worse.

**Detection:**
- Playback tracking shows gaps of 1-3 seconds in scene playback that correlate with stuck detection logs.
- Users report "the screen blinks sometimes."

**Phase assignment:** Auto-recovery phase, when implementing the tiered recovery strategy.

---

### Pitfall 8: IndexedDB Quota Exceeded on Constrained Devices When Adding Diagnostic Data

**What goes wrong:** The existing `cacheService.js` allocates 500MB for media and 100MB for scenes (line 32-41). Adding diagnostic telemetry storage (device metrics history, screenshot queue for offline sync, error logs, content verification results) to IndexedDB pushes total storage demand toward or past the browser's IndexedDB quota. On WebOS (typically 50-100MB total quota for web storage) and Tizen (varies by model, 50-500MB), this can exceed the platform limit even without considering the existing 600MB media/scene allocation (which works because LRU eviction prevents actual usage from reaching the limit).

**Why it happens:** The `CACHE_LIMITS` in `cacheService.js` define soft limits enforced by JavaScript LRU eviction, not hard limits from the browser. The actual browser quota on constrained devices is much lower than the sum of configured limits. Adding new stores to IndexedDB adds entries that the existing eviction logic does not manage.

**Consequences:**
- `QuotaExceededError` thrown by IndexedDB, caught or uncaught, which can corrupt the database or prevent new entries.
- On some WebOS versions, exceeding quota causes the entire IndexedDB to become read-only until the app is restarted.
- Offline mode breaks: the player cannot cache new content because IndexedDB is full of diagnostic data.

**Prevention:**
- **Add diagnostic data to a separate IndexedDB database** with its own size limit (e.g., 10MB). This prevents diagnostic data from competing with content cache.
- **Implement global quota awareness:** Before writing, check `navigator.storage.estimate()` (where available) and compare remaining quota against the write size. Skip the write if quota is low.
- **Prioritize content cache over diagnostic cache:** If storage is tight, clear diagnostic data first, then old screenshots, then stale content. Never evict currently-playing content.
- **On WebOS/Tizen, reduce diagnostic storage to in-memory only** with periodic flush to server. Do not persist diagnostic data locally on constrained devices.
- **Size the existing `CACHE_LIMITS` dynamically:** Detect available storage at startup and set limits proportionally instead of using hardcoded 500MB/100MB values.

**Detection:**
- Player logs show "QuotaExceededError" or "Failed to cache content" errors.
- Devices lose offline capability even though they were previously caching successfully.

**Phase assignment:** Telemetry phase. Must be considered when designing the local telemetry storage schema.

---

### Pitfall 9: Supabase RLS Bypass via Player Screenshot/Telemetry Endpoints

**What goes wrong:** The player runs as the `anon` role (anonymous Supabase key). The existing `store_device_screenshot` and `update_device_status` functions use `SECURITY DEFINER` to bypass RLS, which is correct. But adding new telemetry endpoints (device metrics, content verification results, error reports) as `SECURITY DEFINER` functions without proper input validation allows any client with the public anon key to write arbitrary data to any device's records.

The existing `store_device_screenshot` (migration 075, line 69) takes a `p_device_id` and `p_screenshot_url` but does NOT verify that the caller is actually that device. Anyone with the public Supabase anon key can call `store_device_screenshot('any-device-id', 'https://evil.com/image.jpg')` and overwrite another device's screenshot.

**Why it happens:** `SECURITY DEFINER` functions run as the function owner (typically `postgres`), bypassing all RLS policies. This is necessary for player devices (which are anonymous), but it means the function itself must implement access control. The existing functions trust the device ID passed by the caller without verification.

**Consequences:**
- **Data poisoning:** An attacker (or a misconfigured device) writes false telemetry data for other devices, making the diagnostic dashboard unreliable.
- **Screenshot spoofing:** Replace another tenant's device screenshot with an arbitrary image.
- **Alert manipulation:** If telemetry endpoints can clear device status flags, an attacker could suppress alerts for offline devices.
- **Cross-tenant data leak:** If telemetry endpoints return data (like the `update_device_status` function returns `needs_screenshot_update`), a device can poll another device's status.

**Prevention:**
- **Implement device authentication tokens:** After OTP pairing, issue a per-device JWT or API key stored in `localStorage`. All player RPC calls must include this token. The `SECURITY DEFINER` function validates the token against the `tv_devices` table before executing.
- **Alternatively, use a lightweight device session:** On pairing, store a random `device_secret` in both `tv_devices.device_secret_hash` (server) and `localStorage` (device). Each RPC validates `p_device_secret` against the hash. This avoids full JWT infrastructure.
- **At minimum, validate device ownership in existing functions:** The `store_device_screenshot` function should verify that the device exists and belongs to a valid tenant. Add `PERFORM 1 FROM tv_devices WHERE id = p_device_id` and raise an exception if not found.
- **Rate-limit SECURITY DEFINER functions:** Add a `last_api_call_at` column to `tv_devices` and reject calls more frequent than 1/second to prevent brute-force scanning of device IDs.

**Detection:**
- Supabase logs show `store_device_screenshot` or `update_device_status` calls with device IDs that do not match the geographic origin IP.
- Screenshot URLs in `tv_devices.last_screenshot_url` point to external domains.

**Phase assignment:** Must be addressed before any new telemetry endpoints are added. Retrofitting authentication onto existing functions is easier than doing it for all endpoints at once.

---

### Pitfall 10: Recovery and Telemetry Timers Pile Up After Multiple Hot Reloads

**What goes wrong:** The player uses multiple `setInterval` timers:
- Heartbeat: 30s (`usePlayerHeartbeat.js` line 96)
- Content poll: 30s (`usePlayerContent.js` line 307)
- Stuck detection: 10s (`useStuckDetection.js` line 103)
- Data refresh: 10s (`useDataRefreshOrchestrator.js`)
- PIN hash fetch: 30s (`ViewPage.jsx` line 209)
- Playback tracking flush: 30s (`playbackTrackingService.js`)

React effects clean these up on unmount, but the `initOfflineService()`, `initTracking()`, and `analytics.initSession()` calls in `ViewPage.jsx` run at the module level or in effects without proper idempotency guards. If the ViewPage component re-mounts (which happens on hot module replacement during development, React Strict Mode double-mounting, or after a soft recovery that re-renders the route), listeners and timers can double up.

The `offlineService.js` uses module-level state (`isOfflineMode`, `lastHeartbeatSuccess`, `offlineListeners`), which persists across component re-mounts. The `offlineListeners` array (line 79) accumulates duplicate listeners on each mount because the `addOfflineListener` is called but the returned cleanup function is not called on unmount.

**Why it happens:** Mixing module-level singletons (`offlineService.js`, `playbackTrackingService.js`) with React component lifecycle creates cleanup gaps. Adding more timers for telemetry and recovery makes this worse.

**Prevention:**
- **Make all service initializations idempotent:** `initOfflineService()` should check `if (initialized) return` at the top. Same for `initTracking()`.
- **Use a single player lifecycle manager:** Create a `PlayerLifecycleManager` singleton that owns all timers and listeners. The React component calls `.start()` on mount and `.stop()` on unmount. The manager internally deduplicates.
- **Add timer auditing:** In development mode, track all active `setInterval` IDs. Warn in console if more than expected number of timers are running. This catches the double-mount problem immediately.
- **For new telemetry timers:** Do not add new `setInterval` calls. Instead, piggyback on the existing heartbeat interval. The heartbeat callback already runs every 30s; add telemetry collection to it rather than creating a parallel timer.

**Detection:**
- DevTools Performance panel shows increasing timer count over time.
- `offlineListeners` array length grows beyond 1-2 entries.
- Heartbeat logs show duplicate entries with the same timestamp.

**Phase assignment:** Should be addressed early as a foundation cleanup before adding new timers/listeners.

---

## Minor Pitfalls

Issues that cause annoyances, technical debt, or minor UX problems.

---

### Pitfall 11: Screenshot Capture Blocks the UI Thread

**What goes wrong:** `html2canvas` runs synchronously on the main thread. For complex scenes with many DOM elements (scene editor with 20+ layers, data tables, RSS tickers), capture can take 500ms-2s. During this time, video playback stutters, animations freeze, and CSS transitions jump.

**Prevention:**
- Run screenshot capture on a `requestIdleCallback` boundary so it only executes when the browser is idle.
- Reduce capture scale further on constrained devices (0.25x instead of 0.5x).
- Add a `screenshot-ignore` class to animated/video elements (the existing `ignoreElements` filter at line 48 of `screenshotService.js` already supports this -- ensure all animated widgets use it).
- Consider using `OffscreenCanvas` in a Web Worker for the compositing step (available in Chrome 69+, which covers all target platforms except some older WebOS versions).

**Phase assignment:** Screenshot phase optimization, not blocking for initial implementation.

---

### Pitfall 12: Content Hash Comparison is Unreliable for Change Detection

**What goes wrong:** The existing `generateContentHash` in `playerService.js` (line 348) uses a simple djb2-style hash of `JSON.stringify(content)`. This hash is:
1. Not collision-resistant (32-bit integer space = high collision probability with many content variants).
2. Order-dependent: `{a:1, b:2}` hashes differently than `{b:2, a:1}`, but both represent the same content.
3. Includes transient fields: timestamps, server-generated IDs, and other metadata that change on every fetch even when the actual content is identical.

For content verification, relying on this hash means frequent false positives (content appears changed when it has not) and occasional false negatives (content actually changed but hash collides).

**Prevention:**
- Use a canonical hash: sort object keys before stringifying, exclude transient fields (timestamps, IDs), and use SHA-256 (available via `crypto.subtle.digest`) instead of djb2.
- Better: have the server compute and return a `content_hash` column on playlists/scenes (the existing `content_hash` in `scene_slides` is a good pattern). Compare server-provided hashes rather than computing client-side.

**Phase assignment:** Content verification phase prerequisite.

---

### Pitfall 13: Device Metrics Collection Varies Wildly Across Platforms

**What goes wrong:** Collecting CPU usage, memory usage, temperature, and network stats for diagnostic telemetry requires different APIs on each platform:
- **Web (Chrome):** `navigator.deviceMemory`, `navigator.connection`, Performance APIs. No CPU or temperature.
- **Android WebView:** Requires a JavaScript bridge to native code. `window.Android?.getSystemStats()` pattern. Must be added to the APK.
- **iOS WKWebView:** Similar native bridge requirement. Much more restricted than Android.
- **WebOS:** `webOS.service.request("luna://com.webos.service.tv.systemproperty/getSystemInfo", ...)` for some metrics. Available in LG signage mode only.
- **Tizen:** `tizen.systeminfo.getPropertyValue("CPU", ...)` for CPU, `tizen.systeminfo.getPropertyValue("MEMORY", ...)` for memory. Requires Tizen privilege declarations.

Building a telemetry system that assumes uniform metric availability across all platforms will either fail silently on half the fleet or require extensive platform-specific code.

**Prevention:**
- Define a `DeviceCapabilities` interface that each platform adapter reports. Start with the intersection of what is available everywhere (memory pressure, network type, error counts) and treat platform-specific metrics (CPU %, temperature) as optional extensions.
- Use the user agent to detect the platform at player startup and load the appropriate metrics collector module.
- Accept that web players will have the least metrics and Android/WebOS/Tizen players will have the most. Design the telemetry dashboard to gracefully show "N/A" for unavailable metrics rather than showing misleading zeros.

**Phase assignment:** Telemetry phase. This is an architecture decision that must be made upfront to avoid per-platform rewrites.

---

### Pitfall 14: Existing `usePlayerHeartbeat` Does Not Distinguish Intentional Restarts from Crashes

**What goes wrong:** When a device restarts (due to auto-recovery, admin command, OOM kill, or power cycle), the heartbeat resumes immediately. From the server's perspective, there is a gap in heartbeats followed by normal operation. There is no telemetry indicating WHY the restart happened or whether it was intentional (admin-triggered reboot command) vs. unintentional (crash + auto-restart).

**Why it happens:** The existing command handling reports results for intentional restarts (`reportCommandResult(commandId, true)` at line 59 of `usePlayerCommands.js`), but the restart happens via `setTimeout(() => window.location.reload(), 500)`, and if the page unloads before the report is sent, the command result is lost.

**Prevention:**
- Store restart reason in `localStorage` before restarting: `localStorage.setItem('last_restart_reason', JSON.stringify({reason: 'admin_reboot', commandId, timestamp}))`. On next boot, read this and include it in the first heartbeat.
- For crash restarts (where no `last_restart_reason` exists), report the restart as "unplanned" in the first heartbeat. Check if the previous session ended with a `beforeunload` event (store a `clean_shutdown` flag).
- Track restart frequency per device: if a device has > 3 unplanned restarts per hour, flag it for investigation.

**Phase assignment:** Auto-recovery phase, integrated with the restart loop prevention from Pitfall 1.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Screenshot Capture | html2canvas blank on WebOS/Tizen (Pitfall 2) | Validate blob size before upload; platform-specific capture fallbacks |
| Screenshot Capture | Storage costs grow unbounded (Pitfall 6) | Server-side cleanup cron; lifecycle policies on storage bucket |
| Screenshot Capture | UI thread blocking (Pitfall 11) | requestIdleCallback; reduce scale on constrained devices |
| Auto-Recovery | Infinite restart loop (Pitfall 1) | localStorage restart counter; exponential backoff; static fallback screen |
| Auto-Recovery | Visible glitches during recovery (Pitfall 7) | Skip-to-next instead of replay; soft recovery before hard reload |
| Auto-Recovery | No restart reason tracking (Pitfall 14) | localStorage reason tracking; unplanned restart detection |
| Content Verification | Blocking playback (Pitfall 4) | Background verification only; never block; play-then-verify |
| Content Verification | Unreliable hash comparison (Pitfall 12) | Server-provided SHA-256 hashes; canonical serialization |
| Telemetry | Database overwhelm (Pitfall 3) | Consolidate into single heartbeat RPC; batch writes; adaptive polling |
| Telemetry | IndexedDB quota exceeded (Pitfall 8) | Separate diagnostic database; dynamic limits; priority eviction |
| Telemetry | Timer accumulation (Pitfall 10) | Idempotent init; single lifecycle manager; piggyback on existing heartbeat |
| Telemetry | Cross-platform metric variance (Pitfall 13) | DeviceCapabilities interface; optional metrics; graceful N/A |
| Alerts | Alert noise and fatigue (Pitfall 5) | Root cause correlation; parent-child hierarchy; fleet-level dedup |
| All Phases | RLS bypass via anon endpoints (Pitfall 9) | Device authentication token; input validation in SECURITY DEFINER functions |

---

## Anti-Patterns Specific to Cross-Platform Player Hardening

### Anti-Pattern: "Works in Chrome, Ship It"
Every feature must be tested on at least Chrome (web), one Android WebView device, and one WebOS or Tizen panel before shipping. The gap between Chrome's capabilities and a 2019 LG WebOS browser is enormous. Allocate 30% of each phase's time for cross-platform testing and workarounds.

### Anti-Pattern: "More Timers = More Monitoring"
Do not add new `setInterval` calls for each hardening feature. Each timer is a potential memory leak, a source of timer drift, and a contributor to connection pool pressure. The heartbeat is the single metronome; all other periodic operations should piggyback on it.

### Anti-Pattern: "Fail Closed for Safety"
In server software, failing closed (deny by default) is correct. In signage players, failing closed means a blank screen. Every verification, check, and validation must have a "play anyway" fallback. The worst thing a signage player can do is show nothing.

### Anti-Pattern: "Collect Everything, Filter Later"
Telemetry that sends raw data and plans to "filter on the server" always overwhelms the database before filtering is implemented. Design the collection to be minimal and aggregated from day one. Collect counts and rates, not raw events.

### Anti-Pattern: "Same Alert for Every Device"
500 devices losing connectivity simultaneously due to a network outage should produce 1 alert, not 500. Fleet-level deduplication is not a nice-to-have; it is essential for operational sanity.

---

## Sources

- **Codebase analysis (HIGH confidence):** Direct reading of `screenshotService.js`, `usePlayerHeartbeat.js`, `useStuckDetection.js`, `offlineService.js`, `cacheService.js`, `alertEngineService.js`, `playerService.js`, `deviceSyncService.js`, `ViewPage.jsx`, `usePlayerContent.js`, `usePlayerCommands.js`, `useDataRefreshOrchestrator.js`, `playbackTrackingService.js`
- **Schema analysis (HIGH confidence):** Direct reading of Supabase migrations 075 (screenshots), 082 (alerts), 096 (diagnostics), 072 (heartbeat)
- **Domain expertise (MEDIUM confidence):** Cross-platform WebView behavior, IndexedDB quotas on smart TV platforms, html2canvas limitations on constrained hardware, signage industry patterns for fleet management and telemetry. These claims are based on training data and could not be verified with current web search due to tool unavailability. Platform-specific quota numbers and API availability should be validated against current device documentation during implementation.
