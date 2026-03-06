---
phase: quick-72
plan: 72
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-PLAYLIST-CRUD]

must_haves:
  truths:
    - "Playlists page loads and shows list or empty state"
    - "Create playlist modal opens, accepts name/description, and creates a playlist"
    - "Playlist editor opens with media library and timeline strip"
    - "Media items can be added to the playlist timeline"
    - "Items can be reordered via drag-drop in the timeline"
    - "Transition effects can be set on playlist items"
    - "Playlist persists after page reload"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for Playlist CRUD walkthrough"
  key_links: []
---

<objective>
QA walkthrough of the Playlist CRUD and editor flow: create a playlist, add media items, reorder via drag-drop, set transitions, save, reload and verify persistence. Screenshot only broken behavior. Check console for errors. Append findings to BUGS.md.

Purpose: Validate Playlist create/edit/reorder/transition/persistence features work correctly in dev mode.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/PlaylistsPage.jsx
@src/pages/PlaylistEditorPage.jsx
@src/pages/components/PlaylistEditorComponents.jsx
@src/pages/hooks/usePlaylistEditor.js
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: QA walkthrough - Playlist CRUD, drag-drop, transitions, persistence via Playwright</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a Playwright script (standalone node script with chromium.launch) against localhost:5173 to perform the following Playlist QA walkthrough:

1. **Login and navigate to Playlists**
   - Go to localhost:5173, let DEV_AUTH_BYPASS auto-authenticate
   - Click "Playlists" in the sidebar (page id: playlists)
   - Verify the page loads with title containing "Playlists"
   - Note whether empty state or existing playlists are shown

2. **Create a new playlist**
   - Click the "Create Playlist" or Plus button to open the create modal
   - Verify the modal renders with name and description fields
   - Fill in name: "QA Test Playlist" and optional description: "Automated QA test"
   - Submit the form
   - Verify either: (a) playlist appears in the list, or (b) the app navigates to the playlist editor, or (c) an error occurs (screenshot if error)
   - Screenshot ONLY if modal fails to open, crashes, or submit errors unexpectedly

3. **Playlist editor - add media items**
   - If not already in the editor, navigate to it by clicking on the created playlist
   - Verify the editor page loads with: left media library panel, right/bottom timeline strip
   - In the media library panel, look for available media items (filter tabs: All, Images, Videos, etc.)
   - Try adding 2-3 items to the playlist by clicking "+" buttons or dragging from library to timeline
   - Verify items appear in the timeline strip
   - Screenshot ONLY if editor fails to load or items cannot be added

4. **Drag-drop reorder**
   - If items are in the timeline, attempt to reorder by simulating drag-drop:
     - Use `element.dispatchEvent(new DragEvent('dragstart', ...))` pattern on a timeline item
     - Dispatch dragover and drop on another position
   - Alternatively, use the move up/down buttons (handleMoveItemUp/handleMoveItemDown) if drag-drop simulation is impractical
   - Verify the order changes
   - Screenshot ONLY if reorder is broken or crashes

5. **Set transition effects**
   - Look for transition controls on playlist items (transition dropdown or settings icon)
   - If transition UI exists, try changing transition type (e.g., fade, slide, dissolve)
   - Verify the transition setting updates in the UI
   - Screenshot ONLY if transition UI is missing or broken

6. **Save and reload persistence**
   - Note the current playlist state (item count, order, transitions)
   - The playlist may auto-save or have a save button -- trigger save if available
   - Reload the page (page.reload())
   - Navigate back to the playlist editor for the same playlist
   - Verify the playlist still has the same items, order, and transitions
   - NOTE: Without a running Supabase backend, persistence will likely fail. If so, note this as expected behavior (not a bug) -- the UI should at least not crash on reload
   - Screenshot ONLY if the page crashes or shows unexpected errors on reload

7. **Console errors**
   - Collect all console errors throughout the walkthrough
   - Filter out benign errors: Supabase connection refused (127.0.0.1:54321), fetch failures for backend APIs, subscription errors
   - Report any genuine code errors (uncaught exceptions, React errors, import failures)

After the walkthrough, append findings to .planning/BUGS.md in this format:

```
## QT-72: Playlist CRUD, Drag-Drop, Transitions QA Walkthrough (YYYY-MM-DD)

**Status:** PASS/FAIL -- summary

**Features tested:**
- Playlists page load: PASS/FAIL
- Create playlist modal: PASS/FAIL
- Playlist editor load: PASS/FAIL
- Add media items: PASS/FAIL
- Drag-drop reorder: PASS/FAIL
- Transition effects: PASS/FAIL
- Save and reload persistence: PASS/FAIL -- (note if backend-dependent)

**Bugs found:**
- BUG-XX: [description] (severity)
  OR
- None

**Console errors:** N total, M benign (backend not running), K genuine

**Screenshots:** [list only if bugs found]
```

Use `page.waitForTimeout(500)` between navigation actions to let the SPA render. Use `page.waitForSelector` for critical elements before interacting. For drag-drop, try the realistic DragEvent approach first, fall back to move up/down buttons if needed.
  </action>
  <verify>
    <automated>grep -q "QT-72" .planning/BUGS.md && echo "PASS: QT-72 findings appended" || echo "FAIL: QT-72 not found in BUGS.md"</automated>
  </verify>
  <done>Playlist CRUD QA walkthrough complete. All 7 feature areas tested. Findings appended to BUGS.md with PASS/FAIL status per feature, any bugs documented with BUG-XX IDs, and console errors categorized.</done>
</task>

</tasks>

<verification>
- .planning/BUGS.md contains QT-72 section with all 7 feature areas tested
- Any bugs found have BUG-XX identifiers and severity ratings
- Screenshots exist only for broken behavior (none if everything passes)
</verification>

<success_criteria>
- Playlists page loads and all 7 feature areas exercised
- Findings documented in BUGS.md with clear PASS/FAIL per feature
- Console errors categorized (benign vs genuine)
</success_criteria>

<output>
After completion, create `.planning/quick/72-qa-walkthrough-playlist-crud-drag-drop-r/72-SUMMARY.md`
</output>
