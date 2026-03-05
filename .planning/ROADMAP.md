# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** -- Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** -- Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** -- Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** -- Phases 30-35 (shipped 2026-02-05)
- [x] **v2.3 Production Hardening** -- Phases 36-41 (shipped 2026-02-09)
- [x] **v2.4 Tech Debt Zero** -- Phases 42-45 (shipped 2026-02-10)
- [x] **v3.0 Creative Experience** -- Phases 46-50 (shipped 2026-02-11)
- [x] **v3.1 Data-Driven Screens** -- Phases 51-55 (shipped 2026-02-13)
- [x] **v3.2 Display Toolkit** -- Phases 56-63 (shipped 2026-02-19)
- [x] **v4.0 Player Hardening** -- Phases 64-68 (shipped 2026-02-20)
- [x] **v5.0 UI Completeness** -- Phases 69-71 (shipped 2026-02-20)
- [x] **v6.0 Functional Completeness** -- Phases 72-80 (shipped 2026-02-23)
- [x] **v7.0 UI Verification** -- Phases 81-91 (shipped 2026-02-27)
- [x] **v8.0 Comprehensive E2E** -- Phases 92-93 (shipped 2026-02-28, 139 reqs deferred)
- [x] **v9.0 Production Polish** -- Phase 94 (shipped 2026-02-28, 20 reqs deferred)
- [x] **v10.0 Visual QA Audit** -- Phases 98-103 (shipped 2026-03-01)
- [x] **v11.0 Stability Pass** -- Phases 104-107 (shipped 2026-03-02)
- [ ] **v12.0 Feature Parity** -- Phases 108-114 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1 through v11.0)</summary>

**v1 Production Release** -- Phases 1-12
See `.planning/milestones/v1-ROADMAP.md`

**v2 Templates & Platform Polish** -- Phases 13-23
See `.planning/milestones/v2-ROADMAP.md`

**v2.1 Tech Debt Cleanup** -- Phases 24-29
See `.planning/milestones/v2.1-ROADMAP.md`

**v2.2 Onboarding Polish** -- Phases 30-35
See `.planning/milestones/v2.2-ROADMAP.md`

**v2.3 Production Hardening** -- Phases 36-41
See `.planning/milestones/v2.3-ROADMAP.md`

**v2.4 Tech Debt Zero** -- Phases 42-45
See `.planning/milestones/v2.4-ROADMAP.md`

**v3.0 Creative Experience** -- Phases 46-50
See `.planning/milestones/v3.0-ROADMAP.md`

**v3.1 Data-Driven Screens** -- Phases 51-55
See `.planning/milestones/v3.1-ROADMAP.md`

**v3.2 Display Toolkit** -- Phases 56-63
See `.planning/milestones/v3.2-ROADMAP.md`

**v4.0 Player Hardening** -- Phases 64-68
See `.planning/milestones/v4.0-ROADMAP.md`

**v5.0 UI Completeness** -- Phases 69-71
See `.planning/milestones/v5.0-ROADMAP.md`

**v6.0 Functional Completeness** -- Phases 72-80
See `.planning/milestones/v6.0-ROADMAP.md`

**v7.0 UI Verification** -- Phases 81-91
See `.planning/milestones/v7.0-ROADMAP.md`

**v8.0 Comprehensive E2E** -- Phases 92-93 (2/18 phases, 139 reqs deferred)
See `.planning/milestones/v8.0-ROADMAP.md`

**v9.0 Production Polish** -- Phase 94 (1/4 phases, 20 reqs deferred)
See `.planning/milestones/v9.0-ROADMAP.md`

**v10.0 Visual QA Audit** -- Phases 98-103 (6 phases, 302 screenshots)
See `.planning/milestones/v10.0-ROADMAP.md`

**v11.0 Stability Pass** -- Phases 104-107 (4 phases, 8 plans, 18 bugs fixed)
See `.planning/milestones/v11.0-ROADMAP.md`

All milestones shipped successfully (17 total).

</details>

## Phases

- [x] **Phase 108: Embed Widgets** - YouTube, Vimeo, web page, and Google Slides as new widget registry entries with iframe rendering and offline fallback (completed 2026-03-03)
- [x] **Phase 109: Content Model** - Nested playlists with circular reference prevention, background audio tracks, and screen working hours scheduling (completed 2026-03-03)
- [x] **Phase 110: Enterprise Platform** - SAML SSO preserving Supabase Auth, public REST API with scoped tokens, and Proof of Play reporting with partitioned storage (completed 2026-03-04)
- [x] **Phase 111: Documents and Calendar** - Server-side document conversion for smart TV compatibility and Google/Outlook calendar widgets via OAuth (completed 2026-03-04)
- [ ] **Phase 112: Canva and Video Wall** - Canva design import workflow and multi-screen synchronized video wall display
- [x] **Phase 113: Enterprise Platform Fixes** - Fix API scope mismatch and wire dashboard playback summary (gap closure from audit) (completed 2026-03-04)
- [ ] **Phase 114: Integration Pipeline Fixes** - Wire document upload conversion pipeline, add embed widget rendering to layout zones, fix build-blocking TVPreviewModal import

