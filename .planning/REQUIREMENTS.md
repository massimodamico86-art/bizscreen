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

- [x] **DASH-01**: Dashboard loads all sections with functional widgets and navigation
- [x] **DASH-02**: All dashboard quick actions navigate and execute correctly

### Media Library (MEDIA)

- [x] **MEDIA-01**: User can upload media files with progress feedback
- [x] **MEDIA-02**: User can preview, rename, and delete media items
- [x] **MEDIA-03**: User can bulk-select and bulk-delete media
- [x] **MEDIA-04**: User can filter and search the media library

### Scenes & SVG Editor (SCEN)

- [x] **SCEN-01**: User can create, duplicate, and delete scenes from the scene list
- [x] **SCEN-02**: All SVG editor tools function (text, shapes, images, layers)
- [x] **SCEN-03**: All SVG editor property panels work (position, style, effects, hyperlinks, crop/replace)
- [x] **SCEN-04**: AI Designer generates layouts and supports iterative refinement
- [x] **SCEN-05**: Cloud imports (all 5 providers) can browse and insert files

### Playlists (PLAY)

- [x] **PLAY-01**: User can create, rename, and delete playlists
- [x] **PLAY-02**: Playlist editor supports adding, reordering, and removing items
- [x] **PLAY-03**: Playlist settings (duration, transitions) are saved correctly

### Layouts & Templates (LAYT)

- [x] **LAYT-01**: User can create, edit, and delete layouts
- [x] **LAYT-02**: Layout editor zone creation, resize, and configuration works
- [x] **LAYT-03**: All 12 widget types are configurable in layout editor zone properties
- [x] **LAYT-04**: Layout templates browse, preview, and apply work

### Template Marketplace (TMPL)

- [x] **TMPL-01**: Template marketplace browse, search, preview, and filter work
- [x] **TMPL-02**: One-click template-to-editor and customization wizard work

### Schedules (SCHED)

- [x] **SCHED-01**: User can create schedules with time/day rules and content assignment
- [x] **SCHED-02**: Schedule conflict detection and weekly preview work
- [x] **SCHED-03**: Daypart configuration and schedule editor tools work

### Campaigns (CAMP)

- [x] **CAMP-01**: User can create, edit, and delete campaigns
- [x] **CAMP-02**: Campaign editor rotation, priority, and seasonal controls work
- [x] **CAMP-03**: Campaign analytics display is functional

### Screens Management (SCRN)

- [x] **SCRN-01**: Screens list with status, search, and bulk actions works
- [x] **SCRN-02**: Screen pairing flow (QR + OTP) completes without errors
- [x] **SCRN-03**: Screen group creation, tag management, and filtering work
- [x] **SCRN-04**: Screen detail page diagnostics, health metrics, and screenshots work
- [x] **SCRN-05**: Remote commands (reboot, reload, screenshot capture) execute correctly

### Data Sources & Apps (DATA)

- [x] **DATA-01**: Data sources (Sheets, CSV, RSS) can be created and configured
- [x] **DATA-02**: Apps (6 types) can be added and edited with pre-populated modals
- [x] **DATA-03**: Menu boards CRUD with drag-and-drop reordering works

### Moderation & Reviews (MODQ)

- [x] **MODQ-01**: Social feed moderation queue (approve/reject, hashtag filter) works
- [x] **MODQ-02**: Review inbox displays pending approvals with approve/reject actions

### Analytics (ANLYT)

- [x] **ANLYT-01**: Analytics dashboard with charts and date filters works
- [x] **ANLYT-02**: Content performance page with per-content metrics works
- [x] **ANLYT-03**: Content detail analytics timeline works
- [x] **ANLYT-04**: Activity log displays chronological events correctly

### Alerts & Notifications (ALRT)

- [x] **ALRT-01**: Alerts center displays alert history and dismissal works
- [x] **ALRT-02**: Notification settings configure alert types and delivery preferences

### Settings & Account (SET)

- [x] **SET-01**: Billing section loads and Stripe payment method update works
- [x] **SET-02**: Branding settings (logo, colors, fonts) can be edited and saved
- [x] **SET-03**: Enterprise security (password policy, session timeout, data deletion) works
- [x] **SET-04**: Team management (invite, role change, remove) works
- [x] **SET-05**: White-label settings configure custom domain and branding

