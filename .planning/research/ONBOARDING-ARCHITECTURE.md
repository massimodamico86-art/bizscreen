# Architecture: Unified Onboarding Flow

**Project:** BizScreen Onboarding Polish
**Researched:** 2026-01-28
**Confidence:** HIGH (based on direct codebase analysis)

## Executive Summary

BizScreen currently has **5+ overlapping onboarding flows** that confuse users:

| Flow | Purpose | When Shown | Status |
|------|---------|------------|--------|
| `WelcomeModal` | Quick demo vs starter pack choice | First run (localStorage) | Working, used |
| `OnboardingWizard` | 6-step guided setup | Needs onboarding flag | Broken, unused |
| `WelcomeTour` | 6-step feature tour | Tour not completed | Working, Phase 23 |
| `IndustrySelectionModal` | Business type selection | After tour | Working, Phase 23 |
| `StarterPackOnboarding` | Template pack selection | After industry | Working, Phase 23 |
| `AutoBuildOnboardingModal` | Full-screen AI build | Not wired up | Working, unused |

**The problem:** DashboardPage.jsx orchestrates all flows with complex conditional logic but they don't form a coherent journey. Users may see WelcomeModal, then WelcomeTour, then IndustrySelectionModal in disconnected sessions.

**The solution:** Create a single `UnifiedOnboardingController` that manages state machine progression through a curated flow, deprecating redundant components.

---

## Current Architecture Analysis

### Component Inventory

```
src/
  pages/
    dashboard/
      WelcomeModal.jsx          # 3-step modal (choice -> businessType -> creating)
      OnboardingCards.jsx       # Demo result display
      DashboardPage.jsx         # Orchestrates all flows (complex)

  components/
    OnboardingWizard.jsx        # 6-step wizard (standalone, navigates to pages)
    onboarding/
      WelcomeTour.jsx           # 6-step feature tour
      WelcomeTourStep.jsx       # Tour step display
      IndustrySelectionModal.jsx # Business type selection grid
      StarterPackOnboarding.jsx  # Pack selection with templates
      OnboardingBanner.jsx       # Resume banner for incomplete onboarding
      AutoBuildOnboardingModal.jsx # Full-screen AI-powered build
      index.js                   # Exports
```

### Service Layer

```
src/services/
  onboardingService.js    # Progress tracking (6 wizard steps + tour + industry)
  demoContentService.js   # Creates demo workspace (media, playlist, layout, screen)
  autoBuildService.js     # AI scene builder (uses templateService)
  templateService.js      # Starter pack application
  sceneService.js         # Scene creation (used by autoBuild)
```

### Database Schema

```sql
-- onboarding_progress table (single source of truth)
owner_id UUID PRIMARY KEY
-- Original wizard steps (6)
completed_welcome BOOLEAN
completed_logo BOOLEAN
completed_first_screen BOOLEAN
completed_first_playlist BOOLEAN
completed_first_media BOOLEAN
completed_screen_pairing BOOLEAN
is_complete BOOLEAN
skipped_at TIMESTAMPTZ
-- Welcome tour (Phase 23 - migration 136)
completed_welcome_tour BOOLEAN
current_tour_step INTEGER
tour_skipped_at TIMESTAMPTZ
-- Industry & pack (Phase 23 - migration 137)
selected_industry TEXT
starter_pack_applied BOOLEAN
starter_pack_applied_at TIMESTAMPTZ
```

### Current Data Flow Problems

1. **Multiple localStorage keys:**
   - `bizscreen_welcome_modal_shown` - tracks WelcomeModal
   - `onboarding_banner_dismissed` (sessionStorage) - tracks banner
   - `lastDemoOtp` - stores demo OTP

2. **Conflicting progress checks:**
   - `checkIsFirstRun()` - checks for ANY content (screens, playlists, media)
   - `needsOnboarding()` - checks onboarding_progress.is_complete/skipped
   - `shouldShowWelcomeTour()` - checks tour_completed + tour_skipped + onboarding_skipped

3. **No unified state machine:**
   - DashboardPage has 12+ boolean state variables for modals
   - No clear flow from one step to next
   - Users can skip steps and see incomplete states

---

## Recommended Architecture

### Decision: Wrap, Don't Replace

