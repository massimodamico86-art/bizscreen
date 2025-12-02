# Data Compliance & Export

This guide covers data export, deletion, and compliance features for GDPR and other regulations.

## Overview

BizScreen provides:
- **Full Data Export** - Download all tenant data as JSON
- **Selective CSV Export** - Export specific data types
- **Tenant Deletion** - Permanent data removal (super_admin)
- **Audit Logging** - Track data access and changes

## Data Export

### Who Can Export

| Role | Can Export |
|------|-----------|
| Tenant Owner | Their own data |
| Super Admin | Any tenant's data |

### Full JSON Export

Export all tenant data as a single JSON file.

**Via UI:**
1. Go to **Settings → Enterprise → Data & Compliance**
2. Click **Full Data Export**
3. JSON file downloads automatically

**Via API:**
```http
POST /api/compliance/export
Authorization: Bearer <user-token>

{
  "tenant_id": "optional-uuid",  // Super admin only
  "include_media": false
}

Response: 200 OK
Content-Disposition: attachment; filename="bizscreen-export-2025-01-15.json"
{
  "export_info": {
    "tenant_id": "uuid",
    "exported_at": "2025-01-15T10:00:00Z",
    "export_version": "1.0"
  },
  "profile": { ... },
  "team_members": [ ... ],
  "screens": [ ... ],
  "playlists": [ ... ],
  "layouts": [ ... ],
  "schedules": [ ... ],
  "campaigns": [ ... ],
  "media_assets": [ ... ],
  "locations": [ ... ],
  "activity_log": [ ... ],
  "api_tokens": [ ... ],
  "webhooks": [ ... ],
  "sso_config": [ ... ],
  "billing_info": { ... }
}
```

### CSV Export

Export specific data types as CSV for spreadsheet use.

**Via UI:**
1. Go to **Settings → Enterprise → Data & Compliance**
2. Click desired export button (Screens, Playlists, Media, Activity)

**Available Exports:**
- `screens` - All screen/device data
- `playlists` - Playlist configurations
- `media` - Media asset metadata (not files)
- `activity` - Activity log (last 1000 entries)

## Data Included in Export

### Profile Data
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "business_name": "Acme Corp",
  "role": "client",
  "subscription_tier": "pro",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Screens
```json
{
  "id": "uuid",
  "name": "Lobby Display",
  "pairing_code": "ABC123",
  "status": "online",
  "resolution": "1920x1080",
  "last_seen_at": "2025-01-15T10:00:00Z",
  "assigned_playlist_id": "uuid",
  "assigned_layout_id": "uuid"
}
```

### Playlists
```json
{
  "id": "uuid",
  "name": "Welcome Playlist",
  "description": "Main lobby content",
  "items": [ ... ],
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Media Assets
```json
{
  "id": "uuid",
  "name": "logo.png",
  "type": "image",
  "url": "https://cdn.example.com/...",
  "thumbnail_url": "https://cdn.example.com/...",
  "file_size": 102400,
  "duration": null,
  "created_at": "2025-01-01T00:00:00Z"
}
```

Note: Export includes metadata and URLs, not actual file binary data.

### Activity Log
```json
{
  "id": "uuid",
  "action": "playlist.updated",
  "entity_type": "playlist",
  "entity_id": "uuid",
  "details": { "name": "Updated Name" },
  "created_at": "2025-01-15T10:00:00Z"
}
```

## Data Deletion

### Warning

**Data deletion is permanent and cannot be undone.**

All associated data is removed:
- Profile and settings
- All screens and devices
- All playlists, layouts, schedules
- All media asset metadata
- All campaigns
- All activity logs
- All API tokens and webhooks
- SSO configuration
- Team member associations

### Who Can Delete

Only **super_admin** can delete tenant data.

### Deletion Process

1. Navigate to **Tenant Admin** page
2. Find the tenant to delete
3. Click **Delete Tenant**
4. Type the tenant's email address exactly
5. Enter deletion reason (optional)
6. Confirm deletion

### API Deletion

```http
POST /api/compliance/delete
Authorization: Bearer <super-admin-token>

{
  "tenant_id": "uuid-to-delete",
  "confirmation_email": "tenant@example.com",
  "reason": "Customer requested account deletion"
}

Response: 200 OK
{
  "success": true,
  "message": "Tenant data deleted successfully",
  "tenant_id": "uuid",
  "tenant_email": "tenant@example.com",
  "deleted_at": "2025-01-15T10:00:00Z",
  "items_deleted": {
    "activity_log": 150,
    "sso_providers": 1,
    "webhooks": 3,
    "api_tokens": 5,
    "campaigns": 10,
    "schedules": 15,
    "playlists": 20,
    "layouts": 8,
    "screen_groups": 5,
    "tv_devices": 12,
    "media_assets": 200,
    "locations": 3,
    "listings": 1,
    "team_members": 5
  }
}
```

### Deletion Audit Log

All deletions are logged in `data_deletion_log`:
```json
{
  "id": "uuid",
  "tenant_id": "deleted-tenant-uuid",
  "tenant_email": "deleted@example.com",
  "tenant_name": "Acme Corp",
  "deleted_by": "admin-uuid",
  "deleted_by_email": "admin@bizscreen.com",
  "deletion_type": "full",
  "items_deleted": { ... },
  "reason": "Customer requested",
  "created_at": "2025-01-15T10:00:00Z"
}
```

## Data Retention

### Default Retention Periods

| Data Type | Retention |
|-----------|-----------|
| Activity Logs | 90 days |
| Analytics Data | 1 year |
| Media Files | Until deleted |
| Account Data | Until account deletion |
| Deletion Logs | Permanent (for audit) |

### Right to Erasure (GDPR)

To comply with GDPR Article 17 (Right to Erasure):

1. User requests account deletion
2. Super admin exports data (if requested)
3. Super admin performs deletion
4. Confirmation sent to user

Note: Some data may be retained for legal/audit purposes.

## Audit Features

### Activity Logging

All significant actions are logged:
- User logins and logouts
- Content creation/modification/deletion
- Screen status changes
- Settings changes
- Team member changes
- API token usage

### Viewing Audit Logs

**Via UI:**
1. Go to **Activity Log** in navigation
2. Filter by date, action type, or entity
3. Export as CSV if needed

**Via API:**
See Activity Log API documentation.

## Security Considerations

### Export Security

- Exports are generated on-demand
- No persistent export files stored
- Downloads over HTTPS only
- Authenticated users only

### Deletion Security

- Multi-step confirmation required
- Email verification required
- Super admin only
- Audit logged

### Data Isolation

- Tenant data is fully isolated
- RLS policies enforce separation
- Cross-tenant access prevented
- Exports scoped to single tenant

## GDPR Compliance Checklist

- [x] Data export (Article 20)
- [x] Right to erasure (Article 17)
- [x] Audit logging (Article 30)
- [x] Data isolation (Article 32)
- [x] Breach notification support (Article 33)
- [x] Data processing agreement support

## API Reference

### Export Data
```http
POST /api/compliance/export
Authorization: Bearer <token>

Body:
{
  "tenant_id": "uuid",        // Optional, super_admin only
  "include_media": false      // Include media URLs
}

Response: JSON export file
```

### Delete Data
```http
POST /api/compliance/delete
Authorization: Bearer <super-admin-token>

Body:
{
  "tenant_id": "uuid",
  "confirmation_email": "exact@email.match",
  "reason": "Optional reason"
}

Response:
{
  "success": true,
  "items_deleted": { ... }
}
```

## Support

For compliance questions or data requests:
- Email: support@bizscreen.com
- Include: Tenant email, request type, urgency
