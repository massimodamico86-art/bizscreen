---
phase: quick-60
plan: 01
subsystem: routing
tags: [bugfix, dev-bypass, auth, routing]
dependency_graph:
  requires: [devBypass.js]
  provides: [dev-bypass-public-route-skip]
  affects: [AppRouter.jsx]
tech_stack:
  added: []
  patterns: [DEV_AUTH_BYPASS guard in PublicRoute]
key_files:
  modified:
    - src/router/AppRouter.jsx
decisions:
  - Minimal single-line guard condition rather than extracting a separate component
metrics:
  duration: 52s
  completed: "2026-03-05T21:46:41Z"
---

# Quick Task 60: Fix BUG-02 and BUG-03 - Dev Mode Auth Route Redirect

Skip PublicRoute redirect when DEV_AUTH_BYPASS is active, so developers can view homepage, login, and signup pages without being redirected to /app.

## Task Summary

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Make PublicRoute skip redirect in dev bypass mode | 561e78c | src/router/AppRouter.jsx |

## Changes Made

### Task 1: Make PublicRoute skip redirect in dev bypass mode

- Imported `DEV_AUTH_BYPASS` from `../utils/devBypass.js` into AppRouter.jsx
- Added `&& !DEV_AUTH_BYPASS` guard to the PublicRoute redirect condition
- Updated JSDoc comment on PublicRoute to document the dev bypass behavior
- Production build verified successful (DEV_AUTH_BYPASS is always false in production)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `grep DEV_AUTH_BYPASS src/router/AppRouter.jsx` confirms import (line 14) and usage (line 81)
- Production build succeeds without errors
- BUG-02 resolved: Homepage at `/` viewable when dev auth bypass is active
- BUG-03 resolved: Login and signup pages viewable when dev auth bypass is active
- No production behavior change: real authenticated users still redirected from public/auth pages to `/app`
