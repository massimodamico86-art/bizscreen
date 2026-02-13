# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Single-Page Application (SPA) with Multi-Tenant Digital Signage Architecture

**Key Characteristics:**
- React 19 SPA with client-side routing and lazy-loaded code splitting
- Multi-tenant B2B SaaS with role-based access control (super_admin, admin, client)
- Real-time data synchronization via Supabase (Postgres + Realtime subscriptions)
- Offline-first player architecture with IndexedDB caching for TV displays
- Context-based state management with React hooks (no Redux/Zustand)
- Feature flag system for plan-based feature gating via RLS policies
- Service layer pattern for business logic and data access abstraction

## Layers

**Presentation Layer:**
- Purpose: UI components and pages for users and TV displays
- Location: `src/pages/`, `src/components/`, `src/marketing/`, `src/auth/`, `src/design-system/`
- Contains: React components, lazy-loaded page components, feature-gated components, design system primitives
- Depends on: Contexts (AuthContext, BrandingContext), hooks (useFeatureFlag, useMedia), services
- Used by: Router (AppRouter.jsx)
- Pattern: Component composition, lazy loading with Suspense, feature gates wrapping premium components

**Routing Layer:**
- Purpose: Client-side navigation and route protection
- Location: `src/router/AppRouter.jsx`, `src/App.jsx`
- Contains: React Router v7 configuration, route guards (RequireAuth, PublicRoute), lazy loading definitions, Sentry-wrapped routes
- Depends on: AuthContext for authentication state, page components (lazy-loaded)
- Used by: Main entry point (`src/main.jsx`)
- Pattern: Route-based code splitting, auth guards check user state before render, redirect logic for role-based dashboards

**State Management Layer:**
- Purpose: Global state and user context management
- Location: `src/contexts/`
- Contains: AuthContext (user/session/profile), BrandingContext (white-label/impersonation), EmergencyContext (emergency broadcasts), I18nContext (translations), DataRefreshContext (player data orchestration)
- Depends on: Supabase client, services (authService, brandingService)
- Used by: All components via custom hooks (useAuth, useBranding, useEmergency)
- Pattern: React Context API with custom hooks, provider wraps app in main.jsx, refs for stable values in callbacks

**Hooks Layer:**
- Purpose: Reusable stateful logic and data fetching
- Location: `src/hooks/`, `src/player/hooks/`
- Contains: Custom hooks for feature flags, media management, layout handling, player metrics, data caching, logger scoping
- Depends on: Services, contexts, Supabase client
- Used by: Components and pages throughout the app
- Pattern: Prefix with `use`, return state and handlers, encapsulate side effects in useEffect

**Service Layer:**
- Purpose: Business logic and data access abstraction
- Location: `src/services/` (100+ service modules)
- Contains: CRUD operations, API integrations, analytics (player, content, campaign), billing/subscription, media handling, campaign/schedule management, AI services, translation, approval workflows
- Depends on: Supabase client (`src/supabase.js`), external APIs (weather, RSS, Cloudinary, AWS S3), loggingService
- Used by: Hooks, components, contexts
- Pattern: Functional modules with async/await, JSDoc typing, scoped logger per service, rate limiting, error handling with descriptive throws

**Data Access Layer:**
- Purpose: Database client and real-time subscription management
- Location: `src/supabase.js`
- Contains: Supabase client initialization, PKCE auth flow config, error instrumentation (Sentry breadcrumbs), environment validation
- Depends on: Supabase JS SDK (`@supabase/supabase-js`)
- Used by: Services exclusively (no direct component access to supabase client)
- Pattern: Single client instance, instrumented with error interceptor, auto-refresh tokens, session persistence in localStorage

**Player Runtime Layer:**
- Purpose: Offline-capable content playback for TV devices
- Location: `src/player/`, `src/TV.jsx`, `src/Player.jsx`
- Contains: Player pages (PairPage, ViewPage), player components (ZonePlayer, SceneRenderer, AppRenderer), widgets (Weather, DataTable, RssTicker, SocialFeed), offline service, cache service, content scheduling, heartbeat system
- Depends on: IndexedDB via `idb` library, Supabase (when online), services (playerService, dataSourceService, weatherService)
- Used by: TV devices accessing `/player/*` and `/tv/*` routes
- Pattern: Isolated subsystem with own routing, hooks for player-specific concerns, data refresh orchestration, graceful offline fallback

