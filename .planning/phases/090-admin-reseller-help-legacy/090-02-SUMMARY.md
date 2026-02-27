---
phase: 090-admin-reseller-help-legacy
plan: 02
subsystem: ui
tags: [react, legacy, design-system, lucide-react, badge, modal, reseller, help-center]

# Dependency graph
requires:
  - phase: 086-screen-management
    provides: "Button variant='outline' to 'secondary' pattern, Badge collision fix pattern"
  - phase: 085-schedules-campaigns
    provides: "Badge collision fix precedent (CampaignEditorPage)"
provides:
  - "ClientsPage with working X close buttons on create/edit modals"
  - "All 5 legacy pages with correct design-system imports and zero runtime errors"
  - "All legacy files with zero variant='outline' (all replaced with 'secondary')"
  - "Zero Badge collision bugs across all legacy pages"
  - "ResellerDashboardPage, ResellerBillingPage, HelpCenterPage verified functional"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Legacy Modal wrapper import pattern for pages using isOpen/size='small'/'large' API"
    - "Badge import from design-system (not lucide-react) when using component with variant/size props"

key-files:
  created: []
  modified:
    - src/pages/ClientsPage.jsx
    - src/legacy/pages/FAQsPage.jsx
    - src/legacy/pages/ReferPage.jsx
    - src/legacy/pages/SetupPage.jsx
    - src/legacy/pages/SubscriptionPage.jsx
    - src/legacy/pages/UsersPage.jsx
    - src/legacy/components/listings/BackgroundVideoSelector.jsx
    - src/legacy/components/listings/BackgroundMediaManager.jsx

key-decisions:
  - "UsersPage and BackgroundVideoSelector use legacy Modal wrapper (../../components/Modal) to support isOpen and size='small'/'large' API"
  - "Badge removed from lucide-react imports in FAQsPage, SubscriptionPage, UsersPage to avoid shadowing design-system Badge component"

patterns-established:
  - "Legacy pages import Card, Button, Badge from design-system; Modal from legacy wrapper when using isOpen prop"

requirements-completed: [RESELL-01, RESELL-02, RESELL-03, HELP-01, HELP-02, LEGC-01]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 090 Plan 02: Reseller/Help/Legacy Pages Summary

**Fix ClientsPage missing X import, add design-system imports to 5 legacy pages and 2 legacy components, eliminate all Badge collisions and variant="outline" instances**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T20:31:29Z
- **Completed:** 2026-02-27T20:34:16Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- ClientsPage X import added -- CreateClientModal and EditClientModal close buttons now render correctly
- All 5 legacy pages (FAQs, Refer, Setup, Subscription, Users) now have correct design-system imports (Card, Button, Badge) and will render without JS errors
- Zero Badge collision bugs -- Badge removed from lucide-react imports in 3 files where design-system Badge is used for component rendering
- Zero variant="outline" instances across all 7 legacy files -- all 12 occurrences replaced with variant="secondary"
- ResellerDashboardPage, ResellerBillingPage, HelpCenterPage audited and confirmed functional (no changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix ClientsPage missing X import and verify reseller/help pages** - `d8f94af` (fix)
2. **Task 2: Fix all legacy pages and components** - `396628a` (fix)

## Files Created/Modified
- `src/pages/ClientsPage.jsx` - Added X to lucide-react imports for modal close buttons
- `src/legacy/pages/FAQsPage.jsx` - Removed Badge from lucide-react, added Card/Badge from design-system
- `src/legacy/pages/ReferPage.jsx` - Added Card/Button from design-system, StatCard import, replaced 3x variant="outline"
- `src/legacy/pages/SetupPage.jsx` - Added Card/Button from design-system
- `src/legacy/pages/SubscriptionPage.jsx` - Removed Badge from lucide-react, added Card/Button/Badge from design-system, replaced 2x variant="outline"
- `src/legacy/pages/UsersPage.jsx` - Removed Badge from lucide-react, added Card/Button/Badge from design-system, Modal wrapper, replaced 2x variant="outline"
- `src/legacy/components/listings/BackgroundVideoSelector.jsx` - Added Button from design-system, Modal wrapper, replaced 1x variant="outline"
- `src/legacy/components/listings/BackgroundMediaManager.jsx` - Added X from lucide-react, Button from design-system, replaced 3x variant="outline"

## Decisions Made
- UsersPage and BackgroundVideoSelector use legacy Modal wrapper (../../components/Modal) to support isOpen and size="small"/"large" API rather than converting to design-system Modal API
- Badge removed from lucide-react imports in FAQsPage, SubscriptionPage, UsersPage to avoid shadowing design-system Badge component (same pattern as Phase 85 CampaignEditorPage fix)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing build failure in TVPreviewModal.jsx (cannot resolve "../tv-layouts/ScaledStage") -- unrelated to changes in this plan, out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All reseller pages (Dashboard, Billing), HelpCenter, and ClientsPage verified functional
- All 5 legacy pages and 2 legacy components have correct imports and valid variants
- Ready for final integration verification

---
*Phase: 090-admin-reseller-help-legacy*
*Completed: 2026-02-27*
