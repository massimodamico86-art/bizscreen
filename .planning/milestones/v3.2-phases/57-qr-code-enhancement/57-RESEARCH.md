# Phase 57: QR Code Enhancement - Research

**Researched:** 2026-02-17
**Domain:** QR code generation, WiFi QR standard, brand logo overlay, React widget architecture
**Confidence:** HIGH

## Summary

Phase 57 enhances the existing QR code widget with multi-type support (URL, WiFi, plain text), brand logo overlay, visual customization, and a critical import bug fix. The codebase already has `qrcode.react` v4.2.0 installed, which natively supports `imageSettings` for logo overlay and all needed error correction levels. The existing widget (`QRCodeWidget.jsx`) is a simple URL-only component with a critical bug: it uses `QRCodeSVG` without importing it, causing crashes on deployed players. The same missing import exists in `EditorCanvas.jsx`.

The widget registry pattern (Phase 56) is already in place, so the enhanced QR widget just needs its component updated, default props extended, and controls added in both the scene editor `PropertiesPanel` and layout editor `LayoutPropertiesPanel`. The existing `qrcodeService.js` already has WiFi string formatting logic (`WIFI:T:WPA;S:SSID;P:password;;`) that can be referenced but the widget will generate strings directly rather than using the async data URL service.

**Primary recommendation:** Fix the `QRCodeSVG` import in `QRCodeWidget.jsx` and `EditorCanvas.jsx` first, then extend the widget with `qrType` prop driving conditional UI and QR value generation, adding `imageSettings` for logo overlay that auto-sets error correction to H.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Live QR preview in BOTH sidebar properties panel AND canvas (real-time as user types)
- Soft validation for URL type: accept any input but show yellow hint if it doesn't look like a valid URL
- Logo source: default to tenant brand logo, allow override with custom upload
- Error correction automatically set to H when logo is enabled
- Encryption types: WPA/WPA2 and Open only (no WEP)
- Custom foreground color via color picker (QR dot color)
- Custom background color via color picker

### Claude's Discretion
- Type picker UI pattern (match existing editor sidebar conventions)
- Default QR type when widget first added
- Logo overlay shape, size behavior, and no-logo fallback UX
- WiFi form details: password toggle, hidden SSID, config summary
- Contrast/scannability warnings
- QR module style options (if library supports it easily)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QR-01 | User can select QR code type (URL, WiFi, plain text) in layout editor sidebar | `qrType` prop with dropdown/segmented control; existing pattern from svg-editor `QR_CODE_TYPES`; controls in both `LayoutPropertiesPanel` and scene-editor `PropertiesPanel` |
| QR-02 | User can configure WiFi QR code with SSID, password, and encryption type | WiFi QR format `WIFI:T:WPA;S:ssid;P:pass;H:true;;` is a standard; existing `qrcodeService.js` has WiFi string builder; widget generates string directly |
| QR-03 | User can set error correction level (L/M/Q/H) on QR code widget | `qrcode.react` v4.2.0 `level` prop supports all 4 levels; already used in existing widget as `errorCorrection` prop |
| QR-04 | User can add brand logo overlay to QR code center (auto-sets error correction to H) | `qrcode.react` v4.2.0 `imageSettings` prop with `src`, `width`, `height`, `excavate`; `useBranding()` hook provides `branding.logoUrl` |
| QR-05 | QR code import bug fixed (QRCodeSVG import added to prevent player crash) | Missing `import { QRCodeSVG } from 'qrcode.react'` in `QRCodeWidget.jsx` and `EditorCanvas.jsx`; confirmed by grep |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | 4.2.0 | QR code rendering as SVG in React | Already installed; provides `QRCodeSVG` with `imageSettings` for logo overlay, `level` for error correction, `fgColor`/`bgColor` for styling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.548.0 | Icons for UI controls | QrCode, Link, Wifi, Type, Eye, EyeOff, AlertTriangle icons |
| qrcode | 1.5.4 | Server-side QR generation (already in use) | Not needed for widget -- used by `qrcodeService.js` for data URL generation in listings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| qrcode.react | react-qrcode-logo | More logo customization (circle, rounded) but adds a dependency; qrcode.react already installed and sufficient |
| Inline WiFi string builder | qrcodeService.js | Service is async/data-URL based; widget needs synchronous string for `QRCodeSVG value` prop |

**Installation:**
```bash
# No new packages needed -- qrcode.react v4.2.0 already installed
```

## Architecture Patterns

