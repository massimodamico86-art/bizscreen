# Feature Landscape: Player Hardening

**Domain:** Digital signage player monitoring, diagnostics, auto-recovery, and alert-driven operations
**Researched:** 2026-02-19
**Confidence:** HIGH (based on deep codebase analysis of existing infrastructure; web search unavailable)

## Existing Infrastructure Inventory

Before mapping new features, a thorough audit of what BizScreen already has. This is critical because the milestone scope assumes these are "new features" but much of the infrastructure is already built.

| Existing Capability | Location | Status |
|---------------------|----------|--------|
| 30s heartbeat with player version + content hash | `usePlayerHeartbeat.js`, `playerService.js` | Working |
| Online/offline detection (5min threshold) | `PlayerStatusBadge.jsx`, `getPlayerStatus()` | Working |
| Screenshot capture via html2canvas | `screenshotService.js` | Working |
| Screenshot upload to Supabase Storage | `screenshotService.js` | Working |
| Screenshot request flag via heartbeat response | `075_device_screenshots.sql` | Working |
| Screenshot cleanup (keep last 5) | `screenshotService.js` | Working |
| Offline screenshot queuing (base64 to IndexedDB) | `screenshotService.js` + `cacheService.js` | Working |
| Remote commands (reboot, reload, clear_cache, reset) | `usePlayerCommands.js` | Working |
| Video stuck detection (30s stall threshold) | `useStuckDetection.js` | Working |
| Page inactivity detection (5min no-activity) | `useStuckDetection.js` | Working |
| Exponential backoff with full jitter | `playerService.js calculateBackoff()` | Working |
| Content retry (5 retries, 2s-60s backoff) | `usePlayerContent.js` | Working |
| Offline content cache (IndexedDB, 500MB media, 100MB scenes) | `cacheService.js`, `offlineService.js` | Working |
| Three-phase offline sync (prefetch/background/reconnect) | `offlineService.js` | Working |
| Alert engine with coalescing + dedup | `alertEngineService.js` | Working |
| Alert severity auto-escalation rules | `alertEngineService.js` | Working |
| Alert rate limiting (5/min per source) | `alertEngineService.js` | Working |
| 11 alert types (device_offline, screenshot_failed, cache_stale, etc.) | `082_alerts_notifications.sql` | Working |
| In-app notification bell with unread count | `NotificationBell.jsx` | Working |
| Email notifications for new alerts | `notificationDispatcherService.js` | Working |
| Notification preferences (severity filter, quiet hours, digest columns) | `notification_preferences` table | Schema ready, partially wired |
| Alerts Center page with filters + bulk actions | `AlertsCenterPage.jsx` | Working |
| Screen Detail Drawer with diagnostics RPC | `ScreenDetailDrawer.jsx` | Working |
| Content hash change detection on polling | `usePlayerContent.js` | Working |
| Real-time device command + refresh subscriptions | `realtimeService.js` | Working |
| Playback analytics tracking (start/end events) | `playbackTrackingService.js` | Working |
| Kiosk mode with PIN entry + fullscreen recovery | `useKioskMode.js`, `PinEntry.jsx` | Working |
| Player version tracking on heartbeat | `usePlayerHeartbeat.js` (v1.2.0) | Working |
| Performance metrics in alert engine | `alertEngineService.js getPerformanceMetrics()` | Working |
| Content resolution path diagnostics | `screenDiagnosticsService.js` | Working |

**Key finding:** BizScreen has built approximately 70-80% of player hardening infrastructure. The alert engine, screenshot pipeline, stuck detection, offline caching, and notification system are operational. The remaining work is:

1. **Triggering alerts automatically** -- server-side heartbeat evaluation (currently no automated trigger exists)
2. **Wiring recovery actions** -- stuck detection fires callbacks but ViewPage does not act on them
3. **Surfacing screenshots in the UI** -- data exists but is not prominently displayed
4. **Extending telemetry** -- heartbeat carries version + content hash; needs browser diagnostics
5. **Closing the feedback loop** -- content version mismatch detection between expected and actual

---

## Table Stakes

Features operators expect when managing a fleet of digital signage players. Missing any of these makes the platform feel unfit for production deployments.

### 1. Screenshot Display on Screen Detail Page

