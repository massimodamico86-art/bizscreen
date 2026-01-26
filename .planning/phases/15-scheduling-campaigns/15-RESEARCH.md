# Phase 15: Scheduling Campaigns - Research

**Researched:** 2026-01-25
**Domain:** Campaign Management, Emergency Override, Dayparting Presets, Content Transition Timing
**Confidence:** HIGH

## Summary

Phase 15 extends the existing scheduling infrastructure with campaign grouping, emergency override, and dayparting presets. The codebase already has substantial campaign foundations: `campaignService.js` (595 lines), `CampaignsPage.jsx`, `CampaignEditorPage.jsx`, database tables (`campaigns`, `campaign_targets`, `campaign_contents`), and the `get_resolved_player_content` RPC that already handles campaign priority resolution.

The primary work involves: (1) integrating schedule entries with campaigns for grouping, (2) implementing a tenant-wide emergency override mechanism with visual indicators, (3) adding customizable dayparting presets for time-block scheduling, and (4) ensuring content transitions happen at content boundaries rather than mid-playback.

**Primary recommendation:** Extend the existing campaign infrastructure to support schedule entry grouping. Use Supabase Realtime for instant emergency push to devices. Store dayparting presets as reusable tenant configurations. Leverage the existing `needs_refresh` flag pattern for graceful content transitions.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @date-fns/tz | latest | DST-safe time calculations | Already installed per Phase 14 |
| date-fns | ^4.1.0 | Date manipulation, formatting | Already in package.json |
| framer-motion | ^12.23.24 | UI animations | Already installed |
| lucide-react | ^0.548.0 | Icons | Project standard |
| @supabase/supabase-js | latest | Realtime subscriptions | Already installed |

### To Add (Optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rrule | ^2.8.1 | Complex recurring rules | Only if full iCalendar RRULE support needed |

### Not Needed
| Instead of | Don't Use | Why Existing is Better |
|------------|-----------|------------------------|
| rrule | External lib | Current repeat_config JSONB sufficient for "every other week" patterns |
| CAP integration | External alert system | Phase 15 scope is manual emergency push, not automated alerts |
| react-big-calendar | External calendar | WeekPreview.jsx already enhanced in Phase 14 |

**Installation:**
```bash
# Only if complex recurring rules needed:
npm install rrule
```

## Architecture Patterns

### Existing Project Structure (Extend)
```
src/
├── components/schedules/
│   ├── CampaignPicker.jsx        # NEW: assign entry to campaign
│   ├── DaypartPicker.jsx         # NEW: select/edit daypart presets
│   └── [existing components...]   # Keep as-is
├── components/campaigns/
│   ├── CampaignCard.jsx          # NEW: campaign overview card
│   ├── CampaignEntryList.jsx     # NEW: entries grouped under campaign
│   └── EmergencyBanner.jsx       # NEW: persistent red override banner
├── pages/
│   ├── CampaignsPage.jsx         # Enhance: add entry grouping view
│   ├── SchedulesPage.jsx         # Enhance: campaign filter/grouping
│   └── ScheduleEditorPage.jsx    # Enhance: campaign assignment
├── services/
│   ├── campaignService.js        # Enhance: schedule entry linking
│   ├── emergencyService.js       # NEW: emergency override operations
│   ├── daypartService.js         # NEW: preset CRUD and application
│   └── scheduleService.js        # Enhance: campaign_id on entries
└── contexts/
    └── EmergencyContext.jsx      # NEW: global emergency state
```

### Pattern 1: Campaign-Entry Linking via Foreign Key
**What:** User Decision - "Entry belongs to exactly one campaign (or none)"
**When to use:** Schedule entry creation/editing
**Schema change:**
```sql
-- Add campaign_id to schedule_entries (single ownership)
ALTER TABLE schedule_entries
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_schedule_entries_campaign
ON schedule_entries(campaign_id);
```
**Example:**
```javascript
// scheduleService.js extension
export async function createScheduleEntry(scheduleId, entryData = {}) {
  const data = {
    schedule_id: scheduleId,
    campaign_id: entryData.campaign_id || null, // Optional campaign grouping
    // ... existing fields
  };
}
```

