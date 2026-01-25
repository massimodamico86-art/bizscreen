# Phase 14: Scheduling Core - Research

**Researched:** 2026-01-24
**Domain:** Scheduling UI, Date/Time Handling, Calendar Components, Conflict Detection
**Confidence:** HIGH

## Summary

Phase 14 extends the existing scheduling infrastructure with date range scheduling, priority-based conflict resolution, and a 7-day visual preview. The codebase already has substantial scheduling foundations: `ScheduleEditorPage.jsx` (1055 lines), `scheduleService.js` (1052 lines), database schema with `schedule_entries`, conflict detection RPC, and basic `WeekPreview.jsx` component.

The primary work involves enhancing the existing components rather than building from scratch. Key additions: (1) inline calendar for date selection with duration presets, (2) named priority levels with color badges, (3) enhanced conflict blocking with detailed device info, (4) drag-and-drop week preview with content thumbnails.

**Primary recommendation:** Extend existing `ScheduleEditorPage.jsx` with new date/priority fields, enhance `ConflictWarning.jsx` to block saves, and upgrade `WeekPreview.jsx` with drag-drop using `@dnd-kit/core` and framer-motion (already installed).

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^4.1.0 | Date manipulation, formatting | Already in package.json, tree-shakeable |
| framer-motion | ^12.23.24 | Drag animations, gestures | Already installed, works with React 19 |
| lucide-react | ^0.548.0 | Icons (Calendar, Clock, etc.) | Project standard |
| Tailwind CSS | ^3.4.18 | Styling | Project standard |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @date-fns/tz | latest | Timezone-aware date handling, DST safety | DST transitions, device timezone display |
| @dnd-kit/core | latest | Drag-and-drop for week preview grid | Drag to reschedule, resize duration |
| @dnd-kit/utilities | latest | Transform utilities for drag | CSS transforms during drag |

### Not Needed (Already Have Solutions)
| Instead of | Don't Use | Why Existing is Better |
|------------|-----------|------------------------|
| react-datepicker | External calendar lib | Build inline calendar with date-fns + Tailwind |
| react-big-calendar | External calendar lib | Already have WeekPreview.jsx, just enhance it |
| moment.js | Heavy date lib | date-fns already installed, tree-shakeable |

**Installation:**
```bash
npm install @date-fns/tz @dnd-kit/core @dnd-kit/utilities
```

## Architecture Patterns

### Existing Project Structure (Extend)
```
src/
├── components/schedules/
│   ├── ConflictWarning.jsx     # Enhance: block save, show device info
│   ├── FillerContentPicker.jsx # Keep as-is
│   ├── WeekPreview.jsx         # Major: add drag-drop, thumbnails
│   ├── index.js                # Barrel export
│   ├── PriorityBadge.jsx       # NEW: 5-level priority display
│   ├── DateDurationPicker.jsx  # NEW: inline calendar + duration
│   └── DraggableTimeBlock.jsx  # NEW: draggable/resizable entry
├── pages/
│   └── ScheduleEditorPage.jsx  # Enhance: integrate new components
└── services/
    └── scheduleService.js      # Enhance: priority field support
```

### Pattern 1: Inline Calendar with Duration Presets
**What:** User Decision - "Start date + duration approach (not calendar range picker)"
**When to use:** Date selection for schedule entries
**Example:**
```jsx
// DateDurationPicker.jsx - combines inline calendar + duration selector
import { format, addDays, addWeeks, addMonths } from 'date-fns';

const DURATION_PRESETS = [
  { label: '1 day', value: 'P1D', fn: (d) => addDays(d, 1) },
  { label: '3 days', value: 'P3D', fn: (d) => addDays(d, 3) },
  { label: '1 week', value: 'P1W', fn: (d) => addWeeks(d, 1) },
  { label: '2 weeks', value: 'P2W', fn: (d) => addWeeks(d, 2) },
  { label: '1 month', value: 'P1M', fn: (d) => addMonths(d, 1) },
  { label: 'Custom', value: 'custom', fn: null },
  { label: 'No end date', value: 'forever', fn: null }
];

// Inline calendar is always visible, duration dropdown calculates end date
```

### Pattern 2: Named Priority Levels with Badge Component
**What:** User Decision - "Named levels instead of numeric: Lowest / Low / Normal / High / Critical (5 levels)"
**When to use:** Priority display and selection
**Example:**
```jsx
// PriorityBadge.jsx - extends existing Badge component pattern
const PRIORITY_LEVELS = [
  { value: 1, label: 'Lowest', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  { value: 2, label: 'Low', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  { value: 3, label: 'Normal', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  { value: 4, label: 'High', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  { value: 5, label: 'Critical', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' }
];

// Map numeric DB priority (1-5) to named levels for display
```