| Aspect | Detail |
|--------|--------|
| **Why expected** | Operators need to visually verify what a remote screen is actually showing without walking to it. This is the single most-used diagnostic tool in digital signage platforms. |
| **Complexity** | **Low** |
| **Existing state** | `last_screenshot_url` and `last_screenshot_at` stored on `tv_devices` (migration 075). `captureAndUploadScreenshot()` works. `list_devices_with_screenshot_info` RPC returns screenshot data. |
| **Gap** | ScreenDetailDrawer does not prominently display the screenshot. Need: (a) large screenshot preview at top of drawer, (b) "Request New Screenshot" button calling `request_device_screenshot` RPC, (c) screenshot age indicator ("Captured 3 min ago"), (d) placeholder when no screenshot exists yet. |
| **Depends on** | Existing screenshot pipeline (no new dependencies) |

### 2. Automated Screenshot Capture on Interval

| Aspect | Detail |
|--------|--------|
| **Why expected** | Screenshots should update periodically without manual request. Operators expect to see a reasonably fresh view (< 10 min) when they open any screen's detail page. |
| **Complexity** | **Low** |
| **Existing state** | Screenshots only capture when `needs_screenshot_update` flag is set by an operator. The heartbeat checks this flag every 30 seconds. |
| **Gap** | Change capture strategy from purely on-demand to periodic. Player-side approach: capture every N heartbeats (e.g., every 10 = every 5 min). Simple counter in `usePlayerHeartbeat` -- no server changes needed. |
| **Depends on** | Existing heartbeat + screenshot services |

### 3. Automated Device Offline Alerts

| Aspect | Detail |
|--------|--------|
| **Why expected** | This is THE core monitoring feature. When a screen goes dark, the operator must be notified -- not discover it hours later by checking a dashboard. The operator explicitly wants alert-driven monitoring, not dashboard watching. |
| **Complexity** | **Medium** |
| **Existing state** | `device_offline` alert type exists in migration 082. `raiseDeviceOfflineAlert()` helper exists in `alertEngineService`. `auto_resolve_alert()` works. The entire notification pipeline (in-app + email) is ready. **BUT: nothing calls these functions automatically.** There is no server-side process that evaluates heartbeat staleness. |
| **Gap** | Need a server-side scheduled function (Supabase pg_cron or Edge Function on a schedule) that: (a) queries `tv_devices WHERE is_online = true AND last_seen < NOW() - INTERVAL '5 minutes'`, (b) marks them offline (`is_online = false`), (c) calls `raise_alert` for each newly offline device, (d) calls `auto_resolve_alert` for devices that have come back online. This is the single most important missing piece in the entire hardening story. |
| **Depends on** | Supabase scheduled function infrastructure (pg_cron or Edge Function cron) |

### 4. Player Auto-Recovery from Stuck States

| Aspect | Detail |
|--------|--------|
| **Why expected** | Screens that freeze or show stuck video are the #1 support complaint in digital signage. Players must self-heal without human intervention for the vast majority of failures. |
| **Complexity** | **Low** (basic wiring) to **Medium** (full state machine) |
| **Existing state** | `useStuckDetection.js` detects video stalls (30s) and page inactivity (5min). It calls `onVideoStuck` and `onPageStuck` callbacks. ViewPage imports the hook. **BUT: the callbacks are not wired to recovery actions.** The hook documentation explicitly says "Does NOT perform recovery actions -- that's the consumer's responsibility." |
| **Gap** | Wire recovery actions in ViewPage: (a) on video stuck: skip to next playlist item, (b) on repeated video stucks (3+ in 10 min): reload content from server, (c) on page stuck (5min inactivity): full page reload, (d) track all recovery actions for diagnostics, (e) raise alert to operator if recovery keeps failing. |
| **Depends on** | Existing `useStuckDetection` + `usePlayerCommands` + `usePlayerContent.loadContent()` |

### 5. Content Version Mismatch Detection

| Aspect | Detail |
|--------|--------|
| **Why expected** | Operators need confidence that published content is actually showing on screens. Silent failures where screens show stale content undermine trust in the platform. |
| **Complexity** | **Medium** |
| **Existing state** | Player sends `cached_content_hash` on heartbeat. Server stores it on `tv_devices`. Content resolution RPC returns current expected content. `device_cache_stale` alert type exists in the alert engine. |
| **Gap** | Need comparison logic: (a) server-side function computes expected content hash for a device, (b) compares against `cached_content_hash` from last heartbeat, (c) raises `device_cache_stale` alert when mismatch persists beyond a threshold (e.g., 2+ heartbeat cycles). Must ensure both sides compute the same hash format -- current hash is `JSON.stringify({ mode, source, playlistId, layoutId, campaignId })`. |
| **Depends on** | Existing heartbeat payload + alert engine + new server-side comparison function |

