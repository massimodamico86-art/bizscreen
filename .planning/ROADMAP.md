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
- [x] **v7.0 UI Verification** — Phases 81-91 (shipped 2026-02-27)
- [x] **v8.0 Comprehensive E2E** — Phases 92-93 (shipped 2026-02-28, 139 reqs deferred)
- [x] **v9.0 Production Polish** — Phase 94 (shipped 2026-02-28, 20 reqs deferred)
- [ ] **v10.0 Visual QA Audit** — Phases 98-103 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1 through v9.0)</summary>

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

**v6.0 Functional Completeness** — Phases 72-80
See `.planning/milestones/v6.0-ROADMAP.md`

**v7.0 UI Verification** — Phases 81-91
See `.planning/milestones/v7.0-ROADMAP.md`

**v8.0 Comprehensive E2E** — Phases 92-93 (2/18 phases, 139 reqs deferred)
See `.planning/milestones/v8.0-ROADMAP.md`

**v9.0 Production Polish** — Phase 94 (1/4 phases, 20 reqs deferred)
See `.planning/milestones/v9.0-ROADMAP.md`

All milestones shipped successfully (15 total).

</details>

## Phases

### v10.0 Visual QA Audit (In Progress)

**Milestone Goal:** Perform a comprehensive end-to-end visual audit of the entire BizScreen app using Playwright MCP browser tools -- navigating every page, interacting with every feature, taking screenshots at every step, and producing a detailed audit report of bugs, visual glitches, and broken functionality. No code is written. All work is browser interaction via MCP tools (browser_navigate, browser_screenshot, browser_click, browser_type, browser_snapshot). All screenshots go to `./screenshots/` with sequential numbering.

- [x] **Phase 98: App Discovery & Navigation Map** - Navigate to every route, screenshot initial states, and document the complete navigation structure (completed 2026-03-01)
- [ ] **Phase 99: Authentication & Onboarding Flows** - Walk through all auth flows (login, signup, reset, logout) capturing screenshots and error states
- [ ] **Phase 100: Core Feature Walkthrough - CRUD Operations** - Create, browse, edit, delete, and interact with all major entities (screens, playlists, layouts, schedules, campaigns, etc.)
- [ ] **Phase 101: Display & Preview Modes** - Open all layout previews, toggle display options across widget types, test media uploads and QR generation
- [ ] **Phase 102: Settings, Configuration & Edge Cases** - Visit all settings pages, toggle configurations, test edge cases (empty states, long text, special chars), check responsive behavior
- [ ] **Phase 103: Audit Report Compilation** - Produce AUDIT_REPORT.md with page catalog, prioritized bug list, console errors, and screenshot coverage summary

## Phase Details

### Phase 98: App Discovery & Navigation Map
**Goal**: A complete map of every route and page in the application exists, with screenshots proving each page loads, and a documented list of all interactive elements
**Depends on**: Nothing (first phase in v10.0)
**Requirements**: DISC-01, DISC-02, DISC-03
**Success Criteria** (what must be TRUE):
  1. Every known app route has been visited via browser_navigate and a screenshot exists in `./screenshots/` showing its initial load state
  2. A browser_snapshot accessibility tree has been captured for every page, revealing all buttons, links, inputs, and interactive elements
  3. A complete route list document exists mapping every URL path to its page name, sidebar section, and whether it requires authentication
**Plans**: 98-01 (Public Routes), 98-02 (Authenticated Pages), 98-03 (Route Map Document) -- 3 waves

### Phase 99: Authentication & Onboarding Flows
**Goal**: Every authentication path (login, signup, reset password, logout) has been walked through step-by-step with screenshots capturing each form state, success state, and error state
**Depends on**: Phase 98 (navigation map identifies all auth-related routes)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. Screenshots exist for every step of the login flow -- empty form, filled form, submit, dashboard landing after successful login
  2. Screenshots exist showing error states for invalid credentials and empty field validation on login and signup
  3. Screenshots exist for the complete signup registration flow, password reset request and confirmation, and logout with post-logout state
  4. All loading states, empty states, and transition states encountered during auth flows have been captured
**Plans**: TBD

