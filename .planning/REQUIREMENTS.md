# Requirements: BizScreen v2.1

**Defined:** 2026-01-27
**Core Value:** Reduce technical debt for long-term maintainability and performance

## v2.1 Requirements

Requirements for v2.1 Tech Debt Cleanup milestone. Each maps to roadmap phases.

### Player.jsx Restructure

- [x] **PLAY-01**: Player.jsx reduced to under 1000 lines (actual: 23 lines)
- [x] **PLAY-02**: All widgets extracted to separate components (Clock, Date, Weather, QRCode)
- [x] **PLAY-03**: All custom hooks extracted (useStuckDetection, useKioskMode, usePlayerHeartbeat, usePlayerCommands, usePlayerContent)
- [x] **PLAY-04**: Scene and Layout renderers extracted (SceneRenderer, LayoutRenderer, ZoneRenderer)
- [x] **PLAY-05**: Clean directory structure established (player/pages/, player/components/, player/hooks/)

### Test Infrastructure

- [x] **TEST-01**: All 18-19 failing service test files fixed and passing
- [x] **TEST-02**: Circular dependency issues resolved (loggingService/supabase)
- [x] **TEST-03**: Critical path test coverage added (scheduleService, offlineService, playerService)
- [x] **TEST-04**: Test patterns and guidelines documented

### Analytics Gaps

- [x] **ANLY-01**: Template usage recorded for starter pack applies (verified existing call chain works)
- [x] **ANLY-02**: Campaign rotation weights enforced in player content resolution (select_weighted_campaign_content)

### Performance - Bundle Size

- [x] **PERF-01**: Bundle size analyzed and baseline established
- [x] **PERF-02**: Code splitting implemented for major routes
- [x] **PERF-03**: Tree shaking verified and optimized

### Code Quality

- [ ] **QUAL-01**: ESLint rules enforced across codebase
- [ ] **QUAL-02**: PropTypes and JSDoc type annotations added to core components
- [ ] **QUAL-03**: README and API documentation updated
- [ ] **QUAL-04**: Inline comments added to complex business logic

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Performance
- **PERF-F01**: Lazy loading implementation
- **PERF-F02**: Rendering performance optimization
- **PERF-F03**: Image/media optimization

### Testing
- **TEST-F01**: E2E test suite
- **TEST-F02**: Visual regression testing
- **TEST-F03**: Performance testing automation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| TypeScript migration | Too disruptive for cleanup milestone |
| Full E2E test suite | Scope creep — focus on unit tests first |
| Major architectural changes | Cleanup only, not redesign |
| New features | This is a tech debt milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAY-01 | Phase 24 | Complete |
| PLAY-02 | Phase 24 | Complete |
| PLAY-03 | Phase 24 | Complete |
| PLAY-04 | Phase 24 | Complete |
| PLAY-05 | Phase 24 | Complete |
| TEST-01 | Phase 25 | Complete |
| TEST-02 | Phase 25 | Complete |
| TEST-03 | Phase 25 | Complete |
| TEST-04 | Phase 25 | Complete |
| ANLY-01 | Phase 26 | Complete |
| ANLY-02 | Phase 26 | Complete |
| PERF-01 | Phase 27 | Complete |
| PERF-02 | Phase 27 | Complete |
| PERF-03 | Phase 27 | Complete |
| QUAL-01 | Phase 28 | Pending |
| QUAL-02 | Phase 28 | Pending |
| QUAL-03 | Phase 28 | Pending |
| QUAL-04 | Phase 28 | Pending |

**Coverage:**
- v2.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-28 after phase 27 completion*
