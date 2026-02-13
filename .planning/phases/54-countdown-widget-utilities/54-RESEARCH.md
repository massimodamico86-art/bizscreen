# Phase 54: Countdown Widget & Utilities - Research

**Researched:** 2026-02-12
**Domain:** Countdown timer widget for digital signage scenes -- timezone-aware, recurring daily mode, locale formatting
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Ticking down to the second -- days, hours, minutes, seconds all visible and updating live
- Optional configurable title/label (e.g., "Grand Opening in...") displayed with the countdown
- Expiry behavior (daily recurring): Immediate reset when countdown reaches zero -- starts counting to same time tomorrow instantly
- No "It's time!" hold period for daily recurring -- straight to next cycle
- Recurring daily mode works for any daily recurring event (happy hour, store open/close, daily deals)
- General principle for one-time expiry: sensible defaults for digital signage where stale content is bad

### Claude's Discretion
- Visual layout style (segmented boxes, inline text, or adaptive)
- Color/theming approach (match existing widget patterns)
- Urgency visual cue near zero (color change or none)
- Expiry display and auto-hide behavior for one-time countdowns
- Mode toggle vs separate widget types for one-time vs recurring
- Duration window support for daily recurring
- Day-of-week filtering scope
- Timezone picker UX
- Locale support depth
- Target date display
- Editor preview ticking behavior

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase adds a countdown timer as a new widget type within the existing scene editor widget pipeline. The codebase already has a mature widget system with 8 widget types (clock, date, weather, qr, data-table, rss-ticker, rss-card, social-feed) and well-established patterns for player-side rendering, editor controls, and live preview integration. The countdown widget follows these patterns exactly, requiring: (1) a new `CountdownWidget` player component in `src/player/components/widgets/`, (2) a new `CountdownWidgetControls` component in `src/components/scene-editor/`, (3) registration in `WidgetControls`, `SceneWidgetRenderer`, `PreviewWidget`, and `EditorCanvas`, and (4) countdown calculation logic using the already-installed `date-fns` v4.1.0 + `@date-fns/tz` v1.4.1 packages.

The project already has `date-fns` and `@date-fns/tz` as production dependencies, used in scheduling components (`DateDurationPicker`, `WeekPreview`, `scheduleService`) for DST-safe date operations. The `TZDate` class from `@date-fns/tz` provides exactly what the countdown widget needs for timezone-aware calculations. The i18n system (`I18nContext` with `useI18n`/`useTranslation` hooks) supports 6 locales (en, es, pt, it, fr, de) and provides `formatDate`, `formatNumber` utilities -- these can drive locale-aware unit labels on the countdown.

A critical finding is that the `SceneRenderer` does NOT currently pass timezone to scene widget blocks (unlike `AppRenderer` which receives `deviceTimezone`). The `SceneRenderer` will need to be extended to thread the screen's timezone through to widgets, OR the countdown widget can use `Intl.DateTimeFormat().resolvedOptions().timeZone` as a runtime fallback (the device's timezone). For the editor, the user's browser timezone is the natural default with an explicit override dropdown for the target date's timezone.

**Primary recommendation:** Implement as a single `countdown` widget type with a mode toggle (`oneTime` vs `daily`), using `date-fns` + `@date-fns/tz` for timezone-aware calculations, following the exact same file structure as existing widgets (player component + editor controls + registration points). Use segmented boxes layout for the countdown display as it reads well at any zone size on digital signage.

## Existing Codebase Analysis (CRITICAL -- what's already built)

### Already Built -- DO NOT rebuild

