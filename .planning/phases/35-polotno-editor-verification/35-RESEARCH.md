# Phase 35: Polotno Editor Verification - Research

**Researched:** 2026-01-31
**Domain:** Iframe postMessage communication, React modal patterns, error handling
**Confidence:** HIGH

## Summary

Phase 35 hardens the Polotno editor integration for onboarding users. The existing implementation in `PolotnoEditor.jsx` uses a same-origin iframe (`/polotno/index.html`) with postMessage communication. The editor is bundled separately with React 18 (isolated from the main app's React 19) and served from the `public/polotno/` directory.

The current implementation has:
- A 30-second timeout (CONTEXT.md specifies 10 seconds - change needed)
- Basic error state UI
- postMessage communication with `event.data?.source === 'polotno-editor'` validation
- No origin validation (uses `'*'` for postMessage target)
- No unsaved changes detection
- No modal overlay (currently full-page)

**Primary recommendation:** Convert to modal overlay, reduce timeout to 10 seconds, add confirm dialog for unsaved changes, and implement the Design Studio fallback path.

## Standard Stack

### Core (Already In Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x (app) / 18.x (editor) | UI framework | Existing stack |
| Polotno | ^2.10.0 | Design editor | Already integrated |
| Framer Motion | existing | Modal animations | Design system uses |
| Tailwind CSS | existing | Styling | Project standard |
| lucide-react | existing | Icons | Project standard |

### Supporting (Already In Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| canvas-confetti | existing | Celebration animation | Success feedback |

### No New Dependencies Required
The phase scope explicitly states this is about reliability and UX polish, not new features. All required functionality can be achieved with existing dependencies.

## Architecture Patterns

### Current File Structure
```
src/
├── components/
│   └── PolotnoEditor.jsx       # Parent component (main app React 19)
├── pages/
│   └── DesignEditorPage.jsx    # Current full-page wrapper
│   └── LayoutsPage.jsx         # Template gallery → editor entry point
├── design-system/
│   └── components/
│       └── Modal.jsx           # Design system modal with animation
scripts/
└── polotno-build/
    └── src/
        └── main.jsx            # Iframe editor (React 18)
public/
└── polotno/
    └── index.html              # Built editor HTML
    └── polotno-editor.js       # Built editor JS
```

### Pattern 1: Modal Overlay for Editor
**What:** Wrap Polotno iframe in design system Modal component
**When to use:** Decision locked in CONTEXT.md: "Editor opens in modal overlay"
**Example:**
```jsx
// Source: Existing Modal.jsx pattern
<Modal open={isOpen} onClose={handleClose} size="full" closeOnOverlay={false}>
  {/* Editor header with close button */}
  <div className="h-full flex flex-col">
    <EditorHeader onClose={handleCloseWithConfirm} />
    <div className="flex-1 relative">
      {isLoading && <LoadingOverlay />}
      {error && <ErrorState onRetry={retry} />}
      <iframe ref={iframeRef} src={iframeSrc} className="w-full h-full" />
    </div>
  </div>
</Modal>
```

### Pattern 2: postMessage Communication Protocol
**What:** Bidirectional iframe communication with message validation
**When to use:** All iframe ↔ parent communication
**Current implementation (verified working):**
```jsx
// Parent → Iframe
const sendToIframe = (action, payload = {}) => {
  iframeRef.current?.contentWindow?.postMessage(
    { target: 'polotno-editor', action, payload },
    '*'  // Same-origin, * is acceptable
  );
};

// Iframe → Parent (in main.jsx)
window.parent.postMessage({ source: 'polotno-editor', type, data }, '*');
```

### Pattern 3: Unsaved Changes Detection
**What:** Track editor dirty state, prompt before close
**When to use:** Decision locked: "Unsaved changes trigger confirm dialog"
**Example:**
```jsx
// Track dirty state via message from iframe
const [isDirty, setIsDirty] = useState(false);

const handleMessage = (event) => {
  if (event.data?.source !== 'polotno-editor') return;
  if (event.data.type === 'designChanged') {
    setIsDirty(true);
  }
  if (event.data.type === 'save') {
    setIsDirty(false);
  }
};

// Use ConfirmDialog from design system
const handleClose = () => {
  if (isDirty) {
    setShowConfirmDialog(true);
  } else {
    onClose();
  }
};
```

### Pattern 4: Loading Timeout with Retry
**What:** 10-second timeout, show error with retry button
**When to use:** Decision locked: "10 second timeout before showing error state"
**Example:**
```jsx
useEffect(() => {
  const timeout = setTimeout(() => {
    if (isLoading) {
      setError({ type: 'timeout', message: 'Editor took too long to load.' });
    }
  }, 10000); // CONTEXT.md: 10 seconds

  return () => clearTimeout(timeout);
}, [isLoading]);

const handleRetry = () => {
  setError(null);
  setIsLoading(true);
  // Force iframe reload
  iframeRef.current?.contentWindow?.location.reload();
};
```

### Anti-Patterns to Avoid
- **Don't navigate to full page:** Decision locked for modal overlay
- **Don't use complex origin validation:** Same-origin iframe, `'*'` is acceptable
- **Don't auto-close on save:** Decision locked for user choice post-save
- **Don't hard-block mobile:** Decision allows "Desktop recommended" soft warning

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal overlay | Custom portal | Design system `Modal` | Already has animation, focus trap, accessibility |
| Confirm dialog | Custom prompt | Design system `ConfirmDialog` | Already styled, tested |
| Loading spinner | Custom SVG | `Loader2` from lucide-react | Consistent with app |
| Error states | Custom UI | Follow existing `PolotnoEditor.jsx` error pattern | Already styled |

**Key insight:** The design system already provides Modal, ConfirmDialog, and animation patterns. The existing `PolotnoEditor.jsx` error UI is a good base.

## Common Pitfalls

### Pitfall 1: Race Condition on Design Load
**What goes wrong:** Parent sends `loadDesign` before iframe fires `ready` event
**Why it happens:** Iframe may be DOM-mounted but JS not yet executed
**How to avoid:** Current code already handles this - waits for `ready` event before sending initial design. Verify this remains true after refactor.
**Warning signs:** Blank canvas after template selection, console shows `loadDesign` sent before `ready` received

### Pitfall 2: Message Origin Confusion
**What goes wrong:** postMessage fails silently due to origin mismatch
**Why it happens:** Different environments (dev vs staging vs prod) may have different origins
**How to avoid:** Same-origin iframe (`/polotno/index.html`) means origin is always same. Using `'*'` as target is acceptable here. Verify CSP allows frame-src for polotno.com (already in vercel.json).
**Warning signs:** Messages sent but never received, no console errors

### Pitfall 3: Modal Z-Index Conflicts
**What goes wrong:** Polotno's internal modals (color picker, etc.) appear behind parent modal overlay
**Why it happens:** Design system modal is z-50, Polotno may use different z-index scale
**How to avoid:** Use `size="full"` modal which doesn't have backdrop issues. If needed, add CSS to boost iframe content z-index.
**Warning signs:** Polotno dropdowns/modals clipped or unclickable

### Pitfall 4: Unsaved Changes Lost on Navigation
**What goes wrong:** User has unsaved work, browser back/navigation discards it
**Why it happens:** No beforeunload handler or dirty state tracking
**How to avoid:** Track dirty state via iframe messages, use ConfirmDialog on close attempt
**Warning signs:** Users report lost work, especially on accidental close

### Pitfall 5: Mobile Viewport Issues
**What goes wrong:** Editor unusable on mobile, UI elements overlap
**Why it happens:** Polotno designed for desktop, 1920x1080 canvas doesn't fit mobile
**How to avoid:** Decision locked: show "Desktop recommended" message for mobile. Detect with existing `useBreakpoints()` hook.
**Warning signs:** Touch controls fail, canvas not visible, buttons unreachable

## Code Examples

### Loading State with 10-Second Timeout
```jsx
// Source: Based on existing PolotnoEditor.jsx, modified per CONTEXT.md
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  if (!isLoading) return;

  const timeout = setTimeout(() => {
    setError({
      type: 'timeout',
      title: 'Editor Taking Too Long',
      message: 'The design editor is having trouble loading.',
      canRetry: true,
    });
  }, 10000); // 10 seconds per CONTEXT.md

  return () => clearTimeout(timeout);
}, [isLoading]);
```

### Error State with Retry and Fallback
```jsx
// Source: Modified from existing error UI, per CONTEXT.md decisions
if (error) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="text-red-400 w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{error.title}</h2>
        <p className="text-gray-400 mb-6">{error.message}</p>

        {/* Primary: Retry button */}
        {error.canRetry && (
          <Button variant="primary" onClick={handleRetry} className="mb-4 w-full">
            <RefreshCw size={18} className="mr-2" />
            Try Again
          </Button>
        )}

        {/* Fallback: Design Studio link (per CONTEXT.md) */}
        <a
          href="/app/layouts"
          className="text-gray-300 hover:text-white flex items-center justify-center gap-2 mb-2"
        >
          <LayoutGrid size={18} />
          Open Design Studio
        </a>

        {/* Secondary: Contact Support */}
        <a
          href="/app/help"
          className="text-gray-500 hover:text-gray-400 text-sm"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
```

### Unsaved Changes Confirm Dialog
```jsx
// Source: Design system ConfirmDialog pattern
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

const handleCloseAttempt = () => {
  if (isDirty) {
    setShowConfirmDialog(true);
  } else {
    onClose();
  }
};

<ConfirmDialog
  open={showConfirmDialog}
  onClose={() => setShowConfirmDialog(false)}
  onConfirm={handleSaveAndClose}
  title="Unsaved Changes"
  description="You have unsaved changes. What would you like to do?"
  confirmText="Save"
  cancelText="Discard"
  variant="default"
/>
// Note: Per CONTEXT.md, need 3 options: Save / Discard / Cancel
// May need custom modal instead of ConfirmDialog for 3 buttons
```

### Post-Save User Choice
```jsx
// Source: CONTEXT.md decision
const handleSaveSuccess = () => {
  setIsDirty(false);
  // Ask user what to do next
  setShowPostSaveDialog(true);
};

// In PostSaveDialog:
<Modal open={showPostSaveDialog} onClose={() => setShowPostSaveDialog(false)} size="sm">
  <div className="p-6 text-center">
    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Design Saved!</h3>
    <p className="text-gray-500 mb-6">Your changes have been saved to the media library.</p>
    <div className="space-y-2">
      <Button variant="primary" fullWidth onClick={() => setShowPostSaveDialog(false)}>
        Keep Editing
      </Button>
      <Button variant="secondary" fullWidth onClick={handleViewTemplate}>
        View My Template
      </Button>
    </div>
  </div>
</Modal>
```

### Mobile Detection Warning
```jsx
// Source: Existing useBreakpoints hook
import { useBreakpoints } from '../hooks/useMediaQuery';

const { isMobile, isTablet } = useBreakpoints();
const showDesktopWarning = isMobile || isTablet;

{showDesktopWarning && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
    <p className="text-amber-800 text-sm">
      <Monitor className="inline-block w-4 h-4 mr-1" />
      For the best editing experience, we recommend using a desktop browser.
    </p>
    <Button
      variant="link"
      size="sm"
      onClick={() => setShowDesktopWarning(false)}
      className="text-amber-700"
    >
      Continue anyway
    </Button>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-page editor | Modal overlay | This phase | Maintains context |
| 30s timeout | 10s timeout | This phase | Faster failure feedback |
| Silent close | Confirm dialog | This phase | Prevents data loss |
| Auto-close on save | User choice | This phase | Respects user intent |

**Current state:**
- `PolotnoEditor.jsx`: 30-second timeout, full-page, no unsaved detection
- `DesignEditorPage.jsx`: Full-page wrapper with Suspense lazy loading
- Entry points: LayoutsPage template click, direct navigation

## Open Questions

1. **Dirty state from iframe**
   - What we know: Need to track if user made changes
   - What's unclear: Polotno may not emit change events by default
   - Recommendation: Add `store.on('change')` listener in main.jsx, send `designChanged` message to parent

2. **Three-button confirm dialog**
   - What we know: CONTEXT.md specifies Save / Discard / Cancel
   - What's unclear: Design system ConfirmDialog only supports 2 buttons
   - Recommendation: Create custom modal with 3 buttons, or extend ConfirmDialog

3. **Post-save navigation target**
   - What we know: User chooses "keep editing" or "view template"
   - What's unclear: Where does "view template" go? Media library? Template detail?
   - Recommendation: Navigate to media library with saved item highlighted, similar to existing save flow

4. **Preload on hover optimization**
   - What we know: Listed in Claude's Discretion
   - What's unclear: How much benefit vs complexity?
   - Recommendation: Defer to later - focus on core reliability first

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/components/PolotnoEditor.jsx` - Current implementation analyzed
- `/Users/massimodamico/bizscreen/scripts/polotno-build/src/main.jsx` - Iframe editor code analyzed
- `/Users/massimodamico/bizscreen/src/design-system/components/Modal.jsx` - Modal API verified
- `/Users/massimodamico/bizscreen/.planning/phases/35-polotno-editor-verification/35-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/.planning/research/PITFALLS-ONBOARDING.md` - Pitfall 4 (Polotno iframe) documented
- `/Users/massimodamico/bizscreen/vercel.json` - CSP and frame-src verified for polotno.com

### Tertiary (LOW confidence)
- Polotno documentation for store.on('change') API - needs verification when implementing dirty state

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in use, verified in package.json
- Architecture: HIGH - Patterns derived from existing codebase analysis
- Pitfalls: HIGH - Based on PITFALLS-ONBOARDING.md and code analysis

**Research date:** 2026-01-31
**Valid until:** 2026-02-28 (30 days - stable domain, no external API changes expected)

## Implementation Notes for Planner

### Key Changes Required

1. **PolotnoEditor.jsx refactor:**
   - Change 30s timeout to 10s
   - Add dirty state tracking
   - Add confirm dialog on close
   - Add post-save choice dialog
   - Mobile detection warning

2. **New EditorModal component or modify DesignEditorPage:**
   - Wrap in Modal component (size="full")
   - Handle modal close with unsaved check
   - Error state with retry + fallback

3. **main.jsx (iframe editor) additions:**
   - Add `store.on('change')` listener
   - Send `designChanged` message to parent
   - Ensure `ready` event timing is correct

4. **Entry point changes:**
   - LayoutsPage template click → open modal instead of navigate
   - TemplatesPage (if applicable) → same pattern

### Suggested Plan Breakdown

- **Plan 35-01:** Modal wrapper and loading/error states (10s timeout, retry, fallback)
- **Plan 35-02:** Unsaved changes detection and confirm dialog
- **Plan 35-03:** Post-save user choice dialog
- **Plan 35-04:** Mobile detection warning + E2E tests
