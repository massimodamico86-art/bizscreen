# Phase 165: Campaign Scheduling UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 165-campaign-scheduling-ui
**Areas discussed:** Dayparting presets UX, Analytics view placement, Stats data presentation, Empty & loading states

---

## Dayparting Presets UX

| Option | Description | Selected |
|--------|-------------|----------|
| Chip/button group | Row of selectable chips above start/end time fields, auto-fills time range | :heavy_check_mark: |
| Dropdown select | Dropdown listing presets plus 'Custom', compact but less discoverable | |
| You decide | Claude picks based on codebase patterns | |

**User's choice:** Chip/button group
**Notes:** Recommended approach, matches existing button-group patterns in the app.

### Follow-up: Override behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Deselect chip | Preset chip deselects when user manually edits time | :heavy_check_mark: |
| Keep chip selected | Chip stays selected even if times edited | |
| You decide | Claude picks | |

**User's choice:** Deselect chip
**Notes:** Clear UX — user knows when schedule is custom vs preset.

### Follow-up: Time model

| Option | Description | Selected |
|--------|-------------|----------|
| Fill start/end times | Presets set time portion of existing start_at/end_at fields, no schema changes | :heavy_check_mark: |
| Separate daypart windows | Independent daypart time slots, requires schema changes | |
| You decide | Claude picks | |

**User's choice:** Fill start/end times
**Notes:** Simple approach, no schema changes needed.

---

## Analytics View Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New section in editor | Analytics section/card within CampaignEditorPage, no new route | :heavy_check_mark: |
| Separate page/route | New /app/campaigns/:id/analytics page | |
| Tab within editor | Tab bar switching between Edit and Analytics | |
| You decide | Claude picks | |

**User's choice:** New section in editor
**Notes:** Keeps stats in context with the campaign being edited.

### Follow-up: Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Only existing campaigns | Analytics section only for campaigns with an ID | :heavy_check_mark: |
| Always visible | Show for all campaigns including new ones | |
| You decide | Claude picks | |

**User's choice:** Only existing campaigns
**Notes:** New campaigns have no stats, showing section would be empty noise.

---

## Stats Data Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Stat cards | Row of cards with big numbers and Lucide icons, matching AnalyticsPage | :heavy_check_mark: |
| Add recharts | Install charting library for bar/line charts | |
| You decide | Claude picks | |

**User's choice:** Stat cards
**Notes:** No new dependencies, consistent with existing app patterns.

### Follow-up: Date range

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed last 30 days | Default 30-day range, no extra UI | :heavy_check_mark: |
| Date range picker | Start/end date inputs for custom periods | |
| Preset range buttons | Quick buttons: 7d / 30d / 90d / All time | |
| You decide | Claude picks | |

**User's choice:** Fixed last 30 days
**Notes:** Matches getCampaignStats default. Good enough for gap-fix milestone.

---

## Empty & Loading States

| Option | Description | Selected |
|--------|-------------|----------|
| Stat cards showing zeros | Same 3 cards with 0 values and "No playback data yet" note | :heavy_check_mark: |
| Illustration empty state | Centered illustration with message | |
| You decide | Claude picks | |

**User's choice:** Stat cards showing zeros
**Notes:** Consistent layout, no jarring changes when data arrives.

---

## Claude's Discretion

- Specific time ranges for each dayparting preset
- Exact stat card layout and icon choices
- Loading skeleton vs spinner for analytics section

## Deferred Ideas

None — discussion stayed within phase scope.
