# Phase 34: Cleanup and Deprecation - Research

**Researched:** 2026-01-31
**Domain:** React component cleanup, localStorage management, code deprecation
**Confidence:** HIGH

## Summary

This phase focuses on removing dead onboarding code after the unified flow (Phases 30-33) is validated. The cleanup involves deleting broken components (OnboardingWizard.jsx, OnboardingBanner.jsx), removing obsolete storage keys, and simplifying DashboardPage state management.

The codebase analysis reveals a clear scope:
- **OnboardingWizard.jsx** (539 lines) - Located at `/src/components/OnboardingWizard.jsx`, imported only by DashboardPage but guarded by `!config().useUnifiedOnboarding` feature flag
- **OnboardingBanner.jsx** (102 lines) - Located at `/src/components/onboarding/OnboardingBanner.jsx`, exported from index.js, imported by DashboardPage with same feature flag guard
- **WelcomeModal.jsx** (359 lines) - Located at `/src/pages/dashboard/WelcomeModal.jsx`, also guarded by feature flag
- **Storage keys**: `bizscreen_welcome_modal_shown` (localStorage) and `onboarding_banner_dismissed` (sessionStorage)

The unified onboarding is controlled by `VITE_USE_UNIFIED_ONBOARDING` environment variable. When enabled, all legacy onboarding components are already conditionally hidden.

**Primary recommendation:** Delete OnboardingWizard.jsx and OnboardingBanner.jsx outright. For WelcomeModal.jsx, delete it along with the others since it's equally obsolete and fully guarded by the same feature flag.

## Standard Stack

This phase involves only removal and refactoring - no new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component framework | Already in use |
| Vitest | 2.x | Unit testing | Already in use |
| Playwright | 1.x | E2E testing | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ESLint | 9.x | Linting | Verify no unused imports after cleanup |

### Not Needed
No new packages required. This is a removal phase.

## Architecture Patterns

### Pre-Cleanup File Structure
```
src/
├── components/
│   ├── OnboardingWizard.jsx        # DELETE (broken, never wired)
│   └── onboarding/
│       ├── OnboardingBanner.jsx    # DELETE (replaced by unified flow)
│       ├── UnifiedOnboardingController.jsx  # KEEP (new flow)
│       ├── WelcomeTour.jsx         # KEEP (used by unified)
│       ├── IndustrySelectionModal.jsx       # KEEP
│       ├── StarterPackOnboarding.jsx        # KEEP
│       ├── ScreenPairingStep.jsx   # KEEP (Phase 32)
│       ├── SuccessStep.jsx         # KEEP (Phase 33)
│       └── index.js                # UPDATE (remove OnboardingBanner export)
├── pages/
│   ├── DashboardPage.jsx           # UPDATE (remove imports, state, conditionals)
│   └── dashboard/
│       ├── WelcomeModal.jsx        # DELETE (replaced by unified flow)
│       └── index.js                # UPDATE (remove WelcomeModal exports)
```

### Post-Cleanup File Structure
```
src/
├── components/
│   └── onboarding/
│       ├── UnifiedOnboardingController.jsx  # KEEP
│       ├── WelcomeTour.jsx                  # KEEP
│       ├── IndustrySelectionModal.jsx       # KEEP
│       ├── StarterPackOnboarding.jsx        # KEEP
│       ├── ScreenPairingStep.jsx            # KEEP
│       ├── SuccessStep.jsx                  # KEEP
│       └── index.js                         # UPDATED
├── pages/
│   ├── DashboardPage.jsx                    # SIMPLIFIED
│   └── dashboard/
│       └── index.js                         # UPDATED
```

### Pattern 1: Feature Flag Guard Removal

**What:** When unified onboarding is always-on, remove feature flag conditionals
**When to use:** After Phase 34, when `useUnifiedOnboarding` becomes the default
**Example:**
```jsx
// BEFORE: Feature flag guards (remove these)
{!config().useUnifiedOnboarding && showWelcomeModal && (
  <WelcomeModal ... />
)}

// AFTER: Clean unified-only code
{showUnifiedOnboarding && (
  <UnifiedOnboardingController onComplete={handleUnifiedOnboardingComplete} />
)}
```

### Pattern 2: Safe Component Deletion

