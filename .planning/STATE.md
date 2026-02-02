# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v2.2 Onboarding Polish

## Current Position

Phase: 35 - Polotno Editor Verification
Plan: 04 of 4 complete
Status: Phase complete
Last activity: 2026-02-02 - Completed quick task 021 (Client smoke test + FeaturesPage/PricingPage fix)

Progress: [==========] 100% (6/6 phases complete)

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1 Production Release | 1-12 | Archived | 2026-01-24 |
| v2 Templates & Platform Polish | 13-23 | Archived | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | Archived | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | Complete | 2026-02-01 |

## v2.2 Phase Overview

| Phase | Goal | Status |
|-------|------|--------|
| 30 - State Foundation | Single source of truth for progress | Complete (3/3) |
| 31 - Unified Controller | State machine orchestrator | Complete (4/4)* |
| 32 - Screen Pairing | Pairing integrated into flow | Complete (2/2) |
| 33 - Success UX | Explicit completion celebration | Complete (1/1) |
| 34 - Cleanup | Remove dead code | Complete (2/2) |
| 35 - Polotno | Editor verification | Complete (4/4) |

## Performance Metrics

**Cumulative (v1 + v2 + v2.1):**
- Total plans executed: 128 (75 + 40 + 11 + 1 + 1)
- Total phases: 35 completed
- Total codebase: 310,940 LOC JavaScript/JSX

**v2.2 Current:**
- Phases: 6/6 complete
- Plans: 16 executed (3 in Phase 30, 4 in Phase 31, 2 in Phase 32, 1 in Phase 33, 2 in Phase 34, 4 in Phase 35)
- Note: Phase 31 human verification skipped (deferred)

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

Phase 32-01 decisions:
- QR code is primary pairing method (180px prominent), OTP is fallback
- Polling interval is 3 seconds (matching PairPage.jsx pattern)
- Confetti zIndex 10001 to appear above modal overlay (10000)
- OTP displayed as 'ABC 123' format with large monospace font
- 2 second delay after pairing before auto-advancing to next step
- Skip option always visible - orphan screens are acceptable

Phase 32-02 decisions:
- Reminder card queries onboarding_progress.screen_pairing_completed_at directly
- localStorage dismissal with 7-day auto-reset (re-prompts inactive users)
- Only shows when unified onboarding feature flag is enabled
- Teal gradient styling distinguishes from OnboardingBanner (blue)

Phase 33-01 decisions:
- Green gradient header (from-green-500 to-emerald-600) distinguishes from pairing step (teal)
- Secondary CTAs use window.location.href for navigation after completing onboarding
- Confetti fires immediately on isOpen without delay
- completeUnifiedOnboarding called before any navigation/completion callback

Phase 34-01 decisions:
- Proceed with deletions despite pre-existing E2E test failures (infrastructure issues)
- Storage key cleanup in DashboardPage.jsx deferred to Plan 02

Phase 34-02 decisions:
- Removed isFirstRun state since legacy first-run flows are deleted
- Removed demoResult state and DemoResultCard since createDemoWorkspace only triggered from WelcomeModal
- Removed all legacy code paths behind !config().useUnifiedOnboarding checks

Phase 35-01 decisions:
- Modal uses closeOnOverlay=false and closeOnEscape=false to prevent accidental close
- 10-second timeout (changed from 30s) per CONTEXT.md decision
- Error state has three options: Try Again, Open Design Studio, Contact Support
- EditorModal pattern: parent handles loading/error states via onReady/onError callbacks

Phase 35-02 decisions:
- postMessage designChanged for dirty state tracking from iframe to parent
- 500ms debounce on change notifications to avoid excessive messages
- triggerSave action enables programmatic save from UnsavedChangesDialog
- Cancel returns to editor, Discard closes without saving, Save saves then closes

