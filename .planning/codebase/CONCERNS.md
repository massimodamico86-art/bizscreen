# Codebase Concerns

**Analysis Date:** 2026-02-05

## Tech Debt

**Large Service Files - Code Organization:**
- Issue: Multiple service files exceed 1000 lines, creating maintenance burden and difficulty navigating codebase
- Files:
  - `src/services/industryWizardService.js` - 2797 lines
  - `src/services/sceneDesignService.js` - 1598 lines
  - `src/services/alertEngineService.js` - 1286 lines
  - `src/services/dataSourceService.js` - 1285 lines
  - `src/services/mediaService.js` - 1242 lines
  - `src/services/scheduleService.js` - 1221 lines
- Impact: Difficult to maintain, test, and reason about. Increases onboarding time for new developers. Higher risk of merge conflicts.
- Fix approach: Split into smaller, focused modules using composition. Extract pure functions into utilities. Consider feature-based organization instead of large monolithic services.

**Large Component Files - UI Complexity:**
- Issue: Several components exceed 1000 lines with mixed concerns
- Files:
  - `src/components/svg-editor/FabricSvgEditor.jsx` - 2690 lines
  - `src/pages/PlaylistsPage.jsx` - 1324 lines
  - `src/pages/DataSourcesPage.jsx` - 1269 lines
  - `src/pages/AppsPage.jsx` - 1204 lines
  - `src/pages/hooks/usePlaylistEditor.js` - 1188 lines
  - `src/components/scene-editor/PropertiesPanel.jsx` - 1185 lines
  - `src/player/pages/ViewPage.jsx` - 1184 lines
- Impact: Components are difficult to test in isolation, harder to reason about state flow, and slow to render/re-render
- Fix approach: Extract sub-components, move business logic to custom hooks, separate presentational from container components

**Console Logging Migration Incomplete:**
- Issue: 161 console.log/warn/error calls remain across 47 files despite having `loggingService.js` with structured logging
- Files: `src/utils/errorTracking.jsx`, `src/config/env.js`, `src/services/loggingService.js`, `src/main.jsx`, and 43 other files
- Impact: Inconsistent logging makes production debugging difficult. Console statements are stripped in production build (Terser config), but this creates development/production parity issues. No correlation IDs for these logs.
- Fix approach: Systematic migration using eslint warning (already configured at line 55 of `eslint.config.js`). Replace with `createScopedLogger()` pattern. ESLint TODO at line 55: "Upgrade to error after console migration to loggingService"

**Deprecated Service Methods Not Removed:**
- Issue: Three deprecated methods in dashboardService remain in codebase with @deprecated tags
- Files: `src/services/dashboardService.js`
  - Line 69: `getDashboardStatsLegacy()` - deprecated, uses unbounded queries
  - Line 250: Legacy device health issues method
  - Line 338: Legacy alert summary method
- Impact: Dead code increases bundle size minimally, but more importantly creates confusion about which methods to use. Fallback pattern at line 38 suggests uncertainty about migration status.
- Fix approach: Verify migration 108 (`get_dashboard_stats` database function) is applied to all environments, remove fallback logic and deprecated methods

**ESLint Warning Debt:**
- Issue: Configuration at `eslint.config.js` has multiple TODO comments indicating temporary warning levels
- Files: `eslint.config.js`
  - Line 55: TODO to upgrade no-console to error
  - Line 65: TODO to upgrade unused-vars to error after cleanup sprint
  - Line 82: TODO to fix case-declarations, useless-catch, useless-escape
  - Line 89: TODO Phase 28-02 to fix no-undef warnings systematically
- Impact: Warnings are ignored, allowing technical debt to accumulate. 7807+ ESLint warnings reported in production gap analysis.
- Fix approach: Dedicated cleanup sprint to address warnings category by category. Set target: zero warnings or explicit permanent exemptions.

**Incomplete Error Handling Patterns:**
- Issue: 1342 instances of `return null`, `return {}`, or `return []` patterns across 283 files suggest incomplete error handling
- Files: Widespread across `src/services/`, `src/contexts/`, `src/hooks/`, `src/components/`
- Impact: Silent failures make debugging difficult. Users may see empty states without understanding why. Error boundaries won't catch these graceful failures.
- Fix approach: Audit each pattern to determine if it should throw error, return explicit error object, or use Result/Either pattern. Add error logging at minimum.

**Outdated Dependencies:**
- Issue: 29+ packages have available updates, including critical infrastructure packages
- Files: `package.json`
  - `@supabase/supabase-js`: 2.80.0 → 2.95.1 (15 minor versions behind)
  - `fabric`: 6.9.0 → 7.1.0 (major version available with tree-shaking improvements)
  - `react`: 19.2.0 → 19.2.4
  - `react-router-dom`: 7.9.5 → 7.13.0
  - `@aws-sdk/client-s3`: 3.946.0 → 3.983.0
  - `eslint-plugin-react-hooks`: 5.2.0 → 7.0.1 (major version behind)
