---
phase: 162-restore-deleted-spec-files
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - tests/e2e/admin-settings-billing-tools.spec.js
  - tests/e2e/admin-settings-branding-security.spec.js
  - tests/e2e/admin-settings-team.spec.js
  - tests/e2e/auth-login-logout.spec.js
  - tests/e2e/auth-signup-reset-invite.spec.js
  - tests/e2e/campaigns.spec.js
  - tests/e2e/edge-functions.spec.js
  - tests/e2e/enterprise-analytics.spec.js
  - tests/e2e/enterprise-api.spec.js
  - tests/e2e/enterprise-sso.spec.js
  - tests/e2e/fixtures/index.js
  - tests/e2e/helpers/index.js
  - tests/e2e/helpers/screenshots.js
  - tests/e2e/menu-boards.spec.js
  - tests/e2e/multi-language.spec.js
  - tests/e2e/nav-accessibility-onboarding.spec.js
  - tests/e2e/nav-error-handling.spec.js
  - tests/e2e/nav-responsive.spec.js
  - tests/e2e/nav-route-loading.spec.js
  - tests/e2e/player-offline-selfheal.spec.js
  - tests/e2e/player-rendering.spec.js
  - tests/e2e/player-telemetry.spec.js
  - tests/e2e/scheduling.spec.js
  - tests/e2e/screen-groups-diagnostics.spec.js
  - tests/e2e/screen-management.spec.js
  - tests/e2e/widgets-basic.spec.js
  - tests/e2e/widgets-data.spec.js
  - tests/e2e/widgets-embeds.spec.js
  - tests/e2e/widgets-rendering.spec.js
findings:
  critical: 0
  warning: 6
  info: 8
  total: 14
status: issues_found
---

# Phase 162: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

This phase restored 29 deleted E2E spec files covering authentication, admin settings, campaigns, enterprise features, navigation, player behavior, scheduling, screen management, and widget testing. The restored files are well-structured overall and follow consistent patterns. However, several issues were found across the suite: import path inconsistencies, a React fiber mutation hack that could silently fail, fragile `waitForTimeout`-only synchronization in multiple tests, a swallowed error in a catch block that hides test intent, and a test assertion that is trivially always-true. There are no security vulnerabilities or data-loss risks.

---

## Warnings

### WR-01: Broken import path in `auth-login-logout.spec.js`

**File:** `tests/e2e/auth-login-logout.spec.js:14`
**Issue:** The file imports `loginAndPrepare` and `waitForPageReady` from `./helpers.js` (a sibling-directory path) while simultaneously importing `screenshotStep` from `./helpers/index.js`. All other spec files in the same directory import from `./helpers.js` directly. However, the helpers barrel at `tests/e2e/helpers/index.js` re-exports those same symbols from `../helpers.js`. The double import is not an error, but `./helpers.js` is relative to `tests/e2e/`, meaning the spec file uses both `tests/e2e/helpers.js` and `tests/e2e/helpers/index.js`. This is fine as long as `tests/e2e/helpers.js` (note: singular file, not directory) actually exists; if it does not and the resolver falls back to the directory, the imports will resolve inconsistently between environments.

More critically, `nav-accessibility-onboarding.spec.js`, `nav-error-handling.spec.js`, `nav-responsive.spec.js`, and `nav-route-loading.spec.js` import helpers exclusively from `./helpers/index.js` while the other 20 spec files import from `./helpers.js`. This inconsistency means a rename or deletion of either path breaks half the suite silently.

**Fix:** Standardize all spec files to import from the barrel:
```js
// Preferred — works regardless of whether helpers.js or helpers/index.js is the canonical module
import { loginAndPrepare, waitForPageReady, screenshotStep } from './helpers/index.js';
```
Remove the redundant direct `./helpers.js` import from `auth-login-logout.spec.js`.

---

### WR-02: React fiber mutation in `widgets-rendering.spec.js` is a reliability hazard

**File:** `tests/e2e/widgets-rendering.spec.js:448-488`
**Issue:** The WDGT-06 countdown test contains a `page.evaluate()` fallback that walks React internal fiber nodes (`__reactFiber*`) and directly calls `state.queue.dispatch(...)` to inject a UI element. This approach:
1. Relies on React internals that change between React minor versions without notice.
2. Dispatches state updates without going through the component's normal reducer, which can corrupt component state and produce false-positive test results.
3. The mutation is applied optimistically — if the fiber walk finds the wrong state node, it silently injects into unrelated state, with no assertion that the right fiber was found.

**Fix:** Replace the fiber mutation with a proper navigation approach. Either: (a) navigate directly to the layout editor URL using the mock layout ID so the editor renders the pre-seeded countdown element from the mock, or (b) click the "Apps" tab and select the Countdown widget via UI as the other widget tests do:
```js
// Replace the page.evaluate fiber hack with:
await addWidgetToCanvas(page, 'Countdown');
```

---

### WR-03: `waitForTimeout`-only synchronization used as the sole wait in multiple tests

