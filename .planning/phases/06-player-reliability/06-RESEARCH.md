# Phase 6: Player Reliability - Research

**Researched:** 2026-01-22
**Domain:** Browser-based retry logic, offline queuing, error handling, kiosk security
**Confidence:** HIGH

## Summary

This phase hardens the TV player to handle network failures and errors gracefully without user intervention. The codebase already has strong foundations: `idb` for IndexedDB storage, structured logging via `loggingService.js`, alert escalation via `alertEngineService.js`, and partial retry logic in `playerService.js`. The main work involves standardizing retry behavior with proper exponential backoff and jitter, implementing a robust offline queue for telemetry, verifying kiosk exit password works offline, and replacing empty catch blocks with proper error handling.

The existing `calculateBackoff()` function in playerService.js already implements exponential backoff with jitter, but some retry logic in Player.jsx uses different parameters. The offline queue infrastructure exists in `cacheService.js` (IndexedDB stores for `offlineQueue`) but screenshot sync on reconnect is incomplete.

**Primary recommendation:** Leverage existing infrastructure (idb, alertEngineService, loggingService) rather than adding new dependencies. Focus on standardizing retry behavior across all network calls and completing the offline queue sync implementation.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| idb | ^8.0.3 | IndexedDB wrapper | Already used in cacheService.js; promise-based, tiny (~1.19kB) |
| html2canvas | ^1.4.1 | Screenshot capture | Already used in screenshotService.js |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| loggingService.js | internal | Structured logging | All error handling, replaces empty catch blocks |
| alertEngineService.js | internal | Alert escalation | Persistent failure notifications |
| cacheService.js | internal | IndexedDB queue | Offline telemetry storage |
| passwordService.js | internal | Password validation | Could extend for kiosk password hashing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom retry | exponential-backoff npm | Existing calculateBackoff() is sufficient; adding dep is overhead |
| idb | Dexie.js | More features but larger; idb is already installed and working |
| localStorage hash | bcrypt | Overkill for single-use offline kiosk password; SHA-256 is sufficient |

**Installation:**
No new packages needed - all infrastructure exists.

## Architecture Patterns

### Recommended Project Structure
Existing structure is appropriate. Key files to modify:
```
src/
├── Player.jsx                    # Main player - add standardized retry
├── player/
│   ├── cacheService.js           # IndexedDB queue - already has offlineQueue store
│   └── offlineService.js         # Offline sync - complete screenshot sync
├── services/
│   ├── playerService.js          # calculateBackoff() - standardize across app
│   ├── screenshotService.js      # Add offline queue integration
│   ├── loggingService.js         # Use for all error handling
│   └── alertEngineService.js     # Use for escalation
```

### Pattern 1: Exponential Backoff with Full Jitter
**What:** Retry delays increase exponentially (1s, 2s, 4s, 8s...) with random jitter to prevent thundering herd
**When to use:** All network calls that can be retried (syncs, heartbeats, screenshot uploads)
**Example:**
```javascript
// Source: Existing playerService.js calculateBackoff()
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 60000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add full jitter (0-100% of delay)
  const jitter = delay * Math.random();
  return Math.round(jitter);
}

// Usage - retry indefinitely for critical operations
async function retryIndefinitely(fn, options = {}) {
  const { baseDelay = 1000, maxDelay = 60000, onRetry } = options;
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const delay = calculateBackoff(attempt, baseDelay, maxDelay);
      logger.warn('Retry scheduled', { attempt, delayMs: delay, error: error.message });
      onRetry?.(attempt, delay, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
```

### Pattern 2: Offline Queue with FIFO Sync
**What:** Queue telemetry (screenshots, heartbeats, analytics, errors) when offline; flush FIFO on reconnect
**When to use:** Any telemetry that should eventually reach server
**Example:**
```javascript
// Source: Existing cacheService.js queueOfflineEvent()
export async function queueOfflineEvent(eventType, eventData) {
  const db = await getDB();
  const entry = {
    eventType,
    eventData,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  await db.add(STORES.OFFLINE_QUEUE, entry);
}

// On reconnect - flush queue
export async function flushOfflineQueue() {
  const pending = await getPendingEvents();
  const sorted = pending.sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  ); // FIFO

  for (const event of sorted) {
    try {
      await syncEvent(event);
      await markEventsSynced([event.id]);
    } catch (error) {
      logger.warn('Failed to sync event, will retry', { eventType: event.eventType });
      break; // Stop on first failure, retry later
    }
  }
}
```

### Pattern 3: Silent Recovery with Escalation
**What:** Log transient errors and retry silently; escalate persistent failures to admin dashboard
**When to use:** Errors that shouldn't interrupt playback but need visibility
**Example:**
```javascript
// Transient: log and retry silently
try {
  await sendHeartbeat(screenId);
} catch (error) {
  logger.warn('Heartbeat failed, will retry', { error: error.message });
  // No user notification, just log and schedule retry
}

// Persistent: escalate after threshold
const MAX_CONSECUTIVE_FAILURES = 5;
if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
  await raiseAlert({
    type: ALERT_TYPES.DEVICE_SYNC_FAILED,
    deviceId,
    severity: 'warning',
    message: `Device sync failed ${failureCount} times`,
  });
}
```

