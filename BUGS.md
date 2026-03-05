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
- **Bugs total:** 19
- **Bugs resolved:** 19
- **Bugs open:** 0

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

### [RESOLVED] BUG-06: Schedules page shows "Add Schedule" button twice
- **Page:** `schedules`
- **Screenshot:** `screenshots/qa/qa2-11-schedules.png`
- **Resolution:** Fixed in quick task 55. Duplicate "Add Schedule" button removed from page header; only the empty-state button remains.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-13: Menu Boards page has duplicate create buttons
- **Page:** `menu-boards`
- **Screenshot:** `screenshots/qa/qa2-14-menu-boards.png`
- **Resolution:** Fixed in quick task 55. Duplicate "New Menu Board" button removed from page header; only the empty-state button remains.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-08: Welcome and Dashboard pages render identically
- **Page:** `welcome` vs `dashboard`
- **Screenshots:** `screenshots/qa/qa2-03-welcome.png`, `screenshots/qa/qa2-04-dashboard.png`
- **Resolution:** Fixed in quick task 53. Welcome page now has a distinct onboarding experience with setup wizard, different from the Dashboard stats view.
- **Verified:** 2026-03-05 via MCP interactive walkthrough

### [RESOLVED] BUG-04: Media "Audio" page heading says "Audios"
- **Page:** `media-audio`
- **Screenshot:** `screenshots/qa/qa2-09-media-audio.png`
- **Resolution:** Fixed in quick task 57. Replaced naive `+ 's'` pluralization with explicit MEDIA_TYPE_PLURALS map. Audio heading now correctly reads "Audio".
- **Verified:** 2026-03-05

### [RESOLVED] BUG-09: Listings and Locations pages render identically
- **Page:** `listings` vs `locations`
- **Resolution:** Fixed in quick task 57. Listings route now redirects to LocationsPage. Listings entry removed from navigation header.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-10: Template Marketplace page has no heading
- **Page:** `template-marketplace`
- **Resolution:** Fixed in quick task 57. Added PageHeader component with title and description inside PageLayout.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-11: Multiple pages show "Access Denied" without navigation back
- **Page:** `admin-test`, `admin-tenants`, `admin-audit-logs`, `admin-system-events`, `tenant-admin`, `super-admin`, `admin-dashboard`, `feature-flags`
- **Screenshot:** `screenshots/qa/qa2-25-admin-tenants.png`
- **Resolution:** Fixed in quick task 57. Added "Go to Dashboard" button with orange brand color to all 8 Access Denied pages.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-12: Playlists page button naming inconsistency
- **Page:** `playlists`
- **Screenshot:** `screenshots/qa/qa2-08-playlists.png`
- **Resolution:** Fixed in quick task 57. Changed "Add Playlist" to "Create Playlist" in both page header and empty state buttons.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-14: Proof of Play "Export CSV" button appears disabled with no explanation
- **Page:** `proof-of-play`
- **Screenshot:** `screenshots/qa/qa2-36-proof-of-play.png`
- **Resolution:** Fixed in quick task 57. Wrapped disabled button in div with tooltip "No data available to export".
- **Verified:** 2026-03-05

### [RESOLVED] BUG-15: Reset password error exposes raw backend URL to user
- **Page:** `/auth/reset-password`
- **Screenshot:** `screenshots/56-03-reset-password-submitted.png`
- **Resolution:** Fixed in quick task 57. Sanitized error message in authService catch block to show generic connection error instead of raw URL.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-16: ErrorBoundary "Try Again" button uses green instead of brand colors
- **Page:** Global (ErrorBoundary component)
- **Screenshot:** `screenshots/56-09-login-dev-bypass-redirect.png`
- **Resolution:** Fixed in quick task 57. Changed bg-green-600 to bg-orange-500 to match brand palette.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-02: Homepage (`/`) inaccessible when authenticated
- **Page:** `/` (marketing homepage)
- **Resolution:** Fixed in quick task 60. Added `!DEV_AUTH_BYPASS` guard to PublicRoute redirect condition so homepage is accessible during dev auth bypass.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-03: Auth pages inaccessible when authenticated
- **Page:** `/auth/login`, `/auth/signup`
- **Resolution:** Fixed in quick task 60. Same PublicRoute guard allows login/signup pages to render during dev auth bypass. Zero production impact.
- **Verified:** 2026-03-05

---

## Welcome Screen / TV Device Rendering Review (Task 61)

**Date:** 2026-03-05
**Viewport:** 1920x1080 (simulated TV)
**Method:** Playwright MCP manual review

### Pages Reviewed

| Route | Component | Result |
|-------|-----------|--------|
| `/player` | PairPage (QR pairing screen) | OK — clean dark background, centered QR code, help instructions, "Enter pairing code manually" button all render correctly at 1920x1080 |
| `/player/view` | ViewPage | Could not test — redirects to `/player` without paired screen. Code review: "no content" empty state renders centered message with BizScreen logo |
| `/app` → Welcome | WelcomePage + WelcomeHero + WelcomeFeatureCards | OK — Hero shows greeting ("Hi, Dev Bypass User,"), media icons, 3 feature cards (playlists, templates, tutorial) all visible and well-spaced at 1920x1080 |
| Layout1-4 (TVPreviewModal) | TV welcome screen layouts | Could not render interactively (requires listing data from Supabase). Code review below. |

### Code Review: TV Layout Rendering (Layout1-4)

