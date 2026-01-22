# Architecture Research: React Component Refactoring

**Domain:** React component refactoring for BizScreen digital signage platform
**Researched:** 2026-01-22
**Overall Confidence:** HIGH (based on codebase analysis and verified patterns)

## Executive Summary

This research addresses refactoring strategies for the BizScreen application's large React components, specifically:
- **Player.jsx** (3,476 lines) - TV player with offline support, playback, analytics
- **ScreensPage.jsx** (~1,900 lines) - Screen management dashboard
- **MediaLibraryPage.jsx** (~2,500 lines) - Media asset management
- **PlaylistEditorPage.jsx** (~1,300+ lines) - Playlist editing interface

The codebase uses React 19 with Context-based state management, Supabase real-time subscriptions, and IndexedDB for offline caching. The refactoring strategy must preserve offline capability while improving maintainability.

---

## Player.jsx Decomposition

### Current Structure Analysis

Player.jsx contains 5 distinct functional areas with significant coupling:

1. **Route Management** (~100 lines): Main Player component with Routes
2. **PairPage** (~350 lines): OTP pairing flow
3. **ViewPage** (~1,100 lines): Main playback orchestration
4. **SceneRenderer** (~500 lines): Scene-based content rendering
5. **Supporting Components** (~1,400 lines): SceneBlock, SceneWidgetRenderer, AppRenderer, LayoutRenderer

### Recommended Component Boundaries

```
src/player/
  index.jsx                  # Main Player with routes (export default)

  pages/
    PairPage.jsx            # OTP pairing UI
    ViewPage.jsx            # Main playback orchestration

  components/
    SceneRenderer.jsx       # Scene slide rendering
    SceneBlock.jsx          # Individual block in scene
    LayoutRenderer.jsx      # Multi-zone layout rendering
    ZoneRenderer.jsx        # Individual zone in layout
    AppRenderer.jsx         # App widget rendering
    widgets/
      ClockWidget.jsx       # Clock display
      WeatherWidget.jsx     # Weather display
      QRCodeWidget.jsx      # QR code display
      DateWidget.jsx        # Date display

  hooks/
    usePlayerContent.js     # Content loading, caching, polling
    usePlayerHeartbeat.js   # Heartbeat, status updates
    usePlayerCommands.js    # Device command handling
    usePlayerAnalytics.js   # Playback analytics
    useOfflineMode.js       # Offline detection, sync
    useKioskMode.js         # Kiosk mode management
    useStuckDetection.js    # Video stall recovery

  context/
    PlayerContext.jsx       # Shared player state (screenId, content, status)

  services/                 # Already exists in src/player/
    offlineService.js       # Keep as-is
    cacheService.js         # Keep as-is
```

### Hook Extraction Patterns for Player.jsx

**Pattern 1: usePlayerContent** - Extract content loading logic
```javascript
// Current: 150+ lines scattered in ViewPage useEffects
// Extract to: src/player/hooks/usePlayerContent.js

export function usePlayerContent(screenId) {
  const [content, setContent] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Encapsulates:
  // - Initial content fetch
  // - Polling for updates (30s interval)
  // - Offline fallback logic
  // - Content caching
  // - Shuffle logic

  const loadContent = useCallback(async (useRetry = false) => {
    // Move loadContent logic here
  }, [screenId]);

  const refreshContent = useCallback(() => {
    loadContent(false);
  }, [loadContent]);

  return {
    content,
    items,
    loading,
    error,
    connectionStatus,
    refreshContent,
    setItems, // For shuffle on cycle completion
  };
}
```

**Pattern 2: usePlayerHeartbeat** - Extract heartbeat logic
```javascript
// Current: 80+ lines in ViewPage useEffect
// Extract to: src/player/hooks/usePlayerHeartbeat.js

export function usePlayerHeartbeat(screenId, { onRefreshNeeded, onScreenshotRequest }) {
  const lastActivityRef = useRef(Date.now());

  // Encapsulates:
  // - 30s heartbeat interval
  // - Screenshot capture on request
  // - Refresh status checking
  // - Activity tracking

  useEffect(() => {
    if (!screenId) return;

    const sendBeat = async () => {
      const result = await updateDeviceStatus(screenId, PLAYER_VERSION);
      lastActivityRef.current = Date.now();

      if (result?.needs_screenshot_update) {
        onScreenshotRequest?.();
      }

      const refreshStatus = await checkDeviceRefreshStatus(screenId);
      if (refreshStatus?.needs_refresh) {
        onRefreshNeeded?.();
      }
    };

    sendBeat();
    const interval = setInterval(sendBeat, 30000);
    return () => clearInterval(interval);
  }, [screenId, onRefreshNeeded, onScreenshotRequest]);

  return { lastActivityRef };
}
```

