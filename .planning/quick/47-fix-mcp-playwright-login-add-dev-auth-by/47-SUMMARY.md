---
phase: quick-47
plan: 01
subsystem: auth
tags: [dev-tooling, auth-bypass, mock-user, mcp-playwright]

# Dependency graph
requires:
  - phase: none
    provides: existing AuthContext and LoginPage
provides:
  - Dev auth bypass mode for local development and MCP Playwright automation
  - Mock Supabase user/profile for testing without Supabase running
affects: [auth, testing, dev-tooling]

# Tech tracking
tech-stack:
  added: []
  patterns: [env-var-gated dev bypass, double-gated safety (DEV + VITE_DEV_BYPASS_AUTH)]

key-files:
  created: []
  modified:
    - src/contexts/AuthContext.jsx
    - src/auth/LoginPage.jsx

key-decisions:
  - "Double-gate bypass on import.meta.env.DEV AND VITE_DEV_BYPASS_AUTH=true for safety"
  - "Mock user has client role with has_completed_onboarding=true to skip onboarding flow"
  - "LoginPage useEffect redirect is belt-and-suspenders with PublicRoute redirect"

patterns-established:
  - "Dev bypass pattern: module-level constant with console.warn, early-return in initialization effect"

requirements-completed: [DEV-AUTH-BYPASS]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Quick Task 47: Dev Auth Bypass Summary

**Dev auth bypass mode in AuthContext with mock Supabase user, gated on VITE_DEV_BYPASS_AUTH=true and DEV mode, enabling MCP Playwright automation without Supabase**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T19:25:27Z
- **Completed:** 2026-02-27T19:26:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- AuthContext provides fake authenticated session (mock user + mock profile) when bypass is active
- Mock user matches full Supabase User shape (id, aud, role, email, app_metadata, user_metadata, etc.)
- LoginPage auto-redirects to /app when bypass detected, preventing login form from showing
- Bypass is completely inert in production builds (import.meta.env.DEV is false, code is tree-shaken)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dev auth bypass to AuthContext.jsx** - `6ec1d51` (feat)
2. **Task 2: Add auto-redirect on LoginPage when bypass active** - `1ed25c8` (feat)

## Files Created/Modified
- `src/contexts/AuthContext.jsx` - DEV_AUTH_BYPASS constant, DEV_MOCK_USER/PROFILE objects, early-return in useEffect skipping Supabase, console.warn when active
- `src/auth/LoginPage.jsx` - useEffect added to imports, devBypass const, auto-redirect to /app when bypass active

## Decisions Made
- Double-gated bypass (import.meta.env.DEV AND VITE_DEV_BYPASS_AUTH=true) ensures bypass never activates in production
- Mock user uses client role with has_completed_onboarding=true to skip onboarding wizard
- Mock tenant_id uses zeroed UUID (00000000-0000-0000-0000-000000000001) to avoid collisions
- LoginPage redirect is redundant with PublicRoute but provides defense-in-depth against timing edge cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

To activate dev auth bypass:
1. Add `VITE_DEV_BYPASS_AUTH=true` to `.env.local`
2. Run `npm run dev`
3. Navigate to http://localhost:5173 -- should auto-redirect to /app with mock user
4. Check browser console for "[AuthContext] DEV AUTH BYPASS ACTIVE" message

To deactivate: remove or set `VITE_DEV_BYPASS_AUTH=false` in `.env.local`

## Next Phase Readiness
- Dev auth bypass ready for MCP Playwright automation
- No changes to production auth behavior
- Feature is off by default (opt-in via env var)

## Self-Check: PASSED

- [x] src/contexts/AuthContext.jsx exists with bypass logic
- [x] src/auth/LoginPage.jsx exists with auto-redirect
- [x] 47-SUMMARY.md created
- [x] Commit 6ec1d51 exists (Task 1)
- [x] Commit 1ed25c8 exists (Task 2)

---
*Quick Task: 47*
*Completed: 2026-02-27*
