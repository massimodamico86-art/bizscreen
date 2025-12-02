# BizScreen License Key System

This document covers the license key generation, redemption, and management system for BizScreen.

## Overview

The licensing system enables:
- Resellers to distribute access codes to customers
- Customers to activate subscriptions via license keys
- Tracking of license usage and status
- Integration with the billing and subscription system

## License Key Format

### Structure

License codes use a 16-character format:
```
XXXX-XXXX-XXXX-XXXX
```

### Character Set

To avoid confusion, licenses use an unambiguous character set:
```
ABCDEFGHJKMNPQRSTUVWXYZ23456789
```

Excluded characters:
- `0` (zero) - confused with `O`
- `1` (one) - confused with `I` or `L`
- `I` (eye) - confused with `1` or `L`
- `L` (ell) - confused with `1` or `I`
- `O` (oh) - confused with `0`

### Input Flexibility

Licenses can be entered:
- With dashes: `XXXX-XXXX-XXXX-XXXX`
- Without dashes: `XXXXXXXXXXXXXXXX`
- Mixed case: Automatically normalized to uppercase

## License Types

### Trial
```javascript
{ value: 'trial', label: 'Trial', description: '14-day trial' }
```
- Limited duration (14 days default)
- Full feature access during trial
- Converts to paid or expires

### Standard
```javascript
{ value: 'standard', label: 'Standard', description: 'Standard license' }
```
- Basic feature set
- Standard support level
- Default license type

### Pro
```javascript
{ value: 'pro', label: 'Pro', description: 'Pro features' }
```
- Advanced features enabled
- Priority support
- Additional integrations

### Enterprise
```javascript
{ value: 'enterprise', label: 'Enterprise', description: 'Enterprise features' }
```
- Full feature access
- Dedicated support
- Custom integrations
- SLA guarantees

## Plan Levels

### Starter
```javascript
{ value: 'starter', label: 'Starter', screens: 5 }
```
- Up to 5 screens
- Basic content types
- Standard analytics

### Pro
```javascript
{ value: 'pro', label: 'Pro', screens: 25 }
```
- Up to 25 screens
- All content types
- Advanced analytics
- Team collaboration

### Enterprise
```javascript
{ value: 'enterprise', label: 'Enterprise', screens: 100 }
```
- Up to 100 screens
- Unlimited content
- Enterprise analytics
- API access
- Custom branding

## License Status

### Status Values

| Status | Description |
|--------|-------------|
| `available` | Ready to be redeemed |
| `reserved` | Assigned but not activated |
| `activated` | Currently in use |
| `expired` | Past expiration date |
| `revoked` | Manually deactivated |

### Status Transitions

```
available → reserved → activated → expired
                 ↓           ↓
              available   revoked
                            ↓
                        (terminal)
```

## Database Schema

### licenses Table

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES reseller_accounts(id),
  code TEXT UNIQUE NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'standard',
  plan_level TEXT NOT NULL DEFAULT 'starter',
  max_screens INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'available',
  tenant_id UUID REFERENCES profiles(id),
  duration_days INTEGER DEFAULT 365,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_licenses_code ON licenses(code);
