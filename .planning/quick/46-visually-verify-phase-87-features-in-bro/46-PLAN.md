---
phase: quick-46
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: false
requirements: [DATA-01, DATA-02, DATA-03, MODQ-01, MODQ-02]

must_haves:
  truths:
    - "All 5 phase 87 pages render without crashes in the browser"
    - "Data Sources page loads with its create modal accessible"
    - "Apps page shows app catalog and config modals"
    - "Menu Boards page renders with create/editor functionality"
    - "Content Moderation page displays moderation queue UI"
    - "Review Inbox page renders with table and detail drawer"
  artifacts: []
  key_links: []
---

<objective>
Visually verify all 5 pages built in phase 87 (Data Sources, Apps, Menu Boards, Content Moderation, Review Inbox) using the Playwright MCP browser tools. Take screenshots of each page and its key interactive elements (modals, drawers, buttons).

Purpose: Confirm that the code verification from 87-VERIFICATION.md holds up in a real browser -- pages render correctly, modals open, interactive elements are accessible.
Output: Screenshots saved to project root with descriptive names.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/87-data-sources-apps-moderation/87-VERIFICATION.md

**App Architecture:**
- SPA at http://localhost:5174/app with state-based navigation (no URL routes per page)
- Login page at http://localhost:5174/auth/login
- Test credentials: email `test@bizscreen.test`, password `testpassword123`
- Pages use `setCurrentPage(pageKey)` for navigation -- sidebar items trigger this
- Login form has `id="email"` and `id="password"` input fields, submit button with text "Log in"

**Page Keys for Navigation (used in sidebar clicks):**
- `apps` -- in main sidebar as "Apps" (Grid3X3 icon)
- `menu-boards` -- in main sidebar as "Menu Boards" (UtensilsCrossed icon)
- `data-sources` -- NOT in main sidebar; accessible via JS console: run `document.querySelector('[data-testid]')` or use browser console to call navigation
- `content-moderation` -- NOT in main sidebar; same approach
- `review-inbox` -- NOT in main sidebar; same approach

**For pages NOT in sidebar:** Use browser_evaluate to call `window.__setCurrentPage('page-key')` or find the React root and dispatch navigation. Alternative: use browser_evaluate with `document.querySelector` to find and click relevant links/buttons that navigate there, OR directly manipulate React state.

**Human Verification Items from 87-VERIFICATION.md:**
1. Data Sources: Click "New Data Source", verify modal opens with type selection
2. Apps: Click app catalog card, verify detail modal; edit existing app, verify pre-population
3. Menu Boards: Create menu board, verify editor modal opens
4. Content Moderation: Verify status tabs and approve/reject buttons render
5. Review Inbox: Click review row, verify detail drawer opens
</context>

<tasks>

<task type="auto">
  <name>Task 1: Login and verify sidebar pages (Apps, Menu Boards)</name>
  <files></files>
  <action>
Use Playwright MCP browser tools to perform the following steps:

1. **Navigate to login page:**
   - `browser_navigate` to `http://localhost:5174/auth/login`
   - `browser_snapshot` to confirm the login form is visible
   - Take screenshot: `verify-87-00-login.png`

2. **Log in:**
   - `browser_click` on the email input (id="email"), type `test@bizscreen.test`
   - `browser_click` on the password input (id="password"), type `testpassword123`
   - Click the "Log in" submit button
   - Wait for the dashboard to load (look for sidebar navigation items)
   - Take screenshot: `verify-87-01-dashboard.png`

3. **Navigate to Apps page:**
   - Click the "Apps" item in the sidebar navigation
   - Wait for the Apps page to render (should see app catalog with cards)
   - Take screenshot: `verify-87-02-apps-page.png`
   - Click on any app card in the catalog to open the detail modal
   - Take screenshot: `verify-87-03-apps-detail-modal.png`
   - Close the modal (click X or outside)

4. **Navigate to Menu Boards page:**
   - Click the "Menu Boards" item in the sidebar navigation
   - Wait for the Menu Boards page to render
   - Take screenshot: `verify-87-04-menu-boards-page.png`
   - Look for a "Create" or "New Menu Board" button and click it
   - Take screenshot: `verify-87-05-menu-board-editor-modal.png`
   - Close the modal

If login fails (e.g., Supabase unavailable), take a screenshot of the error state and note it. The app may still load the dashboard with demo/mock data if previously authenticated.
  </action>
  <verify>Screenshots verify-87-00 through verify-87-05 exist in the project root. Apps page shows card-based catalog. Menu Boards page shows grid of boards or empty state.</verify>
  <done>Apps page and Menu Boards page rendered and screenshotted, including at least one modal interaction each.</done>
</task>

<task type="auto">
  <name>Task 2: Verify non-sidebar pages (Data Sources, Content Moderation, Review Inbox)</name>
  <files></files>
  <action>
