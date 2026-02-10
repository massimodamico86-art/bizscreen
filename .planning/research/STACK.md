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

---

## v2.2 Stack: Unified Onboarding Flow

**Researched:** 2026-01-28
**Focus:** Stack additions for polished onboarding UX

### Executive Summary

**Recommendation: ZERO NEW DEPENDENCIES REQUIRED**

BizScreen already has robust infrastructure for onboarding UX. The existing stack (React 19, Framer Motion 12.23.24, custom Modal system, Tailwind) provides everything needed. The challenge is architectural unification, not missing libraries.

**Key insight:** You have 4 separate onboarding components that each solve parts of the problem. The solution is consolidation and enhancement, not new libraries.

---

### Existing Infrastructure Analysis

#### Already Have - Animations
| Capability | Current Solution | Why Sufficient |
|------------|------------------|----------------|
| Step transitions | Framer Motion `AnimatePresence` | Already used in WelcomeTour, WelcomeTourStep |
| Progress indicators | Custom CSS with Tailwind | Progress bars in OnboardingWizard, WelcomeTour |
| Modal animations | Design system `Modal` with Framer Motion | Full animation suite in `motion.js` |

#### Already Have - UI Components
| Capability | Current Solution | Location |
|------------|------------------|----------|
| Modal system | `Modal`, `ModalHeader`, `ModalContent`, `ModalFooter` | `src/design-system/components/Modal.jsx` |
| Buttons with loading | `Button` with `loading` prop | `src/design-system/components/Button.jsx` |
| Step indicators | Custom dot navigation | `WelcomeTour.jsx` lines 223-243 |
| Business type selection | Grid with icons | `WelcomeModal.jsx`, `AutoBuildOnboardingModal.jsx` |
| Progress tracking | `onboardingService.js` | Full CRUD for step completion |

#### Already Have - Onboarding Logic
| Capability | Current Solution | Status |
|------------|------------------|--------|
| Progress persistence | Supabase RPC functions | `get_onboarding_progress`, `update_onboarding_step` |
| Skip functionality | `skipOnboarding()`, `skipWelcomeTour()` | Working |
| Step completion detection | `syncOnboardingProgress()` | Auto-detects from created resources |
| Welcome tour state | `get_welcome_tour_progress` RPC | Tracks current step, completion |

---

### Why No Tour Library Needed

Tour libraries (react-joyride, shepherd.js, driver.js) solve a different problem: **highlighting existing UI elements** and walking users through an existing interface.

BizScreen's onboarding is fundamentally different:
1. **Modal-based wizard flow** - Users are IN the onboarding, not touring an interface
2. **Action-driven** - Each step requires user action (select template, pair screen)
3. **Content creation** - Users create content during onboarding, not just learn the UI

Tour libraries would add complexity without value. The existing modal + step indicator pattern is exactly right.

---

### Why No Stepper Library Needed

Stepper libraries (react-step-wizard, react-form-stepper) would add:
- Heavyweight dependencies
- Opinionated styling that conflicts with Tailwind
- Features you already have (progress, navigation, validation)

Your existing step indicator pattern in WelcomeTour is cleaner and more customizable.

---

### v2.2 Required Additions

**NONE** - Existing stack is sufficient.

---

### v2.2 Optional Enhancements (LOW PRIORITY)

These are "nice to have" if time permits, not blockers.

#### 1. Confetti for Completion Celebration

| Library | Size | Purpose |
|---------|------|---------|
| `canvas-confetti` | ~2.4KB gzipped | Celebratory moment when user successfully pairs first screen |

**Use case:** Final step of unified onboarding after screen verification.

**Confidence:** MEDIUM (version from training data, needs npm verification)

**Why optional:** The green checkmark success state already works. Confetti is polish, not functionality.

#### 2. Lottie Animations for Loading States

| Library | Size | Purpose |
|---------|------|---------|
| `lottie-react` | ~3KB + animation files | Custom BizScreen-branded loading animations |

**Use case:** Replace the Loader2 spinner with custom animations during content creation and screen pairing.

