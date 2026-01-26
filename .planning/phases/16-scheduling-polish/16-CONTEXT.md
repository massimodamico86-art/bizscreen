# Phase 16: Scheduling Polish - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Advanced scheduling controls: campaign analytics, percentage-based content rotation, frequency limits, reusable campaign templates, and seasonal auto-activation. This extends the scheduling infrastructure from Phases 14-15.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User has given Claude full discretion on all implementation choices for this phase. Claude should make sensible decisions based on:

**Analytics presentation:**
- Which metrics to show (play counts, duration, device reach, etc.)
- Visualization approach (charts, cards, or both)
- Time range selection (presets, custom picker, or both)
- Where analytics live (campaign detail page, dedicated page, or both)

**Rotation control:**
- Input method for rotation (explicit percentages, weights, or equal split)
- Behavior when content unavailable (redistribute, fallback, skip)
- Visual feedback for rotation distribution
- When rotation is applied (per play, per day, strict sequence)

**Frequency limits:**
- Time periods supported (hourly, daily, flexible)
- Behavior when limit reached (skip, log, fallback)
- Granularity (per content, per campaign, or both)
- Warning system for restrictive limits

**Campaign templates:**
- What to save (structure only, with content refs, or full snapshot)
- Access pattern (save-as, dedicated section, or both)
- Apply behavior (create new, apply to existing, or both)
- Seasonal campaign activation mechanism

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to make sensible UX and implementation decisions based on existing patterns in the codebase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-scheduling-polish*
*Context gathered: 2026-01-25*
