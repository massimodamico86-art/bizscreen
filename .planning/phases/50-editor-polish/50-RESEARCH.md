# Phase 50: Editor Polish - Research

**Researched:** 2026-02-10
**Domain:** SVG editor UX micro-interactions, animation feedback, keyboard accessibility
**Confidence:** HIGH

## Summary

Phase 50 focuses on five distinct editor polish tasks: toolbar press animations (EDITOR-01), skeleton loading states (EDITOR-02), save celebration animation (EDITOR-03), keyboard shortcuts overlay (EDITOR-04), and undo/redo visual feedback (EDITOR-05). The critical finding is that **zero new dependencies are needed**. The project already has `framer-motion@12.23.24`, `canvas-confetti@1.9.4`, and `lucide-react@0.548.0` installed. Furthermore, the project's own `src/design-system/motion.js` already defines reusable animation presets including `scaleTap`, `fadeIn`, `fadeInScale`, `slideUp`, `modal`, and CSS utility classes like `buttonPress`. The existing `canvas-confetti` usage pattern (in `ScreenPairingStep.jsx` and `SuccessStep.jsx`) provides a proven confetti celebration template to replicate for save success.

The main editor component is `FabricSvgEditor.jsx` (~2886 lines) located at `src/components/svg-editor/FabricSvgEditor.jsx`. It already has keyboard shortcut handling (Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+D, Ctrl+P, Delete) but does not expose these in a user-visible overlay. The loading state is currently a raw centered spinner (`Loader2` with `animate-spin`). The save handler (`handleSave`) shows a spinner during save and calls `showToast` on success but has no celebration animation. Undo/redo (`handleUndo`/`handleRedo`) manipulate history without any visual feedback beyond the canvas re-rendering.

**Primary recommendation:** Apply the existing `motion.js` presets and `canvas-confetti` patterns -- the project already has all the tools, they just need to be wired into the editor components. No new libraries, no architectural changes.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | 12.23.24 | Button press/hover animations, AnimatePresence transitions | Already used in FabricSvgEditor for QuickCustomizePanel animation |
| canvas-confetti | 1.9.4 | Save celebration confetti burst | Already used in onboarding (ScreenPairingStep, SuccessStep) |
| lucide-react | 0.548.0 | Icons for shortcuts overlay, checkmark animation | Already the sole icon library across the entire app |
| fabric | 6.9.0 | Canvas rendering (no changes needed for polish) | The editor's core dependency |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 3.4.18 | `animate-pulse` for skeletons, `transition-*` for CSS-only effects | Skeleton loading states, button active states |
| src/design-system/motion.js | N/A | `scaleTap`, `fadeIn`, `fadeInScale`, `modal`, `cssTransitions.buttonPress` | All animation presets for toolbar buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | Framer Motion + SVG particles | canvas-confetti is already proven in the codebase, simpler API |
| Custom keyboard hook | react-hotkeys-hook | Unnecessary -- existing `useEffect` keydown handler is straightforward |
| CSS `animate-pulse` skeletons | react-loading-skeleton | animate-pulse is already used across the codebase, no new dep needed |

**Installation:**
```bash
# No installation needed -- all dependencies are already present
```

## Architecture Patterns

### Recommended File Structure
```
src/components/svg-editor/
  FabricSvgEditor.jsx          # Main editor -- add confetti, undo toast, loading overlay
  EditorToolbar.jsx             # Left sidebar tools -- add motion.button with scaleTap
  TopToolbar.jsx                # Contextual toolbar -- add motion.button with scaleTap
  CanvasControls.jsx            # Floating zoom/history -- add motion.button with scaleTap
  KeyboardShortcutsOverlay.jsx  # NEW: shortcuts reference modal
  SaveCelebration.jsx           # NEW: brief checkmark + confetti animation component
  UndoRedoToast.jsx             # NEW: auto-dismissing toast for undo/redo feedback
  EditorLoadingSkeleton.jsx     # NEW: skeleton for editor initial load
```

### Pattern 1: Toolbar Button Press Animation (scaleTap)
**What:** Wrap toolbar buttons in `motion.button` with the existing `scaleTap` preset from `motion.js`
**When to use:** Every clickable button in EditorToolbar, TopToolbar, and CanvasControls
**Example:**
```jsx
// Source: src/design-system/motion.js (existing in codebase)
import { motion } from 'framer-motion';
import { scaleTap } from '../../design-system/motion';

// Replace <button> with <motion.button {...scaleTap}>
<motion.button
  {...scaleTap}
  onClick={tool.action}
  disabled={tool.disabled}
  className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors ..."
  title={tool.label}
>
  <Icon size={20} />
</motion.button>
```

