# Production Runbook

Practical guidance for operating BizScreen in production.

## Overview

BizScreen is a digital signage platform for vacation rentals and hospitality businesses. The system consists of:

| Component | Description | Technology |
|-----------|-------------|------------|
| **Dashboard** | Admin interface for managing content, screens, playlists | React, Vite, Tailwind CSS |
| **TV Display** | Content rendering for screens | React with fullscreen mode |
| **Database** | User data, content, screen configs | Supabase (PostgreSQL) |
| **Auth** | User authentication and sessions | Supabase Auth |
| **Storage** | Media files (images, videos) | Supabase Storage / Cloudinary |
| **Billing** | Subscription management | Stripe |
| **CI/CD** | Automated testing and deployment | GitHub Actions, Vercel |

## Environments

| Environment | URL | Supabase Project | Env Vars Location |
|-------------|-----|------------------|-------------------|
| **Local** | `http://localhost:5173` | Local Docker or dev project | `.env.local` |
| **Staging** | TODO | TODO | Vercel Console |
| **Production** | TODO | TODO | Vercel Console |

### Environment Variables

Required environment variables for production:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# For API routes
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (if billing enabled)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

## Health Checks

### `/api/health` Endpoint

The health endpoint provides a quick status check:

```bash
curl https://your-domain.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

**Response codes:**
- `200` - Application is healthy
- `503` - Application is unhealthy (check logs)

### Smoke Tests

Run smoke tests against any environment:

```bash
# Against production
TEST_USER_EMAIL=test@example.com \
TEST_USER_PASSWORD=testpass123 \
BASE_URL=https://your-domain.com \
npx playwright test tests/e2e/smoke.spec.js
```

Smoke tests verify:
- Application loads without errors
- Static assets load correctly
- Authentication works
- Dashboard is accessible
- No JavaScript errors in console

## Common Operations

### Restart a Deployment

**Vercel:**
1. Go to Vercel Dashboard > Project > Deployments
2. Find current production deployment
3. Click "..." menu > "Redeploy"

**Or trigger via git:**
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

### Rotate Supabase Keys

1. Go to Supabase Dashboard > Settings > API
2. Generate new anon key (if needed)
3. Update environment variables in Vercel Console
4. Redeploy the application
5. Verify login still works
6. Revoke old keys after confirming

### Apply Supabase Migrations

```bash
# Link to production project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push

# Verify
npx supabase db diff
```

**Important:** Always test migrations on staging first. Migrations are forward-only.

### Clear Browser Cache Issues

If users report stale content:

1. Check Vercel deployment timestamp
2. Advise user to hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Check if service worker needs update (if applicable)

## Monitoring

### Where to Look for Errors

| Issue Type | Where to Check |
|------------|----------------|
| Frontend errors | Browser console, `/api/logs/browser` |
| API errors | Vercel Function logs |
| Database errors | Supabase Dashboard > Logs |
| Auth errors | Supabase Dashboard > Auth > Logs |
| CI failures | GitHub Actions |

### Supabase Dashboard Locations

- **Database Logs:** Project > Database > Logs
- **Auth Logs:** Project > Authentication > Logs
- **Storage Logs:** Project > Storage > Logs
- **API Usage:** Project > Reports

### GitHub Actions

View CI runs: `https://github.com/massimodamico86-art/bizscreen/actions`

CI runs on every PR and includes:
- Unit & Integration tests
- E2E tests (including smoke tests)
- Build verification

## Useful Commands

```bash
# Run all tests locally
npm test -- --run

# Run E2E tests
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass123 npm run test:e2e

# Run only smoke tests
npx playwright test tests/e2e/smoke.spec.js

# Check Supabase status
npx supabase status

# View recent migrations
npx supabase migration list
```

## Quick Reference

| Action | Command/Location |
|--------|------------------|
| Check health | `curl /api/health` |
| View CI status | GitHub Actions tab |
| View deploy logs | Vercel Dashboard |
| View DB logs | Supabase Dashboard > Logs |
| Redeploy | Vercel Dashboard or push to main |
| Run smoke tests | `npx playwright test tests/e2e/smoke.spec.js` |
