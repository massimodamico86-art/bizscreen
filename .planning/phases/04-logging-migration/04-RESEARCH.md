# Phase 4: Logging Migration - Research

**Researched:** 2026-01-22
**Domain:** Structured logging, frontend observability, React/Vite logging patterns
**Confidence:** HIGH

## Summary

This phase involves migrating 1100+ console.log/error/warn calls across 189 files to a structured logging system. The codebase is a React/Vite application with an existing partial implementation (src/utils/logger.js and src/services/loggingService.js) that already includes basic structured logging with correlation IDs, log levels, and batching.

The research reveals that frontend logging in 2026 follows established patterns: lightweight structured logging (preferring Pino over Winston for performance), JSON output for production, correlation IDs for request tracing, and PII redaction before log persistence. The key challenge is scale - with 393 source files and 197+ console.log calls identified in requirements (though actual count is higher at 1100+), this requires systematic migration with automated verification.

**Key findings:**
- Existing loggingService.js already implements core requirements (correlation IDs, log levels, PII redaction, batching)
- Pino is the performance leader for structured logging (5x faster than Winston) but primarily Node.js-focused
- Custom implementation is appropriate for browser context with specific requirements
- Build-time console.log removal via Terser drop_console prevents accidental production logs
- Circular reference handling in JSON.stringify is a common pitfall requiring safeguards

**Primary recommendation:** Enhance existing loggingService.js implementation rather than introducing new library. Add PII redaction helpers, strengthen circular reference handling, and use ESLint + Terser to enforce migration completeness.

## Standard Stack

The established libraries/tools for frontend structured logging:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Custom logger | N/A | Browser structured logging | Existing implementation in loggingService.js meets requirements; Pino/Winston are Node.js-focused |
| ESLint no-console | Latest | Detect remaining console.log calls | Industry standard for enforcing logging discipline; prevents console.log in production |
| Terser (via Vite) | Latest | Build-time console removal | Vite's standard minifier option for dropping console.* calls in production builds |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.0 | Correlation ID generation | URL-safe, 60% faster than UUID, 118-byte footprint; already used in existing code |
| @sentry/react | ^10.36 | Error tracking integration | Already integrated; provides additional error context beyond logging |
| util.inspect polyfill | Latest | Circular reference handling | For browser environments where complex objects need safe serialization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom logger | Pino + pino-browser | Pino is 5x faster but adds bundle size (~50KB); browser mode has limitations; custom implementation provides more control for React context |
| Custom logger | Winston | More popular (12M weekly downloads) but heavier and slower; overkill for browser logging |
| JSON.stringify | flatted library | Handles circular references but adds dependency; custom replacer function is lightweight alternative |

**Installation:**
```bash
# Already installed
@sentry/react: ^10.36.0

# Add for enhanced functionality
npm install nanoid --save
npm install terser --save-dev
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── loggingService.js      # Enhanced structured logger (existing)
├── utils/
│   ├── logger.js              # Deprecated - migrate to loggingService
│   ├── pii.js                 # NEW: PII detection and redaction utilities
│   └── safeStringify.js       # NEW: Circular-safe JSON serialization
├── contexts/
│   └── LogContext.jsx         # NEW: React context for correlation ID propagation
└── hooks/
    └── useLogger.js           # NEW: React hook for component-scoped logging
```

### Pattern 1: Service-Level Logging
**What:** Import and use loggingService directly in service files
**When to use:** Services, utilities, non-React modules
**Example:**
```javascript
// Source: Existing pattern in src/services/loggingService.js
import { log, createScopedLogger } from '../services/loggingService';

// Option 1: Direct usage
export function fetchData(id) {
  log.info('Fetching data', { id });
  try {
    const result = await api.get(`/data/${id}`);
    log.debug('Data fetched successfully', { id, recordCount: result.length });
    return result;
  } catch (error) {
    log.error('Failed to fetch data', { id, error });
    throw error;
  }
}

// Option 2: Scoped logger (preferred for services)
const logger = createScopedLogger('DataService');

export function fetchData(id) {
  logger.info('Fetching data', { id });
  // ...
}
```

