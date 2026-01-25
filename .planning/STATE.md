# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Users can easily find and use pre-built content while managing content across languages and complex schedules
**Current focus:** v2 Templates & Platform Polish - Phase 14 (Scheduling Core)

## Current Position

Phase: 14 of 23 (Scheduling Core)
Plan: 3 of 3 complete
Status: Phase complete
Last activity: 2026-01-25 - Completed 14-03-PLAN.md (Interactive Week Preview)

Progress: [█████░░░░░] 18% (6/32 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 6 (v2)
- Average duration: 5.5min
- Total execution time: 33min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 13-technical-foundation | 3 | 22min | 7min |
| 14-scheduling-core | 3 | 11min | 3.7min |

**Recent Trend:**
- Last 5 plans: 13-02 (8min), 14-01 (6min), 14-02 (2min), 14-03 (3min)
- Trend: Accelerating

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

### Pending Todos

None yet.

### Blockers/Concerns

From research - critical pitfalls to address:

- **Phase 14**: DST transitions can cause schedule gaps/double-plays
- **Phase 17**: Template cloning must use correct tenant context (RLS)
- **Phase 20**: Offline cache explosion with language variants
- **Phase 20**: Missing translation fallback can cause blank screens

Test infrastructure note:
- 18-19 pre-existing failing test files in services (unrelated to v2 work)
- loggingService circular dependency with supabase.js causes industryWizardService test failure

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed Phase 14 (Scheduling Core), ready for Phase 15
Resume file: None

---
*Updated: 2026-01-25 - Phase 14 complete (3/3 plans: DateDurationPicker, ConflictWarning, WeekPreview)*
