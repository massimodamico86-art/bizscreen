# Architecture

**Analysis Date:** 2026-02-17

## Pattern Overview

**Overall:** Single-Page Application (SPA) with React, split into three distinct runtime surfaces: the admin dashboard app (`/app/*`), the TV player (`/player/*` and `/tv/*`), and the marketing site (`/`, `/pricing`, `/features`).

**Key Characteristics:**
- Supabase as the primary backend (PostgreSQL with Row-Level Security, Realtime WebSockets, Edge Functions)
- State-machine-style page navigation inside the admin app (string-keyed `currentPage` state, not URL-based routing within the app)
- Feature-flag system layered over plan tiers — features are gated at render time via `<FeatureGate>` or `useFeatureFlag`
- Massive flat service layer (`src/services/`) — 90+ named service files, each wrapping Supabase queries or external APIs
- Two separate player surfaces: legacy `TV.jsx` (OTP layout-config) and modern `Player.jsx` (scene/playlist/widget system)

## Layers

**Routing Layer:**
- Purpose: URL-based routing for top-level surfaces and auth protection
- Location: `src/router/AppRouter.jsx`
- Contains: `RequireAuth`, `PublicRoute`, marketing routes, auth routes, player routes, `/app/*` protected catch-all
- Depends on: `AuthContext`, `react-router-dom`, `SentryRoutes`
- Used by: `src/main.jsx` (renders inside `<BrowserRouter>`)

**Provider/Context Layer:**
- Purpose: Global state shared across the component tree
- Location: `src/contexts/`, `src/hooks/useFeatureFlag.jsx`, `src/i18n/I18nContext.jsx`
- Contains:
  - `AuthContext.jsx` — user session, userProfile, auth retry/status machine
  - `BrandingContext.jsx` — white-label branding, client impersonation state
  - `EmergencyContext.jsx` — emergency content banner active state
  - `FeatureFlagProvider` (in `useFeatureFlag.jsx`) — plan/tenant feature flags
  - `I18nProvider` (in `I18nContext.jsx`) — locale, `t()` function
- Depends on: `src/supabase.js`, `src/services/`
- Used by: All pages and components

**App Shell Layer:**
- Purpose: Layout, navigation, and page dispatch for the authenticated admin UI
- Location: `src/App.jsx`
- Contains: Sidebar nav, mobile nav, header, Suspense-wrapped lazy pages, `currentPage` state, real-time listing subscription
- Depends on: All contexts, all lazy-loaded pages
- Used by: `AppRouter` mounts this at `/app/*`

**Pages Layer:**
- Purpose: Full-page views for each feature area
- Location: `src/pages/`, `src/pages/Admin/`, `src/pages/LayoutEditor/`, `src/pages/LayoutTemplates/`, `src/auth/`, `src/marketing/`
- Contains: 70+ page components, each responsible for one feature domain
- Depends on: `src/services/`, `src/hooks/`, `src/components/`, `src/contexts/`
- Used by: `App.jsx` lazy-loads them; router for auth/marketing/special routes

**Components Layer:**
- Purpose: Reusable UI components scoped to feature domains
- Location: `src/components/` (feature-scoped subdirs), `src/design-system/components/` (primitives)
- Contains: Feature components (`campaigns/`, `media/`, `schedules/`, `screens/`, `scene-editor/`, `layout-editor/`, etc.) and design-system primitives (`Button`, `Modal`, `Alert`, `PageLayout`, `FilterChips`)
- Depends on: `src/services/`, `src/hooks/`, `src/design-system/`
- Used by: Pages layer

**Service Layer:**
- Purpose: All data access, external API calls, and business logic
- Location: `src/services/`
- Contains: 90+ service files. Each wraps Supabase table queries, RPC calls, or external APIs. Named with `*Service.js` suffix.
- Key files: `mediaService.js`, `playlistService.js`, `scheduleService.js`, `screenService.js`, `featureFlagService.js`, `loggingService.js`, `realtimeService.js`, `playerService.js`, `approvalService.js`
- Depends on: `src/supabase.js`
- Used by: Pages, hooks, contexts, player

