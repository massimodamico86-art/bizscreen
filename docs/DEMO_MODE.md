# Demo Mode & Sales Enablement

This document describes the demo mode system for BizScreen, enabling self-serve demos and sales presentations.

## Overview

Demo mode provides:
- **Demo tenants** with pre-populated content
- **Auto-reset** functionality to keep demos fresh
- **Protected assets** that survive resets
- **Sales tools** for super admins

## Database Schema

### Profile Fields

Added to `profiles` table:

| Column | Type | Description |
|--------|------|-------------|
| `is_demo_tenant` | boolean | Whether this account is a demo |
| `demo_reset_interval_minutes` | integer | How often to reset (default: 1440 = 24h) |
| `demo_last_reset_at` | timestamp | When last reset occurred |
| `demo_business_type` | text | Business type for content pack |
| `demo_protected_assets` | text[] | Array of protected asset IDs |

### Demo Content Packs

The `demo_content_packs` table contains pre-built content for each business type:

- **restaurant**: Menu boards, specials, happy hour content
- **salon**: Services menu, appointment displays, promotions
- **gym**: Class schedules, membership info, trainer spotlights
- **retail**: Product displays, sales announcements, store info
- **other**: Generic business content

Each pack includes:
- Sample playlists
- Layout configurations
- Media asset references
- Screen configurations

## RPC Functions

### create_demo_tenant

Creates a new demo tenant with pre-populated content.

```sql
SELECT create_demo_tenant(
  'demo@example.com',
  'Demo Business',
  'restaurant',
  1440  -- reset interval in minutes
);
```

### reset_demo_tenant

Resets a demo tenant to fresh state, preserving protected assets.

```sql
SELECT reset_demo_tenant('tenant-uuid-here');
```

### list_demo_tenants

Lists all demo tenants with their status.

```sql
SELECT * FROM list_demo_tenants();
```

### get_stale_demo_tenants

Finds demo tenants due for reset.

```sql
SELECT * FROM get_stale_demo_tenants();
```

### is_demo_protected_asset

Checks if an asset is protected from deletion.

```sql
SELECT is_demo_protected_asset('asset-uuid', 'playlist');
```

## API Endpoints

### GET /api/demo/reset-stale-tenants

Cron endpoint to auto-reset stale demo tenants.

**Authentication:**
- `Authorization: Bearer <CRON_SECRET>` for automated cron jobs
- Or authenticated as `super_admin`

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:00:00Z",
  "checked": 5,
  "reset": 3,
  "failed": 0,
  "details": [
    {
      "id": "uuid",
      "email": "demo@example.com",
      "status": "reset",
      "minutesSinceLastReset": 1500
    }
  ]
}
```

## Frontend Components

### DemoModeBanner

Displays a banner when logged into a demo tenant:

```jsx
import DemoModeBanner from './components/DemoModeBanner';

// In your layout:
<DemoModeBanner />
```

### useDemoMode Hook

Check if current user is in demo mode:

```jsx
import { useDemoMode } from './components/DemoModeBanner';

function MyComponent() {
  const { isDemo, loading } = useDemoMode();

  if (isDemo) {
    // Show demo-specific UI
  }
}
```

### DemoProtectedBadge

Shows a badge for protected demo content:

```jsx
import { DemoProtectedBadge } from './components/DemoModeBanner';

<DemoProtectedBadge isProtected={item.isProtected} />
```

### DemoToolsPage

Super admin page for managing demo tenants:

- List all demo tenants
- Create new demo tenants
- Reset demo data
- Impersonate demo users
- Generate shareable demo links

## Vercel Cron Setup

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/demo/reset-stale-tenants",
      "schedule": "0 * * * *"
    }
  ]
}
```

Set `CRON_SECRET` environment variable in Vercel.

## Services

### demoService.js

```javascript
import {
  createDemoTenant,
  resetDemoTenant,
  listDemoTenants,
  checkIsDemoTenant,
  isProtectedAsset,
  generateDemoLink,
  DEMO_BUSINESS_TYPES
} from './services/demoService';

// Create a demo
const { data, error } = await createDemoTenant(
  'demo@example.com',
  'Demo Restaurant',
  'restaurant',
  1440
);

// Check if demo
const info = await checkIsDemoTenant();
if (info.isDemoTenant) {
  console.log('In demo mode');
}

// Generate shareable link
const link = generateDemoLink(tenantId, 'restaurant');
```

## Protected Assets

When a demo is reset:
1. All user-created content is deleted
2. Content from the demo pack is preserved
3. Protected assets (marked in `demo_protected_assets`) are kept

To mark an asset as protected:
```javascript
// In demo content pack
{
  "playlists": [
    { "name": "Welcome Playlist", "protected": true }
  ]
}
```

## Business Type Configuration

| Type | Description | Pre-loaded Content |
|------|-------------|-------------------|
| `restaurant` | Food service | Menu boards, daily specials, happy hour |
| `salon` | Beauty/wellness | Services menu, pricing, staff bios |
| `gym` | Fitness | Class schedules, membership tiers |
| `retail` | Store | Product features, sales, store hours |
| `other` | Generic | Welcome screen, info display |

## Security Considerations

1. **Demo tenants cannot access production data** - RLS policies ensure isolation
2. **Protected assets are enforced at database level** - Cannot be circumvented
3. **Reset API requires authentication** - Either cron secret or super_admin
4. **Demo links are read-only** - Cannot modify production data

## Troubleshooting

### Demo not resetting

1. Check `CRON_SECRET` is set
2. Verify cron job is running in Vercel dashboard
3. Check `demo_reset_interval_minutes` value
4. Review API logs for errors

### Protected content deleted

1. Verify asset is in `demo_protected_assets` array
2. Check content pack has `protected: true` flag
3. Review reset function logic

### Demo content not appearing

1. Run migration to create content packs
2. Verify `demo_business_type` is set correctly
3. Check for RLS policy issues
