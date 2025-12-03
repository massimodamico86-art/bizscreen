# Quotas and Usage Tracking Guide

Phase 16 implementation of feature usage tracking, quota enforcement, and billing preparation.

## Overview

BizScreen tracks usage of key features and enforces monthly quotas based on subscription plan. This enables:
- **Fair usage**: Prevent abuse and ensure service quality
- **Upgrade incentives**: Guide users to appropriate plans
- **Billing preparation**: Foundation for metered billing

## Tracked Features

| Feature | Key | Description |
|---------|-----|-------------|
| AI Assistant | `ai_assistant` | AI content generation requests |
| Campaigns | `campaigns` | Campaign creations |
| Audit Logs | `audit_logs` | Audit log entries |
| API Calls | `api_calls` | External API requests |
| Screen Groups | `screen_groups` | Screen group operations |
| Bulk Operations | `bulk_operations` | Batch actions |
| Webhooks | `webhooks` | Webhook deliveries |

## Quota Limits by Plan

| Feature | Free | Starter | Pro | Enterprise | Reseller |
|---------|------|---------|-----|------------|----------|
| AI Assistant | 10/mo | 50/mo | 200/mo | Unlimited | Unlimited |
| Campaigns | 2/mo | 10/mo | 50/mo | Unlimited | Unlimited |
| Audit Logs | 100/mo | 1,000/mo | 10,000/mo | Unlimited | Unlimited |
| API Calls | 100/mo | 1,000/mo | 10,000/mo | Unlimited | Unlimited |
| Screen Groups | 1/mo | 10/mo | 100/mo | Unlimited | Unlimited |
| Bulk Operations | 5/mo | 50/mo | 500/mo | Unlimited | Unlimited |
| Webhooks | 10/mo | 100/mo | 1,000/mo | Unlimited | Unlimited |

## How Quotas Work

### Resolution Priority (highest to lowest)

1. **Tenant Override (Unlimited)** - Tenant marked as unlimited for feature
2. **Tenant Override (Custom Limit)** - Custom monthly limit set for tenant
3. **Plan Quota** - Default quota from subscription plan
4. **Default (No Limit)** - If no quota defined, feature is unlimited

### Enforcement Flow

```
Request → Feature Check → Quota Check → Execute → Track Usage
                              ↓
                      Quota Exceeded?
                              ↓
                        429 Error
```

## API Integration

### Protecting an Endpoint with Quota Check

```javascript
import { withQuotaCheck } from '../lib/usageTracker.js';

export default withQuotaCheck('ai_assistant', async (req, res, context, quotaStatus) => {
  // Your handler code here
  // quotaStatus contains: { currentUsage, quota, remaining, isUnlimited }

  return res.status(200).json({ success: true });
});
```

### Manual Quota Check

```javascript
import { assertWithinQuota, trackUsage } from '../lib/usageTracker.js';

// Check before action
await assertWithinQuota(tenantId, 'campaigns', planSlug);

// Track after success
await trackUsage(req, 'campaigns', 1);
```

### Quota Error Response

When quota is exceeded, APIs return:

```json
{
  "error": "Quota exceeded for Campaign Creations. Used 50 of 50 (pro plan). Upgrade your plan or wait until next month.",
  "code": "QUOTA_EXCEEDED",
  "featureKey": "campaigns",
  "currentUsage": 50,
  "quota": 50,
  "planSlug": "pro",
  "upgradeUrl": "/account/plan"
}
```

## Frontend Integration

### Using the Usage Service

```javascript
import { getUsageSummary, getQuotaStatus } from '../services/usageService';

// Get all quota statuses
const summary = await getUsageSummary();
console.log(summary.data.quotas);

// Get specific feature status
const aiStatus = await getQuotaStatus('ai_assistant');
console.log(aiStatus.remaining); // Uses left this month
```

### Usage Status Colors

| Percentage | Status | Color |
|------------|--------|-------|
| 0-69% | OK | Green |
| 70-94% | Warning | Yellow |
| 95-99% | Critical | Red |
| 100%+ | Exceeded | Dark Red |

## Database Schema

### usage_events Table

```sql
CREATE TABLE usage_events (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    feature_key TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### quota_overrides Table

```sql
CREATE TABLE quota_overrides (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    feature_key TEXT NOT NULL,
    monthly_limit INTEGER,  -- NULL = unlimited
    is_unlimited BOOLEAN DEFAULT false,
    reason TEXT,
    created_by UUID,
    expires_at TIMESTAMPTZ,
    UNIQUE (tenant_id, feature_key)
);
```

## Managing Quotas

### Override a Tenant's Quota

```sql
-- Give tenant unlimited AI usage
INSERT INTO quota_overrides (tenant_id, feature_key, is_unlimited, reason)
VALUES ('tenant-uuid', 'ai_assistant', true, 'Beta tester program');

-- Set custom limit
INSERT INTO quota_overrides (tenant_id, feature_key, monthly_limit, reason)
VALUES ('tenant-uuid', 'campaigns', 100, 'Promotional upgrade');

-- Temporary override (expires in 30 days)
INSERT INTO quota_overrides (tenant_id, feature_key, monthly_limit, expires_at, reason)
VALUES (
    'tenant-uuid',
    'api_calls',
    50000,
    now() + interval '30 days',
    'Trial period'
);
```

### View Usage Summary

```sql
SELECT * FROM get_usage_summary('tenant-uuid');
```

### Check Quota Status

```sql
SELECT * FROM check_quota_status('tenant-uuid', 'ai_assistant', 200);
```

## Monthly Reset

Quotas reset automatically on the 1st of each month (UTC). The system calculates usage by aggregating all events from `date_trunc('month', now())` to `now()`.

## Best Practices

1. **Check before action** - Always verify quota before performing expensive operations
2. **Track after success** - Only record usage after the action completes successfully
3. **Show remaining** - Display remaining quota in UI to set user expectations
4. **Graceful degradation** - When approaching limits, warn users proactively
5. **Super admin bypass** - Super admins bypass all quota checks for testing

## Adding New Tracked Features

1. Add to `PLAN_QUOTAS` in both:
   - `src/config/plans.js` (frontend)
   - `api/lib/usageTracker.js` (backend)

2. Add display name to `QUOTA_FEATURE_NAMES`

3. Apply `withQuotaCheck` or `assertWithinQuota` to relevant endpoints

4. Update this documentation

## Monitoring & Alerts

Future phases will add:
- Real-time usage monitoring dashboard
- Slack/email alerts at 70%, 90%, 100% thresholds
- Usage analytics and forecasting
- Billing integration for overage charges
