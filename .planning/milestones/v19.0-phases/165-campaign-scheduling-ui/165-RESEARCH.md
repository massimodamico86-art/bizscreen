# Phase 165: Campaign Scheduling UI - Research

**Researched:** 2026-04-11
**Domain:** React UI — CampaignEditorPage enhancement (dayparting presets + campaign analytics)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dayparting Presets UX**
- D-01: Presets displayed as a chip/button group (Morning, Afternoon, Evening, Late Night) above the existing start/end time fields
- D-02: Selecting a preset auto-fills the time portion of start_at/end_at fields; dates remain user-controlled
- D-03: If user manually edits times after selecting a preset, the preset chip deselects (indicating custom schedule)
- D-04: Re-selecting a preset resets times to the preset values
- D-05: Presets fill into the existing start_at/end_at data model — no schema changes needed

**Analytics View Placement**
- D-06: Analytics displayed as a new section/card within CampaignEditorPage (not a separate route or tab)
- D-07: Analytics section only visible when editing an existing campaign (not for new/unsaved campaigns)

**Stats Data Presentation**
- D-08: Stats displayed as stat cards (Impressions, Play Counts, Duration) with big numbers and Lucide icons — matching existing AnalyticsPage pattern
- D-09: No charting library added — stat cards only, consistent with rest of the app
- D-10: Fixed last-30-days date range (matching getCampaignStats default) — no date range picker

**Empty & Loading States**
- D-11: Empty state shows the same 3 stat cards with zero values and a subtle note: "No playback data yet"
- D-12: Loading state uses existing app loading patterns (spinner or skeleton as appropriate)

### Claude's Discretion
- Specific time ranges for each preset (e.g., Morning = 6:00-12:00)
- Exact stat card layout and icon choices
- Loading skeleton vs spinner for analytics section

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHED-01 | User can select dayparting presets (Morning, Afternoon, Evening, Late Night) when editing a campaign schedule | FilterChips/ToggleChips from design system; preset constants map to datetime-local string manipulation; integrate at lines ~605-632 of CampaignEditorPage.jsx |
| SCHED-02 | User can see campaign performance analytics (impressions, play counts, duration) in a dedicated analytics view | getCampaignStats() already implemented in campaignService.js; StatCard from design system; section added below existing sections, gated on !isNew |
</phase_requirements>

## Summary

Phase 165 adds two contained UI features to CampaignEditorPage.jsx — both are pure React additions with zero schema changes, zero new dependencies, and zero new routes.

**Feature 1: Dayparting presets.** The existing schedule section (lines ~605-632) has two `datetime-local` inputs for `start_at` and `end_at`. Presets will sit above these inputs as a chip group. A preset selection writes only the time portion into the existing field values, preserving the user-entered date. Manual time edits clear the active preset. The `ToggleChips` component from the design system (`src/design-system/components/FilterChips.jsx`) is the correct primitive — it handles single selection, active state styling, and deselection-on-reclick.

**Feature 2: Campaign analytics section.** `getCampaignStats()` in `campaignService.js` already calls the `get_campaign_playback_stats` Supabase RPC and returns an array of per-campaign stat rows. The analytics section calls this on mount (for existing campaigns only), filters for the current campaign's row, and renders three `StatCard` components — matching the pattern in `AnalyticsPage.jsx`. The `StatCard` component in the design system accepts `title`, `value`, and `icon` props and renders a self-contained card with big number display.

**Primary recommendation:** Both features are straightforward in-place edits to CampaignEditorPage.jsx. New state variables for `selectedPreset` and `campaignStats`/`statsLoading`. No new files required unless a separate `DaypartingPresets` sub-component aids readability.

## Standard Stack

### Core (all already in use — no installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | project version | Component state, useEffect for stats load | Already installed |
| ToggleChips | design-system | Preset chip group (single-select) | Already in design-system/index.js |
| StatCard | design-system | Analytics stat cards | Already exported from design-system/index.js |
| getCampaignStats | campaignService.js | Fetches playback stats via Supabase RPC | Already implemented |
| Lucide React | project version | Icons (BarChart3, Play, Clock) | Already imported in AnalyticsPage |