**Hooks Layer:**
- Purpose: Reusable stateful logic
- Location: `src/hooks/`, `src/pages/hooks/`, `src/player/hooks/`
- Contains: `useMedia`, `useLayout`, `useFeatureFlag`, `useLogger`, `useUnifiedOnboarding`, `useS3Upload`, player-specific hooks
- Depends on: `src/services/`, `src/supabase.js`

**Player Subsystem:**
- Purpose: TV/screen content playback runtime (entirely separate from admin UI)
- Location: `src/player/`
- Contains:
  - `src/Player.jsx` — router entry point (`/player/`, `/player/view`)
  - `src/player/pages/ViewPage.jsx` — main playback orchestrator
  - `src/player/components/AppRenderer.jsx` — widget/app type routing
  - `src/player/components/LayoutRenderer.jsx` — multi-zone layout grid
  - `src/player/components/SceneRenderer.jsx` — slide/block/transition rendering with data binding
  - `src/player/components/ZonePlayer.jsx` — zone-level playlist/content playback
  - `src/player/components/widgets/` — individual widget components (Clock, Weather, RSS, QRCode, SocialFeed, Countdown, DataTable, ClockDate)
  - `src/player/hooks/` — `usePlayerContent`, `usePlayerHeartbeat`, `usePlayerCommands`, `usePlayerPlayback`, `useKioskMode`, `useStuckDetection`, `useDataRefreshOrchestrator`
  - `src/player/contexts/DataRefreshContext.jsx` — coordinates batched widget data fetches
  - `src/player/offlineService.js`, `src/player/cacheService.js` — offline/IndexedDB support
- Depends on: `src/services/playerService.js`, `src/services/realtimeService.js`, `src/services/playbackTrackingService.js`, `src/widgets/registry.js`

**Widget Registry:**
- Purpose: Single source of truth for all widget types in the scene editor and player
- Location: `src/widgets/registry.js`
- Contains: `WIDGET_REGISTRY` mapping type keys to `{ component, icon, label, defaultProps }`
- Depends on: `src/player/components/widgets/index.js`
- Used by: `SceneRenderer.jsx`, scene editor properties panels, factory functions

**Security Layer:**
- Purpose: XSS prevention and sanitization utilities
- Location: `src/security/`
- Contains: `sanitize.js` (DOMPurify wrapper), `SafeHTML.jsx` (safe render component), `errorMessages.js`
- Depends on: `isomorphic-dompurify`, `src/services/securityService.js`

**Observability Layer:**
- Purpose: Error tracking, structured logging, web vitals, health monitoring
- Location: `src/utils/observability.js`, `src/utils/errorTracking.jsx`, `src/services/loggingService.js`
- Contains: Sentry initialization, scoped logger factory (`createScopedLogger`), web vitals, health checks
- Used by: `src/main.jsx` initializes via `initObservability()` before React render; all services and hooks via `createScopedLogger`

**Configuration Layer:**
- Purpose: Plan tiers, feature flags, app catalog, environment access
- Location: `src/config/`
- Contains:
  - `plans.js` — `PLANS`, `PlanSlug`, `Feature`, `FEATURE_METADATA`, plan limits
  - `featureFlags.js` — `GLOBAL_FLAGS`, `resolveFeatureFlags`, priority resolution
  - `appCatalog.js` — digital signage app definitions
  - `env.js` — environment variable access wrappers
  - `yodeckTheme.js` — brand theme tokens

## Data Flow

**User Authentication:**

