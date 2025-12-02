# BizScreen Webhooks Guide

Receive real-time notifications when events occur in your BizScreen account.

---

## Table of Contents

1. [Overview](#overview)
2. [Setting Up Webhooks](#setting-up-webhooks)
3. [Events Reference](#events-reference)
4. [Payload Format](#payload-format)
5. [Security & Verification](#security--verification)
6. [Retry & Delivery](#retry--delivery)
7. [Best Practices](#best-practices)

---

## Overview

Webhooks allow your application to receive real-time HTTP notifications when events occur in BizScreen, such as:

- A screen comes online or goes offline
- A campaign is activated or ends
- Content is approved or rejected
- Playlists or layouts are updated
- New media is uploaded

**Use Cases:**
- Sync campaign status with your CRM
- Alert staff when a screen goes offline
- Trigger workflows when content is approved
- Log all content changes for compliance

---

## Setting Up Webhooks

### 1. Create an Endpoint

In your BizScreen dashboard:

1. Navigate to **Settings > Developer Settings**
2. Click the **Webhooks** tab
3. Click **Add Endpoint**
4. Enter your HTTPS URL (e.g., `https://your-server.com/webhooks/bizscreen`)
5. Select the events you want to receive
6. Click **Create Endpoint**

### 2. Save Your Signing Secret

After creation, you'll see a signing secret (starts with `whsec_`).

**Copy this immediately** - it's only shown once.

Store it securely as an environment variable:
```bash
BIZSCREEN_WEBHOOK_SECRET=whsec_abc123...
```

### 3. Requirements

- **HTTPS only** - HTTP URLs are not accepted
- **Public endpoint** - Must be reachable from the internet
- **Quick response** - Should respond within 10 seconds
- **2xx status** - Return 200-299 to acknowledge receipt

---

## Events Reference

### Device Events

#### `device.online`

Fired when a screen/device comes online.

```json
{
  "id": "evt_a1b2c3d4e5f6",
  "type": "device.online",
  "created_at": "2024-01-15T10:30:00.000Z",
  "data": {
    "screen_id": "550e8400-e29b-41d4-a716-446655440000",
    "screen_name": "Lobby Display",
    "device_type": "fire_tv",
    "ip_address": "192.168.1.100",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**When it fires:** When a device establishes connection after being offline.

---

#### `device.offline`

Fired when a screen/device goes offline.

```json
{
  "id": "evt_b2c3d4e5f6g7",
  "type": "device.offline",
  "created_at": "2024-01-15T10:45:00.000Z",
  "data": {
    "screen_id": "550e8400-e29b-41d4-a716-446655440000",
    "screen_name": "Lobby Display",
    "last_seen_at": "2024-01-15T10:30:00.000Z",
    "offline_duration_minutes": 15,
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T10:45:00.000Z"
  }
}
```

**When it fires:** When a device misses heartbeats and is marked offline (typically after 5 minutes).

---

### Campaign Events

#### `campaign.activated`

Fired when a campaign becomes active.

```json
{
  "id": "evt_c3d4e5f6g7h8",
  "type": "campaign.activated",
  "created_at": "2024-01-15T09:00:00.000Z",
  "data": {
    "campaign_id": "770e8400-e29b-41d4-a716-446655440002",
    "campaign_name": "Flash Sale - 50% Off",
    "action": "activate",
    "is_active": true,
    "start_date": "2024-01-15T09:00:00.000Z",
    "end_date": "2024-01-16T23:59:59.000Z",
    "priority": 100,
    "triggered_by": "api",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T09:00:00.000Z"
  }
}
```

**When it fires:** When a campaign is activated via UI, API, or scheduled start.

---

#### `campaign.deactivated`

Fired when a campaign is paused.

```json
{
  "id": "evt_d4e5f6g7h8i9",
  "type": "campaign.deactivated",
  "created_at": "2024-01-15T14:00:00.000Z",
  "data": {
    "campaign_id": "770e8400-e29b-41d4-a716-446655440002",
    "campaign_name": "Flash Sale - 50% Off",
    "action": "pause",
    "is_active": false,
    "previous_state": { "is_active": true },
    "triggered_by": "user",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T14:00:00.000Z"
  }
}
```

**When it fires:** When a campaign is paused via UI or API.

---

#### `campaign.ended`

Fired when a campaign ends.

```json
{
  "id": "evt_e5f6g7h8i9j0",
  "type": "campaign.ended",
  "created_at": "2024-01-16T23:59:59.000Z",
  "data": {
    "campaign_id": "770e8400-e29b-41d4-a716-446655440002",
    "campaign_name": "Flash Sale - 50% Off",
    "action": "end",
    "is_active": false,
    "end_date": "2024-01-16T23:59:59.000Z",
    "triggered_by": "schedule",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-16T23:59:59.000Z"
  }
}
```

**When it fires:** When a campaign reaches its end date or is ended via API.

---

### Content Events

#### `content.approved`

Fired when content passes approval workflow.

```json
{
  "id": "evt_f6g7h8i9j0k1",
  "type": "content.approved",
  "created_at": "2024-01-15T11:00:00.000Z",
  "data": {
    "content_id": "880e8400-e29b-41d4-a716-446655440003",
    "content_name": "New Product Banner",
    "content_type": "image",
    "approved_by": "user_123",
    "approver_name": "John Smith",
    "approval_notes": "Looks good!",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T11:00:00.000Z"
  }
}
```

**When it fires:** When content moves from pending to approved status.

---

#### `content.rejected`

Fired when content is rejected in approval workflow.

```json
{
  "id": "evt_g7h8i9j0k1l2",
  "type": "content.rejected",
  "created_at": "2024-01-15T11:30:00.000Z",
  "data": {
    "content_id": "990e8400-e29b-41d4-a716-446655440004",
    "content_name": "Promotional Video",
    "content_type": "video",
    "rejected_by": "user_456",
    "rejector_name": "Jane Doe",
    "rejection_reason": "Audio quality too low",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T11:30:00.000Z"
  }
}
```

**When it fires:** When content is rejected with a reason.

---

### Playlist & Layout Events

#### `playlist.updated`

Fired when a playlist is modified.

```json
{
  "id": "evt_h8i9j0k1l2m3",
  "type": "playlist.updated",
  "created_at": "2024-01-15T12:00:00.000Z",
  "data": {
    "playlist_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "playlist_name": "Lobby Display",
    "action": "item_added",
    "item": {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "media_id": "cc0e8400-e29b-41d4-a716-446655440007",
      "position": 3,
      "duration": 15
    },
    "triggered_by": "api",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T12:00:00.000Z"
  }
}
```

**When it fires:** When items are added, removed, or reordered in a playlist.

---

#### `layout.updated`

Fired when a layout configuration changes.

```json
{
  "id": "evt_i9j0k1l2m3n4",
  "type": "layout.updated",
  "created_at": "2024-01-15T13:00:00.000Z",
  "data": {
    "layout_id": "dd0e8400-e29b-41d4-a716-446655440008",
    "layout_name": "Two Zone Split",
    "changes": ["zones", "background"],
    "updated_by": "user_789",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T13:00:00.000Z"
  }
}
```

**When it fires:** When layout zones, backgrounds, or settings are modified.

---

### Media Events

#### `media.uploaded`

Fired when new media is uploaded.

```json
{
  "id": "evt_j0k1l2m3n4o5",
  "type": "media.uploaded",
  "created_at": "2024-01-15T14:00:00.000Z",
  "data": {
    "media_id": "ee0e8400-e29b-41d4-a716-446655440009",
    "media_name": "January_Promo.mp4",
    "media_type": "video",
    "file_size": 15728640,
    "duration": 30,
    "uploaded_by": "user_123",
    "source": "upload",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2024-01-15T14:00:00.000Z"
  }
}
```

**When it fires:** When a media file upload completes successfully.

---

## Payload Format

All webhook payloads follow this structure:

```json
{
  "id": "evt_unique_event_id",
  "type": "event.type",
  "created_at": "2024-01-15T10:30:00.000Z",
  "data": {
    // Event-specific data
    "tenant_id": "your-tenant-uuid",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Guaranteed Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event identifier |
| `type` | string | Event type (e.g., `device.online`) |
| `created_at` | ISO 8601 | When the event was created |
| `data` | object | Event-specific payload |
| `data.tenant_id` | UUID | Your tenant identifier |
| `data.timestamp` | ISO 8601 | When the event occurred |

---

## Security & Verification

### BizScreen-Signature Header

Every webhook request includes a signature header:

```
BizScreen-Signature: a1b2c3d4e5f6...
```

This is an HMAC-SHA256 hash of the raw request body, signed with your endpoint's secret.

### Verifying Signatures (Node.js)

```javascript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(rawBody, signature, secret) {
  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

// Express.js example
app.post('/webhooks/bizscreen', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['bizscreen-signature'];
  const rawBody = req.body.toString();

  if (!verifyWebhookSignature(rawBody, signature, process.env.BIZSCREEN_WEBHOOK_SECRET)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(rawBody);
  console.log(`Received event: ${event.type}`);

  // Process the event...

  res.status(200).send('OK');
});
```

### Verifying Signatures (Python)

```python
import hmac
import hashlib

def verify_webhook_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

# Flask example
@app.route('/webhooks/bizscreen', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('BizScreen-Signature')
    raw_body = request.get_data()

    if not verify_webhook_signature(raw_body, signature, os.environ['BIZSCREEN_WEBHOOK_SECRET']):
        return 'Invalid signature', 401

    event = request.get_json()
    print(f"Received event: {event['type']}")

    # Process the event...

    return 'OK', 200
```

### Additional Headers

| Header | Description |
|--------|-------------|
| `BizScreen-Signature` | HMAC-SHA256 signature |
| `BizScreen-Event` | Event type (e.g., `device.online`) |
| `BizScreen-Delivery-ID` | Unique delivery attempt ID |
| `User-Agent` | `BizScreen-Webhooks/1.0` |
| `Content-Type` | `application/json` |

---

## Retry & Delivery

### Retry Schedule

If your endpoint returns a non-2xx status or times out, BizScreen will retry with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | ~1 minute |
| 3 | ~5 minutes |
| 4 | ~30 minutes |
| 5 | ~2 hours |
| 6 | ~8 hours |
| 7 (final) | ~24 hours |

After 7 failed attempts, the event is marked as `exhausted` and won't be retried.

### Timeouts

- Requests timeout after **10 seconds**
- If your processing takes longer, acknowledge immediately and process asynchronously

### Handling Duplicates

Your endpoint may receive the same event multiple times due to retries. Use the `id` field for idempotency:

```javascript
const processedEvents = new Set();

app.post('/webhooks/bizscreen', (req, res) => {
  const event = req.body;

  // Check if already processed
  if (processedEvents.has(event.id)) {
    console.log(`Skipping duplicate event: ${event.id}`);
    return res.status(200).send('OK');
  }

  // Process the event
  processEvent(event);

  // Mark as processed (use database in production)
  processedEvents.add(event.id);

  res.status(200).send('OK');
});
```

### Viewing Delivery Logs

In your BizScreen dashboard:

1. Go to **Settings > Developer Settings > Webhooks**
2. Click **Deliveries** next to an endpoint
3. View status, response codes, and error messages

---

## Best Practices

### 1. Respond Quickly

Return a 2xx status within 10 seconds. Process asynchronously if needed:

```javascript
app.post('/webhooks/bizscreen', (req, res) => {
  // Acknowledge immediately
  res.status(200).send('OK');

  // Process asynchronously
  processEventAsync(req.body);
});
```

### 2. Always Verify Signatures

Never skip signature verification - it prevents spoofed requests.

### 3. Handle All Event Types

Even if you only care about some events, handle unknown types gracefully:

```javascript
switch (event.type) {
  case 'device.offline':
    alertTeam(event.data);
    break;
  case 'campaign.activated':
    syncToCRM(event.data);
    break;
  default:
    console.log(`Unhandled event type: ${event.type}`);
}
```

### 4. Use Idempotency Keys

Store processed event IDs to handle retries:

```javascript
// In database
await db.query(
  'INSERT INTO processed_webhooks (event_id, processed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
  [event.id]
);
```

### 5. Log Everything

Log received webhooks for debugging:

```javascript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event_id: event.id,
  event_type: event.type,
  tenant_id: event.data.tenant_id
}));
```

### 6. Test with Real Events

Use a tool like [webhook.site](https://webhook.site) to inspect payloads during development.

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Public API endpoints
- [Deployment Guide](./DEPLOYMENT.md) - Deploy your BizScreen instance

---

*Webhooks Guide v1.0 | Updated: Phase 45*
