# Phase 61: Portrait Mode - Research

**Researched:** 2026-02-18
**Domain:** Screen orientation management, CSS rotation, layout editor canvas, template system
**Confidence:** HIGH

## Summary

Portrait mode for BizScreen requires five coordinated changes: (1) storing a screen's orientation in the `tv_devices` table and exposing it in the EditScreenModal, (2) ensuring the layout editor correctly uses the existing portrait canvas support, (3) having the player apply CSS rotation when content orientation does not match device hardware orientation, (4) seeding at least 3 portrait-specific layout templates in the template marketplace, and (5) showing orientation mismatch warnings when scheduling or assigning portrait content to landscape screens and vice versa.

The codebase already has significant portrait infrastructure in place. The `CreateLayoutModal` has a `portrait-hd` preset (1080x1920), the `YodeckLayoutEditorPage` already handles `canvasSize` with portrait detection, the `YODECK_ORIENTATIONS` config includes `9:16` and `3:4` portrait presets, the `ASPECT_RATIOS` type includes `9:16`, and the template system already stores orientation metadata and has orientation filtering in the sidebar. The main gaps are: (a) `tv_devices` has no `orientation` column, (b) the player has no CSS rotation logic, (c) no portrait templates are seeded in the layout_templates gallery (only in content_templates), and (d) no mismatch warnings exist anywhere.

**Primary recommendation:** Add an `orientation` column to `tv_devices`, wire it through the screen settings UI, add CSS rotation in the player's ViewPage wrapper, seed portrait layout templates, and add mismatch warning checks in the schedule editor and screen assignment flows.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | existing | UI rendering | Already in use |
| Supabase | existing | Database, RPC | Already in use |
| Tailwind CSS | existing | Styling, responsive layout | Already in use |
| Lucide React | existing | Icons (Monitor, Smartphone) | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `transform: rotate(90deg)` | native | Player rotation for mismatched orientations | When content orientation differs from device |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS rotation | Canvas-based rotation | CSS rotation is simpler, works for all content types (video, iframes, images); canvas would require re-rendering |
| Per-device orientation column | Orientation on layout only | Need per-device because the same layout could be assigned to both portrait and landscape screens |

## Architecture Patterns

### Recommended Approach

No new files are strictly needed. Changes span across existing layers:

```
supabase/migrations/
  147_portrait_mode.sql               # Add orientation to tv_devices, seed portrait templates

src/services/
  screenService.js                    # Add 'orientation' to allowedFields

src/pages/components/
  ScreensComponents.jsx               # Add orientation selector to EditScreenModal

src/player/pages/
  ViewPage.jsx                        # Add CSS rotation wrapper when orientation mismatches

src/components/schedules/             # Mismatch warning component
  OrientationMismatchWarning.jsx      # NEW: reusable warning banner

src/pages/
  ScheduleEditorPage.jsx              # Show mismatch warning
```

### Pattern 1: Screen Orientation Storage

**What:** Store orientation as an enum on `tv_devices` with values `'landscape'` (default) and `'portrait'`.

**When to use:** Any time a screen's physical mounting is set by the user.

**Example:**
```sql
-- Migration
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS orientation TEXT DEFAULT 'landscape'
CHECK (orientation IN ('landscape', 'portrait'));

COMMENT ON COLUMN public.tv_devices.orientation IS 'Physical mounting orientation of the screen';
```

```javascript
// screenService.js - add to allowedFields
const allowedFields = [
  'device_name', 'assigned_playlist_id', 'assigned_layout_id',
  'assigned_schedule_id', 'screen_group_id', 'location_id',
  'latitude', 'longitude', 'timezone', 'display_language',
  'orientation'  // NEW
];
```

### Pattern 2: CSS Rotation in Player

**What:** When the player detects content orientation differs from device hardware orientation, wrap the entire content container in a CSS transform that rotates 90 degrees and swaps width/height.

**When to use:** In `ViewPage.jsx` when rendering content.

**Example:**
```javascript
// Determine if rotation is needed
const deviceOrientation = content?.screen?.orientation || 'landscape';
const contentOrientation = content?.layout?.aspect_ratio === '9:16' ? 'portrait' : 'landscape';
const needsRotation = deviceOrientation !== contentOrientation;

// Rotation wrapper style
const rotationStyle = needsRotation ? {
  transform: 'rotate(90deg)',
  transformOrigin: 'center center',
  width: '100vh',
  height: '100vw',
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginTop: '-50vw',
  marginLeft: '-50vh',
} : {};
```

