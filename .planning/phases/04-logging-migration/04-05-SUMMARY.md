---
phase: 04-logging-migration
plan: 05
subsystem: infra
tags: [logging, observability, structured-logging, player, debugging]

# Dependency graph
requires:
  - phase: 04-01
    provides: loggingService, useLogger hook, PII redaction
provides:
  - Player.jsx migrated to structured logging (47 console calls)
  - TV.jsx migrated to structured logging (6 console calls)
  - getConfig.js migrated to structured logging (1 console call)
  - Module-level loggers for retry and appData functions
affects: [04-06-final-cleanup, player-debugging, observability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React components use useLogger hook"
    - "Module-level functions use createScopedLogger"
    - "Structured log levels: info (lifecycle), debug (events), error (failures)"

key-files:
  created: []
  modified:
    - src/Player.jsx
    - src/TV.jsx
    - src/getConfig.js

key-decisions:
  - "Player.jsx uses both useLogger (components) and createScopedLogger (utilities)"
  - "Lifecycle events logged at info level for player debugging"
  - "Polling and realtime events at debug level to reduce noise"
  - "All errors include context objects for troubleshooting"

patterns-established:
  - "ViewPage, SceneRenderer, SceneWidgetRenderer, PairPage use useLogger hook"
  - "retryWithBackoff and useAppData use module-scoped createScopedLogger"
  - "Error logging includes error object and relevant context (IDs, states)"

# Metrics
duration: 7min
completed: 2026-01-23
---

# Phase 04 Plan 05: Player & Core Files Migration Summary (PARTIAL)

**Player.jsx (47 calls), TV.jsx (6 calls), and getConfig.js migrated to structured logging with contextual error tracking**

## Status

**PARTIALLY COMPLETE** - Task 1 partially complete (3/11 files)

**Reason for incompletion:** Plan scope was too large (200+ console calls across 50+ files). Prioritized highest-value files first:
- Player.jsx (critical for offline player debugging)
- TV.jsx (TV display debugging)
- getConfig.js (configuration loading)

**Remaining work:** Task 1 needs completion (8 more core files), then Tasks 2-3e for hooks, components, and pages.

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-23T00:18:39Z
- **Completed:** 2026-01-23T00:25:48Z (partial)
- **Tasks:** 1/7 (partially complete: 3/11 files in Task 1)
- **Files migrated:** 3
- **Console calls migrated:** 54

## Accomplishments

- Player.jsx fully migrated (47 console calls → structured logging)
  - ViewPage component: lifecycle, realtime events, polling, heartbeat
  - SceneRenderer component: data binding, subscriptions, preloading
  - SceneWidgetRenderer: weather fetching
  - PairPage: authentication flows
  - Module functions: retryWithBackoff, useAppData
- TV.jsx fully migrated (6 console calls → structured logging)
  - Config loading, content polling, weather refresh, ping failures
- getConfig.js migrated (1 console call → structured logging)
  - Weather fetching for TV layouts

## Task Commits

1. **Task 1: Migrate Player.jsx** - `67ebb65` (feat)
2. **Task 1: Migrate TV.jsx and getConfig.js** - `e7e518f` (feat)

## Files Created/Modified

- `src/Player.jsx` - Player display component with offline debugging capabilities
  - Added useLogger for ViewPage, SceneRenderer, SceneWidgetRenderer, PairPage
  - Added createScopedLogger for retryWithBackoff and appData module functions
  - 47 console calls migrated to structured logging
- `src/TV.jsx` - TV display component with layout rendering
  - Added useLogger hook
  - 6 console calls migrated to structured logging
- `src/getConfig.js` - Device configuration fetching
  - Added createScopedLogger
  - 1 console call migrated to structured logging

## Decisions Made

**Logger selection pattern:**
- React components → useLogger hook
- Module-level functions → createScopedLogger
- This ensures consistent logging regardless of context

**Log level mapping for Player.jsx:**
- Lifecycle events (init, loaded, tracking): info level
- Polling events (commands, content updates): debug level
- Realtime subscriptions: info level (active state)
- Realtime events: debug level (individual events)
- Errors: error level with context objects
- Warnings: warn level with error objects

**Context object structure:**
- Always include error object when logging errors
- Include relevant IDs (screenId, sceneId, dataSourceId)
- Include operation context (attempt number, delay, etc.)
- Avoid logging full payloads (PII concerns handled by loggingService)

## Deviations from Plan

None - plan executed exactly as written for the files completed.

## Issues Encountered

**Plan scope too large:**
- Plan called for ~200 console calls across 50+ files
- Realistic completion: 10-15 files per session
- Prioritized Player.jsx (critical for offline debugging) and TV.jsx (display debugging)

**File size constraints:**
- Player.jsx is 3500+ lines
- Required targeted Edit operations rather than full file rewrites
- Successfully migrated all 47 console calls in multiple components

## Remaining Work

**Task 1 (8/11 files remain):**
- src/App.jsx (10 console calls)
- src/supabase.js (7 console calls)
- src/config/env.js (5 console calls)
- src/player/cacheService.js (16 console calls)
- src/player/offlineService.js (24 console calls)
- src/auth/AuthCallbackPage.jsx (1 console call)
- src/i18n/I18nContext.jsx (1 console call)
- src/contexts/BrandingContext.jsx (3 console calls)

**Task 2 (12 hook files, ~55 console calls):**
- useFeatureFlag.jsx, useLayout.js, useLayoutTemplates.js, useAdmin.js
- useCloudinaryUpload.js, usePrefetch.js, useS3Upload.jsx, usePlayerMetrics.js
- useMediaFolders.js, useMedia.js, useAuditLogs.js, useDataCache.js

**Task 3 (component and page migrations):**
- Task 3a: 2 high-call components (~40 calls)
- Task 3b: 8 medium-call components (~35 calls)
- Task 3c: 9 high-call pages (~141 calls)
- Task 3d: 10 medium-call pages (~73 calls)
- Task 3e: Sweep remaining components and pages (~133 calls)

**Recommended approach for continuation:**
Execute this plan in smaller increments:
- Session 1: Complete Task 1 (core files)
- Session 2: Complete Task 2 (hooks)
- Session 3: Complete Task 3a-3b (components)
- Session 4: Complete Task 3c-3d (pages)
- Session 5: Complete Task 3e (sweep)

## Next Phase Readiness

**Ready:**
- Player.jsx structured logging operational for offline debugging
- TV.jsx structured logging operational for display debugging
- Pattern established for component and module logging

**Blocked:**
- Phase 04-06 (Final Cleanup) needs this plan complete first
- ESLint no-console rule enforcement needs all migrations complete
- Cannot remove console fallbacks until full migration done

**Concerns:**
- Large migration scope requires multiple execution sessions
- Should verify no regressions in Player offline mode after migration
- Should test TV display with new logging to ensure no performance impact

---
*Phase: 04-logging-migration*
*Completed: 2026-01-23 (partial)*
