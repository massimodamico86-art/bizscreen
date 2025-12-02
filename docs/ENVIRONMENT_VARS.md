# BizScreen Environment Variables

Complete reference for all environment variables used by BizScreen.

---

## Variable Index

| Category | Count | Required |
|----------|-------|----------|
| [Supabase](#supabase) | 6 | Yes |
| [Stripe](#stripe) | 4 | Yes (for billing) |
| [Cloudinary](#cloudinary) | 4 | Yes (for media) |
| [Email](#email) | 2 | Yes (for transactional) |
| [Weather](#weather) | 1 | Optional |
| [Application](#application) | 5 | Partially |
| [AI Services](#ai-services) | 3 | Optional |
| [Security](#security) | 2 | Yes |
| [Enterprise](#enterprise) | 3 | Optional |

---

## Supabase

### Client-Side Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | `https://abc123.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | `eyJhbGc...` | Public anon key (safe for client) |

### Server-Side Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | `https://abc123.supabase.co` | Same as VITE_ version |
| `SUPABASE_ANON_KEY` | Yes | `eyJhbGc...` | Same as VITE_ version |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGc...` | **SECRET** - Bypasses RLS |
| `NEXT_PUBLIC_SUPABASE_URL` | No | `https://abc123.supabase.co` | Alias for compatibility |

### How to Get

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings > API**
4. Copy values from the API section

> **Security:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. Only use in server-side code (API routes).

---

## Stripe

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Yes | `sk_live_xxx` or `sk_test_xxx` | API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_xxx` | Webhook signing secret |
| `STRIPE_PRICE_STARTER_MONTHLY` | Yes | `price_1Abc...` | Starter plan price ID |
| `STRIPE_PRICE_PRO_MONTHLY` | Yes | `price_1Xyz...` | Pro plan price ID |

### How to Get

1. **API Keys:** Stripe Dashboard > Developers > API Keys
2. **Price IDs:** Stripe Dashboard > Products > [Product] > Price ID
3. **Webhook Secret:** Stripe Dashboard > Developers > Webhooks > [Endpoint] > Signing secret

### Test vs Live

| Environment | Key Prefix | Webhook |
|-------------|------------|---------|
| Development | `sk_test_` | Use Stripe CLI: `stripe listen` |
| Production | `sk_live_` | Configure in Stripe Dashboard |

---

## Cloudinary

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_CLOUDINARY_CLOUD_NAME` | Yes | `dmycloud` | Cloud name from dashboard |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Yes | `bizscreen-unsigned` | Unsigned upload preset |
| `CLOUDINARY_API_KEY` | Prod | `123456789012345` | API key for server-side |
| `CLOUDINARY_API_SECRET` | Prod | `abc123xyz...` | API secret for server-side |

### How to Get

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. **Cloud Name:** Dashboard homepage
3. **API Key/Secret:** Settings > Access Keys
4. **Upload Preset:**
   - Settings > Upload > Upload presets
   - Click "Add upload preset"
   - Set Signing Mode: "Unsigned"
   - Set Folder: "bizscreen" (optional)
   - Save and copy preset name

---

## Email

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Yes | `re_abc123...` | Resend API key |
| `ALERT_FROM_EMAIL` | Prod | `alerts@bizscreen.com` | Sender for system alerts |

### How to Get

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys section
3. Create new key with send permissions

### Domain Verification

For production, verify your sending domain:
1. Resend Dashboard > Domains > Add Domain
2. Add DNS records (TXT, CNAME)
3. Wait for verification (~5 min)

---

## Weather

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_OPENWEATHER_API_KEY` | Optional | `abc123def456...` | OpenWeatherMap API key |

### How to Get

1. Sign up at [openweathermap.org](https://openweathermap.org/api)
2. Go to API Keys
3. Copy default key or create new one
4. Wait ~10 minutes for activation

**Free tier:** 1,000 calls/day

---

## Application

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_APP_ENV` | Yes | `production` | Environment: local/staging/production |
| `VITE_APP_NAME` | Yes | `BizScreen` | Application display name |
| `VITE_APP_VERSION` | No | `1.0.0` | App version (auto-detected if not set) |
| `APP_URL` | Local | `http://localhost:5173` | Base URL (auto-set on Vercel) |
| `VITE_ENABLE_AI` | No | `true` | Enable AI assistant features |

### Environment Values

| Value | Use Case | Features |
|-------|----------|----------|
| `local` | Development | Debug logs, mock APIs optional |
| `staging` | Pre-production | Test with real services |
| `production` | Live | Full features, no debug |

---

## Error Tracking

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_ERROR_TRACKING_PROVIDER` | Prod | `sentry` | Provider: console/sentry |
| `ERROR_TRACKING_DSN` | Prod | `https://xxx@sentry.io/xxx` | Sentry DSN |

### Setup Sentry

1. Create project at [sentry.io](https://sentry.io)
2. Get DSN from Project Settings > Client Keys
3. Set both variables

---

## AI Services

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Optional | `sk-xxx...` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Optional | `sk-ant-xxx...` | Anthropic API key |
| `VITE_ENABLE_AI` | No | `true` | Toggle AI features |

At least one AI key required if `VITE_ENABLE_AI=true`.

---

## Security

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `CRON_SECRET` | Prod | `random-32-char-string` | Authenticates cron jobs |
| `VITE_DEVICE_TOKEN` | Prod | `random-32-char-string` | Device pairing secret |
| `API_TOKEN_SECRET` | Prod | `random-32-char-string` | Public API token hashing |

### Generate Secrets

```bash
# Generate secure random secrets
openssl rand -hex 32
```

---

## Enterprise (Optional)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `SSO_ISSUER_URL` | Enterprise | `https://idp.example.com` | SAML/OIDC issuer |
| `SSO_CLIENT_ID` | Enterprise | `bizscreen-prod` | SSO client ID |
| `SSO_CLIENT_SECRET` | Enterprise | `secret123` | SSO client secret |

---

## Environment Matrix

Which variables are required in each environment:

| Variable | Local | Staging | Production |
|----------|-------|---------|------------|
| `VITE_SUPABASE_URL` | Yes | Yes | Yes |
| `VITE_SUPABASE_ANON_KEY` | Yes | Yes | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Yes |
| `STRIPE_SECRET_KEY` | No* | Yes | Yes |
| `STRIPE_WEBHOOK_SECRET` | No* | Yes | Yes |
| `RESEND_API_KEY` | No** | Yes | Yes |
| `CLOUDINARY_*` | Yes | Yes | Yes |
| `CRON_SECRET` | No | Yes | Yes |
| `VITE_APP_ENV` | Yes | Yes | Yes |
| `ERROR_TRACKING_DSN` | No | Optional | Recommended |

*Can use test mode or skip billing features locally
**Emails logged to console in local mode

---

## Quick Copy Template

```bash
# === REQUIRED ===

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_PRO_MONTHLY=

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
RESEND_API_KEY=

# App
VITE_APP_ENV=production
VITE_APP_NAME=BizScreen

# Security
CRON_SECRET=
VITE_DEVICE_TOKEN=

# === OPTIONAL ===

# Weather
VITE_OPENWEATHER_API_KEY=

# AI
VITE_ENABLE_AI=false
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Error Tracking
VITE_ERROR_TRACKING_PROVIDER=console
ERROR_TRACKING_DSN=
```

---

## Troubleshooting

### "Missing environment variable" errors

1. Check variable is set in Vercel Dashboard
2. Verify correct environment (Production vs Preview)
3. Redeploy after adding variables

### Supabase connection fails

1. Verify URL format: `https://project-ref.supabase.co`
2. Check service role key is complete (long JWT)
3. Verify project is not paused

### Stripe webhooks not working

1. Confirm endpoint URL is correct
2. Verify webhook secret (starts with `whsec_`)
3. Check Stripe Dashboard for delivery logs

### Cloudinary uploads fail

1. Verify cloud name is correct
2. Check upload preset is "Unsigned"
3. Confirm API keys for server-side operations

---

*Reference: [.env.example](../.env.example) | Updated: Phase 44*
