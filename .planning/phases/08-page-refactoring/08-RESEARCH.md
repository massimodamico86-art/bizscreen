# Phase 8: Page Refactoring - Research

**Researched:** 2026-01-23
**Domain:** React Page Decomposition, Custom Hooks Extraction
**Confidence:** HIGH

## Summary

This research investigates how to decompose five large page components into maintainable sub-components under 500 lines each. The files are: MediaLibraryPage.jsx (2543 lines), ScreensPage.jsx (1931 lines), PlaylistEditorPage.jsx (1917 lines), CampaignEditorPage.jsx (1392 lines), and FeatureFlagsPage.jsx (1339 lines). The total target is 9122 lines across 5 files.

Phase 7 established the proven pattern: extract custom hooks into a `hooks/` folder with barrel exports, test hooks with renderHook and localStorage mocking, and maintain component structure while reducing cognitive load. Player.jsx was reduced from 3495 to 2775 lines (720 lines, 21% reduction) through hook extraction.

The pages share common patterns: data fetching with Supabase, modal state management, bulk selection, filter/search state, pagination, and CRUD operations. Unlike the Player component which had unique concerns (heartbeat, commands, kiosk mode), these pages have overlapping patterns that could potentially share hooks.

**Primary recommendation:** Apply the Phase 7 hook extraction pattern per-page, creating page-specific hooks (e.g., `useMediaLibrary`, `useScreensData`) in `src/pages/hooks/` or co-located `src/pages/{PageName}/hooks/`. Extract hooks for: data fetching/state, filter/search management, modal state, bulk selection, and CRUD operations. Reuse existing hooks like `useMedia`, `useMediaFolders` where appropriate.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component framework | Project foundation |
| Vitest | Current | Testing framework | Already established in project |
| @testing-library/react | Current | Hook/component testing | renderHook for hook tests |
| lucide-react | Current | Icons | Used across all pages |
| Supabase | Current | Database/Auth | Data layer for all pages |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | 6+ | Routing | Navigation, useParams |
| design-system | Internal | UI components | PageLayout, Modal, Button, etc. |

### Existing Hooks to Leverage
| Hook | Location | Can Replace |
|------|----------|-------------|
| `useMedia` | `src/hooks/useMedia.js` | Media fetching in MediaLibraryPage |
| `useMediaFolders` | `src/hooks/useMediaFolders.js` | Folder operations in MediaLibraryPage/PlaylistEditorPage |
| `useLogger` | `src/hooks/useLogger.js` | Logging in all pages |
| `useS3Upload` | `src/hooks/useS3Upload.jsx` | Upload functionality |
| `useDropZone` | `src/components/media` | Drag-drop in MediaLibraryPage |

### No New Dependencies Required
This refactoring is purely structural - no new libraries needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   ├── hooks/                      # Shared page hooks (if patterns converge)
│   │   ├── index.js                # Barrel export
│   │   ├── useBulkSelection.js     # Generic bulk selection logic
│   │   ├── useFilterState.js       # Generic filter/search state
│   │   └── useModalState.js        # Generic modal state management
│   │
│   ├── MediaLibraryPage/           # Option A: Feature folder
│   │   ├── index.jsx               # Re-export
│   │   ├── MediaLibraryPage.jsx    # Main component
│   │   ├── hooks/
│   │   │   └── useMediaLibrary.js  # Page-specific hook
│   │   └── components/             # Page-specific components (optional)
│   │
│   ├── MediaLibraryPage.jsx        # Option B: Single file + hooks
│   ├── ScreensPage.jsx
│   ├── PlaylistEditorPage.jsx
│   ├── CampaignEditorPage.jsx
│   └── FeatureFlagsPage.jsx
```

**Recommendation:** Use Option B (current structure + new hooks folder) unless a page benefits from feature folder organization. This aligns with existing project conventions and minimizes churn.

### Pattern 1: Page-Specific Data Hook
**What:** Extract all data fetching, state management, and CRUD operations into a single custom hook
**When to use:** When a page has complex state management (5+ useState calls) and multiple data operations
**Example:**
```javascript
// Source: Phase 7 pattern from usePlayerContent.js
// src/pages/hooks/useMediaLibrary.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createScopedLogger } from '../../services/loggingService.js';
import { fetchMediaAssets, deleteMediaAssetSafely, getMediaUsage } from '../../services/mediaService';
import { getEffectiveLimits } from '../../services/limitsService';

