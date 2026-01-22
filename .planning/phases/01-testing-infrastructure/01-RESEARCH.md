# Phase 1: Testing Infrastructure - Research

**Researched:** 2026-01-22
**Domain:** React Component Testing, Vitest, MSW, Characterization Tests
**Confidence:** HIGH

## Summary

This research investigates the testing infrastructure needed to create characterization tests for Player.jsx, a large (~2700 lines) React component handling offline mode, heartbeat reconnection, content sync, and media playback. The existing codebase already uses Vitest with React Testing Library and has some service-level unit tests as examples.

The standard approach is to use Vitest (already configured in the project) with React Testing Library for component rendering, MSW for mocking Supabase RPC calls, and vi.useFakeTimers() for controlling time-dependent behaviors like heartbeats and content polling. Characterization tests should capture current behavior before refactoring, focusing on observable outcomes rather than implementation details.

**Primary recommendation:** Build characterization tests using the existing Vitest setup, mock Supabase via vi.mock() for simplicity (MSW optional for complex scenarios), use fake timers to control heartbeat/polling intervals, and mock navigator.onLine + window events for offline mode testing.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.0.14 | Test runner and assertion library | Already configured, 10-20x faster than Jest, native ES module support |
| @testing-library/react | ^16.3.0 | Component testing utilities | User-centric testing approach, already installed |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers | Extended assertions (toBeInTheDocument, etc.), already configured |
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Realistic event handling, already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| msw | ^2.12.3 | Network request mocking | Already installed, use for complex Supabase interactions |
| jsdom | ^27.3.0 | DOM implementation | Already configured as Vitest environment |
| @vitest/coverage-v8 | ^4.0.14 | Coverage reporting | Already configured, track test coverage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vi.mock for Supabase | msw handlers | MSW is more realistic but adds complexity; vi.mock is simpler for RPC-style calls |
| vi.useFakeTimers | Real timers | Real timers cause slow, flaky tests; fake timers are deterministic |
| Component rendering | Snapshot tests | Snapshots are brittle; behavior tests are more stable during refactoring |

**Installation:**
All dependencies already installed. No additional packages needed.

## Architecture Patterns

### Recommended Test File Structure
```
tests/
  unit/
    player/
      Player.test.jsx          # Main characterization tests for Player.jsx
      Player.offline.test.jsx  # Offline mode specific tests
      Player.sync.test.jsx     # Content sync tests
      Player.heartbeat.test.jsx # Heartbeat/reconnection tests
      offlineService.test.js   # Already exists - expand
    services/
      scheduleService.test.js  # Already exists - expand
  mocks/
    supabase.js               # Centralized Supabase mock
    handlers.js               # MSW handlers if needed
```

### Pattern 1: Characterization Test Structure
**What:** Tests that capture and lock current behavior before refactoring
**When to use:** When adding tests to legacy code that will be refactored
**Example:**
```javascript
// Source: Characterization testing pattern
describe('Player.jsx characterization', () => {
  describe('offline mode transitions', () => {
    it('switches to cached content when network drops', async () => {
      // Arrange: Set up with cached content
      const cachedContent = { mode: 'playlist', items: [...] };
      vi.mocked(getCachedContent).mockResolvedValue(cachedContent);

      // Act: Simulate network going offline
      vi.mocked(getResolvedContent).mockRejectedValue(new Error('Network error'));

      render(<ViewPage />);
      await waitFor(() => {
        expect(screen.getByText('offline indicator')).toBeInTheDocument();
      });

      // Assert: Player uses cached content
      expect(getCachedContent).toHaveBeenCalled();
    });
  });
});
```

### Pattern 2: Fake Timers for Heartbeat Testing
**What:** Control time-dependent behaviors deterministically
**When to use:** Testing setInterval-based features like heartbeats, polling
**Example:**
```javascript
// Source: https://vitest.dev/guide/mocking/timers
describe('heartbeat behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends heartbeat every 30 seconds', async () => {
    const screenId = 'test-screen-id';
    localStorage.setItem('player_screen_id', screenId);

    render(<ViewPage />);

    // Initial heartbeat
    await waitFor(() => {
      expect(updateDeviceStatus).toHaveBeenCalledTimes(1);
    });

    // Advance 30 seconds
    await vi.advanceTimersByTimeAsync(30000);

    expect(updateDeviceStatus).toHaveBeenCalledTimes(2);
  });

  it('reconnects after connection loss', async () => {
    // Simulate failed heartbeats
    vi.mocked(updateDeviceStatus).mockRejectedValueOnce(new Error('Network'));
    vi.mocked(updateDeviceStatus).mockRejectedValueOnce(new Error('Network'));
    vi.mocked(updateDeviceStatus).mockResolvedValueOnce({ needs_screenshot_update: false });

    render(<ViewPage />);

    // Advance through retry attempts
    await vi.runAllTimersAsync();

    expect(updateDeviceStatus).toHaveBeenCalledTimes(3);
  });
});
```

