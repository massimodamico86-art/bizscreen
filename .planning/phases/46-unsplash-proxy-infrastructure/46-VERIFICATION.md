---
phase: 46-unsplash-proxy-infrastructure
verified: 2026-02-10T22:48:07Z
status: human_needed
score: 5/5
re_verification: false
human_verification:
  - test: "Search Unsplash photos via proxy"
    expected: "Returns photo results with thumbnails, full URLs, attribution"
    why_human: "Requires UNSPLASH_ACCESS_KEY to be set and Edge Function deployment"
  - test: "Verify cache effectiveness"
    expected: "Repeated searches return cached results within 24h"
    why_human: "Requires multiple API calls and time-based cache verification"
  - test: "Trigger rate limiting"
    expected: "101st request in an hour returns 429 with retry message"
    why_human: "Requires generating 100+ requests in one hour"
  - test: "Download tracking TOS compliance"
    expected: "Unsplash receives tracking call when photo selected"
    why_human: "Requires monitoring Unsplash API calls or checking Unsplash analytics"
---

# Phase 46: Unsplash Proxy Infrastructure Verification Report

**Phase Goal:** Users can access Unsplash stock photos through a secure, compliant, and rate-limited server-side proxy — without the API key ever reaching the browser.

**Verified:** 2026-02-10T22:48:07Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Searching for a term via the proxy returns Unsplash photo results with thumbnails and full-size URLs | ? NEEDS_HUMAN | Code implements search endpoint with URL mapping (thumb, small, regular, full, raw) from Unsplash API response. Requires API key setup and deployment to test end-to-end. |
| 2 | Photo results include photographer name, profile URL with UTM params, and photo page link per Unsplash TOS | ✓ VERIFIED | `shapePhoto()` function (lines 84-114) builds attribution object with photographer name, username, profile_url with `utm_source=bizscreen&utm_medium=referral`, photo_url, and pre-formatted HTML attribution string. |
| 3 | Repeated identical searches within 24 hours are served from cache (no Unsplash API call) | ✓ VERIFIED | Cache check (lines 194-229) queries `unsplash_search_cache` with normalized cache key, returns cached results if `expires_at > now()`. Cache write (lines 289-310) upserts with 24h TTL. |
| 4 | A single tenant making excessive requests gets rate-limited with a clear error message | ✓ VERIFIED | Rate limit check (lines 168-192) calls `check_unsplash_rate_limit()` SQL function, returns 429 with message "Too many requests. You have made X of 100 allowed requests this hour. Please try again later." plus retry_after_seconds. |
| 5 | The Unsplash API key never reaches the browser | ✓ VERIFIED | API key accessed only via `Deno.env.get('UNSPLASH_ACCESS_KEY')` in Edge Function (lines 232, 364). Client service (`unsplashProxyService.js`) calls Edge Function via `supabase.functions.invoke()` — no direct Unsplash API access, no key reference. |
| 6 | Frontend code can search Unsplash photos through the proxy without knowing the API key | ✓ VERIFIED | `searchPhotos()` function (lines 36-73) calls Edge Function with search params, returns shaped response. No API key in client code. |
| 7 | Frontend code can trigger download tracking when a user selects a photo | ✓ VERIFIED | `trackDownload()` function (lines 86-105) fires-and-forgets Edge Function call with download_location. Never throws, logs failures at warn level. |
| 8 | Error responses from the proxy are surfaced with meaningful messages | ✓ VERIFIED | Client service handles RATE_LIMITED errors with user-friendly retry message (lines 57-61), surfaces other proxy errors (lines 63-65). Edge Function returns structured error envelopes with code and message. |

