# Phase 21: Multi-Language Advanced - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Advanced multi-language management features: bulk translation dashboard, group-level language assignment with device inheritance, translation workflow states (draft/review/approved), and AI-assisted translation suggestions. Builds on Phase 20's core language infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Translation Dashboard
- Organize by scene — each row is a scene, columns show language status
- Filter by status + language (not full filters, not minimal)
- Bulk actions: both translate selected AND status change actions
- Checkbox selection for bulk operations

### Group Assignment
- Strict inheritance — devices in group always use group's language, no override
- Manual location — admin sets device location in settings, language auto-maps from that
- Configure group language in dedicated settings tab on screen group detail page
- No inline editing in groups list

### Translation Workflow
- Simple 3-state workflow: Draft → Review → Approved
- Publishing allowed with Draft translations but show warning
- Status visible only in translation dashboard (not in editor or content lists)

### Claude's Discretion
- Status visualization approach (pills vs progress bar vs other)
- Groups list language indicator (badge vs column vs other)
- Who can transition between workflow states (based on existing permission model)
- What elements get translated (text, alt text, captions, etc.)
- Whether to include "Apply all" action for AI suggestions

</decisions>

<specifics>
## Specific Ideas

- AI suggestions triggered on-demand via button (not auto-generated)
- AI suggestions appear in side panel — user copies/edits into scene
- Dashboard filters should be simple but effective (status + language covers main use cases)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-multi-language-advanced*
*Context gathered: 2026-01-26*
