---
phase: 52-rss-external-data-proxy
plan: 01
subsystem: infra, api
tags: [rss, atom, xml, edge-function, fast-xml-parser, sanitize-html, caching, proxy]

# Dependency graph
requires:
  - phase: 51-data-table-widget
    provides: "Widget pipeline, DATA_SOURCE_TYPES pattern, Edge Function infrastructure (unsplash-proxy)"
provides:
  - "rss-proxy Edge Function: server-side RSS/Atom fetch, parse, sanitize"
  - "rss_feed_cache DB table with TTL and conditional GET support"
  - "rssFeedService.js: client service for calling rss-proxy"
  - "RSS_FEED data source type in dataSourceService.js"
affects: [52-02 (RSS ticker/card player widgets), 52-03 (RSS admin UI/editor controls)]

# Tech tracking
tech-stack:
  added: [fast-xml-parser@5 (Edge Function), sanitize-html@2 (Edge Function)]
  patterns: [RSS/Atom dual-format parsing, conditional GET caching, server-side HTML sanitization]

key-files:
  created:
    - supabase/functions/rss-proxy/index.ts
    - supabase/migrations/144_create_rss_feed_cache.sql
    - src/services/rssFeedService.js
  modified:
    - src/services/dataSourceService.js

key-decisions:
  - "fast-xml-parser + sanitize-html via npm: specifiers for Deno Edge Function (pure JS, no native deps)"
  - "15-minute cache TTL with conditional GET (ETag/If-Modified-Since) for efficient feed refresh"
  - "RSS_FEED as data source type for admin UI consistency, but feed data cached in separate rss_feed_cache table"

patterns-established:
  - "RSS proxy pattern: fetch -> conditional GET check -> parse XML -> sanitize HTML -> cache upsert"
  - "Dual-format feed parsing: check parsed.rss.channel (RSS 2.0) then parsed.feed (Atom)"
  - "Image extraction priority: media:content > enclosure > inline img regex"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 52 Plan 01: RSS Proxy Edge Function Summary

**Server-side RSS/Atom proxy Edge Function with fast-xml-parser, sanitize-html, and database-backed caching via rss_feed_cache table**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T16:38:48Z
- **Completed:** 2026-02-12T16:41:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- rss-proxy Edge Function that fetches, parses (RSS 2.0 + Atom), and sanitizes external feeds server-side
- Database-backed caching with 15-minute TTL, conditional GET (ETag/If-Modified-Since), and 304 Not Modified handling
- Image extraction from media:content, media:thumbnail, enclosure, and inline HTML img tags
- Client-side rssFeedService with fetchRssFeed() and validateRssUrl() for downstream widget consumption
- RSS_FEED added to DATA_SOURCE_TYPES for admin UI integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create rss-proxy Edge Function and rss_feed_cache migration** - `4662708` (feat)
2. **Task 2: Create rssFeedService and add RSS_FEED to data source types** - `69d00e6` (feat)

## Files Created/Modified
- `supabase/functions/rss-proxy/index.ts` - Edge Function: fetch, parse, sanitize RSS/Atom feeds with caching
- `supabase/migrations/144_create_rss_feed_cache.sql` - Database table for caching parsed RSS feed data with TTL
- `src/services/rssFeedService.js` - Client service for calling rss-proxy Edge Function
- `src/services/dataSourceService.js` - Added RSS_FEED to DATA_SOURCE_TYPES

## Decisions Made
- Used fast-xml-parser@5 and sanitize-html@2 via Deno npm: specifiers (pure JS, no native deps, no DOM required)
- 15-minute cache TTL with conditional GET support to balance freshness vs. external request volume
- RSS_FEED added as data source type for admin UI consistency; feed items stored in separate rss_feed_cache table (not data_source_rows) because RSS item schema is fixed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The rss-proxy Edge Function uses the existing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables already configured for Edge Functions.

## Next Phase Readiness
- RSS proxy service layer complete, ready for plan 52-02 (RSS ticker and card player widgets)
- rssFeedService.fetchRssFeed() provides the data interface for RssTickerWidget and RssCardWidget
- RSS_FEED data source type ready for plan 52-03 (admin UI integration)

## Self-Check: PASSED

All 4 files verified present. All 2 commit hashes verified in git log. RSS_FEED type confirmed in dataSourceService.

---
*Phase: 52-rss-external-data-proxy*
*Completed: 2026-02-12*
