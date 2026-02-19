# Phase 63: Editor Preview Polish + PinEntry Fix - Research

**Researched:** 2026-02-19
**Domain:** Editor widget preview timezone threading, PinEntry import fix
**Confidence:** HIGH

## Summary

Phase 63 addresses three integration gaps identified in the v3.2 Milestone Audit:

1. **CLOCK-06 (Editor Preview Timezone):** The layout editor preview passes `element.timezone` (the element-saved property) to widget components instead of the screen's assigned timezone. The player path is correct (ViewPage passes `content.screen?.timezone` through LayoutRenderer -> ZonePlayer -> widgets), but the editor path through `LayoutElementRenderer.WidgetElement` only sees `element.timezone`, which is typically `'screen'` -- and no actual screen timezone is available to resolve it. The same gap exists in `LivePreviewWindow.PreviewWidget` for scene editor previews.

2. **WTHR-03 (Weather Widget Same Gap):** Identical to CLOCK-06 -- the WeatherWidget in editor preview mode lacks the screen timezone, so `resolveTimezone('screen', undefined)` falls back to browser timezone instead of the target screen's timezone.

3. **PinEntry Tech Debt:** `ViewPage.jsx` uses `<PinEntry>` at line 1112 but never imports it. The barrel export in `src/player/components/index.js` properly exports PinEntry, but the ViewPage import block (lines 1-45) omits it. This causes a runtime ReferenceError crash when kiosk mode exit is triggered via 5-tap sequence.

All three issues are well-isolated, non-architectural fixes with clear file paths and minimal blast radius.

**Primary recommendation:** Thread screen timezone through the editor preview pipeline by adding a `timezone` prop to `LayoutEditorCanvas` and forwarding it through `LayoutElementRenderer` to widget components. Fix the LivePreviewWindow similarly. Add the PinEntry import to ViewPage.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLOCK-06 | Clock/date widgets use screen's assigned timezone instead of browser timezone | Editor preview path identified: `LayoutEditorCanvas` -> `LayoutElementRenderer.WidgetElement` passes `element.timezone` (value: `'screen'`) but no screen timezone available to resolve against. Also `LivePreviewWindow.PreviewWidget` passes no timezone at all. Player path is already correct. |
| WTHR-03 | Weather widget uses screen's timezone for display formatting | Same editor preview gap as CLOCK-06. WeatherWidget's `resolveTimezone('screen', undefined)` falls back to browser timezone in editor context. |
| PinEntry tech debt | PinEntry component properly imported in ViewPage | ViewPage.jsx line 1112 uses `<PinEntry>` but import is missing from lines 1-45. Barrel export exists at `src/player/components/index.js:14`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component rendering | Already in use |
| Intl.DateTimeFormat | Browser built-in | Timezone-aware formatting | Already used by all widget `resolveTimezone` functions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | (project version) | Unit testing | Verify timezone threading and PinEntry import |

### Alternatives Considered
No new libraries needed. This is purely a prop-threading and import fix.

## Architecture Patterns

### Existing Project Structure (Relevant Files)
```
src/
  components/layout-editor/
    LayoutEditorCanvas.jsx       # Layout editor canvas (needs timezone prop)
    LayoutElementRenderer.jsx    # Renders elements including widgets (needs timezone forwarding)
    LayoutPropertiesPanel.jsx    # Already has timezone selector UI
    LayoutPreviewModal.jsx       # Modal preview (needs timezone prop)
  components/scene-editor/
    LivePreviewWindow.jsx        # Scene TV preview (PreviewWidget missing timezone)
  player/
    components/
      PinEntry.jsx               # Component exists, exports correctly
      index.js                   # Barrel exports PinEntry at line 14
      widgets/
        ClockWidget.jsx          # Has resolveTimezone(props.timezone, timezone)
        DateWidget.jsx           # Has resolveTimezone(props.timezone, timezone)
        ClockDateWidget.jsx      # Has resolveTimezone(props.timezone, timezone)
        WeatherWidget.jsx        # Has resolveTimezone(props.timezone, timezone)
    pages/
      ViewPage.jsx               # Uses <PinEntry> at L1112, MISSING import
  widgets/
    registry.js                  # getWidgetComponent() returns widget React components
  pages/
    LayoutEditor/
      YodeckLayoutEditorPage.jsx # Main editor page (sources layout data)
      LayoutPreviewPage.jsx      # Standalone preview page
    SceneEditorPage.jsx          # Uses LivePreviewWindow
```

