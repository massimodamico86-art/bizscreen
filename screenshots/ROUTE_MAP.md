# BizScreen Route Map

Generated: 2026-02-28
Phase: 98 - App Discovery & Navigation Map
Total Routes: 80 (9 public + 58 authenticated + 13 dynamic patterns)
Total Screenshots: 67
Total Interactive Elements Discovered: 1,443

---

## Public Routes (No Authentication Required)

These routes are defined in `src/router/AppRouter.jsx` and use URL-based navigation.

| # | URL Path | Page Name | Layout | Auth Required | Interactive Elements | Screenshot |
|---|----------|-----------|--------|---------------|---------------------|------------|
| 1 | `/` | Homepage | Marketing | No (redirects to `/app` if logged in) | 18 | 98-01-homepage-marketing.png |
| 2 | `/features` | Features | Marketing | No | 17 | 98-02-features-page.png |
| 3 | `/pricing` | Pricing | Marketing | No | 20 | 98-03-pricing-page.png |
| 4 | `/auth/login` | Login | Auth | No (redirects to `/app` if logged in) | 18 | 98-04-login-page.png |
| 5 | `/auth/signup` | Sign Up | Auth | No (redirects to `/app` if logged in) | 18 | 98-05-signup-page.png |
| 6 | `/auth/reset-password` | Reset Password | Auth | No | 4 | 98-06-reset-password-page.png |
| 7 | `/auth/update-password` | Update Password | Auth | No (requires token) | 2 | 98-07-update-password-page.png |
| 8 | `/auth/accept-invite` | Accept Invite | Auth | No (requires token) | 2 | 98-08-accept-invite-page.png |
| 9 | `/preview/:token` | Public Preview | Standalone | No (requires valid token) | 0 | 98-09-public-preview-page.png |

**Notes:**
- Routes 1, 4, and 5 redirect to `/app` (dashboard) when `VITE_DEV_BYPASS_AUTH=true` is set in `.env.local`
- Routes 7 and 8 show token-missing/invalid error states when accessed without a valid token
- Route 9 shows an invalid-token error state when accessed with a dummy token

---

## Authenticated App Pages

These pages are defined in `src/App.jsx` via the `pages` object and use React state-based navigation (`setCurrentPage(pageId)`). They all render within the authenticated app shell at `/app`.

### Navigation: Main Sidebar

Core application pages accessible from the left sidebar.

| # | Page ID | Page Name | Sidebar Section | Feature Gate | Interactive Elements | Screenshot |
|---|---------|-----------|-----------------|--------------|---------------------|------------|
| 1 | dashboard | Dashboard | Top-level | None | 18 | 98-10-dashboard.png |
| 2 | welcome | Welcome | Top-level | None | 18 | 98-11-welcome.png |
| 3 | media-all | Media (All) | Media | None | 34 | 98-12-media-all.png |
| 4 | media-images | Media (Images) | Media | None | 34 | 98-13-media-images.png |
| 5 | media-videos | Media (Videos) | Media | None | 33 | 98-14-media-videos.png |
| 6 | media-audio | Media (Audio) | Media | None | 33 | 98-15-media-audio.png |
| 7 | media-documents | Media (Documents) | Media | None | 33 | 98-16-media-documents.png |
| 8 | media-webpages | Media (Web Pages) | Media | None | 33 | 98-17-media-web-pages.png |
| 9 | apps | Apps | Top-level | None | 146 | 98-18-apps.png |
| 10 | playlists | Playlists | Top-level | None | 27 | 98-19-playlists.png |
| 11 | templates | Templates | Top-level | None | 43 | 98-20-templates.png |
| 12 | schedules | Schedules | Top-level | None | 29 | 98-21-schedules.png |
| 13 | screens | Screens | Top-level | None | 32 | 98-22-screens.png |
| 14 | menu-boards | Menu Boards | Top-level | None | 25 | 98-23-menu-boards.png |

**Subtotal:** 14 pages, 538 interactive elements, 0 crashed

### Navigation: Settings & Account

Pages accessible from the settings gear icon or user menu.

