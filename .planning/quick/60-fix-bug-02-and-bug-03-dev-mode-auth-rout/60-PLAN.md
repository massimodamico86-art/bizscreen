---
phase: quick-60
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/router/AppRouter.jsx
autonomous: true
requirements: [BUG-02, BUG-03]

must_haves:
  truths:
    - "Authenticated dev-bypass user can view homepage at /"
    - "Authenticated dev-bypass user can view /auth/login page"
    - "Authenticated dev-bypass user can view /auth/signup page"
    - "Non-dev-bypass authenticated users are still redirected from / and auth pages to /app"
    - "/pricing and /features remain accessible regardless of auth state"
  artifacts:
    - path: "src/router/AppRouter.jsx"
      provides: "PublicRoute component that skips redirect in dev bypass mode"
      contains: "DEV_AUTH_BYPASS"
  key_links:
    - from: "src/router/AppRouter.jsx"
      to: "src/utils/devBypass.js"
      via: "import DEV_AUTH_BYPASS"
      pattern: "DEV_AUTH_BYPASS"
---

<objective>
Fix BUG-02 and BUG-03: In dev-mode auth bypass, the `PublicRoute` wrapper redirects authenticated users away from the homepage (`/`), login (`/auth/login`), and signup (`/auth/signup`) pages. This makes these pages inaccessible during development.

Purpose: Allow developers using VITE_DEV_BYPASS_AUTH=true to view and work on all marketing and auth pages without being redirected to /app.

Output: Updated AppRouter.jsx where PublicRoute skips redirect when dev auth bypass is active.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/router/AppRouter.jsx
@src/utils/devBypass.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make PublicRoute skip redirect in dev bypass mode</name>
  <files>src/router/AppRouter.jsx</files>
  <action>
    1. Import `DEV_AUTH_BYPASS` from `../utils/devBypass.js` at the top of AppRouter.jsx.

    2. Modify the `PublicRoute` component to skip the redirect when dev auth bypass is active. The current logic is:
       ```
       if (!loading && user) {
         return <Navigate to="/app" replace />;
       }
       ```
       Change it to:
       ```
       if (!loading && user && !DEV_AUTH_BYPASS) {
         return <Navigate to="/app" replace />;
       }
       ```

    3. Update the JSDoc comment on PublicRoute to note that dev bypass mode disables the redirect, so authenticated dev-bypass users can view public pages during development.

    This is the minimal, targeted fix. It does NOT change behavior for real Supabase-authenticated users. The DEV_AUTH_BYPASS constant is already `false` in production builds (it checks `import.meta.env.DEV`), so this has zero production impact.
  </action>
  <verify>
    <automated>cd /Users/massimodamico/bizscreen && npx vite build --mode production 2>&1 | tail -5</automated>
  </verify>
  <done>
    - PublicRoute no longer redirects when DEV_AUTH_BYPASS is true
    - Production build succeeds (DEV_AUTH_BYPASS is false in prod, no behavior change)
    - Homepage, login, and signup pages are accessible in dev bypass mode
    - /pricing and /features remain unaffected (they were never wrapped in PublicRoute)
  </done>
</task>

</tasks>

<verification>
- `grep -n "DEV_AUTH_BYPASS" src/router/AppRouter.jsx` shows the import and usage in PublicRoute
- Production build succeeds without errors
- In dev mode with VITE_DEV_BYPASS_AUTH=true: navigating to `/`, `/auth/login`, `/auth/signup` renders the page content instead of redirecting to `/app`
</verification>

<success_criteria>
- BUG-02 resolved: Homepage at `/` is viewable when dev auth bypass is active
- BUG-03 resolved: Login and signup pages are viewable when dev auth bypass is active
- No production behavior change: real authenticated users still get redirected from public/auth pages to `/app`
</success_criteria>

<output>
After completion, create `.planning/quick/60-fix-bug-02-and-bug-03-dev-mode-auth-rout/60-01-SUMMARY.md`
</output>
