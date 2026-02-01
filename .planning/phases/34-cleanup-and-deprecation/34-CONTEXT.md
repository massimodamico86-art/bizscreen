# Phase 34: Cleanup and Deprecation - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove dead onboarding code after unified flow (Phases 30-33) is validated. This includes deleting broken components, removing obsolete storage keys, and simplifying DashboardPage state management.

</domain>

<decisions>
## Implementation Decisions

### Verification Approach
- Run full E2E suite BEFORE starting cleanup to establish baseline
- All E2E tests must pass after cleanup - no exceptions
- If any test fails after cleanup, fix immediately before considering done

### Storage Key Removal
- Delete `bizscreen_welcome_modal_shown` localStorage key (identified in Phase 30-02)
- Delete `onboarding_banner_dismissed` sessionStorage key entirely
- Delete OnboardingBanner.jsx component (unified flow replaces it)
- Perform full audit for any other onboarding-related storage keys

### Component Deletion
- Delete OnboardingWizard.jsx entirely (confirmed broken, never properly wired)
- Delete OnboardingBanner.jsx (unified flow replaces banner dismissal logic)
- WelcomeModal.jsx handling at Claude's discretion (deprecate vs delete)

### DashboardPage Cleanup
- E2E tests must pass after state variable cleanup
- Scope of cleanup (onboarding-only vs broader) at Claude's discretion
- Commit strategy (atomic vs split) at Claude's discretion

### Claude's Discretion
- Deprecation style for WelcomeModal (if kept): JSDoc vs console warning
- Whether to preserve WelcomeModal or delete along with OnboardingWizard
- DashboardPage cleanup scope (onboarding-only vs broader simplification)
- Commit granularity (one cleanup commit vs per-file commits)
- Active storage cleanup vs just stop writing new values
- Feature flag test states (ON only vs both states)

</decisions>

<specifics>
## Specific Ideas

- User emphasized: "Tests must pass" - no shipping broken state
- Baseline E2E run before any deletions - establishes known-good state
- Full storage audit, not just the two identified keys

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 34-cleanup-and-deprecation*
*Context gathered: 2026-01-31*
