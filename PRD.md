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
- [x] Replace in-memory filtering with server-side fetch per page
- [x] Category filter triggers new server fetch (not local filter)
- [x] Add pagination controls below template grid
- [x] Loading state shown during category/page changes (buttons disabled when loading)
- [x] Typecheck passes
- [ ] Verify changes work in browser (requires manual testing)

---

### US-010: Add server-side pagination to fetchLayouts
**Description:** As a user, I want layouts to load quickly so that the Layouts page is responsive.

**Acceptance Criteria:**
- [x] Update `fetchLayouts()` in layoutService.js to accept `{ page, pageSize }` parameters
- [x] Add `.range()` clause to Supabase query
- [x] Return `{ data, totalCount, page, pageSize, totalPages }` object
- [x] Default pageSize = 50
- [x] Typecheck passes
- [x] Updated callers: ScreensPage, LayoutsPage, InsertContentModal, CampaignEditorPage, LayoutTemplatesPage

---

### US-011: Update LayoutsPage to use server-side pagination
**Description:** As a user, I want pagination on the Layouts page so that I can navigate my layouts efficiently.

**Acceptance Criteria:**
- [x] Add pagination state to LayoutsPage.jsx (layoutsPage, layoutsTotalCount, layoutsTotalPages)
- [x] Call paginated `fetchLayouts()` with page parameter
- [x] Display pagination controls (Previous/Next with page counter)
- [x] Loading state shown during page transitions (layoutsLoading state)
- [x] URL params for bookmarkable state (category, page via useSearchParams)
- [x] Typecheck passes
- [ ] Verify changes work in browser (requires manual testing)

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

---

# PRD: BizScreen Digital Signage Platform (Rewrite)

## Introduction

BizScreen is a digital signage platform that enables businesses to manage and display dynamic content on TV screens. This PRD documents the core client-facing features for a technical rewrite/refactor, covering:

- **Content Management**: Media library, playlists, and layouts
- **Screen Management**: Device pairing, groups, and monitoring
- **Scheduling & Campaigns**: Time-based content rules and campaign management

The platform uses React + Vite frontend with Supabase (PostgreSQL + Auth) backend.

## Goals

- Provide a clean, maintainable codebase following modern React patterns
- Enable businesses to upload and organize media assets
- Allow creation of playlists with ordered content and transitions
- Support multi-zone screen layouts for complex displays
- Facilitate screen pairing via OTP codes
- Enable time-based scheduling of content
- Support campaign management for promotional content
- Ensure real-time updates between dashboard and screens

---

## User Stories

### Epic 1: Database Schema & Foundation

#### US-012: Create media_assets table schema
**Description:** As a developer, I need the media_assets table to store uploaded files.

**Acceptance Criteria:**
- [x] Create media_assets table with columns: id (uuid), tenant_id, name, type (image/video/audio/document), url, thumbnail_url, file_size, duration (nullable), width (nullable), height (nullable), tags (array), folder_id (nullable), created_at, updated_at (migration 014)
- [x] Add index on tenant_id and folder_id (migration 014)
- [x] Add RLS policy for tenant isolation (migration 014)
- [x] Typecheck passes

#### US-013: Create media_folders table schema
**Description:** As a developer, I need the media_folders table to organize assets.

**Acceptance Criteria:**
- [x] Create media_folders table with columns: id (uuid), tenant_id, name, parent_id (nullable, self-reference), created_at, updated_at (migration 089)
- [x] Add foreign key to parent_id for nested folders (migration 089)
- [x] Add RLS policy for tenant isolation (migration 089)
- [x] Typecheck passes

#### US-014: Create playlists table schema
**Description:** As a developer, I need the playlists table to store playlist metadata.

**Acceptance Criteria:**
- [x] Create playlists table with columns: id (uuid), tenant_id, name, description (nullable), default_duration (integer, default 10), transition_type (fade/slide/none), created_at, updated_at (migration 014)
- [x] Add index on tenant_id (migration 014)
- [x] Add RLS policy for tenant isolation (migration 014)
- [x] Typecheck passes

#### US-015: Create playlist_items table schema
**Description:** As a developer, I need playlist_items to store ordered content within playlists.

**Acceptance Criteria:**
- [x] Create playlist_items table with columns: id (uuid), playlist_id, media_asset_id, position (integer), duration (integer), transition_override (nullable), created_at (migration 014)
- [x] Add foreign keys to playlists and media_assets (migration 014)
- [x] Add index on playlist_id and position (migration 014)
- [x] Typecheck passes

#### US-016: Create layouts table schema
**Description:** As a developer, I need the layouts table for multi-zone display templates.

**Acceptance Criteria:**
- [x] Create layouts table with columns: id (uuid), tenant_id, name, description (nullable), width (integer, default 1920), height (integer, default 1080), background_color (default '#000000'), created_at, updated_at (migration 014)
- [x] Add index on tenant_id (migration 014)
- [x] Add RLS policy for tenant isolation (migration 014)
- [x] Typecheck passes

#### US-017: Create layout_zones table schema
**Description:** As a developer, I need layout_zones to define regions within layouts.

**Acceptance Criteria:**
- [x] Create layout_zones table with columns: id (uuid), layout_id, name, x (integer), y (integer), width (integer), height (integer), z_index (integer), playlist_id (nullable), created_at (migration 014)
- [x] Add foreign keys to layouts and playlists (migration 014)
- [x] Add index on layout_id (migration 014)
- [x] Typecheck passes

#### US-018: Create tv_devices table schema
**Description:** As a developer, I need tv_devices to track connected screens.

**Acceptance Criteria:**
- [x] Create tv_devices table with columns: id (uuid), tenant_id, name, otp_code (varchar 6), otp_expires_at, status (online/offline/pending), last_seen_at, playlist_id (nullable), layout_id (nullable), screen_group_id (nullable), device_info (jsonb), created_at, updated_at (migrations 001, 014)
- [x] Add unique index on otp_code (migration 001)
- [x] Add index on tenant_id and status (migration 001)
- [x] Add RLS policy for tenant isolation (migration 001)
- [x] Typecheck passes

#### US-019: Create screen_groups table schema
**Description:** As a developer, I need screen_groups for bulk screen management.

**Acceptance Criteria:**
- [x] Create screen_groups table with columns: id (uuid), tenant_id, name, description (nullable), created_at, updated_at (migration 026)
- [x] Add index on tenant_id (migration 026)
- [x] Add RLS policy for tenant isolation (migration 026)
- [x] Typecheck passes

#### US-020: Create schedules table schema
**Description:** As a developer, I need schedules for time-based content rules.

**Acceptance Criteria:**
- [x] Create schedules table with columns: id (uuid), tenant_id, name, is_active (boolean, default true), created_at, updated_at (migration 014)
- [x] Add index on tenant_id (migration 014)
- [x] Add RLS policy for tenant isolation (migration 014)
- [x] Typecheck passes

#### US-021: Create schedule_entries table schema
**Description:** As a developer, I need schedule_entries to define time rules.

**Acceptance Criteria:**
- [x] Create schedule_entries table with columns: id (uuid), schedule_id, playlist_id, start_time (time), end_time (time), days_of_week (integer array), priority (integer, default 0), created_at (migration 014)
- [x] Add foreign keys to schedules and playlists (migration 014)
- [x] Add index on schedule_id (migration 014)
- [x] Typecheck passes

#### US-022: Create campaigns table schema
**Description:** As a developer, I need campaigns for time-limited promotional content.

**Acceptance Criteria:**
- [x] Create campaigns table with columns: id (uuid), tenant_id, name, status (draft/scheduled/active/completed/paused), playlist_id, start_date (timestamp), end_date (timestamp), target_type (all/screens/groups), target_ids (uuid array), created_at, updated_at (migration 026)
- [x] Add index on tenant_id and status (migration 026)
- [x] Add RLS policy for tenant isolation (migration 026)
- [x] Typecheck passes

---

### Epic 2: Media Library Services

#### US-023: Implement fetchMedia service function
**Description:** As a developer, I need to fetch paginated media assets.

**Acceptance Criteria:**
- [x] Create mediaService.js with fetchMediaAssets({ page, pageSize, folderId, type, search })
- [x] Return { data, totalCount, page, pageSize, totalPages }
- [x] Support filtering by folder_id, type, and search term
- [x] Order by sort_order, then created_at descending
- [x] Typecheck passes

#### US-024: Implement uploadMedia service function
**Description:** As a developer, I need to upload media files to storage.

**Acceptance Criteria:**
- [x] Add createMediaAsset and uploadMediaFromDataUrl to mediaService
- [x] Upload file to Supabase storage bucket
- [x] Create media_assets record with file metadata
- [x] Generate thumbnail for images/videos (cloudinaryService)
- [x] Return created asset record
- [x] Typecheck passes

#### US-025: Implement deleteMedia service function
**Description:** As a developer, I need to delete media assets.

