# Phase 31: UnifiedOnboardingController - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

State machine orchestrator that renders the correct onboarding component (WelcomeTour, IndustrySelectionModal, StarterPackOnboarding, ScreenPairingStep) based on `current_unified_step`. Feature flag toggles between old and new orchestration. Existing component APIs are preserved — this phase wraps, doesn't rewrite.

</domain>

<decisions>
## Implementation Decisions

### Step Transitions
- Auto-advance immediately when step completes (no explicit "Continue" button)
- Show retry prompt on failure — "Something went wrong, try again" with retry button
- Back navigation via dedicated back button (not clicking progress indicator)

### Skip/Escape Behavior
- Subtle text link at bottom of each step — visible but not prominent
- Simple confirmation dialog: "Skip onboarding? You can complete it later" with Yes/No
- Skipping marks progress as "skipped" in database (not cleared)
- Skipped users offered fresh start when they return

### Progress Indication
- Progress bar (percentage-based fill) — not stepper dots or step labels
- Position: top of modal/card as thin bar
- Visual only — no percentage text or step count displayed
- Back button is separate element, not integrated into progress bar

### Re-entry Experience
- Resume prompt shown when user returns mid-onboarding: "Continue where you left off?"
- Three options on prompt: Resume / Restart / Skip
- Dashboard banner for users who previously skipped: "Complete setup to unlock all features"
- Banner is dismissible once — after dismissed, never shows again

### Claude's Discretion
- Transition animation choice (fade vs slide) — use existing Framer Motion patterns
- Skip link text variation (same text vs context-aware)
- Exact retry prompt UI and error messaging
- Progress bar styling details (color, height, animation)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches that match existing BizScreen modal and component patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-unified-onboarding-controller*
*Context gathered: 2026-01-28*