### Pattern 2: React Component Logging
**What:** Use custom hook for component lifecycle-aware logging
**When to use:** React components, hooks
**Example:**
```javascript
// NEW: Create useLogger hook
import { useMemo } from 'react';
import { createScopedLogger } from '../services/loggingService';

export function useLogger(componentName) {
  return useMemo(() => createScopedLogger(componentName), [componentName]);
}

// Usage in component
function MediaLibraryPage() {
  const logger = useLogger('MediaLibraryPage');

  const handleUpload = async (files) => {
    logger.info('Upload started', { fileCount: files.length });
    try {
      await uploadFiles(files);
      logger.info('Upload completed', { fileCount: files.length });
    } catch (error) {
      logger.error('Upload failed', { fileCount: files.length, error });
    }
  };
}
```

### Pattern 3: PII Redaction
**What:** Automatic detection and redaction of sensitive data
**When to use:** All logging of user-provided data
**Example:**
```javascript
// NEW: Create src/utils/pii.js
// Source: Patterns from Sentry beforeSend in errorTracking.js
const PII_PATTERNS = {
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

export function redactPII(text, options = {}) {
  if (typeof text !== 'string') return text;

  let result = text;
  const patterns = options.patterns || PII_PATTERNS;

  Object.entries(patterns).forEach(([type, pattern]) => {
    result = result.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
  });

  return result;
}

export function redactObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = options.keys || ['password', 'token', 'secret', 'key', 'authorization'];
  const result = Array.isArray(obj) ? [] : {};

  Object.entries(obj).forEach(([key, value]) => {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = redactPII(value, options);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value, options);
    } else {
      result[key] = value;
    }
  });

  return result;
}

// Usage in loggingService
import { redactObject, redactPII } from '../utils/pii';

function createLogEntry(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message: redactPII(message),  // Redact PII from message
    data: redactObject(data),      // Redact PII from data
    correlationId,
    // ... other fields
  };
}
```

### Pattern 4: Correlation ID Propagation
**What:** Pass correlation IDs from frontend through API calls to backend
**When to use:** All API requests for end-to-end tracing
**Example:**
```javascript
// Source: Patterns from loggingService.js getCorrelationId()
import { getCorrelationId } from '../services/loggingService';

// In API client/interceptor
async function apiRequest(method, url, data) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': getCorrelationId(),
  };

  const response = await fetch(url, { method, headers, body: JSON.stringify(data) });

  // Log API calls with correlation
  log.debug(`API ${method} ${url}`, {
    correlationId: getCorrelationId(),
    status: response.status,
    duration: /* calculate */
  });

  return response;
}
```

### Pattern 5: Safe Object Serialization
**What:** Handle circular references and complex objects safely
**When to use:** Logging errors, complex state, DOM objects
**Example:**
```javascript
// NEW: Create src/utils/safeStringify.js
// Source: Patterns from MDN and safe-stringify library
export function safeStringify(obj, replacer = null, space = 2) {
  const seen = new WeakSet();

  const circularReplacer = (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    // Handle special types
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.split('\n').slice(0, 5).join('\n'),
      };
    }

    // Apply custom replacer if provided
    return replacer ? replacer(key, value) : value;
  };

  try {
    return JSON.stringify(obj, circularReplacer, space);
  } catch (error) {
    return JSON.stringify({ error: 'Failed to stringify object', type: typeof obj });
  }
}

// Usage in loggingService
import { safeStringify } from '../utils/safeStringify';

function formatForConsole(entry) {
  const dataStr = safeStringify(entry.data);
  // ...
}
```

### Anti-Patterns to Avoid
- **Direct console.log in production**: Use structured logger exclusively; enforce with ESLint
- **Logging sensitive data without redaction**: Always use redactObject/redactPII wrappers
- **Synchronous logging in hot paths**: Existing batching system handles this; don't bypass it
- **Creating new correlation IDs mid-request**: Use getCorrelationId(), don't generate new IDs
- **Logging entire request/response objects**: Extract specific fields to avoid circular references and performance issues
- **Using console.error for non-errors**: Maintain log level discipline (error = exceptional conditions only)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular reference handling | Custom JSON traversal | safeStringify with WeakSet pattern | Proven pattern; edge cases like Error objects, DOM nodes are complex |
| Correlation ID generation | Math.random() + timestamps | nanoid library | Cryptographically random, collision-resistant, URL-safe, battle-tested |
| PII detection | Simple regex for email only | Comprehensive PII pattern library | Email, phone, SSN, credit cards all need detection; patterns are complex |
| Log level filtering | Manual if/else chains | Numeric level comparison (existing in loggingService) | Standard pattern used by all logging frameworks; maintainable |
| Browser log collection | Custom XHR/fetch batching | Existing loggingService batching + sendBeacon fallback | sendBeacon is designed for logging; survives page unload |
| Development vs production behavior | Manual env checks everywhere | Centralized CONFIG object (existing in loggingService) | Single source of truth; easier to test and maintain |

