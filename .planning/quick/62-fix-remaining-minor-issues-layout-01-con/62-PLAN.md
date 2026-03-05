---
phase: quick-62
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/hooks/useScreensData.js
  - src/pages/ScreensPage.jsx
  - src/components/welcome/WelcomeFeatureCards.jsx
  - src/components/layout/Header.jsx
  - src/App.jsx
autonomous: true
requirements: [LAYOUT-01-MUTUAL-EXCLUSIVITY, WELCOME-TEAL, BREADCRUMB-WELCOME, TITLE-DEV-AUTH]
must_haves:
  truths:
    - "Assigning a layout via content picker clears any assigned playlist (and vice versa)"
    - "Welcome page template card uses brand gradient (orange/blue) not teal"
    - "Breadcrumb shows 'Welcome' when on the Welcome page, not 'Dashboard'"
    - "Page title updates from 'Sign In' when navigating into the app after dev auth bypass"
  artifacts:
    - path: "src/pages/hooks/useScreensData.js"
      provides: "Mutual exclusivity in handleAssignPlaylist and handleAssignLayout"
      contains: "assigned_layout_id: null"
    - path: "src/components/welcome/WelcomeFeatureCards.jsx"
      provides: "Brand-colored template card preview"
      contains: "from-orange"
    - path: "src/components/layout/Header.jsx"
      provides: "Correct Welcome breadcrumb label"
      contains: "welcome.*Welcome"
  key_links:
    - from: "src/pages/ScreensPage.jsx"
      to: "src/pages/hooks/useScreensData.js"
      via: "handleContentSelected calls handleAssignPlaylist or handleAssignLayout"
      pattern: "handleAssignLayout|handleAssignPlaylist"
---

<objective>
Fix four minor issues found during QA: content picker mutual exclusivity (LAYOUT-01), welcome page teal card, breadcrumb label on Welcome page, and stale page title after dev auth bypass.

Purpose: Polish pass to resolve remaining visual and functional inconsistencies.
Output: Corrected behavior in content assignment, branding, breadcrumbs, and page titles.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/hooks/useScreensData.js
@src/pages/ScreensPage.jsx
@src/components/welcome/WelcomeFeatureCards.jsx
@src/components/layout/Header.jsx
@src/App.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix LAYOUT-01 content picker mutual exclusivity</name>
  <files>src/pages/hooks/useScreensData.js</files>
  <action>
In `handleAssignPlaylist` (line ~340): When a playlist is assigned (playlistId is truthy), also clear the layout assignment in the local state update. Update the `setScreens` mapper to set `assigned_layout_id: null` and `assigned_layout: null` alongside the playlist assignment.

In `handleAssignLayout` (line ~368): When a layout is assigned (layoutId is truthy), also clear the playlist assignment in the local state update. Update the `setScreens` mapper to set `assigned_playlist_id: null` and `assigned_playlist: null` alongside the layout assignment.

Only clear the opposite assignment when the new value is truthy (not when un-assigning). This ensures:
- Assigning a playlist clears layout
- Assigning a layout clears playlist
- Un-assigning either does NOT touch the other
  </action>
  <verify>
    <automated>grep -A 15 "handleAssignPlaylist" src/pages/hooks/useScreensData.js | grep "assigned_layout_id: null" && grep -A 15 "handleAssignLayout" src/pages/hooks/useScreensData.js | grep "assigned_playlist_id: null" && echo "PASS"</automated>
  </verify>
  <done>Assigning a playlist clears layout state and vice versa. Un-assigning either leaves the other untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Fix welcome teal card, breadcrumb label, and page title</name>
  <files>src/components/welcome/WelcomeFeatureCards.jsx, src/components/layout/Header.jsx, src/App.jsx</files>
  <action>
1. **WelcomeFeatureCards.jsx line 79:** Replace the teal gradient `from-teal-400 to-teal-600` with brand colors `from-[#f26f21] to-blue-600` (orange-to-blue brand gradient matching the rest of the app's brand palette).

2. **Header.jsx line 32:** Change the breadcrumb config for welcome from `welcome: { label: 'Dashboard' }` to `welcome: { label: 'Welcome' }`.

3. **App.jsx:** Add a `useEffect` that updates `document.title` when `currentPage` changes inside the authenticated app. Place it near the existing `useEffect` that clears toast on page change (around line 335). The effect should set `document.title` to a formatted title like `${pageLabel} - BizScreen` where pageLabel is derived from the navigation config or a simple capitalize of currentPage. This ensures the stale "Sign In" title from the login page gets replaced when entering the app.

For the title effect, use a simple mapping approach:
```js
useEffect(() => {
  // Update document title for app pages (clears stale auth page titles)
  const label = currentPage.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  document.title = `${label} - BizScreen`;
}, [currentPage]);
```
  </action>
  <verify>
    <automated>grep "from-teal" src/components/welcome/WelcomeFeatureCards.jsx; test $? -ne 0 && grep "from-\[#f26f21\]" src/components/welcome/WelcomeFeatureCards.jsx && grep "welcome.*Welcome" src/components/layout/Header.jsx && grep "document.title" src/App.jsx | grep -v "^[[:space:]]*//" && echo "PASS"</automated>
  </verify>
  <done>Template card uses brand orange/blue gradient. Welcome breadcrumb says "Welcome". Document title updates on every page navigation within the app.</done>
</task>

</tasks>

<verification>
- Navigate to Screens page, open content picker for a screen, assign a layout -- verify playlist column clears
- Navigate to Welcome page -- breadcrumb says "Welcome" not "Dashboard"
- Welcome page template card shows orange-to-blue gradient, no teal
- After dev auth bypass login, check browser tab title shows current page name, not "Sign In"
</verification>

<success_criteria>
- Content picker assignment is mutually exclusive (layout clears playlist, playlist clears layout)
- No teal colors remain in WelcomeFeatureCards template card
- Breadcrumb reads "Welcome" on the Welcome page
- Browser tab title reflects current page after auth bypass
</success_criteria>

<output>
After completion, create `.planning/quick/62-fix-remaining-minor-issues-layout-01-con/62-SUMMARY.md`
</output>
