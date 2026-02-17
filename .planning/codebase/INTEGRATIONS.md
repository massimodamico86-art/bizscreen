# External Integrations

**Analysis Date:** 2026-02-17

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - Primary backend for database, auth, realtime, storage, and edge functions
  - SDK/Client: `@supabase/supabase-js` 2.80.0; singleton client in `src/supabase.js`
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - PKCE flow enabled; auto-refresh tokens; session persisted to localStorage
  - Instrumented with error interceptor: `src/utils/supabaseErrorInterceptor.js` (auto-sends breadcrumbs to Sentry)

**Payment Processing:**
- Stripe - Subscription billing and checkout
  - SDK: `stripe` 20.0.0 (server-side), `VITE_STRIPE_PUBLISHABLE_KEY` (client-side key only)
  - Client: `src/services/billingService.js` — calls internal API routes `/api/billing/checkout` and `/api/billing/portal` which proxy to Stripe
  - Auth: `VITE_STRIPE_PUBLISHABLE_KEY` (client); server-side Stripe secret key via non-VITE env var

**Error Tracking:**
- Sentry - Exception tracking, performance monitoring, session replay
  - SDK: `@sentry/react` 10.36.0; Vite plugin `@sentry/vite-plugin` 4.9.0 for source map upload
  - Implementation: `src/utils/errorTracking.jsx`; initialized via `src/utils/observability.js` before React renders
  - Source maps uploaded at build time and deleted from `dist/` afterward
  - Auth: `VITE_SENTRY_DSN`, `VITE_SENTRY_DEBUG`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

**Email:**
- Resend - Transactional email for alert notifications
  - SDK: `resend` 6.8.0
  - Implementation: `src/services/emailService.js`
  - From address: `alerts@bizscreen.com`
  - Auth: `VITE_RESEND_API_KEY`

**Weather Data:**
- OpenWeatherMap - Current weather for weather widget in player
  - Implementation: `src/services/weatherService.js`; 30-minute in-memory cache with 50-entry limit; falls back to mock data when key not set
  - Endpoint: `https://api.openweathermap.org/data/2.5/weather`
  - Auth: `VITE_OPENWEATHER_API_KEY`

**Photo Library:**
- Unsplash - Stock photo search for media insertion
  - Implementation: proxied through Supabase Edge Function `unsplash-proxy` (API key kept server-side)
  - Client: `src/services/unsplashProxyService.js`
  - TOS compliance: hotlinks to Unsplash CDN, tracks downloads

**Design Import:**
- Canva Connect API - OAuth-based design import from Canva
  - Implementation: `src/services/canvaService.js`; PKCE OAuth flow; tokens stored in localStorage
  - Callback route: `/auth/canva/callback` (see `src/pages/CanvaCallbackPage.jsx`)
  - Auth: `VITE_CANVA_CLIENT_ID`

**Spreadsheet Data:**
- Google Sheets API v4 - Read-only data binding for dynamic content
  - Implementation: `src/services/googleSheetsService.js`; reads public sheets via API key
  - Endpoint: `https://sheets.googleapis.com/v4/spreadsheets`
  - Auth: `VITE_GOOGLE_API_KEY`

**Generative AI:**
- AI content generation (provider not named in source) - Powers content assistant, plan generation, and scene suggestions
  - Implementation: `src/services/assistantService.js`; calls internal API routes `/api/assistant/plan` and `/api/assistant/content`
  - Feature-flagged via `VITE_ENABLE_AI`
  - Scene AI currently deterministic (`src/services/sceneAiService.js`); comment notes "can be wired to real LLM later"

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - All application data
  - Connection: `VITE_SUPABASE_URL`
  - Client: `@supabase/supabase-js` via `src/supabase.js`
  - Migrations: `supabase/migrations/`
  - RLS (Row-Level Security) enforced; SCIM provisioning via stored procedures (`scim_list_users`)
  - Realtime subscriptions for device commands via `src/services/realtimeService.js`