### Recommended File Structure
```
src/
├── player/components/widgets/
│   └── QRCodeWidget.jsx          # Enhanced widget (import fix + types + logo)
├── widgets/
│   └── registry.js               # Updated defaultProps for qr entry
├── components/scene-editor/
│   ├── EditorCanvas.jsx           # Fix QRCodeSVG import; update inline QR preview
│   ├── PropertiesPanel.jsx        # Replace inline QR controls with QRCodeWidgetControls
│   └── QRCodeWidgetControls.jsx   # NEW: Extracted QR controls (follows CountdownWidgetControls pattern)
├── components/layout-editor/
│   └── LayoutPropertiesPanel.jsx  # Enhanced QR controls matching scene editor
└── components/layout-editor/
    └── types.js                   # Updated WidgetQRProps typedef
```

### Pattern 1: Extracted Widget Controls Component
**What:** Each complex widget gets its own controls component in the scene-editor directory
**When to use:** When widget controls exceed ~20 lines of JSX (QR will have type picker, conditional WiFi fields, logo toggle, color pickers)
**Example:**
```javascript
// Follows existing pattern from CountdownWidgetControls.jsx
// Source: src/components/scene-editor/CountdownWidgetControls.jsx
export function QRCodeWidgetControls({ props, onPropChange }) {
  const qrType = props.qrType || 'url';
  // ... controls
  return (
    <div className="space-y-3">
      {/* Type picker */}
      {/* Conditional fields based on qrType */}
      {/* Logo toggle */}
      {/* Color pickers */}
    </div>
  );
}
```

### Pattern 2: QR Value Generation (Synchronous)
**What:** Widget generates the QR value string internally based on `qrType` and type-specific props
**When to use:** Always -- QRCodeSVG needs a synchronous string value
**Example:**
```javascript
// Generate QR value based on type
function getQRValue(props) {
  switch (props.qrType) {
    case 'wifi': {
      const hidden = props.wifiHidden ? 'H:true;' : '';
      return `WIFI:T:${props.wifiEncryption || 'WPA'};S:${props.wifiSsid || ''};P:${props.wifiPassword || ''};${hidden};`;
    }
    case 'text':
      return props.textContent || '';
    case 'url':
    default:
      return props.url || '';
  }
}
```

### Pattern 3: Logo Overlay with imageSettings
**What:** Use qrcode.react's built-in `imageSettings` prop for logo overlay
**When to use:** When `props.logoEnabled` is true
**Example:**
```javascript
// Source: qrcode.react v4.2.0 TypeScript definitions (node_modules/qrcode.react/lib/index.d.ts)
<QRCodeSVG
  value={qrValue}
  size={256}
  level="H"  // Auto-set to H when logo enabled
  fgColor={props.qrFgColor}
  bgColor={props.qrBgColor}
  imageSettings={props.logoEnabled ? {
    src: props.logoUrl || brandingLogoUrl,
    height: 40,
    width: 40,
    excavate: true,
  } : undefined}
/>
```

### Pattern 4: Dual-Context Controls (Scene Editor + Layout Editor)
**What:** QR controls must appear in both `PropertiesPanel.jsx` (scene editor) and `LayoutPropertiesPanel.jsx` (layout editor)
**When to use:** Both editors share widget type controls for the `qr` widget type
**Example:**
```javascript
// In scene-editor PropertiesPanel.jsx:
import { QRCodeWidgetControls } from './QRCodeWidgetControls.jsx';
// ...
{widgetType === 'qr' && (
  <QRCodeWidgetControls props={props} onPropChange={handlePropChange} />
)}

// In layout-editor LayoutPropertiesPanel.jsx:
import { QRCodeWidgetControls } from '../scene-editor/QRCodeWidgetControls.jsx';
// ... (same usage)
```

### Anti-Patterns to Avoid
- **Duplicating QR controls inline in both editors:** Extract to shared `QRCodeWidgetControls.jsx` and import in both places
- **Using qrcodeService.js for widget rendering:** That service generates data URLs asynchronously; the widget needs synchronous `QRCodeSVG` rendering
- **Not adding import to QRCodeWidget.jsx:** This is the root cause of the player crash (QR-05); must be the first fix
- **Re-implementing QR preview in EditorCanvas.jsx switch case:** The EditorCanvas currently has inline QR rendering in its widget switch. After fixing the import, consider whether to keep inline preview or delegate to the widget component via registry

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code SVG generation | Custom SVG path generation | `QRCodeSVG` from qrcode.react | Error correction math, module placement, masking patterns are complex |
| Logo overlay positioning | Manual SVG image overlay | `imageSettings` prop on `QRCodeSVG` | Handles excavation (clearing modules behind logo), centering, opacity |
| WiFi QR string format | Custom string builder from scratch | Standard format `WIFI:T:WPA;S:name;P:pass;H:true;;` | Well-documented standard; existing reference in `qrcodeService.js` |
| Color contrast checking | Custom luminance calculation | Simple relative luminance formula (3 lines) | No need for a library; just compute relative luminance and warn below 3:1 ratio |

