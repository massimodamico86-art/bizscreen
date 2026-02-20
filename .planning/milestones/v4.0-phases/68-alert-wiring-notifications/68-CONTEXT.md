# Phase 68: Alert Wiring & Notifications - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire recovery events (crash detection, auto-reload, fallback activation from Phase 66) and content verification mismatches (Phase 67) into the existing alert engine so they generate alerts. Ensure all device alerts flow to the in-app notification bell with history. Add email notifications for critical alerts (device offline, recovery exhausted). The alert engine, notification bell, alerts center page, and notification dispatcher already exist from prior phases.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions. Claude has full flexibility on:

**Recovery alert types & severity:**
- Which recovery events map to which alert types (crash detection, auto-reload, fallback activation, recovery exhausted)
- Severity assignment for each recovery event type
- Escalation rules (e.g., single crash vs repeated crashes)
- Whether to add new ALERT_TYPES constants or reuse existing ones

**Email notification rules:**
- Which alert severities/types trigger email
- Batching and throttle strategy (e.g., digest vs immediate for critical)
- Email content, formatting, and template approach
- Opt-in/opt-out mechanism if needed

**Notification bell updates:**
- Whether new icons or grouping are needed for recovery-type alerts
- Badge logic changes (if any) to accommodate new alert types
- Dropdown behavior for recovery alerts

**Alerts Center display:**
- How recovery alerts render on the Alerts page
- Filter categories for new alert types
- Detail view content for recovery events

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 68-alert-wiring-notifications*
*Context gathered: 2026-02-20*