### Pattern 2: Emergency Override with Tenant-Wide Broadcast
**What:** User Decision - "Scope: all devices tenant-wide"
**When to use:** Emergency push button clicked
**Schema:**
```sql
-- Add emergency state to tenant profile
ALTER TABLE profiles
ADD COLUMN emergency_content_id UUID,
ADD COLUMN emergency_content_type TEXT,
ADD COLUMN emergency_started_at TIMESTAMPTZ,
ADD COLUMN emergency_duration_minutes INTEGER; -- NULL = indefinite
```
**Example:**
```javascript
// emergencyService.js
export async function pushEmergencyContent(contentType, contentId, durationMinutes = null) {
  // 1. Update tenant emergency state
  await supabase.from('profiles').update({
    emergency_content_id: contentId,
    emergency_content_type: contentType,
    emergency_started_at: new Date().toISOString(),
    emergency_duration_minutes: durationMinutes
  }).eq('id', tenantId);

  // 2. Set needs_refresh on all tenant devices for instant propagation
  await supabase.from('tv_devices').update({ needs_refresh: true })
    .eq('tenant_id', tenantId);
}

export async function stopEmergency() {
  await supabase.from('profiles').update({
    emergency_content_id: null,
    emergency_content_type: null,
    emergency_started_at: null,
    emergency_duration_minutes: null
  }).eq('id', tenantId);

  // Refresh all devices
  await supabase.from('tv_devices').update({ needs_refresh: true })
    .eq('tenant_id', tenantId);
}
```

### Pattern 3: Dayparting Presets as Tenant Configuration
**What:** User Decision - "Fully customizable: edit built-in presets AND create custom"
**When to use:** Quick-apply time blocks to schedule entries
**Schema:**
```sql
-- Tenant-specific daypart presets
CREATE TABLE daypart_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  preset_type TEXT NOT NULL, -- 'meal' or 'period' or 'custom'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INT[] DEFAULT '{0,1,2,3,4,5,6}',
  is_system BOOLEAN DEFAULT false, -- Built-in presets
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default presets (tenant_id = NULL for system-wide)
INSERT INTO daypart_presets (tenant_id, name, preset_type, start_time, end_time, is_system) VALUES
-- Meal-based
(NULL, 'Breakfast', 'meal', '06:00', '10:00', true),
(NULL, 'Lunch', 'meal', '11:00', '14:00', true),
(NULL, 'Dinner', 'meal', '17:00', '21:00', true),
-- Period-based (6hr blocks)
(NULL, 'Morning', 'period', '06:00', '12:00', true),
(NULL, 'Afternoon', 'period', '12:00', '18:00', true),
(NULL, 'Evening', 'period', '18:00', '00:00', true),
(NULL, 'Night', 'period', '00:00', '06:00', true);
```
**Example:**
```javascript
// daypartService.js
export async function applyDaypartToEntry(entryId, presetId) {
  const { data: preset } = await supabase.from('daypart_presets')
    .select('start_time, end_time, days_of_week')
    .eq('id', presetId)
    .single();

  return supabase.from('schedule_entries').update({
    start_time: preset.start_time,
    end_time: preset.end_time,
    days_of_week: preset.days_of_week
  }).eq('id', entryId);
}

export async function bulkApplyDaypart(entryIds, presetId) {
  // Apply same daypart to multiple entries
  const { data: preset } = await supabase.from('daypart_presets')
    .select('*').eq('id', presetId).single();

  return supabase.from('schedule_entries').update({
    start_time: preset.start_time,
    end_time: preset.end_time,
    days_of_week: preset.days_of_week
  }).in('id', entryIds);
}
```