## Phase Details

### Phase 108: Embed Widgets
**Goal**: Users can display YouTube videos, Vimeo videos, web pages, and Google Slides presentations on their screens via the layout editor
**Depends on**: Nothing (extends established widget registry pattern)
**Requirements**: EMBED-01, EMBED-02, EMBED-03, EMBED-04, EMBED-05, EMBED-06, EMBED-07, SLIDES-01, SLIDES-02, SLIDES-03
**Success Criteria** (what must be TRUE):
  1. User can add a YouTube or Vimeo video URL to a layout zone and see it playing on the screen player
  2. User can add a web page URL to a layout zone and see the live website displayed on the screen player with configurable auto-refresh
  3. User can paste a Google Slides URL into a layout zone and see slides auto-advancing on the screen player
  4. When a screen is offline, embed widgets show a cached thumbnail with a "requires internet" indicator instead of a broken frame
**Plans**: 2 plans
- [ ] 108-01-PLAN.md -- Embed utilities service, offline fallback, 4 player widget components, widget registry entries
- [ ] 108-02-PLAN.md -- Editor controls component, wiring into scene and layout editor panels

### Phase 109: Content Model
**Goal**: Users can compose playlists from other playlists, add background music to visual content, and schedule screen on/off times by day of week
**Depends on**: Phase 108
**Requirements**: NEST-01, NEST-02, NEST-03, NEST-04, AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, POWER-01, POWER-02, POWER-03
**Success Criteria** (what must be TRUE):
  1. User can insert a playlist as an item inside another playlist, and the player flattens all nested content into a single playback sequence
  2. System rejects circular playlist references at save time and enforces a 5-level nesting depth limit
  3. User can assign a background audio track to a playlist that plays continuously behind visual content transitions, with volume control
  4. User can upload MP3/WAV/OGG audio files as media assets
  5. User can define per-screen working hours (on/off times by day of week) and the screen automatically blanks outside those hours and resumes at start time
**Plans**: 4 plans
- [ ] 109-01-PLAN.md -- Schema migration: nested playlist trigger, background audio columns, working hours column, updated player content RPC
- [ ] 109-02-PLAN.md -- Nested playlists service layer and UI (InsertContentModal wiring, editor display)
- [ ] 109-03-PLAN.md -- Background audio picker/volume in playlist editor, working hours editor in screen settings
- [ ] 109-04-PLAN.md -- Player integration: BackgroundAudio component, WorkingHoursGuard, flattened content handling

### Phase 110: Enterprise Platform
**Goal**: Enterprise customers can authenticate via SAML SSO, integrate external systems via a public REST API, and generate compliance-ready Proof of Play reports
**Depends on**: Phase 109 (Proof of Play must track content from nested playlists; working hours establishes pg_cron pattern)
**Requirements**: SSO-01, SSO-02, SSO-03, SSO-04, SSO-05, API-01, API-02, API-03, API-04, API-05, API-06, API-07, POP-01, POP-02, POP-03, POP-04, POP-05
**Success Criteria** (what must be TRUE):
  1. Admin can configure a SAML identity provider and users can sign in via SSO, receiving a real Supabase Auth session that preserves all RLS policies
  2. Admin can enforce SSO-only login for their tenant, and the login page auto-detects SSO users by email domain
  3. Admin can generate scoped API tokens, and external systems can read screens/playlists/media and upload media via REST endpoints with rate limiting
  4. API tokens are tenant-isolated -- a token from one tenant cannot access another tenant's data
  5. Player logs every content playback event, and users can view Proof of Play reports with date range filter and CSV export
**Plans**: 4 plans
- [ ] 110-01-PLAN.md -- SAML SSO login flow: domain lookup migration, signInWithSSO integration, login page detection, enforcement
- [ ] 110-02-PLAN.md -- Public REST API gateway: tenant-scoped RPCs, Edge Function with token validation and rate limiting, API docs tab
- [ ] 110-03-PLAN.md -- Proof of Play reporting: monthly table partitioning, report aggregation RPCs, ProofOfPlayPage with filters/export
- [ ] 110-04-PLAN.md -- Gap closure: fix screen name column reference in Proof of Play RPC and page (td.name -> td.device_name)

### Phase 111: Documents and Calendar
**Goal**: Users can display PDF/Office documents and live calendar events from Google Calendar and Outlook on their screens
**Depends on**: Phase 108 (widget registry pattern established), Phase 110 (enterprise auth available for OAuth flows)
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, CAL-01, CAL-02, CAL-03, CAL-04, CAL-05
**Success Criteria** (what must be TRUE):
  1. User can upload PDF and Word/PPT/Excel documents as media assets, and they are automatically converted to images server-side
  2. User can add a document widget to a layout zone that auto-advances through pages on the screen player
  3. Document display works on WebOS and Tizen smart TV devices (rendered as pre-converted images, never raw documents)
  4. User can connect Google Calendar and Outlook via OAuth and display upcoming events on screen with auto-refresh
  5. Calendar widget supports multiple calendar sources per widget instance
