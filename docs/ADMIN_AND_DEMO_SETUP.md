# Admin & Demo Tenant Setup

Step-by-step guide to create admin users, demo tenants, and test accounts for BizScreen.

---

## Prerequisites

- Supabase project with migrations applied
- Access to Supabase SQL Editor (Dashboard > SQL Editor)
- User accounts created via normal signup flow

---

## 1. Create Super Admin

Super admins have full system access across all tenants.

### Option A: Promote Existing User

```sql
-- Find the user by email
SELECT id, email, full_name, role
FROM profiles
WHERE email = 'admin@yourcompany.com';

-- Promote to super_admin
UPDATE profiles
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'admin@yourcompany.com';

-- Verify
SELECT id, email, role FROM profiles WHERE role = 'super_admin';
```

### Option B: Create Fresh Admin via Auth

1. Sign up normally at `/login` with your admin email
2. Verify the email
3. Run the promotion SQL above

### Security Notes

- Limit super_admin accounts to 2-3 trusted individuals
- Use strong passwords and enable 2FA in Supabase Auth settings
- Audit super_admin actions via activity_log table

---

## 2. Create Demo Tenant

Demo tenants showcase the product without billing requirements.

### Step 1: Create Demo User

```sql
-- First, create user via Supabase Auth (Dashboard > Authentication > Users > Add User)
-- Email: demo@bizscreen.tv
-- Password: [generate secure password]

-- After user is created, get their ID
SELECT id FROM auth.users WHERE email = 'demo@bizscreen.tv';
```

### Step 2: Set Up Demo Profile & Tenant

```sql
-- Get the user ID from above, then:
DO $$
DECLARE
  demo_user_id UUID := 'USER_ID_FROM_ABOVE';
  demo_tenant_id UUID;
BEGIN
  -- Create tenant for demo
  INSERT INTO tenants (name, slug, plan, status, settings)
  VALUES (
    'Demo Account',
    'demo',
    'pro',  -- Give demo users full features
    'active',
    jsonb_build_object(
      'isDemo', true,
      'demoExpiresAt', (NOW() + INTERVAL '30 days')::text
    )
  )
  RETURNING id INTO demo_tenant_id;

  -- Update profile with tenant
  UPDATE profiles
  SET
    tenant_id = demo_tenant_id,
    full_name = 'Demo User',
    role = 'client'
  WHERE id = demo_user_id;

  -- Add to organization_members as owner
  INSERT INTO organization_members (tenant_id, user_id, role, status)
  VALUES (demo_tenant_id, demo_user_id, 'owner', 'active');

  RAISE NOTICE 'Demo tenant created: %', demo_tenant_id;
END $$;
```

### Step 3: Seed Demo Content

```sql
-- Get demo tenant ID
SELECT t.id as tenant_id, p.id as user_id
FROM tenants t
JOIN profiles p ON p.tenant_id = t.id
WHERE t.slug = 'demo';

-- Add sample listings (replace IDs)
INSERT INTO listings (owner_id, tenant_id, property_name, property_type, address, city, state, status)
VALUES
  ('USER_ID', 'TENANT_ID', 'Beach House Paradise', 'vacation_rental', '123 Ocean Drive', 'Miami', 'FL', 'active'),
  ('USER_ID', 'TENANT_ID', 'Mountain Retreat', 'vacation_rental', '456 Summit Road', 'Denver', 'CO', 'active'),
  ('USER_ID', 'TENANT_ID', 'Downtown Loft', 'apartment', '789 Main Street', 'Austin', 'TX', 'active');

-- Add sample screens
INSERT INTO screens (tenant_id, listing_id, name, status, device_type)
SELECT
  l.tenant_id,
  l.id,
  l.property_name || ' - Living Room',
  'online',
  'fire_tv'
FROM listings l
WHERE l.tenant_id = 'TENANT_ID';
```

---

## 3. Create Test Billing Accounts

For testing Stripe integration without real charges.

### Test Cards (Stripe Test Mode)

| Scenario | Card Number |
|----------|-------------|
| Success | 4242 4242 4242 4242 |
| Declined | 4000 0000 0000 0002 |
| Requires Auth | 4000 0025 0000 3155 |
| Insufficient Funds | 4000 0000 0000 9995 |

### Create Test Subscription Manually

```sql
-- For testing without going through Stripe checkout
-- Only use in development/staging!

UPDATE tenants
SET
  plan = 'pro',
  stripe_customer_id = 'cus_test_' || gen_random_uuid()::text,
  stripe_subscription_id = 'sub_test_' || gen_random_uuid()::text,
  billing_status = 'active',
  current_period_end = NOW() + INTERVAL '30 days'
WHERE slug = 'demo';
```

### Verify Billing Setup

