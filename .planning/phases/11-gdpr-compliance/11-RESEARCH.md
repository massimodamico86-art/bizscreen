# Phase 11: GDPR Compliance - Research

**Researched:** 2026-01-24
**Domain:** GDPR Data Export (Article 20) and Account Deletion (Article 17)
**Confidence:** HIGH

## Summary

This phase implements GDPR compliance features for data export (Right to Data Portability) and account deletion (Right to Erasure). The codebase already has foundational infrastructure in place:

- **Database tables exist**: `data_export_requests`, `account_deletion_requests`, `consent_records` (migration 106)
- **Service exists**: `src/services/gdprService.js` with client-side functions
- **UI exists**: `src/components/compliance/DataPrivacySettings.jsx` integrated into SettingsPage
- **Email service exists**: `src/services/emailService.js` using Resend

The phase requires completing the **server-side processing** layer: generating comprehensive data exports, executing actual deletions, and propagating deletions to S3/Cloudinary.

**Primary recommendation:** Build Supabase Edge Functions for server-side GDPR operations, use pg_cron for scheduled deletion execution, and implement proper audit trails.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.80.0 | Database operations | Already used throughout app |
| resend | 6.8.0 | Email notifications | Already configured in emailService.js |
| @aws-sdk/client-s3 | 3.946.0 | S3 file deletion | Already used for uploads |

### Required Additions
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Edge Functions | - | Server-side export/deletion | Background job processing |
| pg_cron (Supabase) | built-in | Scheduled deletion execution | Daily deletion job |
| cloudinary (Node.js SDK) | 2.x | Cloudinary asset deletion | Delete user media from Cloudinary |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Edge Functions | External cron service | Edge Functions keep logic in Supabase ecosystem |
| pg_cron | External scheduler | pg_cron is built-in, no additional infrastructure |
| JSON export | CSV export | JSON better for nested data (GDPR recommends JSON for complex data) |

**Installation:**
```bash
# Cloudinary for server-side deletion (in Edge Function)
npm install cloudinary

# Supabase CLI for Edge Functions deployment
npm install -g supabase
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  functions/
    gdpr-export/
      index.ts          # Generate user data export
    gdpr-delete/
      index.ts          # Execute scheduled deletions
    gdpr-cleanup/
      index.ts          # Cleanup expired exports
src/
  services/
    gdprService.js      # Client-side API (exists)
  components/
    compliance/
      DataPrivacySettings.jsx  # UI (exists)
```

### Pattern 1: Queue-Based Background Processing
**What:** Use database table as job queue, pg_cron polls for pending jobs
**When to use:** Data export generation (may take minutes for large accounts)
**Example:**
```sql
-- pg_cron job to process pending exports (every 5 minutes)
SELECT cron.schedule(
  'process-gdpr-exports',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/gdpr-export',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  )
  $$
);
```

### Pattern 2: Staged Deletion with Audit Trail
**What:** Delete in stages (mark -> wait -> verify -> execute), log each step
**When to use:** Account deletion with 30-day grace period
**Example:**
```javascript
// Deletion stages
const DELETION_STAGES = {
  SCHEDULED: 'scheduled',     // Request received, 30-day countdown
  PROCESSING: 'processing',   // Grace period ended, deletion in progress
  COMPLETED: 'completed',     // All data deleted
  CANCELLED: 'cancelled',     // User cancelled during grace period
};
```

### Pattern 3: Cascading External Deletions
**What:** Delete from database first, then propagate to external services
**When to use:** Media files in S3/Cloudinary
**Example:**
```javascript
// Order of deletion operations
async function executeAccountDeletion(userId) {
  // 1. Get list of external assets BEFORE deleting DB records
  const mediaAssets = await getMediaAssets(userId);

  // 2. Delete from external services
  await deleteFromS3(mediaAssets.filter(m => m.url.includes('s3')));
  await deleteFromCloudinary(mediaAssets.filter(m => m.url.includes('cloudinary')));

  // 3. Delete database records (CASCADE handles related tables)
  await supabase.auth.admin.deleteUser(userId);

  // 4. Log completion
  await logDeletionComplete(userId);
}
```

