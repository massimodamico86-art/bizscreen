# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.1 Tech Debt Cleanup

## Current Position

Phase: 25 of 28 (Test Infrastructure)
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-01-28 — Completed 25-01-PLAN.md (circular dependency fixes)

Progress: [███░░░░░░░] 30% (3/10 plans)

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | Shipped | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | Shipped | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-28 | In Progress | — |

## Performance Metrics

**Cumulative (v1 + v2):**
- Total plans executed: 114 (75 + 39)
- Total phases: 23

**v2.1:**
- Plans: 10 total across 5 phases
- Completed: 3

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

### Pending Todos

None.

### Blockers/Concerns

Tech debt being addressed in v2.1:

- ~~Player.jsx at 1,265 lines (265 over target)~~ RESOLVED: Now 23 lines
- Template usage analytics not recorded for starter packs
- Campaign rotation weights not enforced in player
- ~~18-19 pre-existing failing test files in services~~ RESOLVED: 0 failing (73 files, 2071 tests pass)

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 25-01-PLAN.md
Resume file: None
Next: Execute 25-02-PLAN.md (DST schedule tests)

---
*Updated: 2026-01-28 — Plan 25-01 complete (0 failing tests, circular dependency fixed)*
