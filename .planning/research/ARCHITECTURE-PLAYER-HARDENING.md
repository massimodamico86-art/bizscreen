# Architecture Patterns: Player Hardening Integration

**Domain:** Digital signage player hardening (screenshots, auto-recovery, content verification, telemetry, alerts)
**Researched:** 2026-02-19
**Confidence:** HIGH -- based on direct codebase analysis of every file in the integration path
**Supersedes:** Previous ARCHITECTURE-PLAYER-HARDENING.md draft (pre-codebase-analysis)

## Executive Summary

BizScreen already has substantial infrastructure for every hardening feature requested. This is an integration and enhancement milestone, not a greenfield build. The existing heartbeat loop in `usePlayerHeartbeat` already triggers screenshot capture. The `alertEngineService` already handles `device_offline`, `device_screenshot_failed`, and `device_cache_stale` alert types with coalescing, auto-escalation, and auto-resolution. The `useStuckDetection` hook already monitors video stalls and page inactivity. The `usePlayerMetrics` hook already collects network latency, jitter, and packet loss.

The work is: (1) harden what exists so it fails less, (2) fill gaps where detection happens but recovery does not, (3) add the content verification layer that does not exist yet, and (4) surface telemetry/alerts better in the admin UI (latest screenshot on screen detail page, notification-driven monitoring instead of dashboards).

---

## Existing Architecture (What We Have)

### Player Component Tree

```
Player.jsx (23 lines, routing-only)
  -> /player/view -> ViewPage.jsx (main playback page, ~1230 lines)
       Hooks:
         usePlayerContent     -- content loading, polling, offline fallback, change detection
         usePlayerHeartbeat   -- 30s heartbeat, screenshot capture, refresh check
         usePlayerCommands    -- reboot, reload, clear_cache, reset commands via Realtime
         usePlayerPlayback    -- slide timing, video control, analytics batching
         useKioskMode         -- fullscreen, PIN/password exit
         useStuckDetection    -- video stall (30s) + page inactivity (5 min) detection
         useTapSequence       -- hidden 5-tap kiosk exit trigger

       Renderers (by content mode):
         SceneRenderer        -- block-based scene slides
         LayoutRenderer       -- multi-zone layouts with widget registry
         AppRenderer          -- standalone apps (clock, web page, etc.)
         PinEntry             -- kiosk exit PIN overlay

       Service Layer:
         playerService        -- heartbeat RPC, command polling, IndexedDB v1 cache, backoff
         screenshotService    -- html2canvas capture -> Supabase Storage upload -> DB store
         realtimeService      -- WebSocket subscriptions (commands, refresh, content updates)
         deviceSyncService    -- refresh flag management, scene publishing
         offlineService       -- service worker registration, 3-phase sync, offline queue
         cacheService         -- IndexedDB v4 with LRU eviction (scenes, media, data, RSS, weather)
         playerAnalyticsService -- batched playback events (30s flush cycle)
         playbackTrackingService -- scene start/end, online/offline state tracking
         alertEngineService   -- raise/coalesce/resolve alerts with auto-escalation rules
         notificationDispatcherService -- in-app + email notification delivery
         loggingService       -- scoped logger (createScopedLogger) used throughout
```

### Existing Database Schema (Relevant Tables)

| Table | Purpose | Key Columns for Hardening |
|-------|---------|--------------------------|
| `tv_devices` | Screen/device registry | `is_online`, `last_seen`, `needs_refresh`, `last_screenshot_url`, `last_screenshot_at`, `needs_screenshot_update`, `player_version`, `cached_content_hash`, `last_config_hash`, `last_refresh_at` |
| `alerts` | Alert tracking with coalescing | `type` (CHECK constraint with 11 types), `severity`, `status`, `occurrences`, `meta` JSONB, `device_id`, unique index for dedup |
| `notifications` | In-app notification delivery | `user_id`, `alert_id`, `alert_type`, `severity`, `title`, `message`, `read_at`, `clicked_at`, `action_url` |
| `notification_preferences` | Per-user notification settings | `channel_email`, `channel_in_app`, `min_severity`, `types_whitelist`/`blacklist`, quiet hours |
| `player_network_metrics` | Network telemetry time-series | `device_id`, `tenant_id`, `latency_ms`, `jitter_ms`, `packet_loss_percent`, `retry_count`, `reconnect_count`, `latency_bucket`, `measured_at` |
| `device_commands` | Remote command queue | `device_id`, `command_type`, `status`, `payload`, Realtime subscription on INSERT/UPDATE |
| `device-screenshots` (Storage bucket) | Screenshot image files | `{deviceId}/{timestamp}.jpg` in Supabase Storage, public access |

