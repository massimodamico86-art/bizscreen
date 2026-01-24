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
- [x] **SEC-05**: Console.log calls (197+) replaced with structured logger

### Critical Fixes

- [x] **FIX-01**: Schedule conflict detection UI shows warnings when creating overlapping entries
- [x] **FIX-02**: createTemplateFromLayout() implemented — users can save layouts as templates
- [x] **FIX-03**: Timezone validation enforces IANA format with DST handling
- [x] **FIX-04**: Storage quota enforcement warns at 80%, blocks at 100%
- [x] **FIX-05**: Email notifications use Resend provider (replace stub)

### Player Reliability

- [~] **PLR-01**: Failed syncs retry with exponential backoff and jitter *(partial: playerService has full jitter, Player.jsx uses 0-25% — deferred to Phase 7 refactoring)*
- [x] **PLR-02**: Offline screenshot sync implemented — queued screenshots upload on reconnect
- [x] **PLR-03**: Kiosk exit password validation verified working in player
- [x] **PLR-04**: Empty catch blocks replaced with proper error handling and logging

### Refactoring

- [~] **REF-01**: Player.jsx split into focused components (SceneRenderer, PlayerControls, etc.) *(partial: hooks and widgets extracted, component file splitting deferred)*
- [x] **REF-02**: Player custom hooks extracted (usePlayerContent, usePlayerHeartbeat, etc.)
- [x] **REF-03**: MediaLibraryPage.jsx split into sub-components with custom hooks
- [x] **REF-04**: ScreensPage.jsx split into sub-components with custom hooks
- [x] **REF-05**: PlaylistEditorPage.jsx split into sub-components with custom hooks
- [x] **REF-06**: CampaignEditorPage.jsx split into sub-components with custom hooks
- [x] **REF-07**: FeatureFlagsPage.jsx split into sub-components with custom hooks

### Content Approval Workflow

- [x] **APR-01**: Content can be submitted for approval with status tracking
- [x] **APR-02**: Approvers see review queue with pending submissions
- [x] **APR-03**: Approvers can approve/reject with comments
- [x] **APR-04**: Content publishing conditional on approval status
- [x] **APR-05**: Email notifications sent for approval requests and decisions

### GDPR Compliance

- [x] **GDPR-01**: User can request data export (right to portability)
- [x] **GDPR-02**: Data export generates downloadable file within 30 days
- [x] **GDPR-03**: User can request account deletion (right to be forgotten)
- [x] **GDPR-04**: Account deletion cascades to all user data with 30-day grace period
- [x] **GDPR-05**: Deletion propagates to third-party processors (S3, Cloudinary)

### Device Experience

- [x] **DEV-01**: Player displays QR code for easier device pairing
- [x] **DEV-02**: Kiosk mode has emergency exit mechanism (tap sequence + PIN)
- [x] **DEV-03**: Emergency exit works offline without server verification

### Advanced Analytics

- [x] **ANA-01**: View duration tracked (how long content displayed)
- [x] **ANA-02**: View completion rates calculated (% of scheduled duration shown)
- [x] **ANA-03**: Content performance dashboard shows metrics by content item
- [x] **ANA-04**: Time-based heatmap shows peak viewing periods

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
| SEC-05 | Phase 4 | Complete |
| FIX-01 | Phase 5 | Complete |
| FIX-02 | Phase 5 | Complete |
| FIX-03 | Phase 5 | Complete |
| FIX-04 | Phase 5 | Complete |
| FIX-05 | Phase 5 | Complete |
| PLR-01 | Phase 7 | Complete |
| PLR-02 | Phase 6 | Complete |
| PLR-03 | Phase 6 | Complete |
| PLR-04 | Phase 6 | Complete |
| REF-01 | Phase 7 | Partial |
| REF-02 | Phase 7 | Complete |
| REF-03 | Phase 8 | Complete |
| REF-04 | Phase 8 | Complete |
| REF-05 | Phase 8 | Complete |
| REF-06 | Phase 8 | Complete |
| REF-07 | Phase 8 | Complete |
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
| APR-01 | Phase 12 | Complete |
| APR-02 | Phase 12 | Complete |
| APR-03 | Phase 12 | Complete |
| APR-04 | Phase 12 | Complete |
| APR-05 | Phase 12 | Complete |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-23 — Phase 8 complete (REF-03, REF-04, REF-05, REF-06, REF-07)*
