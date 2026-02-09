# Phase 39: Error Monitoring Setup - Research

**Researched:** 2026-02-09
**Domain:** Sentry SDK integration for React SPA with Supabase backend
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No locked decisions -- all implementation decisions were delegated to Claude's discretion.

### Claude's Discretion

All implementation decisions were delegated to Claude. The following areas have full flexibility:

**Error context scope:**
- User identity enrichment (how much user info to attach -- ID, role, org)
- App state capture strategy (route, feature flags, store state depth)
- Backend request context (metadata vs sanitized body)
- Breadcrumb depth and configuration

**Error filtering:**
- Third-party/extension error handling (filter vs tag)
- Error sampling rate (based on expected volume)
- Known benign error deny-list (ResizeObserver, network disconnects, cancelled fetches)
- API error scope (which HTTP status codes to capture)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

**Phase Boundary:** Notifications, source maps, and alert thresholds belong in Phase 40.
</user_constraints>

## Summary

This project already has substantial Sentry infrastructure in place. The `@sentry/react@10.36.0` SDK is installed and a comprehensive provider-based error tracking abstraction layer exists in `src/utils/errorTracking.jsx`. However, **Sentry is not actually wired into the application startup** -- `initObservability()` and `initErrorTracking()` are never called from `main.jsx` or any entrypoint. The existing `ErrorBoundary` component calls `handleReactError()` from errorTracking.jsx, but since `initErrorTracking()` is never invoked, it defaults to the console provider.

The primary work for this phase is: (1) actually call `initErrorTracking()` / `initObservability()` at app startup in `main.jsx`, (2) upgrade `main.jsx` to use React 19's `createRoot` error hooks with `Sentry.reactErrorHandler()`, (3) integrate React Router v7 browser tracing via `reactRouterV7BrowserTracingIntegration`, (4) wire `setObservabilityUser()` into AuthContext so user context propagates to Sentry on login/logout, (5) clean up the duplicate `errorTrackingService.js` that conflicts with the newer `errorTracking.jsx`, and (6) verify the full pipeline end-to-end. There is no custom backend server -- the "backend" is Supabase (RPC calls + client-side queries), so "API error monitoring" means intercepting Supabase client errors on the frontend, not instrumenting a separate server.

**Primary recommendation:** Wire the existing Sentry infrastructure into the app lifecycle (init at startup, user context on auth, route tracking via React Router v7 integration) and remove the dead/duplicate error tracking service.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sentry/react | 10.36.0 (installed) | Error capture, performance, session replay | Industry standard; already in deps |
| react | 19.1.1 (installed) | UI framework | Already in use; React 19 error hooks matter |
| react-router-dom | 7.9.5 (installed) | Routing | Already in use; Sentry has specific v7 integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| web-vitals | 5.1.0 (installed) | Performance metrics | Already integrated via webVitalsService.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sentry/react | Bugsnag, LogRocket | Sentry already installed and configured; switching would be wasted effort |

**Installation:**
No new packages needed. `@sentry/react@10.36.0` is already installed.

## Architecture Patterns

### Current Project Structure (Error Monitoring Files)
```
src/
  utils/
    errorTracking.jsx     # PRIMARY: Sentry provider abstraction (USE THIS)
    observability.js      # Orchestrator: inits error tracking + web vitals + logging + health
    errorMessages.js      # User-friendly error messages (imports OLD errorTrackingService)
  services/
    errorTrackingService.js  # DUPLICATE/OLD: Console-only stub (REMOVE OR REDIRECT)
    loggingService.js     # Structured logging with batching
    webVitalsService.js   # Web Vitals (already uses errorTracking.jsx)
    healthService.js      # Health monitoring
  components/
    ErrorBoundary.jsx     # Custom ErrorBoundary (already uses errorTracking.jsx)
  config/
    env.js               # Environment config (has VITE_ERROR_TRACKING_PROVIDER)
  contexts/
    AuthContext.jsx       # Auth context (needs setObservabilityUser wiring)
  main.jsx              # App entrypoint (NEEDS initObservability + React 19 hooks)
  router/
    AppRouter.jsx        # Router (NEEDS SentryRoutes wrapping)
```

