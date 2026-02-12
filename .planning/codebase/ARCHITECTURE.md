# Architecture

**Analysis Date:** 2026-02-12

## Pattern Overview

**Overall:** Single-Page Application (SPA) with Client-Side Routing and Multi-Tenant Architecture

**Key Characteristics:**
- React SPA with lazy-loaded route-based code splitting
- Context-based state management (no Redux/Zustand)
- Service layer pattern for business logic and data access
- Multi-tenant with role-based UI rendering (super_admin, admin, client)
- Real-time updates via Supabase subscriptions
- Offline-capable player subsystem with IndexedDB caching

## Layers

**Presentation Layer:**
- Purpose: User interface and interaction handling
- Location: `src/pages`, `src/components`, `src/marketing`, `src/auth`
- Contains: Page components, reusable UI components, forms, modals
- Depends on: Contexts (auth, branding, emergency), Hooks, Services
- Used by: Router (AppRouter.jsx)
- Pattern: Lazy-loaded pages with Suspense, component composition

**Context Layer:**
- Purpose: Global application state and cross-cutting concerns
- Location: `src/contexts`
- Contains: AuthContext, BrandingContext, EmergencyContext, I18nContext
- Depends on: Services (authService, brandingService, loggingService)
- Used by: All components needing global state
- Pattern: React Context API with custom hooks (useAuth, useBranding)

**Service Layer:**
- Purpose: Business logic, API calls, data transformations
- Location: `src/services`
- Contains: 100+ service modules for domain logic (playlistService, mediaService, campaignService, etc.)
- Depends on: Supabase client (`src/supabase.js`), logging service
- Used by: Components, Contexts, Hooks
- Pattern: Functional modules with typed JSDoc, async/await for data operations

**Data Access Layer:**
- Purpose: Database and external API communication
- Location: `src/supabase.js` (client initialization), service layer (queries)
- Contains: Supabase client configuration, RPC function calls, database queries
- Depends on: Supabase JS SDK, environment configuration
- Used by: Service layer exclusively
- Pattern: All database access flows through services (no direct supabase calls from components)

**Player Subsystem:**
- Purpose: Content playback engine for digital signage displays
- Location: `src/player`, `src/Player.jsx`, `src/TV.jsx`
- Contains: Offline-capable content player, pairing flow, heartbeat system, command polling
- Depends on: playerService, offlineService, IndexedDB cache
- Used by: TV/display devices via `/player/*` and `/tv/*` routes
- Pattern: Isolated subsystem with own routing, hooks, and offline-first architecture

**Router Layer:**
- Purpose: URL-based navigation and route protection
- Location: `src/router/AppRouter.jsx`, `src/main.jsx`
- Contains: Route definitions, auth guards (RequireAuth, PublicRoute), lazy loading
- Depends on: AuthContext, page components (lazy-loaded)
- Used by: main.jsx as application entry point
- Pattern: React Router v7 with Sentry-wrapped routes for error tracking

**Design System:**
- Purpose: Reusable UI primitives and design tokens
- Location: `src/design-system`
- Contains: Button, Modal, Alert, SearchBar, tokens.css
- Depends on: Tailwind CSS, Framer Motion
- Used by: All components for consistent UI
- Pattern: Token-based theming with CSS variables

## Data Flow

**User Authentication Flow:**

1. User navigates to `/auth/login` (PublicRoute guard)
2. LoginPage calls `authService.signIn(email, password)`
3. authService communicates with Supabase Auth
4. On success, AuthContext.fetchUserProfile() loads profile from `profiles` table
5. AuthContext updates user state, triggers re-render
6. App.jsx detects user, renders role-appropriate dashboard or client UI
7. setObservabilityUser() updates Sentry context

**Content Playback Flow:**

1. TV device navigates to `/player` and displays pairing code
2. User pairs device via `/pair/:deviceId` route
3. Player polls playerService.getPlayerContent(screenId) every 30s
4. playerService.getPlayerContent() calls RPC `get_player_content(screen_id)`
5. Supabase returns resolved playlist with media URLs
6. Player caches content in IndexedDB via offlineService
7. Player renders content using LayoutElementRenderer or AppRenderer
8. Heartbeat every 60s via playerService.heartbeat(screenId)

**Real-time Update Flow:**

1. Component mounts, subscribes to Supabase channel (e.g., `listings-${user.id}`)
2. User modifies data via service layer (e.g., playlistService.updatePlaylist())
3. Service performs Supabase query, database updates
4. Postgres triggers real-time notification
5. Supabase broadcasts change to subscribed clients
6. Component's subscription callback receives payload
7. Component updates local state (via useState setter)
8. React re-renders affected UI

**State Management:**
- Global state: React Context (auth, branding, emergency, i18n, feature flags)
- Local state: React useState/useReducer in components
- Server state: Direct Supabase queries in services, no caching layer (except player offline cache)
- Form state: Controlled components with local useState