**Confidence:** MEDIUM (version from training data, needs npm verification)

**Why optional:** The current Tailwind `animate-spin` on Loader2 icons is sufficient. Lottie is brand polish, not UX improvement.

---

### v2.2 Architecture Recommendations

Instead of new dependencies, invest in these architectural changes:

#### 1. Create UnifiedOnboardingFlow Component

Consolidate these 4 components:
- `WelcomeModal.jsx` (choice step, business type, creating step)
- `WelcomeTour.jsx` (6-step feature tour)
- `OnboardingWizard.jsx` (step-by-step wizard)
- `AutoBuildOnboardingModal.jsx` (AI-powered auto-build)

Into one coherent flow with configurable paths:
- Quick Demo path
- Business Starter Pack path
- Manual creation path

#### 2. Add Stepper Design System Component

Create a reusable `Stepper` component in the design system:

```jsx
// Proposed: src/design-system/components/Stepper.jsx
export function Stepper({
  steps,
  currentStep,
  onStepClick,
  variant = 'dots' // 'dots' | 'numbered' | 'progress'
}) {
  // Implementation...
}
```

This extracts the step indicator pattern from WelcomeTour into a reusable component.

#### 3. Screen Pairing UX Component

Create a dedicated `ScreenPairingFlow` component that handles:
- QR code display
- OTP code entry
- Realtime pairing status (via Supabase realtime)
- Success confirmation with content preview

This already exists in pieces; consolidate and polish.

---

### What NOT to Add for v2.2

| Library | Why Skip |
|---------|----------|
| `react-joyride` | Solves UI tours, not wizard flows |
| `shepherd.js` | Same - UI highlighting, not action-driven onboarding |
| `driver.js` | Same - spotlight/highlight patterns, not modal wizards |
| `react-step-wizard` | Already have equivalent patterns |
| `formik` / `react-hook-form` | Onboarding has minimal form inputs |
| `zod` / `yup` | No complex validation needed |
| `framer-motion` | Already installed (v12.23.24) |

---

### v2.2 Installation Summary

```bash
# REQUIRED: Nothing
# No new dependencies needed

# OPTIONAL (if celebrating completion):
npm install canvas-confetti

# OPTIONAL (if custom loading animations):
npm install lottie-react
```

**Total new dependencies: 0 (required) / 1-2 (optional polish)**

---

### v2.2 Focus Areas

1. **Consolidate 4 onboarding components into 1 unified flow**
2. **Extract `Stepper` component to design system**
3. **Polish screen pairing UX with realtime feedback**
4. **Add progress persistence across the unified flow**

---

### v2.2 Confidence Assessment

| Finding | Confidence | Reason |
|---------|------------|--------|
| No tour library needed | HIGH | Analyzed existing code, understood the UX pattern |
| No stepper library needed | HIGH | Existing patterns in WelcomeTour are sufficient |
| Framer Motion sufficient | HIGH | Already in use, verified in package.json (v12.23.24) |
| canvas-confetti version | MEDIUM | Training data, needs npm verification |
| lottie-react version | MEDIUM | Training data, needs npm verification |

---

### v2.2 Sources

- `/Users/massimodamico/bizscreen/package.json` - Current dependencies
- `/Users/massimodamico/bizscreen/src/components/onboarding/WelcomeTour.jsx` - Existing tour implementation
- `/Users/massimodamico/bizscreen/src/pages/dashboard/WelcomeModal.jsx` - Existing modal flow
- `/Users/massimodamico/bizscreen/src/components/OnboardingWizard.jsx` - Existing wizard
- `/Users/massimodamico/bizscreen/src/components/onboarding/AutoBuildOnboardingModal.jsx` - Auto-build flow
- `/Users/massimodamico/bizscreen/src/services/onboardingService.js` - Progress tracking
- `/Users/massimodamico/bizscreen/src/design-system/index.js` - Available components

---

## v3.0 Stack: Premium Template Browsing, Editor Polish, Stock Assets

**Researched:** 2026-02-10
**Focus:** Animation upgrades, Unsplash API integration, icon packs in Polotno editor, image optimization for template gallery