const logger = createScopedLogger('useMediaLibrary');

/**
 * Custom hook for MediaLibraryPage data management
 *
 * @param {Object} options - Hook options
 * @param {Function} options.showToast - Toast notification callback
 * @returns {Object} Media library state and actions
 */
export function useMediaLibrary({ showToast }) {
  const { userProfile } = useAuth();

  // Data state
  const [mediaAssets, setMediaAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);

  // Actions
  const fetchAssets = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const result = await fetchMediaAssets({
        type: filter,
        search,
        page,
        folderId: currentFolderId
      });
      setMediaAssets(result.data || []);
      setTotalCount(result.totalCount || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      logger.error('Error fetching media', { error: err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, search, currentFolderId, currentPage]);

  const handleDelete = useCallback(async (assetId, force = false) => {
    try {
      const result = await deleteMediaAssetSafely(assetId, { force });
      if (result.success) {
        setMediaAssets(prev => prev.filter(a => a.id !== assetId));
        showToast?.('Media deleted successfully');
        return { success: true };
      }
      return result;
    } catch (err) {
      logger.error('Error deleting media', { error: err, assetId });
      showToast?.(err.message, 'error');
      return { success: false, error: err.message };
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    getEffectiveLimits().then(setLimits).catch(err => {
      logger.error('Error fetching limits', { error: err });
    });
  }, []);

  return {
    // State
    mediaAssets,
    loading,
    error,
    limits,
    currentPage,
    totalCount,
    totalPages,
    filter,
    search,
    currentFolderId,

    // Setters
    setFilter,
    setSearch,
    setCurrentFolderId,
    setCurrentPage,

    // Actions
    fetchAssets,
    handleDelete,
    refreshAssets: () => fetchAssets(currentPage),
  };
}
```

### Pattern 2: Bulk Selection Hook
**What:** Extract bulk selection logic that's repeated across multiple pages
**When to use:** When multiple pages (MediaLibraryPage, ScreensPage) have identical bulk selection patterns
**Example:**
```javascript
// src/pages/hooks/useBulkSelection.js
import { useState, useCallback } from 'react';

/**
 * Generic hook for bulk item selection
 * Used by MediaLibraryPage, ScreensPage
 *
 * @returns {Object} Selection state and handlers
 */
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds) => {
    setSelectedIds(new Set(allIds));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    hasSelection: selectedIds.size > 0,
  };
}
```

### Pattern 3: Modal State Hook
**What:** Consolidate multiple modal-related useState calls into a single hook
**When to use:** When a page has 3+ modals with similar show/hide patterns
**Example:**
```javascript
// src/pages/hooks/useModalState.js
import { useState, useCallback } from 'react';

/**
 * Hook to manage multiple modal states
 *
 * @param {string[]} modalNames - Names of modals to manage
 * @returns {Object} Modal states and controls
 */
export function useModalState(modalNames) {
  const initialState = modalNames.reduce((acc, name) => {
    acc[name] = false;
    return acc;
  }, {});

  const [modals, setModals] = useState(initialState);
  const [editingItem, setEditingItem] = useState(null);

  const openModal = useCallback((name, item = null) => {
    setEditingItem(item);
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name) => {
    setModals(prev => ({ ...prev, [name]: false }));
    setEditingItem(null);
  }, []);

  return {
    modals,
    editingItem,
    openModal,
    closeModal,
    setEditingItem,
  };
}