**Pattern 3: useRealtimeCommands** - Extract command handling
```javascript
// Current: 100+ lines with subscription management
// Extract to: src/player/hooks/usePlayerCommands.js

export function usePlayerCommands(screenId, { onReload, onReset }) {
  // Encapsulates:
  // - Realtime subscription to device_commands
  // - Fallback polling if WebSocket fails
  // - Command execution (reboot, reload, clear_cache, reset)
  // - Result reporting

  const handleCommand = useCallback(async (command) => {
    const { commandId, commandType } = command;

    switch (commandType) {
      case 'reboot':
        await reportCommandResult(commandId, true);
        setTimeout(() => window.location.reload(), 500);
        break;
      case 'reload':
        await reportCommandResult(commandId, true);
        onReload?.();
        break;
      // ... other commands
    }
  }, [onReload, onReset]);

  useEffect(() => {
    if (!screenId) return;

    const unsubscribe = subscribeToDeviceCommands(screenId, handleCommand);
    return () => unsubscribe?.();
  }, [screenId, handleCommand]);
}
```

### Extraction Order for Player.jsx

1. **Phase 1: Extract Widgets** (Low risk, no state dependencies)
   - ClockWidget, DateWidget, WeatherWidget, QRCodeWidget
   - These are pure presentation components with internal state only
   - Test: Verify widget rendering in isolation

2. **Phase 2: Extract SceneBlock and SceneRenderer** (Medium risk)
   - Move SceneBlock to separate file
   - Move SceneRenderer with its animation logic
   - Keep resolvedBlocksMap state in ViewPage initially
   - Test: Scene playback with data bindings

3. **Phase 3: Extract Custom Hooks** (Higher risk - state dependencies)
   - Start with useStuckDetection (isolated, no shared state)
   - Then useKioskMode (isolated state)
   - Then usePlayerHeartbeat (depends on screenId only)
   - Then usePlayerCommands (depends on screenId, needs callbacks)
   - Finally usePlayerContent (most complex, central state)
   - Test after each extraction: Full playback flow

4. **Phase 4: Create PlayerContext** (Optional, for further decomposition)
   - Only if ViewPage becomes unwieldy after hook extraction
   - Share screenId, content, connectionStatus across components

---

## Page Component Patterns

### Current Issues in Page Components

Both ScreensPage and MediaLibraryPage exhibit:
- 15-25+ useState declarations
- 10+ useEffect hooks
- Multiple modal states mixed with data states
- Handler functions interspersed with rendering logic
- Sub-components defined in same file (~500-800 lines of sub-components)

### Recommended Extraction Pattern

**Pattern: Feature-based State Grouping with useReducer**

```javascript
// Before: 20+ useState calls
const [screens, setScreens] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [search, setSearch] = useState('');
const [locationFilter, setLocationFilter] = useState('all');
const [groupFilter, setGroupFilter] = useState('all');
const [showAddModal, setShowAddModal] = useState(false);
const [creatingScreen, setCreatingScreen] = useState(false);
const [createdScreen, setCreatedScreen] = useState(null);
// ... 15 more state variables

// After: Grouped by feature
const {
  screens,
  loading,
  error,
  refresh: refreshScreens
} = useScreensData();

const {
  search,
  locationFilter,
  groupFilter,
  setSearch,
  setLocationFilter,
  setGroupFilter,
  filteredScreens
} = useScreensFilters(screens);

const {
  showAddModal,
  creatingScreen,
  createdScreen,
  openAddModal,
  closeAddModal,
  handleCreateScreen
} = useAddScreenModal({ onScreenCreated: refreshScreens });
```

### Sub-Component Extraction Strategy