Phase 35-03 decisions:
- PostSaveDialog renders inside EditorModal as child component
- Keep Editing is primary button (most common action)
- View Template navigates to media-images via hash routing
- Dialog prevents close on overlay/escape (user must choose action)

Phase 35-04 decisions:
- Mobile warning shows on both mobile and tablet viewports (< 1024px)
- Warning is dismissible - soft block allowing users to continue
- E2E tests skip complex iframe interaction tests (marked as skip)
- data-testid pattern: component-specific like 'template-card', 'editor-modal'

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
| 005 | Fix WelcomeModal missing imports | 2026-01-28 | 3bca7fb | - |
| 006 | Fix 3-layer onboarding overlap | 2026-01-31 | b853823 | [006-fix-3-layer-onboarding](./quick/006-fix-3-layer-onboarding/) |
| 007 | Fix unused variable warnings in load-tests | 2026-01-31 | 9d42226 | [007-fix-unused-variable-warnings-in-load-tes](./quick/007-fix-unused-variable-warnings-in-load-tes/) |
| 008 | Fix test mock errors (getUnifiedOnboardingState) | 2026-01-31 | 40bc784 | [008-fix-test-mock-errors](./quick/008-fix-test-mock-errors/) |
| 009 | Update baseline-browser-mapping to v2.9.19 | 2026-01-31 | 95de1d6 | [009-update-baseline-browser-mapping](./quick/009-update-baseline-browser-mapping/) |
| 010 | Make Playwright login easier with storage state | 2026-02-02 | ec7c25b | [010-make-playwright-login-easier](./quick/010-make-playwright-login-easier/) |
| 011 | Configure Playwright test credentials | 2026-02-02 | 83ff203 | [011-configure-playwright-test-credentials](./quick/011-configure-playwright-test-credentials/) |
| 012 | Add admin and superadmin Playwright credentials | 2026-02-02 | 78d060c | [012-add-admin-and-superadmin-playwright-cred](./quick/012-add-admin-and-superadmin-playwright-cred/) |
| 013 | Fix MediaLibraryPage missing imports | 2026-02-02 | 9884ec4 | [013-fix-medialibrarypage-imports](./quick/013-fix-medialibrarypage-imports/) |
| 014 | Update admin.spec.js to use storage state auth | 2026-02-02 | 2c6f795 | [014-debug-admin-auth-issues](./quick/014-debug-admin-auth-issues/) |
| 015 | Fix super admin dashboard crash (missing imports) | 2026-02-02 | 5b85057 | [015-fix-super-admin-dashboard-crash](./quick/015-fix-super-admin-dashboard-crash/) |
| 016 | Verify admin tests (tasks 014/015 confirmation) | 2026-02-02 | - | [016-run-admin-tests-to-verify-fixes](./quick/016-run-admin-tests-to-verify-fixes/) |
| 017 | Fix admin panel test selectors | 2026-02-02 | 191be28 | [017-fix-admin-panel-test-selectors](./quick/017-fix-admin-panel-test-selectors/) |
| 018 | Start the server | 2026-02-02 | - | [018-start-the-server](./quick/018-start-the-server/) |
| 019 | Fix MarketingLayout missing imports | 2026-02-02 | d8ec9e5 | [019-fix-referenceerror-link-is-not-defined-i](./quick/019-fix-referenceerror-link-is-not-defined-i/) |
| 020 | Fix HomePage missing imports | 2026-02-02 | 0fbced7 | [020-fix-referenceerror-seo-is-not-defined-i](./quick/020-fix-referenceerror-seo-is-not-defined-i/) |
| 021 | Client smoke test (+ FeaturesPage/PricingPage fix) | 2026-02-02 | 360be47 | [021-do-a-smoke-test-as-a-client](./quick/021-do-a-smoke-test-as-a-client/) |

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed quick task 021 (Client smoke test)
Resume file: None
Next: All marketing pages verified working via automated smoke test

---
*Updated: 2026-02-02 - Quick task 021 complete*