1. `main.jsx` initializes observability, wraps tree in `I18nProvider > AuthProvider > FeatureFlagProvider > BrowserRouter`
2. `AuthContext` calls `supabase.auth.getSession()` on mount, subscribes to `onAuthStateChange`
3. On session found, fetches `profiles` table for `userProfile` (role, plan, etc.)
4. `AppRouter` renders `RequireAuth` which reads `{ user, loading }` from `AuthContext`
5. Authenticated user lands at `/app/*` where `App.jsx` dispatches to role-specific UI

**Page Navigation (Admin App):**

1. `App.jsx` maintains `currentPage` string in local state
2. Sidebar nav calls `setCurrentPage(id)` on button click
3. Dynamic editor routes (`playlist-editor-{id}`, `layout-editor-{id}`, etc.) are pattern-matched in JSX
4. All pages are wrapped in `<Suspense fallback={<PageLoader />}>` for lazy loading
5. Feature-gated pages wrapped in `<FeatureGate feature={...} fallback={<FeatureUpgradePrompt />}>`

**Content Resolution (Player):**

1. TV device navigates to `/player/view` with `screenId` from localStorage
2. `usePlayerContent` calls `supabase.rpc('get_resolved_player_content', { p_screen_id })` — server-side schedule/campaign priority resolution
3. Content priority: Emergency campaigns > Active campaigns > Device scene/playlist
4. `ViewPage` renders `AppRenderer` which dispatches to `SceneRenderer`, `LayoutRenderer`, or media playback
5. `SceneRenderer` uses `getWidgetComponent(widgetType)` from registry for widget blocks; uses `DataRefreshProvider` + `useDataRefreshOrchestrator` to deduplicate widget data fetches
6. `usePlayerHeartbeat` sends `player_heartbeat` RPC every 30s
7. `realtimeService` subscribes to `device_commands` Postgres changes for push commands (refresh, restart, screenshot)
8. Offline: `offlineService.js` + IndexedDB cache via `playerService.cacheContent/getCachedContent`

**Feature Flag Resolution:**

1. `FeatureFlagProvider` calls `preloadFeatureFlags()` on mount to fetch tenant overrides from Supabase
2. Resolution priority: tenant override > plan feature > global flag > disabled
3. `useFeatureFlag(feature)` returns boolean; `<FeatureGate feature={...}>` uses it to conditionally render
4. Cache: in-memory with 5-min TTL + localStorage backup

**Media Upload Flow:**

1. Component calls `useS3Upload` hook or `useCloudinaryUpload` hook
2. S3 path: hook POSTs to `/api/media/presign` (Vite dev plugin serves this; production handled separately), receives presigned URL, uploads directly to S3
3. Cloudinary path: widget script loaded via `<script>` in `index.html`, upload preset configured via env vars
4. After upload, `mediaService.js` saves metadata record to Supabase `media_assets` table

**State Management:**

- No global state management library (no Redux, Zustand, etc.)
- React Context for auth, branding, emergency state, feature flags, i18n
- Local `useState` per page for page-scoped data
- Real-time updates: Supabase `postgres_changes` subscriptions for live data
- Player: custom orchestrator pattern (`useDataRefreshOrchestrator`) for shared widget data deduplication

## Key Abstractions

**FeatureGate:**
- Purpose: Declarative feature-flag gating with upgrade prompt fallback
- Examples: `src/components/FeatureGate.jsx`
- Pattern: `<FeatureGate feature={Feature.AI_ASSISTANT} fallback={<FeatureUpgradePrompt />}>` wraps premium pages in `App.jsx`

**createScopedLogger:**
- Purpose: Named, structured logger instances used throughout the app
- Examples: `const logger = createScopedLogger('ScheduleService')` — in all service files
- Pattern: Returns `{ debug, info, warn, error, fatal }` with automatic scope prefix and PII redaction

**Service Modules:**
- Purpose: Supabase interaction isolated from UI components
- Examples: `src/services/mediaService.js`, `src/services/scheduleService.js`, `src/services/screenService.js`
- Pattern: Named exports of async functions, each creating their own scoped logger; no class instances

