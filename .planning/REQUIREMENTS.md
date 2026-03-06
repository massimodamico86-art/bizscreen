# Requirements: BizScreen v13.0 Full Stability Pass

**Defined:** 2026-03-06
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v13.0 Requirements

Requirements for v13.0 release. Each maps to roadmap phases.

### Dashboard & Navigation (E2E)

- [x] **DASH-01**: E2E test verifies dashboard loads with stat cards, recent activity, and quick actions
- [x] **DASH-02**: E2E test verifies sidebar navigation reaches all primary pages
- [x] **DASH-03**: E2E test verifies breadcrumb navigation shows correct path on every route
- [x] **DASH-04**: E2E test verifies welcome page renders differently from dashboard (onboarding flow)
- [x] **DASH-05**: E2E test verifies notification bell opens dropdown with alert history

### Media Library (E2E)

- [x] **MEDIA-01**: E2E test verifies media upload flow (file selection, progress, completion)
- [x] **MEDIA-02**: E2E test verifies media grid/list view toggle with correct rendering
- [x] **MEDIA-03**: E2E test verifies media search and filter by type (images, videos, audio, documents, web pages)
- [x] **MEDIA-04**: E2E test verifies media preview popover shows metadata and thumbnail
- [x] **MEDIA-05**: E2E test verifies media rename via inline editing
- [x] **MEDIA-06**: E2E test verifies media delete with confirmation dialog
- [x] **MEDIA-07**: E2E test verifies bulk select and bulk delete operations
- [x] **MEDIA-08**: E2E test verifies folder creation and file organization
- [x] **MEDIA-09**: E2E test verifies storage usage bar displays accurate quota
- [x] **MEDIA-10**: E2E test verifies media sub-pages (Images, Videos, Audio, Documents, Web Pages) filter correctly

### Scenes & SVG Editor (E2E)

- [ ] **SCENE-01**: E2E test verifies scene list page with create, duplicate, delete actions
- [ ] **SCENE-02**: E2E test verifies scene creation modal with name and dimensions
- [ ] **SCENE-03**: E2E test verifies SVG editor loads with toolbar and canvas
- [ ] **SCENE-04**: E2E test verifies text element creation and property editing
- [ ] **SCENE-05**: E2E test verifies shape element creation (rectangle, circle, line)
- [ ] **SCENE-06**: E2E test verifies image insertion from media library
- [ ] **SCENE-07**: E2E test verifies element selection, move, resize, and delete
- [ ] **SCENE-08**: E2E test verifies layers panel with element ordering
- [ ] **SCENE-09**: E2E test verifies effects panel (shadow, blur, opacity)
- [ ] **SCENE-10**: E2E test verifies animation panel with preset animations
- [ ] **SCENE-11**: E2E test verifies position/alignment panel
- [ ] **SCENE-12**: E2E test verifies undo/redo keyboard shortcuts
- [ ] **SCENE-13**: E2E test verifies save with success feedback
- [ ] **SCENE-14**: E2E test verifies export dialog with format/quality options
- [ ] **SCENE-15**: E2E test verifies context menu on right-click
- [ ] **SCENE-16**: E2E test verifies cloud import panel (Google Drive, Dropbox)
- [ ] **SCENE-17**: E2E test verifies AI Designer panel generates layout from prompt

### Playlists (E2E)

- [ ] **PLAY-01**: E2E test verifies playlist list page with create, duplicate, delete actions
- [ ] **PLAY-02**: E2E test verifies playlist creation modal with name input
- [ ] **PLAY-03**: E2E test verifies playlist editor with item addition from media library
- [ ] **PLAY-04**: E2E test verifies playlist item drag-and-drop reordering
- [ ] **PLAY-05**: E2E test verifies playlist item duration and transition settings
- [ ] **PLAY-06**: E2E test verifies nested playlist insertion with depth indicator
- [ ] **PLAY-07**: E2E test verifies background audio toggle and volume control
- [ ] **PLAY-08**: E2E test verifies playlist preview in player mode

### Layouts & Widget Types (E2E)

