# Project Research Summary

**Project:** BizScreen Digital Signage Platform - Stabilization & Feature Completion
**Domain:** Production stabilization for existing React/Supabase SaaS application
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

BizScreen is a production digital signage platform built on React 19 and Supabase, serving multi-tenant deployments with offline-capable TV player devices. The stabilization effort focuses on hardening existing infrastructure rather than replacing it. Key finding: foundational systems exist (custom logging service, GDPR database schemas, analytics tracking, offline caching) but need completion and migration from ad-hoc patterns.

The recommended approach is incremental stabilization with characterization tests first, followed by migration phases that leverage existing architecture. The four parallel research tracks reveal strong architectural foundations with specific gaps: 197+ console.log calls need migration to existing structured logger, retry logic lacks jitter for thundering herd prevention, large components (Player.jsx at 3,476 lines) need decomposition without test coverage, and GDPR implementation exists in database but lacks UI and data export generation.

Critical risk is refactoring without tests in a production system with offline sync complexity. Mitigation: establish characterization tests before any refactoring, use Strangler Fig pattern for incremental extraction, and maintain offline capability as non-negotiable constraint throughout all phases. Secondary risk is GDPR backup resurrection where deleted data reappears after disaster recovery - requires erasure log replay after any restore.

## Key Findings

### Recommended Stack

BizScreen's existing stack is production-ready with targeted enhancements needed. The research confirms keeping existing infrastructure rather than wholesale replacement.

**Core technologies:**
- **Keep existing loggingService.js**: Custom structured logger with correlation IDs, batching, and scoped loggers already production-ready - work is migrating 197+ console.log calls, not replacing the service
- **lodash.throttle/debounce 4.1.1**: For Supabase rate limiting client-side smoothing - simple, battle-tested, no need for complex rate limiting library since Supabase handles server-side enforcement
- **fetch-retry 6.0.0 + p-retry 7.1.0**: Dual approach for retry logic - fetch-retry integrates at Supabase client level, p-retry for general async operations with exponential backoff and jitter
- **DOMPurify 3.3.1**: OWASP-recommended XSS prevention for existing dangerouslySetInnerHTML usage in HelpCenterPage - 18M+ weekly downloads, whitelist-based sanitization

**Installation:** `npm install fetch-retry p-retry dompurify lodash.throttle lodash.debounce`

**Version confidence:** All verified against npm as of 2026-01-22, actively maintained packages

### Expected Features

BizScreen has strong database foundations (migrations 027, 106, 079) but needs UI completion and backend logic implementation.

**Must have (table stakes):**
- **Approval workflow**: Status changes, approval queue UI, approve/reject with comment, email notification - migration 027 provides review_requests and review_comments tables, needs frontend implementation
- **GDPR data export**: Machine-readable format (JSON), aggregates all user data within 30 days - table exists but needs generation logic and background job
- **GDPR account deletion**: Cascade delete with 30-day grace period - foundation exists but needs verification of hard vs soft delete approach
- **Content analytics completion**: View duration tracking, proof of play, export reports - playback_events table exists, needs completion rate tracking and heatmap aggregation
- **Device QR pairing**: QR code displays pairing URL with OTP, admin scans to auto-fill - qrcodeService.js exists, needs player-side display
- **Emergency kiosk exit**: Tap sequence + PIN, remote unlock command - player needs exit flow with lockout after failed attempts

**Should have (competitive):**
- **Multi-level approval chains**: Sequential approval workflow for compliance-heavy industries - requires new approval_chains table
- **Analytics heatmaps**: Time-based (24x7 grid) and location-based playback patterns - foundation exists, needs aggregation functions
- **Scheduled reports**: Automated delivery of analytics and proof of play - depends on email provider setup
- **Bulk QR generation**: Print device pairing labels for hardware rollouts - extends existing QR service

