# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.1 Tech Debt Cleanup

## Current Position

Phase: 28 of 28 (Code Quality)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-28 — Completed 28-01-PLAN.md

Progress: [████████░░] 80% (8/10 plans)

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | Shipped | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | Shipped | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-28 | In Progress | — |

## Performance Metrics

**Cumulative (v1 + v2):**
- Total plans executed: 115 (75 + 40)
- Total phases: 23

**v2.1:**
- Plans: 10 total across 5 phases
- Completed: 8

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
- Unused vars as warn, not error - allows gradual cleanup (28-01)
- useEmergencyOptional hook pattern for safe context access outside provider (28-01)
- Pre-commit hooks auto-fix unused imports before commit (28-01)

### Pending Todos

None.

### Blockers/Concerns

Tech debt being addressed in v2.1:

- ~~Player.jsx at 1,265 lines (265 over target)~~ RESOLVED: Now 23 lines
- ~~Template usage analytics not recorded for starter packs~~ VERIFIED: Already working via installTemplateAsScene chain
- ~~Campaign rotation weights not enforced in player~~ RESOLVED: Migration 138 with weighted selection
- ~~18-19 pre-existing failing test files in services~~ RESOLVED: 0 failing (73 files, 2071 tests pass)
- ESLint has 1,070 warnings (unused vars, console statements, undefined vars) - will address in 28-02

**Note:** Migration 105 has pre-existing issue (references non-existent `tenants` table). Should be addressed separately.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 28-01-PLAN.md (ESLint enforcement)
Resume file: None
Next: 28-02-PLAN.md for remaining code quality cleanup

---
*Updated: 2026-01-28 — ESLint enforcement with pre-commit hooks, 0 errors, 1,070 warnings for future cleanup*
