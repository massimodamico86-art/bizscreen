# Phase 86: Screen Management - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Screen listing, pairing, group management, device diagnostics, and remote commands all work end-to-end. The codebase already has significant infrastructure: ScreensPage with listing/filtering/search, ScreenGroupDetailPage, services for diagnostics/telemetry/screenshots, extracted components (ScreenRow, AddScreenModal, etc.), and a useScreensData hook. This phase wires everything together so it works reliably.

Requirements: SCRN-01 through SCRN-05.

</domain>

<decisions>
## Implementation Decisions

### Screen status & health display
- Claude's discretion on status badge style (dot+label, pill badge, or icon) — pick what matches the existing design system
- Claude's discretion on which health metrics to show on the detail page — determine from what the telemetry/diagnostics services already expose
- Claude's discretion on color-coding approach for diagnostics (traffic light vs gradient) — pick what works for the metric types available
- Claude's discretion on screenshot refresh behavior (auto-refresh, on-demand, or both) — determine from screenshot service capabilities

### Pairing experience
- Claude's discretion on primary pairing method (OTP vs QR) — pick based on what the existing pairing code and PairingScreen component already support
- Claude's discretion on error handling approach — determine from error types the pairing service can produce
- Claude's discretion on demo/trial user pairing experience — follow existing demo mode patterns in the app
- Claude's discretion on post-pairing navigation — follow the app's existing post-creation patterns

### Groups & tagging UX
- Claude's discretion on group creation flow (modal vs select-then-group) — follow existing creation patterns in the codebase
- Claude's discretion on tag system (free-form vs predefined categories) — determine from existing tag infrastructure in services
- Claude's discretion on bulk action set — determine from what the screen service API supports for batch operations
- Claude's discretion on filter UX — leverage existing FilterChips component and filter patterns in the app

### Remote commands feedback
- Claude's discretion on which commands require confirmation — determine based on command risk level
- Claude's discretion on command execution feedback (toast, inline status, or log panel) — follow existing toast/notification patterns
- Claude's discretion on bulk command support — determine from what the service layer supports
- Claude's discretion on command failure handling (immediate error vs queue-and-retry) — determine from what the command service supports

### Claude's Discretion
All implementation decisions for this phase are at Claude's discretion. The user trusts Claude to:
- Follow existing design system patterns and codebase conventions
- Choose approaches based on what services and APIs already support
- Match the UX patterns established in other pages (playlists, layouts, schedules)
- Prioritize working end-to-end over polish — this phase is about wiring things up correctly

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user wants Claude to make all implementation decisions based on existing codebase patterns, service capabilities, and design system conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 86-screen-management*
*Context gathered: 2026-02-24*
