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

### Executive Summary

v2 features require minimal stack additions. The existing foundation (date-fns v4.1.0, lodash, React 19, Tailwind) handles most needs. Key additions:

1. **Timezone handling** - `@date-fns/tz` for DST-aware scheduling
2. **Star ratings** - `@smastrom/react-rating` for template reviews
3. **Calendar visualization** - Custom build recommended over third-party (React 19 compatibility issues with major libraries)

**Philosophy:** Prefer extending existing patterns over adding new dependencies. BizScreen already has sophisticated services; v2 should leverage them.

---

### Templates Marketplace Stack

#### Star Ratings Component

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| [@smastrom/react-rating](https://github.com/smastrom/react-rating) | 1.5.0 | Template ratings UI | HIGH |

**Why this library:**
- Zero dependencies (keeps bundle small)
- 7,000+ weekly downloads, actively maintained
- Supports half-star ratings with smart fill
- RTL support (important for future i18n expansion)
- SSR compatible
- Works with React Hook Form if needed
- Simple DOM structure, customizable via any SVG

**Alternative considered:** Building custom with Lucide icons (already installed). However, `@smastrom/react-rating` provides accessibility (ARIA), keyboard navigation, and half-star precision that would take effort to replicate.

**Installation:**
```bash
npm install @smastrom/react-rating
```

**Usage pattern:**
```javascript
import { Rating } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';

// Display rating
<Rating value={template.avg_rating} readOnly />

// Input rating
<Rating
  value={userRating}
  onChange={setUserRating}
  halfFillMode="svg"
/>
```

#### Template Preview/Rendering

**No new library needed.** Existing infrastructure handles this:
- `thumbnail_url` field stores preview images
- Polotno editor already renders scene previews
- Existing `html2canvas` can generate thumbnails if needed

---

### Multi-Language Content Stack

#### Content Translation Approach

**No new library needed for translation storage/retrieval.** The architecture uses JSON overlay pattern:

```javascript
// Translation stored as JSON path overrides
{
  "blocks.0.props.text": "Bienvenido",
  "blocks.1.props.text": "Menu del dia"
}
```

**For JSON path operations, use existing lodash:**
```javascript
import { get, set, cloneDeep } from 'lodash';

function mergeTranslations(designJson, translations) {
  if (!translations) return designJson;

  const merged = cloneDeep(designJson);
  for (const [path, value] of Object.entries(translations)) {
    set(merged, path, value);
  }
  return merged;
}

// Usage
const localizedDesign = mergeTranslations(
  slide.design_json,
  slide.translations?.es
);
```

**Why NOT add a dedicated i18n library for content:**
- Content translations are different from UI translations
- UI i18n (react-i18next pattern) already exists for admin interface
- Content translations are per-scene, not per-app
- JSON overlay pattern is simpler and fits existing Polotno design_json structure

#### UI Locale Picker Component

**No new library needed.** Build with existing Tailwind + Lucide:
```javascript
// LocaleSwitcher.jsx using existing patterns
import { Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '../i18n/i18nConfig';

// Dropdown using existing UI patterns from the codebase
```

---

### Advanced Scheduling Stack

#### Timezone/DST Handling

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| [@date-fns/tz](https://github.com/date-fns/tz) | 1.2.0 | Timezone-aware date operations | HIGH |

**Critical for v2:** PITFALLS.md identifies DST handling as a critical issue. The existing `date-fns` v4.1.0 works with `@date-fns/tz` for timezone support.

**Why @date-fns/tz:**
- Official date-fns companion package
- Only 1.2 kB (TZDate) or 916 B (TZDateMini)
- Uses IANA timezone database via Intl API (no bundled timezone data)
- Handles DST transitions correctly
- Already compatible with installed date-fns v4.1.0

**Installation:**
```bash
npm install @date-fns/tz
```

**Usage for schedule resolution:**
```javascript
import { TZDate } from '@date-fns/tz';
import { isWithinInterval, format } from 'date-fns';

// Create timezone-aware date for device's timezone
const deviceNow = new TZDate(new Date(), device.timezone || 'UTC');

// Check if schedule entry is active (DST-aware)
function isScheduleActive(entry, deviceTimezone) {
  const now = new TZDate(new Date(), deviceTimezone);
  const startTime = new TZDate(
    `${format(now, 'yyyy-MM-dd')}T${entry.start_time}`,
    deviceTimezone
  );
  const endTime = new TZDate(
    `${format(now, 'yyyy-MM-dd')}T${entry.end_time}`,
    deviceTimezone
  );

  return isWithinInterval(now, { start: startTime, end: endTime });
}
```

**DST transition handling:**
```javascript
import { tzScan } from '@date-fns/tz';

// Find DST transitions in a date range (for schedule validation warnings)
const dstTransitions = tzScan('America/New_York', {
  start: campaign.start_date,
  end: campaign.end_date
});

if (dstTransitions.length > 0) {
  log.warn('Campaign spans DST transition', {
    campaign: campaign.id,
    transitions: dstTransitions
  });
}
```

#### Calendar/Timeline Visualization

**Recommendation: Build custom with existing stack.**

| Approach | Recommendation | Confidence |
|----------|----------------|------------|
| Full calendar library | **Avoid** | HIGH |
| Custom week grid | **Recommended** | HIGH |

**Why NOT use FullCalendar or react-big-calendar:**
- **react-big-calendar has React 19 compatibility issues** ([GitHub Issue #2701](https://github.com/jquense/react-big-calendar/issues/2701))
- Navigation buttons and view controls reported broken with React 19.0.0
- FullCalendar v6 bundles Preact internally, adding complexity
- BizScreen already has `getWeekPreview()` function returning schedule data
- Custom implementation gives full control over UX

**Custom week grid approach:**
```javascript
// Components to build (using existing Tailwind patterns)
// src/components/scheduling/
//   WeekGrid.jsx        - 7-day x 24-hour grid
//   TimeSlot.jsx        - Individual hour cell
//   ScheduleEntry.jsx   - Positioned content block
//   DayColumn.jsx       - Single day column

// Data flow
const weekData = await scheduleService.getWeekPreview(scheduleId, startDate);
// weekData already structured for display
```

**If calendar library absolutely needed:** Consider [Planby](https://planby.app/) (designed for TV guide schedules, aligns with digital signage use case) but verify React 19 compatibility first.

---

### What NOT to Add (and Why)

| Library | Why NOT |
|---------|---------|
| **react-i18next** (for content) | Already have i18n for UI; content translations use different pattern (JSON overlays) |
| **react-big-calendar** | React 19 compatibility issues; custom build preferred |
| **moment.js / moment-timezone** | date-fns v4 + @date-fns/tz is modern, smaller alternative |
| **Additional logging library** | loggingService.js already production-ready |
| **Additional retry library** | fetch-retry + p-retry already installed from v1 |
| **Translation management platform SDK** | Overkill for content translations; simple DB tables suffice |
| **deepmerge library** | lodash.set/cloneDeep handles JSON overlay merging |

---

### v2 Installation Summary

```bash
# New dependencies for v2
npm install @date-fns/tz @smastrom/react-rating
```

**Total new dependencies: 2**

Both are lightweight:
- `@date-fns/tz`: ~1.2 kB
- `@smastrom/react-rating`: ~3 kB (zero dependencies)

---

### v2 Stack Integration Points

| v2 Feature | Integrates With | How |
|------------|-----------------|-----|
| Template ratings | existing `marketplaceService.js` | Add rating CRUD methods |
| Template preview | existing Polotno editor | Reuse scene rendering |
| Content translations | existing `design_json` structure | JSON overlay pattern |
| Locale picker | existing `i18nConfig.js` | Reuse locale definitions |
| Timezone handling | existing `schedules.timezone` column | Use @date-fns/tz for calculations |
| Week preview | existing `getWeekPreview()` | Enhance with campaign data |
| Campaign calendar | existing Tailwind + React patterns | Custom grid component |

---

### Version Verification (v2)

| Library | Version | Verified | Source |
|---------|---------|----------|--------|
| @date-fns/tz | 1.2.0 | 2026-01-24 | [GitHub](https://github.com/date-fns/tz), [date-fns v4 announcement](https://blog.date-fns.org/v40-with-time-zone-support/) |
| @smastrom/react-rating | 1.5.0 | 2026-01-24 | [GitHub](https://github.com/smastrom/react-rating), [npm](https://www.npmjs.com/package/@smastrom/react-rating) |
| date-fns (existing) | 4.1.0 | Already installed | package.json |
| lodash (implicit via lodash.throttle/debounce) | 4.17.21 | Already available | package.json patterns |

---

### Confidence Assessment (v2)

| Area | Confidence | Reason |
|------|------------|--------|
| @date-fns/tz | HIGH | Official date-fns package, verified v4 compatibility, documented DST handling |
| @smastrom/react-rating | HIGH | Zero dependencies, active maintenance, 7k+ weekly downloads |
| Custom calendar approach | HIGH | Avoids React 19 compatibility issues, leverages existing patterns |
| JSON overlay translations | MEDIUM | Pattern is sound but player merge logic needs testing |
| Avoiding additional libraries | HIGH | Existing stack covers most needs |

---

### Sources (v2)

**Timezone Handling:**
- [date-fns v4 with Time Zone Support](https://blog.date-fns.org/v40-with-time-zone-support/) - Official announcement
- [@date-fns/tz GitHub](https://github.com/date-fns/tz) - Package documentation
- [Working with Timezones using date-fns](https://masteringjs.io/tutorials/date-fns/tz) - Implementation guide

**Star Ratings:**
- [@smastrom/react-rating GitHub](https://github.com/smastrom/react-rating) - Zero-dependency React rating component
- [npm package](https://www.npmjs.com/package/@smastrom/react-rating) - 7,179 weekly downloads

**Calendar Libraries (evaluated):**
- [react-big-calendar React 19 Issue](https://github.com/jquense/react-big-calendar/issues/2701) - Compatibility problems
- [FullCalendar React Docs](https://fullcalendar.io/docs/react) - v6.1.20 uses internal Preact
- [Planby](https://planby.app/) - TV guide/schedule focused alternative
- [Best React Scheduler Libraries](https://blog.logrocket.com/best-react-scheduler-component-libraries/) - Overview

**Translation Patterns:**
- [JSON path manipulation with lodash](https://lodash.com/docs/#set) - set/get for nested paths
- [i18next principles](https://www.i18next.com/principles/fallback) - Fallback patterns (applied to content)