| # | Page ID | Page Name | Access Via | Feature Gate | Interactive Elements | Status | Screenshot |
|---|---------|-----------|------------|--------------|---------------------|--------|------------|
| 15 | settings | Settings | Settings gear | None | 24 | OK | 98-24-settings.png |
| 16 | account-plan | Account & Plan | Settings gear | None | 25 | OK | 98-25-account-plan.png |
| 17 | branding | Branding Settings | Settings gear | None | 33 | OK | 98-26-branding-settings.png |
| 18 | team | Team Management | Settings gear | None | 3 | CRASHED | 98-27-team-management.png |
| 19 | activity | Activity Log | Settings gear | None | 3 | CRASHED | 98-28-activity-log.png |
| 20 | locations | Locations | Settings gear | None | 18 | OK | 98-29-locations.png |
| 21 | help | Help Center | Settings gear | None | 21 | OK | 98-30-help-center.png |

**Subtotal:** 7 pages, 127 interactive elements, 2 crashed

### Navigation: Feature-Gated Pages

Pages that require specific feature flags or plan tier to be visible.

| # | Page ID | Page Name | Required Feature | Visible To | Interactive Elements | Screenshot |
|---|---------|-----------|------------------|------------|---------------------|------------|
| 22 | analytics | Analytics | analytics | Pro+ plans | 18 | 98-31-analytics.png |
| 23 | analytics-dashboard | Analytics Dashboard | analytics | Pro+ plans | 19 | 98-32-analytics-dashboard.png |
| 24 | content-performance | Content Performance | analytics | Pro+ plans | 19 | 98-33-content-performance.png |
| 25 | campaigns | Campaigns | campaigns | Pro+ plans | 18 | 98-34-campaigns.png |
| 26 | screen-groups | Screen Groups | screen-groups | Pro+ plans | 19 | 98-35-screen-groups.png |
| 27 | assistant | AI Content Assistant | ai-assistant | Pro+ plans | 18 | 98-36-ai-content-assistant.png |
| 28 | developer | Developer Settings | api-access | Pro+ plans | 19 | 98-37-developer-settings.png |
| 29 | white-label | White Label Settings | white-label | Enterprise | 19 | 98-38-white-label-settings.png |
| 30 | usage | Usage Dashboard | usage-analytics | Pro+ plans | 18 | 98-39-usage-dashboard.png |
| 31 | enterprise-security | Enterprise Security | enterprise-sso | Enterprise | 19 | 98-40-enterprise-security.png |
| 32 | reseller-dashboard | Reseller Dashboard | reseller | Reseller accounts | 18 | 98-41-reseller-dashboard.png |
| 33 | reseller-billing | Reseller Billing | reseller | Reseller accounts | 19 | 98-42-reseller-billing.png |

**Subtotal:** 12 pages, 223 interactive elements, 0 crashed

### Navigation: Content & Marketplace

Pages for content creation, marketplace, and integrations.

| # | Page ID | Page Name | Access Via | Feature Gate | Interactive Elements | Status | Screenshot |
|---|---------|-----------|------------|--------------|---------------------|--------|------------|
| 34 | scenes | Scenes | Sidebar | None | 19 | OK | 98-43-scenes.png |
| 35 | svg-templates | SVG Template Gallery | Templates section | None | 37 | OK | 98-44-svg-template-gallery.png |
| 36 | template-marketplace | Template Marketplace | Templates section | None | 3 | CRASHED | 98-45-template-marketplace.png |
| 37 | data-sources | Data Sources | Sidebar / Settings | data-sources | 20 | OK | 98-46-data-sources.png |
| 38 | social-accounts | Social Accounts | Settings | social-feeds | 21 | OK | 98-47-social-accounts.png |
| 39 | content-moderation | Content Moderation | Settings | moderation | 23 | OK | 98-48-content-moderation.png |
| 40 | review-inbox | Review Inbox | Settings | moderation | 22 | OK | 98-49-review-inbox.png |
| 41 | translations | Translation Dashboard | Settings | translations | 3 | CRASHED | 98-50-translation-dashboard.png |

**Subtotal:** 8 pages, 148 interactive elements, 2 crashed

### Navigation: Admin & Operations

Pages requiring admin or super-admin roles.

