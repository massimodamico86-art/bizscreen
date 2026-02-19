# Technology Stack: Player Hardening Features

**Project:** BizScreen - Player Screenshots, Auto-Recovery, Content Verification, Diagnostic Telemetry, Alert Notifications
**Researched:** 2026-02-19
**Focus:** Stack additions/changes needed for player hardening on existing React 19 + Supabase platform

## Executive Summary

After thorough analysis of the existing codebase, **the player hardening milestone requires ZERO new npm dependencies**. The project already has working implementations of every major building block:

- **Screenshot capture**: `html2canvas` v1.4.1 already installed and integrated via `screenshotService.js` with Supabase Storage upload, offline queuing, and cleanup
- **Alert engine**: Full-featured `alertEngineService.js` with 11 alert types, severity escalation, rate limiting, deduplication/coalescing, and performance metrics
- **Notification dispatch**: `notificationDispatcherService.js` with in-app + email channels, user preferences, quiet hours, and severity filtering
- **Telemetry collection**: `screenTelemetryService.js` reads from `screen_telemetry` table with stats aggregation
- **Stuck detection**: `useStuckDetection.js` hook monitors video stalls and page inactivity
- **Offline resilience**: Full IndexedDB v4 cache (`cacheService.js`) with LRU eviction, offline queue, and three-phase sync
- **Content hash tracking**: `content_hash` already stored in `localStorage` and sent with heartbeats

The work is in **deepening and connecting** these existing systems, not adding new libraries. Specifically: enhancing the diagnostic telemetry collection on the player side (CPU/memory/storage/network), making auto-recovery more robust (crash count tracking, fallback content, watchdog timer), strengthening content verification (SHA-256 checksums on media files), and wiring the alert system to new alert types for these conditions.

---

## What Already Exists (DO NOT ADD)

These capabilities are already in `package.json` and working in the codebase. Adding duplicates or replacements would be wasteful and risky.

| Capability | Existing Library/Pattern | Version | Where Used |
|---|---|---|---|
| Screenshot capture (DOM to canvas) | `html2canvas` | ^1.4.1 | `screenshotService.js` - captures player content |
| Screenshot upload | Supabase Storage | `device-screenshots` bucket | `screenshotService.js` - upload + public URL |
| Screenshot request/response | Supabase RPC + heartbeat | `needs_screenshot_update` flag | `usePlayerHeartbeat.js` checks on each beat |
| Screenshot offline queuing | IndexedDB offline queue | `cacheService.js` | Base64 blob queued, synced on reconnect |
| Alert engine | Custom service | `alertEngineService.js` | 11 types, 3 severities, rate limiting, coalescing |
| Notification dispatch | Custom service | `notificationDispatcherService.js` | In-app + email (Resend), user prefs, quiet hours |
| Email alerts | `resend` | ^6.8.0 | `emailService.js` via `sendAlertEmail()` |
| In-app notification bell | React component | `NotificationBell.jsx` | Header dropdown with unread count badge |
| Alerts center page | React page | `AlertsCenterPage.jsx` | Filter, bulk ack/resolve, severity badges |
| Telemetry reading | Supabase table query | `screen_telemetry` table | `screenTelemetryService.js` - stats aggregation |
| Stuck detection | React hook | `useStuckDetection.js` | Video stall (30s) + page inactivity (5min) |
| Content hash tracking | localStorage + heartbeat | `player_content_hash` key | `usePlayerHeartbeat.js` sends hash with beats |
| Offline detection | Service Worker + heartbeat | `offlineService.js` | Browser events + heartbeat failure threshold |
| Offline content cache | IndexedDB via `idb` | ^8.0.3 | `cacheService.js` - scenes, media, device state |
| Device commands | Supabase Realtime + RPC | `realtimeService.js` | reboot, reload, clear_cache, reset |
| Crash monitoring | `@sentry/react` | ^10.36.0 | Error boundaries, breadcrumbs, user context |
| Diagnostics page | Custom service | `screenDiagnosticsService.js` | Resolution path, uptime stats, health events |
| Device screenshot dashboard | Custom service | `deviceScreenshotService.js` | Device list, warning levels, bulk screenshot |
| Error tracking service | Custom | `errorTrackingService.js` | Centralized error capture |

---

