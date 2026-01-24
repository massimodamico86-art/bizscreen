# BizScreen

## What This Is

BizScreen is a digital signage platform enabling businesses to manage content across distributed screens. Users create playlists, design scenes with a visual editor, schedule content by time/day, and monitor device status remotely. The platform supports multi-tenant architecture with role-based access, feature-gated plans, and offline-capable player devices.

## Core Value

**Screens reliably display the right content at the right time, even when offline.** Everything else — the editor, the scheduling, the analytics — exists to ensure content reaches screens correctly and plays without interruption.

## Requirements

### Validated

These capabilities shipped in v1 Production Release (2026-01-24):

**Pre-existing (validated before v1):**
- ✓ User authentication with MFA support
- ✓ Screen registration with OTP pairing codes
- ✓ Remote device commands (reboot, reload, clear cache)
- ✓ Screen heartbeat and online/offline status
- ✓ Media upload with S3 presigned URLs
- ✓ Media deletion with reference checking
- ✓ Playlist CRUD with item reordering
- ✓ Scene design with visual editor (Polotno)
- ✓ Layout creation with zone management
- ✓ Schedule creation with time/day rules
- ✓ Filler content for empty schedule slots
- ✓ Real-time content sync to devices
- ✓ Offline content caching in player
- ✓ Play count and uptime analytics
- ✓ User invite and team management
- ✓ Role-based access control (RLS)
- ✓ Feature flags for plan-gated features
- ✓ Login rate limiting (5 attempts → 15min lockout)
- ✓ Activity audit logging
- ✓ Server-side pagination on content lists

**Testing Infrastructure (v1):**
- ✓ Player characterization tests (offline, sync, heartbeat) — v1
- ✓ Critical service unit tests (scheduleService, offlineService) — v1

**Security Hardening (v1):**
- ✓ XSS prevention with DOMPurify sanitization — v1
- ✓ Password policy (8+ chars, complexity) — v1
- ✓ Global API rate limiting — v1
- ✓ Structured logging with PII redaction — v1

**Critical Fixes (v1):**
- ✓ Schedule conflict detection UI — v1
- ✓ Save layout as template — v1
- ✓ Timezone validation (IANA format) — v1
- ✓ Storage quota enforcement — v1
- ✓ Email notifications via Resend — v1

**Player Reliability (v1):**
- ✓ Exponential backoff with jitter — v1
- ✓ Offline screenshot sync — v1
- ✓ Kiosk password validation — v1
- ✓ Error logging in catch blocks — v1

**Refactoring (v1):**
- ✓ Player custom hooks extracted — v1
- ✓ MediaLibraryPage refactored — v1
- ✓ ScreensPage refactored — v1
- ✓ PlaylistEditorPage refactored — v1
- ✓ CampaignEditorPage refactored — v1
- ✓ FeatureFlagsPage refactored — v1

**Device Experience (v1):**
- ✓ QR code pairing — v1
- ✓ Hidden kiosk exit (tap sequence + PIN) — v1
- ✓ Offline PIN validation — v1

**Analytics (v1):**
- ✓ View duration tracking — v1
- ✓ Completion rates — v1
- ✓ Content performance dashboard — v1
- ✓ Viewing heatmaps (7x24 grid) — v1

**GDPR Compliance (v1):**
- ✓ Data export (right to portability) — v1
- ✓ Account deletion with cascade — v1
- ✓ S3/Cloudinary media cleanup — v1

**Content Approval (v1):**
- ✓ Submit for approval — v1
- ✓ Review queue — v1
- ✓ Approve/reject with comments — v1
- ✓ Publishing gate (block unapproved) — v1
- ✓ Email notifications — v1

### Active

*(To be defined in next milestone)*

### Out of Scope

- Real-time chat between users — not core to signage value
- Video transcoding/processing — assume pre-processed media
- Mobile native apps — web player covers all platforms
- Multi-region data residency — single Supabase instance
- Offline-first admin UI — admin requires connectivity
- TypeScript migration — too disruptive; JavaScript works

## Context

**Current State (Post v1):**
- React 19 SPA with Supabase backend (auth, database, real-time)
- 165,290 lines of JavaScript/JSX across codebase
- Player component supports web, Android, iOS, WebOS, Tizen
- Multi-tenant with feature flags for plan differentiation
- AWS S3 for media storage with CloudFront CDN
- 12 database migrations added in v1

**Technical Debt:**
- Player.jsx at 2775 lines (hooks extracted, component splitting deferred)
- 38% of services lack structured logging
- MediaLibraryPage 9% over target (875 vs 800 lines)
- 1 flaky test in useCampaignEditor

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
| Stabilize before new features | Logic gaps pose production risk | ✓ Good — v1 stable |
| Full refactoring approved | Large components block maintenance | ✓ Good — 70% reduction |
| All 4 Phase 2 features included | User wants complete product | ✓ Good — all shipped |
| Comprehensive scope | User selected all options | ✓ Good — v1 complete |
| Hooks before component extraction | Proven pattern needed first | ✓ Good — pattern works |
| Accept 9% deviation on MediaLibraryPage | 60% reduction still achieved | ✓ Acceptable |
| Full jitter for retry backoff | Prevents thundering herd | ✓ Good — implemented |

---
*Last updated: 2026-01-24 after v1 milestone*
