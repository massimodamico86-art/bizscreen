# Testing Patterns

**Analysis Date:** 2026-02-17

## Test Framework

**Runner (Unit/Integration):**
- Vitest 4.x
- Config: `vitest.config.js`
- Environment: jsdom (browser simulation)
- Setup file: `tests/setup.js` (runs before every test file)

**Runner (E2E):**
- Playwright 1.57+
- Config: `playwright.config.js`
- Base URL: `http://localhost:5173` (Vite dev server)

**Assertion Library:**
- Vitest built-in `expect` + `@testing-library/jest-dom` matchers (extended in setup)
- Available: `toBeInTheDocument()`, `toBeVisible()`, `toBeDisabled()`, `toHaveValue()`, etc.

**Component Testing:**
- `@testing-library/react` — `render`, `screen`, `waitFor`, `fireEvent`
- `@testing-library/user-event` — available but `fireEvent` is more commonly used in practice
- `renderHook` from `@testing-library/react` for hook tests

**Run Commands:**
```bash
npm test                    # Run all unit + integration tests (vitest run)
npm run test:watch          # Watch mode
npm run test:unit           # Unit tests only (tests/unit/)
npm run test:integration    # Integration tests only (tests/integration/)
npm run test:coverage       # Run with V8 coverage report
npm run test:e2e            # Run E2E tests with Playwright
npm run test:e2e:ui         # Playwright interactive UI mode
npm run test:e2e:headed     # Run E2E in headed browser mode
npm run test:all            # Unit + E2E (sequential)
npm run test:ci             # Unit + seed CI user + E2E (for CI pipelines)
```

## Test File Organization

**Location:**
- Separate `tests/` directory — NOT co-located with source files
- Unit tests mirror `src/` structure under `tests/unit/`
- E2E tests in flat `tests/e2e/` directory
- Integration tests in `tests/integration/`

**Naming:**
- Unit test files: `{subject}.test.js` or `{subject}.test.jsx`
- E2E test files: `{feature}.spec.js` (Playwright convention)
- Setup/helpers: `setup.js`, `helpers.js`

**Structure:**
```
tests/
├── setup.js                          # Global Vitest setup (runs before each file)
├── mocks/                            # Shared mock modules
│   ├── supabase.js                   # Configurable Supabase mock for player tests
│   ├── loggingService.js             # Logger mock (also in setup.js globally)
│   └── api/                          # API-level mocks
├── unit/
│   ├── services/                     # Service layer tests (most numerous)
│   ├── components/                   # Component tests
│   ├── hooks/                        # Hook tests
│   ├── pages/                        # Page-level component tests
│   │   └── hooks/                    # Page-specific hook tests
│   ├── config/                       # Config and constants tests
│   ├── security/                     # Security utility tests
│   ├── utils/                        # Utility function tests
│   ├── api/                          # API function tests
│   ├── player/                       # Player component tests
│   └── logging.test.js               # Logging/PII tests
├── integration/
│   └── api/                          # Integration tests (analytics, billing, campaigns, etc.)
├── e2e/
│   ├── auth.setup.js                 # Playwright auth setup (runs first, saves session)
│   ├── helpers.js                    # Shared E2E helpers
│   ├── fixtures/
│   │   └── index.js                  # Custom Playwright fixtures
│   └── *.spec.js                     # E2E test files per feature
└── utils/                            # Test utility helpers
```

## Test Structure

**Suite Organization (unit tests):**
```javascript
/**
 * Playlist Service Unit Tests
 * Phase 6: Tests for playlist service operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ALL vi.mock() calls before any imports of the module under test
vi.mock('../../../src/supabase', () => ({ ... }));
vi.mock('../../../src/services/activityLogService', () => ({ ... }));

describe('playlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API function exports', () => {
    it('exports all required playlist CRUD functions', async () => { ... });
  });

  describe('deletePlaylistSafely', () => {
    it('returns success false with IN_USE code when playlist is in use', async () => { ... });
    it('returns error when getPlaylistUsage fails', async () => { ... });
  });
});

// Additional top-level describe blocks for distinct scenarios are common
describe('playlistService defaults', () => {
  it('createPlaylist has sensible defaults', async () => { ... });
});
```

