# Phase 25: Test Infrastructure - Research

**Researched:** 2026-01-28
**Domain:** Vitest testing, mocking patterns, circular dependency resolution
**Confidence:** HIGH

## Summary

This research covers fixing 46 failing tests across 20 test files, resolving circular dependencies between `loggingService.js` and `supabase.js`, and establishing documented patterns for future tests. The project uses Vitest 4.0.14 with jsdom environment, React Testing Library, and has an existing test structure with 1700+ passing tests.

The primary issues are:
1. **Circular dependency**: `supabase.js` imports `loggingService.js` which imports `supabase.js`
2. **Incomplete mocks**: Tests fail when services import real dependencies that expect browser/network
3. **Mock state pollution**: Tests affecting each other due to insufficient cleanup

**Primary recommendation:** Resolve circular dependency by lazy-loading supabase in loggingService, create centralized mock modules in `tests/mocks/`, and add global auto-mocking of loggingService in `setupTests.js`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.14 | Test runner | Already installed, configured |
| @testing-library/react | 16.3.0 | Component testing | Already installed, React best practice |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | Already installed, extends expect |
| jsdom | 27.3.0 | DOM environment | Already configured in vitest.config.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fake-indexeddb | latest | IndexedDB mock | offlineService tests needing IDB |
| msw | 2.12.3 | API mocking | Already installed for integration tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fake-indexeddb | vitest-indexeddb | fake-indexeddb is more mature and well-documented |
| Manual date mocking | timezone-mock | Manual vi.useFakeTimers is sufficient for this project |

**Installation:**
```bash
npm install -D fake-indexeddb
```

## Architecture Patterns

### Recommended Project Structure
```
tests/
  mocks/
    supabase.js          # Existing centralized Supabase mock
    loggingService.js    # NEW: Auto-mock for loggingService
    index.js             # NEW: Export all mocks for easy import
  unit/
    services/            # Service unit tests
    player/              # Player component tests
    pages/               # Page hook tests
  integration/           # Integration tests
  utils/
    factories.js         # Test data factories (existing)
  setup.js               # Global test setup (existing)
src/
  __fixtures__/          # NEW: Shared test fixtures
    screens.js           # Screen test data
    playlists.js         # Playlist test data
    schedules.js         # Schedule test data
```

### Pattern 1: Centralized Module Mocking
**What:** Create mock modules in `tests/mocks/` that can be imported by any test
**When to use:** When multiple test files need the same mock configuration
**Example:**
```javascript
// tests/mocks/loggingService.js
// Source: Vitest documentation
import { vi } from 'vitest';

export const mockLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
};

export const createScopedLogger = vi.fn(() => mockLogger);
export const log = mockLogger;
export const setLogContext = vi.fn();
export const refreshCorrelationId = vi.fn();
export const getCorrelationId = vi.fn(() => 'test-correlation-id');
export const getSessionId = vi.fn(() => 'test-session-id');
export const initLogging = vi.fn();
export const logTiming = vi.fn((name, fn) => fn());

export default {
  ...log,
  setLogContext,
  createScopedLogger,
  logTiming,
  initLogging,
  refreshCorrelationId,
  getCorrelationId,
  getSessionId,
};
```

### Pattern 2: Global Auto-Mocking in Setup
**What:** Auto-mock problematic modules globally in `tests/setup.js`
**When to use:** For modules that cause circular dependencies or always need mocking
**Example:**
```javascript
// tests/setup.js
import { vi } from 'vitest';

// Auto-mock loggingService globally to break circular dependency
vi.mock('../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
  log: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  setLogContext: vi.fn(),
  refreshCorrelationId: vi.fn(),
  getCorrelationId: vi.fn(() => 'test-correlation-id'),
  getSessionId: vi.fn(() => 'test-session-id'),
  initLogging: vi.fn(),
  logTiming: vi.fn((name, fn) => fn()),
  default: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    setLogContext: vi.fn(),
    createScopedLogger: vi.fn(),
  },
}));
```

### Pattern 3: Test Factory Functions
**What:** Use factory functions from `tests/utils/factories.js` for consistent test data
**When to use:** Any test needing domain objects (screens, playlists, schedules)
**Example:**
```javascript
// Already exists in tests/utils/factories.js
import { createTestScreen, createTestPlaylist, createTestSchedule } from '../../utils/factories';

it('handles screen with schedule', () => {
  const screen = createTestScreen({
    schedule_id: 'schedule-123',
    playlist_id: 'playlist-456'
  });
  // screen has all required fields with sensible defaults
});
```

