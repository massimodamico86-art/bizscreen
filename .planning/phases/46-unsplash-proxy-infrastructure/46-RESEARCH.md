# Phase 46: Unsplash Proxy Infrastructure - Research

**Researched:** 2026-02-10
**Domain:** Supabase Edge Functions, Unsplash REST API, server-side caching, per-tenant rate limiting
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- all implementation decisions delegated to Claude's discretion.

### Claude's Discretion
All implementation decisions delegated to Claude -- this is a pure infrastructure phase with technical choices:

- **API response shape** -- What fields to return (thumbnails, attribution, pagination), response format, error envelope
- **Caching behavior** -- Cache layer choice, TTL duration, cache key strategy, stale-while-revalidate vs hard expiry
- **Rate limiting design** -- Per-tenant limits, burst allowance, error responses, backoff signals
- **Offline/player conflict** -- How to reconcile Unsplash hotlink-only TOS with offline player requirements (may need to accept limitation or proxy-serve cached images)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 46 builds the server-side infrastructure that enables secure, compliant Unsplash photo search. The core deliverable is a Supabase Edge Function (`unsplash-proxy`) running on the Deno runtime that accepts authenticated search requests from the BizScreen frontend, proxies them to the Unsplash REST API, caches results in a Supabase database table, enforces per-tenant rate limits, and returns TOS-compliant photo data including attribution metadata. The API key never reaches the browser.

This is BizScreen's first Edge Function. The project currently has no `supabase/functions/` directory, so this phase also establishes the Edge Function infrastructure pattern (directory structure, CORS handling, secrets management, deployment workflow) that future functions will follow. The Supabase CLI (v2.76.7) is available via npx, and the existing `@supabase/supabase-js@2.80.0` client supports `functions.invoke()` for calling Edge Functions from the frontend.

The Unsplash API has four mandatory compliance requirements (attribution with UTM links, CDN hotlinking, download tracking, no re-hosting) that are strictly enforced -- non-compliance risks API access revocation. The `unsplash-js` npm package is archived as of January 2026 and must not be used; instead, raw HTTP `fetch` calls to the Unsplash REST API at `https://api.unsplash.com/` are the standard approach. Rate limits start at 50 requests/hour in demo mode (production access at 5,000 req/hr requires application review that takes days to weeks), making server-side caching essential from day one.

**Primary recommendation:** Build a single Supabase Edge Function at `supabase/functions/unsplash-proxy/index.ts` that handles search, download-tracking, and cache management. Use Supabase database tables for caching (not external Redis) to avoid adding a new service dependency. Implement per-tenant rate limiting using a database counter table with sliding window logic. Return a standardized response envelope with photo data, attribution fields, and pagination metadata.

## Standard Stack

### Core
| Component | Version/Source | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| Supabase Edge Functions | Deno runtime | Server-side proxy host | Already the project's backend; zero new infrastructure |
| Unsplash REST API | v1 (`api.unsplash.com`) | Stock photo search and metadata | Direct HTTP calls; official JS wrapper is archived |
| Supabase Database (PostgreSQL) | Existing instance | Cache storage + rate limit tracking | Already in use; avoids adding Redis/Upstash dependency |
| `@supabase/supabase-js` | 2.80.0 (installed) | Client-side Edge Function invocation | Already installed; `functions.invoke()` method |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Supabase CLI | 2.76.7 (via npx) | Create, serve, and deploy Edge Functions | Development and deployment |
| Deno standard library | Built-in | HTTP server, JSON handling, URL parsing | Inside Edge Function code |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase DB cache | Upstash Redis | Redis is faster but adds external dependency, costs, and secrets management; DB cache is sufficient for search result TTLs |
| Supabase DB rate limiting | Upstash Ratelimit | Upstash offers battle-tested sliding window, but adds external service; DB-based counter with periodic cleanup is simpler for this use case |
| Edge Function | Vite dev server middleware | Only works locally; not deployable to production |
| `functions.invoke()` | Raw `fetch` to function URL | `functions.invoke()` auto-attaches auth headers but has limited GET query param support; use it for POST-based search |

### No Installation Required
No new npm packages needed. The Edge Function runs on Deno (separate from the Node.js frontend). The frontend calls it via the already-installed `@supabase/supabase-js`.