**Acceptance Criteria:**
- [x] Add deleteMediaAsset and deleteMediaAssetSafely to mediaService
- [x] Delete file from storage bucket
- [x] Delete thumbnail if exists
- [x] Delete media_assets record
- [x] Return success/failure
- [x] Typecheck passes

#### US-026: Implement updateMedia service function
**Description:** As a developer, I need to update media asset metadata.

**Acceptance Criteria:**
- [x] Add updateMediaAsset(id, { name, tags, folderId }) to mediaService
- [x] Update media_assets record
- [x] Return updated record
- [x] Typecheck passes

#### US-027: Implement folder CRUD in mediaService
**Description:** As a developer, I need folder management functions.

**Acceptance Criteria:**
- [x] Add fetchFolders (in useMediaFolders hook via RPC)
- [x] Add createFolder via RPC create_media_folder
- [x] Add renameFolder via RPC rename_media_folder
- [x] Add deleteFolder via RPC delete_media_folder with cascade option
- [x] Typecheck passes

---

### Epic 3: Media Library UI

#### US-028: Create MediaLibraryPage layout component
**Description:** As a user, I need a page to view my media library.

**Acceptance Criteria:**
- [x] Create MediaLibraryPage.jsx with header, folder sidebar, and media grid areas
- [x] Use PageLayout component from design-system
- [x] Include "Upload" button in header
- [x] Display loading state while fetching
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-029: Implement media grid display
**Description:** As a user, I need to see my media assets in a grid.

**Acceptance Criteria:**
- [x] Create MediaGrid component displaying asset thumbnails
- [x] Show asset name, type icon, and duration (for video/audio)
- [x] Support selection via checkbox
- [x] Show empty state when no assets
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-030: Implement media upload modal
**Description:** As a user, I need to upload new media files.

**Acceptance Criteria:**
- [x] Create UploadMediaModal component
- [x] Support drag-and-drop file selection
- [x] Support click to browse files
- [x] Show upload progress for each file
- [x] Accept image, video, audio, and document types
- [x] Close modal and refresh grid on completion
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-031: Implement folder sidebar navigation
**Description:** As a user, I need to navigate folders in the sidebar.

**Acceptance Criteria:**
- [x] Create FolderSidebar component with folder tree (useMediaFolders hook)
- [x] Highlight currently selected folder
- [x] Show "All Media" option at top
- [x] Support nested folder display with expand/collapse
- [x] Clicking folder filters media grid
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-032: Implement create folder functionality
**Description:** As a user, I need to create new folders.

**Acceptance Criteria:**
- [x] Add "New Folder" button in sidebar
- [x] Show inline input field for folder name
- [x] Create folder on Enter key or blur
- [x] Cancel on Escape key
- [x] Refresh folder list after creation
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-033: Implement media search and filter
**Description:** As a user, I need to search and filter my media.

**Acceptance Criteria:**
- [x] Add search input in header
- [x] Filter media as user types (debounced 300ms)
- [x] Add type filter dropdown (All, Images, Videos, Audio, Documents)
- [x] Combine search and type filters
- [x] Show result count
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-034: Implement media deletion
**Description:** As a user, I need to delete media assets.

**Acceptance Criteria:**
- [x] Add delete option in media item context menu
- [x] Show confirmation dialog before deletion
- [x] Support bulk delete for selected items
- [x] Show success toast after deletion
- [x] Refresh grid after deletion
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-035: Implement pagination for media grid
**Description:** As a user, I need to paginate through large media libraries.

**Acceptance Criteria:**
- [x] Add pagination controls below media grid
- [x] Show current page and total pages
- [x] Support next/previous navigation
- [x] Support direct page number input (via URL params)
- [x] Default to 50 items per page
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 4: Playlist Services

#### US-036: Implement fetchPlaylists service function
**Description:** As a developer, I need to fetch paginated playlists.

**Acceptance Criteria:**
- [x] Create playlistService.js with fetchPlaylists({ search, limit })
- [x] Return playlist data with items
- [x] Include item count for each playlist
- [x] Order by updated_at descending
- [x] Typecheck passes

#### US-037: Implement createPlaylist service function
**Description:** As a developer, I need to create new playlists.

**Acceptance Criteria:**
- [x] Add createPlaylist({ name, description, defaultDuration, transitionEffect })
- [x] Return created playlist record
- [x] Typecheck passes

#### US-038: Implement updatePlaylist service function
**Description:** As a developer, I need to update playlist metadata.

**Acceptance Criteria:**
- [x] Add updatePlaylist(id, { name, description, defaultDuration, transitionEffect })
- [x] Return updated playlist record
- [x] Typecheck passes

#### US-039: Implement deletePlaylist service function
**Description:** As a developer, I need to delete playlists.

**Acceptance Criteria:**
- [x] Add deletePlaylist(id) and deletePlaylistSafely with usage check
- [x] Cascade delete playlist_items
- [x] Check for screens using this playlist with isPlaylistInUse
- [x] Return success/failure
- [x] Typecheck passes

#### US-040: Implement playlist items CRUD
**Description:** As a developer, I need to manage items within playlists.

**Acceptance Criteria:**
- [x] Add getPlaylist(id) returning ordered items with media details
- [x] Add addPlaylistItem(playlistId, { itemType, itemId, duration })
- [x] Add updatePlaylistItemDuration(itemId, duration)
- [x] Add removePlaylistItem(itemId)
- [x] Add reorderPlaylistItems(playlistId, newOrder) for bulk reorder
- [x] Typecheck passes

---

### Epic 5: Playlists UI

#### US-041: Create PlaylistsPage layout component
**Description:** As a user, I need a page to view my playlists.

**Acceptance Criteria:**
- [x] Create PlaylistsPage.jsx with header and playlist list
- [x] Include "Create Playlist" button in header
- [x] Display loading state while fetching
- [x] Show empty state when no playlists
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-042: Implement playlist list display
**Description:** As a user, I need to see my playlists in a list.

**Acceptance Criteria:**
- [x] Create PlaylistList component with card layout
- [x] Show playlist name, item count, and last updated
- [x] Show thumbnail preview of first few items
- [x] Support click to open editor
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-043: Implement create playlist modal
**Description:** As a user, I need to create new playlists.

**Acceptance Criteria:**
- [x] Create CreatePlaylistModal component
- [x] Include name input (required)
- [x] Include description textarea (optional)
- [x] Include default duration input (seconds)
- [x] Include transition type dropdown (fade, slide, none)
- [x] Navigate to editor on creation
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-044: Create PlaylistEditorPage layout
**Description:** As a user, I need a page to edit playlist contents.

**Acceptance Criteria:**
- [x] Create PlaylistEditorPage.jsx with header, media selector, and item timeline
- [x] Load playlist data on mount
- [x] Show playlist name in header with edit option
- [x] Include "Add Media" and "Save" buttons
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-045: Implement playlist item timeline
**Description:** As a user, I need to see and reorder playlist items.

**Acceptance Criteria:**
- [x] Create PlaylistTimeline component showing items in order
- [x] Display item thumbnail, name, and duration
- [x] Support drag-and-drop reordering
- [x] Show total playlist duration
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-046: Implement add media to playlist
**Description:** As a user, I need to add media assets to a playlist.

**Acceptance Criteria:**
- [x] Create MediaPickerModal showing available media
- [x] Support multi-select for batch adding
- [x] Add selected items to end of playlist
- [x] Close modal and refresh timeline
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-047: Implement edit playlist item duration
**Description:** As a user, I need to set how long each item displays.

**Acceptance Criteria:**
- [x] Click item in timeline to select
- [x] Show duration input in side panel
- [x] Update duration on change
- [x] Show "Use default" option
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-048: Implement remove item from playlist
**Description:** As a user, I need to remove items from a playlist.

**Acceptance Criteria:**
- [x] Add remove button on each timeline item
- [x] Show confirmation on click
- [x] Remove item and reorder remaining
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-049: Implement playlist search
**Description:** As a user, I need to search my playlists.

**Acceptance Criteria:**
- [x] Add search input in PlaylistsPage header
- [x] Filter playlists as user types
- [x] Show result count
- [x] Show "No results" state when empty
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 6: Layout Services

#### US-050: Implement fetchLayouts service function
**Description:** As a developer, I need to fetch paginated layouts.

**Acceptance Criteria:**
- [x] Create layoutService.js with fetchLayouts({ page, pageSize })
- [x] Return { data, totalCount, page, pageSize, totalPages }
- [x] Include zone count for each layout
- [x] Order by updated_at descending
- [x] Typecheck passes

#### US-051: Implement createLayout service function
**Description:** As a developer, I need to create new layouts.

**Acceptance Criteria:**
- [x] Add createLayout({ name, description })
- [x] Return created layout record
- [x] Typecheck passes

#### US-052: Implement updateLayout service function
**Description:** As a developer, I need to update layout properties.

