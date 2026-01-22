# Requirements: BizScreen Production Release

**Defined:** 2026-01-22
**Core Value:** Screens reliably display the right content at the right time, even when offline.

## v1 Requirements

### Testing Infrastructure

- [x] **TEST-01**: Player.jsx has characterization tests covering offline mode transitions
- [x] **TEST-02**: Player.jsx has characterization tests covering content sync flow
- [x] **TEST-03**: Player.jsx has characterization tests covering heartbeat/reconnection
- [x] **TEST-04**: Critical service functions have unit tests (scheduleService, offlineService)

### Security Hardening

- [x] **SEC-01**: XSS vulnerability in HelpCenterPage fixed with DOMPurify sanitization
- [x] **SEC-02**: innerHTML mutation in SVG editor LeftSidebar replaced with React state
- [x] **SEC-03**: Password policy enforces minimum 8 characters with complexity
- [x] **SEC-04**: Global API rate limiting protects high-frequency endpoints
- [ ] **SEC-05**: Console.log calls (197+) replaced with structured logger

### Critical Fixes

- [ ] **FIX-01**: Schedule conflict detection UI shows warnings when creating overlapping entries
- [ ] **FIX-02**: createTemplateFromLayout() implemented — users can save layouts as templates
- [ ] **FIX-03**: Timezone validation enforces IANA format with DST handling
- [ ] **FIX-04**: Storage quota enforcement warns at 80%, blocks at 100%
- [ ] **FIX-05**: Email notifications use Resend provider (replace stub)

### Player Reliability

- [ ] **PLR-01**: Failed syncs retry with exponential backoff and jitter
- [ ] **PLR-02**: Offline screenshot sync implemented — queued screenshots upload on reconnect
- [ ] **PLR-03**: Kiosk exit password validation verified working in player
- [ ] **PLR-04**: Empty catch blocks replaced with proper error handling and logging

### Refactoring

- [ ] **REF-01**: Player.jsx split into focused components (SceneRenderer, PlayerControls, etc.)
- [ ] **REF-02**: Player custom hooks extracted (usePlayerContent, usePlayerHeartbeat, etc.)
- [ ] **REF-03**: MediaLibraryPage.jsx split into sub-components with custom hooks
- [ ] **REF-04**: ScreensPage.jsx split into sub-components with custom hooks
- [ ] **REF-05**: PlaylistEditorPage.jsx split into sub-components with custom hooks
- [ ] **REF-06**: CampaignEditorPage.jsx split into sub-components with custom hooks
- [ ] **REF-07**: FeatureFlagsPage.jsx split into sub-components with custom hooks

### Content Approval Workflow

- [ ] **APR-01**: Content can be submitted for approval with status tracking
- [ ] **APR-02**: Approvers see review queue with pending submissions
- [ ] **APR-03**: Approvers can approve/reject with comments
- [ ] **APR-04**: Content publishing conditional on approval status
- [ ] **APR-05**: Email notifications sent for approval requests and decisions

### GDPR Compliance

- [ ] **GDPR-01**: User can request data export (right to portability)
- [ ] **GDPR-02**: Data export generates downloadable file within 30 days
- [ ] **GDPR-03**: User can request account deletion (right to be forgotten)
- [ ] **GDPR-04**: Account deletion cascades to all user data with 30-day grace period
- [ ] **GDPR-05**: Deletion propagates to third-party processors (S3, Cloudinary)

### Device Experience

- [ ] **DEV-01**: Player displays QR code for easier device pairing
- [ ] **DEV-02**: Kiosk mode has emergency exit mechanism (tap sequence + PIN)
- [ ] **DEV-03**: Emergency exit works offline without server verification

### Advanced Analytics

- [ ] **ANA-01**: View duration tracked (how long content displayed)
- [ ] **ANA-02**: View completion rates calculated (% of scheduled duration shown)
- [ ] **ANA-03**: Content performance dashboard shows metrics by content item
- [ ] **ANA-04**: Time-based heatmap shows peak viewing periods

## v2 Requirements

Deferred to future release:

### Advanced Analytics
- **ANA-05**: Location-based heatmaps (requires geolocation queries)
- **ANA-06**: Audience measurement via camera (privacy implications)
- **ANA-07**: A/B testing infrastructure for content comparison

### Device Experience
- **DEV-04**: Multi-level kiosk PIN (device vs tenant level)
- **DEV-05**: Remote kiosk unlock from admin panel

### Compliance
- **GDPR-06**: Consent management UI for data collection
- **GDPR-07**: Automated data retention policies

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat | Not core to signage value |
| Video transcoding | Assume pre-processed media |
| Mobile native apps | Web player covers all platforms |
| Multi-region data residency | Single Supabase instance |
| Offline admin UI | Admin requires connectivity |
| TypeScript migration | Too disruptive; JavaScript works |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| TEST-04 | Phase 1 | Complete |
| SEC-01 | Phase 2 | Complete |
| SEC-02 | Phase 2 | Complete |
| SEC-03 | Phase 3 | Complete |
| SEC-04 | Phase 3 | Complete |
| SEC-05 | Phase 4 | Pending |
| FIX-01 | Phase 5 | Pending |
| FIX-02 | Phase 5 | Pending |
| FIX-03 | Phase 5 | Pending |
| FIX-04 | Phase 5 | Pending |
| FIX-05 | Phase 5 | Pending |
| PLR-01 | Phase 6 | Pending |
| PLR-02 | Phase 6 | Pending |
| PLR-03 | Phase 6 | Pending |
| PLR-04 | Phase 6 | Pending |
| REF-01 | Phase 7 | Pending |
| REF-02 | Phase 7 | Pending |
| REF-03 | Phase 8 | Pending |
| REF-04 | Phase 8 | Pending |
| REF-05 | Phase 8 | Pending |
| REF-06 | Phase 8 | Pending |
| REF-07 | Phase 8 | Pending |
| DEV-01 | Phase 9 | Pending |
| DEV-02 | Phase 9 | Pending |
| DEV-03 | Phase 9 | Pending |
| ANA-01 | Phase 10 | Pending |
| ANA-02 | Phase 10 | Pending |
| ANA-03 | Phase 10 | Pending |
| ANA-04 | Phase 10 | Pending |
| GDPR-01 | Phase 11 | Pending |
| GDPR-02 | Phase 11 | Pending |
| GDPR-03 | Phase 11 | Pending |
| GDPR-04 | Phase 11 | Pending |
| GDPR-05 | Phase 11 | Pending |
| APR-01 | Phase 12 | Pending |
| APR-02 | Phase 12 | Pending |
| APR-03 | Phase 12 | Pending |
| APR-04 | Phase 12 | Pending |
| APR-05 | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 — Phase 3 complete (SEC-03, SEC-04)*
