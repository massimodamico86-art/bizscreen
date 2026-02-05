# External Integrations

**Analysis Date:** 2026-02-05

## APIs & External Services

**Weather Data:**
- OpenWeatherMap API - Current weather data for location-based widgets
  - SDK/Client: Native fetch
  - Auth: `VITE_OPENWEATHER_API_KEY`
  - Implementation: `src/services/weatherService.js`
  - Usage: Weather widget in scenes
  - Caching: 30-minute in-memory cache
  - Free tier: 1,000 calls/day

**AI/ML:**
- Anthropic Claude API - AI-powered SVG template auto-tagging
  - SDK/Client: Native fetch
  - Auth: `ANTHROPIC_API_KEY` (server-side)
  - Implementation: Referenced in `src/pages/StatusPage.jsx`
  - Usage: Automatic categorization of design templates
  - Fallback: Rule-based tagging if not configured

**Email:**
- Resend - Transactional email service
  - SDK/Client: `resend` npm package v6.8.0
  - Auth: `VITE_RESEND_API_KEY`
  - Implementation: `src/services/emailService.js`
  - Usage: Alert notifications, GDPR emails, approval workflow emails
  - From addresses: `alerts@bizscreen.com`, `privacy@bizscreen.com`, `noreply@bizscreen.com`

**Payments:**
- Stripe - Payment processing and subscription management
  - SDK/Client: `stripe` npm package v20.0.0
  - Auth: Stripe API keys (not in .env.example, likely server-side only)
  - Implementation: `src/services/billingService.js`, `src/services/accountPlanService.js`
  - Usage: Checkout sessions, billing portal, subscription management
  - Plans: Starter, Pro tiers

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` v2.80.0
  - Implementation: `src/supabase.js`
  - Auth flow: PKCE
  - Service role: `SUPABASE_SERVICE_ROLE_KEY` (server-side operations)
  - Migrations: 130 SQL migration files in `supabase/migrations/`
  - Key tables: `tv_devices`, `scenes`, `playlists`, `media_library`, `campaigns`, `webhook_events`, `gdpr_requests`

**File Storage:**
- AWS S3 - Media file storage
  - Connection: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`
  - Client: `@aws-sdk/client-s3` v3.946.0
  - Implementation: `vite.config.js` (presigned URL generation), `src/api/gdpr/delete-s3.js`
  - Usage: User-uploaded images, videos, audio, documents
  - CDN: Optional CloudFront (`AWS_CLOUDFRONT_URL`)
  - Presigned URLs: 15-minute expiry for uploads
  - Allowed types: Images (JPEG, PNG, GIF, WebP, SVG), videos (MP4, WebM, MOV), audio (MP3, WAV, OGG), documents (PDF, Office formats)

**Caching:**
- IndexedDB - Client-side data caching
  - Client: `idb` npm package v8.0.3
  - Implementation: `src/hooks/useDataCache.js`
  - Usage: Offline-first data access, performance optimization

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: `src/contexts/AuthContext.jsx`, `src/supabase.js`
  - Flow: PKCE (Proof Key for Code Exchange)
  - Features: Auto-refresh tokens, persistent sessions, URL-based session detection
  - Role-based access: superadmin, admin, client roles
  - Test users: Seeded via migrations for E2E testing

**Device Pairing:**
- Custom TV device authentication system
  - Token: `VITE_DEVICE_TOKEN`
  - Implementation: `supabase/migrations/0031_tv_pairing_function.sql`
  - Usage: Pairing displays with tenant accounts

## Monitoring & Observability

**Error Tracking:**
- Sentry.io - Error monitoring and performance tracking
  - Client: `@sentry/react` v10.36.0
  - Implementation: `src/utils/errorTracking.jsx`
  - Auth: `VITE_SENTRY_DSN`
  - Features: Error boundary, breadcrumbs, session replay, performance monitoring
  - Environment: Controlled by `VITE_ERROR_TRACKING_PROVIDER` (console/sentry)
  - Sampling: 10% traces in production, 100% in dev
  - Session replay: 10% sample rate, 100% on errors
  - Filters: Ignores network errors, browser extensions, resize observer loops

**Logs:**
- Custom logging service
  - Implementation: `src/services/loggingService.js`
  - Output: Console (dev), optional remote endpoint
  - Remote endpoint: `VITE_LOG_ENDPOINT` (optional)
  - Levels: debug, info, warn, error
  - Scoped loggers per service/component

**Analytics:**
- Web Vitals - Performance metrics
  - Client: `web-vitals` v5.1.0
  - Optional endpoint: `VITE_ANALYTICS_ENDPOINT`
  - Metrics: CLS, FID, LCP, FCP, TTFB

**Status Monitoring:**
- Internal health checks
  - Endpoints: `/api/health/app`, `/api/health/dependencies`
  - Implementation: `src/pages/StatusPage.jsx`, `vite.config.js` (dev)
  - Checks: Supabase connection, screen stats, webhook queue, performance metrics

## CI/CD & Deployment

**Hosting:**
- Platform: Not explicitly configured (likely Vercel or Netlify based on Vite setup)

**CI Pipeline:**
- Test commands configured: `npm run test:ci`
- Pre-commit hooks: Husky + lint-staged
- No explicit CI config files detected

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `AWS_REGION` - AWS region for S3
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_S3_BUCKET` - S3 bucket name

**Optional env vars:**
- `VITE_DEVICE_TOKEN` - TV device pairing token
- `VITE_OPENWEATHER_API_KEY` - Weather API key
- `VITE_SENTRY_DSN` - Sentry error tracking
- `VITE_RESEND_API_KEY` - Email service
- `ANTHROPIC_API_KEY` - AI auto-tagging
- `AWS_CLOUDFRONT_URL` - CDN for media delivery
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin operations
- `GDPR_API_SECRET` - GDPR processing authorization

**Test credentials:**
- Three test roles: superadmin, admin, client
- Credentials in `.env.example`: `TEST_*_EMAIL`, `TEST_*_PASSWORD`
- Seeded via migration: `060_seed_test_data.sql`

**Secrets location:**
- Development: `.env.local` (not committed)
- Production: Hosting platform environment variables
- Server-side: Process environment (AWS, Supabase service keys)

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks (likely, based on Stripe integration)
  - Implementation: Not found in src/api directory structure

**Outgoing:**
- Custom webhook system
  - Table: `webhook_events` in Supabase
  - Migration: `031_public_api_and_webhooks.sql`
  - Status tracking: pending, failed
  - Retry logic: `next_attempt_at` field
  - Monitoring: StatusPage displays pending/failed counts

## GDPR Compliance

**Data Export:**
- Endpoint: `/api/gdpr/process-exports`
- Implementation: `src/api/gdpr/process-exports.js`
- Email notification via Resend
- 30-day link expiration

**Data Deletion:**
- Endpoint: `/api/gdpr/process-deletions`
- Implementation: `src/api/gdpr/process-deletions.js`
- 30-day grace period
- Email notifications: Day 1 (confirmation), Day 7 (reminder), Day 25 (final warning), completion
- Cascade: Deletes from Supabase auth, S3 media files
- S3 deletion: `src/api/gdpr/delete-s3.js`
- Authorization: `GDPR_API_SECRET` bearer token

---

*Integration audit: 2026-02-05*
