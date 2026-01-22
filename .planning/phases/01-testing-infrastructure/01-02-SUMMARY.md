---
phase: 01-testing-infrastructure
plan: 02
subsystem: testing
tags: [vitest, react-testing-library, player, content-sync, mocking]

# Dependency graph
requires:
  - phase: 01-01
    provides: Testing infrastructure and mock patterns for Player tests
provides:
  - Content sync flow characterization tests for Player.jsx
  - 30-second polling cycle verification
  - Content hash change detection tests
  - Realtime refresh event tests
  - Playlist rendering and transition tests
affects: [03-player-refactoring, player-sync-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mock supabase.rpc for RPC calls
    - vi.useFakeTimers for polling/timing tests
    - subscribeToDeviceRefresh callback capture pattern

key-files:
  created:
    - tests/unit/player/Player.sync.test.jsx
  modified: []

key-decisions:
  - "Used callback capture pattern for realtime refresh event testing"
  - "Used relative call count assertions instead of exact counts due to heartbeat refresh checks"

patterns-established:
  - "Player test mock pattern: mock all services before importing Player component"
  - "QRCodeSVG mock required for Player rendering tests"
  - "localStorage mock via Object.defineProperty for isolated storage tests"

# Metrics
duration: 5min
completed: 2026-01-22
---

# Phase 01 Plan 02: Content Sync Flow Tests Summary

**22 characterization tests for Player.jsx content synchronization: initial load, 30s polling, hash detection, realtime events, and playlist transitions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-22T17:16:28Z
- **Completed:** 2026-01-22T17:21:22Z
- **Tasks:** 2 (implemented together as single comprehensive test file)
- **Files created:** 1

## Accomplishments

- Created comprehensive content sync test suite (22 tests, 906 lines)
- Verified initial content load via getResolvedContent RPC
- Verified 30-second polling interval with content hash comparison
- Verified realtime refresh events (scene_change, refresh_requested)
- Verified playlist item rendering (images, videos, app widgets)
- Verified item transitions and duration handling

## Task Commits

1. **Task 1: Create content sync flow tests** - `5c21a16` (test)
   - Includes all Task 2 content (rendering and transitions)

**Plan metadata:** Pending final commit

## Files Created/Modified

- `tests/unit/player/Player.sync.test.jsx` - Content sync flow and rendering characterization tests (906 lines)

## Test Coverage

### Content Sync Flow (15 tests)
- Initial content load (5 tests)
  - Fetches content using getResolvedContent on mount
  - Sets content state with server response
  - Processes playlist items correctly
  - Applies shuffle when playlist.shuffle is true
  - Caches content for offline use after successful fetch
- Polling for updates (5 tests)
  - Polls for content every 30 seconds
  - Detects content changes via hash comparison
  - Updates content when hash changes
  - Resets playlist index to 0 on content update
  - Sends heartbeat during poll cycle
- Content hash tracking (3 tests)
  - Stores content hash in localStorage
  - Compares stored hash with new content hash
  - Updates hash after content change
- Realtime refresh events (2 tests)
  - Refreshes content when scene_change event received
  - Refreshes content when refresh_requested event received

### Content Rendering (7 tests)
- Playlist item display (3 tests)
  - Renders image items with correct src
  - Renders video items with correct src
  - Renders app widgets (weather, qr, etc)
- Item transitions (4 tests)
  - Advances to next item after duration expires
  - Loops back to first item after last item
  - Re-shuffles playlist on cycle completion when shuffle enabled
  - Respects item-specific duration over default

## Decisions Made

1. **Combined Tasks 1 and 2 into single commit** - Both tasks modify the same file and were implemented comprehensively together. This follows the atomic commit principle while avoiding artificial separation.

2. **Used relative call count assertions** - Instead of exact call counts (toHaveBeenCalledTimes(2)), used relative comparisons (toBeGreaterThan(initialCalls)) because heartbeat refresh checks trigger additional RPC calls.

3. **Callback capture pattern for realtime events** - Used mockImplementation to capture the refresh callback, then invoked it manually to simulate realtime events.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **vi.mock hoisting issue** - Initial approach of defining mock functions before vi.mock() failed because vi.mock is hoisted. Fixed by using inline vi.fn() in mock factory and importing mocks via dynamic import.

2. **Missing QRCodeSVG mock** - Player.jsx imports qrcode.react which contains JSX. Added mock: `vi.mock('qrcode.react', () => ({ QRCodeSVG: () => null }))`.

3. **Heartbeat sends null contentHash on first call** - The heartbeat fires before content loads, so contentHash is null initially. Fixed assertion to use `expect.anything()` instead of `expect.any(String)`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Content sync behavior is now characterized by tests
- Safe to refactor Player.jsx sync logic with test coverage
- Mock patterns established for future Player tests

---
*Phase: 01-testing-infrastructure*
*Completed: 2026-01-22*
