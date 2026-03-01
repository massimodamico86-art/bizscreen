# Requirements: BizScreen

**Defined:** 2026-02-28
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v10.0 Requirements

Requirements for v10.0 Visual QA Audit. Each maps to roadmap phases.

### Discovery

- [x] **DISC-01**: Navigate to every app route via MCP browser_navigate and screenshot each page's initial load state
- [x] **DISC-02**: Take browser_snapshot accessibility tree on every page to discover all interactive elements
- [x] **DISC-03**: Map complete navigation structure (all routes, sidebar links, menu items) into a documented route list

### Authentication

- [ ] **AUTH-01**: Screenshot login flow with valid credentials at each step (form, submit, dashboard landing)
- [ ] **AUTH-02**: Screenshot login with invalid credentials showing error states
- [ ] **AUTH-03**: Screenshot signup/registration flow at each step
- [ ] **AUTH-04**: Screenshot logout flow with confirmation
- [ ] **AUTH-05**: Screenshot password reset flow at each step
- [ ] **AUTH-06**: Capture all auth empty states, loading states, and error states

### CRUD Walkthrough

- [ ] **CRUD-01**: For each major entity, create via UI forms with sample data and screenshot before/after submission
- [ ] **CRUD-02**: Browse lists/tables for each entity, screenshot pagination, filters, and search
- [ ] **CRUD-03**: Edit existing records for each entity, screenshot edit forms and results
- [ ] **CRUD-04**: Delete records for each entity, screenshot confirmation dialogs and results
- [ ] **CRUD-05**: Test every toggle, dropdown, tab, and modal on each page, screenshot all state changes

### Display & Preview

- [ ] **DISP-01**: Open every layout preview and screenshot each at default state
- [ ] **DISP-02**: Toggle all display options (weather, wifi, contact, check-in/out widgets) and screenshot each combination
- [ ] **DISP-03**: Test media uploads and QR code generation features if applicable, screenshot results

### Settings & Edge Cases

- [ ] **EDGE-01**: Visit and screenshot every settings page
- [ ] **EDGE-02**: Toggle every setting and screenshot results
- [ ] **EDGE-03**: Test edge cases — empty states, very long text inputs, special characters
- [ ] **EDGE-04**: Check responsive behavior at multiple viewport sizes (mobile, tablet, desktop)

### Audit Report

- [ ] **RPT-01**: Produce AUDIT_REPORT.md listing every page visited with URL and screenshot reference
- [ ] **RPT-02**: Catalog all bugs by severity (critical / major / minor / cosmetic) with screenshot evidence
- [ ] **RPT-03**: Include console error log, total screenshot count, and coverage summary

## Future Requirements

### Continued QA

- **QA-01**: Automated visual regression testing with baseline screenshot comparison
- **QA-02**: Performance benchmarking (Lighthouse scores, Core Web Vitals) per page
- **QA-03**: Accessibility audit (WCAG 2.1 AA compliance) with axe-core integration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Writing Playwright test script files | This milestone uses MCP tools directly, not test automation files |
| Fixing bugs found during audit | Audit identifies bugs; a follow-up milestone fixes them |
| Player-side testing | Focus is admin UI only |
| Database-level test data setup | All test data created through the UI |
| Performance optimization | Audit only, no code changes |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 98 | Complete |
| DISC-02 | Phase 98 | Complete |
| DISC-03 | Phase 98 | Complete |
| AUTH-01 | Phase 99 | Pending |
| AUTH-02 | Phase 99 | Pending |
| AUTH-03 | Phase 99 | Pending |
| AUTH-04 | Phase 99 | Pending |
| AUTH-05 | Phase 99 | Pending |
| AUTH-06 | Phase 99 | Pending |
| CRUD-01 | Phase 100 | Pending |
| CRUD-02 | Phase 100 | Pending |
| CRUD-03 | Phase 100 | Pending |
| CRUD-04 | Phase 100 | Pending |
| CRUD-05 | Phase 100 | Pending |
| DISP-01 | Phase 101 | Pending |
| DISP-02 | Phase 101 | Pending |
| DISP-03 | Phase 101 | Pending |
| EDGE-01 | Phase 102 | Pending |
| EDGE-02 | Phase 102 | Pending |
| EDGE-03 | Phase 102 | Pending |
| EDGE-04 | Phase 102 | Pending |
| RPT-01 | Phase 103 | Pending |
| RPT-02 | Phase 103 | Pending |
| RPT-03 | Phase 103 | Pending |

**Coverage:**
- v10.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation -- all 24 requirements mapped to phases*