- Impact: Missing bug fixes, security patches, and performance improvements. Supabase SDK gap particularly concerning for authentication reliability.
- Fix approach: Establish monthly dependency update schedule. Test in staging before production. Prioritize security and infrastructure packages.

**Polotno Editor Proprietary Dependency:**
- Issue: `polotno@2.33.2` is proprietary with unclear licensing terms and cost structure
- Files: `src/components/PolotnoEditor.jsx`, `src/pages/DesignEditorPage.jsx`, `src/pages/LayoutsPage.jsx`, `src/components/EditorModal.jsx`
- Impact: Cannot fork or modify. Licensing costs unknown. Update path unclear. Lock-in risk.
- Fix approach: Document licensing agreement and cost structure. Evaluate alternatives (Fabric.js editor could replace). Create abstraction layer to reduce coupling.

## Known Bugs

**E2E Test Failures:**
- Symptoms: 33% pass rate (382 passed, 460 failed, 321 skipped out of 1163 total tests)
- Files: 38 E2E test files in `tests/e2e/`
- Trigger: CI pipeline runs, local test execution
- Workaround: Tests have `.fixme()` markers for known failures
- Fix approach: Systematic review per test file. Many failures may be due to timing issues, selector changes, or test data setup. Quick wins: fix selector issues, add proper waits, stabilize test user creation.

**Plan Slug Column Does Not Exist:**
- Symptoms: Database query failures referencing non-existent `plan_slug` column
- Files: Documented in `.planning/quick/034-fix-e2e-406-errors/034-PLAN.md` line 85
- Trigger: Features attempting to query tenants table for plan information
- Workaround: None documented
- Fix approach: Either add migration to create `plan_slug` column or remove references to it from codebase. Audit queries for other missing column references.

## Security Considerations

**Sentry Error Tracking Disabled by Default:**
- Risk: Production errors are not captured, making debugging impossible without user reports
- Files: `.env.example` line 133 shows `VITE_ERROR_TRACKING_ENABLED=false`, `src/utils/errorTracking.jsx`
- Current mitigation: Error boundaries log locally, but don't persist
- Recommendations: Enable Sentry in production immediately. Configure DSN and ensure PII scrubbing is working (already implemented in beforeSend hook).

**Inline UUID Generation:**
- Risk: Player pairing uses inline UUID generator instead of cryptographically secure uuid package
- Files: Production gap analysis mentions `src/player/components/PairingScreen.jsx` line 23
- Current mitigation: None
- Recommendations: Replace with `uuid` package (already in dependencies at version 13.0.0). Use v4 for random UUIDs.

**S3 CORS Not Documented for Production:**
- Risk: CORS configuration exists only in `vite.config.js` (dev server), production S3 CORS must be configured separately
- Files: `vite.config.js`, AWS S3 bucket configuration (external)
- Current mitigation: May work if bucket policy is permissive, but not guaranteed
- Recommendations: Document required S3 CORS configuration in deployment guide. Include example CORS policy JSON for production bucket.

**Privacy and Cookie Policy Pages Missing:**
- Risk: GDPR compliance incomplete - cookie consent banner links to non-existent `/privacy` and `/cookies` routes
- Files: `src/components/compliance/CookieConsentBanner.jsx`
- Current mitigation: Links exist but lead to 404 pages
- Recommendations: Create legal pages with actual privacy policy and cookie policy content. Consult legal counsel for content. This is a blocker for production in EU markets.

**API Key Rotation Strategy Not Documented:**
- Risk: No documented procedure for rotating Supabase, AWS S3, Stripe, OpenWeather, or other API keys
- Files: `.env.example` shows multiple API keys, but no rotation documentation
- Current mitigation: None
- Recommendations: Document rotation procedure for each service. Include testing steps to verify new keys work before revoking old ones. Schedule annual rotation.

## Performance Bottlenecks

**Polotno Editor Loaded Eagerly:**
- Problem: Large Polotno editor bundle loaded on initial page load even when not needed
- Files: `src/components/PolotnoEditor.jsx`, `public/polotno-editor.js`
- Cause: No lazy loading or code splitting for editor component
- Improvement path: Use React.lazy() to load Polotno only when editor modal opens. Reduces initial bundle size significantly.