### Anti-Patterns to Avoid
- **Deleting auth.users first:** Loses access to RLS-protected data; get all data URLs first
- **Synchronous export generation:** Large exports timeout; use background jobs
- **No audit trail:** GDPR requires proof of compliance; log all actions
- **Hardcoded 30-day period:** Use database value for flexibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled jobs | Custom timer service | pg_cron (Supabase built-in) | Battle-tested, no infrastructure |
| Email delivery | Raw SMTP | Resend (already configured) | Handles deliverability, templates |
| S3 deletion | Manual API calls | @aws-sdk/client-s3 DeleteObjectsCommand | Batch deletion, error handling |
| Export file storage | Custom file server | S3 presigned URLs | Secure, temporary access |
| Job queue | Redis/external queue | Database table + pg_cron | Simpler, uses existing Supabase |

**Key insight:** Supabase provides pg_cron and Edge Functions specifically for these use cases. External job queues add unnecessary complexity.

## Common Pitfalls

### Pitfall 1: Incomplete Data Export
**What goes wrong:** Export misses data from related tables (e.g., playlist_items without playlists)
**Why it happens:** Complex foreign key relationships, tenant isolation queries
**How to avoid:**
- Create explicit list of ALL tables with user data
- Include related records through owner_id OR through parent relationships
- Test with user who has data in every table
**Warning signs:** Export file much smaller than expected, missing sections

### Pitfall 2: Orphaned External Files
**What goes wrong:** Database records deleted but S3/Cloudinary files remain
**Why it happens:** CASCADE deletes don't trigger external API calls
**How to avoid:**
- Collect all external URLs BEFORE database deletion
- Delete external resources BEFORE database records
- Implement retry/reconciliation for failed deletions
**Warning signs:** Storage costs don't decrease after bulk deletions

### Pitfall 3: Export URL Exposure
**What goes wrong:** Export download URLs guessable or don't expire
**Why it happens:** Using predictable URLs or no expiration
**How to avoid:**
- Use S3 presigned URLs with short expiration (24-48 hours)
- Include random token in URL
- Log download attempts
**Warning signs:** Exports accessible after expiration period

### Pitfall 4: Grace Period Race Conditions
**What goes wrong:** User cancels deletion while deletion job is running
**Why it happens:** No locking mechanism, concurrent updates
**How to avoid:**
- Check status immediately before execution
- Use database transaction with row locking
- Set status to 'processing' before starting
**Warning signs:** Deleted accounts that were supposedly cancelled

### Pitfall 5: Missing Third-Party Notification
**What goes wrong:** GDPR Article 19 violation - third parties not notified
**Why it happens:** Focus on internal deletion, forget external processors
**How to avoid:**
- Document all third-party data processors
- Implement API calls to each processor's deletion endpoint
- Log all third-party notifications
**Warning signs:** No audit trail of third-party deletions

## Code Examples

Verified patterns based on existing codebase and official documentation:

### S3 Batch Delete (AWS SDK v3)
```javascript
// Source: AWS SDK v3 documentation
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

async function deleteS3Objects(keys) {
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // S3 allows max 1000 objects per request
  const chunks = chunkArray(keys, 1000);

  for (const chunk of chunks) {
    const command = new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: chunk.map(key => ({ Key: key })),
        Quiet: false, // Return deletion results
      },
    });

    const response = await client.send(command);

    // Log any errors
    if (response.Errors?.length > 0) {
      console.error('S3 deletion errors:', response.Errors);
    }
  }
}
```

### Cloudinary Batch Delete (Admin API)
```javascript
// Source: Cloudinary documentation
import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function deleteCloudinaryAssets(publicIds) {
  // Admin API allows up to 100 assets per request
  const chunks = chunkArray(publicIds, 100);

  for (const chunk of chunks) {
    const result = await cloudinary.v2.api.delete_resources(chunk);
    console.log('Cloudinary deletion result:', result);
  }
}

// Extract public_id from Cloudinary URL
function extractCloudinaryPublicId(url) {
  // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234/folder/filename.ext
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
}
```