### Phase 100: Core Feature Walkthrough - CRUD Operations
**Goal**: Every major entity in the app (screens, playlists, layouts, scenes, schedules, campaigns, media, templates, data sources, apps, menu boards) has been created, browsed, edited, and deleted through the UI, with screenshots at each step
**Depends on**: Phase 99 (authenticated session established for CRUD operations)
**Requirements**: CRUD-01, CRUD-02, CRUD-03, CRUD-04, CRUD-05
**Success Criteria** (what must be TRUE):
  1. For each major entity type, screenshots show the create form with sample data entered and the resulting record after submission
  2. For each entity list/table view, screenshots show pagination controls, active filters, search results, and sorting -- demonstrating the list is functional
  3. Screenshots show edit forms pre-populated with existing data and the result after saving changes, plus delete confirmation dialogs and the list state after deletion
  4. Every toggle, dropdown, tab, and modal encountered on each page has been exercised and screenshot in both/all states
**Plans**: TBD

### Phase 101: Display & Preview Modes
**Goal**: All layout previews render correctly, all widget display options have been toggled and screenshot, and media upload and QR code generation features are verified
**Depends on**: Phase 100 (CRUD operations have created content to preview in layouts)
**Requirements**: DISP-01, DISP-02, DISP-03
**Success Criteria** (what must be TRUE):
  1. Screenshots exist of every layout preview at its default state, showing zones, widgets, and content rendering correctly
  2. Each widget display option (weather, clock, countdown, QR code, data table, RSS, social feed, menu board, video) has been toggled on/off with screenshots showing the visual change
  3. Media upload functionality and QR code generation have been exercised with screenshots showing the upload result and generated QR code
**Plans**: TBD

### Phase 102: Settings, Configuration & Edge Cases
**Goal**: Every settings page has been visited and toggled, edge cases (empty states, boundary inputs, special characters) have been tested, and responsive behavior verified at mobile, tablet, and desktop viewports
**Depends on**: Phase 101 (display modes complete before testing configuration edge cases)
**Requirements**: EDGE-01, EDGE-02, EDGE-03, EDGE-04
**Success Criteria** (what must be TRUE):
  1. Screenshots exist of every settings page (billing, branding, security, team, white-label, notifications, developer) showing their current configuration
  2. Every toggle and configuration option on settings pages has been switched with screenshots showing the before and after state
  3. Edge cases have been tested -- empty state pages (no data), very long text in input fields, special characters in names/descriptions -- with screenshots proving the UI handles them gracefully
  4. At least 3 key pages have been screenshot at mobile (375px), tablet (768px), and desktop (1440px) viewport widths, showing responsive layout behavior
**Plans**: TBD

### Phase 103: Audit Report Compilation
**Goal**: A comprehensive AUDIT_REPORT.md exists cataloging every page visited, every bug found (prioritized by severity), all console errors, and a full screenshot coverage summary
**Depends on**: Phase 102 (all browsing and testing complete before compiling the report)
**Requirements**: RPT-01, RPT-02, RPT-03
**Success Criteria** (what must be TRUE):
  1. AUDIT_REPORT.md contains a page catalog listing every URL visited with its page name and reference to its screenshot file(s)
  2. All bugs discovered during the audit are listed with severity (critical / major / minor / cosmetic), a description, the page/route where found, and screenshot evidence
  3. The report includes a console error log section, a total screenshot count, and a coverage summary showing which app areas were fully audited vs partially covered
**Plans**: TBD

## Progress

**Execution Order:** 98 -> 99 -> 100 -> 101 -> 102 -> 103

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 98. App Discovery & Navigation Map | 3/3 | Complete    | 2026-03-01 |
| 99. Authentication & Onboarding Flows | 0/TBD | Not started | - |
| 100. Core Feature Walkthrough - CRUD | 0/TBD | Not started | - |
| 101. Display & Preview Modes | 0/TBD | Not started | - |
| 102. Settings, Config & Edge Cases | 0/TBD | Not started | - |
| 103. Audit Report Compilation | 0/TBD | Not started | - |

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
| v10.0 Visual QA Audit | 98-103 | TBD | In progress | - |

**Total:** 94 phases complete, 285 plans executed | 15 milestones shipped | 1 milestone in progress

---
*Last updated: 2026-02-28 -- Phase 98 planned (3 plans, 3 waves)*
