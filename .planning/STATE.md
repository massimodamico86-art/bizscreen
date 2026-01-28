# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.1 Tech Debt Cleanup

## Current Position

Phase: 29 of 29 (Fix Auto-Removed Imports) - COMPLETE (partial)
Plan: 1 of 1 in current phase - EXECUTED
Status: Test file imports restored; source file imports need separate phase
Last activity: 2026-01-28 - Executed 29-01 (import restoration)

Progress: [██████████] 100% (10/10 plans)

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | Shipped | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | Shipped | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | Complete (with blocker) | 2026-01-28 |

## Performance Metrics

**Cumulative (v1 + v2 + v2.1):**
- Total plans executed: 125 (75 + 40 + 10)
- Total phases: 29

**v2.1:**
- Plans: 10 total across 6 phases
- Completed: 10
- Remaining: 0

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
- DashboardComponents test imports from DashboardSections.jsx not DashboardPage.jsx (29-01)

### Pending Todos

None.

### Blockers/Concerns

v2.1 tech debt items status:

- ~~Player.jsx at 1,265 lines (265 over target)~~ RESOLVED: Now 23 lines
- ~~Template usage analytics not recorded for starter packs~~ VERIFIED: Already working via installTemplateAsScene chain
- ~~Campaign rotation weights not enforced in player~~ RESOLVED: Migration 138 with weighted selection
- ~~18-19 pre-existing failing test files in services~~ PARTIALLY RESOLVED: Test file imports restored
- ~~ESLint has 1,070 warnings~~ ADDRESSED: Pre-commit hooks enforce clean commits, gradual cleanup via warn rules

**NEW BLOCKER - Source File Imports (from Phase 29-01):**
79 test failures remain due to missing imports in SOURCE files (not test files):
- src/pages/HelpCenterPage.jsx - Missing: PageLayout, PageHeader
- src/pages/dashboard/DashboardSections.jsx - Missing: Badge, Stack, Card
- src/components/screens/ScreenGroupSettingsTab.jsx - Missing: Card, CardContent
- src/player/components/PairPage.jsx - Missing: PairingScreen
- src/player/pages/ViewPage.jsx - Missing: AppRenderer

These were also affected by ESLint auto-fix in Phase 28-01 but were not included in Phase 29-01 scope.

**Note:** Migration 105 has pre-existing issue (references non-existent `tenants` table). Should be addressed separately.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 29-01-PLAN.md (test file imports restored)
Resume file: None
Next: New phase needed to restore source file imports (see Blockers)

---
*Updated: 2026-01-28 - Phase 29-01 executed; source file import issue identified as new blocker.*
