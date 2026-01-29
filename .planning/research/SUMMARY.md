# Project Research Summary - v2.2 Onboarding Polish

**Project:** BizScreen Digital Signage Platform - v2.2 Onboarding Polish
**Domain:** Digital Signage SaaS Onboarding Flow Unification
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

BizScreen's onboarding problem is **fragmentation, not missing features**. The codebase already has 5+ separate onboarding mechanisms (WelcomeModal, OnboardingWizard, WelcomeTour, IndustrySelectionModal, StarterPackOnboarding, AutoBuildOnboardingModal) that overlap, compete for attention, and fail to guide users to the true activation metric: content displaying on a real screen. The recommended approach is to create a single `UnifiedOnboardingController` that wraps the working components (WelcomeTour, IndustrySelectionModal, StarterPackOnboarding) while deprecating the broken/redundant ones (OnboardingWizard, WelcomeModal).

The existing stack is sufficient for this work. **Zero new dependencies are required.** React 19, Framer Motion 12.23.24, the custom Modal system, and Tailwind provide everything needed for smooth step transitions, progress indication, and celebratory completion states. The architecture challenge is consolidation and state machine design, not library selection.

The highest-risk pitfalls are: (1) breaking working flows during unification by introducing state sync issues between database and localStorage, (2) device pairing timeout during onboarding when OTP codes expire before users complete TV setup, and (3) ESLint auto-fix removing used imports, which already caused 40+ issues in v2.1. All three have documented prevention strategies: feature-flagged rollout, optional pairing with comeback path, and build verification in pre-commit.

---

## Key Findings

### Recommended Stack

**No new dependencies required.** The existing stack handles all onboarding needs.

**Core technologies already in use:**
- **React 19 + Framer Motion 12.23.24**: Step transitions with AnimatePresence already used in WelcomeTour
- **Custom Modal system**: Full animation suite in design-system, used by all onboarding components
- **Supabase with onboarding_progress table**: Single source of truth for progress tracking (6 wizard steps + tour + industry)
- **Tailwind CSS**: All styling; custom Stepper component buildable with existing patterns

**Optional polish additions (low priority):**
- `canvas-confetti` (~2.4KB): Celebration animation on completion
- `lottie-react` (~3KB): Custom loading animations

**Why no tour library:** BizScreen's onboarding is modal-based wizard flow, not UI element highlighting. Libraries like react-joyride solve a different problem.

**Why no stepper library:** Existing step indicator pattern in WelcomeTour is cleaner and more customizable than external libraries. Building a `Stepper` design system component is preferred.

### Expected Features

**Must have (table stakes):**
- Single unified flow from signup to first paired screen
- Quick start with sample content (demo workspace exists)
- Screen pairing guidance integrated into onboarding (currently isolated at `/player`)
- Industry-specific templates (starter packs exist)
- Progress indication (exists but uncoordinated across 3 systems)
- Skip option at every step (exists but fragmented)
- Empty state guidance on every page (Yodeck pattern observed)

**Should have (differentiators):**
- "Content live in 5 minutes" promise backed by optimized flow
- Demo screen preview before requiring hardware (show value BEFORE hardware)
- Live confirmation with screenshot proof ("Content is now playing")
- QR code pairing as alternative to OTP entry
- Guided template customization (wizard for replacing placeholder content)

**Defer (v2+):**
- AI content suggestions based on industry and time of day
- Workspace templates for franchise/multi-location
- Mobile-optimized pairing app
- Video-only tutorials (prefer text + images with optional video)

**Anti-patterns to avoid:**
- Multiple overlapping modals (current BizScreen problem)
- Hardware-required activation (show value in browser first)
- Separate onboarding for each feature
- Gamification (feels patronizing for B2B users)

### Architecture Approach

Create a `UnifiedOnboardingController` that acts as a state machine orchestrator, rendering the appropriate existing component based on current step. The controller manages progression through: WelcomeTour (steps 1-6) -> IndustrySelectionModal (step 7) -> StarterPackOnboarding (step 8) -> ScreenPairingStep (step 9, new) -> SuccessStep (step 10, new).

**Major components:**

1. **UnifiedOnboardingController** (CREATE): State machine that reads progress from database and renders appropriate modal
2. **WelcomeTour** (KEEP): 6-step feature introduction, already works
3. **IndustrySelectionModal** (KEEP): Business type selection, already works
4. **StarterPackOnboarding** (KEEP): Template pack selection, already works
5. **ScreenPairingStep** (CREATE): OTP display + QR code + pairing confirmation polling
6. **SuccessStep** (CREATE): Celebration + screenshot proof + next action CTAs

