# Phase 12: Content Approval - Research

**Researched:** 2026-01-24
**Domain:** Content approval workflow, role-based publishing control
**Confidence:** HIGH

## Summary

Phase 12 implements a content approval workflow where certain user roles (editors, viewers) must submit content for review before it can appear on screens. The codebase already has substantial infrastructure for this feature, including database tables, approval service functions, and a review inbox page. This phase extends the existing system to:

1. Add scenes to approvable content types (playlists/layouts already supported)
2. Implement role-based auto-submit on save (editors need approval; owners/managers can publish directly)
3. Add a dashboard widget for pending approvals (replacing/complementing the separate page)
4. Wire email notifications to existing emailService patterns
5. Block publishing of unapproved content

**Primary recommendation:** Leverage the existing `approvalService.js`, `review_requests` table, and `ReviewInboxPage` as the foundation. Extend rather than rebuild.

## Standard Stack

The established libraries/tools for this domain are already in the codebase:

### Core (Already Implemented)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | ^2.80.0 | Database, RLS, real-time | Already powers all data access |
| Resend | ^6.8.0 | Transactional email | Already integrated in emailService |
| React | ^19.1.1 | UI components | Existing frontend framework |

### Supporting (Already Implemented)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| Lucide React | Icons | Status badges, action buttons |
| date-fns | ^4.1.0 | Date formatting | Timestamps in approval history |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom email templates | MJML/React Email | More complexity, existing HTML templates work |
| Separate approval DB | Existing review_requests | Already implemented, just needs extension |

**Installation:**
No new packages required - all dependencies are already present.

## Architecture Patterns

### Existing Project Structure (Relevant Files)
```
src/
├── services/
│   ├── approvalService.js       # Core approval logic (EXISTS)
│   ├── emailService.js          # Email sending patterns (EXISTS)
│   ├── permissionsService.js    # Role checking (EXISTS)
│   └── previewService.js        # Preview links (EXISTS)
├── pages/
│   ├── ReviewInboxPage.jsx      # Full page inbox (EXISTS)
│   ├── DashboardPage.jsx        # Main dashboard (EXISTS)
│   └── dashboard/
│       └── DashboardSections.jsx # Dashboard widgets (EXISTS)
└── hooks/
    └── usePlaylistEditor.js     # Approval integration pattern (EXISTS)

supabase/migrations/
├── 027_content_approvals_and_previews.sql  # Tables & functions (EXISTS)
└── 021_team_members_and_locations.sql      # Roles & permissions (EXISTS)
```

### Pattern 1: Role-Based Approval Decision
**What:** Determine if user needs approval based on organization_members.role
**When to use:** On content save, before publishing
**Example:**
```javascript
// Source: permissionsService.js pattern, extended for approval
export async function requiresApproval() {
  const role = await getCurrentMemberRole();
  // Owners and managers can publish directly
  // Editors and viewers require approval
  return !['owner', 'manager'].includes(role);
}
```

### Pattern 2: Auto-Submit on Save
**What:** Automatically create review_request when editor saves content
**When to use:** In content editor save handlers (playlist, scene editors)
**Example:**
```javascript
// Source: Extend existing approvalService.requestApproval pattern
async function handleSave(contentId, contentType) {
  // Save content first
  await saveContent(contentId, updates);

  // Check if approval needed
  if (await requiresApproval()) {
    // Auto-submit for approval
    await requestApproval({
      resourceType: contentType,
      resourceId: contentId,
      title: `Review ${contentName}`,
      message: '' // Optional, can be empty for auto-submit
    });
    showToast('Saved and submitted for approval');
  } else {
    showToast('Saved');
  }
}
```

### Pattern 3: Publishing Gate
**What:** Block content from appearing on screens unless approved
**When to use:** In content resolution logic, schedule assignment
**Example:**
```javascript
// Source: Database-level check in player content resolution
// In get_player_content function or playlistService

// For editors: content must be approved
// For owners/managers: content can be draft/approved
const canPublish = (approvalStatus, userRole) => {
  if (['owner', 'manager'].includes(userRole)) return true;
  return approvalStatus === 'approved';
};
```

### Pattern 4: Dashboard Widget (New)
**What:** Compact pending approvals widget on main dashboard
**When to use:** When user is owner/manager (can approve)
**Example:**
```jsx
// Source: New component following DashboardSections.jsx patterns
function PendingApprovalsWidget({ reviews, onNavigate }) {
  if (!reviews.length) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Pending Approvals</h3>
        <Badge variant="warning">{reviews.length}</Badge>
      </div>
      {reviews.slice(0, 5).map(review => (
        <ReviewRow key={review.id} review={review} onClick={onNavigate} />
      ))}
      {reviews.length > 5 && (
        <Button variant="link" onClick={() => onNavigate('/reviews')}>
          View all {reviews.length} pending
        </Button>
      )}
    </Card>
  );
}
```

