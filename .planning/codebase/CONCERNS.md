# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Unimplemented Features:**
- Issue: `createTemplateFromLayout()` in `src/services/layoutTemplateService.js` is a stub throwing "not yet implemented" error
- Files: `src/services/layoutTemplateService.js` (line 235)
- Impact: Users cannot convert layouts to reusable templates, blocking workflow efficiency
- Fix approach: Implement steps 1-4 (fetch layout, create template, generate thumbnail using Puppeteer/screenshot service, return template)

**Deprecated Functions Not Removed:**
- Issue: Dashboard service contains deprecated functions marked with @deprecated JSDoc but still exported
- Files: `src/services/dashboardService.js` (lines 65, 246, 334)
- Impact: Legacy code paths may be called; harder to track which functions are actually used
- Fix approach: Migrate all callers to database functions, then remove deprecated exports

**Incomplete Error Recovery in AuthContext:**
- Issue: Multiple catch blocks log errors but don't always provide user-facing feedback paths
- Files: `src/contexts/AuthContext.jsx` (lines 113-120, 162-169)
- Impact: Users may see blank screens on auth failures without clear error messaging
- Fix approach: Ensure all error paths set meaningful error messages to state

**TODO Comments in Production Code:**
- Issue: Live analytics TODO in performance tracking service
- Files: `src/legacy/utils/performance.js` (line 100)
- Impact: Performance metrics aren't sent to analytics; monitoring blind spot
- Fix approach: Implement analytics integration or remove TODO

---

## Known Bugs

**Console Logging in Production:**
- Symptoms: Excessive console.log/console.warn output in production affecting performance
- Files: 197+ instances across codebase, particularly `src/services/alertEngineService.js` (lines 62, 67, 71)
- Trigger: Any screen/player/app interaction logs to console
- Workaround: Open DevTools to see log output; use log levels to filter
- Fix: Implement proper logger with environment-aware output; replace console.* with logger.* throughout codebase

**Large Component Files with Multiple Concerns:**
- Symptoms: Page components increasingly difficult to maintain and test
- Files:
  - `src/pages/MediaLibraryPage.jsx` (2537 lines)
  - `src/pages/ScreensPage.jsx` (1929 lines)
  - `src/pages/PlaylistEditorPage.jsx` (1915 lines)
  - `src/pages/CampaignEditorPage.jsx` (1390 lines)
  - `src/pages/FeatureFlagsPage.jsx` (1337 lines)
- Trigger: Complex pages with multiple sub-features (search, filters, modals, dialogs)
- Impact: Hard to locate bugs; slow rendering on complex interactions; difficult testing
- Fix approach: Extract sub-components into dedicated files; move state management to custom hooks; consider container/presentational split

**innerHTML Mutation in SVG Editor:**
- Symptoms: Direct DOM manipulation bypasses React; potential race conditions
- Files: `src/components/svg-editor/LeftSidebar.jsx` (line 744)
- Trigger: User interaction with SVG alt text display
- Impact: React state can become out of sync with DOM; potential XSS if content not properly sanitized
- Fix: Use React state and refs instead of direct innerHTML

**Dangerous HTML in Help Center:**
- Symptoms: dangerouslySetInnerHTML used to render markdown with bold formatting
- Files: `src/pages/HelpCenterPage.jsx` (lines 289, 293)
- Trigger: Displaying help content with markdown formatting
- Impact: If help content comes from user input, XSS vulnerability; unclear sanitization strategy
- Workaround: Help content currently hardcoded (not user input)
- Fix: Use proper markdown-to-JSX library (react-markdown) instead of dangerouslySetInnerHTML

---

## Security Considerations

**Environment Variable Exposure:**
- Risk: AWS credentials and API keys are in vite.config.js and passed to browser
- Files: `vite.config.js` (lines 19-23), browser requests to `/api/media/presign`
- Current mitigation: Uses SECURITY DEFINER RPC functions, but server-side AWS credentials accessible via environment
- Recommendations:
  - Move all AWS operations to server-side only (Supabase Edge Functions or backend API)
  - Never send AWS credentials to browser
  - Use presigned URLs generated server-side only