**Keep:** WelcomeModal, WelcomeTour, IndustrySelectionModal, StarterPackOnboarding
**Deprecate:** OnboardingWizard (broken, redundant)
**Add:** UnifiedOnboardingController (new orchestrator)

**Rationale:** The existing Phase 23 components work well individually. The problem is orchestration, not the components themselves.

### New Component: UnifiedOnboardingController

```
src/components/onboarding/
  UnifiedOnboardingController.jsx  # NEW: State machine orchestrator
  WelcomeTour.jsx                  # Keep (steps 1-6: feature intro)
  IndustrySelectionModal.jsx       # Keep (step 7: business type)
  StarterPackOnboarding.jsx        # Keep (step 8: pack selection)
  OnboardingBanner.jsx             # Keep (resume incomplete)
  ScreenPairingStep.jsx            # NEW: Step 9 - pair first screen
  SuccessStep.jsx                  # NEW: Step 10 - celebration + CTA
```

### State Machine Design

```
                                    [New User Signup]
                                           |
                                           v
                            +---------------------------+
                            |   SHOW_WELCOME_TOUR       |  Steps 1-6
                            |   (feature introduction)  |
                            +---------------------------+
                                    | complete | skip
                                    v          v
                            +---------------------------+
                            |   SHOW_INDUSTRY_SELECT    |  Step 7
                            |   (business type)         |
                            +---------------------------+
                                    | select | skip
                                    v        v
                            +---------------------------+
                            |   SHOW_STARTER_PACK       |  Step 8
                            |   (template selection)    |
                            +---------------------------+
                                    | apply | skip
                                    v       v
                            +---------------------------+
                            |   SHOW_SCREEN_PAIRING     |  Step 9
                            |   (connect first TV)      |
                            +---------------------------+
                                    | paired | skip
                                    v        v
                            +---------------------------+
                            |   SHOW_SUCCESS            |  Step 10
                            |   (celebration + CTAs)    |
                            +---------------------------+
                                           |
                                           v
                                    [ONBOARDING_COMPLETE]
                                           |
                                           v
                                    [Dashboard View]
```

### State Persistence Strategy

**Single source of truth:** `onboarding_progress` table

```sql
-- Extended schema (new columns needed)
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS
  onboarding_version INTEGER DEFAULT 2,           -- Track schema version
  current_unified_step TEXT DEFAULT 'welcome_tour', -- Unified step tracker
  screen_pairing_completed_at TIMESTAMPTZ;        -- New step tracking
```

**Remove redundant localStorage:**
- Delete `bizscreen_welcome_modal_shown` checks
- Rely solely on database state

### Component Responsibilities

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `UnifiedOnboardingController` | Reads progress, decides which modal to show, handles transitions | onboardingService |
| `WelcomeTour` | 6-step feature tour display | onboardingService (tour progress) |
| `IndustrySelectionModal` | Business type grid, saves selection | onboardingService |
| `StarterPackOnboarding` | Pack browsing, template application | templateService, onboardingService |
| `ScreenPairingStep` | Screen creation + OTP display | screenService, onboardingService |
| `SuccessStep` | Celebration, next action CTAs | onboardingService (mark complete) |
| `OnboardingBanner` | Resume prompt on dashboard | onboardingService |

### Service Layer Changes

```javascript
// onboardingService.js - additions needed

// Get unified onboarding state
export async function getUnifiedOnboardingState() {
  // Returns: { currentStep, canResume, progress }
}

// Advance to next step
export async function advanceOnboardingStep(completedStep) {
  // Updates DB, returns next step
}

// Mark entire onboarding complete
export async function completeUnifiedOnboarding() {
  // Sets is_complete, completed_at
}
```

---

## Component Diagram

