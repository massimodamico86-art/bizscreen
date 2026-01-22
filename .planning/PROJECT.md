# BizScreen

## What This Is

BizScreen is a digital signage platform enabling businesses to manage content across distributed screens. Users create playlists, design scenes with a visual editor, schedule content by time/day, and monitor device status remotely. The platform supports multi-tenant architecture with role-based access, feature-gated plans, and offline-capable player devices.

## Core Value

**Screens reliably display the right content at the right time, even when offline.** Everything else — the editor, the scheduling, the analytics — exists to ensure content reaches screens correctly and plays without interruption.

## Requirements

### Validated

These capabilities exist and work in the current codebase:

- ✓ User authentication with MFA support — existing
- ✓ Screen registration with OTP pairing codes — existing
- ✓ Remote device commands (reboot, reload, clear cache) — existing
- ✓ Screen heartbeat and online/offline status — existing
- ✓ Media upload with S3 presigned URLs — existing
- ✓ Media deletion with reference checking — existing
- ✓ Playlist CRUD with item reordering — existing
- ✓ Scene design with visual editor (Polotno) — existing
- ✓ Layout creation with zone management — existing
- ✓ Schedule creation with time/day rules — existing
- ✓ Filler content for empty schedule slots — existing
- ✓ Real-time content sync to devices — existing
- ✓ Offline content caching in player — existing
- ✓ Play count and uptime analytics — existing
- ✓ User invite and team management — existing
- ✓ Role-based access control (RLS) — existing
- ✓ Feature flags for plan-gated features — existing
- ✓ Login rate limiting (5 attempts → 15min lockout) — existing
- ✓ Activity audit logging — existing
- ✓ Server-side pagination on content lists — existing

### Active

**Phase 1: Stabilization & Hardening**

Critical Fixes:
- [ ] L1: Wire up schedule conflict detection UI — database function exists, UI doesn't call it
- [ ] L2: Implement `createTemplateFromLayout()` — currently throws "not implemented"
- [ ] L5: Add timezone validation with IANA format check and DST handling
- [ ] L6: Replace email notification stub with real provider (or disable feature)
- [ ] L8: Enforce storage quotas with warnings at 80% and blocking at 100%

Security:
- [ ] M1: Password policies — minimum 8 chars, complexity requirements
- [ ] M4: Global API rate limiting beyond login endpoint
- [ ] Replace 197+ console.log calls with structured logger
- [ ] Fix XSS vulnerabilities in HelpCenterPage (dangerouslySetInnerHTML)
- [ ] Fix innerHTML mutation in SVG editor LeftSidebar

Player Reliability:
- [ ] L3: Add retry with exponential backoff for failed syncs
- [ ] L4: Complete offline screenshot sync implementation
- [ ] L7: Verify kiosk exit password is actually checked in player

Refactoring:
- [ ] Split Player.jsx (3476 lines) into focused components
- [ ] Split MediaLibraryPage.jsx (2537 lines)
- [ ] Split ScreensPage.jsx (1929 lines)
- [ ] Split PlaylistEditorPage.jsx (1915 lines)
- [ ] Split CampaignEditorPage.jsx (1390 lines)
- [ ] Split FeatureFlagsPage.jsx (1337 lines)

**Phase 2: New Features**

Content Approval Workflow:
- [ ] Submit content for approval
- [ ] Review queue for approvers
- [ ] Approve/reject with comments
- [ ] Conditional publishing based on approval status

GDPR Compliance:
- [ ] User data export (right to portability)
- [ ] Account deletion cascade (right to be forgotten)
- [ ] Consent tracking for data collection

Device Experience:
- [ ] QR code display in player for easier pairing
- [ ] Emergency kiosk exit mechanism (override for locked screens)

Advanced Analytics:
- [ ] View duration tracking (how long content watched)
- [ ] View completion rates (% of content watched)
- [ ] Content performance heatmaps by time/location

### Out of Scope

- Real-time chat between users — not core to signage value
- Video transcoding/processing — assume pre-processed media
- Mobile native apps — web player covers all platforms
- Multi-region data residency — single Supabase instance
- Offline-first admin UI — admin requires connectivity

## Context

**Current State:**
- React 19 SPA with Supabase backend (auth, database, real-time)
- 43,416 lines of service code across 101 service files
- Player component supports web, Android, iOS, WebOS, Tizen
- Multi-tenant with feature flags for plan differentiation
- AWS S3 for media storage with CloudFront CDN

**Technical Debt Identified:**
- Player.jsx is 3476 lines handling multiple concerns
- 5 page components exceed 1300 lines each
- 197+ console.log statements need logger replacement
- Several stub functions throwing "not implemented"
- Empty catch blocks in player offline code

**Codebase Mapping:**
- `.planning/codebase/ARCHITECTURE.md` — system design
- `.planning/codebase/STACK.md` — technology stack
- `.planning/codebase/CONCERNS.md` — tech debt and risks

## Constraints

- **Tech stack**: React + Supabase + S3 — existing architecture, no migration
- **Player compatibility**: Must work across web, Android, iOS, WebOS, Tizen
- **Offline capability**: Player must function without network connectivity
- **Multi-tenant**: All changes must respect tenant isolation via RLS
- **Backward compatibility**: Existing screens in field must continue working

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stabilize before new features | Logic gaps pose production risk | — Pending |
| Full refactoring approved | Large components block maintenance | — Pending |
| All 4 Phase 2 features included | User wants complete product | — Pending |
| Comprehensive scope | User selected all options | — Pending |

---
*Last updated: 2026-01-22 after initialization*