**File Storage:**
- AWS S3 - Primary media file storage (images, video, audio, documents)
  - SDK: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Upload flow: presigned URL generated server-side at `/api/media/presign` → client uploads directly to S3
  - In dev: presign endpoint implemented as Vite middleware in `vite.config.js`
  - Bucket: `bizscreen-media` (override via `AWS_S3_BUCKET`)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - Service: `src/services/s3UploadService.js`

- Cloudinary - Layout editor image uploads (blob/base64 from canvas)
  - Implementation: `src/services/cloudinaryService.js`; unsigned upload preset
  - Upload endpoint: `https://api.cloudinary.com/v1_1/{cloud}/image/upload`
  - Folder: `bizscreen/layouts`
  - Auth: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`

**CDN:**
- AWS CloudFront - CDN in front of S3 for media delivery
  - URL override: `AWS_CLOUDFRONT_URL` (falls back to direct S3 URL)

**Client-Side Caching:**
- IndexedDB (via `idb` 8.0.3) - Player offline caching
  - Implementation: `src/player/cacheService.js`, `src/player/offlineService.js`
  - Used by TV player (`src/player/pages/ViewPage.jsx`) for offline content playback

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password and social OAuth
  - Implementation: `src/services/authService.js`, `src/contexts/AuthContext.jsx`
  - Flow: PKCE; session auto-refreshed; detects session in URL for magic links
  - Email confirmation redirect: `${window.location.origin}/auth/callback`

**MFA:**
- Supabase MFA (TOTP) - Google Authenticator, Authy, 1Password
  - Implementation: `src/services/mfaService.js`
  - Uses `supabase.auth.mfa.*` APIs

**SSO:**
- OIDC and SAML via Supabase SSO - Enterprise identity provider support
  - Implementation: `src/services/ssoService.js`
  - Supported providers: Okta, Azure AD, and any OIDC/SAML IdP
  - Config stored in `sso_providers` table

**SCIM Provisioning:**
- SCIM 2.0 - Automated user provisioning from enterprise IdPs
  - Implementation: `src/services/scimService.js`
  - Uses Supabase RPC `scim_list_users`

## Social Media Integrations

**Instagram:**
- Instagram Basic Display API / Graph API (business accounts)
  - Implementation: `src/services/social/instagramService.js`
  - OAuth callback: `/auth/callback/instagram`
  - Auth: `VITE_INSTAGRAM_APP_ID`, `VITE_INSTAGRAM_APP_SECRET`, `VITE_INSTAGRAM_REDIRECT_URI`

**Facebook:**
- Facebook Graph API v18.0 - Page posts
  - Implementation: `src/services/social/facebookService.js`
  - OAuth callback: `/auth/callback/facebook`
  - Scopes: `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`
  - Auth: `VITE_FACEBOOK_APP_ID`, `VITE_FACEBOOK_APP_SECRET`, `VITE_FACEBOOK_REDIRECT_URI`

**TikTok:**
- TikTok API v2 - Video listing
  - Implementation: `src/services/social/tiktokService.js`
  - OAuth callback: `/auth/callback/tiktok`
  - Auth: `VITE_TIKTOK_CLIENT_KEY`, `VITE_TIKTOK_CLIENT_SECRET`, `VITE_TIKTOK_REDIRECT_URI`

**Google Reviews:**
- Google Places API + Google My Business API
  - Implementation: `src/services/social/googleReviewsService.js`
  - OAuth callback: `/auth/callback/google`
  - Auth: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_PLACES_API_KEY`, `VITE_GOOGLE_REDIRECT_URI`

## Monitoring & Observability

**Error Tracking:**
- Sentry - Primary error and performance monitoring
  - Pluggable: controlled by `VITE_ERROR_TRACKING_PROVIDER` (values: `console`, `sentry`)
  - React error hooks wired in `src/main.jsx` for uncaught, caught, and recoverable errors
  - Router instrumentation enabled via `createRoutesFromChildren` / `matchRoutes`