```sql
SELECT
  t.name,
  t.plan,
  t.billing_status,
  t.stripe_customer_id,
  t.current_period_end
FROM tenants t
WHERE t.slug = 'demo';
```

---

## 4. Admin User Management

### Create Admin (Manages Multiple Clients)

```sql
-- Create admin user (sign up first, then run this)
UPDATE profiles
SET
  role = 'admin',
  managed_by = NULL  -- Admins don't have managers
WHERE email = 'manager@yourcompany.com';
```

### Assign Clients to Admin

```sql
-- Super admin function to assign clients
SELECT assign_client_to_admin(
  'CLIENT_USER_ID'::uuid,    -- Client to assign
  'ADMIN_USER_ID'::uuid      -- Admin who will manage them
);

-- Or directly (requires super_admin session)
UPDATE profiles
SET managed_by = 'ADMIN_USER_ID'
WHERE id = 'CLIENT_USER_ID' AND role = 'client';
```

### View Admin's Clients

```sql
-- As the admin user
SELECT * FROM admin_clients;

-- As super_admin, view all admin-client relationships
SELECT
  a.email as admin_email,
  c.email as client_email,
  c.full_name as client_name,
  (SELECT COUNT(*) FROM listings WHERE owner_id = c.id) as listings
FROM profiles a
JOIN profiles c ON c.managed_by = a.id
WHERE a.role = 'admin'
ORDER BY a.email, c.email;
```

---

## 5. Reseller Setup

For white-label partners managing multiple tenants.

### Create Reseller Account

```sql
-- Create reseller tenant
INSERT INTO tenants (name, slug, plan, status, is_reseller)
VALUES ('Partner Company', 'partner-co', 'reseller', 'active', true)
RETURNING id;

-- Link reseller user
UPDATE profiles
SET
  tenant_id = 'RESELLER_TENANT_ID',
  role = 'admin'
WHERE email = 'partner@example.com';
```

### Assign Client Tenants to Reseller

```sql
-- Link client tenants to reseller
UPDATE tenants
SET reseller_id = 'RESELLER_TENANT_ID'
WHERE id IN ('CLIENT_TENANT_1', 'CLIENT_TENANT_2');
```

---

## 6. Verification Queries

### Check User Roles

```sql
SELECT
  email,
  role,
  tenant_id,
  managed_by,
  created_at
FROM profiles
ORDER BY
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    ELSE 3
  END;
```

### Check Tenant Status

```sql
SELECT
  name,
  slug,
  plan,
  status,
  billing_status,
  is_reseller,
  created_at
FROM tenants
ORDER BY created_at DESC;
```

### Check Demo Content

```sql
SELECT
  t.name as tenant,
  COUNT(DISTINCT l.id) as listings,
  COUNT(DISTINCT s.id) as screens,
  COUNT(DISTINCT m.id) as media_items
FROM tenants t
LEFT JOIN listings l ON l.tenant_id = t.id
LEFT JOIN screens s ON s.tenant_id = t.id
LEFT JOIN media m ON m.tenant_id = t.id
WHERE t.slug = 'demo'
GROUP BY t.id, t.name;
```

---

## 7. Reset Demo Data

To reset demo account for clean state:

```sql
-- Delete demo data (cascades to related tables)
DO $$
DECLARE
  demo_tenant UUID;
BEGIN
  SELECT id INTO demo_tenant FROM tenants WHERE slug = 'demo';

  IF demo_tenant IS NOT NULL THEN
    -- Delete in order to respect foreign keys
    DELETE FROM screens WHERE tenant_id = demo_tenant;
    DELETE FROM listings WHERE tenant_id = demo_tenant;
    DELETE FROM media WHERE tenant_id = demo_tenant;

    RAISE NOTICE 'Demo data cleared for tenant: %', demo_tenant;
  END IF;
END $$;

-- Then re-run seed scripts from section 2
```

---

## 8. Production Checklist

Before going live, verify:

- [ ] At least one super_admin account exists
- [ ] Super_admin has strong password + 2FA enabled
- [ ] Demo tenant is properly sandboxed (can't affect real data)
- [ ] Test billing flows work end-to-end
- [ ] RLS policies are active (`SELECT * FROM pg_policies`)
- [ ] Activity logging captures admin actions

---

## Quick Reference

| Role | Can See | Can Edit | Can Delete | Can Bill |
|------|---------|----------|------------|----------|
| super_admin | All tenants | All | All | N/A |
| admin | Managed clients | Managed clients | No | N/A |
| owner | Own tenant | Own tenant | Limited | Yes |
| manager | Own tenant | Own tenant | No | No |
| editor | Own tenant | Content only | No | No |
| viewer | Own tenant | No | No | No |

---

*Reference: [RBAC Migration](../supabase/migrations/009_add_roles_and_rbac.sql) | Updated: Phase 44*