- [ ] **LAYOUT-01**: E2E test verifies layout list page with create and filter actions
- [ ] **LAYOUT-02**: E2E test verifies layout creation modal with zone configuration
- [ ] **LAYOUT-03**: E2E test verifies layout editor zone selection and property panel
- [ ] **LAYOUT-04**: E2E test verifies widget type selector shows all 17+ widget types
- [ ] **LAYOUT-05**: E2E test verifies clock widget configuration (12h/24h, analog/digital)
- [ ] **LAYOUT-06**: E2E test verifies weather widget configuration (location, forecast mode)
- [ ] **LAYOUT-07**: E2E test verifies data table widget configuration (source, columns, refresh)
- [ ] **LAYOUT-08**: E2E test verifies video widget configuration (source, HLS, autoplay)

### Templates Marketplace (E2E)

- [ ] **TMPL-01**: E2E test verifies template gallery browse with category filters
- [ ] **TMPL-02**: E2E test verifies template search with debounced results
- [ ] **TMPL-03**: E2E test verifies template preview hover with card lift animation
- [ ] **TMPL-04**: E2E test verifies one-click "Use Template" opens editor
- [ ] **TMPL-05**: E2E test verifies quick customize panel (colors, logo, text)
- [ ] **TMPL-06**: E2E test verifies "Your Designs" tab shows user-created templates
- [ ] **TMPL-07**: E2E test verifies portrait/landscape filter toggle
- [ ] **TMPL-08**: E2E test verifies industry category expansion and filtering

### Schedules & Campaigns (E2E)

- [ ] **SCHED-01**: E2E test verifies schedule list page with create and delete actions
- [ ] **SCHED-02**: E2E test verifies schedule creation with time range and day selection
- [ ] **SCHED-03**: E2E test verifies schedule editor with playlist/layout assignment
- [ ] **SCHED-04**: E2E test verifies schedule conflict detection warning
- [ ] **SCHED-05**: E2E test verifies dayparting preset application
- [ ] **SCHED-06**: E2E test verifies recurring schedule entry creation
- [ ] **CAMP-01**: E2E test verifies campaign list page with create and status indicators
- [ ] **CAMP-02**: E2E test verifies campaign creation with priority and date range
- [ ] **CAMP-03**: E2E test verifies campaign content assignment (playlist or template)
- [ ] **CAMP-04**: E2E test verifies campaign screen targeting
- [ ] **CAMP-05**: E2E test verifies emergency content push modal
- [ ] **CAMP-06**: E2E test verifies campaign analytics display
- [ ] **CAMP-07**: E2E test verifies campaign rotation controls (weight, order)
- [ ] **CAMP-08**: E2E test verifies seasonal date picker
- [ ] **CAMP-09**: E2E test verifies campaign template picker modal

### Screens & Device Management (E2E)

- [ ] **SCRN-01**: E2E test verifies screen list page with status indicators
- [ ] **SCRN-02**: E2E test verifies screen creation with name and pairing code
- [ ] **SCRN-03**: E2E test verifies OTP pairing flow (enter code, polling, success)
- [ ] **SCRN-04**: E2E test verifies screen detail page with device diagnostics
- [ ] **SCRN-05**: E2E test verifies remote commands (reboot, reload, clear cache)
- [ ] **SCRN-06**: E2E test verifies screen group management with tag chips
- [ ] **SCRN-07**: E2E test verifies playlist/layout assignment to screen
- [ ] **SCRN-08**: E2E test verifies screen orientation toggle (portrait/landscape)
- [ ] **SCRN-09**: E2E test verifies master PIN modal for screen locking
- [ ] **SCRN-10**: E2E test verifies emergency push modal for screen groups
- [ ] **SCRN-11**: E2E test verifies working hours schedule per screen

### Data Sources, Apps & Menu Boards (E2E)

- [ ] **DATA-01**: E2E test verifies data sources list with create action
- [ ] **DATA-02**: E2E test verifies Google Sheets data source creation
- [ ] **DATA-03**: E2E test verifies CSV file upload as data source
- [ ] **DATA-04**: E2E test verifies RSS feed URL configuration
- [ ] **DATA-05**: E2E test verifies data source refresh interval setting
- [ ] **APP-01**: E2E test verifies apps gallery page with category browsing
- [ ] **APP-02**: E2E test verifies app detail modal with configuration form
- [ ] **APP-03**: E2E test verifies app installation and configuration saving
- [ ] **APP-04**: E2E test verifies menu board list with create action
- [ ] **APP-05**: E2E test verifies menu board editor with category and item CRUD
- [ ] **APP-06**: E2E test verifies menu item drag-and-drop reordering
- [ ] **APP-07**: E2E test verifies dietary/allergen tag assignment
- [ ] **APP-08**: E2E test verifies menu board theme and currency settings