[VERIFIED: codebase grep] ToggleChips and StatCard are both exported from `src/design-system/index.js` and implemented in their respective component files.

[VERIFIED: codebase read] `getCampaignStats()` is fully implemented in `src/services/campaignService.js` at line 519 — accepts optional startDate/endDate, defaults to last 30 days.

### Installation
```bash
# No new packages required — all components and services already exist
```

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes go into:
```
src/pages/CampaignEditorPage.jsx    # primary edit target
src/services/campaignService.js     # read-only (getCampaignStats already implemented)
src/design-system/index.js          # read-only (ToggleChips, StatCard already exported)
```

Optional (if sub-component extraction aids readability):
```
src/pages/campaign/DaypartingPresets.jsx   # optional extraction
src/pages/campaign/CampaignAnalytics.jsx   # optional extraction
```

### Pattern 1: Dayparting Preset State Management

**What:** A single `selectedPreset` state variable (string | null) tracks which preset is active. Preset selection writes time into the existing `start_at`/`end_at` via the existing `handleChange` function. Manual time edits call `setSelectedPreset(null)` to deselect.

**When to use:** Single-selection preset group where selection modifies other fields.

**Example:**
```javascript
// Source: derived from existing handleChange pattern in CampaignEditorPage.jsx

const DAYPART_PRESETS = [
  { id: 'morning',    label: 'Morning',    startTime: '06:00', endTime: '12:00' },
  { id: 'afternoon',  label: 'Afternoon',  startTime: '12:00', endTime: '18:00' },
  { id: 'evening',    label: 'Evening',    startTime: '18:00', endTime: '22:00' },
  { id: 'late_night', label: 'Late Night', startTime: '22:00', endTime: '23:59' },
];

const [selectedPreset, setSelectedPreset] = useState(null);

const handlePresetSelect = (presetId) => {
  if (selectedPreset === presetId) {
    // Toggle off — deselect without clearing times
    setSelectedPreset(null);
    return;
  }
  const preset = DAYPART_PRESETS.find(p => p.id === presetId);
  if (!preset) return;
  setSelectedPreset(presetId);

  // Preserve existing date, replace time portion only
  const existingStart = campaign.start_at ? campaign.start_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const existingEnd   = campaign.end_at   ? campaign.end_at.slice(0, 10)   : new Date().toISOString().slice(0, 10);
  handleChange('start_at', `${existingStart}T${preset.startTime}`);
  handleChange('end_at',   `${existingEnd}T${preset.endTime}`);
};

// In the time input onChange handlers:
const handleStartAtChange = (value) => {
  handleChange('start_at', value);
  setSelectedPreset(null); // D-03: manual edit clears preset
};
```

### Pattern 2: Campaign Analytics Loading

**What:** `useEffect` on mount (for existing campaigns) calls `getCampaignStats()`, finds the current campaign's row, and stores the stat values. Loading and error states are tracked separately.

**Example:**
```javascript
// Source: getCampaignStats signature from src/services/campaignService.js line 519

const [campaignStats, setCampaignStats] = useState(null);
const [statsLoading, setStatsLoading] = useState(false);

useEffect(() => {
  if (isNew || !campaignId) return;
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const rows = await getCampaignStats(); // defaults to last 30 days
      // getCampaignStats returns all campaigns' stats — filter for current
      const row = rows.find(r => r.campaign_id === campaignId) || null;
      setCampaignStats(row);
    } catch (err) {
      console.error('Failed to load campaign stats:', err);
      // D-11: empty state handles null gracefully — no error UI needed
    } finally {
      setStatsLoading(false);
    }
  };
  loadStats();
}, [campaignId, isNew]);
```

### Pattern 3: Stat Cards Rendering (matching AnalyticsPage)

**What:** Three `StatCard` components in a grid, sourced from the design system. Uses the same `bg-*-100` icon container pattern seen in AnalyticsPage. Labels match D-08 exactly: "Impressions", "Play Counts", "Duration".

