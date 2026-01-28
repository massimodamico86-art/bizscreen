# Phase 23: Platform Polish - Onboarding - Research

**Researched:** 2026-01-27
**Domain:** New User Onboarding (welcome tour, starter packs, industry suggestions)
**Confidence:** HIGH

## Summary

Phase 23 adds a guided onboarding experience for new users with three core components: a modal-based welcome tour, industry-based starter pack selection, and persistent skip/resume functionality. The codebase has extensive existing infrastructure:

- **OnboardingWizard** (`src/components/OnboardingWizard.jsx`) - 532 lines of existing step-by-step wizard with progress tracking
- **onboardingService.js** - Complete service with RPC functions (`get_onboarding_progress`, `update_onboarding_step`, `skip_onboarding`)
- **onboarding_progress table** - Full database schema with per-step boolean flags and skip tracking
- **WelcomeModal** with industry selection - Already has business type grid (restaurant, salon, gym, retail, other)
- **StarterPackCard/StarterPacksRow** - Existing components for pack display and selection
- **starter_packs table** - Junction table with `get_starter_packs()` RPC returning embedded templates

The existing `OnboardingWizard` is a step-by-step task wizard (upload logo, create playlist, etc.) which is different from Phase 23's feature tour. Phase 23 needs a NEW welcome tour component that explains key features in 5-6 steps before routing to starter pack selection.

**Primary recommendation:** Build a new `WelcomeTour` modal component (distinct from existing OnboardingWizard) using the design system's Modal with framer-motion step transitions. Extend `onboarding_progress` table with `completed_welcome_tour` and `selected_industry` columns. Leverage existing StarterPackCard for pack selection during onboarding.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | UI framework | Already in use |
| framer-motion | 12.23.24 | Step transitions, AnimatePresence | Already in use, has all needed presets |
| lucide-react | 0.548.0 | Icons for tour steps | Project standard |
| Supabase JS | 2.80.0 | Backend API for progress tracking | Already in use |

### Supporting (Already Exists)
| Library/Component | Purpose | When to Use |
|-------------------|---------|-------------|
| Modal (design-system) | Tour container with accessibility | Full-screen modal for tour |
| motion.js | Animation presets (fadeIn, slideUp) | Step transitions |
| StarterPackCard | Pack display with template grid | Starter pack selection step |
| onboardingService.js | Progress tracking | Extend for tour/industry |
| BUSINESS_TYPES (WelcomeModal) | Industry options | Industry selection grid |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom modal wizard | React Joyride/Shepherd.js | CONTEXT specifies modal wizard, not tooltip-based tour |
| New Modal component | Extend OnboardingWizard | CONTEXT specifies separate feature tour, not task wizard |
| localStorage | Supabase table | Need server-side state for resume feature |

**No additional packages needed** - all functionality can be built with existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── onboarding/
│       ├── WelcomeTour.jsx           # NEW - 5-6 step feature tour modal
│       ├── WelcomeTourStep.jsx       # NEW - Individual step with illustration
│       ├── IndustrySelectionStep.jsx # NEW - Grid of industry cards
│       ├── StarterPackStep.jsx       # NEW - Pack selection with preview
│       ├── AutoBuildOnboardingModal.jsx  # EXISTING - keep as-is
│       └── index.js                  # UPDATE exports
├── services/
│   └── onboardingService.js          # EXTEND with tour/industry functions
├── pages/
│   ├── SettingsPage.jsx              # ADD onboarding tab to restart tour
│   └── DashboardPage.jsx             # TRIGGER tour on first visit
└── supabase/
    └── migrations/
        └── XXX_welcome_tour_onboarding.sql  # NEW - tour columns
```

### Pattern 1: Modal Wizard with Step Navigation
**What:** Full-screen modal with step indicator, content area, and navigation buttons
**When to use:** Per CONTEXT - modal wizard format with Next/Back buttons
**Example:**
```javascript
// Based on existing Modal component and motion.js patterns
import { Modal } from '../../design-system';
import { motion, AnimatePresence } from 'framer-motion';

