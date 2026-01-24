# Phase 12: Content Approval - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Content goes through review before appearing on screens. Content creators submit playlists and scenes for approval; approvers review, approve, or reject with feedback; rejected content cannot be published; approval and rejection trigger email notifications.

</domain>

<decisions>
## Implementation Decisions

### Submission flow
- Role-based approval: only certain user roles (e.g., contributors) need approval; admins/owners can publish directly
- Both playlists and scenes can be submitted for approval
- Saving content automatically submits it for approval — no separate "submit" action needed

### Review experience
- Dashboard widget shows pending approvals (not a separate page)
- Click opens the scene/playlist editor in read-only mode for preview
- Approvers access queue from their main dashboard

### Feedback & revision
- Rejection requires written feedback — creator always knows why
- Approval feedback is optional
- Feedback visible both via email notification and in-app when opening the content

### Publishing control
- Auto-publish: approved content immediately becomes available for screens/schedules
- Editing approved content triggers re-approval (sent back for review)

### Claude's Discretion
- Whether creators can see who will review their submission
- Batch approve/reject actions (one at a time vs multi-select)
- Queue sorting/filtering defaults (FIFO, newest first, by creator)
- Revision workflow: edit same content or create new version after rejection
- Resubmission limits (unlimited or capped)
- Withdrawal rules (when can creator unpublish/withdraw)
- Approval history visibility (full audit trail vs current status only)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-content-approval*
*Context gathered: 2026-01-24*