**Infrastructure setup:**
```bash
# Initialize Supabase functions directory (first time)
npx supabase functions new unsplash-proxy

# Set the Unsplash API key as a secret
npx supabase secrets set UNSPLASH_ACCESS_KEY=your_access_key_here

# Local development
npx supabase functions serve unsplash-proxy --env-file ./supabase/.env

# Deploy
npx supabase functions deploy unsplash-proxy
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── .env                          # Local dev secrets (git-ignored)
├── config.toml                   # Supabase project config
├── functions/
│   ├── _shared/
│   │   └── cors.ts               # CORS headers (shared across functions)
│   └── unsplash-proxy/
│       └── index.ts              # Main function handler
└── migrations/
    ├── XXX_create_unsplash_cache.sql       # Cache table
    └── XXX_create_unsplash_rate_limits.sql # Rate limit tracking table
```

**Key convention:** Shared code goes in `_shared/` prefixed with underscore (Supabase convention to prevent deployment as a standalone function). Each function gets its own directory with `index.ts` as the entry point.

### Pattern 1: POST-Based Search Proxy
**What:** Use POST method with JSON body for search requests instead of GET with query params.
**When to use:** Always for this proxy, because `supabase.functions.invoke()` has limited GET query parameter support. Passing search params in the POST body is the most reliable approach.
**Why:** The `functions.invoke()` method routes all parameters through the request body. While GET query params can be hacked by appending to the function name string, POST is the intended pattern and avoids brittleness.

**Client-side call:**
```javascript
// Source: Supabase functions.invoke docs + community patterns
const { data, error } = await supabase.functions.invoke('unsplash-proxy', {
  body: {
    action: 'search',
    query: 'coffee shop',
    page: 1,
    per_page: 20,
    orientation: 'landscape',
  },
});
```

### Pattern 2: Action-Based Routing
**What:** Single Edge Function handles multiple actions via an `action` field in the request body, instead of separate functions per endpoint.
**When to use:** When related operations share authentication, rate limiting, and error handling logic.
**Why:** Supabase recommends "fat functions" -- few large functions rather than many small ones. This reduces cold starts and simplifies deployment. A single `unsplash-proxy` function handles search, download tracking, and cache management.

**Edge Function routing:**
```typescript
// Source: Supabase Edge Functions routing docs
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { action, ...params } = await req.json();

  switch (action) {
    case 'search':
      return handleSearch(req, params);
    case 'track-download':
      return handleDownloadTracking(req, params);
    default:
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
});
```

### Pattern 3: Database-Backed Cache with TTL
**What:** Store Unsplash search results in a PostgreSQL table with a `cached_at` timestamp. Check cache before calling Unsplash API. Use hard expiry (not stale-while-revalidate) for simplicity.
**When to use:** For all search requests.
**Why:** Avoids external cache dependency (Redis/Upstash). PostgreSQL is already available inside Edge Functions via `Deno.env.get('SUPABASE_URL')`. A 24-hour TTL meets the success criteria ("repeated identical searches within 24 hours are served from cache"). Cache keys combine the search query + page + per_page + orientation for uniqueness.

### Pattern 4: Database-Backed Per-Tenant Rate Limiting
**What:** Track request counts per tenant in a PostgreSQL table with a sliding window. Check before processing each request.
**When to use:** For every incoming request.
**Why:** Simpler than adding Upstash Redis. The rate limit table tracks `tenant_id`, `window_start`, and `request_count`. A SQL function atomically increments and checks the count. 100 requests per hour per tenant is a reasonable default (configurable).

### Pattern 5: Standardized Error Envelope
**What:** All responses (success and error) follow the same JSON envelope structure.
**When to use:** Every response from the Edge Function.

```typescript
// Success response
{
  "ok": true,
  "data": { /* search results, photo data, etc. */ },
  "meta": { "cached": true, "cache_age_seconds": 3600 }
}

// Error response
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again in 45 minutes.",
    "retry_after_seconds": 2700
  }
}
```

