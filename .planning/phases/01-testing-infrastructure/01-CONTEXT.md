# Phase 1: Testing Infrastructure - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Characterization tests for Player.jsx that capture current behavior AND verify correctness, enabling safe refactoring in later phases. Tests cover offline mode transitions, content sync, heartbeat reconnection, and critical service functions.

</domain>

<decisions>
## Implementation Decisions

### Test scope & depth
- Tests must both capture current behavior AND verify it's correct before locking it in
- Comprehensive coverage: success paths, failure modes, edge cases, boundary conditions
- All Phase 1 success criteria must have explicit tests
- Non-negotiable behaviors: offline resilience, content sync accuracy

### Mocking strategy
- Full mocks for Supabase (database/auth) — no external dependencies, fast tests
- Claude's discretion: network simulation approach (mock fetch vs service layer)
- Claude's discretion: browser API mocking (jsdom vs explicit mocks)
- Claude's discretion: test data complexity (realistic vs minimal per test)

### Critical paths
- Offline playback, schedule accuracy, and error recovery are all equally critical
- Full offline lifecycle must be tested:
  - Clean transition: network drops → player switches to cached content
  - Extended offline: player runs for hours, content rotates correctly
  - Reconnection sync: network returns → player fetches updates without disrupting display
- Schedule edge cases: timezone/DST changes, overlapping content, empty schedule gaps
- Confidence level: tests pass AND coverage metrics meet threshold before Phase 7

### Claude's Discretion
- Test file location (co-located vs separate folder)
- Testing framework choice (Vitest vs Jest based on project setup)
- Test description style (behavior-focused vs implementation-focused)
- Coverage threshold percentage (set based on risk areas)
- Black box vs internal testing mix based on what's being tested

</decisions>

<specifics>
## Specific Ideas

- Tests are the safety net that enables Phase 7 (Player Refactoring) — they must provide high confidence
- Coverage metrics matter: "tests pass" isn't enough, coverage threshold must be met
- Offline mode is the core value proposition — test the full lifecycle, not just the transition

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-testing-infrastructure*
*Context gathered: 2026-01-22*