### Pattern 3: Conflict Blocking with Resolution
**What:** User Decision - "Block saving until conflict resolved"
**When to use:** Form submission when conflicts detected
**Example:**
```jsx
// Enhanced ConflictWarning.jsx pattern
// Current: displays warning, save button still works
// New: blocks save, shows resolution actions

const ConflictWarning = ({ conflicts, onResolve }) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h4>Cannot Save - Time Conflict Detected</h4>
      <p>{conflicts.length} overlapping entries on {getAffectedDevices(conflicts)}</p>
      {conflicts.map(c => (
        <ConflictRow
          key={c.id}
          conflict={c}
          onAdjust={() => onResolve('adjust', c)}  // Shift this entry
          onOverride={() => onResolve('override', c)} // Keep both, higher priority wins
        />
      ))}
    </div>
  );
};
```

### Pattern 4: @dnd-kit Week Grid Integration
**What:** User Decision - "Full drag and drop: drag to reschedule, resize to change duration"
**When to use:** Week preview visualization
**Example:**
```jsx
// WeekPreview.jsx with @dnd-kit integration
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function DraggableTimeBlock({ entry, onDrop, onResize }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: entry.id,
    data: entry
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ContentThumbnail entry={entry} />
      <ResizeHandle onResize={onResize} /> {/* Drag handle at bottom */}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Native HTML5 drag-drop for calendar:** Doesn't support touch, no resize, inconsistent across browsers
- **Storing times without timezone context:** DST will cause gaps/double-plays
- **Priority as raw number in UI:** Users don't understand 1-10, use named levels
- **Allowing saves with conflicts:** Creates undefined behavior on player devices

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DST transitions | Custom offset math | @date-fns/tz TZDate | Edge cases during spring-forward/fall-back |
| Drag-drop grid | Custom mouse events | @dnd-kit/core | Touch support, accessibility, animations |
| Calendar rendering | Custom date grid | date-fns week utilities | isSameDay, startOfWeek, eachDayOfInterval |
| Time slot collision | Manual overlap logic | Existing `check_schedule_entry_conflicts` RPC | Already handles time + date + days overlap |
| Priority colors | Inline style mapping | Tailwind variant classes | Consistent with Badge component pattern |

**Key insight:** The existing codebase has 90% of the scheduling logic. Phase 14 is enhancement, not greenfield development. The service layer (`scheduleService.js`) already has `checkEntryConflicts()`, `getWeekPreview()`, and CRUD operations. Focus on UI components.

## Common Pitfalls

### Pitfall 1: DST Gap Creates Schedule Hole
**What goes wrong:** User schedules 2:00 AM content. On DST spring-forward, 2:00 AM doesn't exist. Content doesn't play.
**Why it happens:** Storing/comparing local times without timezone awareness.
**How to avoid:**
1. Store schedule times in UTC or with explicit timezone
2. Use `@date-fns/tz` TZDate for all time comparisons
3. `tzScan()` can detect offset changes within a date range
**Warning signs:** Schedule works in winter, fails in March/November

### Pitfall 2: DST Overlap Creates Double-Play
**What goes wrong:** User schedules 1:30 AM content for 30 min. On DST fall-back, 1:30 AM happens twice. Content plays twice.
**Why it happens:** Time comparison without knowing which 1:30 AM occurrence.
**How to avoid:**
1. Use TZDate which includes offset in comparison
2. Player should track "already played" state for current occurrence
3. Add `occurrence_id` or wall-clock tracking
**Warning signs:** Analytics show double plays in November

### Pitfall 3: Conflict Detection Misses Device-Specific Overlaps
**What goes wrong:** Two entries overlap but target different devices. System blocks unnecessarily.
**Why it happens:** Current `check_schedule_entry_conflicts` RPC only checks schedule-level, not device assignment.
**How to avoid:**
1. Context says "which device(s) affected" - need to cross-reference device assignments
2. Enhance RPC or add client-side filtering
3. Show specific devices in conflict warning
**Warning signs:** False positive conflicts when user has device-specific schedules

### Pitfall 4: Large Week Preview Crashes Browser
**What goes wrong:** Schedule with 100+ entries causes sluggish drag-drop.
**Why it happens:** Re-rendering entire grid on every drag position change.
**How to avoid:**
1. Use React.memo on grid cells
2. Virtualize time slots (only render visible 8-hour window)
3. Debounce drag position updates (16ms = 60fps)
**Warning signs:** WeekPreview lags during drag operations

### Pitfall 5: No End Date Creates Infinite Queries
**What goes wrong:** "No end date" entry causes getWeekPreview to process forever.
**Why it happens:** Query tries to expand schedule to all future dates.
**How to avoid:**
1. Always limit preview to requested week (7 days max)
2. "No end date" in DB means `end_date IS NULL`, but UI caps at current week
3. Document: entries with null end_date are perpetual but only shown in requested window
**Warning signs:** Week preview API takes > 2 seconds

## Code Examples

Verified patterns from official sources and existing codebase:

### DST-Safe Time Handling with @date-fns/tz
```typescript
// Source: https://github.com/date-fns/tz
import { TZDate } from '@date-fns/tz';

// Create timezone-aware date
const scheduledTime = new TZDate(2026, 2, 8, 2, 0, 0, 'America/New_York');

// Check if time exists (DST gap detection)
// Spring forward: 2:00 AM doesn't exist
const isValidTime = scheduledTime.getTime() !== NaN;