**Component Test Pattern:**
```javascript
// 1. Define mocks at module level
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// 2. Create render helper with required providers
const renderDashboard = (props = {}) => {
  const defaultProps = { setCurrentPage: vi.fn(), showToast: vi.fn(), ...props };
  return render(
    <BrowserRouter>
      <DashboardPage {...defaultProps} />
    </BrowserRouter>
  );
};

// 3. Set up defaults in beforeEach
beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: mockUser });
  mockGetDashboardStats.mockResolvedValue(createMockStats());
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

**Hook Test Pattern:**
```javascript
import { renderHook } from '@testing-library/react';
import { useAdminAccess } from '../../../src/hooks/useAdmin';

it('returns isSuperAdmin true for super_admin role', () => {
  mockUseAuth.mockReturnValue({ userProfile: { role: 'super_admin' }, loading: false });
  const { result } = renderHook(() => useAdminAccess());
  expect(result.current.isSuperAdmin).toBe(true);
});

// Testing hook reactivity
it('updates when auth context changes', async () => {
  const { result, rerender } = renderHook(() => useAdminAccess());
  mockUseAuth.mockReturnValue({ userProfile: { role: 'super_admin' }, loading: false });
  rerender();
  expect(result.current.isSuperAdmin).toBe(true);
});
```

**Patterns:**
- `beforeEach`: always calls `vi.clearAllMocks()` at minimum
- `afterEach`: calls `vi.restoreAllMocks()` in component tests (less common in service tests)
- `waitFor`: used for async state updates in component tests
- `fireEvent`: preferred over `userEvent` in this codebase for interaction simulation
- Dynamic imports inside tests: `const { fn } = await import('../../../src/services/service')` — used to get fresh module after mocks are set up

## Mocking

**Framework:** Vitest's `vi` API (equivalent to Jest's `jest`)

**Global mocks in `tests/setup.js` (applied to ALL tests):**
- `loggingService.js` — fully mocked to break circular import with supabase
- `window.matchMedia` — browser API stub
- `ResizeObserver` — browser API stub
- `IntersectionObserver` — browser API stub
- `URL.createObjectURL` / `URL.revokeObjectURL` — browser API stub
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — env var stubs with valid-format values

**Supabase mock pattern (repeated per test file):**
```javascript
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
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
```

**Chainable mock pattern (for complex Supabase queries):**
```javascript
const createChainableMock = (finalValue = { data: null, error: null }) => {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'eq', 'is', 'in', 'order', 'limit', 'range'];
  methods.forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockResolvedValue(finalValue);
  return chain;
};
vi.mock('../../../src/supabase', () => ({
  supabase: { from: vi.fn(() => createChainableMock()) },
}));
```

**Per-test mock overrides:**
```javascript
// Override a specific call with once()
supabase.rpc.mockResolvedValueOnce({ data: { is_in_use: true }, error: null });

// Chain multiple return values
mockGetDashboardStats
  .mockRejectedValueOnce(new Error('First error'))
  .mockResolvedValueOnce(createMockStats());

// Override from() to return specific chain
supabase.from.mockReturnValue({
  update: mockUpdate,
  eq: mockEq,
  select: mockSelect,
  single: mockSingle,
});
```

**What to Mock:**
- `src/supabase` — always mocked in unit tests (would hit real DB otherwise)
- `src/services/loggingService.js` — always mocked globally (circular import issue)
- `src/contexts/AuthContext` — mock `useAuth` return value per test
- Dependent services (e.g., `activityLogService`, `permissionsService`) — mock to isolate unit under test
- Browser globals not in jsdom — `matchMedia`, `ResizeObserver`, `IntersectionObserver`

**What NOT to Mock:**
- Pure utility functions being tested (`formatDate`, `sanitizeHTML`, etc.) — test real implementation
- The module under test itself
- Simple constants or type definitions

## Fixtures and Factories

**Test Data Pattern — static objects + factory functions:**
```javascript
// src/__fixtures__/playlists.js
export const mockPlaylist = {
  id: 'playlist-123',
  name: 'Test Playlist',
  description: null,
  owner_id: 'user-123',
  tenant_id: 'tenant-123',
  shuffle: false,
  default_duration: 10,
  transition_effect: 'fade',
  items: [mockPlaylistItem],
};

export function createMockPlaylist(overrides = {}) {
  return { ...mockPlaylist, ...overrides };
}
```

**In-file factory functions (component tests):**
```javascript
const createMockStats = (overrides = {}) => ({
  screens: { total: 5, online: 3, offline: 2, ...overrides.screens },
  playlists: { total: 8, ...overrides.playlists },
  media: { total: 25, images: 15, videos: 8, apps: 2, ...overrides.media },
});

