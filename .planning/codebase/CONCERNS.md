# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Extremely Large Component Files:**
- Issue: Several components exceed 1000-3000 lines, making them difficult to maintain, test, and reason about
- Files:
  - `src/components/svg-editor/FabricSvgEditor.jsx` (2997 lines) - Full SVG editor with 10+ state variables
  - `src/services/industryWizardService.js` (2797 lines) - Massive template definition objects
  - `src/services/sceneDesignService.js` (1599 lines) - CRUD + design utilities mixed
  - `src/components/media/YodeckAddMediaModal.jsx` (1547 lines) - Upload modal with complex state
  - `src/pages/PlaylistsPage.jsx` (1324 lines) - Page + business logic + UI
  - `src/pages/DataSourcesPage.jsx` (1323 lines) - Data source management page
  - `src/services/dataSourceService.js` (1286 lines) - Multiple external API integrations
  - `src/services/alertEngineService.js` (1286 lines) - Alert engine with complex rules
  - `src/components/scene-editor/PropertiesPanel.jsx` (1262 lines) - Properties panel
  - `src/services/mediaService.js` (1242 lines) - Media CRUD + S3 integration
  - `src/services/scheduleService.js` (1221 lines) - Schedule logic with timezone handling
  - `src/pages/AppsPage.jsx` (1206 lines) - Apps marketplace page
  - `src/pages/hooks/usePlaylistEditor.js` (1189 lines) - Complex editor hook
  - `src/pages/LayoutEditorPage.jsx` (1178 lines) - Layout editor page
  - `src/pages/hooks/useMediaLibrary.js` (1068 lines) - Media library state management
- Impact: High cognitive load, difficult code reviews, merge conflicts, hard to test, harder to identify bugs
- Fix approach: Split into smaller focused components/services (target <500 lines), extract reusable utilities, apply single responsibility principle, move business logic to services

**Excessive useState Usage:**
- Issue: Complex state management with many individual useState calls instead of consolidated state
- Files: Particularly problematic in:
  - `src/pages/hooks/useMediaLibrary.js` (18+ individual state variables for modals, selection, pagination)
  - `src/pages/hooks/usePlaylistEditor.js` (14+ state variables)
  - `src/components/svg-editor/FabricSvgEditor.jsx` (10+ state variables)
  - `src/App.jsx` (multiple page state, toast, listings state)
- Impact: State synchronization bugs, unnecessary re-renders, difficult to debug state flow, race conditions
- Fix approach: Consolidate related state into useReducer, consider lightweight state library (Zustand), apply state colocation principle

**Legacy Code Not Removed:**
- Issue: Legacy directory contains 13 files marked as "not used at runtime" but still in codebase
- Files: `src/legacy/` - pages, components, hooks, utils
  - `src/legacy/README.md` states "Safe to Delete"
  - Multiple legacy wrapper components: `src/components/Button.jsx`, `src/components/Modal.jsx`, `src/components/Badge.jsx`
  - Legacy fallback functions in `src/services/dashboardService.js` (getDashboardStatsLegacy, getDeviceHealthIssuesLegacy)
- Impact: Confusion about which code is active, bloated bundle size, maintenance burden
- Fix approach: Delete legacy directory, remove legacy fallback code once migrations are confirmed complete, audit for any hidden legacy imports

**Console Logging in Production Code:**
- Issue: 156 console.log/warn/error calls across 50 files despite structured logging service existing
- Files: Production code in `src/pages/`, `src/components/`, `src/services/`
- Impact: Noisy browser console, potential PII leakage, inconsistent logging format, no production log aggregation
- Fix approach: Replace with `useLogger` hook or `createScopedLogger` from loggingService, add ESLint rule to prevent console.*, vite build config drops console.* but should use logging service

