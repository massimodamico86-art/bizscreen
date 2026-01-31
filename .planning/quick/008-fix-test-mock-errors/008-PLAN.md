---
phase: quick
plan: 008
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/unit/pages/DashboardPage.test.jsx
autonomous: true

must_haves:
  truths:
    - "npm test runs without vi.mock errors"
    - "All 2079 tests still pass"
  artifacts:
    - path: "tests/unit/pages/DashboardPage.test.jsx"
      provides: "Complete onboardingService mock"
      contains: "getUnifiedOnboardingState"
  key_links:
    - from: "tests/unit/pages/DashboardPage.test.jsx"
      to: "src/services/onboardingService.js"
      via: "vi.mock with all exported functions"
      pattern: "vi\\.mock.*onboardingService"
---

<objective>
Fix the 17 Vitest mock setup errors in the test suite caused by incomplete onboardingService mock.

Purpose: DashboardPage.jsx dynamically imports `getUnifiedOnboardingState` from onboardingService (line 205), but the test mock doesn't include this function. Vitest strict mode requires all accessed exports to be defined in the mock.

Output: Test suite runs cleanly with 0 mock errors.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@tests/unit/pages/DashboardPage.test.jsx
@src/services/onboardingService.js
@src/pages/DashboardPage.jsx (lines 203-214 - dynamic import of getUnifiedOnboardingState)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add missing getUnifiedOnboardingState to onboardingService mock</name>
  <files>tests/unit/pages/DashboardPage.test.jsx</files>
  <action>
Update the vi.mock for onboardingService (around line 45-51) to include the missing function:

```javascript
// Mock onboarding service
vi.mock('../../../src/services/onboardingService', () => ({
  checkIsFirstRun: vi.fn().mockResolvedValue({ isFirstRun: false }),
  needsOnboarding: vi.fn().mockResolvedValue(false),
  shouldShowWelcomeTour: vi.fn().mockResolvedValue(false),
  getWelcomeTourProgress: vi.fn().mockResolvedValue({ completedWelcomeTour: false, starterPackApplied: false }),
  getSelectedIndustry: vi.fn().mockResolvedValue(null),
  // Add missing unified onboarding functions (Phase 30-31)
  getUnifiedOnboardingState: vi.fn().mockResolvedValue({
    currentStep: 'complete',
    canResume: false,
    progressPercent: 100,
    isComplete: true,
    skippedAt: null
  }),
}));
```

The mock returns `isComplete: true` to prevent the unified onboarding controller from opening during tests, matching the existing behavior of mocking welcome tour as complete.
  </action>
  <verify>npm test -- --run 2>&1 | grep -E "(Error|PASS|FAIL|passed|failed|errors)"</verify>
  <done>Test suite shows "73 passed" and "0 errors" (previously "17 errors")</done>
</task>

</tasks>

<verification>
```bash
# Run test suite - should show 0 errors
npm test -- --run

# Specifically verify DashboardPage tests pass
npm test -- --run tests/unit/pages/DashboardPage.test.jsx
```
</verification>

<success_criteria>
- Test suite completes with 0 vi.mock errors
- All 2079 tests still pass
- DashboardPage.test.jsx tests pass without "getUnifiedOnboardingState" error
</success_criteria>

<output>
After completion, create `.planning/quick/008-fix-test-mock-errors/008-SUMMARY.md`
</output>
