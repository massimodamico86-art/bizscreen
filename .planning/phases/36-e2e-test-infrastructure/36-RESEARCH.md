# Phase 36: E2E Test Infrastructure - Research

**Researched:** 2026-02-07
**Domain:** Playwright E2E test infrastructure, test isolation, parallel execution
**Confidence:** HIGH

## Summary

This phase focuses on making the Playwright E2E test infrastructure reliable so tests do not fail due to shared state, flaky setup/teardown, or infrastructure issues. The current suite has 1218 tests across 39 files, with 460 tests failing (mostly timeout-related), 382 passing, and 321 skipped. The target is 90%+ pass rate.

The standard approach for reliable Playwright infrastructure involves:
1. **Test isolation through browser contexts** - Each test gets a fresh context with clean state
2. **Proper fixture scope selection** - Test-scoped for correctness, worker-scoped for expensive shared setup
3. **Authentication state management** - Setup projects with storage state, with explicit clearing for unauthenticated tests
4. **Timeout configuration** - Appropriate global, action, navigation, and expect timeouts
5. **Diagnostic artifacts** - Screenshots, videos, and traces on failure for debugging

**Primary recommendation:** Implement test-scoped fixtures for all test state, use explicit storage state clearing for unauthenticated flows, configure appropriate timeouts, and enable failure artifacts for debugging.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.57.0 | E2E testing framework | Already in use, provides built-in test isolation |
| dotenv | (existing) | Environment variable loading | Already configured for test credentials |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright-report | built-in | HTML test reports | Already configured, essential for CI debugging |
| trace-viewer | built-in | Debug traces | On failure diagnosis |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom test helpers | Playwright fixtures | Fixtures have automatic teardown, better isolation |
| beforeAll/afterAll hooks | Worker-scoped fixtures | Fixtures handle dependencies automatically |
| Manual state cleanup | Fresh browser contexts | Contexts provide complete isolation, no missed state |

**Installation:**
```bash
# Already installed - no new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
tests/
├── e2e/
│   ├── fixtures/              # Custom Playwright fixtures
│   │   └── index.js           # Extended test with custom fixtures
│   ├── helpers.js             # Utility functions (existing)
│   ├── auth.setup.js          # Auth setup project (existing)
│   └── *.spec.js              # Test files
playwright/
├── .auth/                     # Storage state files (gitignored)
│   ├── client.json
│   ├── admin.json
│   └── superadmin.json
playwright.config.js           # Main configuration
```

### Pattern 1: Custom Test Fixtures
**What:** Extend the base test with reusable setup/teardown logic
**When to use:** Any shared test setup that needs automatic cleanup
**Example:**
```typescript
// Source: https://playwright.dev/docs/test-fixtures
// tests/e2e/fixtures/index.js
import { test as base } from '@playwright/test';
import { loginAndPrepare, dismissAnyModals } from '../helpers.js';

export const test = base.extend({
  // Auto-fixture that prepares the app after login
  authenticatedPage: async ({ page }, use) => {
    await loginAndPrepare(page);
    await use(page);
    // Automatic teardown - no explicit cleanup needed
  },

  // Fixture for fresh/unauthenticated state
  freshPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### Pattern 2: Explicit Storage State Clearing
**What:** Override storage state for tests that need unauthenticated access
**When to use:** Testing login flows, public pages, error states
**Example:**
```typescript
// Source: https://playwright.dev/docs/auth
test.describe('Authentication Flow', () => {
  // Clear auth state for this describe block
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});
```

### Pattern 3: Worker-Scoped Fixtures for Expensive Setup
**What:** Share expensive setup across tests in the same worker
**When to use:** Database seeding, API tokens, heavy initialization
**Example:**
```typescript
// Source: https://playwright.dev/docs/test-fixtures
export const test = base.extend({
  // Worker-scoped: created once per worker process
  workerStorageState: [async ({ browser }, use, workerInfo) => {
    const id = workerInfo.workerIndex;
    const fileName = path.join(__dirname, `.auth/user-${id}.json`);
    // Setup logic...
    await use(fileName);
  }, { scope: 'worker' }],
});
```

### Pattern 4: Test Isolation Verification
**What:** Ensure each test can run independently
**When to use:** CI validation, debugging flaky tests
**Example:**
```bash
# Run a single test in isolation
npx playwright test path/to/test.spec.js:42