### Pattern 1: App Startup Initialization
**What:** Initialize Sentry before React renders, using React 19 error hooks on createRoot
**When to use:** At app entrypoint (main.jsx)
**Example:**
```javascript
// Source: https://docs.sentry.io/platforms/javascript/guides/react/
import * as Sentry from '@sentry/react';
import { initObservability } from './utils/observability';

// Initialize observability (including Sentry) BEFORE React renders
initObservability();

const root = createRoot(document.getElementById("root"), {
  // React 19 error hooks for comprehensive error capture
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* ... providers ... */}
    </ErrorBoundary>
  </React.StrictMode>
);
```

### Pattern 2: React Router v7 Integration
**What:** Replace generic browserTracingIntegration with reactRouterV7BrowserTracingIntegration for route-aware tracing
**When to use:** In the Sentry.init() configuration
**Example:**
```javascript
// Source: https://docs.sentry.io/platforms/javascript/guides/react/features/react-router/v7/
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // ... other options
});

// In router component:
import { Routes } from 'react-router-dom';
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);
// Use <SentryRoutes> instead of <Routes> in AppRouter
```

### Pattern 3: User Context Propagation
**What:** Set Sentry user context when auth state changes
**When to use:** In AuthContext when user logs in/out
**Example:**
```javascript
// Source: https://docs.sentry.io/platforms/javascript/enriching-events/context/
import { setObservabilityUser } from '../utils/observability';

// On successful auth:
setObservabilityUser({
  id: user.id,
  email: user.email,
  full_name: userProfile.full_name,
  role: userProfile.role,
  tenant_id: userProfile.tenant_id,
  plan: userProfile.plan,
});

// On logout:
setObservabilityUser(null);
```

### Pattern 4: Supabase API Error Enrichment
**What:** Add Sentry breadcrumbs and context to Supabase RPC/query failures
**When to use:** In service layer error handling
**Example:**
```javascript
import { addBreadcrumb, captureException } from '../utils/errorTracking.jsx';

// In any service function:
const { data, error } = await supabase.from('screens').select('*');
if (error) {
  addBreadcrumb('supabase', `Query failed: screens.select`, {
    table: 'screens',
    operation: 'select',
    code: error.code,
    status: error.status,
  }, 'error');

  captureException(new Error(`Supabase query failed: ${error.message}`), {
    supabaseCode: error.code,
    table: 'screens',
    operation: 'select',
  });
}
```

### Anti-Patterns to Avoid
- **Double initialization:** Both `errorTrackingService.js` and `errorTracking.jsx` export `initErrorTracking` -- only the one in `errorTracking.jsx` has actual Sentry integration. The service file is a dead console-only stub.
- **Calling initErrorTracking directly instead of initObservability:** Use `initObservability()` as it orchestrates error tracking + web vitals + logging + health monitoring together.
- **Not initializing before render:** `Sentry.init()` must run before `createRoot().render()` to capture errors during initial render.
- **Using window event listeners for unhandled rejections alongside Sentry:** The current `main.jsx` has a manual `unhandledrejection` handler AND `errorTracking.jsx` sets up its own. Remove the one in main.jsx to avoid double-reporting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error deduplication | Custom dedup logic | Sentry's built-in grouping + fingerprinting | Sentry already groups by stack trace; custom fingerprinting via beforeSend if needed |
| PII scrubbing | Manual regex everywhere | Sentry's `beforeSend` + `sendDefaultPii: false` | Centralized, consistent, and covers all event types |
| Route-aware error tracking | Manual route parsing | `reactRouterV7BrowserTracingIntegration` | Automatically captures route params, transitions, and performance spans |
| Error filtering | Per-call-site filtering | `ignoreErrors` + `denyUrls` in Sentry.init | Centralized deny-list avoids scattered try/catch suppression |
| Session replay | Custom session recording | `Sentry.replayIntegration()` | Already configured with privacy controls |

**Key insight:** The existing codebase already built the abstraction layer (`errorTracking.jsx`, `observability.js`). The gap is purely in wiring -- calling the init functions and connecting user/route context. Do not rebuild abstractions; activate the existing ones.

