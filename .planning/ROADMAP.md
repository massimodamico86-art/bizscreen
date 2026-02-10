# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** — Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** — Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** — Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** — Phases 30-35 (shipped 2026-02-05)
- [x] **v2.3 Production Hardening** — Phases 36-41 (shipped 2026-02-09)
- [ ] **v2.4 Tech Debt Zero** — Phases 42-45 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3)</summary>

**v1 Production Release** — Phases 1-12
See `.planning/milestones/v1-ROADMAP.md`

**v2 Templates & Platform Polish** — Phases 13-23
See `.planning/milestones/v2-ROADMAP.md`

**v2.1 Tech Debt Cleanup** — Phases 24-29
See `.planning/milestones/v2.1-ROADMAP.md`

**v2.2 Onboarding Polish** — Phases 30-35
See `.planning/milestones/v2.2-ROADMAP.md`

**v2.3 Production Hardening** — Phases 36-41
See `.planning/milestones/v2.3-ROADMAP.md`

All milestones shipped successfully.

</details>

## v2.4 Tech Debt Zero

**Milestone Goal:** Eliminate all accumulated tech debt -- dead code, ESLint warnings, skipped tests, and incomplete observability -- to establish a clean foundation for future feature work.

- [x] **Phase 42: Dead Code & Legacy Cleanup** — Remove dead files, obsolete localStorage keys, and fix broken migration (completed 2026-02-09)
- [x] **Phase 43: E2E Test Triage** — Audit, fix, delete, document, and modernize all skipped E2E tests (completed 2026-02-10)
- [x] **Phase 44: ESLint Zero Warnings** — Fix all 7,332 warnings and promote warn rules to error (completed 2026-02-10)
- [ ] **Phase 45: Sentry Operationalization** — Configure alert rules and Slack integration for production error monitoring

## Phase Details

### Phase 42: Dead Code & Legacy Cleanup
**Goal**: Codebase contains zero dead files or obsolete references from previous milestones
**Depends on**: Nothing (first phase of v2.4)
**Requirements**: DEAD-01, DEAD-02, DEAD-03, DEAD-04, MIGR-01
**Success Criteria** (what must be TRUE):
  1. User can search codebase for AutoBuildOnboardingModal and find zero file matches
  2. User can search codebase for OnboardingWizard and WelcomeModal and find zero file matches
  3. User can search codebase for legacy onboarding localStorage keys and find zero references
  4. User can inspect migration 105 and confirm it no longer references a non-existent tenants table
**Plans**: 1 plan

Plans:
- [x] 42-01-PLAN.md — Remove dead code (AutoBuildOnboardingModal, autoBuildService), fix migration 105 tenant_id, verify all cleanup

### Phase 43: E2E Test Triage
**Goal**: Every E2E test either passes, is deleted (if obsolete), or has documented justification for being skipped
**Depends on**: Phase 42 (dead code removal may affect test files referencing deleted components)
**Requirements**: E2E-01, E2E-02, E2E-03, E2E-04, E2E-05
**Success Criteria** (what must be TRUE):
  1. User can view an audit report that categorizes every previously-skipped test by reason (fixable, obsolete, blocked)
  2. User can run the E2E suite and see previously-fixable tests now passing (selector updates, timing fixes applied)
  3. User can search for deleted test files and confirm they covered features that no longer exist
  4. User can inspect every remaining test.skip/test.fixme and find a comment explaining why it is skipped
  5. User can find tests that use src/__fixtures__/ for shared test data instead of inline setup
**Plans**: 4 plans

Plans:
- [x] 43-01-PLAN.md -- Audit report categorizing all 917 skipped tests, delete 3 obsolete diagnostic/debug test files
- [x] 43-02-PLAN.md -- Fix fixable selector/auth skips and document test.fixme/test.skip in 10 spec files
- [x] 43-03-PLAN.md -- Document describe.skip blocks and credential-based skips in 13 spec files
- [x] 43-04-PLAN.md -- Adopt src/__fixtures__/ shared test data pattern in 3 unit test files

### Phase 44: ESLint Zero Warnings
**Goal**: ESLint runs with zero warnings and all rules enforce at error level
**Depends on**: Phase 42 (dead files removed so they do not generate warnings)
**Requirements**: LINT-01, LINT-02, LINT-03
**Success Criteria** (what must be TRUE):
  1. User can run `npx eslint .` and see zero warnings and zero errors across the entire codebase
  2. User can inspect ESLint config and confirm all previously-warn rules are now set to error
  3. User can attempt a commit with a warning-level violation and see it blocked by pre-commit hook
**Plans**: 5 plans

Plans:
- [x] 44-01-PLAN.md — Disable impractical rules (prop-types/jsdoc/react-refresh) and fix small warning categories (42 warnings, 14 files)
- [x] 44-02-PLAN.md — Fix no-undef bugs (34 undefined variable references across 9 files)
- [x] 44-03-PLAN.md — Fix unused-imports/no-unused-vars (356 warnings across 172 files)
- [x] 44-04-PLAN.md — Fix react-hooks/exhaustive-deps (125 warnings across 81 files)
- [x] 44-05-PLAN.md — Promote all warn rules to error and verify zero warnings/errors

### Phase 45: Sentry Operationalization
**Goal**: Production errors automatically trigger alerts that reach the team via Slack
**Depends on**: Nothing (independent of other v2.4 phases; can run in parallel)
**Requirements**: SNTY-01, SNTY-02
**Success Criteria** (what must be TRUE):
  1. User can view Sentry alert rules that trigger on error rate thresholds
  2. User can see Sentry alerts arriving in a designated Slack channel when error thresholds are exceeded
**Plans**: 1 plan

Plans:
- [ ] 45-01-PLAN.md -- Configure Sentry Slack integration, create issue + metric alert rules, verify end-to-end alert delivery

## Progress

**Execution Order:** 42 -> 43 -> 44 -> 45

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 42. Dead Code & Legacy Cleanup | v2.4 | 1/1 | ✓ Complete | 2026-02-09 |
| 43. E2E Test Triage | v2.4 | 4/4 | ✓ Complete | 2026-02-10 |
| 44. ESLint Zero Warnings | v2.4 | 5/5 | ✓ Complete | 2026-02-10 |
| 45. Sentry Operationalization | v2.4 | 0/TBD | Not started | - |

## Progress Summary

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1 Production Release | 1-12 | 75 | Complete | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | Complete | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | Complete | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | Complete | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | Complete | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | TBD | In progress | - |

**Total:** 44 phases complete, 169 plans executed | 5 milestones shipped | 1 milestone in progress

---
*Last updated: 2026-02-10 -- Phase 44 ESLint Zero Warnings complete (5/5 plans, verified)*
