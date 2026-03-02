# Requirements: BizScreen

**Defined:** 2026-03-02
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v11.0 Requirements

Requirements for v11.0 Stability Pass. Each maps to roadmap phases. All bugs sourced from v10.0 Visual QA Audit (screenshots/AUDIT_REPORT.md).

### Crash Fixes

- [x] **CRASH-01**: Team Management page loads without React error boundary crash (B-01: "Objects are not valid as a React child")
- [x] **CRASH-02**: Activity Log page loads without React error boundary crash (B-02: same React child render error)
- [x] **CRASH-03**: Template Marketplace page loads without React error boundary crash (B-03)
- [x] **CRASH-04**: Translation Dashboard page loads without React error boundary crash (B-04)
- [x] **CRASH-05**: Demo Tools page loads without React error boundary crash (B-05)
- [x] **CRASH-06**: Security Dashboard page loads without React error boundary crash (B-06)

### Functionality Fixes

- [x] **FUNC-01**: Settings page loads successfully for dev-bypass users instead of failing with null user_id constraint violation (B-07)
- [x] **FUNC-02**: Status page resolves `{{env}}` and `{{version}}` template variables to actual runtime values (B-08)
- [x] **FUNC-03**: Data Sources page loads without "Failed to load data sources" RPC failure error banner (B-09)

### Error Handling

- [x] **ERR-01**: "Use Template" with missing template ID shows graceful error or redirects to templates list instead of "Template not found" crash (B-10)
- [x] **ERR-02**: Public preview with invalid token shows clean user-friendly error page instead of raw JSON parse error "Unexpected token '<'" (B-12)

### Dev Experience

- [x] **DEV-01**: Playlist creation succeeds when using dev auth bypass instead of failing with "Cannot read properties of null (reading 'id')" (B-11)
- [x] **DEV-02**: Dashboard loads cleanly for dev-bypass users without "Couldn't load dashboard" retry loop caused by missing Supabase profile (B-13)
- [x] **DEV-03**: SVG Editor Photos panel handles missing Unsplash proxy gracefully with informative empty state instead of silent failure (B-14)

### Cosmetic Polish

- [ ] **COSM-01**: Templates page filter panel collapses or converts to a mobile-friendly layout on 375px viewport instead of taking ~50% screen width (B-15)
- [ ] **COSM-02**: Pricing page cards have adequate spacing at 768px tablet viewport without aggressive text wrapping (B-16)
- [x] **COSM-03**: SVG Editor export button shows preview/options dialog before downloading instead of triggering immediate PNG download (B-17)
- [x] **COSM-04**: Branding page save button state clearly indicates whether unsaved changes exist instead of being permanently disabled (B-18)

## Future Requirements

### Continued QA

- **QA-01**: Automated visual regression testing with baseline screenshot comparison
- **QA-02**: Performance benchmarking (Lighthouse scores, Core Web Vitals) per page
- **QA-03**: Accessibility audit (WCAG 2.1 AA compliance) with axe-core integration

### Deferred from Previous Milestones

- **RESIL-01 through RESIL-03**: Error boundaries, API backoff, connection states (deferred from v9.0)
- **UX-01 through UX-03**: Skeleton loaders, page-type skeletons, error state redesign (deferred from v9.0)
- **E2E-01 through E2E-139**: Comprehensive E2E screenshot tests (deferred from v8.0)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features or functionality | This milestone is strictly bug fixes from v10.0 audit |
| E2E test coverage expansion | Deferred to future milestone |
| Performance optimization | Not identified as a bug in audit |
| Player-side fixes | Audit covered admin UI only |
| Database schema changes | Bugs are UI/frontend-level; no schema work needed |
| Refactoring beyond bug fixes | Fix the bug, don't refactor the page |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRASH-01 | Phase 104 | Complete |
| CRASH-02 | Phase 104 | Complete |
| CRASH-03 | Phase 104 | Complete |
| CRASH-04 | Phase 104 | Complete |
| CRASH-05 | Phase 104 | Complete |
| CRASH-06 | Phase 104 | Complete |
| FUNC-01 | Phase 105 | Complete |
| FUNC-02 | Phase 105 | Complete |
| FUNC-03 | Phase 105 | Complete |
| ERR-01 | Phase 105 | Complete |
| ERR-02 | Phase 105 | Complete |
| DEV-01 | Phase 106 | Complete |
| DEV-02 | Phase 106 | Complete |
| DEV-03 | Phase 106 | Complete |
| COSM-01 | Phase 107 | Pending |
| COSM-02 | Phase 107 | Pending |
| COSM-03 | Phase 107 | Complete |
| COSM-04 | Phase 107 | Complete |

**Coverage:**
- v11.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation -- all 18 requirements mapped to phases 104-107*
