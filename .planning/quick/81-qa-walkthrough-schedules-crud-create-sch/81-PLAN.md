---
phase: quick-81
plan: 81
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-SCHEDULES-CRUD]

must_haves:
  truths:
    - "Schedules page loads and shows list or empty state"
    - "Create schedule modal opens, accepts name/description, and creates a schedule"
    - "Schedule editor opens with calendar view and event form"
    - "A recurring time window entry can be created with repeat options"
    - "Assign Screens modal opens and shows screen/group assignment UI"
    - "Created schedule appears in the schedule list after navigating back"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for Schedules CRUD walkthrough"
  key_links: []
---

<objective>
QA walkthrough of the Schedules CRUD flow: navigate to Schedules, create a new schedule, open the schedule editor, add a recurring time window entry, open the Assign Screens modal, save, navigate back and verify the schedule appears in the list. Screenshot only broken behavior. Check console for errors. Append findings to BUGS.md.

Purpose: Validate Schedule create/edit/recurring-entry/screen-assignment features work correctly in dev mode.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/SchedulesPage.jsx
@src/pages/ScheduleEditorPage.jsx
@src/components/schedules/AssignScreensModal.jsx
@src/components/schedules/DaypartPicker.jsx
@src/components/schedules/WeekPreview.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: QA walkthrough - Schedules CRUD, recurring entry, screen assignment via Playwright</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a Playwright script (standalone node script with chromium.launch) against localhost:5173 to perform the following Schedules QA walkthrough:

1. **Login and navigate to Schedules**
   - Go to localhost:5173, let DEV_AUTH_BYPASS auto-authenticate
   - Click "Schedules" in the sidebar (page id: schedules)
   - Verify the page loads with heading "Schedules"
   - Note whether empty state or existing schedules are shown

2. **Create a new schedule**
   - Click the "Add Schedule" button to open the create modal
   - Verify the modal renders with name and description fields
   - Fill in name: "QA Recurring Schedule" and description: "Automated QA test for recurring time windows"
   - Submit the form
   - Verify either: (a) the app navigates to the schedule editor (page id starts with schedule-editor-), or (b) an error occurs (screenshot if error)
   - Screenshot ONLY if modal fails to open, crashes, or submit errors unexpectedly

3. **Schedule editor - verify calendar and controls load**
   - Verify the schedule editor page loads with:
     - Schedule name displayed (editable or as heading)
     - Calendar/week view with time slots
     - Week navigation arrows (prev/next week)
     - "Add Event" or Plus button to create entries
     - Filler content section
     - Assign Screens button
   - Screenshot ONLY if editor fails to load or is missing critical UI elements

4. **Create a recurring time window entry**
   - Click "Add Event" or the Plus button to open the event modal/form
   - Verify the event form shows: event type selector (content/screenOff), content type dropdown, start date/time, end date/time, repeat options, priority
   - Set event type to "content" (should be default)
   - Set start time to "09:00" and end time to "17:00" (business hours window)
   - Change repeat to "daily" or "weekday" using the repeat dropdown (REPEAT_OPTIONS)
   - Set priority if visible (default is Normal/3)
   - Submit/save the entry
   - Verify the entry appears in the calendar/week view or entries list
   - Screenshot ONLY if event form fails to open, repeat options are missing, or save crashes

5. **Open Assign Screens modal**
   - Click "Assign Screens" button in the editor toolbar
   - Verify the AssignScreensModal opens showing:
     - Available screens/groups list (may be empty without backend)
     - Search/filter capability
     - Assign/unassign toggle or checkboxes
   - Close the modal
   - Screenshot ONLY if modal fails to open or crashes

6. **Navigate back and verify schedule in list**
   - Click the back arrow or "Schedules" breadcrumb to return to SchedulesPage
   - Verify "QA Recurring Schedule" appears in the schedule list
   - NOTE: Without a running Supabase backend, the schedule may not persist after navigation. If so, note this as expected behavior (not a bug) -- the UI should at least not crash
   - Screenshot ONLY if navigation back crashes or the page errors

7. **Console errors**
   - Collect all console errors throughout the walkthrough
   - Filter out benign errors: Supabase connection refused (127.0.0.1:54321), fetch failures for backend APIs, scoped-logger service errors (ScheduleService, etc.)
   - Report any genuine code errors (uncaught exceptions, React errors, import failures)

After the walkthrough, append findings to .planning/BUGS.md in this format:

```
## QT-81: Schedules CRUD and Recurring Entry QA Walkthrough (YYYY-MM-DD)

**Status:** PASS/FAIL -- summary

**Features tested:**
- Schedules page load: PASS/FAIL
- Create schedule modal: PASS/FAIL
- Schedule editor load: PASS/FAIL
- Create recurring time window entry: PASS/FAIL
- Assign Screens modal: PASS/FAIL
- Navigate back and verify list: PASS/FAIL

**Bugs found:**
- BUG-XX: [description] (severity)
  OR
- None

**Console errors:** N total, M benign (backend not running), K genuine

**Screenshots:** [list only if bugs found]
```

Use `page.waitForTimeout(500)` between navigation actions to let the SPA render. Use `page.waitForSelector` for critical elements before interacting. Collect console errors via `page.on('console')` and `page.on('pageerror')`.
  </action>
  <verify>
    <automated>grep -q "QT-81" .planning/BUGS.md && echo "PASS: QT-81 findings appended" || echo "FAIL: QT-81 not found in BUGS.md"</automated>
  </verify>
  <done>Schedules CRUD QA walkthrough complete. All 6 feature areas tested. Findings appended to BUGS.md with PASS/FAIL status per feature, any bugs documented with BUG-XX IDs, and console errors categorized.</done>
</task>

</tasks>

<verification>
- .planning/BUGS.md contains QT-81 section with all 6 feature areas tested
- Any bugs found have BUG-XX identifiers and severity ratings
- Screenshots exist only for broken behavior (none if everything passes)
</verification>

<success_criteria>
- Schedules page loads and all 6 feature areas exercised
- Findings documented in BUGS.md with clear PASS/FAIL per feature
- Console errors categorized (benign vs genuine)
</success_criteria>

<output>
After completion, create `.planning/quick/81-qa-walkthrough-schedules-crud-create-sch/81-SUMMARY.md`
</output>
