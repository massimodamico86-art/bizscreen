---
phase: quick-76
plan: 76
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-SCENES-CRUD]

must_haves:
  truths:
    - "Scenes page loads with scene cards or empty state, page header shows 'Scenes' title and Create Scene button"
    - "Create Scene button triggers the IndustryWizard/AutoBuild modal for scene creation"
    - "Scene editor loads for an existing scene with canvas, slide strip, toolbar (text/image/shape/widget add buttons), and properties panel"
    - "Adding a text block creates a visible block on the canvas that can be selected"
    - "Adding an image block creates a visible placeholder block on the canvas"
    - "Blocks can be repositioned via drag on the canvas (or code review confirms drag wiring if no backend)"
    - "Auto-save triggers on design changes (debounced 800ms via updateSlide call)"
    - "Scenes list shows scene cards with Open, Publish, Duplicate, Delete actions"
    - "Console errors are collected and filtered for genuine bugs vs benign Supabase connection failures"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for Scenes CRUD walkthrough"
  key_links:
    - from: "src/pages/ScenesPage.jsx"
      to: "src/services/sceneService.js"
      via: "fetchScenesWithDeviceCounts, deleteScene, duplicateScene"
      pattern: "fetchScenesWithDeviceCounts|deleteScene|duplicateScene"
    - from: "src/pages/SceneEditorPage.jsx"
      to: "src/services/sceneDesignService.js"
      via: "fetchSlidesForScene, createSlide, updateSlide, block creation helpers"
      pattern: "createTextBlock|createImageBlock|addBlockToDesign|updateSlide"
    - from: "src/pages/SceneEditorPage.jsx"
      to: "src/components/scene-editor/EditorCanvas.jsx"
      via: "design prop, onBlockSelect, onBlockUpdate callbacks"
      pattern: "EditorCanvas.*design|onBlockSelect|onBlockUpdate"
---

<objective>
QA walkthrough of the Scenes CRUD flow: navigate to Scenes page, attempt scene creation (via Create Scene button / AutoBuild modal), open the scene editor, add text and image blocks to the canvas, verify block repositioning wiring, check auto-save behavior, and verify scene list card actions (Open, Duplicate, Delete). Since there is no live Supabase backend, use a hybrid approach: Playwright for UI verification of what renders, and code review for backend-dependent operations (create, save, delete). Screenshot each step. Collect console errors, filter benign Supabase/fetch failures. Append findings to BUGS.md.

Purpose: Validate the Scenes CRUD pipeline is correctly wired from list page through editor canvas to save/delete operations.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/ScenesPage.jsx
@src/pages/SceneEditorPage.jsx
@src/pages/SceneDetailPage.jsx
@src/services/sceneService.js
@src/services/sceneDesignService.js
@src/components/scene-editor/EditorCanvas.jsx
@src/components/scene-editor/PropertiesPanel.jsx
@src/components/scene-editor/SlideStrip.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough - Scenes page listing, Create Scene button, and scene editor UI</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_scenes_walkthrough.cjs`) using `chromium.launch` against localhost:5173 to perform the Scenes CRUD QA walkthrough.

**Collect all console errors throughout (filter out known benign Supabase/fetch errors to 127.0.0.1:54321).**

**Step 1: Scenes Page**
1. Navigate to localhost:5173 (auto-auth via DEV_AUTH_BYPASS)
2. Click "Scenes" in sidebar navigation
3. Wait for page to load -- expect either scene cards or empty state with "Create Scene" button in header
4. Screenshot as `screenshots/76-01-scenes-page.png`
5. Verify page header shows "Scenes" title and "Create Scene" button is visible

**Step 2: Create Scene Button**
6. Click "Create Scene" button
7. Wait 1s for modal/wizard to appear (IndustryWizard or AutoBuild modal)
8. Screenshot the result as `screenshots/76-02-create-scene-modal.png`
9. Close the modal if it appeared (click backdrop or close button)

**Step 3: Navigate to Scene Editor**
10. Use `__setCurrentPage('scene-editor-demo-1')` to navigate directly to the editor (since creating a real scene requires Supabase)
11. Wait for editor page to load -- it will show loading then error state since scene-id 'demo-1' doesn't exist in DB
12. Screenshot editor state as `screenshots/76-03-scene-editor-attempt.png`

**Step 4: Code Review Verification**
After the Playwright UI walkthrough, perform code review to verify:

a) **Scene creation wiring:** ScenesPage.handleCreateScene calls onShowAutoBuild which triggers the IndustryWizard modal in App.jsx. Confirm the prop chain is connected.

b) **Editor block operations:** SceneEditorPage.handleAddBlock correctly creates text/image/shape/widget blocks using sceneDesignService helpers (createTextBlock, createImageBlock, createShapeBlock, createWidgetBlock) and adds them via addBlockToDesign.

c) **Canvas drag-drop:** EditorCanvas receives design prop and onBlockUpdate callback. Verify it has mousedown/mousemove/mouseup handlers for block repositioning (isDragging state, dragStart coordinates, position calculation).

d) **Auto-save:** SceneEditorPage.debouncedSave calls updateSlide after 800ms delay. Verify saveStatus state transitions: 'saved' -> 'unsaved' -> 'saving' -> 'saved'.

e) **Delete/Duplicate:** ScenesPage calls deleteScene and duplicateScene from sceneService.js with proper error handling and toast feedback.

f) **Scene card actions:** SceneCard component renders Open, Publish, Duplicate, Delete, and "Push as Emergency" buttons with proper onClick handlers.

**Collect results:**
- List each verification point as PASS/FAIL/WARN
- For any FAIL, screenshot the broken state and describe the bug
- For genuine console errors (not Supabase connection), document as potential bugs
- Append all findings to .planning/BUGS.md under a new `## QT-76: Scenes CRUD Walkthrough` section
  </action>
  <verify>
    <automated>node _tmp_qa_scenes_walkthrough.cjs 2>&1 | tail -5</automated>
  </verify>
  <done>
- Screenshots captured for Scenes page, Create Scene modal, and editor attempt
- Code review confirms: scene creation wiring, block add operations, canvas drag-drop handlers, auto-save debounce, delete/duplicate actions
- All findings appended to .planning/BUGS.md with PASS/FAIL/WARN for each verification point
- Console errors filtered and genuine bugs documented
  </done>
</task>

</tasks>

<verification>
- .planning/BUGS.md has a `## QT-76` section with verification results
- Screenshots exist in screenshots/76-*.png
- Each of the 6 code review points (creation wiring, block ops, drag-drop, auto-save, delete/duplicate, card actions) has a verdict
</verification>

<success_criteria>
All Scenes CRUD verification points assessed as PASS/FAIL/WARN with evidence. Any genuine bugs documented with severity and description. No false positives from Supabase connection failures.
</success_criteria>

<output>
After completion, create `.planning/quick/76-qa-walkthrough-scenes-crud-create-scene-/76-SUMMARY.md`
</output>