### Anti-Patterns to Avoid
- **Exposing Unsplash API key to the browser:** Never use `VITE_UNSPLASH_*` prefix for the key. It must only be accessible server-side via `Deno.env.get()`.
- **Installing `unsplash-js`:** The package is archived (January 2026). Use raw `fetch` calls.
- **Separate Edge Functions per action:** Creates cold start overhead. Use one function with action routing.
- **In-memory caching in Edge Functions:** Edge Function isolates are short-lived and stateless. Cache must be persisted to database or external store.
- **GET requests with query params via `functions.invoke()`:** The SDK has limited support for this. Use POST with JSON body.
- **Caching without cache key normalization:** Queries "Coffee Shop" and "coffee shop" should hit the same cache entry. Normalize to lowercase and trim whitespace.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS handling | Custom CORS header logic | `_shared/cors.ts` pattern from Supabase docs | Must include specific Supabase headers (`x-client-info`, `apikey`); easy to miss one |
| JWT verification | Manual token parsing | `supabase.auth.getUser()` inside Edge Function with service role client | Handles token expiry, refresh, and validation automatically |
| Unsplash URL construction | String concatenation for API URLs | `URL` + `URLSearchParams` built-in APIs | Proper encoding, no injection risk |
| Cache key generation | Manual string concatenation | Sorted JSON.stringify of normalized params | Deterministic regardless of parameter order |
| Rate limit window calculation | Manual timestamp math | SQL `date_trunc` + window functions | Atomic, handles concurrent requests correctly |

**Key insight:** The Supabase Edge Function runtime provides built-in access to the project's database via environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). This means caching and rate limiting can use the existing PostgreSQL database without any external service, keeping the architecture simple.

## Common Pitfalls

### Pitfall 1: Unsplash API Key Exposed in Browser
**What goes wrong:** Developer stores the Unsplash key as `VITE_UNSPLASH_ACCESS_KEY`, which Vite bundles into client-side code. Anyone can extract it from the browser's network tab or source maps.
**Why it happens:** Habit from other environment variables that use the `VITE_` prefix.
**How to avoid:** Store as a Supabase secret (`npx supabase secrets set UNSPLASH_ACCESS_KEY=...`). Access only via `Deno.env.get('UNSPLASH_ACCESS_KEY')` inside the Edge Function. Never reference this key in any `src/` file.
**Warning signs:** Any file in `src/` containing "unsplash" and "key" or "access_key" in the same context.

### Pitfall 2: Unsplash Rate Limit Exhaustion During Development
**What goes wrong:** Demo mode allows only 50 requests/hour. Multiple developers testing simultaneously exhaust the limit within minutes. The proxy returns empty results or errors with no useful message.
**Why it happens:** Not monitoring `X-Ratelimit-Remaining` header from Unsplash API responses. Not applying for production access early.
**How to avoid:** (1) Apply for Unsplash production access the same day the API key is created -- review takes days to weeks. (2) Cache aggressively -- 24h TTL means development rarely hits the API after initial population. (3) Log and forward `X-Ratelimit-Remaining` in proxy responses so the frontend knows the upstream state. (4) Implement search debouncing (300ms) on the client side to reduce wasted requests.
**Warning signs:** Unsplash API returning 403 responses. `X-Ratelimit-Remaining: 0` in response headers.

### Pitfall 3: Missing Download Tracking Breaks TOS Compliance
**What goes wrong:** Proxy returns search results correctly, but when a user selects a photo for their design, the `download_location` endpoint is never called. Unsplash cannot track photo usage, which violates API terms.
**Why it happens:** Download tracking is a separate API call that must be triggered when a user "uses" a photo (inserts into design), not when they view it in search results. This is easy to forget because it is a fire-and-forget call with no visible effect.
**How to avoid:** The proxy must expose a `track-download` action. The frontend must call it when a user selects/inserts a photo. The proxy calls `GET {download_location}?client_id={key}` asynchronously and does not block on the response.
**Warning signs:** No calls to any endpoint containing "download" in the proxy logs.

### Pitfall 4: Cache Key Collision or Cache Miss Due to Normalization
**What goes wrong:** Searching "Coffee Shop" and "coffee shop" produces two separate cache entries, doubling API usage. Or worse, different parameter orderings create duplicate cache entries.
**Why it happens:** Cache keys are built from raw user input without normalization.
**How to avoid:** Normalize cache keys: lowercase the query, trim whitespace, collapse multiple spaces, sort additional parameters alphabetically. Use a deterministic serialization: `JSON.stringify({ orientation, page, per_page, query: query.toLowerCase().trim() })`.
**Warning signs:** Cache table has near-duplicate rows (same query with different casing).

