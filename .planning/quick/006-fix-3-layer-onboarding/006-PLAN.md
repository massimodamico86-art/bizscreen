---
phase: quick-006
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/DashboardPage.jsx
autonomous: true

must_haves:
  truths:
    - "When VITE_USE_UNIFIED_ONBOARDING=true, only UnifiedOnboardingController renders onboarding UI"
    - "Old onboarding elements (WelcomeHero, WelcomeFeatureCards, WelcomeModal, etc.) are suppressed"
    - "Unified onboarding shows for first-run users when feature flag is enabled"
  artifacts:
    - path: "src/pages/DashboardPage.jsx"
      provides: "Unified onboarding integration with proper guards"
  key_links:
    - from: "src/pages/DashboardPage.jsx"
      to: "config().useUnifiedOnboarding"
      via: "conditional rendering guards"
---

<objective>
Fix the 3-layer onboarding overlap issue where multiple onboarding components render simultaneously when VITE_USE_UNIFIED_ONBOARDING=true.

Purpose: Ensure clean onboarding experience with unified controller taking full precedence.
Output: DashboardPage.jsx with complete feature flag guards on all old onboarding elements.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/DashboardPage.jsx
@src/config/env.js
@src/components/onboarding/UnifiedOnboardingController.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add unified onboarding guards to WelcomeHero and WelcomeFeatureCards</name>
  <files>src/pages/DashboardPage.jsx</files>
  <action>
Add the `!config().useUnifiedOnboarding &&` guard to the WelcomeHero and WelcomeFeatureCards rendering block (around lines 474-486).

Current code:
```jsx
{isFirstRun && !demoResult && (
  <>
    <WelcomeHero ... />
    <WelcomeFeatureCards ... />
  </>
)}
```

Change to:
```jsx
{!config().useUnifiedOnboarding && isFirstRun && !demoResult && (
  <>
    <WelcomeHero ... />
    <WelcomeFeatureCards ... />
  </>
)}
```

This ensures the old welcome UI only shows when unified onboarding is disabled.
  </action>
  <verify>
Grep for "WelcomeHero" in DashboardPage.jsx and confirm the guard is present:
`grep -A2 "WelcomeHero" src/pages/DashboardPage.jsx`
  </verify>
  <done>WelcomeHero and WelcomeFeatureCards only render when useUnifiedOnboarding is false</done>
</task>

<task type="auto">
  <name>Task 2: Fix unified onboarding trigger logic for first-run users</name>
  <files>src/pages/DashboardPage.jsx</files>
  <action>
The current logic (lines 203-213) only shows unified onboarding when `canResume && !isComplete`. For a brand new user, we should show unified onboarding when `isFirstRun` OR when `canResume && !isComplete`.

Update the useEffect for unified onboarding (around line 203):

Current:
```jsx
useEffect(() => {
  if (config().useUnifiedOnboarding && !loading) {
    import('../services/onboardingService').then(({ getUnifiedOnboardingState }) => {
      getUnifiedOnboardingState().then(state => {
        if (state.canResume && !state.isComplete) {
          setShowUnifiedOnboarding(true);
        }
      });
    });
  }
}, [loading]);
```

Change to:
```jsx
useEffect(() => {
  if (config().useUnifiedOnboarding && !loading) {
    import('../services/onboardingService').then(({ getUnifiedOnboardingState }) => {
      getUnifiedOnboardingState().then(state => {
        // Show unified onboarding if not complete (covers both first-run and resume cases)
        if (!state.isComplete && !state.skippedAt) {
          setShowUnifiedOnboarding(true);
        }
      });
    });
  }
}, [loading]);
```

The condition `!state.isComplete && !state.skippedAt` means:
- Show for new users (not complete, not skipped)
- Show for resuming users (not complete, not skipped)
- Don't show if they completed or explicitly skipped
  </action>
  <verify>
Grep for the updated condition:
`grep -A10 "useUnifiedOnboarding && !loading" src/pages/DashboardPage.jsx`
Confirm it uses `!state.isComplete && !state.skippedAt`.
  </verify>
  <done>Unified onboarding shows for all users who haven't completed or skipped it</done>
</task>

<task type="auto">
  <name>Task 3: Add guard to "Continue Setup" card</name>
  <files>src/pages/DashboardPage.jsx</files>
  <action>
The "Continue Setup" card (lines 489-508) also relates to old onboarding. Add the guard:

Current (around line 489):
```jsx
{onboardingNeeded && !isFirstRun && !demoResult && (
  <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
    ...Continue Your Setup...
  </Card>
)}
```

Change to:
```jsx
{!config().useUnifiedOnboarding && onboardingNeeded && !isFirstRun && !demoResult && (
  <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
    ...Continue Your Setup...
  </Card>
)}
```
  </action>
  <verify>
Grep for "Continue Your Setup" or "Continue Setup" to confirm guard:
`grep -B3 "Continue Your Setup" src/pages/DashboardPage.jsx`
  </verify>
  <done>"Continue Setup" card only renders when unified onboarding is disabled</done>
</task>

</tasks>

<verification>
1. All old onboarding elements have `!config().useUnifiedOnboarding &&` guard
2. Unified onboarding shows for both first-run and returning users
3. No syntax errors: `npm run lint src/pages/DashboardPage.jsx` passes
4. Manual test: With VITE_USE_UNIFIED_ONBOARDING=true, only UnifiedOnboardingController shows
</verification>

<success_criteria>
- WelcomeHero, WelcomeFeatureCards, and "Continue Setup" card have feature flag guards
- Unified onboarding trigger logic covers first-run users
- Only one onboarding layer visible when unified flag is enabled
- Existing guards on WelcomeModal, OnboardingWizard, WelcomeTour, etc. remain intact
</success_criteria>

<output>
After completion, create `.planning/quick/006-fix-3-layer-onboarding/006-SUMMARY.md`
</output>