| Component | File | What It Does |
|-----------|------|-------------|
| Widget pipeline | `SceneRenderer.jsx` `SceneWidgetRenderer` | Switch-case dispatching widget components by `widgetType` |
| Widget controls | `PropertiesPanel.jsx` `WidgetControls` | Widget type grid, conditional controls, `{ props, onPropChange }` pattern |
| Extracted controls | `RssWidgetControls.jsx`, `SocialFeedWidgetControls.jsx`, `DataTableWidgetControls.jsx` | Per-widget-type config UI in separate files |
| Editor canvas preview | `EditorCanvas.jsx` `renderBlockContent` case `'widget'` | Static mock previews for each widget type |
| Live preview | `LivePreviewWindow.jsx` `PreviewWidget` | Live ticking widgets (clock/date) + real widget imports (DataTable, RSS, Social) |
| Player clock widget | `ClockWidget.jsx` | 1-second setInterval, `toLocaleTimeString`, size presets, flex layout |
| Player date widget | `DateWidget.jsx` | Same pattern as clock -- 1-second interval, `toLocaleDateString` |
| Widget block factory | `sceneDesignService.js` `createWidgetBlock()` | Creates `{ id, type: 'widget', widgetType, x, y, width, height, layer, props }` |
| Timezone options | `locationService.js` `TIMEZONE_OPTIONS` | 15 IANA timezone options list for dropdown |
| i18n system | `I18nContext.jsx`, `i18nConfig.js` | `t()`, `formatDate()`, `formatNumber()`, locale state, 6 locales |
| date-fns + tz | `package.json` | `date-fns@^4.1.0`, `@date-fns/tz@^1.4.1` already installed |
| TZDate usage | `DateDurationPicker.jsx`, `WeekPreview.jsx`, `scheduleService.js` | DST-safe timezone-aware date arithmetic |

### Key Architectural Patterns

**Widget type registration requires changes in 5 files:**
1. `src/player/components/widgets/` -- new widget component (player-side)
2. `src/player/components/SceneRenderer.jsx` -- add case to `SceneWidgetRenderer`
3. `src/components/scene-editor/PropertiesPanel.jsx` -- add to `widgetTypes` array in `WidgetControls` + conditional controls
4. `src/components/scene-editor/EditorCanvas.jsx` -- add to `WIDGET_ICONS` + mock preview in `renderBlockContent`
5. `src/components/scene-editor/LivePreviewWindow.jsx` -- add case to `PreviewWidget` (import + render)

**Widget props flow:**
- All widget config stored in `block.props` within `design_json`
- Editor uses `handlePropChange(key, value)` and `handleMultiPropChange(updates)`
- Player widgets receive `{ props }` and destructure from it
- No database changes needed -- everything goes in the existing `design_json` JSONB column

**Widget controls pattern (Phases 51-53):**
- Extracted to separate file: `[WidgetType]WidgetControls.jsx`
- Receives `{ props, onPropChange }` (same as `SocialFeedWidgetControls`)
- Or `{ widgetType, props, onPropChange }` when handling multiple sub-types (like `RssWidgetControls`)
- Returns `<div className="space-y-3">...</div>` with labeled controls

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^4.1.0 | Date arithmetic (differenceInSeconds, addDays) | Already in project, tree-shakeable, modern ESM |
| @date-fns/tz | ^1.4.1 | Timezone-aware dates via TZDate class | Already in project, DST-safe, used by scheduling |
| React hooks | (React 19) | useState, useEffect, useMemo, useCallback | Existing widget pattern |
| Intl.DateTimeFormat | Browser built-in | Timezone conversion, locale formatting | Zero-dependency, all modern browsers |

### Supporting (already available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.548.0 | Icons (Timer, Clock, Calendar) | Widget type icon, controls icons |
| I18nContext | N/A (internal) | `t()` translation, `formatNumber()` | Locale-aware unit labels in editor |
| TIMEZONE_OPTIONS | N/A (internal) | IANA timezone list | Timezone dropdown in controls |

### No New Dependencies Required

All needed functionality is available from existing packages. `date-fns` provides `differenceInSeconds`, `addDays`, `set` (for setting time on a date), `startOfDay`, and `isAfter`/`isBefore`. `@date-fns/tz` provides `TZDate` for timezone-aware date construction. The countdown calculation is pure arithmetic on timestamps -- no external countdown library needed.

