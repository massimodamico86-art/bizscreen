# Phase 24: Player Restructure - Research

**Researched:** 2026-01-27
**Domain:** React Component Decomposition, File Organization, Tech Debt Reduction
**Confidence:** HIGH

## Summary

This research investigates how to complete the Player.jsx restructure from 1,265 lines to under 1,000 lines. Phase 7 already extracted significant portions (hooks, widgets, renderers) reducing it from 3,495 lines. The remaining work is primarily:

1. **Extract ViewPage** - The main ViewPage component (lines 137-1252, ~1115 lines) into `player/pages/ViewPage.jsx`
2. **Extract stuck detection** - The inline stuck detection logic into `useStuckDetection` hook
3. **Create pages directory** - Establish the `player/pages/` directory per PLAY-05
4. **Slim Player.jsx** - Reduce to routing-only concern (~50 lines)

The current codebase already has most extractions done. Widgets exist in `player/components/widgets/`, hooks exist in `player/hooks/`, and renderers exist in `player/components/`. What remains is extracting ViewPage itself and one remaining inline hook (stuck detection).

**Primary recommendation:** Extract ViewPage.jsx to `player/pages/`, create `useStuckDetection` hook, and reduce Player.jsx to routing-only. Target: Player.jsx under 100 lines with clear single responsibility.

## Current State Analysis

### What Already Exists

| Component/Hook | Location | Lines | Status |
|---------------|----------|-------|--------|
| ClockWidget | `player/components/widgets/ClockWidget.jsx` | 71 | Complete |
| DateWidget | `player/components/widgets/DateWidget.jsx` | 71 | Complete |
| WeatherWidget | `player/components/widgets/WeatherWidget.jsx` | 183 | Complete |
| QRCodeWidget | `player/components/widgets/QRCodeWidget.jsx` | 112 | Complete |
| usePlayerContent | `player/hooks/usePlayerContent.js` | 356 | Complete |
| usePlayerHeartbeat | `player/hooks/usePlayerHeartbeat.js` | 110 | Complete |
| usePlayerCommands | `player/hooks/usePlayerCommands.js` | 104 | Complete |
| usePlayerPlayback | `player/hooks/usePlayerPlayback.js` | 134 | Complete |
| useKioskMode | `player/hooks/useKioskMode.js` | 187 | Complete |
| useTapSequence | `player/hooks/useTapSequence.js` | 85 | Complete |
| SceneRenderer | `player/components/SceneRenderer.jsx` | 427 | Complete |
| LayoutRenderer | `player/components/LayoutRenderer.jsx` | 66 | Complete |
| ZonePlayer | `player/components/ZonePlayer.jsx` | 151 | Complete |
| AppRenderer | `player/components/AppRenderer.jsx` | 624 | Complete |
| PairPage | `player/components/PairPage.jsx` | 409 | Complete |
| PinEntry | `player/components/PinEntry.jsx` | 289 | Complete |

### What Remains in Player.jsx

| Section | Lines | Action |
|---------|-------|--------|
| Imports | 1-70 | Keep minimal in Player.jsx |
| Constants (STORAGE_KEYS, PLAYER_VERSION) | 75-100 | Move to ViewPage or shared config |
| retryWithBackoff function | 106-122 | Move to ViewPage (or usePlayerContent) |
| ViewPage function | 137-1252 | Extract to `player/pages/ViewPage.jsx` |
| Player (router) | 1257-1265 | Keep - this IS Player.jsx |

### Missing Pieces per Requirements

| Requirement | Status | Gap |
|-------------|--------|-----|
| PLAY-01: Under 1000 lines | Gap | Currently 1,265 lines |
| PLAY-02: Widgets extracted | Complete | All 4 widgets in `player/components/widgets/` |
| PLAY-03: Hooks extracted | Partial | useStuckDetection missing (inline in ViewPage) |
| PLAY-04: Renderers extracted | Complete | SceneRenderer, LayoutRenderer, ZonePlayer in place |
| PLAY-05: Directory structure | Partial | Missing `player/pages/` directory |

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | Component framework | Project foundation |
| React Router | 6+ | Routing | Already used for /player routes |
| Vitest | Current | Testing framework | Already established |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | v13+ | Component and hook testing | Hook testing with renderHook |

### No New Dependencies Required
This restructure is purely organizational - no new libraries needed.

## Architecture Patterns

