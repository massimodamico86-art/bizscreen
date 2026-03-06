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
- [x] **v12.0 Feature Parity** -- Phases 108-114 (shipped 2026-03-05)
- [ ] **v13.0 Full Stability Pass** -- Phases 115-124 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1 through v12.0)</summary>

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

**v12.0 Feature Parity** -- Phases 108-114 (7 phases, 21 plans, 57 requirements)
See `.planning/milestones/v12.0-ROADMAP.md`

All 18 milestones shipped successfully.

</details>

## Phases

### v13.0 Full Stability Pass

- [ ] **Phase 115: Dashboard & Media E2E** - Screenshot tests for dashboard widgets, navigation, and full media library flows
- [ ] **Phase 116: Scenes & SVG Editor E2E** - Screenshot tests for scene CRUD and all SVG editor tools/panels
- [ ] **Phase 117: Playlists & Layouts E2E** - Screenshot tests for playlist editor and layout zone/widget configuration
- [ ] **Phase 118: Templates, Schedules & Campaigns E2E** - Screenshot tests for template marketplace, schedule creation, and campaign management
- [ ] **Phase 119: Screens & Device Management E2E** - Screenshot tests for screen pairing, groups, diagnostics, and remote commands
- [ ] **Phase 120: Data Sources, Apps & Moderation E2E** - Screenshot tests for data sources, apps gallery, menu boards, and content moderation
- [ ] **Phase 121: Analytics, Settings & Admin E2E** - Screenshot tests for analytics dashboards, settings pages, and admin/reseller portals
- [ ] **Phase 122: Responsive & Edge Cases E2E** - Screenshot tests for viewport responsiveness, role-based access, and error/edge states
- [ ] **Phase 123: Error Resilience & UX Polish** - Error boundaries on route segments, API backoff patterns, skeleton loaders, and error state redesign
- [ ] **Phase 124: CI Pipeline & Final Integration** - CI test execution, pass rate gate, and screenshot comparison report

## Phase Details

