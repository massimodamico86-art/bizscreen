---
phase: quick-69
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [".planning/BUGS.md"]
autonomous: true
requirements: [QUICK-69]

must_haves:
  truths:
    - "Welcome sidebar item renders WelcomeHero greeting and WelcomeFeatureCards onboarding content"
    - "Dashboard sidebar item renders StatCards and analytics content distinct from Welcome"
    - "Screenshots captured for both states"
    - "Findings appended to .planning/BUGS.md"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Investigation findings appended as QT-69 entry"
      contains: "QT-69"
  key_links: []
---

<objective>
Investigate whether "Welcome" and "Dashboard" sidebar items render identically or differently. Screenshot both states and document whether WelcomeHero/WelcomeFeatureCards components are actually wired in.

Purpose: Re-verify BUG-08 fix (quick-53, confirmed in quick-65) with fresh screenshots and check if WelcomeHero/WelcomeFeatureCards are rendering in the Welcome page.
Output: Screenshots of both pages, findings appended to .planning/BUGS.md.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/BUGS.md

Key source files:
- `src/pages/WelcomePage.jsx` — Should render WelcomeHero (greeting) + WelcomeFeatureCards (onboarding CTAs)
- `src/pages/DashboardPage.jsx` — Should render StatCards, analytics, listing management
- `src/App.jsx` — Routes: `welcome` -> WelcomePage, `dashboard` -> DashboardPage

Sidebar nav items (App.jsx):
```
{ id: 'welcome', label: 'Welcome', icon: Home }
{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
```

Prior context: quick-53 fixed BUG-08 (Welcome=Dashboard identical). quick-65 verified the fix via Playwright. This task re-investigates with explicit focus on whether WelcomeHero and WelcomeFeatureCards components are wired and rendering.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Navigate Welcome and Dashboard via Playwright, screenshot, and document findings</name>
  <files>.planning/BUGS.md</files>
  <action>
Use Playwright MCP to investigate Welcome vs Dashboard sidebar behavior:

**Step 1: Open app and log in**
1. Navigate to http://localhost:5173 (1280x800 viewport)
2. Wait for the app to load. DEV_AUTH_BYPASS should auto-authenticate; if login form appears, enter any credentials and submit.
3. Wait for sidebar to be visible.

**Step 2: Navigate to Welcome page**
1. Click the "Welcome" sidebar item (look for text "Welcome" in the aside/sidebar nav)
2. Wait for page content to settle (500ms)
3. Check what renders in the main content area:
   - Look for WelcomeHero: a greeting like "Hi, {name}" or "Welcome back"
   - Look for WelcomeFeatureCards: onboarding action cards (Add Media, Create Playlist, Browse Templates, Watch Tutorial)
4. Screenshot to `screenshots/69-01-welcome-page.png`
5. Note any console errors

**Step 3: Navigate to Dashboard page**
1. Click the "Dashboard" sidebar item (look for text "Dashboard" in the aside/sidebar nav)
2. Wait for page content to settle (500ms)
3. Check what renders in the main content area:
   - Look for StatCards with metrics
   - Look for analytics/chart components
   - Confirm content is visually DIFFERENT from Welcome
4. Screenshot to `screenshots/69-02-dashboard-page.png`
5. Note any console errors

**Step 4: Verify WelcomeHero/WelcomeFeatureCards wiring**
1. Navigate back to Welcome
2. Inspect the DOM for elements that would indicate WelcomeHero is rendering (greeting text, welcome hero class/id)
3. Inspect for WelcomeFeatureCards (onboarding cards with action buttons)
4. Document whether these components are present and functional or just stubs

**Step 5: Append findings to .planning/BUGS.md**
Prepend a new `## QT-69` section at the TOP of BUGS.md (before QT-64) with this structure:

```
## QT-69: Welcome vs Dashboard Sidebar Investigation (2026-03-05)

**Status:** [PASS/FAIL]

**Investigation:**
- Welcome page content: [describe what renders]
- Dashboard page content: [describe what renders]
- Pages render identically: [YES/NO]
- WelcomeHero component wired: [YES/NO] — [details]
- WelcomeFeatureCards component wired: [YES/NO] — [details]

**Console errors:** [any errors observed, or "None"]

**Screenshots:**
- screenshots/69-01-welcome-page.png
- screenshots/69-02-dashboard-page.png

**Conclusion:** [summary of whether BUG-08 fix holds and WelcomeHero/WelcomeFeatureCards are functioning]
```

Close all Playwright pages when done.
  </action>
  <verify>
    <automated>test -f screenshots/69-01-welcome-page.png && test -f screenshots/69-02-dashboard-page.png && grep -q "QT-69" .planning/BUGS.md && echo "PASS"</automated>
  </verify>
  <done>
    - Both Welcome and Dashboard pages screenshotted
    - WelcomeHero and WelcomeFeatureCards wiring status documented
    - Whether pages render identically or differently is confirmed
    - Findings appended to .planning/BUGS.md as QT-69 entry
  </done>
</task>

</tasks>

<verification>
- screenshots/69-01-welcome-page.png exists showing Welcome page
- screenshots/69-02-dashboard-page.png exists showing Dashboard page
- .planning/BUGS.md contains QT-69 entry with investigation results
</verification>

<success_criteria>
- Both sidebar states screenshotted and visually compared
- WelcomeHero and WelcomeFeatureCards wiring status explicitly documented
- Findings appended to BUGS.md with clear PASS/FAIL status
</success_criteria>

<output>
After completion, create `.planning/quick/69-investigate-welcome-vs-dashboard-sidebar/69-SUMMARY.md`
</output>
