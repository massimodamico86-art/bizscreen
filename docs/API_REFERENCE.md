# BizScreen Public API Reference

Complete reference for the BizScreen Public API, enabling external systems to integrate with your digital signage.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limits](#rate-limits)
4. [Endpoints](#endpoints)
   - [Update App Configuration](#update-app-configuration)
   - [Trigger Campaign Action](#trigger-campaign-action)
   - [Add Playlist Item](#add-playlist-item)
5. [Error Handling](#error-handling)
6. [Node.js SDK](#nodejs-sdk)
7. [Best Practices](#best-practices)

---

## Overview

The BizScreen Public API allows you to programmatically:

- **Update app configurations** (menu boards, weather widgets, data tables)
- **Trigger campaign actions** (activate flash sales, pause promotions)
- **Manage playlists** (add content items programmatically)

**Base URL:**
```
https://your-domain.vercel.app/api/public
```

All endpoints require authentication via Bearer token and accept/return JSON.

---

## Authentication

### Creating an API Token

1. Log in to your BizScreen dashboard
2. Navigate to **Settings > Developer Settings**
3. Click **Create Token**
4. Enter a descriptive name (e.g., "POS Integration")
5. Select the required permissions (scopes)
6. Click **Create Token**
7. **Copy the token immediately** - it won't be shown again

### Using the Token

Include your token in the `Authorization` header:

```http
Authorization: Bearer biz_a1b2c3d4e5f6...
```

**Example with curl:**
```bash
curl -X POST https://your-domain.vercel.app/api/public/campaigns/trigger \
  -H "Authorization: Bearer biz_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "uuid-here", "action": "activate"}'
```

### Available Scopes

| Scope | Description |
|-------|-------------|
| `apps:read` | Read app configurations |
| `apps:write` | Update app configurations |
| `campaigns:read` | Read campaign data |
| `campaigns:write` | Create, update, activate/pause campaigns |
| `playlists:read` | Read playlist data |
| `playlists:write` | Create/update playlists, add items |
| `screens:read` | Read screen/device information |
| `media:read` | Read media assets |
| `media:write` | Upload and manage media |

**Scope wildcards:** You can use `apps:*` to grant both read and write for apps.

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public API | 120 requests | 1 minute |
| Per Token | 60 requests | 1 minute |

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

**Response headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying

---

## Endpoints

### Update App Configuration

Update the configuration of a dynamic app (Weather, DataTable, RSS, Menu Board, etc.).

**Endpoint:** `POST /api/public/apps/update-config`

**Required Scope:** `apps:write`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appId` | string (UUID) | Yes | ID of the media asset (app) |
| `config` | object | Yes | Configuration to merge with existing |

#### Example Request

```bash
curl -X POST https://your-domain.vercel.app/api/public/apps/update-config \
  -H "Authorization: Bearer biz_a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "config": {
      "items": [
        {"name": "Burger", "price": "$12.99", "description": "Classic beef burger"},
        {"name": "Fries", "price": "$4.99", "description": "Crispy golden fries"}
      ],
      "settings": {
        "currency": "USD",
        "showImages": true
      }
    }
  }'
```

**Node.js with fetch:**
```javascript
const response = await fetch('https://your-domain.vercel.app/api/public/apps/update-config', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.BIZSCREEN_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    appId: '550e8400-e29b-41d4-a716-446655440000',
    config: {
      items: [
        { name: 'Burger', price: '$12.99' },
        { name: 'Fries', price: '$4.99' }
      ]
    }
  })
});

const result = await response.json();
console.log(result);
```

#### Success Response (200)

```json
{
  "success": true,
  "app": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Main Menu Board",
    "type": "menu_board",
    "config": {
      "items": [...],
      "settings": {...}
    },
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Supported App Types

| Type | Description |
|------|-------------|
| `weather` | Weather widget |
| `clock` | Clock display |
| `rss` | RSS feed reader |
| `html` | Custom HTML content |
| `webpage` | Embedded webpage |
| `data_table` | Data table display |
| `menu_board` | Restaurant menu |
| `social` | Social media feeds |

---

### Trigger Campaign Action

Activate, pause, or end a campaign programmatically. Useful for triggering flash sales from POS or CRM systems.

**Endpoint:** `POST /api/public/campaigns/trigger`

**Required Scope:** `campaigns:write`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign |
| `action` | string | Yes | One of: `activate`, `pause`, `end` |

#### Actions

| Action | Description |
|--------|-------------|
| `activate` | Sets campaign active, adjusts start date if in future |
| `pause` | Deactivates campaign without changing end date |
| `end` | Deactivates and sets end date to now |

#### Example Request

```bash
curl -X POST https://your-domain.vercel.app/api/public/campaigns/trigger \
  -H "Authorization: Bearer biz_a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "660e8400-e29b-41d4-a716-446655440001",
    "action": "activate"
  }'
```

**Node.js with fetch:**
```javascript
const response = await fetch('https://your-domain.vercel.app/api/public/campaigns/trigger', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.BIZSCREEN_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    campaignId: '660e8400-e29b-41d4-a716-446655440001',
    action: 'activate'
  })
});

const result = await response.json();
console.log(result);
```

#### Success Response (200)

```json
{
  "success": true,
  "campaign": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Flash Sale - 50% Off",
    "is_active": true,
    "start_date": "2024-01-15T10:30:00.000Z",
    "end_date": "2024-01-16T23:59:59.000Z",
    "priority": 100,
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "action_applied": "activate"
}
```

---

### Add Playlist Item

Add a media item or inline app to an existing playlist.

**Endpoint:** `POST /api/public/playlists/add-item`

**Required Scope:** `playlists:write`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `playlistId` | string (UUID) | Yes | ID of the playlist |
| `item` | object | Yes | Item to add (see below) |

**Item Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mediaId` | string (UUID) | One of mediaId or appType | Existing media asset ID |
| `appType` | string | One of mediaId or appType | Type for inline app creation |
| `appConfig` | object | If appType | Config for the inline app |
| `duration` | number | No | Duration in seconds (default: 10) |
| `position` | string/number | No | `"start"`, `"end"`, or index number (default: `"end"`) |

**Available App Types for Inline Creation:**
- `webpage`
- `html`
- `rss`
- `clock`
- `weather`

#### Example: Add Existing Media

```bash
curl -X POST https://your-domain.vercel.app/api/public/playlists/add-item \
  -H "Authorization: Bearer biz_a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "playlistId": "770e8400-e29b-41d4-a716-446655440002",
    "item": {
      "mediaId": "880e8400-e29b-41d4-a716-446655440003",
      "duration": 15,
      "position": "end"
    }
  }'
```

#### Example: Add Inline Webpage App

```javascript
const response = await fetch('https://your-domain.vercel.app/api/public/playlists/add-item', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.BIZSCREEN_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    playlistId: '770e8400-e29b-41d4-a716-446655440002',
    item: {
      appType: 'webpage',
      appConfig: {
        name: 'Today\'s Specials',
        url: 'https://restaurant.com/specials'
      },
      duration: 20,
      position: 'start'
    }
  })
});
```

#### Success Response (200)

```json
{
  "success": true,
  "playlist": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Lobby Display"
  },
  "item": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "position": 0,
    "duration": 20,
    "media": {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "name": "Today's Specials",
      "type": "webpage"
    }
  }
}
```

---

## Error Handling

All errors return a JSON response with an `error` field.

### Error Response Format

```json
{
  "error": "Description of what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `400` | Bad Request | Missing/invalid fields, invalid JSON |
| `401` | Unauthorized | Missing or invalid API token |
| `403` | Forbidden | Token lacks required scope, resource not owned |
| `404` | Not Found | Resource (app, campaign, playlist) doesn't exist |
| `405` | Method Not Allowed | Wrong HTTP method (e.g., GET instead of POST) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side issue |

### Example Error Responses

**401 - Invalid Token:**
```json
{
  "error": "Invalid API token"
}
```

**403 - Insufficient Scope:**
```json
{
  "error": "Insufficient permissions. Required scopes: campaigns:write"
}
```

**404 - Not Found:**
```json
{
  "error": "Campaign not found"
}
```

**429 - Rate Limited:**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

---

## Node.js SDK

We provide a lightweight Node.js SDK for easier integration.

### Installation

Copy the SDK files from the `sdk/node/` directory in our repository, or use directly:

```javascript
import { BizScreenClient } from './sdk/node/index.js';
```

### Usage

```javascript
import { BizScreenClient } from './sdk/node/index.js';

const client = new BizScreenClient({
  apiBaseUrl: 'https://your-domain.vercel.app',
  apiToken: process.env.BIZSCREEN_API_TOKEN
});

// Update an app configuration
await client.updateAppConfig({
  appId: 'your-app-uuid',
  config: {
    items: [{ name: 'Burger', price: '$12.99' }]
  }
});

// Trigger a campaign
await client.triggerCampaign({
  campaignId: 'your-campaign-uuid',
  action: 'activate'
});

// Add item to playlist
await client.addPlaylistItem({
  playlistId: 'your-playlist-uuid',
  item: {
    mediaId: 'your-media-uuid',
    duration: 15
  }
});
```

### SDK Methods

| Method | Description |
|--------|-------------|
| `updateAppConfig({ appId, config })` | Update app configuration |
| `triggerCampaign({ campaignId, action })` | Activate/pause/end campaign |
| `addPlaylistItem({ playlistId, item })` | Add item to playlist |

See the [examples](../examples/) folder for complete integration examples.

---

## Best Practices

### 1. Handle Rate Limits Gracefully

```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const retryAfter = error.retryAfter || 60;
        console.log(`Rate limited, waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### 2. Use Minimal Scopes

Only request the scopes your integration actually needs. For a POS system updating menu boards:

- **Good:** `apps:write` only
- **Avoid:** `*` (full access)

### 3. Rotate Tokens Periodically

- Create new tokens quarterly
- Revoke old tokens after transition
- Never share tokens between environments

### 4. Test in Staging First

- Create a staging tenant for testing
- Use test mode API tokens
- Verify all flows before production

### 5. Log API Responses

```javascript
const response = await client.triggerCampaign({...});
console.log(`Campaign triggered: ${response.campaign.name} -> ${response.action_applied}`);
```

### 6. Handle Errors Specifically

```javascript
try {
  await client.updateAppConfig({ appId, config });
} catch (error) {
  if (error.status === 404) {
    console.error('App not found - check your app ID');
  } else if (error.status === 403) {
    console.error('Permission denied - check your token scopes');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## Related Documentation

- [Webhooks Guide](./WEBHOOKS.md) - Receive real-time event notifications
- [Deployment Guide](./DEPLOYMENT.md) - Deploy your BizScreen instance
- [Demo Mode Guide](./DEMO_MODE.md) - Test without affecting production

---

*API Reference v1.0 | Updated: Phase 45*
