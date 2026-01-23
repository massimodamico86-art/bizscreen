# Phase 6: Player Reliability - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the player to handle network failures and errors gracefully without user intervention. Includes retry logic with exponential backoff, offline telemetry queuing, kiosk exit password validation, and replacing empty catch blocks with proper error handling.

Does NOT include new player features, UI changes, or refactoring (those are Phase 7+).

</domain>

<decisions>
## Implementation Decisions

### Retry behavior
- Retry indefinitely — never give up on sync attempts
- No on-screen indication when retrying (admin panel visibility only)
- Immediate full sync when connection restores (fetch latest content right away)

### Offline queue
- Queue all telemetry when offline: screenshots, analytics, heartbeats, errors
- No limit on queue size — send everything when back online
- Queue persists across page refreshes

### Kiosk exit UX
- Two trigger methods: hidden tap zone (5 taps corner) AND keyboard shortcut
- Uses admin password for authentication (not device PIN)
- No lockout on failed attempts — just show error and allow retry
- Must work offline (password verified locally)

### Error handling style
- Silent recovery for transient errors (log and retry)
- Admin notification for persistent failures (escalate to dashboard)
- Full stack traces in error logs (error + context + stack trace)

### Claude's Discretion
- Retry timing (conservative vs aggressive exponential backoff)
- Upload order when flushing offline queue (FIFO vs priority-based)
- Queue storage technology (localStorage vs IndexedDB)
- Offline password verification approach (hash storage, caching)
- Escalation threshold for persistent errors (failure count vs time-based)
- Empty catch block handling (log+continue vs log+retry per context)

</decisions>

<specifics>
## Specific Ideas

- Player should behave like a "set it and forget it" appliance — keep working through outages
- Admin dashboard should show which devices are offline/retrying (but player screen stays clean)
- Technicians need reliable kiosk exit even without network access

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-player-reliability*
*Context gathered: 2026-01-23*
