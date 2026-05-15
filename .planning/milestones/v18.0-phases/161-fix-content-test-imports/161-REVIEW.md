---
phase: 161-fix-content-test-imports
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - tests/e2e/fixtures/index.js
  - tests/e2e/layouts-screenshots.spec.js
  - tests/e2e/helpers.js
  - tests/e2e/helpers/index.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 161: Code Review Report

**Reviewed:** 2026-04-10
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four E2E test files were reviewed: a fixtures module, a helpers module, a barrel re-export, and a layouts spec file. The import structure is clean -- the spec correctly imports from `./helpers/index.js` (barrel) and `./fixtures/index.js`. No security issues or critical bugs were found. The main concerns are around test reliability: several tests contain vacuous assertions (`expect(true).toBeTruthy()`) inside conditional branches, meaning tests silently pass when UI elements are absent rather than producing a meaningful result. There are also minor code quality items in the helpers module.

## Warnings

### WR-01: Vacuous assertions cause tests to silently pass when UI is missing

**File:** `tests/e2e/layouts-screenshots.spec.js:62`
**Issue:** `expect(true).toBeTruthy()` is a no-op assertion. When the search input is not visible, the test body does nothing and passes silently. This means the test provides no signal -- it passes whether the feature works, is broken, or does not exist. The same pattern repeats at lines 103, 127, 153, and 180.
**Fix:** Replace vacuous assertions with `test.skip` when the precondition is not met, or use a soft assertion that documents the skip reason:
```javascript
// Instead of:
if (hasSearch) {
  await searchInput.fill('test layout search');
  expect(true).toBeTruthy();
}

// Use:
test.skip(!hasSearch, 'Search input not found on layouts page');
await searchInput.fill('test layout search');
// Add a meaningful assertion about the result
```

### WR-02: Dynamic import of @playwright/test inside assertAppReady

**File:** `tests/e2e/helpers.js:206-207`
**Issue:** `assertAppReady` receives a `testObj` parameter but then dynamically imports `expect` from `@playwright/test` via `await import(...)` on lines 206-207 and 216-217. Dynamic imports in the middle of a test helper are fragile -- they bypass Playwright's test runner context and could behave differently than the statically imported `expect` in the spec file. Since the spec already imports `expect`, it would be cleaner to accept it as a parameter or import it statically at the top of the helpers module.
**Fix:** Add a static import at the top of `helpers.js`:
```javascript
import { expect } from '@playwright/test';
```
Then remove both dynamic `import()` calls on lines 206 and 216.

### WR-03: Tests with no assertions on the else-path are unreliable

**File:** `tests/e2e/layouts-screenshots.spec.js:91-104`
**Issue:** In `layout editor shows preset layout options` (line 82), if neither the create button nor the layout card is visible, the test falls through both `if` branches and passes with zero assertions. The same pattern occurs in tests at lines 107, 134, and 159. A test that passes with no assertions executed provides false confidence.
**Fix:** Add an explicit skip or fail when the precondition is not met:
```javascript
const hasCard = await layoutCard.isVisible().catch(() => false);
const hasCreate = await createButton.isVisible().catch(() => false);
test.skip(!hasCard && !hasCreate, 'No layout card or create button found');
```

## Info

### IN-01: console.warn in test helper

**File:** `tests/e2e/helpers.js:100`
**Issue:** `console.warn('Modal still visible after dismiss attempt')` is a debug artifact. In CI environments this produces noise in test output without actionable information.
**Fix:** Remove the console.warn or replace with a Playwright test info attachment for better diagnostics:
```javascript
// Option A: Remove it
// Option B: Use test info
test.info().annotations.push({ type: 'warning', description: 'Modal still visible after dismiss attempt' });
```

### IN-02: Default export duplicates named exports

**File:** `tests/e2e/helpers.js:221-228`
**Issue:** The file exports all functions as named exports and also as a default export object. The default export is unused -- all consumers import named exports via the barrel file. This is minor dead code.
**Fix:** Remove the default export block (lines 221-228) since all imports use named exports.

---

_Reviewed: 2026-04-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
