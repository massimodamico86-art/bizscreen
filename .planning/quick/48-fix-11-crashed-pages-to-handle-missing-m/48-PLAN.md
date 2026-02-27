---
phase: quick-48
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/ListingsPage.jsx
  - src/pages/OpsConsolePage.jsx
  - src/pages/DemoToolsPage.jsx
  - src/pages/ActivityLogPage.jsx
  - src/pages/SecurityDashboardPage.jsx
  - src/pages/TeamPage.jsx
  - src/pages/ServiceQualityPage.jsx
  - src/pages/DeviceDiagnosticsPage.jsx
  - src/pages/DataSourcesPage.jsx
  - src/pages/TemplateMarketplacePage.jsx
  - src/pages/TranslationDashboardPage.jsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "All 11 pages render without crashing when navigated to"
    - "Pages show empty/loading states instead of white-screen crashes"
    - "Error messages display as text strings, not [object Object]"
  artifacts:
    - path: "src/pages/ListingsPage.jsx"
      provides: "Fixed imports and defensive data handling"
    - path: "src/pages/OpsConsolePage.jsx"
      provides: "Fixed Button/Badge imports and variant"
    - path: "src/pages/DemoToolsPage.jsx"
      provides: "Fixed Modal prop (open instead of isOpen)"
  key_links:
    - from: "src/pages/ListingsPage.jsx"
      to: "src/design-system/index.js"
      via: "Button, Card, Badge imports"
      pattern: "from '../design-system'"
    - from: "src/pages/OpsConsolePage.jsx"
      to: "src/design-system/index.js"
      via: "Button, Badge imports"
      pattern: "from '../design-system'"
---

<objective>
Fix 11 pages that crash with "Objects are not valid as a React child" or undefined component errors. The crashes fall into 3 categories: (A) missing/wrong component imports causing immediate render failure, (B) wrong Modal prop name causing crash on modal open, (C) error state storing objects instead of strings.

Purpose: Make all pages navigable without white-screen crashes, especially in dev auth bypass mode where Supabase returns empty/error data.
Output: All 11 pages render gracefully with empty/loading/error states.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key design-system facts (from codebase analysis):
- Button variants: primary, secondary, ghost, danger (NO "outline" variant)
- Modal uses `open` prop (NOT `isOpen`)
- Badge component is in design-system (NOT lucide-react -- lucide Badge is an SVG icon)
- ErrorBoundary is at src/components/ErrorBoundary.jsx
- Grid is exported from design-system (in PageLayout.jsx)

Prior decisions from STATE.md:
- Phase 86: Button variant="outline" replaced with variant="secondary"
- Phase 88: Modal prop isOpen renamed to open
- Phase 85: Badge collision fix -- remove Badge from lucide-react import

Existing modal components for ListingsPage (confirmed to exist):
- src/components/listings/PropertyDetailsModal.jsx
- src/components/listings/TVPreviewModal.jsx
- src/components/listings/AddListingModal.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix critical missing imports and Badge/Button collisions (ListingsPage + OpsConsolePage)</name>
  <files>
    src/pages/ListingsPage.jsx
    src/pages/OpsConsolePage.jsx
  </files>
  <action>
**ListingsPage.jsx** -- This page has 6 undefined component references and crashes immediately on render:

1. Add design-system imports: `import { Button, Card, Badge } from '../design-system';`
2. Add ErrorBoundary import: `import ErrorBoundary from '../components/ErrorBoundary';`
3. Add listing modal imports (these files exist at src/components/listings/):
   `import PropertyDetailsModal from '../components/listings/PropertyDetailsModal';`
   `import TVPreviewModal from '../components/listings/TVPreviewModal';`
   `import AddListingModal from '../components/listings/AddListingModal';`
4. Remove `Badge` from the lucide-react import (line 9) -- it collides with design-system Badge. The page uses `<Badge variant={...}>` which requires the design-system Badge component, not the lucide icon.
5. Replace all `variant="outline"` with `variant="secondary"` (3 instances: lines 207, 236, 269)
6. Add defensive guard on listings prop: at top of component body, add `const safeListings = Array.isArray(listings) ? listings : [];` and use `safeListings` instead of `listings` in the `filteredListings` filter (line 31) and the `.map` (line 243). Keep `listings` for `setListings` calls since the parent manages it.

