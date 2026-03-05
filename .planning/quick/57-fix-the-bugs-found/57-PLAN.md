---
phase: quick-57
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/MediaLibraryPage.jsx
  - src/pages/TemplateMarketplacePage.jsx
  - src/pages/PlaylistsPage.jsx
  - src/pages/ProofOfPlayPage.jsx
  - src/pages/Admin/AdminTenantsListPage.jsx
  - src/pages/Admin/AdminAuditLogsPage.jsx
  - src/pages/Admin/AdminSystemEventsPage.jsx
  - src/pages/AdminTestPage.jsx
  - src/pages/TenantAdminPage.jsx
  - src/pages/SuperAdminDashboardPage.jsx
  - src/pages/AdminDashboardPage.jsx
  - src/pages/FeatureFlagsPage.jsx
  - src/services/authService.js
  - src/components/ErrorBoundary.jsx
  - src/App.jsx
  - src/components/layout/Header.jsx
autonomous: true
must_haves:
  truths:
    - "Media Audio page heading says 'Audio' not 'Audios'"
    - "Listings route removed or redirected to locations"
    - "Template Marketplace page has a visible h1 heading"
    - "Access Denied pages have a 'Go to Dashboard' navigation button"
    - "Playlists page uses 'Create Playlist' consistently"
    - "Proof of Play disabled Export CSV button has tooltip"
    - "Reset password error does not expose internal URLs"
    - "ErrorBoundary Try Again button uses brand color, not green"
  artifacts:
    - path: "src/pages/MediaLibraryPage.jsx"
      provides: "Fixed getPageTitle to use plural map instead of appending 's'"
    - path: "src/services/authService.js"
      provides: "Sanitized error message in requestPasswordReset catch block"
    - path: "src/components/ErrorBoundary.jsx"
      provides: "Brand-colored Try Again button"
  key_links: []
---

<objective>
Fix 8 open UI bugs (BUG-04, BUG-09, BUG-10, BUG-11, BUG-12, BUG-14, BUG-15, BUG-16) from BUGS.md.
All are small, self-contained fixes across different files.

Purpose: Close out remaining QA bugs for a clean bug-free state.
Output: All 8 bugs fixed, BUGS.md updated to mark them resolved.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix 5 quick single-line bugs (BUG-04, BUG-09, BUG-12, BUG-15, BUG-16)</name>
  <files>src/pages/MediaLibraryPage.jsx, src/App.jsx, src/components/layout/Header.jsx, src/pages/PlaylistsPage.jsx, src/services/authService.js, src/components/ErrorBoundary.jsx</files>
  <action>
**BUG-04 (Media Audio heading says "Audios"):**
In `src/pages/MediaLibraryPage.jsx`, the `getPageTitle()` function at ~line 281 does `MEDIA_TYPE_LABELS[filter] + 's'` which naively pluralizes "Audio" to "Audios". Replace with a plural map:
```js
const MEDIA_TYPE_PLURALS = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  document: 'Documents',
  web_page: 'Web Pages',
  app: 'Apps',
};
```
Change `getPageTitle` to: `return MEDIA_TYPE_PLURALS[filter] || MEDIA_TYPE_LABELS[filter];`
Also fix the empty state titles at ~lines 405, 415 that do the same `+ 's'` pattern -- use MEDIA_TYPE_PLURALS there too (lowercase).

**BUG-09 (Listings/Locations identical):**
In `src/App.jsx` ~line 614, the `listings` key in the page map renders `<ListingsPage>`. Change it to redirect to locations instead -- replace the ListingsPage JSX with a simple redirect component or just render the LocationsPage component directly with the same props. Also in `src/components/layout/Header.jsx` ~line 43, remove the `listings` entry from the page config so it doesn't appear in navigation.

**BUG-12 (Playlists button naming):**
In `src/pages/PlaylistsPage.jsx`:
- Line ~1094: Change "Add Playlist" to "Create Playlist" (the t() key can stay, just change the fallback)
- Line ~1174: Change "Add Playlist" to "Create Playlist"
This aligns with the pattern used by Schedules ("Create Schedule"), Menu Boards ("New Menu Board"), and the modal title which already says "Create Playlist".

**BUG-15 (Reset password leaks backend URL):**
In `src/services/authService.js` ~line 218-220, the catch block returns `error.message` verbatim which can contain "Failed to fetch" with the raw URL. Change to sanitize:
```js
catch (error) {
  logger.error('Password reset request exception', { error, email });
  const userMessage = error.message?.includes('Failed to fetch')
    ? 'Unable to connect to the server. Please check your connection and try again.'
    : error.message || 'An unexpected error occurred';
  return { success: false, error: userMessage };
}
```

**BUG-16 (ErrorBoundary green button):**
In `src/components/ErrorBoundary.jsx` ~line 109, change `bg-green-600` to `bg-orange-500` and `hover:bg-green-700` to `hover:bg-orange-600` to match the app's brand palette.
  </action>
  <verify>
    <automated>grep -n "MEDIA_TYPE_PLURALS\|audio.*Audio" src/pages/MediaLibraryPage.jsx | head -10 && grep -n "bg-orange-500" src/components/ErrorBoundary.jsx && grep -n "Unable to connect" src/services/authService.js && grep -n "Create Playlist" src/pages/PlaylistsPage.jsx | head -5</automated>
  </verify>
  <done>Audio heading fixed, listings route removed/redirected, playlist buttons say "Create Playlist", password reset error sanitized, ErrorBoundary button uses orange brand color</done>
