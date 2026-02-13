# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Runner:**
- Vitest 4.0.14 for unit and integration tests
- Playwright 1.57.0 for E2E tests
- Config: `vitest.config.js` and `playwright.config.js`

**Assertion Library:**
- Vitest built-in `expect` for unit tests
- Testing Library matchers extended via `@testing-library/jest-dom`
- Playwright `expect` for E2E assertions

**Run Commands:**
```bash
npm test                    # Run all unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm run test:unit           # Unit tests only (tests/unit)
npm run test:integration    # Integration tests only (tests/integration)
npm run test:e2e            # E2E tests (Playwright)
npm run test:e2e:ui         # E2E with Playwright UI
npm run test:e2e:headed     # E2E with visible browser
npm run test:all            # All tests (unit + E2E)
npm run test:ci             # CI pipeline (seeds test user)
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/**/*.test.js` or `*.test.jsx`
- Integration tests: `tests/integration/**/*.test.js`
- E2E tests: `tests/e2e/**/*.spec.js`
- Test setup: `tests/setup.js` (runs before all tests)

**Naming:**
- Unit/integration: `{module}.test.js` matches source file
- E2E: `{feature}.spec.js` describes user flow
- Examples:
  - `tests/unit/services/alertEngineService.test.js` → `src/services/alertEngineService.js`
  - `tests/unit/security/SafeHTML.test.jsx` → `src/security/SafeHTML.jsx`
  - `tests/e2e/dashboard.spec.js` → Dashboard feature

**Structure:**
```
tests/
├── setup.js                      # Global test setup
├── unit/
│   ├── services/
│   │   ├── alertEngineService.test.js
│   │   └── dataBindingResolver.test.js
│   ├── security/
│   │   ├── SafeHTML.test.jsx
│   │   └── sanitize.test.js
│   └── components/
│       └── ScreenGroupSettingsTab.test.jsx
├── integration/
│   └── (integration tests here)
└── e2e/
    ├── auth.setup.js             # E2E auth setup
    ├── helpers.js                # E2E helper functions
    ├── dashboard.spec.js
    ├── media.spec.js
    └── alerts-center.spec.js
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ModuleName functionName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success cases', () => {
    it('performs expected operation', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await functionName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });

  describe('error cases', () => {
    it('handles errors gracefully', async () => {
      // Test error scenarios
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks organize related tests
- Top-level `describe` per module or function
- Sub-`describe` for feature groups (constants, error handling, edge cases)
- `beforeEach` for setup/mocking reset
- `it` statements describe expected behavior in plain English
- Arrange-Act-Assert pattern (AAA) in test bodies

**Component Tests:**
```jsx
import { render, screen } from '@testing-library/react';
import { SafeHTML } from '../../../src/security/SafeHTML.jsx';

describe('SafeHTML', () => {
  it('renders clean HTML correctly', () => {
    render(<SafeHTML html="<b>bold text</b>" />);
    expect(screen.getByText('bold text')).toBeInTheDocument();
  });

  it('strips XSS payloads', () => {
    const { container } = render(<SafeHTML html='<script>alert("xss")</script>' />);
    expect(container.querySelector('script')).toBeNull();
  });
});
```

**E2E Tests:**
```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

test.describe('Dashboard Loading', () => {
  test('dashboard loads successfully after login', async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });

    await waitForPageReady(page);
    await expect(page).toHaveURL(/\/app/);
  });
});
```

## Mocking

**Framework:** Vitest `vi.mock()` and `vi.fn()`

**Patterns:**
```javascript
// Module mocking (must be hoisted before imports)
vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn(() => createChainableMock()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

// Chainable mock for Supabase query builder
const createChainableMock = (finalValue = { data: null, error: null }) => {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'eq', 'is', 'in', 'order', 'limit'];
  methods.forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockResolvedValue(finalValue);
  return chain;
};

// Import after mocking
import { raiseAlert } from '../../../src/services/alertEngineService';
import { supabase } from '../../../src/supabase';
```

**What to Mock:**
- Supabase client - always mocked in unit tests to avoid real DB calls
- External services - API clients, third-party SDKs
- Logging service - globally mocked in `tests/setup.js` to break circular dependencies
- Browser APIs - `window.matchMedia`, `ResizeObserver`, `IntersectionObserver`
- File operations - `URL.createObjectURL`, `URL.revokeObjectURL`

**What NOT to Mock:**
- Pure utility functions - test actual implementations
- React hooks (except in specific isolation tests)
- Constants and enums
- Simple formatters and validators

## Fixtures and Factories

**Test Data:**
```javascript
// Inline fixture objects in tests
const mockAlerts = [
  { id: '1', title: 'Alert 1', status: 'open' },
  { id: '2', title: 'Alert 2', status: 'open' },
];

