# Phase 13: Technical Foundation - Research

**Researched:** 2026-01-24
**Domain:** React Component Decomposition, Structured Logging, Flaky Test Investigation
**Confidence:** HIGH

## Summary

Phase 13 addresses three distinct technical debt items that must be resolved before v2 feature development can proceed: (1) Player.jsx component extraction to reduce it from 2,895 lines to under 1,000 lines, (2) structured logging migration for the remaining 38 services (38%) not yet using the logging service, and (3) investigation/fix of a flaky useCampaignEditor test. This research synthesizes findings from prior Phase 7 (player hooks) and Phase 4 (logging migration), updated with current codebase state.

The key findings are:
1. **Player.jsx has already shrunk from 3,495 to 2,895 lines** during Phase 7 through hook extraction. The remaining work is component extraction (renderers, app widgets) which Phase 7 deferred.
2. **66 services (66%) already use structured logging** via createScopedLogger. 38 services remain to be migrated. The logging infrastructure (loggingService.js with PII redaction, batching, correlation IDs) is mature and production-ready.
3. **The useCampaignEditor flaky test appears to have stabilized** - 5 consecutive runs passed with 89/89 tests. However, the test still has timing risks around async picker data loading that should be hardened.

**Primary recommendation:** Extract SceneRenderer, LayoutRenderer, and ZoneRenderer components from Player.jsx. Migrate remaining 38 services using the established pattern. Add explicit waitFor conditions to useCampaignEditor test for async operations.

## Standard Stack

This phase uses only existing project infrastructure - no new dependencies required.

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19+ | Component framework | Project foundation; hook extraction patterns established |
| Vitest | Current | Testing framework | Used for Player tests (1396 passing); renderHook available |
| @testing-library/react | Current | Component/hook testing | Used in 89 page hook tests; waitFor for async |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| loggingService.js | N/A | Structured logging | createScopedLogger for all service files |
| useLogger.js | N/A | React hook for logging | Component-scoped logging in React files |

### No New Dependencies Required
All three requirements (TECH-01, TECH-02, TECH-03) use existing infrastructure:
- Player refactoring uses established hook/component extraction patterns from Phase 7
- Logging migration uses existing loggingService.js with PII redaction
- Test fix uses existing Vitest/RTL waitFor patterns

## Architecture Patterns

### Recommended Project Structure (Player.jsx Extraction)
```
src/
├── Player.jsx                    # Target: <1000 lines - Router + ViewPage shell
├── player/                       # Player-specific modules
│   ├── hooks/                    # 6 hooks already extracted (Phase 7)
│   │   ├── usePlayerContent.js   # 356 lines
│   │   ├── usePlayerHeartbeat.js # 110 lines
│   │   ├── usePlayerCommands.js  # 104 lines
│   │   ├── usePlayerPlayback.js  # 134 lines
│   │   ├── useKioskMode.js       # 148 lines
│   │   ├── useTapSequence.js     # NEW in Phase 7
│   │   └── index.js              # Barrel export
│   ├── components/
│   │   ├── widgets/              # 4 widgets already extracted (Phase 7)
│   │   │   ├── ClockWidget.jsx   # 71 lines
│   │   │   ├── DateWidget.jsx    # 71 lines
│   │   │   ├── WeatherWidget.jsx # 183 lines
│   │   │   ├── QRCodeWidget.jsx  # 112 lines
│   │   │   └── index.js
│   │   ├── PairingScreen.jsx     # Already extracted (5190 lines)
│   │   ├── PinEntry.jsx          # Already extracted (8118 lines)
│   │   ├── SceneRenderer.jsx     # NEW - Extract scene/slide rendering
│   │   ├── LayoutRenderer.jsx    # NEW - Extract multi-zone layout
│   │   ├── ZonePlayer.jsx        # NEW - Extract single zone playback
│   │   ├── AppRenderer.jsx       # NEW - Extract app type routing
│   │   └── ConnectionStatus.jsx  # NEW - Small, optional extraction
│   ├── cacheService.js           # Already exists
│   └── offlineService.js         # Already exists
```

### Pattern 1: Component Extraction from Player.jsx
**What:** Extract large render functions into separate component files
**When to use:** When a render section is >100 lines and has clear boundaries
**Example:**
```javascript
// BEFORE in Player.jsx - SceneRenderer inline (~400 lines)
function renderScene(slide, index) {
  // ... 400 lines of scene/slide rendering
}

// AFTER in player/components/SceneRenderer.jsx
export function SceneRenderer({
  slide,
  index,
  deviceTimezone,
  previewSize,
  isTransitioning,
  onSlideComplete
}) {
  // Scene rendering logic moved here
  // Returns JSX for scene display
}

// Player.jsx now imports and uses:
import { SceneRenderer } from './player/components/SceneRenderer';

// In ViewPage:
<SceneRenderer
  slide={currentSlide}
  index={currentIndex}
  deviceTimezone={device.timezone}
  onSlideComplete={handleSlideComplete}
/>
```

