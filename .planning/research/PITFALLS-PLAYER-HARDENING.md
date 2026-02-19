# Domain Pitfalls: Player Hardening

**Domain:** Digital signage player reliability & monitoring
**Researched:** 2026-02-19

## Critical Pitfalls

Mistakes that cause rewrites, bricked devices, or worse reliability than before.

### Pitfall 1: Infinite Reload Loop (The Recovery That Kills)

**What goes wrong**: Auto-recovery detects a stuck state and reloads the page. But the crash happens during page initialization (e.g., a Supabase schema mismatch, corrupt IndexedDB, or bad cached content). Each reload triggers the same crash, creating an infinite loop. The device becomes unreachable because it spends all CPU reloading.

**Why it happens**: Recovery logic assumes the fix is "try again." But if the bug is in the startup path itself, "try again" means "crash again."

**Consequences**: Device is effectively bricked. No heartbeat can be sent during rapid reload cycles. Operator sees "offline" but cannot even send a remote command because the player never reaches the command-listening state. Physical visit required.

**Prevention**:
- **Crash counter in localStorage** (synchronous, survives reload) that increments on every page load
- **Stability timer**: Only reset crash counter after 5 minutes of stable operation
- **Progressive backoff**: Level 1 (soft reload content), Level 2 (full page reload with delay), Level 3 (clear cache), Level 4 (show static fallback HTML, stop all recovery)
- **Fallback content stored at pairing time**: A "Please stand by" page cached in IndexedDB that does NOT depend on any server content, Supabase connection, or React rendering. Pure static HTML injected via `document.body.innerHTML`.
- **Maximum crash threshold**: After 6 crashes in 5 minutes, STOP recovering. Display fallback. Send one `DEVICE_RECOVERY_LOOP` alert (if network available).

**Detection**: Monitor `player_crash_count` in heartbeat payload. If the value is consistently > 0 across heartbeats, the device is struggling.

### Pitfall 2: html2canvas Memory Leak on Long-Running Players

**What goes wrong**: `html2canvas` creates a temporary canvas element and multiple intermediate objects each time it captures a screenshot. On long-running signage players (running 24/7 for weeks), frequent screenshots cause gradual memory growth. Eventually the player crashes with an out-of-memory error.

**Why it happens**: `html2canvas` v1.4.1 does not automatically clean up all internal references. The browser's garbage collector may not reclaim canvas memory promptly on memory-constrained smart TVs.

**Consequences**: Player crashes after days/weeks of stable operation. Hard to diagnose because the crash is delayed.

**Prevention**:
- **Limit screenshot frequency**: No more than once every 15 minutes for scheduled captures
- **Explicit canvas cleanup**: After converting to blob, explicitly set canvas width/height to 0, remove from DOM, and null all references
- **Memory check before capture**: If `performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit > 0.8`, skip the screenshot and log a warning
- **Monitor memory trend in telemetry**: If memory usage increases > 10% per hour over 4 hours, raise a warning alert

**Detection**: Telemetry showing `jsHeapPercent` steadily increasing over time. Screenshot captures taking progressively longer.

### Pitfall 3: Content Hash Mismatch False Positives from CDN Caching

**What goes wrong**: Content is updated on the server. The SHA-256 hash in the database is updated. But CloudFront CDN serves the old cached version. The player computes the hash of the old file and it doesn't match the new expected hash, triggering a content mismatch alert.

**Why it happens**: CDN edge caches have TTLs. Until the TTL expires or an invalidation propagates, the CDN serves stale content. This is expected behavior, not an error.

**Consequences**: False `DEVICE_CONTENT_MISMATCH` alerts flood the admin dashboard. Operators learn to ignore them. When a real integrity issue occurs, they miss it.

**Prevention**:
- **Grace period after content update**: Do not verify hashes for 5 minutes after a content change is detected (give CDN time to propagate)
- **Retry before alerting**: If hash mismatch, wait 60 seconds and re-fetch directly (bypassing CDN with cache-busting query param). If second fetch also mismatches, THEN alert.
- **Compare against BOTH old and new hash**: Keep the previous content hash alongside the current one. Accept either as valid during a transition window.
- **CDN invalidation integration**: When content updates, trigger CloudFront invalidation. Track invalidation status and delay verification until invalidation completes.

**Detection**: High volume of `DEVICE_CONTENT_MISMATCH` alerts that auto-resolve within minutes. Correlation with content update timestamps.

### Pitfall 4: Service Worker Watchdog Killing Healthy Tabs

**What goes wrong**: The SW watchdog sends a ping but the main thread is busy (heavy React render, video decode, or content load). The main thread doesn't respond to the ping within the timeout. SW interprets this as "frozen" and forces a navigation reload, killing a perfectly healthy session.

**Why it happens**: The watchdog timeout is too aggressive. JavaScript is single-threaded; a long task blocks message handling.

**Consequences**: Random, unexplained reloads during heavy operations. Content jumps back to beginning. User reports "screen flickers."