// Reusable fixture in setup
const existingAlert = {
  id: 'alert-1',
  type: ALERT_TYPES.DEVICE_OFFLINE,
  severity: ALERT_SEVERITIES.WARNING,
  meta: { minutes_offline: 15 },
  occurrences: 1,
  created_at: new Date().toISOString(),
};
```

**Location:**
- Fixtures defined inline within test files
- No separate fixtures directory detected
- E2E helpers in `tests/e2e/helpers.js` provide reusable functions

## Coverage

**Requirements:**
- Thresholds currently set to 0% (explicitly documented as temporary)
- Comment in `vitest.config.js`: "TODO: Raise thresholds as more tests are added"
- Coverage tracked but not enforced in CI

**View Coverage:**
```bash
npm run test:coverage
# Opens coverage/index.html
```

**Configuration:**
- Provider: V8
- Reporters: text, json, html
- Output: `./coverage/`
- Includes: `src/**/*.{js,jsx}`
- Excludes: `src/main.jsx`, `src/supabase.js`, `node_modules/**`, `tests/**`

## Test Types

**Unit Tests:**
- Scope: Single function or component in isolation
- Location: `tests/unit/`
- Mocking: Heavy mocking of dependencies
- Example: `alertEngineService.test.js` - tests individual alert functions with mocked Supabase

**Integration Tests:**
- Scope: Multiple modules working together
- Location: `tests/integration/`
- Mocking: Minimal mocking, test real interactions
- Example: (Directory exists but limited tests observed)

**E2E Tests:**
- Scope: Full user workflows in real browser
- Location: `tests/e2e/`
- Framework: Playwright with 3 browser projects (chromium, chromium-admin, chromium-superadmin)
- Auth: Pre-authenticated via storage state (`playwright/.auth/*.json`)
- Setup: `auth.setup.js` runs first to authenticate and save sessions
- Pattern: Test real user interactions, no mocking

## Common Patterns

**Async Testing:**
```javascript
it('performs async operation', async () => {
  const result = await raiseAlert({
    type: ALERT_TYPES.DEVICE_OFFLINE,
    severity: ALERT_SEVERITIES.WARNING,
  });

  expect(result.alertId).toBe('alert-123');
});
```

**Error Testing:**
```javascript
it('handles errors gracefully', async () => {
  mockFrom.mockImplementation(() => ({
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
    })),
  }));

  const result = await acknowledgeAlert('alert-123');

  expect(result).toBe(false);
});
```

**Component Testing with User Events:**
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('handles user interaction', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole('button'));

  expect(screen.getByText('Clicked')).toBeInTheDocument();
});
```

**E2E Page Interactions:**
```javascript
test('user can navigate to dashboard', async ({ page }) => {
  await loginAndPrepare(page);
  await waitForPageReady(page);

  const playlistsCard = page.getByText('Playlists', { exact: true });
  await expect(playlistsCard).toBeVisible();
  await playlistsCard.click();

  await expect(page.locator('main')).toBeVisible();
});
```

**Comprehensive Test Coverage:**
```javascript
// Tests organized by feature with clear sections
describe('alertEngineService', () => {
  // ============================================================================
  // CONSTANTS TESTS
  // ============================================================================
  describe('constants', () => { /* ... */ });

  // ============================================================================
  // RAISE ALERT TESTS
  // ============================================================================
  describe('raiseAlert', () => { /* ... */ });

  // ============================================================================
  // RATE LIMITING TESTS
  // ============================================================================
  describe('rate limiting', () => { /* ... */ });
});
```

**Global Test Setup (`tests/setup.js`):**
- Mocks `loggingService` globally to prevent circular dependency
- Extends Vitest expect with Testing Library matchers
- Cleans up after each test via `afterEach(cleanup)`
- Mocks environment variables (Supabase URL/key)
- Mocks browser APIs (matchMedia, ResizeObserver, IntersectionObserver)
- Stubs `URL.createObjectURL` and `URL.revokeObjectURL`

---

*Testing analysis: 2026-02-13*
