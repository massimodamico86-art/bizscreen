# BizScreen Production Launch Guide

A step-by-step checklist to take BizScreen from code to live production.

> **Estimated time:** 2-4 hours for a complete setup

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase Setup](#2-supabase-setup)
3. [Stripe Setup](#3-stripe-setup)
4. [Vercel Deployment](#4-vercel-deployment)
5. [DNS Configuration](#5-dns-configuration)
6. [Post-Deploy Verification](#6-post-deploy-verification)
7. [Admin & Demo Setup](#7-admin--demo-setup)
8. [Day 1 Operations Runbook](#8-day-1-operations-runbook)

---

## 1. Prerequisites

Before starting, ensure you have:

| Service | Account Type | Purpose |
|---------|--------------|---------|
| **GitHub** | Owner access to repo | Code deployment |
| **Vercel** | Pro or Team | Hosting + Cron jobs |
| **Supabase** | Pro plan recommended | Database + Auth |
| **Stripe** | Live mode enabled | Billing |
| **Cloudinary** | Free tier OK | Media CDN |
| **Resend** | Verified domain | Transactional emails |
| **Domain registrar** | DNS access | Custom domain |

### Tools to Install

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Install Vercel CLI
npm install -g vercel

# Install Stripe CLI (for webhook testing)
brew install stripe/stripe-cli/stripe
```

---

## 2. Supabase Setup

### 2.1 Create Production Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Configure:
   - **Name:** `bizscreen-production`
   - **Database Password:** Generate a strong password and save it
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
4. Wait for project to provision (~2 minutes)

### 2.2 Get API Credentials

Go to **Project Settings > API** and copy:

| Variable | Location |
|----------|----------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (keep secret!) |

### 2.3 Apply Database Migrations

```bash
# Login to Supabase CLI
supabase login

# Link to your production project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations in order
supabase db push

# Verify migrations applied
supabase db status
```

**Migration files location:** `supabase/migrations/*.sql`

The migrations will create:
- All tables with RLS policies
- Helper functions (get_my_role, is_super_admin, etc.)
- RPC functions for player, campaigns, webhooks
- Performance indexes
- Seed data (plans, demo content)

### 2.4 Configure Authentication

Go to **Authentication > Settings**:

1. **Site URL:** `https://your-domain.com`
2. **Redirect URLs:** Add:
   ```
   https://your-domain.com/auth/callback
   https://your-domain.com/reset-password
   ```
3. **Email templates:** Customize (optional but recommended)
4. **Password requirements:** Set minimum 8 characters

### 2.5 Enable RLS Verification

Run this query in Supabase SQL Editor to verify RLS is enabled:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

## 3. Stripe Setup

### 3.1 Create Products & Prices

In Stripe Dashboard (**Products > Add Product**):

| Product | Price | Billing | Features |
|---------|-------|---------|----------|
| **Starter** | $29/month | Monthly | 5 screens, 1GB storage |
| **Pro** | $99/month | Monthly | 25 screens, 10GB storage, campaigns |

After creating, copy the **Price IDs** (format: `price_xxx`).

### 3.2 Configure Webhook

Go to **Developers > Webhooks > Add endpoint**:

1. **Endpoint URL:** `https://your-domain.com/api/billing/webhook`
2. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
3. Copy the **Signing secret** (format: `whsec_xxx`)

### 3.3 Get API Keys

Go to **Developers > API Keys**:

| Mode | Variable | Format |
|------|----------|--------|
| Test | For staging | `sk_test_xxx` |
| Live | For production | `sk_live_xxx` |

---

## 4. Vercel Deployment

### 4.1 Connect Repository

```bash
# Login to Vercel
vercel login

# Link repository (run from project root)
vercel link

# Select: Create new project
# Framework: Vite
# Build Command: npm run build
# Output Directory: dist
```

### 4.2 Set Environment Variables

Add all variables in Vercel Dashboard (**Settings > Environment Variables**):

```bash
# Or use CLI:
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRICE_STARTER_MONTHLY production
vercel env add STRIPE_PRICE_PRO_MONTHLY production
vercel env add VITE_CLOUDINARY_CLOUD_NAME production
vercel env add VITE_CLOUDINARY_UPLOAD_PRESET production
vercel env add RESEND_API_KEY production
vercel env add CRON_SECRET production
vercel env add VITE_APP_ENV production
vercel env add VITE_APP_NAME production
```

**Full variable list:** See [ENVIRONMENT_VARS.md](./ENVIRONMENT_VARS.md)

### 4.3 Verify Cron Jobs

The following crons are auto-configured in `vercel.json`:

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/monitoring/run-offline-alerts` | Every 15 min | Device monitoring |
| `/api/webhooks/dispatch` | Every 5 min | Webhook delivery |
| `/api/analytics/run-weekly-reports` | Monday 9am UTC | Weekly reports |
| `/api/analytics/run-monthly-reports` | 1st of month 9am | Monthly reports |
| `/api/billing/run-trial-expiration` | Every hour | Trial expiry check |

### 4.4 Deploy to Production

```bash
# Deploy to production
vercel --prod

# Verify deployment
curl https://your-domain.com/api/health/app
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "version": "1.0.0"
}
```

---

## 5. DNS Configuration

### 5.1 Main Domain Setup

In Vercel Dashboard (**Settings > Domains**):

1. Click **Add Domain**
2. Enter your domain (e.g., `app.bizscreen.com`)
3. You'll see DNS records to add:

For **subdomain** (recommended):
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

For **apex domain** (root):
```
Type: A
Name: @
Value: 76.76.21.21
```

### 5.2 Verify SSL

- SSL is automatic via Let's Encrypt
- Verify at: `https://your-domain.com`
- Check certificate in browser

### 5.3 White-Label Domains (Optional)

For customer custom domains:

1. Customer adds CNAME: `their-app.customer.com → cname.vercel-dns.com`
2. Add domain in Vercel: **Settings > Domains > Add**
3. Register in BizScreen database (see Admin Setup)

---

## 6. Post-Deploy Verification

### 6.1 Smoke Test Checklist

Run through each test manually:

| Test | URL/Action | Expected |
|------|------------|----------|
| **Health check** | `GET /api/health/app` | `{"status":"ok"}` |
| **Dependencies** | `GET /api/health/dependencies` | All services healthy |
| **Login page** | `/login` | Form renders |
| **Sign up** | Create test account | Email confirmation sent |
| **Password reset** | Request reset | Email sent |
| **Dashboard** | `/dashboard` | Loads with stats |
| **Screens** | `/screens` | List/create works |
| **Playlists** | `/playlists` | CRUD works |
| **Media upload** | Upload image | Cloudinary stores it |
| **Campaigns** | `/campaigns` | Create/schedule works |
| **Templates** | `/templates` | Browse works |
| **Settings** | `/settings` | Save works |
| **Billing** | Start checkout | Stripe opens |
| **Webhook** | Complete payment | Subscription created |

### 6.2 Player Tests

| Test | Method | Expected |
|------|--------|----------|
| **TV Player** | Open `/tv?listingId=xxx` | Content displays |
| **Pairing** | Generate code, enter on device | Device pairs |
| **Content sync** | Update playlist | Player refreshes |
| **Offline mode** | Disconnect network | Cached content plays |

### 6.3 Mobile Tests

| Test | Device | Expected |
|------|--------|----------|
| **Dashboard** | Mobile browser | Responsive layout |
| **Player app** | Android/iOS | Pairs and plays |
| **QR scan** | Scan pairing QR | Device connects |

### 6.4 AI Assistant Test (if enabled)

```bash
# Set environment
VITE_ENABLE_AI=true
OPENAI_API_KEY=sk-xxx
# or
ANTHROPIC_API_KEY=sk-ant-xxx
```

Test at `/assistant` - should generate content.

---

## 7. Admin & Demo Setup

See [ADMIN_AND_DEMO_SETUP.md](./ADMIN_AND_DEMO_SETUP.md) for detailed instructions.

### Quick Start

#### Create Super Admin

```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'admin@yourdomain.com';
```

#### Create Demo Tenant

```sql
-- Call the demo creation RPC
SELECT create_demo_tenant(
  p_email := 'demo@example.com',
  p_demo_duration_hours := 24
);
```

#### Test Billing Flow

1. Create account with test email
2. Go to Settings > Plan
3. Click "Upgrade to Pro"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify subscription in Supabase: `SELECT * FROM subscriptions`

---

## 8. Day 1 Operations Runbook

### Monitoring Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **Service Quality** | `/service-quality` | Screen health, uptime |
| **Status** | `/status` | System status overview |
| **Ops Console** | `/ops-console` | Admin operations |
| **Analytics** | `/analytics` | Usage metrics |

### Common Issues & Fixes

#### Device Goes Offline

1. Check `/service-quality` for offline devices
2. Verify last heartbeat time
3. Possible causes:
   - Network issue at device location
   - Device powered off
   - Player app crashed
4. Actions:
   - Wait for auto-reconnect (15 min)
   - Remote reboot via device commands
   - Contact location if persistent

#### Campaign Not Appearing

1. Check campaign status in `/campaigns`
2. Verify:
   - Start/end dates are correct
   - Campaign is "Active"
   - Target screens are assigned
   - Priority is higher than competing campaigns
3. Force refresh:
   ```sql
   -- Trigger content recalculation
   SELECT get_resolved_player_content('screen_id_here');
   ```

#### Stripe Webhook Error

1. Check Vercel function logs:
   ```bash
   vercel logs https://your-domain.com --since 1h
   ```
2. Check Stripe Dashboard > Developers > Webhooks > Attempts
3. Common fixes:
   - Verify `STRIPE_WEBHOOK_SECRET` is correct
   - Check function isn't timing out
   - Resend failed events in Stripe

#### Supabase Outage

1. Check [status.supabase.com](https://status.supabase.com)
2. What happens:
   - Auth fails (users can't login)
   - Data fetches fail
   - Players continue with cached content
3. Actions:
   - Wait for Supabase recovery
   - Monitor health endpoint
   - Communicate with users if extended

### Log Locations

| Service | Where | How to Access |
|---------|-------|---------------|
| **Vercel Functions** | Vercel Dashboard | `vercel logs` CLI or Dashboard |
| **Supabase** | SQL Logs | Dashboard > Logs |
| **Stripe** | Events | Dashboard > Developers > Events |
| **Client Errors** | Browser Console | DevTools + Error tracking |

### First 24 Hours Checklist

- [ ] All smoke tests passing
- [ ] At least one test device paired
- [ ] Test billing flow completed
- [ ] Super admin account created
- [ ] Demo tenant available
- [ ] Monitoring dashboards reviewed
- [ ] Error tracking receiving events
- [ ] Cron jobs executed at least once
- [ ] Webhook delivery confirmed

### Emergency Contacts

| Service | Support |
|---------|---------|
| Vercel | [vercel.com/support](https://vercel.com/support) |
| Supabase | [supabase.com/support](https://supabase.com/support) |
| Stripe | [support.stripe.com](https://support.stripe.com) |
| Cloudinary | [support.cloudinary.com](https://support.cloudinary.com) |

---

## Next Steps

After successful launch:

1. **Set up uptime monitoring** (UptimeRobot, Better Stack)
2. **Configure error tracking** (Sentry)
3. **Enable Vercel Analytics**
4. **Set up database backups** (Supabase Pro)
5. **Document runbooks** for your team
6. **Create onboarding flow** for new customers

---

*Last updated: Phase 44 - Production Launch Preparation*
