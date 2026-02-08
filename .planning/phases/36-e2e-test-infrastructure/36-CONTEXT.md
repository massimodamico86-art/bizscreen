# Phase 36: E2E Test Infrastructure - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the test infrastructure reliable so tests don't fail due to shared state, flaky setup/teardown, or infrastructure issues. This phase fixes the test runner mechanics — not the tests themselves (that's Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions — this is a technical infrastructure phase.

Claude has full discretion on:
- Test isolation patterns (per-file, per-test, browser context strategy)
- Setup/teardown hook organization (beforeAll/afterAll, beforeEach/afterEach)
- Shared state cleanup approaches
- Parallelization configuration
- Failure diagnostic output (screenshots, videos, logs)
- Test execution time optimization

</decisions>

<specifics>
## Known Facts

Current test state (from STATE.md):
- 460 tests failing (mostly timeout-related)
- 382 tests passing
- 321 tests skipped
- Target: 90%+ pass rate by Phase 38

Success criteria from roadmap:
1. Tests do not fail due to shared state between test files
2. Setup and teardown hooks execute correctly and consistently
3. Test execution time remains under reasonable limits (no regressions)
4. Test isolation is verified (each test can run independently)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-e2e-test-infrastructure*
*Context gathered: 2026-02-07*
