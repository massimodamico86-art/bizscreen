---
phase: 110-enterprise-platform
plan: 02
subsystem: api
tags: [rest-api, edge-function, supabase, deno, s3, presigned-url, rate-limiting, api-tokens, sha256, aws-sig-v4]

# Dependency graph
requires:
  - phase: 031-public-api-and-webhooks
    provides: "api_tokens table, validate_api_token RPC, apiTokenService.js, DeveloperSettingsPage"
  - phase: 116-api-rate-limiting
    provides: "check_rate_limit RPC with advisory lock and configurable window"
provides:
  - "9-endpoint REST API gateway Edge Function (supabase/functions/api-gateway/index.ts)"
  - "8 tenant-scoped SECURITY DEFINER RPCs for screens, playlists, media CRUD"
  - "API Documentation tab in DeveloperSettingsPage with endpoint reference"
  - "Presigned S3 upload URL generation via AWS Signature V4"
affects: [110-enterprise-platform, developer-settings, external-integrations]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Edge Function API gateway with route table", "SHA-256 token hashing for API auth", "AWS Signature V4 presigned URLs in Deno/Web Crypto", "SECURITY DEFINER RPCs with p_tenant_id for tenant isolation"]

key-files:
  created:
    - "supabase/migrations/161_api_gateway_rpcs.sql"
    - "supabase/functions/api-gateway/index.ts"
  modified:
    - "src/pages/DeveloperSettingsPage.jsx"

key-decisions:
  - "Used correct column names from actual schema: device_name (not name), assigned_playlist_id (not current_playlist_id), no device_type column on tv_devices"
  - "Presigned URL generation in Edge Function (not RPC) because AWS Signature V4 HMAC computation belongs in application layer"
  - "Rate limiter fails open (logs error but allows request) to avoid blocking API on rate-limit infrastructure failure"
  - "file_size stored as INTEGER in media_assets (matching existing schema), cast from BIGINT parameter"

patterns-established:
  - "API Gateway pattern: single Edge Function routes to tenant-scoped RPCs via route table"
  - "Token auth pattern: SHA-256 hash of raw token -> validate_api_token RPC -> extract owner_id as tenant_id"
  - "Scope-based authorization: each route declares required scope, checked against token scopes array"

requirements-completed: [API-01, API-02, API-03, API-04, API-05, API-06, API-07]

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 110 Plan 02: API Gateway Summary

**Public REST API gateway Edge Function with 9 endpoints, SHA-256 token auth, rate limiting, presigned S3 uploads, and API documentation tab**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T18:37:34Z
- **Completed:** 2026-03-04T18:44:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 8 tenant-scoped SECURITY DEFINER RPCs for screens, playlists, and media CRUD operations
- Edge Function API gateway with token validation, rate limiting, scope authorization, and 9 REST endpoints
- Presigned S3 upload URL generation using AWS Signature V4 with Web Crypto API
- API Documentation tab in DeveloperSettingsPage with base URL, auth instructions, endpoint reference, and error codes

## Task Commits

Each task was committed atomically:

1. **Task 1: API gateway RPCs and Edge Function** - `f67a0ca` (feat)
2. **Task 2: API documentation tab in Developer Settings** - `f46b067` (feat, co-committed with 110-03 routing changes)

## Files Created/Modified
- `supabase/migrations/161_api_gateway_rpcs.sql` - 8 tenant-scoped RPCs: api_list_screens, api_get_screen, api_list_playlists, api_get_playlist, api_update_playlist, api_list_media, api_update_screen_assignment, api_create_media_record
- `supabase/functions/api-gateway/index.ts` - Edge Function: token validation via SHA-256 + validate_api_token, rate limiting via check_rate_limit, scope authorization, URL routing, presigned S3 URL generation, response formatting
- `src/pages/DeveloperSettingsPage.jsx` - Added "API Documentation" tab with base URL, authentication, rate limiting, 9 endpoint reference cards, pagination docs, media upload flow, error codes table

## Decisions Made
- **Correct column names:** Used `device_name` (not `name`), `assigned_playlist_id` (not `current_playlist_id`) based on actual tv_devices schema; omitted non-existent `device_type` column
- **Presigned URL in Edge Function:** AWS Signature V4 HMAC computation done in TypeScript (not PL/pgSQL) because cryptographic key material belongs in application layer
- **Rate limiter fails open:** If check_rate_limit RPC errors, requests are allowed through (with error logging) to avoid availability impact from rate-limit infrastructure failures
- **file_size cast:** Parameter accepts BIGINT but casts to INTEGER for INSERT since media_assets.file_size column is INTEGER

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected column names for tv_devices table**
- **Found during:** Task 1 (API gateway RPCs)
- **Issue:** Plan referenced `name`, `current_playlist_id`, `device_type` columns which don't exist on tv_devices. Actual columns are `device_name`, `assigned_playlist_id`, and no device_type column.
- **Fix:** Used correct column names from schema inspection of migrations 001, 0041, 014, 147
- **Files modified:** supabase/migrations/161_api_gateway_rpcs.sql
- **Verification:** RPCs reference only existing columns
- **Committed in:** f67a0ca (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for correctness. RPCs must reference actual database columns.

## Issues Encountered
- Task 2 DeveloperSettingsPage changes were committed together with 110-03 plan changes (interleaved execution). Content is correct and verified.

## User Setup Required
None - no external service configuration required. S3 credentials (S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) must be set in Edge Function environment when deploying to production.

## Next Phase Readiness
- API gateway ready for deployment via `supabase functions deploy api-gateway`
- All endpoints tested via verification checks
- Builds on existing token management infrastructure (no breaking changes)

## Self-Check: PASSED

All files verified present. All commits verified in history.

---
*Phase: 110-enterprise-platform*
*Completed: 2026-03-04*