**Key insight:** The `qrcode.react` library already does the hard work. This phase is primarily about UI controls and prop wiring, not QR generation logic.

## Common Pitfalls

### Pitfall 1: Missing QRCodeSVG Import (THE BUG)
**What goes wrong:** QR code widget crashes on player with `ReferenceError: QRCodeSVG is not defined`
**Why it happens:** `QRCodeWidget.jsx` uses `QRCodeSVG` at line 75 but has no import statement. Same issue in `EditorCanvas.jsx` at line 534.
**How to avoid:** Add `import { QRCodeSVG } from 'qrcode.react';` to both files
**Warning signs:** Works in dev if another module happens to import it first; fails on player where tree-shaking removes unused imports

### Pitfall 2: Error Correction Not Auto-Set to H with Logo
**What goes wrong:** QR code with logo overlay becomes unscannable because error correction is too low
**Why it happens:** Logo covers QR modules; without H-level error correction (30% recovery), the QR becomes unreadable
**How to avoid:** When `logoEnabled` is true, override `errorCorrection` to `'H'` regardless of user selection; show disabled state on error correction selector
**Warning signs:** QR looks fine visually but phone cameras fail to scan it

### Pitfall 3: WiFi Password with Special Characters
**What goes wrong:** WiFi QR code fails to parse on mobile devices
**Why it happens:** Special characters in SSID or password (`\`, `;`, `:`, `"`, `,`) must be escaped per the MECARD-like format
**How to avoid:** Escape special characters: `\` -> `\\`, `;` -> `\;`, `:` -> `\:`, `"` -> `\"`, `,` -> `\,`
**Warning signs:** WiFi QR works for simple passwords but fails for passwords containing semicolons or backslashes

### Pitfall 4: Logo Image CORS Issues
**What goes wrong:** Logo image fails to load in QRCodeSVG due to cross-origin restrictions
**Why it happens:** Brand logo URLs are on Cloudinary CDN; SVG `<image>` element may need crossOrigin setting
**How to avoid:** Set `imageSettings.crossOrigin: 'anonymous'` when using external URLs
**Warning signs:** Logo appears as broken image or doesn't show at all on some browsers

### Pitfall 5: Low Contrast QR Codes
**What goes wrong:** User picks foreground and background colors too similar; QR becomes unscannable
**Why it happens:** No validation on color contrast between fgColor and bgColor
**How to avoid:** Calculate relative luminance contrast ratio; show yellow warning when ratio < 3:1
**Warning signs:** QR looks stylish but phone cameras can't detect it

### Pitfall 6: Stale Props After Type Change
**What goes wrong:** WiFi-specific props (wifiSsid, wifiPassword) persist when switching to URL type
**Why it happens:** `handleTypeChange` in WidgetControls resets to defaults, but QR type change within the same widget type doesn't trigger full reset
**How to avoid:** When `qrType` changes, clear type-specific props but preserve shared props (colors, error correction, logo settings)
**Warning signs:** Switching from WiFi to URL shows old WiFi SSID encoded in URL-type QR code

## Code Examples

Verified patterns from installed packages and existing codebase:

### QRCodeSVG with All Props (from qrcode.react v4.2.0 types)
```javascript
// Source: node_modules/qrcode.react/lib/index.d.ts
import { QRCodeSVG } from 'qrcode.react';

<QRCodeSVG
  value="https://example.com"       // string | string[] (required)
  size={256}                          // number (default: 128)
  level="H"                          // 'L' | 'M' | 'Q' | 'H' (default: 'L')
  bgColor="#ffffff"                   // string (default: '#FFFFFF')
  fgColor="#000000"                   // string (default: '#000000')
  marginSize={0}                      // number (default: 0)
  title="QR Code"                     // string (accessibility)
  minVersion={1}                      // 1-40
  boostLevel={true}                   // boolean (default: true)
  imageSettings={{                    // ImageSettings | undefined
    src: "https://logo.png",
    height: 40,
    width: 40,
    excavate: true,                   // Clear modules behind image
    x: undefined,                     // Center by default
    y: undefined,
    opacity: 1,                       // 0-1
    crossOrigin: 'anonymous',
  }}
  style={{ width: '100%', height: '100%' }}
/>
```

### WiFi QR String Format (standard)
```javascript
// Source: WiFi QR code specification (MECARD-like format)
// Format: WIFI:T:<encryption>;S:<ssid>;P:<password>;H:<hidden>;;

// WPA/WPA2 example
const wifiString = `WIFI:T:WPA;S:MyNetwork;P:myPassword123;;`;

// Open network (no password)
const openString = `WIFI:T:nopass;S:FreeWiFi;;;`;

// Hidden network with WPA
const hiddenString = `WIFI:T:WPA;S:HiddenNet;P:secret;H:true;;`;

// Special character escaping
function escapeWifiField(str) {
  return str.replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/:/g, '\\:')
            .replace(/"/g, '\\"')
            .replace(/,/g, '\\,');
}
```

### Widget Controls Pattern (from CountdownWidgetControls.jsx)
```javascript
// Source: src/components/scene-editor/CountdownWidgetControls.jsx
export function QRCodeWidgetControls({ props, onPropChange }) {
  return (
    <div className="space-y-3">
      {/* Segmented control or dropdown for qrType */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <QrCode className="w-3 h-3 inline mr-1" />
          QR Type
        </label>
        {/* Controls... */}
      </div>
    </div>
  );
}
```

### Branding Logo Access (from BrandingContext)
```javascript
// Source: src/contexts/BrandingContext.jsx
import { useBranding } from '../../contexts/BrandingContext.jsx';

// In widget controls:
const { branding } = useBranding();
const defaultLogoUrl = branding?.logoUrl; // null if not configured
```

### Existing QR Widget Props Structure (current registry)
```javascript
// Source: src/widgets/registry.js (current)
qr: {
  component: QRCodeWidget,
  icon: QrCode,
  label: 'QR Code',
  defaultProps: {
    url: '',
    label: '',
    fgColor: '#000000',
    bgColor: '#ffffff',
    cornerRadius: 8,
    textColor: '#ffffff',
  },
},
```

### Proposed Extended DefaultProps
```javascript
// Enhanced default props
qr: {
  component: QRCodeWidget,
  icon: QrCode,
  label: 'QR Code',
  defaultProps: {
    qrType: 'url',           // 'url' | 'wifi' | 'text'
    // URL type
    url: '',
    // WiFi type
    wifiSsid: '',
    wifiPassword: '',
    wifiEncryption: 'WPA',    // 'WPA' | 'nopass'
    wifiHidden: false,
    // Text type
    textContent: '',
    // Display
    label: '',
    cornerRadius: 8,
    textColor: '#ffffff',
    // QR styling
    qrFgColor: '#000000',
    qrBgColor: '#ffffff',
    errorCorrection: 'M',     // 'L' | 'M' | 'Q' | 'H'
    // Logo
    logoEnabled: false,
    logoUrl: '',              // Empty = use tenant brand logo
    // Scale
    qrScale: 1.0,
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `includeMargin` boolean | `marginSize` number | qrcode.react 4.x | `includeMargin` deprecated; use `marginSize` instead |
| Canvas-only rendering | SVG + Canvas options | qrcode.react 3.x | `QRCodeSVG` is preferred for layout editor; scales cleanly |
| No `imageSettings.opacity` | Opacity support added | qrcode.react 4.x | Can fade logo for subtler overlay effect |
| No `crossOrigin` in imageSettings | `crossOrigin` option added | qrcode.react 4.x | Important for external logo URLs (Cloudinary) |

**Deprecated/outdated:**
- `includeMargin` prop: Use `marginSize` instead (qrcode.react v4)

## Discretion Recommendations

### QR Type Picker: Segmented Control
**Recommendation:** Use a 3-button segmented control (URL | WiFi | Text) matching the existing time format toggle pattern (12h/24h buttons in clock controls).
**Rationale:** The svg-editor uses a 4x3 icon grid for 12 QR types, but this phase only has 3 types. A segmented control is cleaner and matches existing editor patterns.

### Default QR Type: URL
**Recommendation:** Default to `'url'` when widget is first added.
**Rationale:** URL is the most common QR use case; it matches the current behavior (existing widget only supports URL).

### Logo Overlay Shape & Size
**Recommendation:** Square with 4px border-radius, fixed size at ~15% of QR code size (approximately 40x40px in a 256px QR), with `excavate: true`.
**Rationale:** The `imageSettings` in qrcode.react doesn't support circle clipping natively. A slight border-radius gives a modern look without requiring SVG clip-path hacking. Fixed size keeps it simple and avoids scannability issues from oversized logos.

### No-Logo Fallback UX
**Recommendation:** When logo is enabled but tenant has no brand logo configured, show an info message: "No brand logo configured. Upload one in Branding Settings, or upload a custom logo below." with a file upload button.
**Rationale:** Graceful degradation; user isn't blocked from using the feature.

### WiFi Password Toggle
**Recommendation:** Include an eye/eye-off toggle on the password field (standard pattern).
**Rationale:** Users need to verify passwords before generating QR codes; hiding by default maintains security.

### WiFi Hidden SSID
**Recommendation:** Include as a checkbox: "Hidden network". Adds `H:true;` to the WiFi string.
**Rationale:** Low effort to implement; useful for enterprise deployments; part of the WiFi QR standard.

### WiFi Config Summary
**Recommendation:** Show a small human-readable summary below the WiFi fields: "Network: MySSID | WPA | Password set"
**Rationale:** Quick visual confirmation before looking at the QR preview.

### Contrast Warning
**Recommendation:** Calculate relative luminance of fgColor and bgColor. If contrast ratio < 3:1, show a yellow warning: "Low contrast may affect scannability". Non-blocking (matches the "soft validation" pattern from URL validation).
**Rationale:** QR scanners need adequate contrast. Warning is informational, not blocking.

### QR Module Style
**Recommendation:** Skip QR module style options (classic vs rounded vs dots) for this phase.
**Rationale:** `qrcode.react` v4.2.0 does not support dot/rounded module styles natively. Implementing custom module rendering would require overriding the SVG output, which is complex and fragile. Can be considered in a future phase if react-qrcode-logo is adopted.

## Open Questions

1. **EditorCanvas inline QR rendering**
   - What we know: `EditorCanvas.jsx` has an inline switch case for `'qr'` widget type (lines 504-561) that renders its own QR preview, separate from the `QRCodeWidget` component. It also uses `QRCodeSVG` without importing it.
   - What's unclear: Should we refactor EditorCanvas to use the widget component from registry (like `LayoutElementRenderer` does), or keep the inline preview but fix the import?
   - Recommendation: Fix the import. Keep inline preview for now since EditorCanvas has inline rendering for all widget types (clock, date, weather, etc.) -- refactoring to use registry would be a larger scope change. Update the inline preview to support new props (qrType, WiFi, logo).

2. **Logo URL in player context**
   - What we know: The player renders widgets via `SceneRenderer` -> `getWidgetComponent` -> `QRCodeWidget`. The `useBranding()` hook requires `BrandingProvider` in the component tree.
   - What's unclear: Is `BrandingProvider` available in the player's component tree?
   - Recommendation: Pass `logoUrl` as a widget prop (stored in the layout/scene data) rather than fetching it at render time in the player. The editor resolves the brand logo URL and saves it as a prop. This avoids player-side API calls and works offline.

3. **Registry `defaultProps` naming inconsistency**
   - What we know: Current registry uses `fgColor`/`bgColor` but widget uses `qrFgColor`/`qrBgColor`.
   - What's unclear: Which naming should be canonical?
   - Recommendation: Use `qrFgColor`/`qrBgColor` consistently in both registry and widget to avoid confusion with text/element colors.

## Sources

### Primary (HIGH confidence)
- `node_modules/qrcode.react/lib/index.d.ts` - Full TypeScript definitions for QRCodeSVG, QRProps, ImageSettings, ErrorCorrectionLevel (v4.2.0)
- `src/player/components/widgets/QRCodeWidget.jsx` - Current widget implementation (missing import confirmed)
- `src/components/scene-editor/EditorCanvas.jsx` - Inline QR rendering (missing import confirmed at line 534)
- `src/widgets/registry.js` - Widget registry with current QR defaultProps
- `src/services/qrcodeService.js` - WiFi QR string format reference
- `src/contexts/BrandingContext.jsx` - Brand logo access via `useBranding()` hook
- `src/components/scene-editor/CountdownWidgetControls.jsx` - Pattern for extracted widget controls

### Secondary (MEDIUM confidence)
- [qrcode.react npm package](https://www.npmjs.com/package/qrcode.react) - API documentation and imageSettings details
- [qrcode.react GitHub README](https://github.com/zpao/qrcode.react/blob/trunk/README.md) - Official documentation
- WiFi QR code format specification - Standard MECARD-like format with T, S, P, H fields

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - qrcode.react v4.2.0 types verified directly from node_modules
- Architecture: HIGH - Existing widget registry pattern, controls pattern, and file structure verified from codebase
- Pitfalls: HIGH - Import bug confirmed via grep; WiFi escaping and CORS issues from documented standards
- Discretion recommendations: MEDIUM - Based on codebase pattern analysis and library capability assessment

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable domain; qrcode.react unlikely to change significantly)
