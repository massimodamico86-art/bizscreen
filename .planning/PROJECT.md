# BizScreen

## What This Is

BizScreen is a digital signage platform enabling businesses to manage content across distributed screens. Users create playlists, design scenes with a visual editor, schedule content by time/day with campaigns and priorities, browse a templates marketplace for pre-built content, manage multi-language content with device-specific delivery, and monitor device status remotely. The platform supports multi-tenant architecture with role-based access, feature-gated plans, and offline-capable player devices.

## Core Value

**Screens reliably display the right content at the right time, even when offline.** Everything else — the editor, the scheduling, the templates, the translations — exists to ensure content reaches screens correctly and plays without interruption.

## Requirements

### Validated

These capabilities shipped and are production-verified:

**v1 Production Release (2026-01-24):**
- ✓ User authentication with MFA support — v1
- ✓ Screen registration with OTP pairing codes — v1
- ✓ Remote device commands (reboot, reload, clear cache) — v1
- ✓ Screen heartbeat and online/offline status — v1
- ✓ Media upload with S3 presigned URLs — v1
- ✓ Playlist CRUD with item reordering — v1
- ✓ Scene design with visual editor (Polotno) — v1
- ✓ Layout creation with zone management — v1
- ✓ Schedule creation with time/day rules — v1
- ✓ Real-time content sync to devices — v1
- ✓ Offline content caching in player — v1
- ✓ Play count and uptime analytics — v1
- ✓ Role-based access control (RLS) — v1
- ✓ Content approval workflow — v1
- ✓ GDPR compliance (export, deletion) — v1
- ✓ XSS prevention, password policies, rate limiting — v1

**v2 Templates & Platform Polish (2026-01-27):**
- ✓ Templates marketplace with browse, search, preview, one-click apply — v2
- ✓ Favorites, recents, and starter packs — v2
- ✓ Template customization wizard — v2
- ✓ Template ratings and suggestions — v2
- ✓ Language variants of scenes — v2
- ✓ Device language assignment with fallback — v2
- ✓ Translation dashboard and AI suggestions — v2
- ✓ Campaigns with priority scheduling — v2
- ✓ Emergency content override — v2
- ✓ Dayparting presets — v2
- ✓ Campaign analytics and templates — v2
- ✓ Mobile responsive admin UI — v2
- ✓ Dashboard redesign with health indicators — v2
- ✓ Guided onboarding flow — v2

### Active

No active requirements. Ready for v3 planning.

### Out of Scope

- Real-time chat between users — not core to signage value
- Video transcoding/processing — assume pre-processed media
- Mobile native apps — web player covers all platforms
- Multi-region data residency — single Supabase instance
- Offline-first admin UI — admin requires connectivity
- TypeScript migration — too disruptive; JavaScript works
- RTL language support (Hebrew, Arabic) — requires complete UI/content mirroring
- CJK languages — font/rendering complexity, special testing required
- User template marketplace (buy/sell) — complex moderation/payment
- AI-generated templates — unpredictable results
- Conditional scheduling triggers — high complexity
- Per-viewer personalization — privacy concerns

## Context

**Current State (Post v2):**
- React 19 SPA with Supabase backend (auth, database, real-time)
- 178,160 lines of JavaScript/JSX across codebase
- Player component supports web, Android, iOS, WebOS, Tizen
- Multi-tenant with feature flags for plan differentiation
- AWS S3 for media storage with CloudFront CDN
- Templates marketplace with 13 template features
- Multi-language content with 10 language features
- Advanced scheduling with 12 scheduling features
- Mobile responsive admin and guided onboarding

**Technical Debt:**
- Player.jsx at 1,265 lines (265 over target, accepted)
- Template usage analytics not recorded for starter packs
- Campaign rotation weights not enforced in player

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
| Player.jsx hooks before component extraction | Proven pattern needed first | ✓ Good — pattern works |
| Accept 1,265 lines Player.jsx | 56% reduction still achieved | ✓ Acceptable |
| Build order: Scheduling > Templates > Multi-Language | Risk order (extends > enhances > new) | ✓ Good — smooth progression |
| TZDate for schedule calculations | DST-safe handling required | ✓ Good — no DST bugs |
| Separate scenes for language variants | Simpler than embedded JSONB | ✓ Good — clean model |
| 3-level language fallback via RPC | Prevent blank screens | ✓ Good — no blank screens |
| Emergency bypasses language resolution | Same content for all devices | ✓ Good — instant push works |
| Starter packs via inline expansion | Better UX than separate page | ✓ Good — high engagement |
| Modal wizard for customization | Single-screen form per research | ✓ Good — fast completion |

---
*Last updated: 2026-01-27 after v2 milestone*
