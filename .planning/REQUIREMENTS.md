# Requirements: BizScreen v8.0 Comprehensive E2E

**Defined:** 2026-02-27
**Core Value:** Every user-facing feature is covered by Playwright tests with screenshot evidence at every step, across all roles and screen sizes.

## v8.0 Requirements

Requirements for comprehensive Playwright E2E test suite. Each maps to roadmap phases.

### Test Infrastructure

- [ ] **INFRA-01**: Screenshot directory structure created (screenshots/{area}/) with automatic cleanup between runs
- [ ] **INFRA-02**: Playwright config updated for auto-screenshots at every test step (not just on failure)
- [ ] **INFRA-03**: Responsive viewport helpers defined (mobile 375x667, tablet 768x1024, desktop 1440x900)
- [ ] **INFRA-04**: CI workflow updated to upload screenshot artifacts alongside HTML report
- [ ] **INFRA-05**: Screenshot naming convention enforced ({area}-{step}-{viewport}.png)
- [ ] **INFRA-06**: Test helper for screenshot-at-every-step pattern (reusable across all spec files)

### Authentication & Onboarding

- [ ] **AUTH-01**: Login flow tested with valid credentials, screenshot of login page and dashboard after login
- [ ] **AUTH-02**: Login with invalid credentials tested, screenshot of error state
- [ ] **AUTH-03**: Login with empty fields tested, screenshot of validation errors
- [ ] **AUTH-04**: Signup flow tested with valid data, screenshot of each step
- [ ] **AUTH-05**: Signup validation tested (weak password, invalid email, existing email)
- [ ] **AUTH-06**: Password reset request tested, screenshot of reset form and confirmation
- [ ] **AUTH-07**: Password update flow tested, screenshot of update form and success
- [ ] **AUTH-08**: Invite accept flow tested, screenshot of invite page and completion
- [ ] **AUTH-09**: Session persistence tested (refresh browser, still authenticated)
- [ ] **AUTH-10**: Onboarding wizard tested end-to-end (welcome → industry → starter pack → pairing → success)
- [ ] **AUTH-11**: Industry selection modal tested with different selections
- [ ] **AUTH-12**: Screen pairing during onboarding tested (QR code display, OTP fallback)

### Dashboard

- [ ] **DASH-01**: Dashboard loads with all widgets visible, screenshot of full page
- [ ] **DASH-02**: Quick action buttons tested (create content, add screen, etc.)
- [ ] **DASH-03**: Dashboard navigation to all sidebar sections tested with screenshots
- [ ] **DASH-04**: Dashboard empty state tested (new tenant with no content)
- [ ] **DASH-05**: Dashboard health indicators and activity timeline verified

### Media Library

- [ ] **MEDIA-01**: Media library page loads with grid view, screenshot
- [ ] **MEDIA-02**: File upload tested (image), screenshot of upload progress and result
- [ ] **MEDIA-03**: Media preview popover tested, screenshot of preview
- [ ] **MEDIA-04**: Media rename tested, screenshot of rename dialog and result
- [ ] **MEDIA-05**: Media delete tested, screenshot of confirmation dialog and result
- [ ] **MEDIA-06**: Bulk select and bulk delete tested, screenshot of selection state
- [ ] **MEDIA-07**: Search and filter tested, screenshot of filtered results
- [ ] **MEDIA-08**: Empty media library state tested, screenshot
- [ ] **MEDIA-09**: Storage usage bar verified, screenshot
- [ ] **MEDIA-10**: Media upload validation tested (unsupported format, size limit)

### Scenes & SVG Editor

- [ ] **SCENE-01**: Scenes list page loads, screenshot
- [ ] **SCENE-02**: Create scene via modal tested, screenshot of modal and new scene
- [ ] **SCENE-03**: Scene delete tested with confirmation dialog, screenshot
- [ ] **SCENE-04**: Scene duplicate tested, screenshot of duplicated scene
- [ ] **SCENE-05**: SVG editor loads with canvas and toolbars, screenshot
- [ ] **SCENE-06**: SVG editor add text element tested, screenshot
- [ ] **SCENE-07**: SVG editor add rectangle/shape tested, screenshot
- [ ] **SCENE-08**: SVG editor properties panel tested (fill, stroke, opacity), screenshot
- [ ] **SCENE-09**: SVG editor effects panel tested, screenshot
- [ ] **SCENE-10**: SVG editor animate panel tested, screenshot
- [ ] **SCENE-11**: SVG editor position panel tested, screenshot
- [ ] **SCENE-12**: SVG editor layers panel tested, screenshot
- [ ] **SCENE-13**: SVG editor context menu tested (right-click), screenshot
- [ ] **SCENE-14**: SVG editor cloud panel tested (import sources), screenshot
- [ ] **SCENE-15**: AI Designer panel tested (open, generate), screenshot
- [ ] **SCENE-16**: Scene editor language switcher tested, screenshot
- [ ] **SCENE-17**: Scene save and undo/redo tested, screenshot