```
+---------------------------------------------------------------------+
|                        DashboardPage.jsx                            |
|  +----------------------------------------------------------------+ |
|  |              UnifiedOnboardingController                       | |
|  |  +----------------------------------------------------------+  | |
|  |  | State Machine:                                           |  | |
|  |  |  currentStep = 'welcome_tour' | 'industry' | 'pack' | ...|  | |
|  |  |  isLoading, error                                        |  | |
|  |  +----------------------------------------------------------+  | |
|  |                         renders one of:                        | |
|  |  +-------------+ +-------------+ +-----------------+          | |
|  |  |WelcomeTour  | |IndustryModal| |StarterPackModal |          | |
|  |  +-------------+ +-------------+ +-----------------+          | |
|  |  +-----------------+ +-------------+                          | |
|  |  |ScreenPairingStep| |SuccessStep  |                          | |
|  |  +-----------------+ +-------------+                          | |
|  +----------------------------------------------------------------+ |
|                                                                     |
|  +--------------------+  +--------------------+                    |
|  | OnboardingBanner   |  | Dashboard Content  |                    |
|  | (resume prompt)    |  | (stats, screens)   |                    |
|  +--------------------+  +--------------------+                    |
+---------------------------------------------------------------------+
                              |
                              | calls
                              v
+---------------------------------------------------------------------+
|                     Services Layer                                   |
|  +----------------+  +-----------------+  +-------------------+    |
|  |onboardingService|  |templateService  |  |demoContentService |    |
|  |- getProgress    |  |- applyPack      |  |- createDemo       |    |
|  |- updateStep     |  |- fetchPacks     |  |                   |    |
|  |- setIndustry    |  +-----------------+  +-------------------+    |
|  +----------------+                                                 |
+---------------------------------------------------------------------+
                              |
                              | RPCs
                              v
+---------------------------------------------------------------------+
|                     Supabase / PostgreSQL                            |
|  +----------------------------------------------------------------+ |
|  |                  onboarding_progress                           | |
|  |  owner_id | completed_welcome_tour | selected_industry | ...   | |
|  +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

---

## Data Flow: Unified Onboarding

### Initialization Flow

```
1. DashboardPage mounts
2. Call getUnifiedOnboardingState()
3. Returns { currentStep: 'welcome_tour', canResume: false }
4. Render UnifiedOnboardingController with currentStep
5. Controller renders WelcomeTour modal
```

### Progression Flow

```
1. User completes WelcomeTour step 6
2. WelcomeTour calls onComplete()
3. Controller calls advanceOnboardingStep('welcome_tour')
4. DB updates: completed_welcome_tour=true, current_unified_step='industry'
5. Controller re-renders with IndustrySelectionModal
```

### Skip Flow

```
1. User clicks "Skip for now" on IndustrySelectionModal
2. Controller calls advanceOnboardingStep('industry', { skipped: true })
3. DB updates: current_unified_step='starter_pack', industry_skipped=true
4. Controller renders StarterPackOnboarding (no industry filter)
```

### Resume Flow

```
1. User closed browser mid-onboarding
2. Returns to dashboard later
3. getUnifiedOnboardingState() returns { currentStep: 'starter_pack', canResume: true }
4. Controller renders from saved step, not from beginning
```

---

## Build Order (Minimizes Risk)

### Phase 1: Foundation (No Breaking Changes)

1. **Add database columns** (migration)
   - `onboarding_version`, `current_unified_step`, `screen_pairing_completed_at`
   - Backward compatible, defaults preserve existing behavior

2. **Create UnifiedOnboardingController** (new file)
   - Imports existing components
   - Does not replace DashboardPage orchestration yet
   - Can be tested in isolation

3. **Add service functions** (extend onboardingService.js)
   - `getUnifiedOnboardingState()`
   - `advanceOnboardingStep()`
   - Coexists with existing functions

### Phase 2: New Steps (Additive)

4. **Create ScreenPairingStep** (new file)
   - Uses existing screenService
   - Shows OTP code
   - Polls for pairing confirmation

5. **Create SuccessStep** (new file)
   - Celebration animation
   - CTAs: "Go to Dashboard", "Add More Screens", "Browse Templates"

### Phase 3: Integration (Controlled Switch)

6. **Wire UnifiedOnboardingController into DashboardPage**
   - Feature flag: `USE_UNIFIED_ONBOARDING`
   - If flag on, use controller; else, use existing logic
   - Allows gradual rollout

7. **Remove old orchestration code from DashboardPage**
   - Delete boolean state variables: `showWelcomeModal`, `showWelcomeTour`, etc.
   - Delete old handlers: `handleTourComplete`, `handleIndustrySelect`, etc.

### Phase 4: Cleanup (After Validation)

8. **Deprecate WelcomeModal** (mark for removal)
   - Its functionality is now in UnifiedOnboardingController
   - Keep code but stop rendering

9. **Deprecate OnboardingWizard** (delete)
   - Confirmed broken, never properly wired
   - Safe to remove entirely

10. **Remove localStorage checks**
    - `bizscreen_welcome_modal_shown`
    - Rely on database state only

---

## Component Keep/Modify/Deprecate Matrix

| Component | Decision | Rationale |
|-----------|----------|-----------|
| WelcomeModal.jsx | **DEPRECATE** | Replaced by unified flow; its quick-demo vs starter-pack choice is now handled differently |
| OnboardingWizard.jsx | **DELETE** | Broken, unused, redundant with new flow |
| WelcomeTour.jsx | **KEEP** | Works well, becomes step 1-6 of unified flow |
| WelcomeTourStep.jsx | **KEEP** | Supports WelcomeTour |
| IndustrySelectionModal.jsx | **KEEP** | Works well, becomes step 7 |
| StarterPackOnboarding.jsx | **KEEP** | Works well, becomes step 8 |
| AutoBuildOnboardingModal.jsx | **KEEP (future)** | Good for power users, wire later as alternative flow |
| OnboardingBanner.jsx | **KEEP** | Useful for resume prompts |
| UnifiedOnboardingController.jsx | **CREATE** | New orchestrator |
| ScreenPairingStep.jsx | **CREATE** | New step 9 |
| SuccessStep.jsx | **CREATE** | New step 10 |

---

## Integration Points

### Existing Services to Use

```javascript
// demoContentService.js
import { createDemoWorkspace } from '../services/demoContentService';
// Used by: ScreenPairingStep (creates demo screen if user wants one)

