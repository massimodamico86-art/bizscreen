---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: milestone
status: unknown
last_updated: "2026-03-05T02:29:36.781Z"
progress:
  total_phases: 76
  completed_phases: 76
  total_plans: 250
  completed_plans: 250
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.1 -- Phase 114 plan 02 complete (ZonePlayer widget rendering + ScaledStage import fixes)

## Current Position

Phase: 114 of 114 (Integration Pipeline Fixes)
Plan: 2 of 2 complete (01 done, 02 done)
Status: Phase 114 complete (2/2 plans done)
Last activity: 2026-03-05 -- Plan 02 complete (ZonePlayer widget registry branch, ScaledStage/listing modal import fixes, build passes)

Progress: [████████████████████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 3.5 min
- Total execution time: 1.08 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 108-embed-widgets | 2/2 | 7 min | 3.5 min |
| 109-content-model | 5/5 | 18 min | 3.6 min |
| 088-analytics-alerts | 1/3 | 2 min | 2.0 min |
| 100-core-feature-walkthrough | 4/5 | 29 min | 7.3 min |
| 110-enterprise-platform | 3/4 | 10 min | 3.3 min |
| 111-documents-and-calendar | 4/4 | 16 min | 4.0 min |
| 113-enterprise-platform-fixes | 1/1 | 2 min | 2.0 min |

*Updated after each plan completion*
| Phase 109 P02 | 6 | 2 tasks | 5 files |
| Phase 109 P04 | 3 | 2 tasks | 7 files |
| Phase 109 P05 | 1 | 2 tasks | 2 files |
| Phase 100 P02 | 17 | 2 tasks | 28 files |
| Phase 100 P04 | 11 | 2 tasks | 26 files |
| Phase 110 P01 | 3 | 2 tasks | 4 files |
| Phase 110 P02 | 6 | 2 tasks | 3 files |
| Phase 110 P03 | 5 | 2 tasks | 5 files |
| Phase 110 P04 | 1 | 1 tasks | 2 files |
| Phase 111 P01 | 3 | 2 tasks | 4 files |
| Phase 111 P02 | 3 | 2 tasks | 6 files |
| Phase 111 P03 | 6 | 2 tasks | 6 files |
| Phase 111 P04 | 4 | 2 tasks | 6 files |
| Phase 113 P01 | 2 | 2 tasks | 5 files |
| Phase 114 P01 | 1 | 2 tasks | 2 files |
| Phase 114-integration-pipeline-fixes P02 | 3 | 2 tasks | 4 files |

## Accumulated Context

### Decisions

**108-01:** hqdefault for YouTube thumbnails (always available); Vimeo uses 'muted' not 'mute'; YouTube loop needs playlist=videoId; sandbox only on WebPageWidget; type-prefixed cache keys for thumbnails.

**108-02:** Web pages use Globe icon placeholder only (OG image extraction deferred -- needs server-side proxy); Google Slides thumbnail via /export/png?pageid=p with HEAD check; non-blocking URL validation (red error but save not blocked); thumbnails pre-cached as blobs in IndexedDB.

**109-01:** Two-phase recursive CTE in flatten_playlist_items (build tree then join leaves, avoids cartesian product); separate UP/DOWN ancestry walks in trigger for accurate depth; boolean validation RPC mirrors trigger for service-layer pre-check; media_assets.url for audio (not file_url).

**109-02:** addNestedPlaylist wraps addPlaylistItem after RPC validation (no duplication); parallel Promise.all for nested playlist info fetching; blue-themed cards (bg-blue-50) distinguish nested playlists in timeline strip; excludePlaylistId optional prop for UI-level self-reference prevention.

**109-03:** Audio picker uses select dropdown lazy-loaded on focus; volume changes debounced at 500ms; WorkingHoursEditor null = always on (DEFAULT_WORKING_HOURS on first enable); isWithinWorkingHours fails open (returns true) on error.

**109-04:** BackgroundAudio uses new Audio() via useRef (not DOM element); working hours guard is early-return black div with BackgroundAudio mounted (paused); emergency content overrides working hours client-side; ZonePlayer defensive guard uses setTimeout(advanceToNext, 100) for graceful skip.

**109-05:** Playlists tab after My Designs in FILTER_TABS; _isPlaylist flag on transformed playlists for handleAddItem detection without sourceType passthrough; playlistId in fetchMediaAssets dependency array for self-exclusion reactivity.

**088-01:** All four analytics pages clean -- no import errors, no missing design-system components, no navigation issues; ContentPerformancePage does not use useNavigate (concern pre-resolved); BrowserRouter wraps app in main.jsx for ContentDetailAnalyticsPage route-based navigation.

**100-01:** React fiber injection via __reactContainer$ (React 18) to populate mock screen/playlist data in bypass-auth mode; evaluate(el => el.click()) for elements behind modal overlays; direct state injection for delete confirmation modals.

**100-02:** Playwright route interception for Supabase mock data in bypass-auth mode; React fiber tree patching to override FeatureContext plan (free->pro) for campaigns feature gate bypass; campaigns feature gate documented as upgrade prompt; scenes require userProfile?.id for data loading.

**100-03:** Playwright .cjs scripts for ESM projects; yodeck-layout-new for layout editor; SVG template search crashes with "X is not defined" (pre-existing bug); media delete via detail modal (double-click then Delete); SVG delete shows empty state (no user designs in demo).

**100-04:** React fiber state injection via component name lookup for DataSourcesPage (hooks: 1=dataSources, 5=selectedSource, 6=sourceData, 9=showDeleteModal, 10=deleteTarget) and MenuBoardsPage; MenuBoardsPage delete uses window.confirm (native dialog); DataSourcesPage delete uses custom Modal (injectable via fiber); AppDetailModal uses custom fixed overlay (closed via backdrop or X button); Apps marketplace is catalog-based (fully functional without injection).

**110-01:** SSO login via supabase.auth.signInWithSSO({ domain }) to preserve RLS session; domain lookup uses GIN-indexed TEXT[] with ANY(); lookup_sso_by_domain RPC granted to anon for pre-login detection; initiateSSOLogin() deprecated but not removed; domains stored as comma-separated in UI, array on save.

**110-02:** Correct column names from actual schema (device_name not name, assigned_playlist_id not current_playlist_id, no device_type on tv_devices); presigned URL generation in Edge Function (not RPC) for AWS Sig V4 HMAC; rate limiter fails open on error; file_size cast BIGINT->INTEGER matching media_assets schema.

**110-04:** CREATE OR REPLACE preserves existing GRANTs from migration 162 (no separate GRANT needed); comment in migration header documents the original td.name bug for audit trail.

**111-01:** PDF stored as single convertedPages entry (magick-wasm page splitting deferred as TODO); Office conversion via Gotenberg LibreOffice API with graceful error; removed legacy text/ MIME catch-all; shared migration 164 for calendar tables; pollConversionStatus uses exponential backoff (2s start, 15s cap, 30 max).

**111-02:** DocumentWidget reads directly from Supabase (not documentService) to avoid circular deps in player bundle; crossfade via absolute-positioned img tags with opacity transition (500ms ease); page indicator badge in bottom-right with semi-transparent background; controls show conversion status with colored dots (yellow=pending, green=complete, red=error).

**111-03:** Calendar OAuth callbacks return token objects (not saving to localStorage) for DB persistence via calendarService.saveCalendarSource(); calendar-proxy Edge Function handles token refresh on 401 server-side; 5-minute cache TTL on calendar_event_cache; provider-aware toast message and navigation (calendar callbacks do not redirect to media library); Google Calendar uses 'primary' as default calendarId, Outlook uses 'default'.

**111-04:** CalendarWidget invokes calendar-proxy Edge Function directly (same as DocumentWidget reads Supabase directly) to avoid service-layer deps in player bundle; _lastRefresh underscore prefix for ESLint unused-var compliance; ESLint auto-removed unused isGoogleCalendarConnected/isOutlookCalendarConnected imports since source availability checked via DB query.

Full decision log in PROJECT.md Key Decisions table.
Key constraints for v12.0:
- Nested playlists MUST have circular reference prevention DB trigger before any nesting UI
- Documents MUST convert server-side before player rendering (WebOS/Tizen crash risk)
- SSO MUST use supabase.auth.signInWithSSO() to preserve RLS
- Proof of Play table MUST be partitioned by month from day one
- Video wall uses Supabase Realtime broadcast (leader/follower), last phase
- [Phase 109]: addNestedPlaylist wraps addPlaylistItem after RPC validation; parallel Promise.all for nested playlist info; blue-themed cards distinguish nested playlists; excludePlaylistId for UI self-reference prevention
- [Phase 109]: BackgroundAudio uses new Audio() via useRef; working hours guard is early-return black div with BackgroundAudio mounted paused; emergency overrides working hours client-side; ZonePlayer defensive guard uses setTimeout for graceful skip
- [Phase 100]: 100-02: Playwright route interception for Supabase mock data in bypass-auth mode; React fiber tree patching to override FeatureContext plan for campaigns feature gate bypass; scenes require userProfile?.id for data loading
- [Phase 100]: 100-04: React fiber state injection via component name lookup for DataSourcesPage and MenuBoardsPage; MenuBoardsPage delete uses window.confirm; AppDetailModal uses custom fixed overlay; Apps marketplace is catalog-based
- [Phase 110]: 110-03: Rename-and-swap partitioning strategy; 15 monthly partitions (2026-01 to 2027-03) plus DEFAULT; pg_cron on 25th creates partition 2 months ahead; media_play and scene_end event_types for completed playbacks; ClipboardList icon from lucide-react; native HTML multi-select for screen filter
- [Phase 111]: 111-03: Calendar OAuth callbacks return token objects for DB persistence; calendar-proxy handles 401 token refresh server-side; 5-min cache TTL; provider-aware toast; Google uses 'primary', Outlook uses 'default' calendarId
- [Phase 111]: 111-04: CalendarWidget invokes calendar-proxy directly in player; multi-source widget pattern with sources array, Promise.all fetch, merge+sort+slice; date grouping with Today/Tomorrow relative labels; CalendarWidgetControls with OAuth source management in both editor panels
- [Phase 113]: 113-01: screens:write scope follows read/write pair convention; PlaybackSummarySection after StatsGrid before PendingApprovalsWidget; playback fetch uses non-blocking fire-and-forget pattern
- [Phase 114]: Document interception placed BEFORE setCurrentFile/metadata-gather in useS3Upload loop; double guard in useMediaLibrary for document type detection; fetchAssets() for refresh instead of optimistic state prepend
- [Phase 114]: ZonePlayer widget branch uses getWidgetComponent() registry pattern; widget items carry widgetType + widgetProps/config; analytics itemType='widget'; ScaledStage is default export from src/ScaledStage.jsx; default exports added to listing modals alongside named exports

### Blockers/Concerns

None. Clean start.

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 114-02-PLAN.md (ZonePlayer widget rendering + ScaledStage import fixes)
Resume file: None
Next: Phase 114 complete (2/2 plans). All embed widgets render via registry in ZonePlayer. Build succeeds. Ready for next phase.

---
*Updated: 2026-03-05 -- 114-02 complete, Phase 114 done (2/2 plans), ZonePlayer widget registry branch + listing modal build fixes*