### 6. Connection Status Indicator on Player

| Aspect | Detail |
|--------|--------|
| **Why expected** | On-site technicians need to see at a glance whether a player is connected. Kiosk mode hides browser chrome, so there is no visible network indicator. |
| **Complexity** | **Low** |
| **Existing state** | `usePlayerContent` tracks `connectionStatus` state ('connecting', 'connected', 'reconnecting', 'offline'). `SyncStatusIndicator.jsx` exists as a player widget. |
| **Gap** | Ensure SyncStatusIndicator is rendered in ViewPage for all content modes. Show briefly on status changes, then fade to avoid distracting from content. Consider a subtle persistent dot in the corner (small, semi-transparent). |
| **Depends on** | Existing connection status state and SyncStatusIndicator component |

### 7. Screenshot Failure Alerting

| Aspect | Detail |
|--------|--------|
| **Why expected** | If screenshots stop working, operators lose their primary diagnostic tool and should be informed. |
| **Complexity** | **Low** (verification only) |
| **Existing state** | **Already implemented.** `captureAndUploadScreenshot()` tracks consecutive failures per device via in-memory `deviceFailureCounts` Map. After 2+ failures, calls `raiseScreenshotFailedAlert()`. Alert auto-resolves on next successful capture. Auto-escalation to critical after 5 failures configured in `ESCALATION_RULES`. |
| **Gap** | Verify that device info (name, tenant_id) is available when calling from `usePlayerHeartbeat`. Currently the heartbeat hook does not pass device metadata to the screenshot service, so the alert may not fire correctly. Minor fix needed. |
| **Depends on** | Existing implementation (verification and minor fix) |

---

## Differentiators

Features that set BizScreen apart from basic platforms. Not expected by every user, but highly valued by operations-focused customers managing 10+ screens.

### 1. Device Diagnostic Telemetry

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Surface memory usage, network quality, storage capacity from the player to the management UI. Enables proactive maintenance before failures occur. Transforms support from reactive ("it broke") to proactive ("memory usage trending high"). |
| **Complexity** | **Medium** |
| **Implementation** | Browser APIs: `navigator.deviceMemory` (RAM GB, Chrome), `navigator.connection` (effectiveType, downlink, rtt), `performance.memory` (Chrome: usedJSHeapSize), `navigator.storage.estimate()` (quota + usage), `screen.width/height`. Collect on heartbeat interval. Store in `device_info` JSONB column on `tv_devices` (column already exists). |
| **Dashboard** | Add telemetry cards to ScreenDetailDrawer: memory gauge, network quality badge, storage usage bar, browser/OS info. Flag devices approaching resource limits. |
| **Caveat** | Some APIs are Chrome-only (`performance.memory`) or require secure context. Graceful degradation needed for WebOS/Tizen built-in browsers that may not support all APIs. |

### 2. Automated Recovery Escalation State Machine

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Tiered recovery eliminates 95%+ of player issues without human intervention. Each tier tried before escalating. Reduces support burden dramatically for unattended deployments. |
| **Complexity** | **Medium** |
| **Implementation** | New `useRecoveryManager` hook with states: HEALTHY -> DETECTING -> RECOVERING_L1 (skip item) -> RECOVERING_L2 (reload content) -> RECOVERING_L3 (page reload) -> FAILED (raise alert, show fallback). Track recovery attempts and outcomes. Report transitions on heartbeat telemetry. Configurable thresholds. |
| **Integration** | Wraps existing `useStuckDetection`, calls existing content reload and page reload mechanisms, uses existing `raiseAlert` for failure notification. |

### 3. Content Verification Checksums

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Player reports a hash of what it is actually rendering (not just what it was told to render). Catches silent failures: corrupted downloads, partially loaded playlists, widget rendering errors. |
| **Complexity** | **Medium** |
| **Implementation** | Player computes a rendering manifest: `{ mode, playlistId, itemIds: [...], loadedMediaUrls: [...], widgetStates: {...} }`. Hash with `SubtleCrypto.digest('SHA-256', ...)` and send on heartbeat. Server computes expected manifest from content resolution RPC. Mismatch triggers investigation. |
| **Distinction from existing** | Current `cached_content_hash` is what the player was told to show (assignment hash). Content verification is what the player is actually showing (rendering hash). The difference catches download failures, cache corruption, and rendering errors. |

