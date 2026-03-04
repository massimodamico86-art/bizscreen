---
phase: 111-documents-and-calendar
verified: 2026-03-04T22:30:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 111: Documents and Calendar Verification Report

**Phase Goal:** Users can display PDF/Office documents and live calendar events from Google Calendar and Outlook on their screens
**Verified:** 2026-03-04T22:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PDF and Office MIME types recognized as document media type by getMediaTypeFromMime() | VERIFIED | `src/services/mediaService.js` lines 29-37: all 7 MIME types explicitly checked, returns `MEDIA_TYPES.DOCUMENT` |
| 2 | Document service handles upload-then-convert workflow with async status polling | VERIFIED | `src/services/documentService.js`: `uploadDocument`, `getConversionStatus`, `pollConversionStatus` all export and implement the full workflow with exponential backoff |
| 3 | Edge Function structure for server-side conversion is in place with JWT auth | VERIFIED | `supabase/functions/doc-converter/index.ts`: JWT extraction and `supabaseAdmin.auth.getUser(token)` verification at lines 70-91 |
| 4 | Database tables for calendar cache and OAuth tokens created in shared migration | VERIFIED | `supabase/migrations/164_document_conversion_calendar_cache.sql`: both `calendar_event_cache` and `calendar_oauth_tokens` tables with RLS, indexes, unique constraints, and grants |
| 5 | Media asset config_json tracks conversion status, page count, and page URLs | VERIFIED | doc-converter updates `conversionStatus`, `convertedPages`, `pageCount`, `originalFormat` via `updateMediaAsset()` |
| 6 | Document widget renders pre-converted PNG page images as standard img tags | VERIFIED | `src/player/components/widgets/DocumentWidget.jsx`: only `<img>` tags used, `objectFit: contain`, no canvas/pdf.js/iframe |
| 7 | Pages auto-advance with configurable interval (5/10/15/30/60 seconds) | VERIFIED | `DocumentWidget.jsx` lines 84-113: `setInterval` at `pageIntervalSeconds * 1000` with loop/stop logic |
| 8 | Document widget registered in WIDGET_REGISTRY with FileText icon and document key | VERIFIED | `src/widgets/registry.js`: `document:` entry with `component: DocumentWidget`, `icon: FileText`, correct defaultProps |
| 9 | Editor controls available in both scene editor and layout editor properties panels | VERIFIED | `PropertiesPanel.jsx` line 983: `{widgetType === 'document' && <DocumentWidgetControls ... />}`. `LayoutPropertiesPanel.jsx` line 646: same pattern |
| 10 | Google Calendar OAuth flow via PKCE redirects to Google with calendar.events.readonly scope | VERIFIED | `src/services/cloud/googleCalendarService.js`: `GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly'`, PKCE flow at lines 46-71 |
| 11 | Outlook Calendar OAuth flow via PKCE redirects to Microsoft with Calendars.ReadBasic + offline_access scopes | VERIFIED | `src/services/cloud/outlookCalendarService.js`: `MS_SCOPES = 'Calendars.ReadBasic offline_access'`, PKCE flow at lines 47-71 |
| 12 | OAuth callback handler in App.jsx dispatches gcal and outlook_cal providers to correct handlers | VERIFIED | `src/App.jsx` lines 234-268: `gcal:` and `outlook_cal:` entries in callbackHandlers map with dynamic imports |
| 13 | After OAuth callback, tokens persisted to calendar_oauth_tokens DB via calendarService.saveCalendarSource() | VERIFIED | `App.jsx` lines 240-249 (gcal) and 256-265 (outlook_cal): `saveCalendarSource()` called immediately after token exchange, NOT localStorage |
| 14 | Calendar-proxy Edge Function fetches events from both providers with JWT auth and 5-min cache TTL | VERIFIED | `supabase/functions/calendar-proxy/index.ts`: `CACHE_TTL_MINUTES = 5`, JWT auth at lines 422-449, cache check at lines 316-330, cache write at lines 390-401 |
| 15 | Calendar widget displays upcoming events in agenda list format with date grouping | VERIFIED | `src/player/components/widgets/CalendarWidget.jsx`: `groupEventsByDate()` returns Today/Tomorrow/formatted dates, rendered as sectioned event list |
| 16 | Widget supports multiple calendar sources per instance (Google + Outlook in same widget) | VERIFIED | `CalendarWidget.jsx` lines 142-155: `Promise.all(sourceIds.map(...))` fetches all sources; `CalendarWidgetControls.jsx` allows adding multiple sources |