### Pitfall 5: Edge Function CORS Errors on First Deployment
**What goes wrong:** The Edge Function works locally but fails in production with CORS errors. The browser blocks the response because the `Access-Control-Allow-Headers` header is missing required Supabase headers.
**Why it happens:** The CORS preflight response must include `authorization`, `x-client-info`, `apikey`, and `content-type` in `Access-Control-Allow-Headers`. Missing any one of these causes browser rejection. Supabase's infrastructure may also truncate custom headers (known issue).
**How to avoid:** Use the shared CORS pattern from Supabase docs. Include CORS headers in ALL responses (success, error, and OPTIONS). Test with actual browser requests, not just `curl`.
**Warning signs:** Function works via `curl` or Supabase Dashboard testing but fails when called from the React app.

### Pitfall 6: Unsplash Hotlinking vs Offline Player Conflict
**What goes wrong:** Unsplash requires hotlinking their CDN URLs (`images.unsplash.com`). BizScreen's digital signage players must work offline. An offline player cannot load images from Unsplash's CDN, resulting in blank images on production signage.
**Why it happens:** Fundamental tension between Unsplash's business model (tracking views via their CDN) and BizScreen's core value (screens work offline).
**How to avoid:** For this infrastructure phase, document the limitation clearly. The proxy returns Unsplash CDN URLs as required by TOS. The offline player conflict is an architectural decision that affects Phase 49 (editor integration), not Phase 46. Options include: (a) accept the limitation -- Unsplash images require internet, (b) contact Unsplash about offline display licensing, (c) use Pexels as an alternative (CC0, allows re-hosting). The hotlinking guideline notes an exception for "derivative creative images" (remixed/modified) and mentions contacting the API partnership team for "photo views beacon alternative."
**Warning signs:** Any code that downloads Unsplash images to S3 or Supabase Storage.

### Pitfall 7: Service Role Key Misuse in Edge Function
**What goes wrong:** The Edge Function uses the service role key for all operations, bypassing Row Level Security. A bug or injection could expose data across tenants.
**Why it happens:** Edge Functions have access to `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. It is needed for cache table writes, but should not be used for user-facing queries.
**How to avoid:** Create a Supabase client with the service role key ONLY for cache/rate-limit table operations. Use the user's JWT (from the `Authorization` header) to identify the tenant and enforce permissions. The cache and rate limit tables should be internal (no RLS needed because they are only accessed by the Edge Function).
**Warning signs:** Using service role key to query user-facing tables.

## Code Examples

Verified patterns from official sources:

### Edge Function: Complete Handler Structure
```typescript
// Source: Supabase Edge Functions docs (CORS, auth, routing patterns combined)
// File: supabase/functions/unsplash-proxy/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UNSPLASH_BASE = 'https://api.unsplash.com';
const CACHE_TTL_HOURS = 24;
const RATE_LIMIT_PER_HOUR = 100;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } }, 401);
    }

    // Create Supabase client with service role for cache/rate-limit operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT to identify tenant
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
    }

    // Get tenant_id from user metadata or profiles table
    const tenantId = user.app_metadata?.tenant_id ?? user.id;

    // Parse request body
    const { action, ...params } = await req.json();

    switch (action) {
      case 'search':
        return await handleSearch(supabaseAdmin, tenantId, params);
      case 'track-download':
        return await handleDownloadTracking(params);
      default:
        return jsonResponse({ ok: false, error: { code: 'BAD_REQUEST', message: `Unknown action: ${action}` } }, 400);
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Unsplash API Search Call
```typescript
// Source: Unsplash API documentation (https://unsplash.com/documentation)
async function searchUnsplash(query: string, page: number, perPage: number, orientation?: string) {
  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY')!;
  const url = new URL(`${UNSPLASH_BASE}/search/photos`);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('content_filter', 'high'); // Safe content only
  if (orientation) url.searchParams.set('orientation', orientation);

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Client-ID ${accessKey}` },
  });

  if (!response.ok) {
    const remaining = response.headers.get('X-Ratelimit-Remaining');
    throw new Error(`Unsplash API error: ${response.status} (remaining: ${remaining})`);
  }

  const rateLimit = {
    limit: Number(response.headers.get('X-Ratelimit-Limit')),
    remaining: Number(response.headers.get('X-Ratelimit-Remaining')),
  };

  const data = await response.json();
  return { data, rateLimit };
}
```

### TOS-Compliant Response Shaping
```typescript
// Source: Unsplash Attribution + Hotlinking + Download Tracking guidelines
// https://help.unsplash.com/en/articles/2511315-guideline-attribution
// https://help.unsplash.com/en/articles/2511271-guideline-hotlinking-images
// https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download
function shapePhotoResult(photo: any, appName: string) {
  return {
    id: photo.id,
    description: photo.description || photo.alt_description,
    color: photo.color,
    width: photo.width,
    height: photo.height,
    // Hotlinked URLs (MUST use Unsplash CDN, never re-host)
    urls: {
      thumb: photo.urls.thumb,   // 200px wide (for grid thumbnails)
      small: photo.urls.small,   // 400px wide (for preview)
      regular: photo.urls.regular, // 1080px wide (for editor canvas)
      full: photo.urls.full,     // Original resolution (for player display)
      // Dynamic resizing: append &w=WIDTH&q=QUALITY to raw URL
      // IMPORTANT: Keep the ixid parameter for Unsplash tracking
      raw: photo.urls.raw,
    },
    // Attribution (REQUIRED by TOS)
    attribution: {
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profile_url: `https://unsplash.com/@${photo.user.username}?utm_source=${appName}&utm_medium=referral`,
      },
      unsplash_url: `https://unsplash.com/?utm_source=${appName}&utm_medium=referral`,
      photo_url: `https://unsplash.com/photos/${photo.id}?utm_source=${appName}&utm_medium=referral`,
      // Pre-formatted HTML for convenience
      html: `Photo by <a href="https://unsplash.com/@${photo.user.username}?utm_source=${appName}&utm_medium=referral">${photo.user.name}</a> on <a href="https://unsplash.com/?utm_source=${appName}&utm_medium=referral">Unsplash</a>`,
    },
    // Download tracking URL (client MUST call this when user selects photo)
    download_tracking_url: photo.links.download_location,
  };
}
```

### Cache Table Schema
```sql
-- Source: Standard PostgreSQL cache table pattern
CREATE TABLE IF NOT EXISTS unsplash_search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  per_page INTEGER NOT NULL DEFAULT 20,
  orientation TEXT,
  total_results INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  unsplash_rate_limit INTEGER,
  unsplash_rate_remaining INTEGER,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for fast cache lookups
