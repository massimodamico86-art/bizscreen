# Phase 77: Content & Media Features - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Four content/media capabilities: video uploads in carousel media manager, property event management, graphics library in layout editor sidebar, and content analytics timeline. Each is a distinct feature area within the content & media domain. No new content types, no social features, no scheduling logic.

</domain>

<decisions>
## Implementation Decisions

### Video in carousels
- Max video duration: 2 minutes
- Duration limit enforced on upload — no file size cap beyond storage limits
- Audio is configurable per video — each video has a mute/unmute toggle in the media manager
- Accepted formats: standard web video formats (mp4, webm)

### Property events
- Event fields: title, date, and optional start/end time — no description or image attachment
- Display as upcoming chronological list on property detail page
- Past events auto-hide (removed from list once date passes)
- All events are one-time — no recurrence support
- Add/edit/remove via inline actions on the event list

### Graphics library panel
- Source: combination of built-in platform graphics and user's uploaded media
- Organization: categories/folders (icons, backgrounds, shapes, logos, etc.)
- Insert behavior: click to insert at canvas center, or drag and drop for precise placement

### Analytics timeline
- Data shown: play count over time + playlist appearances with per-playlist breakdown
- No screen count, duration, or peak hours metrics in this phase

### Claude's Discretion
- Video thumbnail/preview approach in media manager (static frame with play icon, hover preview, etc.)
- Graphics library panel placement in layout editor (sidebar tab vs toolbar popover — follow existing patterns)
- Chart style for analytics timeline (line vs bar — pick based on data type and existing app patterns)
- Time range options for analytics (presets, custom range, or both — pick what fits signage analytics)
- Analytics data source: assess whether real play log data exists in Supabase and wire to real data if available, otherwise build UI with realistic mock data

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

*Phase: 77-content-media-features*
*Context gathered: 2026-02-22*
