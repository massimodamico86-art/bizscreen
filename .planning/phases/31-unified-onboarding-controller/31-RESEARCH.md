# Phase 31: UnifiedOnboardingController - Research

**Researched:** 2026-01-28
**Domain:** React state machine orchestration, Framer Motion animations, Vite feature flags
**Confidence:** HIGH

## Summary

This phase implements a state machine orchestrator that renders the correct onboarding component based on the `current_unified_step` value from the database. The controller wraps existing components (WelcomeTour, IndustrySelectionModal, StarterPackOnboarding, ScreenPairingStep) without modifying their APIs.

The research confirms that the BizScreen codebase already has all the necessary primitives in place:
- Phase 30 provides the unified state API (`getUnifiedOnboardingState`, `advanceOnboardingStep`, `completeUnifiedOnboarding`)
- Framer Motion's `AnimatePresence` with `mode="wait"` handles step transitions
- Vite environment variables follow an established pattern for feature flags
- The existing Modal and motion systems provide consistent animation patterns

**Primary recommendation:** Build a simple step-mapping controller using React state and effects, not a full state machine library like XState. The unified step flow is linear and predetermined, making a lightweight approach sufficient.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component framework | Already in use, hooks-based state |
| Framer Motion | 11.x | Animation library | Already powers Modal, WelcomeTourStep animations |
| Vite | 5.x | Build tool with env vars | Already configured with VITE_* pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @design-system/Modal | Internal | Modal container with animation | Wrap each onboarding step |
| @design-system/motion | Internal | Animation presets (fadeIn, slideUp, modal) | Step transitions |
| ConfirmDialog | Internal | Confirmation dialogs | Skip confirmation prompt |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple React state | XState | XState adds complexity for a linear 4-step flow; overkill for this use case |
| AnimatePresence mode="wait" | Custom animation sequencing | AnimatePresence already handles unmount/mount timing perfectly |
| VITE_* env var | LaunchDarkly/PostHog feature flags | External service adds dependencies; env var is sufficient for development rollout |

**Installation:**
No new packages required. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── onboarding/
│       ├── UnifiedOnboardingController.jsx  # New orchestrator
│       ├── OnboardingProgressBar.jsx        # New progress indicator
│       ├── OnboardingSkipLink.jsx           # New skip affordance
│       ├── ResumePrompt.jsx                 # New re-entry modal
│       ├── WelcomeTour.jsx                  # Existing (unchanged)
│       ├── IndustrySelectionModal.jsx       # Existing (unchanged)
│       ├── StarterPackOnboarding.jsx        # Existing (unchanged)
│       └── OnboardingBanner.jsx             # Existing (may need minor update)
├── hooks/
│   └── useUnifiedOnboarding.js              # New custom hook
└── pages/
    └── DashboardPage.jsx                    # Integration point
```

### Pattern 1: Step-to-Component Mapping
**What:** Map unified step names to React components
**When to use:** Controller needs to render the correct component based on current step
**Example:**
```javascript
// Source: Codebase pattern from existing onboarding components
const STEP_COMPONENTS = {
  welcome_tour: WelcomeTour,
  industry_selection: IndustrySelectionModal,
  starter_pack: StarterPackOnboarding,
  screen_pairing: ScreenPairingStep,
  complete: null, // No component, onboarding done
};

const STEP_SEQUENCE = ['welcome_tour', 'industry_selection', 'starter_pack', 'screen_pairing', 'complete'];
const STEP_PROGRESS = {
  welcome_tour: 0,
  industry_selection: 25,
  starter_pack: 50,
  screen_pairing: 75,
  complete: 100,
};
```

### Pattern 2: Feature Flag Toggle
**What:** Use Vite environment variable to toggle between old and new orchestration
**When to use:** DashboardPage decides which flow to use
**Example:**
```javascript
// Source: Existing VITE_ENABLE_AI pattern in src/config/env.js
const USE_UNIFIED_ONBOARDING = import.meta.env.VITE_USE_UNIFIED_ONBOARDING === 'true';