**Large Components Not Code-Split:**
- Problem: `FabricSvgEditor.jsx` (2690 lines) and other large components increase main bundle size
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`, `src/services/industryWizardService.js`
- Cause: No dynamic imports or route-level code splitting for heavy editor features
- Improvement path: Split Fabric.js editor into separate bundle loaded on demand. Consider extracting wizard definitions to JSON files loaded async.

**No Load Testing Results:**
- Problem: Performance characteristics under load unknown
- Files: `load-tests/` directory exists but results not documented
- Cause: Tests exist but haven't been run recently or results not captured
- Improvement path: Run k6 load tests, document baseline metrics, establish performance budget

**Fabric.js v6 vs v7:**
- Problem: Using Fabric.js 6.9.0, but v7.1.0 available with tree-shaking and performance improvements
- Files: `package.json`, `src/components/svg-editor/FabricSvgEditor.jsx`
- Cause: Major version upgrade requires testing and potential breaking changes
- Improvement path: Evaluate v7 migration effort. Test in branch. May reduce bundle size 20-30% with tree-shaking.

## Fragile Areas

**Player Offline Mode Cache Corruption Recovery:**
- Files: `src/player/offlineService.js`, `src/player/cacheService.js`
- Why fragile: IndexedDB cache has eviction logic but corruption recovery not fully tested. Player has 3-phase sync (prefetch, background, reconnect) but edge cases around quota exceeded not covered.
- Safe modification: Add comprehensive error handling around IndexedDB operations. Test quota exceeded scenarios. Add cache health check on startup.
- Test coverage: No specific E2E tests for cache corruption scenarios

**SVG Editor Undo/Redo:**
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`
- Why fragile: Complex state management with Fabric.js canvas state. Undo/redo mentioned in comments but implementation quality unknown.
- Safe modification: Add state history tests before modifying canvas operations. Ensure undo stack doesn't grow unbounded.
- Test coverage: SVG editor undo/redo not tested according to production gap analysis

**Session Timeout Handling:**
- Files: `src/services/sessionService.js`, `src/contexts/AuthContext.jsx`
- Why fragile: Session timeout improved but edge cases exist (production gap analysis line 303). Concurrent modification without optimistic locking.
- Safe modification: Add E2E tests for session expiry scenarios. Implement activity tracking to extend sessions appropriately.
- Test coverage: Gaps identified in production readiness analysis

**Custom React Hooks Without Tests:**
- Files: 23+ hooks across `src/hooks/`, `src/pages/hooks/`
- Why fragile: Complex state management in hooks like `usePlaylistEditor.js` (1188 lines), `useMediaLibrary.js` (1068 lines), `useCampaignEditor.js` with no unit tests
- Safe modification: Add react-testing-library tests before modifying hook logic. Mock Supabase calls consistently.
- Test coverage: Zero unit tests for custom hooks according to production gap analysis

**Multi-Tenant RLS Policies:**
- Files: 69 migration files in `supabase/migrations/` with 686 RLS policy occurrences
- Why fragile: RLS is critical security boundary. 137 tables with RLS enabled, 412 policies created. No automated regression tests.
- Safe modification: Never modify RLS policies without thorough testing in staging. Create RLS test suite that validates tenant isolation.
- Test coverage: No automated RLS policy tests according to production gap analysis

## Scaling Limits

**IndexedDB Storage Quota:**
- Current capacity: Browser-dependent (typically 50% of available disk space, but varies)
- Limit: Player cache can grow unbounded until quota exceeded. Event queue capped at 100 events (`src/player/offlineService.js`).
- Scaling path: Implement quota monitoring and user warnings. Add cache size limits per content type. Implement smart eviction beyond LRU.

**Unbounded Database Queries:**
- Current capacity: Deprecated methods fetch all records (getDashboardStatsLegacy fetches all screens, playlists, media)
- Limit: Will cause timeouts and memory issues as data grows beyond 10k+ records
- Scaling path: Ensure migration 108 applied to all environments. Remove deprecated fallbacks. Use database functions with proper indexing.

**Service Worker Registration:**
- Current capacity: Service worker handles offline mode but no documented limits
- Limit: Large caches can cause registration failures or slow startup
- Scaling path: Add cache size monitoring. Implement cache sharding by content type. Consider separate workers for different concerns.

## Dependencies at Risk

**Supabase SDK 15 Versions Behind:**
- Risk: Missing bug fixes and security patches in authentication layer
- Impact: Auth reliability issues, missing features, potential security vulnerabilities
- Migration plan: Update to 2.95.1, test authentication flows thoroughly in staging, check breaking changes in release notes

**eslint-plugin-react-hooks Major Version Behind:**
- Risk: 5.2.0 → 7.0.1 (major version jump), may have new rules that catch bugs
- Impact: Missing hook dependency warnings, potential infinite render loops undetected
- Migration plan: Update to v7, run linter, fix new warnings, verify no performance regressions