**What:** Remove component file and all references in correct order
**When to use:** When deleting any component
**Steps:**
1. Remove imports in consuming files
2. Remove JSX usage in consuming files
3. Remove related state variables
4. Remove from barrel exports (index.js)
5. Delete the component file
6. Run tests to verify

### Pattern 3: Storage Key Cleanup

**What:** Stop writing keys and remove reads
**When to use:** Cleaning obsolete localStorage/sessionStorage
**Example:**
```jsx
// REMOVE: Storage key constant
const WELCOME_MODAL_KEY = 'bizscreen_welcome_modal_shown';

// REMOVE: localStorage reads
if (firstRunData.isFirstRun && !localStorage.getItem(WELCOME_MODAL_KEY)) {

// REMOVE: localStorage writes
localStorage.setItem(WELCOME_MODAL_KEY, 'true');
```

### Anti-Patterns to Avoid
- **Leaving orphaned imports:** Always verify no dangling imports remain
- **Partial cleanup:** Don't leave state variables that reference deleted components
- **Skipping tests:** Always run E2E suite before and after cleanup

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Manual grep | ESLint unused imports rule | More reliable |
| Finding all references | grep | IDE "Find All References" | Catches re-exports |
| Testing cleanup | Manual testing | Playwright E2E suite | Automated verification |

**Key insight:** The feature flag pattern means components are already "dead" when the flag is on. The cleanup is about removing the dead code path entirely.

## Common Pitfalls

### Pitfall 1: Missing Index File Updates
**What goes wrong:** Component deleted but still exported from index.js
**Why it happens:** Barrel exports forgotten during cleanup
**How to avoid:** Check all index.js files in component directories
**Warning signs:** Build errors about missing exports

### Pitfall 2: Orphaned State Variables
**What goes wrong:** State like `showWelcomeModal` remains but component deleted
**Why it happens:** State cleanup not thorough
**How to avoid:** Search for all state variables referencing deleted components
**Warning signs:** Unused variable lint warnings

### Pitfall 3: Test Mocks Reference Deleted Components
**What goes wrong:** Tests fail because they mock deleted components
**Why it happens:** Unit test mocks not updated
**How to avoid:** Update test mocks that reference deleted components
**Warning signs:** Test failures after cleanup
**Files affected:** `tests/unit/pages/DashboardPage.test.jsx` mocks OnboardingWizard, OnboardingBanner, WelcomeModal

### Pitfall 4: E2E Helper References
**What goes wrong:** E2E helpers reference obsolete storage keys
**Why it happens:** `tests/e2e/helpers.js` sets `bizscreen_welcome_modal_shown` directly
**How to avoid:** Update E2E helpers to use unified onboarding patterns
**Warning signs:** E2E tests pass but with obsolete setup code

### Pitfall 5: Incomplete Feature Flag Removal
**What goes wrong:** Feature flag checks left in code after cleanup
**Why it happens:** Only removing components, not the flag infrastructure
**How to avoid:** Search for `useUnifiedOnboarding` and remove obsolete checks
**Warning signs:** Unused feature flag code

## Code Examples

### Deleting Component from Index.js

```javascript
// BEFORE: src/components/onboarding/index.js
export { OnboardingBanner } from './OnboardingBanner';
export { UnifiedOnboardingController } from './UnifiedOnboardingController';

// AFTER: src/components/onboarding/index.js
// OnboardingBanner export removed
export { UnifiedOnboardingController } from './UnifiedOnboardingController';
```

### DashboardPage State Cleanup

```jsx
// REMOVE these state variables from DashboardPage.jsx:
const [showWelcomeModal, setShowWelcomeModal] = useState(false);
const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
const [welcomeStep, setWelcomeStep] = useState('choice');
const [selectedBusinessType, setSelectedBusinessType] = useState(null);
const [applyingPack, setApplyingPack] = useState(false);
const [packResult, setPackResult] = useState(null);
const [packError, setPackError] = useState(null);

// REMOVE these Phase 23 specific state:
const [showWelcomeTour, setShowWelcomeTour] = useState(false);
const [showIndustryModal, setShowIndustryModal] = useState(false);
const [showStarterPackModal, setShowStarterPackModal] = useState(false);
const [selectedIndustry, setSelectedIndustry] = useState(null);
const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

// KEEP unified onboarding state:
const [showUnifiedOnboarding, setShowUnifiedOnboarding] = useState(false);
```

### DashboardPage Import Cleanup