CREATE INDEX idx_unsplash_cache_key ON unsplash_search_cache(cache_key);
-- Index for cache expiry cleanup
CREATE INDEX idx_unsplash_cache_expires ON unsplash_search_cache(expires_at);
```

### Rate Limit Table Schema
```sql
-- Source: Database-backed sliding window rate limiting pattern
CREATE TABLE IF NOT EXISTS unsplash_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tenant_id, window_start)
);

CREATE INDEX idx_unsplash_rate_tenant ON unsplash_rate_limits(tenant_id, window_start);

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION check_unsplash_rate_limit(
  p_tenant_id UUID,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_allowed INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Truncate to current hour for sliding window
  v_window_start := date_trunc('hour', now());

  -- Upsert: increment if exists, insert if not
  INSERT INTO unsplash_rate_limits (tenant_id, window_start, request_count)
  VALUES (p_tenant_id, v_window_start, 1)
  ON CONFLICT (tenant_id, window_start)
  DO UPDATE SET request_count = unsplash_rate_limits.request_count + 1
  RETURNING unsplash_rate_limits.request_count INTO v_count;

  -- Return result
  RETURN QUERY SELECT
    v_count <= p_max_requests,
    v_count,
    p_max_requests,
    EXTRACT(EPOCH FROM (v_window_start + interval '1 hour' - now()))::INTEGER;
END;
$$;
```

### Client-Side Service Layer
```javascript
// Source: Pattern based on existing BizScreen service structure
// File: src/services/unsplashProxyService.js

import { supabase } from '../supabase.js';

const APP_NAME = 'bizscreen';

/**
 * Search Unsplash photos via the server-side proxy.
 * @param {string} query - Search term
 * @param {object} options - Search options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.perPage=20] - Results per page (max 30)
 * @param {string} [options.orientation] - landscape, portrait, or squarish
 * @returns {Promise<{photos: Array, pagination: object, cached: boolean}>}
 */
export async function searchPhotos(query, { page = 1, perPage = 20, orientation } = {}) {
  const { data, error } = await supabase.functions.invoke('unsplash-proxy', {
    body: {
      action: 'search',
      query,
      page,
      per_page: perPage,
      orientation,
    },
  });

  if (error) throw new Error(`Unsplash search failed: ${error.message}`);
  if (!data.ok) throw new Error(data.error?.message || 'Unknown proxy error');

  return data.data;
}

/**
 * Track a photo download event per Unsplash TOS.
 * MUST be called when user selects/inserts a photo into their design.
 * Fire-and-forget -- do not await or block on result.
 * @param {string} photoId - Unsplash photo ID
 * @param {string} downloadTrackingUrl - The download_location URL from search results
 */
export function trackDownload(photoId, downloadTrackingUrl) {
  supabase.functions.invoke('unsplash-proxy', {
    body: {
      action: 'track-download',
      photo_id: photoId,
      download_location: downloadTrackingUrl,
    },
  }).catch((err) => {
    console.warn('[Unsplash] Download tracking failed:', err.message);
  });
}
```

### CORS Shared Module
```typescript
// Source: Supabase CORS docs (https://supabase.com/docs/guides/functions/cors)
// File: supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unsplash-js` npm package | Raw `fetch` to Unsplash REST API | January 2026 (package archived) | Must not install `unsplash-js`; use direct HTTP calls |
| Separate Deno imports (`deno.land/x/`) | npm specifier (`npm:@supabase/supabase-js@2`) | Deno 2.x / Supabase 2024+ | Import npm packages with `npm:` prefix in Edge Functions |
| `verify_jwt` function config | Manual JWT verification via `auth.getUser()` | Supabase 2025+ | More control, compatible with new JWT signing keys |
| Multiple small Edge Functions | "Fat functions" pattern | Supabase 2024+ recommendation | Fewer cold starts, shared logic, simpler deployment |
| Upstash Redis for caching | Database-backed cache (for simple cases) | Always valid for low-volume | Avoids external dependency; sufficient for search result caching at BizScreen scale |

**Deprecated/outdated:**
- `unsplash-js` npm package: Archived January 2026. Do not install. Use raw HTTP fetch.
- `@supabase/supabase-js/cors` import: Available in v2.95.0+ but BizScreen uses v2.80.0. Use the `_shared/cors.ts` pattern instead.

## Unsplash API Reference (Key Details)

### Authentication
- Header: `Authorization: Client-ID YOUR_ACCESS_KEY`
- Only JSON requests to `api.unsplash.com` count against rate limits
- Image file requests to `images.unsplash.com` do NOT count

### Search Endpoint
- `GET /search/photos?query=TERM&page=1&per_page=20`
- Maximum `per_page`: 30
- Response fields: `total`, `total_pages`, `results[]`
- Each result includes: `id`, `urls`, `user`, `links`, `description`, `alt_description`, `color`, `width`, `height`

### Rate Limiting
- Demo: 50 requests/hour (new applications)
- Production: 5,000 requests/hour (after approval)
- Response headers: `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`
- Apply for production access immediately -- review takes days to weeks

### Image URL Sizing
- `urls.thumb`: 200px wide
- `urls.small`: 400px wide
- `urls.regular`: 1080px wide
- `urls.full`: Original resolution
- `urls.raw`: Base URL for dynamic resizing with `&w=WIDTH&h=HEIGHT&q=QUALITY&fm=FORMAT&fit=FIT&crop=CROP`
- **IMPORTANT:** Keep the `ixid` parameter when manipulating URLs (required for Unsplash tracking)

### Four Mandatory Compliance Requirements
1. **Attribution:** Display "Photo by [Name] on Unsplash" with UTM-linked profile URL (`?utm_source=bizscreen&utm_medium=referral`)
2. **Hotlinking:** Use `images.unsplash.com` URLs directly. Never re-host to S3/CloudFront. Exception: derivative creative images (remixed/modified).
3. **Download tracking:** Hit `photo.links.download_location` when user "uses" a photo (selects/inserts, not just views). Fire asynchronously. Include `client_id` parameter.
4. **No user re-authentication:** Users must not need to create Unsplash accounts. BizScreen proxies the API.

## Supabase Edge Function Reference (Key Details)

### Limits
- Max execution duration: 150s (free) / 400s (paid)
- Max CPU time: 2s per request
- Max memory: 256MB
- Max function bundle size: 20MB
- Max secrets per project: 100
- Functions per project: 100 (free) / 500 (pro)

### Environment Variables Available
- `SUPABASE_URL` -- Project URL (auto-set)
- `SUPABASE_ANON_KEY` -- Anon key (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` -- Service role key (auto-set)
- `UNSPLASH_ACCESS_KEY` -- Must be set via `supabase secrets set`

### Client Invocation
```javascript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* JSON payload */ },
  method: 'POST', // default
});
```
- Auth header is auto-attached from current session
- Response is auto-parsed based on Content-Type

## Recommendations for Discretion Areas

### API Response Shape (RECOMMENDED)
Return a structured envelope with photo data pre-shaped for TOS compliance:
```json
{
  "ok": true,
  "data": {
    "photos": [
      {
        "id": "abc123",
        "description": "A coffee shop interior",
        "color": "#6E4A34",
        "width": 4000,
        "height": 2667,
        "urls": { "thumb": "...", "small": "...", "regular": "...", "full": "...", "raw": "..." },
        "attribution": {
          "photographer": { "name": "Jane Doe", "username": "janedoe", "profile_url": "..." },
          "unsplash_url": "...",
          "photo_url": "...",
          "html": "Photo by <a href=\"...\">Jane Doe</a> on <a href=\"...\">Unsplash</a>"
        },
        "download_tracking_url": "https://api.unsplash.com/photos/abc123/download?ixid=..."
      }
    ],
    "pagination": { "total": 1234, "total_pages": 62, "page": 1, "per_page": 20 }
  },
  "meta": { "cached": false, "upstream_rate_remaining": 4950 }
}
```

### Caching Behavior (RECOMMENDED)
- **Cache layer:** Supabase PostgreSQL table (`unsplash_search_cache`)
- **TTL:** 24 hours (hard expiry, not stale-while-revalidate). Meets success criteria and keeps implementation simple.
- **Cache key:** Normalized JSON of search parameters: `SHA-256(JSON.stringify({ query: query.toLowerCase().trim(), page, per_page, orientation }))` or a simpler deterministic string.
- **Cache lookup:** Check `unsplash_search_cache` where `cache_key = key AND expires_at > now()`.
- **Cache write:** After successful Unsplash API call, upsert into cache table with results as JSONB.
- **Cache cleanup:** Periodic deletion of expired rows via a scheduled SQL or on-read deletion (delete expired rows when checking cache).

### Rate Limiting Design (RECOMMENDED)
- **Per-tenant limit:** 100 requests/hour (configurable). This is well below Unsplash's 5,000/hr production limit but protects against a single tenant monopolizing the shared quota.
- **Window:** Hourly, truncated to the hour boundary (simpler than true sliding window, adequate for this use case).
- **Burst:** No special burst allowance. The hourly window is generous enough.
- **Error response:** HTTP 429 with `retry_after_seconds` in the response body.
- **Backoff signal:** Include `retry_after_seconds` (seconds until window resets) in the error response.
- **Implementation:** SQL function `check_unsplash_rate_limit()` that atomically increments and checks.

### Offline/Player Conflict (RECOMMENDED)
- **Phase 46 scope:** Document the limitation. Return Unsplash CDN URLs as required by TOS. Do not attempt to solve the offline player problem in this phase.
- **Recommendation for Phase 49:** Accept the limitation for v3.0. Unsplash images in designs will require internet connectivity on the player. Mark Unsplash-sourced images with a metadata flag so the player can show a fallback placeholder when offline. This is preferable to violating TOS or adding Pexels complexity in v3.0.
- **Future option:** Contact Unsplash about their "photo views beacon alternative" mentioned in the hotlinking guideline. This might allow self-hosting with a tracking pixel.
- **The derivative work exception:** If a user modifies an Unsplash image (crops, overlays text, applies filters) in the editor, the result is a derivative work and does NOT need to be hotlinked per the exception in the hotlinking guideline. This could be leveraged -- but only for genuinely modified images.

## Open Questions

1. **Tenant ID extraction from JWT**
   - What we know: Users authenticate via Supabase Auth. The Edge Function receives the JWT in the `Authorization` header.
   - What's unclear: How is `tenant_id` stored? Is it in `user.app_metadata.tenant_id`, in a `profiles` table, or derived from `user.id`? This affects how the rate limiter identifies tenants.
   - Recommendation: Check the existing auth/profile setup. If `tenant_id` is in `app_metadata`, extract it directly. If in a profiles table, query it once per request (consider caching this lookup).

2. **Supabase CLI initialization**
   - What we know: The project has no `supabase/` directory yet. The CLI is available via npx (v2.76.7).
   - What's unclear: Whether `npx supabase init` needs to be run first, and how that interacts with the existing Supabase project configuration.
   - Recommendation: Run `npx supabase init` to create the `supabase/` directory structure. Link to the existing project with `npx supabase link --project-ref <ref>`.

3. **Migration numbering convention**
   - What we know: Existing migrations use numeric prefixes (e.g., `060_seed_test_data.sql`, `141_...`).
   - What's unclear: Whether Supabase CLI migrations use the same numbering or timestamped naming.
   - Recommendation: The Supabase CLI generates timestamped migration files by default. This is compatible with existing migrations.

4. **Production Unsplash API key provisioning**
   - What we know: An Unsplash developer account is needed. Production access requires application review.
   - What's unclear: Whether the team already has an Unsplash developer account.
   - Recommendation: Create the Unsplash developer account and apply for production access as the very first task. This is a blocking dependency with a multi-day lead time.

## Sources

### Primary (HIGH confidence)
- [Unsplash API Documentation](https://unsplash.com/documentation) -- Endpoints, rate limits, auth, pagination, image URL parameters
- [Unsplash Attribution Guideline](https://help.unsplash.com/en/articles/2511315-guideline-attribution) -- Mandatory format with UTM params
- [Unsplash Hotlinking Guideline](https://help.unsplash.com/en/articles/2511271-guideline-hotlinking-images) -- Must use CDN URLs; derivative work exception noted
- [Unsplash Download Tracking Guideline](https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download) -- Must call download_location on user selection
- [Supabase Edge Functions Overview](https://supabase.com/docs/guides/functions) -- Architecture, deployment, fat functions recommendation
- [Supabase Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart) -- CLI commands, directory structure, local dev
- [Supabase Edge Functions CORS](https://supabase.com/docs/guides/functions/cors) -- CORS headers pattern, _shared/cors.ts
- [Supabase Edge Functions Auth](https://supabase.com/docs/guides/functions/auth) -- JWT verification, createClient pattern
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) -- Execution time, memory, bundle size limits
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets) -- `supabase secrets set`, local `.env` pattern
- [Supabase functions.invoke() Reference](https://supabase.com/docs/reference/javascript/functions-invoke) -- Client invocation API, options, error types
- [Supabase Edge Functions HTTP Routing](https://supabase.com/docs/guides/functions/http-methods) -- URLPattern API, method routing
- [unsplash-js GitHub (archived)](https://github.com/unsplash/unsplash-js) -- Confirmed archived January 2026

### Secondary (MEDIUM confidence)
- [Supabase Edge Functions Rate Limiting Example](https://supabase.com/docs/guides/functions/examples/rate-limiting) -- Upstash Redis approach (we use DB instead but pattern is informative)
- [Upstash Ratelimit for Deno](https://deno.land/x/upstash_ratelimit) -- Reference for sliding window algorithm (applied to DB approach)
- [Supabase Edge Functions Query Params Discussion](https://github.com/orgs/supabase/discussions/19816) -- Confirmed `functions.invoke()` limitations with GET query params; POST body is the reliable pattern
- [BizScreen v3.0 Project Research Summary](/.planning/research/SUMMARY.md) -- Phase ordering rationale, architecture approach
- [BizScreen v3.0 Pitfalls Research](/.planning/research/PITFALLS-V3.md) -- Unsplash compliance risks, iframe boundary, hotlinking conflict

### Tertiary (LOW confidence)
- Unsplash API Terms page content could not be fully extracted (CSS/JS only). Terms verified via individual guideline pages instead.
- Database-backed rate limiting without Upstash: pattern assembled from multiple community discussions, not a single authoritative source. The SQL function approach should be validated with load testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Supabase Edge Functions and Unsplash REST API are well-documented; existing project already uses Supabase
- Architecture: HIGH -- Fat function pattern is officially recommended by Supabase; POST-based invocation is verified as the reliable approach
- Unsplash TOS compliance: HIGH -- Four requirements verified from individual official guideline pages
- Caching approach: MEDIUM -- Database-backed cache is standard PostgreSQL pattern but not the Supabase-recommended approach (they suggest Upstash Redis); adequate for this scale
- Rate limiting: MEDIUM -- Database-backed rate limiting is simpler but less battle-tested than Upstash; SQL atomic upsert pattern is sound but should be load-tested
- Offline/player conflict: MEDIUM -- Unsplash terms are silent on offline caching; derivative work exception is documented but scope is unclear

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable APIs, unlikely to change)