**Logging:**
- Custom structured logging service: `src/services/loggingService.js`
  - Log levels: trace, debug, info, warn, error, fatal
  - Production: logs batched (20 entries) and flushed every 10s; 10% sampling rate
  - Remote log endpoint: `VITE_LOG_ENDPOINT` (optional; batched HTTP POST)
  - PII redaction applied before any remote log send: `src/utils/pii.js`

**Web Vitals:**
- `web-vitals` 5.1.0 - CLS, FID, LCP, TTFB, FCP collection
  - Implementation: `src/services/webVitalsService.js`
  - Optional analytics endpoint: `VITE_ANALYTICS_ENDPOINT`

**Load Testing:**
- k6 - Load tests in `load-tests/` for auth burst, heartbeat, playlist resolution
  - Run scripts: `npm run load-test:heartbeat`, `npm run load-test:playlist`

## Content Feeds

**RSS/Atom:**
- RSS proxy via Supabase Edge Function `rss-proxy`
  - Implementation (client): `src/services/rssFeedService.js`
  - Edge function handles parsing, XSS sanitization, DB-backed caching with TTL, ETag support
  - Location: `supabase/functions/rss-proxy/`

## CI/CD & Deployment

**Hosting:**
- Vercel - Production deployment
  - Config: `vercel.json`
  - SPA routing rewrite, long-term asset caching, security headers (CSP, HSTS, X-Frame-Options)

**CI Pipeline:**
- Not detected (no `.github/workflows/` or CI config found)
- `npm run test:ci` script: runs unit tests → seeds CI test user → runs E2E tests

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks - Likely handled by server-side billing routes (not visible in frontend source)

**Outgoing:**
- User-configurable webhook endpoints via `src/services/webhookService.js`
  - Events: device.online, device.offline, campaign.activated/deactivated/ended, content.approved/rejected, playlist.updated, layout.updated, media.uploaded
  - Retry logic: 5 attempts with exponential backoff (30s, 60s, 120s, 240s, 480s)
  - Dead letter queue for exhausted retries
  - Delivery history tracked in Supabase

## Supabase Edge Functions

**Deployed functions** (in `supabase/functions/`):
- `rss-proxy` - RSS/Atom feed fetching, parsing, and caching
- `unsplash-proxy` - Unsplash photo search (keeps API key server-side)

## Environment Configuration

**Required env vars (all environments):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Required env vars (production only):**
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`

**Optional env vars (features degrade gracefully when missing):**
- `VITE_OPENWEATHER_API_KEY` - Weather widget falls back to mock data
- `VITE_CLOUDINARY_UPLOAD_PRESET` - Layout image upload disabled
- `VITE_RESEND_API_KEY` - Email alerts disabled
- `VITE_SENTRY_DSN` + `VITE_ERROR_TRACKING_PROVIDER=sentry` - Falls back to console logging
- `VITE_GOOGLE_API_KEY` - Google Sheets data binding disabled
- `VITE_CANVA_CLIENT_ID` - Canva import disabled
- `VITE_INSTAGRAM_APP_ID` / `VITE_FACEBOOK_APP_ID` / `VITE_TIKTOK_CLIENT_KEY` / `VITE_GOOGLE_CLIENT_ID` - Social feed integrations disabled
- `VITE_ENABLE_AI=true` - AI content assistant disabled
- `VITE_LOG_ENDPOINT` - Remote logging disabled
- `VITE_ANALYTICS_ENDPOINT` - Web vitals reporting disabled

**Server-side vars (not exposed to browser):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_URL`
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

**Secrets location:**
- `.env.local` for local development (gitignored)
- Vercel dashboard Environment Variables for production deployment

---

*Integration audit: 2026-02-17*