### Target Project Structure
```
src/
├── Player.jsx                    # ~50 lines - Router only
├── player/                       # Player-specific modules
│   ├── pages/                    # NEW - Full-page components
│   │   └── ViewPage.jsx          # ~1100 lines - Main playback view
│   ├── hooks/                    # Custom hooks (EXISTING)
│   │   ├── index.js              # Barrel export
│   │   ├── usePlayerContent.js   # Content loading, caching
│   │   ├── usePlayerHeartbeat.js # Device status, screenshots
│   │   ├── usePlayerCommands.js  # Command handling
│   │   ├── usePlayerPlayback.js  # Timing, video control
│   │   ├── useKioskMode.js       # Kiosk state, exit
│   │   ├── useTapSequence.js     # Hidden tap trigger
│   │   └── useStuckDetection.js  # NEW - Video/page stuck detection
│   ├── components/               # UI components (EXISTING)
│   │   ├── index.js              # Barrel export
│   │   ├── widgets/              # Widget components (EXISTING)
│   │   │   ├── ClockWidget.jsx
│   │   │   ├── DateWidget.jsx
│   │   │   ├── WeatherWidget.jsx
│   │   │   └── QRCodeWidget.jsx
│   │   ├── SceneRenderer.jsx     # Scene slide rendering
│   │   ├── LayoutRenderer.jsx    # Multi-zone layout
│   │   ├── ZonePlayer.jsx        # Single zone content
│   │   ├── AppRenderer.jsx       # App type routing
│   │   ├── PairPage.jsx          # OTP pairing (move to pages?)
│   │   └── PinEntry.jsx          # PIN entry overlay
│   ├── cacheService.js           # Cache utilities (EXISTING)
│   └── offlineService.js         # Offline support (EXISTING)
```

### Pattern 1: Page Component Extraction
**What:** Extract full-page components to dedicated `pages/` directory
**When to use:** When a component represents a complete route/view
**Example:**
```javascript
// Source: Existing pattern (PairPage is similar)
// player/pages/ViewPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePlayerContent,
  usePlayerHeartbeat,
  usePlayerCommands,
  useKioskMode,
  usePlayerPlayback,
  useTapSequence,
  useStuckDetection,
} from '../hooks';
import { SceneRenderer } from '../components/SceneRenderer';
import { LayoutRenderer } from '../components/LayoutRenderer';
import { AppRenderer } from '../components/AppRenderer';
import { PinEntry } from '../components/PinEntry';

export function ViewPage() {
  const navigate = useNavigate();
  const screenId = localStorage.getItem('player_screen_id');
  // ... component implementation
}
```

### Pattern 2: Stuck Detection Hook
**What:** Extract video/page stuck detection into testable hook
**When to use:** For self-contained timer-based monitoring logic
**Example:**
```javascript
// player/hooks/useStuckDetection.js
import { useEffect, useRef } from 'react';
import { useLogger } from '../../hooks/useLogger.js';

const STUCK_DETECTION = {
  maxVideoStallMs: 30000,     // 30 seconds without video progress
  maxNoActivityMs: 300000,    // 5 minutes without any activity
  checkIntervalMs: 10000      // Check every 10 seconds
};

export function useStuckDetection({
  videoRef,
  lastVideoTimeRef,
  lastActivityRef,
  onVideoStuck,
  onPageStuck,
}) {
  const logger = useLogger('useStuckDetection');

  useEffect(() => {
    const checkStuck = () => {
      const now = Date.now();

      // Check for video stall
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const currentTime = videoRef.current.currentTime;
        if (currentTime === lastVideoTimeRef.current) {
          const stallDuration = now - (lastActivityRef.current || now);
          if (stallDuration > STUCK_DETECTION.maxVideoStallMs) {
            logger.warn('Video stuck detected');
            onVideoStuck?.();
            lastActivityRef.current = now;
          }
        } else {
          lastVideoTimeRef.current = currentTime;
          lastActivityRef.current = now;
        }
      }

      // Check for general inactivity
      const inactiveDuration = now - lastActivityRef.current;
      if (inactiveDuration > STUCK_DETECTION.maxNoActivityMs) {
        logger.warn('Player inactive for too long');
        onPageStuck?.();
      }
    };

    const interval = setInterval(checkStuck, STUCK_DETECTION.checkIntervalMs);
    return () => clearInterval(interval);
  }, [videoRef, lastVideoTimeRef, lastActivityRef, onVideoStuck, onPageStuck, logger]);
}
```

### Pattern 3: Minimal Router Component
**What:** Player.jsx becomes pure routing concern
**When to use:** After extracting all page-level components
**Example:**
```javascript
// Player.jsx - Final state (~50 lines)
import { Routes, Route, Navigate } from 'react-router-dom';
import { ViewPage } from './player/pages/ViewPage';
import { PairPage } from './player/components/PairPage';

export default function Player() {
  return (
    <Routes>
      <Route path="/" element={<PairPage />} />
      <Route path="/view" element={<ViewPage />} />
      <Route path="*" element={<Navigate to="/player" replace />} />
    </Routes>
  );
}
```

