# Requirements: BizScreen v2.3 Production Hardening

**Defined:** 2026-02-07
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v2.3 Requirements

Requirements for production hardening milestone. Each maps to roadmap phases.

### E2E Test Stability

- [ ] **TEST-01**: E2E test pass rate reaches 90%+ (from current ~35%)
- [ ] **TEST-02**: Timeout-related test failures identified and resolved
- [ ] **TEST-03**: Flaky tests stabilized with proper waits and assertions
- [ ] **TEST-04**: Test infrastructure issues fixed (shared state, setup/teardown)
- [ ] **TEST-05**: Test execution time is reasonable (no excessive slowdowns)

### Error Monitoring

- [ ] **MON-01**: Sentry (or equivalent) integrated for error tracking
- [ ] **MON-02**: Frontend errors captured with user context, route, and state
- [ ] **MON-03**: API errors captured with request context
- [ ] **MON-04**: Alerting configured for critical errors (email/Slack)
- [ ] **MON-05**: Source maps uploaded for readable stack traces in production

### Feature Flag Cleanup

- [ ] **FLAG-01**: OnboardingWizard component deleted (confirmed broken)
- [ ] **FLAG-02**: WelcomeModal legacy code removed
- [ ] **FLAG-03**: Obsolete localStorage keys removed
- [ ] **FLAG-04**: VITE_USE_UNIFIED_ONBOARDING flag removed after validation

## Future Requirements

Deferred to v2.4 or later. Tracked but not in current roadmap.

### Performance Optimization

- **PERF-01**: Bundle analysis baseline established
- **PERF-02**: Core Web Vitals measured and documented
- **PERF-03**: Performance budget defined and enforced

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| RTL language support | Deferred to v3.0 — requires UI/content mirroring |
| CJK language support | Deferred to v3.0 — font/rendering complexity |
| User template marketplace | Deferred to v3.0 — complex moderation/payment |
| TypeScript migration | Too disruptive; JavaScript works |
| New feature development | This is a hardening milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 38 | Pending |
| TEST-02 | Phase 37 | Pending |
| TEST-03 | Phase 37 | Pending |
| TEST-04 | Phase 36 | Complete |
| TEST-05 | Phase 36 | Complete |
| MON-01 | Phase 39 | Pending |
| MON-02 | Phase 39 | Pending |
| MON-03 | Phase 39 | Pending |
| MON-04 | Phase 40 | Pending |
| MON-05 | Phase 40 | Pending |
| FLAG-01 | Phase 41 | Pending |
| FLAG-02 | Phase 41 | Pending |
| FLAG-03 | Phase 41 | Pending |
| FLAG-04 | Phase 41 | Pending |

**Coverage:**
- v2.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 — traceability updated with phase mappings*