**Configuration Layer:**
- Purpose: Feature flags, plan definitions, app catalog, environment config
- Location: `src/config/`
- Contains: `plans.js` (plan/feature/quota definitions), `featureFlags.js` (feature toggles and gates), `appCatalog.js` (available widgets/apps), `env.js` (environment validation), `yodeckTheme.js` (Yodeck color scheme)
- Depends on: Nothing (pure configuration)
- Used by: All layers for feature checks, plan enforcement, app rendering
- Pattern: Export constants and enums, referenced by feature gate components and hooks

**Utility Layer:**
- Purpose: Cross-cutting concerns and helpers
- Location: `src/utils/`, `src/security/`
- Contains: Error tracking (Sentry integration), observability (logging, web vitals, health checks), PII sanitization, formatters (date, currency, duration), SEO utilities, Supabase error interceptor
- Depends on: Sentry SDK (`@sentry/react`), external libraries
- Used by: All layers
- Pattern: Pure functions, side-effect initialization functions (initObservability)

## Data Flow

**User Authentication Flow:**

1. User navigates to app → `main.jsx` renders with `AuthProvider`
2. `AuthContext` calls `supabase.auth.getSession()` with timeout (10s) and retry logic (3 attempts with exponential backoff)
3. If session exists → fetch user profile from `profiles` table via RLS policies
4. Set user context + observability context (Sentry user tracking)
5. `AppRouter` checks auth state via `RequireAuth` guard → renders protected routes or redirects to `/auth/login`
6. Real-time subscription established for auth state changes via `supabase.auth.onAuthStateChange()`
7. On sign out → clear observability user, sign out from Supabase, redirect to login

**Content Management Flow:**

1. User creates/edits content in editor page (PlaylistEditorPage, LayoutEditorPage, SceneEditorPage, CampaignEditorPage)
2. Editor component calls service layer function (e.g., `playlistService.updatePlaylist()`)
3. Service executes Supabase query → database updates via RLS-protected tables
4. Database triggers fire (e.g., `updated_at` timestamp update)
5. Real-time subscription notifies all listening clients of change
6. Component receives payload in subscription callback → updates local state
7. React re-renders UI with new data
8. TV players poll for changes every 5 minutes → fetch updated content via `getConfig(otp)`
9. Player caches updated content in IndexedDB for offline playback

**Player Rendering Flow:**

1. TV device navigates to `/player` → renders `PairPage` with OTP input
2. User enters OTP → Player validates via `supabase.rpc('pair_tv_device', { p_otp })`
3. On success, stores OTP in localStorage → navigates to `/player/view`
4. `ViewPage` component mounts → calls `playerService.getPlayerContent(screenId)`
5. Backend RPC resolves playlist/schedule for screen → returns content with media URLs
6. Player stores content in IndexedDB via `offlineService.cacheContent()`
7. `SceneRenderer` or `ZonePlayer` renders content zones with embedded widgets
8. Widgets use `useWidgetData` hook → registers with `DataRefreshOrchestrator` for staggered refresh
9. Player sends heartbeat every 60s via `supabase.rpc('player_heartbeat')` → updates online status
10. Player polls for commands every 30s → executes remote commands (screenshot, reload, update)
11. Offline fallback: if network fails, `offlineService` loads cached content from IndexedDB

**Real-Time Updates Flow:**

1. Component mounts → establishes Supabase real-time channel subscription (e.g., `supabase.channel('listings-${userId}')`)
2. Subscription filters to relevant table (e.g., `postgres_changes` on `listings` table)
3. Backend mutation occurs (INSERT/UPDATE/DELETE on subscribed table)
4. Postgres triggers Realtime notification via `pg_notify`
5. Supabase Realtime server forwards event to subscribed clients over WebSocket
6. Client receives payload with `eventType` (INSERT/UPDATE/DELETE) and `new`/`old` data
7. Subscription callback updates local state via `setListings()` or similar setState
8. React re-renders affected components with new data
9. RLS policies ensure client only receives events for data they can access