### Existing Supabase RPC Functions (Relevant)

| Function | Called By | Purpose |
|----------|----------|---------|
| `update_device_status(device_id, player_version, content_hash)` | `usePlayerHeartbeat` every 30s | Updates `is_online`, `last_seen`; returns `{needs_screenshot_update}` |
| `player_heartbeat(screen_id)` | `usePlayerContent` polling | Simple heartbeat (updates `last_seen`, `is_online`) |
| `store_device_screenshot(device_id, screenshot_url)` | `screenshotService` after upload | Stores URL, clears `needs_screenshot_update` flag |
| `request_device_screenshot(device_id)` | Admin UI | Sets `needs_screenshot_update = true` |
| `get_resolved_player_content(screen_id)` | `usePlayerContent` | Returns full content payload with content mode, items, screen info |
| `get_pending_device_command(device_id)` | Fallback polling (when Realtime fails) | Returns oldest pending command |
| `mark_command_executed(command_id, success, error_message)` | `usePlayerCommands` | Reports command execution result |
| `record_player_network_metrics(...)` | `usePlayerMetrics` every 30s | Stores network quality metrics |
| `check_device_refresh_status(screen_id)` | `usePlayerHeartbeat` | Returns `{needs_refresh}` flag |
| `clear_device_refresh_flag(screen_id, config_hash)` | `usePlayerHeartbeat` after refresh | Clears `needs_refresh`, stores config hash |

### Existing Alert Types (Already in DB CHECK Constraint + Service)

```javascript
// From alertEngineService.js ALERT_TYPES:
device_offline              // raised when heartbeat misses threshold
device_screenshot_failed    // raised after 2+ consecutive capture failures
device_cache_stale          // raised when cache not updated for N hours
device_error                // generic device error
schedule_missing_scene      // schedule references deleted scene
schedule_conflict           // overlapping schedule entries
data_source_sync_failed     // external data sync failure
social_feed_sync_failed     // social media feed failure
content_expired             // content past expiration date
storage_quota_warning       // approaching storage limits
api_rate_limit              // API rate limit hit
```

### Existing Auto-Escalation Rules

```javascript
// From alertEngineService.js ESCALATION_RULES:
device_offline:            warning -> critical after 30 min
device_screenshot_failed:  warning -> critical after 5 consecutive failures
data_source_sync_failed:   warning -> critical after 3 failures in 24h
social_feed_sync_failed:   warning -> critical after 5 failures in 24h
device_cache_stale:        warning -> critical after 24 hours stale
```

### Existing Recovery Mechanisms

| Mechanism | Location | What It Does | Gap |
|-----------|----------|-------------|-----|
| Video stuck detection | `useStuckDetection` (10s check interval) | Resets video to 0 + play(), or advances to next item | No escalation to page reload after repeated failures |
| Page stuck detection | `useStuckDetection` (5 min threshold) | `window.location.reload()` | No tracking of reload count/success |
| Content polling fallback | `usePlayerContent` (30s interval) | Hash-based change detection, offline cache fallback | No verification of downloaded content integrity |
| Realtime fallback | `ViewPage.jsx` useEffect | Falls back to `pollForCommand` if WebSocket subscription fails | No alert raised on persistent Realtime failure |
| Offline content cache | `offlineService` + `cacheService` | IndexedDB with 3-phase sync (prefetch, background, reconnect) | No verification that cached content is intact |
| Exponential backoff | `playerService.calculateBackoff` | Full jitter (0-100%) backoff for retries | Already good, no change needed |
| Service worker | `public/sw.js` + `offlineService.registerServiceWorker()` | Handles SYNC_HEARTBEATS, SYNC_SCREENSHOTS, CHECK_CONTENT_UPDATES messages | SW registered but watchdog ping/pong not implemented |
| Screenshot offline queue | `screenshotService.captureAndUploadScreenshot` | Queues as base64 in IndexedDB `offlineQueue` when `!navigator.onLine` | Queue synced on reconnect via `syncPendingScreenshots` -- working |
| Screenshot failure alerts | `screenshotService` | Tracks consecutive failures per device, raises alert after 2+, auto-resolves on success | Only triggered when capture is requested -- no periodic check for stale screenshots |

