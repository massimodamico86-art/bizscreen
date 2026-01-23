# Phase 10: Analytics - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Content performance visibility for content owners. Users can see view duration, completion rates, and viewing patterns for their content. This phase delivers an analytics dashboard and content-level metrics display. Real-time monitoring, alerts, and advanced reporting are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- Primary focus when opening dashboard: Overview metrics (executive summary feel)
- Overview section shows: Total view hours, Active screens, Top content
- Navigation: Tabbed sections below the overview
- Tab structure: Claude's discretion based on success criteria

### Content metrics display
- Location: Both inline on content detail pages AND dedicated analytics page
- Inline summary metrics: View duration, Completion rate, Total views, Last viewed
- "View full analytics" link from inline summary to dedicated page
- Comparison indicators (arrows, sparklines): Claude's discretion
- Dedicated page depth (charts, breakdowns): Claude's discretion

### Heatmap visualization
- Cell metric (views, duration, active screens): Claude's discretion
- Interactivity: Hover tooltips only — no click-through drill-down
- Color scheme: Claude's discretion
- Time format for axes: Claude's discretion

### Claude's Discretion
- Tab structure and naming for analytics dashboard
- Time comparison approach for content metrics (arrows vs sparklines vs none)
- Additional content on dedicated analytics page (screen breakdown, time graphs)
- Heatmap cell metric and visual design
- Preset time ranges (today, 7 days, 30 days, custom)
- Filtering options (by screen, content type, location)
- Export capability (CSV, PDF, or none for v1)
- Data retention period

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard analytics approaches.

User prioritized simplicity in visualization (hover tooltips only for heatmap) while wanting comprehensive metrics in the content summary (all 4 metrics selected for inline display).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-analytics*
*Context gathered: 2026-01-23*