function WelcomeTour({ open, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const steps = [
    { id: 'welcome', title: 'Welcome to BizScreen', component: WelcomeStep },
    { id: 'media', title: 'Media Library', component: MediaStep },
    { id: 'scenes', title: 'Scene Designer', component: ScenesStep },
    { id: 'schedules', title: 'Smart Scheduling', component: SchedulesStep },
    { id: 'templates', title: 'Template Marketplace', component: TemplatesStep },
    { id: 'getStarted', title: 'Get Started', component: GetStartedStep },
  ];

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" showCloseButton={false}>
      {/* Progress indicator */}
      <div className="flex justify-center gap-2 py-4">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentStep ? 'bg-blue-600' : idx < currentStep ? 'bg-blue-300' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step content with slide animation */}
      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {React.createElement(steps[currentStep].component)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between p-6 border-t">
        <button onClick={goBack} disabled={currentStep === 0}>Back</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm text-gray-500">Skip for now</button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={goNext}>Next</Button>
          ) : (
            <Button onClick={() => onComplete()}>Get Started with Starter Pack</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

### Pattern 2: Industry Selection Grid
**What:** Grid of cards with icons, one-click selection per CONTEXT
**When to use:** Per CONTEXT - 10-12 industries, grid of cards, visual cards with icons
**Example:**
```javascript
// Extend existing BUSINESS_TYPES from WelcomeModal.jsx
const INDUSTRIES = [
  { id: 'restaurant', label: 'Restaurant / Cafe', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'retail', label: 'Retail / Store', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  { id: 'salon', label: 'Salon / Spa', icon: Scissors, color: 'bg-pink-100 text-pink-600' },
  { id: 'fitness', label: 'Gym / Fitness', icon: Dumbbell, color: 'bg-purple-100 text-purple-600' },
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'hotel', label: 'Hotel / Hospitality', icon: Building2, color: 'bg-amber-100 text-amber-600' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'bg-green-100 text-green-600' },
  { id: 'corporate', label: 'Corporate Office', icon: Briefcase, color: 'bg-slate-100 text-slate-600' },
  { id: 'realestate', label: 'Real Estate', icon: Home, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'auto', label: 'Auto / Dealership', icon: Car, color: 'bg-red-100 text-red-600' },
  { id: 'coffee', label: 'Coffee Shop', icon: Coffee, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'other', label: 'Other Business', icon: Building, color: 'bg-gray-100 text-gray-600' },
];

function IndustrySelectionStep({ onSelect, selectedIndustry }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-center mb-2">What type of business do you run?</h2>
      <p className="text-gray-600 text-center mb-6">
        We'll suggest templates tailored to your industry
      </p>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {INDUSTRIES.map((industry) => {
          const Icon = industry.icon;
          const isSelected = selectedIndustry === industry.id;

          return (
            <button
              key={industry.id}
              onClick={() => onSelect(industry.id)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2 ${industry.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900 text-sm">{industry.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### Pattern 3: Starter Pack Selection with Preview
**What:** Packs shown with thumbnails, "Preview" expands to show templates
**When to use:** Per CONTEXT - one pack only during onboarding, immediate apply
**Example:**
```javascript
// Adapt existing StarterPackCard for onboarding context
function StarterPackStep({ packs, selectedIndustry, onApply }) {
  const [expandedPackId, setExpandedPackId] = useState(null);

  // Filter packs by selected industry
  const relevantPacks = packs.filter(p =>
    p.industry === selectedIndustry || !p.industry
  );

  const handleApplyPack = async (pack) => {
    // Per CONTEXT: one pack only, immediate apply
    await applyStarterPackForOnboarding(pack.id);
    onApply(pack);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-center mb-2">Choose a Starter Pack</h2>
      <p className="text-gray-600 text-center mb-6">
        Get pre-made templates for your {selectedIndustry} business
      </p>

      <div className="space-y-4">
        {relevantPacks.map((pack) => (
          <div key={pack.id} className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              {pack.thumbnail_url ? (
                <img src={pack.thumbnail_url} className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{pack.name}</h3>
                <p className="text-sm text-gray-500">{pack.template_count} templates</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedPackId(expandedPackId === pack.id ? null : pack.id)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {expandedPackId === pack.id ? 'Hide' : 'Preview'}
                </button>
                <Button size="sm" onClick={() => handleApplyPack(pack)}>
                  Use This Pack
                </Button>
              </div>
            </div>

            {/* Preview expansion */}
            <AnimatePresence>
              {expandedPackId === pack.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {pack.templates.map((template) => (
                      <div key={template.id} className="bg-white rounded border">
                        <img src={template.thumbnail_url} className="aspect-video object-cover" />
                        <p className="text-xs p-2 truncate">{template.name}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 4: Skip/Resume with Dashboard Banner
**What:** Subtle skip link, resume prompt, dashboard banner for incomplete onboarding
**When to use:** Per CONTEXT - skip link, "Resume or start over?", banner shown once
**Example:**
```javascript
// In DashboardPage.jsx - add onboarding incomplete banner
function OnboardingIncompleteBanner({ onResume, onStartOver, onDismiss }) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
      <div className="p-4 flex items-center gap-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Complete Your Setup</h3>
          <p className="text-sm text-gray-600">Finish the welcome tour to get the most out of BizScreen.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onResume}>
            Resume Tour
          </Button>
          <button onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

// Resume handling with "Resume or start over?" prompt
function handleResumeOnboarding(progress) {
  if (progress.currentTourStep > 0 && progress.currentTourStep < TOUR_STEPS.length) {
    // User was partway through
    const shouldResume = confirm('Would you like to resume where you left off, or start over?');
    if (shouldResume) {
      setCurrentStep(progress.currentTourStep);
    } else {
      setCurrentStep(0);
    }
  }
  setShowWelcomeTour(true);
}
```

### Anti-Patterns to Avoid
- **Tooltip-based tour:** CONTEXT specifies modal wizard format
- **Video walkthrough:** CONTEXT specifies step-by-step with illustrations/screenshots
- **Multiple pack selection:** CONTEXT specifies one pack only during onboarding
- **Customization wizard in onboarding:** CONTEXT specifies immediate apply after selection
- **Prominent skip button:** CONTEXT specifies subtle skip link

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal with accessibility | Custom div overlay | design-system Modal | Focus trap, escape handling, body scroll lock |
| Step transitions | CSS transitions | framer-motion AnimatePresence | Handles unmount, direction-aware |
| Progress indicator | Custom dots | Existing pattern from OnboardingWizard | Already styled and accessible |
| Industry grid | Custom grid | Extend BUSINESS_TYPES from WelcomeModal | Already has icons/colors |
| Pack display | New card component | StarterPackCard | Already has expand/collapse, checkbox |
| Progress persistence | localStorage | onboarding_progress table + RPC | Needs cross-device sync, skip tracking |
| Skip tracking | Boolean flag | Existing skip_onboarding() RPC | Already handles complete state |

**Key insight:** The existing `onboarding_progress` table and RPCs handle most persistence needs. Just need to add columns for tour-specific state (`completed_welcome_tour`, `current_tour_step`, `selected_industry`).

## Common Pitfalls

### Pitfall 1: Conflicting with Existing OnboardingWizard
**What goes wrong:** New tour triggers alongside or conflicts with existing task-based wizard
**Why it happens:** Both use similar state patterns and service functions
**How to avoid:** Separate state: `showWelcomeTour` vs `showOnboardingWizard`, different progress columns
**Warning signs:** User sees two onboarding modals, or wizard triggers after tour

### Pitfall 2: Tour Not Showing on First Visit
**What goes wrong:** New users don't see the welcome tour
**Why it happens:** Race condition with data loading, or localStorage check before DB check
**How to avoid:** Check `completed_welcome_tour === false` from `get_onboarding_progress()`, not localStorage
**Warning signs:** Users report never seeing tour, analytics show low tour starts

### Pitfall 3: Industry Selection Not Persisting
**What goes wrong:** User selects industry, but template suggestions don't use it
**Why it happens:** Industry stored in onboarding state but not synced to profiles/scenes
**How to avoid:** Store `selected_industry` in both `onboarding_progress` and update it to `profiles` or use for filtering
**Warning signs:** Template suggestions are generic, not industry-specific

### Pitfall 4: Starter Pack Apply Fails Silently
**What goes wrong:** User selects pack, modal closes, but no templates appear
**Why it happens:** Async apply fails but onComplete fires anyway
**How to avoid:** Wait for `applyStarterPack()` to resolve before closing, show loading state
**Warning signs:** Users report empty workspace after onboarding

### Pitfall 5: Skip/Resume State Inconsistent
**What goes wrong:** User skips tour, but banner shows "incomplete", or resume doesn't work
**Why it happens:** `skipped_at` not checked alongside `completed_welcome_tour`
**How to avoid:** Check both: show banner only if `!completed_welcome_tour && !skipped_at`
**Warning signs:** Skip doesn't work, banner keeps appearing

### Pitfall 6: Mobile Tour Unusable
**What goes wrong:** Tour modal is too wide or step content overflows on mobile
**Why it happens:** Fixed widths, no responsive design
**How to avoid:** Use responsive grid (3-4 cols desktop, 2 cols mobile), Modal size="full" on mobile
**Warning signs:** Industry grid wraps awkwardly, buttons overlap

## Code Examples

Verified patterns from existing codebase:

### Extending onboarding_progress Table
```sql
-- Add tour-specific columns to existing onboarding_progress table
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS completed_welcome_tour BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_tour_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_industry TEXT,
  ADD COLUMN IF NOT EXISTS tour_skipped_at TIMESTAMPTZ;

-- RPC: Update welcome tour progress
CREATE OR REPLACE FUNCTION public.update_welcome_tour_progress(
  p_current_step INTEGER,
  p_selected_industry TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO public.onboarding_progress (owner_id, current_tour_step, selected_industry)
  VALUES (v_user_id, p_current_step, p_selected_industry)
  ON CONFLICT (owner_id) DO UPDATE SET
    current_tour_step = p_current_step,
    selected_industry = COALESCE(p_selected_industry, onboarding_progress.selected_industry),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Complete welcome tour
CREATE OR REPLACE FUNCTION public.complete_welcome_tour()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.onboarding_progress
  SET completed_welcome_tour = true, updated_at = NOW()
  WHERE owner_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
```

### Extending onboardingService.js
```javascript
// Add to src/services/onboardingService.js

/**
 * Get welcome tour progress
 * @returns {Promise<{currentStep: number, selectedIndustry: string|null, completed: boolean, skipped: boolean}>}
 */
export async function getWelcomeTourProgress() {
  const { data, error } = await supabase.rpc('get_onboarding_progress');

  if (error) {
    logger.error('Error fetching tour progress:', { error });
    return { currentStep: 0, selectedIndustry: null, completed: false, skipped: false };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    currentStep: row?.current_tour_step || 0,
    selectedIndustry: row?.selected_industry || null,
    completed: row?.completed_welcome_tour || false,
    skipped: !!row?.tour_skipped_at,
  };
}

/**
 * Update tour step progress
 */
export async function updateTourProgress(currentStep, selectedIndustry = null) {
  const { error } = await supabase.rpc('update_welcome_tour_progress', {
    p_current_step: currentStep,
    p_selected_industry: selectedIndustry,
  });

  if (error) {
    logger.error('Error updating tour progress:', { error });
    throw error;
  }
}

/**
 * Complete the welcome tour
 */
export async function completeWelcomeTour() {
  const { error } = await supabase.rpc('complete_welcome_tour');

  if (error) {
    logger.error('Error completing tour:', { error });
    throw error;
  }
}

/**
 * Skip the welcome tour
 */
export async function skipWelcomeTour() {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .update({ tour_skipped_at: new Date().toISOString() })
    .eq('owner_id', (await supabase.auth.getUser()).data.user.id);

  if (error) {
    logger.error('Error skipping tour:', { error });
    throw error;
  }
}
```

### Adding Onboarding Tab to Settings
```javascript
// Extend SettingsPage.jsx tabs array
const tabs = [
  { id: 'notifications', label: t('settings.tabs.notifications', 'Notifications'), icon: Bell },
  { id: 'display', label: t('settings.tabs.display', 'Display'), icon: Eye },
  { id: 'branding', label: t('settings.tabs.branding', 'Branding'), icon: Palette },
  { id: 'security', label: t('settings.tabs.security', 'Security'), icon: Lock },
  { id: 'privacy', label: t('settings.tabs.privacy', 'Privacy'), icon: Shield },
  { id: 'onboarding', label: t('settings.tabs.onboarding', 'Onboarding'), icon: Sparkles }, // NEW
  { id: 'activity', label: t('settings.tabs.activity', 'Activity Log'), icon: Activity }
];

// Onboarding tab content
{activeTab === 'onboarding' && (
  <Card className="p-6">
    <h2 className="text-lg font-semibold mb-4">{t('settings.onboarding.title', 'Onboarding')}</h2>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{t('settings.onboarding.restartTour', 'Welcome Tour')}</div>
          <div className="text-sm text-gray-600">
            {t('settings.onboarding.restartTourDesc', 'Replay the welcome tour to learn about key features')}
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowWelcomeTour(true)}>
          <Play size={16} />
          {t('settings.onboarding.startTour', 'Start Tour')}
        </Button>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <div className="font-medium">{t('settings.onboarding.industry', 'Industry')}</div>
          <div className="text-sm text-gray-600">
            {t('settings.onboarding.industryDesc', 'Change your industry for template suggestions')}
          </div>
        </div>
        <select
          value={settings.industry || ''}
          onChange={(e) => handleSaveSettings({ industry: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select industry...</option>
          {INDUSTRIES.map(ind => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
      </div>
    </div>
  </Card>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for tour state | Database `onboarding_progress` table | Phase 23 | Cross-device resume, analytics |
| Single "onboarding complete" flag | Separate tour/task completion | Phase 23 | More granular progress |
| 5 industries (WelcomeModal) | 10-12 industries (CONTEXT) | Phase 23 | Better template matching |
| Task wizard only | Feature tour + task wizard | Phase 23 | Two-stage onboarding |

**Deprecated/outdated:**
- `WELCOME_MODAL_KEY` localStorage flag: Will be replaced with database check
- Existing 5-industry grid in WelcomeModal: Will be replaced with expanded 10-12 industry grid

## Open Questions

Things that couldn't be fully resolved (Claude's Discretion per CONTEXT):

1. **Specific Feature Order in Tour**
   - What we know: 5-6 steps covering core features plus templates and media library
   - What's unclear: Exact order of steps
   - Recommendation: Welcome -> Media Library -> Scene Designer -> Schedules -> Templates -> Get Started

2. **Visual Design for Tour Steps**
   - What we know: Illustrations, screenshots, or icons
   - What's unclear: Specific visual assets
   - Recommendation: Use lucide icons + simple gradient backgrounds per step (matches existing design system)

3. **Tour Step Wording**
   - What we know: Should feel modern and quick, not overwhelming
   - What's unclear: Exact copy
   - Recommendation: Short headlines (3-5 words), 1-2 sentence descriptions

4. **Animation Between Steps**
   - What we know: Framer motion available, modal patterns exist
   - What's unclear: Specific transition style
   - Recommendation: Horizontal slide (consistent with mobile patterns), 300ms duration

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/components/OnboardingWizard.jsx` - Existing wizard pattern
- `/Users/massimodamico/bizscreen/src/services/onboardingService.js` - Progress tracking service
- `/Users/massimodamico/bizscreen/supabase/migrations/034_tenant_lifecycle_and_onboarding.sql` - Database schema
- `/Users/massimodamico/bizscreen/src/pages/dashboard/WelcomeModal.jsx` - Industry selection pattern
- `/Users/massimodamico/bizscreen/src/components/templates/StarterPackCard.jsx` - Pack display pattern
- `/Users/massimodamico/bizscreen/supabase/migrations/130_starter_packs.sql` - Starter packs schema
- `/Users/massimodamico/bizscreen/src/design-system/components/Modal.jsx` - Modal component
- `/Users/massimodamico/bizscreen/.planning/phases/23-platform-polish-onboarding/23-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/src/pages/SettingsPage.jsx` - Settings page structure
- `/Users/massimodamico/bizscreen/src/pages/DashboardPage.jsx` - Onboarding trigger patterns
- `/Users/massimodamico/bizscreen/src/design-system/motion.js` - Animation presets

### Tertiary (LOW confidence)
- [React Joyride](https://github.com/gilbarbara/react-joyride) - Not used (CONTEXT specifies modal wizard)
- [Onborda](https://github.com/uixmat/onborda) - Reference for framer-motion tour patterns
- [BuildUI Multistep Wizard](https://buildui.com/courses/framer-motion-recipes/multistep-wizard) - Animation pattern reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed, patterns verified from codebase
- Architecture: HIGH - Clear CONTEXT decisions, existing components to extend
- Pitfalls: HIGH - Based on existing code patterns and identified gaps

**Research date:** 2026-01-27
**Valid until:** 60 days (stable infrastructure, clear CONTEXT decisions)