// Usage:
// const { modals, editingItem, openModal, closeModal } = useModalState(['upload', 'delete', 'detail']);
// modals.upload, modals.delete, modals.detail are booleans
// openModal('upload') / closeModal('upload')
```

### Pattern 4: Sub-Component Extraction (Already Done in Most Pages)
**What:** Extract inline render functions into named components
**When to use:** When a component has inline JSX functions that could be reusable or testable
**Observation:** The target pages already follow this pattern well. MediaLibraryPage has LimitWarningBanner, MediaListRow, MediaGridCard, FolderGridCard, etc. as separate functions. This pattern is already applied and doesn't need additional extraction.

### Anti-Patterns to Avoid
- **Over-extraction:** Don't create a hook for a single useState. The value of hooks is combining related state.
- **Premature Shared Hooks:** Don't create shared hooks until 2+ pages need identical logic. Start page-specific.
- **Breaking Existing Hooks:** MediaLibraryPage already uses useMediaFolders - don't recreate that logic.
- **Circular Dependencies:** Page hooks should not import from components that use them.
- **State Synchronization Issues:** When extracting hooks, ensure related state stays together (e.g., pagination state with filter state).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Media fetching with filters | Custom fetch logic | `useMedia` hook | Already handles pagination, filters, sorting |
| Folder operations | Custom folder state | `useMediaFolders` hook | Handles path, create, navigate |
| File uploads | Custom upload logic | `useS3Upload` hook | Handles presigned URLs, progress |
| Drag-drop on media | Custom drag handlers | `useDropZone` from components/media | Already integrated |
| Logging | console.log | `useLogger` hook | PII redaction, structured logging |
| Scoped logging in hooks | Custom console wrappers | `createScopedLogger` | Works outside React component lifecycle |

**Key insight:** The pages already import and use several existing hooks. The refactoring should leverage these, not replace them.

## Common Pitfalls

### Pitfall 1: Breaking Existing Hook Imports
**What goes wrong:** Pages already import hooks like `useMediaFolders`, `useS3Upload`. Refactoring might accidentally remove or break these.
**Why it happens:** Not auditing existing hook usage before extraction.
**How to avoid:**
1. List all existing hook imports before refactoring
2. Ensure new hooks call/compose existing hooks rather than replace
3. Test that all existing functionality still works
**Warning signs:** Features stop working after extraction

### Pitfall 2: State Coupling Across Hooks
**What goes wrong:** Extracting pagination into one hook and filters into another, but they need to sync (changing filter resets page).
**Why it happens:** Separating by "type of state" rather than "domain of functionality".
**How to avoid:**
1. Keep related state together (filters + pagination + data = one hook)
2. Return setters that handle cross-state effects
3. Test state transitions explicitly
**Warning signs:** UI flickers, inconsistent states, stale data

### Pitfall 3: Over-Extraction of Sub-Components
**What goes wrong:** Creating many small files for single-use components that are already clearly defined inline.
**Why it happens:** Following "one component per file" dogma.
**How to avoid:**
1. The pages already have good sub-component structure (LimitWarningBanner, ScreenRow, etc.)
2. Only extract to separate files if: reused elsewhere, or file size still too large after hook extraction
3. Focus on hook extraction first, component extraction only if needed
**Warning signs:** Many new files with tight coupling to parent

### Pitfall 4: Losing Error Boundaries
**What goes wrong:** Error handling in page components gets lost when logic moves to hooks.
**Why it happens:** try/catch blocks don't transfer cleanly to hooks.
**How to avoid:**
1. Return error state from hooks
2. Keep error display logic in the component
3. Test error states explicitly
**Warning signs:** Unhandled rejections, silent failures

### Pitfall 5: Test Mock Path Changes
**What goes wrong:** If hooks are placed in new locations, existing test mocks might need updates.
**Why it happens:** Mocks reference specific import paths.
**How to avoid:**
1. Current pages have minimal test coverage (only DashboardPage, HelpCenterPage have tests)
2. When adding new tests, use the Phase 7 pattern from Player.hooks.test.jsx
3. Mock at the service layer, not the hook layer where possible
**Warning signs:** Tests fail with "Cannot find module" errors

## Code Examples

Verified patterns from the existing codebase:

### Existing Hook Pattern (useMedia.js)
```javascript
// Source: /Users/massimodamico/bizscreen/src/hooks/useMedia.js
export function useMedia(initialFilters = {}) {
  const { userProfile } = useAuth();
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(0);

  // Filter state
  const [filters, setFilters] = useState({
    type: initialFilters.type || null,
    orientation: initialFilters.orientation || null,
    search: initialFilters.search || '',
    // ...
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchAssets = useCallback(async (page = 0, append = false) => {
    // ...fetch logic
  }, [/* dependencies */]);

  return {
    assets,
    isLoading,
    error,
    // ... etc
  };
}
```

### Hook Test Pattern (Player.hooks.test.jsx)
```javascript
// Source: /Users/massimodamico/bizscreen/tests/unit/player/Player.hooks.test.jsx
import { renderHook, act, waitFor } from '@testing-library/react';

// Global localStorage mock store
let localStorageStore = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageStore[key] || null),
  setItem: vi.fn((key, value) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { localStorageStore = {}; }),
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

// Mock services BEFORE imports
vi.mock('../../../src/services/someService', () => ({
  someFunction: vi.fn().mockResolvedValue({ data: 'test' }),
}));

// Import hooks AFTER mocks
import { useMyHook } from '../../../src/hooks/useMyHook';

describe('useMyHook', () => {
  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
  });

  it('does something', async () => {
    const { result } = renderHook(() => useMyHook());

    await act(async () => {
      await result.current.someAction();
    });

    expect(result.current.someState).toBe(expectedValue);
  });
});
```

### Barrel Export Pattern (player/hooks/index.js)
```javascript
// Source: /Users/massimodamico/bizscreen/src/player/hooks/index.js
/**
 * Player Hooks - Barrel export for all player-related custom hooks
 *
 * @module player/hooks
 */

