# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Vitest v4.0.14 - Fast unit and integration test runner
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest built-in `expect()` with extended matchers
- `@testing-library/jest-dom` matchers (DOM-specific assertions)

**Run Commands:**
```bash
npm run test                    # Run all unit + integration tests (vitest run)
npm run test:watch            # Watch mode for development
npm run test:unit             # Unit tests only (tests/unit/**)
npm run test:integration      # Integration tests only (tests/integration/**)
npm run test:coverage         # Generate coverage report (v8 provider)
npm run test:e2e              # Playwright E2E tests
npm run test:e2e:ui           # E2E tests with Playwright UI
npm run test:e2e:headed       # E2E tests in headed mode (browser visible)
npm run test:all              # Unit tests + E2E tests
npm run test:ci               # CI flow: unit tests + seed test user + E2E tests
```

## Test File Organization

**Location Pattern:**
- Unit tests: `tests/unit/**/*.test.js` or `tests/unit/**/*.spec.js`
- Integration tests: `tests/integration/**/*.test.js`
- E2E tests: `tests/e2e/**/*.spec.js`
- Test utilities/factories: `tests/utils/factories.js`, `tests/utils/`
- Test helpers: `tests/e2e/helpers.js` for E2E specific utilities

**Mirror Structure:**
- Test file mirrors source structure for clarity
- Example: `src/services/mediaService.js` → `tests/unit/services/mediaService.test.js`
- Example: `src/config/plans.js` → `tests/unit/config/plans.test.js`

**Naming Convention:**
- Unit/integration test files: `*.test.js` (e.g., `plans.test.js`)
- E2E test files: `*.spec.js` (e.g., `dashboard.spec.js`)

## Test Setup

**Global Setup File:** `tests/setup.js`

Runs before all tests:
- Extends `expect` with `@testing-library/jest-dom` matchers
- Cleans up React components after each test via `cleanup()`
- Mocks environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` (JWT format for validation)
- Mocks browser APIs:
  - `window.matchMedia()` - Media query API
  - `ResizeObserver` - DOM resize monitoring
  - `IntersectionObserver` - Element visibility detection
  - `URL.createObjectURL()` and `URL.revokeObjectURL()` - Blob URLs

**Test Environment:** `jsdom` (simulates browser DOM)

**Global Test Settings:**
```javascript
// From vitest.config.js
globals: true,           // Use global describe/it/expect without imports
testTimeout: 10000,      // 10 second timeout per test
reporters: ['verbose'],  // Detailed output
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Plans Configuration', () => {
  describe('PlanSlug', () => {
    it('contains all expected plan slugs', () => {
      // Test body
    });

    it('has 5 plan types', () => {
      // Test body
    });
  });

  describe('PLANS', () => {
    // More tests
  });
});
```

**Pattern Observations:**
- Nested `describe()` blocks for logical grouping
- Descriptive test names as second argument: `it('contains all expected plan slugs', ...)`
- Single assertion focus per test (or closely related assertions)
- File header with phase/context: `Phase 14: Tests for centralized plan tier definitions`

## Mocking

**Framework:** Vitest's native `vi` module

**Pattern 1: Module Mocking (Supabase)**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase at module level
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
      in: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}));

describe('mediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

**Pattern 2: Function Spying**
```javascript
// Spy on existing functions
const logSpy = vi.spyOn(console, 'log');
expect(logSpy).toHaveBeenCalledWith('expected message');
logSpy.mockRestore();
```

**Pattern 3: Mocking Return Values**
```javascript
// Chainable mock returns (for Supabase query builder)
vi.fn(() => ({
  select: vi.fn().mockReturnThis(),    // Returns self for chaining
  eq: vi.fn().mockReturnThis(),        // Returns self for chaining
  single: vi.fn().mockResolvedValue({ data: {}, error: null })  // Final call resolves
}))
```

**What to Mock:**
- External APIs (Supabase)
- Browser APIs mocked globally in `tests/setup.js`
- Network requests (would use MSW - Mock Service Worker installed but not shown in active use)
- Time-dependent functions (if using `vi.useFakeTimers()`)

**What NOT to Mock:**
- Pure functions/utilities (test the real implementation)
- Business logic you're testing
- Helper functions within same module
- Standard library functions

## Test Data & Factories

**Location:** `tests/utils/factories.js`

**Patterns:**
```javascript
// Generate test data consistently
export function createTestScreen(overrides = {}) {
  return {
    id: generateUUID(),
    owner_id: generateUUID(),
    name: 'Test Screen',
    status: 'online',
    device_id: generateUUID(),
    api_key: generateAPIKey(),
    last_seen_at: new Date().toISOString(),
    paired_at: new Date().toISOString(),
    ...overrides
  };
}

