# Phase 19: Templates Intelligence - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Smart template discovery through personalized suggestions, community ratings, and usage analytics. Users get template recommendations based on their industry, can rate templates with stars, and see which templates they use most. Creating new suggestion algorithms or building a full analytics dashboard are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Suggestion Placement
- Dedicated "Suggested for You" section in marketplace sidebar
- Also show "Similar templates" after Quick Apply action
- Sidebar placement gives persistent access without interrupting browse flow

### Rating System
- Stars only (1-5), no written reviews
- Users can update or remove their rating anytime
- Rate from preview panel only, no prompt after apply
- Keeps rating simple and unobtrusive

### Analytics Presentation
- Personal usage stats only (not global popularity data)
- Show usage count metric (how many times applied)
- Display as badge on template card (e.g., "Used 5x")
- Lightweight, integrated into existing browse experience

### Suggestion Logic
- Primary factor: User's industry from onboarding
- Fallback when no industry set: Show popular templates across platform
- Post-apply "similar templates" based on same category
- Industry matching uses existing tenant industry field

### Claude's Discretion
- Number of templates to suggest (sidebar and post-apply)
- Suggestion refresh behavior (auto vs on-demand)
- Rating visibility (anonymous aggregate vs individual raters)
- Whether usage badge appears on unused templates
- Whether to exclude already-applied templates from suggestions

</decisions>

<specifics>
## Specific Ideas

- Suggestions should feel helpful, not pushy — sidebar section is passive discovery
- Post-apply suggestions are the "you might also like" moment
- Usage badges give users insight into their own patterns without dashboard overhead

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-templates-intelligence*
*Context gathered: 2026-01-26*
