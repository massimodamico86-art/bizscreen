---
phase: 39-error-monitoring-setup
plan: 01
subsystem: observability
tags: [sentry, react-router-v7, error-tracking, supabase, breadcrumbs, react-19]

# Dependency graph
requires:
  - phase: none
    provides: "Existing Sentry SDK and observability abstraction layer"
provides:
  - "Sentry fully wired into app lifecycle with React 19 error hooks"
  - "Route-aware performance tracing via React Router v7 integration"
  - "User context propagation (id, email, role) to Sentry on auth state changes"
  - "Automatic Supabase API error interception with structured Sentry context"
  - "Breadcrumb trails for all Supabase operations (success and failure)"
  - "errorTrackingService.js re-export shim pointing to errorTracking.jsx"
affects: [40-error-monitoring-production, error-tracking, supabase-services]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "initObservability() called before React render for early error capture"
    - "React 19 createRoot error hooks (onUncaughtError, onCaughtError, onRecoverableError)"
    - "Proxy-based Supabase client instrumentation for automatic error capture"
    - "SentryRoutes wrapping for route-aware performance tracing"
    - "Re-export shim pattern for backward-compatible API migration"

key-files:
  created:
    - "src/utils/supabaseErrorInterceptor.js"
  modified:
    - "src/main.jsx"
    - "src/utils/errorTracking.jsx"
    - "src/router/AppRouter.jsx"
    - "src/contexts/AuthContext.jsx"
    - "src/utils/errorMessages.js"
    - "src/services/errorTrackingService.js"
    - "src/supabase.js"

key-decisions:
  - "Used Proxy-based wrapping for Supabase client instead of monkey-patching for cleaner interception"
  - "Intercepted .then() on query builders since Supabase builders are PromiseLike thenables"
  - "Only proxied .from() and .rpc() -- left auth and storage untouched to avoid response shape conflicts"
  - "Set sendDefaultPii:false for GDPR compliance in Sentry v10"
  - "Set sampleRate:1.0 to capture ALL errors (not sampled) since error volume is expected to be low"

patterns-established:
  - "initObservability() before createRoot: ensures errors during initial render are captured"
  - "Sentry.reactErrorHandler() for React 19 error hooks: captures errors bypassing ErrorBoundary"
  - "SentryRoutes via withSentryReactRouterV7Routing: route context on all errors"
  - "setObservabilityUser on auth state change: user identity propagated to all monitoring tools"
  - "instrumentSupabaseClient Proxy pattern: automatic breadcrumbs and error capture on all queries"

# Metrics
duration: 7min
completed: 2026-02-09
---

# Phase 39 Plan 01: Error Monitoring Setup Summary

**Sentry wired into app lifecycle with React 19 error hooks, React Router v7 tracing, user context propagation, and automatic Supabase API error interception**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-09T19:58:44Z
- **Completed:** 2026-02-09T20:05:34Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Sentry initialized before React renders via initObservability() with React 19 error hooks (onUncaughtError, onCaughtError, onRecoverableError)
- React Router v7 browser tracing integration replaces generic browserTracingIntegration for route-aware performance traces
- User identity (id, email, name) propagated to Sentry on login and cleared on logout via setObservabilityUser
- All Supabase .from() and .rpc() calls automatically instrumented with breadcrumbs and structured error capture
- Dead errorTrackingService.js replaced with backward-compatible re-export shim
- GDPR compliance: sendDefaultPii set to false, denyUrls blocks browser extensions

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Sentry into app startup and upgrade error tracking** - `4d700fe` (feat)
2. **Task 2: Wire user context and clean up duplicate error tracking service** - `c1d257a` (feat)
3. **Task 3: Intercept Supabase API errors with Sentry context** - `a98f170` (feat)

## Files Created/Modified
- `src/main.jsx` - App entrypoint with initObservability() call and React 19 error hooks
- `src/utils/errorTracking.jsx` - Sentry init with reactRouterV7BrowserTracingIntegration, SentryRoutes export
- `src/router/AppRouter.jsx` - Uses SentryRoutes for route-aware Sentry tracing
- `src/contexts/AuthContext.jsx` - setObservabilityUser on login/logout/auth state change
- `src/utils/errorMessages.js` - Import redirected from errorTrackingService to errorTracking.jsx
- `src/services/errorTrackingService.js` - Converted to re-export shim
- `src/utils/supabaseErrorInterceptor.js` - New file: Proxy-based Supabase client instrumentation
- `src/supabase.js` - Supabase client wrapped with instrumentSupabaseClient

## Decisions Made
- Used Proxy-based wrapping for Supabase client instrumentation rather than monkey-patching terminal methods directly -- cleaner, doesn't modify prototype chain
- Intercepted .then() on Supabase query builders since they are PromiseLike thenables -- this catches all await patterns automatically
- Only proxied .from() and .rpc() on the Supabase client -- auth.* and storage.* have different response shapes and auth errors are handled separately in AuthContext
- Set sendDefaultPii:false for GDPR compliance -- prevents IP address inference in Sentry v10
- Set sampleRate:1.0 to capture all errors -- error volume is expected to be low enough that sampling is unnecessary
- Kept errorTrackingService.js as a re-export shim rather than updating all consumers -- lower risk, backward compatible

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build failure (broken import in ScreenGroupDetailPage.jsx and FeatureFlagsPage.jsx) prevented full `npm run build` verification. Verified via Vite SSR module resolution that all changed modules resolve correctly, and confirmed all 2079 unit tests pass. The pre-existing broken imports are unrelated to this plan's changes.

## User Setup Required

**External services require manual configuration.** To activate Sentry error monitoring:
- Set `VITE_SENTRY_DSN` in `.env.local` and production environment (from Sentry Dashboard -> Settings -> Projects -> Client Keys)
- Set `VITE_ERROR_TRACKING_PROVIDER=sentry` in `.env.local` and production environment
- Without these env vars, error tracking falls back to console logging (no errors, graceful degradation)

## Next Phase Readiness
- Sentry SDK fully wired -- ready for production configuration in Phase 40
- All error tracking flows through single provider (errorTracking.jsx)
- Supabase errors automatically captured with structured context
- User identity available in error reports once DSN is configured

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 39-error-monitoring-setup*
*Completed: 2026-02-09*
