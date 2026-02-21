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
- [ ] **v6.0 Functional Completeness** — Phases 72-80 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3, v2.4, v3.0, v3.1, v3.2, v4.0, v5.0)</summary>

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

All milestones shipped successfully.

</details>

## Phases

**v6.0 Functional Completeness** — Every interactive UI element performs its intended action.

- [x] **Phase 72: Bug Fixes & Stability** - Fix runtime errors and broken wiring before building new features (completed 2026-02-21)
- [x] **Phase 73: SVG Editor Text & Object Controls** - Hyperlinks, settings panels, expanded menus, and aspect ratio lock for all object types (completed 2026-02-21)
- [x] **Phase 74: SVG Editor Image Manipulation** - Precise positioning, cropping, and image replacement for image objects (completed 2026-02-21)
- [ ] **Phase 75: Cloud Media Integrations** - OAuth-based import from Google Drive, Dropbox, OneDrive, SharePoint, and Google Photos
- [ ] **Phase 76: Enterprise Security Controls** - Password policies, session management, JWT configuration, data deletion, and plan upgrade from enterprise security page
- [ ] **Phase 77: Content & Media Features** - Video uploads in carousel, property events, graphics library in layout editor, and content analytics timeline
- [ ] **Phase 78: Platform Wiring** - Payment method update and app configuration editing
- [ ] **Phase 79: AI Designer** - Generate complete layouts from text prompts
- [x] **Phase 80: SVG Editor Integration Polish** - Fix integration defects and tech debt from completed phases 73-74 (completed 2026-02-21)

## Phase Details

### Phase 72: Bug Fixes & Stability
**Goal**: Eliminate runtime errors and broken data wiring so the platform has a stable foundation for new feature work
**Depends on**: Nothing (first phase of v6.0)
**Requirements**: BUGF-01, BUGF-02, BUGF-03
**Success Criteria** (what must be TRUE):
  1. BrandingSettingsPage renders without console errors when X icon is displayed
  2. Notification emails arrive at the correct user email address for all alert types
  3. Device status RPC errors in App.jsx are caught and logged without crashing the app
**Plans**: 1 plan
Plans:
- [ ] 72-01-PLAN.md -- Fix X icon import, notification email resolution, and device status RPC error handling

### Phase 73: SVG Editor Text & Object Controls
**Goal**: Users can fully configure text and object properties in the SVG editor -- hyperlinks, settings panels, expanded menus, and aspect ratio lock all work
**Depends on**: Phase 72
**Requirements**: EDIT-01, EDIT-02, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-10
**Success Criteria** (what must be TRUE):
  1. User can add a hyperlink to a text object and later edit or remove it
  2. User can add a hyperlink to an image object and later edit or remove it
  3. User can open the element settings panel for both text and image objects and modify properties
  4. User can right-click or tap the expanded options menu on any selected object and access all listed actions
  5. User can toggle aspect ratio lock on/off when resizing any object, and clicking a hyperlinked object opens the URL
**Plans**: 2 plans
Plans:
- [ ] 73-01-PLAN.md -- Hyperlink system for text and image objects with click-to-open behavior
- [ ] 73-02-PLAN.md -- Element settings panel, expanded options menu, and aspect ratio lock

### Phase 74: SVG Editor Image Manipulation
**Goal**: Users can precisely position, crop, and swap images within the SVG editor
**Depends on**: Phase 73
**Requirements**: EDIT-03, EDIT-04, EDIT-05
**Success Criteria** (what must be TRUE):
  1. User can set exact X/Y position and choose alignment (center, left, right, top, bottom) for image objects
  2. User can crop an image object to a custom region and see the result immediately on canvas
  3. User can replace an existing image with a new image from media library or upload, preserving position and size
**Plans**: 2 plans
Plans:
- [ ] 74-01-PLAN.md -- Wire Position/alignment and Replace Image for image objects
- [ ] 74-02-PLAN.md -- Image cropping with crop mode, clipPath, and apply/cancel workflow

### Phase 75: Cloud Media Integrations
**Goal**: Users can connect external cloud storage accounts and import media files directly into BizScreen
**Depends on**: Phase 72
**Requirements**: CLOUD-01, CLOUD-02, CLOUD-03, CLOUD-04, CLOUD-05
**Success Criteria** (what must be TRUE):
  1. User can authenticate with Google Drive via OAuth and browse/select files to import into media library
  2. User can authenticate with Dropbox via OAuth and browse/select files to import into media library
  3. User can authenticate with OneDrive via OAuth and browse/select files to import into media library
  4. User can authenticate with SharePoint via OAuth and browse/select files to import into media library
  5. User can authenticate with Google Photos via OAuth and browse/select files to import into media library