**Key insight:** Browser logging has unique constraints (bundle size, offline support, performance impact, circular references from DOM objects). The existing loggingService.js already solves most of these. Enhance rather than replace.

## Common Pitfalls

### Pitfall 1: Forgetting to Remove console.log Before Production
**What goes wrong:** Console.log statements slip through to production, exposing sensitive data and degrading performance. Studies show console.log can add 1.8MB+ memory overhead and significant performance impact.
**Why it happens:** Developers add console.log for debugging and forget to remove it; no automated checks prevent it.
**How to avoid:**
- Add ESLint rule: `"no-console": ["error", { allow: ["warn", "error"] }]` for production
- Configure Vite to drop console.* in production: `build.terserOptions.compress.drop_console = true`
- Add pre-commit hook with lint-staged to catch violations
**Warning signs:**
- Console output in production browser DevTools
- Sensitive data visible in browser logs
- Performance degradation on user devices

### Pitfall 2: Circular Reference Errors in JSON.stringify
**What goes wrong:** Logging complex objects (errors, DOM nodes, request objects) throws "Converting circular structure to JSON" error, breaking the logging system and potentially the application.
**Why it happens:** React components have circular references via props/state; Error objects have circular stacks; DOM objects are inherently circular.
**How to avoid:**
- Use safeStringify utility with WeakSet tracking
- Extract specific fields from complex objects before logging
- Use util.inspect patterns (Node.js) or custom serializers
- Existing loggingService.js already handles Error objects correctly - replicate pattern
**Warning signs:**
- "Converting circular structure to JSON" errors in console
- Logs failing to transmit to backend
- Application crashes during error logging (cascading failure)

### Pitfall 3: Logging PII Without Redaction
**What goes wrong:** User emails, names, phone numbers, and other PII end up in logs, violating GDPR and creating data breach risk.
**Why it happens:** Form data, API responses, and error messages naturally contain PII; developers don't realize logging captures it.
**How to avoid:**
- Implement automatic PII redaction in createLogEntry (before persistence)
- Use redactObject wrapper for all user-provided data
- Apply redactPII to all message strings
- Existing errorTracking.js shows pattern: `event.message.replace(emailRegex, '[EMAIL_REDACTED]')`
- Document "sensitive" fields that should never be logged (password, token, secret, key)
**Warning signs:**
- Email addresses visible in logged data objects
- User names in log messages
- Authentication tokens in API request logs

### Pitfall 4: Excessive Log Volume in Production
**What goes wrong:** Debug/trace logs flood production systems, increasing costs, degrading performance, and making important logs hard to find.
**Why it happens:** Not setting appropriate log levels for production; forgetting to respect LOG_LEVELS.minLevel configuration.
**How to avoid:**
- Set CONFIG.minLevel to 'info' in production (existing pattern in loggingService.js)
- Use sampling for high-volume logs (existing: 10% sampling in production)
- Respect shouldLog() checks before creating log entries
- Use log.debug for verbose diagnostics (automatically filtered in production)
- Use log.info for important business events (always captured)
**Warning signs:**
- Log storage costs higher than expected
- Performance degradation from log serialization
- Difficulty finding relevant logs among noise

### Pitfall 5: Lost Correlation Context During Async Operations
**What goes wrong:** Correlation IDs don't propagate through async operations, breaking request tracing. Logs from the same user action have different correlation IDs.
**Why it happens:** React components remount; async operations span multiple event loop ticks; correlation ID changes unexpectedly.
**How to avoid:**
- Refresh correlation ID only on navigation (existing: refreshCorrelationId on popstate)
- Pass correlationId explicitly for long-running operations
- Use React Context to share correlationId across component tree
- Don't generate new correlation IDs within request handlers
**Warning signs:**
- Related logs have different correlation IDs
- Cannot trace user actions end-to-end
- Logs from same page load have multiple correlation IDs

