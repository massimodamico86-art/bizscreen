# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Multi-tier React SPA with Supabase backend, role-based access control (RBAC), feature-gated premium functionality, and lazy-loaded pages for code splitting.

**Key Characteristics:**
- Client-side SPA routing with React Router 7
- Supabase for authentication, database, and real-time subscriptions
- Context-based state management for auth and branding
- Hook-based data fetching with pagination support
- Server-side role-based access control (RLS policies)
- Feature flags for plan-based access control
- Lazy loading of all major pages and routes

## Layers

**Presentation (UI Components):**
- Purpose: Render user interfaces and handle user interactions
- Location: `src/components/`, `src/pages/`, `src/design-system/components/`
- Contains: Page components, modal dialogs, form controls, reusable UI components
- Depends on: Services, hooks, contexts, i18n, utilities
- Used by: App.jsx router, other components

**Context & State Management:**
- Purpose: Provide global state for auth, branding, i18n, and feature flags
- Location: `src/contexts/`, `src/hooks/useFeatureFlag.jsx`
- Contains: AuthContext, BrandingContext, feature flag provider
- Depends on: Supabase client, services (billingService, tenantService)
- Used by: App wrapper and all authenticated pages

**Data Access & Services:**
- Purpose: Abstract database and API interactions, business logic
- Location: `src/services/`
- Contains: Media service, schedule service, layout service, billing service, etc.
- Depends on: Supabase client, utilities
- Used by: Pages and hooks

**Custom Hooks:**
- Purpose: Encapsulate stateful logic and side effects
- Location: `src/hooks/`
- Contains: useMedia, useLayout, useAdmin, useAuditLogs, useFeatureFlag, etc.
- Depends on: Services, supabase client, utilities
- Used by: Pages and components

**Utilities & Helpers:**
- Purpose: Pure functions for formatting, validation, logging, error handling
- Location: `src/utils/`
- Contains: errorMessages, errorTracking, logger, formatters, seo, observability
- Depends on: External libraries (Sentry, date-fns)
- Used by: Services, hooks, components, pages

**Configuration:**
- Purpose: Environment setup, routes, feature definitions
- Location: `src/config/`, `src/router/`, `src/supabase.js`
- Contains: Feature definitions, plan configurations, route definitions
- Depends on: Environment variables
- Used by: App initialization and feature gates

**Internationalization:**
- Purpose: Multi-language support
- Location: `src/i18n/`, `src/i18n/locales/`
- Contains: I18n provider, locale files, translation utilities
- Used by: All pages and components

## Data Flow

**Authentication Flow:**
1. User visits app → AppRouter checks auth state
2. AuthContext.useEffect calls `supabase.auth.getSession()`
3. If session exists, fetch profile from `profiles` table via `fetchUserProfile`
4. Profile data includes role (super_admin, admin, client) and onboarding state
5. Real-time auth listener updates on sign in/out/session changes
6. Non-authenticated users redirected to LoginPage

**Feature Access Flow:**
1. Page requests feature flags via `useFeatureFlags([Feature.AI_ASSISTANT, ...])`
2. Feature flags provider checks plan-based access from billing service
3. FeatureGate component wraps premium features
4. If not enabled, show FeatureUpgradePrompt with upgrade link
5. Super admins bypass feature gates (always have access)

**Data Fetch Flow - Media Example:**
1. MediaLibraryPage calls `fetchMediaAssets({ type, search, page, pageSize })`
2. mediaService builds query with filters and pagination (offset/limit)
3. Query hits `media_assets` table, RLS policies filter by owner
4. Returns paginated result with { data, totalCount, page, pageSize, totalPages }
5. Component renders paginated list, handles page navigation
6. Real-time subscription listens for INSERT/UPDATE/DELETE events
7. Changes to media sync automatically via real-time channel

**Real-time Updates Pattern - App.jsx Example:**
1. On mount, set up Supabase channel for listings table
2. Subscribe to all events (INSERT, UPDATE, DELETE)
3. RLS policies control which listings user can see (automatic)
4. Payload handler uses refs to avoid stale closure issues
5. Client-side filtering checks if listing is relevant to user's role
6. State updates trigger re-render with new data
7. On unmount, unsubscribe and cleanup interval timers

**Navigation Flow:**
1. User clicks menu item → `setCurrentPage(pageId)` in App.jsx
2. Dynamic editor routes parsed: `playlist-editor-{id}`, `layout-editor-{id}`, etc.
3. Editor ID extracted from route string and passed as prop
4. Page renders with dynamic data fetched using that ID
5. Breadcrumbs updated to show hierarchy (Dashboard → Playlists → Edit)
6. Hash-based navigation used for account plan from limit modals

## Key Abstractions

**Service Layer Pattern:**
- Location: `src/services/mediaService.js`, `src/services/playlistService.js`, etc.
- Purpose: Encapsulate database operations and business logic
- Pattern: Export async functions that call supabase methods
- Example: `fetchMediaAssets()`, `createMediaAsset()`, `deleteMediaAssetSafely()`
- Includes validation and error handling

