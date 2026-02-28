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
- [ ] **v9.0 Production Polish** — Phases 94-97 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1 through v8.0)</summary>

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

All milestones shipped successfully (14 total).

</details>

## Phases

### v9.0 Production Polish (In Progress)

**Milestone Goal:** Fix all bugs found in MCP visual audit, add error resilience (boundaries, backoff), replace spinners with skeleton loaders, and capture MCP screenshots of every working page as proof.

- [ ] **Phase 94: Bug Fixes** - Fix dashboard retry loop, stale breadcrumbs, and error toast flooding
- [ ] **Phase 95: Error Resilience** - Add per-route error boundaries, API retry with backoff, and connection error states
- [ ] **Phase 96: UX Polish** - Replace loading spinners with content-aware skeleton screens and redesign error states
- [ ] **Phase 97: Screenshot Verification** - Capture MCP screenshots of every page to prove everything works against real Supabase

## Phase Details

### Phase 94: Bug Fixes
**Goal**: Users no longer experience cascading failures from retry loops, misleading navigation context, or error toast floods
**Depends on**: Nothing (first phase in v9.0)
**Requirements**: BUG-01, BUG-02, BUG-03
**Success Criteria** (what must be TRUE):
  1. DashboardPage stops retrying after a configurable max count and shows a clear error state instead of silently hammering the API
  2. Breadcrumbs on every page reflect the actual current route (e.g., Screens > Group Detail, not always "Home > Dashboard")
  3. When a retry loop fires multiple errors, the user sees at most one error toast per distinct error type, not a stack of duplicates
**Plans**: 2 plans
- [ ] 94-01-PLAN.md -- Dashboard retry backoff + toast deduplication (BUG-01, BUG-03)
- [ ] 94-02-PLAN.md -- Comprehensive breadcrumb routing (BUG-02)

### Phase 95: Error Resilience
**Goal**: The app degrades gracefully when Supabase is slow, down, or returning errors -- no page shows an unhandled crash or infinite spinner
**Depends on**: Phase 94 (bug fixes establish backoff patterns that resilience builds on)
**Requirements**: RESIL-01, RESIL-02, RESIL-03
**Success Criteria** (what must be TRUE):
  1. Navigating to any app route that throws a runtime error shows a route-specific error UI with retry option, not a white screen or fallback to Dashboard
  2. All Supabase data-fetching calls automatically retry with exponential backoff and stop after a configurable max, without manual wiring per call site
  3. When Supabase is completely unreachable, every page that loads data shows a "Connection error" state with a retry button instead of spinning forever
**Plans**: TBD

### Phase 96: UX Polish
**Goal**: Users perceive fast, predictable page loads with content-shaped placeholders and get actionable guidance when things go wrong
**Depends on**: Phase 95 (skeleton loaders replace the spinners that resilience made finite; error states build on error boundaries)
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Every page that previously showed a generic spinning loader now shows a skeleton layout that matches the shape of the content about to appear (card grids, data tables, forms, etc.)
  2. Each major page type (dashboard, list pages, detail pages, editor pages, settings pages) has a distinct skeleton that matches its specific content structure
  3. Error states across the app include a retry button, a human-readable message explaining what went wrong, and a suggestion for recovery (e.g., "Check your connection and try again")
**Plans**: TBD

### Phase 97: Screenshot Verification
**Goal**: Every page in the application has an MCP screenshot proving it renders correctly against real Supabase data
**Depends on**: Phase 96 (all bug fixes, resilience, and polish must be complete before capturing proof)
**Requirements**: VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04, VERIFY-05, VERIFY-06, VERIFY-07, VERIFY-08, VERIFY-09, VERIFY-10, VERIFY-11, VERIFY-12, VERIFY-13, VERIFY-14
**Success Criteria** (what must be TRUE):
  1. MCP screenshots exist for all public-facing pages (marketing homepage, features, pricing) showing correct rendering without errors
  2. MCP screenshots exist for all authenticated pages (dashboard, media, playlists, templates, schedules, campaigns, screens, menu boards, apps, settings, admin, help) showing real data
  3. MCP screenshots exist for all auth flow pages (login, signup, reset password, update password, accept invite) showing correct form rendering
  4. Every screenshot shows the page in its final polished state (skeleton loaders resolved to content, error boundaries not triggered, no console errors visible)
**Plans**: TBD

## Progress

**Execution Order:** 94 -> 95 -> 96 -> 97

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 94. Bug Fixes | 0/2 | Planned | - |
| 95. Error Resilience | 0/TBD | Not started | - |
| 96. UX Polish | 0/TBD | Not started | - |
| 97. Screenshot Verification | 0/TBD | Not started | - |

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
| v9.0 Production Polish | 94-97 | TBD | In progress | - |

**Total:** 93 phases complete, 283 plans executed | 14 milestones shipped | 1 milestone in progress

---
*Last updated: 2026-02-27 -- v9.0 Production Polish roadmap created*