### Phase 115: Dashboard & Media E2E
**Goal**: Every dashboard widget and media library operation has screenshot-verified E2E coverage
**Depends on**: Nothing (uses existing v8.0 test infrastructure)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-05, MEDIA-06, MEDIA-07, MEDIA-08, MEDIA-09, MEDIA-10
**Success Criteria** (what must be TRUE):
  1. Running the dashboard E2E spec produces screenshots of stat cards, sidebar navigation to all pages, breadcrumb paths, welcome vs dashboard differentiation, and notification dropdown
  2. Running the media E2E spec produces screenshots of upload flow, grid/list toggle, type filtering, preview popover, rename, delete, bulk operations, folder creation, storage bar, and all 5 sub-pages
  3. All tests pass in CI with screenshot artifacts uploaded
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 116: Scenes & SVG Editor E2E
**Goal**: Scene list operations and every SVG editor tool/panel have screenshot-verified E2E coverage
**Depends on**: Phase 115
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04, SCENE-05, SCENE-06, SCENE-07, SCENE-08, SCENE-09, SCENE-10, SCENE-11, SCENE-12, SCENE-13, SCENE-14, SCENE-15, SCENE-16, SCENE-17
**Success Criteria** (what must be TRUE):
  1. Running the scenes E2E spec produces screenshots of scene list CRUD (create, duplicate, delete), creation modal, and SVG editor loading
  2. Running the editor tools E2E spec produces screenshots of text/shape creation, image insertion, element manipulation, layers panel, effects panel, animation panel, position panel, undo/redo, save feedback, export dialog, context menu, cloud import panel, and AI Designer
  3. All 17 scene/editor test cases pass with screenshots captured at each step
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 117: Playlists & Layouts E2E
**Goal**: Playlist editing workflows and layout zone/widget configuration have screenshot-verified E2E coverage
**Depends on**: Phase 115
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07, PLAY-08, LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, LAYOUT-06, LAYOUT-07, LAYOUT-08
**Success Criteria** (what must be TRUE):
  1. Running the playlists E2E spec produces screenshots of list CRUD, creation modal, item addition, drag reorder, duration/transition settings, nested playlist insertion, background audio controls, and player preview
  2. Running the layouts E2E spec produces screenshots of list/filter, creation modal, zone selection, widget type selector (17+ types), and configuration panels for clock, weather, data table, and video widgets
  3. All 16 playlist/layout test cases pass with screenshots captured at each step
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 118: Templates, Schedules & Campaigns E2E
**Goal**: Template marketplace, schedule creation, and campaign management have screenshot-verified E2E coverage
**Depends on**: Phase 115
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, CAMP-07, CAMP-08, CAMP-09
**Success Criteria** (what must be TRUE):
  1. Running the templates E2E spec produces screenshots of gallery browse, search, card hover animation, one-click editor open, quick customize panel, Your Designs tab, orientation filter, and industry categories
  2. Running the schedules E2E spec produces screenshots of list CRUD, time/day creation, playlist/layout assignment, conflict detection, dayparting, and recurring entries
  3. Running the campaigns E2E spec produces screenshots of list with status, creation with priority/dates, content assignment, screen targeting, emergency push, analytics, rotation controls, seasonal picker, and template picker
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 119: Screens & Device Management E2E
**Goal**: Screen pairing, group management, diagnostics, and remote commands have screenshot-verified E2E coverage
**Depends on**: Phase 115
**Requirements**: SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, SCRN-06, SCRN-07, SCRN-08, SCRN-09, SCRN-10, SCRN-11
**Success Criteria** (what must be TRUE):
  1. Running the screens E2E spec produces screenshots of screen list with status indicators, creation with pairing code, OTP flow, device diagnostics, and remote command buttons
  2. Running the screen management E2E spec produces screenshots of group management with tags, playlist/layout assignment, orientation toggle, master PIN modal, emergency push for groups, and working hours schedule
  3. All 11 screen test cases pass with screenshots captured at each step
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 120: Data Sources, Apps & Moderation E2E
**Goal**: Data source configuration, apps gallery, menu board editing, and content moderation have screenshot-verified E2E coverage
**Depends on**: Phase 115
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, APP-01, APP-02, APP-03, APP-04, APP-05, APP-06, APP-07, APP-08, MOD-01, MOD-02, MOD-03, MOD-04, MOD-05
**Success Criteria** (what must be TRUE):
  1. Running the data sources E2E spec produces screenshots of source list, Google Sheets creation, CSV upload, RSS URL config, and refresh interval settings
  2. Running the apps/menu boards E2E spec produces screenshots of apps gallery, app detail modal, app install/config, menu board list, editor CRUD, drag reorder, dietary tags, and theme/currency settings
  3. Running the moderation E2E spec produces screenshots of moderation queue, approve action, reject with reason, review inbox filtering, and hashtag filter config
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 121: Analytics, Settings & Admin E2E
**Goal**: Analytics dashboards, all settings pages, and admin/reseller portals have screenshot-verified E2E coverage
**Depends on**: Phase 115
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05, ANLYT-06, ANLYT-07, ANLYT-08, SET-01, SET-02, SET-03, SET-04, SET-05, SET-06, SET-07, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08
**Success Criteria** (what must be TRUE):
  1. Running the analytics E2E spec produces screenshots of analytics dashboard, content performance, activity log, alerts with severity, alert detail modal, notification settings with toggles, toggle persistence, and Proof of Play report
  2. Running the settings E2E spec produces screenshots of general settings, account/plan, branding with logo/colors, team management with invite/roles, developer API keys, white-label domain, and enterprise security settings
  3. Running the admin E2E spec produces screenshots of tenant list with search/pagination, tenant detail with usage, audit log, system events, template management, reseller dashboard, reseller billing, and feature flags with persistence
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 122: Responsive & Edge Cases E2E
**Goal**: Viewport responsiveness, role-based access, and error/edge states have screenshot-verified E2E coverage
**Depends on**: Phases 115-121 (all E2E test phases)
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-04, RESP-05, RESP-06, RESP-07, RESP-08, EDGE-01, EDGE-02, EDGE-03, EDGE-04, EDGE-05, EDGE-06, EDGE-07, EDGE-08
**Success Criteria** (what must be TRUE):
  1. Running the responsive E2E spec produces screenshots of dashboard at mobile (375px) and tablet (768px), hamburger menu collapse, media grid column adjustment, template gallery responsive layout, pricing tablet grid, schedule editor on tablet, and admin-hidden nav for non-admin users
  2. Running the edge cases E2E spec produces screenshots of 404 page, session expiry redirect, empty states on list pages, inline form validation errors, network error toast, concurrent tab behavior, deep link auth redirect, and browser back/forward state preservation
  3. All responsive tests use Playwright viewport projects (mobile/tablet/desktop) with testMatch opt-in
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 123: Error Resilience & UX Polish
**Goal**: The application gracefully handles errors at every level and loading states match page structure
**Depends on**: Nothing (code changes, independent of E2E phases)
**Requirements**: RESIL-01, RESIL-02, RESIL-03, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Every route segment in the application is wrapped by a React error boundary that displays a fallback UI with a "Try Again" button instead of a white screen
  2. All API calls retry with exponential backoff (configurable max retries) and display a clear error state when retries are exhausted
  3. A connection state indicator in the app header shows offline/reconnecting/online status reflecting actual network state
  4. All list pages show skeleton loaders (not spinners) on initial load, with skeleton shapes matching the page's actual layout structure (cards, tables, grids)
  5. Error states across the app show an icon, descriptive message, and actionable CTA (retry, go home, or contact support)
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

