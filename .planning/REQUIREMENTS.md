# Requirements: BizScreen

**Defined:** 2026-03-02
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v11.0 Requirements

Requirements for v11.0 Stability Pass. Each maps to roadmap phases. All bugs sourced from v10.0 Visual QA Audit (screenshots/AUDIT_REPORT.md).

### Crash Fixes

- [ ] **CRASH-01**: Team Management page loads without React error boundary crash (B-01: "Objects are not valid as a React child")
- [ ] **CRASH-02**: Activity Log page loads without React error boundary crash (B-02: same React child render error)
- [ ] **CRASH-03**: Template Marketplace page loads without React error boundary crash (B-03)
- [ ] **CRASH-04**: Translation Dashboard page loads without React error boundary crash (B-04)
- [ ] **CRASH-05**: Demo Tools page loads without React error boundary crash (B-05)
- [ ] **CRASH-06**: Security Dashboard page loads without React error boundary crash (B-06)

### Functionality Fixes

- [ ] **FUNC-01**: Settings page loads successfully for dev-bypass users instead of failing with null user_id constraint violation (B-07)
- [ ] **FUNC-02**: Status page resolves `{{env}}` and `{{version}}` template variables to actual runtime values (B-08)
- [ ] **FUNC-03**: Data Sources page loads without "Failed to load data sources" RPC failure error banner (B-09)

### Error Handling

- [ ] **ERR-01**: "Use Template" with missing template ID shows graceful error or redirects to templates list instead of "Template not found" crash (B-10)
- [ ] **ERR-02**: Public preview with invalid token shows clean user-friendly error page instead of raw JSON parse error "Unexpected token '<'" (B-12)

### Dev Experience

- [ ] **DEV-01**: Playlist creation succeeds when using dev auth bypass instead of failing with "Cannot read properties of null (reading 'id')" (B-11)
- [ ] **DEV-02**: Dashboard loads cleanly for dev-bypass users without "Couldn't load dashboard" retry loop caused by missing Supabase profile (B-13)
- [ ] **DEV-03**: SVG Editor Photos panel handles missing Unsplash proxy gracefully with informative empty state instead of silent failure (B-14)

### Cosmetic Polish

- [ ] **COSM-01**: Templates page filter panel collapses or converts to a mobile-friendly layout on 375px viewport instead of taking ~50% screen width (B-15)
- [ ] **COSM-02**: Pricing page cards have adequate spacing at 768px tablet viewport without aggressive text wrapping (B-16)
- [ ] **COSM-03**: SVG Editor export button shows preview/options dialog before downloading instead of triggering immediate PNG download (B-17)
- [ ] **COSM-04**: Branding page save button state clearly indicates whether unsaved changes exist instead of being permanently disabled (B-18)

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

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRASH-01 | TBD | Pending |
| CRASH-02 | TBD | Pending |
| CRASH-03 | TBD | Pending |
| CRASH-04 | TBD | Pending |
| CRASH-05 | TBD | Pending |
| CRASH-06 | TBD | Pending |
| FUNC-01 | TBD | Pending |
| FUNC-02 | TBD | Pending |
| FUNC-03 | TBD | Pending |
| ERR-01 | TBD | Pending |
| ERR-02 | TBD | Pending |
| DEV-01 | TBD | Pending |
| DEV-02 | TBD | Pending |
| DEV-03 | TBD | Pending |
| COSM-01 | TBD | Pending |
| COSM-02 | TBD | Pending |
| COSM-03 | TBD | Pending |
| COSM-04 | TBD | Pending |

**Coverage:**
- v11.0 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 (pending roadmap creation)

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
