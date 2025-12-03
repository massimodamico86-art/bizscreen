# Feature Flags & Plan Tiers Guide

Phase 14 implementation of centralized feature flags, plan tier definitions, and tenant-specific toggles.

## Overview

BizScreen uses a hierarchical feature flag system that combines:
- **Plan-based features**: Features included in specific subscription tiers
- **Tenant overrides**: Per-tenant customizations for features
- **Global flags**: Features enabled for all users regardless of plan

### Resolution Priority (highest to lowest)

1. **Tenant Override** - Specific tenant has feature enabled/disabled
2. **Plan Features** - Feature is included in the user's plan
3. **Global Flags** - Feature is globally enabled for everyone
4. **Default** - Feature is disabled

## Plan Tiers

| Plan | Features | Use Case |
|------|----------|----------|
| **Free** | Basic screens, playlists, media, templates | Getting started |
| **Starter** | + Advanced scheduling, screen groups, analytics | Small businesses |
| **Pro** | + AI assistant, campaigns, bulk ops, API, webhooks | Growing businesses |
| **Enterprise** | + SSO, SCIM, custom domains, white-label, audit logs | Large organizations |
| **Reseller** | + Client management, license management, reseller billing | Partners |

## Usage

### Frontend: React Hooks

```jsx
import { useFeatureFlag, useHasAIAssistant } from '../hooks/useFeatureFlag';
import { Feature } from '../config/plans';

function MyComponent() {
  // Check a specific feature
  const hasAI = useFeatureFlag(Feature.AI_ASSISTANT);

  // Use convenience hooks
  const hasAI2 = useHasAIAssistant();

  if (!hasAI) {
    return <UpgradePrompt feature={Feature.AI_ASSISTANT} />;
  }

  return <AIFeatureContent />;
}
```

### Frontend: FeatureGate Component

```jsx
import { FeatureGate } from '../components/FeatureGate';
import { Feature } from '../config/plans';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Shows children only if feature is enabled */}
      <FeatureGate feature={Feature.AI_ASSISTANT}>
        <AIAssistantWidget />
      </FeatureGate>

      {/* With upgrade prompt */}
      <FeatureGate
        feature={Feature.CAMPAIGNS}
        showUpgradePrompt
      >
        <CampaignsSection />
      </FeatureGate>

      {/* With custom fallback */}
      <FeatureGate
        feature={Feature.ADVANCED_ANALYTICS}
        fallback={<BasicAnalytics />}
      >
        <AdvancedAnalytics />
      </FeatureGate>
    </div>
  );
}
```

### Frontend: Higher-Order Component

```jsx
import { withFeatureGate } from '../components/FeatureGate';
import { Feature } from '../config/plans';

const ProtectedAIAssistant = withFeatureGate(
  AIAssistant,
  Feature.AI_ASSISTANT,
  UpgradeToPro // Optional fallback component
);
```

### Backend: API Route Protection

```javascript
import { checkFeatureOrThrow, requireFeature } from '../lib/featureCheck.js';

// Option 1: Check and throw
export default async function handler(req, res) {
  await checkFeatureOrThrow(req, 'ai_assistant');
  // ... rest of handler
}

// Option 2: Middleware wrapper
export default requireFeature('ai_assistant', async (req, res) => {
  // ... handler code
});

// Option 3: Non-throwing check
import { checkFeature } from '../lib/featureCheck.js';

export default async function handler(req, res) {
  const hasAI = await checkFeature(req, 'ai_assistant');
  if (!hasAI) {
    return res.json({ limited: true });
  }
  // ... full functionality
}
```

## Feature Flag Resolution

### Programmatic Resolution

```javascript
import { resolveFeature, isFeatureResolved } from '../config/featureFlags';
import { Feature, PlanSlug } from '../config/plans';

// Get detailed resolution info
const result = resolveFeature(Feature.AI_ASSISTANT, {
  plan: PlanSlug.PRO,
  tenantOverrides: { ai_assistant: false }, // Override disables it
});
// result: { key: 'ai_assistant', enabled: false, source: 'override' }

// Simple boolean check
const hasFeature = isFeatureResolved(Feature.AI_ASSISTANT, {
  plan: PlanSlug.PRO
});
// hasFeature: true
```

### Getting Upgrade Information

```javascript
import { getUpgradePathForFeature, getFeaturesGainedByUpgrade } from '../config/featureFlags';
import { Feature, PlanSlug } from '../config/plans';

// Find what plan enables a feature
const upgrade = getUpgradePathForFeature(Feature.ENTERPRISE_SSO, PlanSlug.PRO);
// { required: 'enterprise', name: 'Enterprise' }

// Get features gained by upgrading
const gained = getFeaturesGainedByUpgrade(PlanSlug.STARTER, PlanSlug.PRO);
// ['ai_assistant', 'campaigns', 'advanced_analytics', ...]
```

## Feature Categories

| Category | Features |
|----------|----------|
| **core** | basic_screens, basic_playlists, basic_media, templates_gallery |
| **scheduling** | advanced_scheduling |
| **analytics** | basic_analytics, advanced_analytics |
| **ai** | ai_assistant |
| **marketing** | campaigns |
| **management** | screen_groups, bulk_operations |
| **integration** | api_access, webhooks, pms_integration |
| **security** | enterprise_sso, scim_provisioning, audit_logs |
| **branding** | custom_domains, white_label |
| **reseller** | reseller_portal, client_management, license_management |
| **support** | email_support, priority_support, dedicated_support |

## Admin Debug Tools

