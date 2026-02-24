# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** — Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** — Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** — Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** — Phases 30-35 (shipped 2026-02-05)
- [x] **v2.3 Production Hardening** — Phases 36-41 (shipped 2026-02-09)
- [x] **v2.4 Tech Debt Zero** — Phases 42-45 (shipped 2026-02-10)
- [x] **v3.0 Creative Experience** — Phases 46-50 (shipped 2026-02-11)
- [x] **v3.1 Data-Driven Screens** — Phases 51-55 (shipped 2026-02-13)
- [x] **v3.2 Display Toolkit** — Phases 56-63 (shipped 2026-02-19)
- [x] **v4.0 Player Hardening** — Phases 64-68 (shipped 2026-02-20)
- [x] **v5.0 UI Completeness** — Phases 69-71 (shipped 2026-02-20)
- [x] **v6.0 Functional Completeness** — Phases 72-80 (shipped 2026-02-23)
- [ ] **v7.0 UI Verification** — Phases 81-90 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1 through v6.0)</summary>

**v1 Production Release** — Phases 1-12
See `.planning/milestones/v1-ROADMAP.md`

**v2 Templates & Platform Polish** — Phases 13-23
See `.planning/milestones/v2-ROADMAP.md`

**v2.1 Tech Debt Cleanup** — Phases 24-29
See `.planning/milestones/v2.1-ROADMAP.md`

**v2.2 Onboarding Polish** — Phases 30-35
See `.planning/milestones/v2.2-ROADMAP.md`

**v2.3 Production Hardening** — Phases 36-41
See `.planning/milestones/v2.3-ROADMAP.md`

**v2.4 Tech Debt Zero** — Phases 42-45
See `.planning/milestones/v2.4-ROADMAP.md`

**v3.0 Creative Experience** — Phases 46-50
See `.planning/milestones/v3.0-ROADMAP.md`

**v3.1 Data-Driven Screens** — Phases 51-55
See `.planning/milestones/v3.1-ROADMAP.md`

**v3.2 Display Toolkit** — Phases 56-63
See `.planning/milestones/v3.2-ROADMAP.md`

**v4.0 Player Hardening** — Phases 64-68
See `.planning/milestones/v4.0-ROADMAP.md`

**v5.0 UI Completeness** — Phases 69-71
See `.planning/milestones/v5.0-ROADMAP.md`

**v6.0 Functional Completeness** — Phases 72-80 (shipped 2026-02-23)
See `.planning/milestones/v6.0-ROADMAP.md`

All milestones shipped successfully.

</details>

## Phases

### v7.0 UI Verification

**Milestone Goal:** Systematically audit every page in the application — verify every button, form, modal, and action performs its intended function, and fix all gaps found.

- [x] **Phase 81: Authentication & Dashboard** - Verify all auth flows and dashboard widgets are fully functional (completed 2026-02-23)
- [x] **Phase 82: Media Library** - Verify upload, preview, bulk actions, and search work end-to-end (completed 2026-02-23)
- [ ] **Phase 83: Scene Editor & AI Designer** - Verify SVG editor tools, property panels, AI generation, and cloud imports
- [ ] **Phase 84: Playlists, Layouts & Templates** - Verify playlist CRUD, layout editor zones, widget config, and template marketplace
- [x] **Phase 85: Scheduling & Campaigns** - Verify schedule creation, conflict detection, dayparting, and campaign management (completed 2026-02-24)
- [ ] **Phase 86: Screen Management** - Verify screen list, pairing, groups, diagnostics, and remote commands
- [ ] **Phase 87: Data Sources, Apps & Moderation** - Verify data source config, app editing, menu boards, and content moderation queues
- [ ] **Phase 88: Analytics & Alerts** - Verify analytics dashboards, content metrics, alert history, and notification settings
- [ ] **Phase 89: Settings & Account** - Verify billing, branding, enterprise security, team management, and white-label settings
- [ ] **Phase 90: Admin, Reseller, Help & Legacy** - Verify admin tools, reseller portal, help center, and legacy page stability

## Phase Details

### Phase 81: Authentication & Dashboard
**Goal**: All authentication flows complete without errors and the dashboard surfaces correct data with working navigation
**Depends on**: Nothing (first phase of v7.0)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and receive the verification prompt
  2. User can log in and is redirected to the correct page (dashboard or intended destination)
  3. User can reset their password via the forgot-password email flow
  4. User can accept a team invitation and complete account setup
  5. Dashboard loads all widgets, quick actions navigate correctly, and no JS errors appear in the console
**Plans**: 2 plans
Plans:
- [ ] 81-01-PLAN.md — Auth flow audit and fix (login, signup, reset, update-password, accept-invite)
- [ ] 81-02-PLAN.md — Dashboard verification and fix (widgets, quick action navigation, console errors)

