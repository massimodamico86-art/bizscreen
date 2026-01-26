# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Users can easily find and use pre-built content while managing content across languages and complex schedules
**Current focus:** v2 Templates & Platform Polish - Phase 15 (Scheduling Campaigns)

## Current Position

Phase: 15 of 23 (Scheduling Campaigns)
Plan: 3 of 4 complete (15-01, 15-02, 15-03 complete; 15-04 pending)
Status: In progress
Last activity: 2026-01-26 - Completed 15-01-PLAN.md (Campaign-Entry Linking)

Progress: [███████░░░] 31% (11/36 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11 (v2)
- Average duration: 4.1min
- Total execution time: 45min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 13-technical-foundation | 3 | 22min | 7min |
| 14-scheduling-core | 5 | 15min | 3min |
| 15-scheduling-campaigns | 3 | 11min | 4min |

**Recent Trend:**
- Last 5 plans: 14-05 (2min), 15-01 (6min), 15-02 (2min), 15-03 (3min), 15-04 (pending)
- Trend: Stable at ~3-4min/plan

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

### Pending Todos

None yet.

### Blockers/Concerns

From research - critical pitfalls to address:

- **Phase 14**: ~~DST transitions can cause schedule gaps/double-plays~~ RESOLVED (14-05: TZDate integration)
- **Phase 17**: Template cloning must use correct tenant context (RLS)
- **Phase 20**: Offline cache explosion with language variants
- **Phase 20**: Missing translation fallback can cause blank screens

Test infrastructure note:
- 18-19 pre-existing failing test files in services (unrelated to v2 work)
- loggingService circular dependency with supabase.js causes industryWizardService test failure

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 15-01-PLAN.md (Campaign-Entry Linking), 15-04 pending
Resume file: None

---
*Updated: 2026-01-26 - Completed 15-01-PLAN.md (Campaign-Entry Linking)*
