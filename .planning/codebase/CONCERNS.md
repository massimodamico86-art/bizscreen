# Codebase Concerns

**Analysis Date:** 2026-01-29

## Tech Debt

**Missing Import Crisis (Recently Resolved)**
- Issue: Widespread pattern of missing imports for lucide-react icons and design-system components across 50+ files
- Files: Multiple rounds of fixes documented in `.planning/debug/resolved/console-errors-v4.md` and `.planning/debug/resolved/comprehensive-import-fix.md`
- Impact: Runtime errors, app crashes on initial load, failed E2E tests
- Fix approach: Systematic scan completed, but vigilance needed to prevent regression. Consider adding ESLint rule to enforce import declarations for commonly used icons.

**Large Service Files (Complexity)**
- Issue: Several service files exceed 1000+ lines, indicating high complexity and maintenance burden
- Files: `src/services/industryWizardService.js` (2797 lines), `src/services/sceneDesignService.js` (1598 lines), `src/services/alertEngineService.js` (1286 lines), `src/services/dataSourceService.js` (1285 lines), `src/services/mediaService.js` (1242 lines), `src/services/scheduleService.js` (1221 lines)
- Impact: Difficult to test, high cognitive load for modifications, increased merge conflict risk
- Fix approach: Extract logical submodules (e.g., split `industryWizardService.js` into per-industry modules, split `dataSourceService.js` into CRUD operations vs. sync logic)

**Large Component Files (Complexity)**
- Issue: Multiple components exceed 1000+ lines with complex state management
- Files: `src/components/svg-editor/FabricSvgEditor.jsx` (2668 lines), `src/pages/PlaylistsPage.jsx` (1323 lines), `src/pages/DataSourcesPage.jsx` (1250 lines), `src/pages/AppsPage.jsx` (1195 lines), `src/pages/PlaylistEditorPage.jsx` (1188 via hook), `src/pages/LayoutEditorPage.jsx` (1152 lines), `src/pages/ScheduleEditorPage.jsx` (1138 lines), `src/App.jsx` (1115 lines)
- Impact: Poor component reusability, difficult debugging, slow hot-reload during development
- Fix approach: Extract subcomponents, move business logic to custom hooks, consider splitting into feature-based modules

**Deprecated Service Methods**
- Issue: Dashboard service has deprecated methods still in codebase
- Files: `src/services/dashboardService.js` lines 69, 250, 338
- Impact: Methods marked `@deprecated` with migration guidance to use database functions instead (get_dashboard_stats, get_device_health_issues, get_alert_summary)
- Fix approach: Search codebase for usage of deprecated methods, migrate callers to new database functions, remove deprecated code

**Legacy Code Directory**
- Issue: Entire `src/legacy/` directory contains unused code kept for reference only
- Files: `src/legacy/` containing pages, components, hooks, data, utils
- Impact: Increases bundle size analysis noise, confuses new developers, potential for accidental imports
- Fix approach: Safe to delete per `src/legacy/README.md`. Create archive branch if historical reference needed, then remove from main.

**Excessive setTimeout/setInterval Usage**
- Issue: 160 occurrences of setTimeout/setInterval across 110 files
- Files: Throughout `src/player/`, `src/hooks/`, `src/services/`, `src/components/`
- Impact: Risk of memory leaks, difficult to test, cleanup often missed in useEffect
- Fix approach: Audit for missing cleanup functions, consider custom hooks (useTimeout, useInterval) with automatic cleanup

**Console Statement Proliferation**
- Issue: 150 console.log/warn/error calls across 46 files despite logging service
- Files: Widespread in services, pages, components (see Grep results)
- Impact: Inconsistent logging, debug statements leak to production (mitigated by terser drop_console in build)
- Fix approach: Migrate all console.* calls to `loggingService` for consistent structured logging

**Window/Document Direct Access in Services**
- Issue: 127 occurrences of window./document. in service layer files
- Files: 32 service files including `src/services/playerService.js`, `src/services/canvaService.js`, `src/services/tenantService.js`
- Impact: Services not testable in Node.js environment, SSR incompatible, tight coupling to browser APIs
- Fix approach: Abstract browser APIs behind adapters, inject window/document dependencies, or move logic to components

**Heavy useEffect Dependencies**
- Issue: 320 return null/return []/return {} patterns suggesting incomplete implementations
- Files: Throughout codebase in services and components
- Impact: Potential bugs from fallback returns, incomplete error handling
- Fix approach: Review each occurrence for proper error handling and complete implementation

