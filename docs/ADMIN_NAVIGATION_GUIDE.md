# Admin / Super Admin Navigation Guide

## Role Hierarchy

| Role | Access Level | Dashboard |
|------|-------------|-----------|
| `super_admin` | Full platform access | `SuperAdminDashboardPage` |
| `admin` | Assigned clients only | `AdminDashboardPage` |
| `client` | Own tenant only | Client sidebar with dashboard |

## Super Admin Flow

### Default View
When a super admin logs in, they see the `SuperAdminDashboardPage` which displays:
- System stats (Total Users, Admins, Clients, Unassigned Clients)
- Admin management (list of all admins with their assigned clients)
- Client management (list of all clients with assignment controls)
- **Admin Tools Quick Links** - Navigation to admin tool pages

### Admin Tools Navigation
From the dashboard, super admins can navigate to:

| Tool | Page ID | Description |
|------|---------|-------------|
| Tenant Management | `admin-tenants` | List and manage all tenants |
| Audit Logs | `admin-audit-logs` | View audit trail of user actions |
| System Events | `admin-system-events` | Platform-level events (super_admin only) |
| System Status | `status` | Infrastructure monitoring |
| Ops Console | `ops-console` | Operations tools |
| Tenant Lifecycle | `tenant-admin` | Billing status and lifecycle management |
| Feature Flags | `feature-flags` | Toggle features per tenant |
| Demo Tools | `demo-tools` | Demo/testing utilities |
| Client Management | `clients` | User-level client management |

### Navigation States
- **Dashboard View**: Shows `SuperAdminDashboardPage` without sidebar
- **Admin Tool View**: Shows selected admin tool page with sidebar + "Back to Dashboard" button
- **Impersonating**: Shows client UI, admin tools hidden

## Admin Flow

### Default View
Regular admins see `AdminDashboardPage` which displays:
- Stats for their assigned clients only
- List of clients they manage
- Quick access to client details

### Navigation
Admins have limited navigation compared to super admins:
- Can view their assigned clients
- Cannot access tenant management, audit logs, or system events
- Cannot impersonate other admins' clients

## Key Files

### Pages
- `/src/pages/SuperAdminDashboardPage.jsx` - Super admin main dashboard
- `/src/pages/AdminDashboardPage.jsx` - Admin main dashboard
- `/src/pages/Admin/AdminTenantsListPage.jsx` - Tenant list view
- `/src/pages/Admin/AdminTenantDetailPage.jsx` - Single tenant detail with tabs
- `/src/pages/Admin/AdminAuditLogsPage.jsx` - Audit log viewer
- `/src/pages/Admin/AdminSystemEventsPage.jsx` - System events (super_admin only)
- `/src/pages/TenantAdminPage.jsx` - Tenant lifecycle management

### Hooks
- `/src/hooks/useAdmin.js` - Admin panel state management
  - `useAdminAccess()` - Role checking
  - `useTenantList()` - Tenant list with filters/pagination
  - `useTenantDetail(id)` - Single tenant with actions

### Services
- `/src/services/adminService.js` - Admin API functions
  - Tenant CRUD operations
  - User management (disable, reset password)
  - Feature flag and quota overrides

## Access Control

### Defense-in-Depth
All admin pages include inline role checks as defense-in-depth:

```jsx
// In SuperAdminDashboardPage
const isSuperAdmin = userProfile?.role === 'super_admin';
if (!isSuperAdmin) {
  return <AccessDenied />;
}
```

### Route-Level Protection
Primary access control is in `App.jsx`:
- Lines 575-602: Role-based dashboard routing
- Lines 770-800: Sidebar admin tools visibility

## Testing

### Unit Tests
- `/tests/unit/hooks/useAdmin.test.js` - Hook tests
- `/tests/unit/services/adminService.test.js` - Service tests

### E2E Tests
- `/tests/e2e/admin.spec.js` - Playwright tests (requires super admin credentials)

To run admin E2E tests:
```bash
TEST_SUPERADMIN_EMAIL=... TEST_SUPERADMIN_PASSWORD=... npm run test:e2e
```

## Confirmation Modals

Destructive actions require confirmation:
- **Suspend Tenant**: Red modal, warns about blocking users
- **Reactivate Tenant**: Green modal for unsuspension
- **Plan Change**: Selection modal with current plan highlighted
- **Quota Override**: Modal for setting custom limits
