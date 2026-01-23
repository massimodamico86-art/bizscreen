# Phase 7: Player Refactoring - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose Player.jsx (1300+ lines) into focused, testable components under 500 lines each. Extract custom hooks (usePlayerContent, usePlayerHeartbeat, usePlayerCommands) and widget components (Clock, Weather, QRCode, Date). Fix PLR-01 gap by consolidating retry logic to use calculateBackoff. All existing tests must pass with identical behavior.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User granted full discretion on all implementation decisions. Claude should make choices based on:

**Hook Boundaries:**
- State sharing approach (context vs props drilling)
- Retry logic placement (within usePlayerHeartbeat or separate usePlayerRetry)
- Command scope (kiosk logic with commands or separate useKioskMode)
- Reusability design (production-focused vs multi-context)

**Widget Extraction:**
- Component logic model (pure presentational vs self-contained)
- Styling approach (theme prop vs CSS tokens)
- Configuration flow (direct props vs config lookup)
- Error handling (callback to parent vs internal fallback)

**File Organization:**
- Root location (src/player/ vs src/components/player/)
- Hook organization (centralized vs colocated)
- Widget structure (folder per widget vs flat files)
- Export strategy (barrel exports vs direct imports)

**Migration Approach:**
- Commit granularity (big bang vs incremental)
- Verification strategy (existing tests vs comparison snapshots)
- Legacy code handling (delete immediately vs keep reference)
- Rollback strategy (git revert vs fix forward)

Claude should analyze codebase patterns and make choices that:
1. Follow existing project conventions
2. Minimize risk during refactoring
3. Maintain test stability
4. Enable future maintenance

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches.

User trusts Claude's judgment on all technical decisions for this refactoring phase.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 07-player-refactoring*
*Context gathered: 2026-01-23*
