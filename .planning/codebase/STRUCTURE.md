# Codebase Structure

**Analysis Date:** 2026-02-12

## Directory Layout

```
bizscreen/
├── src/                    # Application source code
│   ├── pages/             # Top-level page components (lazy-loaded)
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React Context providers (auth, branding, i18n)
│   ├── services/          # Business logic and data access (100+ modules)
│   ├── hooks/             # Custom React hooks
│   ├── router/            # Route definitions and guards
│   ├── auth/              # Authentication pages and layout
│   ├── marketing/         # Public marketing pages
│   ├── player/            # TV player subsystem (offline-capable)
│   ├── layouts/           # Layout wrapper components
│   ├── utils/             # Utility functions and helpers
│   ├── config/            # Configuration files (plans, features, env)
│   ├── design-system/     # UI primitives and tokens
│   ├── i18n/              # Internationalization and locale files
│   ├── security/          # Security utilities (sanitization, validation)
│   ├── legacy/            # Legacy code being phased out
│   ├── templates/         # Content templates
│   ├── types/             # Type definitions (JSDoc patterns)
│   ├── api/               # API utilities (GDPR handlers)
│   ├── __fixtures__/      # Test fixtures and mock data
│   ├── main.jsx           # Application entry point
│   ├── App.jsx            # Main app shell with routing
│   ├── Player.jsx         # Player routing entry point
│   ├── TV.jsx             # Legacy TV player entry point
│   └── supabase.js        # Supabase client initialization
├── tests/                 # Test files (unit, integration, e2e)
├── supabase/              # Database schema and functions
│   ├── migrations/        # SQL migration files
│   ├── functions/         # Edge functions (RSS proxy, Unsplash proxy)
│   └── tests/             # Supabase function tests
├── public/                # Static assets
├── docs/                  # Documentation
├── scripts/               # Build and utility scripts
├── android-tv-player/     # Android TV player app
├── yodeck-capture/        # Yodeck layout capture tool
├── playwright/            # Playwright test configuration
├── .planning/             # GSD planning and phase documents
├── dist/                  # Build output (generated)
├── vite.config.js         # Vite build configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
└── index.html             # HTML entry point
```

## Directory Purposes

**src/pages:**
- Purpose: Top-level page components mapped to routes
- Contains: 60+ page components (DashboardPage, PlaylistEditorPage, etc.)
- Key files: `src/pages/DashboardPage.jsx`, `src/pages/PlaylistEditorPage.jsx`, `src/pages/LayoutEditorPage.jsx`
- Pattern: Default export, lazy-loaded via React.lazy(), accept navigation callbacks

**src/components:**
- Purpose: Reusable UI components organized by domain
- Contains: Subdirectories per feature area (analytics, campaigns, media, schedules, etc.)
- Key files: `src/components/layout/Header.jsx`, `src/components/FeatureGate.jsx`, `src/components/ErrorBoundary.jsx`
- Subfolders: `analytics/`, `campaigns/`, `dashboard/`, `layout/`, `layout-editor/`, `media/`, `modals/`, `player/`, `scene-editor/`, `schedules/`, `screens/`, `svg-editor/`, `templates/`

**src/services:**
- Purpose: Business logic and data access layer
- Contains: 100+ service modules, each handling a specific domain
- Key files: `src/services/playlistService.js`, `src/services/mediaService.js`, `src/services/campaignService.js`, `src/services/authService.js`, `src/services/loggingService.js`
- Pattern: Export async functions, JSDoc typed, use createScopedLogger for logging

**src/contexts:**
- Purpose: Global state management via React Context
- Contains: AuthContext, BrandingContext, EmergencyContext, I18nContext
- Key files: `src/contexts/AuthContext.jsx`, `src/contexts/BrandingContext.jsx`
- Pattern: createContext + custom hook (useAuth, useBranding)

**src/hooks:**
- Purpose: Custom reusable React hooks
- Contains: useFeatureFlag, useLogger, useLayout, usePlayerMetrics, etc.
- Key files: `src/hooks/useFeatureFlag.jsx`, `src/hooks/useLogger.js`
- Pattern: Prefix with `use`, return state and handlers

