# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.2 Onboarding Polish

## Current Position

Phase: 31 - Unified Onboarding Controller
Plan: 03 of 4 complete
Status: In progress
Last activity: 2026-01-29 — Completed 31-03-PLAN.md (UnifiedOnboardingController orchestrator)

Progress: [====------] 38% (1/6 phases complete, 3/4 plans in Phase 31)

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | Archived | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | Archived | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | Archived | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | Active | — |

## v2.2 Phase Overview

| Phase | Goal | Status |
|-------|------|--------|
| 30 - State Foundation | Single source of truth for progress | Complete (3/3) |
| 31 - Unified Controller | State machine orchestrator | In Progress (3/4) |
| 32 - Screen Pairing | Pairing integrated into flow | Pending |
| 33 - Success UX | Explicit completion celebration | Pending |
| 34 - Cleanup | Remove dead code | Pending |
| 35 - Polotno | Editor verification | Pending |

## Performance Metrics

**Cumulative (v1 + v2 + v2.1):**
- Total plans executed: 126 (75 + 40 + 11)
- Total phases: 29 completed
- Total codebase: 310,940 LOC JavaScript/JSX

**v2.2 Current:**
- Phases: 1/6 complete
- Plans: 6 executed (3 in Phase 30, 3 in Phase 31)

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
All v2.1 decisions archived in milestones/v2.1-ROADMAP.md.

Key patterns established:
- Player routing-only with ViewPage in player/pages/
- Global vi.mock for circular dependency resolution
- sideEffects for tree shaking
- Pre-commit hooks via Husky/lint-staged
- Unified onboarding step sequence: welcome_tour -> industry_selection -> starter_pack -> screen_pairing -> complete
- localStorage audit pattern: categorize keys by purpose before cleanup phases

Phase 30-02 localStorage decisions:
- `bizscreen_welcome_modal_shown` is only localStorage key requiring Phase 34 removal
- `onboarding_banner_dismissed` remains in sessionStorage (per-session behavior intentional)
- No migration script needed - database is source of truth

Phase 30-03 JS API decisions:
- Return safe defaults on RPC error (graceful degradation)
- Validate step names client-side before RPC call (fail fast)

Phase 31-01 decisions:
- Use design-system/motion duration.slow (0.3s) for progress bar animation
- Hook returns null state during loading (not defaults) for explicit loading detection
- Visibility change listener for multi-tab sync

Phase 31-02 decisions:
- ScreenPairingStep auto-completes after 2s delay as placeholder for Phase 32
- Onboarding components use consistent API: isOpen, onComplete, onClose props
- Skip links always show confirmation dialog before action

Phase 31-03 decisions:
- Controller provides backdrop and progress bar; step components handle own modal rendering
- Industry selection stored locally in controller and passed to StarterPackOnboarding
- Resume prompt shown for returning users not on welcome_tour step
- STEP_COMPONENTS map and STEP_SEQUENCE array establish canonical step ordering

### Pending Todos

None.

### Blockers/Concerns

All v2.1 tech debt resolved. Minor items accepted:
- src/__fixtures__/ not yet adopted (infrastructure ready)
- 7807 ESLint warnings (gradual cleanup, -8 from quick task 007)
- Migration 105 pre-existing issue (separate fix)

**v2.2 Known Risks:**
- ESLint auto-fix may remove imports (run full build before commit)
- OTP timeout during pairing step (make optional)
- Breaking existing users mid-onboarding (feature flag)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix login error after credentials | 2026-01-28 | 1ce2147 | [001-fix-login-error-after-credentials](./quick/001-fix-login-error-after-credentials/) |
| 002 | Fix remaining login imports | 2026-01-28 | 29bcc3e | [002-fix-remaining-login-imports](./quick/002-fix-remaining-login-imports/) |
| 004 | Fix WelcomeModal import | 2026-01-28 | 008efdd | [004-fix-welcomemodal-import](./quick/004-fix-welcomemodal-import/) |
| 005 | Fix WelcomeModal missing imports | 2026-01-28 | 3bca7fb | — |
| 006 | Fix 3-layer onboarding overlap | 2026-01-31 | b853823 | [006-fix-3-layer-onboarding](./quick/006-fix-3-layer-onboarding/) |
| 007 | Fix unused variable warnings in load-tests | 2026-01-31 | 9d42226 | [007-fix-unused-variable-warnings-in-load-tes](./quick/007-fix-unused-variable-warnings-in-load-tes/) |
| 008 | Fix test mock errors (getUnifiedOnboardingState) | 2026-01-31 | 40bc784 | [008-fix-test-mock-errors](./quick/008-fix-test-mock-errors/) |
| 009 | Update baseline-browser-mapping to v2.9.19 | 2026-01-31 | 95de1d6 | [009-update-baseline-browser-mapping](./quick/009-update-baseline-browser-mapping/) |

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed quick task 009
Resume file: None
Next: Execute 31-04-PLAN.md (Integration and wiring)

---
*Updated: 2026-01-31 — Completed quick task 009 (update baseline-browser-mapping)*
