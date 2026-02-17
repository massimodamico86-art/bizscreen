# Codebase Structure

**Analysis Date:** 2026-02-17

## Directory Layout

```
bizscreen/                         # Project root
├── src/                           # All application source code
│   ├── main.jsx                   # React entry point, observability init
│   ├── App.jsx                    # Admin app shell (nav, currentPage state)
│   ├── Player.jsx                 # TV player entry (routes /player/*)
│   ├── TV.jsx                     # Legacy TV player (routes /tv/*)
│   ├── ScaledStage.jsx            # Shared scaled-canvas utility
│   ├── supabase.js                # Supabase client singleton
│   ├── getConfig.js               # Legacy config helper for TV.jsx
│   ├── index.css                  # Global CSS / Tailwind base
│   │
│   ├── router/                    # URL routing
│   │   └── AppRouter.jsx          # All routes: marketing, auth, app, player
│   │
│   ├── contexts/                  # React global contexts
│   │   ├── AuthContext.jsx        # User session, profile, auth state machine
│   │   ├── BrandingContext.jsx    # White-label branding, impersonation
│   │   └── EmergencyContext.jsx   # Emergency broadcast banner state
│   │
│   ├── config/                    # App-wide constants and configuration
│   │   ├── plans.js               # Plan tiers, Feature enum, resource limits
│   │   ├── featureFlags.js        # Flag resolution logic, GLOBAL_FLAGS
│   │   ├── appCatalog.js          # Digital signage app definitions
│   │   ├── env.js                 # Environment variable wrappers
│   │   └── yodeckTheme.js         # Brand theme tokens
│   │
│   ├── services/                  # Data access and business logic (90+ files)
│   │   ├── index.js               # Barrel re-exports for commonly used services
│   │   ├── loggingService.js      # Structured logging, createScopedLogger factory
│   │   ├── featureFlagService.js  # Feature flag DB fetch, cache, evaluation
│   │   ├── mediaService.js        # Media asset CRUD
│   │   ├── playlistService.js     # Playlist CRUD
│   │   ├── scheduleService.js     # Schedule CRUD and content priority logic
│   │   ├── screenService.js       # Screen CRUD
│   │   ├── playerService.js       # Player content fetch, heartbeat, offline cache
│   │   ├── realtimeService.js     # Supabase realtime channel management
│   │   ├── playbackTrackingService.js # Scene/slide analytics tracking
│   │   ├── approvalService.js     # Content review workflow
│   │   ├── permissionsService.js  # Role-based permission checks
│   │   ├── brandingService.js     # Tenant branding fetch
│   │   ├── tenantService.js       # Tenant/impersonation management
│   │   ├── analyticsService.js    # Analytics data queries
│   │   ├── campaignService.js     # Campaign CRUD
│   │   ├── sceneService.js        # Scene and slide CRUD
│   │   ├── layoutService.js       # Layout zone configuration CRUD
│   │   ├── templateService.js     # Template marketplace CRUD
│   │   ├── authService.js         # Auth actions (invite, MFA)
│   │   ├── billingService.js      # Trial/plan management
│   │   ├── dataSourceService.js   # External data source connections
│   │   ├── dataBindingResolver.js # Scene block data binding resolution
│   │   ├── dataFeedScheduler.js   # Scheduled data feed polling
│   │   ├── rssFeedService.js      # RSS feed fetch + parse
│   │   ├── weatherService.js      # OpenWeather API integration
│   │   ├── unsplashProxyService.js # Unsplash image search proxy
│   │   ├── cloudinaryService.js   # Cloudinary upload helper
│   │   ├── s3UploadService.js     # AWS S3 presigned URL upload
│   │   ├── rateLimitService.js    # Client-side rate limiting
│   │   ├── cacheService.js        # Generic cache utilities
│   │   ├── notificationDispatcherService.js # Notification delivery
│   │   ├── emergencyService.js    # Emergency broadcast management
│   │   ├── gdprService.js         # GDPR consent/compliance
│   │   ├── gdprDeletionService.js # GDPR data deletion
│   │   ├── securityService.js     # Security event logging
│   │   ├── svgTemplateService.js  # SVG template CRUD
│   │   ├── sceneDesignService.js  # Scene block animation/style helpers
│   │   ├── mediaPreloader.js      # Preload next slides' media assets
│   │   ├── errorTrackingService.js # Error event tracking helpers
│   │   ├── webVitalsService.js    # Core Web Vitals monitoring
│   │   ├── healthService.js       # Health check monitoring
│   │   └── social/                # Social media platform services
│   │       ├── instagramService.js
│   │       ├── facebookService.js
│   │       ├── googleReviewsService.js
│   │       └── tiktokService.js
│   │
│   ├── hooks/                     # Shared custom hooks
│   │   ├── useFeatureFlag.jsx     # Feature flag hooks + FeatureFlagProvider
│   │   ├── useLogger.js           # Scoped logger hook wrapper
│   │   ├── useMedia.js            # Media library data hook
│   │   ├── useLayout.js           # Layout data hook
│   │   ├── useLayoutTemplates.js  # Layout template data hook
│   │   ├── useMediaQuery.js       # Responsive breakpoints hook
│   │   ├── useS3Upload.jsx        # S3 presigned upload hook
│   │   ├── useCloudinaryUpload.js # Cloudinary upload hook
│   │   ├── useUnifiedOnboarding.js # Onboarding state machine hook
│   │   ├── useAdmin.js            # Admin data hook
│   │   ├── useAuditLogs.js        # Audit log data hook
│   │   ├── useDataCache.js        # Generic data caching hook
│   │   ├── useMediaFolders.js     # Media folder management hook
│   │   ├── useMediaPlayback.js    # Media preview playback hook
│   │   ├── usePlayerMetrics.js    # Player analytics hook
│   │   └── usePrefetch.js         # Route prefetching hook
│   │
│   ├── pages/                     # Full-page view components (70+)
│   │   ├── DashboardPage.jsx
│   │   ├── MediaLibraryPage.jsx
│   │   ├── PlaylistsPage.jsx
│   │   ├── PlaylistEditorPage.jsx
│   │   ├── ScenesPage.jsx
│   │   ├── SceneEditorPage.jsx
│   │   ├── SceneDetailPage.jsx
│   │   ├── SchedulesPage.jsx
│   │   ├── ScheduleEditorPage.jsx
│   │   ├── ScreensPage.jsx
│   │   ├── ScreenGroupsPage.jsx
│   │   ├── ScreenGroupDetailPage.jsx
│   │   ├── LayoutsPage.jsx
│   │   ├── LayoutEditorPage.jsx
│   │   ├── CampaignsPage.jsx
│   │   ├── CampaignEditorPage.jsx
│   │   ├── TemplatesPage.jsx
│   │   ├── SvgTemplateGalleryPage.jsx
│   │   ├── SvgEditorPage.jsx
│   │   ├── TemplateMarketplacePage.jsx
│   │   ├── DesignEditorPage.jsx    # Polotno-based design editor
│   │   ├── AppsPage.jsx
│   │   ├── DataSourcesPage.jsx
│   │   ├── ContentAssistantPage.jsx # AI assistant
│   │   ├── AnalyticsPage.jsx
│   │   ├── AnalyticsDashboardPage.jsx
│   │   ├── ContentPerformancePage.jsx
│   │   ├── ContentDetailAnalyticsPage.jsx
│   │   ├── ReviewInboxPage.jsx
│   │   ├── AlertsCenterPage.jsx
│   │   ├── TeamPage.jsx
│   │   ├── ClientsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── AccountPlanPage.jsx
│   │   ├── BrandingSettingsPage.jsx
│   │   ├── WhiteLabelSettingsPage.jsx
│   │   ├── EnterpriseSecurityPage.jsx
│   │   ├── ResellerDashboardPage.jsx
│   │   ├── ResellerBillingPage.jsx
│   │   ├── SuperAdminDashboardPage.jsx
│   │   ├── AdminDashboardPage.jsx
│   │   ├── PairDevicePage.jsx
│   │   ├── PublicPreviewPage.jsx
│   │   ├── Admin/                 # Super-admin pages
│   │   │   ├── AdminTenantsListPage.jsx
│   │   │   ├── AdminTenantDetailPage.jsx
│   │   │   ├── AdminAuditLogsPage.jsx
│   │   │   ├── AdminSystemEventsPage.jsx
│   │   │   ├── AdminTemplatesPage.jsx
│   │   │   └── AdminEditTemplatePage.jsx
│   │   ├── LayoutEditor/          # Multi-zone layout editor pages
│   │   │   ├── YodeckLayoutEditorPage.jsx
│   │   │   └── LayoutPreviewPage.jsx
│   │   ├── LayoutTemplates/
│   │   │   └── LayoutTemplatesPage.jsx
│   │   ├── components/            # Sub-components co-located with pages
│   │   │   ├── CampaignEditorComponents.jsx
│   │   │   ├── PlaylistEditorComponents.jsx
│   │   │   ├── ScreensComponents.jsx
│   │   │   └── FeatureFlagsComponents.jsx
│   │   ├── dashboard/             # Dashboard section sub-components
│   │   │   ├── DashboardSections.jsx
│   │   │   └── OnboardingCards.jsx
│   │   └── hooks/                 # Page-specific hooks
│   │       └── (page-scoped hooks)
│   │
│   ├── components/                # Feature-scoped shared components
│   │   ├── ErrorBoundary.jsx      # Top-level error boundary
│   │   ├── FeatureGate.jsx        # Feature flag gate component
│   │   ├── Toast.jsx              # Toast notification
│   │   ├── FeedbackWidget.jsx     # In-app feedback
│   │   ├── AnnouncementBanner.jsx # System announcement banner
│   │   ├── PolotnoEditor.jsx      # Polotno design editor wrapper
│   │   ├── Admin/                 # Admin-specific components
│   │   ├── analytics/             # Analytics chart/card components
│   │   ├── apps/                  # App config modals
│   │   ├── brand/                 # Brand theme preview components
│   │   ├── campaigns/             # Campaign UI components
│   │   ├── compliance/            # GDPR compliance components
│   │   ├── dashboard/             # Dashboard widgets
│   │   ├── data-sources/          # Data source picker/preview
│   │   ├── feature-flags/         # Feature flag debug UI
│   │   ├── layout/                # Shell layout (Header, MobileNav)
│   │   ├── layout-editor/         # Zone layout editor components
│   │   ├── listings/              # Listing card/management components
│   │   ├── media/                 # Media library components
│   │   ├── modals/                # Shared modal components
│   │   ├── notifications/         # Notification bell/center components
│   │   ├── onboarding/            # Onboarding flow components
│   │   ├── player/                # Player preview component
│   │   ├── scene-editor/          # Scene/slide editor panels and canvas
│   │   ├── scenes/                # Scene list components
│   │   ├── schedules/             # Schedule builder components
│   │   ├── screens/               # Screen card/status components
│   │   ├── security/              # Security audit components
│   │   ├── svg-editor/            # SVG editor toolbar/panels
│   │   ├── tables/                # Shared data table components
│   │   ├── templates/             # Template gallery/preview components
│   │   ├── translations/          # Translation dashboard components
│   │   ├── WeatherWall/           # Weather wall app component
│   │   └── welcome/               # Welcome/onboarding modal
│   │
│   ├── design-system/             # Primitive UI components
│   │   └── components/
│   │       ├── Button.jsx
│   │       ├── Alert.jsx
│   │       ├── Badge.jsx
│   │       ├── Card.jsx
│   │       ├── Modal.jsx
│   │       ├── PageLayout.jsx
│   │       ├── EmptyState.jsx
│   │       ├── FilterChips.jsx
│   │       ├── SearchBar.jsx
│   │       ├── Tabs.jsx
│   │       ├── FormElements.jsx
│   │       ├── Illustrations.jsx
│   │       ├── PageTransition.jsx
│   │       └── TemplateCard.jsx
│   │
│   ├── player/                    # TV player subsystem (separate runtime)
│   │   ├── pages/
│   │   │   └── ViewPage.jsx       # Main playback orchestrator
│   │   ├── components/
│   │   │   ├── AppRenderer.jsx    # Widget/app type router
│   │   │   ├── LayoutRenderer.jsx # Multi-zone layout grid
│   │   │   ├── SceneRenderer.jsx  # Slide/block/transition renderer
│   │   │   ├── ZonePlayer.jsx     # Zone-level playlist player
│   │   │   ├── PairPage.jsx       # OTP device pairing page
│   │   │   ├── PairingScreen.jsx  # Pairing UI screen
│   │   │   ├── PinEntry.jsx       # PIN entry component
│   │   │   └── widgets/           # Widget implementations
│   │   │       ├── ClockWidget.jsx
│   │   │       ├── DateWidget.jsx
│   │   │       ├── ClockDateWidget.jsx
│   │   │       ├── WeatherWidget.jsx
│   │   │       ├── QRCodeWidget.jsx
│   │   │       ├── RssTickerWidget.jsx
│   │   │       ├── RssCardWidget.jsx
│   │   │       ├── SocialFeedWidget.jsx
│   │   │       ├── CountdownWidget.jsx
│   │   │       ├── DataTableWidget.jsx
│   │   │       └── index.js       # Barrel export for all widgets
│   │   ├── hooks/
│   │   │   ├── usePlayerContent.js    # Content loading, offline, polling
│   │   │   ├── usePlayerHeartbeat.js  # Heartbeat RPC loop
│   │   │   ├── usePlayerCommands.js   # Device command handling
│   │   │   ├── usePlayerPlayback.js   # Playlist advance/timing logic
│   │   │   ├── useKioskMode.js        # Kiosk PIN lock logic
│   │   │   ├── useStuckDetection.js   # Stuck slide watchdog
│   │   │   ├── useTapSequence.js      # Secret tap sequence detector
│   │   │   ├── useWidgetData.js       # Widget data fetch hook
│   │   │   └── useDataRefreshOrchestrator.js # Batched widget data orchestrator
│   │   ├── contexts/
│   │   │   └── DataRefreshContext.jsx # Context for orchestrator
│   │   ├── offlineService.js      # Offline mode initialization
│   │   └── cacheService.js        # Player-side IndexedDB cache
│   │
│   ├── widgets/                   # Widget registry (editor + player shared)
│   │   └── registry.js            # WIDGET_REGISTRY, getWidgetComponent()
│   │
│   ├── auth/                      # Auth flow pages
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ResetPasswordPage.jsx
│   │   ├── UpdatePasswordPage.jsx
│   │   ├── AuthCallbackPage.jsx
│   │   └── AcceptInvitePage.jsx
│   │
│   ├── marketing/                 # Public marketing pages
│   │   ├── MarketingLayout.jsx    # Marketing page shell
│   │   ├── HomePage.jsx
│   │   ├── PricingPage.jsx
│   │   └── FeaturesPage.jsx
│   │
│   ├── i18n/                      # Internationalization
│   │   ├── I18nContext.jsx        # I18n context and provider
│   │   ├── i18nConfig.js          # Locale config, date/number formats
│   │   ├── index.js               # useTranslation hook export
│   │   └── locales/
│   │       └── en.json            # English message catalog
│   │
│   ├── security/                  # Security utilities
│   │   ├── sanitize.js            # DOMPurify wrapper, SANITIZE_CONFIG
│   │   ├── SafeHTML.jsx           # Safe HTML render component
│   │   └── errorMessages.js       # User-facing error message strings
│   │
│   ├── utils/                     # Pure utility functions
│   │   ├── observability.js       # initObservability() - init all monitoring
│   │   ├── errorTracking.jsx      # Sentry integration, SentryRoutes export
│   │   ├── formatters.js          # Date/number/currency formatting
│   │   ├── pii.js                 # PII redaction for logging
│   │   ├── safeStringify.js       # Circular-safe JSON stringify
│   │   ├── supabaseErrorInterceptor.js # Sentry breadcrumbs for Supabase calls
│   │   ├── seo.js                 # SEO meta tag helpers
│   │   └── mediaMigration.js      # Media URL migration helpers
│   │
│   ├── types/                     # TypeScript-style type documentation
│   │   └── media.js               # Media type constants/interfaces
│   │
│   ├── legacy/                    # Deprecated code kept for backwards compat
│   │   ├── pages/                 # Older page implementations
│   │   ├── components/
│   │   │   └── listings/          # Legacy listing components
│   │   ├── hooks/                 # Legacy hook implementations
│   │   ├── data/                  # Legacy static data
│   │   └── utils/                 # Legacy utility functions
│   │
│   ├── layouts/                   # Legacy TV layout templates
│   │   ├── Layout1.jsx
│   │   ├── Layout2.jsx
│   │   ├── Layout3.jsx
│   │   ├── Layout4.jsx
│   │   └── index.js
│   │
│   ├── templates/                 # Static template assets
│   │   └── restaurant-menu-template.json
│   │
│   └── __fixtures__/              # Shared test fixture factories
│       ├── index.js
│       ├── playlists.js
│       ├── schedules.js
│       └── screens.js
│
├── tests/                         # All test code
│   ├── setup.js                   # Vitest global test setup
│   ├── mocks/                     # Shared mock implementations
│   ├── utils/                     # Test utility helpers
│   ├── unit/                      # Unit tests (mirroring src structure)
│   ├── integration/               # Integration tests
│   │   └── api/                   # API integration tests
│   ├── e2e/                       # Playwright E2E tests
│   │   ├── auth.setup.js          # Auth state setup for E2E
│   │   ├── helpers.js             # Shared E2E helper functions
│   │   ├── fixtures/              # E2E test fixtures
│   │   └── *.spec.js              # Feature-scoped E2E specs
│   ├── load/                      # Load test scripts
│   ├── logging.test.js            # Logging service tests
│   └── (unit test files)
│
├── supabase/                      # Supabase backend
│   ├── migrations/                # SQL migration files
│   ├── functions/                 # Edge functions
│   │   ├── rss-proxy/             # RSS feed proxy edge function
│   │   ├── unsplash-proxy/        # Unsplash search proxy edge function
│   │   └── _shared/               # Shared edge function utilities
│   ├── tests/                     # DB-level tests
│   └── snippets/                  # SQL utility snippets
│
├── playwright/                    # Playwright configuration
├── scripts/                       # Build/maintenance scripts
├── public/                        # Static assets served at root
├── android-tv-player/             # Android TV native player app
├── yodeck-capture/                # Yodeck screen capture integration
├── _api-disabled/                 # Disabled API routes (preserved)
├── load-tests/                    # k6 load test scripts
├── docs/                          # Project documentation
│
├── index.html                     # Vite HTML entry point
├── vite.config.js                 # Vite + Sentry + S3 presign API plugin
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── eslint.config.js               # ESLint flat config
├── playwright.config.js           # Playwright E2E configuration
├── vitest.config.js               # Vitest unit test configuration
└── package.json                   # Dependencies and npm scripts
```

