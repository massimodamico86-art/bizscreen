# BizScreen Production Roadmap

**Generated:** January 21, 2026
**Based on:** Database schema analysis (102 migrations), package.json review, codebase structure audit

---

## Current State Summary

### What's Already Implemented

| Category | Status | Details |
|----------|--------|---------|
| **Authentication** | Good | Email/password, Google OAuth, password reset, email verification |
| **Authorization** | Good | RBAC (super_admin, admin, client), RLS policies on all tables |
| **Error Handling** | Partial | ErrorBoundary component, error tracking abstraction (Sentry stub) |
| **Logging** | Partial | Client-side logger, activity log service, audit service |
| **Testing** | Good | Vitest unit tests, 34+ Playwright E2E specs, CI pipeline |
| **Security Headers** | Partial | X-Frame-Options, X-XSS-Protection, X-Content-Type-Options (via Vercel) |
| **Rate Limiting** | Documented | Rate limit service exists but implementation unclear |
| **Multi-tenancy** | Good | Full tenant isolation via Supabase RLS |
| **Feature Flags** | Good | featureFlagService with plan-based gating |
| **i18n** | Good | 8+ languages supported |
| **Billing** | Good | Stripe integration with subscriptions |
| **CI/CD** | Partial | GitHub Actions for tests, missing deployment pipeline |

---

## Critical Missing Features

### Priority 1: Security Hardening

#### 1.1 Two-Factor Authentication (2FA/MFA)
**Status:** Not Implemented
**Impact:** High - Required for enterprise customers, security compliance

```
Files to create/modify:
- src/services/mfaService.js
- src/pages/SecuritySettingsPage.jsx
- src/components/TwoFactorSetup.jsx
- supabase/migrations/XXX_mfa_settings.sql
```

**Implementation:**
- TOTP-based 2FA using authenticator apps
- Backup recovery codes
- Remember device option (30 days)
- Enforce 2FA for admin/super_admin roles

---

#### 1.2 Content Security Policy (CSP)
**Status:** Not Implemented
**Impact:** High - Prevents XSS attacks

```
Add to vercel.json headers:
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com;
  frame-src https://js.stripe.com;
```

---

#### 1.3 HSTS Header
**Status:** Not Implemented
**Impact:** Medium - Forces HTTPS

```json
// Add to vercel.json
{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" }
```

---

#### 1.4 CORS Restrictions
**Status:** Too Permissive (`*`)
**Impact:** Medium - Should restrict to known origins

```javascript
// Update to environment-specific origins
const allowedOrigins = [
  'https://bizscreen.app',
  'https://app.bizscreen.app',
  process.env.NODE_ENV === 'development' && 'http://localhost:5173'
].filter(Boolean);
```

---

#### 1.5 Account Security Policies
**Status:** Not Implemented
**Impact:** High

- [ ] Account lockout after 5 failed login attempts (15-minute cooldown)
- [ ] Password strength requirements enforcement
- [ ] Password breach checking (Have I Been Pwned API)
- [ ] Session management (view/revoke active sessions)
- [ ] Login history/notifications

---

### Priority 2: Observability & Monitoring

#### 2.1 Sentry Integration
**Status:** Stub exists, not configured
**Impact:** High - Critical for production error tracking

```bash
npm install @sentry/react @sentry/tracing
```

```javascript
// src/utils/errorTracking.js - Complete the sentry provider
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: config().env,
  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  integrations: [new BrowserTracing()],
});
```

---

#### 2.2 Application Performance Monitoring (APM)
**Status:** Not Implemented
**Impact:** Medium

- [ ] Frontend performance metrics (Web Vitals)
- [ ] API latency tracking
- [ ] Database query performance
- [ ] Real user monitoring (RUM)

**Recommended:** Sentry Performance or Datadog RUM

---

#### 2.3 Structured Logging Backend
**Status:** Client-side only
**Impact:** Medium

- [ ] Centralized log aggregation (CloudWatch, Datadog, or Logtail)
- [ ] Log correlation with request IDs
- [ ] Error alerting rules
- [ ] Log retention policies

---

#### 2.4 Health Check Endpoints
**Status:** Basic `/api/health` exists
**Impact:** Medium

Expand to include:
```javascript
// /api/health/live - Kubernetes liveness
// /api/health/ready - Kubernetes readiness (DB connection check)
// /api/health/detailed - Internal diagnostics (auth required)
{
  status: 'healthy',
  version: '1.0.0',
  uptime: 12345,
  database: { connected: true, latency: 12 },
  cache: { connected: true },
  queue: { connected: true, pending: 0 }
}
```

---

### Priority 3: Data Protection & Compliance

#### 3.1 GDPR Cookie Consent
**Status:** Minimal
**Impact:** High - Legal requirement in EU

- [ ] Cookie consent banner component
- [ ] Granular consent options (necessary, analytics, marketing)
- [ ] Consent storage and audit trail
- [ ] Easy consent withdrawal

---

#### 3.2 Data Export (GDPR Right to Portability)
**Status:** Admin UI exists, needs automation
**Impact:** Medium

- [ ] Self-service data export for users
- [ ] Machine-readable format (JSON)
- [ ] Include all user data (media, playlists, settings)
- [ ] Email notification when export ready

---

#### 3.3 Data Deletion (Right to Erasure)
**Status:** Partial
**Impact:** Medium

- [ ] Self-service account deletion
- [ ] 30-day grace period before permanent deletion
- [ ] Cascade delete all user data
- [ ] Audit trail of deletion requests

---

#### 3.4 Database Backup & Recovery
**Status:** Documented as recommendation
**Impact:** Critical

