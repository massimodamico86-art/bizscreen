# Features Research: Digital Signage Platform Enhancements

**Project:** BizScreen
**Research Date:** 2026-01-22
**Overall Confidence:** HIGH (existing database schema reviewed, industry practices verified)

---

## Executive Summary

BizScreen has foundational database schemas for content approvals, GDPR compliance, and playback analytics already in place (migrations 027, 106, 079). This research identifies what's table stakes vs differentiators for completing these features, plus the new device QR pairing and emergency exit capabilities.

**Key Finding:** The existing migrations provide solid foundations but lack UI implementations and several critical pieces:
- Approval workflows need notification system and approval queue UI
- GDPR compliance needs actual data aggregation and export generation
- Analytics needs view duration tracking at content level (not just scene level)
- Device pairing QR and emergency kiosk exit are entirely new to implement

---

## 1. Content Approval Workflow

### Existing Foundation

BizScreen already has:
- Approval status columns on `playlists`, `layouts`, `campaigns` tables
- Status options: `draft`, `in_review`, `approved`, `rejected`
- `review_requests` table with status tracking
- `review_comments` table for feedback
- `preview_links` table for shareable review URLs
- SECURITY DEFINER functions for public preview access

### Table Stakes (Minimum Viable)

| Feature | Complexity | Notes |
|---------|------------|-------|
| Submit content for approval | LOW | Status change + create review_request |
| Approval queue UI for reviewers | MEDIUM | List pending reviews, filter by type/status |
| Approve/reject with comment | LOW | Update status, add review_comment |
| Email notification on submit | LOW | Existing email stub needs real provider |
| Conditional publishing (only approved content plays) | MEDIUM | Player already checks status, verify enforcement |
| Preview link generation | LOW | Already implemented in DB functions |

