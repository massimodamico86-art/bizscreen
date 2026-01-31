---
phase: quick-006
plan: 01
subsystem: onboarding
tags: [feature-flag, unified-onboarding, DashboardPage]
dependency-graph:
  requires: [Phase 31 unified onboarding controller]
  provides: [Clean onboarding layer separation]
  affects: [None]
tech-stack:
  added: []
  patterns: [Feature flag guards for progressive rollout]
file-tracking:
  key-files:
    created: []
    modified: [src/pages/DashboardPage.jsx]
decisions: []
metrics:
  duration: ~5 minutes
  completed: 2026-01-31
---

# Quick Task 006: Fix 3-Layer Onboarding Overlap

Fixed the onboarding overlap issue where multiple onboarding UI layers rendered simultaneously when VITE_USE_UNIFIED_ONBOARDING=true.

## One-Liner

Added feature flag guards to WelcomeHero, WelcomeFeatureCards, and Continue Setup card so only UnifiedOnboardingController renders when flag is enabled.

## Problem

When `VITE_USE_UNIFIED_ONBOARDING=true`, three onboarding layers could render simultaneously:
1. UnifiedOnboardingController (new, intended)
2. WelcomeHero + WelcomeFeatureCards (old, first-run UI)
3. Continue Setup card (old, resume UI)

This caused visual overlap and confusing UX.

## Solution

Added `!config().useUnifiedOnboarding &&` guards to:
1. WelcomeHero and WelcomeFeatureCards block (line 475)
2. Continue Setup card (line 490)
3. Updated unified onboarding trigger condition from `state.canResume && !state.isComplete` to `!state.isComplete && !state.skippedAt`

## Changes Made

### src/pages/DashboardPage.jsx

**Task 1: Guard WelcomeHero and WelcomeFeatureCards**
```jsx
// Before
{isFirstRun && !demoResult && (
  <>
    <WelcomeHero ... />
    <WelcomeFeatureCards ... />
  </>
)}

// After
{!config().useUnifiedOnboarding && isFirstRun && !demoResult && (
  <>
    <WelcomeHero ... />
    <WelcomeFeatureCards ... />
  </>
)}
```

**Task 2: Fix unified onboarding trigger logic**
```jsx
// Before
if (state.canResume && !state.isComplete) {
  setShowUnifiedOnboarding(true);
}

// After
if (!state.isComplete && !state.skippedAt) {
  setShowUnifiedOnboarding(true);
}
```

This now shows unified onboarding for:
- New users (not complete, not skipped)
- Returning users (not complete, not skipped)
- Does NOT show if completed or explicitly skipped

**Task 3: Guard Continue Setup card**
```jsx
// Before
{onboardingNeeded && !isFirstRun && !demoResult && (
  <Card>...Continue Your Setup...</Card>
)}

// After
{!config().useUnifiedOnboarding && onboardingNeeded && !isFirstRun && !demoResult && (
  <Card>...Continue Your Setup...</Card>
)}
```

## Verification

All old onboarding elements now have feature flag guards:
- Line 389: WelcomeModal
- Line 407: OnboardingWizard
- Line 420: WelcomeTour
- Line 429: IndustrySelectionModal
- Line 441: StarterPackOnboarding
- Line 467: OnboardingBanner
- Line 475: WelcomeHero/WelcomeFeatureCards (NEW)
- Line 490: Continue Setup card (NEW)

## Commits

| Hash | Message |
|------|---------|
| b853823 | fix(006): add unified onboarding guards to WelcomeHero and Continue Setup |

## Deviations from Plan

None - plan executed exactly as written.

## Testing

- ESLint passes with no errors
- All feature flag guards verified via grep
- With VITE_USE_UNIFIED_ONBOARDING=true, only UnifiedOnboardingController should render