- [ ] Enable Supabase Point-in-Time Recovery (PITR)
- [ ] Daily automated backups
- [ ] Cross-region backup replication
- [ ] Documented recovery procedures
- [ ] Regular recovery testing (quarterly)

---

### Priority 4: API & Integration

#### 4.1 API Versioning
**Status:** Not Implemented
**Impact:** Medium - Required for stable integrations

```
/api/v1/playlists
/api/v1/screens
/api/v2/playlists  (future)
```

- [ ] Version prefix on all API routes
- [ ] Deprecation headers for old versions
- [ ] Migration guides for breaking changes

---

#### 4.2 API Token Lifecycle
**Status:** Partial (no expiration)
**Impact:** Medium

- [ ] Token expiration dates
- [ ] Token rotation endpoint
- [ ] Last-used tracking
- [ ] Automatic expiration warnings
- [ ] Token scoping improvements

---

#### 4.3 Webhook Reliability
**Status:** Basic implementation
**Impact:** Medium

- [ ] Exponential backoff retry (3 attempts)
- [ ] Dead letter queue for failed webhooks
- [ ] Webhook event replay
- [ ] Signature verification guide
- [ ] Webhook testing endpoint

---

#### 4.4 API Documentation
**Status:** docs/API_REFERENCE.md exists
**Impact:** Low

- [ ] OpenAPI/Swagger spec
- [ ] Interactive API explorer
- [ ] Code samples in multiple languages
- [ ] Postman collection

---

### Priority 5: DevOps & Deployment

#### 5.1 Deployment Pipeline
**Status:** CI exists, CD unclear
**Impact:** High

- [ ] Automated deployment to staging on PR merge
- [ ] Production deployment with approval gates
- [ ] Rollback automation
- [ ] Deployment notifications (Slack)

---

#### 5.2 Environment Management
**Status:** .env.example exists
**Impact:** Medium

- [ ] Secrets management (Vercel/AWS Secrets Manager)
- [ ] Environment parity validation
- [ ] Configuration drift detection

---

#### 5.3 Database Migrations CI
**Status:** Manual
**Impact:** Medium

- [ ] Automated migration in CI/CD
- [ ] Migration rollback scripts
- [ ] Schema diff on PR review
- [ ] Migration dry-run in staging

---

#### 5.4 Blue/Green Deployments
**Status:** Not Implemented
**Impact:** Low (Vercel handles atomic deploys)

---

### Priority 6: Performance & Reliability

#### 6.1 Load Testing Automation
**Status:** Manual scripts exist
**Impact:** Medium

- [ ] Automated load tests in CI (nightly)
- [ ] Performance regression alerts
- [ ] Baseline metrics tracking

---

#### 6.2 CDN Optimization
**Status:** CloudFront configured
**Impact:** Low

- [ ] Cache invalidation automation
- [ ] Edge caching rules review
- [ ] Compression optimization (Brotli)

---

#### 6.3 Database Connection Pooling
**Status:** Supabase Supavisor
**Impact:** Low

- [ ] Connection pool monitoring
- [ ] Query timeout configuration
- [ ] Slow query logging

---

### Priority 7: User Experience

#### 7.1 Progressive Web App (PWA)
**Status:** Not Implemented
**Impact:** Low

- [ ] Service worker for offline support
- [ ] App manifest for installability
- [ ] Push notifications

---

#### 7.2 Accessibility Audit
**Status:** docs/ACCESSIBILITY.md exists
**Impact:** Medium

- [ ] WCAG 2.1 AA compliance audit
- [ ] Automated accessibility testing (axe-core)
- [ ] Screen reader testing
- [ ] Keyboard navigation audit

---

## Implementation Timeline

### Phase 1: Security (Weeks 1-4)
1. 2FA/MFA implementation
2. CSP and HSTS headers
3. Account lockout policies
4. CORS restrictions

### Phase 2: Observability (Weeks 5-6)
1. Sentry full integration
2. Structured logging backend
3. Enhanced health checks

### Phase 3: Compliance (Weeks 7-8)
1. GDPR cookie consent
2. Self-service data export/deletion
3. Database PITR setup

### Phase 4: API Hardening (Weeks 9-10)
1. API versioning
2. Token lifecycle management
3. Webhook reliability

### Phase 5: DevOps (Weeks 11-12)
1. CD pipeline completion
2. Migration automation
3. Load testing automation

---

## Quick Wins (Can Do This Week)

1. **Add HSTS header** - 5 minutes, add to vercel.json
2. **Add CSP header** - 30 minutes, test carefully
3. **Restrict CORS** - 15 minutes, environment-specific
4. **Enable Sentry** - 1 hour, configure DSN and basic setup
5. **Add login attempt limiting** - 2 hours, Supabase rate limiting

---

## Dependencies to Add

```bash
# Security
npm install @sentry/react @sentry/tracing  # Error tracking
npm install otplib qrcode                   # 2FA TOTP

# Monitoring (optional)
npm install web-vitals                      # Performance metrics

# Compliance (optional)
npm install react-cookie-consent            # Cookie banner
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [Vercel Security Headers](https://vercel.com/docs/concepts/projects/headers)
- [Sentry React Setup](https://docs.sentry.io/platforms/javascript/guides/react/)

---

## Existing Documentation

Review these existing docs for implementation details:
- [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) - Current security status
- [COMPLIANCE.md](docs/COMPLIANCE.md) - Compliance features
- [OBSERVABILITY.md](docs/OBSERVABILITY.md) - Monitoring setup
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide
- [PRODUCTION_LAUNCH.md](docs/PRODUCTION_LAUNCH.md) - Launch checklist
