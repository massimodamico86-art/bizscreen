# Phase 15: Scheduling Campaigns - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can group schedule entries into campaigns, push emergency content that overrides all schedules, and apply dayparting presets. Schedule changes apply at content boundaries (no mid-playback jumps). Campaign analytics, rotation rules, and templates are Phase 16.

</domain>

<decisions>
## Implementation Decisions

### Campaign management
- Both views: dedicated campaigns page for overview AND integrated grouping in schedules view
- Campaign card shows: name, date range, entry count, active/inactive status, devices count
- Add entries both ways: create new from campaign context OR assign existing entries to campaign
- Entry belongs to exactly one campaign (or none) - simpler ownership model

### Emergency override
- Activate via both paths: dedicated "Emergency Push" button in header AND context menu on content
- End options: set optional duration (15min, 1hr, etc.) for auto-restore, or leave indefinite until manually stopped
- Scope: all devices tenant-wide (no device selection for emergency)
- Visual: persistent red banner "EMERGENCY ACTIVE" with stop button PLUS badge indicator on header

### Dayparting presets
- Both preset sets available:
  - Meal-based: Breakfast (6-10am), Lunch (11am-2pm), Dinner (5-9pm)
  - Period-based: Morning, Afternoon, Evening, Night (6hr blocks)
- Fully customizable: edit built-in preset times AND create/save custom daypart presets
- Apply both ways: during entry creation AND bulk apply to existing entries
- Full recurring rules: specific days, every other week, etc.

### Transition behavior
- Content boundary: finish current content item, then apply new schedule
- Device status: device list shows "now playing" info that updates on transitions

### Claude's Discretion
- Transition visual effect (fade, instant, or contextual)
- Offline sync behavior (jump to current vs catch up)
- Exact campaign card layout and styling
- Preset time editor UI design

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

*Phase: 15-scheduling-campaigns*
*Context gathered: 2026-01-25*
