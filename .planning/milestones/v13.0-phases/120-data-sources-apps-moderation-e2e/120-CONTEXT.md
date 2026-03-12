# Phase 120: Data Sources, Apps & Moderation E2E - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Screenshot-verified E2E tests for data source configuration, apps gallery, menu board editing, and content moderation. Covers 18 requirements: DATA-01 through DATA-05, APP-01 through APP-08, MOD-01 through MOD-05. No production code changes -- test-only phase.

</domain>

<decisions>
## Implementation Decisions

### Test file organization
- 3 spec files matching roadmap success criteria groupings:
  - `data-sources-screenshots.spec.js` (DATA-01 to DATA-05)
  - `apps-menuboards-screenshots.spec.js` (APP-01 to APP-08)
  - `moderation-screenshots.spec.js` (MOD-01 to MOD-05)
- Each file defines its own mock data and page.route() setup independently (no shared mock module)
- Screenshots saved to `screenshots/120/` with descriptive names (no requirement IDs in filenames)
- Global step numbering across files: data-sources 01-05, apps/menu-boards 06-13, moderation 14-18

### Mock data approach
- Data sources: 3-4 varied sources (Google Sheets, CSV, RSS feed, optionally manual table) with distinct names, field counts, and refresh intervals
- Apps: Both built-in catalog entries AND user-installed app instances mocked
- Menu boards: 2 boards (e.g., 'Lunch Menu', 'Drinks'), each with 2-3 categories and 3-4 items per category, including dietary tags and prices
- Moderation: 5-6 social posts with mixed statuses (2-3 pending, 1-2 approved, 1 rejected) from different providers (Instagram, Twitter)

### Navigation approach
- Sidebar click navigation where sidebar items exist (Data Sources, Menu Boards, Apps)
- `window.__setCurrentPage()` fallback for pages without sidebar entries (Moderation)
- Mock setup AFTER login (loginAndPrepare() first, then page.route() mocks) to avoid auth interference
- All MOD requirements (01-05) test ModerationPage only (not ReviewInboxPage -- different approval workflow)

### Screenshot coverage
- Data sources: 5 screenshots -- list page (DATA-01), create modal with Google Sheets tab (DATA-02), CSV upload tab (DATA-03), RSS URL tab (DATA-04), refresh interval dropdown (DATA-05)
- Apps/menu boards: ~8 screenshots -- gallery page (APP-01), detail modal (APP-02), config save (APP-03), menu board list (APP-04), editor modal with categories/items (APP-05), reordered state (APP-06), dietary tags (APP-07), theme/currency settings (APP-08)
- Moderation: 5 screenshots -- queue with pending items (MOD-01), approve action visible (MOD-02), reject modal with reason input (MOD-03), filter dropdown showing status options (MOD-04), hashtag config UI (MOD-05)
- Full page screenshots for list views, locator.screenshot() crops for modals
- Action UI states only (not before/after result states)

### Claude's Discretion
- Exact mock data field names and values
- Whether to use dispatchEvent for any modal overlays (depends on implementation)
- How to trigger create modal tabs (click tab vs select option)
- Specific CSS selectors for modal cropping

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches following established Phase 115-119 patterns.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `screenshotStep()`, `loginAndPrepare()`, `waitForPageReady()`, `dismissAnyModals()`, `assertAppReady()` from `tests/e2e/helpers/index.js`
- `page.route()` API mocking pattern used extensively in phases 117-119
- `dispatchEvent` pattern for bypassing `.fixed.inset-0` modal overlays
- `window.__setCurrentPage()` for SPA navigation to pages without sidebar entries

### Established Patterns
- Supabase REST API mocking: intercept `**/rest/v1/table_name*` with JSON response arrays
- RPC mocking: intercept `**/rest/v1/rpc/function_name*`
- Mock timing: always set up page.route() AFTER loginAndPrepare() completes
- Element-level screenshots: `locator.screenshot()` for modals and dropdowns

### Integration Points
- `DataSourcesPage.jsx` -- uses dataSourceService.js for CRUD, has create modal with type selection
- `AppsPage.jsx` -- uses appCatalog.js (client-side) + mediaService.js (fetchApps, createClockApp, etc.)
- `MenuBoardsPage.jsx` -- uses menuBoardService.js, opens MenuBoardEditorModal
- `ModerationPage.jsx` -- uses socialFeedSyncService.js (getModerationQueue, moderatePost)
- `ReviewInboxPage.jsx` -- NOT in scope for this phase (separate approval workflow)

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 120-data-sources-apps-moderation-e2e*
*Context gathered: 2026-03-07*
