---
task: 025
type: quick
title: Fix remaining fixme tests (Templates, Media, Dashboard re-nav)
priority: medium
estimated_duration: 30min
---

<objective>
Fix the 3 remaining fixme E2E tests: Templates page navigation, Media menu navigation, and Dashboard re-navigation.

Purpose: Clear remaining UI bugs discovered during comprehensive client testing to achieve clean E2E test suite.
Output: All 16 client-interactions tests passing (currently 13 pass, 3 fixme).
</objective>

<context>
@.planning/STATE.md
@.planning/quick/024-re-run-comprehensive-client-ui-tests-to/024-SUMMARY.md
@tests/e2e/client-interactions.spec.js
</context>

<background>
Task 024 fixed import issues in Templates page components (TemplateLivePreview, TemplateCustomizeModal, TemplatePreviewPopover) but Vite HMR did not pick up the fixes during test runs. Build succeeds - only dev server cache issue.

The 3 fixme tests are:
1. `test.fixme('can navigate to Templates page')` - line 144 - import fixes committed, needs server restart verification
2. `test.fixme('Media menu - All Media page loads')` - line 242 - pre-existing issue, needs investigation
3. `test.fixme('Dashboard re-navigation works')` - line 254 - pre-existing issue, needs investigation
</background>

<tasks>

<task type="auto">
  <name>Task 1: Verify Templates page and investigate remaining issues</name>
  <files>
    tests/e2e/client-interactions.spec.js
    src/pages/MediaLibraryPage.jsx
    src/pages/DashboardPage.jsx
  </files>
  <action>
1. Run the client-interactions test suite with a fresh build to verify Templates page works:
   - Stop any running dev server
   - Run `npm run build` to ensure clean build
   - Start fresh dev server: `npm run dev` (or let Playwright start it)
   - Run the 3 fixme tests: `npx playwright test client-interactions --grep "Templates|Media menu|Dashboard re-nav"`

2. For Templates page:
   - If it passes, change `test.fixme` to `test` on line 144
   - If it still fails, investigate the console error and fix

3. For Media menu - All Media page:
   - Run the test manually to see the actual error
   - Check if it's an error boundary crash (missing imports) or navigation issue
   - If missing imports, add them to MediaLibraryPage.jsx
   - If navigation issue, debug the Media submenu expansion and "All Media" click

4. For Dashboard re-navigation:
   - Run the test manually to see the actual error
   - Check if DashboardPage crashes when re-navigated to
   - Common causes: stale state, useEffect cleanup issues, race conditions
   - Fix the root cause

5. After fixing, convert all 3 `test.fixme` to `test` in client-interactions.spec.js
  </action>
  <verify>
Run full test suite: `npx playwright test client-interactions --workers=1`
All 16 tests should pass (0 fixme, 0 failed)
  </verify>
  <done>
- Templates page test passes (import fixes verified working)
- Media menu All Media test passes (bug fixed)
- Dashboard re-navigation test passes (bug fixed)
- All `test.fixme` converted to `test` in client-interactions.spec.js
- Full suite: 16/16 passing
  </done>
</task>

<task type="auto">
  <name>Task 2: Commit fixes</name>
  <files>
    tests/e2e/client-interactions.spec.js
    (any page files that needed fixes)
  </files>
  <action>
Commit all changes with appropriate message:
- If only test file changed: `test(quick-025): enable previously-fixme client interaction tests`
- If page fixes included: `fix(quick-025): resolve Media/Dashboard navigation issues + enable tests`
  </action>
  <verify>
`git status` shows clean working directory
`git log -1` shows the commit
  </verify>
  <done>
All fixes committed to git
  </done>
</task>

</tasks>

<verification>
- `npx playwright test client-interactions --workers=1` shows 16 passed, 0 failed, 0 skipped
- No `test.fixme` remains in client-interactions.spec.js
- Build succeeds: `npm run build`
</verification>

<success_criteria>
- All 3 previously-fixme tests now pass
- No new regressions in other tests
- Code committed to git
</success_criteria>

<output>
Create `.planning/quick/025-remaining-fixme-tests-3-templates-page-n/025-SUMMARY.md` after completion.
</output>
