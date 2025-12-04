# Admin Panel & Tenant Management

## Overview

Phase 17 introduces a comprehensive Admin Panel for super administrators to manage tenants, users, and system-wide settings. This panel provides tools for tenant lifecycle management, feature flag overrides, quota management, and user administration.

## Access Control

The Admin Panel is **only accessible to users with the `super_admin` role**. All API endpoints verify this role before processing requests.

### Role Hierarchy

| Role | Access Level |
|------|--------------|
| `super_admin` | Full access to Admin Panel, can manage all tenants |
| `admin` | Cannot access Admin Panel |
| `client` | Cannot access Admin Panel |

## Features

### 1. Tenant List View

Located at: **Admin Panel** in the sidebar navigation

- **Search**: Filter tenants by name or slug
- **Plan Filter**: Filter by subscription plan (Free, Starter, Pro, Enterprise, Reseller)
- **Status Filter**: Filter by status (Active, Suspended, Pending)
- **Pagination**: Navigate through large tenant lists
- **Quick Actions**: Click any tenant row to view details

### 2. Tenant Detail View

Detailed view with four tabs:

#### Overview Tab
- Tenant information (name, slug, creation date)
- Current user and screen counts
- Usage summary for the current billing period
- Feature flags with toggle controls for quick overrides

#### Users Tab
- List of all users in the tenant
- User status (Active/Disabled)
- Last login timestamp
- Actions:
  - **Reset Password**: Send password reset email or generate temporary password
  - **Disable/Enable User**: Temporarily suspend user access

#### Screens Tab
- List of all paired screens
- Screen status (Online/Offline/Error)
- Device ID and last seen timestamp
- Actions:
  - **Force Reboot**: Queue a reboot command for the screen

#### Billing Tab
- Current subscription plan with renewal date
- **Change Plan**: Upgrade or downgrade tenant's plan
- **Quota Overrides**: Set custom quotas per feature
  - Monthly limits
  - Unlimited option
  - Expiration dates for temporary overrides

### 3. Tenant Actions

Available actions from the tenant detail header:

| Action | Description |
|--------|-------------|
| **Suspend** | Immediately suspend tenant access |
| **Unsuspend** | Restore access for suspended tenants |
| **Refresh** | Reload tenant data |

## API Endpoints

All endpoints require `super_admin` role. Base path: `/api/admin/`

### Tenant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/tenants/list` | List tenants with pagination/filters |
| GET | `/admin/tenants/get?id={id}` | Get detailed tenant info |
| POST | `/admin/tenants/update-plan` | Change tenant's subscription plan |
| POST | `/admin/tenants/suspend` | Suspend or unsuspend a tenant |
| POST | `/admin/tenants/override-feature` | Override feature flag for tenant |
| POST | `/admin/tenants/override-quota` | Override quota for tenant |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/users/reset-password` | Reset user password |
| POST | `/admin/users/disable` | Disable or enable user |

### Screen Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/screens/reboot` | Force reboot a screen |

## API Request/Response Examples

### List Tenants

```http
GET /api/admin/tenants/list?page=1&limit=10&search=acme&plan=pro&status=active
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "uuid",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "plan": "pro",
        "status": "active",
        "activeUsers": 5,
        "screensCount": 12,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### Update Plan

```http
POST /api/admin/tenants/update-plan
Content-Type: application/json
Authorization: Bearer {token}

{
  "tenantId": "uuid",
  "planSlug": "enterprise",
  "reason": "Customer upgrade request"
}
```

### Override Feature Flag

```http
POST /api/admin/tenants/override-feature
Content-Type: application/json
Authorization: Bearer {token}

{
  "tenantId": "uuid",
  "featureKey": "ai_assistant",
  "enabled": true,
  "reason": "Beta access granted"
}
```

### Override Quota

```http
POST /api/admin/tenants/override-quota
Content-Type: application/json
Authorization: Bearer {token}

{
  "tenantId": "uuid",
  "featureKey": "ai_assistant",
  "monthlyLimit": 5000,
  "isUnlimited": false,
  "expiresAt": "2025-06-30T23:59:59Z",
  "reason": "Promotional offer"
}
```

## Audit Logging

All admin actions are recorded in the `audit_logs` table with:

- **tenant_id**: Affected tenant
- **user_id**: Admin who performed the action
- **action**: Action type (e.g., `admin.plan_change`, `admin.tenant_suspended`)
- **resource_type**: Type of resource (tenant, user, screen)
- **resource_id**: ID of affected resource
- **metadata**: Additional context including reason and admin email

### Action Types

| Action | Description |
|--------|-------------|
| `admin.plan_change` | Tenant plan was changed |
| `admin.tenant_suspended` | Tenant was suspended |
| `admin.tenant_unsuspended` | Tenant was unsuspended |
| `admin.feature_override` | Feature flag was overridden |
| `admin.quota_override` | Quota was overridden |
| `admin.password_reset` | User password was reset |
| `admin.user_disabled` | User was disabled |
| `admin.user_enabled` | User was enabled |
| `admin.screen_reboot` | Screen reboot was queued |

## Frontend Components

### Pages
- `AdminTenantsListPage.jsx` - Tenant list with search, filters, pagination
- `AdminTenantDetailPage.jsx` - Detailed tenant view with tabs

### Hooks
- `useTenantList()` - Manages tenant list state, pagination, and filtering
- `useTenantDetail(tenantId)` - Manages single tenant state and actions
- `useAdminAccess()` - Checks if current user has admin access

### Services
- `adminService.js` - API functions for all admin operations

## Database Tables Used

- `tenants` - Tenant records
- `profiles` - User profiles with tenant association
- `screens` - Screen devices with tenant association
- `subscriptions` - Subscription records for billing
- `feature_flag_overrides` - Per-tenant feature flag overrides
- `quota_overrides` - Per-tenant quota overrides
- `feature_usage` - Usage tracking per feature
- `audit_logs` - Admin action audit trail

## Security Considerations

1. **Role Verification**: Every API endpoint verifies `super_admin` role
2. **Self-Protection**: Admins cannot disable their own accounts
3. **Audit Trail**: All actions are logged for accountability
4. **Token Validation**: All requests require valid JWT tokens

## Testing

### Unit Tests
- `tests/unit/services/adminService.test.js`
- `tests/unit/hooks/useAdmin.test.js`
- `tests/unit/api/adminApi.test.js`

### E2E Tests
- `tests/e2e/admin.spec.js` (requires `TEST_SUPERADMIN_EMAIL` env var)

Run tests:
```bash
npm test
npm run test:e2e
```

## Environment Variables

For E2E testing, set:
```
TEST_SUPERADMIN_EMAIL=admin@example.com
TEST_SUPERADMIN_PASSWORD=securepassword
```

## Navigation

Access the Admin Panel from the sidebar:
1. Log in as a super_admin user
2. Look for "Admin Panel" in the Admin section of the sidebar
3. Click to view the tenant list
4. Click any tenant to view details