**Plans**: TBD

### Phase 112: Canva and Video Wall
**Goal**: Users can import Canva designs for screen display, and administrators can configure multi-screen video walls with synchronized playback
**Depends on**: Phase 111 (all content types available for video wall display)
**Requirements**: CANVA-01, CANVA-02, CANVA-03, CANVA-04, VWALL-01, VWALL-02, VWALL-03, VWALL-04
**Success Criteria** (what must be TRUE):
  1. User can browse their Canva designs from within BizScreen, import a design as a media asset, and see it displayed correctly on the screen player
  2. User can re-import an updated Canva design to refresh previously imported content
  3. Admin can create a video wall configuration defining a grid of screens with row/column positions and bezel compensation
  4. Screens in a video wall synchronize content playback within 200ms via Supabase Realtime
**Plans**: TBD

### Phase 113: Enterprise Platform Fixes
**Goal**: Fix API scope mismatch on screen assignment endpoint and wire playback summary stats to the main dashboard
**Depends on**: Phase 110 (fixes issues in completed enterprise platform)
**Requirements**: API-04 (scope fix), POP-05 (dashboard placement)
**Gap Closure:** Closes integration and flow gaps from v12.0 audit
**Success Criteria** (what must be TRUE):
  1. `PUT /v1/screens/:id/assignment` requires `screens:write` scope (not `screens:read`)
  2. `screens:write` scope exists in the API token system and can be assigned to tokens
  3. Playback summary statistics are visible on the main DashboardPage (not only ProofOfPlayPage)
**Plans**: TBD

### Phase 114: Integration Pipeline Fixes
**Goal**: Fix cross-phase integration gaps: document upload conversion pipeline, embed widget rendering in layout zones, and build-blocking import error
**Depends on**: Phase 111 (document service), Phase 108 (widget registry)
**Requirements**: Fixes integration for DOC-01, DOC-02, DOC-03, DOC-06, EMBED-01–07, SLIDES-01–03
**Gap Closure:** Closes 2 integration gaps + 2 broken E2E flows from v12.0 audit + 1 tech debt blocker
**Success Criteria** (what must be TRUE):
  1. Uploading a PDF/Office file via media library calls `documentService.uploadDocument()` and invokes server-side conversion
  2. Embed widgets (YouTube, Vimeo, Google Slides, web page) render correctly in layout zone player via `ZonePlayer`
  3. `npm run build` succeeds (TVPreviewModal import fixed)
**Plans**: 2 plans
- [ ] 114-01-PLAN.md -- Document upload pipeline wiring (useS3Upload document interception, useMediaLibrary conversion handling)
- [ ] 114-02-PLAN.md -- Widget rendering in ZonePlayer via registry pattern, ScaledStage import fix for build success

## Progress

**Execution Order:** Phases execute in numeric order: 108 -> 109 -> 110 -> 111 -> 112 -> 113 -> 114

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 108. Embed Widgets | 2/2 | Complete    | 2026-03-03 |
| 109. Content Model | 5/5 | Complete    | 2026-03-03 |
| 110. Enterprise Platform | 4/4 | Complete    | 2026-03-04 |
| 111. Documents and Calendar | 4/4 | Complete    | 2026-03-04 |
| 112. Canva and Video Wall | 0/TBD | Not started | - |
| 113. Enterprise Platform Fixes | 1/1 | Complete    | 2026-03-04 |
| 114. Integration Pipeline Fixes | 1/2 | In Progress|  |

## Progress Summary

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1 Production Release | 1-12 | 75 | Complete | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | Complete | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | Complete | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | Complete | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | Complete | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | Complete | 2026-02-10 |
| v3.0 Creative Experience | 46-50 | 10 | Complete | 2026-02-11 |
| v3.1 Data-Driven Screens | 51-55 | 15 | Complete | 2026-02-13 |
| v3.2 Display Toolkit | 56-63 | 16 | Complete | 2026-02-19 |
| v4.0 Player Hardening | 64-68 | 11 | Complete | 2026-02-20 |
| v5.0 UI Completeness | 69-71 | 5 | Complete | 2026-02-20 |
| v6.0 Functional Completeness | 72-80 | 20 | Complete | 2026-02-23 |
| v7.0 UI Verification | 81-91 | 28 | Complete | 2026-02-27 |
| v8.0 Comprehensive E2E | 92-93 | 8 | Complete | 2026-02-28 |
| v9.0 Production Polish | 94 | 2 | Complete | 2026-02-28 |
| v10.0 Visual QA Audit | 98-103 | 10 | Complete | 2026-03-01 |
| v11.0 Stability Pass | 104-107 | 8 | Complete | 2026-03-02 |
| v12.0 Feature Parity | 108-114 | TBD | In progress | - |

**Total:** 109 phases (104 complete, 7 planned) | 299 plans executed | 18 milestones (17 shipped, 1 in progress)

---
*Last updated: 2026-03-04 -- Phase 114 (Integration Pipeline Fixes) added from gap closure audit*
