# BizScreen QA Walkthrough Bug Report

**Date:** 2026-03-05
**Environment:** localhost:5173 (dev mode, no Supabase backend)
**Browser:** Chromium (Playwright)
**Viewport:** 1440x900

## Summary

- **Pages visited:** 73 (8 public + 61 app + 4 modal interactions)
- **Pages loaded OK:** 69
- **Pages redirected:** 2 (auth pages redirect due to dev auth bypass)
- **Page crashes (error boundaries):** 0
- **Visual/UX bugs found:** 14

---

## Critical Issues

### BUG-01: Service Quality page renders broken layout
- **Page:** `service-quality`
- **Screenshot:** `qa-49-service-quality.png`
- **Description:** Page shows a full-width dark/black progress bar and 4 rows with only grid icons (no labels, no data, no card structure). The page appears to have a rendering issue where component content is not loading/displaying properly. All stat cards are missing their text content.
- **Severity:** High

### BUG-02: Homepage (`/`) inaccessible when authenticated
- **Page:** `/` (marketing homepage)
- **Screenshot:** `qa-03-auth-login.png` (shows dashboard instead)
- **Description:** Navigating to `/` always redirects to `/app` when dev auth bypass is active. The marketing homepage is never viewable for authenticated users. The Features and Pricing pages remain accessible at `/features` and `/pricing`, creating an inconsistency. The nav bar "Home" link on marketing pages points to `/` which would redirect authenticated users away.
- **Severity:** Medium

### BUG-03: Auth pages inaccessible when authenticated
- **Page:** `/auth/login`, `/auth/signup`
- **Screenshot:** `qa-03-auth-login.png`, `qa-04-auth-signup.png`
- **Description:** Login and signup pages redirect to `/app` when dev auth bypass is on. While this is expected behavior for real auth, it means these pages cannot be tested or previewed in dev mode without disabling the bypass. The reset-password, update-password, and accept-invite pages do NOT redirect, creating inconsistent behavior.
- **Severity:** Low (dev-mode only)

---

## Visual/UX Issues

### BUG-04: Media "Audio" page heading says "Audios"
- **Page:** `media-audio`
- **Screenshot:** `qa-14-media-audio.png`
- **Description:** The heading reads "Audios" which is grammatically awkward. Should be "Audio" or "Audio Files" to match the sidebar label "Audio". Other media sub-pages use correct plurals (Images, Videos, Documents, Web Pages).
- **Severity:** Low

### BUG-05: Templates/Layouts page has different brand colors (teal/green)
- **Page:** `layouts`, `templates`, `svg-templates`
- **Screenshot:** `qa-19-layouts.png`, `qa-33-templates.png`
- **Description:** The Templates/Layouts gallery page uses a teal/green color scheme (green header, green "New Design" button, green search bar) that is completely different from the rest of the app's orange/blue theme. This looks like a separate embedded component that wasn't themed to match the main app design system.
- **Severity:** Medium

### BUG-06: Schedules page shows "Add Schedule" button twice
- **Page:** `schedules`
- **Screenshot:** `qa-20-schedules.png`
- **Description:** There are two "Add Schedule" buttons visible: one in the top-right corner and another below the error state card. The bottom one also has an "Actions" button next to it. When the error state is showing, only the top-right button should be visible, or the bottom buttons should be hidden during error state.
- **Severity:** Low

### BUG-07: Error toast persists across page navigation
- **Page:** Multiple (visible on `admin-test`, `schedules`, `menu-boards`, etc.)
- **Screenshot:** `qa-26-admin-test.png`, `qa-20-schedules.png`, `qa-68-menu-boards.png`
- **Description:** Red error toasts from previous pages persist when navigating to new pages. For example, "Error loading plan data" toast appears on admin-test page, "Error loading templates" toast appears on schedules page. Toasts should be dismissed on page navigation or have a shorter auto-dismiss timeout.
- **Severity:** Medium

