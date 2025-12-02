# Reseller Billing & Commissions

This document covers the commission system, billing mechanics, and payout processes for BizScreen resellers.

## Commission Structure

### Base Commission Rate

Each reseller account has a configured commission percentage:
- Default rate: 20%
- Range: 10% - 40% (negotiated at approval)
- Rate stored in `reseller_accounts.commission_percent`

### Commissionable Events

Commissions are earned on the following events:

| Event Type | Description | Commission Basis |
|------------|-------------|------------------|
| `subscription_created` | New subscription activation | First payment amount |
| `subscription_upgraded` | Plan tier upgrade | Prorated upgrade amount |
| `subscription_renewed` | Subscription renewal | Renewal payment amount |
| `license_activated` | License key redemption | License value |

### Event Lifecycle

1. **Created**: Event recorded when transaction occurs
2. **Pending**: Commission calculated, awaiting payout
3. **Paid**: Commission disbursed to reseller
4. **Failed**: Transaction reversed or refunded

## Commission Calculation

### Formula

```
Commission = Transaction Amount * (Commission Percent / 100)
```

### Example

```
Plan: Pro ($49/month)
Commission Rate: 20%
Commission: $49 * 0.20 = $9.80 per month
```

### Annual Subscriptions

For annual plans, commission is calculated on the full annual amount:

```
Plan: Pro Annual ($490/year)
Commission: $490 * 0.20 = $98.00 one-time
```

## Database Schema

### commission_events Table

```sql
CREATE TABLE commission_events (
  id UUID PRIMARY KEY,
  reseller_id UUID REFERENCES reseller_accounts(id),
  tenant_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Values

- `pending`: Awaiting payout processing
- `paid`: Successfully disbursed
- `failed`: Transaction reversed/refunded

## Tracking Earnings

### Monthly Summary

The billing dashboard shows monthly aggregated data:

```javascript
// Get earnings by month
const monthlyEarnings = commissionEvents.reduce((acc, event) => {
  const month = new Date(event.created_at).toLocaleString('default', {
    month: 'short',
    year: 'numeric'
  });

  if (!acc[month]) {
    acc[month] = { total: 0, count: 0 };
  }

  acc[month].total += parseFloat(event.commission_amount);
  acc[month].count += 1;

  return acc;
}, {});
```

### API Access

```javascript
import { getCommissionEvents, getResellerEarnings } from './services/resellerService';

// Get all commission events
const events = await getCommissionEvents(resellerId, {
  status: 'pending',
  limit: 100
});

// Get earnings summary
const earnings = await getResellerEarnings(resellerId, startDate, endDate);
```

## Payout Process

### Payout Settings

Configure your payout preferences in the Reseller Billing page:

```javascript
const payoutSettings = {
  method: 'bank_transfer', // or 'paypal', 'wire'
  minimum_payout: 100,     // Minimum amount to trigger payout
  schedule: 'monthly',     // or 'weekly', 'on_demand'
  details: {
    // Bank transfer
    account_name: 'Company Name',
    account_number: 'XXXX1234',
    routing_number: '123456789',
    bank_name: 'Bank of America',
    // OR PayPal
    paypal_email: 'payments@company.com'
  }
};
```

### Payout Schedule

| Schedule | Processing Day | Cutoff |
|----------|----------------|--------|
| Weekly | Every Friday | Wednesday midnight |
| Monthly | 1st of month | Previous month end |
| On Demand | Manual request | 24-48 hour processing |

### Minimum Payout

Default minimum payout threshold: $100
- Configure in payout settings
- Balances below minimum roll over to next period
- Can request exception for accumulated balances

## Refunds & Chargebacks

### Impact on Commissions

When a transaction is refunded or charged back:

1. Commission event status changes to `failed`
2. Amount is deducted from pending balance
3. If already paid, offset against future earnings

### Grace Period

- Refund window: 30 days
- Commissions held for 30 days before payout eligibility
- Reduces clawback occurrences

## Reporting

### Available Reports

1. **Commission Summary**
   - Total earned
   - Pending payouts
   - Paid out

2. **Event Detail**
   - Individual transactions
   - Tenant information
   - Status tracking

3. **Monthly Trend**
   - Month-over-month growth
   - Event type breakdown
   - Average commission per event

### Export Options

```javascript
// Export commission data as CSV
const exportCommissionCSV = async (resellerId) => {
  const events = await getCommissionEvents(resellerId, { limit: 1000 });

  const headers = ['Date', 'Tenant', 'Event Type', 'Amount', 'Commission', 'Status'];
  const rows = events.map(e => [
    new Date(e.created_at).toISOString(),
    e.tenant?.email || '',
    e.event_type,
    e.amount,
    e.commission_amount,
    e.status
  ]);

  // Generate and download CSV
  // ...
};
```

## Tax Considerations

### 1099 Reporting

For US-based resellers:
- Annual 1099 forms generated for earnings > $600
- Provided by January 31st of following year
- Requires W-9 on file

### Tax ID Requirements

Resellers must provide:
- Business Tax ID (EIN) or SSN
- W-9 form (US) or W-8BEN (international)
- Completed during reseller application

### Invoice Generation

Resellers can generate invoices for their records:
- Monthly statements available for download
- Include all commission events
- PDF format with company details

## Tiered Commission Programs

### Volume Bonuses

Higher commission rates for top performers:

| Monthly Volume | Bonus Rate |
|----------------|------------|
| $1,000 - $5,000 | +2% |
| $5,001 - $10,000 | +5% |
| $10,001+ | +8% |

### Requirements

- Minimum 3 months tenure
- No refund rate above 5%
- Active support SLA compliance

## Troubleshooting

### Common Issues

**Commission not appearing**
- Check tenant subscription is active
- Verify event within reporting period
- Allow 24 hours for processing

**Incorrect commission amount**
- Verify commission rate in account settings
- Check for promotional pricing impact
- Contact support with transaction ID

**Payout not received**
- Verify banking details are correct
- Check minimum payout threshold
- Review payout schedule timing

### Support Contact

For billing inquiries:
- Email: reseller-billing@bizscreen.com
- Include: Reseller ID, Transaction IDs, Date range
