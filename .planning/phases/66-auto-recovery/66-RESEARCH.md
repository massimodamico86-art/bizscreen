# Phase 66: Auto-Recovery - Research

**Researched:** 2026-02-20
**Domain:** Player self-healing, blank/frozen screen detection, progressive recovery with crash counter safety
**Confidence:** HIGH

## Summary

Phase 66 adds auto-recovery to the BizScreen player so that screens self-heal from blank, frozen, or crashed states without operator intervention. The codebase already has substantial infrastructure to build on: `useStuckDetection` monitors video stalls (30s threshold) and page inactivity (5 minutes), `usePlayerContent` caches content to IndexedDB for offline fallback, and `playerService.js` provides exponential backoff retry with full jitter. The existing `onPageStuck` callback already calls `window.location.reload()` -- Phase 66 needs to wrap this with a crash counter to prevent infinite restart loops, add blank screen detection (React white-screen-of-death), and implement a cached content fallback when reloads fail to restore playback.

The core implementation pattern is a **persistent crash counter stored in localStorage** that increments before each recovery attempt and resets on successful content display. When the counter reaches 6, the player stops attempting recovery and displays a static fallback screen with device identification and a human-readable error message. Between counter 1 and 5, the player follows a progressive recovery strategy: first attempt tries a soft content reload (re-fetch from server), subsequent attempts escalate to full page reload (`window.location.reload()`), and if reload fails to produce visible content, the player falls back to cached content from IndexedDB.

