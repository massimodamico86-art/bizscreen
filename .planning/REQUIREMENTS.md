# Requirements: BizScreen v2

**Defined:** 2026-01-24
**Core Value:** Users can easily find and use pre-built content while managing content across languages and complex schedules

## v2 Requirements

Requirements for v2 Templates & Platform Polish milestone. Each maps to roadmap phases.

### Templates Marketplace

**Table Stakes:**
- [x] **TMPL-01**: User can browse templates organized by category (restaurant, retail, salon, etc.)
- [x] **TMPL-02**: User can search templates by name and description
- [x] **TMPL-03**: User can preview template before applying (full-size modal with details)
- [x] **TMPL-04**: User can apply template with one click (creates usable scene immediately)
- [x] **TMPL-05**: User can view featured templates on marketplace homepage
- [x] **TMPL-06**: User can filter templates by orientation (landscape/portrait)
- [x] **TMPL-07**: User can access recently used templates
- [x] **TMPL-08**: User can favorite/bookmark templates for later

**Differentiators:**
- [x] **TMPL-09**: User can apply starter packs (pre-configured scene+layout+schedule bundles)
- [x] **TMPL-10**: User can customize template with guided wizard (logo, colors, text replacement)
- [x] **TMPL-11**: System suggests templates based on user's industry/usage patterns
- [x] **TMPL-12**: User can rate and review templates
- [x] **TMPL-13**: User can view template usage analytics (which templates perform best)

### Multi-Language Content

**Table Stakes:**
- [x] **LANG-01**: User can create language variants of the same scene
- [x] **LANG-02**: User can assign display language per device
- [x] **LANG-03**: System falls back to default language when translation missing
- [x] **LANG-04**: User can switch between language versions when editing in CMS
- [x] **LANG-05**: System displays language indicator badge on content cards
- [x] **LANG-06**: User can view all content needing translation in bulk dashboard

**Differentiators:**
- [x] **LANG-07**: User can assign language to screen group (devices inherit)
- [x] **LANG-08**: System auto-assigns language based on device location
- [x] **LANG-09**: User can track translation status (draft/review/approved)
- [x] **LANG-10**: System suggests AI translations as starting point

### Advanced Scheduling

**Table Stakes:**
- [x] **SCHED-01**: User can schedule content with date range (start/end dates)
- [x] **SCHED-02**: User can set priority levels (higher priority overrides lower)
- [x] **SCHED-03**: System warns when schedule entries conflict
- [x] **SCHED-04**: User can view 7-day visual schedule preview
- [x] **SCHED-05**: User can group related schedule entries as a campaign
- [x] **SCHED-06**: User can push emergency content that overrides all schedules
- [x] **SCHED-07**: User can apply dayparting presets (breakfast/lunch/dinner)

**Differentiators:**
- [x] **SCHED-08**: User can view performance metrics grouped by campaign
- [x] **SCHED-09**: User can configure content rotation rules (percentage-based mix)
- [x] **SCHED-10**: User can set frequency limits (max N plays per hour/day)
- [x] **SCHED-11**: User can save campaign configuration as template for reuse
- [x] **SCHED-12**: User can create seasonal campaigns (auto-activate by date/holiday)

### Mobile Responsive Admin

- [x] **MOBIL-01**: Admin UI displays correctly on mobile devices (responsive layout)
- [x] **MOBIL-02**: Data tables adapt to mobile screen size (horizontal scroll or card view)
- [x] **MOBIL-03**: Navigation is touch-friendly on mobile devices
- [x] **MOBIL-04**: Critical actions accessible without horizontal scrolling

### Onboarding

- [ ] **ONBRD-01**: New users see welcome tour explaining key features
- [ ] **ONBRD-02**: New users can select starter pack during signup
- [ ] **ONBRD-03**: System suggests templates based on selected industry
- [ ] **ONBRD-04**: Onboarding can be skipped and accessed later

### Dashboard

- [x] **DASH-01**: Dashboard shows overview of active content across screens
- [x] **DASH-02**: Dashboard provides quick actions (add screen, create content, view analytics)
- [x] **DASH-03**: Dashboard displays health indicators (offline screens, errors, warnings)
- [x] **DASH-04**: Dashboard shows recent activity and notifications

### Technical Foundation