**Widget Data Refresh Flow (Player):**

1. Widget mounts → calls `useWidgetData({ widgetId, dataSourceId, refreshInterval })`
2. Hook registers widget with `DataRefreshOrchestrator` context
3. Orchestrator staggers refresh times to avoid thundering herd (spreads across interval window)
4. On refresh trigger, hook calls `dataFetcher` function provided by widget
5. Widget fetches data from service (e.g., `getWeather()`, `getDataSource()`)
6. Data cached in IndexedDB via `cacheService` with TTL
7. Widget renders with new data, displays `SyncStatusIndicator` (syncing/synced/error/stale)
8. On unmount, widget unregisters from orchestrator

**State Management:**
- Global state: React Context (auth, branding, emergency, i18n, feature flags) shared across app
- Local component state: `useState`/`useReducer` for UI-only state
- Server state: Direct Supabase queries in services, no global cache (except player offline cache)
- Form state: Controlled components with local `useState`, validation on submit
- Real-time state: Subscription callbacks update state via refs (avoid stale closures)

## Key Abstractions

**AuthContext:**
- Purpose: Centralized authentication state and user profile management
- Examples: `src/contexts/AuthContext.jsx`
- Pattern: React Context with custom hook (`useAuth`), manages Supabase auth session + profile fetching with retry/timeout logic, role helpers (isSuperAdmin, isAdmin, isClient)
- Usage: `const { user, userProfile, signIn, signOut } = useAuth()`

**Service Layer:**
- Purpose: Encapsulates data access and business logic
- Examples: `src/services/mediaService.js`, `src/services/playlistService.js`, `src/services/campaignService.js`, `src/services/authService.js`
- Pattern: Export async functions that accept params, call Supabase client or external APIs, return data or throw descriptive errors. Include rate limiting, logging with scoped logger, JSDoc typing.
- Usage: `import { fetchPlaylists } from '../services/playlistService'; const playlists = await fetchPlaylists({ type: 'media' });`

**Feature Gates:**
- Purpose: Conditionally render UI based on user's subscription plan
- Examples: `src/components/FeatureGate.jsx`, `src/hooks/useFeatureFlag.jsx`
- Pattern: `<FeatureGate feature={Feature.CAMPAIGNS}>` wrapper checks plan entitlements via RLS query to `feature_flags` table, shows upgrade prompt if not enabled
- Usage: Wrap premium features, provide fallback component, optionally allow super_admin bypass

**Player Widgets:**
- Purpose: Data-driven content widgets for TV displays (weather, RSS, data tables, social feeds)
- Examples: `src/player/components/widgets/WeatherWidget.jsx`, `src/player/components/widgets/DataTableWidget.jsx`, `src/player/components/widgets/RssTickerWidget.jsx`
- Pattern: Components use `useWidgetData` hook for orchestrated refresh, maintain sync status, cache data in IndexedDB, display loading/error states
- Usage: Rendered by `SceneRenderer` based on scene configuration JSON

**Data Refresh Orchestrator:**
- Purpose: Coordinate refresh intervals for multiple widgets to avoid simultaneous requests
- Examples: `src/player/hooks/useDataRefreshOrchestrator.js`, `src/player/contexts/DataRefreshContext.jsx`
- Pattern: Central manager tracks widget registrations, staggers refresh times across interval window, notifies widgets on schedule, handles widget lifecycle (mount/unmount)
- Usage: Wrap player with `<DataRefreshProvider>`, widgets register via `useWidgetData` hook

**Lazy Loading:**
- Purpose: Code splitting for optimal bundle size and parallel loading
- Examples: All pages in `src/App.jsx` use `lazy(() => import('./pages/...'))`
- Pattern: Route-based code splitting with `Suspense` fallback, manual chunks in Vite config (vendor-react, vendor-supabase, vendor-icons, vendor-motion), dynamic imports for large editors
- Usage: Defined in route configs, loaded on-demand when route accessed

