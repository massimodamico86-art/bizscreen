# Test Patterns

Quick reference for writing tests in this codebase. Copy-paste examples, minimal prose.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/services/screenService.test.js

# Run tests matching pattern
npm test -- -t "should return screen"

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Mock Patterns

### Supabase Mock

Use the centralized mock for Supabase client. Located at `tests/mocks/supabase.js`.

```javascript
import { createMockSupabase, mockRpc, mockRpcError, resetMockState } from '../../tests/mocks/supabase.js';

// In beforeEach
const mockSupabase = createMockSupabase();

// Configure RPC response
mockRpc('get_resolved_player_content', {
  mode: 'playlist',
  items: [{ id: 'item-1', url: 'https://example.com/image.jpg' }]
});

// Configure RPC error
mockRpcError('player_heartbeat', 'Network error');

// Reset between tests
beforeEach(() => {
  resetMockState();
});
```

### loggingService Mock

Globally mocked in `tests/setup.js` to break circular dependency. No import needed.

```javascript
// loggingService is already mocked - just use it
import { log, createScopedLogger } from '../services/loggingService.js';

// Access mock for assertions
expect(log.error).toHaveBeenCalledWith('Error message');

// Scoped logger is also mocked
const logger = createScopedLogger('TestScope');
logger.info('test');
expect(logger.info).toHaveBeenCalled();
```

### vi.mock with importOriginal

When you need partial mocking (keep some real implementations):

```javascript
vi.mock('../services/someService.js', async () => {
  const actual = await vi.importActual('../services/someService.js');
  return {
    ...actual,
    // Override only what you need
    specificFunction: vi.fn().mockResolvedValue({ success: true }),
  };
});
```

### Mock a Single Function

```javascript
import { vi } from 'vitest';
import * as module from '../services/myService.js';

vi.spyOn(module, 'myFunction').mockReturnValue('mocked');
```

## Test Structure

### Standard describe/it Pattern

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ServiceName', () => {
  describe('functionName', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should do expected behavior when given valid input', async () => {
      // Arrange
      const input = { id: '123' };

      // Act
      const result = await functionName(input);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('should throw error when given invalid input', async () => {
      await expect(functionName(null)).rejects.toThrow('Invalid input');
    });
  });
});
```

### Async Test Pattern

```javascript
// Async/await (preferred)
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// Promise assertion
it('should reject on error', async () => {
  await expect(fetchData()).rejects.toThrow('Error');
});

// Multiple awaits
it('should process sequentially', async () => {
  const step1 = await processStep1();
  const step2 = await processStep2(step1);
  expect(step2.complete).toBe(true);
});
```

### beforeEach Cleanup Pattern

```javascript
describe('MyComponent', () => {
  let mockFn;

  beforeEach(() => {
    vi.clearAllMocks();          // Clear mock call counts
    vi.resetAllMocks();          // Reset mock implementations
    mockFn = vi.fn();            // Fresh mock each test
  });

  afterEach(() => {
    vi.restoreAllMocks();        // Restore spied functions
  });
});
```

## Fixtures

### Import from src/__fixtures__/

```javascript
import {
  mockScreen,
  mockScreenList,
  createMockScreen,
  mockPlaylist,
  mockPlaylistItems,
  createMockPlaylist,
  mockSchedule,
  mockScheduleSlot,
  createMockSchedule,
  createMockSlot,
} from '../../src/__fixtures__/index.js';
```

### Factory Function Usage

```javascript
// Default fixture
const screen = mockScreen;  // { id: 'screen-123', name: 'Test Screen', ... }

// Customize with factory
const customScreen = createMockScreen({
  id: 'custom-id',
  status: 'offline',
  schedule_id: 'schedule-456',
});

// Create multiple variations
const screens = [
  createMockScreen({ id: 'a', name: 'Screen A' }),
  createMockScreen({ id: 'b', name: 'Screen B', status: 'offline' }),
];
```

### Complex Fixtures from tests/utils/factories.js

For more complex test data with relationships:

```javascript
import {
  createTestUser,
  createTestScreen,
  createTestPlaylist,
  createTestPlaylistWithMedia,
  createTestSchedule,
  generateUUID,
} from '../../tests/utils/factories.js';

// User with custom attributes
const admin = createTestUser({ role: 'super_admin' });

