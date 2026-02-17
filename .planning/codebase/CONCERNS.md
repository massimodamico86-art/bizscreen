# Codebase Concerns

**Analysis Date:** 2026-02-17

---

## Security Considerations

**Hardcoded GIPHY API Key in Source Code:**
- Risk: API key embedded in version-controlled source; anyone with repo access or who reads the bundle can use it without restriction
- Files: `src/components/svg-editor/LeftSidebar.jsx:255` — `const GIPHY_API_KEY = 'ZhPq2lyo9BmnTkVOy7jQRgv1nKOsgJJ9';`
- Current mitigation: None
- Recommendations: Move to `VITE_GIPHY_API_KEY` env var or proxy through a Supabase Edge Function (matching the Unsplash pattern already used)

**Resend API Key Exposed to Browser Bundle:**
- Risk: `VITE_RESEND_API_KEY` is loaded via `import.meta.env` in `src/services/emailService.js:14-15`, making the Resend API key visible in the production JS bundle. Anyone can extract it and send emails from the domain.
- Files: `src/services/emailService.js`
- Current mitigation: None; key is optional so feature degrades if missing
- Recommendations: Move email sending to a Supabase Edge Function; never expose Resend secret key as a `VITE_` variable

**OpenWeatherMap API Key Directly Appended to Fetch URL:**
- Risk: `VITE_OPENWEATHER_API_KEY` is appended as a query param in `src/services/weatherService.js:52` (`&appid=${OPENWEATHER_API_KEY}`). The full URL including the key appears in browser network DevTools and server access logs.
- Files: `src/services/weatherService.js:10,52`
- Current mitigation: Cloudinary and Unsplash already use server-side proxies; weather does not
- Recommendations: Proxy weather calls through a Supabase Edge Function

**Direct Frontend Writes to Subscriptions Table:**
- Risk: `billingService.js` writes `cancel_at_period_end` directly to the `subscriptions` table from the browser. If RLS policies are misconfigured or bypassed, a user could manipulate their own subscription state without a server-side payment webhook.
- Files: `src/services/billingService.js:373-410` (cancelSubscription, reactivateSubscription)
- Current mitigation: Relies entirely on RLS policies
- Recommendations: Route subscription mutations through a Supabase Edge Function or the existing `/api/billing/` endpoints; never allow raw table writes for billing fields from the browser

**Stripe Server SDK Bundled in Frontend:**
- Risk: `"stripe": "^20.0.0"` is listed as a `dependencies` (not `devDependencies`) in `package.json`. The full Stripe server SDK is available for import in frontend code. No actual `import ... from 'stripe'` was found yet, but the SDK ends up in the bundle analysis and represents a supply-chain risk if accidentally imported.
- Files: `package.json:64`
- Recommendations: Move `stripe` to a server-only package (Edge Function); remove from client `package.json`

**DemoToolsPage Has No Component-Level Access Guard:**
- Risk: `src/pages/DemoToolsPage.jsx` contains no `isSuperAdmin` guard at the component level (unlike `AdminTestPage` which checks at line 118). The page is listed in the `adminToolPages` array in `App.jsx` which restricts navigation display, but any client who manually navigates to `?page=demo-tools` via URL manipulation reaches the page.
- Files: `src/pages/DemoToolsPage.jsx`, `src/App.jsx:493,622`
- Current mitigation: The `adminToolPages` list controls sidebar display but not access
- Recommendations: Add `if (!isSuperAdmin) return <AccessDenied />` at the top of `DemoToolsPage`

---

## Tech Debt

**"Fake Billing" Still in Production Code:**
- Issue: `src/services/accountPlanService.js` is explicitly documented as `"fake billing" - actual Stripe integration will come later` (line 5, 114-115). `changePlan()` calls an RPC to change plans without Stripe payment verification.
- Files: `src/services/accountPlanService.js:5,114-115,120-144`
- Impact: Users can switch plans without paying; billing state can diverge from Stripe
- Fix approach: Replace `changePlan()` with a redirect to Stripe Checkout; deprecate the RPC `change_subscription_plan`

**WeatherWallConfigModal Logo Upload Never Persists:**
- Issue: Logo upload in `WeatherWallConfigModal` creates a temporary `objectURL` but never uploads to storage. Comment reads `// In production, upload to storage and get URL`. The URL is lost on page reload.
- Files: `src/components/apps/WeatherWallConfigModal.jsx:125-132`
- Impact: WeatherWall logo configuration does not persist across sessions
- Fix approach: Upload the blob to Supabase Storage and store the persistent URL