```jsx
// REMOVE these imports:
import OnboardingWizard from '../components/OnboardingWizard';
import { WelcomeModal } from './dashboard/WelcomeModal';
import { OnboardingBanner, isBannerDismissed } from '../components/onboarding/OnboardingBanner';
import { WelcomeTour } from '../components/onboarding/WelcomeTour';
import { IndustrySelectionModal } from '../components/onboarding/IndustrySelectionModal';
import { StarterPackOnboarding } from '../components/onboarding/StarterPackOnboarding';

// REMOVE unused icons:
import { Sparkles } from 'lucide-react';  // If no longer used

// KEEP unified imports:
import { UnifiedOnboardingController } from '../components/onboarding/UnifiedOnboardingController';
import { config } from '../config/env';
```

### Unit Test Mock Updates

```jsx
// BEFORE: tests/unit/pages/DashboardPage.test.jsx
vi.mock('../../../src/components/OnboardingWizard', () => ({
  default: () => null,
}));

vi.mock('../../../src/components/onboarding/OnboardingBanner', () => ({
  OnboardingBanner: () => null,
  isBannerDismissed: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../src/pages/dashboard/WelcomeModal', () => ({
  WelcomeModal: () => null,
}));

// AFTER: Remove these mocks entirely (components deleted)
// The mocks for deleted components should be removed
```

### E2E Helper Update