**Hook Pattern - Data Fetching:**
- Location: `src/hooks/useMedia.js`, `src/hooks/useLayout.js`
- Purpose: Manage component state for specific data domains
- Pattern: useState for local state, useEffect for fetching, useCallback for memoized functions
- Benefits: Reusable across multiple components, encapsulated logic

**Context Pattern - Global State:**
- Location: `src/contexts/AuthContext.jsx`, `src/contexts/BrandingContext.jsx`
- Purpose: Provide state accessible throughout app without prop drilling
- Pattern: React Context + Provider + custom useAuth/useBranding hooks
- Data: Auth user, profile, role, branding config, impersonation state

**Feature Gate Pattern:**
- Location: `src/components/FeatureGate.jsx`
- Purpose: Control access to premium features based on plan
- Pattern: Wrap component with `<FeatureGate feature={Feature.AI_ASSISTANT}>`
- Behavior: Shows feature if enabled, else shows FeatureUpgradePrompt
- Override: Super admins always see feature

**Real-time Subscription Pattern:**
- Location: App.jsx data fetching useEffect
- Purpose: Keep data synchronized across browser tabs and real-time changes
- Pattern: `supabase.channel().on().subscribe()` with cleanup
- Handling: Refs used to avoid stale closure in callback
- RLS: Server-side policies enforce access control automatically

## Entry Points

**Main Entry Point:**
- Location: `src/main.jsx`
- Triggers: Application startup
- Responsibilities: Render root, wrap app with providers (I18nProvider, AuthProvider, FeatureFlagProvider, BrowserRouter)

**App Entry Point:**
- Location: `src/App.jsx` (BizScreenAppInner component)
- Triggers: After auth completes
- Responsibilities: Render sidebar, header, main content area, handle page navigation, manage user data fetching

**Router Entry Point:**
- Location: `src/router/AppRouter.jsx`
- Triggers: Before authentication (handles public and protected routes)
- Responsibilities: Define route structure, lazy load pages, protect routes with RequireAuth/PublicRoute wrappers, handle fallback spinners

**Page Entry Points (Examples):**
- `src/pages/MediaLibraryPage.jsx`: Manage media assets with filtering and pagination
- `src/pages/PlaylistsPage.jsx`: List playlists with server-side pagination
- `src/pages/LayoutsPage.jsx`: List layouts with server-side pagination
- `src/pages/SchedulesPage.jsx`: List schedules with server-side pagination
- `src/pages/ScreensPage.jsx`: List screens with management controls

## Error Handling

**Strategy:** Multi-layered approach with error boundaries, try-catch, and user feedback.

**Patterns:**

**ErrorBoundary Component:**
- Location: `src/components/ErrorBoundary.jsx`
- Wraps entire app, catches React rendering errors
- Shows fallback UI with error message and retry button

**Service Layer Error Handling:**
- Services use try-catch and return error objects
- Database errors include error codes (e.g., PGRST116 for "no rows")
- Supabase client throws on auth errors, returns error object on data errors
- Example: Profile fetch catches PGRST116 and returns specific error message

**Async Error Handling in Pages:**
- Pages use try-catch in useEffect for data fetching
- Errors set local state and show toast notification
- Specific error handling for RLS violations, network errors, timeouts

**Auth Error Handling:**
- AuthContext catches session errors with 10-second timeout
- On timeout, clears stale session to allow re-login
- Profile fetch errors return error object with code and message
- Pages check for profile.error before rendering

**Toast Notifications:**
- Location: `src/components/Toast.jsx`
- Pattern: Pages call `showToast(message, type)` for user feedback
- Auto-dismiss after 3 seconds
- Types: 'success', 'error'

## Cross-Cutting Concerns

**Logging:**
- Utility: `src/utils/logger.js`
- Pattern: Create logger with `createLogger('ModuleName')`
- Methods: `log.debug()`, `log.info()`, `log.warn()`, `log.error()`
- Behavior: Logs to console in development, structured logging in production

**Validation:**
- Input validation in services (mediaService.validateMediaFile)
- Type validation in hooks (useMedia checks array types)
- Database validation via SQL constraints

**Authentication:**
- Entry point: AuthContext initialization on app load
- Method: Supabase auth with PKCE flow
- Session persistence: Automatic via Supabase client config
- Role-based access: Profiles table stores role, checked in hooks/components

**Authorization:**
- RLS policies in Supabase enforce server-side access control
- Client-side: Feature flags check plan-based access
- Role-based: Component rendering conditional on user role
- Impersonation: Admin can impersonate client, see client UI

**Real-time Updates:**
- Supabase Postgres Changes subscriptions
- Automatic reconnection on timeout (5-second delay)
- Error logging for subscription issues
- Cleanup: unsubscribe on component unmount

**Observability:**
- Error tracking via Sentry (errorTrackingService)
- Custom metrics for performance monitoring
- Activity logging to `activity_logs` table (audit trail)
- Structured logging for debugging