### Pattern 4: Content Boundary Transitions
**What:** User Decision - "Content boundary: finish current content item, then apply new schedule"
**When to use:** Schedule changes, campaign activation, emergency override
**Existing pattern:** The player already uses `needs_refresh` flag and checks for content changes during playback
**Implementation:**
```javascript
// Player.jsx enhancement - wait for content item to complete
const handleScheduleChange = useCallback((newContent) => {
  // Store pending content change
  pendingContentRef.current = newContent;
  // Let current item finish (handled by onContentComplete)
}, []);

const onContentComplete = useCallback(() => {
  if (pendingContentRef.current) {
    // Apply pending content at natural boundary
    setContent(pendingContentRef.current);
    pendingContentRef.current = null;
  } else {
    // Normal advance to next item
    advanceToNextItem();
  }
}, [advanceToNextItem]);
```

### Pattern 5: Emergency Priority Override in Content Resolution
**What:** Emergency content has highest priority (above campaigns/schedules)
**When to use:** Player content resolution
**Extend get_resolved_player_content:**
```sql
-- Add emergency check at top of resolution function
CREATE OR REPLACE FUNCTION get_resolved_player_content(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device RECORD;
  v_tenant RECORD;
  -- ...
BEGIN
  -- Get device
  SELECT * INTO v_device FROM tv_devices WHERE id = p_screen_id;

  -- Get tenant emergency state (NEW - highest priority)
  SELECT emergency_content_id, emergency_content_type, emergency_started_at, emergency_duration_minutes
  INTO v_tenant
  FROM profiles WHERE id = v_device.tenant_id;

  IF v_tenant.emergency_content_id IS NOT NULL THEN
    -- Check if duration expired
    IF v_tenant.emergency_duration_minutes IS NULL
       OR (v_tenant.emergency_started_at + (v_tenant.emergency_duration_minutes || ' minutes')::interval) > now()
    THEN
      -- Return emergency content
      RETURN resolve_content(v_tenant.emergency_content_type, v_tenant.emergency_content_id, 'emergency');
    END IF;
  END IF;

  -- Continue with normal resolution (campaign > schedule > assigned)
  -- ... existing logic
END;
$$;
```

### Anti-Patterns to Avoid
- **Polling for emergency state:** Use Supabase Realtime subscriptions, not polling
- **Interrupting mid-video:** Always wait for content boundary before applying changes
- **Per-device emergency toggle:** Tenant-wide emergency is simpler and faster in real emergencies
- **Hardcoding daypart times:** Make all presets configurable, even "built-in" ones
- **Campaign as separate schedule:** Keep campaigns as entry groupings within existing schedule structure

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Realtime emergency push | Custom WebSocket | Supabase Realtime + needs_refresh flag | Already has reconnection, auth, channels |
| Content transition timing | Manual setTimeout | Player's existing onContentComplete callback | Already tracks playback state |
| Recurring rules | Custom date math | Existing repeat_config JSONB or rrule library | Edge cases in week boundaries |
| Campaign status lifecycle | Manual status updates | Existing update_campaign_statuses() function | Already handles scheduled->active->completed |
| Priority resolution | Client-side sorting | Existing get_resolved_player_content RPC | Already handles campaign > schedule > assigned |

**Key insight:** The codebase already has 80% of campaign infrastructure. Phase 15 is about connecting campaigns to schedule entries and adding emergency/daypart features - not building a new campaign system.

## Common Pitfalls

### Pitfall 1: Emergency Push Not Reaching Offline Devices
**What goes wrong:** Device is temporarily offline when emergency pushed. Never receives alert.
**Why it happens:** Relying only on WebSocket; device misses real-time event.
**How to avoid:**
1. Set tenant-level emergency state in database (persistent)
2. Player checks emergency state on content refresh/reconnection
3. Combine Realtime push (instant) with database state (catch-up)
**Warning signs:** Devices coming back online still show old content during emergency

### Pitfall 2: Emergency Duration Race Condition
**What goes wrong:** Admin sets 1hr duration, device checks 59:59 later, emergency already expired serverside
**Why it happens:** Using relative time comparisons without accounting for check frequency
**How to avoid:**
1. Store `emergency_started_at` timestamp, not `emergency_expires_at`
2. Calculate expiry on each check using server time
3. Add 1-minute grace period to account for polling intervals
**Warning signs:** Emergency ends slightly early on some devices

