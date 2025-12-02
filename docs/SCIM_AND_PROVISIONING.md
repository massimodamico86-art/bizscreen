# SCIM User Provisioning

This guide covers SCIM 2.0 user provisioning for automated user management.

## Overview

SCIM (System for Cross-domain Identity Management) enables:
- Automatic user creation/deactivation
- Syncing user attributes from IdP
- Centralized user lifecycle management

## Base URL

```
https://your-domain.com/api/scim
```

## Authentication

All SCIM endpoints require authentication via Bearer token:

```
Authorization: Bearer <your-api-token>
```

### Required Scopes

| Scope | Permission |
|-------|------------|
| `scim:read` | List and get users |
| `scim:write` | Create, update, delete users |

### Generating API Tokens

1. Go to **Settings → Developer → API Tokens**
2. Click **Create Token**
3. Enter name (e.g., "SCIM Provisioning")
4. Select scopes: `scim:read`, `scim:write`
5. Copy the generated token (shown only once)

## Endpoints

### List Users

```http
GET /api/scim/users
Authorization: Bearer <token>

Query Parameters:
  - startIndex: 1-based offset (default: 1)
  - count: Max users to return (default: 100)
  - filter: SCIM filter expression

Response: 200 OK
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 42,
  "startIndex": 1,
  "itemsPerPage": 100,
  "Resources": [
    {
      "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
      "id": "uuid",
      "externalId": "okta-id-123",
      "userName": "user@example.com",
      "name": {
        "formatted": "John Doe",
        "givenName": "John",
        "familyName": "Doe"
      },
      "displayName": "John Doe",
      "active": true,
      "emails": [
        {
          "value": "user@example.com",
          "primary": true,
          "type": "work"
        }
      ],
      "meta": {
        "resourceType": "User",
        "created": "2025-01-15T10:00:00Z",
        "lastModified": "2025-01-15T10:00:00Z",
        "location": "/api/scim/users/uuid"
      }
    }
  ]
}
```

### Get Single User

```http
GET /api/scim/users/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "uuid",
  "externalId": "okta-id-123",
  "userName": "user@example.com",
  "name": {
    "formatted": "John Doe"
  },
  "displayName": "John Doe",
  "active": true,
  "emails": [
    {
      "value": "user@example.com",
      "primary": true,
      "type": "work"
    }
  ],
  "meta": {
    "resourceType": "User",
    "created": "2025-01-15T10:00:00Z",
    "lastModified": "2025-01-15T10:00:00Z",
    "location": "/api/scim/users/uuid"
  }
}
```

### Create User

```http
POST /api/scim/users
Authorization: Bearer <token>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "newuser@example.com",
  "name": {
    "givenName": "New",
    "familyName": "User"
  },
  "displayName": "New User",
  "emails": [
    {
      "value": "newuser@example.com",
      "primary": true,
      "type": "work"
    }
  ],
  "externalId": "idp-id-456",
  "active": true
}

Response: 201 Created
Location: /api/scim/users/new-uuid
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "new-uuid",
  ...
}
```

### Replace User (PUT)

```http
PUT /api/scim/users/:id
Authorization: Bearer <token>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "displayName": "Updated Name",
  "active": true
}

Response: 200 OK
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "uuid",
  ...
}
```

### Update User (PATCH)

```http
PATCH /api/scim/users/:id
Authorization: Bearer <token>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "active",
      "value": false
    }
  ]
}

Response: 200 OK
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "uuid",
  "active": false,
  ...
}
```

### Deactivate User (DELETE)

```http
DELETE /api/scim/users/:id
Authorization: Bearer <token>

Response: 204 No Content
```

Note: DELETE performs a soft-delete (deactivation), not permanent removal.

## IdP Configuration

### Okta

1. Go to Applications → Your App → Provisioning
2. Enable SCIM provisioning
3. Set SCIM connector base URL: `https://your-domain.com/api/scim`
4. Authentication mode: OAuth Bearer Token
5. Enter your API token
6. Test connection
7. Enable desired provisioning features

### Azure AD

1. Go to Enterprise Applications → Your App → Provisioning
2. Set Provisioning Mode to Automatic
3. Set Tenant URL: `https://your-domain.com/api/scim`
4. Set Secret Token: Your API token
5. Test Connection
6. Configure attribute mappings
7. Start provisioning

### Generic SCIM

Most IdPs support generic SCIM configuration:
- Base URL: `https://your-domain.com/api/scim`
- Auth Type: Bearer Token
- Token: Your API token with `scim:read,scim:write` scopes

## Attribute Mapping

### Supported Attributes

| SCIM Attribute | BizScreen Field |
|---------------|-----------------|
| `userName` | Email (primary identifier) |
| `displayName` | Full Name |
| `name.givenName` | First Name |
| `name.familyName` | Last Name |
| `active` | Account Status |
| `externalId` | External ID (for sync tracking) |
| `emails[0].value` | Email |

### Role Mapping

By default, SCIM-provisioned users get the `client` role.

To assign roles via SCIM, use custom attributes or group membership (requires additional configuration).

## Filtering

SCIM filtering is supported for user queries:

```
GET /api/scim/users?filter=userName eq "user@example.com"
```

Supported operators:
- `eq` - Equals
- `ne` - Not equals
- `co` - Contains
- `sw` - Starts with
- `ew` - Ends with

## Error Responses

### 400 Bad Request
```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "400",
  "scimType": "invalidValue",
  "detail": "userName or email required"
}
```

### 401 Unauthorized
```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "401",
  "scimType": "invalidCredentials",
  "detail": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "403",
  "scimType": "forbidden",
  "detail": "scim:write scope required"
}
```

### 404 Not Found
```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "404",
  "scimType": "noTarget",
  "detail": "User not found"
}
```

## Example cURL Requests

### List Users
```bash
curl -X GET "https://your-domain.com/api/scim/users" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/scim+json"
```

### Create User
```bash
curl -X POST "https://your-domain.com/api/scim/users" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "new@example.com",
    "displayName": "New User",
    "emails": [{"value": "new@example.com", "primary": true}],
    "active": true
  }'
```

### Deactivate User
```bash
curl -X PATCH "https://your-domain.com/api/scim/users/USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    "Operations": [
      {"op": "replace", "path": "active", "value": false}
    ]
  }'
```

## Best Practices

1. **Secure Token Storage** - Never expose tokens in client-side code
2. **Least Privilege** - Only grant necessary scopes
3. **Token Rotation** - Rotate tokens periodically
4. **Monitor Sync** - Check provisioning logs regularly
5. **Test First** - Test with a single user before bulk provisioning

## Troubleshooting

### Users Not Syncing

1. Verify token has correct scopes
2. Check IdP provisioning logs
3. Ensure user attributes are mapped correctly
4. Test with cURL to isolate issues

### Duplicate Users

If users appear twice:
1. Check externalId is consistent
2. Ensure email matches between systems
3. Review IdP matching rules

### Deactivation Not Working

1. Verify PATCH is being sent (not DELETE)
2. Check `active: false` is in payload
3. Confirm token has `scim:write` scope