**Plans**: 3 plans
Plans:
- [ ] 75-01-PLAN.md -- Shared cloud OAuth utility + Google Drive and Dropbox services
- [ ] 75-02-PLAN.md -- OneDrive, SharePoint, and Google Photos services
- [ ] 75-03-PLAN.md -- CloudFilePicker modal, wire cloud providers in Add Media modal, and OAuth callback handling

### Phase 76: Enterprise Security Controls
**Goal**: Admins can configure all security policies from the enterprise security page and manage tenant data lifecycle
**Depends on**: Phase 72
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06
**Success Criteria** (what must be TRUE):
  1. User can click the plan upgrade CTA on the enterprise security upsell screen and navigate to the billing/plan page
  2. User can set minimum password length and complexity requirements (uppercase, numbers, special chars) and see them enforced on next password change
  3. User can configure session timeout duration and JWT token expiry from enterprise security settings
  4. User can trigger full tenant data deletion from the enterprise security page with confirmation safeguards
**Plans**: TBD

### Phase 77: Content & Media Features
**Goal**: Users can upload video to carousels, manage property events, browse a graphics library in the layout editor, and view timeline analytics for content
**Depends on**: Phase 72
**Requirements**: FEAT-02, FEAT-03, FEAT-04, FEAT-05
**Success Criteria** (what must be TRUE):
  1. User can upload and attach video files in the carousel media manager alongside images
  2. User can add, edit, and remove upcoming events on a property detail page
  3. User can browse and insert graphics from a sidebar library panel in the layout editor
  4. User can view media play counts and playlist performance over time on the content detail analytics page
**Plans**: TBD

### Phase 78: Platform Wiring
**Goal**: Users can manage their payment method and edit app configurations without leaving the platform
**Depends on**: Phase 72
**Requirements**: FEAT-06, FEAT-07
**Success Criteria** (what must be TRUE):
  1. User can update their credit card or payment method from the subscription/billing page
  2. User can open an installed app's configuration from the apps page, make changes, and save
**Plans**: TBD

### Phase 79: AI Designer
**Goal**: Users can describe what they want in plain language and receive a complete, editable layout
**Depends on**: Phase 74
**Requirements**: FEAT-01
**Success Criteria** (what must be TRUE):
  1. User can type a text prompt describing a layout (e.g. "restaurant menu board with daily specials") and submit it
  2. System generates a complete layout with zones, content placeholders, and styling based on the prompt
  3. User can view the generated layout in the editor and modify any element as if they had built it manually
**Plans**: TBD

### Phase 80: SVG Editor Integration Polish
**Goal**: Fix integration defects and tech debt discovered in completed phases 73-74 — runtime crash, disconnected toggle, and stale panel state
**Depends on**: Phase 74
**Requirements**: EDIT-01, EDIT-03, EDIT-06, EDIT-10 (re-verify after fixes)
**Gap Closure:** Closes gaps from v6.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. PositionPanel close button renders without runtime error (X icon properly imported)
  2. HyperlinkModal openInNewTab toggle value is saved and applied to the hyperlink target property
  3. ElementSettingsPanel name edits are reflected in LayersPanel canvasObjects state
  4. ElementSettingsPanel closes automatically when canvas selection is cleared
**Plans**: 1 plan
Plans:
- [ ] 80-01-PLAN.md -- Fix PositionPanel X icon crash, HyperlinkModal openInNewTab wiring, settings panel sync and auto-close

## Progress

**Execution Order:**
Phases 72 first (fixes), then 73-74 sequentially (editor features build on each other), 75-78 in parallel (independent), 79 last (depends on editor phases). Phase 80 can run anytime after 74 (fixes defects in completed phases).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 72. Bug Fixes & Stability | 1/1 | Complete    | 2026-02-21 | - |
| 73. SVG Editor Text & Object Controls | 2/2 | Complete    | 2026-02-21 | - |
| 74. SVG Editor Image Manipulation | 2/2 | Complete    | 2026-02-21 | - |
| 75. Cloud Media Integrations | 1/3 | In Progress|  | - |
| 76. Enterprise Security Controls | v6.0 | 0/TBD | Not started | - |
| 77. Content & Media Features | v6.0 | 0/TBD | Not started | - |
| 78. Platform Wiring | v6.0 | 0/TBD | Not started | - |
| 79. AI Designer | v6.0 | 0/TBD | Not started | - |
| 80. SVG Editor Integration Polish | 1/1 | Complete    | 2026-02-21 | - |

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
| v6.0 Functional Completeness | 72-80 | TBD | In progress | - |

**Total:** 71 phases complete, 227 plans executed | 11 milestones shipped | v6.0 in progress (9 phases)

---
*Last updated: 2026-02-20 -- v6.0 Functional Completeness roadmap created*