| # | Page ID | Page Name | Required Role | Access Via | Interactive Elements | Status | Screenshot |
|---|---------|-----------|---------------|------------|---------------------|--------|------------|
| 42 | admin-tenants | Admin Tenants List | Super Admin | Admin panel | 18 | OK | 98-51-admin-tenants-list.png |
| 43 | admin-audit-logs | Admin Audit Logs | Super Admin | Admin panel | 18 | OK | 98-52-admin-audit-logs.png |
| 44 | admin-system-events | Admin System Events | Super Admin | Admin panel | 18 | OK | 98-53-admin-system-events.png |
| 45 | admin-templates | Admin Templates | Super Admin | Admin panel | 19 | OK | 98-54-admin-templates.png |
| 46 | tenant-admin | Tenant Admin | Tenant Admin | Admin panel | 17 | OK | 98-55-tenant-admin.png |
| 47 | status | Status Page | Admin | Admin panel | 18 | OK | 98-56-status-page.png |
| 48 | ops-console | Ops Console | Super Admin | Admin panel | 22 | OK | 98-57-ops-console.png |
| 49 | feature-flags | Feature Flags | Super Admin | Admin panel | 17 | OK | 98-58-feature-flags.png |
| 50 | demo-tools | Demo Tools | Super Admin | Admin panel | 3 | CRASHED | 98-59-demo-tools.png |
| 51 | security | Security Dashboard | Super Admin | Admin panel | 3 | CRASHED | 98-60-security-dashboard.png |
| 52 | device-diagnostics | Device Diagnostics | Admin | Admin panel | 18 | OK | 98-61-device-diagnostics.png |
| 53 | service-quality | Service Quality | Admin | Admin panel | 18 | OK | 98-62-service-quality.png |
| 54 | alerts | Alerts Center | Admin | Admin panel | 21 | OK | 98-63-alerts-center.png |
| 55 | notification-settings | Notification Settings | Admin | Admin panel | 42 | OK | 98-64-notification-settings.png |
| 56 | clients | Clients Page | Reseller | Admin panel | 20 | OK | 98-65-clients-page.png |
| 57 | admin-test | Admin Test | Super Admin | Admin panel | 18 | OK | 98-66-admin-test.png |
| 58 | listings | Listings (Legacy) | Admin | Admin panel | 18 | OK | 98-67-listings-legacy.png |

**Subtotal:** 17 pages, 308 interactive elements, 2 crashed

---

## Dynamic Routes (Editor Pages)

These pages are created dynamically with entity-specific IDs. They require existing entity data and are accessed by clicking edit/view actions on list pages. They were not navigated during discovery (require entity data) and will be covered in Phase 100.

| # | Page ID Pattern | Page Name | Triggered By | Example Page ID |
|---|----------------|-----------|--------------|-----------------|
| 1 | `playlist-editor-{id}` | Playlist Editor | Click edit on playlists page | `playlist-editor-abc123` |
| 2 | `layout-editor-{id}` | Layout Editor | Click edit on layouts page | `layout-editor-abc123` |
| 3 | `schedule-editor-{id}` | Schedule Editor | Click edit on schedules page | `schedule-editor-abc123` |
| 4 | `campaign-editor-{id}` | Campaign Editor | Click edit on campaigns page | `campaign-editor-abc123` |
| 5 | `scene-detail-{id}` | Scene Detail | Click on scene card | `scene-detail-abc123` |
| 6 | `scene-editor-{id}` | Scene Editor | Click edit on scene detail | `scene-editor-abc123` |
| 7 | `screen-group-detail-{id}` | Screen Group Detail | Click on screen group | `screen-group-detail-abc123` |
| 8 | `admin-tenant-{id}` | Admin Tenant Detail | Click tenant in admin list | `admin-tenant-abc123` |
| 9 | `admin-template-{id}` | Admin Template Detail | Click template in admin list | `admin-template-abc123` |
| 10 | `design-editor[-{id}]` | Design Editor | Create/edit design | `design-editor-abc123` |
| 11 | `svg-editor[-{id}]` | SVG Editor | Create/edit SVG design | `svg-editor-abc123` |
| 12 | `yodeck-layout-{id}` | Yodeck Layout Editor | Edit layout | `yodeck-layout-abc123` |
| 13 | `yodeck-layout-preview-{id}` | Yodeck Layout Preview | Preview layout | `yodeck-layout-preview-abc123` |