// Playlist with items already attached
const playlistWithMedia = createTestPlaylistWithMedia({ item_count: 5 });
```

## Common Issues & Solutions

### Circular Dependency

**Symptom:** Test hangs or throws "Cannot access before initialization"

**Solution:** Mock is hoisted globally in `tests/setup.js`. If you see this error, the module likely imports loggingService which imports supabase.

```javascript
// In tests/setup.js (already configured):
vi.mock('../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({ ... })),
  log: { ... },
  // ... all exports
}));
```

### Mock Chain Incomplete

**Symptom:** "undefined is not a function" on chained calls like `.from().select().eq()`

**Solution:** Each method in the chain must return `this` or the next builder:

```javascript
const createQueryBuilder = () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return builder;
};
```

### Missing Exports in Mock

**Symptom:** "X is not exported from module"

**Solution:** Use importOriginal to preserve exports you need:

```javascript
vi.mock('../services/myService.js', async () => {
  const actual = await vi.importActual('../services/myService.js');
  return {
    ...actual,
    onlyMockThis: vi.fn(),
  };
});
```

### React act() Warnings

**Symptom:** "Warning: An update to X inside a test was not wrapped in act(...)"

**Solution:** Use async utilities and waitFor:

```javascript
import { render, screen, waitFor, act } from '@testing-library/react';

it('should update after async action', async () => {
  render(<MyComponent />);

  // Option 1: waitFor
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  // Option 2: act for direct state updates
  await act(async () => {
    await userEvent.click(screen.getByRole('button'));
  });
});
```

### Environment Variables

**Symptom:** Tests fail because env vars are undefined

**Solution:** They're stubbed in `tests/setup.js`:

```javascript
// Already configured in setup.js:
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbG...');
```

## Anti-Patterns

### Inline Mock Duplication (Bad)

```javascript
// BAD: Copy-pasting mocks in every test file
const mockScreen = { id: '123', name: 'Test' };  // Repeated 50 times across files
```

```javascript
// GOOD: Import from centralized fixtures
import { mockScreen, createMockScreen } from '../../src/__fixtures__/index.js';
```

### Missing Cleanup (Bad)

```javascript
// BAD: Mock state leaks between tests
describe('tests', () => {
  vi.mock('../service.js');  // Persists across tests

  it('test 1', () => { ... });
  it('test 2', () => { ... });  // May have stale mock data
});
```

```javascript
// GOOD: Clean up in beforeEach
describe('tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test 1', () => { ... });
  it('test 2', () => { ... });  // Fresh state
});
```

### Testing Implementation (Bad)

```javascript
// BAD: Testing internal implementation details
it('should call processData then transformResult', () => {
  myFunction();
  expect(processData).toHaveBeenCalledBefore(transformResult);
});
```

```javascript
// GOOD: Test behavior/output, not internals
it('should return transformed data', () => {
  const result = myFunction({ input: 'value' });
  expect(result).toEqual({ transformed: true });
});
```

### Over-Mocking (Bad)

```javascript
// BAD: Mocking everything, test proves nothing
vi.mock('../utils.js');
vi.mock('../helpers.js');
vi.mock('../formatters.js');

it('should work', () => {
  // All real code is mocked out - what are we testing?
});
```

```javascript
// GOOD: Mock only external dependencies (DB, network, etc.)
vi.mock('../services/supabase.js');  // External dependency

it('should transform data correctly', () => {
  // Real utils, helpers, formatters run
  const result = transformData(mockInput);
  expect(result.formatted).toBe('expected');
});
```

### Asserting on Mock Calls Without Behavior Check (Bad)

```javascript
// BAD: Only checking mock was called
it('should save screen', async () => {
  await saveScreen({ name: 'Test' });
  expect(supabase.from).toHaveBeenCalled();  // So what?
});
```

```javascript
// GOOD: Verify the result matters
it('should save screen', async () => {
  const result = await saveScreen({ name: 'Test' });
  expect(result.id).toBeDefined();
  expect(result.name).toBe('Test');
});
```

## File Locations

| Purpose | Location |
|---------|----------|
| Test setup | `tests/setup.js` |
| Supabase mock | `tests/mocks/supabase.js` |
| loggingService mock | `tests/mocks/loggingService.js` |
| Data factories | `tests/utils/factories.js` |
| Simple fixtures | `src/__fixtures__/` |
| Component tests | `src/components/*.test.jsx` |
| Service tests | `src/services/*.test.js` |
| Hook tests | `src/hooks/*.test.js` |
