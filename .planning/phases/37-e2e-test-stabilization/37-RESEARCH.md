# Phase 37: E2E Test Stabilization - Research

**Researched:** 2026-02-08
**Domain:** Playwright E2E Test Stabilization
**Confidence:** HIGH

## Summary

This research investigates how to stabilize the existing E2E test suite by eliminating timeout-related failures and flaky test behavior. The codebase contains 38 test files with approximately 9,270 lines of test code. Analysis reveals 164 occurrences of `waitForTimeout()` calls that must be replaced with proper auto-waiting patterns, 293 instances of `.catch(() => false)` patterns that may mask underlying issues, and multiple test files using `networkidle` wait states which can be flaky.

The established approach for E2E test stabilization is to replace all hardcoded timeouts with Playwright's built-in auto-waiting mechanisms. Playwright's locator actions and web-first assertions automatically retry until conditions are met or timeout occurs. The key insight is: "Don't guess a time. Describe the state you are waiting for, and let Playwright handle the rest."

Phase 36 already established the foundation with custom fixtures (`authenticatedPage`, `freshPage`), proper timeout configuration (60s global, 15s action, 30s navigation, 10s expect), and helper patterns. This phase focuses on systematically applying these patterns across all test files.

**Primary recommendation:** Replace every `waitForTimeout()` with the appropriate auto-waiting pattern based on what the test is actually waiting for (element visibility, network response, URL change, or element state).

## Standard Stack

### Core (Already Configured)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | Current | E2E testing framework | Official, comprehensive auto-waiting support |

### Test Infrastructure (From Phase 36)
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| Custom fixtures | `tests/e2e/fixtures/index.js` | `authenticatedPage`, `freshPage` | Ready to use |
| Helpers | `tests/e2e/helpers.js` | `loginAndPrepare`, `dismissAnyModals`, `waitForPageReady`, `navigateToSection` | Needs refinement |
| Config | `playwright.config.js` | Timeout settings, projects, retries | Properly configured |

### Timeout Configuration (Current)
```javascript
// playwright.config.js
{
  timeout: 60_000,           // Global test timeout
  expect: { timeout: 10_000 }, // Assertion timeout
  use: {
    actionTimeout: 15_000,    // Click, fill, etc.
    navigationTimeout: 30_000, // goto, waitForURL
  }
}
```

## Architecture Patterns

### Pattern 1: Replace waitForTimeout with Element State Waits

**What:** Replace hardcoded delays with explicit element state waits.

**When to use:** When waiting for an element to appear, disappear, or change state.

**Before (Anti-pattern):**
```javascript
await page.waitForTimeout(2000);
const isVisible = await element.isVisible();
```

**After (Correct):**
```javascript
// Wait for element to be visible
await element.waitFor({ state: 'visible' });

// Or use web-first assertion (preferred)
await expect(element).toBeVisible();

// Wait for element to disappear
await element.waitFor({ state: 'hidden' });
// Or
await expect(element).not.toBeVisible();
```

### Pattern 2: Replace waitForTimeout with Network Waits

**What:** Replace delays after actions with explicit network response waits.

**When to use:** When an action triggers an API call and you need to wait for the response.

**Before (Anti-pattern):**
```javascript
await page.getByRole('button', { name: /save/i }).click();
await page.waitForTimeout(2000); // Wait for API
await expect(page.getByText(/saved/i)).toBeVisible();
```

**After (Correct):**
```javascript
// Capture promise BEFORE the action
const responsePromise = page.waitForResponse('**/api/save');
await page.getByRole('button', { name: /save/i }).click();
await responsePromise;
await expect(page.getByText(/saved/i)).toBeVisible();
```

### Pattern 3: Replace waitForTimeout with URL Navigation Waits

**What:** Replace delays after navigation with URL-based waits.

**When to use:** When waiting for navigation to complete after a click or form submission.

**Before (Anti-pattern):**
```javascript
await page.getByRole('button', { name: /submit/i }).click();
await page.waitForTimeout(1500);
expect(page.url()).toContain('/success');
```

**After (Correct):**
```javascript
await page.getByRole('button', { name: /submit/i }).click();
await page.waitForURL(/\/success/);
```

### Pattern 4: Replace waitForTimeout with Load State Waits

**What:** Use proper load state waits instead of arbitrary delays.

**When to use:** When waiting for page to be ready after navigation.

**Best Practice:**
```javascript
// After navigation, wait for DOM to be ready
await page.goto('/app/dashboard');
await page.waitForLoadState('domcontentloaded');

// For SPA transitions, prefer element-based waits
await page.getByRole('button', { name: /dashboard/i }).click();
await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
```