export function generateUUID() {
  // UUID v4 generation
}

export function generateOTPCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Usage in Tests:**
```javascript
it('creates test screen with defaults', () => {
  const screen = createTestScreen();
  expect(screen.status).toBe('online');
  expect(screen.id).toBeDefined();
});

it('creates screen with custom values', () => {
  const screen = createTestScreen({ name: 'Custom Name' });
  expect(screen.name).toBe('Custom Name');
  expect(screen.status).toBe('online');  // Default from factory
});
```

## Coverage Configuration

**Provider:** v8

**Reporter Formats:** text, json, html

**Output Directory:** `./coverage`

**Current Thresholds:** All set to 0 (no enforcement)
```javascript
thresholds: {
  statements: 0,
  branches: 0,
  functions: 0,
  lines: 0
}
```
Note: Coverage thresholds are intentionally disabled while test suite is being built out.

**View Coverage:**
```bash
npm run test:coverage
# Opens HTML report at ./coverage/index.html
```

## Unit Test Patterns

**Testing Constants:**
```javascript
describe('MEDIA_TYPES constant', () => {
  it('contains all required media types', () => {
    expect(MEDIA_TYPES.IMAGE).toBe('image');
    expect(MEDIA_TYPES.VIDEO).toBe('video');
  });

  it('has exactly 6 media types', () => {
    expect(Object.keys(MEDIA_TYPES)).toHaveLength(6);
  });

  it('all values are lowercase strings', () => {
    Object.values(MEDIA_TYPES).forEach(type => {
      expect(typeof type).toBe('string');
      expect(type).toBe(type.toLowerCase());
    });
  });
});
```

**Testing Utility Functions:**
```javascript
describe('validateMediaFile', () => {
  it('accepts valid image file', () => {
    const file = { name: 'test.jpg', size: 1024 * 1024, type: 'image/jpeg' };
    const result = validateMediaFile(file);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.mediaType).toBe(MEDIA_TYPES.IMAGE);
  });

  it('rejects oversized file', () => {
    const file = { name: 'test.jpg', size: 200 * 1024 * 1024, type: 'image/jpeg' };
    const result = validateMediaFile(file, 100);  // 100 MB limit
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('File size exceeds');
  });

  it('rejects unsupported file type', () => {
    const file = { name: 'test.exe', size: 1024, type: 'application/x-msdownload' };
    const result = validateMediaFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unsupported file type');
  });
});
```

**Testing API/Service Functions:**
```javascript
describe('fetchPlaylists', () => {
  it('returns playlists for current user', async () => {
    const playlists = await fetchPlaylists();
    expect(Array.isArray(playlists)).toBe(true);
  });

  it('filters by search term', async () => {
    const playlists = await fetchPlaylists({ search: 'Morning' });
    // Mock returns matching playlists
    expect(playlists).toBeDefined();
  });

  it('throws error on database failure', async () => {
    // Mock query to return error
    await expect(fetchPlaylists()).rejects.toThrow();
  });
});
```

## Integration Test Patterns

**File:** `tests/integration/api/screens.test.js`

**Pattern: Simulating Complex Flows**
```javascript
class MockScreenPairingService {
  constructor() {
    this.pendingCodes = new Map();
    this.screens = new Map();
    this.RATE_LIMIT = 5;
    this.OTP_EXPIRY_MS = 5 * 60 * 1000;
  }

  generatePairingCode(ownerId, screenName) {
    const code = generateOTPCode();
    const screenId = generateUUID();
    this.pendingCodes.set(code, {
      screenId,
      ownerId,
      screenName,
      createdAt: Date.now()
    });
    return { code, screenId };
  }

  claimCode(code, deviceInfo, clientIp = '127.0.0.1') {
    // Simulate rate limiting, expiry, validation
    const pending = this.pendingCodes.get(code);
    if (!pending) return { success: false, error: { code: 404 } };
    if (Date.now() - pending.createdAt > this.OTP_EXPIRY_MS) {
      return { success: false, error: { code: 404, message: 'expired' } };
    }
    // Create screen
    return { success: true, screen: {...}, apiKey: '...' };
  }
}

describe('Screen Pairing', () => {
  let service;

  beforeEach(() => {
    service = new MockScreenPairingService();
  });

  it('generates and claims pairing code', () => {
    const { code, screenId } = service.generatePairingCode('owner-id', 'My Screen');
    expect(code).toBeDefined();
    expect(code).toHaveLength(6);

    const result = service.claimCode(code, { deviceId: 'device-1' });
    expect(result.success).toBe(true);
  });
});
```

