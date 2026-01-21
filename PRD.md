# PRD: Content Management Performance Quick Wins

## Introduction

Address critical performance issues in the Content Management domain (scenes, templates, layouts, media) identified through code audit. These quick wins target N+1 queries, unbounded fetches, missing indexes, and client-side pagination that degrades user experience as data grows.

## Goals

- Eliminate N+1 query pattern in scene loading (currently 1+N queries → 1 query)
- Implement server-side pagination for all content lists
- Add missing database indexes on frequently queried foreign keys
- Reduce initial page load data transfer by 80%+ for users with large content libraries

## User Stories

### US-001: Create database function for scenes with device counts
**Description:** As a developer, I need to fetch scenes with their device counts in a single query so that the Scenes page loads efficiently regardless of how many scenes exist.

**Acceptance Criteria:**
- [x] Create `get_scenes_with_device_counts(p_tenant_id UUID)` function in new migration
- [x] Function returns: id, name, layout info, primary/secondary playlist info, device_count, created_at
- [x] Function uses JOIN/subquery instead of N+1 pattern
- [x] Function respects RLS (SECURITY DEFINER with tenant check)
- [x] Migration file created at `supabase/migrations/109_scenes_device_counts_function.sql`
- [x] Typecheck passes

---

### US-002: Update sceneService to use new database function
**Description:** As a developer, I want sceneService to call the optimized database function so that scene loading is O(1) queries instead of O(N).

**Acceptance Criteria:**
- [x] Replace `fetchScenesWithDeviceCounts()` in `src/services/sceneService.js` to use RPC call
- [x] ~~Remove `getDeviceCountByScene()` function~~ (kept - still used by SceneDetailPage)
- [x] Maintain existing return shape for backward compatibility
- [x] Add error handling with descriptive message
- [x] Typecheck passes

---

### US-003: Add missing indexes to layout_zones table
**Description:** As a developer, I need indexes on layout_zones foreign keys so that queries filtering by layout_id, assigned_playlist_id, or assigned_media_id are fast.

**Acceptance Criteria:**
- [x] ~~Create migration~~ (indexes already exist in migrations 014 and 061)
- [x] Index on `layout_zones.layout_id` - exists: `idx_layout_zones_layout_id` (migration 014)
- [x] Index on `layout_zones.assigned_playlist_id` - exists: `idx_layout_zones_playlist_id` (migration 061)
- [x] Index on `layout_zones.assigned_media_id` - exists: `idx_layout_zones_media_id` (migration 061)
- [x] Already uses `CREATE INDEX IF NOT EXISTS` for idempotency
- [x] No changes needed - typecheck passes

---

### US-004: Add server-side pagination to fetchScenesForTenant
**Description:** As a user, I want scenes to load quickly even with hundreds of scenes so that the page is responsive.

**Acceptance Criteria:**
- [x] Update `fetchScenesForTenant()` to accept `{ page, pageSize }` parameters
- [x] Add `.range()` clause to Supabase query for offset-based pagination
- [x] Return `{ data, totalCount, page, pageSize, totalPages }` object
- [x] Default pageSize = 50
- [x] Typecheck passes
- [x] Updated existing callers (App.jsx, ContentPerformancePage.jsx) for new return shape

---

### US-005: Update ScenesPage to use paginated fetch
**Description:** As a user, I want pagination controls on the Scenes page so that I can navigate through my scenes efficiently.

**Acceptance Criteria:**
- [x] Add pagination state (currentPage, totalPages) to ScenesPage.jsx
- [x] Call paginated `fetchScenesWithDeviceCounts()` with page parameter (uses optimized RPC)
- [x] Display pagination controls (Previous/Next with page counter)
- [x] Update URL with page query param for bookmarkable pages (useSearchParams)
- [x] Loading state shown during page transitions (disabled buttons when loading)
- [x] Typecheck passes
- [ ] Verify changes work in browser (requires manual testing)

---

### US-006: Add server-side pagination to fetchMediaAssets
**Description:** As a user, I want the Media Library to load quickly even with thousands of assets so that I can browse efficiently.