### Anti-Patterns to Avoid
- **Moving too much too fast:** Extract one piece at a time with test verification
- **Breaking import paths:** Keep re-exports in original locations if tests depend on them
- **Over-engineering:** Don't create context providers unless state truly needs to be shared
- **Premature pages/ migration for PairPage:** It already works in components/, moving is optional

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hook testing | Custom test wrappers | `renderHook` from @testing-library/react | Built-in support for async, state updates |
| Exponential backoff | Custom delay function | `calculateBackoff` from playerService | Already tested, handles jitter |
| Scoped logging | console.log with prefixes | `useLogger` hook | PII redaction, consistent formatting |
| Timer cleanup | Manual ref tracking | useEffect cleanup returns | React handles cleanup lifecycle |

**Key insight:** The existing extracted hooks provide the patterns. New extractions should follow the same structure (logger, refs, cleanup).

## Common Pitfalls

### Pitfall 1: Breaking Existing Tests
**What goes wrong:** Tests mock modules by path. Moving ViewPage changes import paths.
**Why it happens:** Player.test.jsx imports from `../../src/Player.jsx` and mocks its dependencies.
**How to avoid:**
1. Keep Player.jsx as a thin re-export initially
2. Update test imports incrementally
3. Run tests after each extraction step
**Warning signs:** "Cannot find module" errors in tests

### Pitfall 2: Circular Dependencies
**What goes wrong:** ViewPage imports hooks, hooks might import from ViewPage for types.
**Why it happens:** Extracting to new files creates new import graph edges.
**How to avoid:**
1. Hooks should not import from pages
2. Types/constants go in separate files if shared
3. Use barrel exports to control public API
**Warning signs:** "Cannot access X before initialization"

### Pitfall 3: Lost Ref Connections
**What goes wrong:** Hooks that use refs from usePlayerPlayback lose connection after extraction.
**Why it happens:** useStuckDetection needs videoRef, lastVideoTimeRef from usePlayerPlayback.
**How to avoid:**
1. Pass refs as parameters to useStuckDetection
2. Document ref ownership clearly
3. Test ref updates work across hook boundaries
**Warning signs:** Stuck detection never triggers, refs always null

### Pitfall 4: Missing Cleanup in Extracted Hooks
**What goes wrong:** Intervals/timers not cleaned up when hook unmounts.
**Why it happens:** Copy-paste misses the useEffect cleanup return.
**How to avoid:**
1. Every setInterval needs a corresponding clearInterval in cleanup
2. Every setTimeout needs clearTimeout if component could unmount
3. Test unmount behavior explicitly
**Warning signs:** Memory leaks, "Can't perform state update on unmounted component"

### Pitfall 5: Context Not Actually Needed
**What goes wrong:** Creating PlayerContext when props drilling works fine.
**Why it happens:** PLAY-05 mentions `player/context/` but current code uses props.
**How to avoid:**
1. Only create context if 3+ components need same data
2. Current hooks already encapsulate state
3. Skip context creation unless proven necessary
**Warning signs:** Over-complicated state flow, unnecessary re-renders

## Code Examples

Verified patterns from the existing codebase:

### Existing Hook Pattern (useKioskMode)
```javascript
// Source: /Users/massimodamico/bizscreen/src/player/hooks/useKioskMode.js
export function useKioskMode() {
  const logger = useLogger('useKioskMode');
  const [kioskMode, setKioskMode] = useState(false);
  const [showKioskExit, setShowKioskExit] = useState(false);
  // ... state management

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.kioskMode);
    setKioskMode(saved === 'true');
  }, []);

  // Handlers
  const handleKioskExit = useCallback(() => {
    // ... implementation
  }, [kioskPasswordInput, logger]);

  return {
    kioskMode,
    showKioskExit,
    // ... all state and handlers
  };
}
```

### Hook Barrel Export Pattern
```javascript
// Source: /Users/massimodamico/bizscreen/src/player/hooks/index.js
export { usePlayerContent } from './usePlayerContent.js';
export { usePlayerHeartbeat } from './usePlayerHeartbeat.js';
export { usePlayerCommands } from './usePlayerCommands.js';
export { useKioskMode } from './useKioskMode.js';
export { usePlayerPlayback } from './usePlayerPlayback.js';
export { useTapSequence } from './useTapSequence.js';
// Add after extraction:
// export { useStuckDetection } from './useStuckDetection.js';
```

