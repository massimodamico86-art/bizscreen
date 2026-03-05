---
phase: quick-55
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/SchedulesPage.jsx
  - src/pages/MenuBoardsPage.jsx
autonomous: true
requirements: [BUG-06, BUG-13]

must_haves:
  truths:
    - "Schedules page shows only ONE 'Add Schedule' button (header), no footer actions"
    - "Menu Boards page shows only ONE create button at any time - header OR empty state, never both"
  artifacts:
    - path: "src/pages/SchedulesPage.jsx"
      provides: "Schedules page without duplicate footer actions"
    - path: "src/pages/MenuBoardsPage.jsx"
      provides: "Menu Boards page with conditional header button"
  key_links: []
---

<objective>
Fix two duplicate-button bugs: BUG-06 (Schedules footer duplicates header button) and BUG-13 (Menu Boards shows header + empty state buttons simultaneously).

Purpose: Clean up redundant UI actions that confuse users.
Output: Two fixed page components with single create actions.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/SchedulesPage.jsx
@src/pages/MenuBoardsPage.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove duplicate buttons from Schedules and Menu Boards pages</name>
  <files>src/pages/SchedulesPage.jsx, src/pages/MenuBoardsPage.jsx</files>
  <action>
**SchedulesPage.jsx (BUG-06):**
Delete the entire footer actions section (lines 395-404) — the `div` with className "flex items-center gap-4 pt-4" containing the duplicate "Add Schedule" button and the non-functional "Actions" button. The header button at lines 186-189 already provides the "Add Schedule" action.

**MenuBoardsPage.jsx (BUG-13):**
Conditionally render the header "New Menu Board" button so it only shows when there ARE menu boards (i.e., when the empty state is NOT showing). Change line 171-173 to wrap the Button in a condition: only render when `!loading && menuBoards.length > 0`, OR alternatively move the Button inside the boards-grid block. The empty state (lines 196-211) already has its own "Create Menu Board" button which is the correct CTA when empty.

Simplest approach for MenuBoardsPage: wrap the header Button in `{!loading && menuBoards.length > 0 && ( ... )}`.
  </action>
  <verify>
    <automated>cd /Users/massimodamico/bizscreen && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>Schedules page has no footer actions section. Menu Boards header button only appears when boards exist. Build succeeds with no errors.</done>
</task>

</tasks>

<verification>
- `grep -n "Footer Actions" src/pages/SchedulesPage.jsx` returns nothing
- `grep -c "Add Schedule" src/pages/SchedulesPage.jsx` returns 1 (header only)
- Visual: Schedules page shows single "Add Schedule" in header
- Visual: Menu Boards empty state shows only "Create Menu Board" button (no header button)
- Visual: Menu Boards with items shows only "New Menu Board" in header
</verification>

<success_criteria>
- No duplicate create buttons on either page
- Build passes without errors
- Existing functionality (modals, create flows) unaffected
</success_criteria>

<output>
After completion, create `.planning/quick/55-fix-bug-06-and-bug-13-remove-duplicate-c/55-SUMMARY.md`
</output>