- [x] **TECH-01**: Player.jsx reduced to <1000 lines via component extraction *(1,265 lines achieved - 56% reduction accepted)*
- [x] **TECH-02**: Remaining 38% of services migrated to structured logging
- [x] **TECH-03**: Flaky useCampaignEditor test fixed
- [x] **TECH-04**: Critical path test coverage added for new features

## Future Requirements

Deferred to v3 or later. Tracked but not in current roadmap.

### Templates

- **TMPL-F01**: Canva integration for template editing
- **TMPL-F02**: User-submitted template marketplace (buy/sell)
- **TMPL-F03**: AI-generated templates

### Multi-Language

- **LANG-F01**: RTL language support (Hebrew, Arabic)
- **LANG-F02**: CJK character support (Chinese, Japanese, Korean)
- **LANG-F03**: Real-time translation display (on-screen language switching)

### Scheduling

- **SCHED-F01**: Conditional triggers (play based on weather, inventory)
- **SCHED-F02**: Multi-zone scheduling (different content per zone per time)
- **SCHED-F03**: Programmatic advertising integration

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User template marketplace (buy/sell) | Requires complex moderation, payment processing, copyright enforcement |
| AI-generated templates | Adds complexity, unpredictable results, support burden |
| Real-time translation display | Viewer-confusing, technically complex |
| RTL language support | Requires complete UI/content mirroring, defer to v3 |
| CJK languages | Font/rendering complexity, special testing required |
| Conditional scheduling triggers | High complexity, depends on data feed maturity |
| Per-viewer personalization | Privacy concerns, technically complex |
| Programmatic advertising | Complex ad-tech ecosystem not aligned with product |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TECH-01 | Phase 13 | Pending |
| TECH-02 | Phase 13 | Pending |
| TECH-03 | Phase 13 | Pending |
| SCHED-01 | Phase 14 | Pending |
| SCHED-02 | Phase 14 | Pending |
| SCHED-03 | Phase 14 | Pending |
| SCHED-04 | Phase 14 | Pending |
| SCHED-05 | Phase 15 | Complete |
| SCHED-06 | Phase 15 | Complete |
| SCHED-07 | Phase 15 | Complete |
| SCHED-08 | Phase 16 | Complete |
| SCHED-09 | Phase 16 | Complete |
| SCHED-10 | Phase 16 | Complete |
| SCHED-11 | Phase 16 | Complete |
| SCHED-12 | Phase 16 | Complete |
| TMPL-01 | Phase 17 | Pending |
| TMPL-02 | Phase 17 | Pending |
| TMPL-03 | Phase 17 | Pending |
| TMPL-04 | Phase 17 | Pending |
| TMPL-05 | Phase 17 | Pending |
| TMPL-06 | Phase 17 | Pending |
| TMPL-07 | Phase 18 | Pending |
| TMPL-08 | Phase 18 | Pending |
| TMPL-09 | Phase 18 | Pending |
| TMPL-10 | Phase 18 | Pending |
| TMPL-11 | Phase 19 | Complete |
| TMPL-12 | Phase 19 | Complete |
| TMPL-13 | Phase 19 | Complete |
| LANG-01 | Phase 20 | Complete |
| LANG-02 | Phase 20 | Complete |
| LANG-03 | Phase 20 | Complete |
| LANG-04 | Phase 20 | Complete |
| LANG-05 | Phase 20 | Complete |
| LANG-06 | Phase 21 | Complete |
| LANG-07 | Phase 21 | Complete |
| LANG-08 | Phase 21 | Complete |
| LANG-09 | Phase 21 | Complete |
| LANG-10 | Phase 21 | Complete |
| TECH-04 | Phase 21 | Complete |
| MOBIL-01 | Phase 22 | Complete |
| MOBIL-02 | Phase 22 | Complete |
| MOBIL-03 | Phase 22 | Complete |
| MOBIL-04 | Phase 22 | Complete |
| DASH-01 | Phase 22 | Complete |
| DASH-02 | Phase 22 | Complete |
| DASH-03 | Phase 22 | Complete |
| DASH-04 | Phase 22 | Complete |
| ONBRD-01 | Phase 23 | Pending |
| ONBRD-02 | Phase 23 | Pending |
| ONBRD-03 | Phase 23 | Pending |
| ONBRD-04 | Phase 23 | Pending |

**Coverage:**
- v2 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after roadmap creation*
