# Roadmap: BizScreen v2.1 Tech Debt Cleanup

## Milestones

- [x] **v1 Production Release** - Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** - Phases 13-23 (shipped 2026-01-27)
- [ ] **v2.1 Tech Debt Cleanup** - Phases 24-28 (in progress)

## Overview

This milestone addresses accumulated technical debt from v1 and v2 development. The focus is maintainability and performance without adding features. Player.jsx gets restructured into maintainable components, test infrastructure gets fixed and documented, analytics gaps get closed, bundle size gets optimized, and code quality standards get enforced.

## Phases

**Phase Numbering:**
- Continues from v2 (Phase 23)
- v2.1 phases: 24-28

- [x] **Phase 24: Player Restructure** - Extract 1265-line Player.jsx into modular components
- [x] **Phase 25: Test Infrastructure** - Fix failing tests and establish patterns
- [ ] **Phase 26: Analytics Completion** - Close template usage and rotation weight gaps
- [ ] **Phase 27: Performance Optimization** - Analyze and optimize bundle size
- [ ] **Phase 28: Code Quality** - Enforce standards and improve documentation

## Phase Details

<details>
<summary>Completed Milestones (v1, v2)</summary>

See git history for v1 (Phases 1-12) and v2 (Phases 13-23) details.
Both milestones shipped successfully.

</details>

### v2.1 Tech Debt Cleanup (In Progress)

**Milestone Goal:** Reduce technical debt for long-term maintainability and performance

---

### Phase 24: Player Restructure
**Goal**: Player.jsx reduced to routing-only (~40 lines) with ViewPage extracted to player/pages/
**Depends on**: Nothing (first phase of v2.1)
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05
**Success Criteria** (what must be TRUE):
  1. Player.jsx is under 100 lines with routing-only responsibility
  2. Widget components (Clock, Date, Weather, QRCode) render correctly when imported from player/components/
  3. Custom hooks work independently and can be tested in isolation
  4. Scene/Layout/Zone renderers handle all existing layout types without regression
**Plans**: 2 plans

Plans:
- [x] 24-01-PLAN.md — Extract useStuckDetection hook
- [x] 24-02-PLAN.md — Extract ViewPage and slim Player.jsx

---

### Phase 25: Test Infrastructure
**Goal**: All service tests passing with documented patterns for future tests
**Depends on**: Phase 24 (cleaner architecture enables better testing)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. `npm test` runs with zero failing tests in services/
  2. loggingService and supabase imports work without circular dependency errors
  3. scheduleService, offlineService, and playerService have test coverage for critical paths
  4. TEST-PATTERNS.md exists with mock patterns and guidelines
**Plans**: 2 plans

Plans:
- [x] 25-01-PLAN.md — Fix circular dependencies and bulk test failures
- [x] 25-02-PLAN.md — Create shared fixtures and document patterns

---

### Phase 26: Analytics Completion
**Goal**: Analytics accurately track template usage and campaign rotation
**Depends on**: Phase 24 (player changes may affect rotation)
**Requirements**: ANLY-01, ANLY-02
**Success Criteria** (what must be TRUE):
  1. StarterPackOnboarding records template_id when templates are applied
  2. get_resolved_player_content returns content weighted by campaign rotation settings
**Plans**: 1 plan

Plans:
- [ ] 26-01-PLAN.md — Add weighted campaign content rotation and verify template tracking

---

### Phase 27: Performance Optimization
**Goal**: Bundle size analyzed and optimized with code splitting
**Depends on**: Phase 24 (player restructure enables better splitting)
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Bundle analysis report exists with baseline metrics
  2. Major routes load their own chunks (dashboard, editor, player)
  3. Unused exports are not included in production bundles
**Plans**: TBD

Plans:
- [ ] 27-01: Analyze bundle and establish baseline
- [ ] 27-02: Implement code splitting and verify tree shaking

---

### Phase 28: Code Quality
**Goal**: Codebase meets quality standards with proper documentation
**Depends on**: Phases 24-27 (document final state)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. ESLint runs on pre-commit with zero errors in committed code
  2. Core components have PropTypes and JSDoc annotations
  3. README reflects current architecture and API patterns
  4. Complex business logic has inline comments explaining intent
**Plans**: TBD

Plans:
- [ ] 28-01: Enforce ESLint and add type annotations
- [ ] 28-02: Update documentation and add inline comments

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 24. Player Restructure | v2.1 | 2/2 | Complete | 2026-01-27 |
| 25. Test Infrastructure | v2.1 | 2/2 | Complete | 2026-01-28 |
| 26. Analytics Completion | v2.1 | 0/1 | Not started | - |
| 27. Performance Optimization | v2.1 | 0/2 | Not started | - |
| 28. Code Quality | v2.1 | 0/2 | Not started | - |

**Total v2.1:** 4/9 plans complete

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-28*