## Architecture Patterns

### Recommended File Structure

```
src/
├── player/components/widgets/
│   └── CountdownWidget.jsx          # Player-side countdown (new)
├── components/scene-editor/
│   └── CountdownWidgetControls.jsx   # Editor controls (new)
└── (existing files needing modification)
    ├── player/components/SceneRenderer.jsx       # Add import + case
    ├── components/scene-editor/PropertiesPanel.jsx  # Add to widgetTypes + conditional
    ├── components/scene-editor/EditorCanvas.jsx     # Add icon + mock preview
    └── components/scene-editor/LivePreviewWindow.jsx # Add import + case
```

### Pattern 1: CountdownWidget Component Structure

**What:** Player-side countdown timer -- self-contained with 1-second tick
**When to use:** On player screens within SceneWidgetRenderer

```jsx
// Follows existing ClockWidget pattern exactly
export function CountdownWidget({ props = {} }) {
  const {
    mode = 'oneTime',        // 'oneTime' | 'daily'
    targetDate,              // ISO 8601 string for one-time
    targetTime,              // 'HH:mm' string for daily
    timezone = 'device',     // IANA timezone or 'device'
    label = '',              // Optional title text
    locale = 'en',           // Locale for unit labels
    textColor = '#ffffff',
    // ... styling props
  } = props;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate remaining time
  const remaining = calculateCountdown(mode, targetDate, targetTime, timezone, now);

  // Render segmented display
  return (/* ... */);
}
```

### Pattern 2: Countdown Calculation Logic

**What:** Pure function computing days/hours/minutes/seconds remaining
**When to use:** In CountdownWidget for both one-time and daily modes

```jsx
// date-fns + @date-fns/tz for timezone-aware calculation
import { differenceInSeconds } from 'date-fns';
import { TZDate } from '@date-fns/tz';

function calculateCountdown(mode, targetDate, targetTime, timezone, now) {
  const tz = timezone === 'device'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : timezone;

  if (mode === 'oneTime') {
    // Target is a specific date/time in the specified timezone
    const target = new TZDate(targetDate, tz);
    const totalSeconds = differenceInSeconds(target, now);
    if (totalSeconds <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    return decompose(totalSeconds);
  }

  if (mode === 'daily') {
    // Target is today at targetTime in the specified timezone
    // If already passed, target is tomorrow at targetTime
    const [hours, minutes] = targetTime.split(':').map(Number);
    const todayTarget = new TZDate(
      now.getFullYear(), now.getMonth(), now.getDate(),
      hours, minutes, 0, 0, tz
    );
    let target = todayTarget;
    if (differenceInSeconds(target, now) <= 0) {
      // Immediate reset: target tomorrow
      target = new TZDate(
        now.getFullYear(), now.getMonth(), now.getDate() + 1,
        hours, minutes, 0, 0, tz
      );
    }
    const totalSeconds = differenceInSeconds(target, now);
    return decompose(totalSeconds);
  }
}

function decompose(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { expired: false, days, hours, minutes, seconds };
}
```

### Pattern 3: Widget Controls Structure

**What:** Editor controls following the extracted-controls pattern from Phase 51-53
**When to use:** CountdownWidgetControls.jsx

```jsx
// Same { props, onPropChange } interface as SocialFeedWidgetControls
export function CountdownWidgetControls({ props, onPropChange }) {
  return (
    <div className="space-y-3">
      {/* Mode Toggle: One-time vs Daily */}
      {/* Target Date/Time inputs */}
      {/* Timezone dropdown using TIMEZONE_OPTIONS */}
      {/* Label input */}
      {/* Locale selector */}
    </div>
  );
}
```

### Pattern 4: EditorCanvas Mock Preview

**What:** Static mock countdown in the editor canvas
**When to use:** In EditorCanvas renderBlockContent switch for 'countdown'

