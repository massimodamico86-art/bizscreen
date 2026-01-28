# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.1 Tech Debt Cleanup

## Current Position

Phase: 28 of 28 (Code Quality) - COMPLETE
Plan: 2 of 2 in current phase - COMPLETE
Status: Phase complete, milestone complete
Last activity: 2026-01-28 - Completed 28-02-PLAN.md

Progress: [██████████] 100% (10/10 plans)

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | Shipped | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | Shipped | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-28 | Complete | 2026-01-28 |

## Performance Metrics

**Cumulative (v1 + v2 + v2.1):**
- Total plans executed: 125 (75 + 40 + 10)
- Total phases: 28

**v2.1:**
- Plans: 10 total across 5 phases
- Completed: 10

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key v2 decisions carried forward:

- TZDate for schedule calculations (DST-safe)
- Separate scenes for language variants (not embedded JSONB)
- 3-level language fallback via RPC
- Emergency bypasses language resolution

v2.1 decisions:

- Detection-only hooks: notify via callbacks, let consumer handle actions (24-01)
- Player pages in player/pages/ with barrel exports (24-02)
- Player.jsx is routing-only, no business logic (24-02)
- Global vi.mock in setup.js for circular dependency breaking (25-01)
- Mock permissionsService to bypass DB calls in unit tests (25-01)
- Fixtures in src/__fixtures__/ for colocation pattern (25-02)
- Factory functions return fresh objects to prevent test pollution (25-02)
- TEST-PATTERNS.md at project root for discoverability (25-02)
- VOLATILE for select_weighted_campaign_content due to random() (26-01)
- Campaign priority: Emergency > Campaign > Device Scene (26-01)
- Player chunk size (68.88 KB gzip) justified by offline/realtime/analytics (27-01)
- vendor-motion preload (37 KB) deferred as optimization target (27-01)
- sideEffects: ['*.css', '*.scss'] enables tree shaking (27-02)
- Bundle warning threshold: chunks >200KB gzip need investigation (27-02)
- ESLint ignores vendored code (yodeck-capture, _api-disabled, public) (28-01)
- Pre-commit hook uses Husky + lint-staged for enforcement (28-01)
- useEmergencyOptional hook pattern for conditional context usage (28-01)
- PropTypes rules at warn level for gradual adoption (28-02)
- JSDoc only required for exported function declarations (28-02)
- react/jsx-uses-vars rule fixes unused-imports JSX detection (28-02)

### Pending Todos

None.

### Blockers/Concerns

All v2.1 tech debt items resolved:

- ~~Player.jsx at 1,265 lines (265 over target)~~ RESOLVED: Now 23 lines
- ~~Template usage analytics not recorded for starter packs~~ VERIFIED: Already working via installTemplateAsScene chain
- ~~Campaign rotation weights not enforced in player~~ RESOLVED: Migration 138 with weighted selection
- ~~18-19 pre-existing failing test files in services~~ RESOLVED: 0 failing (73 files, 2071 tests pass)
- ~~ESLint has 1,070 warnings~~ ADDRESSED: Pre-commit hooks enforce clean commits, gradual cleanup via warn rules

**Note:** Migration 105 has pre-existing issue (references non-existent `tenants` table). Should be addressed separately.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 28-02-PLAN.md (Type Annotations and Documentation)
Resume file: None
Next: v2.1 milestone complete - ready for new milestone or feature work

---
*Updated: 2026-01-28 - Phase 28 Code Quality complete. v2.1 Tech Debt Cleanup milestone complete.*