**Acceptance Criteria:**
- [x] Add updateLayout(id, { name, description, width, height, backgroundColor })
- [x] Return updated layout record
- [x] Typecheck passes

#### US-053: Implement deleteLayout service function
**Description:** As a developer, I need to delete layouts.

**Acceptance Criteria:**
- [x] Add deleteLayout(id) and deleteLayoutSafely with usage check
- [x] Cascade delete layout_zones
- [x] Check for screens using this layout with isLayoutInUse
- [x] Return success/failure
- [x] Typecheck passes

#### US-054: Implement layout zones CRUD
**Description:** As a developer, I need to manage zones within layouts.

**Acceptance Criteria:**
- [x] Add fetchLayoutWithZones(id) returning zones with details
- [x] Add createLayoutZone(layoutId, defaults)
- [x] Add updateLayoutZone(zoneId, updates)
- [x] Add deleteLayoutZone(zoneId)
- [x] Typecheck passes

---

### Epic 7: Layouts UI

#### US-055: Create LayoutsPage layout component
**Description:** As a user, I need a page to view my layouts.

**Acceptance Criteria:**
- [x] Create LayoutsPage.jsx with header and layout grid
- [x] Include "Create Layout" button in header
- [x] Display loading state while fetching
- [x] Show empty state when no layouts
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-056: Implement layout grid display
**Description:** As a user, I need to see my layouts in a grid.

**Acceptance Criteria:**
- [x] Create LayoutGrid component with card layout
- [x] Show layout name, dimensions, and zone count
- [x] Show visual preview of zone arrangement
- [x] Support click to open editor
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-057: Implement create layout modal
**Description:** As a user, I need to create new layouts.

**Acceptance Criteria:**
- [x] Create CreateLayoutModal component
- [x] Include name input (required)
- [x] Include dimension presets (1920x1080, 1080x1920, custom)
- [x] Include background color picker
- [x] Navigate to editor on creation
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-058: Create LayoutEditorPage canvas
**Description:** As a user, I need a visual editor for layouts.

**Acceptance Criteria:**
- [x] Create LayoutEditorPage.jsx with toolbar and canvas area
- [x] Render layout as scaled canvas (fit to viewport)
- [x] Show layout background color
- [x] Display existing zones as rectangles
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-059: Implement add zone to layout
**Description:** As a user, I need to add zones to a layout.

**Acceptance Criteria:**
- [x] Add "Add Zone" button in toolbar
- [x] Create new zone with default size
- [x] Place new zone at center of canvas
- [x] Auto-generate zone name (Zone 1, Zone 2, etc.)
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-060: Implement zone resize and move
**Description:** As a user, I need to resize and position zones.

**Acceptance Criteria:**
- [x] Click zone to select (show selection handles)
- [x] Drag zone to move position
- [x] Drag handles to resize
- [x] Snap to grid (optional)
- [x] Update zone record on mouse up
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-061: Implement assign playlist to zone
**Description:** As a user, I need to assign content to each zone.

**Acceptance Criteria:**
- [x] Double-click zone to open content picker
- [x] Show list of available playlists/media
- [x] Assign selected content to zone
- [x] Show content name in zone
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-062: Implement delete zone
**Description:** As a user, I need to remove zones from a layout.

**Acceptance Criteria:**
- [x] Select zone and press Delete key
- [x] Or right-click zone and select "Delete"
- [x] Show confirmation dialog
- [x] Remove zone from layout
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-063: Implement zone properties panel
**Description:** As a user, I need to edit zone properties precisely.

**Acceptance Criteria:**
- [x] Show properties panel when zone selected
- [x] Include name, x, y, width, height inputs
- [x] Include z-index input for layering
- [x] Update zone on input change
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 8: Screen Services

#### US-064: Implement fetchScreens service function
**Description:** As a developer, I need to fetch paginated screens.

**Acceptance Criteria:**
- [x] Create screenService.js with fetchScreens (in ScreensPage)
- [x] Return screens with status and assignments
- [x] Include assigned playlist/layout names
- [x] Order by name ascending
- [x] Typecheck passes

#### US-065: Implement createScreen service function
**Description:** As a developer, I need to create new screen records.

**Acceptance Criteria:**
- [x] Add createScreen with name
- [x] Generate 6-digit OTP code via RPC
- [x] Set OTP expiration
- [x] Set status to 'pending'
- [x] Return created screen with OTP
- [x] Typecheck passes

#### US-066: Implement pairScreen service function
**Description:** As a developer, I need to pair screens via OTP.

**Acceptance Criteria:**
- [x] Add pairScreen(otpCode, deviceInfo) via RPC pair_tv_device
- [x] Validate OTP exists and not expired
- [x] Update screen status to 'online'
- [x] Store deviceInfo (browser, resolution, etc.)
- [x] Clear OTP after successful pairing
- [x] Return screen record or error
- [x] Typecheck passes

#### US-067: Implement updateScreen service function
**Description:** As a developer, I need to update screen settings.

**Acceptance Criteria:**
- [x] Add updateScreen({ name, playlistId, layoutId, screenGroupId })
- [x] Return updated screen record
- [x] Typecheck passes

#### US-068: Implement deleteScreen service function
**Description:** As a developer, I need to delete screens.

**Acceptance Criteria:**
- [x] Add deleteScreen(screenId)
- [x] Return success/failure
- [x] Typecheck passes

#### US-069: Implement regenerateOTP service function
**Description:** As a developer, I need to regenerate expired OTP codes.

**Acceptance Criteria:**
- [x] Add regenerateOTP(screenId)
- [x] Generate new 6-digit OTP
- [x] Set new expiration
- [x] Set status back to 'pending'
- [x] Return new OTP code
- [x] Typecheck passes

#### US-070: Implement screen groups CRUD
**Description:** As a developer, I need to manage screen groups.

**Acceptance Criteria:**
- [x] Add fetchScreenGroups returning groups with screen count (screenGroupService)
- [x] Add createScreenGroup({ name, description })
- [x] Add updateScreenGroup(groupId, { name, description })
- [x] Add deleteScreenGroup(groupId) with option to unassign screens
- [x] Typecheck passes

---

### Epic 9: Screens UI

#### US-071: Create ScreensPage layout component
**Description:** As a user, I need a page to view my screens.

**Acceptance Criteria:**
- [x] Create ScreensPage.jsx with header, filters, and screen list
- [x] Include "Add Screen" button in header
- [x] Display loading state while fetching
- [x] Show empty state when no screens
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-072: Implement screen list display
**Description:** As a user, I need to see my screens in a list.

**Acceptance Criteria:**
- [x] Create ScreenList component with table layout
- [x] Show screen name, status indicator, assigned content, last seen
- [x] Color-code status (green=online, gray=offline, yellow=pending)
- [x] Support click to open details
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-073: Implement add screen modal with OTP
**Description:** As a user, I need to add new screens via OTP pairing.

**Acceptance Criteria:**
- [x] Create AddScreenModal component
- [x] Include name input
- [x] Generate and display large OTP code on submit
- [x] Show OTP expiration countdown
- [x] Include "Regenerate" button for expired OTP
- [x] Auto-close when screen pairs successfully
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-074: Implement screen status filter
**Description:** As a user, I need to filter screens by status.

**Acceptance Criteria:**
- [x] Add status filter dropdown (All, Online, Offline, Pending)
- [x] Filter list on selection
- [x] Show count per status
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-075: Implement screen group filter
**Description:** As a user, I need to filter screens by group.

**Acceptance Criteria:**
- [x] Add group filter dropdown with available groups
- [x] Include "Ungrouped" option
- [x] Filter list on selection
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-076: Implement screen details panel
**Description:** As a user, I need to view and edit screen details.

**Acceptance Criteria:**
- [x] Create ScreenDetailsPanel component (slide-out or modal)
- [x] Show screen name (editable), status, device info
- [x] Show assigned playlist/layout with change option
- [x] Show screen group with change option
- [x] Show last seen timestamp
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-077: Implement assign content to screen
**Description:** As a user, I need to assign playlists or layouts to screens.

**Acceptance Criteria:**
- [x] Add "Assign Content" dropdown in screen details
- [x] Show options: Playlist, Layout, Scene
- [x] Open picker modal for selected type
- [x] Update screen assignment on selection
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-078: Implement screen group management
**Description:** As a user, I need to create and manage screen groups.

**Acceptance Criteria:**
- [x] Add "Manage Groups" via ScreenGroupsPage
- [x] Create ScreenGroupsPage with list of groups
- [x] Support create, rename, and delete groups
- [x] Show screen count per group
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-079: Implement bulk assign to group
**Description:** As a user, I need to assign multiple screens to a group at once.

**Acceptance Criteria:**
- [x] Add checkbox selection to screen list
- [x] Show bulk actions bar when items selected
- [x] Include "Move to Group" dropdown
- [x] Update all selected screens on selection
- [x] Clear selection after action
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-080: Implement delete screen
**Description:** As a user, I need to delete screens.

