# Requirements: BizScreen v2

**Defined:** 2026-01-24
**Core Value:** Users can easily find and use pre-built content while managing content across languages and complex schedules

## v2 Requirements

Requirements for v2 Templates & Platform Polish milestone. Each maps to roadmap phases.

### Templates Marketplace

**Table Stakes:**
- [ ] **TMPL-01**: User can browse templates organized by category (restaurant, retail, salon, etc.)
- [ ] **TMPL-02**: User can search templates by name and description
- [ ] **TMPL-03**: User can preview template before applying (full-size modal with details)
- [ ] **TMPL-04**: User can apply template with one click (creates usable scene immediately)
- [ ] **TMPL-05**: User can view featured templates on marketplace homepage
- [ ] **TMPL-06**: User can filter templates by orientation (landscape/portrait)
- [ ] **TMPL-07**: User can access recently used templates
- [ ] **TMPL-08**: User can favorite/bookmark templates for later

**Differentiators:**
- [ ] **TMPL-09**: User can apply starter packs (pre-configured scene+layout+schedule bundles)
- [ ] **TMPL-10**: User can customize template with guided wizard (logo, colors, text replacement)
- [ ] **TMPL-11**: System suggests templates based on user's industry/usage patterns
- [ ] **TMPL-12**: User can rate and review templates
- [ ] **TMPL-13**: User can view template usage analytics (which templates perform best)

### Multi-Language Content

**Table Stakes:**
- [ ] **LANG-01**: User can create language variants of the same scene
- [ ] **LANG-02**: User can assign display language per device
- [ ] **LANG-03**: System falls back to default language when translation missing
- [ ] **LANG-04**: User can switch between language versions when editing in CMS
- [ ] **LANG-05**: System displays language indicator badge on content cards
- [ ] **LANG-06**: User can view all content needing translation in bulk dashboard

**Differentiators:**
- [ ] **LANG-07**: User can assign language to screen group (devices inherit)
- [ ] **LANG-08**: System auto-assigns language based on device location
- [ ] **LANG-09**: User can track translation status (draft/review/approved)
- [ ] **LANG-10**: System suggests AI translations as starting point

### Advanced Scheduling

**Table Stakes:**
- [ ] **SCHED-01**: User can schedule content with date range (start/end dates)
- [ ] **SCHED-02**: User can set priority levels (higher priority overrides lower)
- [ ] **SCHED-03**: System warns when schedule entries conflict
- [ ] **SCHED-04**: User can view 7-day visual schedule preview
- [ ] **SCHED-05**: User can group related schedule entries as a campaign
- [ ] **SCHED-06**: User can push emergency content that overrides all schedules
- [ ] **SCHED-07**: User can apply dayparting presets (breakfast/lunch/dinner)

**Differentiators:**
- [ ] **SCHED-08**: User can view performance metrics grouped by campaign
- [ ] **SCHED-09**: User can configure content rotation rules (percentage-based mix)
- [ ] **SCHED-10**: User can set frequency limits (max N plays per hour/day)
- [ ] **SCHED-11**: User can save campaign configuration as template for reuse
- [ ] **SCHED-12**: User can create seasonal campaigns (auto-activate by date/holiday)

### Mobile Responsive Admin

- [ ] **MOBIL-01**: Admin UI displays correctly on mobile devices (responsive layout)
- [ ] **MOBIL-02**: Data tables adapt to mobile screen size (horizontal scroll or card view)
- [ ] **MOBIL-03**: Navigation is touch-friendly on mobile devices
- [ ] **MOBIL-04**: Critical actions accessible without horizontal scrolling

### Onboarding

- [ ] **ONBRD-01**: New users see welcome tour explaining key features
- [ ] **ONBRD-02**: New users can select starter pack during signup
- [ ] **ONBRD-03**: System suggests templates based on selected industry
- [ ] **ONBRD-04**: Onboarding can be skipped and accessed later

### Dashboard

- [ ] **DASH-01**: Dashboard shows overview of active content across screens
- [ ] **DASH-02**: Dashboard provides quick actions (add screen, create content, view analytics)
- [ ] **DASH-03**: Dashboard displays health indicators (offline screens, errors, warnings)
- [ ] **DASH-04**: Dashboard shows recent activity and notifications

### Technical Foundation

- [ ] **TECH-01**: Player.jsx reduced to <1000 lines via component extraction
- [ ] **TECH-02**: Remaining 38% of services migrated to structured logging
- [ ] **TECH-03**: Flaky useCampaignEditor test fixed
- [ ] **TECH-04**: Critical path test coverage added for new features

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
| TMPL-01 | TBD | Pending |
| TMPL-02 | TBD | Pending |
| TMPL-03 | TBD | Pending |
| TMPL-04 | TBD | Pending |
| TMPL-05 | TBD | Pending |
| TMPL-06 | TBD | Pending |
| TMPL-07 | TBD | Pending |
| TMPL-08 | TBD | Pending |
| TMPL-09 | TBD | Pending |
| TMPL-10 | TBD | Pending |
| TMPL-11 | TBD | Pending |
| TMPL-12 | TBD | Pending |
| TMPL-13 | TBD | Pending |
| LANG-01 | TBD | Pending |
| LANG-02 | TBD | Pending |
| LANG-03 | TBD | Pending |
| LANG-04 | TBD | Pending |
| LANG-05 | TBD | Pending |
| LANG-06 | TBD | Pending |
| LANG-07 | TBD | Pending |
| LANG-08 | TBD | Pending |
| LANG-09 | TBD | Pending |
| LANG-10 | TBD | Pending |
| SCHED-01 | TBD | Pending |
| SCHED-02 | TBD | Pending |
| SCHED-03 | TBD | Pending |
| SCHED-04 | TBD | Pending |
| SCHED-05 | TBD | Pending |
| SCHED-06 | TBD | Pending |
| SCHED-07 | TBD | Pending |
| SCHED-08 | TBD | Pending |
| SCHED-09 | TBD | Pending |
| SCHED-10 | TBD | Pending |
| SCHED-11 | TBD | Pending |
| SCHED-12 | TBD | Pending |
| MOBIL-01 | TBD | Pending |
| MOBIL-02 | TBD | Pending |
| MOBIL-03 | TBD | Pending |
| MOBIL-04 | TBD | Pending |
| ONBRD-01 | TBD | Pending |
| ONBRD-02 | TBD | Pending |
| ONBRD-03 | TBD | Pending |
| ONBRD-04 | TBD | Pending |
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| DASH-03 | TBD | Pending |
| DASH-04 | TBD | Pending |
| TECH-01 | TBD | Pending |
| TECH-02 | TBD | Pending |
| TECH-03 | TBD | Pending |
| TECH-04 | TBD | Pending |

**Coverage:**
- v2 requirements: 49 total
- Mapped to phases: 0
- Unmapped: 49 (pending roadmap creation)

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after initial definition*
