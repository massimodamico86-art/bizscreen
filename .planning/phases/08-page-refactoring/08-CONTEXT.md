# Phase 8: Page Refactoring - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose large page components (MediaLibraryPage, ScreensPage, PlaylistEditorPage, CampaignEditorPage, FeatureFlagsPage) into maintainable sub-components. Apply the custom hook extraction pattern proven in Phase 7. Target ~500 lines per page with extracted hooks tested.

</domain>

<decisions>
## Implementation Decisions

### Extraction Scope
- Claude has full discretion on hooks vs components
- May extract both hooks AND sub-components where beneficial
- May create shared hooks if logic is clearly duplicated
- File organization (current structure vs feature folders) decided per page
- Inline utilities moved to shared utils only if clearly reusable

### Page Priority
- No specific pages have urgent feature work pending
- Claude determines order based on file complexity and dependencies
- May defer lower-value pages if scope becomes excessive

### Test Strategy
- Claude decides whether to write characterization tests before vs unit tests after
- Test coverage depth determined by hook complexity
- Test location follows existing project conventions (tests/unit/)
- Manual browser verification at Claude's discretion based on risk

### Completeness Threshold
- 500 lines is a guideline, not a strict limit
- Readability prioritized over arbitrary line count
- Well-structured pages may not need refactoring
- JSDoc added where complexity warrants it

### Claude's Discretion
All aspects of this phase are at Claude's discretion:
- Extraction approach (hooks only vs hooks + components)
- Shared vs page-specific hooks
- File organization pattern
- Page order and scope
- Test timing and coverage
- Line count flexibility
- Documentation depth

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following Phase 7 patterns.

Phase 7 established:
- Custom hooks in src/player/hooks/ with barrel export
- Hook unit tests with localStorage mocking
- Player.jsx reduced 720 lines (21%) through hook extraction
- usePlayerContent, usePlayerHeartbeat, usePlayerCommands, useKioskMode, usePlayerPlayback as reference patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-page-refactoring*
*Context gathered: 2026-01-23*