**Avoid `networkidle`:** This wait state is flaky for SPAs with continuous polling or WebSocket connections. Prefer element-based waits.

### Pattern 5: Modal Dismissal Pattern

**What:** Wait for modal to actually close, not just click the close button.

**Current Helper (needs improvement in `helpers.js`):**
```javascript
// Before: unreliable
await closeButton.click();
await page.waitForTimeout(1000);

// After: reliable
await closeButton.click();
await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
// Or with assertion
await expect(page.locator('[role="dialog"]')).not.toBeVisible();
```

### Pattern 6: Proper test.skip() Annotation

**What:** Skip unfixable tests with proper documentation.

**Syntax:**
```javascript
// Conditional skip with reason
test('complex feature', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit has timing issues with this flow');
  // ... test code
});

// Unconditional skip - first statement in test
test('unfixable test', async ({ page }) => {
  test.skip(true, 'Flaky due to external API timing - see SKIPPED-TESTS.md');
  // ... test code
});

// Skip entire describe block
test.describe('Feature Group', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chrome only');
  // ... tests
});
```

### Anti-Patterns to Avoid

- **Arbitrary timeouts:** `waitForTimeout(N)` - Always describe the state instead
- **`.catch(() => false)` hiding issues:** Use proper assertions; failures should fail the test
- **`networkidle` for SPAs:** Unreliable for apps with WebSockets or polling
- **Chained `.catch()` calls:** Creates false positives; test passes when it shouldn't
- **Non-awaited assertions:** Missing `await` on `expect()` causes flaky tests

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for element | Custom retry loops | `locator.waitFor()` or `expect().toBeVisible()` | Auto-retrying built-in |
| Waiting for API | `waitForTimeout` + check | `page.waitForResponse()` | Precise, no arbitrary delay |
| Waiting for URL | `waitForTimeout` + url check | `page.waitForURL()` | Auto-waits with regex support |
| Loading indicators | Manual polling | `locator.waitFor({ state: 'hidden' })` | Built-in retry logic |
| Element existence check | `try/catch` with timeout | `expect(locator).toBeVisible()` | Web-first assertion |
| Modal close detection | Timeout after click | `waitFor({ state: 'hidden' })` | Deterministic |

**Key insight:** Every custom wait solution is inferior to Playwright's built-in mechanisms which include retry logic, configurable timeouts, and proper error messages.

## Common Pitfalls

### Pitfall 1: Using `.isVisible()` Instead of Assertions
**What goes wrong:** `isVisible()` returns a boolean immediately, doesn't wait.
**Why it happens:** Confusion between query methods and assertions.
**How to avoid:** Use `expect(locator).toBeVisible()` which auto-retries.
**Warning signs:** Tests that fail intermittently on slow CI.

```javascript
// Wrong - immediate check, no waiting
const visible = await element.isVisible();
expect(visible).toBe(true);

// Correct - auto-retries until visible or timeout
await expect(element).toBeVisible();
```

### Pitfall 2: `.catch(() => false)` Masking Failures
**What goes wrong:** Test passes when it should fail; real bugs go undetected.
**Why it happens:** Defensive coding to prevent test crashes.
**How to avoid:** Let tests fail naturally; fix root cause, don't mask it.
**Warning signs:** 293 occurrences in current codebase.

```javascript
// Wrong - hides real failures
if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
  // element might have actually errored, not just been invisible
}

// Correct - explicit state check with proper timeout
await expect(element).toBeVisible({ timeout: 1000 });
```

### Pitfall 3: Using `networkidle` for SPA Navigation
**What goes wrong:** Test hangs or times out on apps with continuous network activity.
**Why it happens:** SPA apps often have WebSockets, polling, or analytics.
**How to avoid:** Use element-based waits instead.
**Warning signs:** Tests pass locally but fail in CI with timeout.

```javascript
// Problematic - may never reach idle in SPA
await page.waitForLoadState('networkidle');

// Reliable - wait for specific element
await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
```

### Pitfall 4: Not Capturing Response Promise Before Action
**What goes wrong:** Race condition - response arrives before `waitForResponse` is set up.
**Why it happens:** Misunderstanding of Promise timing.
**How to avoid:** Always capture promise BEFORE triggering action.
**Warning signs:** Tests that fail randomly with "response not received".

```javascript
// Wrong - race condition
await button.click();
await page.waitForResponse('**/api/save'); // Response may have already happened

// Correct - promise captured first
const responsePromise = page.waitForResponse('**/api/save');
await button.click();
await responsePromise;
```