**No Unit Tests in src/**
- Issue: Zero unit test files found in src/ directory (only E2E tests exist in tests/e2e/)
- Files: No `*.test.js` or `*.spec.js` files in src/
- Impact: Regression risk when modifying services/utilities, difficult to refactor with confidence
- Fix approach: Add Vitest unit tests for critical services (authService, alertEngineService, dataSourceService, scheduleService). Start with pure functions and gradually increase coverage.

## Known Bugs

**Skipped E2E Test Suites**
- Symptoms: Multiple E2E test suites and individual tests marked with .skip
- Files: `tests/e2e/admin.spec.js` (8 skipped tests), `tests/e2e/usage.spec.js` (2 entire describe blocks), `tests/e2e/industry-wizards.spec.js` (9 skipped tests)
- Trigger: Tests skipped due to missing test credentials or implementation not complete
- Workaround: Tests will run when proper environment variables set (TEST_SUPERADMIN_EMAIL, TEST_RESELLER_EMAIL) or features completed
- Fix approach: Document required env vars in CI/CD setup, complete unfinished wizard features, review why admin tests require skip

**Player Pairing UUID Generation**
- Symptoms: Client-side UUID generation in pairing screen
- Files: `src/player/components/PairingScreen.jsx` line 23 uses inline UUID generator
- Trigger: Device pairing flow
- Impact: Weak UUID implementation (not cryptographically secure), potential collision risk
- Fix approach: Use uuid package (already in dependencies) instead of custom regex implementation

## Security Considerations

**Environment Variable Exposure**
- Risk: Client-side environment variables exposed in browser bundle
- Files: `src/supabase.js`, `src/config/env.js`, 30+ files accessing `import.meta.env.VITE_*`
- Current mitigation: Supabase URL/anon key are intended to be public per Supabase architecture, RLS policies protect data
- Recommendations: Audit that no secret keys (AWS, Stripe secret, Anthropic) are prefixed with VITE_. Document which env vars are safe to expose. Consider security audit of RLS policies.

**LocalStorage/SessionStorage Usage**
- Risk: 113 occurrences of localStorage/sessionStorage access across 27 files
- Files: Concentrated in `src/player/`, `src/services/sessionService.js`, `src/services/tenantService.js`, `src/TV.jsx`
- Current mitigation: Supabase auth handles session persistence
- Recommendations: Review for sensitive data storage (tokens, API keys). Ensure PII not stored in plain text. Consider encryption for sensitive player settings.

**No TypeScript Type Safety**
- Risk: Zero TypeScript files in codebase (all .js/.jsx)
- Files: 625 JavaScript files with no type checking
- Impact: Runtime type errors not caught at build time, difficult API contracts
- Recommendations: Gradual TypeScript migration starting with service layer, use JSDoc type annotations as interim solution

**CORS and S3 Upload Security**
- Risk: Presigned URL generation in dev server exposes AWS credentials
- Files: `vite.config.js` lines 17-24 reads AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from environment
- Current mitigation: Only used in development, production should use serverless function
- Recommendations: Document production deployment architecture. Ensure AWS credentials never exposed to client. Add validation that presigned URLs expire in 15 minutes.

**Row Level Security (RLS)**
- Risk: Database security entirely depends on RLS policies being correct
- Files: 130 migration files in `supabase/migrations/`, RLS setup in `001_initial_schema.sql` and `002_fix_rls_and_roles.sql`
- Current mitigation: RLS enabled on all tables
- Recommendations: Regular security audits of RLS policies, automated testing of access controls, consider adding policy regression tests

## Performance Bottlenecks

**Large Bundle Size**
- Problem: Manual chunks configured but many large page components
- Files: `vite.config.js` configures manual chunks, but pages like `src/App.jsx`, `src/components/svg-editor/FabricSvgEditor.jsx`, `src/services/industryWizardService.js` are still large
- Cause: All pages lazy-loaded but individual page/component sizes still large
- Improvement path: Further code-splitting within large pages, dynamic imports for heavy libraries (Fabric.js, Polotno), route-based chunking already in place

**Heavy Dependencies**
- Problem: node_modules is 683MB
- Files: `package.json` includes heavy packages: fabric (v6.9.0 → v7.1.0 available), polotno (v2.33.2), @sentry/react, framer-motion
- Cause: Design editor features require Fabric.js and Polotno (large canvas libraries)
- Improvement path: Consider lazy-loading Polotno only when editor opened, tree-shaking review, update to Fabric v7 which may have better tree-shaking

**Outdated Dependencies (Security & Performance)**
- Problem: 19+ outdated packages including major version jumps
- Files: `package.json` shows AWS SDK (3.946.0 → 3.978.0), Supabase (2.80.0 → 2.93.3), Playwright (1.57.0 → 1.58.0), React hooks plugin (5.2.0 → 7.0.1), Fabric (6.9.0 → 7.1.0 major)
- Cause: Dependencies not regularly updated
- Improvement path: Regular dependency updates (monthly), test suite provides safety net, review Fabric v7 breaking changes before upgrade

**Offline Service Complexity**
- Problem: IndexedDB caching with complex sync logic
- Files: `src/player/offlineService.js`, `src/player/cacheService.js`
- Cause: Three-phase sync (prefetch, background, reconnect) with blob-to-base64 conversions
- Improvement path: Performance metrics tracked in `alertEngineService.js` (300ms slow threshold). Consider Web Workers for blob processing, monitor cache size growth.

**Timer-Based Polling**
- Problem: Multiple services use setInterval for polling
- Files: Player heartbeat (30s), data feed scheduler, alert engine, social feed sync
- Cause: Real-time updates needed but implemented via polling
- Improvement path: Already using Supabase realtime subscriptions in some areas (`src/services/realtimeService.js`). Migrate more features to realtime subscriptions to reduce polling load.

## Fragile Areas

**Player Content Resolution**
- Files: `src/player/hooks/usePlayerContent.js`, `src/player/pages/ViewPage.jsx` (1184 lines), `src/services/playerService.js`
- Why fragile: Complex offline/online mode switching, retry logic with exponential backoff, cache invalidation
- Safe modification: Always test with network throttling, verify offline mode works, check cache invalidation logic
- Test coverage: E2E tests exist but no unit tests for retry/cache logic

**Authentication Flow**
- Files: `src/contexts/AuthContext.jsx`, `src/services/authService.js`, `src/auth/AuthCallbackPage.jsx`, `src/supabase.js`
- Why fragile: Recent fix history shows multiple import issues, PKCE flow configuration, session persistence
- Safe modification: Always test login/logout/password-reset flows, verify session timeout doesn't log out active users (fixed in recent commit)
- Test coverage: E2E auth tests exist (`tests/e2e/auth.spec.js`)

**Campaign Scheduling System**
- Files: `src/services/scheduleService.js` (1221 lines), `src/services/campaignService.js`, `src/pages/ScheduleEditorPage.jsx` (1138 lines)
- Why fragile: Complex date/time logic, timezone handling, conflict detection, rotation modes
- Safe modification: Extensive validation functions exist (throw errors on invalid state). Review validation before changing schedule logic.
- Test coverage: Schedules E2E tests exist (`tests/e2e/schedules.spec.js`)

**Data Source Sync**
- Files: `src/services/dataSourceService.js` (1285 lines), `src/services/dataFeedScheduler.js`, `src/pages/DataSourcesPage.jsx` (1250 lines)
- Why fragile: Google Sheets integration, external API failures, sync timing, data transformation
- Safe modification: Error handling exists but external API reliability varies. Always handle API errors gracefully.
- Test coverage: No specific data source E2E tests found

**SVG/Fabric Editor**
- Files: `src/components/svg-editor/FabricSvgEditor.jsx` (2668 lines), `src/services/svgTemplateService.js`, `src/services/svgAnalyzerService.js`
- Why fragile: Complex Fabric.js canvas state management, undo/redo history, JSON serialization, Google Fonts loading
- Safe modification: Fabric.js version upgrade from v6 to v7 will likely break things. Test thoroughly with undo/redo, save/load, Google Fonts rendering.
- Test coverage: SVG editor E2E tests needed

**Onboarding Flow**
- Files: `src/components/onboarding/` directory, `src/services/onboardingService.js`, `src/hooks/useUnifiedOnboarding.js`
- Why fragile: Recent fix history shows repeated import issues, multiple onboarding modals (AutoBuild, IndustrySelection, StarterPack, WelcomeTour)
- Safe modification: Verify all onboarding modals render without errors, test first-time user experience
- Test coverage: Onboarding E2E tests exist (`tests/e2e/onboarding.spec.js`)

## Scaling Limits

**Database Migrations (130 files)**
- Current capacity: 130 migration files in `supabase/migrations/`
- Limit: Supabase migration ordering and naming convention becomes unwieldy
- Scaling path: Consider migration squashing after major versions, use numbered prefixes (001_, 002_) for better ordering

**IndexedDB Cache Storage**
- Current capacity: Browser-dependent (typically 50MB-500MB per origin)
- Limit: Player offline cache can hit quota for media-heavy playlists
- Scaling path: Implement cache eviction policy (LRU), track cache size in `src/player/cacheService.js` (getCacheSize function exists), warn users when approaching quota

**Service Worker Scope**
- Current capacity: Single service worker registered at root scope
- Limit: Player and admin app share same service worker
- Scaling path: Consider separate service workers for /player/* and /admin/* routes, or app-shell architecture

**Event Queue for Offline Sync**
- Current capacity: 100 events before forced sync (MAX_QUEUE_SIZE in `src/player/offlineService.js`)
- Limit: Long offline periods or high-frequency events could exceed queue
- Scaling path: Implement batch compression for similar events, increase queue size with performance testing

## Dependencies at Risk

**Fabric.js Major Version Available (v6 → v7)**
- Risk: Breaking changes in v7.x release
- Impact: SVG editor will require code changes (2668-line component depends on it)
- Migration plan: Review v7 changelog, test editor functionality thoroughly, update FabricSvgEditor.jsx, allocate 2-3 days for testing

**Polotno Editor (Proprietary Dependency)**
- Risk: Proprietary library with potential licensing costs, limited to specific version
- Impact: Layout editor core functionality depends on it
- Migration plan: Evaluate alternatives (Fabric.js-only solution, open-source canvas editor). Document licensing terms.

**React 19 (Recently Upgraded)**
- Risk: Bleeding edge React version (19.1.1) - ecosystem may lag
- Impact: Some libraries may not be compatible yet
- Migration plan: Monitor for compatibility issues, consider downgrading to React 18 LTS if ecosystem compatibility problems arise

**React Router v7 (Recently Upgraded)**
- Risk: Major version jump from v6 to v7 (7.9.5 in package.json)
- Impact: Routing throughout app, lazy loading, navigation
- Migration plan: Already migrated. Monitor for issues with lazy-loaded routes.

## Missing Critical Features

**Production Error Tracking**
- Problem: Sentry configured but may not be enabled in production
- Blocks: Debugging production issues, identifying user-facing errors
- Files: `src/utils/errorTracking.jsx`, `.env.example` has VITE_ERROR_TRACKING_ENABLED=false
- Priority: High - Essential for production monitoring

**Production Analytics**
- Problem: Web Vitals service exists but no clear analytics endpoint
- Blocks: Understanding user experience, performance monitoring
- Files: `src/services/webVitalsService.js`, `.env.example` has VITE_ANALYTICS_ENDPOINT commented
- Priority: Medium - Important for performance optimization

**AI Auto-Tagging (Incomplete)**
- Problem: Anthropic API key required for SVG template auto-tagging, falls back to rule-based
- Blocks: High-quality template tagging and search
- Files: `src/services/autoTaggingService.js`, `.env.example` ANTHROPIC_API_KEY
- Priority: Low - Graceful degradation exists

**Email Notifications (Configuration Required)**
- Problem: Resend API configured but requires domain verification for production
- Blocks: Production alert notifications, user emails
- Files: `src/services/notificationDispatcherService.js`, `.env.example` VITE_RESEND_API_KEY
- Priority: High - Critical for alert system to function

## Test Coverage Gaps

**No Unit Tests for Services**
- What's not tested: Core business logic in 106 service files
- Files: All files in `src/services/` lack corresponding `.test.js` files
- Risk: Service refactoring breaks functionality without warning
- Priority: High - Start with `authService.js`, `scheduleService.js`, `campaignService.js`

**No Tests for Hooks**
- What's not tested: Custom React hooks (useMediaLibrary, usePlaylistEditor, useCampaignEditor, etc.)
- Files: `src/hooks/`, `src/pages/hooks/`
- Risk: Hook logic bugs only caught in E2E tests
- Priority: Medium - Testing-library/react-hooks can test in isolation

**Player Offline Mode Testing**
- What's not tested: Offline sync, cache invalidation, reconnection logic
- Files: `src/player/offlineService.js`, `src/player/cacheService.js`, `src/player/hooks/usePlayerContent.js`
- Risk: Offline mode breaks unnoticed, cache corruption
- Priority: High - Critical player functionality

**SVG Editor Undo/Redo Testing**
- What's not tested: Fabric.js history management, state serialization
- Files: `src/components/svg-editor/FabricSvgEditor.jsx` lines 82-84 (history state)
- Risk: Data loss from undo/redo bugs
- Priority: Medium - Manual testing currently required

**RLS Policy Testing**
- What's not tested: Row Level Security policies enforce correct access control
- Files: 130 migration files with RLS policies
- Risk: Security breach from incorrect RLS policy
- Priority: High - Automated RLS tests needed for tenant isolation

**Import Statement Regression**
- What's not tested: Build-time verification that all imports are present
- Files: Recent fixes show systematic missing imports across 50+ files
- Risk: Future commits introduce similar missing import errors
- Priority: Medium - Add ESLint plugin or custom lint rule to enforce imports

---

*Concerns audit: 2026-01-29*
