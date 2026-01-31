# Roadmap: BizScreen v2.2 Onboarding Polish

## Milestones

- [x] **v1 Production Release** - Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** - Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** - Phases 24-29 (shipped 2026-01-28)
- [ ] **v2.2 Onboarding Polish** - Phases 30-35 (in progress)

## Overview

BizScreen's onboarding problem is fragmentation, not missing features. The codebase has 5+ separate onboarding mechanisms (WelcomeModal, OnboardingWizard, WelcomeTour, IndustrySelectionModal, StarterPackOnboarding) that overlap and fail to guide users to the true activation metric: content displaying on a real screen.

This milestone creates a single UnifiedOnboardingController that wraps working components (WelcomeTour, IndustrySelectionModal, StarterPackOnboarding) while deprecating broken ones (OnboardingWizard, WelcomeModal). Screen pairing is integrated into the flow as an optional step, and users receive clear completion feedback.

**Key constraint:** Zero new dependencies required. Existing React 19, Framer Motion, Modal system, and Tailwind are sufficient.

## Phases

**Phase Numbering:**
- Continues from v2.1 (Phase 29)
- v2.2 phases: 30-35

- [x] **Phase 30: State Unification Foundation** - Single source of truth for onboarding progress (completed 2026-01-29)
- [x] **Phase 31: UnifiedOnboardingController** - State machine orchestrator with feature flag (completed 2026-01-31)*
- [ ] **Phase 32: Screen Pairing Integration** - True activation metric achievable in onboarding
- [ ] **Phase 33: Success and Completion UX** - Explicit completion celebration
- [ ] **Phase 34: Cleanup and Deprecation** - Remove dead code after validation
- [ ] **Phase 35: Polotno Editor Verification** - Template customization path hardened

## Phase Details

<details>
<summary>Completed Milestones (v1, v2, v2.1)</summary>

See git history and `.planning/milestones/` for v1 (Phases 1-12), v2 (Phases 13-23), and v2.1 (Phases 24-29) details.
All milestones shipped successfully.

</details>

### v2.2 Onboarding Polish (Active)

**Milestone Goal:** Unify and complete the onboarding experience so new users can create content, pair their first screen, and start displaying content with minimal friction.

---

### Phase 30: State Unification Foundation
**Goal**: Single source of truth for onboarding progress before any UI changes
**Depends on**: Nothing (first phase of v2.2)
**Requirements**: Database migration, service layer extension, localStorage audit
**Success Criteria** (what must be TRUE):
  1. Database migration adds `current_unified_step`, `onboarding_version`, `screen_pairing_completed_at` columns to `onboarding_progress` table
  2. `getUnifiedOnboardingState()` returns current step, can-resume flag, and completion percentage
  3. `advanceOnboardingStep()` transitions between steps with proper validation
  4. Audit documents all localStorage keys and their consumers (for removal in Phase 34)
**Risk Mitigation**:
  - Backward-compatible columns with DEFAULT values (existing users unaffected)
  - New columns are additive, not replacing existing progress tracking
  - Run `syncOnboardingProgress()` on auth restore to handle session expiration
**Plans**: 3 plans

Plans:
- [x] 30-01-PLAN.md — Database migration with unified state columns and RPC functions
- [x] 30-02-PLAN.md — localStorage/sessionStorage audit for Phase 34 cleanup
- [x] 30-03-PLAN.md — Service layer extension with getUnifiedOnboardingState, advanceOnboardingStep, completeUnifiedOnboarding

---

### Phase 31: UnifiedOnboardingController
**Goal**: State machine orchestrator wraps existing components with feature-flagged rollout
**Depends on**: Phase 30 (unified state model required)
**Requirements**: Controller component, feature flag, DashboardPage integration
**Success Criteria** (what must be TRUE):
  1. UnifiedOnboardingController renders correct component based on `current_unified_step` value
  2. Feature flag (`VITE_USE_UNIFIED_ONBOARDING`) toggles between old and new orchestration
  3. Existing component APIs preserved (WelcomeTour, IndustrySelectionModal, StarterPackOnboarding props unchanged)
  4. "Skip to dashboard" escape hatch available from any step (prevents stuck users)
  5. Step transitions animate smoothly via existing AnimatePresence
