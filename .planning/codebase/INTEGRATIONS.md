# External Integrations

**Analysis Date:** 2026-02-13

## APIs & External Services

**Supabase (Backend-as-a-Service):**
- Database operations and authentication
  - SDK/Client: `@supabase/supabase-js` (2.80.0)
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Implementation: `src/supabase.js`, `src/utils/supabaseErrorInterceptor.js`
  - Features: OAuth 2.0 PKCE flow, auto-refresh tokens, persistent sessions
  - Context: `src/contexts/AuthContext.jsx`

**AWS S3 (File Storage):**
- Media uploads via presigned URLs
  - SDK/Client: `@aws-sdk/client-s3` (3.946.0), `@aws-sdk/s3-request-presigner` (3.946.0)
  - Auth: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
  - Optional: `AWS_CLOUDFRONT_URL` - CDN for media delivery
  - Implementation: `vite.config.js` (dev server middleware at `/api/media/presign`)
  - Organization: `/{folder}/{mediaType}/{uuid}.{extension}`
  - Supported types: Images (jpeg, png, gif, webp, svg), videos (mp4, webm, quicktime), audio (mpeg, wav, ogg), documents (pdf, docx, pptx, xlsx)

**Stripe (Payment Processing):**
- Subscription management and billing
  - SDK/Client: `stripe` (20.0.0)
  - Implementation: `src/services/billingService.js`, `src/services/accountPlanService.js`
  - Pages: `src/pages/AccountPlanPage.jsx`, `src/pages/ResellerBillingPage.jsx`

**Resend (Email Service):**
- Transactional emails and alert notifications
  - SDK/Client: `resend` (6.8.0)
  - Auth: `VITE_RESEND_API_KEY`
  - Implementation: `src/services/emailService.js`, `src/services/notificationDispatcherService.js`
  - From: `alerts@bizscreen.com`
  - Features: HTML email templates, alert severity badges

**Sentry (Error Tracking):**
- Error monitoring and performance tracing
  - SDK/Client: `@sentry/react` (10.36.0), `@sentry/vite-plugin` (4.9.0)
  - Auth: `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - Implementation: `src/utils/errorTracking.jsx`
  - Features: React error boundaries, session replay (prod only), source map upload, performance monitoring (10% sample rate)
  - Integrations: React Router v7 tracing, replay integration
  - Pluggable provider: Falls back to console logging if Sentry unavailable

**OpenWeatherMap (Weather API):**
- Weather data for weather widgets
  - Auth: `VITE_OPENWEATHER_API_KEY`
  - Implementation: `src/services/weatherService.js`
  - Endpoint: `https://api.openweathermap.org/data/2.5/weather` and `/forecast`
  - Caching: 30-minute in-memory cache, 50-entry LRU cache
  - Features: Current weather, 5-day forecast, coordinates or city name lookup, mock data fallback

