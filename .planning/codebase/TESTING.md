# Testing Patterns

**Analysis Date:** 2026-02-12

## Test Framework

**Runner:**
- Vitest 4.0.14 (unit & integration tests)
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest expect (extended with @testing-library/jest-dom matchers)
- React Testing Library (@testing-library/react 16.3.0)

**Run Commands:**
```bash
npm run test              # Run all unit/integration tests
npm run test:watch        # Watch mode
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # With coverage report
npm run test:e2e          # E2E tests (Playwright)
npm run test:all          # All tests (unit + e2e)
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/**/*.test.js`
- Integration tests: `tests/integration/**/*.test.js`
- E2E tests: `tests/e2e/**/*.spec.js`

**Naming:**
- Unit/integration: `.test.js` extension
- E2E: `.spec.js` extension
- Mirror source structure: `services/cacheService.js` → `tests/unit/services/cacheService.test.js`

**Structure:**
```
tests/
├── unit/
│   ├── services/         # Service layer tests
│   ├── hooks/           # React hook tests
│   ├── api/             # API client tests
│   ├── config/          # Config tests
│   ├── security/        # Security tests
│   ├── utils/           # Utility tests
│   └── player/          # Player-specific tests
├── integration/
│   └── api/             # API integration tests
├── e2e/
│   ├── fixtures/        # Custom Playwright fixtures
│   └── *.spec.js        # E2E test files
└── setup.js             # Global test setup
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ServiceCache', () => {
  beforeEach(() => {
    clearAllServiceCaches();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      caches.screens.set('test-key', { id: 1, name: 'Test' });
      const result = caches.screens.get('test-key');
      expect(result).toEqual({ id: 1, name: 'Test' });
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks for logical grouping
- `beforeEach` for test isolation/setup
- `afterEach` for cleanup (automatic via setup.js for React components)
- No `beforeAll` or `afterAll` in typical tests

**Assertion Pattern:**
- Use descriptive test names: `'should return null for non-existent keys'`
- Single assertion per test preferred
- Multiple related assertions acceptable
- Use `toBe` for primitives, `toEqual` for objects/arrays

## Mocking

**Framework:** Vitest (`vi.mock()`, `vi.fn()`, `vi.spyOn()`)

**Patterns:**

**Module Mocking:**
```javascript
// Mock entire module before imports
vi.mock('../../../src/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-123' } } }),
    },
  },
}));
```

**Function Mocking:**
```javascript
const fetcher = vi.fn().mockResolvedValue(['screen1', 'screen2']);
```

**Service Mocking:**
```javascript
vi.mock('../../../src/services/activityLogService', () => ({
  logActivity: vi.fn(),
  ACTIONS: { PLAYLIST_CREATED: 'playlist_created' },
  RESOURCE_TYPES: { PLAYLIST: 'playlist' },
}));
```

**What to Mock:**
- External services (Supabase, Sentry)
- Cross-module dependencies
- Logging service (mocked globally in `tests/setup.js`)
- HTTP requests
- Browser APIs (ResizeObserver, IntersectionObserver)

**What NOT to Mock:**
- Internal logic of the module under test
- Simple utility functions
- Constants and configuration

## Fixtures and Factories

**Test Data:**
- Factory functions in `tests/utils/factories.js` (referenced but not read)
- Example from integration test:
```javascript
import {
  createTestScreen,
  createTestPlaylist,
  createTestCampaign,
  generateUUID
} from '../../utils/factories';
```

**Location:**
- Test utilities: `tests/utils/`
- E2E fixtures: `tests/e2e/fixtures/index.js`

**E2E Fixtures Pattern:**
```javascript
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await loginAndPrepare(page);
    await use(page);
  },

  freshPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] }
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
```

## Coverage

**Requirements:** None enforced (thresholds set to 0)

**View Coverage:**
```bash
npm run test:coverage
```

**Configuration:**
- Provider: v8
- Reporter: text, json, html
- Reports directory: `./coverage`
- Include: `src/**/*.{js,jsx}`
- Exclude: `src/main.jsx`, `src/supabase.js`, tests, node_modules

**Thresholds:**
```javascript
thresholds: {
  statements: 0,
  branches: 0,
  functions: 0,
  lines: 0
}
```
*Note: Set to 0 to allow CI to pass while coverage is being built out*

## Test Types

**Unit Tests:**
- Scope: Individual functions, services, hooks in isolation
- Location: `tests/unit/**/*.test.js`
- Mocking: Heavy mocking of dependencies
- Example: `tests/unit/services/cacheService.test.js`

**Integration Tests:**
- Scope: Multiple modules working together
- Location: `tests/integration/**/*.test.js`
- Mocking: Minimal, tests real interactions
- Example: `tests/integration/api/content-resolution.test.js`

**E2E Tests:**
- Framework: Playwright 1.57.0
- Config: `playwright.config.js`
- Browser: Chromium (Chrome Desktop)
- Scope: Full user flows in real browser
- Location: `tests/e2e/**/*.spec.js`

## E2E Testing (Playwright)

**Configuration:**
```javascript
// playwright.config.js
timeout: 60_000,           // 60s global timeout
expect.timeout: 10_000,    // 10s assertion timeout
actionTimeout: 15_000,     // 15s click/fill timeout
navigationTimeout: 30_000  // 30s navigation timeout
```

**Projects:**
- `setup` - Auth setup runs first
- `chromium` - Client role (standard user)
- `chromium-admin` - Admin role
- `chromium-superadmin` - Superadmin role

**Authentication:**
- Storage state saved to `playwright/.auth/[role].json`
- Projects depend on setup project
- Auth state reused across tests

**Test Isolation:**
```javascript
// Unauthenticated tests
test.describe('Login Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  // Tests here have clean state
});