**Fabric.js v6 → v7:**
- Risk: Major version with breaking changes, but improvements in tree-shaking and performance
- Impact: Current bundle includes unused Fabric.js code. v7 may reduce bundle 20-30%
- Migration plan: Test in feature branch, review migration guide, update SVG editor tests

## Missing Critical Features

**No Staging Environment:**
- Problem: Production runbook shows "TODO" for staging URL and Supabase project (line 24-25 of `PRODUCTION_RUNBOOK.md`)
- Blocks: Cannot safely test migrations, configuration changes, or new features before production
- Fix approach: Create separate Supabase project for staging. Configure Vercel preview environment. Document URLs in runbook.

**No Remote Logging Endpoint:**
- Problem: `VITE_LOG_ENDPOINT` commented out in `.env.example`, structured logging service cannot send logs to aggregation service
- Blocks: Cannot debug production issues without access to user's browser. Log sampling at 10% in production means 90% of logs lost.
- Fix approach: Configure Supabase edge function or external logging service (Logtail, Datadog). Enable in production.

**No Web Vitals Analytics Endpoint:**
- Problem: `VITE_ANALYTICS_ENDPOINT` not configured, Web Vitals monitoring implemented but data not collected
- Blocks: Cannot track Core Web Vitals (LCP, FID, CLS) to identify performance regressions
- Fix approach: Set up analytics endpoint (Google Analytics, custom endpoint). Configure thresholds for alerting.

**No Health Check Database Connectivity:**
- Problem: `/api/health` endpoint is minimal, only returns `{ status: 'ok' }`, doesn't verify database connection
- Blocks: Uptime monitoring cannot detect database connectivity issues
- Fix approach: Enhance health check to query database (simple `SELECT 1`), check Supabase status, return service status breakdown

**API Documentation Missing:**
- Problem: No OpenAPI/Swagger documentation for public API endpoints
- Blocks: Third-party integrators cannot use public API, internal developers unsure of contracts
- Fix approach: Generate OpenAPI spec from JSDoc comments or manually create. Publish to /api-docs route.

## Test Coverage Gaps

**Zero Unit Tests in src/ Directory:**
- What's not tested: All service layer business logic, utility functions, helper methods
- Files: 0 unit tests for 283 files in `src/` directory. Tests exist only in `tests/` directory (119 test files).
- Risk: Refactoring breaks functionality silently. No regression detection for service layer changes.
- Priority: High - Add tests for critical services first: `authService.js`, `playerService.js`, `scheduleService.js`

**Critical Services Without Tests:**
- What's not tested: `authService.js`, `scheduleService.js`, `campaignService.js`, `mediaService.js`
- Files: Core business logic in services handling authentication, scheduling, campaigns, media management
- Risk: Changes to auth flow could break login. Schedule logic errors could cause content not to display. Campaign rotation bugs undetected.
- Priority: High - These services have complex logic and are critical to core functionality

**Custom React Hooks Untested:**
- What's not tested: 23+ custom hooks including `usePlaylistEditor.js`, `useMediaLibrary.js`, `useCampaignEditor.js`
- Files: `src/hooks/`, `src/pages/hooks/`
- Risk: Hook logic errors cause component misbehavior. State management bugs difficult to debug.
- Priority: High - Add react-testing-library tests for hooks with complex state management

**RLS Policy Regression Tests Missing:**
- What's not tested: 412 RLS policies across 69 migration files
- Files: `supabase/migrations/` - policies for tenant isolation, role-based access, row-level security
- Risk: Policy changes could expose data across tenants. Critical security boundary not validated.
- Priority: High - Create automated tests that verify tenant isolation, role permissions, data access rules

**E2E Test Coverage at 33%:**
- What's not tested: 460 failing tests, 321 skipped tests out of 1163 total
- Files: 38 E2E test files in `tests/e2e/`
- Risk: UI regressions not caught. User workflows broken without detection.
- Priority: Medium - Fix or skip failing tests to establish clean baseline. Target 60%+ pass rate.

**Player Offline Mode Edge Cases:**
- What's not tested: Cache corruption recovery, quota exceeded scenarios, IndexedDB failures
- Files: `src/player/offlineService.js`, `src/player/cacheService.js`
- Risk: Player stops working in offline mode without graceful degradation
- Priority: Medium - Add E2E tests for offline scenarios, cache corruption, quota limits

**OAuth Integration Tests Missing:**
- What's not tested: Google OAuth flow (TODO comment in `TESTING.md` line 335)
- Files: OAuth configuration and flows
- Risk: OAuth login could break without detection
- Priority: Low - Add when OAuth is configured in test environment

---

*Concerns audit: 2026-02-05*
