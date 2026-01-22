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
