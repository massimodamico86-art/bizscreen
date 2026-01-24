# Phase 11: GDPR Compliance - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can export all their data and request permanent account deletion per EU GDPR regulations. Export includes machine-readable JSON delivered within 30 days. Deletion has 30-day grace period, then permanently removes all user data from database and cloud storage (S3, Cloudinary).

</domain>

<decisions>
## Implementation Decisions

### Data Export Scope
- Activity logs: Summary aggregates only (counts per month, not individual events)
- Content data, tenant boundaries, file structure: Claude's discretion based on GDPR requirements

### Export Delivery
- Delivery method: Both email notification with download link AND in-app download available
- Request trigger, link expiration, duplicate handling: Claude's discretion

### Deletion Flow
- All decisions (confirmation method, grace period behavior, reminders, active content handling): Claude's discretion
- Must implement 30-day grace period as specified in requirements

### Media Handling
- All decisions (export inclusion, shared media policy, deletion timing, audit logging): Claude's discretion
- Must ensure S3 and Cloudinary files are deleted when account is deleted (GDPR-05)

### Claude's Discretion
- Data export: What content/profile data to include, file structure (single JSON vs ZIP), tenant data boundaries
- Export delivery: UI placement (settings vs dedicated page), link expiration duration, duplicate request handling
- Deletion flow: Confirmation method, grace period access level, reminder cadence, orphaned content handling
- Media handling: Whether to include actual files in export, shared media policy, deletion timing, audit requirements

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to implement GDPR-compliant patterns based on regulatory requirements and industry best practices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-gdpr-compliance*
*Context gathered: 2026-01-24*