### Admin Tools (ADMIN)

- [x] **ADMIN-01**: Admin tenant list and detail pages load with correct data
- [x] **ADMIN-02**: Feature flags management (enable/disable per tenant) works
- [x] **ADMIN-03**: Usage dashboard and translation dashboard display correctly
- [x] **ADMIN-04**: Ops console, service quality, system events, audit logs work

### Reseller Portal (RESELL)

- [x] **RESELL-01**: Reseller dashboard with client list and metrics works
- [x] **RESELL-02**: Reseller billing page displays subscription info correctly
- [x] **RESELL-03**: Clients page management actions work

### Help & Status (HELP)

- [x] **HELP-01**: Help center navigation and search work
- [x] **HELP-02**: Status page and other public pages render correctly

### Legacy Pages (LEGC)

- [x] **LEGC-01**: Legacy pages (FAQs, Refer, Setup, Subscription, Users) render without JS errors

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
| DASH-01 | Phase 81 | Complete |
| DASH-02 | Phase 81 | Complete |
| MEDIA-01 | Phase 82 | Complete |
| MEDIA-02 | Phase 82 | Complete |
| MEDIA-03 | Phase 82 | Complete |
| MEDIA-04 | Phase 82 | Complete |
| SCEN-01 | Phase 83 → 91 | Complete |
| SCEN-02 | Phase 83 → 91 | Complete |
| SCEN-03 | Phase 83 → 91 | Complete |
| SCEN-04 | Phase 83 → 91 | Complete |
| SCEN-05 | Phase 83 → 91 | Complete |
| PLAY-01 | Phase 84 | Complete |
| PLAY-02 | Phase 84 | Complete |
| PLAY-03 | Phase 84 | Complete |
| LAYT-01 | Phase 84 → 91 | Complete |
| LAYT-02 | Phase 84 → 91 | Complete |
| LAYT-03 | Phase 84 → 91 | Complete |
| LAYT-04 | Phase 84 | Complete |
| TMPL-01 | Phase 84 | Complete |
| TMPL-02 | Phase 84 | Complete |
| SCHED-01 | Phase 85 | Complete |
| SCHED-02 | Phase 85 | Complete |
| SCHED-03 | Phase 85 | Complete |
| CAMP-01 | Phase 85 → 91 | Complete |
| CAMP-02 | Phase 85 → 91 | Complete |
| CAMP-03 | Phase 85 → 91 | Complete |
| SCRN-01 | Phase 86 | Complete |
| SCRN-02 | Phase 86 | Complete |
| SCRN-03 | Phase 86 → 91 | Complete |
| SCRN-04 | Phase 86 → 91 | Complete |
| SCRN-05 | Phase 86 | Complete |
| DATA-01 | Phase 87 | Complete |
| DATA-02 | Phase 87 | Complete |
| DATA-03 | Phase 87 | Complete |
| MODQ-01 | Phase 87 | Complete |
| MODQ-02 | Phase 87 | Complete |
| ANLYT-01 | Phase 88 | Complete |
| ANLYT-02 | Phase 88 | Complete |
| ANLYT-03 | Phase 88 | Complete |
| ANLYT-04 | Phase 88 | Complete |
| ALRT-01 | Phase 88 | Complete |
| ALRT-02 | Phase 88 | Complete |
| SET-01 | Phase 89 | Complete |
| SET-02 | Phase 89 | Complete |
| SET-03 | Phase 89 | Complete |
| SET-04 | Phase 89 | Complete |
| SET-05 | Phase 89 | Complete |
| ADMIN-01 | Phase 90 | Complete |
| ADMIN-02 | Phase 90 | Complete |
| ADMIN-03 | Phase 90 | Complete |
| ADMIN-04 | Phase 90 | Complete |
| RESELL-01 | Phase 90 | Complete |
| RESELL-02 | Phase 90 | Complete |
| RESELL-03 | Phase 90 | Complete |
| HELP-01 | Phase 90 | Complete |
| HELP-02 | Phase 90 | Complete |
| LEGC-01 | Phase 90 | Complete |

**Coverage:**
- v7 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0
- Satisfied: 34 | Pending (gap closure Phase 91): 13 | Pending (Phases 89-90): 10

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-27 — gap closure Phase 91 added, 13 partial requirements reassigned, checkboxes synced with audit*