### Pitfall 6: Synchronous Logging Blocking UI
**What goes wrong:** Logging operations block the main thread, causing UI jank and degraded user experience.
**Why it happens:** Serializing large objects is CPU-intensive; network calls for log transmission block execution.
**How to avoid:**
- Use existing batching system (flushInterval: 10000ms, batchSize: 20)
- Leverage sendBeacon API for non-blocking transmission (existing pattern)
- Don't bypass bufferLog() - it handles batching and backpressure
- Avoid logging in hot paths (animation frames, scroll handlers)
- Use sampling for high-frequency events (existing: samplingRate configuration)
**Warning signs:**
- UI stuttering or jank during heavy logging
- Long tasks in Chrome DevTools Performance panel
- User complaints about slow interactions

### Pitfall 7: Inconsistent Migration (Partial console.log Replacement)
**What goes wrong:** Mix of console.log and structured logging creates inconsistent observability; some logs have correlation IDs, some don't.
**Why it happens:** Large codebase (393 files); incremental migration without enforcement; different developers using different patterns.
**How to avoid:**
- Use ESLint to fail CI/PR for any console.log (except allowed console.warn/error)
- Migrate systematically by directory (services/, then pages/, then components/)
- Use codemod or search/replace with verification
- Track progress: grep -r "console\.log" src | wc -l
- Add TODO comments for complex cases requiring manual review
**Warning signs:**
- Some logs have correlationId, others don't
- Inconsistent log formats in production
- ESLint violations accumulating

## Code Examples

Verified patterns from official sources and existing codebase:

### Enhanced loggingService.js with PII Redaction
```javascript
// Source: Existing loggingService.js + PII patterns from errorTracking.js
import { redactObject, redactPII } from '../utils/pii';
import { safeStringify } from '../utils/safeStringify';

function createLogEntry(level, message, data = {}) {
  const { error, ...rest } = data;

  return {
    timestamp: new Date().toISOString(),
    level,
    message: redactPII(message),  // NEW: Redact PII from message
    correlationId,
    sessionId: sessionContext.sessionId,
    userId: sessionContext.userId,
    tenantId: sessionContext.tenantId,
    url: typeof window !== 'undefined' ? window.location.pathname : null,
    data: redactObject(rest),  // NEW: Redact PII from data
    error: error ? {
      name: error.name,
      message: redactPII(error.message),  // NEW: Redact PII from error message
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    } : undefined,
    metadata: {
      userAgent: sessionContext.userAgent,
      timezone: sessionContext.timezone,
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
    },
  };
}
```

### Migration Pattern: Service File
```javascript
// BEFORE: src/services/playerService.js
console.error('Failed to update heartbeat:', error);
console.warn('Failed to fetch content from server, trying cache:', err.message);
console.log('PlayerManager started for screen:', this.screenId);

// AFTER: src/services/playerService.js
import { createScopedLogger } from './loggingService';
const logger = createScopedLogger('PlayerService');

logger.error('Failed to update heartbeat', { error });
logger.warn('Failed to fetch content from server, trying cache', { error: err });
logger.info('PlayerManager started', { screenId: this.screenId });
```

### Migration Pattern: React Component
```javascript
// BEFORE: src/pages/MediaLibraryPage.jsx
console.error('Error loading media:', err);
console.log('Upload completed:', files.length);

// AFTER: src/pages/MediaLibraryPage.jsx
import { useLogger } from '../hooks/useLogger';

function MediaLibraryPage() {
  const logger = useLogger('MediaLibraryPage');

  const loadMedia = async () => {
    try {
      const media = await mediaService.getAll();
      logger.debug('Media loaded', { count: media.length });
    } catch (err) {
      logger.error('Error loading media', { error: err });
    }
  };

  const handleUpload = async (files) => {
    logger.info('Upload started', { fileCount: files.length });
    try {
      await uploadFiles(files);
      logger.info('Upload completed', { fileCount: files.length });
    } catch (error) {
      logger.error('Upload failed', { fileCount: files.length, error });
    }
  };
}
```

### ESLint Configuration
```javascript
// .eslintrc.cjs or eslint.config.js
// Source: ESLint official documentation
module.exports = {
  rules: {
    // Allow console.warn and console.error, block everything else
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
  // For development, you can disable this rule
  overrides: [
    {
      files: ['*.dev.js', '*.test.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
```