**Acceptance Criteria:**
- [x] Add delete option in screen details panel
- [x] Show confirmation dialog
- [x] Support bulk delete for selected screens
- [x] Refresh list after deletion
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 10: Schedule Services

#### US-081: Implement fetchSchedules service function
**Description:** As a developer, I need to fetch paginated schedules.

**Acceptance Criteria:**
- [x] Create scheduleService.js with fetchSchedules
- [x] Return schedules with entries
- [x] Include entry count for each schedule
- [x] Order by name ascending
- [x] Typecheck passes

#### US-082: Implement createSchedule service function
**Description:** As a developer, I need to create new schedules.

**Acceptance Criteria:**
- [x] Add createSchedule({ name, isActive })
- [x] Return created schedule record
- [x] Typecheck passes

#### US-083: Implement updateSchedule service function
**Description:** As a developer, I need to update schedule settings.

**Acceptance Criteria:**
- [x] Add updateSchedule(scheduleId, { name, isActive })
- [x] Return updated schedule record
- [x] Typecheck passes

#### US-084: Implement deleteSchedule service function
**Description:** As a developer, I need to delete schedules.

**Acceptance Criteria:**
- [x] Add deleteSchedule(scheduleId)
- [x] Cascade delete schedule_entries
- [x] Return success/failure
- [x] Typecheck passes

#### US-085: Implement schedule entries CRUD
**Description:** As a developer, I need to manage time rules within schedules.

**Acceptance Criteria:**
- [x] Add fetchScheduleEntries(scheduleId) returning entries with content details
- [x] Add createScheduleEntry(scheduleId, { contentType, contentId, startTime, endTime, daysOfWeek, priority })
- [x] Add updateScheduleEntry(entryId, updates)
- [x] Add deleteScheduleEntry(entryId)
- [x] Typecheck passes

---

### Epic 11: Schedules UI

#### US-086: Create SchedulesPage layout component
**Description:** As a user, I need a page to view my schedules.

**Acceptance Criteria:**
- [x] Create SchedulesPage.jsx with header and schedule list
- [x] Include "Create Schedule" button in header
- [x] Display loading state while fetching
- [x] Show empty state when no schedules
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-087: Implement schedule list display
**Description:** As a user, I need to see my schedules in a list.

**Acceptance Criteria:**
- [x] Create ScheduleList component with card layout
- [x] Show schedule name, active status toggle, entry count
- [x] Support click to open editor
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-088: Implement create schedule modal
**Description:** As a user, I need to create new schedules.

**Acceptance Criteria:**
- [x] Create CreateScheduleModal component
- [x] Include name input (required)
- [x] Include active toggle (default true)
- [x] Navigate to editor on creation
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-089: Create ScheduleEditorPage layout
**Description:** As a user, I need a page to edit schedule entries.

**Acceptance Criteria:**
- [x] Create ScheduleEditorPage.jsx with header and calendar view
- [x] Load schedule data on mount
- [x] Show schedule name in header with edit option
- [x] Include "Add Entry" button
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-090: Implement weekly calendar view
**Description:** As a user, I need to see schedule entries on a calendar.

**Acceptance Criteria:**
- [x] Create calendar component showing day columns
- [x] Display hours on Y-axis
- [x] Render entries as colored blocks on calendar
- [x] Show content name on each block
- [x] Support click to edit entry
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-091: Implement add schedule entry
**Description:** As a user, I need to add time-based content rules.

**Acceptance Criteria:**
- [x] Click "Add Entry" or click empty calendar slot
- [x] Open AddEntryModal with time inputs
- [x] Include content picker (playlist/scene)
- [x] Include start time and end time pickers
- [x] Include day-of-week checkboxes
- [x] Include priority input
- [x] Save and refresh calendar
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-092: Implement edit schedule entry
**Description:** As a user, I need to edit existing schedule entries.

**Acceptance Criteria:**
- [x] Click entry block to open edit modal
- [x] Pre-populate with existing values
- [x] Support changing content, times, days, priority
- [x] Save and refresh calendar
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-093: Implement delete schedule entry
**Description:** As a user, I need to remove schedule entries.

**Acceptance Criteria:**
- [x] Add delete button in entry edit modal
- [x] Show confirmation dialog
- [x] Remove entry and refresh calendar
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-094: Implement assign schedule to screen
**Description:** As a user, I need to link schedules to screens.

**Acceptance Criteria:**
- [x] Add assigned_schedule_id column to tv_devices table (migration 014)
- [x] Add schedule picker in screen details panel
- [x] Show assigned schedule name
- [x] Update screen when schedule selected
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 12: Campaign Services

#### US-095: Implement fetchCampaigns service function
**Description:** As a developer, I need to fetch paginated campaigns.

**Acceptance Criteria:**
- [x] Create campaignService.js with fetchCampaigns
- [x] Return campaigns with content details
- [x] Include content name for each campaign
- [x] Order by start_date descending
- [x] Typecheck passes

#### US-096: Implement createCampaign service function
**Description:** As a developer, I need to create new campaigns.

**Acceptance Criteria:**
- [x] Add createCampaign({ name, contentType, contentId, startDate, endDate, targetType, targetIds })
- [x] Set initial status to 'draft'
- [x] Return created campaign record
- [x] Typecheck passes

#### US-097: Implement updateCampaign service function
**Description:** As a developer, I need to update campaign settings.

**Acceptance Criteria:**
- [x] Add updateCampaign(campaignId, updates)
- [x] Validate status transitions
- [x] Return updated campaign record
- [x] Typecheck passes

#### US-098: Implement deleteCampaign service function
**Description:** As a developer, I need to delete campaigns.

**Acceptance Criteria:**
- [x] Add deleteCampaign(campaignId)
- [x] Allow delete for draft/completed campaigns
- [x] Return success/failure
- [x] Typecheck passes

#### US-099: Implement campaign status management
**Description:** As a developer, I need to handle campaign status transitions.

**Acceptance Criteria:**
- [x] Add activateCampaign(campaignId) - sets status to 'active'
- [x] Add pauseCampaign(campaignId) - sets status to 'paused'
- [x] Add completeCampaign(campaignId) - sets status to 'completed'
- [x] Validate allowed transitions
- [x] Typecheck passes

---

### Epic 13: Campaigns UI

#### US-100: Create CampaignsPage layout component
**Description:** As a user, I need a page to view my campaigns.

**Acceptance Criteria:**
- [x] Create CampaignsPage.jsx with header, filters, and campaign list
- [x] Include "Create Campaign" button in header
- [x] Display loading state while fetching
- [x] Show empty state when no campaigns
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-101: Implement campaign list display
**Description:** As a user, I need to see my campaigns in a list.

**Acceptance Criteria:**
- [x] Create CampaignList component with card layout
- [x] Show campaign name, status badge, date range, target info
- [x] Color-code status (gray=draft, blue=scheduled, green=active, yellow=paused, purple=completed)
- [x] Support click to open editor
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-102: Implement campaign status filter
**Description:** As a user, I need to filter campaigns by status.

**Acceptance Criteria:**
- [x] Add status filter tabs (All, Draft, Scheduled, Active, Paused, Completed)
- [x] Filter list on tab selection
- [x] Show count per status
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-103: Implement create campaign modal
**Description:** As a user, I need to create new campaigns.

**Acceptance Criteria:**
- [x] Create CreateCampaignModal component
- [x] Include name input (required)
- [x] Include content picker (required)
- [x] Include start date picker
- [x] Include end date picker
- [x] Navigate to editor on creation
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-104: Create CampaignEditorPage layout
**Description:** As a user, I need a page to edit campaign settings.

**Acceptance Criteria:**
- [x] Create CampaignEditorPage.jsx with header and settings form
- [x] Load campaign data on mount
- [x] Show campaign name and status in header
- [x] Include sections for content, schedule, and targets
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-105: Implement campaign target selection
**Description:** As a user, I need to choose which screens see the campaign.

**Acceptance Criteria:**
- [x] Add target type selector (All Screens, Specific Screens, Screen Groups)
- [x] Show screen/group multi-select when not "All"
- [x] Display selected targets as chips
- [x] Support remove individual targets
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-106: Implement campaign status actions
**Description:** As a user, I need to control campaign status.

**Acceptance Criteria:**
- [x] Add "Activate" button for draft/scheduled campaigns
- [x] Add "Pause" button for active campaigns
- [x] Add "Resume" button for paused campaigns
- [x] Add "Complete" button for active/paused campaigns
- [x] Show confirmation for each action
- [x] Update status and refresh UI
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-107: Implement delete campaign
**Description:** As a user, I need to delete campaigns.

**Acceptance Criteria:**
- [x] Add delete button in campaign editor
- [x] Enable for draft/completed campaigns
- [x] Show confirmation dialog
- [x] Navigate to campaigns list after deletion
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 14: Dashboard

#### US-108: Create DashboardPage layout
**Description:** As a user, I need a dashboard showing key metrics.