### Executive Summary

**Recommendation: ZERO NEW npm DEPENDENCIES REQUIRED. One API key needed.**

BizScreen's existing stack is remarkably well-suited for v3.0. The key finding: Framer Motion (already installed at ^12.23.24, latest is 12.34.0), Lucide React (already installed at ^0.548.0, latest is 0.563.0), Polotno SDK's built-in `ImagesGrid`/`useInfiniteAPI` utilities, and native browser APIs (`IntersectionObserver`, `loading="lazy"`) cover every v3.0 requirement without adding a single new npm package.

The only external addition is an **Unsplash API key** (free tier: 50 req/hr demo, 5000 req/hr production) and a thin service wrapper using native `fetch`.

**Key insight:** The "premium feel" comes from **better use of existing tools**, not new libraries. BizScreen already has `motion.js` with 15+ animation presets, `staggerContainer`/`staggerItem` for grid animations, and `AnimatePresence` for transitions -- but the template grid currently uses zero Framer Motion. The upgrade is architectural, not dependency-driven.

---

### What Already Exists (Verified in Codebase)

| Capability | Current State | v3.0 Role |
|------------|---------------|-----------|
| **Framer Motion** ^12.23.24 | 16 files using it; `motion.js` has fadeIn, slideUp, staggerContainer, scaleHover, drawer, etc. | Animate template cards, grid stagger, preview panel transitions, hover micro-interactions |
| **Lucide React** ^0.548.0 | 238 files, 241 imports | 1500+ tree-shakable icons already available for in-editor icon panel |
| **Polotno SDK** ^2.33.2 | iframe-isolated editor with `DEFAULT_SECTIONS` (templates, photos, text, elements, upload, background, layers, size) | Built-in `ImagesGrid`, `useInfiniteAPI`, `SectionTab` for custom Unsplash/icon panels |
| **OptimizedImage** component | `loading="lazy"`, blur placeholder, error fallback | Template thumbnail lazy loading |
| **Tailwind CSS** ^3.4.18 | Full utility framework | `transition-*`, `animate-*`, `hover:*` for CSS-level animations |
| **canvas-confetti** ^1.9.4 | Already installed | Celebration effects for template apply success |
| **Design system motion.js** | 15+ presets: fadeIn, fadeInScale, slideUp, slideDown, scaleTap, scaleHover, modal, dropdown, drawer, pageTransition, staggerContainer, staggerItem, cssTransitions | All micro-interaction primitives needed |

---

### 1. Animations & Micro-Interactions

#### Recommendation: Extend existing `motion.js` presets (NO new library)

**Why Framer Motion ^12.23.24 is sufficient:**
- Layout animations with `layout` prop (GPU-accelerated via CSS transforms)
- `AnimatePresence` for mount/unmount transitions (already used in 16 files)
- `useInView` hook wraps IntersectionObserver (0.6KB, scroll-triggered animations)
- `staggerChildren` for grid cascade effects
- `whileHover`/`whileTap` for card micro-interactions
- Shared layout animations via `layoutId` for template-to-editor morph effects

**Current gap:** The template grid (`TemplateGrid.jsx`) and cards (`TemplateCard`) use zero Framer Motion -- only plain CSS `transition-shadow hover:shadow-md`. This is where the "premium" upgrade lives.

**New presets to add to `motion.js`:**

```javascript
// === v3.0 ADDITIONS TO motion.js ===

/** Template card entrance with stagger */
export const templateGrid = {
  container: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  },
  item: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.3, ease: easing.easeOut },
  },
};

/** Card hover with lift and shadow */
export const cardLift = {
  whileHover: { y: -4, scale: 1.02, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' },
  whileTap: { scale: 0.98 },
  transition: { duration: duration.fast, ease: easing.smooth },
};

/** Image reveal on load (blur-to-sharp) */
export const imageReveal = {
  initial: { opacity: 0, filter: 'blur(8px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  transition: { duration: 0.4, ease: easing.smooth },
};

/** Scroll-triggered section entrance */
export const scrollReveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: easing.easeOut },
};
```