### Pattern 2: Service Logging Migration
**What:** Replace console.log/error/warn with createScopedLogger pattern
**When to use:** All service files not yet using structured logging
**Example:**
```javascript
// BEFORE (38 services still use this pattern):
console.log('Campaign created:', id);
console.error('Failed to fetch playlists:', error);

// AFTER (use existing loggingService.js):
import { createScopedLogger } from './loggingService';
const logger = createScopedLogger('PlaylistService');

logger.info('Campaign created', { id });
logger.error('Failed to fetch playlists', { error });
```

### Pattern 3: Async Hook Test Stabilization
**What:** Use explicit waitFor conditions for async state updates
**When to use:** Tests for hooks that fetch data on mount
**Example:**
```javascript
// BEFORE (flaky - timing dependent):
const { result } = renderHook(() => useCampaignEditor('new', { showToast: mockShowToast }));
await waitFor(() => {
  expect(result.current.playlists).toBeDefined();
});

// AFTER (stable - explicit loading check):
const { result } = renderHook(() => useCampaignEditor('new', { showToast: mockShowToast }));
// Wait for loading to complete FIRST
await waitFor(() => {
  expect(result.current.loading).toBe(false);
}, { timeout: 3000 });
// Then check picker data
expect(result.current.playlists).toHaveLength(1);
expect(result.current.layouts).toHaveLength(1);
```

### Anti-Patterns to Avoid
- **Big Bang Component Extraction:** Don't extract all renderers at once. Extract one at a time with full test verification between each.
- **Breaking Player Test Mocks:** Player tests mock specific import paths. Changing paths requires updating all mock locations.
- **Inconsistent Logging Levels:** Use `info` for business events, `debug` for diagnostics, `error` for exceptions. Don't use `console.log` for errors.
- **Hardcoded Test Timeouts:** Avoid `setTimeout` in tests. Use `waitFor` with condition checks instead.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff | Custom delay calculation | calculateBackoff from playerService | Already handles full jitter (0-100%), tested |
| Scoped logging | Custom console wrappers | createScopedLogger from loggingService | PII redaction, batching, correlation IDs |
| PII redaction | Regex matching | redactObject/redactPII from utils/pii.js | Comprehensive patterns (email, phone, SSN, credit cards) |
| Async test waiting | setTimeout | waitFor from @testing-library/react | Deterministic, handles React state updates |
| Hook testing | Custom render helpers | renderHook from @testing-library/react | Standard pattern, handles cleanup |

**Key insight:** Phase 7 and Phase 4 established all the patterns needed. Phase 13 applies them to remaining work.

## Common Pitfalls

### Pitfall 1: Breaking Player Offline Capability During Extraction
**What goes wrong:** Extracted component loses access to offline cache state, breaking offline playback.
**Why it happens:** Component uses closure variables that don't transfer when extracted.
**How to avoid:**
1. Pass all required state as props to extracted components
2. Run offline tests after every extraction
3. Keep offlineService.js imports in parent component, pass cache state down
**Warning signs:** Offline tests fail after extraction; blank screen when network drops

### Pitfall 2: Test Mock Path Breakage
**What goes wrong:** Tests fail with "Cannot find module" after moving code.
**Why it happens:** vi.mock paths are hardcoded to old locations.
**How to avoid:**
1. Search all test files for import paths of moved code: `grep -r "playerService\|Player\.jsx" tests/`
2. Update mocks before running tests
3. Re-export from original location if needed for backward compatibility
**Warning signs:** "Cannot find module" in test output

### Pitfall 3: Logging Level Misuse
**What goes wrong:** Production logs flooded with debug info, or errors not visible.
**Why it happens:** Using logger.info for everything, or logger.debug for errors.
**How to avoid:**
1. `error` - Exceptional conditions only (caught exceptions, failed operations)
2. `warn` - Degraded but recoverable states (fallback to cache, retry succeeded)
3. `info` - Business events (campaign created, device paired)
4. `debug` - Diagnostics (function entry, timing, raw data)
**Warning signs:** Log storage costs spike; can't find errors in production logs