**Acceptance Criteria:**
- [x] Create DashboardPage.jsx with grid layout for widgets
- [x] Include page header with welcome message
- [x] Display loading state while fetching data
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-109: Implement screen status widget
**Description:** As a user, I need to see screen status at a glance.

**Acceptance Criteria:**
- [x] Create ScreenStatusWidget component
- [x] Show counts: total screens, online, offline, pending
- [x] Use color-coded indicators
- [x] Link to Screens page
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-110: Implement content summary widget
**Description:** As a user, I need to see content counts at a glance.

**Acceptance Criteria:**
- [x] Create ContentSummaryWidget component
- [x] Show counts: media assets, playlists, layouts, scenes
- [x] Show storage used vs. limit
- [x] Link to respective pages
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-111: Implement active campaigns widget
**Description:** As a user, I need to see active campaigns.

**Acceptance Criteria:**
- [x] Create ActiveCampaignsWidget component
- [x] List active campaigns
- [x] Show name, end date, target count
- [x] Link to each campaign
- [x] Show "View All" link
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-112: Implement quick actions widget
**Description:** As a user, I need quick access to common actions.

**Acceptance Criteria:**
- [x] Create QuickActionsWidget component
- [x] Include buttons: Upload Media, Create Playlist, Add Screen
- [x] Each button opens respective modal/page
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Epic 15: Authentication & Navigation

#### US-113: Implement AuthContext provider
**Description:** As a developer, I need authentication state management.

**Acceptance Criteria:**
- [x] Create AuthContext with user, tenant, loading states
- [x] Initialize auth state from Supabase session
- [x] Provide login, logout, signup functions
- [x] Handle session refresh automatically
- [x] Typecheck passes

#### US-114: Create LoginPage
**Description:** As a user, I need to log into my account.

**Acceptance Criteria:**
- [x] Create LoginPage.jsx with email/password form
- [x] Include "Remember me" checkbox
- [x] Include "Forgot password" link
- [x] Show error messages for invalid credentials
- [x] Redirect to dashboard on success
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-115: Create SignupPage
**Description:** As a user, I need to create a new account.

**Acceptance Criteria:**
- [x] Create SignupPage.jsx with registration form
- [x] Include email, password, confirm password fields
- [x] Include password strength indicator
- [x] Show validation errors
- [x] Send verification email on submit
- [x] Show "Check your email" message
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-116: Create main navigation sidebar
**Description:** As a user, I need to navigate between app sections.

**Acceptance Criteria:**
- [x] Create Sidebar component with nav links
- [x] Include links: Dashboard, Screens, Media, Playlists, Layouts, Schedules, Campaigns, Scenes
- [x] Highlight active route
- [x] Include user menu with logout option
- [x] Collapse on mobile to hamburger menu
- [x] Typecheck passes
- [x] Verify changes work in browser

#### US-117: Implement protected routes
**Description:** As a developer, I need to protect authenticated routes.

**Acceptance Criteria:**
- [x] Create ProtectedRoute component wrapper
- [x] Check authentication state
- [x] Redirect to login if not authenticated
- [x] Show loading spinner while checking auth
- [x] Typecheck passes

---

## Non-Goals (Platform Rewrite)

The following features are explicitly out of scope for this rewrite:

- **Admin/Tenant Management**: Super admin, tenant admin, multi-tenancy management UI
- **White-label/Branding**: Custom themes, white-label configuration
- **Advanced Analytics**: Playback tracking, content performance, device telemetry dashboards
- **AI Features**: Content suggestions, industry wizard, auto-tagging
- **Integrations**: Webhooks, API tokens, external data sources, Canva integration
- **Team Management**: Multi-user teams, roles, permissions, invitations
- **Billing/Subscriptions**: Stripe integration, plan management, usage limits
- **Audit/Compliance**: Audit logs, GDPR tools, SCIM provisioning
- **MFA**: Multi-factor authentication
- **Design Editor**: Polotno canvas editor, SVG templates
- **Scenes**: Business-type specific configurations
- **Notifications**: In-app notifications, alerts system
- **Developer Features**: API documentation, developer settings

## Technical Considerations (Platform Rewrite)

### Existing Stack to Maintain
- React 19 with Vite for frontend
- Supabase for database, auth, and storage
- Tailwind CSS for styling
- React Router for navigation
- Lucide React for icons

### Patterns to Follow
- Server-side pagination for all list views
- Debounced search inputs (300ms)
- Optimistic UI updates where appropriate
- Real-time subscriptions for screen status
- RLS policies for tenant isolation

### Component Library
- Use existing design-system components (PageLayout, Card, Button, Modal)
- Follow established patterns for forms, tables, and modals

### File Organization
```
src/
├── pages/           # Page components
├── services/        # API/business logic
├── components/      # Reusable UI components
├── contexts/        # React contexts
├── hooks/           # Custom hooks
├── auth/            # Auth pages
├── router/          # Route configuration
├── config/          # App configuration
└── design-system/   # UI component library
```

## Dependencies (Platform Rewrite)

Stories must be executed in this order due to dependencies:

**Phase 1: Database Schema (US-012 through US-022)**
- All schema stories are independent and can run in parallel

**Phase 2: Services (US-023 through US-040, US-050 through US-054, US-064 through US-070, US-081 through US-085, US-095 through US-099)**
- Service stories depend on corresponding schema stories
- Can run in parallel within the phase

**Phase 3: UI (US-028 through US-035, US-041 through US-049, US-055 through US-063, US-071 through US-080, US-086 through US-094, US-100 through US-107, US-108 through US-112)**
- UI stories depend on corresponding service stories
- Can run in parallel within each epic

**Phase 4: Auth & Navigation (US-113 through US-117)**
- Should be done early but can run in parallel with Phase 1-2

---

# PRD: Templates Tab UX Improvements

## Introduction

Improve the Templates tab browsing and usage experience in the client dashboard. Currently, users must click "Use Template" to apply a template immediately without seeing a preview or customizing the result. This PRD adds hover previews, text search, favorites, recently used templates, live preview rendering, and a customization modal before applying templates.

## Goals

- Enable quick template preview on hover without leaving the grid view
- Allow users to search templates by name and description
- Let users save favorite templates for quick access
- Show recently used templates for repeat usage patterns
- Provide live preview of what the template will look like on a screen
- Allow users to customize template name before applying

## User Stories

### Epic 1: Database Schema for Template Personalization

#### US-118: Create user_template_favorites table
**Description:** As a developer, I need to store which templates users have favorited.

**Acceptance Criteria:**
- [x] Create migration `supabase/migrations/112_template_favorites_history.sql`
- [x] Create `user_template_favorites` table with columns: id (uuid), user_id (uuid FK to profiles), template_id (uuid FK to content_templates), created_at
- [x] Add unique constraint on (user_id, template_id)
- [x] Add indexes on user_id and template_id
- [x] Add RLS policy: users can only see/manage their own favorites
- [x] Typecheck passes

#### US-119: Create user_template_history table
**Description:** As a developer, I need to track which templates users have applied recently.

**Acceptance Criteria:**
- [x] Add to migration `supabase/migrations/112_template_favorites_history.sql`
- [x] Create `user_template_history` table with columns: id (uuid), user_id (uuid FK to profiles), template_id (uuid FK to content_templates), applied_at (timestamptz default now())
- [x] Add index on (user_id, applied_at DESC) for efficient recent queries
- [x] Add RLS policy: users can only see their own history
- [x] Typecheck passes

---

### Epic 2: Template Service Functions

#### US-120: Add favorite template service functions
**Description:** As a developer, I need service functions to manage template favorites.

**Acceptance Criteria:**
- [x] Add `addFavoriteTemplate(templateId)` to templateService.js
- [x] Add `removeFavoriteTemplate(templateId)` to templateService.js
- [x] Add `fetchFavoriteTemplates()` returning user's favorited templates
- [x] Add `isTemplateFavorited(templateId)` returning boolean
- [x] Typecheck passes

#### US-121: Add template history service functions
**Description:** As a developer, I need service functions to track and fetch template usage history.

**Acceptance Criteria:**
- [x] Add `recordTemplateUsage(templateId)` to templateService.js - called when template is applied
- [x] Add `fetchRecentlyUsedTemplates(limit = 6)` returning user's recent templates
- [x] Order by applied_at DESC
- [x] Deduplicate (show each template only once, most recent)
- [x] Typecheck passes

#### US-122: Add template search to fetchTemplates
**Description:** As a developer, I need to support text search in template fetching.

**Acceptance Criteria:**
- [x] Update `fetchTemplates()` to accept optional `search` parameter
- [x] Search matches template name OR description (case-insensitive)
- [x] Use Supabase `.ilike()` or `.or()` for search
- [x] Return paginated results as before
- [x] Typecheck passes

---

### Epic 3: Template Preview Component