### Pattern 4: IndexedDB Mocking for offlineService
**What:** Use fake-indexeddb for tests requiring IndexedDB
**When to use:** offlineService and cacheService tests
**Example:**
```javascript
// tests/setup.js additions for IndexedDB
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

// Reset between tests
beforeEach(() => {
  // Fresh IndexedDB instance
  const { IDBFactory } = await import('fake-indexeddb');
  global.indexedDB = new IDBFactory();
});
```

### Anti-Patterns to Avoid
- **Inline mock duplication:** Don't copy the same `vi.mock()` block into multiple files; use centralized mocks
- **Missing cleanup:** Always call `vi.clearAllMocks()` in `beforeEach` and `vi.restoreAllMocks()` in `afterEach`
- **Circular import in tests:** Don't import the module before mocking; use dynamic imports if needed
- **Testing implementation details:** Test behavior, not internal state

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB testing | Custom IDB mock | fake-indexeddb | Handles all edge cases, async behavior |
| Timer mocking | Manual Date replacement | vi.useFakeTimers() | Built into Vitest, handles all timer APIs |
| Supabase response mocking | Individual mock per test | Centralized mock module | Consistent behavior, easier maintenance |
| Environment variables | Direct process.env mutation | vi.stubEnv() | Auto-cleanup, test isolation |

**Key insight:** Vitest provides comprehensive mocking utilities. Use them instead of custom solutions.

## Common Pitfalls

### Pitfall 1: Circular Dependency Breaking Tests
**What goes wrong:** Tests fail with "Cannot read properties of undefined" because module imports fail
**Why it happens:** `supabase.js` imports `loggingService.js` which imports `supabase.js`
**How to avoid:**
1. Mock loggingService globally in setup.js (recommended for this project)
2. OR refactor loggingService to lazy-load supabase
**Warning signs:** Errors about undefined being accessed, especially `pathname` or `from`

### Pitfall 2: Mock State Pollution
**What goes wrong:** Tests pass in isolation but fail when run together
**Why it happens:** Mocks retain state/call history between tests
**How to avoid:** Call `vi.clearAllMocks()` in `beforeEach` of every describe block
**Warning signs:** Tests fail only when run with other tests, not in isolation

### Pitfall 3: vi.mock Hoisting Confusion
**What goes wrong:** Mock doesn't apply because it's called after import
**Why it happens:** `vi.mock()` is hoisted but variable references in factory are not
**How to avoid:** Use `vi.hoisted()` for variables needed in mock factory
**Warning signs:** Mock factory has undefined values

### Pitfall 4: Incomplete Supabase Mock Chain
**What goes wrong:** `.from().select().eq()` returns undefined instead of mock
**Why it happens:** Chain methods not all returning `this` or proper mock
**How to avoid:** Use the established pattern in `tests/mocks/supabase.js`
**Warning signs:** "Cannot read properties of undefined (reading 'select')"

### Pitfall 5: IndexedDB Not Available
**What goes wrong:** Tests fail with "indexedDB is not defined"
**Why it happens:** jsdom doesn't include IndexedDB
**How to avoid:** Install and configure fake-indexeddb in setup.js
**Warning signs:** ReferenceError for indexedDB, IDBKeyRange

## Code Examples

Verified patterns from official sources and existing project code:

### Fixing the Circular Dependency
```javascript
// tests/setup.js - Add to existing setup
// Source: Vitest mocking guide
import { vi } from 'vitest';

// CRITICAL: Mock loggingService before any imports can trigger circular dependency
vi.mock('../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
  log: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  setLogContext: vi.fn(),
  refreshCorrelationId: vi.fn(),
  getCorrelationId: vi.fn(() => 'test-correlation-id'),
  getSessionId: vi.fn(() => 'test-session-id'),
  initLogging: vi.fn(),
  logTiming: vi.fn((name, fn) => fn()),
}));
```

### Service Test Pattern
```javascript
// Source: Existing project pattern in tests/unit/services/authService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('myService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does something', async () => {
    const { myFunction } = await import('../../../src/services/myService');
    const result = await myFunction();
    expect(result).toBeDefined();
  });
});
```