---

## Recommended Architecture: What to Build

### Component Boundaries

| Component | Responsibility | Communicates With | New/Modify |
|-----------|---------------|-------------------|------------|
| `useAutoRecovery` | Multi-stage recovery orchestration with stage tracking | `useStuckDetection` callbacks, `usePlayerContent.loadContentRef`, ViewPage | **NEW hook** |
| `useContentVerification` | Verify media URLs accessible after content load | `usePlayerContent`, `cacheService` | **NEW hook** |
| `telemetryCollector` | Aggregate player health snapshot for heartbeat payload | `cacheService.getCacheSize`, `performance.memory`, recovery state | **NEW service** |
| `usePlayerHeartbeat` | Enhanced: periodic screenshots, accept telemetry, send enriched heartbeat | `playerService`, `screenshotService`, `telemetryCollector` | **MODIFY** |
| `useStuckDetection` | No structural change -- ViewPage callbacks change to go through useAutoRecovery | Unchanged internally | **NO CHANGE** |
| `ViewPage.jsx` | Wire new hooks into existing coordinator pattern | All hooks | **MODIFY** |
| `alertEngineService` | Add `content_verification_failed`, `device_recovery_exhausted` types | Supabase `alerts` table | **MODIFY** |
| `ScreenDetailDrawer` | Add screenshot panel with image display + refresh button | `screenDiagnosticsService`, `request_device_screenshot` RPC | **MODIFY** |
| `update_device_status` RPC | Accept and store telemetry JSON payload | `tv_devices.player_telemetry` column | **MODIFY** (migration) |
| `NotificationBell` | Add icon mappings for 2 new alert types | `ALERT_TYPES` | **MODIFY** (2 lines) |
| `sw.js` | Add watchdog ping/pong for frozen main thread detection | Main thread via `postMessage` | **MODIFY** |

### Data Flow Diagrams

#### 1. Screenshot Capture Flow (Exists -- Enhancement: Add Periodic Auto-Capture)

**Current flow (on-demand only):**
```
Admin -> supabase.rpc('request_device_screenshot', deviceId)
      -> tv_devices.needs_screenshot_update = true

Player heartbeat (30s):
  -> supabase.rpc('update_device_status', ...)
  <- { needs_screenshot_update: true }
  -> if true && !screenshotInProgressRef:
       html2canvas(contentContainerRef, { scale: 0.5, quality: 0.8 })
       -> supabase.storage.upload('device-screenshots/{deviceId}/{ts}.jpg')
       -> supabase.rpc('store_device_screenshot', { deviceId, url })
       -> cleanupOldScreenshots(deviceId, 5)
  -> If offline: queue as base64 in IndexedDB offlineQueue
```

**Enhancement -- add periodic auto-capture inside usePlayerHeartbeat:**
```javascript
// Inside usePlayerHeartbeat, within the existing sendBeat function:
const SCREENSHOT_AUTO_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Check if enough time has elapsed since last screenshot
const timeSinceLastScreenshot = Date.now() - lastScreenshotTimeRef.current;
const shouldAutoCapture = timeSinceLastScreenshot > SCREENSHOT_AUTO_INTERVAL;

if ((statusResult?.needs_screenshot_update || shouldAutoCapture)
    && !screenshotInProgressRef.current) {
  // Same capture logic -- no new code path, just a new trigger condition
  lastScreenshotTimeRef.current = Date.now();
  await captureAndUploadScreenshot(screenId, container);
}
```

**Why this design:**
- No new interval timer -- runs inside existing 30s heartbeat check
- Reuses all existing screenshot infrastructure (capture, upload, store, cleanup, offline queue)
- `screenshotInProgressRef` prevents concurrent captures (already exists)
- Screenshot failure alert + auto-resolve already wired in `screenshotService`
- Configurable interval via constant (could later be per-device via RPC response)

#### 2. Auto-Recovery Flow (New Orchestration Layer)

**Current (flat, no escalation):**
```
useStuckDetection -> onVideoStuck -> reset video OR advance to next
useStuckDetection -> onPageStuck  -> window.location.reload()
```

