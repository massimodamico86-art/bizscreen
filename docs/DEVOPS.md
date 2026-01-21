# DevOps Guide

This document describes the CI/CD pipeline, deployment procedures, and operational workflows for BizScreen.

## Overview

BizScreen uses:
- **GitHub Actions** for CI/CD
- **Vercel** for hosting and deployment
- **Supabase** for database and authentication
- **k6** for load testing

## CI/CD Pipeline

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | Push/PR to main | Unit tests, integration tests, E2E tests |
| `deploy.yml` | Push to main, manual | Build, migrate, deploy to staging/production |
| `migrations.yml` | PR with migrations, manual | Analyze and apply database migrations |
| `load-test.yml` | Nightly, manual | Performance and load testing |

### Pipeline Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Commit    │────▶│   CI Tests  │────▶│   Build     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Production │◀────│   Staging   │◀────│  Migrations │
│  (manual)   │     │  (auto)     │     │  (staging)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Deployment

### Automatic Staging Deployment

Every push to `main` triggers:
1. Unit and integration tests
2. E2E tests with Playwright
3. Build optimization
4. Database migrations (staging)
5. Deploy to staging
6. Smoke tests

### Manual Production Deployment

Production deployments require manual approval:

1. Go to Actions > Deploy
2. Click "Run workflow"
3. Select environment: `production`
4. Confirm the deployment

### Local Deployment

Use the deployment script:

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

### Rollback

**Automatic**: If production deployment fails, the workflow automatically rolls back to the previous version.

**Manual**: Through Vercel dashboard or CLI:

```bash
# List recent deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-url>
```

## Database Migrations

### Migration Naming Convention

```
NNN_description.sql
```

- `NNN`: Three-digit sequence number (e.g., 107)
- `description`: Lowercase with underscores (e.g., `api_hardening`)

### Creating Migrations

```bash
# Create new migration file
supabase migration new my_migration_name

# Generate migration from schema changes
supabase db diff --schema public > supabase/migrations/NNN_description.sql
```

### Migration Workflow

1. **PR Created**: Migrations are analyzed automatically
2. **PR Review**: Team reviews migration changes
3. **Merge to Main**: Migrations apply to staging
4. **Production Deploy**: Migrations apply to production (with backup)

### Manual Migration Commands

```bash
# Check pending migrations
supabase db diff --schema public

# Apply migrations
supabase db push

# Reset local database
supabase db reset

# View migration history
supabase migration list
```

## Load Testing

### Test Types

| Type | Purpose | VUs | Duration |
|------|---------|-----|----------|
| Smoke | Quick validation | 1 | 1 minute |
| Load | Standard load | 10-50 | 5 minutes |
| Stress | Find breaking point | 10-150 | 20 minutes |
| Soak | Stability test | 20-30 | 30+ minutes |

### Running Load Tests

**Via GitHub Actions:**
1. Go to Actions > Load Testing
2. Click "Run workflow"
3. Select test type and parameters

**Locally:**

```bash
# Install k6
brew install k6  # macOS
# or: sudo apt install k6  # Ubuntu

# Run smoke test
k6 run --env BASE_URL=http://localhost:5173 tests/load/k6-test.js

# Run load test with custom params
k6 run \
  --env BASE_URL=https://staging.bizscreen.app \
  --env TEST_TYPE=load \
  --env DURATION=5m \
  --env VUS=20 \
  tests/load/k6-test.js
```

### Performance Thresholds

| Metric | Smoke | Load | Stress |
|--------|-------|------|--------|
| p95 Response Time | <3s | <2s | <5s |
| Error Rate | <10% | <5% | <20% |
| Failed Requests | <1% | <5% | <10% |

## Environment Configuration

### Required Secrets (GitHub)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI access token |
| `SUPABASE_PROJECT_REF` | Staging project reference |
| `SUPABASE_PROJECT_REF_PROD` | Production project reference |
| `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook |
| `TEST_USER_EMAIL` | E2E test user email |
| `TEST_USER_PASSWORD` | E2E test user password |

### Environments

| Environment | URL | Branch | Supabase |
|-------------|-----|--------|----------|
| Development | localhost:5173 | any | local |
| Staging | staging.bizscreen.app | main | staging project |
| Production | app.bizscreen.app | main (manual) | production project |

## Monitoring & Alerts

### Deployment Notifications

Slack notifications are sent for:
- Staging deployments (success/failure)
- Production deployments (success/failure)
- Migration status
- Rollback events
- Load test results

### Health Checks

The `/api/health` endpoint returns:
- Database connectivity
- Auth service status
- Storage service status
- Overall health status

## Troubleshooting

### Build Failures

1. Check the CI logs for specific errors
2. Run `npm run build` locally to reproduce
3. Ensure all environment variables are set

### Migration Failures

1. Check migration syntax locally: `supabase db reset`
2. Review the migration for destructive operations
3. Check for constraint violations

### Deployment Failures

1. Check Vercel deployment logs
2. Verify environment variables in Vercel
3. Check for build size limits

### Rollback Procedures

**Application:**
```bash
vercel rollback <previous-deployment-url>
```

**Database:**
1. Restore from Supabase backup (Dashboard > Database > Backups)
2. Or apply a reversal migration

## Best Practices

1. **Always test locally** before pushing migrations
2. **Use feature flags** for major changes
3. **Monitor after deployment** for errors
4. **Keep migrations small** and focused
5. **Document breaking changes** in PR descriptions
6. **Run load tests** before major releases
