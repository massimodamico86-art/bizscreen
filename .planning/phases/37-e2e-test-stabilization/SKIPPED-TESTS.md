# Skipped E2E Tests

Tracking document for E2E tests that are skipped during stabilization.

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| Total skipped | 0 | None in Category 1 |
| Unfixable timing issues | 0 | |
| External dependencies | 0 | |
| Infrastructure issues | 0 | |

## Skipped Tests by Category

### Category 1: Core Auth & Navigation

**Status:** Stabilized

All auth tests pass 5 consecutive runs. No tests were skipped.

Note: The following tests were already skipped in the test file with documented reasons:
- `Login Flow > shows loading state during login attempt` - Loading states too fast to reliably test in E2E
- `Signup Flow > shows loading state during signup attempt` - Loading states too fast to reliably test in E2E

These are intentional skips, not stabilization-related skips.

### Category 2: Core CRUD Operations

_Not yet stabilized_

### Category 3: Advanced Features

_Not yet stabilized_

### Category 4: Edge Cases & Error Handling

_Not yet stabilized_

## Legend

- **Unfixable timing issues:** Tests that fail due to inherent timing problems that cannot be resolved with proper waits
- **External dependencies:** Tests that depend on external services (email delivery, third-party APIs)
- **Infrastructure issues:** Tests blocked by test infrastructure limitations

---
*Created: 2026-02-08*
*Last updated: 2026-02-08*