### Pitfall 4: Flaky Test False Positive
**What goes wrong:** Test passes locally, fails in CI, or vice versa.
**Why it happens:** Race condition between async data loading and assertion timing.
**How to avoid:**
1. Always waitFor loading to complete: `await waitFor(() => expect(result.current.loading).toBe(false))`
2. Use explicit timeouts for slow CI: `{ timeout: 5000 }`
3. Clear mock state in beforeEach
4. Reset localStorage mock between tests
**Warning signs:** Inconsistent pass/fail on repeated runs

### Pitfall 5: Premature Component Splitting
**What goes wrong:** Too many small files with tight coupling, harder to navigate.
**Why it happens:** Following "one component per file" dogma without judgment.
**How to avoid:**
1. Only extract when: >100 lines, clear boundaries, reusability potential
2. Keep small render helpers inline
3. ConnectionStatus indicator (20 lines) can stay in ViewPage
**Warning signs:** Many imports for tiny components; difficulty finding related code

## Code Examples

Verified patterns from the existing codebase:

### SceneRenderer Extraction Pattern
```javascript
// Source: Analyzed from Player.jsx lines 1200-1600
// player/components/SceneRenderer.jsx

import { useEffect, useState } from 'react';
import { getBlockAnimationStyles, getSlideTransitionStyles } from '../../services/sceneDesignService';
import { resolveSlideBindings } from '../../services/dataBindingResolver';
import { useLogger } from '../../hooks/useLogger';

export function SceneRenderer({
  slide,
  slideIndex,
  deviceTimezone,
  isTransitioning,
  transitionDuration,
  previewSize,
  dataBindings,
  onSlideReady,
}) {
  const logger = useLogger('SceneRenderer');
  const [resolvedSlide, setResolvedSlide] = useState(null);

  useEffect(() => {
    async function resolveBindings() {
      if (slide && dataBindings) {
        try {
          const resolved = await resolveSlideBindings(slide, dataBindings);
          setResolvedSlide(resolved);
          onSlideReady?.();
        } catch (error) {
          logger.error('Failed to resolve bindings', { slideIndex, error });
          setResolvedSlide(slide); // Fallback to unbound
        }
      } else {
        setResolvedSlide(slide);
      }
    }
    resolveBindings();
  }, [slide, dataBindings, slideIndex, onSlideReady, logger]);

  if (!resolvedSlide) return null;

  const transitionStyles = getSlideTransitionStyles(
    resolvedSlide.transition,
    isTransitioning,
    transitionDuration
  );

  return (
    <div style={{ ...transitionStyles, ...previewSize }}>
      {resolvedSlide.blocks.map((block, i) => (
        <SceneBlock
          key={block.id || i}
          block={block}
          deviceTimezone={deviceTimezone}
          animationStyles={getBlockAnimationStyles(block)}
        />
      ))}
    </div>
  );
}
```

### Service Logging Migration Pattern
```javascript
// Source: Existing pattern from playerService.js, authService.js
// Example: campaignService.js migration

// BEFORE:
export async function createCampaign(data) {
  try {
    console.log('Creating campaign:', data.name);
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    console.log('Campaign created:', campaign.id);
    return campaign;
  } catch (error) {
    console.error('Failed to create campaign:', error);
    throw error;
  }
}

// AFTER:
import { createScopedLogger } from './loggingService';
const logger = createScopedLogger('CampaignService');

export async function createCampaign(data) {
  try {
    logger.info('Creating campaign', { name: data.name });
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    logger.info('Campaign created', { id: campaign.id });
    return campaign;
  } catch (error) {
    logger.error('Failed to create campaign', { campaignName: data.name, error });
    throw error;
  }
}
```