### Pitfall 3: Campaign Changes Apply Mid-Content
**What goes wrong:** User activates campaign, video cuts off immediately
**Why it happens:** Applying content changes synchronously on receiving notification
**How to avoid:**
1. Queue pending content changes in ref
2. Apply only when current item's onComplete fires
3. Emergency override is the ONE exception (interrupts immediately)
**Warning signs:** User complaints about jarring content interruptions

### Pitfall 4: Daypart Overlap Creates Undefined Behavior
**What goes wrong:** Breakfast (6-10am) and Morning (6am-12pm) both apply, which wins?
**Why it happens:** Dayparts can overlap; no conflict detection
**How to avoid:**
1. Dayparts are time presets, not schedule entries themselves
2. When applying daypart, it overwrites entry's time range
3. Conflict detection happens at schedule entry level, not daypart level
**Warning signs:** "Which content plays at 9am?" has different answers

### Pitfall 5: Campaign Card Shows Wrong Entry Count
**What goes wrong:** Campaign card says "5 entries" but only 3 are active for today
**Why it happens:** Counting total entries, not filtering by date/day
**How to avoid:**
1. Display total entry count (static)
2. ALSO show "active today" count (dynamic)
3. Make clear which count is which in UI
**Warning signs:** Users confused why entry count doesn't match what's playing

### Pitfall 6: Emergency Banner Not Visible Across Routes
**What goes wrong:** Admin sees banner on Schedules page, navigates to Media, banner disappears
**Why it happens:** Emergency state local to component, not global
**How to avoid:**
1. Use React Context for emergency state (EmergencyContext)
2. EmergencyBanner component at App layout level
3. Subscribe to emergency state changes globally
**Warning signs:** Inconsistent banner visibility across pages

## Code Examples