export { usePlayerContent } from './usePlayerContent.js';
export { usePlayerHeartbeat } from './usePlayerHeartbeat.js';
export { usePlayerCommands } from './usePlayerCommands.js';
export { useKioskMode } from './useKioskMode.js';
export { usePlayerPlayback } from './usePlayerPlayback.js';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Large monolithic pages | Hook extraction + composition | Phase 7 (2026-01) | Proven in Player.jsx |
| Inline fetch logic | Service functions + hooks | Existing | All pages use services |
| Multiple useState | Combined state in custom hooks | React 16.8+ | Standard pattern |

**Existing Good Patterns:**
- Pages already use `useAuth`, `useLogger`, `useTranslation`
- Pages already have well-structured inline sub-components
- Pages already call service functions for data operations
- Design system components (PageLayout, Modal, etc.) are well-used

## Open Questions

Things that couldn't be fully resolved:

1. **Hook Location: Shared vs Per-Page**
   - What we know: Player hooks are in `src/player/hooks/`
   - What's unclear: Should page hooks go in `src/pages/hooks/` (shared) or `src/pages/{Page}/hooks/` (per-page)?
   - Recommendation: Start with `src/pages/hooks/` for page-specific hooks. Only create shared hooks when 2+ pages clearly need identical logic.

2. **Existing useMedia Hook Overlap**
   - What we know: `useMedia` hook exists and handles media fetching with filters
   - What's unclear: Does MediaLibraryPage actually use it? (It imports from mediaService directly)
   - Recommendation: Evaluate if useMedia can be leveraged, or if useMediaLibrary should compose/replace it

3. **Sub-Component File Extraction**
   - What we know: Pages have good inline sub-components (e.g., LimitWarningBanner, ScreenRow)
   - What's unclear: Should these move to separate files?
   - Recommendation: Only extract if still over 500 lines after hook extraction, or if components are reused