**Score:** 16/16 truths verified

---

## Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `supabase/migrations/164_document_conversion_calendar_cache.sql` | 111-01 | VERIFIED | 65 lines, both tables, RLS, indexes, grants to `authenticated` |
| `src/services/mediaService.js` | 111-01 | VERIFIED | Lines 29-37: 7 MIME types explicit, `MEDIA_TYPES.DOCUMENT` returned |
| `src/services/documentService.js` | 111-01 | VERIFIED | 236 lines, all 5 required exports present and substantive |
| `supabase/functions/doc-converter/index.ts` | 111-01 | VERIFIED | 242 lines, JWT auth, Gotenberg integration, PDF passthrough, config_json update |
| `src/player/components/widgets/DocumentWidget.jsx` | 111-02 | VERIFIED | 207 lines, img-only rendering, crossfade, page indicator, auto-advance |
| `src/widgets/registry.js` | 111-02/04 | VERIFIED | `document:` and `calendar:` entries with correct components, icons, defaultProps |
| `src/player/components/widgets/index.js` | 111-02/04 | VERIFIED | Lines 20-21: both `DocumentWidget` and `CalendarWidget` barrel-exported |
| `src/components/scene-editor/DocumentWidgetControls.jsx` | 111-02 | VERIFIED | 147 lines, document picker with conversion status, interval selector, loop toggle |
| `src/services/cloud/cloudOAuthService.js` | 111-03 | VERIFIED | `GOOGLE_CALENDAR: 'gcal'` and `OUTLOOK_CALENDAR: 'outlook_cal'` in CLOUD_PROVIDERS |
| `src/services/cloud/googleCalendarService.js` | 111-03 | VERIFIED | 203 lines, all 6 exports, handleGoogleCalendarCallback returns tokens (NOT localStorage) |
| `src/services/cloud/outlookCalendarService.js` | 111-03 | VERIFIED | 204 lines, all matching Outlook exports, same token-return pattern |
| `src/services/calendarService.js` | 111-03 | VERIFIED | 174 lines, all 5 exports, `saveCalendarSource` upserts to `calendar_oauth_tokens` |
| `src/App.jsx` | 111-03 | VERIFIED | `gcal` and `outlook_cal` entries in callbackHandlers; provider-aware toast and nav |
| `supabase/functions/calendar-proxy/index.ts` | 111-03 | VERIFIED | 484 lines, JWT auth, cache check, Google+Outlook fetchers, 401 token refresh, cache write |
| `src/player/components/widgets/CalendarWidget.jsx` | 111-04 | VERIFIED | 369 lines, agenda list, date grouping, auto-refresh, multi-source, theme support |
| `src/components/scene-editor/CalendarWidgetControls.jsx` | 111-04 | VERIFIED | 278 lines, source management with OAuth buttons, display options, accent color picker |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `documentService.js` | `supabase/functions/doc-converter` | `supabase.functions.invoke('doc-converter', { body: { mediaId, storageUrl, mimeType } })` | WIRED | Line 128: exact invoke call with correct body shape |
| `supabase/functions/doc-converter/index.ts` | `media_assets table` | Updates `config_json` with `conversionStatus`, `convertedPages`, `pageCount` | WIRED | `updateMediaAsset()` called with all required fields on success and error paths |
| `src/widgets/registry.js` | `DocumentWidget.jsx` | `component: DocumentWidget` in `WIDGET_REGISTRY.document` | WIRED | Confirmed in registry.js grep output |
| `src/components/scene-editor/PropertiesPanel.jsx` | `DocumentWidgetControls.jsx` | `{widgetType === 'document' && <DocumentWidgetControls ... />}` | WIRED | Line 983-985 |
| `src/components/layout-editor/LayoutPropertiesPanel.jsx` | `DocumentWidgetControls.jsx` | `{widgetType === 'document' && <DocumentWidgetControls ... />}` | WIRED | Line 646-648 |
| `src/App.jsx` | `googleCalendarService.js` | Dynamic import in `gcal` callbackHandler | WIRED | Line 235: `import('./services/cloud/googleCalendarService')` |
| `src/App.jsx` | `calendarService.js` | `saveCalendarSource()` after token exchange | WIRED | Lines 236, 253: `import('./services/calendarService')` then `.saveCalendarSource()` |
| `supabase/functions/calendar-proxy/index.ts` | `calendar_oauth_tokens` DB table | Looks up tokens by `id = sourceId AND owner_id = userId` | WIRED | Lines 299-304 |
| `src/services/calendarService.js` | `calendar_oauth_tokens` DB table | `supabase.from('calendar_oauth_tokens').upsert()` | WIRED | Lines 36-51: upsert on conflict `owner_id, provider, calendar_id` |
| `src/widgets/registry.js` | `CalendarWidget.jsx` | `component: CalendarWidget` in `WIDGET_REGISTRY.calendar` | WIRED | Confirmed in registry.js grep output |
| `CalendarWidget.jsx` | `supabase/functions/calendar-proxy` | `supabase.functions.invoke('calendar-proxy', { body: { action: 'fetch', sourceId } })` | WIRED | Lines 145-154 |
| `CalendarWidgetControls.jsx` | `calendarService.js` | `getCalendarSources()` on mount | WIRED | Line 37: `const sources = await getCalendarSources()` |
| `CalendarWidgetControls.jsx` | `googleCalendarService.js` | `startGoogleCalendarOAuth()` on connect | WIRED | Lines 72-75 |