**XSS Vulnerability in Help Content:**
- Risk: dangerouslySetInnerHTML with user-controlled markdown
- Files: `src/pages/HelpCenterPage.jsx` (lines 289, 293)
- Current mitigation: Content currently hardcoded (not dynamic), but pattern allows future vulnerabilities
- Recommendations:
  - Replace dangerouslySetInnerHTML with safe markdown library
  - Validate all HTML content; use DOMPurify if necessary
  - Avoid pattern of string replace for HTML generation

**localStorage/sessionStorage Security:**
- Risk: 148+ uses of browser storage for potentially sensitive data (auth tokens, cache, device configs)
- Files: Multiple across src/ - particularly Player.jsx, playerService.js
- Current mitigation: Checked for specific patterns; no obvious secrets stored
- Recommendations:
  - Audit all localStorage/sessionStorage usage for sensitive data
  - Use only for non-sensitive client state (UI preferences, cache)
  - Consider using secure cookie flags for sensitive data

**API Route Security in Development:**
- Risk: `/api/media/presign` endpoint in vite.config.js available during dev; could leak credentials
- Files: `vite.config.js` (lines 54-118)
- Current mitigation: Only runs during vite dev server
- Recommendations:
  - Add request validation (rate limiting, origin checks)
  - Add authentication check before presigned URL generation
  - Log all presign requests for audit

---

## Performance Bottlenecks

**Large Player.jsx Component:**
- Problem: 3476-line component handling playlist playback, app rendering, offline sync, analytics
- Files: `src/Player.jsx`
- Cause: Multiple features (playlist playback, scene rendering, app hosting, offline mode, tracking) bundled together
- Improvement path:
  - Extract app rendering logic to separate PlayerAppHost component
  - Extract offline sync to custom hook (useOfflineSync)
  - Extract analytics to custom hook (usePlayerAnalytics)
  - Extract scene/slide rendering to separate SceneRenderer component

**Excessive useEffect Dependencies:**
- Problem: Multiple useEffect hooks in Player.jsx and page components with large dependency arrays; potential infinite loops
- Files: `src/Player.jsx`, `src/pages/*.jsx`, `src/contexts/*.jsx`
- Cause: Complex state relationships; unclear effect dependencies
- Improvement path:
  - Use React DevTools Profiler to identify unnecessary re-renders
  - Consolidate related effects; use useCallback for stable function references
  - Consider state management solution (Context + useReducer, Zustand, etc.)

**No Query Pagination on Supabase:**
- Problem: Some services fetch all records without limit, then filter client-side
- Files: Query patterns in multiple services, though recent commits show pagination implementation
- Cause: Historical code; newer pagination work in progress (US-007 through US-011)
- Impact: Large datasets load entire table into memory; network waste
- Improvement path: Ensure all list queries use `.range()` with server-side pagination; complete ongoing pagination work

**Console Logging Overhead:**
- Problem: 197+ console.log calls evaluated even when output not used
- Files: Throughout src/, particularly service layers
- Cause: Debug logging left in code; no environment-aware logger
- Impact: Small but measurable CPU cost in production; polluted DevTools
- Improvement path: Replace with structured logger that respects environment (dev/prod, log levels)

**Unoptimized Asset Loading:**
- Problem: Vite chunk size warning limit set to 600KB; large pages hitting or near limit
- Files: `vite.config.js` (line 145)
- Cause: Complex UI components bundled without granular code splitting
- Impact: Initial page load slow; LCP (Largest Contentful Paint) degraded
- Improvement path:
  - Add route-level code splitting with React.lazy()
  - Split large pages (MediaLibraryPage, etc.) into smaller chunks
  - Profile with Lighthouse to identify blocking resources

---

## Fragile Areas

**Player Offline Mode and Sync:**
- Files: `src/Player.jsx`, `src/services/playerService.js`, `src/services/mediaPreloader.js`, `src/player/offlineService.js`
- Why fragile:
  - Multiple cache layers (IndexedDB, memory, sessionStorage)
  - Offline detection using polling + connection events (race conditions possible)
  - Service worker registration may fail; no fallback
  - Content hash validation could fail if media changes mid-sync
