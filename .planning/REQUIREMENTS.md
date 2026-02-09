# Requirements: BizScreen

**Defined:** 2026-02-09
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v2.4 Requirements

Requirements for Tech Debt Zero milestone. Each maps to roadmap phases.

### Dead Code Cleanup

- [ ] **DEAD-01**: User can verify AutoBuildOnboardingModal.jsx file is deleted from codebase
- [ ] **DEAD-02**: User can verify OnboardingWizard files are deleted from codebase
- [ ] **DEAD-03**: User can verify WelcomeModal files are deleted from codebase
- [ ] **DEAD-04**: User can verify obsolete localStorage keys from legacy onboarding are removed from all code references

### E2E Test Triage

- [ ] **E2E-01**: User can see audit report categorizing all 917 skipped E2E tests by skip reason
- [ ] **E2E-02**: User can run previously-skipped tests that were fixed (selector updates, timing fixes)
- [ ] **E2E-03**: User can verify obsolete tests for removed features are deleted
- [ ] **E2E-04**: User can verify remaining skips have clear documentation of why they're skipped
- [ ] **E2E-05**: User can see tests using src/__fixtures__/ pattern for shared test data

### ESLint Zero Warnings

- [ ] **LINT-01**: User can run ESLint with zero warnings across entire codebase
- [ ] **LINT-02**: User can verify warn-level rules are promoted to error in ESLint config
- [ ] **LINT-03**: User can verify pre-commit hooks enforce zero-warning standard

### Sentry Operationalization

- [ ] **SNTY-01**: User can see Sentry alert rules configured for error rate thresholds
- [ ] **SNTY-02**: User can receive Sentry alerts in Slack channel

### Migration Cleanup

- [ ] **MIGR-01**: User can verify migration 105 no longer references non-existent tenants table

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Performance

- **PERF-01**: Bundle analysis and optimization (Core Web Vitals)
- **PERF-02**: Route-level performance profiling

### Internationalization

- **I18N-01**: RTL language support (Hebrew, Arabic)
- **I18N-02**: CJK language support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New user-facing features | This milestone is purely cleanup — no new capabilities |
| TypeScript migration | Too disruptive; JavaScript works (per PROJECT.md) |
| Rewriting tests from scratch | Triage and fix, not rewrite |
| ESLint rule customization | Fix warnings under existing rules, don't redesign rule set |
| Sentry performance monitoring | Focus on error alerting only; APM is future scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEAD-01 | Phase 42 | Pending |
| DEAD-02 | Phase 42 | Pending |
| DEAD-03 | Phase 42 | Pending |
| DEAD-04 | Phase 42 | Pending |
| E2E-01 | Phase 43 | Pending |
| E2E-02 | Phase 43 | Pending |
| E2E-03 | Phase 43 | Pending |
| E2E-04 | Phase 43 | Pending |
| E2E-05 | Phase 43 | Pending |
| LINT-01 | Phase 44 | Pending |
| LINT-02 | Phase 44 | Pending |
| LINT-03 | Phase 44 | Pending |
| SNTY-01 | Phase 45 | Pending |
| SNTY-02 | Phase 45 | Pending |
| MIGR-01 | Phase 42 | Pending |

**Coverage:**
- v2.4 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 -- Traceability updated with phase mappings*
