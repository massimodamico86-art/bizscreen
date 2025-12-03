# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Supabase-backed unit and integration tests with comprehensive coverage
- Playwright E2E test suite covering auth, media, playlists, screens, and more
- GitHub Actions CI with parallel jobs (unit_integration + e2e)
- Production smoke tests (`tests/e2e/smoke.spec.js`) for deployment verification
- Performance E2E tests (`tests/e2e/performance.spec.js`) for bundle size and load time verification
- `/api/health` endpoint returning status, version, and timestamp
- Centralized browser error logging forwarded to `/api/logs/browser`
- Bundle analyzer with `rollup-plugin-visualizer` (reports in `/perf-reports`)
- `TESTING.md` with complete testing documentation
- `CONTRIBUTING.md` with contributor guidelines
- `GIT_WORKFLOW_CHECKLIST.md` for consistent git practices
- `RELEASE_CHECKLIST.md` for release management
- `PRODUCTION_RUNBOOK.md` for operational guidance
- `INCIDENT_RESPONSE.md` for incident handling procedures
- `PERFORMANCE_BUDGET.md` with Core Web Vitals targets and bundle size limits

### Changed
- Enhanced `ErrorBoundary` component with centralized error logging
- Hardened RLS policies with improved multitenancy tests
- Optimized CI workflow with caching for faster builds
- Improved E2E test reliability with better selectors and timeouts

### Performance
- Lazy-loaded all marketing and auth pages for smaller initial bundle
- Added vendor chunks for framer-motion and qrcode libraries
- Reduced initial bundle from 295KB to 200KB (32% reduction)
- Reduced App bundle from 239KB to 99KB (59% reduction)
- All pages now use React.lazy() for optimal code splitting

### Fixed
- Tailwind `animate-shimmer` configuration for skeleton loading states
- `AdminDashboardPage` crash when rendering `EmptyState` icon
- Various E2E test flakiness issues with navigation and timing
- Content pipeline test reliability with specific heading selectors

### Security
- Row Level Security (RLS) policies verified with dedicated test suite
- Tenant isolation validated across all protected tables