### Data Export JSON Structure (GDPR Compliant)
```javascript
// Based on GDPR Article 20 requirements
const exportStructure = {
  metadata: {
    exportDate: new Date().toISOString(),
    userId: 'uuid',
    email: 'user@example.com',
    format: 'json',
    version: '1.0',
  },
  profile: {
    // From profiles table
    fullName: '',
    email: '',
    role: '',
    createdAt: '',
    // ... all profile fields
  },
  settings: {
    // From user_settings table
    notifications: {},
    display: {},
    privacy: {},
  },
  content: {
    // User-created content
    scenes: [],
    playlists: [],
    layouts: [],
    schedules: [],
    mediaAssets: [], // Metadata only, not actual files
  },
  devices: {
    // From tv_devices, listings
    tvDevices: [],
    listings: [],
  },
  activitySummary: {
    // Aggregated, not individual events (per CONTEXT.md)
    totalLogins: 0,
    monthlyActivityCounts: {},
    contentCreationCounts: {},
  },
  consent: {
    // From consent_records
    history: [],
    currentPreferences: {},
  },
};
```

### Supabase Edge Function Skeleton
```typescript
// supabase/functions/gdpr-export/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Only allow POST from cron or admin
  const authHeader = req.headers.get('Authorization');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Get pending export requests
  const { data: pendingExports } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('status', 'pending')
    .limit(5);

  for (const exportRequest of pendingExports || []) {
    // Mark as processing
    await supabase
      .from('data_export_requests')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', exportRequest.id);

    try {
      // Generate export data
      const exportData = await generateUserExport(supabase, exportRequest.user_id);

      // Upload to S3 and get presigned URL
      const fileUrl = await uploadExportToS3(exportData, exportRequest.user_id);

      // Mark complete with URL
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          file_url: fileUrl,
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .eq('id', exportRequest.id);

      // Send notification email
      await sendExportReadyEmail(exportRequest.user_id, fileUrl);
    } catch (error) {
      // Mark as failed
      await supabase
        .from('data_export_requests')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', exportRequest.id);
    }
  }

  return new Response(JSON.stringify({ processed: pendingExports?.length || 0 }));
});
```

## Data Tables Requiring Export/Deletion

Based on codebase analysis, these tables contain user data:

### Core User Data (Direct owner_id)
| Table | Export | Delete | Notes |
|-------|--------|--------|-------|
| profiles | Yes | CASCADE from auth.users | Primary user record |
| user_settings | Yes | CASCADE | Preferences |
| consent_records | Yes | SET NULL on user delete | Keep for audit |

### Content Data (owner_id reference)
| Table | Export | Delete | Notes |
|-------|--------|--------|-------|
| media_assets | Metadata only | CASCADE via profiles | URLs point to S3/Cloudinary |
| playlists | Yes | CASCADE | Includes playlist_items |
| layouts | Yes | CASCADE | Includes layout_zones |
| schedules | Yes | CASCADE | Includes schedule_entries |
| scenes | Yes (tenant_id) | CASCADE | Core content unit |
| listings | Yes | CASCADE | Property data |

### Related Data (Cascades automatically)
| Table | Export | Delete | Notes |
|-------|--------|--------|-------|
| playlist_items | Yes (via playlist) | CASCADE | Part of playlist export |
| layout_zones | Yes (via layout) | CASCADE | Part of layout export |
| schedule_entries | Yes (via schedule) | CASCADE | Part of schedule export |
| tv_devices | Yes | CASCADE via listings | Device configurations |
| qr_codes | Yes | CASCADE via listings | QR configurations |
| guests | Yes | CASCADE via listings | Guest records |

### Activity/Audit Data
| Table | Export | Delete | Notes |
|-------|--------|--------|-------|
| activity_log | Summary only | CASCADE or retain | Aggregated counts per CONTEXT.md |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual deletion scripts | Automated pg_cron jobs | Supabase Cron GA (2024) | Reliable, auditable |
| CSV exports | JSON exports | GDPR guidance (ongoing) | Better for complex data |
| Immediate deletion | 30-day grace period | Standard practice | User protection, recovery |
| Single-file export | ZIP with multiple files | Large account support | Handles media-heavy accounts |