Super admins can access the Feature Flags Debug panel at `/admin/feature-flags` (Debug tab) to:

- View current tenant context (tenant ID, plan, role)
- Simulate different plans (dev mode only)
- See all resolved features with their sources
- Override features locally for testing
- Export configuration as JSON or CSV

## Adding New Features

1. **Add to Feature enum** (`src/config/plans.js`):
```javascript
export const Feature = {
  // ...existing
  MY_NEW_FEATURE: 'my_new_feature',
};
```

2. **Add metadata** (`src/config/plans.js`):
```javascript
export const FEATURE_METADATA = {
  // ...existing
  [Feature.MY_NEW_FEATURE]: {
    name: 'My New Feature',
    description: 'What it does',
    category: 'integration',
  },
};
```

3. **Add to appropriate plans** (`src/config/plans.js`):
```javascript
[PlanSlug.PRO]: {
  features: [
    // ...existing
    'my_new_feature',
  ],
},
```

4. **Add to server-side definitions** (`api/lib/featureCheck.js`):
```javascript
const PLAN_FEATURES = {
  [PlanSlug.PRO]: [
    // ...existing
    'my_new_feature',
  ],
};
```

5. **Create database migration** (if using database-backed flags):
```sql
INSERT INTO feature_flags (key, name, description, category)
VALUES ('feature.my_new_feature', 'My New Feature', 'Description', 'integration');
```

## Testing

Unit tests are located in `tests/unit/config/`:
- `plans.test.js` - Plan tier definitions and helpers
- `featureFlags.test.js` - Feature resolution logic

Run tests:
```bash
npm run test:unit -- tests/unit/config
```

## Wired Features (Phase 15)

The following features are currently gated with the feature flag system:

| Feature | Key | Plan Required | UI Location | API Protection |
|---------|-----|---------------|-------------|----------------|
| AI Assistant | `ai_assistant` | Pro | Navigation + Page | `/api/ai/generate` |
| Campaigns | `campaigns` | Pro | Navigation + Page | - |
| Advanced Analytics | `advanced_analytics` | Pro | Navigation + Page | - |
| Screen Groups | `screen_groups` | Starter | Navigation + Page | - |
| Developer Settings | `api_access` | Pro | Page | - |
| White-Label | `white_label` | Enterprise | Page | - |
| Enterprise Security | `enterprise_sso` | Enterprise | Navigation + Page | - |
| Reseller Portal | `reseller_portal` | Reseller | Navigation + Page | `/api/reseller/clients` |
| Activity Log | `audit_logs` | Enterprise | Navigation | - |
| Usage Dashboard | `usage_dashboard` | Starter | Navigation + Page | `/api/usage/summary` |

## Wired Features (Phase 16)

The following features now have quota tracking and enforcement:

| Feature | Key | Quota API Protection |
|---------|-----|---------------------|
| AI Assistant | `ai_assistant` | `/api/ai/generate` - with quota |
| Campaigns | `campaigns` | `/api/campaigns/create` - with quota |
| Screen Groups | `screen_groups` | `/api/screens/group` - with quota |
| Audit Logs | `audit_logs` | `/api/audit/log` - with quota |

See [QUOTAS_AND_USAGE.md](./QUOTAS_AND_USAGE.md) for detailed quota documentation.

### How to Toggle Features

**For a specific tenant (database override):**
```sql
-- Enable AI Assistant for a FREE plan tenant
INSERT INTO feature_flag_overrides (tenant_id, feature_flag_id, enabled)
SELECT 'tenant-uuid', id, true
FROM feature_flags
WHERE key = 'feature.ai_assistant';
```

**Via Debug Panel (dev mode only):**
1. Navigate to Admin → Feature Flags → Debug tab
2. Use the Plan Simulator to test different plan levels
3. Click "Override" on specific features for local testing

## How to Gate a New Feature (Checklist)

1. **Add feature key** to `src/config/plans.js`:
   ```javascript
   export const Feature = {
     // ...existing
     MY_NEW_FEATURE: 'my_new_feature',
   };
   ```

2. **Add to appropriate plans** in `src/config/plans.js`:
   ```javascript
   [PlanSlug.PRO]: {
     features: [
       // ...existing
       Feature.MY_NEW_FEATURE,
     ],
   },
   ```

3. **Add server-side mapping** in `api/lib/featureCheck.js`:
   ```javascript
   const PLAN_FEATURES = {
     [PlanSlug.PRO]: [
       // ...existing
       'my_new_feature',
     ],
   };
   ```

4. **Gate in UI** using one of these methods:
   ```jsx
   // Option A: FeatureGate component
   <FeatureGate feature={Feature.MY_NEW_FEATURE}>
     <MyComponent />
   </FeatureGate>

   // Option B: useFeatureFlag hook
   const hasFeature = useFeatureFlag(Feature.MY_NEW_FEATURE);
   if (!hasFeature) return <UpgradePrompt />;
   ```

5. **Gate in API** (if applicable):
   ```javascript
   import { checkFeatureOrThrow } from '../lib/featureCheck.js';

   export default async function handler(req, res) {
     await checkFeatureOrThrow(req, 'my_new_feature');
     // ...rest of handler
   }
   ```

## Best Practices

1. **Always check on the server** - Client-side checks are for UX, server-side checks are for security
2. **Use Feature constants** - Don't use string literals
3. **Provide fallbacks** - Always handle the disabled case gracefully
4. **Consider upgrade prompts** - Guide users to upgrade when appropriate
5. **Document new features** - Update this guide when adding features
6. **Super admins bypass all checks** - Use for testing and support purposes