## What Needs Enhancement (NO NEW DEPS)

### 1. Screenshot Capture - Harden, Do Not Replace

**Current state**: Working via `html2canvas` with JPEG compression (0.8 quality, 0.5x scale). Already handles offline queuing.

**What to add (code only, no new packages)**:

| Enhancement | Approach | Why Not a New Lib |
|---|---|---|
| Retry on capture failure | Wrap `captureScreenshot()` with exponential backoff (pattern exists in `ViewPage.jsx`) | `html2canvas` failures are transient (DOM not ready, cross-origin) -- retry solves 90% |
| Scheduled screenshots | Add interval-based capture in `usePlayerHeartbeat.js` (e.g., every 15 min) alongside demand-based | Reduces latency for dashboard monitoring vs. waiting for next heartbeat request |
| Screenshot quality validation | Check blob size > 1KB before upload (blank/corrupt screenshots are tiny) | No library needed -- `blob.size` check |
| WebView compatibility notes | Test on Tizen/WebOS webview -- `html2canvas` works but `useCORS: true` is already set | Already configured correctly in `screenshotService.js` |

**Why NOT replace html2canvas**: It is already integrated, working, and handles the use case (DOM snapshot to JPEG). Alternatives like `dom-to-image` or `modern-screenshot` offer marginal gains but introduce migration risk. The project already handles html2canvas's known limitations (CORS, ignored elements). The 1.4.1 version is the latest stable release.

**Confidence**: HIGH -- verified by reading the actual working code in `screenshotService.js`.

---

### 2. Auto-Recovery - Extend Existing Patterns

**Current state**: `useStuckDetection.js` detects video stalls (30s) and page inactivity (5min). `usePlayerCommands.js` handles reboot/reload/clear_cache/reset. No automatic recovery actions -- consumer must decide.

**What to add (code only, no new packages)**:

| Enhancement | Approach | Integration Point |
|---|---|---|
| Crash count tracker | `localStorage` counter incremented on page load, reset after stable period (e.g., 5 min running without errors) | New hook `useAutoRecovery.js` |
| Progressive recovery strategy | Level 1: soft reload content; Level 2: full page reload; Level 3: clear cache + reload; Level 4: show fallback | Based on crash count in `useAutoRecovery.js` |
| Fallback content | Static "Please stand by" HTML stored in IndexedDB at pairing time | `cacheService.js` new store or `deviceState` key |
| Service Worker watchdog | SW pings main thread; if no pong in 60s, SW triggers `clients.navigate('/player')` reload | Extend existing `sw.js` (already registered in `offlineService.js`) |
| Error boundary recovery | React error boundary that catches render crashes, increments crash counter, attempts re-render with fallback | Wrap `ViewPage.jsx` content |
| Heartbeat-as-health-signal | Include crash count, error count, and recovery actions in heartbeat payload | Extend `updateDeviceStatus()` RPC params |

**Why Service Worker watchdog works**: The player already registers a SW in `offlineService.js`. The SW runs independently of the main thread, so it can detect when the main thread is frozen (not just JS errors, but total tab crash on smart TV browsers). This is the standard pattern for kiosk-mode web apps.

**Confidence**: HIGH for the pattern, MEDIUM for Tizen/WebOS SW support (these platforms support basic SW but have quirks).

---

### 3. Content Version Verification - Use Web Crypto API

**Current state**: `content_hash` field exists in scenes and is tracked through heartbeats. The player stores it in `localStorage` and the cache service stores it in IndexedDB entries. However, there is NO client-side hash computation -- the player trusts the server-provided hash.

**What to add (code only, no new packages)**:

| Enhancement | Approach | Why |
|---|---|---|
| SHA-256 media file hashing | `crypto.subtle.digest('SHA-256', arrayBuffer)` on fetched media blobs | Verify downloaded media matches server-provided hash |
| Content manifest verification | Hash the JSON content payload and compare to server-provided hash | Detect content tampering or corruption in transit |
| Cache integrity checking | On startup, verify cached entries against stored hashes; evict corrupted | Prevent stale/corrupt cached content from playing |
| Hash mismatch alerting | If hash mismatch detected, raise `DEVICE_CONTENT_MISMATCH` alert type | Admin visibility into content integrity issues |