**Confidence:** HIGH -- all primitives verified as existing in Framer Motion 12.x via [Motion docs](https://motion.dev/docs/react-motion-component) and [layout animation docs](https://www.framer.com/motion/layout-animations/).

---

### 2. Stock Photo Integration (Unsplash)

#### Recommendation: Direct `fetch` to Unsplash API + Polotno custom side panel (NO npm package)

**Why NOT use `unsplash-js`:** The official JavaScript wrapper has been **archived** and no longer receives updates. Unsplash recommends direct API calls.

**Why direct `fetch` is better:**
- Zero dependencies (native browser API)
- Full control over caching, error handling, rate limiting
- Simple REST API with `Authorization: Client-ID {key}` header
- Already have debounce utilities for search throttling

**Unsplash API details (verified via [official docs](https://unsplash.com/documentation)):**
- Base URL: `https://api.unsplash.com/`
- Search: `GET /search/photos?query={term}&per_page=30`
- Curated: `GET /photos?per_page=30`
- Auth: `Authorization: Client-ID YOUR_ACCESS_KEY` header
- Rate limits: 50 req/hr (demo), 5000 req/hr (production)
- **Image requests to `images.unsplash.com` do NOT count against rate limits**
- Attribution required: photographer name + Unsplash link with UTM params
- Must call `GET /photos/:id/download` on use (API guideline requirement)

**Integration architecture -- TWO paths:**

**Path A: In the main app (Template Marketplace page)**
```javascript
// src/services/unsplashService.js
const UNSPLASH_BASE = 'https://api.unsplash.com';
const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

export async function searchPhotos(query, page = 1, perPage = 30) {
  const res = await fetch(
    `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
    { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
  );
  if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);
  return res.json(); // { results: [...], total, total_pages }
}

export async function trackDownload(photoId) {
  // Required by Unsplash API guidelines
  await fetch(`${UNSPLASH_BASE}/photos/${photoId}/download`, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
}
```

**Path B: In the Polotno editor iframe (custom side panel section)**

The Polotno editor runs in a separate iframe with React 18. Stock photos should be added as a **custom side panel section** using Polotno's built-in utilities:

```javascript
// Inside polotno-build/src/polotno-editor.jsx
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { getImageSize } from 'polotno/utils/image';

const UnsplashPanel = observer(({ store }) => {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const searchPhotos = async (q) => {
    setLoading(true);
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=30`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    const data = await res.json();
    setImages(data.results);
    setLoading(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <input
        placeholder="Search Unsplash..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && searchPhotos(query)}
      />
      <ImagesGrid
        images={images}
        getPreview={(img) => img.urls.small}
        onSelect={async (img, pos) => {
          // Track download per Unsplash guidelines
          await fetch(`https://api.unsplash.com/photos/${img.id}/download`, {
            headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
          });
          const size = await getImageSize(img.urls.regular);
          store.activePage?.addElement({
            type: 'image',
            src: img.urls.regular,
            width: size.width,
            height: size.height,
            x: pos?.x || 0,
            y: pos?.y || 0,
          });
        }}
        isLoading={loading}
        rowsNumber={2}
        getCredit={(img) => `Photo by ${img.user.name}`}
      />
    </div>
  );
});

export const UnsplashSection = {
  name: 'unsplash',
  Tab: (props) => (
    <SectionTab name="Stock Photos" {...props}>
      {/* Camera icon SVG */}
    </SectionTab>
  ),
  Panel: UnsplashPanel,
};
```

Then replace or extend `DEFAULT_SECTIONS` in the editor initialization:
```javascript
const sections = [...DEFAULT_SECTIONS, UnsplashSection];
// Pass to <SidePanel store={store} sections={sections} />
```

**Required env variable:**
```bash
# .env
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

**Unsplash vs Pexels decision:**
Use **Unsplash** because:
- 3M+ photos vs Pexels' 1M+ (larger library for visual design)
- Higher aesthetic quality (curated by photographers)
- Polotno's built-in "photos" section already uses Pexels internally -- adding Unsplash gives users a second, complementary source
- No attribution required for the photos themselves (only link back to photographer on Unsplash)
- Free for commercial use

