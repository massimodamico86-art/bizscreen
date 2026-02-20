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
- [ ] **v5.0 UI Completeness** — Phases 69-71 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3, v2.4, v3.0, v3.1, v3.2, v4.0)</summary>

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

All milestones shipped successfully.

</details>

## Phases

- [x] **Phase 69: Layout Editor Widget Parity** - All 12 widget types configurable from layout editor zone properties (completed 2026-02-20)
- [x] **Phase 70: Screen & Scene Controls** - Menu board scene controls, screen orientation, and device language assignment (completed 2026-02-20)
- [ ] **Phase 71: Cleanup & Notification Gaps** - Recovery alert notification settings and dead code removal

## Phase Details

### Phase 69: Layout Editor Widget Parity
**Goal**: Users can configure every widget type directly from the layout editor, eliminating the gap where 7 widget types had no property controls in LayoutPropertiesPanel
**Depends on**: Nothing (first phase of v5.0)
**Requirements**: LEDT-01, LEDT-02, LEDT-03, LEDT-04, LEDT-05, LEDT-06, LEDT-07
**Success Criteria** (what must be TRUE):
  1. User can select a data-table widget in a layout zone and configure its data source, columns, theme, and refresh interval
  2. User can select an RSS widget (ticker or card) in a layout zone and configure its feed URL, display style, and refresh interval
  3. User can select a social-feed widget in a layout zone and configure its feed source and hashtag filter
  4. User can select countdown, menu-board, or clock-date widgets in layout zones and configure their type-specific properties
  5. Changing widget type in a layout zone resets properties to the new type's defaults (existing registry behavior preserved)
**Plans**: 2 plans
Plans:
- [ ] 69-01-PLAN.md — Integrate existing scene-editor controls for data-table, RSS, social-feed, countdown
- [ ] 69-02-PLAN.md — Create menu-board controls, add clock-date size control

### Phase 70: Screen & Scene Controls
**Goal**: Users can manage menu board appearance in scene editor, set screen orientation, and assign device language -- all from the UI without manual database edits
**Depends on**: Phase 69
**Requirements**: SEDT-01, SCRN-01, SCRN-02
**Success Criteria** (what must be TRUE):
  1. User can select a menu board widget element in the scene editor and configure which menu board to display and its visual appearance
  2. User can set a screen to portrait or landscape orientation from the screen edit UI and see the change reflected on the device
  3. User can assign a language to a screen from the screen edit UI, controlling which language variant of content the device receives
**Gap Closure:** Also fixes YodeckLayoutEditorPage.jsx missing imports (integration gap from v5.0 audit)
**Plans**: 1 plan
Plans:
- [ ] 70-01-PLAN.md — Scene editor menu-board controls, YodeckLayoutEditorPage import fix, screen settings verification

### Phase 71: Cleanup & Notification Gaps
**Goal**: Close the last two notification settings gaps and remove dead code that clutters the codebase
**Depends on**: Nothing (independent of Phases 69-70)
**Requirements**: NOTF-01, NOTF-02, CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, CLEAN-06
**Success Criteria** (what must be TRUE):
  1. User can enable/disable device_recovery alerts from the notification settings page
  2. User can enable/disable device_recovery_exhausted alerts from the notification settings page
  3. The 6 unused service/hook files (gdprDeletionService, geolocationService, demoContentService, dataFeedScheduler, scimService, usePrefetch) no longer exist in the codebase
  4. No import references to the deleted files remain anywhere in the codebase
**Plans**: TBD

## Progress

**Execution Order:** 69 -> 70 -> 71 (71 can run in parallel with 69-70 if desired)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 69. Layout Editor Widget Parity | 2/2 | Complete    | 2026-02-20 | - |
| 70. Screen & Scene Controls | 1/1 | Complete   | 2026-02-20 | - |
| 71. Cleanup & Notification Gaps | v5.0 | 0/TBD | Not started | - |

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
| v5.0 UI Completeness | 69-71 | TBD | In progress | - |

**Total:** 68 phases complete, 222 plans executed | 10 milestones shipped | v5.0 in progress

---
*Last updated: 2026-02-20 -- v5.0 UI Completeness roadmap created*