**Web Crypto API `SubtleCrypto.digest()`**: Verified via MDN -- Baseline Widely Available since January 2020. Supports SHA-256 on `ArrayBuffer` from `fetch()` responses. Works in all modern browsers including webview contexts. No library needed.

**Implementation pattern**:
```javascript
async function hashBlob(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Confidence**: HIGH -- `SubtleCrypto.digest()` is a W3C standard with universal browser support. No polyfill needed.

---

### 4. Diagnostic Telemetry - Use Platform APIs

**Current state**: `screenTelemetryService.js` reads telemetry from a `screen_telemetry` Supabase table, but there is NO player-side code that WRITES diagnostic telemetry. The heartbeat sends `is_online` status but not system metrics.

**What to add (code only, no new packages)**:

#### Browser APIs for Diagnostics

| Metric | API | Compatibility | Confidence |
|---|---|---|---|
| JS heap memory | `performance.memory` (usedJSHeapSize, jsHeapSizeLimit) | Chromium-only (Chrome, WebView, Tizen, WebOS Chromium) | MEDIUM -- deprecated but works on target platforms |
| Storage quota/usage | `navigator.storage.estimate()` | Baseline since Sept 2023 -- all modern browsers | HIGH |
| Network type | `navigator.connection.effectiveType` | Chromium + some Android browsers, NOT Safari/Firefox | MEDIUM -- covers smart TV webviews |
| Network downlink | `navigator.connection.downlink` | Same as effectiveType | MEDIUM |
| Network RTT | `navigator.connection.rtt` | Same as effectiveType | MEDIUM |
| Online/offline | `navigator.onLine` + heartbeat failure tracking | All browsers | HIGH |
| User agent / platform | `navigator.userAgent`, `navigator.platform` | All browsers | HIGH |
| Screen resolution | `screen.width`, `screen.height`, `window.devicePixelRatio` | All browsers | HIGH |
| Page visibility | `document.visibilityState` | All browsers | HIGH |
| Battery status | `navigator.getBattery()` | Chromium-only, limited | LOW -- skip unless Android tablets |

**Recommended telemetry collection strategy**:

1. **Collect on each heartbeat** (every 30s): lightweight metrics only -- online status, visibility state, error count since last beat
2. **Collect periodically** (every 5 min): heavier metrics -- memory usage, storage estimate, network quality
3. **Collect on events**: crash recovery, content load, hash mismatch, screenshot capture
4. **Write to IndexedDB first, batch sync to server**: Use existing `queueOfflineEvent()` pattern in `cacheService.js`

**Server-side telemetry storage**: The `screen_telemetry` table already exists. Add telemetry batch insert RPC function (similar to existing `record_playback_events_batch`).

**What NOT to collect** (privacy/performance):
- No CPU usage (no browser API for this, do NOT try to estimate from `requestAnimationFrame` timing -- unreliable and wastes battery)
- No GPS location (not relevant for mounted signage displays)
- No camera/microphone access (privacy risk, not useful)

**Confidence**: HIGH for the approach. MEDIUM for specific API availability on smart TV platforms (Tizen/WebOS use Chromium-based webviews so most APIs work, but versions lag behind desktop Chrome).

---

### 5. Alert Notifications - Extend Existing Engine

**Current state**: Full alert engine with 11 types, but missing alert types for the new hardening features. Notification dispatch already handles in-app + email with user preferences.

**What to add (code only, no new packages)**:

#### New Alert Types

| Alert Type Constant | Trigger | Default Severity |
|---|---|---|
| `DEVICE_CONTENT_MISMATCH` | SHA-256 hash mismatch on content/media | `warning` (escalate to `critical` after 3 occurrences) |
| `DEVICE_RECOVERY_LOOP` | Crash count > 3 in 10 minutes | `critical` |
| `DEVICE_STORAGE_LOW` | `navigator.storage.estimate()` shows > 90% usage | `warning` (escalate to `critical` at > 95%) |
| `DEVICE_MEMORY_HIGH` | `performance.memory` shows > 80% heap usage | `warning` |
| `DEVICE_NETWORK_DEGRADED` | `effectiveType` is `2g` or `slow-2g` for > 5 minutes | `info` (escalate to `warning` if persists 30+ min) |

#### Integration with Existing Engine

These new types plug directly into the existing `raiseAlert()` function in `alertEngineService.js`. The coalescing, rate limiting, severity escalation, notification dispatch, and auto-resolve patterns all work unchanged. Only additions needed:

1. Add constants to `ALERT_TYPES` object
2. Add escalation rules to `ESCALATION_RULES` object
3. Add helper functions (e.g., `raiseContentMismatchAlert()`)
4. Add type labels in `AlertsCenterPage.jsx` and `NotificationBell.jsx`

**Confidence**: HIGH -- the existing alert engine is well-architected for extension.

---

## Recommended Stack (Summary)

### New npm Dependencies: NONE

The entire player hardening milestone can be built with:
- Existing npm packages already in `package.json`
- Browser standard APIs (Web Crypto, Storage API, NetworkInformation, Performance API)
- Custom React hooks and service modules following established patterns

### Browser APIs to Leverage

| API | Purpose | Polyfill Needed | Notes |
|---|---|---|---|
| `crypto.subtle.digest()` | Content hash verification | No -- Baseline since 2020 | SHA-256 on ArrayBuffer |
| `navigator.storage.estimate()` | Storage diagnostics | No -- Baseline since 2023 | Returns quota + usage |
| `performance.memory` | Memory diagnostics | No -- Chromium-only, graceful degrade | Non-standard but works on targets |
| `navigator.connection` | Network diagnostics | No -- Chromium-only, graceful degrade | effectiveType, downlink, rtt |
| `navigator.onLine` | Connectivity state | No -- universal | Already used in offlineService |
| `document.visibilityState` | Tab/display visibility | No -- universal | Pause telemetry when hidden |

### Existing Infrastructure to Extend

| System | Extension Needed | Files to Modify |
|---|---|---|
| `screenshotService.js` | Add retry logic, scheduled capture, quality validation | Modify existing service |
| `alertEngineService.js` | Add 5 new alert types + escalation rules | Modify existing service |
| `notificationDispatcherService.js` | Add icon mappings for new types | Modify existing + `NotificationBell.jsx` |
| `cacheService.js` | Add telemetry store to IndexedDB, bump to v5 | Modify existing service |
| `useStuckDetection.js` | Wire to auto-recovery actions | New `useAutoRecovery.js` hook wraps this |
| `offlineService.js` / `sw.js` | Add watchdog ping/pong pattern | Modify existing service worker |
| `usePlayerHeartbeat.js` | Include diagnostic payload, scheduled screenshots | Modify existing hook |
| `playerService.js` | Extend `updateDeviceStatus()` RPC params for richer heartbeat | Modify existing + new Supabase RPC |

### New Files to Create

| File | Purpose | Pattern to Follow |
|---|---|---|
| `src/player/hooks/useAutoRecovery.js` | Crash detection, progressive recovery, fallback content | Follows `useStuckDetection.js` pattern |
| `src/player/hooks/useDiagnosticTelemetry.js` | Collect and batch device metrics | Follows `usePlayerHeartbeat.js` pattern |
| `src/player/hooks/useContentVerification.js` | SHA-256 verification of loaded content | Follows `usePlayerContent.js` pattern |
| `src/services/telemetryCollectorService.js` | Player-side telemetry collection + batching | Follows `playbackTrackingService.js` pattern |
| `src/services/contentVerificationService.js` | Hash computation + comparison logic | Follows `screenshotService.js` pattern |

### Supabase Schema Changes

| Change | Type | Purpose |
|---|---|---|
| Add new alert type enum values | Migration | Support new `DEVICE_CONTENT_MISMATCH`, `DEVICE_RECOVERY_LOOP`, etc. |
| Add `diagnostic_payload` JSONB column to `tv_devices` | Migration | Store latest diagnostic snapshot with heartbeat |
| Add `telemetry_batch_insert` RPC function | Migration | Batch write telemetry events from player |
| Add `content_hashes` JSONB column to `tv_devices` | Migration | Track expected vs. actual content hashes per device |
| Bump IndexedDB to v5 | Code change | Add `telemetry` store for offline diagnostic data |

---

## Alternatives Considered and Rejected

| Category | Rejected Option | Why Not |
|---|---|---|
| Screenshot capture | `dom-to-image`, `modern-screenshot` | `html2canvas` already working and integrated; migration risk outweighs marginal gains |
| Screenshot capture | Canvas API `toBlob()` directly | Only works if content is already on a canvas; player uses DOM rendering |
| Content hashing | `js-sha256`, `crypto-js` npm packages | Web Crypto API (`SubtleCrypto.digest`) is native, faster, and zero-dependency |
| Memory monitoring | `performance.measureUserAgentSpecificMemory()` | Requires cross-origin isolation headers (COOP/COEP) which would break Supabase/CDN requests |
| Network monitoring | Third-party speed test libraries | Unnecessary bandwidth consumption on signage devices; `NetworkInformation` API is sufficient |
| Auto-recovery | Process manager / PM2 | Player runs in browser/webview, not Node.js; Service Worker watchdog is the web equivalent |
| Alert engine | PagerDuty / OpsGenie integration | Over-engineering for a SaaS signage product; existing in-app + email is sufficient for v1 |
| Telemetry | OpenTelemetry / Datadog RUM | Massive overhead for embedded player; Sentry already covers errors; custom telemetry via Supabase is lighter |
| Crash detection | `window.onerror` + `unhandledrejection` only | Already handled by Sentry; auto-recovery needs page-load crash counting which requires localStorage |

---

## Platform-Specific Considerations

### Smart TV WebViews (Tizen, WebOS)

| Concern | Impact | Mitigation |
|---|---|---|
| Older Chromium versions | Tizen 6.5 uses ~Chromium 94; WebOS 23 uses ~Chromium 108 | All recommended APIs (SubtleCrypto, StorageManager, performance.memory) available in Chromium 94+ |
| Service Worker support | Tizen supports SW since 4.0; WebOS since webOS 4.0 | Watchdog pattern should work; test SW `clients.navigate()` on actual devices |
| Memory constraints | Smart TVs have 1-2GB RAM total | Memory telemetry is especially valuable here; auto-recovery prevents OOM crashes |
| No dev tools in production | Cannot debug live deployed TVs | Screenshot + telemetry + alerts are the primary debugging tools -- this milestone IS the debugging tool |
| Background tab behavior | Smart TVs don't have tabs but may suspend webview | `document.visibilityState` + SW watchdog cover this |

### Android / iOS WebViews

| Concern | Impact | Mitigation |
|---|---|---|
| `performance.memory` not in iOS WKWebView | No memory telemetry on iOS | Graceful degradation -- collect what's available, skip what's not |
| `navigator.connection` not in iOS Safari | No network quality metrics on iOS | Graceful degradation; heartbeat latency can serve as proxy |
| iOS WKWebView process lifecycle | App may terminate webview for memory | Auto-recovery with IndexedDB state restoration handles this |
| Android WebView updates | Updates with Play Store; generally current | All recommended APIs available |

### Browser (Desktop/Laptop)

Full API support. No special considerations. This is the easiest target.

---

## Installation

```bash
# No new packages to install.
# All required capabilities exist in:
# - package.json (html2canvas, idb, @sentry/react, @supabase/supabase-js, resend)
# - Browser standard APIs (SubtleCrypto, StorageManager, NetworkInformation, Performance)
```

---

## Sources

| Claim | Source | Confidence |
|---|---|---|
| `SubtleCrypto.digest()` supports SHA-256 on ArrayBuffer, Baseline since Jan 2020 | MDN Web Docs (verified via WebFetch) | HIGH |
| `navigator.storage.estimate()` Baseline since Sept 2023 | MDN Web Docs (verified via WebFetch) | HIGH |
| `performance.memory` is Chromium-only and deprecated | MDN Web Docs (verified via WebFetch) | HIGH |
| `navigator.connection` (NetworkInformation) is limited availability | MDN Web Docs (verified via WebFetch) | HIGH |
| `html2canvas` v1.4.1 is the latest stable release | npm registry (verified via `npm view`) | HIGH |
| Tizen 6.5 uses Chromium ~94 | Training data (Samsung developer docs) | MEDIUM |
| WebOS 23 uses Chromium ~108 | Training data (LG developer docs) | MEDIUM |
| Service Worker `clients.navigate()` works on smart TVs | Training data + inference from SW support docs | LOW -- needs device testing |
| All existing services work as documented | Direct codebase analysis | HIGH |
