# Architecture

**Analysis Date:** 2026-02-05

## Pattern Overview

**Overall:** Multi-Layered React SPA with Supabase Backend

**Key Characteristics:**
- React 18 single-page application with React Router for client-side routing
- Supabase (PostgreSQL + Auth + Storage + Realtime) as the backend platform
- Service layer pattern for business logic abstraction
- Context-based state management with custom hooks for data access
- Role-based access control (super_admin, admin, client) enforced at both UI and database levels
- Real-time data synchronization via Supabase channels

## Layers

**Presentation Layer (UI):**
- Purpose: Renders user interface and handles user interactions
- Location: `src/pages/`, `src/components/`, `src/marketing/`
- Contains: Page components, reusable UI components, forms, modals, layouts
- Depends on: Contexts, hooks, services, design-system
- Used by: Router

**Routing Layer:**
- Purpose: Maps URLs to components and handles navigation
- Location: `src/router/AppRouter.jsx`, `src/App.jsx`
- Contains: Route definitions, protected route wrappers, lazy-loaded components
- Depends on: Auth context, page components
- Used by: Main entry point

**State Management Layer (Contexts):**
- Purpose: Provides global state and cross-cutting concerns
- Location: `src/contexts/`
- Contains: AuthContext, BrandingContext, EmergencyContext
- Depends on: Supabase client, services
- Used by: All components via hooks

**Data Access Layer (Hooks):**
- Purpose: Encapsulates data fetching and state management logic
- Location: `src/hooks/`
- Contains: useMedia, useLayout, useFeatureFlag, useAdmin, useCloudinaryUpload
- Depends on: Services, Supabase client
- Used by: Pages and components

**Business Logic Layer (Services):**
- Purpose: Implements business rules and data operations
- Location: `src/services/`
- Contains: 100+ service modules for media, campaigns, playlists, schedules, analytics, etc.
- Depends on: Supabase client, rate limiting, logging
- Used by: Hooks, contexts, components

**Infrastructure Layer:**
- Purpose: External integrations and low-level utilities
- Location: `src/supabase.js`, `src/config/`, `src/security/`, `src/utils/`
- Contains: Supabase client, environment config, sanitization, error tracking
- Depends on: External SDKs (@supabase/supabase-js, @sentry/react, AWS S3)
- Used by: All layers

**Player/TV Layer:**
- Purpose: Standalone content playback system for digital signage displays
- Location: `src/player/`, `src/TV.jsx`, `src/Player.jsx`
- Contains: ZonePlayer, SceneRenderer, AppRenderer, offline service
- Depends on: Services, realtime subscriptions
- Used by: Device endpoints (`/tv/*`, `/player/*`)

## Data Flow

**User Authentication Flow:**

1. User submits credentials via `LoginPage.jsx`
2. `authService.signIn()` calls Supabase auth
3. `AuthContext` receives auth state change
4. `fetchUserProfile()` retrieves role and permissions from `profiles` table
5. Router redirects based on role (super_admin → SuperAdminDashboard, admin → AdminDashboard, client → App)
6. UI renders with role-appropriate permissions

**Content Management Flow:**

1. User interacts with page (e.g., `MediaLibraryPage.jsx`)
2. Page calls custom hook (e.g., `useMedia()`)
3. Hook invokes service method (e.g., `mediaService.fetchMediaAssets()`)
4. Service queries Supabase with RLS policies enforced
5. Data returns through hook to page state
6. React re-renders UI with new data
7. Real-time updates arrive via Supabase channel subscription
8. Channel callback updates local state, triggering re-render

**State Management:**
- Global auth state in `AuthContext` (user, userProfile, loading)
- Global branding state in `BrandingContext` (theme, logo, colors)
- Emergency state in `EmergencyContext` (active emergency campaigns)
- Local component state via `useState` for UI-specific data
- Server state cached in custom hooks (useMedia, useLayout, etc.)
- Feature flags resolved from `profiles.plan_slug` via `useFeatureFlag`

## Key Abstractions

**Service Pattern:**
- Purpose: Encapsulates all backend operations
- Examples: `src/services/mediaService.js`, `src/services/campaignService.js`, `src/services/playlistService.js`
- Pattern: Pure functions that accept parameters and return Promises with Supabase data