**FabricSvgEditor — Monolithic 2997-Line Component:**
- Issue: `src/components/svg-editor/FabricSvgEditor.jsx` is a single 2997-line component with 92 hook calls (useEffect, useState, useCallback, useRef). Concerns include undo/redo logic, event binding, template loading, and widget rendering all in one file.
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`
- Impact: Near-impossible to unit test; any change risks breaking unrelated behavior; re-renders are expensive
- Fix approach: Extract undo/redo logic into a `useFabricHistory` hook; extract template loading into `useFabricTemplates`; split widget panel into a separate component

**App.jsx Routing via String-Keyed Object (1076 lines):**
- Issue: `src/App.jsx` implements routing via a 50+ key plain object (`pages`) mapping string IDs to JSX. There is no type safety on page keys, no 404 handling for invalid pages, and the file is 1076 lines.
- Files: `src/App.jsx`
- Impact: Easy to introduce typos in page navigation calls; no 404 UI; hard to navigate
- Fix approach: Migrate to React Router's `<Routes>` / `<Route>` with proper URL-based routing; removes the custom SPA routing layer

**`_TemplatesPage` Imported But Never Used:**
- Issue: `src/App.jsx:64` imports `TemplatesPage` as `_TemplatesPage` with an underscore prefix indicating it is unused. The component still gets analyzed during build.
- Files: `src/App.jsx:64`
- Impact: Dead import; potential bundle impact
- Fix approach: Remove the import entirely

**`useDebounce` Duplicated Across Files:**
- Issue: `useDebounce` is defined three times independently: `src/legacy/hooks/useDebounce.js`, `src/pages/TemplatesPage.jsx:98`, and `src/pages/SvgTemplateGalleryPage.jsx:41`. The legacy version is never imported by non-legacy code.
- Files: `src/legacy/hooks/useDebounce.js`, `src/pages/TemplatesPage.jsx`, `src/pages/SvgTemplateGalleryPage.jsx`
- Impact: Inconsistency; maintenance burden
- Fix approach: Create `src/hooks/useDebounce.js` and import it in all three locations

**`legacy/` Directory Has No Active Importers:**
- Issue: The entire `src/legacy/` directory (pages, components, hooks, utils) is not imported by any non-legacy source file. Legacy pages (`FAQsPage`, `UsersPage`, etc.) import `mockData` and are never routed. The directory exists but is dead code.
- Files: `src/legacy/` (all files)
- Impact: Confuses codebase navigation; ships dead code in bundle if tree-shaking misses it
- Fix approach: Delete `src/legacy/` entirely; already tracked in Phase 42 planning

**Client-Side Rate Limiting Has No IP Isolation:**
- Issue: `src/services/rateLimitService.js:39` reads `// In production, you'd get the real IP from headers`. The `identifier` falls back to `'anonymous'` for unauthenticated users, meaning all anonymous users share a single rate limit bucket.
- Files: `src/services/rateLimitService.js:31-44`
- Impact: A single anonymous user exhausting rate limits blocks all anonymous users; trivially bypassed by authenticated users who are just rate-limited per `userId`
- Fix approach: Implement rate limiting at the Edge Function or RLS level using real client IPs

**NotificationDispatcherService Email Is Stubbed:**
- Issue: `src/services/notificationDispatcherService.js:346-348` has the comment `// In production, this would trigger an email worker. For now, we just log.` Email queuing inserts a DB record but no worker actually sends the emails.
- Files: `src/services/notificationDispatcherService.js:346-348`
- Impact: Alert email notifications are silently dropped
- Fix approach: Wire up a Supabase Edge Function or pg_cron worker to process the queue and call `emailService.sendAlertEmail()`

---

## Performance Bottlenecks

**AdminDashboardPage — N+2 Queries Per Client:**
- Problem: `src/pages/AdminDashboardPage.jsx:87-116` fetches all clients then issues 2 separate Supabase queries per client inside `Promise.all(clients.map(async ...))`. With 100 clients this means 201 sequential round-trips.
- Files: `src/pages/AdminDashboardPage.jsx:86-117`
- Cause: No aggregate query or join is used; per-client counts are fetched individually
- Improvement path: Replace with a single RPC or a Supabase view that returns per-owner counts in one query

**160 `console.log` Statements in Production Bundle:**
- Problem: Running `grep -r "console\.log" src/` returns 160 matches in non-test files (excluding the single sanctioned call in `loggingService.js`). All other matches are debug logs that ship to production.
- Files: Widespread; notable in `src/pages/OpsConsolePage.jsx:108`, `src/pages/AdminDashboardPage.jsx`
- Cause: Debug logging not removed or gated by environment
- Improvement path: ESLint rule `no-console` is not enforced; enable it and replace with `useLogger` / `createScopedLogger`