**Proposed (staged escalation via useAutoRecovery):**
```
                    useAutoRecovery
                    +-----------+
                    | Stage 0   | Normal operation (no recent failures)
                    +-----------+
                          |
                    failure detected
                          v
                    +-----------+
                    | Stage 1   | Content-level recovery
                    |           | - Reset video, advance to next item
                    |           | - Record event in telemetry
                    +-----------+
                          |
                    3 Stage-1 failures within 2 min
                          v
                    +-----------+
                    | Stage 2   | Soft reload
                    |           | - loadContent(screenId, true) with backoff
                    |           | - Clear content hash to force re-fetch
                    +-----------+
                          |
                    Stage 2 fails (loadContent throws after retries)
                          v
                    +-----------+
                    | Stage 3   | Hard reload
                    |           | - window.location.reload()
                    |           | - Store reload timestamp in localStorage
                    +-----------+
                          |
                    3+ reloads within 10 min (detected via localStorage)
                          v
                    +-----------+
                    | Stage 4   | Full reset + alert
                    |           | - clearCache() + clear recovery state
                    |           | - window.location.reload()
                    |           | - Next heartbeat reports recovery_exhausted
                    |           |   in telemetry -> server raises alert
                    +-----------+
```

**Key design decisions:**
- useAutoRecovery returns action descriptors (`{ action: 'content_recovery' }`), not side effects. ViewPage executes actions -- follows existing hook pattern.
- Crash counting uses localStorage (survives page reload, synchronous on startup). Same pattern as existing `STORAGE_KEYS` usage throughout the player.
- Recovery stage included in telemetry payload so server can raise `device_recovery_exhausted` alert without the player needing to call alertEngineService directly (player runs as anon, may not have permissions).
- Stability timer: if player runs for 5 min without issues, reset crash counter to 0.

#### 3. Content Verification Flow (New)

```
usePlayerContent loads content:
  -> supabase.rpc('get_resolved_player_content', screenId)
  <- content payload: { mode, items: [...], playlist: {...}, screen: {...} }

useContentVerification runs after items change:
  -> For each media item URL:
       fetch(url, { method: 'HEAD' })
       Check: response.ok && parseInt(Content-Length) > 0
  -> Result: { verified: N, failed: N, failedUrls: [...] }
  -> If all verified: include 'ok' in telemetry
  -> If some failed:
       For failed items: attempt re-fetch of full content
       If re-fetch succeeds: update cache, mark ok
       If re-fetch fails: mark as unavailable, include 'partial' or 'failed' in telemetry
  -> If > 50% fail: server-side alert via telemetry content_verification status
```

**Why lightweight (HEAD requests, not SHA-256 hashing):**
- Player runs on Tizen, WebOS, cheap Android sticks -- CPU/memory constrained
- Media files can be hundreds of MB (videos) -- hashing blocks main thread, causes playback jank
- HTTP HEAD is ~50ms per item vs seconds for hash computation
- Server-side `cached_content_hash` (JSON stringify hash, already exists) catches server-side content changes
- HEAD request catches CDN failures, expired presigned URLs, deleted files, network issues
- For cached items (offline mode): check IndexedDB entry exists and blob.size > 0

#### 4. Telemetry Data Pipeline (Enhancement of Existing Heartbeat)

**Current heartbeat payload:**
```javascript
updateDeviceStatus(screenId, playerVersion, cachedContentHash)
// Returns: { success, timestamp, needs_screenshot_update }
```

**Enhanced heartbeat with telemetry (piggybacked, not separate):**
```javascript
const telemetry = {
  uptime_seconds: Math.floor((Date.now() - pageLoadTime) / 1000),
  recovery_stage: autoRecovery.stageRef.current,       // 0-4
  recovery_events: recoveryEventCount,                  // since last heartbeat
  content_verification: 'ok' | 'partial' | 'failed',
  current_content_id: currentItem?.id || null,
  items_count: items.length,
  cache_size_bytes: cacheSize.total,                    // from getCacheSize()
  memory_usage_mb: performance?.memory?.usedJSHeapSize
    ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  connection_type: navigator.connection?.effectiveType || null,
  is_offline_mode: isOfflineMode,
  visibility_state: document.visibilityState,
};

updateDeviceStatus(screenId, playerVersion, cachedContentHash, telemetry);
```