### 4. Screenshot History Timeline

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Operators scrub through a timeline of screenshots to verify scheduled content played at the right times. Answers "what was showing at 2pm yesterday?" |
| **Complexity** | **Low** |
| **Implementation** | Screenshots already stored as `{deviceId}/{timestamp}.jpg` in Supabase Storage. Currently keeps last 5 via `cleanupOldScreenshots`. Increase retention to 24-48 per device. Add list endpoint using `supabase.storage.from('device-screenshots').list(deviceId)`. Horizontal scrollable timeline UI on screen detail. |
| **Storage cost** | At ~50KB per screenshot: 288 screenshots/day/device (one per 5 min) = ~14MB/device/day. 100 devices = 1.4GB/day. Keep 24 hours. Manageable with daily cleanup. |

### 5. Recovery Loop Detection with Fallback Content

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Detect when a device is crash-looping (recovering then crashing again) and stop the cycle. Display a branded "Please stand by" fallback instead of a flashing screen. Prevents embarrassing public displays of broken content. |
| **Complexity** | **Medium** |
| **Implementation** | Track recovery attempts across page reloads via `localStorage` (crash counter with timestamps). If 3+ reloads in 10 minutes, enter fallback mode: display a pre-cached static "Please stand by" screen. Raise critical alert. Wait for operator intervention or configurable cooldown before retrying. |
| **Pre-cache** | Cache fallback HTML/image in IndexedDB at pairing time so it works even when network is completely down. |

### 6. Proactive Screen Group Health Alerting

| Aspect | Detail |
|--------|--------|
| **Value proposition** | When >50% of screens in a group go offline simultaneously, escalate to critical. Signals network/infrastructure problem vs. single device failure. Different diagnosis, different urgency. |
| **Complexity** | **Medium** |
| **Implementation** | In the server-side heartbeat evaluator, after raising individual `device_offline` alerts, check group health: count online vs total for each affected screen group. If health drops below threshold, raise a group-level critical alert. Auto-resolve when health recovers. |
| **Depends on** | Screen groups (already built), device offline alerts (table stakes), server-side evaluator |

### 7. Player Self-Diagnostics Report

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Structured diagnostic payload available on demand: browser version, screen resolution, network speed, cache size, last N errors, uptime since load, content version, recovery history. Eliminates remote debugging guesswork. |
| **Complexity** | **Medium** |
| **Implementation** | Player collects from diagnostic telemetry plus error buffer (last 20 errors from scoped logger). Stores locally, sends on heartbeat or on explicit request via device command. Display as expandable section on ScreenDetailDrawer. |

### 8. Email Digest for Alert Summaries

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Daily/weekly email summarizing alert activity across all screens. Operators who do not log in daily still stay informed. Catches slow-burn issues. |
| **Complexity** | **Medium** |
| **Implementation** | `notification_preferences` table already has `email_digest_enabled` boolean and `email_digest_frequency` ('daily'/'weekly') columns. Need: (a) Supabase cron or Edge Function, (b) aggregation query for alerts per tenant, (c) email template, (d) send via existing `emailService.js`. |

### 9. Offline Event Replay on Reconnection

| Aspect | Detail |
|--------|--------|
| **Value proposition** | No data loss during network outages. Queued heartbeats, analytics events, and screenshots replayed in order when connectivity returns. |
| **Complexity** | **Low** |
| **Implementation** | `offlineQueue` store in IndexedDB already exists. `queueOfflineEvent()` and `getPendingEvents()` already work. Need: sync orchestrator that processes the queue on reconnection, respects rate limits, handles partial failures, marks events as synced. |

### 10. Network Quality Monitoring

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Know when degraded network is causing content loading issues before users complain. Especially valuable for screens on WiFi or cellular connections. |
| **Complexity** | **Low** |
| **Implementation** | `navigator.connection` API provides `effectiveType` (4g/3g/2g/slow-2g), `downlink` (Mbps estimate), `rtt` (ms). Collect on each heartbeat as part of telemetry payload. Surface on dashboard with color coding. Alert when quality degrades below threshold for extended period. |

---

## Anti-Features