### Phase 82: Media Library
**Goal**: The media library supports the full file management lifecycle with no broken interactions
**Depends on**: Phase 81
**Requirements**: MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04
**Success Criteria** (what must be TRUE):
  1. User can upload one or more media files and see progress feedback during the upload
  2. User can preview a media item in a modal, rename it inline, and delete it with confirmation
  3. User can bulk-select multiple items and delete them all in one action
  4. User can filter the library by type and search by filename, with results updating correctly
**Plans**: 4 plans
Plans:
- [ ] 82-01-PLAN.md — Upload flow: error surfacing via toast + progress feedback in modal
- [ ] 82-02-PLAN.md — Detail modal: preview rendering, rename validation, delete confirmation
- [ ] 82-03-PLAN.md — Bulk select: fix missing X import in BulkActionBar + list-view checkbox wiring
- [ ] 82-04-PLAN.md — Filter/search verification + human checkpoint

### Phase 83: Scene Editor & AI Designer
**Goal**: The SVG scene editor and AI Designer are fully functional — every tool, property panel, and cloud import path works without errors
**Depends on**: Phase 82
**Requirements**: SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05
**Success Criteria** (what must be TRUE):
  1. User can create, duplicate, and delete scenes from the scene list without errors
  2. All SVG editor tools (text, shapes, images, layers panel) add and manipulate elements correctly
  3. All property panels (position, style, effects, hyperlinks, image crop/replace) apply changes that persist on save
  4. AI Designer accepts a text prompt, generates a layout, and supports at least one iterative refinement
  5. All five cloud import providers (Google Drive, Dropbox, OneDrive, SharePoint, Google Photos) open a file picker and insert the selected file into the editor
**Plans**: 3 plans
Plans:
- [ ] 083-01-PLAN.md — Scene CRUD: add delete and duplicate to ScenesPage and SceneDetailPage
- [ ] 083-02-PLAN.md — SVG editor tools and property panels audit and fix (human checkpoint)
- [ ] 083-03-PLAN.md — AI suggestions panel and cloud imports into SVG editor LeftSidebar (human checkpoint)

### Phase 84: Playlists, Layouts & Templates
**Goal**: Users can build and configure playlists, layout canvases with all 12 widget types, and apply templates from both the layout template library and the marketplace
**Depends on**: Phase 83
**Requirements**: PLAY-01, PLAY-02, PLAY-03, LAYT-01, LAYT-02, LAYT-03, LAYT-04, TMPL-01, TMPL-02
**Success Criteria** (what must be TRUE):
  1. User can create, rename, and delete playlists and add/reorder/remove items in the playlist editor
  2. User can create, edit, and delete layouts, and resize and configure zones in the layout editor
  3. All 12 widget types render their configuration controls correctly in the layout editor zone properties panel
  4. Layout templates can be browsed, previewed, and applied to create a new layout
  5. Template marketplace search, filter, preview, one-click apply, and customization wizard all complete without errors
**Plans**: 3 plans
Plans:
- [ ] 84-01-PLAN.md — Playlist CRUD and editor (create/rename/delete, add/reorder/remove items, duration/transition settings)
- [ ] 84-02-PLAN.md — Layout editor zones and layout templates (zone CRUD, all 12 widget controls, template browse/apply)
- [ ] 84-03-PLAN.md — Template marketplace (search, filter, preview, one-click apply, customization wizard)

### Phase 85: Scheduling & Campaigns
**Goal**: Users can build schedules with time/day rules, see conflict warnings, configure dayparting, and manage campaigns end-to-end
**Depends on**: Phase 84
**Requirements**: SCHED-01, SCHED-02, SCHED-03, CAMP-01, CAMP-02, CAMP-03
**Success Criteria** (what must be TRUE):
  1. User can create a schedule with time/day rules, assign content, and save without errors
  2. Schedule conflict detection surfaces a warning when overlapping rules are detected
  3. Weekly preview and daypart configuration controls are functional and reflect saved settings
  4. User can create, edit, and delete a campaign with rotation, priority, and seasonal date controls working
  5. Campaign analytics display play counts and engagement data for the selected campaign
**Plans**: 2 plans
Plans:
- [ ] 85-01-PLAN.md — Schedule pages import audit and functional verification (SchedulesPage, ScheduleEditorPage)
- [ ] 85-02-PLAN.md — Campaign pages import audit and functional verification (CampaignsPage, CampaignEditorPage)