**Empty Catch Blocks:**
- Issue: 21 instances of silently swallowed errors without logging
- Files:
  - `src/player/components/widgets/DataTableWidget.jsx` - Silent error swallowing
  - `src/player/components/widgets/RssCardWidget.jsx` - Error ignored
  - `src/player/components/widgets/RssTickerWidget.jsx` - Error ignored
  - `src/services/dataSourceService.js` - `deleteDataSource().catch(() => {})`
  - `src/components/onboarding/WelcomeTour.jsx` - `updateWelcomeTourStep().catch(() => {})`
  - `src/pages/SceneEditorPage.jsx` - `.catch(() => {}) // Graceful fallback`
  - `src/components/BillingBanner.jsx` - `.catch(() => {})`
  - `src/services/googleSheetsService.js` - Multiple empty catches
  - `src/services/industryWizardService.js` - Silent failures
  - `src/services/canvaService.js` - Error swallowing
  - `src/components/scene-editor/IndustryWizardModal.jsx` - Silent catch
  - `src/services/screenService.js` - Errors ignored
  - `src/services/gdprDeletionService.js` - Deletion errors swallowed
  - `src/services/cloudinaryService.js` - Upload errors not logged
- Impact: Hidden failures, debugging nightmares, data loss potential, silent feature breakage
- Fix approach: At minimum log errors to loggingService, consider user notifications where appropriate, add sentry reporting

**ESLint Disabled 37 Times:**
- Issue: 37 eslint-disable-next-line comments across 30 files, suppressing warnings instead of fixing
- Files: `src/pages/ScreenGroupsPage.jsx` (3 disables), `src/components/svg-editor/FabricSvgEditor.jsx` (2 disables), others
- Impact: Hidden code quality issues, potential bugs, inconsistent code standards
- Fix approach: Review each disable, fix underlying issues, remove disable comments, document exceptions if truly necessary

**Environment Variable Dependency:**
- Issue: 86 direct references to `import.meta.env` scattered throughout codebase
- Files: 30+ different service and config files
- Impact: Hard to mock in tests, unclear which env vars are required, potential runtime errors if missing
- Fix approach: Centralize in `src/config/env.js` (which exists) and import from there, document all required variables, add runtime validation

**localStorage/sessionStorage Direct Usage:**
- Issue: 38 direct storage API calls across 21 files without error handling
- Files:
  - `src/services/playerService.js` (4 calls)
  - `src/services/canvaService.js` (8 calls)
  - `src/services/sessionService.js` (storage wrapper)
  - `src/i18n/I18nContext.jsx` (locale storage)
  - `src/services/playbackTrackingService.js`
- Impact: No error handling for quota exceeded, SSR incompatibility, no fallback mechanism
- Fix approach: Use `src/services/sessionService.js` wrapper consistently, add try/catch for quota errors, implement fallback to memory storage

**Missing TypeScript:**
- Issue: Entire codebase is JavaScript (.jsx) with no type checking
- Files: All 541 source files (185,070 lines of code)
- Impact: Runtime type errors, no IDE autocomplete for props, difficult refactoring, prop drilling mistakes
- Fix approach: Gradual migration to TypeScript, start with `.d.ts` files for key interfaces, use JSDoc types as intermediate step, enable TypeScript checking in vite.config

**Promise Chain Anti-Pattern:**
- Issue: 61 uses of `.then()/.catch()` promise chains instead of async/await
- Files: 30+ files mixing async/await with promise chains
- Impact: Inconsistent error handling, harder to read, callback hell
- Fix approach: Standardize on async/await, use try/catch for error handling, update ESLint rules

## Known Bugs

**TODO Comments Indicating Incomplete Features:**
- Issue: Multiple TODO/FIXME comments indicating missing functionality
- Files:
  - `src/components/EditorModal.jsx:133` - "TODO: In a future iteration, we could send a 'triggerSave' message to the iframe"
  - `src/legacy/utils/performance.js:104` - "TODO: Send to analytics service (e.g., Google Analytics, Mixpanel)"
  - `vitest.config.js:37` - "TODO: Raise thresholds as more tests are added. Currently set to 0"
