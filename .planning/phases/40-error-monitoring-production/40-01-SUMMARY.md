---
phase: 40-error-monitoring-production
plan: 01
subsystem: infra
tags: [sentry, vite, source-maps, error-monitoring, ci-cd]

# Dependency graph
requires:
  - phase: 39-error-monitoring-setup
    provides: "Sentry SDK wired with DSN, error capture, breadcrumbs"
provides:
  - "Sentry Vite plugin configured for source map uploads on every build"
  - "Hidden source maps (generated but not publicly deployed)"
  - "Auto-injected release identifiers (no manual mismatch possible)"
  - "CI deploy workflow with SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars"
affects: [40-02-alerting, production-debugging, error-triage]

# Tech tracking
tech-stack:
  added: ["@sentry/vite-plugin"]
  patterns: ["hidden source maps with filesToDeleteAfterUpload", "auto-injected release via Debug IDs"]

key-files:
  created:
    - "src/components/feature-flags/FeatureFlagsTab.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/ExperimentsTab.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/FeedbackTab.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/AnnouncementsTab.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/FlagModal.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/ExperimentModal.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/AnnouncementModal.jsx (barrel re-export, deviation fix)"
    - "src/components/feature-flags/FeatureFlagsDebug.jsx (barrel re-export, deviation fix)"
  modified:
    - "vite.config.js"
    - "src/utils/errorTracking.jsx"
    - ".github/workflows/deploy.yml"

key-decisions:
  - "Used hidden source maps to prevent public exposure while enabling Sentry stack trace resolution"
  - "Removed manual release from Sentry.init -- auto-injected by Vite plugin via Debug IDs to prevent mismatch"
  - "Created barrel re-export files for broken feature-flags imports instead of rewriting FeatureFlagsPage"

patterns-established:
  - "Source map uploads via sentryVitePlugin as last Vite plugin (all transforms complete first)"
  - "Server-side build env vars (SENTRY_*) not prefixed with VITE_ since they are consumed by Vite plugin process, not embedded in client bundle"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 40 Plan 01: Source Map Upload Pipeline Summary

**Sentry Vite plugin with hidden source maps, auto-injected release IDs, and CI env var wiring for production stack trace resolution**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T21:18:26Z
- **Completed:** 2026-02-09T21:22:34Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Configured @sentry/vite-plugin as last plugin in vite.config.js with hidden source maps and filesToDeleteAfterUpload
- Removed manual release property from Sentry.init() to prevent release mismatch with auto-injected Debug IDs
- Added SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars to CI deploy workflow build step
- Fixed 3 pre-existing broken import paths that prevented production build (ScreenGroupDetailPage, TranslationDashboardPage, FeatureFlagsPage)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Sentry Vite plugin and configure source map uploads** - `6427a55` (feat)
2. **Task 2: Add Sentry environment variables to CI deploy workflow** - `fedd933` (feat)

## Files Created/Modified
- `vite.config.js` - Added sentryVitePlugin import, plugin config, and sourcemap: 'hidden'
- `src/utils/errorTracking.jsx` - Removed manual release property, added explanatory comment
- `.github/workflows/deploy.yml` - Added SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT to build step env
- `package.json` / `package-lock.json` - Added @sentry/vite-plugin devDependency
- `src/pages/ScreenGroupDetailPage.jsx` - Fixed import path (deviation)
- `src/pages/TranslationDashboardPage.jsx` - Fixed import paths (deviation)
- `src/components/feature-flags/*.jsx` - 8 barrel re-export files (deviation)

## Decisions Made
- Used `sourcemap: 'hidden'` (not `true`) -- generates .map files but omits sourceMappingURL comments in bundles, preventing public source map exposure
- Removed manual `release` property from Sentry.init() rather than aligning it -- the Vite plugin uses Debug IDs which are more reliable than release-based association
- Created barrel re-export files at `src/components/feature-flags/` rather than rewriting the FeatureFlagsPage imports, since the components exist as named exports in a consolidated file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed broken ScreenGroupDetailPage import**
- **Found during:** Task 1 (build verification)
- **Issue:** Import `../components/ScreenGroupSettingsTab` resolved to non-existent path; actual file at `../components/screens/ScreenGroupSettingsTab`
- **Fix:** Updated import path to include `screens/` subdirectory
- **Files modified:** src/pages/ScreenGroupDetailPage.jsx
- **Verification:** Build progressed past this file
- **Committed in:** 6427a55 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed broken FeatureFlagsPage imports (7 components)**
- **Found during:** Task 1 (build verification)
- **Issue:** FeatureFlagsPage imports from `../components/feature-flags/` but all components exist as named exports in `../pages/components/FeatureFlagsComponents.jsx`
- **Fix:** Created 8 barrel re-export files at the expected import paths
- **Files modified:** src/components/feature-flags/ (8 new files)
- **Verification:** Build progressed past FeatureFlagsPage
- **Committed in:** 6427a55 (Task 1 commit)

**3. [Rule 3 - Blocking] Fixed broken TranslationDashboardPage imports**
- **Found during:** Task 1 (build verification)
- **Issue:** Imports for TranslationFilters, BulkActionsBar, AiSuggestionPanel pointed to `../components/` but files exist in `../components/translations/`
- **Fix:** Updated 3 import paths to include `translations/` subdirectory
- **Files modified:** src/pages/TranslationDashboardPage.jsx
- **Verification:** Build completed successfully
- **Committed in:** 6427a55 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking - Rule 3)
**Impact on plan:** All fixes were pre-existing broken imports blocking production build. No scope creep. Build now succeeds.

## Issues Encountered
None beyond the pre-existing broken imports documented above.

## User Setup Required

**External services require manual configuration.** The following must be set up before source maps will upload:

1. **Sentry Auth Token:** Sentry Dashboard -> Settings -> Auth Tokens -> Create New Token (scopes: project:releases, org:ci)
2. **GitHub Secrets:** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to GitHub repository settings
3. **Vercel (if applicable):** Add the same 3 env vars in Vercel Dashboard -> Project Settings -> Environment Variables

The pipeline works without these configured -- it gracefully skips upload with a warning.

## Next Phase Readiness
- Source map pipeline fully configured in code, pending env var setup
- Ready for Plan 02 (production alerting rules)
- Once secrets are configured, next deploy will upload source maps and production errors will show original source

## Self-Check: PASSED

- All key files verified to exist on disk
- Commit 6427a55 (Task 1) verified in git log
- Commit fedd933 (Task 2) verified in git log
- Build succeeds with source map plugin (upload skipped without auth token)

---
*Phase: 40-error-monitoring-production*
*Completed: 2026-02-09*
