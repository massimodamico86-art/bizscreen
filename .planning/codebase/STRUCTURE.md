# Codebase Structure

**Analysis Date:** 2026-01-29

## Directory Layout

```
bizscreen/
├── src/                    # Main application source
│   ├── pages/              # Top-level page components (70+ files)
│   ├── components/         # Reusable UI components (60+ files, organized by domain)
│   ├── services/           # Business logic and data access (100+ files)
│   ├── hooks/              # Custom React hooks (17 files)
│   ├── contexts/           # React Context providers (AuthContext, BrandingContext, EmergencyContext)
│   ├── router/             # Route definitions and guards
│   ├── config/             # Configuration files (plans, features, app catalog)
│   ├── utils/              # Helper functions (formatters, error tracking, PII)
│   ├── auth/               # Authentication pages (login, signup, password reset)
│   ├── marketing/          # Public marketing site pages
│   ├── player/             # TV player runtime and components
│   ├── layouts/            # Layout template components (Layout1-4)
│   ├── i18n/               # Internationalization (I18nContext, locales)
│   ├── design-system/      # Reusable design system components
│   ├── templates/          # Template-related code
│   ├── security/           # Security utilities
│   ├── legacy/             # Deprecated code (for migration)
│   ├── types/              # TypeScript type definitions
│   ├── main.jsx            # Application entry point
│   ├── App.jsx             # Main app container with navigation
│   ├── TV.jsx              # TV player entry (OTP-based)
│   ├── Player.jsx          # Alternative player entry
│   ├── supabase.js         # Supabase client configuration
│   └── index.css           # Global styles
├── tests/                  # Test suite
│   ├── unit/               # Unit tests (components, services, hooks, utils)
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end Playwright tests
│   ├── mocks/              # MSW mocks for testing
│   ├── utils/              # Test utilities
│   └── load/               # Load testing scripts
├── public/                 # Static assets
│   ├── polotno/            # Polotno editor library
│   ├── images/             # Image assets
│   └── fabric-poc/         # Fabric.js proof of concept
├── supabase/               # Database migrations and config
│   ├── migrations/         # SQL migration files
│   └── tests/              # Database tests
├── android-tv-player/      # Android TV native player app
├── yodeck-capture/         # Captured Yodeck frontend (reference)
├── docs/                   # Documentation
├── .planning/              # GSD planning artifacts
│   ├── phases/             # Implementation phase plans
│   ├── debug/              # Debugging session records
│   ├── milestones/         # Milestone roadmaps
│   └── codebase/           # Codebase analysis (this directory)
├── .husky/                 # Git hooks (pre-commit)
├── .claude/                # Claude agent configuration
├── vite.config.js          # Vite build configuration
├── playwright.config.js    # E2E test configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## Directory Purposes

**src/pages/**
- Purpose: Top-level route components rendered by AppRouter
- Contains: 70+ page components organized by feature area
- Key files: `DashboardPage.jsx`, `PlaylistEditorPage.jsx`, `ScreensPage.jsx`, `LayoutEditorPage.jsx`
- Subdirectories: `Admin/` (admin pages), `LayoutEditor/` (layout editing), `components/` (page-specific components), `dashboard/` (dashboard sub-components), `hooks/` (page-specific hooks)

**src/components/**
- Purpose: Reusable UI components shared across pages
- Contains: Domain-organized components (analytics, campaigns, layout-editor, media, onboarding, scenes, schedules, screens, etc.)
- Key files: `ErrorBoundary.jsx`, `FeatureGate.jsx`, `Toast.jsx`, `Modal.jsx`, `Skeleton.jsx`
- Subdirectories: Each domain has its own folder (e.g., `components/campaigns/`, `components/media/`, `components/analytics/`)

**src/services/**
- Purpose: Business logic, API calls, and data operations
- Contains: 100+ service modules, one per domain or integration
- Key files: `mediaService.js`, `playlistService.js`, `sceneService.js`, `playerService.js`, `campaignService.js`, `authService.js`, `supabaseService.js`, `loggingService.js`, `rateLimitService.js`, `approvalService.js`
- Pattern: Pure functions that return promises, operate on Supabase client

**src/hooks/**
- Purpose: Custom React hooks for shared logic
- Contains: 17 custom hooks for common patterns
- Key files: `useFeatureFlag.jsx`, `useLogger.js`, `useMedia.js`, `useLayout.js`, `useS3Upload.jsx`, `useMediaQuery.js`, `useDataCache.js`

**src/contexts/**
- Purpose: React Context providers for global state
- Contains: AuthContext (user/profile), BrandingContext (tenant branding), EmergencyContext (emergency broadcasts), FeatureFlagProvider (plan features)
- Key files: `AuthContext.jsx`, `BrandingContext.jsx`, `EmergencyContext.jsx`

**src/router/**
- Purpose: Application routing logic
- Contains: Main router with lazy loading and auth guards
- Key files: `AppRouter.jsx` (route definitions with RequireAuth and PublicRoute wrappers)

**src/config/**
- Purpose: Static configuration and constants
- Contains: Plan definitions, feature flags, app catalog, environment config
- Key files: `plans.js` (SINGLE SOURCE OF TRUTH for plan tiers and limits), `featureFlags.js`, `appCatalog.js`, `env.js`, `yodeckTheme.js`

**src/auth/**
- Purpose: Authentication pages and flows
- Contains: Login, signup, password reset, OAuth callback pages
- Key files: `LoginPage.jsx`, `SignupPage.jsx`, `ResetPasswordPage.jsx`, `UpdatePasswordPage.jsx`, `AuthCallbackPage.jsx`, `AcceptInvitePage.jsx`

**src/marketing/**
- Purpose: Public-facing marketing website
- Contains: Landing pages for unauthenticated visitors
- Key files: `MarketingLayout.jsx`, `HomePage.jsx`, `PricingPage.jsx`, `FeaturesPage.jsx`

**src/player/**
- Purpose: TV/screen player runtime
- Contains: Content rendering, offline support, pairing UI
- Subdirectories: `components/` (ZonePlayer, SceneRenderer, AppRenderer, PairingScreen), `pages/` (ViewPage), `hooks/`, `services/` (cacheService, offlineService)
- Key files: `player/pages/ViewPage.jsx`, `player/components/ZonePlayer.jsx`

**src/layouts/**
- Purpose: Screen layout templates
- Contains: Predefined layout components for screen composition
- Key files: `Layout1.jsx` (full screen), `Layout2.jsx`, `Layout3.jsx`, `Layout4.jsx`, `index.js` (exports)

**src/design-system/**
- Purpose: Reusable design system components
- Contains: Base UI primitives following consistent design language
- Key files: `components/Card.jsx`, `components/FormElements.jsx`

**tests/**
- Purpose: Test suite for unit, integration, and E2E testing
- Contains: Vitest unit tests, Playwright E2E tests, MSW mocks
- Subdirectories: `unit/` (mirrors src structure), `integration/`, `e2e/`, `mocks/`, `utils/`, `load/` (k6 load tests)

**supabase/**
- Purpose: Database schema and migrations
- Contains: SQL migration files for schema changes
- Key files: `migrations/*.sql` (numbered migration files)

**android-tv-player/**
- Purpose: Native Android TV player application
- Contains: Java/Kotlin source for Android TV deployment
- Key files: `app/src/main/java/com/bizscreen/player/`

**public/**
- Purpose: Static assets served directly
- Contains: Images, third-party libraries (Polotno editor)
- Subdirectories: `polotno/` (editor bundle), `images/` (logos, previews), `fabric-poc/`

**.planning/**
- Purpose: GSD planning and implementation artifacts
- Contains: Phase plans, debug sessions, milestone roadmaps, codebase analysis
- Subdirectories: `phases/` (implementation plans), `debug/` (resolved issues), `milestones/` (roadmaps), `codebase/` (this document)

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React application entry point with providers
- `src/App.jsx`: Main authenticated app with navigation and routing
- `src/router/AppRouter.jsx`: Top-level router with lazy loading
- `src/TV.jsx`: TV player entry for OTP-based screens
- `src/Player.jsx`: Alternative player entry
- `index.html`: HTML template (in root)

**Configuration:**
- `vite.config.js`: Vite build config with custom API plugin for dev server
- `package.json`: Dependencies, scripts, lint-staged config
- `.env.example`: Environment variable template
- `src/supabase.js`: Supabase client configuration
- `src/config/plans.js`: Plan tiers and feature definitions
- `src/config/featureFlags.js`: Feature flag definitions

**Core Logic:**
- `src/services/`: All business logic (100+ files)
- `src/contexts/AuthContext.jsx`: Authentication state management
- `src/contexts/BrandingContext.jsx`: Tenant branding state
- `src/hooks/useFeatureFlag.jsx`: Feature access control

**Testing:**
- `playwright.config.js`: E2E test configuration
- `vitest.config.js`: Unit test configuration (if present)
- `tests/e2e/*.spec.js`: Playwright test files
- `tests/unit/**/*.test.js`: Vitest unit tests

## Naming Conventions

**Files:**
- Pages: `PascalCase` + `Page.jsx` suffix (e.g., `DashboardPage.jsx`, `PlaylistEditorPage.jsx`)
- Components: `PascalCase.jsx` (e.g., `ErrorBoundary.jsx`, `Toast.jsx`)
- Services: `camelCase` + `Service.js` suffix (e.g., `mediaService.js`, `playlistService.js`)
- Hooks: `use` prefix + `camelCase.js` (e.g., `useLogger.js`, `useMedia.js`)
- Contexts: `PascalCase` + `Context.jsx` suffix (e.g., `AuthContext.jsx`)
- Utils: `camelCase.js` (e.g., `formatters.js`, `errorMessages.js`)
- Config: `camelCase.js` (e.g., `plans.js`, `featureFlags.js`)

**Directories:**
- Lowercase with hyphens for multi-word names (e.g., `layout-editor`, `svg-editor`)
- PascalCase for React component directories containing single component (e.g., `Admin`)
- Lowercase single words preferred (e.g., `pages`, `services`, `hooks`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/pages/FeatureNamePage.jsx` for route, `src/services/featureNameService.js` for logic
- Tests: `tests/unit/pages/FeatureNamePage.test.jsx`, `tests/unit/services/featureNameService.test.js`
- Components: `src/components/feature-name/` for feature-specific UI components
- Route: Add to `src/router/AppRouter.jsx` with lazy loading
- Navigation: Add link to `src/App.jsx` sidebar