## Directory Purposes

**`src/services/`:**
- Purpose: All Supabase queries, external API calls, and business logic. No React imports.
- Contains: 90+ named-export async function modules. Each file is one domain (e.g., media, schedule, screen).
- Key files: `loggingService.js` (used by everything), `playerService.js`, `featureFlagService.js`, `approvalService.js`

**`src/components/`:**
- Purpose: Reusable UI components organized by feature domain
- Contains: Feature subdirectories (`campaigns/`, `media/`, `schedules/`, etc.) each with domain-specific components
- Key distinction from pages: Components are reusable building blocks; pages are full-view containers

**`src/design-system/components/`:**
- Purpose: Primitive, domain-agnostic UI components (the component library)
- Contains: `Button`, `Modal`, `Alert`, `Card`, `PageLayout`, `EmptyState`, `FilterChips`, `SearchBar`, `Tabs`
- Use these in preference to ad-hoc HTML when building new UI

**`src/player/`:**
- Purpose: Self-contained TV player subsystem; runs at `/player/*`
- Contains: Pages, components, hooks, contexts all specific to playback runtime
- Note: Intentionally isolated — player code does not import from `src/pages/` or `src/components/`

**`src/widgets/registry.js`:**
- Purpose: Single source of truth for all widget types
- Used by both the scene editor (admin) and the player renderer

