---
phase: 54-redo-qa-walkthrough-using-mcp-playwright
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - screenshots/qa-v2/
  - BUGS.md
autonomous: true
requirements: [QA-WALKTHROUGH]
must_haves:
  truths:
    - "Every major page has been visited via MCP browser and screenshotted"
    - "Console errors have been captured for each page group"
    - "Previously fixed bugs (BUG-01, BUG-05, BUG-07, BUG-08) are verified as resolved"
    - "BUGS.md is updated with current state - resolved bugs marked, new bugs added"
  artifacts:
    - path: "screenshots/qa-v2/"
      provides: "Fresh screenshots from MCP Playwright walkthrough"
    - path: "BUGS.md"
      provides: "Updated bug report reflecting fixes and new findings"
  key_links: []
---

<objective>
Redo the comprehensive QA walkthrough using MCP Playwright browser tools interactively.
Navigate every page as a real customer would, take screenshots, check console errors,
test modals and forms. Verify previously fixed bugs and find any new issues.

Purpose: The prior walkthrough (task 49) used a scripted approach. This redo uses interactive
MCP browser tools for higher fidelity testing - clicking real elements, checking actual
rendering, testing modal flows, and capturing console state.

Output: Fresh screenshots in screenshots/qa-v2/, updated BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Interactive MCP walkthrough - public pages and auth flows</name>
  <files>screenshots/qa-v2/*.png</files>
  <action>
Using MCP Playwright browser tools (browser_navigate, browser_snapshot, browser_take_screenshot,
browser_click, browser_console_messages), walk through ALL public and auth pages interactively.

Dev server is already running at http://localhost:5173.

Save all screenshots to screenshots/qa-v2/ with naming: qa2-{NN}-{description}.png

**Public pages to visit and screenshot:**
1. Homepage (/) - check marketing layout, hero, CTAs
2. Features page (/features) - check feature cards, layout
3. Pricing page (/pricing) - check pricing tiers, toggle
4. Login page (/auth/login) - fill form fields, check validation UI
5. Signup page (/auth/signup) - fill form fields, check password strength
6. Reset Password page (/auth/reset-password)
7. Update Password page (/auth/update-password)
8. Accept Invite page (/auth/accept-invite)
9. Public preview page (/preview/demo-screen-001)

**For each page:**
- browser_navigate to the URL
- browser_snapshot to check the accessibility tree / DOM state
- browser_take_screenshot to capture visual
- browser_console_messages to check for JS errors
- If forms exist: browser_click on fields, type test data, verify UI responds

**Verify fixed bugs:**
- BUG-05 (teal colors): Check /features and pricing - should use brand palette not teal/green

Record all findings (errors, visual issues, broken elements) as notes for Task 3.
  </action>
  <verify>
    <automated>ls screenshots/qa-v2/qa2-*.png | head -20 && echo "Screenshots captured"</automated>
  </verify>
  <done>All 9 public/auth pages visited, screenshotted, console checked. BUG-05 fix verified.</done>
</task>

<task type="auto">
  <name>Task 2: Interactive MCP walkthrough - authenticated app pages</name>
  <files>screenshots/qa-v2/*.png</files>
  <action>
Continue the MCP Playwright walkthrough for ALL authenticated app pages.

Navigate to http://localhost:5173/app (dev auth bypass should auto-authenticate).

Walk through every major section using sidebar navigation. Use browser_click on sidebar items
to navigate like a real user would.

**Core pages to visit (use sidebar clicks, not direct URL):**
1. Dashboard - verify it loads, check stats cards
2. Welcome page - VERIFY BUG-08 FIX: must look different from Dashboard
3. Media (All, Images, Videos, Audio, Documents, Web Pages) - 6 pages
4. Apps page - click an app card to test detail modal
5. Playlists - click "Add Playlist" to test create modal
6. Templates/Layouts - VERIFY BUG-05 FIX: should use brand colors not teal/green
7. Schedules - click "Add Schedule" to test create modal, check BUG-06 (duplicate buttons)
8. Screens - check empty state, click "Add Screen" modal
9. Menu Boards - check BUG-13 (duplicate create buttons)
10. Scenes page
11. Campaigns
12. Screen Groups
13. Data Sources
14. Analytics pages (Analytics, Content Performance)
15. AI Content Assistant
16. Settings, Branding, Account & Plan
17. Help Center
18. Locations
19. Developer Settings, White Label, Usage Dashboard
20. Admin pages (Tenants, Audit Logs, Feature Flags)
21. Alerts Center, Notification Settings
22. Service Quality page - VERIFY BUG-01 FIX: layout should be proper cards not broken

**For each page:**
- browser_click sidebar item or navigate
- browser_snapshot to check DOM
- browser_take_screenshot
- browser_console_messages periodically (every 5-10 pages)
- Test modals: click create/add buttons, verify modal opens, check form fields
- VERIFY toast behavior across navigation (BUG-07 fix): toasts should dismiss on nav

Record all findings for Task 3.
  </action>
  <verify>
    <automated>ls screenshots/qa-v2/qa2-*.png | wc -l | xargs -I{} test {} -ge 40 && echo "40+ screenshots captured"</automated>
  </verify>
  <done>All 40+ app pages visited and screenshotted. Fixed bugs verified: BUG-01 (service quality), BUG-05 (brand colors on templates), BUG-07 (toast dismissal), BUG-08 (welcome vs dashboard). Modal interactions tested on at least 4 pages.</done>
</task>

<task type="auto">
  <name>Task 3: Update BUGS.md with walkthrough findings</name>
  <files>BUGS.md</files>
  <action>
Update BUGS.md based on findings from Tasks 1 and 2.

**Structure:**
1. Update the header with new date and "MCP Playwright interactive walkthrough" method
2. Mark resolved bugs with [RESOLVED] prefix and brief note:
   - BUG-01: Service Quality layout - RESOLVED (quick task 50)
   - BUG-05: Teal/green colors - RESOLVED (quick task 51)
   - BUG-07: Toast persistence - RESOLVED (quick task 52)
   - BUG-08: Welcome/Dashboard identical - RESOLVED (quick task 53)
3. Keep open bugs that were NOT fixed (BUG-02, BUG-03, BUG-04, BUG-06, BUG-09-14)
4. Add any NEW bugs found during the interactive walkthrough
5. Update the summary counts
6. Reference new screenshots from screenshots/qa-v2/

Keep the same format and severity levels. Number new bugs starting from BUG-15.
  </action>
  <verify>
    <automated>grep -c "RESOLVED" BUGS.md && grep "BUG-" BUGS.md | tail -5</automated>
  </verify>
  <done>BUGS.md updated with 4 resolved bugs marked, remaining open bugs preserved, any new bugs documented with screenshots. Summary counts accurate.</done>
</task>

</tasks>

<verification>
- screenshots/qa-v2/ contains 50+ screenshots covering all pages
- BUGS.md has accurate status for all bugs (resolved and open)
- Fixed bugs (01, 05, 07, 08) confirmed resolved via interactive testing
- Console errors documented
</verification>

<success_criteria>
- Every major page (public + authenticated) visited via MCP browser tools
- At least 50 screenshots saved to screenshots/qa-v2/
- All 4 previously fixed bugs verified as resolved
- BUGS.md updated with current bug state and any new findings
</success_criteria>

<output>
After completion, create `.planning/quick/54-redo-qa-walkthrough-using-mcp-playwright/54-SUMMARY.md`
</output>