// In DashboardPage.jsx
{USE_UNIFIED_ONBOARDING ? (
  <UnifiedOnboardingController onComplete={handleOnboardingComplete} />
) : (
  // Old orchestration (existing WelcomeTour/IndustrySelection/StarterPack logic)
)}
```

### Pattern 3: AnimatePresence for Step Transitions
**What:** Use Framer Motion AnimatePresence with mode="wait" for sequential animations
**When to use:** When switching between step components
**Example:**
```javascript
// Source: Framer Motion docs + existing WelcomeTour.jsx pattern
import { AnimatePresence, motion } from 'framer-motion';
import { fadeInScale } from '../design-system/motion';

<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}
    initial={fadeInScale.initial}
    animate={fadeInScale.animate}
    exit={fadeInScale.exit}
    transition={fadeInScale.transition}
  >
    <CurrentStepComponent {...stepProps} />
  </motion.div>
</AnimatePresence>
```

### Pattern 4: Callback Props for Step Completion
**What:** Each child component calls an onComplete callback when its step is done
**When to use:** Step transitions triggered by child component completion
**Example:**
```javascript
// Source: Existing WelcomeTour.jsx pattern with onComplete/onGetStarted
<WelcomeTour
  isOpen={currentStep === 'welcome_tour'}
  onClose={handleSkip}
  onComplete={() => handleStepComplete('welcome_tour')}
  onGetStarted={() => handleStepComplete('welcome_tour')}
/>
```

### Pattern 5: Re-entry Resume Flow
**What:** Check for incomplete onboarding on mount and show resume prompt
**When to use:** User returns to dashboard with incomplete onboarding
**Example:**
```javascript
// Source: Decision from 31-CONTEXT.md
useEffect(() => {
  async function checkResumeState() {
    const state = await getUnifiedOnboardingState();
    if (state.canResume && state.currentStep !== 'welcome_tour') {
      setShowResumePrompt(true);
      setPreviousStep(state.currentStep);
    }
  }
  checkResumeState();
}, []);

// Resume prompt offers: Resume / Restart / Skip
```

### Anti-Patterns to Avoid
- **Multiple sources of truth:** Don't track step in both React state AND database. Database is source of truth, React state is derived.
- **Modifying child component APIs:** Don't change WelcomeTour, IndustrySelectionModal, or StarterPackOnboarding props. Wrap with adapter props if needed.
- **Hardcoding step order in multiple places:** Define STEP_SEQUENCE once and derive all logic from it.
- **Blocking renders on async calls:** Use optimistic UI - show component immediately, handle errors gracefully.
- **Fragment children in AnimatePresence:** AnimatePresence mode="wait" expects a single keyed child. Don't wrap in fragments.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step transition animations | Custom CSS transitions | Framer Motion AnimatePresence | Exit animations, timing coordination already solved |
| Progress percentage calculation | Manual step counting | Database `progress_percent` from RPC | Already calculated server-side in Phase 30 |
| Modal backdrop + focus trap | Custom overlay code | design-system Modal component | Accessibility, keyboard handling, portal rendering |
| Confirmation dialogs | Custom modal | design-system ConfirmDialog | Consistent styling, loading states |
| Feature flag detection | Custom env parsing | `import.meta.env.VITE_*` | Vite's built-in env handling with HMR |

**Key insight:** The BizScreen codebase has mature UI primitives. The controller should orchestrate existing components, not build new UI patterns.

## Common Pitfalls

### Pitfall 1: Race Conditions on Step Advance
**What goes wrong:** User rapidly clicks through steps, causing multiple simultaneous `advanceOnboardingStep` calls
**Why it happens:** Async RPC call doesn't complete before next interaction
**How to avoid:**
- Disable UI during async operations
- Use a loading state per step
- Debounce or queue step advances
**Warning signs:** Steps skipped, database state inconsistent with UI

### Pitfall 2: Animation Overlap with AnimatePresence
**What goes wrong:** Exit and enter animations run simultaneously, causing visual glitches
**Why it happens:** Using default AnimatePresence mode (sync) instead of mode="wait"
**How to avoid:** Always use `<AnimatePresence mode="wait">` for sequential step transitions
**Warning signs:** Two step components briefly visible at same time

### Pitfall 3: Stale State After Tab Switch
**What goes wrong:** User completes step in another tab, returns to find UI showing old step
**Why it happens:** React state not synced with database on visibility change
**How to avoid:** Re-fetch state on page visibility change:
```javascript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      refreshOnboardingState();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```
**Warning signs:** UI shows different step than database

### Pitfall 4: Feature Flag Not Tree-Shaken
**What goes wrong:** Old orchestration code still bundled when feature flag is true
**Why it happens:** Runtime condition prevents dead code elimination
**How to avoid:** For production, feature flag should be compile-time constant. Vite's `define` option can help:
```javascript
// vite.config.js
define: {
  __UNIFIED_ONBOARDING__: JSON.stringify(process.env.VITE_USE_UNIFIED_ONBOARDING === 'true')
}
```
**Warning signs:** Bundle size doesn't decrease when old code "removed"

### Pitfall 5: Skip Doesn't Persist Properly
**What goes wrong:** User skips onboarding but is prompted again on next visit
**Why it happens:** Skip action not calling database RPC, only setting local state
**How to avoid:** Skip must call `skipOnboarding()` RPC (already exists) to set `skipped_at` timestamp
**Warning signs:** Skipped users see onboarding repeatedly

### Pitfall 6: Progress Bar Flickers on Load
**What goes wrong:** Progress bar shows 0% briefly before jumping to actual progress
**Why it happens:** Loading state not handled, showing default progress before data arrives
**How to avoid:** Show skeleton or hide progress bar entirely during loading state
**Warning signs:** Visual jump from 0% to actual progress on page load

## Code Examples

Verified patterns from official sources and existing codebase:

### UnifiedOnboardingController Structure
```javascript
// Source: Pattern derived from DashboardPage.jsx existing flow
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getUnifiedOnboardingState, advanceOnboardingStep } from '../../services/onboardingService';
import { fadeInScale } from '../../design-system/motion';
import { Modal, ModalContent, ConfirmDialog } from '../../design-system';

