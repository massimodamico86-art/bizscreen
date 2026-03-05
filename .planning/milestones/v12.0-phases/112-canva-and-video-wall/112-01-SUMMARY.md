---
phase: 112-canva-and-video-wall
plan: 01
subsystem: database, api
tags: [canva, oauth, video-wall, edge-function, supabase, rls, pkce]

# Dependency graph
requires:
  - phase: 111-documents-and-calendar
    provides: "calendar-proxy Edge Function pattern for server-side API proxying"
provides:
  - "canva_oauth_tokens table for server-side Canva token storage"
  - "video_walls and video_wall_screens tables with grid configuration schema"
  - "canva-proxy Edge Function with 4 actions (exchange_token, list_designs, export_design, check_connection)"
affects: [112-02 Canva UI integration, 112-03 Video Wall UI]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Canva PKCE OAuth via Edge Function proxy", "Export polling with timeout fallback to client-side polling"]

key-files:
  created:
    - supabase/migrations/165_canva_tokens_video_walls.sql
    - supabase/functions/canva-proxy/index.ts
  modified: []

key-decisions:
  - "canva-proxy follows calendar-proxy pattern exactly: JWT auth, corsHeaders, DB-backed tokens, 401 retry"
  - "Token refresh uses 5-minute pre-expiry buffer for proactive renewal"
  - "Export polling returns exportId on timeout for client-side continuation"
  - "video_wall_screens RLS joins through video_walls to user_profiles for tenant check"
  - "Tenant ID resolved from user_profiles for exchange_token (not passed from client)"

patterns-established:
  - "Canva proxy pattern: PKCE exchange + DB upsert on user_id unique constraint"
  - "Export polling pattern: 2s interval, 15 attempts, fallback to job ID return"

requirements-completed: [CANVA-01, CANVA-02, CANVA-04, VWALL-01, VWALL-02]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 112 Plan 01: Canva & Video Wall Backend Summary

**Canva OAuth token storage with PKCE proxy Edge Function (4 actions) plus video wall grid schema with screen position mapping**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T15:28:27Z
- **Completed:** 2026-03-05T15:30:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migration 165 with 3 tables: canva_oauth_tokens, video_walls, video_wall_screens -- all with RLS
- canva-proxy Edge Function handling PKCE token exchange, design listing, async export with polling, and connection check
- Token refresh with 5-minute pre-expiry buffer and 401 retry pattern (matching calendar-proxy)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for Canva tokens and video wall tables** - `d8d8db7` (feat)
2. **Task 2: canva-proxy Edge Function for server-side Canva API calls** - `62d99fd` (feat)

## Files Created/Modified
- `supabase/migrations/165_canva_tokens_video_walls.sql` - 3 tables with RLS policies, constraints, and foreign keys
- `supabase/functions/canva-proxy/index.ts` - Server-side Canva API proxy with token management

## Decisions Made
- canva-proxy follows calendar-proxy pattern: JWT auth via auth.getUser, corsHeaders, DB-backed tokens with refresh
- Token refresh uses 5-minute pre-expiry buffer (proactive, not reactive-only)
- Export polling: 2s interval, max 15 attempts (30s), returns exportId on timeout for client-side fallback
- video_wall_screens RLS policy joins through video_walls table for tenant-based access
- Tenant ID resolved server-side from user_profiles (not sent by client) for exchange_token security

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration** for Canva Connect API:
- `CANVA_CLIENT_ID` - from Canva Developer Portal -> Your App -> Settings
- `CANVA_CLIENT_SECRET` - from Canva Developer Portal -> Your App -> Settings
- Set via: `supabase secrets set CANVA_CLIENT_ID=... CANVA_CLIENT_SECRET=...`
- Redirect URL must be configured in Canva Developer Portal

## Next Phase Readiness
- Database schema and Edge Function ready for Plan 02 (Canva UI integration)
- Video wall schema ready for Plan 03 (Video Wall UI)
- Build passes -- no frontend changes in this plan

---
*Phase: 112-canva-and-video-wall*
*Completed: 2026-03-05*
