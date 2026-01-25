# Phase 14: Scheduling Core - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can schedule content with date ranges and priorities, see conflicts visually, and preview a week of scheduled content. Campaign grouping, emergency override, and dayparting are separate phases (15-16).

</domain>

<decisions>
## Implementation Decisions

### Date range input
- Start date + duration approach (not calendar range picker)
- Inline calendar always visible for start date selection
- Duration presets: time-based (1 day, 3 days, 1 week, 2 weeks, 1 month, custom), use-case based (Daily special, Weekend only, This week, Seasonal), and open-ended ("No end date / Until further notice")
- Date + time precision — user sets specific start/end times (e.g., 9am-5pm daily)

### Priority visualization
- Named levels instead of numeric: Lowest / Low / Normal / High / Critical (5 levels)
- Display in lists: color badge + text label (both for clarity)
- Default priority for new entries: Normal (middle)

### Conflict display
- Inline warning in scheduling form when conflict detected
- Detailed conflict info: conflicting content name, date range overlap, which device(s) affected
- Block saving until conflict resolved — cannot save with active conflicts
- Existing conflicts shown in list view with highlighted row (warning background color)

### Week preview layout
- Calendar grid style: days as columns, time slots as rows
- Thumbnail previews of actual content in grid cells
- Full drag and drop: drag to reschedule, resize to change duration
- Default scope: all devices combined view

### Claude's Discretion
- Exact time slot granularity (15min, 30min, 1hr)
- Thumbnail sizing and aspect ratio handling
- Drag and drop implementation details (library choice)
- Color palette for priority badges
- Time picker component style

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches for calendar/scheduling UI patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-scheduling-core*
*Context gathered: 2026-01-24*