## E2E Test Patterns

**Framework:** Playwright v1.57.0

**File Pattern:** `tests/e2e/*.spec.js`

**Common Helpers:**
```javascript
// From tests/e2e/helpers.js
export async function loginAndPrepare(page, options = {}) {
  const email = options.email || process.env.TEST_USER_EMAIL;
  const password = options.password || process.env.TEST_USER_PASSWORD;

  await page.goto('/auth/login');
  await page.evaluate(() => {
    localStorage.setItem('bizscreen_welcome_modal_shown', 'true');
  });
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
}

export async function dismissAnyModals(page) {
  const closeButtonSelectors = [
    '[aria-label="Close modal"]',
    'button:has(svg.lucide-x)',
    '[role="dialog"] button:has-text("Skip")',
  ];
  for (const selector of closeButtonSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 100 }).catch(() => false)) {
      await button.click();
      await page.waitForTimeout(300);
      break;
    }
  }
}
```

**Test Pattern:**
```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, dismissAnyModals } from './helpers.js';

test.describe('Client Dashboard', () => {
  // Skip if test credentials not configured
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('dashboard loads successfully after login', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });

    await waitForPageReady(page);
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('displays stat cards with proper labels', async ({ page }) => {
    await loginAndPrepare(page, { ... });
    await waitForPageReady(page);

    const mainContent = page.locator('#main-content');
    await expect(mainContent.getByText('Total Screens')).toBeVisible({ timeout: 5000 });
    await expect(mainContent.getByText('Playlists')).toBeVisible({ timeout: 5000 });
  });
});
```

**Prerequisites for E2E:**
- `TEST_USER_EMAIL` environment variable must be set
- `TEST_USER_PASSWORD` environment variable must be set
- Test user should have 'client' role
- Application must be running (typically on `http://localhost:5173`)

## React Component Testing

**Framework:** React Testing Library (imported as part of `@testing-library/react`)

**Typical Pattern:**
```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from '../../../src/components/media/BulkActionBar';

describe('BulkActionBar', () => {
  it('does not render when no items selected', () => {
    render(
      <BulkActionBar
        selectedCount={0}
        totalCount={10}
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
      />
    );
    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('displays count of selected items', () => {
    render(
      <BulkActionBar
        selectedCount={3}
        totalCount={10}
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
      />
    );
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('calls onSelectAll when select all button clicked', async () => {
    const user = userEvent.setup();
    const onSelectAll = vi.fn();
    render(
      <BulkActionBar
        selectedCount={3}
        totalCount={10}
        onSelectAll={onSelectAll}
        onDeselectAll={() => {}}
      />
    );
    await user.click(screen.getByText(/select all/i));
    expect(onSelectAll).toHaveBeenCalled();
  });
});
```

## Async Testing

**Pattern: Testing Promise-returning Functions**
```javascript
it('fetches user profile async', async () => {
  const result = await fetchUserProfile('user-id', 'user@example.com');
  expect(result).toHaveProperty('id');
  expect(result).toHaveProperty('email');
});

it('handles profile fetch errors', async () => {
  // Mock error response
  await expect(fetchUserProfile('invalid-id', 'user@example.com'))
    .rejects
    .toThrow();
});
```

**Pattern: Testing Hooks**
```javascript
import { renderHook, act, waitFor } from '@testing-library/react';

it('fetches playlists on mount', async () => {
  const { result } = renderHook(() => useMediaFolders());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.folders).toBeDefined();
});

it('updates state on action', async () => {
  const { result } = renderHook(() => useS3Upload({ onSuccess: vi.fn() }));

  act(() => {
    result.current.openFilePicker();
  });

  // Assertions on updated state
});
```

## Error Testing

**Pattern:**
```javascript
it('throws error when required parameter missing', async () => {
  await expect(createPlaylist({ name: '' })).rejects.toThrow();
});

it('returns error object on validation failure', () => {
  const result = validateMediaFile(null);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});
```

## Test Execution in CI

**CI Test Script:** `npm run test:ci`
1. Runs unit/integration tests: `npm run test`
2. Seeds test user: `node scripts/seed-ci-test-user.cjs`
3. Runs E2E tests: `npm run test:e2e`

**Alternative for Local Development:**
```bash
npm run test:ci:local  # Unit + E2E without seeding new user
```

---

*Testing analysis: 2026-01-22*