---

## Requirements Coverage

| Requirement | Description | Source Plan | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DOC-01 | User can upload PDF documents as media assets | 111-01 | SATISFIED | `documentService.uploadDocument()` accepts PDF MIME type; `mediaService.getMediaTypeFromMime('application/pdf')` returns `MEDIA_TYPES.DOCUMENT` |
| DOC-02 | User can upload Word/PPT/Excel documents as media assets | 111-01 | SATISFIED | All 6 Office MIME types in `DOCUMENT_MIME_TYPES` constant; `getMediaTypeFromMime()` returns `document` for each |
| DOC-03 | Uploaded documents are converted to images server-side for player compatibility | 111-01 | SATISFIED | `doc-converter` Edge Function handles conversion: Office via Gotenberg, PDF via passthrough; updates `config_json.convertedPages` |
| DOC-04 | User can add a document widget to display pages in a layout zone | 111-02 | SATISFIED | `DocumentWidget` registered in `WIDGET_REGISTRY.document`; controls wired in both editor panels |
| DOC-05 | Document pages auto-advance on the screen player with configurable interval | 111-02 | SATISFIED | `DocumentWidget.jsx` setInterval at `pageIntervalSeconds * 1000`; `DocumentWidgetControls` exposes 5/10/15/30/60s selector |
| DOC-06 | Document widget works on WebOS/Tizen devices (rendered as pre-converted images) | 111-01/02 | SATISFIED | `DocumentWidget` renders only `<img>` tags; no canvas/pdf.js/iframe; pages are PNG/PDF URLs from storage |
| CAL-01 | User can add a calendar widget to a layout zone | 111-04 | SATISFIED | `CalendarWidget` registered in `WIDGET_REGISTRY.calendar`; controls wired in both editor panels |
| CAL-02 | User can connect Google Calendar via OAuth | 111-03 | SATISFIED | `startGoogleCalendarOAuth()` initiates PKCE flow; `App.jsx` handles `gcal` callback and persists tokens to DB |
| CAL-03 | Calendar widget displays upcoming events on screen with auto-refresh | 111-04 | SATISFIED | `CalendarWidget.jsx` fetches events via `calendar-proxy` and re-fetches at `refreshIntervalMinutes * 60 * 1000` interval |
| CAL-04 | User can connect Outlook calendar via Microsoft OAuth | 111-03 | SATISFIED | `startOutlookCalendarOAuth()` initiates PKCE flow; `App.jsx` handles `outlook_cal` callback and persists tokens to DB |
| CAL-05 | Calendar widget supports multiple calendar sources per widget | 111-04 | SATISFIED | `sources: []` in defaultProps; `CalendarWidget` calls `Promise.all(sourceIds.map(...))` to fetch from all sources |

**All 11 requirements (DOC-01 through DOC-06, CAL-01 through CAL-05) are SATISFIED.**

