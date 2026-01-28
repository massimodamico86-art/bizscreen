---
phase: 23
plan: 02
subsystem: onboarding
tags: [onboarding, industry-selection, starter-packs, settings, dashboard]

dependency-graph:
  requires:
    - 23-01 (WelcomeTour component and tour tracking schema)
    - 18-03 (StarterPackCard component and get_starter_packs RPC)
  provides:
    - Industry selection modal for business type filtering
    - Starter pack selection during onboarding flow
    - Onboarding banner for incomplete setups
    - Settings page onboarding tab with restart capability
  affects:
    - Template marketplace (industry-filtered suggestions)
    - Dashboard (onboarding flow orchestration)

tech-stack:
  added: []
  patterns:
    - Session-based banner dismissal (sessionStorage)
    - RPC-based state management for onboarding progress
    - Barrel exports for onboarding components

file-tracking:
  key-files:
    created:
      - supabase/migrations/137_industry_selection.sql
      - src/components/onboarding/IndustrySelectionModal.jsx
      - src/components/onboarding/StarterPackOnboarding.jsx
      - src/components/onboarding/OnboardingBanner.jsx
    modified:
      - src/components/onboarding/index.js
      - src/pages/DashboardPage.jsx
      - src/pages/SettingsPage.jsx
      - src/services/onboardingService.js

decisions:
  - id: 23-02-1
    decision: "12 industry options in grid (restaurant, retail, salon, fitness, healthcare, hotel, education, corporate, realestate, auto, coffee, other)"
    context: "Need comprehensive coverage of business types for template filtering"
  - id: 23-02-2
    decision: "Session-based banner dismissal via sessionStorage"
    context: "Banner should show once per session but not persist across sessions"
  - id: 23-02-3
    decision: "Skip industry still shows starter pack modal"
    context: "Users should still get starter pack option even if they skip industry selection"
  - id: 23-02-4
    decision: "Sequential template installation during pack apply (not parallel)"
    context: "Consistent with 18-03 decision for simplicity and predictable ordering"

metrics:
  duration: 5min
  completed: 2026-01-27
---

# Phase 23 Plan 02: Industry Selection & Starter Pack Flow Summary

Industry selection modal with 12 business types filtering template suggestions, starter pack selection during onboarding, dismissible banner for incomplete setups, and Settings tab for restart/change.

## What Was Built

### 1. Database Schema (Migration 137)
- `selected_industry` and `industry_selected_at` columns on onboarding_progress
- `starter_pack_applied` and `starter_pack_applied_at` columns
- `set_selected_industry` RPC for saving business type
- `get_selected_industry` RPC for retrieval
- `mark_starter_pack_applied` RPC for tracking completion
- `reset_welcome_tour` RPC for Settings restart

### 2. IndustrySelectionModal Component
- 12 industry options in responsive 3x2 grid (desktop) / 2-col (mobile)
- Visual cards with colored icon backgrounds per industry type
- Selection state with ring highlight and checkmark overlay
- Skip link allows bypassing without selection
- Saves via setSelectedIndustry service call

### 3. StarterPackOnboarding Component
- Fetches packs via fetchStarterPacks (from marketplaceService)
- Optional industry filtering (shows all if no matches)
- Reuses existing StarterPackCard for pack display
- Sequential template installation via installTemplateAsScene
- Success state with confirmation message before close
- Marks starter pack as applied via markStarterPackApplied

### 4. OnboardingBanner Component
- Dismissible banner shown when onboarding incomplete
- Session-based dismissal using sessionStorage
- X dismiss button and "Complete Setup" CTA
- Export helpers: isBannerDismissed, dismissBanner

### 5. DashboardPage Integration
- Checks shouldShowWelcomeTour on mount
- Flow: WelcomeTour > IndustrySelectionModal > StarterPackOnboarding
- Shows OnboardingBanner when tour complete but pack not applied
- Resume from banner via handleResumeOnboarding
- Industry skip still shows starter pack modal

### 6. SettingsPage Onboarding Tab
- New "Onboarding" tab with Sparkles icon
- Current industry display with Change button
- Welcome tour status with Restart Tour button
- Starter pack status with Browse Templates button
- Industry change opens IndustrySelectionModal
- Restart tour navigates to dashboard to trigger fresh tour

### 7. onboardingService Extensions
- setSelectedIndustry(industry) - saves business type
- getSelectedIndustry() - retrieves selection
- markStarterPackApplied() - tracks pack completion
- resetWelcomeTour() - allows Settings restart
- getWelcomeTourProgress extended with starterPackApplied field

## Verification Results

1. Industry selection shows 12 options in responsive grid
2. Selecting industry saves to database via RPC
3. Starter pack modal shows packs (filtered by industry when available)
4. Applying pack marks onboarding as complete
5. Skipping shows banner on next dashboard visit
6. Banner dismisses for session only (sessionStorage)
7. Settings page shows Onboarding tab
8. Can change industry from Settings
9. Can restart tour from Settings
10. Full flow: Tour > Industry > Pack works end-to-end

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| a947ef9 | feat(23-02): add industry selection schema |
| 00d8f54 | feat(23-02): create IndustrySelectionModal component |
| 8d948c1 | feat(23-02): create StarterPackOnboarding component |
| 8b0fba5 | feat(23-02): create OnboardingBanner component |
| dce61f2 | feat(23-02): integrate onboarding flow into DashboardPage |
| 7a526cb | feat(23-02): add onboarding settings tab to SettingsPage |
| 3a33300 | feat(23-02): extend onboardingService with industry and reset functions |

## Next Phase Readiness

Phase 23 is now complete. All onboarding flows are implemented:
- Welcome tour (23-01)
- Industry selection and starter pack flow (23-02)

The platform polish phases (22-23) are complete. Users now have:
- Mobile-responsive dashboard with touch-friendly navigation
- Health banners, quick actions, and visual activity timeline
- Complete onboarding flow with tour, industry selection, and starter packs
- Ability to restart onboarding or change industry from Settings

---
*Generated: 2026-01-27*
