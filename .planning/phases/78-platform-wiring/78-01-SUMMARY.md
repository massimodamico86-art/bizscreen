---
phase: 78-platform-wiring
plan: 01
subsystem: payments
tags: [stripe, billing, react, customer-portal]

# Dependency graph
requires:
  - phase: 12-billing
    provides: billingService.js with openBillingPortal and /api/billing/portal endpoint
provides:
  - openPaymentMethodUpdate function in billingService.js
  - Dedicated Update Payment Method button in AccountPlanPage billing card
affects: [billing, account-plan]

# Tech tracking
tech-stack:
  added: []
  patterns: [Stripe flow_data for portal deep-linking]

key-files:
  created: []
  modified:
    - src/services/billingService.js
    - src/pages/AccountPlanPage.jsx

key-decisions:
  - "Use Stripe Customer Portal flow_data with payment_method_update type for direct payment method update"
  - "Primary button for Update Payment Method, secondary for Manage Billing"

patterns-established:
  - "Stripe portal flow_data pattern for deep-linking to specific portal flows"

requirements-completed: [FEAT-06]

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 78 Plan 01: Payment Method Update Summary

**Stripe portal deep-link for payment method update via flow_data, with dedicated CreditCard button in billing card**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T02:30:24Z
- **Completed:** 2026-02-23T02:32:30Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added `openPaymentMethodUpdate()` to billingService.js that POSTs to /api/billing/portal with flow_data for payment_method_update
- Added dedicated "Update Payment Method" button with CreditCard icon in AccountPlanPage billing card
- Wired `handleUpdatePaymentMethod` handler with `updatingPayment` loading state and error toast
- Reorganized billing card layout: two buttons (primary Update Payment Method, secondary Manage Billing) below description text

## Task Commits

Each task was committed atomically:

1. **Task 1: Add openPaymentMethodUpdate to billingService and wire Update Payment Method button in AccountPlanPage** - `1513aef` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/services/billingService.js` - Added openPaymentMethodUpdate() function with flow_data for payment_method_update
- `src/pages/AccountPlanPage.jsx` - Added Update Payment Method button, handleUpdatePaymentMethod handler, updatingPayment loading state

## Decisions Made
- Used Stripe Customer Portal flow_data with type 'payment_method_update' for direct deep-link to payment method update screen
- Made Update Payment Method the primary (default variant) button and Manage Billing the secondary button
- Updated billing card description from action-specific text to general "Manage your payment method and subscription details."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused Icon import**
- **Found during:** Task 1
- **Issue:** Pre-existing unused `Icon` import from lucide-react was causing ESLint failure
- **Fix:** Removed the unused import
- **Files modified:** src/pages/AccountPlanPage.jsx
- **Verification:** ESLint passes with no errors
- **Committed in:** 1513aef (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor cleanup of pre-existing unused import to pass ESLint. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Payment method update flow complete and ready for use
- Backend /api/billing/portal endpoint should pass through flow_data if provided (falls back to general portal if not)

## Self-Check: PASSED

- FOUND: src/services/billingService.js
- FOUND: src/pages/AccountPlanPage.jsx
- FOUND: commit 1513aef

---
*Phase: 78-platform-wiring*
*Completed: 2026-02-22*