**Plans**: 4 plans

Plans:
- [x] 31-01-PLAN.md — useUnifiedOnboarding hook and OnboardingProgressBar component
- [x] 31-02-PLAN.md — ResumePrompt, ScreenPairingStep placeholder, OnboardingSkipLink components
- [x] 31-03-PLAN.md — UnifiedOnboardingController orchestrator component
- [x] 31-04-PLAN.md — Feature flag integration in env.js and DashboardPage (verification deferred)

---

### Phase 32: Screen Pairing Integration
**Goal**: True activation metric (content on screen) achievable within onboarding flow
**Depends on**: Phase 31 (controller renders ScreenPairingStep)
**Requirements**: ScreenPairingStep component, OTP display, QR code, pairing confirmation
**Success Criteria** (what must be TRUE):
  1. ScreenPairingStep displays OTP code with large, readable typography
  2. QR code alternative shown prominently (faster than manual OTP entry)
  3. Pairing confirmation polling detects when device connects (via `subscribeToDeviceRefresh`)
  4. "I'll connect a screen later" skip option always available
  5. Skip creates dashboard card prompting user to return and complete pairing
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 32 to break down)

---

### Phase 33: Success and Completion UX
**Goal**: Users receive explicit completion celebration with clear next actions
**Depends on**: Phase 32 (success references pairing outcome)
**Requirements**: SuccessStep component, celebration animation, CTAs
**Success Criteria** (what must be TRUE):
  1. SuccessStep shows celebration moment ("Your BizScreen is ready!")
  2. If screen paired, show screenshot proof from real device ("Content is now live!")
  3. CTAs guide next actions: "Go to Dashboard", "Add More Screens", "Browse Templates"
  4. Progress indicator shows 100% complete before transition
  5. Onboarding marked complete in database (`is_complete=true`, `completed_at` timestamp)
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 33 to break down)

---

### Phase 34: Cleanup and Deprecation
**Goal**: Remove dead code after new flow validated in production
**Depends on**: Phases 30-33 (all new flow components working)
**Requirements**: Delete OnboardingWizard, deprecate WelcomeModal, remove localStorage
**Success Criteria** (what must be TRUE):
  1. OnboardingWizard.jsx deleted entirely (confirmed broken, never properly wired)
  2. WelcomeModal.jsx marked deprecated with comment (functionality in unified flow)
  3. localStorage key `bizscreen_welcome_modal_shown` removed from codebase
  4. sessionStorage key `onboarding_banner_dismissed` consolidated
  5. DashboardPage boolean state variables reduced (12+ to single controller render)
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 34 to break down)

---

### Phase 35: Polotno Editor Verification
**Goal**: Template customization path verified and hardened for onboarding users
**Depends on**: Phase 33 (users reach templates via success CTAs)
**Requirements**: Iframe communication verification, loading timeout, fallback guidance
**Success Criteria** (what must be TRUE):
  1. Polotno postMessage communication works across dev/staging/prod (origin handling verified)
  2. Loading state timeout (10 seconds) shows error + retry button if editor fails to initialize
  3. Fallback guidance offers "Edit later in Design Studio" if iframe communication fails
  4. Template preview loads correctly before opening editor
  5. Save operation persists changes and returns user to previous context
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 35 to break down)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 30. State Foundation | v2.2 | 3/3 | ✓ Complete | 2026-01-29 |
| 31. Unified Controller | v2.2 | 4/4 | ✓ Complete* | 2026-01-31 |
| 32. Screen Pairing | v2.2 | 0/0 | Pending | — |
| 33. Success UX | v2.2 | 0/0 | Pending | — |
| 34. Cleanup | v2.2 | 0/0 | Pending | — |
| 35. Polotno | v2.2 | 0/0 | Pending | — |

**Total v2.2:** 2/6 phases complete

*Phase 31 human verification deferred — recommend `/gsd:verify-work 31` before Phase 32

---
*Roadmap created: 2026-01-28*
*Last updated: 2026-01-31 — Phase 31 complete (4/4 plans, verification deferred)*
