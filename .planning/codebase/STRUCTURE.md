# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
bizscreen/
├── src/                    # Application source code
│   ├── pages/             # Top-level page components (lazy-loaded)
│   ├── components/        # Reusable UI components by domain
│   ├── contexts/          # React Context providers (auth, branding, i18n, emergency)
│   ├── services/          # Business logic and data access (100+ modules)
│   ├── hooks/             # Custom React hooks (feature flags, media, layout, logger)
│   ├── router/            # Route definitions and auth guards
│   ├── auth/              # Authentication pages and layout
│   ├── marketing/         # Public marketing pages (home, pricing, features)
│   ├── player/            # TV player subsystem (offline-capable)
│   │   ├── pages/         # Player pages (ViewPage, PairPage)
│   │   ├── components/    # Player-specific components (ZonePlayer, SceneRenderer, widgets)
│   │   ├── hooks/         # Player hooks (usePlayerContent, usePlayerHeartbeat, etc.)
│   │   ├── contexts/      # Player contexts (DataRefreshContext)
│   │   ├── cacheService.js       # IndexedDB caching for offline playback
│   │   └── offlineService.js     # Offline content management
│   ├── layouts/           # Layout wrapper components (Layout1-4)
│   ├── utils/             # Utility functions and helpers
│   ├── config/            # Configuration (plans, features, app catalog, env)
│   ├── design-system/     # UI primitives and design tokens
│   ├── i18n/              # Internationalization and locale files
│   ├── security/          # Security utilities (sanitization, XSS prevention)
│   ├── legacy/            # Legacy code being phased out
│   ├── templates/         # Content templates
│   ├── types/             # Type definitions (JSDoc patterns)
│   ├── api/               # API utilities (GDPR handlers)
│   ├── __fixtures__/      # Test fixtures and mock data
│   ├── main.jsx           # Application entry point
│   ├── App.jsx            # Main app shell with role-based routing
│   ├── Player.jsx         # Player routing entry point
│   ├── TV.jsx             # Legacy TV player entry point
│   ├── ScaledStage.jsx    # Canvas scaling utility
│   ├── supabase.js        # Supabase client initialization
│   ├── getConfig.js       # TV config fetching helper
│   └── index.css          # Global styles (Tailwind imports)
├── tests/                 # Test files (unit, integration, e2e)
│   ├── e2e/              # Playwright E2E tests
│   ├── unit/             # Vitest unit tests
│   ├── integration/      # Integration tests
│   ├── mocks/            # MSW mock handlers
│   ├── utils/            # Test utilities
│   └── load/             # Load tests (k6)
├── supabase/              # Database schema and functions
│   ├── migrations/        # SQL migration files (numbered, sequential)
│   ├── functions/         # Edge functions (RSS proxy, Unsplash proxy)
│   └── snippets/          # Reusable SQL snippets
├── public/                # Static assets (favicon, robots.txt)
├── docs/                  # Documentation (architecture, admin panel, licensing)
├── scripts/               # Build and utility scripts
├── android-tv-player/     # Android TV player app (Kotlin/Java)
├── yodeck-capture/        # Yodeck layout capture tool (Puppeteer)
├── playwright/            # Playwright test configuration and auth state
├── .planning/             # GSD planning and phase documents
│   ├── phases/            # Phase execution records
│   ├── codebase/          # Codebase analysis documents
│   └── PROJECT.md         # Project overview
├── dist/                  # Build output (generated)
├── vite.config.js         # Vite build configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── eslint.config.js       # ESLint rules
├── playwright.config.js   # Playwright E2E test config
├── vitest.config.js       # Vitest unit test config
└── index.html             # HTML entry point
```

## Directory Purposes

**src/pages:**
- Purpose: Top-level page components mapped to routes
- Contains: 70+ page components (DashboardPage, PlaylistEditorPage, CampaignEditorPage, etc.)
- Key files: `src/pages/DashboardPage.jsx`, `src/pages/PlaylistEditorPage.jsx`, `src/pages/LayoutEditorPage.jsx`, `src/pages/SceneEditorPage.jsx`, `src/pages/MediaLibraryPage.jsx`, `src/pages/ScreensPage.jsx`, `src/pages/CampaignsPage.jsx`
- Pattern: Default export, lazy-loaded via `React.lazy()`, accept navigation callbacks (`onNavigate`, `setCurrentPage`), receive `showToast` for notifications
- Subdirectories: `Admin/` (admin-specific pages like AdminTenantDetailPage), `LayoutEditor/` (Yodeck layout editor pages), `LayoutTemplates/` (template gallery)

**src/components:**
- Purpose: Reusable UI components organized by domain
- Contains: Subdirectories per feature area with 200+ components
- Key files: `src/components/layout/Header.jsx`, `src/components/FeatureGate.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/Toast.jsx`, `src/components/AnnouncementBanner.jsx`
- Subfolders: `analytics/`, `apps/`, `brand/`, `campaigns/`, `dashboard/`, `data-sources/`, `feature-flags/`, `layout/`, `layout-editor/`, `listings/`, `media/`, `modals/`, `notifications/`, `onboarding/`, `player/`, `scene-editor/`, `scenes/`, `schedules/`, `screens/`, `security/`, `svg-editor/`, `tables/`, `templates/`, `translations/`, `welcome/`, `compliance/`, `Admin/`, `WeatherWall/`
- Pattern: Components export as named or default, use context hooks for global state, accept props for customization

**src/services:**
- Purpose: Business logic and data access layer
- Contains: 100+ service modules, each handling a specific domain
- Key files: `src/services/playlistService.js`, `src/services/mediaService.js`, `src/services/campaignService.js`, `src/services/scheduleService.js`, `src/services/screenService.js`, `src/services/authService.js`, `src/services/loggingService.js`, `src/services/billingService.js`, `src/services/dataSourceService.js`, `src/services/playerAnalyticsService.js`
- Pattern: Export async functions with JSDoc typing, use `createScopedLogger('ServiceName')` for logging, throw descriptive errors, include rate limiting checks, RLS-aware queries
- Examples: `accountPlanService.js`, `activityLogService.js`, `adminService.js`, `alertEngineService.js`, `analyticsService.js`, `apiTokenService.js`, `approvalService.js`, `assistantService.js`, `auditService.js`, `autoTaggingService.js`, `brandAiService.js`, `brandThemeService.js`, `brandingService.js`, `cacheService.js`, `canvaService.js`, `clientService.js`, `complianceService.js`, `contentAnalyticsService.js`, `dashboardService.js`, `dataBindingResolver.js`, `dataFeedScheduler.js`, `daypartService.js`, `demoService.js`, `deviceScreenshotService.js`, `deviceSyncService.js`, `domainService.js`, `emailService.js`, and 70+ more

**src/contexts:**
- Purpose: Global state management via React Context
- Contains: AuthContext, BrandingContext, EmergencyContext, I18nContext, DataRefreshContext
- Key files: `src/contexts/AuthContext.jsx`, `src/contexts/BrandingContext.jsx`, `src/contexts/EmergencyContext.jsx`
- Pattern: `createContext()` + custom hook (e.g., `useAuth`), provider wraps app in `main.jsx`, manages side effects in `useEffect`, exposes state and actions

**src/hooks:**
- Purpose: Custom reusable React hooks
- Contains: 17 custom hooks for common patterns
- Key files: `src/hooks/useFeatureFlag.jsx`, `src/hooks/useLogger.js`, `src/hooks/useMedia.js`, `src/hooks/useLayout.js`, `src/hooks/usePlayerMetrics.js`, `src/hooks/useAdmin.js`, `src/hooks/useAuditLogs.js`, `src/hooks/useDataCache.js`, `src/hooks/useS3Upload.jsx`, `src/hooks/useMediaQuery.js`, `src/hooks/useUnifiedOnboarding.js`
- Pattern: Prefix with `use`, return state and handlers, encapsulate side effects, use dependencies array correctly

**src/player:**
- Purpose: Offline-capable TV player subsystem
- Contains: Player pages, hooks, components, offline service, cache service, contexts
- Key files: `src/player/pages/ViewPage.jsx`, `src/player/offlineService.js`, `src/player/cacheService.js`, `src/player/hooks/usePlayerContent.js`, `src/player/hooks/usePlayerHeartbeat.js`, `src/player/hooks/usePlayerPlayback.js`, `src/player/hooks/useDataRefreshOrchestrator.js`, `src/player/components/SceneRenderer.jsx`, `src/player/components/ZonePlayer.jsx`, `src/player/components/AppRenderer.jsx`, `src/player/contexts/DataRefreshContext.jsx`
- Subdirectories: `pages/` (ViewPage), `hooks/` (player-specific hooks), `components/` (player UI components + widgets subfolder)
- Widget components: `src/player/components/widgets/WeatherWidget.jsx`, `ClockWidget.jsx`, `DateWidget.jsx`, `QRCodeWidget.jsx`, `DataTableWidget.jsx`, `RssTickerWidget.jsx`, `RssCardWidget.jsx`, `SocialFeedWidget.jsx`, `CountdownWidget.jsx`, `SyncStatusIndicator.jsx`
- Pattern: Isolated subsystem with own routing, IndexedDB for caching, data refresh orchestration, offline-first

**src/router:**
- Purpose: Route definitions and navigation guards
- Contains: AppRouter with lazy-loaded routes, auth guards
- Key files: `src/router/AppRouter.jsx`
- Pattern: React Router v7 with lazy loading, `RequireAuth` wrapper for protected routes, `PublicRoute` wrapper redirects authenticated users, Sentry-wrapped routes for error tracking

**src/auth:**
- Purpose: Authentication UI and flows
- Contains: Login, signup, password reset, OAuth callback pages, auth layout
- Key files: `src/auth/LoginPage.jsx`, `src/auth/SignupPage.jsx`, `src/auth/ResetPasswordPage.jsx`, `src/auth/UpdatePasswordPage.jsx`, `src/auth/AcceptInvitePage.jsx`, `src/auth/AuthCallbackPage.jsx`, `src/auth/AuthLayout.jsx`
- Pattern: Forms with validation, call authService functions, redirect on success

**src/marketing:**
- Purpose: Public marketing website pages
- Contains: Home, pricing, features pages with marketing layout
- Key files: `src/marketing/HomePage.jsx`, `src/marketing/PricingPage.jsx`, `src/marketing/FeaturesPage.jsx`, `src/marketing/MarketingLayout.jsx`
- Pattern: Static content with animations (Framer Motion), SEO optimized, lazy loaded

**src/design-system:**
- Purpose: Reusable UI primitives and design tokens
- Contains: Button, Modal, Alert, SearchBar, FilterChips, EmptyState, CreateLayoutModal components
- Key files: `src/design-system/components/Button.jsx`, `src/design-system/components/Alert.jsx`, `src/design-system/components/SearchBar.jsx`, `src/design-system/components/EmptyState.jsx`
- Pattern: Token-based theming with CSS variables, Tailwind utility classes, consistent API

**src/utils:**
- Purpose: Utility functions and helpers
- Contains: Observability, error tracking, formatting, validation utilities
- Key files: `src/utils/observability.js`, `src/utils/errorTracking.jsx`, `src/utils/errorMessages.js`, `src/utils/supabaseErrorInterceptor.js`, `src/utils/formatters.js`, `src/utils/pii.js`, `src/utils/safeStringify.js`, `src/utils/seo.js`
- Pattern: Pure functions, initialization functions for side effects, exported utilities

**src/config:**
- Purpose: Application configuration
- Contains: Plan definitions, feature flags, app catalog, environment settings
- Key files: `src/config/plans.js`, `src/config/featureFlags.js`, `src/config/appCatalog.js`, `src/config/env.js`, `src/config/yodeckTheme.js`
- Pattern: Export constants, enums, and configuration objects, no runtime state

**src/i18n:**
- Purpose: Internationalization
- Contains: I18nContext, translation utilities, locale JSON files
- Key files: `src/i18n/I18nContext.jsx`, `src/i18n/locales/en.json`
- Pattern: Context provider with `useTranslation()` hook, JSON locale files with nested keys

**src/security:**
- Purpose: Security utilities
- Contains: HTML sanitization, XSS prevention
- Key files: `src/security/sanitizeHtml.js`, `src/security/index.js`
- Pattern: Wrapper around DOMPurify, security-focused utilities

**src/layouts:**
- Purpose: Layout wrapper components for TV displays
- Contains: Layout1-4 components for different screen configurations
- Key files: `src/layouts/Layout1.jsx`, `src/layouts/Layout2.jsx`, `src/layouts/Layout3.jsx`, `src/layouts/Layout4.jsx`, `src/layouts/index.js`
- Pattern: Functional layouts with zone configuration, used by TV player

**src/legacy:**
- Purpose: Deprecated code being phased out
- Contains: Old pages and components from pre-Yodeck architecture
- Key files: `src/legacy/pages/FAQsPage.jsx`, `src/legacy/pages/ReferPage.jsx`, `src/legacy/pages/SetupPage.jsx`, `src/legacy/pages/SubscriptionPage.jsx`, `src/legacy/pages/UsersPage.jsx`
- Note: Avoid adding new code here, refactor/remove over time

**supabase/migrations:**
- Purpose: Database schema evolution
- Contains: 100+ SQL migration files (001_initial_schema.sql, 014_yodeck_phase1_media_playlists.sql, etc.)
- Pattern: Numbered sequentially with descriptive names, applied in order, idempotent where possible
- Key migrations: Initial schema, RLS policies, feature flags, media library, playlists, schedules, screens, campaigns, analytics, billing

**tests/**
- Purpose: Test files across all test types
- Contains: E2E (Playwright), unit (Vitest), integration tests, mocks
- Key files: `tests/e2e/dashboard.spec.js`, `tests/e2e/playlists.spec.js`, `tests/unit/services/playlistService.test.js`, `tests/mocks/supabase.js`
- Subdirectories: `e2e/` (Playwright specs), `unit/` (Vitest tests), `integration/` (API tests), `mocks/` (MSW handlers), `utils/` (test helpers), `load/` (k6 load tests)
- Pattern: Co-located with source or in dedicated test directories, use MSW for API mocking

## Key File Locations

**Entry Points:**
- `index.html`: HTML entry point, Vite script injection point
- `src/main.jsx`: React root, provider setup, observability initialization
- `src/App.jsx`: Main app shell with role-based routing and UI layout
- `src/Player.jsx`: Player routing (`/player`, `/player/view`)
- `src/TV.jsx`: Legacy TV player routing (`/tv?otp=...`)

**Configuration:**
- `package.json`: Dependencies (React 19, Supabase, Vite, Playwright, Vitest) and npm scripts
- `vite.config.js`: Vite build config with code splitting, Sentry plugin, API routes plugin, source maps
- `tailwind.config.js`: Tailwind CSS theme configuration with custom colors
- `eslint.config.js`: ESLint rules (React hooks, unused imports, JSDoc)
- `playwright.config.js`: E2E test configuration with auth state reuse
- `vitest.config.js`: Unit test configuration with jsdom environment
- `.env.example`: Environment variable template

**Core Logic:**
- `src/supabase.js`: Supabase client initialization with PKCE auth and error instrumentation
- `src/contexts/AuthContext.jsx`: Authentication state management with retry logic
- `src/services/loggingService.js`: Structured logging with scoped loggers
- `src/utils/observability.js`: Sentry, logging, web vitals initialization
- `src/router/AppRouter.jsx`: Route definitions and auth guards
- `src/getConfig.js`: TV player config fetching helper

**Testing:**
- `tests/e2e/dashboard.spec.js`: Dashboard E2E tests
- `tests/e2e/playlists.spec.js`: Playlist management E2E tests
- `tests/unit/services/playlistService.test.js`: Playlist service unit tests
- `tests/mocks/supabase.js`: Supabase client mock
- `playwright/.auth/user.json`: Authenticated state for E2E tests

**Documentation:**
- `PROJECT_SUMMARY.md`: High-level project overview
- `docs/ARCHITECTURE.md`: Architecture documentation
- `docs/ADMIN_PANEL.md`: Admin panel documentation
- `docs/LICENSING.md`: Licensing system documentation
- `docs/yodeck-ui-reference.md`: Yodeck UI migration reference
- `CHANGELOG.md`: Version history
- `PRODUCTION_RUNBOOK.md`: Production operations guide

## Naming Conventions

**Files:**
- Pages: PascalCase with `Page` suffix (e.g., `DashboardPage.jsx`, `PlaylistEditorPage.jsx`)
- Components: PascalCase (e.g., `Header.jsx`, `FeatureGate.jsx`, `AnnouncementBanner.jsx`)
- Services: camelCase with `Service` suffix (e.g., `playlistService.js`, `authService.js`, `mediaService.js`)
- Hooks: camelCase with `use` prefix (e.g., `useFeatureFlag.jsx`, `useAuth.js`, `useLogger.js`)
- Utilities: camelCase (e.g., `observability.js`, `errorTracking.jsx`, `formatters.js`)
- Contexts: PascalCase with `Context` suffix (e.g., `AuthContext.jsx`, `BrandingContext.jsx`)
- Config: camelCase (e.g., `plans.js`, `featureFlags.js`, `appCatalog.js`)

**Directories:**
- Lowercase with hyphens for multi-word (e.g., `layout-editor/`, `scene-editor/`, `data-sources/`)
- Lowercase single word where possible (e.g., `pages/`, `services/`, `hooks/`, `utils/`)
- PascalCase for special directories (e.g., `Admin/`, `WeatherWall/`)

**Variables:**
- Components: PascalCase (e.g., `const Header = () => {}`, `const FeatureGate = ({ feature }) => {}`)
- Functions: camelCase (e.g., `function fetchPlaylists() {}`, `async function updateMedia() {}`)
- Constants: UPPER_SNAKE_CASE (e.g., `const API_VERSION = 'v1'`, `const MAX_FILE_SIZE = 100`)
- React hooks: camelCase with `use` prefix (e.g., `const useAuth = () => {}`)
- Private functions: camelCase with `_` prefix (e.g., `const _logger = createScopedLogger()`)

**Types (JSDoc):**
- Type definitions: `@typedef {Object} TypeName`
- Exported types at top of service files
- PascalCase for type names (e.g., `@typedef {Object} Playlist`, `@typedef {Object} MediaAsset`)
- Property documentation: `@property {type} name - description`

**Database:**
- Tables: snake_case plural (e.g., `media_assets`, `playlists`, `screen_devices`)
- Columns: snake_case (e.g., `owner_id`, `created_at`, `sort_order`)
- RPC functions: snake_case (e.g., `pair_tv_device`, `get_player_content`, `player_heartbeat`)
- Migrations: numbered with description (e.g., `001_initial_schema.sql`, `014_yodeck_phase1_media_playlists.sql`)

## Where to Add New Code

**New Feature Page:**
- Primary code: `src/pages/NewFeaturePage.jsx`
- Tests: `tests/e2e/new-feature.spec.js` (E2E) and/or `tests/unit/pages/NewFeaturePage.test.jsx` (unit)
- Route: Add lazy import to `src/App.jsx` in `pages` object and add navigation item if needed
- Pattern: Export default component, accept `showToast`, `onNavigate`, lazy-loaded

**New Component:**
- Domain-specific: `src/components/{domain}/NewComponent.jsx` (e.g., `src/components/campaigns/`, `src/components/media/`)
- Reusable across features: `src/design-system/components/NewComponent.jsx`
- Player-specific: `src/player/components/NewComponent.jsx`
- Widget: `src/player/components/widgets/NewWidget.jsx`
- Pattern: Named or default export, accept props, use context hooks

**New Service:**
- Implementation: `src/services/newFeatureService.js`
- Pattern: Export async functions with JSDoc, use `createScopedLogger('NewFeatureService')`, include error handling, rate limiting if needed
- Tests: `tests/unit/services/newFeatureService.test.js`
- Usage: Import in components/hooks/contexts

**New Hook:**
- Implementation: `src/hooks/useNewFeature.js` (app-level) or `src/player/hooks/useNewFeature.js` (player-specific)
- Pattern: Prefix with `use`, return state and handlers, use dependency array, handle cleanup
- Tests: `tests/unit/hooks/useNewFeature.test.js`

**New Context:**
- Implementation: `src/contexts/NewContext.jsx`
- Pattern: `createContext()` + custom hook, provider wraps app or subsystem, manages side effects
- Usage: Add provider to `src/main.jsx` or relevant component

**Utilities:**
- Shared helpers: `src/utils/newUtility.js`
- Security utilities: `src/security/newSecurityUtil.js`
- Player utilities: `src/player/newPlayerUtil.js`
- Pattern: Pure functions, well-documented, unit tested

**Database Changes:**
- Schema: Create new migration `supabase/migrations/NNN_description.sql` (increment number)
- RPC functions: Add to migration file or create dedicated function migration
- Pattern: Numbered sequentially, descriptive name, include rollback if possible, test locally first

**Configuration:**
- Feature flags: Add to `src/config/featureFlags.js`
- Plans/tiers: Update `src/config/plans.js` (Feature enum, PlanConfig)
- Apps/widgets: Add to `src/config/appCatalog.js`
- Environment: Add to `src/config/env.js` and `.env.example`

**Player Widget:**
- Implementation: `src/player/components/widgets/NewWidget.jsx`
- Pattern: Use `useWidgetData` hook, implement `dataFetcher` function, show `SyncStatusIndicator`, cache data
- Config: Add to `src/config/appCatalog.js` widget definitions
- Renderer: Add case to `SceneRenderer.jsx` widget registry

## Special Directories

**src/legacy:**
- Purpose: Deprecated code being phased out
- Generated: No
- Committed: Yes
- Note: Contains pre-Yodeck UI components and pages. Avoid adding new code here. Refactor or remove over time. Code here may not follow current conventions.

**dist:**
- Purpose: Vite build output
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignore)
- Note: Production bundle with minified JS/CSS, deployed to hosting

**node_modules:**
- Purpose: NPM dependencies
- Generated: Yes (via `npm install`)
- Committed: No (.gitignore)

**playwright-report:**
- Purpose: Playwright HTML test reports
- Generated: Yes (via `npm run test:e2e`)
- Committed: No (.gitignore)
- Note: View in browser to see test results with screenshots

**test-results:**
- Purpose: Playwright test artifacts (screenshots, traces, videos)
- Generated: Yes (during test runs)
- Committed: No (.gitignore)

**coverage:**
- Purpose: Vitest code coverage reports (Istanbul format)
- Generated: Yes (via `npm run test:coverage`)
- Committed: No (.gitignore)

**src/__fixtures__:**
- Purpose: Mock data for tests and development
- Generated: No
- Committed: Yes
- Files: `playlists.js`, `schedules.js`, `screens.js`, `index.js` (barrel export)
- Usage: Import in tests and dev tools

**android-tv-player:**
- Purpose: Native Android TV player app (alternative to web player)
- Generated: No (hand-written Kotlin/Java)
- Committed: Yes
- Pattern: Standard Android project structure with Gradle build
- Note: Separate codebase, communicates with backend via same APIs

**yodeck-capture:**
- Purpose: Tool to capture Yodeck layouts for migration analysis
- Generated: No
- Committed: Yes
- Pattern: Node.js script with Puppeteer for browser automation
- Note: Used during Yodeck UI migration, not part of production app

**.planning:**
- Purpose: GSD (Get Shit Done) planning documents and phase execution records
- Generated: Yes (by GSD commands: `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:map-codebase`)
- Committed: Yes
- Structure: `phases/` (phase plans and execution logs), `codebase/` (codebase analysis docs), `PROJECT.md` (project summary)
- Note: Reference documents for development workflow, updated by GSD commands

**supabase/snippets:**
- Purpose: Reusable SQL snippets for development
- Generated: No
- Committed: Yes
- Note: Helper queries for testing and debugging, not part of migrations

**playwright/.auth:**
- Purpose: Authenticated session state for E2E tests
- Generated: Yes (via auth setup script)
- Committed: No (.gitignore)
- Note: Speeds up E2E tests by reusing authenticated session

**scripts:**
- Purpose: Build and utility scripts
- Generated: No
- Committed: Yes
- Files: E2E gate script, CI test seeding, sitemap generation, load test runners, Polotno build
- Pattern: Node.js or shell scripts, run via npm scripts

---

*Structure analysis: 2026-02-13*