### Content Moderation (E2E)

- [ ] **MOD-01**: E2E test verifies content moderation queue with pending items
- [ ] **MOD-02**: E2E test verifies approve action moves item to approved tab
- [ ] **MOD-03**: E2E test verifies reject action with reason input
- [ ] **MOD-04**: E2E test verifies review inbox with filter by status
- [ ] **MOD-05**: E2E test verifies social feed hashtag filter configuration

### Analytics & Alerts (E2E)

- [ ] **ANLYT-01**: E2E test verifies analytics dashboard with summary cards
- [ ] **ANLYT-02**: E2E test verifies content performance page with metrics
- [ ] **ANLYT-03**: E2E test verifies activity log with filterable entries
- [ ] **ANLYT-04**: E2E test verifies alerts center with severity indicators
- [ ] **ANLYT-05**: E2E test verifies alert detail modal with timeline
- [ ] **ANLYT-06**: E2E test verifies notification settings page with toggle controls
- [ ] **ANLYT-07**: E2E test verifies notification settings persistence after toggle
- [ ] **ANLYT-08**: E2E test verifies Proof of Play reporting page with date range and export

### Settings (E2E)

- [ ] **SET-01**: E2E test verifies general settings page with form fields
- [ ] **SET-02**: E2E test verifies account/plan page with current plan display
- [ ] **SET-03**: E2E test verifies branding settings with logo upload and color pickers
- [ ] **SET-04**: E2E test verifies team management with invite and role assignment
- [ ] **SET-05**: E2E test verifies developer settings with API key management
- [ ] **SET-06**: E2E test verifies white-label settings with custom domain
- [ ] **SET-07**: E2E test verifies enterprise security settings (password policy, session timeout)

### Admin & Reseller (E2E)

- [ ] **ADMIN-01**: E2E test verifies admin tenant list with search and pagination
- [ ] **ADMIN-02**: E2E test verifies admin tenant detail page with usage stats
- [ ] **ADMIN-03**: E2E test verifies admin audit log with filterable events
- [ ] **ADMIN-04**: E2E test verifies admin system events page
- [ ] **ADMIN-05**: E2E test verifies admin template management
- [ ] **ADMIN-06**: E2E test verifies reseller dashboard with client overview
- [ ] **ADMIN-07**: E2E test verifies reseller billing page
- [ ] **ADMIN-08**: E2E test verifies feature flags page with toggle persistence

### Responsive & Cross-Role (E2E)

- [ ] **RESP-01**: E2E test verifies dashboard renders correctly at mobile viewport (375px)
- [ ] **RESP-02**: E2E test verifies dashboard renders correctly at tablet viewport (768px)
- [ ] **RESP-03**: E2E test verifies sidebar collapses to hamburger menu on mobile
- [ ] **RESP-04**: E2E test verifies media grid adjusts columns per viewport
- [ ] **RESP-05**: E2E test verifies template gallery responsive column layout
- [ ] **RESP-06**: E2E test verifies pricing page tablet 2-column grid
- [ ] **RESP-07**: E2E test verifies schedule editor is usable on tablet
- [ ] **RESP-08**: E2E test verifies role-based navigation hides admin items for non-admin users

### Edge Cases & Error States (E2E)

- [ ] **EDGE-01**: E2E test verifies 404 page renders for unknown routes
- [ ] **EDGE-02**: E2E test verifies session expiry redirects to login
- [ ] **EDGE-03**: E2E test verifies empty states render with helpful messages on all list pages
- [ ] **EDGE-04**: E2E test verifies form validation errors display inline
- [ ] **EDGE-05**: E2E test verifies network error toast appears and auto-dismisses
- [ ] **EDGE-06**: E2E test verifies concurrent tab behavior (no conflicts)
- [ ] **EDGE-07**: E2E test verifies deep link navigation preserves route on auth redirect
- [ ] **EDGE-08**: E2E test verifies browser back/forward navigation maintains state

### Error Resilience

- [ ] **RESIL-01**: React error boundaries wrap all route segments with fallback UI and "Try Again" button
- [ ] **RESIL-02**: All API calls use exponential backoff with max retry limit and clear error state on exhaustion
- [ ] **RESIL-03**: Connection state indicator shows offline/reconnecting/online status in app header

### UX Polish

