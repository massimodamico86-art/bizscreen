---
phase: 04-logging-migration
plan: 05
subsystem: infrastructure
tags: [logging, structured-logging, loggingService, useLogger, createScopedLogger, pages]

# Dependency graph
requires:
  - phase: 04-01
    provides: "Logging infrastructure with PII redaction and useLogger hook"
provides:
  - "Core application files migrated to structured logging (App, Player services)"
  - "All hooks migrated to structured logging (12 files)"
  - "All utility files migrated to structured logging (6 files)"
  - "High-priority pages migrated to structured logging (3 files, 61 calls)"
  - "Zero console calls in hooks, utils, and migrated pages"
affects: ["04-06"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useLogger hook for React components and pages"
    - "createScopedLogger for non-React code (hooks, utilities)"
    - "Deprecated utils/logger.js marked for Plan 06 removal"

key-files:
  created: []
  modified:
    - src/App.jsx
    - src/supabase.js
    - src/player/cacheService.js
    - src/player/offlineService.js
    - src/auth/AuthCallbackPage.jsx
    - src/contexts/BrandingContext.jsx
    - src/hooks/* (12 files)
    - src/utils/* (6 files)
    - src/pages/MediaLibraryPage.jsx
    - src/pages/ScreensPage.jsx
    - src/pages/PlaylistEditorPage.jsx

key-decisions:
  - "Keep console.warn in errorTracking.js for Sentry init fallback (avoids circular dependency)"
  - "Mark utils/logger.js as DEPRECATED with TODO for Plan 06 removal"
  - "Use createScopedLogger for hooks (simpler than useLogger for non-rendering code)"
  - "Silent fail on invalid drop data in sub-components (parent logs actual errors)"

patterns-established:
  - "React components: import { useLogger } from './hooks/useLogger.js'"
  - "Non-React code: import { createScopedLogger } from '../services/loggingService.js'"
  - "Keep minimal console.warn for critical infrastructure failures (Sentry, logging itself)"
  - "Include contextual IDs (playlistId, screenId, mediaId) in all page logs"

# Metrics
duration: 8min (Session 1) + 15min (Session 2)
completed: 2026-01-23 (Partial - Continuation Needed)
---

# Phase 04-05: Core Files, Hooks, and Pages Migration (Partial) Summary

**Core application files, all hooks, utilities, and 3 high-priority pages migrated to structured logging with ~187 console calls eliminated**

## Performance

- **Session 1 Duration:** 8 min (2026-01-23T00:38:04Z - 00:45:52Z)
- **Session 2 Duration:** 15 min (2026-01-23T01:15:00Z - 01:30:00Z)
- **Total Duration:** 23 min
- **Tasks:** 2 of 6 completed (Tasks 1-2), partial Task 3c
- **Files modified:** 27

## Accomplishments

### Session 1 (Tasks 1-2)
- Core application files migrated: App.jsx, supabase.js, player services (cacheService, offlineService)
- All 12 hooks migrated to structured logging (zero console calls remain)
- All 6 utility files migrated with appropriate logger usage
- Old logger.js marked DEPRECATED with TODO for removal
- Build verification successful after migration
- **Console calls eliminated:** ~126

### Session 2 (Partial Task 3c)
- MediaLibraryPage.jsx: 23 console calls -> logger.info/error
  - Media operations (upload, delete, move, reorder)
  - Folder management (create, navigate, breadcrumbs)
  - Bulk actions (delete, download, add to playlist)
  - All errors include contextual IDs (mediaId, folderId, playlistId, screenId)
- ScreensPage.jsx: 20 console calls -> logger.info/error
  - Screen management (create, update, delete, assign location)
  - Device commands (reboot, reload, clear cache, kiosk mode)
  - Content assignment (playlist, layout, schedule)
  - Bulk schedule assignment
  - Analytics loading
- PlaylistEditorPage.jsx: 18 console calls -> logger.error
  - Playlist operations (fetch, add item, remove item, reorder)
  - Folder navigation (folders, folder path)
  - Media fetching and filtering
  - AI assistant (generate slides, apply slides)
  - Approval workflow (request, revert, fetch review)
  - Preview links (fetch, create, revoke)
  - Save as template
- **Console calls eliminated:** 61
- **Build verified:** No errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate core files** - `299b214` (feat)
   - App.jsx (10 calls), supabase.js (7 calls)
   - cacheService.js (16 calls), offlineService.js (24 calls)
   - AuthCallbackPage.jsx (1 call), BrandingContext.jsx (3 calls)
   - Total: 61 console calls migrated

2. **Task 2: Migrate hooks and utilities** - `19e67fb` (feat)
   - 12 hooks: useAdmin, useAuditLogs, useCloudinaryUpload, useDataCache, useLayout, useLayoutTemplates, useMedia, useMediaFolders, usePlayerMetrics, usePrefetch, useFeatureFlag, useS3Upload (~44 calls)
   - 6 utilities: errorMessages, observability, sanitize, performance, errorTracking (~21 calls)
   - Total: ~65 console calls migrated

3. **Partial Task 3c: High-priority pages (session 2)** - `35030c8`, `841d706` (feat)
   - MediaLibraryPage.jsx (23 calls) - media operations, folder management, bulk actions
   - ScreensPage.jsx (20 calls) - screen management, device commands, content assignment
   - PlaylistEditorPage.jsx (18 calls) - playlist operations, AI assistant, approval workflow
   - Total: 61 console calls migrated

## Remaining Work

**Tasks 3a, 3b, 3c (partial), 3d, 3e remain incomplete:**

- Task 3a: High-call components (FabricSvgEditor, QRCodeManager - ~40 calls)
- Task 3b: Medium-call components (8 files - ~35 calls)
- Task 3c: High-call pages (6 remaining files - ~98 calls)
  - DataSourcesPage.jsx: 16 calls
  - CampaignEditorPage.jsx: 16 calls
  - Admin/AdminEditTemplatePage.jsx: 14 calls
  - LayoutEditorPage.jsx: 12 calls
  - FeatureFlagsPage.jsx: 12 calls
  - PlaylistsPage.jsx: 12 calls
  - ServiceQualityPage.jsx: ~8 calls
  - AppsPage.jsx: ~8 calls
- Task 3d: Medium-call pages (10 files - ~73 calls)
- Task 3e: Sweep remaining components and pages (~133 calls)

**Estimated remaining:** ~379 console calls across ~47+ files

**Next session should:**
1. Complete Task 3c (remaining 6 high-call pages)
2. Complete Task 3a (high-call components)
3. Complete Task 3b-3e (remaining components and pages)
4. Run final verification
5. Create final SUMMARY.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Silent failure in FolderGridCard sub-component**
- **Found during:** MediaLibraryPage migration
- **Issue:** console.error in sub-component that doesn't have access to logger hook
- **Fix:** Replaced with comment - parent component logs actual move errors
- **Files modified:** src/pages/MediaLibraryPage.jsx
- **Commit:** 35030c8

## Next Phase Readiness

**Ready:**
- Core infrastructure (services, hooks, utils) uses structured logging
- Logging patterns established and documented
- Build system working correctly
- High-value pages (MediaLibrary, Screens, PlaylistEditor) migrated

**Blockers:**
- Components and pages still using console calls (~379 calls remaining)
- Need Task 3a-3e completion before proceeding to 04-06

**Recommendation:**
Continue plan 04-05 in next session to complete component/page migration before moving to plan 04-06 (final cleanup). Priority order: finish Task 3c (high-call pages), then Task 3a (high-call components), then sweep remaining files.

---
*Phase: 04-logging-migration*
*Completed: 2026-01-23 (Partial - 2 of 6 tasks complete, Task 3c 33% complete)*
*Total Console Calls Eliminated: ~187 (126 in Session 1, 61 in Session 2)*