### Test Pattern for Hooks
```javascript
// Source: Pattern from @testing-library/react (React 18+)
import { renderHook, act } from '@testing-library/react';
import { useStuckDetection } from './useStuckDetection';

describe('useStuckDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onVideoStuck when video stalls', () => {
    const onVideoStuck = vi.fn();
    const videoRef = { current: { paused: false, ended: false, currentTime: 5 } };
    const lastVideoTimeRef = { current: 5 }; // Same as currentTime = stalled
    const lastActivityRef = { current: Date.now() - 35000 }; // 35s ago

    renderHook(() => useStuckDetection({
      videoRef,
      lastVideoTimeRef,
      lastActivityRef,
      onVideoStuck,
    }));

    // Advance past check interval
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onVideoStuck).toHaveBeenCalled();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic components | Custom hooks + composition | React 16.8+ | Better testability |
| `react-hooks-testing-library` | `@testing-library/react` with renderHook | React 18 | One fewer dependency |
| Manual timer testing | `vi.useFakeTimers()` | Vitest | Reliable timer tests |

**Deprecated/outdated:**
- **@testing-library/react-hooks:** Merged into @testing-library/react v13+ for React 18
- **Class components:** Project uses functional components exclusively

## Open Questions

Things that couldn't be fully resolved:

1. **PairPage Location**
   - What we know: PairPage is currently in `player/components/PairPage.jsx`
   - What's unclear: Should it move to `player/pages/` for consistency?
   - Recommendation: Keep in components for now (it works), can move later if desired

2. **Context Directory**
   - What we know: PLAY-05 mentions `player/context/` directory
   - What's unclear: Is context actually needed? Current code uses prop drilling
   - Recommendation: Skip context creation unless proven necessary. Create placeholder or skip.

3. **Line Count Verification**
   - What we know: Target is under 1000 lines total, Player.jsx specifically
   - What's unclear: Does "Player.jsx under 1000 lines" mean after ViewPage extraction?
   - Recommendation: After ViewPage extraction, Player.jsx should be ~50 lines. Total player module can be larger.

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/Player.jsx` - Current state (1,265 lines)
- `/Users/massimodamico/bizscreen/src/player/` - Existing extracted modules
- `/Users/massimodamico/bizscreen/.planning/phases/07-player-refactoring/07-RESEARCH.md` - Prior patterns
- [React Official Docs - Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

### Secondary (MEDIUM confidence)
- [Alex Kondov - Refactoring Messy React Components](https://alexkondov.com/refactoring-a-messy-react-component/)
- [Builder.io - Test Custom Hooks](https://www.builder.io/blog/test-custom-hooks-react-testing-library)
- [Kent C. Dodds - How to Test Custom Hooks](https://kentcdodds.com/blog/how-to-test-custom-react-hooks)

### Tertiary (LOW confidence)
- [Technostacks - React Best Practices 2026](https://technostacks.com/blog/react-best-practices/)
- [XpertLab - React.js Latest Features 2026](https://xpertlab.com/react-js-latest-features-and-best-practices-in-2026/)

## Metadata

**Confidence breakdown:**
- Current state analysis: HIGH - Direct codebase examination
- Architecture patterns: HIGH - Based on existing project patterns
- Extraction approach: HIGH - Follows Phase 7 proven patterns
- Pitfalls: HIGH - Derived from actual test structure and dependency analysis
- Hook testing: MEDIUM - Based on documentation, verify with actual tests

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - patterns are stable)

---

## Key Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Player.jsx lines | 1,265 | <100 | Extract ViewPage |
| ViewPage.jsx lines | N/A | ~1,100 | New file |
| Custom hooks | 6 | 7 | Add useStuckDetection |
| pages/ directory | Missing | Created | New directory |
| context/ directory | Missing | Optional | Skip if not needed |
| Widget components | 4 | 4 | Complete |
| Renderer components | 4 | 4 | Complete |
| Tests passing | ~1700 | ~1700 | No regression |

## Extraction Order

Recommended task sequence:

1. **24-01: Extract ViewPage and create pages directory**
   - Create `player/pages/` directory
   - Move ViewPage function to `player/pages/ViewPage.jsx`
   - Update Player.jsx to import from new location
   - Verify all tests pass

2. **24-02: Extract useStuckDetection hook**
   - Create `player/hooks/useStuckDetection.js`
   - Update ViewPage to use the hook
   - Add hook to barrel export
   - Add unit tests for the hook

3. **24-03: Final cleanup and verification**
   - Verify Player.jsx is under 100 lines
   - Verify all requirements met (PLAY-01 through PLAY-05)
   - Update any remaining test imports
   - Document final structure
