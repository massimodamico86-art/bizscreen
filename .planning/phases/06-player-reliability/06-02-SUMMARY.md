---
phase: 06-player-reliability
plan: 02
subsystem: player
tags: [offline, screenshot, indexeddb, sha256, crypto, cache]

# Dependency graph
requires:
  - phase: 06-01
    provides: calculateBackoff with full jitter for retry logic
provides:
  - Offline screenshot sync with blob serialization
  - Kiosk password verification with SHA-256 hash caching
  - FIFO upload ordering for queued screenshots
affects: [kiosk-mode, player-offline, screenshot-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Blob to base64 conversion for IndexedDB persistence
    - crypto.subtle.digest for browser-native SHA-256 hashing
    - Dynamic import for circular dependency avoidance

key-files:
  created: []
  modified:
    - src/player/offlineService.js
    - src/services/screenshotService.js
    - src/services/playerService.js

key-decisions:
  - "Blob to base64 conversion for IndexedDB (blobs are session-specific)"
  - "FIFO ordering for screenshot upload on reconnect"
  - "SHA-256 via crypto.subtle (browser-native, no dependencies)"
  - "Plaintext fallback for legacy kiosk deployments without cached hash"

patterns-established:
  - "Blob serialization pattern: FileReader.readAsDataURL for persistence, fetch() for reconstitution"
  - "Offline queue pattern: queueOfflineEvent with navigator.onLine check"
  - "Password caching pattern: hash once on authentication, verify with cached hash"

# Metrics
duration: 5min
completed: 2026-01-23
---

# Phase 06 Plan 02: Offline Screenshot and Kiosk Password Summary

**Offline screenshot sync with base64 serialization and SHA-256 kiosk password verification**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-23T16:12:00Z
- **Completed:** 2026-01-23T16:17:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Screenshots captured offline are queued in IndexedDB with base64 encoding
- Queued screenshots auto-upload when connection restores (FIFO order)
- Kiosk exit password can be verified offline using cached SHA-256 hash
- Legacy plaintext fallback maintains backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete offline screenshot sync implementation** - `e176887` (feat)
2. **Task 2: Add offline kiosk password verification** - `8722a70` (feat)

## Files Created/Modified
- `src/player/offlineService.js` - Added blobToBase64/base64ToBlob helpers, implemented syncPendingScreenshots
- `src/services/screenshotService.js` - Added offline check and queueOfflineEvent for screenshots
- `src/services/playerService.js` - Added hashPassword, cacheKioskPasswordHash, validateKioskPasswordOffline

## Key Functions Added

| Function | File | Purpose |
|----------|------|---------|
| `blobToBase64` | offlineService.js | Convert blob to base64 data URL for IndexedDB |
| `base64ToBlob` | offlineService.js | Reconstitute blob from base64 data URL |
| `syncPendingScreenshots` | offlineService.js | Upload queued screenshots in FIFO order |
| `hashPassword` | playerService.js | SHA-256 hash via crypto.subtle (private) |
| `cacheKioskPasswordHash` | playerService.js | Store hashed password in localStorage |
| `validateKioskPasswordOffline` | playerService.js | Verify password using cached hash |

## Decisions Made
- **Blob serialization:** Use FileReader.readAsDataURL for blob-to-base64 (cross-browser, handles all types)
- **Blob reconstitution:** Use fetch(base64).then(res => res.blob()) for simplicity
- **FIFO ordering:** Sort queued screenshots by createdAt before upload
- **Dynamic import:** Use `await import('../services/screenshotService.js')` in syncPendingScreenshots to avoid circular dependency
- **SHA-256 native:** Use crypto.subtle.digest (built-in, no dependencies, works in modern browsers)
- **Plaintext fallback:** If no cached hash exists, fall back to plaintext comparison with warning log

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PLR-02 (offline screenshot sync) and PLR-03 (offline password verification) complete
- Ready for PLR-04 (empty catch block replacement)
- Player.jsx has uncommitted changes from 06-01 Task 2 (empty catch block logging) - should be addressed

---
*Phase: 06-player-reliability*
*Completed: 2026-01-23*