### Emergency Service Implementation
```javascript
// emergencyService.js
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('EmergencyService');

export const EMERGENCY_DURATIONS = [
  { value: 15, label: '15 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: null, label: 'Until manually stopped' }
];

export async function getTenantEmergencyState() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('profiles')
    .select('emergency_content_id, emergency_content_type, emergency_started_at, emergency_duration_minutes')
    .eq('id', user.id)
    .single();

  return data;
}

export async function pushEmergencyContent(contentType, contentId, durationMinutes = null) {
  const { data: { user } } = await supabase.auth.getUser();

  logger.info('Pushing emergency content', { contentType, contentId, durationMinutes });

  // Update tenant emergency state
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      emergency_content_id: contentId,
      emergency_content_type: contentType,
      emergency_started_at: new Date().toISOString(),
      emergency_duration_minutes: durationMinutes
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  // Trigger refresh on all tenant devices
  const { error: refreshError } = await supabase
    .from('tv_devices')
    .update({ needs_refresh: true })
    .eq('tenant_id', user.id);

  if (refreshError) throw refreshError;

  logger.info('Emergency push complete');
}

export async function stopEmergency() {
  const { data: { user } } = await supabase.auth.getUser();

  logger.info('Stopping emergency');

  await supabase
    .from('profiles')
    .update({
      emergency_content_id: null,
      emergency_content_type: null,
      emergency_started_at: null,
      emergency_duration_minutes: null
    })
    .eq('id', user.id);

  // Refresh all devices to return to normal content
  await supabase
    .from('tv_devices')
    .update({ needs_refresh: true })
    .eq('tenant_id', user.id);

  logger.info('Emergency stopped');
}

export function subscribeToEmergencyState(tenantId, onStateChange) {
  return supabase
    .channel(`emergency:${tenantId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${tenantId}`
    }, (payload) => {
      onStateChange({
        contentId: payload.new.emergency_content_id,
        contentType: payload.new.emergency_content_type,
        startedAt: payload.new.emergency_started_at,
        durationMinutes: payload.new.emergency_duration_minutes
      });
    })
    .subscribe();
}
```

### Campaign-Entry Linking
```javascript
// Extension to scheduleService.js
export async function getEntriesForCampaign(campaignId) {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select(`
      *,
      schedule:schedules(id, name)
    `)
    .eq('campaign_id', campaignId)
    .order('start_time');

  if (error) throw error;
  return data || [];
}

export async function assignEntryToCampaign(entryId, campaignId) {
  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ campaign_id: campaignId })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkAssignEntriesToCampaign(entryIds, campaignId) {
  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ campaign_id: campaignId })
    .in('id', entryIds)
    .select();

  if (error) throw error;
  return data;
}

export async function removeEntryFromCampaign(entryId) {
  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ campaign_id: null })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Daypart Presets Service
```javascript
// daypartService.js
import { supabase } from '../supabase';

export const DEFAULT_DAYPARTS = {
  meal: [
    { name: 'Breakfast', start_time: '06:00', end_time: '10:00' },
    { name: 'Lunch', start_time: '11:00', end_time: '14:00' },
    { name: 'Dinner', start_time: '17:00', end_time: '21:00' }
  ],
  period: [
    { name: 'Morning', start_time: '06:00', end_time: '12:00' },
    { name: 'Afternoon', start_time: '12:00', end_time: '18:00' },
    { name: 'Evening', start_time: '18:00', end_time: '00:00' },
    { name: 'Night', start_time: '00:00', end_time: '06:00' }
  ]
};

export async function getDaypartPresets() {
  const { data: { user } } = await supabase.auth.getUser();

  // Get system presets (tenant_id = null) and tenant's custom presets
  const { data, error } = await supabase
    .from('daypart_presets')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${user.id}`)
    .order('preset_type')
    .order('start_time');

  if (error) throw error;
  return data || [];
}

export async function createDaypartPreset({ name, startTime, endTime, daysOfWeek, presetType = 'custom' }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('daypart_presets')
    .insert({
      tenant_id: user.id,
      name,
      preset_type: presetType,
      start_time: startTime,
      end_time: endTime,
      days_of_week: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      is_system: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDaypartPreset(presetId, updates) {
  const { data: { user } } = await supabase.auth.getUser();

  // Can only update non-system presets owned by tenant
  const { data, error } = await supabase
    .from('daypart_presets')
    .update({
      name: updates.name,
      start_time: updates.startTime,
      end_time: updates.endTime,
      days_of_week: updates.daysOfWeek
    })
    .eq('id', presetId)
    .eq('tenant_id', user.id)
    .eq('is_system', false)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function applyDaypartToEntry(entryId, presetId) {
  const { data: preset, error: presetError } = await supabase
    .from('daypart_presets')
    .select('start_time, end_time, days_of_week')
    .eq('id', presetId)
    .single();

  if (presetError) throw presetError;

  const { data, error } = await supabase
    .from('schedule_entries')
    .update({
      start_time: preset.start_time,
      end_time: preset.end_time,
      days_of_week: preset.days_of_week
    })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkApplyDaypart(entryIds, presetId) {
  const { data: preset, error: presetError } = await supabase
    .from('daypart_presets')
    .select('start_time, end_time, days_of_week')
    .eq('id', presetId)
    .single();

  if (presetError) throw presetError;

  const { data, error } = await supabase
    .from('schedule_entries')
    .update({
      start_time: preset.start_time,
      end_time: preset.end_time,
      days_of_week: preset.days_of_week
    })
    .in('id', entryIds)
    .select();

  if (error) throw error;
  return data;
}
```

### Emergency Banner Component
```jsx
// components/campaigns/EmergencyBanner.jsx
import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '../../design-system';
import { useEmergency } from '../../contexts/EmergencyContext';

export function EmergencyBanner() {
  const { isActive, contentName, startedAt, durationMinutes, stopEmergency, stopping } = useEmergency();

  if (!isActive) return null;

  const formatTimeRemaining = () => {
    if (!durationMinutes) return 'Until manually stopped';
    const endTime = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
    const remaining = Math.max(0, endTime - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')} remaining`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 animate-pulse" />
        <span className="font-semibold">EMERGENCY ACTIVE</span>
        <span className="text-red-100">|</span>
        <span>{contentName}</span>
        <span className="text-red-200 text-sm">({formatTimeRemaining()})</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopEmergency}
        loading={stopping}
        className="text-white hover:bg-red-700"
      >
        <XCircle className="h-4 w-4 mr-1" />
        Stop Emergency
      </Button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for updates | Supabase Realtime | 2024 | Instant push, no polling overhead |
| CAP protocol for alerts | Manual emergency push | - | Simpler for manual business emergencies |
| Fixed daypart times | Customizable presets | 2025 | Restaurant flexibility (late-night menus) |
| Campaign as content type | Campaign as entry grouping | Phase 15 | Leverages existing schedule infrastructure |

**Industry best practices (from research):**
- Emergency alerts should override ALL content immediately (CAP standard)
- Daypart transitions should happen 15-30 minutes before actual time block (per navori.com)
- Visual emergency indicators should be persistent and multi-modal (per gov guidelines)
- "All Clear" messaging should follow emergency to signal safety

## Open Questions

Things that couldn't be fully resolved:

1. **Emergency audio alert**
   - What we know: Visual banner required, audio optional
   - What's unclear: Should player emit audio alert on emergency?
   - Recommendation: Phase 16 - add optional audio, requires device capability detection

2. **Offline emergency catch-up**
   - What we know: Device should show emergency content when reconnecting
   - What's unclear: How long after emergency ends should catch-up happen?
   - Recommendation: If emergency ended < 5 minutes ago, still show briefly; otherwise skip

3. **Campaign analytics separation**
   - What we know: playback_events already has campaign_id column
   - What's unclear: Phase 15 scope for analytics UI?
   - Recommendation: Defer analytics UI to Phase 16, just ensure data capture works

4. **Recurring rule complexity**
   - What we know: Context says "every other week", existing repeat_config supports it
   - What's unclear: Need full iCalendar RRULE support or just enhanced repeat_config?
   - Recommendation: Enhance repeat_config with repeat_interval field; defer rrule library

## Sources

### Primary (HIGH confidence)
- Existing codebase: `campaignService.js`, `scheduleService.js`, `realtimeService.js`
- Existing migrations: `026_screen_groups_and_campaigns.sql`, `113_schedule_filler_content.sql`
- Phase 14 RESEARCH.md - DST handling, date-fns/tz patterns
- CONTEXT.md decisions for Phase 15

### Secondary (MEDIUM confidence)
- [TelemetryTV Emergency Alerts](https://www.telemetrytv.com/posts/ttv-emergency-alerts-and-instant-overrides/) - Emergency override patterns
- [Navori Dayparting](https://navori.com/digital-menu-boards/day-parting/) - Transition timing best practices
- [PiSignage Emergency Playlist](https://blog.pisignage.com/emergency-playlist-feature/) - Instant override architecture
- [Xibo Dayparting](https://account.xibosignage.com/manual/en/scheduling_dayparting) - Preset configuration patterns
- [rrule.js GitHub](https://github.com/jkbrzt/rrule) - iCalendar RRULE library (if needed)

### Tertiary (LOW confidence)
- WebSearch: Digital signage emergency best practices - General patterns, not library-specific
- WebSearch: Dayparting implementation - Industry case studies

## Metadata

**Confidence breakdown:**
- Campaign-entry linking: HIGH - Simple FK addition, existing patterns
- Emergency override: HIGH - Uses existing needs_refresh pattern, Supabase Realtime
- Dayparting presets: HIGH - Database storage, CRUD operations, straightforward
- Content boundary transitions: MEDIUM - Player modification, needs testing
- Recurring rules: MEDIUM - Existing repeat_config may need enhancement

**Research date:** 2026-01-25
**Valid until:** 2026-02-24 (30 days - stable domain, no external library dependencies)

---

*Phase: 15-scheduling-campaigns*
*Research completed: 2026-01-25*
