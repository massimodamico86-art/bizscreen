# Requirements: BizScreen

**Defined:** 2026-02-20
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v6.0 Requirements

Requirements for Functional Completeness milestone. Every interactive UI element performs its intended action — no dead buttons, no console errors, no placeholder behavior.

### SVG Editor

- [x] **EDIT-01**: User can add/edit hyperlinks on text objects in SVG editor
- [x] **EDIT-02**: User can open element settings panel for text objects in SVG editor
- [x] **EDIT-03**: User can set precise position/alignment for image objects in SVG editor
- [x] **EDIT-04**: User can crop image objects in SVG editor
- [x] **EDIT-05**: User can replace an image with another image in SVG editor
- [x] **EDIT-06**: User can add/edit hyperlinks on image objects in SVG editor
- [x] **EDIT-07**: User can open element settings panel for image objects in SVG editor
- [x] **EDIT-08**: User can access expanded options menu for any selected object in SVG editor
- [x] **EDIT-09**: User can lock/unlock aspect ratio when resizing any object in SVG editor
- [x] **EDIT-10**: User can click hyperlinks attached to objects to open URLs

### Cloud Media Integrations

- [x] **CLOUD-01**: User can connect and import media from Google Drive via OAuth
- [x] **CLOUD-02**: User can connect and import media from Dropbox via OAuth
- [x] **CLOUD-03**: User can connect and import media from OneDrive via OAuth
- [x] **CLOUD-04**: User can connect and import media from SharePoint via OAuth
- [x] **CLOUD-05**: User can connect and import media from Google Photos via OAuth

### New Features

- [ ] **FEAT-01**: User can generate a complete layout from a text prompt via AI Designer
- [ ] **FEAT-02**: User can upload video files in carousel media manager
- [ ] **FEAT-03**: User can add upcoming events to property details
- [ ] **FEAT-04**: User can browse and insert graphics from library in layout editor sidebar
- [ ] **FEAT-05**: User can view media and playlist timeline analytics on content detail page
- [ ] **FEAT-06**: User can update payment method from subscription/billing page
- [ ] **FEAT-07**: User can edit app configuration from apps page

### Admin & Enterprise

- [x] **ADMN-01**: User can navigate to plan upgrade from enterprise security upsell screen
- [x] **ADMN-02**: User can configure password minimum length policy in enterprise security
- [x] **ADMN-03**: User can configure password complexity requirements in enterprise security
- [x] **ADMN-04**: User can configure session timeout duration in enterprise security
- [x] **ADMN-05**: User can configure JWT token expiry in enterprise security
- [x] **ADMN-06**: User can delete all tenant data from enterprise security page

### Bug Fixes

- [x] **BUGF-01**: BrandingSettingsPage X icon renders without runtime error
- [x] **BUGF-02**: Notification email dispatcher correctly fetches user email addresses
- [x] **BUGF-03**: Device status RPC errors are logged and handled properly in App.jsx

## Future Requirements

None — all identified issues scoped into v6.0.

## Out of Scope

| Feature | Reason |
|---------|--------|
| RTL language support (Hebrew, Arabic) | Requires complete UI/content mirroring |
| CJK languages | Font/rendering complexity, special testing required |
| User template marketplace (buy/sell) | Complex moderation/payment system |
| Conditional scheduling triggers | High complexity, not related to functional completeness |
| Per-viewer personalization | Privacy concerns |
| Mobile native apps | Web player covers all platforms |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-01 | Phase 73, Phase 80 | Complete (integration fix in 80) |
| EDIT-02 | Phase 73 | Complete |
| EDIT-03 | Phase 74, Phase 80 | Complete (integration fix in 80) |
| EDIT-04 | Phase 74 | Complete |
| EDIT-05 | Phase 74 | Complete |
| EDIT-06 | Phase 73, Phase 80 | Complete (integration fix in 80) |
| EDIT-07 | Phase 73 | Complete |
| EDIT-08 | Phase 73 | Complete |
| EDIT-09 | Phase 73 | Complete |
| EDIT-10 | Phase 73, Phase 80 | Complete (integration fix in 80) |
| CLOUD-01 | Phase 75 | Complete |
| CLOUD-02 | Phase 75 | Complete |
| CLOUD-03 | Phase 75 | Complete |
| CLOUD-04 | Phase 75 | Complete |
| CLOUD-05 | Phase 75 | Complete |
| FEAT-01 | Phase 79 | Pending |
| FEAT-02 | Phase 77 | Pending |
| FEAT-03 | Phase 77 | Pending |
| FEAT-04 | Phase 77 | Pending |
| FEAT-05 | Phase 77 | Pending |
| FEAT-06 | Phase 78 | Pending |
| FEAT-07 | Phase 78 | Pending |
| ADMN-01 | Phase 76 | Complete |
| ADMN-02 | Phase 76 | Complete |
| ADMN-03 | Phase 76 | Complete |
| ADMN-04 | Phase 76 | Complete |
| ADMN-05 | Phase 76 | Complete |
| ADMN-06 | Phase 76 | Complete |
| BUGF-01 | Phase 72 | Complete |
| BUGF-02 | Phase 72 | Complete |
| BUGF-03 | Phase 72 | Complete |

**Coverage:**
- v6.0 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-21 after gap closure phase 80 added*