```jsx
// Same pattern as other widget mocks -- static, not live
case 'countdown':
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1"
      style={{ fontSize: 'clamp(0.3rem, 0.8vw, 0.5rem)' }}>
      <div className="text-gray-400 text-center" style={{ fontSize: 'inherit' }}>
        {props.label || 'Countdown'}
      </div>
      <div className="flex gap-1">
        {['12', '05', '30', '45'].map((v, i) => (
          <div key={i} className="bg-gray-700/50 rounded px-0.5 text-center">
            <div style={{ color: textColor, fontSize: 'clamp(0.4rem, 1vw, 0.7rem)', fontWeight: '600' }}>{v}</div>
            <div className="text-gray-500" style={{ fontSize: 'clamp(0.2rem, 0.4vw, 0.3rem)' }}>
              {['D', 'H', 'M', 'S'][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
```

### Pattern 5: LivePreview Integration

**What:** Live ticking countdown in LivePreviewWindow
**When to use:** In PreviewWidget switch for 'countdown'

```jsx
// Import real widget like DataTableWidget, RssTickerWidget, SocialFeedWidget pattern
import { CountdownWidget } from '../../player/components/widgets/CountdownWidget.jsx';

case 'countdown':
  return <CountdownWidget props={props} />;
```

### Anti-Patterns to Avoid
- **Separate widget type per mode:** Don't create `countdown-oneTime` and `countdown-daily` as separate widgetTypes. Use a single `countdown` type with a `mode` prop. This follows the RSS pattern where `rss-ticker` and `rss-card` are separate types because they have completely different rendering, but countdown rendering is the same regardless of mode.
- **Hand-rolling timezone math:** Don't use raw `Date` timezone offset arithmetic. Use `TZDate` from `@date-fns/tz` which handles DST correctly.
- **Rebuilding widget infrastructure:** Don't create a new widget registration system. Use the existing switch-case pattern in all 5 files.
- **Custom countdown loop with requestAnimationFrame:** Don't use rAF for the countdown. The existing clock/date widgets use `setInterval(fn, 1000)` and that pattern works fine for per-second updates. rAF would cause unnecessary re-renders.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone-aware date arithmetic | Manual UTC offset calculations | `TZDate` from `@date-fns/tz` | DST transitions, leap seconds, IANA database |
| Seconds decomposition | Custom modular arithmetic | Simple pure function (4 lines) | Not complex enough for a library, but DO extract to testable function |
| Timezone dropdown | Custom timezone list | `TIMEZONE_OPTIONS` from `locationService.js` | Already exists with curated, labeled options |
| Locale-aware formatting | Custom label translation | `Intl.DateTimeFormat` + i18n `t()` | Browser handles locale rules natively |
| Widget registration | Plugin system | Add to 5 existing switch statements | Consistency with 8 existing widget types |

**Key insight:** This widget requires zero new dependencies and zero new infrastructure. Every building block exists -- the value is in composing them correctly.

## Discretion Recommendations

### Visual Layout: Segmented Boxes (RECOMMENDED)

**Recommendation: Segmented boxes with unit labels below each segment**

Rationale:
- Digital signage is viewed from 3-30 feet away. Segmented boxes with large numbers are readable at distance.
- The zone-based layout means the countdown might be any aspect ratio. Segmented boxes adapt via `flex-wrap` or responsive font sizing.
- This is the industry standard for countdown displays (event boards, scoreboards).
- Existing widgets use `clamp()` font sizes that scale with zone dimensions -- apply the same pattern.

Layout structure:
```
[  12  ] [  05  ] [  30  ] [  45  ]
  Days    Hours    Mins     Secs
```

Each segment: a rounded box with background, large number on top, small label below. Optional label above the segments.

### One-Time Expiry: Show "00:00:00:00" for 60 seconds then auto-hide

**Recommendation:** Display frozen zeros for 60 seconds, then render `null` (disappear silently).

Rationale:
- User's principle is "stale content is bad" for digital signage
- Frozen zeros for 60 seconds gives a clear "event has arrived" signal
- Auto-hide after 60s ensures no stale countdown lingers on screen
- The 60-second window covers the case where content might rotate away and back
- Rendering `null` is the "silent offline fallback" pattern from Phase 51