**FabricSvgEditor — No React.memo on Subcomponents:**
- Problem: The 2997-line `FabricSvgEditor` has 92 hook declarations with no `React.memo` wrapping on child panels or toolbar components. Each state change in the editor triggers re-renders of all nested components.
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`
- Cause: Monolithic component structure prevents memoization
- Improvement path: Extract panels as separate memoized components; use `useMemo` for expensive computations

**usePlaylistEditor — 89 Hook Calls in One Hook:**
- Problem: `src/pages/hooks/usePlaylistEditor.js` has 89 hook-related lines in a single custom hook (1189 lines total). This centralizes all playlist editor state in one large hook, making partial re-renders impossible.
- Files: `src/pages/hooks/usePlaylistEditor.js`
- Cause: All playlist state co-located
- Improvement path: Split into smaller focused hooks (`usePlaylistItems`, `usePlaylistSave`, `usePlaylistDuration`)

---

## Fragile Areas

**App-level Page Routing via Custom String-Key Object:**
- Files: `src/App.jsx:460-520`
- Why fragile: Navigation uses `setCurrentPage('some-string')` throughout the app. There is no type checking on the string, no 404 fallback, and adding a new page requires editing the `pages` object, the navigation array, and any deep-linking logic in three separate places.
- Safe modification: Always add new pages to `pages` object AND navigation array AND test navigation manually; search for all `setCurrentPage` callers
- Test coverage: No routing tests

**Supabase Realtime Reconnection with Exponential Backoff (MAX 10 Attempts):**
- Files: `src/services/realtimeService.js:21,300`
- Why fragile: After 10 reconnection attempts the service stops trying. Long network outages or server maintenance windows (longer than ~10 min) leave the app in a permanently stale real-time state with no UI indication and no way to recover short of a page reload.
- Safe modification: Add a visible "connection lost" banner when `connectionAttempts > MAX_RECONNECT_ATTEMPTS`; reset attempts on `visibilitychange` event

**TV.jsx OTP Stored in localStorage:**
- Files: `src/TV.jsx:24,41-42`
- Why fragile: The pairing OTP is persisted to `localStorage` so the player can reconnect after refresh. If another tab or the main app clears localStorage, the TV loses its pairing permanently without notification.
- Safe modification: Treat OTP as soft-persistent; add fallback re-pair UI when `tv_otp` is missing

**Template Data Passed Through sessionStorage:**
- Files: `src/pages/SvgTemplateGalleryPage.jsx:249-260`, `src/pages/SvgEditorPage.jsx:94-105`
- Why fragile: Template selection is serialized to `sessionStorage` as `pendingTemplate` then deserialized in the editor. If the editor is opened directly (bookmark/deep link) the key is absent. If the user opens two gallery tabs simultaneously, the second write overwrites the first.
- Safe modification: Pass template ID via URL query param (`?templateId=xxx`) instead of sessionStorage

**`createObjectURL` Without Revoke in Three Files:**
- Files: `src/components/brand/BrandImporterModal.jsx:110`, `src/components/apps/WeatherWallConfigModal.jsx:130`, `src/pages/Admin/AdminEditTemplatePage.jsx:244`
- Why fragile: Object URLs are created for preview but never revoked, causing memory leaks that grow with each file the user previews in a session.
- Safe modification: Add `return () => URL.revokeObjectURL(url)` cleanup in the `useEffect` that creates each URL

**Duplicate Keys in `layout-editor/types.js` (ESLint Suppressed):**
- Files: `src/components/layout-editor/types.js:8-9`
- Why fragile: `/* eslint-disable no-dupe-keys */` is applied at the file level to support a deep-merge spread pattern. Any new property added to the factory functions must be duplicated in both the defaults section and the overrides section; forgetting either silently produces the wrong value.
- Safe modification: Use a helper like `deepMerge(defaults, overrides)` instead of the duplicate-key pattern; remove the eslint-disable

---

## Test Coverage Gaps

**FabricSvgEditor (2997 lines) — Zero Test Coverage:**
- What's not tested: Canvas initialization, undo/redo, object selection, template loading, widget insertion, save flow
- Files: `src/components/svg-editor/FabricSvgEditor.jsx`
- Risk: Any refactor silently breaks core editor functionality
- Priority: High

**Player ViewPage (1185 lines) — Zero Test Coverage:**
- What's not tested: Playlist playback loop, transition handling, screen heartbeat, offline fallback, widget rendering
- Files: `src/player/pages/ViewPage.jsx`
- Risk: Player regressions go undetected until a device in the field stops showing content
- Priority: High

**Billing Flow — No Integration Tests:**
- What's not tested: `startCheckout()`, `openBillingPortal()`, `checkCheckoutResult()`, subscription state after webhook
- Files: `src/services/billingService.js`, `src/pages/AccountPlanPage.jsx`
- Risk: Checkout redirects break silently; revenue-critical path has no regression guard
- Priority: High

**AuthContext Retry/Fallback Logic — No Tests:**
- What's not tested: Profile fetch retries, timeout handling, `PGRST116` not-found case, `skipIfExists` optimization
- Files: `src/contexts/AuthContext.jsx`
- Risk: Auth edge cases (profile not created, network timeout) hit users in production without a test safety net
- Priority: High

**DataSourcesPage (1323 lines) — Zero Test Coverage:**
- What's not tested: Data source CRUD, binding configuration, field mapping, refresh scheduling
- Files: `src/pages/DataSourcesPage.jsx`
- Risk: Data binding features break without detection
- Priority: Medium

**scheduleService (1221 lines) — No Service-Level Tests:**
- What's not tested: Conflict detection, daypart resolution, priority ordering, filler content selection
- Files: `src/services/scheduleService.js`
- Risk: Schedule conflicts silently produce incorrect content playback on screens
- Priority: High

---

## Dependencies at Risk

**`polotno` (2.33.2) — Proprietary Dependency with License Coupling:**
- Risk: Polotno is a commercial library; the free tier has watermarks and feature limits. The integration (`src/components/PolotnoEditor.jsx`) is tightly coupled to Polotno's store API. Migrating away requires rewriting the editor integration.
- Impact: Any license change or pricing change by Polotno directly impacts the product
- Migration plan: FabricSvgEditor is the emerging in-house replacement; accelerate migration

**`fabric` (6.x) — Major Version Still in Beta Ecosystem:**
- Risk: Fabric.js v6 has breaking changes from v5; several third-party plugins and examples target v5.
- Impact: Limited third-party resources for debugging canvas issues
- Migration plan: Pin to specific patch version; monitor Fabric v6 stability

**`html2canvas` (1.4.1) — Known Rendering Issues with CSS Variables:**
- Risk: `html2canvas` has known issues with CSS custom properties and modern CSS features used throughout the app (Tailwind). Screenshot/thumbnail generation may produce incorrect results for complex layouts.
- Files: `src/services/screenshotService.js`
- Impact: Thumbnails or screenshots may look different from actual rendered content
- Migration plan: Evaluate Puppeteer-based or Supabase Edge Function screenshot service as replacement

---

## Scaling Limits

**Client-Side Rate Limiting — In-Memory State:**
- Current capacity: Works correctly for single-user single-tab sessions
- Limit: `rateLimitBuckets` Map in `alertEngineService.js` resets on page reload; `socialFeedSyncService.js` `rateLimitCooldowns` is per-tab. Multi-tab usage bypasses rate limits entirely.
- Scaling path: Move rate limit enforcement to the database `check_rate_limit()` RPC consistently for all services

**OpsConsolePage Tenant Aggregation — Client-Side Join:**
- Current capacity: Acceptable up to ~200 tenants
- Limit: Fetches all `profiles`, `tv_devices`, `api_tokens`, and `subscriptions` tables into memory then filters client-side. At 1000+ tenants this will cause noticeable lag and potential memory pressure.
- Files: `src/pages/OpsConsolePage.jsx:56-110`
- Scaling path: Replace with a single `get_ops_console_summary` Postgres RPC that does the aggregation server-side

---

## Missing Critical Features

**Stripe Webhook Processing Not Implemented in App:**
- Problem: `billingService.js` calls `/api/billing/checkout` and `/api/billing/portal` but there is no webhook handler visible in `src/api/` (only GDPR handlers exist). Stripe webhooks for subscription lifecycle events (payment_succeeded, subscription_canceled, invoice.payment_failed) appear unhandled.
- Blocks: Real subscription enforcement; accurate `past_due` and `canceled` status in the database without manual admin intervention
- Note: Webhooks may exist in a separate backend not included in this repo; confirm before implementing

**No Abort Controller on Async useEffect Fetches:**
- Problem: 394 `useEffect` usages exist across the app; `AbortController` is not used in any of them. When a component unmounts while a fetch is in-flight (e.g., navigating away quickly), the state update runs on an unmounted component.
- Impact: React "Can't perform a state update on an unmounted component" warnings; potential stale data displayed
- Fix approach: Add AbortController pattern to all effect-fetches or migrate to a data-fetching library like React Query / SWR

---

*Concerns audit: 2026-02-17*