**Primary recommendation:** Extend `useStuckDetection` with blank screen detection (DOM empty check on the content container), add a `useAutoRecovery` hook that wraps the recovery logic with a localStorage-persisted crash counter, and create a `RecoveryFallbackScreen` component for the static fallback display when all recovery attempts are exhausted (6 failed restarts).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RECV-01 | Player detects blank screen or frozen content and auto-reloads | Extend `useStuckDetection` with blank-screen detection (check `contentContainerRef` children count and computed background); integrate with new `useAutoRecovery` hook that triggers soft reload then hard reload via `window.location.reload()` |
| RECV-02 | Player falls back to cached content when reload fails to restore playback | `usePlayerContent.loadContent()` already has IndexedDB offline fallback via `getCachedContent()`; add explicit cached-content-only path in `useAutoRecovery` when post-reload content fetch fails |
| RECV-03 | Player tracks crash count to prevent infinite restart loops (max 6 restarts, then static fallback) | localStorage `player_recovery_count` key persists across page reloads; increment before reload, check on mount; if >= 6, render `RecoveryFallbackScreen` instead of content; reset counter on successful content display |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI components and hooks | Already the project framework |
| `useStuckDetection` | N/A (internal) | Video stall and page inactivity monitoring | Existing hook with 30s/5min thresholds, already wired in ViewPage |
| `usePlayerContent` | N/A (internal) | Content loading with offline fallback | Existing hook with IndexedDB caching and retry logic |
| `playerService.js` | N/A (internal) | Offline cache, retry with backoff | Existing IndexedDB cache + exponential backoff utilities |
| `cacheService.js` | N/A (internal) | IndexedDB scene/media caching via `idb` | Existing LRU-evicted cache with scene, media, data source stores |
| localStorage | Browser API | Crash counter persistence across reloads | Survives page reload, synchronous reads on mount |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `loggingService.js` | N/A (internal) | Scoped structured logging | For recovery event logging (detection, attempt, success, failure, exhaustion) |
| `usePlayerHeartbeat` | N/A (internal) | Heartbeat with telemetry and screenshot | For reporting recovery state via heartbeat metrics (Phase 64 dependency) |
| `offlineService.js` | N/A (internal) | Offline detection and sync queue | For queueing recovery events when offline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage for crash counter | sessionStorage | sessionStorage clears on tab close -- crash counter MUST survive `window.location.reload()`, and localStorage does |
| localStorage for crash counter | IndexedDB (via cacheService) | IndexedDB is async; crash counter must be checked synchronously on mount before any async operations; localStorage is synchronous and immediate |
| DOM empty check for blank detection | MutationObserver | MutationObserver adds complexity; a periodic check (already in useStuckDetection's 10s interval) is simpler and sufficient |
| requestAnimationFrame watchdog | setInterval watchdog | rAF stops in background tabs; setInterval is more reliable for headless/kiosk signage players that should always be in foreground |

**Installation:**
No new packages needed. All dependencies are already in the project.

## Architecture Patterns

### Recommended Changes Structure
```
src/
  player/
    hooks/
      useStuckDetection.js     # MODIFY: Add blank screen detection
      useAutoRecovery.js        # CREATE: Recovery orchestrator with crash counter
    components/
      RecoveryFallbackScreen.jsx # CREATE: Static fallback when recovery exhausted
    pages/
      ViewPage.jsx              # MODIFY: Wire useAutoRecovery, render fallback
```

### Pattern 1: Persistent Crash Counter via localStorage
**What:** A crash counter that persists across page reloads using localStorage. The counter increments BEFORE a reload attempt (so it survives the reload) and resets AFTER content successfully renders.
**When to use:** Every recovery attempt that involves `window.location.reload()`.
**Example:**
```javascript
// Recovery state keys in localStorage
const RECOVERY_KEYS = {
  crashCount: 'player_recovery_count',
  lastRecoveryAt: 'player_last_recovery_at',
  recoveryPhase: 'player_recovery_phase', // 'soft_reload' | 'hard_reload' | 'cached_fallback' | 'exhausted'
};

const MAX_RECOVERY_ATTEMPTS = 6;

/**
 * Get current crash count (synchronous -- safe on mount)
 */
function getCrashCount() {
  const count = localStorage.getItem(RECOVERY_KEYS.crashCount);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment crash count BEFORE reload
 * Returns the new count so caller can decide whether to proceed
 */
function incrementCrashCount() {
  const newCount = getCrashCount() + 1;
  localStorage.setItem(RECOVERY_KEYS.crashCount, String(newCount));
  localStorage.setItem(RECOVERY_KEYS.lastRecoveryAt, new Date().toISOString());
  return newCount;
}

/**
 * Reset crash count (call on successful content display)
 */
function resetCrashCount() {
  localStorage.removeItem(RECOVERY_KEYS.crashCount);
  localStorage.removeItem(RECOVERY_KEYS.lastRecoveryAt);
  localStorage.removeItem(RECOVERY_KEYS.recoveryPhase);
}
```

### Pattern 2: Blank Screen Detection via DOM Check
**What:** Detect blank/white screen by checking if the content container has visible children. Works for both React rendering failures (white screen of death) and content loading failures.
**When to use:** On the same 10-second interval as existing stuck detection.
**Example:**
```javascript
/**
 * Check if the content container appears blank.
 * Returns true if:
 * - Container ref is null (not mounted)
 * - Container has no child elements
 * - Container's only child is an empty text node
 */
function isScreenBlank(contentContainerRef) {
  const container = contentContainerRef?.current;
  if (!container) return true;

  // Check if container has any meaningful child elements
  if (container.children.length === 0) return true;

  // Check if content area has zero dimensions (collapsed/hidden)
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return true;

  return false;
}
```

### Pattern 3: Progressive Recovery Strategy
**What:** Escalating recovery actions based on crash count, from soft reload to hard reload to cached fallback to static fallback screen.
**When to use:** When blank/frozen screen is detected.
**Example:**
```javascript
/**
 * Determine recovery action based on current crash count
 *
 * Count 0-1: Soft reload (re-fetch content without page reload)
 * Count 2-4: Hard reload (window.location.reload())
 * Count 5:   Cached content fallback (load from IndexedDB only)
 * Count >= 6: Static fallback screen (stop all recovery)
 */
function getRecoveryAction(crashCount) {
  if (crashCount >= MAX_RECOVERY_ATTEMPTS) return 'exhausted';
  if (crashCount >= 5) return 'cached_fallback';
  if (crashCount >= 2) return 'hard_reload';
  return 'soft_reload';
}

async function executeRecovery(action, screenId, loadContentRef) {
  switch (action) {
    case 'soft_reload':
      // Re-fetch content from server without page reload
      await loadContentRef.current?.(screenId, true); // true = use retry
      break;

    case 'hard_reload':
      // Full page reload -- crash counter was already incremented
      window.location.reload();
      break;

    case 'cached_fallback':
      // Load cached content only, don't try server
      const cached = await getCachedContent(`content-${screenId}`);
      if (cached) {
        // Set content from cache
        return { content: cached, fromCache: true };
      }
      // No cache available, escalate to hard reload
      window.location.reload();
      break;

    case 'exhausted':
      // Stop -- render static fallback screen
      return { exhausted: true };
  }
}
```

### Pattern 4: Static Fallback Screen
**What:** A minimal, self-contained React component that displays when all recovery attempts are exhausted. Shows device identification so operators know which screen is affected.
**When to use:** When crash count >= 6 (MAX_RECOVERY_ATTEMPTS).
**Example:**
```jsx
function RecoveryFallbackScreen({ screenId, screenName, crashCount, lastRecoveryAt }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
        {/* Warning icon */}
        <div style={{
          width: '5rem', height: '5rem',
          background: '#ef4444', borderRadius: '50%',
          margin: '0 auto 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Recovery Failed
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          This screen has encountered repeated errors and automatic recovery has been disabled.
        </p>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Screen: {screenName || screenId || 'Unknown'}
        </p>
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Attempts: {crashCount} | Please restart the device manually
        </p>
      </div>
    </div>
  );
}
```

### Pattern 5: Recovery State Reporting via Heartbeat
**What:** Extend the heartbeat metrics payload to include recovery state, so the server knows when a device is in recovery mode or has exhausted recovery attempts.
**When to use:** On every heartbeat, piggybacked on existing telemetry metrics.
**Example:**
```javascript
// Add to collectDeviceMetrics() in usePlayerHeartbeat.js
// Phase 66 recovery state
const crashCount = parseInt(localStorage.getItem('player_recovery_count') || '0', 10);
if (crashCount > 0) {
  metrics.recovery_crash_count = crashCount;
  metrics.recovery_phase = localStorage.getItem('player_recovery_phase') || 'unknown';
  metrics.recovery_last_at = localStorage.getItem('player_last_recovery_at');
}
```

### Anti-Patterns to Avoid
- **Relying on sessionStorage for crash counter:** sessionStorage does not survive `window.location.reload()` in all browsers consistently. localStorage is the correct choice for data that must persist across page reloads.
- **Auto-recovery without a crash counter:** Without a maximum retry limit, a player stuck in a crash loop will continuously reload, consuming resources and generating noise in telemetry. The 6-attempt cap is critical.
- **Checking for blank screen immediately on mount:** React needs time to render. A blank screen check that fires before the initial render completes will false-positive on every page load. Add a grace period (5-10 seconds after mount) before enabling blank screen detection.
- **Service worker watchdog for frozen main thread:** REQUIREMENTS.md explicitly defers `PLAY-01` (service worker watchdog) to a future milestone. Do not implement a service worker watchdog in Phase 66.
- **Resetting crash counter in the wrong place:** The counter must only reset when content is VISIBLY DISPLAYED, not when the content fetch succeeds. A successful fetch that fails to render (React error) should not reset the counter.
- **Clearing all localStorage on recovery:** The crash counter itself is in localStorage. Clearing all localStorage during recovery would destroy the counter and create an infinite loop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff retry | Custom retry loop | `playerService.calculateBackoff()` and `retryWithBackoff()` | Already handles full jitter, max delay, configurable attempts |
| Offline content fallback | Custom IndexedDB reads | `playerService.getCachedContent()` and `usePlayerContent.loadContent()` | Already implements server-first-then-cache pattern |
| Video stall detection | New stall monitor | Existing `useStuckDetection` hook with `onVideoStuck` callback | Already monitors video progress with 30s threshold |
| Page inactivity detection | New inactivity monitor | Existing `useStuckDetection` hook with `onPageStuck` callback | Already monitors lastActivityRef with 5-minute threshold |
| Structured logging | Console.log calls | `createScopedLogger('AutoRecovery')` | Project convention, consistent format |

**Key insight:** The player already detects stuck states via `useStuckDetection` and already handles offline content fallback via `usePlayerContent`. Phase 66 is primarily about adding a crash counter safety layer and a new blank-screen detection signal to the existing detection infrastructure, not building detection from scratch.

## Common Pitfalls

### Pitfall 1: Infinite Reload Loop
**What goes wrong:** Player detects a problem, reloads, detects the same problem, reloads again indefinitely. Screen flickers constantly, consumes bandwidth, generates noise.
**Why it happens:** No crash counter, or counter resets too early (e.g., on successful fetch before content renders).
**How to avoid:** Increment crash counter in localStorage BEFORE calling `window.location.reload()`. On mount, check counter FIRST (synchronously) before any async operations. Only reset counter after content is confirmed visually displayed (e.g., after `contentContainerRef.current.children.length > 0` check passes).
**Warning signs:** Rapid sequential heartbeats from the same device, rapidly incrementing `recovery_crash_count` in metrics.

### Pitfall 2: False Positive Blank Screen Detection
**What goes wrong:** The blank screen detector fires during normal page load or content transitions, triggering unnecessary recovery.
**Why it happens:** React hasn't finished rendering yet, or a content transition momentarily clears the DOM.
**How to avoid:** (1) Add a grace period after mount (e.g., 10 seconds) before enabling blank screen detection. (2) Require the blank state to persist for multiple consecutive checks (e.g., 3 checks at 10-second intervals = 30 seconds of confirmed blankness). (3) Don't check during the `loading` state from `usePlayerContent`.
**Warning signs:** Recovery events triggering on content switch or initial page load.

### Pitfall 3: Crash Counter Not Surviving Tab Crash
**What goes wrong:** If the browser tab process crashes entirely (OOM, GPU crash), localStorage writes may not have flushed.
**Why it happens:** localStorage writes are synchronous but the underlying storage commit may be async on some platforms.
**How to avoid:** Write the crash counter BEFORE initiating recovery (not after). Use `localStorage.setItem()` which is synchronous and blocks until complete. For browser-tab-level crashes (as opposed to JS errors), the counter from the previous recovery will still be in place.
**Warning signs:** Devices with zero crash count but showing symptoms of repeated crashes (check telemetry timestamp gaps).

### Pitfall 4: Cached Content Also Fails
**What goes wrong:** The player falls back to cached content, but the cached content is also corrupt or incompatible (e.g., schema change after an update).
**Why it happens:** Cache was written by a previous player version, or the cached content references external resources that are no longer available.
**How to avoid:** When loading cached content, wrap the entire render in a try-catch. If cached content fails to render, immediately increment the crash counter and proceed toward the static fallback screen rather than trying to re-cache.
**Warning signs:** Player cycling between cached fallback and hard reload without ever reaching stable content.

### Pitfall 5: Recovery Timing Conflicts with Heartbeat Screenshot
**What goes wrong:** A recovery reload triggers at the same time as a screenshot capture, corrupting the screenshot or delaying recovery.
**Why it happens:** Both `useStuckDetection` and `usePlayerHeartbeat` run on independent intervals.
**How to avoid:** Check `screenshotInProgressRef` before initiating a hard reload. If a screenshot is in progress, defer the recovery by one cycle. The 10-second stuck detection interval means at most a 10-second delay.
**Warning signs:** Corrupt screenshots during recovery events.

## Code Examples

### useAutoRecovery Hook Skeleton
```javascript
// src/player/hooks/useAutoRecovery.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import { getCachedContent } from '../../services/playerService';

const RECOVERY_KEYS = {
  crashCount: 'player_recovery_count',
  lastRecoveryAt: 'player_last_recovery_at',
  recoveryPhase: 'player_recovery_phase',
};

const MAX_RECOVERY_ATTEMPTS = 6;
const BLANK_SCREEN_GRACE_MS = 10000; // 10s after mount before checking
const BLANK_CONFIRM_CHECKS = 3; // Must be blank for 3 consecutive checks

export function useAutoRecovery({
  screenId,
  contentContainerRef,
  loadContentRef,
  loading,
  content,
}) {
  const logger = useLogger('useAutoRecovery');
  const [isExhausted, setIsExhausted] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const blankCheckCountRef = useRef(0);

  // Check crash count on mount (synchronous)
  useEffect(() => {
    const count = getCrashCount();
    if (count >= MAX_RECOVERY_ATTEMPTS) {
      logger.error('Recovery exhausted', { crashCount: count });
      setIsExhausted(true);
    }
  }, [logger]);

  // Reset crash count when content successfully renders
  useEffect(() => {
    if (!loading && content && contentContainerRef?.current?.children?.length > 0) {
      const count = getCrashCount();
      if (count > 0) {
        logger.info('Content displayed successfully, resetting crash counter', {
          previousCount: count,
        });
        resetCrashCount();
      }
      blankCheckCountRef.current = 0;
    }
  }, [loading, content, contentContainerRef, logger]);

  // Recovery trigger
  const triggerRecovery = useCallback(async (reason) => {
    const count = incrementCrashCount();
    const action = getRecoveryAction(count);

    logger.warn('Recovery triggered', { reason, crashCount: count, action });

    // Store recovery phase for telemetry
    localStorage.setItem(RECOVERY_KEYS.recoveryPhase, action);

    switch (action) {
      case 'soft_reload':
        try {
          await loadContentRef.current?.(screenId, true);
        } catch {
          // Soft reload failed, will be caught by next detection cycle
        }
        break;

      case 'hard_reload':
        window.location.reload();
        break;

      case 'cached_fallback':
        try {
          const cached = await getCachedContent(`content-${screenId}`);
          if (cached) {
            // Let the content hook handle it -- trigger a forced cache load
            await loadContentRef.current?.(screenId, false);
          } else {
            window.location.reload();
          }
        } catch {
          window.location.reload();
        }
        break;

      case 'exhausted':
        setIsExhausted(true);
        break;
    }
  }, [screenId, loadContentRef, logger]);

  return {
    isExhausted,
    crashCount: getCrashCount(),
    triggerRecovery,
  };
}

function getCrashCount() {
  const count = localStorage.getItem('player_recovery_count');
  return count ? parseInt(count, 10) : 0;
}

function incrementCrashCount() {
  const newCount = getCrashCount() + 1;
  localStorage.setItem('player_recovery_count', String(newCount));
  localStorage.setItem('player_last_recovery_at', new Date().toISOString());
  return newCount;
}

function resetCrashCount() {
  localStorage.removeItem('player_recovery_count');
  localStorage.removeItem('player_last_recovery_at');
  localStorage.removeItem('player_recovery_phase');
}

function getRecoveryAction(count) {
  if (count >= MAX_RECOVERY_ATTEMPTS) return 'exhausted';
  if (count >= 5) return 'cached_fallback';
  if (count >= 2) return 'hard_reload';
  return 'soft_reload';
}
```

### Extending useStuckDetection for Blank Screen
```javascript
// Add to useStuckDetection.js
// New parameter: contentContainerRef for blank screen detection

const STUCK_DETECTION = {
  maxVideoStallMs: 30000,
  maxNoActivityMs: 300000,
  checkIntervalMs: 10000,
  blankScreenGraceMs: 10000, // NEW: Grace period after mount
  blankConfirmChecks: 3,     // NEW: Consecutive blank checks to confirm
};

// Inside checkStuck():
// Blank screen detection (after grace period)
if (contentContainerRef?.current) {
  const elapsed = now - mountTimeRef.current;
  if (elapsed > STUCK_DETECTION.blankScreenGraceMs && !loading) {
    const container = contentContainerRef.current;
    const isBlank = container.children.length === 0 ||
                    container.getBoundingClientRect().width === 0;
    if (isBlank) {
      blankCheckCountRef.current++;
      if (blankCheckCountRef.current >= STUCK_DETECTION.blankConfirmChecks) {
        onBlankScreen?.({ confirmations: blankCheckCountRef.current });
        blankCheckCountRef.current = 0; // Reset after notification
      }
    } else {
      blankCheckCountRef.current = 0; // Reset if content appears
    }
  }
}
```

### ViewPage Integration
```javascript
// In ViewPage.jsx, wire the new hook:
const {
  isExhausted,
  crashCount,
  triggerRecovery,
} = useAutoRecovery({
  screenId,
  contentContainerRef,
  loadContentRef,
  loading,
  content,
});

// Update stuck detection to use triggerRecovery:
useStuckDetection({
  videoRef,
  lastVideoTimeRef,
  lastActivityRef,
  contentContainerRef, // NEW
  loading,             // NEW
  onVideoStuck: () => {
    logger.warn('Video stuck detected, attempting recovery...');
    try {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => logger.error('Video play failed', { error: err }));
    } catch (err) {
      logger.error('Video recovery failed', { error: err });
      triggerRecovery('video_stuck');
    }
  },
  onPageStuck: () => {
    logger.warn('Player inactive for too long, triggering recovery...');
    triggerRecovery('page_inactive');
  },
  onBlankScreen: () => {  // NEW
    logger.warn('Blank screen detected, triggering recovery...');
    triggerRecovery('blank_screen');
  },
});

// Render fallback if exhausted:
if (isExhausted) {
  return <RecoveryFallbackScreen
    screenId={screenId}
    screenName={content?.screen?.name}
    crashCount={crashCount}
  />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual operator intervention on blank screen | Automated detection and recovery with crash counter | Industry standard since 2023 | Eliminates need for physical access to fix transient issues |
| Simple `window.location.reload()` on error | Progressive recovery (soft -> hard -> cached -> static) | Best practice | Avoids infinite reload loops, preserves content availability |
| No persistent recovery state | localStorage crash counter with telemetry reporting | This phase | Server knows device recovery state via heartbeat metrics |
| React error boundary only | Error boundary + blank DOM detection | This phase | Catches rendering failures that don't throw (empty renders, stale state) |

**Deprecated/outdated:**
- `PLAY-01` (Service worker watchdog) is explicitly deferred to a future milestone per REQUIREMENTS.md. Do not implement.
- `RECV-04` (Multi-stage recovery escalation) and `RECV-05` (Recovery incident reports) are future requirements. Phase 66 implements the subset: RECV-01, RECV-02, RECV-03 only.

## Open Questions

1. **Crash counter reset window**
   - What we know: The crash counter should reset when content displays successfully. But if a device recovers, plays for 5 minutes, then crashes again, should the counter start from 0 or continue from where it left off?
   - What's unclear: Whether time-based decay of the crash counter is needed (e.g., reset after 30 minutes of stable operation).
   - Recommendation: Reset counter to 0 on any successful content display. If the device crashes again later, it gets a fresh set of 6 attempts. This is simpler and more forgiving. If a device is genuinely broken (hardware issue), it will exhaust 6 attempts quickly regardless.

2. **React Error Boundary interaction**
   - What we know: React 19 has `onUncaughtError` and `onCaughtError` in `createRoot`. The project uses Sentry for error tracking.
   - What's unclear: Whether the existing Sentry integration catches React rendering errors that produce blank screens. Sentry's `ErrorBoundary` component or React 19's root-level error handlers may already catch some of these.
   - Recommendation: Add an Error Boundary wrapping the content rendering area in ViewPage that falls back to triggering the `useAutoRecovery` hook rather than showing a generic error UI. This catches React rendering crashes that the DOM-check approach might miss.

3. **Recovery event reporting to server**
   - What we know: Phase 64 established the heartbeat metrics pipeline. Phase 68 will wire recovery events to alerts (ALRT-03).
   - What's unclear: Whether Phase 66 should pre-populate the recovery event data for Phase 68 or just expose it via heartbeat metrics.
   - Recommendation: Phase 66 should add `recovery_crash_count`, `recovery_phase`, and `recovery_last_at` to the heartbeat metrics payload. This gives the server visibility without requiring new API endpoints. Phase 68 can then consume these fields to generate alerts.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/player/hooks/useStuckDetection.js` -- existing stuck detection with video stall (30s) and page inactivity (5min) thresholds
- Codebase analysis: `src/player/pages/ViewPage.jsx` -- main player view with stuck detection wiring, content rendering, loading/error/empty states
- Codebase analysis: `src/player/hooks/usePlayerContent.js` -- content loading with IndexedDB offline fallback, retry with backoff
- Codebase analysis: `src/player/hooks/usePlayerHeartbeat.js` -- heartbeat with telemetry metrics and screenshot capture
- Codebase analysis: `src/player/hooks/usePlayerPlayback.js` -- playback timing with lastActivityRef and lastVideoTimeRef
- Codebase analysis: `src/services/playerService.js` -- IndexedDB cache (initOfflineCache, cacheContent, getCachedContent), calculateBackoff, retryWithBackoff, PlayerManager
- Codebase analysis: `src/player/cacheService.js` -- IndexedDB v4 with scenes, media, data sources, RSS, weather stores; LRU eviction
- Codebase analysis: `src/player/offlineService.js` -- offline detection, service worker registration, sync queue
- Codebase analysis: `src/player/components/VideoPlayer.jsx` -- per-element stall detection (30s), HLS error recovery (max 3)
- Phase 64 summaries: Telemetry pipeline established (metrics on heartbeat, pg_cron offline detection, alerts)
- Phase 65 summaries: Screenshot triggers in heartbeat (periodic, recovery, on-demand), wasOfflineRef pattern

### Secondary (MEDIUM confidence)
- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) -- freeze/resume detection
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) -- watchdog pattern (rAF stops in background)
- [MDN: Window error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event) -- global error handling
- [react-error-boundary README](https://github.com/bvaughn/react-error-boundary/blob/main/README.md) -- infinite loop detection patterns
- [Watchdog timer patterns](https://interrupt.memfault.com/blog/firmware-watchdog-best-practices) -- crash counter and persistent recovery state

### Tertiary (LOW confidence)
- Smart TV (Tizen/WebOS) behavior of localStorage persistence across app restarts is inferred from Chromium base but unverified on actual devices. If localStorage is unreliable on smart TVs, IndexedDB `deviceState` store is the fallback (requires making crash counter check async).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - extends existing hooks (`useStuckDetection`, `usePlayerContent`) with well-understood patterns; localStorage crash counter is a proven technique from embedded systems watchdog patterns
- Pitfalls: HIGH - identified from actual codebase analysis (existing stuck detection thresholds, content loading flow, heartbeat timing) and standard recovery anti-patterns (infinite loop, false positive, counter persistence)
- Browser APIs: HIGH - localStorage is universally supported; DOM checks (`children.length`, `getBoundingClientRect`) are standard; no exotic APIs needed

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
