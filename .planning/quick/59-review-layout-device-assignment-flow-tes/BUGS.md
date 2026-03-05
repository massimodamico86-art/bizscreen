# Layout-Device Assignment Flow - Bug Report

**Date:** 2026-03-05
**Reviewer:** Claude Opus 4.6 (automated code review + Playwright E2E testing)
**Scope:** Layout-to-screen assignment flow across content picker modal, edit screen modal, layout gallery, and content display

---

## Summary

**No critical or major bugs found.** The layout-device assignment flow is well-implemented with proper mutual exclusivity between playlist and layout assignments, optimistic UI updates with error rollback, and clear content display logic.

One minor issue was identified during code review.

---

## Bugs Found

### LAYOUT-01: Content Picker Modal does not clear playlist when layout is assigned

- **Severity:** minor
- **Component:** `src/pages/ScreensPage.jsx` (handleContentSelected) + `src/pages/hooks/useScreensData.js` (handleAssignLayout)
- **Description:** When a layout is assigned via the InsertContentModal content picker, the `handleAssignLayout` function only updates `assigned_layout_id` and `assigned_layout` on the screen. It does NOT clear the `assigned_playlist_id` or `assigned_playlist`. This means a screen could theoretically have both a playlist and layout assigned simultaneously via the content picker path.
- **Expected:** Assigning a layout via the content picker should clear any existing playlist assignment (matching the mutual exclusivity logic in the EditScreenModal where selecting a layout clears the playlist dropdown, lines 976-979).
- **Actual:** The `handleAssignLayout` callback (useScreensData.js lines 368-394) and the underlying `assignLayoutToScreen` service call (screenService.js line 110-112) only update `assigned_layout_id`. The playlist assignment remains unchanged. The `handleContentSelected` in ScreensPage.jsx (lines 210-222) calls either `handleAssignPlaylist` or `handleAssignLayout` independently without cross-clearing.
- **Impact:** The ScreenCard `getContentDisplay()` function (ScreensComponents.jsx lines 302-306) prioritizes playlist over layout display, so the layout would be silently hidden if a playlist is already assigned. The screen's actual behavior depends on the backend/player which may handle this differently.
- **Status:** open
- **Recommendation:** Either:
  (a) Add playlist-clearing logic to `handleAssignLayout` (and vice versa for `handleAssignPlaylist`), or
  (b) Update `assignLayoutToScreen` service to also set `assigned_playlist_id: null`, or
  (c) Accept the current behavior and document that the EditScreenModal is the canonical way to manage mutual exclusivity

---

## Areas Reviewed (No Bugs Found)

### InsertContentModal (src/components/modals/InsertContentModal.jsx)
- Layouts tab loads correctly via `fetchLayouts()` when tab is switched
- Layout items display correctly with thumbnail, name, and zone count
- Selection calls `onSelect(item, activeTab)` with correct `activeTab='layouts'` value
- The `allowedTabs` prop correctly restricts tabs in the screens page to `['playlists', 'layouts']`

### EditScreenModal (src/pages/components/ScreensComponents.jsx lines 838-1013)
- Layout dropdown populates correctly from `layouts` prop
- **Mutual exclusivity works correctly:** Selecting a playlist clears layoutId (line 964), selecting a layout clears playlistId (line 978)
- OrientationMismatchWarning renders for layout assignments with correct orientation detection (lines 986-996)
- Form submits all fields including `layoutId`

### Content Display on ScreenCard (lines 302-306)
- Correctly prioritizes playlist over layout display
- Falls back to "No Content Assigned" when neither is set
- Content cell is clickable and triggers `onOpenContentPicker`

### handleAssignLayout in useScreensData (lines 368-394)
- Optimistic UI update works correctly with immediate state update
- Error handling properly logs and shows toast on failure
- Loading state tracked via `assigningLayout`

### OrientationMismatchWarning
- Correctly detects portrait aspect ratios ('9:16', '3:4')
- Renders for layout assignments with `contentType="layout"`
- Only shown when layoutId is selected (conditional rendering at line 986)

### LayoutEditorPage
- Preset layouts render correctly (Full Screen, Two Columns, etc.)
- Zone CRUD operations properly wired up

### LayoutsPage (Template Gallery)
- Gallery loads with sidebar categories, search, and template grid
- Search filtering works correctly
- "Your Designs" section accessible

---

## NOTES (Code Quality Observations)

### 1. Inconsistent content assignment architecture
The content picker modal path and the edit screen modal path have different behaviors regarding mutual exclusivity. The EditScreenModal enforces mutual exclusivity client-side (clearing playlist when layout is selected, and vice versa), but the content picker modal does not. This creates two different "truth" paths that could lead to data inconsistency. Recommend enforcing mutual exclusivity at the service layer (`assignLayoutToScreen` should also clear `assigned_playlist_id`).

### 2. No optimistic UI rollback on assignment failure
The `handleAssignLayout` function (useScreensData.js lines 368-394) performs an optimistic UI update by modifying screen state immediately, but if the API call fails, it shows an error toast but does NOT roll back the optimistic update. The screen state will show the layout as assigned even though the backend rejected it. The same pattern exists for `handleAssignPlaylist`. Consider saving the previous state and rolling back on error.

### 3. ScreenActionMenu has unused `_onClose` parameter
The `ScreenActionMenu` component (ScreensComponents.jsx line 416) receives `_onClose` with a leading underscore (indicating intentionally unused), but this parameter is defined as `onClose` in the parent's props destructuring pattern. This is a cosmetic issue that could confuse maintainers.

### 4. Content picker uses separate data fetch
The `InsertContentModal` fetches layouts independently via `fetchLayouts()` (line 304) rather than receiving them as props. This means layouts are fetched twice when the screens page loads (once in `useScreensData` hook, once when the modal opens). Consider passing layouts as a prop to avoid redundant API calls.