## Common Pitfalls

### Pitfall 1: Duplicate Error Tracking Services
**What goes wrong:** `errorTrackingService.js` and `errorTracking.jsx` both export overlapping APIs (`initErrorTracking`, `captureError`/`captureException`). `errorMessages.js` imports from the old console-only stub, bypassing Sentry entirely.
**Why it happens:** Iterative development created the newer file without removing the older one.
**How to avoid:** Consolidate: update `errorMessages.js` to import from `errorTracking.jsx` instead. Either delete `errorTrackingService.js` or convert it to a re-export barrel.
**Warning signs:** Errors logged to console in production but not appearing in Sentry.

### Pitfall 2: Double unhandledrejection Handlers
**What goes wrong:** `main.jsx` has a manual `window.addEventListener('unhandledrejection', ...)` and `errorTracking.jsx` `setupGlobalErrorHandlers()` adds another. This causes duplicate error reports in Sentry.
**Why it happens:** The main.jsx handler was added before the observability layer existed.
**How to avoid:** Remove the manual handler from `main.jsx` and let `errorTracking.jsx` handle it via `setupGlobalErrorHandlers()`.
**Warning signs:** Same error appearing twice in Sentry with different fingerprints.

### Pitfall 3: initObservability Never Called
**What goes wrong:** The entire observability stack (Sentry, web vitals, health) exists but does nothing because nothing invokes `initObservability()`.
**Why it happens:** The orchestrator was built but never wired into the app entrypoint.
**How to avoid:** Add `initObservability()` call to `main.jsx` before `createRoot().render()`.
**Warning signs:** No errors in Sentry dashboard despite known production errors.

### Pitfall 4: Missing Sentry DSN in Environment
**What goes wrong:** Sentry silently falls back to console provider if `VITE_SENTRY_DSN` is not set.
**Why it happens:** The env var was marked optional and never populated in production.
**How to avoid:** Add `VITE_SENTRY_DSN` to production environment variables. Add a startup check that warns loudly if DSN is missing in production.
**Warning signs:** "Sentry DSN not configured" warning in console.

### Pitfall 5: CSP Blocking Sentry Requests
**What goes wrong:** Sentry SDK cannot send events if Content-Security-Policy blocks the ingest endpoint.
**Why it happens:** Strict CSP without Sentry domain allowlisted.
**How to avoid:** The CSP in `vercel.json` already includes `https://*.ingest.sentry.io` in connect-src. Verify this is present after any CSP changes.
**Warning signs:** `Blocked by Content-Security-Policy` errors in browser console.

### Pitfall 6: React 19 Error Hooks Not Used
**What goes wrong:** React 19's `onUncaughtError`, `onCaughtError`, and `onRecoverableError` hooks are not configured, meaning some errors bypass the ErrorBoundary and go unreported.
**Why it happens:** The app was originally written for React 18 patterns.
**How to avoid:** Pass `Sentry.reactErrorHandler()` to all three hooks in `createRoot()` options.
**Warning signs:** Promise rejections inside event handlers or async code not captured by Sentry.

### Pitfall 7: terserOptions Drops console.warn Used by Sentry Fallback
**What goes wrong:** `vite.config.js` has `drop_console: true` which removes ALL console.* calls including the Sentry initialization fallback warnings.
**Why it happens:** Aggressive console removal for production.
**How to avoid:** This is acceptable since Sentry SDK uses its own transport, not console. But be aware that diagnostic console.warn calls in errorTracking.jsx will be stripped in production builds.
**Warning signs:** None visible (this is actually fine since Sentry transport is independent of console).

## Code Examples

Verified patterns from official sources:

### Recommended Sentry.init Configuration (for this project)
```javascript
// Source: https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/
import * as Sentry from '@sentry/react';
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: config().env || 'development',
  release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  enabled: isProduction() || import.meta.env.VITE_SENTRY_DEBUG === 'true',

  // Error sampling: capture all errors
  sampleRate: 1.0,

  // Performance: 10% in production
  tracesSampleRate: isProduction() ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: isProduction() ? 0.1 : 0,
  replaysOnErrorSampleRate: isProduction() ? 1.0 : 0,

  // PII control (v10 change: controls IP inference)
  sendDefaultPii: false,

  // Breadcrumbs
  maxBreadcrumbs: 50,
  attachStacktrace: true,

  // Ignore noisy non-actionable errors
  ignoreErrors: [
    // Network errors (user's connection, not our fault)
    'Network Error',
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    'TypeError: cancelled',
    'TypeError: Cancelled',
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // User aborts
    'AbortError',
    'The operation was aborted',
    // ResizeObserver (benign browser warning)
    'ResizeObserver loop',
    'ResizeObserver loop completed with undelivered notifications',
    // Script errors from cross-origin scripts
    'Script error.',
  ],

  // Block errors from third-party scripts
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],

  // Sanitize PII before sending
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    if (event.message) {
      event.message = event.message.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '[EMAIL_REDACTED]'
      );
    }
    return event;
  },

  integrations: [
    // React Router v7 aware tracing
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    // Session Replay with privacy controls
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  initialScope: {
    tags: {
      app: 'bizscreen',
      platform: 'web',
    },
  },
});
```

### User Context Setting
```javascript
// Source: https://docs.sentry.io/platforms/javascript/enriching-events/context/
import * as Sentry from '@sentry/react';

// Set user on login
Sentry.setUser({
  id: user.id,
  email: user.email,        // Will be present in Sentry events
  username: user.full_name,
});

// Set additional context
Sentry.setContext('tenant', {
  id: tenant.id,
  name: tenant.name,
  plan: tenant.plan,
});

Sentry.setContext('app', {
  version: import.meta.env.VITE_APP_VERSION,
  environment: import.meta.env.MODE,
});

// Clear on logout
Sentry.setUser(null);
```

### Custom Breadcrumb for Supabase Operations
```javascript
// Source: https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/
Sentry.addBreadcrumb({
  category: 'supabase',
  message: 'Query: screens.select',
  data: {
    table: 'screens',
    operation: 'select',
    status: error ? 'failed' : 'success',
    errorCode: error?.code,
  },
  level: error ? 'error' : 'info',
});
```

## Existing Code Assessment

### What Already Works (keep as-is)
| Component | Status | Notes |
|-----------|--------|-------|
| `errorTracking.jsx` | Complete | Provider abstraction, Sentry init, all capture methods |
| `observability.js` | Complete | Orchestrates error tracking + web vitals + logging |
| `ErrorBoundary.jsx` | Complete | Custom error boundary with handleReactError integration |
| `webVitalsService.js` | Complete | Web Vitals with Sentry context integration |
| CSP in `vercel.json` | Complete | Already allows `*.ingest.sentry.io` |
| `.env.example` | Complete | Has VITE_SENTRY_DSN, VITE_ERROR_TRACKING_PROVIDER documented |

### What Needs to Be Done (gaps)
| Gap | Priority | Effort |
|-----|----------|--------|
| Call `initObservability()` from `main.jsx` | CRITICAL | Small |
| Add React 19 error hooks to `createRoot()` | CRITICAL | Small |
| Remove duplicate `unhandledrejection` handler from `main.jsx` | HIGH | Trivial |
| Integrate `reactRouterV7BrowserTracingIntegration` in Sentry.init | HIGH | Medium |
| Wrap `<Routes>` with `Sentry.withSentryReactRouterV7Routing` in AppRouter | HIGH | Small |
| Wire `setObservabilityUser()` into AuthContext on login/logout | HIGH | Small |
| Fix `errorMessages.js` to import from `errorTracking.jsx` not `errorTrackingService.js` | MEDIUM | Small |
| Remove or redirect `errorTrackingService.js` | MEDIUM | Small |
| Set `VITE_SENTRY_DSN` in production environment | CRITICAL | Config-only |
| Set `sendDefaultPii: false` (v10 behavior change) | MEDIUM | Trivial |
| Verify end-to-end: trigger test error, confirm it appears in Sentry | CRITICAL | Manual test |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `browserTracingIntegration()` | `reactRouterV7BrowserTracingIntegration()` | Sentry v8+ with RR v7 | Route-aware performance spans |
| React ErrorBoundary only | `Sentry.reactErrorHandler()` on createRoot hooks | React 19 + Sentry v8.6+ | Catches errors ErrorBoundary misses |
| `sendDefaultPii` not relevant | `sendDefaultPii` controls IP inference | Sentry v10 | Must explicitly set to false for GDPR |
| FID metric | INP metric | Sentry v10 / web-vitals v5 | FID removed, INP is the standard |
| `_experiments.enableLogs` | `enableLogs` (top-level option) | Sentry v10 | Simplification |