### Pattern 1: Timezone Resolution Chain (Already Implemented in Player)
**What:** Three-tier timezone resolution: widget override > screen timezone > browser fallback
**When to use:** Every widget component
**Example (already in all 4 widget files):**
```javascript
function resolveTimezone(widgetTimezone, screenTimezone) {
  if (widgetTimezone && widgetTimezone !== 'screen') {
    return widgetTimezone;  // Widget-level explicit override
  }
  if (screenTimezone) {
    return screenTimezone;  // Screen's assigned timezone
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;  // Browser fallback
}
```

### Pattern 2: Timezone Prop Threading (Player Path - Correct)
**What:** Screen timezone passed down through component tree
**Where it works correctly:**
```
ViewPage (content.screen?.timezone)
  -> SceneRenderer (timezone prop)
    -> SceneBlock (timezone prop)
      -> SceneWidgetRenderer (timezone prop)
        -> WidgetComp (timezone prop)
  -> LayoutRenderer (timezone prop)
    -> ZonePlayer (timezone prop)
      -> AppRenderer (timezone prop)
```

### Pattern 3: Editor Path - THE GAP
**What:** Editor canvas does NOT receive or forward screen timezone
**Current (broken):**
```
YodeckLayoutEditorPage
  -> LayoutEditorCanvas (NO timezone prop)
    -> LayoutElementRenderer (element only)
      -> WidgetElement: <WidgetComp props={props} timezone={element.timezone} />
         // element.timezone is typically undefined (not a stored field)
         // Even if set, it would be the widget's own tz setting ('screen'),
         // not the resolved screen timezone
```

**Fix pattern:**
```
YodeckLayoutEditorPage
  -> LayoutEditorCanvas (timezone={previewTimezone})  // NEW PROP
    -> LayoutElementRenderer (element, timezone)       // FORWARD timezone
      -> WidgetElement: <WidgetComp props={props} timezone={timezone} />
                        // Now screen timezone is available for resolveTimezone
```

### Pattern 4: LivePreviewWindow - THE GAP
**What:** Scene editor TV preview does not pass timezone to widget blocks
**Current (broken):**
```
SceneEditorPage
  -> LivePreviewWindow (slides, activeSlideIndex, ...)
    -> PreviewRenderer (design)
      -> PreviewBlock (block)
        -> PreviewWidget: <WidgetComp props={props} />  // NO timezone at all
```

**Fix pattern:**
```
SceneEditorPage
  -> LivePreviewWindow (slides, ..., timezone)   // NEW PROP (optional)
    -> PreviewRenderer (design, timezone)
      -> PreviewBlock (block, timezone)
        -> PreviewWidget: <WidgetComp props={props} timezone={timezone} />
```

### Anti-Patterns to Avoid
- **Shared resolveTimezone module:** Per Phase 56 decision, each widget file has its own `resolveTimezone` copy. Do NOT create a shared module.
- **Modifying widget components:** The widgets already correctly handle the `timezone` prop via `resolveTimezone()`. The fix is in the CALLERS, not the widgets.
- **Adding timezone to element schema:** `element.timezone` is NOT the right place to store screen timezone. Screen timezone should be threaded as a prop from the editor page level, separate from element data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone resolution | Custom timezone lookup | `resolveTimezone()` already in each widget | Already handles 3-tier priority |
| Timezone UI selector | New timezone dropdown | `TIMEZONE_OPTIONS` from locationService + existing `<select>` in LayoutPropertiesPanel | Already implemented |

**Key insight:** All the hard work (widget timezone resolution, Intl.DateTimeFormat usage, timezone selector UI) was done in Phase 56. Phase 63 is purely about threading the missing prop through 2 editor pipelines and fixing 1 import.

## Common Pitfalls

### Pitfall 1: Confusing element.timezone with screen timezone
**What goes wrong:** Treating `element.timezone` as the screen timezone
**Why it happens:** `element.timezone` is a field on the element schema that stores the widget's timezone SETTING (typically `'screen'`). It is NOT the actual screen's IANA timezone value.
**How to avoid:** Thread screen timezone as a separate prop through the editor component tree. The widget's `resolveTimezone(props.timezone, screenTimezone)` handles the rest.
**Warning signs:** Seeing `element.timezone` passed directly as the `timezone` prop to widgets in editor code.

### Pitfall 2: Editor preview timezone value source
**What goes wrong:** Not knowing where to get the screen's timezone in the editor
**Why it happens:** The layout editor edits a layout, not a screen. A layout can be assigned to any screen.
**How to avoid:** Use a "preview timezone" concept. Default to browser timezone (current behavior) but optionally allow the editor to set a preview timezone. The layout is not inherently tied to one screen's timezone.
**Decision needed:** Where does the editor's preview timezone come from? Options: (a) browser timezone as default with optional override, (b) if layout is assigned to a screen, fetch that screen's timezone, (c) simple timezone picker in the preview toolbar.