**New Component/Module:**
- Implementation: `src/components/domain-name/ComponentName.jsx` (group by domain)
- Shared components: `src/components/ComponentName.jsx` (root level if used across domains)
- Design system: `src/design-system/components/ComponentName.jsx` (for base primitives)

**Utilities:**
- Shared helpers: `src/utils/helperName.js`
- Service utilities: Keep in `src/services/` if domain-specific
- Test utilities: `tests/utils/`

**New Service:**
- Implementation: `src/services/domainNameService.js`
- Pattern: Export pure functions that operate on Supabase client
- Imports: Use `supabase` from `'../supabase'`, scoped logger from `loggingService`

**New Hook:**
- Implementation: `src/hooks/useHookName.js` or `useHookName.jsx` (if JSX inside)
- Pattern: Follow React hooks rules, return object with values and functions

**New Page:**
- Implementation: `src/pages/PageNamePage.jsx`
- Route: Add lazy import and route to `src/router/AppRouter.jsx` or `src/App.jsx`
- Navigation: Add to sidebar in `src/App.jsx` if permanent nav item

**New Context:**
- Implementation: `src/contexts/ContextNameContext.jsx`
- Provider: Wrap in `src/main.jsx` if global, or in specific page if scoped
- Hook: Export `useContextName()` hook for consuming context

