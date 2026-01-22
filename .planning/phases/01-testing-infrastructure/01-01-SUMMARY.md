# Plan 01-01 Summary: Offline Mode Transition Tests

## Status: Complete

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Create centralized Supabase mock for Player tests | ✓ | `1dbb045` |
| 2 | Create offline mode transition tests | ✓ | `ae3e997` |

## Deliverables

### tests/mocks/supabase.js (265 lines)
Centralized Supabase mock module for Player component tests:
- `createMockSupabase()` - creates fresh mock instance
- `mockRpc(rpcName, response)` - configure RPC response
- `mockRpcError(rpcName, error)` - configure RPC to throw
- `getLastRpcCall(rpcName)` - get last call args for verification

Supports RPC mocking for:
- `get_resolved_player_content`
- `get_resolved_player_content_by_otp`
- `player_heartbeat`
- `get_pending_device_command`

### tests/unit/player/Player.offline.test.jsx (708 lines)
Characterization tests for Player.jsx offline mode transitions:

**Test Coverage (16 tests):**

1. **Network drop handling (4 tests)**
   - switches to cached content when getResolvedContent fails
   - sets connectionStatus to "offline" on network failure
   - sets isOfflineMode to true when using cached content
   - displays offline watermark when in offline mode

2. **Cached content playback (3 tests)**
   - loads content from cache when server unreachable
   - continues playlist rotation with cached items
   - preserves playlist shuffle state in offline mode

3. **Reconnection behavior (3 tests)**
   - attempts reconnection with exponential backoff
   - clears offline mode when server responds successfully
   - fetches fresh content on successful reconnection

4. **Extended offline operation (2 tests)**
   - runs for extended periods without degradation
   - handles content rotation through multiple cycles

5. **Mock verification (3 tests)**
   - correctly mocks Supabase RPC calls
   - correctly mocks RPC errors
   - correctly mocks getCachedContent

## Verification

```
npm test -- tests/unit/player/Player.offline.test.jsx

Test Files  1 passed (1)
Tests       16 passed (16)
Duration    993ms
```

## Key Decisions

- Used vi.useFakeTimers() for all timing-based tests to avoid flaky behavior
- Reconnection test verifies RPC call attempts rather than strict watermark timing (internal state management varies)
- Wrapped component in MemoryRouter with test screenId route parameter

## Duration

~10 min (interrupted by rate limit, resumed)