### Vite Build Configuration for Production
```javascript
// vite.config.js
// Source: Vite documentation + Terser docs
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Use terser for console removal (esbuild doesn't support drop_console)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // Remove all console.* calls
        drop_debugger: true,     // Remove debugger statements
        pure_funcs: ['console.log', 'console.debug'],  // Alternative: specific functions
      },
      format: {
        comments: false,         // Remove comments
      },
    },
  },
});

// Note: Requires terser as dev dependency
// npm install terser --save-dev
```

### useLogger React Hook
```javascript
// NEW: src/hooks/useLogger.js
// Source: React hooks patterns + existing createScopedLogger
import { useMemo } from 'react';
import { createScopedLogger } from '../services/loggingService';

/**
 * React hook for component-scoped logging
 * Creates a logger instance scoped to the component name
 * Memoized to prevent recreation on every render
 */
export function useLogger(componentName) {
  return useMemo(() => createScopedLogger(componentName), [componentName]);
}

// Usage
function MyComponent() {
  const logger = useLogger('MyComponent');

  useEffect(() => {
    logger.debug('Component mounted');
    return () => logger.debug('Component unmounted');
  }, [logger]);
}
```

### Correlation ID in API Interceptor
```javascript
// Example: Adding to Supabase client or fetch wrapper
// Source: Best practices from correlation ID research
import { supabase } from './supabase';
import { getCorrelationId } from './services/loggingService';

// Extend Supabase client to add correlation header
const originalFrom = supabase.from.bind(supabase);
supabase.from = function(table) {
  const query = originalFrom(table);

  // Add correlation ID to all requests
  query.headers = {
    ...query.headers,
    'X-Correlation-ID': getCorrelationId(),
  };

  return query;
};

// Or wrap fetch globally
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options = {}] = args;

  options.headers = {
    ...options.headers,
    'X-Correlation-ID': getCorrelationId(),
  };

  return originalFetch(url, options);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.log everywhere | Structured JSON logging | 2020-2023 | Production observability improved; GDPR compliance easier; log aggregation possible |
| UUID for correlation IDs | nanoid | 2021-2022 | 60% faster generation; smaller ID size (21 vs 36 chars); URL-safe by default |
| Winston for browser logging | Custom lightweight loggers | 2022-2024 | Bundle size reduced; Winston is Node.js-focused; browser constraints different |
| Separate error tracking & logging | Unified observability (Sentry + logs) | 2023-2024 | Single correlation ID spans both; errors link to logs; better debugging |
| Manual PII redaction | Automatic detection & redaction | 2023-2025 | GDPR compliance; prevents accidental leaks; consistent enforcement |
| Synchronous log transmission | Batching + sendBeacon | 2021-2023 | Performance improved; logs survive page unload; reduced network overhead |
| All logs to backend | Sampling + critical-only persistence | 2024-2025 | Cost reduction; performance improvement; noise reduction |

**Deprecated/outdated:**
- **log4js/log4javascript**: Unmaintained since 2019; replaced by modern libraries
- **debug npm package**: Popular but no structured output; use for development only
- **console.table/console.time**: Useful for dev but don't structure well; migrate to log.debug
- **Synchronous console.log in hot paths**: Blocks UI thread; always use batched structured logger

## Open Questions

Things that couldn't be fully resolved:

1. **Player Component Offline Logging**
   - What we know: Player components (src/Player.jsx, src/TV.jsx) run in potentially offline contexts with IndexedDB caching; they have 47 and 6 console.log calls respectively
   - What's unclear: Should offline logs be persisted locally and synced when online? Or just use console.warn/error as fallback?
   - Recommendation: For player components, keep structured logging but add localStorage persistence queue for offline logs. Sync when connectivity returns. Use existing batching infrastructure.

2. **Log Aggregation Service Integration**
   - What we know: User noted "not sure yet" about log aggregation (Datadog, Splunk, etc.); existing loggingService.js has VITE_LOG_ENDPOINT placeholder
   - What's unclear: Whether to optimize format for specific service (e.g., Datadog's JSON format) or keep generic
   - Recommendation: Keep generic JSON format. VITE_LOG_ENDPOINT can adapt format server-side. Add metadata fields that common services expect (timestamp, level, message, tags).

3. **Development Mode Verbosity**
   - What we know: Existing logger has environment-based filtering (debug in dev, info in prod)
   - What's unclear: Whether developers want to keep console.log during development or migrate completely
   - Recommendation: Allow console.log in dev files (*.dev.js, *.test.js) via ESLint override. For regular files, enforce structured logging even in dev for consistency. Add logger.dev() method that's no-op in production.

4. **Migration Sequence Priority**
   - What we know: 189 files with console.log; some are critical (services, player) vs less critical (UI components)
   - What's unclear: Whether to migrate all at once or prioritize high-value files
   - Recommendation: Prioritize in this order: (1) Services with sensitive data, (2) Player components (offline context), (3) Error handling paths, (4) Other components. This approach provides immediate GDPR compliance for highest-risk code.

5. **Log Retention and Storage Requirements**
   - What we know: Existing code stores critical logs in 'application_logs' table; GDPR requires retention limits
   - What's unclear: Specific retention period requirements (30 days? 90 days?); whether all logs should be stored or just errors
   - Recommendation: Default to 30-day retention for compliance. Store errors/warnings persistently; buffer info/debug temporarily (existing batching). Add cleanup job to delete logs older than retention period.

## Sources

### Primary (HIGH confidence)
- [Pino Logger: Complete Node.js Guide with Examples [2026] | SigNoz](https://signoz.io/guides/pino-logger/)
- [Logging in Node.js: A Comparison of the Top 8 Libraries | Better Stack Community](https://betterstack.com/community/guides/logging/best-nodejs-logging-libraries/)
- [Log Levels Explained and How to Use Them | Better Stack Community](https://betterstack.com/community/guides/logging/log-levels-explained/)
- [ESLint no-console Rule](https://eslint.org/docs/latest/rules/no-console)
- [Vite Build Options | Vite](https://vite.dev/config/build-options)
- Existing codebase: src/services/loggingService.js (already implements correlation IDs, batching, log levels)
- Existing codebase: src/utils/errorTracking.js (shows PII redaction patterns in beforeSend)

### Secondary (MEDIUM confidence)
- [Mastering Correlation IDs: Enhancing Tracing and Debugging in Distributed Systems | Medium](https://medium.com/@nynptel/mastering-correlation-ids-enhancing-tracing-and-debugging-in-distributed-systems-602a84e1ded6)
- [Best Frontend Cloud Logging Tools: Top 6 Compared [2026] | SigNoz](https://signoz.io/comparisons/best-frontend-cloud-logging-tools/)
- [GDPR-Compliant Logging: A JavaScript Developer's Checklist | ByteHide | Medium](https://medium.com/bytehide/gdpr-compliant-logging-a-javascript-developers-checklist-b450d0716003)
- [How to redact sensitive / PII data in your logs | OpenObserve](https://openobserve.ai/blog/redact-sensitive-data-in-logs/)
- [Circular Reference Error in JavaScript | freeCodeCamp](https://www.freecodecamp.org/news/circular-reference-in-javascript-explained/)
- [GitHub - ai/nanoid: A tiny (118 bytes), secure, URL-friendly, unique string ID generator](https://github.com/ai/nanoid)
- [Using Dexie.js in React apps for offline data storage | LogRocket](https://blog.logrocket.com/dexie-js-indexeddb-react-apps-offline-data-storage/)

### Tertiary (LOW confidence)
- [Avoiding console.log in Production: Best Practices | DEV Community](https://dev.to/franklinthaker/avoiding-consolelog-in-production-best-practices-for-robust-logging-5me)
- [Browser monitoring and performance impact | New Relic](https://docs.newrelic.com/docs/browser/new-relic-browser/performance-quality/browser-monitoring-performance-impact/)
- [Excessive Logging and Its Performance Impact | Medium](https://medium.com/@KavyasreeSanjapu/excessive-logging-and-its-performance-impact-8323aa453d31)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing implementation already in place; research confirms best practices align with current code
- Architecture: HIGH - Patterns verified against official docs and existing codebase; straightforward React/Vite integration
- Pitfalls: HIGH - Multiple authoritative sources; common mistakes well-documented; existing code shows some patterns already handled
- PII redaction: MEDIUM - Patterns clear but implementation details require careful testing; existing errorTracking.js provides template
- Offline logging: MEDIUM - Player component specifics need investigation; general patterns established

**Research date:** 2026-01-22
**Valid until:** 2026-02-21 (30 days - stable domain, slow-moving standards)

**Key risk:** Scale of migration (1100+ instances) requires systematic approach. Recommend codemod or automated refactoring tool to reduce manual error risk.