const createMockScreens = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `screen-${i}`,
    device_name: `Test Screen ${i + 1}`,
    isOnline: i % 2 === 0,
  }));
};
```

**Location:**
- Shared fixtures: `src/__fixtures__/` (imported by tests via `../../../src/__fixtures__/`)
  - `src/__fixtures__/playlists.js`
  - `src/__fixtures__/screens.js`
  - `src/__fixtures__/schedules.js`
  - `src/__fixtures__/index.js` (barrel re-export)
- Test-local factories: defined inline at top of each test file (not extracted unless used in multiple files)
- Shared Supabase mock: `tests/mocks/supabase.js` (configurable, used for Player tests)

## Coverage

**Requirements:** Thresholds set to 0 — no minimum enforced (comment in vitest.config.js: "TODO: Raise thresholds as more tests are added")

**Provider:** V8 (`@vitest/coverage-v8`)

**Output formats:** text (terminal), JSON, HTML

**View Coverage:**
```bash
npm run test:coverage         # Generates coverage/ directory
open coverage/index.html      # View HTML report
```

**Included:** `src/**/*.{js,jsx}`

**Excluded from coverage:**
- `src/main.jsx`
- `src/supabase.js`
- `node_modules/**`
- `tests/**`

## Test Types

**Unit Tests (`tests/unit/`):**
- Scope: single service function, component render, or hook return value
- Supabase always mocked; dependent services always mocked
- Tests verify: exports exist, functions throw correctly, state updates, render output
- ~40 service test files, multiple component/hook/page test files

**Integration Tests (`tests/integration/api/`):**
- Files: `analytics.test.js`, `billing.test.js`, `campaigns.test.js`, `content-resolution.test.js`, `multitenancy.test.js`, `screens.test.js`
- Scope: multi-service interactions; may still mock Supabase but test higher-level flows

**E2E Tests (`tests/e2e/`):**
- Framework: Playwright
- Browsers: Chromium only (Firefox/WebKit commented out)
- Auth: 3 roles — `chromium` (client), `chromium-admin`, `chromium-superadmin`
- Session reuse: `playwright/.auth/{role}.json` storage state (created by `auth.setup.js`)
- Timeouts: 60s test, 15s action, 30s navigation, 10s assertion
- Screenshots/video captured on failure/retry

## Common Patterns

**Async Loading Tests (component):**
```javascript
it('shows loading state on initial load', async () => {
  let resolveStats;
  const statsPromise = new Promise((resolve) => { resolveStats = resolve; });
  mockGetDashboardStats.mockReturnValue(statsPromise);

  renderDashboard();
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  resolveStats(createMockStats());
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

**Error Testing (service):**
```javascript
it('requires authentication', async () => {
  supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
  const { createPlaylist } = await import('../../../src/services/playlistService');
  await expect(createPlaylist({ name: 'Test' })).rejects.toThrow('User must be authenticated');
});
```

**Timer Testing (service with intervals):**
```javascript
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});
it('debounces sync calls', async () => {
  vi.advanceTimersByTime(300);
  // assert after timer fires
});
```

**E2E Navigation Pattern:**
```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection, waitForPageReady } from './helpers.js';

test.describe('Screens Page', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test('loads with correct header', async ({ page }) => {
    await loginAndPrepare(page);
    await navigateToSection(page, 'screens');
    await expect(page.locator('h1:has-text("Screens")')).toBeVisible({ timeout: 10000 });
  });
});
```

**E2E Role-Conditional Tests:**
```javascript
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
});
// OR
test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');
```

**E2E Custom Fixtures:**
```javascript
// Use freshPage for unauthenticated flows
import { test, expect } from './fixtures/index.js';

test('unauthenticated test', async ({ freshPage }) => {
  await freshPage.goto('/auth/login');
});

// Use authenticatedPage for pre-authenticated tests
test('authenticated test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/app/settings');
});
```

**Export Smoke Tests (common service test pattern):**
```javascript
it('exports all required playlist CRUD functions', async () => {
  const playlistService = await import('../../../src/services/playlistService');
  expect(typeof playlistService.fetchPlaylists).toBe('function');
  expect(typeof playlistService.createPlaylist).toBe('function');
  // etc.
});
```

---

*Testing analysis: 2026-02-17*
