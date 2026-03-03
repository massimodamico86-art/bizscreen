# Phase 109: Content Model - Research

**Researched:** 2026-03-03
**Domain:** Nested playlists, background audio, screen working hours (digital signage content model)
**Confidence:** HIGH

## Summary

Phase 109 extends the BizScreen content model in three orthogonal directions: (1) playlist nesting with circular reference prevention, (2) background audio layered on top of visual content, and (3) per-screen working hours scheduling. All three features are well-understood patterns in the digital signage industry and map cleanly onto the existing Supabase + React architecture.

The most architecturally significant work is nested playlists, which requires a database trigger for circular reference detection at write time, a recursive CTE for flattening nested content at resolution time, and a depth limit enforced at both service and database layers. Background audio requires adding columns to the `playlists` table and a persistent `<audio>` element in the player that survives visual content transitions. Working hours is a per-screen schedule stored in a JSONB column on `tv_devices`, checked during content resolution.

**Primary recommendation:** Implement in order: (1) schema migrations for all three features, (2) nested playlists service + UI + player flattening, (3) background audio service + UI + player audio layer, (4) working hours service + UI + player blanking.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEST-01 | User can add a playlist as an item within another playlist | Extend `playlist_items.item_type` CHECK constraint to include 'playlist'; update `addPlaylistItem` service; InsertContentModal already has Playlists tab |
| NEST-02 | Nested playlists resolve to a flat content list on the player | Recursive CTE in `get_resolved_player_content` RPC flattens nested items; client-side already processes flat items array |
| NEST-03 | System prevents circular playlist references at write time | PostgreSQL BEFORE INSERT/UPDATE trigger using recursive CTE to walk ancestry chain |
| NEST-04 | Nesting depth is limited to 5 levels | Same trigger checks depth; service-layer validation provides fast rejection before DB round-trip |
| AUDIO-01 | User can assign a background audio track to a playlist | Add `background_audio_id` (FK to media_assets) and `background_audio_volume` columns to `playlists` table |
| AUDIO-02 | Background audio plays continuously behind visual content transitions | Persistent `<audio>` element in ViewPage/ZonePlayer that is independent of visual content cycling |
| AUDIO-03 | User can control audio volume per playlist | Volume slider (0-100) in playlist editor; stored as `background_audio_volume` INTEGER DEFAULT 100 |
| AUDIO-04 | User can upload audio files (MP3/WAV/OGG) as media assets | Already supported -- `media_assets.type` CHECK includes 'audio'; `getMediaTypeFromMime` handles `audio/*`; media library has Audio tab |
| POWER-01 | User can define working hours schedule per screen (on/off times by day of week) | Add `working_hours` JSONB column to `tv_devices`; UI component with per-day on/off time pickers |
| POWER-02 | Screen displays black/standby outside working hours | Player checks working hours against current device time; renders black screen when outside hours |
| POWER-03 | Screen automatically resumes content at working hours start | Player periodically checks (every 60s) and re-enters playback when working hours resume |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.80.0 | Database, RPC, realtime | Already in use; all data access goes through Supabase |
| React | 19.1.1 | UI components | Already in use |
| date-fns | 4.1.0 | Time comparison for working hours | Already in use; proven for schedule calculations |
| @date-fns/tz | 1.4.1 | Timezone-aware time checks | Already in use for schedule/countdown features |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.548.0 | Icons (Music, Clock, Power) | Already in use for all icons |
| @dnd-kit/sortable | 6.3.1 | Drag-reorder of playlist items including nested | Already in use in playlist editor |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB working_hours column | Separate `working_hours` table | Table is cleaner for queries but JSONB is simpler for 7 fixed entries per screen; JSONB wins for this fixed-shape data |
| PostgreSQL trigger for circular detection | Service-layer-only check | Service layer can be bypassed; trigger is authoritative. Use both: service for fast UX feedback, trigger as safety net |
| Recursive CTE for flattening | Client-side recursive resolution | Server-side is authoritative and cacheable; client would need all playlist data which is a security/performance issue |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/migrations/
  156_nested_playlists_audio_working_hours.sql  # Schema changes for all three features

src/services/
  playlistService.js           # Extended with nesting validation + audio track assignment
  screenService.js             # Extended with working hours CRUD
  workingHoursService.js       # (NEW) Working hours validation, time-check utility

src/components/
  playlists/
    NestedPlaylistItem.jsx     # Visual representation of a nested playlist in editor
  screens/
    WorkingHoursEditor.jsx     # Per-day on/off time picker UI
  media/
    AudioTrackPicker.jsx       # Audio file selector for playlist background audio

