# BizScreen QA Walkthrough Bug Report

**Date:** 2026-03-05 (updated)
**Method:** MCP Playwright interactive walkthrough (task 54), supersedes scripted walkthrough (task 49)
**Environment:** localhost:5173 (dev mode, no Supabase backend)
**Browser:** Chromium (Playwright MCP)
**Viewport:** 1280x720

## Summary

- **Pages visited:** 36+ (interactive MCP browser navigation)
- **Pages loaded OK:** All visited pages rendered without crashes
- **Page crashes (error boundaries):** 0
- **Bugs total:** 14
- **Bugs resolved:** 4 (BUG-01, BUG-05, BUG-07, BUG-08)
- **Bugs open:** 10 (BUG-02, BUG-03, BUG-04, BUG-06, BUG-09 through BUG-14)

---

## Resolved Issues

### [RESOLVED] BUG-01: Service Quality page renders broken layout
- **Page:** `service-quality`
- **Screenshot:** `screenshots/qa/qa2-20-service-quality.png`
- **Resolution:** Fixed in quick task 50. Page now renders proper stat cards with labels, data, and card structure.
- **Verified:** 2026-03-05 via MCP interactive walkthrough

### [RESOLVED] BUG-05: Templates/Layouts page has different brand colors (teal/green)
- **Page:** `layouts`, `templates`
- **Screenshots:** `screenshots/qa/qa2-01-features.png`, `screenshots/qa/qa2-02-pricing.png`, `screenshots/qa/qa2-10-templates.png`
- **Resolution:** Fixed in quick task 51. Templates/Layouts pages now use consistent orange/blue brand palette matching the rest of the app.
- **Verified:** 2026-03-05 via MCP interactive walkthrough

### [RESOLVED] BUG-07: Error toast persists across page navigation
- **Page:** Multiple
- **Resolution:** Fixed in quick task 52. Toasts are now dismissed when navigating between pages.
- **Verified:** 2026-03-05 via MCP interactive walkthrough - navigated between multiple pages, no stale toasts observed

### [RESOLVED] BUG-08: Welcome and Dashboard pages render identically
- **Page:** `welcome` vs `dashboard`
- **Screenshots:** `screenshots/qa/qa2-03-welcome.png`, `screenshots/qa/qa2-04-dashboard.png`
- **Resolution:** Fixed in quick task 53. Welcome page now has a distinct onboarding experience with setup wizard, different from the Dashboard stats view.
- **Verified:** 2026-03-05 via MCP interactive walkthrough

---

## Open Issues

### BUG-02: Homepage (`/`) inaccessible when authenticated
- **Page:** `/` (marketing homepage)
- **Screenshot:** `screenshots/qa/qa2-04-dashboard.png` (redirected to /app)
- **Description:** Navigating to `/` always redirects to `/app` when dev auth bypass is active. The marketing homepage is never viewable for authenticated users. Features (`/features`) and Pricing (`/pricing`) pages remain accessible, creating inconsistency.
- **Severity:** Medium

### BUG-03: Auth pages inaccessible when authenticated
- **Page:** `/auth/login`, `/auth/signup`
- **Description:** Login and signup pages redirect to `/app` when dev auth bypass is on. Reset-password, update-password, and accept-invite pages do NOT redirect, creating inconsistent behavior.
- **Severity:** Low (dev-mode only)

---

## Visual/UX Issues (Open)

### BUG-04: Media "Audio" page heading says "Audios"
- **Page:** `media-audio`
- **Screenshot:** `screenshots/qa/qa2-09-media-audio.png`
- **Description:** The heading reads "Audios" which is grammatically awkward. Should be "Audio" or "Audio Files" to match sidebar label "Audio".
- **Severity:** Low

### BUG-06: Schedules page shows "Add Schedule" button twice
- **Page:** `schedules`
- **Screenshot:** `screenshots/qa/qa2-11-schedules.png`
- **Description:** Two "Add Schedule" buttons visible: one in the top-right corner and another below the error state card. The bottom one also has an "Actions" button. When error state is showing, only one button should be visible.
- **Severity:** Low
- **Status:** Confirmed still present in MCP walkthrough

### BUG-09: Listings and Locations pages render identically
- **Page:** `listings` vs `locations`
- **Description:** Both page IDs render the same "Locations" heading. The `listings` page ID appears to be a legacy alias that wasn't removed.
- **Severity:** Low

### BUG-10: Template Marketplace page has no heading
- **Page:** `template-marketplace`
- **Description:** The Template Marketplace page has no h1 heading. Shows search bar, filters, and "0 templates found" without a proper title.
- **Severity:** Low