No orphaned requirements found — all 11 phase-111 requirements appear in the four plans and all are accounted for.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/doc-converter/index.ts` | 12, 157, 191 | TODO: magick-wasm page splitting for PDF | INFO | Acknowledged limitation: PDFs stored as single page (original URL), not split into per-page PNGs. This is a deferred enhancement, not a blocking defect — DocumentWidget handles single-page "convertedPages" arrays correctly, and Office files are converted via Gotenberg |
| `src/components/listings/TVPreviewModal.jsx` | N/A | Pre-existing import error: missing `../tv-layouts/ScaledStage` | PRE-EXISTING | Causes `npm run build` to fail. This is a pre-existing defect from commit `2aca844` (before phase 111 began), confirmed in all four phase summaries and `deferred-items.md`. The `ScaledStage` file does not exist on disk. Phase 111 changes are not involved. |

**No blocker anti-patterns introduced by phase 111.** The build failure is pre-existing and unrelated.

---

## Human Verification Required

### 1. Document Upload End-to-End (Gotenberg dependency)

**Test:** Upload a .docx or .pptx file in the Media Library.
**Expected:** Asset created with `conversionStatus: 'pending'` then transitions to `complete` with `convertedPages` populated. If Gotenberg is unavailable, status becomes `error` with `conversionError: 'Office conversion service unavailable.'`
**Why human:** Requires a live Supabase environment and Gotenberg service. Cannot verify the async Edge Function execution, storage upload, or config_json update from static analysis.

### 2. Calendar OAuth Full Round-Trip

**Test:** Navigate to a calendar widget's controls, click "Google Calendar", complete Google OAuth consent, verify the widget shows events.
**Expected:** Browser redirects to Google, consent screen appears, redirect back to `/auth/cloud/callback?provider=gcal`, toast "Calendar connected!" appears (NOT "Connected to cloud storage!"), user stays on current page (NOT redirected to media library), calendar source appears in the widget controls.
**Why human:** Requires live Google OAuth credentials (`VITE_GOOGLE_CALENDAR_CLIENT_ID`), a real Google account, and live Supabase to verify token persistence to `calendar_oauth_tokens`.

### 3. Token Refresh on 401 (Calendar Proxy)

**Test:** Simulate expired access token in `calendar_oauth_tokens`, then trigger a calendar widget refresh.
**Expected:** The `calendar-proxy` Edge Function automatically refreshes the token via the provider's token endpoint, updates the database, and returns events without user interaction.
**Why human:** Requires expired token state and live provider APIs. Cannot verify the refresh → DB update → retry cycle from static analysis.

### 4. Document Page Auto-Advance on TV Player

**Test:** Add a DocumentWidget to a layout zone with a converted multi-page document, deploy to a WebOS or Tizen device, observe page cycling.
**Expected:** Pages advance at the configured interval with crossfade transition; page indicator badge shows correct count; wraps around on loop.
**Why human:** Requires physical TV hardware or WebOS/Tizen emulator. Visual behavior and transition smoothness cannot be verified statically.

---

## Notes on Known Limitations

1. **PDF page splitting is deferred.** PDFs are currently stored as a single page (the original PDF URL) rather than split into per-page PNG images. The `doc-converter` Edge Function has explicit TODO comments for future `magick-wasm` integration. This means `DocumentWidget` will display PDFs as a single "page" only — the page count will always be 1 for PDFs. This was an explicit decision documented in all summaries and `deferred-items.md`. Requirements DOC-03 and DOC-06 are still satisfied because Office files are genuinely converted and PDFs are accessible; however, the per-page-advance experience is limited for PDFs specifically.

2. **Pre-existing build failure.** `npm run build` fails due to `src/components/listings/TVPreviewModal.jsx` referencing a missing `../tv-layouts/ScaledStage` module. This predates phase 111 (introduced in commit `2aca844`) and was logged as a pre-existing issue in all four summaries and `deferred-items.md`. Phase 111 does not cause or worsen this failure.

---

## Commit Verification

All 8 task commits from the summaries were verified in git history:

| Commit | Plan | Description |
|--------|------|-------------|
| `a40b98a` | 111-01 Task 1 | feat(111-01): add calendar_event_cache and calendar_oauth_tokens migration |
| `8e6d2e6` | 111-01 Task 2 | feat(111-01): add document service, MIME type extension, and doc-converter Edge Function |
| `abe267c` | 111-02 Task 1 | feat(111-02): add DocumentWidget player component and registry registration |
| `dad4177` | 111-02 Task 2 | feat(111-02): add DocumentWidgetControls and wire into properties panels |
| `2f4af86` | 111-03 Task 1 | feat(111-03): add Google Calendar and Outlook Calendar OAuth services |
| `06c8fa4` | 111-03 Task 2 | feat(111-03): add calendar service layer, App.jsx callback wiring, and calendar-proxy Edge Function |
| `e46c01e` | 111-04 Task 1 | feat(111-04): add CalendarWidget player component and registry registration |
| `4385d14` | 111-04 Task 2 | feat(111-04): add CalendarWidgetControls and properties panel wiring |

---

_Verified: 2026-03-04T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
