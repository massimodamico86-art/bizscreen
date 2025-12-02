# BizScreen Architecture

## Overview

BizScreen is a multi-tenant digital signage platform with these core layers:

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                │
│  ├── Dashboard (Admin UI)                               │
│  ├── Player (TV display app)                            │
│  └── TV (Legacy simple display)                         │
├─────────────────────────────────────────────────────────┤
│                   Vercel API Routes                     │
│  ├── /api/screens/* - Device pairing & telemetry        │
│  ├── /api/public/*  - Public API (token-auth)           │
│  ├── /api/billing/* - Stripe integration                │
│  ├── /api/sso/*     - Enterprise SSO (OIDC/SAML)        │
│  └── /api/scim/*    - User provisioning                 │
├─────────────────────────────────────────────────────────┤
│                      Supabase                           │
│  ├── PostgreSQL + RLS (multi-tenant isolation)          │
│  ├── Auth (JWT)                                         │
│  └── Storage (media files via Cloudinary)               │
└─────────────────────────────────────────────────────────┘
```

## Core Data Flow

```
Tenant → Screen → (Campaign|Schedule|Layout|Playlist) → Player
```

1. **Tenant** creates screens, uploads media, builds playlists
2. **Screen** is paired via OTP code, assigned content
3. **Content resolution** checks: Active Campaign > Schedule > Default Playlist
4. **Player** fetches resolved content, displays it, sends telemetry

## Key Services

| Service | Responsibility |
|---------|----------------|
| `screenService` | Screen CRUD, OTP generation, pairing |
| `playerService` | Content resolution, command handling, offline cache |
| `playlistService` | Playlist CRUD, item ordering |
| `layoutService` | Multi-zone layout management |
| `scheduleService` | Time-based content scheduling |
| `campaignService` | Priority content campaigns |
| `mediaService` | Media upload (Cloudinary), metadata |
| `analyticsService` | Playback tracking, reports |
| `tenantService` | Multi-tenant management, impersonation |
| `billingService` | Stripe subscriptions, plan limits |
| `ssoService` | Enterprise SSO providers |
| `resellerService` | Reseller accounts, licensing |

## Authentication & Authorization

- **Frontend**: Supabase Auth (JWT)
- **API Routes**: JWT validation or API token (hashed)
- **RLS**: Row-level security on all tables using `auth.uid()` and `managed_by` pattern
- **RBAC**: Roles: `super_admin`, `admin`, `user`, `reseller`

## Multi-Tenancy

- Each user is their own tenant (`profiles.id = tenant_id`)
- Resellers manage multiple tenants (`profiles.managed_by`)
- RLS policies enforce tenant isolation at database level

## Rate Limiting

All API endpoints use configurable rate limiting:
- `public`: 60/min (pairing, preview)
- `authenticated`: 120/min (standard ops)
- `sensitive`: 10/15min (login, invite)
- `aiAssistant`: 10/min (AI features)
- `telemetry`: 300/min (device heartbeats)

## Deployment

- Frontend: Vercel (static + serverless)
- Database: Supabase hosted PostgreSQL
- Media: Cloudinary CDN
- Emails: Resend