**Acceptance Criteria:**
- [x] Update `fetchMediaAssets()` in mediaService.js to accept `{ page, pageSize }` parameters
- [x] Use Supabase `.range()` for true server-side pagination
- [x] Return `{ data, totalCount, page, pageSize, totalPages }` object
- [x] Replaced `limit` parameter with `pageSize`
- [x] Default pageSize = 50
- [x] Typecheck passes
- [x] Updated InsertContentModal.jsx to use new return shape

---

### US-007: Update MediaLibraryPage to use server-side pagination
**Description:** As a user, I want the Media Library pagination to fetch only the current page from the server so that initial load is fast.

**Acceptance Criteria:**
- [x] Replace client-side pagination logic with server-side (using service's pagination)
- [x] Update `fetchMediaAssets` call to pass page/pageSize
- [x] Pagination controls trigger new fetch (useEffect on currentPage)
- [x] Maintain folder filtering with server-side pagination (folderId passed to service)
- [x] Search triggers server-side query with pagination reset to page 1
- [x] Typecheck passes
- [ ] Verify changes work in browser (requires manual testing)

---

### US-008: Add server-side pagination to fetchTemplates
**Description:** As a user, I want templates to load quickly even as the template library grows so that I can browse efficiently.

**Acceptance Criteria:**
- [x] Update `fetchTemplates()` in templateService.js to accept `{ page, pageSize, categorySlug }` parameters
- [x] Add `.range()` clause to Supabase query
- [x] Return `{ data, totalCount, page, pageSize, totalPages }` object
- [x] Default pageSize = 24 (good for grid display)
- [x] Typecheck passes
- [x] Updated internal callers: getTemplatesGroupedByCategory, getPackTemplates, getPlaylistTemplates, getLayoutTemplates
- [x] Updated TemplatesPage.jsx to use new return shape

---

### US-009: Update TemplatesPage to use server-side pagination
**Description:** As a user, I want pagination on the Templates page so that I can browse large template libraries efficiently.

**Acceptance Criteria:**
- [ ] Replace in-memory filtering with server-side fetch per page
- [ ] Category filter triggers new server fetch (not local filter)
- [ ] Add pagination controls below template grid
- [ ] Loading state shown during category/page changes
- [ ] Typecheck passes
- [ ] Verify changes work in browser

---

### US-010: Add server-side pagination to fetchLayouts
**Description:** As a user, I want layouts to load quickly so that the Layouts page is responsive.

**Acceptance Criteria:**
- [ ] Update `fetchLayouts()` in layoutService.js to accept `{ page, pageSize }` parameters
- [ ] Add `.range()` clause to Supabase query
- [ ] Return `{ data, totalCount, page, pageSize, totalPages }` object
- [ ] Default pageSize = 50
- [ ] Typecheck passes

---

### US-011: Update LayoutsPage to use server-side pagination
**Description:** As a user, I want pagination on the Layouts page so that I can navigate my layouts efficiently.

**Acceptance Criteria:**
- [ ] Add pagination state to LayoutsPage.jsx
- [ ] Call paginated `fetchLayouts()` with page parameter
- [ ] Display pagination controls
- [ ] Loading state shown during page transitions
- [ ] Typecheck passes
- [ ] Verify changes work in browser

---

## Non-Goals

- No infinite scroll implementation (use traditional pagination)
- No caching layer (optimize queries first)
- No component extraction/refactoring (separate PRD)
- No test coverage additions (separate PRD)
- No soft delete implementation (separate PRD)
- No audit logging additions (separate PRD)

## Technical Considerations

- All pagination uses offset-based approach via Supabase `.range(from, to)`
- Total count retrieved via Supabase `{ count: 'exact' }` option
- Existing RLS policies automatically apply to paginated queries
- URL query params should be used for page state (enables bookmarking/sharing)
- Reuse existing pagination component if available, otherwise create simple Previous/Next controls

## Dependencies

- US-002 depends on US-001 (needs DB function before service can use it)
- US-005 depends on US-004 (needs service pagination before page can use it)
- US-007 depends on US-006 (needs service pagination before page can use it)
- US-009 depends on US-008 (needs service pagination before page can use it)
- US-011 depends on US-010 (needs service pagination before page can use it)
- US-003 is independent (can run anytime)
