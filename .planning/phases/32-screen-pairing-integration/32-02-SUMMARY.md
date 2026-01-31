---
phase: 32-screen-pairing-integration
plan: 02
subsystem: ui
tags: [react, dashboard, onboarding, reminder-card]

# Dependency graph
requires:
  - phase: 32-01
    provides: ScreenPairingStep with QR/OTP pairing and screen_pairing_completed_at tracking
provides:
  - ScreenPairingReminderCard component for dashboard
  - Dashboard integration for users who skipped screen pairing
  - localStorage-based dismissal with 7-day auto-reset
affects: [34-cleanup, dashboard-widgets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Self-determining visibility in dashboard cards via supabase queries
    - localStorage dismissal with timestamp-based reset

key-files:
  created:
    - src/components/dashboard/ScreenPairingReminderCard.jsx
  modified:
    - src/components/dashboard/index.js
    - src/pages/DashboardPage.jsx

key-decisions:
  - "Card queries onboarding_progress.screen_pairing_completed_at directly (not via service)"
  - "7-day auto-reset for localStorage dismissal (re-prompts inactive users)"
  - "Only shows when unified onboarding feature flag is enabled"
  - "Teal gradient styling distinguishes from OnboardingBanner (blue)"

patterns-established:
  - "Dashboard reminder cards self-determine visibility via async useEffect"
  - "localStorage dismiss patterns use timestamp for auto-reset capability"

# Metrics
duration: 3min
completed: 2026-01-31
---

# Phase 32 Plan 02: Dashboard Reminder Card Summary

**ScreenPairingReminderCard with self-determining visibility, localStorage dismissal, and screens navigation CTA**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-31T22:50:14Z
- **Completed:** 2026-01-31T22:52:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created ScreenPairingReminderCard component with teal gradient styling
- Self-determining visibility based on onboarding state and paired devices
- Queries `onboarding_progress.screen_pairing_completed_at` and `tv_devices.is_paired`
- localStorage dismissal with 7-day auto-reset capability
- Integrated into DashboardPage under unified onboarding feature flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ScreenPairingReminderCard component** - `9a77e91` (feat)
2. **Task 2: Integrate ScreenPairingReminderCard into DashboardPage** - `570c4d2` (feat)

## Files Created/Modified

- `src/components/dashboard/ScreenPairingReminderCard.jsx` - Dashboard reminder card for users who skipped screen pairing (213 lines)
- `src/components/dashboard/index.js` - Added export for ScreenPairingReminderCard
- `src/pages/DashboardPage.jsx` - Import and render ScreenPairingReminderCard

## Decisions Made

- **Direct database query:** Card queries `onboarding_progress` and `tv_devices` tables directly rather than using service functions, for isolated responsibility and simpler component lifecycle
- **7-day auto-reset:** localStorage dismissal stores timestamp and resets after 7 days, re-prompting users who may have forgotten about pairing
- **Feature flag gated:** Only renders when `config().useUnifiedOnboarding` is true, avoiding conflicts with legacy onboarding flows
- **Teal styling:** Uses teal gradient (distinct from blue OnboardingBanner) to visually differentiate screen pairing reminder

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 32 complete: Screen pairing fully integrated into unified onboarding flow
- Dashboard reminder card prompts users who skipped pairing to return and complete
- Ready for Phase 33 (Success UX) or Phase 34 (Cleanup)

---
*Phase: 32-screen-pairing-integration*
*Completed: 2026-01-31*