**Database change -- store as JSONB snapshot (latest state only):**
```sql
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS player_telemetry JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_telemetry_at TIMESTAMPTZ;

-- Extend existing RPC (backwards compatible -- new param has DEFAULT NULL)
CREATE OR REPLACE FUNCTION public.update_device_status(
  p_device_id UUID,
  p_player_version TEXT DEFAULT NULL,
  p_cached_content_hash TEXT DEFAULT NULL,
  p_telemetry JSONB DEFAULT NULL
) RETURNS JSONB ...
  -- Existing update logic, plus:
  player_telemetry = COALESCE(p_telemetry, player_telemetry),
  last_telemetry_at = CASE WHEN p_telemetry IS NOT NULL THEN now() ELSE last_telemetry_at END,
```

**Why JSONB snapshot, not time-series:**
- `player_network_metrics` already stores time-series network data (latency, jitter, packet loss)
- Telemetry like recovery stage, content verification, cache size = **current state**. Only the latest value matters.
- JSONB on `tv_devices` is simple, queryable, avoids a new table
- Admin UI reads `tv_devices.player_telemetry` for screen detail display -- single row read
- If time-series is needed later, add a new table following the `player_network_metrics` pattern

#### 5. Service Worker Watchdog (Enhancement of Existing sw.js)

The existing `sw.js` is registered by `offlineService.registerServiceWorker()` and handles message types (`SYNC_HEARTBEATS`, `SYNC_SCREENSHOTS`, `CHECK_CONTENT_UPDATES`). The watchdog ping/pong pattern adds frozen-main-thread detection:

```javascript
// In sw.js -- add to existing service worker
let lastPong = Date.now();
const WATCHDOG_INTERVAL = 30000;   // Check every 30s
const WATCHDOG_TIMEOUT = 90000;    // 90s without response = frozen

setInterval(() => {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    for (const client of clients) {
      if (Date.now() - lastPong > WATCHDOG_TIMEOUT) {
        // Main thread is frozen -- force navigation reload
        client.navigate(client.url);
      } else {
        client.postMessage({ type: 'WATCHDOG_PING' });
      }
    }
  });
}, WATCHDOG_INTERVAL);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'WATCHDOG_PONG') {
    lastPong = Date.now();
  }
  // ... existing message handling (SYNC_HEARTBEATS, etc.)
});
```

```javascript
// In offlineService.js handleServiceWorkerMessage -- add case:
case 'WATCHDOG_PING':
  navigator.serviceWorker.controller?.postMessage({ type: 'WATCHDOG_PONG' });
  break;
```

#### 6. Alert System (Existing -- Two Additions)

The alert pipeline is fully built. Two additions:

**New alert types:**
```javascript
// In alertEngineService.js ALERT_TYPES:
CONTENT_VERIFICATION_FAILED: 'content_verification_failed',
DEVICE_RECOVERY_EXHAUSTED: 'device_recovery_exhausted',

// New escalation rules:
content_verification_failed: {
  escalateToCriticalAfterOccurrences: 3,
  occurrenceWindowHours: 1,
},
// device_recovery_exhausted: immediately critical, no escalation needed

// New helper functions:
export async function raiseContentVerificationAlert(device, failedCount, totalCount) { ... }
export async function raiseRecoveryExhaustedAlert(device, crashCount) { ... }
```

**Database migration:**
```sql
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN (
  'device_offline', 'device_screenshot_failed', 'device_cache_stale',
  'device_error', 'schedule_missing_scene', 'schedule_conflict',
  'data_source_sync_failed', 'social_feed_sync_failed',
  'content_expired', 'storage_quota_warning', 'api_rate_limit',
  'content_verification_failed', 'device_recovery_exhausted'
));
```

**Server-side stale screenshot detection** (optional, via Supabase Edge Function cron):
```sql
-- Find online devices with stale or missing screenshots
SELECT id, device_name, tenant_id
FROM tv_devices
WHERE is_online = true
  AND last_seen > now() - interval '5 minutes'
  AND (last_screenshot_at IS NULL OR last_screenshot_at < now() - interval '30 minutes');
```

---

## New vs. Modified Components (Explicit Summary)

### New Files to Create

| File | Purpose | Estimated Size |
|------|---------|---------------|
| `src/player/hooks/useAutoRecovery.js` | Multi-stage recovery orchestration with localStorage crash counter | ~100 lines |
| `src/player/hooks/useContentVerification.js` | Content URL accessibility checking via HEAD requests | ~70 lines |
| `src/player/services/telemetryCollector.js` | Aggregate health metrics for heartbeat payload | ~50 lines |
| `supabase/migrations/XXX_player_hardening.sql` | Add telemetry columns to tv_devices, new alert types | ~50 lines |