CREATE INDEX idx_licenses_reseller ON licenses(reseller_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_tenant ON licenses(tenant_id);
```

## License Generation

### API Function

```javascript
import { generateLicenses } from './services/licenseService';

const licenses = await generateLicenses({
  resellerId: 'uuid',
  licenseType: 'standard',
  planLevel: 'pro',
  maxScreens: 25,
  durationDays: 365,
  quantity: 10,
  notes: 'Q1 2024 batch'
});
```

### Database Function

```sql
CREATE OR REPLACE FUNCTION generate_license(
  p_reseller_id UUID,
  p_license_type TEXT DEFAULT 'standard',
  p_plan_level TEXT DEFAULT 'starter',
  p_max_screens INTEGER DEFAULT 5,
  p_duration_days INTEGER DEFAULT 365,
  p_quantity INTEGER DEFAULT 1,
  p_notes TEXT DEFAULT NULL
) RETURNS SETOF licenses AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code TEXT;
  v_license licenses;
  i INTEGER;
  j INTEGER;
BEGIN
  FOR i IN 1..p_quantity LOOP
    -- Generate unique code
    LOOP
      v_code := '';
      FOR j IN 1..16 LOOP
        v_code := v_code || substr(v_chars, floor(random() * 32)::int + 1, 1);
      END LOOP;

      EXIT WHEN NOT EXISTS (SELECT 1 FROM licenses WHERE code = v_code);
    END LOOP;

    INSERT INTO licenses (
      reseller_id, code, license_type, plan_level,
      max_screens, duration_days, notes
    ) VALUES (
      p_reseller_id, v_code, p_license_type, p_plan_level,
      p_max_screens, p_duration_days, p_notes
    ) RETURNING * INTO v_license;

    RETURN NEXT v_license;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## License Redemption

### API Function

```javascript
import { redeemLicense } from './services/licenseService';

const result = await redeemLicense('XXXX-XXXX-XXXX-XXXX', tenantId);
// result: { success: true, tenant_id, plan_level, max_screens, expires_at }
```

### Redemption Flow

1. **Validate Code**
   - Normalize input (uppercase, remove dashes)
   - Look up in database
   - Check status is `available`

2. **Apply to Tenant**
   - Update tenant's `plan_level`
   - Set `max_screens` limit
   - Calculate `subscription_expires_at`

3. **Update License**
   - Set status to `activated`
   - Record `tenant_id`
   - Set `activated_at` timestamp
   - Calculate `expires_at`

4. **Create Commission Event**
   - Record for reseller billing
   - Include license value

### Error Handling

```javascript
const result = await redeemLicense(code);

// Possible responses
{ success: true, ...tenantData }
{ success: false, error: 'Invalid license code' }
{ success: false, error: 'License already activated' }
{ success: false, error: 'License has expired' }
{ success: false, error: 'License has been revoked' }
```

## License Validation

### Pre-Redemption Check

```javascript
import { validateLicenseCode } from './services/licenseService';

const result = await validateLicenseCode('XXXX-XXXX-XXXX-XXXX');

if (result.valid) {
  console.log('License details:', result.license);
  // { id, planLevel, maxScreens, durationDays, licenseType, reseller }
} else {
  console.log('Error:', result.error);
}
```

## License Management

### Revoke License

```javascript
import { revokeLicense } from './services/licenseService';

await revokeLicense(licenseId, 'Customer requested cancellation');
```

### Extend License

```javascript
import { extendLicense } from './services/licenseService';

const updated = await extendLicense(licenseId, 90); // Add 90 days
```

### List Licenses

```javascript
import { listResellerLicenses } from './services/licenseService';

const licenses = await listResellerLicenses(resellerId, {
  status: 'available',
  limit: 50,
  offset: 0
});
```

### Get Statistics

```javascript
import { getLicenseStats } from './services/licenseService';

const stats = await getLicenseStats(resellerId);
// { total: 100, available: 45, activated: 50, expired: 3, revoked: 2 }
```

## Expiration Handling

### Automatic Expiration

Licenses automatically expire when `expires_at` is reached:

```sql
-- Update expired licenses daily
UPDATE licenses
SET status = 'expired'
WHERE status = 'activated'
  AND expires_at < NOW();
```

### Expiration Notifications

Get licenses expiring soon:

```javascript
import { getExpiringLicenses } from './services/licenseService';

const expiring = await getExpiringLicenses(resellerId, 30); // Next 30 days
```

### Renewal Flow

1. Reseller generates new license
2. Customer redeems before expiration
3. New expiration date calculated from current date

## Export & Reporting

### CSV Export

```javascript
import { exportLicensesCSV } from './services/licenseService';

await exportLicensesCSV(resellerId);
// Downloads: licenses-2024-01-15.csv
```

### CSV Format

```csv
Code,Type,Plan,Max Screens,Status,Tenant,Created,Expires
ABCD-EFGH-JKLM-NPQR,standard,pro,25,activated,john@example.com,2024-01-15,2025-01-15
```

## Security Considerations

### Access Control

- Resellers can only view/manage their own licenses
- RLS policies enforce data isolation
- License codes are single-use

### Code Generation

- Cryptographically random generation
- Unique constraint prevents duplicates
- No sequential patterns

### Audit Trail

All license operations are logged:
- Generation events
- Redemption attempts (success/failure)
- Revocations with reasons
- Extensions with amounts

## Integration Points

### Subscription System

Licenses integrate with the subscription system:

```javascript
// When license is redeemed
await updateProfile(tenantId, {
  plan_level: license.plan_level,
  max_screens: license.max_screens,
  subscription_tier: license.license_type,
  subscription_expires_at: expiresAt
});
```

### Commission System

License activations trigger commissions:

```javascript
await createCommissionEvent({
  resellerId: license.reseller_id,
  tenantId: tenantId,
  eventType: 'license_activated',
  amount: licenseValue,
  commissionAmount: licenseValue * commissionRate
});
```

## Troubleshooting

### Common Issues

**Invalid code format**
- Remove extra spaces
- Ensure 16 characters (excluding dashes)
- Check for typos

**Already activated**
- License can only be used once
- Request new license from reseller

**Expired license**
- Contact reseller for new license
- Cannot reactivate expired licenses

### Support Queries

```sql
-- Find license by code
SELECT * FROM licenses WHERE code ILIKE '%XXXX%';

-- Get license history for tenant
SELECT * FROM licenses WHERE tenant_id = 'uuid' ORDER BY created_at;

-- Find unused licenses for reseller
SELECT * FROM licenses
WHERE reseller_id = 'uuid' AND status = 'available'
ORDER BY created_at;
```
