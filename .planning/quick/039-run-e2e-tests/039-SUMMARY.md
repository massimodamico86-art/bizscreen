---
id: quick-039
type: quick
description: Run E2E tests
status: complete
completed: 2026-02-04
duration: 38m
---

# Quick Task 039: Run E2E Tests

## Summary

E2E tests executed successfully to establish current baseline status.

## Results

| Metric | quick-039 | quick-037 | Delta |
|--------|-----------|-----------|-------|
| Passed | 382 | 380 | +2 |
| Failed | 460 | 462 | -2 |
| Skipped | 321 | 321 | 0 |
| Did not run | 40 | 40 | 0 |
| Duration | 36.9m | 36.7m | +0.2m |

**Change:** +2 passing tests, -2 failing tests (slight improvement)

## Test Health Analysis

### Pass Rate
- **Executed:** 382 + 460 = 842 tests
- **Pass Rate:** 45.4% (382/842)
- **Total Tests:** 1203 (842 + 321 skipped + 40 not run)

### Infrastructure Status
- **No HTTP 406 errors** - fix from quick-034 confirmed stable
- **Docker and Supabase:** Healthy
- **Test execution:** Completed without infrastructure failures

### Notable Patterns

1. **30-second timeouts:** Most failures due to tests exceeding 30s timeout
2. **Skipped tests:** 321 tests skipped (including 81 scene tests - feature not in navigation)
3. **Did not run:** 40 tests dependent on skipped tests

## Comparison to Baseline

Stable results compared to quick-037:
- Infrastructure fixes holding
- No regression in test stability
- Slight improvement (+2 passing)

## Files

- Test output: `e2e-output.txt` (temporary)
- Test results directory: `test-results/`

## Next Steps

None required - baseline tracking complete. Infrastructure stable.
