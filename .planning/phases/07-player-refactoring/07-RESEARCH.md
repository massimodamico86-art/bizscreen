# Phase 7: Player Refactoring - Research

**Researched:** 2026-01-23
**Domain:** React Component Decomposition, Custom Hooks Extraction
**Confidence:** HIGH

## Summary

This research investigates how to decompose Player.jsx (3,495 lines) into focused, testable components under 500 lines each. The file contains a mix of concerns: UI components (widgets, renderers), business logic (retry, heartbeat, commands), and page-level routing. React best practices strongly favor custom hooks for logic extraction and component decomposition for UI separation.

The key insight is that Player.jsx contains several distinct domains that can be cleanly separated:
1. **Content management hooks** - Loading, caching, polling, and offline fallback
2. **Communication hooks** - Heartbeat, commands, realtime subscriptions
3. **Playback hooks** - Slide timing, video control, analytics
4. **Widget components** - Clock, Weather, QR Code, Date widgets
5. **Renderer components** - Scene, Layout, Zone, Block rendering

**Primary recommendation:** Extract custom hooks for stateful logic (usePlayerContent, usePlayerHeartbeat, usePlayerCommands), move widget components to separate files, consolidate retry logic to use calculateBackoff from playerService, and maintain 100% test compatibility throughout.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | Component framework | Project foundation |
| Vitest | Current | Testing framework | Already established for Player tests |
| React Router | 6+ | Routing | Already used for /player routes |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | Current | Component testing | Already used in 167 Player tests |
| qrcode.react | Current | QR code generation | Used by QR widget |
| lucide-react | Current | Icons | Used in SocialFeedRenderer |

### No New Dependencies Required
This refactoring is purely structural - no new libraries needed. The existing test infrastructure, hooks pattern (useLogger), and component patterns are sufficient.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── Player.jsx                    # ~200 lines - Router only
├── player/                       # Player-specific modules
│   ├── hooks/                    # Custom hooks
│   │   ├── usePlayerContent.js   # Content loading, caching, polling
│   │   ├── usePlayerHeartbeat.js # Heartbeat, device status, screenshots
│   │   ├── usePlayerCommands.js  # Command handling, realtime subscriptions
│   │   ├── usePlayerPlayback.js  # Slide timing, video control, analytics
│   │   └── useKioskMode.js       # Kiosk mode state and exit handling
│   ├── components/               # UI components
│   │   ├── widgets/              # Widget components
│   │   │   ├── ClockWidget.jsx   # Time/date display
│   │   │   ├── WeatherWidget.jsx # Weather display
│   │   │   ├── QRCodeWidget.jsx  # QR code generation
│   │   │   └── DateWidget.jsx    # Date-only display
│   │   ├── SceneRenderer.jsx     # Scene slide rendering
│   │   ├── LayoutRenderer.jsx    # Multi-zone layout
│   │   ├── ZonePlayer.jsx        # Single zone content
│   │   ├── SceneBlock.jsx        # Individual blocks
│   │   ├── AppRenderer.jsx       # App type routing
│   │   └── ConnectionStatus.jsx  # Status indicator
│   ├── pages/                    # Full-page components
│   │   ├── PairPage.jsx          # OTP pairing
│   │   └── ViewPage.jsx          # Main playback
│   └── offlineService.js         # Already exists
├── hooks/                        # Shared hooks (existing)
│   └── useLogger.js              # Already exists
└── components/player/            # Already exists
    └── SocialFeedRenderer.jsx    # Keep existing location
```

### Pattern 1: Custom Hook Extraction
**What:** Extract stateful logic into custom hooks that return state and handlers
**When to use:** When component has complex useEffect chains, multiple useState calls managing related state, or reusable business logic
**Example:**
```javascript
// Source: Existing useLogger pattern + React best practices
// hooks/usePlayerContent.js
export function usePlayerContent(screenId) {
  const logger = useLogger('usePlayerContent');
  const [content, setContent] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const loadContent = useCallback(async (useRetry = false) => {
    // Content loading logic with retry and offline fallback
  }, [screenId, logger]);

  const advanceToNext = useCallback(() => {
    // Advance logic
  }, [items.length]);

  return {
    content,
    items,
    currentIndex,
    loading,
    error,
    connectionStatus,
    isOfflineMode,
    loadContent,
    advanceToNext,
    setCurrentIndex,
  };
}
```

### Pattern 2: Widget Component Extraction
**What:** Pure presentational components that receive props and render UI
**When to use:** For self-contained visual elements with minimal state (time updates, weather)
**Example:**
```javascript
// Source: Existing ClockApp pattern in Player.jsx
// components/widgets/ClockWidget.jsx
export function ClockWidget({ config, deviceTimezone }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Formatting logic
  const formatTime = () => { /* ... */ };
  const formatDate = () => { /* ... */ };

  return (
    <div style={containerStyle}>
      <p style={timeStyle}>{formatTime()}</p>
      {config.showDate !== false && (
        <p style={dateStyle}>{formatDate()}</p>
      )}
    </div>
  );
}
```

### Pattern 3: Retry Logic Consolidation (PLR-01 Fix)
**What:** Replace local getRetryDelay with calculateBackoff from playerService
**When to use:** Any retry logic in Player.jsx
**Example:**
```javascript
// BEFORE (Player.jsx lines 117-124) - 0-25% jitter
function getRetryDelay(attempt) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  return delay + Math.random() * delay * 0.25;
}