### Existing Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/player/hooks/usePlayerHeartbeat.js` | Add periodic screenshot timer, accept telemetry, pass to updateDeviceStatus | LOW -- additive to existing sendBeat |
| `src/player/hooks/index.js` | Export `useAutoRecovery`, `useContentVerification` | TRIVIAL |
| `src/player/pages/ViewPage.jsx` | Wire useAutoRecovery (replace direct stuck callbacks), wire useContentVerification, pass telemetry | MEDIUM -- coordinator changes but structure unchanged |
| `src/services/alertEngineService.js` | Add 2 entries to ALERT_TYPES, escalation rules, helper functions | LOW -- purely additive |
| `src/services/playerService.js` | Extend updateDeviceStatus to accept optional telemetry param | LOW -- backwards compatible |
| `src/components/ScreenDetailDrawer.jsx` | Add screenshot image section with timestamp + refresh button | LOW -- UI addition only |
| `src/components/notifications/NotificationBell.jsx` | Add 2 icon mappings to TYPE_ICONS object | TRIVIAL (2 lines) |
| `src/player/offlineService.js` | Add WATCHDOG_PONG response in handleServiceWorkerMessage | TRIVIAL (3 lines) |
| `public/sw.js` | Add watchdog ping/pong interval | LOW -- additive |

### Files That Need NO Changes

| File | Why |
|------|-----|
| `src/services/realtimeService.js` | Already handles all WebSocket subscriptions needed |
| `src/services/notificationDispatcherService.js` | Already dispatches any alert type to in-app + email |
| `src/services/screenshotService.js` | Already has full capture/upload/store with alert integration |
| `src/player/cacheService.js` | Already has all needed IndexedDB stores with LRU |
| `src/services/deviceSyncService.js` | Already manages refresh flags |
| `src/hooks/usePlayerMetrics.js` | Already collects network metrics independently |
| `src/services/playbackTrackingService.js` | Already tracks scene/player events |
| `src/pages/AlertsCenterPage.jsx` | Already renders all alert types generically |
| `src/player/hooks/useStuckDetection.js` | No structural change -- ViewPage rewires callbacks |
| `src/player/hooks/usePlayerCommands.js` | Already handles reboot/reload/clear_cache/reset |
| `src/player/hooks/usePlayerPlayback.js` | Already manages timing and video control |

---

## Patterns to Follow

### Pattern 1: Hook Composition with Ref-Based Communication

ViewPage is the coordinator. Hooks communicate via refs (not state) to avoid re-render cascades on resource-constrained devices.

```javascript
// CORRECT: ViewPage wires hooks together via refs
const { loadContentRef } = usePlayerContent(screenId, navigate);
usePlayerHeartbeat(screenId, loadContentRef, contentContainerRef);

// WRONG: Hooks importing other hooks' internal functions
// useAutoRecovery should NOT import usePlayerContent
```

### Pattern 2: Heartbeat Piggybacking

All player-to-server communication piggybacks on the 30s heartbeat. Never create new setInterval for server communication.

### Pattern 3: Alert Raise + Auto-Resolve Pairing

Every new alert type has both a raise path and resolution path. Example from existing code:
```javascript
// screenshotService.js -- on failure:
await raiseScreenshotFailedAlert(device, failureCount, error.message);
// screenshotService.js -- on success:
await autoResolveAlert({ type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED, deviceId });
```

### Pattern 4: Scoped Logging

Every module uses `createScopedLogger` or `useLogger`:
```javascript
const logger = createScopedLogger('useAutoRecovery');
// OR in hooks:
const logger = useLogger('useAutoRecovery');
```

### Pattern 5: Graceful Degradation

All hardening code is non-blocking. Telemetry/verification/recovery failures must never prevent content playback:
```javascript
try { telemetry = collect(); } catch { telemetry = null; }
await updateDeviceStatus(screenId, ver, hash, telemetry); // null telemetry is fine
```

### Pattern 6: localStorage Crash Counter

