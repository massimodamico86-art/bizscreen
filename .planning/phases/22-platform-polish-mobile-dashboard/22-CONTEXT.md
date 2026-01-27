# Phase 22: Platform Polish - Mobile & Dashboard - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin UI works well on mobile devices and dashboard provides actionable overview. Mobile responsiveness makes the admin accessible on phones/tablets, while the dashboard redesign gives users a command center view of their digital signage network.

</domain>

<decisions>
## Implementation Decisions

### Mobile Layout Strategy
- Breakpoints: Follow existing codebase patterns (Claude's discretion)
- Priority pages requiring mobile optimization: Dashboard, Screen status, Content library, Schedule view
- No page restrictions — all admin pages accessible on mobile, even editor (degraded but usable)
- Navigation: Hamburger menu (slide-out sidebar with all nav items)

### Table Handling on Mobile
- Default behavior: Horizontal scroll (keep table layout, user scrolls sideways)
- Column visibility: Claude decides per table which columns are essential vs hidden on mobile
- Row actions: Tap row to expand (shows actions inline)
- Filter collapse: Claude decides based on filter count per table

### Dashboard Structure
- Layout: Fixed grid (pre-defined widget positions, consistent experience)
- Priority information (all equally important):
  - Screen health (online/offline count, alerts)
  - Active content (what's playing now)
  - Recent activity (latest changes)
  - Quick stats (total screens, scenes, schedules)
- Active content view: Thumbnail grid showing preview images of what's on each screen
- Time range: Configurable (user can switch between today/week/month)

### Health and Quick Actions
- Health alerts: Both banner (for critical issues like multiple screens offline) AND widget (for ongoing visibility)
- Quick actions exposed: Add screen, Create content, Push emergency, View analytics
- Action placement: Top right corner (buttons in header area, always visible)
- Activity feed: Timeline format (chronological list with timestamps)

### Claude's Discretion
- Exact breakpoint values based on existing Tailwind usage
- Which columns to hide on mobile per table
- Whether to collapse filters based on filter count
- Specific widget sizing and grid arrangement
- Mobile touch target sizing standards

</decisions>

<specifics>
## Specific Ideas

- Thumbnail grid for "what's playing now" — users want visual confirmation their content is running
- Emergency push action prominent — quick access matters in urgent situations
- Timeline feed for activity — easy to scan recent changes chronologically
- Hamburger nav keeps mobile UI clean while providing full access

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-platform-polish-mobile-dashboard*
*Context gathered: 2026-01-26*
