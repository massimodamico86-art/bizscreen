# Phase 54: Countdown Widget & Utilities - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Countdown timer widget for scenes — counts down to a specific date/time with timezone awareness, supports recurring daily mode, and locale-based formatting. This covers the player-side widget, scene editor controls, and preview integration. No new widget types beyond countdown (e.g., clock, weather) are in scope.

</domain>

<decisions>
## Implementation Decisions

### Countdown display style
- Ticking down to the second — days, hours, minutes, seconds all visible and updating live
- Optional configurable title/label (e.g., "Grand Opening in...") displayed with the countdown
- Visual layout style is Claude's discretion (segmented boxes vs inline text — pick best approach for zone sizing)

### Expiry behavior (one-time countdown)
- What displays at zero (frozen zeros vs message) — Claude's discretion
- Whether to auto-hide after expiry or stay visible — Claude's discretion
- General principle: sensible defaults for digital signage where stale content is bad

### Expiry behavior (daily recurring)
- Immediate reset when countdown reaches zero — starts counting to same time tomorrow instantly
- No "It's time!" hold period — straight to next cycle

### Recurring daily mode
- Works for any daily recurring event (happy hour, store open/close, daily deals — no primary use case)
- Whether to implement as mode toggle or separate widget types — Claude's discretion based on existing widget patterns
- Whether to include target time + duration window (e.g., show message during event) vs target time only — Claude's discretion
- Whether to support day-of-week filtering within the widget vs relying on scene schedules — Claude's discretion

### Locale & formatting
- Timezone handling approach (explicit dropdown vs screen's timezone) — Claude's discretion
- Locale support level (unit labels language, number formatting) — Claude's discretion
- Whether to display the target date alongside countdown — Claude's discretion
- Editor preview behavior (live ticking vs static) — Claude's discretion based on existing preview patterns

### Claude's Discretion
- Visual layout style (segmented boxes, inline text, or adaptive)
- Color/theming approach (match existing widget patterns)
- Urgency visual cue near zero (color change or none)
- Expiry display and auto-hide behavior for one-time countdowns
- Mode toggle vs separate widget types for one-time vs recurring
- Duration window support for daily recurring
- Day-of-week filtering scope
- Timezone picker UX
- Locale support depth
- Target date display
- Editor preview ticking behavior

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants a general-purpose countdown that serves any daily recurring event equally well (happy hour, store opening, closing, deals).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 54-countdown-widget-utilities*
*Context gathered: 2026-02-12*
