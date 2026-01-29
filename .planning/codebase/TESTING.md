# Testing Patterns

**Analysis Date:** 2026-01-29

## Test Framework

**Runner:**
- Vitest 4.0.14
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest expect + Testing Library matchers (`@testing-library/jest-dom`)

**Run Commands:**
```bash
npm run test              # Run all unit/integration tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
npm run test:unit         # Unit tests only (tests/unit)
npm run test:integration  # Integration tests only (tests/integration)
npm run test:e2e          # E2E tests with Playwright
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # Playwright headed mode
npm run test:all          # Run all tests (unit + e2e)
npm run test:ci           # CI pipeline (seeds test user, runs all)
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/` (mirrors `src/` structure)
- Integration tests: `tests/integration/api/` (API integration)
- E2E tests: `tests/e2e/` (Playwright specs)
- Test utilities: `tests/utils/`
- Mocks: `tests/mocks/` (MSW handlers, mock services)

**Naming:**
- Unit/Integration: `*.test.js` suffix (`authService.test.js`, `cacheService.test.js`)
- E2E: `*.spec.js` suffix (`auth.spec.js`, `screens.spec.js`)
- Component tests: `.test.jsx` for JSX (`Player.test.jsx`, `useTapSequence.test.jsx`)

**Structure:**
```
tests/
├── e2e/                    # E2E Playwright tests
│   ├── auth.spec.js
│   ├── screens.spec.js
│   └── helpers.js          # Shared E2E utilities
├── integration/
│   └── api/                # API integration tests
│       ├── analytics.test.js
│       └── screens.test.js
├── unit/
│   ├── services/           # Service tests
│   │   ├── authService.test.js
│   │   └── cacheService.test.js
│   ├── hooks/              # Hook tests
│   │   └── useAuditLogs.test.jsx
│   ├── player/             # Player component tests
│   │   └── Player.test.jsx
│   └── config/             # Config tests
│       └── featureFlags.test.js
├── mocks/
│   ├── loggingService.js   # Mock logging
│   └── supabase.js         # Mock Supabase client
├── setup.js                # Global test setup
└── utils/                  # Test helpers
```

## Test Structure

**Suite Organization:**
```javascript
/**
 * Service Name Unit Tests
 * Phase X: Description
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      // ... other methods
    },
  },
}));

describe('serviceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('returns success on valid input', async () => {
      // Arrange
      const mockData = { id: 'test-123' };

      // Act
      const result = await functionName(mockData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns error on invalid input', async () => {
      // Arrange, Act, Assert
      const result = await functionName(null);
      expect(result.error).toBeDefined();
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks for grouping related tests
- `beforeEach` for setup/cleanup (clear mocks)
- Arrange-Act-Assert pattern (not always explicit comments)
- Async tests use `async/await` consistently
- Clear test names: "returns X when Y", "shows error for invalid Z"

**E2E Structure:**
```javascript
/**
 * Feature E2E Tests
 * Description
 */
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

test.describe('Feature Area', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('performs expected action', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /text/i })).toBeVisible();
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page).toHaveURL(/\/success/);
  });
});
```

## Mocking

**Framework:** Vitest `vi.mock()` for unit tests, MSW not currently configured

**Patterns:**
```javascript
// Module-level mock (hoisted)
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Setup mock return values in tests
supabase.auth.signInWithPassword.mockResolvedValueOnce({
  data: { user: mockUser },
  error: null,
});
```

**What to Mock:**
- Supabase client (always mocked in unit tests)
- `loggingService` (globally mocked in `tests/setup.js` to avoid circular dependencies)
- Browser APIs: `window.matchMedia`, `ResizeObserver`, `IntersectionObserver` (in setup)
- External services: S3, analytics, weather APIs
- File operations: `URL.createObjectURL`, `URL.revokeObjectURL`

**What NOT to Mock:**
- Pure utility functions (test directly)
- React hooks from `react` (use Testing Library)
- Components under test (only mock dependencies)

## Fixtures and Factories

**Test Data:**
```javascript
// Inline fixture pattern
const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockSession = {
  access_token: 'token123',
  user: { id: 'user-123' }
};

