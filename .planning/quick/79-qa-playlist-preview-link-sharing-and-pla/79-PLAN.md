---
phase: quick-79
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QT-79]
must_haves:
  truths:
    - "Preview link generation flow is code-reviewed for correctness"
    - "PublicPreviewPage renders player controls (play/pause, prev/next, auto-advance)"
    - "Comments section renders when allowComments is true"
    - "Missing Share button in playlist editor toolbar is documented as a bug"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "QA findings appended"
      contains: "QT-79"
  key_links:
    - from: "src/pages/PlaylistEditorPage.jsx"
      to: "src/pages/hooks/usePlaylistEditor.js"
      via: "handleOpenPreviewModal not destructured"
      pattern: "handleOpenPreviewModal"
    - from: "src/pages/PublicPreviewPage.jsx"
      to: "/api/preview/:token"
      via: "fetchPreviewContent"
      pattern: "fetch.*api/preview"
---

<objective>
QA walkthrough of Playlist Preview Link Sharing and the PublicPreviewPage player.

Purpose: Verify the preview link generation flow, the public preview player controls (play/pause, prev/next, auto-advance), and the comments feature. Since there is no Supabase backend running, this is a code-review verification with Playwright confirmation of the PublicPreviewPage route rendering (error/loading states).

Output: Findings appended to BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/BUGS.md
@src/pages/PublicPreviewPage.jsx
@src/pages/PlaylistEditorPage.jsx
@src/pages/hooks/usePlaylistEditor.js
@src/pages/components/PlaylistEditorComponents.jsx
@src/services/previewService.js
@src/router/AppRouter.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Code-review preview link generation and PlaylistPreviewPlayer</name>
  <files>.planning/BUGS.md</files>
  <action>
Perform a thorough code review of the playlist preview link sharing flow. Check these specific areas:

1. **Share button accessibility in PlaylistEditorPage**: The `handleOpenPreviewModal` function is returned by `usePlaylistEditor` hook (line 1493) but is NOT destructured in PlaylistEditorPage.jsx (lines 55-157). The `PreviewLinksModal` component IS rendered (line 746) and receives `showPreviewModal` state, but there is no UI button to trigger `setShowPreviewModal(true)` or `handleOpenPreviewModal`. This means the Share/Preview Links feature is unreachable from the playlist editor UI. Document this as a bug.

2. **PreviewLinksModal component (PlaylistEditorComponents.jsx lines 400-504)**: Review the modal for:
   - Create link form with expiry selector and allowComments checkbox
   - Active links list with copy, open-in-new-tab, and revoke actions
   - The `formatPreviewLink` import on line 485 -- verify it is called correctly (it receives `link.token` but the function in previewService.js expects a full link object, not just a token). This looks like a bug: `formatPreviewLink(link.token)` should be `link.url` or the href should use a different approach.

3. **PublicPreviewPage (PublicPreviewPage.jsx)**: Review the player component:
   - PlaylistPreviewPlayer: Has play/pause toggle (line 516-519), SkipBack/SkipForward buttons (lines 508-528), auto-advance via timer (lines 443-455), progress dots (lines 541-553)
   - CommentsSection: Renders when `allowComments` is true (line 606), has author name input, message input, submit button
   - Loading/error/no-content states all handled

4. **previewService.js**: Review `createPreviewLinkWithPreset` -- uses Supabase auth, generates crypto token, inserts into `preview_links` table. Verify the token generation is URL-safe (line 36-37 replaces +, /, = chars).

5. **Navigate to /preview/test-token via Playwright** to confirm the route resolves and renders the error state ("Preview Unavailable") rather than crashing. Take a screenshot ONLY if the page crashes or shows unexpected content.

After review, append findings to `.planning/BUGS.md` under a new `## QT-79` heading. Document:
- BUG: Missing Share/Preview Links button in playlist editor toolbar (handleOpenPreviewModal not wired)
- BUG: formatPreviewLink called with token string instead of link object in PreviewLinksModal
- PASS/FAIL status for each reviewed component
- Any additional issues found
  </action>
  <verify>
    <automated>grep -q "QT-79" .planning/BUGS.md && echo "PASS: QT-79 findings documented"</automated>
  </verify>
  <done>All preview link sharing components code-reviewed, bugs documented in BUGS.md, PublicPreviewPage route confirmed rendering via Playwright</done>
</task>

</tasks>

<verification>
- BUGS.md contains QT-79 section with findings
- Share button missing bug is documented
- formatPreviewLink misuse bug is documented
- Player controls (play/pause, prev/next, auto-advance) reviewed and status noted
- Comments section reviewed and status noted
</verification>

<success_criteria>
- Code review covers all 5 areas listed in the task action
- At least 2 bugs documented (missing button + formatPreviewLink misuse)
- PublicPreviewPage /preview/:token route tested via Playwright for crash-free rendering
- Findings appended to BUGS.md
</success_criteria>

<output>
After completion, create `.planning/quick/79-qa-playlist-preview-link-sharing-and-pla/79-SUMMARY.md`
</output>
