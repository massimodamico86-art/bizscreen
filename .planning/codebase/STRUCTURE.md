# Codebase Structure

**Analysis Date:** 2026-02-05

## Directory Layout

```
bizscreen/
├── src/                          # Application source code
│   ├── pages/                    # Page-level components (70+ pages)
│   ├── components/               # Reusable UI components (60+ components)
│   ├── services/                 # Business logic layer (100+ services)
│   ├── hooks/                    # Custom React hooks (17 hooks)
│   ├── contexts/                 # React context providers (Auth, Branding, Emergency)
│   ├── router/                   # React Router configuration
│   ├── auth/                     # Authentication pages (login, signup, etc.)
│   ├── marketing/                # Public marketing pages
│   ├── player/                   # TV/display player code
│   ├── config/                   # Configuration files
│   ├── utils/                    # Utility functions
│   ├── security/                 # Security utilities
│   ├── i18n/                     # Internationalization
│   ├── design-system/            # Design system components
│   ├── templates/                # Template definitions
│   ├── legacy/                   # Legacy code being phased out
│   ├── App.jsx                   # Main app container
│   ├── main.jsx                  # Application entry point
│   ├── supabase.js               # Supabase client configuration
│   └── index.css                 # Global styles
├── supabase/                     # Supabase database configuration
│   └── migrations/               # Database migration files (135 migrations)
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests (Playwright)
│   └── load/                     # Load tests
├── public/                       # Static assets
├── .planning/                    # Planning and documentation
├── package.json                  # Dependencies and scripts
├── vite.config.js                # Vite build configuration
└── playwright.config.js          # E2E test configuration
```

## Directory Purposes

