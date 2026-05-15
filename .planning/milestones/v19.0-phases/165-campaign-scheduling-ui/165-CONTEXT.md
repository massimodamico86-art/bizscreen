# Phase 165: Campaign Scheduling UI - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds two features to CampaignEditorPage: (1) dayparting preset chips that auto-fill schedule time ranges, and (2) a campaign analytics section displaying stats from getCampaignStats(). No new routes, no schema changes, no new dependencies.

</domain>

<decisions>
## Implementation Decisions

### Dayparting Presets UX
- **D-01:** Presets displayed as a chip/button group (Morning, Afternoon, Evening, Late Night) above the existing start/end time fields
- **D-02:** Selecting a preset auto-fills the time portion of start_at/end_at fields; dates remain user-controlled
- **D-03:** If user manually edits times after selecting a preset, the preset chip deselects (indicating custom schedule)
- **D-04:** Re-selecting a preset resets times to the preset values
- **D-05:** Presets fill into the existing start_at/end_at data model — no schema changes needed

### Analytics View Placement
- **D-06:** Analytics displayed as a new section/card within CampaignEditorPage (not a separate route or tab)
- **D-07:** Analytics section only visible when editing an existing campaign (not for new/unsaved campaigns)

### Stats Data Presentation
- **D-08:** Stats displayed as stat cards (Impressions, Play Counts, Duration) with big numbers and Lucide icons — matching existing AnalyticsPage pattern
- **D-09:** No charting library added — stat cards only, consistent with rest of the app
- **D-10:** Fixed last-30-days date range (matching getCampaignStats default) — no date range picker

### Empty & Loading States
- **D-11:** Empty state shows the same 3 stat cards with zero values and a subtle note: "No playback data yet"
- **D-12:** Loading state uses existing app loading patterns (spinner or skeleton as appropriate)

### Claude's Discretion
- Specific time ranges for each preset (e.g., Morning = 6:00-12:00)
- Exact stat card layout and icon choices
- Loading skeleton vs spinner for analytics section

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Campaign Service
- `src/services/campaignService.js` — getCampaignStats() RPC call, campaign CRUD, status constants
- `src/pages/CampaignEditorPage.jsx` — existing editor where both features will be added

### Existing Patterns
- `src/pages/AnalyticsPage.jsx` — stat card pattern to follow for analytics display
- `src/design-system/index.js` — Card, Button, Badge components available

### Requirements
- `.planning/REQUIREMENTS.md` — SCHED-01 (dayparting presets), SCHED-02 (campaign analytics)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component from design system — use for stat cards and preset section
- `Button` / `Badge` from design system — use for preset chips
- `getCampaignStats()` — already implemented, accepts startDate/endDate, returns stats array
- `get_campaign_playback_stats` RPC — database function already exists
- Lucide icons (BarChart3, Play, Clock) — already imported across analytics pages

### Established Patterns
- CampaignEditorPage uses inline sections (details, schedule, targets, content) — analytics section follows same pattern
- AnalyticsPage displays stats as Card grids with numbers and icons — no charting library
- Campaign state model: { name, description, status, start_at, end_at, priority, targets, contents }

### Integration Points
- Dayparting presets integrate into the existing Schedule section (lines ~600-630 of CampaignEditorPage.jsx)
- Analytics section added below existing sections, only when `!isNew`
- getCampaignStats() called on mount for existing campaigns

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for preset time ranges and stat formatting.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 165-campaign-scheduling-ui*
*Context gathered: 2026-04-11*