### BUG-08: Welcome and Dashboard pages render identically
- **Page:** `welcome` vs `dashboard`
- **Screenshot:** `qa-09-welcome.png`, `qa-10-dashboard.png`
- **Description:** Both the "Welcome" and "Dashboard" sidebar items render the exact same DashboardPage component with the same "Dashboard" heading. The Welcome page should have a distinct onboarding/welcome experience, or the sidebar should not show both items if they're identical.
- **Severity:** Medium

### BUG-09: Listings and Locations pages render identically
- **Page:** `listings` vs `locations`
- **Screenshot:** `qa-23-listings.png`, `qa-30-locations.png`
- **Description:** Both "listings" and "locations" page IDs render the same "Locations" heading. The `listings` page ID appears to be a legacy alias that wasn't removed. It's confusing if both are reachable.
- **Severity:** Low

### BUG-10: Template Marketplace page has no heading
- **Page:** `template-marketplace`
- **Screenshot:** `qa-59-template-marketplace.png`
- **Description:** The Template Marketplace page has no h1 heading. It shows a search bar, "All Templates" tab, orientation filters, and "0 templates found" with "Failed to load templates" error. The page lacks a proper title/heading above the content area.
- **Severity:** Low

### BUG-11: Multiple pages show "Access Denied" without navigation back
- **Page:** `admin-test`, `admin-tenants`, `admin-audit-logs`, `admin-system-events`, `tenant-admin`
- **Screenshot:** `qa-26-admin-test.png`, `qa-52-admin-tenants.png`
- **Description:** These admin pages show "Access Denied - Only super admins can access this page" but provide no button or link to navigate back. Users reaching these pages would need to use the sidebar or browser back button. Should include a "Go to Dashboard" or "Go Back" button.
- **Severity:** Low

### BUG-12: Playlists page button says "Add Playlist" but modal test expected "Create Playlist"
- **Page:** `playlists`
- **Screenshot:** `qa-18-playlists.png`
- **Description:** The Playlists page has an "Add Playlist" button (top-right). The naming is inconsistent with other pages: Schedules uses "Add Schedule", Screens uses "Add Screen", but the button was expected to say "Create Playlist". The naming should be consistent across all list pages (either all "Add X" or all "Create X").
- **Severity:** Low (naming inconsistency)

### BUG-13: Menu Boards page has duplicate create buttons
- **Page:** `menu-boards`
- **Screenshot:** `qa-68-menu-boards.png`
- **Description:** The Menu Boards page shows both a "+ New Menu Board" button in the top-right header area AND a "+ Create Menu Board" button in the empty state card. These use different wording ("New" vs "Create") which is inconsistent. When items exist, the empty state button would presumably disappear, but the naming should match.
- **Severity:** Low

### BUG-14: Proof of Play "Export CSV" button appears disabled/grayed out with no data
- **Page:** `proof-of-play`
- **Screenshot:** `qa-69-proof-of-play.png`
- **Description:** The "Export CSV" button appears grayed out/disabled next to the orange "Refresh" button when there's no data. While this is arguably correct behavior, there's no tooltip or visual explanation for why it's disabled. The button should show a tooltip like "No data to export" on hover.
- **Severity:** Low

---

## Console Errors (Expected - No Backend)

All pages generate `ERR_CONNECTION_REFUSED` errors to `127.0.0.1:54321` (Supabase). These are expected in dev mode without a running Supabase instance. Key error categories:

| Category | Count | Notes |
|----------|-------|-------|
| Supabase connection refused | ~100+ | Expected - no backend running |
| WebSocket connection failed | ~20 | Real-time subscriptions failing |
| Feature flag service errors | ~30 | Can't load feature flags |
| Favicon 404 | 2 | Missing favicon.ico |

---

## Pages That Loaded Successfully

All 61 app pages loaded without JS crashes or error boundaries. Error handling is generally good - pages show appropriate error states ("Couldn't load...", "Unable to load...", "Failed to load...") with "Try Again" buttons. Feature-gated pages show clean upgrade prompts.

---

## Screenshots Reference

All 73 screenshots saved to `screenshots/qa/` with naming convention `qa-{NN}-{page-id}.png`.
Full automated report also available at `screenshots/qa/QA-REPORT.md`.