**Deprecated/outdated:**
- AWS SDK v2: Use v3 with modular imports
- Cloudinary Upload API for deletion: Use Admin API for batch operations

## Implementation Recommendations

### Data Export Structure (Claude's Discretion Items)

**File Structure:** Single JSON file for accounts under 100 media assets, ZIP with separate JSON files for larger accounts
- `export-metadata.json` - Export info and index
- `profile.json` - User profile and settings
- `content.json` - Scenes, playlists, layouts, schedules
- `devices.json` - TV devices, listings, QR codes
- `activity-summary.json` - Aggregated activity counts

**Export Delivery:**
- Primary: In-app download from Settings > Privacy
- Secondary: Email with presigned S3 link (7-day expiration)
- Duplicate handling: Block new requests while one is pending/processing

**Link Expiration:** 7 days (industry standard, balances security with accessibility)

### Deletion Flow (Claude's Discretion Items)

**Confirmation Method:** Type "DELETE" to confirm (already implemented in UI)

**Grace Period Access:** Read-only access during 30-day period
- User can log in and view data
- User cannot create/modify content
- Clear banner showing deletion countdown
- Cancel button prominently displayed

**Reminder Cadence:**
- Day 1: Confirmation email with cancellation link
- Day 7: Reminder email
- Day 25: Final warning email (5 days remaining)
- Day 30: Deletion executed, confirmation email

**Orphaned Content Handling:** Delete all user content (no sharing model in this app)

### Media Handling (Claude's Discretion Items)

**Export Inclusion:** Metadata only (URLs, filenames, sizes), not actual files
- Files remain accessible via URLs during grace period
- Downloading all media would create massive exports

**Shared Media Policy:** N/A - no sharing model exists, all media is user-owned

**Deletion Timing:**
1. Database records deleted first (triggers CASCADE)
2. External files (S3/Cloudinary) deleted in same job
3. Retry mechanism for failed external deletions

**Audit Requirements:**
- Log deletion request timestamp
- Log deletion execution start/complete
- Log external service deletion results
- Retain audit log for 1 year (GDPR accountability)

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Edge Functions vs Vercel Functions**
   - What we know: Project appears to use Vite dev server for API routes
   - What's unclear: Production deployment platform (Vercel, Netlify, AWS?)
   - Recommendation: Research production setup; Edge Functions work regardless but may need adaptation

2. **Cloudinary Credentials Location**
   - What we know: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in env
   - What's unclear: Are API_KEY and API_SECRET available server-side?
   - Recommendation: Verify credentials exist; Admin API requires full credentials

3. **Service Role Key Availability**
   - What we know: Functions need service_role key to bypass RLS for deletion
   - What's unclear: How secrets are managed in production
   - Recommendation: Verify SUPABASE_SERVICE_ROLE_KEY is available in Edge Functions environment

## Sources

### Primary (HIGH confidence)
- Migration 106_gdpr_compliance.sql - Existing database schema
- src/services/gdprService.js - Existing client-side implementation
- src/components/compliance/DataPrivacySettings.jsx - Existing UI
- AWS SDK v3 documentation - S3 deletion operations
- Cloudinary documentation - Asset deletion API

### Secondary (MEDIUM confidence)
- [GDPR Article 20 - Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)
- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [ICO Right to Data Portability Guide](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/)
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron)
- [Supabase Edge Functions Scheduling](https://supabase.com/docs/guides/functions/schedule-functions)
- [AWS S3 DeleteObjects API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html)
- [Cloudinary Delete Assets Tutorial](https://cloudinary.com/documentation/deleting_assets_tutorial)

### Tertiary (LOW confidence)
- General web search results for GDPR implementation patterns (used for context only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase libraries
- Architecture: HIGH - Supabase patterns well-documented
- Data export structure: HIGH - Based on existing schema analysis
- External service deletion: MEDIUM - Need to verify credentials availability
- Pitfalls: HIGH - Based on GDPR compliance documentation

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - GDPR requirements stable)
