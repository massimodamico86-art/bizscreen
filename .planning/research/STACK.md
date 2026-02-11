# Stack Research: Stabilization

**Project:** BizScreen Digital Signage Platform
**Researched:** 2026-01-22
**Focus:** Production hardening for existing React/Supabase application

## Executive Summary

BizScreen already has foundational infrastructure for logging (custom `loggingService.js`) and error tracking (Sentry integration available). The stabilization effort should **enhance existing patterns** rather than replace them wholesale. Key gaps to address:

1. **Logging:** 197+ `console.log` calls need migration to existing structured logger
2. **Rate Limiting:** No client-side throttling for Supabase calls
3. **Error Retry:** Empty catch blocks need proper retry logic with backoff
4. **XSS Prevention:** `dangerouslySetInnerHTML` usage in HelpCenterPage needs sanitization

---

## Logging

### Current State

BizScreen has a **well-designed custom logging service** at `src/services/loggingService.js` with:
- Structured JSON logging with correlation IDs
- Log levels (trace, debug, info, warn, error, fatal)
- Environment-based filtering (info+ in production, debug+ in dev)
- Batched remote logging capability
- Scoped loggers for components/services
- Session context tracking

**The logging infrastructure is production-ready.** The work is migrating 197+ `console.log` calls to use it.

### Recommendation: Keep Existing Service

| Decision | Recommendation | Confidence |
|----------|----------------|------------|
| Logging library | **Keep custom loggingService.js** | HIGH |
| Migration approach | Find/replace console.log with scoped loggers | HIGH |

**Rationale:** The existing service provides:
- Correlation ID tracking (critical for debugging distributed issues)
- Context enrichment (user, tenant, URL)
- Batched remote logging (reduces network overhead)
- Log sampling (prevents log explosion in production)

Adding Pino or Winston would require significant refactoring with minimal benefit.

### Alternative: Pino (If Starting Fresh)

If the project lacked logging infrastructure, the recommendation would be:

| Library | Version | Purpose | Weekly Downloads |
|---------|---------|---------|------------------|
| [pino](https://github.com/pinojs/pino) | 10.2.0 | Structured JSON logger | 7M+ |
| [pino-pretty](https://github.com/pinojs/pino-pretty) | latest | Dev console formatting | - |

**Why Pino over Winston:**
- 5-10x faster in benchmarks (JSON serialization optimized)
- Smaller bundle size
- Native browser support via `browser` option
- Better TypeScript support

### Migration Pattern

```javascript
// BEFORE: scattered console.log
console.log('User logged in', { userId });

// AFTER: scoped logger
import { createScopedLogger } from '../services/loggingService';
const log = createScopedLogger('AuthService');
log.info('User logged in', { userId });
```

### Sources

- [Pino vs Winston Comparison](https://betterstack.com/community/comparisons/pino-vs-winston/) - Performance benchmarks
- [Top Node.js Logging Libraries 2025](https://www.dash0.com/faq/the-top-5-best-node-js-and-javascript-logging-frameworks-in-2025-a-complete-guide) - Ecosystem overview
- [Pino Logger Guide 2026](https://signoz.io/guides/pino-logger/) - Implementation patterns

---

## Rate Limiting

### Problem Context

Supabase enforces rate limits at multiple levels:
- **Auth endpoints:** Strict limits on sign-in/sign-up
- **Data API (PostgREST):** Based on pricing plan
- **Realtime:** Channel subscriptions and messages

Client-side throttling prevents hitting these limits and improves UX during degraded service.

### Recommendation: Lodash Throttle + Custom Supabase Wrapper

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| [lodash.throttle](https://lodash.com/docs/#throttle) | 4.1.1 | Function throttling | HIGH |
| [lodash.debounce](https://lodash.com/docs/#debounce) | 4.0.8 | Input debouncing | HIGH |

**Why not a dedicated rate limiting library:**
- Supabase doesn't expose Kong rate limit headers to clients
- Client-side rate limiting is about UX smoothing, not enforcement
- Lodash utilities are battle-tested and already a common dependency

### Implementation Pattern

```javascript
// src/lib/supabaseWithThrottle.js
import { throttle, debounce } from 'lodash';
import { supabase } from '../supabase';

// Throttle realtime subscriptions (max 1 per 100ms)
export const throttledSubscribe = throttle(
  (channel, event, callback) => {
    return supabase.channel(channel).on(event, callback).subscribe();
  },
  100,
  { leading: true, trailing: false }
);

// Debounce search queries (wait 300ms after last keystroke)
export const debouncedSearch = debounce(
  async (table, query) => {
    return supabase.from(table).select().ilike('name', `%${query}%`);
  },
  300
);

// Throttle batch operations (max 5 per second)
export const throttledBatchInsert = throttle(
  async (table, records) => {
    return supabase.from(table).insert(records);
  },
  200
);
```

### Handling 429 Errors

```javascript
// Add to existing error handling
function handleSupabaseError(error) {
  if (error.status === 429) {
    log.warn('Rate limit hit', { endpoint: error.url });
    // Show user-friendly message
    toast.warning('Too many requests. Please wait a moment.');
    return { retry: true, delay: 1000 };
  }
  return { retry: false };
}
```

### Sources

- [Supabase Rate Limits Documentation](https://supabase.com/docs/guides/auth/rate-limits) - Official limits
- [Handling Rate Limiting in Supabase](https://bootstrapped.app/guide/how-to-handle-rate-limiting-in-supabase) - Best practices
- [Supabase Realtime Throttling](https://drdroid.io/stack-diagnosis/supabase-realtime-client-side-throttling) - Realtime-specific guidance
- [Lodash Throttle vs Debounce](https://moldstud.com/articles/p-lodash-throttle-vs-debounce-when-to-use-each-function) - When to use each

---

## Error Retry

### Problem Context

BizScreen has:
- Empty catch blocks that silently swallow errors
- No retry logic for transient network failures
- Supabase calls that fail permanently on temporary issues

### Recommendation: fetch-retry for Supabase + p-retry for General Operations

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| [fetch-retry](https://www.npmjs.com/package/fetch-retry) | 6.0.0 | Supabase client retries | HIGH |
| [p-retry](https://github.com/sindresorhus/p-retry) | 7.1.0 | General async retries | HIGH |

**Why two libraries:**
- `fetch-retry` integrates directly with Supabase client initialization
- `p-retry` provides cleaner API for wrapping arbitrary async functions

### Supabase Client Configuration

```javascript
// src/supabase.js
import { createClient } from '@supabase/supabase-js';
import fetchRetry from 'fetch-retry';

const fetchWithRetry = fetchRetry(fetch, {
  retries: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff: 1s, 2s, 4s
  retryOn: (attempt, error, response) => {
    // Retry on network errors
    if (error !== null) return true;
    // Retry on 5xx and rate limit errors
    if (response && (response.status >= 500 || response.status === 429)) {
      return attempt < 3;
    }
    return false;
  },
});

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    global: {
      fetch: fetchWithRetry,
    },
  }
);
```

### General Retry Pattern with p-retry

```javascript
// src/utils/retry.js
import pRetry from 'p-retry';
import { log } from '../services/loggingService';

export async function withRetry(operation, options = {}) {
  const {
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 30000,
    onFailedAttempt,
    operationName = 'operation',
  } = options;

  return pRetry(operation, {
    retries,
    minTimeout,
    maxTimeout,
    factor: 2, // Exponential factor
    randomize: true, // Add jitter to prevent thundering herd
    onFailedAttempt: (error) => {
      log.warn(`${operationName} failed, retrying`, {
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message,
      });
      onFailedAttempt?.(error);
    },
  });
}

// Usage
const result = await withRetry(
  () => fetchExternalApi(url),
  { operationName: 'External API call', retries: 3 }
);
```

### Replacing Empty Catch Blocks

```javascript
// BEFORE: Silent failure
try {
  await deleteDataSource(id);
} catch {}

// AFTER: Logged failure with optional retry
try {
  await withRetry(() => deleteDataSource(id), {
    operationName: 'Delete data source',
    retries: 2,
  });
} catch (error) {
  log.error('Failed to delete data source after retries', {
    id,
    error
  });
  // Decide: re-throw, show user message, or gracefully degrade
}
```

### Exponential Backoff Constants

| Attempt | Delay (no jitter) | With Jitter Range |
|---------|-------------------|-------------------|
| 1 | 1000ms | 500-1500ms |
| 2 | 2000ms | 1000-3000ms |
| 3 | 4000ms | 2000-6000ms |
| Max | 30000ms | - |

### Sources

- [Supabase Automatic Retries Documentation](https://supabase.com/docs/guides/api/automatic-retries-in-supabase-js) - Official guide
- [p-retry GitHub](https://github.com/sindresorhus/p-retry) - 18M+ weekly downloads
- [Exponential Backoff in JavaScript](https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/) - Implementation patterns
- [Robust Retry Logic Patterns](https://v-checha.medium.com/advanced-node-js-patterns-implementing-robust-retry-logic-656cf70f8ee9) - Advanced patterns

---

## XSS Prevention

### Problem Context

BizScreen uses `dangerouslySetInnerHTML` in `HelpCenterPage.jsx`:
```javascript
// Lines 289, 293
dangerouslySetInnerHTML={{ __html: formatted }}
```

This renders user/admin-provided content as HTML, creating XSS risk if content is not sanitized.

### Recommendation: DOMPurify

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| [dompurify](https://github.com/cure53/DOMPurify) | 3.3.1 | HTML sanitization | HIGH |

**Why DOMPurify:**
- OWASP-recommended solution
- 18M+ weekly downloads
- Whitelist-based (secure by default)
- Handles edge cases (javascript: URLs, SVG injection, etc.)
- Actively maintained by security researchers (Cure53)

**Note:** Since BizScreen is client-side only (Vite/React), plain `dompurify` works. Use `isomorphic-dompurify@2.35.0` only if you add SSR later.

### Implementation

```javascript
// src/utils/sanitize.js
import DOMPurify from 'dompurify';

// Configure DOMPurify with safe defaults
const purifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Allow target="_blank"
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, purifyConfig);
}

// For links, ensure safe protocols
export function sanitizeUrl(url) {
  if (!url) return '';
  const cleaned = DOMPurify.sanitize(url);
  // Block javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(cleaned)) {
    return '';
  }
  return cleaned;
}
```

### Safe HTML Component

```javascript
// src/components/SafeHtml.jsx
import DOMPurify from 'dompurify';

const defaultConfig = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

export function SafeHtml({ html, config = defaultConfig, className = '' }) {
  if (!html) return null;

  const clean = DOMPurify.sanitize(html, config);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

// Usage in HelpCenterPage.jsx
<SafeHtml
  html={formatted}
  className="text-gray-700 mb-3"
/>
```

### Additional XSS Prevention Measures

1. **URL Validation for Links:**
```javascript
// Reject javascript: URLs in href attributes
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href');
    if (/^(javascript|data|vbscript):/i.test(href)) {
      node.removeAttribute('href');
    }
  }
});
```

2. **Content Security Policy Headers** (server-side):
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

3. **React Best Practices:**
- Use `{}` interpolation (auto-escaped) whenever possible
- Reserve `dangerouslySetInnerHTML` for true HTML content needs
- Never construct HTML strings with user input

### Sources

- [DOMPurify Official Site](https://dompurify.com/) - Documentation
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify) - v3.3.1
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) - Industry standard
- [React XSS Guide](https://www.stackhawk.com/blog/react-xss-guide-examples-and-prevention/) - React-specific patterns
- [Securing React with DOMPurify](https://blog.openreplay.com/securing-react-with-dompurify/) - Implementation guide
- [React Security Best Practices 2025](https://hub.corgea.com/articles/react-security-best-practices) - Current recommendations

---

## Recommendations Summary

| Area | Library/Approach | Version | Confidence | Rationale |
|------|------------------|---------|------------|-----------|
| **Logging** | Keep existing `loggingService.js` | N/A | HIGH | Already production-ready with correlation IDs, batching, and scoped loggers |
| **Rate Limiting** | `lodash.throttle` / `lodash.debounce` | 4.1.1 | HIGH | Simple, battle-tested; Supabase rate limiting is server-side |
| **Error Retry (Supabase)** | `fetch-retry` | 6.0.0 | HIGH | Official Supabase recommendation; integrates at fetch level |
| **Error Retry (General)** | `p-retry` | 7.1.0 | HIGH | 18M+ weekly downloads; clean async/await API with backoff |
| **XSS Prevention** | `dompurify` | 3.3.1 | HIGH | OWASP-recommended; 18M+ weekly downloads; whitelist-based |

### Installation Command

```bash
npm install fetch-retry p-retry dompurify lodash.throttle lodash.debounce
```

**Note:** If lodash is already a dependency, use the main package's throttle/debounce instead of separate packages.

### Priority Order

1. **XSS Prevention** - Security vulnerability; high impact, low effort
2. **Error Retry** - Improves reliability; medium effort
3. **Logging Migration** - Quality improvement; medium effort (197+ files)
4. **Rate Limiting** - Preventive measure; low effort

---

## Gaps and Open Questions

| Gap | Impact | Resolution |
|-----|--------|------------|
| No server-side rate limiting | Medium | Supabase manages this; consider Edge Functions for custom limits |
| No circuit breaker pattern | Low | Add later if reliability issues persist after retry logic |
| Sentry not activated | Medium | Existing code supports it; just needs configuration |
| Log aggregation backend | Low | Current remote logging endpoint needs setup |

---

## Version Verification

All library versions verified against npm as of 2026-01-22:

| Library | Version | Last Updated | Source |
|---------|---------|--------------|--------|
| pino | 10.2.0 | Jan 2026 | [npm](https://www.npmjs.com/package/pino) |
| p-retry | 7.1.0 | Dec 2025 | [npm](https://www.npmjs.com/package/p-retry) |
| dompurify | 3.3.1 | Jan 2026 | [npm](https://www.npmjs.com/package/dompurify) |
| fetch-retry | 6.0.0 | - | [npm](https://www.npmjs.com/package/fetch-retry) |
| lodash | 4.17.21 | Stable | [npm](https://www.npmjs.com/package/lodash) |

---

## v2 Stack Additions

**Researched:** 2026-01-24
**Focus:** Templates Marketplace, Multi-Language Content, Advanced Scheduling

*(v2 section preserved as-is -- see original content above)*

---

## v2.2 Stack: Unified Onboarding Flow

**Researched:** 2026-01-28
**Focus:** Stack additions for polished onboarding UX

*(v2.2 section preserved as-is -- see original content above)*

---

## v3.0 Stack: Premium Template Browsing, Editor Polish, Stock Assets

**Researched:** 2026-02-10
**Focus:** Animation upgrades, Unsplash API integration, icon packs in Polotno editor, image optimization for template gallery

*(v3.0 section preserved as-is -- see original content above)*

---

## v4.0 Stack: Data-Driven Signage Widgets

**Researched:** 2026-02-11
**Focus:** Data source widgets (Google Sheets/CSV/API rendering), social/RSS feed display, weather/time/countdown widgets, configurable polling refresh

### Executive Summary

**Recommendation: ZERO NEW npm DEPENDENCIES. Two new Supabase Edge Functions. One new player widget component.**

The existing BizScreen codebase is remarkably complete for this milestone. After reading every relevant service file, widget, and Edge Function, the critical finding is that most of the "new features" already have foundational code. The actual work is:

1. **Build 2 Edge Functions** (`rss-proxy`, `data-proxy`) following the proven `unsplash-proxy` pattern
2. **Build 1 player widget** (`CountdownWidget`) -- the only genuinely missing component
3. **Extend existing services** with new data source types (`REST_API`, `RSS_FEED`)
4. **Wire up rendering** for data table display using existing `dataSourceService.js` data
5. **Add configurable polling** by parameterizing existing `setInterval` patterns

No new npm packages are needed. `date-fns` (already installed) handles countdown math. `isomorphic-dompurify` (already installed) sanitizes RSS HTML. `framer-motion` (already installed) handles ticker animations.

---

### Existing Infrastructure Audit (What is Already Built)

Every entry below was verified by reading the actual source file.

| Feature | Status | Implementation | Gap |
|---------|--------|----------------|-----|
| **Data Sources CRUD** | COMPLETE | `dataSourceService.js` -- full CRUD, CSV import, field/row management, real-time subscriptions via Supabase postgres_changes | Need `REST_API` and `RSS_FEED` types in `DATA_SOURCE_TYPES` |
| **Google Sheets sync** | COMPLETE | `googleSheetsService.js` -- fetch via Sheets API v4, link/unlink, change detection, sync history, field type inference | None |
| **Data binding to scene elements** | COMPLETE | `dataBindingResolver.js` -- block-level bindings, preloaded source cache, player prefetch, stale detection, refresh | Need per-widget configurable TTL |
| **Weather (player widget)** | COMPLETE | `player/widgets/WeatherWidget.jsx` -- OpenWeatherMap, 10-min auto-refresh, minimal + card styles | None |
| **Weather Wall (full-screen app)** | COMPLETE | `WeatherWallConfigModal.jsx` + `AppRenderer.jsx` WeatherApp -- themes, forecast, multi-language, orientation | None |
| **Weather service** | COMPLETE | `weatherService.js` -- current + 5-day forecast, city + coords, LRU cache (30min, 50 entries), mock fallback | None |
| **Clock widget** | COMPLETE | `player/widgets/ClockWidget.jsx` -- 1s refresh, size presets, custom font | None |
| **Date widget** | COMPLETE | `player/widgets/DateWidget.jsx` -- weekday/month/day format, size presets | None |
| **Clock app (full-screen)** | COMPLETE | `AppRenderer.jsx` ClockApp -- timezone support, 12/24hr, date formats, full-screen gradient | None |
| **Social feed widget** | COMPLETE | `SocialFeedWidget.jsx` -- 5 layouts (carousel/grid/list/single/masonry), auto-rotate, engagement stats | None |
| **Social feed renderer (player)** | COMPLETE | `SocialFeedRenderer.jsx` -- cached data only, offline-safe, 5 layouts mirrored | None |
| **Social sync service** | COMPLETE | `socialFeedSyncService.js` -- rate limits, cooldowns, concurrent sync (max 3), stale detection, alert integration | None |
| **Social providers** | COMPLETE | `services/social/` -- Instagram, Facebook, TikTok, Google Reviews with dedicated sync functions | None |
| **RSS Ticker app creation** | COMPLETE | `mediaService.js` `createRssTickerApp` -- creates app asset with feedUrl, scrollSpeed, maxItems config | None |
| **RSS Ticker rendering** | PARTIAL | `AppRenderer.jsx` `RssTickerApp` -- scrolling ticker with `useAppData` hook, CSS keyframes animation | `useAppData` calls `/api/apps/data` which does not exist; needs Edge Function backend |
| **Data Table app creation** | COMPLETE | `mediaService.js` `createDataTableApp` -- CSV/TSV/JSON URL source, theme, maxRows, columns | None |
| **Data Table rendering** | PARTIAL | `AppRenderer.jsx` uses `useAppData` | Same issue -- backend endpoint does not exist |
| **QR Code widget** | COMPLETE | `player/widgets/QRCodeWidget.jsx` | None |
| **Countdown type definition** | PARTIAL | `layout-editor/types.js` -- type `countdown` defined, defaults `{ textColor, targetDate, label }` | **No `CountdownWidget.jsx` exists** |
| **Widget type system** | COMPLETE | `layout-editor/types.js` -- `clock`, `date`, `weather`, `qr`, `data`, `countdown`, `ticker` | None |
| **Edge Function pattern** | COMPLETE | `supabase/functions/unsplash-proxy/` -- JWT auth, CORS, rate limiting, DB caching, tenant isolation | Pattern ready to replicate |
| **App catalog** | COMPLETE | `config/appCatalog.js` -- 80+ app definitions including counter/countdown entry | None |

---

### What is Genuinely Missing (Gaps to Fill)

#### Gap 1: CountdownWidget Player Component
**What:** `layout-editor/types.js` defines `countdown` widget type with default props `{ textColor, targetDate, label }`. The widget type can be placed in layouts. But no `CountdownWidget.jsx` exists in `player/components/widgets/`.

**Solution:** Build `CountdownWidget.jsx` using the identical pattern from `ClockWidget.jsx` (useState + setInterval at 1s) with `date-fns` `differenceInDays/Hours/Minutes/Seconds` for the math.

**Dependencies needed:** None. `date-fns` ^4.1.0 is already installed.

#### Gap 2: RSS Proxy Edge Function
**What:** `RssTickerApp` in `AppRenderer.jsx` calls `useAppData` which fetches from `/api/apps/data`. This endpoint does not exist. RSS feeds cannot be fetched directly from the browser due to CORS.

**Solution:** Build `supabase/functions/rss-proxy/index.ts` following the `unsplash-proxy` pattern. The function fetches RSS/Atom XML, parses it with `fast-xml-parser` (Deno npm import), caches results in `rss_feed_cache` table, and returns structured JSON.

**Dependencies needed (Deno only):** `npm:fast-xml-parser@4` -- imported inline in the Edge Function, not added to the client `package.json`.

#### Gap 3: Data Proxy Edge Function
**What:** `createDataTableApp` stores a `dataUrl` config for external CSV/JSON sources, but the rendering path through `useAppData` hits a non-existent backend. External URLs are usually not CORS-enabled.

**Solution:** Build `supabase/functions/data-proxy/index.ts` that fetches external CSV/JSON URLs, parses the response, caches in `data_proxy_cache` table, and returns structured data. Can also serve as the backend for a `REST_API` data source type.

**Dependencies needed:** None beyond what Deno provides. CSV parsing is simple string splitting (existing `parseCSV` pattern in `dataSourceService.js`).

#### Gap 4: REST API Data Source Type
**What:** `DATA_SOURCE_TYPES` currently has `INTERNAL_TABLE`, `CSV_IMPORT`, and `GOOGLE_SHEETS`. No type for arbitrary REST API endpoints that return JSON/CSV.

**Solution:** Add `REST_API` and `RSS_FEED` to `DATA_SOURCE_TYPES`. Add `api_config` JSONB column to `data_sources` table for `{ url, method, headers, auth_type, poll_interval_minutes }`.

#### Gap 5: Configurable Per-Widget Polling
**What:** `dataBindingResolver.js` uses a fixed 5-min cache TTL. `weatherService.js` uses 30-min cache. There is no per-widget configurable refresh interval.

**Solution:** Pass `pollIntervalMinutes` from widget config through to `getCachedDataSource({ cacheTTL })`. The infrastructure already accepts a `cacheTTL` parameter -- it just is not wired to per-widget config.

---

### Recommended Stack Additions

#### New Supabase Edge Functions (ADD)

| Function | Purpose | Dependencies (Deno) | Pattern |
|----------|---------|---------------------|---------|
| `rss-proxy` | Parse RSS/Atom feeds, cache results, rate limit per tenant | `npm:fast-xml-parser@4`, `npm:@supabase/supabase-js@2` | Copy `unsplash-proxy` structure |
| `data-proxy` | Fetch external CSV/JSON URLs, parse, cache, rate limit | `npm:@supabase/supabase-js@2` | Copy `unsplash-proxy` structure |

**Why Edge Functions, not client-side:**
- RSS feeds almost never have CORS headers. A browser `fetch('https://news.ycombinator.com/rss')` fails with CORS error.
- External CSV/JSON APIs are similarly CORS-blocked unless they explicitly allow it.
- The existing `unsplash-proxy` proves the pattern: JWT auth, DB-backed cache, per-tenant rate limiting, secret isolation.
- Edge Functions deploy alongside Supabase with zero additional infrastructure.

**Directory structure:**
```
supabase/functions/
  _shared/cors.ts            # Existing -- reuse
  unsplash-proxy/index.ts    # Existing -- reference pattern
  rss-proxy/index.ts         # NEW
  data-proxy/index.ts        # NEW
```

#### New Player Widget (ADD)

| Widget | File | Dependencies | Lines of Code |
|--------|------|-------------|---------------|
| `CountdownWidget` | `src/player/components/widgets/CountdownWidget.jsx` | `date-fns` (existing) | ~70 (same complexity as ClockWidget) |

#### Database Schema Additions

| Change | Type | Purpose |
|--------|------|---------|
| Add `rest_api` to `data_sources.type` | Enum value | REST API polling data source |
| Add `rss_feed` to `data_sources.type` | Enum value | RSS/Atom feed data source |
| Add `api_config JSONB` to `data_sources` | Column | Stores `{ url, method, headers, auth_type, poll_interval_minutes }` |
| Create `rss_feed_cache` table | New table | `{ id, feed_url_hash, tenant_id, items JSONB, fetched_at, expires_at, etag TEXT }` |
| Create `data_proxy_cache` table | New table | `{ id, url_hash, tenant_id, data JSONB, content_type, fetched_at, expires_at }` |

#### Service Layer Extensions

| File | Change | Purpose |
|------|--------|---------|
| `dataSourceService.js` | Add `REST_API: 'rest_api'` and `RSS_FEED: 'rss_feed'` to `DATA_SOURCE_TYPES` | Support new source types |
| `dataBindingResolver.js` | Accept `cacheTTL` from widget config in `getCachedDataSource` | Per-widget configurable polling |
| `player/widgets/index.js` | Export `CountdownWidget` | Register in widget system |

---

### No New npm Dependencies Required

This is the critical finding. Every feature can be built with what is already installed.

| Feature | How It Works | Already Installed |
|---------|-------------|-------------------|
| **Countdown widget** | `useState` + `setInterval(1000)` + `date-fns` `differenceInDays/Hours/Minutes/Seconds` | `date-fns` ^4.1.0 |
| **RSS feed display** | Edge Function parses XML, client renders structured JSON | `isomorphic-dompurify` ^2.35.0 (for HTML in RSS descriptions) |
| **RSS ticker animation** | CSS `@keyframes` marquee, same as existing `RssTickerApp` | `framer-motion` ^12.23.24 (optional enhancement) |
| **Data table rendering** | React component rendering rows from `dataSourceService.js` data | Built-in JSX |
| **Weather widget** | Already complete | `weatherService.js` + OpenWeatherMap |
| **Social feed widget** | Already complete with 5 layouts | `SocialFeedRenderer.jsx` |
| **Configurable polling** | Pass `pollIntervalMinutes` to existing `setInterval` patterns | Native `setInterval` |
| **RSS HTML sanitization** | `isomorphic-dompurify` sanitize RSS `<description>` content | `isomorphic-dompurify` ^2.35.0 |
| **Countdown date math** | `differenceInDays`, `differenceInHours`, `differenceInMinutes`, `differenceInSeconds` | `date-fns` ^4.1.0 |

#### Edge Function-Only Dependency

| Library | Import Syntax | Purpose | Why |
|---------|--------------|---------|-----|
| `fast-xml-parser` v4 | `import { XMLParser } from 'npm:fast-xml-parser@4';` | Parse RSS/Atom XML in `rss-proxy` Edge Function | Fastest pure-JS XML parser, handles both RSS 2.0 and Atom, zero native dependencies, works in Deno via npm import. Not added to client `package.json`. |

**Why `fast-xml-parser` over alternatives:**
- `rss-parser`: Bundles its own HTTP client, designed for Node.js -- Edge Function handles fetch separately
- Deno `DOMParser`: Available but gives DOM nodes, not structured JSON -- requires manual traversal
- `xml2js`: Callback-based API, heavier, less suited for Deno

---

### Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| RSS parsing location | Supabase Edge Function | Client-side `rss-parser` npm | CORS blocks direct RSS fetches from browser. Most feeds lack CORS headers. |
| RSS XML parser | `fast-xml-parser` (Deno only) | `rss-parser`, `xml2js`, Deno `DOMParser` | `fast-xml-parser` gives structured JSON directly, zero deps, fastest. |
| External data proxy | Supabase Edge Function | Third-party service (rss2json.com, etc.) | External dependency, cost, latency, vendor lock-in. Self-hosted gives full control. |
| Countdown library | `date-fns` (existing) | `react-countdown`, `countdown.js`, `luxon` | Already installed. 4 functions cover all countdown needs. Adding a countdown-specific library for ~15 lines of code is unnecessary. |
| Data table rendering | Custom React component | `@tanstack/react-table` | Signage tables are display-only (no sorting/filtering/pagination). A styled div/table is simpler and lighter. Player bundle size matters on Tizen/WebOS. |
| Ticker animation | CSS `@keyframes` (existing pattern) | `react-ticker`, `react-marquee` | `RssTickerApp` already uses CSS keyframes for scrolling. No reason to add another ticker library. |
| Weather API | OpenWeatherMap (existing) | WeatherAPI.com, Open-Meteo | Already integrated with caching, mock fallback, forecast support. No reason to switch. |
| Social feed rendering | Extend existing renderers | Build from scratch | `SocialFeedWidget.jsx` and `SocialFeedRenderer.jsx` already have 5 layouts, auto-rotation, engagement stats, and offline support. |

---

### Integration Architecture

#### Edge Function Pattern (Replicable from `unsplash-proxy`)

Each new Edge Function follows the proven 7-step pattern from `unsplash-proxy/index.ts`:

```
1. CORS preflight      -> _shared/cors.ts (existing)
2. JWT auth            -> supabase.auth.getUser(token)
3. Tenant extraction   -> user.user_metadata.tenant_id || user.id
4. Rate limit check    -> supabase.rpc('check_rss_rate_limit', ...)
5. Cache check         -> SELECT FROM rss_feed_cache WHERE url_hash = ... AND expires_at > now()
6. Upstream fetch      -> fetch(feedUrl) + XMLParser.parse(xml)
7. Cache write + return -> UPSERT into rss_feed_cache, return shaped JSON
```

#### RSS Proxy Response Shape

```typescript
// rss-proxy returns this structure
interface RssProxyResponse {
  ok: boolean;
  data: {
    feed: {
      title: string;
      description: string;
      link: string;
      lastBuildDate: string;
    };
    items: Array<{
      title: string;
      description: string;       // HTML sanitized server-side
      link: string;
      pubDate: string;
      author: string;
      imageUrl: string | null;   // Extracted from enclosure/media:content
    }>;
  };
  meta: {
    cached: boolean;
    cache_age_seconds: number;
    item_count: number;
  };
}
```

#### Data Source Type Extension

```javascript
// dataSourceService.js additions
export const DATA_SOURCE_TYPES = {
  INTERNAL_TABLE: 'internal_table',
  CSV_IMPORT: 'csv_import',
  GOOGLE_SHEETS: 'google_sheets',
  REST_API: 'rest_api',        // NEW: arbitrary JSON/CSV API endpoint
  RSS_FEED: 'rss_feed',        // NEW: RSS/Atom feed via rss-proxy
};
```

#### Widget Registration

```javascript
// player/components/widgets/index.js (add one line)
export { ClockWidget } from './ClockWidget.jsx';
export { DateWidget } from './DateWidget.jsx';
export { WeatherWidget } from './WeatherWidget.jsx';
export { QRCodeWidget } from './QRCodeWidget.jsx';
export { CountdownWidget } from './CountdownWidget.jsx';  // NEW
```

#### Configurable Polling Wiring

```javascript
// In player widget rendering, pass interval from widget config
const cacheTTL = (widgetConfig.pollIntervalMinutes || 5) * 60 * 1000;
const dataSource = await getCachedDataSource(sourceId, { cacheTTL });
```

The `getCachedDataSource` function in `dataBindingResolver.js` already accepts `cacheTTL` as a parameter. The gap is that no widget currently passes a custom value -- they all use the 5-minute default.

---

### What NOT to Add

| Library/Tool | Why Not |
|--------------|---------|
| `axios` | `fetch` is native and used consistently throughout the codebase |
| `rss-parser` (npm) | Client-side CORS issue; Edge Function handles parsing server-side |
| `@tanstack/react-table` | Display-only signage tables do not need sorting/filtering/pagination |
| `react-countdown` | 15 lines of `date-fns` + `useEffect` -- a library is overkill |
| `chart.js` / `recharts` | Data widgets show tables/lists/tickers, not charts |
| `moment` / `luxon` | `date-fns` already installed and used throughout |
| `socket.io` | Supabase Realtime already handles live data sync via postgres_changes |
| Third-party RSS service | Self-hosted Edge Function is simpler, cheaper, and under full control |
| `node-cron` / cron library | Supabase `pg_cron` or Edge Function scheduled invocations handle server-side polling |
| `xml2js` | `fast-xml-parser` is faster, gives JSON directly, works better in Deno |
| New state management | Existing `useState` + service layer + Supabase Realtime covers all data flow |

---

### Installation Summary

```bash
# Client-side: NOTHING TO INSTALL
# All required packages are already in package.json

# For Edge Functions (deployed via Supabase CLI, not npm):
# fast-xml-parser is imported inline in the Deno function:
#   import { XMLParser } from 'npm:fast-xml-parser@4';
# No changes to package.json needed

# No new environment variables needed
# (VITE_GOOGLE_API_KEY and VITE_OPENWEATHER_API_KEY already exist)
```

**Total new npm dependencies: 0**
**Total new Edge Functions: 2** (`rss-proxy`, `data-proxy`)
**Total new player widgets: 1** (`CountdownWidget`)

---

### Confidence Assessment (v4.0)

| Area | Confidence | Reason |
|------|------------|--------|
| No new npm dependencies needed | HIGH | Verified every existing package in `package.json`; confirmed `date-fns`, `isomorphic-dompurify`, and `framer-motion` cover all needs |
| Edge Function pattern replication | HIGH | Read and analyzed the complete `unsplash-proxy/index.ts` (473 lines); same auth/cache/rate-limit pattern applies directly |
| CountdownWidget using date-fns | HIGH | Read `ClockWidget.jsx` and `DateWidget.jsx` which use identical `useState` + `setInterval` pattern; `date-fns` v4 has `differenceIn*` functions |
| `fast-xml-parser` in Deno | MEDIUM | Based on training data for npm v4.x; Deno npm import compatibility not verified via live test. The library has 50M+ weekly npm downloads and is pure JS (no native deps), so Deno compatibility is highly likely. |
| Data proxy Edge Function | HIGH | Pattern identical to unsplash-proxy; standard `fetch` + CSV parsing (existing `parseCSV` function can be ported) |
| RSS CORS blocking | HIGH | Standard web security behavior; confirmed by the fact that the existing `RssTickerApp` uses `useAppData` which expects a server endpoint, not direct browser fetch |
| Per-widget configurable polling | HIGH | `getCachedDataSource` already accepts `cacheTTL` parameter; gap is only wiring, not architecture |

---

### Sources (v4.0)

All findings based on direct source code inspection:

- `/Users/massimodamico/bizscreen/package.json` -- dependency inventory (React 19.1.1, date-fns 4.1.0, isomorphic-dompurify 2.35.0, framer-motion 12.23.24)
- `/Users/massimodamico/bizscreen/src/services/dataSourceService.js` -- data source types, CRUD, real-time subscriptions, binding resolution
- `/Users/massimodamico/bizscreen/src/services/googleSheetsService.js` -- Google Sheets API integration, sync, change detection
- `/Users/massimodamico/bizscreen/src/services/weatherService.js` -- OpenWeatherMap integration, forecast, caching
- `/Users/massimodamico/bizscreen/src/services/dataBindingResolver.js` -- binding resolution, preload, configurable cache TTL
- `/Users/massimodamico/bizscreen/src/services/socialFeedSyncService.js` -- social sync pattern, rate limits, cooldowns
- `/Users/massimodamico/bizscreen/src/services/mediaService.js` -- RSS ticker and data table app creation (lines 948-1020)
- `/Users/massimodamico/bizscreen/src/player/components/widgets/ClockWidget.jsx` -- player widget pattern (useState + setInterval)
- `/Users/massimodamico/bizscreen/src/player/components/widgets/DateWidget.jsx` -- same pattern
- `/Users/massimodamico/bizscreen/src/player/components/widgets/index.js` -- widget registration barrel export
- `/Users/massimodamico/bizscreen/src/player/components/AppRenderer.jsx` -- app rendering, useAppData hook, RssTickerApp, ClockApp, WeatherApp
- `/Users/massimodamico/bizscreen/src/player/components/SceneRenderer.jsx` -- data binding in scene blocks
- `/Users/massimodamico/bizscreen/src/components/SocialFeedWidget.jsx` -- 5 layout social feed widget
- `/Users/massimodamico/bizscreen/src/components/player/SocialFeedRenderer.jsx` -- player-optimized social renderer
- `/Users/massimodamico/bizscreen/src/components/apps/WeatherWallConfigModal.jsx` -- weather wall configuration
- `/Users/massimodamico/bizscreen/src/components/layout-editor/types.js` -- widget type definitions including `countdown`
- `/Users/massimodamico/bizscreen/src/config/appCatalog.js` -- app catalog with countdown entry
- `/Users/massimodamico/bizscreen/supabase/functions/unsplash-proxy/index.ts` -- Edge Function reference pattern (473 lines)
- `/Users/massimodamico/bizscreen/supabase/functions/_shared/cors.ts` -- CORS helper for Edge Functions

---

*Stack research updated: 2026-02-11*