### Pattern 2: Save Celebration Animation
**What:** Brief checkmark + optional confetti on successful save
**When to use:** After `handleSave` resolves successfully
**Example:**
```jsx
// Source: src/components/onboarding/ScreenPairingStep.jsx (existing pattern)
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

// Inside handleSave, after success:
confetti({
  particleCount: 80,
  spread: 60,
  origin: { y: 0.3 },  // Near save button
  disableForReducedMotion: true,
  zIndex: 10001,
});
setSaveSuccess(true);
setTimeout(() => setSaveSuccess(false), 2000);

// In render, the Save button transforms:
<AnimatePresence mode="wait">
  {saveSuccess ? (
    <motion.div
      key="check"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg"
    >
      <Check size={18} />
      Saved!
    </motion.div>
  ) : (
    <motion.button key="save" onClick={handleSave} ...>
      Save
    </motion.button>
  )}
</AnimatePresence>
```

### Pattern 3: Editor Skeleton Loading
**What:** Replace the raw spinner with a dark-themed skeleton matching the editor layout
**When to use:** During the `isLoading` state in FabricSvgEditor
**Example:**
```jsx
// Skeleton matching editor layout: left toolbar + canvas area + optional right panel
{isLoading && (
  <div className="absolute inset-0 z-50 flex bg-gray-900">
    {/* Left sidebar skeleton */}
    <div className="w-14 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="w-10 h-10 bg-gray-700 rounded-lg animate-pulse" />
      ))}
    </div>
    {/* Canvas area skeleton */}
    <div className="flex-1 flex items-center justify-center">
      <div className="w-3/4 aspect-video bg-gray-800 rounded-lg animate-pulse" />
    </div>
    {/* Right controls skeleton */}
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
)}
```

### Pattern 4: Keyboard Shortcuts Overlay
**What:** A dark-themed modal listing all available shortcuts, toggled with `?` key or a help button
**When to use:** When user presses `?` or clicks a keyboard icon in the header
**Example:**
```jsx
// New KeyboardShortcutsOverlay component
import { Modal, ModalHeader, ModalTitle, ModalContent } from '../../design-system/components/Modal';

const SHORTCUTS = [
  { category: 'General', items: [
    { keys: ['Ctrl', 'S'], description: 'Save design' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alt)' },
    { keys: ['Ctrl', 'P'], description: 'Toggle preview' },
    { keys: ['Ctrl', 'D'], description: 'Duplicate selection' },
    { keys: ['Delete'], description: 'Delete selection' },
    { keys: ['Esc'], description: 'Exit preview / deselect' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ]},
];

// Render kbd tags in dark theme
<kbd className="px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 font-mono">
  Ctrl
</kbd>
```