# Run tests in random order to detect hidden dependencies
npx playwright test --shard=1/5

# Run with single worker to find parallelism issues
npx playwright test --workers=1
```

### Anti-Patterns to Avoid
- **Shared global variables:** Global state introduces hidden coupling between tests; use fixtures instead
- **Cleanup-between-tests strategy:** Residual state like "visited links" can leak; prefer fresh contexts
- **Dependent test ordering:** Tests that must run in sequence indicate state leakage
- **Hard-coded waits:** Use auto-waiting assertions instead of `page.waitForTimeout()`
- **Multiple auth state files per worker:** Can cause session invalidation under parallel execution

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test isolation | Manual cleanup logic | Browser contexts | Playwright creates fresh context per test automatically |
| Auth state sharing | Custom session management | Storage state + setup projects | Built-in, handles cookies/localStorage/IndexedDB |
| Wait for element | `page.waitForTimeout()` | `expect().toBeVisible()` | Auto-retrying assertions handle timing automatically |
| Failure diagnosis | Custom logging | Trace, screenshots, video | Built-in artifacts capture DOM, network, console |
| Parallel test data | Shared test accounts | Worker-indexed accounts | `testInfo.workerIndex` for isolation |

**Key insight:** Playwright's built-in isolation mechanisms are more thorough than manual cleanup - they handle cookies, localStorage, sessionStorage, IndexedDB, and service workers automatically.

## Common Pitfalls

### Pitfall 1: Storage State Sharing in Parallel Tests
**What goes wrong:** Multiple workers using same storage state file causes session invalidation
**Why it happens:** Concurrent workers share cookies, leading to auth conflicts
**How to avoid:** Use worker-indexed accounts or single worker for auth-dependent tests
**Warning signs:** Tests pass individually but fail when run together; random logout errors

### Pitfall 2: Missing Storage State Clearing
**What goes wrong:** Tests expecting unauthenticated state inherit auth from project config
**Why it happens:** Project-level `storageState` applies to all tests unless overridden
**How to avoid:** Use `test.use({ storageState: { cookies: [], origins: [] } })` in test blocks
**Warning signs:** Login form tests fail because user is redirected to /app

### Pitfall 3: Timeout Misconfiguration
**What goes wrong:** Tests timeout waiting for elements or fail too quickly
**Why it happens:** Default 30s test timeout, 5s expect timeout may not match app behavior
**How to avoid:** Configure appropriate timeouts based on real app response times
**Warning signs:** CI tests timeout more than local tests; intermittent timeout failures

### Pitfall 4: Hook Ordering Issues
**What goes wrong:** `beforeAll` runs before auth setup completes
**Why it happens:** Project dependencies not properly configured in playwright.config.js
**How to avoid:** Use `dependencies: ['setup']` in project configuration
**Warning signs:** First test in file fails, subsequent tests pass

### Pitfall 5: State Leakage Between Describe Blocks
**What goes wrong:** Tests in one describe block affect tests in another
**Why it happens:** `beforeEach`/`afterEach` only run for their describe block
**How to avoid:** Use test-scoped fixtures; each test gets fresh context
**Warning signs:** Test order affects results; random failures in CI

## Code Examples

Verified patterns from official sources:

### Proper Timeout Configuration
```javascript
// Source: https://playwright.dev/docs/test-timeouts
// playwright.config.js
export default defineConfig({
  // Test timeout - time for entire test to complete
  timeout: 60_000, // 60 seconds (up from 30s default)

  // Expect timeout - time for assertions to retry
  expect: {
    timeout: 10_000, // 10 seconds (up from 5s default)
  },

  use: {
    // Action timeout - time for individual actions
    actionTimeout: 15_000,

    // Navigation timeout
    navigationTimeout: 30_000,
  },
});
```

### Failure Artifacts Configuration
```javascript
// Source: https://playwright.dev/docs/test-configuration
// playwright.config.js
export default defineConfig({
  use: {
    // Screenshots on failure for debugging
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'on-first-retry',

    // Trace on first retry (includes DOM snapshots, network, console)
    trace: 'on-first-retry',
  },

  // Enable retries on CI for flaky test tolerance
  retries: process.env.CI ? 2 : 0,
});
```

### Auth Setup Project Pattern
```javascript
// Source: https://playwright.dev/docs/auth
// playwright.config.js
export default defineConfig({
  projects: [
    // Setup project runs first
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    // Main tests depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/client.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### Robust Element Waiting
```javascript
// Source: https://playwright.dev/docs/best-practices
// GOOD: Web-first assertions with auto-wait
await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
await expect(page.getByText('Success')).toBeVisible({ timeout: 15000 });

// BAD: Manual waits and isVisible checks
await page.waitForTimeout(2000);  // Hard-coded wait
const visible = await page.getByText('Success').isVisible();  // No auto-retry
```

### Fresh Context for Isolated Tests
```javascript
// Source: https://playwright.dev/docs/browser-contexts
test('isolated test with fresh context', async ({ browser }) => {
  // Create completely isolated context
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/');
  // Test logic...

  // Cleanup
  await context.close();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global beforeAll/afterAll | Fixtures with scope | Playwright 1.x | Automatic dependency resolution, better isolation |
| Manual session cleanup | storageState files | Playwright 1.18+ | Complete session restoration including IndexedDB |
| waitForTimeout | Auto-waiting locators | Playwright 1.x | More reliable, faster tests |
| External trace tools | Built-in trace viewer | Playwright 1.12+ | DOM snapshots, network, console in one file |
| Manual retry logic | Built-in retries config | Playwright 1.x | Consistent retry handling with artifacts |

**Deprecated/outdated:**
- `page.waitForNavigation()`: Use `page.waitForURL()` or auto-waiting instead
- `page.$()` and `page.$$()`: Use `page.locator()` with auto-waiting
- `storageState` as string path for clearing: Use object `{ cookies: [], origins: [] }`

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal timeout values for this specific app**
   - What we know: Default 30s test timeout, 5s expect timeout
   - What's unclear: Actual response times under load, CI environment performance
   - Recommendation: Start with 60s test timeout, 10s expect timeout, measure and adjust

2. **Database state isolation strategy**
   - What we know: Some tests create/delete data (playlists, screens)
   - What's unclear: Whether tests share database state or use separate tenants
   - Recommendation: If tests modify shared data, implement worker-indexed test accounts

3. **Current root cause of 460 failing tests**
   - What we know: "Mostly timeout-related" per STATE.md
   - What's unclear: Whether timeout is infrastructure (slow CI) or test logic (bad waits)
   - Recommendation: Run with trace enabled on failures to diagnose actual causes

## Sources

### Primary (HIGH confidence)
- [Playwright Fixtures Documentation](https://playwright.dev/docs/test-fixtures) - Custom fixtures, scopes, teardown
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) - Test isolation, locators, assertions
- [Playwright Authentication](https://playwright.dev/docs/auth) - Storage state, setup projects, multi-user
- [Playwright Parallelism](https://playwright.dev/docs/test-parallel) - Workers, sharding, fullyParallel
- [Playwright Browser Contexts](https://playwright.dev/docs/browser-contexts) - Context isolation
- [Playwright Timeouts](https://playwright.dev/docs/test-timeouts) - Timeout configuration hierarchy
- [Playwright Configuration](https://playwright.dev/docs/test-configuration) - Screenshots, videos, traces

### Secondary (MEDIUM confidence)
- [BrowserStack Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices) - Test isolation patterns
- [BrowserStack Fixtures Guide](https://www.browserstack.com/guide/fixtures-in-playwright) - Fixture scope selection
- [BrowserStack Timeout Configuration](https://www.browserstack.com/guide/playwright-timeout) - Timeout strategies
- [Currents Playwright CI Debugging](https://currents.dev/posts/how-to-debug-playwright-tests-in-ci) - Parallel execution issues

### Tertiary (LOW confidence)
- Internal debug files showed past issues with storage state (authenticated users redirected from login pages) - resolved by explicit state clearing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using official Playwright patterns, no new dependencies
- Architecture: HIGH - Based on official documentation and verified patterns
- Pitfalls: HIGH - Based on official docs plus real issues found in project debug files

**Research date:** 2026-02-07
**Valid until:** 60 days (Playwright is stable, patterns don't change frequently)