### BUG-11: Multiple pages show "Access Denied" without navigation back
- **Page:** `admin-test`, `admin-tenants`, `admin-audit-logs`, `admin-system-events`, `tenant-admin`
- **Screenshot:** `screenshots/qa/qa2-25-admin-tenants.png`
- **Description:** Admin pages show "Access Denied" with no button or link to navigate back. Should include a "Go to Dashboard" or "Go Back" button.
- **Severity:** Low

### BUG-12: Playlists page button naming inconsistency
- **Page:** `playlists`
- **Screenshot:** `screenshots/qa/qa2-08-playlists.png`
- **Description:** The Playlists page uses "Add Playlist" while other pages use different verbs. Naming should be consistent across all list pages.
- **Severity:** Low (naming inconsistency)

### BUG-13: Menu Boards page has duplicate create buttons
- **Page:** `menu-boards`
- **Screenshot:** `screenshots/qa/qa2-14-menu-boards.png`
- **Description:** Menu Boards page shows both a "+ New Menu Board" button in the header AND a "+ Create Menu Board" button in the empty state card with different wording ("New" vs "Create").
- **Severity:** Low
- **Status:** Confirmed still present in MCP walkthrough

### BUG-14: Proof of Play "Export CSV" button appears disabled with no explanation
- **Page:** `proof-of-play`
- **Screenshot:** `screenshots/qa/qa2-36-proof-of-play.png`
- **Description:** "Export CSV" button appears grayed out when there's no data. No tooltip explains why it's disabled.
- **Severity:** Low

---

## Console Errors (Expected - No Backend)

All pages generate `ERR_CONNECTION_REFUSED` errors to `127.0.0.1:54321` (Supabase). These are expected in dev mode without a running Supabase instance.

| Category | Notes |
|----------|-------|
| Supabase connection refused | Expected - no backend running |
| WebSocket connection failed | Real-time subscriptions failing |
| Feature flag service errors | Can't load feature flags from DB |
| EmergencyService errors | Can't check emergency state |

No unexpected JS errors or crashes observed during the walkthrough.

---

## Screenshots Reference

All screenshots from this MCP interactive walkthrough saved to `screenshots/qa/` with naming convention `qa2-{NN}-{description}.png` (36 screenshots total).

### Screenshot Index
| # | File | Page |
|---|------|------|
| 01 | qa2-01-features.png | Features page |
| 02 | qa2-02-pricing.png | Pricing page |
| 03 | qa2-03-welcome.png | Welcome page |
| 04 | qa2-04-dashboard.png | Dashboard |
| 05 | qa2-05-media-all.png | Media - All |
| 06 | qa2-06-media-images.png | Media - Images |
| 07 | qa2-07-media-videos.png | Media - Videos |
| 08 | qa2-08-playlists.png | Playlists |
| 09 | qa2-09-media-audio.png | Media - Audio |
| 10 | qa2-10-templates.png | Templates |
| 11 | qa2-11-schedules.png | Schedules |
| 12 | qa2-12-screens.png | Screens |
| 13 | qa2-13-apps.png | Apps |
| 14 | qa2-14-menu-boards.png | Menu Boards |
| 15 | qa2-15-scenes.png | Scenes |
| 16 | qa2-16-campaigns.png | Campaigns |
| 17 | qa2-17-screen-groups.png | Screen Groups |
| 18 | qa2-18-data-sources.png | Data Sources |
| 19 | qa2-19-analytics.png | Analytics |
| 20 | qa2-20-service-quality.png | Service Quality |
| 21 | qa2-21-content-performance.png | Content Performance |
| 22 | qa2-22-analytics-dashboard.png | Analytics Dashboard |
| 23 | qa2-23-settings.png | Settings |
| 24 | qa2-24-branding.png | Branding |
| 25 | qa2-25-admin-tenants.png | Admin Tenants |
| 26 | qa2-26-admin-audit-logs.png | Admin Audit Logs |
| 27 | qa2-27-alerts.png | Alerts Center |
| 28 | qa2-28-locations.png | Locations |
| 29 | qa2-29-team-management.png | Team Management |
| 30 | qa2-30-ai-assistant.png | AI Content Assistant |
| 31 | qa2-31-feature-flags.png | Feature Flags |
| 32 | qa2-32-developer-settings.png | Developer Settings |
| 33 | qa2-33-white-label.png | White Label |
| 34 | qa2-34-usage-dashboard.png | Usage Dashboard |
| 35 | qa2-35-video-walls.png | Video Walls |
| 36 | qa2-36-proof-of-play.png | Proof of Play |