**Layout1** ([Layout1.jsx](src/layouts/Layout1.jsx)):
- Background: Falls back to external Unsplash URL when no image provided (`photo-1414235077428-338989a2e8c0?w=3840`). Potential issue for offline/air-gapped TVs.
- Welcome greeting: `text-7xl font-bold` — large, readable on TV. Guest name uses `{{first-name}} {{last-name}}` template tokens via WelcomeMessageForm.
- Welcome message: `text-3xl leading-relaxed` — good readability.
- Time display: `text-8xl font-bold` — excellent for TV viewing distance.
- Gradient overlay: `from-black/75 via-black/35 to-black/55` — ensures text readability over any background.
- QR codes: 128x128px white boxes in bottom-left — visible at TV distance.
- All Layout1-4 use the same prop interface (`layout`, `guest`).

**ScaledStage** ([ScaledStage.jsx](src/ScaledStage.jsx)):
- Renders at fixed 1920x1080 and scales to fit container via ResizeObserver.
- `transformOrigin: "top left"` — correct for scale-down rendering.

### Observations (Not Bugs)

1. **Breadcrumb shows "Dashboard" on Welcome page** — The breadcrumb in the top nav says "Home > Dashboard" even when Welcome page is active. Minor inconsistency.
2. **Page title stays "Sign In - BizScreen"** after dev auth bypass login — Title doesn't update to reflect current page.
3. **Layout1 Unsplash fallback** — External URL `images.unsplash.com/photo-1414235077428-338989a2e8c0` used as default background. If Unsplash is unreachable (common on air-gapped TVs), the background will be empty. Consider bundling a local fallback image.
4. **Template card uses teal gradient** — The "Templates to get you started" card in WelcomeFeatureCards still shows teal/green color (#2dd4bf area). This was previously flagged as BUG-05 for other pages but the WelcomeFeatureCards component wasn't updated.

### Console Errors

All console errors at 1920x1080 were the expected Supabase connection failures (`ERR_CONNECTION_REFUSED` to `127.0.0.1:54321`). No unexpected JS errors or rendering crashes observed on any of the tested pages.

---

## All Issues Resolved

All 19 bugs identified during QA walkthrough have been resolved.

### [RESOLVED] BUG-17: createScreen fails under DEV_AUTH_BYPASS — OTP code never shown
- **Page:** `screens` → Add Screen modal
- **Resolution:** Fixed in quick task 67. `createScreen` now uses `getAuthenticatedUserId()` from devBypass.js which falls back to mock user ID under DEV_AUTH_BYPASS.
- **Verified:** 2026-03-05

### [RESOLVED] BUG-18: Player QR pairing polls every 3s with no backoff — console noise
- **Page:** `/player` (PairPage in QR mode)
- **Resolution:** Fixed in quick task 67. Polling now uses exponential backoff (3s -> 4.5s -> ... -> 30s max) with 60-retry limit (~5 minutes before stopping).
- **Verified:** 2026-03-05

### [RESOLVED] BUG-19: OTP code described as "6-digit" but is actually alphanumeric
- **Pages:** PairPage manual entry
- **Resolution:** Fixed in quick task 67. Changed "6-digit code" to "6-character code" in PairPage.
- **Verified:** 2026-03-05

### Non-bug observations from OTP/pairing walkthrough

- **Player page renders correctly** at `/player` — QR code screen shows with device ID, instructions, and fallback to manual OTP entry. No crashes.
- **Manual OTP entry UI** works well: input accepts uppercase alphanumeric, has 6-dot progress indicator, proper validation (enables button only at 6 chars), clear error messages for network/invalid/expired codes.
- **Error messages are well-differentiated** in PairPage: network errors, invalid codes, and expired codes each get distinct user-facing messages.
- **All console errors on player page** are expected backend-unavailable errors (503 from Supabase, ERR_CONNECTION_REFUSED for RPCs).

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

### Auth/Onboarding Walkthrough (Task 56)

Screenshots saved to `screenshots/56-{NN}-{description}.png` (18 screenshots total).

| # | File | Page |
|---|------|------|
| 01 | 56-01-reset-password-empty.png | Reset Password (empty) |
| 02 | 56-02-reset-password-filled.png | Reset Password (filled) |
| 03 | 56-03-reset-password-submitted.png | Reset Password (submitted - error) |
| 04 | 56-04-update-password-no-token.png | Update Password (no token) |
| 05 | 56-05-accept-invite-no-token.png | Accept Invite (no token) |
| 06 | 56-06-accept-invite-invalid-token.png | Accept Invite (invalid token) |
| 07 | 56-07-auth-callback-processing.png | Auth Callback (blank - immediate redirect) |
| 08 | 56-08-auth-callback-after.png | Auth Callback (after redirect) |
| 09 | 56-09-login-dev-bypass-redirect.png | Login (dev bypass - error boundary) |
| 10 | 56-10-signup-dev-bypass-redirect.png | Signup (dev bypass - error boundary) |
| 11 | 56-11-welcome-page.png | Welcome page |
| 12 | 56-12-welcome-page-buttons.png | Welcome page (buttons) |
| 13 | 56-13-dashboard-comparison.png | Dashboard |
| 14 | 56-14-reset-password-mobile.png | Reset Password (375px mobile) |
| 15 | 56-15-update-password-mobile.png | Update Password (375px mobile) |
| 16 | 56-16-accept-invite-mobile.png | Accept Invite (375px mobile) |
| 17 | 56-17-onboarding-get-started.png | Onboarding Get Started |
| 18 | 56-18-welcome-fullpage.png | Welcome (full page) |
