---
phase: 164-audit-cleanup
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - tests/e2e/scenes.spec.js
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 164: Code Review Report

**Reviewed:** 2026-04-11
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `tests/e2e/scenes.spec.js`, a Playwright E2E test suite covering the Scenes feature (list page, detail page, publish-to-screen modal, AI onboarding). The test structure is reasonable but has a recurring pattern where conditional guards silently pass tests without executing any assertions, undermining test reliability. Several tests can report success without actually verifying anything.

## Warnings

### WR-01: Tests silently pass without assertions when preconditions not met

**File:** `tests/e2e/scenes.spec.js:70-122`
**Issue:** Tests in the "Scene Detail Page" describe block (`can open scene detail from list`, `scene detail shows preview area`, `scene detail shows linked content`) wrap all assertions inside `if (await openButton.isVisible().catch(() => false))`. If no "Open Scene" button is found (e.g., due to UI changes, empty state, or a regression), the test passes with zero assertions executed. This defeats the purpose of the test -- a green test suite gives false confidence.
**Fix:** Use `test.skip` or `test.fixme` when the precondition is not met, so the test is explicitly marked as skipped rather than silently passing:
```javascript
const openButton = page.getByRole('button', { name: /open scene/i }).first();
const isVisible = await openButton.isVisible().catch(() => false);
test.skip(!isVisible, 'No scenes available to test');

await openButton.click();
// ... assertions without nesting ...
```

### WR-02: Double-nested conditional guards hide test failures

**File:** `tests/e2e/scenes.spec.js:148-175`
**Issue:** Tests `publish modal shows device selection` (line 148) and `can close publish modal` (line 177) have two levels of `if` guards -- first checking `openButton.isVisible()`, then checking `publishButton.isVisible()`. Both conditions must be true for any assertion to run. This means three separate failure modes (no scenes, no open button, no publish button) are all silently swallowed, making the test essentially a no-op in degraded environments.
**Fix:** Flatten the guards using `test.skip` for each precondition, or restructure the tests to use a shared setup that navigates to the scene detail page and skips the entire describe block if scenes are unavailable:
```javascript
test.beforeEach(async ({ page }) => {
  await navigateToSection(page, 'scenes');
  await waitForPageReady(page);
  const openButton = page.getByRole('button', { name: /open scene/i }).first();
  const hasScenes = await openButton.isVisible().catch(() => false);
  test.skip(!hasScenes, 'No scenes available');
  await openButton.click();
  await waitForPageReady(page);
});
```

### WR-03: Hardcoded waitForTimeout calls cause flaky tests

**File:** `tests/e2e/scenes.spec.js:42,56,75,93,110,130,152,180`
**Issue:** Eight instances of `await page.waitForTimeout(2000)` scattered across the test suite. Playwright documentation explicitly discourages `waitForTimeout` because it causes flakiness -- tests may be too slow in CI (timeout not enough) or unnecessarily slow locally. This is a known Playwright anti-pattern.
**Fix:** Replace with `waitForSelector`, `waitForResponse`, or `waitForLoadState` that waits for an actual condition:
```javascript
// Instead of:
await page.waitForTimeout(2000);

// Wait for actual content:
await page.waitForSelector('[data-testid="scene-card"], text=/no scenes/i', { timeout: 10000 });
```

## Info

### IN-01: Permanently skipped test is dead code

**File:** `tests/e2e/scenes.spec.js:209-217`
**Issue:** The "AutoBuild modal appears for new users without scenes" test unconditionally calls `test.skip(true, ...)` on line 215. It will never execute. This is effectively dead code and adds noise to test output (always showing as skipped).
**Fix:** Either implement the test with proper test user fixtures, or remove it entirely and track the requirement in a backlog issue. If keeping as a placeholder, add a TODO with an issue reference:
```javascript
// TODO(#issue-number): Implement with fresh test user fixture
test.skip('AutoBuild modal appears for new users without scenes', async ({ page }) => {
  // ...
});
```

---

_Reviewed: 2026-04-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
