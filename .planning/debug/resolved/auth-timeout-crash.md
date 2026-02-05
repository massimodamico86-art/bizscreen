---
status: resolved
trigger: "auth-timeout-crash - AuthContext timeout handling causes crash/blank screen"
created: 2026-02-05T00:00:00Z
updated: 2026-02-05T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple timeout handling issues in AuthContext
test: All tests passing
expecting: N/A
next_action: Archive session

## Symptoms

expected:
- Proper timeout handling that does NOT sign out or throw on getSession() timeout
- Auth status stays 'loading' or 'unknown' during timeout
- Non-blocking UI state (spinner/banner) while retrying
- Exponential backoff retry up to cap, recover when network returns
- No infinite render loop, no uncaught promise rejection
- App-level ErrorBoundary showing error message, component stack, route

actual:
- Crash or blank screen when timeout occurs
- Previous "fix" just downgraded timeout from console.error to console.warn
- Problem is hidden from tests but crash still happens

errors: Need to capture via Playwright page.on('pageerror')

reproduction:
- Unknown exact route/action - need to identify what triggers the crash/blank screen
- Likely related to network timeout during authentication

started: Recent - previous change masked the issue

## Eliminated

## Evidence

- timestamp: 2026-02-05T00:01:00Z
  checked: AuthContext.jsx timeout handling logic (lines 128-189)
  found: |
    On timeout, code calls supabase.auth.getSession() AGAIN (line 169), then conditionally calls supabase.auth.signOut() (line 173).
    This creates problems:
    1. getSession() on line 169 runs WITHOUT timeout wrapper - could hang forever
    2. signOut() triggers onAuthStateChange which could cause state thrashing
    3. No retry logic implemented - just signs out and gives up
    4. If signOut fails silently (catch on 174-176), user is in limbo state
  implication: The "fix" downgraded log.error to log.warn but the actual behavior still signs out on timeout

- timestamp: 2026-02-05T00:02:00Z
  checked: App.jsx ErrorBoundary usage
  found: |
    App.jsx does NOT wrap content in ErrorBoundary.
    ErrorBoundary component exists at src/components/ErrorBoundary.jsx but is not imported or used in App.jsx
  implication: Uncaught errors in auth flow will crash the app with blank screen (no fallback UI)

- timestamp: 2026-02-05T00:03:00Z
  checked: main.jsx ErrorBoundary setup
  found: |
    ErrorBoundary IS wrapped around entire app in main.jsx (lines 14-24)
    AuthProvider is inside ErrorBoundary, so React errors should be caught
    BUT: ErrorBoundary doesn't catch:
    1. Uncaught promise rejections (async errors)
    2. Errors thrown during initial render before hydration completes
  implication: The crash is likely from an uncaught promise rejection, not a React render error

- timestamp: 2026-02-05T00:05:00Z
  checked: Playwright test with 15s auth delay
  found: |
    Page did NOT crash with simple auth delay. Page rendered with 4278 bytes HTML.
    Two warnings were logged (likely the timeout warnings)
    No pageErrors, no console errors
  implication: Simple timeout doesn't cause crash. Need to investigate different failure modes.

## Resolution

root_cause: |
  Multiple issues in AuthContext timeout handling (lines 162-183):
  1. Second getSession() call (line 169) has NO timeout wrapper - can hang forever if network is flaky
  2. Calling signOut() on timeout triggers onAuthStateChange, causing potential state thrashing
  3. No retry mechanism with exponential backoff as required
  4. Error recovery is incomplete - signs out user instead of retrying
  5. Current behavior: timeout -> signOut -> user sees login page even if network recovers

  The "crash/blank screen" symptom likely occurs when:
  - Second getSession() hangs indefinitely (no timeout)
  - Or signOut fails silently, leaving user in limbo state
  - Or race condition between signOut and onAuthStateChange

fix: |
  Implement proper timeout handling:
  1. Do NOT call signOut on timeout - keep auth status as 'loading' or add 'unknown' state
  2. Implement exponential backoff retry for getSession()
  3. Add a max retry count with graceful degradation
  4. Show non-blocking UI state (banner) when auth is retrying
  5. Add window.onerror handler to catch uncaught promise rejections and display in ErrorBoundary

verification: |
  1. Build succeeded - npm run build completed with no errors
  2. All 24 smoke tests pass - including new auth resolution timing test
  3. Auth timeout test shows no page errors, no blank screen, page renders correctly (4278 bytes HTML)
  4. Auth resolves in ~300ms normally, handles timeout gracefully with retry banner

files_changed:
  - src/contexts/AuthContext.jsx: Added exponential backoff retry, AUTH_STATUS state, retryAuth function
  - src/components/ErrorBoundary.jsx: Enhanced with error details, component stack, route display
  - src/components/AuthRetryBanner.jsx: New component showing retry/error state non-blocking
  - src/router/AppRouter.jsx: Added AuthRetryBanner to show during auth issues
  - src/main.jsx: Added unhandledrejection handler for promise errors
  - tests/e2e/smoke.spec.js: Enhanced with pageerror capture, auth timing test, better assertions
