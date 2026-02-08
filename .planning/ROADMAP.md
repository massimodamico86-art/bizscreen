# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** - Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** - Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** - Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** - Phases 30-35 (shipped 2026-02-05)
- [ ] **v2.3 Production Hardening** - Phases 36-41 (in progress)

## v2.3 Production Hardening

**Milestone Goal:** Stabilize E2E tests to 90%+ pass rate, add production error monitoring, and clean up legacy feature flags.

### Phase 36: E2E Test Infrastructure
**Goal**: Test infrastructure is reliable and does not cause spurious failures
**Depends on**: Nothing (first phase of milestone)
**Requirements**: TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Tests do not fail due to shared state between test files
  2. Setup and teardown hooks execute correctly and consistently
  3. Test execution time remains under reasonable limits (no regressions)
  4. Test isolation is verified (each test can run independently)
**Plans**: TBD

Plans:
- [ ] 36-01: TBD

### Phase 37: E2E Test Stabilization
**Goal**: Timeout and flaky test failures are eliminated
**Depends on**: Phase 36
**Requirements**: TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. No tests fail due to hardcoded timeouts (proper waits used instead)
  2. Element assertions use appropriate wait strategies
  3. Network-dependent tests handle async operations correctly
  4. Previously flaky tests pass consistently across 5 consecutive runs
**Plans**: TBD

Plans:
- [ ] 37-01: TBD

### Phase 38: E2E Test Coverage Gate
**Goal**: E2E test pass rate reaches 90%+ threshold
**Depends on**: Phase 37
**Requirements**: TEST-01
**Success Criteria** (what must be TRUE):
  1. E2E test pass rate is 90% or higher (target: ~760 passing of 842)
  2. Remaining failures are documented with known root causes
  3. Test results are reproducible across CI runs
  4. No regressions introduced to previously passing tests
**Plans**: TBD

Plans:
- [ ] 38-01: TBD

### Phase 39: Error Monitoring Setup
**Goal**: Production errors are captured with full context
**Depends on**: Phase 38 (tests stable before production monitoring)
**Requirements**: MON-01, MON-02, MON-03
**Success Criteria** (what must be TRUE):
  1. Sentry SDK is integrated in frontend and backend
  2. Frontend errors include user ID, current route, and relevant state
  3. API errors include request method, path, and response status
  4. Errors are visible in Sentry dashboard within 60 seconds of occurrence
**Plans**: TBD

Plans:
- [ ] 39-01: TBD

### Phase 40: Error Monitoring Production
**Goal**: Critical errors trigger immediate notifications with readable stack traces
**Depends on**: Phase 39
**Requirements**: MON-04, MON-05
**Success Criteria** (what must be TRUE):
  1. Critical error threshold triggers email/Slack notification within 5 minutes
  2. Source maps are uploaded during build/deploy process
  3. Production stack traces show original source code locations
  4. Alert fatigue is minimized (no duplicate alerts for same error)
**Plans**: TBD

Plans:
- [ ] 40-01: TBD

### Phase 41: Feature Flag Cleanup
**Goal**: Legacy onboarding code is removed and unified flow is the only path
**Depends on**: Phase 38 (E2E tests must validate unified flow works)
**Requirements**: FLAG-01, FLAG-02, FLAG-03, FLAG-04
**Success Criteria** (what must be TRUE):
  1. OnboardingWizard component is deleted from codebase
  2. WelcomeModal component is deleted from codebase
  3. Obsolete localStorage keys (wizard state, legacy flags) are cleaned up
  4. VITE_USE_UNIFIED_ONBOARDING environment variable is removed
  5. E2E tests still pass after legacy code removal
**Plans**: TBD

Plans:
- [ ] 41-01: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 36. E2E Test Infrastructure | 0/TBD | Not started | - |
| 37. E2E Test Stabilization | 0/TBD | Not started | - |
| 38. E2E Test Coverage Gate | 0/TBD | Not started | - |
| 39. Error Monitoring Setup | 0/TBD | Not started | - |
| 40. Error Monitoring Production | 0/TBD | Not started | - |
| 41. Feature Flag Cleanup | 0/TBD | Not started | - |

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2)</summary>

**v1 Production Release** - Phases 1-12
See `.planning/milestones/v1-ROADMAP.md`

**v2 Templates & Platform Polish** - Phases 13-23
See `.planning/milestones/v2-ROADMAP.md`

**v2.1 Tech Debt Cleanup** - Phases 24-29
See `.planning/milestones/v2.1-ROADMAP.md`

**v2.2 Onboarding Polish** - Phases 30-35
See `.planning/milestones/v2.2-ROADMAP.md`

All milestones shipped successfully.

</details>

## Progress Summary

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1 Production Release | 1-12 | 75 | Complete | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | Complete | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | Complete | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | Complete | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | TBD | In Progress | - |

**Total:** 35 phases complete, 141 plans executed | 6 phases planned for v2.3

---
*Last updated: 2026-02-07 — v2.3 roadmap created*
*Next: `/gsd:plan-phase 36` to plan E2E Test Infrastructure*