**RPC field mapping (verified against migration SQL):**
- D-08 "Impressions" -> `unique_screens` (screens reached = impressions in digital signage)
- D-08 "Play Counts" -> `play_count` (total playback events)
- D-08 "Duration" -> `total_playback_seconds` (formatted via formatDuration)

**Example:**
```javascript
// Source: StatCard API from src/design-system/components/Card.jsx line 276
// Pattern: AnalyticsPage.jsx inline card pattern (lines 292-357)

import { StatCard } from '../design-system';
import { BarChart3, Play, Clock } from 'lucide-react';

// In render, below existing sections, gated on !isNew:
{!isNew && (
  <Card className="p-6">
    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
      <BarChart3 className="w-5 h-5 text-blue-600" aria-hidden="true" />
      Campaign Analytics
    </h2>
    <p className="text-sm text-gray-500 mb-4">Last 30 days</p>

    {statsLoading ? (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true" />
      </div>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="Impressions"
            value={campaignStats?.unique_screens ?? 0}
            icon={<Monitor className="w-5 h-5" />}
          />
          <StatCard
            title="Play Counts"
            value={campaignStats?.play_count ?? 0}
            icon={<Play className="w-5 h-5" />}
          />
          <StatCard
            title="Duration"
            value={formatDuration(campaignStats?.total_playback_seconds ?? 0)}
            icon={<Clock className="w-5 h-5" />}
          />
        </div>
        {!campaignStats && (
          <p className="text-sm text-gray-500 text-center mt-3">No playback data yet</p>
        )}
      </>
    )}
  </Card>
)}
```

### Anti-Patterns to Avoid

- **Separate route for analytics:** D-06 locks this to an inline section. No new routes.
- **Adding a charting library:** D-09 explicitly forbids this. Stat cards only.
- **Fetching stats for new campaigns:** D-07 gates the section on `!isNew`. The `getCampaignStats()` call must be inside a `!isNew` guard.
- **Using FilterChips instead of ToggleChips:** FilterChips is multi-select friendly; ToggleChips is the correct single-selection primitive for preset chips.
- **Overwriting dates when a preset is selected:** D-02 requires preserving the date portion. Only the `T{HH:MM}` part of the datetime-local value changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chip/toggle group | Custom button group with manual active state | `ToggleChips` from design system | Already handles active state, styling variants, deselect logic |
| Stat card layout | div-with-big-number | `StatCard` from design system | Consistent padding, typography, icon container, responsive |
| Stats RPC call | Direct supabase.rpc() | `getCampaignStats()` from campaignService | Handles tenant_id resolution, date defaults, error normalization |
| Duration formatting | Custom `Math.floor` logic | `formatDuration` from analyticsService | Already handles h/m/s edge cases correctly |

**Key insight:** Every primitive needed for this phase already exists in the codebase. The implementation is purely assembly — wiring existing components and services together.

## Common Pitfalls

### Pitfall 1: getCampaignStats returns all campaigns, not just the current one
**What goes wrong:** Developer calls `getCampaignStats()` and uses `data[0]` assuming it returns only the current campaign's stats.
**Why it happens:** The function returns an array of all campaigns' stats for the tenant.
**How to avoid:** Filter the result: `rows.find(r => r.campaign_id === campaignId)`. If not found, treat as null (empty state).
**Warning signs:** Stats show wrong numbers for campaigns that have playback data.

### Pitfall 2: Preset overwrites the date portion of start_at/end_at
**What goes wrong:** Selecting "Morning" sets `start_at` to just `"T06:00"` with no date, breaking the datetime-local input.
**Why it happens:** Not slicing `campaign.start_at` to extract the date before concatenating the new time.
**How to avoid:** Always extract `campaign.start_at.slice(0, 10)` for the date prefix. Fall back to `new Date().toISOString().slice(0, 10)` if `start_at` is empty.
**Warning signs:** The datetime input shows an invalid/empty value after selecting a preset.

