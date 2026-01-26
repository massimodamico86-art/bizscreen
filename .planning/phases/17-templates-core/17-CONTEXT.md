# Phase 17: Templates Core - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Marketplace for browsing, searching, previewing, and applying templates to create scenes. Users can browse by category, search by name/description, preview templates, and apply with one click. Template creation, editing, sharing, and customization wizards are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Template presentation
- Large thumbnails only — maximize visual preview, minimal chrome
- Title appears on hover, not always visible
- 4 templates per row on desktop (balanced density)
- Hover state shows title + Quick Apply button overlay
- Featured templates displayed in dedicated row with larger cards (not a carousel)

### Category navigation
- Persistent left sidebar with category list (e-commerce style)
- "All Templates" is the default landing — shows all templates, sidebar filters down
- Categories: Restaurant, Retail, Salon, etc. — industry-based organization

### Search & filtering
- Search bar positioned at top of marketplace page (prominent)
- Live as-you-type filtering — grid updates instantly while typing (debounced)
- Orientation filter (landscape/portrait) as checkboxes in sidebar under categories

### Preview & apply flow
- Side panel slides in from right — template details shown, grid remains visible
- Panel shows: large preview, template name, description, category, Apply button
- Apply action: instant scene creation + redirect to editor (no confirmation dialog)
- Scene naming: automatic — "Template Name - Jan 25, 2026" format

### Claude's Discretion
- Whether to implement subcategories (e.g., Restaurant → Menu Boards, Promos)
- Category filter behavior — instant filter vs URL navigation
- Sorting options — likely Popular + Newest, possibly alphabetical
- Side panel behavior when clicking another template while open
- Loading states and empty state design
- Responsive breakpoints for grid columns

</decisions>

<specifics>
## Specific Ideas

- Sidebar navigation similar to e-commerce sites (always visible, scrollable if many categories)
- Quick Apply on hover enables fast workflow — users can browse and apply without opening preview
- Side panel keeps browsing context — user can compare templates without losing their place

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-templates-core*
*Context gathered: 2026-01-25*
