# Testing Patterns

**Analysis Date:** 2026-02-05

## Test Framework

**Runner:**
- Vitest 4.0.14
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest expect + Testing Library matchers
- Extended via `expect.extend(matchers)` in setup

**Run Commands:**
```bash
npm run test              # Run all tests (unit + integration)
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
npm run test:unit         # Run only unit tests
npm run test:integration  # Run only integration tests
npm run test:e2e          # Run E2E tests (Playwright)
npm run test:all          # Run all tests (unit + integration + E2E)
```

**E2E Framework:**
- Playwright 1.57.0
- Config: `playwright.config.js`

## Test File Organization

**Location:**
- Unit tests: `tests/unit/**/*.test.{js,jsx}`
- Integration tests: `tests/integration/**/*.test.{js,jsx}`
- E2E tests: `tests/e2e/**/*.spec.{js,jsx}`

**Naming:**
- Unit: Match source file name with `.test.js` suffix
  - `src/services/mediaService.js` → `tests/unit/services/mediaService.test.js`
  - `src/components/Badge.jsx` → `tests/unit/components/Badge.test.jsx`
- E2E: Descriptive name with `.spec.js` suffix
  - `tests/e2e/auth.spec.js`, `tests/e2e/dashboard.spec.js`

**Structure:**
```
tests/
├── unit/
│   ├── components/         # Component tests
│   ├── services/          # Service layer tests
│   ├── hooks/             # Custom hook tests
│   ├── utils/             # Utility function tests
│   ├── config/            # Config tests
│   └── player/            # Player-specific tests
├── integration/
│   └── api/               # API integration tests
├── e2e/
│   ├── auth.spec.js       # E2E feature tests
│   ├── helpers.js         # Shared E2E utilities
│   └── auth.setup.js      # Setup project
└── setup.js               # Global test setup
```

## Test Structure

