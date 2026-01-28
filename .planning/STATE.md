# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.1 Tech Debt Cleanup

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-01-27 — Milestone v2.1 started

Progress: Ready to define requirements

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | ✅ Shipped | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | ✅ Shipped | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-? | 🚧 In Progress | — |

## Performance Metrics

**Cumulative (v1 + v2):**
- Total plans executed: 114 (75 + 39)
- Total phases: 23

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key v2 decisions carried forward:

- TZDate for schedule calculations (DST-safe)
- Separate scenes for language variants (not embedded JSONB)
- 3-level language fallback via RPC
- Emergency bypasses language resolution

### Pending Todos

None.

### Blockers/Concerns

Tech debt to address in v2.1:

- Player.jsx at 1,265 lines (265 over target, accepted)
- Template usage analytics not recorded for starter packs
- Campaign rotation weights not enforced in player
- 18-19 pre-existing failing test files in services

## Session Continuity

Last session: 2026-01-27
Stopped at: Milestone v2.1 initialization
Resume file: None
Next: Define requirements, create roadmap

---
*Updated: 2026-01-27 — v2.1 milestone started*