**New Config:**
- Implementation: `src/config/configName.js`
- Pattern: Export constants, no imports (leaf layer)
- Use: Import in services, components, pages as needed

## Special Directories

**src/legacy/**
- Purpose: Deprecated code being phased out
- Generated: No
- Committed: Yes
- Note: Avoid adding new code here, migrate legacy code out

**src/__fixtures__/**
- Purpose: Test fixtures and mock data
- Generated: No
- Committed: Yes

**yodeck-capture/**
- Purpose: Captured reference implementation from Yodeck
- Generated: No (manual capture)
- Committed: Yes
- Note: Read-only reference, do not modify

**dist/**
- Purpose: Vite build output
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignored)

**node_modules/**
- Purpose: NPM dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignored)

**test-results/**
- Purpose: Playwright test artifacts (screenshots, videos, traces)
- Generated: Yes (by `npm run test:e2e`)
- Committed: No (.gitignored)

**playwright-report/**
- Purpose: HTML test report
- Generated: Yes (by Playwright)
- Committed: No (.gitignored)

**perf-reports/**
- Purpose: Bundle analysis reports
- Generated: Yes (by rollup-plugin-visualizer)
- Committed: No (.gitignored)

**.planning/**
- Purpose: GSD planning artifacts
- Generated: Yes (by Claude GSD commands)
- Committed: Yes
- Note: Tracks implementation phases, debugging, milestones

---

*Structure analysis: 2026-01-29*