**Score:** 5/5 infrastructure truths verified (Truths 1 requires user setup and deployment for end-to-end verification; all others verified via code analysis)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/unsplash-proxy/index.ts` | Edge Function handling search, download tracking, caching, rate limiting | ✓ VERIFIED | 473 lines (min 120). Implements Deno.serve handler with JWT auth, action routing (search/track-download), cache-aware search, TOS-compliant response shaping, rate limiting via SQL function. |
| `supabase/functions/_shared/cors.ts` | CORS headers shared across Edge Functions | ✓ VERIFIED | 15 lines (min 4). Exports `corsHeaders` with Access-Control-Allow-Origin (*), Access-Control-Allow-Headers (authorization, x-client-info, apikey, content-type), Max-Age (86400). |
| `supabase/migrations/142_create_unsplash_cache.sql` | Cache table for search results with TTL | ✓ VERIFIED | 34 lines. Creates `unsplash_search_cache` table with cache_key (UNIQUE), query, page, per_page, orientation, results (JSONB), expires_at (24h TTL). Indexes on cache_key and expires_at. |
| `supabase/migrations/143_create_unsplash_rate_limits.sql` | Rate limit tracking table and atomic check function | ✓ VERIFIED | 61 lines. Creates `unsplash_rate_limits` table with UNIQUE(tenant_id, window_start). Function `check_unsplash_rate_limit()` atomically upserts counter, returns (allowed, current_count, max_allowed, retry_after_seconds). |
| `src/services/unsplashProxyService.js` | Client-side service for Unsplash proxy Edge Function | ✓ VERIFIED | 105 lines (min 40). Exports `searchPhotos()` and `trackDownload()`. Uses supabase.functions.invoke() to call 'unsplash-proxy'. Scoped logger, JSDoc, rate limit error handling. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Edge Function | Unsplash API | fetch with Client-ID header | ✓ WIRED | Line 257: `Authorization: Client-ID ${accessKey}` where accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY') |
| Edge Function | unsplash_search_cache table | supabaseAdmin client | ✓ WIRED | Lines 203 (select), 294 (upsert). Cache check queries by cache_key and expires_at. Cache write upserts shaped results. |
| Edge Function | check_unsplash_rate_limit function | supabaseAdmin.rpc | ✓ WIRED | Line 170: `supabaseAdmin.rpc('check_unsplash_rate_limit', { p_tenant_id, p_max_requests })` |
| Edge Function | CORS module | import statement | ✓ WIRED | Line 19: `import { corsHeaders } from '../_shared/cors.ts'`. Used in jsonResponse() and OPTIONS handler. |
| Client service | Edge Function | supabase.functions.invoke | ✓ WIRED | Lines 41, 93: `supabase.functions.invoke(FUNCTION_NAME, { body: {...} })` where FUNCTION_NAME = 'unsplash-proxy' |
| Client service | supabase | import statement | ✓ WIRED | Line 19: `import { supabase } from '../supabase.js'` |

### Requirements Coverage

N/A — Phase 46 is infrastructure setup, not mapped to specific requirements in REQUIREMENTS.md.

### Anti-Patterns Found

**None detected.**

Scanned files:
- `supabase/functions/unsplash-proxy/index.ts` (473 lines)
- `supabase/functions/_shared/cors.ts` (15 lines)
- `supabase/migrations/142_create_unsplash_cache.sql` (34 lines)
- `supabase/migrations/143_create_unsplash_rate_limits.sql` (61 lines)
- `src/services/unsplashProxyService.js` (105 lines)

Checks performed:
- No TODO/FIXME/PLACEHOLDER comments
- No empty implementations (return null, return {}, return [])
- No console.log-only handlers
- No direct Unsplash API calls in client code
- No API key exposure (VITE_ prefix check passed)
- No archived library usage (unsplash-js check passed)

### Human Verification Required

#### 1. End-to-End Photo Search

**Test:** 
1. Set Unsplash API key: `npx supabase secrets set UNSPLASH_ACCESS_KEY=your_key_here`
2. Deploy Edge Function: `npx supabase functions deploy unsplash-proxy`
3. In a component, import and call: `const { photos, pagination } = await searchPhotos('coffee shop', { orientation: 'landscape' })`
4. Verify response includes photos array with:
   - `urls.thumb`, `urls.small`, `urls.regular`, `urls.full`
   - `attribution.photographer.name`, `attribution.photographer.profile_url` (with utm_source=bizscreen)
   - `attribution.html` (pre-formatted attribution string)
   - `download_tracking_url`

**Expected:** Search returns Unsplash photos with all required fields. Attribution links include UTM parameters.

**Why human:** Requires Unsplash API key setup, Edge Function deployment, and runtime verification of external API integration.

#### 2. Cache Behavior Verification

**Test:**
1. Search for "beach sunset" (first call)
2. Note the response time and `meta.cached` flag (should be false)
3. Immediately search for "beach sunset" again (second call)
4. Note the response time and `meta.cached` flag (should be true)
5. Verify `meta.cache_age_seconds` is small (< 5 seconds)
6. Check database: `SELECT cache_key, cached_at, expires_at FROM unsplash_search_cache WHERE query = 'beach sunset'`
7. Verify expires_at is ~24 hours after cached_at

**Expected:** Second identical search within 24h returns cached results (faster, meta.cached=true). No Unsplash API call made on cache hit.

**Why human:** Requires observing time-based behavior, comparing response times, and inspecting database state.

#### 3. Rate Limiting Enforcement

**Test:**
1. Create a script that calls `searchPhotos()` in a loop
2. Make 100 requests within one hour (use unique search terms to avoid cache hits)
3. On the 101st request, expect error: "Too many requests. Please try again in X minutes."
4. Verify error includes `retry_after_seconds` field
5. Wait for the hour window to reset
6. Verify next request succeeds

**Expected:** Rate limiting kicks in at 101 requests per tenant per hour. Error message is user-friendly with retry timing.

**Why human:** Requires generating high request volume, observing throttling behavior over time.

#### 4. Download Tracking TOS Compliance

**Test:**
1. Search for photos
2. Select a photo (simulate user clicking "Insert")
3. Call `trackDownload(photo.id, photo.download_tracking_url)`
4. Check Edge Function logs for: "Download tracked for photo: {photoId}"
5. (Optional) Check Unsplash Developer Dashboard → Analytics to verify download count incremented

**Expected:** `trackDownload()` calls the Edge Function which calls Unsplash's download endpoint. Tracking failures are logged but never thrown.

**Why human:** Requires monitoring external API calls (Unsplash download endpoint) or checking Unsplash analytics dashboard. Fire-and-forget pattern means no programmatic verification of success.

---

## Summary

**All infrastructure artifacts verified.** Phase 46 successfully establishes:

1. **Edge Function Pattern:** First Edge Function in BizScreen with Deno.serve, action routing, CORS handling, JWT auth, service role database access
2. **Database-Backed Caching:** 24h TTL with normalized cache keys prevents redundant Unsplash API calls
3. **Per-Tenant Rate Limiting:** Atomic SQL function with hourly windows and clear retry messaging
4. **TOS-Compliant Attribution:** UTM parameters, hotlinked CDN URLs, pre-formatted HTML attribution
5. **Secure API Key Management:** Key stays server-side (Deno.env), never exposed to browser
6. **Client Service Layer:** Clean `searchPhotos()` and `trackDownload()` API ready for Phase 49 integration

**User setup required before deployment:**
- Unsplash developer account creation
- Application creation and TOS acceptance
- Access Key provisioned via `npx supabase secrets set UNSPLASH_ACCESS_KEY=your_key_here`
- Production access application (demo mode: 50 req/hr, production: 5,000 req/hr)

**Next Phase Readiness:**
Phase 49 (Stock Assets in Editor) can import `unsplashProxyService` and integrate with Polotno editor. Infrastructure is complete and awaiting integration.

**Commits verified:**
- `78af67e` — Database migrations (cache + rate limit tables)
- `179f645` — CORS module + Edge Function handler
- `7fd190d` — Client service layer

---

_Verified: 2026-02-10T22:48:07Z_
_Verifier: Claude (gsd-verifier)_
