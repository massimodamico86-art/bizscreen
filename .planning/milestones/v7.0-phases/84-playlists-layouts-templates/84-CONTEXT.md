# Phase 84: Playlists, Layouts & Templates - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify and fix playlist CRUD and editor, layout editor with zone creation/resize/configuration for all 12 widget types, layout template library browse/preview/apply, and template marketplace search/filter/preview/one-click apply/customization wizard. The features already exist — this phase finds and fixes broken interactions.

</domain>

<decisions>
## Implementation Decisions

### Playlist editor UX
- Item reordering must support **both** drag-and-drop (primary) and up/down arrow buttons (accessibility fallback)
- Both duration-per-item settings and transition effect settings are equally critical to verify — neither can be skipped
- Item adding method and live preview: Claude's discretion based on existing codebase implementation

### Widget type coverage
- Widget priority order: Claude's discretion — assess from codebase which widgets are most prominent and prioritize accordingly
- Config verification depth: Claude's discretion — determine appropriate depth per widget based on complexity
- Fix vs. log policy: Claude's discretion — decide based on severity and effort whether to fix in-phase or document for later
- External dependencies: Claude should investigate which widgets require external APIs and determine how to handle testing (mock data vs. real credentials)

### Template marketplace flow
- Browsing UI, preview experience, and one-click apply flow: Claude's discretion based on what the existing codebase provides
- Layout template library vs. template marketplace relationship: Claude should investigate whether these are unified or separate experiences and verify accordingly

### Layout editor zones
- Zone creation method, overlap policy, zone selection behavior, and responsive/fixed positioning: Claude's discretion based on existing editor implementation
- Verify whatever the editor currently supports works correctly end-to-end

### Claude's Discretion
- Playlist: item adding method, live preview behavior
- Widgets: priority ordering, config verification depth, fix-vs-log threshold, external dependency handling
- Templates: browsing UI, preview pattern, apply flow, library/marketplace architecture
- Zones: creation method, overlap rules, selection UX, positioning model

</decisions>

<specifics>
## Specific Ideas

No specific requirements — user trusts the existing codebase patterns. The key mandate is: verify what's built works correctly, fix what's broken. The two firm decisions are drag-and-drop + arrows for playlist reordering, and equal importance of duration and transition settings.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 84-playlists-layouts-templates*
*Context gathered: 2026-02-23*
