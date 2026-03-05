---
phase: quick-59
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/e2e/layout-device-assignment.spec.js
  - .planning/quick/59-review-layout-device-assignment-flow-tes/BUGS.md
  - .planning/quick/59-review-layout-device-assignment-flow-tes/59-SUMMARY.md
autonomous: true
requirements: [QUICK-59]
must_haves:
  truths:
    - "Layout-to-screen assignment flow is tested end-to-end via Playwright"
    - "Content picker modal correctly offers layouts tab and assigns layout to screen"
    - "Edit screen modal layout dropdown works correctly"
    - "All bugs found during review are documented in BUGS.md"
  artifacts:
    - path: "tests/e2e/layout-device-assignment.spec.js"
      provides: "Playwright E2E tests covering layout-device assignment flow"
    - path: ".planning/quick/59-review-layout-device-assignment-flow-tes/BUGS.md"
      provides: "Bug report documenting any issues found"
  key_links:
    - from: "tests/e2e/layout-device-assignment.spec.js"
      to: "src/pages/ScreensPage.jsx"
      via: "navigateToSection screens"
    - from: "src/pages/ScreensPage.jsx"
      to: "src/components/modals/InsertContentModal.jsx"
      via: "InsertContentModal with allowedTabs playlists+layouts"
    - from: "src/pages/components/ScreensComponents.jsx"
      to: "src/pages/hooks/useScreensData.js"
      via: "handleAssignLayout callback"
---

<objective>
Review the layout-to-device assignment flow in the BizScreen app, test it thoroughly via Playwright E2E tests, and document any bugs found in BUGS.md.

Purpose: Ensure users can assign layouts to screens through all available paths -- content picker modal, edit screen modal, and bulk operations -- without bugs or broken flows.

Output: New Playwright test file covering layout-device assignment, plus BUGS.md documenting any issues discovered.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/ScreensPage.jsx
@src/pages/components/ScreensComponents.jsx (EditScreenModal ~line 827, ScreenCard ~line 270)
@src/pages/hooks/useScreensData.js (handleAssignLayout ~line 368, handleOpenContentPicker)
@src/services/screenService.js (assignLayoutToScreen)
@src/components/modals/InsertContentModal.jsx
@src/pages/LayoutsPage.jsx
@src/pages/LayoutEditorPage.jsx
@tests/e2e/helpers.js (loginAndPrepare, navigateToSection helpers)
@tests/e2e/device-registration-flow.spec.js (reference for patterns from quick-58)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Review layout-device assignment flow and write Playwright E2E tests</name>
  <files>tests/e2e/layout-device-assignment.spec.js</files>
  <action>
Review all source files involved in the layout-device assignment flow, then write comprehensive Playwright E2E tests.

**Step 1: Code Review** -- Read these files thoroughly before writing tests:
- src/pages/ScreensPage.jsx -- handleContentSelected, InsertContentModal usage (allowedTabs: playlists+layouts)
- src/pages/components/ScreensComponents.jsx -- EditScreenModal (layout dropdown ~line 973), ScreenCard (onOpenContentPicker ~line 354), content display logic (~line 303-305)
- src/pages/hooks/useScreensData.js -- handleAssignLayout, handleOpenContentPicker, assignLayoutToScreen call
- src/services/screenService.js -- assignLayoutToScreen function
- src/components/modals/InsertContentModal.jsx -- tabs structure, layout selection flow
- src/pages/LayoutsPage.jsx -- layout gallery, how layouts are created/listed

**Step 2: Write E2E tests** covering these paths:

**Path A: Content Picker Modal (Assign Layout to Screen)**
1. Navigate to Screens page (authenticated)
2. Verify screen cards are visible (table or cards view)
3. Click "Assign Content" button on a screen card (the play/assign icon)
4. Verify InsertContentModal opens with title "Assign Content to [screen name]"
5. Verify "Playlists" tab is shown by default (initialTab="playlists")
6. Click "Layouts" tab
7. Verify layout items are listed (or empty state if no layouts)
8. If layouts exist, click one to assign it
9. Verify modal closes and success toast appears
10. Verify the screen card now shows the assigned layout name

**Path B: Edit Screen Modal (Layout Dropdown)**
1. Navigate to Screens page
2. Click on a screen to open EditScreenModal (or click edit icon)
3. Verify "Content Assignment" section is visible
4. Verify "Layout" dropdown exists with "No layout" default option
5. Select a layout from dropdown
6. Verify orientation mismatch warning appears if applicable (OrientationMismatchWarning component)
7. Submit the form
8. Verify screen is updated