- Impact: Feature gaps, incomplete functionality, technical debt accumulation
- Fix approach: Prioritize TODOs, convert to tracked issues in project management, complete or remove

**Legacy Dashboard Fallbacks:**
- Symptoms: Dashboard queries may use unbounded legacy methods if optimized DB functions missing
- Files:
  - `src/services/dashboardService.js:39` - Falls back to getDashboardStatsLegacy if get_dashboard_stats() doesn't exist
  - `src/services/dashboardService.js:240` - Falls back to getDeviceHealthIssuesLegacy
  - `src/services/dashboardService.js:322` - Falls back to getAlertSummaryLegacy
- Trigger: Missing database migration 108
- Workaround: Legacy methods fetch all rows (performance hit)
- Fix: Ensure migration 108 is run in all environments, remove legacy fallbacks once confirmed

**Migration Data Format Issues:**
- Symptoms: Block properties may exist at root level instead of in props object
- Files: `src/services/sceneDesignService.js:330-376` - Includes migration logic for "legacy blocks"
- Trigger: Loading scenes created before props normalization
- Mitigation: Automatic migration on load via normalizeDesign()
- Fix: Run data migration to normalize all existing scenes, remove migration code

## Security Considerations

**XSS Protection Properly Implemented:**
- Risk: dangerouslySetInnerHTML used but properly sanitized via DOMPurify
- Files:
  - `src/security/SafeHTML.jsx` - Safe wrapper component
  - `src/security/sanitize.js` - Centralized sanitization with allowed tags/attributes
  - Only 2 uses of dangerouslySetInnerHTML: `src/pages/HelpCenterPage.jsx`, `src/security/SafeHTML.jsx` (both sanitized)
- Current mitigation: DOMPurify sanitization before any HTML rendering, sanitization event logging to `security_events` table
- Recommendations: Continue using SafeHTML component exclusively, audit for any direct innerHTML usage, review ALLOWED_TAGS whitelist periodically

**Password/Secret Handling:**
- Risk: Extensive password/token/secret handling across authentication and API integrations
- Files: 258 references across 30 files (auth, player, services)
- Current mitigation:
  - Passwords properly hashed via `src/services/passwordService.js`
  - Kiosk passwords migrated from plaintext to bcrypt hashes
  - PII redaction via `src/utils/pii.js` (SSN, credit cards, emails)
  - API keys accessed via environment variables
- Recommendations:
  - Audit that no secrets are logged to loggingService or console
  - Verify all password comparisons use bcrypt
  - Ensure no API keys in client bundle
  - Review legacy plaintext password fallback in `src/services/playerService.js:595`

**Direct Supabase Database Access:**
- Risk: Direct supabase.from() queries throughout codebase - potential RLS bypass, injection
- Files: 256 error/throw patterns across services (extensive DB access)
- Current mitigation:
  - Supabase RLS policies (139 migration files suggest schema management)
  - Postgres parameterized queries prevent SQL injection
  - Row-level security enforced at database layer
- Recommendations:
  - Audit RLS policies for completeness
  - Consider API layer for sensitive operations
  - Validate all user inputs before queries
  - Review RLS policies in migrations (particularly 002_fix_rls_and_roles.sql, 012_finalize_rls_rbac.sql)

**Local Storage Security:**
- Risk: Sensitive data potentially stored in localStorage without encryption
- Files: 38 localStorage/sessionStorage uses across 21 files
- Current mitigation: Session service wrapper exists but not used consistently
- Recommendations:
  - Audit what's stored (screen_id, playlist_id, kiosk_password, auth tokens)
  - Encrypt sensitive data before storage
  - Implement expiration for stored data
  - Clear all storage on logout
  - Review `src/player/pages/ViewPage.jsx` STORAGE_KEYS for sensitive data

