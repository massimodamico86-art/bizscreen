# Roadmap: BizScreen v2

## Overview

BizScreen v2 delivers three major feature sets (Templates Marketplace, Multi-Language Content, Advanced Scheduling) plus platform polish (Mobile, Dashboard, Onboarding). The roadmap prioritizes technical debt resolution first (Player.jsx splitting), then builds features in order of architectural risk: Scheduling extends existing infrastructure, Templates enhances existing marketplace schema, Multi-Language introduces new translation patterns. Platform polish phases can execute after core features stabilize.

## Milestones

- v1.0 Production Release - Phases 1-12 (shipped 2026-01-24) - Archived to `.planning/milestones/`
- v2.0 Templates & Platform Polish - Phases 13-23 (in progress)

## Phases

- [x] **Phase 13: Technical Foundation** - Player.jsx splitting and structured logging completion
- [x] **Phase 14: Scheduling Core** - Date ranges, priorities, conflict detection, and week preview
- [x] **Phase 15: Scheduling Campaigns** - Campaign grouping, emergency override, and dayparting
- [x] **Phase 16: Scheduling Polish** - Analytics, rotation rules, frequency limits, and templates
- [x] **Phase 17: Templates Core** - Category browsing, search, preview, and one-click apply
- [x] **Phase 18: Templates Discovery** - Recent, favorites, starter packs, and customization wizard
- [x] **Phase 19: Templates Intelligence** - Suggestions, ratings, and usage analytics
- [ ] **Phase 20: Multi-Language Core** - Language variants, device assignment, and fallback
- [ ] **Phase 21: Multi-Language Advanced** - Group assignment, auto-assignment, workflow, and AI suggestions
- [ ] **Phase 22: Platform Polish - Mobile & Dashboard** - Responsive admin and dashboard redesign
- [ ] **Phase 23: Platform Polish - Onboarding** - Welcome tour, starter packs, and industry suggestions

## Phase Details

### Phase 13: Technical Foundation
**Goal**: Player.jsx reduced to maintainable size, remaining services use structured logging, flaky test fixed
**Depends on**: v1 completion (Phase 12)
**Requirements**: TECH-01, TECH-02, TECH-03
**Success Criteria** (what must be TRUE):
  1. Player.jsx is under 1000 lines with widget/hook/renderer extraction complete
  2. All services emit structured logs (100% coverage, up from 62%)
  3. useCampaignEditor test passes reliably on 10 consecutive runs
  4. Offline playback works identically before and after refactoring
**Plans**: 3 plans (Wave 1 - all parallel)

Plans:
- [x] 13-01-PLAN.md - Player.jsx component extraction (SceneRenderer, LayoutRenderer, ZonePlayer, AppRenderer)
- [x] 13-02-PLAN.md - Structured logging migration (37 services)
- [x] 13-03-PLAN.md - Flaky test hardening (useCampaignEditor async fixes)

### Phase 14: Scheduling Core
**Goal**: Users can schedule content with date ranges and priorities, see conflicts and weekly preview
**Depends on**: Phase 13
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04
**Success Criteria** (what must be TRUE):
  1. User can set start and end dates on schedule entries
  2. User can assign priority levels (1-5 named levels) to schedule entries
  3. System blocks saving when schedule entries overlap on same device
  4. User can view 7-day visual preview of scheduled content with drag-drop
  5. DST transitions handled correctly (no double-plays or skips)
**Plans**: 5 plans (Wave 1: 14-01, Wave 2: 14-02, 14-03 parallel, Wave 3: 14-04, 14-05 gap closure parallel)

Plans:
- [x] 14-01-PLAN.md - Date range and priority components (DateDurationPicker, PriorityBadge)
- [x] 14-02-PLAN.md - Enhanced conflict detection (blocking saves, device info)
- [x] 14-03-PLAN.md - Interactive week preview (drag-drop, resize, thumbnails)
- [x] 14-04-PLAN.md - [Gap Closure] Wire DateDurationPicker in event modal
- [x] 14-05-PLAN.md - [Gap Closure] Integrate @date-fns/tz for DST handling

### Phase 15: Scheduling Campaigns
**Goal**: Users can group schedule entries into campaigns and push emergency content
**Depends on**: Phase 14
**Requirements**: SCHED-05, SCHED-06, SCHED-07
**Success Criteria** (what must be TRUE):
  1. User can create a campaign and add multiple schedule entries to it
  2. User can push emergency content that immediately overrides all schedules
  3. User can apply dayparting presets (breakfast/lunch/dinner) to schedule entries
  4. Campaign changes apply at content boundaries (no mid-playback jumps)
**Plans**: 4 plans (Wave 1: 15-01, 15-02, 15-03 parallel, Wave 2: 15-04)

