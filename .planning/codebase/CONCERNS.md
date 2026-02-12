# Codebase Concerns

**Analysis Date:** 2026-02-12

## Tech Debt

**Extremely Large Component Files:**
- Issue: Several components exceed 1000-3000 lines, making them difficult to maintain and test
- Files:
  - `src/components/svg-editor/FabricSvgEditor.jsx` (2997 lines)
  - `src/services/industryWizardService.js` (2797 lines)
  - `src/services/sceneDesignService.js` (1599 lines)
  - `src/components/media/YodeckAddMediaModal.jsx` (1547 lines)
  - `src/pages/PlaylistsPage.jsx` (1324 lines)
  - `src/pages/DataSourcesPage.jsx` (1323 lines)
  - `src/services/dataSourceService.js` (1286 lines)
  - `src/services/alertEngineService.js` (1286 lines)
  - `src/components/scene-editor/PropertiesPanel.jsx` (1251 lines)
  - `src/services/mediaService.js` (1242 lines)
  - `src/services/scheduleService.js` (1221 lines)
- Impact: High cognitive load, difficult code reviews, merge conflicts, harder to identify bugs
- Fix approach: Split into smaller focused components/services, extract reusable utilities, apply single responsibility principle

**Excessive useState Usage:**
- Issue: 557 instances of `useState` across 164 files, many with complex state objects
- Files: Particularly problematic in:
  - `src/pages/hooks/useMediaLibrary.js` (18+ state variables)
  - `src/pages/hooks/useScreensData.js` (19+ state variables)
  - `src/pages/hooks/usePlaylistEditor.js` (14+ state variables)
  - `src/pages/hooks/useCampaignEditor.js` (10+ state variables)
  - `src/components/svg-editor/FabricSvgEditor.jsx` (10+ state variables)
- Impact: State synchronization bugs, unnecessary re-renders, difficult to debug state flow
- Fix approach: Consolidate related state into useReducer, consider state management library (Zustand/Jotai), apply state colocation

**Relative Import Paths:**
- Issue: 980+ instances of relative imports (`../..`) creating brittle module dependencies
- Files: Widespread across entire codebase
- Impact: Difficult refactoring, unclear module boundaries, breaks when moving files
- Fix approach: Implement path aliases in vite.config.js (e.g., `@/components`, `@/services`, `@/hooks`)

**Console Logging in Production Code:**
- Issue: 155 console.log/warn/error calls across 50 files despite structured logging service
- Files: Includes production code in `src/pages/`, `src/components/`, `src/services/`
- Impact: Noisy browser console, potential PII leakage, inconsistent logging format
- Fix approach: Replace with `useLogger` hook or `createScopedLogger` from loggingService, vite build config drops console.* but code should use logging service

**Empty Catch Blocks:**
- Issue: 4 instances of silently swallowed errors
- Files:
  - `src/services/dataSourceService.js:807` - `deleteDataSource().catch(() => {})`
  - `src/components/onboarding/WelcomeTour.jsx:234` - `updateWelcomeTourStep().catch(() => {})`
  - `src/pages/SceneEditorPage.jsx:182` - `.catch(() => {}) // Graceful fallback`
  - `src/components/BillingBanner.jsx:253` - `.catch(() => {})`
- Impact: Hidden failures, debugging nightmares, data loss potential
- Fix approach: At minimum log errors to loggingService, consider user notifications where appropriate

**Uninitialized State:**
- Issue: Heavy reliance on `useState(null)`, `useState([])`, `useState({})` (557 occurrences)
- Files: Pervasive across all page and component files
- Impact: Potential null reference errors, loading states not properly handled
- Fix approach: Initialize with proper loading states, use optional chaining consistently, consider default values

**Environment Variable Dependency:**
- Issue: 85+ direct references to `import.meta.env` or `process.env` scattered throughout codebase
- Files: 31 different service and config files
- Impact: Hard to mock in tests, unclear which env vars are required, potential runtime errors
- Fix approach: Centralize in `src/config/env.js` and import from there, document required variables

