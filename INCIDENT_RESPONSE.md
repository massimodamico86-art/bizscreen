# Incident Response Guide

Structured procedures for handling production incidents in BizScreen.

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV-1** | Critical - Service completely down, all users affected | Immediate (< 15 min) | Login broken for all users, database down |
| **SEV-2** | Major - Key functionality broken, many users affected | < 1 hour | Screens not updating, billing failures |
| **SEV-3** | Minor - Degraded service, some users affected | < 4 hours | Slow page loads, single feature broken |

## Incident Response Flow

```
1. DETECT → 2. ASSESS → 3. MITIGATE → 4. RESOLVE → 5. POST-MORTEM
```

---

## Common Incidents

### 1. Production Login Failures

**Severity:** SEV-1 or SEV-2 depending on scope

#### Detection
- User reports "Cannot log in"
- Smoke tests failing on auth
- Supabase Auth logs showing errors

#### Immediate Actions

1. **Check Supabase status:**
   - Visit https://status.supabase.com
   - If Supabase is down, wait and monitor

2. **Validate environment variables:**
   ```bash
   # Check Vercel env vars are set
   # VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be correct
   ```

3. **Test with known-good credentials:**
   - Try logging in with a test user
   - Check browser console for errors

4. **Check Supabase Auth logs:**
   - Supabase Dashboard > Authentication > Logs
   - Look for rate limiting, invalid requests

#### Workarounds
- If localized to specific users: reset their passwords
- If Supabase issue: wait for resolution, communicate to users

#### Rollback
- If caused by recent deploy: rollback via Vercel dashboard
- If caused by auth config change: revert in Supabase dashboard

---

### 2. Screens Not Showing or Updating Content

**Severity:** SEV-2

#### Detection
- Host reports blank or outdated screens
- Multiple screen offline alerts
- E2E tests failing for screens page

#### Checks

1. **Health check:**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Run smoke tests:**
   ```bash
   npx playwright test tests/e2e/smoke.spec.js
   ```

3. **Check Supabase screens table:**
   - Supabase Dashboard > Table Editor > screens
   - Verify screen records exist and are active

4. **Check screen pairing:**
   - Is the screen's OTP code valid?
   - Is the screen assigned to a playlist?

5. **Check content availability:**
   - Are media files accessible?
   - Is the assigned playlist active?

#### Next Actions

1. **Re-pair the screen:**
   - Generate new pairing code in dashboard
   - Re-enter on the TV

2. **Force content refresh:**
   - In dashboard, reassign playlist
   - Or toggle screen offline/online

3. **Redeploy if code issue:**
   - Check recent commits for screen-related changes
   - Rollback if needed

#### Temporary Fallback
- Display a static fallback image on screens
- Communicate expected resolution time to hosts

---

### 3. Billing / Stripe Issues

**Severity:** SEV-2

#### Detection
- Failed webhook delivery in Stripe dashboard
- Users reporting billing errors
- Subscription status not updating

#### Checks

1. **Stripe Dashboard:**
   - Check webhook delivery status
   - Look for failed events
   - Verify endpoint URL is correct

2. **Verify webhook secret:**
   - Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
   - Secrets rotate when endpoint is recreated

3. **Check Stripe status:**
   - Visit https://status.stripe.com

4. **Review recent changes:**
   - Any changes to billing code?
   - Any changes to Stripe configuration?

#### Actions

1. **Retry failed webhooks:**
   - In Stripe Dashboard, retry failed webhook events

2. **Fix webhook secret if mismatched:**
   - Update env var in Vercel
   - Redeploy

3. **Manual corrections:**
   - If subscription status wrong, manually update in Supabase
   - Document the correction for audit

#### Pause New Features
- If billing is unstable, consider pausing new subscription features
- Communicate with affected users about delays

---

## Escalation

### Who Does What

| Role | Responsibility |
|------|---------------|
| **Owner/Lead Developer** | All incidents until team grows |

### Communication

For SEV-1/SEV-2:
- Acknowledge within response time
- Post updates every 30 minutes during active incident
- Send resolution summary when fixed

## Post-Incident

After resolving any SEV-1 or SEV-2:

1. **Document what happened:**
   - Timeline of events
   - Root cause
   - Actions taken

2. **Identify improvements:**
   - Could we detect this faster?
   - Could we prevent this?
   - Do we need better monitoring?

3. **Create follow-up tasks:**
   - File GitHub issues for improvements
   - Update runbooks if needed

## Quick Reference

| Symptom | First Check | Quick Action |
|---------|-------------|--------------|
| Can't log in | Supabase status page | Check env vars |
| Blank screens | `/api/health` | Re-pair screen |
| Billing error | Stripe dashboard | Retry webhooks |
| Slow pages | Browser network tab | Check Supabase latency |
| Build failing | GitHub Actions logs | Review recent commits |