**Industry Standard:** [OptiSigns](https://support.optisigns.com/hc/en-us/articles/360063693093-How-to-use-Approval-Workflow-feature), [Signagelive](https://signagelive.com/portfolio-item/approvals/), and [ScreenCloud](https://help.screencloud.com/en/articles/10121118-managing-custom-roles-and-permissions-in-screencloud) all offer approval workflows as Pro/Enterprise features with role-based permissions.

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-level approval chains | Supports compliance-heavy industries | HIGH | New table: approval_chains with sequence |
| Scheduled auto-publish after approval | Reduces manual publishing steps | MEDIUM | Combine with existing schedule system |
| Bulk approval actions | Saves time for content-heavy orgs | LOW | Batch update endpoint |
| External stakeholder review via link | Client review without account | MEDIUM | preview_links already supports this |
| Approval expiration | Auto-reject stale requests | LOW | Add expires_at to review_requests |
| Content diff view | See what changed between versions | HIGH | Requires content versioning system |

### Implementation Pattern (State Machine)

Based on [state machine design patterns](https://medium.com/@wacsk19921002/simplifying-approval-process-with-state-machine-a-practical-guide-part-1-modeling-26d8999002b0):

```
States: draft -> in_review -> approved -> published
                          \-> rejected -> draft (allows resubmit)

Events:
- submit_for_review: draft -> in_review
- approve: in_review -> approved
- reject: in_review -> rejected
- publish: approved -> published
- revise: rejected -> draft

Guards:
- Can only submit if content is complete
- Can only approve if user has approver role
- Can only publish approved content
```

### Database Enhancements Needed

```sql
-- Add to review_requests for expiration
ALTER TABLE review_requests
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add notification tracking
CREATE TABLE IF NOT EXISTS approval_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES review_requests(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('submitted', 'approved', 'rejected', 'reminder')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. GDPR Compliance

### Existing Foundation

BizScreen already has:
- `consent_records` table for cookie/data consent tracking
- `data_export_requests` table with status workflow
- `account_deletion_requests` table with 30-day grace period
- Functions: `request_data_export()`, `request_account_deletion()`, `cancel_account_deletion()`
- Supabase DPA available ([documentation](https://supabase.com/legal/dpa))

### Table Stakes (Required by Law)

| Feature | Complexity | GDPR Article | Notes |
|---------|------------|--------------|-------|
| Data export in machine-readable format | MEDIUM | Art. 20 | Need to aggregate all user data |
| Account deletion with cascade | MEDIUM | Art. 17 | Must delete from all tables |
| Consent banner with granular options | LOW | Art. 7 | UI component needed |
| Consent history audit trail | LOW | Art. 7(1) | consent_records table exists |
| 30-day cancellation period | LOW | Art. 17(1) | Already implemented |
| Process requests within 30 days | N/A | Art. 12(3) | Operational requirement |

**Legal Requirements** (per [GDPR compliance guides](https://www.didomi.io/blog/gdpr-compliance-2025)):
- Response within 1 month, extendable to 3 months for complex cases
- Data must be provided in "structured, commonly used, machine-readable format"
- Right to erasure requires deletion from all systems including backups (mark as "beyond use")
- Fines up to 4% of global revenue or EUR 20 million for non-compliance

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Self-service data portal | Reduces support burden | MEDIUM | UI for requests and downloads |
| Automated data export generation | Immediate fulfillment | HIGH | Background job to aggregate data |
| Soft delete with recovery period | Prevents accidental loss | LOW | Already implemented |
| Data retention policy configuration | Compliance flexibility | MEDIUM | Configurable per data type |
| CCPA support | US market compliance | LOW | Similar to GDPR, add opt-out |
| Consent preference center | User self-management | MEDIUM | UI for updating preferences |

### Data to Include in Export

Based on [GDPR data subject request requirements](https://learn.microsoft.com/en-us/compliance/regulatory/gdpr):

```javascript
const EXPORT_DATA_SOURCES = {
  // User identity
  profile: ['id', 'email', 'full_name', 'phone', 'created_at'],

  // User-created content
  media_assets: ['name', 'url', 'type', 'created_at'],
  playlists: ['name', 'description', 'created_at'],
  layouts: ['name', 'description', 'created_at'],
  scenes: ['name', 'created_at'],
  schedules: ['name', 'created_at'],

  // Activity data
  activity_logs: ['action', 'details', 'created_at'],
  playback_events: ['started_at', 'duration_seconds'],
  consent_records: ['consent_version', 'analytics', 'marketing', 'created_at'],

  // Device associations
  tv_devices: ['device_name', 'registered_at'],

  // Exclude: tenant data, billing data handled separately
};
```

### Implementation Pattern

```sql
-- Background function to generate export
CREATE OR REPLACE FUNCTION generate_user_data_export(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_export JSONB;
BEGIN
  SELECT user_id INTO v_user_id
  FROM data_export_requests WHERE id = p_request_id;

  -- Update status to processing
  UPDATE data_export_requests
  SET status = 'processing', started_at = NOW()
  WHERE id = p_request_id;

  -- Aggregate all user data
  v_export := jsonb_build_object(
    'generated_at', NOW(),
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = v_user_id),
    'media', (SELECT jsonb_agg(row_to_json(m)) FROM media_assets m WHERE owner_id = v_user_id),
    'playlists', (SELECT jsonb_agg(row_to_json(pl)) FROM playlists pl WHERE owner_id = v_user_id),
    -- ... additional tables
  );

  -- Store export and update status
  -- In practice, upload to S3 and store URL
  UPDATE data_export_requests
  SET status = 'completed',
      completed_at = NOW(),
      expires_at = NOW() + INTERVAL '7 days'
  WHERE id = p_request_id;

  RETURN v_export;
END;
$$;
```

---

## 3. Device QR Pairing & Emergency Exit

### Existing Foundation

BizScreen has:
- OTP pairing codes for device registration (existing)
- `qrcodeService.js` with QR generation capabilities
- Player.jsx handles device registration flow
- No explicit kiosk exit mechanism found in codebase

### Table Stakes

| Feature | Complexity | Notes |
|---------|------------|-------|
| Display QR code on unpaired device | LOW | QR encodes pairing URL with OTP |
| Scan QR to auto-fill pairing code | LOW | URL params pre-populate in admin UI |
| Admin unlock code for kiosk exit | LOW | Secret tap sequence + PIN |
| Remote unlock command | LOW | Add to device_commands table |

**Industry Standard** (per [MDM providers](https://www.hexnode.com/mobile-device-management/help/how-to-exit-android-kiosk-mode-in-hexnode-mdm/)):
- Global exit passcode (6-12 characters, configurable)
- Tap sequence to reveal exit dialog (e.g., 5 taps in corner)
- Works offline (stored locally on device)
- Remote admin unlock via MDM console

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| QR code with device metadata | Shows device info in admin before pairing | LOW | Encode device type, platform |
| NFC pairing (Android) | Faster than QR for supported devices | MEDIUM | Platform-specific |
| Bulk QR code generation | Print labels for hardware rollout | LOW | Batch generate PDFs |
| Emergency contact display | Shows support number on kiosk error | LOW | Configurable per tenant |
| Geofenced kiosk mode | Auto-exit outside office location | HIGH | Requires location services |
| Time-limited exit codes | Single-use or expiring codes | MEDIUM | Add expiration to unlock codes |

### Implementation Pattern - QR Pairing

```javascript
// QR code content structure
const qrPairingUrl = {
  format: 'URL',
  content: 'https://app.bizscreen.io/pair?code={OTP}&device={DEVICE_ID}',
  // Example: https://app.bizscreen.io/pair?code=ABC123&device=550e8400-e29b
};

// Player generates and displays QR
const generatePairingQR = async (otpCode, deviceId) => {
  const pairingUrl = `${APP_URL}/pair?code=${otpCode}&device=${deviceId}`;
  return await generateQRCode(pairingUrl, {
    width: 256,
    errorCorrectionLevel: 'H' // High for better scanning
  });
};
```

### Implementation Pattern - Emergency Kiosk Exit

Based on [Fully Kiosk](https://www.fully-kiosk.com/en/) and [Samsung Knox](https://docs.samsungknox.com/admin/knox-manage/kiosk-devices/exit-kiosk-mode/):

```javascript
// Kiosk exit configuration
const kioskConfig = {
  exitSequence: {
    type: 'tap', // or 'swipe', 'gesture'
    location: 'bottom-right', // corner to tap
    count: 5, // number of taps
    timeout: 3000 // ms to complete sequence
  },
  exitPin: {
    length: 6,
    attempts: 3,
    lockoutDuration: 300000 // 5 minutes
  },
  offline: true, // Works without network
  remoteUnlock: true // Admin can send unlock command
};

// Database schema addition
ALTER TABLE tv_devices
ADD COLUMN IF NOT EXISTS kiosk_exit_pin TEXT, -- Hashed
ADD COLUMN IF NOT EXISTS kiosk_exit_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS kiosk_locked_until TIMESTAMPTZ;

-- Remote unlock command
INSERT INTO device_command_types (name, description)
VALUES ('unlock_kiosk', 'Temporarily exit kiosk mode for maintenance');
```

### Security Considerations

| Risk | Mitigation |
|------|------------|
| Exit PIN brute force | Lockout after N attempts |
| PIN exposure | Hash PIN, don't store plaintext |
| Unauthorized remote unlock | Require admin role + audit log |
| Offline PIN bypass | PIN stored encrypted on device |

---

## 4. Content Analytics

### Existing Foundation

BizScreen already has:
- `playback_events` table with scene/media tracking
- Event types: `scene_start`, `scene_end`, `player_online`, `player_offline`, `media_play`
- Aggregation functions: `get_scene_playback_summary()`, `get_top_scenes()`, `get_device_uptime_summary()`
- Views: `v_scene_playback_summary`

### Table Stakes

| Feature | Complexity | Notes |
|---------|------------|-------|
| Proof of play reports | LOW | Query playback_events, format as report |
| Play count per content | LOW | Already tracked |
| Device uptime tracking | LOW | Already implemented |
| Content duration totals | LOW | SUM(duration_seconds) |
| Export reports (CSV/PDF) | MEDIUM | Add export endpoint |

**Industry Standard** (per [AIScreen](https://www.aiscreen.io/digital-signage/measuring-digital-signage-success-with-audience-metrics/), [Navori](https://navori.com/blog/how-digital-signage-analytics-can-improve-roi/)):
- Impressions (foot traffic near screen)
- Dwell time (how long people watch)
- Engagement (touches, QR scans)
- Proof of play with timestamps and screen IDs

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| View completion rates | Know if content is watched fully | MEDIUM | Track % of duration viewed |
| Heatmaps by time | Optimize scheduling | MEDIUM | Aggregate by hour/day |
| Heatmaps by location | Compare screen performance | MEDIUM | Join with locations table |
| A/B content testing | Data-driven content decisions | HIGH | Variant tracking, statistical analysis |
| Audience demographics (camera) | Know who's watching | VERY HIGH | Computer vision, privacy concerns |
| Real-time dashboard | Live monitoring | MEDIUM | WebSocket updates |
| Scheduled reports | Automated delivery | LOW | Cron job + email |

### Metrics to Track

Based on [DISPL](https://displ.com/solutions/analyze/content-analytics) and [Poppulo](https://www.poppulo.com/digital-signage/analytics):

| Metric | Description | Formula | Storage |
|--------|-------------|---------|---------|
| Play count | Times content was displayed | COUNT(events) | Exists |
| Total duration | Seconds content was shown | SUM(duration_seconds) | Exists |
| Avg duration | Average time per play | AVG(duration_seconds) | Compute |
| View completion | % of full duration viewed | actual/expected * 100 | NEW |
| Peak hours | When content plays most | GROUP BY hour | Compute |
| Device coverage | % of screens showing content | devices_played/total_devices | Compute |
| Engagement rate | Interactions per impression | interactions/impressions | NEW |

### Database Enhancements Needed

```sql
-- Add completion tracking to playback_events
ALTER TABLE playback_events
ADD COLUMN IF NOT EXISTS expected_duration_seconds INT,
ADD COLUMN IF NOT EXISTS completion_percent NUMERIC(5,2);

-- Add interaction tracking
CREATE TABLE IF NOT EXISTS content_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  screen_id UUID REFERENCES tv_devices(id),
  content_type TEXT CHECK (content_type IN ('media', 'playlist', 'scene')),
  content_id UUID NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('qr_scan', 'touch', 'nfc_tap')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated daily stats (for performance)
CREATE TABLE IF NOT EXISTS content_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  date DATE NOT NULL,
  play_count INT DEFAULT 0,
  total_duration_seconds BIGINT DEFAULT 0,
  completion_sum NUMERIC DEFAULT 0,
  completion_count INT DEFAULT 0,
  interaction_count INT DEFAULT 0,
  unique_devices INT DEFAULT 0,
  UNIQUE(tenant_id, content_type, content_id, date)
);
```

### Heatmap Implementation Pattern

```javascript
// Time-based heatmap data structure
const getTimeHeatmap = async (tenantId, dateRange) => {
  // Returns 24x7 grid: hours (0-23) x days (0-6)
  const result = await supabase.rpc('get_playback_heatmap', {
    p_tenant_id: tenantId,
    p_from: dateRange.from,
    p_to: dateRange.to
  });

  // Output: [{ hour: 9, day: 1, play_count: 150, avg_duration: 45 }, ...]
  return result.data;
};

// SQL function
CREATE OR REPLACE FUNCTION get_playback_heatmap(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  hour_of_day INT,
  day_of_week INT,
  play_count BIGINT,
  avg_duration_seconds NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    EXTRACT(HOUR FROM started_at)::INT as hour_of_day,
    EXTRACT(DOW FROM started_at)::INT as day_of_week,
    COUNT(*) as play_count,
    AVG(duration_seconds) as avg_duration_seconds
  FROM playback_events
  WHERE tenant_id = p_tenant_id
    AND started_at BETWEEN p_from AND p_to
  GROUP BY hour_of_day, day_of_week
  ORDER BY day_of_week, hour_of_day;
$$;
```

---

## Implementation Priority

### Recommended Order (Based on Dependencies)

| Phase | Feature | Rationale | Dependencies |
|-------|---------|-----------|--------------|
| 1 | Device QR Pairing | No dependencies, quick win | None |
| 2 | Emergency Kiosk Exit | Complements QR pairing, player changes | QR pairing optional |
| 3 | Content Analytics Enhancements | Foundation exists, adds value | Playback events exist |
| 4 | GDPR Data Export | Required for compliance | Export generation job |
| 5 | GDPR Account Deletion | Required for compliance | Data export complete |
| 6 | Content Approval UI | Foundation exists | Review queue UI |
| 7 | Approval Notifications | Enhances approval workflow | Email provider setup |

### Why This Order

1. **QR Pairing & Kiosk Exit** - Independent features, improve device management immediately. Low risk, contained scope.

2. **Analytics** - Existing foundation is strong. Adding completion rates and heatmaps builds on what's there. High user value.

3. **GDPR** - Legal requirement with 30-day response mandate. Export needed before deletion. Migration 106 provides foundation but needs generation logic.

4. **Approval Workflow** - Most complex, requires notification system. Database schema exists (migration 027) but needs complete UI implementation.

### Complexity Summary

| Feature | Database | Backend | Frontend | Player | Total |
|---------|----------|---------|----------|--------|-------|
| QR Pairing | LOW | LOW | LOW | MEDIUM | LOW |
| Kiosk Exit | LOW | LOW | LOW | MEDIUM | MEDIUM |
| Analytics | MEDIUM | MEDIUM | HIGH | LOW | MEDIUM |
| GDPR Export | LOW | HIGH | MEDIUM | NONE | MEDIUM |
| GDPR Deletion | MEDIUM | HIGH | LOW | NONE | MEDIUM |
| Approval UI | NONE | MEDIUM | HIGH | NONE | HIGH |

---

## Feature Dependencies Graph

```
                    QR Pairing
                        |
                        v
                   Kiosk Exit

Content Analytics <---> Heatmaps
      |                   |
      v                   v
 Proof of Play     Time-based Reports
      |
      v
 Scheduled Reports --> Email Provider
                            ^
                            |
GDPR Export -----------> [Shared]
      |
      v
Account Deletion --> Cascade Logic

Approval Queue --> Approval UI
      |
      v
  Notifications --> Email Provider
```

---

## Sources

### Content Approval Workflow
- [OptiSigns Approval Workflow](https://support.optisigns.com/hc/en-us/articles/360063693093-How-to-use-Approval-Workflow-feature) - Implementation example
- [Signagelive Approvals](https://signagelive.com/portfolio-item/approvals/) - Enterprise feature reference
- [State Machine Pattern](https://medium.com/@wacsk19921002/simplifying-approval-process-with-state-machine-a-practical-guide-part-1-modeling-26d8999002b0) - Design pattern

### GDPR Compliance
- [GDPR Compliance 2025](https://www.didomi.io/blog/gdpr-compliance-2025) - Current requirements
- [Microsoft GDPR DSR](https://learn.microsoft.com/en-us/compliance/regulatory/gdpr) - Data subject request handling
- [Supabase DPA](https://supabase.com/legal/dpa) - Data processing agreement
- [Intuiface GDPR for Digital Signage](https://www.intuiface.com/blog/gdpr-considerations-for-digital-signage) - Industry-specific guidance

### Device Pairing & Kiosk Exit
- [Hexnode Kiosk Exit](https://www.hexnode.com/mobile-device-management/help/how-to-exit-android-kiosk-mode-in-hexnode-mdm/) - MDM implementation
- [Samsung Knox Exit](https://docs.samsungknox.com/admin/knox-manage/kiosk-devices/exit-kiosk-mode/) - Enterprise reference
- [Revel Digital Pairing](https://support.reveldigital.com/hc/en-us/articles/35934592861837-Amazon-Signage-Stick-Getting-Started) - QR code registration example

### Content Analytics
- [AIScreen Metrics Guide](https://www.aiscreen.io/digital-signage/measuring-digital-signage-success-with-audience-metrics/) - Complete 2025 metrics guide
- [DISPL Content Analytics](https://displ.com/solutions/analyze/content-analytics) - Analytics features
- [NowSignage Proof of Play](https://www.nowsignage.com/features/proof-of-play/) - Proof of play implementation
- [Navori Analytics ROI](https://navori.com/blog/how-digital-signage-analytics-can-improve-roi/) - Business case for analytics

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Approval Workflow | HIGH | Existing migration 027 reviewed, industry patterns verified |
| GDPR Compliance | HIGH | Legal requirements well-documented, migration 106 exists |
| QR Pairing | HIGH | Standard pattern, qrcodeService.js exists |
| Kiosk Exit | MEDIUM | Implementation patterns from MDM providers, player changes needed |
| Analytics | HIGH | Migration 079 reviewed, industry metrics verified |