const STEP_COMPONENTS = {
  welcome_tour: WelcomeTour,
  industry_selection: IndustrySelectionModal,
  starter_pack: StarterPackOnboarding,
  screen_pairing: ScreenPairingStep,
};

export function UnifiedOnboardingController({ onComplete }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Load initial state
  useEffect(() => {
    async function loadState() {
      setLoading(true);
      const data = await getUnifiedOnboardingState();
      setState(data);
      setLoading(false);
    }
    loadState();
  }, []);

  // Handle step completion
  const handleStepComplete = useCallback(async (completedStep) => {
    setAdvancing(true);
    const result = await advanceOnboardingStep(completedStep);
    if (result.success) {
      if (result.isComplete) {
        onComplete?.();
      } else {
        setState(prev => ({ ...prev, currentStep: result.nextStep }));
      }
    }
    setAdvancing(false);
  }, [onComplete]);

  if (loading || !state || state.isComplete) return null;

  const CurrentComponent = STEP_COMPONENTS[state.currentStep];
  if (!CurrentComponent) return null;

  return (
    <>
      <OnboardingProgressBar progress={state.progressPercent} />
      <AnimatePresence mode="wait">
        <motion.div key={state.currentStep} {...fadeInScale}>
          <CurrentComponent
            isOpen={true}
            onComplete={() => handleStepComplete(state.currentStep)}
            onClose={() => setShowSkipConfirm(true)}
          />
        </motion.div>
      </AnimatePresence>
      <ConfirmDialog
        open={showSkipConfirm}
        title="Skip onboarding?"
        description="You can complete it later from your dashboard."
        confirmText="Skip"
        cancelText="Continue Setup"
        onConfirm={handleSkip}
        onClose={() => setShowSkipConfirm(false)}
      />
    </>
  );
}
```

### Custom Hook for Unified Onboarding
```javascript
// Source: Pattern from existing hooks in codebase
import { useState, useEffect, useCallback } from 'react';
import { getUnifiedOnboardingState, advanceOnboardingStep, skipOnboarding } from '../services/onboardingService';

