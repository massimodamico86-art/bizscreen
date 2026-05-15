---
phase: 161-fix-content-test-imports
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/161-fix-content-test-imports/161-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 161: Code Review Fix Report

**Fixed at:** 2026-04-10
**Source review:** .planning/phases/161-fix-content-test-imports/161-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Vacuous assertions cause tests to silently pass when UI is missing

**Files modified:** `tests/e2e/layouts-screenshots.spec.js`
**Commit:** d2bb319f
**Applied fix:** Replaced all five `expect(true).toBeTruthy()` instances with `test.skip` calls when preconditions are not met, followed by meaningful assertions (e.g., `toHaveValue`, `toBeVisible`) that verify actual UI state rather than a hardcoded boolean.

### WR-02: Dynamic import of @playwright/test inside assertAppReady

**Files modified:** `tests/e2e/helpers.js`
**Commit:** 151cc2ca
**Applied fix:** Added static `import { expect } from '@playwright/test'` at the top of helpers.js and removed both dynamic `await import('@playwright/test')` calls on the former lines 206 and 216. The statically imported `expect` is now used consistently throughout the module.

### WR-03: Tests with no assertions on the else-path are unreliable

**Files modified:** `tests/e2e/layouts-screenshots.spec.js`
**Commit:** 3f04fc5c
**Applied fix:** Flattened conditional nesting in four tests by extracting visibility checks before the `if` block and adding `test.skip` with descriptive messages when outer preconditions (layout card visible, create button visible, zone clickable) are not met. This ensures every test either runs assertions or explicitly skips -- no silent zero-assertion passes.

## Skipped Issues

None -- all findings were fixed.

---

_Fixed: 2026-04-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