src/player/
  components/
    BackgroundAudio.jsx        # Persistent <audio> element for background music
    WorkingHoursGuard.jsx      # Wraps content with working hours black-screen logic
  hooks/
    useBackgroundAudio.js      # Audio playback state (play/pause/volume/loop)
    useWorkingHours.js         # Periodic check against screen's working hours
```

### Pattern 1: Circular Reference Prevention (Database Trigger)
**What:** PostgreSQL BEFORE INSERT/UPDATE trigger on `playlist_items` that walks the playlist ancestry using a recursive CTE to detect cycles and enforce depth limits.
**When to use:** Every time a playlist_items row is inserted or updated with `item_type = 'playlist'`.
**Example:**
```sql
-- Circular reference detection trigger function
CREATE OR REPLACE FUNCTION check_playlist_nesting()
RETURNS TRIGGER AS $$
DECLARE
  v_depth INTEGER;
  v_has_cycle BOOLEAN;
BEGIN
  -- Only check when item_type is 'playlist'
  IF NEW.item_type != 'playlist' THEN
    RETURN NEW;
  END IF;

  -- Check if the referenced playlist would create a cycle
  -- Walk UP from the current playlist to see if item_id appears in ancestors
  WITH RECURSIVE ancestry AS (
    -- Start: the playlist we're inserting INTO
    SELECT NEW.playlist_id AS pid, 1 AS depth
    UNION ALL
    -- Walk up: find playlist_items where item_id = ancestry.pid (parent playlists)
    SELECT pi.playlist_id, a.depth + 1
    FROM playlist_items pi
    JOIN ancestry a ON pi.item_id = a.pid
    WHERE pi.item_type = 'playlist'
      AND a.depth < 6  -- safety brake
  )
  SELECT
    EXISTS(SELECT 1 FROM ancestry WHERE pid = NEW.item_id) AS has_cycle,
    COALESCE(MAX(depth), 0) AS max_depth
  INTO v_has_cycle, v_depth
  FROM ancestry;

  -- Also check depth going DOWN from the referenced playlist
  WITH RECURSIVE descendants AS (
    SELECT NEW.item_id AS pid, 1 AS depth
    UNION ALL
    SELECT pi.item_id, d.depth + 1
    FROM playlist_items pi
    JOIN descendants d ON pi.playlist_id = d.pid
    WHERE pi.item_type = 'playlist'
      AND d.depth < 6
  )
  SELECT GREATEST(v_depth, COALESCE(MAX(depth), 0))
  INTO v_depth
  FROM descendants;

  IF v_has_cycle THEN
    RAISE EXCEPTION 'Circular playlist reference detected'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_depth > 5 THEN
    RAISE EXCEPTION 'Playlist nesting depth exceeds maximum of 5 levels'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_playlist_nesting_trigger
  BEFORE INSERT OR UPDATE ON playlist_items
  FOR EACH ROW EXECUTE FUNCTION check_playlist_nesting();