### Pitfall 3: Missing PinEntry import causing silent failure
**What goes wrong:** `PinEntry` is used as JSX but never imported, causing ReferenceError
**Why it happens:** The import was lost during a refactor (likely Phase 24 player restructure or Phase 29 auto-removed imports)
**How to avoid:** Single-line import fix. Add `import { PinEntry } from '../components/PinEntry.jsx';` to ViewPage.jsx
**Warning signs:** Any `<ComponentName>` usage without a corresponding import at the top of the file.

### Pitfall 4: LivePreviewWindow is used in two modes
**What goes wrong:** Forgetting one of the two LivePreviewWindow usage contexts
**Why it happens:** LivePreviewWindow is used both as "full preview mode" (replacing the editor canvas) and as "side preview panel" (floating overlay). Both need timezone.
**How to avoid:** Thread timezone through the `LivePreviewWindow` component itself so both usages inherit it.

## Code Examples

### Fix 1: Add PinEntry import to ViewPage.jsx
```javascript
// In src/player/pages/ViewPage.jsx, add to existing imports (after line 44):
import { PinEntry } from '../components/PinEntry.jsx';
```

### Fix 2: Thread timezone through LayoutElementRenderer
```javascript
// LayoutElementRenderer.jsx - add timezone prop
export default function LayoutElementRenderer({ element, isPreview = false, timezone }) {
  // ... existing switch
  case 'widget':
    return <WidgetElement element={element} timezone={timezone} />;
  // ...
}

function WidgetElement({ element, timezone }) {
  const { widgetType = 'clock', props = {} } = element;
  const WidgetComp = getWidgetComponent(widgetType);

  if (WidgetComp) {
    // Use screen timezone (from prop), falling back to element-saved timezone
    return <WidgetComp props={props} timezone={timezone} />;
  }
  // ...
}
```

### Fix 3: Thread timezone through LayoutEditorCanvas
```javascript
// LayoutEditorCanvas.jsx - add timezone prop
export default function LayoutEditorCanvas({
  elements = [],
  // ... existing props ...
  timezone,  // NEW: screen timezone for widget preview
}) {
  // ... existing code ...
  // In the elements map:
  <LayoutElementRenderer element={element} isPreview={isPreviewMode} timezone={timezone} />
}
```