### Phase 124: CI Pipeline & Final Integration
**Goal**: All E2E tests run reliably in CI with automated quality gates and visual regression detection
**Depends on**: Phases 115-123 (all prior phases)
**Requirements**: CI-01, CI-02, CI-03
**Success Criteria** (what must be TRUE):
  1. The full E2E test suite runs in GitHub Actions CI with all screenshot artifacts uploaded and retained
  2. A quality gate enforces 90% E2E pass rate with best-of-3 retry before merging
  3. A screenshot comparison report is generated after each CI run for visual regression detection
**Plans**: 3 plans
Plans:
- [ ] 115-01-PLAN.md — Dashboard screenshot E2E tests (stat cards, sidebar nav, breadcrumbs, welcome vs dashboard, notifications)
- [ ] 115-02-PLAN.md — Media core screenshot E2E tests (upload, grid/list, type filtering, preview, rename, delete)
- [ ] 115-03-PLAN.md — Media advanced screenshot E2E tests (bulk ops, folders, storage bar, all 5 sub-pages)

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
| v12.0 Feature Parity | 108-114 | 21 | Complete | 2026-03-05 |

### v13.0 Full Stability Pass Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 115. Dashboard & Media E2E | 1/3 | In Progress|  |
| 116. Scenes & SVG Editor E2E | 0/TBD | Not started | - |
| 117. Playlists & Layouts E2E | 0/TBD | Not started | - |
| 118. Templates, Schedules & Campaigns E2E | 0/TBD | Not started | - |
| 119. Screens & Device Management E2E | 0/TBD | Not started | - |
| 120. Data Sources, Apps & Moderation E2E | 0/TBD | Not started | - |
| 121. Analytics, Settings & Admin E2E | 0/TBD | Not started | - |
| 122. Responsive & Edge Cases E2E | 0/TBD | Not started | - |
| 123. Error Resilience & UX Polish | 0/TBD | Not started | - |
| 124. CI Pipeline & Final Integration | 0/TBD | Not started | - |

**Total:** 124 phases | 320 plans executed | 19 milestones (18 shipped, 1 in progress)

---
*Last updated: 2026-03-06 -- v13.0 Full Stability Pass roadmap created*