**`src/legacy/`:**
- Purpose: Deprecated code kept for backwards compatibility
- Do NOT add new code here; migrate away from these over time

**`src/layouts/`:**
- Purpose: Legacy layout templates used by `TV.jsx` (the `/tv/*` route)
- Do NOT add new layouts here; new layouts use the zone-based layout system in `src/services/layoutService.js`

**`tests/e2e/`:**
- Purpose: Playwright end-to-end tests covering all major user flows
- Generated: No; committed: Yes
- Files named `*.spec.js` following Playwright convention

**`supabase/migrations/`:**
- Purpose: Ordered SQL migration files applied to the Supabase database
- Generated: No (manually authored); committed: Yes

## Key File Locations

**Entry Points:**
- `src/main.jsx`: Browser entry; React root, observability init, provider tree
- `src/router/AppRouter.jsx`: URL route declarations and guards
- `src/App.jsx`: Admin app shell (nav, currentPage dispatch)
- `src/Player.jsx`: TV player router
- `src/TV.jsx`: Legacy TV player

**Configuration:**
- `src/config/plans.js`: Plan tiers and Feature enum — import `Feature` from here
- `src/config/featureFlags.js`: Flag resolution logic
- `src/config/env.js`: Environment variable helpers
- `vite.config.js`: Build config + dev S3 presign API plugin
- `tailwind.config.js`: Tailwind customizations