### Phase 86: Screen Management
**Goal**: Screen listing, pairing, group management, device diagnostics, and remote commands all work end-to-end
**Depends on**: Phase 85
**Requirements**: SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05
**Success Criteria** (what must be TRUE):
  1. Screens list loads with correct online/offline status badges, search filters results, and bulk actions execute
  2. Screen pairing flow (QR code scan and OTP fallback) completes without errors and the screen appears in the list
  3. Screen groups can be created, tags added and removed, and screens filtered by tag
  4. Screen detail page shows device health metrics, color-coded diagnostics, and the latest screenshot
  5. Remote commands (reboot, reload, on-demand screenshot capture) trigger and produce visible feedback
**Plans**: TBD

### Phase 87: Data Sources, Apps & Moderation
**Goal**: Data source configuration, app CRUD with pre-populated edit modals, menu board management, and content moderation queues are all fully wired
**Depends on**: Phase 86
**Requirements**: DATA-01, DATA-02, DATA-03, MODQ-01, MODQ-02
**Success Criteria** (what must be TRUE):
  1. User can create and configure data sources (Google Sheets, CSV, RSS) with correct field mapping
  2. All six app types can be added and edited, with edit modals pre-populating existing values
  3. Menu board categories and items support CRUD operations and drag-and-drop reordering
  4. Social feed moderation queue displays pending posts and approve/reject actions update post status
  5. Review inbox shows pending content approvals and approve/reject actions publish or reject the content
**Plans**: TBD

### Phase 88: Analytics & Alerts
**Goal**: Analytics dashboards show accurate data with working filters, alert history is viewable and dismissable, and notification preferences are configurable
**Depends on**: Phase 87
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ALRT-01, ALRT-02
**Success Criteria** (what must be TRUE):
  1. Analytics dashboard loads charts and date-range filters produce updated results
  2. Content performance page shows per-content play counts and metrics without errors
  3. Content detail analytics timeline renders chronological play data for a selected item
  4. Activity log displays chronological system events in the correct order
  5. Alert history loads and individual alerts can be dismissed; notification settings save alert type and delivery preferences
**Plans**: TBD

### Phase 89: Settings & Account
**Goal**: Billing, branding, enterprise security, team management, and white-label settings are all editable and save correctly
**Depends on**: Phase 88
**Requirements**: SET-01, SET-02, SET-03, SET-04, SET-05
**Success Criteria** (what must be TRUE):
  1. Billing section loads subscription info and the Update Payment Method button opens the Stripe portal
  2. Branding settings (logo, primary/accent colors, fonts) can be changed and saved, with changes reflected in the UI
  3. Enterprise security controls (password policy, session timeout, data deletion) save and the DELETE MY DATA confirmation flow completes
  4. Team management page supports inviting a new member, changing a role, and removing a member
  5. White-label settings (custom domain, branding overrides) can be edited and saved without errors
**Plans**: TBD

### Phase 90: Admin, Reseller, Help & Legacy
**Goal**: Admin and reseller tooling surfaces correct data with working actions, the help center is navigable, and all legacy pages render without JavaScript errors
**Depends on**: Phase 89
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, RESELL-01, RESELL-02, RESELL-03, HELP-01, HELP-02, LEGC-01
**Success Criteria** (what must be TRUE):
  1. Admin tenant list loads and the tenant detail page shows correct tenant data and edit actions
  2. Feature flags page enables and disables flags per tenant and changes persist on reload
  3. Reseller dashboard loads client list with metrics and the clients page management actions (add, edit, remove) work
  4. Ops console, service quality, audit logs, and usage/translation dashboards all load and display data without errors
  5. Help center navigation and search return results; legacy pages (FAQs, Refer, Setup, Subscription, Users) render without JS errors
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 81. Authentication & Dashboard | 2/2 | Complete    | 2026-02-23 |
| 82. Media Library | 4/4 | Complete    | 2026-02-23 |
| 83. Scene Editor & AI Designer | 0/3 | Not started | - |
| 84. Playlists, Layouts & Templates | 0/3 | Not started | - |
| 85. Scheduling & Campaigns | 2/2 | Complete    | 2026-02-24 |
| 86. Screen Management | 0/TBD | Not started | - |
| 87. Data Sources, Apps & Moderation | 0/TBD | Not started | - |
| 88. Analytics & Alerts | 0/TBD | Not started | - |
| 89. Settings & Account | 0/TBD | Not started | - |
| 90. Admin, Reseller, Help & Legacy | 0/TBD | Not started | - |

**Total (v7.0):** 0/10 phases complete

---

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
| v7.0 UI Verification | 81-90 | TBD | In progress | - |

**Total:** 80 phases complete, 247 plans executed | 12 milestones shipped

---
*Last updated: 2026-02-23 — v7.0 UI Verification roadmap created*