- [ ] **UX-01**: Skeleton loaders replace spinner on initial page load for all list pages
- [ ] **UX-02**: Page-type skeleton variants match actual layout structure (cards, tables, grids)
- [ ] **UX-03**: Error states redesigned with icon, message, and actionable CTA (retry, go home, contact support)

### CI Pipeline

- [ ] **CI-01**: All E2E tests run in CI with screenshot artifact upload
- [ ] **CI-02**: E2E test pass rate gate at 90% threshold with best-of-3 retry
- [ ] **CI-03**: Screenshot comparison report generated for visual regression detection

## Future Requirements

None deferred -- this milestone closes all testing and stability gaps.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Integration tests for Edge Functions | Requires live Supabase instance; defer to production monitoring |
| Load/performance testing | Requires infrastructure setup; separate initiative |
| TypeScript migration | Too disruptive; JavaScript works |
| Mobile native app testing | No native apps exist |
| Player E2E tests | Player runs on devices, not testable via Playwright |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 115 | Complete |
| DASH-02 | Phase 115 | Complete |
| DASH-03 | Phase 115 | Complete |
| DASH-04 | Phase 115 | Complete |
| DASH-05 | Phase 115 | Complete |
| MEDIA-01 | Phase 115 | Complete |
| MEDIA-02 | Phase 115 | Complete |
| MEDIA-03 | Phase 115 | Complete |
| MEDIA-04 | Phase 115 | Complete |
| MEDIA-05 | Phase 115 | Complete |
| MEDIA-06 | Phase 115 | Complete |
| MEDIA-07 | Phase 115 | Complete |
| MEDIA-08 | Phase 115 | Complete |
| MEDIA-09 | Phase 115 | Complete |
| MEDIA-10 | Phase 115 | Complete |
| SCENE-01 | Phase 116 | Pending |
| SCENE-02 | Phase 116 | Pending |
| SCENE-03 | Phase 116 | Pending |
| SCENE-04 | Phase 116 | Pending |
| SCENE-05 | Phase 116 | Pending |
| SCENE-06 | Phase 116 | Pending |
| SCENE-07 | Phase 116 | Pending |
| SCENE-08 | Phase 116 | Pending |
| SCENE-09 | Phase 116 | Pending |
| SCENE-10 | Phase 116 | Pending |
| SCENE-11 | Phase 116 | Pending |
| SCENE-12 | Phase 116 | Pending |
| SCENE-13 | Phase 116 | Pending |
| SCENE-14 | Phase 116 | Pending |
| SCENE-15 | Phase 116 | Pending |
| SCENE-16 | Phase 116 | Pending |
| SCENE-17 | Phase 116 | Pending |
| PLAY-01 | Phase 117 | Pending |
| PLAY-02 | Phase 117 | Pending |
| PLAY-03 | Phase 117 | Pending |
| PLAY-04 | Phase 117 | Pending |
| PLAY-05 | Phase 117 | Pending |
| PLAY-06 | Phase 117 | Pending |
| PLAY-07 | Phase 117 | Pending |
| PLAY-08 | Phase 117 | Pending |
| LAYOUT-01 | Phase 117 | Pending |
| LAYOUT-02 | Phase 117 | Pending |
| LAYOUT-03 | Phase 117 | Pending |
| LAYOUT-04 | Phase 117 | Pending |
| LAYOUT-05 | Phase 117 | Pending |
| LAYOUT-06 | Phase 117 | Pending |
| LAYOUT-07 | Phase 117 | Pending |
| LAYOUT-08 | Phase 117 | Pending |
| TMPL-01 | Phase 118 | Pending |
| TMPL-02 | Phase 118 | Pending |
| TMPL-03 | Phase 118 | Pending |
| TMPL-04 | Phase 118 | Pending |
| TMPL-05 | Phase 118 | Pending |
| TMPL-06 | Phase 118 | Pending |
| TMPL-07 | Phase 118 | Pending |
| TMPL-08 | Phase 118 | Pending |
| SCHED-01 | Phase 118 | Pending |
| SCHED-02 | Phase 118 | Pending |
| SCHED-03 | Phase 118 | Pending |
| SCHED-04 | Phase 118 | Pending |
| SCHED-05 | Phase 118 | Pending |
| SCHED-06 | Phase 118 | Pending |
| CAMP-01 | Phase 118 | Pending |
| CAMP-02 | Phase 118 | Pending |
| CAMP-03 | Phase 118 | Pending |
| CAMP-04 | Phase 118 | Pending |
| CAMP-05 | Phase 118 | Pending |
| CAMP-06 | Phase 118 | Pending |
| CAMP-07 | Phase 118 | Pending |
| CAMP-08 | Phase 118 | Pending |
| CAMP-09 | Phase 118 | Pending |
| SCRN-01 | Phase 119 | Pending |
| SCRN-02 | Phase 119 | Pending |
| SCRN-03 | Phase 119 | Pending |
| SCRN-04 | Phase 119 | Pending |
| SCRN-05 | Phase 119 | Pending |
| SCRN-06 | Phase 119 | Pending |
| SCRN-07 | Phase 119 | Pending |
| SCRN-08 | Phase 119 | Pending |
| SCRN-09 | Phase 119 | Pending |
| SCRN-10 | Phase 119 | Pending |
| SCRN-11 | Phase 119 | Pending |
| DATA-01 | Phase 120 | Pending |
| DATA-02 | Phase 120 | Pending |
| DATA-03 | Phase 120 | Pending |
| DATA-04 | Phase 120 | Pending |
| DATA-05 | Phase 120 | Pending |
| APP-01 | Phase 120 | Pending |
| APP-02 | Phase 120 | Pending |
| APP-03 | Phase 120 | Pending |
| APP-04 | Phase 120 | Pending |
| APP-05 | Phase 120 | Pending |
| APP-06 | Phase 120 | Pending |
| APP-07 | Phase 120 | Pending |
| APP-08 | Phase 120 | Pending |
| MOD-01 | Phase 120 | Pending |
| MOD-02 | Phase 120 | Pending |
| MOD-03 | Phase 120 | Pending |
| MOD-04 | Phase 120 | Pending |
| MOD-05 | Phase 120 | Pending |
| ANLYT-01 | Phase 121 | Pending |
| ANLYT-02 | Phase 121 | Pending |
| ANLYT-03 | Phase 121 | Pending |
| ANLYT-04 | Phase 121 | Pending |
| ANLYT-05 | Phase 121 | Pending |
| ANLYT-06 | Phase 121 | Pending |
| ANLYT-07 | Phase 121 | Pending |
| ANLYT-08 | Phase 121 | Pending |
| SET-01 | Phase 121 | Pending |
| SET-02 | Phase 121 | Pending |
| SET-03 | Phase 121 | Pending |
| SET-04 | Phase 121 | Pending |
| SET-05 | Phase 121 | Pending |
| SET-06 | Phase 121 | Pending |
| SET-07 | Phase 121 | Pending |
| ADMIN-01 | Phase 121 | Pending |
| ADMIN-02 | Phase 121 | Pending |
| ADMIN-03 | Phase 121 | Pending |
| ADMIN-04 | Phase 121 | Pending |
| ADMIN-05 | Phase 121 | Pending |
| ADMIN-06 | Phase 121 | Pending |
| ADMIN-07 | Phase 121 | Pending |
| ADMIN-08 | Phase 121 | Pending |
| RESP-01 | Phase 122 | Pending |
| RESP-02 | Phase 122 | Pending |
| RESP-03 | Phase 122 | Pending |
| RESP-04 | Phase 122 | Pending |
| RESP-05 | Phase 122 | Pending |
| RESP-06 | Phase 122 | Pending |
| RESP-07 | Phase 122 | Pending |
| RESP-08 | Phase 122 | Pending |
| EDGE-01 | Phase 122 | Pending |
| EDGE-02 | Phase 122 | Pending |
| EDGE-03 | Phase 122 | Pending |
| EDGE-04 | Phase 122 | Pending |
| EDGE-05 | Phase 122 | Pending |
| EDGE-06 | Phase 122 | Pending |
| EDGE-07 | Phase 122 | Pending |
| EDGE-08 | Phase 122 | Pending |
| RESIL-01 | Phase 123 | Pending |
| RESIL-02 | Phase 123 | Pending |
| RESIL-03 | Phase 123 | Pending |
| UX-01 | Phase 123 | Pending |
| UX-02 | Phase 123 | Pending |
| UX-03 | Phase 123 | Pending |
| CI-01 | Phase 124 | Pending |
| CI-02 | Phase 124 | Pending |
| CI-03 | Phase 124 | Pending |

**Coverage:**
- v13.0 requirements: 148 total
- Mapped to phases: 148
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation -- all 148 requirements mapped to phases 115-124*