**Core Logic:**
- `src/supabase.js`: Supabase singleton client (import this, never create new clients)
- `src/services/loggingService.js`: `createScopedLogger` — use in every new service/hook
- `src/widgets/registry.js`: Widget type registry — add new widgets here
- `src/contexts/AuthContext.jsx`: User session and profile
- `src/hooks/useFeatureFlag.jsx`: Feature flag hooks + `FeatureFlagProvider`
- `src/components/FeatureGate.jsx`: Declarative feature gating component

**Testing:**
- `vitest.config.js`: Unit test config
- `playwright.config.js`: E2E test config
- `tests/setup.js`: Global test setup
- `tests/mocks/`: Shared mock implementations
- `src/__fixtures__/`: Test fixture factories
- `tests/e2e/helpers.js`: Shared E2E helper functions
- `tests/e2e/auth.setup.js`: Auth state for E2E

## Naming Conventions

**Files:**
- Pages: `PascalCase` with `Page` suffix — `DashboardPage.jsx`, `PlaylistEditorPage.jsx`
- Services: `camelCase` with `Service.js` suffix — `mediaService.js`, `scheduleService.js`
- Hooks: `camelCase` with `use` prefix — `useFeatureFlag.jsx`, `usePlayerContent.js`
- Components: `PascalCase` — `FeatureGate.jsx`, `AnnouncementBanner.jsx`
- Contexts: `PascalCase` with `Context.jsx` suffix — `AuthContext.jsx`, `BrandingContext.jsx`
- Utilities: `camelCase` — `observability.js`, `formatters.js`, `pii.js`
- Config: `camelCase` — `plans.js`, `featureFlags.js`, `env.js`
- E2E tests: `kebab-case.spec.js` — `playlists.spec.js`, `content-pipeline.spec.js`

