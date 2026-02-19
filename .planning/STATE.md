# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v3.2 Display Toolkit -- Phase 63 (Editor Preview Polish & PinEntry Fix)

## Current Position

Phase: 63 of 63 (Editor Preview Polish & PinEntry Fix)
Plan: 1 of 1 in current phase
Status: Phase Complete
Last activity: 2026-02-19 - Completed 63-01: Editor preview timezone threading and PinEntry import fix

Progress: [#################] 100% (17/17 plans)

## Milestones Shipped

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1 Production Release | 1-12 | 75 | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | 2026-02-10 |
| v3.0 Creative Experience | 46-50 | 10 | 2026-02-11 |
| v3.1 Data-Driven Screens | 51-55 | 15 | 2026-02-13 |

## Performance Metrics

**Cumulative (v1 through v3.1):**
- Total plans executed: 195
- Total phases: 55 completed
- Total milestones: 8 shipped

**v3.2 Display Toolkit:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 56 | 01 | 8min | 2 | 12 |
| 56 | 02 | 4min | 2 | 7 |
| 57 | 01 | 4min | 2 | 5 |
| 57 | 02 | 3min | 2 | 4 |
| 58 | 01 | 4min | 2 | 6 |
| 58 | 02 | 5min | 2 | 8 |
| 59 | 01 | 4min | 2 | 6 |
| 59 | 02 | 4min | 2 | 5 |
| 60 | 01 | 3min | 2 | 4 |
| 60 | 02 | 4min | 2 | 3 |
| 61 | 01 | 3min | 2 | 4 |
| 61 | 02 | 3min | 2 | 4 |
| 62 | 01 | 3min | 2 | 4 |
| 62 | 03 | 12min | 2 | 3 |
| Phase 62 P02 | 14min | 2 tasks | 6 files |
| 63 | 01 | 8min | 2 | 8 |

## Accumulated Context

### Decisions

- **56-01**: Keep widget components in `src/player/components/widgets/` -- registry imports FROM them, avoiding mass file moves
- **56-01**: EditorCanvas keeps inline mock previews (editor-specific) but derives icon/label from registry
- **56-01**: LivePreviewWindow now uses actual widget components instead of duplicated inline implementations
- **56-01**: LayoutElementRenderer removes 5 inline widget implementations in favor of registry lookup
- **56-02**: Duplicate resolveTimezone helper in each widget (~5 lines) instead of shared import to avoid cross-component coupling
- **56-02**: Use Intl.DateTimeFormat.formatToParts for analog clock hand positioning instead of TZDate
- **56-02**: Date format default changed from 'short' to 'long' in registry to match original widget behavior
- **56-02**: Added clock/date controls to LayoutPropertiesPanel for editor consistency
- **57-01**: Duplicate generateQRValue helper in QRCodeWidget and EditorCanvas to avoid cross-component coupling
- **57-01**: Include logoEnabled/logoUrl defaults in registry now (false/empty) to avoid registry change in 57-02
- **57-01**: Use WCAG relative luminance formula for contrast ratio warning in QRCodeWidgetControls
- **57-02**: Logo overlay uses fixed 40x40 with excavate:true at size=256 (~15% coverage) for brand visibility vs scan reliability
- **57-02**: Logo toggle auto-fills tenant brand logo URL from BrandingContext when logoUrl is empty
- **57-02**: Layout editor QR controls replaced with shared QRCodeWidgetControls using adapter pattern for prop interface
- **58-01**: Dual auth in weather-proxy: accept both user JWTs and anon key to support unauthenticated player devices
- **58-01**: Client-side in-memory cache preserved as optimization layer (30min TTL) on top of server-side DB cache (15min TTL)
- **58-01**: Removed VITE_OPENWEATHER_API_KEY from supabase.js since it is no longer a client-side variable
- **58-02**: Duplicate resolveTimezone helper in WeatherWidget per Phase 56 decision (no shared module)
- **58-02**: Store weather cache as cacheEntry.data to handle both object (current) and array (forecast) formats
- **58-02**: displayData = weatherData || offlineData pattern matches RssCardWidget offline fallback

- **59-01**: Dual-mode rendering via isPreview prop: editor shows poster frame with play icon overlay, preview/player shows actual <video> tag
- **59-01**: Basic <video> tag for MP4 in preview/player; HLS support deferred to Plan 59-02
- **59-01**: Pass thumbnail_url from media library as posterUrl for video elements
- **59-02**: hls.js light build (hls.light.min.js) for smaller bundle -- full build not needed for digital signage playback
- **59-02**: Per-element stall detection inside VideoPlayer rather than extending useStuckDetection, because layouts have multiple independent video zones
- **59-02**: eslint-disable for video.currentTime self-assign -- intentional seek pattern for stall recovery

- **60-01**: Client-side tag filtering on RPC results because fetchScreenGroupsWithScenes uses an RPC that doesn't support .contains(); screen_groups is <100 rows per tenant
- **60-01**: Tags normalized to lowercase and deduplicated on input in TagChipInput component

- **60-02**: Inline bulk action bar instead of reusing media BulkActionBar -- media version has media-specific actions (Move, Download, Add to Playlist)
- **60-02**: Bulk tag uses additive union (merge with existing tags, deduplicate) rather than replace

- **61-01**: 7 device object blocks updated in get_resolved_player_content (all return paths include orientation)
- **61-01**: Portrait templates use percent-based zone positioning matching existing layout_zones pattern
- **61-01**: orientation column defaults to 'landscape' with CHECK constraint for data integrity

- **61-02**: CSS rotation uses transform rotate(90deg) with 100vh/100vw swap for full-viewport orientation mismatch
- **61-02**: Rotation wraps entire LayoutRenderer, not individual elements, per anti-pattern guidance
- **61-02**: No rotation for playlist-only mode since playlists lack inherent aspect_ratio
- **61-02**: ScheduleEditorPage uses inline Alert for portrait advisory since target screen orientation is unknown

- **62-01**: Reuse existing update_updated_at_column() trigger function from migration 040 for menu board tables
- **62-01**: Grant SELECT to anon role for player-side read-only access to menu board tables
- **62-01**: RLS policies use join-based EXISTS subqueries for categories/items (tenant check via menu_boards parent)

- **62-03**: Realtime events trigger full re-fetch via refreshTrigger counter in useWidgetData key rather than granular state patching
- **62-03**: Inline DietaryBadge component within MenuBoardWidget (player-specific, too small for separate file)
- **62-03**: Clamped page via useEffect instead of inline setState during render to avoid React anti-pattern
- [Phase 62]: Immediate-save CRUD for menu board editor: each user action calls service immediately with optimistic local state update
- [Phase 62]: Nested DndContext for item reordering within each CategorySection, separate from category-level DndContext in editor modal
- [Phase 62]: Create mode requires saving board first before adding categories/items (board ID needed for FK relationships)

- **63-01**: Browser timezone (Intl.DateTimeFormat) as editor preview default -- layouts are screen-agnostic, no inherent screen timezone
- **63-01**: No widget component modifications -- timezone prop reaches widgets through threaded chain, existing resolveTimezone handles priority
- **63-01**: No shared resolveTimezone module -- per Phase 56 decision to keep duplicated helpers in each widget

### Blockers/Concerns

- ~~Weather API key currently exposed client-side (WTHR-01 addresses in Phase 58)~~ RESOLVED in 58-01
- ~~QR code widget has missing import causing player crash (QR-05 addresses in Phase 57)~~ RESOLVED in 57-01
- ~~Clock widgets use browser timezone instead of screen timezone (CLOCK-06 addresses in Phase 56)~~ RESOLVED in 56-02

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 43 | Fix 17 remaining Playwright e2e test failures | 2026-02-18 | cab3395 | [43-fix-17-remaining-playwright-e2e-test-fai](./quick/43-fix-17-remaining-playwright-e2e-test-fai/) |
| 44 | Fix 4 failing Playwright e2e tests (auth/connection) | 2026-02-19 | 0ce7539 | [44-fix-4-failing-playwright-e2e-tests](./quick/44-fix-4-failing-playwright-e2e-tests/) |

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 63-01-PLAN.md (Editor Preview Polish & PinEntry Fix)
Resume file: None
Next: v3.2 Display Toolkit milestone complete (all 17 plans across phases 56-63 executed, including gap closure)

---
*Updated: 2026-02-19 -- Phase 63-01: Threaded browser timezone through layout editor and scene editor preview pipelines. Fixed PinEntry import in ViewPage for kiosk mode exit. Closes CLOCK-06, WTHR-03, PinEntry-FIX gaps.*