**Sanitization Logging Hook:**
- Risk: DOMPurify hook logs when malicious content is removed - could indicate attack attempts
- Files: `src/security/sanitize.js:38-94` - initSanitizationLogging
- Current mitigation: Logs to securityService.logSanitizationEvent (summary only, not actual content)
- Recommendations: Monitor sanitization events, alert on repeated attempts, implement rate limiting

## Performance Bottlenecks

**Massive Hook Dependency Arrays:**
- Problem: Extensive use of useEffect/useCallback/useMemo (48 occurrences across 30 files) with potentially incorrect dependencies
- Files: All page hooks and large components
- Cause: Large component files, complex state management, lack of optimization awareness
- Improvement path:
  - Use React DevTools Profiler to identify re-render issues
  - Memoize expensive computations
  - Split components to reduce scope
  - Use React Compiler (experimental) for automatic optimization

**Large Page Components:**
- Problem: Monolithic page components cause slow initial render and bundle bloat
- Files:
  - `src/pages/PlaylistsPage.jsx` (1324 lines)
  - `src/pages/DataSourcesPage.jsx` (1323 lines)
  - `src/pages/LayoutEditorPage.jsx` (1178 lines)
  - `src/App.jsx` (1076 lines with 110+ lazy imports)
- Cause: Monolithic page components, embedded business logic, lack of code splitting
- Improvement path:
  - Already using React.lazy in App.jsx (good!)
  - Extract subcomponents to separate files
  - Move business logic to custom hooks
  - Further split heavy pages