**Directories:**
- Feature domains: `kebab-case` — `scene-editor/`, `layout-editor/`, `data-sources/`
- Admin sub-pages: `PascalCase` — `src/pages/Admin/`
- Editor sub-pages: `PascalCase` — `src/pages/LayoutEditor/`

## Where to Add New Code

**New Feature Page:**
- Primary code: `src/pages/NewFeaturePage.jsx`
- Sub-components: `src/components/new-feature/` directory
- Service: `src/services/newFeatureService.js`
- Hook: `src/hooks/useNewFeature.js`
- Tests: `tests/e2e/new-feature.spec.js` (E2E), `tests/unit/services/newFeatureService.test.js` (unit)
- Register in: `src/App.jsx` (lazy import + pages map entry + nav item if needed)

**New Widget Type:**
- Widget component: `src/player/components/widgets/NewWidget.jsx`
- Export from: `src/player/components/widgets/index.js`
- Register in: `src/widgets/registry.js` (one entry with `component`, `icon`, `label`, `defaultProps`)
- Editor controls: `src/components/scene-editor/NewWidgetControls.jsx`

**New Service:**
- Implementation: `src/services/newFeatureService.js`
- Pattern: Named exports of async functions, `createScopedLogger('NewFeatureService')` at top
- Add to barrel: `src/services/index.js` if widely used