### Fix 4: Thread timezone through LivePreviewWindow
```javascript
// LivePreviewWindow.jsx
export default function LivePreviewWindow({
  slides,
  activeSlideIndex,
  // ... existing props ...
  timezone,  // NEW: optional preview timezone
}) {
  // ... pass to PreviewRenderer
}

function PreviewRenderer({ design, _slideIndex, showSafeZone, timezone }) {
  // ... pass to PreviewBlock
}

function PreviewBlock({ block, timezone }) {
  // ... in widget case:
  case 'widget':
    return (
      <div style={baseStyle}>
        <PreviewWidget widgetType={widgetType} props={props} timezone={timezone} />
      </div>
    );
}

function PreviewWidget({ widgetType, props = {}, timezone }) {
  const WidgetComp = getWidgetComponent(widgetType);
  if (WidgetComp) {
    return <WidgetComp props={props} timezone={timezone} />;
  }
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Element-saved timezone only | resolveTimezone(widget, screen) with 3-tier priority | Phase 56 | Widgets already support screen timezone -- just need to receive it |
| Inline widget duplicates in LivePreview | Registry-based rendering via getWidgetComponent | Phase 56 | LivePreviewWindow already uses registry -- just missing timezone prop |

**Deprecated/outdated:**
- None. The widget components and registry are current.

## Open Questions

1. **Editor preview timezone source**
   - What we know: The layout editor operates on a layout, not a screen. Layouts are screen-agnostic.
   - What's unclear: Should the editor fetch the assigned screen's timezone, or just use browser timezone?
   - Recommendation: Use browser timezone as default (preserves current behavior). The layout properties panel already has timezone selector per-widget. The "screen timezone" concept in the editor is primarily about preview fidelity -- not functional correctness (player will always use the real screen timezone). A simple "Preview Timezone" selector in the top toolbar or preview modal would be a nice polish but is not strictly required by the success criteria. The success criteria says "screen's assigned timezone" -- but in the editor there may be no assigned screen. Simplest approach: allow override from editor toolbar, default to browser TZ.

2. **SceneEditorPage timezone source**
   - What we know: Scene editor does not have screen context either. It edits a scene that could be assigned to any screen.
   - What's unclear: Same question as above.
   - Recommendation: Same approach -- browser timezone default, optional override in LivePreviewWindow toolbar.

## Detailed Gap Analysis

### Gap 1: LayoutElementRenderer.WidgetElement (CLOCK-06, WTHR-03)

**File:** `src/components/layout-editor/LayoutElementRenderer.jsx:141-155`

**Current code:**
```javascript
function WidgetElement({ element }) {
  const { widgetType = 'clock', props = {} } = element;
  const WidgetComp = getWidgetComponent(widgetType);
  if (WidgetComp) {
    return <WidgetComp props={props} timezone={element.timezone} />;
  }
  // ...
}
```

**Problem:** `element.timezone` is not a stored field on layout elements. The widget's `props.timezone` is typically `'screen'` (the default from registry). When the widget calls `resolveTimezone('screen', undefined)`, it falls back to browser timezone because no screen timezone was provided as the second argument.

**Fix:** Accept `timezone` as a prop from `LayoutEditorCanvas` and pass it through.

### Gap 2: LivePreviewWindow.PreviewWidget

**File:** `src/components/scene-editor/LivePreviewWindow.jsx:462-485`

**Current code:**
```javascript
function PreviewWidget({ widgetType, props = {} }) {
  const WidgetComp = getWidgetComponent(widgetType);
  if (WidgetComp) {
    return <WidgetComp props={props} />;  // NO timezone prop at all
  }
  // ...
}
```

**Problem:** No `timezone` prop is passed at all. Widget receives `undefined` for both `props.timezone` (if widget uses 'screen' setting from defaults) and `timezone` (screen timezone), resulting in browser timezone fallback.

**Fix:** Thread `timezone` prop through LivePreviewWindow -> PreviewRenderer -> PreviewBlock -> PreviewWidget.

### Gap 3: ViewPage PinEntry Import

**File:** `src/player/pages/ViewPage.jsx:1-45` (imports) and line 1112 (usage)

**Current code (imports section):**
```javascript
import { AppRenderer } from '../components/AppRenderer';
import { SceneRenderer } from '../components/SceneRenderer.jsx';
import { LayoutRenderer } from '../components/LayoutRenderer.jsx';
// NO PinEntry import
```

**Usage at line 1112:**
```jsx
{showPinEntry && (
  <PinEntry
    onValidate={handlePinExit}
    onDismiss={dismissPinEntry}
    onSuccess={() => {}}
  />
)}
```

**Problem:** `PinEntry` is not imported, causing `ReferenceError: PinEntry is not defined` at runtime when `showPinEntry` becomes true (triggered by 5-tap sequence in kiosk mode).

**Fix:** Add `import { PinEntry } from '../components/PinEntry.jsx';` to the imports.

### Files to Modify (Complete List)

| File | Change | Scope |
|------|--------|-------|
| `src/player/pages/ViewPage.jsx` | Add PinEntry import | 1 line |
| `src/components/layout-editor/LayoutElementRenderer.jsx` | Add timezone prop, forward to WidgetElement | ~5 lines changed |
| `src/components/layout-editor/LayoutEditorCanvas.jsx` | Accept timezone prop, pass to LayoutElementRenderer | ~3 lines changed |
| `src/components/layout-editor/LayoutPreviewModal.jsx` | Accept and pass timezone prop | ~2 lines changed |
| `src/pages/LayoutEditor/YodeckLayoutEditorPage.jsx` | Pass timezone to LayoutEditorCanvas | ~1 line changed |
| `src/pages/LayoutEditor/LayoutPreviewPage.jsx` | Pass timezone to LayoutEditorCanvas | ~1 line changed |
| `src/components/scene-editor/LivePreviewWindow.jsx` | Thread timezone through PreviewRenderer -> PreviewBlock -> PreviewWidget | ~10 lines changed |
| `src/pages/SceneEditorPage.jsx` | Pass timezone to LivePreviewWindow (optional) | ~2 lines changed |

**Total estimated changes:** ~25 lines across 8 files. No new files needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis of all listed files (direct file reads)
- v3.2 Milestone Audit report (`.planning/v3.2-MILESTONE-AUDIT.md`)
- Phase 56 prior decisions (provided in phase context)
- Phase 58 prior decisions (provided in phase context)

### Secondary (MEDIUM confidence)
- Widget registry pattern established in Phase 56 (verified via codebase)
- resolveTimezone pattern verified in all 4 widget files

### Tertiary (LOW confidence)
- None. All findings are from direct codebase investigation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, all patterns already established
- Architecture: HIGH - Direct codebase analysis of all affected files, clear prop-threading pattern
- Pitfalls: HIGH - Gaps are well-documented in v3.2 audit with exact file/line references

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable -- affected code is unlikely to change before planning)
