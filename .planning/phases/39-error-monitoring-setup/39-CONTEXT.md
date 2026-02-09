# Phase 39: Error Monitoring Setup - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate Sentry SDK into both frontend and backend so production errors are captured with full debugging context. Frontend errors include user identity, current route, and relevant app state. API errors include request method, path, and response status. Errors must be visible in Sentry dashboard within 60 seconds.

Notifications, source maps, and alert thresholds belong in Phase 40.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation decisions were delegated to Claude. The following areas have full flexibility:

**Error context scope:**
- User identity enrichment (how much user info to attach — ID, role, org)
- App state capture strategy (route, feature flags, store state depth)
- Backend request context (metadata vs sanitized body)
- Breadcrumb depth and configuration

**Error filtering:**
- Third-party/extension error handling (filter vs tag)
- Error sampling rate (based on expected volume)
- Known benign error deny-list (ResizeObserver, network disconnects, cancelled fetches)
- API error scope (which HTTP status codes to capture)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to make sensible defaults across all error monitoring decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 39-error-monitoring-setup*
*Context gathered: 2026-02-09*