### Pattern 5: Undo/Redo Visual Feedback Toast
**What:** A brief auto-dismissing toast that appears on undo/redo confirming the action
**When to use:** After `handleUndo` or `handleRedo` completes successfully
**Example:**
```jsx
// Small floating toast near bottom of canvas area
<AnimatePresence>
  {undoRedoToast && (
    <motion.div
      key="undo-toast"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg border border-gray-700"
    >
      {undoRedoToast}
    </motion.div>
  )}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Wrapping every element in motion.div:** Only toolbar buttons and interactive elements need press feedback. Static labels, dividers, and containers should remain plain HTML elements.
- **Heavy confetti on every save:** The celebration should be brief and subtle. Use `particleCount: 80` max, and respect `disableForReducedMotion: true`.
- **Blocking undo/redo for toast:** The toast is purely informational. Never delay the undo/redo operation to wait for the toast animation.
- **Keyboard shortcuts overlay as a full modal:** Use a simpler dark-themed overlay panel that sits within the editor rather than the white-themed design-system Modal, since the editor is dark-themed (bg-gray-800/900).
- **Adding new CSS files for animations:** Use existing Tailwind utilities (`animate-pulse`, `transition-*`) and Framer Motion. No custom CSS keyframes needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button press animation | Custom CSS keyframes or onClick state | `motion.button` + `scaleTap` from `motion.js` | Already defined, handles spring physics, accessible |
| Confetti particles | Custom canvas particle system | `canvas-confetti` (already installed) | Handles performance, reduced motion, cross-browser |
| Modal focus trap | Custom focus management | `design-system/Modal` pattern (or native dialog) | Existing Modal has full focus trap, ESC handling |
| Skeleton pulse animation | Custom animation loop | Tailwind `animate-pulse` | Consistent with codebase's existing skeleton patterns |
| Toast auto-dismiss | Custom setTimeout management | `AnimatePresence` + `useEffect` cleanup | Handles exit animations gracefully |

**Key insight:** This phase is about wiring up existing tools, not building new infrastructure. The project already has every animation primitive needed in `motion.js` and every library installed.

## Common Pitfalls

### Pitfall 1: Breaking Fabric.js Text Editing with motion.button
**What goes wrong:** Wrapping toolbar buttons in `motion.button` can interfere with Fabric.js text editing if the motion component captures keyboard events.
**Why it happens:** Framer Motion's gesture system listens for keyboard events (Enter/Space) on motion elements, which can conflict with Fabric's own keyboard handling during text editing mode.
**How to avoid:** Only use `motion.button` on toolbar buttons outside the canvas area. The canvas `<canvas ref={canvasRef} />` itself should never be wrapped in a motion component. The `handleKeyDown` function already guards against input fields with `if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;` -- but also guard against Fabric's internal editing state.
**Warning signs:** Text editing stops working after adding motion buttons.

### Pitfall 2: Confetti Z-Index Conflicts
**What goes wrong:** Confetti renders behind the editor's z-50 overlays.
**Why it happens:** `canvas-confetti` creates its own canvas element with a default z-index that may be lower than the editor's layered UI.
**How to avoid:** Set `zIndex: 10001` on the confetti call (matching the existing pattern in `ScreenPairingStep.jsx`). This places it above all editor panels.
**Warning signs:** Confetti appears but is partially or fully hidden.

### Pitfall 3: Keyboard Shortcuts Overlay Interfering with Editor Shortcuts
**What goes wrong:** The `?` key shortcut conflicts with text editing -- typing a `?` in a text element opens the shortcuts overlay.
**Why it happens:** The keydown handler doesn't check if Fabric.js is in text editing mode.
**How to avoid:** Before processing `?`, check `fabricCanvasRef.current?.getActiveObject()?.isEditing`. If true, don't trigger the overlay. The existing shortcut handler already guards against INPUT/TEXTAREA, but Fabric's text editing happens on a `<canvas>`, not an input element.
**Warning signs:** Overlay pops up while typing text on canvas.

### Pitfall 4: Undo/Redo Toast Flooding
**What goes wrong:** Rapid Ctrl+Z spam creates dozens of stacked toasts.
**Why it happens:** Each undo triggers a new toast without debouncing or replacing the previous one.
**How to avoid:** Use a single toast state variable and replace (not stack) on each undo/redo. Clear and reset the auto-dismiss timer on each new action.
**Warning signs:** Multiple "Undo" toasts stacked on screen.

### Pitfall 5: Loading Skeleton Flash
**What goes wrong:** When the editor loads quickly (cached JSON), the skeleton appears for a split second creating a jarring flash.
**Why it happens:** The loading state briefly becomes true then false within the same render cycle.
**How to avoid:** Add a minimum display time (e.g., 300ms) before showing the skeleton, or use a delayed skeleton that only appears after a threshold.
**Warning signs:** Brief flash of skeleton on fast loads.

### Pitfall 6: Motion Button Active State Conflict with Tailwind
**What goes wrong:** Framer Motion's `whileTap` scale fights with Tailwind's `active:scale-[0.97]` class.
**Why it happens:** Both try to control the `transform` property simultaneously.
**How to avoid:** When using `motion.button` with `scaleTap`, remove any Tailwind `active:scale-*` classes. Use one or the other, not both.
**Warning signs:** Button jumps or flickers on click.

## Code Examples

Verified patterns from the existing codebase:

### Existing scaleTap Preset
```jsx
// Source: src/design-system/motion.js (lines 90-93)
export const scaleTap = {
  whileTap: { scale: 0.97 },
  transition: { duration: duration.instant, ease: easing.snappy },
};
```

### Existing Confetti Pattern
```jsx
// Source: src/components/onboarding/ScreenPairingStep.jsx (lines 50-58)
import confetti from 'canvas-confetti';

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true,
    zIndex: 10001,
  });
}
```

### Existing AnimatePresence in Editor
```jsx
// Source: src/components/svg-editor/FabricSvgEditor.jsx (lines 2804-2822)
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {showQuickCustomize && !isPreviewMode && (
    <motion.div
      key="quick-customize"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 288, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden flex-shrink-0"
    >
      <QuickCustomizePanel ... />
    </motion.div>
  )}
