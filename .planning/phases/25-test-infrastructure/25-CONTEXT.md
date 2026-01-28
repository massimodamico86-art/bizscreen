# Phase 25: Test Infrastructure - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 18-19 failing service tests, resolve circular dependencies (loggingService/supabase imports), and document patterns for future tests. Coverage focuses on scheduleService, offlineService, and playerService critical paths. TEST-PATTERNS.md provides reusable examples.

</domain>

<decisions>
## Implementation Decisions

### Failing Test Handling
- Case-by-case triage for each broken test (fix vs delete based on analysis)
- Priority: Critical path services first (scheduleService, offlineService, playerService)
- Complex rewrites are acceptable — invest time to fix properly
- All tests must pass, even non-critical services (simplify if needed, no skipping)

### Mock Strategy
- Shared mock module for Supabase (__mocks__/supabase.js)
- Auto-mock loggingService globally in setupTests.js
- Shared fixtures folder (src/__fixtures__/) for test data (screens, playlists, schedules)

### Coverage Scope
- Comprehensive coverage for scheduleService (happy paths, edge cases, timezone/DST, errors)
- Full playback state coverage for playerService (content resolution, rotation, stuck detection, error recovery)
- Match comprehensive standard across ALL services, not just critical ones

### Pattern Documentation
- Quick reference format — cheat sheet style, copy-paste examples
- Examples cover: mock patterns, test structure, AND edge case testing
- Include anti-patterns with examples (what NOT to do and why)
- Location: project root (TEST-PATTERNS.md next to README.md)

### Claude's Discretion
- Third-party library mocking (date-fns, etc.) — decide per-case
- offlineService test approach — decide based on feasibility (mock IndexedDB vs unit test logic)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-test-infrastructure*
*Context gathered: 2026-01-28*