```

### Pattern 2: Recursive Playlist Flattening (Server-side RPC)
**What:** A recursive CTE that expands nested playlists into a flat item list for the player. Used inside `get_resolved_player_content`.
**When to use:** During content resolution for the player.
**Example:**
```sql
-- Flatten nested playlists into a single item list
WITH RECURSIVE flat_items AS (
  -- Base: direct items of the root playlist
  SELECT
    pi.id, pi.item_type, pi.item_id, pi.position, pi.duration,
    1 AS depth, ARRAY[pi.playlist_id] AS path,
    pi.playlist_id AS root_playlist_id
  FROM playlist_items pi
  WHERE pi.playlist_id = v_playlist_id
    AND pi.item_type != 'playlist'

  UNION ALL

  -- Recursive: items from nested playlists
  SELECT
    pi2.id, pi2.item_type, pi2.item_id, pi2.position, pi2.duration,
    fi.depth + 1, fi.path || pi_ref.playlist_id,
    fi.root_playlist_id
  FROM playlist_items pi_ref
  JOIN flat_items fi ON pi_ref.playlist_id = fi.root_playlist_id
  JOIN playlist_items pi2 ON pi2.playlist_id = pi_ref.item_id
  WHERE pi_ref.item_type = 'playlist'
    AND fi.depth < 5
    AND pi2.item_type != 'playlist'
    -- more complex join needed; see implementation notes
)
SELECT ... FROM flat_items
ORDER BY depth, position;
```

### Pattern 3: Persistent Background Audio (Player Component)
**What:** A `<audio>` element that lives outside the visual content cycling and persists across slide/item transitions. Controlled via React refs to avoid re-renders.
**When to use:** When playlist has a `background_audio_id` set.
**Example:**
```jsx
// BackgroundAudio.jsx - lives in ViewPage, NOT inside item renderer
function BackgroundAudio({ audioUrl, volume, isPlaying }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = (volume || 100) / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && audioUrl) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked - common on browsers, less so on signage devices
        // Player devices typically have autoplay enabled
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  if (!audioUrl) return null;

  return (
    <audio
      ref={audioRef}
      src={audioUrl}
      loop
      preload="auto"
      style={{ display: 'none' }}
    />
  );
}
```

### Pattern 4: Working Hours Guard (Player Component)
**What:** A wrapper component or hook that checks the current time against the screen's working hours configuration and blanks the screen when outside hours.
**When to use:** In ViewPage, wrapping all content rendering.
**Example:**
```jsx
// useWorkingHours.js
function useWorkingHours(workingHours, timezone) {
  const [isWithinHours, setIsWithinHours] = useState(true);

  useEffect(() => {
    if (!workingHours) {
      setIsWithinHours(true);
      return;
    }

    function check() {
      const now = new Date();
      // Use TZDate or Intl.DateTimeFormat for timezone-aware day/time
      const dayOfWeek = getDayInTimezone(now, timezone); // 0-6
      const currentTime = getTimeInTimezone(now, timezone); // "HH:MM"
      const todaySchedule = workingHours[dayOfWeek];

      if (!todaySchedule || !todaySchedule.enabled) {
        setIsWithinHours(false);
        return;
      }

      const afterStart = currentTime >= todaySchedule.start;
      const beforeEnd = currentTime < todaySchedule.end;
      setIsWithinHours(afterStart && beforeEnd);
    }

    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [workingHours, timezone]);

  return isWithinHours;
}
```

### Anti-Patterns to Avoid
- **Client-side circular detection only:** The service layer should validate for UX speed, but the database trigger is the authoritative guard. Never rely solely on client-side checks.
- **Re-creating audio elements on content transition:** The `<audio>` element MUST persist across visual content changes. Do NOT render it inside the item/slide renderer.
- **Polling working hours from the server:** Working hours check must be client-side using the device's local time. Server round-trips would fail offline.
- **Using `playlist_items.item_id` as FK to playlists:** The `item_id` column is polymorphic (no FK constraint). Instead, validate the reference exists in the service layer and trigger.
- **Deep recursive resolution without depth limits:** Always include a depth safety brake (5 levels + 1 for safety) in recursive CTEs to prevent runaway queries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular reference detection | Custom graph traversal in JS | PostgreSQL recursive CTE in trigger | DB is authoritative; JS can be bypassed; CTE is battle-tested |
| Timezone-aware time comparisons | Manual UTC offset math | `Intl.DateTimeFormat` + `@date-fns/tz` | DST transitions, half-hour offsets; already proven in the codebase |
| Audio playback management | Custom audio scheduling system | HTML5 `<audio>` element with `loop` attribute | Native browser audio handles buffering, seeking, format decoding |
| Working hours data shape | Custom serialization | JSONB with fixed schema | PostgreSQL JSONB operators let you query/index if needed later |

**Key insight:** All three features map to well-established patterns. The circular reference trigger is the only "tricky" part, and recursive CTEs in PostgreSQL are well-documented. No new dependencies needed.

## Common Pitfalls

### Pitfall 1: Autoplay Restrictions on Background Audio
**What goes wrong:** Browser autoplay policies block audio from playing without user interaction.
**Why it happens:** Chrome and other browsers require a user gesture before playing audio.
**How to avoid:** Signage player devices (WebOS, Tizen, dedicated Android) typically have autoplay enabled. For web player, add a user interaction prompt on first load OR configure kiosk mode which bypasses autoplay. The existing kiosk mode flow already involves user interaction (PIN entry or initial setup), which satisfies the autoplay requirement.
**Warning signs:** Audio works in dev but not on deployed player; `play()` promise rejection in console.

### Pitfall 2: Recursive CTE Performance with Deep Nesting
**What goes wrong:** Recursive CTEs on large datasets can be slow or produce cartesian products.
**Why it happens:** Without depth limits or proper join conditions, the recursion explodes.
**How to avoid:** Always include `AND depth < 6` (one more than the 5-level limit) as a safety brake. Add an index on `playlist_items(playlist_id, item_type)` filtered to `item_type = 'playlist'` for fast lookups.
**Warning signs:** Content resolution RPC takes >500ms for nested playlists.

### Pitfall 3: Self-referencing Playlist Item
**What goes wrong:** User adds playlist A as an item inside playlist A (direct self-reference).
**Why it happens:** The simplest cycle case, often missed if only checking multi-step cycles.
**How to avoid:** Both the service layer and trigger should check `NEW.item_id != NEW.playlist_id` as a fast path before the recursive check.
**Warning signs:** Infinite loop in flattening; player hangs.

### Pitfall 4: Working Hours Timezone Mismatch
**What goes wrong:** Screen blanks at wrong times because working hours are compared against UTC instead of the screen's local timezone.
**Why it happens:** Using `new Date()` without timezone conversion.
**How to avoid:** Use `Intl.DateTimeFormat` with the screen's `timezone` field (already stored on `tv_devices`) to get the current local time. This is the same pattern used for clock widgets and countdown timers.
**Warning signs:** Screen on/off times are offset by the UTC difference.

### Pitfall 5: Playlist Item Type CHECK Constraint
**What goes wrong:** Migration to add 'playlist' to `item_type` CHECK fails because existing constraint name is unknown.
**Why it happens:** PostgreSQL requires dropping the old CHECK before adding a new one.
**How to avoid:** Use `ALTER TABLE playlist_items DROP CONSTRAINT IF EXISTS <name>; ALTER TABLE playlist_items ADD CONSTRAINT <name> CHECK (item_type IN ('media', 'app', 'layout', 'web_page', 'playlist'));`
**Warning signs:** Migration error about conflicting CHECK constraints.

### Pitfall 6: Background Audio During Content-less Periods
**What goes wrong:** Audio keeps playing when the playlist has no items or the screen is outside working hours.
**Why it happens:** Audio element lives outside the content renderer and is not aware of playback state.
**How to avoid:** The `BackgroundAudio` component must accept an `isPlaying` prop that is `false` when: (a) no visual content is active, (b) outside working hours, or (c) emergency content overrides.
**Warning signs:** Audio plays over a black/standby screen.

## Code Examples

### Schema Migration (All Three Features)
```sql
-- 1. Extend playlist_items CHECK to allow 'playlist' type
ALTER TABLE playlist_items DROP CONSTRAINT IF EXISTS playlist_items_item_type_check;
ALTER TABLE playlist_items ADD CONSTRAINT playlist_items_item_type_check
  CHECK (item_type IN ('media', 'app', 'layout', 'web_page', 'playlist'));

-- 2. Add background audio columns to playlists
ALTER TABLE playlists
ADD COLUMN IF NOT EXISTS background_audio_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS background_audio_volume INTEGER DEFAULT 100
  CHECK (background_audio_volume >= 0 AND background_audio_volume <= 100);

CREATE INDEX IF NOT EXISTS idx_playlists_background_audio ON playlists(background_audio_id)
  WHERE background_audio_id IS NOT NULL;

-- 3. Add working hours to tv_devices
ALTER TABLE tv_devices
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT NULL;

COMMENT ON COLUMN tv_devices.working_hours IS
  'Per-day working hours schedule. Shape: {"0":{"enabled":true,"start":"08:00","end":"18:00"},...,"6":{...}} where keys are DOW (0=Sun..6=Sat). NULL = always on.';
```

### Service Layer: Nesting Validation
```javascript
// In playlistService.js
export async function addNestedPlaylist(playlistId, nestedPlaylistId, duration = null) {
  // Fast path: reject self-reference
  if (playlistId === nestedPlaylistId) {
    throw new Error('Cannot add a playlist to itself');
  }

  // Check nesting depth and circular refs via RPC (or service-level check)
  const { data: isValid, error: checkError } = await supabase.rpc(
    'check_playlist_nesting_valid',
    { p_parent_id: playlistId, p_child_id: nestedPlaylistId }
  );

  if (checkError) throw checkError;
  if (!isValid) throw new Error('Adding this playlist would create a circular reference or exceed the 5-level nesting limit');

  // Insert as item_type = 'playlist'
  return addPlaylistItem(playlistId, {
    itemType: 'playlist',
    itemId: nestedPlaylistId,
    duration
  });
}
```

### Player: Background Audio Integration Point
```javascript
// In ViewPage.jsx render, alongside AppRenderer
<>
  {isWithinWorkingHours && (
    <>
      <BackgroundAudio
        audioUrl={content?.playlist?.backgroundAudioUrl}
        volume={content?.playlist?.backgroundAudioVolume}
        isPlaying={items.length > 0}
      />
      <AppRenderer ... />
    </>
  )}
  {!isWithinWorkingHours && (
    <div className="w-full h-full bg-black" />
  )}
</>
```

### Working Hours Data Shape
```javascript
// JSONB shape stored in tv_devices.working_hours
const workingHours = {
  "0": { "enabled": false, "start": "00:00", "end": "00:00" }, // Sunday: off
  "1": { "enabled": true,  "start": "08:00", "end": "22:00" }, // Monday
  "2": { "enabled": true,  "start": "08:00", "end": "22:00" }, // Tuesday
  "3": { "enabled": true,  "start": "08:00", "end": "22:00" }, // Wednesday
  "4": { "enabled": true,  "start": "08:00", "end": "22:00" }, // Thursday
  "5": { "enabled": true,  "start": "08:00", "end": "22:00" }, // Friday
  "6": { "enabled": true,  "start": "10:00", "end": "18:00" }, // Saturday
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side cycle detection only | DB trigger + client validation | Industry standard | Prevents data corruption from any API path |
| Separate audio player service | HTML5 `<audio>` with `loop` | HTML5 Audio API (stable) | No additional dependencies needed |
| Separate power schedule table | JSONB column on device | Simpler for fixed-shape data | Fewer joins, atomic reads with device data |

**Deprecated/outdated:**
- Web Audio API for simple background music: Overkill. `<audio>` element with `loop` is sufficient for continuous background playback. Web Audio API is for complex audio processing (effects, mixing, spatial audio).
- Flash-based audio playback: Long dead. HTML5 Audio is universal.

## Open Questions

1. **Should flattened playlist items inherit the parent or child playlist's duration defaults?**
   - What we know: Each `playlist_items` row has an optional `duration` override. If NULL, the playlist's `default_duration` is used.
   - What's unclear: When a nested playlist is flattened, should its items use the nested playlist's `default_duration` or the root playlist's?
   - Recommendation: Use the nested (child) playlist's `default_duration` for its own items. This is more intuitive -- the sub-playlist "brings its own settings."

2. **Should background audio from a nested playlist play, or only the root playlist's audio?**
   - What we know: Each playlist can have a `background_audio_id`.
   - What's unclear: If playlist A (with audio track X) contains nested playlist B (with audio track Y), what plays?
   - Recommendation: Only the root (top-level) playlist's background audio plays. Nested playlists contribute visual content only. This avoids audio conflicts and is simpler to implement.

3. **Should working hours apply to the entire device or per-content-source?**
   - What we know: The requirement says "per-screen working hours."
   - What's unclear: Should emergency content override working hours?
   - Recommendation: Working hours apply at the device level. Emergency content (priority 999) should override working hours -- if there's an emergency, the screen should display it regardless. This aligns with the existing priority hierarchy.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/services/playlistService.js` -- current playlist CRUD patterns
- Codebase analysis: `supabase/migrations/014_yodeck_phase1_media_playlists.sql` -- original playlist schema
- Codebase analysis: `supabase/migrations/147_portrait_mode.sql` -- latest `get_resolved_player_content` RPC
- Codebase analysis: `src/player/pages/ViewPage.jsx` -- player rendering architecture
- Codebase analysis: `src/player/components/ZonePlayer.jsx` -- zone-level playback patterns
- Codebase analysis: `src/services/mediaService.js` -- media types include 'audio', MIME handling exists
- Codebase analysis: `src/components/modals/InsertContentModal.jsx` -- already has Playlists tab

### Secondary (MEDIUM confidence)
- PostgreSQL recursive CTE documentation -- well-established pattern for tree/graph traversal
- HTML5 Audio API specification -- `loop`, `volume`, `play()`/`pause()` are stable, cross-browser
- Digital signage industry patterns (Yodeck, OptiSigns) -- nested playlists, background audio, working hours are standard features

### Tertiary (LOW confidence)
- None. All findings verified against codebase and well-established standards.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all patterns verified in existing codebase
- Architecture: HIGH - Clean extensions of existing patterns (services, migrations, player components)
- Pitfalls: HIGH - All pitfalls are well-known (autoplay policy, recursive CTE performance, timezone handling)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain, no moving targets)
