# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
bizscreen/
├── src/                              # Main application source code
│   ├── main.jsx                      # Entry point, providers wrapper
│   ├── App.jsx                       # Main app component with sidebar, header, router
│   ├── index.css                     # Global styles (Tailwind)
│   ├── supabase.js                   # Supabase client initialization
│   ├── auth/                         # Authentication pages
│   ├── components/                   # Reusable UI components and page components
│   │   ├── media/                    # Media-specific components
│   │   ├── schedules/                # Schedule editor components
│   │   ├── templates/                # Template components
│   │   ├── screens/                  # Screen management components
│   │   ├── Admin/                    # Admin-only components
│   │   ├── layout-editor/            # Layout editor components
│   │   ├── scene-editor/             # Scene editor components
│   │   └── design-system/            # Design system components (buttons, cards, modals)
│   ├── config/                       # Configuration constants
│   │   └── plans.js                  # Feature definitions and plan mapping
│   ├── contexts/                     # React Context providers
│   │   ├── AuthContext.jsx           # User auth and profile state
│   │   └── BrandingContext.jsx       # White-label branding config
│   ├── design-system/                # Design system components
│   │   └── components/               # Reusable UI primitives
│   ├── hooks/                        # Custom React hooks
│   │   ├── useMedia.js               # Media data and operations
│   │   ├── useLayout.js              # Layout data and operations
│   │   ├── useFeatureFlag.jsx        # Feature gating and plan access
│   │   └── ...
│   ├── i18n/                         # Internationalization
│   │   ├── index.jsx                 # I18n provider
│   │   └── locales/                  # Translation files
│   ├── pages/                        # Page-level components
│   │   ├── DashboardPage.jsx         # Main dashboard
│   │   ├── MediaLibraryPage.jsx      # Media management
│   │   ├── PlaylistsPage.jsx         # Playlist list with pagination
│   │   ├── LayoutsPage.jsx           # Layouts list with pagination
│   │   ├── SchedulesPage.jsx         # Schedules list with pagination
│   │   ├── ScreensPage.jsx           # Screens management
│   │   ├── TemplatesPage.jsx         # Templates with server-side pagination
│   │   ├── ScenesPage.jsx            # Scenes list with pagination
│   │   ├── PlaylistEditorPage.jsx    # Dynamic playlist editor
│   │   ├── LayoutEditorPage.jsx      # Dynamic layout editor
│   │   ├── ScheduleEditorPage.jsx    # Dynamic schedule editor
│   │   ├── SceneEditorPage.jsx       # Dynamic scene editor
│   │   └── Admin/                    # Admin-only pages
│   ├── router/                       # Routing configuration
│   │   └── AppRouter.jsx             # React Router setup with lazy loading
│   ├── services/                     # Business logic and API calls
│   │   ├── mediaService.js           # Media CRUD with pagination
│   │   ├── playlistService.js        # Playlist CRUD
│   │   ├── layoutService.js          # Layout CRUD
│   │   ├── scheduleService.js        # Schedule CRUD
│   │   ├── templateService.js        # Template CRUD with pagination
│   │   ├── sceneService.js           # Scene CRUD with pagination
│   │   ├── billingService.js         # Billing and trial management
│   │   ├── screenService.js          # Screen management
│   │   └── ...
│   ├── templates/                    # Default template content
│   ├── types/                        # Type definitions
│   │   └── media.js                  # Media type definitions
│   └── utils/                        # Utility functions
│       ├── logger.js                 # Logging utility
│       ├── errorTracking.js          # Sentry integration
│       ├── errorMessages.js          # User-facing error messages
│       ├── formatters.js             # Data formatting helpers
│       └── observability.js          # Monitoring utilities
│
├── supabase/                         # Database and migrations
│   ├── migrations/                   # SQL migrations (numbered sequentially)
│   │   ├── 001_create_base_schema.sql
│   │   ├── 010_auto_create_profiles.sql
│   │   ├── 011_rbac_tv_qr_pms_activity.sql
│   │   ├── 012_finalize_rls_rbac.sql
│   │   └── ...                       # Up to 114+
│   └── tests/                        # Database function tests
│
├── tests/                            # Test files
│   ├── unit/                         # Unit tests
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── pages/
│   ├── integration/                  # Integration tests
│   ├── e2e/                          # End-to-end tests (Playwright)
│   └── load/                         # Load tests
│
├── public/                           # Static assets
│   ├── icons/                        # Application icons
│   ├── images/                       # Static images
│   ├── templates/                    # Template preview images
│   └── polotno/                      # Polotno library assets
│
├── scripts/                          # Build and utility scripts
│   ├── polotno-build/                # Polotno custom build
│   ├── dev/                          # Development utilities
│   └── svg-to-polotno.cjs            # SVG conversion script
│
├── docs/                             # Documentation
├── prd/                              # Product requirements
├── load-tests/                       # Load testing scripts
├── playwright-report/                # E2E test reports
└── vite.config.js                    # Vite bundler configuration
```

## Directory Purposes

**src/auth/**
- Purpose: Authentication pages (login, signup, password reset)
- Contains: LoginPage, SignupPage, ResetPasswordPage, AuthCallbackPage, AcceptInvitePage
- Key files: OAuth callbacks for Google and Canva

**src/components/**
- Purpose: Reusable UI components and feature-specific component groups
- Contains: Modals, dialogs, widgets, layout editors, design system primitives
- Key subdirectories: `media/`, `schedules/`, `templates/`, `screens/`, `Admin/`
- Pattern: Components are exported by index.js for easy importing

**src/components/media/**
- Purpose: Media library specific components
- Contains: MediaPreviewPopover, DropZoneOverlay, BulkActionBar, StorageUsageBar

**src/components/schedules/**
- Purpose: Schedule editor and scheduling UI
- Contains: Schedule creation, editing, recurrence UI

**src/components/templates/**
- Purpose: Template gallery and template management
- Contains: Template cards, category filters, SVG template editor

**src/pages/**
- Purpose: Full page components for each major feature
- Contains: Dashboard, media library, playlists, schedules, screens, templates, scenes, etc.
- Pattern: Each page handles its own data fetching and state management
- Dynamic pages: Editor pages use ID from route string to fetch specific item

**src/services/**
- Purpose: Business logic abstraction, database access, API calls
- Contains: CRUD operations, pagination, filtering, validation
- Key services: mediaService, playlistService, layoutService, scheduleService, sceneService
- Pattern: Export async functions, handle errors, return structured data

**src/hooks/**
- Purpose: Encapsulate stateful logic and side effects
- Contains: Custom hooks for data fetching, file uploads, feature flags
- Key hooks: useMedia, useLayout, useFeatureFlag, useAdmin, useS3Upload
- Pattern: Return state and functions for component use

**src/utils/**
- Purpose: Pure utility functions for common tasks
- Contains: Logging, error tracking, formatting, validation
- Not dependent on: React hooks, component state

**src/config/**
- Purpose: Application configuration constants
- Contains: Feature definitions, plan mappings, feature flags
- Key file: `plans.js` - Defines Feature enum and plan-feature mapping

**supabase/migrations/**
- Purpose: Database schema versioning
- Pattern: Numbered sequentially (001, 002, ..., 114)
- Contains: Table creation, RLS policies, triggers, functions
- Key migrations: Auth (010), RBAC (011-012), Media (095), Schedules, Layouts, Scenes

**tests/**
- Purpose: Test files organized by type
- Location: Mirrors src/ structure for unit tests
- E2E tests: In `tests/e2e/` using Playwright
- Load tests: In `tests/load/` with k6 and custom Node.js scripts

## Key File Locations

**Entry Points:**
- `src/main.jsx` - React root render, provider setup
- `src/App.jsx` - Main app component after auth
- `src/router/AppRouter.jsx` - Route definitions and lazy loading

**Authentication:**
- `src/contexts/AuthContext.jsx` - Auth provider and useAuth hook
- `src/auth/LoginPage.jsx` - Login page
- `src/auth/SignupPage.jsx` - Signup page
- `src/supabase.js` - Supabase client initialization

**Configuration:**
- `src/config/plans.js` - Feature definitions and plan mapping
- `vite.config.js` - Build configuration
- `.env.example` - Environment variable template
- `package.json` - Dependencies and scripts

**Core Logic:**
- `src/services/mediaService.js` - Media CRUD with pagination
- `src/services/playlistService.js` - Playlist operations
- `src/services/scheduleService.js` - Schedule operations
- `src/services/sceneService.js` - Scene operations with pagination
- `src/services/templateService.js` - Template operations with pagination
- `src/services/billingService.js` - Billing and trial management

**Styling:**
- `src/index.css` - Global Tailwind CSS setup
- Inline Tailwind classes in components (no separate CSS files)

**Testing:**
- `tests/unit/` - Unit tests (vitest)
- `tests/e2e/` - End-to-end tests (Playwright)
- `tests/integration/` - Integration tests (vitest)
- `tests/load/` - Load tests (k6 and custom scripts)

## Naming Conventions

**Files:**
- Page components: PascalCase.jsx (e.g., `MediaLibraryPage.jsx`, `PlaylistsPage.jsx`)
- Service files: camelCase.js (e.g., `mediaService.js`, `playlistService.js`)
- Hook files: camelCase.js starting with "use" (e.g., `useMedia.js`, `useFeatureFlag.jsx`)
- Component files: PascalCase.jsx (e.g., `FeatureGate.jsx`, `Toast.jsx`)
- Utility files: camelCase.js (e.g., `logger.js`, `errorTracking.js`)
- Context files: PascalCase.jsx (e.g., `AuthContext.jsx`, `BrandingContext.jsx`)

**Directories:**
- Feature-specific groups: kebab-case (e.g., `media/`, `schedules/`, `layout-editor/`)
- Utilities and configuration: camelCase (e.g., `hooks/`, `services/`, `contexts/`)

**Component Props:**
- Handlers: `onXxx` (e.g., `onNavigate`, `setCurrentPage`, `showToast`)
- Boolean props: `is` or `has` prefix (e.g., `isOpen`, `isLoading`, `hasError`)
- Data props: descriptive names (e.g., `mediaAssets`, `listings`, `userProfile`)

**Function Names:**
- Data fetchers: `fetch*` (e.g., `fetchMediaAssets`, `fetchLayouts`)
- Creators: `create*` (e.g., `createMediaAsset`, `createPlaylist`)
- Updaters: `update*` (e.g., `updateSchedule`, `updateLayout`)
- Deleters: `delete*` (e.g., `deleteMedia`, `deleteSchedule`)
- Validators: `validate*` (e.g., `validateMediaFile`, `validateRotationInterval`)
- Checkers: `is*` or `has*` (e.g., `isImpersonating`, `hasMediaUsage`)

## Where to Add New Code

**New Feature (e.g., "Campaigns"):**

1. **Database Schema:**
   - Create migration: `supabase/migrations/NNN_campaigns_table.sql`
   - Define tables, RLS policies, triggers, functions

2. **Backend Service:**
   - Create: `src/services/campaignService.js`
   - Export: `fetchCampaigns()`, `createCampaign()`, `updateCampaign()`, `deleteCampaign()`
   - Handle: Pagination, filtering, error handling

3. **Custom Hook:**
   - Create: `src/hooks/useCampaigns.js`
   - Return: State (campaigns, loading, error) and functions
   - Use: Service methods, implement caching/subscriptions

4. **Page Component:**
   - Create: `src/pages/CampaignsPage.jsx`
   - Use: Hook for data, handle navigation, show list with pagination
   - Handle: Loading states, empty states, error messages

5. **Editor Page:**
   - Create: `src/pages/CampaignEditorPage.jsx`
   - Accept: `campaignId` as prop from dynamic route
   - Use: Service for fetch/update operations

6. **Components:**
   - Create: `src/components/campaigns/CampaignCard.jsx`, etc.
   - Reusable across pages and editors

7. **Router:**
   - Add: Lazy import in `src/router/AppRouter.jsx`
   - Add: Route in routes array
   - Add: New pages map entry in App.jsx

8. **Navigation:**
   - Add: Menu item to sidebar navigation in App.jsx
   - Add: Feature gate if premium feature (check Feature enum)

9. **Tests:**
   - Create: `tests/unit/services/campaignService.test.js`
   - Create: `tests/unit/hooks/useCampaigns.test.js`
   - Create: `tests/e2e/campaigns.spec.js`

**New Component (e.g., "FancyCard"):**

1. **Design System:**
   - Create: `src/design-system/components/FancyCard.jsx`
   - Export props: `title`, `description`, `action`, `variant`
   - Use: Tailwind for styling

2. **Usage:**
   - Import: `import { FancyCard } from '../design-system/components'`
   - Use: In pages and other components

**New Service Function (e.g., "import media from URL"):**

1. **Service Method:**
   - Add to: `src/services/mediaService.js`
   - Function: `export async function importMediaFromUrl(url, mediaType)`
   - Error handling: Try-catch, return error object

2. **Hook Extension:**
   - Add wrapper: In `src/hooks/useMedia.js`, call the service method
   - Update state: On success/error

3. **Component Usage:**
   - Call hook method: `const { importMedia } = useMedia()`
   - Show UI: Button or form for URL input
   - Handle async: Loading state, error message, success toast

**New Page (e.g., "ReportsPage"):**

1. **Page Component:**
   - Create: `src/pages/ReportsPage.jsx`
   - Structure: Data fetching in useEffect, state management
   - Content: Use design system components

2. **Services (if needed):**
   - Create: `src/services/reportService.js`
   - Export: `fetchReports()`, `generateReport()`, etc.

3. **Hook (if needed):**
   - Create: `src/hooks/useReports.js`
   - Wrap service methods, manage loading/error states

4. **Router:**
   - Add lazy import: `const ReportsPage = lazy(() => import('./pages/ReportsPage'))`
   - Add to pages object in App.jsx
   - Add navigation handler

5. **Sidebar:**
   - Add menu item in App.jsx navigation array
   - Icon from lucide-react
   - Add click handler

6. **Tests:**
   - Create: `tests/unit/pages/ReportsPage.test.js`
   - Mock: Services and hooks

## Special Directories

**src/legacy/**
- Purpose: Deprecated code kept for gradual migration
- Generated: No (manually maintained)
- Committed: Yes
- Status: Being phased out, prefer new patterns in src/

**src/marketing/**
- Purpose: Marketing website pages (home, pricing, features)
- Generated: No
- Committed: Yes
- Used: When user not logged in (public routes)

**src/player/**
- Purpose: TV player application (separate from admin UI)
- Generated: No
- Committed: Yes
- Status: Embedded player for displaying content on screens

**_api-disabled/**
- Purpose: Disabled API endpoints (backup reference)
- Generated: No (historical)
- Committed: Yes
- Status: Not used in current version

**android-tv-player/**
- Purpose: Android TV player application (separate project)
- Generated: No
- Committed: Yes
- Status: Standalone Android app for screen devices

**public/polotno/**
- Purpose: Polotno editor assets (design editing)
- Generated: No (pre-built)
- Committed: Yes
- Used: By design editor and template builder

**yodeck-capture/**
- Purpose: Yodeck integration capture utilities
- Generated: No
- Committed: Yes
- Status: Legacy integration support

**dist/**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**playwright-report/**
- Purpose: E2E test results and reports
- Generated: Yes (by `npm run test:e2e`)
- Committed: No (in .gitignore)

