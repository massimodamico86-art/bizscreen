---
phase: quick
plan: 022
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/e2e/client-interactions.spec.js
autonomous: true

must_haves:
  truths:
    - "Test clicks all sidebar navigation items"
    - "Test clicks buttons in each main page tab"
    - "No JavaScript errors or crashes during interactions"
  artifacts:
    - path: "tests/e2e/client-interactions.spec.js"
      provides: "Comprehensive client UI interaction test"
      min_lines: 150
  key_links:
    - from: "tests/e2e/client-interactions.spec.js"
      to: "tests/e2e/helpers.js"
      via: "import loginAndPrepare, waitForPageReady"
      pattern: "import.*helpers"
---

<objective>
Create a comprehensive Playwright test that clicks all buttons across all tabs/pages as a client user.

Purpose: Ensure all UI interactions work without crashes, verifying that every clickable element in the main navigation and page content is functional.

Output: `tests/e2e/client-interactions.spec.js` - a test file that systematically navigates to each section and clicks interactive elements.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Server running at http://localhost:5176/
Uses storage state auth from `playwright/.auth/client.json`

Navigation structure (from App.jsx):
- Welcome (dashboard)
- Dashboard
- Media (expandable submenu):
  - All Media
  - Images
  - Videos
  - Audio
  - Documents
  - Web Pages
- Apps
- Playlists
- Templates
- Schedules
- Screens
- Knowledge Hub (help)

@tests/e2e/helpers.js (loginAndPrepare, waitForPageReady, dismissAnyModals)
@tests/e2e/dashboard.spec.js (pattern reference)
@playwright.config.js (configuration)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create comprehensive client interaction test</name>
  <files>tests/e2e/client-interactions.spec.js</files>
  <action>
Create a Playwright test file that:

1. Test describe block "Client UI Interactions"

2. Navigation tests - systematically click each sidebar item:
   - Dashboard
   - Media menu (expand, then each submenu: All Media, Images, Videos, Audio, Documents, Web Pages)
   - Apps
   - Playlists
   - Templates
   - Schedules
   - Screens
   - Knowledge Hub

   For each navigation:
   - Click the nav item
   - Wait for page to load (waitForPageReady)
   - Verify no "Something Went Wrong" error boundary
   - Verify main content visible

3. Page-specific button interaction tests:
   - Dashboard: Click stat cards (Total Screens, Playlists, Media Assets, Apps), Quick Actions buttons
   - Media pages: Click any filter/sort buttons if present, upload button
   - Playlists: Create playlist button, any list item actions
   - Screens: Add screen button, any device cards
   - Templates: Browse marketplace button, any template cards

4. Console error tracking:
   - Set up console listener at start
   - Filter out benign errors (favicon, manifest, ResizeObserver, network 400/404)
   - Assert no critical JS errors at end of each major test

Use existing patterns from dashboard.spec.js:
- Import from './helpers.js'
- Use `test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured')`
- Use `await expect(page.locator('body')).not.toContainText('Something Went Wrong')`

Test should be comprehensive but not exhaustive - focus on main navigation paths and primary action buttons, not every single interactive element. Goal is smoke testing coverage, not full integration testing.
  </action>
  <verify>
Run: `npx playwright test tests/e2e/client-interactions.spec.js --project=chromium`
All tests should pass. No console errors indicating crashes.
  </verify>
  <done>
- client-interactions.spec.js exists with comprehensive navigation tests
- Tests click all main sidebar items and expand Media submenu
- Tests click primary action buttons on key pages
- All tests pass when run against http://localhost:5176/
  </done>
</task>

</tasks>

<verification>
```bash
# Run the new test
npx playwright test tests/e2e/client-interactions.spec.js --project=chromium

# Should see all tests pass
# Check report for any failures
npx playwright show-report
```
</verification>

<success_criteria>
- [ ] tests/e2e/client-interactions.spec.js created
- [ ] Test navigates to all main sidebar sections
- [ ] Test expands Media submenu and clicks all subitems
- [ ] Test clicks primary action buttons on Dashboard
- [ ] Test verifies no error boundaries after each navigation
- [ ] Test tracks and reports console errors
- [ ] All tests pass when run with Playwright
</success_criteria>

<output>
After completion, create `.planning/quick/022-playwright-as-a-client-click-on-all-the/022-SUMMARY.md`
</output>