**localStorage/sessionStorage Direct Usage:**
- Issue: 113 direct storage API calls across 26 files
- Files: Including `src/services/playerService.js`, `src/i18n/I18nContext.jsx`, `src/services/sessionService.js`
- Impact: No error handling, quota exceeded errors, SSR compatibility issues, no fallback
- Fix approach: Create storage service wrapper with try/catch, quota checks, fallback to memory

**Missing TypeScript:**
- Issue: Entire codebase is JavaScript (.jsx) with no type checking
- Files: All 184,152 lines of src/ code
- Impact: Runtime type errors, no IDE autocomplete for props, difficult refactoring
- Fix approach: Gradual migration to TypeScript, start with `.d.ts` files for key interfaces, use JSDoc types as intermediate step

**Large Dependency Bundle:**
- Issue: node_modules is 724MB, large bundle size warnings
- Files: package.json includes heavy dependencies (fabric.js, polotno, framer-motion, etc.)
- Impact: Slow install times, large production bundles, slow initial page loads
- Fix approach: Audit dependencies, lazy load heavy libraries, consider lighter alternatives, tree-shaking optimization

## Known Bugs

**TODO Comments Indicating Incomplete Features:**
- Issue: 10+ TODO/FIXME comments in production code
- Files:
  - `src/components/EditorModal.jsx:133` - "TODO: In a future iteration, we could send a 'triggerSave' message to the iframe"
  - `src/legacy/utils/performance.js:104` - "TODO: Send to analytics service (e.g., Google Analytics, Mixpanel)"
  - `vitest.config.js:37` - "TODO: Raise thresholds as more tests are added. Currently set to 0 to allow CI to pass"
- Impact: Feature gaps, incomplete functionality, technical debt accumulation
- Fix approach: Prioritize TODOs, convert to tracked issues, complete or remove

## Security Considerations

**XSS Protection Properly Implemented:**
- Risk: dangerouslySetInnerHTML used but properly sanitized
- Files:
  - `src/security/SafeHTML.jsx` - Uses DOMPurify with SafeHTML wrapper component
  - `src/security/sanitize.js` - Centralized sanitization with DOMPurify
- Current mitigation: DOMPurify sanitization before any HTML rendering, sanitization logging hooks
- Recommendations: Continue using SafeHTML component, audit for any direct innerHTML usage

**Password/Secret Handling:**
- Risk: 1281 references to password/token/secret/api_key keywords across 101 files
- Files: Widespread in auth, API, and service files
- Current mitigation: Passwords properly handled in `src/services/authService.js`, tokens in headers not logged
- Recommendations: Audit that no secrets are logged to loggingService or console, verify PII redaction in `src/utils/pii.js`

**Environment Variable Exposure:**
- Risk: Client-side code has access to environment variables via import.meta.env
- Files: 31 files accessing env vars directly
- Current mitigation: Vite only exposes VITE_* prefixed variables to client
- Recommendations: Audit all env var usage, ensure no secrets exposed, document required variables

**Direct Supabase Database Access:**
- Risk: 422 direct supabase.from() calls across 106 files - potential SQL injection, RLS bypass
- Files: Services and page hooks directly calling Supabase
- Current mitigation: Supabase RLS policies (assumed), Postgres parameterized queries
- Recommendations: Audit RLS policies, consider API layer for sensitive operations, validate all inputs

**Local Storage Security:**
- Risk: Sensitive data potentially stored in localStorage (113 uses)
- Files: Auth tokens, session data, user preferences stored client-side
- Current mitigation: Unknown if tokens are encrypted
- Recommendations: Audit what's stored in localStorage, encrypt sensitive data, implement expiration, clear on logout

## Performance Bottlenecks

**Massive Hook Dependency Arrays:**
- Problem: 1188 useEffect/useCallback/useMemo calls - many likely with incorrect dependencies
- Files: 222 files using React hooks extensively
- Cause: Large component files, complex state management, lack of optimization
- Improvement path: Use React DevTools Profiler, memoize expensive computations, split components, reduce re-renders