Features to explicitly NOT build. These look appealing but create complexity or maintenance burden that exceeds their value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Live video streaming from player** | Massive bandwidth (10-50x vs screenshots), privacy concerns in public spaces, requires WebRTC/RTMP infrastructure. Screenshots solve 95% of the diagnostic use case. | Periodic screenshots every 2-5 min. "Request Screenshot" button for immediate capture. Industry standard approach. |
| **Player-side AI anomaly detection** | Running ML on commodity signage hardware (Raspberry Pi, low-end Android, WebOS TVs) is unrealistic due to memory/CPU constraints. | Server-side threshold rules in the existing alert engine. Simple rules (memory >80%, 3+ recoveries in 10min) cover the useful cases. |
| **Full remote desktop/VNC** | Security risk (persistent remote access), bandwidth intensive, requires always-on connection. Signage players should be stateless appliances. | Remote commands + screenshots + diagnostic telemetry + self-diagnostics report provide sufficient remote control. |
| **Custom operator-uploaded recovery scripts** | Security risk (code injection), stability risk (bad scripts crash players), support burden (debugging custom scripts). | Predefined recovery actions with configurable parameters. Safe, predictable, testable. |
| **Per-pixel screenshot comparison** | Computationally expensive, fragile (anti-aliasing, animation timing, video frames), extremely high false-positive rate. | Content version checksums verify the right content is loaded. Visual inspection of screenshots catches rendering issues. |
| **Real-time console log streaming** | Massive ingestion costs from hundreds of players. Most log data is noise. | Structured logging to Sentry for errors. "Last 20 errors" buffer in diagnostic telemetry for on-demand inspection. |
| **Native push notifications (FCM/APNs)** | Platform-specific complexity (Android/iOS/Web), certificate management, token refresh handling. | Existing 30s polling + Supabase Realtime subscriptions. 30-second worst-case latency is perfectly acceptable for signage. |
| **Player firmware/OS update management** | Requires device-specific build pipelines for diverse hardware (Android, WebOS, Tizen). | Player version tracking on heartbeat (exists). Alert on outdated versions. Let IT teams manage OS via their MDM tools. |
| **CPU usage estimation via rAF timing** | Unreliable measurement, battery-draining on mobile, no real browser API for CPU metrics. | Track JS heap memory via `performance.memory` on Chromium. Storage + memory metrics are the actionable ones. |
| **Third-party incident management integration** | Over-engineering for current scale. Adds external dependency and cost (PagerDuty, OpsGenie). | In-app + email alerts are sufficient. Can add webhooks later via existing `webhookService.js` pattern if enterprise customers demand it. |

---

## Feature Dependencies

### Dependency Graph

```
[Server-side heartbeat evaluator] (NEW - pg_cron or Edge Function)
  |
  +-> Automated device offline alerts (table stakes #3)
  |     +-> Auto-resolve alerts when devices come back online
  |     +-> Screen group health alerting (differentiator #6)
  |
  +-> Content version mismatch detection (table stakes #5)
        +-> Content verification checksums (differentiator #3)

[Player recovery actions] (NEW - wiring in ViewPage)
  |
  +-> useStuckDetection (existing, provides detection events)
  +-> Item skip action (new)
  +-> Content reload (existing loadContent)
  +-> Page reload (existing window.location.reload pattern)
  +-> Alert on persistent failure (existing raiseAlert)
  |
  +-> Recovery escalation state machine (differentiator #2)
        +-> Recovery loop detection (differentiator #5)
              +-> Fallback content display

[Screenshot UI integration] (LOW effort)
  |
  +-> Screenshot on screen detail page (table stakes #1)
  +-> Auto-capture interval (table stakes #2)
  +-> Screenshot history timeline (differentiator #4)

[Diagnostic telemetry collection] (NEW - browser API sampling)
  |
  +-> Heartbeat payload extension
  +-> device_info JSONB storage (existing column)
  +-> Telemetry dashboard UI on ScreenDetailDrawer
  +-> Player self-diagnostics report (differentiator #7)
  +-> Network quality monitoring (differentiator #10)

[Offline event replay] (LOW effort)
  |
  +-> Existing offline queue primitives in cacheService
  +-> Sync orchestrator on reconnection (new)
```

### Critical Path

The server-side heartbeat evaluator is the single most important new component. Without it, the entire alert-driven monitoring story collapses -- alert types exist in the schema, helper functions exist in the service layer, notification dispatching exists, the UI exists -- but nothing triggers them automatically for device monitoring.

```
Heartbeat evaluator (trigger) --> raise_alert --> notification dispatcher --> NotificationBell + email
                              --> auto_resolve_alert --> resolved notification
```

---

## MVP Recommendation

Prioritized by operator impact and dependency chain:

### Phase 1: Alert-Driven Foundation (highest impact, unblocks everything)

