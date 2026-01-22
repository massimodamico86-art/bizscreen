---
phase: 01-testing-infrastructure
plan: 03
subsystem: testing
tags: [vitest, react-testing-library, player, heartbeat, reconnection, fake-timers]

# Dependency graph
requires:
  - phase: 01-01
    provides: Testing infrastructure and patterns
provides:
  - Heartbeat mechanism characterization tests
  - Reconnection behavior tests
  - Connection status transition tests
  - Player component test patterns with fake timers
affects: [player-refactoring, offline-mode, device-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fake timer testing with vi.useFakeTimers() and advanceTimersByTimeAsync
    - Global localStorage mocking for Player component
    - Comprehensive service mocking pattern for Player.jsx

key-files:
  created:
    - tests/unit/player/Player.heartbeat.test.jsx
  modified: []

key-decisions:
  - "Use vi.runAllTimersAsync() for initial render to flush all effects"
  - "Mock localStorage at global level before module imports"
  - "Test reconnection via RPC call counts rather than internal state"
  - "Use /player/view route to bypass pairing screen in tests"

patterns-established:
  - "Player component testing: Mock all 15+ services, render in MemoryRouter"
  - "Timer testing: Use vi.advanceTimersByTimeAsync for interval-based behavior"
  - "Connection testing: Verify behavior through mock call assertions"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 01 Plan 03: Heartbeat/Reconnection Tests Summary

**22 passing characterization tests for Player.jsx heartbeat (30s interval) and reconnection (error recovery, status transitions) using fake timers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-22T17:16:16Z
- **Completed:** 2026-01-22T17:24:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Heartbeat mechanism tests verify 30-second interval, player version, and content hash
- Device status update tests verify updateDeviceStatus calls and screenshot handling
- Refresh status checking tests verify needs_refresh detection and flag clearing
- Reconnection behavior tests verify error tracking, recovery attempts, and polling continuation
- Connection status transition tests verify state machine (connecting -> connected -> reconnecting -> offline -> connected)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create heartbeat mechanism tests** - `b219bf1` (test)
2. **Task 2: Create reconnection behavior tests** - `b219bf1` (test)

*Note: Both tasks in same commit as they modify the same file*

## Files Created/Modified

- `tests/unit/player/Player.heartbeat.test.jsx` - 623 lines, 22 tests covering heartbeat and reconnection

## Test Coverage

### Heartbeat Mechanism (12 tests)
- Heartbeat interval: 4 tests (immediate send, 30s interval, version, content hash)
- Device status updates: 2 tests (updateDeviceStatus call, screenshot handling)
- Refresh status checking: 4 tests (check, reload, clear flag, continue on failure)
- Heartbeat cleanup: 2 tests (unmount cleanup, no heartbeat without screenId)

### Reconnection Behavior (8 tests)
- Error tracking: 3 tests (track errors, reconnecting after 3, reset on success)
- Reconnection attempts: 2 tests (loadContent call, recovery)
- Connection status transitions: 3 tests (initial connect, reconnection scenario, polling recovery)

### Constants (2 tests)
- HEARTBEAT_INTERVAL value and export verification

## Decisions Made

1. **Use behavior-based assertions** - Tests verify service calls (updateDeviceStatus, supabase.rpc) rather than internal React state, making tests more resilient to implementation changes
2. **Mock 15+ services comprehensively** - Player.jsx has many dependencies; all must be mocked to isolate heartbeat behavior
3. **Global localStorage mock** - Applied before module imports to ensure component initialization works correctly
4. **Render at /player/view** - Bypasses pairing screen to test heartbeat behavior directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **localStorage mock timing** - Initial approach using vi.spyOn failed because component accessed localStorage during module initialization. Fixed by defining global localStorage mock before imports.

2. **Missing analytics exports** - playerAnalyticsService mock was incomplete (missing initSession, stopSession). Added all required exports to mock.

3. **waitFor timeout with fake timers** - Original tests using waitFor() with async polling timed out. Fixed by using vi.runAllTimersAsync() to flush all pending timers and promises.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Heartbeat and reconnection behaviors are now characterized with tests
- Ready for Player.jsx refactoring with regression protection
- Test patterns established for additional Player characterization tests

---
*Phase: 01-testing-infrastructure*
*Completed: 2026-01-22*