**Scoped Logger:**
- Purpose: Structured logging with module context
- Examples: `src/services/loggingService.js`, used throughout codebase
- Pattern: `const log = createScopedLogger('ModuleName')`, log.info/warn/error with context objects, console in dev, Sentry breadcrumbs in production
- Usage: `import { createScopedLogger } from '../services/loggingService'; const log = createScopedLogger('PlaylistService'); log.info('Playlist created', { id: playlist.id });`

## Entry Points

**Web Application:**
- Location: `src/main.jsx`
- Triggers: Browser loads `index.html`, Vite injects main.jsx script
- Responsibilities: Initialize observability (Sentry, structured logging, web vitals monitoring, health checks), render React root with providers (ErrorBoundary, I18nProvider, AuthProvider, FeatureFlagProvider, BrowserRouter), configure React 19 error hooks (onUncaughtError, onCaughtError, onRecoverableError)
- Pattern: Single entry point, sequential initialization, provider nesting order matters (ErrorBoundary outermost)

**App Router:**
- Location: `src/router/AppRouter.jsx`
- Triggers: Rendered by `main.jsx` inside providers
- Responsibilities: Define routes (marketing pages, auth pages, app routes, player routes, TV routes, public preview), route protection via `RequireAuth` (checks user) and `PublicRoute` (redirects if logged in), lazy load all route components, wrap with SentryRoutes for error tracking
- Pattern: React Router v7 with route-level lazy loading, Suspense fallbacks for loading states

**Main App Shell:**
- Location: `src/App.jsx` (BizScreenApp → BizScreenAppInner → ClientUILayout)
- Triggers: Protected route `/app/*` after successful authentication
- Responsibilities: Determine user role (super_admin/admin/client), render role-appropriate dashboard (SuperAdminDashboard, AdminDashboard) or client UI with sidebar navigation and header, handle impersonation banner, emergency broadcast banner, announcement banner, real-time subscription to listings changes, lazy load all page components, dynamic routing for editor pages (playlist-editor-*, layout-editor-*, etc.)
- Pattern: Role-based conditional rendering, nested components for layout separation, refs for real-time subscription stability

**TV Player Entry (Legacy):**
- Location: `src/TV.jsx`
- Triggers: Route `/tv?otp=...`
- Responsibilities: OTP validation via `getConfig(otp)`, layout rendering (Layout1-4), content polling every 5 minutes for updates, heartbeat ping every 1 minute to update online status, offline fallback by storing OTP in localStorage
- Pattern: Polling-based updates, simple layout rendering, being phased out in favor of `/player/*`

**Player Entry (Modern):**
- Location: `src/Player.jsx` → `src/player/pages/ViewPage.jsx`
- Triggers: Route `/player/view` after OTP pairing
- Responsibilities: Fetch playlist/schedule via `playerService.getPlayerContent()`, render scenes with zones, manage playback state (current content, transitions), offline caching via `offlineService`, widget data orchestration via `DataRefreshProvider`, kiosk mode (gesture to unlock), screenshot capture on command, heartbeat system, command polling (reload, update, screenshot), stuck detection
- Pattern: Offline-first architecture, IndexedDB caching, data refresh orchestration, complex playback state machine

**Supabase Client:**
- Location: `src/supabase.js`
- Triggers: Import by any service/context needing database access
- Responsibilities: Initialize Supabase client with PKCE auth flow, validate required environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY), log warnings for optional env vars, instrument with error interceptor for automatic Sentry breadcrumbs, configure auto-refresh tokens and session persistence, expose client globally in dev for debugging
- Pattern: Single client instance, early validation fails fast, instrumentation wraps client for observability

## Error Handling

**Strategy:** Layered error handling with observability integration and graceful degradation

