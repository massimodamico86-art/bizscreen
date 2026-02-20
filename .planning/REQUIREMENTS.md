# Requirements: BizScreen

**Defined:** 2026-02-20
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v5.0 Requirements

Requirements for UI Completeness milestone. Each maps to roadmap phases.

### Layout Editor

- [x] **LEDT-01**: User can configure data-table widget properties in layout editor zones
- [x] **LEDT-02**: User can configure rss-ticker widget properties in layout editor zones
- [x] **LEDT-03**: User can configure rss-card widget properties in layout editor zones
- [x] **LEDT-04**: User can configure social-feed widget properties in layout editor zones
- [x] **LEDT-05**: User can configure countdown widget properties in layout editor zones
- [x] **LEDT-06**: User can configure menu-board widget properties in layout editor zones
- [x] **LEDT-07**: User can configure clock-date widget properties in layout editor zones

### Scene Editor

- [x] **SEDT-01**: User can select which menu board to display and configure appearance in scene editor widget controls

### Screen Settings

- [x] **SCRN-01**: User can set screen orientation (portrait/landscape) from the screen edit UI
- [x] **SCRN-02**: User can assign a language to a screen/device for content delivery

### Notifications

- [ ] **NOTF-01**: User can enable/disable device_recovery alerts in notification settings
- [ ] **NOTF-02**: User can enable/disable device_recovery_exhausted alerts in notification settings

### Dead Code Cleanup

- [x] **CLEAN-01**: Remove unused gdprDeletionService.js
- [x] **CLEAN-02**: Remove unused geolocationService.js
- [x] **CLEAN-03**: Remove unused demoContentService.js
- [x] **CLEAN-04**: Remove unused dataFeedScheduler.js
- [x] **CLEAN-05**: Remove unused scimService.js
- [x] **CLEAN-06**: Remove unused usePrefetch.js hook

## Future Requirements

None — this milestone is scoped to closing existing UI gaps.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Screenshot history/comparison | Low severity gap; current single-screenshot view adequate |
| Alert export (CSV/PDF) | Nice-to-have; not a parity gap |
| Device CPU/temperature metrics | Not captured by player; browser APIs don't expose these |
| Role/permission management UI | Admin feature; existing role checks adequate |
| Test email button in notification settings | Polish; not a parity gap |
| Browser/push notifications | New feature, not a gap |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEDT-01 | Phase 69 | Complete |
| LEDT-02 | Phase 69 | Complete |
| LEDT-03 | Phase 69 | Complete |
| LEDT-04 | Phase 69 | Complete |
| LEDT-05 | Phase 69 | Complete |
| LEDT-06 | Phase 69 | Complete |
| LEDT-07 | Phase 69 | Complete |
| SEDT-01 | Phase 70 | Complete |
| SCRN-01 | Phase 70 | Complete |
| SCRN-02 | Phase 70 | Complete |
| NOTF-01 | Phase 71 | Pending |
| NOTF-02 | Phase 71 | Pending |
| CLEAN-01 | Phase 71 | Complete |
| CLEAN-02 | Phase 71 | Complete |
| CLEAN-03 | Phase 71 | Complete |
| CLEAN-04 | Phase 71 | Complete |
| CLEAN-05 | Phase 71 | Complete |
| CLEAN-06 | Phase 71 | Complete |

**Coverage:**
- v5.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation*