### Pitfall 5: Arbitrary Timeouts for Animations
**What goes wrong:** Timeout is too short on slow CI, or too long slowing tests.
**Why it happens:** Trying to "wait for animation to finish".
**How to avoid:** Wait for the end state, not the animation.
**Warning signs:** `waitForTimeout(300)`, `waitForTimeout(500)` after clicks.

```javascript
// Wrong - guessing animation duration
await openModalButton.click();
await page.waitForTimeout(300);
await expect(dialog).toBeVisible();

// Correct - wait for end state
await openModalButton.click();
await expect(dialog).toBeVisible();
```

## Code Examples

### Example 1: Stabilizing Modal Open/Close Pattern
```javascript
// Source: Playwright best practices

// Before: Flaky
async function openAndCloseModal(page) {
  await page.getByRole('button', { name: /add/i }).click();
  await page.waitForTimeout(500);

  const dialog = page.locator('[role="dialog"]');
  if (await dialog.isVisible({ timeout: 100 }).catch(() => false)) {
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(300);
  }
}

// After: Stable
async function openAndCloseModal(page) {
  await page.getByRole('button', { name: /add/i }).click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(dialog).not.toBeVisible();
}
```

### Example 2: Stabilizing Form Submission Pattern
```javascript
// Source: Playwright network documentation

// Before: Flaky
test('can submit form', async ({ page }) => {
  await page.getByPlaceholder(/name/i).fill('Test Item');
  await page.getByRole('button', { name: /create/i }).click();
  await page.waitForTimeout(2000);
  await expect(page.getByText('Test Item')).toBeVisible();
});

// After: Stable
test('can submit form', async ({ page }) => {
  await page.getByPlaceholder(/name/i).fill('Test Item');

  const responsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/items') && resp.status() === 201
  );

  await page.getByRole('button', { name: /create/i }).click();
  await responsePromise;

  await expect(page.getByText('Test Item')).toBeVisible();
});
```

### Example 3: Stabilizing Navigation Pattern
```javascript
// Source: Playwright assertions documentation

// Before: Flaky
test('navigates to dashboard', async ({ page }) => {
  await page.getByRole('button', { name: /dashboard/i }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('h1')).toContainText('Dashboard');
});

// After: Stable
test('navigates to dashboard', async ({ page }) => {
  await page.getByRole('button', { name: /dashboard/i }).click();
  await page.waitForURL(/\/app\/dashboard/);
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
```

### Example 4: Proper Skip Annotation with Reason
```javascript
// Source: Playwright test annotations documentation

// For tests that can't be fixed now
test('complex multi-step workflow', async ({ page }) => {
  test.skip(true, 'External calendar API timing issues - tracked in SKIPPED-TESTS.md');
  // Test code here would run if not skipped
});

// For browser-specific issues
test('drag and drop', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has known drag-drop issues (#12345)');
  // Test proceeds for Chrome/WebKit
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `waitForTimeout()` | `locator.waitFor()` | Playwright 1.0+ | Eliminates arbitrary delays |
| `page.waitForSelector()` | `locator.waitFor()` | Playwright 1.14 | Better chaining, auto-retry |
| Manual assertion retry | `expect().toBeVisible()` | Playwright 1.20 | Built-in retry assertions |
| `networkidle` wait | Element-based waits | Best practice 2024+ | More reliable for SPAs |
| `isVisible()` checks | `expect().toBeVisible()` | Web-first emphasis | Auto-retrying |

**Deprecated/outdated:**
- `page.waitForTimeout()`: Should never be used in production tests
- `page.waitForSelector()`: Use `locator.waitFor()` instead
- `expect(await locator.isVisible()).toBe(true)`: Use `await expect(locator).toBeVisible()`
- Excessive `.catch(() => false)`: Masks real failures, fix root cause instead

## Test Categories (for Fix Order)

Based on analysis of the codebase, recommended category order for fixing:

### Category 1: Core Auth & Navigation (Foundation)
- `auth.setup.js` - 2 waitForTimeout calls
- `auth.spec.js` - 2 waitForTimeout calls
- `helpers.js` - 0 waitForTimeout, but used by all tests

### Category 2: Dashboard & Basic Pages (High Traffic)
- `dashboard.spec.js` - 3 waitForTimeout calls
- `screens.spec.js` - 5 waitForTimeout calls
- `playlists.spec.js` - 3 waitForTimeout calls
- `media.spec.js` - 2 waitForTimeout calls

### Category 3: Complex Interactions
- `smoke.spec.js` - 14 waitForTimeout calls
- `smoke-test-client.spec.js` - 15 waitForTimeout calls
- `client-interactions.spec.js` - 4 waitForTimeout calls
- `client-flows.spec.js` - 6 waitForTimeout calls

### Category 4: Feature-Specific Pages
- `schedules.spec.js` - 6 waitForTimeout calls
- `settings.spec.js` - 1 waitForTimeout call
- `admin.spec.js` - 2 waitForTimeout calls
- `brand-theme.spec.js` - 4 waitForTimeout calls

### Category 5: Content & Templates
- `content-performance.spec.js` - 15 waitForTimeout calls
- `template-marketplace.spec.js` - 11 waitForTimeout calls
- `template-packs.spec.js` - 13 waitForTimeout calls
- `playlist-template.spec.js` - 4 waitForTimeout calls

### Category 6: Advanced Features
- `scenes.spec.js` - 8 waitForTimeout calls (already skipped)
- `scene-editor.spec.js` - 9 waitForTimeout calls (already skipped)
- `polotno-editor.spec.js` - 1 waitForTimeout call
- `screen-assignments.spec.js` - 6 waitForTimeout calls
- `playlist-screen-persistence.spec.js` - 6 waitForTimeout calls

### Category 7: Alerts & Diagnostics
- `alerts-center.spec.js` - 1 waitForTimeout call
- `alert-notification-flow.spec.js` - 3 waitForTimeout calls
- `feature-diagnostic.spec.js` - 8 waitForTimeout calls
- `location-diagnostic.spec.js` - 1 waitForTimeout call (5 seconds!)

### Category 8: Remaining Files
- `seo.spec.js` - 5 waitForTimeout calls
- `social.spec.js` - 1 waitForTimeout call
- `usage.spec.js` - 2 waitForTimeout calls (already skipped)
- Enterprise/reseller/billing specs

## Verification Strategy

### 5-Run Verification Process
```bash
# Local verification (run 5 times)
for i in {1..5}; do
  echo "Run $i of 5"
  npx playwright test path/to/test.spec.js --reporter=line
  if [ $? -ne 0 ]; then
    echo "FAILED on run $i"
    exit 1
  fi