### Pattern 3: Mocking navigator.onLine and Window Events
**What:** Simulate browser offline/online state changes
**When to use:** Testing offline mode detection
**Example:**
```javascript
// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true
});

// Trigger offline event
const goOffline = () => {
  Object.defineProperty(navigator, 'onLine', { value: false });
  window.dispatchEvent(new Event('offline'));
};

const goOnline = () => {
  Object.defineProperty(navigator, 'onLine', { value: true });
  window.dispatchEvent(new Event('online'));
};
```

### Pattern 4: Supabase Mocking via vi.mock
**What:** Mock the Supabase client at module level
**When to use:** All Player.jsx tests need Supabase mocked
**Example:**
```javascript
// tests/mocks/supabase.js
vi.mock('../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  },
}));
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't test that setState was called; test that UI reflects the state change
- **Using real timers:** Never use real setTimeout/setInterval in tests - causes slow, flaky tests
- **Snapshot testing for behavior:** Snapshots are for visual regression, not behavior verification
- **Mocking too much:** Don't mock the component under test, only its dependencies
- **Testing in isolation without context:** Player.jsx relies on localStorage and routing context

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for async updates | Manual setTimeout loops | @testing-library/react waitFor | Handles React's async rendering correctly |
| Simulating user events | Direct DOM events | @testing-library/user-event | Realistic event sequences, focus handling |
| Network request mocking | Manual fetch overrides | vi.mock or msw | Cleaner API, proper request matching |
| Fake timers | Date.now() overrides | vi.useFakeTimers() | Handles all timer APIs consistently |
| DOM queries | document.querySelector | RTL queries (getByRole, etc.) | Accessible, user-focused, better errors |

**Key insight:** The testing ecosystem has mature solutions for all common testing challenges. Custom solutions create maintenance burden and often miss edge cases.

## Common Pitfalls

### Pitfall 1: Forgetting to Reset Mocks Between Tests
**What goes wrong:** State leaks between tests, causing flaky failures
**Why it happens:** vi.mock persists across tests in the same file
**How to avoid:**
```javascript
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
```
**Warning signs:** Tests pass individually but fail when run together

### Pitfall 2: Not Awaiting Async State Updates
**What goes wrong:** Assertions run before React updates DOM
**Why it happens:** React batches state updates asynchronously
**How to avoid:** Always use `await waitFor()` or `findBy` queries for async operations
**Warning signs:** Tests fail with "element not found" but pass with delays

### Pitfall 3: Fake Timers Not Advancing Async Operations
**What goes wrong:** Promise-based code doesn't complete
**Why it happens:** vi.advanceTimersByTime only handles setTimeout/setInterval
**How to avoid:** Use `vi.advanceTimersByTimeAsync()` or `vi.runAllTimersAsync()`
**Warning signs:** Tests hang or async operations never resolve

### Pitfall 4: localStorage Not Mocked/Cleared
**What goes wrong:** Tests depend on previous test's localStorage state
**Why it happens:** jsdom persists localStorage across tests
**How to avoid:** Call `localStorage.clear()` in beforeEach
**Warning signs:** Test order matters, random failures

### Pitfall 5: Not Providing React Router Context
**What goes wrong:** "useNavigate must be used within a Router" errors
**Why it happens:** Player components use React Router hooks
**How to avoid:** Wrap components in MemoryRouter in tests
**Warning signs:** Immediate render errors

### Pitfall 6: Testing Too Many Things in One Test
**What goes wrong:** Hard to identify what broke when test fails
**Why it happens:** Trying to test entire flows in one test
**How to avoid:** One behavior per test, clear test names describing the single assertion
**Warning signs:** Test files are short but tests are 100+ lines each

## Code Examples

Verified patterns from official sources:

### Test Setup File Enhancement
```javascript
// tests/setup.js - extend existing setup
import { expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Mock service worker (optional, for complex scenarios)
// import { server } from './mocks/server';
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
```

### Component Test with Context Providers
```javascript
// Source: React Testing Library patterns
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ViewPage } from '../../../src/Player';