**Anthropic (AI):**
- AI-powered SVG auto-tagging (server-side only)
  - Auth: `ANTHROPIC_API_KEY`
  - Note: Referenced in `.env.example`, falls back to rule-based tagging if not configured

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` with Row Level Security (RLS)
  - Migrations: `supabase/migrations/` (139 SQL migration files)
  - Schema includes: Users, tenants, screens, campaigns, media, playlists, schedules, layouts, scenes, data sources, webhooks, audit logs

**File Storage:**
- AWS S3 with optional CloudFront CDN
  - Primary: Direct browser uploads via presigned URLs
  - Fallback: Cloudinary mentioned in `src/supabase.js` (optional)
  - Path structure: `/uploads/{mediaType}/{uuid}.{ext}`

**Caching:**
- IndexedDB (client-side offline storage)
  - Implementation: `idb` package (8.0.3)
  - Usage: `src/player/cacheService.js` for offline player capability
- In-memory caching
  - Weather data: 30-minute TTL, 50-entry max
  - Implementation: `src/services/weatherService.js`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: OAuth 2.0 PKCE flow
  - Features: Email/password, OAuth providers, auto-refresh tokens, persistent sessions
  - Context: `src/contexts/AuthContext.jsx`
  - Service: `src/services/authService.js`
  - Error handling: `src/utils/supabaseErrorInterceptor.js`

**SSO/SCIM:**
- Custom SSO and SCIM implementation
  - Implementation: `src/services/ssoService.js`, `src/services/scimService.js`
  - Page: `src/pages/EnterpriseSecurityPage.jsx`

## Monitoring & Observability

**Error Tracking:**
- Sentry.io
  - Environment: Local/staging/production aware
  - Sampling: 100% errors, 10% performance traces (prod), 10% session replay (prod), 100% error replay
  - Features: PII scrubbing, email redaction, header sanitization
  - Ignored errors: Network failures, browser extensions, resize observer loops, CORS errors

**Logs:**
- Structured logging service
  - Implementation: `src/services/loggingService.js`
  - Levels: debug, info, warn, error
  - Context: Scoped loggers with userId, tenantId

**Performance:**
- Web Vitals
  - Package: `web-vitals` (5.1.0)
  - Implementation: `src/services/webVitalsService.js`
  - Metrics: CLS, FID, FCP, LCP, TTFB

**Health Checks:**
- Application health endpoint
  - Endpoint: `/api/health` (returns `{"status": "ok"}`)
  - Implementation: `vite.config.js` middleware

## CI/CD & Deployment

**Hosting:**
- Serverless (Vite SPA build output)
  - Static files with client-side routing
  - HTTPS required for Supabase, webhooks, S3

**CI Pipeline:**
- GitHub Actions (implied by test setup)
  - E2E: Playwright with auth state persistence
  - Unit/Integration: Vitest with coverage
  - Load tests: k6 (mentioned in `package.json` scripts)

**Build Process:**
- Vite production build
  - Minification: Terser (drops console.log, console.debug)
  - Source maps: Hidden (uploaded to Sentry)
  - Manual chunks: React, Supabase, icons, motion, QR code
  - Analysis: `rollup-plugin-visualizer` → `perf-reports/bundle-stats.html`

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public API key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name
- `VITE_OPENWEATHER_API_KEY` - OpenWeatherMap API key
- `VITE_RESEND_API_KEY` - Resend email API key

**Optional env vars:**
- `AWS_CLOUDFRONT_URL` - CloudFront CDN URL
- `VITE_SENTRY_DSN` - Sentry error tracking DSN
- `VITE_ERROR_TRACKING_PROVIDER` - Error tracking provider (console or sentry)
- `VITE_ERROR_TRACKING_ENABLED` - Enable/disable error tracking
- `VITE_APP_VERSION` - App version for release tracking
- `VITE_DEVICE_TOKEN` - TV device pairing token
- `ANTHROPIC_API_KEY` - Anthropic AI API key (server-side)
- `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `VITE_CLOUDINARY_UPLOAD_PRESET` - Cloudinary upload preset
- `VITE_LOG_ENDPOINT` - Remote logging endpoint
- `VITE_ANALYTICS_ENDPOINT` - Analytics endpoint for Web Vitals

**Test credentials:**
- `TEST_SUPERADMIN_EMAIL`, `TEST_SUPERADMIN_PASSWORD` - Super admin test user
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD` - Admin test user
- `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD` - Client test user
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` - Standard test user

**Secrets location:**
- `.env` file present (gitignored)
- `.env.local` file present (gitignored)
- `.env.example` - Template with documentation (committed)

## Webhooks & Callbacks

**Incoming:**
- Webhook endpoint management
  - Implementation: `src/services/webhookService.js`
  - Available events: device.online, device.offline, campaign.activated/deactivated/ended, content.approved/rejected, playlist.updated, layout.updated, media.uploaded
  - Features: Retry logic (5 attempts with exponential backoff), delivery history, dead letter queue, signature verification
  - Validation: HTTPS only, blocks localhost/private IPs

**Outgoing:**
- User-configured webhook endpoints
  - Implementation: `src/services/webhookService.js`
  - Secret generation: `whsec_` prefix with 32-byte random hex

**OAuth Callbacks:**
- Supabase Auth callback handler
  - Route: `/auth/callback` (handled by Supabase SDK)
  - Implementation: `src/auth/AuthCallbackPage.jsx`

---

*Integration audit: 2026-02-13*