Track recovery state across page reloads via localStorage (synchronous, survives reload):
```javascript
const RECOVERY_KEY = 'player_recovery_state';
// Read on page load, increment on crash, reset after 5 min stability
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: New Polling Intervals
**Instead:** Piggyback on existing 30s heartbeat. Content verification runs once on content load (event-driven).

### Anti-Pattern 2: Heavy Operations on Player
**Instead:** HTTP HEAD for URL verification (not SHA-256 on blobs). JSONB snapshot for telemetry (not time-series). Cache size via existing `getCacheSize()`.

### Anti-Pattern 3: Monitoring Dashboard
**Instead:** Screenshot on ScreenDetailDrawer. Alerts via existing NotificationBell + AlertsCenterPage. Per user requirement.

### Anti-Pattern 4: Direct Side Effects in Hooks
**Instead:** Return action descriptors from useAutoRecovery. ViewPage executes.

### Anti-Pattern 5: Breaking RPC Backwards Compatibility
**Instead:** New params have `DEFAULT NULL`. Old player versions continue to work.

### Anti-Pattern 6: Alert Storm
**Instead:** Existing alert coalescing (unique index) + rate limiting (5/min/source) already prevents this.

---

## Build Order (Dependency-Based)

```
Phase 1: Telemetry Foundation
  NEW: telemetryCollector.js, migration (tv_devices columns, alert types)
  MODIFY: playerService.js, usePlayerHeartbeat.js
  RATIONALE: All other features depend on reporting health state

Phase 2: Screenshot Enhancement
  MODIFY: usePlayerHeartbeat.js (periodic auto-capture), ScreenDetailDrawer.jsx
  RATIONALE: Simplest user-visible feature, builds on Phase 1 heartbeat

Phase 3: Auto-Recovery
  NEW: useAutoRecovery.js
  MODIFY: ViewPage.jsx, alertEngineService.js (recovery_exhausted type)
  RATIONALE: Uses telemetry (Phase 1) to report recovery events

Phase 4: Content Verification
  NEW: useContentVerification.js
  MODIFY: ViewPage.jsx, alertEngineService.js (verification_failed type)
  RATIONALE: Most nuanced. Depends on recovery (Phase 3) for failure handling

Phase 5: Service Worker Watchdog + Alert Tuning
  MODIFY: sw.js (watchdog), offlineService.js (pong handler)
  TUNE: escalation thresholds, stale screenshot detection
  RATIONALE: Polish pass after all features exist
```

---

## Scalability Considerations

| Concern | At 100 screens | At 1K screens | At 10K screens |
|---------|---------------|---------------|----------------|
| Heartbeat writes | 200/min, negligible | 2K/min, fine for Supabase | 20K/min, may need 60s interval |
| Screenshot storage | 500 files, ~50MB | 5K files, ~500MB | 50K files, 5GB -- tighten cleanup to 3 |
| Telemetry (JSONB snapshot) | 100 rows updated/min | 1K rows/min, fine | 10K rows/min, single UPDATE per row OK |
| Alert coalescing | Works | Works | Unique index prevents bloat at any scale |
| Network metrics time-series | 200 rows/min | 2K rows/min | 20K rows/min -- need partition/TTL |
| Content verification | ~50 HEAD requests on load | Unchanged (per-device, not per-minute) | Unchanged |

---

## Sources

All findings based on direct analysis of source files in `/Users/massimodamico/bizscreen/`:

**Player hooks:** `src/player/hooks/usePlayerHeartbeat.js`, `usePlayerContent.js`, `usePlayerCommands.js`, `usePlayerPlayback.js`, `useStuckDetection.js`, `useKioskMode.js`, `useTapSequence.js`, `useDataRefreshOrchestrator.js`, `useWidgetData.js`, `index.js`

**Player services:** `src/player/offlineService.js`, `src/player/cacheService.js`

**Shared services:** `src/services/screenshotService.js`, `src/services/playerService.js`, `src/services/realtimeService.js`, `src/services/deviceSyncService.js`, `src/services/alertEngineService.js`, `src/services/notificationDispatcherService.js`, `src/services/playerAnalyticsService.js`, `src/services/playbackTrackingService.js`

**Admin components:** `src/components/ScreenDetailDrawer.jsx`, `src/components/notifications/NotificationBell.jsx`

**Database migrations:** `supabase/migrations/072_device_heartbeat.sql`, `075_device_screenshots.sql`, `082_alerts_notifications.sql`

**Hooks:** `src/hooks/usePlayerMetrics.js`, `src/hooks/useLogger.js`

**Coordinator:** `src/player/pages/ViewPage.jsx`

**Confidence:** HIGH for all findings -- every claim verified against actual source code.
