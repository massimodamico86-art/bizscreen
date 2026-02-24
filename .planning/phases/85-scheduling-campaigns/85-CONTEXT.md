# Phase 85: Scheduling & Campaigns - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify schedule creation with time/day rules, conflict detection, dayparting, weekly preview, and full campaign lifecycle (create, edit, delete, rotation, priority, seasonal dates, analytics). All components exist — this phase ensures they work end-to-end without errors.

</domain>

<decisions>
## Implementation Decisions

### Conflict & Preview UX
- Claude's discretion on conflict presentation style (inline warning vs modal vs blocking)
- Claude's discretion on weekly preview detail level (compact color bars vs rich thumbnails)
- Claude's discretion on daypart picker interaction (visual grid vs form-based) — use whatever the existing DaypartPicker supports
- Claude's discretion on conflict resolution actions (notify-only vs quick-resolve buttons)

### Schedule Rule Builder
- Claude's discretion on content assignment method (picker modal vs drag sidebar) — follow existing component patterns
- Claude's discretion on time granularity — follow signage industry norms and existing component
- Claude's discretion on editor visualization (live timeline vs rules list + preview tab) — follow existing ScheduleEditorPage patterns
- Claude's discretion on filler content prominence — decide based on workflow importance

### Campaign Editor Flow
- Claude's discretion on rotation controls (simple interval vs weighted) — follow existing RotationControls component
- Claude's discretion on seasonal date picker (simple range vs recurring rules) — follow existing SeasonalDatePicker component
- Claude's discretion on template picker placement — follow existing TemplatePickerModal component
- Claude's discretion on priority system (numeric vs named tiers) — follow existing PriorityBadge component

### Claude's Discretion
All implementation decisions for this phase are at Claude's discretion. The user trusts Claude to:
- Follow existing component patterns and design system conventions
- Make choices consistent with digital signage industry norms
- Ensure all success criteria pass (schedule CRUD, conflict detection, dayparting, campaign lifecycle, analytics)
- Prioritize making existing components work correctly over redesigning them

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to follow existing patterns across all schedule and campaign components.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 85-scheduling-campaigns*
*Context gathered: 2026-02-24*