**src/player:**
- Purpose: Offline-capable TV player subsystem
- Contains: Player pages, hooks, components, offline service, cache service
- Key files: `src/player/pages/ViewPage.jsx`, `src/player/offlineService.js`, `src/player/hooks/usePlayerContent.js`
- Subdirectories: `pages/`, `hooks/`, `components/`

**src/router:**
- Purpose: Route definitions and navigation guards
- Contains: AppRouter with lazy-loaded routes, RequireAuth, PublicRoute
- Key files: `src/router/AppRouter.jsx`
- Pattern: React Router v7 with Sentry-wrapped routes

**src/auth:**
- Purpose: Authentication UI and flows
- Contains: Login, signup, password reset, OAuth callback pages
- Key files: `src/auth/LoginPage.jsx`, `src/auth/SignupPage.jsx`, `src/auth/AuthLayout.jsx`

**src/marketing:**
- Purpose: Public marketing website pages
- Contains: Home, pricing, features pages with marketing layout
- Key files: `src/marketing/HomePage.jsx`, `src/marketing/PricingPage.jsx`, `src/marketing/MarketingLayout.jsx`

**src/design-system:**
- Purpose: Reusable UI primitives and design tokens
- Contains: Button, Modal, Alert, SearchBar, tokens.css
- Key files: `src/design-system/components/Button.jsx`, `src/design-system/tokens.css`

**src/utils:**
- Purpose: Utility functions and helpers
- Contains: Observability, error tracking, formatting, validation
- Key files: `src/utils/observability.js`, `src/utils/errorTracking.jsx`

**src/config:**
- Purpose: Application configuration
- Contains: Plan definitions, feature flags, environment settings
- Key files: `src/config/plans.js`, `src/config/featureFlags.js`, `src/config/env.js`

**src/i18n:**
- Purpose: Internationalization
- Contains: I18nContext, translation utilities, locale JSON files
- Key files: `src/i18n/I18nContext.jsx`, `src/i18n/locales/en.json`

**supabase/migrations:**
- Purpose: Database schema evolution
- Contains: SQL migration files (001_initial_schema.sql, 014_yodeck_phase1_media_playlists.sql, etc.)
- Pattern: Numbered migrations, applied in order