**File:** `tests/e2e/campaigns.spec.js:155`, `tests/e2e/menu-boards.spec.js:54`, `tests/e2e/scheduling.spec.js:27`, `tests/e2e/screen-management.spec.js:19`
**Issue:** Several tests use `await page.waitForTimeout(N)` as the sole mechanism to wait for a navigation or async side-effect to complete, with no subsequent assertion that the expected state was actually reached before continuing. For example, in `campaigns.spec.js` line 155:
```js
await saveButton.click();
await page.waitForTimeout(3000);
const currentUrl = page.url();
```
If the server is slow, the URL check runs before the redirect fires, causing a false-positive `saved` flag (the condition `!currentUrl.includes('/campaigns/new')` would be false, so it falls to the secondary `isVisible` check which itself uses `.catch(() => false)`). On fast CI machines the timeout may be too long; on slow ones it may be too short.

**Fix:** Replace bare `waitForTimeout` + URL inspection with `page.waitForURL` or `expect(page).toHaveURL`:
```js
await saveButton.click();
// Wait for redirect away from /new, with a reasonable timeout
await page.waitForURL(/\/app\/campaigns\/(?!new)/, { timeout: 10000 });
```

---

### WR-04: Swallowed error in `player-telemetry.spec.js` hides assertion intent

**File:** `tests/e2e/player-telemetry.spec.js:55`
**Issue:** The `setupPlayerWithRpcCapture` helper captures the RPC request body with:
```js
const postData = route.request().postData();
capturedRpcs.push({ rpc: rpcName, body: postData ? JSON.parse(postData) : null });
```
`JSON.parse` can throw a `SyntaxError` if `postData` is non-JSON (e.g., form-encoded or an empty string). Because this runs inside an async route handler that has no try/catch, an exception here will reject the route handler, causing Playwright to abort the request and producing misleading test failures that look like network errors rather than JSON parse errors.

**Fix:** Guard the parse:
```js
let body = null;
try {
  body = postData ? JSON.parse(postData) : null;
} catch {
  body = postData; // keep raw string for debugging
}
capturedRpcs.push({ rpc: rpcName, body });
```

---

### WR-05: `player-telemetry.spec.js` — 35-second timeout test is a CI performance bottleneck

**File:** `tests/e2e/player-telemetry.spec.js:198-206` and `214-233`
**Issue:** Two tests set `test.setTimeout(60000)` and use `await page.waitForTimeout(35000)` to wait for the player's 30-second polling interval to fire. This makes each test take at minimum 35 seconds of wall time. On a typical CI runner with parallel workers, these tests will be the dominating bottleneck. The 30-second polling interval is hardcoded in the player component (commented as line 2524), so the test cannot simply reduce the interval.

**Fix:** Expose the polling interval as a configurable constant or environment variable in the player component, and set it to a short value (e.g., 2 seconds) in the E2E test environment:
```js
// In player component:
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_PLAYER_POLL_INTERVAL_MS) || 30000;

// In .env.test:
VITE_PLAYER_POLL_INTERVAL_MS=2000
```
Then the test can reduce `waitForTimeout` to 5 seconds, cutting test time from 35s to 5s per test.

---

### WR-06: `nav-accessibility-onboarding.spec.js` — `expect(true).toBe(true)` assertion provides no value

**File:** `tests/e2e/nav-accessibility-onboarding.spec.js:391`
**Issue:** The NAVX-10 onboarding wizard test ends with:
```js
// Test always passes -- it documents whichever state was encountered
expect(true).toBe(true);
```
This makes the test non-falsifiable: it will pass even if every intermediate step silently failed (e.g., URL never matched `/app` after onboarding, no steps were triggered). The comment acknowledges this intentionally, but it means NAVX-10 has no real regression value — a broken onboarding flow will not be caught.

**Fix:** Remove the unconditional `expect(true).toBe(true)` and rely on the assertions already in the branches. For the "onboarding completed" branch, at minimum assert that the URL contains `/app`:
```js
// Already present above — remove the tautological assertion
await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
// Remove: expect(true).toBe(true);
```

---

## Info

### IN-01: `fixtures/index.js` imports from `../helpers.js` but the barrel imports from `../helpers.js` too — double-maintenance risk

**File:** `tests/e2e/fixtures/index.js:62`
**Issue:** The fixtures file imports `loginAndPrepare` from `../helpers.js`. The barrel `tests/e2e/helpers/index.js` also re-exports `loginAndPrepare` from `../helpers.js`. If `helpers.js` is ever renamed or refactored, both files need updating. This is a low-severity maintenance note.
**Fix:** Consider having the fixtures barrel import from `./helpers/index.js` for a single canonical path.

---

### IN-02: `anonKey` embedded in HTTP request headers in `edge-functions.spec.js`