- Safe modification:
  - Add integration tests for offline/online transitions
  - Test with throttled network and manual offline toggle
  - Document cache invalidation strategy clearly
  - Add telemetry to track cache hit/miss rates

**Data Binding Resolution System:**
- Files: `src/services/dataBindingResolver.js` (1535 lines), `src/services/dataSourceService.js` (1282 lines)
- Why fragile:
  - Complex recursive binding resolution across scenes
  - Data source subscriptions may leak if not properly unsubscribed
  - Circular dependencies between scenes not detected
  - Error handling sparse; failed bindings silently fall back
- Test coverage: Gaps in error scenarios and circular dependency handling
- Safe modification:
  - Add cycle detection before evaluating bindings
  - Add exhaustive error handling; log binding failures
  - Profile memory leaks on long-running player sessions
  - Document binding resolution algorithm clearly

**Schedule Engine:**
- Files: `src/services/scheduleService.js` (970 lines)
- Why fragile:
  - Timezone handling complex; potential off-by-one on schedule boundaries
  - No validation that schedule rules are mutually exclusive
  - Edge case: daylight saving time transitions
  - Filler content fallback not well tested
- Test coverage: Missing DST transition tests; no validation of conflicting rules
- Safe modification:
  - Add extensive unit tests for timezone edge cases
  - Add end-to-end tests with DST dates
  - Validate schedule rules during creation (no overlaps)
  - Add debug output showing resolved schedule

**Scene Design Service:**
- Files: `src/services/sceneDesignService.js` (1535 lines)
- Why fragile:
  - Animation keyframe generation with complex math for transforms
  - No validation that element positions stay within bounds
  - Performance metrics accumulated in memory (never cleared)
  - Text overflow handling heuristics may fail on edge cases
- Test coverage: Missing animation normalization edge case tests
- Safe modification:
  - Profile animation performance on low-end devices
  - Add bounds checking during element transformation
  - Implement circular buffer for performance metrics
  - Add visual regression tests for animation output

**Alert Engine System:**
- Files: `src/services/alertEngineService.js` (1293 lines)
- Why fragile:
  - Rate limiting rules complex; coalescing logic error-prone
  - Memory counters accumulate forever (potential leak)
  - No circuit breaker if alert processing falls behind
  - Error handling generic; hard to debug specific alert failures
- Test coverage: Missing load tests for alert burst scenarios
- Safe modification:
  - Implement proper metrics collection (clear counters periodically)
  - Add circuit breaker pattern for alert processing
  - Log alert failures with full context (attempt count, reason)
  - Load test with spike in alerts (US-009+)

---

## Scaling Limits

**Storage Usage Tracking:**
- Current capacity: Basic usage tracking on media_assets table
- Limit: No soft/hard limits enforced at application level; only plan limits
- Scaling path:
  - Implement real-time storage quota enforcement
  - Add background job to recalculate storage (cleanup unused/orphaned assets)
  - Consider implementing tiered storage (S3 Standard → Glacier)
  - Add warning at 80%, blocking at 100%

**Player Command Polling:**
- Current capacity: Polls every 10 seconds per device
- Limit: Linear scaling with number of active screens; no batching
- Scaling path:
  - Consider WebSocket subscriptions instead of polling (Supabase real-time)
  - Batch command checks (reduce to poll every 30-60 seconds)
  - Implement command queue to avoid missed updates

**Media Preloading Cache:**
- Current capacity: In-memory cache + IndexedDB (up to quota limit)
- Limit: Unbounded growth; no eviction policy
- Scaling path:
  - Implement LRU eviction for in-memory cache
  - Set IndexedDB quota limits; implement cleanup
  - Profile memory usage on 1000-slide playlists

**Concurrent Editor Sessions:**
- Current capacity: No session locking or conflict detection
- Limit: Multiple users editing same resource → last write wins
- Scaling path:
  - Implement optimistic locking (version counters)
  - Add session awareness; notify of conflicts
  - Consider operational transform for real-time collab (future)

---

## Dependencies at Risk

**Deprecated API Versions:**
- Risk: Multiple API routes reference old versions; deprecation dates passing
- Files: `src/services/apiVersionService.js`
- Impact: Old versions will return deprecation warnings; clients may break
- Migration plan:
  - Audit all API consumers
  - Set firm sunset dates for deprecated versions
  - Provide migration guide to latest version