### Pattern 5: Approval Email Notification
**What:** Send email when content is submitted/approved/rejected
**When to use:** After approval state changes
**Example:**
```javascript
// Source: Extend emailService.js with approval-specific templates
export async function sendApprovalRequestEmail({ to, contentName, contentType, submitterName, reviewUrl }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const html = buildApprovalEmailHtml({
    title: 'Content Submitted for Review',
    message: `${submitterName} submitted "${contentName}" (${contentType}) for your approval.`,
    actionUrl: reviewUrl,
    actionText: 'Review Now'
  });

  const { data, error } = await resend.emails.send({
    from: 'BizScreen <noreply@bizscreen.com>',
    to: [to],
    subject: `[Review Requested] ${contentName}`,
    html
  });

  // ... error handling
}
```

### Anti-Patterns to Avoid
- **Checking approval in UI only:** Must enforce at database/API level too
- **Sending emails synchronously:** Use async/background patterns to not block save
- **Hardcoding roles:** Use `requiresApproval()` helper, not inline role checks
- **Creating new approval tables:** Use existing `review_requests` table

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Approval status tracking | Custom status columns per table | `review_requests` table with `resource_type/resource_id` | Already implemented, tracks history |
| Review comments | New comments table | `review_comments` table | Already exists with RLS |
| Preview links | Custom share tokens | `preview_links` table + `previewService.js` | Already implemented |
| Role checking | Inline role queries | `permissionsService.getCurrentMemberRole()` | Caches, handles edge cases |
| Email HTML templates | New template system | Extend `emailService.js` patterns | Consistent styling, tested |

**Key insight:** Migration 027 already created most of the database infrastructure. The phase is primarily about:
1. Adding scenes to the system
2. Wiring auto-submit behavior
3. Adding dashboard widget UI
4. Creating email templates for approval notifications

## Common Pitfalls

### Pitfall 1: Approval Status Out of Sync
**What goes wrong:** Content's `approval_status` column and latest `review_request.status` diverge
**Why it happens:** Updating one without the other, or not handling edge cases (cancel, re-submit)
**How to avoid:** Always update both in a transaction; use `approvalService` functions exclusively
**Warning signs:** Content shows "approved" but review shows "open"

### Pitfall 2: Blocking Owners/Managers
**What goes wrong:** Role-based logic accidentally blocks owners from publishing
**Why it happens:** Checking approval status without checking user role first
**How to avoid:** Always check `requiresApproval()` before checking `approval_status`
**Warning signs:** Admin users see "pending approval" on their own content

### Pitfall 3: Email Spam on Re-save
**What goes wrong:** Multiple emails sent when editor saves repeatedly
**Why it happens:** Creating new review_request on every save
**How to avoid:** Check for existing open review before creating new one (use `getOpenReviewForResource`)
**Warning signs:** Approvers get multiple emails for same content

### Pitfall 4: Approval Status Not Persisting on Edit
**What goes wrong:** Approved content stays approved after edits
**Why it happens:** Not resetting status when content changes
**How to avoid:** Per user decision: editing approved content triggers re-approval (set to `draft` or `in_review`)
**Warning signs:** Editors bypass approval by editing post-approval

### Pitfall 5: Missing Scenes in Approval System
**What goes wrong:** Scenes can't be submitted for approval
**Why it happens:** Migration 027 only added approval columns to playlists/layouts/campaigns, not scenes
**How to avoid:** Create migration to add approval columns to scenes table
**Warning signs:** `requestApproval({ resourceType: 'scene' })` fails

## Code Examples

Verified patterns from existing codebase:

### Request Approval (Existing)
```javascript
// Source: src/services/approvalService.js
export async function requestApproval({ resourceType, resourceId, title, message = '', dueAt = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const tenantId = profile?.managed_tenant_id || user.id;

  // Create review request
  const { data: review, error: reviewError } = await supabase
    .from('review_requests')
    .insert({
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
      status: REVIEW_STATUS.OPEN,
      requested_by: user.id,
      requested_at: new Date().toISOString(),
      title: title || `Review ${resourceType}`,
      message,
      due_at: dueAt
    })
    .select()
    .single();

  // Update resource approval status
  const tableName = getTableName(resourceType);
  await supabase
    .from(tableName)
    .update({
      approval_status: APPROVAL_STATUS.IN_REVIEW,
      approval_requested_by: user.id,
      approval_requested_at: new Date().toISOString()
    })
    .eq('id', resourceId);

  return review;
}
```