1. **Server-side heartbeat evaluator** -- The missing trigger. Implement as Supabase pg_cron job or Edge Function running every 2 minutes. Evaluate device staleness, raise/resolve alerts.
2. **Screenshot on screen detail page** -- Data exists, needs UI. Largest single improvement to operator experience.
3. **Auto-screenshot interval** -- Simple counter in heartbeat hook. Screenshots always fresh.

### Phase 2: Self-Healing Player

4. **Player auto-recovery wiring** -- Wire stuck detection callbacks to actual recovery actions in ViewPage.
5. **Content version verification** -- Server-side comparison of expected vs reported content hash.
6. **Recovery loop detection** -- Crash counter in localStorage, fallback content on loop.

### Phase 3: Proactive Diagnostics

7. **Device diagnostic telemetry** -- Browser API data collection, store on heartbeat, display on drawer.
8. **Recovery escalation state machine** -- Formalize tiered recovery with tracking and configurability.
9. **Player self-diagnostics report** -- Bundle telemetry + errors + status for on-demand inspection.

### Defer to Future Milestone

- **Screenshot history timeline**: Current 5-screenshot retention is fine for MVP. Enhance after core monitoring proven.
- **Email digest**: DB schema ready but low urgency. In-app + critical email alerts cover immediate needs.
- **Group health alerting**: Requires solid per-device alerting first. Natural follow-on.
- **Offline event replay**: Foundation exists. Not urgent -- player handles offline gracefully already.
- **Network quality monitoring**: Easy data collection but dashboard UI is scope creep within hardening.

---

## Complexity Assessment Summary

| Feature | Category | Complexity | New Code vs Wiring |
|---------|----------|-----------|-------------------|
| Screenshot on detail page | Table stakes | **Low** | UI wiring (data exists) |
| Auto-screenshot interval | Table stakes | **Low** | Counter in heartbeat hook |
| Server-side heartbeat evaluator | Table stakes | **Med** | New cron/edge function + DB queries |
| Player auto-recovery wiring | Table stakes | **Low-Med** | Wire existing callbacks to actions |
| Content version mismatch | Table stakes | **Med** | New comparison logic + server function |
| Connection status indicator | Table stakes | **Low** | Wire existing state to existing widget |
| Screenshot failure alerting | Table stakes | **Low** | Verification only (already implemented) |
| Diagnostic telemetry | Differentiator | **Med** | New API collection + storage + UI |
| Recovery escalation | Differentiator | **Med** | New hook wrapping existing detection |
| Content verification checksums | Differentiator | **Med** | Rendering manifest + SHA-256 + comparison |
| Screenshot history timeline | Differentiator | **Low** | Retention config + list UI |
| Recovery loop detection | Differentiator | **Med** | localStorage counter + fallback display |
| Group health alerting | Differentiator | **Med** | Aggregation logic on device alerts |
| Player self-diagnostics | Differentiator | **Med** | Bundle telemetry + errors + status |
| Email digest | Differentiator | **Med** | Cron function + email template |
| Offline event replay | Differentiator | **Low** | Sync orchestrator on existing queue |
| Network quality monitoring | Differentiator | **Low** | navigator.connection API + display |

---

## Sources

All findings based on direct codebase analysis (HIGH confidence):

- **Player hooks:** `src/player/hooks/` -- usePlayerHeartbeat, usePlayerCommands, useStuckDetection, usePlayerContent, usePlayerPlayback, useKioskMode, useTapSequence
- **Services:** `src/services/` -- screenshotService, playerService, alertEngineService, notificationDispatcherService, screenDiagnosticsService, playbackTrackingService, emailService
- **Database migrations:** `supabase/migrations/` -- 072_device_heartbeat, 075_device_screenshots, 082_alerts_notifications, 083_alerts_indexes_performance
- **UI components:** `src/pages/AlertsCenterPage.jsx`, `src/components/ScreenDetailDrawer.jsx`, `src/components/screens/PlayerStatusBadge.jsx`, `src/components/notifications/NotificationBell.jsx`
- **Player infrastructure:** `src/player/cacheService.js` (IndexedDB with LRU eviction, 500MB media / 100MB scene limits), `src/player/offlineService.js` (three-phase sync), `src/player/components/SyncStatusIndicator.jsx`
- **Domain expertise:** Digital signage monitoring patterns (Yodeck, ScreenCloud, OptiSigns, Rise Vision) -- LOW confidence on specific competitor feature details but HIGH confidence on industry standard patterns