#### US-123: Create TemplatePreviewPopover component
**Description:** As a user, I want to see an expanded preview when hovering over a template card.

**Acceptance Criteria:**
- [x] Create `src/components/templates/TemplatePreviewPopover.jsx`
- [x] Show on hover/focus after 300ms delay (prevent flicker)
- [x] Display: larger thumbnail, full description, category, type badge
- [x] Position popover to the right of card (or left if near edge)
- [x] Hide on mouse leave or focus loss
- [x] Accessible: works with keyboard focus
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-124: Create TemplateLivePreview component
**Description:** As a user, I want to see a live preview of how the template looks on a screen.

**Acceptance Criteria:**
- [x] Create `src/components/templates/TemplateLivePreview.jsx`
- [x] Render template content in a scaled-down iframe or canvas
- [x] For playlist templates: show first item thumbnail with playlist icon overlay
- [x] For layout templates: show zone arrangement with content placeholders
- [x] For pack templates: show collage of included content
- [x] Support loading state while preview generates
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-125: Integrate live preview into TemplatePreviewPopover
**Description:** As a user, I want to see the live preview in the hover popover.

**Acceptance Criteria:**
- [x] Add TemplateLivePreview component to TemplatePreviewPopover
- [x] Live preview replaces static thumbnail in popover
- [x] Add "Live Preview" label above the live preview area
- [x] Fallback to static thumbnail if live preview fails to load
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### Epic 4: Template Customization Modal

#### US-126: Create TemplateCustomizeModal component
**Description:** As a user, I want to customize template settings before applying.

**Acceptance Criteria:**
- [x] Create `src/components/templates/TemplateCustomizeModal.jsx`
- [x] Show template thumbnail/preview at top
- [x] Include "Name" input field (pre-filled with template name + " Copy")
- [x] For packs: show editable names for each item that will be created
- [x] Include "Apply" and "Cancel" buttons
- [x] Modal is accessible with proper focus management
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-127: Update template apply flow to use customize modal
**Description:** As a user, I want "Use Template" to open the customize modal first.

**Acceptance Criteria:**
- [x] Update TemplatesPage handleApply to open TemplateCustomizeModal
- [x] Pass user-entered names to applyTemplate/applyPack functions
- [x] ~~Update applyTemplate RPC to accept optional custom name parameter~~ (deferred - requires backend changes)
- [x] Record template usage in history after successful apply
- [x] Show success modal after apply completes
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### Epic 5: Search & Discovery UI

#### US-128: Add search input to TemplatesPage header
**Description:** As a user, I want to search templates by name or description.

**Acceptance Criteria:**
- [x] Add search input in TemplatesPage header area
- [x] Debounce search input (300ms)
- [x] Update URL params with search query (bookmarkable)
- [x] Reset to page 1 when search changes
- [x] Show "X results for 'query'" when search active
- [x] Clear button to reset search
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-129: Add Recently Used templates section
**Description:** As a user, I want quick access to templates I've used before.

**Acceptance Criteria:**
- [x] Add "Recently Used" section at top of TemplatesPage (when user has history)
- [x] Show up to 6 recently used templates in horizontal scroll
- [x] Use smaller card variant for this section
- [x] Section only visible when user has applied at least one template
- [x] Clicking template card opens customize modal (same as main grid)
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-130: Add favorites toggle to template cards
**Description:** As a user, I want to favorite templates for quick access.

**Acceptance Criteria:**
- [x] Add heart icon button to TemplateCard component
- [x] Filled heart = favorited, outline heart = not favorited
- [x] Toggle favorite on click (optimistic UI update)
- [x] Show toast on favorite/unfavorite
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-131: Add Favorites filter tab
**Description:** As a user, I want to view only my favorited templates.

**Acceptance Criteria:**
- [x] Add "Favorites" tab to type filter row (after "All Types")
- [x] Show star icon on Favorites tab
- [x] When active, show only user's favorited templates
- [x] Show empty state "No favorites yet" with helpful message
- [x] URL param `favorites=true` for bookmarkable state
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### Epic 6: Template Card Hover Preview Integration

#### US-132: Add hover preview to TemplateCard
**Description:** As a user, I want the preview popover to appear when I hover over a template card.

**Acceptance Criteria:**
- [x] Import and use TemplatePreviewPopover in TemplatesPage (used via useTemplatePreview hook)
- [x] Show popover on mouseenter/focus after 300ms delay
- [x] Hide popover on mouseleave/blur
- [x] Cancel pending popover if mouse leaves before delay
- [x] Popover doesn't block clicking the "Use Template" button
- [x] Typecheck passes
- [ ] Verify changes work in browser

#### US-133: Add keyboard accessibility to hover preview
**Description:** As a user navigating with keyboard, I want to see the preview when I focus a template card.

**Acceptance Criteria:**
- [x] Show preview popover when card receives keyboard focus
- [x] Hide preview when focus moves away
- [x] Press Enter or Space on focused card to open customize modal
- [x] Press 'F' key on focused card to toggle favorite
- [x] Add aria-describedby linking card to popover content
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

## Non-Goals

- **Template editing**: Users cannot modify template contents, only apply copies
- **Template sharing**: No sharing templates between users
- **Template creation**: Users cannot create new templates (admin-only feature)
- **Detailed preview breakdown**: No showing exact items that will be created (per user preference)
- **Template ratings/reviews**: No community feedback system
- **Template recommendations**: No AI-powered suggestions

## Technical Considerations

### Database
- New tables use same RLS patterns as existing user-scoped tables
- Indexes on user_id for efficient per-user queries
- History table may grow large - consider cleanup policy (keep last 100 per user)

### Preview Rendering
- Live preview uses iframe sandbox for security
- Fallback to static thumbnail for performance on slow connections
- Consider lazy-loading preview content to reduce initial load

### State Management
- Favorites state can be cached in React context for instant UI updates
- Search debouncing prevents excessive API calls
- URL params enable deep linking to filtered/searched states

### Existing Components to Reuse
- Modal, Card, Button, Badge from design-system
- Popover pattern from existing tooltip implementations
- Search input pattern from MediaLibraryPage

## Dependencies

**Phase 1: Database (US-118, US-119)**
- Must complete before service functions

**Phase 2: Services (US-120, US-121, US-122)**
- Depends on Phase 1
- Can run in parallel within phase

**Phase 3: Preview Components (US-123, US-124, US-125)**
- Independent of database changes
- Can run in parallel with Phase 1-2

**Phase 4: Customize Modal (US-126, US-127)**
- US-127 depends on US-126 and US-121 (for history recording)

**Phase 5: Search & Discovery UI (US-128, US-129, US-130, US-131)**
- US-128 depends on US-122 (search service)
- US-129 depends on US-121 (history service)
- US-130, US-131 depend on US-120 (favorites service)

**Phase 6: Hover Integration (US-132, US-133)**
- Depends on US-123, US-124, US-125 (preview components)

---
---

# PRD 4: Schedule Tab UX Improvements

## Introduction

Improve the Schedule tab to provide better visibility into scheduled content, prevent scheduling conflicts, and streamline device/screen assignment. Currently, users can create overlapping schedule entries without warnings, cannot easily see what will play on any given day, and must navigate to the Screens page to assign schedules. This PRD addresses all three pain points with a comprehensive overhaul.

## Goals

- **Conflict Prevention**: Block overlapping schedule entries to ensure predictable playback
- **Week-at-a-glance Preview**: Show calendar view of what content plays each day
- **Unified Device Assignment**: Assign schedules to screens/groups from within the editor
- **Filler Content**: Configure per-schedule default content when nothing is scheduled

## User Stories

### US-134: Add filler content columns to schedules table
**Description:** As a developer, I need to store per-schedule filler content settings so users can define what plays when no entries are scheduled.

**Acceptance Criteria:**
- [x] Create migration `113_schedule_filler_content.sql`
- [x] Add `filler_content_type` column (TEXT, nullable): 'playlist' | 'layout' | 'scene' | NULL
- [x] Add `filler_content_id` column (UUID, nullable, foreign key pattern)
- [x] Add CHECK constraint: both columns must be NULL or both non-NULL
- [x] Typecheck passes

---

### US-135: Create schedule conflict detection function
**Description:** As a developer, I need a database function to detect time conflicts between schedule entries so the UI can prevent overlaps.

**Acceptance Criteria:**
- [x] Add function `check_schedule_entry_conflicts(p_schedule_id UUID, p_entry_id UUID, p_start_time TIME, p_end_time TIME, p_days_of_week INT[], p_start_date DATE, p_end_date DATE)` to migration
- [x] Function returns conflicting entry IDs and their time ranges
- [x] Function excludes the entry being edited (p_entry_id) from conflict check
- [x] Function handles NULL days_of_week (means all days)
- [x] Function handles NULL date ranges (means indefinite)
- [x] Grant EXECUTE to authenticated role
- [x] Typecheck passes

---