**src/pages/**
- Purpose: Top-level page components rendered by router
- Contains: 70+ page components (DashboardPage, MediaLibraryPage, PlaylistsPage, etc.)
- Key files: `src/pages/DashboardPage.jsx`, `src/pages/MediaLibraryPage.jsx`, `src/pages/ScreensPage.jsx`
- Naming: PascalCase with "Page" suffix (e.g., `TemplatesPage.jsx`)
- Sub-directories: `Admin/` (admin-specific pages), `LayoutEditor/` (layout editor pages), `components/` (page-specific components), `hooks/` (page-specific hooks), `dashboard/` (dashboard widgets)

**src/components/**
- Purpose: Reusable UI components used across multiple pages
- Contains: 60+ components organized by feature area
- Key files: `src/components/ErrorBoundary.jsx`, `src/components/Toast.jsx`, `src/components/FeatureGate.jsx`
- Sub-directories:
  - `layout/` - Header, MobileNav
  - `scenes/` - Scene-related components
  - `schedules/` - Schedule management components
  - `screens/` - Screen management components
  - `media/` - Media library components
  - `svg-editor/` - SVG editor components
  - `layout-editor/` - Layout editor components
  - `templates/` - Template components
  - `onboarding/` - Onboarding flows
  - `dashboard/` - Dashboard widgets
  - `campaigns/` - Campaign components
  - `security/` - Security components (MFA, session management)

**src/services/**
- Purpose: Business logic and data access layer
- Contains: 100+ service modules implementing CRUD operations and business rules
- Key files:
  - `src/services/mediaService.js` - Media library operations
  - `src/services/playlistService.js` - Playlist management
  - `src/services/scheduleService.js` - Schedule management
  - `src/services/campaignService.js` - Campaign operations
  - `src/services/sceneService.js` - Scene management
  - `src/services/authService.js` - Authentication
  - `src/services/brandingService.js` - Tenant branding
  - `src/services/loggingService.js` - Centralized logging
- Naming: camelCase with "Service" suffix (e.g., `mediaService.js`)

**src/hooks/**
- Purpose: Custom React hooks for state management and data fetching
- Contains: 17 custom hooks
- Key files:
  - `src/hooks/useMedia.js` - Media library state
  - `src/hooks/useLayout.js` - Layout management
  - `src/hooks/useFeatureFlag.jsx` - Feature flag resolution
  - `src/hooks/useAuth.js` - Auth state (via context)
  - `src/hooks/useLogger.js` - Component logging
  - `src/hooks/useMediaQuery.js` - Responsive breakpoints
- Naming: camelCase with "use" prefix (e.g., `useMedia.js`)

**src/contexts/**
- Purpose: React Context providers for global state
- Contains: AuthContext, BrandingContext, EmergencyContext
- Key files:
  - `src/contexts/AuthContext.jsx` - User authentication and profile
  - `src/contexts/BrandingContext.jsx` - Tenant branding and theme
  - `src/contexts/EmergencyContext.jsx` - Emergency broadcast state

**src/router/**
- Purpose: React Router configuration
- Contains: Route definitions and protected route wrappers
- Key files: `src/router/AppRouter.jsx` - Main router with lazy-loaded pages

**src/auth/**
- Purpose: Authentication-related pages
- Contains: LoginPage, SignupPage, ResetPasswordPage, UpdatePasswordPage, AuthCallbackPage, AcceptInvitePage, AuthLayout

**src/player/**
- Purpose: TV/display player functionality (separate from main app)
- Contains: Player components, offline service, pairing logic
- Sub-directories:
  - `components/` - PairPage, ViewPage, ZonePlayer, SceneRenderer, AppRenderer
  - `pages/` - ViewPage
  - `hooks/` - Player-specific hooks

**src/marketing/**
- Purpose: Public marketing website pages
- Contains: HomePage, PricingPage, FeaturesPage, MarketingLayout

**src/config/**
- Purpose: Configuration files and constants
- Key files:
  - `src/config/env.js` - Environment variable access
  - `src/config/plans.js` - Plan definitions and feature flags
  - `src/config/featureFlags.js` - Feature flag configuration
  - `src/config/appCatalog.js` - App catalog definitions

**src/utils/**
- Purpose: Utility functions used across the application
- Key files:
  - `src/utils/errorTracking.jsx` - Sentry integration
  - `src/utils/formatters.js` - Date/time formatting
  - `src/utils/seo.js` - SEO utilities
  - `src/utils/observability.js` - Performance monitoring

**src/security/**
- Purpose: Security utilities and sanitization
- Key files:
  - `src/security/sanitize.js` - HTML/input sanitization
  - `src/security/SafeHTML.jsx` - Safe HTML rendering component

**src/design-system/**
- Purpose: Design system components (alternative to components/)
- Contains: Modal, CreateLayoutModal

**supabase/migrations/**
- Purpose: Database schema and RLS policy definitions
- Contains: 135 SQL migration files
- Generated: Yes (by Supabase CLI)
- Committed: Yes
- Naming: Timestamped (e.g., `20250101120000_add_feature.sql`)

**tests/**
- Purpose: All test files
- Sub-directories:
  - `unit/` - Vitest unit tests (mirrors src/ structure)
  - `integration/` - Integration tests
  - `e2e/` - Playwright end-to-end tests
  - `load/` - Load tests (k6 and Node.js)
  - `mocks/` - Test mocks and fixtures
  - `utils/` - Test utilities

**.planning/**
- Purpose: Project planning and documentation
- Sub-directories:
  - `codebase/` - This directory (codebase analysis)
  - `milestones/` - Milestone roadmaps
  - `quick/` - Quick task plans
  - `debug/` - Debug investigation notes

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React app entry point, renders root with providers
- `src/router/AppRouter.jsx`: Route configuration and navigation
- `src/App.jsx`: Main app container with sidebar and page content
- `src/Player.jsx`: Player app entry point for `/player/*` routes
- `src/TV.jsx`: TV app entry point for `/tv/*` routes
- `index.html`: HTML entry point loaded by Vite

**Configuration:**
- `vite.config.js`: Vite build configuration, plugins, aliases
- `package.json`: Dependencies, scripts, project metadata
- `.env`: Environment variables (not committed)
- `.env.example`: Environment variable template
- `src/config/env.js`: Environment variable access layer
- `src/config/plans.js`: Plan and feature definitions

**Core Logic:**
- `src/contexts/AuthContext.jsx`: Authentication state and logic
- `src/services/mediaService.js`: Media library operations
- `src/services/playlistService.js`: Playlist management
- `src/services/scheduleService.js`: Schedule management
- `src/services/sceneService.js`: Scene management
- `src/supabase.js`: Supabase client initialization

**Testing:**
- `playwright.config.js`: Playwright configuration
- `vitest.config.js`: Vitest configuration
- `tests/e2e/*.spec.js`: E2E test files
- `tests/unit/**/*.test.js`: Unit test files

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `MediaLibraryPage.jsx`)
- Services: camelCase with "Service" suffix (e.g., `mediaService.js`)
- Hooks: camelCase with "use" prefix (e.g., `useMedia.js`)
- Utilities: camelCase (e.g., `formatters.js`)
- Config: camelCase (e.g., `env.js`)
- Tests: Same as source file with `.test.js` or `.spec.js` suffix

**Directories:**
- kebab-case for feature directories (e.g., `svg-editor/`)
- PascalCase for component directories with single component (e.g., `Admin/`)
- lowercase for utility directories (e.g., `utils/`, `config/`)

**Variables/Functions:**
- camelCase for variables and functions (e.g., `fetchMediaAssets`)
- PascalCase for React components (e.g., `MediaLibraryPage`)
- UPPER_SNAKE_CASE for constants (e.g., `MEDIA_TYPES`)

**React Components:**
- Function components with arrow functions or function declarations
- Named exports for pages (e.g., `export default DashboardPage`)
- Named exports for reusable components (e.g., `export { Toast }`)

## Where to Add New Code

**New Feature Page:**
- Primary code: `src/pages/FeatureNamePage.jsx`
- Route: Add to `src/router/AppRouter.jsx` (if standalone) or `src/App.jsx` (if in-app)
- Tests: `tests/e2e/feature-name.spec.js` for E2E, `tests/unit/pages/FeatureNamePage.test.js` for unit

**New Reusable Component:**
- Implementation: `src/components/ComponentName.jsx` or `src/components/feature-area/ComponentName.jsx`
- Tests: `tests/unit/components/ComponentName.test.js`

**New Service:**
- Implementation: `src/services/featureService.js`
- Export functions: Named exports (e.g., `export async function fetchFeature()`)
- Tests: `tests/unit/services/featureService.test.js`

**New Custom Hook:**
- Implementation: `src/hooks/useFeatureName.js`
- Pattern: Return object with `{ data, loading, error, refetch }`
- Tests: `tests/unit/hooks/useFeatureName.test.js`

**Utilities:**
- Shared helpers: `src/utils/utilityName.js`
- Security: `src/security/securityUtil.js`
- Formatting: `src/utils/formatters.js`

**Database Changes:**
- Create migration: `supabase migration new migration_name`
- Edit: `supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql`
- Apply: `supabase db push` (local) or deploy to production

**Player/TV Features:**
- Components: `src/player/components/ComponentName.jsx`
- Logic: `src/player/services/` or use shared `src/services/`
- Pages: `src/player/pages/PageName.jsx`

## Special Directories

**_api-disabled/**
- Purpose: Disabled API routes (legacy/unused)
- Generated: No
- Committed: Yes
- Note: These were moved or deprecated in favor of Supabase functions

**yodeck-capture/**
- Purpose: Screen capture utility (separate Node.js project)
- Generated: No
- Committed: Yes
- Note: Used for capturing Yodeck layout screenshots

**android-tv-player/**
- Purpose: Android TV player application
- Generated: Yes (Gradle build outputs)
- Committed: Partially (source yes, build artifacts no)
- Note: Native Android app for TV devices

**dist/**
- Purpose: Vite build output
- Generated: Yes
- Committed: No
- Note: Production build artifacts

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**.planning/**
- Purpose: Project planning, milestones, and documentation
- Generated: No (manually created)
- Committed: Yes
- Sub-directories: `codebase/`, `milestones/`, `quick/`, `debug/`

**playwright-report/**
- Purpose: Playwright test reports
- Generated: Yes
- Committed: No (Git ignored)

**test-results/**
- Purpose: Playwright test artifacts (screenshots, videos, traces)
- Generated: Yes
- Committed: No (Git ignored)

---

*Structure analysis: 2026-02-05*
