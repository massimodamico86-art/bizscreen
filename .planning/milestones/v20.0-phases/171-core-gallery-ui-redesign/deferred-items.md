# Phase 171 — Deferred Items

Out-of-scope discoveries surfaced during plan execution. Not fixed here to
respect scope boundaries. To be triaged separately.

## Discovered during Plan 171-02 (2026-04-19)

### 1. tests/unit/api/lruCache.test.js — import resolution failure

- **Failure:** `Failed to resolve import "../../../api/lib/lruCache.js"`
- **Cause:** Test file references `../../../api/lib/lruCache.js` but that path
  does not exist in the current tree. Likely a test stub left from an aborted
  refactor. Pre-existing on `main` before Phase 171 began (not caused by any
  code change in this plan).
- **Scope:** Entirely unrelated to Phase 171 gallery UI redesign.
- **Suggested owner:** Whoever last touched `api/lib/` (git blame the test)
  or a dedicated QA cleanup pass.

### 2. tests/unit/api/usageTracker.test.js — import resolution failure

- **Failure:** Likely same pattern (missing source file import).
- **Cause:** Pre-existing before Phase 171.
- **Scope:** Entirely unrelated to Phase 171.

## Not in scope of auto-fix policy

Per GSD executor rules (SCOPE BOUNDARY): "Only auto-fix issues DIRECTLY
caused by the current task's changes." These failures exist on main prior to
this plan's commits and would exist identically if this plan were reverted —
they are out of scope for Phase 171 Plan 02.
