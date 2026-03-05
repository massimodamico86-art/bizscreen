---
phase: 49-comprehensive-qa-walkthrough
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/e2e/qa-walkthrough.spec.js
  - screenshots/qa/
autonomous: true
requirements: [QA-WALKTHROUGH]

must_haves:
  truths:
    - "Every navigable page in the app is visited and screenshotted"
    - "Marketing/public pages (home, features, pricing) are captured"
    - "Auth pages (login, signup, reset password) are captured"
    - "All authenticated app pages are navigated via window.__setCurrentPage and screenshotted"
    - "Console errors and page crashes are captured in a bug report"
    - "Modals, dropdowns, and interactive elements are opened and screenshotted where possible"
  artifacts:
    - path: "tests/e2e/qa-walkthrough.spec.js"
      provides: "Comprehensive QA walkthrough Playwright test"
    - path: "screenshots/qa/"
      provides: "Organized screenshots of every page and flow"
  key_links:
    - from: "tests/e2e/qa-walkthrough.spec.js"
      to: "window.__setCurrentPage"
      via: "page.evaluate for navigation"
      pattern: "__setCurrentPage"
---

<objective>
Comprehensive QA walkthrough of the entire BizScreen application. Navigate every page as a customer would, capture screenshots of every view, open key modals/interactions, and produce a bug report of all console errors, crashes, and visual issues found.

Purpose: Full visual audit and bug discovery across the entire app surface area.
Output: Playwright test file that walks through all pages, screenshots in screenshots/qa/, and a printed bug summary.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/App.jsx (page map at lines 595-655, navigation via window.__setCurrentPage)
@tests/e2e/helpers/index.js (screenshotStep, loginAndPrepare, waitForPageReady, dismissAnyModals)
@tests/e2e/fixtures/index.js (test fixtures: authenticatedPage, freshPage)
@playwright.config.js (baseURL, timeouts)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create comprehensive QA walkthrough Playwright test</name>
  <files>tests/e2e/qa-walkthrough.spec.js</files>
  <action>
Create a Playwright spec file that systematically visits every page in the app and captures screenshots. The test should be structured as follows:

**Part A - Public/Marketing pages (unauthenticated):**
Use `test.use({ storageState: { cookies: [], origins: [] } })` for this describe block.
Visit each public route and screenshot:
- `/` (homepage)
- `/features`
- `/pricing`
- `/auth/login`
- `/auth/signup`
- `/auth/reset-password`
- `/auth/update-password` (will show expired token state)
- `/auth/accept-invite` (will show no-token state)
- `/preview/demo` (public preview page)

For each: `await page.goto(url)`, `await waitForPageReady(page)`, `await screenshotStep(page, 'qa', '{NN}-{page-name}')`.

**Part B - Authenticated app pages (all page IDs from App.jsx page map):**
Use the default authenticated project (storage state from setup). Navigate to `/app`, call `loginAndPrepare(page)`, then `dismissAnyModals(page)`.

For EACH page ID in the App.jsx page map, navigate using:
```js
await page.evaluate((id) => window.__setCurrentPage(id), pageId);
await page.waitForTimeout(1500); // allow lazy-load + render
await waitForPageReady(page);
```

The full list of page IDs to visit (in this order):
dashboard, media-all, media-images, media-videos, media-audio, media-documents, media-webpages, apps, playlists, layouts, schedules, screens, video-walls, templates, scenes, listings, settings, account-plan, branding, activity, team, locations, analytics, assistant, screen-groups, campaigns, review-inbox, developer, white-label, status, ops-console, tenant-admin, help, demo-tools, enterprise-security, reseller-dashboard, reseller-billing, service-quality, feature-flags, usage, admin-tenants, admin-audit-logs, admin-system-events, device-diagnostics, data-sources, content-performance, analytics-dashboard, template-marketplace, admin-templates, social-accounts, content-moderation, alerts, notification-settings, svg-templates, security, translations, menu-boards, proof-of-play

Screenshot naming: `qa-{NN}-{pageId}-desktop.png` where NN is a zero-padded counter (10, 11, 12...).

**Part C - Console error collection:**
Before all tests in Part B, set up a console error listener:
```js
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ page: currentPageId, text: msg.text() }); });
page.on('pageerror', err => { consoleErrors.push({ page: currentPageId, text: err.message, crash: true }); });
```