Plans:
- [x] 15-01-PLAN.md - Campaign-entry linking (FK, service, CampaignPicker)
- [x] 15-02-PLAN.md - Emergency override system (service, context, banner)
- [x] 15-03-PLAN.md - Dayparting presets (table, service, DaypartPicker)
- [x] 15-04-PLAN.md - Emergency push triggers and player resolution

### Phase 16: Scheduling Polish
**Goal**: Users have advanced scheduling controls including analytics, rotation, limits, and reusable templates
**Depends on**: Phase 15
**Requirements**: SCHED-08, SCHED-09, SCHED-10, SCHED-11, SCHED-12
**Success Criteria** (what must be TRUE):
  1. User can view performance metrics grouped by campaign
  2. User can configure percentage-based content rotation within a time slot
  3. User can set maximum play frequency (e.g., max 5 plays per hour)
  4. User can save campaign configuration as template and reuse it
  5. User can create seasonal campaigns that auto-activate by date
**Plans**: 3 plans (Wave 1 - all parallel)

Plans:
- [x] 16-01-PLAN.md - Campaign analytics (RPC, service, CampaignAnalyticsCard)
- [x] 16-02-PLAN.md - Content rotation and frequency limits (schema, RotationControls, FrequencyLimitControls)
- [x] 16-03-PLAN.md - Campaign templates and seasonal scheduling (templates table, TemplatePickerModal, SeasonalDatePicker)

### Phase 17: Templates Core
**Goal**: Users can browse, search, preview, and apply templates from the marketplace
**Depends on**: Phase 13
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06
**Success Criteria** (what must be TRUE):
  1. User can browse templates organized by category (restaurant, retail, salon, etc.)
  2. User can search templates by name and description
  3. User can preview template in full-size side panel before applying
  4. User can apply template with one click and immediately use the created scene
  5. User can see featured templates prominently on marketplace homepage
  6. User can filter templates by orientation (landscape/portrait)
**Plans**: 3 plans (Wave 1: 17-01, Wave 2: 17-02, Wave 3: 17-03)

Plans:
- [x] 17-01-PLAN.md - Marketplace components (TemplateSidebar, FeaturedTemplatesRow, TemplateGrid with hover)
- [x] 17-02-PLAN.md - Page restructure with sidebar, search, and filter integration
- [x] 17-03-PLAN.md - Preview panel and one-click apply flow

### Phase 18: Templates Discovery
**Goal**: Users can easily find and organize templates with recents, favorites, starter packs, and customization
**Depends on**: Phase 17
**Requirements**: TMPL-07, TMPL-08, TMPL-09, TMPL-10
**Success Criteria** (what must be TRUE):
  1. User can access their recently used templates in a dedicated section
  2. User can favorite/bookmark templates and access them from favorites list
  3. User can apply starter packs (pre-configured scene+layout+schedule bundles)
  4. User can customize template with guided wizard (logo, colors, text replacement)
**Plans**: 4 plans (Wave 1: 18-01, 18-03 parallel; Wave 2: 18-02, 18-04 parallel)

Plans:
- [x] 18-01-PLAN.md - Favorites/history database and service layer with heart icon on TemplateCard
- [x] 18-02-PLAN.md - Sidebar sections for Recent and Favorite templates
- [x] 18-03-PLAN.md - Starter packs with inline expansion and multi-select apply
- [x] 18-04-PLAN.md - Template customization wizard with side-by-side form and preview

### Phase 19: Templates Intelligence
**Goal**: Users get template suggestions, can rate templates, and view usage analytics
**Depends on**: Phase 18
**Requirements**: TMPL-11, TMPL-12, TMPL-13
**Success Criteria** (what must be TRUE):
  1. System suggests templates based on user's industry and usage patterns
  2. User can rate templates with stars (no written reviews)
  3. User can view which templates perform best based on personal usage analytics
**Plans**: 4 plans (Wave 1: 19-01, Wave 2: 19-02, 19-03 parallel, Wave 3: 19-04 gap closure)

Plans:
- [x] 19-01-PLAN.md - Ratings and suggestions database layer (migration, RPCs, service functions)
- [x] 19-02-PLAN.md - Sidebar suggestions section and usage badges on TemplateCard
- [x] 19-03-PLAN.md - Star ratings UI in preview panel and similar templates post-apply
- [x] 19-04-PLAN.md - [Gap Closure] Wire usage counts in TemplateMarketplacePage

### Phase 20: Multi-Language Core
**Goal**: Users can create language variants of content and assign languages to devices
**Depends on**: Phase 13
**Requirements**: LANG-01, LANG-02, LANG-03, LANG-04, LANG-05
**Success Criteria** (what must be TRUE):
  1. User can create language variants of the same scene
  2. User can assign a display language to each device
  3. System falls back to default language when translation is missing (no blank screens)
  4. User can switch between language versions when editing in CMS
  5. Content cards display language indicator badges showing available translations
