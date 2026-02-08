# Phase 37: E2E Test Stabilization - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate timeout and flaky test failures. Tests that currently fail intermittently or due to timing issues will be stabilized to pass consistently. This phase fixes existing tests — writing new tests or expanding coverage is a separate concern.

</domain>

<decisions>
## Implementation Decisions

### Fix Prioritization
- Fix by test category (not by failure frequency or ease)
- Category order: Claude's discretion based on dependencies and failure patterns
- Fully stabilize ALL tests in each category before moving to the next
- Plan structure: Claude's discretion (one plan per category vs comprehensive)

### Verification Approach
- 5 consecutive runs required to consider a test stable
- Verification must pass BOTH locally AND in CI
- Parallel vs serial runs: Claude's discretion
- Near-misses (4/5 passes): Investigate further, fix root cause, restart the 5-run count

### Unfixable Test Policy
- Default action: Skip with `test.skip()` annotation
- Effort limit: Claude's discretion based on test complexity and value
- Skip annotations must include: reason, what was tried, suggested fix approach
- Create centralized SKIPPED-TESTS.md tracking all skipped tests

### Timeout Configuration
- Global test timeout: 30 seconds (keep current)
- Per-test overrides: Allowed for complex multi-step flows only
- Navigation vs action timeouts: Claude's discretion based on Playwright best practices
- Explicit `waitForTimeout()` calls: Remove ALL, replace with proper auto-waiting patterns

### Claude's Discretion
- Test category order (based on dependencies and failure patterns)
- Plan structure (one per category vs comprehensive)
- Parallel vs serial for verification runs
- Effort threshold before marking test as unfixable
- Navigation timeout separation from action timeouts

</decisions>

<specifics>
## Specific Ideas

- "Remove all explicit waits" — user wants proper Playwright auto-waiting everywhere, no hardcoded delays
- Thorough verification required — both local AND CI must pass 5x
- No half-measures on near-misses — if a test fails even 1 of 5 runs, investigate root cause

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-e2e-test-stabilization*
*Context gathered: 2026-02-08*
