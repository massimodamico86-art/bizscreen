# Phase 51: Data Source Widget Pipeline - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can connect Google Sheets or CSV data and see it rendered as a styled table on their screens, with configurable refresh and offline resilience. Includes field binding to scene editor text elements. RSS feeds, social feeds, and countdown widgets are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Data source setup flow
- Two entry points: a dedicated top-level "Data Sources" page AND inline add from the scene editor
- Google Sheets: user pastes a public URL (sheet shared as "Anyone with the link") — no OAuth
- CSV: file upload only — no hosted URLs, no paste-raw-text
- After connecting/uploading, show a full preview table (scrollable, with headers and rows) so user can confirm data looks right before using it

### Table rendering on screen
- User can select which columns to show/hide and reorder them (column picker)
- When data has more rows than fit in the zone, auto-paginate on a timer (cycle through pages)
- No scrolling or truncation — auto-pagination is the overflow strategy

### Field binding in scene editor
- Bind via properties panel: select a text element, pick "Data Source" in properties, choose a field from dropdown
- Editor canvas shows the live data value (actual current value from the source), not a placeholder tag
- Multi-row sources: show first row's value by default, user can optionally pick a specific row number

### Refresh & offline behavior
- On player error/failure (wrong URL, deleted sheet): keep showing last known data silently — no error messages on screen
- Offline: show cached data, resume updating when connectivity returns

### Claude's Discretion
- Table visual style (card vs full-bleed vs other) — pick what fits existing screen component patterns
- Table theming approach (inherit brand theme vs per-widget overrides) — pick what fits existing theming system
- Refresh interval config location (on data source vs per widget) — pick simplest approach
- Offline/stale indicator on player screen — decide based on digital signage context (viewers are usually not staff)
- Admin data sources page status display — decide what's practical for first pass
- Whether text elements support mixed template text (static + data fields) or single field only — decide based on scene editor architecture

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

*Phase: 51-data-source-widget-pipeline*
*Context gathered: 2026-02-11*
