# Roadmap: BizScreen Production Release

## Overview

BizScreen production release progresses through 12 phases: establishing testing infrastructure, hardening security, fixing critical logic gaps, improving player reliability, refactoring large components, then delivering new features (device experience, analytics, GDPR compliance, content approval workflow). The sequence prioritizes safety (tests before refactoring), observability (logging before complex changes), and legal compliance (GDPR before feature expansion).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Testing Infrastructure** - Establish safety net before any refactoring
- [x] **Phase 2: XSS Prevention** - Fix security vulnerabilities in HTML rendering
- [x] **Phase 3: Auth Hardening** - Strengthen password and rate limiting policies
- [x] **Phase 4: Logging Migration** - Replace console.log with structured logging
- [x] **Phase 5: Critical Fixes** - Wire up incomplete features and logic gaps
- [x] **Phase 6: Player Reliability** - Harden offline sync and error handling *(PLR-01 gap deferred to Phase 7)*
- [x] **Phase 7: Player Refactoring** - Split Player.jsx into focused components *(hooks extracted, component splitting deferred)*
- [x] **Phase 8: Page Refactoring** - Split large page components *(hooks + components extracted, 70% line reduction)*
- [x] **Phase 9: Device Experience** - QR pairing and kiosk exit improvements *(49 tests added)*
- [x] **Phase 10: Analytics** - View duration and content performance tracking *(28 tests added)*
- [ ] **Phase 11: GDPR Compliance** - Data export and account deletion
- [ ] **Phase 12: Content Approval** - Submit, review, and publish workflow

## Phase Details

### Phase 1: Testing Infrastructure
**Goal**: Player.jsx has characterization tests capturing current behavior, enabling safe refactoring in later phases
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Running `npm test` executes Player.jsx characterization tests without failures
  2. Offline mode transition test verifies player switches to cached content when network drops
  3. Content sync test verifies player receives and renders updated playlist from server
  4. Heartbeat test verifies player reconnects after connection loss
  5. Critical service functions (scheduleService, offlineService) have unit test coverage
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Offline mode transition tests (TEST-01)
- [x] 01-02-PLAN.md — Content sync flow tests (TEST-02)
- [x] 01-03-PLAN.md — Heartbeat/reconnection tests (TEST-03)
- [x] 01-04-PLAN.md — Expand service function tests (TEST-04)
- [x] 01-05-PLAN.md — Integration and verification

### Phase 2: XSS Prevention
**Goal**: User-generated and dynamic HTML content is sanitized before rendering
**Depends on**: Nothing (independent security fix)
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. HelpCenterPage renders sanitized HTML with malicious scripts removed
  2. SVG editor LeftSidebar uses React state instead of innerHTML mutation
  3. Injecting `<script>alert('xss')</script>` into any text field produces no alert
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Security infrastructure (DOMPurify + SafeHTML component)
- [x] 02-02-PLAN.md — Fix LeftSidebar innerHTML mutation (SEC-02)
- [x] 02-03-PLAN.md — Fix HelpCenterPage XSS (SEC-01)
- [x] 02-04-PLAN.md — Security logging and dashboard
- [x] 02-05-PLAN.md — XSS prevention tests and verification

### Phase 3: Auth Hardening
**Goal**: Authentication resists common attacks through password policies and rate limiting
**Depends on**: Nothing (independent security enhancement)
**Requirements**: SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. User cannot set password shorter than 8 characters
  2. User cannot set password without complexity (uppercase, lowercase, number)
  3. High-frequency API endpoints return 429 after exceeding rate limit
  4. Rate limiting applies per-user and per-IP dimensions
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Integrate password validation into auth forms (SEC-03)
- [x] 03-02-PLAN.md — Create rate limiting database infrastructure (SEC-04)
- [x] 03-03-PLAN.md — Integrate rate limiting into services (SEC-04)
- [x] 03-04-PLAN.md — Verification and testing

### Phase 4: Logging Migration
**Goal**: All console output uses structured logging for production observability
**Depends on**: Nothing (independent infrastructure improvement)
**Requirements**: SEC-05
**Success Criteria** (what must be TRUE):
  1. Zero console.log calls remain in production code paths
  2. Logs include correlation IDs linking related operations
  3. Log levels (error, warn, info, debug) are applied consistently
  4. PII (emails, names) is redacted from log output
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Logging infrastructure enhancement (PII redaction, safe stringify, useLogger hook)
- [x] 04-02-PLAN.md — Build-time enforcement (ESLint no-console, Terser config)
- [x] 04-03-PLAN.md — Migrate high-priority services (auth, security, player)
- [x] 04-04-PLAN.md — Migrate remaining services (realtime, external integrations, utilities)
- [x] 04-05-PLAN.md — Migrate Player, hooks, components, and pages
- [x] 04-06-PLAN.md — Verification, enforcement escalation, and cleanup