// Get offset for a specific time
import { tzOffset } from '@date-fns/tz';
const offsetMinutes = tzOffset('America/New_York', new Date());

// Detect DST transitions in a range
import { tzScan } from '@date-fns/tz';
const transitions = tzScan('America/New_York', startDate, endDate);
```

### @dnd-kit Sortable Grid for Week View
```typescript
// Source: https://docs.dndkit.com
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

function WeekGrid({ entries, onEntryMove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevent accidental drags
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const entry = entries.find(e => e.id === active.id);
      const newSlot = over.data.current; // { date, time }
      onEntryMove(entry, newSlot);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {/* Grid cells are droppable, entries are draggable */}
    </DndContext>
  );
}
```

### Existing Conflict Check (from scheduleService.js)
```javascript
// Source: /src/services/scheduleService.js lines 750-778
export async function checkEntryConflicts(scheduleId, entryData, excludeEntryId = null) {
  if (!scheduleId) throw new Error('Schedule ID is required');

  const { data, error } = await supabase.rpc('check_schedule_entry_conflicts', {
    p_schedule_id: scheduleId,
    p_entry_id: excludeEntryId,
    p_start_time: entryData.start_time || '09:00',
    p_end_time: entryData.end_time || '17:00',
    p_days_of_week: entryData.days_of_week || null,
    p_start_date: entryData.start_date || null,
    p_end_date: entryData.end_date || null
  });

  // Returns { hasConflicts: boolean, conflicts: Array }
}
```

### Existing WeekPreview Data Structure
```javascript
// Source: /src/services/scheduleService.js getWeekPreview()
// Returns array of 7 day objects:
[{
  date: '2026-01-20',      // ISO date string
  dayOfWeek: 1,            // 0=Sun, 1=Mon, etc.
  dayName: 'Monday',
  dayShort: 'Mon',
  entries: [{
    id: 'entry-uuid',
    start_time: '09:00',
    end_time: '17:00',
    content_type: 'playlist',
    content_id: 'uuid',
    content_name: 'Morning Playlist',
    event_type: 'content',  // or 'screen_off'
    priority: 3
  }],
  filler: { type: 'playlist', id: 'uuid', name: 'Filler Playlist' } // if no entries
}]
```

### Existing Badge Component Pattern
```jsx
// Source: /src/design-system/components/Badge.jsx
// Use same variant pattern for PriorityBadge
const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| moment.js | date-fns + @date-fns/tz | 2024 | 3x smaller bundle, tree-shakeable |
| react-beautiful-dnd | @dnd-kit | 2023 | Active maintenance, React 19 support |
| date-fns-tz (third-party) | @date-fns/tz (official) | 2024 (date-fns v4) | Native timezone support, no extra dep |
| Time as strings | TZDate objects | 2024 | DST-safe calculations |

**Deprecated/outdated:**
- `date-fns-tz` package: Use `@date-fns/tz` instead (official, bundled with date-fns v4)
- `react-beautiful-dnd`: Deprecated in 2023, no React 18+ support
- Storing times as naive strings: Always store with timezone context

## Open Questions

Things that couldn't be fully resolved:

1. **Resize handle implementation**
   - What we know: @dnd-kit handles drag, but resize is separate concern
   - What's unclear: Whether to use mouse events for resize or find resize addon
   - Recommendation: Use CSS resize handle with onMouseDown tracking, not a library

2. **Device-specific conflict checking**
   - What we know: Context says show "which device(s) affected"
   - What's unclear: Current RPC checks schedule-level only, not device assignments
   - Recommendation: Post-process client-side: filter conflicts by device overlap

3. **Time slot granularity**
   - What we know: Claude's discretion - 15min, 30min, or 1hr options
   - What's unclear: User hasn't specified preference
   - Recommendation: Start with 30min slots (balance between precision and usability)

## Sources

### Primary (HIGH confidence)
- date-fns/tz GitHub - TZDate API, DST handling
- @dnd-kit documentation - Core hooks, sensors, collision detection
- Existing codebase: `scheduleService.js`, `ScheduleEditorPage.jsx`, `WeekPreview.jsx`
- Existing migrations: `074_scene_scheduling.sql`, `113_schedule_filler_content.sql`

### Secondary (MEDIUM confidence)
- [date-fns v4 blog post](https://blog.date-fns.org/v40-with-time-zone-support/) - First-class timezone support
- [react-big-calendar](https://www.npmjs.com/package/react-big-calendar) - Pattern reference (not using)
- [Tailwind calendar blocks](https://pagedone.io/blocks/application/calendar) - Week grid CSS patterns

### Tertiary (LOW confidence)
- WebSearch: DST handling best practices - General patterns, not library-specific
- WebSearch: Priority scheduling algorithms - Academic patterns, may not apply directly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed libraries, clear extension path
- Architecture: HIGH - Existing components to extend, patterns established
- DST handling: MEDIUM - Documented approach, but untested in this codebase
- Drag-drop resize: MEDIUM - @dnd-kit for drag is clear, resize needs custom work
- Pitfalls: HIGH - Based on codebase analysis and established patterns

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain)

---

*Phase: 14-scheduling-core*
*Research completed: 2026-01-24*