### Pitfall 3: Late Night preset spanning midnight
**What goes wrong:** Late Night (22:00-06:00) has an end time earlier than the start time, which may confuse the date logic.
**How to avoid:** Use 22:00-23:59 (same-day) to avoid midnight-crossing complexity. This is Claude's discretion per CONTEXT.md.
**Warning signs:** Campaigns with Late Night preset show end_at before start_at.

### Pitfall 4: ToggleChips `onChange` not clearing preset on manual time edit
**What goes wrong:** User selects "Morning", then manually edits the time — the "Morning" chip stays highlighted, misleading the user into thinking the preset is still active.
**Why it happens:** The `onChange` on the time inputs doesn't call `setSelectedPreset(null)`.
**How to avoid:** Wrap each time field's `onChange` to also clear `selectedPreset`. See Pattern 1 example (`handleStartAtChange`).
**Warning signs:** Preset chip remains selected after user changes start/end time manually.

### Pitfall 5: Stats section visible for `isNew` campaigns
**What goes wrong:** `getCampaignStats()` is called before the campaign has an ID, producing a query error or always returning empty state.
**How to avoid:** Gate both the render and the useEffect on `!isNew`.
**Warning signs:** Console errors on the `/app/campaigns/new` page.

## getCampaignStats() Return Shape

[VERIFIED: migration SQL — supabase/migrations/026_screen_groups_and_campaigns.sql line 930]

The RPC `get_campaign_playback_stats` returns rows with these columns:
- `campaign_id` UUID
- `campaign_name` TEXT
- `campaign_status` TEXT
- `total_playback_seconds` BIGINT
- `unique_screens` BIGINT
- `unique_locations` BIGINT
- `play_count` BIGINT

**D-08 label-to-column mapping:**
- "Impressions" -> `unique_screens` (screens reached = impressions in digital signage context)
- "Play Counts" -> `play_count` (total playback events)
- "Duration" -> `total_playback_seconds` (formatted via `formatDuration()`)

## Code Examples

### Dayparting Preset Constants
```javascript
// Source: Claude's discretion (CONTEXT.md) — time ranges chosen for non-overlapping coverage
// Late Night uses 22:00-23:59 to avoid midnight-crossing complexity
const DAYPART_PRESETS = [
  { id: 'morning',    label: 'Morning',    startTime: '06:00', endTime: '12:00' },
  { id: 'afternoon',  label: 'Afternoon',  startTime: '12:00', endTime: '18:00' },
  { id: 'evening',    label: 'Evening',    startTime: '18:00', endTime: '22:00' },
  { id: 'late_night', label: 'Late Night', startTime: '22:00', endTime: '23:59' },
];
```

### ToggleChips Usage (from design system)
```javascript
// Source: src/design-system/components/FilterChips.jsx line 181
// ToggleChips handles: single-select, active state (bg-brand-500), icons optional
import { ToggleChips } from '../design-system';

<ToggleChips
  options={DAYPART_PRESETS}
  selected={selectedPreset}
  onChange={handlePresetSelect}
  variant="primary"
/>
```