**Defer (v2+):**
- **Content diff view for approvals**: Requires versioning system - HIGH complexity
- **A/B content testing**: Variant tracking with statistical analysis - VERY HIGH complexity
- **Audience demographics**: Computer vision for viewer analytics - privacy concerns, very high complexity
- **Geofenced kiosk mode**: Location-based auto-exit - HIGH complexity, requires location services

### Architecture Approach

React component decomposition follows feature-based state grouping with custom hooks. The existing pattern of Context for global state (auth, branding) works well - extend with custom hooks for page-level state rather than adding more Context providers.

**Major components requiring refactoring:**
1. **Player.jsx (3,476 lines)** — Extract to usePlayerContent, usePlayerHeartbeat, usePlayerCommands, useOfflineMode, useKioskMode hooks + separate widget components (ClockWidget, WeatherWidget, QRCodeWidget, DateWidget)
2. **ScreensPage.jsx (~1,900 lines)** — Extract to useScreensData, useScreensFilters, useScreenActions hooks + separate modal components (AddScreenModal, EditScreenModal, AnalyticsModal)
3. **MediaLibraryPage.jsx (~2,500 lines)** — Extract to useMediaLibraryData hook + separate grid/list components already partially defined
4. **PlaylistEditorPage.jsx (~1,300+ lines)** — Similar hook extraction pattern for data management

**Refactoring strategy:** Strangler Fig pattern with characterization tests first. Maximum PR size 200 lines for refactoring changes. Extract one responsibility per PR. Test offline capability after every Player.jsx change - non-negotiable constraint.

**Hook extraction order for Player.jsx (dependency-aware):**
1. useStuckDetection (isolated, no dependencies)
2. useKioskMode (localStorage only)
3. usePlayerHeartbeat (screenId dependency)
4. usePlayerCommands (screenId + callbacks)
5. usePlayerContent (most complex, central state)

### Critical Pitfalls

Based on codebase analysis and production stabilization patterns, these are must-avoid mistakes:

1. **Refactoring without characterization tests** — Player.jsx handles offline mode, caching, real-time sync, playback tracking - any regression affects all customer screens. Current state: no test files found in src/. Prevention: Write E2E tests for critical paths BEFORE refactoring (pairing, playback, offline fallback, command execution). Use Strangler Fig pattern, not Big Bang refactoring.

2. **GDPR: Backups restoring deleted data** — Disaster recovery or backup testing brings "deleted" user data back, causing compliance violation. Multi-tenant complicates selective restore. Prevention: Maintain separate deleted_user_ids table with timestamps, replay deletions after any backup restore, document 30-day backup retention, implement cryptographic erasure (delete encryption key) for immediate compliance.

3. **Thundering herd on network recovery** — Current retry logic in Player.jsx lines 109-118 has only 0-25% jitter. Hundreds of devices recovering simultaneously overwhelm backend. Prevention: Increase jitter to 50-100% (AWS full jitter recommendation), add startup randomization (0-30 seconds), implement circuit breaker (3 consecutive failures = longer wait), use decorrelated jitter formula.

4. **Logging performance degradation** — Migrating 197+ console.log calls to structured logging adds serialization overhead in hot paths (Player.jsx has 16 calls, cacheService.js). console.log is lazy, structured logging serializes on every call. Prevention: Profile before/after migration in Player.jsx, use lazy evaluation for complex objects, skip serialization for filtered log levels, test with DevTools closed.

5. **Rate limiting GET requests unprotected** — PostgreSQL-based rate limiting (pg_headerkit) only works for write operations, read replicas can't write rate limit state. Player endpoints (get_resolved_player_content, player_heartbeat) are high-frequency and vulnerable. Prevention: Use Supabase Edge Functions with Upstash Redis for API-level rate limiting, implement per-device, per-user, and per-IP dimensions, test both read and write operations.

## Implications for Roadmap

Based on research, suggested phase structure with clear dependencies and risk mitigation:

### Phase 1: Foundation - Testing Infrastructure
**Rationale:** Must precede any refactoring work. Zero test coverage in src/ makes all changes high-risk. Player.jsx complexity (offline sync, real-time, caching) requires safety net before decomposition.