### Check Current Member Role (Existing)
```javascript
// Source: src/services/permissionsService.js
export async function getCurrentMemberRole() {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // If the user is the tenant owner directly, they're an owner
  if (user.id === tenantId) {
    return 'owner';
  }

  // Query for membership
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  return data?.role || null;
}
```

### Fetch Open Reviews (Existing)
```javascript
// Source: src/services/approvalService.js
export async function fetchOpenReviews({ status = null, resourceType = null } = {}) {
  let query = supabase
    .from('v_review_requests_with_details')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  } else {
    query = query.eq('status', REVIEW_STATUS.OPEN);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

### Send Email Pattern (Existing)
```javascript
// Source: src/services/emailService.js
export async function sendAlertEmail({ to, subject, title, message, severity, actionUrl }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const html = buildAlertEmailHtml({ title, message, severity, actionUrl });

    const { data, error } = await resend.emails.send({
      from: 'BizScreen Alerts <alerts@bizscreen.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual submit button | Auto-submit on save | User decision | Simpler UX, always captured |
| Separate review page | Dashboard widget | User decision | Faster access for approvers |
| All users equal | Role-based publishing | User decision | Owners/managers exempt |

**Deprecated/outdated:**
- None - this is a new feature building on existing infrastructure

## Open Questions

Things that couldn't be fully resolved (marked as "Claude's Discretion"):

1. **Batch approve/reject**
   - What we know: Current UI handles one at a time
   - What's unclear: Is multi-select needed for MVP?
   - Recommendation: Start single, add batch later if requested

2. **Queue sorting defaults**
   - What we know: Current query uses `created_at DESC` (newest first)
   - What's unclear: Should default be FIFO (oldest first) for fairness?
   - Recommendation: FIFO makes sense for review queues (oldest first)

3. **Revision workflow**
   - What we know: User decided editing approved content triggers re-approval
   - What's unclear: Edit same content or create new version?
   - Recommendation: Edit same content (simpler), reset to `draft` status

4. **Withdrawal rules**
   - What we know: Content can be cancelled before decision
   - What's unclear: Can creator withdraw content that's in_review?
   - Recommendation: Yes, allow withdrawal (cancel review request)

5. **Approval history visibility**
   - What we know: `review_requests` stores full history
   - What's unclear: Show full audit trail or just current status?
   - Recommendation: Show recent history (last 5) with expandable full view

## Sources

### Primary (HIGH confidence)
- `src/services/approvalService.js` - Existing approval functions
- `src/services/emailService.js` - Email sending patterns
- `src/services/permissionsService.js` - Role checking
- `supabase/migrations/027_content_approvals_and_previews.sql` - Database schema
- `supabase/migrations/021_team_members_and_locations.sql` - Role system

### Secondary (MEDIUM confidence)
- `src/pages/ReviewInboxPage.jsx` - Existing review UI patterns
- `src/pages/hooks/usePlaylistEditor.js` - Approval integration pattern
- `src/pages/dashboard/DashboardSections.jsx` - Widget patterns

### Tertiary (LOW confidence)
- None - all patterns verified in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Patterns extracted from existing code
- Pitfalls: HIGH - Based on codebase analysis and approval workflow best practices

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain)

---

## Implementation Notes

### What Already Exists
1. **Database tables:** `review_requests`, `review_comments`, `preview_links`
2. **Approval columns:** On `playlists`, `layouts`, `campaigns` (NOT on `scenes`)
3. **Service layer:** `approvalService.js` with full CRUD
4. **UI page:** `ReviewInboxPage.jsx` (standalone, not dashboard widget)
5. **Editor integration:** `usePlaylistEditor.js` shows approval modal pattern

### What Needs to Be Built
1. **Migration:** Add approval columns to `scenes` table
2. **Service extension:** Add `requiresApproval()` helper to permissionsService
3. **Auto-submit logic:** Integrate into playlist/scene save handlers
4. **Dashboard widget:** `PendingApprovalsWidget` component
5. **Email templates:** Approval request, approval, rejection notifications
6. **Publishing gate:** Block unapproved content from screen assignment

### Decision Confirmations (from CONTEXT.md)
- Saving automatically submits for approval (no separate button)
- Dashboard widget (not separate page) for approver access
- Read-only preview when clicking from queue
- Rejection requires feedback; approval feedback is optional
- Approved content auto-publishes (available for screens/schedules)
- Editing approved content triggers re-approval
