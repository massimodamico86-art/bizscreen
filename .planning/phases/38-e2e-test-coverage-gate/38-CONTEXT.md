# Phase 38: E2E Test Coverage Gate - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Achieve and enforce a 90%+ E2E test pass rate. Fix failing tests where possible, document remaining failures with root causes, and set up CI enforcement so the pass rate cannot regress. This phase does NOT add new tests — it stabilizes and gates the existing suite.

</domain>

<decisions>
## Implementation Decisions

### Pass rate measurement
- Best of 3 runs (run tests up to 3 times, take the best result to account for flakiness)
- Chromium only — single browser for the official gate
- Skipped tests are excluded from the total (pass rate = passed / (passed + failed))
- Skipped test count tracked as a separate metric

### Failure triage
- Fix first, skip as last resort — attempt to fix every failing test before skipping
- Valid skip reasons: real app bugs (not test bugs) OR infrastructure dependencies (external services, env requirements)
- No cap on skip count — as long as 90% pass rate is met on non-skipped tests
- Build on Phase 37's SKIPPED-TESTS.md as the starting baseline — re-evaluate each previously skipped test

### CI enforcement
- GitHub Actions workflow
- 90% pass rate is a hard gate — PRs cannot merge if pass rate drops below threshold
- Tests run on both PRs and push to main
- Best-of-3 retry logic applies in CI as well

### Failure documentation
- Update Phase 37's SKIPPED-TESTS.md as the living tracking document
- Create a new COVERAGE-REPORT.md in Phase 38 directory as a final snapshot
- Failures categorized by root cause type (auth, timing, selector, app bug, infrastructure, etc.)
- Final snapshot only — no trend tracking needed

### Claude's Discretion
- Worker count for test runs (Phase 37 recommended --workers=1)
- CI artifact upload strategy (screenshots, traces)
- Detail level per failure in coverage report (root cause + fix plan vs root cause only)
- GitHub Actions workflow structure and caching strategy

</decisions>

<specifics>
## Specific Ideas

- Phase 37 already removed 172 waitForTimeout calls and documented skipped tests in SKIPPED-TESTS.md — use that as the foundation
- Tests should run with `--workers=1` for consistent results (Phase 37 recommendation) unless stability data suggests higher parallelism is safe

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-e2e-test-coverage-gate*
*Context gathered: 2026-02-08*
