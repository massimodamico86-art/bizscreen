# Phase 64: Telemetry Pipeline & Offline Detection - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Operators can see device health metrics and get automatically alerted when screens go offline. Player sends memory, storage, and network metrics on heartbeat. Server evaluates heartbeats and raises/resolves offline alerts automatically. The notification bell, email delivery, and alert history UI are Phase 68 — this phase builds the detection engine and the diagnostics display on the screen detail page.

</domain>

<decisions>
## Implementation Decisions

### Diagnostics display — Offline state
- When a device is offline, show a clear "Device Offline" banner PLUS last known metric values grayed out underneath
- Operators can see stale data is stale while still having the last known values for troubleshooting

### Diagnostics display — Timestamps
- "Last seen" time displayed as relative time ("3 minutes ago"), not absolute timestamps
- Keeps the display human-friendly and scannable

### Diagnostics display — Metrics
- Standard set as defined in roadmap: memory, storage, network
- No specific fields to include or exclude beyond what the roadmap specifies

### Diagnostics display — Reference
- No specific product reference — clean and functional, matching existing design system

### Claude's Discretion
- **Placement**: Where diagnostics appear on screen detail page (dedicated tab vs inline section vs other)
- **Visual style**: How individual metrics are visualized (numbers, gauges, progress bars)
- **Historical data**: Whether to show latest snapshot only or include mini trend lines
- **List page indicator**: Whether screens list page shows a health status dot/badge per device
- **Network info**: What network details to show (IP, connection type, both, neither)
- **Content sync time**: Whether last content sync timestamp belongs in diagnostics or elsewhere
- **Auto-refresh**: Whether diagnostics auto-update while viewing or require manual refresh
- **Warning treatment**: How concerning metric values are visually flagged (color, tooltips, etc.)
- **Metric thresholds**: What levels constitute healthy/warning/critical for each metric
- **Offline detection sensitivity**: Heartbeat timeout thresholds and grace periods
- **Alert data model**: What information offline alerts carry for Phase 68 to consume

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants it clean and functional, matching existing design patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 64-telemetry-pipeline-offline-detection*
*Context gathered: 2026-02-19*