done
echo "All 5 runs passed locally"

# CI verification
# Push to branch, let CI run 5 times
# Near-misses (4/5): Investigate root cause, don't proceed
```

### Tracking SKIPPED-TESTS.md Format
```markdown
# Skipped E2E Tests

## Summary
- Total skipped: X
- Unfixable timing issues: Y
- Missing features: Z

## Skipped Tests

### test-file.spec.js

#### "Test name here"
- **Reason:** [Why it's skipped]
- **Tried:** [What was attempted]
- **Suggested fix:** [What might fix it]
- **Skipped on:** [Date]

```

## Open Questions

1. **networkidle usage:**
   - What we know: Many tests use `waitForLoadState('networkidle')` which can be flaky
   - What's unclear: Which tests actually need it vs. could use element waits
   - Recommendation: Default to element-based waits, only use networkidle when specifically testing page load

2. **`.catch(() => false)` cleanup priority:**
   - What we know: 293 occurrences across 26 files
   - What's unclear: Which are masking real bugs vs. intentional conditional logic
   - Recommendation: Review each during stabilization, remove where causing false positives

3. **Test data dependencies:**
   - What we know: Some tests create data, others assume it exists
   - What's unclear: Full dependency graph between tests
   - Recommendation: Each test should be independently runnable (proper setup/teardown)

## Sources

### Primary (HIGH confidence)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) - Official documentation
- [Playwright Auto-waiting](https://playwright.dev/docs/actionability) - Actionability checks
- [Playwright Test Assertions](https://playwright.dev/docs/test-assertions) - Web-first assertions
- [Playwright Test Annotations](https://playwright.dev/docs/test-annotations) - Skip patterns
- [Playwright Network](https://playwright.dev/docs/network) - waitForResponse patterns

### Secondary (MEDIUM confidence)
- [BrowserStack Playwright Best Practices](https://www.browserstack.com/guide/playwright-best-practices) - Industry guidance
- [Better Stack: Avoiding Flaky Tests](https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/) - Practical patterns
- [Checkly: Waits and Timeouts](https://www.checklyhq.com/docs/learn/playwright/waits-and-timeouts/) - Comprehensive timeout guide

### Codebase Analysis (HIGH confidence - direct observation)
- 164 `waitForTimeout()` calls identified across test files
- 293 `.catch(() => false)` patterns identified
- 5 files already using `test.describe.skip()`
- Current timeout configuration verified in `playwright.config.js`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using official Playwright, already configured in Phase 36
- Architecture patterns: HIGH - Verified against official Playwright documentation
- Pitfalls: HIGH - Based on official docs and observed patterns in codebase

**Research date:** 2026-02-08
**Valid until:** 60 days (Playwright patterns are stable)