export function useUnifiedOnboarding() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getUnifiedOnboardingState();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
    init();
  }, [refresh]);

  const advance = useCallback(async (step) => {
    const result = await advanceOnboardingStep(step);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const skip = useCallback(async () => {
    const result = await skipOnboarding();
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  return { state, loading, error, advance, skip, refresh };
}
```

### Progress Bar Component
```javascript
// Source: Decision from 31-CONTEXT.md (thin bar at top, no text)
export function OnboardingProgressBar({ progress, loading }) {
  if (loading) {
    return <div className="h-1 bg-gray-200 rounded-full overflow-hidden" />;
  }

  return (
    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}
```

### DashboardPage Integration
```javascript
// Source: Existing DashboardPage.jsx pattern
const USE_UNIFIED_ONBOARDING = import.meta.env.VITE_USE_UNIFIED_ONBOARDING === 'true';

// In DashboardPage component
const [showUnifiedOnboarding, setShowUnifiedOnboarding] = useState(false);

useEffect(() => {
  if (USE_UNIFIED_ONBOARDING) {
    // Check if we need to show unified onboarding
    getUnifiedOnboardingState().then(state => {
      if (state.canResume && !state.isComplete) {
        setShowUnifiedOnboarding(true);
      }
    });
  }
}, []);

// In render
{USE_UNIFIED_ONBOARDING && showUnifiedOnboarding && (
  <UnifiedOnboardingController
    onComplete={() => {
      setShowUnifiedOnboarding(false);
      fetchData(); // Refresh dashboard
    }}
  />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple boolean flags for each step | Single `current_unified_step` string | Phase 30 (v2.2) | Simpler state, clear progression |
| localStorage for progress | Database with RPC | Phase 30 | Cross-device sync, single source of truth |
| Separate modals orchestrated in DashboardPage | Unified controller component | Phase 31 | Cleaner separation, easier to modify flow |
| framer-motion v4 exitBeforeEnter | framer-motion v5+ mode="wait" | ~2022 | Same behavior, updated API name |

**Deprecated/outdated:**
- `exitBeforeEnter` prop on AnimatePresence: Renamed to `mode="wait"` in Framer Motion v5
- Storing onboarding step in localStorage: Now in database via Phase 30 unified state

## Open Questions

Things that couldn't be fully resolved:

1. **ScreenPairingStep component location**
   - What we know: Step sequence includes `screen_pairing`, but no ScreenPairingStep.jsx exists yet
   - What's unclear: Is this component built in a parallel phase, or does Phase 31 need to create it?
   - Recommendation: Check ROADMAP.md for screen pairing phase; if not planned, Phase 31 may need a simple placeholder or the existing pairing flow from ScreensPage

2. **Resume prompt timing on dashboard load**
   - What we know: Decision says show "Continue where you left off?" prompt on return
   - What's unclear: Should prompt show immediately, or after dashboard content loads?
   - Recommendation: Show after initial load (skeleton -> content -> prompt overlay) to avoid blocking dashboard

3. **Banner dismissed state persistence**
   - What we know: "Banner is dismissible once - after dismissed, never shows again"
   - What's unclear: Current OnboardingBanner uses sessionStorage (per-session). Does "never shows again" mean localStorage?
   - Recommendation: Clarify in planning; likely needs localStorage or database flag

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/onboarding/WelcomeTour.jsx` - Callback patterns, modal structure
- Existing codebase: `src/components/onboarding/IndustrySelectionModal.jsx` - Props interface
- Existing codebase: `src/components/onboarding/StarterPackOnboarding.jsx` - Completion flow
- Existing codebase: `src/services/onboardingService.js` - Unified state API (Phase 30)
- Existing codebase: `src/design-system/motion.js` - Animation presets
- Existing codebase: `src/design-system/components/Modal.jsx` - AnimatePresence usage
- Existing codebase: `src/config/env.js` - VITE_* environment variable pattern

### Secondary (MEDIUM confidence)
- [Framer Motion AnimatePresence docs](https://motion.dev/docs/react-animate-presence) - mode="wait" behavior
- [Vite Env Variables docs](https://vite.dev/guide/env-and-mode) - VITE_* prefix convention
- Phase 30 plans: `30-01-PLAN.md`, `30-03-PLAN.md` - RPC function signatures

### Tertiary (LOW confidence)
- WebSearch: State machine patterns - General guidance, not specific to this implementation
- WebSearch: Feature flag patterns - Confirmed existing codebase approach is standard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in codebase
- Architecture: HIGH - Patterns derived from existing components
- Pitfalls: MEDIUM - Based on general React/animation knowledge, verified against codebase patterns

**Research date:** 2026-01-28
**Valid until:** 60 days (stable domain, no external API dependencies)