### Phase 5: Critical Fixes
**Goal**: Incomplete features work end-to-end without "not implemented" errors
**Depends on**: Phase 4 (logging for debugging)
**Requirements**: FIX-02, FIX-05 (FIX-01, FIX-03, FIX-04 already complete)
**Success Criteria** (what must be TRUE):
  1. ~~Schedule editor shows conflict warning when creating overlapping time entries~~ (already complete)
  2. User can click "Save as Template" on a layout and find it in template library
  3. ~~Timezone selector validates IANA format and handles DST transitions~~ (already complete)
  4. ~~Media upload shows warning at 80% storage quota and blocks at 100%~~ (already complete)
  5. Email notifications send via Resend provider (not stub)
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Save Layout as Template (FIX-02)
- [x] 05-02-PLAN.md — Email notifications via Resend (FIX-05)

### Phase 6: Player Reliability
**Goal**: Player handles network failures and errors gracefully without user intervention
**Depends on**: Phase 4 (logging for debugging), Phase 5 (email for notifications)
**Requirements**: PLR-01, PLR-02, PLR-03, PLR-04
**Success Criteria** (what must be TRUE):
  1. Failed content sync retries with exponential backoff (1s, 2s, 4s...) and jitter
  2. Screenshots taken offline upload automatically when connection restores
  3. Kiosk exit requires correct password (incorrect password is rejected)
  4. Player error logs include context instead of empty catch blocks
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Retry logic with full jitter and error logging (PLR-01, PLR-04)
- [x] 06-02-PLAN.md — Offline screenshot sync and kiosk password (PLR-02, PLR-03)
- [x] 06-03-PLAN.md — Verification and testing

### Phase 7: Player Refactoring
**Goal**: Player.jsx custom hooks extracted and tested; component splitting deferred to future phase
**Depends on**: Phase 1 (tests for safety), Phase 6 (reliability hardened)
**Requirements**: REF-01, REF-02
**Success Criteria** (what must be TRUE):
  1. ~~Player.jsx is under 500 lines~~ (deferred - requires component extraction beyond hook refactoring)
  2. usePlayerContent, usePlayerHeartbeat, usePlayerCommands, useKioskMode, usePlayerPlayback hooks exist and are tested
  3. Widget components (Clock, Weather, QRCode, Date) are separate files
  4. All existing Player.jsx tests still pass after refactoring
  5. Offline playback works identically before and after refactoring
**Plans**: 4 plans

Plans:
- [x] 07-01-PLAN.md — Extract widget components and fix PLR-01 retry gap (REF-01)
- [x] 07-02-PLAN.md — Extract custom hooks for content, heartbeat, and commands (REF-02)
- [x] 07-03-PLAN.md — Final consolidation, hook tests, and verification
- [x] 07-04-PLAN.md — Gap closure: Fix test failures (playbackTrackingService bug)

### Phase 8: Page Refactoring
**Goal**: Large page components are decomposed into maintainable sub-components with custom hooks
**Depends on**: Phase 7 (Player refactoring pattern proven)
**Requirements**: REF-03, REF-04, REF-05, REF-06, REF-07
**Success Criteria** (what must be TRUE):
  1. MediaLibraryPage.jsx is under 800 lines with useMediaLibrary hook
  2. ScreensPage.jsx is under 700 lines with useScreensData hook
  3. PlaylistEditorPage.jsx is under 700 lines with usePlaylistEditor hook
  4. CampaignEditorPage.jsx is under 600 lines with useCampaignEditor hook
  5. FeatureFlagsPage.jsx is under 600 lines with useFeatureFlags hook
**Plans**: 12 plans (6 original + 6 gap closure)

Plans:
- [x] 08-01-PLAN.md — Extract useFeatureFlags hook (REF-07)
- [x] 08-02-PLAN.md — Extract useCampaignEditor hook (REF-06)
- [x] 08-03-PLAN.md — Extract usePlaylistEditor hook (REF-05)
- [x] 08-04-PLAN.md — Extract useScreensData hook (REF-04)
- [x] 08-05-PLAN.md — Extract useMediaLibrary hook (REF-03)
- [x] 08-06-PLAN.md — Hook tests and verification
- [x] 08-07-PLAN.md — Gap closure: Extract FeatureFlagsPage components (target: <600 lines)
- [x] 08-08-PLAN.md — Gap closure: Wire MediaLibraryPage to extracted components (target: <800 lines)
- [x] 08-09-PLAN.md — Gap closure: Extract ScreensPage components (target: <700 lines)
- [x] 08-10-PLAN.md — Gap closure: Extract PlaylistEditorPage components (target: <700 lines)
- [x] 08-11-PLAN.md — Gap closure: Extract CampaignEditorPage modals (target: <600 lines)
- [x] 08-12-PLAN.md — Gap closure: Final verification

