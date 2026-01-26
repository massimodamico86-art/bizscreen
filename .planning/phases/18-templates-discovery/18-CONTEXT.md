# Phase 18: Templates Discovery - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can easily find and organize templates with recents, favorites, starter packs, and customization. Builds on Phase 17's marketplace components. Template ratings and suggestions are separate phases (19).

</domain>

<decisions>
## Implementation Decisions

### Recents & Favorites
- Recents section in TemplateSidebar (not main grid)
- Favorites section in TemplateSidebar (below or near Recents)
- Heart icon on TemplateCard for favoriting (fills when favorited)
- Both sections follow sidebar pattern established in Phase 17

### Starter Packs
- Packs contain multiple related templates only (no schedule/campaign config)
- Display as featured row at top of marketplace (above Featured templates row)
- On click: inline expansion (pack card expands downward, shows templates in grid)
- Selection flow: checkboxes on each template, then "Apply Selected" button
- Expanding a pack doesn't navigate away from marketplace

### Customization Wizard
- Triggers after Quick Apply (scene created first, then wizard opens)
- Single-screen form (not multi-step wizard)
- Side-by-side layout: form fields on left, live preview on right
- Preview updates in real-time as user makes changes

### Navigation & Layout
- Starter Packs row appears above Featured templates row
- Pack inline expansion shows templates in grid below the pack card

### Claude's Discretion
- Number of recent templates to show in sidebar
- Exact sidebar section ordering (Recents/Favorites relative to Categories)
- What's customizable in wizard (logo, colors, text based on template capabilities)
- Filter behavior when search/filters active (hide/show special sections)
- Styling details for inline pack expansion

</decisions>

<specifics>
## Specific Ideas

- Heart icon pattern is familiar (like Twitter, Instagram)
- Pack expansion should feel natural — click expands, click again collapses
- Customization wizard should be lightweight, not overwhelming

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-templates-discovery*
*Context gathered: 2026-01-26*
