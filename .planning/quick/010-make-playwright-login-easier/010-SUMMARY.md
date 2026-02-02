---
type: quick-summary
id: "010"
title: Make Playwright login easier with storage state
completed: 2026-02-02
duration: ~5 minutes

tech-stack:
  added: []
  patterns:
    - Playwright storage state for session persistence
    - Setup project dependency for test ordering

key-files:
  created:
    - tests/e2e/auth.setup.js
  modified:
    - playwright.config.js
    - tests/e2e/helpers.js
    - .gitignore
---

# Quick Task 010: Make Playwright Login Easier Summary

**One-liner:** Playwright storage state pattern - authenticate once, reuse session across all tests.

## What Was Done

Implemented Playwright's storage state pattern to authenticate once and inject the session into all subsequent tests.

### Task 1: Create auth.setup.js

Created `tests/e2e/auth.setup.js` that:
- Logs in using TEST_USER_EMAIL and TEST_USER_PASSWORD env vars
- Dismisses any post-login modals
- Saves cookies + localStorage to `playwright/.auth/user.json`
- Skips gracefully if no credentials configured

### Task 2: Configure playwright.config.js

Added setup project pattern:
- `setup` project runs `auth.setup.js` first
- `chromium` project depends on `setup` and uses `storageState`
- Tests receive pre-authenticated browser context

### Task 3: Update helpers.js

Updated `loginAndPrepare()` to handle both modes:
- With storage state: Detects already-authenticated state, just dismisses modals
- Without storage state: Falls back to full login flow
- Backward compatible with existing tests

## Commits

| Hash | Message |
|------|---------|
| f7042d3 | feat(010): add Playwright auth.setup.js for session persistence |
| 8678873 | feat(010): configure Playwright with auth setup dependency |
| ec7c25b | feat(010): update loginAndPrepare to detect pre-auth state |

## Deviations from Plan

None - plan executed exactly as written.

## Usage

Tests now run faster because:
1. Setup runs once, authenticates, saves session
2. All tests receive pre-authenticated browser context
3. `loginAndPrepare()` detects auth state and skips login form

To run with storage state:
```bash
npx playwright test
```

To run setup only:
```bash
npx playwright test --project=setup
```

The auth file `playwright/.auth/user.json` is gitignored (contains session data).

## Files Changed

```
tests/e2e/auth.setup.js  (created)  - Global auth setup
playwright.config.js     (modified) - Setup project + storageState
tests/e2e/helpers.js     (modified) - Pre-auth detection
.gitignore               (modified) - Ignore playwright/.auth/
```