**Widget Registry:**
- Purpose: Centralizes widget type definitions so editors and players stay in sync
- Examples: `src/widgets/registry.js`
- Pattern: `WIDGET_REGISTRY[type] = { component, icon, label, defaultProps }`; use `getWidgetComponent(type)` for player rendering

**DataRefreshOrchestrator:**
- Purpose: Prevents N-widgets from making N identical API requests
- Examples: `src/player/hooks/useDataRefreshOrchestrator.js`, `src/player/contexts/DataRefreshContext.jsx`
- Pattern: Widgets register a `fetchFn` + interval; orchestrator deduplicates, caches, and ticks every 10s

## Entry Points

**Browser App:**
- Location: `src/main.jsx`
- Triggers: Vite serves `index.html`, which loads `src/main.jsx` as module
- Responsibilities: Initializes observability (Sentry, logging, web vitals), sets up React 19 root with Sentry error handlers, renders provider tree

**App Router:**
- Location: `src/router/AppRouter.jsx`
- Triggers: Rendered by `App.jsx` (legacy) and by `main.jsx` provider tree's `<BrowserRouter>`
- Responsibilities: Declares all URL routes, `RequireAuth`/`PublicRoute` guards, lazy-loads all page chunks

**Admin App Shell:**
- Location: `src/App.jsx`
- Triggers: Lazy-loaded at `/app/*` route via `AppRouter`
- Responsibilities: Fetches listings, subscribes to real-time updates, renders role-specific UI (client vs. admin vs. super_admin), manages `currentPage` navigation state

**Player Entry:**
- Location: `src/Player.jsx`
- Triggers: Lazy-loaded at `/player/*` route
- Responsibilities: Routes between `PairPage` (OTP pairing) and `ViewPage` (content playback)

**Legacy TV Entry:**
- Location: `src/TV.jsx`
- Triggers: Lazy-loaded at `/tv/*` route
- Responsibilities: OTP-based content fetch using layout configs (`Layout1–4`), older architecture kept for backwards compatibility

## Error Handling

**Strategy:** Layered — Sentry captures unhandled errors via React 19 root hooks, `<ErrorBoundary>` wraps the entire app, services use try/catch + structured logging.

**Patterns:**
- `src/main.jsx`: `onUncaughtError`, `onCaughtError`, `onRecoverableError` on `createRoot` all route to `Sentry.reactErrorHandler`
- `src/components/ErrorBoundary.jsx`: Wraps entire app as class-based error boundary
- Service layer: All async functions use try/catch; errors logged via `createScopedLogger`, not thrown to UI unless critical
- Player: Exponential backoff retry (`retryWithBackoff`) for content fetches; offline cache fallback on failure
- Auth: `AUTH_STATUS` state machine with retry/backoff in `AuthContext`; `AuthRetryBanner` component shows transient auth errors

## Cross-Cutting Concerns

**Logging:** `createScopedLogger('ScopeName')` from `src/services/loggingService.js` — used in every service, hook, and context. Batches to Supabase in production; console-only in dev. Automatic PII redaction via `src/utils/pii.js`.

**Validation:** Service-layer validation (e.g., `validateMediaFile` in `mediaService.js`). Rate limiting via `rateLimitService.js` imported at service function level. No form library; ad-hoc HTML5 + JS validation in components.

**Authentication:** `AuthContext` provides `user` and `userProfile` (with `role`). RLS on all Supabase tables enforces data access. `RequireAuth` route guard in router. Role check in `App.jsx` for admin vs. client UI.

**RBAC:** Three roles (`client`, `admin`, `super_admin`) in `profiles.role`. Checked in `App.jsx` to determine which UI to show. Content approval workflow for `editor` sub-role gated in `permissionsService.js`.

**Internationalization:** `I18nProvider` + `useTranslation` hook + `t(key, fallback)` pattern. `src/i18n/locales/en.json` is the primary message catalog; other locales currently alias to English.

---

*Architecture analysis: 2026-02-17*