### Import additions needed in CampaignEditorPage.jsx
```javascript
// Add to existing imports:
import { ToggleChips, StatCard } from '../design-system';
import { getCampaignStats } from '../services/campaignService';
import { formatDuration } from '../services/analyticsService';
import { BarChart3 } from 'lucide-react'; // Play and Clock already imported
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom button groups for filters | FilterChips / ToggleChips from design system | Added in prior milestone | Use design system components, not hand-rolled buttons |
| Inline analytics stat divs | StatCard design system component | Added in prior milestone | Consistent typography and layout |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `get_campaign_playback_stats` returns rows with `campaign_id`, `play_count`, `total_playback_seconds`, `unique_screens`, `unique_locations` fields | Architecture Patterns / Stat Cards | RESOLVED — verified against migration SQL (026_screen_groups_and_campaigns.sql line 930) |
| A2 | Late Night preset uses 22:00-23:59 (no midnight crossing) | Code Examples | RESOLVED — chosen to avoid date arithmetic complexity; Claude's discretion per CONTEXT.md |

## Open Questions (RESOLVED)

1. **RPC column names for getCampaignStats** — RESOLVED
   - What we know: The function calls `get_campaign_playback_stats` RPC and returns an array
   - Resolution: Verified against migration SQL (026_screen_groups_and_campaigns.sql line 930). Columns are: `campaign_id`, `campaign_name`, `campaign_status`, `total_playback_seconds`, `unique_screens`, `unique_locations`, `play_count`. D-08 label "Impressions" maps to `unique_screens` (screens reached), "Play Counts" maps to `play_count`, "Duration" maps to `total_playback_seconds`.

2. **Late Night preset midnight-crossing behavior** — RESOLVED
   - What we know: Claude has discretion over exact time ranges
   - Resolution: Use 22:00-23:59 (same-day) to avoid date arithmetic complexity. Documented in DAYPART_PRESETS constant and plan Task 1.

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This is a pure UI code change. All required tools (React, Supabase client, Lucide icons) are already installed in the project.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright |
| Config file | `playwright.config.js` |
| Quick run command | `npx playwright test tests/e2e/campaigns.spec.js` |
| Full suite command | `npx playwright test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | User selects Morning preset and sees time fields auto-fill | E2E | `npx playwright test tests/e2e/campaigns.spec.js` | Partial — campaigns.spec.js exists but has no preset tests |
| SCHED-02 | Analytics section renders with stat cards for existing campaign | E2E | `npx playwright test tests/e2e/campaigns.spec.js` | Partial — campaigns.spec.js exists but has no analytics section tests |
| SCHED-02 | Analytics renders without error when no stats available | E2E | `npx playwright test tests/e2e/campaigns.spec.js` | Partial — campaigns.spec.js exists but has no empty-state test |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/campaigns.spec.js --project=chromium`
- **Per wave merge:** `npx playwright test tests/e2e/campaigns.spec.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Add preset chip tests to `tests/e2e/campaigns.spec.js` — covers SCHED-01 (chip visible, time auto-fills, manual edit deselects)
- [ ] Add analytics section tests to `tests/e2e/campaigns.spec.js` — covers SCHED-02 (section visible for existing campaign, stat cards render, empty state)
- [ ] No new test files needed — existing campaigns.spec.js is the right home

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `canEdit` gate already in CampaignEditorPage; analytics section read-only, no additional gate needed |
| V5 Input Validation | yes | Preset time values are hardcoded constants — no user-supplied input reaches the RPC |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized stats read | Information Disclosure | getCampaignStats uses tenant_id from authenticated user profile — existing control is sufficient |
| Time injection via preset | Tampering | Preset times are hardcoded constants; datetime-local input is browser-validated |

## Sources

### Primary (HIGH confidence)
- Codebase read: `src/services/campaignService.js` — getCampaignStats() signature, return shape, tenant scoping
- Codebase read: `src/pages/CampaignEditorPage.jsx` — state model, handleChange pattern, schedule section lines, isNew flag
- Codebase read: `src/design-system/components/FilterChips.jsx` — ToggleChips API (props: options, selected, onChange, variant)
- Codebase read: `src/design-system/components/Card.jsx` — StatCard API (props: title, value, icon, description, change)
- Codebase read: `src/pages/AnalyticsPage.jsx` — stat card rendering pattern to match
- Codebase read: `src/design-system/index.js` — confirmed ToggleChips and StatCard are exported
- Codebase read: `supabase/migrations/026_screen_groups_and_campaigns.sql` — verified RPC column names

### Secondary (MEDIUM confidence)
- Codebase read: `src/services/analyticsService.js` — formatDuration() utility (verified implementation)
- Codebase read: `tests/e2e/campaigns.spec.js` — confirmed existing test file covers campaigns but has no preset/analytics tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified by direct codebase read
- Architecture: HIGH — patterns verified from existing AnalyticsPage and CampaignEditorPage code
- Pitfalls: HIGH — derived directly from code inspection of getCampaignStats return and datetime-local field handling
- RPC column names: HIGH — verified against migration SQL

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable codebase — no external dependencies)