### IndexedDB Test Setup
```javascript
// Source: fake-indexeddb documentation
// tests/setup.js additions
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Set up IndexedDB globals
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

// For jsdom's structuredClone (fake-indexeddb v5+ requirement)
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}
```

### Date/Time Testing Pattern
```javascript
// Source: Vitest documentation
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('schedule time logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects schedule active at specific time', () => {
    // Set to 2pm on a Tuesday
    vi.setSystemTime(new Date('2026-01-13T14:00:00Z'));

    // Test schedule logic
    const isActive = checkScheduleActive({
      days_of_week: [2], // Tuesday
      start_time: '09:00',
      end_time: '17:00',
    });

    expect(isActive).toBe(true);
  });

  it('handles DST transitions', () => {
    // Set to 2am on DST transition day (US Spring Forward)
    vi.setSystemTime(new Date('2026-03-08T02:00:00-05:00'));

    // Test that 2am -> 3am skip is handled
    // ...
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest | Vitest | Project inception | Native ESM, faster |
| Manual mocks | vi.mock() factories | Vitest standard | Cleaner, hoisted |
| Mock files in __mocks__ | Mock modules in tests/mocks/ | This project's pattern | Centralized, explicit |
| Manual timer stubs | vi.useFakeTimers() | Vitest 1.0 | Comprehensive timer control |

**Deprecated/outdated:**
- `jest.mock()` syntax: This project uses Vitest, use `vi.mock()`
- `__mocks__` directory convention: Project uses `tests/mocks/` instead

## Open Questions

Things that couldn't be fully resolved:

1. **offlineService IndexedDB approach**
   - What we know: fake-indexeddb can mock idb library, needs setup in tests/setup.js
   - What's unclear: Whether to mock at IDB level or mock cacheService functions
   - Recommendation: Start with mocking cacheService (already done in tests), add fake-indexeddb if needed for integration-level tests

2. **date-fns-tz mocking for DST tests**
   - What we know: vi.useFakeTimers() works for Date, date-fns v4 has native TZ support
   - What's unclear: Whether to mock TZDate or use vi.setSystemTime
   - Recommendation: Use vi.setSystemTime with explicit ISO timestamps including timezone offset

## Sources

### Primary (HIGH confidence)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - vi.mock, vi.hoisted, setup files
- [Vitest Vi API](https://vitest.dev/api/vi.html) - vi.stubEnv, vi.stubGlobal, vi.useFakeTimers
- Project source: tests/mocks/supabase.js - existing mock patterns
- Project source: tests/setup.js - existing setup configuration

### Secondary (MEDIUM confidence)
- [fake-indexeddb npm](https://www.npmjs.com/package/fake-indexeddb) - IndexedDB mocking
- [GitHub vitest-dev/vitest#2498](https://github.com/vitest-dev/vitest/issues/2498) - circular dependency issues
- [Testing Supabase with RTL and MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw) - Supabase mocking patterns

### Tertiary (LOW confidence)
- WebSearch results on timezone-mock and DST testing patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed and configured in project
- Architecture: HIGH - Based on existing project patterns and official docs
- Pitfalls: HIGH - Directly observed from test failures
- Code examples: HIGH - Verified from official docs and existing project code

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - Vitest is stable)

---

## Appendix: Current Test Failure Summary

**20 test files failing, 46 tests failing out of 1746 total**

### Failure Categories:

1. **Circular dependency errors (most common)**
   - Error: `Cannot read properties of undefined (reading 'pathname')`
   - Affected: offlineService.test.js (32 failures), multiple service tests
   - Cause: loggingService imports supabase which imports loggingService

2. **Mock chain incomplete**
   - Error: `supabase.from(...).select(...).in(...).order is not a function`
   - Affected: scheduleService.test.js (getWeekPreview)
   - Cause: Mock missing `.order()` method

3. **Test assertions wrong**
   - Error: `expected undefined to be 'playlist'`
   - Affected: scheduleService.test.js (updateScheduleFillerContent)
   - Cause: Mock not returning expected shape

4. **React act() warnings**
   - Error: `An update to TestComponent inside a test was not wrapped in act(...)`
   - Affected: pageHooks.test.jsx
   - Cause: Async state updates not properly awaited

### Priority Order for Fixing:
1. Add global loggingService mock to setup.js (fixes ~32 tests)
2. Fix Supabase mock chain methods (fixes ~5 tests)
3. Fix individual test assertions (fixes ~5 tests)
4. Fix React testing patterns (fixes ~4 tests)
