# Phase 26: Analytics Completion - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Close two specific analytics gaps: template usage tracking for starter pack onboarding and campaign rotation weight enforcement. StarterPackOnboarding records template_id when templates are applied. get_resolved_player_content returns content weighted by campaign rotation settings.

</domain>

<decisions>
## Implementation Decisions

### Template Tracking Scope
- Track starter pack applications only (not future template features)
- Capture: template ID, timestamp, user/org context, customization extent
- Customization extent is a simple boolean (modified yes/no)

### Rotation Weight Algorithm
- Weighted random selection — higher weight = higher probability per rotation
- Enforcement happens server-side via get_resolved_player_content RPC
- Equal weight (or no weight) defaults to equal distribution across items

### Data Granularity
- Template usage aggregatable at: per-template, per-organization, per-screen levels
- Rotation analytics include: selection counts, display duration, weight effectiveness comparison
- All three dimensions allow analyzing actual vs configured distribution

### Retroactive Handling
- Existing campaigns without weights default to equal (weight=1 for all items)
- Weights apply to future playback only — no recalculation of history

### Claude's Discretion
- Storage location for template usage records (existing analytics vs dedicated table)
- Offline player handling for weighted rotation (cache all vs pre-select sequence)
- Data retention policy (indefinite vs rolling window)
- Dashboard visualization scope (data capture only vs basic metrics display)
- Template backfill feasibility based on existing data structures
- Historical comparison report value vs complexity
- Transition period transparency markers

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-analytics-completion*
*Context gathered: 2026-01-28*
