# Architecture

**Analysis Date:** 2026-01-29

## Pattern Overview

**Overall:** Multi-Tenant SaaS with Role-Based Access Control (RBAC)

**Key Characteristics:**
- React SPA with centralized state management through Context API
- Service layer architecture with clear separation between UI and data access
- Multi-tenant isolation enforced at database level via Supabase RLS
- Feature flagging system for plan-based capabilities
- Three deployment targets: web dashboard, TV player, marketing site

## Layers

**Presentation Layer:**
- Purpose: User interface components and routing
- Location: `src/pages/`, `src/components/`, `src/marketing/`
- Contains: Page components, reusable UI components, marketing pages
- Depends on: Contexts, hooks, services, design system
- Used by: Router

**Router Layer:**
- Purpose: Route management and authentication guards
- Location: `src/router/AppRouter.jsx`, `src/App.jsx`
- Contains: Route definitions, lazy loading, auth protection, public/private route guards
- Depends on: Contexts (AuthContext), pages
- Used by: Application entry point

**Context Layer:**
- Purpose: Global application state and cross-cutting concerns
- Location: `src/contexts/`
- Contains: AuthContext, BrandingContext, EmergencyContext, FeatureFlagProvider
- Depends on: Services, Supabase client
- Used by: All components requiring global state

**Service Layer:**
- Purpose: Business logic and external integrations
- Location: `src/services/`
- Contains: 100+ service modules for domain operations (media, playlists, scenes, campaigns, analytics, etc.)
- Depends on: Supabase client, config, utilities
- Used by: Pages, components, hooks, contexts

**Data Access Layer:**
- Purpose: Database communication and authentication
- Location: `src/supabase.js`
- Contains: Supabase client configuration with PKCE auth flow
- Depends on: Environment configuration
- Used by: Services, contexts

**Configuration Layer:**
- Purpose: Application settings and feature definitions
- Location: `src/config/`
- Contains: `plans.js` (plan tiers, limits), `appCatalog.js`, `featureFlags.js`, `env.js`
- Depends on: Nothing (leaf layer)
- Used by: Services, components, feature gates

**Utility Layer:**
- Purpose: Shared helper functions
- Location: `src/utils/`
- Contains: Error handling, formatting, PII sanitization, SEO helpers
- Depends on: Nothing (leaf layer)
- Used by: All layers

**Player Layer:**
- Purpose: TV/screen playback runtime
- Location: `src/player/`, `src/Player.jsx`, `src/TV.jsx`
- Contains: Content rendering, offline caching, OTP pairing, zone players
- Depends on: Services (playerService, offlineService), hooks
- Used by: Deployed screens and TV devices

## Data Flow

**Authentication Flow:**

1. User visits app → `main.jsx` renders with `<AuthProvider>`
2. `AuthContext` checks Supabase session → fetches user profile
3. `AppRouter` evaluates authentication state → routes to login or app
4. Protected routes wrapped in `<RequireAuth>` → redirects if no session
5. Profile includes role → used for RBAC throughout app

**State Management:**
- Global: React Context API for auth, branding, emergency alerts, feature flags
- Local: Component state with useState/useReducer
- Server cache: Custom hooks (useMedia, useLayout) with manual refetch patterns
- No global state manager (Redux/Zustand) - contexts handle cross-component state

**Content Publishing Flow:**

1. User creates content (scene/playlist/layout) → service layer CRUD
2. Optional: Approval workflow if user role requires review
3. Content saved to Supabase → RLS enforces tenant isolation
4. Screen assigned content → writes to `screens` table
5. TV player polls `playerService.getPlayerContent()` → resolves content hierarchy
6. Player renders content → reports analytics back to service layer

**Multi-Tenant Isolation:**

1. User authenticates → JWT token includes tenant claims
2. Every Supabase query → RLS policies filter by `tenant_id` or `owner_id`
3. Service functions → tenant context implicit from auth session
4. Cross-tenant operations (resellers, admins) → explicit tenant switching

## Key Abstractions

**Scene:**
- Purpose: Central content orchestration unit linking layout + playlists + business settings
- Examples: `src/services/sceneService.js`, `src/pages/SceneDetailPage.jsx`
- Pattern: Aggregate root that composes layouts, playlists, and configuration

