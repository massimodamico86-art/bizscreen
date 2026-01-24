---
phase: 12-content-approval
plan: 02
subsystem: email
tags: [resend, email, notifications, approval-workflow]

# Dependency graph
requires:
  - phase: 05-critical-fixes
    provides: emailService with Resend SDK integration
provides:
  - sendApprovalRequestEmail function for notifying approvers
  - sendApprovalDecisionEmail function for notifying content creators
  - buildApprovalEmailHtml template for approval emails
affects: [12-content-approval, approval-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Approval email templates with badge customization
    - Decision-based email content (approved vs rejected)

key-files:
  created: []
  modified:
    - src/services/emailService.js

key-decisions:
  - "Use same buildApprovalEmailHtml for both request and decision emails with badge customization"
  - "Include white-space: pre-line for message text to preserve feedback newlines"
  - "Green badge (#dcfce7) for approved, orange badge (#fef3c7) for rejected"

patterns-established:
  - "Badge customization pattern: { text, bgColor, textColor }"
  - "Decision-based email content: isApproved conditional for title, subject, message, action text"

# Metrics
duration: 3min
completed: 2026-01-24
---

# Phase 12 Plan 02: Approval Email Notifications Summary

**Resend-based approval emails: request notifications to approvers with review link, decision notifications to creators with feedback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-24T10:00:00Z
- **Completed:** 2026-01-24T10:03:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- sendApprovalRequestEmail notifies approvers when content submitted for review
- sendApprovalDecisionEmail notifies creator of approval or rejection with feedback
- Both functions gracefully handle missing VITE_RESEND_API_KEY
- Reusable buildApprovalEmailHtml template with badge customization

## Task Commits

All tasks committed atomically in single commit (same file):

1. **Task 1: Add approval request email function** - `e391764`
2. **Task 2: Add approval decision email function** - `e391764`
3. **Task 3: Add approval email HTML builder** - `e391764`

## Files Created/Modified

- `src/services/emailService.js` - Added sendApprovalRequestEmail, sendApprovalDecisionEmail, and buildApprovalEmailHtml (+186 lines)

## Decisions Made

- **Single HTML builder:** Created buildApprovalEmailHtml shared between both email functions with badge customization for different states
- **Badge colors:** Green (#dcfce7) for approved status, orange (#fef3c7) for revision needed
- **Pre-line whitespace:** Added white-space: pre-line to message paragraph to preserve feedback line breaks
- **Consistent from address:** Both functions use "BizScreen <noreply@bizscreen.com>" (not alerts@ or privacy@)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - uses existing VITE_RESEND_API_KEY from Phase 05 email setup.

## Next Phase Readiness

- Approval email functions ready for integration with approval workflow API
- Next plan (12-03) can wire these emails to content_approval_requests table triggers
- Both functions export correctly for import in other services

---
*Phase: 12-content-approval*
*Completed: 2026-01-24*
