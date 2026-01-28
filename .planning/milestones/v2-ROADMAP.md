# Milestone v2: Templates & Platform Polish

**Status:** SHIPPED 2026-01-27
**Phases:** 13-23
**Total Plans:** 39

## Overview

BizScreen v2 delivers three major feature sets (Templates Marketplace, Multi-Language Content, Advanced Scheduling) plus platform polish (Mobile, Dashboard, Onboarding). The roadmap prioritized technical debt resolution first (Player.jsx splitting), then built features in order of architectural risk: Scheduling extends existing infrastructure, Templates enhances existing marketplace schema, Multi-Language introduces new translation patterns. Platform polish phases executed after core features stabilized.

## Phases

### Phase 13: Technical Foundation

**Goal**: Player.jsx reduced to maintainable size, remaining services use structured logging, flaky test fixed
**Depends on**: v1 completion (Phase 12)
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md - Player.jsx component extraction (SceneRenderer, LayoutRenderer, ZonePlayer, AppRenderer)
- [x] 13-02-PLAN.md - Structured logging migration (37 services)
- [x] 13-03-PLAN.md - Flaky test hardening (useCampaignEditor async fixes)

**Completed:** 2026-01-24

### Phase 14: Scheduling Core

**Goal**: Users can schedule content with date ranges and priorities, see conflicts and weekly preview
**Depends on**: Phase 13
**Plans**: 5 plans

Plans:
- [x] 14-01-PLAN.md - Date range and priority components (DateDurationPicker, PriorityBadge)
- [x] 14-02-PLAN.md - Enhanced conflict detection (blocking saves, device info)
- [x] 14-03-PLAN.md - Interactive week preview (drag-drop, resize, thumbnails)
- [x] 14-04-PLAN.md - [Gap Closure] Wire DateDurationPicker in event modal
- [x] 14-05-PLAN.md - [Gap Closure] Integrate @date-fns/tz for DST handling

**Completed:** 2026-01-25

### Phase 15: Scheduling Campaigns

**Goal**: Users can group schedule entries into campaigns and push emergency content
**Depends on**: Phase 14
**Plans**: 4 plans

Plans:
- [x] 15-01-PLAN.md - Campaign-entry linking (FK, service, CampaignPicker)
- [x] 15-02-PLAN.md - Emergency override system (service, context, banner)
- [x] 15-03-PLAN.md - Dayparting presets (table, service, DaypartPicker)
- [x] 15-04-PLAN.md - Emergency push triggers and player resolution

**Completed:** 2026-01-25

### Phase 16: Scheduling Polish

**Goal**: Users have advanced scheduling controls including analytics, rotation, limits, and reusable templates
**Depends on**: Phase 15
**Plans**: 3 plans

Plans:
- [x] 16-01-PLAN.md - Campaign analytics (RPC, service, CampaignAnalyticsCard)
- [x] 16-02-PLAN.md - Content rotation and frequency limits (schema, RotationControls, FrequencyLimitControls)
- [x] 16-03-PLAN.md - Campaign templates and seasonal scheduling (templates table, TemplatePickerModal, SeasonalDatePicker)

**Completed:** 2026-01-25

### Phase 17: Templates Core

**Goal**: Users can browse, search, preview, and apply templates from the marketplace
**Depends on**: Phase 13
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md - Marketplace components (TemplateSidebar, FeaturedTemplatesRow, TemplateGrid with hover)
- [x] 17-02-PLAN.md - Page restructure with sidebar, search, and filter integration
- [x] 17-03-PLAN.md - Preview panel and one-click apply flow

**Completed:** 2026-01-25

### Phase 18: Templates Discovery

**Goal**: Users can easily find and organize templates with recents, favorites, starter packs, and customization
**Depends on**: Phase 17
**Plans**: 4 plans

Plans:
- [x] 18-01-PLAN.md - Favorites/history database and service layer with heart icon on TemplateCard
- [x] 18-02-PLAN.md - Sidebar sections for Recent and Favorite templates
- [x] 18-03-PLAN.md - Starter packs with inline expansion and multi-select apply
- [x] 18-04-PLAN.md - Template customization wizard with side-by-side form and preview

**Completed:** 2026-01-26

### Phase 19: Templates Intelligence