### US-136: Update scheduleService with filler content functions
**Description:** As a developer, I want service functions to get/set filler content for a schedule.

**Acceptance Criteria:**
- [x] Add `updateScheduleFillerContent(scheduleId, contentType, contentId)` function
- [x] Add `clearScheduleFillerContent(scheduleId)` function
- [x] Both functions return updated schedule object
- [x] Log activity for filler content changes
- [x] Typecheck passes

---

### US-137: Add conflict detection service function
**Description:** As a developer, I want a service function to check for schedule entry conflicts before saving.

**Acceptance Criteria:**
- [x] Add `checkEntryConflicts(scheduleId, entryData, excludeEntryId?)` function
- [x] Function calls the RPC `check_schedule_entry_conflicts`
- [x] Returns `{ hasConflicts: boolean, conflicts: Array<{id, start_time, end_time, content_name}> }`
- [x] Include content name in conflict details for user-friendly display
- [x] Typecheck passes

---

### US-138: Add week preview service function
**Description:** As a developer, I want a function that returns what content plays each day of a given week.

**Acceptance Criteria:**
- [x] Add `getWeekPreview(scheduleId, weekStartDate)` function to scheduleService
- [x] Returns array of 7 days, each with: date, entries (sorted by start_time), filler (if no entries)
- [x] Each entry includes: start_time, end_time, content_type, content_name, content_id
- [x] Respects days_of_week filtering for each entry
- [x] Typecheck passes

---

### US-139: Add device/group assignment service functions
**Description:** As a developer, I want consolidated functions for assigning schedules to devices and groups.

**Acceptance Criteria:**
- [x] Add `getAssignedDevicesAndGroups(scheduleId)` - returns { devices: [], groups: [] }
- [x] Add `bulkAssignScheduleToDevices(scheduleId, deviceIds[])` function
- [x] Add `bulkUnassignScheduleFromDevices(deviceIds[])` function
- [x] Log activity for each assignment change
- [x] Typecheck passes

---

### US-140: Create FillerContentPicker component
**Description:** As a user, I want to select what content plays when no schedule entries are active.

**Acceptance Criteria:**
- [x] Create `src/components/schedules/FillerContentPicker.jsx`
- [x] Dropdown to select content type (Playlist, Layout, Scene)
- [x] Second dropdown to select specific content item
- [x] Shows current selection with thumbnail/icon
- [x] "Clear" button to remove filler content
- [x] Props: `scheduleId`, `currentType`, `currentId`, `onChange`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-141: Create ConflictWarning component
**Description:** As a user, I want to see clear warnings when my schedule entry conflicts with existing entries.

**Acceptance Criteria:**
- [x] Create `src/components/schedules/ConflictWarning.jsx`
- [x] Shows red alert box with conflict details
- [x] Lists each conflicting entry: time range, content name
- [x] Shows "Resolve" suggestion: adjust times or priority
- [x] Props: `conflicts` array from service
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-142: Create WeekPreview component
**Description:** As a user, I want to see a calendar grid showing what plays each day of the week.

**Acceptance Criteria:**
- [x] Create `src/components/schedules/WeekPreview.jsx`
- [x] 7-column grid with day headers (Mon-Sun)
- [x] Each day cell shows stacked content blocks with times
- [x] Color coding: content entries (blue), filler content (gray dashed)
- [x] "No content" state shown for empty days without filler
- [x] Week navigation: previous/next week buttons
- [x] Current week highlighted
- [x] Props: `scheduleId`, `weekStartDate`, `onWeekChange`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-143: Create AssignScreensModal component
**Description:** As a user, I want to assign a schedule to screens from within the schedule editor.

**Acceptance Criteria:**
- [x] Create `src/components/schedules/AssignScreensModal.jsx`
- [x] Modal with two sections: "Screens" and "Screen Groups"
- [x] Checkbox list of all screens with current assignment status
- [x] Checkbox list of all groups with current assignment status
- [x] Search/filter for screens by name
- [x] "Apply" saves changes, "Cancel" discards
- [x] Shows count of selected items
- [x] Props: `isOpen`, `onClose`, `scheduleId`, `onAssigned`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-144: Add conflict check to schedule entry form
**Description:** As a user, I want to be blocked from creating schedule entries that conflict with existing ones.

**Acceptance Criteria:**
- [x] Modify ScheduleEditorPage event form to check conflicts before save
- [x] Call `checkEntryConflicts()` when user changes time/days
- [x] If conflicts exist, show ConflictWarning component
- [x] Disable "Save" button when conflicts exist
- [x] Show inline error message: "This time slot conflicts with existing entries"
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-145: Integrate FillerContentPicker into schedule editor
**Description:** As a user, I want to configure filler content in the schedule editor sidebar.

**Acceptance Criteria:**
- [x] Add FillerContentPicker to ScheduleEditorPage right sidebar
- [x] Place below the events list section
- [x] Load current filler content on page load
- [x] Save filler content changes immediately (no separate save button)
- [x] Show toast on successful save
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-146: Add WeekPreview to schedule editor
**Description:** As a user, I want to see the week-at-a-glance calendar in the schedule editor.

**Acceptance Criteria:**
- [x] Add WeekPreview component above the existing calendar in ScheduleEditorPage
- [x] Default to current week
- [x] Allow navigation to other weeks
- [x] Clicking a day in preview scrolls calendar to that day
- [x] Refresh preview when entries are added/edited/deleted
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-147: Add "Assign Screens" button to schedule editor
**Description:** As a user, I want quick access to assign screens from the schedule editor.

**Acceptance Criteria:**
- [x] Add "Assign Screens" button in ScheduleEditorPage header or sidebar
- [x] Button shows count of currently assigned screens/groups
- [x] Clicking opens AssignScreensModal
- [x] Update count after modal closes
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-148: Add bulk schedule assignment to Screens page
**Description:** As a user, I want to select multiple screens and assign them to a schedule in one action.

**Acceptance Criteria:**
- [x] Add checkbox selection mode to ScreensPage
- [x] Show "Assign Schedule" button in bulk action bar when screens selected
- [x] Dropdown lists all available schedules
- [x] Selecting schedule assigns it to all selected screens
- [x] Show success toast with count: "Assigned schedule to X screens"
- [x] Clear selection after assignment
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-149: Create barrel export for schedule components
**Description:** As a developer, I want clean imports for schedule components.

**Acceptance Criteria:**
- [x] Create `src/components/schedules/index.js`
- [x] Export FillerContentPicker, ConflictWarning, WeekPreview, AssignScreensModal
- [x] Typecheck passes

---

## Non-Goals

- **Drag-and-drop scheduling**: Not implementing drag-to-create or drag-to-resize entries
- **Recurring entry editing**: Not adding "edit all occurrences" for repeat entries
- **Schedule templates**: Not adding ability to save/load schedule templates
- **Priority auto-resolve**: User must manually resolve conflicts, no auto-adjustment
- **Timezone selection**: Keep using device timezone, not per-schedule timezone
- **Entry copy/paste**: Not adding ability to copy entries between schedules

## Technical Considerations

### Existing Patterns to Reuse
- Modal pattern from TemplateCustomizeModal
- Search/filter from MediaLibraryPage
- Checkbox list from existing assignment UIs
- Toast notifications for feedback
- Activity logging for audit trail

### Database Considerations
- Conflict detection must be efficient (use indexes on schedule_id, start_time, end_time)
- Week preview query should batch-fetch entries, not N+1

### UI Considerations
- WeekPreview should be collapsible to save vertical space
- ConflictWarning should be dismissible but re-appear if conflict persists
- AssignScreensModal should lazy-load screens list

## Dependencies

**Phase 1: Database (US-134, US-135)**
- Must complete before service functions

**Phase 2: Services (US-136, US-137, US-138, US-139)**
- Depends on Phase 1
- Can run in parallel within phase

**Phase 3: UI Components (US-140, US-141, US-142, US-143)**
- Depends on Phase 2
- Can run in parallel within phase

**Phase 4: Integration (US-144, US-145, US-146, US-147, US-148)**
- Depends on Phase 3
- US-144 depends on US-141
- US-145 depends on US-140
- US-146 depends on US-142
- US-147 depends on US-143
- US-148 can run in parallel

**Phase 5: Cleanup (US-149)**
- Depends on Phase 3

---

# PRD 5: Media Library UX Improvements

## Introduction

Improve the Media Library page with better upload experience, functional bulk operations, hover previews, and storage visibility. The existing page has checkboxes that don't work, a Tags button that does nothing, and no way to see storage usage. This PRD makes bulk operations functional and adds quality-of-life features.

## Goals

- Enable functional bulk selection and actions (delete, move, tag, download, add to playlist)
- Add quick hover preview for media cards (like Templates page)
- Display storage usage in header (simple used/total bar)
- Improve upload UX with drag-and-drop zone overlay
- Keep focus on folders for organization (no complex tag management UI)

## User Stories