**tests/**
- Purpose: Test files
- Contains: Unit tests (tests/unit), integration tests (tests/integration), e2e tests (tests/e2e)
- Key files: `tests/e2e/*.spec.js` (Playwright tests)
- Pattern: Co-located with source or in tests/ directory

## Key File Locations

**Entry Points:**
- `index.html`: HTML entry point
- `src/main.jsx`: React root, providers, observability initialization
- `src/App.jsx`: Main app shell with role-based routing
- `src/Player.jsx`: Player routing (/player, /player/view)
- `src/TV.jsx`: Legacy TV player routing

**Configuration:**
- `package.json`: Dependencies and npm scripts
- `vite.config.js`: Vite build config with code splitting, Sentry plugin
- `tailwind.config.js`: Tailwind CSS theme configuration
- `eslint.config.js`: ESLint rules
- `playwright.config.js`: E2E test configuration
- `vitest.config.js`: Unit test configuration

**Core Logic:**
- `src/supabase.js`: Supabase client initialization
- `src/contexts/AuthContext.jsx`: Authentication state management
- `src/services/loggingService.js`: Structured logging
- `src/utils/observability.js`: Sentry, logging, web vitals setup
- `src/router/AppRouter.jsx`: Route definitions and guards

**Testing:**
- `tests/e2e/dashboard.spec.js`: Dashboard E2E tests
- `tests/unit/services/playlistService.test.js`: Service unit tests
- `tests/mocks/`: MSW handlers for API mocking

## Naming Conventions

**Files:**
- Pages: PascalCase with `Page` suffix (e.g., `DashboardPage.jsx`)
- Components: PascalCase (e.g., `Header.jsx`, `FeatureGate.jsx`)
- Services: camelCase with `Service` suffix (e.g., `playlistService.js`, `authService.js`)
- Hooks: camelCase with `use` prefix (e.g., `useFeatureFlag.jsx`, `useAuth.js`)
- Utilities: camelCase (e.g., `observability.js`, `errorTracking.jsx`)
- Contexts: PascalCase with `Context` suffix (e.g., `AuthContext.jsx`)

**Directories:**
- Lowercase with hyphens for multi-word (e.g., `layout-editor/`, `scene-editor/`)
- Lowercase single word where possible (e.g., `pages/`, `services/`)

**Variables:**
- Components: PascalCase (e.g., `const Header = () => {}`)
- Functions: camelCase (e.g., `function fetchPlaylists() {}`)
- Constants: UPPER_SNAKE_CASE (e.g., `const API_VERSION = 'v1'`)
- React hooks: camelCase with `use` prefix (e.g., `const useAuth = () => {}`)

**Types (JSDoc):**
- Type definitions: `@typedef {Object} TypeName`
- Exported types at top of service files
- PascalCase for type names (e.g., `@typedef {Object} Playlist`)

## Where to Add New Code

**New Feature Page:**
- Primary code: `src/pages/NewFeaturePage.jsx`
- Tests: `tests/e2e/new-feature.spec.js` or `tests/unit/pages/NewFeaturePage.test.jsx`
- Route: Add to `src/router/AppRouter.jsx` or `src/App.jsx` (for client UI pages)

**New Component:**
- Implementation: `src/components/{domain}/NewComponent.jsx`
- Reusable across features: `src/design-system/components/NewComponent.jsx`
- Domain-specific: `src/components/{domain}/` (e.g., `src/components/campaigns/`, `src/components/media/`)

**New Service:**
- Implementation: `src/services/newFeatureService.js`
- Pattern: Export functions, use JSDoc, create scoped logger
- Tests: `tests/unit/services/newFeatureService.test.js`

**New Hook:**
- Implementation: `src/hooks/useNewFeature.js`
- Player-specific: `src/player/hooks/useNewFeature.js`
- Pattern: Return state and handlers, use dependency array

**Utilities:**
- Shared helpers: `src/utils/newUtility.js`
- Security utilities: `src/security/newSecurityUtil.js`
- Player utilities: `src/player/newPlayerUtil.js`

**Database Changes:**
- Schema: Create new migration in `supabase/migrations/NNN_description.sql`
- RPC functions: Add to migration or new SQL file
- Pattern: Numbered sequentially, descriptive name

**Configuration:**
- Feature flags: `src/config/featureFlags.js`
- Plans/tiers: `src/config/plans.js`
- Environment: `src/config/env.js`

## Special Directories

**src/legacy:**
- Purpose: Deprecated code being phased out
- Generated: No
- Committed: Yes
- Note: Avoid adding new code here, refactor/remove over time

**dist:**
- Purpose: Vite build output
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignore)
- Note: Production bundle, deployed to hosting

**node_modules:**
- Purpose: NPM dependencies
- Generated: Yes (via `npm install`)
- Committed: No (.gitignore)

**playwright-report:**
- Purpose: Playwright HTML test reports
- Generated: Yes (via `npm run test:e2e`)
- Committed: No (.gitignore)

**test-results:**
- Purpose: Playwright test artifacts (screenshots, traces)
- Generated: Yes (during test runs)
- Committed: No (.gitignore)

**coverage:**
- Purpose: Vitest code coverage reports
- Generated: Yes (via `npm run test:coverage`)
- Committed: No (.gitignore)

**src/__fixtures__:**
- Purpose: Mock data for tests and development
- Generated: No
- Committed: Yes
- Files: `playlists.js`, `schedules.js`, `screens.js`

**android-tv-player:**
- Purpose: Native Android TV player app
- Generated: No (hand-written Kotlin/Java)
- Committed: Yes
- Pattern: Standard Android project structure

**yodeck-capture:**
- Purpose: Tool to capture Yodeck layouts for migration
- Generated: No
- Committed: Yes
- Pattern: Node.js script with Puppeteer

**.planning:**
- Purpose: GSD planning documents and phase execution records
- Generated: Yes (by GSD commands)
- Committed: Yes
- Structure: `phases/`, `codebase/`, `PROJECT.md`

---

*Structure analysis: 2026-02-12*