**Deprecate:**
- **OnboardingWizard**: Broken, never properly wired, delete entirely
- **WelcomeModal**: Functionality absorbed into unified flow (its choice step, businessType step, creating step merged)

**State machine flow:**
```
SHOW_WELCOME_TOUR (steps 1-6)
        |
        v
SHOW_INDUSTRY_SELECT (step 7)
        |
        v
SHOW_STARTER_PACK (step 8)
        |
        v
SHOW_SCREEN_PAIRING (step 9) -- optional, skip allowed
        |
        v
SHOW_SUCCESS (step 10)
        |
        v
ONBOARDING_COMPLETE -> Dashboard
```

**Database changes needed:**
- Add `current_unified_step TEXT` column to `onboarding_progress`
- Add `onboarding_version INTEGER DEFAULT 2` for schema versioning
- Add `screen_pairing_completed_at TIMESTAMPTZ` for new step tracking

**Remove localStorage redundancy:**
- Eliminate `bizscreen_welcome_modal_shown` checks
- Use database as single source of truth

### Critical Pitfalls

1. **Breaking working flows during unification** (CRITICAL)
   - Three state systems (WelcomeModal local state, WelcomeTour database, OnboardingService booleans) can get out of sync
   - **Prevention:** Feature flag the transition, test with existing AND returning users, ensure `syncOnboardingProgress()` runs on unification

2. **Device pairing timeout during onboarding** (CRITICAL)
   - OTP codes expire (typically 5-10 minutes) while user is setting up TV
   - **Prevention:** Make pairing optional with clear comeback path, consider 30-minute OTP for first pairing, show QR code prominently

3. **ESLint auto-fix removing required imports** (HIGH)
   - Already caused 40+ issues in v2.1; onboarding touches many files
   - **Prevention:** Disable auto-fix for import rules OR run full build before commit; document named export pattern (WelcomeModal uses named export)

4. **No clear "done" state** (MEDIUM)
   - Current onboarding just stops appearing with no celebration
   - **Prevention:** Add explicit completion celebration with confetti and "Your BizScreen is ready!" message

5. **State sync between database and localStorage** (MEDIUM)
   - Multiple localStorage keys (`bizscreen_welcome_modal_shown`, `onboarding_banner_dismissed`) conflict with database state
   - **Prevention:** Eliminate redundant localStorage, use database as single source of truth

---

## Implications for Roadmap

Based on research findings, dependencies, and risk assessment, suggested phase structure for v2.2:

### Phase 1: State Unification Foundation
**Rationale:** Must have single source of truth before changing any UI; avoids Pitfall 1 (breaking flows)
**Delivers:**
- Database migration adding `current_unified_step`, `onboarding_version`, `screen_pairing_completed_at` columns
- Extended onboardingService.js with `getUnifiedOnboardingState()`, `advanceOnboardingStep()`, `completeUnifiedOnboarding()`
- Audit of all localStorage keys and their consumers
**Addresses:** Fragmented state tracking across 3 systems
**Avoids:** Breaking flows during unification by establishing foundation first
**Complexity:** LOW

### Phase 2: UnifiedOnboardingController
**Rationale:** Wraps existing working components without replacing them; allows feature-flagged rollout
**Delivers:**
- New orchestrator component that renders WelcomeTour, IndustrySelectionModal, StarterPackOnboarding based on state
- Feature flag (`USE_UNIFIED_ONBOARDING`) for controlled rollout
- Preserved existing component APIs (no prop changes)
**Uses:** Existing design system Modal, Framer Motion AnimatePresence
**Implements:** State machine architecture from ONBOARDING-ARCHITECTURE.md
**Avoids:** Pitfall 1 (breaking flows) via feature flag
**Complexity:** MEDIUM

### Phase 3: Screen Pairing Integration
**Rationale:** True activation metric is "content on screen"; pairing must be in flow, not isolated at `/player`
**Delivers:**
- ScreenPairingStep component with OTP display, QR code option, and pairing confirmation polling
- Optional step with clear "I'll connect a screen later" skip
- Extended OTP validity consideration (30 minutes for first pairing)
- Polling for device pairing via existing `subscribeToDeviceRefresh`
**Avoids:** Pitfall 2 (OTP timeout) by making step optional with comeback path
**Complexity:** MEDIUM