**Layout:**
- Purpose: Screen spatial composition with zones for content
- Examples: `src/services/layoutService.js`, `src/layouts/Layout1.jsx` through `Layout4.jsx`
- Pattern: Template pattern with preset layouts and custom zones

**Playlist:**
- Purpose: Ordered collection of media items with timing and transitions
- Examples: `src/services/playlistService.js`, `src/pages/PlaylistEditorPage.jsx`
- Pattern: Composite pattern with nested playlist items

**Media Asset:**
- Purpose: Content files (images, videos, documents) stored in S3
- Examples: `src/services/mediaService.js`, `src/services/s3UploadService.js`
- Pattern: Repository pattern with cloud storage abstraction

**Campaign:**
- Purpose: Time-based content scheduling with conditions
- Examples: `src/services/campaignService.js`, `src/pages/CampaignsPage.jsx`
- Pattern: Strategy pattern for conditional content delivery

**Service Module:**
- Purpose: Domain-specific business logic with database operations
- Examples: All files in `src/services/` (100+ modules)
- Pattern: Service layer pattern - pure functions that accept params and return promises

**Feature Gate:**
- Purpose: Plan-based feature access control
- Examples: `src/components/FeatureGate.jsx`, `src/config/plans.js`
- Pattern: Decorator pattern with upgrade prompts

## Entry Points

**Web Application Entry:**
- Location: `src/main.jsx`
- Triggers: Browser navigation to root URL
- Responsibilities: Renders React app with providers (Error, I18n, Auth, FeatureFlag), mounts BrowserRouter, injects global CSS

**App Router:**
- Location: `src/router/AppRouter.jsx`
- Triggers: Route changes in browser
- Responsibilities: Lazy loads pages, enforces authentication, redirects based on user state, handles marketing vs app routing

**Main Application:**
- Location: `src/App.jsx`
- Triggers: Authenticated user navigates to `/app/*`
- Responsibilities: Renders navigation, sidebar, page content, handles impersonation banner, onboarding flows

**TV Player:**
- Location: `src/TV.jsx` and `src/Player.jsx`
- Triggers: Device navigates to `/tv/*` or `/player/*` with OTP
- Responsibilities: Polls for content updates, renders layouts with zones, handles offline caching, reports heartbeat/analytics

**Marketing Site:**
- Location: `src/marketing/MarketingLayout.jsx`, `src/marketing/HomePage.jsx`
- Triggers: Unauthenticated user visits root `/`
- Responsibilities: SEO-optimized landing pages, pricing information, signup flows

**Vite Dev Server API:**
- Location: `vite.config.js` (custom plugin)
- Triggers: Development mode `/api/*` requests
- Responsibilities: Handles S3 presigned URL generation, health checks (mocks production API routes)

## Error Handling

**Strategy:** Layered error handling with graceful degradation

**Patterns:**
- React Error Boundaries at app root (`src/components/ErrorBoundary.jsx`)
- Service layer throws errors → caught in components → displayed via Toast notifications
- Async errors handled with try/catch in useEffect/event handlers
- Supabase errors checked with `if (error) throw error` pattern
- Player has offline fallback with cached content
- Rate limiting enforced in service layer (`rateLimitService.js`)
- Sentry integration for production error tracking (`@sentry/react`)

## Cross-Cutting Concerns

**Logging:**
- Scoped loggers via `loggingService.js` with `createScopedLogger(scope)`
- Console methods (debug, info, warn, error) with structured context
- Stripped in production builds via Terser configuration
- Custom hook: `useLogger(scope)` for component logging

**Validation:**
- Service-layer validation for file types, sizes, required fields
- Form validation in components (no dedicated library)
- Supabase database constraints enforce data integrity
- PII sanitization in `utils/pii.js` before logging

**Authentication:**
- Supabase Auth with PKCE flow (`supabase.js`)
- Session persisted in localStorage, auto-refresh enabled
- `AuthContext` provides `user`, `userProfile`, `loading` state
- Profile includes role → determines permissions throughout app
- Impersonation support for admin/reseller roles (`tenantService.stopImpersonation`)

**Authorization:**
- Role-Based Access Control (RBAC) with roles: client, manager, admin, reseller, super_admin
- `permissionsService.js` checks user capabilities
- Approval workflows for certain roles (`approvalService.js`)
- Feature gates check plan tier (`FeatureGate.jsx`, `plans.js`)
- RLS policies at database layer enforce tenant boundaries

---

*Architecture analysis: 2026-01-29*