**Plans**: 3 plans (Wave 1: 20-01, Wave 2: 20-02, 20-03 parallel)

Plans:
- [ ] 20-01-PLAN.md - Language schema, RPC, and service (scene_language_groups, display_language, languageService)
- [ ] 20-02-PLAN.md - Device language assignment and language badges (settings dropdown, LanguageBadges component)
- [ ] 20-03-PLAN.md - CMS language editing (EditorLanguageSwitcher, AddLanguageModal, variant creation)

### Phase 21: Multi-Language Advanced
**Goal**: Users have advanced multi-language features including group assignment, workflow tracking, and AI suggestions
**Depends on**: Phase 20
**Requirements**: LANG-06, LANG-07, LANG-08, LANG-09, LANG-10, TECH-04
**Success Criteria** (what must be TRUE):
  1. User can view all content needing translation in bulk dashboard
  2. User can assign language to screen group (devices inherit)
  3. System auto-assigns language based on device location settings
  4. User can track translation status (draft/review/approved) for each language
  5. System suggests AI translations as starting point for new languages
  6. New multi-language features have comprehensive test coverage
**Plans**: TBD

Plans:
- [ ] 21-01: Translation dashboard
- [ ] 21-02: Group language assignment
- [ ] 21-03: Translation workflow and AI suggestions

### Phase 22: Platform Polish - Mobile & Dashboard
**Goal**: Admin UI works well on mobile devices and dashboard provides actionable overview
**Depends on**: Phase 16, Phase 19, Phase 21
**Requirements**: MOBIL-01, MOBIL-02, MOBIL-03, MOBIL-04, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Admin UI displays correctly on mobile devices with responsive layout
  2. Data tables adapt to mobile (horizontal scroll or card view)
  3. Navigation is touch-friendly with appropriate tap targets
  4. Critical actions accessible without horizontal scrolling
  5. Dashboard shows overview of active content across all screens
  6. Dashboard provides quick actions (add screen, create content, view analytics)
  7. Dashboard displays health indicators (offline screens, errors, warnings)
  8. Dashboard shows recent activity and notifications
**Plans**: TBD

Plans:
- [ ] 22-01: Mobile responsive layout
- [ ] 22-02: Mobile tables and navigation
- [ ] 22-03: Dashboard redesign

### Phase 23: Platform Polish - Onboarding
**Goal**: New users have smooth onboarding with welcome tour, starter packs, and industry-specific suggestions
**Depends on**: Phase 22
**Requirements**: ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-04
**Success Criteria** (what must be TRUE):
  1. New users see welcome tour explaining key features
  2. New users can select starter pack during signup
  3. System suggests templates based on selected industry
  4. Onboarding can be skipped and accessed later from settings
**Plans**: TBD

Plans:
- [ ] 23-01: Welcome tour
- [ ] 23-02: Starter pack selection and industry suggestions

## Progress

**Execution Order:**
Phases execute in numeric order: 13 > 14 > 15 > 16 > 17 > 18 > 19 > 20 > 21 > 22 > 23

Note: Phases 14-16 (Scheduling), 17-19 (Templates), and 20-21 (Multi-Language) can run in parallel after Phase 13 completes, but are numbered sequentially for tracking.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Technical Foundation | 3/3 | Complete | 2026-01-24 |
| 14. Scheduling Core | 5/5 | Complete | 2026-01-25 |
| 15. Scheduling Campaigns | 4/4 | Complete | 2026-01-25 |
| 16. Scheduling Polish | 3/3 | Complete | 2026-01-25 |
| 17. Templates Core | 3/3 | Complete | 2026-01-25 |
| 18. Templates Discovery | 4/4 | Complete | 2026-01-26 |
| 19. Templates Intelligence | 4/4 | Complete | 2026-01-26 |
| 20. Multi-Language Core | 0/3 | Not started | - |
| 21. Multi-Language Advanced | 0/3 | Not started | - |
| 22. Platform Polish - Mobile & Dashboard | 0/3 | Not started | - |
| 23. Platform Polish - Onboarding | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-24*
*v2 phases: 11 (Phases 13-23)*
*v2 requirements: 49 mapped*
*Phase 13 planned: 2026-01-24*
*Phase 14 planned: 2026-01-24*
*Phase 14 gap closure: 2026-01-25*
*Phase 15 planned: 2026-01-25*
*Phase 15 complete: 2026-01-25*
*Phase 16 planned: 2026-01-25*
*Phase 16 complete: 2026-01-25*
*Phase 17 planned: 2026-01-25*
*Phase 17 complete: 2026-01-25*
*Phase 18 planned: 2026-01-26*
*Phase 18 complete: 2026-01-26*
*Phase 19 planned: 2026-01-26*
*Phase 19 gap closure: 2026-01-26*
*Phase 19 complete: 2026-01-26*
*Phase 20 planned: 2026-01-26*