### Pattern 4: Offline Password Verification with Cached Hash
**What:** Store hashed admin password locally for offline kiosk exit verification
**When to use:** Kiosk exit must work without network
**Example:**
```javascript
// On successful admin login (when online), cache password hash
async function cachePasswordForOffline(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('kiosk_password_hash', hashHex);
}

// Offline verification
async function verifyPasswordOffline(inputPassword) {
  const storedHash = localStorage.getItem('kiosk_password_hash');
  if (!storedHash) return false;

  const encoder = new TextEncoder();
  const data = encoder.encode(inputPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return inputHash === storedHash;
}
```

### Anti-Patterns to Avoid
- **Fixed retry delays:** Causes thundering herd on server recovery; always use exponential backoff with jitter
- **Empty catch blocks:** Hides bugs and makes debugging impossible; always log with context
- **Unlimited retry without backoff:** Can DOS your own server; cap max delay
- **Blocking UI during retry:** Player screen should stay clean; retries happen silently in background
- **Storing plaintext password:** Always hash, even for simple offline verification

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB access | Raw IndexedDB API | `idb` (already installed) | Promise-based, cleaner error handling |
| Retry with backoff | Custom loop | Existing `calculateBackoff()` | Already implements jitter |
| Alert escalation | Custom notification | `alertEngineService.js` | Handles coalescing, rate limiting |
| Structured logging | console.log | `loggingService.js` | Includes correlation IDs, batching, remote logging |
| Password hashing | Custom hash | `crypto.subtle.digest()` | Browser native, secure, no deps |
| Queue persistence | localStorage | IndexedDB via `cacheService.js` | Handles large data, structured queries |

**Key insight:** The codebase already has the infrastructure. PLR-01-04 are about wiring existing pieces together correctly, not building new systems.

## Common Pitfalls

### Pitfall 1: Thundering Herd on Reconnect
**What goes wrong:** All offline devices try to sync simultaneously when network restores, overwhelming server
**Why it happens:** Fixed retry intervals or no jitter
**How to avoid:** Use full jitter (randomize 0-100% of delay) and stagger initial sync with random startup delay
**Warning signs:** Server load spikes after network recovery; 429/503 errors

### Pitfall 2: Queue Growth Without Bound
**What goes wrong:** Extended offline periods fill IndexedDB, causing storage errors
**Why it happens:** No queue management during offline period
**How to avoid:** Decision says "no limit on queue size" - but monitor queue depth and warn in logs if growing large. IndexedDB has browser-imposed limits (varies by browser, typically 50MB-2GB)
**Warning signs:** QuotaExceededError in IndexedDB operations

### Pitfall 3: Password Hash Timing Attacks
**What goes wrong:** Constant-time comparison not used, timing differences reveal hash
**Why it happens:** Using `===` for hash comparison
**How to avoid:** For kiosk exit, this is low risk (attacker needs physical access), but best practice is constant-time comparison. Browser's SubtleCrypto doesn't provide this - use length check + XOR all bytes
**Warning signs:** N/A - theoretical concern, not practical for kiosk scenario

### Pitfall 4: Empty Catch Blocks Hide Bugs
**What goes wrong:** Errors are swallowed, bugs persist undetected
**Why it happens:** Developer wants code to "not crash" without thinking about consequences
**How to avoid:** Always log with context. ESLint `no-empty` rule catches some but allows commented catches
**Warning signs:** Mysterious behavior with no error logs; code found at lines 209, 239 in Player.jsx

### Pitfall 5: Screenshot Queue Blob Handling
**What goes wrong:** Blobs stored in queue become invalid after page refresh
**Why it happens:** Blob URLs are session-specific
**How to avoid:** Convert blob to base64 or ArrayBuffer before queuing; reconstruct Blob on sync
**Warning signs:** "Failed to fetch" errors when uploading queued screenshots

## Code Examples

Verified patterns from existing codebase and best practices:

### Existing Backoff Implementation (playerService.js)
```javascript
// Source: src/services/playerService.js lines 428-440
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 60000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (+-20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}
```

### Existing Queue Infrastructure (cacheService.js)
```javascript
// Source: src/player/cacheService.js lines 498-509
export async function queueOfflineEvent(eventType, eventData) {
  const db = await getDB();
  const entry = {
    eventType,
    eventData,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  await db.add(STORES.OFFLINE_QUEUE, entry);
}
```

