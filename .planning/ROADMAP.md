# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** — Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** — Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** — Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** — Phases 30-35 (shipped 2026-02-05)
- [x] **v2.3 Production Hardening** — Phases 36-41 (shipped 2026-02-09)
- [x] **v2.4 Tech Debt Zero** — Phases 42-45 (shipped 2026-02-10)
- [x] **v3.0 Creative Experience** — Phases 46-50 (shipped 2026-02-11)
- [ ] **v3.1 Data-Driven Screens** — Phases 51-55 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3, v2.4, v3.0)</summary>

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

All milestones shipped successfully.

</details>

## v3.1 Data-Driven Screens

**Milestone Goal:** Enable screens to display live, dynamic content from external data sources, social feeds, and utility widgets -- with offline resilience and server-side security.

### Phases

- [x] **Phase 51: Data Source Widget Pipeline** — Foundation for rendering Google Sheets and CSV data on screens (completed 2026-02-12)
- [ ] **Phase 52: RSS & External Data Proxy** — Server-side feed fetching with player rendering
- [ ] **Phase 53: Social Feed & Content Moderation** — Wire existing social components into layout zones with moderation
- [ ] **Phase 54: Countdown Widget & Utilities** — Timezone-aware countdown timer and locale-based formatting
- [ ] **Phase 55: Player Data Orchestrator & Polish** — Unified refresh management, pagination, transitions, and status indicators

### Phase Details

#### Phase 51: Data Source Widget Pipeline
**Goal**: Users can connect Google Sheets or CSV data and see it rendered as a styled table on their screens, with configurable refresh and offline resilience
**Depends on**: Nothing (first phase of v3.1)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-09, INFRA-01, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User can add a Google Sheets URL as a data source and see its contents displayed as a formatted table on screen with headers, alternating row colors, and theming
  2. User can upload a CSV file and see its contents displayed identically to Google Sheets data on screen
  3. User can set a refresh interval (5, 15, 30, or 60 minutes) on any data widget and the screen updates automatically at that cadence
  4. User can bind a data source field to a text element in the scene editor and the screen renders the live value
  5. Screen continues showing last-known data when the network drops, and resumes updating when connectivity returns
**Plans:** 3 plans

Plans:
- [x] 51-01-PLAN.md — Player DataTableWidget + IndexedDB cache extension
- [x] 51-02-PLAN.md — Admin data preview table + column picker
- [x] 51-03-PLAN.md — Scene editor data table integration

#### Phase 52: RSS & External Data Proxy
**Goal**: Users can add RSS feed URLs and see feed content rendered on screens as scrolling tickers or article cards, with all fetching handled server-side
**Depends on**: Phase 51 (uses widget rendering pipeline and IndexedDB cache)
**Requirements**: RSS-01, RSS-02, RSS-03, RSS-04, INFRA-02
**Success Criteria** (what must be TRUE):
  1. User can add an RSS feed URL as a content source and see feed items appear on their screens
  2. User can display an RSS feed as a scrolling news ticker across the bottom of a screen
  3. User can display an RSS feed in a card/article layout showing images and text excerpts
  4. RSS content displayed on screens contains no executable scripts or dangerous HTML (sanitized server-side)
**Plans**: TBD

Plans:
- [ ] 52-01: TBD
- [ ] 52-02: TBD

#### Phase 53: Social Feed & Content Moderation
**Goal**: Users can assign social media feeds to screen layout zones with content moderation and hashtag filtering before posts go live
**Depends on**: Phase 52 (server-side proxy pattern established)
**Requirements**: SOCIAL-01, SOCIAL-02, SOCIAL-03
**Success Criteria** (what must be TRUE):
  1. User can assign a social feed widget to any layout zone and see social posts rendered on the screen
  2. User can review and approve/reject individual social feed posts before they appear on screens
  3. User can filter a social feed by hashtag so only matching posts display on screen
**Plans**: TBD

Plans:
- [ ] 53-01: TBD

#### Phase 54: Countdown Widget & Utilities
**Goal**: Users can add countdown timers to scenes that count down to a specific date/time with timezone awareness, recurring daily modes, and locale-based formatting
**Depends on**: Phase 51 (widget rendering pipeline and registration pattern)
**Requirements**: WIDGET-01, WIDGET-02, WIDGET-03, WIDGET-04
**Success Criteria** (what must be TRUE):
  1. User can add a countdown timer to a scene targeting a future date/time and see it count down live on screen
  2. Countdown displays correctly when the screen is in a different timezone than the user who configured it
  3. User can set a recurring daily countdown (e.g., "Happy Hour starts in...") that resets every day
  4. User can configure the date/time display format per locale and see the formatted output on screen
**Plans**: TBD

Plans:
- [ ] 54-01: TBD

#### Phase 55: Player Data Orchestrator & Polish
**Goal**: All dynamic widgets on a screen are managed by a unified refresh orchestrator with smooth transitions, auto-pagination for large datasets, image rendering from URL fields, and a visible sync status indicator
**Depends on**: Phases 51-54 (all widget types functional)
**Requirements**: DATA-06, DATA-07, DATA-08, WIDGET-05, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Data table with more rows than fit on screen auto-paginates through pages with smooth transitions
  2. Image URL fields in data sources render as actual images (not raw URLs) on screen
  3. Data refreshes on screen with smooth fade/slide transition animations (no jarring content swaps)
  4. User can see a "last updated" sync status indicator on any dynamic widget showing when data was last refreshed
  5. Player manages per-widget refresh timers without polling multiplication (single orchestrator coordinates all widgets on a screen)
**Plans**: TBD

Plans:
- [ ] 55-01: TBD
- [ ] 55-02: TBD

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
| v3.1 Data-Driven Screens | 51-55 | 3+ | In progress | - |

**Total:** 51 phases complete, 187 plans executed | 7 milestones shipped | 1 milestone in progress

### v3.1 Phase Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 51. Data Source Widget Pipeline | 3/3 | ✓ Complete | 2026-02-12 |
| 52. RSS & External Data Proxy | 0/TBD | Not started | - |
| 53. Social Feed & Content Moderation | 0/TBD | Not started | - |
| 54. Countdown Widget & Utilities | 0/TBD | Not started | - |
| 55. Player Data Orchestrator & Polish | 0/TBD | Not started | - |

---
*Last updated: 2026-02-12 — Phase 51 complete.*