**Delivers:**
- E2E test suite (Playwright infrastructure exists) covering Player.jsx critical paths: pairing flow, playlist playback, scene rendering, offline fallback, command execution
- Integration test patterns for extracted hooks using Vitest + React Testing Library
- Characterization tests that capture current behavior (not intended behavior)
- Testing documentation for future refactoring phases

**Addresses:** Refactoring without tests pitfall (PITFALLS.md critical #1)

**Avoids:** Silent regressions, customer-reported bugs with no repro steps, "it worked before the refactor" issues

**Research needed:** None - patterns documented in ARCHITECTURE.md, existing test utilities in /tests/

### Phase 2: XSS Prevention (Security Quick Win)
**Rationale:** High impact, low effort, security vulnerability. HelpCenterPage.jsx uses dangerouslySetInnerHTML without sanitization (STACK.md lines 289, 293). Can be implemented independently while tests are being written.

**Delivers:**
- DOMPurify 3.3.1 integration with whitelist configuration
- SafeHtml wrapper component
- XSS audit of all dangerouslySetInnerHTML usage
- URL sanitization for javascript: protocol blocking

**Uses:** dompurify package from STACK.md
**Addresses:** Security vulnerability before public-facing features
**Complexity:** LOW - isolated change, no dependencies

**Research needed:** None - implementation patterns documented in STACK.md

### Phase 3: Logging Migration
**Rationale:** Foundation for observability in all subsequent phases. Existing loggingService.js is production-ready, work is migration not replacement. Must happen before retry logic and rate limiting to make issues visible.

**Delivers:**
- Migration of 197+ console.log calls to scoped loggers
- Log level conventions documented (error/warn/info/debug)
- PII sanitization for common objects (profiles, tenants, devices)
- Performance profiling for Player.jsx (16 calls in hot paths)

**Uses:** Existing loggingService.js from src/services/
**Addresses:** Must-have observability for debugging subsequent stabilization work
**Avoids:** Logging sensitive data pitfall (PITFALLS.md moderate), performance degradation pitfall (PITFALLS.md critical #4)

**Research needed:** None - service exists, migration pattern in STACK.md

### Phase 4: Retry Logic Hardening
**Rationale:** After logging (so issues are visible), before rate limiting (to handle 429s properly). Player.jsx offline capability depends on proper retry with backoff. Current implementation lacks jitter and retries non-retryable errors.

**Delivers:**
- fetch-retry 6.0.0 integration at Supabase client level
- p-retry 7.1.0 for general async operations
- Decorrelated jitter (50-100%) to prevent thundering herd
- Non-retryable error classification (400, 401, 403, 404, 422)
- Circuit breaker for extended outages
- Offline queue size enforcement (MAX_QUEUE_SIZE: 100)

**Uses:** fetch-retry + p-retry from STACK.md
**Addresses:** Thundering herd pitfall (PITFALLS.md critical #3), retrying non-retryable errors (PITFALLS.md critical)
**Complexity:** MEDIUM - touches Player.jsx offline logic, requires careful testing

**Research needed:** None - patterns documented in STACK.md and PITFALLS.md

### Phase 5: Rate Limiting
**Rationale:** After retry logic (so 429s trigger proper backoff), preventive measure for API abuse. Client-side throttling for UX smoothing, server-side enforcement via Supabase Edge Functions.

**Delivers:**
- lodash.throttle/debounce for client-side smoothing (search debounce, realtime subscriptions throttle)
- Supabase Edge Functions with Upstash Redis for API-level limits
- Multi-dimension tracking (per-device, per-user, per-IP)
- Sliding window algorithm (not fixed window)
- 429 error handling with user-friendly messaging

**Uses:** lodash utilities + Supabase Edge Functions from STACK.md
**Addresses:** GET requests unprotected pitfall (PITFALLS.md critical #5), fixed window boundary abuse (PITFALLS.md moderate)
**Complexity:** MEDIUM - requires Edge Functions deployment

**Research needed:** None - implementation patterns in STACK.md

### Phase 6: Component Refactoring - Player.jsx
**Rationale:** After tests exist (Phase 1), logging is in place (Phase 3), and retry/offline logic is hardened (Phase 4). Player.jsx is highest priority due to complexity and customer impact. Strangler Fig approach with dependency-aware extraction order.

**Delivers:**
- Widget extraction: ClockWidget, DateWidget, WeatherWidget, QRCodeWidget to src/player/components/widgets/
- Hook extraction (order matters): useStuckDetection → useKioskMode → usePlayerHeartbeat → usePlayerCommands → usePlayerContent
- Scene/Layout extraction: SceneRenderer, SceneBlock, LayoutRenderer, ZoneRenderer
- Directory restructure: src/player/ with pages/, components/, hooks/, context/

**Implements:** Component boundaries from ARCHITECTURE.md
**Avoids:** Big Bang refactoring pitfall (PITFALLS.md critical), hooks migration gotchas (PITFALLS.md moderate)
**Constraint:** Offline capability MUST work after every change - non-negotiable

**Research needed:** None - extraction order and patterns documented in ARCHITECTURE.md

### Phase 7: Component Refactoring - Page Components
**Rationale:** After Player.jsx pattern is proven. Lower risk than Player (no offline sync), but similar complexity in state management.

**Delivers:**
- ScreensPage hooks: useScreensData, useScreensFilters, useScreenActions, useBulkSelection
- ScreensPage component extraction: ScreenRow, ScreenActionMenu, modals
- MediaLibraryPage hooks: useMediaLibraryData, useMediaFilters
- MediaLibraryPage component extraction: grid/list items, folder navigation
- Directory structure: src/pages/[PageName]/ with hooks/ and components/

**Implements:** Feature-based state grouping with useReducer from ARCHITECTURE.md
**Complexity:** MEDIUM - real-time subscriptions need careful testing

**Research needed:** None - patterns documented in ARCHITECTURE.md

### Phase 8: Device QR Pairing & Kiosk Exit
**Rationale:** Independent features, no dependencies on stabilization work. Improve device management immediately. Low risk, contained scope.

**Delivers:**
- QR code display on unpaired device (encodes pairing URL with OTP)
- Admin scan flow with auto-fill pairing code
- Emergency kiosk exit with tap sequence (5 taps bottom-right corner)
- Kiosk exit PIN (6 digits, 3 attempts, 5-minute lockout)
- Remote unlock command via device_commands table
- Offline PIN storage (encrypted on device)

**Addresses:** Table stakes features from FEATURES.md
**Uses:** Existing qrcodeService.js, extends device pairing flow
**Complexity:** LOW-MEDIUM - contained scope, player changes needed

**Research needed:** None - patterns documented in FEATURES.md

### Phase 9: Content Analytics Enhancements
**Rationale:** Foundation exists (playback_events table, aggregation functions). Adding completion rates and heatmaps builds on existing system. High user value for proof of play and scheduling optimization.

**Delivers:**
- View completion tracking (% of duration viewed)
- Time-based heatmap (24x7 grid: hour x day)
- Location-based heatmap (compare screen performance)
- Daily aggregation table (content_analytics_daily) for performance
- Proof of play reports with CSV export
- Real-time analytics dashboard (WebSocket updates)

**Addresses:** Must-have and should-have analytics from FEATURES.md
**Uses:** Existing playback_events table from migration 079
**Database changes:** Add completion_percent column, create content_analytics_daily table

**Research needed:** None - metrics and aggregation patterns in FEATURES.md

### Phase 10: GDPR Data Export
**Rationale:** Legal requirement with 30-day response mandate. Must happen before account deletion (users need export before delete). Migration 106 provides foundation but needs generation logic.

**Delivers:**
- Background function to aggregate all user data (generate_user_data_export)
- Data sources: profiles, media_assets, playlists, layouts, scenes, schedules, activity_logs, playback_events, consent_records, tv_devices
- Machine-readable JSON format
- Self-service data portal UI
- 7-day download expiration
- Export status tracking (pending, processing, completed)

**Addresses:** Table stakes GDPR compliance from FEATURES.md
**Uses:** Existing data_export_requests table from migration 106
**Complexity:** HIGH - multi-table aggregation, background job

**Research needed:** None - data sources and implementation pattern in FEATURES.md

### Phase 11: GDPR Account Deletion
**Rationale:** After data export (Phase 10) so users can download before delete. Most complex GDPR requirement due to third-party data and backup resurrection risk.

**Delivers:**
- Audit of soft vs hard delete (verify current implementation)
- Cascading deletion order (dependents first)
- Deleted user IDs log with timestamps (for backup replay)
- Third-party deletion: Cloudinary, S3, email service
- Account deletion UI with 30-day grace period confirmation
- Deletion verification via data subject access request test
- Backup restoration procedure with erasure replay

**Addresses:** Table stakes GDPR compliance + critical pitfall from PITFALLS.md
**Uses:** Existing account_deletion_requests table from migration 106
**Avoids:** Backups restoring deleted data (PITFALLS.md critical #2), soft delete not satisfying GDPR (PITFALLS.md critical), incomplete data discovery (PITFALLS.md moderate), third-party data not deleted (PITFALLS.md moderate)

**Research needed:** None - complete data map and deletion patterns in FEATURES.md and PITFALLS.md

### Phase 12: Content Approval Workflow
**Rationale:** Most complex feature due to notification system dependency. Migration 027 provides foundation but needs complete UI implementation and email provider. Saved for last after stabilization and GDPR compliance complete.

**Delivers:**
- Submit content for approval (status change + review_request creation)
- Approval queue UI for reviewers (filter by type/status)
- Approve/reject with comment (review_comments)
- Email notification on submit/approve/reject
- Preview link generation (existing SECURITY DEFINER functions)
- Approval expiration (expires_at on review_requests)
- Bulk approval actions (batch update endpoint)
- State machine validation (draft → in_review → approved/rejected → published)

**Addresses:** Table stakes approval workflow from FEATURES.md
**Uses:** Existing review_requests, review_comments, preview_links tables from migration 027
**Dependencies:** Email provider setup (shared with GDPR, analytics scheduled reports)
**Complexity:** HIGH - UI + backend + notifications

**Research needed:** None - state machine pattern and implementation in FEATURES.md

### Phase Ordering Rationale

**Dependency-driven sequence:**
- Testing (Phase 1) must precede refactoring (Phases 6-7) - no test coverage makes all changes high-risk
- Logging (Phase 3) must precede retry logic (Phase 4) and rate limiting (Phase 5) - observability needed to debug issues
- Retry logic (Phase 4) must precede rate limiting (Phase 5) - need proper 429 handling
- Data export (Phase 10) must precede deletion (Phase 11) - users need export before delete
- Stabilization (Phases 1-7) before new features (Phases 8-12) - foundation must be solid

**Risk mitigation:**
- XSS (Phase 2) early as quick security win while tests being written
- Player refactoring (Phase 6) only after tests, logging, retry/offline hardened
- GDPR (Phases 10-11) before approval workflow (Phase 12) - legal requirements take priority

**Complexity graduation:**
- Start with isolated changes (XSS, logging, device pairing)
- Progress to system-wide changes (retry, rate limiting, refactoring)
- End with feature completion (analytics, GDPR, approvals)

### Research Flags

**Phases with standard patterns (skip /gsd:research-phase):**
- **Phase 1 (Testing):** Vitest + Playwright infrastructure exists, React Testing Library patterns well-documented
- **Phase 2 (XSS):** DOMPurify usage straightforward, OWASP guidance clear
- **Phase 3 (Logging):** loggingService.js exists, migration is find/replace pattern
- **Phase 6-7 (Refactoring):** Custom hook extraction is standard React pattern, documented in ARCHITECTURE.md
- **Phase 8 (QR/Kiosk):** QR code generation exists, kiosk patterns from MDM providers

**Phases needing validation during planning:**
- **Phase 5 (Rate Limiting):** Supabase Edge Functions deployment - verify Upstash Redis setup, test Edge Function with read/write operations
- **Phase 10 (GDPR Export):** Background job infrastructure - verify Supabase Functions support for long-running jobs, test multi-table aggregation performance
- **Phase 11 (GDPR Deletion):** Third-party API integration - verify Cloudinary/S3 deletion APIs, test backup restoration with erasure replay
- **Phase 12 (Approvals):** Email provider selection - evaluate SendGrid vs AWS SES vs Resend, test notification delivery reliability

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing infrastructure verified by code review, library versions checked against npm 2026-01-22 |
| Features | HIGH | Database migrations reviewed (027, 079, 106), industry standards verified with competitor analysis |
| Architecture | HIGH | Codebase analyzed, component boundaries identified, React patterns verified with official docs |
| Pitfalls | HIGH | Specific to codebase (Player.jsx lines 109-118, 197 console.log locations), verified with production stabilization patterns |

**Overall confidence:** HIGH

Research based on actual codebase analysis, not theoretical patterns. All library versions verified current. Database migrations examined for existing foundations. Component line counts and specific code locations identified. Industry practices cross-referenced with multiple digital signage providers (OptiSigns, Signagelive, ScreenCloud, AIScreen, DISPL, Navori).

### Gaps to Address

**During planning/execution:**

- **Test coverage baseline:** Establish current coverage metrics before Phase 1, set target thresholds (minimum 80% for Player.jsx critical paths)
- **Email provider selection:** Choose between SendGrid, AWS SES, Resend before Phase 12 - evaluate deliverability, pricing, multi-tenant isolation
- **Backup restoration procedure:** Document current backup/restore process before Phase 11, test erasure log replay in staging
- **Edge Functions quota:** Verify Supabase plan supports Edge Functions + Upstash Redis before Phase 5, check rate limit dimensions supported
- **Third-party audit:** Inventory all external data processors before Phase 11 (confirmed: Cloudinary, S3, check for analytics services)
- **Performance baselines:** Profile Player.jsx before Phase 3 (logging) and Phase 6 (refactoring) - establish frame rate and memory benchmarks
- **Multi-tenant isolation:** Verify rate limiting and GDPR operations properly scope to tenant_id, test cross-tenant data leak scenarios

**No blockers identified:** All gaps are execution details, not fundamental unknowns. Research provides sufficient direction for roadmap creation.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** Player.jsx (3,476 lines), ScreensPage.jsx (~1,900 lines), MediaLibraryPage.jsx (~2,500 lines), existing services (loggingService.js, offlineService.js, cacheService.js, gdprService.js)
- **Database migrations:** 027 (approval workflow), 079 (playback analytics), 106 (GDPR compliance)
- **Official documentation:** React 19 docs, Supabase docs (rate limits, Edge Functions, DPA), OWASP XSS prevention, GDPR Article 17
- **Package verification:** npm registry for DOMPurify 3.3.1, p-retry 7.1.0, fetch-retry 6.0.0, lodash 4.17.21 (all verified 2026-01-22)

### Secondary (MEDIUM confidence)
- **Industry standards:** OptiSigns, Signagelive, ScreenCloud (approval workflows), AIScreen, DISPL, Navori (analytics metrics), Hexnode, Samsung Knox (kiosk patterns)
- **Production patterns:** AWS Builders Library (retry with jitter), Shopify Engineering (Strangler Fig), Better Stack (logging best practices)
- **GDPR compliance:** Microsoft GDPR DSR guide, GDPR4SaaS deletion requirements, Intuiface digital signage GDPR

### Tertiary (LOW confidence - already validated)
- None - all sources cross-referenced and verified

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