// Fresh context for single test
test('isolated test', async ({ freshPage }) => {
  // freshPage is completely clean
});
```

## Common Patterns

**Async Testing:**
```javascript
it('should call fetcher and cache result if not cached', async () => {
  const fetcher = vi.fn().mockResolvedValue(['screen1', 'screen2']);

  const result = await caches.screens.getOrFetch('new-key', fetcher);

  expect(result).toEqual(['screen1', 'screen2']);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
```

**Error Testing:**
```javascript
it('should throw error on failure', async () => {
  const { error } = await query;
  expect(error).toBeDefined();
});
```

**React Component Testing:**
```javascript
import { render, screen } from '@testing-library/react';

it('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

**Timer Testing:**
```javascript
it('should expire entries after TTL', async () => {
  caches.screens.set('expiring', 'value', 50);
  expect(caches.screens.get('expiring')).toBe('value');

  await new Promise((resolve) => setTimeout(resolve, 60));

  expect(caches.screens.get('expiring')).toBeNull();
});
```

**E2E Selectors:**
```javascript
// Prefer accessible selectors
await page.getByRole('button', { name: /sign in/i });
await page.getByPlaceholder(/email/i);
await page.getByText(/forgot.*password/i);

// Fallback to locators when needed
await page.locator('.bg-red-50');
```

## Global Test Setup

**File:** `tests/setup.js`

**Responsibilities:**
- Extend Vitest expect with Testing Library matchers
- Mock loggingService globally (breaks circular dependency)
- Mock environment variables
- Mock browser APIs (matchMedia, ResizeObserver, IntersectionObserver)
- Auto-cleanup after each test

**Critical Mocks:**
```javascript
// Global logging mock (prevents circular dependency)
vi.mock('../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
}));

// Mock Supabase env vars
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGci...[valid JWT format]');
```

## Test Environment

**Vitest:**
- Environment: jsdom (simulates browser)
- Globals: true (describe, it, expect available globally)
- Reporter: verbose
- Timeout: 10 seconds

**Playwright:**
- Base URL: `http://localhost:5173` (dev server)
- Web server: Auto-starts `npm run dev`
- Parallel: Full parallel execution
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI, unlimited locally

## CI/CD Testing

**Commands:**
```bash
npm run test:ci        # CI pipeline: unit + e2e with DB seed
npm run test:ci:local  # Local simulation: unit + e2e
```

**CI Behavior:**
- Retries E2E tests 2x on failure
- Single worker (sequential E2E tests)
- Forbids `test.only` in committed code
- Seeds test user via `scripts/seed-ci-test-user.cjs`

---

*Testing analysis: 2026-02-12*