**SVG Editor Performance:**
- Problem: 2997-line FabricSvgEditor with heavy canvas operations
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`
- Cause: Fabric.js rendering overhead (v6.9.0), large component size, complex state, Google Fonts loading
- Improvement path:
  - Consider Web Workers for SVG processing
  - Implement canvas virtualization for large designs
  - Split component into smaller focused components
  - Lazy load Google Fonts
  - Debounce canvas updates

**Dashboard Stats Query Performance:**
- Problem: Legacy dashboard queries fetch all rows (unbounded)
- Files: `src/services/dashboardService.js:72-119` - getDashboardStatsLegacy
- Cause: Fallback to legacy method if DB function missing, no pagination
- Improvement path: Ensure get_dashboard_stats() DB function deployed everywhere, remove legacy fallback

**IndexedDB Cache Size:**
- Problem: Player cache can grow to 500MB+ (CACHE_LIMITS in cacheService)
- Files: `src/player/cacheService.js:31-40` - CACHE_LIMITS defines 500MB for media, 100MB for scenes
- Cause: Offline media caching for player, no LRU eviction implemented yet
- Improvement path: Implement LRU eviction, monitor cache size, add user controls for cache limits

## Fragile Areas

**Player Offline Sync:**
- Files:
  - `src/player/offlineService.js` - Offline queue management
  - `src/player/cacheService.js` - IndexedDB cache (DB_VERSION = 3)
  - `src/player/hooks/usePlayerContent.js` - Content fetching with offline support
  - `src/player/hooks/usePlayerHeartbeat.js` - Heartbeat with retry logic
  - `src/player/pages/ViewPage.jsx` - Main player with offline detection
- Why fragile:
  - Complex sync logic with exponential backoff
  - IndexedDB schema migrations (version 3, needs careful upgrade handling)
  - Network state detection edge cases
  - Race conditions between cache updates and playback
  - Stuck detection and recovery logic
- Safe modification:
  - Extensive E2E testing required for offline scenarios
  - Test network transitions (online → offline → online)
  - Verify sync queue doesn't grow unbounded
  - Test IndexedDB quota exceeded handling
- Test coverage: E2E tests exist (`tests/e2e/`) but unit coverage at 0%

**Schedule Conflict Resolution:**
- Files:
  - `src/services/scheduleService.js` (1221 lines) - Complex scheduling logic
  - `src/pages/ScheduleEditorPage.jsx` (1152 lines) - Schedule editor
  - `src/components/schedules/ConflictWarning.jsx` - Conflict detection UI
  - `src/components/schedules/DaypartPicker.jsx` - Time selection
  - `src/components/schedules/DateDurationPicker.jsx` - Date range handling
- Why fragile:
  - Complex date/time logic with daypart calculations
  - Priority rules and conflict detection
  - Timezone handling across multiple zones
  - Recurring schedule patterns
  - Seasonal campaigns with date ranges
- Safe modification:
  - Add comprehensive unit tests for edge cases (DST transitions, leap years, midnight boundaries)
  - Validate against production schedule data
  - Test with multiple timezones
- Test coverage: E2E tests exist (`tests/e2e/schedules.spec.js`) but unit coverage missing

**Media Upload & S3 Integration:**
- Files:
  - `src/services/mediaService.js` (1242 lines) - Media CRUD
  - `src/services/s3UploadService.js` - S3 presigned URLs
  - `src/hooks/useS3Upload.jsx` - Upload hook with progress
  - `src/components/media/YodeckAddMediaModal.jsx` (1547 lines) - Upload modal
- Why fragile:
  - Presigned URL expiration (time-sensitive)
  - File size limits and quota enforcement
  - S3 quota errors and retry logic
  - CORS configuration dependencies
  - Multipart upload complexity
  - Storage usage tracking
- Safe modification:
  - Test with large files (video uploads)
  - Test network failures mid-upload
  - Verify cleanup on upload errors
  - Test quota limit enforcement
- Test coverage: Integration tests exist (`tests/integration/api/`) but incomplete

**Industry Wizard Templates:**
- Files: `src/services/industryWizardService.js` (2797 lines of template definitions)
- Why fragile:
  - Massive hardcoded template definition objects (WIZARD_DEFINITIONS)
  - Tight coupling to scene design service
  - Template schema not validated
  - Hard to add new industries without code changes
- Safe modification:
  - Extract templates to JSON files
  - Add JSON schema validation
  - Test all template variants
  - Document template structure
- Test coverage: Unit test exists (`tests/unit/services/industryWizardService.test.js`)

**Data Source Sync & External APIs:**
- Files: `src/services/dataSourceService.js` (1286 lines)
- Why fragile:
  - Multiple external API integrations (Google Sheets, RSS feeds)
  - Polling logic with configurable intervals
  - Error recovery and retry strategies
  - API rate limiting
  - Data transformation and validation
- Safe modification:
  - Mock external APIs in tests
  - Test rate limiting behavior
  - Verify error handling for API failures
  - Test data validation edge cases
- Test coverage: Unit test exists (`tests/unit/services/dataSourceService.test.js`)

**Data Refresh Orchestrator (Recent Addition):**
- Files:
  - `src/player/hooks/useDataRefreshOrchestrator.js` - Central data refresh coordination
  - `src/player/hooks/useWidgetData.js` - Widget-specific data fetching
  - Recent migration from individual widget polling to centralized orchestrator
- Why fragile:
  - New architecture (phases 54-55) may have edge cases
  - Widget migration to orchestrator pattern ongoing
  - Cache invalidation timing critical
  - Multiple data sources with different refresh rates
- Safe modification:
  - Test with various refresh interval combinations
  - Verify cache doesn't grow stale
  - Test widget lifecycle (mount/unmount during refresh)
- Test coverage: Limited (new code)

## Scaling Limits

**Supabase Row Limits:**
- Current capacity: Unknown table row counts
- Limit: Postgres max rows per table ~billions, but query performance degrades significantly beyond millions
- Scaling path:
  - Implement pagination everywhere (some pages already paginated)
  - Add database indexes for common queries
  - Consider table partitioning for high-volume tables (activity_log, playback_tracking, security_events)
  - Archive old data periodically

**Supabase Real-time Connection Limits:**
- Current capacity: Unknown concurrent connections
- Limit: Supabase real-time has connection limits per plan (typically 100-500)
- Scaling path:
  - Optimize subscriptions (reduce scope, use filters)
  - Use polling for non-critical updates
  - Consider WebSocket pooling
  - Implement connection backoff for offline clients
  - Alternative: Pusher or custom WebSocket server

**Client-Side Bundle Size:**
- Current capacity: Manual chunks defined in vite.config.js, 600KB warning limit
- Limit: Large bundles slow initial page load, especially on mobile networks
- Scaling path:
  - More aggressive code splitting (already using React.lazy - good!)
  - Lazy load heavy features (svg-editor, polotno, fabric.js)
  - Optimize images and media
  - Tree-shake unused dependencies
  - Consider CDN for static assets

**localStorage Quota (5-10MB):**
- Current capacity: 5-10MB browser limit
- Limit: QuotaExceededError on large cached data
- Scaling path:
  - Use IndexedDB for large data (player already does - good!)
  - Implement storage monitoring and alerts
  - Clear old data automatically
  - Provide user controls for cache management

**Database Migration Complexity:**
- Current capacity: 139 migration files in `supabase/migrations/`
- Limit: Migration chain becomes hard to manage, slow to run on fresh installs
- Scaling path:
  - Periodic migration squashing (combine old migrations)
  - Document migration dependencies
  - Test migration rollback procedures
  - Consider schema snapshots

## Dependencies at Risk

**Fabric.js (v6.9.0):**
- Risk: Large bundle size (~500KB), performance overhead on complex canvases
- Impact: SVG editor (`FabricSvgEditor.jsx`), bundle size, canvas rendering performance
- Migration plan:
  - Consider lighter alternatives (Konva.js, Paper.js, or custom canvas solution)
  - Profile bundle impact
  - Lazy load only when needed

**Polotno (v2.33.2):**
- Risk: Proprietary dependency, potential licensing changes, limited control over features
- Impact: Scene editor core functionality, vendor lock-in
- Migration plan:
  - Abstract behind interface
  - Prepare fallback editor (Fabric or custom)
  - Monitor licensing terms

**React 19.1.1:**
- Risk: Bleeding edge React version (19.1.1 released recently), potential ecosystem incompatibility
- Impact: Third-party library incompatibilities, unstable APIs, community support
- Migration plan:
  - Monitor ecosystem adoption of React 19
  - Pin all dependencies to avoid breaking changes
  - Test thoroughly before upgrading
  - Consider downgrade to React 18 LTS if issues arise

**Supabase (v2.80.0):**
- Risk: Vendor lock-in, pricing changes, service limits, data sovereignty
- Impact: Core database, auth, storage, real-time features (entire application)
- Migration plan:
  - Abstract database layer behind repository pattern
  - Consider multi-cloud strategy (AWS RDS, Neon, etc.)
  - Maintain data export capabilities
  - Document Supabase-specific features for migration planning

**No State Management Library:**
- Risk: Complex state scattered across 557+ useState calls, no central store
- Impact: Difficult debugging, prop drilling, state synchronization bugs
- Migration plan:
  - Evaluate lightweight solutions (Zustand, Jotai, Valtio)
  - Start with global state (user, branding, feature flags)
  - Gradually migrate complex page hooks

## Missing Critical Features

**Type Safety:**
- Problem: No TypeScript, no runtime type validation, no prop types
- Blocks: Safe refactoring, confident API changes, IDE autocomplete, catching bugs at build time
- Priority: Medium - JSDoc provides some documentation but not enforced

**Error Boundaries:**
- Problem: Limited error boundary usage (ErrorBoundary.jsx exists but not widely used)
- Blocks: Graceful error handling, preventing full app crashes, error telemetry
- Priority: High - Single error can crash entire application

**Comprehensive Logging:**
- Problem: loggingService exists (`src/services/loggingService.js`) but console.* still used in 50 files
- Blocks: Production debugging, error tracking, user session replay, log aggregation
- Priority: Medium - Partially implemented, needs consistent adoption and ESLint enforcement

**Database Migration System:**
- Problem: 139 migration files exist in `supabase/migrations/` but no documented process
- Blocks: Safe database changes, rollback capability, team coordination, version control
- Priority: High - Database changes are risky without proper migration workflow
- Recommendation: Document migration process, test rollback procedures, version migrations

**API Rate Limiting:**
- Problem: rateLimitService likely exists but coverage unclear
- Blocks: API abuse protection, cost control, DoS prevention
- Priority: Medium - Verify implementation and coverage

**Monitoring & Alerting:**
- Problem: No visible monitoring for player health, data sync failures, cache issues
- Blocks: Proactive issue detection, SLA monitoring, incident response
- Priority: High - Especially for player offline sync and data refresh orchestrator

**Feature Flag Rollback:**
- Problem: Feature flags exist (`src/config/featureFlags.js`) but no documented rollback procedure
- Blocks: Safe feature rollouts, A/B testing, gradual releases
- Priority: Low - System exists, needs process documentation

## Test Coverage Gaps

**Unit Test Coverage at 0%:**
- What's not tested: Most services and components have no unit tests
- Files: `vitest.config.js` sets all coverage thresholds to 0%
- Risk: Regression bugs, unsafe refactoring, unclear component contracts
- Priority: High - Foundation for safe development

**Page Hooks Lack Tests:**
- What's not tested: Complex hooks in `src/pages/hooks/` containing critical business logic
- Files:
  - `src/pages/hooks/useMediaLibrary.js` (1068 lines, 18+ state variables, untested)
  - `src/pages/hooks/usePlaylistEditor.js` (1189 lines, 14+ state variables, untested)
  - `src/pages/hooks/useScreensData.js` (untested)
  - `src/pages/hooks/useCampaignEditor.js` (untested)
- Risk: State management bugs, race conditions, memory leaks, data loss
- Priority: High - These hooks contain critical business logic

**Service Layer Tests Incomplete:**
- What's not tested: Many services have partial or no test coverage
- Files: Some services have tests (`industryWizardService.test.js`, `dataSourceService.test.js`) but many don't
- Risk: API contract violations, data corruption, integration failures
- Priority: High - Services are core business logic

**Integration Tests Minimal:**
- What's not tested: Full user workflows, cross-service interactions, API integration
- Files: Only a few integration tests in `tests/integration/api/`
- Risk: Feature integration bugs, API contract violations, end-to-end failures
- Priority: Medium - E2E tests partially cover but slower feedback

**E2E Tests Cover Happy Paths Only:**
- What's not tested: Error conditions, edge cases, offline scenarios, network failures
- Files: Extensive E2E suite in `tests/e2e/` but focused on success cases
- Risk: Production bugs in error paths, poor user experience on failures
- Priority: Medium - Good coverage exists but needs expansion to failure scenarios

**Performance Testing:**
- What's not tested: Large dataset handling, concurrent users, memory usage over time
- Files: Load tests exist in `load-tests/` directory (auth-burst.js, heartbeat.js, media-library.js, playlist-resolution.js)
- Risk: Performance regressions, production slowdowns, memory leaks
- Priority: Low - Load test infrastructure exists, unclear if run regularly

**Player Offline Scenarios:**
- What's not tested: IndexedDB quota exceeded, sync conflict resolution, cache eviction
- Files: Player logic heavily relies on offline functionality
- Risk: Player failures in production, data sync issues, cache corruption
- Priority: High - Critical for player reliability

**Migration Testing:**
- What's not tested: Database migration rollback, data migration correctness
- Files: 139 migration files in `supabase/migrations/` but no visible migration tests
- Risk: Data loss, schema corruption, production downtime
- Priority: High - Migrations are destructive operations

---

*Concerns audit: 2026-02-13*