</AnimatePresence>
```

### Existing Keyboard Shortcuts Handler
```jsx
// Source: src/components/svg-editor/FabricSvgEditor.jsx (lines 2312-2363)
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isPreviewMode) { setIsPreviewMode(false); return; }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDelete(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); handleDuplicate(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); setIsPreviewMode(!isPreviewMode); }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleDelete, handleUndo, handleRedo, handleSave, handleDuplicate, isPreviewMode]);
```

### Existing Skeleton Pattern (Dark Theme)
```jsx
// Source: src/components/svg-editor/QuickCustomizePanel.jsx (lines 191-196)
// Already uses animate-pulse in dark theme context
<div className="flex gap-3">
  {[1, 2, 3].map((i) => (
    <div key={i} className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-full bg-gray-600 animate-pulse" />
      <div className="w-10 h-2 bg-gray-600 rounded animate-pulse" />
    </div>
  ))}
</div>
```

### Existing CSS Transition Pattern
```jsx
// Source: src/design-system/motion.js (lines 211-212)
export const cssTransitions = {
  buttonPress: 'active:scale-[0.97] transition-transform duration-100',
  // ...
};
```

### Save Button Current Implementation
```jsx
// Source: src/components/svg-editor/FabricSvgEditor.jsx (lines 2513-2524)
<button
  onClick={handleSave}
  disabled={isSaving}
  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
>
  {isSaving ? (
    <Loader2 size={18} className="animate-spin" />
  ) : (
    <Save size={18} />
  )}
  Save
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS `transition` + `active:` | Framer Motion `whileTap` | motion.js already defines `scaleTap` | Smoother spring physics, accessible keyboard support |
| Raw `Loader2` spinner | Skeleton loading matching layout shape | Common in 2024+ | Reduced perceived load time, more professional |
| `window.alert("Saved")` | Toast + confetti celebration | Already using `showToast` | Delightful save confirmation |
| Undiscoverable shortcuts | Shortcuts overlay (? key) | Standard in Figma, Canva, Google Docs | Power user discoverability |

**Deprecated/outdated:**
- `EditorToolbar.jsx` is a simpler left-sidebar toolbar that appears to be redundant with `LeftSidebar.jsx`. The toolbar in the actual render uses `LeftSidebar`, not `EditorToolbar`. EditorToolbar may be legacy or used in a different context -- verify before modifying.

## Open Questions

1. **EditorToolbar vs LeftSidebar: Which is active?**
   - What we know: The FabricSvgEditor render JSX uses `LeftSidebar` (line 2572), not `EditorToolbar`. However, EditorToolbar is exported from the index.
   - What's unclear: Whether EditorToolbar is used elsewhere or is dead code
   - Recommendation: Check imports of EditorToolbar across the codebase before modifying it. If unused, skip it. Focus polish on `LeftSidebar`, `TopToolbar`, and `CanvasControls` which are the active components.

2. **Save button confetti origin position**
   - What we know: The save button is in the top-right header area
   - What's unclear: Exact pixel coordinates for confetti `origin` parameter
   - Recommendation: Use `origin: { x: 0.85, y: 0.05 }` to approximate the save button position. Fine-tune during implementation.

3. **Should the keyboard shortcuts overlay be dark-themed or use the design system Modal?**
   - What we know: The editor is entirely dark-themed (bg-gray-800/900). The design system Modal is white-themed (bg-white).
   - What's unclear: Whether a dark Modal variant exists
   - Recommendation: Build a custom dark-themed overlay (not the design system Modal) that matches the editor's visual language. Use Framer Motion's `modal` animation preset for enter/exit but style it with dark theme classes.

## Sources

### Primary (HIGH confidence)
- `src/design-system/motion.js` -- All animation presets verified directly from source
- `src/components/svg-editor/FabricSvgEditor.jsx` -- Editor architecture, save logic, keyboard shortcuts, loading state, undo/redo
- `src/components/svg-editor/TopToolbar.jsx` -- Toolbar button patterns
- `src/components/svg-editor/CanvasControls.jsx` -- Floating controls patterns
- `src/components/svg-editor/EditorToolbar.jsx` -- Left sidebar toolbar pattern
- `src/components/svg-editor/QuickCustomizePanel.jsx` -- Existing dark-theme skeleton pattern
- `src/components/onboarding/ScreenPairingStep.jsx` -- canvas-confetti usage pattern
- `package.json` -- Verified all dependency versions

### Secondary (MEDIUM confidence)
- [Framer Motion gesture docs](https://motion.dev/docs/react-gestures) -- whileTap behavior
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) -- confetti API options

### Tertiary (LOW confidence)
- None -- all findings verified against codebase source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and versions verified from node_modules
- Architecture: HIGH -- all editor components read and understood, patterns extracted from existing code
- Pitfalls: HIGH -- based on understanding of actual Fabric.js + Framer Motion interaction in the codebase

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable -- no moving targets, all deps already locked)
