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
- [x] **v10.0 Visual QA Audit** — Phases 98-103 (shipped 2026-03-01)
- [ ] **v11.0 Stability Pass** — Phases 104-107 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1 through v10.0)</summary>

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

**v10.0 Visual QA Audit** — Phases 98-103 (6 phases, 302 screenshots)
See `.planning/milestones/v10.0-ROADMAP.md`

All milestones shipped successfully (16 total).

</details>

## Phases

### v11.0 Stability Pass

**Milestone Goal:** Fix all 18 bugs discovered during the v10.0 Visual QA Audit -- 6 critical page crashes, 3 major functionality failures, 5 minor bugs (error handling + dev experience), and 4 cosmetic issues. No new features. Strictly targeted fixes sourced from screenshots/AUDIT_REPORT.md.

- [x] **Phase 104: React Render Crash Fixes** - Diagnose and fix the shared "Objects are not valid as a React child" crash across 6 pages (team, activity, template-marketplace, translations, demo-tools, security) (completed 2026-03-02)
- [x] **Phase 105: Functionality & Error Handling Fixes** - Fix Settings null user_id, Status template variables, Data Sources RPC failure, and improve error handling for missing templates and invalid preview tokens (completed 2026-03-02)
- [x] **Phase 106: Dev Experience Improvements** - Fix dev-bypass-only issues: playlist creation null user, dashboard retry loop, and Unsplash proxy empty state (completed 2026-03-02)
- [ ] **Phase 107: Cosmetic Polish** - Fix templates mobile filter layout, pricing tablet spacing, SVG export dialog, and branding save button state

## Phase Details

### Phase 104: React Render Crash Fixes
**Goal**: All 6 pages that crash on load with "Objects are not valid as a React child" render successfully and display their intended content
**Depends on**: Nothing (first phase in v11.0; highest priority -- production crashes)
**Requirements**: CRASH-01, CRASH-02, CRASH-03, CRASH-04, CRASH-05, CRASH-06
**Success Criteria** (what must be TRUE):
  1. User can navigate to the Team Management page and see the team member list without hitting the React error boundary
  2. User can navigate to the Activity Log page and see log entries rendered as text without a crash
  3. User can navigate to Template Marketplace, Translation Dashboard, Demo Tools, and Security Dashboard pages and each loads its intended UI without error
  4. The root cause pattern ("Objects are not valid as a React child") is identified and fixed consistently across all 6 pages so the same class of bug does not recur
**Plans**:
  - Plan 01 (Wave 1): Fix EmptyState defensive icon rendering, TemplateSidebar missing components, ErrorBoundary Try Again button, and audit broader codebase for same pattern
  - Plan 02 (Wave 2): Create E2E crash regression tests for all 6 pages

### Phase 105: Functionality & Error Handling Fixes
**Goal**: Users encounter working pages and clear error messages instead of constraint violations, unresolved template variables, RPC failures, and raw JSON parse errors
**Depends on**: Phase 104 (crash fixes first so pages are reachable; some affected pages overlap)
**Requirements**: FUNC-01, FUNC-02, FUNC-03, ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. User can open the Settings page and see their settings loaded without a "null user_id" database error
  2. User can view the Status page and see actual environment name and version number instead of raw `{{env}}` and `{{version}}` placeholders
  3. User can open the Data Sources page and see the data sources list (or empty state) instead of a "Failed to load data sources" error banner
  4. User clicking "Use Template" on a template card with a missing or invalid template ID sees a helpful error message or redirect to the templates list instead of a broken editor state
  5. User visiting a public preview URL with an invalid token sees a clean, user-friendly error page instead of a raw "Unexpected token '<'" JSON parse error
**Plans**: TBD

### Phase 106: Dev Experience Improvements
**Goal**: Developers using the dev auth bypass (VITE_DEV_BYPASS_AUTH=true) can create content, view the dashboard, and browse stock photos without errors caused by the mock user session
**Depends on**: Phase 105 (FUNC-01 Settings fix may share mock-user context with DEV bugs)
**Requirements**: DEV-01, DEV-02, DEV-03
**Success Criteria** (what must be TRUE):
  1. Developer using dev bypass can create a playlist without "Cannot read properties of null (reading 'id')" error -- the mock user session provides a valid user context for Supabase writes
  2. Developer using dev bypass sees the dashboard load cleanly on first attempt without a "Couldn't load dashboard" retry loop caused by missing Supabase profile
  3. SVG Editor Photos panel shows an informative empty state ("Unsplash proxy not available" or similar) instead of a silent blank panel when the Edge Function is not running locally
**Plans**: TBD

### Phase 107: Cosmetic Polish
**Goal**: Visual presentation issues at specific viewport sizes are resolved, and two editor/settings UX papercuts are smoothed out
**Depends on**: Phase 106 (cosmetic polish last; all functional bugs resolved first)
**Requirements**: COSM-01, COSM-02, COSM-03, COSM-04
**Success Criteria** (what must be TRUE):
  1. User viewing the Templates page on a 375px mobile viewport sees the filter panel collapsed or converted to a mobile-friendly layout (drawer, bottom sheet, or hidden behind a filter button) instead of occupying ~50% of screen width
  2. User viewing the Pricing page on a 768px tablet viewport sees plan cards with comfortable spacing and readable text instead of aggressively wrapped content
  3. User clicking the SVG Editor export button sees a preview/options dialog (format selection, size, quality) before any download begins instead of an immediate PNG download
  4. User on the Branding page sees the Save button state accurately reflect whether unsaved changes exist -- disabled when no changes, enabled when changes are pending
**Plans**:
  - Plan 01 (Wave 1): Fix responsive layout on Templates page (mobile filter collapse) and Pricing page (tablet card spacing)
  - Plan 02 (Wave 1): Add SVG Editor export options dialog and improve Branding page save button unsaved changes UX

## Progress

**Execution Order:** 104 -> 105 -> 106 -> 107

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 104. React Render Crash Fixes | 2/2 | Complete    | 2026-03-02 |
| 105. Functionality & Error Handling Fixes | 2/2 | Complete    | 2026-03-02 |
| 106. Dev Experience Improvements | 2/2 | Complete    | 2026-03-02 |
| 107. Cosmetic Polish | 0/? | Not started | - |

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
| v11.0 Stability Pass | 104-107 | TBD | In Progress | - |

**Total:** 100 phases complete, 291 plans executed | 16 milestones shipped

---
*Last updated: 2026-03-02 -- v11.0 Stability Pass roadmap created (4 phases, 18 requirements)*
