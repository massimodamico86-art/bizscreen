# Phase 56: Widget Registry + Clock/Date - Research

**Researched:** 2026-02-13
**Domain:** Widget architecture refactoring, timezone-aware rendering, React component patterns
**Confidence:** HIGH

## Summary

This phase addresses two intertwined problems: (1) widget rendering logic is duplicated across 4+ switch statements in different files, making it error-prone to add new widget types, and (2) the clock/date widgets lack timezone awareness, 12h/24h format control, seconds toggle, analog style, and combined clock+date mode.

The codebase already has all the building blocks needed. The `date-fns` v4 + `@date-fns/tz` v1.4.1 stack handles timezone-aware dates (already proven in CountdownWidget). The `Intl.DateTimeFormat` API with `timeZone` option handles timezone-aware formatting (already proven in AppRenderer's ClockApp). The existing `src/player/components/widgets/` directory with its barrel export provides the natural home for a registry module. The refactoring is primarily a consolidation exercise, not a greenfield build.

The current duplication is severe but well-structured -- each rendering path (EditorCanvas, LivePreviewWindow, SceneRenderer, LayoutElementRenderer) has its own `switch (widgetType)` block plus its own inline clock/date implementations. The widget type lists in the PropertiesPanel editor controls and LeftSidebar also each maintain their own widget type catalogs. The `createWidgetElement` function in `types.js` has a `defaultProps` map that partially duplicates what the LeftSidebar's `getDefaultWidgetProps` does. Consolidating these into a single registry is the central architectural goal.

**Primary recommendation:** Create a `src/widgets/registry.js` module that exports a `WIDGET_REGISTRY` map. Each entry maps a widget type key to `{ component, editorPreview, controlsComponent, defaultProps, icon, label }`. All rendering paths, properties panels, and factory functions consume this registry instead of maintaining their own switch statements.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.1 | Component rendering | Already in use |
| date-fns | ^4.1.0 | Date arithmetic | Already in use, proven in CountdownWidget |
| @date-fns/tz | ^1.4.1 | Timezone-aware dates (TZDate) | Already in use, proven in CountdownWidget |
| lucide-react | ^0.548.0 | Widget icons | Already in use for all widget icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.DateTimeFormat | Browser built-in | Timezone-aware time/date formatting | For clock/date display with `timeZone` option |
| TIMEZONE_OPTIONS (locationService) | N/A | IANA timezone selector data | Already exists at `src/services/locationService.js` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.DateTimeFormat | date-fns `format` with TZDate | Intl is built-in, zero-bundle, handles locale. Use Intl for display, date-fns for arithmetic. |
| Custom analog clock SVG | Third-party analog clock library | Custom SVG is ~50 lines, no dependency needed for a single styled clock face |
| React Context for timezone | Prop drilling | Context adds complexity; timezone prop is already threaded through LayoutRenderer->ZonePlayer. For scene editor, it's not needed (editor uses browser TZ). |

**Installation:**
```bash
# No new dependencies needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── widgets/                    # NEW: Centralized widget system
│   ├── registry.js             # Widget registry map + lookup functions
│   ├── types.js                # Shared widget type constants + default props
│   ├── components/             # Widget rendering components (moved from player/components/widgets/)
│   │   ├── ClockWidget.jsx     # Enhanced with timezone, format, seconds, analog
│   │   ├── DateWidget.jsx      # Enhanced with timezone, format options
│   │   ├── ClockDateWidget.jsx # NEW: Combined clock+date widget
│   │   ├── WeatherWidget.jsx   # Moved (no changes this phase)
│   │   ├── QRCodeWidget.jsx    # Moved (no changes this phase)
│   │   ├── DataTableWidget.jsx # Moved (no changes this phase)
│   │   ├── RssTickerWidget.jsx # Moved (no changes this phase)
│   │   ├── RssCardWidget.jsx   # Moved (no changes this phase)
│   │   ├── SocialFeedWidget.jsx# Moved (no changes this phase)
│   │   ├── CountdownWidget.jsx # Moved (no changes this phase)
│   │   └── index.js            # Barrel export
│   ├── editor/                 # Editor-mode preview components
│   │   └── EditorWidgetPreview.jsx  # Lightweight previews for editor canvas
│   └── controls/               # Properties panel controls
│       ├── ClockWidgetControls.jsx    # NEW: timezone, format, seconds, analog
│       ├── ClockDateWidgetControls.jsx # NEW: combined widget controls
│       └── index.js
├── player/components/widgets/  # Keep barrel re-export for backward compat
│   └── index.js                # Re-exports from ../../widgets/components/
```

**IMPORTANT ALTERNATIVE (simpler, recommended):** Given the existing codebase organization, a less disruptive approach is to keep widget components in `src/player/components/widgets/` and create the registry at `src/widgets/registry.js` that imports from there. This avoids mass file moves and keeps git history clean.

```
src/
├── widgets/                    # NEW: Registry module only
│   └── registry.js             # Central registry importing from player/components/widgets/
├── player/components/widgets/  # KEEP: Widget rendering components
│   ├── ClockWidget.jsx         # Enhanced
│   ├── DateWidget.jsx          # Enhanced
│   ├── ClockDateWidget.jsx     # NEW
│   └── ...existing widgets...
├── components/scene-editor/
│   ├── ClockWidgetControls.jsx      # NEW
│   ├── ClockDateWidgetControls.jsx  # NEW
│   └── CountdownWidgetControls.jsx  # Existing (reference pattern)
```

### Pattern 1: Widget Registry
**What:** A single JavaScript object that maps widget type keys to their metadata, components, default props, and editor controls.
**When to use:** Every time code needs to render a widget, look up defaults, list available types, or show widget-specific controls.
**Example:**
```javascript
// src/widgets/registry.js
import { Clock, Calendar, CloudSun, QrCode, Table2, Rss, Newspaper, Share2, Timer } from 'lucide-react';
import { ClockWidget } from '../player/components/widgets/ClockWidget.jsx';
import { DateWidget } from '../player/components/widgets/DateWidget.jsx';
import { ClockDateWidget } from '../player/components/widgets/ClockDateWidget.jsx';
// ...etc

export const WIDGET_REGISTRY = {
  clock: {
    component: ClockWidget,
    icon: Clock,
    label: 'Clock',
    defaultProps: {
      textColor: '#ffffff',
      format: '12h',
      showSeconds: false,
      timezone: 'screen',  // Use screen's assigned timezone
      style: 'digital',    // 'digital' | 'analog'
      accentColor: '#3b82f6',
    },
  },
  date: {
    component: DateWidget,
    icon: Calendar,
    label: 'Date',
    defaultProps: {
      textColor: '#ffffff',
      format: 'short',
      timezone: 'screen',
    },
  },
  'clock-date': {
    component: ClockDateWidget,
    icon: Clock, // or a custom combined icon
    label: 'Clock + Date',
    defaultProps: {
      textColor: '#ffffff',
      format: '12h',
      showSeconds: false,
      dateFormat: 'short',
      timezone: 'screen',
      style: 'digital',
      accentColor: '#3b82f6',
    },
  },
  weather: { /* ... */ },
  qr: { /* ... */ },
  'data-table': { /* ... */ },
  'rss-ticker': { /* ... */ },
  'rss-card': { /* ... */ },
  'social-feed': { /* ... */ },
  countdown: { /* ... */ },
};

/**
 * Get the React component for a widget type
 * @param {string} widgetType
 * @returns {React.ComponentType|null}
 */
export function getWidgetComponent(widgetType) {
  return WIDGET_REGISTRY[widgetType]?.component || null;
}

/**
 * Get default props for a widget type (for type switching / new widget creation)
 * @param {string} widgetType
 * @returns {Object}
 */
export function getWidgetDefaults(widgetType) {
  return { ...(WIDGET_REGISTRY[widgetType]?.defaultProps || {}) };
}

/**
 * Get all registered widget types (for UI selectors)
 * @returns {Array<{key: string, icon: React.ComponentType, label: string}>}
 */
export function getWidgetTypes() {
  return Object.entries(WIDGET_REGISTRY).map(([key, entry]) => ({
    key,
    icon: entry.icon,
    label: entry.label,
  }));
}
```

### Pattern 2: Timezone Resolution Chain
**What:** A consistent pattern for resolving which timezone to use: widget-level override > screen-assigned timezone > browser timezone.
**When to use:** Every clock/date widget rendering call.
**Example:**
```javascript
// Source: Proven pattern from existing CountdownWidget + AppRenderer ClockApp
function resolveTimezone(widgetTimezone, screenTimezone) {
  if (widgetTimezone && widgetTimezone !== 'screen') {
    return widgetTimezone; // Explicit IANA timezone from widget config
  }
  if (screenTimezone) {
    return screenTimezone; // Screen's assigned timezone from DB
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone; // Browser fallback
}
```

### Pattern 3: Widget Type Switching with Default Reset (INFRA-02)
**What:** When user changes widget type in the editor, replace all props with the new type's defaults.
**When to use:** In the PropertiesPanel WidgetControls `handleTypeChange` function.
**Example:**
```javascript
function handleTypeChange(newType) {
  // Get fresh defaults for the new type from registry
  const newDefaults = getWidgetDefaults(newType);
  // Full replacement -- no stale props from previous type
  onUpdate({ widgetType: newType, props: newDefaults });
}
```

### Pattern 4: Analog Clock SVG Rendering
**What:** A simple SVG-based analog clock with hour, minute, optional second hands.
**When to use:** When `props.style === 'analog'` in the ClockWidget.
**Example:**
```jsx
// Analog clock using SVG -- no external dependencies
function AnalogClock({ hours, minutes, seconds, showSeconds, accentColor, size }) {
  const hourAngle = ((hours % 12) + minutes / 60) * 30; // 360/12 = 30 degrees per hour
  const minuteAngle = (minutes + (seconds || 0) / 60) * 6; // 360/60 = 6 degrees per minute
  const secondAngle = (seconds || 0) * 6;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      {/* Clock face */}
      <circle cx="50" cy="50" r="48" fill="none" stroke={accentColor} strokeWidth="1" />
      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = i * 30;
        const rad = (angle - 90) * Math.PI / 180;
        return (
          <line
            key={i}
            x1={50 + 40 * Math.cos(rad)}
            y1={50 + 40 * Math.sin(rad)}
            x2={50 + 45 * Math.cos(rad)}
            y2={50 + 45 * Math.sin(rad)}
            stroke={accentColor}
            strokeWidth={i % 3 === 0 ? 2 : 1}
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1="50" y1="50"
        x2={50 + 25 * Math.cos((hourAngle - 90) * Math.PI / 180)}
        y2={50 + 25 * Math.sin((hourAngle - 90) * Math.PI / 180)}
        stroke={accentColor} strokeWidth="3" strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="50" y1="50"
        x2={50 + 35 * Math.cos((minuteAngle - 90) * Math.PI / 180)}
        y2={50 + 35 * Math.sin((minuteAngle - 90) * Math.PI / 180)}
        stroke={accentColor} strokeWidth="2" strokeLinecap="round"
      />
      {/* Second hand (optional) */}
      {showSeconds && (
        <line
          x1="50" y1="50"
          x2={50 + 38 * Math.cos((secondAngle - 90) * Math.PI / 180)}
          y2={50 + 38 * Math.sin((secondAngle - 90) * Math.PI / 180)}
          stroke="#ef4444" strokeWidth="1" strokeLinecap="round"
        />
      )}
      {/* Center dot */}
      <circle cx="50" cy="50" r="2" fill={accentColor} />
    </svg>
  );
}
```

### Anti-Patterns to Avoid
- **Adding a new switch case to each rendering path:** This is the exact problem being fixed. Use the registry lookup `getWidgetComponent(widgetType)` instead.
- **Passing `new Date()` with no timezone awareness:** Always pass timezone through to `toLocaleTimeString` or use `TZDate` from `@date-fns/tz`. Never call `new Date().toLocaleTimeString()` without `timeZone` option.
- **Merging old props into new widget type:** When switching widget types, always replace props entirely from defaults. Do not spread old props into new type.
- **Using `setInterval` at 1000ms for analog seconds hand:** This causes visible jumping. For analog clocks with seconds, use `requestAnimationFrame` or update at 100ms intervals for smooth sweep motion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone-aware date formatting | Custom UTC offset calculator | `Intl.DateTimeFormat` with `timeZone` option | Browser-native, handles DST transitions, summer/winter time changes automatically |
| IANA timezone list | Scrape IANA database | `TIMEZONE_OPTIONS` from `locationService.js` | Already curated for the app's target markets (15 major timezones) |
| Timezone-aware date arithmetic | Manual offset math | `TZDate` from `@date-fns/tz` | Already in use (CountdownWidget), handles edge cases around DST boundaries |
| SVG clock dial mathematics | Canvas 2D rendering | Pure SVG with rotation transforms | SVG scales perfectly in responsive containers, no canvas sizing headaches |

**Key insight:** The `Intl.DateTimeFormat` API with `timeZone` is the correct approach for display formatting. It is built into all modern browsers, handles DST automatically, and requires zero bundle size. The existing AppRenderer ClockApp already uses this pattern correctly (lines 131-143 of AppRenderer.jsx). The player widgets just need the same `timeZone` option plumbed through.

## Common Pitfalls

### Pitfall 1: Stale Props After Widget Type Switch
**What goes wrong:** User switches from "weather" to "clock" widget. The clock renders but has leftover `location: "Miami, FL"` and `units: "imperial"` in its props, which could confuse serialization or future property lookups.
**Why it happens:** The current `handleTypeChange` in PropertiesPanel only updates `widgetType` without resetting `props`.
**How to avoid:** In `handleTypeChange`, always replace props entirely: `onUpdate({ widgetType: newType, props: getWidgetDefaults(newType) })`.
**Warning signs:** Extra unknown properties in saved design_json blocks.

### Pitfall 2: Editor Uses Browser Timezone While Player Uses Screen Timezone
**What goes wrong:** Clock shows "3:00 PM" in the editor (browser in New York) but "12:00 PM" on the deployed screen (in Los Angeles).
**Why it happens:** Editor has no concept of "screen timezone" since it's editing, not playing. Player has access to `content.screen?.timezone`.
**How to avoid:** In editor preview, show the widget-configured timezone if explicitly set, otherwise show browser time with a small "(browser time)" indicator. In player, resolve via the timezone chain: widget override > screen timezone > browser.
**Warning signs:** Users reporting "time looked right in editor but wrong on TV."

### Pitfall 3: Registry Import Cycles
**What goes wrong:** Registry imports widget components which import from registry for defaults, creating a circular dependency.
**Why it happens:** Putting both component registry and default props in the same module that components also import from.
**How to avoid:** Keep the registry as a pure data module that only imports components. Default props should be data-only (no component references). Components should NOT import from registry -- they receive props from their parent.
**Warning signs:** `undefined` components at runtime, or Vite circular dependency warnings.

### Pitfall 4: Analog Clock Rerenders Causing Jank
**What goes wrong:** Analog clock with second hand stutters or causes layout thrashing.
**Why it happens:** Using `setInterval(1000)` causes the second hand to "jump" between positions instead of sweeping smoothly.
**How to avoid:** For analog clocks with seconds enabled, use `requestAnimationFrame` for smooth animation, or accept the "tick" motion (many real analog clocks tick). For digital display, 1s interval is fine.
**Warning signs:** Visible stutter when seconds hand is enabled in analog mode.

### Pitfall 5: Missing Widget Type in Registry Falls Through Silently
**What goes wrong:** A widget type in saved data that isn't in the registry renders as blank.
**Why it happens:** `getWidgetComponent` returns null and the consumer doesn't handle it.
**How to avoid:** Always have a fallback "Unknown Widget" placeholder component. The existing default cases in switch statements already do this -- preserve that behavior in the registry consumer.
**Warning signs:** Blank areas where widgets should appear after a code update.

### Pitfall 6: Layout Editor Widget Types Out of Sync with Scene Editor
**What goes wrong:** Scene editor shows 10 widget types but layout editor only shows 4 (clock, date, weather, qr).
**Why it happens:** The layout editor LeftSidebar has a hardcoded `WIDGET_ITEMS` array with only 5 entries, while the scene editor PropertiesPanel has 9 entries.
**How to avoid:** Both should consume `getWidgetTypes()` from the registry. This is a major benefit of the registry pattern.
**Warning signs:** Users confused that layout editor has fewer widget types than scene editor.

## Code Examples

Verified patterns from the existing codebase:

### Timezone-Aware Time Formatting (from AppRenderer ClockApp, lines 131-143)
```javascript
// Source: src/player/components/AppRenderer.jsx, lines 131-143
const formatTime = () => {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: config.format?.includes('A') || config.format?.includes('a')
  };
  if (config.showSeconds) {
    options.second = '2-digit';
  }
  if (tz && tz !== 'device') {
    options.timeZone = tz;
  }
  return time.toLocaleTimeString('en-US', options);
};
```

### Timezone Resolution (from CountdownWidget, lines 31-33)
```javascript
// Source: src/player/components/widgets/CountdownWidget.jsx, lines 31-33
const tz = timezone === 'device'
  ? Intl.DateTimeFormat().resolvedOptions().timeZone
  : timezone;
```

### Timezone Prop Threading (from ViewPage -> LayoutRenderer -> ZonePlayer)
```javascript
// Source: src/player/pages/ViewPage.jsx, line 679
// Screen timezone is available at: content.screen?.timezone
<LayoutRenderer layout={content.layout} timezone={content.screen?.timezone} ... />

// Source: src/player/components/LayoutRenderer.jsx, line 10
export function LayoutRenderer({ layout, timezone, screenId, tenantId, campaignId }) {
  // ... passes timezone to each ZonePlayer

// Source: src/player/components/ZonePlayer.jsx, line 12
export function ZonePlayer({ zone, timezone, screenId, ... }) {
  // ... passes timezone to AppRenderer
```

### Existing Default Props Pattern (from types.js createWidgetElement, lines 301-336)
```javascript
// Source: src/components/layout-editor/types.js, lines 302-310
const defaultProps = {
  clock: { textColor: '#ffffff', format: '12h', showSeconds: false },
  date: { textColor: '#ffffff', format: 'short' },
  weather: { textColor: '#ffffff', location: 'Miami, FL', units: 'imperial', style: 'minimal' },
  qr: { url: 'https://example.com', fgColor: '#000000', bgColor: '#ffffff', cornerRadius: 8 },
  data: { dataSourceId: '', field: '', rowIndex: 0, textColor: '#ffffff', fontSize: 24 },
  countdown: { textColor: '#ffffff', targetDate: '', label: '' },
  ticker: { textColor: '#ffffff', items: [], speed: 'medium' },
};
```

### Existing Widget Controls Pattern (from CountdownWidgetControls)
```javascript
// Source: src/components/scene-editor/CountdownWidgetControls.jsx
// This is the reference pattern for new widget controls components.
// Uses TIMEZONE_OPTIONS from locationService.js for timezone selector.
import { TIMEZONE_OPTIONS } from '../../services/locationService.js';
// Receives props and onPropChange callback
export function CountdownWidgetControls({ props, onPropChange }) {
  // Individual controls for each prop
  // Timezone selector with "Screen timezone (auto)" as default option
}
```

## Current Duplication Map

This table documents every place that currently has widget-type-specific logic that the registry must consolidate:

| File | What it Duplicates | Lines | Note |
|------|-------------------|-------|------|
| `EditorCanvas.jsx` | `WIDGET_ICONS` map + inline `switch(widgetType)` rendering 9 cases | ~52-688 | Editor canvas widget preview (inline, not using widget components) |
| `LivePreviewWindow.jsx` | `PreviewWidget` function with `switch(widgetType)` 7 cases | ~464-560 | Imports some widget components, but inlines clock/date |
| `SceneRenderer.jsx` | `SceneWidgetRenderer` with `switch(widgetType)` 9 cases | ~135-182 | Uses extracted widget components from player/widgets/ |
| `LayoutElementRenderer.jsx` | `WidgetElement` with `switch(widgetType)` 5 cases + inline ClockWidget/DateWidget | ~85-247 | Has its OWN inline clock/date implementations |
| `PropertiesPanel.jsx` | `widgetTypes` array (9 items) + widget-specific controls rendering | ~648-876 | Also has hardcoded widget list and conditional controls |
| `LayoutPropertiesPanel.jsx` | `widgetTypes` array (4 items) + widget controls | ~265-369 | Incomplete -- only clock/date/weather/qr |
| `LeftSidebar.jsx` (layout-editor) | `WIDGET_ITEMS` array (5 items) + `getDefaultWidgetProps` function | ~77-1012 | Different set of widget types than scene editor |
| `types.js` (layout-editor) | `createWidgetElement` with `defaultProps` map | ~301-336 | Default props for widget creation |
| `sceneDesignService.js` | `createWidgetBlock` function | ~618-633 | Scene editor widget block factory |

**Total: 9 files with duplicated widget knowledge.**

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Date().toLocaleTimeString()` (no tz) | `toLocaleTimeString('en-US', { timeZone: tz })` | Always available | Fixes CLOCK-06 with zero new dependencies |
| Inline widget rendering in each canvas | Extracted widget components in `player/components/widgets/` | Phase 7 refactoring | Partially done -- SceneRenderer uses components, but EditorCanvas/LayoutElementRenderer still inline |
| CountdownWidget uses `@date-fns/tz TZDate` | Same | Phase 55 (recent) | Proves the timezone pattern works in this codebase |
| Browser timezone always | `content.screen?.timezone` prop threading | Already exists | LayoutRenderer/ZonePlayer already receive timezone, widgets just don't use it yet |

**Deprecated/outdated:**
- The inline `ClockWidget` and `DateWidget` inside `LayoutElementRenderer.jsx` (lines 108-141): These should be replaced with the real widget components from the registry
- The inline `PreviewWidget` clock/date rendering in `LivePreviewWindow.jsx` (lines 464-525): Same -- should use registry components
- The inline clock/date rendering in `EditorCanvas.jsx` (lines 480-498): Same

## Open Questions

1. **Should the analog clock support multiple styles (Classic, Modern, Gold)?**
   - What we know: The `appCatalog.js` analog-clock entry lists 3 themes: Classic, Modern, Gold. The requirements say "analog clock style with customizable accent color."
   - What's unclear: Whether multiple pre-defined styles (beyond color) are needed or just accent color customization.
   - Recommendation: Start with a single clean analog design with `accentColor` customization. This satisfies CLOCK-04. More styles can be added later as CSS variations.

2. **Should the widget registry handle editor preview differently from player rendering?**
   - What we know: EditorCanvas renders lightweight static previews (no ticking), while SceneRenderer/player renders live widgets. LivePreviewWindow is in between.
   - What's unclear: Whether a single component can serve both, or if editor needs a separate lightweight preview.
   - Recommendation: Use the same component for all paths. The 1s `setInterval` in clock widgets is lightweight. EditorCanvas currently uses `new Date()` inline for a static snapshot -- moving to the live component is actually simpler and more accurate.

3. **How should timezone be threaded to widgets in the scene editor?**
   - What we know: The player gets timezone from `content.screen?.timezone`. The scene editor doesn't have a screen context.
   - What's unclear: Whether the editor should show screen timezone or browser timezone.
   - Recommendation: In editor contexts, use the widget's explicitly configured timezone if set, otherwise browser timezone. Add a small "(Screen TZ)" label in the properties panel to indicate that on deployed players, the screen timezone will be used.

4. **Should we move widget files to `src/widgets/` or keep them in `src/player/components/widgets/`?**
   - What we know: Moving files breaks git history and creates large diffs. The current location works.
   - What's unclear: Whether the organizational debt justifies the churn.
   - Recommendation: Keep widget components in their current location. Create `src/widgets/registry.js` as the thin orchestration layer that imports from `src/player/components/widgets/`. This minimizes file churn.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of all 9 files with widget duplication
- **EditorCanvas.jsx** - Lines 44-688: Full widget switch statement and inline rendering
- **LivePreviewWindow.jsx** - Lines 464-560: PreviewWidget with switch
- **SceneRenderer.jsx** - Lines 135-182: SceneWidgetRenderer with switch
- **LayoutElementRenderer.jsx** - Lines 85-247: WidgetElement with own implementations
- **ClockWidget.jsx** - Lines 1-72: Current minimal clock implementation
- **DateWidget.jsx** - Lines 1-72: Current minimal date implementation
- **CountdownWidget.jsx** - Lines 1-262: Reference for timezone handling with @date-fns/tz
- **AppRenderer.jsx** - Lines 119-194: ClockApp with timezone-aware Intl formatting
- **types.js** - Lines 301-336: createWidgetElement with defaultProps map
- **locationService.js** - Lines 445-461: TIMEZONE_OPTIONS
- **ViewPage.jsx** - Lines 679, 850: Screen timezone prop threading

### Secondary (MEDIUM confidence)
- **Intl.DateTimeFormat timeZone support** - ECMAScript Internationalization API, universally supported in modern browsers. The `timeZone` option accepts IANA timezone strings.
- **@date-fns/tz TZDate** - Used successfully in CountdownWidget for timezone-aware date construction

### Tertiary (LOW confidence)
- None -- all findings verified from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use and proven in this codebase
- Architecture: HIGH - Registry pattern is straightforward; all existing code patterns are clear from codebase analysis
- Pitfalls: HIGH - Based on direct analysis of the duplicated code and known browser timezone API behavior

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (stable -- no fast-moving dependencies)