// screenService.js
import { createScreen, checkScreenPaired } from '../services/screenService';
// Used by: ScreenPairingStep (creates screen, polls for pairing)

// templateService.js
import { applyPack, getPackTemplates } from '../services/templateService';
// Used by: StarterPackOnboarding (already integrated)

// onboardingService.js
import {
  updateOnboardingStep,
  setSelectedIndustry,
  markStarterPackApplied,
  updateWelcomeTourStep,
} from '../services/onboardingService';
// Used by: UnifiedOnboardingController (all step tracking)
```

### Props Interface for UnifiedOnboardingController

```typescript
interface UnifiedOnboardingControllerProps {
  // Called when onboarding completes (mark dashboard as ready)
  onComplete: () => void;

  // Navigation callback for success CTAs
  setCurrentPage: (page: string) => void;

  // Toast notifications
  showToast: (message: string, type?: 'success' | 'error') => void;
}
```

---

## Testing Strategy

### Unit Tests

- UnifiedOnboardingController: state transitions for each step
- Service functions: getUnifiedOnboardingState, advanceOnboardingStep

### Integration Tests

- Full flow: tour -> industry -> pack -> pairing -> success
- Skip flow: tour skip -> industry skip -> pack skip -> dashboard
- Resume flow: close mid-flow -> reopen -> continue from saved step

### Manual QA

- Fresh user signup: verify no duplicate modals
- Existing user with partial progress: verify correct step shown
- User who skipped everything: verify dashboard accessible

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing users mid-onboarding | Medium | High | Feature flag, migrate state |
| State machine bugs causing stuck users | Medium | High | "Skip to dashboard" escape hatch always available |
| Database migration issues | Low | Medium | Backward compatible columns with defaults |
| Component prop changes breaking tests | Low | Low | Preserve existing component APIs |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Current architecture understanding | HIGH | Direct code analysis, all files read |
| Recommended architecture | HIGH | Builds on existing working components |
| Build order | HIGH | Phase-gated, feature-flagged approach |
| Service integration | HIGH | Existing services well-documented |
| Database schema | HIGH | Migrations reviewed, backward compatible |

---

## Summary

**Keep what works:**
- WelcomeTour, IndustrySelectionModal, StarterPackOnboarding
- onboardingService.js, templateService.js, demoContentService.js
- onboarding_progress table schema

**Fix what's broken:**
- Create UnifiedOnboardingController to replace ad-hoc orchestration
- Add ScreenPairingStep and SuccessStep for complete flow
- Remove OnboardingWizard (dead code)
- Deprecate WelcomeModal (functionality merged)

**Build order:**
1. Database migration (additive)
2. UnifiedOnboardingController (new file)
3. Service extensions (non-breaking)
4. New step components (additive)
5. Integration with feature flag
6. Old code cleanup (after validation)

This approach preserves all working code while creating a coherent single flow that guides users from signup to their first paired screen.