### Playlists

- [ ] **PLAY-01**: Playlists page loads (list view), screenshot
- [ ] **PLAY-02**: Create playlist tested, screenshot of create flow and result
- [ ] **PLAY-03**: Add items to playlist tested, screenshot of item list
- [ ] **PLAY-04**: Reorder playlist items tested (drag-and-drop), screenshot
- [ ] **PLAY-05**: Playlist transition settings tested, screenshot
- [ ] **PLAY-06**: Delete playlist tested with confirmation, screenshot
- [ ] **PLAY-07**: Empty playlists page tested, screenshot
- [ ] **PLAY-08**: Playlist detail page tested, screenshot

### Layouts & Widget Types

- [ ] **LAYOUT-01**: Layouts page loads, screenshot
- [ ] **LAYOUT-02**: Create layout tested via modal, screenshot
- [ ] **LAYOUT-03**: Layout editor loads with zones, screenshot
- [ ] **LAYOUT-04**: Layout zone widget type switching tested for all 12 types, screenshot each
- [ ] **LAYOUT-05**: Layout editor featured/search filter tested, screenshot
- [ ] **LAYOUT-06**: Layout hover preview tested, screenshot
- [ ] **LAYOUT-07**: Layout delete tested, screenshot
- [ ] **LAYOUT-08**: Empty layouts page tested, screenshot

### Templates Marketplace

- [ ] **TMPL-01**: Templates marketplace page loads with grid, screenshot
- [ ] **TMPL-02**: Template search tested (debounced), screenshot of results
- [ ] **TMPL-03**: Template hover preview tested (cardLift animation), screenshot
- [ ] **TMPL-04**: Template one-click apply flow tested, screenshot of editor with template
- [ ] **TMPL-05**: Template customization (brand colors, logo, text) tested, screenshot
- [ ] **TMPL-06**: Template favorites toggle tested, screenshot
- [ ] **TMPL-07**: Starter packs browse and apply tested, screenshot
- [ ] **TMPL-08**: "Your Designs" tab tested (empty state and with designs), screenshot

### Schedules & Dayparting

- [ ] **SCHED-01**: Schedules page loads, screenshot
- [ ] **SCHED-02**: Create schedule tested with time/day rules, screenshot of editor
- [ ] **SCHED-03**: Schedule conflict detection tested, screenshot of warning
- [ ] **SCHED-04**: Dayparting presets tested, screenshot
- [ ] **SCHED-05**: Schedule delete tested, screenshot
- [ ] **SCHED-06**: Empty schedules page tested, screenshot

### Campaigns

- [ ] **CAMP-01**: Campaigns page loads, screenshot
- [ ] **CAMP-02**: Create campaign tested, screenshot of form and result
- [ ] **CAMP-03**: Campaign priority scheduling tested, screenshot
- [ ] **CAMP-04**: Campaign rotation controls tested, screenshot
- [ ] **CAMP-05**: Seasonal date picker tested, screenshot
- [ ] **CAMP-06**: Campaign analytics card tested, screenshot
- [ ] **CAMP-07**: Campaign template picker tested, screenshot
- [ ] **CAMP-08**: Campaign delete tested, screenshot
- [ ] **CAMP-09**: Emergency content override tested, screenshot

### Screens & Device Management

- [ ] **SCRN-01**: Screens list page loads with device cards, screenshot
- [ ] **SCRN-02**: Screen pairing flow tested (QR code, OTP), screenshot
- [ ] **SCRN-03**: Screen group management tested (create group, add tags), screenshot
- [ ] **SCRN-04**: Screen group detail page tested, screenshot
- [ ] **SCRN-05**: Screen diagnostics page tested (device health, telemetry), screenshot
- [ ] **SCRN-06**: Remote commands tested (reboot, reload, clear cache buttons), screenshot
- [ ] **SCRN-07**: Screenshot capture (on-demand) tested, screenshot
- [ ] **SCRN-08**: Player status badges verified across states, screenshot
- [ ] **SCRN-09**: Screen footer cards verified, screenshot
- [ ] **SCRN-10**: Bulk operations tested (delete, tag, assign), screenshot
- [ ] **SCRN-11**: Empty screens page tested, screenshot

### Data Sources & Feeds

- [ ] **DATA-01**: Data sources page loads, screenshot
- [ ] **DATA-02**: Create data source modal tested (Google Sheets/CSV/RSS), screenshot
- [ ] **DATA-03**: Data source configuration tested, screenshot
- [ ] **DATA-04**: Data source delete tested, screenshot
- [ ] **DATA-05**: Empty data sources page tested, screenshot

### Apps & Menu Boards

- [ ] **APP-01**: Apps page loads with app list, screenshot
- [ ] **APP-02**: App detail modal tested, screenshot
- [ ] **APP-03**: App config editing tested (pre-populated modal), screenshot
- [ ] **APP-04**: Menu boards page loads, screenshot
- [ ] **APP-05**: Menu board create/edit tested, screenshot
- [ ] **APP-06**: Menu board item drag-and-drop reorder tested, screenshot
- [ ] **APP-07**: Menu board dietary tags and currency tested, screenshot
- [ ] **APP-08**: Empty menu boards page tested, screenshot