4. **Test Coverage Strategy**
   - What we know: Only 3 page tests exist (DashboardPage, HelpCenterPage, DashboardComponents)
   - What's unclear: How much test coverage is expected for extracted hooks?
   - Recommendation: Per CONTEXT.md, Claude decides test depth based on hook complexity

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/pages/MediaLibraryPage.jsx` - Full component analyzed (2543 lines)
- `/Users/massimodamico/bizscreen/src/pages/ScreensPage.jsx` - Full component analyzed (1931 lines)
- `/Users/massimodamico/bizscreen/src/pages/PlaylistEditorPage.jsx` - Full component analyzed (1917 lines)
- `/Users/massimodamico/bizscreen/src/pages/CampaignEditorPage.jsx` - Full component analyzed (1392 lines)
- `/Users/massimodamico/bizscreen/src/pages/FeatureFlagsPage.jsx` - Full component analyzed (1339 lines)
- `/Users/massimodamico/bizscreen/src/player/hooks/` - Phase 7 hook patterns (5 hooks)
- `/Users/massimodamico/bizscreen/tests/unit/player/Player.hooks.test.jsx` - Hook test patterns
- `/Users/massimodamico/bizscreen/src/hooks/useMedia.js` - Existing media hook pattern

### Secondary (MEDIUM confidence)
- Phase 7 RESEARCH.md and PLAN files - Proven refactoring approach
- `/Users/massimodamico/bizscreen/tests/unit/hooks/` - Existing hook test patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing patterns
- Architecture: HIGH - Based on Phase 7 proven patterns and existing code analysis
- Pitfalls: HIGH - Derived from actual code structure and existing hook usage
- Code examples: HIGH - All examples from actual codebase

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - patterns are stable)

---

## Key Metrics

| Page | Current Lines | Target | Primary Hook | Complexity |
|------|---------------|--------|--------------|------------|
| MediaLibraryPage.jsx | 2543 | ~500 | useMediaLibrary | HIGH - many modals, bulk ops, drag-drop |
| ScreensPage.jsx | 1931 | ~500 | useScreensData | HIGH - realtime, commands, analytics |
| PlaylistEditorPage.jsx | 1917 | ~500 | usePlaylistEditor | MEDIUM - timeline, drag reorder, AI |
| CampaignEditorPage.jsx | 1392 | ~500 | useCampaignEditor | MEDIUM - form state, targets, approvals |
| FeatureFlagsPage.jsx | 1339 | ~500 | useFeatureFlags | LOW - already has tab components |

**Total reduction target:** ~9122 lines to ~2500 lines (goal: 5 x ~500)

## Recommended Extraction Priority

Based on complexity, existing structure, and potential for reuse:

1. **FeatureFlagsPage** (1339 lines) - LOWEST complexity
   - Already has FeatureFlagsTab, ExperimentsTab, FeedbackTab as separate functions
   - Main extraction: data loading, modal state
   - Estimated effort: LOW

2. **CampaignEditorPage** (1392 lines) - MEDIUM complexity
   - Form-heavy, straightforward state
   - Main extraction: campaign data state, picker data loading
   - Estimated effort: MEDIUM

3. **PlaylistEditorPage** (1917 lines) - MEDIUM complexity
   - Complex drag-drop already present
   - Main extraction: playlist state, media fetching (may use existing useMedia)
   - Estimated effort: MEDIUM

4. **ScreensPage** (1931 lines) - HIGH complexity
   - Realtime subscriptions, device commands, bulk selection
   - Main extraction: screens data + commands, modal states, bulk selection
   - Estimated effort: HIGH

5. **MediaLibraryPage** (2543 lines) - HIGHEST complexity
   - Already uses useMediaFolders, useS3Upload, useDropZone
   - Many modals, bulk operations, drag-drop reordering
   - Main extraction: coordinate existing hooks + add missing state management
   - Estimated effort: HIGH