// Mock Supabase client in tests/mocks/supabase.js
export const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    // ...
  },
};
```

**Location:**
- Inline fixtures: Defined in test files (common pattern)
- Shared mocks: `tests/mocks/loggingService.js`, `tests/mocks/supabase.js`
- E2E helpers: `tests/e2e/helpers.js` (`loginAndPrepare`, `dismissAnyModals`)

## Coverage

**Requirements:** No enforced thresholds (all set to 0 for CI to pass during test buildout)

```javascript
// vitest.config.js
thresholds: {
  statements: 0,
  branches: 0,
  functions: 0,
  lines: 0
}
// TODO: Raise thresholds as more tests are added
```

**View Coverage:**
```bash
npm run test:coverage
# Opens ./coverage/index.html
```

**Coverage config:**
- Provider: v8
- Reports: text, json, html
- Directory: `./coverage`
- Includes: `src/**/*.{js,jsx}`
- Excludes: `src/main.jsx`, `src/supabase.js`, `node_modules`, `tests`

## Test Types

**Unit Tests:**
- Scope: Services, utilities, hooks, config modules
- Files: `tests/unit/services/`, `tests/unit/hooks/`, `tests/unit/config/`
- Approach: Mock all dependencies, test in isolation
- Examples:
  - `tests/unit/services/authService.test.js` - Auth functions
  - `tests/unit/services/cacheService.test.js` - Cache operations
  - `tests/unit/hooks/useAuditLogs.test.js` - React hooks
  - `tests/unit/config/featureFlags.test.js` - Config validation

**Integration Tests:**
- Scope: API interactions, multi-service workflows
- Files: `tests/integration/api/`
- Approach: Mock Supabase, test service interactions
- Examples:
  - `tests/integration/api/screens.test.js` - Screen CRUD
  - `tests/integration/api/analytics.test.js` - Analytics aggregation
  - `tests/integration/api/campaigns.test.js` - Campaign workflows

**E2E Tests:**
- Framework: Playwright 1.57.0
- Config: `playwright.config.js`
- Scope: Full user flows, UI interactions
- Browser: Chromium (primary), Firefox/Webkit commented out
- Approach: Real browser, real backend (dev/test environment)
- Examples:
  - `tests/e2e/auth.spec.js` - Login, signup, password reset
  - `tests/e2e/screens.spec.js` - Screen management
  - `tests/e2e/playlists.spec.js` - Playlist creation
  - `tests/e2e/performance.spec.js` - Performance budgets
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI, unlimited locally
- Artifacts: Screenshots on failure, video on retry, trace on retry

## Common Patterns

**Async Testing:**
```javascript
it('fetches data successfully', async () => {
  supabase.from().select.mockResolvedValueOnce({
    data: [{ id: 1 }],
    error: null,
  });

  const result = await fetchData();

  expect(result.data).toHaveLength(1);
});
```

**Error Testing:**
```javascript
it('handles error gracefully', async () => {
  supabase.auth.signIn.mockResolvedValueOnce({
    data: { user: null },
    error: { message: 'Invalid credentials' },
  });

  const result = await signIn('email', 'password');

  expect(result.user).toBeNull();
  expect(result.error).toBe('Invalid credentials');
});
```

**Component Testing (React):**
```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('renders component with props', () => {
  render(<Component prop="value" />);
  expect(screen.getByText(/value/i)).toBeInTheDocument();
});
```

**E2E Waiting Pattern:**
```javascript
// Wait for navigation
await page.waitForURL(/\/app/, { timeout: 15000 });

// Wait for element
await expect(page.getByRole('heading')).toBeVisible();

// Wait for API (use waitForResponse if needed)
await page.waitForTimeout(500); // Use sparingly
```

**E2E Authentication Helper:**
```javascript
import { loginAndPrepare } from './helpers.js';

test('authenticated flow', async ({ page }) => {
  await loginAndPrepare(page);
  // Test now has authenticated session
  await page.goto('/app/screens');
  await expect(page.getByRole('heading', { name: /screens/i })).toBeVisible();
});
```

**Global Setup (Vitest):**
- File: `tests/setup.js`
- Runs before each test file
- Sets up Testing Library matchers
- Mocks `loggingService` globally (breaks circular dependency)
- Mocks browser APIs: `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `URL.createObjectURL`
- Stubs environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Cleanup: `afterEach(() => cleanup())` from Testing Library

---

*Testing analysis: 2026-01-29*