After all pages are visited, log the collected errors as a structured summary. If any `crash: true` entries exist, mark those pages.

**Part D - Interactive element sampling:**
After the main page walkthrough, for a subset of key pages, open primary modals/interactions:
- On `screens`: click "Add Screen" button if visible, screenshot, close modal
- On `playlists`: click "Create Playlist" button if visible, screenshot, close modal
- On `media-all`: click "Add Media" button if visible, screenshot, close modal
- On `schedules`: click "Create Schedule" button if visible, screenshot, close modal
- On `templates`: hover over first template card if visible, screenshot

Wrap each interaction in try/catch so failures don't abort the walkthrough. Screenshot with suffix like `qa-70-screens-add-modal-desktop.png`.

**Important implementation notes:**
- Import from `'./fixtures/index.js'` for test/expect
- Import `{ screenshotStep, loginAndPrepare, waitForPageReady, dismissAnyModals }` from `'./helpers/index.js'`
- Use `test.describe.serial` for Part B so pages run in order and share the same page context
- Set `test.setTimeout(300_000)` (5 min) for the main walkthrough test since it visits 60+ pages
- Use `{ fullPage: true }` option on screenshotStep for pages likely to have scrollable content
- Clean the qa screenshot directory at the start: `cleanScreenshots('qa')`
  </action>
  <verify>
    <automated>npx playwright test qa-walkthrough --timeout 600000 2>&1 | tail -30</automated>
  </verify>
  <done>
- All 60+ app pages visited and screenshotted in screenshots/qa/
- Public pages (home, features, pricing, auth) captured
- Console errors collected and printed
- Modal interactions attempted for key pages
- No unhandled test crashes (individual page failures caught gracefully)
  </done>
</task>

<task type="auto">
  <name>Task 2: Run walkthrough and produce bug report</name>
  <files>screenshots/qa/QA-REPORT.md</files>
  <action>
After the test from Task 1 runs, analyze all results:

1. Run the test: `npx playwright test qa-walkthrough --timeout 600000`
2. Review the Playwright output for:
   - Which pages passed vs failed
   - Console errors and crashes collected
   - Any timeouts (pages that didn't load)
3. Review the screenshots visually (look at each one) for:
   - Blank/white pages (component crash without error boundary)
   - Layout broken (overflow, overlapping elements)
   - Missing content (empty states that should have mock data)
   - UI inconsistencies (misaligned elements, wrong colors)
   - Modals that fail to open or render incorrectly

4. Create `screenshots/qa/QA-REPORT.md` with:
   ```
   # QA Walkthrough Report
   ## Date: {date}
   ## Summary
   - Pages visited: {N}
   - Screenshots captured: {N}
   - Console errors found: {N}
   - Page crashes: {N}
   - Visual issues: {N}

   ## Critical Bugs (crashes/blank pages)
   | Page ID | Issue | Screenshot |
   |---------|-------|------------|

   ## Console Errors
   | Page ID | Error Message | Severity |
   |---------|---------------|----------|

   ## Visual Issues
   | Page ID | Issue | Screenshot |
   |---------|-------|------------|

   ## Pages That Loaded Successfully
   (list all clean pages)
   ```

The report should be actionable -- each bug should have enough info to reproduce.
  </action>
  <verify>
    <automated>test -f screenshots/qa/QA-REPORT.md && echo "Report exists" && head -20 screenshots/qa/QA-REPORT.md</automated>
  </verify>
  <done>
- QA-REPORT.md exists with structured bug findings
- Every page has a pass/fail status
- Console errors are cataloged with page attribution
- Visual issues are described with screenshot references
  </done>
</task>

</tasks>

<verification>
- screenshots/qa/ directory contains 60+ screenshots covering all app pages
- screenshots/qa/QA-REPORT.md exists with structured findings
- No test infrastructure crashes (individual page failures are OK and expected)
</verification>

<success_criteria>
- Complete visual record of every page in the application
- Actionable bug report with categorized issues (crashes, console errors, visual bugs)
- Each bug has page ID, description, and screenshot reference
</success_criteria>

<output>
After completion, create `.planning/quick/49-comprehensive-qa-walkthrough-navigate-ap/49-SUMMARY.md`
</output>