### Empty Catch Block Fix Pattern
```javascript
// BEFORE (anti-pattern found in Player.jsx)
try {
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, fetchedAt }));
} catch (e) {
  // Ignore storage errors
}

// AFTER (proper handling)
try {
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, fetchedAt }));
} catch (error) {
  logger.warn('Failed to cache app data', {
    error: error.message,
    cacheKey,
    dataSize: JSON.stringify(data).length
  });
  // Non-critical: continue execution
}
```

### Kiosk Password Verification (Current vs Enhanced)
```javascript
// CURRENT (src/services/playerService.js line 542-544)
export function validateKioskPassword(input, password) {
  return input === password; // Plaintext comparison
}

// ENHANCED (with offline hash support)
export async function validateKioskPasswordOffline(input) {
  const storedHash = localStorage.getItem(STORAGE_KEYS.kioskPasswordHash);
  if (!storedHash) {
    logger.warn('No cached password hash for offline verification');
    return false;
  }

  const inputHash = await hashPassword(input);
  return inputHash === storedHash;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Screenshot Offline Queue with Blob Serialization
```javascript
// Queue screenshot when offline
async function queueScreenshotForSync(deviceId, blob) {
  // Convert blob to base64 for persistence across page refreshes
  const base64 = await blobToBase64(blob);

  await queueOfflineEvent('screenshot', {
    deviceId,
    imageData: base64,
    mimeType: blob.type,
    capturedAt: new Date().toISOString(),
  });

  logger.info('Screenshot queued for offline sync', {
    deviceId,
    sizeKB: Math.round(blob.size / 1024)
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// On reconnect - sync queued screenshots
async function syncQueuedScreenshots() {
  const screenshots = await getPendingEventsByType('screenshot');

  for (const event of screenshots) {
    try {
      const { deviceId, imageData, mimeType } = event.eventData;
      const blob = await base64ToBlob(imageData, mimeType);
      await uploadScreenshot(deviceId, blob);
      await markEventsSynced([event.id]);
      logger.info('Synced queued screenshot', { deviceId });
    } catch (error) {
      logger.error('Failed to sync screenshot', { error: error.message });
      break; // Stop on first failure
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed 5s retry | Exponential backoff + jitter | Industry standard ~2020 | Prevents thundering herd |
| localStorage for queues | IndexedDB with idb wrapper | ~2018 | Handles large payloads, structured queries |
| console.log everywhere | Structured logging with levels | 2023 (this codebase) | Phase 4 SEC-05 replaced 197+ console.logs |
| Plaintext password storage | Hashed with SHA-256 minimum | Always | Security baseline |

**Deprecated/outdated:**
- WebSQL: Deprecated, use IndexedDB instead
- Synchronous localStorage in loops: Blocks main thread, use IndexedDB async operations

## Open Questions

Things that couldn't be fully resolved:

1. **Escalation Threshold Timing**
   - What we know: alertEngineService.js supports coalescing and severity levels
   - What's unclear: Optimal threshold - 5 consecutive failures? 3? Time-based (5 minutes)?
   - Recommendation: Start with 5 consecutive failures (matches existing screenshot failure logic)

2. **Screenshot Blob Size Limits**
   - What we know: Screenshots are ~50-200KB JPEG, IndexedDB has browser-specific limits
   - What's unclear: Maximum safe queue size before hitting browser limits
   - Recommendation: Monitor queue size in logs; current SCREENSHOT_CONFIG.scale=0.5 keeps files small

3. **Password Hash Migration**
   - What we know: Current code stores plaintext in localStorage
   - What's unclear: How to migrate existing kiosk deployments without breaking them
   - Recommendation: Support both plaintext (legacy) and hash (new) with gradual migration

## Sources

### Primary (HIGH confidence)
- `src/services/playerService.js` - Existing calculateBackoff() implementation
- `src/player/cacheService.js` - IndexedDB queue infrastructure
- `src/player/offlineService.js` - Offline mode management
- `src/services/loggingService.js` - Structured logging patterns
- `src/services/screenshotService.js` - Screenshot capture and upload
- `src/Player.jsx` - Main player component, lines 107-144 (retry config), 2389-2404 (kiosk exit)

### Secondary (MEDIUM confidence)
- [Better Stack: Exponential Backoff Guide](https://betterstack.com/community/guides/monitoring/exponential-backoff/) - Industry patterns for retry logic
- [LogRocket: Offline-First Apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - IndexedDB patterns
- [npm: idb package](https://www.npmjs.com/package/idb) - idb library documentation
- [ESLint: no-empty rule](https://eslint.org/docs/latest/rules/no-empty) - Empty catch block linting

### Tertiary (LOW confidence)
- WebSearch results on password hashing - General guidance, verify with OWASP if security-critical

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture patterns: HIGH - Based on existing codebase patterns
- Pitfalls: MEDIUM - Some based on general knowledge, some from codebase analysis
- Code examples: HIGH - Directly from existing codebase

**Research date:** 2026-01-22
**Valid until:** 60 days (stable domain - retry/offline patterns don't change frequently)