### Content Moderation

- [ ] **MOD-01**: Content moderation queue loads, screenshot
- [ ] **MOD-02**: Approve content tested, screenshot of before/after
- [ ] **MOD-03**: Reject content tested, screenshot of before/after
- [ ] **MOD-04**: Review inbox page tested, screenshot
- [ ] **MOD-05**: Empty moderation queue tested, screenshot

### Analytics & Alerts

- [ ] **ANLYT-01**: Analytics dashboard loads with charts, screenshot
- [ ] **ANLYT-02**: Content performance page tested, screenshot
- [ ] **ANLYT-03**: Activity log page tested with entries, screenshot
- [ ] **ANLYT-04**: Alerts center page tested, screenshot
- [ ] **ANLYT-05**: Alert detail modal tested, screenshot
- [ ] **ANLYT-06**: Notification settings page tested (toggles), screenshot
- [ ] **ANLYT-07**: Usage dashboard page tested, screenshot
- [ ] **ANLYT-08**: Notification bell tested (in-app alerts), screenshot

### Settings

- [ ] **SET-01**: Billing settings page tested, screenshot
- [ ] **SET-02**: Branding/theme settings tested (preview card), screenshot
- [ ] **SET-03**: Security settings tested (password policies, session config), screenshot
- [ ] **SET-04**: Team management page tested, screenshot
- [ ] **SET-05**: White-label settings tested, screenshot
- [ ] **SET-06**: Developer settings page tested (API keys), screenshot
- [ ] **SET-07**: Feature flags debug page tested, screenshot

### Admin & Reseller

- [ ] **ADMIN-01**: Admin dashboard loads (superadmin role), screenshot
- [ ] **ADMIN-02**: Tenant management page tested, screenshot
- [ ] **ADMIN-03**: Tenant detail page tested, screenshot
- [ ] **ADMIN-04**: Audit log table tested with filters, screenshot
- [ ] **ADMIN-05**: Reseller dashboard tested (admin role), screenshot
- [ ] **ADMIN-06**: Reseller billing page tested, screenshot
- [ ] **ADMIN-07**: Help center page tested, screenshot
- [ ] **ADMIN-08**: Feature flags management page tested, screenshot

### Responsive & Cross-Role

- [ ] **RESP-01**: Dashboard tested at mobile viewport (375px), screenshot
- [ ] **RESP-02**: Dashboard tested at tablet viewport (768px), screenshot
- [ ] **RESP-03**: Media library tested at mobile viewport, screenshot
- [ ] **RESP-04**: Navigation sidebar tested at mobile (hamburger menu), screenshot
- [ ] **RESP-05**: Key forms tested at mobile viewport (login, create content), screenshot
- [ ] **RESP-06**: Client role permissions verified (cannot access admin pages), screenshot
- [ ] **RESP-07**: Admin role permissions verified (can access admin, not superadmin), screenshot
- [ ] **RESP-08**: Superadmin role tested (full access), screenshot

### Edge Cases & Error States

- [ ] **EDGE-01**: All list pages tested with empty state, screenshot of each
- [ ] **EDGE-02**: Form validation errors tested on all create/edit forms, screenshot of each
- [ ] **EDGE-03**: 404 page tested for invalid routes, screenshot
- [ ] **EDGE-04**: Unauthorized access redirect tested, screenshot
- [ ] **EDGE-05**: Network error banner tested, screenshot
- [ ] **EDGE-06**: Modal dismiss tested (ESC key, backdrop click, X button), screenshot
- [ ] **EDGE-07**: Feedback widget tested, screenshot
- [ ] **EDGE-08**: Announcement banner/center tested, screenshot

## v9.0 Requirements

Deferred to future release. Not in current roadmap.

### Visual Regression

- **VREG-01**: Pixel-diff comparison against baseline screenshots
- **VREG-02**: Automated visual regression in CI pipeline
- **VREG-03**: Threshold-based pass/fail for visual differences

### Performance Testing

- **PERF-01**: Page load time benchmarks per route
- **PERF-02**: Largest Contentful Paint tracking
- **PERF-03**: Bundle size regression testing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Visual regression diffing | High complexity, separate tooling needed (Chromatic, Percy) |
| Performance benchmarking | Different tool chain (Lighthouse CI), not Playwright's strength |
| Player device testing | Player runs on Tizen/WebOS — not testable via Playwright |
| Real API integration tests | Tests use dev bypass auth, not real Supabase calls |
| Load/stress testing | Not Playwright's purpose — use k6 or Artillery |
| Cross-browser (Firefox/Safari) | Chromium covers 90%+ of signage use cases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmapper) | | |

**Coverage:**
- v8.0 requirements: 120 total
- Mapped to phases: 0
- Unmapped: 120

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after initial definition*
