---
phase: 56-widget-registry-clock-date
plan: 02
subsystem: ui
tags: [react, widgets, timezone, intl, svg, clock, date, analog-clock]

# Dependency graph
requires:
  - phase: 56-01
    provides: "Centralized WIDGET_REGISTRY with getWidgetComponent, getWidgetDefaults, getWidgetTypes"
provides:
  - "Timezone-aware ClockWidget with 12h/24h, seconds toggle, analog SVG style"
  - "Timezone-aware DateWidget with long/short/numeric format"
  - "ClockDateWidget combining time+date in one zone"
  - "clock-date registry entry with full defaultProps"
  - "Editor controls for timezone selector, format, seconds, style, accent color"
affects: [57-qr-widget-enhancements, 58-weather-widget, 61-widget-polish, 62-display-toolkit-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveTimezone(widgetTz, screenTz) chain: widget override > screen timezone > browser fallback"
    - "Intl.DateTimeFormat with timeZone option for timezone-aware clock/date rendering"
    - "SVG analog clock with hour markers, hour/minute/second hands, accent color"
    - "getTimeComponents using Intl.formatToParts for timezone-aware analog clock positioning"

key-files:
  created:
    - "src/player/components/widgets/ClockDateWidget.jsx"
  modified:
    - "src/player/components/widgets/ClockWidget.jsx"
    - "src/player/components/widgets/DateWidget.jsx"
    - "src/player/components/widgets/index.js"
    - "src/widgets/registry.js"
    - "src/components/scene-editor/PropertiesPanel.jsx"
    - "src/components/layout-editor/LayoutPropertiesPanel.jsx"

key-decisions:
  - "Duplicate resolveTimezone helper in each widget (~5 lines) instead of shared import to avoid cross-component coupling"
  - "Use Intl.DateTimeFormat.formatToParts for analog clock hand positioning instead of TZDate construction"
  - "Date format default changed from 'short' to 'long' in registry to match original DateWidget behavior"
  - "Added clock/date controls to LayoutPropertiesPanel for editor consistency"

patterns-established:
  - "resolveTimezone pattern: all timezone-aware widgets use resolveTimezone(props.timezone, timezone) for consistent resolution"
  - "AnalogClock SVG pattern: inline SVG with viewBox 0 0 100 100, trigonometric hand positioning"

# Metrics
duration: 4min
completed: 2026-02-14
---

# Phase 56 Plan 02: Clock/Date Widget Enhancements Summary

**Timezone-aware clock/date widgets with resolveTimezone chain, 12h/24h format, seconds toggle, SVG analog style, and combined ClockDateWidget registered in WIDGET_REGISTRY**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-14T04:01:39Z
- **Completed:** 2026-02-14T04:05:50Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Enhanced ClockWidget with timezone awareness (CLOCK-01, CLOCK-06), 12h/24h format (CLOCK-02), seconds toggle (CLOCK-03), and analog SVG style with customizable accent color (CLOCK-04)
- Enhanced DateWidget with timezone awareness and long/short/numeric format options
- Created ClockDateWidget combining time and date in one zone with digital and analog styles (CLOCK-05)
- Added clock-date entry to WIDGET_REGISTRY with full defaultProps
- Added comprehensive editor controls for clock/date configuration in both PropertiesPanel and LayoutPropertiesPanel

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance ClockWidget and DateWidget with timezone and format options** - `b8d3e55` (feat)
2. **Task 2: Create ClockDateWidget and update registry + editor controls** - `0b14f2c` (feat)

## Files Created/Modified
- `src/player/components/widgets/ClockWidget.jsx` - Enhanced with resolveTimezone, 12h/24h, seconds, analog SVG clock
- `src/player/components/widgets/DateWidget.jsx` - Enhanced with resolveTimezone, long/short/numeric format, 60s interval
- `src/player/components/widgets/ClockDateWidget.jsx` - New combined clock+date widget with digital and analog styles
- `src/player/components/widgets/index.js` - Added ClockDateWidget barrel export
- `src/widgets/registry.js` - Added clock-date entry, updated clock/date defaultProps with timezone/style
- `src/components/scene-editor/PropertiesPanel.jsx` - Timezone selector, format toggle, seconds switch, style picker, accent color, date format
- `src/components/layout-editor/LayoutPropertiesPanel.jsx` - Matching clock/date controls for layout editor

## Decisions Made
- Duplicated the 5-line resolveTimezone helper in each widget file rather than creating a shared import. This avoids circular dependency risk and keeps each widget self-contained -- the helper is trivial.
- Used Intl.DateTimeFormat.formatToParts to extract numeric hour/minute/second values for analog clock hand positioning. This avoids importing @date-fns/tz (TZDate) for what is a pure display operation.
- Changed date widget registry default format from 'short' to 'long' to match the original DateWidget behavior (which used weekday: 'long', month: 'long', day: 'numeric').
- Added clock/date/clock-date controls to LayoutPropertiesPanel in addition to PropertiesPanel, ensuring both scene editor and layout editor provide the same configuration experience.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Changed date registry defaultProps.format from 'short' to 'long'**
- **Found during:** Task 2 (registry update)
- **Issue:** Plan specified `format: 'long'` for date defaultProps but existing registry had `format: 'short'`. The original DateWidget rendered "Thursday, January 23" by default (long format). Keeping 'short' would change default behavior for existing date widgets.
- **Fix:** Set `format: 'long'` in the date registry entry to match original widget behavior
- **Files modified:** src/widgets/registry.js
- **Committed in:** 0b14f2c (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added clock/date controls to LayoutPropertiesPanel**
- **Found during:** Task 2 (plan noted to check LayoutPropertiesPanel)
- **Issue:** LayoutPropertiesPanel had widget-specific controls for weather and qr but none for clock/date. Without controls, users in the layout editor would have no way to configure timezone, format, or style.
- **Fix:** Added TIMEZONE_OPTIONS import and full clock/date/clock-date controls matching PropertiesPanel
- **Files modified:** src/components/layout-editor/LayoutPropertiesPanel.jsx
- **Committed in:** 0b14f2c (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both aligned with plan intent. The plan explicitly noted checking LayoutPropertiesPanel for controls. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 56 (Widget Registry + Clock/Date) is now complete
- All CLOCK requirements (CLOCK-01 through CLOCK-06) are satisfied
- The resolveTimezone pattern is established for reuse in future timezone-aware widgets
- Phase 57 (QR Widget Enhancements) can proceed -- registry infrastructure fully operational
- All existing widgets continue to render correctly in all rendering paths

## Self-Check: PASSED

All 7 claimed files verified present. Both commit hashes (b8d3e55, 0b14f2c) confirmed in git log.

---
*Phase: 56-widget-registry-clock-date*
*Completed: 2026-02-14*