```javascript
// BEFORE: tests/e2e/helpers.js
await page.evaluate(() => {
  localStorage.setItem('bizscreen_welcome_modal_shown', 'true');
});

// AFTER: No longer needed (unified onboarding handles this)
// Remove or update to use unified onboarding state
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple onboarding modals | UnifiedOnboardingController | Phase 31 | Single orchestrator |
| localStorage welcome key | Database onboarding_progress | Phase 30 | Server-side state |
| sessionStorage banner key | onboarding_progress.skipped_at | Phase 30 | Persistent tracking |
| Feature flag guards | Always-on unified | Phase 34 | Simpler code |

**Deprecated/outdated:**
- `bizscreen_welcome_modal_shown` localStorage key: Replaced by database `onboarding_progress.is_complete`
- `onboarding_banner_dismissed` sessionStorage key: Replaced by database `onboarding_progress.skipped_at`
- OnboardingWizard component: Never properly wired, broken
- OnboardingBanner component: Replaced by `ScreenPairingReminderCard` (Phase 32)
- WelcomeModal component: Replaced by `UnifiedOnboardingController` (Phase 31)

## Storage Key Audit

Complete audit of onboarding-related storage keys in codebase:

| Key | Type | Location | Action |
|-----|------|----------|--------|
| `bizscreen_welcome_modal_shown` | localStorage | DashboardPage.jsx | DELETE |
| `onboarding_banner_dismissed` | sessionStorage | OnboardingBanner.jsx | DELETE (with component) |
| `bizscreen_pairing_reminder_dismissed` | localStorage | ScreenPairingReminderCard.jsx | KEEP (Phase 32 feature) |

**Audit findings:** Only two onboarding-related storage keys need removal. The `bizscreen_pairing_reminder_dismissed` key is used by the new ScreenPairingReminderCard and should be kept.

## DashboardPage State Variable Audit

Current state variables in DashboardPage.jsx related to onboarding:

| Variable | Related To | Action |
|----------|-----------|--------|
| `isFirstRun` | WelcomeModal logic | REVIEW (may still be used for stats display) |
| `creatingDemo` | WelcomeModal demo creation | DELETE |
| `demoResult` | WelcomeModal demo result | DELETE |
| `showWelcomeModal` | WelcomeModal | DELETE |
| `showOnboardingWizard` | OnboardingWizard | DELETE |
| `onboardingNeeded` | Legacy onboarding check | DELETE |
| `welcomeStep` | WelcomeModal step | DELETE |
| `selectedBusinessType` | WelcomeModal business type | DELETE |
| `applyingPack` | WelcomeModal pack creation | DELETE |
| `packResult` | WelcomeModal pack result | DELETE |
| `packError` | WelcomeModal pack error | DELETE |
| `showWelcomeTour` | Phase 23 WelcomeTour | DELETE |
| `showIndustryModal` | Phase 23 IndustryModal | DELETE |
| `showStarterPackModal` | Phase 23 StarterPack | DELETE |
| `selectedIndustry` | Phase 23 industry | DELETE |
| `showOnboardingBanner` | OnboardingBanner | DELETE |
| `showUnifiedOnboarding` | UnifiedOnboardingController | KEEP |

**Total reduction:** 16 state variables to delete, 1 to keep (plus core dashboard state).

## Open Questions

1. **WelcomeHero and WelcomeFeatureCards**
   - What we know: These are imported from `../components/welcome` and shown when `isFirstRun && !demoResult`
   - What's unclear: Are they part of the unified flow or legacy code?
   - Recommendation: Research if they're still used in unified flow or should also be deleted

2. **DashboardPage `isFirstRun` state**
   - What we know: Used for stats display hint and WelcomeHero display
   - What's unclear: Is this still needed after unified onboarding cleanup?
   - Recommendation: Keep `isFirstRun` for stats empty state hint, remove WelcomeHero dependency

3. **Feature Flag Retention**
   - What we know: `VITE_USE_UNIFIED_ONBOARDING` controls feature
   - What's unclear: Should the flag be removed or kept for gradual rollout?
   - Recommendation: Keep flag infrastructure but default to `true`

## Sources

### Primary (HIGH confidence)
- Codebase analysis: OnboardingWizard.jsx, OnboardingBanner.jsx, WelcomeModal.jsx
- Codebase analysis: DashboardPage.jsx state and imports
- Codebase analysis: tests/unit/pages/DashboardPage.test.jsx mocks
- Codebase analysis: tests/e2e/helpers.js storage key usage
- Codebase analysis: src/config/env.js feature flag definition

### Secondary (MEDIUM confidence)
- [JSDoc @deprecated tag](https://jsdoc.app/tags-deprecated) - Official JSDoc documentation
- [How to properly deprecate](https://dev.to/dgreene1/how-to-properly-deprecate-3027) - Best practices
- [Approaches to Deprecating Code in JavaScript](https://css-tricks.com/approaches-to-deprecating-code-in-javascript/) - CSS-Tricks patterns
- [Techniques for Removing React Unused Components](https://www.dhiwise.com/post/techniques-for-identifying-and-eliminating-react-unused-components) - React cleanup patterns
- [8 tips to reduce unused JavaScript](https://blog.logrocket.com/8-tips-reduce-unused-javascript/) - LogRocket best practices

### Tertiary (LOW confidence)
- N/A - All research verified against codebase

## Metadata

**Confidence breakdown:**
- Component identification: HIGH - Direct codebase inspection
- Storage key audit: HIGH - grep verified all occurrences
- State variable audit: HIGH - Complete DashboardPage analysis
- Cleanup patterns: HIGH - Based on established React practices

**Research date:** 2026-01-31
**Valid until:** N/A - This is project-specific cleanup guidance

## Recommendations for Claude's Discretion Items

Based on research, here are recommendations for the discretion areas:

### WelcomeModal: Delete vs Deprecate
**Recommendation: DELETE**
- It's fully guarded by the same feature flag as OnboardingWizard
- The unified flow completely replaces its functionality
- Keeping deprecated code adds maintenance burden with no value
- No external consumers (internal component only)

### DashboardPage Cleanup Scope: Onboarding-only vs Broader
**Recommendation: ONBOARDING-ONLY**
- Focus scope on onboarding-related state variables (16 identified)
- Keep core dashboard state (stats, screens, loading, etc.)
- Broader cleanup could introduce unrelated bugs
- Can do broader simplification in a separate phase

### Commit Granularity: Atomic vs Per-file
**Recommendation: ATOMIC (3-4 commits)**
1. Pre-cleanup: Run E2E baseline, document results
2. Component deletion: Delete files, update index.js exports
3. DashboardPage cleanup: Remove imports, state, handlers, JSX
4. Test updates: Update unit test mocks, E2E helpers

### Active Storage Cleanup: Remove vs Stop Writing
**Recommendation: REMOVE**
- Both keys (`bizscreen_welcome_modal_shown`, `onboarding_banner_dismissed`) are only used by deleted components
- No need to keep reads or writes
- Clean break is cleaner than gradual deprecation
- E2E helpers should be updated to not set these keys

### Feature Flag Test States: ON only vs Both
**Recommendation: ON ONLY**
- After this phase, unified onboarding is the only path
- Testing both states adds maintenance burden
- The "off" state code will be deleted
- Future: Consider removing the flag entirely