**Deprecated/outdated:**
- `errorTrackingService.js`: Dead code; the newer `errorTracking.jsx` supersedes it entirely
- `FID` in web vitals: Removed in Sentry v10; the project's webVitalsService.js correctly uses INP via web-vitals v5

## Backend Considerations

This project has **no custom backend server**. The architecture is:
- **Frontend:** React SPA on Vercel (static hosting with SPA rewrites)
- **Backend:** Supabase (PostgreSQL + RPC functions + Row Level Security)
- **API routes in dev:** Vite dev server middleware (media presign)
- **No Supabase Edge Functions** exist

Therefore, "API error monitoring" means:
1. Intercepting Supabase client-side query/RPC failures in the frontend
2. Adding Sentry breadcrumbs for failed Supabase operations
3. Enriching errors with request context (table, operation, error code, HTTP status)

There is **no `@sentry/node` or server-side Sentry SDK needed** for this phase.

## Open Questions

1. **Sentry DSN availability**
   - What we know: VITE_SENTRY_DSN is documented in .env.example but not set in production
   - What's unclear: Does the user have a Sentry project/DSN ready?
   - Recommendation: Plan should include a task to verify DSN is available and set in production env. If not, create a Sentry project at sentry.io.

2. **Error volume estimation**
   - What we know: tracesSampleRate is set to 0.1 (10%) which is reasonable
   - What's unclear: Production traffic volume for Sentry quota planning
   - Recommendation: Start with sampleRate: 1.0 for errors, tracesSampleRate: 0.1, adjust after first week of data.

3. **Consent service integration**
   - What we know: `consentService.js` has analytics consent management and references `window.__SENTRY__`
   - What's unclear: Should Sentry respect analytics consent (GDPR)?
   - Recommendation: Error monitoring is generally classified as "necessary" (legitimate interest), not analytics. Keep Sentry independent of consent toggles but set `sendDefaultPii: false`. Document this decision.

## Sources

### Primary (HIGH confidence)
- [Sentry React docs](https://docs.sentry.io/platforms/javascript/guides/react/) - Init setup, React 19 hooks, ErrorBoundary
- [Sentry React Router v7 docs](https://docs.sentry.io/platforms/javascript/guides/react/features/react-router/v7/) - reactRouterV7BrowserTracingIntegration setup
- [Sentry configuration options](https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/) - All init options, production defaults
- [Sentry filtering docs](https://docs.sentry.io/platforms/javascript/guides/react/configuration/filtering/) - ignoreErrors, denyUrls, beforeSend
- [Sentry breadcrumbs docs](https://docs.sentry.io/platforms/javascript/guides/react/enriching-events/breadcrumbs/) - Manual breadcrumb API
- [Sentry ErrorBoundary docs](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/) - Component usage, React 19 complementary use
- [Sentry v9 to v10 migration](https://docs.sentry.io/platforms/javascript/guides/react/migration/v9-to-v10/) - Breaking changes, sendDefaultPii

### Secondary (MEDIUM confidence)
- [npm @sentry/react](https://www.npmjs.com/package/@sentry/react) - Version 10.38.0 latest (installed: 10.36.0)
- [Sentry changelog](https://sentry.io/changelog/) - React 19 support details

### Tertiary (LOW confidence)
- None needed -- all findings verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @sentry/react already installed and configured; just needs wiring
- Architecture: HIGH - Existing abstraction layer is well-designed; gaps are clearly identifiable
- Pitfalls: HIGH - Found through direct codebase analysis; confirmed via official docs
- Code examples: HIGH - All from official Sentry docs for current SDK version

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable SDK, no rapid changes expected)