**Rule: Extract when component exceeds 50 lines or has distinct responsibility**

Current sub-components already defined inline in ScreensPage.jsx:
- DemoPairingBanner (~45 lines) - Keep inline or extract to shared
- LimitWarningBanner (~25 lines) - Keep inline
- NoScreensState (~15 lines) - Keep inline
- PromoCards (~30 lines) - Extract (marketing content)
- ScreenRow (~120 lines) - **Extract to file**
- ScreenActionMenu (~90 lines) - **Extract to file**
- AddScreenModal (~125 lines) - **Extract to file**
- LimitReachedModal (~55 lines) - **Extract to file**
- AnalyticsModal (~140 lines) - **Extract to file**
- ScreensErrorState (~40 lines) - Keep inline or move to shared
- EditScreenModal (~180 lines) - **Extract to file**
- KioskModeModal - Already separate

**Target Structure:**
```
src/pages/ScreensPage/
  index.jsx                    # Main page component (~400 lines)
  hooks/
    useScreensData.js          # Data fetching, real-time subscriptions
    useScreensFilters.js       # Search, filter state
    useScreenActions.js        # CRUD operations, assignments
    useBulkSelection.js        # Bulk selection state
  components/
    ScreenRow.jsx              # Table row
    ScreenActionMenu.jsx       # Context menu
    modals/
      AddScreenModal.jsx
      EditScreenModal.jsx
      AnalyticsModal.jsx
      LimitReachedModal.jsx
```

### Hook Extraction Example: useScreensData

```javascript
// src/pages/ScreensPage/hooks/useScreensData.js

export function useScreensData() {
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [screenGroups, setScreenGroups] = useState([]);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [screensData, playlistsData, layoutsData, schedulesData, locationsData, groupsData, limitsData] =
        await Promise.all([
          fetchScreensService(),
          fetchPlaylists(),
          fetchLayouts(),
          fetchSchedules(),
          fetchLocations(),
          fetchScreenGroups(),
          getEffectiveLimits(),
        ]);

      setScreens(screensData || []);
      setPlaylists(playlistsData || []);
      setLayouts(layoutsData.data || []);
      setSchedules(schedulesData || []);
      setLocations(locationsData.data || []);
      setScreenGroups(groupsData || []);
      setLimits(limitsData);
    } catch (err) {
      setError(err.message || 'Failed to load screens data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('screens-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'screens' },
        (payload) => {
          // Handle insert/update/delete
          if (payload.eventType === 'INSERT') {
            setScreens(prev => [payload.new, ...prev]);
          }
          // ... other event types
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    screens,
    setScreens, // For optimistic updates
    playlists,
    layouts,
    schedules,
    locations,
    screenGroups,
    limits,
    loading,
    error,
    refresh: loadData,
  };
}
```

---

## State Management Approach

### Current Pattern Assessment

The codebase currently uses:
- **AuthContext**: Global user authentication (works well)
- **BrandingContext**: Tenant branding (works well)
- **useState/useEffect**: All page-level state (causes issues at scale)

### Recommended Approach

**Keep Context for truly global state** (auth, branding, i18n). For page-level state, use **custom hooks with useState/useReducer** rather than adding more Context providers.

