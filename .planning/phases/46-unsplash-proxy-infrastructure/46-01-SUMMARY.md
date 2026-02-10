---
phase: 46-unsplash-proxy-infrastructure
plan: 01
subsystem: infra
tags: [supabase, edge-functions, unsplash, deno, caching, rate-limiting, cors, postgresql]

# Dependency graph
requires: []
provides:
  - "Supabase Edge Function infrastructure pattern (directory structure, CORS, secrets)"
  - "unsplash-proxy Edge Function with search and download tracking actions"
  - "Database-backed 24h search result cache (unsplash_search_cache table)"
  - "Per-tenant hourly rate limiting via atomic SQL function (check_unsplash_rate_limit)"
  - "TOS-compliant response shaping with UTM attribution and hotlinked CDN URLs"
affects: [49-stock-assets-in-editor, unsplash, edge-functions, media]

# Tech tracking
tech-stack:
  added: ["Supabase Edge Functions (Deno runtime)", "npm:@supabase/supabase-js@2 (in Edge Function)"]
  patterns: ["Action-based routing in fat Edge Function", "POST body for functions.invoke()", "Database-backed cache with TTL", "Atomic SQL rate limiting via ON CONFLICT upsert", "_shared/ directory for cross-function modules"]

key-files:
  created:
    - supabase/functions/_shared/cors.ts
    - supabase/functions/unsplash-proxy/index.ts
    - supabase/migrations/142_create_unsplash_cache.sql
    - supabase/migrations/143_create_unsplash_rate_limits.sql
  modified: []

key-decisions:
  - "Database-backed cache over Redis/Upstash to avoid external dependency"
  - "Hourly window rate limiting (date_trunc) over sliding window for simplicity"
  - "Graceful degradation: rate limit check failures do not block requests"
  - "Download tracking errors return success to avoid blocking user workflows"

patterns-established:
  - "Edge Function pattern: supabase/functions/{name}/index.ts with Deno.serve()"
  - "Shared modules: supabase/functions/_shared/ prefix prevents standalone deployment"
  - "CORS pattern: shared corsHeaders included in all responses (success, error, OPTIONS)"
  - "Action routing: single function handles multiple actions via POST body { action, ...params }"
  - "Error envelope: { ok: boolean, data?: object, error?: { code, message }, meta?: object }"
  - "Service role client for internal tables, user JWT for identity verification"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 46 Plan 01: Unsplash Proxy Infrastructure Summary

**Supabase Edge Function proxy for Unsplash API with database-backed 24h caching, per-tenant rate limiting, and TOS-compliant attribution**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T22:38:15Z
- **Completed:** 2026-02-10T22:43:00Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Created BizScreen's first Edge Function, establishing the infrastructure pattern for all future functions
- Built complete Unsplash proxy with search (cache-aware) and download tracking (TOS-compliant) actions
- Database-backed caching with normalized cache keys prevents redundant API calls within 24h TTL
- Atomic per-tenant rate limiting via SQL function handles concurrent requests safely
- API key stays server-side (Deno.env only) -- never exposed to browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migrations for cache and rate limiting** - `78af67e` (feat)
2. **Task 2: Create CORS shared module and Edge Function handler** - `179f645` (feat)

## Files Created/Modified
- `supabase/migrations/142_create_unsplash_cache.sql` - Cache table with JSONB results, unique cache_key, 24h TTL via expires_at
- `supabase/migrations/143_create_unsplash_rate_limits.sql` - Rate limit table with atomic check_unsplash_rate_limit function
- `supabase/functions/_shared/cors.ts` - Shared CORS headers for Edge Functions (authorization, x-client-info, apikey, content-type)
- `supabase/functions/unsplash-proxy/index.ts` - Complete proxy: JWT auth, action routing, search with cache/rate-limit, download tracking

## Decisions Made
- **Database cache over Redis:** Avoids external dependency (Upstash/Redis). PostgreSQL is already available in Edge Functions via service role. Sufficient for search result caching at BizScreen's scale.
- **Hourly window rate limiting:** Uses `date_trunc('hour', now())` for simplicity. Not a true sliding window, but adequate for per-tenant throttling at 100 req/hr default.
- **Graceful degradation on infrastructure failure:** Rate limit check errors and download tracking errors do not block user requests. Logged for monitoring but non-fatal.
- **Normalized cache keys via JSON.stringify:** Lowercase, trim, collapse whitespace. Ensures "Coffee Shop" and "coffee shop" hit the same cache entry.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration:**
- Create Unsplash developer account at https://unsplash.com/developers
- Create a new application and accept TOS
- Copy the Access Key (not Secret Key)
- Set the secret: `npx supabase secrets set UNSPLASH_ACCESS_KEY=your_key_here`
- Apply for Production access immediately (demo mode: 50 req/hr; production: 5,000 req/hr; review takes days to weeks)

## Next Phase Readiness
- Edge Function infrastructure pattern established -- future functions follow the same directory structure and CORS module
- Plan 02 (client service layer) can now build the frontend integration that calls this proxy via `supabase.functions.invoke()`
- Unsplash API key must be provisioned before end-to-end testing

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (78af67e, 179f645) verified in git log.

---
*Phase: 46-unsplash-proxy-infrastructure*
*Completed: 2026-02-10*
