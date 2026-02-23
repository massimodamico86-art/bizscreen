# Requirements: BizScreen

**Defined:** 2026-02-23
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v7 Requirements

Systematic AI-driven audit of every page — every interactive element verified and fixed.

### Authentication (AUTH)

- [x] **AUTH-01**: User can complete full signup flow with email/password and verify prompt
- [x] **AUTH-02**: User can log in and is redirected to the correct page
- [x] **AUTH-03**: User can reset password via forgot-password email link
- [x] **AUTH-04**: User can accept team invitation and set up account
- [x] **AUTH-05**: User can update password from UpdatePasswordPage

### Dashboard (DASH)

- [ ] **DASH-01**: Dashboard loads all sections with functional widgets and navigation
- [ ] **DASH-02**: All dashboard quick actions navigate and execute correctly

### Media Library (MEDIA)

- [ ] **MEDIA-01**: User can upload media files with progress feedback
- [x] **MEDIA-02**: User can preview, rename, and delete media items
- [ ] **MEDIA-03**: User can bulk-select and bulk-delete media
- [ ] **MEDIA-04**: User can filter and search the media library

### Scenes & SVG Editor (SCEN)

- [ ] **SCEN-01**: User can create, duplicate, and delete scenes from the scene list
- [ ] **SCEN-02**: All SVG editor tools function (text, shapes, images, layers)
- [ ] **SCEN-03**: All SVG editor property panels work (position, style, effects, hyperlinks, crop/replace)
- [ ] **SCEN-04**: AI Designer generates layouts and supports iterative refinement
- [ ] **SCEN-05**: Cloud imports (all 5 providers) can browse and insert files

### Playlists (PLAY)

- [ ] **PLAY-01**: User can create, rename, and delete playlists
- [ ] **PLAY-02**: Playlist editor supports adding, reordering, and removing items
- [ ] **PLAY-03**: Playlist settings (duration, transitions) are saved correctly

### Layouts & Templates (LAYT)

- [ ] **LAYT-01**: User can create, edit, and delete layouts
- [ ] **LAYT-02**: Layout editor zone creation, resize, and configuration works
- [ ] **LAYT-03**: All 12 widget types are configurable in layout editor zone properties
- [ ] **LAYT-04**: Layout templates browse, preview, and apply work

### Template Marketplace (TMPL)

- [ ] **TMPL-01**: Template marketplace browse, search, preview, and filter work
- [ ] **TMPL-02**: One-click template-to-editor and customization wizard work

### Schedules (SCHED)

- [ ] **SCHED-01**: User can create schedules with time/day rules and content assignment
- [ ] **SCHED-02**: Schedule conflict detection and weekly preview work
- [ ] **SCHED-03**: Daypart configuration and schedule editor tools work

### Campaigns (CAMP)

- [ ] **CAMP-01**: User can create, edit, and delete campaigns
- [ ] **CAMP-02**: Campaign editor rotation, priority, and seasonal controls work
- [ ] **CAMP-03**: Campaign analytics display is functional

### Screens Management (SCRN)

- [ ] **SCRN-01**: Screens list with status, search, and bulk actions works
- [ ] **SCRN-02**: Screen pairing flow (QR + OTP) completes without errors
- [ ] **SCRN-03**: Screen group creation, tag management, and filtering work
- [ ] **SCRN-04**: Screen detail page diagnostics, health metrics, and screenshots work
- [ ] **SCRN-05**: Remote commands (reboot, reload, screenshot capture) execute correctly

### Data Sources & Apps (DATA)

- [ ] **DATA-01**: Data sources (Sheets, CSV, RSS) can be created and configured
- [ ] **DATA-02**: Apps (6 types) can be added and edited with pre-populated modals
- [ ] **DATA-03**: Menu boards CRUD with drag-and-drop reordering works

### Moderation & Reviews (MODQ)

- [ ] **MODQ-01**: Social feed moderation queue (approve/reject, hashtag filter) works
- [ ] **MODQ-02**: Review inbox displays pending approvals with approve/reject actions

### Analytics (ANLYT)

- [ ] **ANLYT-01**: Analytics dashboard with charts and date filters works
- [ ] **ANLYT-02**: Content performance page with per-content metrics works
- [ ] **ANLYT-03**: Content detail analytics timeline works
- [ ] **ANLYT-04**: Activity log displays chronological events correctly

### Alerts & Notifications (ALRT)

- [ ] **ALRT-01**: Alerts center displays alert history and dismissal works
- [ ] **ALRT-02**: Notification settings configure alert types and delivery preferences

### Settings & Account (SET)

- [ ] **SET-01**: Billing section loads and Stripe payment method update works
- [ ] **SET-02**: Branding settings (logo, colors, fonts) can be edited and saved
- [ ] **SET-03**: Enterprise security (password policy, session timeout, data deletion) works
- [ ] **SET-04**: Team management (invite, role change, remove) works
- [ ] **SET-05**: White-label settings configure custom domain and branding