**Path C: Layout Gallery and Editor Access**
1. Navigate to Layouts page (via sidebar: Templates/Layouts)
2. Verify layout gallery loads with sidebar categories and template grid
3. Verify search functionality works
4. Click "Create" / "+" to open a new layout in editor
5. Verify LayoutEditorPage loads with preset layouts (Full Screen, Two Columns, etc.)
6. Verify zone editing controls are present
7. Navigate back to verify layout appears in gallery

**Path D: Screens Page - Content Display and Filtering**
1. Navigate to Screens page
2. Verify screens with assigned layouts show layout name (not "No Content Assigned")
3. Test content status filter dropdown (if it has layout-related filter options)
4. Verify bulk operations area includes schedule assignment dropdown

Use existing test patterns:
- Import { loginAndPrepare, navigateToSection } from './helpers.js'
- Use .or() pattern for conditional states (table vs empty state, loaded vs loading)
- Use reasonable timeouts (5-10s for visibility checks)
- Take screenshots at key points: `screenshots/59-NN-description.png` where NN is sequential

Structure with describe blocks for each path. Handle graceful failures -- if no screens exist, test the empty state path instead.
  </action>
  <verify>
    <automated>cd /Users/massimodamico/bizscreen && npx playwright test tests/e2e/layout-device-assignment.spec.js --project=chromium --reporter=list 2>&1 | tail -40</automated>
  </verify>
  <done>
All test scenarios run without crashes. Each path (A-D) has at least 2 test cases. Screenshots captured at key flow points with 59-* prefix. Test failures due to missing mock data or auth are documented, not code bugs.
  </done>
</task>

<task type="auto">
  <name>Task 2: Document bugs found during review and testing in BUGS.md</name>
  <files>.planning/quick/59-review-layout-device-assignment-flow-tes/BUGS.md</files>
  <action>
Based on the code review and Playwright test results from Task 1, create a BUGS.md file documenting all issues found in the layout-device assignment flow.

For each bug, document:
- **BUG-ID**: Sequential ID (e.g., LAYOUT-01, LAYOUT-02)
- **Severity**: critical / major / minor / cosmetic
- **Component**: Which file/component is affected
- **Description**: What is wrong
- **Expected**: What should happen
- **Actual**: What actually happens
- **Screenshot**: Reference to screenshot if captured
- **Status**: open

Review these specific areas for potential issues during code review:

1. **InsertContentModal** -- Does the layouts tab load correctly? Are layout thumbnails/previews shown? Does selecting a layout call onSelect with the right contentType ('layouts')?
2. **EditScreenModal** -- Does the layout dropdown populate correctly? Does clearing playlist also clear layout (mutual exclusivity)? When selecting a layout, does it clear playlist? Check lines 964-993 for the layout/playlist mutual exclusivity logic.
3. **Content display on ScreenCard** -- Lines 303-305: Does it correctly prioritize playlist over layout display? Does "No Content Assigned" show when neither is set?
4. **handleAssignLayout in useScreensData** -- Does optimistic UI update work correctly? Does error rollback work? Is the toast message correct?
5. **OrientationMismatchWarning** -- Does it correctly detect portrait vs landscape layouts? Does it show for layout assignments (not just playlists)?
6. **LayoutEditorPage** -- Do preset layouts render correctly? Can zones be created/edited? Does save work?
7. **LayoutsPage** -- Does the gallery load? Does search filter correctly? Can user access "Your Templates" section?

If NO bugs are found, still create BUGS.md stating "No bugs found" with a summary of what was tested.

Add a "NOTES" section at the bottom for code quality observations that are not bugs -- e.g., patterns that could be improved, inconsistencies between components.
  </action>
  <verify>
    <automated>test -f /Users/massimodamico/bizscreen/.planning/quick/59-review-layout-device-assignment-flow-tes/BUGS.md && echo "BUGS.md exists" || echo "MISSING"</automated>
  </verify>
  <done>
BUGS.md exists with structured bug reports (or "no bugs found" statement). Each bug has severity, component, description, and expected/actual behavior. Code quality notes documented separately from bugs.
  </done>
</task>

</tasks>

<verification>
- Playwright tests run without crashes (individual test failures due to mock data are acceptable and should be noted)
- BUGS.md is complete with all findings from both code review and test execution
- Screenshots directory has new 59-* prefixed screenshots from the test run
</verification>

<success_criteria>
- New E2E test file covers all 4 paths of the layout-device assignment flow (content picker, edit modal, layout gallery/editor, content display)
- BUGS.md documents all issues found with proper severity ratings
- Test results are analyzed and any failures are explained (expected failures due to test environment vs actual bugs)
</success_criteria>

<output>
After completion, create `.planning/quick/59-review-layout-device-assignment-flow-tes/59-SUMMARY.md`
</output>
