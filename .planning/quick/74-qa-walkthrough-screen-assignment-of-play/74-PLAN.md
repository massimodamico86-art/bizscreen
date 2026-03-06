---
phase: quick-74
plan: 74
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-SCREEN-ASSIGNMENT]

must_haves:
  truths:
    - "Screens page loads and shows existing screens (created in quick-73)"
    - "Edit Screen modal opens and shows Content Assignment section with Playlist and Layout dropdowns"
    - "Selecting a playlist clears layout selection (mutual exclusivity)"
    - "Selecting a layout clears playlist selection (mutual exclusivity)"
    - "Content picker modal opens when clicking content cell in screen row"
    - "Bulk schedule assignment dropdown appears when screens are checkbox-selected"
    - "All assignment UI interactions complete without console errors or crashes"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for screen assignment walkthrough"
  key_links: []
---

<objective>
QA walkthrough of screen content assignment: open the Edit Screen modal on an existing screen to assign a playlist and then a layout (verifying mutual exclusivity). Test the InsertContentModal via the content cell click. Test bulk schedule assignment via checkbox selection. Screenshot only broken behavior. Check console for errors. Append findings to BUGS.md.

Purpose: Validate the screen-to-content assignment pipeline (playlist, layout, schedule) works correctly in dev mode.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/ScreensPage.jsx
@src/pages/components/ScreensComponents.jsx
@src/components/modals/InsertContentModal.jsx
@src/components/schedules/AssignScreensModal.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: QA walkthrough - Screen assignment of playlist, layout, and schedule via Playwright</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a Playwright script (standalone node script with `chromium.launch`) against localhost:5173 to perform the following screen assignment QA walkthrough.

**Collect all console errors throughout (filter out known benign Supabase/fetch errors to 127.0.0.1:54321).**

**1. Login and navigate to Screens page**
- Go to localhost:5173, let DEV_AUTH_BYPASS auto-authenticate
- Click "Screens" in the sidebar
- Wait for the page to load and verify the Screens heading is visible
- Check if there are existing screen rows in the table (from quick-73 or demo data)
- If no screens exist, click "Add Screen" to create one named "QA Assignment Test" first
- Screenshot ONLY if the page crashes or no screens can be obtained

**2. Test Edit Screen modal - Content Assignment (Playlist and Layout)**
- Find the first screen row in the table
- Click the three-dot action menu button (MoreVertical icon) on that row
- Click "Edit screen" from the dropdown menu
- Verify the EditScreenModal opens with title "Edit Screen"
- Scroll down to the "Content Assignment" section (h4 with text "Content Assignment")
- Verify two dropdowns are present: "Playlist" and "Layout"
- Check that both have "No playlist" / "No layout" as default options

**2a. Test Playlist dropdown**
- Open the Playlist select dropdown
- Check if playlist options are listed (there may be demo playlists or none beyond "No playlist")
- If options exist, select the first available playlist
- Verify the Layout dropdown resets to "No layout" (mutual exclusivity: `if (e.target.value) setLayoutId('')`)
- Note the selected playlist name for verification

**2b. Test Layout dropdown (mutual exclusivity)**
- Open the Layout select dropdown
- Check if layout options are listed
- If options exist, select the first available layout
- Verify the Playlist dropdown resets to "No playlist" (mutual exclusivity: `if (e.target.value) setPlaylistId('')`)
- If a layout is selected, check if OrientationMismatchWarning appears (only when orientation differs)

**2c. Submit the Edit Screen form**
- Click "Save Changes" button
- Note whether the save succeeds or fails (backend-dependent -- without Supabase it will fail, which is expected)
- Screenshot ONLY if the modal crashes, hangs, or shows unexpected behavior (not just a backend error toast)
- Close the modal (click Cancel or the X button if still open)

**3. Test InsertContentModal via content cell click**
- In the screen row, find the content display cell (shows "No Content Assigned" or a playlist/layout name)
- The content cell has an `onClick={() => onOpenContentPicker?.(screen)}` handler at line 354 of ScreensComponents.jsx
- Click it to open the InsertContentModal
- Verify the modal opens with tabs: "All Media", "Apps", "Layouts", "Playlists"
- Click the "Playlists" tab and verify it loads (may show empty state or demo items)
- Click the "Layouts" tab and verify it loads
- Close the modal
- Screenshot ONLY if the modal fails to open or crashes

**4. Test bulk schedule assignment**
- Find the checkbox on the first screen row (input[type="checkbox"] in the first td)
- Click the checkbox to select the screen
- Verify the bulk action bar appears showing "1 screen selected"
- Find the "Assign Schedule..." dropdown (select element near Calendar icon)
- Open it and check if schedule options are listed
- If options exist, select the first schedule (this triggers `handleBulkAssignSchedule`)
- Note whether the assignment succeeds or fails (backend-dependent)
- Uncheck the screen to dismiss the bulk bar
- Screenshot ONLY if the bulk bar fails to appear, dropdown is missing, or UI crashes

**5. Console error check**
- Collect all console errors from the entire session
- Filter out known benign errors:
  - Supabase connection errors (127.0.0.1:54321, Failed to fetch)
  - Auth session errors (AuthSessionMissingError)
  - Network errors to localhost backend
- Report any GENUINE errors (crashes, undefined references, React errors)

**6. Append findings to BUGS.md**
Append a new section `## QT-74: Screen Assignment of Playlist, Layout, and Schedule (DATE)` to .planning/BUGS.md with:
- Status: PASS/FAIL per feature
- Features tested:
  1. Edit Screen modal opens with Content Assignment section
  2. Playlist dropdown selection works
  3. Layout dropdown selection works (mutual exclusivity with playlist)
  4. Save Changes button submits form
  5. InsertContentModal opens via content cell click
  6. InsertContentModal tabs (Playlists, Layouts) load
  7. Bulk checkbox selection shows action bar
  8. Schedule assignment dropdown appears with options
- Any genuine console errors
- Screenshots taken (only if broken behavior found)
  </action>
  <verify>
    <automated>node -e "const fs = require('fs'); const bugs = fs.readFileSync('.planning/BUGS.md', 'utf8'); if (!bugs.includes('QT-74')) { process.exit(1); } console.log('QT-74 findings appended to BUGS.md');"</automated>
  </verify>
  <done>All 8 screen assignment features tested via Playwright, findings appended to BUGS.md with per-feature PASS/FAIL status, screenshots taken only for broken behavior, console errors classified</done>
</task>

</tasks>

<verification>
- .planning/BUGS.md contains QT-74 section with per-feature results
- All 8 assignment features tested: Edit modal, playlist dropdown, layout dropdown, mutual exclusivity, save, content picker modal, content picker tabs, bulk schedule assignment
- Only genuine console errors reported (Supabase backend errors filtered as benign)
</verification>

<success_criteria>
- QT-74 section in BUGS.md with clear PASS/FAIL per feature
- Edit Screen modal Content Assignment section tested (playlist and layout dropdowns)
- Mutual exclusivity between playlist and layout verified
- InsertContentModal tested via content cell click
- Bulk schedule assignment tested via checkbox selection
- Console errors checked and classified
</success_criteria>

<output>
After completion, create `.planning/quick/74-qa-walkthrough-screen-assignment-of-play/74-SUMMARY.md`
</output>