### Admin Tools (ADMIN)

- [ ] **ADMIN-01**: Admin tenant list and detail pages load with correct data
- [ ] **ADMIN-02**: Feature flags management (enable/disable per tenant) works
- [ ] **ADMIN-03**: Usage dashboard and translation dashboard display correctly
- [ ] **ADMIN-04**: Ops console, service quality, system events, audit logs work

### Reseller Portal (RESELL)

- [ ] **RESELL-01**: Reseller dashboard with client list and metrics works
- [ ] **RESELL-02**: Reseller billing page displays subscription info correctly
- [ ] **RESELL-03**: Clients page management actions work

### Help & Status (HELP)

- [ ] **HELP-01**: Help center navigation and search work
- [ ] **HELP-02**: Status page and other public pages render correctly

### Legacy Pages (LEGC)

- [ ] **LEGC-01**: Legacy pages (FAQs, Refer, Setup, Subscription, Users) render without JS errors

## Future Requirements

### Post-v7.0

- Automated E2E test coverage for all verified user flows
- Accessibility audit (WCAG 2.1 compliance)
- Performance audit (Core Web Vitals, bundle size optimization)
- Mobile responsiveness verification across all pages

## Out of Scope

| Feature | Reason |
|---------|--------|
| Player/device UI | Player runs on screen devices, not admin UI — separate audit scope |
| Marketing site pages | Static content, no interactive flows to audit |
| Real-time chat | Not in platform scope |
| TypeScript migration | Out of scope per PROJECT.md |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 81 | Complete |
| AUTH-02 | Phase 81 | Complete |
| AUTH-03 | Phase 81 | Complete |
| AUTH-04 | Phase 81 | Complete |
| AUTH-05 | Phase 81 | Complete |
| DASH-01 | Phase 81 | Pending |
| DASH-02 | Phase 81 | Pending |
| MEDIA-01 | Phase 82 | Pending |
| MEDIA-02 | Phase 82 | Complete |
| MEDIA-03 | Phase 82 | Pending |
| MEDIA-04 | Phase 82 | Pending |
| SCEN-01 | Phase 83 | Pending |
| SCEN-02 | Phase 83 | Pending |
| SCEN-03 | Phase 83 | Pending |
| SCEN-04 | Phase 83 | Pending |
| SCEN-05 | Phase 83 | Pending |
| PLAY-01 | Phase 84 | Pending |
| PLAY-02 | Phase 84 | Pending |
| PLAY-03 | Phase 84 | Pending |
| LAYT-01 | Phase 84 | Pending |
| LAYT-02 | Phase 84 | Pending |
| LAYT-03 | Phase 84 | Pending |
| LAYT-04 | Phase 84 | Pending |
| TMPL-01 | Phase 84 | Pending |
| TMPL-02 | Phase 84 | Pending |
| SCHED-01 | Phase 85 | Pending |
| SCHED-02 | Phase 85 | Pending |
| SCHED-03 | Phase 85 | Pending |
| CAMP-01 | Phase 85 | Pending |
| CAMP-02 | Phase 85 | Pending |
| CAMP-03 | Phase 85 | Pending |
| SCRN-01 | Phase 86 | Pending |
| SCRN-02 | Phase 86 | Pending |
| SCRN-03 | Phase 86 | Pending |
| SCRN-04 | Phase 86 | Pending |
| SCRN-05 | Phase 86 | Pending |
| DATA-01 | Phase 87 | Pending |
| DATA-02 | Phase 87 | Pending |
| DATA-03 | Phase 87 | Pending |
| MODQ-01 | Phase 87 | Pending |
| MODQ-02 | Phase 87 | Pending |
| ANLYT-01 | Phase 88 | Pending |
| ANLYT-02 | Phase 88 | Pending |
| ANLYT-03 | Phase 88 | Pending |
| ANLYT-04 | Phase 88 | Pending |
| ALRT-01 | Phase 88 | Pending |
| ALRT-02 | Phase 88 | Pending |
| SET-01 | Phase 89 | Pending |
| SET-02 | Phase 89 | Pending |
| SET-03 | Phase 89 | Pending |
| SET-04 | Phase 89 | Pending |
| SET-05 | Phase 89 | Pending |
| ADMIN-01 | Phase 90 | Pending |
| ADMIN-02 | Phase 90 | Pending |
| ADMIN-03 | Phase 90 | Pending |
| ADMIN-04 | Phase 90 | Pending |
| RESELL-01 | Phase 90 | Pending |
| RESELL-02 | Phase 90 | Pending |
| RESELL-03 | Phase 90 | Pending |
| HELP-01 | Phase 90 | Pending |
| HELP-02 | Phase 90 | Pending |
| LEGC-01 | Phase 90 | Pending |

**Coverage:**
- v7 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 — traceability complete, all 57 requirements mapped to phases 81-90*
