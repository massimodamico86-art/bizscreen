# BizScreen Reseller Program Guide

This guide covers the BizScreen Reseller Program, enabling partners to distribute, manage, and support their own customer base.

## Overview

The Reseller Program allows approved partners to:
- Manage their own portfolio of tenants
- Generate and distribute license keys
- Earn commissions on sales
- Create white-label branded variants
- Access dedicated support tools

## Becoming a Reseller

### Application Process

1. Navigate to Settings > Reseller Program
2. Complete the reseller application form:
   - Company name and contact information
   - Business website
   - Expected monthly volume
   - Support capabilities
3. Submit for review

### Approval

Super admins review applications and can:
- Approve with a specific commission percentage (default 20%)
- Request additional information
- Decline with reason

Once approved, your profile is marked as `is_reseller: true` and you gain access to the Reseller Portal.

## Reseller Portal

Access the Reseller Portal from the sidebar navigation.

### Dashboard

The main dashboard displays:
- **Portfolio Stats**: Total tenants, active licenses, revenue
- **License Overview**: Available, activated, expired counts
- **Recent Activity**: Latest tenant signups and license redemptions
- **Expiring Licenses**: Licenses expiring in the next 30 days

### Managing Tenants

#### View Tenants
The tenant list shows all customers under your reseller account:
- Business name and email
- Plan level and status
- License information
- Subscription dates

#### Create Tenant
1. Click "Add Tenant"
2. Enter customer email and business name
3. Optionally assign a license key
4. Customer receives invitation email

#### Impersonate Tenant
For support purposes, you can view the application as a tenant:
1. Click the "Manage" button next to a tenant
2. View their dashboard and settings
3. Click "Stop" in the yellow banner to exit

### Generating Licenses

#### Single License
1. Click "Generate Licenses"
2. Select license type:
   - **Trial**: 14-day trial period
   - **Standard**: Base features
   - **Pro**: Pro features included
   - **Enterprise**: Full feature set
3. Select plan level:
   - **Starter**: Up to 5 screens
   - **Pro**: Up to 25 screens
   - **Enterprise**: Up to 100 screens
4. Set duration (default 365 days)
5. Add optional notes
6. Click "Generate"

#### Bulk Generation
1. Set quantity (up to 50 at once)
2. All licenses share the same configuration
3. Codes are generated immediately

#### License Format
License codes use format: `XXXX-XXXX-XXXX-XXXX`
- 16 characters using unambiguous characters (no 0/O, 1/I/L)
- Case insensitive
- Can be entered with or without dashes

### License Management

#### Status Values
- **Available**: Ready to be redeemed
- **Reserved**: Assigned but not yet activated
- **Activated**: In use by a tenant
- **Expired**: Past expiration date
- **Revoked**: Manually deactivated

#### Actions
- **Revoke**: Cancel an active or available license
- **Extend**: Add days to expiration date
- **Export CSV**: Download license list for records

## Brand Variants

Create white-label branded versions for different customer segments.

### Creating a Brand Variant

1. Go to Reseller Portal > Brand Variants
2. Click "Create Brand"
3. Configure:
   - Brand name and slug
   - Logo and favicon URLs
   - Primary and secondary colors
   - App name and tagline
   - Support email and URLs
   - Terms and privacy policy links
   - Whether to show "Powered by BizScreen"
   - Custom pricing configuration

### Using Brand Variants

Brand variants can be applied to:
- Tenant onboarding flows
- Customer-facing dashboards
- Email communications
- Help documentation

## Billing & Commissions

### Commission Structure

Commissions are calculated on:
- New subscription activations
- Plan upgrades
- Subscription renewals

Default commission rate: 20% (configurable per reseller)

### Commission Events

The Billing page shows all commission events:
- Event type (created, upgraded, renewed)
- Tenant information
- Base amount and commission earned
- Payment status (pending, paid, failed)

### Monthly Earnings

View earnings aggregated by month with:
- Total earnings
- Number of events
- Event breakdown by type

### Payout Settings

Configure your payout preferences:
- Preferred payment method
- Banking/PayPal details
- Payout threshold
- Automatic vs. manual payouts

## API Access

Resellers can use the API for automation:

### Generate Licenses
```javascript
import { generateLicenses } from './services/licenseService';

const licenses = await generateLicenses({
  resellerId: 'your-reseller-id',
  licenseType: 'standard',
  planLevel: 'pro',
  maxScreens: 25,
  durationDays: 365,
  quantity: 10
});
```

### Validate License
```javascript
import { validateLicenseCode } from './services/licenseService';

const result = await validateLicenseCode('XXXX-XXXX-XXXX-XXXX');
if (result.valid) {
  console.log('License details:', result.license);
}
```

### List Tenants
```javascript
import { listResellerTenants } from './services/resellerService';

const tenants = await listResellerTenants(resellerId, {
  status: 'active',
  limit: 50
});
```

## Best Practices

### License Management
- Generate licenses in batches as needed
- Track distribution in your own CRM
- Set up alerts for expiring licenses
- Revoke unused licenses after 90 days

### Tenant Support
- Use impersonation sparingly for troubleshooting
- Document support interactions
- Escalate complex issues to BizScreen support

### Commission Optimization
- Encourage annual subscriptions (higher LTV)
- Promote upgrades to higher tiers
- Focus on retention to maximize renewals

## Troubleshooting

### Common Issues

**License not working**
- Verify code is entered correctly (no extra spaces)
- Check license status is "available"
- Confirm license hasn't expired

**Tenant not appearing**
- Ensure tenant completed signup
- Check email invitation wasn't blocked
- Verify license was properly linked

**Commission not showing**
- Allow 24-48 hours for processing
- Check event status isn't "failed"
- Verify tenant subscription is active

### Support Contact

For reseller-specific support:
- Email: resellers@bizscreen.com
- Reseller Slack channel (invite provided at approval)
- Priority support ticket system
