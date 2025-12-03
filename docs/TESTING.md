# BizScreen Testing Guide

This document covers the testing infrastructure, how to run tests locally, and how to write new tests.

## Testing Stack

- **Unit & Integration Tests**: [Vitest](https://vitest.dev/) with Testing Library
- **E2E Tests**: [Playwright](https://playwright.dev/)
- **Mocking**: MSW (Mock Service Worker) for API mocking
- **Coverage**: V8 coverage provider

## Directory Structure

```
tests/
├── setup.js              # Vitest setup file
├── utils/
│   ├── factories.js      # Test data factories
│   └── mocks.js          # Mock utilities
├── unit/
│   └── services/         # Service unit tests
│       ├── billingService.test.js
│       ├── licenseService.test.js
│       ├── playerService.test.js
│       └── resellerService.test.js
├── integration/
│   └── api/              # API integration tests
│       ├── analytics.test.js
│       ├── billing.test.js
│       └── campaigns.test.js
└── e2e/                  # Playwright E2E tests
    ├── auth.spec.js
    ├── billing.spec.js
    ├── content-pipeline.spec.js
    ├── enterprise.spec.js
    ├── onboarding.spec.js
    └── reseller.spec.js
```

## Running Tests Locally

### Unit & Integration Tests

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### All Tests (CI Mode)

```bash
# Run full test suite (unit + integration + e2e)
npm run test:ci
```

## Writing Tests

### Unit Tests

Unit tests are for testing pure functions and isolated logic.

```javascript
// tests/unit/services/myService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '../../../src/services/myService';

describe('myService', () => {
  describe('myFunction', () => {
    it('should do something expected', () => {
      const result = myFunction('input');
      expect(result).toBe('expected output');
    });
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

```javascript
// tests/integration/api/myApi.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFetch } from '../../utils/mocks';

describe('My API', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('handles successful request', async () => {
    global.fetch = createMockFetch({
      'POST:/api/my-endpoint': {
        status: 200,
        data: { success: true }
      }
    });

    const response = await fetch('/api/my-endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    });

    expect(response.ok).toBe(true);
  });
});
```

### E2E Tests

E2E tests simulate real user interactions.

```javascript
// tests/e2e/myFlow.spec.js
import { test, expect } from '@playwright/test';

test.describe('My Flow', () => {
  test('user can complete action', async ({ page }) => {
    await page.goto('/');

    // Fill form
    await page.getByPlaceholder('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Verify result
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

## Using Test Factories

Factories provide consistent test data across all tests.

```javascript
import {
  createTestUser,
  createTestPlaylist,
  createTestScreen,
  createTestResellerAndLicense,
  generateUUID
} from '../../utils/factories';

// Create a test user
const user = createTestUser({
  role: 'client',
  subscription_tier: 'pro'
});

// Create a playlist with items
const playlist = createTestPlaylistWithMedia({
  item_count: 5,
  owner_id: user.id
});

// Create reseller with license
const { reseller, license } = createTestResellerAndLicense({
  reseller: { company_name: 'Test Reseller' },
  license: { license_type: 'pro', max_screens: 25 }
});
```

## Mocking Supabase

Use the mock utilities to simulate Supabase responses:

```javascript
import { createMockSupabaseClient } from '../../utils/mocks';

const { mockClient, mockChain } = createMockSupabaseClient();

// Configure mock responses
mockChain.single.mockResolvedValue({
  data: { id: '123', name: 'Test' },
  error: null
});

// Use in tests
vi.mock('../../../src/supabase', () => ({
  supabase: mockClient
}));
```

## E2E Test Configuration

### Environment Variables

For authenticated E2E tests, set these environment variables:

```bash
# Regular user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword

# Reseller credentials
TEST_RESELLER_EMAIL=reseller@example.com
TEST_RESELLER_PASSWORD=resellerpassword

# Enterprise user credentials
TEST_ENTERPRISE_EMAIL=enterprise@example.com
TEST_ENTERPRISE_PASSWORD=enterprisepassword

# Super admin credentials
TEST_SUPERADMIN_EMAIL=admin@example.com
TEST_SUPERADMIN_PASSWORD=adminpassword
```

### Base URL

Configure the base URL for E2E tests:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173
```

## CI Behavior

### On Every Push/PR

1. **Unit Tests**: Run immediately after lint
2. **Integration Tests**: Run immediately after lint
3. **Coverage Report**: Generated and uploaded as artifact

### Build-Dependent Tests

1. **E2E Tests**: Run after build completes (includes smoke tests)
2. **Playwright Report**: Uploaded on failure

### Production Smoke Tests

The smoke test suite (`tests/e2e/smoke.spec.js`) verifies critical paths are working:

- **Application Health**: App loads without fatal errors, static assets load correctly
- **Authentication Flow**: Login completes successfully
- **Core Navigation**: Dashboard, media library, screens, and playlists are accessible
- **Error Handling**: No JavaScript errors in console on main pages
- **UI Responsiveness**: Sidebar navigation and button interactions work

Smoke tests run as part of the E2E job and are designed to:
- Complete quickly (< 60 seconds total)
- Fail fast on critical issues
- Skip gracefully when test credentials aren't configured

### Deployment Gates

- Preview deploys require: build + unit tests + integration tests + E2E tests
- Staging deploys require: build + unit tests + integration tests + E2E tests
- Production deploys require: build + all tests + security audit

## Coverage Thresholds

Current thresholds (configured in `vitest.config.js`):

| Metric | Threshold |
|--------|-----------|
| Statements | 50% |
| Branches | 40% |
| Functions | 45% |
| Lines | 50% |

## Test Coverage Areas

### Currently Covered

**Services (Unit Tests)**:
- `licenseService` - License generation, formatting, validation
- `billingService` - Subscription state mapping, status helpers
- `resellerService` - Reseller status, commission calculations
- `playerService` - Content resolution logic, screen status

**API Routes (Integration Tests)**:
- `/api/billing/checkout` - Checkout session creation
- `/api/billing/portal` - Billing portal access
- `/api/billing/webhook` - Stripe webhook handling
- `/api/analytics/playback-batch` - Analytics batch recording
- `/api/public/campaigns/trigger` - Campaign triggering

**User Flows (E2E Tests)**:
- Authentication flow (comprehensive - Sprint 3)
  - Login page UI and navigation
  - Signup page UI with validation
  - Password reset flow
  - Session persistence across reload
  - Protected route enforcement
  - Logout flow
- Onboarding and navigation
- Content pipeline (playlists, layouts, screens)
- Billing and plan management
- Reseller portal and license generation
- Enterprise security features

## Troubleshooting

### Tests Failing Locally

1. Ensure dependencies are installed: `npm ci`
2. Check Node.js version matches CI (Node 20)
3. For E2E tests, install Playwright browsers: `npx playwright install chromium`

### Flaky E2E Tests

1. Increase timeouts in `playwright.config.js`
2. Use `waitFor` utilities instead of fixed delays
3. Add retries for network-dependent tests

### Coverage Not Meeting Threshold

1. Run `npm run test:coverage` to see detailed report
2. Focus on untested service functions
3. Add tests for critical user paths

## Adding New Tests

### Checklist

1. [ ] Place test in correct directory (`unit/`, `integration/`, or `e2e/`)
2. [ ] Use factories for test data
3. [ ] Mock external dependencies
4. [ ] Test both success and error cases
5. [ ] Keep tests focused and atomic
6. [ ] Run tests locally before committing

### File Naming

- Unit/Integration: `*.test.js` or `*.spec.js`
- E2E: `*.spec.js`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Cheat Sheet](https://testing-library.com/docs/react-testing-library/cheatsheet)
- [MSW Documentation](https://mswjs.io/)