**Large Page Components:**
- Problem: Pages like LayoutEditorPage, PlaylistsPage exceed 1000 lines with complex rendering
- Files:
  - `src/pages/PlaylistsPage.jsx` (1324 lines)
  - `src/pages/DataSourcesPage.jsx` (1323 lines)
  - `src/pages/LayoutEditorPage.jsx` (1178 lines)
- Cause: Monolithic page components, embedded business logic, lack of code splitting
- Improvement path: Code splitting with React.lazy (already used in App.jsx), extract subcomponents, move logic to custom hooks

**Real-time Updates:**
- Problem: Supabase real-time subscriptions potentially causing excessive re-renders
- Files: `src/services/realtimeService.js`, various page hooks
- Cause: Unoptimized subscription handlers, broad subscription scopes
- Improvement path: Debounce updates, optimize subscription filters, use selective subscriptions

**SVG Editor Performance:**
- Problem: 2997-line FabricSvgEditor component with heavy canvas operations
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`
- Cause: Fabric.js rendering overhead, large component size, complex state
- Improvement path: Web Workers for SVG processing, canvas optimization, component splitting

## Fragile Areas

**Player Offline Sync:**
- Files:
  - `src/player/offlineService.js`
  - `src/player/hooks/usePlayerContent.js`
  - `src/player/hooks/usePlayerHeartbeat.js`
- Why fragile: Complex sync logic, IndexedDB race conditions, network state detection
- Safe modification: Extensive E2E testing required, test offline scenarios, verify sync correctness
- Test coverage: E2E tests exist in `tests/e2e/` but unit test coverage at 0% (vitest.config.js thresholds)

**Schedule Conflict Resolution:**
- Files:
  - `src/services/scheduleService.js` (1221 lines)
  - `src/pages/ScheduleEditorPage.jsx` (1152 lines)
  - `src/components/schedules/ConflictWarning.jsx`
- Why fragile: Complex date/time logic, daypart calculations, priority rules, timezone handling
- Safe modification: Add comprehensive unit tests for edge cases, validate against production data
- Test coverage: Some tests exist (`tests/e2e/schedules.spec.js`) but unit coverage missing

**Media Upload & S3 Integration:**
- Files:
  - `src/services/mediaService.js` (1242 lines)
  - `src/hooks/useS3Upload.jsx`
  - `src/components/media/YodeckAddMediaModal.jsx` (1547 lines)
- Why fragile: Presigned URL expiration, file size limits, S3 quota errors, CORS issues
- Safe modification: Test with large files, test network failures, verify cleanup on errors
- Test coverage: Integration test exists (`tests/integration/api/`) but incomplete

**Industry Wizard Templates:**
- Files: `src/services/industryWizardService.js` (2797 lines)
- Why fragile: Massive template definition object, tight coupling to scene design service
- Safe modification: Extract templates to JSON, add validation schema, test all template variants
- Test coverage: Unit test exists (`tests/unit/services/industryWizardService.test.js`)

**Data Source Sync:**
- Files: `src/services/dataSourceService.js` (1286 lines)
- Why fragile: Multiple external API integrations (Google Sheets, RSS, etc.), polling logic, error recovery
- Safe modification: Mock external APIs in tests, test rate limiting, verify error handling
- Test coverage: Unit test exists (`tests/unit/services/dataSourceService.test.js`)

## Scaling Limits

**Supabase Row Limits:**
- Current capacity: Unknown table row counts
- Limit: Postgres max rows per table ~billions, but query performance degrades
- Scaling path: Implement pagination everywhere, add database indexes, consider table partitioning for high-volume tables (logs, metrics)

**Real-time Connection Limits:**
- Current capacity: Unknown concurrent connections
- Limit: Supabase real-time has connection limits per plan
- Scaling path: Optimize subscriptions, use polling for non-critical updates, consider alternative real-time solutions

**Client-Side Bundle Size:**
- Current capacity: Manual chunks defined in vite.config.js, 600KB warning limit
- Limit: Large bundles slow initial page load, mobile networks affected
- Scaling path: More aggressive code splitting, lazy load heavy features (svg-editor, polotno), optimize images

**localStorage Quota:**
- Current capacity: 5-10MB browser limit
- Limit: Quota exceeded errors on large cached data
- Scaling path: Use IndexedDB for large data (player already does), implement storage monitoring, clear old data

## Dependencies at Risk

**Fabric.js (v6.9.0):**
- Risk: Large bundle size, performance overhead, complex API
- Impact: SVG editor performance, bundle size
- Migration plan: Consider lighter alternatives (Konva, Paper.js) or build custom canvas solution

**Polotno (v2.33.2):**
- Risk: Proprietary dependency, potential licensing changes
- Impact: Scene editor core functionality
- Migration plan: Abstract behind interface, prepare fallback editor

**React 19.1.1:**
- Risk: Bleeding edge React version, ecosystem compatibility
- Impact: Third-party library incompatibilities, unstable APIs
- Migration plan: Monitor ecosystem adoption, pin dependencies, test thoroughly

**Supabase (v2.80.0):**
- Risk: Vendor lock-in, pricing changes, service limits
- Impact: Core database, auth, storage, real-time features
- Migration plan: Abstract database layer, consider multi-cloud strategy, maintain data export capabilities

## Missing Critical Features

**Type Safety:**
- Problem: No TypeScript, no runtime type validation
- Blocks: Safe refactoring, confident API changes, IDE autocomplete
- Priority: Medium - JSDoc provides some safety but not enforced

**Error Boundaries:**
- Problem: Limited error boundary usage (only 1 instance in `src/components/ErrorBoundary.jsx`)
- Blocks: Graceful error handling, preventing full app crashes
- Priority: High - Single error can crash entire application

**Comprehensive Logging:**
- Problem: loggingService exists but console.* still used in 50 files
- Blocks: Production debugging, error tracking, user session replay
- Priority: Medium - Partially implemented, needs enforcement

**Database Migrations:**
- Problem: No visible migration system, schema changes unclear
- Blocks: Safe database changes, rollback capability, team coordination
- Priority: High - Database changes are risky

**API Rate Limiting:**
- Problem: rateLimitService exists but unclear if applied to all endpoints
- Blocks: API abuse protection, cost control
- Priority: Medium - Service exists but implementation coverage unknown

## Test Coverage Gaps

**Unit Test Coverage at 0%:**
- What's not tested: Most services and components have no unit tests
- Files: vitest.config.js sets all coverage thresholds to 0%
- Risk: Regression bugs, unsafe refactoring, unclear component contracts
- Priority: High - Foundation for safe development

**Page Hooks Lack Tests:**
- What's not tested: Complex hooks in `src/pages/hooks/` (useMediaLibrary, useScreensData, usePlaylistEditor, useCampaignEditor)
- Files:
  - `src/pages/hooks/useMediaLibrary.js` (1068 lines, untested)
  - `src/pages/hooks/usePlaylistEditor.js` (1189 lines, untested)
  - `src/pages/hooks/useScreensData.js` (696 lines, untested)
  - `src/pages/hooks/useCampaignEditor.js` (untested)
- Risk: State management bugs, race conditions, memory leaks
- Priority: High - These hooks contain critical business logic

**Integration Tests Incomplete:**
- What's not tested: Full user workflows, cross-service interactions
- Files: Only 3 integration tests exist in `tests/integration/api/`
- Risk: Feature integration bugs, API contract violations
- Priority: Medium - E2E tests partially cover but slower

**E2E Tests Cover Happy Paths Only:**
- What's not tested: Error conditions, edge cases, offline scenarios, network failures
- Files: Extensive E2E suite in `tests/e2e/` but focused on success cases
- Risk: Production bugs in error paths, poor user experience on failures
- Priority: Medium - Good coverage exists but needs expansion

**Performance Testing:**
- What's not tested: Large dataset handling, concurrent users, memory usage
- Files: Load tests exist in `load-tests/` directory but unclear if run regularly
- Risk: Performance regressions, production slowdowns
- Priority: Low - Load test infrastructure exists

---

*Concerns audit: 2026-02-12*