### Async Hook Test Hardening Pattern
```javascript
// Source: Best practices from Phase 1 and RTL documentation
// tests/unit/pages/hooks/pageHooks.test.jsx

describe('useCampaignEditor', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
    // Reset all service mocks to known state
    campaignService.getCampaign.mockResolvedValue({
      id: '123',
      name: 'Test Campaign',
      status: 'draft',
      targets: [],
      contents: []
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('data loading', () => {
    it('loads picker data (playlists, layouts, etc)', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      // Wait for initial loading to complete - explicit condition
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 }); // Explicit timeout for CI environments

      // Now verify picker data is loaded
      expect(result.current.playlists).toHaveLength(1);
      expect(result.current.layouts).toHaveLength(1);
      expect(result.current.screenGroups).toHaveLength(1);
      expect(result.current.locations).toHaveLength(1);
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3,495-line Player.jsx | Hooks extracted (2,895 lines) | Phase 7 (2026-01-23) | 600 lines moved to hooks |
| console.log everywhere | createScopedLogger + PII redaction | Phase 4 (2026-01-22) | 66% of services migrated |
| Real timers in tests | vi.useFakeTimers + waitFor | Phase 1 (2026-01-22) | Deterministic test timing |
| Class components | Function components + hooks | Pre-v1 | All new code uses hooks |
| Jest testing | Vitest | Pre-v1 | Faster, ESM-native |

**Current State:**
- Player.jsx: 2,895 lines (target: <1,000)
- Structured logging: 66 services migrated (target: 100%)
- Test suite: 1,396 passing tests

## Open Questions

Things that couldn't be fully resolved:

1. **AppRenderer Complexity**
   - What we know: AppRenderer routes between ClockApp, WeatherApp, QRCodeApp, etc.
   - What's unclear: Whether to extract as a single AppRenderer or keep each app in widgets/
   - Recommendation: Keep widgets extracted (already done), extract AppRenderer as routing layer

2. **Test Flakiness Root Cause**
   - What we know: useCampaignEditor test was noted as flaky (picker data loading)
   - What's unclear: Test now passes consistently (5/5 runs passed)
   - Recommendation: Still harden with explicit waitFor conditions to prevent future flakiness

3. **SceneBlock vs Block Naming**
   - What we know: Player.jsx has SceneBlockRenderer inline
   - What's unclear: Should it be SceneBlock.jsx or BlockRenderer.jsx?
   - Recommendation: Use SceneBlock.jsx to match existing nomenclature (SceneRenderer, SceneEditor)

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/Player.jsx` - Full component analyzed (2,895 lines)
- `/Users/massimodamico/bizscreen/.planning/phases/07-player-refactoring/07-RESEARCH.md` - Prior hook extraction patterns
- `/Users/massimodamico/bizscreen/.planning/phases/04-logging-migration/04-RESEARCH.md` - Logging migration patterns
- `/Users/massimodamico/bizscreen/.planning/phases/07-player-refactoring/07-VERIFICATION.md` - Phase 7 completion status
- `/Users/massimodamico/bizscreen/src/services/loggingService.js` - Logging infrastructure
- `/Users/massimodamico/bizscreen/tests/unit/pages/hooks/pageHooks.test.jsx` - Flaky test analysis

### Secondary (MEDIUM confidence)
- [React Testing Library Best Practices](https://medium.com/@ignatovich.dm/best-practices-for-using-react-testing-library-0f71181bb1f4) - RTL async patterns
- [Solving Flaky React Unit Tests](https://medium.com/safe-engineering/solving-flaky-react-unit-tests-c3feb7f823a7) - Flaky test investigation
- [Test React Hooks with Vitest](https://mayashavin.com/articles/test-react-hooks-with-vitest) - renderHook patterns
- [Flaky Tests in React: Detection and Prevention](https://semaphore.io/blog/flaky-react) - Flaky test strategies

### Tertiary (LOW confidence)
- Web search results for 2026 patterns - General guidance, verify specific claims

## Metadata

**Confidence breakdown:**
- Player extraction: HIGH - Based on Phase 7 patterns, clear path forward
- Logging migration: HIGH - 66% already done, pattern established
- Flaky test fix: MEDIUM - Test now stable, but root cause unclear

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - patterns are stable)

---

## Key Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Player.jsx lines | 2,895 | <1,000 | 1,895 lines to extract |
| Services with structured logging | 66 (66%) | 100 (100%) | 38 services to migrate |
| useCampaignEditor test | Passing (5/5 runs) | 10 consecutive passes | Needs hardening |
| Existing hooks | 6 | 6 | Complete (Phase 7) |
| Existing widgets | 4 | 4 | Complete (Phase 7) |

## Services Requiring Logging Migration

The following 38 services do not yet use createScopedLogger:

1. adminService.js
2. analyticsService.js
3. approvalService.js
4. assistantService.js
5. auditService.js
6. autoBuildService.js
7. billingService.js
8. cacheService.js
9. campaignService.js
10. canvaService.js
11. contentAnalyticsService.js
12. domainService.js
13. exportService.js
14. healthService.js
15. index.js (barrel export - may not need)
16. industryWizardService.js
17. layoutService.js
18. licenseService.js
19. localeService.js
20. marketplaceService.js
21. mediaService.js
22. permissionsService.js
23. playlistService.js
24. previewService.js
25. reportSettingsService.js
26. resellerService.js
27. sceneAiService.js
28. sceneDesignService.js
29. sceneService.js
30. scheduleService.js
31. scimService.js
32. screenDiagnosticsService.js
33. screenGroupService.js
34. ssoService.js
35. svgAnalyzerService.js
36. teamService.js
37. tenantService.js
38. webhookService.js