### Mode Toggle vs Separate Types: Mode Toggle (RECOMMENDED)

**Recommendation: Single `countdown` widget type with `mode: 'oneTime' | 'daily'` prop**

Rationale:
- RSS uses separate types (`rss-ticker`, `rss-card`) because rendering differs completely (horizontal scroll vs card grid)
- Countdown rendering is identical regardless of mode -- only the target calculation differs
- Single type keeps the widgetTypes grid manageable (currently 8 items, adding 1 = 9, adding 2 = 10 which starts to crowd the 2-column grid)
- Mode toggle in controls panel is the standard UI pattern for this distinction

### Timezone Approach: Default to Screen's Timezone with Override Dropdown

**Recommendation:** Default `timezone` prop to `'device'` (the screen's local timezone). In controls, show a dropdown with `TIMEZONE_OPTIONS` from `locationService.js`, prepended with a "Screen timezone (auto)" option.

Rationale:
- Most countdown targets are local events ("Store opens at 9 AM" = screen's timezone)
- The `'device'` sentinel value is already used by `ClockApp` in `AppRenderer.jsx`
- At runtime, `'device'` resolves to `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Override dropdown covers the edge case of counting down to an event in a different timezone
- `TIMEZONE_OPTIONS` already exists with 15 curated IANA zones

### Locale Support: Unit Label Translation with Existing i18n System

**Recommendation:** Add countdown unit labels ("days", "hours", "minutes", "seconds") to the `en.json` locale file. Use short labels by default ("D", "H", "M", "S") with option for full labels ("Days", "Hours", "Min", "Sec"). On the player side, where I18nProvider may not be available, use `Intl.DateTimeFormat` for locale detection and simple label maps.

Rationale:
- The i18n system exists but player-side widgets don't currently use it (they run outside `I18nProvider`)
- Player widgets use hardcoded `'en-US'` locale (see `ClockWidget`, `DateWidget`)
- Adding a `locale` prop to the widget config is consistent with WIDGET-04 requirement
- Simple label maps (not full ICU) are sufficient for 4 time-unit labels

### Duration Window for Daily Recurring: Skip for Now

**Recommendation:** Do NOT implement duration window (e.g., "show message during event") in Phase 54.

Rationale:
- Adds significant complexity (state machine: counting down -> active window -> reset)
- The user said "no primary use case" -- this is a general-purpose countdown
- Can be added later as a prop without breaking changes
- The user can achieve "show message during event" by using scene scheduling to swap slides

### Day-of-Week Filtering: Skip, Rely on Scene Schedules

**Recommendation:** Do NOT implement day-of-week filtering within the widget.

Rationale:
- Scene schedules (Phase 37) already support day-of-week filtering
- Adding it to the widget creates redundant configuration
- The daily mode already handles "today or tomorrow" logic -- schedule filtering handles which days it shows at all

### Target Date Display: Don't Show by Default, Add Prop

**Recommendation:** Add `showTargetDate: false` prop. When true, show the target date/time below the countdown.

Rationale:
- Most digital signage countdowns show only the countdown, not the target
- Having the option satisfies edge cases without cluttering the default display
- Renders with `Intl.DateTimeFormat` using the widget's locale and timezone

### Editor Preview: Live Ticking in LivePreview, Static Mock in EditorCanvas

**Recommendation:**
- **EditorCanvas**: Static mock (numbers like "12 05 30 45") -- consistent with all other widget mocks
- **LivePreviewWindow**: Live ticking -- import real `CountdownWidget`, consistent with clock/date/data-table live rendering

Rationale:
- EditorCanvas mocks everything for performance (no live clock, no real weather data, no actual tables)
- LivePreviewWindow renders real widgets (clock ticks, DataTableWidget fetches data, RssTickerWidget scrolls)
- This split is the established pattern from Phase 51

### Urgency Visual Cue: Subtle Color Shift

**Recommendation:** When countdown is under 1 hour, shift segment background to a warm color (e.g., `rgba(239, 68, 68, 0.15)` -- subtle red tint). Make this configurable with `showUrgency: true` default.

Rationale:
- Digital signage often needs to draw attention as events approach
- Subtle enough not to clash with custom theming
- Configurable so users can disable it for neutral countdowns

## Common Pitfalls

### Pitfall 1: Timezone-Unaware Date Parsing

**What goes wrong:** Using `new Date('2026-03-15T09:00:00')` without timezone specification. JavaScript parses this as local time in the browser's timezone, which differs between the editor (user's browser) and the player (screen's device).
**Why it happens:** The target date string must be stored with timezone context, but ISO strings without `Z` or offset are parsed inconsistently.
**How to avoid:** Store target dates as ISO strings WITH timezone context. Use `TZDate` for parsing. The config stores `targetDate: '2026-03-15T09:00:00'` plus `timezone: 'America/New_York'` separately. The widget uses `new TZDate(targetDate, timezone)` to create the target.
**Warning signs:** Countdown shows different values in editor vs player, or jumps by hours.

### Pitfall 2: DST Transition Edge Cases for Daily Recurring

**What goes wrong:** On the day DST changes (spring forward / fall back), a daily countdown targeting "02:30" might skip or repeat because 2:30 AM doesn't exist (spring forward) or exists twice (fall back).
**Why it happens:** Naive date arithmetic (adding 24*60*60*1000 ms) doesn't account for DST.
**How to avoid:** Use `TZDate` constructor with explicit hour/minute in the target timezone. `TZDate` handles "this time in this timezone tomorrow" correctly by adjusting for DST. Test with edge-case times (2:00-3:00 AM on DST transition days).
**Warning signs:** Countdown displays negative values or jumps by an hour twice a year.

### Pitfall 3: setInterval Drift on Long-Running Displays

**What goes wrong:** `setInterval(fn, 1000)` drifts over time due to JavaScript event loop delays. After 24 hours, a 1-second timer might be 10+ seconds behind.
**Why it happens:** setInterval guarantees minimum delay, not exact delay. CPU load, garbage collection, and other tasks introduce jitter.
**How to avoid:** The countdown calculates remaining time from `new Date()` on every tick rather than decrementing a counter. This means drift in the interval only affects display freshness (might update 1.1s later), not accuracy of the countdown value. This is already the pattern used by `ClockWidget`.
**Warning signs:** None visible -- this is already handled by the architecture (calculate from current time, don't decrement).

### Pitfall 4: Forgetting to Register in All 5 Files

**What goes wrong:** Widget appears in the editor type grid but doesn't render on the player, or renders in preview but not in the editor canvas mock.
**Why it happens:** The widget pipeline has 5 registration points. Missing any one causes a broken experience in one context.
**How to avoid:** Checklist:
  1. Player component: `src/player/components/widgets/CountdownWidget.jsx`
  2. SceneRenderer switch: `src/player/components/SceneRenderer.jsx`
  3. WidgetControls type list + controls: `src/components/scene-editor/PropertiesPanel.jsx`
  4. EditorCanvas icon + mock: `src/components/scene-editor/EditorCanvas.jsx`
  5. LivePreviewWindow import + case: `src/components/scene-editor/LivePreviewWindow.jsx`
**Warning signs:** Widget works in one context but shows "Widget" fallback or blank in another.

### Pitfall 5: Background Tab Timer Throttling

**What goes wrong:** Browsers throttle `setInterval` to 1Hz in background tabs, and to once per minute after 5 minutes of inactivity.
**Why it happens:** Battery/CPU conservation in browsers.
**How to avoid:** For digital signage, the player tab is fullscreen and the active tab, so throttling should not occur in production. However, during development/testing, switching tabs WILL cause apparent countdown freezing. This is not a bug. For Tizen/WebOS player hardware, the signage browser runs as the only app -- no tab switching occurs.
**Warning signs:** Countdown freezes during development when switching tabs. Accept this as expected browser behavior -- production player is always active.

### Pitfall 6: Stale Countdown After Timezone Change

**What goes wrong:** User changes the timezone in the editor controls, but the countdown doesn't update because it was calculated once on mount.
**Why it happens:** Missing dependency in the countdown calculation's useEffect/useMemo.
**How to avoid:** Include `timezone` in the dependency array of the countdown calculation. The calculation runs on every tick (every 1s) using current time, so timezone changes take effect on the next tick.
**Warning signs:** Changing timezone in editor shows no change in LivePreviewWindow.

## Code Examples

### Countdown Calculation (Core Logic)

```jsx
// Source: Verified date-fns v4 + @date-fns/tz v1 API from existing codebase usage
import { differenceInSeconds } from 'date-fns';
import { TZDate } from '@date-fns/tz';

/**
 * Calculate countdown remaining time
 * @param {string} mode - 'oneTime' or 'daily'
 * @param {string} targetDate - ISO date string for oneTime mode
 * @param {string} targetTime - 'HH:mm' for daily mode
 * @param {string} timezone - IANA timezone or 'device'
 * @param {Date} now - Current time
 * @returns {{ expired: boolean, days: number, hours: number, minutes: number, seconds: number }}
 */
export function calculateCountdown(mode, targetDate, targetTime, timezone, now) {
  const tz = timezone === 'device'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : timezone;

  let target;

  if (mode === 'daily') {
    const [h, m] = (targetTime || '17:00').split(':').map(Number);
    // Create today's target in the specified timezone
    const todayInTz = new TZDate(now, tz);
    target = new TZDate(
      todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate(),
      h, m, 0, 0, tz
    );
    // If target has passed, immediately reset to tomorrow
    if (differenceInSeconds(target, now) <= 0) {
      target = new TZDate(
        todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate() + 1,
        h, m, 0, 0, tz
      );
    }
  } else {
    // oneTime mode
    if (!targetDate) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    target = new TZDate(targetDate, tz);
  }

  const totalSeconds = differenceInSeconds(target, now);

  if (totalSeconds <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    expired: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
```

### Widget Props Schema

```javascript
// Design JSON block.props for countdown widget:
{
  // Required
  mode: 'oneTime' | 'daily',

  // Mode-specific (one is required depending on mode)
  targetDate: '2026-06-15T09:00:00',   // ISO string, oneTime mode
  targetTime: '17:00',                  // HH:mm string, daily mode

  // Timezone
  timezone: 'America/New_York',         // IANA timezone or 'device' (default)

  // Display
  label: 'Grand Opening in...',         // Optional title above countdown
  showTargetDate: false,                // Show target date/time below countdown
  showUrgency: true,                    // Color shift when < 1 hour
  labelSize: 'medium',                  // Label font size

  // Locale
  locale: 'en',                         // Unit label language
  unitLabelStyle: 'short',              // 'short' (D/H/M/S) or 'full' (Days/Hours/Min/Sec)

  // Styling (shared with all widgets)
  textColor: '#ffffff',
}
```

### Registration in PropertiesPanel.jsx

```jsx
// Add to widgetTypes array in WidgetControls function:
{ key: 'countdown', icon: Timer, label: 'Countdown' },

// Add conditional rendering after social-feed controls:
{widgetType === 'countdown' && (
  <CountdownWidgetControls
    props={props}
    onPropChange={handlePropChange}
  />
)}
```

### Registration in SceneRenderer.jsx

```jsx
// Add import at top:
import { CountdownWidget } from './widgets/CountdownWidget.jsx';

// Add case in SceneWidgetRenderer switch:
case 'countdown':
  return <CountdownWidget props={safeProps} />;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| moment.js + moment-timezone | date-fns + @date-fns/tz | 2023-2024 | Tree-shakeable, immutable, smaller bundles |
| Manual UTC offset math | TZDate IANA-based | @date-fns/tz v1.0 (2024) | DST-safe, no manual offset tracking |
| hardcoded 'en-US' | Intl API with locale param | Always available | Native browser locale support |

**Deprecated/outdated:**
- moment.js: Not used in this project (correctly using date-fns)
- Manual `getTimezoneOffset()` arithmetic: Fragile, DST-unsafe. Use `TZDate` instead.

## Open Questions

1. **SceneRenderer timezone threading**
   - What we know: `SceneRenderer` does NOT pass timezone to scene widgets. `AppRenderer` does receive `deviceTimezone`.
   - What's unclear: Whether to modify `SceneRenderer` to thread timezone through, or have `CountdownWidget` use `Intl.DateTimeFormat().resolvedOptions().timeZone` as runtime default.
   - Recommendation: For Phase 54, use the runtime detection approach (`'device'` sentinel resolved at widget level). This avoids modifying `SceneRenderer` which would require changes to all widget component signatures. The countdown's `timezone` prop in `design_json` can be set explicitly in the editor anyway. If future widgets also need timezone, a follow-up phase can thread it through `SceneRenderer`.

2. **Player-side i18n context**
   - What we know: Player widgets render outside `I18nProvider`. `ClockWidget` and `DateWidget` hardcode `'en-US'`.
   - What's unclear: Whether the countdown widget should use the i18n system or handle locale internally.
   - Recommendation: Use a `locale` prop stored in `design_json`. The widget uses this for `Intl.DateTimeFormat` locale parameter and for unit label selection from a built-in map. This keeps the widget self-contained like other player widgets. No dependency on `I18nProvider`.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/player/components/widgets/ClockWidget.jsx`, `DateWidget.jsx`, `DataTableWidget.jsx` -- widget architecture patterns
- Codebase analysis: `src/components/scene-editor/PropertiesPanel.jsx` -- WidgetControls registration pattern
- Codebase analysis: `src/components/scene-editor/RssWidgetControls.jsx`, `SocialFeedWidgetControls.jsx` -- extracted controls pattern
- Codebase analysis: `src/player/components/SceneRenderer.jsx` -- SceneWidgetRenderer dispatch pattern
- Codebase analysis: `src/components/scene-editor/EditorCanvas.jsx` -- mock preview pattern
- Codebase analysis: `src/components/scene-editor/LivePreviewWindow.jsx` -- live preview pattern
- Codebase analysis: `src/services/sceneDesignService.js` -- createWidgetBlock factory
- Codebase analysis: `package.json` -- date-fns@^4.1.0, @date-fns/tz@^1.4.1 already installed
- Codebase analysis: `src/components/schedules/DateDurationPicker.jsx`, `WeekPreview.jsx` -- TZDate usage patterns
- Codebase analysis: `src/services/locationService.js` -- TIMEZONE_OPTIONS
- Codebase analysis: `src/i18n/I18nContext.jsx`, `src/i18n/i18nConfig.js` -- i18n system and supported locales
- Codebase analysis: `src/player/components/AppRenderer.jsx` -- `ClockApp` timezone handling pattern

### Secondary (MEDIUM confidence)
- [Chrome Timer Throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88) -- background tab timer behavior
- [Browser Timer Throttling Analysis](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/) -- comprehensive throttling overview
- [setInterval Throttling Workarounds](https://pontistechnology.com/learn-why-setinterval-javascript-breaks-when-throttled/) -- Web Worker alternative for background tabs

### Tertiary (LOW confidence)
- [Tizen Timer API](https://github.com/SamsungDForum/TimeSettings) -- Tizen-specific timer settings (not directly relevant to web timer throttling)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use in the codebase
- Architecture: HIGH -- follows exact patterns from 8 existing widget types documented in code
- Pitfalls: HIGH -- identified from real codebase patterns and verified browser behavior
- Discretion recommendations: HIGH -- based on thorough analysis of existing patterns and digital signage context

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable -- no fast-moving dependencies)