## Key Abstractions

**Service Modules:**
- Purpose: Encapsulate domain logic and data access
- Examples: `src/services/playlistService.js`, `src/services/campaignService.js`, `src/services/screenService.js`
- Pattern: Export async functions, JSDoc typed, scoped logger per service
- Usage: `import { fetchPlaylists } from '../services/playlistService'`

**Context Providers:**
- Purpose: Share state across component tree without prop drilling
- Examples: `src/contexts/AuthContext.jsx`, `src/contexts/BrandingContext.jsx`
- Pattern: createContext + custom hook (useAuth, useBranding)
- Usage: Wrap in `main.jsx`, consume via `const { user } = useAuth()`

**Custom Hooks:**
- Purpose: Reusable stateful logic
- Examples: `src/hooks/useFeatureFlag.jsx`, `src/hooks/useLayout.js`, `src/player/hooks/usePlayerContent.js`
- Pattern: Prefix with `use`, return state and handlers
- Usage: `const { hasFeature } = useFeatureFlag(Feature.AI_ASSISTANT)`

**Layout Components:**
- Purpose: Structural wrappers for pages
- Examples: `src/layouts/Layout1.jsx`, `src/auth/AuthLayout.jsx`, `src/marketing/MarketingLayout.jsx`
- Pattern: Children prop, shared navigation/header/footer
- Usage: Wrap page content for consistent structure

**Page Components:**
- Purpose: Top-level views mapped to routes
- Examples: `src/pages/DashboardPage.jsx`, `src/pages/PlaylistEditorPage.jsx`
- Pattern: Lazy-loaded via `lazy(() => import('./pages/...'))`, accept navigation props
- Usage: Rendered by AppRouter based on URL

## Entry Points

**Web Application:**
- Location: `src/main.jsx`
- Triggers: Browser loads `index.html`, Vite injects main.jsx
- Responsibilities: Initialize observability (Sentry, logging, web vitals), render React root with providers (ErrorBoundary, I18nProvider, AuthProvider, FeatureFlagProvider, BrowserRouter)

**App Shell:**
- Location: `src/App.jsx`
- Triggers: AuthProvider resolves user, AppRouter routes to `/app/*`
- Responsibilities: Determine user role, render SuperAdminDashboard, AdminDashboard, or client UI with sidebar/header

**Player Application:**
- Location: `src/Player.jsx`
- Triggers: Device navigates to `/player/*`
- Responsibilities: Route to PairPage (`/player`) or ViewPage (`/player/view`), manage pairing and playback

**TV Application:**
- Location: `src/TV.jsx`
- Triggers: Device navigates to `/tv/*`
- Responsibilities: Legacy TV player interface, render layouts based on query params

**Marketing Site:**
- Location: `src/marketing/MarketingLayout.jsx`
- Triggers: Unauthenticated user visits `/`, `/pricing`, `/features`
- Responsibilities: Render public marketing pages with header/footer

## Error Handling

**Strategy:** Multi-layered error boundaries with centralized tracking

**Patterns:**
- Top-level ErrorBoundary wraps entire app (`src/components/ErrorBoundary.jsx`)
- React 19 error handlers on root (onUncaughtError, onCaughtError, onRecoverableError)
- Service layer catches errors, logs via scoped logger, throws for component handling
- Sentry integration captures all errors with context (user, route, breadcrumbs)
- Auth errors trigger retry with exponential backoff (AuthContext)
- Player errors fall back to offline cache

## Cross-Cutting Concerns

**Logging:** Structured logging via `loggingService.js`, scoped loggers per module (createScopedLogger('ModuleName')), console in dev, Sentry breadcrumbs in production

**Validation:** Client-side form validation in components, server-side validation via Supabase RLS policies and check constraints, file upload validation in `s3UploadService.js`

**Authentication:** Supabase Auth with JWT sessions, AuthContext manages user state, RequireAuth/PublicRoute guards protect routes, MFA support via `mfaService.js`, session timeout with retry logic

**Authorization:** Role-based access control (RBAC) via `permissionsService.js`, Supabase RLS policies enforce tenant isolation, feature flags gate premium features (useFeatureFlag hook), approval workflow for content changes

**Internationalization:** I18nContext provides translations, useTranslation hook for components, locale files in `src/i18n/locales`, language switching via LanguageSwitcher component

**Analytics:** Player analytics via `playerAnalyticsService.js`, content performance tracking via `contentAnalyticsService.js`, Web Vitals monitoring via `webVitalsService.js`

**Observability:** Sentry error tracking, structured logging, health monitoring (`healthService.js`), performance monitoring, initialized in `utils/observability.js`

---

*Architecture analysis: 2026-02-12*