</task>

<task type="auto">
  <name>Task 2: Fix Access Denied navigation, Template Marketplace heading, and Proof of Play tooltip (BUG-10, BUG-11, BUG-14)</name>
  <files>src/pages/TemplateMarketplacePage.jsx, src/pages/Admin/AdminTenantsListPage.jsx, src/pages/Admin/AdminAuditLogsPage.jsx, src/pages/Admin/AdminSystemEventsPage.jsx, src/pages/AdminTestPage.jsx, src/pages/TenantAdminPage.jsx, src/pages/SuperAdminDashboardPage.jsx, src/pages/AdminDashboardPage.jsx, src/pages/FeatureFlagsPage.jsx, src/pages/ProofOfPlayPage.jsx</files>
  <action>
**BUG-10 (Template Marketplace no heading):**
In `src/pages/TemplateMarketplacePage.jsx` ~line 332, the `PageLayout` component receives `title="Template Marketplace"` but PageLayout does NOT render titles -- it only provides spacing. Add a `PageHeader` inside the PageLayout:
```jsx
import { PageLayout, PageHeader } from '../design-system';
// ... then inside the return, right after <PageLayout ...>
<PageHeader
  title="Template Marketplace"
  description="Browse and install professional scene templates"
/>
```
Remove the `title` and `description` props from `PageLayout` since they are ignored.

**BUG-11 (Access Denied without navigation):**
Add a "Go to Dashboard" button to every Access Denied block. Each file has a slightly different structure but the pattern is the same -- after the "Access Denied" text and description paragraph, add:
```jsx
<button
  onClick={() => window.location.hash = '#/app/dashboard'}
  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
>
  Go to Dashboard
</button>
```

Files and approximate locations:
- `src/pages/Admin/AdminTenantsListPage.jsx` ~line 97 (after the `<p>` tag)
- `src/pages/Admin/AdminAuditLogsPage.jsx` ~line 78 (after the `<p>` tag)
- `src/pages/Admin/AdminSystemEventsPage.jsx` ~line 79 (after the `<p>` tag)
- `src/pages/AdminTestPage.jsx` ~line 122 (after Access Denied heading)
- `src/pages/TenantAdminPage.jsx` ~line 294 (after the `<p>` tag)
- `src/pages/SuperAdminDashboardPage.jsx` ~line 220 (after the `<p>` tag)
- `src/pages/AdminDashboardPage.jsx` ~line 330 (after the `<p>` tag)
- `src/pages/FeatureFlagsPage.jsx` ~line 86 (uses Alert component -- add button after the Alert)

Use `useNavigate` if already imported, or use `window.location` for simplicity. Check each file for existing router imports first.

**BUG-14 (Export CSV disabled with no explanation):**
In `src/pages/ProofOfPlayPage.jsx` ~line 183-191, the Export CSV button is disabled when `loading || reportData.length === 0`. Wrap it in a `<div>` with a `title` attribute for a native tooltip:
```jsx
<div title={reportData.length === 0 ? 'No data available to export' : undefined}>
  <Button ... disabled={loading || reportData.length === 0}>
    Export CSV
  </Button>
</div>
```
Note: when a button is disabled, hover events don't fire on it in some browsers, so the tooltip must be on the wrapper div.
  </action>
  <verify>
    <automated>grep -rn "Go to Dashboard" src/pages/Admin/ src/pages/AdminTestPage.jsx src/pages/TenantAdminPage.jsx src/pages/SuperAdminDashboardPage.jsx src/pages/AdminDashboardPage.jsx src/pages/FeatureFlagsPage.jsx | wc -l && grep -n "PageHeader" src/pages/TemplateMarketplacePage.jsx && grep -n "No data available" src/pages/ProofOfPlayPage.jsx</automated>
  </verify>
  <done>Template Marketplace has visible h1 heading, all Access Denied pages have "Go to Dashboard" button (at least 8 instances), Export CSV button has tooltip explaining disabled state</done>
</task>

<task type="auto">
  <name>Task 3: Update BUGS.md to mark all 8 bugs as resolved</name>
  <files>BUGS.md</files>
  <action>
Move BUG-04, BUG-09, BUG-10, BUG-11, BUG-12, BUG-14, BUG-15, BUG-16 from the "Open Issues" / "Visual/UX Issues (Open)" / "Auth/Onboarding Review" sections to the "Resolved Issues" section. For each, add:
- `[RESOLVED]` prefix to the heading
- `Resolution:` line: "Fixed in quick task 57" with brief description of fix
- `Verified:` line: "2026-03-05"

Update the summary counts:
- Bugs resolved: 14 (was 6)
- Bugs open: 2 (BUG-02, BUG-03 -- dev-mode routing issues)
  </action>
  <verify>
    <automated>grep -c "RESOLVED" BUGS.md</automated>
  </verify>
  <done>BUGS.md shows 14 resolved bugs (all except BUG-02 and BUG-03), summary counts updated</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds without errors
- grep confirms no remaining `bg-green-600` in ErrorBoundary.jsx
- grep confirms no remaining `+ 's'` naive pluralization in MediaLibraryPage.jsx getPageTitle
- BUGS.md shows 14/16 bugs resolved
</verification>

<success_criteria>
All 8 targeted bugs are fixed. Build passes. BUGS.md updated to reflect resolved status.
</success_criteria>

<output>
After completion, create `.planning/quick/57-fix-the-bugs-found/57-SUMMARY.md`
</output>