**Suite Organization:**
```javascript
/**
 * Service/Component Unit Tests
 * Brief description of what's being tested
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentName or serviceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Group', () => {
    it('describes specific behavior', () => {
      // Arrange
      const input = { ... };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

**Example from `sceneDesignService.test.js`:**
```javascript
describe('sceneDesignService', () => {
  describe('Animation Constants', () => {
    it('defines all animation types', () => {
      expect(ANIMATION_TYPES).toHaveLength(5);
      const values = ANIMATION_TYPES.map(t => t.value);
      expect(values).toContain('none');
      expect(values).toContain('fade');
    });
  });

  describe('applyBlockAnimation', () => {
    it('applies animation to the correct block', () => {
      const result = applyBlockAnimation(mockDesign, 'block1', { type: 'fade' });
      expect(result.blocks[0].animation.type).toBe('fade');
    });

    it('does not mutate original design', () => {
      const original = JSON.parse(JSON.stringify(mockDesign));
      applyBlockAnimation(mockDesign, 'block1', { type: 'fade' });
      expect(mockDesign).toEqual(original);
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks for logical grouping
- Descriptive `it` statements that read as specifications
- One assertion per test (where practical)
- Arrange-Act-Assert pattern (implicit, not commented)

## Mocking

**Framework:** Vitest `vi` utilities

**Patterns:**

**Mock modules at top of file:**
```javascript
vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
  },
}));
```

**Mock services:**
```javascript
vi.mock('../../../src/services/languageService', () => ({
  getSupportedLanguages: vi.fn(() => [
    { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  ]),
}));
```

**Mock functions:**
```javascript
const onUpdate = vi.fn();
const showToast = vi.fn();

// Later, assert calls:
expect(onUpdate).toHaveBeenCalled();
expect(showToast).toHaveBeenCalledWith('Success message', 'success');
```

**What to Mock:**
- External services (Supabase, APIs)
- Other service modules
- Context providers (or wrap in real providers)
- Browser APIs (ResizeObserver, IntersectionObserver)

**What NOT to Mock:**
- The component/function under test
- Simple utilities (unless testing boundaries)
- React itself

## Fixtures and Factories

**Test Data:**

**Inline fixtures for simple cases:**
```javascript
const mockDesign = {
  background: { type: 'solid', color: '#000' },
  blocks: [
    { id: 'block1', type: 'text', props: { text: 'Hello' } },
    { id: 'block2', type: 'image', props: { url: 'test.jpg' } },
  ],
};
```

**Factory functions for complex data:**
```javascript
const renderComponent = (props = {}) => {
  const defaultGroup = {
    id: 'group-123',
    name: 'Test Group',
    display_language: '',
    location_code: '',
  };

  const defaultProps = {
    group: defaultGroup,
    onUpdate: vi.fn(),
    showToast: vi.fn(),
    ...props,
  };

  return render(
    <BrowserRouter>
      <ScreenGroupSettingsTab {...defaultProps} />
    </BrowserRouter>
  );
};
```

**Location:**
- Defined within test files
- Not extracted to separate fixture files (pattern observed)

## Coverage

**Requirements:** 0% thresholds (legacy codebase building coverage)

**Config in `vitest.config.js`:**
```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  reportsDirectory: './coverage',
  include: ['src/**/*.{js,jsx}'],
  exclude: [
    'src/main.jsx',
    'src/supabase.js',
    'node_modules/**',
    'tests/**'
  ],
  thresholds: {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0
  }
}
```

**View Coverage:**
```bash
npm run test:coverage      # Generate report
open coverage/index.html   # View HTML report
```

## Test Types

**Unit Tests:**
- Scope: Single function, component, or module
- Location: `tests/unit/`
- Isolation: Mock all external dependencies
- Speed: Fast (< 100ms per test)
- Run: `npm run test:unit`

**Example:** `tests/unit/services/mediaService.test.js`
```javascript
describe('validateMediaFile', () => {
  it('returns valid for supported file type under size limit', () => {
    const file = { size: 1024 * 1024, type: 'image/jpeg' };
    const result = validateMediaFile(file);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

**Integration Tests:**
- Scope: Multiple modules working together
- Location: `tests/integration/api/`
- Isolation: Real services, mocked external APIs
- Speed: Medium (< 1s per test)
- Run: `npm run test:integration`

**Example:** `tests/integration/api/billing.test.js`, `tests/integration/api/multitenancy.test.js`

**E2E Tests:**
- Framework: Playwright
- Scope: Complete user flows through UI
- Location: `tests/e2e/`
- Isolation: Real browser, real app, test database
- Speed: Slow (5-30s per test)
- Run: `npm run test:e2e`

## Component Testing

**React Testing Library:**
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
```

**Render pattern:**
```javascript
const renderComponent = (props = {}) => {
  const defaultProps = { /* defaults */ ...props };

  return render(
    <BrowserRouter>
      <ComponentUnderTest {...defaultProps} />
    </BrowserRouter>
  );
};
```

**Query pattern:**
```javascript
// Preferred: semantic queries
screen.getByRole('button', { name: /save changes/i });
screen.getByRole('combobox', { name: /display language/i });

// Text content
screen.getByText('Group Language');
screen.getByText(/suggested language/i);

// Form elements
screen.getByLabelText(/email/i);
screen.getByPlaceholder(/password/i);
```

**Interaction pattern:**
```javascript
const button = screen.getByRole('button', { name: /save/i });
fireEvent.click(button);

const input = screen.getByLabelText(/email/i);
fireEvent.change(input, { target: { value: 'test@example.com' } });
```

**Async assertions:**
```javascript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Or
const element = await screen.findByText('Loaded content');
expect(element).toBeVisible();
```

## E2E Test Patterns

**Setup:**
```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';
```

**Authentication:**
```javascript
test.describe('Feature Tests', () => {
  // Use pre-authenticated session
  test.use({ storageState: 'playwright/.auth/client.json' });

  // Or login manually
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });
});
```

**Unauthenticated tests:**
```javascript
test.describe('Public Pages', () => {
  // Clear auth state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});
```

**Navigation pattern:**
```javascript
test('can navigate to feature', async ({ page }) => {
  await loginAndPrepare(page);

  await page.goto('/app/media');
  await waitForPageReady(page);

  await expect(page).toHaveURL(/\/app\/media/);
});
```

**Interaction pattern:**
```javascript
test('can submit form', async ({ page }) => {
  await page.getByLabel(/email/i).fill('user@example.com');
  await page.getByRole('button', { name: /submit/i }).click();

  await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
});
```

**Conditional checks:**
```javascript
const button = page.locator('[data-testid="optional-button"]');
if (await button.isVisible({ timeout: 100 }).catch(() => false)) {
  await button.click();
}
```

## Common Patterns

**Async Testing:**
```javascript
it('fetches data successfully', async () => {
  const result = await fetchData();
  expect(result).toHaveLength(5);
});

it('waits for UI update', async () => {
  renderComponent();
  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

**Error Testing:**
```javascript
it('throws error for invalid input', () => {
  expect(() => validateInput(null)).toThrow();
  expect(() => validateInput(null)).toThrow('Input required');
});

it('handles async errors', async () => {
  const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));

  await expect(mockFn()).rejects.toThrow('Network error');
});
```

**Snapshot Testing:**
```javascript
// Used for design/animation tests
it('matches design snapshot', () => {
  const design = getDefaultDesign();
  expect(design).toMatchSnapshot();
});
```

**Component Props Testing:**
```javascript
it('updates when props change', () => {
  const { rerender } = render(<Component prop="initial" />);
  expect(screen.getByText('initial')).toBeInTheDocument();

  rerender(<Component prop="updated" />);
  expect(screen.getByText('updated')).toBeInTheDocument();
});
```

## Setup and Teardown

**Global Setup:** `tests/setup.js`
```javascript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock global services
vi.mock('../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock browser APIs
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
```

**Per-test Setup:**
```javascript
describe('Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

**E2E Setup:** `tests/e2e/auth.setup.js`
- Runs before test suites to authenticate
- Saves session to `playwright/.auth/*.json`
- Tests reuse saved sessions via `storageState`

## Test Environment

**Vitest:**
- Environment: jsdom
- Globals: true (describe, it, expect available globally)
- Timeout: 10000ms (10s)
- Reporter: verbose

**Playwright:**
- Browser: Chromium (default), also supports Firefox, Webkit
- Parallel: true (run tests concurrently)
- Retries: 2 on CI, 0 locally
- Video: on-first-retry
- Screenshots: only-on-failure
- Projects: chromium (client), chromium-admin, chromium-superadmin

**Environment Variables:**
```bash
# Required for E2E tests
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123

# Playwright base URL
PLAYWRIGHT_BASE_URL=http://localhost:5173
```

## Skip Patterns

**Conditional skips:**
```javascript
test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

test.skip('slow test that is flaky', async ({ page }) => {
  // Test implementation
});
```

**FIXME tests:**
```javascript
test.fixme('not yet implemented', async ({ page }) => {
  // TODO: Implement when feature is ready
});
```

---

*Testing analysis: 2026-02-05*