**OpsConsolePage.jsx** -- Missing Button import, Badge collision, invalid variant:

1. Add design-system imports: `import { Button, Badge } from '../design-system';`
   The page uses `<Button>` (lines 243, 393+) and `<Badge variant="danger">` (line 273). No Card import needed -- this page uses raw divs for cards.
2. Remove `Badge` from the lucide-react import (line 9) -- same collision pattern as ListingsPage. The page uses `<Badge variant="danger">{tab.badge}</Badge>` which requires design-system Badge.
3. Replace `variant="outline"` with `variant="secondary"` (line 246)
  </action>
  <verify>
Run `npx vite build 2>&1 | tail -5` -- build should succeed. Then verify fixes: `grep -n 'variant="outline"' src/pages/ListingsPage.jsx src/pages/OpsConsolePage.jsx` should return nothing. `grep -rn "Badge" src/pages/ListingsPage.jsx src/pages/OpsConsolePage.jsx | grep lucide` should return nothing.
  </verify>
  <done>
ListingsPage renders without crashing -- shows locations list or empty state. OpsConsolePage renders without crashing -- tabs work, Badge renders properly with variant.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix Modal isOpen prop and error-as-object rendering (DemoToolsPage + ActivityLogPage + SecurityDashboardPage)</name>
  <files>
    src/pages/DemoToolsPage.jsx
    src/pages/ActivityLogPage.jsx
    src/pages/SecurityDashboardPage.jsx
  </files>
  <action>
**DemoToolsPage.jsx** -- Modal crashes when opened because it uses `isOpen` instead of `open`:

1. Line 430 (CreateDemoModal): Change `<Modal isOpen onClose={onClose} size="md">` to `<Modal open onClose={onClose} size="md">`
2. Line 532 (DemoLinksModal): Same change
3. Line 600 (DemoSettingsModal): Same change

**ActivityLogPage.jsx** -- `setError(fetchError)` on line 110 stores whatever the service returns. If the service returns an object (e.g., Supabase error `{message, details, hint, code}`), rendering `{error}` on line 222 crashes with "Objects are not valid as a React child".

1. Line 110: Change `setError(fetchError)` to `setError(typeof fetchError === 'string' ? fetchError : fetchError?.message || 'Failed to load activities')`
2. Line 115: Already uses `err.message` -- add fallback: `setError(err?.message || 'An unexpected error occurred')`

**SecurityDashboardPage.jsx** -- Same error-as-object pattern at line 72:

1. Line 72: Change `setError(eventsResult.error)` to `setError(typeof eventsResult.error === 'string' ? eventsResult.error : eventsResult.error?.message || 'Failed to load security events')`
2. Line 85: Already has fallback -- OK as-is
  </action>
  <verify>
Run `grep -n 'isOpen' src/pages/DemoToolsPage.jsx` should return nothing (or only in comments/jsdoc). Run `grep -n 'setError(fetchError)' src/pages/ActivityLogPage.jsx` should return nothing. Run `grep -n 'setError(eventsResult.error)' src/pages/SecurityDashboardPage.jsx` should return nothing.
  </verify>
  <done>
DemoToolsPage modals open without crashing. ActivityLogPage and SecurityDashboardPage show error strings instead of crashing with [object Object].
  </done>
</task>

<task type="auto">
  <name>Task 3: Add defensive data handling to remaining 6 pages (Team, ServiceQuality, DeviceDiagnostics, DataSources, TemplateMarketplace, Translations)</name>
  <files>
    src/pages/TeamPage.jsx
    src/pages/ServiceQualityPage.jsx
    src/pages/DeviceDiagnosticsPage.jsx
    src/pages/DataSourcesPage.jsx
    src/pages/TemplateMarketplacePage.jsx
    src/pages/TranslationDashboardPage.jsx
  </files>
  <action>
These 6 pages have subtler issues that cause crashes when services return empty/malformed data (especially in dev bypass auth mode where Supabase returns empty results or errors).

**TeamPage.jsx:**
1. Line 93: `setMembers(membersResult.data)` -- guard: `setMembers(Array.isArray(membersResult.data) ? membersResult.data : [])`
2. Line 91: `membersResult.error` passed to toast interpolation -- ensure it's a string: change `{ error: membersResult.error }` to `{ error: typeof membersResult.error === 'string' ? membersResult.error : membersResult.error?.message || 'Unknown error' }`