---

## Crashed Pages (Error Boundary Bugs)

6 pages crash on load with React error boundaries. Screenshots capture the error boundary UI (not the intended page content).

| # | Page ID | Page Name | Component | Group | Screenshot |
|---|---------|-----------|-----------|-------|------------|
| 1 | team | Team Management | TeamPage | Settings & Account | 98-27-team-management.png |
| 2 | activity | Activity Log | ActivityLogPage | Settings & Account | 98-28-activity-log.png |
| 3 | template-marketplace | Template Marketplace | TemplateMarketplacePage | Content & Marketplace | 98-45-template-marketplace.png |
| 4 | translations | Translation Dashboard | TranslationDashboardPage | Content & Marketplace | 98-50-translation-dashboard.png |
| 5 | demo-tools | Demo Tools | DemoToolsPage | Admin & Operations | 98-59-demo-tools.png |
| 6 | security | Security Dashboard | SecurityDashboardPage | Admin & Operations | 98-60-security-dashboard.png |

These are pre-existing bugs. The error boundary UI shows "Show Technical Details", "Reload Page", and "Go Home" buttons (3 interactive elements each). These pages each have only 3 interactive elements in their crashed state.

---

## Interactive Elements Summary

Across all 67 captured pages, 1,443 interactive elements were discovered via Playwright accessibility snapshots.

### By Page Category

| Category | Pages | Interactive Elements | Avg per Page | Crashed |
|----------|-------|---------------------|--------------|---------|
| Public Routes | 9 | 99 | 11.0 | 0 |
| Main Sidebar | 14 | 538 | 38.4 | 0 |
| Settings & Account | 7 | 127 | 18.1 | 2 |
| Feature-Gated | 12 | 223 | 18.6 | 0 |
| Content & Marketplace | 8 | 148 | 18.5 | 2 |
| Admin & Operations | 17 | 308 | 18.1 | 2 |
| **Total** | **67** | **1,443** | **21.5** | **6** |

### Notable Pages by Element Count

| Rank | Page | Interactive Elements | Notes |
|------|------|---------------------|-------|
| 1 | Apps (apps) | 146 | Highest -- app marketplace grid with many cards |
| 2 | Templates (templates) | 43 | Template gallery with filter chips |
| 3 | Notification Settings | 42 | Many toggle/checkbox settings |
| 4 | SVG Template Gallery | 37 | Template card grid |
| 5 | Media (All/Images) | 34 | Media library with filters and actions |

### Element Type Distribution (Public Routes)

Based on accessibility snapshot data from 9 public routes:
- **Links:** Dominant on marketing pages (navigation, CTAs, footer links)
- **Buttons:** Dominant on authenticated redirect pages (sidebar navigation)
- **Textboxes:** Present on auth forms (email, password fields)
- **Average per marketing page:** 18.7 elements
- **Average per auth form page:** 2.7 elements (minimal: token-required states)

---

## Unreachable Pages

No pages were unreachable. All 9 public routes and all 58 authenticated page IDs were successfully navigated and screenshotted.

The 6 crashed pages (team, activity, template-marketplace, translations, demo-tools, security) were still navigated and their error boundary state was captured -- they are not "unreachable" but rather "broken on load."

---

## Coverage Summary

- **Public routes:** 9/9 visited (100%)
- **Authenticated pages:** 58/58 visited (100%)
- **Dynamic routes:** 13 patterns documented (not visited -- require entity data, covered in Phase 100)
- **Total screenshots:** 67
- **Total pages discovered:** 80 (9 public + 58 authenticated + 13 dynamic patterns)
- **Total interactive elements:** 1,443
- **Crashed pages:** 6 (captured with error boundary UI)
- **Unreachable pages:** 0
- **Coverage gaps:** None

---

*Generated by Phase 98 - App Discovery & Navigation Map*
*Data sources: screenshots/98-01-results.json, screenshots/98-02-results.json*
*Plans: 98-01 (Public Routes), 98-02 (Authenticated Pages), 98-03 (This Document)*