**Patterns:**
- Service layer: Try/catch blocks, throw descriptive errors with context, log all errors with scoped logger, rate limit detection and custom error
- Component layer: ErrorBoundary at root (`src/components/ErrorBoundary.jsx`), React 19 error hooks in `main.jsx` (onUncaughtError, onCaughtError, onRecoverableError), per-page error states with retry actions
- Async operations: Promise rejections caught, user-facing toast messages via `showToast`, detailed logging for debugging
- Auth layer: Exponential backoff retry on timeout (10s initial, max 3 attempts, 2-30s backoff), manual retry via `retryAuth()`, status indicator (loading/retrying/error), clear error messages for user
- Player layer: Graceful degradation to cached content on network failure, sync status indicators per widget (syncing/synced/error/stale), offline-first architecture prevents blank screens
- Network errors: Supabase error interceptor (`src/utils/supabaseErrorInterceptor.js`) adds Sentry breadcrumbs for all queries, captures full context (query, params, response)
- RLS violations: Caught in service layer, mapped to user-friendly messages via `src/utils/errorMessages.js`, distinguishes between not found (PGRST116) and permission denied
- Timeout handling: Custom timeout wrapper for critical operations (auth), fallback to cached data in player
- Production: Console.* calls removed by Terser minifier, all errors sent to Sentry with user context and breadcrumbs

## Cross-Cutting Concerns

**Logging:**
- Approach: Structured logging with scoped loggers
- Implementation: `createScopedLogger(scope)` from `src/services/loggingService.js`
- Pattern: Log with context objects (e.g., `log.info('Playlist created', { id, name })`), different levels (debug/info/warn/error)
- Production: Console removed, errors to Sentry as breadcrumbs

**Validation:**
- Client-side: React form validation with controlled inputs, file upload validation (MIME type, size) in `mediaService.js`
- Server-side: RLS policies enforce tenant isolation and permissions, Postgres CHECK constraints for data integrity
- Input sanitization: HTML content sanitized via DOMPurify (`src/security/sanitizeHtml.js`), PII detection and redaction (`src/utils/pii.js`)

**Authentication:**
- Flow: PKCE auth flow via Supabase Auth API
- Session: JWT tokens stored in httpOnly cookies (managed by Supabase SDK), auto-refresh enabled
- Context: AuthContext manages user state and profile, exposes auth actions (signIn, signOut, etc.)
- Protection: Route guards (RequireAuth, PublicRoute) check auth state, redirect unauthorized users
- Multi-factor: MFA support via `mfaService.js` (not yet fully implemented)

**Authorization:**
- RBAC: Role-based access control with three roles (super_admin, admin, client)
- RLS: Supabase Row-Level Security policies enforce tenant isolation and permissions at database level
- Feature flags: Plan-based feature gating via `useFeatureFlag` hook and `<FeatureGate>` component
- Service layer: Permission checks in service functions before executing operations
- Admin tools: Impersonation feature allows super_admins to act as clients for support

**Internationalization:**
- Context: I18nContext provides current locale and translation function
- Hook: `useTranslation()` returns `t(key, fallback)` function
- Files: Locale JSON files in `src/i18n/locales/` (en.json, es.json, etc.)
- Switcher: `EditorLanguageSwitcher` component allows runtime language change
- Coverage: Partial i18n implementation, primarily in player and core UI

**Analytics:**
- Player: `playerAnalyticsService.js` tracks playback events (start, stop, error, transition)
- Content: `contentAnalyticsService.js` tracks content performance (views, engagement)
- Campaign: `campaignAnalyticsService.js` tracks campaign effectiveness
- Web vitals: Performance monitoring via `web-vitals` library, initialized in `utils/observability.js`

**Observability:**
- Error tracking: Sentry integration (`@sentry/react`), initialized in `utils/observability.js`
- Structured logging: Scoped loggers throughout codebase, breadcrumbs sent to Sentry
- Health monitoring: `healthService.js` checks system health, exposed at `/api/health`
- Performance: Source maps uploaded to Sentry via Vite plugin, React 19 error hooks capture all errors
- User context: User ID, email, role attached to Sentry events for debugging

---

*Architecture analysis: 2026-02-13*