**Confidence:** HIGH -- Unsplash API verified via [official documentation](https://unsplash.com/documentation), Polotno custom panel API verified via [Polotno docs](https://polotno.com/docs/custom-images-panel).

---

### 3. Icon Integration in Editor

#### Recommendation: Expose Lucide icons through Polotno custom side panel (NO new library)

**Why Lucide (already installed ^0.548.0) is sufficient:**
- 1500+ icons, tree-shakable (each ~1KB SVG)
- Updated to 0.563.0 (latest as of 2026-02-10), but ^0.548.0 already has extensive coverage
- Consistent 24x24 grid, stroke-based design
- Perfect for digital signage (clean, readable at distance)

**Implementation approach:** Rather than importing Lucide into the Polotno iframe (which would bloat the iframe bundle), generate SVG strings from a curated subset and serve them as a JSON manifest that the Polotno editor's custom panel fetches.

```javascript
// scripts/generate-icon-manifest.cjs (build-time script)
// Generates a JSON file mapping icon names to SVG strings
// Output: public/polotno/icons-manifest.json

// Then in polotno-editor.jsx:
const IconsPanel = observer(({ store }) => {
  const [icons, setIcons] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/polotno/icons-manifest.json')
      .then(r => r.json())
      .then(setIcons);
  }, []);

  const filtered = icons.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input placeholder="Search icons..." value={search}
        onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {filtered.map(icon => (
          <button key={icon.name} onClick={() => {
            store.activePage?.addElement({
              type: 'svg',
              src: `data:image/svg+xml,${encodeURIComponent(icon.svg)}`,
              width: 100, height: 100,
            });
          }}>
            <div dangerouslySetInnerHTML={{ __html: icon.svg }} />
          </button>
        ))}
      </div>
    </div>
  );
});
```

**Alternative considered: icon packs like `react-icons` or `iconify`:**
- `react-icons` bundles ALL icon sets (~400KB uncompressed) -- massive bloat
- `iconify` requires runtime API calls to their CDN -- latency + dependency on external service
- Lucide's curated set is already the right aesthetic for BizScreen

**Confidence:** HIGH -- Lucide's SVG output verified in codebase (238 files using it). Polotno's SVG element support verified in `polotno-editor.jsx` (uses `addElement` with type: 'image').

---

### 4. Image Optimization & Lazy Loading

#### Recommendation: Enhance existing `OptimizedImage` component + Framer Motion `useInView` (NO new library)

**Current state:** `OptimizedImage.jsx` already has:
- `loading="lazy"` (native browser lazy loading)
- Blur placeholder while loading (CSS `animate-pulse`)
- Error fallback to Unsplash default image
- Opacity transition on load

**What to add for v3.0:**

1. **Framer Motion `useInView`** for scroll-triggered animation (0.6KB, built into framer-motion):
```javascript
import { useInView } from 'framer-motion';

function TemplateCard({ template }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* card content */}
    </motion.div>
  );
}
```

2. **CloudFront image resizing** via URL parameters (already have CloudFront CDN):
```javascript
// Append resize params to CloudFront URLs for template thumbnails
function getThumbnailUrl(originalUrl, width = 400) {
  if (originalUrl?.includes('cloudfront.net')) {
    return `${originalUrl}?w=${width}&q=80&f=webp`;
  }
  return originalUrl;
}
```

3. **Unsplash built-in image sizing** (URL-based, zero cost):
```javascript
// Unsplash images support URL-based resizing
// img.urls.small = 400px wide
// img.urls.regular = 1080px wide
// img.urls.thumb = 200px wide
// Use `small` for grid, `regular` for preview panel, `thumb` for search results
```

**Why NOT add a dedicated image optimization library:**
- `next/image` requires Next.js
- `react-lazy-load-image-component` adds 15KB for functionality already in browser (`loading="lazy"`)
- `blurhash` adds complexity; CSS `animate-pulse` placeholder is visually adequate
- Framer Motion's `useInView` is already bundled (0.6KB overhead, already paying for full library)

**Why NOT add virtual scrolling (react-virtuoso / @tanstack/react-virtual):**
- Template grids typically show 20-50 items per page with pagination
- Virtual scrolling adds complexity for grids (variable row heights, image loading)
- Native `loading="lazy"` handles off-screen images efficiently
- If the grid ever reaches 500+ items, revisit with `@tanstack/react-virtual` then

**Confidence:** HIGH -- `useInView` verified at [motion.dev/docs/react-use-in-view](https://motion.dev/docs/react-use-in-view). Native `loading="lazy"` [supported in all modern browsers](https://caniuse.com/loading-lazy-attr).

---

### 5. Editor UI Polish (Wrapper Layer)

#### Recommendation: Enhance `EditorModal.jsx` with existing design system (NO new library)

The Polotno editor runs in an iframe -- we cannot style its internals. But we control:
- **EditorModal.jsx** wrapper (loading states, transitions, toolbar)
- **PolotnoEditor.jsx** container (iframe communication)
- **PostSaveDialog.jsx** (save success flow)

**Polish opportunities using existing stack:**

| Area | Current | v3.0 Enhancement | Tool |
|------|---------|------------------|------|
| Modal entrance | `Modal` component | Add `layoutId` for morph from template card | Framer Motion |
| Loading state | Loader2 spinner | Skeleton preview + progress indicator | Tailwind + Framer Motion |
| Save success | PostSaveDialog text | Confetti + animated checkmark | canvas-confetti (already installed) |
| Error recovery | Text + retry button | Animated error with pulsing retry | motion.js `fadeInScale` preset |
| Panel transitions | Instant show/hide | Smooth slide with `drawer.right` preset | motion.js (existing) |

**Shared element transition (template card to editor):**
```javascript
// On TemplateMarketplacePage: card has layoutId
<motion.div layoutId={`template-${template.id}`}>
  <img src={template.thumbnail_url} />
</motion.div>

// On EditorModal open: receives same layoutId
<AnimatePresence>
  {isOpen && (
    <motion.div layoutId={`template-${templateData?.id}`}>
      {/* editor loading/content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Confidence:** HIGH -- `layoutId` shared element transitions verified in [Framer Motion layout docs](https://www.framer.com/motion/layout-animations/). `canvas-confetti` already in package.json (^1.9.4).

---

### Recommended Stack (v3.0 Summary)

#### Core (no installation needed)

| Technology | Version (installed) | Purpose | Why Sufficient |
|------------|--------------------|---------|----------------|
| framer-motion | ^12.23.24 | All animations, micro-interactions, layout transitions, useInView | 15+ presets in motion.js, AnimatePresence in 16 files, layout/layoutId for morph effects |
| lucide-react | ^0.548.0 | In-editor icon panel source (1500+ icons) | Tree-shakable SVGs, already used in 238 files |
| Polotno SDK | ^2.33.2 | Custom side panel for Unsplash + icons | Built-in ImagesGrid, useInfiniteAPI, SectionTab |
| canvas-confetti | ^1.9.4 | Save/apply celebration effects | Already installed |
| Tailwind CSS | ^3.4.18 | CSS transitions, hover states, responsive grid | Already installed, transition-* utilities |

#### External API (key needed, no npm package)

| Service | Integration | Rate Limit | Cost |
|---------|-------------|------------|------|
| [Unsplash API](https://unsplash.com/documentation) | Direct `fetch` with `Client-ID` header | 50/hr demo, 5000/hr production | Free |

#### Infrastructure

| Component | Purpose | How |
|-----------|---------|-----|
| `VITE_UNSPLASH_ACCESS_KEY` | Unsplash API auth | New env variable |
| `public/polotno/icons-manifest.json` | Icon catalog for editor panel | Generated at build time from Lucide |
| Polotno iframe rebuild | Add Unsplash + Icons custom sections | Update `polotno-build/src/polotno-editor.jsx` |

---

### Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Animations | framer-motion (existing) | GSAP, react-spring, @react-spring/web | Already installed, 12.x has everything needed, adding another animation lib is pure bloat |
| Stock photos | Unsplash direct fetch | unsplash-js (npm), Pexels API, Pixabay | unsplash-js is archived; Pexels already in Polotno DEFAULT_SECTIONS; Pixabay has lower quality |
| Icons in editor | Lucide SVG manifest | react-icons, iconify, Font Awesome | react-icons bundles 400KB; iconify depends on external CDN; FA requires license for pro |
| Image lazy loading | Native `loading="lazy"` + useInView | react-lazy-load-image-component, react-intersection-observer | Native API handles it; useInView already in framer-motion bundle |
| Virtual scrolling | None (not needed yet) | @tanstack/react-virtual, react-virtuoso | Template grids are paginated (20-50 items); virtual scroll adds complexity without benefit |
| Image optimization | CloudFront URL params + Unsplash URL sizing | sharp, next/image, imgix | Server-side processing not needed; URL-based resizing is zero-cost |

---

### What NOT to Add (and Why)

| Library | Why Skip |
|---------|----------|
| **GSAP** | Framer Motion already covers all animation needs; GSAP adds 60KB+ and a different API paradigm |
| **react-spring** | Would conflict with/duplicate Framer Motion; no advantage for this use case |
| **unsplash-js** | **Archived** -- Unsplash recommends direct API calls |
| **react-icons** | Bundles ALL icon families (400KB+); Lucide already has 1500+ curated icons |
| **iconify** | Runtime dependency on external CDN; Lucide SVGs can be self-hosted |
| **react-lazy-load-image-component** | 15KB for what `loading="lazy"` + `useInView` do natively |
| **react-intersection-observer** | `useInView` from framer-motion is identical (wraps IntersectionObserver), already in bundle |
| **blurhash** | CSS `animate-pulse` placeholder is good enough; blurhash adds encoding/decoding complexity |
| **@tanstack/react-virtual** | Template grids are small (paginated); premature optimization |
| **lottie-react** | Loading spinners work fine with Tailwind animate-spin; Lottie adds animation file management burden |
| **masonry-layout / react-masonry-css** | Tailwind grid with `aspect-video` is sufficient; masonry adds complexity without UX benefit for template cards |

---

### v3.0 Installation Summary

```bash
# REQUIRED: Nothing to install
# The existing stack covers all v3.0 needs

# REQUIRED: Add environment variable
echo 'VITE_UNSPLASH_ACCESS_KEY=your_key_here' >> .env
```

**Total new npm dependencies: 0**
**Total new env variables: 1 (VITE_UNSPLASH_ACCESS_KEY)**

---

### v3.0 Integration Points

| v3.0 Feature | Integrates With | How |
|--------------|-----------------|-----|
| Template card animations | `motion.js` presets + `TemplateGrid.jsx` | Wrap cards in `motion.div`, add stagger container |
| Template preview transitions | `TemplatePreviewPanel.jsx` + `drawer` preset | Already using `motion` + `drawer` from motion.js |
| Shared element morph | `TemplateCard` + `EditorModal` | `layoutId` prop on matching elements |
| Scroll-triggered reveals | `FeaturedTemplatesRow`, `StarterPacksRow` | `useInView` + `scrollReveal` preset |
| Unsplash in template marketplace | `unsplashService.js` (new) | Direct fetch, debounced search |
| Unsplash in Polotno editor | `polotno-editor.jsx` custom section | ImagesGrid + SectionTab from Polotno SDK |
| Icons in Polotno editor | `icons-manifest.json` + custom section | Build-time SVG generation + editor panel |
| Image optimization | `OptimizedImage.jsx` | Add useInView, CloudFront resize params |
| Save celebration | `PostSaveDialog.jsx` | canvas-confetti (already installed) |

---

### Bundle Size Impact

| Change | Size Impact | Notes |
|--------|------------|-------|
| New motion.js presets | ~0 KB | Just JS objects, tree-shaken if unused |
| unsplashService.js | ~1 KB | Thin fetch wrapper |
| useInView usage | ~0.6 KB | Already in framer-motion bundle |
| Icon manifest JSON | ~150 KB (static file) | Loaded on-demand in editor iframe only, not in main bundle |
| Polotno editor custom sections | ~5 KB | Inside iframe bundle (separate from main app) |
| **Net main bundle change** | **~1.6 KB** | Negligible |

---

### Version Verification (v3.0)

| Library | Installed | Latest (verified) | Source | Action |
|---------|-----------|-------------------|--------|--------|
| framer-motion | ^12.23.24 | 12.34.0 | [npm](https://www.npmjs.com/package/framer-motion) | No change needed (^ range covers it) |
| lucide-react | ^0.548.0 | 0.563.0 | [npm](https://www.npmjs.com/package/lucide-react) | Optional `npm update` for latest icons |
| polotno | ^2.33.2 | Verify at build time | [npm](https://www.npmjs.com/package/polotno) | Check iframe bundle compatibility |
| canvas-confetti | ^1.9.4 | Already installed | package.json | No change |
| tailwindcss | ^3.4.18 | 3.4.x stable | [npm](https://www.npmjs.com/package/tailwindcss) | No change |

---

### Confidence Assessment (v3.0)

| Area | Confidence | Reason |
|------|------------|--------|
| Framer Motion for all animations | HIGH | Verified in codebase (16 files), motion.js presets confirmed, layout animations documented |
| Unsplash direct fetch | HIGH | Official docs recommend direct API; unsplash-js confirmed archived |
| Polotno custom panels | HIGH | Official Polotno docs show ImagesGrid/SectionTab/useInfiniteAPI API |
| Lucide for icons | HIGH | Already installed with 238 file usage; SVG export is standard |
| No virtual scrolling needed | MEDIUM | Correct for current 20-50 item grids; revisit if template count grows to 500+ |
| CloudFront image resizing | MEDIUM | Depends on CloudFront function configuration; may need Lambda@Edge setup |
| Polotno iframe rebuild | MEDIUM | Custom sections API is documented, but iframe communication for API key passing needs testing |

---

### Sources (v3.0)

**Framer Motion:**
- [Motion for React docs](https://motion.dev/docs/react) - Official documentation
- [Layout animations](https://www.framer.com/motion/layout-animations/) - layoutId, shared element transitions
- [useInView hook](https://motion.dev/docs/react-use-in-view) - IntersectionObserver wrapper (0.6KB)
- [framer-motion npm](https://www.npmjs.com/package/framer-motion) - v12.34.0 latest

**Unsplash API:**
- [Unsplash API Documentation](https://unsplash.com/documentation) - Official endpoints, rate limits, auth
- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) - Attribution requirements, usage rules
- [unsplash-js GitHub](https://github.com/unsplash/unsplash-js) - Confirmed archived, recommends direct API
- [Guideline: Attribution](https://help.unsplash.com/en/articles/2511315-guideline-attribution) - Required attribution format

**Polotno SDK:**
- [Custom images panel](https://polotno.com/docs/custom-images-panel) - ImagesGrid, SectionTab API
- [Side panel overview](https://polotno.com/docs/side-panel-overview) - DEFAULT_SECTIONS, custom sections
- [Pexels photos integration](https://polotno.com/docs/pexels-photos) - Reference pattern for stock photo panels
- [Utils API](https://polotno.com/docs/utils-api) - useInfiniteAPI, ImagesGrid props, getImageSize

**Lucide React:**
- [Lucide React guide](https://lucide.dev/guide/packages/lucide-react) - Tree-shaking, bundle size
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) - v0.563.0 latest

**Image Optimization:**
- [Native lazy loading](https://caniuse.com/loading-lazy-attr) - Browser support
- [Framer Motion vs Motion One performance](https://reactlibraries.com/blog/framer-motion-vs-motion-one-mobile-animation-performance-in-2025) - GPU acceleration details

---

*Stack research updated: 2026-02-10*