**Goal**: Users get template suggestions, can rate templates, and view usage analytics
**Depends on**: Phase 18
**Plans**: 4 plans

Plans:
- [x] 19-01-PLAN.md - Ratings and suggestions database layer (migration, RPCs, service functions)
- [x] 19-02-PLAN.md - Sidebar suggestions section and usage badges on TemplateCard
- [x] 19-03-PLAN.md - Star ratings UI in preview panel and similar templates post-apply
- [x] 19-04-PLAN.md - [Gap Closure] Wire usage counts in TemplateMarketplacePage

**Completed:** 2026-01-26

### Phase 20: Multi-Language Core

**Goal**: Users can create language variants of content and assign languages to devices
**Depends on**: Phase 13
**Plans**: 4 plans

Plans:
- [x] 20-01-PLAN.md - Language schema, RPC, and service (scene_language_groups, display_language, languageService)
- [x] 20-02-PLAN.md - Device language assignment and language badges (settings dropdown, LanguageBadges component)
- [x] 20-03-PLAN.md - CMS language editing (EditorLanguageSwitcher, AddLanguageModal, variant creation)
- [x] 20-04-PLAN.md - [Gap Closure] Integrate language resolution into player content RPC

**Completed:** 2026-01-26

### Phase 21: Multi-Language Advanced

**Goal**: Users have advanced multi-language features including group assignment, workflow tracking, and AI suggestions
**Depends on**: Phase 20
**Plans**: 4 plans

Plans:
- [x] 21-01-PLAN.md - Translation workflow schema and dashboard RPCs
- [x] 21-02-PLAN.md - Group language assignment with device inheritance
- [x] 21-03-PLAN.md - Translation dashboard UI and AI suggestions
- [x] 21-04-PLAN.md - [Gap Closure] Test coverage for Phase 21 features

**Completed:** 2026-01-26

### Phase 22: Platform Polish - Mobile & Dashboard

**Goal**: Admin UI works well on mobile devices and dashboard provides actionable overview
**Depends on**: Phase 16, Phase 19, Phase 21
**Plans**: 3 plans

Plans:
- [x] 22-01-PLAN.md - Mobile navigation (hamburger menu, slide-out overlay, body scroll lock)
- [x] 22-02-PLAN.md - Responsive tables (overflow wrapper, column hiding, touch scroll)
- [x] 22-03-PLAN.md - Dashboard enhancement (health banner, active content grid, timeline activity, quick actions)

**Completed:** 2026-01-27

### Phase 23: Platform Polish - Onboarding

**Goal**: New users have smooth onboarding with welcome tour, starter packs, and industry-specific suggestions
**Depends on**: Phase 22
**Plans**: 2 plans

Plans:
- [x] 23-01-PLAN.md - Welcome tour modal with 5-6 step feature walkthrough
- [x] 23-02-PLAN.md - Industry selection grid and starter pack onboarding flow

**Completed:** 2026-01-27

---

## Milestone Summary

**Key Decisions:**

- Player.jsx splitting must precede all feature work (2775 lines blocking)
- Build order: Scheduling (extends) > Templates (enhances) > Multi-Language (new pattern)
- Use TZDate from @date-fns/tz for all schedule date calculations (DST-safe)
- ON DELETE SET NULL for campaign_id FK (orphan entries, don't delete)
- Separate scenes linked by group ID for language variants (not JSONB embedded)
- 3-level language fallback: device language > default language > any available
- Emergency content bypasses language resolution (same for all devices)

**Issues Resolved:**

- DST transitions handled correctly via @date-fns/tz TZDate
- Language fallback prevents blank screens (3-level fallback RPC)
- Flaky useCampaignEditor test fixed (3000ms timeout, wait for picker data)

**Issues Deferred:**

- Player.jsx still 265 lines over target (accepted as 56% reduction)
- Template usage analytics not recorded for starter pack applies
- Campaign rotation weights exist in DB but player doesn't enforce

**Technical Debt Incurred:**

- Player.jsx at 1,265 lines (265 over 1000-line target)
- StarterPackOnboarding doesn't call recordTemplateUsage()
- get_resolved_player_content RPC doesn't enforce rotation weights

---

*For current project status, see .planning/ROADMAP.md*

---

*Archived: 2026-01-27 as part of v2 milestone completion*
