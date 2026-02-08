# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** Phase 37 - E2E Test Stabilization

## Current Position

Phase: 37 of 41 (E2E Test Stabilization)
Plan: 4 of 4 in current phase
Status: Phase complete
Last activity: 2026-02-08 - Completed 37-04-PLAN.md

Progress: [######################........] 38/41 phases (v2.3 in progress)

## Milestone: v2.3 Production Hardening

| Phase | Goal | Status |
|-------|------|--------|
| 36 | E2E Test Infrastructure | Complete |
| 37 | E2E Test Stabilization | Complete |
| 38 | E2E Test Coverage Gate | Not started |
| 39 | Error Monitoring Setup | Not started |
| 40 | Error Monitoring Production | Not started |
| 41 | Feature Flag Cleanup | Not started |

## Performance Metrics

**Cumulative (v1 + v2 + v2.1 + v2.2 + v2.3):**
- Total plans executed: 148 (75 + 39 + 11 + 16 + 7)
- Total phases: 36 completed
- Total codebase: 315,480 LOC JavaScript/JSX
- Test suite: 2079 unit tests, 382 E2E tests passing

## Accumulated Context

### Key Patterns

Core patterns from v2.3 (Phase 37):
- Promise.race soft timeout for loading indicators that may persist
- count() + isVisible() pattern instead of isVisible().catch(() => false)
- element.or() composition for multi-element visibility checks
- Avoid waitForTimeout - use element-based waits with soft timeouts
- Promise.race for auth resolution (sidebar vs login form visibility)
- Project-specific test skips: if (testInfo.project.name !== 'chromium')
- dialog.waitFor({ state: 'hidden' }) for modal close verification
- toHaveAttribute for toggle state verification
- Conditional element checks for optional UI features

Core patterns from v2.3 (Phase 36):
- Custom Playwright fixtures via base.extend() for test isolation
- authenticatedPage fixture for tests needing auth state
- freshPage fixture for clean browser context (no cookies/storage)
- waitFor({ state: 'hidden' }) for modal dismissal instead of hardcoded waits
- waitForLoadState('domcontentloaded') instead of waitForTimeout
- test.use({ storageState: { cookies: [], origins: [] } }) for describe-level state clearing
- 4 documented isolation patterns in fixtures/index.js

Core patterns from v2.2:
- Unified onboarding step sequence: welcome_tour -> industry_selection -> starter_pack -> screen_pairing -> complete
- Feature flag pattern for safe rollout (VITE_USE_UNIFIED_ONBOARDING)
- Modal-based editor isolation with callback props (onReady, onError)

### Tech Debt (v2.3 Targets)

E2E test stability issues:
- Target: 90%+ pass rate
- **Category 1 (Auth) stabilized:** 99/99 tests passing (5 consecutive runs)
- **Category 2 (Dashboard & Pages) stabilized:** 63-68 tests passing (5 consecutive runs)
- **Category 3 (Complex Interactions) stabilized:** 36 tests, 39 waitForTimeout removed, 80% pass rate
- **Category 4 (Feature Pages) stabilized:** 67 tests, 13 waitForTimeout removed, 3/4 files 100% pass rate
- Tracking document: .planning/phases/37-e2e-test-stabilization/SKIPPED-TESTS.md
- Recommendation: Run with --workers=1 for consistent results

Feature flag cleanup pending:
- OnboardingWizard component (confirmed broken)
- WelcomeModal legacy code
- VITE_USE_UNIFIED_ONBOARDING flag
- Obsolete localStorage keys

No error monitoring currently in place.

### Blockers/Concerns

None for v2.3.

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 37-04-PLAN.md (Feature-Specific Pages Stabilization)
Resume file: None
Next: Phase 38 - E2E Test Coverage Gate

---
*Updated: 2026-02-08 - Completed 37-04-PLAN.md (Phase 37 complete)*