### Pattern 3: Orientation Mismatch Warning

**What:** A reusable warning banner that appears when portrait content is being scheduled/assigned to a landscape screen (or vice versa).

**When to use:** In ScheduleEditorPage, EditScreenModal, and content assignment flows.

**Example:**
```jsx
// OrientationMismatchWarning.jsx
<Alert variant="warning">
  <AlertTriangle size={16} />
  <span>
    This {contentType} is designed for <strong>{contentOrientation}</strong> screens,
    but this screen is set to <strong>{screenOrientation}</strong>.
    Content will be rotated automatically, but may not look optimal.
  </span>
</Alert>
```

### Pattern 4: Portrait Template Seeding

**What:** Seed at least 3 portrait-oriented layout templates in the `layout_templates` table (the gallery used by CreateLayoutModal's "Browse Templates" flow).

**When to use:** Migration, seeded once.

**Note:** The `content_templates` table (migration 091) already has ~28 portrait templates seeded, but these are for the scene/marketplace system. The `layout_templates` table (used by the layout editor's template gallery) needs its own portrait entries.

### Anti-Patterns to Avoid
- **Auto-detecting orientation from device:** Don't try to detect physical orientation via JavaScript screen API. Users set this manually because TVs mounted in portrait mode still report landscape to the browser.
- **Storing orientation on layouts only:** A layout's aspect ratio determines its design orientation, but the DEVICE orientation is what determines if CSS rotation is needed. These are separate concerns.
- **Rotating individual elements:** Don't rotate individual layout zones or media items. Rotate the entire content wrapper at the player level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Aspect ratio detection | Custom parser | Compare width/height from `canvasSize` or `aspect_ratio` | Already stored in layouts table |
| Orientation presets | New config | `YODECK_ORIENTATIONS` from `yodeckTheme.js` | Already has portrait presets |
| Template orientation filtering | New filter logic | Existing `TemplateSidebar` orientation filter | Already supports landscape/portrait toggle |
| Canvas aspect switching | New canvas component | Existing `LayoutEditorCanvas` with `canvasSize` prop | Already handles any aspect ratio |

**Key insight:** Most portrait canvas support already exists. The primary gaps are in the device settings layer, player rotation layer, and the mismatch warning UX.

## Common Pitfalls

### Pitfall 1: CSS Rotation Dimension Swap
**What goes wrong:** When rotating content 90 degrees with CSS transform, the element still occupies its original bounding box. A 1920x1080 element rotated 90deg appears as a 1080px-wide area in a 1920px-wide viewport, leaving black bars.
**Why it happens:** CSS transforms don't affect the layout flow or computed dimensions.
**How to avoid:** When rotating, swap the width/height of the container to 100vh/100vw (swapped), and center it using negative margins or translate. The transform-origin must be `center center`.
**Warning signs:** Black bars appearing around rotated content, content appearing clipped or offset.

### Pitfall 2: Video and iFrame Rotation
**What goes wrong:** Videos and iframes inside a rotated container may have touch/interaction issues on touch-screen displays.
**Why it happens:** Touch coordinates are not automatically transformed by CSS rotation.
**How to avoid:** For digital signage (non-interactive), this is acceptable. If interactive content is needed, consider using the `will-change: transform` CSS hint and testing on target hardware.
**Warning signs:** Interactive widgets in layouts not responding to touch in rotated mode.

### Pitfall 3: Orientation Column vs Layout Aspect Ratio
**What goes wrong:** Confusing device orientation (how the TV is mounted) with content orientation (how the layout is designed).
**Why it happens:** Both use "orientation" language but represent different things.
**How to avoid:** Device orientation is stored on `tv_devices.orientation`. Content orientation is derived from the layout's `aspect_ratio` or `canvasSize` (width vs height comparison). Always compare both to determine if rotation is needed.
**Warning signs:** All portrait content being rotated even when playing on portrait-mounted screens.

### Pitfall 4: Player Content Resolution Missing Orientation
**What goes wrong:** The `get_resolved_player_content` RPC doesn't return the device's orientation, so the player can't determine if rotation is needed.
**Why it happens:** The RPC was written before orientation was a concept.
**How to avoid:** Update the `get_resolved_player_content` RPC to include `tv_devices.orientation` in the returned `screen` object.
**Warning signs:** Player always showing content in its native orientation regardless of device setting.

### Pitfall 5: Template Marketplace Portrait Templates Already Exist
**What goes wrong:** Creating duplicate portrait templates when content_templates already has ~28 portrait entries.
**Why it happens:** There are TWO template systems: `content_templates` (marketplace/scene templates) and `layout_templates` (layout editor gallery templates). They serve different flows.
**How to avoid:** Check which table needs portrait entries. The `content_templates` table already has portrait entries (migration 091). The `layout_templates` table may or may not have portrait entries. Only seed what's missing.
**Warning signs:** Duplicate templates appearing in different parts of the UI.

## Code Examples

### Existing Portrait Canvas Support (verified in codebase)

```javascript
// src/config/yodeckTheme.js - YODECK_ORIENTATIONS already includes portrait
{ id: '9:16', label: '9:16 (1080 x 1920)', width: 1080, height: 1920 },
{ id: '3:4', label: '3:4 (1080 x 1440)', width: 1080, height: 1440 },
```

```javascript
// src/design-system/components/CreateLayoutModal.jsx - Already has portrait preset
{
  id: 'portrait-hd',
  name: 'Portrait HD',
  width: 1080,
  height: 1920,
  icon: Smartphone,
  description: '1080 x 1920',
  popular: true,
}
```

```javascript
// src/components/layout-editor/types.js - Already has 9:16 aspect ratio
export const ASPECT_RATIOS = {
  '16:9': { width: 16, height: 9, label: '16:9 (Landscape)' },
  '9:16': { width: 9, height: 16, label: '9:16 (Portrait)' },
  '4:3': { width: 4, height: 3, label: '4:3 (Standard)' },
  '1:1': { width: 1, height: 1, label: '1:1 (Square)' },
};
```

### Layout Editor Canvas (already handles portrait)

```javascript
// src/components/layout-editor/LayoutEditorCanvas.jsx
// Canvas already renders at any aspect ratio using canvasSize prop
const aspectRatio = canvasSize.width / canvasSize.height;
// ...
style={{
  aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
}}
```

### useLayout Hook (already persists aspect_ratio)

```javascript
// src/hooks/useLayout.js
function serializeLayoutForDB(editorLayout) {
  return {
    aspect_ratio: editorLayout.aspectRatio || '16:9',
    data: { elements: editorLayout.elements || [] },
    // ...
  };
}
```

### Existing Screen EditScreenModal (where orientation selector goes)

```javascript
// src/pages/components/ScreensComponents.jsx - EditScreenModal
// Currently has: name, location, group, language, playlist, layout
// Orientation selector should be added after display language field
```

### Template Sidebar (already has orientation filter)

```javascript
// src/components/templates/TemplateSidebar.jsx
// Already supports 'landscape' and 'portrait' orientation filtering
selectedOrientation: PropTypes.oneOf(['landscape', 'portrait', null]),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No orientation concept | Layouts have aspect_ratio column | Migration 084 | Layouts can be 16:9, 9:16, 4:3, 1:1 |
| Single layout template table | Two template systems (content_templates + layout_templates) | Migrations 085/091 | Portrait templates exist in content_templates but not layout_templates |
| Fixed 16:9 canvas | Dynamic canvas with YODECK_ORIENTATIONS | YodeckLayoutEditorPage | Editor already supports portrait canvas |

**Already in place:**
- Layout editor canvas supports portrait (9:16) canvasSize
- CreateLayoutModal has portrait-hd preset
- layouts table has `aspect_ratio` column
- layout_templates table has `orientation` column
- Template sidebar has orientation filter (landscape/portrait)
- ~28 portrait content_templates already seeded

**Not yet in place:**
- `tv_devices` has no `orientation` column
- `screenService.js` doesn't allow orientation updates
- EditScreenModal has no orientation selector
- Player (`ViewPage.jsx`) has no rotation logic
- `get_resolved_player_content` RPC doesn't return device orientation
- No orientation mismatch warnings in scheduling/assignment UIs
- `layout_templates` gallery may lack portrait entries

## Open Questions

1. **Content orientation for playlists**
   - What we know: Layouts have an `aspect_ratio` field that determines orientation. Playlists do not have an orientation field.
   - What's unclear: When a playlist (not a layout) is assigned to a portrait screen, should it be rotated? Playlists are just sequences of media items without inherent orientation.
   - Recommendation: For now, only apply rotation logic to layouts (which have explicit aspect ratios). Playlist items render fullscreen and can use `object-fit: contain` which works in both orientations. Consider adding playlist orientation in a future phase.

2. **Screen group default orientation**
   - What we know: Screen groups exist and inherit some settings (like language via migration 135).
   - What's unclear: Should screen groups have a default orientation that devices inherit?
   - Recommendation: Defer group-level orientation to a future phase. Per-device orientation is the MVP. The pattern from language inheritance (migration 135) can be replicated later if needed.

3. **Layout templates vs content templates for portrait**
   - What we know: `content_templates` (scene marketplace) already has ~28 portrait templates. `layout_templates` (layout editor gallery) needs checking for portrait entries.
   - What's unclear: Whether the success criteria "3 portrait-oriented templates available in the template marketplace" refers to layout_templates or content_templates.
   - Recommendation: Ensure at least 3 portrait entries exist in BOTH template tables. The content_templates already have them; focus seeding effort on layout_templates if they lack portrait entries.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PORT-01 | User can set screen orientation (landscape/portrait) per device in screen settings | Add `orientation` column to `tv_devices` table; add to `allowedFields` in screenService.js; add orientation selector to EditScreenModal in ScreensComponents.jsx; update `get_resolved_player_content` RPC to return orientation |
| PORT-02 | Layout editor supports portrait canvas (9:16 aspect ratio) for content design | **Already mostly supported.** CreateLayoutModal has portrait-hd preset, LayoutEditorCanvas handles canvasSize dynamically, YODECK_ORIENTATIONS includes 9:16/3:4, layouts table has aspect_ratio column. May need minor polish to ensure portrait UX is smooth. |
| PORT-03 | Player applies CSS rotation when content orientation differs from device hardware orientation | Add rotation wrapper in ViewPage.jsx; compare device orientation (from screen data) with content orientation (from layout aspect_ratio); apply CSS transform: rotate(90deg) with swapped width/height when mismatched |
| PORT-04 | At least 3 portrait-oriented templates available in template marketplace | Seed portrait entries in `layout_templates` table; content_templates already has ~28 portrait entries from migration 091. Ensure layout gallery has portrait-specific entries. |
| PORT-05 | Orientation mismatch warning shown when scheduling portrait content to landscape screens (and vice versa) | Add warning component in schedule editor and screen assignment flows; compare layout aspect_ratio with screen orientation; show Alert banner using existing design system Alert component |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `src/services/screenService.js` - tv_devices CRUD, allowedFields
- Codebase analysis of `src/pages/components/ScreensComponents.jsx` - EditScreenModal structure
- Codebase analysis of `src/components/layout-editor/LayoutEditorCanvas.jsx` - Canvas aspect ratio handling
- Codebase analysis of `src/pages/LayoutEditor/YodeckLayoutEditorPage.jsx` - Orientation/canvasSize state
- Codebase analysis of `src/config/yodeckTheme.js` - YODECK_ORIENTATIONS with portrait presets
- Codebase analysis of `src/design-system/components/CreateLayoutModal.jsx` - Portrait HD preset
- Codebase analysis of `src/components/layout-editor/types.js` - ASPECT_RATIOS with 9:16
- Codebase analysis of `src/player/pages/ViewPage.jsx` - Player rendering architecture
- Codebase analysis of `src/player/components/LayoutRenderer.jsx` - Layout zone rendering
- Codebase analysis of `src/hooks/useLayout.js` - DB serialization with aspect_ratio
- Codebase analysis of `src/services/layoutTemplateService.js` - Template orientation mapping
- Codebase analysis of `src/services/templateService.js` - Template formatting with orientation
- Codebase analysis of `src/components/templates/TemplateSidebar.jsx` - Orientation filter UI
- Codebase analysis of `src/widgets/registry.js` - Widget registry (Phase 56 dependency)
- Database migrations: 001, 014, 084, 085, 086, 091 - Schema evolution for tv_devices and layouts

### Secondary (MEDIUM confidence)
- CSS transform rotation techniques for digital signage - well-documented standard approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all infrastructure exists
- Architecture: HIGH - Patterns follow existing codebase conventions (migration + service + UI)
- Pitfalls: HIGH - CSS rotation pitfalls are well-known; template system complexity verified by reading both template tables
- Existing infrastructure: HIGH - Verified portrait support exists in editor, presets, and types by reading actual source files

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable domain, no external dependencies)