function renderWithProviders(ui, { route = '/player/view' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/player" element={<div>Pair Page</div>} />
        <Route path="/player/view" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ViewPage', () => {
  beforeEach(() => {
    // Set up required localStorage
    localStorage.setItem('player_screen_id', 'test-screen-123');
  });

  it('renders loading state initially', async () => {
    renderWithProviders(<ViewPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Mocking Multiple Service Functions
```javascript
// tests/unit/player/Player.test.jsx
import { vi } from 'vitest';

// Mock all player service imports
vi.mock('../../../src/services/playerService', () => ({
  updateDeviceStatus: vi.fn().mockResolvedValue({ needs_screenshot_update: false }),
  initOfflineCache: vi.fn().mockResolvedValue(undefined),
  cacheContent: vi.fn().mockResolvedValue(undefined),
  getCachedContent: vi.fn().mockResolvedValue(null),
  clearCache: vi.fn().mockResolvedValue(undefined),
  pollForCommand: vi.fn().mockResolvedValue(null),
  reportCommandResult: vi.fn().mockResolvedValue(undefined),
  COMMAND_POLL_INTERVAL: 10000,
  HEARTBEAT_INTERVAL: 30000,
}));

vi.mock('../../../src/player/offlineService', () => ({
  initOfflineService: vi.fn().mockResolvedValue(undefined),
  registerServiceWorker: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../src/services/deviceSyncService', () => ({
  subscribeToSceneUpdates: vi.fn().mockReturnValue(() => {}),
  checkDeviceRefreshStatus: vi.fn().mockResolvedValue({ needs_refresh: false }),
  clearDeviceRefreshFlag: vi.fn().mockResolvedValue(undefined),
}));
```

### Testing Offline Mode Transition
```javascript
describe('offline mode transitions', () => {
  it('displays cached content when server is unreachable', async () => {
    const cachedContent = {
      mode: 'playlist',
      items: [{ id: '1', name: 'Cached Item', mediaType: 'image', url: '/img.jpg' }],
      playlist: { id: 'p1', name: 'Test Playlist' },
    };

    // Server fails, cache succeeds
    vi.mocked(getResolvedContent).mockRejectedValue(new Error('Network error'));
    vi.mocked(getCachedContent).mockResolvedValue(cachedContent);

    renderWithProviders(<ViewPage />);

    await waitFor(() => {
      expect(screen.getByText('Cached Item')).toBeInTheDocument();
    });

    // Verify offline indicator shows
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest | Vitest | 2023-2024 | 10-20x faster, native ESM, Vite integration |
| Enzyme | React Testing Library | 2020-2021 | User-centric testing, better patterns |
| Manual fetch mocking | MSW | 2020-present | Realistic network simulation |
| render + manual cleanup | render with automatic cleanup | 2019-present | Less boilerplate |

**Deprecated/outdated:**
- Enzyme: Incompatible with React 18+, implementation-focused
- @testing-library/react-hooks: Merged into @testing-library/react v13+

## Open Questions

Things that couldn't be fully resolved:

1. **Service Worker Testing**
   - What we know: Player.jsx registers a service worker for caching
   - What's unclear: How to test service worker interactions in jsdom
   - Recommendation: Mock registerServiceWorker at module level, focus on cache behavior via mocked services

2. **Screenshot Capture Testing**
   - What we know: html2canvas is used for screenshots
   - What's unclear: Whether to test actual screenshot capture or just the trigger
   - Recommendation: Mock captureAndUploadScreenshot, test that it's called at correct times

3. **Realtime Subscription Testing**
   - What we know: Supabase realtime channels are used for instant updates
   - What's unclear: How to simulate realtime events in tests
   - Recommendation: Mock subscription functions to return cleanup functions, test callback handling separately

## Sources

### Primary (HIGH confidence)
- vitest.dev/guide/mocking - Mocking patterns, vi.mock, vi.spyOn, fake timers
- vitest.dev/guide/mocking/timers - Fake timer API and configuration
- testing-library.com/docs/react-testing-library - RTL queries and patterns
- mswjs.io/docs - MSW setup and handler patterns

### Secondary (MEDIUM confidence)
- [NimblePros: Characterization Tests](https://blog.nimblepros.com/blogs/characterization-tests-with-snapshot-testing/) - Characterization test methodology
- [Mario Cervera: Characterization Testing](https://mariocervera.com/characterization-testing-adding-tests-to-legacy-code) - Adding tests to legacy code
- [Herman Nygaard: Testing Supabase with MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw) - Supabase-specific mocking patterns
- [msw-postgrest GitHub](https://github.com/wyozi/msw-postgrest) - Dedicated Supabase/Postgrest MSW library

### Tertiary (LOW confidence)
- Various Medium articles on Vitest best practices - Community patterns, validate against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already configured in project, official documentation verified
- Architecture: HIGH - Based on existing test structure and official patterns
- Pitfalls: HIGH - Common issues documented across multiple authoritative sources
- Code examples: MEDIUM - Adapted from official docs to project-specific patterns

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable testing patterns)
