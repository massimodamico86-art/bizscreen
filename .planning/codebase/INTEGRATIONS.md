# External Integrations

**Analysis Date:** 2026-02-12

## APIs & External Services

**Supabase (Backend-as-a-Service):**
- Authentication - OAuth 2.0 PKCE flow for user login/registration
  - SDK/Client: `@supabase/supabase-js` (2.80.0)
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Implementation: `src/supabase.js`, instrumented with error interceptor
  - Features: Auto-refresh tokens, persistent sessions, session detection in URL

**Stripe (Payment Processing):**
- Checkout sessions for plan upgrades
- Billing portal for subscription management
  - SDK/Client: `stripe` (20.0.0)
  - Auth: `VITE_STRIPE_PUBLISHABLE_KEY` (frontend), server-side secret required
  - Implementation: `src/services/billingService.js`, API routes at `/api/billing/checkout` and `/api/billing/portal`

**AWS S3 (File Storage):**
- Presigned URL generation for direct browser uploads
- CloudFront CDN for file delivery
  - SDK/Client: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (3.946.0)
  - Auth: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_URL`
  - Implementation: `vite.config.js` (dev server API route), `src/services/s3UploadService.js`
  - API: `/api/media/presign` (POST)

**Sentry (Error Tracking):**
- Error capture and performance monitoring
- Session replay (production only)
  - SDK/Client: `@sentry/react` (10.36.0)
  - Auth: `VITE_SENTRY_DSN`, `VITE_ERROR_TRACKING_PROVIDER`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - Implementation: `src/utils/errorTracking.jsx`, `src/utils/observability.js`, `src/main.jsx`
  - Features: React error boundaries, tracing (10% sample rate in prod), source map upload

**Resend (Email Service):**
- Transactional emails and alert notifications
  - SDK/Client: `resend` (6.8.0)
  - Auth: `VITE_RESEND_API_KEY`
  - Implementation: `src/services/emailService.js`, `src/services/notificationDispatcherService.js`

**OpenWeather (Weather API):**
- Current weather data for digital signage widgets
  - Auth: `VITE_OPENWEATHER_API_KEY`
  - Implementation: `src/services/weatherService.js`
  - Endpoint: `https://api.openweathermap.org/data/2.5`
  - Caching: 30-minute in-memory cache

**Google APIs:**
- Google Sheets API - Data source integration
  - Auth: `VITE_GOOGLE_API_KEY`
  - Implementation: `src/services/googleSheetsService.js`
  - Endpoint: `https://sheets.googleapis.com/v4/spreadsheets`
- Google Places API - Business reviews
  - Auth: `VITE_GOOGLE_PLACES_API_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_REDIRECT_URI`
  - Implementation: `src/services/social/googleReviewsService.js`
  - OAuth: Google My Business API scopes
  - Endpoints: `https://maps.googleapis.com/maps/api/place`, `https://mybusinessaccountmanagement.googleapis.com/v1`

**Canva (Design Tool Integration):**
- OAuth 2.0 PKCE flow for Canva Connect API
  - Auth: `VITE_CANVA_CLIENT_ID`
  - Implementation: `src/services/canvaService.js`, `src/pages/CanvaCallbackPage.jsx`
  - Callback: `/auth/canva/callback`
  - Endpoint: `https://api.canva.com/rest/v1`

**Cloudinary (Media Processing):**
- Image/video upload and transformation (optional, fallback to S3)
  - Auth: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`
  - Implementation: `src/supabase.js`, `src/services/brandThemeService.js`

**Anthropic (AI Assistant):**
- Content generation and business planning (backend only)
  - Auth: `ANTHROPIC_API_KEY` (server-side)
  - Implementation: `src/services/assistantService.js` (frontend proxy)
  - API: `/api/assistant/plan` (POST)

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` with Row Level Security (RLS)
  - Migrations: `supabase/migrations/` (SQL files)
  - Tables: Users, tenants, screens, campaigns, media, playlists, schedules, etc.

**File Storage:**
- AWS S3 with CloudFront CDN
  - Primary: S3 bucket for media uploads (images, videos, documents)
  - Fallback: Cloudinary (optional)
  - Organization: `/uploads/{mediaType}/{uuid}.{ext}`

**Caching:**
- Browser IndexedDB (offline player caching)
  - Implementation: `src/services/playerService.js`, `idb` package
- In-memory cache (weather data, 30-minute TTL)
  - Implementation: `src/services/weatherService.js`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: OAuth 2.0 PKCE flow, JWT tokens
  - Features: Auto-refresh, persistent sessions, email/password + OAuth providers
  - Context: `src/contexts/AuthContext.jsx`
  - Service: `src/supabase.js`

**SSO/SCIM:**
- Custom SSO implementation
  - Implementation: `src/services/ssoService.js`, `src/services/scimService.js`

## Monitoring & Observability

**Error Tracking:**
- Sentry (10.36.0)
  - Environment-aware (local/staging/production)
  - Pluggable provider system (console fallback)
  - Implementation: `src/utils/errorTracking.jsx`, `src/utils/observability.js`

**Logs:**
- Structured logging service
  - Implementation: `src/services/loggingService.js`
  - Levels: debug, info, warn, error
  - Context: userId, tenantId, scope

**Performance:**
- Web Vitals monitoring
  - Implementation: `src/services/webVitalsService.js`
  - Metrics: CLS, FID, FCP, LCP, TTFB
  - Reporter: Sentry integration

**Health Checks:**
- Application health monitoring
  - Implementation: `src/services/healthService.js`
  - Endpoint: `/api/health`

## CI/CD & Deployment

**Hosting:**
- Vercel (static SPA)
  - Config: `vercel.json`
  - Features: SPA routing, cache headers, security headers, CSP

**CI Pipeline:**
- GitHub Actions
  - Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/load-test.yml`, `.github/workflows/migrations.yml`, `.github/workflows/android-build.yml`
  - Tests: Vitest (unit/integration), Playwright (E2E)
  - Load tests: k6

**Build Process:**
- Vite build with Terser minification
- Console log removal in production
- Source map generation (hidden, uploaded to Sentry)
- Bundle analysis with rollup-plugin-visualizer

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` - S3 uploads

**Production-required:**
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe payments
- `VITE_CLOUDINARY_CLOUD_NAME` - Media processing

**Optional:**
- `VITE_OPENWEATHER_API_KEY` - Weather widget
- `VITE_GOOGLE_API_KEY` - Google Sheets integration
- `VITE_GOOGLE_PLACES_API_KEY` - Google Reviews
- `VITE_CANVA_CLIENT_ID` - Canva integration
- `VITE_RESEND_API_KEY` - Email notifications
- `VITE_SENTRY_DSN` - Error tracking
- `ANTHROPIC_API_KEY` - AI assistant (backend)
- `VITE_CLOUDINARY_UPLOAD_PRESET` - Cloudinary uploads

**Test credentials:**
- `TEST_SUPERADMIN_EMAIL`, `TEST_SUPERADMIN_PASSWORD`
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`
- `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD`
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

**Secrets location:**
- `.env.local` (local development, gitignored)
- `.env` (production, gitignored)
- `.env.example` (template, committed)

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks (implied by billing service, endpoint not visible in frontend code)

**Outgoing:**
- None detected

**OAuth Callbacks:**
- `/auth/canva/callback` - Canva OAuth redirect
- `/auth/callback/google` - Google OAuth redirect (Google My Business)

---

*Integration audit: 2026-02-12*