**Context + Hook Pattern:**
- Purpose: Provides reactive global state
- Examples: `src/contexts/AuthContext.jsx` + `useAuth()`, `src/contexts/BrandingContext.jsx` + `useBranding()`
- Pattern: Context provides state and methods, custom hook provides type-safe access

**Custom Data Hooks:**
- Purpose: Encapsulates data fetching with caching and error handling
- Examples: `src/hooks/useMedia.js`, `src/hooks/useLayout.js`, `src/hooks/useAdmin.js`
- Pattern: Returns `{ data, loading, error, refetch }` objects

**Feature Gate:**
- Purpose: Controls access to premium features based on plan
- Examples: `src/components/FeatureGate.jsx`, `src/hooks/useFeatureFlag.jsx`
- Pattern: HOC that checks feature availability and renders fallback if unavailable

## Entry Points

**Web Application:**
- Location: `src/main.jsx`
- Triggers: Browser loads `/` or `/app/*`
- Responsibilities: Mount React app, wrap with providers (I18n, Auth, FeatureFlag, Router, ErrorBoundary)

**Router:**
- Location: `src/router/AppRouter.jsx`
- Triggers: URL changes
- Responsibilities: Route matching, lazy loading pages, auth protection, redirects

**App Container:**
- Location: `src/App.jsx`
- Triggers: Authenticated route access (`/app/*`)
- Responsibilities: Client UI shell (sidebar, header, page content), role-based dashboard routing, impersonation mode

**Player Entry Points:**
- Location: `src/Player.jsx`, `src/TV.jsx`
- Triggers: Device accesses `/player/*` or `/tv/*`
- Responsibilities: Render content for digital signage displays, handle pairing, play playlists/scenes

**Marketing Site:**
- Location: `src/marketing/MarketingLayout.jsx`
- Triggers: Unauthenticated user accesses `/`, `/pricing`, `/features`
- Responsibilities: Public marketing pages, SEO, lead generation

## Error Handling

**Strategy:** Multi-layer error boundaries with graceful degradation

**Patterns:**
- React ErrorBoundary at root (`src/components/ErrorBoundary.jsx`) catches render errors
- Service layer wraps Supabase calls in try-catch, returns `{ data, error }` objects
- Auth context handles session timeouts with retry logic and exponential backoff
- Global unhandled rejection handler in `src/main.jsx` for async errors
- Sentry integration (`src/utils/errorTracking.jsx`) for production error tracking
- Toast notifications for user-facing errors (`showToast(message, 'error')`)
- Logging service (`src/services/loggingService.js`) with scoped loggers per component

## Cross-Cutting Concerns

**Logging:** Scoped logger pattern via `createScopedLogger('ComponentName')` in `src/services/loggingService.js`. Logs to console with context. Production logs sent to Sentry.

**Validation:** Input sanitization in `src/security/sanitize.js`. Server-side validation via RLS policies. File uploads validated in `mediaService.validateMediaFile()`.

**Authentication:**
- JWT tokens managed by Supabase Auth
- Session stored in localStorage via Supabase client
- `AuthContext` provides `user` and `userProfile` to all components
- Protected routes via `RequireAuth` wrapper in `src/router/AppRouter.jsx`
- RLS policies enforce data access at database level

**Authorization:**
- Role-based: super_admin, admin, client stored in `profiles.role`
- Plan-based: feature flags resolved from `profiles.plan_slug` via `useFeatureFlags()`
- UI-level: `FeatureGate` component conditionally renders premium features
- Data-level: Supabase RLS policies filter queries by user role and tenant

**Internationalization:**
- `I18nProvider` context in `src/i18n/I18nContext.jsx`
- `useTranslation()` hook provides `t(key, fallback)` function
- Language stored in localStorage, defaults to browser language
- Translation service manages multi-language content in database

**Real-time Updates:**
- Supabase channels for postgres_changes events
- Subscription setup in `App.jsx` for listings, playlists, schedules
- Player uses channels for device commands and content updates
- Emergency broadcasts via `EmergencyContext` real-time subscription

---

*Architecture analysis: 2026-02-05*