**Prevention**:
- **Generous timeout**: 60 seconds minimum (not 10 or 30). A 60-second freeze IS a real problem; a 5-second busy period is normal.
- **Pong with heartbeat data**: Instead of a simple pong, include `Date.now()` so the SW can measure actual response latency, not just presence/absence
- **Disable during heavy operations**: During content load, screenshot capture, or cache sync, post a `WATCHDOG_PAUSE` message to the SW. Resume after completion.
- **Progressive response**: SW should try `postMessage` before `navigate`. If the main thread responds to a second ping after the timeout, cancel the reload.

**Detection**: Telemetry showing `recovery_action: 'sw_watchdog_reload'` without corresponding errors. Sentry breadcrumbs showing normal operation immediately before reload.

## Moderate Pitfalls

### Pitfall 5: IndexedDB Corruption on Smart TVs

**What goes wrong**: Power loss or browser crash during an IndexedDB write leaves the database in a corrupt state. Subsequent reads throw errors. The player cannot load cached content and shows a blank screen.

**Prevention**:
- **Wrap all IndexedDB reads in try/catch** with fallback to "fetch from server" mode
- **Detect corruption on startup**: If `initDB()` fails, delete the database with `indexedDB.deleteDatabase()` and recreate it
- **Never store critical state ONLY in IndexedDB**: Keep essential state (screen_id, content_hash, crash_count) in localStorage as backup

### Pitfall 6: Telemetry Volume Overwhelming Supabase

**What goes wrong**: 1000 devices each sending 10 telemetry events per minute = 10K rows/minute = 14.4M rows/day. Supabase Postgres starts slowing down on queries.

**Prevention**:
- **Batch inserts**: Use a single RPC call with array parameter, not individual inserts
- **Retention policy**: Add a Supabase cron job (pg_cron) to delete telemetry older than 30 days
- **Aggregate on write**: Instead of storing every metric, compute aggregates (min/max/avg per 5-min window) on the server
- **Throttle at the client**: Cap telemetry buffer at 100 events. Drop oldest when full. Only send full diagnostics every 5 minutes, not every heartbeat.

### Pitfall 7: Screenshot Quality on Tizen/WebOS WebViews

**What goes wrong**: `html2canvas` captures a blank or partially-rendered screenshot because the smart TV webview uses hardware-accelerated video rendering that bypasses the DOM.

**Prevention**:
- **Mark video elements with `screenshot-ignore` class** (already configured in `screenshotService.js`)
- **Capture during content transition** (between playlist items) when video is not playing
- **Accept partial screenshots**: A screenshot showing the layout without video content is still valuable for diagnosing layout issues. Don't treat it as a failure.
- **Validate blob size**: Reject screenshots < 1KB (likely blank)

### Pitfall 8: Race Condition Between Recovery and Content Load

**What goes wrong**: `useAutoRecovery` triggers a soft content reload. While the reload is in progress (async), `useStuckDetection` fires again (because the reload takes > 30s). A second recovery action is triggered, conflicting with the first.

**Prevention**:
- **Recovery lock**: Set a `recoveryInProgress` ref before starting any recovery action. Check this ref in stuck detection callbacks. Clear after recovery completes or times out (2 min max).
- **Debounce stuck detection during recovery**: Temporarily increase the stuck detection thresholds while a recovery action is in progress.

## Minor Pitfalls

### Pitfall 9: localStorage Quota Exceeded

**What goes wrong**: Crash counter, content hash, and other state data fill up the ~5MB localStorage quota on some browsers.

**Prevention**: Only store small string values. Telemetry goes to IndexedDB, not localStorage. Cap any string value at 1KB.

### Pitfall 10: Battery API Not Available

**What goes wrong**: Code calls `navigator.getBattery()` which returns a rejected Promise on iOS and some Android devices, causing an unhandled promise rejection.

**Prevention**: Feature-detect with `if (navigator.getBattery)` and wrap in try/catch. Better yet, skip battery monitoring entirely -- signage displays are plugged in, not running on battery.

### Pitfall 11: Clock Skew in Telemetry Timestamps

**What goes wrong**: Smart TV system clocks may be wrong (never set, timezone incorrect). Telemetry timestamps are unreliable for correlation.

**Prevention**: Include both client timestamp and a server-generated `received_at` timestamp on the telemetry table. Use server time for dashboards and alerting. Client time is only for ordering events within a single device's session.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Auto-recovery implementation | Infinite reload loop (#1) | Crash counter with stability timer and hard max |
| Screenshot enhancement | Memory leak on long-running players (#2) | Explicit canvas cleanup, frequency limits, memory check |
| Content verification | CDN cache false positives (#3) | Grace period, retry with cache-bust, accept old+new hash |
| Service Worker watchdog | Killing healthy sessions (#4) | 60s timeout, pause during heavy operations |
| Telemetry collection | Volume overwhelms database (#6) | Batch inserts, retention policy, client-side throttle |
| IndexedDB schema bump to v5 | Corruption on power loss (#5) | Try/catch with delete-and-recreate fallback |
| Smart TV screenshot capture | Blank/partial screenshots (#7) | Validate blob size, accept partial as valid |

## Sources

- Direct codebase analysis of existing recovery, caching, and screenshot patterns
- Training data for smart TV webview behavior and IndexedDB reliability
- MDN Web Docs for API compatibility limitations