### Phase 4: Success and Completion UX
**Rationale:** Users need clear "done" moment; drives engagement with post-onboarding features
**Delivers:**
- SuccessStep component with celebration (optional confetti)
- Screenshot proof from real device if paired ("Your content is now live!")
- CTAs: "Go to Dashboard", "Add More Screens", "Browse Templates"
- Transition to post-onboarding feature discovery
**Avoids:** Pitfall 4 (no "done" state)
**Complexity:** LOW

### Phase 5: Cleanup and Deprecation
**Rationale:** Remove dead code after new flow validated in production; reduces maintenance burden
**Delivers:**
- Delete OnboardingWizard entirely (confirmed broken, never properly wired)
- Deprecate WelcomeModal (functionality merged into unified flow)
- Remove localStorage keys (`bizscreen_welcome_modal_shown`)
- Remove old orchestration code from DashboardPage (12+ boolean state variables)
**Avoids:** Pitfall 3 (ESLint imports) by running full build verification before each deletion
**Complexity:** LOW

### Phase 6: Polotno Editor Verification (if included in milestone)
**Rationale:** Template customization path needs verification; iframe communication is fragile
**Delivers:**
- Verify postMessage communication works across environments (origin handling)
- Add loading state timeout (10 seconds) with error + retry
- Fallback guidance ("Edit later in Design Studio") if editor fails
**Addresses:** Pitfall 4 from pitfalls research (Polotno iframe communication failures)
**Complexity:** MEDIUM

### Phase Ordering Rationale

- **Database first (Phase 1):** All other phases depend on unified state model
- **Controller before new steps (Phase 2):** Easier to add steps to working controller than refactor controller with steps
- **Pairing before success (Phase 3 before 4):** Success step references pairing outcome
- **Cleanup last (Phase 5):** Only remove old code after new flow validated in production
- **Polotno optional (Phase 6):** Independent of onboarding flow, can be deferred if time-constrained

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Screen Pairing):** Need to verify OTP expiration times in Supabase RPC (`get_device_config`), test realtime subscription for pairing confirmation, benchmark polling interval for device status
- **Phase 5 (Cleanup):** Need full audit of all localStorage keys and their consumers before removal

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Database):** Standard backward-compatible migration with defaults
- **Phase 2 (Controller):** React component patterns, state machine is well-documented
- **Phase 4 (Success):** UI component, no complex integration
- **Phase 6 (Polotno):** Verification and fallback, not new development

---

## Critical Path Items

Items that MUST be addressed for milestone success:

1. **Create single state machine for onboarding progression** — Replace 12+ boolean state variables in DashboardPage with unified controller
2. **Integrate screen pairing into onboarding flow** — Currently isolated at `/player`, users don't know how to pair
3. **Handle OTP timeout gracefully** — Allow users to complete onboarding without paired screen, with prominent comeback path
4. **Explicit completion celebration** — Users must know when they're "done" with clear next actions
5. **Feature flag the transition** — Enable parallel testing of old and new flows, rollback capability

---

## Implementation Priorities

Ordered list for the v2.2 milestone:

| Priority | Item | Effort | Impact | Rationale |
|----------|------|--------|--------|-----------|
| P0 | Database migration for unified state | LOW | HIGH | Foundation for all other work |
| P0 | UnifiedOnboardingController with feature flag | MEDIUM | HIGH | Replaces ad-hoc orchestration safely |
| P1 | ScreenPairingStep component | MEDIUM | HIGH | Achieves true activation metric |
| P1 | SuccessStep with celebration | LOW | MEDIUM | Improves completion UX significantly |
| P2 | Delete OnboardingWizard | LOW | LOW | Removes confirmed dead code |
| P2 | Remove localStorage redundancy | LOW | LOW | Simplifies state management |
| P2 | Deprecate WelcomeModal | LOW | LOW | After unified flow validated |
| P3 | Polotno editor verification | MEDIUM | MEDIUM | Template customization path |

---

## Key Decisions Required

Choices the roadmap needs to make:

1. **Feature flag strategy:** Use existing feature flag system or simple environment variable (`VITE_USE_UNIFIED_ONBOARDING`)?
2. **OTP validity extension:** Extend to 30 minutes for first pairing, or regenerate OTP automatically if about to expire?
3. **Demo screen handling:** Count demo screen toward screen limits or add grace period?
4. **Completion definition:**
   - Minimum complete (3 steps): Welcome Tour + Industry + Starter Pack
   - Full complete (5 steps): All above + Screen Pairing + Success