**ServiceQualityPage.jsx:**
1. The page has good null handling in sub-components, but if any of the 6 parallel fetches in `fetchAllData` throws, the catch block only logs to console (line 658). The page stays in loading state forever.
2. Add `const [error, setError] = useState(null);` state variable (near line 628)
3. In the `fetchAllData` catch block (line 657-658), add: `setError('Failed to load service quality data. Please try again.');`
4. Render an Alert when error is set, inside PageContent before the Stack: `{error && <Alert variant="error" className="mb-4">{error}</Alert>}`
5. Import `Alert` from design-system (add to the existing import on line 41-53)

**DeviceDiagnosticsPage.jsx:**
1. Line 601: `const data = await fetchDevicesWithScreenshots();` -- if this returns null/undefined, `setDevices(data)` causes `devices.filter()` on line 677 to crash. Guard: `setDevices(Array.isArray(data) ? data : [])`
2. The page already has good error/loading states. No other changes needed.

**DataSourcesPage.jsx:**
1. This is a large file (~800 lines). Check the main data load function (around line 375-390). Guard `setDataSources` to ensure value is always an array: wrap data assignments with `Array.isArray(result) ? result : []`
2. Where `selectedSource.fields` and `selectedSource.rows` are used in render (e.g., in map calls), add defensive guards: use `(selectedSource?.fields || []).map(...)` and `(selectedSource?.rows || []).map(...)` patterns.

**TemplateMarketplacePage.jsx:**
1. Line 157: `setTemplates(data)` -- guard: `setTemplates(Array.isArray(data) ? data : [])`
2. Line 155: the client-side orientation filter `data.filter(...)` would crash if data is null. The guard on line 157 handles this, but also guard the filter: `if (orientation && Array.isArray(data)) { data = data.filter(...); }`
3. Line 173-176: `checkFavoritedTemplates` returns a Set via `.then(setFavoritedIds)` -- guard: `.then(ids => setFavoritedIds(ids instanceof Set ? ids : new Set()))`
4. Line 182-184: `getTemplateUsageCounts` returns a Map -- guard: `.then(counts => setUsageCounts(counts instanceof Map ? counts : new Map()))`

**TranslationDashboardPage.jsx:**
1. Line 63-64: `const data = await fetchTranslationDashboard(...)` then `setScenes(data)` -- guard: `setScenes(Array.isArray(data) ? data : [])`
2. Line 280: `renderLanguagePills(scene.variants)` -- already has null/empty check in the function. OK as-is.

For ALL 6 pages: Audit any `.map()`, `.filter()`, `.reduce()`, `.length` access on data from services. Ensure either the state is initialized with `useState([])` AND the setter always receives a validated array, OR the render has an inline guard like `(items || []).map(...)`.
  </action>
  <verify>
Run `npx vite build 2>&1 | tail -5` should succeed. Then verify defensive patterns exist: `grep -c 'Array.isArray' src/pages/TeamPage.jsx src/pages/DeviceDiagnosticsPage.jsx src/pages/DataSourcesPage.jsx src/pages/TemplateMarketplacePage.jsx src/pages/TranslationDashboardPage.jsx` -- each file should have at least 1 match. `grep -c 'Alert' src/pages/ServiceQualityPage.jsx` should show the new Alert import and usage.
  </verify>
  <done>
All 6 pages handle missing/malformed service data gracefully -- show loading/empty/error states instead of crashing. Array operations are guarded against null/undefined returns from services.
  </done>
</task>

</tasks>

<verification>
After all 3 tasks complete:
1. `npx vite build` succeeds without errors
2. Navigate to each of the 11 pages in the running app -- none should show a white screen crash
3. Each page shows appropriate loading/empty/error state when data is unavailable
</verification>

<success_criteria>
- All 11 pages render without "Objects are not valid as a React child" errors
- ListingsPage and OpsConsolePage have correct design-system imports (no Badge collision, no missing Button/Card)
- DemoToolsPage modals use `open` prop instead of `isOpen`
- Error states always render strings, never Error objects
- Array data from services is always guarded with Array.isArray before .map/.filter
- Build succeeds with no new warnings
</success_criteria>

<output>
After completion, create `.planning/quick/48-fix-11-crashed-pages-to-handle-missing-m/48-SUMMARY.md`
</output>
