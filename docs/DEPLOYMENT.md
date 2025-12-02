# BizScreen Deployment Guide

This guide covers deploying BizScreen to production environments.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Vercel Deployment](#vercel-deployment)
- [Supabase Configuration](#supabase-configuration)
- [Stripe Setup](#stripe-setup)
- [Domain & White-Labeling](#domain--white-labeling)
- [Mobile App Distribution](#mobile-app-distribution)
- [Monitoring & Alerting](#monitoring--alerting)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BizScreen Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │  API Routes  │    │    Mobile    │      │
│  │   (React)    │    │  (Vercel)    │    │   Players    │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                   ┌─────────▼─────────┐                        │
│                   │     Supabase      │                        │
│                   │  (PostgreSQL +    │                        │
│                   │   Auth + RLS)     │                        │
│                   └───────────────────┘                        │
│                                                                  │
│  External Services:                                              │
│  • Stripe (billing)                                             │
│  • Cloudinary (media CDN)                                       │
│  • Resend (email)                                               │
│  • OpenWeatherMap (weather widget)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- Vercel account
- Supabase project
- Stripe account
- Cloudinary account
- Resend account (for emails)

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase (Client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase (Server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Keep this secret!

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-preset

# Email
RESEND_API_KEY=re_...

# Weather (optional)
VITE_OPENWEATHER_API_KEY=...

# App Configuration
VITE_APP_ENV=production
VITE_APP_NAME=BizScreen
VITE_APP_VERSION=1.0.0
VITE_ERROR_TRACKING_PROVIDER=sentry  # or 'console'
# ERROR_TRACKING_DSN=https://...@sentry.io/...

# AI Features (optional)
VITE_ENABLE_AI=true
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Environment Hierarchy

| Environment | VITE_APP_ENV | Use Case |
|------------|--------------|----------|
| Local | `local` | Development on localhost |
| Staging | `staging` | Pre-production testing |
| Production | `production` | Live customer traffic |

---

## Vercel Deployment

### Initial Setup

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and link project
   vercel login
   vercel link
   ```

2. **Configure Project Settings**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

3. **Set Environment Variables**
   ```bash
   # Add each variable
   vercel env add SUPABASE_URL
   vercel env add STRIPE_SECRET_KEY
   # ... etc
   ```

### Deployment Environments

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
vercel --prod --scope your-org
```

### Cron Jobs

Vercel handles these automatically based on `vercel.json`:

| Job | Schedule | Description |
|-----|----------|-------------|
| `/api/monitoring/run-offline-alerts` | Every 15 min | Check offline devices |
| `/api/webhooks/dispatch` | Every 5 min | Process webhook queue |
| `/api/analytics/run-weekly-reports` | Monday 9am | Weekly analytics emails |
| `/api/analytics/run-monthly-reports` | 1st of month | Monthly analytics emails |
| `/api/demo/reset-stale-tenants` | Every hour | Reset stale demo tenants |

**Demo Reset Cron Setup:**

Add `CRON_SECRET` to your environment variables:
```bash
vercel env add CRON_SECRET
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/demo/reset-stale-tenants",
      "schedule": "0 * * * *"
    }
  ]
}
```

See [DEMO_MODE.md](./DEMO_MODE.md) for full demo system documentation.

---

## Supabase Configuration

### Production Checklist

1. **Enable Row Level Security (RLS)**
   - All tables must have RLS enabled
   - Verify policies in `supabase/migrations/`

2. **Configure Auth Settings**
   ```
   Dashboard → Authentication → Settings
   - Enable email confirmations
   - Set password requirements
   - Configure allowed redirect URLs
   ```

3. **Set Up Database Backups**
   ```
   Dashboard → Database → Backups
   - Enable Point-in-Time Recovery (Pro plan)
   - Configure backup schedule
   ```

4. **API Rate Limits**
   ```
   Dashboard → Settings → API
   - Review rate limits for your plan
   - Adjust if needed for high-traffic
   ```

### Required RPC Functions

Ensure these functions exist (from migrations):

- `claim_pairing_code` - Device pairing
- `get_player_content` - Player content fetch
- `player_heartbeat` - Device heartbeat
- `get_pending_device_command` - Command polling
- `validate_api_token` - Public API auth

---

## Stripe Setup

### Products & Prices

1. **Create Products**
   ```
   Dashboard → Products
   - Starter Plan ($29/mo)
   - Pro Plan ($99/mo)
   ```

2. **Get Price IDs**
   - Copy price IDs (price_xxx)
   - Add to environment variables

3. **Configure Webhook**
   ```
   Dashboard → Developers → Webhooks
   Endpoint URL: https://your-domain.com/api/billing/webhook

   Events to listen for:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - checkout.session.completed
   - invoice.payment_succeeded
   - invoice.payment_failed
   ```

### Testing

Use Stripe test mode before going live:
- Test card: `4242 4242 4242 4242`
- Test webhook: `stripe listen --forward-to localhost:5173/api/billing/webhook`

---

## Domain & White-Labeling

### Custom Domains

1. **Add Domain in Vercel**
   ```
   Vercel Dashboard → Your Project → Settings → Domains
   ```

2. **Configure DNS**
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or A record for apex domains

3. **Register in BizScreen**
   - Use API: `POST /api/domains/add`
   - Or through the admin UI

### White-Label Setup

For enterprise customers:

1. **Configure branding in Settings**
   - Logo, colors, favicon
   - Email templates

2. **Set up custom domain**
   - Point their domain to your Vercel deployment
   - Add domain in `/api/domains/add`

---

## Mobile App Distribution

See [MOBILE.md](./MOBILE.md) for detailed mobile app setup.

### Quick Start

1. **Android**
   - Sign APK with release keystore
   - Upload to Google Play Console
   - Use Internal Testing track first

2. **iOS** (if applicable)
   - Configure in Xcode
   - Submit to App Store Connect
   - Use TestFlight for beta testing

---

## Monitoring & Alerting

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/app` | App version, uptime, environment |
| `GET /api/health/dependencies` | External service status |

### Setting Up Alerts

1. **Vercel Analytics**
   - Enable in Vercel Dashboard
   - Set up error budget alerts

2. **Uptime Monitoring**
   - Use UptimeRobot, Better Stack, or similar
   - Monitor `/api/health/app` endpoint
   - Alert on 5xx responses

3. **Custom Alerts**
   - Offline device threshold alerts (built-in)
   - Webhook failure alerts

### Error Tracking

Configure Sentry:

```bash
# In .env
VITE_ERROR_TRACKING_PROVIDER=sentry
ERROR_TRACKING_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Backup Strategy

### Database Backups

1. **Supabase Managed Backups**
   - Pro plan includes daily backups
   - Point-in-Time Recovery available

2. **Manual Exports**
   ```bash
   # Export schema
   supabase db dump -f schema.sql --schema-only

   # Export data
   supabase db dump -f data.sql --data-only
   ```

### Media Backups

Cloudinary handles media redundancy. For additional safety:

1. Enable Cloudinary auto-backup
2. Configure backup folder
3. Set retention policy

### Configuration Backups

Keep in version control:
- `vercel.json`
- `supabase/migrations/`
- `.env.example` (template only)

---

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check Node version
node --version  # Should be 20+

# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

**Supabase Connection Issues**
- Verify SUPABASE_URL format
- Check RLS policies
- Confirm service role key is correct

**Stripe Webhook Failures**
- Verify webhook secret
- Check endpoint URL
- Review Stripe Dashboard logs

**CORS Errors**
- Check `vercel.json` headers
- Verify API route CORS setup

### Logs

```bash
# Vercel function logs
vercel logs your-deployment-url

# Local development
npm run dev
# Check browser console and terminal
```

### Support Contacts

- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com

---

## Security Checklist

Before going live:

- [ ] All environment variables set
- [ ] RLS enabled on all tables
- [ ] Stripe webhook secret configured
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] Error tracking configured
- [ ] Database backups enabled
- [ ] Secrets rotated from development
- [ ] Auth email templates customized
- [ ] Privacy policy and ToS added
