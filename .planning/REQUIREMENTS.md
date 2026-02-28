# Requirements: BizScreen

**Defined:** 2026-02-27
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v9.0 Requirements

Requirements for v9.0 Production Polish. Each maps to roadmap phases.

### Bug Fixes

- [ ] **BUG-01**: DashboardPage stops retrying after max retry count with exponential backoff (no more ~200 errors/sec)
- [x] **BUG-02**: Breadcrumbs reflect actual current route path instead of always showing "Home > Dashboard"
- [ ] **BUG-03**: Error toasts are deduplicated and throttled so retry loops do not flood the UI with repeated messages

### Error Resilience

- [ ] **RESIL-01**: Each app route has its own error boundary displaying route-appropriate error UI instead of falling through to Dashboard
- [ ] **RESIL-02**: All Supabase data-fetching calls use exponential backoff with configurable max retry limits
- [ ] **RESIL-03**: When Supabase is unreachable, app shows a helpful connection error state instead of infinite loading spinner

### UX Polish

- [ ] **UX-01**: Generic loading spinners replaced with content-aware skeleton screens across all app pages
- [ ] **UX-02**: Each page type has a skeleton layout matching its content structure (card grids, data tables, form layouts, etc.)
- [ ] **UX-03**: Error states redesigned with retry buttons, helpful messaging, and recovery suggestions

### Screenshot Verification

- [ ] **VERIFY-01**: MCP screenshot of marketing pages (homepage, features, pricing) showing correct rendering
- [ ] **VERIFY-02**: MCP screenshot of auth pages (login, signup, reset password, update password, accept invite) showing correct forms
- [ ] **VERIFY-03**: MCP screenshot of Dashboard showing real data (widgets, stats, health indicators, quick actions)
- [ ] **VERIFY-04**: MCP screenshot of Media Library showing uploaded media items with grid/list views
- [ ] **VERIFY-05**: MCP screenshot of Playlists page showing playlist items
- [ ] **VERIFY-06**: MCP screenshot of Templates marketplace showing template cards with search/filter
- [ ] **VERIFY-07**: MCP screenshot of Schedules page showing schedule entries
- [ ] **VERIFY-08**: MCP screenshot of Campaigns page showing campaign data
- [ ] **VERIFY-09**: MCP screenshot of Screens page showing registered screens with status indicators
- [ ] **VERIFY-10**: MCP screenshot of Menu Boards page showing menu board entries
- [ ] **VERIFY-11**: MCP screenshot of Apps page showing app listings
- [ ] **VERIFY-12**: MCP screenshot of Settings pages (billing, branding, security, team, white-label)
- [ ] **VERIFY-13**: MCP screenshot of Admin pages (admin dashboard, tenant management, reseller portal)
- [ ] **VERIFY-14**: MCP screenshot of Help Center / Knowledge Hub page

## Future Requirements

### Continued E2E Testing

- **E2E-01**: Complete remaining 139 E2E screenshot test requirements deferred from v8.0
- **E2E-02**: Visual regression testing infrastructure with baseline comparison
- **E2E-03**: Performance benchmarking and bundle size tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dev auth bypass improvements | Real Supabase backend is the target — dev mocking not needed |
| New feature development | This milestone is fixing and polishing existing features |
| E2E test automation | Screenshot verification is manual MCP-based, not Playwright automation |
| Player-side changes | Focus is on admin UI, not player components |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 94 | Pending |
| BUG-02 | Phase 94 | Complete |
| BUG-03 | Phase 94 | Pending |
| RESIL-01 | Phase 95 | Pending |
| RESIL-02 | Phase 95 | Pending |
| RESIL-03 | Phase 95 | Pending |
| UX-01 | Phase 96 | Pending |
| UX-02 | Phase 96 | Pending |
| UX-03 | Phase 96 | Pending |
| VERIFY-01 | Phase 97 | Pending |
| VERIFY-02 | Phase 97 | Pending |
| VERIFY-03 | Phase 97 | Pending |
| VERIFY-04 | Phase 97 | Pending |
| VERIFY-05 | Phase 97 | Pending |
| VERIFY-06 | Phase 97 | Pending |
| VERIFY-07 | Phase 97 | Pending |
| VERIFY-08 | Phase 97 | Pending |
| VERIFY-09 | Phase 97 | Pending |
| VERIFY-10 | Phase 97 | Pending |
| VERIFY-11 | Phase 97 | Pending |
| VERIFY-12 | Phase 97 | Pending |
| VERIFY-13 | Phase 97 | Pending |
| VERIFY-14 | Phase 97 | Pending |

**Coverage:**
- v9.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation (traceability updated)*