**Rationale:**
- The codebase has no performance issues from re-renders (confirmed by existing patterns)
- Adding Context for page state would require significant restructuring
- Custom hooks provide the same code organization benefits
- React 19 Compiler handles memoization automatically (Context7 source: [React 19 Compiler](https://react.dev/blog/2024/12/05/react-19))

### When to Use useReducer

Convert useState to useReducer when:
1. **5+ related state variables** that change together
2. **Complex state transitions** (e.g., modal flows)
3. **State depends on previous state** frequently

**Example: Modal State Reducer**
```javascript
// Instead of:
const [showAddModal, setShowAddModal] = useState(false);
const [creating, setCreating] = useState(false);
const [createdItem, setCreatedItem] = useState(null);
const [error, setError] = useState(null);

// Use:
const modalReducer = (state, action) => {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true, error: null };
    case 'START_CREATE':
      return { ...state, creating: true, error: null };
    case 'CREATE_SUCCESS':
      return { ...state, creating: false, createdItem: action.payload };
    case 'CREATE_ERROR':
      return { ...state, creating: false, error: action.payload };
    case 'CLOSE':
      return { isOpen: false, creating: false, createdItem: null, error: null };
    default:
      return state;
  }
};

const [modalState, dispatch] = useReducer(modalReducer, {
  isOpen: false,
  creating: false,
  createdItem: null,
  error: null,
});
```

### State Management Decision Tree

```
Is this state needed across multiple unrelated components?
├── YES → Is it truly global (auth, theme, i18n)?
│         ├── YES → Use Context
│         └── NO → Lift state to common ancestor + props
└── NO → Is this state complex (5+ variables, complex transitions)?
          ├── YES → Custom hook with useReducer
          └── NO → useState in component
```

---

## Testing During Refactoring

### Existing Test Infrastructure

The project has solid test coverage:
- **Unit tests**: Vitest in `/tests/unit/` (services focus)
- **Integration tests**: Vitest in `/tests/integration/` (API tests)
- **E2E tests**: Playwright in `/tests/e2e/`
- **Test utilities**: Factory functions in `/tests/utils/factories.js`

### Testing Strategy for Refactoring

**Principle: Test behavior, not implementation** ([React Testing Library best practice](https://testing-library.com/docs/guiding-principles/))

**Before refactoring Player.jsx:**
1. Add E2E tests covering critical paths:
   - Pairing flow (OTP entry, connection)
   - Playlist playback (item rotation, duration timing)
   - Scene rendering (block display, widget updates)
   - Offline fallback (cache loading)
   - Command execution (reboot, reload)

2. Add integration tests for extracted hooks:
   - usePlayerContent: mock API, verify state transitions
   - usePlayerHeartbeat: mock timers, verify intervals
   - useOfflineMode: mock navigator.onLine, verify sync

**Test Patterns for Extracted Hooks:**

```javascript
// tests/unit/player/hooks/usePlayerContent.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayerContent } from '@/player/hooks/usePlayerContent';

// Mock the services
vi.mock('@/services/playerService', () => ({
  getResolvedContent: vi.fn(),
}));

vi.mock('@/player/offlineService', () => ({
  getCachedContent: vi.fn(),
  cacheContent: vi.fn(),
}));

describe('usePlayerContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load content on mount', async () => {
    const mockContent = { type: 'playlist', playlist: { id: '123' } };
    getResolvedContent.mockResolvedValueOnce(mockContent);

    const { result } = renderHook(() => usePlayerContent('screen-123'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(mockContent);
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('should fall back to cache when offline', async () => {
    const cachedContent = { type: 'playlist', playlist: { id: '456' } };
    getResolvedContent.mockRejectedValueOnce(new Error('Network error'));
    getCachedContent.mockResolvedValueOnce(cachedContent);

    const { result } = renderHook(() => usePlayerContent('screen-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(cachedContent);
    expect(result.current.connectionStatus).toBe('offline');
  });
});
```

### Regression Prevention Checklist

Before each refactoring phase:
- [ ] All existing tests pass
- [ ] E2E critical path coverage exists
- [ ] Manual smoke test documented

After each extraction:
- [ ] Run full test suite
- [ ] Manual test the specific feature
- [ ] Verify offline mode still works (Player.jsx specific)
- [ ] Check real-time subscriptions still function

---

## Recommended Refactoring Order

### Dependency-Aware Sequence

**Phase 1: Low-Risk Extractions (Week 1)**
```
1.1 Player.jsx widgets → src/player/components/widgets/
    - ClockWidget, DateWidget, WeatherWidget, QRCodeWidget
    - No state dependencies, pure presentation
    - Test: Visual verification

1.2 ScreensPage sub-components → src/components/screens/
    - ScreenRow, ScreenActionMenu (already well-bounded)
    - Modals: AddScreenModal, EditScreenModal, AnalyticsModal
    - Test: Modal open/close, form submission

1.3 MediaLibraryPage sub-components → src/components/media/
    - MediaGridCard, MediaListRow (already well-bounded)
    - FolderGridCard, FolderBreadcrumbs
    - Test: Grid rendering, drag-drop
```

**Phase 2: Hook Extractions (Week 2)**
```
2.1 Create useScreensData hook
    - Extract all data fetching from ScreensPage
    - Include real-time subscription
    - Test: Data loading, real-time updates

2.2 Create useScreensFilters hook
    - Extract search, filter state
    - Test: Filter application

2.3 Create useMediaLibraryData hook
    - Similar pattern to useScreensData
    - Include folder navigation state
    - Test: Folder navigation, media loading

2.4 Create Player hooks (order matters):
    a. useStuckDetection (no dependencies)
    b. useKioskMode (localStorage only)
    c. usePlayerHeartbeat (screenId dependency)
    d. usePlayerCommands (screenId, callbacks)
    e. usePlayerContent (most complex)
    Test: Full playback flow after each
```

**Phase 3: Scene/Layout Extraction (Week 3)**
```
3.1 Extract SceneRenderer + SceneBlock
    - Keep data binding resolution in ViewPage initially
    - Test: Scene playback, slide transitions

3.2 Extract LayoutRenderer + ZoneRenderer
    - Test: Multi-zone layout rendering

3.3 Move PairPage to separate file
    - Test: Pairing flow
```

**Phase 4: Final Restructuring (Week 4)**
```
4.1 Create src/player/ directory structure
4.2 Move extracted components to new locations
4.3 Update all imports
4.4 Create index exports
4.5 Full regression test suite
```

### Risk Mitigation

**High-Risk Areas:**
- **Offline sync in Player.jsx**: Test offline mode after every change
- **Real-time subscriptions**: Verify subscriptions reconnect after extraction
- **Timer-based logic**: Ensure intervals/timeouts clean up properly

**Rollback Strategy:**
- Feature branch for each phase
- Commit after each successful extraction
- Keep original file as `.backup` until phase complete

---

## Sources and References

### Official Documentation
- [React Official: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React Official: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React Testing Library Principles](https://testing-library.com/docs/guiding-principles/)

### Community Best Practices
- [Common Sense Refactoring of a Messy React Component - Alex Kondov](https://alexkondov.com/refactoring-a-messy-react-component/)
- [Extract React Hook Refactoring - Radoslav Stankov](https://blog.rstankov.com/extract-react-hook-refactoring/)
- [Refactoring Components in React with Custom Hooks - CodeScene](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks)
- [Splitting Components in React - Medium](https://thiraphat-ps-dev.medium.com/splitting-components-in-react-a-path-to-cleaner-and-more-maintainable-code-f0828eca627c)

### State Management
- [State Management Trends in React 2025 - Makers Den](https://makersden.io/blog/react-state-management-in-2025)
- [React State Management 2025 - Developer Way](https://www.developerway.com/posts/react-state-management-2025)
- [State Management in 2026 - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)

### Testing
- [React Component Testing Best Practices 2025 - DEV Community](https://dev.to/tahamjp/react-component-testing-best-practices-for-2025-2674)
- [Testing in 2026: Jest, React Testing Library - Nucamp](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies)

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Component boundaries | HIGH | Based on actual codebase analysis |
| Hook extraction patterns | HIGH | Standard React patterns + verified with React docs |
| State management approach | HIGH | Matches existing codebase patterns |
| Testing strategy | HIGH | Project already has Vitest + Playwright infrastructure |
| Offline capability preservation | MEDIUM | Requires careful testing after each change |
| Refactoring order | HIGH | Based on dependency analysis of actual code |

---

## Summary for Roadmap

**Recommended Phase Structure:**

1. **Phase: Widget/Sub-component Extraction** (Low risk)
   - Duration: 1 week
   - Research needed: None
   - Outputs: 15-20 new component files

2. **Phase: Custom Hook Extraction** (Medium risk)
   - Duration: 1-2 weeks
   - Research needed: None (patterns documented here)
   - Outputs: 10-15 new hook files

3. **Phase: Directory Restructuring** (Low risk)
   - Duration: 2-3 days
   - Research needed: None
   - Outputs: New directory structure, updated imports

**Key Constraints:**
- Player.jsx offline capability MUST work after every change
- Real-time subscriptions MUST reconnect properly
- No new dependencies required (React 19 + existing stack sufficient)
- Test coverage must increase, not decrease