These 3 pages are NOT in the main sidebar -- they are in the `pageComponents` map but navigated to via internal links or programmatic navigation. Use `browser_evaluate` to navigate to them.

1. **Navigate to Data Sources page:**
   - Use `browser_evaluate` to run: `document.querySelectorAll('nav a, nav button, [role="menuitem"]')` to find any nav elements, OR use the browser console approach.
   - If no direct nav link exists, use `browser_evaluate` to run JavaScript that triggers navigation. Try approaches in order:
     a. Find the React fiber root and call setCurrentPage: `browser_evaluate` with script that finds the App component's state setter
     b. Dispatch a custom event or use the URL hash trick: navigate to `http://localhost:5174/app#data-sources` (though hash nav may not work)
     c. As a fallback, navigate directly: `browser_navigate` to `http://localhost:5174/app` then `browser_evaluate` with: `window.dispatchEvent(new CustomEvent('navigate', {detail: 'data-sources'}))`
     d. Ultimate fallback: look for any Settings/More menu in the sidebar that might contain these items, use `browser_snapshot` to find clickable elements
   - Once on the Data Sources page, take screenshot: `verify-87-06-data-sources-page.png`
   - Look for "New Data Source" button and click it
   - Take screenshot: `verify-87-07-data-sources-create-modal.png`
   - Close the modal

2. **Navigate to Content Moderation page:**
   - Use the same navigation approach that worked for Data Sources, but with page key `content-moderation`
   - Take screenshot: `verify-87-08-content-moderation-page.png`
   - Verify that status tabs (All/Pending/Approved/Rejected) are visible in the snapshot
   - If any posts are shown, take screenshot of approve/reject buttons

3. **Navigate to Review Inbox page:**
   - Use the same navigation approach with page key `review-inbox`
   - Take screenshot: `verify-87-09-review-inbox-page.png`
   - If any review rows are visible, click one to open the detail drawer
   - Take screenshot: `verify-87-10-review-inbox-drawer.png`

**Important navigation hint:** The App component stores `currentPage` in React useState. The sidebar onClick handlers call `setCurrentPage(item.id)`. To navigate programmatically, the most reliable approach may be to find a sidebar item or use React DevTools-style access. Try `browser_snapshot` first to see all available clickable elements in the current view -- there may be a "More" or "Settings" section in the sidebar that lists these pages.
  </action>
  <verify>Screenshots verify-87-06 through verify-87-09 exist (minimum). Data Sources shows page with create button. Content Moderation shows tabs. Review Inbox shows table or empty state.</verify>
  <done>All 3 non-sidebar pages rendered and screenshotted. Data Sources create modal opened. Content Moderation tabs visible. Review Inbox page rendered.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Human review of all phase 87 screenshots</name>
  <action>
Present all screenshots to the user for visual review. The human verifies that all 5 phase 87 pages render correctly in the browser, modals open properly, and no visual regressions are present.
  </action>
  <verify>Human confirms all pages look correct or identifies issues to fix.</verify>
  <done>Human has reviewed all screenshots and typed "approved" or provided feedback.</done>
  <what-built>Visual verification screenshots of all 5 phase 87 pages taken via Playwright MCP browser</what-built>
  <how-to-verify>
    Review the screenshots saved in the project root:
    1. verify-87-00-login.png -- Login page renders
    2. verify-87-01-dashboard.png -- Dashboard after login
    3. verify-87-02-apps-page.png -- Apps catalog with cards
    4. verify-87-03-apps-detail-modal.png -- App detail modal opened
    5. verify-87-04-menu-boards-page.png -- Menu Boards page
    6. verify-87-05-menu-board-editor-modal.png -- Menu Board editor modal
    7. verify-87-06-data-sources-page.png -- Data Sources page
    8. verify-87-07-data-sources-create-modal.png -- Data Sources create modal
    9. verify-87-08-content-moderation-page.png -- Content Moderation with tabs
    10. verify-87-09-review-inbox-page.png -- Review Inbox page

    Check that:
    - All pages load without visible errors or crashes
    - Component layouts look correct (no overlapping, missing sections)
    - Modals open properly with expected content
    - Empty states render cleanly where no data exists
  </how-to-verify>
  <resume-signal>Type "approved" if all pages look correct, or describe any visual issues found</resume-signal>
</task>

</tasks>

<verification>
All 5 phase 87 pages have been opened in a real browser and screenshotted. Interactive elements (modals, drawers) have been tested where possible. Screenshots provide visual evidence for the human verification items listed in 87-VERIFICATION.md.
</verification>

<success_criteria>
- At least 8 screenshots saved with descriptive names
- All 5 pages (Data Sources, Apps, Menu Boards, Content Moderation, Review Inbox) captured
- At least 2 modal/interactive element screenshots captured
- No page crashes observed (React error boundaries not triggered)
- Human approves the visual state of all pages
</success_criteria>

<output>
After completion, create `.planning/quick/46-visually-verify-phase-87-features-in-bro/46-SUMMARY.md`
</output>