// AFTER - Use calculateBackoff with 0-100% full jitter
import { calculateBackoff } from '../services/playerService';

async function retryWithBackoff(fn, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = calculateBackoff(attempt, RETRY_CONFIG.baseDelayMs, RETRY_CONFIG.maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
```

### Anti-Patterns to Avoid
- **Big Bang Refactoring:** Don't try to extract everything in one commit. Incremental extraction with test verification is safer.
- **Breaking Test Mocks:** Tests mock specific service imports. Changing import paths without updating mocks breaks tests.
- **Premature Abstraction:** Don't create hooks for single-use logic. The useAppData hook stays in Player.jsx since it's tightly coupled.
- **Circular Dependencies:** Hooks should not import from components that use them.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff | getRetryDelay() in Player.jsx | calculateBackoff() from playerService | Already handles full jitter (0-100%), tested |
| Scoped logging | Custom console wrappers | useLogger hook + createScopedLogger | PII redaction, structured logging |
| QR Code rendering | Custom canvas drawing | qrcode.react (QRCodeSVG) | Already in use, handles error correction |
| Weather data | Direct API calls | getWeather from weatherService | Handles caching, rate limiting |
| Component testing | Custom render helpers | @testing-library/react patterns | Already established in 167 tests |

**Key insight:** The existing test mocks in Player.*.test.jsx files are the contract. Any refactoring must maintain the same mock interfaces.

## Common Pitfalls

### Pitfall 1: Breaking Test Mock Paths
**What goes wrong:** Tests mock modules by path (e.g., `vi.mock('../../../src/services/playerService')`). Moving functions to new files breaks these paths.
**Why it happens:** Refactoring changes import structure, but test mocks aren't updated.
**How to avoid:**
1. Keep service imports unchanged initially
2. Re-export from original locations if needed
3. Update all test files when changing paths
**Warning signs:** Tests fail with "Cannot find module" errors

### Pitfall 2: State Synchronization Across Hooks
**What goes wrong:** Multiple hooks manage related state independently, causing inconsistent UI.
**Why it happens:** Extracting hooks without considering shared state dependencies.
**How to avoid:**
1. Pass shared state down from ViewPage
2. Use refs for callbacks that need access to current state
3. Keep related state in a single hook
**Warning signs:** UI flickers, stale data, race conditions

### Pitfall 3: Losing Ref Dependencies
**What goes wrong:** useEffect cleanup functions use stale refs after refactoring.
**Why it happens:** Refs like loadContentRef.current are used to avoid dependency cycles.
**How to avoid:**
1. Keep the ref pattern when extracting hooks
2. Document why refs are used instead of dependencies
3. Test cleanup behavior explicitly
**Warning signs:** Memory leaks, stale callbacks

### Pitfall 4: Widget Timer Conflicts
**What goes wrong:** Multiple widget instances (ClockWidget) create overlapping intervals.
**Why it happens:** Each widget component manages its own timer state.
**How to avoid:**
1. Each widget instance should have its own isolated timer
2. Cleanup on unmount is critical
3. Consider shared time context if many clocks needed (not current case)
**Warning signs:** High CPU, memory leaks in dev tools

### Pitfall 5: Premature Component Splitting
**What goes wrong:** Extracting components that are only used once adds complexity without benefit.
**Why it happens:** Following "component per file" dogma instead of practical judgment.
**How to avoid:**
1. Extract only when: reusability, testability, or file size demands it
2. Keep one-off render sections inline
3. Connection status indicator can stay in ViewPage (small, single-use)
**Warning signs:** Many small files with tight coupling

## Code Examples

Verified patterns from the existing codebase:

### Hook Pattern (from useLogger.js)
```javascript
// Source: /Users/massimodamico/bizscreen/src/hooks/useLogger.js
import { useMemo } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

export function useLogger(componentName) {
  return useMemo(() => createScopedLogger(componentName), [componentName]);
}
```

### Test Mock Pattern (from Player.heartbeat.test.jsx)
```javascript
// Source: /Users/massimodamico/bizscreen/tests/unit/player/Player.heartbeat.test.jsx
vi.mock('../../../src/services/playerService', () => ({
  updateDeviceStatus: vi.fn().mockResolvedValue({ needs_screenshot_update: false }),
  calculateBackoff: vi.fn().mockReturnValue(1000),
  // ... all exports must be mocked
  COMMAND_POLL_INTERVAL: 10000,
  HEARTBEAT_INTERVAL: 30000,
}));
```

### Widget Component Pattern (from Player.jsx ClockApp)
```javascript
// Source: /Users/massimodamico/bizscreen/src/Player.jsx lines 649-723
function ClockApp({ config, deviceTimezone }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const tz = config.timezone === 'device' ? deviceTimezone : config.timezone;

  // ... rendering
}
```

### Ref Pattern for Avoiding Dependency Cycles
```javascript
// Source: /Users/massimodamico/bizscreen/src/Player.jsx lines 2515-2518
// Store loadContent in ref for use in heartbeat effect
useEffect(() => {
  loadContentRef.current = loadContent;
}, [loadContent]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components | Function components + hooks | React 16.8+ | All new code uses hooks |
| Container/presenter | Custom hooks for logic | 2020+ | Hooks replace HOCs for state |
| Redux for everything | Local state + hooks | 2020+ | Simpler for component-local state |
| Jest for testing | Vitest | Project-specific | Faster, ESM-native |

**Deprecated/outdated:**
- **Class components:** Project uses function components exclusively
- **HOCs for shared state:** Custom hooks are the modern approach
- **Global mutable state:** Refs + useState provide controlled state

## Open Questions

Things that couldn't be fully resolved:

1. **Widget Component Location**
   - What we know: Widgets are currently inline in Player.jsx
   - What's unclear: Should widgets go in `src/player/components/widgets/` or `src/components/player/widgets/`?
   - Recommendation: Use `src/player/components/widgets/` to keep player-specific code together

2. **Test File Updates**
   - What we know: 167 tests across 6 files mock specific import paths
   - What's unclear: Exactly which tests need mock path updates
   - Recommendation: Each extraction task must include test verification step

3. **App Renderer Complexity**
   - What we know: AppRenderer is a routing component for app types
   - What's unclear: Whether to keep it with widgets or as a separate component
   - Recommendation: Keep AppRenderer in Player.jsx initially, extract later if needed

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/Player.jsx` - Full component analyzed (3,495 lines)
- `/Users/massimodamico/bizscreen/src/hooks/useLogger.js` - Existing hook pattern
- `/Users/massimodamico/bizscreen/src/services/playerService.js` - calculateBackoff implementation
- `/Users/massimodamico/bizscreen/tests/unit/player/Player.*.test.jsx` - Test patterns (167 tests)
- [React Official Docs - Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

### Secondary (MEDIUM confidence)
- [Codescene - Refactoring React with Custom Hooks](https://codescene.com/engineering-blog/refactoring-components-in-react-with-custom-hooks) - Hook extraction patterns
- [Alex Kondov - Refactoring Messy React Components](https://alexkondov.com/refactoring-a-messy-react-component/) - Practical refactoring approach
- [Frontend Mastery - Component Composition](https://frontendmastery.com/posts/advanced-react-component-composition-guide/) - Decomposition patterns

### Tertiary (LOW confidence)
- Web search results for "React 2026 patterns" - General guidance, verify specific claims

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing patterns
- Architecture: HIGH - Based on existing project patterns (useLogger, SocialFeedRenderer)
- Pitfalls: HIGH - Derived from actual test structure and code analysis
- Code examples: HIGH - All examples from actual codebase

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - patterns are stable)

---

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Player.jsx lines | 3,495 | <500 |
| Custom hooks | 0 | 4-5 |
| Widget components | Inline | 4 separate files |
| Tests passing | 167 | 167 (no regression) |
| PLR-01 gap fixed | No | Yes (use calculateBackoff) |
