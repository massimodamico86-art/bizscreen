---
phase: quick
plan: 021
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: false

must_haves:
  truths:
    - "Marketing pages load without errors"
    - "Login page renders correctly"
    - "User can authenticate and reach dashboard"
  artifacts: []
  key_links:
    - from: "Marketing HomePage"
      to: "Login page"
      via: "Get Started / Sign In navigation"
---

<objective>
Perform a smoke test of the application from a client perspective to verify recent import fixes.

Purpose: Confirm tasks 019 (MarketingLayout) and 020 (HomePage) fixes resolved the issues and the application is usable.
Output: Verified working application or list of remaining issues.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
Server running at: http://localhost:5176/
Recent fixes:
- Task 019: Fixed MarketingLayout.jsx missing Link import
- Task 020: Fixed HomePage.jsx missing SEO and Link imports
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: Verify Marketing Pages</name>
  <what-built>Fixed import errors in MarketingLayout.jsx and HomePage.jsx (tasks 019, 020)</what-built>
  <how-to-verify>
    1. Open browser to http://localhost:5176/
    2. Verify HomePage loads without blank screen or console errors
    3. Check that navigation links work (Features, Pricing in header)
    4. Click "Features" - verify Features page loads
    5. Click "Pricing" - verify Pricing page loads
    6. Open browser DevTools (F12) - check Console tab for JavaScript errors
  </how-to-verify>
  <resume-signal>Report: "Marketing pages working" or describe specific errors</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify Login and Dashboard Access</name>
  <what-built>Core authentication flow through recently fixed marketing layout</what-built>
  <how-to-verify>
    1. From any marketing page, click "Sign In" or "Get Started"
    2. Verify Login page renders (email/password fields visible)
    3. Enter valid credentials and submit
    4. Verify redirect to Dashboard
    5. Check Dashboard loads with sidebar navigation visible
    6. Check browser console for any JavaScript errors
  </how-to-verify>
  <resume-signal>Report: "Login and dashboard working" or describe specific errors</resume-signal>
</task>

</tasks>

<verification>
- All marketing pages (/, /features, /pricing) load without errors
- Login page accessible and functional
- Dashboard reachable after authentication
- No JavaScript console errors on any page
</verification>

<success_criteria>
- Marketing pages render correctly after import fixes
- User can complete login flow
- Dashboard accessible post-authentication
- No blocking errors in browser console
</success_criteria>

<output>
After completion, create `.planning/quick/021-do-a-smoke-test-as-a-client/021-SUMMARY.md`
</output>
