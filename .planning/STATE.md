# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Users can easily find and use pre-built content while managing content across languages and complex schedules
**Current focus:** v2 Templates & Platform Polish - COMPLETE

## Current Position

Phase: 23 of 23 (Platform Polish - Onboarding)
Plan: 2 of 2 complete
Status: Phase complete - v2 COMPLETE
Last activity: 2026-01-27 - Completed 23-02-PLAN.md (Industry Selection & Starter Pack Flow)

Progress: [████████████████████] 100% (39/39 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 39 (v2)
- Average duration: 3.8min
- Total execution time: 149min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 13-technical-foundation | 3 | 22min | 7min |
| 14-scheduling-core | 5 | 15min | 3min |
| 15-scheduling-campaigns | 4 | 18min | 5min |
| 16-scheduling-polish | 3 | 16min | 5min |
| 17-templates-core | 3 | 7min | 2min |
| 18-templates-discovery | 4 | 15min | 4min |
| 19-templates-intelligence | 4 | 12min | 3min |
| 20-multi-language-core | 4 | 15min | 4min |
| 21-multi-language-advanced | 4 | 11min | 3min |
| 22-platform-polish-mobile-dashboard | 3 | 12min | 4min |
| 23-platform-polish-onboarding | 2 | 9min | 5min |

**Recent Trend:**
- Last 5 plans: 22-02 (4min), 22-03 (5min), 23-01 (4min), 23-02 (5min)
- Trend: Consistent 4-5min for UI component plans

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2 Roadmap]: Player.jsx splitting must precede all feature work (2775 lines blocking)
- [v2 Roadmap]: Build order: Scheduling (extends) > Templates (enhances) > Multi-Language (new pattern)
- [v2 Roadmap]: Install @date-fns/tz and @smastrom/react-rating early
- [13-03]: Use 3000ms timeout for async waitFor operations to accommodate CI variability
- [13-03]: Wait for actual picker data instead of loading flag for new campaigns
- [13-02]: Use PascalCase service names for logger scopes (e.g., AdminService, CampaignService)
- [13-01]: Keep ViewPage in Player.jsx as orchestration shell (1265 lines)
- [13-01]: Barrel export pattern for player/components/index.js
- [14-01]: Start date + duration approach for date selection (not calendar range picker)
- [14-01]: 5 named priority levels: Lowest/Low/Normal/High/Critical (1-5), default: Normal (3)
- [14-02]: Conflicts block saves completely - no dismiss, must resolve
- [14-02]: All devices assigned to schedule are affected by conflicts in that schedule
- [14-03]: 32px slot height (h-8), 8px drag activation constraint
- [14-03]: Optimistic updates with revert on error for drag/resize operations
- [14-05]: Use TZDate from @date-fns/tz for all schedule date calculations (DST-safe)
- [14-05]: Default to UTC timezone for internal calculations, device timezone at playback
- [15-01]: ON DELETE SET NULL for campaign_id FK (orphan entries, don't delete)
- [15-01]: Entry counts via separate query in getCampaignsWithEntryCounts
- [15-02]: Store started_at (not expires_at) for emergency duration calculation
- [15-02]: needs_refresh=true on all tenant devices for emergency push/stop
- [15-03]: Three daypart preset types: meal, period, custom
- [15-03]: DaypartPicker fills form fields (quick-fill), not persistent association
- [15-04]: Header extracted to separate component for Emergency Push integration
- [15-04]: Player returns emergency source, priority=999, and expiry info
- [16-01]: Use SECURITY DEFINER on RPC for tenant context enforcement
- [16-01]: Re-export DATE_RANGES from campaignAnalyticsService for consistent API
- [16-03]: Templates store structure only (target types, content types), not specific IDs
- [16-03]: Seasonal recurrence: yearly only with month/day/duration_days format
- [17-01]: TemplateCard exported separately for reuse in FeaturedTemplatesRow
- [17-01]: Orientation filter toggle behavior (clicking selected clears filter)
- [17-02]: Featured row hidden when any filter active
- [17-02]: Client-side orientation filter using metadata.orientation
- [17-02]: Quick Apply auto-names scenes: Template Name - MMM d, yyyy
- [17-03]: Panel replaces modal completely (480px width, bg-black/30 backdrop)
- [17-03]: Clicking another template swaps content in place (natural re-render)
- [18-03]: Packs use junction table with position for ordering
- [18-03]: RPC returns templates as JSONB array within pack row
- [18-03]: Expand/collapse via framer-motion AnimatePresence
- [18-03]: Sequential template install (not parallel) for simplicity
- [18-01]: Separate tables for marketplace (template_library) vs content_templates favorites
- [18-01]: RPC toggle returns boolean for optimistic UI
- [18-01]: recordMarketplaceUsage called non-blocking after installTemplateAsScene
- [18-01]: Heart icon always visible (not hover-only) for discoverability
- [18-02]: Sidebar sections at top before Categories
- [18-02]: Optimistic updates with revert for favorite toggle
- [18-02]: Batch check favorited status when grid templates load
- [18-04]: Wizard opens after Quick Apply (scene created first, then customized)
- [18-04]: Single-screen form (not multi-step) per CONTEXT.md
- [18-04]: Side-by-side layout: form 400px left, preview fills right
- [18-04]: hasCustomizableFields checks metadata.customizable_fields
- [18-04]: Design JSON walkers for applying color/text/logo customizations
- [19-01]: Public SELECT on ratings table for aggregate display
- [19-01]: Suggestions exclude already-used templates via history check
- [19-01]: CamelCase mapping in service functions (map snake_case DB)
- [19-02]: Sparkles icon (amber-500) differentiates suggestions from Recents/Favorites
- [19-02]: Usage badge positioned bottom-left (heart is top-right)
- [19-02]: Suggested section placed after Favorites, before Categories
- [19-03]: 300ms debounce for rating submission to prevent rapid API calls
- [19-03]: Optimistic UI update for immediate rating feedback
- [19-03]: Similar templates row appears after Quick Apply success
- [19-04]: Reuse same usageCounts Map for both FeaturedTemplatesRow and TemplateGrid
- [19-04]: Fetch counts when templates array changes (single useEffect dependency)
- [20-01]: Use separate scenes linked by group ID (not JSONB embedded)
- [20-01]: Copy original content to new variant (not blank scene)
- [20-01]: Server-side RPC for language resolution ensures consistent fallback
- [20-01]: ON DELETE SET NULL for language_group_id (orphan scenes, don't cascade delete)
- [20-02]: Display Language dropdown in EditScreenModal (not separate settings page)
- [20-02]: Native language names with English in parens (e.g., 'Espanol (Spanish)')
- [20-02]: Batch fetch languages after scenes load (MVP approach)
- [20-02]: Hide badges when scene has only English (per CONTEXT.md)
- [20-03]: Native names only in dropdown per CONTEXT.md
- [20-03]: Navigation-based variant switching reloads editor with different scene
- [20-03]: Grid tile selection for language creation modal
- [20-04]: Emergency content bypasses language resolution (same for all devices)
- [20-04]: Scene response includes languageCode for player verification
- [20-04]: Legacy schedule entries don't use language resolution (direct content refs)
- [21-01]: Standalone scenes in dashboard with empty variants when no language filter
- [21-01]: RPC status validation with RAISE EXCEPTION for invalid values
- [21-01]: Location map covers 20+ countries with English fallback
- [21-02]: Strict inheritance: devices in group use group's language unless device has explicit override
- [21-02]: Location suggests language via getLanguageForLocation, user confirms with Apply button
- [21-02]: ScreenGroupDetailPage created with Devices + Settings tabs pattern
- [21-03]: Scene-centric dashboard with language pills per row
- [21-03]: AI suggestion panel with copy functionality (not direct apply)
- [21-04]: Follow async import pattern for service tests (consistent with existing patterns)
- [21-04]: Pure function tests don't require supabase mocking
- [21-04]: Component tests mock services at module level
- [22-01]: 280px slide-out panel width (wider than desktop 211px for touch targets)
- [22-01]: Hamburger in mobile header bar, not in main Header
- [22-02]: ResponsiveTable uses overflow-x-auto with WebkitOverflowScrolling touch for iOS
- [22-02]: Essential columns (name, status) always visible; secondary hide on mobile
- [22-02]: Tertiary columns (ID, working hours) only visible on desktop
- [22-02]: Column visibility passed via props to row components for flexibility
- [22-03]: HealthBanner shows only for critical alerts (>0), dismissible per session
- [22-03]: QuickActionsBar in header on desktop, separate card on mobile
- [22-03]: ActiveContentGrid shows up to 8 screens with thumbnail grid
- [22-03]: TimelineActivity replaces RecentActivityWidget with visual timeline
- [23-01]: 6 tour steps: Welcome, Media Library, Playlists, Templates, Screens, Scheduling
- [23-01]: Modal wizard format with progress dots, not tooltip-based tour
- [23-01]: Extend existing onboarding_progress table (not separate tour table)
- [23-01]: Progress persists non-blocking via fire-and-forget RPC calls
- [23-02]: 12 industry options in grid (restaurant, retail, salon, fitness, healthcare, hotel, education, corporate, realestate, auto, coffee, other)
- [23-02]: Session-based banner dismissal via sessionStorage
- [23-02]: Skip industry still shows starter pack modal
- [23-02]: Sequential template installation during pack apply (not parallel)

### Pending Todos

None - v2 complete.

### Blockers/Concerns

From research - critical pitfalls to address:

- **Phase 14**: ~~DST transitions can cause schedule gaps/double-plays~~ RESOLVED (14-05: TZDate integration)
- **Phase 17**: Template cloning must use correct tenant context (RLS)
- **Phase 20**: Offline cache explosion with language variants
- **Phase 20**: ~~Missing translation fallback can cause blank screens~~ RESOLVED (20-01: RPC with 3-level fallback)

Test infrastructure note:
- 18-19 pre-existing failing test files in services (unrelated to v2 work)
- loggingService circular dependency with supabase.js causes industryWizardService test failure

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 23-02-PLAN.md - v2 COMPLETE
Resume file: None
Next: None - v2 complete

---
*Updated: 2026-01-27 - Phase 23 complete, v2 complete (39/39 plans)*