**File:** `tests/e2e/edge-functions.spec.js:44-47`
**Issue:** The Supabase anonymous key (`VITE_SUPABASE_ANON_KEY`) is read at module evaluation time and stored in a closure-level `const`. If the env variable is undefined, `anonKey` is `undefined` and the `headers` object becomes `{ apikey: undefined, Authorization: 'Bearer undefined' }`. The `test.skip` guard on line 39-42 runs the check at test execution time, but the `const headers` assignment runs at module load time (before any skip logic). If the env is missing at load time the object is still constructed, but the skip will prevent the test from running. This is not a security issue (the anon key is public-facing by design) but it is a correctness issue — if the skip check were removed or the env partially set, malformed headers would be sent silently.
**Fix:** Move the `headers` construction inside each test, or inside a `test.beforeEach`, to ensure it is only built after the env guard has been evaluated.

---

### IN-03: `console.log` statements in test assertions

**File:** `tests/e2e/nav-accessibility-onboarding.spec.js:213`, `tests/e2e/nav-route-loading.spec.js:195`
**Issue:** Several tests use `console.log` to document skip conditions or partial results. While acceptable in test files, these produce noisy CI output and are difficult to distinguish from real diagnostic output.
**Fix:** Replace with `test.info().annotations.push({ type: 'skip-reason', description: '...' })` for structured test reporting, consistent with the approach used elsewhere in the suite.

---

### IN-04: Inconsistent use of `test.skip` inside `beforeEach` vs top-level `test.skip(() => ...)`

**File:** `tests/e2e/auth-login-logout.spec.js:24-27`, multiple files
**Issue:** Some describe blocks guard with `test.skip(!condition, msg)` inside `test.beforeEach`, while others use `test.skip(() => !condition, msg)` at describe scope. The `beforeEach` form runs per-test and generates an additional hook in the test report. The `() => ...` callback form at describe level is evaluated once and is the idiomatic Playwright approach for describe-level skipping.
**Fix:** Prefer `test.skip(() => !process.env.TEST_USER_EMAIL, msg)` at the describe level to reduce per-test hook overhead and improve report clarity. The auth-login-logout spec additionally mixes project-name checks with credential checks in the same `beforeEach`; these could be separated for clarity.

---

### IN-05: `waitForTimeout` used with `waitForLoadState('networkidle')` in `admin-settings-branding-security.spec.js`

**File:** `tests/e2e/admin-settings-branding-security.spec.js:124-125`
**Issue:** The notification persistence test waits for `page.waitForTimeout(1000)` then `page.waitForLoadState('networkidle')`. The timeout before network idle is unnecessary — `networkidle` already waits for all network activity to cease. The explicit 1-second sleep just adds latency without improving reliability.
**Fix:** Remove the `waitForTimeout(1000)` line immediately before `waitForLoadState('networkidle')`.

---

### IN-06: `screen-groups-diagnostics.spec.js` — trivially true assertion in `groups table shows tags as badges`

**File:** `tests/e2e/screen-groups-diagnostics.spec.js:140`
**Issue:** The test ends with `expect(true).toBeTruthy()` unconditionally, making it identical to WR-06 in structure — the test cannot fail regardless of what the page renders.
**Fix:** If rows exist and tags are optional, assert the structure of each row rather than short-circuiting:
```js
// If no tags found, that is acceptable; but don't end with expect(true)
// Instead, simply return without an assertion when there are no rows
if (rowCount === 0) return;
// Only assert tag presence if the app promises tags exist on groups
```

---

### IN-07: Dead code path in `widgets-rendering.spec.js` — `navigateToLayoutEditor` uses `window.__setCurrentPage`

**File:** `tests/e2e/widgets-rendering.spec.js:148-156`
**Issue:** The `navigateToLayoutEditor` helper calls `page.evaluate()` to invoke `window.__setCurrentPage`, a function that almost certainly does not exist in the production app bundle. If it doesn't exist, the evaluate call silently does nothing (no error is thrown), and then `waitForPageReady` runs on whatever page is currently open — which may not be the layout editor. The helper contains no assertion that the editor was actually reached.
**Fix:** Navigate to the layout editor URL directly:
```js
async function navigateToLayoutEditor(page) {
  await page.goto(`/app/layouts/${MOCK_LAYOUT_ID}/edit`, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page);
}
```

---

### IN-08: `player-rendering.spec.js` — `setScreenIdInStorage` called after `page.goto('/player/view')` on the first navigation

**File:** `tests/e2e/player-rendering.spec.js:121-123` and `143-146`
**Issue:** Several `ViewPage` tests set localStorage only after the first `page.goto('/player/view')`, then navigate again:
```js
await page.goto('/player/view');          // 1st load — no screen ID yet
await setScreenIdInStorage(page, '...');  // set localStorage
await page.goto('/player/view');          // 2nd load — now has screen ID
```
The first `goto` is wasteful and potentially misleading — it loads the view page without a screen ID, which may trigger an error state. The helper `setScreenIdInStorage` requires an origin to be established first, but this can be done on `/player` (the pair page) instead, which is what `player-offline-selfheal.spec.js` does correctly in its `beforeEach`. The redundant first navigation adds ~1-2 seconds per test unnecessarily.
**Fix:** Follow the `player-offline-selfheal.spec.js` pattern — set localStorage via `beforeEach` after navigating to `/player`, then navigate to `/player/view` only once in the test body.

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
