---
phase: quick-71
plan: 71
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-MEDIA]

must_haves:
  truths:
    - "Media page loads and renders grid view by default"
    - "Upload modal opens and accepts image files"
    - "Grid/list view toggle switches display mode"
    - "Folder creation modal opens and creates a folder"
    - "Search filters media items by query"
    - "Delete confirmation modal appears and removes item"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for Media page walkthrough"
  key_links: []
---

<objective>
QA walkthrough of the Media Library page: exercise upload, grid/list view toggle, folder creation, file move, search, and delete flows. Screenshot only broken behavior. Check console for errors. Append findings to BUGS.md.

Purpose: Validate Media page CRUD and organization features work correctly in dev mode.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/MediaLibraryPage.jsx
@src/components/media/YodeckAddMediaModal.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: QA walkthrough - Media page features via Playwright</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a Playwright script (using @playwright/test or a standalone node script with chromium.launch) against localhost:5173 to perform the following Media page QA walkthrough:

1. **Login and navigate to Media (All Media)**
   - Go to localhost:5173, log in (DEV_AUTH_BYPASS is active so the app auto-authenticates)
   - Click "Media" in sidebar to expand, then click "All Media" (page id: media-all)
   - Verify the page loads with title containing "Media" or "All Media"

2. **Grid/List view toggle**
   - Look for grid/list toggle buttons (Grid3X3 and List icons)
   - Click the List view button, verify the layout changes (look for table/list elements)
   - Click the Grid view button, verify it switches back to card grid
   - Screenshot ONLY if toggle is broken or missing

3. **Upload flow**
   - Click the "Add Media" or plus button to open YodeckAddMediaModal
   - Verify upload modal opens with tabs (Upload, Web Page, etc.)
   - Do NOT actually upload a file (no backend), just verify the modal renders correctly
   - Close the modal
   - Screenshot ONLY if modal fails to open or renders incorrectly

4. **Create folder**
   - Look for a "Create Folder" or "New Folder" button/option
   - Click it, verify the folder creation modal/dialog appears
   - Screenshot ONLY if folder creation UI is broken or missing

5. **Search**
   - Find the search input (Search icon or SearchBar component)
   - Type a search query like "test"
   - Verify the search filters or shows "no results" state
   - Clear the search
   - Screenshot ONLY if search is broken

6. **Delete flow**
   - If any media items exist (mock/demo data), try to select one and click delete
   - Verify the delete confirmation modal appears with usage check warning
   - Cancel the delete
   - If no items exist, verify empty state renders correctly
   - Screenshot ONLY if delete UI is broken

7. **Console errors**
   - Collect all console errors throughout the walkthrough
   - Filter out benign errors: Supabase connection refused (127.0.0.1:54321), fetch failures for backend APIs
   - Report any genuine code errors (uncaught exceptions, React errors, import failures)

8. **Sub-pages**
   - Navigate through at least 2 media sub-pages (Images, Videos) via sidebar
   - Verify each loads with appropriate filter applied
   - Screenshot ONLY if a sub-page crashes or shows wrong content

After the walkthrough, append findings to .planning/BUGS.md in this format:

```
## QT-71: Media Page QA Walkthrough (YYYY-MM-DD)

**Status:** PASS/FAIL -- summary

**Features tested:**
- Grid/list toggle: PASS/FAIL
- Upload modal: PASS/FAIL
- Folder creation: PASS/FAIL
- Search: PASS/FAIL
- Delete flow: PASS/FAIL
- Media sub-pages: PASS/FAIL

**Bugs found:**
- BUG-XX: [description] (severity)

**Console errors:** N total, M benign (backend not running), K genuine

**Screenshots:** [list only if bugs found]
```

Use `page.waitForTimeout(500)` between navigation actions to let the SPA render. Use `page.waitForSelector` for critical elements before interacting.
  </action>
  <verify>
    <automated>grep -q "QT-71" .planning/BUGS.md && echo "PASS: QT-71 findings appended" || echo "FAIL: QT-71 not found in BUGS.md"</automated>
  </verify>
  <done>Media page QA walkthrough complete. All 6 feature areas tested. Findings appended to BUGS.md with PASS/FAIL status per feature, any bugs documented with BUG-XX IDs, and console errors categorized.</done>
</task>

</tasks>

<verification>
- .planning/BUGS.md contains QT-71 section with all 6 feature areas tested
- Any bugs found have BUG-XX identifiers and severity ratings
- Screenshots exist only for broken behavior (none if everything passes)
</verification>

<success_criteria>
- Media page loads and all 6 feature areas exercised
- Findings documented in BUGS.md with clear PASS/FAIL per feature
- Console errors categorized (benign vs genuine)
</success_criteria>

<output>
After completion, create `.planning/quick/71-qa-walkthrough-media-page-upload-grid-li/71-SUMMARY.md`
</output>
