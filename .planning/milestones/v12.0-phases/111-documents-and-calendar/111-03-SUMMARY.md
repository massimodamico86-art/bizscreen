---
phase: 111-documents-and-calendar
plan: 03
subsystem: auth, api, infra
tags: [oauth, pkce, google-calendar, outlook, microsoft-graph, edge-function, supabase, calendar]

# Dependency graph
requires:
  - phase: 111-documents-and-calendar (plan 01)
    provides: calendar_oauth_tokens and calendar_event_cache database tables
provides:
  - Google Calendar OAuth service with PKCE flow (calendar.events.readonly scope)
  - Outlook Calendar OAuth service with PKCE flow (Calendars.ReadBasic + offline_access)
  - Calendar service layer for DB-backed token persistence and event fetching
  - OAuth callback wiring in App.jsx for gcal and outlook_cal providers
  - calendar-proxy Edge Function with JWT auth, caching, and token refresh
affects: [111-documents-and-calendar plan 04, calendar widget, player calendar display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Calendar OAuth tokens persisted to DB (not localStorage) for unattended player operation"
    - "Calendar-proxy Edge Function follows rss-proxy pattern (JWT auth, cache, provider fetch)"
    - "handleCallback returns tokens to caller for DB persistence (differs from cloud storage localStorage pattern)"
    - "Provider-aware toast and navigation in OAuth callback handler"

key-files:
  created:
    - src/services/cloud/googleCalendarService.js
    - src/services/cloud/outlookCalendarService.js
    - src/services/calendarService.js
    - supabase/functions/calendar-proxy/index.ts
  modified:
    - src/services/cloud/cloudOAuthService.js
    - src/App.jsx

key-decisions:
  - "Calendar OAuth callbacks return token objects (not saving to localStorage) for DB persistence via calendarService.saveCalendarSource()"
  - "Calendar-proxy Edge Function handles token refresh on 401 server-side for unattended player operation"
  - "5-minute cache TTL on calendar_event_cache to prevent excessive API calls"
  - "Provider-aware toast message and navigation in App.jsx (calendar callbacks do not redirect to media library)"
  - "Google Calendar uses 'primary' as default calendarId; Outlook uses 'default'"

patterns-established:
  - "Calendar token persistence: OAuth callback -> handleXxxCallback() -> saveCalendarSource() -> DB -> calendar-proxy reads from DB"
  - "Edge Function token refresh: 401 from provider -> refresh token via provider API -> update DB -> retry request"

requirements-completed: [CAL-02, CAL-04]

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 111 Plan 03: Calendar OAuth Integration Summary

**Google Calendar and Outlook OAuth PKCE flows with DB-backed token persistence and server-side calendar-proxy Edge Function for event fetching with 5-min cache TTL**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T21:45:07Z
- **Completed:** 2026-03-04T21:51:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Google Calendar and Outlook OAuth PKCE flows with separate calendar.events.readonly and Calendars.ReadBasic scopes
- Calendar tokens persisted to database (not localStorage) enabling unattended player operation
- Calendar-proxy Edge Function fetches events from both providers with JWT auth, 5-min cache, and automatic token refresh on 401
- OAuth callback handler in App.jsx dispatches calendar providers to DB persistence path (not media library redirect)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend cloudOAuthService and create Google/Outlook calendar OAuth services** - `2f4af86` (feat)
2. **Task 2: Calendar service layer, OAuth callback wiring in App.jsx, and calendar-proxy Edge Function** - `06c8fa4` (feat)

## Files Created/Modified
- `src/services/cloud/cloudOAuthService.js` - Added GOOGLE_CALENDAR and OUTLOOK_CALENDAR to CLOUD_PROVIDERS
- `src/services/cloud/googleCalendarService.js` - Google Calendar OAuth flow with PKCE, returns tokens for DB persistence
- `src/services/cloud/outlookCalendarService.js` - Outlook Calendar OAuth flow with PKCE, returns tokens for DB persistence
- `src/services/calendarService.js` - Calendar source CRUD and event fetching via calendar-proxy Edge Function
- `src/App.jsx` - Added gcal and outlook_cal callback handlers with saveCalendarSource() and provider-aware toast
- `supabase/functions/calendar-proxy/index.ts` - Server-side event fetching with JWT auth, cache, token refresh

## Decisions Made
- Calendar OAuth callbacks return token objects instead of saving to localStorage (key difference from cloud storage pattern) -- enables server-side token access for unattended player operation
- Calendar-proxy Edge Function handles its own token refresh on 401, updating tokens in DB -- no user interaction needed for expired tokens
- 5-minute cache TTL balances freshness with API rate limits
- Google Calendar default calendarId is 'primary'; Outlook default is 'default' -- users can change in widget controls
- Calendar OAuth callbacks do not redirect to media library (unlike cloud storage callbacks) since user initiated from calendar widget

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build error (ScaledStage import in TVPreviewModal/PropertyDetailsModal) unrelated to calendar changes -- out of scope, logged but not fixed
- lint-staged stash mechanism initially failed on first commit attempt for new files but succeeded on retry after stash cleanup

## User Setup Required

None - no external service configuration required. Environment variables (VITE_GOOGLE_CALENDAR_CLIENT_ID, VITE_MICROSOFT_CALENDAR_CLIENT_ID) will be needed when deploying to production.

## Next Phase Readiness
- Calendar OAuth services and proxy ready for Plan 111-04 (Calendar Widget)
- CalendarWidgetControls can use startGoogleCalendarOAuth/startOutlookCalendarOAuth to initiate connections
- CalendarWidget can use fetchAllCalendarEvents to display events from connected sources
- calendar-proxy Edge Function needs to be deployed via `supabase functions deploy calendar-proxy`

---
*Phase: 111-documents-and-calendar*
*Completed: 2026-03-04*
