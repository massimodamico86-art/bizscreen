---
phase: 11-gdpr-compliance
plan: 01
subsystem: database
tags: [gdpr, data-export, article-20, rpc, jsonb, supabase]

# Dependency graph
requires:
  - phase: 10-content-analytics
    provides: activity_log table structure for aggregation
provides:
  - collect_user_export_data RPC function
  - Helper functions for nested content (playlists, layouts, schedules, listings)
  - GDPR-compliant JSON export structure
affects: [11-02, 11-03, gdpr-export-processing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Helper functions for nested JSONB aggregation"
    - "SECURITY DEFINER with service_role-only GRANT pattern"
    - "Activity log monthly aggregation (not individual events)"

key-files:
  created:
    - supabase/migrations/119_gdpr_export_data_collection.sql
  modified: []

key-decisions:
  - "Activity logs aggregated by month (YYYY-MM format) per CONTEXT.md"
  - "Media assets export metadata only (URLs, sizes), not actual file contents"
  - "Nested content via helper functions for cleaner main export function"
  - "service_role-only GRANT for background job security"

patterns-established:
  - "GDPR export JSON structure: metadata, profile, settings, content, devices, activitySummary, consent"
  - "Helper function pattern: get_X_with_Y() returns JSONB with nested children"

# Metrics
duration: 2min
completed: 2026-01-24
---

# Phase 11 Plan 01: GDPR Data Export Collection Summary

**PostgreSQL RPC function collect_user_export_data() collecting all user data from 12 tables into GDPR Article 20 compliant JSONB structure**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-24T15:18:48Z
- **Completed:** 2026-01-24T15:20:33Z
- **Tasks:** 2
- **Files created:** 1

## Accomplishments
- Created collect_user_export_data(p_user_id) RPC returning comprehensive JSONB
- Implemented 4 helper functions for nested content (playlists, layouts, schedules, listings)
- Activity logs aggregated by month per CONTEXT.md (not individual events)
- Media assets include metadata only (URLs, sizes), not actual file contents
- SECURITY DEFINER with service_role-only GRANT for background job security

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Create data collection RPC and helper functions** - `048ea26` (feat)

**Plan metadata:** Pending

## Files Created/Modified
- `supabase/migrations/119_gdpr_export_data_collection.sql` - GDPR data export collection RPC with 5 functions

## Functions Created

| Function | Purpose |
|----------|---------|
| `collect_user_export_data(p_user_id)` | Main RPC collecting all user data for export |
| `get_playlist_with_items(p_playlist_id)` | Helper returning playlist with nested items |
| `get_layout_with_zones(p_layout_id)` | Helper returning layout with nested zones |
| `get_schedule_with_entries(p_schedule_id)` | Helper returning schedule with nested entries |
| `get_listing_with_devices(p_listing_id)` | Helper returning listing with TV devices and QR codes |

## Data Tables Queried

| Section | Tables |
|---------|--------|
| Profile | profiles |
| Settings | user_settings |
| Content | media_assets, playlists, playlist_items, layouts, layout_zones, schedules, schedule_entries, scenes |
| Devices | listings, tv_devices, qr_codes |
| Activity | activity_log (aggregated by month) |
| Consent | consent_records |

## Export JSON Structure

```json
{
  "metadata": { "exportDate", "userId", "email", "format", "version", "gdprArticle" },
  "profile": { ... },
  "settings": { ... },
  "content": { "mediaAssets": [], "playlists": [], "layouts": [], "schedules": [], "scenes": [] },
  "devices": { "listings": [] },
  "activitySummary": { "monthlyActivityCounts": {}, "totalActivityCount", "firstActivityDate", "lastActivityDate" },
  "consent": { "history": [] }
}
```

## Decisions Made
- Activity logs aggregated by month (YYYY-MM format) per CONTEXT.md - provides privacy while maintaining audit value
- Media assets export metadata only (URLs, file sizes, dimensions) - actual files remain accessible via URLs
- Nested content via helper functions - makes main function cleaner and more maintainable
- service_role-only GRANT - this function bypasses RLS for background job processing, not direct user access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following established Supabase patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- collect_user_export_data() ready to be called by export processing job (Plan 11-02 or Edge Function)
- Returns JSONB that can be converted to JSON file for user download
- Helper functions available for reuse in other contexts if needed

---
*Phase: 11-gdpr-compliance*
*Completed: 2026-01-24*
