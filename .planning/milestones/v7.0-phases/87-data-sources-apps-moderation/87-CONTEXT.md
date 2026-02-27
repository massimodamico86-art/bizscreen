# Phase 87: Data Sources, Apps & Moderation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify and wire up data source configuration (Google Sheets, CSV, RSS) with field mapping, app CRUD for all 6 app types with pre-populated edit modals, menu board category/item management with drag-and-drop reordering, social feed moderation queue with approve/reject actions, and review inbox for content approvals. This is a verification phase — ensuring existing UI is fully functional, not building from scratch.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

The user deferred all implementation decisions to Claude. The following areas should be resolved by examining existing codebase patterns and choosing the approach most consistent with the app:

**Data Source Configuration:**
- Creation flow structure (wizard vs single form) — match existing modal/form patterns
- Error handling on connection failure — follow existing error patterns in the app
- Field mapping preview approach — based on what the existing UI supports
- Source type organization (unified list vs tabs) — match existing page layout patterns

**App Editing Experience:**
- Edit modal trigger (row click vs edit button) — follow existing list/table interaction patterns
- App type mutability after creation — pick safest approach
- New app type selection UX (grid picker vs dropdown) — match existing modal patterns
- Delete placement (in modal vs list only) — follow existing delete patterns

**Moderation Workflow:**
- Approve/reject action style (inline, batch, or both) — follow existing action patterns
- Post-action feedback (disappear vs status change) — pick best UX approach
- Hashtag filtering approach (chips vs search input) — match existing filter patterns
- Review inbox placement (separate page vs tab) — follow existing page structure

**Menu Board Interactions:**
- Drag-and-drop scope (categories + items vs items only) — based on menu board structure
- Item editing approach (inline vs modal) — follow existing CRUD patterns
- Category deletion with items behavior — pick safest UX approach
- Reorder persistence (auto-save vs manual save) — follow existing save patterns

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user trusts Claude to make all implementation decisions based on existing codebase patterns and conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 87-data-sources-apps-moderation*
*Context gathered: 2026-02-26*