5. **AutoBuildOnboardingModal disposition:** Wire up as alternative "power user" path in v2.2, or defer to v2.3?
6. **WelcomeModal choice step:** Is "Quick Demo vs Starter Pack" choice still needed, or does unified flow replace it?

---

## Risk Matrix

Consolidated risks from all research dimensions:

| Risk | Likelihood | Impact | Mitigation | Phase |
|------|------------|--------|------------|-------|
| Breaking existing users mid-onboarding | MEDIUM | HIGH | Feature flag, state migration, test returning users | Phase 2 |
| OTP expires during pairing step | HIGH | MEDIUM | Make optional, extend validity, show QR prominently | Phase 3 |
| ESLint removes used imports | MEDIUM | MEDIUM | Build check in pre-commit, disable auto-fix | All |
| State machine bugs cause stuck users | MEDIUM | HIGH | "Skip to dashboard" escape hatch always available | Phase 2 |
| Polotno iframe communication fails | LOW | MEDIUM | Loading timeout, fallback CTA | Phase 6 |
| Plan limits block onboarding steps | LOW | MEDIUM | Plan-aware step filtering | Phase 2 |
| Lost progress on session expiration | LOW | MEDIUM | Sync on auth restore, client-side cache hint | Phase 1 |
| Industry selection not persisting | LOW | LOW | Save industry BEFORE applying starter pack | Phase 2 |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase analysis; zero new dependencies needed; existing Modal + Framer Motion sufficient |
| Features | MEDIUM | Based on Yodeck capture + domain knowledge; no live competitor testing; success metrics not verified |
| Architecture | HIGH | Component inventory complete; 5+ flows identified; build order validated against dependencies |
| Pitfalls | HIGH | Verified from codebase analysis and project history (MILESTONES.md ESLint issues, CONCERNS.md) |

**Overall confidence:** HIGH

### Gaps to Address

**During planning:**
- **OTP expiration time:** Need to verify actual timeout in Supabase RPC (`get_device_config`) — affects Phase 3 design
- **AutoBuildOnboardingModal decision:** Decision needed on whether to integrate as alternative path or defer — affects unified controller design
- **Success metrics baseline:** No current tracking of time-to-first-content or time-to-first-pairing — need to add before measuring improvement

**During execution:**
- **Polotno origin handling:** Verify postMessage origin validation works across dev/staging/prod environments
- **Plan feature gates:** Specific feature limits for free tier during onboarding not fully mapped — may need plan-aware step filtering
- **Session refresh scenario:** Need E2E test with session timeout simulation to verify progress persistence

---

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/services/onboardingService.js` — Progress tracking implementation (6 wizard steps + tour + industry)
- `/Users/massimodamico/bizscreen/src/pages/dashboard/WelcomeModal.jsx` — Current welcome flow (choice, businessType, creating steps)
- `/Users/massimodamico/bizscreen/src/components/onboarding/WelcomeTour.jsx` — 6-step feature tour implementation
- `/Users/massimodamico/bizscreen/src/components/OnboardingWizard.jsx` — Broken wizard (standalone, navigates to pages)
- `/Users/massimodamico/bizscreen/supabase/migrations/136_welcome_tour_onboarding.sql` — Tour progress database schema
- `/Users/massimodamico/bizscreen/supabase/migrations/137_industry_and_pack_onboarding.sql` — Industry + pack database schema
- `/Users/massimodamico/bizscreen/.planning/MILESTONES.md` — ESLint import issues documented (40+ imports restored)
- `/Users/massimodamico/bizscreen/.planning/codebase/CONCERNS.md` — Known issues reference

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/docs/yodeck-ui-reference.md` — Competitor UI patterns (empty states, tour links)
- `/Users/massimodamico/bizscreen/yodeck-capture/capture/screens/` — Yodeck screenshots for pattern analysis
- Domain knowledge of ScreenCloud, Xibo, OptiSigns onboarding patterns (not live verified)

### Tertiary (LOW confidence)
- Industry benchmark data for onboarding completion rates (not verified via WebSearch)
- canvas-confetti and lottie-react version numbers (from training data, needs npm verification if used)

---

*Research completed: 2026-01-28*
*Ready for roadmap: yes*
