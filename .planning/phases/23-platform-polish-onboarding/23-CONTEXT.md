# Phase 23: Platform Polish - Onboarding - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

New users have smooth onboarding with welcome tour, starter packs, and industry-specific suggestions. Users can skip onboarding and access it later from settings. Creating new starter packs or new industry categories are separate concerns.

</domain>

<decisions>
## Implementation Decisions

### Welcome Tour Flow
- Modal wizard format (full-screen steps with Next/Back buttons)
- Medium length: 5-6 steps covering core features plus templates and media library
- Tour ends with call-to-action: "Get started with starter pack"
- Not tooltip-based or video-based

### Industry Selection
- Happens on first dashboard visit (after login, before they see the dashboard)
- Expanded industry list (10-12 options): Restaurant, Retail, Salon, Fitness, Healthcare, Hotel, Education, Corporate, Real Estate, Auto, etc.
- Grid of cards with icons presentation (visual cards, one-click to select)
- Industry can be changed later in settings (affects template suggestions)

### Starter Pack Selection
- Offered in two places: right after industry selection AND accessible from tour end CTA
- Thumbnails by default with "Preview" link to expand and see included templates
- One pack only during onboarding, can add more from templates marketplace later
- Immediate apply after selection (no customization wizard in onboarding flow)

### Skip/Resume Behavior
- Subtle skip link (small, doesn't compete with primary actions)
- Onboarding accessible later from both Settings page AND Help menu
- If skipped partway, ask user "Resume or start over?" when they return
- Dashboard banner shown once on next visit if onboarding incomplete ("Complete your setup")

### Claude's Discretion
- Visual design for each tour step (illustrations, screenshots, or icons)
- Specific feature order within the 5-6 tour steps
- Exact wording and copywriting
- Animation/transition between steps

</decisions>

<specifics>
## Specific Ideas

- Tour should feel modern and quick — not overwhelming
- Industry selection inspired by iOS app category pickers
- Starter packs should leverage the existing starter pack infrastructure from Phase 18

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-platform-polish-onboarding*
*Context gathered: 2026-01-27*