**Polotno (SVG Editor) Bundle:**
- Risk: Large library (added custom build in scripts/polotno-build)
- Files: `vite.config.js` (line 148), `/scripts/polotno-build`
- Impact: Significant bundle size; custom build may diverge from upstream
- Migration plan:
  - Monitor Polotno for security updates
  - Test custom build regularly
  - Consider alternative: Fabric.js (already used elsewhere), Konva.js

**Stripe Integration:**
- Risk: Billing service integrated but incomplete (billing service checks TBD)
- Files: `src/services/billingService.js`, dependency: `stripe@^20.0.0`
- Impact: Charge/refund operations could fail silently
- Migration plan:
  - Implement comprehensive Stripe webhook validation
  - Add idempotency checks (prevent double-charge)
  - Test refund/charge flows in staging

**Supabase Real-time Subscriptions:**
- Risk: Multiple subscriptions created; no unified cleanup strategy
- Files: `src/services/realtimeService.js`, consumed by `src/Player.jsx` and many pages
- Impact: Memory leaks if subscriptions not properly unsubscribed
- Migration plan:
  - Centralize subscription cleanup in useEffect return functions
  - Add subscription lifecycle logging
  - Profile for memory leaks on long sessions

---

## Missing Critical Features

**No Authentication Rate Limiting:**
- Problem: Auth endpoints (login, signup, password reset) have no rate limiting
- Blocks: Brute force protection
- Implementation: Add rate limiting middleware at auth layer (Supabase RLS or edge function)

**No Audit Trail for Sensitive Operations:**
- Problem: Delete operations, permission changes not logged
- Blocks: Compliance audits; incident investigation
- Implementation: Add trigger-based audit logging to Supabase; consider dedicated audit service

**No Graceful Degradation for Missing Features:**
- Problem: Feature flags checked everywhere; errors if flag service down
- Blocks: Reliable feature rollouts
- Implementation: Add fallback values; cache feature flags locally

**No Canary Deployment Support:**
- Problem: Feature flags exist but no A/B testing infrastructure
- Blocks: Safe rollouts of new features
- Implementation: Add user cohort targeting to feature flags

---

## Test Coverage Gaps

**Offline Synchronization:**
- What's not tested: Transition from offline to online with pending changes; state consistency after reconnection
- Files: `src/services/playerService.js`, `src/Player.jsx` (offline cache logic)
- Risk: Users lose data or see stale content after connection restored
- Priority: HIGH - Core user experience

**Schedule Edge Cases:**
- What's not tested: Daylight saving time transitions; schedule boundaries at midnight; leap second handling
- Files: `src/services/scheduleService.js`
- Risk: Screens show wrong content during DST transition
- Priority: HIGH - Time-critical feature

**Large Paginated Lists:**
- What's not tested: Pagination edge cases (empty pages, single item, offset > total)
- Files: `src/pages/MediaLibraryPage.jsx`, `src/pages/PlaylistsPage.jsx`, `src/pages/TemplatesPage.jsx`, `src/pages/ScreensPage.jsx`, `src/pages/ScheduleEditorPage.jsx`
- Risk: UI crashes on edge cases; confusing pagination state
- Priority: MEDIUM - Affects multiple pages (ongoing US-007 to US-011)

**Error Recovery in Services:**
- What's not tested: Network failure recovery; partial response handling; timeout scenarios
- Files: Multiple services using Supabase API
- Risk: Services hang or return incomplete data on network issues
- Priority: MEDIUM - Production reliability

**Data Binding with Circular References:**
- What's not tested: Circular dependencies between data sources; recursive binding loops
- Files: `src/services/dataBindingResolver.js`
- Risk: Memory exhaustion; infinite loops; unresponsive player
- Priority: MEDIUM - Advanced feature edge case

**Concurrent Scene Updates:**
- What's not tested: Multiple rapid updates to same scene from different tabs
- Files: `src/services/sceneService.js`, `src/services/deviceSyncService.js`
- Risk: Last-write-wins; data loss
- Priority: LOW - Rare but catastrophic

---

*Concerns audit: 2026-01-22*