**New Supabase Migration:**
- File: `supabase/migrations/NNN_description.sql`
- Naming: Prefix with next sequential number

**New Context:**
- File: `src/contexts/NewFeatureContext.jsx`
- Pattern: Follow `AuthContext.jsx` — `createContext`, provider component, `useNewFeature` hook with guard
- Mount in: `src/main.jsx` provider tree

**New Design System Primitive:**
- Implementation: `src/design-system/components/NewPrimitive.jsx`
- Keep domain-agnostic (no business logic)

**Utilities:**
- Shared helpers with no React: `src/utils/`
- Shared helpers with React: `src/hooks/`

## Special Directories

**`src/legacy/`:**
- Purpose: Deprecated code — listing management, older page implementations
- Generated: No
- Committed: Yes
- Use: Read-only reference; migrate away from; do not add new code here

**`src/__fixtures__/`:**
- Purpose: Shared test data factories (playlists, schedules, screens)
- Generated: No; Committed: Yes
- Use: Import in unit/integration tests for consistent test data

**`dist/`:**
- Purpose: Production build output
- Generated: Yes (by `vite build`)
- Committed: No (in `.gitignore`)

**`coverage/`:**
- Purpose: Test coverage reports
- Generated: Yes (by vitest)
- Committed: No

**`playwright-report/`:**
- Purpose: Playwright test HTML reports
- Generated: Yes
- Committed: No (currently has staged deletions)

**`perf-reports/`:**
- Purpose: Bundle analyzer reports (`rollup-plugin-visualizer` output)
- Generated: Yes
- Committed: No

**`supabase/functions/`:**
- Purpose: Deno-based Supabase Edge Functions deployed to Supabase infrastructure
- Contains: `rss-proxy` (RSS feed proxy), `unsplash-proxy` (image search proxy), `_shared` (utilities)
- Generated: No; Committed: Yes

**`android-tv-player/`:**
- Purpose: Android TV native player application (separate tech stack)
- Generated: No; Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents — milestones, phase plans, codebase analysis
- Generated: No; Committed: Yes

---

*Structure analysis: 2026-02-17*