### Phase 9: Device Experience
**Goal**: Device pairing and kiosk management are easier for field technicians
**Depends on**: Phase 7 (Player refactored to add features cleanly)
**Requirements**: DEV-01, DEV-02, DEV-03
**Success Criteria** (what must be TRUE):
  1. Unpaired player displays QR code that admin can scan to start pairing
  2. Tapping bottom-right corner 5 times reveals kiosk exit PIN prompt
  3. Emergency kiosk exit works without network connection (PIN stored locally)
**Plans**: 8 plans

Plans:
- [x] 09-01-PLAN.md — Database schema and PIN service functions (DEV-03)
- [x] 09-02-PLAN.md — Create useTapSequence hook for hidden exit trigger (DEV-02)
- [x] 09-03-PLAN.md — Create PinEntry component with numeric keypad (DEV-02)
- [x] 09-04-PLAN.md — Create PairingScreen component with QR code (DEV-01)
- [x] 09-05-PLAN.md — Admin pairing page and routing (DEV-01)
- [x] 09-06-PLAN.md — Integrate QR pairing and PIN exit into Player.jsx (DEV-01, DEV-02, DEV-03)
- [x] 09-07-PLAN.md — Master PIN management in ScreensPage (DEV-03)
- [x] 09-08-PLAN.md — Unit tests for Phase 9 components

### Phase 10: Analytics
**Goal**: Content owners can see how long and how often their content is viewed
**Depends on**: Phase 6 (reliable player tracking data)
**Requirements**: ANA-01, ANA-02, ANA-03, ANA-04
**Success Criteria** (what must be TRUE):
  1. Content detail page shows average view duration in seconds
  2. Content detail page shows completion rate (% of scheduled time displayed)
  3. Analytics dashboard lists content sorted by total view time
  4. Heatmap visualization shows viewing patterns by hour and day of week
**Plans**: 8 plans

Plans:
- [x] 10-01-PLAN.md — Database RPCs for content metrics, performance list, and heatmap (ANA-01, ANA-02, ANA-03, ANA-04)
- [x] 10-02-PLAN.md — Extend contentAnalyticsService with new functions (ANA-01, ANA-02, ANA-03, ANA-04)
- [x] 10-03-PLAN.md — ViewingHeatmap component (ANA-04)
- [x] 10-04-PLAN.md — ContentInlineMetrics component (ANA-01, ANA-02)
- [x] 10-05-PLAN.md — AnalyticsDashboardPage with tabs (ANA-03, ANA-04)
- [x] 10-06-PLAN.md — ContentDetailAnalyticsPage (ANA-01, ANA-02)
- [x] 10-07-PLAN.md — Integrate inline metrics into SceneEditorPage (ANA-01, ANA-02)
- [x] 10-08-PLAN.md — Testing and verification

### Phase 11: GDPR Compliance
**Goal**: Users can export their data and request account deletion per EU regulations
**Depends on**: Phase 5 (email for notifications)
**Requirements**: GDPR-01, GDPR-02, GDPR-03, GDPR-04, GDPR-05
**Success Criteria** (what must be TRUE):
  1. User can click "Export My Data" and receive download link within 30 days
  2. Exported file is machine-readable JSON containing all user data
  3. User can request account deletion with 30-day grace period
  4. After grace period, all user data is permanently removed from database
  5. Media files in S3 and Cloudinary are deleted when account is deleted
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

### Phase 12: Content Approval
**Goal**: Content goes through review before appearing on screens
**Depends on**: Phase 5 (email for notifications), Phase 11 (GDPR compliance first)
**Requirements**: APR-01, APR-02, APR-03, APR-04, APR-05
**Success Criteria** (what must be TRUE):
  1. Content creator can submit playlist/scene for approval
  2. Approver sees pending submissions in review queue
  3. Approver can approve or reject with written feedback
  4. Rejected content cannot be published to screens
  5. Approval request and decision trigger email notifications
**Plans**: TBD

Plans:
- [ ] 12-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Testing Infrastructure | 5/5 | Complete | 2026-01-22 |
| 2. XSS Prevention | 5/5 | Complete | 2026-01-22 |
| 3. Auth Hardening | 4/4 | Complete | 2026-01-22 |
| 4. Logging Migration | 6/6 | Complete | 2026-01-22 |
| 5. Critical Fixes | 2/2 | Complete | 2026-01-23 |
| 6. Player Reliability | 3/3 | Complete | 2026-01-23 |
| 7. Player Refactoring | 4/4 | Complete | 2026-01-23 |
| 8. Page Refactoring | 12/12 | Complete | 2026-01-23 |
| 9. Device Experience | 8/8 | Complete | 2026-01-23 |
| 10. Analytics | 8/8 | Complete | 2026-01-24 |
| 11. GDPR Compliance | 0/TBD | Not started | - |
| 12. Content Approval | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-22*
*Last updated: 2026-01-24 — Phase 10 complete (8 plans, 4 waves)*