### US-150: Add storage usage calculation function
**Description:** As a developer, I need a database function to calculate storage usage so the UI can display it efficiently.

**Acceptance Criteria:**
- [x] Create migration `114_media_storage_usage.sql`
- [x] Create `get_media_storage_usage()` RPC function
- [x] Returns: total_bytes, total_count, by_type breakdown (image/video/audio/document)
- [x] Function respects RLS (SECURITY DEFINER with owner check)
- [x] Typecheck passes

---

### US-151: Add bulk tagging service function
**Description:** As a developer, I need a service function to add/remove tags from multiple media assets at once.

**Acceptance Criteria:**
- [x] Add `bulkAddTags(mediaIds, tags)` to mediaService.js
- [x] Add `bulkRemoveTags(mediaIds, tags)` to mediaService.js
- [x] Functions update all specified assets in one query
- [x] Return count of updated assets
- [x] Typecheck passes

---

### US-152: Add bulk download service function
**Description:** As a developer, I need a service function to generate download URLs for multiple media assets.

**Acceptance Criteria:**
- [x] Add `getBulkDownloadUrls(mediaIds)` to mediaService.js
- [x] Returns array of { id, name, url, type } for each asset
- [x] Filters out web_page type (can't download external URLs)
- [x] Typecheck passes

---

### US-153: Add bulk add to playlist service function
**Description:** As a developer, I need a service function to add multiple media assets to a playlist.

**Acceptance Criteria:**
- [x] Add `bulkAddToPlaylist(playlistId, mediaIds, duration)` to playlistService.js
- [x] Creates playlist_items for each media asset
- [x] Sets sort_order sequentially after existing items
- [x] Returns count of added items
- [x] Typecheck passes

---

### US-154: Add storage usage service function
**Description:** As a developer, I need a service function to fetch storage usage data.

**Acceptance Criteria:**
- [x] Add `getStorageUsage()` to mediaService.js
- [x] Calls the RPC function from US-150
- [x] Returns formatted data: { totalBytes, totalCount, byType, formattedTotal }
- [x] Add `formatBytes(bytes)` utility function
- [x] Typecheck passes

---

### US-155: Add media preview data function
**Description:** As a developer, I need a service function to fetch preview data for a media asset.

**Acceptance Criteria:**
- [x] Add `getMediaPreviewData(mediaId)` to mediaService.js
- [x] Returns: id, name, type, url, thumbnail_url, file_size, dimensions, duration, created_at
- [x] For video/audio: include duration
- [x] For images: include width/height
- [x] Typecheck passes

---

### US-156: Create MediaPreviewPopover component
**Description:** As a user, I want to see a preview popover when hovering over media cards so I can preview content without opening the detail modal.

**Acceptance Criteria:**
- [x] Create `src/components/media/MediaPreviewPopover.jsx`
- [x] Shows after 300ms hover delay (like Templates)
- [x] Displays thumbnail/preview, name, type, file size, dimensions
- [x] For videos: shows video player with play button
- [x] For audio: shows audio player
- [x] Positioned to not overflow viewport
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-157: Create BulkActionBar component
**Description:** As a user, I want a floating action bar when media is selected so I can perform bulk operations.

**Acceptance Criteria:**
- [x] Create `src/components/media/BulkActionBar.jsx`
- [x] Shows count of selected items
- [x] Buttons: Delete, Move to Folder, Add Tags, Download, Add to Playlist
- [x] Select All / Deselect All buttons
- [x] Fixed position at bottom of screen
- [x] Blue background matching design system
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-158: Create StorageUsageBar component
**Description:** As a user, I want to see my storage usage at a glance so I know how much space I've used.

**Acceptance Criteria:**
- [x] Create `src/components/media/StorageUsageBar.jsx`
- [x] Shows progress bar with used/total
- [x] Shows formatted text (e.g., "2.4 GB of 10 GB used")
- [x] Color changes: green (<50%), yellow (50-80%), red (>80%)
- [x] Compact design suitable for header placement
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-159: Create DropZoneOverlay component
**Description:** As a user, I want a visual drop zone when dragging files over the page so I know I can drop to upload.

**Acceptance Criteria:**
- [x] Create `src/components/media/DropZoneOverlay.jsx`
- [x] Full-page overlay with dashed border
- [x] Shows "Drop files to upload" message with upload icon
- [x] Appears on dragenter, hides on dragleave/drop
- [x] Accepts image, video, audio, PDF files
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-160: Wire up bulk selection checkboxes
**Description:** As a user, I want the checkboxes on media cards to work so I can select multiple items.

**Acceptance Criteria:**
- [x] Add `selectedMediaIds` state (Set) to MediaLibraryPage
- [x] Wire up checkbox in grid card and list row to toggle selection
- [x] Add "select all visible" checkbox in header
- [x] Selection persists across pagination (clear on filter change)
- [x] Visual indicator on selected cards (ring/highlight)
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-161: Integrate MediaPreviewPopover on grid cards
**Description:** As a user, I want hover preview on media grid cards so I can quickly preview content.

**Acceptance Criteria:**
- [x] Import and use MediaPreviewPopover in MediaLibraryPage
- [x] Add hover state tracking to MediaGridCard
- [x] Show popover on 300ms hover delay
- [x] Hide on mouse leave
- [x] Don't show popover while dragging
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-162: Integrate BulkActionBar with bulk operations
**Description:** As a user, I want the bulk action bar to perform actual operations on selected media.

**Acceptance Criteria:**
- [x] Show BulkActionBar when selectedMediaIds.size > 0
- [x] Delete: calls batchDeleteMediaAssets, shows confirmation, refreshes
- [x] Move: shows folder picker modal, calls moveMediaToFolder
- [x] Tags: shows tag input modal, calls bulkAddTags
- [x] Download: calls getBulkDownloadUrls, triggers downloads
- [x] Add to Playlist: shows playlist picker, calls bulkAddToPlaylist
- [x] Clear selection after successful operation
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-163: Add StorageUsageBar to header
**Description:** As a user, I want to see my storage usage in the media library header.

**Acceptance Criteria:**
- [x] Add StorageUsageBar to MediaLibraryPage header area
- [x] Fetch storage usage on page load
- [x] Show loading state while fetching
- [x] Position near "Add Media" button
- [x] Refresh after upload/delete operations
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-164: Add drag-drop zone overlay to page
**Description:** As a user, I want to drag files onto the media library page to upload them.

**Acceptance Criteria:**
- [x] Add DropZoneOverlay to MediaLibraryPage
- [x] Handle dragenter/dragleave/drop on page container
- [x] On drop: call existing openFilePicker or handleUploadSuccess
- [x] Validate dropped files match allowed types
- [x] Show toast for invalid files
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

### US-165: Create barrel export for media components
**Description:** As a developer, I want a clean barrel export for the new media components.

**Acceptance Criteria:**
- [x] Update `src/components/media/index.js`
- [x] Export MediaPreviewPopover, BulkActionBar, StorageUsageBar, DropZoneOverlay
- [x] Update imports in MediaLibraryPage to use barrel
- [x] Typecheck passes

---

## Non-Goals

- **Tag management UI**: No dedicated tag browser, editor, or autocomplete (just bulk add/remove)
- **Smart folders**: No auto-organizing folders based on type/date/tags
- **Zip download**: Downloads are individual files, not a single zip (browser limitation)
- **Upload queue UI**: No persistent upload queue panel (use existing modal)
- **Storage quotas enforcement**: Just display usage, don't block uploads at limit
- **Nested folder selection**: Bulk move only to existing folders, no create-on-move

## Technical Considerations

### Existing Patterns to Reuse
- TemplatePreviewPopover for hover preview pattern
- Existing drag-and-drop in MediaGridCard for reordering
- Existing useS3Upload hook for file uploads
- Toast notifications for operation feedback
- Existing bulk delete function `batchDeleteMediaAssets`
- Existing move function `moveMediaToFolder`

### Database Considerations
- Storage calculation should use SUM aggregate, not client-side
- Consider caching storage usage (only refresh on upload/delete)

### UI Considerations
- Bulk action bar should not obscure content (fixed bottom, semi-transparent)
- Preview popover should lazy-load video/audio to reduce bandwidth
- Drop zone should have high z-index to catch drops on cards

## Dependencies

**Phase 1: Database (US-150)**
- Must complete before storage usage service

**Phase 2: Services (US-151, US-152, US-153, US-154, US-155)**
- US-154 depends on US-150
- Others can run in parallel

**Phase 3: UI Components (US-156, US-157, US-158, US-159)**
- Can run in parallel within phase

**Phase 4: Integration (US-160, US-161, US-162, US-163, US-164)**
- US-160 must complete first (bulk selection needed for actions)
- US-161 depends on US-156
- US-162 depends on US-157, US-160, US-151, US-152, US-153
- US-163 depends on US-158, US-154
- US-164 depends on US-159

**Phase 5: Cleanup (US-165)**
- Depends on Phase 3
